-- Change FK constraints on model child tables from NO ACTION to CASCADE.
-- Ensures deleting a model automatically removes its comments, downloads,
-- likes, and views without requiring manual cleanup in application code.

ALTER TABLE model_comments
  DROP CONSTRAINT model_comments_model_id_fkey,
  ADD CONSTRAINT model_comments_model_id_fkey
    FOREIGN KEY (model_id) REFERENCES models(id) ON DELETE CASCADE;

ALTER TABLE model_downloads
  DROP CONSTRAINT model_downloads_model_id_fkey,
  ADD CONSTRAINT model_downloads_model_id_fkey
    FOREIGN KEY (model_id) REFERENCES models(id) ON DELETE CASCADE;

ALTER TABLE model_likes
  DROP CONSTRAINT model_likes_model_id_fkey,
  ADD CONSTRAINT model_likes_model_id_fkey
    FOREIGN KEY (model_id) REFERENCES models(id) ON DELETE CASCADE;

ALTER TABLE model_views
  DROP CONSTRAINT model_views_model_id_fkey,
  ADD CONSTRAINT model_views_model_id_fkey
    FOREIGN KEY (model_id) REFERENCES models(id) ON DELETE CASCADE;
