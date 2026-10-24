-- Prompt 16A: beta invite, waitlist, client errors, consents, health, export, delete account.

-- ---------------------------------------------------------------------------
-- Platform settings (beta + signups)
-- ---------------------------------------------------------------------------

insert into public.platform_settings (key, value)
values
  ('beta', jsonb_build_object(
    'invite_only', true,
    'signups_open', true,
    'waitlist_open', false,
    'closed_message', null
  )),
  ('signups', jsonb_build_object('open', true))
on conflict (key) do nothing;

create or replace function public.platform_setting_json(p_key text)
returns jsonb
language sql stable security definer set search_path = public as $$
  select coalesce((select value from public.platform_settings where key = p_key), '{}'::jsonb);
$$;

revoke all on function public.platform_setting_json(text) from public, anon;
grant execute on function public.platform_setting_json(text) to authenticated;

-- ---------------------------------------------------------------------------
-- Beta access flag on profiles
-- ---------------------------------------------------------------------------

alter table public.profiles
  add column if not exists beta_access_granted boolean not null default true;

update public.profiles set beta_access_granted = true where beta_access_granted is distinct from true;

create or replace function public.user_beta_access_ok(p_uid uuid default auth.uid()) returns boolean
language sql stable security definer set search_path = public as $$
  select case
    when p_uid is null then false
    when lower((select email from auth.users where id = p_uid limit 1)) = public.founder_email() then true
    when coalesce((public.platform_setting_json('beta')->>'invite_only')::boolean, false) = false then true
    else coalesce((select beta_access_granted from public.profiles where id = p_uid), false)
  end;
$$;

revoke all on function public.user_beta_access_ok(uuid) from public, anon;
grant execute on function public.user_beta_access_ok(uuid) to authenticated;

-- Gate creation writes for users without beta access
create or replace function public.enforce_beta_access_on_creation() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if not public.user_beta_access_ok(new.author_id) then
    raise exception 'Sign-up is not complete. Enter a valid invite code.';
  end if;
  return new;
end;
$$;

drop trigger if exists creations_beta_access on public.creations;
create trigger creations_beta_access
  before insert on public.creations
  for each row execute function public.enforce_beta_access_on_creation();

-- handle_new_user: pending beta when invite-only (founder exempt)
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public, auth as $$
declare
  base text;
  candidate text;
  chosen text;
  attempt int;
  v_constraint text;
  v_invite_only boolean;
  v_beta_granted boolean;
begin
  v_invite_only := coalesce((public.platform_setting_json('beta')->>'invite_only')::boolean, false);
  v_beta_granted := not v_invite_only
    or (lower(new.email) = public.founder_email());

  chosen := lower(coalesce(new.raw_user_meta_data->>'username', ''));
  if public.chosen_username_ok(chosen) then
    begin
      insert into public.profiles (id, username, display_name, role, beta_access_granted)
      values (
        new.id, chosen,
        left(coalesce(new.raw_user_meta_data->>'display_name', ''), 60),
        case when lower(new.email) = public.founder_email() and new.email_confirmed_at is not null
          then 'founder'::public.user_role else 'reader'::public.user_role end,
        v_beta_granted
      );
      return new;
    exception when unique_violation then
      get stacked diagnostics v_constraint = constraint_name;
      if v_constraint is distinct from 'profiles_username_key' then raise; end if;
    end;
  end if;

  base := left(regexp_replace(lower(split_part(coalesce(new.email, ''), '@', 1)), '[^a-z0-9_]', '', 'g'), 20);
  if char_length(base) < 3 then base := 'writer'; end if;

  for attempt in 1..8 loop
    candidate := base || substr(md5(random()::text || new.id::text || attempt::text), 1, 5);
    begin
      insert into public.profiles (id, username, display_name, role, beta_access_granted)
      values (
        new.id, candidate,
        left(coalesce(new.raw_user_meta_data->>'display_name', ''), 60),
        case when lower(new.email) = public.founder_email() and new.email_confirmed_at is not null
          then 'founder'::public.user_role else 'reader'::public.user_role end,
        v_beta_granted
      );
      return new;
    exception when unique_violation then
      get stacked diagnostics v_constraint = constraint_name;
      if v_constraint is distinct from 'profiles_username_key' then raise; end if;
    end;
  end loop;
  raise exception 'could not allocate a username';
