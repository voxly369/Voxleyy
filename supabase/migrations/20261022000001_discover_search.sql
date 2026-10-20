-- Voxly Prompt 9A: Discover, search, hashtags, ranking settings.

create extension if not exists pg_trgm;

-- ---------------------------------------------------------------------------
-- Mood constraint (nullable; eight Browse-by-Mood values)
-- ---------------------------------------------------------------------------

update public.creations set mood = null
where mood is not null
  and lower(mood) not in (
    'heartbreak', 'motivation', 'humor', 'horror', 'romance', 'reflection', 'anger', 'hope'
  );

alter table public.creations drop constraint if exists creations_mood_allowed;

alter table public.creations
  add constraint creations_mood_allowed check (
    mood is null
    or lower(mood) in (
      'heartbreak', 'motivation', 'humor', 'horror', 'romance', 'reflection', 'anger', 'hope'
    )
  );

create index if not exists creations_mood_published_idx
  on public.creations (mood, published_at desc)
  where status = 'published' and audience = 'public' and is_removed = false;

create index if not exists creations_genre_published_idx
  on public.creations (genre, published_at desc)
  where status = 'published' and audience = 'public' and is_removed = false;

create index if not exists creations_language_published_idx
  on public.creations (language, published_at desc)
  where status = 'published' and audience = 'public' and is_removed = false;

create index if not exists creations_country_published_idx
  on public.creations (country, published_at desc)
  where status = 'published' and audience = 'public' and is_removed = false;

-- ---------------------------------------------------------------------------
-- Ranking weights (Founder writes; everyone signed-in reads)
-- ---------------------------------------------------------------------------

create table public.ranking_settings (
  id smallint primary key check (id = 1),
  like_weight numeric not null default 3,
  save_weight numeric not null default 5,
  comment_weight numeric not null default 4,
  view_weight numeric not null default 1,
  watch_time_weight numeric not null default 0,
  replay_weight numeric not null default 0,
  recency_weight numeric not null default 10,
  recency_half_life_hours numeric not null default 72,
  trending_window_days integer not null default 14 check (trending_window_days between 1 and 90),
  updated_at timestamptz not null default now()
);

insert into public.ranking_settings (id) values (1)
on conflict (id) do nothing;

alter table public.ranking_settings enable row level security;

revoke all on table public.ranking_settings from public, anon, authenticated;

create policy ranking_settings_select on public.ranking_settings
  for select to authenticated
  using (true);

create policy ranking_settings_update on public.ranking_settings
  for update to authenticated
  using (public.is_founder())
  with check (public.is_founder());

grant select on table public.ranking_settings to authenticated;

create or replace function public.compute_engagement_score(
  p_like_count integer,
  p_save_count integer,
  p_comment_count integer,
  p_view_count integer,
  p_published_at timestamptz
) returns numeric
language sql
stable
set search_path = public
as $$
  select
    rs.like_weight * ln(greatest(p_like_count, 0) + 1)
    + rs.save_weight * ln(greatest(p_save_count, 0) + 1)
    + rs.comment_weight * ln(greatest(p_comment_count, 0) + 1)
    + rs.view_weight * ln(greatest(p_view_count, 0) + 1)
    + rs.recency_weight * exp(
      - greatest(extract(epoch from (now() - coalesce(p_published_at, now()))) / 3600.0, 0)
      / greatest(rs.recency_half_life_hours, 1)
    )
  from public.ranking_settings rs
  where rs.id = 1;
$$;

revoke all on function public.compute_engagement_score(integer, integer, integer, integer, timestamptz) from public, anon;
grant execute on function public.compute_engagement_score(integer, integer, integer, integer, timestamptz) to authenticated;

-- ---------------------------------------------------------------------------
-- Discover views (security invoker, public published only — same rules as feed)
-- ---------------------------------------------------------------------------

create or replace view public.discover_trending_creations
with (security_invoker = true)
as
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
  c.country,
  fc.published_at,
  fc.like_count,
  fc.comment_count,
  fc.save_count,
  fc.created_at,
  public.compute_engagement_score(fc.like_count, fc.save_count, fc.comment_count, 0, fc.published_at) as engagement_score
from public.feed_creations fc
inner join public.creations c on c.id = fc.id
cross join public.ranking_settings rs
where rs.id = 1
  and fc.published_at >= now() - (rs.trending_window_days || ' days')::interval;

create or replace view public.discover_new_creations
with (security_invoker = true)
as
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
  c.country,
  fc.published_at,
  fc.like_count,
  fc.comment_count,
  fc.save_count,
  fc.created_at
