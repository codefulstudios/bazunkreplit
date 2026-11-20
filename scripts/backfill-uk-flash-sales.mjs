// One-shot, idempotent production backfill for two owner-confirmed UK flash sales.
// Usage: DATABASE_URL=<connection> node scripts/backfill-uk-flash-sales.mjs (after pnpm install)
// Never run this as a recurring scheduled job.
import { createRequire } from "node:module";
const require = createRequire(new URL("../lib/db/package.json", import.meta.url));
const pg = require("pg");

const ids = ["FS-95097A8B", "FS-E94BB649"];
if (!process.env.DATABASE_URL) {
  console.error("DATABASE_URL must be configured securely in the job environment");
  process.exit(2);
}
const client = new pg.Client({ connectionString: process.env.DATABASE_URL });
try {
  await client.connect();
  await client.query("BEGIN");
  const before = await client.query(
    "SELECT id, marketplace_region, status FROM flash_sales WHERE id = ANY($1::text[]) ORDER BY id FOR UPDATE",
    [ids],
  );
  if (before.rows.length !== ids.length || before.rows.some(r => ![null, "uk"].includes(r.marketplace_region))) {
    throw new Error("Expected both flash sales to exist with NULL or UK region; refusing to modify data");
  }
  const updated = await client.query(
    "UPDATE flash_sales SET marketplace_region = 'uk' WHERE id = ANY($1::text[]) AND marketplace_region IS NULL RETURNING id",
    [ids],
  );
  const after = await client.query(
    "SELECT id, marketplace_region, status FROM flash_sales WHERE id = ANY($1::text[]) ORDER BY id",
    [ids],
  );
  if (after.rows.length !== ids.length || after.rows.some(r => r.marketplace_region !== "uk")) {
    throw new Error("Post-update verification failed");
  }
  await client.query("COMMIT");
  console.log(JSON.stringify({ ok: true, changed: updated.rowCount, verified: after.rows }));
} catch (error) {
  try { await client.query("ROLLBACK"); } catch {}
  console.error("UK flash sale backfill failed:", error.message);
  process.exitCode = 1;
} finally {
  await client.end();
}
