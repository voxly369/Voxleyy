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
