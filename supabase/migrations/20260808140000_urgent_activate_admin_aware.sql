-- Release 6B: Admin-aware urgent activation.
-- Transfer scope = target row's agent_id (one urgent per agent).
-- Caller must be that agent OR company admin.

BEGIN;

CREATE OR REPLACE FUNCTION public.activate_urgent_property(p_property_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  v_agent_id uuid;
  v_company_id uuid;
  v_auth uuid := private_schema.get_auth_user();
BEGIN
  SELECT agent_id, company_id
  INTO v_agent_id, v_company_id
  FROM public.properties
  WHERE id = p_property_id;

  IF v_agent_id IS NULL THEN
    RETURN;
  END IF;

  IF NOT (
    v_auth = v_agent_id
    OR (
      private_schema.is_admin()
      AND private_schema.get_user_company_id() = v_company_id
    )
  ) THEN
    RAISE EXCEPTION 'not authorized to activate urgent on this property'
      USING ERRCODE = '42501';
  END IF;

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
  v_agent_id uuid;
  v_company_id uuid;
  v_auth uuid := private_schema.get_auth_user();
BEGIN
  SELECT agent_id, company_id
  INTO v_agent_id, v_company_id
  FROM public.requests
  WHERE id = p_request_id;

  IF v_agent_id IS NULL THEN
    RETURN;
  END IF;

  IF NOT (
    v_auth = v_agent_id
    OR (
      private_schema.is_admin()
      AND private_schema.get_user_company_id() = v_company_id
    )
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
