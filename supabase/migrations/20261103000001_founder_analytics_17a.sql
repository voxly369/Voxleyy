-- Prompt 17A: activity tracking, daily_metrics, founder/creator analytics RPCs, follow_events.

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------

create table public.user_activity_days (
  user_id uuid not null references public.profiles(id) on delete cascade,
  day date not null,
  first_seen_at timestamptz not null default now(),
  primary key (user_id, day)
);

create index user_activity_days_day_idx on public.user_activity_days (day, user_id);

alter table public.user_activity_days enable row level security;
revoke all on table public.user_activity_days from public, anon, authenticated;

create table public.daily_metrics (
  day date not null,
  metric_key text not null,
  dimension text not null default '',
  value bigint not null default 0,
  primary key (day, metric_key, dimension)
);

create index daily_metrics_key_day_idx on public.daily_metrics (metric_key, day desc);

alter table public.daily_metrics enable row level security;
revoke all on table public.daily_metrics from public, anon, authenticated;

create table public.daily_metrics_state (
  id integer primary key default 1 check (id = 1),
  last_completed_day date,
  refreshed_at timestamptz not null default now()
);

insert into public.daily_metrics_state (id) values (1) on conflict do nothing;

alter table public.daily_metrics_state enable row level security;
revoke all on table public.daily_metrics_state from public, anon, authenticated;

create table public.follow_events (
  id bigint generated always as identity primary key,
  follower_id uuid not null references public.profiles(id) on delete cascade,
  followee_id uuid not null references public.profiles(id) on delete cascade,
  event_type text not null check (event_type in ('follow', 'unfollow')),
  created_at timestamptz not null default now()
);

create index follow_events_followee_created_idx on public.follow_events (followee_id, created_at desc);
create index follow_events_created_idx on public.follow_events (created_at desc);

alter table public.follow_events enable row level security;
revoke all on table public.follow_events from public, anon, authenticated;

