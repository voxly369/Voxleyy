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

  execute format('set local role %I', session_user);
  update public.profiles set beta_access_granted = true where id = p_id;
end $$;

insert into rls_ids (founder, reader_a, reader_b)
values (gen_random_uuid(), gen_random_uuid(), gen_random_uuid());

select pg_temp.create_test_user(founder, 'voxly369@gmail.com', now()) from rls_ids;
select pg_temp.create_test_user(reader_a, 'reader.a@voxly.test', now()) from rls_ids;
select pg_temp.create_test_user(reader_b, 'reader.b@voxly.test', now()) from rls_ids;

do $$
begin
  execute format('set local role %I', session_user);
  update public.profiles set beta_access_granted = true;
end $$;

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
  perform set_config('request.jwt.claim.sub', v_b::text, true);
  perform set_config(
    'request.jwt.claims',
    json_build_object('sub', v_b::text, 'role', 'authenticated', 'email', 'reader.b@voxly.test')::text,
    true
  );
  insert into public.reports (target_type, target_id, reported_user_id, reason)
  values ('creation', v_reported, v_a, 'spam');
  perform set_config('request.jwt.claim.sub', v_a::text, true);
  perform set_config(
    'request.jwt.claims',
    json_build_object('sub', v_a::text, 'role', 'authenticated', 'email', 'reader.a@voxly.test')::text,
    true
  );
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

  begin
    execute 'set local role anon';
    select count(*) into n from public.founder_featured_writers_public;
    perform pg_temp.record('anon cannot read founder_featured_writers_public', false, 'rows=' || n);
  exception
    when insufficient_privilege then
      perform pg_temp.record('anon cannot read founder_featured_writers_public', true, sqlerrm);
    when others then
      perform pg_temp.record('anon cannot read founder_featured_writers_public', true, sqlstate);
  end;
  execute 'set local role authenticated';

  perform set_config('request.jwt.claim.sub', v_a::text, true);
  insert into public.blocks (blocker_id, blocked_id) values (v_a, v_b);
  select count(*) into n from public.founder_featured_writers_public where writer_id = v_b;
  perform pg_temp.record('featured writer hidden when blocked by caller', n = 0, 'rows=' || n);
  delete from public.blocks where blocker_id = v_a and blocked_id = v_b;

  perform set_config('request.jwt.claim.sub', v_founder::text, true);
  perform public.founder_set_user_status(v_b, 'suspended', 'featured smoke', now() + interval '1 day');
  perform set_config('request.jwt.claim.sub', v_a::text, true);
  select count(*) into n from public.founder_featured_writers_public where writer_id = v_b;
  perform pg_temp.record('featured writer view excludes suspended users', n = 0, 'rows=' || n);
  perform set_config('request.jwt.claim.sub', v_founder::text, true);
  perform public.founder_set_user_status(v_b, 'active', 'restore featured', null);
  perform set_config('request.jwt.claim.sub', v_a::text, true);

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

do $library_reading$
declare
  v_a uuid;
  v_b uuid;
  v_post uuid;
  v_private uuid;
  n integer;
begin
  select reader_a, reader_b into v_a, v_b from rls_ids;
  perform set_config('request.jwt.claim.sub', v_a::text, true);

  begin
    execute 'set local role anon';
    select count(*) into n from public.post_reading_progress;
    perform pg_temp.record('anon cannot read post_reading_progress', false, 'rows=' || n);
  exception
    when insufficient_privilege then
      perform pg_temp.record('anon cannot read post_reading_progress', true, sqlerrm);
    when others then
      perform pg_temp.record('anon cannot read post_reading_progress', true, sqlstate);
  end;
  execute 'set local role authenticated';

  perform set_config('request.jwt.claim.sub', v_b::text, true);
  begin
    insert into public.reader_collections (user_id, name) values (v_a, 'stolen');
    perform pg_temp.record('user B cannot insert reader_collections for user A', false, 'insert succeeded');
  exception
    when others then
      perform pg_temp.record('user B cannot insert reader_collections for user A', true, sqlerrm);
  end;

  perform set_config('request.jwt.claim.sub', v_a::text, true);
  select id into v_post from public.creations where status = 'published' and audience = 'public' limit 1;
  select id into v_private from public.creations where audience = 'private' and status = 'published' limit 1;

  begin
    insert into public.post_reading_progress (user_id, creation_id, percent, position)
    values (v_a, v_private, 10, 0);
    perform pg_temp.record('progress insert rejects non-feed-visible creation', false, 'insert succeeded');
  exception
    when others then
      perform pg_temp.record('progress insert rejects non-feed-visible creation', true, sqlerrm);
  end;

  insert into public.post_reading_progress (user_id, creation_id, percent, position)
  values (v_a, v_post, 12, 1);
  select count(*) into n from public.library_reading_history where creation_id = v_post;
  perform pg_temp.record('library_reading_history shows visible progress', n = 1, 'rows=' || n);

  execute format('set local role %I', session_user);
  update public.creations set audience = 'private' where id = v_post;
  execute 'set local role authenticated';
  perform set_config('request.jwt.claim.sub', v_a::text, true);
  select count(*) into n from public.library_reading_history where creation_id = v_post;
  perform pg_temp.record('library history hides when creation becomes private', n = 0, 'rows=' || n);
  execute format('set local role %I', session_user);
  update public.creations set audience = 'public' where id = v_post;
  execute 'set local role authenticated';
  perform set_config('request.jwt.claim.sub', v_a::text, true);
end $library_reading$;

do $reader_annotations$
declare
  v_a uuid;
  v_b uuid;
  v_post uuid;
  v_private uuid;
  v_blocked_author uuid;
  n integer;
  h_id uuid;
begin
  select reader_a, reader_b into v_a, v_b from rls_ids;
  select id into v_post from public.creations where status = 'published' and audience = 'public' limit 1;
  select id into v_private from public.creations where audience = 'private' and status = 'published' limit 1;
  select author_id into v_blocked_author from public.creations where id = v_post;

  perform set_config('request.jwt.claim.sub', v_a::text, true);

  begin
    execute 'set local role anon';
    select count(*) into n from public.reader_highlights;
    perform pg_temp.record('anon cannot read reader_highlights', false, 'rows=' || n);
  exception
    when insufficient_privilege then
      perform pg_temp.record('anon cannot read reader_highlights', true, sqlerrm);
    when others then
      perform pg_temp.record('anon cannot read reader_highlights', true, sqlstate);
  end;
  execute 'set local role authenticated';

  perform set_config('request.jwt.claim.sub', v_b::text, true);
  begin
    insert into public.reader_highlights (
      user_id, creation_id, start_paragraph, start_char, end_paragraph, end_char, quote, colour
    ) values (v_a, v_post, 0, 0, 0, 4, 'test', 'yellow');
    perform pg_temp.record('user B cannot insert reader_highlights for user A', false, 'insert succeeded');
  exception
    when others then
      perform pg_temp.record('user B cannot insert reader_highlights for user A', true, sqlerrm);
  end;

  perform set_config('request.jwt.claim.sub', v_a::text, true);
  begin
    insert into public.reader_highlights (
      user_id, creation_id, start_paragraph, start_char, end_paragraph, end_char, quote, colour
    ) values (v_a, v_private, 0, 0, 0, 4, 'hidden', 'yellow');
    perform pg_temp.record('highlight insert rejects non-feed-visible creation', false, 'insert succeeded');
  exception
    when others then
      perform pg_temp.record('highlight insert rejects non-feed-visible creation', true, sqlerrm);
  end;

  insert into public.reader_highlights (
    user_id, creation_id, start_paragraph, start_char, end_paragraph, end_char, quote, colour
  ) values (v_a, v_post, 0, 0, 0, 4, 'visible', 'yellow')
  returning id into h_id;

  select count(*) into n from public.library_highlights where id = h_id;
  perform pg_temp.record('library_highlights shows visible highlight', n = 1, 'rows=' || n);

  insert into public.blocks (blocker_id, blocked_id) values (v_a, v_blocked_author);
  begin
    insert into public.reader_highlights (
      user_id, creation_id, start_paragraph, start_char, end_paragraph, end_char, quote, colour
    ) values (v_a, v_post, 0, 1, 0, 5, 'blocked', 'blue');
    perform pg_temp.record('highlight insert rejects blocked author work', false, 'insert succeeded');
  exception
    when others then
      perform pg_temp.record('highlight insert rejects blocked author work', true, sqlerrm);
  end;
  delete from public.blocks where blocker_id = v_a and blocked_id = v_blocked_author;

  execute format('set local role %I', session_user);
  update public.creations set audience = 'private' where id = v_post;
  execute 'set local role authenticated';
  perform set_config('request.jwt.claim.sub', v_a::text, true);
  select count(*) into n from public.library_highlights where id = h_id;
  perform pg_temp.record('library highlights hide when creation becomes private', n = 0, 'rows=' || n);
  execute format('set local role %I', session_user);
  update public.creations set audience = 'public' where id = v_post;
  execute 'set local role authenticated';
  perform set_config('request.jwt.claim.sub', v_a::text, true);

  insert into public.reader_bookmarks (user_id, creation_id, paragraph, paragraph_offset)
  values (v_a, v_post, 1, 0);
  perform set_config('request.jwt.claim.sub', v_b::text, true);
  select count(*) into n from public.reader_bookmarks where user_id = v_a;
  perform pg_temp.record('user B cannot read user A bookmarks', n = 0, 'rows=' || n);
end $reader_annotations$;

-- ---------------------------------------------------------------------------
-- Book builder (11A): entitlements, chapter bodies, limits
-- ---------------------------------------------------------------------------

do $book_builder$
declare
  v_author uuid;
  v_reader uuid;
  v_book uuid;
  v_ch_paid uuid;
  v_ch_sample uuid;
  n integer;
