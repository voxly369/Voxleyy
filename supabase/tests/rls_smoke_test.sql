-- Voxly RLS smoke test.
-- Paste this AFTER 0001 through 0005, as one script, in the Supabase SQL editor.
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

create or replace function pg_temp.create_test_user(p_id uuid, p_email text, p_confirmed timestamptz)
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
    'raw_user_meta_data', quote_literal('{}') || '::jsonb',
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

  update public.moderation_actions set reason = 'tamper' where target_user_id = v_b;
  get diagnostics n = row_count;
  perform pg_temp.record('founder cannot update the audit log', n = 0, 'rows=' || n);

  delete from public.moderation_actions where target_user_id = v_b;
  get diagnostics n = row_count;
  perform pg_temp.record('founder cannot delete the audit log', n = 0, 'rows=' || n);
end $$;

do $$
begin
  update public.moderation_actions set reason = 'tamper';
  perform pg_temp.record('table owner cannot update the audit log', false, 'update succeeded');
exception when others then
  perform pg_temp.record('table owner cannot update the audit log', true, sqlerrm);
end $$;

do $$
begin
  delete from public.moderation_actions;
  perform pg_temp.record('table owner cannot delete the audit log', false, 'delete succeeded');
exception when others then
  perform pg_temp.record('table owner cannot delete the audit log', true, sqlerrm);
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
