-- Voxly Prompt 6B: feed excerpts, following_feed, mentions, event-based rate limits.

-- ---------------------------------------------------------------------------
-- Shared feed column shape (no full body_text).
-- ---------------------------------------------------------------------------

drop view if exists public.following_feed;
drop view if exists public.feed_creations;

create or replace view public.feed_creations
with (security_invoker = true)
as
select
  c.id,
  c.author_id,
  c.type,
  c.title,
  c.caption,
  left(c.body_text, 1200) as body_excerpt,
  (c.body_text is not null and char_length(c.body_text) > 1200) as body_truncated,
  c.cover_url,
  c.media_url,
  c.genre,
  c.mood,
  c.language,
  c.audience,
  c.published_at,
  c.like_count,
  c.comment_count,
  c.save_count,
  c.created_at
from public.creations c
inner join public.profiles p on p.id = c.author_id
where
  c.status = 'published'
  and c.is_removed = false
  and c.audience = 'public'
  and c.published_at is not null
  and p.status = 'active'
  and not public.is_blocked_between(auth.uid(), c.author_id);

create or replace view public.following_feed
with (security_invoker = true)
as
select
  c.id,
  c.author_id,
  c.type,
  c.title,
  c.caption,
  left(c.body_text, 1200) as body_excerpt,
  (c.body_text is not null and char_length(c.body_text) > 1200) as body_truncated,
  c.cover_url,
  c.media_url,
  c.genre,
  c.mood,
  c.language,
  c.audience,
  c.published_at,
  c.like_count,
  c.comment_count,
  c.save_count,
  c.created_at
from public.creations c
inner join public.profiles p on p.id = c.author_id
inner join public.follows f on f.followee_id = c.author_id and f.follower_id = auth.uid()
where
  c.status = 'published'
  and c.is_removed = false
  and c.audience = 'public'
  and c.published_at is not null
  and p.status = 'active'
  and not public.is_blocked_between(auth.uid(), c.author_id);

revoke all on table public.feed_creations from public, anon;
grant select on table public.feed_creations to authenticated;

revoke all on table public.following_feed from public, anon;
grant select on table public.following_feed to authenticated;

-- ---------------------------------------------------------------------------
-- Mentions (notification rows arrive in a later prompt).
-- ---------------------------------------------------------------------------

create table public.mentions (
  comment_id uuid not null references public.comments(id) on delete cascade,
  creation_id uuid not null references public.creations(id) on delete cascade,
  author_id uuid not null references public.profiles(id) on delete cascade,
  mentioned_user_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (comment_id, mentioned_user_id)
);

create index mentions_mentioned_user_idx on public.mentions (mentioned_user_id, created_at desc);

alter table public.mentions enable row level security;

revoke all on table public.mentions from public, anon;
grant select on table public.mentions to authenticated;

create policy mentions_select on public.mentions
  for select to authenticated
  using (
    (
      mentioned_user_id = auth.uid()
      or author_id = auth.uid()
    )
    and not public.is_blocked_between(auth.uid(), mentioned_user_id)
    and not public.is_blocked_between(auth.uid(), author_id)
  );

create or replace function public.sync_comment_mentions() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  uname text;
  uid uuid;
  ustatus public.account_status;
  mention_count integer := 0;
  body_lc text;
begin
  if tg_op = 'DELETE' then
    delete from public.mentions where comment_id = old.id;
    return old;
  end if;

  if new.is_removed then
    delete from public.mentions where comment_id = new.id;
    return new;
  end if;

  delete from public.mentions where comment_id = new.id;

  body_lc := lower(new.body);

  for uname in
    select distinct (m)[1]
    from regexp_matches(body_lc, '(?:^|[^a-z0-9_@])@([a-z0-9_]{3,30})(?![a-z0-9_])', 'g') as m
  loop
    exit when mention_count >= 10;

    select p.id, p.status into uid, ustatus
    from public.profiles p
    where lower(p.username::text) = uname;

    if uid is null then
      continue;
    end if;
    if uid = new.author_id then
      continue;
    end if;
    if ustatus <> 'active' then
      continue;
    end if;
    if public.is_blocked_between(new.author_id, uid) then
      continue;
    end if;

    insert into public.mentions (comment_id, creation_id, author_id, mentioned_user_id)
    values (new.id, new.creation_id, new.author_id, uid)
    on conflict do nothing;

    mention_count := mention_count + 1;
  end loop;

  return new;