begin
  select reader_a, reader_b into v_author, v_reader from rls_ids;
  execute format('set local role %I', session_user);
  alter table public.creations disable trigger creations_rate_limit;
  insert into public.creations (id, author_id, type, title, language, audience, status, body_text)
  values (
    'bb000000-0000-0000-0000-000000000001',
    v_author,
    'book',
    'Paid smoke book',
    'en',
    'public',
    'unlisted',
    ''
  );
  insert into public.books (id, author_id, description, sale_model, price_cents, currency, rental_days)
  values (
    'bb000000-0000-0000-0000-000000000001',
    v_author,
    'Desc',
    'purchase',
    499,
    'GBP',
    null
  );
  insert into public.chapters (id, book_id, position, title, body_text, status, is_sample)
  values (
    'cc000000-0000-0000-0000-000000000001',
    'bb000000-0000-0000-0000-000000000001',
    1,
    'Paid chapter',
    'Secret paid chapter body',
    'published',
    false
  )
  returning id into v_ch_paid;
  insert into public.chapters (id, book_id, position, title, body_text, status, is_sample)
  values (
    'cc000000-0000-0000-0000-000000000002',
    'bb000000-0000-0000-0000-000000000001',
    2,
    'Sample chapter',
    'Sample readable body',
    'published',
    true
  )
  returning id into v_ch_sample;

  execute 'set local role authenticated';
  perform set_config('request.jwt.claim.sub', v_reader::text, true);
  select count(*) into n from public.chapters where id = v_ch_paid;
  perform pg_temp.record('non-entitled cannot read paid chapter body', n = 0, 'rows=' || n);
  select count(*) into n from public.chapters where id = v_ch_sample;
  perform pg_temp.record('non-entitled can read sample chapter body', n = 1, 'rows=' || n);
  perform set_config('request.jwt.claim.sub', v_author::text, true);
  select count(*) into n from public.book_chapters_toc where book_id = 'bb000000-0000-0000-0000-000000000001';
  perform pg_temp.record('author can read book TOC view', n >= 2, 'rows=' || n);
  perform set_config('request.jwt.claim.sub', v_reader::text, true);

  begin
    insert into public.book_entitlements (user_id, book_id, kind, starts_at)
    values (v_reader, 'bb000000-0000-0000-0000-000000000001', 'purchase', now());
    perform pg_temp.record('client cannot insert entitlements directly', false, 'should have failed');
  exception when others then
    perform pg_temp.record('client cannot insert entitlements directly', true, sqlerrm);
  end;

  execute format('set local role %I', session_user);
  insert into public.creations (id, author_id, type, title, language, audience, status, body_text)
  values (
    'bb000000-0000-0000-0000-000000000002',
    v_author,
    'book',
    'Free smoke book',
    'en',
    'public',
    'published',
    ''
  );
  insert into public.books (id, author_id, description, sale_model, price_cents)
  values ('bb000000-0000-0000-0000-000000000002', v_author, 'Free', 'free', 0);

  execute 'set local role authenticated';
  perform set_config('request.jwt.claim.sub', v_reader::text, true);
  perform public.claim_free_book('bb000000-0000-0000-0000-000000000002');
  select count(*) into n from public.library_books where user_id = v_reader and book_id = 'bb000000-0000-0000-0000-000000000002';
  perform pg_temp.record('claim_free_book adds library_books row', n = 1, 'rows=' || n);

  execute format('set local role %I', session_user);
  begin
    update public.creations set status = 'published' where id = 'bb000000-0000-0000-0000-000000000001';
    perform pg_temp.record('paid book cannot publish while payments disabled', false, 'should fail');
  exception when others then
    perform pg_temp.record('paid book cannot publish while payments disabled', true, sqlerrm);
  end;
end $book_builder$;

-- ---------------------------------------------------------------------------
-- Moderation (12A): mutes, hidden words, reports, appeals, Founder RPCs
-- ---------------------------------------------------------------------------

do $moderation_12a$
declare
  v_founder uuid;
  v_a uuid;
  v_b uuid;
  v_post uuid;
  v_comment uuid;
  v_report uuid;
  v_audit uuid;
  v_appeal uuid;
  n integer;
  v_detail text;
  v_blocked boolean;
  v_ok boolean;
  v_text text;
begin
  select founder, reader_a, reader_b into v_founder, v_a, v_b from rls_ids;

  execute format('set local role %I', session_user);
  alter table public.creations disable trigger creations_rate_limit;
  alter table public.comments disable trigger comments_rate_limit;
  insert into public.creations (author_id, type, title, language, audience, status, body_text, published_at)
  values (v_b, 'poem', 'Mute feed post', 'en', 'public', 'published', 'Visible until muted', now())
  returning id into v_post;
  insert into public.creations (author_id, type, title, language, audience, status, body_text, published_at)
  values (v_b, 'poem', 'Comment host', 'en', 'public', 'published', 'Host', now());
  insert into public.comments (creation_id, author_id, body)
  select id, v_b, 'badword spam comment' from public.creations where author_id = v_b and title = 'Comment host'
  returning id into v_comment;
  alter table public.comments enable trigger comments_rate_limit;
  execute 'set local role authenticated';
  perform set_config('request.jwt.claim.sub', v_a::text, true);
  perform set_config(
    'request.jwt.claims',
    json_build_object('sub', v_a::text, 'role', 'authenticated', 'email', 'reader.a@voxly.test')::text,
    true
  );

  select count(*) into n from public.feed_creations where id = v_post;
  perform pg_temp.record('feed shows author before mute', n = 1, 'rows=' || n);

  insert into public.hidden_words (user_id, word) values (v_a, 'badword');
  select count(*) into n from public.comments where id = v_comment;
  perform pg_temp.record('hidden word still returns comment for collapse UI', n = 1, 'rows=' || n);
  select public.comment_contains_hidden_word(v_a, 'this has badword in it') into v_ok;
  perform pg_temp.record('comment_contains_hidden_word matches whole word', v_ok, 'fn=' || v_ok);
  execute format('set local role %I', session_user);
  update public.creations set body_text = 'Visible badword in body' where id = v_post;
  execute 'set local role authenticated';
  perform set_config('request.jwt.claim.sub', v_a::text, true);
  select coalesce(body_excerpt, '') into v_text from public.feed_creations where id = v_post;
  perform pg_temp.record(
    'hidden word redacts feed excerpt when body matches',
    coalesce(v_text, '') = '',
    'excerpt=' || coalesce(v_text, '<null>')
  );

  insert into public.mutes (user_id, muted_user_id) values (v_a, v_b);
  select count(*) into n from public.feed_creations where id = v_post;
  perform pg_temp.record('feed hides muted author', n = 0, 'rows=' || n);

  begin
    insert into public.mutes (user_id, muted_user_id) values (v_b, v_b);
    perform pg_temp.record('cannot mute yourself', false, 'insert succeeded');
  exception when others then
    perform pg_temp.record('cannot mute yourself', true, sqlerrm);
  end;

  perform set_config('request.jwt.claim.sub', v_b::text, true);
  begin
    insert into public.reports (target_type, target_id, reason)
    values ('profile', v_b, 'spam');
    perform pg_temp.record('cannot report yourself', false, 'insert succeeded');
  exception when others then
    perform pg_temp.record('cannot report yourself', true, sqlerrm);
  end;

  perform set_config('request.jwt.claim.sub', v_a::text, true);
  perform set_config(
    'request.jwt.claims',
    json_build_object('sub', v_a::text, 'role', 'authenticated', 'email', 'reader.a@voxly.test')::text,
    true
  );

  insert into public.reports (target_type, target_id, reported_user_id, reason)
  values ('creation', v_post, v_b, 'spam')
  returning id into v_report;

  begin
    insert into public.reports (target_type, target_id, reported_user_id, reason)
    values ('creation', v_post, v_b, 'harassment');
    perform pg_temp.record('duplicate report friendly message', false, 'second insert succeeded');
  exception when others then
    perform pg_temp.record(
      'duplicate report friendly message',
      sqlerrm = 'You already reported this',
      sqlerrm
    );
  end;

  perform set_config('request.jwt.claim.sub', v_a::text, true);
  begin
    insert into public.warnings (user_id, message, created_by)
    values (v_b, 'Direct insert', v_a);
    perform pg_temp.record('client cannot insert warnings directly', false, 'insert succeeded');
  exception when others then
    perform pg_temp.record('client cannot insert warnings directly', true, sqlerrm);
  end;

  perform set_config('request.jwt.claim.sub', v_founder::text, true);
  perform set_config(
    'request.jwt.claims',
    json_build_object('sub', v_founder::text, 'role', 'authenticated', 'email', 'voxly369@gmail.com')::text,
    true
  );

  perform public.dismiss_report(v_report, 'Not a violation');
  select status::text into v_detail from public.reports where id = v_report;
  perform pg_temp.record('dismiss_report closes report', v_detail = 'dismissed', coalesce(v_detail, 'null'));

  select count(*) into n from public.moderation_actions where report_id = v_report and action = 'dismiss';
  perform pg_temp.record('dismiss_report writes audit row', n = 1, 'rows=' || n);

  insert into public.reports (target_type, target_id, reported_user_id, reason)
  values ('comment', v_comment, v_b, 'inappropriate')
  returning id into v_report;

  perform public.remove_content('comment', v_comment, 'Removed in smoke test', v_report);
  select is_removed into v_blocked from public.comments where id = v_comment;
  perform pg_temp.record('remove_content marks comment removed', v_blocked, 'is_removed=' || v_blocked);

  perform public.restore_content('comment', v_comment, 'Restored in smoke test', null);
  select is_removed into v_blocked from public.comments where id = v_comment;
  perform pg_temp.record('restore_content clears removal', not v_blocked, 'is_removed=' || v_blocked);

  perform public.warn_user(v_b, 'Please follow community rules.', 'Official warning', null);
  select count(*) into n from public.warnings where user_id = v_b;
  perform pg_temp.record('warn_user inserts warning row', n >= 1, 'rows=' || n);

  perform public.suspend_user(v_b, 7, 'Smoke suspension', null);
  select status::text into v_detail from public.profiles where id = v_b;
  perform pg_temp.record('suspend_user sets suspended status', v_detail = 'suspended', coalesce(v_detail, 'null'));
  perform public.unban_user(v_b, 'Lift suspension', null);

  select id into v_audit from public.moderation_actions
  where target_user_id = v_b and action = 'remove' order by created_at desc limit 1;

  perform set_config('request.jwt.claim.sub', v_b::text, true);
  perform set_config(
    'request.jwt.claims',
    json_build_object('sub', v_b::text, 'role', 'authenticated', 'email', 'reader.b@voxly.test')::text,
    true
  );
  insert into public.appeals (user_id, moderation_action_id, message)
  values (v_b, v_audit, 'Please restore my comment.')
  returning id into v_appeal;

  perform set_config('request.jwt.claim.sub', v_founder::text, true);
  perform set_config(
    'request.jwt.claims',
    json_build_object('sub', v_founder::text, 'role', 'authenticated', 'email', 'voxly369@gmail.com')::text,
    true
  );
  perform public.decide_appeal(v_appeal, 'overturned', 'Appeal granted in smoke test');

  select count(*) into n from public.founder_report_queue;
  perform pg_temp.record('founder_report_queue readable by founder', n >= 0, 'rows=' || n);

  select jsonb_array_length(public.founder_user_search('reader'))::integer into n;
  perform pg_temp.record('founder_user_search returns matches', n >= 1, 'matches=' || n);

  perform set_config('request.jwt.claim.sub', v_a::text, true);
  begin
    select count(*) into n from public.founder_report_queue;
    perform pg_temp.record('non-founder sees empty report queue', n = 0, 'rows=' || n);
  exception when others then
    perform pg_temp.record('non-founder sees empty report queue', true, sqlerrm);
  end;

  delete from public.mutes where user_id = v_a and muted_user_id = v_b;
  delete from public.hidden_words where user_id = v_a and word = 'badword';
end $moderation_12a$;

-- Book builder (11B): reorder_book_chapters RPC
do $book_builder_11b$
declare
  v_author uuid;
  v_book uuid;
  v_c1 uuid;
  v_c2 uuid;
  pos1 integer;
  pos2 integer;
