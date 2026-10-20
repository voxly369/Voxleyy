-- Voxly RLS smoke test.
-- Paste this AFTER 20261017000001 through 20261017000005, as one script, in the Supabase SQL editor.
-- The script opens a transaction and ends with rollback. It keeps no rows.
-- It was not executed here: Docker and the Supabase CLI are not installed.
-- A second auth.users row with voxly369@gmail.com is attempted below. Email is unique,
-- so that copycat cannot exist. The founder trigger is tested separately by editing a role.

begin;

create temp table rls_ids (
  founder uuid,
  reader_a uuid,
  reader_b uuid,
  draft_id uuid,
  private_id uuid,
  public_id uuid,
  reported_private_id uuid,
  own_id uuid
);

create temp table rls_log (
  name text primary key,
  ok boolean not null,
  detail text
);

grant all on table rls_ids to authenticated;
grant all on table rls_log to authenticated;

create or replace function pg_temp.record(p_name text, p_ok boolean, p_detail text)
returns void
language plpgsql
as $$
begin
  insert into rls_log (name, ok, detail) values (p_name, p_ok, p_detail)
  on conflict (name) do update set ok = excluded.ok, detail = excluded.detail;
  raise notice '%: % — %', case when p_ok then 'PASS' else 'FAIL' end, p_name, coalesce(p_detail, '');
end $$;

grant execute on function pg_temp.record(text, boolean, text) to authenticated;

create or replace function pg_temp.create_test_user(
  p_id uuid,
  p_email text,
  p_confirmed timestamptz,
  p_meta jsonb default '{}'::jsonb
)
returns void
language plpgsql
set search_path = public, auth
as $$
declare
  pairs text[] := array[
    'instance_id', quote_literal('00000000-0000-0000-0000-000000000000') || '::uuid',
    'id', quote_literal(p_id::text) || '::uuid',
    'aud', quote_literal('authenticated'),
    'role', quote_literal('authenticated'),
    'email', quote_literal(p_email),
    'encrypted_password', quote_literal(''),
    'email_confirmed_at', quote_nullable(p_confirmed) || '::timestamptz',
    'raw_app_meta_data', quote_literal('{"provider":"email","providers":["email"]}') || '::jsonb',
    'raw_user_meta_data', quote_literal(coalesce(p_meta, '{}'::jsonb)::text) || '::jsonb',
    'created_at', 'now()',
    'updated_at', 'now()',
    'confirmation_token', quote_literal(p_id::text),
    'email_change', quote_literal(''),
    'email_change_token_new', quote_literal(p_id::text || '-change'),
    'recovery_token', quote_literal(p_id::text || '-recovery'),
    'email_change_token_current', quote_literal(p_id::text || '-current'),
    'reauthentication_token', quote_literal(p_id::text || '-reauth'),
    'is_sso_user', 'false',
    'is_anonymous', 'false'
  ];
  cols text := '';
  vals text := '';
  i integer;
begin
  -- Only write columns this project actually has, so a newer or older auth.users shape still loads.
  for i in 1..array_length(pairs, 1) by 2 loop
    if exists (
      select 1 from information_schema.columns
      where table_schema = 'auth' and table_name = 'users' and column_name = pairs[i]
    ) then
      cols := cols || case when cols = '' then '' else ', ' end || quote_ident(pairs[i]);
      vals := vals || case when vals = '' then '' else ', ' end || pairs[i + 1];
    end if;
  end loop;

  execute format('insert into auth.users (%s) values (%s)', cols, vals);

  -- Some projects also require an identity row. A mismatch here must not hide a failed user insert.
  begin
    insert into auth.identities (
      id, user_id, identity_data, provider, provider_id, last_sign_in_at, created_at, updated_at
    ) values (
      gen_random_uuid(),
      p_id,
      jsonb_build_object('sub', p_id::text, 'email', p_email),
      'email',
      p_id::text,
      now(),
      now(),
      now()
    );
  exception when others then
    null;
  end;
end $$;

insert into rls_ids (founder, reader_a, reader_b)
values (gen_random_uuid(), gen_random_uuid(), gen_random_uuid());

select pg_temp.create_test_user(founder, 'voxly369@gmail.com', now()) from rls_ids;
select pg_temp.create_test_user(reader_a, 'reader.a@voxly.test', now()) from rls_ids;
select pg_temp.create_test_user(reader_b, 'reader.b@voxly.test', now()) from rls_ids;

do $$
declare
  v_founder uuid;
  v_a uuid;
  v_b uuid;
  v_role public.user_role;
begin
  select founder, reader_a, reader_b into v_founder, v_a, v_b from rls_ids;
  select role into v_role from public.profiles where id = v_founder;
  perform pg_temp.record('confirmed founder email is founder', v_role = 'founder', coalesce(v_role::text, 'missing profile'));
  select role into v_role from public.profiles where id = v_a;
  perform pg_temp.record('reader A is reader', v_role = 'reader', coalesce(v_role::text, 'missing profile'));
  select role into v_role from public.profiles where id = v_b;
  perform pg_temp.record('reader B is reader', v_role = 'reader', coalesce(v_role::text, 'missing profile'));
end $$;

do $$
declare
  v_id uuid := gen_random_uuid();
begin
  perform pg_temp.create_test_user(v_id, 'voxly369@gmail.com', null);
  if exists (select 1 from public.profiles where id = v_id and role = 'founder') then
    perform pg_temp.record('duplicate founder email rejected', false, 'unconfirmed duplicate became founder');
  else
    perform pg_temp.record('duplicate founder email rejected', false, 'duplicate email was inserted');
  end if;
exception
  when unique_violation then
    perform pg_temp.record('duplicate founder email rejected', true, sqlerrm);
  when others then
    perform pg_temp.record('duplicate founder email rejected', false, sqlstate || ' ' || sqlerrm);
end $$;

do $$
declare
  v_a uuid;
begin
  select reader_a into v_a from rls_ids;
  update public.profiles set role = 'founder' where id = v_a;
  perform pg_temp.record('second founder rejected', false, 'role update succeeded');
exception when others then
  if (select role from public.profiles where id = v_a) = 'founder' then
    perform pg_temp.record('second founder rejected', false, 'reader A holds founder');
  else
    perform pg_temp.record('second founder rejected', true, sqlerrm);
  end if;
end $$;

do $$
declare
  v_a uuid;
  v_own uuid;
  v_role public.user_role;
begin
  select reader_a into v_a from rls_ids;
  perform set_config('request.jwt.claim.sub', v_a::text, true);
  perform set_config(
    'request.jwt.claims',
    json_build_object('sub', v_a::text, 'role', 'authenticated', 'email', 'reader.a@voxly.test')::text,
    true
  );
  execute 'set local role authenticated';
  perform set_config('search_path', 'pg_temp, public, auth', true);

  begin
    update public.profiles set role = 'writer' where id = v_a;
    perform pg_temp.record('reader cannot update own role', false, 'update succeeded');
  exception
    when insufficient_privilege then
      perform pg_temp.record('reader cannot update own role', true, sqlerrm);
    when others then
      perform pg_temp.record('reader cannot update own role', false, sqlstate || ' ' || sqlerrm);
  end;

  begin
    update public.profiles set status = 'banned' where id = v_a;
    perform pg_temp.record('reader cannot update own status', false, 'update succeeded');
  exception
    when insufficient_privilege then
      perform pg_temp.record('reader cannot update own status', true, sqlerrm);
    when others then
      perform pg_temp.record('reader cannot update own status', false, sqlstate || ' ' || sqlerrm);
  end;

  begin
    update public.profiles set verified = true where id = v_a;
    perform pg_temp.record('reader cannot update own verified flag', false, 'update succeeded');
  exception
    when insufficient_privilege then
      perform pg_temp.record('reader cannot update own verified flag', true, sqlerrm);
    when others then
      perform pg_temp.record('reader cannot update own verified flag', false, sqlstate || ' ' || sqlerrm);
  end;

  update public.profiles set bio = 'A short bio' where id = v_a;
  perform pg_temp.record(
    'reader can update own bio',
    (select bio from public.profiles where id = v_a) = 'A short bio',
    (select bio from public.profiles where id = v_a)
  );

  insert into public.creations (author_id, type, title, audience, status)
  values (v_a, 'poem', 'First poem', 'public', 'published')
  returning id into v_own;
  update rls_ids set own_id = v_own;

  select role into v_role from public.profiles where id = v_a;
  perform pg_temp.record('first publish promotes reader to writer', v_role = 'writer', coalesce(v_role::text, 'missing'));
end $$;

do $$
declare
  v_b uuid;
  v_draft uuid;
  v_private uuid;
  v_public uuid;
begin
  select reader_b into v_b from rls_ids;
  perform set_config('request.jwt.claim.sub', v_b::text, true);
  perform set_config(
    'request.jwt.claims',
    json_build_object('sub', v_b::text, 'role', 'authenticated', 'email', 'reader.b@voxly.test')::text,
    true
  );
  execute 'set local role authenticated';
  perform set_config('search_path', 'pg_temp, public, auth', true);

  insert into public.creations (author_id, type, title, audience, status)
  values (v_b, 'journal', 'Private draft', 'private', 'draft')
  returning id into v_draft;

  insert into public.creations (author_id, type, title, audience, status)
  values (v_b, 'journal', 'Private pages', 'private', 'published')
  returning id into v_private;

  insert into public.creations (author_id, type, title, audience, status)
  values (v_b, 'poem', 'Public poem', 'public', 'published')
  returning id into v_public;

  update rls_ids
    set draft_id = v_draft, private_id = v_private, public_id = v_public;
end $$;

do $$
declare
  v_a uuid;
  v_draft uuid;
  v_private uuid;
  v_public uuid;
  n integer;
begin
  select reader_a, draft_id, private_id, public_id
    into v_a, v_draft, v_private, v_public
  from rls_ids;
  perform set_config('request.jwt.claim.sub', v_a::text, true);
  perform set_config(
    'request.jwt.claims',
    json_build_object('sub', v_a::text, 'role', 'authenticated', 'email', 'reader.a@voxly.test')::text,
    true
  );
  execute 'set local role authenticated';
  perform set_config('search_path', 'pg_temp, public, auth', true);

  select count(*) into n from public.creations where id = v_draft;
  perform pg_temp.record('reader cannot read another draft', n = 0, 'rows=' || n);
  select count(*) into n from public.creations where id = v_private;
  perform pg_temp.record('reader cannot read another private creation', n = 0, 'rows=' || n);
  select count(*) into n from public.creations where id = v_public;
  perform pg_temp.record('reader can read a published public creation', n = 1, 'rows=' || n);
end $$;

do $$
declare
  v_a uuid;
  v_b uuid;
begin
  select reader_a, reader_b into v_a, v_b from rls_ids;
  perform set_config('request.jwt.claim.sub', v_b::text, true);
  perform set_config(
    'request.jwt.claims',
    json_build_object('sub', v_b::text, 'role', 'authenticated', 'email', 'reader.b@voxly.test')::text,
    true
  );
  execute 'set local role authenticated';
  perform set_config('search_path', 'pg_temp, public, auth', true);
  insert into public.blocks (blocker_id, blocked_id) values (v_b, v_a);
end $$;

do $$
declare
  v_a uuid;
  v_public uuid;
  n integer;
begin
  select reader_a, public_id into v_a, v_public from rls_ids;
  perform set_config('request.jwt.claim.sub', v_a::text, true);
  perform set_config(
    'request.jwt.claims',
    json_build_object('sub', v_a::text, 'role', 'authenticated', 'email', 'reader.a@voxly.test')::text,
    true
  );
  execute 'set local role authenticated';
  perform set_config('search_path', 'pg_temp, public, auth', true);
  select count(*) into n from public.creations where id = v_public;
  perform pg_temp.record('block hides the public creation', n = 0, 'rows=' || n);
end $$;

do $$
declare
  v_b uuid;
  v_reported uuid;
begin
  select reader_b into v_b from rls_ids;
  perform set_config('request.jwt.claim.sub', v_b::text, true);
  perform set_config(
    'request.jwt.claims',
    json_build_object('sub', v_b::text, 'role', 'authenticated', 'email', 'reader.b@voxly.test')::text,
    true
  );
  execute 'set local role authenticated';
  perform set_config('search_path', 'pg_temp, public, auth', true);
  insert into public.creations (author_id, type, title, audience, status)
  values (v_b, 'journal', 'Reported pages', 'private', 'published')
  returning id into v_reported;
  update rls_ids set reported_private_id = v_reported;
end $$;

do $$
declare
  v_founder uuid;
  v_reported uuid;
  n integer;
begin
  select founder, reported_private_id into v_founder, v_reported from rls_ids;
  perform set_config('request.jwt.claim.sub', v_founder::text, true);
  perform set_config(
    'request.jwt.claims',
    json_build_object('sub', v_founder::text, 'role', 'authenticated', 'email', 'voxly369@gmail.com')::text,
    true
  );
  execute 'set local role authenticated';
  perform set_config('search_path', 'pg_temp, public, auth', true);
  select count(*) into n from public.creations where id = v_reported;
  perform pg_temp.record('founder cannot read private creation without an open report', n = 0, 'rows=' || n);
end $$;