create table public.analytics_export_audit (
  id uuid primary key default gen_random_uuid(),
  exported_by uuid not null references public.profiles(id) on delete cascade,
  section text not null,
  row_count integer not null check (row_count >= 0),
  params jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

alter table public.analytics_export_audit enable row level security;
revoke all on table public.analytics_export_audit from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- Helpers
-- ---------------------------------------------------------------------------

create or replace function public.analytics_assert_founder()
returns void
language plpgsql
set search_path = public
as $$
begin
  if coalesce(current_setting('role', true), '') = 'anon' or auth.uid() is null then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  if lower(coalesce((select email from auth.users where id = auth.uid()), '')) <> public.founder_email() then
    raise exception 'forbidden' using errcode = '42501';
  end if;
end;
$$;

revoke all on function public.analytics_assert_founder() from public, anon;
grant execute on function public.analytics_assert_founder() to authenticated;

create or replace function public.analytics_validate_date_range(p_from date, p_to date)
returns void
language plpgsql
immutable
as $$
begin
  if p_from is null or p_to is null then
    raise exception 'invalid_range' using errcode = '22023';
  end if;
  if p_to < p_from then
    raise exception 'invalid_range' using errcode = '22023';
  end if;
  if p_to - p_from > 400 then
    raise exception 'range_too_large' using errcode = '22023';
  end if;
end;
$$;

create or replace function public.analytics_normalize_country(p_country text)
returns char(2)
language plpgsql
immutable
as $$
begin
  if p_country is null or btrim(p_country) = '' then
    return null;
  end if;
  if upper(btrim(p_country)) !~ '^[A-Z]{2}$' then
    raise exception 'invalid_country' using errcode = '22023';
  end if;
  return upper(btrim(p_country))::char(2);
end;
$$;

create or replace function public.analytics_normalize_role(p_role text)
returns public.user_role
language plpgsql
immutable
as $$
begin
  if p_role is null or btrim(p_role) = '' then
    return null;
  end if;
  if lower(btrim(p_role)) not in ('reader', 'writer', 'founder') then
    raise exception 'invalid_role' using errcode = '22023';
  end if;
  return lower(btrim(p_role))::public.user_role;
end;
$$;

create or replace function public.user_is_writer_for_analytics(p_user uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.creations c
    where c.author_id = p_user
      and c.status = 'published'
      and c.published_at is not null
  );
$$;

revoke all on function public.user_is_writer_for_analytics(uuid) from public, anon;
grant execute on function public.user_is_writer_for_analytics(uuid) to authenticated;

create or replace function public.analytics_active_profile_filter(p_alias text default 'p')
returns text
language sql
immutable
as $$
  select format('%I.status = ''active'' and %I.role <> ''founder''', p_alias, p_alias);
$$;

-- ---------------------------------------------------------------------------
-- touch_activity (daily idempotent)
-- ---------------------------------------------------------------------------

create or replace function public.touch_activity()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  today date := (timezone('utc', now()))::date;
begin
  if uid is null or coalesce(current_setting('role', true), '') = 'anon' then
    return;
  end if;
  insert into public.user_activity_days (user_id, day)
  values (uid, today)
  on conflict (user_id, day) do nothing;
end;
$$;

revoke all on function public.touch_activity() from public, anon;
grant execute on function public.touch_activity() to authenticated;

-- ---------------------------------------------------------------------------
-- follow_events triggers
-- ---------------------------------------------------------------------------

create or replace function public.record_follow_event() returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    insert into public.follow_events (follower_id, followee_id, event_type)
    values (new.follower_id, new.followee_id, 'follow');
    return new;
  elsif tg_op = 'DELETE' then
    insert into public.follow_events (follower_id, followee_id, event_type)
    values (old.follower_id, old.followee_id, 'unfollow');
    return old;
  end if;
  return null;
end;
$$;

drop trigger if exists follows_record_event on public.follows;
create trigger follows_record_event
  after insert or delete on public.follows
  for each row execute function public.record_follow_event();

-- ---------------------------------------------------------------------------
-- refresh_daily_metrics
-- ---------------------------------------------------------------------------

create or replace function public.refresh_daily_metrics(p_from date, p_to date)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  d date;
  got_lock boolean;
  v_signups bigint;
  v_dau bigint;
  v_posts bigint;
  v_comments bigint;
  v_likes bigint;
  v_saves bigint;
  v_follows bigint;
  v_views bigint;
  v_new_writers bigint;
  r record;
begin
  perform public.analytics_assert_founder();
  perform public.analytics_validate_date_range(p_from, p_to);

  got_lock := pg_try_advisory_lock(hashtext('voxly_daily_metrics_refresh'));
  if not got_lock then
    return jsonb_build_object('status', 'skipped', 'reason', 'locked');
  end if;

  begin
    d := p_from;
    while d <= p_to loop
      -- signups total
      select count(*) into v_signups
      from public.profiles p
      where p.created_at >= d and p.created_at < d + 1
        and p.status = 'active' and p.role <> 'founder';
      insert into public.daily_metrics (day, metric_key, dimension, value)
      values (d, 'signups', '', v_signups)
      on conflict (day, metric_key, dimension) do update set value = excluded.value;

      -- signups by country
      for r in
        select coalesce(p.country, 'ZZ') as c, count(*) as n
        from public.profiles p
        where p.created_at >= d and p.created_at < d + 1
          and p.status = 'active' and p.role <> 'founder'
        group by 1
      loop
        insert into public.daily_metrics (day, metric_key, dimension, value)
        values (d, 'signups', 'country:' || r.c, r.n)
        on conflict (day, metric_key, dimension) do update set value = excluded.value;
      end loop;

      -- signups by role
      for r in
        select p.role::text as role_name, count(*) as n
        from public.profiles p
        where p.created_at >= d and p.created_at < d + 1
          and p.status = 'active' and p.role <> 'founder'
        group by p.role
      loop
        insert into public.daily_metrics (day, metric_key, dimension, value)
        values (d, 'signups', 'role:' || r.role_name, r.n)
        on conflict (day, metric_key, dimension) do update set value = excluded.value;
      end loop;

      select count(distinct uad.user_id) into v_dau
      from public.user_activity_days uad
      inner join public.profiles p on p.id = uad.user_id
      where uad.day = d and p.status = 'active' and p.role <> 'founder';
      insert into public.daily_metrics (day, metric_key, dimension, value)
      values (d, 'dau', '', v_dau)
      on conflict (day, metric_key, dimension) do update set value = excluded.value;

      select count(*) into v_posts
      from public.creations c
      where c.status = 'published' and c.published_at >= d and c.published_at < d + 1
        and c.is_removed = false;
      insert into public.daily_metrics (day, metric_key, dimension, value)
      values (d, 'posts_published', '', v_posts)
      on conflict (day, metric_key, dimension) do update set value = excluded.value;

      select count(*) into v_comments
      from public.comments cm
      where cm.created_at >= d and cm.created_at < d + 1 and cm.is_removed = false;
      insert into public.daily_metrics (day, metric_key, dimension, value)
      values (d, 'comments', '', v_comments)
      on conflict (day, metric_key, dimension) do update set value = excluded.value;

      select count(*) into v_likes from public.likes l where l.created_at >= d and l.created_at < d + 1;
      insert into public.daily_metrics (day, metric_key, dimension, value)
      values (d, 'likes', '', v_likes)
      on conflict (day, metric_key, dimension) do update set value = excluded.value;

      select count(*) into v_saves from public.saves s where s.created_at >= d and s.created_at < d + 1;
      insert into public.daily_metrics (day, metric_key, dimension, value)
      values (d, 'saves', '', v_saves)
      on conflict (day, metric_key, dimension) do update set value = excluded.value;

      select count(*) into v_follows from public.follows f where f.created_at >= d and f.created_at < d + 1;
      insert into public.daily_metrics (day, metric_key, dimension, value)
      values (d, 'follows', '', v_follows)
      on conflict (day, metric_key, dimension) do update set value = excluded.value;

      select count(*) into v_views
      from public.creation_view_events e
      where e.viewed_at >= d and e.viewed_at < d + 1;
      insert into public.daily_metrics (day, metric_key, dimension, value)
      values (d, 'views', '', v_views)
      on conflict (day, metric_key, dimension) do update set value = excluded.value;

      select count(distinct c.author_id) into v_new_writers
      from public.creations c
      where c.status = 'published'
        and c.published_at >= d and c.published_at < d + 1
        and not exists (
          select 1 from public.creations c2
          where c2.author_id = c.author_id
            and c2.status = 'published'
            and c2.published_at < d
        );
      insert into public.daily_metrics (day, metric_key, dimension, value)
      values (d, 'new_writers', '', v_new_writers)
      on conflict (day, metric_key, dimension) do update set value = excluded.value;

      d := d + 1;
    end loop;

    update public.daily_metrics_state
    set last_completed_day = greatest(coalesce(last_completed_day, p_from - 1), p_to),
        refreshed_at = now()
    where id = 1;

    perform pg_advisory_unlock(hashtext('voxly_daily_metrics_refresh'));
    return jsonb_build_object('status', 'ok', 'from', p_from, 'to', p_to);
  exception when others then
    perform pg_advisory_unlock(hashtext('voxly_daily_metrics_refresh'));
    raise;
  end;
end;
$$;

revoke all on function public.refresh_daily_metrics(date, date) from public, anon;
grant execute on function public.refresh_daily_metrics(date, date) to authenticated;

create or replace function public.founder_prepare_daily_metrics(p_from date, p_to date)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  yesterday date := (timezone('utc', now()))::date - 1;
  start_day date;
  end_day date;
  st record;
  parts jsonb := '[]'::jsonb;
  r jsonb;
begin
  perform public.analytics_assert_founder();
  perform public.analytics_validate_date_range(p_from, p_to);

  select * into st from public.daily_metrics_state where id = 1;

  start_day := coalesce(st.last_completed_day + 1, p_from);
  if start_day > yesterday then
    start_day := greatest(yesterday - 1, p_from);
  end if;
  end_day := least(yesterday, p_to);
  if start_day <= end_day then
    r := public.refresh_daily_metrics(start_day, end_day);
    parts := parts || jsonb_build_array(r);
  end if;

  start_day := greatest(yesterday - 1, p_from);
  end_day := least(yesterday, p_to);
  if start_day <= end_day then
    r := public.refresh_daily_metrics(start_day, end_day);
    parts := parts || jsonb_build_array(r);
  end if;

  return jsonb_build_object('refreshes', parts, 'last_completed_day', (select last_completed_day from public.daily_metrics_state where id = 1));
end;
$$;

revoke all on function public.founder_prepare_daily_metrics(date, date) from public, anon;
grant execute on function public.founder_prepare_daily_metrics(date, date) to authenticated;

-- ---------------------------------------------------------------------------
-- Founder analytics (json payloads, capped lists)
-- ---------------------------------------------------------------------------

create or replace function public.founder_analytics_overview(
  p_from date,
  p_to date,
  p_country text default null,
  p_role text default null
) returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_country char(2) := public.analytics_normalize_country(p_country);
  v_role public.user_role := public.analytics_normalize_role(p_role);
  v_users bigint;
  v_writers bigint;
  v_new7 bigint;
  v_new30 bigint;
  v_prev_new7 bigint;
  v_prev_new30 bigint;
  v_dau_today bigint;
  v_follows bigint;
  v_posts bigint;
  v_comments bigint;
  v_open_reports bigint;
  v_series_signups jsonb;
  v_series_dau jsonb;
begin
  perform public.analytics_assert_founder();
  perform public.analytics_validate_date_range(p_from, p_to);

  select count(*) into v_users from public.profiles p
  where p.status = 'active' and p.role <> 'founder'
    and (v_country is null or p.country = v_country)
    and (v_role is null or p.role = v_role);

  select count(*) into v_writers from public.profiles p
  where p.status = 'active' and p.role = 'writer'
    and (v_country is null or p.country = v_country);

  select count(*) into v_new7 from public.profiles p
  where p.created_at >= timezone('utc', now()) - interval '7 days'
    and p.status = 'active' and p.role <> 'founder'
    and (v_country is null or p.country = v_country)
    and (v_role is null or p.role = v_role);

  select count(*) into v_new30 from public.profiles p
  where p.created_at >= timezone('utc', now()) - interval '30 days'
    and p.status = 'active' and p.role <> 'founder'
    and (v_country is null or p.country = v_country)
    and (v_role is null or p.role = v_role);

  select count(*) into v_prev_new7 from public.profiles p
  where p.created_at >= timezone('utc', now()) - interval '14 days'
    and p.created_at < timezone('utc', now()) - interval '7 days'
    and p.status = 'active' and p.role <> 'founder'
    and (v_country is null or p.country = v_country)
    and (v_role is null or p.role = v_role);

  select count(*) into v_prev_new30 from public.profiles p
  where p.created_at >= timezone('utc', now()) - interval '60 days'
    and p.created_at < timezone('utc', now()) - interval '30 days'
    and p.status = 'active' and p.role <> 'founder'
    and (v_country is null or p.country = v_country)
    and (v_role is null or p.role = v_role);

  select coalesce(max(value), 0) into v_dau_today
  from public.daily_metrics
  where metric_key = 'dau' and dimension = '' and day = (timezone('utc', now()))::date;

  select count(*) into v_follows from public.follows f
  inner join public.profiles p on p.id = f.followee_id
  where p.status = 'active' and p.role <> 'founder';

  select count(*) into v_posts from public.creations c where c.status = 'published' and c.is_removed = false;
  select count(*) into v_comments from public.comments cm where cm.is_removed = false;
  select count(*) into v_open_reports from public.reports r where r.status = 'open';

  select coalesce(jsonb_agg(jsonb_build_object('day', day, 'value', value) order by day), '[]'::jsonb)
  into v_series_signups
  from (
    select dm.day, dm.value
    from public.daily_metrics dm
    where dm.metric_key = 'signups' and dm.dimension = ''
      and dm.day between p_from and p_to
    order by dm.day
    limit 400
  ) s;

  select coalesce(jsonb_agg(jsonb_build_object('day', day, 'value', value) order by day), '[]'::jsonb)
  into v_series_dau
  from (
    select dm.day, dm.value
    from public.daily_metrics dm
    where dm.metric_key = 'dau' and dm.dimension = ''
      and dm.day between p_from and p_to
    order by dm.day
    limit 400
  ) s;

  return jsonb_build_object(
    'total_users', v_users,
    'total_writers', v_writers,
    'new_users_7d', v_new7,
    'new_users_30d', v_new30,
    'prev_new_users_7d', v_prev_new7,
    'prev_new_users_30d', v_prev_new30,
    'dau_latest', v_dau_today,
    'total_follows', v_follows,
    'total_posts', v_posts,
    'total_comments', v_comments,
    'open_reports', v_open_reports,
    'signups_series', v_series_signups,
    'dau_series', v_series_dau
  );
end;
$$;

revoke all on function public.founder_analytics_overview(date, date, text, text) from public, anon;
grant execute on function public.founder_analytics_overview(date, date, text, text) to authenticated;

create or replace function public.founder_analytics_retention(
  p_from date,
  p_to date,
  p_country text default null,
  p_role text default null
) returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_country char(2) := public.analytics_normalize_country(p_country);
  v_role public.user_role := public.analytics_normalize_role(p_role);
  v_cohort bigint;
  v_d1 bigint;
  v_d7 bigint;
  v_d30 bigint;
  v_active bigint;
  v_inactive bigint;
  v_cohorts jsonb;
begin
  perform public.analytics_assert_founder();
  perform public.analytics_validate_date_range(p_from, p_to);

  select count(*) into v_cohort
  from public.profiles p
  where p.created_at::date between p_from and p_to
    and p.status = 'active' and p.role <> 'founder'
    and (v_country is null or p.country = v_country)
    and (v_role is null or p.role = v_role);

  select count(distinct p.id) into v_d1
  from public.profiles p
  inner join public.user_activity_days a on a.user_id = p.id and a.day = p.created_at::date + 1
  where p.created_at::date between p_from and p_to
    and p.status = 'active' and p.role <> 'founder'
    and (v_country is null or p.country = v_country)
    and (v_role is null or p.role = v_role);

  select count(distinct p.id) into v_d7
  from public.profiles p
  inner join public.user_activity_days a on a.user_id = p.id and a.day = p.created_at::date + 7
  where p.created_at::date between p_from and p_to
    and p.status = 'active' and p.role <> 'founder'
    and (v_country is null or p.country = v_country)
    and (v_role is null or p.role = v_role);

  select count(distinct p.id) into v_d30
  from public.profiles p
  inner join public.user_activity_days a on a.user_id = p.id and a.day = p.created_at::date + 30
  where p.created_at::date between p_from and p_to
    and p.status = 'active' and p.role <> 'founder'
    and (v_country is null or p.country = v_country)
    and (v_role is null or p.role = v_role);

  select count(*) into v_active
  from public.profiles p
  where p.status = 'active' and p.role <> 'founder'
    and exists (
      select 1 from public.user_activity_days u
      where u.user_id = p.id and u.day >= (timezone('utc', now()))::date - 13
    )
    and (v_country is null or p.country = v_country)
    and (v_role is null or p.role = v_role);

  select count(*) into v_inactive
  from public.profiles p
  where p.status = 'active' and p.role <> 'founder'
    and not exists (
      select 1 from public.user_activity_days u
      where u.user_id = p.id and u.day >= (timezone('utc', now()))::date - 13
    )
    and (v_country is null or p.country = v_country)
    and (v_role is null or p.role = v_role);

  select coalesce(jsonb_agg(cohort_row order by week_start), '[]'::jsonb) into v_cohorts
  from (
    select
      date_trunc('week', p.created_at)::date as week_start,
      jsonb_build_object(
        'week_start', date_trunc('week', p.created_at)::date,
        'signups', count(*),
        'day1_returns', count(*) filter (where exists (
          select 1 from public.user_activity_days u
          where u.user_id = p.id and u.day = p.created_at::date + 1
        )),
        'day7_returns', count(*) filter (where exists (
          select 1 from public.user_activity_days u
          where u.user_id = p.id and u.day = p.created_at::date + 7
        ))
      ) as cohort_row
    from public.profiles p
    where p.created_at::date between p_from and p_to
      and p.status = 'active' and p.role <> 'founder'
      and (v_country is null or p.country = v_country)
      and (v_role is null or p.role = v_role)
    group by date_trunc('week', p.created_at)::date
    order by week_start
    limit 52
  ) q;

  return jsonb_build_object(
    'cohort_signups', v_cohort,
    'day1_returns', v_d1,
    'day7_returns', v_d7,
    'day30_returns', v_d30,
    'day1_rate', case when v_cohort > 0 then round(v_d1::numeric / v_cohort, 4) else 0 end,
    'day7_rate', case when v_cohort > 0 then round(v_d7::numeric / v_cohort, 4) else 0 end,
    'day30_rate', case when v_cohort > 0 then round(v_d30::numeric / v_cohort, 4) else 0 end,
    'active_users', v_active,
    'inactive_users', v_inactive,
    'cohorts_by_week', v_cohorts
  );
end;
$$;

revoke all on function public.founder_analytics_retention(date, date, text, text) from public, anon;
grant execute on function public.founder_analytics_retention(date, date, text, text) to authenticated;

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
      and (v_start = timestamptz '-infinity' or c.published_at >= v_start)
      and (p_type is null or btrim(p_type) = '' or c.type::text = lower(p_type))
    order by
      case v_sort when 'views' then c.view_count when 'likes' then c.like_count
        when 'saves' then c.save_count else c.comment_count end desc,
      c.published_at desc nulls last
    limit v_lim
  ) c;

  return jsonb_build_object('posts', v_rows, 'top_books', '[]'::jsonb);