end;
$$;

-- ---------------------------------------------------------------------------
-- Invite codes
-- ---------------------------------------------------------------------------

create table public.invite_codes (
  code text primary key check (code ~ '^[A-HJ-NP-Z2-9]{10}$'),
  max_uses integer not null check (max_uses >= 1),
  uses integer not null default 0 check (uses >= 0 and uses <= max_uses),
  expires_at timestamptz,
  created_by uuid not null references public.profiles(id) on delete restrict,
  note text check (note is null or char_length(note) <= 200),
  revoked boolean not null default false,
  created_at timestamptz not null default now()
);

alter table public.invite_codes enable row level security;
revoke all on table public.invite_codes from public, anon, authenticated;

create table public.invite_code_attempts (
  id bigint generated always as identity primary key,
  session_key text not null,
  created_at timestamptz not null default now()
);

create index invite_code_attempts_session_created_idx
  on public.invite_code_attempts (session_key, created_at desc);

alter table public.invite_code_attempts enable row level security;
revoke all on table public.invite_code_attempts from public, anon, authenticated;

create or replace function public.record_invite_attempt(p_session text) returns void
language plpgsql security definer set search_path = public as $$
begin
  delete from public.invite_code_attempts
  where session_key = p_session and created_at < now() - interval '1 day';
  if (select count(*) from public.invite_code_attempts
      where session_key = p_session and created_at > now() - interval '1 day') >= 50 then
    raise exception 'Too many attempts. Try again later.';
  end if;
  insert into public.invite_code_attempts (session_key) values (p_session);
end;
$$;

revoke all on function public.record_invite_attempt(text) from public, anon;
grant execute on function public.record_invite_attempt(text) to anon, authenticated;

create or replace function public.get_beta_signup_config() returns jsonb
language sql stable security definer set search_path = public as $$
  select jsonb_build_object(
    'invite_only', coalesce((public.platform_setting_json('beta')->>'invite_only')::boolean, false),
    'signups_open', coalesce((public.platform_setting_json('beta')->>'signups_open')::boolean, true)
      and coalesce((public.platform_setting_json('signups')->>'open')::boolean, true),
    'waitlist_open', coalesce((public.platform_setting_json('beta')->>'waitlist_open')::boolean, false),
    'closed_message', public.platform_setting_json('beta')->>'closed_message'
  );
$$;

revoke all on function public.get_beta_signup_config() from public;
grant execute on function public.get_beta_signup_config() to anon, authenticated;

create or replace function public.redeem_invite_code(p_code text) returns void
language plpgsql security definer set search_path = public as $$
declare
  uid uuid := auth.uid();
  normalized text := upper(btrim(coalesce(p_code, '')));
  row public.invite_codes%rowtype;
  sk text := coalesce(uid::text, 'anon:' || coalesce(current_setting('request.jwt.claim.sub', true), 'unknown'));
begin
  if uid is null then raise exception 'forbidden'; end if;
  perform public.record_invite_attempt(sk);
  if normalized !~ '^[A-HJ-NP-Z2-9]{10}$' then
    raise exception 'That invite code is not valid.';
  end if;
  select * into row from public.invite_codes where code = normalized for update;
  if not found or row.revoked or (row.expires_at is not null and row.expires_at <= now())
     or row.uses >= row.max_uses then
    raise exception 'That invite code is not valid.';
  end if;
  update public.invite_codes set uses = uses + 1 where code = normalized;
  update public.profiles set beta_access_granted = true where id = uid;
