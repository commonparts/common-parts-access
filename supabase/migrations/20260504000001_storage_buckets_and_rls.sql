-- ============================================================================
-- Storage buckets and RLS policies
-- Issue #62: RLS policy violation on file upload
-- Created: 2026-05-04
--
-- Creates all 8 storage buckets (ON CONFLICT DO NOTHING — safe to run on
-- existing environments) and defines RLS policies on storage.objects so
-- that:
--   - All public buckets allow anonymous SELECT
--   - Authenticated users may INSERT files into their own path prefix
--     (first path segment must equal auth.uid())
--   - Only the file owner may UPDATE or DELETE their files
-- ============================================================================

-- ============================================================================
-- Buckets
-- ============================================================================

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES
  ('model-files',        'model-files',        true, null,    null),
  ('model-thumbnails',   'model-thumbnails',   true, null,    array['image/*']),
  ('user-avatars',       'user-avatars',       true, null,    array['image/*']),
  ('brand-assets',       'brand-assets',       true, null,    array['image/*']),
  ('category-icons',     'category-icons',     true, null,    array['image/*']),
  ('product-images',     'product-images',     true, null,    array['image/*']),
  ('product-thumbnails', 'product-thumbnails', true, 2097152, array['image/*'])
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- RLS policies for storage.objects
--
-- Path convention used by this codebase:
--   model-files        → <user_id>/<model_id>/files/<filename>
--   model-thumbnails   → <user_id>/<model_id>/thumbnails/<filename>
--   product-thumbnails → <user_id>/product-<timestamp>-<name>
--   others             → <user_id>/...
--
-- The INSERT check validates that the first path segment matches the
-- caller's UID, scoping uploads to the user's own namespace.
-- UPDATE / DELETE check the `owner` column which Supabase sets to
-- auth.uid() automatically on INSERT.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- model-files
-- ----------------------------------------------------------------------------

CREATE POLICY "model-files: public read"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'model-files');

CREATE POLICY "model-files: authenticated insert"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'model-files'
    AND (storage.foldername(name))[1] = (auth.uid())::text
  );

CREATE POLICY "model-files: owner update"
  ON storage.objects FOR UPDATE TO authenticated
  USING (
    bucket_id = 'model-files'
    AND owner = auth.uid()
  );

CREATE POLICY "model-files: owner delete"
  ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'model-files'
    AND owner = auth.uid()
  );

-- ----------------------------------------------------------------------------
-- model-thumbnails
-- ----------------------------------------------------------------------------

CREATE POLICY "model-thumbnails: public read"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'model-thumbnails');

CREATE POLICY "model-thumbnails: authenticated insert"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'model-thumbnails'
    AND (storage.foldername(name))[1] = (auth.uid())::text
  );

CREATE POLICY "model-thumbnails: owner update"
  ON storage.objects FOR UPDATE TO authenticated
  USING (
    bucket_id = 'model-thumbnails'
    AND owner = auth.uid()
  );

CREATE POLICY "model-thumbnails: owner delete"
  ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'model-thumbnails'
    AND owner = auth.uid()
  );

-- ----------------------------------------------------------------------------
-- user-avatars
-- ----------------------------------------------------------------------------

CREATE POLICY "user-avatars: public read"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'user-avatars');

CREATE POLICY "user-avatars: authenticated insert"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'user-avatars'
    AND (storage.foldername(name))[1] = (auth.uid())::text
  );

CREATE POLICY "user-avatars: owner update"
  ON storage.objects FOR UPDATE TO authenticated
  USING (
    bucket_id = 'user-avatars'
    AND owner = auth.uid()
  );

CREATE POLICY "user-avatars: owner delete"
  ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'user-avatars'
    AND owner = auth.uid()
  );

-- ----------------------------------------------------------------------------
-- brand-assets
-- ----------------------------------------------------------------------------

CREATE POLICY "brand-assets: public read"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'brand-assets');

CREATE POLICY "brand-assets: authenticated insert"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'brand-assets'
    AND (storage.foldername(name))[1] = (auth.uid())::text
  );

CREATE POLICY "brand-assets: owner update"
  ON storage.objects FOR UPDATE TO authenticated
  USING (
    bucket_id = 'brand-assets'
    AND owner = auth.uid()
  );

CREATE POLICY "brand-assets: owner delete"
  ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'brand-assets'
    AND owner = auth.uid()
  );

-- ----------------------------------------------------------------------------
-- category-icons
-- ----------------------------------------------------------------------------

CREATE POLICY "category-icons: public read"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'category-icons');

CREATE POLICY "category-icons: authenticated insert"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'category-icons'
    AND (storage.foldername(name))[1] = (auth.uid())::text
  );

CREATE POLICY "category-icons: owner update"
  ON storage.objects FOR UPDATE TO authenticated
  USING (
    bucket_id = 'category-icons'
    AND owner = auth.uid()
  );

CREATE POLICY "category-icons: owner delete"
  ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'category-icons'
    AND owner = auth.uid()
  );

-- ----------------------------------------------------------------------------
-- product-images
-- ----------------------------------------------------------------------------

CREATE POLICY "product-images: public read"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'product-images');

CREATE POLICY "product-images: authenticated insert"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'product-images'
    AND (storage.foldername(name))[1] = (auth.uid())::text
  );

CREATE POLICY "product-images: owner update"
  ON storage.objects FOR UPDATE TO authenticated
  USING (
    bucket_id = 'product-images'
    AND owner = auth.uid()
  );

CREATE POLICY "product-images: owner delete"
  ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'product-images'
    AND owner = auth.uid()
  );

-- ----------------------------------------------------------------------------
-- product-thumbnails
-- ----------------------------------------------------------------------------

CREATE POLICY "product-thumbnails: public read"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'product-thumbnails');

CREATE POLICY "product-thumbnails: authenticated insert"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'product-thumbnails'
    AND (storage.foldername(name))[1] = (auth.uid())::text
  );

CREATE POLICY "product-thumbnails: owner update"
  ON storage.objects FOR UPDATE TO authenticated
  USING (
    bucket_id = 'product-thumbnails'
    AND owner = auth.uid()
  );

CREATE POLICY "product-thumbnails: owner delete"
  ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'product-thumbnails'
    AND owner = auth.uid()
  );
