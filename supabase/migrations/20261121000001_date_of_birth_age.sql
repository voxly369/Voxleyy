-- Date of birth for age gating (POPIA: private table, owner + founder only).

create table if not exists public.account_private (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  date_of_birth date not null,
  updated_at timestamptz not null default now(),
  constraint account_private_dob_not_future check (date_of_birth <= current_date),
  constraint account_private_dob_reasonable check (date_of_birth >= (current_date - interval '120 years'))
);

alter table public.account_private enable row level security;

create policy account_private_select on public.account_private
  for select to authenticated
  using (user_id = auth.uid() or public.is_founder());

create policy account_private_insert on public.account_private
  for insert to authenticated
  with check (user_id = auth.uid());

create policy account_private_update on public.account_private
  for update to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

revoke all on table public.account_private from public, anon;
grant select, insert, update on table public.account_private to authenticated;

create or replace function public.viewer_date_of_birth(p_user uuid default auth.uid())
returns date
language sql
stable
security definer
set search_path = public
as $$
  select ap.date_of_birth
  from public.account_private ap
  where ap.user_id = coalesce(p_user, auth.uid());
$$;

create or replace function public.viewer_meets_minimum_age(p_user uuid default auth.uid(), p_years integer default 13)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (
      select ap.date_of_birth <= (current_date - make_interval(years => p_years))::date
      from public.account_private ap
      where ap.user_id = coalesce(p_user, auth.uid())
    ),
    false
  );
$$;

create or replace function public.viewer_confirmed_age_18(p_user uuid default auth.uid())
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.viewer_meets_minimum_age(p_user, 18);
$$;

create or replace function public.viewer_may_see_mature_content(p_user uuid default auth.uid())
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.viewer_confirmed_age_18(p_user)
    and coalesce(
      (
        select ns.show_mature_content
        from public.notification_settings ns
        where ns.user_id = coalesce(p_user, auth.uid())
      ),
      false
    );
$$;

revoke all on function public.viewer_date_of_birth(uuid) from public, anon;
revoke all on function public.viewer_meets_minimum_age(uuid, integer) from public, anon;
revoke all on function public.viewer_confirmed_age_18(uuid) from public, anon;
revoke all on function public.viewer_may_see_mature_content(uuid) from public, anon;
grant execute on function public.viewer_date_of_birth(uuid) to authenticated;
grant execute on function public.viewer_meets_minimum_age(uuid, integer) to authenticated;
grant execute on function public.viewer_confirmed_age_18(uuid) to authenticated;
grant execute on function public.viewer_may_see_mature_content(uuid) to authenticated;

-- Owner upsert (settings); validates 13+.
create or replace function public.upsert_my_date_of_birth(p_date_of_birth date)
returns date
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  v_dob date;
begin
  if uid is null then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  if p_date_of_birth is null then
    raise exception 'Enter your date of birth.';
  end if;
  if p_date_of_birth > current_date then
    raise exception 'Date of birth cannot be in the future.';
  end if;
  if p_date_of_birth < (current_date - interval '120 years')::date then
    raise exception 'Enter a valid date of birth.';
  end if;
  if p_date_of_birth > (current_date - interval '13 years')::date then
    raise exception 'You must be at least 13 to use Voxly.';
  end if;

  insert into public.account_private (user_id, date_of_birth, updated_at)
  values (uid, p_date_of_birth, now())
  on conflict (user_id) do update
  set date_of_birth = excluded.date_of_birth, updated_at = now()
  returning date_of_birth into v_dob;

  if v_dob <= (current_date - interval '18 years')::date then
    if not exists (select 1 from public.user_consents uc where uc.user_id = uid and uc.document = 'age_18') then
      insert into public.user_consents (user_id, document, version) values (uid, 'age_18', 'dob');
    end if;
  end if;

  return v_dob;
end;
$$;

revoke all on function public.upsert_my_date_of_birth(date) from public, anon;
grant execute on function public.upsert_my_date_of_birth(date) to authenticated;

create or replace function public.get_my_date_of_birth()
returns date
language sql
stable
security definer
set search_path = public
as $$
  select public.viewer_date_of_birth(auth.uid());
$$;

revoke all on function public.get_my_date_of_birth() from public, anon;
grant execute on function public.get_my_date_of_birth() to authenticated;

