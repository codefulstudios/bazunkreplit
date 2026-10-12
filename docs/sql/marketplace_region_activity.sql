-- Production regional migration: additive and idempotent.
-- Execute with a write-enabled PostgreSQL connection during a maintenance window.
-- Back up the database first. No prices, stock, seller identities or shipping settings change.
BEGIN;
ALTER TABLE auctions ADD COLUMN IF NOT EXISTS marketplace_region TEXT;
ALTER TABLE flash_sales ADD COLUMN IF NOT EXISTS marketplace_region TEXT;
ALTER TABLE classified_ads ADD COLUMN IF NOT EXISTS marketplace_region TEXT;
CREATE INDEX IF NOT EXISTS auctions_marketplace_region_idx ON auctions (marketplace_region);
CREATE INDEX IF NOT EXISTS flash_sales_marketplace_region_idx ON flash_sales (marketplace_region);
CREATE INDEX IF NOT EXISTS classified_ads_marketplace_region_idx ON classified_ads (marketplace_region);

-- Only source-labelled listings are safe to backfill automatically.
-- specifications is TEXT, so validate before casting to JSONB.
-- Explicitly assigned regions are never overwritten.
UPDATE listings
SET specifications = jsonb_set(specifications::jsonb, '{marketplace_region}',
  to_jsonb(CASE WHEN specifications::jsonb->>'source' IN ('eBay UK','Amazon UK') THEN 'uk' ELSE 'us' END), true)::text
WHERE specifications IS NOT NULL
  AND specifications ~ '^\\s*\\{'
  AND jsonb_typeof(specifications::jsonb) = 'object'
  AND NOT (specifications::jsonb ? 'marketplace_region')
  AND specifications::jsonb->>'source' IN ('eBay UK','Amazon UK','eBay US','Amazon US');

-- Existing flash sales, auctions and classifieds stay NULL pending explicit review.
-- Do not infer their market from price, currency or seller email.
COMMIT;

-- Read-only post-migration checks:
SELECT table_name, column_name FROM information_schema.columns
WHERE table_name IN ('auctions','flash_sales','classified_ads') AND column_name = 'marketplace_region'
ORDER BY table_name;
SELECT COALESCE(specifications::jsonb->>'marketplace_region','UNASSIGNED') AS region, COUNT(*)
FROM listings WHERE specifications ~ '^\\s*\\{' GROUP BY 1 ORDER BY 1;
SELECT id, title, seller_email, status, marketplace_region
FROM flash_sales WHERE marketplace_region IS NULL ORDER BY id;
