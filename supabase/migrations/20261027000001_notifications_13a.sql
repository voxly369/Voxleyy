-- Voxly Prompt 13A: in-app notifications, quiet mode, settings, admin alerts, Realtime.

-- ---------------------------------------------------------------------------
-- Types (text checks; extend existing notifications.type)
-- ---------------------------------------------------------------------------

alter table public.notifications drop constraint if exists notifications_type_check;

alter table public.notifications
  add column if not exists data jsonb not null default '{}'::jsonb,
  add column if not exists held boolean not null default false;

alter table public.notifications
  drop constraint if exists notifications_data_size;
alter table public.notifications
  add constraint notifications_data_size check (octet_length(data::text) <= 1000);

alter table public.notifications
  add constraint notifications_type_check check (
    type in (
      'follow', 'like', 'comment', 'reply', 'mention', 'message', 'collab_invite',
      'community_post', 'new_chapter', 'purchase', 'challenge_start', 'announcement',
      'warning', 'moderation_notice', 'appeal_decision', 'summary'
    )
  );

create index if not exists notifications_recipient_unread_idx
  on public.notifications (recipient_id, read_at nulls first, created_at desc);

create unique index if not exists notifications_dedupe_like_idx
  on public.notifications (recipient_id, actor_id, type, target_type, target_id)
  where type = 'like' and read_at is null;

create unique index if not exists notifications_dedupe_follow_idx
  on public.notifications (recipient_id, actor_id, type)
  where type = 'follow' and read_at is null;

-- ---------------------------------------------------------------------------
-- Admin notifications (Founder)
-- ---------------------------------------------------------------------------

create table if not exists public.admin_notifications (
  id uuid primary key default gen_random_uuid(),
  recipient_id uuid not null references public.profiles(id) on delete cascade,
  type text not null check (type in ('new_report', 'payout_issue', 'milestone')),
  actor_id uuid references public.profiles(id) on delete set null,
  target_type text,
  target_id uuid,
  data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  read_at timestamptz,
  constraint admin_notifications_data_size check (octet_length(data::text) <= 1000)
);

create index if not exists admin_notifications_recipient_created_idx
  on public.admin_notifications (recipient_id, created_at desc);

alter table public.admin_notifications enable row level security;

-- ---------------------------------------------------------------------------
-- Per-user notification settings
-- ---------------------------------------------------------------------------

create table if not exists public.notification_settings (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  notify_likes boolean not null default true,
  notify_comments boolean not null default true,
  notify_follows boolean not null default true,
  notify_mentions boolean not null default true,
  notify_messages boolean not null default true,
  notify_sales boolean not null default true,
  notify_chapters boolean not null default true,
  notify_announcements boolean not null default true,
  quiet_enabled boolean not null default false,
  quiet_manual boolean not null default false,
  quiet_schedule_start time,
  quiet_schedule_end time,
  quiet_reach text not null default 'everyone'
    check (quiet_reach in ('everyone', 'close_contacts', 'pen_pals', 'nobody')),
  timezone text not null default 'UTC'
    check (timezone ~ '^[A-Za-z0-9_+\-/]{1,64}$'),
  show_local_time boolean not null default false,
  digest_enabled boolean not null default false,
  digest_time time,
  digest_last_date date,
  quiet_summary_pending integer not null default 0,
  updated_at timestamptz not null default now()
);

alter table public.notification_settings enable row level security;

alter table public.profiles
  add column if not exists show_local_time boolean not null default false;

-- ---------------------------------------------------------------------------
-- Helpers
-- ---------------------------------------------------------------------------

create or replace function public.founder_profile_id() returns uuid
language sql stable security definer set search_path = public as $$
  select id from public.profiles where role = 'founder' limit 1;
$$;

revoke all on function public.founder_profile_id() from public, anon;
grant execute on function public.founder_profile_id() to authenticated;

create or replace function public.is_moderation_notification(p_type text) returns boolean
language sql immutable as $$
  select p_type in ('warning', 'moderation_notice', 'appeal_decision', 'summary');
$$;

create or replace function public.notification_setting_enabled(p_user uuid, p_type text) returns boolean
language plpgsql stable security definer set search_path = public as $$
declare
  s public.notification_settings%rowtype;
