import { recordCreditEconomy } from "../lib/creditEconomy.js";
import { isBanned } from "../lib/banned.js";
import { Router } from "express";
import { clerkClient, getAuth } from "@clerk/express";
import { authenticatedSellerEmail } from "../lib/authenticatedSeller.js";
import { db, listingsTable, listingPromotionsTable } from "@workspace/db";
import { eq, desc, and, gt, sql, inArray } from "drizzle-orm";
import { toGbp } from "../fxRates.js";
import { storage } from "../storage.js";
import { refreshSellerMilestones } from "../lib/milestones.js";
import { sendSystemMessage } from "../lib/systemMessages.js";

import { awardReferralMilestone } from "../lib/referrals.js";
import { getPromoConfig } from "../lib/promoConfig.js";

const router = Router();

// Server-side visibility: missing setting means visible; parent OFF overrides children.
async function categoryVisibility() {
 await db.execute(sql`CREATE TABLE IF NOT EXISTS demo_creator_settings (key TEXT PRIMARY KEY, enabled BOOLEAN NOT NULL DEFAULT FALSE)`);
 await db.execute(sql`CREATE TABLE IF NOT EXISTS demo_listing_registry (
 listing_id INTEGER PRIMARY KEY REFERENCES listings(id) ON DELETE CASCADE,
 seller_email TEXT NOT NULL, region TEXT NOT NULL CHECK(region IN ('uk','us')),
 enabled BOOLEAN NOT NULL DEFAULT TRUE, source_url TEXT,
 created_at TIMESTAMPTZ NOT NULL DEFAULT NOW())`);
 return sql`NOT EXISTS (SELECT 1 FROM demo_listing_registry d WHERE d.listing_id=${listingsTable.id}
 AND (NOT d.enabled OR NOT COALESCE((SELECT enabled FROM demo_creator_settings WHERE key='master'),FALSE)
 OR NOT COALESCE((SELECT enabled FROM demo_creator_settings WHERE key='listings'),FALSE)))
 AND NOT EXISTS (SELECT 1 FROM site_settings cv WHERE cv.value='false' AND (cv.key='category_visible_' || ${listingsTable.category} OR cv.key='category_visible_' || ${listingsTable.category} || '__' || COALESCE(${listingsTable.subcategory},'')))`;
}

// Region is a browsing scope, not an account or permissions boundary.
function listingRegionFilter(region: unknown) {
  if (region !== "uk" && region !== "us") return undefined;
  // Explicit region wins. Older UK/US supplier imports have a verifiable
  // source-market identifier; store currency alone is never location evidence.
  // Unassigned Shopify and manually created listings remain out of regional
  // discovery until the seller/admin confirms their shipping market.
  const specs = sql`CASE WHEN COALESCE(${listingsTable.specifications}, '') ~ '^\\s*\\{' THEN ${listingsTable.specifications}::jsonb ELSE '{}'::jsonb END`;
  const source = sql`(${specs}->>'source')`;
  const explicit = sql`(${specs}->>'marketplace_region')`;
  const origins = region === "uk" ? ["eBay UK", "Amazon UK"] : ["eBay US", "Amazon US"];
  return sql`(${explicit} = ${region} OR (${explicit} IS NULL AND ${source} IN (${sql.join(origins.map(v => sql`${v}`), sql`, `)})))`;
}

function makePublicId(id: number): string {
  return `BZL-${id}`;
}

async function attachPromotions<T extends { id: number }>(rows: T[]): Promise<(T & { promotions: string[] })[]> {
  if (rows.length === 0) return [];
  const ids = rows.map((r) => r.id);
  const now = new Date();

  // If listing_promotions is missing or the query fails for any reason,
  // fall back to showing listings with no promotions rather than letting
  // the failure take down the whole listings grid.
  let promos: { listingId: number; type: string }[] = [];
  try {
    promos = await db
      .select({ listingId: listingPromotionsTable.listingId, type: listingPromotionsTable.type })
      .from(listingPromotionsTable)
      .where(
        and(
          gt(listingPromotionsTable.expiresAt, now),
          inArray(listingPromotionsTable.listingId, ids)
        )
      );
  } catch (err) {
    console.error("attachPromotions: listing_promotions query failed, continuing without promotions:", err);
  }

  const promoMap = new Map<number, string[]>();
  for (const p of promos) {
    if (!promoMap.has(p.listingId)) promoMap.set(p.listingId, []);
    promoMap.get(p.listingId)!.push(p.type);
  }
  return rows.map((r) => ({ ...r, promotions: promoMap.get(r.id) ?? [] }));
}

function promoRank(promotions: string[]): number {
  if (promotions.includes("homepage-spotlight") || promotions.includes("spotlight")) return 4;
  if (promotions.includes("premium-placement")) return 3;
  if (promotions.includes("featured-badge") || promotions.includes("featured")) return 2;
  if (promotions.includes("visibility-boost") || promotions.includes("move-to-top") || promotions.includes("flash")) return 1;
  return 0;
}

