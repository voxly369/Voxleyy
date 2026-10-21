-- Voxly Prompt 10A: Library tabs data, post reading progress, collections, reader preferences.

-- ---------------------------------------------------------------------------
-- Post reading progress (book/chapter progress stays in reading_progress).
-- ---------------------------------------------------------------------------

create table public.post_reading_progress (
  user_id uuid not null references public.profiles(id) on delete cascade,
  creation_id uuid not null references public.creations(id) on delete cascade,
  percent smallint not null default 0 check (percent between 0 and 100),
  position integer not null default 0 check (position >= 0),
  completed boolean not null default false,
  first_read_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, creation_id)
);

create index post_reading_progress_user_updated_idx
  on public.post_reading_progress (user_id, updated_at desc);

create index post_reading_progress_user_continue_idx
  on public.post_reading_progress (user_id, completed, updated_at desc)
  where not completed;

alter table public.post_reading_progress enable row level security;

-- ---------------------------------------------------------------------------
-- Reader collections
-- ---------------------------------------------------------------------------

create table public.reader_collections (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  name text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint reader_collections_name_length check (char_length(trim(name)) between 1 and 60)
);

create index reader_collections_user_updated_idx
  on public.reader_collections (user_id, updated_at desc);

alter table public.reader_collections enable row level security;

create table public.reader_collection_items (
  collection_id uuid not null references public.reader_collections(id) on delete cascade,
  creation_id uuid not null references public.creations(id) on delete cascade,
  added_at timestamptz not null default now(),
  primary key (collection_id, creation_id)
);

create index reader_collection_items_collection_added_idx
  on public.reader_collection_items (collection_id, added_at desc);

alter table public.reader_collection_items enable row level security;

-- ---------------------------------------------------------------------------
-- Reader preferences (per account)
-- ---------------------------------------------------------------------------

create or replace function public.reader_preferences_json_valid(doc jsonb) returns boolean
language sql immutable as $$
  select
    doc is not null
    and jsonb_typeof(doc) = 'object'
    and (not (doc ? 'theme') or doc->>'theme' in ('paper', 'sepia', 'dark', 'black'))
    and (not (doc ? 'font') or doc->>'font' in ('fraunces', 'lora', 'inter', 'opendyslexic'))
    and (not (doc ? 'textSizeStep') or ((doc->>'textSizeStep')::int between 0 and 4))
    and (not (doc ? 'lineSpacing') or ((doc->>'lineSpacing')::numeric between 1 and 2.5))
    and (not (doc ? 'marginStep') or ((doc->>'marginStep')::int between 0 and 4))
    and (not (doc ? 'justify') or jsonb_typeof(doc->'justify') = 'boolean')
    and (not (doc ? 'brightness') or ((doc->>'brightness')::numeric between 0.5 and 1.5))
    and (not (doc ? 'mode') or doc->>'mode' in ('scroll', 'page'))
$$;

create table public.reader_preferences (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  preferences jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  constraint reader_preferences_octets check (octet_length(preferences::text) <= 2000),
  constraint reader_preferences_shape check (public.reader_preferences_json_valid(preferences))
);

alter table public.reader_preferences enable row level security;

-- ---------------------------------------------------------------------------
-- Feed visibility helper (same rules as feed_creations)
-- ---------------------------------------------------------------------------

create or replace function public.creation_visible_in_feed(p_creation_id uuid) returns boolean
language sql stable security invoker set search_path = public as $$
  select exists (select 1 from public.feed_creations fc where fc.id = p_creation_id);
$$;

