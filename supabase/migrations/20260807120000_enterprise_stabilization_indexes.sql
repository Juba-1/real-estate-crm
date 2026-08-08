-- Release 5.5H: hot-path indexes + dashboard aggregate RPC
-- Idempotent. Supports enterprise list/search/dashboard workloads.

BEGIN;

-- ---------------------------------------------------------------------------
-- Properties: company listing / search / agent inventory
-- ---------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_properties_company_status_created
  ON public.properties (company_id, status, created_at DESC, id DESC);

CREATE INDEX IF NOT EXISTS idx_properties_company_search
  ON public.properties (company_id, status, city, type, offer_type, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_properties_agent_created
  ON public.properties (agent_id, created_at DESC, id DESC);

CREATE INDEX IF NOT EXISTS idx_properties_company_agent_status
  ON public.properties (company_id, agent_id, status);

CREATE INDEX IF NOT EXISTS idx_properties_company_type
  ON public.properties (company_id, type);

-- ---------------------------------------------------------------------------
-- Requests: active company feed
-- ---------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_requests_company_active_feed
  ON public.requests (company_id, status, expires_at, created_at DESC, id DESC);

CREATE INDEX IF NOT EXISTS idx_requests_agent_created
  ON public.requests (agent_id, created_at DESC, id DESC);

-- ---------------------------------------------------------------------------
-- property_owners join for my-properties edit payloads
-- ---------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_property_owners_property_id
  ON public.property_owners (property_id);

-- ---------------------------------------------------------------------------
-- Dashboard aggregates (SECURITY DEFINER + tenant gate)
-- ---------------------------------------------------------------------------
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
  v_caller_company := private_schema.get_user_company_id();
  v_is_super := private_schema.is_super_admin();

  IF NOT v_is_super AND (v_caller_company IS NULL OR v_caller_company <> p_company_id) THEN
    RAISE EXCEPTION 'Unauthorized dashboard stats access';
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
GRANT EXECUTE ON FUNCTION private_schema.get_tenant_dashboard_stats(uuid, uuid) TO authenticated;

-- Public wrapper for PostgREST rpc() (same authz gate inside private_schema).
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
GRANT EXECUTE ON FUNCTION public.get_tenant_dashboard_stats(uuid, uuid) TO authenticated;

COMMIT;