begin
  select reader_a into v_author from rls_ids;
  execute format('set local role %I', session_user);
  alter table public.creations disable trigger creations_rate_limit;
  insert into public.creations (id, author_id, type, title, language, audience, status, body_text)
  values (
    'bb000000-0000-0000-0000-000000000003',
    v_author,
    'book',
    'Reorder book',
    'en',
    'private',
    'draft',
    ''
  );
  insert into public.books (id, author_id, description, sale_model, price_cents)
  values ('bb000000-0000-0000-0000-000000000003', v_author, 'Reorder', 'free', 0);
  insert into public.chapters (id, book_id, position, title, body_text, status)
  values (
    'cc000000-0000-0000-0000-000000000101',
    'bb000000-0000-0000-0000-000000000003',
    1,
    'First',
    'A',
    'draft'
  )
  returning id into v_c1;
  insert into public.chapters (id, book_id, position, title, body_text, status)
  values (
    'cc000000-0000-0000-0000-000000000102',
    'bb000000-0000-0000-0000-000000000003',
    2,
    'Second',
    'B',
    'draft'
  )
  returning id into v_c2;

  execute 'set local role authenticated';
  perform set_config('request.jwt.claim.sub', v_author::text, true);
  perform public.reorder_book_chapters(
    'bb000000-0000-0000-0000-000000000003',
    array[v_c2, v_c1]::uuid[]
  );
  select position into pos1 from public.chapters where id = v_c2;
  select position into pos2 from public.chapters where id = v_c1;
  perform pg_temp.record('reorder_book_chapters swaps positions', pos1 = 1 and pos2 = 2, 'pos=' || pos1 || ',' || pos2);
end $book_builder_11b$;

-- Prompt 13A: notifications RLS and trigger smoke (requires 20261027000001_notifications_13a.sql).
do $notifications_13a$
declare
  v_a uuid;
  v_b uuid;
  v_note uuid;
  v_count integer;
begin
  select reader_a, reader_b into v_a, v_b from rls_ids limit 1;
  if v_a is null or v_b is null then
    perform pg_temp.record('notifications 13A skipped', true, 'missing rls_ids readers');
    return;
  end if;

  execute 'set local role authenticated';
  perform set_config('request.jwt.claim.sub', v_a::text, true);

  begin
    insert into public.notifications (recipient_id, type, actor_id)
    values (v_a, 'like', v_b);
    perform pg_temp.record('notifications insert blocked for authenticated', false, 'insert succeeded');
  exception when insufficient_privilege then
    perform pg_temp.record('notifications insert blocked for authenticated', true, 'insufficient_privilege');
  when others then
    perform pg_temp.record('notifications insert blocked for authenticated', true, sqlerrm);
  end;

  perform set_config('request.jwt.claim.sub', v_b::text, true);
  select public.create_notification(
    v_a, v_b, 'comment', 'creation', (select id from public.creations limit 1), '{}'::jsonb
  ) into v_note;

  perform set_config('request.jwt.claim.sub', v_a::text, true);
  update public.notifications set read_at = now() where id = v_note and recipient_id = v_a;
  get diagnostics v_count = row_count;
  perform pg_temp.record('notification owner can mark read', v_count = 1, 'row_count=' || v_count);

  perform set_config('request.jwt.claim.sub', v_b::text, true);
  update public.notifications set read_at = now() where id = v_note and recipient_id = v_a;
  get diagnostics v_count = row_count;
  perform pg_temp.record('cross-user notification read blocked', v_count = 0, 'row_count=' || v_count);

  perform set_config('request.jwt.claim.sub', v_a::text, true);
  select public.notification_unread_count() into v_count;
  perform pg_temp.record('notification_unread_count rpc smoke', v_count >= 0, 'count=' || v_count);

  for i in 1..505 loop
    perform public.create_notification(
      v_a, v_b, 'comment', 'comment', gen_random_uuid(),
      jsonb_build_object('creation_id', (select id from public.creations limit 1))
    );
  end loop;
  update public.notifications set read_at = now() where recipient_id = v_a and read_at is null;
  for i in 1..20 loop
    perform public.create_notification(
      v_a, v_b, 'comment', 'comment', gen_random_uuid(),
      jsonb_build_object('creation_id', (select id from public.creations limit 1))
    );
  end loop;
  select count(*) into v_count from public.notifications where recipient_id = v_a;
  perform pg_temp.record('notifications prune cap near 500', v_count <= 500, 'rows=' || v_count);
end $notifications_13a$;

-- Prompt 13B: quiet reach, mention visibility, summaries, Realtime, settings toggles.
do $notifications_13b$
declare
  v_a uuid;
  v_b uuid;
  v_founder uuid;
  v_public uuid;
  v_private uuid;
  v_username text;
  v_comment uuid;
  v_id uuid;
  v_count integer;
  v_before integer;
  v_after integer;
  v_held boolean;
  v_summary integer;
  v_pending integer;
begin
  select reader_a, reader_b, founder, public_id, private_id
    into v_a, v_b, v_founder, v_public, v_private
  from rls_ids limit 1;

  execute format('set local role %I', session_user);

  update public.profiles
  set status = 'active', suspended_until = null, status_reason = null
  where id in (v_a, v_b);

  delete from public.blocks where (blocker_id = v_b and blocked_id = v_a) or (blocker_id = v_a and blocked_id = v_b);

  update public.creations
  set is_removed = false, removed_reason = null, status = 'published', audience = 'public'
  where id = v_public;
  update public.creations
  set is_removed = false, status = 'published', audience = 'private'
  where id = v_private;

  alter table public.comments disable trigger comments_rate_limit;

  update public.notification_settings
  set notify_likes = false, notify_comments = true, quiet_manual = false, quiet_summary_pending = 0
  where user_id = v_a;

  perform set_config('request.jwt.claim.sub', v_b::text, true);
  select public.create_notification(v_a, v_b, 'like', 'creation', v_public, '{}'::jsonb) into v_id;
  perform pg_temp.record('disabled like type creates no notification', v_id is null, 'id=' || coalesce(v_id::text, 'null'));

  select public.create_notification(v_a, v_b, 'comment', 'comment', gen_random_uuid(), '{}'::jsonb) into v_id;
  perform pg_temp.record('enabled comment type still creates notification', v_id is not null, 'id=' || coalesce(v_id::text, 'null'));

  select username::text into v_username from public.profiles where id = v_a;

  perform pg_temp.record(
    'can_user_view_creation true for public fixture',
    public.can_user_view_creation(v_a, v_public),
    'viewer=' || v_a::text
  );

  select count(*) into v_before from public.notifications where recipient_id = v_a and type = 'mention';

  insert into public.comments (creation_id, author_id, body)
  values (v_private, v_b, 'mention test private')
  returning id into v_comment;
  insert into public.mentions (comment_id, creation_id, author_id, mentioned_user_id)
  values (v_comment, v_private, v_b, v_a)
  on conflict do nothing;

  select count(*) into v_after
  from public.notifications
  where recipient_id = v_a and type = 'mention';
  perform pg_temp.record(
    'mention on private creation creates no notification',
    v_after = v_before,
    'before=' || v_before || ' after=' || v_after
  );

  insert into public.comments (creation_id, author_id, body)
  values (v_public, v_b, 'mention test public')
  returning id into v_comment;
  insert into public.mentions (comment_id, creation_id, author_id, mentioned_user_id)
  values (v_comment, v_public, v_b, v_a)
  on conflict do nothing;

  select count(*) into v_after
  from public.notifications
  where recipient_id = v_a and type = 'mention';
  perform pg_temp.record(
    'mention on viewable public creation creates exactly one notification',
    v_after = v_before + 1,
    'before=' || v_before || ' after=' || v_after
  );

  insert into public.blocks (blocker_id, blocked_id) values (v_a, v_b);
  insert into public.comments (creation_id, author_id, body)
  values (v_public, v_b, 'blocked mention attempt')
  returning id into v_comment;
  insert into public.mentions (comment_id, creation_id, author_id, mentioned_user_id)
  values (v_comment, v_public, v_b, v_a)
  on conflict do nothing;
  select count(*) into v_count
  from public.notifications
  where recipient_id = v_a and type = 'mention';
  perform pg_temp.record(
    'mention blocked author creates no notification',
    v_count = v_after,
    'rows=' || v_count || ' expected=' || v_after
  );
  delete from public.blocks where blocker_id = v_a and blocked_id = v_b;

  perform pg_temp.record(
    'no self-notification from create_notification',
    public.create_notification(v_a, v_a, 'follow', 'profile', v_b, '{}'::jsonb) is null,
    'skipped'
  );

  insert into public.blocks (blocker_id, blocked_id) values (v_a, v_b)
  on conflict do nothing;
  perform pg_temp.record(
    'no notification across blocks',
    public.create_notification(v_a, v_b, 'comment', 'comment', gen_random_uuid(), '{}'::jsonb) is null,
    'skipped'
  );
  delete from public.blocks where blocker_id = v_a and blocked_id = v_b;

  insert into public.mutes (user_id, muted_user_id) values (v_a, v_b)
  on conflict do nothing;
  perform pg_temp.record(
    'no notification for muted actor',
    public.create_notification(v_a, v_b, 'comment', 'comment', gen_random_uuid(), '{}'::jsonb) is null,
    'skipped'
  );
  delete from public.mutes where user_id = v_a and muted_user_id = v_b;

  update public.notification_settings
  set quiet_manual = true, quiet_reach = 'everyone', quiet_summary_pending = 0
  where user_id = v_a;
  select public.create_notification(v_a, v_b, 'follow', 'profile', v_b, '{}'::jsonb) into v_id;
  select held into v_held from public.notifications where id = v_id;
  perform pg_temp.record('quiet reach everyone does not hold notifications', v_held = false, 'held=' || v_held);

  update public.notification_settings set quiet_reach = 'nobody' where user_id = v_a;
  select public.create_notification(v_a, v_b, 'comment', 'comment', gen_random_uuid(), '{}'::jsonb) into v_id;
  select held into v_held from public.notifications where id = v_id;
  perform pg_temp.record('quiet reach nobody holds notifications', v_held = true, 'held=' || v_held);

  update public.notification_settings set quiet_reach = 'pen_pals' where user_id = v_a;
  select public.create_notification(v_a, v_b, 'comment', 'comment', gen_random_uuid(), '{}'::jsonb) into v_id;
  select held into v_held from public.notifications where id = v_id;
  perform pg_temp.record('quiet reach pen pals holds until feature ships', v_held = true, 'held=' || v_held);

  delete from public.follows where follower_id in (v_a, v_b) and followee_id in (v_a, v_b);
  update public.notification_settings set quiet_reach = 'close_contacts' where user_id = v_a;
  select public.create_notification(v_a, v_b, 'comment', 'comment', gen_random_uuid(), '{}'::jsonb) into v_id;
  select held into v_held from public.notifications where id = v_id;
  perform pg_temp.record('quiet reach close contacts holds non-mutual', v_held = true, 'held=' || v_held);

  insert into public.follows (follower_id, followee_id) values (v_a, v_b), (v_b, v_a);
  select public.create_notification(v_a, v_b, 'comment', 'comment', gen_random_uuid(), '{}'::jsonb) into v_id;
  select held into v_held from public.notifications where id = v_id;
  perform pg_temp.record('quiet reach close contacts delivers mutual follows', v_held = false, 'held=' || v_held);

  update public.notification_settings
  set notify_likes = false, quiet_reach = 'nobody', quiet_manual = true
  where user_id = v_a;
  select public.create_notification(v_a, v_founder, 'warning', 'profile', v_a, '{"message":"x"}'::jsonb) into v_id;
  select held into v_held from public.notifications where id = v_id;
  perform pg_temp.record('warning ignores disabled toggle and reach holding', v_id is not null and v_held = false, 'held=' || v_held);

  delete from public.notifications where recipient_id = v_a and type = 'summary';
  update public.notification_settings
  set quiet_manual = true, quiet_reach = 'nobody', quiet_summary_pending = 0
  where user_id = v_a;
  perform public.create_notification(v_a, v_b, 'comment', 'comment', gen_random_uuid(), '{}'::jsonb);
  select quiet_summary_pending into v_pending from public.notification_settings where user_id = v_a;

  update public.notification_settings set quiet_manual = false where user_id = v_a;
  execute 'set local role authenticated';
  perform set_config('request.jwt.claim.sub', v_a::text, true);
  perform public.prepare_notification_delivery();
  perform public.prepare_notification_delivery();

  select count(*) into v_summary
  from public.notifications
  where recipient_id = v_a and type = 'summary' and data->>'kind' = 'quiet_end';
  perform pg_temp.record(
    'quiet end summary created exactly once after quiet ends',
    v_summary = 1,
    'summaries=' || v_summary || ' pending_was=' || v_pending
  );

  update public.notification_settings
  set digest_enabled = true,
      digest_time = '00:00:00'::time,
      digest_last_date = null,
      timezone = 'UTC'
  where user_id = v_a;

  perform public.prepare_notification_delivery();
  perform public.prepare_notification_delivery();
  select count(*) into v_summary
  from public.notifications
  where recipient_id = v_a and type = 'summary' and data->>'kind' = 'daily_digest'
    and (created_at at time zone 'UTC')::date = (now() at time zone 'UTC')::date;
  perform pg_temp.record('daily digest summary idempotent per day', v_summary = 1, 'summaries=' || v_summary);

  select count(*) into v_count
  from pg_publication_tables
  where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'notifications';
  perform pg_temp.record('notifications table published to supabase_realtime', v_count = 1, 'rows=' || v_count);

  execute 'set local role authenticated';
  perform set_config('request.jwt.claim.sub', v_b::text, true);
  select count(*) into v_count from public.notifications where recipient_id = v_a;
  perform pg_temp.record(
    'realtime RLS hides other users notification rows',
    v_count = 0,
    'rows=' || v_count
  );

  execute format('set local role %I', session_user);
  alter table public.comments enable trigger comments_rate_limit;
