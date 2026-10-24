-- Stage 2: entrance preferences, daily_quotes, quote_of_the_day.

alter table public.profile_preferences
  add column if not exists last_entrance_local_date date
    check (last_entrance_local_date is null or last_entrance_local_date >= date '2020-01-01'),
  add column if not exists show_entrance_screen boolean not null default true;

create table if not exists public.daily_quotes (
  id uuid primary key default gen_random_uuid(),
  text text not null check (char_length(text) between 1 and 300),
  author text not null check (char_length(author) between 1 and 80),
  source text check (source is null or char_length(source) <= 120),
  active boolean not null default true,
  kind text not null check (kind in ('public_domain', 'original', 'owner')),
  created_at timestamptz not null default now()
);

create index if not exists daily_quotes_active_kind_idx on public.daily_quotes (active, kind);

alter table public.daily_quotes enable row level security;
revoke all on table public.daily_quotes from public, anon;
grant select on table public.daily_quotes to authenticated;

create policy daily_quotes_read_signed_in on public.daily_quotes
  for select to authenticated using (true);

delete from public.daily_quotes where kind = 'owner' and text like 'The sky is not%';

insert into public.daily_quotes (text, author, source, active, kind)
select * from (values
  ('The sky is not the limit, you limit yourself to the sky.', 'Jaydin, Founder of Voxly', null, true, 'owner'),
  ('A word after a word after a word is power.', 'Margaret Atwood', null, true, 'public_domain'),
  ('We write to taste life twice, in the moment and in retrospect.', 'Anaïs Nin', null, true, 'public_domain'),
  ('Fill your paper with the breathings of your heart.', 'William Wordsworth', null, true, 'public_domain'),
  ('The art of writing is the art of discovering what you believe.', 'Gustave Flaubert', null, true, 'public_domain'),
  ('Every page holds a door if you are willing to knock.', 'Voxly', null, true, 'original'),
  ('Quiet ink can still change a room.', 'Voxly', null, true, 'original'),
  ('Read slowly; the world is in no hurry.', 'Voxly', null, true, 'original')
) as v(text, author, source, active, kind)
where not exists (select 1 from public.daily_quotes dq where dq.text = v.text and dq.author = v.author);

create or replace function public.quote_of_the_day(p_day date default (timezone('utc', now()))::date, p_tz text default 'UTC')
returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare
  v_count integer;
  v_idx integer;
  v_row public.daily_quotes%rowtype;
begin
  select count(*) into v_count from public.daily_quotes where active;
  if v_count = 0 then
    return jsonb_build_object(
      'text', 'The sky is not the limit, you limit yourself to the sky.',
      'author', 'Jaydin, Founder of Voxly',
      'source', null,
      'kind', 'owner'
    );
  end if;
  v_idx := (extract(epoch from (p_day::timestamp at time zone coalesce(nullif(btrim(p_tz), ''), 'UTC')))::bigint % v_count);
  if v_idx < 0 then v_idx := -v_idx; end if;
  select * into v_row
  from public.daily_quotes
  where active
  order by id
  offset (v_idx % v_count)
  limit 1;
  return jsonb_build_object('text', v_row.text, 'author', v_row.author, 'source', v_row.source, 'kind', v_row.kind);
end;
$$;

revoke all on function public.quote_of_the_day(date, text) from public, anon;
grant execute on function public.quote_of_the_day(date, text) to authenticated;

create or replace function public.upsert_my_profile_preferences(p_patch jsonb) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  uid uuid := auth.uid();
  v_roles text[];
  v_genres text[];
  v_langs text[];
begin
  if uid is null then raise exception 'forbidden'; end if;
  v_roles := coalesce(
    (select array_agg(x) from jsonb_array_elements_text(coalesce(p_patch->'writer_roles', '[]'::jsonb)) x),
    '{}'::text[]
  );
  v_genres := coalesce(
    (select array_agg(x) from jsonb_array_elements_text(coalesce(p_patch->'favorite_genres', '[]'::jsonb)) x),
    '{}'::text[]
  );
  v_langs := coalesce(
    (select array_agg(x) from jsonb_array_elements_text(coalesce(p_patch->'languages', '[]'::jsonb)) x),
    '{}'::text[]
  );
  insert into public.profile_preferences (
    user_id, onboarding_step, writer_roles, favorite_genres, languages, checklist_progress, welcome_moment_seen_at,
    last_entrance_local_date, show_entrance_screen
  )
  values (
    uid,
    coalesce((p_patch->>'onboarding_step')::smallint, 0),
    v_roles, v_genres, v_langs,
    coalesce(p_patch->'checklist_progress', '{}'::jsonb),
    (p_patch->>'welcome_moment_seen_at')::timestamptz,
    (p_patch->>'last_entrance_local_date')::date,
    coalesce((p_patch->>'show_entrance_screen')::boolean, true)
  )
  on conflict (user_id) do update set
    onboarding_step = coalesce((p_patch->>'onboarding_step')::smallint, profile_preferences.onboarding_step),
    onboarding_completed_at = case
      when p_patch ? 'onboarding_completed_at' then (p_patch->>'onboarding_completed_at')::timestamptz
      else profile_preferences.onboarding_completed_at
    end,
    writer_roles = case when p_patch ? 'writer_roles' then excluded.writer_roles else profile_preferences.writer_roles end,
    favorite_genres = case when p_patch ? 'favorite_genres' then excluded.favorite_genres else profile_preferences.favorite_genres end,
    languages = case when p_patch ? 'languages' then excluded.languages else profile_preferences.languages end,
    checklist_progress = case when p_patch ? 'checklist_progress' then excluded.checklist_progress else profile_preferences.checklist_progress end,
    checklist_dismissed_at = case
      when p_patch ? 'checklist_dismissed_at' then (p_patch->>'checklist_dismissed_at')::timestamptz
      else profile_preferences.checklist_dismissed_at
    end,
    welcome_moment_seen_at = coalesce((p_patch->>'welcome_moment_seen_at')::timestamptz, profile_preferences.welcome_moment_seen_at),
    last_entrance_local_date = case
      when p_patch ? 'last_entrance_local_date' then (p_patch->>'last_entrance_local_date')::date
      else profile_preferences.last_entrance_local_date
    end,
    show_entrance_screen = case
      when p_patch ? 'show_entrance_screen' then (p_patch->>'show_entrance_screen')::boolean
      else profile_preferences.show_entrance_screen
    end,
    updated_at = now();
  return public.get_my_profile_preferences();
end;
$$;
