-- Auto-hide after distinct report threshold; central public visibility; final warning at 3 flagged posts.

alter type public.mod_action add value if not exists 'auto_hide';

alter table public.creations
  add column if not exists auto_hidden_at timestamptz;

-- ---------------------------------------------------------------------------
-- Threshold (keep in sync with src/config/moderation.ts)
-- ---------------------------------------------------------------------------

create or replace function public.auto_hide_distinct_reporters_threshold()
returns integer
language sql
immutable
as $$ select 3 $$;

create or replace function public.auto_hide_flagged_posts_for_final_warning()
returns integer
language sql
immutable
as $$ select 3 $$;

create or replace function public.auto_hide_final_warning_message()
returns text
language sql
immutable
as $$
  select 'Final warning: three of your posts were automatically hidden after multiple reports. Further moderation is at the Founder''s discretion.'::text
$$;

revoke all on function public.auto_hide_distinct_reporters_threshold() from public, anon;
revoke all on function public.auto_hide_flagged_posts_for_final_warning() from public, anon;
revoke all on function public.auto_hide_final_warning_message() from public, anon;
grant execute on function public.auto_hide_distinct_reporters_threshold() to authenticated;
grant execute on function public.auto_hide_flagged_posts_for_final_warning() to authenticated;
grant execute on function public.auto_hide_final_warning_message() to authenticated;

-- ---------------------------------------------------------------------------
-- Central visibility: removed or auto-hidden posts are excluded from public surfaces
-- ---------------------------------------------------------------------------

create or replace function public.creation_excluded_from_public_surfaces(p_creation_id uuid)
returns boolean
language sql
stable
security invoker
set search_path = public
as $$
  select coalesce(
    (
      select c.is_removed or c.auto_hidden_at is not null
      from public.creations c
      where c.id = p_creation_id
    ),
    true
  );
$$;

revoke all on function public.creation_excluded_from_public_surfaces(uuid) from public, anon;
grant execute on function public.creation_excluded_from_public_surfaces(uuid) to authenticated;

create or replace function public.distinct_creation_reporters_count(p_creation_id uuid)
returns integer
language sql
stable
security invoker
set search_path = public
as $$
  select count(distinct r.reporter_id)::integer
  from public.reports r
  inner join public.creations c on c.id = r.target_id
  where r.target_type = 'creation'
    and r.target_id = p_creation_id
    and r.reporter_id is distinct from c.author_id;
$$;

revoke all on function public.distinct_creation_reporters_count(uuid) from public, anon;
grant execute on function public.distinct_creation_reporters_count(uuid) to authenticated;

create or replace function public.flagged_posts_count_for_user(p_user uuid)
returns integer
language sql
stable
security definer
set search_path = public
as $$
  select count(distinct ma.target_id)::integer
  from public.moderation_actions ma
  where ma.action = 'auto_hide'
    and ma.target_type = 'creation'
    and ma.target_user_id = p_user;
$$;

revoke all on function public.flagged_posts_count_for_user(uuid) from public, anon;
grant execute on function public.flagged_posts_count_for_user(uuid) to authenticated;

create or replace function public.moderation_write_auto_audit(
  p_action public.mod_action,
  p_target_type text,
  p_target_id uuid,
  p_target_user_id uuid,
  p_report_id uuid,
  p_reason text,
  p_actor_id uuid
) returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
  v_reason text := btrim(coalesce(p_reason, ''));
begin
  if v_reason = '' or char_length(v_reason) > 500 then
    raise exception 'audit reason must be between 1 and 500 characters';
  end if;
  if p_actor_id is null then
    raise exception 'audit actor is required';
  end if;

  insert into public.moderation_actions (
    actor_id, action, target_type, target_id, target_user_id, report_id, reason
  ) values (
    p_actor_id, p_action, p_target_type, p_target_id, p_target_user_id, p_report_id, v_reason
  )
  returning id into v_id;

  return v_id;
end;
$$;

revoke all on function public.moderation_write_auto_audit(
  public.mod_action, text, uuid, uuid, uuid, text, uuid
) from public, anon, authenticated;

