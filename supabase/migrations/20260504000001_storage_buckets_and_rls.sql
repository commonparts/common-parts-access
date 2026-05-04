-- ============================================================================
-- Storage buckets and RLS policies
-- Issue #62: RLS policy violation on file upload
-- Created: 2026-05-04
--
-- Creates all 7 storage buckets (ON CONFLICT DO NOTHING — idempotent).
-- Policies are idempotent via DROP POLICY IF EXISTS before each CREATE.
--
-- Policy rules per bucket:
--   model-files / model-thumbnails
--     SELECT  — owner, or any authenticated user when model is published.
--               The UUID cast on path segment [2] is guarded by a regex to
--               prevent cast errors from malformed paths.
--     INSERT  — authenticated; first path segment must equal auth.uid().
--     UPDATE  — owner only; WITH CHECK locks bucket_id + owner on new row.
--     DELETE  — owner only.
--
--   All other buckets
--     SELECT  — owner only (public URL access via bucket public=true is
--               unaffected by RLS and does not require a SELECT policy).
--     INSERT  — authenticated; first path segment must equal auth.uid().
--     UPDATE  — owner only; WITH CHECK locks bucket_id + owner on new row.
--     DELETE  — owner only.
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
-- ============================================================================

-- ----------------------------------------------------------------------------
-- model-files
-- Path: <user_id>/<model_id>/files/<filename>
-- ----------------------------------------------------------------------------

DROP POLICY IF EXISTS "model-files: owner or published model read" ON storage.objects;
CREATE POLICY "model-files: owner or published model read"
  ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'model-files'
    AND (
      owner = auth.uid()
      OR (
        (storage.foldername(name))[2] ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
        AND EXISTS (
          SELECT 1 FROM public.models
          WHERE id = (storage.foldername(name))[2]::uuid
            AND status = 'published'
        )
      )
    )
  );

DROP POLICY IF EXISTS "model-files: authenticated insert" ON storage.objects;
CREATE POLICY "model-files: authenticated insert"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'model-files'
    AND (storage.foldername(name))[1] = (auth.uid())::text
  );

DROP POLICY IF EXISTS "model-files: owner update" ON storage.objects;
CREATE POLICY "model-files: owner update"
  ON storage.objects FOR UPDATE TO authenticated
  USING (
    bucket_id = 'model-files'
    AND owner = auth.uid()
  )
  WITH CHECK (
    bucket_id = 'model-files'
    AND owner = auth.uid()
  );

DROP POLICY IF EXISTS "model-files: owner delete" ON storage.objects;
CREATE POLICY "model-files: owner delete"
  ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'model-files'
    AND owner = auth.uid()
  );

-- ----------------------------------------------------------------------------
-- model-thumbnails
-- Path: <user_id>/<model_id>/thumbnails/<filename>
-- ----------------------------------------------------------------------------

DROP POLICY IF EXISTS "model-thumbnails: owner or published model read" ON storage.objects;
CREATE POLICY "model-thumbnails: owner or published model read"
  ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'model-thumbnails'
    AND (
      owner = auth.uid()
      OR (
        (storage.foldername(name))[2] ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
        AND EXISTS (
          SELECT 1 FROM public.models
          WHERE id = (storage.foldername(name))[2]::uuid
            AND status = 'published'
        )
      )
    )
  );

DROP POLICY IF EXISTS "model-thumbnails: authenticated insert" ON storage.objects;
CREATE POLICY "model-thumbnails: authenticated insert"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'model-thumbnails'
    AND (storage.foldername(name))[1] = (auth.uid())::text
  );

DROP POLICY IF EXISTS "model-thumbnails: owner update" ON storage.objects;
CREATE POLICY "model-thumbnails: owner update"
  ON storage.objects FOR UPDATE TO authenticated
  USING (
    bucket_id = 'model-thumbnails'
    AND owner = auth.uid()
  )
  WITH CHECK (
    bucket_id = 'model-thumbnails'
    AND owner = auth.uid()
  );

DROP POLICY IF EXISTS "model-thumbnails: owner delete" ON storage.objects;
CREATE POLICY "model-thumbnails: owner delete"
  ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'model-thumbnails'
    AND owner = auth.uid()
  );

-- ----------------------------------------------------------------------------
-- user-avatars
-- Path: <user_id>/<filename>
-- ----------------------------------------------------------------------------

DROP POLICY IF EXISTS "user-avatars: owner read" ON storage.objects;
CREATE POLICY "user-avatars: owner read"
  ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'user-avatars'
    AND owner = auth.uid()
  );

DROP POLICY IF EXISTS "user-avatars: authenticated insert" ON storage.objects;
CREATE POLICY "user-avatars: authenticated insert"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'user-avatars'
    AND (storage.foldername(name))[1] = (auth.uid())::text
  );

DROP POLICY IF EXISTS "user-avatars: owner update" ON storage.objects;
CREATE POLICY "user-avatars: owner update"
  ON storage.objects FOR UPDATE TO authenticated
  USING (
    bucket_id = 'user-avatars'
    AND owner = auth.uid()
  )
  WITH CHECK (
    bucket_id = 'user-avatars'
    AND owner = auth.uid()
  );

