-- Do not infer ownership of legacy ads from their public contact email.
ALTER TABLE classified_ads ADD COLUMN IF NOT EXISTS owner_email text;
CREATE TABLE IF NOT EXISTS flash_sale_interests (
  id text PRIMARY KEY,
  sale_id text NOT NULL REFERENCES flash_sales(id) ON DELETE CASCADE,
  buyer_email text NOT NULL,
  buyer_name text NOT NULL,
  message text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (sale_id, buyer_email)
);
