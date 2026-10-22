-- Expose show_local_time on profiles_public (append column; preserve dependent views).

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
  p.show_local_time
from public.profiles p
where
  p.id = auth.uid()
  or public.is_founder()
  or (p.status <> 'banned' and not public.is_blocked_between(auth.uid(), p.id));
