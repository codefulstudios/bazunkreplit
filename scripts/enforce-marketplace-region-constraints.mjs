// One-time marketplace region integrity migration. Do not schedule repeatedly.
// Run with DATABASE_URL configured securely in a temporary Render job.
import { createRequire } from "node:module";
const require = createRequire(new URL("../lib/db/package.json", import.meta.url));
const { Client } = require("pg");

const tables = ["auctions", "flash_sales", "classified_ads"];
if (!process.env.DATABASE_URL) {
  console.error("DATABASE_URL must be set");
  process.exit(2);
}
const client = new Client({ connectionString: process.env.DATABASE_URL });
try {
  await client.connect();
  await client.query("BEGIN");
  await client.query("SET LOCAL lock_timeout = '10s'");
  await client.query("SET LOCAL statement_timeout = '60s'");
  for (const table of tables) {
    // Serialize migration with writers; preflight inside transaction to avoid races.
    await client.query(`LOCK TABLE "${table}" IN ACCESS EXCLUSIVE MODE`);
    const { rows: [{ invalid }] } = await client.query(
      `SELECT count(*)::integer AS invalid FROM "${table}" WHERE marketplace_region IS NULL OR marketplace_region NOT IN ('uk','us')`,
    );
    if (invalid !== 0) throw new Error(`${table} has ${invalid} invalid regions; no constraints applied`);
  }
  for (const table of tables) {
    await client.query(`ALTER TABLE "${table}" ALTER COLUMN marketplace_region SET NOT NULL`);
    const name = `${table}_marketplace_region_allowed`;
    const { rows } = await client.query(
      "SELECT 1 FROM pg_constraint WHERE conrelid = $1::regclass AND conname = $2",
      [table, name],
    );
    if (!rows.length) {
      await client.query(`ALTER TABLE "${table}" ADD CONSTRAINT "${name}" CHECK (marketplace_region IN ('uk','us'))`);
    }
  }
  const { rows: verified } = await client.query(
    `SELECT table_name,is_nullable FROM information_schema.columns
     WHERE table_schema='public' AND table_name = ANY($1::text[]) AND column_name='marketplace_region'
     ORDER BY table_name`,
    [tables],
  );
  if (verified.length !== tables.length || verified.some(r => r.is_nullable !== "NO")) {
    throw new Error("Post-migration nullability verification failed");
  }
  const { rows: checks } = await client.query(
    `SELECT conrelid::regclass::text AS table_name, conname
     FROM pg_constraint WHERE conrelid = ANY($1::regclass[])
       AND conname = ANY($2::text[])`,
    [tables, tables.map(t => `${t}_marketplace_region_allowed`)],
  );
  if (checks.length !== tables.length) throw new Error("Constraint verification failed");
  await client.query("COMMIT");
  console.log(JSON.stringify({ ok: true, verified, checks }));
} catch (error) {
  try { await client.query("ROLLBACK"); } catch {}
  console.error("Region integrity migration failed:", error.message);
  process.exitCode = 1;
} finally {
  await client.end();
}
