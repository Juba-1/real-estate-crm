BEGIN;

CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  is_read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_notifications_user_created_at
  ON notifications (user_id, created_at DESC);

CREATE INDEX idx_notifications_user_unread
  ON notifications (user_id)
  WHERE is_read = false;

ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own notifications" ON notifications
  FOR SELECT
  TO authenticated
  USING (user_id = private_schema.get_auth_user());

CREATE POLICY "Users mark own notifications read" ON notifications
  FOR UPDATE
  TO authenticated
  USING (user_id = private_schema.get_auth_user())
  WITH CHECK (user_id = private_schema.get_auth_user());

COMMIT;
