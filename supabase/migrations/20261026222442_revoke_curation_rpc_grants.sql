-- Migration: curation RPCs executable by the service role only (issue #440)
--
-- `fetch_top_search_misses()` and `fetch_pending_product_references()` are
-- security definer and return the curation data: zero-result searches,
-- including `search_misses.raw_query` (free text typed by visitors), and the
-- queue of pending product references. Sign-up is open, so the `authenticated`
-- grant let any account read them through `/rest/v1/rpc/` (#435).
--
-- Since #439, `/dashboard/search-demand` checks that the user is a curator
-- (`CURATOR_USER_IDS`) and calls both functions with the service role. This
-- migration revokes EXECUTE from every other role.
--
-- This migration removes a privilege the release before #439 uses: that
-- release calls both functions as the signed-in user. It is applied once #439
-- is in production (v1.6.0). It requires
-- 20261026120000_restrict_function_grants.sql.
--
-- Every statement is a REVOKE or a GRANT, so the migration is idempotent.
--
-- APPLIED to production on 2026-10-26 as version 20261026222442.

revoke execute on function public.fetch_top_search_misses(integer, integer) from public, anon, authenticated;
revoke execute on function public.fetch_pending_product_references(integer) from public, anon, authenticated;

grant execute on function public.fetch_top_search_misses(integer, integer) to service_role;
grant execute on function public.fetch_pending_product_references(integer) to service_role;
