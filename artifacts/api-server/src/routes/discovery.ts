import { Router } from "express";
import { db } from "@workspace/db";
import { sql } from "drizzle-orm";
import { logger } from "../lib/logger.js";
import { authenticatedSellerEmail } from "../lib/authenticatedSeller.js";

const router = Router();
/** Anonymous, privacy-preserving recommendations: the browser supplies a bounded
 * list of previously viewed listing IDs; no email or visitor tracking is required. */
router.get("/discovery/recommendations", async (req, res) => {
  const ids = String(req.query.viewed ?? "").split(",").slice(0, 20)
    .map(Number).filter((id) => Number.isSafeInteger(id) && id > 0);
  const unique = [...new Set(ids)];
  const region = String(req.query.region ?? "").toLowerCase();
  if (region && !["uk", "us"].includes(region)) {
    res.status(400).json({ error: "Invalid region" }); return;
  }
  try {
    const history = unique.length ? (await db.execute(sql`
      SELECT category FROM listings
      WHERE id IN (${sql.join(unique.map(id => sql`${id}`), sql`, `)})
      AND status = 'active' AND category IS NOT NULL
    `)).rows as Array<{ category: string }> : [];
    const categories = [...new Set(history.map(row => row.category).filter(Boolean))].slice(0, 8);
    const results = (await db.execute(sql`
      SELECT id, public_id, title, image, price, currency, category
      FROM listings
      WHERE status = 'active'
        AND (${region} = '' OR (CASE WHEN COALESCE(specifications,'') ~ '^\\s*\\{' THEN specifications::jsonb->>'marketplace_region' ELSE NULL END) = ${region})
        AND (${unique.length === 0} OR id NOT IN (${sql.join((unique.length ? unique : [0]).map(id => sql`${id}`),sql`, `)}))
        AND NOT EXISTS (SELECT 1 FROM site_settings s WHERE s.value='false'
          AND s.key = 'category_visible_' || listings.category)
      ORDER BY CASE WHEN category IN (${sql.join((categories.length ? categories : ['__none__']).map(c=>sql`${c}`),sql`, `)}) THEN 0 ELSE 1 END,
        created_at DESC
      LIMIT 12
    `)).rows;
    res.setHeader("Cache-Control", "no-store");
    res.json({ items: results, personalized: categories.length > 0 });
  } catch (err) {
    logger.error({ err }, "Recommendations unavailable");
    res.status(503).json({ error: "Recommendations unavailable" });
  }
});

async function ensureWishlistTables() {
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS marketplace_wishlist_items (
      user_email text NOT NULL,
      listing_id integer NOT NULL REFERENCES listings(id) ON DELETE CASCADE,
      created_at timestamptz NOT NULL DEFAULT NOW(),
      PRIMARY KEY (user_email,listing_id)
    )
  `);
  await db.execute(sql`CREATE INDEX IF NOT EXISTS marketplace_wishlist_items_recent_idx
    ON marketplace_wishlist_items(user_email,created_at DESC)`);
}
router.get("/discovery/wishlist",async(req,res)=>{
  try {
    const email=await authenticatedSellerEmail(req,res);if(!email)return;
    await ensureWishlistTables();
    const rows=await db.execute(sql`
      SELECT l.id,l.public_id,l.title,l.image,l.price,l.currency,l.category,l.status,w.created_at
      FROM marketplace_wishlist_items w JOIN listings l ON l.id=w.listing_id
      WHERE w.user_email=${email} ORDER BY w.created_at DESC LIMIT 250
    `);
    res.setHeader("Cache-Control","no-store");res.json({items:rows.rows});
  }catch(err){logger.error({err},"Wishlist fetch failed");res.status(500).json({error:"Wishlist unavailable"});}
});
router.post("/discovery/wishlist",async(req,res)=>{
  try {
    const email=await authenticatedSellerEmail(req,res);if(!email)return;
    const id=Number(req.body?.listingId);
    if(!Number.isSafeInteger(id)||id<=0){res.status(400).json({error:"Invalid listing"});return;}
    await ensureWishlistTables();
    const listing=await db.execute(sql`SELECT id FROM listings WHERE id=${id} AND status='active' LIMIT 1`);
    if(!listing.rows.length){res.status(404).json({error:"Listing unavailable"});return;}
    await db.execute(sql`INSERT INTO marketplace_wishlist_items(user_email,listing_id)
      VALUES(${email},${id}) ON CONFLICT(user_email,listing_id) DO NOTHING`);
    res.setHeader("Cache-Control","no-store");res.json({saved:true,listingId:id});
  }catch(err){logger.error({err},"Wishlist save failed");res.status(500).json({error:"Could not save wishlist item"});}
});
router.delete("/discovery/wishlist/:listingId",async(req,res)=>{
  try {
    const email=await authenticatedSellerEmail(req,res);if(!email)return;
    const id=Number(req.params.listingId);
    if(!Number.isSafeInteger(id)||id<=0){res.status(400).json({error:"Invalid listing"});return;}
    await ensureWishlistTables();
    await db.execute(sql`DELETE FROM marketplace_wishlist_items WHERE user_email=${email} AND listing_id=${id}`);
    res.setHeader("Cache-Control","no-store");res.json({saved:false,listingId:id});
  }catch(err){logger.error({err},"Wishlist removal failed");res.status(500).json({error:"Could not remove wishlist item"});}
});

export default router;
