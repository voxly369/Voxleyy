-- Voxly content size and rate limits (Prompt 5 amendment).
-- CHECK constraints use NOT VALID then VALIDATE so existing bad rows fail loudly at deploy time.

-- ---------------------------------------------------------------------------
-- Body and metadata size limits
-- ---------------------------------------------------------------------------

alter table public.creations
  add constraint creations_body_text_octets check (
    body_text is null or octet_length(body_text) <= 500000
  ) not valid;

alter table public.creations
  add constraint creations_body_json_octets check (
    body_json is null or octet_length(body_json::text) <= 1000000
  ) not valid;

alter table public.chapters
  add constraint chapters_body_text_octets check (
    body_text is null or octet_length(body_text) <= 500000
  ) not valid;

alter table public.chapters
  add constraint chapters_body_json_octets check (
    body_json is null or octet_length(body_json::text) <= 1000000
  ) not valid;

alter table public.creations
  add constraint creations_genre_length check (
    genre is null or char_length(genre) <= 60
  ) not valid;

alter table public.creations
  add constraint creations_mood_length check (
    mood is null or char_length(mood) <= 60
  ) not valid;

alter table public.creations
  add constraint creations_language_length check (
    char_length(language) <= 8
  ) not valid;

alter table public.creations validate constraint creations_body_text_octets;
alter table public.creations validate constraint creations_body_json_octets;
alter table public.creations validate constraint creations_genre_length;
alter table public.creations validate constraint creations_mood_length;
alter table public.creations validate constraint creations_language_length;
alter table public.chapters validate constraint chapters_body_text_octets;
alter table public.chapters validate constraint chapters_body_json_octets;

-- ---------------------------------------------------------------------------
-- At most 15 tags per creation
-- ---------------------------------------------------------------------------

create or replace function public.enforce_creation_tag_limit() returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  tag_count integer;
begin
  if auth.uid() is null then
    raise exception 'Sign in to add tags.';
  end if;

  select count(*) into tag_count
  from public.creation_tags
  where creation_id = new.creation_id;

  if tag_count >= 15 then
    raise exception 'A creation can have at most 15 tags.';
  end if;

  return new;
end;
$$;

drop trigger if exists creation_tags_limit on public.creation_tags;

create trigger creation_tags_limit
  before insert on public.creation_tags
  for each row
  execute function public.enforce_creation_tag_limit();

-- ---------------------------------------------------------------------------
-- Per-author creation rate limit (60 per rolling hour, caller is always author)
-- ---------------------------------------------------------------------------

create or replace function public.enforce_creation_rate_limit() returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  recent_count integer;
begin
  if uid is null then
    raise exception 'Sign in to create.';
  end if;

  new.author_id := uid;

  select count(*) into recent_count
  from public.creations
  where author_id = uid
    and created_at > now() - interval '1 hour';

  if recent_count >= 60 then
    raise exception 'You are creating too fast. Wait a bit and try again.';
  end if;

  return new;
end;
$$;

drop trigger if exists creations_rate_limit on public.creations;

create trigger creations_rate_limit
  before insert on public.creations
  for each row
  execute function public.enforce_creation_rate_limit();
