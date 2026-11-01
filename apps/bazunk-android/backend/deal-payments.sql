-- Apply after offers.sql and the existing fee snapshot schema.
ALTER TABLE marketplace_offers ADD COLUMN IF NOT EXISTS checkout_locked boolean NOT NULL DEFAULT false;
ALTER TABLE marketplace_offers ADD COLUMN IF NOT EXISTS paid_at timestamptz;
CREATE TABLE IF NOT EXISTS checkout_fee_snapshots (id text PRIMARY KEY,payload jsonb NOT NULL,created_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE IF NOT EXISTS marketplace_offer_checkouts (
 id text PRIMARY KEY, offer_id text NOT NULL REFERENCES marketplace_offers(id) ON DELETE CASCADE,
 buyer_email text NOT NULL, fee_quote_id text NOT NULL REFERENCES checkout_fee_snapshots(id),
 stripe_payload jsonb NOT NULL, stripe_session_id text UNIQUE,
 state text NOT NULL DEFAULT 'pending' CHECK(state IN ('pending','open','expired','paid')),
 created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS marketplace_offer_checkout_current ON marketplace_offer_checkouts(offer_id) WHERE state <> 'expired';
