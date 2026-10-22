-- Prompt 15A: direct messages, Safe Space subscribers option, message reports.

alter type public.report_target add value if not exists 'message';

alter table public.profiles drop constraint if exists profiles_who_can_message_check;
alter table public.profiles add constraint profiles_who_can_message_check
  check (who_can_message in ('everyone', 'followers', 'subscribers'));

create type public.conversation_kind as enum ('dm', 'community', 'channel');

create table public.conversations (
  id uuid primary key default gen_random_uuid(),
  kind public.conversation_kind not null default 'dm',
  dm_low uuid references public.profiles(id) on delete cascade,
  dm_high uuid references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  last_activity_at timestamptz not null default now(),
  check (kind <> 'dm' or (dm_low is not null and dm_high is not null and dm_low < dm_high))
);

create unique index conversations_dm_pair_idx
  on public.conversations (dm_low, dm_high) where kind = 'dm';

create table public.conversation_members (
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  joined_at timestamptz not null default now(),
  last_read_at timestamptz not null default now(),
  muted boolean not null default false,
  left_at timestamptz,
  primary key (conversation_id, user_id)
);

create index conversation_members_user_idx
  on public.conversation_members (user_id, conversation_id);

create table public.messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  sender_id uuid not null references public.profiles(id) on delete cascade,
  body text not null check (char_length(body) between 1 and 2000),
  shared_creation_id uuid references public.creations(id) on delete set null,
  deliver_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  deleted_at timestamptz
);

create index messages_conversation_deliver_idx
  on public.messages (conversation_id, deliver_at desc);

create index messages_sender_conversation_idx
  on public.messages (sender_id, conversation_id);

alter table public.conversations enable row level security;
alter table public.conversation_members enable row level security;
alter table public.messages enable row level security;

-- ---------------------------------------------------------------------------
-- Helpers
-- ---------------------------------------------------------------------------

