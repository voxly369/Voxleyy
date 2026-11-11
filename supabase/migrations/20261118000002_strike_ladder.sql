-- Strike ladder: final warning at 2 auto-hidden posts, post suspension, account suspension.

alter type public.mod_action add value if not exists 'post_suspend';

-- ---------------------------------------------------------------------------
-- Config (keep in sync with src/config/moderation.ts)
-- ---------------------------------------------------------------------------

create or replace function public.auto_hide_flagged_posts_for_final_warning()
returns integer
language sql
immutable
as $$ select 2 $$;

create or replace function public.auto_hide_final_warning_message()
returns text
language sql
immutable
as $$
  select 'Final warning: two of your posts were automatically hidden after multiple reports. Further moderation is at the Founder''s discretion.'::text
$$;

create or replace function public.strike_ladder_post_suspension_days()
returns integer
language sql
immutable
as $$ select 7 $$;

create or replace function public.strike_ladder_account_suspension_days()
returns integer
language sql
immutable
as $$ select 7 $$;

create or replace function public.strike_ladder_account_strike_threshold()
returns integer
language sql
immutable
as $$ select 5 $$;

create or replace function public.strike_ladder_account_min_post_suspensions()
returns integer
language sql
immutable
as $$ select 2 $$;

revoke all on function public.strike_ladder_post_suspension_days() from public, anon;
revoke all on function public.strike_ladder_account_suspension_days() from public, anon;
revoke all on function public.strike_ladder_account_strike_threshold() from public, anon;
revoke all on function public.strike_ladder_account_min_post_suspensions() from public, anon;
grant execute on function public.strike_ladder_post_suspension_days() to authenticated;
grant execute on function public.strike_ladder_account_suspension_days() to authenticated;
grant execute on function public.strike_ladder_account_strike_threshold() to authenticated;
grant execute on function public.strike_ladder_account_min_post_suspensions() to authenticated;

-- ---------------------------------------------------------------------------
-- Writer strike state
-- ---------------------------------------------------------------------------

create table if not exists public.writer_strike_state (
  user_id uuid primary key references public.profiles (id) on delete cascade,
  strike_count integer not null default 0 check (strike_count >= 0),
  post_suspension_count integer not null default 0 check (post_suspension_count >= 0),
  post_suspended_until timestamptz,
  updated_at timestamptz not null default now()
);

alter table public.writer_strike_state enable row level security;

create policy writer_strike_state_select on public.writer_strike_state
  for select to authenticated
  using (user_id = auth.uid() or public.is_founder());

revoke all on table public.writer_strike_state from public, anon;
grant select on table public.writer_strike_state to authenticated;

-- ---------------------------------------------------------------------------
-- Post suspension gate (publish / create while not account-suspended)
-- ---------------------------------------------------------------------------

create or replace function public.is_post_suspended(p_user uuid default auth.uid())
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.writer_strike_state w
    where w.user_id = coalesce(p_user, auth.uid())
      and w.post_suspended_until is not null
      and w.post_suspended_until > now()
  );
$$;

create or replace function public.writer_may_publish()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.is_active_user()
    and not public.is_post_suspended(auth.uid());
$$;

revoke all on function public.is_post_suspended(uuid) from public, anon;
revoke all on function public.writer_may_publish() from public, anon;
grant execute on function public.is_post_suspended(uuid) to authenticated;
grant execute on function public.writer_may_publish() to authenticated;

drop policy if exists creations_insert on public.creations;
create policy creations_insert on public.creations
  for insert to authenticated
  with check (
    author_id = auth.uid()
    and public.writer_may_publish()
    and status in ('draft', 'published')
  );

drop policy if exists creations_update on public.creations;
create policy creations_update on public.creations
  for update to authenticated
  using (author_id = auth.uid() and is_removed = false)
  with check (
    author_id = auth.uid()
    and public.writer_may_publish()
    and status in ('draft', 'published')
  );

-- ---------------------------------------------------------------------------
-- Strike ladder actions (security definer; called from auto-hide trigger)
-- ---------------------------------------------------------------------------

