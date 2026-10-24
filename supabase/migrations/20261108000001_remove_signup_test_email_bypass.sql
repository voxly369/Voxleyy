-- Remove production invite bypass for *.test signup emails (supersedes 20261107000002).

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
