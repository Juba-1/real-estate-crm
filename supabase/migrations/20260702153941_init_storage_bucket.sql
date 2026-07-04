BEGIN;
INSERT INTO storage.buckets (id, name, public) VALUES ('property_media', 'property_media', true) ON CONFLICT DO NOTHING;
CREATE POLICY "Public Access" ON storage.objects FOR SELECT USING ( bucket_id = 'property_media' );
CREATE POLICY "Auth Insert" ON storage.objects FOR INSERT WITH CHECK ( bucket_id = 'property_media' AND auth.role() = 'authenticated' );
COMMIT;