begin
  if public.is_moderation_notification(p_type) or p_type = 'summary' then
    return true;
  end if;

  select * into s from public.notification_settings where user_id = p_user;
  if not found then
    return true;
  end if;

  return case p_type
    when 'like' then s.notify_likes
    when 'comment' then s.notify_comments
    when 'reply' then s.notify_comments
    when 'follow' then s.notify_follows
    when 'mention' then s.notify_mentions
    when 'message' then s.notify_messages
    when 'purchase' then s.notify_sales
    when 'new_chapter' then s.notify_chapters
    when 'announcement' then s.notify_announcements
    else true
  end;
end;
$$;

revoke all on function public.notification_setting_enabled(uuid, text) from public, anon;
grant execute on function public.notification_setting_enabled(uuid, text) to authenticated;

create or replace function public.is_quiet_mode_active(p_user uuid) returns boolean
language plpgsql stable security definer set search_path = public as $$
declare
  s public.notification_settings%rowtype;
  local_now time;
  start_t time;
  end_t time;
begin
  select * into s from public.notification_settings where user_id = p_user;
  if not found then
    return false;
  end if;
  if s.quiet_manual then
    return true;
  end if;
  if not s.quiet_enabled or s.quiet_schedule_start is null or s.quiet_schedule_end is null then
    return false;
  end if;

  begin
    local_now := (now() at time zone s.timezone)::time;
  exception when others then
    local_now := (now() at time zone 'UTC')::time;
  end;

  start_t := s.quiet_schedule_start;
  end_t := s.quiet_schedule_end;

  if start_t = end_t then
    return false;
  end if;
  if start_t < end_t then
    return local_now >= start_t and local_now < end_t;
  end if;
  return local_now >= start_t or local_now < end_t;
end;
$$;

revoke all on function public.is_quiet_mode_active(uuid) from public, anon;
grant execute on function public.is_quiet_mode_active(uuid) to authenticated;

create or replace function public.can_user_view_creation(p_user uuid, p_creation uuid) returns boolean
language plpgsql stable security definer set search_path = public as $$
declare
  c public.creations%rowtype;
  author_status public.account_status;
begin
  select * into c from public.creations where id = p_creation;
  if not found then
    return false;
  end if;
  if c.is_removed and c.author_id <> p_user and not exists (
    select 1 from public.profiles fp where fp.id = p_user and fp.role = 'founder'
  ) then
    return false;
  end if;
  select status into author_status from public.profiles where id = c.author_id;
  if author_status = 'banned' and c.author_id <> p_user then
    return false;
  end if;
  if public.is_blocked_between(p_user, c.author_id) then
    return false;
  end if;
  if c.author_id = p_user then
    return true;
  end if;
  if c.status not in ('published', 'unlisted') then
    return false;
  end if;
  if c.audience = 'public' then
    return true;
  end if;
  if c.audience = 'private' then
    return false;
  end if;
  return false;
end;
$$;

revoke all on function public.can_user_view_creation(uuid, uuid) from public, anon;
grant execute on function public.can_user_view_creation(uuid, uuid) to authenticated;

create or replace function public.prune_user_notifications(p_user uuid) returns void
language plpgsql security definer set search_path = public as $$
declare
  n integer;
  excess integer;
begin
  select count(*) into n from public.notifications where recipient_id = p_user;
  if n <= 500 then
    return;
  end if;
  excess := n - 500;
  delete from public.notifications n
  using (
    select id from public.notifications
    where recipient_id = p_user and read_at is not null
    order by created_at asc
    limit excess
  ) old
  where n.id = old.id;
end;
$$;

revoke all on function public.prune_user_notifications(uuid) from public, anon;

create or replace function public.create_notification(
  p_recipient_id uuid,
  p_actor_id uuid,
  p_type text,
  p_target_type text,
  p_target_id uuid,
  p_data jsonb default '{}'::jsonb
) returns uuid
language plpgsql security definer set search_path = public as $$
declare
  v_id uuid;
  v_status public.account_status;
  v_held boolean := false;