end;
$$;

revoke all on function public.founder_analytics_top_content(date, date, text, text, text, integer) from public, anon;
grant execute on function public.founder_analytics_top_content(date, date, text, text, text, integer) to authenticated;

create or replace function public.founder_analytics_top_creators(
  p_from date,
  p_to date,
  p_country text default null,
  p_limit integer default 25
) returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_country char(2) := public.analytics_normalize_country(p_country);
  v_lim integer := least(greatest(coalesce(p_limit, 25), 1), 100);
  v_most_followed jsonb;
  v_fastest jsonb;
  v_most_active jsonb;
begin
  perform public.analytics_assert_founder();
  perform public.analytics_validate_date_range(p_from, p_to);

  select coalesce(jsonb_agg(row), '[]'::jsonb) into v_most_followed from (
    select jsonb_build_object(
      'user_id', p.id,
      'username', p.username,
      'display_name', p.display_name,
      'follower_count', p.follower_count
    ) as row
    from public.profiles p
    where p.status = 'active' and p.role in ('reader', 'writer')
      and (v_country is null or p.country = v_country)
    order by p.follower_count desc, p.username
    limit v_lim
  ) q;

  select coalesce(jsonb_agg(row), '[]'::jsonb) into v_fastest from (
    select jsonb_build_object(
      'user_id', p.id,
      'username', p.username,
      'display_name', p.display_name,
      'new_follows', count(*)
    ) as row
    from public.follows f
    inner join public.profiles p on p.id = f.followee_id
    where f.created_at::date between p_from and p_to
      and p.status = 'active' and p.role <> 'founder'
      and (v_country is null or p.country = v_country)
    group by p.id, p.username, p.display_name
    order by count(*) desc
    limit v_lim
  ) q;

  select coalesce(jsonb_agg(row), '[]'::jsonb) into v_most_active from (
    select jsonb_build_object(
      'user_id', p.id,
      'username', p.username,
      'display_name', p.display_name,
      'posts', count(*)
    ) as row
    from public.creations c
    inner join public.profiles p on p.id = c.author_id
    where c.status = 'published' and c.is_removed = false
      and c.published_at::date between p_from and p_to
      and p.status = 'active' and p.role <> 'founder'
      and (v_country is null or p.country = v_country)
    group by p.id, p.username, p.display_name
    order by count(*) desc
    limit v_lim
  ) q;

  return jsonb_build_object(
    'most_followed', v_most_followed,
    'fastest_growing', v_fastest,
    'most_active', v_most_active
  );
