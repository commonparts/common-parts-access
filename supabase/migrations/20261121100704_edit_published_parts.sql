-- Update a published part and its image registrations in one transaction.
-- Storage bytes are uploaded before this call and removed after it commits.
create function public.edit_published_part(
  p_part_id uuid,
  p_revision text,
  p_details jsonb,
  p_removed_images text[],
  p_uploads jsonb
)
returns text[]
language plpgsql
security invoker
set search_path = ''
as $$
declare
  part record;
  caller_id uuid := auth.uid();
  thumbnail_folder text := caller_id || '/' || p_part_id || '/thumbnails/';
  gallery text[];
  removed_paths text[] := '{}';
  registered_count integer;
  upload_count integer := jsonb_array_length(p_uploads);
begin
  select id, name, description, instructions, images, thumbnail_url, updated_at
  into part from public.parts
  where id = p_part_id and user_id = caller_id and status = 'published'
  for update;

  if not found or part.updated_at is distinct from nullif(p_revision, '')::timestamptz then
    return null;
  end if;

  if jsonb_typeof(p_details) is distinct from 'object'
    or jsonb_typeof(p_uploads) is distinct from 'array'
    or p_removed_images is null
    or coalesce(char_length(btrim(p_details->>'title')), 3) not between 3 and 200
    or char_length(p_details->>'description') > 250
    or char_length(p_details->>'instructions') > 8000 then
    raise exception 'Invalid part details' using errcode = '22023';
  end if;

  if cardinality(p_removed_images) > 0 or upload_count > 0 then
    -- Include a legacy thumbnail even if the gallery did not list it.
    select array(select image from
      unnest(array_prepend(part.thumbnail_url, coalesce(part.images, '{}')))
      with ordinality as media(image, position)
      where image is not null and image <> ''
      group by image order by min(position)) into gallery;

    if not (p_removed_images <@ gallery) then
      raise exception 'Invalid gallery selection' using errcode = '22023';
    end if;

    gallery := array(select image from unnest(gallery) with ordinality as media(image, position)
      where image <> all(p_removed_images) order by position);

    if cardinality(gallery) + upload_count > 10 then
      raise exception 'Too many images' using errcode = '22023';
    end if;

    -- Only remove paths actually detached from this part, including legacy URLs.
    select array(select split_part(regexp_replace(image,
      '^(https?://[^/]+/storage/v1/object/public/)?model-thumbnails/', ''), '?', 1)
      from unnest(p_removed_images) as image
      where image ~ '^(https?://[^/]+/storage/v1/object/public/)?model-thumbnails/'
      except select split_part(regexp_replace(image,
        '^(https?://[^/]+/storage/v1/object/public/)?model-thumbnails/', ''), '?', 1)
      from unnest(gallery) as image) into removed_paths;

    delete from public.part_files
    where part_id = part.id and file_category = 'image' and upload_path = any(removed_paths);

    insert into public.part_files (part_id, filename, original_filename, file_type, file_size, file_category, upload_path)
    select part.id, split_part(object.name, '/', 4), upload.original_name,
      lower(substring(object.name from '\.([^.]+)$')), (object.metadata->>'size')::bigint, 'image', object.name
    from jsonb_to_recordset(p_uploads) as upload(path text, original_name text)
    join storage.objects as object on object.name = upload.path
    where object.bucket_id = 'model-thumbnails' and object.owner_id = caller_id::text
      and object.name = thumbnail_folder || split_part(object.name, '/', 4)
      and split_part(object.name, '/', 4) ~* '^[a-z0-9._-]+\.(jpg|jpeg|png|webp|gif)$'
      and (object.metadata->>'size')::bigint between 1 and 8388608
      and char_length(upload.original_name) between 1 and 255
      and not ('model-thumbnails/' || object.name = any(gallery))
      and not (object.name = any(removed_paths));

    get diagnostics registered_count = row_count;
    if registered_count <> upload_count or upload_count <> (
      select count(distinct item->>'path') from jsonb_array_elements(p_uploads) as item
    ) then
      raise exception 'Invalid image upload' using errcode = '22023';
    end if;

    if upload_count > 0 and (select sum(file_size) from public.part_files where part_id = part.id) > 314572800 then
      raise exception 'Part exceeds the total upload limit' using errcode = '22023';
    end if;

    gallery := gallery || array(select 'model-thumbnails/' || (item->>'path')
      from jsonb_array_elements(p_uploads) with ordinality as uploads(item, position)
      order by position);
  end if;

  update public.parts
  set name = coalesce(p_details->>'title', part.name),
    description = case when p_details ? 'description' then p_details->>'description' else part.description end,
    instructions = case when p_details ? 'instructions' then p_details->>'instructions' else part.instructions end,
    images = coalesce(gallery, part.images),
    thumbnail_url = case when gallery is null then part.thumbnail_url else gallery[1] end,
    updated_at = clock_timestamp()
  where id = part.id;

  -- The caller can clean up only objects in this part's folder. Storage RLS
  -- checks object ownership again when the caller deletes the bytes.
  return array(select path from unnest(removed_paths) as path
    where starts_with(path, caller_id || '/' || p_part_id || '/'));
end;
$$;

revoke all on function public.edit_published_part(uuid, text, jsonb, text[], jsonb) from public, anon;
grant execute on function public.edit_published_part(uuid, text, jsonb, text[], jsonb) to authenticated;

-- Snapshot the paths and delete the part while holding the edit lock.
create function public.delete_part_with_media(p_slug text)
returns table(file_category text, upload_path text)
language plpgsql
security invoker
set search_path = ''
as $$
declare
  part record;
  caller_id uuid := auth.uid();
begin
  select id, images, thumbnail_url into part from public.parts
  where slug = p_slug and user_id = caller_id
  for update;

  if not found then
    if exists (select 1 from public.parts where slug = p_slug) then
      raise exception 'Part belongs to another user' using errcode = '42501';
    end if;
    raise exception 'Part not found' using errcode = 'P0002';
  end if;

  return query
    select files.file_category, files.upload_path from public.part_files as files
    where files.part_id = part.id
    union
    select 'image'::text, media.path
    from unnest(array_prepend(part.thumbnail_url, coalesce(part.images, '{}'))) as image
    cross join lateral (select split_part(regexp_replace(image,
      '^(https?://[^/]+/storage/v1/object/public/)?model-thumbnails/', ''), '?', 1) as path) as media
    where image ~ '^(https?://[^/]+/storage/v1/object/public/)?model-thumbnails/'
      and starts_with(media.path, caller_id || '/' || part.id || '/');

  delete from public.parts where id = part.id;
end;
$$;

revoke all on function public.delete_part_with_media(text) from public, anon;
grant execute on function public.delete_part_with_media(text) to authenticated;
