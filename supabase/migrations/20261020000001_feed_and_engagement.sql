-- Voxly Prompt 6: feed visibility, engagement rate limits, comment policy hardening.

-- ---------------------------------------------------------------------------
-- Feed view: published public work from active authors, respecting blocks.
-- ---------------------------------------------------------------------------

create or replace view public.feed_creations
with (security_invoker = true)
as
select
  c.id,
  c.author_id,
  c.type,
  c.title,
  c.caption,
  c.body_text,
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

revoke all on table public.feed_creations from public, anon;
grant select on table public.feed_creations to authenticated;

-- ---------------------------------------------------------------------------
-- creations_select: hide suspended authors from everyone except author & Founder.
-- ---------------------------------------------------------------------------

drop policy if exists creations_select on public.creations;

create policy creations_select on public.creations
  for select to authenticated
  using (
    author_id = auth.uid()
    or (
      status = 'published'
      and is_removed = false
      and audience in ('public', 'unlisted')
      and not public.is_blocked_between(auth.uid(), author_id)
      and exists (
        select 1 from public.profiles p
        where p.id = author_id and p.status = 'active'
      )
    )
    or (
      public.is_founder()
      and status in ('published', 'removed')
      and (
        audience <> 'private'
        or exists (
          select 1 from public.reports r
          where r.target_type = 'creation'
            and r.target_id = creations.id
            and r.status = 'open'
        )
      )
    )
  );

-- ---------------------------------------------------------------------------
-- Comment body: reject whitespace-only bodies.
-- ---------------------------------------------------------------------------

create or replace function public.enforce_comment_body() returns trigger
language plpgsql set search_path = public as $$
begin
  if btrim(new.body) = '' then
    raise exception 'Comment cannot be empty.';
  end if;
  return new;
end $$;

drop trigger if exists comments_enforce_body on public.comments;

create trigger comments_enforce_body
  before insert or update of body on public.comments
  for each row execute function public.enforce_comment_body();

-- ---------------------------------------------------------------------------
-- Comment rate limit: 30 comments per 10 minutes per author.
-- ---------------------------------------------------------------------------

create or replace function public.enforce_comment_rate_limit() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  recent integer;
begin
  select count(*) into recent
  from public.comments
  where author_id = new.author_id
    and created_at > now() - interval '10 minutes';

  if recent >= 30 then
    raise exception 'You are commenting too fast. Wait a bit and try again.';
  end if;
  return new;
end $$;

drop trigger if exists comments_rate_limit on public.comments;

create trigger comments_rate_limit
  before insert on public.comments
  for each row execute function public.enforce_comment_rate_limit();

-- ---------------------------------------------------------------------------
-- Like and save rate limits: 300 per hour per user.
-- ---------------------------------------------------------------------------

create or replace function public.enforce_like_rate_limit() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  recent integer;
begin
  select count(*) into recent
  from public.likes
  where user_id = new.user_id
    and created_at > now() - interval '1 hour';

  if recent >= 300 then
    raise exception 'You are liking too fast. Wait a bit and try again.';
  end if;
  return new;
end $$;

drop trigger if exists likes_rate_limit on public.likes;

create trigger likes_rate_limit
  before insert on public.likes
  for each row execute function public.enforce_like_rate_limit();

create or replace function public.enforce_save_rate_limit() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  recent integer;
begin
  select count(*) into recent
  from public.saves
  where user_id = new.user_id
    and created_at > now() - interval '1 hour';

  if recent >= 300 then
    raise exception 'You are saving too fast. Wait a bit and try again.';
  end if;
  return new;
end $$;

drop trigger if exists saves_rate_limit on public.saves;

create trigger saves_rate_limit
  before insert on public.saves
  for each row execute function public.enforce_save_rate_limit();

-- ---------------------------------------------------------------------------
-- comments_update / comments_delete require can_view_creation.
-- ---------------------------------------------------------------------------

drop policy if exists comments_update on public.comments;

create policy comments_update on public.comments
  for update to authenticated
  using (
    author_id = auth.uid()
    and public.is_active_user()
    and public.can_view_creation(creation_id)
  )
  with check (
    author_id = auth.uid()
    and public.is_active_user()
    and public.can_view_creation(creation_id)
  );

drop policy if exists comments_delete on public.comments;

create policy comments_delete on public.comments
  for delete to authenticated
  using (
    author_id = auth.uid()
    and public.is_active_user()
    and public.can_view_creation(creation_id)
    and not exists (
      select 1 from public.reports r
      where r.status = 'open'
        and (
          (r.target_type = 'comment' and r.target_id = comments.id)
          or (r.target_type = 'creation' and r.target_id = comments.creation_id)
        )
    )
  );