end;
$$;

revoke all on function public.founder_analytics_top_creators(date, date, text, integer) from public, anon;
grant execute on function public.founder_analytics_top_creators(date, date, text, integer) to authenticated;

create or replace function public.founder_analytics_platform_health(
  p_from date,
  p_to date
) returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_books bigint;
  v_chapters bigint;
  v_readers bigint;
  v_writers bigint;
  v_recent_signups jsonb;
  v_recent_posts jsonb;
  v_errors bigint;
  v_reports jsonb;
begin
  perform public.analytics_assert_founder();
  perform public.analytics_validate_date_range(p_from, p_to);

  select count(*) into v_books from public.books;
  select count(*) into v_chapters from public.chapters;
  select count(*) into v_readers from public.profiles where role = 'reader' and status = 'active';
  select count(*) into v_writers from public.profiles where role = 'writer' and status = 'active';

  select coalesce(jsonb_agg(row), '[]'::jsonb) into v_recent_signups from (
    select jsonb_build_object(
      'id', p.id,
      'username', p.username,
      'role', p.role,
      'country', p.country,
      'created_at', p.created_at
    ) as row
    from public.profiles p
    where p.role <> 'founder'
    order by p.created_at desc
    limit 20
  ) q;

  select coalesce(jsonb_agg(row), '[]'::jsonb) into v_recent_posts from (
    select jsonb_build_object(
      'id', c.id,
      'title', c.title,
      'author_id', c.author_id,
      'published_at', c.published_at
    ) as row
    from public.creations c
    where c.status = 'published'
    order by c.published_at desc nulls last
    limit 20
  ) q;

  select count(*) into v_errors from public.client_errors where created_at >= p_from and created_at < p_to + 1;

  select coalesce(jsonb_object_agg(status, n), '{}'::jsonb) into v_reports
  from (
    select status::text as status, count(*) as n
    from public.reports
    group by status
  ) r;

  return jsonb_build_object(
    'books', v_books,
    'chapters', v_chapters,
    'writers', v_writers,
    'readers', v_readers,
    'writer_reader_ratio', case when v_readers > 0 then round(v_writers::numeric / v_readers, 4) else null end,
    'recent_signups', v_recent_signups,
    'recent_posts', v_recent_posts,
    'client_errors_in_range', v_errors,
    'reports_by_status', v_reports
  );
