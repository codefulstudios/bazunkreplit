-- Bazunk seller compliance records (PostgreSQL)
-- Apply through the normal reviewed database migration process before enabling endpoints.
CREATE TABLE IF NOT EXISTS seller_compliance_cases (
 id BIGSERIAL PRIMARY KEY,
 seller_email TEXT NOT NULL,
 status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open','awaiting_information','under_review','resolved','appealed')),
 risk_score SMALLINT CHECK (risk_score BETWEEN 0 AND 100),
 risk_band TEXT CHECK (risk_band IN ('normal','enhanced','review')),
 risk_reasons JSONB NOT NULL DEFAULT '[]'::jsonb,
 rule_version TEXT NOT NULL DEFAULT 'v1',
 assigned_admin TEXT,
 opened_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
 updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
 closed_at TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS seller_compliance_cases_email_idx ON seller_compliance_cases (LOWER(seller_email),status);
CREATE TABLE IF NOT EXISTS seller_declarations (
 id BIGSERIAL PRIMARY KEY,
 seller_email TEXT NOT NULL,
 declared_type TEXT NOT NULL CHECK (declared_type IN ('private','sole_trader','business')),
 declaration_version TEXT NOT NULL,
 declared_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
 source TEXT NOT NULL DEFAULT 'seller_onboarding'
);
CREATE INDEX IF NOT EXISTS seller_declarations_email_idx ON seller_declarations (LOWER(seller_email),declared_at DESC);
CREATE TABLE IF NOT EXISTS seller_business_details (
 seller_email TEXT PRIMARY KEY,
 trading_name TEXT,
 business_address JSONB,
 registration_number TEXT,
 tax_identifier TEXT,
 verification_status TEXT NOT NULL DEFAULT 'unverified' CHECK (verification_status IN ('unverified','pending','verified','rejected')),
 updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS seller_compliance_events (
 id BIGSERIAL PRIMARY KEY,
 case_id BIGINT NOT NULL REFERENCES seller_compliance_cases(id),
 actor_type TEXT NOT NULL CHECK (actor_type IN ('system','seller','admin')),
 actor_id TEXT,
 action TEXT NOT NULL,
 details JSONB NOT NULL DEFAULT '{}'::jsonb,
 created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS seller_compliance_events_case_idx ON seller_compliance_events(case_id,created_at);
CREATE TABLE IF NOT EXISTS seller_compliance_appeals (
 id BIGSERIAL PRIMARY KEY,
 case_id BIGINT NOT NULL REFERENCES seller_compliance_cases(id),
 seller_email TEXT NOT NULL,
 explanation TEXT NOT NULL,
 status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','accepted','rejected')),
 decision_reason TEXT,
 decided_by TEXT,
 created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
 decided_at TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS seller_compliance_appeals_case_idx ON seller_compliance_appeals(case_id,status);
-- Security: do not expose these tables through public generic data APIs.
-- Application must authorize reads/writes by seller identity or admin privilege.
