-- Prompt 16B: shared beta write guard, expanded blocks, delete/export, beta founder tools, rate limits.

-- ---------------------------------------------------------------------------
-- Shared beta write helper (used by triggers and RPCs)
-- ---------------------------------------------------------------------------

create or replace function public.assert_beta_write_allowed(p_user uuid default auth.uid()) returns void
language plpgsql stable security definer set search_path = public as $$
begin
  if p_user is null then raise exception 'forbidden'; end if;
  if not public.user_beta_access_ok(p_user) then
    raise exception 'Sign-up is not complete. Enter a valid invite code.';
  end if;
end;
$$;

revoke all on function public.assert_beta_write_allowed(uuid) from public, anon;
grant execute on function public.assert_beta_write_allowed(uuid) to authenticated;

create or replace function public.get_my_beta_status() returns jsonb
language sql stable security definer set search_path = public as $$
  select jsonb_build_object(
    'invite_only', coalesce((public.platform_setting_json('beta')->>'invite_only')::boolean, false),
    'access_granted', public.user_beta_access_ok(auth.uid())
  );
$$;

revoke all on function public.get_my_beta_status() from public;
grant execute on function public.get_my_beta_status() to authenticated;

create or replace function public.trg_beta_access_guard() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  uid uuid;
  col text := TG_ARGV[0];
begin
  if col is null or col = '' then
    raise exception 'beta guard misconfigured';
  end if;
  if TG_OP = 'DELETE' then
    uid := (to_jsonb(old) ->> col)::uuid;
  else
    uid := (to_jsonb(new) ->> col)::uuid;
  end if;
  perform public.assert_beta_write_allowed(uid);
  if TG_OP = 'DELETE' then return old; end if;
  return new;
end;
$$;

create or replace function public.trg_beta_access_guard_chapters() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  uid uuid;
begin
  select c.author_id into uid from public.creations c where c.id = new.book_id;
  perform public.assert_beta_write_allowed(uid);
  return new;
end;
$$;

create or replace function public.trg_beta_access_guard_profiles() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if public.user_beta_access_ok(new.id) then
    return new;
  end if;
  if new.beta_access_granted is distinct from old.beta_access_granted and new.beta_access_granted = true then
    return new;
  end if;
  if row(new.display_name, new.bio, new.avatar_url, new.banner_url, new.website, new.country, new.city,
          new.city_visible, new.timezone, new.language, new.who_can_message)
     is distinct from row(old.display_name, old.bio, old.avatar_url, old.banner_url, old.website, old.country,
          old.city, old.city_visible, old.timezone, old.language, old.who_can_message) then
    raise exception 'Sign-up is not complete. Enter a valid invite code.';
  end if;
  return new;
end;
$$;

drop trigger if exists creations_beta_access on public.creations;
create trigger creations_beta_access
  before insert or update on public.creations
  for each row execute function public.trg_beta_access_guard('author_id');

drop trigger if exists comments_beta_access on public.comments;
create trigger comments_beta_access
  before insert or update on public.comments
  for each row execute function public.trg_beta_access_guard('author_id');

drop trigger if exists likes_beta_access on public.likes;
create trigger likes_beta_access
  before insert on public.likes
  for each row execute function public.trg_beta_access_guard('user_id');

drop trigger if exists saves_beta_access on public.saves;
create trigger saves_beta_access
  before insert on public.saves
  for each row execute function public.trg_beta_access_guard('user_id');

drop trigger if exists follows_beta_access on public.follows;
create trigger follows_beta_access
  before insert on public.follows
  for each row execute function public.trg_beta_access_guard('follower_id');

drop trigger if exists blocks_beta_access on public.blocks;
create trigger blocks_beta_access
  before insert on public.blocks
  for each row execute function public.trg_beta_access_guard('blocker_id');

drop trigger if exists mutes_beta_access on public.mutes;
create trigger mutes_beta_access
  before insert on public.mutes
  for each row execute function public.trg_beta_access_guard('user_id');

drop trigger if exists reader_highlights_beta_access on public.reader_highlights;
create trigger reader_highlights_beta_access
  before insert or update on public.reader_highlights
  for each row execute function public.trg_beta_access_guard('user_id');

drop trigger if exists reader_bookmarks_beta_access on public.reader_bookmarks;
create trigger reader_bookmarks_beta_access
  before insert or update on public.reader_bookmarks
  for each row execute function public.trg_beta_access_guard('user_id');

