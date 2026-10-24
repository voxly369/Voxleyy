-- Prompt 18B: Founder badge, profile preferences, feedback, deletion storage queue, rate limits, founder welcome.

-- ---------------------------------------------------------------------------
-- Founder badge (not client-awardable)
-- ---------------------------------------------------------------------------

insert into public.badges (key, name, description, icon_key, kind, goal_number, badge_group)
values (
  'founder',
  'Founder',
  'The person who built Voxly',
  'founder',
  'awarded',
  null,
  'other'
)
on conflict (key) do update set
  name = excluded.name,
  description = excluded.description,
  icon_key = excluded.icon_key,
  kind = excluded.kind,
  badge_group = excluded.badge_group;

create or replace function public.ensure_founder_badge(p_user uuid) returns void
language plpgsql security definer set search_path = public, auth as $$
declare
  v_email text;
begin
  if p_user is null then return; end if;
  select u.email into v_email from auth.users u where u.id = p_user;
  if not public.auth_email_is_founder(v_email) then return; end if;
  insert into public.user_badges (user_id, badge_key, month)
  values (p_user, 'founder', null)
  on conflict (user_id, badge_key) where month is null do nothing;
  delete from public.user_pinned_badges where user_id = p_user and badge_key = 'founder';
  insert into public.user_pinned_badges (user_id, badge_key, position)
  values (p_user, 'founder', 1)
  on conflict (user_id, badge_key) do update set position = 1;
end;
$$;

revoke all on function public.ensure_founder_badge(uuid) from public, anon, authenticated;

create or replace function public.trg_profiles_ensure_founder_badge() returns trigger
language plpgsql security definer set search_path = public, auth as $$
begin
  perform public.ensure_founder_badge(new.id);
  return new;
end;
$$;

drop trigger if exists profiles_ensure_founder_badge on public.profiles;
create trigger profiles_ensure_founder_badge
  after insert on public.profiles
  for each row execute function public.trg_profiles_ensure_founder_badge();

create or replace function public.award_user_badge(
  p_user uuid,
  p_badge_key text,
  p_month date default null
) returns boolean
language plpgsql security definer set search_path = public as $$
declare
  v_new bigint;
begin
  if p_user is null or p_badge_key is null then return false; end if;
  if p_badge_key = 'founder' then return false; end if;
  if not exists (select 1 from public.badges where key = p_badge_key) then return false; end if;

  if p_month is null then
    insert into public.user_badges (user_id, badge_key, month)
    values (p_user, p_badge_key, null)
    on conflict (user_id, badge_key) where month is null do nothing
    returning id into v_new;
  else
    insert into public.user_badges (user_id, badge_key, month)
    values (p_user, p_badge_key, p_month)
    on conflict (user_id, badge_key, month) where month is not null do nothing
    returning id into v_new;
  end if;

  if v_new is not null then
    perform public.create_notification(
      p_user, null, 'badge_awarded', 'badge', null,
      jsonb_build_object('badge_key', p_badge_key, 'month', p_month)
    );
    return true;
  end if;
  return false;
exception when unique_violation then
  return false;
end;
$$;

create or replace function public.pin_badge(p_badge_key text, p_position smallint) returns void
language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then raise exception 'forbidden'; end if;
  if p_badge_key = 'founder' then raise exception 'This badge cannot be pinned or unpinned.'; end if;
  if not exists (select 1 from public.user_badges where user_id = auth.uid() and badge_key = p_badge_key) then
    raise exception 'Badge not earned';
  end if;
  if p_position not between 1 and 3 then raise exception 'Invalid pin position'; end if;
  delete from public.user_pinned_badges where user_id = auth.uid() and position = p_position and badge_key <> 'founder';
  insert into public.user_pinned_badges (user_id, badge_key, position)
  values (auth.uid(), p_badge_key, p_position)
  on conflict (user_id, badge_key) do update set position = excluded.position;
end;
$$;

create or replace function public.unpin_badge(p_badge_key text) returns void
language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then raise exception 'forbidden'; end if;
  if p_badge_key = 'founder' then raise exception 'This badge cannot be pinned or unpinned.'; end if;
  delete from public.user_pinned_badges where user_id = auth.uid() and badge_key = p_badge_key;
