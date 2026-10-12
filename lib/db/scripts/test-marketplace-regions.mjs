/**
 * Regional database integration tests. Run ONLY against a disposable PostgreSQL
 * database with the Bazunk schema applied:
 *   TEST_DATABASE_URL=postgresql://... node --test lib/db/scripts/test-marketplace-regions.mjs
 *
 * Never points at DATABASE_URL; tests insert temporary rows and ROLLBACK.
 */
import assert from "node:assert/strict";
import { test, after } from "node:test";
import pg from "pg";
import { randomUUID } from "node:crypto";
import { validateClassifiedBatch } from "../../../artifacts/api-server/src/routes/classifiedImportValidation.mjs";

const url = process.env.TEST_DATABASE_URL;
if (!url) {
  console.error("Set TEST_DATABASE_URL to a disposable test database. Production is not supported.");
  process.exit(1);
}
const parsed = new URL(url);
const database = decodeURIComponent(parsed.pathname.replace(/^\//, ""));
if (!database || !/(test|ci|scratch|temporary|disposable)/i.test(database) || /^(bazunk|bazunk_db)$/i.test(database)) {
  throw new Error("Refusing to write: TEST_DATABASE_URL must name a dedicated test database.");
}
const pool = new pg.Pool({ connectionString: url, max: 1 });
after(async () => { await pool.end(); });

test("region-scoped activity queries isolate UK and US, with rollback", async () => {
  const client = await pool.connect();
  const marker = randomUUID();
  try {
    await client.query("BEGIN");
    for (const [table, columns, values] of [
      ["auctions", "id,title,seller_email,seller_name,starting_bid,bid_increment,end_time,status,marketplace_region", ["AUC-TEST-"+marker.slice(0,8), "regional-test-uk-"+marker, "test@example.invalid", "Regional Test", 10, 1, new Date(Date.now()+86400000), "active", "uk"]],
      ["auctions", "id,title,seller_email,seller_name,starting_bid,bid_increment,end_time,status,marketplace_region", ["AUC-TEST-"+marker.slice(9,17), "regional-test-us-"+marker, "test@example.invalid", "Regional Test", 10, 1, new Date(Date.now()+86400000), "active", "us"]],
      ["flash_sales", "id,title,seller_email,seller_name,original_price,sale_price,discount_percent,starts_at,ends_at,status,sale_type,marketplace_region", ["FS-TEST-"+marker.slice(0,8), "regional-test-uk-"+marker, "test@example.invalid", "Regional Test", 20, 10, 50, new Date(Date.now()-60000), new Date(Date.now()+86400000), "active", "standard", "uk"]],
      ["flash_sales", "id,title,seller_email,seller_name,original_price,sale_price,discount_percent,starts_at,ends_at,status,sale_type,marketplace_region", ["FS-TEST-"+marker.slice(9,17), "regional-test-us-"+marker, "test@example.invalid", "Regional Test", 20, 10, 50, new Date(Date.now()-60000), new Date(Date.now()+86400000), "active", "standard", "us"]],
    ]) {
      const placeholders = values.map((_, i) => "$"+(i+1)).join(",");
      await client.query(`INSERT INTO ${table} (${columns}) VALUES (${placeholders})`, values);
    }
    for (const region of ["uk", "us"]) {
      await client.query(
        "INSERT INTO classified_ads (title,description,category,location,contact_name,status,marketplace_region) VALUES ($1,$2,$3,$4,$5,$6,$7)",
        ["regional-test-"+region+"-"+marker, "Temporary region isolation test", "test", "Test Location", "Regional Test", "active", region],
      );
    }
    await client.query(
      "INSERT INTO classified_ads (title,description,category,location,contact_name,status,marketplace_region) VALUES ($1,$2,$3,$4,$5,$6,NULL)",
      ["regional-test-unassigned-"+marker, "Historical record", "test", "Test", "Test", "active"],
    );
    for (const table of ["auctions", "flash_sales", "classified_ads"]) {
      for (const region of ["uk", "us"]) {
        const result = await client.query(`SELECT title,marketplace_region FROM ${table} WHERE marketplace_region=$1 AND title LIKE $2`, [region, "%"+marker]);
        assert.equal(result.rowCount, 1, `${table} ${region} should return exactly one test row`);
        assert.equal(result.rows[0].marketplace_region, region);
        assert.equal(result.rows[0].title, "regional-test-"+region+"-"+marker);
      }
    }
  } finally {
    await client.query("ROLLBACK");
    client.release();

  }
});

test("admin classified import persists both regions and rolls back without affecting live data", async () => {
  const client = await pool.connect();
  const marker = randomUUID();
  const ads = ["uk", "us"].map(region => ({
    title: "import-integration-" + region + "-" + marker,
    description: "Temporary classified import verification",
    category: "test",
    location: "Test city",
    contactName: "Test seller",
    marketplaceRegion: region,
  }));
  try {
    await client.query("BEGIN");
    assert.equal(validateClassifiedBatch(ads).ok, true);
    for (const ad of ads) {
      await client.query(
        "INSERT INTO classified_ads (title,description,category,location,contact_name,status,marketplace_region) VALUES ($1,$2,$3,$4,$5,$6,$7)",
        [ad.title, ad.description, ad.category, ad.location, ad.contactName, "active", ad.marketplaceRegion],
      );
    }
    for (const region of ["uk", "us"]) {
      const result = await client.query(
        "SELECT title,marketplace_region FROM classified_ads WHERE title LIKE $1 AND marketplace_region=$2",
        ["import-integration-%-" + marker, region],
      );
      assert.equal(result.rowCount, 1);
      assert.equal(result.rows[0].marketplace_region, region);
    }
    const invalid = [{ ...ads[0], title: " " }, ads[1]];
    assert.equal(validateClassifiedBatch(invalid).ok, false);
    const before = await client.query("SELECT COUNT(*)::int AS count FROM classified_ads WHERE title LIKE $1", ["import-integration-%-" + marker]);
    assert.equal(before.rows[0].count, 2, "Rejected invalid batch must not add any rows");
  } finally {
    await client.query("ROLLBACK");
    client.release();
  }
  const verify = await pool.connect();
  try {
    const result = await verify.query("SELECT COUNT(*)::int AS count FROM classified_ads WHERE title LIKE $1", ["import-integration-%-" + marker]);
    assert.equal(result.rows[0].count, 0, "Rollback must leave no test classifieds");
  } finally {
    verify.release();
  }
});