end;
$$;

revoke all on function public.redeem_invite_code(text) from public, anon;
grant execute on function public.redeem_invite_code(text) to authenticated;

-- ---------------------------------------------------------------------------
-- Waitlist
-- ---------------------------------------------------------------------------

create table public.beta_waitlist (
  id uuid primary key default gen_random_uuid(),
  email text not null check (email ~ '^[^@]+@[^@]+\.[^@]+$'),
  created_at timestamptz not null default now(),
  unique (email)
);

alter table public.beta_waitlist enable row level security;
revoke all on table public.beta_waitlist from public, anon, authenticated;

create table public.beta_waitlist_attempts (
  id bigint generated always as identity primary key,
  session_key text not null,
  created_at timestamptz not null default now()
);

alter table public.beta_waitlist_attempts enable row level security;
revoke all on table public.beta_waitlist_attempts from public, anon, authenticated;

create or replace function public.join_beta_waitlist(p_email text) returns void
language plpgsql security definer set search_path = public as $$
declare
  em text := lower(btrim(coalesce(p_email, '')));
  sk text := coalesce(auth.uid()::text, 'anon');
begin
  if not coalesce((public.platform_setting_json('beta')->>'waitlist_open')::boolean, false) then
    raise exception 'Waitlist is not open.';
  end if;
  delete from public.beta_waitlist_attempts where session_key = sk and created_at < now() - interval '1 day';
  if (select count(*) from public.beta_waitlist_attempts where session_key = sk and created_at > now() - interval '1 day') >= 10 then
    raise exception 'Too many attempts. Try again later.';
  end if;
  insert into public.beta_waitlist_attempts (session_key) values (sk);
  if em !~ '^[^@]+@[^@]+\.[^@]+$' then raise exception 'Enter a valid email address.'; end if;
  insert into public.beta_waitlist (email) values (em) on conflict (email) do nothing;
end;
$$;

revoke all on function public.join_beta_waitlist(text) from public;
grant execute on function public.join_beta_waitlist(text) to anon, authenticated;

-- ---------------------------------------------------------------------------
-- User consents
-- ---------------------------------------------------------------------------

create table public.user_consents (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  document text not null check (document in ('terms', 'privacy')),
  version text not null check (char_length(version) between 1 and 32),
  accepted_at timestamptz not null default now()
);

create index user_consents_user_doc_idx on public.user_consents (user_id, document, accepted_at desc);
alter table public.user_consents enable row level security;

create policy user_consents_select_own on public.user_consents
  for select to authenticated using (user_id = auth.uid());

revoke all on table public.user_consents from public, anon;
revoke insert, update, delete on table public.user_consents from authenticated;
grant select on table public.user_consents to authenticated;

create or replace function public.record_user_consent(p_document text, p_version text) returns void
language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then raise exception 'forbidden'; end if;
  if p_document not in ('terms', 'privacy') then raise exception 'Invalid document.'; end if;
  if btrim(coalesce(p_version, '')) = '' then raise exception 'Invalid version.'; end if;
  insert into public.user_consents (user_id, document, version)
  values (auth.uid(), p_document, btrim(p_version));
end;
$$;

revoke all on function public.record_user_consent(text, text) from public, anon;
grant execute on function public.record_user_consent(text, text) to authenticated;

create or replace function public.get_my_consents() returns jsonb
language sql stable security definer set search_path = public as $$
  select coalesce(jsonb_agg(jsonb_build_object(
    'document', c.document, 'version', c.version, 'accepted_at', c.accepted_at
  ) order by c.accepted_at desc), '[]'::jsonb)
  from public.user_consents c
  where c.user_id = auth.uid();
$$;

revoke all on function public.get_my_consents() from public, anon;
grant execute on function public.get_my_consents() to authenticated;

-- ---------------------------------------------------------------------------
-- Client errors
-- ---------------------------------------------------------------------------

