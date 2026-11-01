CREATE TABLE IF NOT EXISTS listing_inventory(listing_id integer PRIMARY KEY REFERENCES listings(id) ON DELETE CASCADE,quantity integer NOT NULL DEFAULT 1 CHECK(quantity>=0),updated_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE IF NOT EXISTS stock_reservations(session_id text PRIMARY KEY,buyer_email text NOT NULL,payload jsonb NOT NULL,state text NOT NULL DEFAULT 'held' CHECK(state IN ('held','released','consumed')),expires_at timestamptz NOT NULL,updated_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE IF NOT EXISTS stock_reservation_items(session_id text NOT NULL REFERENCES stock_reservations(session_id),listing_id integer NOT NULL REFERENCES listings(id) ON DELETE RESTRICT,quantity integer NOT NULL CHECK(quantity>0),PRIMARY KEY(session_id,listing_id));
CREATE INDEX IF NOT EXISTS stock_reservation_listing_idx ON stock_reservation_items(listing_id);
-- Review real remaining quantities and expire older unpaid Stripe sessions before enabling new checkout.