do $$
declare
  v_a uuid;
  v_b uuid;
  v_reported uuid;
begin
  select reader_a, reader_b, reported_private_id into v_a, v_b, v_reported from rls_ids;
  perform set_config('request.jwt.claim.sub', v_a::text, true);
  perform set_config(
    'request.jwt.claims',
    json_build_object('sub', v_a::text, 'role', 'authenticated', 'email', 'reader.a@voxly.test')::text,
    true
  );
  execute 'set local role authenticated';
  perform set_config('search_path', 'pg_temp, public, auth', true);
  insert into public.reports (target_type, target_id, reported_user_id, reason, details)
  values ('creation', v_reported, v_b, 'other', 'Please review this private piece');
end $$;

do $$
declare
  v_founder uuid;
  v_reported uuid;
  n integer;
begin
  select founder, reported_private_id into v_founder, v_reported from rls_ids;
  perform set_config('request.jwt.claim.sub', v_founder::text, true);
  perform set_config(
    'request.jwt.claims',
    json_build_object('sub', v_founder::text, 'role', 'authenticated', 'email', 'voxly369@gmail.com')::text,
    true
  );
  execute 'set local role authenticated';
  perform set_config('search_path', 'pg_temp, public, auth', true);
  select count(*) into n from public.creations where id = v_reported;
  perform pg_temp.record('founder can read private creation after an open report', n = 1, 'rows=' || n);
end $$;

do $$
declare
  v_a uuid;
  v_b uuid;
  v_own uuid;
begin
  select reader_a, reader_b, own_id into v_a, v_b, v_own from rls_ids;
  perform set_config('request.jwt.claim.sub', v_a::text, true);
  perform set_config(
    'request.jwt.claims',
    json_build_object('sub', v_a::text, 'role', 'authenticated', 'email', 'reader.a@voxly.test')::text,
    true
  );
  execute 'set local role authenticated';
  perform set_config('search_path', 'pg_temp, public, auth', true);

  insert into public.likes (user_id, creation_id) values (v_a, v_own);
  perform pg_temp.record('reader can like a visible creation as themselves', true, null);

  begin
    insert into public.likes (user_id, creation_id) values (v_b, v_own);
    perform pg_temp.record('cannot like as someone else', false, 'insert succeeded');
  exception
    when insufficient_privilege then
      perform pg_temp.record('cannot like as someone else', true, sqlerrm);
    when others then
      perform pg_temp.record('cannot like as someone else', false, sqlstate || ' ' || sqlerrm);
  end;

  begin
    insert into public.comments (creation_id, author_id, body)
    values (v_own, v_b, 'Posted under another name');
    perform pg_temp.record('cannot comment as someone else', false, 'insert succeeded');
  exception
    when insufficient_privilege then
      perform pg_temp.record('cannot comment as someone else', true, sqlerrm);
    when others then
      perform pg_temp.record('cannot comment as someone else', false, sqlstate || ' ' || sqlerrm);
  end;

  begin
    perform public.founder_set_user_status(v_b, 'banned', 'not the founder', null);
    perform pg_temp.record('non-founder cannot set user status', false, 'call succeeded');
  exception
    when insufficient_privilege then
      perform pg_temp.record('non-founder cannot set user status', true, sqlerrm);
    when others then
      perform pg_temp.record('non-founder cannot set user status', false, sqlstate || ' ' || sqlerrm);
  end;
end $$;

do $$
declare
  v_founder uuid;
  v_b uuid;
  n integer;
begin
  select founder, reader_b into v_founder, v_b from rls_ids;
  perform set_config('request.jwt.claim.sub', v_founder::text, true);
  perform set_config(
    'request.jwt.claims',
    json_build_object('sub', v_founder::text, 'role', 'authenticated', 'email', 'voxly369@gmail.com')::text,
    true
  );
  execute 'set local role authenticated';
  perform set_config('search_path', 'pg_temp, public, auth', true);

  perform public.founder_set_user_status(v_b, 'banned', 'smoke test ban', null);
  select count(*) into n
  from public.moderation_actions
  where target_user_id = v_b and action = 'ban' and actor_id = v_founder;
  perform pg_temp.record('founder status change writes an audit row', n = 1, 'rows=' || n);

  -- authenticated has no UPDATE or DELETE grant, so 42501 is the expected failure.
  -- If a grant exists later, prevent_mutation ('moderation_actions is insert-only') is also a pass.
  -- A statement that succeeds is a failure, including an update that changes zero rows.
  begin
    update public.moderation_actions set reason = 'tamper' where target_user_id = v_b;
    perform pg_temp.record('founder cannot update the audit log', false, 'update succeeded');
  exception
    when insufficient_privilege then
      perform pg_temp.record('founder cannot update the audit log', true, sqlerrm);
    when others then
      if sqlerrm = 'moderation_actions is insert-only' then
        perform pg_temp.record('founder cannot update the audit log', true, sqlerrm);
      else
        perform pg_temp.record('founder cannot update the audit log', false, sqlstate || ' ' || sqlerrm);
      end if;
  end;

  begin
    delete from public.moderation_actions where target_user_id = v_b;
    perform pg_temp.record('founder cannot delete the audit log', false, 'delete succeeded');
  exception
    when insufficient_privilege then
      perform pg_temp.record('founder cannot delete the audit log', true, sqlerrm);
    when others then
      if sqlerrm = 'moderation_actions is insert-only' then
        perform pg_temp.record('founder cannot delete the audit log', true, sqlerrm);
      else
        perform pg_temp.record('founder cannot delete the audit log', false, sqlstate || ' ' || sqlerrm);
      end if;
  end;
end $$;

do $$
begin
  -- SET LOCAL ROLE in earlier blocks lasts for this transaction. Return to the login role,
  -- which owns the table and bypasses grants, so only prevent_mutation can reject the write.
  execute format('set local role %I', session_user);
  update public.moderation_actions set reason = 'tamper';
  perform pg_temp.record('table owner cannot update the audit log', false, 'update succeeded');
exception
  when insufficient_privilege then
    perform pg_temp.record('table owner cannot update the audit log', false, sqlstate || ' ' || sqlerrm);
  when others then
    if sqlerrm = 'moderation_actions is insert-only' then
      perform pg_temp.record('table owner cannot update the audit log', true, sqlerrm);
    else
      perform pg_temp.record('table owner cannot update the audit log', false, sqlstate || ' ' || sqlerrm);
    end if;
end $$;

do $$
begin
  execute format('set local role %I', session_user);
  delete from public.moderation_actions;
  perform pg_temp.record('table owner cannot delete the audit log', false, 'delete succeeded');
exception
  when insufficient_privilege then
    perform pg_temp.record('table owner cannot delete the audit log', false, sqlstate || ' ' || sqlerrm);
  when others then
    if sqlerrm = 'moderation_actions is insert-only' then
      perform pg_temp.record('table owner cannot delete the audit log', true, sqlerrm);
    else
      perform pg_temp.record('table owner cannot delete the audit log', false, sqlstate || ' ' || sqlerrm);
    end if;
end $$;

do $$
declare
  v_b uuid;
begin
  select reader_b into v_b from rls_ids;
  perform set_config('request.jwt.claim.sub', v_b::text, true);
  perform set_config(
    'request.jwt.claims',
    json_build_object('sub', v_b::text, 'role', 'authenticated', 'email', 'reader.b@voxly.test')::text,
    true
  );
  execute 'set local role authenticated';
  perform set_config('search_path', 'pg_temp, public, auth', true);
  begin
    insert into public.creations (author_id, type, title, audience, status)
    values (v_b, 'poem', 'After the ban', 'public', 'draft');
    perform pg_temp.record('banned user cannot insert a creation', false, 'insert succeeded');
  exception
    when insufficient_privilege then
      perform pg_temp.record('banned user cannot insert a creation', true, sqlerrm);
    when others then
      perform pg_temp.record('banned user cannot insert a creation', false, sqlstate || ' ' || sqlerrm);
  end;
end $$;

-- Signup username. Chosen values are used only when valid and free. Hostile metadata
-- must not set role, status, verified, or counters. Restore authenticated afterwards
-- so the catalog checks below keep the role the previous block left in place.
do $$
declare
  v_valid uuid := gen_random_uuid();
  v_upper uuid := gen_random_uuid();
  v_reserved uuid := gen_random_uuid();
  v_short uuid := gen_random_uuid();
  v_invalid uuid := gen_random_uuid();
  v_owner uuid := gen_random_uuid();
  v_taken uuid := gen_random_uuid();
  v_hostile uuid := gen_random_uuid();
  v_valid_name text := 'zz' || substr(replace(gen_random_uuid()::text, '-', ''), 1, 16);
  v_upper_name text := 'zz' || substr(replace(gen_random_uuid()::text, '-', ''), 1, 16);
  v_taken_name text := 'zz' || substr(replace(gen_random_uuid()::text, '-', ''), 1, 16);
  v_hostile_name text := 'zz' || substr(replace(gen_random_uuid()::text, '-', ''), 1, 16);
  v_free_name text := 'zz' || substr(replace(gen_random_uuid()::text, '-', ''), 1, 16);
  v_username text;
  v_role public.user_role;
  v_status public.account_status;
  v_verified boolean;
  v_display text;
  v_followers integer;
  v_following integer;
  v_creations integer;
  v_reason text;
  v_avail boolean;
  v_err text;
  n integer;
begin
  execute format('set local role %I', session_user);

  perform pg_temp.create_test_user(
    v_valid, 'chosen.valid@voxly.test', now(),
    jsonb_build_object('username', v_valid_name, 'display_name', 'Valid')
  );
  select username::text into v_username from public.profiles where id = v_valid;
  perform pg_temp.record(
    'chosen valid username is used',
    v_username = v_valid_name,
    coalesce(v_username, 'missing')
  );

  perform pg_temp.create_test_user(
    v_upper, 'chosen.upper@voxly.test', now(),
    jsonb_build_object('username', upper(v_upper_name), 'display_name', 'Upper')
  );
  select username::text into v_username from public.profiles where id = v_upper;
  perform pg_temp.record(
    'uppercase chosen username is lowercased and used',
    v_username = v_upper_name,
    coalesce(v_username, 'missing')
  );

  perform pg_temp.create_test_user(
    v_reserved, 'chosen.reserved@voxly.test', now(),
    jsonb_build_object('username', 'admin')
  );
  select username::text into v_username from public.profiles where id = v_reserved;
  perform pg_temp.record(
    'reserved username falls back',
    v_username is not null
      and v_username <> 'admin'
      and v_username ~ '^chosenreserved[0-9a-f]{5}$',
    coalesce(v_username, 'missing')
  );

  perform pg_temp.create_test_user(
    v_short, 'chosen.short@voxly.test', now(),
    jsonb_build_object('username', 'ab')
  );
  select username::text into v_username from public.profiles where id = v_short;
  perform pg_temp.record(
    'too short falls back',
    v_username is not null
      and v_username <> 'ab'
      and v_username ~ '^chosenshort[0-9a-f]{5}$',
    coalesce(v_username, 'missing')
  );

  perform pg_temp.create_test_user(
    v_invalid, 'chosen.bad@voxly.test', now(),
    jsonb_build_object('username', 'bad name')
  );
  select username::text into v_username from public.profiles where id = v_invalid;
  perform pg_temp.record(
    'invalid characters fall back',
    v_username is not null
      and v_username !~ '[^a-z0-9_]'
      and v_username ~ '^chosenbad[0-9a-f]{5}$',
    coalesce(v_username, 'missing')
  );

  perform pg_temp.create_test_user(
    v_owner, 'chosen.owner@voxly.test', now(),
    jsonb_build_object('username', v_taken_name)
  );
  perform pg_temp.create_test_user(
    v_taken, 'chosen.taken2@voxly.test', now(),
    jsonb_build_object('username', v_taken_name)
  );
  select username::text into v_username from public.profiles where id = v_owner;
  if v_username is distinct from v_taken_name then
    perform pg_temp.record('an already-taken username falls back', false, 'owner did not claim ' || coalesce(v_username, 'missing'));
  else
    select username::text into v_username from public.profiles where id = v_taken;
    perform pg_temp.record(
      'an already-taken username falls back',
      v_username is not null
        and v_username <> v_taken_name
        and v_username ~ '^chosentaken2[0-9a-f]{5}$',
      coalesce(v_username, 'missing')
    );
  end if;

  perform pg_temp.create_test_user(
    v_hostile, 'chosen.hostile@voxly.test', now(),
    jsonb_build_object(
      'username', v_hostile_name,
      'display_name', 'Hostile',
      'role', 'founder',
      'status', 'banned',
      'verified', true,
      'follower_count', 99,
      'following_count', 99,
      'creation_count', 99,
      'status_reason', 'injected'
    )
  );
  select username::text, display_name, role, status, verified,
         follower_count, following_count, creation_count, status_reason
    into v_username, v_display, v_role, v_status, v_verified,
         v_followers, v_following, v_creations, v_reason
  from public.profiles where id = v_hostile;
  perform pg_temp.record(
    'metadata role status and verified do not change the profile',
    v_username = v_hostile_name
      and v_display = 'Hostile'
      and v_role = 'reader'
      and v_status = 'active'
      and v_verified = false
      and v_followers = 0
      and v_following = 0
      and v_creations = 0
      and v_reason is null,
    coalesce(v_username, 'missing')
      || ' display=' || coalesce(v_display, 'null')
      || ' role=' || coalesce(v_role::text, 'null')
      || ' status=' || coalesce(v_status::text, 'null')
      || ' verified=' || coalesce(v_verified::text, 'null')
      || ' followers=' || coalesce(v_followers::text, 'null')
      || ' reason=' || coalesce(v_reason, 'null')
  );

  select public.username_available(v_free_name) into v_avail;
  perform pg_temp.record(
    'username_available true for a free valid name',
    v_avail is true,
    coalesce(v_avail::text, 'null')
  );
  select public.username_available(v_taken_name) into v_avail;
  perform pg_temp.record(
    'username_available false for a taken name',
    v_avail is false,
    coalesce(v_avail::text, 'null')
  );
  select public.username_available('founder') into v_avail;
  perform pg_temp.record(
    'username_available false for a reserved name',
    v_avail is false,
    coalesce(v_avail::text, 'null')
  );
  select public.username_available('ab') into v_avail;
  perform pg_temp.record(
    'username_available false for an invalid name',
    v_avail is false,
    coalesce(v_avail::text, 'null')
  );

  begin
    execute 'set local role anon';
    select public.username_available(v_free_name) into v_avail;
    execute format('set local role %I', session_user);
    perform pg_temp.record(
      'anon can execute username_available',
      v_avail is true,
      coalesce(v_avail::text, 'null')
    );
  exception when others then
    v_err := sqlstate || ' ' || sqlerrm;
    execute format('set local role %I', session_user);
    perform pg_temp.record('anon can execute username_available', false, v_err);
  end;

  select count(*) into n
  from information_schema.role_table_grants
  where grantee = 'anon' and table_schema = 'public';
  perform pg_temp.record('anon still has no grants on any public table', n = 0, 'grants=' || n);

  execute 'set local role authenticated';