create table public.client_errors (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete set null,
  message text not null check (char_length(message) between 1 and 500),
  stack text check (stack is null or char_length(stack) <= 4000),
  route text check (route is null or char_length(route) <= 200),
  app_version text check (app_version is null or char_length(app_version) <= 32),
  user_agent_family text check (user_agent_family is null or char_length(user_agent_family) <= 120),
  dismissed boolean not null default false,
  created_at timestamptz not null default now()
);

create index client_errors_created_idx on public.client_errors (created_at desc);
alter table public.client_errors enable row level security;
revoke all on table public.client_errors from public, anon, authenticated;

create table public.client_error_report_attempts (
  id bigint generated always as identity primary key,
  session_key text not null,
  created_at timestamptz not null default now()
);

alter table public.client_error_report_attempts enable row level security;
revoke all on table public.client_error_report_attempts from public, anon, authenticated;

create or replace function public.prune_client_errors() returns void
language sql security definer set search_path = public as $$
  delete from public.client_errors where created_at < now() - interval '30 days';
$$;

create or replace function public.report_client_error(
  p_message text,
  p_stack text default null,
  p_route text default null,
  p_app_version text default null,
  p_user_agent_family text default null
) returns void
language plpgsql security definer set search_path = public as $$
declare
  sk text := coalesce(auth.uid()::text, 'anon');
begin
  perform public.prune_client_errors();
  delete from public.client_error_report_attempts where session_key = sk and created_at < now() - interval '1 day';
  if (select count(*) from public.client_error_report_attempts where session_key = sk and created_at > now() - interval '1 minute') >= 5 then
    return;
  end if;
  if (select count(*) from public.client_error_report_attempts where session_key = sk and created_at > now() - interval '1 day') >= 100 then
    return;
  end if;
  insert into public.client_error_report_attempts (session_key) values (sk);
  insert into public.client_errors (user_id, message, stack, route, app_version, user_agent_family)
  values (auth.uid(), left(btrim(p_message), 500), left(p_stack, 4000), left(p_route, 200), left(p_app_version, 32), left(p_user_agent_family, 120));
end;
$$;

revoke all on function public.report_client_error(text, text, text, text, text) from public, anon;
grant execute on function public.report_client_error(text, text, text, text, text) to authenticated;

create or replace function public.founder_list_client_errors(p_limit integer default 50) returns jsonb
language plpgsql stable security definer set search_path = public as $$
begin
  if not public.is_founder() then raise exception 'forbidden' using errcode = '42501'; end if;
  return (
    select coalesce(jsonb_agg(row_to_json(e)::jsonb order by e.created_at desc), '[]'::jsonb)
    from (
      select id, message, route, app_version, user_agent_family, dismissed, created_at
      from public.client_errors
      order by created_at desc
      limit least(greatest(p_limit, 1), 100)
    ) e
  );
end;
$$;

revoke all on function public.founder_list_client_errors(integer) from public, anon;
grant execute on function public.founder_list_client_errors(integer) to authenticated;

-- ---------------------------------------------------------------------------
-- Health check (anon allowed)
-- ---------------------------------------------------------------------------

create or replace function public.health_check() returns jsonb
language sql stable security definer set search_path = public as $$
  select jsonb_build_object('ok', true, 'server_time', now());
$$;

revoke all on function public.health_check() from public;
grant execute on function public.health_check() to anon, authenticated;

-- ---------------------------------------------------------------------------
-- Founder beta admin (minimal)
-- ---------------------------------------------------------------------------

create or replace function public.founder_set_platform_flag(
  p_key text, p_value jsonb, p_reason text
) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not public.is_founder() then raise exception 'forbidden' using errcode = '42501'; end if;
  insert into public.platform_settings (key, value, updated_at)
  values (p_key, coalesce(p_value, '{}'::jsonb), now())
  on conflict (key) do update set value = excluded.value, updated_at = now();
  perform public.founder_write_audit(
    'dismiss', 'platform_setting', null, null, null,
    left('Set ' || p_key || ': ' || btrim(p_reason), 500)
  );
