-- Allow smoke tests and service role to read founder_email() (immutable constant).
grant execute on function public.founder_email() to postgres;
grant execute on function public.auth_email_is_founder(text) to postgres;
