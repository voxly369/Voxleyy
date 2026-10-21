-- Prompt 11B: chapter reorder RPC, library continue/highlights for books, smoke-test hooks.

-- ---------------------------------------------------------------------------
-- reorder_book_chapters (transaction-safe positions)
-- ---------------------------------------------------------------------------

create or replace function public.reorder_book_chapters(p_book_id uuid, p_chapter_ids uuid[])
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_expected integer;
  v_provided integer;
begin
  if v_uid is null then
    raise exception 'Sign in to reorder chapters.';
  end if;
  if not public.is_active_user() then
    raise exception 'Account is not active.';
  end if;
  if not exists (
    select 1 from public.creations c
    where c.id = p_book_id and c.type = 'book' and c.author_id = v_uid and c.is_removed = false
  ) then
    raise exception 'Only the author can reorder chapters.';
  end if;

  select count(*) into v_expected
  from public.chapters
  where book_id = p_book_id and is_removed = false;

  v_provided := coalesce(array_length(p_chapter_ids, 1), 0);
  if v_expected <> v_provided then
    raise exception 'Chapter list does not match this book.';
  end if;

  if exists (
    select 1
    from unnest(p_chapter_ids) as cid(id)
    left join public.chapters ch on ch.id = cid.id and ch.book_id = p_book_id and ch.is_removed = false
    where ch.id is null
  ) then
    raise exception 'One or more chapters do not belong to this book.';
  end if;

  update public.chapters ch
  set position = -ord.ordinality
  from unnest(p_chapter_ids) with ordinality as ord(id, ordinality)
  where ch.id = ord.id and ch.book_id = p_book_id;

  update public.chapters
  set position = -position
  where book_id = p_book_id and position < 0;
end;
$$;

revoke all on function public.reorder_book_chapters(uuid, uuid[]) from public, anon;
grant execute on function public.reorder_book_chapters(uuid, uuid[]) to authenticated;

-- ---------------------------------------------------------------------------
-- library_continue_reading: posts + in-progress books
-- ---------------------------------------------------------------------------

create or replace view public.library_continue_reading
with (security_invoker = true)
as
select
  rp.user_id,
  rp.creation_id,
  rp.percent,
  rp.position,
  rp.completed,
  rp.first_read_at,
  rp.updated_at,
  (fc.id is not null) as is_available,
  fc.type,
  fc.title,
  fc.caption,
  fc.body_excerpt,
  fc.body_truncated,
  fc.cover_url,
  fc.published_at,
  fc.author_id,
  p.username as author_username,
  p.display_name as author_display_name,
  p.avatar_url as author_avatar_url,
  p.verified as author_verified,
  null::uuid as resume_chapter_id
from public.post_reading_progress rp
left join public.feed_creations fc on fc.id = rp.creation_id
left join public.profiles_public p on p.id = fc.author_id
where not rp.completed and rp.percent > 0

union all

select
  brp.user_id,
  brp.book_id as creation_id,
  brp.percent,
  brp.position,
  brp.completed,
  brp.first_read_at,
  brp.updated_at,
  public.can_view_creation(c.id) as is_available,
  'book'::public.creation_type as type,
  c.title,
  null::text as caption,
  ch.title as body_excerpt,
  false as body_truncated,
  c.cover_url,
  c.published_at,
  c.author_id,
  p.username as author_username,
  p.display_name as author_display_name,
  p.avatar_url as author_avatar_url,
  p.verified as author_verified,
  brp.chapter_id as resume_chapter_id
from public.reading_progress brp
inner join public.creations c on c.id = brp.book_id and c.type = 'book' and c.is_removed = false
inner join public.profiles_public p on p.id = c.author_id
left join public.chapters ch on ch.id = brp.chapter_id
where not brp.completed and brp.percent > 0;

revoke all on table public.library_continue_reading from public, anon;
grant select on table public.library_continue_reading to authenticated;

-- ---------------------------------------------------------------------------
-- library_highlights: posts + book chapters
-- ---------------------------------------------------------------------------

create or replace view public.library_highlights
with (security_invoker = true)
as
select
  h.id,
  h.user_id,
  h.creation_id,
  null::uuid as chapter_id,
  null::text as chapter_title,
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
inner join public.profiles_public p on p.id = fc.author_id
where h.creation_id is not null

union all

select
  h.id,
  h.user_id,
  ch.book_id as creation_id,
  h.chapter_id,
  ch.title as chapter_title,
  h.start_paragraph,
  h.start_char,
  h.end_paragraph,
  h.end_char,
  h.quote,
  h.colour,
  h.note,
  h.created_at,
  h.updated_at,
  public.can_read_book_chapter(h.chapter_id) as is_available,
  'book'::public.creation_type as type,
  c.title,
  null::text as caption,
  c.cover_url,
  c.published_at,
  c.author_id,
  p.username as author_username,
  p.display_name as author_display_name,
  p.avatar_url as author_avatar_url,
  p.verified as author_verified
from public.reader_highlights h
inner join public.chapters ch on ch.id = h.chapter_id and ch.is_removed = false
inner join public.creations c on c.id = ch.book_id and c.type = 'book' and c.is_removed = false
inner join public.profiles_public p on p.id = c.author_id
where h.chapter_id is not null;

revoke all on table public.library_highlights from public, anon;
grant select on table public.library_highlights to authenticated;
