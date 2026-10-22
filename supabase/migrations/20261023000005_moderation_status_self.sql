-- Let signed-in users read their own moderation status reason (for ban/suspend screens).

create or replace function public.my_account_restriction()
returns table (
  status public.account_status,
  suspended_until timestamptz,
  status_reason text
)
language sql
stable
security definer
set search_path = public
as $$
  select p.status, p.suspended_until, p.status_reason
  from public.profiles p
  where p.id = auth.uid();
$$;

revoke all on function public.my_account_restriction() from public, anon;
grant execute on function public.my_account_restriction() to authenticated;