end;
$$;

revoke all on function public.founder_analytics_platform_health(date, date) from public, anon;
grant execute on function public.founder_analytics_platform_health(date, date) to authenticated;

create or replace function public.founder_analytics_audience(
  p_country text default null,
  p_role text default null
) returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_country char(2) := public.analytics_normalize_country(p_country);
  v_role public.user_role := public.analytics_normalize_role(p_role);
  v_by_country jsonb;
  v_by_tz jsonb;
  v_by_lang jsonb;
  v_by_role jsonb;
begin
  perform public.analytics_assert_founder();

  select coalesce(jsonb_agg(row), '[]'::jsonb) into v_by_country from (
    select jsonb_build_object('label', coalesce(p.country::text, 'Unknown'), 'value', count(*)) as row
    from public.profiles p
    where p.status = 'active' and p.role <> 'founder'
      and (v_role is null or p.role = v_role)
    group by coalesce(p.country::text, 'Unknown')
    order by count(*) desc
    limit 50
  ) q;

  select coalesce(jsonb_agg(row), '[]'::jsonb) into v_by_tz from (
    select jsonb_build_object('label', p.timezone, 'value', count(*)) as row
    from public.profiles p
    where p.status = 'active' and p.role <> 'founder'
      and (v_country is null or p.country = v_country)
      and (v_role is null or p.role = v_role)
    group by p.timezone
    order by count(*) desc
    limit 50
  ) q;

  select coalesce(jsonb_agg(row), '[]'::jsonb) into v_by_lang from (
    select jsonb_build_object('label', p.language, 'value', count(*)) as row
    from public.profiles p
    where p.status = 'active' and p.role <> 'founder'
      and (v_country is null or p.country = v_country)
      and (v_role is null or p.role = v_role)
    group by p.language
    order by count(*) desc
    limit 50
  ) q;

  select coalesce(jsonb_agg(row), '[]'::jsonb) into v_by_role from (
    select jsonb_build_object('label', p.role::text, 'value', count(*)) as row
    from public.profiles p
    where p.status = 'active' and p.role <> 'founder'
      and (v_country is null or p.country = v_country)
    group by p.role
    order by count(*) desc
  ) q;

  return jsonb_build_object(
    'by_country', v_by_country,
    'by_timezone', v_by_tz,
    'by_language', v_by_lang,
    'by_role', v_by_role
  );
end;
$$;

revoke all on function public.founder_analytics_audience(text, text) from public, anon;
grant execute on function public.founder_analytics_audience(text, text) to authenticated;

create or replace function public.founder_analytics_following(
  p_from date,
  p_to date,
  p_limit integer default 25
) returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_total bigint;
  v_series jsonb;
  v_fastest jsonb;
  v_lim integer := least(greatest(coalesce(p_limit, 25), 1), 100);
