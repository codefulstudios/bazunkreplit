import { validateClassifiedBatch } from "./classifiedImportValidation.mjs";
import { Router } from "express";
import { db, classifiedAdsTable } from "@workspace/db";
import { eq, desc, and, ilike, or, sql } from "drizzle-orm";
import { requireAdmin } from "../middlewares/adminAuth.js";

const router = Router();

router.get("/classifieds", async (req, res) => {
  const { category, subcategory, type, region, limit = "60", offset = "0" } = req.query as Record<string, string>;

  if (region !== undefined && region !== "uk" && region !== "us") {
    res.status(400).json({ error: "Invalid marketplace region; use uk or us" });
    return;
  }

  const conditions = [eq(classifiedAdsTable.status, "active"), sql`NOT EXISTS (SELECT 1 FROM site_settings cv WHERE cv.value='false' AND (cv.key='category_visible_' || ${classifiedAdsTable.category} OR cv.key='category_visible_' || ${classifiedAdsTable.category} || '__' || COALESCE(${classifiedAdsTable.subcategory},'')))`];
  if (region === "uk" || region === "us") conditions.push(eq(classifiedAdsTable.marketplaceRegion, region));
  if (category && category !== "all") conditions.push(eq(classifiedAdsTable.category, category));
  if (subcategory) conditions.push(eq(classifiedAdsTable.subcategory, subcategory));
  if (type && type !== "all") conditions.push(eq(classifiedAdsTable.type, type));

  const rows = await db
    .select()
    .from(classifiedAdsTable)
    .where(and(...conditions))
    .orderBy(desc(classifiedAdsTable.postedAt))
    .limit(parseInt(limit))
    .offset(parseInt(offset));

  res.json(rows);
});

router.post("/classifieds", async (req, res) => {
  const {
    title, description, category, subcategory, type,
    price, priceLabel, negotiable, condition,
    location, contactName, contactEmail, contactPhone,
    urgency, photos, externalLink, expiresAt, marketplaceRegion,
  } = req.body as Record<string, unknown>;

  if (marketplaceRegion !== "uk" && marketplaceRegion !== "us") { res.status(400).json({ error: "Choose UK or USA / Canada marketplace" }); return; }
  if (!title || typeof title !== "string" || !title.trim()) {
    res.status(400).json({ error: "title is required" }); return;
  }
  if (!description || typeof description !== "string" || !description.trim()) {
    res.status(400).json({ error: "description is required" }); return;
  }
  if (!category || typeof category !== "string") {
    res.status(400).json({ error: "category is required" }); return;
  }
  if (!location || typeof location !== "string" || !location.trim()) {
    res.status(400).json({ error: "location is required" }); return;
  }
  if (!contactName || typeof contactName !== "string" || !contactName.trim()) {
    res.status(400).json({ error: "contactName is required" }); return;
  }

  const [row] = await db
    .insert(classifiedAdsTable)
    .values({
      marketplaceRegion,
      title: (title as string).trim(),
      description: (description as string).trim(),
      category: category as string,
      subcategory: subcategory ? String(subcategory) : null,
      type: (type as string) ?? "offer",
      price: price != null ? String(price) : null,
      priceLabel: priceLabel ? String(priceLabel) : null,
      negotiable: Boolean(negotiable),
      condition: condition ? String(condition) : null,
      location: (location as string).trim(),
      contactName: (contactName as string).trim(),
      contactEmail: contactEmail ? String(contactEmail) : null,
      contactPhone: contactPhone ? String(contactPhone) : null,
      urgency: urgency ? String(urgency) : null,
      photos: Array.isArray(photos) ? JSON.stringify(photos) : null,
      externalLink: externalLink ? String(externalLink) : null,
      expiresAt: expiresAt ? new Date(String(expiresAt)) : null,
    })
    .returning();

  res.status(201).json(row);
});

