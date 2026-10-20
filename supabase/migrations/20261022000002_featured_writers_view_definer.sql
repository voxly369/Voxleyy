-- Featured writers public view must run as owner so authenticated users can read
-- without direct SELECT on founder_featured_writers (RLS, no grants).

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
  and p.status = 'active';

revoke all on table public.founder_featured_writers_public from public, anon;
grant select on table public.founder_featured_writers_public to authenticated;