DROP POLICY IF EXISTS "user-avatars: owner delete" ON storage.objects;
CREATE POLICY "user-avatars: owner delete"
  ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'user-avatars'
    AND owner = auth.uid()
  );

-- ----------------------------------------------------------------------------
-- brand-assets
-- Path: <user_id>/<filename>
-- ----------------------------------------------------------------------------

DROP POLICY IF EXISTS "brand-assets: owner read" ON storage.objects;
CREATE POLICY "brand-assets: owner read"
  ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'brand-assets'
    AND owner = auth.uid()
  );

DROP POLICY IF EXISTS "brand-assets: authenticated insert" ON storage.objects;
CREATE POLICY "brand-assets: authenticated insert"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'brand-assets'
    AND (storage.foldername(name))[1] = (auth.uid())::text
  );

DROP POLICY IF EXISTS "brand-assets: owner update" ON storage.objects;
CREATE POLICY "brand-assets: owner update"
  ON storage.objects FOR UPDATE TO authenticated
  USING (
    bucket_id = 'brand-assets'
    AND owner = auth.uid()
  )
  WITH CHECK (
    bucket_id = 'brand-assets'
    AND owner = auth.uid()
  );

DROP POLICY IF EXISTS "brand-assets: owner delete" ON storage.objects;
CREATE POLICY "brand-assets: owner delete"
  ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'brand-assets'
    AND owner = auth.uid()
  );

-- ----------------------------------------------------------------------------
-- category-icons
-- Path: <user_id>/<filename>
-- ----------------------------------------------------------------------------

DROP POLICY IF EXISTS "category-icons: owner read" ON storage.objects;
CREATE POLICY "category-icons: owner read"
  ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'category-icons'
    AND owner = auth.uid()
  );

DROP POLICY IF EXISTS "category-icons: authenticated insert" ON storage.objects;
CREATE POLICY "category-icons: authenticated insert"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'category-icons'
    AND (storage.foldername(name))[1] = (auth.uid())::text
  );

DROP POLICY IF EXISTS "category-icons: owner update" ON storage.objects;
CREATE POLICY "category-icons: owner update"
  ON storage.objects FOR UPDATE TO authenticated
  USING (
    bucket_id = 'category-icons'
    AND owner = auth.uid()
  )
  WITH CHECK (
    bucket_id = 'category-icons'
    AND owner = auth.uid()
  );

DROP POLICY IF EXISTS "category-icons: owner delete" ON storage.objects;
CREATE POLICY "category-icons: owner delete"
  ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'category-icons'
    AND owner = auth.uid()
  );

-- ----------------------------------------------------------------------------
-- product-images
-- Path: <user_id>/<filename>
-- ----------------------------------------------------------------------------

DROP POLICY IF EXISTS "product-images: owner read" ON storage.objects;
CREATE POLICY "product-images: owner read"
  ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'product-images'
    AND owner = auth.uid()
  );

DROP POLICY IF EXISTS "product-images: authenticated insert" ON storage.objects;
CREATE POLICY "product-images: authenticated insert"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'product-images'
    AND (storage.foldername(name))[1] = (auth.uid())::text
  );

DROP POLICY IF EXISTS "product-images: owner update" ON storage.objects;
CREATE POLICY "product-images: owner update"
  ON storage.objects FOR UPDATE TO authenticated
  USING (
    bucket_id = 'product-images'
    AND owner = auth.uid()
  )
  WITH CHECK (
    bucket_id = 'product-images'
    AND owner = auth.uid()
  );

DROP POLICY IF EXISTS "product-images: owner delete" ON storage.objects;
CREATE POLICY "product-images: owner delete"
  ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'product-images'
    AND owner = auth.uid()
  );

-- ----------------------------------------------------------------------------
-- product-thumbnails
-- Path: <user_id>/product-<timestamp>-<name>
-- ----------------------------------------------------------------------------

DROP POLICY IF EXISTS "product-thumbnails: owner read" ON storage.objects;
CREATE POLICY "product-thumbnails: owner read"
  ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'product-thumbnails'
    AND owner = auth.uid()
  );

DROP POLICY IF EXISTS "product-thumbnails: authenticated insert" ON storage.objects;
CREATE POLICY "product-thumbnails: authenticated insert"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'product-thumbnails'
    AND (storage.foldername(name))[1] = (auth.uid())::text
  );

DROP POLICY IF EXISTS "product-thumbnails: owner update" ON storage.objects;
CREATE POLICY "product-thumbnails: owner update"
  ON storage.objects FOR UPDATE TO authenticated
  USING (
    bucket_id = 'product-thumbnails'
    AND owner = auth.uid()
  )
  WITH CHECK (
    bucket_id = 'product-thumbnails'
    AND owner = auth.uid()
  );

DROP POLICY IF EXISTS "product-thumbnails: owner delete" ON storage.objects;
CREATE POLICY "product-thumbnails: owner delete"
  ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'product-thumbnails'
    AND owner = auth.uid()
  );
