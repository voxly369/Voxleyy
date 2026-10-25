-- Prompt 18C: verified_at, public exposure, storage queue helper, profiles_public refresh.

alter table public.profiles
  add column if not exists verified_at timestamptz;

comment on column public.profiles.verified_at is 'Set when verified becomes true; cleared when verified becomes false. Not client-writable.';

create or replace function public.trg_profiles_verified_at() returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.verified is true and (old.verified is distinct from true) then
    new.verified_at := coalesce(new.verified_at, now());
  elsif new.verified is false and (old.verified is distinct from false) then
    new.verified_at := null;
  end if;
  return new;
end;
$$;

drop trigger if exists profiles_verified_at on public.profiles;
create trigger profiles_verified_at
  before insert or update of verified, verified_at on public.profiles
  for each row execute function public.trg_profiles_verified_at();

-- Backfill Founder verified_at from profile creation time.
update public.profiles p
set verified_at = coalesce(p.verified_at, p.created_at)
from auth.users u
where u.id = p.id
  and public.auth_email_is_founder(u.email)
  and p.verified is true;

create or replace function public.ensure_founder_badge(p_user uuid) returns void
language plpgsql security definer set search_path = public, auth as $$
declare
  v_email text;
begin
  if p_user is null then return; end if;
  select u.email into v_email from auth.users u where u.id = p_user;
  if not public.auth_email_is_founder(v_email) then return; end if;
  update public.profiles
  set verified = true,
      verified_at = coalesce(verified_at, created_at, now())
  where id = p_user and verified is distinct from true;
  insert into public.user_badges (user_id, badge_key, month)
  values (p_user, 'founder', null)
  on conflict (user_id, badge_key) where month is null do nothing;
  delete from public.user_pinned_badges where user_id = p_user and badge_key = 'founder';
  insert into public.user_pinned_badges (user_id, badge_key, position)
  values (p_user, 'founder', 1)
  on conflict (user_id, badge_key) do update set position = 1;
end;
$$;

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
  p.updated_at,
  p.show_local_time,
  case when p.verified then p.verified_at else null end as verified_at
from public.profiles p
where
  p.id = auth.uid()
  or public.is_founder()
  or (p.status <> 'banned' and not public.is_blocked_between(auth.uid(), p.id));

create or replace function public.queue_storage_object_for_deletion(p_bucket text, p_path text) returns void
language plpgsql
security definer
set search_path = public, auth
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

revoke all on function public.queue_storage_object_for_deletion(text, text) from public, anon;
grant execute on function public.queue_storage_object_for_deletion(text, text) to authenticated;
