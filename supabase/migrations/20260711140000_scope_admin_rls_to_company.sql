BEGIN;

-- ---------------------------------------------------------------------------
-- Fix: admin RLS branches on properties, property_owners, and requests were
-- not scoped to company_id, allowing cross-tenant access for is_admin().
-- ---------------------------------------------------------------------------

DROP POLICY IF EXISTS "Update/Delete properties" ON properties;
CREATE POLICY "Update/Delete properties" ON properties FOR ALL
  TO authenticated
  USING (
    (agent_id = private_schema.get_auth_user())
    OR (
      private_schema.is_admin()
      AND company_id = private_schema.get_user_company_id()
    )
  )
  WITH CHECK (
    (agent_id = private_schema.get_auth_user())
    OR (
      private_schema.is_admin()
      AND company_id = private_schema.get_user_company_id()
    )
  );

DROP POLICY IF EXISTS "View property owners" ON property_owners;
CREATE POLICY "View property owners" ON property_owners FOR SELECT
  TO authenticated
  USING (
    (agent_id = private_schema.get_auth_user())
    OR (
      private_schema.is_admin()
      AND company_id = private_schema.get_user_company_id()
    )
  );

DROP POLICY IF EXISTS "Update/Delete property owners" ON property_owners;
CREATE POLICY "Update/Delete property owners" ON property_owners FOR ALL
  TO authenticated
  USING (
    (agent_id = private_schema.get_auth_user())
    OR (
      private_schema.is_admin()
      AND company_id = private_schema.get_user_company_id()
    )
  )
  WITH CHECK (
    (agent_id = private_schema.get_auth_user())
    OR (
      private_schema.is_admin()
      AND company_id = private_schema.get_user_company_id()
    )
  );

DROP POLICY IF EXISTS "Update/Delete requests" ON requests;
CREATE POLICY "Update/Delete requests" ON requests FOR ALL
  TO authenticated
  USING (
    (agent_id = private_schema.get_auth_user())
    OR (
      private_schema.is_admin()
      AND company_id = private_schema.get_user_company_id()
    )
  )
  WITH CHECK (
    (agent_id = private_schema.get_auth_user())
    OR (
      private_schema.is_admin()
      AND company_id = private_schema.get_user_company_id()
    )
  );

COMMIT;
