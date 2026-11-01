-- Optional pre-provisioning for the combined commerce update.
-- Apply only to the existing Bazunk database after backup/review.
-- The API also creates these objects lazily. Existing marketplace schema is required.
BEGIN;
CREATE TABLE IF NOT EXISTS special_checkouts(id TEXT PRIMARY KEY,kind TEXT NOT NULL,source_id TEXT NOT NULL,buyer_email TEXT NOT NULL,quote JSONB NOT NULL,stripe_payload JSONB NOT NULL,stripe_session_id TEXT UNIQUE,state TEXT NOT NULL DEFAULT 'pending',created_at TIMESTAMPTZ NOT NULL DEFAULT now());

CREATE UNIQUE INDEX IF NOT EXISTS special_checkout_current ON special_checkouts(kind,source_id) WHERE state<>'expired';

CREATE TABLE IF NOT EXISTS play_credit_purchases(transaction_id TEXT PRIMARY KEY,event_id TEXT NOT NULL,email TEXT NOT NULL,product_id TEXT NOT NULL,credits INTEGER NOT NULL,state TEXT NOT NULL,environment TEXT NOT NULL,created_at TIMESTAMPTZ NOT NULL DEFAULT now());
COMMIT;
