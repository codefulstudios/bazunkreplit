import { db } from "@workspace/db";
import { sql } from "drizzle-orm";

/**
 * Isolated, cash-backed importer wallet. Reward/game credits never enter this ledger.
 * Amounts are USD integer microcents (1 USD = 100,000,000 microcents).
 * No funding endpoint is exposed until verified Stripe settlement is implemented.
 */
export const IMPORTER_MICROCENTS_PER_USD = 100_000_000n;
export const IMPORTER_MARKUP_BPS = 15_000n; // $0.10 supplier cost -> $0.15 seller charge
export async function ensureImporterBillingTables() {
 await db.execute(sql`CREATE TABLE IF NOT EXISTS importer_paid_wallets (
  email TEXT PRIMARY KEY, balance_microcents BIGINT NOT NULL DEFAULT 0 CHECK(balance_microcents>=0),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW())`);
 await db.execute(sql`CREATE TABLE IF NOT EXISTS importer_paid_usage (
  id BIGSERIAL PRIMARY KEY, email TEXT NOT NULL, provider TEXT NOT NULL,
  endpoint TEXT NOT NULL, supplier_cost_microcents BIGINT NOT NULL,
  charged_microcents BIGINT NOT NULL, status TEXT NOT NULL DEFAULT 'reserved',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), completed_at TIMESTAMPTZ)`);
}
export async function importerBalance(email:string) {
 await ensureImporterBillingTables();
 const r=await db.execute(sql`SELECT balance_microcents FROM importer_paid_wallets WHERE email=${email}`);
 return String(r.rows[0]?.balance_microcents ?? "0");
}
/** Fail closed: unknown prices, unfunded wallets and database failures block paid requests. */
export async function reserveImporterCharge(email:string,provider:string,endpoint:string,supplierCostMicrocents:bigint) {
 if(!email || !["ebay","amazon","aliexpress"].includes(provider) || !endpoint || supplierCostMicrocents<=0n)throw Error("Importer billing configuration unavailable");
 const charge=(supplierCostMicrocents*IMPORTER_MARKUP_BPS+9999n)/10000n;
 await ensureImporterBillingTables();
 return db.transaction(async tx=>{
  const debit=await tx.execute(sql`UPDATE importer_paid_wallets SET balance_microcents=balance_microcents-${charge.toString()}::bigint,updated_at=NOW()
   WHERE email=${email} AND balance_microcents>=${charge.toString()}::bigint RETURNING balance_microcents`);
  if(!debit.rows.length)throw Error("Insufficient purchased importer balance");
  const row=await tx.execute(sql`INSERT INTO importer_paid_usage(email,provider,endpoint,supplier_cost_microcents,charged_microcents)
   VALUES(${email},${provider},${endpoint},${supplierCostMicrocents.toString()}::bigint,${charge.toString()}::bigint) RETURNING id`);
  return {id:Number(row.rows[0].id),chargedMicrocents:charge.toString()};
 });
}
export async function finishImporterCharge(id:number,status:string){
 await db.execute(sql`UPDATE importer_paid_usage SET status=${status},completed_at=NOW() WHERE id=${id}`);
}
