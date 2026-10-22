-- Voxly Prompt 12A: moderation schema, Safe Space mutes/hidden words, appeals, Founder RPCs.

-- ---------------------------------------------------------------------------
-- reports: decision metadata, self-report guard, duplicate message, rate limit
-- ---------------------------------------------------------------------------

alter table public.reports
  add column if not exists decided_by uuid references public.profiles(id) on delete set null,
  add column if not exists decided_at timestamptz;

do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'reports' and column_name = 'reviewed_at'
  ) then
    update public.reports set decided_at = reviewed_at where decided_at is null and reviewed_at is not null;
    alter table public.reports drop column reviewed_at;
  end if;
end $$;

create table if not exists public.report_events (
  id bigint generated always as identity primary key,
  user_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now()
);

create index if not exists report_events_user_created_idx
  on public.report_events (user_id, created_at desc);

alter table public.report_events enable row level security;
revoke all on table public.report_events from public, anon, authenticated;

create or replace function public.record_report_event(
  p_user_id uuid,
  p_max_per_day integer default 20
) returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  recent integer;
begin
  delete from public.report_events where created_at < now() - interval '2 days';

  select count(*) into recent
  from public.report_events
  where user_id = p_user_id
    and created_at > now() - interval '1 day';

  if recent >= p_max_per_day then
    raise exception 'You have reached the daily report limit. Try again tomorrow.';
  end if;

  insert into public.report_events (user_id) values (p_user_id);
end;
$$;

revoke all on function public.record_report_event(uuid, integer) from public, anon, authenticated;

create or replace function public.enforce_report_insert() returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_author uuid;
begin
  if new.reporter_id is distinct from auth.uid() then
    raise exception 'Reports must be filed as yourself.';
  end if;

  if not public.is_active_user() then
    raise exception 'Account cannot report.';
  end if;

  perform public.record_report_event(new.reporter_id);

  if exists (
    select 1 from public.reports r
    where r.reporter_id = new.reporter_id
      and r.target_type = new.target_type
      and r.target_id = new.target_id
  ) then
    raise exception 'You already reported this';
  end if;

  if new.target_type = 'profile' then
    if new.target_id = new.reporter_id then
      raise exception 'You cannot report yourself.';
    end if;
    new.reported_user_id := coalesce(new.reported_user_id, new.target_id);
    if new.reported_user_id <> new.target_id then
      raise exception 'Invalid profile report.';
    end if;
  elsif new.target_type = 'creation' then
    select c.author_id into v_author from public.creations c where c.id = new.target_id;
    if v_author is null then
      raise exception 'Report target not found.';
    end if;
    if v_author = new.reporter_id then
      raise exception 'You cannot report your own content.';
    end if;
    new.reported_user_id := coalesce(new.reported_user_id, v_author);
  elsif new.target_type = 'comment' then
    select cm.author_id into v_author from public.comments cm where cm.id = new.target_id;
    if v_author is null then
      raise exception 'Report target not found.';
    end if;
    if v_author = new.reporter_id then
      raise exception 'You cannot report your own content.';
    end if;
    new.reported_user_id := coalesce(new.reported_user_id, v_author);
  elsif new.target_type = 'chapter' then
    select c.author_id into v_author
    from public.chapters ch
    inner join public.creations c on c.id = ch.book_id
    where ch.id = new.target_id;
    if v_author is null then
      raise exception 'Report target not found.';
    end if;
    if v_author = new.reporter_id then
      raise exception 'You cannot report your own content.';
    end if;
    new.reported_user_id := coalesce(new.reported_user_id, v_author);
  end if;

  if new.reported_user_id = new.reporter_id then
    raise exception 'You cannot report yourself.';
  end if;

  return new;
end;
$$;

drop trigger if exists reports_enforce_insert on public.reports;
create trigger reports_enforce_insert
  before insert on public.reports
  for each row execute function public.enforce_report_insert();

-- ---------------------------------------------------------------------------
-- moderation_actions + warnings constraints
-- ---------------------------------------------------------------------------

alter type public.mod_action add value if not exists 'private_view';

alter table public.moderation_actions drop constraint if exists moderation_actions_reason_check;
alter table public.moderation_actions
  add constraint moderation_actions_reason_check check (
    char_length(btrim(reason)) >= 1 and char_length(reason) <= 500
  );

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'moderation_actions_report_id_fkey'
      and conrelid = 'public.moderation_actions'::regclass
  ) then
    alter table public.moderation_actions
      add constraint moderation_actions_report_id_fkey
      foreign key (report_id) references public.reports(id) on delete set null;
  end if;
