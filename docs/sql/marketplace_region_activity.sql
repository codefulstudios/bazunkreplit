-- Run this additive migration before deploying the regional activity APIs.
-- NULL means not yet classified; do not infer geography from currency.
ALTER TABLE auctions ADD COLUMN IF NOT EXISTS marketplace_region TEXT;
ALTER TABLE flash_sales ADD COLUMN IF NOT EXISTS marketplace_region TEXT;
ALTER TABLE classified_ads ADD COLUMN IF NOT EXISTS marketplace_region TEXT;
CREATE INDEX IF NOT EXISTS auctions_marketplace_region_idx ON auctions (marketplace_region);
CREATE INDEX IF NOT EXISTS flash_sales_marketplace_region_idx ON flash_sales (marketplace_region);
CREATE INDEX IF NOT EXISTS classified_ads_marketplace_region_idx ON classified_ads (marketplace_region);
-- Existing rows intentionally stay NULL until reviewed.