end;
$$;

create or replace view public.profile_feed_badges
with (security_invoker = true)
as
with pinned as (
  select user_id, badge_key, position as sort_order
  from public.user_pinned_badges
),
earned as (
  select ub.user_id, ub.badge_key,
    case ub.badge_key
      when 'founder' then 0
      when 'featured' then 10 when 'verified' then 9 when 'viral_creator' then 8
      when 'trending' then 7 when 'rising_creator' then 6 else 1
    end as sort_order
  from public.user_badges ub
  where ub.month is null
)
select e.user_id, e.badge_key, b.icon_key, coalesce(p.sort_order, e.sort_order + 100) as sort_order
from earned e
inner join public.badges b on b.key = e.badge_key
left join pinned p on p.user_id = e.user_id and p.badge_key = e.badge_key
inner join public.profiles pr on pr.id = e.user_id
where pr.status = 'active'
  and not public.is_blocked_between(auth.uid(), e.user_id);

select public.ensure_founder_badge(p.id)
from public.profiles p
inner join auth.users u on u.id = p.id
where lower(u.email) = public.founder_email();

-- ---------------------------------------------------------------------------
-- Profile preferences (onboarding)
-- ---------------------------------------------------------------------------

create table if not exists public.profile_preferences (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  onboarding_completed_at timestamptz,
  onboarding_step smallint not null default 0 check (onboarding_step between 0 and 20),
  writer_roles text[] not null default '{}' check (cardinality(writer_roles) <= 6),
  favorite_genres text[] not null default '{}' check (cardinality(favorite_genres) <= 12),
  languages text[] not null default '{}' check (cardinality(languages) <= 10),
  welcome_moment_seen_at timestamptz,
  checklist_dismissed_at timestamptz,
  checklist_progress jsonb not null default '{}'::jsonb check (octet_length(checklist_progress::text) <= 8000),
  updated_at timestamptz not null default now()
);

alter table public.profile_preferences enable row level security;
revoke all on table public.profile_preferences from public, anon;
grant select, insert, update on table public.profile_preferences to authenticated;

create policy profile_preferences_own on public.profile_preferences
  for all to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create or replace function public.get_my_profile_preferences() returns jsonb
language sql stable security definer set search_path = public as $$
  select coalesce(
    (select to_jsonb(pp) from public.profile_preferences pp where pp.user_id = auth.uid()),
    jsonb_build_object('user_id', auth.uid(), 'onboarding_step', 0)
  );
$$;

grant execute on function public.get_my_profile_preferences() to authenticated;

create or replace function public.upsert_my_profile_preferences(p_patch jsonb) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  uid uuid := auth.uid();
  v_roles text[];
  v_genres text[];
  v_langs text[];
begin
  if uid is null then raise exception 'forbidden'; end if;
  v_roles := coalesce(
    (select array_agg(x) from jsonb_array_elements_text(coalesce(p_patch->'writer_roles', '[]'::jsonb)) x),
    '{}'::text[]
  );
  v_genres := coalesce(
    (select array_agg(x) from jsonb_array_elements_text(coalesce(p_patch->'favorite_genres', '[]'::jsonb)) x),
    '{}'::text[]
  );
  v_langs := coalesce(
    (select array_agg(x) from jsonb_array_elements_text(coalesce(p_patch->'languages', '[]'::jsonb)) x),
    '{}'::text[]
  );
  insert into public.profile_preferences (user_id, onboarding_step, writer_roles, favorite_genres, languages, checklist_progress, welcome_moment_seen_at)
  values (
    uid,
    coalesce((p_patch->>'onboarding_step')::smallint, 0),
    v_roles, v_genres, v_langs,
    coalesce(p_patch->'checklist_progress', '{}'::jsonb),
    (p_patch->>'welcome_moment_seen_at')::timestamptz
  )
  on conflict (user_id) do update set
    onboarding_step = coalesce((p_patch->>'onboarding_step')::smallint, profile_preferences.onboarding_step),
    onboarding_completed_at = case
      when p_patch ? 'onboarding_completed_at' then (p_patch->>'onboarding_completed_at')::timestamptz
      else profile_preferences.onboarding_completed_at
    end,
    writer_roles = case when p_patch ? 'writer_roles' then excluded.writer_roles else profile_preferences.writer_roles end,
    favorite_genres = case when p_patch ? 'favorite_genres' then excluded.favorite_genres else profile_preferences.favorite_genres end,
    languages = case when p_patch ? 'languages' then excluded.languages else profile_preferences.languages end,
    checklist_progress = case when p_patch ? 'checklist_progress' then excluded.checklist_progress else profile_preferences.checklist_progress end,
    checklist_dismissed_at = case
      when p_patch ? 'checklist_dismissed_at' then (p_patch->>'checklist_dismissed_at')::timestamptz
      else profile_preferences.checklist_dismissed_at
    end,
    welcome_moment_seen_at = coalesce((p_patch->>'welcome_moment_seen_at')::timestamptz, profile_preferences.welcome_moment_seen_at),
    updated_at = now();
  return public.get_my_profile_preferences();