end $$;

alter table public.warnings drop constraint if exists warnings_message_length;
alter table public.warnings
  add constraint warnings_message_length check (char_length(btrim(message)) between 1 and 500);

-- ---------------------------------------------------------------------------
-- Mutes and hidden words (Safe Space filters)
-- ---------------------------------------------------------------------------

create table if not exists public.mutes (
  user_id uuid not null references public.profiles(id) on delete cascade,
  muted_user_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, muted_user_id),
  check (user_id <> muted_user_id)
);

create index if not exists mutes_muted_user_idx on public.mutes (muted_user_id);

alter table public.mutes enable row level security;
revoke all on table public.mutes from public, anon;

create table if not exists public.hidden_words (
  user_id uuid not null references public.profiles(id) on delete cascade,
  word citext not null check (char_length(word::text) between 1 and 40),
  created_at timestamptz not null default now(),
  primary key (user_id, word)
);

alter table public.hidden_words enable row level security;
revoke all on table public.hidden_words from public, anon;

create or replace function public.enforce_hidden_words_limit() returns trigger
language plpgsql
set search_path = public
as $$
declare
  n integer;
begin
  select count(*) into n from public.hidden_words where user_id = new.user_id;
  if n >= 100 then
    raise exception 'You can hide at most 100 words.';
  end if;
  return new;
end;
$$;

drop trigger if exists hidden_words_max_per_user on public.hidden_words;
create trigger hidden_words_max_per_user
  before insert on public.hidden_words
  for each row execute function public.enforce_hidden_words_limit();

create or replace function public.is_muted_by(p_viewer uuid, p_author uuid) returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select case
    when p_viewer is null or p_author is null or p_viewer = p_author then false
    else exists (
      select 1 from public.mutes m
      where m.user_id = p_viewer and m.muted_user_id = p_author
    )
  end;
$$;

revoke all on function public.is_muted_by(uuid, uuid) from public, anon;
grant execute on function public.is_muted_by(uuid, uuid) to authenticated;

create or replace function public.comment_contains_hidden_word(p_user uuid, p_body text) returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.hidden_words hw
    where hw.user_id = p_user
      and p_body ilike ('%' || hw.word::text || '%')
  );
$$;

revoke all on function public.comment_contains_hidden_word(uuid, text) from public, anon;
grant execute on function public.comment_contains_hidden_word(uuid, text) to authenticated;

-- ---------------------------------------------------------------------------
-- Appeals
-- ---------------------------------------------------------------------------

create type public.appeal_decision as enum ('upheld', 'overturned');

create table if not exists public.appeals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  moderation_action_id uuid not null references public.moderation_actions(id) on delete cascade,
  message text not null check (char_length(btrim(message)) between 1 and 500),
  status text not null default 'pending' check (status in ('pending', 'decided')),
  decision public.appeal_decision,
  created_at timestamptz not null default now(),
  decided_at timestamptz,
  decided_by uuid references public.profiles(id) on delete set null,
  constraint appeals_decision_when_decided check (
    status = 'pending' or decision is not null
  )
);

create index if not exists appeals_user_created_idx on public.appeals (user_id, created_at desc);
create index if not exists appeals_status_created_idx on public.appeals (status, created_at desc);

alter table public.appeals enable row level security;
revoke all on table public.appeals from public, anon;

create or replace function public.enforce_appeal_insert() returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_target_user uuid;
begin
  if new.user_id is distinct from auth.uid() then
    raise exception 'Appeals must be submitted as yourself.';
  end if;

  select ma.target_user_id into v_target_user
  from public.moderation_actions ma
  where ma.id = new.moderation_action_id;

  if v_target_user is null or v_target_user <> auth.uid() then
    raise exception 'You can appeal only actions taken against your account.';
  end if;

  if exists (
    select 1 from public.appeals a
    where a.moderation_action_id = new.moderation_action_id
      and a.user_id = new.user_id
      and a.status = 'pending'
  ) then
    raise exception 'You already have a pending appeal for this action.';
  end if;

  return new;
end;
$$;

