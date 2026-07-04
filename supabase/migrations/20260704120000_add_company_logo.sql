BEGIN;

ALTER TABLE companies
  ADD COLUMN IF NOT EXISTS logo_url TEXT;

INSERT INTO storage.buckets (id, name, public)
VALUES ('company_logos', 'company_logos', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Public company logo access" ON storage.objects
  FOR SELECT
  USING (bucket_id = 'company_logos');

CREATE POLICY "Admins upload company logos" ON storage.objects
  FOR INSERT
  WITH CHECK (
    bucket_id = 'company_logos'
    AND auth.role() = 'authenticated'
    AND private_schema.is_admin()
    AND (storage.foldername(name))[1] = private_schema.get_user_company_id()::text
  );

CREATE POLICY "Admins update company logos" ON storage.objects
  FOR UPDATE
  USING (
    bucket_id = 'company_logos'
    AND auth.role() = 'authenticated'
    AND private_schema.is_admin()
    AND (storage.foldername(name))[1] = private_schema.get_user_company_id()::text
  )
  WITH CHECK (
    bucket_id = 'company_logos'
    AND auth.role() = 'authenticated'
    AND private_schema.is_admin()
    AND (storage.foldername(name))[1] = private_schema.get_user_company_id()::text
  );

CREATE POLICY "Admins delete company logos" ON storage.objects
  FOR DELETE
  USING (
    bucket_id = 'company_logos'
    AND auth.role() = 'authenticated'
    AND private_schema.is_admin()
    AND (storage.foldername(name))[1] = private_schema.get_user_company_id()::text
  );

CREATE POLICY "Admins update own company branding" ON companies
  FOR UPDATE
  TO authenticated
  USING (
    id = private_schema.get_user_company_id()
    AND private_schema.is_admin()
  )
  WITH CHECK (
    id = private_schema.get_user_company_id()
    AND private_schema.is_admin()
  );

COMMIT;
