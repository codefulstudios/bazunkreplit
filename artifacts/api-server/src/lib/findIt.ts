import { db } from "@workspace/db";
import { sql } from "drizzle-orm";
import { convertAmount } from "../fxRates.js";
import { calculateFees, minor, percentage } from "./marketplaceFees.js";

/** Separate workflow records linked one-to-one to a real Wanted classified. Idempotent on each runtime. */
export async function ensureFindItTables() {
  await db.execute(sql`CREATE TABLE IF NOT EXISTS marketplace_find_requests (
    id TEXT PRIMARY KEY, classified_id INTEGER NOT NULL UNIQUE REFERENCES classified_ads(id) ON DELETE CASCADE,
    buyer_email TEXT NOT NULL, region TEXT NOT NULL CHECK(region IN ('uk','us')),
    budget_minor INTEGER NOT NULL CHECK(budget_minor BETWEEN 100 AND 100000000),
    status TEXT NOT NULL DEFAULT 'open' CHECK(status IN ('open','accepted','purchased','closed','paused')),
    selected_offer_id TEXT, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), expires_at TIMESTAMPTZ NOT NULL
  )`);
  await db.execute(sql`CREATE TABLE IF NOT EXISTS marketplace_find_offers (
    id TEXT PRIMARY KEY, request_id TEXT NOT NULL REFERENCES marketplace_find_requests(id) ON DELETE CASCADE,
    seller_email TEXT NOT NULL, seller_name TEXT NOT NULL, item_title TEXT NOT NULL,
    description TEXT NOT NULL, condition TEXT NOT NULL,
    price_minor INTEGER NOT NULL CHECK(price_minor BETWEEN 100 AND 100000000),
    photo TEXT, status TEXT NOT NULL DEFAULT 'pending'
      CHECK(status IN ('pending','selected','declined','withdrawn')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )`);
  await db.execute(sql`CREATE UNIQUE INDEX IF NOT EXISTS find_offer_seller_once ON marketplace_find_offers(request_id,LOWER(seller_email))`);
  await db.execute(sql`CREATE INDEX IF NOT EXISTS find_requests_buyer_idx ON marketplace_find_requests(LOWER(buyer_email),created_at DESC)`);
  await db.execute(sql`CREATE INDEX IF NOT EXISTS find_requests_active_idx ON marketplace_find_requests(region,status,expires_at)`);
  await db.execute(sql`CREATE TABLE IF NOT EXISTS marketplace_find_audit (
    id BIGSERIAL PRIMARY KEY, request_id TEXT NOT NULL, actor TEXT NOT NULL,
    action TEXT NOT NULL, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )`);
}

export function findPhoto(photo:unknown):string|null {
  if(photo == null || photo === "") return null;
  if(typeof photo !== "string" || photo.length > 370000 ||
    !/^data:image\/(?:png|jpeg|webp);base64,[a-z0-9+/=]+$/i.test(photo)) throw new Error("Choose a JPG, PNG or WebP photo smaller than 260 KB.");
  return photo;
}
export function amountMinor(raw:unknown):number {
  if(typeof raw !== "number" && typeof raw !== "string") return 0;
  if(typeof raw === "string" && !/^\d{1,7}(?:\.\d{1,2})?$/.test(raw.trim())) return 0;
  const n=Number(raw);
  return Number.isFinite(n)&&n>=1&&n<=1000000 ? Math.round(n*100) : 0;
}
export async function findQuote(offer:{price_minor:number|string;seller_email:string;region:string;category:string}) {
  const gbpPrice=offer.region==="us" ? await convertAmount(Number(offer.price_minor)/100,"USD","GBP") : Number(offer.price_minor)/100;
  const priceMinor=minor(gbpPrice);
  if(priceMinor<100) throw Error("Converted item price is too small");
  const seller=(await db.execute(sql`SELECT seller_type FROM users WHERE LOWER(email)=LOWER(${offer.seller_email}) LIMIT 1`)).rows[0] as any;
  const sellerType=String(seller?.seller_type??"private").toLowerCase();
  if(!["private","business","sole_trader"].includes(sellerType)) throw Error("Seller account type is not eligible for checkout");
  const settings=(await db.execute(sql`SELECT key,value FROM site_settings WHERE key LIKE 'fee_rate_%' OR key LIKE 'buyer_protection_%'`)).rows as any[];
  const fees=Object.fromEntries(settings.map(s=>[String(s.key),String(s.value)]));
  const category=String(offer.category||"").toLowerCase();
  const calc=calculateFees([{id:1,quantity:1,priceMinor,sellerType,
    businessRate:percentage(fees[`fee_rate_${category}`],percentage(fees.fee_rate_default,8)),
    title:"Find It offer",image:null,sellerEmail:offer.seller_email,category}],
    percentage(fees.buyer_protection_percent,5),
    fees.buyer_protection_fixed_gbp==null ? 70 : minor(fees.buyer_protection_fixed_gbp),
    gbpPrice>=50?0:399);
  const totalLocal=offer.region==="us" ? await convertAmount(calc.totalMinor/100,"GBP","USD") : calc.totalMinor/100;
  return {currency:offer.region==="us"?"USD":"GBP",offer_minor:Number(offer.price_minor),
    total_minor:Math.round(totalLocal*100),payable_gbp_minor:calc.totalMinor,
    protection_gbp_minor:calc.buyerProtectionMinor,delivery_gbp_minor:calc.deliveryMinor};
}
