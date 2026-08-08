BEGIN;

-- Document existing production column used by the app when is_direct = false.
-- Column already present on remote; IF NOT EXISTS makes this safe to apply.
ALTER TABLE properties
  ADD COLUMN IF NOT EXISTS intermediaries TEXT;

COMMIT;
