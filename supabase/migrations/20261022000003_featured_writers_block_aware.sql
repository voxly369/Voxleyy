-- Block-aware featured writers (definer view must still respect caller blocks).

create or replace view public.founder_featured_writers_public
with (security_invoker = false)
as
select
  ff.writer_id,
  ff.sort_order,
  p.id,
  p.username,
  p.display_name,
  p.avatar_url,
  p.verified,
  p.bio,
  p.follower_count
from public.founder_featured_writers ff
inner join public.profiles_public p on p.id = ff.writer_id
where ff.active
  and p.status = 'active'
  and not public.is_blocked_between(auth.uid(), p.id);

revoke all on table public.founder_featured_writers_public from public, anon;
grant select on table public.founder_featured_writers_public to authenticated;