begin
  perform public.analytics_assert_founder();
  perform public.analytics_validate_date_range(p_from, p_to);

  select count(*) into v_total from public.follows;

  select coalesce(jsonb_agg(jsonb_build_object('day', day, 'value', value) order by day), '[]'::jsonb)
  into v_series
  from (
    select dm.day, dm.value
    from public.daily_metrics dm
    where dm.metric_key = 'follows' and dm.dimension = ''
      and dm.day between p_from and p_to
    order by dm.day
    limit 400
  ) s;

  select coalesce(jsonb_agg(row), '[]'::jsonb) into v_fastest from (
    select jsonb_build_object(
      'user_id', p.id,
      'username', p.username,
      'display_name', p.display_name,
      'new_follows', count(*)
    ) as row
    from public.follows f
    inner join public.profiles p on p.id = f.followee_id
    where f.created_at::date between p_from and p_to
      and p.status = 'active' and p.role <> 'founder'
    group by p.id, p.username, p.display_name
    order by count(*) desc
    limit v_lim
  ) q;

  return jsonb_build_object('total_follows', v_total, 'daily_series', v_series, 'fastest_growing', v_fastest);
end;
$$;

revoke all on function public.founder_analytics_following(date, date, integer) from public, anon;
grant execute on function public.founder_analytics_following(date, date, integer) to authenticated;

create or replace function public.founder_analytics_engagement(
  p_from date,
  p_to date
) returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_views jsonb;
  v_likes jsonb;
  v_saves jsonb;
  v_comments jsonb;
  v_completion_note text := 'Post reading completion is tracked in library progress; book completion uses reading_progress when readers finish chapters.';
begin
  perform public.analytics_assert_founder();
  perform public.analytics_validate_date_range(p_from, p_to);

  select coalesce(jsonb_agg(jsonb_build_object('day', day, 'value', value) order by day), '[]'::jsonb)
  into v_views from (
    select day, value from public.daily_metrics
    where metric_key = 'views' and dimension = '' and day between p_from and p_to order by day limit 400
  ) s;
  select coalesce(jsonb_agg(jsonb_build_object('day', day, 'value', value) order by day), '[]'::jsonb)
  into v_likes from (
    select day, value from public.daily_metrics
    where metric_key = 'likes' and dimension = '' and day between p_from and p_to order by day limit 400
  ) s;
  select coalesce(jsonb_agg(jsonb_build_object('day', day, 'value', value) order by day), '[]'::jsonb)
  into v_saves from (
    select day, value from public.daily_metrics
    where metric_key = 'saves' and dimension = '' and day between p_from and p_to order by day limit 400
  ) s;
  select coalesce(jsonb_agg(jsonb_build_object('day', day, 'value', value) order by day), '[]'::jsonb)
  into v_comments from (
    select day, value from public.daily_metrics
    where metric_key = 'comments' and dimension = '' and day between p_from and p_to order by day limit 400
  ) s;

  return jsonb_build_object(
    'views_series', v_views,
    'likes_series', v_likes,
    'saves_series', v_saves,
    'comments_series', v_comments,
    'completion_note', v_completion_note
  );
end;
$$;

revoke all on function public.founder_analytics_engagement(date, date) from public, anon;
grant execute on function public.founder_analytics_engagement(date, date) to authenticated;

-- Export helper
create or replace function public.founder_analytics_export(
  p_section text,
  p_from date,
  p_to date,
  p_country text default null,
  p_role text default null
) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  payload jsonb;
  rows jsonb := '[]'::jsonb;
  n integer := 0;
  max_rows constant integer := 50000;
begin
  perform public.analytics_assert_founder();
  perform public.analytics_validate_date_range(p_from, p_to);

  case lower(btrim(p_section))
    when 'overview' then
      rows := jsonb_build_array(public.founder_analytics_overview(p_from, p_to, p_country, p_role));
    when 'retention' then
      rows := jsonb_build_array(public.founder_analytics_retention(p_from, p_to, p_country, p_role));
    when 'top_content' then
      payload := public.founder_analytics_top_content(p_from, p_to, 'all', null, 'views', 100);
      rows := payload->'posts';
    when 'top_creators' then
      rows := public.founder_analytics_top_creators(p_from, p_to, p_country, 100)->'most_followed';
    when 'platform_health' then
      rows := jsonb_build_array(public.founder_analytics_platform_health(p_from, p_to));
    when 'audience' then
      rows := jsonb_build_array(public.founder_analytics_audience(p_country, p_role));
    when 'following' then
      rows := jsonb_build_array(public.founder_analytics_following(p_from, p_to, 100));
    when 'engagement' then
      rows := jsonb_build_array(public.founder_analytics_engagement(p_from, p_to));
    else
      raise exception 'invalid_section' using errcode = '22023';
  end case;

  if jsonb_typeof(rows) = 'array' then
    n := jsonb_array_length(rows);
  else
    rows := jsonb_build_array(rows);
    n := 1;
  end if;

  if n > max_rows then
    raise exception 'export_too_large' using errcode = '22023';
  end if;

  insert into public.analytics_export_audit (exported_by, section, row_count, params)
  values (
    uid,
    lower(btrim(p_section)),
    n,
    jsonb_build_object('from', p_from, 'to', p_to, 'country', p_country, 'role', p_role)
  );

  return jsonb_build_object('section', lower(btrim(p_section)), 'rows', rows, 'row_count', n);
end;
$$;

revoke all on function public.founder_analytics_export(text, date, date, text, text) from public, anon;
grant execute on function public.founder_analytics_export(text, date, date, text, text) to authenticated;

-- Creator dashboard RPCs
create or replace function public.get_creator_dashboard_overview(p_from date, p_to date)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  span interval;
  prev_from date;
  prev_to date;
  gained bigint;
  lost bigint;
  prev_gained bigint;
  views bigint;
  prev_views bigint;
  likes bigint;
  prev_likes bigint;
  saves bigint;
  prev_saves bigint;
  comments bigint;
  prev_comments bigint;
  series jsonb;
  unfollow_history boolean;
