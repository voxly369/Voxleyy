-- Voxly security review fixes (Prompt 4C).
-- 1. City privacy: revoke direct SELECT on profiles.city; expose city only through profiles_public.
-- 2. Image URLs: CHECK constraints tie avatar, banner, and cover URLs to this project's storage paths.
-- 3. Storage listing: authenticated can list only objects in their own first folder.
-- 4. Deletion: authors cannot delete creations (or related chapters/comments) under an open report.
-- 5. Blocks: is_blocked_between only reports blocks involving the caller.
-- Covers for private creations will move to a private bucket with signed URLs in a later step.

-- ---------------------------------------------------------------------------
-- 1. profiles_public (city leak)
-- ---------------------------------------------------------------------------

revoke select (city) on table public.profiles from authenticated;

create or replace view public.profiles_public
with (security_barrier = true)
as
select
  p.id,
  p.username,
  p.display_name,
  p.bio,
  p.avatar_url,
  p.banner_url,
  p.website,
  p.country,
  case
    when p.city_visible or p.id = auth.uid() or public.is_founder() then p.city
    else null
  end as city,
  p.city_visible,
  p.timezone,
  p.language,
  p.role,
  p.status,
  p.suspended_until,
  p.verified,
  p.who_can_message,
  p.follower_count,
  p.following_count,
  p.creation_count,
  p.created_at,
  p.updated_at
from public.profiles p
where
  p.id = auth.uid()
  or public.is_founder()
  or (p.status <> 'banned' and not public.is_blocked_between(auth.uid(), p.id));

revoke all on table public.profiles_public from public, anon;
grant select on table public.profiles_public to authenticated;

-- ---------------------------------------------------------------------------
-- 2. Image URL CHECK constraints (project ref ktgxdqplvggeyrnuqljx)
-- ---------------------------------------------------------------------------

alter table public.profiles
  add constraint profiles_avatar_url_storage check (
    avatar_url is null
    or avatar_url ~ (
      '^https://ktgxdqplvggeyrnuqljx\.supabase\.co/storage/v1/object/public/avatars/'
      || id::text
      || '/[A-Za-z0-9._-]+$'
    )
  ) not valid;

alter table public.profiles
  add constraint profiles_banner_url_storage check (
    banner_url is null
    or banner_url ~ (
      '^https://ktgxdqplvggeyrnuqljx\.supabase\.co/storage/v1/object/public/banners/'
      || id::text
      || '/[A-Za-z0-9._-]+$'
    )
  ) not valid;

alter table public.creations
  add constraint creations_cover_url_storage check (
    cover_url is null
    or cover_url ~ (
      '^https://ktgxdqplvggeyrnuqljx\.supabase\.co/storage/v1/object/public/covers/'
      || author_id::text
      || '/[A-Za-z0-9._-]+$'
    )
  ) not valid;

-- No media bucket yet; relax in a later phase when uploads exist.
alter table public.creations
  add constraint creations_media_url_null check (media_url is null) not valid;

alter table public.profiles validate constraint profiles_avatar_url_storage;
alter table public.profiles validate constraint profiles_banner_url_storage;
alter table public.creations validate constraint creations_cover_url_storage;
alter table public.creations validate constraint creations_media_url_null;

-- ---------------------------------------------------------------------------
-- 3. Storage listing
-- ---------------------------------------------------------------------------

drop policy if exists storage_media_select on storage.objects;

create policy storage_media_select on storage.objects
  for select to authenticated
  using (
    bucket_id in ('avatars', 'banners', 'covers')
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- ---------------------------------------------------------------------------
-- 4. Deletion under open reports
-- ---------------------------------------------------------------------------

drop policy if exists creations_delete on public.creations;

create policy creations_delete on public.creations
  for delete to authenticated
  using (
    author_id = auth.uid()
    and public.is_active_user()
    and is_removed = false
    and not exists (
      select 1 from public.reports r
      where r.status = 'open'
        and r.target_type = 'creation'
        and r.target_id = creations.id
    )
  );

drop policy if exists chapters_delete on public.chapters;

create policy chapters_delete on public.chapters
  for delete to authenticated
  using (
    public.is_active_user()
    and exists (
      select 1 from public.creations c
      where c.id = chapters.book_id and c.author_id = auth.uid()
    )
    and not exists (
      select 1 from public.reports r
      where r.status = 'open'
        and (
          (r.target_type = 'chapter' and r.target_id = chapters.id)
          or (r.target_type = 'creation' and r.target_id = chapters.book_id)
        )
    )
  );

drop policy if exists comments_delete on public.comments;

create policy comments_delete on public.comments
  for delete to authenticated
  using (
    author_id = auth.uid()
    and public.is_active_user()
    and not exists (
      select 1 from public.reports r
      where r.status = 'open'
        and (
          (r.target_type = 'comment' and r.target_id = comments.id)
          or (r.target_type = 'creation' and r.target_id = comments.creation_id)
        )
    )
  );

-- ---------------------------------------------------------------------------
-- 5. Block graph leak
-- ---------------------------------------------------------------------------

create or replace function public.is_blocked_between(a uuid, b uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select
    auth.uid() is not null
    and (a = auth.uid() or b = auth.uid())
    and exists (
      select 1 from public.blocks
      where (blocker_id = a and blocked_id = b)
         or (blocker_id = b and blocked_id = a)
    );
$$;
