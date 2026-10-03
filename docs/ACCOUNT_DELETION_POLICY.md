# Account Deletion & Data Retention Policy

> **Implementation status (October 2026): the anonymization described below is not implemented.** `DELETE /api/users` deletes the auth user, which cascades to `user_profiles`. But `parts.user_id`, `part_likes.user_id`, `part_comments.user_id`, `collections.user_id` and `curation_rejections.created_by` reference `user_profiles` with `ON DELETE NO ACTION`, so deleting an account that owns any of these rows fails, and the route answers 500. Only `feedback`, `part_requests` and `print_reports` set `user_id` to null. If the admin client is not configured, the route answers 503 and asks the user to email contact@commonparts.org. The privacy page (`app/(legal)/privacy/page.tsx`) states the policy below as current behaviour.

## Overview
At Common Parts Access, we respect your right to control your data. When you delete your account, we follow a clear policy to protect your privacy while maintaining the integrity of the platform and its content.

## What Happens When You Delete Your Account?

### 1. Personal Information
- Your user profile and all personally identifiable information (PII) are permanently deleted from our database.
- This includes your username, display name, email, bio, avatar, and any other profile details.

### 2. Parts and Uploaded Content
- Your published parts and associated files remain available on the platform to benefit the community, unless you explicitly request their removal before deleting your account.
- The ownership of your parts is anonymized: your user information is removed, and parts are marked as "orphaned" or attributed to a "deleted user."
- No personal information is retained in connection with these parts.

### 3. Likes, Views, and History
- Your likes and other activity history are retained for aggregate statistics and platform integrity.
- All such records are anonymized: your user ID is removed or set to null, so they cannot be linked back to you.
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
