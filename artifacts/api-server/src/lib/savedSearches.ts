import { db } from "@workspace/db";
import { sql } from "drizzle-orm";

export const SEARCH_KEYS = ["region","q","categories","subcategories","thirdLevels","conditions","minPrice","maxPrice","shipFrom","shipTo","freeShipping","listedWithin","sort"] as const;
export type SearchFilters = Record<(typeof SEARCH_KEYS)[number], string>;

export function normaliseSearchFilters(raw: unknown): SearchFilters {
  const source = (raw && typeof raw === "object" && !Array.isArray(raw)) ? raw as Record<string,unknown> : {};
  const filters = {} as SearchFilters;
  for (const key of SEARCH_KEYS) filters[key] = typeof source[key] === "string" ? source[key].trim().slice(0, 300) : "";
  if (filters.region !== "us" && filters.region !== "uk") throw new Error("Select UK or USA to save a search");
  for (const key of ["minPrice","maxPrice"] as const) {
    if (filters[key] && (!Number.isFinite(Number(filters[key])) || Number(filters[key]) < 0 || Number(filters[key]) > 1000000)) {
      throw new Error("Invalid price filter");
    }
  }
  if (filters.minPrice && filters.maxPrice && Number(filters.minPrice)>Number(filters.maxPrice))throw new Error("Maximum price must not be below minimum price");
  for(const k of ["categories","subcategories","thirdLevels","conditions","shipFrom","shipTo"] as const) {
    filters[k]=filters[k].split(",").map(s=>s.trim()).filter(Boolean).slice(0,15).join(",");
  }
  if (!["newest","price-asc","price-desc","price-lowest","views"].includes(filters.sort))filters.sort="newest";
  if (!["any","today","week","month"].includes(filters.listedWithin))filters.listedWithin="any";
  filters.freeShipping=filters.freeShipping==="true"?"true":"";
  return filters;
}

export async function ensureSavedSearchTables() {
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS marketplace_saved_searches (
      id TEXT PRIMARY KEY,
      user_email TEXT NOT NULL,
      name TEXT NOT NULL,
      filters JSONB NOT NULL,
      alert_enabled BOOLEAN NOT NULL DEFAULT TRUE,
      alert_since TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      last_checked_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
  await db.execute(sql`CREATE INDEX IF NOT EXISTS saved_searches_user_idx ON marketplace_saved_searches(LOWER(user_email), created_at DESC)`);
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS marketplace_saved_search_matches (
      search_id TEXT NOT NULL REFERENCES marketplace_saved_searches(id) ON DELETE CASCADE,
      listing_id INTEGER NOT NULL REFERENCES listings(id) ON DELETE CASCADE,
      matched_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      PRIMARY KEY(search_id, listing_id)
    )
  `);
}

const csv = (v?: string) => (v||"").split(",").map(x=>x.trim()).filter(Boolean).slice(0,15);

export function savedSearchPredicate(filters: SearchFilters) {
  const conditions: any[] = [
    sql`l.status='active'`,
    sql`(CASE WHEN COALESCE(l.specifications,'') ~ '^\\s*\\{' THEN l.specifications::jsonb->>'marketplace_region' ELSE NULL END) = ${filters.region}`,
    sql`NOT EXISTS (SELECT 1 FROM site_settings cv WHERE cv.value='false' AND (cv.key='category_visible_' || l.category OR cv.key='category_visible_' || l.category || '__' || COALESCE(l.subcategory,'')))`
  ];
  if(filters.q) {
    const term=filters.q.toLowerCase();
    conditions.push(sql`(STRPOS(LOWER(l.title),${term})>0 OR STRPOS(LOWER(l.category),${term})>0)`);
  }
  for(const [key,col] of [
    ["categories", sql`LOWER(l.category)`],["subcategories",sql`LOWER(l.subcategory)`],
    ["thirdLevels",sql`LOWER(l.subsubcategory)`],["conditions",sql`LOWER(l.condition)`],
    ["shipFrom",sql`LOWER(l.ship_origin)`]
  ] as const) {
    const values=csv(filters[key]).map(v=>v.toLowerCase());
    if(values.length)conditions.push(sql`${col} IN (${sql.join(values.map(v=>sql`${v}`),sql`, `)})`);
  }
  const zones=csv(filters.shipTo);
  if(zones.length)conditions.push(sql`(${sql.join(zones.map(v=>sql`l.ship_zone ILIKE ${"%"+v+"%"}`),sql` OR `)})`);
  if(filters.freeShipping==="true") conditions.push(sql`COALESCE(l.shipping_price,0)=0`);
  if(filters.minPrice)conditions.push(sql`l.price >= ${Number(filters.minPrice)}`);
  if(filters.maxPrice)conditions.push(sql`l.price <= ${Number(filters.maxPrice)}`);
  const days=filters.listedWithin==="today"?1:filters.listedWithin==="week"?7:filters.listedWithin==="month"?30:null;
  if(days)conditions.push(sql`l.created_at >= NOW() - ${days} * INTERVAL '1 day'`);
  // Sorting controls the order, not which listings qualify.
  return sql.join(conditions, sql` AND `);
}

export async function refreshSavedSearchMatches(email: string) {
  await ensureSavedSearchTables();
  const rows=(await db.execute(sql`
    SELECT id,filters,alert_since,last_checked_at FROM marketplace_saved_searches
    WHERE LOWER(user_email)=${email} AND alert_enabled=TRUE ORDER BY created_at DESC LIMIT 25
  `)).rows as Array<{id:string;filters:SearchFilters;alert_since:string;last_checked_at:string|null}>;
  for(const search of rows) {
    const filters=normaliseSearchFilters(search.filters);
    const cutoff = new Date();
    const since=search.last_checked_at || search.alert_since;
    // Scan oldest first. The watermark advances only through rows actually considered.
    const matches=(await db.execute(sql`
      SELECT l.id,l.created_at FROM listings l
      WHERE ${savedSearchPredicate(filters)}
        AND l.created_at > ${since} AND l.created_at <= ${cutoff.toISOString()}
        AND LOWER(l.seller_email) <> ${email}
      ORDER BY l.created_at ASC, l.id ASC LIMIT 400
    `)).rows as Array<{id:number;created_at:string}>;
    for(const m of matches) {
      await db.execute(sql`
        INSERT INTO marketplace_saved_search_matches(search_id,listing_id)
        VALUES(${search.id},${m.id}) ON CONFLICT DO NOTHING
      `);
    }
    const checkedThrough=matches.length===400?new Date(matches[matches.length-1].created_at).toISOString():cutoff.toISOString();
    await db.execute(sql`
      UPDATE marketplace_saved_searches SET last_checked_at=${checkedThrough}
      WHERE id=${search.id} AND LOWER(user_email)=${email} AND alert_enabled=TRUE
    `);
  }
}