create or replace function public.ensure_writer_strike_state(p_user uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.writer_strike_state (user_id)
  values (p_user)
  on conflict (user_id) do nothing;
end;
$$;

revoke all on function public.ensure_writer_strike_state(uuid) from public, anon, authenticated;

create or replace function public.maybe_apply_strike_post_suspension(p_user uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_flagged integer;
  v_warn_threshold integer;
  v_days integer;
  v_until timestamptz;
  v_founder uuid;
  v_reason text;
begin
  if (select role from public.profiles where id = p_user) = 'founder' then
    return;
  end if;

  v_warn_threshold := public.auto_hide_flagged_posts_for_final_warning();
  v_flagged := public.flagged_posts_count_for_user(p_user);
  if v_flagged <= v_warn_threshold then
    return;
  end if;

  perform public.ensure_writer_strike_state(p_user);

  v_days := public.strike_ladder_post_suspension_days();
  v_until := now() + make_interval(days => v_days);

  update public.writer_strike_state
  set post_suspended_until = greatest(coalesce(post_suspended_until, '-infinity'::timestamptz), v_until),
      post_suspension_count = post_suspension_count + 1,
      strike_count = strike_count + 1,
      updated_at = now()
  where user_id = p_user;

  v_founder := public.founder_profile_id();
  if v_founder is null then
    return;
  end if;

  v_reason := 'Posting suspended for ' || v_days::text || ' days after repeated auto-hidden posts (strike ladder).';

  perform public.moderation_write_auto_audit(
    'post_suspend',
    'profile',
    p_user,
    p_user,
    null,
    v_reason,
    v_founder
  );

  perform public.create_notification(
    p_user,
    v_founder,
    'moderation_notice',
    'profile',
    p_user,
    jsonb_build_object(
      'kind', 'post_suspended',
      'until', v_until,
      'days', v_days,
      'strike_count', (select strike_count from public.writer_strike_state where user_id = p_user)
    )
  );
end;
$$;

revoke all on function public.maybe_apply_strike_post_suspension(uuid) from public, anon, authenticated;

create or replace function public.maybe_apply_strike_account_suspension(p_user uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_strikes integer;
  v_post_suspensions integer;
  v_days integer;
  v_until timestamptz;
  v_founder uuid;
  v_reason text;
  v_status public.account_status;
begin
  if (select role from public.profiles where id = p_user) = 'founder' then
    return;
  end if;

  select strike_count, post_suspension_count
  into v_strikes, v_post_suspensions
  from public.writer_strike_state
  where user_id = p_user;

  if v_strikes is null then
    return;
  end if;

  if v_post_suspensions < public.strike_ladder_account_min_post_suspensions()
     or v_strikes < public.strike_ladder_account_strike_threshold() then
    return;
  end if;

  select status into v_status from public.profiles where id = p_user;
  if v_status <> 'active' then
    return;
  end if;

  v_days := public.strike_ladder_account_suspension_days();
  v_until := now() + make_interval(days => v_days);
  v_reason := 'Account suspended for ' || v_days::text
    || ' days after ' || v_strikes::text || ' strikes (strike ladder).';

  update public.profiles
  set status = 'suspended',
      status_reason = v_reason,
      suspended_until = v_until
  where id = p_user;

  v_founder := public.founder_profile_id();
  if v_founder is null then
    return;
  end if;

  perform public.moderation_write_auto_audit(
    'suspend',
    'profile',
    p_user,
    p_user,
    null,
    v_reason,
    v_founder
  );

  perform public.moderation_notice_for_status(p_user, 'suspended', v_reason);
end;
$$;

revoke all on function public.maybe_apply_strike_account_suspension(uuid) from public, anon, authenticated;

create or replace function public.strike_ladder_after_auto_hide(p_user uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.maybe_apply_strike_post_suspension(p_user);
  perform public.maybe_apply_strike_account_suspension(p_user);
end;
$$;

revoke all on function public.strike_ladder_after_auto_hide(uuid) from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- Patch auto-hide trigger to run strike ladder after final warning check
-- ---------------------------------------------------------------------------

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
  perform public.strike_ladder_after_auto_hide(v_author);

  return new;
end;
$$;
