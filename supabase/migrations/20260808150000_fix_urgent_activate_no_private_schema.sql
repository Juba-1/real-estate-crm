-- Release 6B hotfix: activate_urgent_* must not reference private_schema.
--
-- Root cause:
--   SECURITY INVOKER RPCs called private_schema.get_auth_user / is_admin /
--   get_user_company_id. authenticated has EXECUTE on those helpers but
--   intentionally has NO USAGE on schema private_schema (helpers are for RLS
--   policy evaluation). Invoker RPCs therefore fail with:
--   "permission denied for schema private_schema".
--
-- Fix:
--   Keep SECURITY INVOKER + RLS. Use auth.uid() and public.users for identity /
--   admin / company checks. Do NOT grant USAGE on private_schema.
--   Do NOT use SECURITY DEFINER or service_role.

BEGIN;

CREATE OR REPLACE FUNCTION public.activate_urgent_property(p_property_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  v_auth uuid := auth.uid();
  v_agent_id uuid;
  v_company_id uuid;
  v_caller_company uuid;
  v_caller_is_admin boolean;
BEGIN
  IF v_auth IS NULL THEN
    RAISE EXCEPTION 'not authenticated'
      USING ERRCODE = '42501';
  END IF;

  SELECT agent_id, company_id
  INTO v_agent_id, v_company_id
  FROM public.properties
  WHERE id = p_property_id;

  IF v_agent_id IS NULL THEN
    RAISE EXCEPTION 'property not found'
      USING ERRCODE = 'P0002';
  END IF;

  SELECT u.company_id, (u.role IN ('admin', 'super_admin'))
  INTO v_caller_company, v_caller_is_admin
  FROM public.users u
  WHERE u.id = v_auth;

  IF v_caller_company IS NULL THEN
    RAISE EXCEPTION 'not authorized'
      USING ERRCODE = '42501';
  END IF;

  -- Owner agent OR same-company admin only (mirrors app-layer assertCanManageProperty).
  IF NOT (
    v_auth = v_agent_id
    OR (v_caller_is_admin AND v_caller_company = v_company_id)
  ) THEN
    RAISE EXCEPTION 'not authorized to activate urgent on this property'
      USING ERRCODE = '42501';
  END IF;

  -- One urgent property per listing owner (agent_id slot), 7-day window.
  UPDATE public.properties
  SET urgent_until = CASE
      WHEN id = p_property_id THEN now() + INTERVAL '7 days'
      ELSE NULL
    END
  WHERE agent_id = v_agent_id
    AND (
      id = p_property_id
      OR (urgent_until IS NOT NULL AND urgent_until > now())
    );
END;
$$;

REVOKE ALL ON FUNCTION public.activate_urgent_property(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.activate_urgent_property(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.activate_urgent_request(p_request_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  v_auth uuid := auth.uid();
  v_agent_id uuid;
  v_company_id uuid;
  v_caller_company uuid;
  v_caller_is_admin boolean;
BEGIN
  IF v_auth IS NULL THEN
    RAISE EXCEPTION 'not authenticated'
      USING ERRCODE = '42501';
  END IF;

  SELECT agent_id, company_id
  INTO v_agent_id, v_company_id
  FROM public.requests
  WHERE id = p_request_id;

  IF v_agent_id IS NULL THEN
    RAISE EXCEPTION 'request not found'
      USING ERRCODE = 'P0002';
  END IF;

  SELECT u.company_id, (u.role IN ('admin', 'super_admin'))
  INTO v_caller_company, v_caller_is_admin
  FROM public.users u
  WHERE u.id = v_auth;

  IF v_caller_company IS NULL THEN
    RAISE EXCEPTION 'not authorized'
      USING ERRCODE = '42501';
  END IF;

  IF NOT (
    v_auth = v_agent_id
    OR (v_caller_is_admin AND v_caller_company = v_company_id)
  ) THEN
    RAISE EXCEPTION 'not authorized to activate urgent on this request'
      USING ERRCODE = '42501';
  END IF;

  UPDATE public.requests
  SET urgent_until = CASE
      WHEN id = p_request_id THEN now() + INTERVAL '7 days'
      ELSE NULL
    END
  WHERE agent_id = v_agent_id
    AND (
      id = p_request_id
      OR (urgent_until IS NOT NULL AND urgent_until > now())
    );
END;
$$;

REVOKE ALL ON FUNCTION public.activate_urgent_request(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.activate_urgent_request(uuid) TO authenticated;

COMMIT;
