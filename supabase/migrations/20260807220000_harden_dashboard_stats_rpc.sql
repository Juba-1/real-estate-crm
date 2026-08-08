-- Beta Readiness: harden get_tenant_dashboard_stats
-- Agents may only request their own agent-scoped aggregates.
-- Admins / super_admin may request company-wide (p_agent_id null) or scoped stats.
-- Revoke EXECUTE from anon (advisor WARN).

BEGIN;

CREATE OR REPLACE FUNCTION private_schema.get_tenant_dashboard_stats(
  p_company_id uuid,
  p_agent_id uuid DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, private_schema
AS $$
DECLARE
  v_caller_company uuid;
  v_is_super boolean;
  v_is_admin boolean;
  v_caller uuid;
  v_total bigint := 0;
  v_available bigint := 0;
  v_sold bigint := 0;
  v_rented bigint := 0;
  v_pending bigint := 0;
  v_active_requests bigint := 0;
  v_closed_value numeric := 0;
  v_status_dist jsonb := '[]'::jsonb;
  v_type_dist jsonb := '[]'::jsonb;
  v_agent_perf jsonb := '[]'::jsonb;
BEGIN
  v_caller := private_schema.get_auth_user();
  v_caller_company := private_schema.get_user_company_id();
  v_is_super := private_schema.is_super_admin();
  v_is_admin := private_schema.is_admin();

  IF v_caller IS NULL THEN
    RAISE EXCEPTION 'Unauthorized dashboard stats access';
  END IF;

  IF NOT v_is_super AND (v_caller_company IS NULL OR v_caller_company <> p_company_id) THEN
    RAISE EXCEPTION 'Unauthorized dashboard stats access';
  END IF;

  -- Non-admin tenants must scope to themselves (never company-wide agentPerformance).
  IF NOT v_is_super AND NOT v_is_admin THEN
    IF p_agent_id IS NULL OR p_agent_id <> v_caller THEN
      RAISE EXCEPTION 'Unauthorized dashboard stats access';
    END IF;
  END IF;

  SELECT
    COUNT(*)::bigint,
    COUNT(*) FILTER (WHERE status = 'available')::bigint,
    COUNT(*) FILTER (WHERE status = 'sold')::bigint,
    COUNT(*) FILTER (WHERE status = 'rented')::bigint,
    COUNT(*) FILTER (WHERE status = 'pending')::bigint,
    COALESCE(SUM(price) FILTER (WHERE status IN ('sold', 'rented')), 0)
  INTO v_total, v_available, v_sold, v_rented, v_pending, v_closed_value
  FROM public.properties
  WHERE company_id = p_company_id
    AND (p_agent_id IS NULL OR agent_id = p_agent_id);

  SELECT COUNT(*)::bigint
  INTO v_active_requests
  FROM public.requests
  WHERE company_id = p_company_id
    AND status = 'active'
    AND expires_at >= now()
    AND (p_agent_id IS NULL OR agent_id = p_agent_id);

  SELECT COALESCE(jsonb_agg(row_to_json(s)), '[]'::jsonb)
  INTO v_status_dist
  FROM (
    SELECT status, COUNT(*)::bigint AS count
    FROM public.properties
    WHERE company_id = p_company_id
      AND (p_agent_id IS NULL OR agent_id = p_agent_id)
    GROUP BY status
  ) s;

  SELECT COALESCE(jsonb_agg(row_to_json(t)), '[]'::jsonb)
  INTO v_type_dist
  FROM (
    SELECT type, COUNT(*)::bigint AS count
    FROM public.properties
    WHERE company_id = p_company_id
      AND (p_agent_id IS NULL OR agent_id = p_agent_id)
    GROUP BY type
  ) t;

  IF p_agent_id IS NULL THEN
    SELECT COALESCE(jsonb_agg(row_to_json(a) ORDER BY a.total_added DESC), '[]'::jsonb)
    INTO v_agent_perf
    FROM (
      SELECT
        p.agent_id,
        COALESCE(u.name, 'Unknown agent') AS agent_name,
        COUNT(*)::bigint AS total_added,
        COUNT(*) FILTER (WHERE p.status = 'sold')::bigint AS total_sold,
        COUNT(*) FILTER (WHERE p.status = 'rented')::bigint AS total_rented
      FROM public.properties p
      LEFT JOIN public.users u ON u.id = p.agent_id
      WHERE p.company_id = p_company_id
      GROUP BY p.agent_id, u.name
    ) a;
  END IF;

  RETURN jsonb_build_object(
    'totalProperties', v_total,
    'available', v_available,
    'sold', v_sold,
    'rented', v_rented,
    'pending', v_pending,
    'activeRequests', v_active_requests,
    'closedDealsValue', v_closed_value,
    'statusDistribution', v_status_dist,
    'typeDistribution', v_type_dist,
    'agentPerformance', v_agent_perf
  );
END;
$$;

REVOKE ALL ON FUNCTION private_schema.get_tenant_dashboard_stats(uuid, uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION private_schema.get_tenant_dashboard_stats(uuid, uuid) FROM anon;
GRANT EXECUTE ON FUNCTION private_schema.get_tenant_dashboard_stats(uuid, uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.get_tenant_dashboard_stats(
  p_company_id uuid,
  p_agent_id uuid DEFAULT NULL
)
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, private_schema
AS $$
  SELECT private_schema.get_tenant_dashboard_stats(p_company_id, p_agent_id);
$$;

REVOKE ALL ON FUNCTION public.get_tenant_dashboard_stats(uuid, uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_tenant_dashboard_stats(uuid, uuid) FROM anon;
GRANT EXECUTE ON FUNCTION public.get_tenant_dashboard_stats(uuid, uuid) TO authenticated;

COMMIT;