router.get("/listings", async (req, res) => {
  try {
    if (req.query.region !== undefined && req.query.region !== "uk" && req.query.region !== "us") {
      res.status(400).json({ error: "Invalid marketplace region; use uk or us" });
      return;
    }
    const { category, sub, subsub, sellerEmail, limit = "40", offset = "0", ids, q, conditions, categories, subcategories, thirdLevels, minPrice, maxPrice, sort } = req.query as Record<string, string>;

    if (ids) {
      const regionalVisibility = listingRegionFilter(req.query.region);
      const idList = ids.split(",").map((s) => parseInt(s.trim(), 10)).filter((n) => !isNaN(n));
      if (idList.length === 0) { res.json([]); return; }
      const visible = await categoryVisibility();
      const rows = await db.select().from(listingsTable).where(and(inArray(listingsTable.id, idList), eq(listingsTable.status, "active"), visible, regionalVisibility));
      res.json(rows);
      return;
    }

    const visible = await categoryVisibility();
    const parsedLimit = Math.min(isNaN(parseInt(limit)) ? 40 : parseInt(limit), 100);
    const parsedOffset = isNaN(parseInt(offset)) ? 0 : parseInt(offset);
    const regionalVisibility = listingRegionFilter(req.query.region);

    // Apply browsing criteria before LIMIT/OFFSET, across the complete database.
    const clauses: any[] = [visible, regionalVisibility, eq(listingsTable.status, "active")];
    if (sellerEmail) clauses.push(sql`LOWER(${listingsTable.sellerEmail}) = LOWER(${sellerEmail})`);
    if (q?.trim()) {
      const escaped = q.trim().slice(0, 150).replace(/[\\%_]/g, "\\    // Browse/list views only need card fields.");
      clauses.push(sql`(${listingsTable.title} ILIKE ${"%" + escaped + "%"} ESCAPE '\\' OR ${listingsTable.category} ILIKE ${"%" + escaped + "%"} ESCAPE '\\')`);
    }
    const csv = (value?: string) => value?.split(",").map(x => x.trim()).filter(Boolean).slice(0, 30) ?? [];
    const categoryValues = csv(categories).length ? csv(categories) : category && category !== "all" ? [category] : [];
    const subValues = csv(subcategories).length ? csv(subcategories) : sub ? [sub] : [];
    const thirdValues = csv(thirdLevels).length ? csv(thirdLevels) : subsub ? [subsub] : [];
    if (categoryValues.length) clauses.push(sql`LOWER(${listingsTable.category}) IN (${sql.join(categoryValues.map(x=>sql`${x.toLowerCase()}`),sql`, `)})`);
    if (subValues.length) clauses.push(sql`LOWER(${listingsTable.subcategory}) IN (${sql.join(subValues.map(x=>sql`${x.toLowerCase()}`),sql`, `)})`);
    if (thirdValues.length) clauses.push(inArray(listingsTable.subsubcategory, thirdValues));
    const conditionValues = csv(conditions);
    if (conditionValues.length) clauses.push(inArray(listingsTable.condition, conditionValues));
    if (minPrice && Number.isFinite(Number(minPrice))) clauses.push(sql`${listingsTable.price}::numeric >= ${Number(minPrice)}`);
    if (maxPrice && Number.isFinite(Number(maxPrice))) clauses.push(sql`${listingsTable.price}::numeric <= ${Number(maxPrice)}`);
    const ordering = sort === "price-asc" || sort === "price-lowest" ? sql`${listingsTable.price}::numeric ASC`
      : sort === "price-desc" ? sql`${listingsTable.price}::numeric DESC`
      : sort === "views" ? sql`${listingsTable.views} DESC` : desc(listingsTable.createdAt);

    // Browse/list views only need card fields. Avoid sending large description, tags,
    // specifications and other detail-only columns for every listing.
    const rows = await db
      .select({
        id: listingsTable.id,
        publicId: listingsTable.publicId,
        title: listingsTable.title,
        price: listingsTable.price,
        category: listingsTable.category,
        subcategory: listingsTable.subcategory,
        subsubcategory: listingsTable.subsubcategory,
        condition: listingsTable.condition,
        image: listingsTable.image,
        views: listingsTable.views,
        watchers: listingsTable.watchers,
        status: listingsTable.status,
        sellerEmail: listingsTable.sellerEmail,
        sellerName: listingsTable.sellerName,
        sellerUsername: listingsTable.sellerUsername,
        extraCategories: listingsTable.extraCategories,
        currency: listingsTable.currency,
        marketplaceRegion: sql<string | null>`CASE WHEN COALESCE(${listingsTable.specifications}, '') ~ '^\\s*\\{' THEN ${listingsTable.specifications}::jsonb->>'marketplace_region' ELSE NULL END`,
        priceGbp: listingsTable.priceGbp,
        createdAt: listingsTable.createdAt,
      })
      .from(listingsTable)
      .where(and(...clauses))
      .orderBy(ordering)
      .limit(parsedLimit)
      .offset(parsedOffset);

    const withPromos = await attachPromotions(rows);
    withPromos.sort((a, b) => promoRank(b.promotions) - promoRank(a.promotions));
    // Public browse cards change relatively infrequently; a tiny cache removes repeated
    // database work while keeping new/edited listings fresh within seconds.
    res.setHeader("Cache-Control", "public, max-age=15, stale-while-revalidate=45");
    res.json(withPromos);
  } catch (err) {
    console.error("Error fetching listings:", err);
    res.status(500).json({ error: "internal_server_error", message: String(err) });
  }
});