end;
$$;

grant execute on function public.upsert_my_profile_preferences(jsonb) to authenticated;

create or replace function public.complete_my_onboarding(p_country text, p_timezone text) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  uid uuid := auth.uid();
  v_prefs jsonb;
begin
  if uid is null then raise exception 'forbidden'; end if;
  if p_country is not null and char_length(btrim(p_country)) = 2 then
    update public.profiles set country = upper(btrim(p_country)) where id = uid;
  end if;
  if p_timezone is not null and char_length(btrim(p_timezone)) between 1 and 64 then
    update public.profiles set timezone = btrim(p_timezone) where id = uid;
    update public.notification_settings set timezone = btrim(p_timezone) where user_id = uid;
  end if;
  insert into public.profile_preferences (user_id, onboarding_completed_at, onboarding_step)
  values (uid, now(), 7)
  on conflict (user_id) do update set onboarding_completed_at = now(), onboarding_step = 7, updated_at = now();
  perform public.send_founder_welcome_notification(uid);
  return public.get_my_profile_preferences();
end;
$$;

grant execute on function public.complete_my_onboarding(text, text) to authenticated;

-- ---------------------------------------------------------------------------
-- Founder welcome notification (once per user)
-- ---------------------------------------------------------------------------

create or replace function public.send_founder_welcome_notification(p_user uuid) returns boolean
language plpgsql security definer set search_path = public as $$
begin
  if p_user is null then return false; end if;
  if exists (
    select 1 from public.notifications
    where recipient_id = p_user and type = 'announcement'
      and coalesce(data->>'kind', '') = 'founder_welcome'
  ) then
    return false;
  end if;
  perform public.create_notification(
    p_user,
    null,
    'announcement',
    'system',
    null,
    jsonb_build_object('kind', 'founder_welcome')
  );
  return true;
end;
$$;

revoke all on function public.send_founder_welcome_notification(uuid) from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- Feedback
-- ---------------------------------------------------------------------------

create table if not exists public.app_feedback (
  id bigint generated always as identity primary key,
  user_id uuid not null references public.profiles(id) on delete cascade,
  category text not null check (category in ('bug', 'idea', 'felt_off', 'praise')),
  message text not null check (char_length(message) between 10 and 2000),
  page_path text check (page_path is null or char_length(page_path) <= 200),
  app_version text check (app_version is null or char_length(app_version) <= 40),
  viewport text check (viewport is null or char_length(viewport) <= 32),
  read_at timestamptz,
  done_at timestamptz,
  founder_note text check (founder_note is null or char_length(founder_note) <= 500),
  created_at timestamptz not null default now()
);

create index if not exists app_feedback_created_idx on public.app_feedback (created_at desc);
create index if not exists app_feedback_unread_idx on public.app_feedback (read_at) where read_at is null;

alter table public.app_feedback enable row level security;
revoke all on table public.app_feedback from public, anon;
grant select on table public.app_feedback to authenticated;

create policy app_feedback_select_own on public.app_feedback
  for select to authenticated
  using (user_id = auth.uid());

create table if not exists public.app_feedback_attempts (
  id bigint generated always as identity primary key,
  user_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now()
);

