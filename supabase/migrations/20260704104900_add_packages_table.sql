BEGIN;

CREATE TABLE packages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  max_properties INTEGER NOT NULL CHECK (max_properties > 0),
  max_agents INTEGER NOT NULL CHECK (max_agents > 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE companies
  ADD COLUMN IF NOT EXISTS package_id UUID REFERENCES packages(id) ON DELETE SET NULL;

ALTER TABLE packages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Super admins manage packages" ON packages
  FOR ALL
  TO authenticated
  USING (private_schema.is_super_admin())
  WITH CHECK (private_schema.is_super_admin());

INSERT INTO packages (name, max_properties, max_agents) VALUES
  ('الباقة الأساسية', 50, 3),
  ('الباقة المتقدمة', 200, 10),
  ('الباقة اللامحدودة', 9999, 99);

COMMIT;