begin
  if uid is null or coalesce(current_setting('role', true), '') = 'anon' then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  if not public.user_is_writer_for_analytics(uid) then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  perform public.analytics_validate_date_range(p_from, p_to);
  span := (p_to - p_from + 1) * interval '1 day';
  prev_to := p_from - 1;
  prev_from := prev_to - (p_to - p_from);

  select exists (select 1 from public.follow_events limit 1) into unfollow_history;

  select count(*) into gained from public.follow_events e
  where e.followee_id = uid and e.event_type = 'follow'
    and e.created_at::date between p_from and p_to;

  select count(*) into lost from public.follow_events e
  where e.followee_id = uid and e.event_type = 'unfollow'
    and e.created_at::date between p_from and p_to;

  select count(*) into prev_gained from public.follow_events e
  where e.followee_id = uid and e.event_type = 'follow'
    and e.created_at::date between prev_from and prev_to;

  select count(*) into views from public.creation_view_events ev
  inner join public.creations c on c.id = ev.creation_id
  where c.author_id = uid and c.is_removed = false
    and ev.viewed_at::date between p_from and p_to;

  select count(*) into prev_views from public.creation_view_events ev
  inner join public.creations c on c.id = ev.creation_id
  where c.author_id = uid and c.is_removed = false
    and ev.viewed_at::date between prev_from and prev_to;

  select coalesce(sum(c.like_count), 0) into likes from public.creations c
  where c.author_id = uid and c.is_removed = false and c.published_at::date between p_from and p_to;

  select coalesce(sum(c.like_count), 0) into prev_likes from public.creations c
  where c.author_id = uid and c.is_removed = false and c.published_at::date between prev_from and prev_to;

  select coalesce(sum(c.save_count), 0) into saves from public.creations c
  where c.author_id = uid and c.is_removed = false and c.published_at::date between p_from and p_to;

  select coalesce(sum(c.save_count), 0) into prev_saves from public.creations c
  where c.author_id = uid and c.is_removed = false and c.published_at::date between prev_from and prev_to;

  select coalesce(sum(c.comment_count), 0) into comments from public.creations c
  where c.author_id = uid and c.is_removed = false and c.published_at::date between p_from and p_to;

  select coalesce(sum(c.comment_count), 0) into prev_comments from public.creations c
  where c.author_id = uid and c.is_removed = false and c.published_at::date between prev_from and prev_to;

  select coalesce(jsonb_agg(jsonb_build_object('day', d.day, 'views', coalesce(v.c, 0)) order by d.day), '[]'::jsonb)
  into series
  from generate_series(p_from, p_to, interval '1 day') as d(day)
  left join lateral (
    select count(*) as c
    from public.creation_view_events ev
    inner join public.creations c on c.id = ev.creation_id
    where c.author_id = uid and c.is_removed = false and ev.viewed_at::date = d.day::date
  ) v on true;

  return jsonb_build_object(
    'followers_gained', gained,
    'followers_lost', lost,
    'prev_followers_gained', prev_gained,
    'unfollow_history_available', unfollow_history,
    'views', views,
    'prev_views', prev_views,
    'likes', likes,
    'prev_likes', prev_likes,
    'saves', saves,
    'prev_saves', prev_saves,
    'comments', comments,
    'prev_comments', prev_comments,
    'views_series', series
  );
end;
$$;

revoke all on function public.get_creator_dashboard_overview(date, date) from public, anon;
grant execute on function public.get_creator_dashboard_overview(date, date) to authenticated;

create or replace function public.get_creator_dashboard_top_posts(
  p_window text default '30',
  p_limit integer default 25
) returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  v_start timestamptz;
  v_lim integer := least(greatest(coalesce(p_limit, 25), 1), 100);
  v_rows jsonb;
begin
  if uid is null or coalesce(current_setting('role', true), '') = 'anon' then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  if not public.user_is_writer_for_analytics(uid) then
    raise exception 'forbidden' using errcode = '42501';
  end if;

  v_start := case lower(coalesce(p_window, '30'))
    when '7' then timezone('utc', now()) - interval '7 days'
    when '30' then timezone('utc', now()) - interval '30 days'
    when '90' then timezone('utc', now()) - interval '90 days'
    when 'all' then timestamptz '-infinity'
    else timezone('utc', now()) - interval '30 days'
  end;

  select coalesce(jsonb_agg(jsonb_build_object(
    'id', c.id,
    'title', c.title,
    'views', c.view_count,
    'likes', c.like_count,
    'saves', c.save_count,
    'comments', c.comment_count,
    'published_at', c.published_at
  )), '[]'::jsonb) into v_rows
  from (
    select c.*
    from public.creations c
    where c.author_id = uid and c.status = 'published' and c.is_removed = false
      and (v_start = timestamptz '-infinity' or c.published_at >= v_start)
    order by c.view_count desc, c.like_count desc
    limit v_lim
  ) c;

  return jsonb_build_object('posts', v_rows);
end;
$$;

revoke all on function public.get_creator_dashboard_top_posts(text, integer) from public, anon;
grant execute on function public.get_creator_dashboard_top_posts(text, integer) to authenticated;

create or replace function public.get_creator_dashboard_audience(p_from date, p_to date)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  v_top jsonb;
  v_returning bigint;
  v_viewer_limit text;
begin
  if uid is null or coalesce(current_setting('role', true), '') = 'anon' then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  if not public.user_is_writer_for_analytics(uid) then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  perform public.analytics_validate_date_range(p_from, p_to);

  select coalesce(jsonb_agg(row), '[]'::jsonb) into v_top from (
    select jsonb_build_object(
      'user_id', p.id,
      'username', p.username,
      'display_name', p.display_name,
      'engagement', count(*)
    ) as row
    from (
      select l.user_id as engager
      from public.likes l
      inner join public.creations c on c.id = l.creation_id
      where c.author_id = uid and c.is_removed = false and l.created_at::date between p_from and p_to
      union all
      select cm.author_id
      from public.comments cm
      inner join public.creations c on c.id = cm.creation_id
      where c.author_id = uid and c.is_removed = false and cm.is_removed = false
        and cm.created_at::date between p_from and p_to
    ) e
    inner join public.follows fo on fo.follower_id = e.engager and fo.followee_id = uid
    inner join public.profiles p on p.id = e.engager
    where p.status = 'active'
      and not exists (select 1 from public.blocks b where (b.blocker_id = uid and b.blocked_id = p.id) or (b.blocker_id = p.id and b.blocked_id = uid))
    group by p.id, p.username, p.display_name
    order by count(*) desc
    limit 10
  ) q;

  select count(*) into v_returning
  from (
    select ev.viewer_id
    from public.creation_view_events ev
    inner join public.creations c on c.id = ev.creation_id
    where c.author_id = uid and c.is_removed = false
      and ev.viewed_at::date between p_from and p_to
      and ev.viewer_id is not null
    group by ev.viewer_id
    having count(distinct ev.viewed_at::date) >= 2
  ) r;

  v_viewer_limit := 'Returning readers counted when logged-in viewers have views on 2+ distinct days.';

  return jsonb_build_object(
    'top_engaged_followers', v_top,
    'returning_readers', v_returning,
    'returning_readers_note', v_viewer_limit
  );
