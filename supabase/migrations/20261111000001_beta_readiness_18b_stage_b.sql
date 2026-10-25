-- Prompt 18B Stage B: country pages (RPCs + indexes), DM active-pair uniqueness.

drop index if exists public.conversations_dm_pair_idx;
create unique index conversations_dm_active_pair_idx
  on public.conversations (dm_low, dm_high)
  where kind = 'dm' and dm_low is not null and dm_high is not null;

create index if not exists profiles_country_active_idx
  on public.profiles (country)
  where status = 'active' and country is not null;

create index if not exists creations_author_country_published_idx
  on public.creations (author_id, published_at desc)
  where status = 'published' and audience = 'public' and is_removed = false;

create or replace function public.get_country_page(p_code text)
returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare
  uid uuid := auth.uid();
  v_code char(2);
  v_row public.countries%rowtype;
  v_writers integer;
  v_posts integer;
begin
  if uid is null then raise exception 'forbidden'; end if;
  v_code := upper(btrim(coalesce(p_code, '')));
  if v_code !~ '^[A-Z]{2}$' then raise exception 'Invalid country code.'; end if;
  select * into v_row from public.countries where code = v_code;
  if not found then raise exception 'Country not found.'; end if;
  select count(*)::integer into v_writers
  from public.profiles p
  where p.country = v_code and p.status = 'active';
  select count(*)::integer into v_posts
  from public.creations c
  inner join public.profiles p on p.id = c.author_id and p.status = 'active'
  where p.country = v_code
    and c.status = 'published'
    and c.audience = 'public'
    and c.is_removed = false;
  return jsonb_build_object(
    'code', v_row.code,
    'name', v_row.name,
    'primary_timezone', v_row.primary_timezone,
    'main_languages', coalesce(to_jsonb(v_row.main_languages), '[]'::jsonb),
    'writer_count', v_writers,
    'post_count', v_posts
  );
end;
$$;

grant execute on function public.get_country_page(text) to authenticated;

create or replace function public.list_country_trending(
  p_code text,
  p_cursor timestamptz default null,
  p_limit integer default 20
)
returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare
  uid uuid := auth.uid();
  v_code char(2);
  lim integer := least(greatest(coalesce(p_limit, 20), 1), 50);
  rows jsonb;
  next_cursor timestamptz;
begin
  if uid is null then raise exception 'forbidden'; end if;
  v_code := upper(btrim(coalesce(p_code, '')));
  if v_code !~ '^[A-Z]{2}$' then raise exception 'Invalid country code.'; end if;
  if not exists (select 1 from public.countries where code = v_code) then
    raise exception 'Country not found.';
  end if;
  select coalesce(jsonb_agg(jsonb_build_object(
      'id', t.id,
      'author_id', t.author_id,
      'type', t.type,
      'title', t.title,
      'caption', t.caption,
      'body_excerpt', t.body_excerpt,
      'body_truncated', t.body_truncated,
      'cover_url', t.cover_url,
      'genre', t.genre,
      'mood', t.mood,
      'language', t.language,
      'published_at', t.published_at,
      'like_count', t.like_count,
      'comment_count', t.comment_count,
      'save_count', t.save_count,
      'created_at', t.created_at,
      'engagement_score', t.engagement_score
    ) order by t.engagement_score desc), '[]'::jsonb) into rows
  from (
    select
      fc.id,
      fc.author_id,
      fc.type,
      fc.title,
      fc.caption,
      fc.body_excerpt,
      fc.body_truncated,
      fc.cover_url,
      fc.genre,
      fc.mood,
      fc.language,
      fc.published_at,
      fc.like_count,
      fc.comment_count,
      fc.save_count,
      fc.created_at,
      public.compute_engagement_score(
        fc.like_count, fc.save_count, fc.comment_count, 0, fc.published_at
      ) as engagement_score
    from public.discover_trending_creations fc
    inner join public.profiles p on p.id = fc.author_id
    where p.country = v_code
      and p.status = 'active'
      and not public.is_blocked_between(uid, fc.author_id)
      and (p_cursor is null or fc.published_at < p_cursor)
    order by engagement_score desc, fc.published_at desc
    limit lim
  ) t;
  select min((r->>'published_at')::timestamptz) into next_cursor from jsonb_array_elements(rows) r;
  return jsonb_build_object('rows', rows, 'next_cursor', next_cursor);
end;
$$;

grant execute on function public.list_country_trending(text, timestamptz, integer) to authenticated;

create or replace function public.list_country_rising_writers(
  p_code text,
  p_limit integer default 12
)
returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare
  uid uuid := auth.uid();
  v_code char(2);
  lim integer := least(greatest(coalesce(p_limit, 12), 1), 50);
  rows jsonb;
begin
  if uid is null then raise exception 'forbidden'; end if;
  v_code := upper(btrim(coalesce(p_code, '')));
  if v_code !~ '^[A-Z]{2}$' then raise exception 'Invalid country code.'; end if;
  select coalesce(jsonb_agg(row order by (row->>'momentum_score')::numeric desc), '[]'::jsonb) into rows
  from (
    select jsonb_build_object(
      'id', rw.id,
      'username', rw.username,
      'display_name', rw.display_name,
      'avatar_url', rw.avatar_url,
      'verified', rw.verified,
      'follower_count', rw.follower_count,
      'momentum_score', rw.momentum_score
    ) as row
    from public.discover_rising_writers rw
    inner join public.profiles p on p.id = rw.id
    where p.country = v_code
      and not public.is_blocked_between(uid, rw.id)
    order by rw.momentum_score desc
    limit lim
  ) s;
  return jsonb_build_object('rows', rows);
end;
$$;

grant execute on function public.list_country_rising_writers(text, integer) to authenticated;

create or replace function public.list_countries_browse(
  p_query text default null,
  p_cursor text default null,
  p_limit integer default 40
)
returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare
  uid uuid := auth.uid();
  lim integer := least(greatest(coalesce(p_limit, 40), 1), 100);
  q text := nullif(btrim(coalesce(p_query, '')), '');
  rows jsonb;
  next_cursor text;
begin
  if uid is null then raise exception 'forbidden'; end if;
  select coalesce(jsonb_agg(row order by (row->>'name')), '[]'::jsonb) into rows
  from (
    select jsonb_build_object(
      'code', c.code,
      'name', c.name,
      'primary_timezone', c.primary_timezone
    ) as row
    from public.countries c
    where (q is null or c.name ilike '%' || q || '%' or c.code ilike q || '%')
      and (p_cursor is null or c.name > p_cursor)
    order by c.name
    limit lim
  ) s;
  select max(r->>'name') into next_cursor from jsonb_array_elements(rows) r;
  return jsonb_build_object('rows', rows, 'next_cursor', next_cursor);
end;
$$;

grant execute on function public.list_countries_browse(text, text, integer) to authenticated;

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
