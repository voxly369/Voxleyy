-- Supabase enables RLS on storage tables; minimal local bootstrap does not.
alter table storage.objects enable row level security;
alter table storage.buckets enable row level security;

-- Local grants mirroring Supabase Storage API defaults (RLS still applies).
grant select, insert, update, delete on storage.objects to authenticated;

-- Smoke calls award_user_badge after set local role authenticated when a prior
-- block did not reset session_user; hosted Supabase may run with broader defaults.
grant execute on function public.award_user_badge(uuid, text, date) to authenticated;

-- Run the smoke script as a non-superuser so SET LOCAL ROLE authenticated enforces RLS
-- (the default postgres login bypasses policies even after SET ROLE).
do $$
begin
  create role voxly_rls_runner login password 'runner' nosuperuser nobypassrls;
exception
  when duplicate_object then null;
end $$;

grant connect on database postgres to voxly_rls_runner;
grant anon, authenticated, service_role to voxly_rls_runner;
grant usage on schema public, auth, storage to voxly_rls_runner;
grant all privileges on all tables in schema public to voxly_rls_runner;
grant all privileges on all tables in schema auth to voxly_rls_runner;
grant all privileges on all tables in schema storage to voxly_rls_runner;
grant all privileges on all sequences in schema public to voxly_rls_runner;
grant execute on all functions in schema public to voxly_rls_runner;

do $$
declare
  r record;
begin
  for r in
    select quote_ident(n.nspname) as nsp, quote_ident(c.relname) as tbl
    from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname in ('public', 'auth', 'storage')
      and c.relkind in ('r', 'p')
  loop
    execute format('alter table %s.%s owner to voxly_rls_runner', r.nsp, r.tbl);
  end loop;
end $$;