end $notifications_13b$;

-- Prompt 14A: badges, streaks, views, storefront, analytics (20261029000001_badges_streaks_14a.sql).
do $badges_14a$
declare
  v_a uuid;
  v_b uuid;
  v_founder uuid;
  v_count integer;
  v_poet boolean;
  v_note integer;
  i integer;
  v_creation uuid;
begin
  select reader_a, reader_b, founder into v_a, v_b, v_founder from rls_ids limit 1;
  if v_a is null or v_b is null then
    perform pg_temp.record('badges 14A skipped', true, 'missing rls_ids');
    return;
  end if;

  select count(*) into v_count from public.badges;
  perform pg_temp.record('badges seed rows present', v_count >= 20, 'count=' || v_count);

  execute 'set local role authenticated';
  perform set_config('request.jwt.claim.sub', v_a::text, true);
  begin
    insert into public.user_badges (user_id, badge_key) values (v_a, 'poet');
    perform pg_temp.record('user_badges insert blocked for client', false, 'insert succeeded');
  exception when insufficient_privilege then
    perform pg_temp.record('user_badges insert blocked for client', true, 'insufficient_privilege');
  when others then
    perform pg_temp.record('user_badges insert blocked for client', true, sqlerrm);
  end;

  execute format('set local role %I', session_user);
  delete from public.notifications where recipient_id = v_a and type = 'badge_awarded';
  perform public.award_user_badge(v_a, 'poet', null);
  perform public.award_user_badge(v_a, 'poet', null);
  select count(*) into v_count from public.user_badges where user_id = v_a and badge_key = 'poet' and month is null;
  perform pg_temp.record('award_user_badge idempotent', v_count = 1, 'rows=' || v_count);

  select count(*) into v_note
  from public.notifications
  where recipient_id = v_a and type = 'badge_awarded' and data->>'badge_key' = 'poet';
  perform pg_temp.record('badge_awarded notification once', v_note = 1, 'notifications=' || v_note);

  perform set_config('request.jwt.claim.sub', v_a::text, true);
  begin
    perform public.pin_badge('storyteller'::text, 1::smallint);
    perform pg_temp.record('pin unearned badge blocked', false, 'pin succeeded');
  exception when others then
    perform pg_temp.record('pin unearned badge blocked', true, sqlerrm);
  end;

  perform public.award_user_badge(v_a, 'storyteller', null);
  perform public.award_user_badge(v_a, 'author', null);
  perform public.award_user_badge(v_a, 'featured', null);
  execute 'set local role authenticated';
  perform set_config('request.jwt.claim.sub', v_a::text, true);
  perform public.pin_badge('poet'::text, 1::smallint);
  perform public.pin_badge('storyteller'::text, 2::smallint);
  perform public.pin_badge('author'::text, 3::smallint);
  select count(*) into v_count from public.user_pinned_badges where user_id = v_a;
  perform pg_temp.record('pin at most three slots', v_count = 3, 'pins=' || v_count);
  perform public.pin_badge('featured'::text, 1::smallint);
  select count(*) into v_count from public.user_pinned_badges where user_id = v_a;
  perform pg_temp.record('pin replace keeps three slots', v_count = 3, 'pins=' || v_count);

  perform set_config('request.jwt.claim.sub', v_b::text, true);
  begin
    delete from public.user_pinned_badges where user_id = v_a;
    perform pg_temp.record('cannot delete others pins', false, 'delete succeeded');
  exception when insufficient_privilege then
    perform pg_temp.record('cannot delete others pins', true, 'insufficient_privilege');
  end;
  execute format('set local role %I', session_user);
  select count(*) into v_count from public.user_pinned_badges where user_id = v_a;
  perform pg_temp.record('others pins unchanged after delete attempt', v_count = 3, 'pins=' || v_count);

  perform set_config('request.jwt.claim.sub', v_founder::text, true);
  begin
    perform public.award_featured_badge(v_a);
    perform pg_temp.record('featured badge founder award', true, 'ok');
  exception when others then
    perform pg_temp.record('featured badge founder award', false, sqlerrm);
  end;

  perform set_config('request.jwt.claim.sub', v_b::text, true);
  begin
    perform public.award_featured_badge(v_a);
    perform pg_temp.record('featured badge non-founder blocked', false, 'awarded');
  exception when others then
    perform pg_temp.record('featured badge non-founder blocked', true, sqlerrm);
  end;

  perform set_config('request.jwt.claim.sub', v_a::text, true);
  perform public.apply_writing_streak_day(v_a, (now() at time zone 'UTC')::date);
  perform public.apply_writing_streak_day(v_a, (now() at time zone 'UTC')::date);
  select writing_current into v_count from public.user_streaks where user_id = v_a;
  perform pg_temp.record('writing streak idempotent same day', v_count = 1, 'current=' || v_count);

  perform set_config('request.jwt.claim.sub', v_b::text, true);
  select coalesce((public.get_creator_analytics()->>'views_7d')::integer, 0) into v_count;
  perform pg_temp.record('get_creator_analytics own data', v_count >= 0, 'views_7d=' || v_count);

  perform set_config('request.jwt.claim.sub', v_a::text, true);
  select id into v_creation from public.creations where author_id = v_b and audience = 'public' and status = 'published' limit 1;
  if v_creation is null then
    perform pg_temp.record('view dedupe within 24h', true, 'no public creation fixture');
  else
    delete from public.creation_view_events where creation_id = v_creation and viewer_id = v_a;
    perform public.record_creation_view(v_creation);
    perform public.record_creation_view(v_creation);
    select count(*) into v_count from public.creation_view_events where creation_id = v_creation and viewer_id = v_a;
    perform pg_temp.record('view dedupe within 24h', v_count = 1, 'events=' || v_count);
  end if;

  perform set_config('request.jwt.claim.sub', v_founder::text, true);
  perform public.close_month((date_trunc('month', now()) - interval '2 months')::date);
  perform public.close_month((date_trunc('month', now()) - interval '2 months')::date);
  select count(*) into v_count
  from public.closed_months
  where month = date_trunc('month', now() - interval '2 months')::date;
  perform pg_temp.record('close_month idempotent', v_count = 1, 'rows=' || v_count);

  perform set_config('request.jwt.claim.sub', v_b::text, true);
  begin
    perform public.close_month((date_trunc('month', now()) - interval '3 months')::date);
    perform pg_temp.record('close_month non-founder blocked', false, 'closed');
  exception when others then
    perform pg_temp.record('close_month non-founder blocked', true, sqlerrm);
  end;

  perform set_config('request.jwt.claim.sub', '', true);
  execute 'set local role anon';
  begin
    perform public.get_creator_analytics();
    execute format('set local role %I', session_user);
    perform pg_temp.record('analytics anon blocked', false, 'returned');
  exception when others then
    execute format('set local role %I', session_user);
    perform pg_temp.record('analytics anon blocked', true, sqlerrm);
  end;
end $badges_14a$;

-- Prompt 15A item 0: automatic badge thresholds + rising star month.
do $badges_15a$
declare
  v_writer uuid := gen_random_uuid();
  v_other uuid := gen_random_uuid();
  v_count integer;
  i integer;
  v_book uuid;
  v_f uuid;
  v_month date := (date_trunc('month', now()) - interval '4 months')::date;
