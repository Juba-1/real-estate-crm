-- Phase 31 (revised): Flatten strict ENUMs to TEXT and normalize property type keys.
-- Drops dependent RLS policies first, alters columns, then recreates policies.
-- Safe to run in Supabase SQL Editor.

BEGIN;

-- ---------------------------------------------------------------------------
-- 1. Drop RLS policies that block column type changes
--    ("View properties" references visibility; drop all properties/requests
--     policies to avoid any dependency issues during ALTER COLUMN)
-- ---------------------------------------------------------------------------

DROP POLICY IF EXISTS "View properties" ON properties;
DROP POLICY IF EXISTS "Insert properties" ON properties;
DROP POLICY IF EXISTS "Update/Delete properties" ON properties;

DROP POLICY IF EXISTS "View company requests" ON requests;
DROP POLICY IF EXISTS "Insert requests" ON requests;
DROP POLICY IF EXISTS "Update/Delete requests" ON requests;

-- ---------------------------------------------------------------------------
-- 2. Flatten ENUM columns on properties & requests to TEXT
-- ---------------------------------------------------------------------------

ALTER TABLE properties
  ALTER COLUMN type TYPE TEXT USING type::text;

ALTER TABLE requests
  ALTER COLUMN type TYPE TEXT USING type::text;

ALTER TABLE properties
  ALTER COLUMN offer_type TYPE TEXT USING offer_type::text;

ALTER TABLE requests
  ALTER COLUMN offer_type TYPE TEXT USING offer_type::text;

ALTER TABLE properties
  ALTER COLUMN status TYPE TEXT USING status::text;

ALTER TABLE properties
  ALTER COLUMN visibility TYPE TEXT USING visibility::text;

ALTER TABLE requests
  ALTER COLUMN status TYPE TEXT USING status::text;

-- ---------------------------------------------------------------------------
-- 3. Drop unused ENUM types (user_role stays on users.role)
-- ---------------------------------------------------------------------------

DROP TYPE IF EXISTS property_type;
DROP TYPE IF EXISTS offer_type;
DROP TYPE IF EXISTS property_status;
DROP TYPE IF EXISTS request_status;
DROP TYPE IF EXISTS visibility_type;

-- ---------------------------------------------------------------------------
-- 4. Normalize legacy Arabic / old English enum values → canonical keys
-- ---------------------------------------------------------------------------

UPDATE properties
SET type = CASE type
  WHEN 'شقة' THEN 'apartment'
  WHEN 'شقة دوبلكس' THEN 'duplex_apartment'
  WHEN 'فيلا' THEN 'villa'
  WHEN 'فيلا دوبلكس' THEN 'duplex_villa'
  WHEN 'عمارة' THEN 'building'
  WHEN 'أرض' THEN 'land'
  WHEN 'محل' THEN 'shop'
  WHEN 'معرض' THEN 'showroom'
  WHEN 'مستودع' THEN 'warehouse'
  WHEN 'استراحة' THEN 'rest_house'
  WHEN 'مزرعة' THEN 'farm'
  WHEN 'شاليه' THEN 'chalet'
  WHEN 'أخرى' THEN 'other'
  WHEN 'apartment' THEN 'apartment'
  WHEN 'villa' THEN 'villa'
  WHEN 'land' THEN 'land'
  WHEN 'commercial' THEN 'shop'
  WHEN 'building' THEN 'building'
  ELSE type
END
WHERE type IS NOT NULL;

UPDATE requests
SET type = CASE type
  WHEN 'شقة' THEN 'apartment'
  WHEN 'شقة دوبلكس' THEN 'duplex_apartment'
  WHEN 'فيلا' THEN 'villa'
  WHEN 'فيلا دوبلكس' THEN 'duplex_villa'
  WHEN 'عمارة' THEN 'building'
  WHEN 'أرض' THEN 'land'
  WHEN 'محل' THEN 'shop'
  WHEN 'معرض' THEN 'showroom'
  WHEN 'مستودع' THEN 'warehouse'
  WHEN 'استراحة' THEN 'rest_house'
  WHEN 'مزرعة' THEN 'farm'
  WHEN 'شاليه' THEN 'chalet'
  WHEN 'أخرى' THEN 'other'
  WHEN 'apartment' THEN 'apartment'
  WHEN 'villa' THEN 'villa'
  WHEN 'land' THEN 'land'
  WHEN 'commercial' THEN 'shop'
  WHEN 'building' THEN 'building'
  ELSE type
END
WHERE type IS NOT NULL;

-- ---------------------------------------------------------------------------
-- 5. Ensure all frontend-expected columns exist
-- ---------------------------------------------------------------------------

ALTER TABLE properties
  ADD COLUMN IF NOT EXISTS custom_property_type TEXT,
  ADD COLUMN IF NOT EXISTS custom_neighborhood TEXT,
  ADD COLUMN IF NOT EXISTS city TEXT,
  ADD COLUMN IF NOT EXISTS floors_count INTEGER
    CHECK (floors_count IS NULL OR floors_count > 0),
  ADD COLUMN IF NOT EXISTS apartments_count INTEGER
    CHECK (apartments_count IS NULL OR apartments_count > 0),
  ADD COLUMN IF NOT EXISTS shops_count INTEGER
    CHECK (shops_count IS NULL OR shops_count > 0),
  ADD COLUMN IF NOT EXISTS has_annex BOOLEAN;

ALTER TABLE requests
  ADD COLUMN IF NOT EXISTS custom_property_type TEXT,
  ADD COLUMN IF NOT EXISTS custom_neighborhood TEXT,
  ADD COLUMN IF NOT EXISTS city TEXT;

-- ---------------------------------------------------------------------------
-- 6. Recreate RLS policies (exact originals from init schema)
-- ---------------------------------------------------------------------------

CREATE POLICY "View properties" ON properties FOR SELECT
  TO authenticated
  USING (company_id = private_schema.get_user_company_id() OR visibility = 'global');

CREATE POLICY "Insert properties" ON properties FOR INSERT
  TO authenticated
  WITH CHECK (company_id = private_schema.get_user_company_id() AND agent_id = private_schema.get_auth_user());

CREATE POLICY "Update/Delete properties" ON properties FOR ALL
  TO authenticated
  USING ((agent_id = private_schema.get_auth_user()) OR private_schema.is_admin())
  WITH CHECK ((agent_id = private_schema.get_auth_user()) OR private_schema.is_admin());

CREATE POLICY "View company requests" ON requests FOR SELECT
  TO authenticated
  USING (company_id = private_schema.get_user_company_id());

CREATE POLICY "Insert requests" ON requests FOR INSERT
  TO authenticated
  WITH CHECK (company_id = private_schema.get_user_company_id() AND agent_id = private_schema.get_auth_user());

CREATE POLICY "Update/Delete requests" ON requests FOR ALL
  TO authenticated
  USING ((agent_id = private_schema.get_auth_user()) OR private_schema.is_admin())
  WITH CHECK ((agent_id = private_schema.get_auth_user()) OR private_schema.is_admin());

COMMIT;
