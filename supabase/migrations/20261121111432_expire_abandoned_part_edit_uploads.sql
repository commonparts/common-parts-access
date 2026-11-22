-- The application deletes these objects through the Storage API after this
-- transaction commits. Expired paths can no longer be registered by an edit.
create function public.find_expired_part_edit_uploads()
returns text[]
language plpgsql
security invoker
set search_path = ''
as $$
declare
  cutoff timestamptz := clock_timestamp() - interval '24 hours';
  candidate record;
  paths text[] := '{}';
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

  return paths;
end;
$$;

revoke all on function public.find_expired_part_edit_uploads() from public, anon, authenticated;
grant execute on function public.find_expired_part_edit_uploads() to service_role;
