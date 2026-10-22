-- Voxly Prompt 14A: badges, streaks, views, storefront featured book, creator analytics.

alter type public.mod_action add value if not exists 'featured_badge';
alter type public.mod_action add value if not exists 'remove_featured_badge';
alter type public.mod_action add value if not exists 'close_month';

-- ---------------------------------------------------------------------------
-- Badge type on notifications
-- ---------------------------------------------------------------------------

alter table public.notifications drop constraint if exists notifications_type_check;
alter table public.notifications add constraint notifications_type_check check (
  type in (
    'follow', 'like', 'comment', 'reply', 'mention', 'message', 'collab_invite',
    'community_post', 'new_chapter', 'purchase', 'challenge_start', 'announcement',
    'warning', 'moderation_notice', 'appeal_decision', 'summary', 'badge_awarded'
  )
);

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------

create table if not exists public.badges (
  key text primary key,
  name text not null,
  description text not null,
  icon_key text not null,
  kind text not null check (kind in ('automatic', 'awarded', 'purchased')),
  goal_number integer,
  badge_group text not null check (badge_group in ('core', 'performance', 'streak', 'other'))
);

create table if not exists public.user_badges (
  id bigint generated always as identity primary key,
  user_id uuid not null references public.profiles(id) on delete cascade,
  badge_key text not null references public.badges(key) on delete cascade,
  earned_at timestamptz not null default now(),
  month date
);

create unique index if not exists user_badges_user_key_no_month_idx
  on public.user_badges (user_id, badge_key) where month is null;

create unique index if not exists user_badges_user_key_month_idx
  on public.user_badges (user_id, badge_key, month) where month is not null;

create index if not exists user_badges_user_idx on public.user_badges (user_id, earned_at desc);

create table if not exists public.user_pinned_badges (
  user_id uuid not null references public.profiles(id) on delete cascade,
  badge_key text not null references public.badges(key) on delete cascade,
  position smallint not null check (position between 1 and 3),
  primary key (user_id, position),
  unique (user_id, badge_key)
);

create index if not exists user_pinned_badges_user_idx on public.user_pinned_badges (user_id, position);

create table if not exists public.user_streaks (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  writing_current integer not null default 0,
  writing_longest integer not null default 0,
  writing_last_active_day date,
  reading_current integer not null default 0,
  reading_longest integer not null default 0,
  reading_last_active_day date,
  updated_at timestamptz not null default now()
);

create table if not exists public.profile_featured_book (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  book_id uuid not null references public.creations(id) on delete cascade,
  updated_at timestamptz not null default now()
);

create table if not exists public.creation_view_events (
  id bigint generated always as identity primary key,
  creation_id uuid not null references public.creations(id) on delete cascade,
  viewer_id uuid not null references public.profiles(id) on delete cascade,
  viewed_at timestamptz not null default now()
);

create index if not exists creation_view_events_dedupe_idx
  on public.creation_view_events (creation_id, viewer_id, viewed_at desc);

create table if not exists public.closed_months (
  month date primary key,
  closed_at timestamptz not null default now(),
  closed_by uuid references public.profiles(id) on delete set null
);

alter table public.badges enable row level security;
alter table public.user_badges enable row level security;
alter table public.user_pinned_badges enable row level security;
alter table public.user_streaks enable row level security;
alter table public.profile_featured_book enable row level security;
alter table public.creation_view_events enable row level security;
alter table public.closed_months enable row level security;

-- ---------------------------------------------------------------------------
-- Seed badges (rules stored; some sources not built yet — award functions no-op)
-- ---------------------------------------------------------------------------

