-- Voxly 0003. Paste after 0002.
-- Security choices:
-- * handle_new_user retries only a username collision. The single-founder index still aborts a second founder.
-- * display_name is truncated to 60 characters so a long metadata value cannot abort signup.
-- * a null email cannot match the founder address.
-- * if the founder email is confirmed later, sync_founder_role grants founder. If that email moves away, the role becomes writer, as specified.
-- * setting status back to active is audited as unban, including a lift of a suspension.
-- * creation_count changes when status or is_removed changes, not only on insert and delete, so drafts are never counted.
-- * comment_count ignores removed comments.
-- * counters never go below 0.
-- * a reply must stay on the same creation.
-- * reading progress can point only at a chapter of that book.
-- * a block deletes follows in both directions. The trigger is security definer because the blocker cannot delete the other person's follow under RLS.
-- * comment updates require an active account. Suspended and banned users cannot write.

-- Helper: is the caller an active (not banned, not currently suspended) user?
create or replace function public.is_active_user() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.profiles p
    where p.id = auth.uid()
      and (p.status = 'active'
           or (p.status = 'suspended' and p.suspended_until is not null and p.suspended_until <= now()))
  );
$$;

-- Helper: block in either direction
create or replace function public.is_blocked_between(a uuid, b uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.blocks
    where (blocker_id = a and blocked_id = b) or (blocker_id = b and blocked_id = a));
$$;

-- Helper: can the caller see this creation? Runs as the caller so creations RLS applies.
create or replace function public.can_view_creation(c uuid) returns boolean
language sql stable security invoker as $$
  select exists (select 1 from public.creations where id = c);
$$;

-- Double lock: the founder role can only ever sit on the verified founder account.
create or replace function public.enforce_founder_role() returns trigger
language plpgsql security definer set search_path = public, auth as $$
begin
  if new.role = 'founder' and not exists (
    select 1 from auth.users u
    where u.id = new.id and lower(u.email) = public.founder_email() and u.email_confirmed_at is not null
  ) then
    raise exception 'Only the verified founder account may hold the founder role';
  end if;
  return new;
end $$;

create trigger profiles_enforce_founder before insert or update of role on public.profiles
  for each row execute function public.enforce_founder_role();

-- Create a profile for every new auth user. Founder is granted only to the confirmed founder email.
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public, auth as $$
declare
  base text;
  candidate text;
  attempt int;
  v_constraint text;
begin
  base := left(regexp_replace(lower(split_part(coalesce(new.email, ''), '@', 1)), '[^a-z0-9_]', '', 'g'), 20);
  if char_length(base) < 3 then base := 'writer'; end if;

  for attempt in 1..8 loop
    candidate := base || substr(md5(random()::text || new.id::text || attempt::text), 1, 5);
    begin
      insert into public.profiles (id, username, display_name, role)
      values (
        new.id,
        candidate,
        left(coalesce(new.raw_user_meta_data->>'display_name', ''), 60),
        case
          when lower(new.email) = public.founder_email() and new.email_confirmed_at is not null
            then 'founder'::public.user_role
          else 'reader'::public.user_role
        end
      );
      return new;
    exception when unique_violation then
      get stacked diagnostics v_constraint = constraint_name;
      if v_constraint is distinct from 'profiles_username_key' then
        raise;
      end if;
    end;
  end loop;

  raise exception 'could not allocate a username';
end $$;

create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- When the founder confirms their email later, grant the role; if the email ever changes away, revoke it.
create or replace function public.sync_founder_role() returns trigger
language plpgsql security definer set search_path = public, auth as $$
begin
  if lower(new.email) = public.founder_email() and new.email_confirmed_at is not null then
    update public.profiles set role = 'founder' where id = new.id and role <> 'founder';
  else
    update public.profiles set role = 'writer' where id = new.id and role = 'founder';
  end if;
  return new;
end $$;

create trigger on_auth_user_updated after update of email, email_confirmed_at on auth.users
  for each row execute function public.sync_founder_role();

-- Reader becomes Writer automatically on first published creation.
create or replace function public.promote_to_writer() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.status = 'published' then
    update public.profiles set role = 'writer' where id = new.author_id and role = 'reader';
  end if;
  return new;
end $$;

create trigger creations_promote_writer after insert or update of status on public.creations
  for each row execute function public.promote_to_writer();

create or replace function public.set_published_at() returns trigger
language plpgsql set search_path = public as $$
begin
  if new.status = 'published' and new.published_at is null then
    new.published_at = now();
  end if;
  return new;
end $$;

create trigger creations_set_published_at
  before insert or update of status on public.creations
  for each row execute function public.set_published_at();

create trigger chapters_set_published_at
  before insert or update of status on public.chapters
  for each row execute function public.set_published_at();

