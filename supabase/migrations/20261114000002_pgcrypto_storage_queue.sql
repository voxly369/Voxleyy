-- Required for queue_storage_object_for_deletion (digest for user_id_hash).
create extension if not exists pgcrypto;

create or replace function public.queue_storage_object_for_deletion(p_bucket text, p_path text) returns void
language plpgsql
security definer
set search_path = public, auth, storage, extensions
as $$
declare
  uid uuid := auth.uid();
  h text;
begin
  if uid is null then raise exception 'forbidden'; end if;
  if p_bucket not in ('avatars', 'banners', 'covers', 'media', 'manuscripts') then
    raise exception 'invalid bucket';
  end if;
  if (storage.foldername(p_path))[1] is distinct from uid::text then
    raise exception 'forbidden';
  end if;
  h := encode(digest(uid::text, 'sha256'), 'hex');
  insert into public.deletion_storage_queue (user_id_hash, bucket_id, object_path)
  values (h, p_bucket, p_path)
  on conflict (bucket_id, object_path) do nothing;
end;
$$;