end;
$$;

revoke all on function public.sync_comment_mentions() from public, anon, authenticated;

drop trigger if exists comments_sync_mentions on public.comments;

create trigger comments_sync_mentions
  after insert or update of body, is_removed on public.comments
  for each row execute function public.sync_comment_mentions();

-- ---------------------------------------------------------------------------
-- Engagement events (insert-only audit for rate limits).
-- ---------------------------------------------------------------------------

create table public.engagement_events (
  id bigint generated always as identity primary key,
  user_id uuid not null references public.profiles(id) on delete cascade,
  kind text not null check (kind in ('like', 'save', 'comment')),
  created_at timestamptz not null default now()
);

create index engagement_events_user_kind_created_idx
  on public.engagement_events (user_id, kind, created_at desc);

alter table public.engagement_events enable row level security;

revoke all on table public.engagement_events from public, anon, authenticated;

create or replace function public.record_engagement_event(
  p_user_id uuid,
  p_kind text,
  p_window interval,
  p_max integer,
  p_message text
) returns void
language plpgsql security definer set search_path = public as $$
declare
  recent integer;
begin
  delete from public.engagement_events
  where user_id = p_user_id and created_at < now() - interval '1 day';

  select count(*) into recent
  from public.engagement_events
  where user_id = p_user_id
    and kind = p_kind
    and created_at > now() - p_window;

  if recent >= p_max then
    raise exception '%', p_message;
  end if;

  insert into public.engagement_events (user_id, kind) values (p_user_id, p_kind);
end;
$$;

revoke all on function public.record_engagement_event(uuid, text, interval, integer, text) from public, anon, authenticated;

drop trigger if exists likes_rate_limit on public.likes;
drop trigger if exists saves_rate_limit on public.saves;
drop trigger if exists comments_rate_limit on public.comments;

drop function if exists public.enforce_like_rate_limit();
drop function if exists public.enforce_save_rate_limit();
drop function if exists public.enforce_comment_rate_limit();

create or replace function public.enforce_like_rate_limit() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  perform public.record_engagement_event(
    new.user_id,
    'like',
    interval '1 hour',
    300,
    'You are liking too fast. Wait a bit and try again.'
  );
  return new;
end;
$$;

create trigger likes_rate_limit
  before insert on public.likes
  for each row execute function public.enforce_like_rate_limit();

create or replace function public.enforce_save_rate_limit() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  perform public.record_engagement_event(
    new.user_id,
    'save',
    interval '1 hour',
    300,
    'You are saving too fast. Wait a bit and try again.'
  );
  return new;
end;
$$;

create trigger saves_rate_limit
  before insert on public.saves
  for each row execute function public.enforce_save_rate_limit();

create or replace function public.enforce_comment_rate_limit() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  perform public.record_engagement_event(
    new.author_id,
    'comment',
    interval '10 minutes',
    30,
    'You are commenting too fast. Wait a bit and try again.'
  );
  return new;
end;
$$;

create trigger comments_rate_limit
  before insert on public.comments
  for each row execute function public.enforce_comment_rate_limit();

-- ---------------------------------------------------------------------------
-- Comment visibility: hide non-active authors except self and Founder.
-- ---------------------------------------------------------------------------

drop policy if exists comments_select on public.comments;

create policy comments_select on public.comments
  for select to authenticated
  using (
    public.can_view_creation(creation_id)
    and not public.is_blocked_between(auth.uid(), author_id)
    and (is_removed = false or author_id = auth.uid() or public.is_founder())
    and (
      author_id = auth.uid()
      or public.is_founder()
      or exists (
        select 1 from public.profiles p
        where p.id = comments.author_id and p.status = 'active'
      )
    )
  );
