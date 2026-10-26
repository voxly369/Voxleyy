-- Phase 3: rename isbn_numbers → voxly_book_ids (spec naming) and align books metadata.

do $rename_isbn$
declare
  idx record;
  pol record;
begin
  if to_regclass('public.isbn_numbers') is not null and to_regclass('public.voxly_book_ids') is null then
    alter table public.isbn_numbers rename to voxly_book_ids;
    for idx in
      select indexname
      from pg_indexes
      where schemaname = 'public' and tablename = 'voxly_book_ids' and indexname like 'isbn_numbers%'
    loop
      execute format(
        'alter index public.%I rename to %I',
        idx.indexname,
        replace(idx.indexname, 'isbn_numbers', 'voxly_book_ids')
      );
    end loop;
    for pol in
      select policyname
      from pg_policies
      where schemaname = 'public' and tablename = 'voxly_book_ids' and policyname like 'isbn_numbers%'
    loop
      execute format(
        'alter policy %I on public.voxly_book_ids rename to %I',
        pol.policyname,
        replace(pol.policyname, 'isbn_numbers', 'voxly_book_ids')
      );
    end loop;
  end if;
end $rename_isbn$;

create table if not exists public.voxly_book_ids (
  id uuid primary key default gen_random_uuid(),
  book_id uuid not null unique references public.creations (id) on delete cascade,
  owner_id uuid not null references public.profiles (id) on delete cascade,
  identifier text not null unique,
  reserved_at timestamptz not null default now(),
  published_at timestamptz,
  expires_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint voxly_book_ids_identifier_len check (char_length(trim(identifier)) between 4 and 32)
);

create index if not exists voxly_book_ids_owner_idx on public.voxly_book_ids (owner_id, updated_at desc);

alter table public.voxly_book_ids enable row level security;

revoke all on table public.voxly_book_ids from public, anon;
grant select, insert, update, delete on table public.voxly_book_ids to authenticated;

drop policy if exists voxly_book_ids_select_own on public.voxly_book_ids;
create policy voxly_book_ids_select_own on public.voxly_book_ids
  for select to authenticated using (owner_id = auth.uid());

drop policy if exists voxly_book_ids_insert_own on public.voxly_book_ids;
create policy voxly_book_ids_insert_own on public.voxly_book_ids
  for insert to authenticated with check (owner_id = auth.uid());

drop policy if exists voxly_book_ids_update_own on public.voxly_book_ids;
create policy voxly_book_ids_update_own on public.voxly_book_ids
  for update to authenticated using (owner_id = auth.uid()) with check (owner_id = auth.uid());

drop policy if exists voxly_book_ids_delete_own on public.voxly_book_ids;
create policy voxly_book_ids_delete_own on public.voxly_book_ids
  for delete to authenticated using (owner_id = auth.uid());

insert into public.voxly_book_ids (book_id, owner_id, identifier, published_at)
select b.id, b.author_id, trim(b.isbn_internal), now()
from public.books b
where b.isbn_internal is not null
  and char_length(trim(b.isbn_internal)) >= 4
on conflict (book_id) do nothing;

alter table public.books drop column if exists isbn_internal;

create or replace function public.touch_voxly_book_ids_updated_at() returns trigger
language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists voxly_book_ids_updated_at on public.voxly_book_ids;
create trigger voxly_book_ids_updated_at
  before update on public.voxly_book_ids
  for each row execute function public.touch_voxly_book_ids_updated_at();

revoke insert on table public.books from authenticated;
revoke update on table public.books from authenticated;
grant insert (id, author_id, subtitle, description, sale_model, price_cents, currency, rental_days)
  on table public.books to authenticated;
grant update (subtitle, description, sale_model, price_cents, currency, rental_days)
  on table public.books to authenticated;
