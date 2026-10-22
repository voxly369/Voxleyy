-- Prompt 15A item 0: Rising Star of the Month from follows.created_at.

create or replace function public.close_month_core(p_month date, p_write_audit boolean default false) returns void
language plpgsql security definer set search_path = public as $$
declare
  m date := date_trunc('month', p_month)::date;
  winner uuid;
  v_book uuid;
  v_rising uuid;
  v_rising_count integer;
begin
  if exists (select 1 from public.closed_months where month = m) then return; end if;
  insert into public.closed_months (month, closed_by) values (m, auth.uid());

  select c.author_id into winner
  from public.creations c
  where c.type = 'poem' and c.status = 'published' and c.audience = 'public' and c.is_removed = false
    and date_trunc('month', c.published_at)::date = m
  order by c.like_count desc, c.published_at asc limit 1;
  if winner is not null then perform public.award_user_badge(winner, 'poem_of_month', m); end if;

  select c.id into v_book
  from public.creations c
  where c.type = 'book' and c.status = 'published' and c.audience = 'public' and c.is_removed = false
    and date_trunc('month', c.published_at)::date = m
  order by c.view_count desc, c.published_at asc limit 1;
  if v_book is not null then
    select author_id into winner from public.creations where id = v_book;
    if winner is not null then perform public.award_user_badge(winner, 'most_read', m); end if;
  end if;

  select f.followee_id, count(*)::integer into v_rising, v_rising_count
  from public.follows f
  inner join public.profiles p on p.id = f.followee_id
  where date_trunc('month', f.created_at)::date = m
    and p.role = 'writer'
    and p.follower_count < 1000
  group by f.followee_id
  having count(*) >= 3
  order by count(*) desc, f.followee_id asc
  limit 1;
  if v_rising is not null then
    perform public.award_user_badge(v_rising, 'rising_star_month', m);
  end if;

  -- video_of_month, top_seller, slam_*, monthly_top_10: sources not live

  if p_write_audit then
    perform public.founder_write_audit(
      'close_month', 'month', null, null, null, 'Closed month ' || m::text
    );
  end if;
end;
$$;
