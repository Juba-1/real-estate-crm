-- Release 5B: Smart Opportunity Notifications
-- Anti-spam receipts + optional deep-link on notifications.
-- Idempotent. Reuses existing notifications + push channels.

BEGIN;

-- ---------------------------------------------------------------------------
-- Optional deep link for in-app notifications (backward compatible)
-- ---------------------------------------------------------------------------
ALTER TABLE public.notifications
  ADD COLUMN IF NOT EXISTS link_path TEXT;

-- ---------------------------------------------------------------------------
-- Opportunity notification receipts (dedupe / cooldown / meaningful change)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.opportunity_notification_receipts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  fingerprint TEXT NOT NULL,
  property_id UUID NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
  request_id UUID NOT NULL REFERENCES public.requests(id) ON DELETE CASCADE,
  recipient_user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  last_confidence NUMERIC(5, 2) NOT NULL,
  last_priority TEXT NOT NULL
    CHECK (last_priority IN ('critical', 'high', 'normal', 'low')),
  last_level TEXT NOT NULL,
  last_event_type TEXT NOT NULL,
  last_notified_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT opportunity_notification_receipts_unique
    UNIQUE (company_id, fingerprint, recipient_user_id)
);

CREATE INDEX IF NOT EXISTS idx_opp_notify_receipts_company_fp
  ON public.opportunity_notification_receipts (company_id, fingerprint);

CREATE INDEX IF NOT EXISTS idx_opp_notify_receipts_recipient
  ON public.opportunity_notification_receipts (recipient_user_id, last_notified_at DESC);

ALTER TABLE public.opportunity_notification_receipts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users read own opportunity receipts" ON public.opportunity_notification_receipts;
CREATE POLICY "Users read own opportunity receipts"
  ON public.opportunity_notification_receipts
  FOR SELECT
  TO authenticated
  USING (
    company_id = private_schema.get_user_company_id()
    AND (
      recipient_user_id = private_schema.get_auth_user()
      OR private_schema.is_admin()
    )
  );

-- Writes go through service role from trusted server notify path (no authenticated INSERT).

COMMIT;
