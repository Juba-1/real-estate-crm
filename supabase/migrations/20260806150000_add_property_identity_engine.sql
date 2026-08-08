BEGIN;

-- =========================================================
-- Release 4: Property Identity Engine (Intelligence domain)
-- =========================================================

CREATE TABLE IF NOT EXISTS property_identities (
  property_id UUID PRIMARY KEY REFERENCES properties(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  identity_version INTEGER NOT NULL DEFAULT 1,
  profile_key TEXT NOT NULL
    CHECK (profile_key IN ('land', 'villa', 'apartment', 'generic')),
  type TEXT NOT NULL,
  city TEXT NOT NULL,
  district TEXT NOT NULL,
  area NUMERIC NOT NULL,
  latitude DOUBLE PRECISION NULL,
  longitude DOUBLE PRECISION NULL,
  geohash TEXT NULL,
  coordinate_source TEXT NULL
    CHECK (coordinate_source IS NULL OR coordinate_source IN ('google_maps_url', 'manual')),
  dna JSONB NOT NULL DEFAULT '{}'::jsonb,
  regenerated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_property_identities_candidate
  ON property_identities (company_id, profile_key, city, district);

CREATE INDEX IF NOT EXISTS idx_property_identities_area
  ON property_identities (company_id, type, area);

CREATE INDEX IF NOT EXISTS idx_property_identities_geohash
  ON property_identities (company_id, geohash)
  WHERE geohash IS NOT NULL;

-- Fallback candidate path when identities are sparse
CREATE INDEX IF NOT EXISTS idx_properties_identity_fallback
  ON properties (company_id, type, city);

CREATE OR REPLACE FUNCTION private_schema.set_property_identity_updated_at()
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

DROP TRIGGER IF EXISTS trg_property_identity_updated_at ON property_identities;
CREATE TRIGGER trg_property_identity_updated_at
  BEFORE UPDATE ON property_identities
  FOR EACH ROW
  EXECUTE FUNCTION private_schema.set_property_identity_updated_at();

ALTER TABLE property_identities ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "View company property identities" ON property_identities;
CREATE POLICY "View company property identities"
  ON property_identities FOR SELECT
  TO authenticated
  USING (company_id = private_schema.get_user_company_id());

-- Company members may upsert identities for their tenant (save side-effect).
-- No global visibility branch — identity is never cross-company.
DROP POLICY IF EXISTS "Manage company property identities" ON property_identities;
CREATE POLICY "Manage company property identities"
  ON property_identities FOR ALL
  TO authenticated
  USING (company_id = private_schema.get_user_company_id())
  WITH CHECK (company_id = private_schema.get_user_company_id());

-- Future-proof event store for identity / matching / AI signals
CREATE TABLE IF NOT EXISTS intelligence_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  domain TEXT NOT NULL DEFAULT 'identity'
    CHECK (domain IN ('identity', 'matching', 'recommendations', 'analytics', 'ai')),
  event_type TEXT NOT NULL,
  entity_id UUID NULL,
  related_entity_id UUID NULL,
  confidence NUMERIC NULL,
  algorithm_version INTEGER NULL,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_by UUID NULL REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_intelligence_events_company_domain
  ON intelligence_events (company_id, domain, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_intelligence_events_entity
  ON intelligence_events (company_id, entity_id)
  WHERE entity_id IS NOT NULL;

ALTER TABLE intelligence_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "View company intelligence events" ON intelligence_events;
CREATE POLICY "View company intelligence events"
  ON intelligence_events FOR SELECT
  TO authenticated
  USING (company_id = private_schema.get_user_company_id());

DROP POLICY IF EXISTS "Insert company intelligence events" ON intelligence_events;
CREATE POLICY "Insert company intelligence events"
  ON intelligence_events FOR INSERT
  TO authenticated
  WITH CHECK (
    company_id = private_schema.get_user_company_id()
    AND created_by = private_schema.get_auth_user()
  );

COMMIT;
