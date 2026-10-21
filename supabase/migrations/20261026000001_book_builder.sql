-- Prompt 11A: books metadata, entitlements, chapter access, library_books, progress extensions.

-- ---------------------------------------------------------------------------
-- Enums and platform settings
-- ---------------------------------------------------------------------------

do $$ begin
  alter type public.publish_status add value if not exists 'unlisted' after 'published';
exception when duplicate_object then null;
end $$;

create type public.book_sale_model as enum ('free', 'purchase', 'rental', 'subscription');

create type public.book_entitlement_kind as enum ('free', 'purchase', 'rental', 'subscription', 'author');

create table public.platform_settings (
  key text primary key,
  value jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.platform_settings enable row level security;

insert into public.platform_settings (key, value)
values ('payments', jsonb_build_object('enabled', false))
on conflict (key) do nothing;

create policy platform_settings_select on public.platform_settings
  for select to authenticated
  using (true);

revoke all on table public.platform_settings from public, anon;
grant select on table public.platform_settings to authenticated;

-- ---------------------------------------------------------------------------
-- books (1:1 with creations where type = book)
-- ---------------------------------------------------------------------------

create table public.books (
  id uuid primary key references public.creations(id) on delete cascade,
  author_id uuid not null references public.profiles(id) on delete cascade,
  subtitle text check (subtitle is null or char_length(trim(subtitle)) between 1 and 150),
  description text not null default '' check (char_length(description) <= 4000),
  sale_model public.book_sale_model not null default 'free',
  price_cents integer not null default 0 check (price_cents >= 0),
  currency char(3) not null default 'GBP' check (currency ~ '^[A-Z]{3}$'),
  rental_days integer check (rental_days is null or (rental_days between 1 and 365)),
  isbn_internal text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint books_rental_days_when_rental check (
    sale_model <> 'rental' or rental_days is not null
  ),
  constraint books_price_when_paid check (
    sale_model = 'free' or price_cents > 0
  )
);

create index books_author_idx on public.books (author_id, updated_at desc);

alter table public.books enable row level security;

create or replace function public.enforce_book_creation() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if not exists (
    select 1 from public.creations c where c.id = new.id and c.type = 'book' and c.author_id = new.author_id
  ) then
    raise exception 'books row must match a book creation owned by the author';
  end if;
  return new;
end;
$$;

create trigger books_enforce_creation
  before insert or update on public.books
  for each row execute function public.enforce_book_creation();

create or replace function public.enforce_books_per_author() returns trigger
language plpgsql security definer set search_path = public as $$
declare n integer;
begin
  select count(*) into n from public.books where author_id = new.author_id;
  if n >= 100 then
    -- before insert row exists; at 100 existing, block the 101st
    raise exception 'Book limit reached (100 per author).';
  end if;
  return new;
end;
$$;

create trigger books_limit_per_author
  before insert on public.books
  for each row execute function public.enforce_books_per_author();

create or replace function public.enforce_chapters_per_book() returns trigger
language plpgsql security definer set search_path = public as $$
declare n integer;
begin
  select count(*) into n from public.chapters where book_id = new.book_id;
  if n >= 200 then
    raise exception 'Chapter limit reached (200 per book).';
  end if;
  return new;
end;
$$;

drop trigger if exists chapters_limit_per_book on public.chapters;
create trigger chapters_limit_per_book
  before insert on public.chapters
  for each row execute function public.enforce_chapters_per_book();

alter table public.chapters
  add column if not exists is_sample boolean not null default false,
  add column if not exists word_count integer not null default 0 check (word_count >= 0);

update public.chapters
set title = coalesce(nullif(trim(title), ''), 'Chapter ' || position::text)
where title is null or char_length(trim(title)) = 0;

alter table public.chapters
  drop constraint if exists chapters_title_length;

alter table public.chapters
  add constraint chapters_title_length check (
    title is not null and char_length(trim(title)) between 1 and 150
  );

-- ---------------------------------------------------------------------------
-- reading_progress extensions (book/chapter paragraph resume)
-- ---------------------------------------------------------------------------

alter table public.reading_progress
  add column if not exists position integer not null default 0 check (position >= 0),
  add column if not exists position_offset real not null default 0 check (position_offset >= 0 and position_offset <= 1),
  add column if not exists completed boolean not null default false,
  add column if not exists first_read_at timestamptz;

update public.reading_progress set first_read_at = updated_at where first_read_at is null;

alter table public.reading_progress
  alter column first_read_at set default now();

grant update (percent, chapter_id, position, position_offset, completed) on public.reading_progress to authenticated;
grant insert (user_id, book_id, chapter_id, percent, position, position_offset, completed, first_read_at) on public.reading_progress to authenticated;

-- ---------------------------------------------------------------------------
-- Entitlements (client read-only; writes via security definer functions)
-- ---------------------------------------------------------------------------

create table public.book_entitlements (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  book_id uuid not null references public.creations(id) on delete cascade,
  kind public.book_entitlement_kind not null,
  starts_at timestamptz not null default now(),
  expires_at timestamptz,
  created_at timestamptz not null default now(),
  unique (user_id, book_id, kind, starts_at)
);

create index book_entitlements_user_book_idx on public.book_entitlements (user_id, book_id);
create index book_entitlements_expires_idx on public.book_entitlements (user_id, expires_at);

alter table public.book_entitlements enable row level security;

-- ---------------------------------------------------------------------------
-- Access helpers
-- ---------------------------------------------------------------------------

create or replace function public.payments_enabled() returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce((value->>'enabled')::boolean, false)
  from public.platform_settings
  where key = 'payments';
$$;

revoke all on function public.payments_enabled() from public, anon;
grant execute on function public.payments_enabled() to authenticated;

create or replace function public.user_has_book_entitlement(p_user uuid, p_book uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1
    from public.book_entitlements e
    where e.user_id = p_user
      and e.book_id = p_book
      and (e.expires_at is null or e.expires_at > now())
  );
$$;

revoke all on function public.user_has_book_entitlement(uuid, uuid) from public, anon;
grant execute on function public.user_has_book_entitlement(uuid, uuid) to authenticated;

create or replace function public.can_read_book_chapter(p_chapter_id uuid) returns boolean
language plpgsql stable security definer set search_path = public as $$
declare
  v_book uuid;
  v_author uuid;
  v_status public.publish_status;
  v_removed boolean;
  v_sample boolean;
  v_ch_status public.publish_status;
  v_ch_removed boolean;
  v_sale public.book_sale_model;
  v_uid uuid := auth.uid();
begin
  select ch.book_id, ch.is_sample, ch.status, ch.is_removed, c.author_id, c.status, c.is_removed, b.sale_model
    into v_book, v_sample, v_ch_status, v_ch_removed, v_author, v_status, v_removed, v_sale
  from public.chapters ch
  join public.creations c on c.id = ch.book_id
  left join public.books b on b.id = c.id
  where ch.id = p_chapter_id;

  if v_book is null then
    return false;
  end if;

  if v_uid is not null and v_uid = v_author then
    return true;
  end if;

  if v_removed or v_status = 'removed' or v_ch_removed then
    return false;
  end if;

  if v_ch_status <> 'published' then
    return false;
  end if;

  if v_status not in ('published', 'unlisted') then
    return false;
  end if;

  if not public.can_view_creation(v_book) then
    return false;
  end if;

  if coalesce(v_sale, 'free') = 'free' then
    return true;
  end if;

  if v_sample then
    return true;
  end if;

  if v_uid is null then
    return false;
  end if;

  return public.user_has_book_entitlement(v_uid, v_book);
end;
$$;

revoke all on function public.can_read_book_chapter(uuid) from public, anon;
grant execute on function public.can_read_book_chapter(uuid) to authenticated;

-- Paid books cannot publish until payments enabled
create or replace function public.enforce_book_publish_rules() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  v_sale public.book_sale_model;
begin
  if new.type <> 'book' then
    return new;
  end if;
  select sale_model into v_sale from public.books where id = new.id;
  if v_sale is null then
    v_sale := 'free';
  end if;
  if new.status = 'published' and v_sale <> 'free' and not public.payments_enabled() then
    raise exception 'Paid books cannot be published until payments are enabled. Use unlisted or draft.';
  end if;
  return new;
end;
$$;

drop trigger if exists creations_book_publish_rules on public.creations;
create trigger creations_book_publish_rules
  before insert or update of status on public.creations
  for each row execute function public.enforce_book_publish_rules();

-- ---------------------------------------------------------------------------
-- claim_free_book
-- ---------------------------------------------------------------------------

create or replace function public.claim_free_book(p_book_id uuid) returns uuid
language plpgsql security definer set search_path = public as $$
declare
  v_uid uuid := auth.uid();
  v_sale public.book_sale_model;
  v_status public.publish_status;
  v_id uuid;
begin
  if v_uid is null then
    raise exception 'Sign in to add this book.';
  end if;
  if not public.is_active_user() then
    raise exception 'Account is not active.';
  end if;
  select b.sale_model, c.status
    into v_sale, v_status
  from public.books b
  join public.creations c on c.id = b.id
  where b.id = p_book_id and c.is_removed = false;
  if v_sale is null then
    raise exception 'Book not found.';
  end if;
  if v_sale <> 'free' then
    raise exception 'This book is not free.';
  end if;
  if v_status not in ('published', 'unlisted') then
    raise exception 'This book is not available.';
  end if;
  if not public.can_view_creation(p_book_id) then
    raise exception 'This book is not available.';
  end if;

  select id into v_id
  from public.book_entitlements
  where user_id = v_uid and book_id = p_book_id and kind = 'free'
  limit 1;
  if v_id is not null then
    return v_id;
  end if;

  insert into public.book_entitlements (user_id, book_id, kind, starts_at, expires_at)
  values (v_uid, p_book_id, 'free', now(), null)
  returning id into v_id;
  return v_id;
end;
$$;

revoke all on function public.claim_free_book(uuid) from public, anon;
grant execute on function public.claim_free_book(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- Chapter RLS: bodies only when can_read_book_chapter
-- ---------------------------------------------------------------------------

drop policy if exists chapters_select on public.chapters;

create policy chapters_select on public.chapters
  for select to authenticated
  using (
    public.can_read_book_chapter(id)
    or (
      exists (
        select 1 from public.creations c
        where c.id = book_id and c.author_id = auth.uid()
      )
    )
  );

-- ---------------------------------------------------------------------------
-- books RLS
-- ---------------------------------------------------------------------------

revoke all on table public.books from public, anon;
grant select, insert, update, delete on table public.books to authenticated;
grant insert (id, author_id, subtitle, description, sale_model, price_cents, currency, rental_days, isbn_internal)
  on public.books to authenticated;
grant update (subtitle, description, sale_model, price_cents, currency, rental_days, isbn_internal)
  on public.books to authenticated;

create policy books_select on public.books
  for select to authenticated
  using (
    author_id = auth.uid()
    or (
      exists (
        select 1 from public.creations c
        where c.id = books.id
          and c.is_removed = false
          and c.status in ('published', 'unlisted')
          and public.can_view_creation(c.id)
      )
    )
  );

create policy books_insert on public.books
  for insert to authenticated
  with check (
    author_id = auth.uid()
    and public.is_active_user()
    and exists (
      select 1 from public.creations c
      where c.id = books.id and c.author_id = auth.uid() and c.type = 'book'
    )
  );

create policy books_update on public.books
  for update to authenticated
  using (author_id = auth.uid() and public.is_active_user())
  with check (author_id = auth.uid() and public.is_active_user());

create policy books_delete on public.books
  for delete to authenticated
  using (author_id = auth.uid() and public.is_active_user());

-- entitlements: select own only, no direct writes
revoke all on table public.book_entitlements from public, anon;
grant select on table public.book_entitlements to authenticated;

create policy book_entitlements_select on public.book_entitlements
  for select to authenticated
  using (user_id = auth.uid());

-- ---------------------------------------------------------------------------
-- Public TOC view (no bodies)
-- ---------------------------------------------------------------------------

create or replace view public.book_chapters_toc
with (security_invoker = false) as
select
  ch.id,
  ch.book_id,
  ch.position,
  ch.title,
  ch.status,
  ch.is_sample,
  ch.published_at,
  case when ch.status = 'published' and ch.is_removed = false then false else true end as coming_soon
from public.chapters ch
join public.creations c on c.id = ch.book_id
where c.type = 'book'
  and c.is_removed = false
  and (
    c.author_id = auth.uid()
    or (c.status in ('published', 'unlisted') and public.can_view_creation(c.id))
  );

grant select on public.book_chapters_toc to authenticated;
revoke all on public.book_chapters_toc from public, anon;

-- ---------------------------------------------------------------------------
-- library_books view
-- ---------------------------------------------------------------------------

create or replace view public.library_books
with (security_invoker = true) as
select
  e.user_id,
  b.id as book_id,
  c.title,
  c.cover_url,
  c.author_id,
  p.username as author_username,
  p.display_name as author_display_name,
  b.sale_model,
  rp.percent,
  rp.chapter_id as last_chapter_id,
  rp.updated_at as last_read_at,
  case
    when rp.completed then 'Finished'
    when rp.percent > 0 then 'Reading'
    else 'Not started'
  end as reading_status,
  ent.expires_at as rental_expires_at,
  case
    when ent.kind = 'rental' and ent.expires_at is not null
      then greatest(0, ceil(extract(epoch from (ent.expires_at - now())) / 86400.0))::integer
    else null
  end as rental_days_left
from public.book_entitlements e
join public.books b on b.id = e.book_id
join public.creations c on c.id = b.id
join public.profiles_public p on p.id = c.author_id
left join public.reading_progress rp on rp.user_id = e.user_id and rp.book_id = b.id
left join lateral (
  select kind, expires_at
  from public.book_entitlements e2
  where e2.user_id = e.user_id and e2.book_id = e.book_id
    and (e2.expires_at is null or e2.expires_at > now())
  order by e2.starts_at desc
  limit 1
) ent on true
where c.is_removed = false
  and (e.expires_at is null or e.expires_at > now())
  and public.can_view_creation(c.id);

grant select on public.library_books to authenticated;
revoke all on public.library_books from public, anon;

-- ---------------------------------------------------------------------------
-- reader highlights / bookmarks: optional chapter_id
-- ---------------------------------------------------------------------------

alter table public.reader_highlights
  alter column creation_id drop not null,
  add column if not exists chapter_id uuid references public.chapters(id) on delete cascade;

alter table public.reader_bookmarks
  alter column creation_id drop not null,
  add column if not exists chapter_id uuid references public.chapters(id) on delete cascade;

alter table public.reader_highlights
  add constraint reader_highlights_target_one check (
    (creation_id is not null and chapter_id is null)
    or (creation_id is null and chapter_id is not null)
  );

alter table public.reader_bookmarks
  add constraint reader_bookmarks_target_one check (
    (creation_id is not null and chapter_id is null)
    or (creation_id is null and chapter_id is not null)
  );

create index if not exists reader_highlights_user_chapter_idx
  on public.reader_highlights (user_id, chapter_id);

create index if not exists reader_bookmarks_user_chapter_idx
  on public.reader_bookmarks (user_id, chapter_id);

-- Replace highlight limit trigger to allow chapter targets
create or replace function public.enforce_reader_highlights_limit() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  n_user integer;
  n_target integer;
begin
  if tg_op = 'INSERT' then
    select count(*) into n_user from public.reader_highlights where user_id = new.user_id;
    if n_user >= 5000 then
      raise exception 'Highlight limit reached (5000 per user).';
    end if;
    if new.creation_id is not null then
      select count(*) into n_target
      from public.reader_highlights
      where user_id = new.user_id and creation_id = new.creation_id;
      if n_target >= 500 then
        raise exception 'Highlight limit reached (500 per post).';
      end if;
      if not public.creation_visible_in_feed(new.creation_id) then
        raise exception 'This work is not available to highlight.';
      end if;
    elsif new.chapter_id is not null then
      select count(*) into n_target
      from public.reader_highlights
      where user_id = new.user_id and chapter_id = new.chapter_id;
      if n_target >= 500 then
        raise exception 'Highlight limit reached (500 per chapter).';
      end if;
      if not public.can_read_book_chapter(new.chapter_id) then
        raise exception 'This chapter is not available to highlight.';
      end if;
    end if;
  end if;
  new.updated_at := now();
  return new;
end;
$$;

create or replace function public.enforce_reader_bookmarks_limit() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  n_user integer;
  n_target integer;
begin
  if tg_op = 'INSERT' then
    select count(*) into n_user from public.reader_bookmarks where user_id = new.user_id;
    if n_user >= 1000 then
      raise exception 'Bookmark limit reached (1000 per user).';
    end if;
    if new.creation_id is not null then
      select count(*) into n_target
      from public.reader_bookmarks
      where user_id = new.user_id and creation_id = new.creation_id;
      if n_target >= 50 then
        raise exception 'Bookmark limit reached (50 per post).';
      end if;
      if not public.creation_visible_in_feed(new.creation_id) then
        raise exception 'This work is not available to bookmark.';
      end if;
    elsif new.chapter_id is not null then
      select count(*) into n_target
      from public.reader_bookmarks
      where user_id = new.user_id and chapter_id = new.chapter_id;
      if n_target >= 50 then
        raise exception 'Bookmark limit reached (50 per chapter).';
      end if;
      if not public.can_read_book_chapter(new.chapter_id) then
        raise exception 'This chapter is not available to bookmark.';
      end if;
    end if;
  end if;
  return new;
end;
$$;

grant insert (user_id, chapter_id, start_paragraph, start_char, end_paragraph, end_char, quote, colour, note)
  on public.reader_highlights to authenticated;

grant insert (user_id, chapter_id, paragraph, paragraph_offset, label)
  on public.reader_bookmarks to authenticated;