drop trigger if exists reader_collections_beta_access on public.reader_collections;
create trigger reader_collections_beta_access
  before insert or update on public.reader_collections
  for each row execute function public.trg_beta_access_guard('user_id');

drop trigger if exists post_reading_progress_beta_access on public.post_reading_progress;
create trigger post_reading_progress_beta_access
  before insert or update on public.post_reading_progress
  for each row execute function public.trg_beta_access_guard('user_id');

drop trigger if exists chapters_beta_access on public.chapters;
create trigger chapters_beta_access
  before insert or update on public.chapters
  for each row execute function public.trg_beta_access_guard_chapters();

drop trigger if exists profiles_beta_access on public.profiles;
create trigger profiles_beta_access
  before update on public.profiles
  for each row execute function public.trg_beta_access_guard_profiles();

-- Message RPCs
create or replace function public.get_or_create_dm(p_other uuid) returns uuid
language plpgsql security definer set search_path = public as $$
declare
  uid uuid := auth.uid();
  low uuid; high uuid; cid uuid;
begin
  if uid is null then raise exception 'forbidden'; end if;
  perform public.assert_beta_write_allowed(uid);
  if not public.can_user_message(uid, p_other) then
    raise exception 'You cannot message this person.';
  end if;
  low := least(uid, p_other);
  high := greatest(uid, p_other);
  select id into cid from public.conversations where kind = 'dm' and dm_low = low and dm_high = high;
  if cid is null then
    insert into public.conversations (kind, dm_low, dm_high) values ('dm', low, high) returning id into cid;
    insert into public.conversation_members (conversation_id, user_id) values (cid, uid), (cid, p_other);
  end if;
  update public.conversation_members set left_at = null where conversation_id = cid and user_id in (uid, p_other);
  return cid;
end;
$$;

-- send_message: assert at top (body in 15b migration file — re-apply assert only via wrapper in 16b follow-up file)

create or replace function public.record_creation_view(p_creation_id uuid) returns void
language plpgsql security definer set search_path = public as $$
declare
  v_viewer uuid := auth.uid();
  v_author uuid;
  v_audience public.audience;
  v_status public.publish_status;
begin
  if v_viewer is null then return; end if;
  perform public.assert_beta_write_allowed(v_viewer);
  select author_id, audience, status into v_author, v_audience, v_status
  from public.creations where id = p_creation_id and is_removed = false;
  if v_author is null or v_author = v_viewer then return; end if;
  if v_audience <> 'public' or v_status <> 'published' then return; end if;
  if public.is_blocked_between(v_viewer, v_author) then return; end if;
  if exists (
    select 1 from public.creation_view_events
    where creation_id = p_creation_id and viewer_id = v_viewer
      and viewed_at > now() - interval '24 hours'
  ) then return; end if;
  insert into public.creation_view_events (creation_id, viewer_id) values (p_creation_id, v_viewer);
  update public.creations set view_count = view_count + 1 where id = p_creation_id;
end;
$$;

-- Extend engagement kinds for rate limits
alter table public.engagement_events drop constraint if exists engagement_events_kind_check;
alter table public.engagement_events add constraint engagement_events_kind_check
  check (kind in ('like', 'save', 'comment', 'message', 'message_day', 'follow', 'block', 'mute', 'profile_edit', 'upload_bytes'));

create or replace function public.enforce_follow_rate_limit() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  perform public.assert_beta_write_allowed(new.follower_id);
  perform public.record_engagement_event(new.follower_id, 'follow', interval '1 hour', 120, 'You are following too fast. Wait and try again.');
  return new;
end;
$$;

drop trigger if exists follows_rate_limit on public.follows;
create trigger follows_rate_limit
  before insert on public.follows
  for each row execute function public.enforce_follow_rate_limit();

create or replace function public.enforce_block_rate_limit() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  perform public.assert_beta_write_allowed(new.blocker_id);
  perform public.record_engagement_event(new.blocker_id, 'block', interval '1 day', 50, 'Too many blocks today. Try again tomorrow.');
  return new;
end;
$$;

drop trigger if exists blocks_rate_limit on public.blocks;
create trigger blocks_rate_limit
  before insert on public.blocks
  for each row execute function public.enforce_block_rate_limit();
