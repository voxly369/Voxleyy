-- Prompt 16B: session freshness, deletion record, storage purge, export payload, send_message beta guard.

create table if not exists public.account_deletion_records (
  id uuid primary key default gen_random_uuid(),
  user_id_hash text not null,
  deleted_at timestamptz not null default now(),
  reason_code text not null default 'user_requested' check (char_length(reason_code) <= 64)
);

alter table public.account_deletion_records enable row level security;
revoke all on table public.account_deletion_records from public, anon, authenticated;

create or replace function public.auth_session_recent(p_max_age interval default interval '15 minutes') returns boolean
language plpgsql stable security definer set search_path = public as $$
declare
  iat bigint;
  claims jsonb;
begin
  begin
    iat := nullif(current_setting('request.jwt.claim.iat', true), '')::bigint;
  exception when others then
    iat := null;
  end;
  if iat is null then
    begin
      claims := nullif(current_setting('request.jwt.claims', true), '')::jsonb;
      if claims is not null then
        iat := (claims ->> 'iat')::bigint;
      end if;
    exception when others then
      return false;
    end;
  end if;
  if iat is null then return false; end if;
  return to_timestamp(iat) > now() - p_max_age;
end;
$$;

revoke all on function public.auth_session_recent(interval) from public, anon;
grant execute on function public.auth_session_recent(interval) to authenticated;

create or replace function public.purge_user_storage(p_user uuid) returns void
language plpgsql security definer set search_path = public, storage as $$
begin
  delete from storage.objects
  where bucket_id in ('avatars', 'banners', 'covers', 'media', 'manuscripts')
    and (storage.foldername(name))[1] = p_user::text;
end;
$$;

revoke all on function public.purge_user_storage(uuid) from public, anon, authenticated;

create or replace function public.delete_my_account(p_reason text default 'user_requested') returns void
language plpgsql security definer set search_path = public, auth, storage as $$
declare
  uid uuid := auth.uid();
  em text;
  h text;
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
  perform public.purge_user_storage(uid);
  update public.messages set body = null, deleted_at = now() where sender_id = uid and deleted_at is null;
  delete from auth.users where id = uid;
end;
$$;

revoke all on function public.delete_my_account(text) from public, anon;
grant execute on function public.delete_my_account(text) to authenticated;

create or replace function public.export_my_data() returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  uid uuid := auth.uid();
  out jsonb;
  out_text text;
  max_bytes integer := 4000000;
begin
  if uid is null then raise exception 'forbidden'; end if;
  delete from public.data_export_attempts where user_id = uid and created_at < now() - interval '1 day';
  if (select count(*) from public.data_export_attempts where user_id = uid and created_at > now() - interval '1 day') >= 1 then
    raise exception 'You can download your data once per day.';
  end if;
  insert into public.data_export_attempts (user_id) values (uid);
  select jsonb_build_object(
    'exported_at', now(),
    'profile', (select row_to_json(p) from public.profiles p where p.id = uid),
    'notification_settings', (select row_to_json(s) from public.notification_settings s where s.user_id = uid),
    'creations', coalesce((select jsonb_agg(row_to_json(c)) from public.creations c where c.author_id = uid), '[]'::jsonb),
    'comments', coalesce((select jsonb_agg(row_to_json(cm)) from public.comments cm where cm.author_id = uid), '[]'::jsonb),
    'likes', coalesce((select jsonb_agg(row_to_json(l)) from public.likes l where l.user_id = uid), '[]'::jsonb),
    'saves', coalesce((select jsonb_agg(row_to_json(sv)) from public.saves sv where sv.user_id = uid), '[]'::jsonb),
    'follows', coalesce((select jsonb_agg(row_to_json(f)) from public.follows f where f.follower_id = uid), '[]'::jsonb),
    'collections', coalesce((select jsonb_agg(row_to_json(rc)) from public.reader_collections rc where rc.user_id = uid), '[]'::jsonb),
    'highlights', coalesce((select jsonb_agg(row_to_json(h)) from public.reader_highlights h where h.user_id = uid), '[]'::jsonb),
    'bookmarks', coalesce((select jsonb_agg(row_to_json(b)) from public.reader_bookmarks b where b.user_id = uid), '[]'::jsonb),
    'reading_progress', coalesce((select jsonb_agg(row_to_json(rp)) from public.post_reading_progress rp where rp.user_id = uid), '[]'::jsonb),
    'badges', coalesce((select jsonb_agg(row_to_json(ub)) from public.user_badges ub where ub.user_id = uid), '[]'::jsonb),
    'messages_sent', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', m.id, 'body', m.body, 'conversation_id', m.conversation_id,
        'created_at', m.created_at, 'deleted_at', m.deleted_at
      )) from public.messages m where m.sender_id = uid
    ), '[]'::jsonb),
    'consents', coalesce((select public.get_my_consents()), '[]'::jsonb)
  ) into out;
  out_text := out::text;
  if octet_length(out_text) > max_bytes then
    return jsonb_build_object(
      'truncated', true,
      'max_bytes', max_bytes,
      'notice', 'Your export is too large to return in one file. Contact support for a full archive.',
      'exported_at', now()
    );
  end if;
  return out || jsonb_build_object('truncated', false);
