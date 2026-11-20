import { parseQuote, checkoutUrl, type Quote } from "./commerce";
export type DealPayment = {
  paymentState: "none" | "unpaid" | "paid" | "expired" | "processing";
  quote: Quote;
  url: string | null;
  enabled: boolean;
};
export function parseDealPayment(x: unknown): DealPayment {
  const v = x as DealPayment;
  if (
    !v ||
    !["none", "unpaid", "paid", "expired", "processing"].includes(
      v.paymentState,
    ) ||
    typeof v.enabled !== "boolean" ||
    (v.url !== null && typeof v.url !== "string")
  )
    throw Error("Unexpected deal payment response. Please refresh.");
  const quote = parseQuote(v.quote);
  if (quote.items.length !== 1) throw Error("Unexpected deal items.");
  if (v.url !== null) checkoutUrl(v.url);
  return { ...v, quote };
}
