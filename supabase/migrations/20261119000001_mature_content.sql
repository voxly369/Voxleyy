-- Mature content flag, viewer gating (age_18 consent + opt-in), feed/search filters.

alter table public.creations
  add column if not exists contains_sexual_content boolean not null default false,
  add column if not exists is_mature_content boolean not null default false;

alter table public.notification_settings
  add column if not exists show_mature_content boolean not null default false;

-- ---------------------------------------------------------------------------
-- Viewer eligibility (age from user_consents.age_18; opt-in on notification_settings)
-- ---------------------------------------------------------------------------

create or replace function public.viewer_confirmed_age_18(p_user uuid default auth.uid())
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.user_consents uc
    where uc.user_id = coalesce(p_user, auth.uid())
      and uc.document = 'age_18'
  );
$$;

create or replace function public.viewer_may_see_mature_content(p_user uuid default auth.uid())
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.viewer_confirmed_age_18(p_user)
    and coalesce(
      (
        select ns.show_mature_content
        from public.notification_settings ns
        where ns.user_id = coalesce(p_user, auth.uid())
      ),
      false
    );
$$;

revoke all on function public.viewer_confirmed_age_18(uuid) from public, anon;
revoke all on function public.viewer_may_see_mature_content(uuid) from public, anon;
grant execute on function public.viewer_confirmed_age_18(uuid) to authenticated;
grant execute on function public.viewer_may_see_mature_content(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- Publish guard: sexual content requires mature acknowledgment
-- ---------------------------------------------------------------------------

create or replace function public.enforce_mature_content_on_publish()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.status = 'published'::public.publish_status
     and (old.status is distinct from new.status or old.status is null) then
    if new.contains_sexual_content and not new.is_mature_content then
      raise exception 'Mature content must be confirmed before publishing sexual content.'
        using errcode = '23514';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists creations_mature_publish_guard on public.creations;
create trigger creations_mature_publish_guard
  before insert or update on public.creations
  for each row execute function public.enforce_mature_content_on_publish();

-- ---------------------------------------------------------------------------
-- RLS: hide mature posts from viewers who are not 18+ opted in
-- ---------------------------------------------------------------------------

drop policy if exists creations_select on public.creations;

create policy creations_select on public.creations
  for select to authenticated
  using (
    author_id = auth.uid()
    or (
      status = 'published'
      and is_removed = false
      and auto_hidden_at is null
      and (not is_mature_content or public.viewer_may_see_mature_content())
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
-- Feed views (same mature filter as creations_select public branch)
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
  and not public.creation_excluded_from_public_surfaces(c.id)
  and c.audience = 'public'
  and c.published_at is not null
  and p.status = 'active'
  and not public.is_blocked_between(auth.uid(), c.author_id)
  and not public.is_muted_by(auth.uid(), c.author_id)
  and (not c.is_mature_content or public.viewer_may_see_mature_content());

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
  and not public.creation_excluded_from_public_surfaces(c.id)
  and c.audience = 'public'
  and c.published_at is not null
  and p.status = 'active'
  and not public.is_blocked_between(auth.uid(), c.author_id)
  and not public.is_muted_by(auth.uid(), c.author_id)
  and (not c.is_mature_content or public.viewer_may_see_mature_content());

-- Patch search_discovery tag/writer branches for mature (posts already use feed_creations)
create or replace function public.search_discovery(
  p_query text,
  p_tab text default 'top',
  p_limit integer default 20,
  p_languages text[] default null
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
  v_langs text[];
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
  v_langs := nullif(
    array(
      select distinct lower(btrim(x))
      from unnest(coalesce(p_languages, '{}'::text[])) x
      where btrim(x) ~ '^[a-z]{2,8}$'
    ),
    '{}'::text[]
  );

  if p_tab in ('top', 'writers') then
    select coalesce(jsonb_agg(row_to_json(w)), '[]'::jsonb) into v_writers
    from (
      select p.id, p.username, p.display_name, p.avatar_url, p.verified, p.follower_count, p.country
      from public.profiles_public p
      where p.status = 'active'
        and not public.is_muted_by(v_user, p.id)
        and (
          p.username ilike v_q || '%'
          or p.display_name ilike '%' || v_q || '%'
          or similarity(p.username, v_q) > 0.25
          or similarity(p.display_name, v_q) > 0.25
        )
        and (
          v_langs is null
          or exists (
            select 1
            from public.creations c
            where c.author_id = p.id
              and c.status = 'published'
              and c.audience = 'public'
              and not public.creation_excluded_from_public_surfaces(c.id)
              and (not c.is_mature_content or public.viewer_may_see_mature_content(v_user))
              and lower(c.language) = any (v_langs)
          )
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
      where (c.search_tsv @@ v_tsquery
         or fc.title ilike '%' || v_q || '%'
         or fc.caption ilike '%' || v_q || '%')
        and (v_langs is null or lower(c.language) = any (v_langs))
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
        and not public.creation_excluded_from_public_surfaces(c.id)
        and (not c.is_mature_content or public.viewer_may_see_mature_content(v_user))
        and p.status = 'active'
        and not public.is_blocked_between(v_user, c.author_id)
        and (v_langs is null or lower(c.language) = any (v_langs))
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
