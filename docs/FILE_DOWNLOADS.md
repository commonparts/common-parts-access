# File Download Implementation

## Overview
This document describes the implementation of authenticated file downloads for 3D model files in PartHarbor.

## Architecture

### Flow
1. User clicks download button on model page
2. Client checks authentication (redirects to login if not authenticated)
3. Client requests download URL from API endpoint
4. Server validates model/file access and generates public storage URL
5. Client tracks download event (non-blocking)
6. Browser initiates file download

### Key Components

#### Client-Side: `lib/storage/download.ts`
- `downloadFile()` - Downloads a single file with authentication check
- `downloadMultipleFiles()` - Downloads multiple files individually
- `downloadAllModelFiles()` - Downloads all model files (filters by category)

#### API Endpoints

**`/api/models/[slug]/files/[fileId]/download-url`** (GET)
- Generates download URL for a specific file
- Validates model exists and is published
- Extracts storage path from database URLs
- Returns public storage URL

**`/api/models/[slug]/download`** (POST)
- Tracks download events
- Records user, IP, file details
- Increments model download count
- Non-blocking (doesn't prevent downloads if tracking fails)

### Storage Strategy

**Public Bucket Approach**
- `model-files` bucket is set to public access
- Files accessed via public URLs (no signed tokens required)
- Format: `https://{project}.supabase.co/storage/v1/object/public/model-files/{path}`

**Path Structure**
- Pattern: `user-{userId}/model-{modelId}/{filename}.{ext}`
- Example: `user-d126b874/model-bae07178/12mm_hole.stl`

### Database Fields

**`model_files` table:**
- `upload_path` - Should store the **relative storage path** within the bucket
  - Correct format: `user-{id}/model-{id}/filename.ext`
  - Example: `d126b874-b56d-44a0-8e32-43530b830402/bae07178-7d51-44a1-923a-e7b1a2a4cff4/12mm_hole.stl`
- `file_url` - Can store full public URL or be generated on-demand
- `filename` - Just the filename without path or extension (for display)
- `original_filename` - Full filename with extension (as uploaded)

## Authentication
- Required: Users must be logged in to download files
- Seamless redirect: Unauthenticated users redirected to `/login?redirect={currentPage}`
- Return flow: Users redirected back to model page after login

## Error Handling
- Authentication errors: Silent redirect to login
- File not found: 404 response
- Server errors: 500 response with details
- Tracking failures: Logged but don't block downloads

## Reusable Functions

### `extractStoragePath(url: string): string | null`
Extracts the storage path from any Supabase storage URL (signed or public).

### `getPublicStorageUrl(storagePath: string): string`
Constructs a public storage URL from a relative path.

## Future Enhancements
- [ ] ZIP file generation for bulk downloads (currently downloads individually)
- [ ] Download quotas/rate limiting
- [ ] Resume support for large files
- [ ] Download progress tracking
- [ ] Analytics dashboard for download metrics