insert into public.badges (key, name, description, icon_key, kind, goal_number, badge_group) values
  ('spoken_word', 'Spoken Word', '5 published recitation videos', 'mic', 'automatic', 5, 'core'),
  ('poet', 'Poet', '5 published poems', 'quill', 'automatic', 5, 'core'),
  ('storyteller', 'Storyteller', '5 published written stories or essays', 'book-open', 'automatic', 5, 'core'),
  ('voice', 'Voice', '5 published voice clips', 'wave', 'automatic', 5, 'core'),
  ('author', 'Author', 'Published or listed a book', 'books', 'automatic', 1, 'core'),
  ('trending', 'Trending', '1,000 likes on one post', 'flame', 'automatic', 1000, 'performance'),
  ('rising_creator', 'Rising Creator', '100 followers', 'seedling', 'automatic', 100, 'performance'),
  ('viral_creator', 'Viral Creator', '10,000 total likes on your work', 'spark', 'automatic', 10000, 'performance'),
  ('featured', 'Featured', 'Awarded by the Voxly team', 'star', 'awarded', null, 'other'),
  ('verified', 'Verified', 'Verified supporter (display uses profile flag)', 'verified', 'purchased', null, 'other'),
  ('poem_of_month', 'Poem of the Month', 'Top poem in the closed month', 'trophy', 'automatic', null, 'performance'),
  ('video_of_month', 'Video of the Month', 'Top video in the month (video not live)', 'trophy', 'automatic', null, 'performance'),
  ('slam_entrant', 'Slam Entrant', 'Entered a Slam battle (Slam not live)', 'trophy', 'automatic', null, 'other'),
  ('slam_finalist', 'Finalist', 'Slam finalist (Slam not live)', 'trophy', 'automatic', null, 'other'),
  ('slam_champion', 'Champion', 'Slam champion (Slam not live)', 'trophy', 'automatic', null, 'other'),
  ('crowd_favourite', 'Crowd Favourite', 'Slam crowd favourite (Slam not live)', 'trophy', 'automatic', null, 'other'),
  ('rising_star_month', 'Rising Star of the Month', 'Fastest follower growth in the month', 'trophy', 'automatic', null, 'performance'),
  ('most_read', 'Most Read', 'Most-read book in the month', 'trophy', 'automatic', null, 'performance'),
  ('top_seller', 'Top Seller', 'Top seller in the month (sales not live)', 'trophy', 'automatic', null, 'performance'),
  ('streak_7', '7-day streak', '7 consecutive writing days', 'streak', 'automatic', 7, 'streak'),
  ('streak_30', '30-day streak', '30 consecutive writing days', 'streak', 'automatic', 30, 'streak'),
  ('streak_100', '100-day streak', '100 consecutive writing days', 'streak', 'automatic', 100, 'streak'),
  ('streak_365', '365-day streak', '365 consecutive writing days', 'streak', 'automatic', 365, 'streak'),
  ('community_builder', 'Community Builder', 'Community milestones (communities not live)', 'badge', 'automatic', null, 'other'),
  ('pen_pal', 'Pen Pal', 'Pen Pal badge (Pen Pals not live)', 'badge', 'automatic', null, 'other'),
  ('global_correspondent', 'Global Correspondent', 'Pen Pal correspondent (not live)', 'badge', 'automatic', null, 'other'),
  ('monthly_top_10', 'Monthly Top 10', 'Platform top ten writers (ranking not live)', 'trophy', 'automatic', null, 'performance')
on conflict (key) do update set
  name = excluded.name,
  description = excluded.description,
  icon_key = excluded.icon_key,
  kind = excluded.kind,
  goal_number = excluded.goal_number,
  badge_group = excluded.badge_group;

-- ---------------------------------------------------------------------------
-- Helpers
-- ---------------------------------------------------------------------------

create or replace function public.user_timezone(p_user uuid) returns text
language sql stable security definer set search_path = public as $$
  select coalesce(
    (select timezone from public.notification_settings where user_id = p_user),
    (select timezone from public.profiles where id = p_user),
    'UTC'
  );
$$;