router.get("/listings/category-counts", async (req, res) => {
  try {
    if (req.query.region !== undefined && req.query.region !== "uk" && req.query.region !== "us") {
      res.status(400).json({ error: "Invalid marketplace region; use uk or us" });
      return;
    }
    res.setHeader("Cache-Control", "public, max-age=120");
    const regionFilter = listingRegionFilter(req.query.region);
    const demoVisibility = await categoryVisibility();
    const rows = await db.execute(sql`
      SELECT category, subcategory, COUNT(*)::int AS count
      FROM listings
      WHERE status = 'active' AND ${regionFilter ?? sql`TRUE`} AND ${demoVisibility} AND NOT EXISTS (SELECT 1 FROM site_settings cv WHERE cv.value='false' AND (cv.key='category_visible_' || listings.category OR cv.key='category_visible_' || listings.category || '__' || COALESCE(listings.subcategory,'')))
      GROUP BY category, subcategory
    `);
    res.json(rows.rows);
  } catch (err) {
    console.error("Error fetching category counts:", err);
    res.status(500).json({ error: "internal_server_error", message: String(err) });
  }
});

router.get("/listings/spotlight", async (req, res) => {
  try {
    if (req.query.region !== undefined && req.query.region !== "uk" && req.query.region !== "us") {
      res.status(400).json({ error: "Invalid marketplace region; use uk or us" });
      return;
    }
    const visible = await categoryVisibility();
    const regionFilter = listingRegionFilter(req.query.region);
    const now = new Date();
    const spotlightTypes = ["homepage-spotlight", "spotlight", "featured-badge", "featured", "premium-placement"];

    const promos = await db
      .select({ listingId: listingPromotionsTable.listingId })
      .from(listingPromotionsTable)
      .where(
        and(
          gt(listingPromotionsTable.expiresAt, now),
          inArray(listingPromotionsTable.type, spotlightTypes)
        )
      )
      .limit(100);

    if (promos.length === 0) { res.json([]); return; }
    const ids = [...new Set(promos.map(p => p.listingId))];
    const rows = await db.select().from(listingsTable).where(
      and(visible,regionFilter,eq(listingsTable.status, "active"), inArray(listingsTable.id, ids))
    );
    const withPromos = await attachPromotions(rows);
    withPromos.sort((a, b) => promoRank(b.promotions) - promoRank(a.promotions));
    res.json(withPromos);
  } catch (err) {
    console.error("Error fetching spotlight listings:", err);
    res.status(500).json({ error: "internal_server_error", message: String(err) });
  }
});

router.get("/listings/mine", async (req, res) => {
  try {
    const email = await authenticatedSellerEmail(req, res);
    if (!email) return;
    if (req.query.email && String(req.query.email).trim().toLowerCase() !== email) {
      res.status(403).json({ error: "Seller account mismatch" }); return;
    }

    // Prevent 304 Caching Issues on newly posted items
    res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
    res.setHeader("Pragma", "no-cache");
    res.setHeader("Expires", "0");

    // Keep the dashboard query limited to columns that exist in the production
    // listings table. Selecting the entire Drizzle model can fail when newly
    // modelled columns have not yet been migrated in production.
    const rows = await db
      .select({
        id: listingsTable.id,
        publicId: listingsTable.publicId,
        title: listingsTable.title,
        price: listingsTable.price,
        category: listingsTable.category,
        subcategory: listingsTable.subcategory,
        description: listingsTable.description,
        condition: listingsTable.condition,
        image: listingsTable.image,
        views: listingsTable.views,
        watchers: listingsTable.watchers,
        status: listingsTable.status,
        sellerEmail: listingsTable.sellerEmail,
        sellerName: listingsTable.sellerName,
        sellerUsername: listingsTable.sellerUsername,
        tags: listingsTable.tags,
        extraCategories: listingsTable.extraCategories,
        specifications: listingsTable.specifications,
        currency: listingsTable.currency,
        priceGbp: listingsTable.priceGbp,
        createdAt: listingsTable.createdAt,
        updatedAt: listingsTable.updatedAt,
      })
      .from(listingsTable)
      .where(sql`LOWER(${listingsTable.sellerEmail}) = LOWER(${email})`)
      .orderBy(desc(listingsTable.createdAt))
      .limit(100);
    const withPromos = await attachPromotions(rows);
    res.json(withPromos);
  } catch (err) {
    console.error("Error fetching my listings:", err);
    res.status(500).json({ error: "internal_server_error", message: String(err) });
  }
});

