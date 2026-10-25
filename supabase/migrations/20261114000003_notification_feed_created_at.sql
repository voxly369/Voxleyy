-- Restore scheduled notification visibility: feed must hide rows until created_at <= now().

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
  and n.created_at <= now()
  and (n.actor_id is null or not public.is_blocked_between(auth.uid(), n.actor_id));
