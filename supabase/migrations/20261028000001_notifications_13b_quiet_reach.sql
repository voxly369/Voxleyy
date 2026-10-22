-- Voxly Prompt 13B: quiet reach holding rules (server-side).

-- Close contacts = mutual follows (both users follow each other).
create or replace function public.is_mutual_follow(p_user uuid, p_other uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select
    p_user is not null
    and p_other is not null
    and p_user <> p_other
    and exists (
      select 1 from public.follows f
      where f.follower_id = p_user and f.followee_id = p_other
    )
    and exists (
      select 1 from public.follows f
      where f.follower_id = p_other and f.followee_id = p_user
    );
$$;

revoke all on function public.is_mutual_follow(uuid, uuid) from public, anon;
grant execute on function public.is_mutual_follow(uuid, uuid) to authenticated;

-- Pen Pals are not shipped yet; keep a single extension point for later.
create or replace function public.is_pen_pal_contact(p_user uuid, p_other uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select false;
$$;

comment on function public.is_pen_pal_contact(uuid, uuid) is
  'Pen Pals are not available yet. Returns false until the Pen Pals feature ships.';

revoke all on function public.is_pen_pal_contact(uuid, uuid) from public, anon;
grant execute on function public.is_pen_pal_contact(uuid, uuid) to authenticated;

create or replace function public.should_hold_for_quiet_mode(
  p_recipient_id uuid,
  p_actor_id uuid,
  p_type text
) returns boolean
language plpgsql stable security definer set search_path = public as $$
declare
  s public.notification_settings%rowtype;
begin
  if public.is_moderation_notification(p_type) or p_type = 'summary' then
    return false;
  end if;
  if not public.is_quiet_mode_active(p_recipient_id) then
    return false;
  end if;

  select * into s from public.notification_settings where user_id = p_recipient_id;
  if not found or s.quiet_reach = 'everyone' then
    return false;
  end if;
  if s.quiet_reach = 'nobody' then
    return true;
  end if;
  if s.quiet_reach = 'pen_pals' then
    if p_actor_id is null then
      return true;
    end if;
    return not public.is_pen_pal_contact(p_recipient_id, p_actor_id);
  end if;
  if s.quiet_reach = 'close_contacts' then
    if p_actor_id is null then
      return true;
    end if;
    return not public.is_mutual_follow(p_recipient_id, p_actor_id);
  end if;
  return false;
end;
$$;

revoke all on function public.should_hold_for_quiet_mode(uuid, uuid, text) from public, anon;
grant execute on function public.should_hold_for_quiet_mode(uuid, uuid, text) to authenticated;

create or replace function public.create_notification(
  p_recipient_id uuid,
  p_actor_id uuid,
  p_type text,
  p_target_type text,
  p_target_id uuid,
  p_data jsonb default '{}'::jsonb
) returns uuid
language plpgsql security definer set search_path = public as $$
declare
  v_id uuid;
  v_status public.account_status;
  v_held boolean := false;
begin
  if p_recipient_id is null or p_type is null then
    return null;
  end if;
  if p_actor_id is not null and p_recipient_id = p_actor_id then
    return null;
  end if;
  if p_actor_id is not null and public.is_blocked_between(p_recipient_id, p_actor_id) then
    return null;
  end if;
  if p_actor_id is not null and exists (
    select 1 from public.mutes m
    where m.user_id = p_recipient_id and m.muted_user_id = p_actor_id
  ) then
    return null;
  end if;

  select status into v_status from public.profiles where id = p_recipient_id;
  if v_status in ('suspended', 'banned') and not public.is_moderation_notification(p_type) then
    return null;
  end if;

  if not public.notification_setting_enabled(p_recipient_id, p_type) then
    return null;
  end if;

  if p_type = 'like' and exists (
    select 1 from public.notifications
    where recipient_id = p_recipient_id and actor_id = p_actor_id and type = 'like'
      and target_type = p_target_type and target_id = p_target_id and read_at is null
  ) then
    return null;
  end if;

  if p_type = 'follow' and exists (
    select 1 from public.notifications
    where recipient_id = p_recipient_id and actor_id = p_actor_id and type = 'follow' and read_at is null
  ) then
    return null;
  end if;

  v_held := public.should_hold_for_quiet_mode(p_recipient_id, p_actor_id, p_type);

  insert into public.notifications (
    recipient_id, actor_id, type, target_type, target_id, data, held
  ) values (
    p_recipient_id, p_actor_id, p_type, p_target_type, p_target_id, coalesce(p_data, '{}'::jsonb), v_held
  )
  returning id into v_id;

  if v_held and p_type <> 'summary' then
    update public.notification_settings
    set quiet_summary_pending = quiet_summary_pending + 1, updated_at = now()
    where user_id = p_recipient_id;
  end if;

  perform public.prune_user_notifications(p_recipient_id);
  return v_id;
end;
$$;