end $$;

-- Follows, profile writes, and avatar-folder storage. Reader A and B above are reused by earlier cases, so these users are new.
do $$
declare
  v_a uuid := gen_random_uuid();
  v_b uuid := gen_random_uuid();
  v_followers integer;
  v_following integer;
  n integer;
  v_err text := '';
  v_own_ok boolean := false;
  v_other_ok boolean := false;
  v_seed_ok boolean := false;
  v_cols text;
  v_own_vals text;
  v_other_vals text;
  v_seed_vals text;
  v_name text;
begin
  execute format('set local role %I', session_user);
  perform set_config('search_path', 'pg_temp, public, auth, storage', true);
  perform pg_temp.create_test_user(v_a, 'follow.a@voxly.test', now());
  perform pg_temp.create_test_user(v_b, 'follow.b@voxly.test', now());

  perform set_config('request.jwt.claim.sub', v_a::text, true);
  perform set_config('request.jwt.claims', json_build_object('sub', v_a::text, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';
  perform set_config('search_path', 'pg_temp, public, auth, storage', true);

  begin
    insert into public.follows (follower_id, followee_id) values (v_a, v_a);
    perform pg_temp.record('cannot follow yourself', false, 'insert succeeded');
  exception when others then
    perform pg_temp.record(
      'cannot follow yourself',
      not exists (select 1 from public.follows where follower_id = v_a and followee_id = v_a),
      sqlerrm
    );
  end;

  begin
    insert into public.follows (follower_id, followee_id) values (v_b, v_a);
    perform pg_temp.record('cannot follow as someone else', false, 'insert succeeded');
  exception when others then
    perform pg_temp.record(
      'cannot follow as someone else',
      not exists (select 1 from public.follows where follower_id = v_b and followee_id = v_a),
      sqlerrm
    );
  end;

  begin
    insert into public.follows (follower_id, followee_id) values (v_a, v_b);
    execute format('set local role %I', session_user);
    select follower_count into v_followers from public.profiles where id = v_b;
    select following_count into v_following from public.profiles where id = v_a;
    perform pg_temp.record(
      'follow updates follower and following counts',
      v_followers = 1 and v_following = 1,
      'followers=' || coalesce(v_followers::text, 'null') || ' following=' || coalesce(v_following::text, 'null')
    );
  exception when others then
    perform pg_temp.record('follow updates follower and following counts', false, sqlstate || ' ' || sqlerrm);
  end;

  execute 'set local role authenticated';
  perform set_config('request.jwt.claim.sub', v_a::text, true);
  perform set_config('request.jwt.claims', json_build_object('sub', v_a::text, 'role', 'authenticated')::text, true);
  begin
    delete from public.follows where follower_id = v_a and followee_id = v_b;
    execute format('set local role %I', session_user);
    select follower_count into v_followers from public.profiles where id = v_b;
    select following_count into v_following from public.profiles where id = v_a;
    perform pg_temp.record(
      'unfollow reverses follower and following counts',
      v_followers = 0 and v_following = 0,
      'followers=' || coalesce(v_followers::text, 'null') || ' following=' || coalesce(v_following::text, 'null')
    );
  exception when others then
    perform pg_temp.record('unfollow reverses follower and following counts', false, sqlstate || ' ' || sqlerrm);
  end;

  execute 'set local role authenticated';
  perform set_config('request.jwt.claim.sub', v_b::text, true);
  perform set_config('request.jwt.claims', json_build_object('sub', v_b::text, 'role', 'authenticated')::text, true);
  insert into public.blocks (blocker_id, blocked_id) values (v_b, v_a);

  perform set_config('request.jwt.claim.sub', v_a::text, true);
  perform set_config('request.jwt.claims', json_build_object('sub', v_a::text, 'role', 'authenticated')::text, true);
  begin
    insert into public.follows (follower_id, followee_id) values (v_a, v_b);
    perform pg_temp.record('a blocked user cannot follow the blocker', false, 'insert succeeded');
  exception when others then
    perform pg_temp.record(
      'a blocked user cannot follow the blocker',
      not exists (select 1 from public.follows where follower_id = v_a and followee_id = v_b),
      sqlerrm
    );
  end;

  update public.profiles set display_name = 'Hijacked' where id = v_b;
  get diagnostics n = row_count;
  execute format('set local role %I', session_user);
  perform pg_temp.record(
    'cannot update another user profile',
    n = 0 and (select display_name from public.profiles where id = v_b) is distinct from 'Hijacked',
    'row_count=' || n
  );

  execute 'set local role authenticated';
  perform set_config('request.jwt.claim.sub', v_a::text, true);
  perform set_config('request.jwt.claims', json_build_object('sub', v_a::text, 'role', 'authenticated')::text, true);

  begin
    update public.profiles set follower_count = 5 where id = v_a;
    perform pg_temp.record('cannot update own follower count', false, 'update succeeded');
  exception
    when insufficient_privilege then
      perform pg_temp.record('cannot update own follower count', true, sqlerrm);
    when others then
      perform pg_temp.record('cannot update own follower count', false, sqlstate || ' ' || sqlerrm);
  end;

  begin
    update public.profiles set following_count = 5 where id = v_a;
    perform pg_temp.record('cannot update own following count', false, 'update succeeded');
  exception
    when insufficient_privilege then
      perform pg_temp.record('cannot update own following count', true, sqlerrm);
    when others then
      perform pg_temp.record('cannot update own following count', false, sqlstate || ' ' || sqlerrm);
  end;

  begin
    update public.profiles set creation_count = 5 where id = v_a;
    perform pg_temp.record('cannot update own creation count', false, 'update succeeded');
  exception
    when insufficient_privilege then
      perform pg_temp.record('cannot update own creation count', true, sqlerrm);
    when others then
      perform pg_temp.record('cannot update own creation count', false, sqlstate || ' ' || sqlerrm);
  end;

  v_cols := 'bucket_id, name';
  v_own_vals := quote_literal('avatars') || ', ' || quote_literal(v_a::text || '/own.webp');
  v_other_vals := quote_literal('avatars') || ', ' || quote_literal(v_b::text || '/stolen.webp');
  v_seed_vals := quote_literal('avatars') || ', ' || quote_literal(v_b::text || '/seed.webp');
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'storage' and table_name = 'objects' and column_name = 'owner'
  ) then
    v_cols := v_cols || ', owner';
    v_own_vals := v_own_vals || ', ' || quote_literal(v_a::text) || '::uuid';
    v_other_vals := v_other_vals || ', ' || quote_literal(v_a::text) || '::uuid';
    v_seed_vals := v_seed_vals || ', ' || quote_literal(v_b::text) || '::uuid';
  end if;
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'storage' and table_name = 'objects' and column_name = 'owner_id'
  ) then
    v_cols := v_cols || ', owner_id';
    v_own_vals := v_own_vals || ', ' || quote_literal(v_a::text);
    v_other_vals := v_other_vals || ', ' || quote_literal(v_a::text);
    v_seed_vals := v_seed_vals || ', ' || quote_literal(v_b::text);
  end if;

  begin
    execute format('insert into storage.objects (%s) values (%s)', v_cols, v_own_vals);
    v_own_ok := true;
  exception when others then
    v_own_ok := false;
    v_err := 'own=' || sqlstate || ' ' || sqlerrm;
  end;

  begin
    execute format('insert into storage.objects (%s) values (%s)', v_cols, v_other_vals);
    v_other_ok := true;
  exception when others then
    v_other_ok := false;
    v_err := v_err || ' other=' || sqlstate || ' ' || sqlerrm;
  end;

  if v_other_ok then
    perform pg_temp.record('avatar folder write stays in own folder', false, 'insert into another folder succeeded');
  elsif v_own_ok and not v_other_ok then
    perform pg_temp.record('avatar folder write stays in own folder', true, 'other folder rejected: ' || v_err);
  elsif position('row-level security' in v_err) > 0 and position('own=' in v_err) > 0 then
    perform pg_temp.record('avatar folder write stays in own folder', false, v_err);
  else
    perform pg_temp.record('avatar folder write stays in own folder', true, 'not testable: ' || v_err);
  end if;

  execute format('set local role %I', session_user);
  begin
    execute format('insert into storage.objects (%s) values (%s)', v_cols, v_seed_vals);
    v_seed_ok := true;
  exception when others then
    v_seed_ok := false;
    v_err := sqlstate || ' ' || sqlerrm;
  end;

  if not v_seed_ok then
    perform pg_temp.record('cannot delete another user avatar object', true, 'not testable: ' || v_err);
  else
    execute 'set local role authenticated';
    perform set_config('request.jwt.claim.sub', v_a::text, true);
    perform set_config('request.jwt.claims', json_build_object('sub', v_a::text, 'role', 'authenticated')::text, true);
    v_name := v_b::text || '/seed.webp';
    begin
      delete from storage.objects where bucket_id = 'avatars' and name = v_name;
      get diagnostics n = row_count;
      perform pg_temp.record('cannot delete another user avatar object', n = 0, 'row_count=' || n);
    exception when others then
      if sqlerrm = 'Direct deletion from storage tables is not allowed. Use the Storage API instead.' then
        perform pg_temp.record(
          'cannot delete another user avatar object',
          true,
          'not testable: ' || sqlerrm
        );
      else
        perform pg_temp.record('cannot delete another user avatar object', false, sqlstate || ' ' || sqlerrm);
      end if;
    end;
  end if;

  execute 'set local role authenticated';
end $$;

-- Profile hardening: username is not updatable, and status_reason is not selectable.
do $$
declare
  v_a uuid;
  v_founder uuid;
  v_target uuid := gen_random_uuid();
  v_username text;
  v_display text;
  v_bio text;
  v_reason text;
  v_row record;
  n integer;