router.get("/listings/:id", async (req, res) => {
  try {
    const rawId = decodeURIComponent(req.params.id).trim();
    let row;
    // Public IDs can begin with digits, so always try the exact public ID first.
    // Only fall back to the numeric primary key when the whole route segment is numeric.
    [row] = await db.select({
      id: listingsTable.id, publicId: listingsTable.publicId, title: listingsTable.title,
      price: listingsTable.price, category: listingsTable.category, subcategory: listingsTable.subcategory,
      description: listingsTable.description, condition: listingsTable.condition, image: listingsTable.image,
      views: listingsTable.views, watchers: listingsTable.watchers, status: listingsTable.status,
      sellerEmail: listingsTable.sellerEmail, sellerName: listingsTable.sellerName, sellerUsername: listingsTable.sellerUsername,
      tags: listingsTable.tags, extraCategories: listingsTable.extraCategories, specifications: listingsTable.specifications,
      currency: listingsTable.currency, priceGbp: listingsTable.priceGbp,
      createdAt: listingsTable.createdAt, updatedAt: listingsTable.updatedAt,
    }).from(listingsTable).where(eq(listingsTable.publicId, rawId)).limit(1);
    if (!row && /^\\d+$/.test(rawId)) {
      [row] = await db.select({
      id: listingsTable.id, publicId: listingsTable.publicId, title: listingsTable.title,
      price: listingsTable.price, category: listingsTable.category, subcategory: listingsTable.subcategory,
      description: listingsTable.description, condition: listingsTable.condition, image: listingsTable.image,
      views: listingsTable.views, watchers: listingsTable.watchers, status: listingsTable.status,
      sellerEmail: listingsTable.sellerEmail, sellerName: listingsTable.sellerName, sellerUsername: listingsTable.sellerUsername,
      tags: listingsTable.tags, extraCategories: listingsTable.extraCategories, specifications: listingsTable.specifications,
      currency: listingsTable.currency, priceGbp: listingsTable.priceGbp,
      createdAt: listingsTable.createdAt, updatedAt: listingsTable.updatedAt,
    }).from(listingsTable).where(eq(listingsTable.id, Number(rawId))).limit(1);
    }
    if (!row) { res.status(404).json({ error: "not found" }); return; }
    const visibility = await categoryVisibility();
    const publicRow = await db.select({id:listingsTable.id}).from(listingsTable).where(and(eq(listingsTable.id,row.id),visibility)).limit(1);
    if (!publicRow.length) { res.status(404).json({ error: "Listing temporarily unavailable" }); return; }
    if (row.status !== "active") {
      const viewer = await authenticatedSellerEmail(req, res);
      if (!viewer) return;
      if (viewer !== String(row.sellerEmail).toLowerCase()) { res.status(404).json({ error: "not found" }); return; }
    }
    const [withPromo] = await attachPromotions([row]);

    let sellerVerified = false;
    try {
      const verResult = await db.execute(sql`
        SELECT verification_status FROM users WHERE email = ${row.sellerEmail}
      `);
      sellerVerified = verResult.rows[0]?.verification_status === "verified";
    } catch (err) {
      console.error("Error checking seller verification, defaulting to unverified:", err);
    }

    res.json({ ...withPromo, sellerVerified });
  } catch (err) {
    console.error("Error fetching listing:", err);
    res.status(500).json({ error: "internal_server_error", message: String(err) });
  }
});