begin
  if p_recipient_id is null or p_type is null then
    return null;
  end if;
  if p_actor_id is not null and p_recipient_id = p_actor_id then
    return null;
  end if;
  if p_actor_id is not null and public.is_blocked_between(p_recipient_id, p_actor_id) then
    return null;
  end if;
  if p_actor_id is not null and exists (
    select 1 from public.mutes m
    where m.user_id = p_recipient_id and m.muted_user_id = p_actor_id
  ) then
    return null;
  end if;

  select status into v_status from public.profiles where id = p_recipient_id;
  if v_status in ('suspended', 'banned') and not public.is_moderation_notification(p_type) then
    return null;
  end if;

  if not public.notification_setting_enabled(p_recipient_id, p_type) then
    return null;
  end if;

  if p_type = 'like' and exists (
    select 1 from public.notifications
    where recipient_id = p_recipient_id and actor_id = p_actor_id and type = 'like'
      and target_type = p_target_type and target_id = p_target_id and read_at is null
  ) then
    return null;
  end if;

  if p_type = 'follow' and exists (
    select 1 from public.notifications
    where recipient_id = p_recipient_id and actor_id = p_actor_id and type = 'follow' and read_at is null
  ) then
    return null;
  end if;

  v_held := false;
  if p_type <> 'summary' then
    v_held := public.is_quiet_mode_active(p_recipient_id);
  end if;

  insert into public.notifications (
    recipient_id, actor_id, type, target_type, target_id, data, held
  ) values (
    p_recipient_id, p_actor_id, p_type, p_target_type, p_target_id, coalesce(p_data, '{}'::jsonb), v_held
  )
  returning id into v_id;

  if v_held and p_type <> 'summary' then
    update public.notification_settings
    set quiet_summary_pending = quiet_summary_pending + 1, updated_at = now()
    where user_id = p_recipient_id;
  end if;

  perform public.prune_user_notifications(p_recipient_id);
  return v_id;
end;
$$;

revoke all on function public.create_notification(uuid, uuid, text, text, uuid, jsonb) from public, anon;
grant execute on function public.create_notification(uuid, uuid, text, text, uuid, jsonb) to authenticated;

create or replace function public.create_admin_notification(
  p_type text,
  p_actor_id uuid,
  p_target_type text,
  p_target_id uuid,
  p_data jsonb default '{}'::jsonb
) returns uuid
language plpgsql security definer set search_path = public as $$
declare
  v_founder uuid;
  v_id uuid;
begin
  v_founder := public.founder_profile_id();
  if v_founder is null then
    return null;
  end if;
  insert into public.admin_notifications (recipient_id, type, actor_id, target_type, target_id, data)
  values (v_founder, p_type, p_actor_id, p_target_type, p_target_id, coalesce(p_data, '{}'::jsonb))
  returning id into v_id;
  return v_id;
end;
$$;

revoke all on function public.create_admin_notification(text, uuid, text, uuid, jsonb) from public, anon;

-- ---------------------------------------------------------------------------
-- Delivery preparation (quiet summary + daily digest), lazy on fetch
-- ---------------------------------------------------------------------------

create or replace function public.prepare_notification_delivery() returns void
language plpgsql security definer set search_path = public as $$
declare
  s public.notification_settings%rowtype;
  local_date date;
  local_time time;
  pending integer;
begin
  if auth.uid() is null then
    return;
  end if;

  select * into s from public.notification_settings where user_id = auth.uid();
  if not found then
    return;
  end if;

  if not public.is_quiet_mode_active(auth.uid()) and s.quiet_summary_pending > 0 then
    pending := s.quiet_summary_pending;
    update public.notification_settings
    set quiet_summary_pending = 0, updated_at = now()
    where user_id = auth.uid();

    perform public.create_notification(
      auth.uid(), null, 'summary', null, null,
      jsonb_build_object('kind', 'quiet_end', 'count', pending)
    );
  end if;

  if s.digest_enabled and s.digest_time is not null then
    begin
      local_date := (now() at time zone s.timezone)::date;
      local_time := (now() at time zone s.timezone)::time;
    exception when others then
      local_date := (now() at time zone 'UTC')::date;
      local_time := (now() at time zone 'UTC')::time;
    end;

    if local_time >= s.digest_time
      and (s.digest_last_date is null or s.digest_last_date < local_date)
      and not exists (
        select 1 from public.notifications
        where recipient_id = auth.uid() and type = 'summary'
          and data->>'kind' = 'daily_digest'
          and (created_at at time zone s.timezone)::date = local_date
      )
    then
      select count(*) into pending
      from public.notifications
      where recipient_id = auth.uid()
        and read_at is null
        and type <> 'summary'
        and created_at >= (local_date::timestamptz - interval '1 day');

      if pending > 0 then
        perform public.create_notification(
          auth.uid(), null, 'summary', null, null,
          jsonb_build_object('kind', 'daily_digest', 'count', pending, 'date', local_date::text)
        );
        update public.notification_settings
        set digest_last_date = local_date, updated_at = now()
        where user_id = auth.uid();
      else
        update public.notification_settings
        set digest_last_date = local_date, updated_at = now()
        where user_id = auth.uid();
      end if;
    end if;
  end if;