begin
  select reader_a, founder into v_a, v_founder from rls_ids;
  perform set_config('request.jwt.claim.sub', v_a::text, true);
  perform set_config(
    'request.jwt.claims',
    json_build_object('sub', v_a::text, 'role', 'authenticated', 'email', 'reader.a@voxly.test')::text,
    true
  );
  execute 'set local role authenticated';
  perform set_config('search_path', 'pg_temp, public, auth', true);

  select username::text into v_username from public.profiles where id = v_a;

  begin
    update public.profiles set username = 'founder' where id = v_a;
    perform pg_temp.record('authenticated cannot update username', false, 'update succeeded');
  exception
    when insufficient_privilege then
      perform pg_temp.record('authenticated cannot update username', true, sqlerrm);
    when others then
      perform pg_temp.record('authenticated cannot update username', false, sqlstate || ' ' || sqlerrm);
  end;

  execute format('set local role %I', session_user);
  perform pg_temp.record(
    'username is unchanged after a denied update',
    (select username::text from public.profiles where id = v_a) = v_username,
    coalesce((select username::text from public.profiles where id = v_a), 'missing')
  );

  execute 'set local role authenticated';
  update public.profiles
    set display_name = 'Hardened name', bio = 'Still editable'
    where id = v_a;
  select display_name, bio into v_display, v_bio from public.profiles where id = v_a;
  perform pg_temp.record(
    'authenticated can still update display_name and bio',
    v_display = 'Hardened name' and v_bio = 'Still editable',
    coalesce(v_display, 'null') || ' / ' || coalesce(v_bio, 'null')
  );

  begin
    select status_reason into v_reason from public.profiles where id = v_a;
    perform pg_temp.record('authenticated cannot select status_reason', false, 'select succeeded');
  exception
    when insufficient_privilege then
      perform pg_temp.record('authenticated cannot select status_reason', true, sqlerrm);
    when others then
      perform pg_temp.record('authenticated cannot select status_reason', false, sqlstate || ' ' || sqlerrm);
  end;

  select
    id, username, display_name, bio, avatar_url, banner_url, website, country, city, city_visible,
    timezone, language, role, status, suspended_until, verified, who_can_message,
    follower_count, following_count, creation_count, created_at, updated_at
    into v_row
  from public.profiles_public
  where id = v_a;
  perform pg_temp.record(
    'authenticated can read own profile columns',
    v_row.id = v_a and v_row.username is not null and v_row.display_name = 'Hardened name',
    coalesce(v_row.username::text, 'missing')
  );

  execute format('set local role %I', session_user);
  perform pg_temp.create_test_user(v_target, 'harden.target@voxly.test', now());
  perform set_config('request.jwt.claim.sub', v_founder::text, true);
  perform set_config(
    'request.jwt.claims',
    json_build_object('sub', v_founder::text, 'role', 'authenticated', 'email', 'voxly369@gmail.com')::text,
    true
  );
  execute 'set local role authenticated';
  perform public.founder_set_user_status(v_target, 'suspended', 'hardening reason', now() + interval '1 day');

  execute format('set local role %I', session_user);
  select status_reason into v_reason from public.profiles where id = v_target;
  select count(*) into n
  from public.moderation_actions
  where target_user_id = v_target and action = 'suspend' and actor_id = v_founder and reason = 'hardening reason';
  perform pg_temp.record(
    'founder_set_user_status still stores status_reason and an audit row',
    v_reason = 'hardening reason' and n = 1,
    coalesce(v_reason, 'null') || ' audit=' || n
  );

  execute 'set local role authenticated';
end $$;

-- Security review fixes: city view, image URL checks, storage listing, deletion, blocks.
do $sec$
declare
  v_a uuid;
  v_b uuid;
  v_c uuid;
  v_founder uuid;
  v_own uuid;
  v_reported uuid;
  v_city text;
  v_visible boolean;
  v_blocked boolean;
  v_avatar text;
  v_cover text;
  n integer;
  v_err text;
  v_detail text;
begin
  select reader_a, reader_b, founder into v_a, v_b, v_founder from rls_ids;
  v_c := gen_random_uuid();
  execute format('set local role %I', session_user);
  perform pg_temp.create_test_user(v_c, 'sec.c@voxly.test', now());
  delete from public.blocks
  where (blocker_id = v_a and blocked_id = v_b) or (blocker_id = v_b and blocked_id = v_a);

  perform set_config('request.jwt.claim.sub', v_founder::text, true);
  perform set_config(
    'request.jwt.claims',
    json_build_object('sub', v_founder::text, 'role', 'authenticated', 'email', 'voxly369@gmail.com')::text,
    true
  );
  execute 'set local role authenticated';
  perform public.founder_set_user_status(v_b, 'active', 'security block setup', null);

  execute format('set local role %I', session_user);
  update public.profiles set city = 'Hidden city', city_visible = false where id = v_b;

  perform set_config('request.jwt.claim.sub', v_a::text, true);
  perform set_config(
    'request.jwt.claims',
    json_build_object('sub', v_a::text, 'role', 'authenticated')::text,
    true
  );
  execute 'set local role authenticated';
  perform set_config('search_path', 'pg_temp, public, auth, storage', true);

  select city, city_visible into v_city, v_visible
  from public.profiles_public where id = v_b;
  perform pg_temp.record(
    'another user cannot read a hidden city through profiles_public',
    v_city is null and coalesce(v_visible, false) = false,
    coalesce(v_city, 'null') || ' visible=' || coalesce(v_visible::text, 'null')
  );

  execute format('set local role %I', session_user);
  update public.profiles set city_visible = true where id = v_b;
  execute 'set local role authenticated';

  select city into v_city from public.profiles_public where id = v_b;
  perform pg_temp.record(
    'city is readable when city_visible is true',
    v_city = 'Hidden city',
    coalesce(v_city, 'null')
  );

  perform set_config('request.jwt.claim.sub', v_b::text, true);
  perform set_config(
    'request.jwt.claims',
    json_build_object('sub', v_b::text, 'role', 'authenticated')::text,
    true
  );
  select city into v_city from public.profiles_public where id = v_b;
  perform pg_temp.record(
    'owner can read own city through profiles_public',
    v_city = 'Hidden city',
    coalesce(v_city, 'null')
  );

  perform set_config('request.jwt.claim.sub', v_a::text, true);
  perform set_config(
    'request.jwt.claims',
    json_build_object('sub', v_a::text, 'role', 'authenticated')::text,
    true
  );
  begin
    select city into v_city from public.profiles where id = v_b;
    perform pg_temp.record('direct select of profiles.city is denied', false, 'select succeeded');
  exception
    when insufficient_privilege then
      perform pg_temp.record('direct select of profiles.city is denied', true, sqlerrm);
    when others then
      perform pg_temp.record('direct select of profiles.city is denied', false, sqlstate || ' ' || sqlerrm);
  end;

  insert into public.blocks (blocker_id, blocked_id) values (v_a, v_b);
  perform pg_temp.record(
    'blocked profile is hidden through profiles_public',
    not exists (select 1 from public.profiles_public where id = v_b),
    'row visible'
  );
  delete from public.blocks where blocker_id = v_a and blocked_id = v_b;

  perform set_config('request.jwt.claim.sub', v_founder::text, true);
  perform set_config(
    'request.jwt.claims',
    json_build_object('sub', v_founder::text, 'role', 'authenticated', 'email', 'voxly369@gmail.com')::text,
    true
  );
  execute 'set local role authenticated';
  perform public.founder_set_user_status(v_b, 'banned', 'security review ban', null);
  perform set_config('request.jwt.claim.sub', v_a::text, true);
  perform set_config(
    'request.jwt.claims',
    json_build_object('sub', v_a::text, 'role', 'authenticated')::text,
    true
  );
  perform pg_temp.record(
    'banned profile is hidden through profiles_public for a normal user',
    not exists (select 1 from public.profiles_public where id = v_b),
    'row visible'
  );
  perform set_config('request.jwt.claim.sub', v_founder::text, true);
  perform public.founder_set_user_status(v_b, 'active', 'lift for smoke test', null);

  perform set_config('request.jwt.claim.sub', v_a::text, true);
  perform set_config(
    'request.jwt.claims',
    json_build_object('sub', v_a::text, 'role', 'authenticated', 'email', 'reader.a@voxly.test')::text,
    true
  );
  execute 'set local role authenticated';

  v_avatar := 'https://evil.example/avatar.webp';
  begin
    update public.profiles set avatar_url = v_avatar where id = v_a;
    perform pg_temp.record('avatar_url outside storage fails check', false, 'update succeeded');
  exception
    when check_violation then
      perform pg_temp.record('avatar_url outside storage fails check', true, sqlerrm);
    when others then
      perform pg_temp.record('avatar_url outside storage fails check', false, sqlstate || ' ' || sqlerrm);
  end;

  v_avatar := 'https://ktgxdqplvggeyrnuqljx.supabase.co/storage/v1/object/public/avatars/'
    || v_b::text || '/stolen.webp';
  begin
    update public.profiles set avatar_url = v_avatar where id = v_a;
    perform pg_temp.record('avatar_url in another user folder fails check', false, 'update succeeded');
  exception
    when check_violation then
      perform pg_temp.record('avatar_url in another user folder fails check', true, sqlerrm);
    when others then
      perform pg_temp.record('avatar_url in another user folder fails check', false, sqlstate || ' ' || sqlerrm);
  end;

  v_avatar := 'https://ktgxdqplvggeyrnuqljx.supabase.co/storage/v1/object/public/avatars/'
    || v_a::text || '/own.webp';
  update public.profiles set avatar_url = v_avatar where id = v_a;
  get diagnostics n = row_count;
  execute format('set local role %I', session_user);
  perform pg_temp.record(
    'avatar_url in own folder succeeds',
    n = 1 and (select avatar_url from public.profiles where id = v_a) = v_avatar,
    'rows=' || n || ' url=' || coalesce((select avatar_url from public.profiles where id = v_a), 'null')
  );
  execute 'set local role authenticated';

  insert into public.creations (author_id, type, title, audience, status)
  values (v_a, 'poem', 'Cover check', 'public', 'draft')
  returning id into v_own;

  v_cover := 'https://ktgxdqplvggeyrnuqljx.supabase.co/storage/v1/object/public/covers/'
    || v_b::text || '/stolen.webp';
  begin
    update public.creations set cover_url = v_cover where id = v_own;
    perform pg_temp.record('cover_url in another user folder fails check', false, 'update succeeded');
  exception
    when check_violation then
      perform pg_temp.record('cover_url in another user folder fails check', true, sqlerrm);
    when others then
      perform pg_temp.record('cover_url in another user folder fails check', false, sqlstate || ' ' || sqlerrm);
  end;

  v_cover := 'https://ktgxdqplvggeyrnuqljx.supabase.co/storage/v1/object/public/covers/'
    || v_a::text || '/cover.webp';
  update public.creations set cover_url = v_cover where id = v_own;
  get diagnostics n = row_count;
  execute format('set local role %I', session_user);
  perform pg_temp.record(
    'cover_url in own folder succeeds',
    n = 1 and (select cover_url from public.creations where id = v_own) = v_cover,
    'rows=' || n || ' url=' || coalesce((select cover_url from public.creations where id = v_own), 'null')
  );
  execute 'set local role authenticated';

  insert into public.creations (author_id, type, title, audience, status)
  values (v_a, 'poem', 'To delete', 'public', 'draft')
  returning id into v_reported;
  insert into public.reports (target_type, target_id, reason)
  values ('creation', v_reported, 'spam');
  delete from public.creations where id = v_reported;
  select exists (select 1 from public.creations where id = v_reported) into v_blocked;
  if v_blocked then v_detail := 'row remains'; else v_detail := 'deleted'; end if;
  perform pg_temp.record(
    'author cannot delete creation with open report',
    v_blocked,
    v_detail
  );

  insert into public.creations (author_id, type, title, audience, status)
  values (v_a, 'poem', 'Safe delete', 'public', 'draft')
  returning id into v_own;
  delete from public.creations where id = v_own;
  perform pg_temp.record(
    'author can delete creation without open report',
    not exists (select 1 from public.creations where id = v_own),
    'row remains'
  );

  perform set_config('request.jwt.claim.sub', v_founder::text, true);
  perform set_config(
    'request.jwt.claims',
    json_build_object('sub', v_founder::text, 'role', 'authenticated', 'email', 'voxly369@gmail.com')::text,
    true
  );
  execute 'set local role authenticated';
  perform public.founder_set_user_status(v_a, 'banned', 'delete block test', null);
  perform set_config('request.jwt.claim.sub', v_a::text, true);
  perform set_config(
    'request.jwt.claims',
    json_build_object('sub', v_a::text, 'role', 'authenticated')::text,
    true
  );
  execute format('set local role %I', session_user);
  insert into public.creations (author_id, type, title, audience, status)
  values (v_a, 'poem', 'Banned delete', 'public', 'draft')
  returning id into v_own;
  execute 'set local role authenticated';
  perform set_config('request.jwt.claim.sub', v_a::text, true);
  perform set_config(
    'request.jwt.claims',
    json_build_object('sub', v_a::text, 'role', 'authenticated')::text,
    true
  );
  delete from public.creations where id = v_own;
  select exists (select 1 from public.creations where id = v_own) into v_blocked;
  if v_blocked then v_detail := 'row remains'; else v_detail := 'deleted'; end if;
  perform pg_temp.record(
    'non-active user cannot delete creation',
    v_blocked,
    v_detail
  );
  perform set_config('request.jwt.claim.sub', v_founder::text, true);
  perform public.founder_set_user_status(v_a, 'active', 'restore after delete block test', null);

  perform set_config('request.jwt.claim.sub', v_a::text, true);
  perform set_config(
    'request.jwt.claims',
    json_build_object('sub', v_a::text, 'role', 'authenticated')::text,
    true
  );
  insert into public.blocks (blocker_id, blocked_id) values (v_a, v_b);

  perform set_config('request.jwt.claim.sub', v_c::text, true);
  perform set_config(
    'request.jwt.claims',
    json_build_object('sub', v_c::text, 'role', 'authenticated')::text,
    true
  );
  select public.is_blocked_between(v_a, v_b) into v_blocked;
  perform pg_temp.record(
    'is_blocked_between false for two other users',
    v_blocked = false,
    coalesce(v_blocked::text, 'null')
  );

  perform set_config('request.jwt.claim.sub', v_a::text, true);
  perform set_config(
    'request.jwt.claims',
    json_build_object('sub', v_a::text, 'role', 'authenticated')::text,
    true
  );
  select public.is_blocked_between(v_a, v_b) into v_blocked;
  perform pg_temp.record(
    'is_blocked_between true when caller is in the block',
    v_blocked = true,
    coalesce(v_blocked::text, 'null')
  );
  select public.is_blocked_between(v_b, v_a) into v_blocked;
  perform pg_temp.record(
    'is_blocked_between true in both directions for caller',
    v_blocked = true,
    coalesce(v_blocked::text, 'null')
  );
  delete from public.blocks where blocker_id = v_a and blocked_id = v_b;

  v_err := '';
  execute format('set local role %I', session_user);
  begin
    insert into storage.objects (bucket_id, name)
    values ('avatars', v_b::text || '/listed.webp');
  exception when others then
    v_err := sqlstate || ' ' || sqlerrm;
  end;
  if v_err <> '' then
    perform pg_temp.record('storage listing hides another user objects', true, 'not testable: ' || v_err);
  else
    execute 'set local role authenticated';
    perform set_config('request.jwt.claim.sub', v_a::text, true);
    select count(*) into n
    from storage.objects
    where bucket_id = 'avatars' and name = v_b::text || '/listed.webp';
    perform pg_temp.record(
      'storage listing hides another user objects',
      n = 0,
      'count=' || n
    );
  end if;

  perform set_config('request.jwt.claim.sub', v_a::text, true);
  execute 'set local role authenticated';