drop trigger if exists appeals_enforce_insert on public.appeals;
create trigger appeals_enforce_insert
  before insert on public.appeals
  for each row execute function public.enforce_appeal_insert();

-- ---------------------------------------------------------------------------
-- Founder helpers
-- ---------------------------------------------------------------------------

create or replace function public.founder_require_reason(p_reason text) returns text
language plpgsql
immutable
as $$
begin
  if p_reason is null or btrim(p_reason) = '' then
    raise exception 'a reason is required';
  end if;
  if char_length(p_reason) > 500 then
    raise exception 'reason must be at most 500 characters';
  end if;
  return btrim(p_reason);
end;
$$;

revoke all on function public.founder_require_reason(text) from public, anon, authenticated;

create or replace function public.founder_write_audit(
  p_action public.mod_action,
  p_target_type text,
  p_target_id uuid,
  p_target_user_id uuid,
  p_report_id uuid,
  p_reason text
) returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
begin
  insert into public.moderation_actions (
    actor_id, action, target_type, target_id, target_user_id, report_id, reason
  ) values (
    auth.uid(), p_action, p_target_type, p_target_id, p_target_user_id, p_report_id,
    public.founder_require_reason(p_reason)
  )
  returning id into v_id;
  return v_id;
end;
$$;

revoke all on function public.founder_write_audit(
  public.mod_action, text, uuid, uuid, uuid, text
) from public, anon, authenticated;

create or replace function public.founder_mark_report(
  p_report_id uuid,
  p_status public.report_status
) returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_report_id is null then
    return;
  end if;
  update public.reports
  set status = p_status,
      decided_by = auth.uid(),
      decided_at = now()
  where id = p_report_id and status = 'open';
  if not found then
    raise exception 'Report is not open or does not exist.';
  end if;
end;
$$;

revoke all on function public.founder_mark_report(uuid, public.report_status) from public, anon, authenticated;

drop function if exists public.founder_set_user_status(uuid, public.account_status, text, timestamptz);

create or replace function public.founder_set_user_status(
  p_user uuid,
  p_status public.account_status,
  p_reason text,
  p_until timestamptz default null,
  p_report_id uuid default null
) returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_action public.mod_action;
  v_reason text := public.founder_require_reason(p_reason);
begin
  if not public.is_founder() then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  if p_user = auth.uid() then
    raise exception 'cannot change your own status';
  end if;
  if (select role from public.profiles where id = p_user) = 'founder' then
    raise exception 'cannot change the founder';
  end if;
  if p_status = 'suspended' and p_until is null then
    raise exception 'a suspension needs an end date';
  end if;

  update public.profiles
  set status = p_status,
      status_reason = v_reason,
      suspended_until = case when p_status = 'suspended' then p_until else null end
  where id = p_user;

  if not found then
    raise exception 'user not found';
  end if;

  v_action := case p_status
    when 'suspended' then 'suspend'::public.mod_action
    when 'banned' then 'ban'::public.mod_action
    else 'unban'::public.mod_action
  end;

  perform public.founder_write_audit(
    v_action, 'profile', p_user, p_user, p_report_id, v_reason
  );

  if p_report_id is not null and p_status in ('suspended', 'banned') then
    perform public.founder_mark_report(p_report_id, 'actioned');
  end if;
end;
$$;

revoke all on function public.founder_set_user_status(uuid, public.account_status, text, timestamptz, uuid)
  from public, anon;
grant execute on function public.founder_set_user_status(uuid, public.account_status, text, timestamptz, uuid)
  to authenticated;

create or replace function public.dismiss_report(p_report_id uuid, p_reason text) returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_reason text := public.founder_require_reason(p_reason);
  v_row public.reports%rowtype;
begin
  if not public.is_founder() then
    raise exception 'forbidden' using errcode = '42501';
  end if;

  select * into v_row from public.reports where id = p_report_id for update;
  if not found or v_row.status <> 'open' then
    raise exception 'Report is not open or does not exist.';
  end if;

  update public.reports
  set status = 'dismissed', decided_by = auth.uid(), decided_at = now()
  where id = p_report_id;

  perform public.founder_write_audit(
    'dismiss', v_row.target_type::text, v_row.target_id, v_row.reported_user_id, p_report_id, v_reason
  );
end;
$$;

create or replace function public.remove_content(
  p_target_type text,
  p_target_id uuid,
  p_reason text,
  p_report_id uuid default null
) returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_reason text := public.founder_require_reason(p_reason);
  v_user uuid;
  v_report public.reports%rowtype;