from public.feed_creations fc
inner join public.creations c on c.id = fc.id;

create or replace view public.discover_top_week_creations
with (security_invoker = true)
as
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
  c.country,
  fc.published_at,
  fc.like_count,
  fc.comment_count,
  fc.save_count,
  fc.created_at
from public.feed_creations fc
inner join public.creations c on c.id = fc.id
where fc.published_at >= now() - interval '7 days'
  and fc.type in ('poem', 'story');

revoke all on table public.discover_trending_creations from public, anon;
grant select on table public.discover_trending_creations to authenticated;

revoke all on table public.discover_new_creations from public, anon;
grant select on table public.discover_new_creations to authenticated;

revoke all on table public.discover_top_week_creations from public, anon;
grant select on table public.discover_top_week_creations to authenticated;

create index if not exists discover_trending_score_idx on public.creations (published_at desc)
  where status = 'published' and audience = 'public' and is_removed = false;

-- ---------------------------------------------------------------------------
-- Rising voices (writers under 1k followers, 7-day momentum)
-- ---------------------------------------------------------------------------

create or replace view public.discover_rising_writers
with (security_invoker = true)
as
select
  p.id,
  p.username,
  p.display_name,
  p.avatar_url,
  p.verified,
  p.follower_count,
  coalesce(f.new_followers, 0) as new_followers_7d,
  coalesce(e.recent_engagement, 0) as recent_engagement_7d,
  (coalesce(f.new_followers, 0) * 2 + coalesce(e.recent_engagement, 0)) as momentum_score
from public.profiles_public p
left join lateral (
  select count(*)::integer as new_followers
  from public.follows fo
  where fo.followee_id = p.id
    and fo.created_at >= now() - interval '7 days'
) f on true
left join lateral (
  select sum(
    public.compute_engagement_score(c.like_count, c.save_count, c.comment_count, c.view_count, c.published_at)
  )::numeric as recent_engagement
  from public.creations c
  where c.author_id = p.id
    and c.status = 'published'
    and c.audience = 'public'
    and c.is_removed = false
    and c.published_at >= now() - interval '7 days'
) e on true
where p.status = 'active'
  and p.follower_count < 1000
  and (coalesce(f.new_followers, 0) > 0 or coalesce(e.recent_engagement, 0) > 0);

revoke all on table public.discover_rising_writers from public, anon;
grant select on table public.discover_rising_writers to authenticated;

-- ---------------------------------------------------------------------------
-- Founder featured writers
-- ---------------------------------------------------------------------------