begin
  perform pg_temp.create_test_user(v_writer, v_writer::text || '@badge15.test', now());
  perform pg_temp.create_test_user(v_other, v_other::text || '@badge15b.test', now());
  update public.profiles set role = 'writer' where id = v_writer;

  for i in 1..4 loop
    insert into public.creations (author_id, type, title, audience, status, body_text)
    values (v_writer, 'poem', 'Poem ' || i, 'public', 'published', 'Body');
  end loop;
  perform public.evaluate_automatic_badges(v_writer);
  select count(*) into v_count from public.user_badges where user_id = v_writer and badge_key = 'poet';
  perform pg_temp.record('Poet not awarded at 4 poems', v_count = 0, 'rows=' || v_count);

  insert into public.creations (author_id, type, title, audience, status, body_text)
  values (v_writer, 'poem', 'Poem 5', 'public', 'published', 'Body');
  perform public.evaluate_automatic_badges(v_writer);
  select count(*) into v_count from public.user_badges where user_id = v_writer and badge_key = 'poet';
  perform pg_temp.record('Poet awarded at 5 poems', v_count = 1, 'rows=' || v_count);

  insert into public.creations (author_id, type, title, audience, status, body_text)
  values (v_writer, 'poem', 'Private poem', 'private', 'published', 'Secret');
  perform public.evaluate_automatic_badges(v_writer);
  select count(*) into v_count from public.user_badges where user_id = v_writer and badge_key = 'poet';
  perform pg_temp.record('private poems do not add poet count', v_count = 1, 'rows=' || v_count);

  for i in 1..5 loop
    insert into public.creations (author_id, type, title, audience, status, body_text)
    values (v_writer, 'story', 'Story ' || i, 'public', 'published', 'Body');
  end loop;
  perform public.evaluate_automatic_badges(v_writer);
  select count(*) into v_count from public.user_badges where user_id = v_writer and badge_key = 'storyteller';
  perform pg_temp.record('Storyteller awarded at 5 stories', v_count = 1, 'rows=' || v_count);

  update public.profiles set follower_count = 99 where id = v_writer;
  perform public.evaluate_automatic_badges(v_writer);
  select count(*) into v_count from public.user_badges where user_id = v_writer and badge_key = 'rising_creator';
  perform pg_temp.record('Rising Creator not at 99 followers', v_count = 0, 'rows=' || v_count);
  update public.profiles set follower_count = 100 where id = v_writer;
  perform public.evaluate_automatic_badges(v_writer);
  select count(*) into v_count from public.user_badges where user_id = v_writer and badge_key = 'rising_creator';
  perform pg_temp.record('Rising Creator at 100 followers', v_count = 1, 'rows=' || v_count);

  insert into public.creations (author_id, type, title, audience, status, body_text, like_count)
  values (v_writer, 'written_post', 'Trend', 'public', 'published', 'Body', 999);
  perform public.evaluate_automatic_badges(v_writer);
  select count(*) into v_count from public.user_badges where user_id = v_writer and badge_key = 'trending';
  perform pg_temp.record('Trending not at 999 likes on one post', v_count = 0, 'rows=' || v_count);
  update public.creations set like_count = 1000
  where author_id = v_writer and title = 'Trend';
  perform public.evaluate_automatic_badges(v_writer);
  select count(*) into v_count from public.user_badges where user_id = v_writer and badge_key = 'trending';
  perform pg_temp.record('Trending at 1000 likes on one post', v_count = 1, 'rows=' || v_count);

  update public.creations set like_count = 0 where author_id = v_writer;
  update public.creations set like_count = 9999 where author_id = v_writer and title = 'Trend';
  perform public.evaluate_automatic_badges(v_writer);
  select count(*) into v_count from public.user_badges where user_id = v_writer and badge_key = 'viral_creator';
  perform pg_temp.record('Viral Creator not at 9999 total likes', v_count = 0, 'rows=' || v_count);
  update public.creations set like_count = 10000 where author_id = v_writer and title = 'Trend';
  perform public.evaluate_automatic_badges(v_writer);
  select count(*) into v_count from public.user_badges where user_id = v_writer and badge_key = 'viral_creator';
  perform pg_temp.record('Viral Creator at 10000 total likes', v_count = 1, 'rows=' || v_count);

  insert into public.creations (id, author_id, type, title, audience, status, body_text)
  values (gen_random_uuid(), v_writer, 'book', 'My book', 'public', 'published', 'Chapters')
  returning id into v_book;
  insert into public.books (id, author_id, description, sale_model, price_cents)
  values (v_book, v_writer, 'Desc', 'free', 0);
  perform public.evaluate_automatic_badges(v_writer);
  select count(*) into v_count from public.user_badges where user_id = v_writer and badge_key = 'author';
  perform pg_temp.record('Author on first published book', v_count = 1, 'rows=' || v_count);

  -- Rising star: 3+ follows in month, under 1000 followers
  update public.profiles set follower_count = 50, role = 'writer' where id = v_writer;
  for i in 1..3 loop
    v_f := gen_random_uuid();
    perform pg_temp.create_test_user(v_f, v_f::text || '@rs.test', now());
    insert into public.follows (follower_id, followee_id, created_at)
    values (v_f, v_writer, v_month + (i || ' days')::interval);
  end loop;
  perform public.close_month_core(v_month, false);
  select count(*) into v_count from public.user_badges
  where user_id = v_writer and badge_key = 'rising_star_month';
  perform pg_temp.record('Rising Star awarded with 3 new follows', v_count >= 1, 'rows=' || v_count);
end $badges_15a$;

-- Prompt 15A: direct messages RLS and RPC smoke.
do $messages_15a$
declare
  v_a uuid;
  v_b uuid;
  v_founder uuid;
  v_ma uuid := gen_random_uuid();
  v_mb uuid := gen_random_uuid();
  v_conv uuid;
  v_msg uuid;
  v_count integer;
  v_future timestamptz := now() + interval '2 days';
begin
  select reader_a, reader_b, founder into v_a, v_b, v_founder from rls_ids limit 1;
  if v_a is null or v_b is null then
    perform pg_temp.record('messages 15A skipped', true, 'missing rls_ids');
    return;
  end if;

  perform pg_temp.create_test_user(v_ma, v_ma::text || '@msg-a.test', now());
  perform pg_temp.create_test_user(v_mb, v_mb::text || '@msg-b.test', now());
  update public.profiles set who_can_message = 'everyone' where id in (v_a, v_b, v_ma, v_mb);

  execute 'set local role authenticated';
  perform set_config('request.jwt.claim.sub', v_a::text, true);
  begin
    insert into public.messages (conversation_id, sender_id, body)
    values (gen_random_uuid(), v_a, 'hack');
    perform pg_temp.record('messages direct insert blocked', false, 'insert succeeded');
  exception when others then
    perform pg_temp.record('messages direct insert blocked', true, sqlerrm);
  end;

  execute format('set local role %I', session_user);
  update public.profiles set who_can_message = 'followers' where id = v_mb;
  execute 'set local role authenticated';
  perform set_config('request.jwt.claim.sub', v_ma::text, true);
  begin
    perform public.get_or_create_dm(v_mb);
    perform pg_temp.record('followers-only safe space blocks non-follower', false, 'created');
  exception when others then
    perform pg_temp.record('followers-only safe space blocks non-follower', true, sqlerrm);
  end;

  execute format('set local role %I', session_user);
  update public.profiles set who_can_message = 'subscribers' where id = v_mb;
  execute 'set local role authenticated';
  perform set_config('request.jwt.claim.sub', v_ma::text, true);
  begin
    perform public.get_or_create_dm(v_mb);
    perform pg_temp.record('subscribers-only safe space blocks for now', false, 'created');
  exception when others then
    perform pg_temp.record('subscribers-only safe space blocks for now', true, sqlerrm);
  end;
  execute format('set local role %I', session_user);
  update public.profiles set who_can_message = 'everyone' where id = v_mb;
  execute 'set local role authenticated';

  perform set_config('request.jwt.claim.sub', v_a::text, true);
  v_conv := public.get_or_create_dm(v_b);
  v_msg := public.send_message(v_conv, 'Hello there');

  perform set_config('request.jwt.claim.sub', v_b::text, true);
  select count(*) into v_count from public.messages_visible where conversation_id = v_conv;
  perform pg_temp.record('recipient sees delivered message', v_count >= 1, 'rows=' || v_count);

  perform set_config('request.jwt.claim.sub', v_a::text, true);
  v_msg := public.send_message(v_conv, 'Future note', null, v_future);
  perform set_config('request.jwt.claim.sub', v_b::text, true);
  select count(*) into v_count from public.messages_visible where conversation_id = v_conv and body = 'Future note';
  perform pg_temp.record('scheduled message hidden from recipient', v_count = 0, 'rows=' || v_count);
  select public.message_unread_total() into v_count;
  perform pg_temp.record('scheduled message excluded from unread', v_count = 0, 'rows=' || v_count);

  perform set_config('request.jwt.claim.sub', v_a::text, true);
  select count(*) into v_count from public.messages_visible where body = 'Future note';
  perform pg_temp.record('sender sees scheduled message', v_count = 1, 'rows=' || v_count);

  perform set_config('request.jwt.claim.sub', v_founder::text, true);
  select count(*) into v_count from public.messages;
  perform pg_temp.record('founder cannot select messages table', v_count = 0, 'rows=' || v_count);

  execute format('set local role %I', session_user);
  insert into public.blocks (blocker_id, blocked_id) values (v_a, v_b)
  on conflict do nothing;
  execute 'set local role authenticated';
  perform set_config('request.jwt.claim.sub', v_a::text, true);
  begin
    perform public.get_or_create_dm(v_b);
    perform pg_temp.record('blocked pair cannot open dm', false, 'created');
  exception when others then
    perform pg_temp.record('blocked pair cannot open dm', true, sqlerrm);
  end;
  delete from public.blocks where blocker_id = v_a and blocked_id = v_b;

  perform set_config('request.jwt.claim.sub', v_ma::text, true);
  v_conv := public.get_or_create_dm(v_mb);
  execute format('set local role %I', session_user);
  delete from public.notifications where target_id = v_conv and type = 'message';
  execute 'set local role authenticated';
  perform set_config('request.jwt.claim.sub', v_ma::text, true);
  perform set_config('request.jwt.claim.sub', v_mb::text, true);
  perform public.set_conversation_muted(v_conv, true);
  perform set_config('request.jwt.claim.sub', v_ma::text, true);
  perform public.send_message(v_conv, 'Muted ping');
  perform set_config('request.jwt.claim.sub', v_mb::text, true);
  select count(*) into v_count from public.notifications
  where recipient_id = v_mb and type = 'message' and target_id = v_conv;
  perform pg_temp.record('muted conversation skips message notification', v_count = 0, 'rows=' || v_count);
end $messages_15a$;

do $messages_15b$
declare
  v_a uuid;
  v_b uuid;
  v_founder uuid;
  v_conv uuid;
  v_conv2 uuid;
  v_msg uuid;
  v_priv uuid;
  v_count integer;
  v_note uuid;
  v_report uuid;
  v_future timestamptz := now() + interval '2 days';
  v_far timestamptz := now() + interval '31 days';
  v_past timestamptz := now() - interval '2 days';
  i integer;
  v_json jsonb;
  v_body text;
  v_del uuid := gen_random_uuid();
  v_del2 uuid := gen_random_uuid();
  v_del_conv uuid;
  v_ra uuid := gen_random_uuid();
  v_rb uuid := gen_random_uuid();
  v_rc uuid;
  v_nd_a uuid := gen_random_uuid();
  v_nd_b uuid := gen_random_uuid();
  v_held boolean;
