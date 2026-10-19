-- Public-only profile Posts count (spec §5, §6).

create or replace function public.counts_as_public_post(
  p_status public.publish_status,
  p_removed boolean,
  p_audience public.audience
) returns boolean
language sql
immutable
set search_path = public
as $$
  select p_status = 'published' and p_removed = false and p_audience = 'public';
$$;

create or replace function public.adjust_creation_count() returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  old_counts boolean := false;
  new_counts boolean := false;
begin
  if tg_op = 'INSERT' then
    if public.counts_as_public_post(new.status, new.is_removed, new.audience) then
      update public.profiles set creation_count = creation_count + 1 where id = new.author_id;
    end if;
    return null;
  end if;

  if tg_op = 'DELETE' then
    if public.counts_as_public_post(old.status, old.is_removed, old.audience) then
      update public.profiles
        set creation_count = greatest(creation_count - 1, 0)
        where id = old.author_id;
    end if;
    return null;
  end if;

  old_counts := public.counts_as_public_post(old.status, old.is_removed, old.audience);
  new_counts := public.counts_as_public_post(new.status, new.is_removed, new.audience);

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

drop trigger if exists creations_count on public.creations;

create trigger creations_count
  after insert or delete or update of status, is_removed, author_id, audience on public.creations
  for each row execute function public.adjust_creation_count();

update public.profiles p
set creation_count = coalesce(
  (
    select count(*)::integer
    from public.creations c
    where c.author_id = p.id
      and c.status = 'published'
      and c.is_removed = false
      and c.audience = 'public'
  ),
  0
);

grant execute on function public.counts_as_public_post(public.publish_status, boolean, public.audience) to authenticated;
