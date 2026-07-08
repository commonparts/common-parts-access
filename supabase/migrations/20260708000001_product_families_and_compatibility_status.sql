-- Migration: product families and compatibility status (issue #225)
--
-- Separates the navigation object (the family, e.g. "Hairclipper series 9000")
-- from the compatibility object (the exact reference, e.g. HC9450/15) by
-- modelling families as a self-referential hierarchy on products.
-- Adds compatibility_status to model_products so a part/reference link can be
-- promoted from 'declared' to 'verified'.
--
-- Idempotent-safe: every statement guards against re-execution.
-- To be validated and executed by a human — never run from the agent.

-- products: self-referential family hierarchy.
-- parent_id intentionally has no ON DELETE action: deleting a family that
-- still has variants must fail rather than orphan them (SET NULL would
-- violate the kind/parent consistency check below).
alter table public.products
  add column if not exists parent_id uuid references public.products(id);

alter table public.products
  add column if not exists product_kind text not null default 'standalone';

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'products_product_kind_check'
      and conrelid = 'public.products'::regclass
  ) then
    alter table public.products
      add constraint products_product_kind_check
      check (product_kind in ('standalone', 'family', 'variant'));
  end if;

  -- A variant must belong to a family; families and standalones are roots.
  -- parent_id is the signal queries use for "variant of a family", so only
  -- variants may carry one — prevents a product left on the default
  -- 'standalone' kind from silently behaving as a variant.
  if not exists (
    select 1 from pg_constraint
    where conname = 'products_kind_parent_consistency'
      and conrelid = 'public.products'::regclass
  ) then
    alter table public.products
      add constraint products_kind_parent_consistency
      check (
        (product_kind = 'variant' and parent_id is not null)
        or (product_kind in ('standalone', 'family') and parent_id is null)
      );
  end if;
end
$$;

create index if not exists idx_products_parent on public.products using btree (parent_id);

-- model_products: compatibility status on each part/reference link
alter table public.model_products
  add column if not exists compatibility_status text not null default 'declared';

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'model_products_compatibility_status_check'
      and conrelid = 'public.model_products'::regclass
  ) then
    alter table public.model_products
      add constraint model_products_compatibility_status_check
      check (compatibility_status in ('declared', 'verified'));
  end if;
end
$$;