create or replace function public.counts_for_public_work(p_user uuid) returns table(
  poem_count integer,
  storyteller_count integer,
  total_likes bigint,
  max_likes integer,
  follower_count integer,
  book_count integer
)
language sql stable security definer set search_path = public as $$
  select
    (select count(*)::integer from public.creations c
      where c.author_id = p_user and c.type = 'poem' and c.status = 'published'
        and c.audience = 'public' and c.is_removed = false),
    (select count(*)::integer from public.creations c
      where c.author_id = p_user
        and c.type in ('written_post','story','essay','article','letter','script')
        and c.status = 'published' and c.audience = 'public' and c.is_removed = false),
    (select coalesce(sum(c.like_count), 0) from public.creations c
      where c.author_id = p_user and c.status = 'published' and c.audience = 'public' and c.is_removed = false),
    (select coalesce(max(c.like_count), 0) from public.creations c
      where c.author_id = p_user and c.status = 'published' and c.audience = 'public' and c.is_removed = false),
    (select follower_count from public.profiles where id = p_user),
    (select count(*)::integer from public.creations c
      where c.author_id = p_user and c.type = 'book' and c.status in ('published', 'unlisted') and c.is_removed = false);
$$;

revoke all on function public.counts_for_public_work(uuid) from public, anon;
grant execute on function public.counts_for_public_work(uuid) to authenticated;

create or replace function public.award_user_badge(
  p_user uuid,
  p_badge_key text,
  p_month date default null
) returns boolean
language plpgsql security definer set search_path = public as $$
declare
  v_new bigint;
begin
  if p_user is null or p_badge_key is null then return false; end if;
  if not exists (select 1 from public.badges where key = p_badge_key) then return false; end if;

  if p_month is null then
    insert into public.user_badges (user_id, badge_key, month)
    values (p_user, p_badge_key, null)
    on conflict (user_id, badge_key) where month is null do nothing
    returning id into v_new;
  else
    insert into public.user_badges (user_id, badge_key, month)
    values (p_user, p_badge_key, p_month)
    on conflict (user_id, badge_key, month) where month is not null do nothing
    returning id into v_new;
  end if;

  if v_new is not null then
    perform public.create_notification(
      p_user, null, 'badge_awarded', 'badge', null,
      jsonb_build_object('badge_key', p_badge_key, 'month', p_month)
    );
    return true;
  end if;
  return false;
exception when unique_violation then
  return false;
end;
$$;

revoke all on function public.award_user_badge(uuid, text, date) from public, anon;

create or replace function public.evaluate_automatic_badges(p_user uuid) returns void
language plpgsql security definer set search_path = public as $$
declare
  c record;
begin
  select * into c from public.counts_for_public_work(p_user);
  if c.poem_count >= 5 then perform public.award_user_badge(p_user, 'poet', null); end if;
  if c.storyteller_count >= 5 then perform public.award_user_badge(p_user, 'storyteller', null); end if;
  if c.book_count >= 1 then perform public.award_user_badge(p_user, 'author', null); end if;
  if c.max_likes >= 1000 then perform public.award_user_badge(p_user, 'trending', null); end if;
  if c.follower_count >= 100 then perform public.award_user_badge(p_user, 'rising_creator', null); end if;
  if c.total_likes >= 10000 then perform public.award_user_badge(p_user, 'viral_creator', null); end if;
  -- spoken_word / voice: media types not counted until video/voice publishing ships
end;
$$;

revoke all on function public.evaluate_automatic_badges(uuid) from public, anon;

create or replace function public.ensure_user_streaks(p_user uuid) returns void
language plpgsql security definer set search_path = public as $$
begin
  insert into public.user_streaks (user_id) values (p_user) on conflict do nothing;
end;
$$;

create or replace function public.apply_writing_streak_day(p_user uuid, p_on date) returns void
language plpgsql security definer set search_path = public as $$
declare
  s public.user_streaks%rowtype;
  next_current integer;
