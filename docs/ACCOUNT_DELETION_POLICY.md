# Account Deletion & Data Retention Policy

The account confirmation form calls `deleteOwnAccount()` in `lib/actions/account.ts`. The action checks the confirmation word for the page language and uses the account ID from the verified session. On success it clears the browser session and the form shows the account deletion success page. If a deletion step fails, the form displays an error and the user can retry.

`deleteAccount()` in `lib/account/deletion.ts` first removes unpublished parts (drafts and archived) with their files, then the avatar. It clears ownership of the user's remaining Storage objects through `release_storage_ownership()` before deleting the Auth user. The foreign keys and trigger from migration `20261014131025_account_deletion_anonymize.sql` (#178) delete the profile, collections and any remaining unpublished parts. They clear the user ID on published parts, likes, comments, curation rejections, feedback, part requests and print reports.

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