router.delete("/classifieds/:id", async (req, res) => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) { res.status(400).json({ error: "invalid id" }); return; }
  await db
    .update(classifiedAdsTable)
    .set({ status: "deleted" })
    .where(eq(classifiedAdsTable.id, id));
  res.json({ ok: true });
});

// ── Admin routes ─────────────────────────────────────────────────

router.get("/admin/classifieds", requireAdmin, async (req, res) => {
  const { limit = "50", offset = "0", search, region } = req.query as Record<string, string>;
  if (region !== undefined && region !== "uk" && region !== "us") {
    res.status(400).json({ error: "Invalid marketplace region; use uk or us" }); return;
  }
  const lim = Math.min(parseInt(limit) || 50, 200);
  const off = parseInt(offset) || 0;

  const conditions = [eq(classifiedAdsTable.status, "active")];
  if (region) conditions.push(eq(classifiedAdsTable.marketplaceRegion, region));
  if (search?.trim()) {
    conditions.push(
      or(
        ilike(classifiedAdsTable.title, `%${search}%`),
        ilike(classifiedAdsTable.location, `%${search}%`),
        ilike(classifiedAdsTable.contactName, `%${search}%`),
      )!,
    );
  }

  const [rows, [{ count }]] = await Promise.all([
    db.select().from(classifiedAdsTable).where(and(...conditions))
      .orderBy(desc(classifiedAdsTable.postedAt)).limit(lim).offset(off),
    db.select({ count: sql<number>`count(*)::int` }).from(classifiedAdsTable).where(and(...conditions)),
  ]);

  res.json({ ads: rows, total: count ?? 0 });
});

router.post("/admin/classifieds/batch-import", requireAdmin, async (req, res) => {
  const { ads } = req.body as { ads?: unknown[] };
  const validation = validateClassifiedBatch(ads);
  if (!validation.ok) {
    res.status(validation.status).json({ error: validation.error, ...("invalidCount" in validation ? { invalidCount: validation.invalidCount } : {}) });
    return;
  }
  type AdInput = Record<string, unknown>;
  const valid: typeof classifiedAdsTable.$inferInsert[] = (ads as AdInput[])
    .filter(a => a.title && a.description && a.category && a.location && a.contactName)
    .map(a => ({
      marketplaceRegion: a.marketplaceRegion as "uk" | "us",
      title:       String(a.title).trim(),
      description: String(a.description).trim(),
      category:    String(a.category),
      subcategory: a.subcategory ? String(a.subcategory) : null,
      type:        (a.type as string) === "wanted" ? "wanted" : "offer",
      price:       a.price != null ? String(a.price) : null,
      priceLabel:  a.priceLabel ? String(a.priceLabel) : null,
      negotiable:  Boolean(a.negotiable),
      condition:   a.condition ? String(a.condition) : null,
      location:    String(a.location).trim(),
      contactName: String(a.contactName).trim(),
      contactEmail:null,
      contactPhone:a.contactPhone ? String(a.contactPhone) : null,
      urgency:     null,
      photos:      null,
      externalLink:a.externalLink ? String(a.externalLink) : null,
    }));

  if (valid.length !== ads.length) {
    res.status(400).json({ error: "Every ad must contain title, description, category, location and contactName", invalidCount: ads.length - valid.length }); return;
  }

  if (valid.length === 0) {
    res.status(400).json({ error: "No valid ads in payload (need title, description, category, location, contactName)" }); return;
  }

  await db.insert(classifiedAdsTable).values(valid);
  req.log.info({ imported: valid.length }, "admin batch-imported classifieds");
  res.status(201).json({ imported: valid.length });
});

router.delete("/admin/classifieds/:id", requireAdmin, async (req, res) => {
  const id = parseInt(String(req.params.id));
  if (isNaN(id)) { res.status(400).json({ error: "invalid id" }); return; }
  await db.update(classifiedAdsTable).set({ status: "deleted" }).where(eq(classifiedAdsTable.id, id));
  res.json({ ok: true });
});

export default router;