begin
  perform public.ensure_user_streaks(p_user);
  select * into s from public.user_streaks where user_id = p_user for update;
  if s.writing_last_active_day = p_on then return; end if;
  if s.writing_last_active_day = p_on - 1 then
    next_current := s.writing_current + 1;
  else
    next_current := 1;
  end if;
  update public.user_streaks
  set writing_current = next_current,
      writing_longest = greatest(writing_longest, next_current),
      writing_last_active_day = p_on,
      updated_at = now()
  where user_id = p_user;
  if next_current >= 7 then perform public.award_user_badge(p_user, 'streak_7', null); end if;
  if next_current >= 30 then perform public.award_user_badge(p_user, 'streak_30', null); end if;
  if next_current >= 100 then perform public.award_user_badge(p_user, 'streak_100', null); end if;
  if next_current >= 365 then perform public.award_user_badge(p_user, 'streak_365', null); end if;
end;
$$;

revoke all on function public.apply_writing_streak_day(uuid, date) from public, anon;

create or replace function public.apply_reading_streak_day(p_user uuid, p_on date) returns void
language plpgsql security definer set search_path = public as $$
declare
  s public.user_streaks%rowtype;
  next_current integer;
begin
  perform public.ensure_user_streaks(p_user);
  select * into s from public.user_streaks where user_id = p_user for update;
  if s.reading_last_active_day = p_on then return; end if;
  if s.reading_last_active_day = p_on - 1 then
    next_current := s.reading_current + 1;
  else
    next_current := 1;
  end if;
  update public.user_streaks
  set reading_current = next_current,
      reading_longest = greatest(reading_longest, next_current),
      reading_last_active_day = p_on,
      updated_at = now()
  where user_id = p_user;
end;
$$;

revoke all on function public.apply_reading_streak_day(uuid, date) from public, anon;

create or replace function public.live_writing_streak(p_user uuid) returns integer
language plpgsql stable security definer set search_path = public as $$
declare
  s public.user_streaks%rowtype;
  today date;
begin
  select * into s from public.user_streaks where user_id = p_user;
  if not found or s.writing_last_active_day is null then return 0; end if;
  today := (now() at time zone public.user_timezone(p_user))::date;
  if s.writing_last_active_day < today - 1 then return 0; end if;
  return s.writing_current;
end;
$$;

grant execute on function public.live_writing_streak(uuid) to authenticated;

create or replace function public.record_creation_view(p_creation_id uuid) returns void
language plpgsql security definer set search_path = public as $$
declare
  v_viewer uuid := auth.uid();
  v_author uuid;
  v_audience public.audience;
  v_status public.publish_status;
begin
  if v_viewer is null then return; end if;
  select author_id, audience, status into v_author, v_audience, v_status
  from public.creations where id = p_creation_id and is_removed = false;
  if v_author is null or v_author = v_viewer then return; end if;
  if v_audience <> 'public' or v_status <> 'published' then return; end if;
  if public.is_blocked_between(v_viewer, v_author) then return; end if;
  if exists (
    select 1 from public.creation_view_events
    where creation_id = p_creation_id and viewer_id = v_viewer
      and viewed_at > now() - interval '24 hours'
  ) then return; end if;
  insert into public.creation_view_events (creation_id, viewer_id) values (p_creation_id, v_viewer);
  update public.creations set view_count = view_count + 1 where id = p_creation_id;
end;
$$;

revoke all on function public.record_creation_view(uuid) from public, anon;
grant execute on function public.record_creation_view(uuid) to authenticated;

-- Triggers: publish + reading progress
create or replace function public.badges_on_creation_publish() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  day date;
begin
  if new.status = 'published' and (tg_op = 'INSERT' or old.status is distinct from new.status) then
    day := (now() at time zone public.user_timezone(new.author_id))::date;
    perform public.apply_writing_streak_day(new.author_id, day);
    perform public.evaluate_automatic_badges(new.author_id);
  end if;
  return new;
end;
$$;

drop trigger if exists creations_badges_publish on public.creations;
create trigger creations_badges_publish
  after insert or update of status on public.creations
  for each row execute function public.badges_on_creation_publish();