router.post("/listings", async (req, res) => {
  try {
    const authenticatedEmail = await authenticatedSellerEmail(req, res);
    if (!authenticatedEmail) return;
    const body = req.body as Record<string, unknown>;
    
    const title = (body.title || body.name) as string;
    const price = (body.price || body.amount) as string;
    const category = (body.category || "General") as string;
    const description = (body.description || body.details || title || "No description provided") as string;
    const sellerEmail = (body.sellerEmail || body.email || req.headers["x-user-email"]) as string;

    if (typeof sellerEmail !== "string" || sellerEmail.trim().toLowerCase() !== authenticatedEmail) {
      res.status(403).json({ error: "Seller account mismatch" }); return;
    }
    console.log("POST /api/listings payload received:", { title, price, category, sellerEmail });

    if (await isBanned(sellerEmail)) {
      res.status(403).json({ error: "This account has been suspended and can't create listings." });
      return;
    }

    if (!title || !price || !sellerEmail) {
      console.error("Missing required fields:", { title, price, sellerEmail });
      res.status(400).json({ 
        error: "missing_fields", 
        message: "title, price, and sellerEmail are required.",
        received: { title: !!title, price: !!price, sellerEmail: !!sellerEmail }
      });
      return;
    }

    const condition = typeof body.condition === "string" ? body.condition : "good";
    const image = typeof body.image === "string" ? body.image : null;
    const sellerName = typeof body.sellerName === "string" ? body.sellerName : null;
    const sellerUsername = typeof body.sellerUsername === "string" ? body.sellerUsername : null;
    const subcategory = typeof body.subcategory === "string" && body.subcategory ? body.subcategory : null;
    const subsubcategory = subcategory && typeof body.subsubcategory === "string" && /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(body.subsubcategory) && body.subsubcategory.length <= 100 ? body.subsubcategory : null;
    const tags = typeof body.tags === "string" ? body.tags : null;
    const region = body.marketplaceRegion ?? body.marketplace_region;
    if (region !== "uk" && region !== "us") { res.status(400).json({ error: "Select UK or USA marketplace region" }); return; }
    const specifications = JSON.stringify({ marketplace_region: region, details: Array.isArray(body.specifications) ? body.specifications : [], draftForm: body.draftForm && typeof body.draftForm === "object" ? body.draftForm : undefined });
    const extraCategories = Array.isArray(body.extra_categories) && body.extra_categories.length
      ? JSON.stringify(body.extra_categories)
      : null;
    const currency = typeof body.currency === "string" && body.currency ? body.currency.toUpperCase() : "GBP";
    const status = body.status === "draft" ? "draft" : "active";
    const premiumVideo = body.premiumVideo === true;
    const shipOrigin = typeof body.shipOrigin === "string" ? body.shipOrigin.slice(0, 80) : null;
    const shipOriginOther = typeof body.shipOriginOther === "string" ? body.shipOriginOther.slice(0, 120) : null;
    const shipZone = typeof body.shipZone === "string" ? body.shipZone.slice(0, 80) : null;
    const carrier = typeof body.carrier === "string" ? body.carrier.slice(0, 80) : null;
    const shippingPrice = body.shippingPrice != null && Number.isFinite(Number(body.shippingPrice)) ? String(body.shippingPrice) : null;
    const handlingCharge = body.handlingCharge != null && Number.isFinite(Number(body.handlingCharge)) ? String(body.handlingCharge) : null;
    const quantity = body.quantity != null && Number.isFinite(Number(body.quantity)) ? Math.max(0, Math.floor(Number(body.quantity))) : null;
    const sku = typeof body.sku === "string" ? body.sku.slice(0, 120) : null;

    // Product Video is priced in credits and controlled by Admin → Promotions.
    // Validate the balance before creating the listing so a failed add-on cannot create duplicates.
    let productVideoConfig: Awaited<ReturnType<typeof getPromoConfig>> = null;
    if (premiumVideo && status === "active") {
      productVideoConfig = await getPromoConfig("product-video");
      if (!productVideoConfig || !productVideoConfig.enabled) {
        res.status(400).json({ error: "Product Video is not currently available." });
        return;
      }
      const balance = await storage.getCredits(sellerEmail);
      if (balance < productVideoConfig.cost) {
        res.status(402).json({ error: "Insufficient credits", message: `Product Video costs ${Math.round(productVideoConfig.cost * 100)} credits.`, balance: Math.round(Number(balance) * 100), required: Math.round(productVideoConfig.cost * 100) });
        return;
      }
    }

    let priceGbp: string | null = null;
    try {
      priceGbp = (await toGbp(parseFloat(price), currency)).toFixed(2);
    } catch {
      priceGbp = String(price);
    }

    const [inserted] = await db
      .insert(listingsTable)
      .values({ 
        title, 
        price: String(price), 
        category, 
        subcategory, 
        subsubcategory,
        description, 
        condition, 
        image, 
        sellerEmail, 
        sellerName, 
        sellerUsername, 
        tags, 
        extraCategories, 
        specifications, 
        currency, 
        priceGbp,
        shipOrigin,
        shipOriginOther,
        shipZone,
        carrier,
        shippingPrice,
        handlingCharge,
        quantity,
        sku,
        status 
      })
      .returning();

    const publicId = makePublicId(inserted.id);
    const [listing] = await db
      .update(listingsTable)
      .set({ publicId })
      .where(eq(listingsTable.id, inserted.id))
      .returning();

    console.log("Listing successfully created:", listing.id);

    if (status === "active" && premiumVideo && productVideoConfig) {
      const newBalance = await storage.addCredits(sellerEmail, -productVideoConfig.cost);
      await recordCreditEconomy({ email: sellerEmail, kind: "spent", credits: -productVideoConfig.cost, reason: "Product Video", referenceType: "product_video" });
      const expiresAt = new Date();
      expiresAt.setFullYear(expiresAt.getFullYear() + 10);
      await db.insert(listingPromotionsTable).values({ listingId: listing.id, type: "product-video", expiresAt });
      void sendSystemMessage(sellerEmail, { category: "Listings", subject: "Product Video added", body: `Product Video was added to “${listing.title}” for ${Math.round(productVideoConfig.cost * 100)} credits. Your new balance is ${Math.round(Number(newBalance) * 100)} credits.` });
    }

    // First listing ever posted by this seller completes the "First
    // Listing" milestone. Safe to call on every post — completeMilestone()
    // never un-completes it.
    if (status === "active") storage.completeMilestone(sellerEmail, "first-listing").catch((err) => {
      console.error("Failed to record first-listing milestone:", err);
    });

    // Active Lister (5/month) and Inventory Master (20/month)
    if (status === "active") void refreshSellerMilestones(sellerEmail);
    if (status === "active") void sendSystemMessage(sellerEmail, {
      category: "Listings",
      subject: "Your listing is live",
      body:
        `Your item "${(listing as { title?: string }).title ?? "your item"}" has been listed on Bazunk.\n\n` +
        "Tip: you can promote it with credits to reach more buyers.",
    });

    if (status === 'active') void awardReferralMilestone(sellerEmail, 'seller');
    res.status(201).json({ ...listing, promotions: [] });

  } catch (err) {
    console.error("Error creating listing:", err);
    res.status(500).json({ error: "internal_server_error", message: String(err) });
  }
});

