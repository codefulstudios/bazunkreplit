import { Router } from "express";
import { db } from "@workspace/db";
import { sql } from "drizzle-orm";
import { requireAdmin } from "../middlewares/adminAuth.js";

const router = Router();
const validRegion = (v: unknown) => v === "uk" || v === "us";
async function ensureTables() {
  await db.execute(sql`CREATE TABLE IF NOT EXISTS demo_creator_settings (key TEXT PRIMARY KEY, enabled BOOLEAN NOT NULL DEFAULT FALSE)`);
  await db.execute(sql`CREATE TABLE IF NOT EXISTS demo_activity_fixtures (
    id BIGSERIAL PRIMARY KEY,
    seller_email TEXT NOT NULL,
    kind TEXT NOT NULL CHECK (kind IN ('review','sale','repeat_buyer')),
    rating INTEGER CHECK (rating BETWEEN 1 AND 5),
    note TEXT,
    quantity INTEGER NOT NULL DEFAULT 1 CHECK (quantity BETWEEN 1 AND 100),
    enabled BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )`);
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
    // Repair only generated demo rows without an image; never touch real listings.
    await db.execute(sql`UPDATE listings l SET image =
      'https://placehold.co/640x480/e8edf7/334155.png?text=' ||
      replace(replace(l.title, ' ', '+'), '&', '%26') || '+-+Demo'
      FROM demo_listing_registry d
      WHERE d.listing_id=l.id AND (l.image IS NULL OR l.image='')`);
    const [listings, settings, activities] = await Promise.all([
      db.execute(sql`SELECT d.*,l.title,l.price,l.status FROM demo_listing_registry d JOIN listings l ON l.id=d.listing_id WHERE l.status <> 'deleted' ORDER BY d.created_at DESC LIMIT 500`),
      db.execute(sql`SELECT key,enabled FROM demo_creator_settings`),
      db.execute(sql`SELECT * FROM demo_activity_fixtures ORDER BY created_at DESC LIMIT 500`)
    ]);
    res.setHeader("Cache-Control", "no-store");
    res.json({ listings: listings.rows, settings: settings.rows, activities: activities.rows });
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
// URL preview deliberately does not fetch arbitrary external hosts (SSRF).
// Admin can review and edit the inferred title before creating the listing.
router.post("/admin/demo-creator/url-preview", async (req,res) => {
  try {
    const raw=req.body?.url;
    if(typeof raw!=="string" || raw.length>2048) {res.status(400).json({error:"Valid product URL required"});return;}
    const url=new URL(raw);
    if(url.protocol!=="https:" || url.username || url.password ||
      !/^[a-z0-9.-]+\.[a-z]{2,}$/i.test(url.hostname) ||
      /^(localhost|.*\.localhost|.*\.local)$/i.test(url.hostname)) {
      res.status(400).json({error:"Public HTTPS product URL required"});return;
    }
    const slug=decodeURIComponent(url.pathname.split("/").filter(Boolean).pop()||"Product");
    const title=slug.replace(/[-_]+/g," ").replace(/\.[a-z0-9]{2,5}$/i,"").slice(0,180).trim();
    res.json({sourceUrl:url.toString(),title:title||"Product",description:"",category:"Other",price:null,requiresManualReview:true,
      note:"Preview inferred from URL only. Product details and price must be entered manually."});
  } catch {res.status(400).json({error:"Invalid URL"});}
});
router.post("/admin/demo-creator/activities", async (req,res) => {
  const {sellerEmail,kind,rating,note,quantity=1}=req.body??{};
  if(typeof sellerEmail!=="string" || !sellerEmail.includes("@") ||
    !["review","sale","repeat_buyer"].includes(kind) ||
    !Number.isInteger(quantity) || quantity<1 || quantity>100 ||
    (kind==="review" && (!Number.isInteger(rating)||rating<1||rating>5)) ||
    (note!=null && (typeof note!=="string"||note.length>1000))) {
    res.status(400).json({error:"Invalid simulated activity"});return;
  }
  try {
    await ensureTables();
    const user=await db.execute(sql`SELECT email FROM users WHERE LOWER(email)=LOWER(${sellerEmail}) LIMIT 1`);
    if(!user.rows.length){res.status(404).json({error:"Seller not found"});return;}
    const result=await db.execute(sql`INSERT INTO demo_activity_fixtures(seller_email,kind,rating,note,quantity)
      VALUES(${String(user.rows[0].email)},${kind},${kind==="review"?rating:null},${note||null},${quantity}) RETURNING id`);
    res.status(201).json({id:result.rows[0].id,simulated:true});
  } catch {res.status(503).json({error:"Unable to save simulated activity"});}
});
router.patch("/admin/demo-creator/activities/:id",async(req,res)=>{
  const id=Number(req.params.id);
  if(!Number.isSafeInteger(id)||id<1||typeof req.body?.enabled!=="boolean"){res.status(400).json({error:"Invalid fixture"});return;}
  try {await ensureTables();const result=await db.execute(sql`UPDATE demo_activity_fixtures SET enabled=${req.body.enabled} WHERE id=${id} RETURNING id`);
    if(!result.rows.length){res.status(404).json({error:"Fixture not found"});return;}res.json({id,enabled:req.body.enabled});
  }catch{res.status(503).json({error:"Unable to update fixture"});}
});
router.post("/admin/demo-creator/activities/batch-delete",async(req,res)=>{
  const ids=req.body?.ids;
  if(!Array.isArray(ids)||ids.length<1||ids.length>200||!ids.every((v:unknown)=>Number.isSafeInteger(v)&&(v as number)>0)){
    res.status(400).json({error:"Provide 1–200 valid fixture IDs"});return;}
  try {await ensureTables();const r=await db.execute(sql`DELETE FROM demo_activity_fixtures WHERE id IN (${sql.join(ids.map((id:number)=>sql`${id}`),sql`,`)}) RETURNING id`);
    res.json({deleted:r.rows.length});
  }catch{res.status(503).json({error:"Unable to delete fixtures"});}
});
// Neutral labelled illustrations: never imply that a stock image is the actual item.
const demoImage = (title: string) =>
  `https://placehold.co/640x480/e8edf7/334155.png?text=${encodeURIComponent(title + " - Demo")}`;
const templates = [
  { title:"Compact Bluetooth Speaker", category:"Electronics", description:"Portable rechargeable speaker with Bluetooth connectivity.", price:24.99 },
  { title:"Ceramic Coffee Mug Set", category:"Home & Garden", description:"Set of four ceramic mugs for everyday use.", price:18.50 },
  { title:"Canvas Weekend Bag", category:"Fashion", description:"Durable canvas travel bag with zip fastening and handles.", price:32.00 },
  { title:"LED Desk Lamp", category:"Home & Garden", description:"Adjustable desk light with multiple brightness levels.", price:21.95 },
  { title:"Wireless Computer Mouse", category:"Electronics", description:"Compact wireless mouse suitable for laptop or desktop use.", price:15.00 }
];
router.post("/admin/demo-creator/generate", async (req,res) => {
  const { sellerEmail, region, count = 1 } = req.body ?? {};
  if (typeof sellerEmail !== "string" || !sellerEmail.includes("@") || !validRegion(region) ||
      !Number.isInteger(count) || count < 1 || count > 20) {
    res.status(400).json({error:"Valid seller, region and count (1–20) required"}); return;
  }
  try {
    await ensureTables();
    const account = await db.execute(sql`SELECT email FROM users WHERE LOWER(email)=LOWER(${sellerEmail}) LIMIT 1`);
    if (!account.rows.length) {res.status(404).json({error:"Seller account not found"});return;}
    const email=String(account.rows[0].email);
    const currency=region==="uk"?"GBP":"USD";
    const created=await db.transaction(async tx => {
      const ids:number[]=[];
      for(let i=0;i<count;i++){
        const item=templates[Math.floor(Math.random()*templates.length)];
        const row=await tx.execute(sql`INSERT INTO listings
          (title,description,category,price,condition,image,seller_email,currency,status,specifications,quantity)
          VALUES (${item.title},${item.description},${item.category},${item.price.toFixed(2)},
          'new',${demoImage(item.title)},${email},${currency},'active',
          ${JSON.stringify({marketplace_region:region,demo_creator:true})},1) RETURNING id`);
        const id=Number(row.rows[0].id);
        await tx.execute(sql`INSERT INTO demo_listing_registry(listing_id,seller_email,region)
          VALUES(${id},${email},${region})`);
        ids.push(id);
      }
      return ids;
    });
    res.status(201).json({listingIds:created});
  } catch {res.status(503).json({error:"Unable to generate listings"});}
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
    const r = await db.execute(sql`UPDATE demo_listing_registry SET enabled=${req.body.enabled} WHERE listing_id=${id} AND EXISTS (SELECT 1 FROM listings l WHERE l.id=${id} AND l.status <> 'deleted') RETURNING listing_id`);
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
      const found = await tx.execute(sql`SELECT d.listing_id FROM demo_listing_registry d JOIN listings l ON l.id=d.listing_id WHERE l.status <> 'deleted' AND d.listing_id IN (${sql.join(ids.map((id:number)=>sql`${id}`),sql`,`)}) FOR UPDATE`);
      const safeIds = found.rows.map(r=>Number(r.listing_id));
      if (!safeIds.length) return 0;
      // Never delete a genuine listing, even if the caller supplies its ID.
      // Keep registry tombstones so deleted demo IDs can never be reactivated and charged.
      await tx.execute(sql`DELETE FROM listing_promotions WHERE listing_id IN (${sql.join(safeIds.map(id=>sql`${id}`),sql`,`)})`);
      await tx.execute(sql`UPDATE demo_listing_registry SET enabled=FALSE WHERE listing_id IN (${sql.join(safeIds.map(id=>sql`${id}`),sql`,`)})`);
      await tx.execute(sql`UPDATE listings SET status='deleted',updated_at=NOW() WHERE id IN (${sql.join(safeIds.map(id=>sql`${id}`),sql`,`)})`);
      return safeIds.length;
    });
    res.json({ deleted:removed });
  } catch { res.status(503).json({ error: "Unable to delete demo listings" }); }
});
export default router;
