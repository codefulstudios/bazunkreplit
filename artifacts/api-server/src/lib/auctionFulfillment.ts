import { db } from "@workspace/db";
import { sql } from "drizzle-orm";
import { randomUUID } from "crypto";
import { getUncachableStripeClient } from "../stripeClient.js";
import { sendOrderConfirmation, sendSellerSaleNotification } from "../email.js";
import { sendSystemMessage } from "./systemMessages.js";

/** Stripe webhook and success-page retries share the same idempotent fulfillment. */
export async function fulfillAuctionSession(sessionId: string): Promise<"fulfilled" | "already_done" | "not_paid"> {
  const stripe = await getUncachableStripeClient();
  const session = await stripe.checkout.sessions.retrieve(sessionId);
  if (session.metadata?.type !== "auction") throw new Error("Not an auction checkout session");
  if (session.payment_status !== "paid") return "not_paid";
  const m = session.metadata;
  const auctionId = m.auctionId;
  const buyer = String(session.client_reference_id ?? "").toLowerCase();
  const priceMinor = Number(m.priceMinor), protectionMinor = Number(m.protectionMinor);
  const sellerFeeMinor = Number(m.sellerFeeMinor);
  if (!auctionId || !buyer || buyer !== String(m.email).toLowerCase() ||
      ![priceMinor,protectionMinor,sellerFeeMinor].every(Number.isSafeInteger) ||
      priceMinor <= 0 || protectionMinor < 0 || sellerFeeMinor < 0 ||
      session.currency !== "gbp" || session.amount_total !== priceMinor + protectionMinor) {
    throw new Error("Auction payment details do not match the signed checkout snapshot");
  }
  const orderId = `ORD-${randomUUID().slice(0,8).toUpperCase()}`;
  const result = await db.transaction(async tx => {
    const rows = await tx.execute(sql`SELECT * FROM auctions WHERE id=${auctionId} FOR UPDATE`);
    const auction = rows.rows[0] as Record<string,unknown> | undefined;
    if (!auction || auction.status !== "ended" || String(auction.winner_email ?? "").toLowerCase() !== buyer ||
        Math.round(Number(auction.winner_bid)*100) !== priceMinor) {
      throw new Error("Paid auction no longer matches its winner and winning bid; requires manual reconciliation");
    }
    const existing = await tx.execute(sql`SELECT id FROM orders WHERE notes=${"auction:"+auctionId} LIMIT 1`);
    if (existing.rows.length) return null;
    const inserted = await tx.execute(sql`
      INSERT INTO orders (id,buyer_email,seller_email,item_title,item_image,price,status,stripe_session_id,line_no,
        buyer_protection_fee,seller_fee,seller_type,seller_fee_rate,seller_net,delivery_fee,buyer_total,fee_policy,notes,created_at,updated_at)
      VALUES (${orderId},${buyer},${String(auction.seller_email)},${String(auction.title)},NULL,${priceMinor/100},
        'confirmed',${sessionId},1,${protectionMinor/100},${sellerFeeMinor/100},${String(m.sellerType ?? "private")},
        ${priceMinor ? sellerFeeMinor*100/priceMinor : 0},${(priceMinor-sellerFeeMinor)/100},0,
        ${(priceMinor+protectionMinor)/100},'auction-checkout-v1',${"auction:"+auctionId},NOW(),NOW())
      ON CONFLICT (stripe_session_id,line_no) DO NOTHING RETURNING id
    `);
    return inserted.rows.length ? auction : null;
  });
  if (!result) return "already_done";
  const seller = String(result.seller_email);
  const title = String(result.title);
  void sendSystemMessage(buyer,{category:"Orders",subject:"Auction payment confirmed",body:`Payment received for "${title}". Your order is now confirmed.`});
  void sendSystemMessage(seller,{category:"Sales",subject:"Your auction has been paid",body:`The winner paid for "${title}". View your Sales orders.`});
  void sendOrderConfirmation({email:buyer,items:[{title,price:priceMinor/100,quantity:1}],total:(priceMinor+protectionMinor)/100});
  void sendSellerSaleNotification({email:seller,items:[{title,price:priceMinor/100,quantity:1}],buyerEmail:buyer});
  return "fulfilled";
}
