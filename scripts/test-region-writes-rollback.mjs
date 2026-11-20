// Transactional production schema write tests: every insert is rolled back.
// Does not use public APIs, charge credits, notify users, or persist listings.
import { createRequire } from "node:module";
import { randomUUID } from "node:crypto";
const require = createRequire(new URL("../lib/db/package.json", import.meta.url));
const { Client } = require("pg");
if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is required");
const db = new Client({ connectionString: process.env.DATABASE_URL });
const specs = [
  { table: "auctions", columns: "id,title,seller_email,seller_name,end_time,marketplace_region",
    values: id => [id,"Region isolation transactional test","region-test@example.invalid","Test Seller",new Date(Date.now()+86400000),null],
    sql: "INSERT INTO auctions (id,title,seller_email,seller_name,end_time,marketplace_region) VALUES ($1,$2,$3,$4,$5,$6) RETURNING marketplace_region" },
  { table: "flash_sales", sql: "INSERT INTO flash_sales (id,seller_email,seller_name,title,original_price,sale_price,starts_at,ends_at,marketplace_region) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING marketplace_region",
    values: id => [id,"region-test@example.invalid","Test Seller","Region isolation transactional test",10,9,new Date(),new Date(Date.now()+86400000),null] },
  { table: "classified_ads", sql: "INSERT INTO classified_ads (id,title,description,category,location,contact_name,marketplace_region) VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING marketplace_region",
    values: id => [-Math.floor(Math.random()*1000000000)-1000000000,"Region isolation transactional test","Temporary transaction","test","Test Location","Test Seller",null] },
];
let tests = 0;
try {
  await db.connect();
  await db.query("BEGIN");
  await db.query("SET LOCAL statement_timeout = '30s'");
  for (const spec of specs) {
    for (const region of ["uk","us"]) {
      const values = spec.values("REGION-TEST-"+randomUUID());
      values[values.length-1] = region;
      const result = await db.query(spec.sql,values);
      if (result.rows[0]?.marketplace_region !== region) throw new Error(spec.table+" did not save "+region);
      tests++;
    }
    for (const invalid of [null,"ca",""]) {
      await db.query("SAVEPOINT invalid_region");
      const values = spec.values("REGION-TEST-"+randomUUID());
      values[values.length-1] = invalid;
      let rejected = false;
      try { await db.query(spec.sql,values); } catch (e) {
        if (!["23502","23514"].includes(e.code)) throw e;
        rejected = true;
      }
      await db.query("ROLLBACK TO SAVEPOINT invalid_region");
      await db.query("RELEASE SAVEPOINT invalid_region");
      if (!rejected) throw new Error(spec.table+" accepted invalid region "+JSON.stringify(invalid));
      tests++;
    }
  }
  await db.query("ROLLBACK");
  console.log(JSON.stringify({ok:true,tests,tables:specs.map(s=>s.table),persisted:0}));
} catch(e) {
  try { await db.query("ROLLBACK"); } catch {}
  console.error("Transactional region write test failed:",e.message);
  process.exitCode=1;
} finally { await db.end(); }