create or replace function public.maybe_issue_auto_hide_final_warning(p_user uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_flagged integer;
  v_msg text := public.auto_hide_final_warning_message();
  v_founder uuid;
begin
  select public.flagged_posts_count_for_user(p_user) into v_flagged;
  if v_flagged < public.auto_hide_flagged_posts_for_final_warning() then
    return;
  end if;

  if exists (
    select 1 from public.warnings w
    where w.user_id = p_user and w.message = v_msg
  ) then
    return;
  end if;

  v_founder := public.founder_profile_id();
  if v_founder is null then
    return;
  end if;

  insert into public.warnings (user_id, message, created_by)
  values (p_user, v_msg, v_founder);

  perform public.create_notification(
    p_user, v_founder, 'warning', 'profile', p_user,
    jsonb_build_object('message', v_msg, 'kind', 'auto_hide_final')
  );
end;
$$;

revoke all on function public.maybe_issue_auto_hide_final_warning(uuid) from public, anon, authenticated;

create or replace function public.apply_auto_hide_on_creation_report()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_author uuid;
  v_count integer;
  v_threshold integer;
  v_hidden_at timestamptz;
  v_action_id uuid;
begin
  if new.target_type <> 'creation' then
    return new;
  end if;

  select c.author_id into v_author
  from public.creations c
  where c.id = new.target_id
  for update;

  if v_author is null then
    return new;
  end if;

  v_threshold := public.auto_hide_distinct_reporters_threshold();
  v_count := public.distinct_creation_reporters_count(new.target_id);

  if v_count < v_threshold then
    return new;
  end if;

  update public.creations
  set auto_hidden_at = coalesce(auto_hidden_at, now())
  where id = new.target_id
    and auto_hidden_at is null
  returning auto_hidden_at into v_hidden_at;

  if v_hidden_at is null then
    return new;
  end if;

  v_action_id := public.moderation_write_auto_audit(
    'auto_hide',
    'creation',
    new.target_id,
    v_author,
    new.id,
    'Auto-hidden after ' || v_count::text || ' distinct reports',
    new.reporter_id
  );

  perform public.create_notification(
    v_author,
    new.reporter_id,
    'moderation_notice',
    'creation',
    new.target_id,
    jsonb_build_object(
      'kind', 'auto_hidden',
      'moderation_action_id', v_action_id,
      'distinct_reporters', v_count
    )
  );

  perform public.create_admin_notification(
    'new_report',
    new.reporter_id,
    'creation',
    new.target_id,
    jsonb_build_object(
      'report_id', new.id,
      'reason', new.reason,
      'auto_hidden', true,
      'distinct_reporters', v_count
    )
  );

  perform public.maybe_issue_auto_hide_final_warning(v_author);

  return new;
end;
$$;

drop trigger if exists reports_auto_hide_creation on public.reports;
create trigger reports_auto_hide_creation
  after insert on public.reports
  for each row execute function public.apply_auto_hide_on_creation_report();

-- ---------------------------------------------------------------------------
-- RLS: auto-hidden creations visible to author and Founder only (published branch)
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
-- Feed views (single exclusion helper)
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
  and not public.creation_excluded_from_public_surfaces(c.id)
  and c.audience = 'public'
  and c.published_at is not null
  and p.status = 'active'
  and not public.is_blocked_between(auth.uid(), c.author_id)
  and not public.is_muted_by(auth.uid(), c.author_id);

-- Search: keep 4-arg signature; tag/writer filters respect auto-hide via central helper
drop function if exists public.search_discovery(text, text, integer);

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

revoke all on function public.search_discovery(text, text, integer, text[]) from public, anon;
grant execute on function public.search_discovery(text, text, integer, text[]) to authenticated;

-- Direct-link gate for non-owners
create or replace function public.creation_viewer_gate(p_id uuid)
returns text
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_row public.creations%rowtype;
  v_uid uuid := auth.uid();
begin
  select * into v_row from public.creations where id = p_id;
  if not found then
    return 'not_found';
  end if;

  if v_row.status <> 'published' and (v_uid is null or v_row.author_id <> v_uid) and not public.is_founder() then
    return 'not_found';
  end if;

  if v_row.auto_hidden_at is not null
    and (v_uid is null or v_row.author_id <> v_uid)
    and not public.is_founder()
  then
    return 'under_review';
  end if;

  if v_row.is_removed
    and (v_uid is null or v_row.author_id <> v_uid)
    and not public.is_founder()
  then
    return 'not_found';
  end if;

  return 'ok';
end;
$$;

revoke all on function public.creation_viewer_gate(uuid) from public, anon;
grant execute on function public.creation_viewer_gate(uuid) to anon, authenticated;

create or replace function public.my_auto_hide_moderation_action_id(p_creation_id uuid)
returns uuid
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_author uuid;
begin
  select author_id into v_author from public.creations where id = p_creation_id;
  if v_author is null or v_author <> auth.uid() then
    raise exception 'forbidden' using errcode = '42501';
  end if;

  return (
    select ma.id
    from public.moderation_actions ma
    where ma.action = 'auto_hide'
      and ma.target_type = 'creation'
      and ma.target_id = p_creation_id
    order by ma.created_at desc
    limit 1
  );
end;
$$;

revoke all on function public.my_auto_hide_moderation_action_id(uuid) from public, anon;
grant execute on function public.my_auto_hide_moderation_action_id(uuid) to authenticated;

-- Founder queue for auto-hidden posts
create or replace view public.founder_auto_hidden_queue
with (security_invoker = true)
as
select
  c.id as creation_id,
  c.auto_hidden_at,
  c.title,
  c.caption,
  left(c.body_text, 500) as body_excerpt,
  c.author_id,
  p.username as author_username,
  p.display_name as author_display_name,
  public.distinct_creation_reporters_count(c.id) as distinct_reporter_count,
  (
    select ma.id
    from public.moderation_actions ma
    where ma.action = 'auto_hide'
      and ma.target_type = 'creation'
      and ma.target_id = c.id
    order by ma.created_at desc
    limit 1
  ) as moderation_action_id
from public.creations c
inner join public.profiles_public p on p.id = c.author_id
where c.auto_hidden_at is not null
  and c.is_removed = false
  and public.is_founder();

revoke all on table public.founder_auto_hidden_queue from public, anon;
grant select on table public.founder_auto_hidden_queue to authenticated;

-- Patch Founder restore/remove for auto-hidden creations
create or replace function public.remove_content(
  p_target_type text, p_target_id uuid, p_reason text, p_report_id uuid default null
) returns void
language plpgsql security definer set search_path = public as $$
declare
  v_reason text := public.founder_require_reason(p_reason);
  v_user uuid;
  v_report public.reports%rowtype;
begin
  if not public.is_founder() then raise exception 'forbidden' using errcode = '42501'; end if;

  if p_target_type = 'creation' then
    update public.creations
    set is_removed = true, removed_reason = v_reason, auto_hidden_at = null
    where id = p_target_id returning author_id into v_user;
  elsif p_target_type = 'comment' then
    update public.comments set is_removed = true, removed_reason = v_reason
    where id = p_target_id returning author_id into v_user;
  else
    raise exception 'Unsupported content type for removal.';
  end if;
  if v_user is null then raise exception 'Content not found.'; end if;

  if p_report_id is not null then
    select * into v_report from public.reports where id = p_report_id for update;
    if not found or v_report.status <> 'open' then raise exception 'Report is not open or does not exist.'; end if;
    update public.reports set status = 'actioned', decided_by = auth.uid(), decided_at = now() where id = p_report_id;
  end if;

  perform public.founder_write_audit('remove', p_target_type, p_target_id, v_user, p_report_id, v_reason);
  perform public.create_notification(
    v_user, public.founder_profile_id(), 'moderation_notice', p_target_type, p_target_id,
    jsonb_build_object('kind', 'removed', 'reason', left(v_reason, 500))
  );
end;
$$;

create or replace function public.restore_content(
  p_target_type text, p_target_id uuid, p_reason text, p_report_id uuid default null
) returns void
language plpgsql security definer set search_path = public as $$
declare
  v_reason text := public.founder_require_reason(p_reason);
  v_user uuid;
begin
  if not public.is_founder() then raise exception 'forbidden' using errcode = '42501'; end if;

  if p_target_type = 'creation' then
    update public.creations
    set is_removed = false, removed_reason = null, auto_hidden_at = null
    where id = p_target_id returning author_id into v_user;
  elsif p_target_type = 'comment' then
    update public.comments set is_removed = false, removed_reason = null
    where id = p_target_id returning author_id into v_user;
  else
    raise exception 'Unsupported content type for restoration.';
  end if;
  if v_user is null then raise exception 'Content not found.'; end if;

  perform public.founder_write_audit('restore', p_target_type, p_target_id, v_user, p_report_id, v_reason);
  perform public.create_notification(
    v_user, public.founder_profile_id(), 'moderation_notice', p_target_type, p_target_id,
    jsonb_build_object('kind', 'restored', 'reason', left(v_reason, 500))
  );
end;
$$;

create or replace function public.decide_appeal(
  p_appeal_id uuid, p_decision public.appeal_decision, p_reason text
) returns void
language plpgsql security definer set search_path = public as $$
declare
  v_reason text := public.founder_require_reason(p_reason);
  v_appeal public.appeals%rowtype;
  v_action public.moderation_actions%rowtype;
begin
  if not public.is_founder() then raise exception 'forbidden' using errcode = '42501'; end if;

  select * into v_appeal from public.appeals where id = p_appeal_id for update;
  if not found or v_appeal.status <> 'pending' then raise exception 'Appeal is not pending or does not exist.'; end if;

  select * into v_action from public.moderation_actions where id = v_appeal.moderation_action_id;
  if not found then raise exception 'Linked moderation action not found.'; end if;

  update public.appeals
  set status = 'decided', decision = p_decision, decided_at = now(), decided_by = auth.uid()
  where id = p_appeal_id;

  perform public.founder_write_audit(
    'appeal_decision', 'appeal', p_appeal_id, v_appeal.user_id, null,
    v_reason || ' (' || p_decision::text || ')'
  );

  perform public.create_notification(
    v_appeal.user_id, public.founder_profile_id(), 'appeal_decision', 'appeal', p_appeal_id,
    jsonb_build_object('decision', p_decision::text, 'reason', left(v_reason, 500))
  );

  if p_decision = 'overturned' then
    if v_action.action in ('ban', 'suspend') then
      perform public.founder_set_user_status(v_appeal.user_id, 'active', v_reason, null, null);
    elsif v_action.action = 'remove' and v_action.target_id is not null then
      perform public.restore_content(v_action.target_type, v_action.target_id, v_reason, null);
    elsif v_action.action = 'auto_hide' and v_action.target_id is not null then
      perform public.restore_content(v_action.target_type, v_action.target_id, v_reason, null);
    end if;
  end if;
end;
$$;
