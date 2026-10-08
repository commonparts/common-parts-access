# Account Deletion & Data Retention Policy

> **Implementation status (October 2026): implemented (issue #178), effective once migration `20261003120000_account_deletion_anonymize.sql` is applied.** `DELETE /api/users` runs `deleteAccount()` (`lib/account/deletion.ts`), in this order: it deletes the user's unpublished parts (drafts and archived) with their files, deletes the avatar, releases ownership of the user's remaining Storage objects (`release_storage_ownership()`; Supabase Auth refuses to delete a user who owns Storage objects), then deletes the auth user. `user_profiles` cascades from `auth.users`; its `BEFORE DELETE` trigger deletes any unpublished part still left (one created during the cleanup) in the same transaction. `parts.user_id`, `part_likes.user_id`, `part_comments.user_id` and `curation_rejections.created_by` are then set to null, collections are deleted, and `feedback`, `part_requests` and `print_reports` already set `user_id` to null. A part with no owner is still served; its page shows no "Created by" card and nobody can edit it except through the service role. Each step can be retried, so a failed deletion answers 500 and can be run again. If the admin client is not configured, the route answers 503 and asks the user to email contact@commonparts.org.

## Overview
At Common Parts Access, we respect your right to control your data. When you delete your account, we follow a clear policy to protect your privacy while maintaining the integrity of the platform and its content.

## What Happens When You Delete Your Account?

### 1. Personal Information
- Your user profile and all personally identifiable information (PII) are permanently deleted from our database.
- This includes your username, display name, email, bio, avatar, and any other profile details.

### 2. Parts and Uploaded Content
- Your published parts and associated files remain available on the platform to benefit the community, unless you explicitly request their removal before deleting your account.
- The ownership of your parts is anonymized: the link to your account is removed, and the parts are no longer attributed to anyone. A curated part keeps crediting its original author at the source.
- Parts you had not published (drafts and archived parts) are deleted, with their files.
- No personal information is retained in connection with these parts.

### 3. Likes, Views, and History
- Your likes, comments and other activity history are retained for aggregate statistics and platform integrity.
- All such records are anonymized: your user ID is set to null, so they cannot be linked back to you.
- Views and downloads are anonymous from the start: they never record who viewed or downloaded a part (issue #324).

### 4. Collections and Saved Items
- Any collections or saved lists you created are deleted along with your account.

### 5. File Storage
- Files you uploaded as part of your parts remain available if the parts remain on the platform.
- If you request part removal, associated files are also deleted.

## Why Do We Retain Some Data?
- Retaining parts and aggregate statistics helps preserve the value of the platform for all users and supports the right-to-repair community.
- We never retain your personal information after account deletion.

## How to Request Complete Data Removal
- If you wish to have all your parts and files removed along with your account, please contact us before deleting your account.

## Questions?
Contact us at contact@commonparts.org for any questions or special requests regarding your data.
