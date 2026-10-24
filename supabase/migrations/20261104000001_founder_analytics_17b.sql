-- Prompt 17B: touch_activity rate limits, top_books in founder top content, unified creator analytics.

-- Touch flood log (service-only; touched via security definer functions).
create table if not exists public.user_activity_touch_log (
  user_id uuid not null references public.profiles (id) on delete cascade,
  touched_at timestamptz not null default now()
);

create index if not exists user_activity_touch_log_user_time_idx
  on public.user_activity_touch_log (user_id, touched_at desc);

alter table public.user_activity_touch_log enable row level security;

revoke all on public.user_activity_touch_log from public, anon, authenticated;

create or replace function public.touch_activity()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  today date := (timezone('utc', now()))::date;
  hour_start timestamptz := date_trunc('hour', timezone('utc', now()));
  touches_hour bigint;
  touches_day bigint;
  max_hour constant integer := 60;
  max_day constant integer := 240;
begin
  if uid is null or coalesce(current_setting('role', true), '') = 'anon' then
    return;
  end if;

  select count(*) into touches_hour
  from public.user_activity_touch_log t
  where t.user_id = uid and t.touched_at >= hour_start;

  if touches_hour >= max_hour then
    return;
  end if;

  select count(*) into touches_day
  from public.user_activity_touch_log t
  where t.user_id = uid and (t.touched_at at time zone 'utc')::date = today;

  if touches_day >= max_day then
    return;
  end if;

  insert into public.user_activity_touch_log (user_id, touched_at) values (uid, now());

  insert into public.user_activity_days (user_id, day)
  values (uid, today)
  on conflict (user_id, day) do nothing;

  delete from public.user_activity_touch_log
  where touched_at < timezone('utc', now()) - interval '8 days';
end;
$$;

revoke all on function public.touch_activity() from public, anon;
grant execute on function public.touch_activity() to authenticated;

-- Wire top_books from reading_progress (exclude removed / private / non-published).
create or replace function public.founder_analytics_top_content(
  p_from date,
  p_to date,
  p_window text default 'month',
  p_type text default null,
  p_sort text default 'views',
  p_limit integer default 25
) returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_start timestamptz;
  v_sort text := lower(coalesce(p_sort, 'views'));
  v_lim integer := least(greatest(coalesce(p_limit, 25), 1), 100);
  v_rows jsonb;
  v_books jsonb;
begin
  perform public.analytics_assert_founder();
  perform public.analytics_validate_date_range(p_from, p_to);

  v_start := case lower(coalesce(p_window, 'month'))
    when 'day' then timezone('utc', now()) - interval '1 day'
    when 'week' then timezone('utc', now()) - interval '7 days'
    when 'month' then timezone('utc', now()) - interval '30 days'
    when 'all' then timestamptz '-infinity'
    else timezone('utc', now()) - interval '30 days'
  end;

  if p_type is not null and btrim(p_type) <> '' then
    begin
      perform lower(p_type)::public.creation_type;
    exception when others then
      raise exception 'invalid_type' using errcode = '22023';
    end;
  end if;

  if v_sort not in ('views', 'likes', 'saves', 'comments') then
    raise exception 'invalid_sort' using errcode = '22023';
  end if;

  select coalesce(jsonb_agg(jsonb_build_object(
    'id', c.id,
    'title', c.title,
    'type', c.type,
    'author_id', c.author_id,
    'is_removed', c.is_removed,
    'views', c.view_count,
    'likes', c.like_count,
    'saves', c.save_count,
    'comments', c.comment_count,
    'published_at', c.published_at
  )), '[]'::jsonb) into v_rows
  from (
    select c.*
    from public.creations c
    where c.status = 'published'
      and c.is_removed = false
      and c.audience <> 'private'
      and (v_start = timestamptz '-infinity' or c.published_at >= v_start)
      and (p_type is null or btrim(p_type) = '' or c.type::text = lower(p_type))
    order by
      case v_sort when 'views' then c.view_count when 'likes' then c.like_count
        when 'saves' then c.save_count else c.comment_count end desc,
      c.published_at desc nulls last
    limit v_lim
  ) c;

  select coalesce(jsonb_agg(jsonb_build_object(
    'book_id', sub.book_id,
    'title', sub.title,
    'author_id', sub.author_id,
    'readers', sub.readers,
    'completed_readers', sub.completed_readers,
    'published_at', sub.published_at
  ) order by sub.readers desc, sub.completed_readers desc), '[]'::jsonb) into v_books
  from (
    select
      b.id as book_id,
      c.title,
      b.author_id,
      c.published_at,
      count(distinct rp.user_id) as readers,
      count(distinct rp.user_id) filter (where rp.completed) as completed_readers
    from public.books b
    inner join public.creations c on c.id = b.id
    left join public.reading_progress rp on rp.book_id = b.id
    where c.status = 'published'
      and c.is_removed = false
      and c.audience <> 'private'
      and (v_start = timestamptz '-infinity' or c.published_at >= v_start)
    group by b.id, c.title, b.author_id, c.published_at
    order by readers desc, completed_readers desc, c.published_at desc nulls last
    limit v_lim
  ) sub;

  return jsonb_build_object('posts', v_rows, 'top_books', coalesce(v_books, '[]'::jsonb));
end;
$$;

-- Profile analytics tab uses the same totals as Creator Dashboard overview windows.
create or replace function public.get_creator_analytics()
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  today date := (timezone('utc', now()))::date;
  o7 jsonb;
  o30 jsonb;
  f_count integer;
  best jsonb;
begin
  if uid is null or coalesce(current_setting('role', true), '') = 'anon' then
    raise exception 'forbidden';
  end if;
  if not public.user_is_writer_for_analytics(uid) then
    raise exception 'forbidden' using errcode = '42501';
  end if;

  o7 := public.get_creator_dashboard_overview(today - 6, today);
  o30 := public.get_creator_dashboard_overview(today - 29, today);

  select follower_count into f_count from public.profiles where id = uid;

  select jsonb_build_object(
    'id', c.id, 'title', c.title, 'views', c.view_count, 'likes', c.like_count
  ) into best
  from public.creations c
  where c.author_id = uid and c.audience = 'public' and c.status = 'published' and c.is_removed = false
  order by c.view_count desc, c.like_count desc
  limit 1;

  return jsonb_build_object(
    'views_7d', coalesce((o7->>'views')::integer, 0),
    'likes_7d', coalesce((o7->>'likes')::integer, 0),
    'saves_7d', coalesce((o7->>'saves')::integer, 0),
    'comments_7d', coalesce((o7->>'comments')::integer, 0),
    'followers_7d', coalesce(f_count, 0),
    'views_30d', coalesce((o30->>'views')::integer, 0),
    'likes_30d', coalesce((o30->>'likes')::integer, 0),
    'saves_30d', coalesce((o30->>'saves')::integer, 0),
    'comments_30d', coalesce((o30->>'comments')::integer, 0),
    'followers_30d', coalesce(f_count, 0),
    'best_piece', best,
    'dashboard_overview_7d', o7,
    'dashboard_overview_30d', o30
  );
end;
$$;

create index if not exists creation_view_events_creation_viewed_idx
  on public.creation_view_events (creation_id, viewed_at);

create index if not exists follow_events_followee_created_idx
  on public.follow_events (followee_id, created_at);

create index if not exists reading_progress_book_completed_idx
  on public.reading_progress (book_id, completed);