end;
$$;

revoke all on function public.founder_set_platform_flag(text, jsonb, text) from public, anon;
grant execute on function public.founder_set_platform_flag(text, jsonb, text) to authenticated;

create or replace function public.founder_create_invite_code(
  p_max_uses integer, p_expires_at timestamptz default null, p_note text default null
) returns text
language plpgsql security definer set search_path = public as $$
declare
  chars text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  out text := '';
  i integer;
  uid uuid := auth.uid();
begin
  if not public.is_founder() then raise exception 'forbidden' using errcode = '42501'; end if;
  if p_max_uses is null or p_max_uses < 1 then raise exception 'Invalid max uses.'; end if;
  for i in 1..10 loop
    out := out || substr(chars, 1 + floor(random() * length(chars))::integer, 1);
  end loop;
  insert into public.invite_codes (code, max_uses, expires_at, created_by, note)
  values (out, p_max_uses, p_expires_at, uid, left(p_note, 200));
  perform public.founder_write_audit(
    'dismiss', 'invite_code', null, uid, null,
    left('Created invite ' || out || ' max_uses=' || p_max_uses::text, 500)
  );
  return out;
end;
$$;

revoke all on function public.founder_create_invite_code(integer, timestamptz, text) from public, anon;
grant execute on function public.founder_create_invite_code(integer, timestamptz, text) to authenticated;

-- ---------------------------------------------------------------------------
-- Export and delete account
-- ---------------------------------------------------------------------------

create table public.data_export_attempts (
  id bigint generated always as identity primary key,
  user_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now()
);

alter table public.data_export_attempts enable row level security;
revoke all on table public.data_export_attempts from public, anon, authenticated;

create or replace function public.export_my_data() returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  uid uuid := auth.uid();
  out jsonb;
begin
  if uid is null then raise exception 'forbidden'; end if;
  delete from public.data_export_attempts where user_id = uid and created_at < now() - interval '1 day';
  if (select count(*) from public.data_export_attempts where user_id = uid and created_at > now() - interval '1 day') >= 1 then
    raise exception 'You can download your data once per day.';
  end if;
  insert into public.data_export_attempts (user_id) values (uid);
  select jsonb_build_object(
    'profile', (select row_to_json(p) from public.profiles p where p.id = uid),
    'creations', coalesce((select jsonb_agg(row_to_json(c)) from public.creations c where c.author_id = uid), '[]'::jsonb),
    'comments', coalesce((select jsonb_agg(row_to_json(cm)) from public.comments cm where cm.author_id = uid), '[]'::jsonb),
    'messages_sent', coalesce((
      select jsonb_agg(jsonb_build_object('id', m.id, 'body', m.body, 'conversation_id', m.conversation_id, 'created_at', m.created_at))
      from public.messages m where m.sender_id = uid
    ), '[]'::jsonb),
    'consents', coalesce((select public.get_my_consents()), '[]'::jsonb)
  ) into out;
  return out;
end;
$$;

revoke all on function public.export_my_data() from public, anon;
grant execute on function public.export_my_data() to authenticated;

create or replace function public.delete_my_account() returns void
language plpgsql security definer set search_path = public, auth as $$
declare
  uid uuid := auth.uid();
  em text;
begin
  if uid is null then raise exception 'forbidden'; end if;
  select email into em from auth.users where id = uid;
  if lower(coalesce(em, '')) = public.founder_email() then
    raise exception 'The Founder account cannot be deleted.';
  end if;
  update public.messages set body = null, deleted_at = now() where sender_id = uid and deleted_at is null;
  delete from auth.users where id = uid;
end;
$$;

revoke all on function public.delete_my_account() from public, anon;
grant execute on function public.delete_my_account() to authenticated;
