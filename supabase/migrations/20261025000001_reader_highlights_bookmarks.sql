-- Prompt 10C: reader highlights, bookmarks, library_highlights view.

create table public.reader_highlights (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  creation_id uuid not null references public.creations(id) on delete cascade,
  start_paragraph integer not null check (start_paragraph >= 0),
  start_char integer not null check (start_char >= 0),
  end_paragraph integer not null check (end_paragraph >= 0),
  end_char integer not null check (end_char >= 0),
  quote text not null check (char_length(quote) between 1 and 1000),
  colour text not null check (colour in ('yellow', 'green', 'blue', 'pink', 'orange')),
  note text check (note is null or char_length(note) <= 2000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint reader_highlights_range_order check (
    (start_paragraph < end_paragraph)
    or (start_paragraph = end_paragraph and start_char <= end_char)
  )
);

create index reader_highlights_user_creation_idx
  on public.reader_highlights (user_id, creation_id);

create index reader_highlights_user_created_idx
  on public.reader_highlights (user_id, created_at desc);

alter table public.reader_highlights enable row level security;

create table public.reader_bookmarks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  creation_id uuid not null references public.creations(id) on delete cascade,
  paragraph integer not null check (paragraph >= 0),
  paragraph_offset real not null default 0 check (paragraph_offset >= 0 and paragraph_offset <= 1),
  label text check (label is null or char_length(trim(label)) between 1 and 100),
  created_at timestamptz not null default now()
);

create index reader_bookmarks_user_creation_idx
  on public.reader_bookmarks (user_id, creation_id);

create index reader_bookmarks_user_created_idx
  on public.reader_bookmarks (user_id, created_at desc);

alter table public.reader_bookmarks enable row level security;

-- ---------------------------------------------------------------------------
-- Limits and visibility on insert
-- ---------------------------------------------------------------------------

create or replace function public.enforce_reader_highlights_limit() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  n_user integer;
  n_post integer;
begin
  if tg_op = 'INSERT' then
    select count(*) into n_user from public.reader_highlights where user_id = new.user_id;
    if n_user >= 5000 then
      raise exception 'Highlight limit reached (5000 per user).';
    end if;
    select count(*) into n_post
    from public.reader_highlights
    where user_id = new.user_id and creation_id = new.creation_id;
    if n_post >= 500 then
      raise exception 'Highlight limit reached (500 per post).';
    end if;
    if not public.creation_visible_in_feed(new.creation_id) then
      raise exception 'This work is not available to highlight.';
    end if;
  end if;
  new.updated_at := now();
  return new;
end;
$$;

create trigger reader_highlights_limit
  before insert or update on public.reader_highlights
  for each row execute function public.enforce_reader_highlights_limit();

create or replace function public.enforce_reader_bookmarks_limit() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  n_user integer;
  n_post integer;
begin
  if tg_op = 'INSERT' then
    select count(*) into n_user from public.reader_bookmarks where user_id = new.user_id;
    if n_user >= 1000 then
      raise exception 'Bookmark limit reached (1000 per user).';
    end if;
    select count(*) into n_post
    from public.reader_bookmarks
    where user_id = new.user_id and creation_id = new.creation_id;
    if n_post >= 50 then
      raise exception 'Bookmark limit reached (50 per post).';
    end if;
    if not public.creation_visible_in_feed(new.creation_id) then
      raise exception 'This work is not available to bookmark.';
    end if;
  end if;
  return new;
end;
$$;

create trigger reader_bookmarks_limit
  before insert on public.reader_bookmarks
  for each row execute function public.enforce_reader_bookmarks_limit();

-- ---------------------------------------------------------------------------
-- Library view (block-aware via feed_creations)
-- ---------------------------------------------------------------------------

create or replace view public.library_highlights
with (security_invoker = true)
as
select
  h.id,
  h.user_id,
  h.creation_id,
  h.start_paragraph,
  h.start_char,
  h.end_paragraph,
  h.end_char,
  h.quote,
  h.colour,
  h.note,
  h.created_at,
  h.updated_at,
  true as is_available,
  fc.type,
  fc.title,
  fc.caption,
  fc.cover_url,
  fc.published_at,
  fc.author_id,
  p.username as author_username,
  p.display_name as author_display_name,
  p.avatar_url as author_avatar_url,
  p.verified as author_verified
from public.reader_highlights h
inner join public.feed_creations fc on fc.id = h.creation_id
inner join public.profiles_public p on p.id = fc.author_id;

revoke all on table public.reader_highlights from public, anon;
revoke all on table public.reader_bookmarks from public, anon;
revoke all on table public.library_highlights from public, anon;

grant select, insert, update, delete on public.reader_highlights to authenticated;
grant insert (
  user_id, creation_id, start_paragraph, start_char, end_paragraph, end_char, quote, colour, note
) on public.reader_highlights to authenticated;
grant update (start_paragraph, start_char, end_paragraph, end_char, quote, colour, note) on public.reader_highlights to authenticated;

grant select, insert, update, delete on public.reader_bookmarks to authenticated;
grant insert (user_id, creation_id, paragraph, paragraph_offset, label) on public.reader_bookmarks to authenticated;
grant update (paragraph, paragraph_offset, label) on public.reader_bookmarks to authenticated;

grant select on public.library_highlights to authenticated;

create policy reader_highlights_select on public.reader_highlights
  for select to authenticated using (user_id = auth.uid());

create policy reader_highlights_insert on public.reader_highlights
  for insert to authenticated
  with check (user_id = auth.uid() and public.is_active_user());

create policy reader_highlights_update on public.reader_highlights
  for update to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy reader_highlights_delete on public.reader_highlights
  for delete to authenticated using (user_id = auth.uid());

create policy reader_bookmarks_select on public.reader_bookmarks
  for select to authenticated using (user_id = auth.uid());

create policy reader_bookmarks_insert on public.reader_bookmarks
  for insert to authenticated
  with check (user_id = auth.uid() and public.is_active_user());

create policy reader_bookmarks_update on public.reader_bookmarks
  for update to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy reader_bookmarks_delete on public.reader_bookmarks
  for delete to authenticated using (user_id = auth.uid());
