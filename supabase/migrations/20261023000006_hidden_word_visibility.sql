-- Hidden words: keep comments visible for collapse UI; redact feed excerpts at query layer.

drop policy if exists comments_select on public.comments;

create policy comments_select on public.comments
  for select to authenticated
  using (
    public.can_view_creation(creation_id)
    and not public.is_blocked_between(auth.uid(), author_id)
    and not public.is_muted_by(auth.uid(), author_id)
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

create or replace function public.redact_hidden_words_in_text(p_user uuid, p_text text) returns text
language sql
stable
security invoker
set search_path = public
as $$
  select case
    when p_text is null or p_text = '' then p_text
    when public.comment_contains_hidden_word(p_user, p_text) then ''
    else p_text
  end;
$$;

revoke all on function public.redact_hidden_words_in_text(uuid, text) from public, anon;
grant execute on function public.redact_hidden_words_in_text(uuid, text) to authenticated;

create or replace view public.feed_creations
with (security_invoker = true)
as
select
  c.id,
  c.author_id,
  c.type,
  c.title,
  c.caption,
  public.redact_hidden_words_in_text(auth.uid(), left(c.body_text, 1200)) as body_excerpt,
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
  and not public.is_blocked_between(auth.uid(), c.author_id)
  and not public.is_muted_by(auth.uid(), c.author_id);

create or replace view public.following_feed
with (security_invoker = true)
as
select
  c.id,
  c.author_id,
  c.type,
  c.title,
  c.caption,
  public.redact_hidden_words_in_text(auth.uid(), left(c.body_text, 1200)) as body_excerpt,
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
  and not public.is_blocked_between(auth.uid(), c.author_id)
  and not public.is_muted_by(auth.uid(), c.author_id);