revoke all on function public.creation_visible_in_feed(uuid) from public, anon;
grant execute on function public.creation_visible_in_feed(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- Limits
-- ---------------------------------------------------------------------------

create or replace function public.enforce_post_reading_progress_limit() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  n integer;
begin
  if tg_op = 'INSERT' then
    select count(*) into n from public.post_reading_progress where user_id = new.user_id;
    if n >= 5000 then
      raise exception 'Reading progress limit reached (5000 items).';
    end if;
    if not public.creation_visible_in_feed(new.creation_id) then
      raise exception 'This work is not available to save progress on.';
    end if;
  end if;
  new.updated_at := now();
  if tg_op = 'INSERT' and new.first_read_at is null then
    new.first_read_at := now();
  end if;
  return new;
end;
$$;

create trigger post_reading_progress_limit
  before insert on public.post_reading_progress
  for each row execute function public.enforce_post_reading_progress_limit();

create or replace function public.enforce_post_reading_progress_update() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create trigger post_reading_progress_touch
  before update on public.post_reading_progress
  for each row execute function public.enforce_post_reading_progress_update();

create or replace function public.enforce_reader_collections_limit() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  n integer;
begin
  if tg_op = 'INSERT' then
    select count(*) into n from public.reader_collections where user_id = new.user_id;
    if n >= 50 then
      raise exception 'Collection limit reached (50 collections).';
    end if;
  end if;
  new.name := trim(new.name);
  new.updated_at := now();
  return new;
end;
$$;

create trigger reader_collections_limit
  before insert or update of name on public.reader_collections
  for each row execute function public.enforce_reader_collections_limit();

create or replace function public.enforce_reader_collection_items_limit() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  n integer;
  owner_id uuid;
begin
  select user_id into owner_id from public.reader_collections where id = new.collection_id;
  if owner_id is null then
    raise exception 'Collection not found.';
  end if;
  if owner_id is distinct from auth.uid() then
    raise exception 'Not your collection.';
  end if;
  select count(*) into n from public.reader_collection_items where collection_id = new.collection_id;
  if n >= 500 then
    raise exception 'Collection item limit reached (500 items).';
  end if;
  if not public.creation_visible_in_feed(new.creation_id) then
    raise exception 'This work cannot be added while unavailable.';
  end if;
  if not exists (
    select 1 from public.saves s
    where s.user_id = auth.uid() and s.creation_id = new.creation_id
  ) then
    raise exception 'Save the work before adding it to a collection.';
  end if;
  return new;
end;
$$;

create trigger reader_collection_items_limit
  before insert on public.reader_collection_items
  for each row execute function public.enforce_reader_collection_items_limit();

create trigger reader_collections_set_updated_at
  before update on public.reader_collections
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Library views (excerpts only, feed visibility)
-- ---------------------------------------------------------------------------

create or replace view public.library_saved_items
with (security_invoker = true)
as
select
  s.user_id,
  s.creation_id,
  s.created_at as saved_at,
  (fc.id is not null) as is_available,
  fc.type,
  fc.title,
  fc.caption,
  fc.body_excerpt,
  fc.body_truncated,
  fc.cover_url,
  fc.published_at,
  fc.like_count,
  fc.comment_count,
  fc.save_count,
  fc.author_id,
  fc.created_at as creation_created_at,
  p.username as author_username,
  p.display_name as author_display_name,
  p.avatar_url as author_avatar_url,
  p.verified as author_verified
from public.saves s
left join public.feed_creations fc on fc.id = s.creation_id
left join public.profiles_public p on p.id = fc.author_id;

create or replace view public.library_reading_history
with (security_invoker = true)
as
select
  rp.user_id,
  rp.creation_id,
  rp.percent,
  rp.position,
  rp.completed,
  rp.first_read_at,
  rp.updated_at,
  (fc.id is not null) as is_available,
  fc.type,
  fc.title,
  fc.caption,
  fc.body_excerpt,
  fc.body_truncated,
  fc.cover_url,
  fc.published_at,
  fc.author_id,
  p.username as author_username,
  p.display_name as author_display_name,
  p.avatar_url as author_avatar_url,
  p.verified as author_verified
from public.post_reading_progress rp
left join public.feed_creations fc on fc.id = rp.creation_id
left join public.profiles_public p on p.id = fc.author_id;

create or replace view public.library_continue_reading
with (security_invoker = true)
as
select *
from public.library_reading_history
where not completed and percent > 0;

create or replace view public.library_collection_items
with (security_invoker = true)
as
select
  c.id as collection_id,
  c.user_id,
  c.name as collection_name,
  ci.creation_id,
  ci.added_at,
  (fc.id is not null) as is_available,
  fc.type,
  fc.title,
  fc.caption,
  fc.body_excerpt,
  fc.body_truncated,
  fc.cover_url,
  fc.published_at,
  fc.author_id,
  p.username as author_username,
  p.display_name as author_display_name,
  p.avatar_url as author_avatar_url,
  p.verified as author_verified
from public.reader_collection_items ci
inner join public.reader_collections c on c.id = ci.collection_id
left join public.feed_creations fc on fc.id = ci.creation_id
left join public.profiles_public p on p.id = fc.author_id;

revoke all on table public.library_saved_items from public, anon;
revoke all on table public.library_reading_history from public, anon;
revoke all on table public.library_continue_reading from public, anon;
revoke all on table public.library_collection_items from public, anon;

grant select on table public.library_saved_items to authenticated;
grant select on table public.library_reading_history to authenticated;
grant select on table public.library_continue_reading to authenticated;
grant select on table public.library_collection_items to authenticated;

-- ---------------------------------------------------------------------------
-- Grants and RLS
-- ---------------------------------------------------------------------------

grant select, insert, update, delete on public.post_reading_progress to authenticated;
grant insert (user_id, creation_id, percent, position, completed, first_read_at) on public.post_reading_progress to authenticated;
grant update (percent, position, completed) on public.post_reading_progress to authenticated;

grant select, insert, update, delete on public.reader_collections to authenticated;
grant insert (user_id, name) on public.reader_collections to authenticated;
grant update (name) on public.reader_collections to authenticated;

grant select, insert, delete on public.reader_collection_items to authenticated;
grant insert (collection_id, creation_id) on public.reader_collection_items to authenticated;

grant select, insert, update on public.reader_preferences to authenticated;
grant insert (user_id, preferences) on public.reader_preferences to authenticated;
grant update (preferences) on public.reader_preferences to authenticated;

create policy post_reading_progress_select on public.post_reading_progress
  for select to authenticated using (user_id = auth.uid());

create policy post_reading_progress_insert on public.post_reading_progress
  for insert to authenticated
  with check (user_id = auth.uid() and public.is_active_user());

create policy post_reading_progress_update on public.post_reading_progress
  for update to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy post_reading_progress_delete on public.post_reading_progress
  for delete to authenticated using (user_id = auth.uid());

create policy reader_collections_select on public.reader_collections
  for select to authenticated using (user_id = auth.uid());

create policy reader_collections_insert on public.reader_collections
  for insert to authenticated
  with check (user_id = auth.uid() and public.is_active_user());

create policy reader_collections_update on public.reader_collections
  for update to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy reader_collections_delete on public.reader_collections
  for delete to authenticated using (user_id = auth.uid());

create policy reader_collection_items_select on public.reader_collection_items
  for select to authenticated
  using (
    exists (
      select 1 from public.reader_collections c
      where c.id = collection_id and c.user_id = auth.uid()
    )
  );

create policy reader_collection_items_insert on public.reader_collection_items
  for insert to authenticated
  with check (
    exists (
      select 1 from public.reader_collections c
      where c.id = collection_id and c.user_id = auth.uid()
    )
    and public.is_active_user()
  );

create policy reader_collection_items_delete on public.reader_collection_items
  for delete to authenticated
  using (
    exists (
      select 1 from public.reader_collections c
      where c.id = collection_id and c.user_id = auth.uid()
    )
  );

create policy reader_preferences_select on public.reader_preferences
  for select to authenticated using (user_id = auth.uid());

create policy reader_preferences_insert on public.reader_preferences
  for insert to authenticated
  with check (user_id = auth.uid() and public.is_active_user());

create policy reader_preferences_update on public.reader_preferences
  for update to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());