create or replace function public.adjust_like_count() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'INSERT' then
    update public.creations set like_count = like_count + 1 where id = new.creation_id;
  elsif tg_op = 'DELETE' then
    update public.creations set like_count = greatest(like_count - 1, 0) where id = old.creation_id;
  end if;
  return null;
end $$;

create trigger likes_count
  after insert or delete on public.likes
  for each row execute function public.adjust_like_count();

create or replace function public.adjust_save_count() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'INSERT' then
    update public.creations set save_count = save_count + 1 where id = new.creation_id;
  elsif tg_op = 'DELETE' then
    update public.creations set save_count = greatest(save_count - 1, 0) where id = old.creation_id;
  end if;
  return null;
end $$;

create trigger saves_count
  after insert or delete on public.saves
  for each row execute function public.adjust_save_count();

create or replace function public.adjust_comment_count() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  delta integer := 0;
begin
  if tg_op = 'INSERT' then
    if not new.is_removed then delta := 1; end if;
    if delta <> 0 then
      update public.creations
        set comment_count = comment_count + delta
        where id = new.creation_id;
    end if;
  elsif tg_op = 'DELETE' then
    if not old.is_removed then delta := -1; end if;
    if delta <> 0 then
      update public.creations
        set comment_count = greatest(comment_count + delta, 0)
        where id = old.creation_id;
    end if;
  elsif tg_op = 'UPDATE' then
    if old.creation_id is distinct from new.creation_id then
      if not old.is_removed then
        update public.creations
          set comment_count = greatest(comment_count - 1, 0)
          where id = old.creation_id;
      end if;
      if not new.is_removed then
        update public.creations
          set comment_count = comment_count + 1
          where id = new.creation_id;
      end if;
    else
      if old.is_removed and not new.is_removed then delta := 1;
      elsif not old.is_removed and new.is_removed then delta := -1;
      end if;
      if delta <> 0 then
        update public.creations
          set comment_count = greatest(comment_count + delta, 0)
          where id = new.creation_id;
      end if;
    end if;
  end if;
  return null;
end $$;

create trigger comments_count
  after insert or delete or update of is_removed, creation_id on public.comments
  for each row execute function public.adjust_comment_count();

create or replace function public.adjust_follow_counts() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'INSERT' then
    update public.profiles set follower_count = follower_count + 1 where id = new.followee_id;
    update public.profiles set following_count = following_count + 1 where id = new.follower_id;
  elsif tg_op = 'DELETE' then
    update public.profiles set follower_count = greatest(follower_count - 1, 0) where id = old.followee_id;
    update public.profiles set following_count = greatest(following_count - 1, 0) where id = old.follower_id;
  end if;
  return null;
end $$;

create trigger follows_count
  after insert or delete on public.follows
  for each row execute function public.adjust_follow_counts();

create or replace function public.counts_as_published(
  p_status public.publish_status,
  p_removed boolean
) returns boolean
language sql immutable set search_path = public as $$
  select p_status = 'published' and p_removed = false;
$$;

create or replace function public.adjust_creation_count() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  old_counts boolean := false;
  new_counts boolean := false;
begin
  if tg_op = 'INSERT' then
    if public.counts_as_published(new.status, new.is_removed) then
      update public.profiles set creation_count = creation_count + 1 where id = new.author_id;
    end if;
    return null;
  end if;

  if tg_op = 'DELETE' then
    if public.counts_as_published(old.status, old.is_removed) then
      update public.profiles
        set creation_count = greatest(creation_count - 1, 0)
        where id = old.author_id;
    end if;
    return null;
  end if;

  old_counts := public.counts_as_published(old.status, old.is_removed);
  new_counts := public.counts_as_published(new.status, new.is_removed);

  if old.author_id is distinct from new.author_id then
    if old_counts then
      update public.profiles
        set creation_count = greatest(creation_count - 1, 0)
        where id = old.author_id;
    end if;
    if new_counts then
      update public.profiles set creation_count = creation_count + 1 where id = new.author_id;
    end if;
  elsif old_counts and not new_counts then
    update public.profiles
      set creation_count = greatest(creation_count - 1, 0)
      where id = new.author_id;
  elsif new_counts and not old_counts then
    update public.profiles set creation_count = creation_count + 1 where id = new.author_id;
  end if;

  return null;
end $$;

create trigger creations_count
  after insert or delete or update of status, is_removed, author_id on public.creations
  for each row execute function public.adjust_creation_count();

create or replace function public.remove_follows_on_block() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  delete from public.follows
  where (follower_id = new.blocker_id and followee_id = new.blocked_id)
     or (follower_id = new.blocked_id and followee_id = new.blocker_id);
  return new;
end $$;

create trigger blocks_remove_follows
  after insert on public.blocks
  for each row execute function public.remove_follows_on_block();

create or replace function public.prevent_mutation() returns trigger
language plpgsql set search_path = public as $$
begin
  raise exception 'moderation_actions is insert-only';
end $$;

