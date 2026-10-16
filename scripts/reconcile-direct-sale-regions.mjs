// Inspect legacy listings with missing UK/US marketplace regions.
// Runs in read-only mode by default. Only trusted source-market labels qualify.
// Set APPLY=1 to persist assignments after reviewing the preview and backing up DB.
import { createRequire } from "node:module";
const require = createRequire(new URL("../lib/db/package.json", import.meta.url));
const { Client } = require("pg");
if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is required");
const client = new Client({ connectionString: process.env.DATABASE_URL });
const sourceMarket = { "eBay UK": "uk", "Amazon UK": "uk", "eBay US": "us", "Amazon US": "us" };
try {
  await client.connect();
  await client.query("BEGIN");
  const { rows } = await client.query("SELECT id, specifications FROM listings ORDER BY id FOR UPDATE");
  const candidates = [], unresolved = [];
  for (const row of rows) {
    let metadata;
    try { metadata = JSON.parse(row.specifications || "{}"); } catch { unresolved.push(row.id); continue; }
    if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) { unresolved.push(row.id); continue; }
    if (metadata.marketplace_region === "uk" || metadata.marketplace_region === "us") continue;
    const region = sourceMarket[metadata.source];
    if (!region) { unresolved.push(row.id); continue; }
    candidates.push({ id: row.id, source: metadata.source, region, metadata });
  }
  console.log(JSON.stringify({ mode: process.env.APPLY === "1" ? "apply" : "preview", assignments: candidates.map(({id,source,region})=>({id,source,region})), unresolved }, null, 2));
  if (process.env.APPLY === "1") {
    for (const row of candidates) {
      const specs = JSON.stringify({ ...row.metadata, marketplace_region: row.region });
      await client.query("UPDATE listings SET specifications=$1 WHERE id=$2", [specs, row.id]);
    }
    await client.query("COMMIT");
    console.log("Committed " + candidates.length + " verified source-market assignments");
  } else await client.query("ROLLBACK");
} catch(error) {
  await client.query("ROLLBACK").catch(()=>{});
  console.error(error);
  process.exitCode=1;
} finally { await client.end(); }