router.patch("/listings/:id", async (req, res) => {
  try {
    const authenticatedEmail = await authenticatedSellerEmail(req, res);
    if (!authenticatedEmail) return;
    const id = parseInt(req.params.id);
    const { email } = req.query as Record<string, string>;
    if (!email || email.trim().toLowerCase() !== authenticatedEmail) { res.status(403).json({ error: "Seller account mismatch" }); return; }
    const body = req.body as Record<string, unknown>;
    const allowed = ["title", "price", "description", "condition", "category", "subcategory", "subsubcategory", "image", "status", "currency", "specifications", "tags"] as const;
    const updates: Partial<Record<typeof allowed[number] | "extraCategories", string>> = {};
    for (const key of allowed) {
      if (typeof body[key] === "string") updates[key] = body[key] as string;
    }

    if (typeof body.subsubcategory === "string" && body.subsubcategory !== "" && !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(body.subsubcategory)) { res.status(400).json({ error: "Invalid third-level category slug" }); return; }
    if (body.subsubcategory === null || body.subsubcategory === "") (updates as Record<string, string | null>).subsubcategory = null;
    if (Array.isArray(body.extra_categories)) {
      updates.extraCategories = body.extra_categories.length ? JSON.stringify(body.extra_categories) : "";
    }
    if (body.marketplaceRegion !== undefined || body.marketplace_region !== undefined || body.draftForm !== undefined) {
      const region = body.marketplaceRegion ?? body.marketplace_region;
      if (region !== "uk" && region !== "us") { res.status(400).json({ error: "Invalid region" }); return; }
      updates.specifications = JSON.stringify({ marketplace_region: region, details: Array.isArray(body.specifications) ? body.specifications : [], draftForm: body.draftForm && typeof body.draftForm === "object" ? body.draftForm : undefined });
    }
    if (updates.status && !["draft", "active", "inactive", "sold"].includes(updates.status)) { res.status(400).json({ error: "Invalid listing status" }); return; }
    if (Object.keys(updates).length === 0) { res.status(400).json({ error: "no fields to update" }); return; }

    if (updates.price || updates.currency) {
      const [current] = await db.select({ price: listingsTable.price, currency: listingsTable.currency })
        .from(listingsTable).where(eq(listingsTable.id, id)).limit(1);
      if (current) {
        const price = updates.price ?? current.price;
        const currency = (updates.currency ?? current.currency ?? "GBP").toUpperCase();
        try {
          (updates as Record<string, string>).priceGbp = (await toGbp(parseFloat(price), currency)).toFixed(2);
        } catch { /* keep existing */ }
      }
    }

    const updated = await db
      .update(listingsTable)
      .set(updates)
      .where(and(eq(listingsTable.id, id), sql`LOWER(${listingsTable.sellerEmail}) = LOWER(${email})`))
      .returning();
    if (updated.length === 0) { res.status(404).json({ error: "Listing not found or not yours" }); return; }
    res.json(updated[0]);
  } catch (err) {
    console.error("Error updating listing:", err);
    res.status(500).json({ error: "internal_server_error", message: String(err) });
  }
});

router.delete("/listings/:id", async (req, res) => {
  try {
    const authenticatedEmail = await authenticatedSellerEmail(req, res);
    if (!authenticatedEmail) return;
    const id = parseInt(req.params.id);
    const { email } = req.query as Record<string, string>;
    if (!email || email.trim().toLowerCase() !== authenticatedEmail) {
      res.status(403).json({ error: "Seller account mismatch" });
      return;
    }
    const deleted = await db
      .delete(listingsTable)
      .where(and(eq(listingsTable.id, id), eq(listingsTable.sellerEmail, email)))
      .returning();
    if (deleted.length === 0) {
      res.status(404).json({ error: "Listing not found or not yours" });
      return;
    }
    res.json({ success: true });
  } catch (err) {
    console.error("Error deleting listing:", err);
    res.status(500).json({ error: "internal_server_error", message: String(err) });
  }
});

router.patch("/listings/seller-name", async (req, res) => {
  try {
    const auth = getAuth(req);
    if (!auth.isAuthenticated || !auth.userId) { res.status(401).json({ error: "Sign in required" }); return; }
    const clerkUser = await clerkClient.users.getUser(auth.userId);
    const email = clerkUser.primaryEmailAddress?.emailAddress?.toLowerCase();
    if (!email) { res.status(400).json({ error: "Account email not found" }); return; }

    const { name, username } = req.body as { name?: string; username?: string };
    const cleanName = typeof name === "string" ? name.trim().slice(0, 120) : "";
    const cleanUsername = typeof username === "string" ? username.trim().replace(/^@/, "") : "";
    if (!/^[A-Za-z0-9._-]{3,30}$/.test(cleanUsername)) {
      res.status(400).json({ error: "Username must be 3–30 characters using letters, numbers, dots, underscores or hyphens." }); return;
    }
    const taken = await db.execute(sql`SELECT 1 FROM users WHERE LOWER(username)=LOWER(${cleanUsername}) AND LOWER(email)<>LOWER(${email}) LIMIT 1`);
    if (taken.rows.length) { res.status(409).json({ error: "That username is already taken." }); return; }

    await db.execute(sql`UPDATE users SET username=${cleanUsername}, name=COALESCE(NULLIF(${cleanName}, ''), name) WHERE LOWER(email)=LOWER(${email})`);
    // Retrospective privacy fix: every existing selling surface is updated to the chosen public username.
    await db.execute(sql`UPDATE listings SET seller_username=${cleanUsername} WHERE LOWER(seller_email)=LOWER(${email})`);
    await db.execute(sql`UPDATE auctions SET seller_name=${cleanUsername} WHERE LOWER(seller_email)=LOWER(${email})`);
    await db.execute(sql`UPDATE flash_sales SET seller_username=${cleanUsername}, seller_name=${cleanUsername} WHERE LOWER(seller_email)=LOWER(${email})`);
    res.json({ success: true, username: cleanUsername });
  } catch (err: any) {
    if (String(err?.code) === "23505") { res.status(409).json({ error: "That username is already taken." }); return; }
    res.status(500).json({ error: "Failed to update seller profile" });
  }
});


// ── Account profile + first-dashboard onboarding ───────────────────────────
async function authenticatedEmail(req: any): Promise<string | null> {
  const auth = getAuth(req);
  if (!auth.isAuthenticated || !auth.userId) return null;
  const clerkUser = await clerkClient.users.getUser(auth.userId);
  return clerkUser.primaryEmailAddress?.emailAddress?.toLowerCase() ?? null;
}

