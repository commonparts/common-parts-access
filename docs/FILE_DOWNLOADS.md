# File Download Implementation

## Overview
Authenticated file downloads support single-file and bulk ZIP flows. Files live in the public `model-files` bucket; requests log to `model_downloads`, and triggers should maintain `models.download_count`.

## Flow
1. User clicks a download action on the model page.
2. Client checks authentication (redirects to `/login?redirect=...` if unauthenticated).
3. **Single file:** client calls `/api/models/[slug]/files/[fileId]/download-url`, then triggers the browser download and posts `/api/models/[slug]/download` to log it.
4. **Bulk archive:** client calls `/api/models/[slug]/files/archive`; server streams a ZIP that preserves nested folders and logs one row to `model_downloads` with `file_id = null`.
5. DB trigger increments `models.download_count` on each insert into `model_downloads` (single or archive) to avoid double-counting.

## Key Components

### Client-Side: `lib/storage/download.ts`
- `downloadFile()` — Auth check, fetches per-file download URL, fires tracking POST, triggers browser download.
- `downloadAllModelFiles()` — Auth check, fetches archive ZIP, names it with `toZipSafeName(modelName|slug)`, triggers browser download.

### API Endpoints

**`/api/models/[slug]/files/[fileId]/download-url`** (GET)
- Validates model is published, resolves storage path, and returns a public URL plus filename.

**`/api/models/[slug]/files/archive`** (GET, Node runtime)
- Requires authentication.
- Streams a ZIP containing every asset for the model.
- Folder name inside the archive (and the downloaded filename) matches the model name; nested folders from `upload_path` are preserved via `buildZipEntryPath()`.
- Inserts one `model_downloads` row (`file_id = null`) for analytics/triggered counts.

**`/api/models/[slug]/download`** (POST)
- Tracks single-file downloads; records user (if any), IP, user agent, file metadata.
- Should have an AFTER INSERT trigger to increment `models.download_count`.
- Non-blocking: returns success even if tracking fails.

## Storage Strategy

**Public Bucket Approach**
- Bucket: `model-files` (public).
- URL format: `https://{project}.supabase.co/storage/v1/object/public/model-files/{path}`

**Path Structure**
- Pattern: `user-{userId}/model-{modelId}/.../filename.ext`
- Nested paths are kept; `buildZipEntryPath()` strips the user/model prefix but retains deeper folders in the ZIP.

## Database Fields

**`model_files` table:**
- `upload_path` — Relative storage path (source of truth)
- `file_url` — Optional public URL; avoid storing signed URLs
- `filename` — Display-safe name
- `original_filename` — Uploader-provided name

**`model_downloads` table:**
- Columns: `model_id`, `file_id` (nullable for archive), `user_id` (nullable), `ip_hash`, `user_agent`, `downloaded_at`.
- `ip_hash` is SHA-256 of `ip` + `user-agent`; raw IPs are not stored.
- Trigger: AFTER INSERT increments `models.download_count` (one row per archive to prevent overcounting).
- Suggested indexes: `(model_id, downloaded_at desc)`, `(file_id)`, `(user_id)`.

## Authentication
- Required for archive downloads and per-file downloads (client enforces redirect to login).
- Redirect preserves the original path via `redirect` query param.

## Error Handling
- 401: Redirect to login for client calls.
- 404: Model missing/unpublished or no files.
- 503/500: Upstream storage or server failures; logged server-side.
- Tracking failures are logged and non-blocking.

## Reusable Functions
- `extractStoragePath(url: string): string | null` — Pulls bucket-relative paths from Supabase URLs.
- `getPublicStorageUrl(storagePath: string): string` — Builds a public URL from a relative path.
- `buildZipEntryPath()` — Normalizes storage paths and preserves nested folders inside the ZIP.

## Future Enhancements
- [ ] Download quotas/rate limiting
- [ ] Resume support for large files
- [ ] Download progress tracking for archives
- [ ] Analytics dashboard for download metrics
