export type ManagedOrder = {
  id: string;
  title: string;
  status: string;
  role: "buyer" | "seller";
  price: number;
  amount: number;
  buyerProtectionFee: number | null;
  sellerFee: number | null;
  delivery: number | null;
  address: string | null;
  carrier: string | null;
  trackingNumber: string | null;
  estimatedDelivery: string | null;
  createdAt: string;
  shippedAt: string | null;
  deliveredAt: string | null;
  hasOpenCase: boolean;
  canPrepare: boolean;
  canDispatch: boolean;
  canUpdateTracking: boolean;
  canConfirmDelivery: boolean;
};
export function parseManagedOrder(x: unknown): ManagedOrder {
  const r = x as ManagedOrder;
  const money = (n: unknown) =>
    typeof n === "number" && Number.isFinite(n) && n >= 0;
  const date = (n: unknown) =>
    typeof n === "string" && Number.isFinite(Date.parse(n));
  if (
    !r ||
    typeof r.id !== "string" ||
    typeof r.title !== "string" ||
    !["buyer", "seller"].includes(r.role) ||
    typeof r.status !== "string" ||
    !money(r.price) ||
    !money(r.amount) ||
    ![r.buyerProtectionFee, r.sellerFee, r.delivery].every(
      (n) => n === null || money(n),
    ) ||
    ![r.address, r.carrier, r.trackingNumber, r.estimatedDelivery].every(
      (n) => n === null || typeof n === "string",
    ) ||
    !date(r.createdAt) ||
    ![r.shippedAt, r.deliveredAt].every((n) => n === null || date(n)) ||
    ![
      r.hasOpenCase,
      r.canPrepare,
      r.canDispatch,
      r.canUpdateTracking,
      r.canConfirmDelivery,
    ].every((n) => typeof n === "boolean") ||
    (r.role === "buyer" &&
      (r.canPrepare || r.canDispatch || r.canUpdateTracking)) ||
    (r.role === "seller" && r.canConfirmDelivery) ||
    (r.canConfirmDelivery &&
      (r.hasOpenCase || !["shipped", "out_for_delivery"].includes(r.status)))
  )
    throw Error("Unexpected order details.");
  return r;
}
export function parseOrderAction(x: unknown) {
  const r = x as { ok?: unknown; changed?: unknown };
  if (!r || r.ok !== true || typeof r.changed !== "boolean")
    throw Error("Order change was not confirmed. Refresh before retrying.");
  return r.changed;
}