begin
  select reader_a, reader_b, founder into v_a, v_b, v_founder from rls_ids limit 1;

  execute format('set local role %I', session_user);
  update public.profiles set who_can_message = 'everyone', status = 'active' where id in (v_a, v_b);

  execute 'set local role authenticated';
  perform set_config('request.jwt.claim.sub', v_a::text, true);
  v_conv := public.get_or_create_dm(v_b);
  v_msg := public.send_message(v_conv, 'Seed for access tests');

  perform set_config('request.jwt.claim.sub', v_founder::text, true);
  select count(*) into v_count from public.messages_visible where conversation_id = v_conv;
  perform pg_temp.record('non-member cannot read messages', v_count = 0, 'rows=' || v_count);
  select count(*) into v_count from public.conversations where id = v_conv;
  perform pg_temp.record('non-member cannot read conversations row', v_count = 0, 'rows=' || v_count);
  select count(*) into v_count from public.conversation_members where conversation_id = v_conv;
  perform pg_temp.record('non-member cannot read conversation_members', v_count = 0, 'rows=' || v_count);
  begin
    perform public.send_message(v_conv, 'intruder');
    perform pg_temp.record('non-member cannot send', false, 'sent');
  exception when others then
    perform pg_temp.record('non-member cannot send', true, sqlerrm);
  end;
  begin
    perform public.mark_conversation_read(v_conv);
    perform pg_temp.record('non-member cannot mark_conversation_read', false, 'ok');
  exception when others then
    perform pg_temp.record('non-member cannot mark_conversation_read', true, sqlerrm);
  end;
  begin
    perform public.set_conversation_muted(v_conv, true);
    perform pg_temp.record('non-member cannot set_conversation_muted', false, 'ok');
  exception when others then
    perform pg_temp.record('non-member cannot set_conversation_muted', true, sqlerrm);
  end;
  begin
    perform public.delete_message(v_msg);
    perform pg_temp.record('non-member cannot delete_message', false, 'ok');
  exception when others then
    perform pg_temp.record('non-member cannot delete_message', true, sqlerrm);
  end;

  execute 'set local role anon';
  begin
    select count(*) into v_count from public.conversations where id = v_conv;
    execute format('set local role %I', session_user);
    perform pg_temp.record('anon cannot read conversations', v_count = 0, 'rows=' || v_count);
  exception when others then
    execute format('set local role %I', session_user);
    perform pg_temp.record('anon cannot read conversations', true, sqlerrm);
  end;
  execute 'set local role anon';
  begin
    select count(*) into v_count from public.conversation_members where conversation_id = v_conv;
    execute format('set local role %I', session_user);
    perform pg_temp.record('anon cannot read conversation_members', v_count = 0, 'rows=' || v_count);
  exception when others then
    execute format('set local role %I', session_user);
    perform pg_temp.record('anon cannot read conversation_members', true, sqlerrm);
  end;
  execute 'set local role anon';
  begin
    select count(*) into v_count from public.messages where conversation_id = v_conv;
    execute format('set local role %I', session_user);
    perform pg_temp.record('anon cannot read messages table', v_count = 0, 'rows=' || v_count);
  exception when others then
    execute format('set local role %I', session_user);
    perform pg_temp.record('anon cannot read messages table', true, sqlerrm);
  end;
  execute 'set local role authenticated';

  perform set_config('request.jwt.claim.sub', v_a::text, true);
  v_conv2 := public.get_or_create_dm(v_b);
  perform pg_temp.record('get_or_create_dm idempotent same pair', v_conv = v_conv2, 'ids=' || v_conv::text);
  perform set_config('request.jwt.claim.sub', v_b::text, true);
  v_conv2 := public.get_or_create_dm(v_a);
  perform pg_temp.record('DM pair order independent', v_conv = v_conv2, 'ids=' || v_conv::text);

  execute format('set local role %I', session_user);
  insert into public.blocks (blocker_id, blocked_id) values (v_a, v_b) on conflict do nothing;
  execute 'set local role authenticated';
  perform set_config('request.jwt.claim.sub', v_a::text, true);
  begin perform public.send_message(v_conv, 'blocked'); perform pg_temp.record('send blocked when blocker', false, 'sent');
  exception when others then perform pg_temp.record('send blocked when blocker', true, sqlerrm); end;
  execute format('set local role %I', session_user);
  delete from public.blocks where blocker_id = v_a and blocked_id = v_b;
  insert into public.blocks (blocker_id, blocked_id) values (v_b, v_a) on conflict do nothing;
  execute 'set local role authenticated';
  perform set_config('request.jwt.claim.sub', v_a::text, true);
  begin perform public.send_message(v_conv, 'blocked'); perform pg_temp.record('send blocked when blocked', false, 'sent');
  exception when others then perform pg_temp.record('send blocked when blocked', true, sqlerrm); end;
  execute format('set local role %I', session_user);
  delete from public.blocks where blocker_id = v_b and blocked_id = v_a;

  execute format('set local role %I', session_user);
  update public.profiles set status = 'suspended', suspended_until = now() + interval '1 day' where id = v_a;
  execute 'set local role authenticated';
  perform set_config('request.jwt.claim.sub', v_a::text, true);
  begin perform public.send_message(v_conv, 'suspended'); perform pg_temp.record('suspended sender cannot send', false, 'sent');
  exception when others then perform pg_temp.record('suspended sender cannot send', true, sqlerrm); end;
  execute format('set local role %I', session_user);
  update public.profiles set status = 'active', suspended_until = null where id = v_a;

  execute format('set local role %I', session_user);
  update public.profiles set status = 'banned' where id = v_a;
  execute 'set local role authenticated';
  perform set_config('request.jwt.claim.sub', v_a::text, true);
  begin perform public.send_message(v_conv, 'banned'); perform pg_temp.record('banned sender cannot send', false, 'sent');
  exception when others then perform pg_temp.record('banned sender cannot send', true, sqlerrm); end;
  execute format('set local role %I', session_user);
  update public.profiles set status = 'active' where id = v_a;

  execute format('set local role %I', session_user);
  update public.profiles set who_can_message = 'followers' where id = v_b;
  execute 'set local role authenticated';
  perform set_config('request.jwt.claim.sub', v_a::text, true);
  begin perform public.send_message(v_conv, 'nosub'); perform pg_temp.record('send refused followers-only without follow', false, 'sent');
  exception when others then perform pg_temp.record('send refused followers-only without follow', true, sqlerrm); end;
  execute format('set local role %I', session_user);
  update public.profiles set who_can_message = 'everyone' where id = v_b;

  execute format('set local role %I', session_user);
  update public.profiles set who_can_message = 'subscribers' where id = v_b;
  execute 'set local role authenticated';
  perform set_config('request.jwt.claim.sub', v_a::text, true);
  begin perform public.send_message(v_conv, 'nosub'); perform pg_temp.record('send refused subscribers-only', false, 'sent');
  exception when others then perform pg_temp.record('send refused subscribers-only', true, sqlerrm); end;
  execute format('set local role %I', session_user);
  update public.profiles set who_can_message = 'everyone' where id = v_b;

  insert into public.creations (id, author_id, type, title, audience, status, body_text)
  values (gen_random_uuid(), v_b, 'poem', 'Private share', 'private', 'published', 'Secret')
  returning id into v_priv;
  perform set_config('request.jwt.claim.sub', v_a::text, true);
  begin perform public.send_message(v_conv, 'share', v_priv); perform pg_temp.record('send refused invisible shared post', false, 'sent');
  exception when others then perform pg_temp.record('send refused invisible shared post', true, sqlerrm); end;

  perform set_config('request.jwt.claim.sub', v_a::text, true);
  begin perform public.send_message(v_conv, repeat('x', 2001)); perform pg_temp.record('send refused body over 2000 chars', false, 'sent');
  exception when others then perform pg_temp.record('send refused body over 2000 chars', true, sqlerrm); end;
  begin perform public.send_message(v_conv, '   '); perform pg_temp.record('send refused whitespace body', false, 'sent');
  exception when others then perform pg_temp.record('send refused whitespace body', true, sqlerrm); end;
  begin perform public.send_message(v_conv, 'past', null, v_past); perform pg_temp.record('send refused deliver_at too far past', false, 'sent');
  exception when others then perform pg_temp.record('send refused deliver_at too far past', true, sqlerrm); end;
  begin perform public.send_message(v_conv, 'far', null, v_far); perform pg_temp.record('send refused deliver_at over 30 days', false, 'sent');
  exception when others then perform pg_temp.record('send refused deliver_at over 30 days', true, sqlerrm); end;

  execute 'set local role authenticated';
  perform set_config('request.jwt.claim.sub', v_a::text, true);
  begin
    update public.messages set body = 'hack' where conversation_id = v_conv;
    get diagnostics v_count = row_count;
    perform pg_temp.record('messages direct update blocked', v_count = 0, 'row_count=' || v_count);
  exception when others then
    perform pg_temp.record('messages direct update blocked', true, sqlerrm);
  end;
  begin
    delete from public.messages where conversation_id = v_conv;
    get diagnostics v_count = row_count;
    perform pg_temp.record('messages direct delete blocked', v_count = 0, 'row_count=' || v_count);
  exception when others then
    perform pg_temp.record('messages direct delete blocked', true, sqlerrm);
  end;

  v_msg := public.send_message(v_conv, 'To delete');
  perform public.delete_message(v_msg);
  select body into v_body from public.messages_visible where id = v_msg;
  perform pg_temp.record('soft delete tombstone hides body', v_body is null, 'body null');

  perform set_config('request.jwt.claim.sub', v_a::text, true);
  v_msg := public.send_message(v_conv, 'Sched preview', null, v_future);
  perform set_config('request.jwt.claim.sub', v_b::text, true);
  select count(*) into v_count from public.messages_visible where id = v_msg;
  perform pg_temp.record('scheduled invisible to recipient until deliver_at', v_count = 0, 'rows=' || v_count);
  perform set_config('request.jwt.claim.sub', v_b::text, true);
  select count(*) into v_count from public.notification_feed n
  where n.type = 'message' and n.target_id = v_conv
    and (n.data->>'message_id')::uuid = v_msg;
  perform pg_temp.record('message notification not visible before deliver_at', v_count = 0, 'feed_rows=' || v_count);

  execute format('set local role %I', session_user);
  delete from public.notifications where target_id = v_conv and type = 'message';
  execute 'set local role authenticated';
  perform set_config('request.jwt.claim.sub', v_a::text, true);
  perform public.send_message(v_conv, 'One');
  perform public.send_message(v_conv, 'Two');
  perform set_config('request.jwt.claim.sub', v_b::text, true);
  select coalesce(nullif(regexp_replace(n.data->>'count', '[^0-9]', '', 'g'), ''), '0')::integer
    into v_count from public.notifications n
  where n.recipient_id = v_b and n.type = 'message' and n.target_id = v_conv and n.read_at is null
  order by n.created_at desc limit 1;
  perform pg_temp.record('message notification dedupes per conversation count', v_count >= 2, 'count=' || v_count);

  perform set_config('request.jwt.claim.sub', v_b::text, true);
  v_json := public.recipient_quiet_status(v_b);
  perform pg_temp.record('recipient_quiet_status null when quiet off', v_json is null, 'json null');

  perform set_config('request.jwt.claim.sub', v_a::text, true);
  v_json := public.search_dm_writers('reader');
  select count(*) into v_count
  from jsonb_array_elements(v_json) e
  where (e->>'id')::uuid = v_a;
  perform pg_temp.record('search_dm_writers excludes self', v_count = 0, 'self_rows=' || v_count);

  select count(*) into v_count from pg_publication_tables
  where pubname = 'supabase_realtime' and tablename in ('messages', 'conversation_members');
  perform pg_temp.record('messages tables in supabase_realtime', v_count = 2, 'rows=' || v_count);

  execute 'set local role anon';
  begin
    perform public.message_unread_total();
    execute format('set local role %I', session_user);
    perform pg_temp.record('anon cannot call message_unread_total', false, 'ok');
  exception when others then
    execute format('set local role %I', session_user);
    perform pg_temp.record('anon cannot call message_unread_total', true, sqlerrm);
  end;
  execute 'set local role authenticated';

  perform set_config('request.jwt.claim.sub', v_founder::text, true);
  execute 'set local role authenticated';
  select count(*) into v_count from public.conversation_members;
  perform pg_temp.record('founder cannot select conversation_members', v_count = 0, 'rows=' || v_count);

  execute 'set local role authenticated';
  perform set_config('request.jwt.claim.sub', v_a::text, true);
  v_msg := public.send_message(v_conv, 'Report me');
  execute 'set local role authenticated';
  perform set_config('request.jwt.claim.sub', v_b::text, true);
  insert into public.reports (target_type, target_id, reported_user_id, reason, details)
  values ('message', v_msg, v_a, 'spam', 'test') returning id into v_report;
  execute 'set local role authenticated';
  perform set_config('request.jwt.claim.sub', v_founder::text, true);
  v_json := public.view_reported_private_content(v_report);
  perform pg_temp.record(
    'founder reported message context with audit',
    coalesce(v_json->>'target_type', '') = 'message',
    'type=' || coalesce(v_json->>'target_type', '')
  );

  perform set_config('request.jwt.claim.sub', v_a::text, true);
  begin perform public.view_reported_private_content(v_report); perform pg_temp.record('non-founder cannot view reported message', false, 'ok');
  exception when others then perform pg_temp.record('non-founder cannot view reported message', true, sqlerrm); end;

  execute format('set local role %I', session_user);
  update public.profiles set status = 'banned' where id = v_a;
  execute 'set local role authenticated';
  perform set_config('request.jwt.claim.sub', v_b::text, true);
  begin perform public.send_message(v_conv, 'to banned'); perform pg_temp.record('send refused to banned counterpart policy', false, 'sent');
  exception when others then perform pg_temp.record('send refused to banned counterpart policy', true, sqlerrm); end;
  select count(*) into v_count from public.messages_visible where conversation_id = v_conv;
  perform pg_temp.record('banned counterpart history still readable', v_count > 0, 'rows=' || v_count);
  execute format('set local role %I', session_user);
  update public.profiles set status = 'active' where id = v_a;

  execute format('set local role %I', session_user);
  perform pg_temp.create_test_user(v_del, v_del::text || '@del-a.test', now());
  perform pg_temp.create_test_user(v_del2, v_del2::text || '@del-b.test', now());
  perform set_config('request.jwt.claim.sub', v_del::text, true);
  v_del_conv := public.get_or_create_dm(v_del2);
  execute format('set local role %I', session_user);
  delete from auth.users where id = v_del;
  select count(*) into v_count from public.conversation_members where user_id = v_del;
  perform pg_temp.record('account deletion cascades conversation_members', v_count = 0, 'rows=' || v_count);

  execute format('set local role %I', session_user);
  perform pg_temp.create_test_user(v_ra, v_ra::text || '@rate-a.test', now());
  perform pg_temp.create_test_user(v_rb, v_rb::text || '@rate-b.test', now());
  perform set_config('request.jwt.claim.sub', v_ra::text, true);
  v_rc := public.get_or_create_dm(v_rb);
  for i in 1..21 loop
    begin
      perform public.send_message(v_rc, 'rate ' || i::text);
      if i = 21 then
        perform pg_temp.record('message per-minute rate limit at 21st send', false, '21 sends succeeded');
      end if;
    exception when others then
      if i = 21 then
        perform pg_temp.record('message per-minute rate limit at 21st send', true, sqlerrm);
      end if;
      exit;
    end;
  end loop;

  execute format('set local role %I', session_user);
  insert into public.engagement_events (user_id, kind, created_at)
  select v_ra, 'message_day', now() - (gs || ' seconds')::interval
  from generate_series(1, 500) gs;
  execute 'set local role authenticated';
  perform set_config('request.jwt.claim.sub', v_ra::text, true);
  begin
    perform public.send_message(v_rc, 'over daily cap');
    perform pg_temp.record('message per-day rate limit refuses over cap', false, 'sent');
  exception when others then
    perform pg_temp.record('message per-day rate limit refuses over cap', true, sqlerrm);
  end;

  execute format('set local role %I', session_user);
  perform pg_temp.create_test_user(v_nd_a, v_nd_a::text || '@day-ok-a.test', now());
  perform pg_temp.create_test_user(v_nd_b, v_nd_b::text || '@day-ok-b.test', now());
  execute 'set local role authenticated';
  perform set_config('request.jwt.claim.sub', v_nd_a::text, true);
  v_del_conv := public.get_or_create_dm(v_nd_b);
  begin
    perform public.send_message(v_del_conv, 'under daily cap');
    perform pg_temp.record('message per-day rate limit allows under cap', true, 'sent');
  exception when others then
    perform pg_temp.record('message per-day rate limit allows under cap', false, sqlerrm);
  end;

  execute format('set local role %I', session_user);
  delete from public.notifications where target_id = v_conv and type = 'message';
  update public.notification_settings
  set quiet_manual = true, quiet_reach = 'nobody', quiet_summary_pending = 0
  where user_id = v_b;
  execute 'set local role authenticated';
  perform set_config('request.jwt.claim.sub', v_a::text, true);
  perform public.send_message(v_conv, 'Quiet nobody');
  perform set_config('request.jwt.claim.sub', v_b::text, true);
  select n.held into v_held from public.notifications n
  where n.recipient_id = v_b and n.type = 'message' and n.target_id = v_conv
  order by n.created_at desc limit 1;
  perform pg_temp.record('message notification held when quiet nobody reach', v_held = true, 'held=' || v_held);

  execute format('set local role %I', session_user);
  delete from public.notifications where target_id = v_conv and type = 'message';
  update public.notification_settings set quiet_reach = 'everyone' where user_id = v_b;
  execute 'set local role authenticated';
  perform set_config('request.jwt.claim.sub', v_a::text, true);
  perform public.send_message(v_conv, 'Quiet everyone');
  perform set_config('request.jwt.claim.sub', v_b::text, true);
  select n.held into v_held from public.notifications n
  where n.recipient_id = v_b and n.type = 'message' and n.target_id = v_conv
  order by n.created_at desc limit 1;
  perform pg_temp.record('message notification delivered when quiet everyone reach', v_held = false, 'held=' || v_held);

  execute format('set local role %I', session_user);
  delete from public.notifications where target_id = v_conv and type = 'message';
  delete from public.follows where follower_id in (v_a, v_b) and followee_id in (v_a, v_b);
  update public.notification_settings set quiet_reach = 'close_contacts' where user_id = v_b;
  execute 'set local role authenticated';
  perform set_config('request.jwt.claim.sub', v_a::text, true);
  perform public.send_message(v_conv, 'Quiet close non-mutual');
  perform set_config('request.jwt.claim.sub', v_b::text, true);
  select n.held into v_held from public.notifications n
  where n.recipient_id = v_b and n.type = 'message' and n.target_id = v_conv
  order by n.created_at desc limit 1;
  perform pg_temp.record('message notification held for close contacts non-mutual', v_held = true, 'held=' || v_held);

  execute format('set local role %I', session_user);
  delete from public.notifications where target_id = v_conv and type = 'message';
  insert into public.follows (follower_id, followee_id) values (v_a, v_b), (v_b, v_a);
  execute 'set local role authenticated';
  perform set_config('request.jwt.claim.sub', v_a::text, true);
  perform public.send_message(v_conv, 'Quiet close mutual');
  perform set_config('request.jwt.claim.sub', v_b::text, true);
  select n.held into v_held from public.notifications n
  where n.recipient_id = v_b and n.type = 'message' and n.target_id = v_conv
  order by n.created_at desc limit 1;
  perform pg_temp.record('message notification delivered for close contacts mutual', v_held = false, 'held=' || v_held);

  update public.notification_settings set quiet_manual = false, quiet_reach = 'everyone' where user_id = v_b;

  perform set_config('request.jwt.claim.sub', v_founder::text, true);
  begin
    perform public.view_reported_private_content(gen_random_uuid());
    perform pg_temp.record('founder view refused without open report', false, 'returned');
  exception when others then
    perform pg_temp.record('founder view refused without open report', true, sqlerrm);
  end;
