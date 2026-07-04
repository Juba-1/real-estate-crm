BEGIN;

CREATE TABLE system_settings (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE system_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Super admins manage system settings" ON system_settings
  FOR ALL
  TO authenticated
  USING (private_schema.is_super_admin())
  WITH CHECK (private_schema.is_super_admin());

INSERT INTO system_settings (key, value) VALUES
  ('platformName', '"نظام إدارة العقارات"'::jsonb),
  ('supportEmail', '"support@system.com"'::jsonb),
  ('defaultCurrency', '"SAR"'::jsonb),
  ('maintenanceMode', 'false'::jsonb)
ON CONFLICT (key) DO NOTHING;

COMMIT;