create index if not exists app_feedback_attempts_user_day_idx
  on public.app_feedback_attempts (user_id, created_at desc);

alter table public.app_feedback_attempts enable row level security;
revoke all on table public.app_feedback_attempts from public, anon, authenticated;

create or replace function public.submit_app_feedback(
  p_category text,
  p_message text,
  p_page_path text default null,
  p_app_version text default null,
  p_viewport text default null
) returns bigint
language plpgsql security definer set search_path = public as $$
declare
  uid uuid := auth.uid();
  v_id bigint;
  v_path text;
begin
  if uid is null then raise exception 'forbidden'; end if;
  if p_category not in ('bug', 'idea', 'felt_off', 'praise') then
    raise exception 'Invalid feedback category.';
  end if;
  if char_length(btrim(coalesce(p_message, ''))) < 10 or char_length(p_message) > 2000 then
    raise exception 'Message must be between 10 and 2,000 characters.';
  end if;
  delete from public.app_feedback_attempts where user_id = uid and created_at < now() - interval '1 day';
  if (select count(*) from public.app_feedback_attempts where user_id = uid and created_at > now() - interval '1 day') >= 10 then
    raise exception 'You can send up to 10 pieces of feedback per day.';
  end if;
  insert into public.app_feedback_attempts (user_id) values (uid);
  v_path := nullif(btrim(coalesce(p_page_path, '')), '');
  if v_path is not null and (position('?' in v_path) > 0 or position('#' in v_path) > 0) then
    v_path := split_part(split_part(v_path, '?', 1), '#', 1);
  end if;
  insert into public.app_feedback (user_id, category, message, page_path, app_version, viewport)
  values (uid, p_category, btrim(p_message), v_path, nullif(btrim(p_app_version), ''), nullif(btrim(p_viewport), ''))
  returning id into v_id;
  return v_id;
end;
$$;

grant execute on function public.submit_app_feedback(text, text, text, text, text) to authenticated;

create or replace function public.founder_list_feedback(
  p_category text default null,
  p_cursor timestamptz default null,
  p_limit integer default 25
) returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare
  lim integer := least(greatest(coalesce(p_limit, 25), 1), 50);
  rows jsonb;
  next_cursor timestamptz;
begin
  if not public.is_founder() then raise exception 'forbidden'; end if;
  select coalesce(jsonb_agg(row), '[]'::jsonb) into rows
  from (
    select jsonb_build_object(
      'id', f.id,
      'user_id', f.user_id,
      'category', f.category,
      'message', f.message,
      'page_path', f.page_path,
      'app_version', f.app_version,
      'viewport', f.viewport,
      'read_at', f.read_at,
      'done_at', f.done_at,
      'founder_note', f.founder_note,
      'created_at', f.created_at
    ) as row
    from public.app_feedback f
    where (p_category is null or p_category = '' or f.category = p_category)
      and (p_cursor is null or f.created_at < p_cursor)
    order by f.created_at desc
    limit lim
  ) s;
  select min((r->>'created_at')::timestamptz) into next_cursor
  from jsonb_array_elements(rows) r;
  return jsonb_build_object('rows', rows, 'next_cursor', next_cursor);
end;
$$;

grant execute on function public.founder_list_feedback(text, timestamptz, integer) to authenticated;

create or replace function public.founder_feedback_unread_count() returns integer
language sql stable security definer set search_path = public as $$
  select count(*)::integer from public.app_feedback where read_at is null;
$$;

grant execute on function public.founder_feedback_unread_count() to authenticated;

create or replace function public.founder_update_feedback(
  p_id bigint,
  p_read boolean default null,
  p_done boolean default null,
  p_note text default null
) returns void
language plpgsql security definer set search_path = public as $$
declare
  v_user uuid;
begin
  if not public.is_founder() then raise exception 'forbidden'; end if;
  select user_id into v_user from public.app_feedback where id = p_id;
  update public.app_feedback set
    read_at = case when p_read is true then coalesce(read_at, now()) when p_read is false then null else read_at end,
    done_at = case when p_done is true then coalesce(done_at, now()) when p_done is false then null else done_at end,
    founder_note = coalesce(nullif(btrim(p_note), ''), founder_note)
  where id = p_id;
  if v_user is not null then
    perform public.founder_write_audit(
      'dismiss'::public.mod_action,
      'feedback',
      v_user,
      v_user,
      null,
      'Founder updated feedback row ' || p_id::text
    );
  end if;