create trigger moderation_actions_no_update
  before update on public.moderation_actions
  for each row execute function public.prevent_mutation();

create trigger moderation_actions_no_delete
  before delete on public.moderation_actions
  for each row execute function public.prevent_mutation();

create trigger moderation_actions_no_truncate
  before truncate on public.moderation_actions
  for each statement execute function public.prevent_mutation();

create or replace function public.enforce_comment_parent() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.parent_id is not null then
    if new.parent_id = new.id then
      raise exception 'comment cannot reply to itself';
    end if;
    if not exists (
      select 1 from public.comments parent
      where parent.id = new.parent_id and parent.creation_id = new.creation_id
    ) then
      raise exception 'reply must stay on the same creation';
    end if;
  end if;
  return new;
end $$;

create trigger comments_enforce_parent
  before insert or update of parent_id, creation_id on public.comments
  for each row execute function public.enforce_comment_parent();

create or replace function public.enforce_progress_chapter() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.chapter_id is not null and not exists (
    select 1 from public.chapters chapter
    where chapter.id = new.chapter_id and chapter.book_id = new.book_id
  ) then
    raise exception 'chapter does not belong to this book';
  end if;
  return new;
end $$;

create trigger reading_progress_enforce_chapter
  before insert or update of chapter_id, book_id on public.reading_progress
  for each row execute function public.enforce_progress_chapter();

create or replace function public.founder_set_user_status(
  p_user uuid, p_status public.account_status, p_reason text, p_until timestamptz default null)
returns void language plpgsql security definer set search_path = public as $$
declare v_action public.mod_action;
begin
  if not public.is_founder() then raise exception 'forbidden' using errcode = '42501'; end if;
  if p_reason is null or btrim(p_reason) = '' then raise exception 'a reason is required'; end if;
  if p_user = auth.uid() then raise exception 'cannot change your own status'; end if;
  if (select role from public.profiles where id = p_user) = 'founder' then raise exception 'cannot change the founder'; end if;
  if p_status = 'suspended' and p_until is null then raise exception 'a suspension needs an end date'; end if;

  update public.profiles
     set status = p_status,
         status_reason = p_reason,
         suspended_until = case when p_status = 'suspended' then p_until else null end
   where id = p_user;

  if not found then
    raise exception 'user not found';
  end if;

  -- active is recorded as unban, including when a suspension is lifted.
  v_action := case p_status
    when 'suspended' then 'suspend'::public.mod_action
    when 'banned'    then 'ban'::public.mod_action
    else 'unban'::public.mod_action end;

  insert into public.moderation_actions (actor_id, action, target_type, target_id, target_user_id, reason)
  values (auth.uid(), v_action, 'profile', p_user, p_user, p_reason);
end $$;

revoke all on function public.founder_set_user_status(uuid, public.account_status, text, timestamptz) from public, anon;
grant execute on function public.founder_set_user_status(uuid, public.account_status, text, timestamptz) to authenticated;

revoke all on function public.founder_email() from public, anon, authenticated;
revoke all on function public.is_active_user() from public, anon;
revoke all on function public.is_blocked_between(uuid, uuid) from public, anon;
revoke all on function public.can_view_creation(uuid) from public, anon;
grant execute on function public.is_active_user() to authenticated;
grant execute on function public.is_blocked_between(uuid, uuid) to authenticated;
grant execute on function public.can_view_creation(uuid) to authenticated;

-- Sign-up runs as supabase_auth_admin. That role must be allowed to fire the auth triggers.
-- The function body still runs as the owner and bypasses row-level security.
revoke all on function public.handle_new_user() from public, anon, authenticated;
revoke all on function public.sync_founder_role() from public, anon, authenticated;

do $$
begin
  if exists (select 1 from pg_roles where rolname = 'supabase_auth_admin') then
    grant execute on function public.handle_new_user() to supabase_auth_admin;
    grant execute on function public.sync_founder_role() to supabase_auth_admin;
  end if;
end $$;

grant execute on function public.enforce_founder_role() to authenticated;
grant execute on function public.promote_to_writer() to authenticated;
grant execute on function public.set_published_at() to authenticated;
grant execute on function public.set_updated_at() to authenticated;
grant execute on function public.adjust_like_count() to authenticated;
grant execute on function public.adjust_save_count() to authenticated;
grant execute on function public.adjust_comment_count() to authenticated;
grant execute on function public.adjust_follow_counts() to authenticated;
grant execute on function public.counts_as_published(public.publish_status, boolean) to authenticated;
grant execute on function public.adjust_creation_count() to authenticated;
grant execute on function public.remove_follows_on_block() to authenticated;
grant execute on function public.prevent_mutation() to authenticated;
grant execute on function public.enforce_chapter_book() to authenticated;
grant execute on function public.enforce_comment_parent() to authenticated;
grant execute on function public.enforce_progress_chapter() to authenticated;
