-- Phase 31: Flatten strict ENUMs to TEXT and normalize property type keys.
-- Run this in the Supabase SQL Editor (safe to re-run).

BEGIN;

-- ---------------------------------------------------------------------------
-- 1. Flatten ENUM columns on properties & requests to TEXT
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
-- 2. Drop unused ENUM types (user_role stays on users.role)
-- ---------------------------------------------------------------------------

DROP TYPE IF EXISTS property_type;
DROP TYPE IF EXISTS offer_type;
DROP TYPE IF EXISTS property_status;
DROP TYPE IF EXISTS request_status;
DROP TYPE IF EXISTS visibility_type;

-- ---------------------------------------------------------------------------
-- 3. Normalize legacy Arabic / old English enum values → canonical keys
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
-- 4. Ensure all frontend-expected columns exist
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

-- city already exists on both tables from init schema; IF NOT EXISTS is harmless.

COMMIT;