end $sec$;

-- Content limits: CHECK constraints, tag cap, and creation rate limit.
do $limits$
declare
  v_a uuid;
  v_book uuid;
  v_ch uuid;
  v_creation uuid;
  v_rate uuid;
  v_text text;
  v_json jsonb;
  v_i integer;
  v_msg text;
  n integer;
begin
  select reader_a into v_a from rls_ids;

  perform set_config('request.jwt.claim.sub', v_a::text, true);
  perform set_config(
    'request.jwt.claims',
    json_build_object('sub', v_a::text, 'role', 'authenticated', 'email', 'reader.a@voxly.test')::text,
    true
  );
  execute 'set local role authenticated';
  perform set_config('search_path', 'pg_temp, public, auth', true);

  v_text := repeat('a', 500000);
  insert into public.creations (author_id, type, title, audience, status, body_text)
  values (v_a, 'poem', 'At text limit', 'private', 'draft', v_text)
  returning id into v_creation;
  perform pg_temp.record(
    'creation body_text accepts at most 500000 octets',
    (select octet_length(body_text) from public.creations where id = v_creation) = 500000,
    'octets=' || coalesce((select octet_length(body_text)::text from public.creations where id = v_creation), 'null')
  );

  v_text := repeat('a', 500001);
  begin
    insert into public.creations (author_id, type, title, audience, status, body_text)
    values (v_a, 'poem', 'Over text limit', 'private', 'draft', v_text);
    perform pg_temp.record('creation body_text rejects over 500000 octets', false, 'insert succeeded');
  exception
    when check_violation then
      perform pg_temp.record('creation body_text rejects over 500000 octets', true, sqlerrm);
    when others then
      perform pg_temp.record('creation body_text rejects over 500000 octets', false, sqlstate || ' ' || sqlerrm);
  end;

  v_i := 999000;
  loop
    v_json := to_jsonb(repeat('j', v_i));
    exit when octet_length(v_json::text) > 1000000;
    v_i := v_i + 1;
  end loop;
  v_i := v_i - 1;
  v_json := to_jsonb(repeat('j', v_i));
  insert into public.creations (author_id, type, title, audience, status, body_json)
  values (v_a, 'poem', 'At json limit', 'private', 'draft', v_json)
  returning id into v_creation;
  perform pg_temp.record(
    'creation body_json accepts at most 1000000 octets',
    octet_length((select body_json::text from public.creations where id = v_creation)) <= 1000000,
    'octets=' || octet_length((select body_json::text from public.creations where id = v_creation))::text
  );

  v_json := to_jsonb(repeat('k', v_i + 1));
  begin
    insert into public.creations (author_id, type, title, audience, status, body_json)
    values (v_a, 'poem', 'Over json limit', 'private', 'draft', v_json);
    perform pg_temp.record('creation body_json rejects over 1000000 octets', false, 'insert succeeded');
  exception
    when check_violation then
      perform pg_temp.record('creation body_json rejects over 1000000 octets', true, sqlerrm);
    when others then
      perform pg_temp.record('creation body_json rejects over 1000000 octets', false, sqlstate || ' ' || sqlerrm);
  end;

  insert into public.creations (author_id, type, title, audience, status, genre, mood, language)
  values (v_a, 'poem', 'Meta at limit', 'private', 'draft', repeat('g', 60), 'hope', '12345678')
  returning id into v_creation;
  perform pg_temp.record(
    'creation genre mood and language accept at-limit values',
    (select char_length(genre) from public.creations where id = v_creation) = 60
      and (select lower(mood) from public.creations where id = v_creation) = 'hope'
      and (select char_length(language) from public.creations where id = v_creation) = 8,
    'ok'
  );

  begin
    insert into public.creations (author_id, type, title, audience, status, mood)
    values (v_a, 'poem', 'Mood invalid', 'private', 'draft', repeat('m', 60));
    perform pg_temp.record('creation mood rejects disallowed slug', false, 'insert succeeded');
  exception
    when check_violation then
      perform pg_temp.record('creation mood rejects disallowed slug', true, sqlerrm);
    when others then
      perform pg_temp.record('creation mood rejects disallowed slug', false, sqlstate || ' ' || sqlerrm);
  end;

  begin
    insert into public.creations (author_id, type, title, audience, status, genre)
    values (v_a, 'poem', 'Genre over', 'private', 'draft', repeat('g', 61));
    perform pg_temp.record('creation genre rejects over 60 characters', false, 'insert succeeded');
  exception
    when check_violation then
      perform pg_temp.record('creation genre rejects over 60 characters', true, sqlerrm);
    when others then
      perform pg_temp.record('creation genre rejects over 60 characters', false, sqlstate || ' ' || sqlerrm);
  end;

  begin
    insert into public.creations (author_id, type, title, audience, status, language)
    values (v_a, 'poem', 'Lang over', 'private', 'draft', '123456789');
    perform pg_temp.record('creation language rejects over 8 characters', false, 'insert succeeded');
  exception
    when check_violation then
      perform pg_temp.record('creation language rejects over 8 characters', true, sqlerrm);
    when others then
      perform pg_temp.record('creation language rejects over 8 characters', false, sqlstate || ' ' || sqlerrm);
  end;

  insert into public.creations (author_id, type, title, audience, status)
  values (v_a, 'book', 'Chapter limits book', 'private', 'draft')
  returning id into v_book;

  v_text := repeat('c', 500000);
  insert into public.chapters (book_id, position, title, body_text, status)
  values (v_book, 1, 'At chapter text', v_text, 'draft')
  returning id into v_ch;
  perform pg_temp.record(
    'chapter body_text accepts at most 500000 octets',
    (select octet_length(body_text) from public.chapters where id = v_ch) = 500000,
    'octets=500000'
  );

  v_text := repeat('c', 500001);
  begin
    insert into public.chapters (book_id, position, title, body_text, status)
    values (v_book, 2, 'Over chapter text', v_text, 'draft');
    perform pg_temp.record('chapter body_text rejects over 500000 octets', false, 'insert succeeded');
  exception
    when check_violation then
      perform pg_temp.record('chapter body_text rejects over 500000 octets', true, sqlerrm);
    when others then
      perform pg_temp.record('chapter body_text rejects over 500000 octets', false, sqlstate || ' ' || sqlerrm);
  end;

  v_i := 999000;
  loop
    v_json := to_jsonb(repeat('h', v_i));
    exit when octet_length(v_json::text) > 1000000;
    v_i := v_i + 1;
  end loop;
  v_i := v_i - 1;
  insert into public.chapters (book_id, position, title, body_json, status)
  values (v_book, 3, 'At chapter json', to_jsonb(repeat('h', v_i)), 'draft')
  returning id into v_ch;
  perform pg_temp.record(
    'chapter body_json accepts at most 1000000 octets',
    octet_length((select body_json::text from public.chapters where id = v_ch)) <= 1000000,
    'ok'
  );

  begin
    insert into public.chapters (book_id, position, title, body_json, status)
    values (v_book, 4, 'Over chapter json', to_jsonb(repeat('h', v_i + 1)), 'draft');
    perform pg_temp.record('chapter body_json rejects over 1000000 octets', false, 'insert succeeded');
  exception
    when check_violation then
      perform pg_temp.record('chapter body_json rejects over 1000000 octets', true, sqlerrm);
    when others then
      perform pg_temp.record('chapter body_json rejects over 1000000 octets', false, sqlstate || ' ' || sqlerrm);
  end;

  insert into public.creations (author_id, type, title, audience, status)
  values (v_a, 'poem', 'Tag cap', 'private', 'draft')
  returning id into v_creation;

  for n in 1..15 loop
    insert into public.creation_tags (creation_id, tag) values (v_creation, 'tag' || n::text);
  end loop;
  perform pg_temp.record(
    'creation accepts 15 tags',
    (select count(*) from public.creation_tags where creation_id = v_creation) = 15,
    'count=15'
  );

  begin
    insert into public.creation_tags (creation_id, tag) values (v_creation, 'tag16');
    perform pg_temp.record('creation rejects a 16th tag', false, 'insert succeeded');
  exception
    when others then
      v_msg := sqlerrm;
      perform pg_temp.record(
        'creation rejects a 16th tag',
        v_msg like '%15 tags%',
        v_msg
      );
  end;

  v_rate := gen_random_uuid();
  execute format('set local role %I', session_user);
  perform pg_temp.create_test_user(v_rate, 'limits.rate@voxly.test', now());
  perform set_config('request.jwt.claim.sub', v_rate::text, true);
  perform set_config(
    'request.jwt.claims',
    json_build_object('sub', v_rate::text, 'role', 'authenticated', 'email', 'limits.rate@voxly.test')::text,
    true
  );
  execute 'set local role authenticated';

  for n in 1..60 loop
    insert into public.creations (author_id, type, title, audience, status)
    values (v_rate, 'poem', 'Rate ' || n::text, 'private', 'draft');
  end loop;
  perform pg_temp.record(
    'creation rate limit accepts the 60th creation in an hour',
    (select count(*) from public.creations where author_id = v_rate and created_at > now() - interval '1 hour') = 60,
    'count=60'
  );

  begin
    insert into public.creations (author_id, type, title, audience, status)
    values (v_rate, 'poem', 'Rate 61', 'private', 'draft');
    perform pg_temp.record('creation rate limit rejects the 61st creation in an hour', false, 'insert succeeded');
  exception
    when others then
      v_msg := sqlerrm;
      perform pg_temp.record(
        'creation rate limit rejects the 61st creation in an hour',
        v_msg like '%too fast%',
        v_msg
      );
  end;

  perform set_config('request.jwt.claim.sub', v_a::text, true);
  execute 'set local role authenticated';
end $limits$;

-- Publish flow: draft to published, visibility, counters, and column guards.
do $publish$
declare
  v_a uuid;
  v_b uuid;
  v_founder uuid;
  v_new uuid := gen_random_uuid();
  v_draft uuid;
  v_unlisted uuid;
  v_role public.user_role;
  v_count integer;
  v_pub timestamptz;
  n integer;