end;
$$;

revoke all on function public.prepare_notification_delivery() from public, anon;
grant execute on function public.prepare_notification_delivery() to authenticated;

create or replace function public.notification_unread_count() returns integer
language plpgsql security definer set search_path = public as $$
begin
  perform public.prepare_notification_delivery();
  return (
    select count(*)::integer from public.notifications
    where recipient_id = auth.uid() and read_at is null and held = false
  );
end;
$$;

revoke all on function public.notification_unread_count() from public, anon;
grant execute on function public.notification_unread_count() to authenticated;

create or replace function public.mark_all_notifications_read() returns void
language plpgsql security definer set search_path = public as $$
begin
  update public.notifications
  set read_at = now()
  where recipient_id = auth.uid() and read_at is null;
end;
$$;

revoke all on function public.mark_all_notifications_read() from public, anon;
grant execute on function public.mark_all_notifications_read() to authenticated;

create or replace function public.clear_read_notifications() returns integer
language plpgsql security definer set search_path = public as $$
declare
  n integer;
begin
  delete from public.notifications
  where recipient_id = auth.uid() and read_at is not null;
  get diagnostics n = row_count;
  return n;
end;
$$;

revoke all on function public.clear_read_notifications() from public, anon;
grant execute on function public.clear_read_notifications() to authenticated;

-- Feed view (security invoker; RLS on base tables)
create or replace view public.notification_feed
with (security_invoker = true)
as
select
  n.id,
  n.recipient_id,
  n.type,
  n.actor_id,
  n.target_type,
  n.target_id,
  n.data,
  n.held,
  n.created_at,
  n.read_at,
  p.username as actor_username,
  p.display_name as actor_display_name,
  p.avatar_url as actor_avatar_url,
  left(coalesce(c.title, c.caption, ch.title, ''), 120) as target_title,
  left(coalesce(c.body_text, ch.body_text, ''), 160) as target_excerpt
from public.notifications n
left join public.profiles p on p.id = n.actor_id
left join public.creations c on n.target_type = 'creation' and c.id = n.target_id
left join public.chapters ch on n.target_type = 'chapter' and ch.id = n.target_id
where n.recipient_id = auth.uid()
  and (n.actor_id is null or not public.is_blocked_between(auth.uid(), n.actor_id));

revoke all on table public.notification_feed from public, anon;
grant select on table public.notification_feed to authenticated;

create or replace view public.admin_notification_feed
with (security_invoker = true)
as
select
  a.*,
  p.username as actor_username,
  p.display_name as actor_display_name,
  p.avatar_url as actor_avatar_url
from public.admin_notifications a
left join public.profiles p on p.id = a.actor_id
where a.recipient_id = auth.uid() and public.is_founder();

revoke all on table public.admin_notification_feed from public, anon;
grant select on table public.admin_notification_feed to authenticated;

-- Default settings row
create or replace function public.ensure_notification_settings() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.notification_settings (user_id, timezone)
  values (new.id, coalesce(new.timezone, 'UTC'))
  on conflict (user_id) do nothing;
  return new;
end;
$$;

drop trigger if exists profiles_ensure_notification_settings on public.profiles;
create trigger profiles_ensure_notification_settings
  after insert on public.profiles
  for each row execute function public.ensure_notification_settings();

-- Backfill settings for existing profiles
insert into public.notification_settings (user_id, timezone)
select id, timezone from public.profiles
on conflict (user_id) do nothing;

-- ---------------------------------------------------------------------------
-- Engagement triggers
-- ---------------------------------------------------------------------------

create or replace function public.notify_on_follow() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  perform public.create_notification(new.followee_id, new.follower_id, 'follow', 'profile', new.follower_id, '{}'::jsonb);
  return new;
