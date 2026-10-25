-- Prompt 19B: saved cover designs (Cover Studio 2)

create table if not exists public.cover_designs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  book_id uuid references public.creations (id) on delete set null,
  name text not null check (char_length(name) between 1 and 80),
  design_json jsonb not null,
  thumbnail_path text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint cover_designs_json_size check (octet_length(design_json::text) <= 512000)
);

create index if not exists cover_designs_user_id_idx on public.cover_designs (user_id);
create index if not exists cover_designs_book_id_idx on public.cover_designs (book_id) where book_id is not null;

alter table public.cover_designs enable row level security;

revoke all on table public.cover_designs from public, anon;
grant select, insert, update, delete on table public.cover_designs to authenticated;

create policy cover_designs_select_own on public.cover_designs
  for select to authenticated using (user_id = auth.uid());

create policy cover_designs_insert_own on public.cover_designs
  for insert to authenticated with check (user_id = auth.uid());

create policy cover_designs_update_own on public.cover_designs
  for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy cover_designs_delete_own on public.cover_designs
  for delete to authenticated using (user_id = auth.uid());

create or replace function public.enforce_cover_designs_limit() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  n integer;
begin
  if tg_op = 'INSERT' then
    select count(*) into n from public.cover_designs where user_id = new.user_id;
    if n >= 50 then
      raise exception 'You can save at most 50 cover designs.';
    end if;
  end if;
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists cover_designs_limit_tr on public.cover_designs;
create trigger cover_designs_limit_tr
  before insert or update on public.cover_designs
  for each row execute function public.enforce_cover_designs_limit();

-- Thumbnail paths live under covers/{user_id}/…; delete_my_account already queues via queue_user_storage_for_deletion.
-- cover_designs rows cascade when auth.users is deleted.
