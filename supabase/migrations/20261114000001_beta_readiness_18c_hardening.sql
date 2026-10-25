-- 18C hardening: verified flag on conversation list + notification feed for UI seals.

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
      cm2.user_id as other_user_id,
      case when p.id is null then 'deleted-account' else p.username end as other_username,
      case when p.id is null then 'Deleted account' else p.display_name end as other_display_name,
      case when p.id is null then null else p.avatar_url end as other_avatar_url,
      coalesce(p.verified, false) as other_verified,
      p.country as other_country,
      coalesce(p.show_local_time, false) as other_show_local_time,
      coalesce(p.timezone, 'UTC') as other_timezone,
      (p.id is null) as other_account_deleted,
      (
        select count(*)::integer from public.messages m2
        where m2.conversation_id = c.id and m2.deliver_at <= now()
          and m2.deleted_at is null
          and (m2.sender_id is distinct from uid)
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
    inner join public.conversation_members cm2 on cm2.conversation_id = c.id and cm2.user_id <> uid and cm2.left_at is null
    left join public.profiles p on p.id = cm2.user_id
    where cm.user_id = uid and cm.left_at is null and c.kind = 'dm'
      and (p.id is null or p.status <> 'banned')
      and not public.is_blocked_between(uid, cm2.user_id)
      and (p_cursor is null or c.last_activity_at < p_cursor)
    order by c.last_activity_at desc
    limit least(greatest(p_limit, 1), 50)
  ) t;
  return out;
end;
$$;

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
  left(coalesce(c.body_text, ch.body_text, ''), 160) as target_excerpt,
  coalesce(p.verified, false) as actor_verified
from public.notifications n
left join public.profiles p on p.id = n.actor_id
left join public.creations c on n.target_type = 'creation' and c.id = n.target_id
left join public.chapters ch on n.target_type = 'chapter' and ch.id = n.target_id
where n.recipient_id = auth.uid()
  and (n.actor_id is null or not public.is_blocked_between(auth.uid(), n.actor_id));