create or replace function public.badges_on_writing_activity() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  day date;
begin
  if new.type = 'book' then return new; end if;
  if new.type = 'journal' or new.status = 'draft' then
    day := (now() at time zone public.user_timezone(new.author_id))::date;
    perform public.apply_writing_streak_day(new.author_id, day);
  end if;
  return new;
end;
$$;

drop trigger if exists creations_badges_writing_activity on public.creations;
create trigger creations_badges_writing_activity
  after insert or update on public.creations
  for each row execute function public.badges_on_writing_activity();

create or replace function public.badges_on_creation_likes() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.like_count is distinct from old.like_count then
    perform public.evaluate_automatic_badges(new.author_id);
  end if;
  return new;
end;
$$;

drop trigger if exists creations_badges_likes on public.creations;
create trigger creations_badges_likes
  after update of like_count on public.creations
  for each row execute function public.badges_on_creation_likes();

create or replace function public.badges_on_chapter_publish() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  v_author uuid;
  day date;
begin
  if new.status <> 'published' then return new; end if;
  if tg_op = 'UPDATE' and old.status = new.status then return new; end if;
  select author_id into v_author from public.creations where id = new.book_id;
  if v_author is null then return new; end if;
  day := (now() at time zone public.user_timezone(v_author))::date;
  perform public.apply_writing_streak_day(v_author, day);
  return new;
end;
$$;

drop trigger if exists chapters_badges_publish on public.chapters;
create trigger chapters_badges_publish
  after insert or update of status on public.chapters
  for each row execute function public.badges_on_chapter_publish();

create or replace function public.badges_on_reading_progress() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  day date;
begin
  day := (now() at time zone public.user_timezone(new.user_id))::date;
  perform public.apply_reading_streak_day(new.user_id, day);
  return new;
end;
$$;

drop trigger if exists reading_progress_badges on public.reading_progress;
create trigger reading_progress_badges
  after insert or update on public.reading_progress
  for each row execute function public.badges_on_reading_progress();

create or replace function public.badges_on_profile_followers() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  perform public.evaluate_automatic_badges(new.id);
  return new;
end;
$$;

drop trigger if exists profiles_badges_followers on public.profiles;
create trigger profiles_badges_followers
  after update of follower_count on public.profiles
  for each row when (new.follower_count is distinct from old.follower_count)
  execute function public.badges_on_profile_followers();

-- Founder featured badge
create or replace function public.award_featured_badge(p_user uuid) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not public.is_founder() then raise exception 'forbidden' using errcode = '42501'; end if;
  perform public.award_user_badge(p_user, 'featured', null);
  perform public.founder_write_audit('featured_badge', 'profile', p_user, p_user, null, 'Awarded Featured badge');
end;
$$;

create or replace function public.remove_featured_badge(p_user uuid) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not public.is_founder() then raise exception 'forbidden' using errcode = '42501'; end if;
  delete from public.user_badges where user_id = p_user and badge_key = 'featured' and month is null;
  perform public.founder_write_audit('remove_featured_badge', 'profile', p_user, p_user, null, 'Removed Featured badge');
end;
$$;

revoke all on function public.award_featured_badge(uuid) from public, anon;
revoke all on function public.remove_featured_badge(uuid) from public, anon;
grant execute on function public.award_featured_badge(uuid) to authenticated;
grant execute on function public.remove_featured_badge(uuid) to authenticated;

-- Pin RPCs
create or replace function public.pin_badge(p_badge_key text, p_position smallint) returns void
language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then raise exception 'forbidden'; end if;
  if not exists (select 1 from public.user_badges where user_id = auth.uid() and badge_key = p_badge_key) then
    raise exception 'Badge not earned';
  end if;
  if p_position not between 1 and 3 then raise exception 'Invalid pin position'; end if;
  delete from public.user_pinned_badges where user_id = auth.uid() and position = p_position;
  insert into public.user_pinned_badges (user_id, badge_key, position)
  values (auth.uid(), p_badge_key, p_position)
  on conflict (user_id, badge_key) do update set position = excluded.position;
