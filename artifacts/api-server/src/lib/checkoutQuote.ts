import { db } from "@workspace/db";
import { sql } from "drizzle-orm";
import { convertAmount } from "../fxRates.js";
import { calculateFees, minor, percentage, allocate, type FeeItem } from "./marketplaceFees.js";
import { randomUUID } from "crypto";
import { featureEnabled } from "./featureFlags.js";
export class QuoteError extends Error { constructor(message: string, public status = 400) { super(message); } }
export type CheckoutQuote = ReturnType<typeof calculateFees> & { bundleDiscountMinor?: number; bundleBreakdown?: Array<{sellerEmail:string; itemCount:number; discountMinor:number; shippingMinor:number}> };
export async function ensureFeeSchema() {
  await db.execute(sql`CREATE TABLE IF NOT EXISTS checkout_fee_snapshots (id TEXT PRIMARY KEY, payload JSONB NOT NULL, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW())`);
}
export async function quoteCart(input: unknown): Promise<CheckoutQuote> {
  if (!Array.isArray(input) || !input.length || input.length > 100) throw new QuoteError("Cart must contain 1–100 listings.");
  const counts = new Map<number,number>();
  for (const raw of input) {
    const id=Number(raw?.id), quantity=Number(raw?.quantity);
    if (!Number.isInteger(id) || id<=0 || !Number.isInteger(quantity) || quantity<1 || quantity>50) throw new QuoteError("Invalid listing or quantity.");
    const qty=(counts.get(id)??0)+quantity;
    if(qty>50) throw new QuoteError("Maximum 50 units per listing.");
    counts.set(id,qty);
  }
  const ids=[...counts.keys()];
  const rows=(await db.execute(sql`SELECT l.id,l.title,l.image,l.price,l.price_gbp,l.currency,l.category,l.status,l.seller_email,COALESCE(u.seller_type,'private') seller_type
    FROM listings l LEFT JOIN users u ON LOWER(u.email)=LOWER(l.seller_email)
    WHERE l.id IN (${sql.join(ids.map(id=>sql`${id}`),sql`, `)})
    AND NOT EXISTS (SELECT 1 FROM site_settings cv WHERE cv.value='false' AND (cv.key='category_visible_' || l.category OR cv.key='category_visible_' || l.category || '__' || COALESCE(l.subcategory,'')))`)).rows as Array<Record<string,unknown>>;
  // Demo inventory must never be charged. Reject both registered and legacy demo items.
  // A missing registry table must not silently permit a demo purchase.
  const registryExists=(await db.execute(sql`SELECT to_regclass('public.demo_listing_registry') AS table_name`)).rows[0]?.table_name;
  const demoRows=registryExists ? (await db.execute(sql`SELECT listing_id FROM demo_listing_registry WHERE listing_id IN (${sql.join(ids.map(id=>sql`${id}`),sql`, `)})`)).rows : [];
  const legacyRows=(await db.execute(sql`SELECT id FROM listings WHERE id IN (${sql.join(ids.map(id=>sql`${id}`),sql`, `)}) AND (CASE WHEN COALESCE(specifications,'') ~ '^\\s*\\{' THEN specifications::jsonb->>'demo_creator' ELSE NULL END)='true'`)).rows;
  if(demoRows.length||legacyRows.length) throw new QuoteError("Demo listings are for preview only and cannot be purchased.",409);
  const byId=new Map(rows.map(r=>[Number(r.id),r]));
  const settings=(await db.execute(sql`SELECT key,value FROM site_settings WHERE key LIKE 'fee_rate_%' OR key LIKE 'buyer_protection_%'`)).rows as Array<Record<string,unknown>>;
  const fees=Object.fromEntries(settings.map(r=>[String(r.key),String(r.value)]));
  const items:FeeItem[]=[];
  for(const id of ids) {
    const row=byId.get(id);
    if(!row || row.status!=="active" || !row.seller_email) throw new QuoteError("An item is no longer available. Please update your cart.",409);
    const currency=String(row.currency??"GBP").toUpperCase();
    const priceGbp=row.price_gbp!=null ? Number(row.price_gbp) : currency==="GBP" ? Number(row.price) : await convertAmount(Number(row.price),currency,"GBP");
    const priceMinor=minor(priceGbp);
    if(priceMinor<=0) throw new QuoteError("Items must have a positive price.");
    const category=String(row.category??"").toLowerCase();
    const sellerType=String(row.seller_type??"private").toLowerCase();
    if(!["private","business","sole_trader"].includes(sellerType)) throw new QuoteError("Seller account type needs to be checked before checkout.",409);
    items.push({id,quantity:counts.get(id)!,priceMinor,sellerType,businessRate:percentage(fees[`fee_rate_${category}`],percentage(fees.fee_rate_default,8)),title:String(row.title),image:row.image ? String(row.image):null,sellerEmail:String(row.seller_email),category});
  }
  const subtotal=items.reduce((sum,item)=>sum+item.priceMinor*item.quantity,0);
  const fixed=fees.buyer_protection_fixed_gbp==null ? 70 : minor(fees.buyer_protection_fixed_gbp);
  // Never trust browser discount/shipping totals. Policy is read from the seller's
  // verified settings and frozen in the quote snapshot before charging Stripe.
  const enabled = await featureEnabled("combined_shipping");
  const discountsEnabled = await featureEnabled("multi_item_discount");
  const policyExists = (await db.execute(sql`SELECT to_regclass('public.seller_bundle_policies') AS table_name`)).rows[0]?.table_name;
  if (!enabled || !policyExists) return calculateFees(items,percentage(fees.buyer_protection_percent,5),fixed,subtotal>=5000?0:399);
  const policyRows = (await db.execute(sql`SELECT seller_email,enabled,combined_shipping_minor,multi_item_discount_percent,min_items FROM seller_bundle_policies WHERE enabled=TRUE`)).rows as any[];
  const policies = new Map(policyRows.map(p=>[String(p.seller_email).toLowerCase(),p]));
  const perSeller = new Map<string,FeeItem[]>();
  for (const item of items) {
    const email=item.sellerEmail.toLowerCase();
    perSeller.set(email,[...(perSeller.get(email)||[]),item]);
  }
  const adjusted:FeeItem[]=[];
  const breakdown:NonNullable<CheckoutQuote["bundleBreakdown"]>=[];
  let discountMinor=0;
  let deliveryMinor=0;
  const sellerDelivery=new Map<string,number>();
  for(const [email,sellerItems] of perSeller) {
    const policy=policies.get(email);
    const count=sellerItems.reduce((n,i)=>n+i.quantity,0);
    const units=sellerItems.flatMap(item=>Array.from({length:item.quantity},()=>({...item,quantity:1})));
    const pct=policy && discountsEnabled && count>=Math.max(2,Number(policy.min_items)) ? Number(policy.multi_item_discount_percent) : 0;
    const sum=units.reduce((n,i)=>n+i.priceMinor,0);
    const discount=Math.round(sum*pct/100);
    const shares=allocate(discount,units.map(i=>i.priceMinor));
    units.forEach((unit,i)=>adjusted.push({...unit,priceMinor:unit.priceMinor-shares[i]}));
    discountMinor+=discount;
    const shipping=policy ? Number(policy.combined_shipping_minor) : 0;
    if(!Number.isSafeInteger(shipping)||shipping<0)throw new QuoteError("Invalid seller shipping configuration.",409);
    sellerDelivery.set(email,shipping);
    deliveryMinor+=shipping;
    breakdown.push({sellerEmail:email,itemCount:count,discountMinor:discount,shippingMinor:shipping});
  }
  // Listings without bundle rules retain the legacy checkout-wide delivery rule.
  if(breakdown.some(b=>!policies.has(b.sellerEmail))) {
    const fallback=subtotal>=5000?0:399;
    const key=breakdown.find(b=>!policies.has(b.sellerEmail))!.sellerEmail;
    sellerDelivery.set(key,(sellerDelivery.get(key)||0)+fallback);
    breakdown.find(b=>b.sellerEmail===key)!.shippingMinor+=fallback;
    deliveryMinor+=fallback;
  }
  const quote=calculateFees(adjusted,percentage(fees.buyer_protection_percent,5),fixed,0) as CheckoutQuote;
  // Allocate each seller's shipping only across that seller's orders.
  for(const [email,charge] of sellerDelivery) {
    const indices=quote.units.map((u,i)=>u.sellerEmail.toLowerCase()===email?i:-1).filter(i=>i>=0);
    const shares=allocate(charge,indices.map(i=>quote.units[i].priceMinor));
    indices.forEach((index,j)=>{const unit=quote.units[index];unit.deliveryMinor=shares[j];unit.buyerTotalMinor+=shares[j];});
  }
  quote.deliveryMinor=deliveryMinor;
  quote.totalMinor+=deliveryMinor;
  quote.bundleDiscountMinor=discountMinor;
  quote.bundleBreakdown=breakdown;
  return quote;
}
export async function saveFeeSnapshot(quote:CheckoutQuote) {
  await ensureFeeSchema(); const id=randomUUID();
  await db.execute(sql`INSERT INTO checkout_fee_snapshots(id,payload) VALUES(${id},${JSON.stringify(quote)}::jsonb)`);return id;
}
export async function getFeeSnapshot(id:string):Promise<CheckoutQuote> {
  const row=(await db.execute(sql`SELECT payload FROM checkout_fee_snapshots WHERE id=${id}`)).rows[0] as {payload?:CheckoutQuote}|undefined;
  if(!row?.payload) throw new Error("Checkout fee snapshot is missing");return row.payload;
}
