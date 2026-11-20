/** Shared, side-effect-free validation for admin classified batch imports. */
export function validateClassifiedBatch(ads) {
  if (!Array.isArray(ads) || ads.length === 0) {
    return { ok: false, status: 400, error: "ads array is required" };
  }
  if (ads.length > 200 || ads.some(a => !a || typeof a !== "object" || Array.isArray(a))) {
    return { ok: false, status: 400, error: "Import requires 1–200 classified objects" };
  }
  const invalidCount = ads.filter(a => a.marketplaceRegion !== "uk" && a.marketplaceRegion !== "us").length;
  if (invalidCount) {
    return { ok: false, status: 400, error: "Each imported classified requires marketplaceRegion: uk or us", invalidCount };
  }
  const incompleteCount = ads.filter(a =>
    !["title", "description", "category", "location", "contactName"].every(
      key => typeof a[key] === "string" && a[key].trim().length > 0
    )
  ).length;
  if (incompleteCount) {
    return { ok: false, status: 400, error: "Every ad must contain title, description, category, location and contactName", invalidCount: incompleteCount };
  }
  return { ok: true, status: 200 };
}