// Seller-owned compliance cases and text evidence; identity is always taken from Clerk.
router.get("/listings/seller-compliance/me", async(req,res)=>{
  try {
    const email=await authenticatedEmail(req);
    if(!email){res.status(401).json({error:"Sign in required"});return;}
    const result=await db.execute(sql`SELECT id,status,risk_band,opened_at,updated_at FROM seller_compliance_cases
      WHERE LOWER(seller_email)=LOWER(${email}) ORDER BY opened_at DESC LIMIT 20`);
    res.setHeader("Cache-Control","no-store");res.json({cases:result.rows});
  }catch(err){console.error("Seller compliance cases failed",err);res.status(503).json({error:"Compliance cases unavailable"});}
});

router.post("/listings/seller-compliance/:id/evidence",async(req,res)=>{
  try{
    const email=await authenticatedEmail(req);
    if(!email){res.status(401).json({error:"Sign in required"});return;}
    const id=Number(req.params.id),explanation=String(req.body?.explanation||"").trim();
    if(!Number.isSafeInteger(id)||id<1||explanation.length<20||explanation.length>5000){
      res.status(400).json({error:"Provide an explanation between 20 and 5000 characters."});return;
    }
    const own=await db.execute(sql`SELECT id FROM seller_compliance_cases WHERE id=${id}
      AND LOWER(seller_email)=LOWER(${email}) AND status<>'resolved'`);
    if(!own.rows.length){res.status(404).json({error:"Active case not found"});return;}
    await db.execute(sql`INSERT INTO seller_compliance_events(case_id,actor_type,actor_id,action,details)
      VALUES(${id},'seller',${email},'evidence_submitted',${JSON.stringify({explanation})}::jsonb)`);
    await db.execute(sql`UPDATE seller_compliance_cases SET status='under_review',updated_at=NOW() WHERE id=${id}`);
    void sendSystemMessage(email,{category:"Seller Compliance",subject:"Evidence received",body:`Your evidence for seller compliance case #${id} has been received for review.`});
    res.json({success:true});
  }catch(err){console.error("Seller compliance evidence failed",err);res.status(503).json({error:"Could not submit evidence"});}
});

router.post("/listings/seller-compliance/:id/appeal",async(req,res)=>{
  try{
    const email=await authenticatedEmail(req);
    if(!email){res.status(401).json({error:"Sign in required"});return;}
    const id=Number(req.params.id),explanation=String(req.body?.explanation||"").trim();
    if(!Number.isSafeInteger(id)||id<1||explanation.length<20||explanation.length>5000){
      res.status(400).json({error:"Provide an appeal explanation between 20 and 5000 characters."});return;
    }
    const own=await db.execute(sql`SELECT id FROM seller_compliance_cases WHERE id=${id}
      AND LOWER(seller_email)=LOWER(${email})`);
    if(!own.rows.length){res.status(404).json({error:"Case not found"});return;}
    const existing=await db.execute(sql`SELECT id FROM seller_compliance_appeals WHERE case_id=${id} AND status='pending' LIMIT 1`);
    if(existing.rows.length){res.status(409).json({error:"An appeal is already pending"});return;}
    await db.execute(sql`INSERT INTO seller_compliance_appeals(case_id,seller_email,explanation)
      VALUES(${id},${email},${explanation})`);
    await db.execute(sql`UPDATE seller_compliance_cases SET status='appealed',updated_at=NOW() WHERE id=${id}`);
    void sendSystemMessage(email,{category:"Seller Compliance",subject:"Appeal received",body:`Your appeal for seller compliance case #${id} has been received and is pending review.`});
    res.json({success:true});
  }catch(err){console.error("Seller compliance appeal failed",err);res.status(503).json({error:"Could not submit appeal"});}
});

router.get("/listings/profile/me", async (req, res) => {
  try {
    const email = await authenticatedEmail(req);
    if (!email) { res.status(401).json({ error: "Sign in required" }); return; }
    await db.execute(sql`INSERT INTO users (id,email,credits) VALUES (${email},${email},0.50) ON CONFLICT (email) DO NOTHING`);
    const r = await db.execute(sql`
      SELECT email,name,username,phone,address_line1,address_line2,city,postcode,country,
             seller_type,notification_preferences,onboarding_step,onboarding_completed
      FROM users WHERE LOWER(email)=LOWER(${email}) LIMIT 1
    `);
    res.json(r.rows[0]);
  } catch (err) {
    console.error("profile/me failed", err);
    res.status(500).json({ error: "Failed to load profile" });
  }
});