end $messages_15b$;

do $pre_beta_16a$
declare
  v_founder uuid;
  v_a uuid;
  v_b uuid;
  v_inv text;
  v_uid uuid := gen_random_uuid();
  v_json jsonb;
  v_count integer;
  v_cid uuid;
begin
  select founder, reader_a, reader_b into v_founder, v_a, v_b from rls_ids limit 1;

  select public.health_check() into v_json;
  perform pg_temp.record('health_check returns ok', coalesce(v_json->>'ok', '') = 'true', v_json::text);

  execute 'set local role anon';
  begin
    perform public.health_check();
    execute format('set local role %I', session_user);
    perform pg_temp.record('anon can call health_check', true, 'ok');
  exception when others then
    execute format('set local role %I', session_user);
    perform pg_temp.record('anon can call health_check', false, sqlerrm);
  end;

  execute format('set local role %I', session_user);
  perform pg_temp.create_test_user(v_uid, v_uid::text || '@beta-pending.test', now());
  update public.profiles set beta_access_granted = false where id = v_uid;
  execute 'set local role authenticated';
  perform set_config('request.jwt.claim.sub', v_uid::text, true);
  begin
    insert into public.creations (author_id, type, title, audience, status, body_text)
    values (v_uid, 'poem', 'Blocked', 'public', 'draft', 'x');
    perform pg_temp.record('uninvited user cannot create while invite_only', false, 'insert ok');
  exception when others then
    perform pg_temp.record('uninvited user cannot create while invite_only', true, sqlerrm);
  end;

  execute format('set local role %I', session_user);
  update public.platform_settings
  set value = jsonb_set(value, '{invite_only}', 'true'::jsonb)
  where key = 'beta';
  execute 'set local role authenticated';
  perform set_config('request.jwt.claim.sub', v_founder::text, true);
  v_inv := public.founder_create_invite_code(1, now() + interval '7 days', 'smoke');
  perform set_config('request.jwt.claim.sub', v_uid::text, true);
  perform public.redeem_invite_code(v_inv);
  insert into public.creations (author_id, type, title, audience, status, body_text)
  values (v_uid, 'poem', 'Allowed', 'public', 'draft', 'y') returning id into v_cid;
  perform pg_temp.record('invite redeem grants beta access', v_cid is not null, 'id=' || v_cid::text);

  begin
    perform public.redeem_invite_code(v_inv);
    perform pg_temp.record('invite code single use enforced', false, 'redeemed twice');
  exception when others then
    perform pg_temp.record('invite code single use enforced', true, sqlerrm);
  end;

  execute 'set local role authenticated';
  perform set_config('request.jwt.claim.sub', v_a::text, true);
  perform public.record_user_consent('terms', '2026-10-24');
  select count(*) into v_count from public.user_consents where user_id = v_a and document = 'terms';
  perform pg_temp.record('user consents insert via record_user_consent', v_count >= 1, 'rows=' || v_count);
  begin
    insert into public.user_consents (user_id, document, version) values (v_a, 'terms', 'x');
    perform pg_temp.record('user consents direct insert blocked', false, 'insert ok');
  exception when others then
    perform pg_temp.record('user consents direct insert blocked', true, sqlerrm);
  end;

  perform public.report_client_error('smoke error', 'stack', '/test', '0.0.0', 'test');
  perform set_config('request.jwt.claim.sub', v_founder::text, true);
  v_json := public.founder_list_client_errors(10);
  select count(*) into v_count
  from jsonb_array_elements(v_json) e where e->>'message' = 'smoke error';
  perform pg_temp.record('founder_list_client_errors includes reported row', v_count >= 1, 'rows=' || v_count);

  perform set_config('request.jwt.claim.sub', v_a::text, true);
  v_json := public.export_my_data();
  perform pg_temp.record('export_my_data returns own profile', (v_json->'profile'->>'id')::uuid = v_a, 'id ok');

  perform set_config('request.jwt.claim.sub', v_founder::text, true);
  begin
    perform public.delete_my_account();
    perform pg_temp.record('founder account cannot be deleted', false, 'deleted');
  exception when others then
    perform pg_temp.record('founder account cannot be deleted', true, sqlerrm);
  end;
