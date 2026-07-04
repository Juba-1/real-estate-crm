BEGIN;

-- Remove overly permissive legacy policies
DROP POLICY IF EXISTS "Public Access" ON storage.objects;
DROP POLICY IF EXISTS "Auth Insert" ON storage.objects;
DROP POLICY IF EXISTS "Auth Delete" ON storage.objects;

-- Public read (marketing thumbnails / internal CRM display)
CREATE POLICY "property_media_public_read" ON storage.objects
  FOR SELECT
  USING (bucket_id = 'property_media');

-- Upload path must be: {company_id}/{user_id}/{filename}
CREATE POLICY "property_media_insert_own_company" ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'property_media'
    AND (storage.foldername(name))[1] = private_schema.get_user_company_id()::text
    AND (storage.foldername(name))[2] = (SELECT auth.uid())::text
  );

CREATE POLICY "property_media_update_own_or_admin" ON storage.objects
  FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'property_media'
    AND (storage.foldername(name))[1] = private_schema.get_user_company_id()::text
    AND (
      private_schema.is_admin()
      OR (storage.foldername(name))[2] = (SELECT auth.uid())::text
    )
  )
  WITH CHECK (
    bucket_id = 'property_media'
    AND (storage.foldername(name))[1] = private_schema.get_user_company_id()::text
    AND (
      private_schema.is_admin()
      OR (storage.foldername(name))[2] = (SELECT auth.uid())::text
    )
  );

CREATE POLICY "property_media_delete_own_or_admin" ON storage.objects
  FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'property_media'
    AND (storage.foldername(name))[1] = private_schema.get_user_company_id()::text
    AND (
      private_schema.is_admin()
      OR (storage.foldername(name))[2] = (SELECT auth.uid())::text
    )
  );

COMMIT;
