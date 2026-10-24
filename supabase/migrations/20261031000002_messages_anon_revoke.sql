-- Prompt 15B: anon cannot execute DM RPCs; message_unread_total requires auth.

create or replace function public.message_unread_total() returns integer
language plpgsql stable security definer set search_path = public as $$
begin
  if auth.uid() is null then
    raise exception 'forbidden';
  end if;
  return (
    select coalesce(count(*)::integer, 0)
    from public.messages m
    inner join public.conversation_members cm
      on cm.conversation_id = m.conversation_id and cm.user_id = auth.uid() and cm.left_at is null
    where m.deliver_at <= now()
      and m.deleted_at is null
      and m.sender_id <> auth.uid()
      and m.deliver_at > cm.last_read_at
  );
end;
$$;

revoke all on function public.message_unread_total() from public, anon;
grant execute on function public.message_unread_total() to authenticated;

revoke all on function public.can_user_message(uuid, uuid) from public, anon;
grant execute on function public.can_user_message(uuid, uuid) to authenticated;

revoke all on function public.recipient_quiet_status(uuid) from public, anon;
grant execute on function public.recipient_quiet_status(uuid) to authenticated;

revoke all on function public.get_or_create_dm(uuid) from public, anon;
grant execute on function public.get_or_create_dm(uuid) to authenticated;

revoke all on function public.send_message(uuid, text, uuid, timestamptz) from public, anon;
grant execute on function public.send_message(uuid, text, uuid, timestamptz) to authenticated;

revoke all on function public.delete_message(uuid) from public, anon;
grant execute on function public.delete_message(uuid) to authenticated;

revoke all on function public.mark_conversation_read(uuid) from public, anon;
grant execute on function public.mark_conversation_read(uuid) to authenticated;

revoke all on function public.set_conversation_muted(uuid, boolean) from public, anon;
grant execute on function public.set_conversation_muted(uuid, boolean) to authenticated;

revoke all on function public.list_my_conversations(timestamptz, integer) from public, anon;
grant execute on function public.list_my_conversations(timestamptz, integer) to authenticated;
