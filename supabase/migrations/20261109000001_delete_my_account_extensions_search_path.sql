-- Supabase installs pgcrypto in the extensions schema; digest() must resolve during account deletion.

create or replace function public.delete_my_account(p_reason text default 'user_requested') returns void
language plpgsql security definer set search_path = public, auth, storage, extensions as $$
declare
  uid uuid := auth.uid();
  em text;
  h text;
  queued integer;
begin
  if uid is null then raise exception 'forbidden'; end if;
  if not public.auth_session_recent() then
    raise exception 'For your security, sign in again before deleting your account.';
  end if;
  select email into em from auth.users where id = uid;
  if lower(coalesce(em, '')) = public.founder_email() then
    raise exception 'The Founder account cannot be deleted.';
  end if;
  h := encode(digest(uid::text, 'sha256'), 'hex');
  insert into public.account_deletion_records (user_id_hash, reason_code)
  values (h, left(coalesce(nullif(btrim(p_reason), ''), 'user_requested'), 64));
  queued := public.queue_user_storage_for_deletion(uid, h);
  update public.messages set deleted_at = now() where sender_id = uid and deleted_at is null;
  delete from auth.users where id = uid;
end;
$$;
