BEGIN;

-- =========================================================
-- Release 5A: Opportunity Intelligence (Request DNA + indexes)
-- =========================================================

ALTER TABLE requests
  ADD COLUMN IF NOT EXISTS budget_min NUMERIC NULL,
  ADD COLUMN IF NOT EXISTS budget_max NUMERIC NULL,
  ADD COLUMN IF NOT EXISTS area_min NUMERIC NULL,
  ADD COLUMN IF NOT EXISTS area_max NUMERIC NULL;

CREATE INDEX IF NOT EXISTS idx_requests_opportunity_candidate
  ON requests (company_id, status, type, city);

CREATE TABLE IF NOT EXISTS request_identities (
  request_id UUID PRIMARY KEY REFERENCES requests(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  identity_version INTEGER NOT NULL DEFAULT 1,
  profile_key TEXT NOT NULL
    CHECK (profile_key IN ('land', 'villa', 'apartment', 'generic')),
  type TEXT NOT NULL,
  offer_type TEXT NOT NULL,
  city TEXT NOT NULL,
  district TEXT NOT NULL DEFAULT '',
  budget_min NUMERIC NULL,
  budget_max NUMERIC NULL,
  area_min NUMERIC NULL,
  area_max NUMERIC NULL,
  dna JSONB NOT NULL DEFAULT '{}'::jsonb,
  regenerated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_request_identities_candidate
  ON request_identities (company_id, type, city, district);

CREATE OR REPLACE FUNCTION private_schema.set_request_identity_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_request_identity_updated_at ON request_identities;
CREATE TRIGGER trg_request_identity_updated_at
  BEFORE UPDATE ON request_identities
  FOR EACH ROW
  EXECUTE FUNCTION private_schema.set_request_identity_updated_at();

ALTER TABLE request_identities ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "View company request identities" ON request_identities;
CREATE POLICY "View company request identities"
  ON request_identities FOR SELECT
  TO authenticated
  USING (company_id = private_schema.get_user_company_id());

DROP POLICY IF EXISTS "Manage company request identities" ON request_identities;
CREATE POLICY "Manage company request identities"
  ON request_identities FOR ALL
  TO authenticated
  USING (company_id = private_schema.get_user_company_id())
  WITH CHECK (company_id = private_schema.get_user_company_id());

-- Extend intelligence_events domain check if needed (matching already allowed)
-- No schema change required for domain values from R4.

COMMIT;