end;
$$;

create or replace function public.unpin_badge(p_badge_key text) returns void
language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then raise exception 'forbidden'; end if;
  delete from public.user_pinned_badges where user_id = auth.uid() and badge_key = p_badge_key;
end;
$$;

grant execute on function public.pin_badge(text, smallint) to authenticated;
grant execute on function public.unpin_badge(text) to authenticated;

create or replace function public.set_featured_book(p_book_id uuid) returns void
language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then raise exception 'forbidden'; end if;
  if p_book_id is null then
    delete from public.profile_featured_book where user_id = auth.uid();
    return;
  end if;
  if not exists (
    select 1 from public.creations c
    where c.id = p_book_id and c.author_id = auth.uid() and c.type = 'book'
      and c.status in ('published', 'unlisted') and c.is_removed = false
  ) then
    raise exception 'Book not found or not publishable';
  end if;
  insert into public.profile_featured_book (user_id, book_id)
  values (auth.uid(), p_book_id)
  on conflict (user_id) do update set book_id = excluded.book_id, updated_at = now();
end;
$$;

grant execute on function public.set_featured_book(uuid) to authenticated;

-- Views
create or replace view public.user_badges_public
with (security_invoker = true)
as
select ub.user_id, ub.badge_key, b.icon_key, b.name, b.description, ub.earned_at
from public.user_badges ub
inner join public.badges b on b.key = ub.badge_key
inner join public.profiles p on p.id = ub.user_id
where ub.month is null
  and p.status = 'active'
  and not public.is_blocked_between(auth.uid(), ub.user_id);

create or replace view public.profile_feed_badges
with (security_invoker = true)
as
with pinned as (
  select user_id, badge_key, position as sort_order
  from public.user_pinned_badges
),
earned as (
  select ub.user_id, ub.badge_key,
    case ub.badge_key
      when 'featured' then 10 when 'verified' then 9 when 'viral_creator' then 8
      when 'trending' then 7 when 'rising_creator' then 6 else 1
    end as sort_order
  from public.user_badges ub
  where ub.month is null
)
select e.user_id, e.badge_key, b.icon_key, coalesce(p.sort_order, e.sort_order + 100) as sort_order
from earned e
inner join public.badges b on b.key = e.badge_key
left join pinned p on p.user_id = e.user_id and p.badge_key = e.badge_key
inner join public.profiles pr on pr.id = e.user_id
where pr.status = 'active'
  and not public.is_blocked_between(auth.uid(), e.user_id);

revoke all on public.user_badges_public from public, anon;
revoke all on public.profile_feed_badges from public, anon;
grant select on public.user_badges_public to authenticated;
grant select on public.profile_feed_badges to authenticated;

create or replace function public.list_user_badges_public(p_user uuid)
returns setof public.user_badges_public
language sql stable security definer set search_path = public as $$
  select * from public.user_badges_public where user_id = p_user;
$$;

grant execute on function public.list_user_badges_public(uuid) to authenticated;

create or replace function public.badge_progress_for_user(p_user uuid)
returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare
  c record;
  earned boolean;
  out jsonb := '[]'::jsonb;
  b record;
begin
  select * into c from public.counts_for_public_work(p_user);
  for b in select key, goal_number from public.badges where kind = 'automatic' and goal_number is not null loop
    earned := exists (select 1 from public.user_badges where user_id = p_user and badge_key = b.key and month is null);
    out := out || jsonb_build_array(jsonb_build_object(
      'key', b.key,
      'goal', b.goal_number,
      'current', case b.key
        when 'poet' then c.poem_count
        when 'storyteller' then c.storyteller_count
        when 'author' then c.book_count
        when 'trending' then c.max_likes
        when 'rising_creator' then c.follower_count
        when 'viral_creator' then c.total_likes::integer
        else 0 end,
      'earned', earned
    ));
  end loop;
  return out;
