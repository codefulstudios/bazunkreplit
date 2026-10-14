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
    await db.execute(sql`UPDATE listings l SET quantity=0 FROM demo_listing_registry d WHERE d.listing_id=l.id AND l.quantity<>0`);
    const [listings, settings, activities] = await Promise.all([
      db.execute(sql`SELECT d.*,l.title,l.price,l.status,l.image FROM demo_listing_registry d JOIN listings l ON l.id=d.listing_id WHERE l.status <> 'deleted' ORDER BY d.created_at DESC LIMIT 500`),
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
type DemoPhoto = { id: number; alt?: string; photographer?: string; url?: string; src?: { large?: string; medium?: string }; provider?: string };
function matchesProductPhoto(title: string, tags: string): boolean {
  const text = tags.toLowerCase();
  const tokens = text.split(/[^a-z]+/).filter(Boolean);
  const has = (...words: string[]) => words.some(word => tokens.includes(word));
  if (/weekend.*bag|canvas.*bag|duffel/i.test(title)) return has("bag","bags","duffel","holdall","luggage","weekender");
  if (/coffee.*mug|ceramic.*mug/i.test(title)) return has("mug","mugs","cup","cups") && !has("beans","bean","grounds");
  if (/bluetooth.*speaker/i.test(title)) return has("speaker","speakers","boombox");
  if (/desk.*lamp/i.test(title)) return has("lamp","lamps","light","lighting");
  if (/computer.*mouse|wireless.*mouse/i.test(title)) return has("mouse","mice") && !has("animal","rodent");
  return title.toLowerCase().split(/[^a-z]+/).filter(w=>w.length>3).some(w=>tokens.includes(w));
}
async function findPexelsPhoto(title: string): Promise<DemoPhoto | null> {
  const pixabayKey = process.env.PIXABAY_API_KEY;
  const pexelsKey = process.env.PEXELS_API_KEY;
  if (!pixabayKey && !pexelsKey) return null;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 6500);
  try {
    if (pixabayKey) {
      const query = new URLSearchParams({ key: pixabayKey, q: title, image_type: "photo", per_page: "30", safesearch: "true" });
      const response = await fetch(`https://pixabay.com/api/?${query}`, { signal: controller.signal });
      if (!response.ok) return null;
      const data = await response.json() as { hits?: Array<{id:number;largeImageURL?:string;webformatURL?:string;pageURL?:string;user?:string;tags?:string}> };
      const hit = (data.hits || []).find(p => p.largeImageURL && p.pageURL && matchesProductPhoto(title,p.tags || ""));
      return hit ? { id:hit.id, alt:hit.tags, photographer:hit.user || "Pixabay contributor", url:hit.pageURL,
        src:{large:hit.largeImageURL,medium:hit.webformatURL}, provider:"Pixabay" } : null;
    }
    const query = new URLSearchParams({ query: title, per_page: "8", orientation: "landscape" });
    const response = await fetch(`https://api.pexels.com/v1/search?${query}`, {
      headers: { Authorization: pexelsKey! }, signal: controller.signal,
    });
    if (!response.ok) return null;
    const data = await response.json() as { photos?: DemoPhoto[] };
    const photo=(data.photos || []).find(p => p.src?.large && p.url && p.photographer && matchesProductPhoto(title,p.alt || ""));
    return photo ? {...photo,provider:"Pexels"} : null;
  } catch { return null; }
  finally { clearTimeout(timeout); }
}
function photoMetadata(photo: DemoPhoto) {
  return { image_provider: photo.provider || "Pexels", image_photo_id: photo.id,
    image_credit: photo.photographer, image_source_url: photo.url };
}
const templates = [
  { title:"Bluetooth Speaker", category:"Electronics", description:"Bluetooth Speaker in good quality, suitable for everyday use.", price:12.95 },
  { title:"Wireless Headphones", category:"Electronics", description:"Wireless Headphones in good quality, suitable for everyday use.", price:17.45 },
  { title:"USB-C Charging Cable", category:"Electronics", description:"USB-C Charging Cable in good quality, suitable for everyday use.", price:21.95 },
  { title:"Portable Power Bank", category:"Electronics", description:"Portable Power Bank in good quality, suitable for everyday use.", price:26.45 },
  { title:"Computer Keyboard", category:"Electronics", description:"Computer Keyboard in good quality, suitable for everyday use.", price:30.95 },
  { title:"Wireless Computer Mouse", category:"Electronics", description:"Wireless Computer Mouse in good quality, suitable for everyday use.", price:35.45 },
  { title:"Webcam", category:"Electronics", description:"Webcam in good quality, suitable for everyday use.", price:39.95 },
  { title:"Tablet Stand", category:"Electronics", description:"Tablet Stand in good quality, suitable for everyday use.", price:44.45 },
  { title:"Ceramic Coffee Mug Set", category:"Home & Garden", description:"Ceramic Coffee Mug Set in good quality, suitable for everyday use.", price:14.95 },
  { title:"LED Desk Lamp", category:"Home & Garden", description:"LED Desk Lamp in good quality, suitable for everyday use.", price:19.45 },
  { title:"Cotton Cushion Cover", category:"Home & Garden", description:"Cotton Cushion Cover in good quality, suitable for everyday use.", price:23.95 },
  { title:"Glass Flower Vase", category:"Home & Garden", description:"Glass Flower Vase in good quality, suitable for everyday use.", price:28.45 },
  { title:"Woven Storage Basket", category:"Home & Garden", description:"Woven Storage Basket in good quality, suitable for everyday use.", price:32.95 },
  { title:"Wall Clock", category:"Home & Garden", description:"Wall Clock in good quality, suitable for everyday use.", price:37.45 },
  { title:"Plant Pot", category:"Home & Garden", description:"Plant Pot in good quality, suitable for everyday use.", price:41.95 },
  { title:"Kitchen Utensil Set", category:"Home & Garden", description:"Kitchen Utensil Set in good quality, suitable for everyday use.", price:46.45 },
  { title:"Canvas Weekend Bag", category:"Fashion & Accessories", description:"Canvas Weekend Bag in good quality, suitable for everyday use.", price:8.95 },
  { title:"Leather Wallet", category:"Fashion & Accessories", description:"Leather Wallet in good quality, suitable for everyday use.", price:13.45 },
  { title:"Cotton Scarf", category:"Fashion & Accessories", description:"Cotton Scarf in good quality, suitable for everyday use.", price:17.95 },
  { title:"Canvas Tote Bag", category:"Fashion & Accessories", description:"Canvas Tote Bag in good quality, suitable for everyday use.", price:22.45 },
  { title:"Sunglasses", category:"Fashion & Accessories", description:"Sunglasses in good quality, suitable for everyday use.", price:26.95 },
  { title:"Baseball Cap", category:"Fashion & Accessories", description:"Baseball Cap in good quality, suitable for everyday use.", price:31.45 },
  { title:"Wristwatch", category:"Fashion & Accessories", description:"Wristwatch in good quality, suitable for everyday use.", price:35.95 },
  { title:"Crossbody Bag", category:"Fashion & Accessories", description:"Crossbody Bag in good quality, suitable for everyday use.", price:40.45 },
  { title:"Yoga Mat", category:"Sports & Outdoors", description:"Yoga Mat in good quality, suitable for everyday use.", price:11.95 },
  { title:"Reusable Water Bottle", category:"Sports & Outdoors", description:"Reusable Water Bottle in good quality, suitable for everyday use.", price:16.45 },
  { title:"Camping Lantern", category:"Sports & Outdoors", description:"Camping Lantern in good quality, suitable for everyday use.", price:20.95 },
  { title:"Hiking Backpack", category:"Sports & Outdoors", description:"Hiking Backpack in good quality, suitable for everyday use.", price:25.45 },
  { title:"Resistance Bands", category:"Sports & Outdoors", description:"Resistance Bands in good quality, suitable for everyday use.", price:29.95 },
  { title:"Football", category:"Sports & Outdoors", description:"Football in good quality, suitable for everyday use.", price:34.45 },
  { title:"Bicycle Helmet", category:"Sports & Outdoors", description:"Bicycle Helmet in good quality, suitable for everyday use.", price:38.95 },
  { title:"Picnic Blanket", category:"Sports & Outdoors", description:"Picnic Blanket in good quality, suitable for everyday use.", price:43.45 },
  { title:"Wooden Building Blocks", category:"Toys & Games", description:"Wooden Building Blocks in good quality, suitable for everyday use.", price:13.95 },
  { title:"Jigsaw Puzzle", category:"Toys & Games", description:"Jigsaw Puzzle in good quality, suitable for everyday use.", price:18.45 },
  { title:"Board Game", category:"Toys & Games", description:"Board Game in good quality, suitable for everyday use.", price:22.95 },
  { title:"Plush Teddy Bear", category:"Toys & Games", description:"Plush Teddy Bear in good quality, suitable for everyday use.", price:27.45 },
  { title:"Toy Racing Car", category:"Toys & Games", description:"Toy Racing Car in good quality, suitable for everyday use.", price:31.95 },
  { title:"Playing Cards", category:"Toys & Games", description:"Playing Cards in good quality, suitable for everyday use.", price:36.45 },
  { title:"Hardback Cookbook", category:"Books & Media", description:"Hardback Cookbook in good quality, suitable for everyday use.", price:14.95 },
  { title:"Travel Guide Book", category:"Books & Media", description:"Travel Guide Book in good quality, suitable for everyday use.", price:19.45 },
  { title:"Sketchbook", category:"Books & Media", description:"Sketchbook in good quality, suitable for everyday use.", price:23.95 },
  { title:"Paperback Novel", category:"Books & Media", description:"Paperback Novel in good quality, suitable for everyday use.", price:28.45 },
  { title:"Art Print", category:"Books & Media", description:"Art Print in good quality, suitable for everyday use.", price:32.95 },
  { title:"Makeup Brush Set", category:"Health & Beauty", description:"Makeup Brush Set in good quality, suitable for everyday use.", price:9.95 },
  { title:"Hair Brush", category:"Health & Beauty", description:"Hair Brush in good quality, suitable for everyday use.", price:14.45 },
  { title:"Toiletry Bag", category:"Health & Beauty", description:"Toiletry Bag in good quality, suitable for everyday use.", price:18.95 },
  { title:"Manicure Kit", category:"Health & Beauty", description:"Manicure Kit in good quality, suitable for everyday use.", price:23.45 },
  { title:"Cosmetic Mirror", category:"Health & Beauty", description:"Cosmetic Mirror in good quality, suitable for everyday use.", price:27.95 },
  { title:"Dog Lead", category:"Pet Supplies", description:"Dog Lead in good quality, suitable for everyday use.", price:13.95 },
  { title:"Cat Scratching Post", category:"Pet Supplies", description:"Cat Scratching Post in good quality, suitable for everyday use.", price:18.45 },
  { title:"Pet Food Bowl", category:"Pet Supplies", description:"Pet Food Bowl in good quality, suitable for everyday use.", price:22.95 },
  { title:"Dog Toy", category:"Pet Supplies", description:"Dog Toy in good quality, suitable for everyday use.", price:27.45 },
  { title:"Pet Bed", category:"Pet Supplies", description:"Pet Bed in good quality, suitable for everyday use.", price:31.95 },
  { title:"Screwdriver Set", category:"DIY & Tools", description:"Screwdriver Set in good quality, suitable for everyday use.", price:12.95 },
  { title:"Tape Measure", category:"DIY & Tools", description:"Tape Measure in good quality, suitable for everyday use.", price:17.45 },
  { title:"Toolbox", category:"DIY & Tools", description:"Toolbox in good quality, suitable for everyday use.", price:21.95 },
  { title:"Paint Brush Set", category:"DIY & Tools", description:"Paint Brush Set in good quality, suitable for everyday use.", price:26.45 },
  { title:"Cordless Drill", category:"DIY & Tools", description:"Cordless Drill in good quality, suitable for everyday use.", price:30.95 },
  { title:"Baby Blanket", category:"Baby & Kids", description:"Baby Blanket in good quality, suitable for everyday use.", price:12.95 },
  { title:"Children's Backpack", category:"Baby & Kids", description:"Children's Backpack in good quality, suitable for everyday use.", price:17.45 },
  { title:"Baby Bib Set", category:"Baby & Kids", description:"Baby Bib Set in good quality, suitable for everyday use.", price:21.95 },
  { title:"Kids Lunch Box", category:"Baby & Kids", description:"Kids Lunch Box in good quality, suitable for everyday use.", price:26.45 },
  { title:"Car Phone Holder", category:"Automotive", description:"Car Phone Holder in good quality, suitable for everyday use.", price:11.95 },
  { title:"Car Cleaning Kit", category:"Automotive", description:"Car Cleaning Kit in good quality, suitable for everyday use.", price:16.45 },
  { title:"Car Boot Organiser", category:"Automotive", description:"Car Boot Organiser in good quality, suitable for everyday use.", price:20.95 },
  { title:"Tyre Pressure Gauge", category:"Automotive", description:"Tyre Pressure Gauge in good quality, suitable for everyday use.", price:25.45 },
  { title:"Silver Pendant Necklace", category:"Jewellery", description:"Silver Pendant Necklace in good quality, suitable for everyday use.", price:10.95 },
  { title:"Beaded Bracelet", category:"Jewellery", description:"Beaded Bracelet in good quality, suitable for everyday use.", price:15.45 },
  { title:"Stud Earrings", category:"Jewellery", description:"Stud Earrings in good quality, suitable for everyday use.", price:19.95 },
  { title:"Jewellery Box", category:"Jewellery", description:"Jewellery Box in good quality, suitable for everyday use.", price:24.45 },
  { title:"Notebook Set", category:"Office & Stationery", description:"Notebook Set in good quality, suitable for everyday use.", price:13.95 },
  { title:"Desk Organiser", category:"Office & Stationery", description:"Desk Organiser in good quality, suitable for everyday use.", price:18.45 },
  { title:"Ballpoint Pen Set", category:"Office & Stationery", description:"Ballpoint Pen Set in good quality, suitable for everyday use.", price:22.95 },
  { title:"Laptop Sleeve", category:"Office & Stationery", description:"Laptop Sleeve in good quality, suitable for everyday use.", price:27.45 },
  { title:"Acoustic Guitar", category:"Music & Instruments", description:"Acoustic Guitar in good quality, suitable for everyday use.", price:13.95 },
  { title:"Guitar Picks", category:"Music & Instruments", description:"Guitar Picks in good quality, suitable for everyday use.", price:18.45 },
  { title:"Digital Metronome", category:"Music & Instruments", description:"Digital Metronome in good quality, suitable for everyday use.", price:22.95 },
  { title:"Keyboard Stand", category:"Music & Instruments", description:"Keyboard Stand in good quality, suitable for everyday use.", price:27.45 },
  { title:"Vintage Postcard Set", category:"Collectables & Art", description:"Vintage Postcard Set in good quality, suitable for everyday use.", price:12.95 },
  { title:"Decorative Figurine", category:"Collectables & Art", description:"Decorative Figurine in good quality, suitable for everyday use.", price:17.45 },
  { title:"Framed Landscape Print", category:"Collectables & Art", description:"Framed Landscape Print in good quality, suitable for everyday use.", price:21.95 },
  { title:"Collectable Coin Album", category:"Collectables & Art", description:"Collectable Coin Album in good quality, suitable for everyday use.", price:26.45 }
];
const demoCategories = ["All categories", ...new Set(templates.map(item=>item.category))];
router.get("/admin/demo-creator/catalogue", (_req,res)=>res.json({categories:demoCategories,total:templates.length,products:templates.map((item,id)=>({...item,id}))}));
// Admin-only photo search and controlled replacement for registered demo listings.
router.get("/admin/demo-creator/images/search", async (req, res) => {
  const title = String(req.query.q || "").trim().slice(0,120);
  if (!title) { res.status(400).json({error:"Search term required"}); return; }
  if (!process.env.PIXABAY_API_KEY && !process.env.PEXELS_API_KEY) { res.status(503).json({error:"PIXABAY_API_KEY or PEXELS_API_KEY not configured"}); return; }
  const photo = await findPexelsPhoto(title);
  res.json({ photo: photo ? { id:photo.id, image:photo.src?.large, photographer:photo.photographer, sourceUrl:photo.url, alt:photo.alt } : null });
});
router.get("/admin/demo-creator/images/options", async (req,res) => {
  const title=String(req.query.q || "").trim().slice(0,120);
  if(!title){res.status(400).json({error:"Product title required"});return;}
  const key=process.env.PIXABAY_API_KEY;
  if(!key){res.status(503).json({error:"PIXABAY_API_KEY not configured"});return;}
  try {
    const params=new URLSearchParams({key,q:title,image_type:"photo",per_page:"50",safesearch:"true"});
    const controller=new AbortController();
    const timeout=setTimeout(()=>controller.abort(),6500);
    let response:Response;
    try{response=await fetch(`https://pixabay.com/api/?${params}`,{signal:controller.signal});}
    finally{clearTimeout(timeout);}
    if(!response.ok){res.status(502).json({error:"Pixabay search unavailable"});return;}
    const data=await response.json() as {hits?:Array<{id:number;largeImageURL?:string;webformatURL?:string;pageURL?:string;user?:string;tags?:string}>};
    const photos=(data.hits||[]).filter(p=>p.largeImageURL&&p.pageURL&&matchesProductPhoto(title,p.tags||"")).slice(0,12)
      .map(p=>({id:p.id,image:p.largeImageURL,preview:p.webformatURL||p.largeImageURL,sourceUrl:p.pageURL,photographer:p.user||"Pixabay contributor",tags:p.tags}));
    res.json({photos});
  }catch{res.status(502).json({error:"Unable to search Pixabay"});}
});
router.post("/admin/demo-creator/images/replace", async (req, res) => {
  const id=Number(req.body?.listingId);
  const image=String(req.body?.image || "");
  const sourceUrl=String(req.body?.sourceUrl || "");
  const credit=String(req.body?.photographer || "");
  if (!Number.isSafeInteger(id) || id<1 || image.length>2048 || sourceUrl.length>2048 ||
      !/^https:\/\/[^\s]+$/i.test(image) || !/^https:\/\/pixabay\.com\/[^\s]+$/i.test(sourceUrl) ||
      !/^https:\/\/[^\s]*pixabay\.com\/[^\s]+$/i.test(image)) {
    res.status(400).json({error:"Choose a valid Pixabay image for a demo listing"});return;
  }
  try {
    await ensureTables();
    const metadata=JSON.stringify({image_provider:"Pixabay",image_credit:credit.slice(0,150),image_source_url:sourceUrl});
    const result=await db.execute(sql`UPDATE listings l SET image=${image},
      specifications=(COALESCE(NULLIF(l.specifications,''),'{}')::jsonb || ${metadata}::jsonb)::text
      FROM demo_listing_registry d WHERE d.listing_id=l.id AND l.id=${id} RETURNING l.id`);
    if(!result.rows.length){res.status(404).json({error:"Demo listing not found"});return;}
    res.json({updated:true,listingId:id});
  }catch{res.status(503).json({error:"Unable to replace demo image"});}
});
router.post("/admin/demo-creator/images/fill-missing", async (req, res) => {
  const replaceExisting = req.body?.replaceExisting === true;
  if (!process.env.PIXABAY_API_KEY && !process.env.PEXELS_API_KEY) { res.status(503).json({error:"PIXABAY_API_KEY or PEXELS_API_KEY not configured"}); return; }
  try {
    await ensureTables();
    const rows=await db.execute(sql`SELECT l.id,l.title FROM listings l JOIN demo_listing_registry d ON d.listing_id=l.id
      WHERE l.status <> 'deleted' AND (${sql`${replaceExisting}`} OR l.image IS NULL OR l.image='' OR l.image LIKE 'https://placehold.co/%') ORDER BY l.id LIMIT 20`);
    let updated=0;
    for(const row of rows.rows) {
      const photo=await findPexelsPhoto(String(row.title));
      if(!photo?.src?.large) continue;
      const specs=JSON.stringify(photoMetadata(photo));
      await db.execute(sql`UPDATE listings SET image=${photo.src.large},
        specifications=(CASE WHEN COALESCE(specifications,'') ~ '^\\s*\\{' THEN specifications::jsonb ELSE '{}'::jsonb END || ${specs}::jsonb)::text
        WHERE id=${Number(row.id)} AND EXISTS(SELECT 1 FROM demo_listing_registry d WHERE d.listing_id=${Number(row.id)})`);
      updated++;
    }
    res.json({scanned:rows.rows.length,updated,replaceExisting});
  } catch {res.status(503).json({error:"Unable to fill demo images"});}
});
router.post("/admin/demo-creator/generate", async (req,res) => {
  const { sellerEmail, region, count = 1, category = "All categories", mode = "random", productIds = [], preventDuplicates = true, requireApproval = true } = req.body ?? {};
  if (typeof sellerEmail !== "string" || !sellerEmail.includes("@") || !validRegion(region) ||
      !Number.isInteger(count) || count < 1 || count > 20 || !demoCategories.includes(category) || !["random","category","selected"].includes(mode) || !Array.isArray(productIds) || productIds.length > 20 || typeof preventDuplicates !== "boolean" || typeof requireApproval !== "boolean") {
    res.status(400).json({error:"Valid seller, region and count (1–20) required"}); return;
  }
  try {
    await ensureTables();
    const account = await db.execute(sql`SELECT email FROM users WHERE LOWER(email)=LOWER(${sellerEmail}) LIMIT 1`);
    if (!account.rows.length) {res.status(404).json({error:"Seller account not found"});return;}
    const email=String(account.rows[0].email);
    const currency=region==="uk"?"GBP":"USD";
    const pool = mode==="selected" ? productIds.map((id:unknown)=>Number.isInteger(id) ? templates[id as number] : undefined).filter((item):item is typeof templates[number]=>!!item) :
      templates.filter(item=>mode!=="category" || item.category===category);
    if(mode==="selected" && (productIds.length!==count || new Set(productIds).size!==count || pool.length!==count)){
      res.status(400).json({error:"Select exactly the requested number of different catalogue products"});return;
    }
    const existing=await db.execute(sql`SELECT l.title FROM listings l JOIN demo_listing_registry d ON d.listing_id=l.id
      WHERE LOWER(d.seller_email)=LOWER(${email}) AND d.region=${region} AND l.status <> 'deleted'`);
    const used=new Set(existing.rows.map(row=>String(row.title).toLowerCase()));
    const shuffled=[...pool].sort(()=>Math.random()-0.5);
    const available=preventDuplicates ? shuffled.filter(item=>!used.has(item.title.toLowerCase())) : shuffled;
    if(count>available.length){
      res.status(409).json({error:`Only ${available.length} unused unique products available for this seller and region. Reduce quantity, select another category, or disable duplicate prevention.`});return;
    }
    const chosen=available.slice(0,count);
    const photos = await Promise.all(chosen.map(item => findPexelsPhoto(item.title)));
    const created=await db.transaction(async tx => {
      const ids:number[]=[];
      for(let i=0;i<count;i++){
        const item=chosen[i];
        const photo=photos[i];
        const row=await tx.execute(sql`INSERT INTO listings
          (title,description,category,price,condition,image,seller_email,currency,status,specifications,quantity)
          VALUES (${item.title},${item.description},${item.category},${item.price.toFixed(2)},
          'new',${photo?.src?.large || demoImage(item.title)},${email},${currency},'active',
          ${JSON.stringify({marketplace_region:region,demo_creator:true,...(photo ? photoMetadata(photo) : {})})},0) RETURNING id`);
        const id=Number(row.rows[0].id);
        await tx.execute(sql`UPDATE listings SET public_id=${`BZL-${id}`} WHERE id=${id}`);
        await tx.execute(sql`INSERT INTO demo_listing_registry(listing_id,seller_email,region,enabled)
          VALUES(${id},${email},${region},${!requireApproval})`);
        ids.push(id);
      }
      return ids;
    });
    res.status(201).json({listingIds:created,pendingApproval:requireApproval});
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
          ${JSON.stringify({ marketplace_region: region, demo_creator: true })},0)
        RETURNING id`);
      const id = Number(created.rows[0].id);
      await tx.execute(sql`UPDATE listings SET public_id=${`BZL-${id}`} WHERE id=${id}`);
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
router.post("/admin/demo-creator/listings/batch-publish", async (req,res) => {
  const ids=req.body?.ids;
  if(!Array.isArray(ids)||ids.length<1||ids.length>200||!ids.every((id:unknown)=>Number.isSafeInteger(id)&&id>0)||typeof req.body?.enabled!=="boolean"){
    res.status(400).json({error:"Provide valid listing IDs and visibility"});return;
  }
  try{
    await ensureTables();
    const updated=await db.execute(sql`UPDATE demo_listing_registry d SET enabled=${req.body.enabled}
      FROM listings l WHERE l.id=d.listing_id AND l.status <> 'deleted'
      AND d.listing_id IN (${sql.join(ids.map((id:number)=>sql`${id}`),sql`,`)}) RETURNING d.listing_id`);
    res.json({updated:updated.rows.length,enabled:req.body.enabled});
  }catch{res.status(503).json({error:"Unable to update demo visibility"});}
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