begin
  if not public.is_founder() then
    raise exception 'forbidden' using errcode = '42501';
  end if;

  if p_target_type = 'creation' then
    update public.creations
    set is_removed = true, removed_reason = v_reason
    where id = p_target_id
    returning author_id into v_user;
  elsif p_target_type = 'comment' then
    update public.comments
    set is_removed = true, removed_reason = v_reason
    where id = p_target_id
    returning author_id into v_user;
  else
    raise exception 'Unsupported content type for removal.';
  end if;

  if v_user is null then
    raise exception 'Content not found.';
  end if;

  if p_report_id is not null then
    select * into v_report from public.reports where id = p_report_id for update;
    if not found or v_report.status <> 'open' then
      raise exception 'Report is not open or does not exist.';
    end if;
    update public.reports
    set status = 'actioned', decided_by = auth.uid(), decided_at = now()
    where id = p_report_id;
  end if;

  perform public.founder_write_audit(
    'remove', p_target_type, p_target_id, v_user, p_report_id, v_reason
  );
end;
$$;

create or replace function public.restore_content(
  p_target_type text,
  p_target_id uuid,
  p_reason text,
  p_report_id uuid default null
) returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_reason text := public.founder_require_reason(p_reason);
  v_user uuid;
begin
  if not public.is_founder() then
    raise exception 'forbidden' using errcode = '42501';
  end if;

  if p_target_type = 'creation' then
    update public.creations
    set is_removed = false, removed_reason = null
    where id = p_target_id
    returning author_id into v_user;
  elsif p_target_type = 'comment' then
    update public.comments
    set is_removed = false, removed_reason = null
    where id = p_target_id
    returning author_id into v_user;
  else
    raise exception 'Unsupported content type for restore.';
  end if;

  if v_user is null then
    raise exception 'Content not found.';
  end if;

  perform public.founder_write_audit(
    'restore', p_target_type, p_target_id, v_user, p_report_id, v_reason
  );
end;
$$;

create or replace function public.warn_user(
  p_user uuid,
  p_message text,
  p_reason text,
  p_report_id uuid default null
) returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_reason text := public.founder_require_reason(p_reason);
  v_message text := btrim(p_message);
begin
  if not public.is_founder() then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  if v_message is null or char_length(v_message) < 1 or char_length(v_message) > 500 then
    raise exception 'Warning message must be between 1 and 500 characters.';
  end if;
  if p_user = auth.uid() then
    raise exception 'cannot warn yourself';
  end if;
  if not exists (select 1 from public.profiles where id = p_user) then
    raise exception 'user not found';
  end if;

  insert into public.warnings (user_id, message, created_by)
  values (p_user, v_message, auth.uid());

  insert into public.notifications (recipient_id, actor_id, type, target_type, target_id)
  values (p_user, auth.uid(), 'warning', 'profile', p_user);

  perform public.founder_write_audit('warn', 'profile', p_user, p_user, p_report_id, v_reason);

  if p_report_id is not null then
    perform public.founder_mark_report(p_report_id, 'actioned');
  end if;
end;
$$;

create or replace function public.suspend_user(
  p_user uuid,
  p_days integer,
  p_reason text,
  p_report_id uuid default null
) returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_founder() then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  if p_days not in (1, 7, 30) then
    raise exception 'Suspension length must be 1, 7, or 30 days.';
  end if;
  perform public.founder_set_user_status(
    p_user,
    'suspended',
    p_reason,
    now() + (p_days || ' days')::interval,
    p_report_id
  );
end;
$$;

create or replace function public.ban_user(
  p_user uuid,
  p_reason text,
  p_report_id uuid default null
) returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_founder() then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  perform public.founder_set_user_status(p_user, 'banned', p_reason, null, p_report_id);
end;
$$;

create or replace function public.unban_user(
  p_user uuid,
  p_reason text,
  p_report_id uuid default null
) returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_founder() then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  perform public.founder_set_user_status(p_user, 'active', p_reason, null, p_report_id);
end;
$$;

create or replace function public.decide_appeal(
  p_appeal_id uuid,
  p_decision public.appeal_decision,
  p_reason text
) returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_reason text := public.founder_require_reason(p_reason);
  v_appeal public.appeals%rowtype;
  v_action public.moderation_actions%rowtype;
