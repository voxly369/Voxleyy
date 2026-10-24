-- Prompt 16B: founder invite/waitlist tools, client error grouping, invite attempt smoke helpers.

create or replace function public.founder_list_invite_codes() returns jsonb
language plpgsql stable security definer set search_path = public as $$
begin
  if not public.is_founder() then raise exception 'forbidden' using errcode = '42501'; end if;
  return coalesce((
    select jsonb_agg(row_to_json(c)::jsonb order by c.created_at desc)
    from public.invite_codes c
  ), '[]'::jsonb);
end;
$$;

revoke all on function public.founder_list_invite_codes() from public, anon;
grant execute on function public.founder_list_invite_codes() to authenticated;

create or replace function public.founder_revoke_invite_code(p_code text) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not public.is_founder() then raise exception 'forbidden' using errcode = '42501'; end if;
  update public.invite_codes set revoked = true where code = upper(btrim(p_code));
  if not found then raise exception 'Invite code not found.'; end if;
end;
$$;

revoke all on function public.founder_revoke_invite_code(text) from public, anon;
grant execute on function public.founder_revoke_invite_code(text) to authenticated;

create or replace function public.founder_list_waitlist(p_limit integer default 100) returns jsonb
language plpgsql stable security definer set search_path = public as $$
begin
  if not public.is_founder() then raise exception 'forbidden' using errcode = '42501'; end if;
  return coalesce((
    select jsonb_agg(row_to_json(w)::jsonb order by w.created_at desc)
    from (
      select id, email, created_at from public.beta_waitlist
      order by created_at desc
      limit least(greatest(p_limit, 1), 500)
    ) w
  ), '[]'::jsonb);
end;
$$;

revoke all on function public.founder_list_waitlist(integer) from public, anon;
grant execute on function public.founder_list_waitlist(integer) to authenticated;

create or replace function public.founder_client_errors_grouped(p_limit integer default 50) returns jsonb
language plpgsql stable security definer set search_path = public as $$
begin
  if not public.is_founder() then raise exception 'forbidden' using errcode = '42501'; end if;
  perform public.prune_client_errors();
  return coalesce((
    select jsonb_agg(jsonb_build_object(
      'message', g.message,
      'count', g.cnt,
      'last_seen', g.last_seen,
      'dismissed', g.all_dismissed
    ) order by g.last_seen desc)
    from (
      select message,
        count(*)::integer as cnt,
        max(created_at) as last_seen,
        bool_and(dismissed) as all_dismissed
      from public.client_errors
      group by message
      order by max(created_at) desc
      limit least(greatest(p_limit, 1), 100)
    ) g
  ), '[]'::jsonb);
end;
$$;

revoke all on function public.founder_client_errors_grouped(integer) from public, anon;
grant execute on function public.founder_client_errors_grouped(integer) to authenticated;

create or replace function public.founder_dismiss_client_error(p_message text) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not public.is_founder() then raise exception 'forbidden' using errcode = '42501'; end if;
  update public.client_errors set dismissed = true where message = left(btrim(p_message), 500);
end;
$$;

revoke all on function public.founder_dismiss_client_error(text) from public, anon;
grant execute on function public.founder_dismiss_client_error(text) to authenticated;

revoke all on function public.list_my_conversations(timestamptz, integer) from public, anon;
grant execute on function public.list_my_conversations(timestamptz, integer) to authenticated;
