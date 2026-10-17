-- Voxly signup username.
-- A chosen username from raw_user_meta_data is used only when it is valid and free.
-- Invalid, reserved, or taken values fall back to the generated username so signup never fails
-- because of the username. Metadata is user-controlled: role, status, verified, and counters
-- are never read from it. display_name is still the only other metadata field, truncated to 60.

create or replace function public.chosen_username_ok(candidate text) returns boolean
language sql immutable security definer set search_path = public as $$
  select candidate ~ '^[a-z0-9_]{3,30}$'
    and candidate <> all (array[
      'admin', 'administrator', 'founder', 'voxly', 'voxlyteam', 'support', 'help',
      'moderator', 'mod', 'staff', 'system', 'root', 'null', 'undefined', 'api', 'www',
      'mail', 'email', 'security', 'official', 'settings', 'login', 'logout', 'signup',
      'register', 'terms', 'privacy', 'discover', 'create', 'messages', 'profile',
      'profiles', 'notifications', 'search', 'home', 'about', 'contact', 'wallet',
      'marketplace', 'library', 'reader', 'writer', 'penpals'
    ]::text[]);
$$;

revoke all on function public.chosen_username_ok(text) from public, anon, authenticated;

-- True only for a lowercased, well-formed, unreserved name that is not already on a profile.
-- Returns a boolean and nothing else. Usernames are public on profiles.
create or replace function public.username_available(candidate text) returns boolean
language sql stable security definer set search_path = public as $$
  select public.chosen_username_ok(lower(coalesce(candidate, '')))
    and not exists (
      select 1 from public.profiles p
      where p.username = lower(coalesce(candidate, ''))
    );
$$;

revoke all on function public.username_available(text) from public;
grant execute on function public.username_available(text) to anon, authenticated;

-- Same function as 20261017000003. Username choice is the only change.
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public, auth as $$
declare
  base text;
  candidate text;
  chosen text;
  attempt int;
  v_constraint text;
begin
  -- Lowercase first. A mixed-case choice is accepted only as its lowercase form.
  -- Invalid, reserved, or already-taken choices fall through to the generator.
  chosen := lower(coalesce(new.raw_user_meta_data->>'username', ''));
  if public.chosen_username_ok(chosen) then
    begin
      insert into public.profiles (id, username, display_name, role)
      values (
        new.id,
        chosen,
        left(coalesce(new.raw_user_meta_data->>'display_name', ''), 60),
        case
          when lower(new.email) = public.founder_email() and new.email_confirmed_at is not null
            then 'founder'::public.user_role
          else 'reader'::public.user_role
        end
      );
      return new;
    exception when unique_violation then
      get stacked diagnostics v_constraint = constraint_name;
      if v_constraint is distinct from 'profiles_username_key' then
        raise;
      end if;
    end;
  end if;

  base := left(regexp_replace(lower(split_part(coalesce(new.email, ''), '@', 1)), '[^a-z0-9_]', '', 'g'), 20);
  if char_length(base) < 3 then base := 'writer'; end if;

  for attempt in 1..8 loop
    candidate := base || substr(md5(random()::text || new.id::text || attempt::text), 1, 5);
    begin
      insert into public.profiles (id, username, display_name, role)
      values (
        new.id,
        candidate,
        left(coalesce(new.raw_user_meta_data->>'display_name', ''), 60),
        case
          when lower(new.email) = public.founder_email() and new.email_confirmed_at is not null
            then 'founder'::public.user_role
          else 'reader'::public.user_role
        end
      );
      return new;
    exception when unique_violation then
      get stacked diagnostics v_constraint = constraint_name;
      if v_constraint is distinct from 'profiles_username_key' then
        raise;
      end if;
    end;
  end loop;

  raise exception 'could not allocate a username';
end $$;