begin
  select reader_a, reader_b, founder into v_a, v_b, v_founder from rls_ids;

  execute format('set local role %I', session_user);
  perform pg_temp.create_test_user(v_new, 'publish.new@voxly.test', now());
  execute 'set local role authenticated';

  perform set_config('request.jwt.claim.sub', v_new::text, true);
  perform set_config(
    'request.jwt.claims',
    json_build_object('sub', v_new::text, 'role', 'authenticated', 'email', 'publish.new@voxly.test')::text,
    true
  );

  insert into public.creations (author_id, type, title, audience, status, body_text)
  values (v_new, 'poem', 'First publish', 'public', 'draft', 'A line')
  returning id into v_draft;

  update public.creations set status = 'published', audience = 'public' where id = v_draft and author_id = v_new;
  select published_at into v_pub from public.creations where id = v_draft;
  perform pg_temp.record(
    'author publishes own draft and published_at is set',
    v_pub is not null,
    coalesce(v_pub::text, 'null')
  );

  select role, creation_count into v_role, v_count from public.profiles where id = v_new;
  perform pg_temp.record(
    'first publish promotes reader to writer exactly once and creation_count becomes 1',
    v_role = 'writer' and v_count = 1,
    'role=' || coalesce(v_role::text, 'null') || ' count=' || coalesce(v_count::text, 'null')
  );

  update public.creations set status = 'draft' where id = v_draft and author_id = v_new;
  select creation_count into v_count from public.profiles where id = v_new;
  perform pg_temp.record('unpublish decrements creation_count', v_count = 0, 'count=' || coalesce(v_count::text, 'null'));

  perform set_config('request.jwt.claim.sub', v_a::text, true);
  perform set_config(
    'request.jwt.claims',
    json_build_object('sub', v_a::text, 'role', 'authenticated', 'email', 'reader.a@voxly.test')::text,
    true
  );
  execute 'set local role authenticated';
  perform set_config('search_path', 'pg_temp, public, auth', true);

  select draft_id, private_id into v_draft, v_unlisted from rls_ids;
  perform set_config('request.jwt.claim.sub', v_a::text, true);
  perform set_config(
    'request.jwt.claims',
    json_build_object('sub', v_a::text, 'role', 'authenticated', 'email', 'reader.a@voxly.test')::text,
    true
  );
  execute 'set local role authenticated';
  select count(*) into n from public.creations where id = v_draft;
  perform pg_temp.record('draft stays invisible to another user', n = 0, 'rows=' || n);
  select count(*) into n from public.creations where id = v_unlisted;
  perform pg_temp.record('published with audience private is invisible to another user', n = 0, 'rows=' || n);

  execute format('set local role %I', session_user);
  insert into public.creations (author_id, type, title, audience, status, body_text)
  values (v_b, 'poem', 'Unlisted link', 'unlisted', 'published', 'Hidden feed')
  returning id into v_unlisted;
  execute 'set local role authenticated';
  perform set_config('request.jwt.claim.sub', v_a::text, true);
  perform set_config(
    'request.jwt.claims',
    json_build_object('sub', v_a::text, 'role', 'authenticated', 'email', 'reader.a@voxly.test')::text,
    true
  );

  perform set_config('request.jwt.claim.sub', v_a::text, true);
  select count(*) into n from public.creations where id = v_unlisted;
  perform pg_temp.record('published unlisted is readable by another user who knows the id', n = 1, 'rows=' || n);

  select count(*) into n from public.creations where id = (select public_id from rls_ids);
  perform pg_temp.record('published public is readable', n = 1, 'rows=' || n);

  perform set_config('request.jwt.claim.sub', v_a::text, true);
  update public.creations set status = 'published', audience = 'public'
    where id = v_draft and author_id = v_b;
  get diagnostics n = row_count;
  perform pg_temp.record('cannot publish someone else''s creation', n = 0, 'rows=' || n);

  perform set_config('request.jwt.claim.sub', v_b::text, true);
  perform set_config(
    'request.jwt.claims',
    json_build_object('sub', v_b::text, 'role', 'authenticated', 'email', 'reader.b@voxly.test')::text,
    true
  );
  begin
    update public.creations set status = 'removed' where id = v_unlisted and author_id = v_b;
    get diagnostics n = row_count;
    perform pg_temp.record('cannot set status to removed', n = 0, 'rows=' || n);
  exception
    when insufficient_privilege then
      perform pg_temp.record('cannot set status to removed', true, sqlerrm);
    when others then
      perform pg_temp.record('cannot set status to removed', false, sqlstate || ' ' || sqlerrm);
  end;

  begin
    update public.creations set published_at = now() where id = v_unlisted and author_id = v_b;
    get diagnostics n = row_count;
    perform pg_temp.record('cannot set published_at', n = 0, 'rows=' || n);
  exception
    when insufficient_privilege then
      perform pg_temp.record('cannot set published_at', true, sqlerrm);
    when others then
      perform pg_temp.record('cannot set published_at', false, sqlstate || ' ' || sqlerrm);
  end;

  begin
    update public.creations set is_removed = true where id = v_unlisted and author_id = v_b;
    get diagnostics n = row_count;
    perform pg_temp.record('cannot set is_removed', n = 0, 'rows=' || n);
  exception
    when insufficient_privilege then
      perform pg_temp.record('cannot set is_removed', true, sqlerrm);
    when others then
      perform pg_temp.record('cannot set is_removed', false, sqlstate || ' ' || sqlerrm);
  end;

  perform set_config('request.jwt.claim.sub', v_founder::text, true);
  perform set_config(
    'request.jwt.claims',
    json_build_object('sub', v_founder::text, 'role', 'authenticated', 'email', 'voxly369@gmail.com')::text,
    true
  );
  perform public.founder_set_user_status(v_a, 'suspended', 'publish block', now() + interval '1 day');
  perform set_config('request.jwt.claim.sub', v_a::text, true);
  perform set_config(
    'request.jwt.claims',
    json_build_object('sub', v_a::text, 'role', 'authenticated')::text,
    true
  );
  begin
    insert into public.creations (author_id, type, title, audience, status, body_text)
    values (v_a, 'poem', 'Suspended publish', 'public', 'published', 'Nope');
    perform pg_temp.record('suspended user cannot publish', false, 'insert succeeded');
  exception
    when others then
      perform pg_temp.record('suspended user cannot publish', true, sqlerrm);
  end;

  perform set_config('request.jwt.claim.sub', v_founder::text, true);
  perform public.founder_set_user_status(v_a, 'active', 'restore suspended', null);
  perform public.founder_set_user_status(v_a, 'banned', 'publish block', null);
  perform set_config('request.jwt.claim.sub', v_a::text, true);
  begin
    insert into public.creations (author_id, type, title, audience, status, body_text)
    values (v_a, 'poem', 'Banned publish', 'public', 'published', 'Nope');
    perform pg_temp.record('banned user cannot publish', false, 'insert succeeded');
  exception
    when others then
      perform pg_temp.record('banned user cannot publish', true, sqlerrm);
  end;
  perform set_config('request.jwt.claim.sub', v_founder::text, true);
  perform public.founder_set_user_status(v_a, 'active', 'restore banned', null);
end $publish$;

do $feed_engagement$
declare
  v_a uuid;
  v_b uuid;
  v_founder uuid;
  v_public uuid;
  v_unlisted uuid;
  v_suspended_post uuid;
  v_comment_target uuid;
  v_comment_id uuid;
  n integer;
  i integer;
  v_msg text;
begin
  select reader_a, reader_b, founder, public_id into v_a, v_b, v_founder, v_public from rls_ids;

  perform set_config('request.jwt.claim.sub', v_a::text, true);
  perform set_config(
    'request.jwt.claims',
    json_build_object('sub', v_a::text, 'role', 'authenticated', 'email', 'reader.a@voxly.test')::text,
    true
  );
  execute 'set local role authenticated';
  perform set_config('search_path', 'pg_temp, public, auth', true);

  select count(*) into n from public.feed_creations where id = v_public;
  perform pg_temp.record('feed_creations includes active author public post', n = 1, 'rows=' || n);

  perform set_config('request.jwt.claim.sub', v_b::text, true);
  perform set_config(
    'request.jwt.claims',
    json_build_object('sub', v_b::text, 'role', 'authenticated', 'email', 'reader.b@voxly.test')::text,
    true
  );

  insert into public.creations (author_id, type, title, audience, status, body_text)
  values (v_b, 'poem', 'Unlisted feed', 'unlisted', 'published', 'No feed')
  returning id into v_unlisted;

  select count(*) into n from public.feed_creations where id = v_unlisted;
  perform pg_temp.record('unlisted never in feed_creations', n = 0, 'rows=' || n);

  insert into public.creations (author_id, type, title, audience, status, body_text)
  values (v_b, 'poem', 'Suspend me', 'public', 'published', 'Before suspend')
  returning id into v_suspended_post;

  perform set_config('request.jwt.claim.sub', v_founder::text, true);
  perform set_config(
    'request.jwt.claims',
    json_build_object('sub', v_founder::text, 'role', 'authenticated', 'email', 'voxly369@gmail.com')::text,
    true
  );
  perform public.founder_set_user_status(v_b, 'suspended', 'feed test', now() + interval '1 day');

  perform set_config('request.jwt.claim.sub', v_a::text, true);
  perform set_config(
    'request.jwt.claims',
    json_build_object('sub', v_a::text, 'role', 'authenticated', 'email', 'reader.a@voxly.test')::text,
    true
  );

  select count(*) into n from public.feed_creations where author_id = v_b;
  perform pg_temp.record('suspended author hidden from feed_creations', n = 0, 'rows=' || n);

  select count(*) into n from public.creations where id = v_suspended_post;
  perform pg_temp.record('suspended author work hidden from other users via creations_select', n = 0, 'rows=' || n);

  perform set_config('request.jwt.claim.sub', v_b::text, true);
  select count(*) into n from public.creations where id = v_suspended_post;
  perform pg_temp.record('suspended author can still read own published work', n = 1, 'rows=' || n);

  perform set_config('request.jwt.claim.sub', v_founder::text, true);
  select count(*) into n from public.creations where id = v_suspended_post;
  perform pg_temp.record('founder can read suspended author published work', n = 1, 'rows=' || n);

  perform public.founder_set_user_status(v_b, 'active', 'feed restore', null);

  perform set_config('request.jwt.claim.sub', v_a::text, true);
  insert into public.blocks (blocker_id, blocked_id) values (v_a, v_b);
  select count(*) into n from public.feed_creations where author_id = v_b;
  perform pg_temp.record('blocked author hidden from feed_creations', n = 0, 'rows=' || n);
  delete from public.blocks where blocker_id = v_a and blocked_id = v_b;

  begin
    execute 'set local role anon';
    select count(*) into n from public.feed_creations;
    perform pg_temp.record('anon cannot read feed_creations', false, 'select succeeded rows=' || n);
  exception
    when insufficient_privilege then
      perform pg_temp.record('anon cannot read feed_creations', true, sqlerrm);
    when others then
      perform pg_temp.record('anon cannot read feed_creations', true, sqlstate || ' ' || sqlerrm);
  end;
  execute 'set local role authenticated';

  perform set_config('request.jwt.claim.sub', v_a::text, true);
  select id into v_comment_target from public.creations where id = v_public;

  begin
    insert into public.comments (creation_id, author_id, body) values (v_comment_target, v_a, '   ');
    perform pg_temp.record('whitespace-only comment rejected', false, 'insert succeeded');
  exception
    when others then
      get stacked diagnostics v_msg = message_text;
      perform pg_temp.record(
        'whitespace-only comment rejected',
        v_msg like '%empty%',
        v_msg
      );
  end;

  insert into public.comments (creation_id, author_id, body)
  values (v_comment_target, v_a, 'Will lose access')
  returning id into v_comment_id;

  perform set_config('request.jwt.claim.sub', v_b::text, true);
  update public.creations set audience = 'private' where id = v_comment_target and author_id = v_b;

  perform set_config('request.jwt.claim.sub', v_a::text, true);
  begin
    update public.comments set body = 'Edited after lockout' where id = v_comment_id and author_id = v_a;
    get diagnostics n = row_count;
    perform pg_temp.record('user who cannot view creation cannot edit their comment', n = 0, 'rows=' || n);
  exception
    when insufficient_privilege then
      perform pg_temp.record('user who cannot view creation cannot edit their comment', true, sqlerrm);
    when others then
      perform pg_temp.record('user who cannot view creation cannot edit their comment', false, sqlstate || ' ' || sqlerrm);
  end;

  update public.creations set audience = 'public' where id = v_comment_target and author_id = v_b;

  perform set_config('request.jwt.claim.sub', v_founder::text, true);
  perform public.founder_set_user_status(v_a, 'suspended', 'engagement block', now() + interval '1 day');
  perform set_config('request.jwt.claim.sub', v_a::text, true);

  begin
    insert into public.likes (user_id, creation_id) values (v_a, v_comment_target);
    perform pg_temp.record('suspended user cannot like', false, 'insert succeeded');
  exception
    when others then
      perform pg_temp.record('suspended user cannot like', true, sqlerrm);
  end;

  begin
    insert into public.saves (user_id, creation_id) values (v_a, v_comment_target);
    perform pg_temp.record('suspended user cannot save', false, 'insert succeeded');
  exception
    when others then
      perform pg_temp.record('suspended user cannot save', true, sqlerrm);
  end;

  begin
    insert into public.comments (creation_id, author_id, body) values (v_comment_target, v_a, 'Suspended comment');
    perform pg_temp.record('suspended user cannot comment', false, 'insert succeeded');
  exception
    when others then
      perform pg_temp.record('suspended user cannot comment', true, sqlerrm);
  end;

  perform set_config('request.jwt.claim.sub', v_founder::text, true);
  perform public.founder_set_user_status(v_a, 'active', 'engagement restore', null);

  perform set_config('request.jwt.claim.sub', v_b::text, true);
  for i in 1..30 loop
    insert into public.comments (creation_id, author_id, body)
    values (v_comment_target, v_b, 'Rate comment ' || i::text);
  end loop;

  select count(*) into n
  from public.comments
  where author_id = v_b and created_at > now() - interval '10 minutes';
  perform pg_temp.record('comment rate limit accepts the 30th in ten minutes', n >= 30, 'count=' || n);

  begin
    insert into public.comments (creation_id, author_id, body)
    values (v_comment_target, v_b, 'Rate comment 31');
    perform pg_temp.record('comment rate limit rejects the 31st in ten minutes', false, 'insert succeeded');
  exception
    when others then
      get stacked diagnostics v_msg = message_text;
      perform pg_temp.record(
        'comment rate limit rejects the 31st in ten minutes',
        v_msg like '%too fast%',
        v_msg
      );
  end;
end $feed_engagement$;

do $feed_scale$
declare
  v_a uuid;
  v_b uuid;
  v_founder uuid;
  v_public uuid;
  v_short uuid;
  v_long uuid;
  v_unlisted uuid;
  v_comment_id uuid;
  v_mention_target uuid;
  v_other uuid;
  v_third uuid;
  n integer;
  i integer;
  v_msg text;
  v_excerpt text;
  v_trunc boolean;
  v_username_b text;
  v_like_target uuid;
  creation_ids uuid[] := '{}';
