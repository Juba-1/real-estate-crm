-- Release 6A: Controlled property removal requests (manager approval)
-- Agents cannot hard-delete; admins approve / reject / archive-instead.

BEGIN;

-- Soft-archive status for "Archive Instead" (keeps row for KPIs)
-- properties.status is TEXT after enum flatten; app Zod will allow 'archived'.

CREATE TABLE IF NOT EXISTS public.property_removal_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies (id) ON DELETE CASCADE,
  property_id uuid REFERENCES public.properties (id) ON DELETE SET NULL,
  requested_by uuid NOT NULL REFERENCES public.users (id) ON DELETE CASCADE,
  reason_key text NOT NULL
    CHECK (reason_key IN (
      'mistake',
      'duplicate',
      'owner_withdrew',
      'wrong_info',
      'other'
    )),
  reason_detail text,
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN (
      'pending',
      'approved',
      'rejected',
      'archived_instead'
    )),
  decided_by uuid REFERENCES public.users (id) ON DELETE SET NULL,
  decided_at timestamptz,
  decision_note text,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT property_removal_reason_detail_len
    CHECK (reason_detail IS NULL OR char_length(reason_detail) <= 500),
  CONSTRAINT property_removal_decision_note_len
    CHECK (decision_note IS NULL OR char_length(decision_note) <= 500)
);

CREATE UNIQUE INDEX IF NOT EXISTS property_removal_one_pending_per_property
  ON public.property_removal_requests (property_id)
  WHERE status = 'pending' AND property_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_property_removal_company_status_created
  ON public.property_removal_requests (company_id, status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_property_removal_requested_by
  ON public.property_removal_requests (requested_by, created_at DESC);

ALTER TABLE public.property_removal_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "View company removal requests" ON public.property_removal_requests;
CREATE POLICY "View company removal requests"
  ON public.property_removal_requests
  FOR SELECT
  TO authenticated
  USING (
    company_id = private_schema.get_user_company_id()
    AND (
      private_schema.is_admin()
      OR requested_by = private_schema.get_auth_user()
    )
  );

DROP POLICY IF EXISTS "Insert own removal requests" ON public.property_removal_requests;
CREATE POLICY "Insert own removal requests"
  ON public.property_removal_requests
  FOR INSERT
  TO authenticated
  WITH CHECK (
    company_id = private_schema.get_user_company_id()
    AND requested_by = private_schema.get_auth_user()
    AND status = 'pending'
  );

DROP POLICY IF EXISTS "Admin decide removal requests" ON public.property_removal_requests;
CREATE POLICY "Admin decide removal requests"
  ON public.property_removal_requests
  FOR UPDATE
  TO authenticated
  USING (
    private_schema.is_admin()
    AND company_id = private_schema.get_user_company_id()
  )
  WITH CHECK (
    private_schema.is_admin()
    AND company_id = private_schema.get_user_company_id()
  );

COMMIT;
