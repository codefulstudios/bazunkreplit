// Reject coercions such as blank strings, Infinity, hexadecimal and exponents.
// Accept a decimal comma from localized Android keyboards.
export function decimalValue(input: string): number | null {
  const normalized = input.trim().replace(",", ".");
  if (!/^\d+(?:\.\d{1,2})?$/.test(normalized)) return null;
  const value = Number(normalized);
  return Number.isFinite(value) && value <= Number.MAX_SAFE_INTEGER / 100
    ? value
    : null;
}

export function positiveQuantity(input: string): number | null {
  if (!/^\d+$/.test(input.trim())) return null;
  const value = Number(input.trim());
  return Number.isSafeInteger(value) && value > 0 ? value : null;
}

export function validEbayImage(input: string): boolean {
  if (!input.trim()) return true;
  try {
    const url = new URL(input.trim());
    return url.protocol === "https:" && !url.username && !url.password &&
      (!url.port || url.port === "443") &&
      (url.hostname === "ebayimg.com" || url.hostname.endsWith(".ebayimg.com"));
  } catch {
    return false;
  }
}

// Do not coerce missing prices, booleans or blank strings to zero.
export function supplierPrice(input: unknown): number | null {
  const value = typeof input === "number" ? input :
    typeof input === "string" ? decimalValue(input) : null;
  return value !== null && Number.isFinite(value) && value > 0 &&
    value <= Number.MAX_SAFE_INTEGER / 100 ? value : null;
}

export function importCounts(imported: unknown, skipped: unknown) {
  const valid = (value: unknown): value is number =>
    typeof value === "number" && Number.isSafeInteger(value) && value >= 0;
  if (!valid(imported) || (skipped !== undefined && !valid(skipped))) {
    throw Error("Import result was not confirmed. Check My listings before retrying.");
  }
  return { imported, skipped: skipped === undefined ? 0 : skipped as number };
}