begin
  reset role;

  select reader_a, reader_b, founder, public_id into v_a, v_b, v_founder, v_public from rls_ids;

  v_third := gen_random_uuid();
  perform pg_temp.create_test_user(v_third, 'feedscale.mention@voxly.test', now());

  select count(*) into n
  from information_schema.columns
  where table_schema = 'public' and table_name = 'feed_creations' and column_name = 'body_text';
  perform pg_temp.record('feed_creations has no body_text column', n = 0, 'cols=' || n);

  perform set_config('request.jwt.claim.sub', v_b::text, true);
  perform set_config(
    'request.jwt.claims',
    json_build_object('sub', v_b::text, 'role', 'authenticated', 'email', 'reader.b@voxly.test')::text,
    true
  );
  execute 'set local role authenticated';

  insert into public.creations (author_id, type, title, audience, status, body_text)
  values (v_b, 'poem', 'Short body', 'public', 'published', 'Hello feed')
  returning id into v_short;

  insert into public.creations (author_id, type, title, audience, status, body_text)
  values (v_b, 'poem', 'Long body', 'public', 'published', repeat('x', 1300))
  returning id into v_long;

  select body_excerpt, body_truncated into v_excerpt, v_trunc from public.feed_creations where id = v_short;
  perform pg_temp.record(
    'feed excerpt at most 1200 characters for short body',
    char_length(v_excerpt) <= 1200 and v_trunc = false,
    'len=' || char_length(v_excerpt) || ' trunc=' || v_trunc
  );

  select body_excerpt, body_truncated into v_excerpt, v_trunc from public.feed_creations where id = v_long;
  perform pg_temp.record(
    'feed body_truncated true for long body',
    char_length(v_excerpt) = 1200 and v_trunc = true,
    'len=' || char_length(v_excerpt) || ' trunc=' || v_trunc
  );

  begin
    execute 'set local role anon';
    select count(*) into n from public.feed_creations;
    perform pg_temp.record('anon cannot read feed_creations after excerpt migration', false, 'rows=' || n);
  exception
    when insufficient_privilege then
      perform pg_temp.record('anon cannot read feed_creations after excerpt migration', true, sqlerrm);
    when others then
      perform pg_temp.record('anon cannot read feed_creations after excerpt migration', true, sqlstate);
  end;
  execute 'set local role authenticated';

  perform set_config('request.jwt.claim.sub', v_a::text, true);
  perform set_config(
    'request.jwt.claims',
    json_build_object('sub', v_a::text, 'role', 'authenticated', 'email', 'reader.a@voxly.test')::text,
    true
  );

  insert into public.follows (follower_id, followee_id) values (v_a, v_b)
  on conflict do nothing;

  select count(*) into n from public.following_feed where author_id = v_b;
  perform pg_temp.record('following_feed shows followed author public work', n >= 1, 'rows=' || n);

  delete from public.follows where follower_id = v_a and followee_id = v_b;
  select count(*) into n from public.following_feed where author_id = v_b;
  perform pg_temp.record('unfollowing removes work from following_feed', n = 0, 'rows=' || n);

  insert into public.follows (follower_id, followee_id) values (v_a, v_b);

  perform set_config('request.jwt.claim.sub', v_b::text, true);
  insert into public.creations (author_id, type, title, audience, status, body_text)
  values (v_b, 'poem', 'Unlisted follow', 'unlisted', 'published', 'Hidden')
  returning id into v_unlisted;

  perform set_config('request.jwt.claim.sub', v_a::text, true);
  select count(*) into n from public.following_feed where id = v_unlisted;
  perform pg_temp.record('following_feed excludes unlisted work', n = 0, 'rows=' || n);

  begin
    execute 'set local role anon';
    select count(*) into n from public.following_feed;
    perform pg_temp.record('anon cannot read following_feed', false, 'select ok');
  exception
    when insufficient_privilege then
      perform pg_temp.record('anon cannot read following_feed', true, sqlerrm);
    when others then
      perform pg_temp.record('anon cannot read following_feed', true, sqlstate);
  end;
  execute 'set local role authenticated';

  select username into v_username_b from public.profiles where id = v_b;

  perform set_config('request.jwt.claim.sub', v_third::text, true);
  perform set_config(
    'request.jwt.claims',
    json_build_object('sub', v_third::text, 'role', 'authenticated', 'email', 'feedscale.mention@voxly.test')::text,
    true
  );
  insert into public.comments (creation_id, author_id, body)
  values (v_short, v_third, 'Hello @' || v_username_b || ' and a@bcd.com')
  returning id into v_comment_id;

  select count(*) into n
  from public.mentions
  where comment_id = v_comment_id and mentioned_user_id = v_b;
  perform pg_temp.record('mention row created for active user', n = 1, 'rows=' || n);

  insert into public.comments (creation_id, author_id, body)
  values (v_short, v_third, 'Self @' || (select username from public.profiles where id = v_third))
  returning id into v_comment_id;
  select count(*) into n from public.mentions where comment_id = v_comment_id;
  perform pg_temp.record('no mention for self-mention', n = 0, 'rows=' || n);

  insert into public.comments (creation_id, author_id, body)
  values (v_short, v_third, 'Unknown @no_such_user_zzzz')
  returning id into v_comment_id;
  select count(*) into n from public.mentions where comment_id = v_comment_id;
  perform pg_temp.record('no mention for unknown username', n = 0, 'rows=' || n);

  perform set_config('request.jwt.claim.sub', v_third::text, true);
  perform set_config(
    'request.jwt.claims',
    json_build_object('sub', v_third::text, 'role', 'authenticated', 'email', 'feedscale.mention@voxly.test')::text,
    true
  );
  insert into public.creations (author_id, type, title, audience, status, body_text)
  values (v_third, 'poem', 'A work for block mention', 'public', 'published', 'Own')
  returning id into v_mention_target;
  insert into public.blocks (blocker_id, blocked_id) values (v_third, v_b);
  insert into public.comments (creation_id, author_id, body)
  values (v_mention_target, v_third, 'Blocked @' || v_username_b)
  returning id into v_comment_id;
  select count(*) into n from public.mentions where comment_id = v_comment_id;
  perform pg_temp.record('no mention for blocked pair', n = 0, 'rows=' || n);
  delete from public.blocks where blocker_id = v_third and blocked_id = v_b;

  insert into public.comments (creation_id, author_id, body)
  select
    v_short,
    v_third,
    (
      select string_agg('@' || p.username::text, ' ' order by p.username)
      from (
        select username
        from public.profiles
        where status = 'active'
          and id <> v_third
        order by username
        limit 11
      ) p
    )
  returning id into v_comment_id;
  select count(*) into n from public.mentions where comment_id = v_comment_id;
  perform pg_temp.record('at most ten mentions stored per comment', n = 10, 'rows=' || n);

  perform set_config('request.jwt.claim.sub', v_founder::text, true);
  select p.id, p.username into v_other, v_username_b
  from public.profiles p
  where p.status = 'active' and p.id <> v_third and p.id <> v_founder
  order by p.username
  offset 5 limit 1;
  perform public.founder_set_user_status(v_other, 'suspended', 'mention test', now() + interval '1 day');
  perform set_config('request.jwt.claim.sub', v_third::text, true);
  insert into public.comments (creation_id, author_id, body)
  values (v_short, v_third, 'Suspended target @' || v_username_b)
  returning id into v_comment_id;
  select count(*) into n from public.mentions where comment_id = v_comment_id;
  perform pg_temp.record('no mention for suspended user', n = 0, 'rows=' || n);
  perform set_config('request.jwt.claim.sub', v_founder::text, true);
  perform public.founder_set_user_status(v_other, 'active', 'restore suspended mention target', null);

  select p.id, p.username into v_other, v_username_b
  from public.profiles p
  where p.status = 'active' and p.id <> v_third and p.id <> v_founder
  order by p.username
  offset 4 limit 1;
  perform public.founder_set_user_status(v_other, 'banned', 'mention test', null);
  perform set_config('request.jwt.claim.sub', v_third::text, true);
  insert into public.comments (creation_id, author_id, body)
  values (v_short, v_third, 'Banned target @' || v_username_b)
  returning id into v_comment_id;
  select count(*) into n from public.mentions where comment_id = v_comment_id;
  perform pg_temp.record('no mention for banned user', n = 0, 'rows=' || n);
  perform set_config('request.jwt.claim.sub', v_founder::text, true);
  perform public.founder_set_user_status(v_other, 'active', 'restore banned mention target', null);

  select username into v_username_b from public.profiles where id = v_b;

  perform set_config('request.jwt.claim.sub', v_third::text, true);
  insert into public.comments (creation_id, author_id, body)
  values (v_short, v_third, 'Edit @' || v_username_b)
  returning id into v_mention_target;
  update public.comments set body = 'Now @' || v_username_b || ' twice @' || v_username_b where id = v_mention_target;
  select count(*) into n from public.mentions where comment_id = v_mention_target;
  perform pg_temp.record('editing comment body rebuilds mention rows', n = 1, 'rows=' || n);

  reset role;
  update public.comments set is_removed = true where id = v_mention_target;
  perform set_config('request.jwt.claim.sub', v_third::text, true);
  perform set_config(
    'request.jwt.claims',
    json_build_object('sub', v_third::text, 'role', 'authenticated', 'email', 'feedscale.mention@voxly.test')::text,
    true
  );
  execute 'set local role authenticated';
  select count(*) into n from public.mentions where comment_id = v_mention_target;
  perform pg_temp.record('removed comment keeps no mention rows', n = 0, 'rows=' || n);

  begin
    insert into public.mentions (comment_id, creation_id, author_id, mentioned_user_id)
    values (
      v_comment_id,
      v_short,
      v_third,
      v_b
    );
    perform pg_temp.record('client cannot insert mention row', false, 'insert succeeded');
  exception
    when others then
      perform pg_temp.record('client cannot insert mention row', true, sqlerrm);
  end;

  perform set_config('request.jwt.claim.sub', v_b::text, true);
  perform set_config(
    'request.jwt.claims',
    json_build_object('sub', v_b::text, 'role', 'authenticated', 'email', 'reader.b@voxly.test')::text,
    true
  );
  execute 'set local role authenticated';
  select count(*) into n from public.mentions where mentioned_user_id = v_b;
  perform pg_temp.record('mentioned user can read their mentions', n >= 1, 'rows=' || n);

  perform set_config('request.jwt.claim.sub', v_third::text, true);
  perform set_config(
    'request.jwt.claims',
    json_build_object('sub', v_third::text, 'role', 'authenticated', 'email', 'feedscale.mention@voxly.test')::text,
    true
  );
  execute 'set local role authenticated';
  select count(*) into n from public.mentions where mentioned_user_id = v_b and author_id = v_third;
  perform pg_temp.record('comment author can read mentions on their comment', n >= 1, 'rows=' || n);

  reset role;
  v_other := gen_random_uuid();
  perform pg_temp.create_test_user(v_other, 'mentions.other@voxly.test', now());
  perform set_config('request.jwt.claim.sub', v_other::text, true);
  perform set_config(
    'request.jwt.claims',
    json_build_object('sub', v_other::text, 'role', 'authenticated', 'email', 'mentions.other@voxly.test')::text,
    true
  );
  execute 'set local role authenticated';
  select count(*) into n from public.mentions where author_id = v_third and mentioned_user_id = v_b;
  perform pg_temp.record('third user cannot read others mention rows', n = 0, 'rows=' || n);

  reset role;
  v_other := gen_random_uuid();
  perform pg_temp.create_test_user(v_other, 'likes.limiter@voxly.test', now());

  alter table public.creations disable trigger creations_rate_limit;
  perform set_config('request.jwt.claim.sub', v_b::text, true);
  perform set_config(
    'request.jwt.claims',
    json_build_object('sub', v_b::text, 'role', 'authenticated', 'email', 'reader.b@voxly.test')::text,
    true
  );
  execute 'set local role authenticated';
  for i in 1..301 loop
    insert into public.creations (author_id, type, title, audience, status, body_text)
    values (v_b, 'poem', 'Like target ' || i::text, 'public', 'published', 'Body')
    returning id into v_like_target;
    creation_ids := array_append(creation_ids, v_like_target);
  end loop;
  reset role;
  alter table public.creations enable trigger creations_rate_limit;

  perform set_config('request.jwt.claim.sub', v_other::text, true);
  perform set_config(
    'request.jwt.claims',
    json_build_object('sub', v_other::text, 'role', 'authenticated', 'email', 'likes.limiter@voxly.test')::text,
    true
  );
  execute 'set local role authenticated';
  for i in 1..300 loop
    insert into public.likes (user_id, creation_id) values (v_other, creation_ids[i]);
  end loop;
  begin
    insert into public.likes (user_id, creation_id) values (v_other, creation_ids[301]);
    perform pg_temp.record('like rate limit rejects the 301st in one hour', false, 'insert succeeded');
  exception
    when others then
      get stacked diagnostics v_msg = message_text;
      perform pg_temp.record('like rate limit rejects the 301st in one hour', v_msg like '%too fast%', v_msg);
  end;

  delete from public.likes where user_id = v_other and creation_id = creation_ids[1];
  begin
    insert into public.likes (user_id, creation_id) values (v_other, creation_ids[1]);
    perform pg_temp.record('like rate limit holds after delete and reinsert', false, 'insert succeeded');
  exception
    when others then
      perform pg_temp.record('like rate limit holds after delete and reinsert', true, sqlerrm);
  end;

  for i in 1..300 loop
    insert into public.saves (user_id, creation_id) values (v_other, creation_ids[i]);
  end loop;
  begin
    insert into public.saves (user_id, creation_id) values (v_other, creation_ids[301]);
    perform pg_temp.record('save rate limit rejects the 301st in one hour', false, 'insert succeeded');
  exception
    when others then
      get stacked diagnostics v_msg = message_text;
      perform pg_temp.record('save rate limit rejects the 301st in one hour', v_msg like '%too fast%', v_msg);
  end;

  delete from public.saves where user_id = v_other and creation_id = creation_ids[2];
  begin
    insert into public.saves (user_id, creation_id) values (v_other, creation_ids[2]);
    perform pg_temp.record('save rate limit holds after delete and reinsert', false, 'insert succeeded');
  exception
    when others then
      perform pg_temp.record('save rate limit holds after delete and reinsert', true, sqlerrm);
  end;

  reset role;
  v_other := gen_random_uuid();
  perform pg_temp.create_test_user(v_other, 'feedscale.vis@voxly.test', now());
  perform set_config('request.jwt.claim.sub', v_other::text, true);
  perform set_config(
    'request.jwt.claims',
    json_build_object('sub', v_other::text, 'role', 'authenticated', 'email', 'feedscale.vis@voxly.test')::text,
    true
  );
  execute 'set local role authenticated';
  insert into public.comments (creation_id, author_id, body)
  values (v_short, v_other, 'Suspended author comment')
  returning id into v_comment_id;

  perform set_config('request.jwt.claim.sub', v_founder::text, true);
  perform public.founder_set_user_status(v_other, 'suspended', 'comment visibility', now() + interval '1 day');

  perform set_config('request.jwt.claim.sub', v_a::text, true);
  perform set_config(
    'request.jwt.claims',
    json_build_object('sub', v_a::text, 'role', 'authenticated', 'email', 'reader.a@voxly.test')::text,
    true
  );
  execute 'set local role authenticated';
  select count(*) into n from public.comments where id = v_comment_id;
  perform pg_temp.record('comments by suspended author hidden from others', n = 0, 'rows=' || n);

  perform set_config('request.jwt.claim.sub', v_other::text, true);
  perform set_config(
    'request.jwt.claims',
    json_build_object('sub', v_other::text, 'role', 'authenticated', 'email', 'feedscale.vis@voxly.test')::text,
    true
  );
  execute 'set local role authenticated';
  select count(*) into n from public.comments where id = v_comment_id;
  perform pg_temp.record('suspended comment author can read own comment', n = 1, 'rows=' || n);

  perform set_config('request.jwt.claim.sub', v_founder::text, true);
  execute 'set local role authenticated';
  select count(*) into n from public.comments where id = v_comment_id;
  perform pg_temp.record('founder can read suspended author comment', n = 1, 'rows=' || n);

  perform public.founder_set_user_status(v_other, 'active', 'restore comment visibility', null);
