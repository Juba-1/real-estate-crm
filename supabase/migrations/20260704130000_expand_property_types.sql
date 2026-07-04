BEGIN;

ALTER TABLE properties ALTER COLUMN type TYPE TEXT USING type::text;
ALTER TABLE requests ALTER COLUMN type TYPE TEXT USING type::text;

UPDATE properties
SET type = CASE type
  WHEN 'apartment' THEN 'شقة'
  WHEN 'villa' THEN 'فيلا'
  WHEN 'land' THEN 'أرض'
  WHEN 'commercial' THEN 'محل'
  WHEN 'building' THEN 'عمارة'
  ELSE type
END;

UPDATE requests
SET type = CASE type
  WHEN 'apartment' THEN 'شقة'
  WHEN 'villa' THEN 'فيلا'
  WHEN 'land' THEN 'أرض'
  WHEN 'commercial' THEN 'محل'
  WHEN 'building' THEN 'عمارة'
  ELSE type
END;

DROP TYPE IF EXISTS property_type;

ALTER TABLE properties
  ADD COLUMN IF NOT EXISTS custom_property_type TEXT,
  ADD COLUMN IF NOT EXISTS custom_neighborhood TEXT,
  ADD COLUMN IF NOT EXISTS floors_count INTEGER
    CHECK (floors_count IS NULL OR floors_count > 0),
  ADD COLUMN IF NOT EXISTS apartments_count INTEGER
    CHECK (apartments_count IS NULL OR apartments_count > 0),
  ADD COLUMN IF NOT EXISTS shops_count INTEGER
    CHECK (shops_count IS NULL OR shops_count > 0),
  ADD COLUMN IF NOT EXISTS has_annex BOOLEAN;

ALTER TABLE requests
  ADD COLUMN IF NOT EXISTS custom_property_type TEXT,
  ADD COLUMN IF NOT EXISTS custom_neighborhood TEXT;

COMMIT;
