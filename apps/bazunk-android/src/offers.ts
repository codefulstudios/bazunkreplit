export const statuses = [
  "pending",
  "countered",
  "accepted",
  "counter_accepted",
  "declined",
  "counter_declined",
  "withdrawn",
  "expired",
] as const;
export type Offer = {
  id: string;
  productId: number;
  productTitle: string;
  productImage: string;
  listingPrice: number;
  sellerName: string;
  buyerName: string;
  offerPrice: number;
  message: string;
  status: (typeof statuses)[number];
  counterPrice: number | null;
  counterMessage: string;
  createdAt: string;
  respondedAt: string | null;
  expiresAt: string;
  version: number;
  role: "buyer" | "seller";
  currency: "GBP";
  paymentState: "none" | "pending" | "paid";
};
export function parseOffer(x: unknown): Offer {
  const o = x as Offer;
  if (
    !o ||
    typeof o.id !== "string" ||
    !o.id ||
    !Number.isSafeInteger(o.productId) ||
    o.productId <= 0 ||
    typeof o.productTitle !== "string" ||
    typeof o.productImage !== "string" ||
    typeof o.sellerName !== "string" ||
    typeof o.buyerName !== "string" ||
    typeof o.message !== "string" ||
    typeof o.counterMessage !== "string" ||
    !statuses.includes(o.status) ||
    !["buyer", "seller"].includes(o.role) ||
    o.currency !== "GBP" ||
    !["none", "pending", "paid"].includes(o.paymentState) ||
    !Number.isInteger(o.version) ||
    o.version < 1 ||
    !Number.isFinite(o.listingPrice) ||
    o.listingPrice <= 0 ||
    !Number.isFinite(o.offerPrice) ||
    o.offerPrice <= 0 ||
    (o.counterPrice !== null &&
      (!Number.isFinite(o.counterPrice) || o.counterPrice <= 0)) ||
    (["countered", "counter_accepted"].includes(o.status) &&
      o.counterPrice === null) ||
    ![o.createdAt, o.expiresAt].every(
      (d) => typeof d === "string" && Number.isFinite(Date.parse(d)),
    )
  )
    throw Error("Unexpected offers response. Please refresh.");
  return o;
}
export function parseOffers(x: unknown): Offer[] {
  if (!Array.isArray(x)) throw Error("Could not load offers. Please retry.");
  return x.map(parseOffer);
}
