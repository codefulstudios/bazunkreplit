-- Optional pre-creation before deploying the rewards API.
-- The API also creates this table on the first game request.
CREATE TABLE IF NOT EXISTS reward_claim_requests (
  id text PRIMARY KEY,
  email text NOT NULL,
  kind text NOT NULL,
  result jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
