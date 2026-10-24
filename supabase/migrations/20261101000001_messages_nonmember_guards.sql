-- Non-members cannot mark read or mute a conversation they are not in.

create or replace function public.mark_conversation_read(p_conversation_id uuid) returns void
language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then raise exception 'forbidden'; end if;
  if not exists (
    select 1 from public.conversation_members cm
    where cm.conversation_id = p_conversation_id and cm.user_id = auth.uid() and cm.left_at is null
  ) then
    raise exception 'Not a member of this conversation.';
  end if;
  update public.conversation_members
  set last_read_at = now()
  where conversation_id = p_conversation_id and user_id = auth.uid();
  update public.notifications
  set read_at = now()
  where recipient_id = auth.uid() and type = 'message'
    and target_type = 'conversation' and target_id = p_conversation_id and read_at is null;
end;
$$;

create or replace function public.set_conversation_muted(p_conversation_id uuid, p_muted boolean) returns void
language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then raise exception 'forbidden'; end if;
  if not exists (
    select 1 from public.conversation_members cm
    where cm.conversation_id = p_conversation_id and cm.user_id = auth.uid() and cm.left_at is null
  ) then
    raise exception 'Not a member of this conversation.';
  end if;
  update public.conversation_members
  set muted = p_muted
  where conversation_id = p_conversation_id and user_id = auth.uid();
end;
$$;