end;
$$;

drop trigger if exists follows_notify on public.follows;
create trigger follows_notify
  after insert on public.follows
  for each row execute function public.notify_on_follow();

create or replace function public.notify_on_like() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  v_author uuid;
begin
  select author_id into v_author from public.creations where id = new.creation_id;
  if v_author is null then
    return new;
  end if;
  perform public.create_notification(
    v_author, new.user_id, 'like', 'creation', new.creation_id, '{}'::jsonb
  );
  return new;
end;
$$;

drop trigger if exists likes_notify on public.likes;
create trigger likes_notify
  after insert on public.likes
  for each row execute function public.notify_on_like();

create or replace function public.notify_on_comment() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  v_author uuid;
  v_parent_author uuid;
  v_type text;
begin
  if new.is_removed then
    return new;
  end if;
  select author_id into v_author from public.creations where id = new.creation_id;
  if v_author is not null then
    v_type := case when new.parent_id is null then 'comment' else 'reply' end;
    perform public.create_notification(
      v_author, new.author_id, v_type, 'comment', new.id,
      jsonb_build_object('creation_id', new.creation_id)
    );
  end if;
  if new.parent_id is not null then
    select author_id into v_parent_author from public.comments where id = new.parent_id;
    if v_parent_author is not null and v_parent_author <> v_author then
      perform public.create_notification(
        v_parent_author, new.author_id, 'reply', 'comment', new.id,
        jsonb_build_object('creation_id', new.creation_id)
      );
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists comments_notify on public.comments;
create trigger comments_notify
  after insert on public.comments
  for each row execute function public.notify_on_comment();

create or replace function public.notify_on_mention() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if not public.can_user_view_creation(new.mentioned_user_id, new.creation_id) then
    return new;
  end if;
  perform public.create_notification(
    new.mentioned_user_id, new.author_id, 'mention', 'creation', new.creation_id,
    jsonb_build_object('comment_id', new.comment_id)
  );
  return new;
end;
$$;

drop trigger if exists mentions_notify on public.mentions;
create trigger mentions_notify
  after insert on public.mentions
  for each row execute function public.notify_on_mention();

create or replace function public.notify_on_chapter_publish() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  v_author uuid;
  r record;
begin
  if tg_op = 'UPDATE' and old.status = new.status then
    return new;
  end if;
  if new.status <> 'published' or new.is_removed then
    return new;
  end if;

  select author_id into v_author from public.creations where id = new.book_id;

  for r in
    select distinct uid as user_id from (
      select s.user_id as uid from public.saves s where s.creation_id = new.book_id
      union
      select f.follower_id as uid from public.follows f where f.followee_id = v_author
    ) recipients
    where uid is not null and uid <> v_author
  loop
    perform public.create_notification(
      r.user_id, v_author, 'new_chapter', 'chapter', new.id,
      jsonb_build_object('book_id', new.book_id, 'chapter_title', new.title)
    );
  end loop;
  return new;
end;
$$;

drop trigger if exists chapters_notify_publish on public.chapters;
create trigger chapters_notify_publish
  after insert or update of status on public.chapters
  for each row execute function public.notify_on_chapter_publish();

create or replace function public.notify_on_report() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  perform public.create_admin_notification(
    'new_report', new.reporter_id, new.target_type::text, new.target_id,
    jsonb_build_object('report_id', new.id, 'reason', new.reason)
  );
  return new;
end;
$$;

drop trigger if exists reports_notify_founder on public.reports;
create trigger reports_notify_founder
  after insert on public.reports
  for each row execute function public.notify_on_report();

-- ---------------------------------------------------------------------------
-- Wire moderation RPCs (12A gaps)
-- ---------------------------------------------------------------------------

create or replace function public.moderation_notice_for_status(
  p_user uuid,
  p_status public.account_status,
  p_reason text
) returns void
language plpgsql security definer set search_path = public as $$
declare
  v_kind text;
begin
  v_kind := case p_status
    when 'suspended' then 'suspended'
    when 'banned' then 'banned'
    else 'unbanned'
  end;
  perform public.create_notification(
    p_user, public.founder_profile_id(), 'moderation_notice', 'profile', p_user,
    jsonb_build_object('kind', v_kind, 'reason', left(p_reason, 500))
  );
