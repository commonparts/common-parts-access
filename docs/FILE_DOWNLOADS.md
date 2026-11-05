# File Download Implementation

## Overview
Downloads are anonymous: no account or cookie-based identification is required (issue #250). Files live in the public `model-files` bucket; single-file and bulk ZIP flows both log an anonymous row to `part_downloads`. No download counter is kept on the part (#373): no listing is ordered by downloads, and a public figure, if one is needed once hosted parts exist, is derived from these rows.

## Flow
1. User clicks a download action on the part page.
2. A non-blocking, one-line license notice appears at the trigger: license, author, attribution obligation, and the ShareAlike clause for copyleft licenses (built by `formatLicenseNotice()` in `lib/utils/formatters.ts`). It informs — it never gates the download.
3. **Single file:** client calls `/api/parts/[slug]/files/[fileId]/download-url`, then triggers the browser download and posts `/api/parts/[slug]/download` to log it.
4. **Bulk archive:** client calls `/api/parts/[slug]/files/archive`; server streams a ZIP that preserves nested folders and logs one row to `part_downloads` with `file_id = null`.
5. Each download, single file or archive, is one row in `part_downloads`: an archive logs one row, not one per file.

## Key Components

### Client-Side: `lib/storage/download.ts`
- `downloadFile()` — Fetches per-file download URL, fires the logging POST, triggers browser download.
- `downloadAllPartFiles()` — Fetches archive ZIP, names it with `toZipSafeName(partName|slug)`, triggers browser download.

### API Endpoints

**`/api/parts/[slug]/files/[fileId]/download-url`** (GET)
- Validates the slug and the file id (UUID), checks the part is published, and returns `{ downloadUrl, filename }`.
- The URL is built from the file's `upload_path` in the bucket of its `file_category` (`partFileBucket()`), resolved by `resolveStorageUrl()` (#56). A file whose category maps to no bucket returns 404.

**`/api/parts/[slug]/files/archive`** (GET, Node runtime)
- Anonymous — no authentication required.
- Streams a ZIP of the part's model files (`file_category = 'model'`), read from the `model-files` bucket by `upload_path`. Images are not included. The read is bounded at ten times the per-part model file limit (`PART_UPLOAD_LIMITS.maxModelFiles`); a part above that bound gets a 422 instead of an incomplete archive.
- Folder name inside the archive (and the downloaded filename) matches the part name; nested folders from `upload_path` are preserved via `buildZipEntryPath()`.
- Inserts one anonymous `part_downloads` row (`file_id = null`) via `recordPartDownload()`.

**`/api/parts/[slug]/download`** (POST)
- Logs an anonymous `part_downloads` row for single-file downloads. Body: `{ fileId }` (validated as a UUID).
- No user id, IP, or user agent is recorded — the row holds the part, the file and the moment.
- Non-blocking: returns success even if tracking fails.

## Storage Strategy

**Public Bucket Approach**
- Buckets: `model-files` for model files, `model-thumbnails` for images (both public). The bucket of a file follows its `file_category` (`PART_FILE_CATEGORY_BUCKETS` in `lib/storage/path-utils.ts`).
- URL format: `{NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/{bucket}/{upload_path}`. No public URL is stored on `part_files`: it is built at the API boundary (#56).

**Path Structure**
- Pattern: `{userId}/{partId}/files/{filename}` for model files, `{userId}/{partId}/thumbnails/{filename}` for images (checked by `POST /api/parts/[slug]/files`).
- Nested paths are kept; `buildZipEntryPath()` strips the user/part prefix but retains deeper folders in the ZIP.

## Database Fields

**`part_files` table:**
- `upload_path` — Storage path in the bucket of the file's `file_category` (source of truth)
- `file_category` — `model` or `image`; selects the bucket
- `file_url` — Deprecated and nullable (#56): no longer written or read; dropped by a later migration
- `filename` — Display-safe name
- `original_filename` — Uploader-provided name

**`part_downloads` table:**
- Columns: `id`, `part_id`, `file_id` (nullable for archive), `downloaded_at`. The table holds nothing about the visitor; the former `user_id`, `ip_hash`, and `user_agent` columns were dropped (issue #324).
- RLS insert policy "Anyone can log anonymous downloads on published parts" accepts rows for published parts only.
- No trigger: the former `part_downloads_increment` trigger and `parts.download_count` column were dropped (#373).
- Index: `(part_id, downloaded_at desc)`.

## Authentication
- None. Downloads work without an account; downloads by unauthenticated and authenticated users are logged identically and anonymously.

## Error Handling
- 400: Invalid `fileId` on the logging POST; invalid slug or `fileId` on `download-url`.
- 404: Part missing/unpublished, no files, or a file with no storage location.
- 422: Archive requested for a part with more model files than the archive bound.
- 503/500: Upstream storage or server failures; logged server-side.
- Tracking failures are logged and non-blocking.

## Reusable Functions
- `recordPartDownload()` (`lib/supabase/queries/part-metrics.ts`) — Anonymous `part_downloads` insert shared by the single-file and archive endpoints.
- `formatLicenseNotice()` (`lib/utils/formatters.ts`) — One-line license/attribution notice shown at download trigger.
- `partFileBucket(category)` (`lib/storage/path-utils.ts`) — Bucket of a part file category, null for an unknown one.
- `extractBucketStoragePath(reference, bucket)` (`lib/storage/path-utils.ts`) — Bucket-relative path of a stored reference, a public URL or a relative `bucket/path`.
- `resolveStorageUrl(reference)` (`lib/storage/url.ts`) — Public URL of a relative `bucket/path` reference; a full URL is returned unchanged.
- `buildZipEntryPath()` — Normalizes storage paths and preserves nested folders inside the ZIP.

## Future Enhancements
- [ ] Download quotas/rate limiting
- [ ] Resume support for large files
- [ ] Download progress tracking for archives
- [ ] Analytics dashboard for download metrics
