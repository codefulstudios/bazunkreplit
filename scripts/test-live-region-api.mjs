/** Read-only production-safe regional API smoke checks. No POST, PATCH or DELETE. */
import assert from "node:assert/strict";
import { test } from "node:test";

const base = (process.env.MARKETPLACE_API_BASE_URL || "https://bazunk-api.onrender.com").replace(/\/$/, "");
const routes = ["auctions", "flash-sales", "classifieds"];
const listingRoute = "/listings";

async function get(path) {
  const response = await fetch(base + "/api" + path, { signal: AbortSignal.timeout(30000) });
  let body;
  try { body = await response.json(); } catch { body = null; }
  return { response, body };
}

for (const route of routes) {
  test(`GET /${route} rejects invalid region`, async () => {
    const { response } = await get(`/${route}?region=invalid-region`);
    assert.equal(response.status, 400);
  });
  for (const region of ["uk", "us"]) {
    test(`GET /${route} only returns ${region} records`, async () => {
      const { response, body } = await get(`/${route}?region=${region}&limit=10`);
      assert.equal(response.status, 200, `Expected 200 for ${route}/${region}; got ${response.status}`);
      assert.ok(Array.isArray(body), `Expected array from ${route}/${region}`);
      for (const record of body) {
        assert.equal(record.marketplaceRegion ?? record.marketplace_region, region,
          `Cross-region ${route} record returned`);
      }
    });
  }
}


for (const region of ["uk", "us"]) {
  test(`GET /listings?region=${region} excludes explicit opposite-region listings`, async () => {
    const { response, body } = await get(`${listingRoute}?region=${region}&limit=50`);
    assert.equal(response.status, 200);
    const listings = Array.isArray(body) ? body : Array.isArray(body?.listings) ? body.listings : null;
    assert.ok(listings, "Expected listing array or listings property");
    for (const listing of listings) {
      assert.equal(listing.marketplaceRegion, region,
        `Listing ${listing.id} missing or mismatched region in ${region} browse`);
    }
    // ID-list retrieval is also a public browse path: it must not leak listings
    // selected from the opposite market.
    if (listings.length) {
      const ids = listings.slice(0, 5).map(x => x.id).join(",");
      const opposite = region === "uk" ? "us" : "uk";
      const { response: otherResponse, body: otherBody } = await get(
        `${listingRoute}?ids=${ids}&region=${opposite}`);
      assert.equal(otherResponse.status, 200);
      assert.ok(Array.isArray(otherBody));
      assert.equal(otherBody.length, 0, "Opposite-market IDs leaked via ids lookup");
    }
  });
}
