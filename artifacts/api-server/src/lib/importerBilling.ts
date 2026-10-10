import { db } from "@workspace/db";
import { sql } from "drizzle-orm";

/**
 * Isolated, cash-backed importer wallet. Reward/game credits never enter this ledger.
 * Amounts are USD integer microcents (1 USD = 100,000,000 microcents).
 * No funding endpoint is exposed until verified Stripe settlement is implemented.
 */
export const IMPORTER_MICROCENTS_PER_USD = 100_000_000n;
export const IMPORTER_MARKUP_BPS = 15_000n; // $0.10 supplier cost -> $0.15 seller charge
export function importerSellerCharge(cost:bigint,markupBps:bigint=IMPORTER_MARKUP_BPS):bigint {
 if(cost<=0n || markupBps<IMPORTER_MARKUP_BPS || markupBps>100_000n) throw Error("Invalid importer pricing");
 return (cost*markupBps+9999n)/10000n;
}
export async function ensureImporterBillingTables() {
 await db.execute(sql`CREATE TABLE IF NOT EXISTS importer_paid_wallets (
  email TEXT PRIMARY KEY, balance_microcents BIGINT NOT NULL DEFAULT 0 CHECK(balance_microcents>=0),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW())`);
 await db.execute(sql`CREATE TABLE IF NOT EXISTS importer_provider_prices (
  provider TEXT NOT NULL, endpoint TEXT NOT NULL,
  supplier_cost_microcents BIGINT NOT NULL CHECK(supplier_cost_microcents>0),
  markup_bps INTEGER NOT NULL DEFAULT 15000 CHECK(markup_bps>=15000 AND markup_bps<=100000),
  enabled BOOLEAN NOT NULL DEFAULT FALSE,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY(provider,endpoint))`);
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
export async function reserveImporterCharge(email:string,provider:string,endpoint:string) {
 if(!email || !["ebay","amazon","aliexpress"].includes(provider) || !endpoint)throw Error("Importer billing configuration unavailable");
 await ensureImporterBillingTables();
 const configured=await db.execute(sql`SELECT supplier_cost_microcents,markup_bps FROM importer_provider_prices
   WHERE provider=${provider} AND endpoint=${endpoint} AND enabled=TRUE`);
 if(!configured.rows.length)throw Error("Importer pricing not configured or disabled");
 const supplierCostMicrocents=BigInt(String(configured.rows[0].supplier_cost_microcents));
 const charge=importerSellerCharge(supplierCostMicrocents,BigInt(String(configured.rows[0].markup_bps)));
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
