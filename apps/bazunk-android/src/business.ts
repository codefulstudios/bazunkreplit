export function record(x: unknown): Record<string, unknown> {
  if (!x || typeof x !== "object" || Array.isArray(x))
    throw Error("Unexpected server response.");
  return x as Record<string, unknown>;
}
export function rows(x: unknown) {
  if (!Array.isArray(x) || x.length > 200)
    throw Error("Unexpected list response.");
  return x.map(record);
}
export function saved(x: unknown) {
  if (record(x).ok !== true)
    throw Error("Change was not confirmed. Refresh before retrying.");
}
export function parseWallet(x: unknown) {
  const r = record(x),
    products = record(r.products);
  if (
    !Number.isSafeInteger(r.balance) ||
    typeof r.purchasesEnabled !== "boolean" ||
    Object.values(products).some(
      (n) => !Number.isSafeInteger(n) || Number(n) < 1,
    )
  )
    throw Error("Invalid wallet response.");
  return {
    balance: Number(r.balance),
    purchasesEnabled: r.purchasesEnabled,
    products: products as Record<string, number>,
    history: rows(r.history),
  };
}
export function parsePromotions(x: unknown) {
  const r = record(x);
  if (!Number.isSafeInteger(r.balance)) throw Error("Invalid balance.");
  const catalog = rows(r.catalog);
  if (
    catalog.some(
      (c) =>
        typeof c.type !== "string" ||
        typeof c.label !== "string" ||
        !Number.isSafeInteger(c.credits) ||
        Number(c.credits) < 0 ||
        typeof c.enabled !== "boolean",
    )
  )
    throw Error("Invalid promotion prices.");
  return { balance: Number(r.balance), catalog, active: rows(r.active) };
}
export function parseVerification(x: unknown) {
  const r = record(x);
  if (
    !["unverified", "pending", "verified", "rejected"].includes(
      String(r.verificationStatus),
    ) ||
    typeof r.configured !== "boolean"
  )
    throw Error("Unexpected verification response.");
  return r;
}
export function parseKeys(x: unknown) {
  const r = record(x);
  if (typeof r.connected !== "boolean" || typeof r.bazunk !== "boolean")
    throw Error("Unexpected connection response.");
  return r;
}
export function ref() {
  return (
    "req-" +
    Date.now() +
    "-" +
    Math.random().toString(36).slice(2) +
    "-" +
    Math.random().toString(36).slice(2)
  );
}