end $pre_beta_16a$;

do $pre_beta_16b$
declare
  v_a uuid;
  v_b uuid;
  v_founder uuid;
  v_pending uuid := gen_random_uuid();
  v_inv text;
  v_pub uuid;
  v_json jsonb;
  v_count integer;
begin
  select reader_a, reader_b, founder into v_a, v_b, v_founder from rls_ids limit 1;

  execute format('set local role %I', session_user);
  perform pg_temp.create_test_user(v_pending, v_pending::text || '@pending.test', now());
  update public.profiles set beta_access_granted = false where id = v_pending;
  select id into v_pub from public.creations where audience = 'public' and status = 'published' limit 1;

  execute 'set local role authenticated';
  perform set_config('request.jwt.claim.sub', v_pending::text, true);
  perform set_config('request.jwt.claims', json_build_object('sub', v_pending::text, 'role', 'authenticated', 'iat', extract(epoch from now())::bigint)::text, true);

  begin insert into public.likes (user_id, creation_id) values (v_pending, v_pub); perform pg_temp.record('beta gate blocks like insert', false, 'ok');
  exception when others then perform pg_temp.record('beta gate blocks like insert', true, sqlerrm); end;
  begin insert into public.comments (creation_id, author_id, body) values (v_pub, v_pending, 'x'); perform pg_temp.record('beta gate blocks comment insert', false, 'ok');
  exception when others then perform pg_temp.record('beta gate blocks comment insert', true, sqlerrm); end;
  begin insert into public.follows (follower_id, followee_id) values (v_pending, v_b); perform pg_temp.record('beta gate blocks follow insert', false, 'ok');
  exception when others then perform pg_temp.record('beta gate blocks follow insert', true, sqlerrm); end;
  begin perform public.get_or_create_dm(v_b); perform pg_temp.record('beta gate blocks get_or_create_dm', false, 'ok');
  exception when others then perform pg_temp.record('beta gate blocks get_or_create_dm', true, sqlerrm); end;

  begin insert into public.reports (target_type, target_id, reported_user_id, reason) values ('profile', v_b, v_b, 'spam'); perform pg_temp.record('beta gate allows report insert', true, 'ok');
  exception when others then perform pg_temp.record('beta gate allows report insert', false, sqlerrm); end;
  begin perform public.export_my_data(); perform pg_temp.record('beta gate allows export_my_data', true, 'ok');
  exception when others then perform pg_temp.record('beta gate allows export_my_data', false, sqlerrm); end;
  begin perform public.record_user_consent('terms', '2026-10-24'); perform pg_temp.record('beta gate allows record_user_consent', true, 'ok');
  exception when others then perform pg_temp.record('beta gate allows record_user_consent', false, sqlerrm); end;

  perform set_config('request.jwt.claim.sub', v_founder::text, true);
  v_inv := public.founder_create_invite_code(1, now() + interval '1 day', 'smoke16b');
  perform set_config('request.jwt.claim.sub', v_pending::text, true);
  begin perform public.redeem_invite_code('ABCDEFGHJK'); perform pg_temp.record('invite wrong code generic refusal', false, 'accepted');
  exception when others then perform pg_temp.record('invite wrong code generic refusal', true, sqlerrm); end;
  perform public.redeem_invite_code(v_inv);
  perform pg_temp.record('invite redeem unlocks beta access', public.user_beta_access_ok(v_pending), 'ok');

  perform set_config('request.jwt.claim.sub', v_founder::text, true);
  perform public.founder_revoke_invite_code(v_inv);
  v_inv := public.founder_create_invite_code(2, now() + interval '1 day', 'multi');
  perform set_config('request.jwt.claim.sub', v_a::text, true);
  perform public.redeem_invite_code(v_inv);
  perform set_config('request.jwt.claim.sub', v_b::text, true);
  perform public.redeem_invite_code(v_inv);
  perform set_config('request.jwt.claim.sub', v_founder::text, true);
  v_json := public.founder_list_invite_codes();
  select (e->>'uses')::integer into v_count
  from jsonb_array_elements(v_json) e where e->>'code' = v_inv limit 1;
  perform pg_temp.record('invite code multi-use counting', v_count = 2, 'uses=' || v_count);

  execute 'set local role anon';
  begin select count(*) into v_count from public.invite_codes; execute format('set local role %I', session_user); perform pg_temp.record('anon cannot read invite_codes', false, 'rows=' || v_count);
  exception when others then execute format('set local role %I', session_user); perform pg_temp.record('anon cannot read invite_codes', true, sqlerrm); end;

  begin perform public.join_beta_waitlist('not-an-email'); execute format('set local role %I', session_user); perform pg_temp.record('waitlist rejects invalid email', false, 'ok');
  exception when others then execute format('set local role %I', session_user); perform pg_temp.record('waitlist rejects invalid email', true, sqlerrm); end;

  perform set_config('request.jwt.claim.sub', v_founder::text, true);
  v_json := public.founder_list_waitlist(10);
  perform pg_temp.record('founder can list waitlist', v_json is not null, 'json ok');

  perform set_config('request.jwt.claim.sub', v_a::text, true);
  perform public.report_client_error('group-me', 's', '/r', '1', 'ua');
  perform public.report_client_error('group-me', 's', '/r', '1', 'ua');
  perform set_config('request.jwt.claim.sub', v_founder::text, true);
  v_json := public.founder_client_errors_grouped(20);
  select (e->>'count')::integer into v_count from jsonb_array_elements(v_json) e where e->>'message' = 'group-me' limit 1;
  perform pg_temp.record('founder_client_errors_grouped counts duplicates', v_count >= 2, 'count=' || v_count);
  perform public.founder_dismiss_client_error('group-me');
  v_json := public.founder_client_errors_grouped(20);
  select count(*) into v_count from jsonb_array_elements(v_json) e where e->>'message' = 'group-me' and (e->>'dismissed')::boolean;
  perform pg_temp.record('founder_dismiss_client_error marks dismissed', v_count >= 1, 'rows=' || v_count);

  perform set_config('request.jwt.claim.sub', v_a::text, true);
  begin perform public.delete_my_account(); perform pg_temp.record('delete_my_account requires recent session', false, 'deleted');
  exception when others then perform pg_temp.record('delete_my_account requires recent session', true, sqlerrm); end;

  execute 'set local role anon';
  begin perform public.export_my_data(); execute format('set local role %I', session_user); perform pg_temp.record('anon cannot export_my_data', false, 'ok');
  exception when others then execute format('set local role %I', session_user); perform pg_temp.record('anon cannot export_my_data', true, sqlerrm); end;
  execute 'set local role authenticated';
end $pre_beta_16b$;

do $messages_16b$
declare
  v_a uuid;
  v_b uuid;
  v_c uuid;
  v_json jsonb;
  v_count integer;
  v_can boolean;
  v_conv uuid;
  v_msg uuid;
  v_priv uuid;
begin
  select reader_a, reader_b into v_a, v_b from rls_ids limit 1;
  v_c := gen_random_uuid();
  execute format('set local role %I', session_user);
  perform pg_temp.create_test_user(v_c, v_c::text || '@suspended-dm.test', now());
  update public.profiles set status = 'suspended', suspended_until = now() + interval '1 day' where id = v_c;

  perform set_config('request.jwt.claim.sub', v_a::text, true);
  v_json := public.search_dm_writers('reader');
  select count(*) into v_count from jsonb_array_elements(v_json) e where (e->>'id')::uuid = v_c;
  perform pg_temp.record('search_dm_writers excludes suspended account', v_count = 0, 'rows=' || v_count);

  execute format('set local role %I', session_user);
  update public.profiles set status = 'active', suspended_until = null where id = v_c;
  update public.profiles set status = 'banned' where id = v_c;
  perform set_config('request.jwt.claim.sub', v_a::text, true);
  v_json := public.search_dm_writers('suspended');
  select count(*) into v_count from jsonb_array_elements(v_json) e where (e->>'id')::uuid = v_c;
  perform pg_temp.record('search_dm_writers excludes banned account', v_count = 0, 'rows=' || v_count);

  execute format('set local role %I', session_user);
  insert into public.blocks (blocker_id, blocked_id) values (v_a, v_c) on conflict do nothing;
  perform set_config('request.jwt.claim.sub', v_a::text, true);
  v_json := public.search_dm_writers('suspended');
  select count(*) into v_count from jsonb_array_elements(v_json) e where (e->>'id')::uuid = v_c;
  perform pg_temp.record('search_dm_writers excludes blocked user', v_count = 0, 'rows=' || v_count);
  delete from public.blocks where blocker_id = v_a and blocked_id = v_c;

  execute format('set local role %I', session_user);
  delete from public.follows where follower_id = v_a and followee_id = v_b;
  update public.profiles set who_can_message = 'followers', status = 'active' where id = v_b;
  perform set_config('request.jwt.claim.sub', v_a::text, true);
  v_json := public.search_dm_writers('reader');
  select (e->>'can_message')::boolean into v_can from jsonb_array_elements(v_json) e where (e->>'id')::uuid = v_b limit 1;
  perform pg_temp.record('search_dm_writers can_message false without revealing block reason', v_can = false, 'can_message=' || v_can);

  execute format('set local role %I', session_user);
  update public.profiles set who_can_message = 'everyone' where id = v_b;
  perform set_config('request.jwt.claim.sub', v_a::text, true);
  v_conv := public.get_or_create_dm(v_b);
  insert into public.creations (id, author_id, type, title, audience, status, body_text, is_removed)
  values (gen_random_uuid(), v_b, 'poem', 'Removed', 'public', 'published', 'x', true) returning id into v_priv;
  begin perform public.send_message(v_conv, 'share removed', v_priv); perform pg_temp.record('send refused removed shared post', false, 'sent');
  exception when others then perform pg_temp.record('send refused removed shared post', true, sqlerrm); end;

  execute 'set local role anon';
  perform set_config('request.jwt.claim.sub', '', true);
  begin perform public.send_message(gen_random_uuid(), 'x'); execute format('set local role %I', session_user); perform pg_temp.record('anon cannot call send_message', false, 'ok');
  exception when others then execute format('set local role %I', session_user); perform pg_temp.record('anon cannot call send_message', true, sqlerrm); end;
  execute 'set local role anon';
  perform set_config('request.jwt.claim.sub', '', true);
  begin perform public.list_my_conversations(); execute format('set local role %I', session_user); perform pg_temp.record('anon cannot call list_my_conversations', false, 'ok');
  exception when others then execute format('set local role %I', session_user); perform pg_temp.record('anon cannot call list_my_conversations', true, sqlerrm); end;
  execute 'set local role authenticated';
end $messages_16b$;

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