end;
$$;

revoke all on function public.moderation_notice_for_status(uuid, public.account_status, text) from public, anon;

-- Patch founder_set_user_status (12A signature)
create or replace function public.founder_set_user_status(
  p_user uuid,
  p_status public.account_status,
  p_reason text,
  p_until timestamptz default null,
  p_report_id uuid default null
) returns void
language plpgsql security definer set search_path = public as $$
declare
  v_action public.mod_action;
  v_reason text := public.founder_require_reason(p_reason);
begin
  if not public.is_founder() then raise exception 'forbidden' using errcode = '42501'; end if;
  if p_user = auth.uid() then raise exception 'cannot change your own status'; end if;
  if (select role from public.profiles where id = p_user) = 'founder' then raise exception 'cannot change the founder'; end if;
  if p_status = 'suspended' and p_until is null then raise exception 'a suspension needs an end date'; end if;

  update public.profiles
  set status = p_status, status_reason = v_reason,
      suspended_until = case when p_status = 'suspended' then p_until else null end
  where id = p_user;
  if not found then raise exception 'user not found'; end if;

  v_action := case p_status
    when 'suspended' then 'suspend'::public.mod_action
    when 'banned' then 'ban'::public.mod_action
    else 'unban'::public.mod_action
  end;

  perform public.founder_write_audit(v_action, 'profile', p_user, p_user, p_report_id, v_reason);
  perform public.moderation_notice_for_status(p_user, p_status, v_reason);

  if p_report_id is not null and p_status in ('suspended', 'banned') then
    perform public.founder_mark_report(p_report_id, 'actioned');
  end if;
end;
$$;

create or replace function public.remove_content(
  p_target_type text, p_target_id uuid, p_reason text, p_report_id uuid default null
) returns void
language plpgsql security definer set search_path = public as $$
declare
  v_reason text := public.founder_require_reason(p_reason);
  v_user uuid;
  v_report public.reports%rowtype;
begin
  if not public.is_founder() then raise exception 'forbidden' using errcode = '42501'; end if;

  if p_target_type = 'creation' then
    update public.creations set is_removed = true, removed_reason = v_reason
    where id = p_target_id returning author_id into v_user;
  elsif p_target_type = 'comment' then
    update public.comments set is_removed = true, removed_reason = v_reason
    where id = p_target_id returning author_id into v_user;
  else
    raise exception 'Unsupported content type for removal.';
  end if;
  if v_user is null then raise exception 'Content not found.'; end if;

  if p_report_id is not null then
    select * into v_report from public.reports where id = p_report_id for update;
    if not found or v_report.status <> 'open' then raise exception 'Report is not open or does not exist.'; end if;
    update public.reports set status = 'actioned', decided_by = auth.uid(), decided_at = now() where id = p_report_id;
  end if;

  perform public.founder_write_audit('remove', p_target_type, p_target_id, v_user, p_report_id, v_reason);
  perform public.create_notification(
    v_user, public.founder_profile_id(), 'moderation_notice', p_target_type, p_target_id,
    jsonb_build_object('kind', 'removed', 'reason', left(v_reason, 500))
  );
end;
$$;

create or replace function public.restore_content(
  p_target_type text, p_target_id uuid, p_reason text, p_report_id uuid default null
) returns void
language plpgsql security definer set search_path = public as $$
declare
  v_reason text := public.founder_require_reason(p_reason);
  v_user uuid;
begin
  if not public.is_founder() then raise exception 'forbidden' using errcode = '42501'; end if;

  if p_target_type = 'creation' then
    update public.creations set is_removed = false, removed_reason = null
    where id = p_target_id returning author_id into v_user;
  elsif p_target_type = 'comment' then
    update public.comments set is_removed = false, removed_reason = null
    where id = p_target_id returning author_id into v_user;
  else
    raise exception 'Unsupported content type for restoration.';
  end if;
  if v_user is null then raise exception 'Content not found.'; end if;

  perform public.founder_write_audit('restore', p_target_type, p_target_id, v_user, p_report_id, v_reason);
  perform public.create_notification(
    v_user, public.founder_profile_id(), 'moderation_notice', p_target_type, p_target_id,
    jsonb_build_object('kind', 'restored', 'reason', left(v_reason, 500))
  );
