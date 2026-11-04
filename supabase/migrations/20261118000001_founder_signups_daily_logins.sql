-- Founder platform health: signup emails + daily login log (Africa/Johannesburg calendar day).

create table public.user_daily_login_log (
  user_id uuid not null references auth.users (id) on delete cascade,
  login_date date not null,
  signed_in_at timestamptz not null default now(),
  primary key (user_id, login_date)
);

create index user_daily_login_log_login_date_idx on public.user_daily_login_log (login_date desc, signed_in_at desc);

alter table public.user_daily_login_log enable row level security;

revoke all on table public.user_daily_login_log from public, anon;
grant select on table public.user_daily_login_log to authenticated;

create policy user_daily_login_log_founder_select
  on public.user_daily_login_log
  for select
  to authenticated
  using (public.is_founder());

create or replace function public.record_daily_login()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_day date := (timezone('Africa/Johannesburg', now()))::date;
begin
  if v_uid is null then
    return;
  end if;
  insert into public.user_daily_login_log as l (user_id, login_date, signed_in_at)
  values (v_uid, v_day, now())
  on conflict (user_id, login_date) do update
    set signed_in_at = excluded.signed_in_at;
end;
$$;

revoke all on function public.record_daily_login() from public, anon;
grant execute on function public.record_daily_login() to authenticated;

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
  v_today_jhb date := (timezone('Africa/Johannesburg', now()))::date;
  v_today_logins jsonb;
  v_today_logins_count bigint;
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
      'email', u.email,
      'role', p.role,
      'country', p.country,
      'created_at', p.created_at
    ) as row
    from public.profiles p
    inner join auth.users u on u.id = p.id
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

  select count(*) into v_today_logins_count
  from public.user_daily_login_log l
  where l.login_date = v_today_jhb;

  select coalesce(jsonb_agg(row), '[]'::jsonb) into v_today_logins from (
    select jsonb_build_object(
      'user_id', l.user_id,
      'username', p.username,
      'signed_in_at', l.signed_in_at
    ) as row
    from public.user_daily_login_log l
    inner join public.profiles p on p.id = l.user_id
    where l.login_date = v_today_jhb
    order by l.signed_in_at desc
    limit 100
  ) q;

  return jsonb_build_object(
    'books', v_books,
    'chapters', v_chapters,
    'writers', v_writers,
    'readers', v_readers,
    'writer_reader_ratio', case when v_readers > 0 then round(v_writers::numeric / v_readers, 4) else null end,
    'recent_signups', v_recent_signups,
    'recent_posts', v_recent_posts,
    'client_errors_in_range', v_errors,
    'reports_by_status', v_reports,
    'today_logins_count', v_today_logins_count,
    'today_logins', v_today_logins
  );
end;
$$;

revoke all on function public.founder_analytics_platform_health(date, date) from public, anon;
grant execute on function public.founder_analytics_platform_health(date, date) to authenticated;
