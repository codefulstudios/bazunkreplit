import { db } from "@workspace/db";
import { sql } from "drizzle-orm";
import { randomUUID } from "crypto";
import { getUncachableStripeClient } from "../stripeClient.js";
import { calculateFees, minor, percentage } from "./marketplaceFees.js";
import { logger } from "./logger.js";
import type Stripe from "stripe";

export type SaleKind = "auction" | "flash";
type Sale = { id:string; seller_email:string; title:string; image:string|null; category:string|null; price:number; source:string };
async function schema() {
  await db.execute(sql`CREATE TABLE IF NOT EXISTS special_checkout_reservations (
    source TEXT PRIMARY KEY, buyer_email TEXT NOT NULL, stripe_session_id TEXT UNIQUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), expires_at TIMESTAMPTZ NOT NULL,
    fulfilled_at TIMESTAMPTZ
  )`);
}
async function getSale(kind: SaleKind, id:string, buyer:string):Promise<Sale> {
  const row = kind === "auction"
    ? (await db.execute(sql`SELECT id,title,images,category,seller_email,winner_email,winner_bid,status,end_time
        FROM auctions WHERE id=${id}`)).rows[0] as any
    : (await db.execute(sql`SELECT id,title,image,category,seller_email,sale_price,status,starts_at,ends_at
        FROM flash_sales WHERE id=${id}`)).rows[0] as any;
  if (!row) throw new Error("Sale not found");
  if (String(row.seller_email).toLowerCase() === buyer) throw new Error("You cannot buy your own item");
  if (kind === "auction") {
    if(row.status !== "ended" || new Date(row.end_time).getTime() > Date.now() || String(row.winner_email || "").toLowerCase() !== buyer)
      throw new Error("Only the confirmed auction winner may check out after the auction ends");
  } else if(row.status !== "active" || new Date(row.starts_at).getTime() > Date.now() || new Date(row.ends_at).getTime() <= Date.now()) {
    throw new Error("Flash sale is no longer active");
  }
  const price = Number(kind === "auction" ? row.winner_bid : row.sale_price);
  if (!Number.isFinite(price) || price <= 0) throw new Error("Invalid sale price");
  return {id, seller_email:String(row.seller_email), title:String(row.title),image:kind==="auction" ? (Array.isArray(row.images) ? String(row.images[0] ?? "") || null : null) : row.image ?? null,category:row.category ?? null, price,source:`${kind}:${id}`};
}
export async function startSpecialCheckout(kind:SaleKind,id:string,buyer:string,origin:string) {
  await schema();
  const sale=await getSale(kind,id,buyer);
  const existing=(await db.execute(sql`SELECT buyer_email,stripe_session_id,expires_at,fulfilled_at FROM special_checkout_reservations WHERE source=${sale.source}`)).rows[0] as any;
  if(existing) {
    if(existing.fulfilled_at)throw new Error("This sale has already been purchased");
    if(existing.stripe_session_id && new Date(existing.expires_at).getTime()>Date.now()) {
      if(existing.buyer_email!==buyer)throw new Error("This item is reserved");
      const stripe=await getUncachableStripeClient();
      const session=await stripe.checkout.sessions.retrieve(existing.stripe_session_id);
      if(session.status==="open") return {url:session.url};
      if(session.payment_status==="paid")throw new Error("Payment already received; order is processing");
    }
    // A second request must not displace a reservation while its Stripe session is being created.
    if(!existing.stripe_session_id && new Date(existing.expires_at).getTime() > Date.now())
      throw new Error("Checkout is being prepared. Try again shortly");
    // Expired Stripe sessions must be expired at Stripe before a new reservation can be granted.
    if(existing.stripe_session_id) {
      const stripe=await getUncachableStripeClient();
      const session=await stripe.checkout.sessions.retrieve(existing.stripe_session_id);
      if(session.payment_status==="paid")throw new Error("Payment processing");
      if(session.status==="open")await stripe.checkout.sessions.expire(session.id);
    }
    await db.execute(sql`DELETE FROM special_checkout_reservations WHERE source=${sale.source} AND fulfilled_at IS NULL`);
  }
  // Stripe requires at least 30 minutes from the moment its API receives the request.
  const expiry = new Date(Date.now()+35*60*1000);
  const reserved=await db.execute(sql`INSERT INTO special_checkout_reservations(source,buyer_email,expires_at)
    VALUES(${sale.source},${buyer},${expiry.toISOString()}) ON CONFLICT DO NOTHING RETURNING source`);
  if(!reserved.rows.length) throw new Error("Another checkout is in progress");
  try {
    const settings=(await db.execute(sql`SELECT key,value FROM site_settings WHERE key LIKE 'fee_rate_%' OR key LIKE 'buyer_protection_%'`)).rows as any[];
    const fees=Object.fromEntries(settings.map(x=>[String(x.key),String(x.value)]));
    const seller=(await db.execute(sql`SELECT seller_type FROM users WHERE LOWER(email)=LOWER(${sale.seller_email}) LIMIT 1`)).rows[0] as any;
    const sellerType=String(seller?.seller_type??"private").toLowerCase();
    if(!["private","business","sole_trader"].includes(sellerType)) throw new Error("Seller verification is required");
    const category=String(sale.category??"").toLowerCase();
    const item={id:1,quantity:1,priceMinor:minor(sale.price),sellerType,businessRate:percentage(fees[`fee_rate_${category}`],percentage(fees.fee_rate_default,8)),title:sale.title,image:sale.image,sellerEmail:sale.seller_email,category};
    const quote=calculateFees([item],percentage(fees.buyer_protection_percent,5),fees.buyer_protection_fixed_gbp==null?70:minor(fees.buyer_protection_fixed_gbp),sale.price>=50?0:399);
    const stripe=await getUncachableStripeClient();
    const session=await stripe.checkout.sessions.create({
      mode:"payment", customer_email:buyer, client_reference_id:buyer,
      line_items:[
        {price_data:{currency:"gbp",unit_amount:item.priceMinor,product_data:{name:sale.title}},quantity:1},
        ...(quote.buyerProtectionMinor?[{price_data:{currency:"gbp",unit_amount:quote.buyerProtectionMinor,product_data:{name:"Buyer Protection"}},quantity:1}]:[]),
        ...(quote.deliveryMinor?[{price_data:{currency:"gbp",unit_amount:quote.deliveryMinor,product_data:{name:"Delivery"}},quantity:1}]:[])
      ],
      metadata:{type:"special_sale",kind,source:sale.source,saleId:id,buyerEmail:buyer,
        sellerEmail:sale.seller_email,feePolicy:quote.policy,
        priceMinor:String(item.priceMinor),protectionMinor:String(quote.buyerProtectionMinor),
        sellerFeeMinor:String(quote.units[0].sellerFeeMinor),sellerNetMinor:String(quote.units[0].sellerNetMinor),
        deliveryMinor:String(quote.deliveryMinor),totalMinor:String(quote.totalMinor)},
      expires_at:Math.floor(expiry.getTime()/1000),
      success_url:`${origin}/checkout?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url:`${origin}/${kind==="auction"?"auctions":"flash-sales"}/${encodeURIComponent(id)}`
    });
    await db.execute(sql`UPDATE special_checkout_reservations SET stripe_session_id=${session.id} WHERE source=${sale.source} AND buyer_email=${buyer}`);
    return {url:session.url};
  } catch(err) {
    await db.execute(sql`DELETE FROM special_checkout_reservations WHERE source=${sale.source} AND stripe_session_id IS NULL`);
    throw err;
  }
}
export async function fulfillSpecialCheckout(sessionId:string) {
  await schema();
  const stripe=await getUncachableStripeClient();
  const session:Stripe.Checkout.Session=await stripe.checkout.sessions.retrieve(sessionId);
  if(session.payment_status!=="paid" || session.metadata?.type!=="special_sale") return;
  const m=session.metadata;
  if(!m?.source || !m.buyerEmail || !m.sellerEmail || !m.saleId || !m.kind || !m.priceMinor || !m.totalMinor)throw new Error("Incomplete sale checkout metadata");
  if(session.currency!=="gbp" || session.amount_total!==Number(m.totalMinor))throw new Error("Unexpected paid amount");
  const reservation=(await db.execute(sql`SELECT * FROM special_checkout_reservations WHERE source=${m.source} AND stripe_session_id=${sessionId}`)).rows[0] as any;
  if(!reservation || reservation.buyer_email!==m.buyerEmail)throw new Error("Unrecognised sale reservation");
  const id=`ORD-${randomUUID().slice(0,8).toUpperCase()}`;
  const titleRow=m.kind==="auction"
    ? (await db.execute(sql`SELECT title, images->>0 AS image FROM auctions WHERE id=${m.saleId}`)).rows[0] as any
    : (await db.execute(sql`SELECT title,image FROM flash_sales WHERE id=${m.saleId}`)).rows[0] as any;
  await db.transaction(async tx=>{
    await tx.execute(sql`SELECT pg_advisory_xact_lock(hashtext(${m.source}))`);
    const present=(await tx.execute(sql`SELECT fulfilled_at FROM special_checkout_reservations WHERE source=${m.source} FOR UPDATE`)).rows[0] as any;
    if(present?.fulfilled_at)return;
    await tx.execute(sql`INSERT INTO orders(id,buyer_email,seller_email,item_title,item_image,price,status,stripe_session_id,line_no,buyer_protection_fee,seller_fee,seller_net,delivery_fee,buyer_total,fee_policy,created_at,updated_at)
      VALUES(${id},${m.buyerEmail},${m.sellerEmail},${String(titleRow?.title??m.source)},${titleRow?.image??null},
      ${Number(m.priceMinor)/100},'confirmed',${sessionId},1,${Number(m.protectionMinor??0)/100},
      ${Number(m.sellerFeeMinor??0)/100},${Number(m.sellerNetMinor??0)/100},${Number(m.deliveryMinor??0)/100},
      ${Number(m.totalMinor)/100},${m.feePolicy??"special-v1"},NOW(),NOW())
      ON CONFLICT(stripe_session_id,line_no) DO NOTHING`);
    await tx.execute(sql`UPDATE special_checkout_reservations SET fulfilled_at=NOW() WHERE source=${m.source}`);
  });
  logger.info({sessionId,source:m.source},"Special sale payment fulfilled");
}
