import { test } from "node:test";
import assert from "node:assert/strict";
import { validateClassifiedBatch } from "./classifiedImportValidation.mjs";

const valid = region => ({ title: "Test classified", description: "Test description", category: "general", location: "Test city", contactName: "Test Seller", marketplaceRegion: region });

test("UK and USA/Canada imports accept valid batches", () => {
  for (const region of ["uk", "us"]) assert.equal(validateClassifiedBatch([valid(region)]).ok, true);
  assert.equal(validateClassifiedBatch([valid("uk"), valid("us")]).ok, true);
});
test("missing and invalid regions reject the entire batch", () => {
  for (const region of [undefined, "", "gb", "US"]) {
    assert.equal(validateClassifiedBatch([valid("uk"), valid(region)]).invalidCount, 1);
  }
});
test("incomplete and whitespace-only fields reject the entire batch", () => {
  for (const key of ["title", "description", "category", "location", "contactName"]) {
    assert.equal(validateClassifiedBatch([valid("uk"), { ...valid("us"), [key]: "  " }]).invalidCount, 1);
  }
});
test("non-array, empty, null and malformed row inputs are rejected", () => {
  for (const ads of [undefined, null, {}, [], [null], ["not an object"], [[valid("uk")]]]) {
    assert.equal(validateClassifiedBatch(ads).ok, false);
  }
});
test("200 rows allowed and 201 rejected", () => {
  assert.equal(validateClassifiedBatch(Array.from({ length: 200 }, () => valid("uk"))).ok, true);
  assert.equal(validateClassifiedBatch(Array.from({ length: 201 }, () => valid("uk"))).ok, false);
});
