-- History/continue views list only feed-visible works; saved keeps unavailable rows for neutral cards.

create or replace view public.library_reading_history
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
  true as is_available,
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
  p.verified as author_verified
from public.post_reading_progress rp
inner join public.feed_creations fc on fc.id = rp.creation_id
inner join public.profiles_public p on p.id = fc.author_id;

create or replace view public.library_continue_reading
with (security_invoker = true)
as
select *
from public.library_reading_history
where not completed and percent > 0;

revoke all on table public.post_reading_progress from public, anon;
revoke all on table public.reader_collections from public, anon;
revoke all on table public.reader_collection_items from public, anon;
revoke all on table public.reader_preferences from public, anon;
