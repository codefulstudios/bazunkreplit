export type Inventory = {
  id: number;
  quantity: number;
  held: number;
  available: number;
  status: string;
};
export function parseInventory(x: unknown): Inventory {
  const r = x as Inventory;
  if (
    !r ||
    !Number.isSafeInteger(r.id) ||
    r.id <= 0 ||
    typeof r.status !== "string" ||
    ![r.quantity, r.held, r.available].every(
      (n) => Number.isSafeInteger(n) && n >= 0,
    ) ||
    r.available !== Math.max(0, r.quantity - r.held)
  )
    throw Error("Unexpected stock response.");
  return r;
}
export function parseStockChange(x: unknown) {
  const r = x as Inventory;
  if (
    !r ||
    ![r.quantity, r.held, r.available].every(
      (n) => Number.isSafeInteger(n) && n >= 0,
    ) ||
    r.available !== r.quantity - r.held
  )
    throw Error("Stock update was not confirmed. Refresh before retrying.");
  return r;
}