end;
$$;

-- send_message: beta guard
create or replace function public.send_message(
  p_conversation_id uuid,
  p_body text,
  p_shared_creation_id uuid default null,
  p_deliver_at timestamptz default null
) returns uuid
language plpgsql security definer set search_path = public as $$
declare
  uid uuid := auth.uid();
  mid uuid;
  deliver timestamptz := coalesce(p_deliver_at, now());
  other uuid;
  trimmed text := btrim(p_body);
  recipient_muted boolean;
begin
  if uid is null then raise exception 'forbidden'; end if;
  perform public.assert_beta_write_allowed(uid);
  if not exists (
    select 1 from public.conversation_members cm
    where cm.conversation_id = p_conversation_id and cm.user_id = uid and cm.left_at is null
  ) then raise exception 'Not a member of this conversation.'; end if;
  if (select status from public.profiles where id = uid) <> 'active' then
    raise exception 'Your account cannot send messages right now.';
  end if;
  select cm.user_id into other
  from public.conversation_members cm
  where cm.conversation_id = p_conversation_id and cm.user_id <> uid limit 1;
  if other is null or not public.can_user_message(uid, other) then
    raise exception 'You cannot message this person.';
  end if;
  if trimmed is null or char_length(trimmed) < 1 or char_length(trimmed) > 2000 then
    raise exception 'Message must be between 1 and 2000 characters.';
  end if;
  if deliver < now() - interval '1 minute' then raise exception 'Invalid delivery time.'; end if;
  if deliver > now() + interval '30 days' then raise exception 'Schedule within 30 days.'; end if;
  if p_shared_creation_id is not null then
    if not public.can_user_view_creation(uid, p_shared_creation_id)
      or not public.can_user_view_creation(other, p_shared_creation_id) then
      raise exception 'That post is not available to share.';
    end if;
  end if;
  select coalesce(cm.muted, false) into recipient_muted
  from public.conversation_members cm
  where cm.conversation_id = p_conversation_id and cm.user_id = other;
  perform public.record_message_send_event(uid);
  insert into public.messages (conversation_id, sender_id, body, shared_creation_id, deliver_at)
  values (p_conversation_id, uid, trimmed, p_shared_creation_id, deliver)
  returning id into mid;
  if deliver <= now() then
    update public.conversations set last_activity_at = now() where id = p_conversation_id;
    if not recipient_muted then
      perform public.create_notification(
        other, uid, 'message', 'conversation', p_conversation_id,
        jsonb_build_object('message_id', mid), now()
      );
    end if;
  else
    update public.conversations set last_activity_at = deliver where id = p_conversation_id;
    if not recipient_muted then
      perform public.create_notification(
        other, uid, 'message', 'conversation', p_conversation_id,
        jsonb_build_object('message_id', mid, 'scheduled', true), deliver
      );
    end if;
  end if;
  return mid;
end;
$$;
