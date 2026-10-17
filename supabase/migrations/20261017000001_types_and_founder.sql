-- Voxly 0001. Paste this first in the Supabase SQL editor.
-- REMINDER: enable "Confirm email" in Supabase Auth settings so nobody can claim the founder address unverified.

create extension if not exists citext;
create extension if not exists pg_trgm;

create type public.user_role as enum ('reader','writer','founder');
create type public.account_status as enum ('active','suspended','banned');
create type public.creation_type as enum (
  'written_post','poem','story','essay','article','lyric','letter','script','journal',
  'quote_card','book','recitation_video','voice_clip','podcast','course','event','collab');
create type public.audience as enum ('public','unlisted','private');
create type public.publish_status as enum ('draft','published','removed');
create type public.report_reason as enum ('spam','inappropriate','harassment','copyright','other');
create type public.report_target as enum ('creation','chapter','comment','profile');
create type public.report_status as enum ('open','dismissed','actioned');
create type public.mod_action as enum ('dismiss','remove','restore','warn','suspend','ban','unban','appeal_decision');

-- FOUNDER LOCK. Hardcoded on purpose. The Founder is decided here, on the server, never by client input.
-- REMINDER: enable "Confirm email" in Supabase Auth settings so nobody can claim this address unverified.
create or replace function public.founder_email() returns text
language sql immutable as $$ select 'voxly369@gmail.com'::text $$;

create or replace function public.is_founder() returns boolean
language sql stable security definer set search_path = public, auth as $$
  select exists (
    select 1 from auth.users u
    where u.id = auth.uid()
      and lower(u.email) = public.founder_email()
      and u.email_confirmed_at is not null
  );
$$;
revoke all on function public.is_founder() from public, anon;
grant execute on function public.is_founder() to authenticated;