router.patch("/listings/profile/me", async (req, res) => {
  try {
    const email = await authenticatedEmail(req);
    if (!email) { res.status(401).json({ error: "Sign in required" }); return; }
    // PATCH may be the first profile request after sign-up. Ensure the local
    // marketplace user exists instead of relying on the preceding GET having run.
    await db.execute(sql`INSERT INTO users (id,email,credits) VALUES (${email},${email},0.50) ON CONFLICT (email) DO NOTHING`);

    const b = req.body ?? {};
    const cleanName = typeof b.name === "string" ? b.name.trim().slice(0,120) : null;
    const cleanUsername = typeof b.username === "string" ? b.username.trim().replace(/^@/,"") : null;
    if (cleanUsername !== null && !/^[A-Za-z0-9._-]{3,30}$/.test(cleanUsername)) {
      res.status(400).json({ error: "Username must be 3–30 characters using letters, numbers, dots, underscores or hyphens." }); return;
    }
    if (cleanUsername) {
      const taken = await db.execute(sql`SELECT 1 FROM users WHERE LOWER(username)=LOWER(${cleanUsername}) AND LOWER(email)<>LOWER(${email}) LIMIT 1`);
      if (taken.rows.length) { res.status(409).json({ error: "That username is already taken." }); return; }
    }
    const phone = typeof b.phone === "string" ? b.phone.trim().slice(0,40) : null;
    const a1 = typeof b.addressLine1 === "string" ? b.addressLine1.trim().slice(0,180) : null;
    const a2 = typeof b.addressLine2 === "string" ? b.addressLine2.trim().slice(0,180) : null;
    const city = typeof b.city === "string" ? b.city.trim().slice(0,100) : null;
    const postcode = typeof b.postcode === "string" ? b.postcode.trim().slice(0,30) : null;
    const country = typeof b.country === "string" ? b.country.trim().slice(0,80) : null;
    const sellerType = ["private","sole_trader","business"].includes(b.sellerType) ? b.sellerType : null;
    // Self-service cannot downgrade an established commercial account to private.
    // The admin review workflow must handle that request with an audit trail.
    if (b.sellerType !== undefined && sellerType === null) {
      res.status(400).json({ error: "Invalid seller classification." }); return;
    }
    if (sellerType === "private") {
      const current = await db.execute(sql`SELECT seller_type FROM users WHERE LOWER(email)=LOWER(${email}) LIMIT 1`);
      const existing = String((current.rows[0] as any)?.seller_type ?? "private");
      if (existing === "business" || existing === "sole_trader") {
        res.status(409).json({ error: "Business-to-private changes require a seller compliance review. Contact Bazunk support." }); return;
      }
    }
    // Record explicit seller declarations independently of profile preferences.
    // Fail closed if declaration persistence is unavailable.
    if (sellerType !== null) {
      if (b.sellerDeclarationAccepted !== true || b.sellerDeclarationVersion !== "2026-10-11-v1") {
        res.status(400).json({ error: "Accept the current seller declaration before selecting an account type." }); return;
      }
      await db.execute(sql`CREATE TABLE IF NOT EXISTS seller_declarations (
        id BIGSERIAL PRIMARY KEY, seller_email TEXT NOT NULL,
        declared_type TEXT NOT NULL CHECK (declared_type IN ('private','sole_trader','business')),
        declaration_version TEXT NOT NULL, declared_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        source TEXT NOT NULL DEFAULT 'seller_onboarding'
      )`);
      await db.execute(sql`INSERT INTO seller_declarations(seller_email,declared_type,declaration_version,source)
        VALUES(${email},${sellerType},${"2026-10-11-v1"},${"seller_onboarding"})`);
    }
    const step = Number.isInteger(b.onboardingStep) ? Math.max(1,Math.min(6,b.onboardingStep)) : null;
    const completed = b.onboardingCompleted === true ? true : null;
    const prefs = b.notificationPreferences && typeof b.notificationPreferences === "object" ? b.notificationPreferences : null;

    // JSON is stringified and cast server-side so it is never interpolated as SQL text.
    const prefsJson = prefs ? JSON.stringify({
      orders: prefs.orders !== false,
      offers: prefs.offers !== false,
      messages: prefs.messages !== false,
      promotions: prefs.promotions === true,
    }) : null;
    await db.execute(sql`UPDATE users SET
      name=COALESCE(${cleanName},name), username=COALESCE(${cleanUsername},username), phone=COALESCE(${phone},phone),
      address_line1=COALESCE(${a1},address_line1), address_line2=COALESCE(${a2},address_line2), city=COALESCE(${city},city),
      postcode=COALESCE(${postcode},postcode), country=COALESCE(${country},country), seller_type=COALESCE(${sellerType},seller_type),
      notification_preferences=COALESCE(${prefsJson}::jsonb,notification_preferences),
      onboarding_step=COALESCE(${step},onboarding_step), onboarding_completed=COALESCE(${completed},onboarding_completed)
      WHERE LOWER(email)=LOWER(${email})`);
    // The profile update above is authoritative. Older deployments can have
    // different optional seller-name columns on individual selling surfaces.
    // Propagate retrospectively where supported, but never make onboarding fail
    // because a legacy table/column is absent.
    if (cleanUsername) {
      const propagate = async (query: any, surface: string) => {
        try {
          await db.execute(query);
        } catch (propagationError) {
          console.warn(`profile username propagation skipped for ${surface}`, propagationError);
        }
      };
      await propagate(sql`UPDATE listings SET seller_username=${cleanUsername} WHERE LOWER(seller_email)=LOWER(${email})`, "listings");
      await propagate(sql`UPDATE auctions SET seller_name=${cleanUsername} WHERE LOWER(seller_email)=LOWER(${email})`, "auctions");
      await propagate(sql`UPDATE flash_sales SET seller_username=${cleanUsername}, seller_name=${cleanUsername} WHERE LOWER(seller_email)=LOWER(${email})`, "flash_sales");
    }
    const out = await db.execute(sql`SELECT name,username,phone,address_line1,address_line2,city,postcode,country,seller_type,notification_preferences,onboarding_step,onboarding_completed FROM users WHERE LOWER(email)=LOWER(${email}) LIMIT 1`);
    res.json(out.rows[0] ?? { success:true });
  } catch (err: any) {
    if (String(err?.code)==="23505") { res.status(409).json({ error:"That username is already taken." }); return; }
    console.error("profile/me update failed", err);
    res.status(500).json({ error:"Failed to save profile" });
  }
});

export default router;