create or replace function public.ingest_signup_date_of_birth(p_user uuid, p_meta jsonb)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_raw text := nullif(btrim(coalesce(p_meta->>'date_of_birth', '')), '');
  v_dob date;
begin
  if p_user is null then return; end if;
  if v_raw is null then
    raise exception 'Enter your date of birth.';
  end if;
  begin
    v_dob := v_raw::date;
  exception when others then
    raise exception 'Enter a valid date of birth.';
  end;

  perform public.upsert_my_date_of_birth_for_user(p_user, v_dob);
end;
$$;

-- Signup path (no auth.uid() yet on some flows — caller is handle_new_user).
create or replace function public.upsert_my_date_of_birth_for_user(p_user uuid, p_date_of_birth date)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_user is null then return; end if;
  if p_date_of_birth is null or p_date_of_birth > current_date then
    raise exception 'Enter a valid date of birth.';
  end if;
  if p_date_of_birth > (current_date - interval '13 years')::date then
    raise exception 'You must be at least 13 to use Voxly.';
  end if;

  insert into public.account_private (user_id, date_of_birth, updated_at)
  values (p_user, p_date_of_birth, now())
  on conflict (user_id) do update
  set date_of_birth = excluded.date_of_birth, updated_at = now();

  if p_date_of_birth <= (current_date - interval '18 years')::date then
    if not exists (select 1 from public.user_consents uc where uc.user_id = p_user and uc.document = 'age_18') then
      insert into public.user_consents (user_id, document, version) values (p_user, 'age_18', 'dob');
    end if;
  end if;
end;
$$;

revoke all on function public.ingest_signup_date_of_birth(uuid, jsonb) from public, anon, authenticated;
revoke all on function public.upsert_my_date_of_birth_for_user(uuid, date) from public, anon, authenticated;

create or replace function public.record_signup_consents_from_metadata(p_user uuid, p_meta jsonb)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_terms text := nullif(btrim(coalesce(p_meta->>'consent_terms', '')), '');
  v_privacy text := nullif(btrim(coalesce(p_meta->>'consent_privacy', '')), '');
begin
  if p_user is null then return; end if;
  if v_terms is not null then
    insert into public.user_consents (user_id, document, version) values (p_user, 'terms', left(v_terms, 32));
  end if;
  if v_privacy is not null then
    insert into public.user_consents (user_id, document, version) values (p_user, 'privacy', left(v_privacy, 32));
  end if;
  perform public.ingest_signup_date_of_birth(p_user, p_meta);
end;
$$;

create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public, auth as $$
declare
  base text;
  candidate text;
  chosen text;
  attempt int;
  v_constraint text;
  v_founder_signup boolean;
  v_invite_only boolean;
  v_display text;
  v_country char(2);
  v_tz text;
  v_invite text;
  v_beta_granted boolean;
begin
  v_founder_signup := public.auth_email_is_founder(new.email);
  v_invite_only := coalesce((public.platform_setting_json('beta')->>'invite_only')::boolean, false);

  v_display := left(btrim(coalesce(new.raw_user_meta_data->>'display_name', '')), 50);
  if char_length(v_display) < 1 then
    raise exception 'Enter a display name (1 to 50 characters).';
  end if;

  v_country := upper(btrim(coalesce(new.raw_user_meta_data->>'country', '')));
  if v_country is null or v_country = '' or length(v_country) <> 2 then
    raise exception 'Choose your country.';
  end if;
  if not exists (select 1 from public.countries c where c.code = v_country) then
    raise exception 'Choose a valid country.';
  end if;

  v_tz := coalesce(nullif(btrim(coalesce(new.raw_user_meta_data->>'timezone', '')), ''), 'UTC');
  if char_length(v_tz) > 64 then v_tz := 'UTC'; end if;

  v_invite := upper(btrim(coalesce(new.raw_user_meta_data->>'invite_code', '')));

  if v_founder_signup then
    v_beta_granted := true;
  elsif not v_invite_only then
    v_beta_granted := true;
  else
    if v_invite = '' then
      raise exception 'That invite code isn''t valid.';
    end if;
    perform public.consume_invite_code_for_signup(v_invite);
    v_beta_granted := true;
  end if;

  chosen := lower(coalesce(new.raw_user_meta_data->>'username', ''));
  if public.chosen_username_ok(chosen) then
    begin
      insert into public.profiles (id, username, display_name, role, beta_access_granted, country, timezone)
      values (
        new.id, chosen, v_display,
        case when v_founder_signup and new.email_confirmed_at is not null
          then 'founder'::public.user_role else 'reader'::public.user_role end,
        v_beta_granted,
        v_country,
        v_tz
      );
      perform public.ensure_founder_badge(new.id);
      perform public.record_signup_consents_from_metadata(new.id, new.raw_user_meta_data);
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
      insert into public.profiles (id, username, display_name, role, beta_access_granted, country, timezone)
      values (
        new.id, candidate, v_display,
        case when v_founder_signup and new.email_confirmed_at is not null
          then 'founder'::public.user_role else 'reader'::public.user_role end,
        v_beta_granted,
        v_country,
        v_tz
      );
      perform public.ensure_founder_badge(new.id);
      perform public.record_signup_consents_from_metadata(new.id, new.raw_user_meta_data);
      return new;
    exception when unique_violation then
      get stacked diagnostics v_constraint = constraint_name;
      if v_constraint is distinct from 'profiles_username_key' then raise; end if;
    end;
  end loop;
  raise exception 'could not allocate a username';