end;
$$;

create or replace function public.warn_user(
  p_user uuid, p_message text, p_reason text, p_report_id uuid default null
) returns void
language plpgsql security definer set search_path = public as $$
declare
  v_reason text := public.founder_require_reason(p_reason);
  v_message text := btrim(p_message);
begin
  if not public.is_founder() then raise exception 'forbidden' using errcode = '42501'; end if;
  if v_message is null or char_length(v_message) < 1 or char_length(v_message) > 500 then
    raise exception 'Warning message must be between 1 and 500 characters.';
  end if;
  if p_user = auth.uid() then raise exception 'cannot warn yourself'; end if;
  if not exists (select 1 from public.profiles where id = p_user) then raise exception 'user not found'; end if;

  insert into public.warnings (user_id, message, created_by) values (p_user, v_message, auth.uid());

  perform public.create_notification(
    p_user, auth.uid(), 'warning', 'profile', p_user,
    jsonb_build_object('message', v_message)
  );

  perform public.founder_write_audit('warn', 'profile', p_user, p_user, p_report_id, v_reason);
  if p_report_id is not null then perform public.founder_mark_report(p_report_id, 'actioned'); end if;
end;
$$;

create or replace function public.decide_appeal(
  p_appeal_id uuid, p_decision public.appeal_decision, p_reason text
) returns void
language plpgsql security definer set search_path = public as $$
declare
  v_reason text := public.founder_require_reason(p_reason);
  v_appeal public.appeals%rowtype;
  v_action public.moderation_actions%rowtype;
begin
  if not public.is_founder() then raise exception 'forbidden' using errcode = '42501'; end if;

  select * into v_appeal from public.appeals where id = p_appeal_id for update;
  if not found or v_appeal.status <> 'pending' then raise exception 'Appeal is not pending or does not exist.'; end if;

  select * into v_action from public.moderation_actions where id = v_appeal.moderation_action_id;
  if not found then raise exception 'Linked moderation action not found.'; end if;

  update public.appeals
  set status = 'decided', decision = p_decision, decided_at = now(), decided_by = auth.uid()
  where id = p_appeal_id;

  perform public.founder_write_audit(
    'appeal_decision', 'appeal', p_appeal_id, v_appeal.user_id, null,
    v_reason || ' (' || p_decision::text || ')'
  );

  perform public.create_notification(
    v_appeal.user_id, public.founder_profile_id(), 'appeal_decision', 'appeal', p_appeal_id,
    jsonb_build_object('decision', p_decision::text, 'reason', left(v_reason, 500))
  );

  if p_decision = 'overturned' then
    if v_action.action in ('ban', 'suspend') then
      perform public.founder_set_user_status(v_appeal.user_id, 'active', v_reason, null, null);
    elsif v_action.action = 'remove' and v_action.target_id is not null then
      perform public.restore_content(v_action.target_type, v_action.target_id, v_reason, null);
    end if;
  end if;
end;
$$;

-- ---------------------------------------------------------------------------
-- RLS + grants
-- ---------------------------------------------------------------------------

revoke insert, delete on public.notifications from authenticated;
grant select, update (read_at) on public.notifications to authenticated;

drop policy if exists notifications_update on public.notifications;
create policy notifications_update on public.notifications
  for update to authenticated
  using (recipient_id = auth.uid())
  with check (recipient_id = auth.uid());

revoke all on table public.admin_notifications from public, anon;
grant select, update (read_at) on public.admin_notifications to authenticated;

create policy admin_notifications_select on public.admin_notifications
  for select to authenticated
  using (recipient_id = auth.uid() and public.is_founder());

create policy admin_notifications_update on public.admin_notifications
  for update to authenticated
  using (recipient_id = auth.uid() and public.is_founder())
  with check (recipient_id = auth.uid());

revoke all on table public.notification_settings from public, anon;
grant select, update on table public.notification_settings to authenticated;

create policy notification_settings_select on public.notification_settings
  for select to authenticated using (user_id = auth.uid());

create policy notification_settings_update on public.notification_settings
  for update to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

grant update (show_local_time, timezone) on public.profiles to authenticated;

-- Realtime
do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    execute 'alter publication supabase_realtime add table public.notifications';
  end if;
exception when duplicate_object then
  null;
end $$;
