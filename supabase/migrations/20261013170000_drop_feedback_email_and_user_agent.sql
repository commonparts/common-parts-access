-- Migration: stop storing the email address and the user agent of feedback (issue #405)
--
-- The feedback widget asked for an optional email address "for follow-up"
-- and sent the visitor's full browser user agent with every submission.
-- Nothing reads either column: the triage function does not include them in
-- the classification prompt or the GitHub issue, no process contacts
-- submitters, and no database function references them. They are personal
-- data collected without a purpose.
--
-- The application no longer sends either field: deploy the code to
-- production before applying this migration. The previous release still
-- names both columns in its insert, and PostgREST rejects an insert that
-- names a column that does not exist, so applying it earlier breaks the
-- feedback widget in every environment still running that release.
--
-- What this migration does:
--
--   1. Drops `feedback.email` and `feedback.user_agent`, with their length
--      checks. Dropping the columns deletes the stored values.
--
-- No view, index or RLS policy references either column. The insert policy
-- only checks `user_id`, and the `on_feedback_insert` webhook sends the new
-- row as it is, so neither needs a change.

alter table public.feedback
  drop column if exists email,
  drop column if exists user_agent;
