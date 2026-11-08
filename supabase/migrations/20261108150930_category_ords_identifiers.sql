-- APPLIED to production on 2026-11-08 as version 20261108150930
-- ORDS product category identifiers (#323).
-- Source: Open Repair Data Standard v0.3, sections 3.3.2.1.1 and 3.4.2:
-- https://standard.openrepair.org/standard.html#product-category-values
--
-- Existing category SELECT policies and grants cover the new column.
-- Future data exports include the nullable ID alongside the local name/slug.

alter table public.categories add column ords_category_id integer;

comment on column public.categories.ords_category_id is
  'ORDS v0.3 product_category_id for data interoperability; NULL when out of scope or not mapped. Include alongside the local category in future data exports.';
