-- Local RLS smoke bootstrap (Postgres 15). Not applied in production.
-- Run once before applying supabase/migrations in filename order.

-- Roles Supabase exposes to PostgREST / JWT sessions.
do $$
begin
  create role anon nologin;
  create role authenticated nologin;
  create role service_role nologin bypassrls;
exception
  when duplicate_object then null;
end $$;

create extension if not exists pgcrypto;
create extension if not exists citext;
create extension if not exists pg_trgm;

-- Realtime publication referenced by some migrations.
do $$
begin
  create publication supabase_realtime;
exception
  when duplicate_object then null;
end $$;

-- ---------------------------------------------------------------------------
-- auth (minimal Supabase-compatible shape for triggers and smoke fixtures)
-- ---------------------------------------------------------------------------
create schema if not exists auth;

create table if not exists auth.users (
  instance_id uuid,
  id uuid not null primary key,
  aud varchar(255),
  role varchar(255),
  email varchar(255),
  encrypted_password varchar(255),
  confirmed_at timestamptz,
  email_confirmed_at timestamptz,
  invited_at timestamptz,
  confirmation_token varchar(255),
  confirmation_sent_at timestamptz,
  recovery_token varchar(255),
  recovery_sent_at timestamptz,
  email_change_token varchar(255),
  email_change varchar(255),
  email_change_sent_at timestamptz,
  email_change_token_new varchar(255),
  email_change_token_current varchar(255),
  reauthentication_token varchar(255),
  last_sign_in_at timestamptz,
  raw_app_meta_data jsonb,
  raw_user_meta_data jsonb,
  is_super_admin boolean,
  is_sso_user boolean default false,
  is_anonymous boolean default false,
  created_at timestamptz,
  updated_at timestamptz
);

create unique index if not exists auth_users_email_unique on auth.users (lower(email));

create table if not exists auth.identities (
  id uuid primary key default gen_random_uuid(),
  user_id uuid,
  identity_data jsonb,
  provider text,
  provider_id text,
  last_sign_in_at timestamptz,
  created_at timestamptz,
  updated_at timestamptz
);

create or replace function auth.uid() returns uuid as $$
  select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid;
$$ language sql stable;

create or replace function auth.role() returns text as $$
  select nullif(current_setting('request.jwt.claim.role', true), '')::text;
$$ language sql stable;

create or replace function auth.email() returns text as $$
  select nullif(current_setting('request.jwt.claim.email', true), '')::text;
$$ language sql stable;

grant usage on schema auth to anon, authenticated, service_role;
grant all privileges on all tables in schema auth to postgres;

-- ---------------------------------------------------------------------------
-- storage (metadata tables; policies come from product migrations)
-- ---------------------------------------------------------------------------
create schema if not exists storage;

create table if not exists storage.buckets (
  id text primary key,
  name text not null,
  owner uuid,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  public boolean default false,
  file_size_limit bigint,
  allowed_mime_types text[]
);

create table if not exists storage.objects (
  id uuid primary key default gen_random_uuid(),
  bucket_id text references storage.buckets (id) on delete cascade,
  name text,
  owner uuid,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  last_accessed_at timestamptz default now(),
  metadata jsonb,
  version text,
  owner_id text
);

create or replace function storage.foldername(name text) returns text[] as $$
  select string_to_array(name, '/');
$$ language sql immutable;

grant usage on schema storage to postgres, anon, authenticated, service_role;
