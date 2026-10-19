-- Voxly profile hardening.
-- Username changes are a later feature. handle_new_user() is the only path that checks
-- reserved words and the username format before insert. A direct UPDATE of username
-- skipped those checks, so authenticated loses that column.
-- status_reason is a private moderation note. Table-level SELECT covered every column,
-- including that one. Replace it with an explicit column list that omits status_reason.
-- security definer functions (founder_set_user_status, handle_new_user, counter triggers)
-- run as the table owner and keep their access. anon stays with no table grants.
-- No other column's read or write privilege changes.

revoke select on table public.profiles from authenticated;

grant select (
  id,
  username,
  display_name,
  bio,
  avatar_url,
  banner_url,
  website,
  country,
  city,
  city_visible,
  timezone,
  language,
  role,
  status,
  suspended_until,
  verified,
  who_can_message,
  follower_count,
  following_count,
  creation_count,
  created_at,
  updated_at
) on table public.profiles to authenticated;

revoke update (username) on table public.profiles from authenticated;
