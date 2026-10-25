-- Remove ambiguous zero-argument overload; callers must use delete_my_account(text).

drop function if exists public.delete_my_account();