create or replace function public.is_active_subscriber(p_sender uuid, p_recipient uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select false;
$$;

revoke all on function public.is_active_subscriber(uuid, uuid) from public, anon;
grant execute on function public.is_active_subscriber(uuid, uuid) to authenticated;

create or replace function public.can_user_message(p_sender uuid, p_recipient uuid) returns boolean
language plpgsql stable security definer set search_path = public as $$
declare
  v_setting text;
  v_status public.account_status;
begin
  if p_sender is null or p_recipient is null or p_sender = p_recipient then return false; end if;
  if public.is_blocked_between(p_sender, p_recipient) then return false; end if;
  select status into v_status from public.profiles where id = p_sender;
  if v_status <> 'active' then return false; end if;
  select status into v_status from public.profiles where id = p_recipient;
  if v_status = 'banned' then return false; end if;
  select who_can_message into v_setting from public.profiles where id = p_recipient;
  if v_setting = 'everyone' then return true; end if;
  if v_setting = 'followers' then
    return exists (
      select 1 from public.follows f
      where f.follower_id = p_sender and f.followee_id = p_recipient
    );
  end if;
  if v_setting = 'subscribers' then
    return public.is_active_subscriber(p_sender, p_recipient);
  end if;
  return false;
end;
$$;

grant execute on function public.can_user_message(uuid, uuid) to authenticated;

create or replace function public.recipient_quiet_status(p_recipient uuid) returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare
  s public.notification_settings%rowtype;
  p public.profiles%rowtype;
  ends_at timestamptz;
  label text;
begin
  if p_recipient is null then return null; end if;
  if not public.is_quiet_mode_active(p_recipient) then return null; end if;

  select * into s from public.notification_settings where user_id = p_recipient;
  select * into p from public.profiles where id = p_recipient;

  if s.quiet_manual then
    return jsonb_build_object('on', true, 'ends_at', null, 'label', 'Quiet mode is on');
  end if;

  if s.quiet_enabled and s.quiet_schedule_end is not null then
    begin
      ends_at := (
        (now() at time zone s.timezone)::date
        + s.quiet_schedule_end
      ) at time zone s.timezone;
      if ends_at <= now() then
        ends_at := ends_at + interval '1 day';
      end if;
    exception when others then
      ends_at := null;
    end;
  end if;

  if coalesce(p.show_local_time, true) and ends_at is not null then
    label := to_char(ends_at at time zone coalesce(s.timezone, 'UTC'), 'HH24:MI');
  else
    label := 'later';
    ends_at := null;
  end if;

  return jsonb_build_object('on', true, 'ends_at', ends_at, 'label', label);
end;
$$;

grant execute on function public.recipient_quiet_status(uuid) to authenticated;

alter table public.engagement_events drop constraint if exists engagement_events_kind_check;
alter table public.engagement_events add constraint engagement_events_kind_check
  check (kind in ('like', 'save', 'comment', 'message', 'message_day'));

create or replace function public.record_message_send_event(p_user uuid) returns void
language plpgsql security definer set search_path = public as $$
declare
  day_count integer;
begin
  perform public.record_engagement_event(
    p_user, 'message', interval '1 minute', 20,
    'You are sending messages too fast. Wait a bit and try again.'
  );
  delete from public.engagement_events
  where user_id = p_user and kind = 'message_day' and created_at < now() - interval '1 day';
  select count(*) into day_count from public.engagement_events
  where user_id = p_user and kind = 'message_day' and created_at > now() - interval '1 day';
  if day_count >= 500 then
    raise exception 'You have reached the daily message limit. Try again tomorrow.';
  end if;
  insert into public.engagement_events (user_id, kind) values (p_user, 'message_day');
end;
$$;

revoke all on function public.record_message_send_event(uuid) from public, anon;
grant execute on function public.record_message_send_event(uuid) to authenticated;

-- Notifications: future visibility + message dedupe
drop function if exists public.create_notification(uuid, uuid, text, text, uuid, jsonb);

create or replace function public.create_notification(
  p_recipient_id uuid,
  p_actor_id uuid,
  p_type text,
  p_target_type text,
  p_target_id uuid,
  p_data jsonb default '{}'::jsonb,
  p_visible_at timestamptz default null
) returns uuid
language plpgsql security definer set search_path = public as $$
declare
  v_id uuid;
  v_status public.account_status;
  v_held boolean := false;
  v_visible timestamptz := coalesce(p_visible_at, now());
  v_count integer;
begin
  if p_recipient_id is null or p_type is null then return null; end if;
  if p_actor_id is not null and p_recipient_id = p_actor_id then return null; end if;
  if p_actor_id is not null and public.is_blocked_between(p_recipient_id, p_actor_id) then return null; end if;
  if p_actor_id is not null and exists (
    select 1 from public.mutes m where m.user_id = p_recipient_id and m.muted_user_id = p_actor_id
  ) then return null; end if;

  select status into v_status from public.profiles where id = p_recipient_id;
  if v_status in ('suspended', 'banned') and not public.is_moderation_notification(p_type) then return null; end if;
  if not public.notification_setting_enabled(p_recipient_id, p_type) then return null; end if;

  if p_type = 'message' and p_target_type = 'conversation' and p_target_id is not null then
    if exists (
      select 1 from public.conversation_members cm
      where cm.conversation_id = p_target_id and cm.user_id = p_recipient_id and cm.muted
    ) then
      return null;
    end if;
    if v_visible <= now() then
      update public.notifications n
      set data = jsonb_set(
            coalesce(n.data, '{}'::jsonb),
            '{count}',
            to_jsonb(coalesce((n.data->>'count')::integer, 1) + 1)
          ),
          created_at = greatest(n.created_at, v_visible)
      where n.id = (
        select n2.id from public.notifications n2
        where n2.recipient_id = p_recipient_id and n2.type = 'message'
          and n2.target_type = 'conversation' and n2.target_id = p_target_id and n2.read_at is null
        order by n2.created_at desc
        limit 1
      )
      returning id into v_id;
      if v_id is not null then return v_id; end if;
    end if;
  end if;

  if p_type = 'like' and exists (
    select 1 from public.notifications
    where recipient_id = p_recipient_id and actor_id = p_actor_id and type = 'like'
      and target_type = p_target_type and target_id = p_target_id and read_at is null
  ) then return null; end if;

  if p_type = 'follow' and exists (
    select 1 from public.notifications
    where recipient_id = p_recipient_id and actor_id = p_actor_id and type = 'follow' and read_at is null
  ) then return null; end if;

  v_held := public.should_hold_for_quiet_mode(p_recipient_id, p_actor_id, p_type);

  insert into public.notifications (
    recipient_id, actor_id, type, target_type, target_id, data, held, created_at
  ) values (
    p_recipient_id, p_actor_id, p_type, p_target_type, p_target_id,
    case when p_type = 'message' then coalesce(p_data, '{}'::jsonb) || jsonb_build_object('count', 1)
         else coalesce(p_data, '{}'::jsonb) end,
    v_held, v_visible
  )
  returning id into v_id;

  if v_held and p_type <> 'summary' and v_visible <= now() then
    update public.notification_settings
    set quiet_summary_pending = quiet_summary_pending + 1, updated_at = now()
    where user_id = p_recipient_id;
  end if;

  perform public.prune_user_notifications(p_recipient_id);
  return v_id;
end;
$$;

revoke all on function public.create_notification(uuid, uuid, text, text, uuid, jsonb, timestamptz) from public, anon;
grant execute on function public.create_notification(uuid, uuid, text, text, uuid, jsonb, timestamptz) to authenticated;

create or replace view public.notification_feed
with (security_invoker = true)
as
select
  n.id, n.recipient_id, n.type, n.actor_id, n.target_type, n.target_id, n.data, n.held,
  n.created_at, n.read_at,
  p.username as actor_username, p.display_name as actor_display_name, p.avatar_url as actor_avatar_url,
  left(coalesce(c.title, c.caption, ch.title, ''), 120) as target_title,
  left(coalesce(c.body_text, ch.body_text, ''), 160) as target_excerpt
from public.notifications n
left join public.profiles p on p.id = n.actor_id
left join public.creations c on n.target_type = 'creation' and c.id = n.target_id
left join public.chapters ch on n.target_type = 'chapter' and ch.id = n.target_id
where n.recipient_id = auth.uid()
  and n.created_at <= now()
  and (n.actor_id is null or not public.is_blocked_between(auth.uid(), n.actor_id));

-- DM RPCs
create or replace function public.get_or_create_dm(p_other uuid) returns uuid
language plpgsql security definer set search_path = public as $$
declare
  uid uuid := auth.uid();
  low uuid; high uuid; cid uuid;
begin
  if uid is null then raise exception 'forbidden'; end if;
  if not public.can_user_message(uid, p_other) then
    raise exception 'You cannot message this person.';
  end if;
  low := least(uid, p_other);
  high := greatest(uid, p_other);
  select id into cid from public.conversations where kind = 'dm' and dm_low = low and dm_high = high;
  if cid is null then
    insert into public.conversations (kind, dm_low, dm_high) values ('dm', low, high) returning id into cid;
    insert into public.conversation_members (conversation_id, user_id) values (cid, uid), (cid, p_other);
  elsif not public.can_user_message(uid, p_other) then
    raise exception 'You cannot message this person.';
  end if;
  update public.conversation_members set left_at = null where conversation_id = cid and user_id in (uid, p_other);
  return cid;
end;
$$;

grant execute on function public.get_or_create_dm(uuid) to authenticated;

create or replace function public.send_message(
  p_conversation_id uuid,
  p_body text,
  p_shared_creation_id uuid default null,
  p_deliver_at timestamptz default null
) returns uuid
language plpgsql security definer set search_path = public as $$
declare
  uid uuid := auth.uid();
  mid uuid;
  deliver timestamptz := coalesce(p_deliver_at, now());
  other uuid;
  trimmed text := btrim(p_body);
begin
  if uid is null then raise exception 'forbidden'; end if;
  if not exists (
    select 1 from public.conversation_members cm
    where cm.conversation_id = p_conversation_id and cm.user_id = uid and cm.left_at is null
  ) then raise exception 'Not a member of this conversation.'; end if;

  if (select status from public.profiles where id = uid) <> 'active' then
    raise exception 'Your account cannot send messages right now.';
  end if;

  select cm.user_id into other
  from public.conversation_members cm
  where cm.conversation_id = p_conversation_id and cm.user_id <> uid limit 1;

  if other is null or not public.can_user_message(uid, other) then
    raise exception 'You cannot message this person.';
  end if;

  if trimmed is null or char_length(trimmed) < 1 or char_length(trimmed) > 2000 then
    raise exception 'Message must be between 1 and 2000 characters.';
  end if;

  if deliver < now() - interval '1 minute' then raise exception 'Invalid delivery time.'; end if;
  if deliver > now() + interval '30 days' then raise exception 'Schedule within 30 days.'; end if;

  if p_shared_creation_id is not null then
    if not public.can_user_view_creation(uid, p_shared_creation_id)
      or not public.can_user_view_creation(other, p_shared_creation_id) then
      raise exception 'That post is not available to share.';
    end if;
  end if;

  perform public.record_message_send_event(uid);

  insert into public.messages (conversation_id, sender_id, body, shared_creation_id, deliver_at)
  values (p_conversation_id, uid, trimmed, p_shared_creation_id, deliver)
  returning id into mid;

  if deliver <= now() then
    update public.conversations set last_activity_at = now() where id = p_conversation_id;
    if not exists (
      select 1 from public.conversation_members cm
      where cm.conversation_id = p_conversation_id and cm.user_id = other and cm.muted
    ) then
      perform public.create_notification(
        other, uid, 'message', 'conversation', p_conversation_id,
        jsonb_build_object('message_id', mid), now()
      );
    end if;
  else
    update public.conversations set last_activity_at = deliver where id = p_conversation_id;
    perform public.create_notification(
      other, uid, 'message', 'conversation', p_conversation_id,
      jsonb_build_object('message_id', mid, 'scheduled', true), deliver
    );
  end if;

  return mid;
end;
$$;

grant execute on function public.send_message(uuid, text, uuid, timestamptz) to authenticated;

create or replace function public.delete_message(p_message_id uuid) returns void
language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then raise exception 'forbidden'; end if;
  update public.messages
  set deleted_at = now()
  where id = p_message_id and sender_id = auth.uid() and deleted_at is null;
  if not found then raise exception 'Message not found.'; end if;
end;
$$;

grant execute on function public.delete_message(uuid) to authenticated;

create or replace function public.mark_conversation_read(p_conversation_id uuid) returns void
language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then raise exception 'forbidden'; end if;
  update public.conversation_members
  set last_read_at = now()
  where conversation_id = p_conversation_id and user_id = auth.uid();
  update public.notifications
  set read_at = now()
  where recipient_id = auth.uid() and type = 'message'
    and target_type = 'conversation' and target_id = p_conversation_id and read_at is null;
end;
$$;

grant execute on function public.mark_conversation_read(uuid) to authenticated;

create or replace function public.set_conversation_muted(p_conversation_id uuid, p_muted boolean) returns void
language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then raise exception 'forbidden'; end if;
  update public.conversation_members
  set muted = p_muted
  where conversation_id = p_conversation_id and user_id = auth.uid();
end;
$$;

grant execute on function public.set_conversation_muted(uuid, boolean) to authenticated;

create or replace function public.message_unread_total() returns integer
language sql stable security definer set search_path = public as $$
  select coalesce(count(*)::integer, 0)
  from public.messages m
  inner join public.conversation_members cm
    on cm.conversation_id = m.conversation_id and cm.user_id = auth.uid() and cm.left_at is null
  where m.deliver_at <= now()
    and m.deleted_at is null
    and m.sender_id <> auth.uid()
    and m.deliver_at > cm.last_read_at;
$$;

grant execute on function public.message_unread_total() to authenticated;

-- Visible messages view
create or replace view public.messages_visible
with (security_invoker = true)
as
select
  m.id, m.conversation_id, m.sender_id,
  case when m.deleted_at is not null then null else m.body end as body,
  m.shared_creation_id, m.deliver_at, m.created_at, m.deleted_at,
  (m.deleted_at is not null) as is_deleted,
  (m.deliver_at > now()) as is_scheduled
from public.messages m
where exists (
  select 1 from public.conversation_members cm
  where cm.conversation_id = m.conversation_id and cm.user_id = auth.uid() and cm.left_at is null
)
and (
  m.sender_id = auth.uid()
  or (m.deliver_at <= now())
);

revoke all on public.messages_visible from public, anon;
grant select on public.messages_visible to authenticated;

-- Conversation list RPC returns jsonb array for app
create or replace function public.list_my_conversations(p_cursor timestamptz default null, p_limit integer default 20)
returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare
  uid uuid := auth.uid();
  out jsonb := '[]'::jsonb;
begin
  if uid is null then raise exception 'forbidden'; end if;
  select coalesce(jsonb_agg(row_to_json(t)::jsonb order by t.last_activity_at desc), '[]'::jsonb) into out
  from (
    select
      c.id as conversation_id,
      c.last_activity_at,
      cm.muted,
      other.id as other_user_id,
      p.username as other_username,
      p.display_name as other_display_name,
      p.avatar_url as other_avatar_url,
      p.show_local_time as other_show_local_time,
      p.timezone as other_timezone,
      (
        select count(*)::integer from public.messages m2
        where m2.conversation_id = c.id and m2.deliver_at <= now()
          and m2.deleted_at is null and m2.sender_id <> uid
          and m2.deliver_at > cm.last_read_at
      ) as unread_count,
      (
        select left(replace(m3.body, E'\n', ' '), 120)
        from public.messages m3
        where m3.conversation_id = c.id and m3.deliver_at <= now() and m3.deleted_at is null
        order by m3.deliver_at desc limit 1
      ) as preview
    from public.conversation_members cm
    inner join public.conversations c on c.id = cm.conversation_id
    inner join public.conversation_members cm2 on cm2.conversation_id = c.id and cm2.user_id <> uid
    inner join public.profiles p on p.id = cm2.user_id
    where cm.user_id = uid and cm.left_at is null and c.kind = 'dm'
      and p.status <> 'banned'
      and not public.is_blocked_between(uid, cm2.user_id)
      and (p_cursor is null or c.last_activity_at < p_cursor)
    order by c.last_activity_at desc
    limit least(greatest(p_limit, 1), 50)
  ) t;
  return out;
end;
$$;

grant execute on function public.list_my_conversations(timestamptz, integer) to authenticated;

-- RLS: select only via views/RPC; no client writes
revoke all on table public.messages from public, anon;
grant select on table public.messages to authenticated;

create policy messages_select on public.messages for select to authenticated using (
  exists (
    select 1 from public.conversation_members cm
    where cm.conversation_id = messages.conversation_id and cm.user_id = auth.uid() and cm.left_at is null
  )
  and (sender_id = auth.uid() or deliver_at <= now())
);

revoke insert, update, delete on table public.messages from authenticated;

revoke all on table public.conversation_members from public, anon;
grant select on table public.conversation_members to authenticated;
create policy conversation_members_select on public.conversation_members
  for select to authenticated using (user_id = auth.uid());

revoke all on table public.conversations from public, anon;
grant select on table public.conversations to authenticated;
create policy conversations_select on public.conversations for select to authenticated using (
  exists (
    select 1 from public.conversation_members cm
    where cm.conversation_id = conversations.id and cm.user_id = auth.uid() and cm.left_at is null
  )
);

-- Founder reported message context
create or replace function public.view_reported_private_content(p_report_id uuid)
returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_report public.reports%rowtype;
  v_payload jsonb;
  v_msg public.messages%rowtype;
begin
  if not public.is_founder() then raise exception 'forbidden' using errcode = '42501'; end if;
  select * into v_report from public.reports where id = p_report_id and status = 'open';
  if not found then raise exception 'Open report not found.'; end if;

  if v_report.target_type = 'message' then
    select * into v_msg from public.messages where id = v_report.target_id;
    if not found then raise exception 'Message not found.'; end if;
    perform public.founder_write_audit(
      'private_view', 'message', v_report.target_id, v_report.reported_user_id, p_report_id,
      'Founder viewed reported message context'
    );
    select jsonb_build_object(
      'target_type', 'message',
      'reported_message', jsonb_build_object(
        'id', v_msg.id, 'body', v_msg.body, 'sender_id', v_msg.sender_id,
        'conversation_id', v_msg.conversation_id, 'created_at', v_msg.created_at
      ),
      'context', coalesce((
        select jsonb_agg(jsonb_build_object(
          'id', m.id, 'sender_id', m.sender_id, 'body', m.body,
          'created_at', m.created_at, 'deliver_at', m.deliver_at
        ) order by m.deliver_at)
        from (
          select m.* from public.messages m
          where m.conversation_id = v_msg.conversation_id
          order by abs(extract(epoch from (m.deliver_at - v_msg.deliver_at)))
          limit 21
        ) m
      ), '[]'::jsonb)
    ) into v_payload;
    return v_payload;
  end if;

  if v_report.target_type = 'creation' then
    select jsonb_build_object(
      'target_type', 'creation', 'target_id', c.id, 'audience', c.audience,
      'title', c.title, 'caption', c.caption, 'body_text', c.body_text
    ) into v_payload
    from public.creations c where c.id = v_report.target_id and c.audience = 'private';
  elsif v_report.target_type = 'comment' then
    select jsonb_build_object(
      'target_type', 'comment', 'target_id', cm.id, 'body', cm.body, 'creation_id', cm.creation_id
    ) into v_payload
    from public.comments cm
    inner join public.creations c on c.id = cm.creation_id
    where cm.id = v_report.target_id and c.audience = 'private';
  else
    raise exception 'This report does not reference private content.';
  end if;

  if v_payload is null then raise exception 'Private content not found for this report.'; end if;

  perform public.founder_write_audit(
    'private_view', v_report.target_type::text, v_report.target_id,
    v_report.reported_user_id, p_report_id, 'Founder viewed reported private content'
  );
  return v_payload;
end;
$$;

-- Realtime publication
alter publication supabase_realtime add table public.messages;
alter publication supabase_realtime add table public.conversation_members;