end;
$$;

revoke all on function public.get_creator_dashboard_audience(date, date) from public, anon;
grant execute on function public.get_creator_dashboard_audience(date, date) to authenticated;

create or replace function public.get_creator_dashboard_wip()
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  v_drafts jsonb;
  v_books jsonb;
begin
  if uid is null or coalesce(current_setting('role', true), '') = 'anon' then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  if not public.user_is_writer_for_analytics(uid) then
    raise exception 'forbidden' using errcode = '42501';
  end if;

  select coalesce(jsonb_agg(jsonb_build_object(
    'id', c.id,
    'title', c.title,
    'type', c.type,
    'status', c.status,
    'audience', c.audience,
    'updated_at', c.updated_at
  ) order by c.updated_at desc), '[]'::jsonb) into v_drafts
  from public.creations c
  where c.author_id = uid and c.status = 'draft' and c.is_removed = false
  limit 50;

  select coalesce(jsonb_agg(jsonb_build_object(
    'id', c.id,
    'title', c.title,
    'updated_at', b.updated_at
  ) order by b.updated_at desc), '[]'::jsonb) into v_books
  from public.books b
  inner join public.creations c on c.id = b.id
  where b.author_id = uid and c.status <> 'published'
  limit 50;

  return jsonb_build_object('drafts', v_drafts, 'unpublished_books', v_books);
end;
$$;

revoke all on function public.get_creator_dashboard_wip() from public, anon;
grant execute on function public.get_creator_dashboard_wip() to authenticated;

create or replace function public.get_creator_dashboard_books()
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  v_rows jsonb;
begin
  if uid is null or coalesce(current_setting('role', true), '') = 'anon' then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  if not public.user_is_writer_for_analytics(uid) then
    raise exception 'forbidden' using errcode = '42501';
  end if;

  select coalesce(jsonb_agg(jsonb_build_object(
    'book_id', b.id,
    'title', c.title,
    'readers', (
      select count(distinct rp.user_id)
      from public.reading_progress rp
      where rp.book_id = b.id
    ),
    'completed_readers', (
      select count(distinct rp.user_id)
      from public.reading_progress rp
      where rp.book_id = b.id and rp.completed = true
    ),
    'chapter_count', (select count(*) from public.chapters ch where ch.book_id = b.id)
  )), '[]'::jsonb) into v_rows
  from public.books b
  inner join public.creations c on c.id = b.id
  where b.author_id = uid and c.status = 'published'
  limit 50;

  return jsonb_build_object('books', v_rows);
end;
$$;

revoke all on function public.get_creator_dashboard_books() from public, anon;
grant execute on function public.get_creator_dashboard_books() to authenticated;

-- Harden get_creator_analytics for writers only; exclude removed posts from aggregates
create or replace function public.get_creator_analytics()
returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare
  uid uuid := auth.uid();
  views7 integer; l7 integer; s7 integer; c7 integer; f7 integer;
  views30 integer; l30 integer; s30 integer; c30 integer; f30 integer;
  best jsonb;
begin
  if uid is null or coalesce(current_setting('role', true), '') = 'anon' then
    raise exception 'forbidden';
  end if;
  if not public.user_is_writer_for_analytics(uid) then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  select count(*) into views7 from public.creation_view_events e
    inner join public.creations c on c.id = e.creation_id
    where c.author_id = uid and c.is_removed = false and e.viewed_at > now() - interval '7 days';
  select count(*) into views30 from public.creation_view_events e
    inner join public.creations c on c.id = e.creation_id
    where c.author_id = uid and c.is_removed = false and e.viewed_at > now() - interval '30 days';
  select coalesce(sum(c.like_count),0), coalesce(sum(c.save_count),0), coalesce(sum(c.comment_count),0)
    into l7, s7, c7
    from public.creations c where c.author_id = uid and c.is_removed = false and c.published_at > now() - interval '7 days';
  select coalesce(sum(c.like_count),0), coalesce(sum(c.save_count),0), coalesce(sum(c.comment_count),0)
    into l30, s30, c30
    from public.creations c where c.author_id = uid and c.is_removed = false and c.published_at > now() - interval '30 days';
  select follower_count into f7 from public.profiles where id = uid;
  f30 := f7;
  select jsonb_build_object(
    'id', c.id, 'title', c.title, 'views', c.view_count, 'likes', c.like_count
  ) into best
  from public.creations c
  where c.author_id = uid and c.audience = 'public' and c.status = 'published' and c.is_removed = false
  order by c.view_count desc, c.like_count desc limit 1;
  return jsonb_build_object(
    'views_7d', views7, 'likes_7d', l7, 'saves_7d', s7, 'comments_7d', c7, 'followers_7d', f7,
    'views_30d', views30, 'likes_30d', l30, 'saves_30d', s30, 'comments_30d', c30, 'followers_30d', f30,
    'best_piece', best
  );
end;
$$;

create index if not exists daily_metrics_day_metric_idx on public.daily_metrics (day, metric_key);
create index if not exists user_activity_days_user_day_idx on public.user_activity_days (user_id, day);
create index if not exists creation_view_events_viewed_at_idx on public.creation_view_events (viewed_at);
create index if not exists profiles_created_at_idx on public.profiles (created_at);
