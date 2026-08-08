BEGIN;

-- Health check: push_subscriptions had policies but RLS was disabled.
-- Re-enable RLS and ensure the tenant-scoped policy exists.
-- Service-role fan-out (sendCompanyPushNotification) bypasses RLS by design.
-- Authenticated upsert/delete (savePushSubscription / removePushSubscription)
-- continues to work via user_id + company_id policy.

ALTER TABLE push_subscriptions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users manage own push subscriptions" ON push_subscriptions;

CREATE POLICY "Users manage own push subscriptions" ON push_subscriptions
  FOR ALL
  TO authenticated
  USING (
    user_id = private_schema.get_auth_user()
    AND company_id = private_schema.get_user_company_id()
  )
  WITH CHECK (
    user_id = private_schema.get_auth_user()
    AND company_id = private_schema.get_user_company_id()
  );

COMMIT;
