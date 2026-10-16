import { db } from "@workspace/db";
import { sql } from "drizzle-orm";
import { getUncachableStripeClient } from "../stripeClient.js";

/** Stripe is authoritative for fully refunded checkout payments.
 * Applies to refunds initiated directly from Stripe Dashboard as well as Bazunk.
 * Do not automatically reverse previously released seller transfers; flag them.
 */
export async function reconcileFullyRefundedSession(sessionId: string): Promise<boolean> {
  const stripe=await getUncachableStripeClient();
  const session:any=await stripe.checkout.sessions.retrieve(sessionId,{expand:["payment_intent.latest_charge"]});
  const charge:any=session.payment_intent?.latest_charge;
  if (!charge?.amount || Number(charge.amount_refunded) < Number(charge.amount)) return false;
  await db.execute(sql`
    UPDATE orders SET status='refunded',
      refunded_total=COALESCE(buyer_total,price),
      seller_net=0,
      payout_status=CASE WHEN stripe_transfer_id IS NOT NULL THEN 'reversal_pending' ELSE 'refunded' END,
      updated_at=NOW()
    WHERE stripe_session_id=${sessionId} AND status NOT IN ('refunded','cancelled')
  `);
  return true;
}

/** Reconcile a Stripe charge.refunded webhook to its checkout sessions. */
export async function reconcileRefundedPaymentIntent(paymentIntentId: string): Promise<void> {
  const stripe=await getUncachableStripeClient();
  const sessions=await stripe.checkout.sessions.list({payment_intent:paymentIntentId,limit:100});
  for (const session of sessions.data) await reconcileFullyRefundedSession(session.id);
}