create table public.founder_featured_writers (
  writer_id uuid primary key references public.profiles(id) on delete cascade,
  sort_order integer not null default 0,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create index founder_featured_writers_active_sort_idx
  on public.founder_featured_writers (active, sort_order, created_at desc);

alter table public.founder_featured_writers enable row level security;

revoke all on table public.founder_featured_writers from public, anon, authenticated;

create or replace view public.founder_featured_writers_public
with (security_invoker = true)
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

create or replace function public.founder_set_featured_writer(
  p_writer_id uuid,
  p_active boolean,
  p_sort_order integer default 0
) returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_founder() then
    raise exception 'Only the Founder can curate featured writers.';
  end if;
  if p_active then
    insert into public.founder_featured_writers (writer_id, sort_order, active)
    values (p_writer_id, coalesce(p_sort_order, 0), true)
    on conflict (writer_id) do update
      set active = true, sort_order = excluded.sort_order;
  else
    update public.founder_featured_writers set active = false where writer_id = p_writer_id;
  end if;
end;
$$;

revoke all on function public.founder_set_featured_writer(uuid, boolean, integer) from public, anon, authenticated;
grant execute on function public.founder_set_featured_writer(uuid, boolean, integer) to authenticated;

-- ---------------------------------------------------------------------------
-- Writing prompts (Word of the Day)
-- ---------------------------------------------------------------------------

create table public.writing_prompts (
  id serial primary key,
  prompt text not null check (char_length(prompt) between 8 and 400),
  active boolean not null default true
);

alter table public.writing_prompts enable row level security;

revoke all on table public.writing_prompts from public, anon, authenticated;

create policy writing_prompts_select on public.writing_prompts
  for select to authenticated
  using (active);

grant select on table public.writing_prompts to authenticated;

insert into public.writing_prompts (prompt) values
  ('Write about a door you never opened.'),
  ('Describe a sound that changed your mood.'),
  ('Begin with the line: I kept the letter because…'),
  ('Write a poem using the word "ember" twice.'),
  ('Tell a story set entirely at midnight.'),
  ('What would you say to your younger self in six lines?'),
  ('Write about rain without using the word rain.'),
  ('Describe a meal that felt like home.'),
  ('A stranger hands you a key. What happens next?'),
  ('Write from the perspective of a photograph.'),
  ('Capture a moment of quiet courage.'),
  ('Use these three words: bridge, salt, echo.'),
  ('Write about losing something small but important.'),
  ('Describe color to someone who has never seen it.'),
  ('A letter never sent—what does it say?'),
  ('Write about the last page of a notebook.'),
  ('Begin: The city forgot my name when…'),
  ('Write a piece that ends with laughter.'),
  ('Describe hands that tell a story.'),
  ('What grows in the cracks of old pavement?'),
  ('Write about a promise kept in secret.'),
  ('Use the mood of your morning as the title seed.'),
  ('Tell a story in exactly ten sentences.'),
  ('Write about a song stuck in your head.'),
  ('Describe the view from a window you miss.'),
  ('A road sign you wish existed—what does it say?'),
  ('Write about heat: summer, anger, or love.'),
  ('Capture grief without naming it directly.'),
  ('Write a dialogue between two shadows.'),
  ('What does hope smell like today?'),
  ('Describe a ritual you invented for yourself.'),
  ('Write about crossing a border—real or imagined.'),
  ('Begin with: I found the words when…'),
  ('Write about silence in a crowded room.'),
  ('Tell the story of a scar.'),
  ('Use repetition: let one phrase return three times.'),
  ('Write about water: river, tears, or rain.'),
  ('Describe a gift that cost nothing.'),
  ('What would your heartbeat say if it could speak?'),
  ('Write about a name you almost chose.'),
  ('Capture jealousy without judging it.'),
  ('Write a list poem of small mercies.'),
  ('Describe light at the wrong hour.'),
  ('A clock stops. What do you do?'),
  ('Write about forgiveness as a practice.'),
  ('Tell a story where the ending is a question.'),
  ('Write about footsteps in fresh snow.'),
  ('Describe a voice you cannot forget.'),
  ('Use contrast: soft and sharp in the same piece.'),
  ('Write about a book that saved you.'),
  ('Capture ambition without mentioning work.'),
  ('Write about the space between two people.'),
  ('Describe a garden in winter.'),
  ('What secret does the moon know?'),
  ('Write about returning to a place changed.'),
  ('Begin: I learned my language when…'),
  ('Write about fear that became a friend.'),
  ('Describe joy in mundane details.'),
  ('A mirror shows something unexpected.'),
  ('Write about the weight of a single word.'),
  ('Capture nostalgia without looking back.'),
  ('Write about building something fragile.'),
  ('Describe thunder from far away.'),
  ('What do you owe the person you were yesterday?');

create or replace function public.writing_prompt_for_date(p_on date default (timezone('utc', now()))::date)
returns text
language sql
stable
security definer
set search_path = public
as $$
  with active_prompts as (
    select prompt, row_number() over (order by id) - 1 as idx, count(*) over () as total
    from public.writing_prompts
    where active
  )
  select prompt
  from active_prompts
  where idx = (extract(epoch from p_on::timestamp)::bigint / 86400) % greatest(total, 1)
  limit 1;
$$;

revoke all on function public.writing_prompt_for_date(date) from public, anon;
grant execute on function public.writing_prompt_for_date(date) to authenticated;

-- ---------------------------------------------------------------------------
-- Search rate limit + discovery search RPC
-- ---------------------------------------------------------------------------

create table public.search_events (
  id bigint generated always as identity primary key,
  user_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now()
);

create index search_events_user_created_idx on public.search_events (user_id, created_at desc);

alter table public.search_events enable row level security;

revoke all on table public.search_events from public, anon, authenticated;

create or replace function public.record_search_event(
  p_user_id uuid,
  p_window interval default interval '1 minute',
  p_max integer default 60
) returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  recent integer;
begin
  delete from public.search_events where created_at < now() - interval '1 hour';
  select count(*) into recent
  from public.search_events
  where user_id = p_user_id and created_at > now() - p_window;
  if recent >= p_max then
    raise exception 'You are searching too fast. Wait a moment and try again.';
  end if;
  insert into public.search_events (user_id) values (p_user_id);
end;
$$;

revoke all on function public.record_search_event(uuid, interval, integer) from public, anon, authenticated;

create index if not exists profiles_username_trgm_idx
  on public.profiles using gin (username gin_trgm_ops);

create index if not exists profiles_display_name_trgm_idx
  on public.profiles using gin (display_name gin_trgm_ops);

create index if not exists creation_tags_tag_trgm_idx
  on public.creation_tags using gin (tag gin_trgm_ops);

create or replace function public.sanitize_search_query(p_raw text)
returns text
language plpgsql
immutable
as $$
declare
  v text := btrim(coalesce(p_raw, ''));
begin
  v := left(v, 80);
  v := regexp_replace(v, '[\\%_''&|!():*<>]', ' ', 'g');
  v := regexp_replace(v, '\s+', ' ', 'g');
  return btrim(v);
end;
$$;

revoke all on function public.sanitize_search_query(text) from public, anon;
grant execute on function public.sanitize_search_query(text) to authenticated;

create or replace function public.search_discovery(
  p_query text,
  p_tab text default 'top',
  p_limit integer default 20
) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user uuid := auth.uid();
  v_q text;
  v_tsquery tsquery;
  v_writers jsonb := '[]'::jsonb;
  v_posts jsonb := '[]'::jsonb;
  v_tags jsonb := '[]'::jsonb;
begin
  if v_user is null then
    raise exception 'Sign in to search.';
  end if;

  perform public.record_search_event(v_user);

  v_q := public.sanitize_search_query(p_query);
  if char_length(v_q) < 2 then
    return jsonb_build_object('writers', v_writers, 'posts', v_posts, 'tags', v_tags);
  end if;

  v_tsquery := plainto_tsquery('simple', v_q);

  if p_tab in ('top', 'writers') then
    select coalesce(jsonb_agg(row_to_json(w)), '[]'::jsonb) into v_writers
    from (
      select p.id, p.username, p.display_name, p.avatar_url, p.verified, p.follower_count
      from public.profiles_public p
      where p.status = 'active'
        and (
          p.username ilike v_q || '%'
          or p.display_name ilike '%' || v_q || '%'
          or similarity(p.username, v_q) > 0.25
          or similarity(p.display_name, v_q) > 0.25
        )
      order by greatest(similarity(p.username, v_q), similarity(p.display_name, v_q)) desc
      limit least(p_limit, 30)
    ) w;
  end if;

  if p_tab in ('top', 'posts') then
    select coalesce(jsonb_agg(row_to_json(x)), '[]'::jsonb) into v_posts
    from (
      select
        fc.id,
        fc.type,
        fc.title,
        fc.caption,
        fc.body_excerpt,
        fc.body_truncated,
        fc.published_at,
        fc.like_count,
        fc.author_id,
        pp.username as author_username,
        pp.display_name as author_display_name,
        pp.avatar_url as author_avatar_url,
        pp.verified as author_verified
      from public.feed_creations fc
      inner join public.profiles_public pp on pp.id = fc.author_id
      inner join public.creations c on c.id = fc.id
      where c.search_tsv @@ v_tsquery
         or fc.title ilike '%' || v_q || '%'
         or fc.caption ilike '%' || v_q || '%'
      order by fc.published_at desc
      limit least(p_limit, 30)
    ) x;
  end if;

  if p_tab in ('top', 'tags') then
    select coalesce(jsonb_agg(row_to_json(t)), '[]'::jsonb) into v_tags
    from (
      select ct.tag, count(*)::integer as post_count
      from public.creation_tags ct
      inner join public.creations c on c.id = ct.creation_id
      inner join public.profiles p on p.id = c.author_id
      where c.status = 'published'
        and c.audience = 'public'
        and c.is_removed = false
        and p.status = 'active'
        and not public.is_blocked_between(v_user, c.author_id)
        and (
          ct.tag::text ilike v_q || '%'
          or similarity(ct.tag::text, v_q) > 0.25
        )
      group by ct.tag
      order by post_count desc, ct.tag
      limit least(p_limit, 30)
    ) t;
  end if;

  return jsonb_build_object('writers', v_writers, 'posts', v_posts, 'tags', v_tags);
end;
$$;

revoke all on function public.search_discovery(text, text, integer) from public, anon;
grant execute on function public.search_discovery(text, text, integer) to authenticated;

-- Tag page helper: public post count per tag (block-aware via feed join)
create or replace function public.tag_public_post_count(p_tag citext)
returns integer
language sql
stable
security invoker
set search_path = public
as $$
  select count(*)::integer
  from public.creation_tags ct
  inner join public.feed_creations fc on fc.id = ct.creation_id
  where ct.tag = p_tag;
$$;

revoke all on function public.tag_public_post_count(citext) from public, anon;
grant execute on function public.tag_public_post_count(citext) to authenticated;
