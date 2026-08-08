BEGIN;

-- =========================================================
-- Release 3: Global self-learning dictionary (platform-wide)
-- One table for all categories — extensible without redesign.
-- =========================================================

CREATE TABLE IF NOT EXISTS dictionary_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category TEXT NOT NULL
    CHECK (category IN ('property_type', 'city', 'district')),
  value TEXT NOT NULL,
  normalized_value TEXT NOT NULL,
  -- For district: parent city name (built-in or approved city value).
  -- NULL for property_type / city.
  parent_value TEXT NULL,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'approved', 'rejected', 'archived')),
  usage_count INTEGER NOT NULL DEFAULT 0 CHECK (usage_count >= 0),
  submitted_by UUID NULL REFERENCES users(id) ON DELETE SET NULL,
  submitted_company_id UUID NULL REFERENCES companies(id) ON DELETE SET NULL,
  reviewed_by UUID NULL REFERENCES users(id) ON DELETE SET NULL,
  reviewed_at TIMESTAMPTZ NULL,
  approved_at TIMESTAMPTZ NULL,
  rejection_note TEXT NULL,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- One pending/approved value per category (+ parent for districts).
CREATE UNIQUE INDEX IF NOT EXISTS uq_dictionary_active_normalized
  ON dictionary_entries (category, normalized_value, COALESCE(parent_value, ''))
  WHERE status IN ('pending', 'approved');

CREATE INDEX IF NOT EXISTS idx_dictionary_status_category
  ON dictionary_entries (status, category);

CREATE INDEX IF NOT EXISTS idx_dictionary_category_normalized
  ON dictionary_entries (category, normalized_value);

CREATE INDEX IF NOT EXISTS idx_dictionary_parent
  ON dictionary_entries (parent_value)
  WHERE parent_value IS NOT NULL;

CREATE OR REPLACE FUNCTION private_schema.set_dictionary_updated_at()
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

DROP TRIGGER IF EXISTS trg_dictionary_updated_at ON dictionary_entries;
CREATE TRIGGER trg_dictionary_updated_at
  BEFORE UPDATE ON dictionary_entries
  FOR EACH ROW
  EXECUTE FUNCTION private_schema.set_dictionary_updated_at();

ALTER TABLE dictionary_entries ENABLE ROW LEVEL SECURITY;

-- Approved values are globally readable by any authenticated tenant user.
CREATE POLICY "View approved dictionary entries"
  ON dictionary_entries FOR SELECT
  TO authenticated
  USING (
    status = 'approved'
    OR submitted_by = private_schema.get_auth_user()
    OR private_schema.is_super_admin()
  );

-- Employees / company admins may only insert their own pending suggestions.
-- Super admins may insert any status (seed / admin-created).
CREATE POLICY "Insert pending dictionary suggestions"
  ON dictionary_entries FOR INSERT
  TO authenticated
  WITH CHECK (
    private_schema.is_super_admin()
    OR (
      status = 'pending'
      AND submitted_by = private_schema.get_auth_user()
      AND submitted_company_id = private_schema.get_user_company_id()
    )
  );

-- Only super_admin may update / delete (review workflow).
CREATE POLICY "Super admins manage dictionary entries"
  ON dictionary_entries FOR ALL
  TO authenticated
  USING (private_schema.is_super_admin())
  WITH CHECK (private_schema.is_super_admin());

COMMIT;