end;
$$;

-- Self-export: include DOB only in owner's export payload.
create or replace function public.export_my_data() returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  uid uuid := auth.uid();
  out jsonb;
  out_text text;
  max_bytes integer := 4000000;
  v_dob date;
begin
  if uid is null then raise exception 'forbidden'; end if;
  delete from public.data_export_attempts where user_id = uid and created_at < now() - interval '1 day';
  if (select count(*) from public.data_export_attempts where user_id = uid and created_at > now() - interval '1 day') >= 1 then
    raise exception 'You can download your data once per day.';
  end if;
  insert into public.data_export_attempts (user_id) values (uid);
  select ap.date_of_birth into v_dob from public.account_private ap where ap.user_id = uid;
  select jsonb_build_object(
    'exported_at', now(),
    'profile', (select row_to_json(p) from public.profiles p where p.id = uid),
    'date_of_birth', v_dob,
    'notification_settings', (select row_to_json(s) from public.notification_settings s where s.user_id = uid),
    'creations', coalesce((select jsonb_agg(row_to_json(c)) from public.creations c where c.author_id = uid), '[]'::jsonb),
    'comments', coalesce((select jsonb_agg(row_to_json(cm)) from public.comments cm where cm.author_id = uid), '[]'::jsonb),
    'likes', coalesce((select jsonb_agg(row_to_json(l)) from public.likes l where l.user_id = uid), '[]'::jsonb),
    'saves', coalesce((select jsonb_agg(row_to_json(sv)) from public.saves sv where sv.user_id = uid), '[]'::jsonb),
    'follows', coalesce((select jsonb_agg(row_to_json(f)) from public.follows f where f.follower_id = uid), '[]'::jsonb),
    'collections', coalesce((select jsonb_agg(row_to_json(rc)) from public.reader_collections rc where rc.user_id = uid), '[]'::jsonb),
    'highlights', coalesce((select jsonb_agg(row_to_json(h)) from public.reader_highlights h where h.user_id = uid), '[]'::jsonb),
    'bookmarks', coalesce((select jsonb_agg(row_to_json(b)) from public.reader_bookmarks b where b.user_id = uid), '[]'::jsonb),
    'reading_progress', coalesce((select jsonb_agg(row_to_json(rp)) from public.post_reading_progress rp where rp.user_id = uid), '[]'::jsonb),
    'badges', coalesce((select jsonb_agg(row_to_json(ub)) from public.user_badges ub where ub.user_id = uid), '[]'::jsonb),
    'messages_sent', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', m.id, 'body', m.body, 'conversation_id', m.conversation_id,
        'created_at', m.created_at, 'deleted_at', m.deleted_at
      )) from public.messages m where m.sender_id = uid
    ), '[]'::jsonb),
    'consents', coalesce((select public.get_my_consents()), '[]'::jsonb)
  ) into out;
  out_text := out::text;
  if octet_length(out_text) > max_bytes then
    return jsonb_build_object(
      'truncated', true,
      'max_bytes', max_bytes,
      'notice', 'Your export is too large to return in one file. Contact support for a full archive.',
      'exported_at', now()
    );
  end if;
  return out || jsonb_build_object('truncated', false);
end;
$$;