end;
$$;

grant execute on function public.founder_update_feedback(bigint, boolean, boolean, text) to authenticated;

-- ---------------------------------------------------------------------------
-- Deletion storage queue (honest purge)
-- ---------------------------------------------------------------------------

create table if not exists public.deletion_storage_queue (
  id bigint generated always as identity primary key,
  user_id_hash text not null,
  bucket_id text not null,
  object_path text not null,
  queued_at timestamptz not null default now(),
  done_at timestamptz,
  unique (bucket_id, object_path)
);

alter table public.deletion_storage_queue enable row level security;
revoke all on table public.deletion_storage_queue from public, anon, authenticated;

create or replace function public.queue_user_storage_for_deletion(p_user uuid, p_hash text) returns integer
language plpgsql security definer set search_path = public, storage as $$
declare
  n integer := 0;
begin
  insert into public.deletion_storage_queue (user_id_hash, bucket_id, object_path)
  select p_hash, o.bucket_id, o.name
  from storage.objects o
  where o.bucket_id in ('avatars', 'banners', 'covers', 'media', 'manuscripts')
    and (storage.foldername(o.name))[1] = p_user::text
  on conflict (bucket_id, object_path) do nothing;
  get diagnostics n = row_count;
  return n;
end;
$$;

revoke all on function public.queue_user_storage_for_deletion(uuid, text) from public, anon, authenticated;

create or replace function public.purge_user_storage(p_user uuid) returns void
language plpgsql security definer set search_path = public, storage as $$
begin
  null;
end;
$$;

create or replace function public.delete_my_account(p_reason text default 'user_requested') returns void
language plpgsql security definer set search_path = public, auth, storage as $$
declare
  uid uuid := auth.uid();
  em text;
  h text;
  queued integer;
begin
  if uid is null then raise exception 'forbidden'; end if;
  if not public.auth_session_recent() then
    raise exception 'For your security, sign in again before deleting your account.';
  end if;
  select email into em from auth.users where id = uid;
  if lower(coalesce(em, '')) = public.founder_email() then
    raise exception 'The Founder account cannot be deleted.';
  end if;
  h := encode(digest(uid::text, 'sha256'), 'hex');
  insert into public.account_deletion_records (user_id_hash, reason_code)
  values (h, left(coalesce(nullif(btrim(p_reason), ''), 'user_requested'), 64));
  queued := public.queue_user_storage_for_deletion(uid, h);
  update public.messages set body = null, deleted_at = now() where sender_id = uid and deleted_at is null;
  delete from auth.users where id = uid;
end;
$$;

create or replace function public.founder_pending_storage_cleanup_count() returns integer
language sql stable security definer set search_path = public as $$
  select count(*)::integer from public.deletion_storage_queue where done_at is null;
$$;

grant execute on function public.founder_pending_storage_cleanup_count() to authenticated;

create or replace function public.founder_list_deletion_storage_queue(p_limit integer default 500)
returns jsonb
language sql stable security definer set search_path = public as $$
  select coalesce(jsonb_agg(row order by row->>'queued_at' desc), '[]'::jsonb)
  from (
    select jsonb_build_object(
      'bucket_id', q.bucket_id,
      'object_path', q.object_path,
      'queued_at', q.queued_at,
      'done_at', q.done_at
    ) as row
    from public.deletion_storage_queue q
    where q.done_at is null
    order by q.queued_at desc
    limit least(greatest(coalesce(p_limit, 500), 1), 2000)
  ) s;
$$;

grant execute on function public.founder_list_deletion_storage_queue(integer) to authenticated;

-- ---------------------------------------------------------------------------
-- Rate limits: mutes, unfollows, profile edits, reader writes, views/day
-- ---------------------------------------------------------------------------

alter table public.engagement_events drop constraint if exists engagement_events_kind_check;
alter table public.engagement_events add constraint engagement_events_kind_check
  check (kind in (
    'like', 'save', 'comment', 'message', 'message_day', 'follow', 'unfollow', 'block', 'mute',
    'profile_edit', 'upload_bytes', 'highlight', 'bookmark', 'collection', 'view'
  ));

