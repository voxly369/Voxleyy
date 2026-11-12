-- Self-harm topic support on post detail; methods/instructions removal without strikes.

alter table public.creations
  add column if not exists is_self_harm_topic boolean not null default false,
  add column if not exists contains_self_harm_methods boolean not null default false;

create or replace function public.notify_founder_self_harm_methods(
  p_creation_id uuid,
  p_author_id uuid
) returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.create_admin_notification(
    'new_report',
    p_author_id,
    'creation',
    p_creation_id,
    jsonb_build_object(
      'kind', 'self_harm_methods',
      'creation_id', p_creation_id,
      'author_id', p_author_id
    )
  );
end;
$$;

revoke all on function public.notify_founder_self_harm_methods(uuid, uuid) from public, anon;
grant execute on function public.notify_founder_self_harm_methods(uuid, uuid) to authenticated;

-- Founder: flag methods/instructions, remove via existing audit path, notify founder, no strike ladder.
create or replace function public.founder_remove_self_harm_methods_content(
  p_creation_id uuid,
  p_reason text,
  p_report_id uuid default null
) returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_reason text := public.founder_require_reason(p_reason);
  v_author uuid;
begin
  if not public.is_founder() then
    raise exception 'forbidden' using errcode = '42501';
  end if;

  update public.creations
  set contains_self_harm_methods = true
  where id = p_creation_id
  returning author_id into v_author;

  if v_author is null then
    raise exception 'Content not found.';
  end if;

  perform public.remove_content('creation', p_creation_id, v_reason, p_report_id);
  perform public.notify_founder_self_harm_methods(p_creation_id, v_author);
end;
$$;

revoke all on function public.founder_remove_self_harm_methods_content(uuid, text, uuid) from public, anon;
grant execute on function public.founder_remove_self_harm_methods_content(uuid, text, uuid) to authenticated;

-- Auto-hide: self-harm topic posts do not advance the strike ladder.
create or replace function public.apply_auto_hide_on_creation_report()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_author uuid;
  v_self_harm_topic boolean;
  v_count integer;
  v_threshold integer;
  v_hidden_at timestamptz;
  v_action_id uuid;
begin
  if new.target_type <> 'creation' then
    return new;
  end if;

  select c.author_id, c.is_self_harm_topic into v_author, v_self_harm_topic
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
  if not coalesce(v_self_harm_topic, false) then
    perform public.strike_ladder_after_auto_hide(v_author);
  end if;

  return new;
end;
$$;

create or replace view public.founder_content_browser
with (security_invoker = true)
as
select
  'creation'::text as content_kind,
  c.id as content_id,
  c.author_id,
  p.username as author_username,
  p.display_name as author_display_name,
  c.title,
  left(c.body_text, 500) as body_excerpt,
  c.audience,
  c.status,
  c.is_removed,
  c.removed_reason,
  c.is_self_harm_topic,
  c.contains_self_harm_methods,
  c.published_at,
  c.created_at
from public.creations c
inner join public.profiles_public p on p.id = c.author_id
where public.is_founder()
union all
select
  'comment'::text,
  cm.id,
  cm.author_id,
  p.username,
  p.display_name,
  null,
  left(cm.body, 500),
  null,
  null,
  cm.is_removed,
  cm.removed_reason,
  false,
  false,
  null,
  cm.created_at
from public.comments cm
inner join public.profiles_public p on p.id = cm.author_id
where public.is_founder();