begin
  if not public.is_founder() then
    raise exception 'forbidden' using errcode = '42501';
  end if;

  select * into v_appeal from public.appeals where id = p_appeal_id for update;
  if not found or v_appeal.status <> 'pending' then
    raise exception 'Appeal is not pending or does not exist.';
  end if;

  select * into v_action from public.moderation_actions where id = v_appeal.moderation_action_id;
  if not found then
    raise exception 'Linked moderation action not found.';
  end if;

  update public.appeals
  set status = 'decided',
      decision = p_decision,
      decided_at = now(),
      decided_by = auth.uid()
  where id = p_appeal_id;

  perform public.founder_write_audit(
    'appeal_decision',
    'appeal',
    p_appeal_id,
    v_appeal.user_id,
    null,
    v_reason || ' (' || p_decision::text || ')'
  );

  if p_decision = 'overturned' then
    if v_action.action in ('ban', 'suspend') then
      perform public.founder_set_user_status(v_appeal.user_id, 'active', v_reason, null, null);
    elsif v_action.action = 'remove' and v_action.target_id is not null then
      perform public.restore_content(v_action.target_type, v_action.target_id, v_reason, null);
    end if;
  end if;
end;
$$;

create or replace function public.view_reported_private_content(p_report_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_report public.reports%rowtype;
  v_payload jsonb;
begin
  if not public.is_founder() then
    raise exception 'forbidden' using errcode = '42501';
  end if;

  select * into v_report
  from public.reports
  where id = p_report_id and status = 'open';

  if not found then
    raise exception 'Open report not found.';
  end if;

  if v_report.target_type = 'creation' then
    select jsonb_build_object(
      'target_type', 'creation',
      'target_id', c.id,
      'audience', c.audience,
      'title', c.title,
      'caption', c.caption,
      'body_text', c.body_text
    ) into v_payload
    from public.creations c
    where c.id = v_report.target_id and c.audience = 'private';
  elsif v_report.target_type = 'comment' then
    select jsonb_build_object(
      'target_type', 'comment',
      'target_id', cm.id,
      'body', cm.body,
      'creation_id', cm.creation_id
    ) into v_payload
    from public.comments cm
    inner join public.creations c on c.id = cm.creation_id
    where cm.id = v_report.target_id and c.audience = 'private';
  else
    raise exception 'This report does not reference private content.';
  end if;

  if v_payload is null then
    raise exception 'Private content not found for this report.';
  end if;

  perform public.founder_write_audit(
    'private_view',
    v_report.target_type::text,
    v_report.target_id,
    v_report.reported_user_id,
    p_report_id,
    'Founder viewed reported private content'
  );

  return v_payload;
end;
$$;

revoke all on function public.dismiss_report(uuid, text) from public, anon;
revoke all on function public.remove_content(text, uuid, text, uuid) from public, anon;
revoke all on function public.restore_content(text, uuid, text, uuid) from public, anon;
revoke all on function public.warn_user(uuid, text, text, uuid) from public, anon;
revoke all on function public.suspend_user(uuid, integer, text, uuid) from public, anon;
revoke all on function public.ban_user(uuid, text, uuid) from public, anon;
revoke all on function public.unban_user(uuid, text, uuid) from public, anon;
revoke all on function public.decide_appeal(uuid, public.appeal_decision, text) from public, anon;
revoke all on function public.view_reported_private_content(uuid) from public, anon;

grant execute on function public.dismiss_report(uuid, text) to authenticated;
grant execute on function public.remove_content(text, uuid, text, uuid) to authenticated;
grant execute on function public.restore_content(text, uuid, text, uuid) to authenticated;
grant execute on function public.warn_user(uuid, text, text, uuid) to authenticated;
grant execute on function public.suspend_user(uuid, integer, text, uuid) to authenticated;
grant execute on function public.ban_user(uuid, text, uuid) to authenticated;
grant execute on function public.unban_user(uuid, text, uuid) to authenticated;
grant execute on function public.decide_appeal(uuid, public.appeal_decision, text) to authenticated;
grant execute on function public.view_reported_private_content(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- Founder dashboard views / search
-- ---------------------------------------------------------------------------

create or replace view public.founder_report_queue
with (security_invoker = true)
as
select
  r.id as report_id,
  r.created_at as reported_at,
  r.target_type,
  r.target_id,
  r.reason,
  r.details,
  r.status,
  r.reporter_id,
  rp.username as reporter_username,
  rp.display_name as reporter_display_name,
  r.reported_user_id,
  up.username as reported_username,
  up.display_name as reported_display_name,
  up.status as reported_user_status,
  coalesce((
    select count(*)::integer from public.reports r2
    where r2.reported_user_id = r.reported_user_id and r2.id <> r.id
  ), 0) as prior_reports_against_user,
  coalesce((
    select count(*)::integer from public.warnings w where w.user_id = r.reported_user_id
  ), 0) as warnings_against_user,
  coalesce((
    select count(*)::integer from public.moderation_actions ma
    where ma.target_user_id = r.reported_user_id
  ), 0) as moderation_actions_against_user,
  case r.target_type
    when 'creation' then (
      select jsonb_build_object(
        'kind', 'creation',
        'title', c.title,
        'caption', c.caption,
        'body_excerpt', left(c.body_text, 2000),
        'audience', c.audience,
        'is_removed', c.is_removed,
        'author_id', c.author_id
      )
      from public.creations c where c.id = r.target_id
    )
    when 'comment' then (
      select jsonb_build_object(
        'kind', 'comment',
        'body', cm.body,
        'creation_id', cm.creation_id,
        'is_removed', cm.is_removed,
        'author_id', cm.author_id
      )
      from public.comments cm where cm.id = r.target_id
    )
    when 'profile' then (
      select jsonb_build_object(
        'kind', 'profile',
        'username', p.username,
        'display_name', p.display_name,
        'bio', p.bio,
        'status', p.status
      )
      from public.profiles_public p where p.id = r.target_id
    )
    else null::jsonb
  end as target_snapshot
from public.reports r
left join public.profiles_public rp on rp.id = r.reporter_id
left join public.profiles_public up on up.id = r.reported_user_id
where r.status = 'open'
  and public.is_founder();

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
  null,
  cm.created_at
from public.comments cm
inner join public.profiles_public p on p.id = cm.author_id
where public.is_founder();

create or replace function public.founder_user_search(
  p_query text,
  p_limit integer default 25
) returns jsonb
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_q text := btrim(coalesce(p_query, ''));
  v_limit integer := least(greatest(coalesce(p_limit, 25), 1), 50);
begin
  if not public.is_founder() then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  if char_length(v_q) < 2 then
    return '[]'::jsonb;
  end if;

  return coalesce((
    select jsonb_agg(row_to_json(x))
    from (
      select
        p.id,
        p.username,
        p.display_name,
        p.role,
        p.status,
        p.follower_count,
        p.created_at,
        u.email
      from public.profiles p
      inner join auth.users u on u.id = p.id
      where p.username::text ilike '%' || v_q || '%'
         or p.display_name ilike '%' || v_q || '%'
         or lower(u.email) like '%' || lower(v_q) || '%'
      order by p.created_at desc
      limit v_limit
    ) x
  ), '[]'::jsonb);
end;
$$;

revoke all on function public.founder_user_search(text, integer) from public, anon;
grant execute on function public.founder_user_search(text, integer) to authenticated;

revoke all on table public.founder_report_queue from public, anon;
revoke all on table public.founder_content_browser from public, anon;
grant select on table public.founder_report_queue to authenticated;
grant select on table public.founder_content_browser to authenticated;

-- ---------------------------------------------------------------------------
-- Feed / discover: exclude muted authors (replace in place — dependents keep working)
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
  and not public.is_blocked_between(auth.uid(), c.author_id)
  and not public.is_muted_by(auth.uid(), c.author_id);

create or replace function public.search_discovery(
  p_query text,
  p_tab text default 'top',
  p_limit integer default 20
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

  if p_tab in ('top', 'writers') then
    select coalesce(jsonb_agg(row_to_json(w)), '[]'::jsonb) into v_writers
    from (
      select p.id, p.username, p.display_name, p.avatar_url, p.verified, p.follower_count
      from public.profiles_public p
      where p.status = 'active'
        and not public.is_muted_by(v_user, p.id)
        and (
          p.username ilike v_q || '%'
          or p.display_name ilike '%' || v_q || '%'
          or similarity(p.username, v_q) > 0.25
          or similarity(p.display_name, v_q) > 0.25
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
      where c.search_tsv @@ v_tsquery
         or fc.title ilike '%' || v_q || '%'
         or fc.caption ilike '%' || v_q || '%'
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
        and c.is_removed = false
        and p.status = 'active'
        and not public.is_blocked_between(v_user, c.author_id)
        and not public.is_muted_by(v_user, c.author_id)
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

-- ---------------------------------------------------------------------------
-- Comment visibility for muters
-- ---------------------------------------------------------------------------

drop policy if exists comments_select on public.comments;

create policy comments_select on public.comments
  for select to authenticated
  using (
    public.can_view_creation(creation_id)
    and not public.is_blocked_between(auth.uid(), author_id)
    and not public.is_muted_by(auth.uid(), author_id)
    and not public.comment_contains_hidden_word(auth.uid(), body)
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

-- ---------------------------------------------------------------------------
-- RLS + column grants (00004 pattern)
-- ---------------------------------------------------------------------------

grant select, delete on table public.mutes to authenticated;
grant insert (user_id, muted_user_id) on table public.mutes to authenticated;

grant select, delete on table public.hidden_words to authenticated;
grant insert (user_id, word) on table public.hidden_words to authenticated;

grant select, insert (user_id, moderation_action_id, message) on table public.appeals to authenticated;

create policy mutes_select on public.mutes
  for select to authenticated using (user_id = auth.uid());

create policy mutes_insert on public.mutes
  for insert to authenticated
  with check (user_id = auth.uid() and muted_user_id <> auth.uid());

create policy mutes_delete on public.mutes
  for delete to authenticated using (user_id = auth.uid());

create policy hidden_words_select on public.hidden_words
  for select to authenticated using (user_id = auth.uid());

create policy hidden_words_insert on public.hidden_words
  for insert to authenticated with check (user_id = auth.uid());

create policy hidden_words_delete on public.hidden_words
  for delete to authenticated using (user_id = auth.uid());

create policy appeals_select on public.appeals
  for select to authenticated using (user_id = auth.uid());

create policy appeals_insert on public.appeals
  for insert to authenticated with check (user_id = auth.uid());

-- ---------------------------------------------------------------------------
-- Open-report checks for deletes (RLS on reports must not hide reports from authors)
-- ---------------------------------------------------------------------------

create or replace function public.creation_has_open_report(p_creation_id uuid) returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.reports r
    where r.status = 'open'
      and r.target_type = 'creation'
      and r.target_id = p_creation_id
  );
$$;

create or replace function public.comment_has_open_report(p_comment_id uuid, p_creation_id uuid) returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.reports r
    where r.status = 'open'
      and (
        (r.target_type = 'comment' and r.target_id = p_comment_id)
        or (r.target_type = 'creation' and r.target_id = p_creation_id)
      )
  );
$$;

create or replace function public.chapter_has_open_report(p_chapter_id uuid, p_book_id uuid) returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.reports r
    where r.status = 'open'
      and (
        (r.target_type = 'chapter' and r.target_id = p_chapter_id)
        or (r.target_type = 'creation' and r.target_id = p_book_id)
      )
  );
$$;

revoke all on function public.creation_has_open_report(uuid) from public, anon;
revoke all on function public.comment_has_open_report(uuid, uuid) from public, anon;
revoke all on function public.chapter_has_open_report(uuid, uuid) from public, anon;
grant execute on function public.creation_has_open_report(uuid) to authenticated;
grant execute on function public.comment_has_open_report(uuid, uuid) to authenticated;
grant execute on function public.chapter_has_open_report(uuid, uuid) to authenticated;

drop policy if exists creations_delete on public.creations;
create policy creations_delete on public.creations
  for delete to authenticated
  using (
    author_id = auth.uid()
    and public.is_active_user()
    and is_removed = false
    and not public.creation_has_open_report(id)
  );

drop policy if exists chapters_delete on public.chapters;
create policy chapters_delete on public.chapters
  for delete to authenticated
  using (
    public.is_active_user()
    and exists (
      select 1 from public.creations c
      where c.id = chapters.book_id and c.author_id = auth.uid()
    )
    and not public.chapter_has_open_report(id, book_id)
  );

drop policy if exists comments_delete on public.comments;
create policy comments_delete on public.comments
  for delete to authenticated
  using (
    author_id = auth.uid()
    and public.is_active_user()
    and not public.comment_has_open_report(id, creation_id)
  );