create or replace function public.enforce_mute_rate_limit() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  perform public.assert_beta_write_allowed(new.user_id);
  perform public.record_engagement_event(new.user_id, 'mute', interval '1 day', 100, 'Too many mutes today. Try again tomorrow.');
  return new;
end;
$$;

drop trigger if exists mutes_rate_limit on public.mutes;
create trigger mutes_rate_limit
  before insert on public.mutes
  for each row execute function public.enforce_mute_rate_limit();

create or replace function public.enforce_unfollow_rate_limit() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  perform public.record_engagement_event(old.follower_id, 'unfollow', interval '1 hour', 120, 'You are unfollowing too fast. Wait and try again.');
  return old;
end;
$$;

drop trigger if exists follows_unfollow_rate_limit on public.follows;
create trigger follows_unfollow_rate_limit
  before delete on public.follows
  for each row execute function public.enforce_unfollow_rate_limit();

create or replace function public.enforce_profile_edit_rate_limit() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if row(new.display_name, new.bio, new.avatar_url, new.banner_url, new.website, new.country, new.city,
          new.city_visible, new.timezone, new.language, new.who_can_message, new.show_local_time)
     is distinct from row(old.display_name, old.bio, old.avatar_url, old.banner_url, old.website, old.country,
          old.city, old.city_visible, old.timezone, old.language, old.who_can_message, old.show_local_time) then
    perform public.record_engagement_event(new.id, 'profile_edit', interval '1 hour', 30, 'Too many profile edits. Try again later.');
  end if;
  return new;
end;
$$;

drop trigger if exists profiles_edit_rate_limit on public.profiles;
create trigger profiles_edit_rate_limit
  before update on public.profiles
  for each row execute function public.enforce_profile_edit_rate_limit();

create or replace function public.enforce_highlight_rate_limit() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  perform public.assert_beta_write_allowed(new.user_id);
  perform public.record_engagement_event(new.user_id, 'highlight', interval '1 day', 500, 'Too many highlights today.');
  return new;
end;
$$;

drop trigger if exists reader_highlights_rate_limit on public.reader_highlights;
create trigger reader_highlights_rate_limit
  before insert on public.reader_highlights
  for each row execute function public.enforce_highlight_rate_limit();

create or replace function public.enforce_bookmark_rate_limit() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  perform public.assert_beta_write_allowed(new.user_id);
  perform public.record_engagement_event(new.user_id, 'bookmark', interval '1 day', 500, 'Too many bookmarks today.');
  return new;
end;
$$;

drop trigger if exists reader_bookmarks_rate_limit on public.reader_bookmarks;
create trigger reader_bookmarks_rate_limit
  before insert on public.reader_bookmarks
  for each row execute function public.enforce_bookmark_rate_limit();

create or replace function public.enforce_collection_rate_limit() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  perform public.assert_beta_write_allowed(new.user_id);
  perform public.record_engagement_event(new.user_id, 'collection', interval '1 day', 50, 'Too many collection changes today.');
  return new;
end;
$$;

drop trigger if exists reader_collections_rate_limit on public.reader_collections;
create trigger reader_collections_rate_limit
  before insert on public.reader_collections
  for each row execute function public.enforce_collection_rate_limit();

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
  perform public.record_engagement_event(v_viewer, 'view', interval '1 day', 2000, 'Too many views recorded today.');
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

create or replace function public.check_upload_quota(p_bytes bigint, p_kind text default 'media') returns void
language plpgsql stable security definer set search_path = public as $$
declare
  uid uuid := auth.uid();
begin
  if uid is null then raise exception 'forbidden'; end if;
  if p_bytes is null or p_bytes < 0 or p_bytes > 52428800 then
    raise exception 'File exceeds the maximum upload size.';
  end if;
  perform public.record_engagement_event(
    uid,
    'upload_bytes',
    interval '1 day',
    50,
    'Daily upload limit reached. Try again tomorrow.'
  );
end;
$$;

grant execute on function public.check_upload_quota(bigint, text) to authenticated;
