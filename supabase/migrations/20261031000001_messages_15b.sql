-- Prompt 15B: DM writer search, cancel scheduled, list preview fix, notification mute on schedule.

create or replace function public.search_dm_writers(p_query text)
returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare
  uid uuid := auth.uid();
  q text := btrim(coalesce(p_query, ''));
  out jsonb;
begin
  if uid is null then raise exception 'forbidden'; end if;
  if char_length(q) < 1 then return '[]'::jsonb; end if;

  select coalesce(jsonb_agg(row_to_json(t)::jsonb order by t.username), '[]'::jsonb) into out
  from (
    select
      p.id,
      p.username,
      p.display_name,
      p.avatar_url,
      public.can_user_message(uid, p.id) as can_message
    from public.profiles_public p
    inner join public.profiles pr on pr.id = p.id
    where p.id <> uid
      and pr.status = 'active'
      and not public.is_blocked_between(uid, p.id)
      and (
        p.username ilike '%' || q || '%'
        or p.display_name ilike '%' || q || '%'
      )
    order by p.username
    limit 30
  ) t;
  return coalesce(out, '[]'::jsonb);
end;
$$;

grant execute on function public.search_dm_writers(text) to authenticated;
revoke all on function public.search_dm_writers(text) from public, anon;

create or replace function public.cancel_scheduled_message(p_message_id uuid) returns void
language plpgsql security definer set search_path = public as $$
declare
  m public.messages%rowtype;
begin
  if auth.uid() is null then raise exception 'forbidden'; end if;
  select * into m from public.messages where id = p_message_id and sender_id = auth.uid();
  if not found then raise exception 'Message not found.'; end if;
  if m.deliver_at <= now() then raise exception 'Only scheduled messages can be cancelled.'; end if;
  delete from public.notifications
  where type = 'message' and target_type = 'conversation' and target_id = m.conversation_id
    and created_at > now() and data->>'message_id' = m.id::text;
  delete from public.messages where id = p_message_id;
end;
$$;

grant execute on function public.cancel_scheduled_message(uuid) to authenticated;
revoke all on function public.cancel_scheduled_message(uuid) from public, anon;

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
  recipient_muted boolean;
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

  select coalesce(cm.muted, false) into recipient_muted
  from public.conversation_members cm
  where cm.conversation_id = p_conversation_id and cm.user_id = other;

  perform public.record_message_send_event(uid);

  insert into public.messages (conversation_id, sender_id, body, shared_creation_id, deliver_at)
  values (p_conversation_id, uid, trimmed, p_shared_creation_id, deliver)
  returning id into mid;

  if deliver <= now() then
    update public.conversations set last_activity_at = now() where id = p_conversation_id;
    if not recipient_muted then
      perform public.create_notification(
        other, uid, 'message', 'conversation', p_conversation_id,
        jsonb_build_object('message_id', mid), now()
      );
    end if;
  else
    update public.conversations set last_activity_at = deliver where id = p_conversation_id;
    if not recipient_muted then
      perform public.create_notification(
        other, uid, 'message', 'conversation', p_conversation_id,
        jsonb_build_object('message_id', mid, 'scheduled', true), deliver
      );
    end if;
  end if;

  return mid;
end;
$$;

-- Conversation preview: only last delivered message (never future).
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
      p.id as other_user_id,
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
