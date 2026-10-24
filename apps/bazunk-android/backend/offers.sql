CREATE TABLE IF NOT EXISTS marketplace_offers (
 id text PRIMARY KEY, listing_id integer NOT NULL REFERENCES listings(id) ON DELETE CASCADE,
 buyer_email text NOT NULL, seller_email text NOT NULL, buyer_name text NOT NULL, seller_name text NOT NULL,
 product_title text NOT NULL, product_image text, listing_price numeric(10,2) NOT NULL CHECK(listing_price>0),
 offer_price numeric(10,2) NOT NULL CHECK(offer_price>0), message text NOT NULL DEFAULT '',
 status text NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','countered','accepted','counter_accepted','declined','counter_declined','withdrawn','expired')),
 counter_price numeric(10,2), counter_message text, request_key text NOT NULL,
 version integer NOT NULL DEFAULT 1, created_at timestamptz NOT NULL DEFAULT now(),
 responded_at timestamptz, expires_at timestamptz NOT NULL DEFAULT (now()+interval '48 hours'),
 UNIQUE(buyer_email,request_key)
);
CREATE INDEX IF NOT EXISTS marketplace_offers_buyer_idx ON marketplace_offers(LOWER(buyer_email),created_at DESC);
CREATE INDEX IF NOT EXISTS marketplace_offers_seller_idx ON marketplace_offers(LOWER(seller_email),created_at DESC);
