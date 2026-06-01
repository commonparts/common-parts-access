-- Migration: model_products junction table
-- Implements many-to-many relationship between models and products.
-- product_id on models is kept for backward compatibility and will be
-- dropped in a separate migration once all consumers are updated.

create table model_products (
  model_id   uuid not null references models(id) on delete cascade,
  product_id uuid not null references products(id) on delete cascade,
  primary key (model_id, product_id)
);

-- Backfill existing single-product associations
insert into model_products (model_id, product_id)
select id, product_id
from models
where product_id is not null;

-- RLS
alter table model_products enable row level security;

create policy "Public read"
  on model_products for select
  using (true);

create policy "Owner insert"
  on model_products for insert
  with check (
    exists (
      select 1 from models
      where id = model_id
        and user_id = auth.uid()
    )
  );

create policy "Owner delete"
  on model_products for delete
  using (
    exists (
      select 1 from models
      where id = model_id
        and user_id = auth.uid()
    )
  );
