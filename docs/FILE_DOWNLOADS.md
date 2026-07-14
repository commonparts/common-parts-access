# File Download Implementation

## Overview
Downloads are anonymous: no account or cookie-based identification is required (issue #250). Files live in the public `model-files` bucket; single-file and bulk ZIP flows both log an anonymous row to `model_downloads`, and a DB trigger maintains `models.download_count` (consumed by part cards via the model query layer).

## Flow
1. User clicks a download action on the model page.
2. A non-blocking, one-line license notice appears at the trigger: license, author, attribution obligation, and the ShareAlike clause for copyleft licenses (built by `formatLicenseNotice()` in `lib/utils/formatters.ts`). It informs — it never gates the download.
3. **Single file:** client calls `/api/models/[slug]/files/[fileId]/download-url`, then triggers the browser download and posts `/api/models/[slug]/download` to count it.
4. **Bulk archive:** client calls `/api/models/[slug]/files/archive`; server streams a ZIP that preserves nested folders and logs one row to `model_downloads` with `file_id = null`.
5. DB trigger increments `models.download_count` on each insert into `model_downloads` (single or archive) to avoid double-counting.

## Key Components

### Client-Side: `lib/storage/download.ts`
- `downloadFile()` — Fetches per-file download URL, fires the counter POST, triggers browser download.
- `downloadAllModelFiles()` — Fetches archive ZIP, names it with `toZipSafeName(modelName|slug)`, triggers browser download.

### API Endpoints

**`/api/models/[slug]/files/[fileId]/download-url`** (GET)
- Validates model is published, resolves storage path, and returns a public URL plus filename.

**`/api/models/[slug]/files/archive`** (GET, Node runtime)
- Anonymous — no authentication required.
- Streams a ZIP containing every asset for the model.
- Folder name inside the archive (and the downloaded filename) matches the model name; nested folders from `upload_path` are preserved via `buildZipEntryPath()`.
- Inserts one anonymous `model_downloads` row (`file_id = null`) via `recordModelDownload()`.

**`/api/models/[slug]/download`** (POST)
- Increments the anonymous counter for single-file downloads. Body: `{ fileId }` (validated as a UUID).
- No user id, IP, or user agent is recorded — the row only feeds the `download_count` trigger.
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
- Columns written: `model_id`, `file_id` (nullable for archive), `downloaded_at`.
- `user_id`, `ip_hash`, and `user_agent` are legacy columns kept for historical rows; the RLS insert policy ("Anyone can log anonymous downloads on published models") rejects any new row that sets them.
- Trigger: AFTER INSERT increments `models.download_count` (one row per archive to prevent overcounting).
- Index: `(model_id, downloaded_at desc)`.

## Authentication
- None. Downloads work without an account; unauthenticated and authenticated users are counted identically and anonymously.

## Error Handling
- 400: Invalid `fileId` on the counter POST.
- 404: Model missing/unpublished or no files.
- 503/500: Upstream storage or server failures; logged server-side.
- Tracking failures are logged and non-blocking.

## Reusable Functions
- `recordModelDownload()` (`lib/supabase/queries/model-metrics.ts`) — Anonymous counter insert shared by the single-file and archive endpoints.
- `formatLicenseNotice()` (`lib/utils/formatters.ts`) — One-line license/attribution notice shown at download trigger.
- `extractStoragePath(url: string): string | null` — Pulls bucket-relative paths from Supabase URLs.
- `getPublicStorageUrl(storagePath: string): string` — Builds a public URL from a relative path.
- `buildZipEntryPath()` — Normalizes storage paths and preserves nested folders inside the ZIP.

## Future Enhancements
- [ ] Download quotas/rate limiting
- [ ] Resume support for large files
- [ ] Download progress tracking for archives
- [ ] Analytics dashboard for download metrics