end;
$$;

grant execute on function public.badge_progress_for_user(uuid) to authenticated;

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
  select count(*) into views7 from public.creation_view_events e
    inner join public.creations c on c.id = e.creation_id
    where c.author_id = uid and e.viewed_at > now() - interval '7 days';
  select count(*) into views30 from public.creation_view_events e
    inner join public.creations c on c.id = e.creation_id
    where c.author_id = uid and e.viewed_at > now() - interval '30 days';
  select coalesce(sum(c.like_count),0), coalesce(sum(c.save_count),0), coalesce(sum(c.comment_count),0)
    into l7, s7, c7
    from public.creations c where c.author_id = uid and c.published_at > now() - interval '7 days';
  select coalesce(sum(c.like_count),0), coalesce(sum(c.save_count),0), coalesce(sum(c.comment_count),0)
    into l30, s30, c30
    from public.creations c where c.author_id = uid and c.published_at > now() - interval '30 days';
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

grant execute on function public.get_creator_analytics() to authenticated;

create or replace function public.close_month_core(p_month date, p_write_audit boolean default false) returns void
language plpgsql security definer set search_path = public as $$
declare
  m date := date_trunc('month', p_month)::date;
  winner uuid;
  v_book uuid;
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

  -- video_of_month, top_seller, slam_*, monthly_top_10, rising_star_month (follower snapshots): sources partial — skipped in code until ranking snapshots ship

  if p_write_audit then
    perform public.founder_write_audit(
      'close_month', 'month', null, null, null, 'Closed month ' || m::text
    );
  end if;
end;
$$;

revoke all on function public.close_month_core(date, boolean) from public, anon;

create or replace function public.close_month(p_month date) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not public.is_founder() then raise exception 'forbidden' using errcode = '42501'; end if;
  perform public.close_month_core(p_month, true);
end;
$$;

grant execute on function public.close_month(date) to authenticated;

create or replace function public.try_close_past_months() returns void
language plpgsql security definer set search_path = public as $$
declare
  m date;
begin
  m := (date_trunc('month', now()) - interval '1 month')::date;
  if m >= date_trunc('month', now())::date then return; end if;
  if not exists (select 1 from public.closed_months where month = m) then
    perform public.close_month_core(m, false);
  end if;
end;
$$;

grant execute on function public.try_close_past_months() to authenticated;

-- RLS
revoke all on table public.badges from public, anon;
grant select on table public.badges to authenticated;
create policy badges_select on public.badges for select to authenticated using (true);

revoke all on table public.user_badges from public, anon;
grant select on table public.user_badges to authenticated;
create policy user_badges_select on public.user_badges
  for select to authenticated
  using (exists (select 1 from public.profiles p where p.id = user_id and p.status = 'active'));

revoke all on table public.user_pinned_badges from public, anon;
grant select on table public.user_pinned_badges to authenticated;

drop policy if exists user_pinned_badges_own on public.user_pinned_badges;

create policy user_pinned_badges_select on public.user_pinned_badges
  for select to authenticated using (true);

revoke all on table public.user_streaks from public, anon;
grant select on table public.user_streaks to authenticated;

create policy user_streaks_select on public.user_streaks
  for select to authenticated using (true);

revoke all on table public.profile_featured_book from public, anon;
grant select on table public.profile_featured_book to authenticated;

create policy profile_featured_book_select on public.profile_featured_book
  for select to authenticated using (true);

revoke all on table public.creation_view_events from public, anon;
grant select on table public.creation_view_events to authenticated;

create policy creation_view_events_select on public.creation_view_events
  for select to authenticated using (viewer_id = auth.uid());

revoke all on table public.closed_months from public, anon;
grant select on table public.closed_months to authenticated;

create policy closed_months_founder on public.closed_months
  for select to authenticated using (public.is_founder());
