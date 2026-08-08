BEGIN;

-- ==========================================
-- Urgent Listings & Requests (Release 2)
-- One urgent property + one urgent request per employee (agent_id).
-- No is_urgent/priority column — urgency is derived from urgent_until > NOW().
-- No cron: expiry is computed at read time by the application.
-- ==========================================

ALTER TABLE properties
  ADD COLUMN IF NOT EXISTS urgent_until TIMESTAMPTZ NULL;

ALTER TABLE requests
  ADD COLUMN IF NOT EXISTS urgent_until TIMESTAMPTZ NULL;

-- Partial indexes: only rows that are currently or were recently urgent are indexed.
CREATE INDEX IF NOT EXISTS idx_properties_urgent_until
  ON properties (urgent_until)
  WHERE urgent_until IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_requests_urgent_until
  ON requests (urgent_until)
  WHERE urgent_until IS NOT NULL;

-- ==========================================
-- Atomic "activate urgent" functions.
--
-- Each function performs ONE UPDATE statement (inherently one transaction)
-- that simultaneously:
--   1. Clears urgent_until on any OTHER active-urgent row owned by the
--      same agent (the "transfer" behavior), and
--   2. Sets urgent_until = now() + 7 days on the target row.
--
-- SECURITY INVOKER (the default) — RLS is fully enforced for every row
-- touched, exactly as if the caller ran the UPDATE directly. This does not
-- bypass tenant isolation or existing "Update/Delete" policies.
-- ==========================================

CREATE OR REPLACE FUNCTION public.activate_urgent_property(p_property_id uuid)
RETURNS void
LANGUAGE sql
SECURITY INVOKER
SET search_path = public
AS $$
  UPDATE properties
  SET urgent_until = CASE
      WHEN id = p_property_id THEN now() + INTERVAL '7 days'
      ELSE NULL
    END
  WHERE agent_id = private_schema.get_auth_user()
    AND (
      id = p_property_id
      OR (urgent_until IS NOT NULL AND urgent_until > now())
    );
$$;

REVOKE ALL ON FUNCTION public.activate_urgent_property(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.activate_urgent_property(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.activate_urgent_request(p_request_id uuid)
RETURNS void
LANGUAGE sql
SECURITY INVOKER
SET search_path = public
AS $$
  UPDATE requests
  SET urgent_until = CASE
      WHEN id = p_request_id THEN now() + INTERVAL '7 days'
      ELSE NULL
    END
  WHERE agent_id = private_schema.get_auth_user()
    AND (
      id = p_request_id
      OR (urgent_until IS NOT NULL AND urgent_until > now())
    );
$$;

REVOKE ALL ON FUNCTION public.activate_urgent_request(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.activate_urgent_request(uuid) TO authenticated;

COMMIT;
