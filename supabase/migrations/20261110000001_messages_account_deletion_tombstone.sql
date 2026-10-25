-- Account deletion: keep DM text for the other participant; anonymise sender (SPEC tombstone rule).

alter table public.messages
  add column if not exists sender_account_deleted boolean not null default false;

alter table public.messages alter column sender_id drop not null;

alter table public.messages drop constraint if exists messages_sender_id_fkey;
alter table public.messages
  add constraint messages_sender_id_fkey
  foreign key (sender_id) references public.profiles(id) on delete set null;

-- Keep DM threads for the surviving participant when one profile is removed (avoid conversation CASCADE).
alter table public.conversations drop constraint if exists conversations_dm_low_fkey;
alter table public.conversations drop constraint if exists conversations_dm_high_fkey;
alter table public.conversations
  add constraint conversations_dm_low_fkey
  foreign key (dm_low) references public.profiles(id) on delete set null;
alter table public.conversations
  add constraint conversations_dm_high_fkey
  foreign key (dm_high) references public.profiles(id) on delete set null;

alter table public.conversations drop constraint if exists conversations_check;
alter table public.conversations add constraint conversations_check check (
  kind <> 'dm'
  or (
    (dm_low is not null and dm_high is not null and dm_low < dm_high)
    or (dm_low is null and dm_high is not null)
    or (dm_high is null and dm_low is not null)
  )
);

create or replace function public.delete_my_account(p_reason text default 'user_requested') returns void
language plpgsql security definer set search_path = public, auth, storage, extensions as $$
declare
  uid uuid := auth.uid();
  em text;
  h text;
  queued integer;
begin
  if uid is null then raise exception 'forbidden'; end if;
  if not exists (select 1 from auth.users where id = uid) then
    return;
  end if;
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
  update public.messages
  set sender_account_deleted = true,
      sender_id = null
  where sender_id = uid
    and deleted_at is null;
  delete from public.engagement_events where user_id = uid;
  alter table public.follows disable trigger follows_unfollow_rate_limit;
  delete from public.follows where follower_id = uid or followee_id = uid;
  alter table public.follows enable trigger follows_unfollow_rate_limit;
  delete from auth.users where id = uid;
end;
$$;

drop view if exists public.messages_visible;

create view public.messages_visible
with (security_invoker = true)
as
select
  m.id,
  m.conversation_id,
  m.sender_id,
  case when m.deleted_at is not null then null else m.body end as body,
  m.shared_creation_id,
  m.deliver_at,
  m.created_at,
  m.deleted_at,
  m.sender_account_deleted,
  (m.deleted_at is not null) as is_deleted,
  (m.deliver_at > now()) as is_scheduled
from public.messages m
where exists (
  select 1 from public.conversation_members cm
  where cm.conversation_id = m.conversation_id and cm.user_id = auth.uid() and cm.left_at is null
)
and (
  m.sender_id = auth.uid()
  or (m.deliver_at <= now())
);

revoke all on public.messages_visible from public, anon;
grant select on public.messages_visible to authenticated;

create or replace function public.list_my_conversations(p_cursor timestamptz default null, p_limit integer default 20)
returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare
  uid uuid := auth.uid();
  out jsonb := '[]'::jsonb;
begin
  if uid is null then raise exception 'forbidden'; end if;
  select coalesce(jsonb_agg(row_to_json(t)::jsonb order by t.last_activity_at desc), '[]'::jsonb) into out
  from (
    select
      c.id as conversation_id,
      c.last_activity_at,
      cm.muted,
      cm2.user_id as other_user_id,
      case when p.id is null then 'deleted-account' else p.username end as other_username,
      case when p.id is null then 'Deleted account' else p.display_name end as other_display_name,
      case when p.id is null then null else p.avatar_url end as other_avatar_url,
      coalesce(p.show_local_time, false) as other_show_local_time,
      coalesce(p.timezone, 'UTC') as other_timezone,
      (p.id is null) as other_account_deleted,
      (
        select count(*)::integer from public.messages m2
        where m2.conversation_id = c.id and m2.deliver_at <= now()
          and m2.deleted_at is null
          and (m2.sender_id is distinct from uid)
          and m2.deliver_at > cm.last_read_at
      ) as unread_count,
      (
        select left(replace(m3.body, E'\n', ' '), 120)
        from public.messages m3
        where m3.conversation_id = c.id and m3.deliver_at <= now() and m3.deleted_at is null
        order by m3.deliver_at desc limit 1
      ) as preview
    from public.conversation_members cm
    inner join public.conversations c on c.id = cm.conversation_id
    inner join public.conversation_members cm2 on cm2.conversation_id = c.id and cm2.user_id <> uid and cm2.left_at is null
    left join public.profiles p on p.id = cm2.user_id
    where cm.user_id = uid and cm.left_at is null and c.kind = 'dm'
      and (p.id is null or p.status <> 'banned')
      and not public.is_blocked_between(uid, cm2.user_id)
      and (p_cursor is null or c.last_activity_at < p_cursor)
    order by c.last_activity_at desc
    limit least(greatest(p_limit, 1), 50)
  ) t;
  return out;
end;
$$;

create or replace function public.message_unread_total() returns integer
language sql stable security definer set search_path = public as $$
  select coalesce(count(*)::integer, 0)
  from public.messages m
  inner join public.conversation_members cm
    on cm.conversation_id = m.conversation_id and cm.user_id = auth.uid() and cm.left_at is null
  where m.deliver_at <= now()
    and m.deleted_at is null
    and (m.sender_id is distinct from auth.uid())
    and m.deliver_at > cm.last_read_at;
$$;
