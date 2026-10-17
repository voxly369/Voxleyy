-- Voxly 0005. Paste after 0004, in the Supabase SQL editor, where the storage schema already exists.
-- Book text is not stored in buckets. It lives in the database.
-- Buckets are public so image URLs can render. Policies still allow only authenticated reads through the API.
-- The anon role is not granted a storage policy. Writes stay inside the caller's own first folder, and only while the account is active.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('avatars', 'avatars', true, 5242880, array['image/jpeg', 'image/png', 'image/webp']),
  ('banners', 'banners', true, 5242880, array['image/jpeg', 'image/png', 'image/webp']),
  ('covers', 'covers', true, 5242880, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

create policy storage_media_select on storage.objects
  for select to authenticated
  using (bucket_id in ('avatars', 'banners', 'covers'));

create policy storage_media_insert on storage.objects
  for insert to authenticated
  with check (
    bucket_id in ('avatars', 'banners', 'covers')
    and (storage.foldername(name))[1] = auth.uid()::text
    and public.is_active_user()
  );

create policy storage_media_update on storage.objects
  for update to authenticated
  using (
    bucket_id in ('avatars', 'banners', 'covers')
    and (storage.foldername(name))[1] = auth.uid()::text
    and public.is_active_user()
  )
  with check (
    bucket_id in ('avatars', 'banners', 'covers')
    and (storage.foldername(name))[1] = auth.uid()::text
    and public.is_active_user()
  );

create policy storage_media_delete on storage.objects
  for delete to authenticated
  using (
    bucket_id in ('avatars', 'banners', 'covers')
    and (storage.foldername(name))[1] = auth.uid()::text
    and public.is_active_user()
  );
