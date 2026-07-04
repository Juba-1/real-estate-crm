BEGIN;
CREATE POLICY "Auth Delete" ON storage.objects FOR DELETE USING ( bucket_id = 'property_media' AND auth.role() = 'authenticated' );
COMMIT;