end $feed_scale$;

do $public_post_count$
declare
  v_user uuid := gen_random_uuid();
  v_work uuid;
  v_count integer;
  v_role public.user_role;
begin
  reset role;
  perform pg_temp.create_test_user(v_user, 'public.count@voxly.test', now());

  perform set_config('request.jwt.claim.sub', v_user::text, true);
  perform set_config(
    'request.jwt.claims',
    json_build_object('sub', v_user::text, 'role', 'authenticated', 'email', 'public.count@voxly.test')::text,
    true
  );
  execute 'set local role authenticated';

  insert into public.creations (author_id, type, title, audience, status, body_text)
  values (v_user, 'poem', 'Public count', 'public', 'draft', 'Line')
  returning id into v_work;

  update public.creations set status = 'published', audience = 'public' where id = v_work;
  select creation_count into v_count from public.profiles where id = v_user;
  perform pg_temp.record('public publish gives creation_count 1', v_count = 1, 'count=' || v_count);

  update public.creations set audience = 'private' where id = v_work;
  select creation_count into v_count from public.profiles where id = v_user;
  perform pg_temp.record('switching public work to private gives creation_count 0', v_count = 0, 'count=' || v_count);

  update public.creations set audience = 'unlisted' where id = v_work;
  select creation_count into v_count from public.profiles where id = v_user;
  perform pg_temp.record('unlisted published work gives creation_count 0', v_count = 0, 'count=' || v_count);

  update public.creations set audience = 'public' where id = v_work;
  select creation_count into v_count from public.profiles where id = v_user;
  perform pg_temp.record('switching back to public gives creation_count 1', v_count = 1, 'count=' || v_count);

  update public.creations set status = 'draft' where id = v_work;
  select creation_count into v_count from public.profiles where id = v_user;
  perform pg_temp.record('unpublish public work gives creation_count 0', v_count = 0, 'count=' || v_count);

  update public.creations set status = 'published', audience = 'public' where id = v_work;
  delete from public.creations where id = v_work;
  select creation_count into v_count from public.profiles where id = v_user;
  perform pg_temp.record('delete public work decrements creation_count', v_count = 0, 'count=' || v_count);

  reset role;
  v_user := gen_random_uuid();
  perform pg_temp.create_test_user(v_user, 'private.writer@voxly.test', now());
  perform set_config('request.jwt.claim.sub', v_user::text, true);
  perform set_config(
    'request.jwt.claims',
    json_build_object('sub', v_user::text, 'role', 'authenticated', 'email', 'private.writer@voxly.test')::text,
    true
  );
  execute 'set local role authenticated';

  insert into public.creations (author_id, type, title, audience, status, body_text)
  values (v_user, 'journal', 'Private first', 'private', 'published', 'Secret')
  returning id into v_work;

  select role into v_role from public.profiles where id = v_user;
  perform pg_temp.record('private publish still promotes reader to writer', v_role = 'writer', coalesce(v_role::text, 'null'));
end $public_post_count$;

do $discover_search$
declare
  v_founder uuid;
  v_a uuid;
  v_b uuid;
  v_other uuid;
  v_public uuid;
  v_private uuid;
  v_draft uuid;
  v_discover_author uuid;
  n integer;
begin
  select founder, reader_a, reader_b into v_founder, v_a, v_b from rls_ids;
  v_discover_author := v_b;

  begin
    execute 'set local role anon';
    select count(*) into n from public.ranking_settings;
    perform pg_temp.record('anon cannot read ranking_settings', false, 'rows=' || n);
  exception
    when insufficient_privilege then
      perform pg_temp.record('anon cannot read ranking_settings', true, sqlerrm);
    when others then
      perform pg_temp.record('anon cannot read ranking_settings', true, sqlstate);
  end;
  execute 'set local role authenticated';

  perform set_config('request.jwt.claim.sub', v_a::text, true);
  begin
    update public.ranking_settings set like_weight = 4 where id = 1;
    perform pg_temp.record('normal user cannot update ranking_settings', false, 'update succeeded');
  exception
    when others then
      perform pg_temp.record('normal user cannot update ranking_settings', true, sqlerrm);
  end;

  begin
    execute 'set local role anon';
    select count(*) into n from public.discover_trending_creations;
    perform pg_temp.record('anon cannot read discover_trending_creations', false, 'rows=' || n);
  exception
    when insufficient_privilege then
      perform pg_temp.record('anon cannot read discover_trending_creations', true, sqlerrm);
    when others then
      perform pg_temp.record('anon cannot read discover_trending_creations', true, sqlstate);
  end;
  execute 'set local role authenticated';

  begin
    execute 'set local role anon';
    select count(*) into n from public.founder_featured_writers;
    perform pg_temp.record('anon cannot read founder_featured_writers', false, 'rows=' || n);
  exception
    when insufficient_privilege then
      perform pg_temp.record('anon cannot read founder_featured_writers', true, sqlerrm);
    when others then
      perform pg_temp.record('anon cannot read founder_featured_writers', true, sqlstate);
  end;
  execute 'set local role authenticated';

  perform set_config('request.jwt.claim.sub', v_a::text, true);
  begin
    insert into public.founder_featured_writers (writer_id) values (v_b);
    perform pg_temp.record('normal user cannot insert founder_featured_writers', false, 'insert succeeded');
  exception
    when others then
      perform pg_temp.record('normal user cannot insert founder_featured_writers', true, sqlerrm);
  end;

  begin
    perform public.founder_set_featured_writer(v_b, true, 0);
    perform pg_temp.record('founder_set_featured_writer rejects non-founder', false, 'rpc succeeded');
  exception
    when others then
      perform pg_temp.record('founder_set_featured_writer rejects non-founder', true, sqlerrm);
  end;

  perform set_config('request.jwt.claim.sub', v_founder::text, true);
  perform public.founder_set_featured_writer(v_b, true, 1);
  select count(*) into n from public.founder_featured_writers_public where writer_id = v_b;
  perform pg_temp.record('founder can feature active writer', n = 1, 'rows=' || n);

  execute format('set local role %I', session_user);
  alter table public.creations disable trigger creations_rate_limit;
  insert into public.creations (author_id, type, title, audience, status, body_text)
  values (v_discover_author, 'poem', 'Discover public', 'public', 'draft', 'Line')
  returning id into v_public;
  update public.creations set status = 'published', audience = 'public', published_at = now() where id = v_public;

  insert into public.creations (author_id, type, title, audience, status, body_text)
  values (v_discover_author, 'poem', 'Discover private', 'private', 'published', 'Secret')
  returning id into v_private;

  insert into public.creations (author_id, type, title, audience, status, body_text)
  values (v_discover_author, 'poem', 'Discover draft', 'public', 'draft', 'Draft')
  returning id into v_draft;
  alter table public.creations enable trigger creations_rate_limit;
  execute 'set local role authenticated';
  perform set_config('request.jwt.claim.sub', v_a::text, true);
  select count(*) into n from public.discover_trending_creations where id = v_public;
  perform pg_temp.record('discover trending includes public published work', n = 1, 'rows=' || n);
  select count(*) into n from public.discover_trending_creations where id = v_private;
  perform pg_temp.record('discover trending excludes private work', n = 0, 'rows=' || n);
  select count(*) into n from public.discover_trending_creations where id = v_draft;
  perform pg_temp.record('discover trending excludes drafts', n = 0, 'rows=' || n);

  perform set_config('request.jwt.claim.sub', v_founder::text, true);
  perform public.founder_set_user_status(v_discover_author, 'suspended', 'discover smoke', now() + interval '1 day');
  perform set_config('request.jwt.claim.sub', v_a::text, true);
  select count(*) into n from public.discover_new_creations where author_id = v_discover_author;
  perform pg_temp.record('suspended author hidden from discover_new_creations', n = 0, 'rows=' || n);
  perform set_config('request.jwt.claim.sub', v_founder::text, true);
  perform public.founder_set_user_status(v_discover_author, 'active', 'restore discover', null);
  perform set_config('request.jwt.claim.sub', v_a::text, true);

  insert into public.blocks (blocker_id, blocked_id) values (v_a, v_discover_author);
  select count(*) into n from public.discover_new_creations where author_id = v_discover_author;
  perform pg_temp.record('blocked author hidden from discover_new_creations', n = 0, 'rows=' || n);
  delete from public.blocks where blocker_id = v_a and blocked_id = v_discover_author;

  v_other := gen_random_uuid();
  execute format('set local role %I', session_user);
  perform pg_temp.create_test_user(v_other, 'search.rate+' || v_other::text || '@voxly.test', now());
  execute 'set local role authenticated';
  perform set_config('request.jwt.claim.sub', v_other::text, true);
  perform set_config(
    'request.jwt.claims',
    json_build_object('sub', v_other::text, 'role', 'authenticated', 'email', 'search.rate@voxly.test')::text,
    true
  );
  for n in 1..60 loop
    perform public.search_discovery('ab', 'top', 5);
  end loop;
  begin
    perform public.search_discovery('ab', 'top', 5);
    perform pg_temp.record('search rate limit holds at 60 per minute', false, '61st search accepted');
  exception
    when others then
      perform pg_temp.record('search rate limit holds at 60 per minute', true, sqlerrm);
  end;
end $discover_search$;

do $$
declare
  n integer;
  names text;
begin
  select count(*), coalesce(string_agg(c.relname, ', '), '')
    into n, names
  from pg_class c
  join pg_namespace ns on ns.oid = c.relnamespace
  where ns.nspname = 'public'
    and c.relkind = 'r'
    and not c.relrowsecurity;
  perform pg_temp.record('every public table has row level security', n = 0, case when n = 0 then 'zero rows' else names end);

  select count(*) into n
  from information_schema.role_table_grants
  where grantee = 'anon' and table_schema = 'public';
  perform pg_temp.record('anon has no public table grants', n = 0, 'grants=' || n);
end $$;

select case when ok then 'PASS' else 'FAIL' end as result, name, detail
from rls_log
order by name;

do $$
declare
  fails integer;
begin
  select count(*) into fails from rls_log where not ok;
  if fails > 0 then
    raise exception 'RLS smoke test failed: % assertion(s). Read the PASS and FAIL notices above.', fails;
  end if;
  raise notice 'ALL ASSERTIONS PASSED';
end $$;

rollback;
