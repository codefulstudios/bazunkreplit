import { Router } from "express";
import { db } from "@workspace/db";
import { sql } from "drizzle-orm";
import { requireAdmin } from "../middlewares/adminAuth.js";

const router = Router();
const validRegion = (v: unknown) => v === "uk" || v === "us";
async function ensureTables() {
  await db.execute(sql`CREATE TABLE IF NOT EXISTS demo_creator_settings (key TEXT PRIMARY KEY, enabled BOOLEAN NOT NULL DEFAULT FALSE)`);
  await db.execute(sql`CREATE TABLE IF NOT EXISTS demo_listing_registry (
    listing_id INTEGER PRIMARY KEY REFERENCES listings(id) ON DELETE CASCADE,
    seller_email TEXT NOT NULL,
    region TEXT NOT NULL CHECK(region IN ('uk','us')),
    enabled BOOLEAN NOT NULL DEFAULT TRUE,
    source_url TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )`);
}
router.use("/admin/demo-creator", requireAdmin);
router.get("/admin/demo-creator", async (_req, res) => {
  try {
    await ensureTables();
    const [listings, settings] = await Promise.all([
      db.execute(sql`SELECT d.*,l.title,l.price,l.status FROM demo_listing_registry d JOIN listings l ON l.id=d.listing_id ORDER BY d.created_at DESC LIMIT 500`),
      db.execute(sql`SELECT key,enabled FROM demo_creator_settings`)
    ]);
    res.setHeader("Cache-Control", "no-store");
    res.json({ listings: listings.rows, settings: settings.rows });
  } catch { res.status(503).json({ error: "Demo Creator database unavailable" }); }
});
router.post("/admin/demo-creator/settings", async (req, res) => {
  const { key, enabled } = req.body ?? {};
  if (!["master","listings","reviews","sales","repeat_buyers"].includes(key) || typeof enabled !== "boolean") {
    res.status(400).json({ error: "Invalid setting" }); return;
  }
  try {
    await ensureTables();
    await db.execute(sql`INSERT INTO demo_creator_settings(key,enabled) VALUES (${key},${enabled})
      ON CONFLICT(key) DO UPDATE SET enabled=EXCLUDED.enabled`);
    res.json({ key, enabled });
  } catch { res.status(503).json({ error: "Unable to update setting" }); }
});
router.post("/admin/demo-creator/listings", async (req, res) => {
  const { sellerEmail, region, title, description, category, price, image, condition } = req.body ?? {};
  const amount = Number(price);
  if (typeof sellerEmail !== "string" || !sellerEmail.includes("@") || !validRegion(region) ||
      typeof title !== "string" || !title.trim() || title.length > 180 ||
      typeof description !== "string" || !description.trim() ||
      typeof category !== "string" || !category.trim() ||
      !Number.isFinite(amount) || amount <= 0 || amount > 1000000 ||
      (image != null && (typeof image !== "string" || !/^https:\/\//.test(image)))) {
    res.status(400).json({ error: "Invalid demo listing" }); return;
  }
  try {
    await ensureTables();
    const account = await db.execute(sql`SELECT email FROM users WHERE LOWER(email)=LOWER(${sellerEmail}) LIMIT 1`);
    if (!account.rows.length) { res.status(404).json({ error: "Seller account not found" }); return; }
    const email = String(account.rows[0].email);
    const currency = region === "uk" ? "GBP" : "USD";
    // Both records are created atomically. No simulated order or payment is generated.
    const result = await db.transaction(async tx => {
      const created = await tx.execute(sql`INSERT INTO listings
        (title,description,category,price,condition,image,seller_email,currency,status,specifications,quantity)
        VALUES (${title.trim()},${description.trim()},${category.trim()},${amount.toFixed(2)},
          ${condition || "good"},${image || null},${email},${currency},'active',
          ${JSON.stringify({ marketplace_region: region, demo_creator: true })},1)
        RETURNING id`);
      const id = Number(created.rows[0].id);
      await tx.execute(sql`INSERT INTO demo_listing_registry(listing_id,seller_email,region) VALUES (${id},${email},${region})`);
      return id;
    });
    res.status(201).json({ listingId: result });
  } catch { res.status(503).json({ error: "Unable to create demo listing" }); }
});
router.patch("/admin/demo-creator/listings/:id", async (req,res) => {
  const id = Number(req.params.id);
  if (!Number.isSafeInteger(id) || id < 1 || typeof req.body?.enabled !== "boolean") {
    res.status(400).json({ error: "Invalid listing or visibility" }); return;
  }
  try {
    await ensureTables();
    const r = await db.execute(sql`UPDATE demo_listing_registry SET enabled=${req.body.enabled} WHERE listing_id=${id} RETURNING listing_id`);
    if (!r.rows.length) { res.status(404).json({ error: "Demo listing not found" }); return; }
    res.json({ listingId:id, enabled:req.body.enabled });
  } catch { res.status(503).json({ error: "Unable to update listing" }); }
});
router.post("/admin/demo-creator/listings/batch-delete", async (req,res) => {
  const ids = req.body?.ids;
  if (!Array.isArray(ids) || ids.length < 1 || ids.length > 200 ||
      !ids.every((id: unknown) => Number.isSafeInteger(id) && (id as number) > 0)) {
    res.status(400).json({ error: "Provide 1–200 valid listing IDs" }); return;
  }
  try {
    await ensureTables();
    const removed = await db.transaction(async tx => {
      const found = await tx.execute(sql`SELECT listing_id FROM demo_listing_registry WHERE listing_id IN (${sql.join(ids.map((id:number)=>sql`${id}`),sql`,`)}) FOR UPDATE`);
      const safeIds = found.rows.map(r=>Number(r.listing_id));
      if (!safeIds.length) return 0;
      await tx.execute(sql`DELETE FROM listings WHERE id IN (${sql.join(safeIds.map(id=>sql`${id}`),sql`,`)})`);
      return safeIds.length;
    });
    res.json({ deleted:removed });
  } catch { res.status(503).json({ error: "Unable to delete demo listings" }); }
});
export default router;
