-- Optional pre-creation; the API also creates these on first case request.
-- Apply after the existing website base returns/disputes tables exist.
CREATE TABLE IF NOT EXISTS dispute_messages (
 id TEXT PRIMARY KEY, dispute_id TEXT NOT NULL, author_email TEXT,
 author_role TEXT NOT NULL, body TEXT NOT NULL, evidence_url TEXT,
 created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS dispute_messages_dispute_idx ON dispute_messages(dispute_id,created_at);
ALTER TABLE dispute_messages ADD COLUMN IF NOT EXISTS client_ref TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS dispute_message_replay_idx ON dispute_messages(dispute_id,author_email,client_ref) WHERE client_ref IS NOT NULL;
ALTER TABLE returns ADD COLUMN IF NOT EXISTS return_carrier TEXT;
ALTER TABLE disputes ADD COLUMN IF NOT EXISTS return_required BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE disputes ADD COLUMN IF NOT EXISTS return_label_url TEXT;
ALTER TABLE disputes ADD COLUMN IF NOT EXISTS return_instructions TEXT;
ALTER TABLE disputes ADD COLUMN IF NOT EXISTS return_tracking TEXT;
ALTER TABLE disputes ADD COLUMN IF NOT EXISTS return_carrier TEXT;
ALTER TABLE disputes ADD COLUMN IF NOT EXISTS return_received_at TIMESTAMPTZ;
