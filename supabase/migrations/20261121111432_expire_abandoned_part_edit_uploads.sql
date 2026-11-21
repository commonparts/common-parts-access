-- Expire the editor's abandoned uploads through the Storage API.
-- Configure the two Vault secrets documented in docs/DEV_STRATEGY.md.
create extension if not exists pg_cron with schema pg_catalog;
create extension if not exists http with schema extensions;
grant usage on schema cron to postgres;
grant all privileges on all tables in schema cron to postgres;

create schema if not exists private;

create function private.expire_part_edit_uploads()
returns void
language plpgsql
security invoker
set search_path = ''
as $$
declare
  cutoff timestamptz := clock_timestamp() - interval '24 hours';
  candidate record;
  paths text[] := '{}';
  project_url text;
  storage_key text;
  response_status integer;
begin
  for candidate in
    select staged.name, staged.part_id
    from (
      select object.name, object.created_at, substring(object.name from
        '^[^/]+/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})/edit-thumbnails/[^/]+$'
      )::uuid as part_id
      from storage.objects as object
      where object.bucket_id = 'model-thumbnails' and object.created_at <= cutoff
    ) as staged
    where staged.part_id is not null and not exists (
      select 1 from public.part_files as file
      where file.part_id = staged.part_id and file.file_category = 'image' and file.upload_path = staged.name
    )
    order by staged.created_at, staged.name
    limit 100
  loop
    -- An edit may have started just before expiry. Wait for its transaction
    -- and recheck the registration after acquiring the same part lock.
    perform 1 from public.parts where id = candidate.part_id for update;
    if not exists (
      select 1 from public.part_files as file
      where file.part_id = candidate.part_id and file.file_category = 'image' and file.upload_path = candidate.name
    ) then
      paths := array_append(paths, candidate.name);
    end if;
  end loop;

  if cardinality(paths) = 0 then return; end if;

  select
    max(decrypted_secret) filter (where name = 'part_edit_cleanup_project_url'),
    max(decrypted_secret) filter (where name = 'part_edit_cleanup_storage_key')
  into project_url, storage_key
  from vault.decrypted_secrets
  where name in ('part_edit_cleanup_project_url', 'part_edit_cleanup_storage_key');

  if project_url is null or nullif(storage_key, '') is null then
    raise exception 'Configure the part edit cleanup Vault secrets';
  end if;

  -- Send the credential directly without persisting the request headers.
  select response.status into response_status from extensions.http((
    'DELETE',
    rtrim(project_url, '/') || '/storage/v1/object/model-thumbnails',
    array[extensions.http_header('apikey', storage_key), extensions.http_header('Authorization', 'Bearer ' || storage_key)],
    'application/json',
    jsonb_build_object('prefixes', paths)::text
  )::extensions.http_request) as response;

  if response_status not between 200 and 299 then
    raise exception 'Part edit storage cleanup returned HTTP %', response_status;
  end if;
end;
$$;

revoke all on function private.expire_part_edit_uploads() from public, anon, authenticated;

select cron.schedule('expire-part-edit-uploads', '17 * * * *', 'select private.expire_part_edit_uploads()');
