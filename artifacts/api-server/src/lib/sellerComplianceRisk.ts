/**
 * Seller compliance scoring: advisory only. Never reclassify a seller or charge
 * fees solely on this score. All inputs must be derived from trusted server data.
 */
export type SellerSignals = {
  activeListings: number;
  listingsCreated30d: number;
  completedSales30d: number;
  identicalNewStockMax: number;
  replenishedSkuCount90d: number;
  importedListings30d: number;
  commercialDescriptionMatches: number;
  personalCollectionEvidence: boolean;
};
export type SellerRisk = { score: number; band: "normal" | "enhanced" | "review"; reasons: { code: string; points: number; detail: string }[] };
export function scoreSellerRisk(s: SellerSignals): SellerRisk {
  const reasons: SellerRisk["reasons"] = [];
  const add = (code: string, points: number, detail: string) => { if (points) reasons.push({code, points, detail}); };
  if (s.listingsCreated30d >= 20) add("LISTING_VELOCITY", 15, "20+ listings created in 30 days");
  if (s.completedSales30d >= 20) add("SALES_VELOCITY", 15, "20+ completed sales in 30 days");
  if (s.identicalNewStockMax >= 5) add("IDENTICAL_NEW_STOCK", 30, "Five or more identical new units");
  if (s.replenishedSkuCount90d >= 2) add("RESTOCKING", 25, "Repeated restocking of multiple SKUs");
  if (s.importedListings30d >= 30) add("BULK_IMPORT", 15, "30+ imported listings in 30 days");
  if (s.commercialDescriptionMatches >= 3) add("COMMERCIAL_COPY", 15, "Repeated commercial descriptions");
  if (s.personalCollectionEvidence) add("PERSONAL_COLLECTION", -10, "Evidence of personal collection or clear-out");
  const score = Math.max(0, Math.min(100, reasons.reduce((a,r) => a + r.points, 0)));
  return { score, band: score >= 60 ? "review" : score >= 30 ? "enhanced" : "normal", reasons };
}
