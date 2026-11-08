-- APPLIED to production on 2026-11-08 as version 20261108150930
-- ORDS product category identifiers (#323).
-- Source: Open Repair Data Standard v0.3, section 3.4.2:
-- https://standard.openrepair.org/standard.html#product-category-values
--
-- Map the product categories containing published parts at the time of this
-- migration. Vacuum subtypes all use 34 (Vacuum); clippers and shavers use 9
-- (Hair & beauty item); headphones use 11 (Headphones); laptops use 16
-- (Laptop); pressure washers use 24 (Power tool), which includes powered
-- gardening tools; desk/work lamps use 15 (Lamp), despite their placement
-- beneath Furniture in our navigation tree.
--
-- Cars, bikes and non-electrical furniture stay NULL. Mixed navigation
-- groupings stay NULL rather than inheriting one descendant's identifier.
-- Categories not yet covered are mapped explicitly when they become visible.
-- Future data exports include this nullable identifier alongside our category
-- name/slug; NULL does not mean ORDS "Misc" (18).
-- Existing category SELECT policies and grants also cover the new column.

alter table public.categories add column ords_category_id integer;

comment on column public.categories.ords_category_id is
  'ORDS v0.3 product_category_id for data interoperability; NULL when out of scope or not mapped. Include alongside the local category in future data exports.';

update public.categories as c
set ords_category_id = mapping.ords_category_id
from (values
  ('vacuum-cleaner', 34),          -- Vacuum
  ('canister-vacuum', 34),         -- Vacuum
  ('cordless-stick-vacuum', 34),    -- Vacuum
  ('robot-vacuum', 34),            -- Vacuum
  ('upright-vacuum', 34),          -- Vacuum
  ('wet-dry-vacuum', 34),          -- Vacuum
  ('headphones-and-earphones', 11), -- Headphones
  ('laptop', 16),                  -- Laptop
  ('hair-clipper', 9),             -- Hair & beauty item
  ('shaver-and-trimmer', 9),       -- Hair & beauty item
  ('pressure-washer', 24),         -- Power tool
  ('desk-work-lamp', 15)           -- Lamp
) as mapping(slug, ords_category_id)
where c.slug = mapping.slug;
