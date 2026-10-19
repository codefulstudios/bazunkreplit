import { Router } from "express";
import { db } from "@workspace/db";
import { sql } from "drizzle-orm";
import { logger } from "../lib/logger.js";

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
export default router;
