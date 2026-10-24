-- Prompt 18A: Founder email never beta-gated (signup, redeem, write checks).

create or replace function public.auth_email_is_founder(p_email text) returns boolean
language sql immutable as $$
  select lower(btrim(coalesce(p_email, ''))) = public.founder_email();
$$;

revoke all on function public.auth_email_is_founder(text) from public;
grant execute on function public.auth_email_is_founder(text) to anon, authenticated;

create or replace function public.user_beta_access_ok(p_uid uuid default auth.uid()) returns boolean
language sql stable security definer set search_path = public, auth as $$
  select case
    when p_uid is null then false
    when public.auth_email_is_founder(
      (select u.email from auth.users u where u.id = p_uid limit 1)
    ) then true
    when coalesce((public.platform_setting_json('beta')->>'invite_only')::boolean, false) = false then true
    else coalesce((select p.beta_access_granted from public.profiles p where p.id = p_uid), false)
  end;
$$;

create or replace function public.assert_beta_write_allowed(p_user uuid default auth.uid()) returns void
language plpgsql stable security definer set search_path = public, auth as $$
begin
  if p_user is null then raise exception 'forbidden'; end if;
  if public.auth_email_is_founder(
    (select u.email from auth.users u where u.id = p_user limit 1)
  ) then
    return;
  end if;
  if not public.user_beta_access_ok(p_user) then
    raise exception 'Sign-up is not complete. Enter a valid invite code.';
  end if;
end;
$$;

create or replace function public.get_my_beta_status() returns jsonb
language sql stable security definer set search_path = public, auth as $$
  select jsonb_build_object(
    'invite_only', coalesce((public.platform_setting_json('beta')->>'invite_only')::boolean, false),
    'access_granted', public.user_beta_access_ok(auth.uid())
  );
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
begin
  v_founder_signup := public.auth_email_is_founder(new.email);

  chosen := lower(coalesce(new.raw_user_meta_data->>'username', ''));
  if public.chosen_username_ok(chosen) then
    begin
      insert into public.profiles (id, username, display_name, role, beta_access_granted)
      values (
        new.id, chosen,
        left(coalesce(new.raw_user_meta_data->>'display_name', ''), 60),
        case when v_founder_signup and new.email_confirmed_at is not null
          then 'founder'::public.user_role else 'reader'::public.user_role end,
        case when v_founder_signup then true else
          not coalesce((public.platform_setting_json('beta')->>'invite_only')::boolean, false)
        end
      );
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
      insert into public.profiles (id, username, display_name, role, beta_access_granted)
      values (
        new.id, candidate,
        left(coalesce(new.raw_user_meta_data->>'display_name', ''), 60),
        case when v_founder_signup and new.email_confirmed_at is not null
          then 'founder'::public.user_role else 'reader'::public.user_role end,
        case when v_founder_signup then true else
          not coalesce((public.platform_setting_json('beta')->>'invite_only')::boolean, false)
        end
      );
      return new;
    exception when unique_violation then
      get stacked diagnostics v_constraint = constraint_name;
      if v_constraint is distinct from 'profiles_username_key' then raise; end if;
    end;
  end loop;
  raise exception 'could not allocate a username';
end;
$$;

create or replace function public.redeem_invite_code(p_code text) returns void
language plpgsql security definer set search_path = public, auth as $$
declare
  uid uuid := auth.uid();
  normalized text := upper(btrim(coalesce(p_code, '')));
  row public.invite_codes%rowtype;
  sk text := coalesce(uid::text, 'anon:' || coalesce(current_setting('request.jwt.claim.sub', true), 'unknown'));
  v_email text;
begin
  if uid is null then raise exception 'forbidden'; end if;
  select u.email into v_email from auth.users u where u.id = uid;
  if public.auth_email_is_founder(v_email) then
    update public.profiles set beta_access_granted = true where id = uid;
    return;
  end if;
  perform public.record_invite_attempt(sk);
  if normalized !~ '^[A-HJ-NP-Z2-9]{10}$' then
    raise exception 'That invite code isn''t valid.';
  end if;
  select * into row from public.invite_codes where code = normalized for update;
  if not found or row.revoked or (row.expires_at is not null and row.expires_at <= now())
     or row.uses >= row.max_uses then
    raise exception 'That invite code isn''t valid.';
  end if;
  update public.invite_codes set uses = uses + 1 where code = normalized;
  update public.profiles set beta_access_granted = true where id = uid;
end;
$$;
