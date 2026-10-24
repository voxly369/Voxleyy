-- Founder CRUD for daily_quotes (Stage 2).

create table if not exists public.daily_quote_founder_attempts (
  id bigint generated always as identity primary key,
  founder_id uuid not null references auth.users (id) on delete cascade,
  created_at timestamptz not null default now()
);

alter table public.daily_quote_founder_attempts enable row level security;
revoke all on table public.daily_quote_founder_attempts from public, anon, authenticated;

create or replace function public.founder_list_daily_quotes(
  p_cursor uuid default null,
  p_limit integer default 50
) returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare
  lim integer := least(greatest(coalesce(p_limit, 50), 1), 100);
  rows jsonb;
  next_cursor uuid;
begin
  if not public.is_founder() then raise exception 'forbidden'; end if;
  select coalesce(jsonb_agg(row), '[]'::jsonb) into rows
  from (
    select jsonb_build_object(
      'id', q.id,
      'text', q.text,
      'author', q.author,
      'source', q.source,
      'active', q.active,
      'kind', q.kind,
      'created_at', q.created_at
    ) as row
    from public.daily_quotes q
    where (p_cursor is null or q.created_at < (select dq.created_at from public.daily_quotes dq where dq.id = p_cursor))
    order by q.created_at desc, q.id desc
    limit lim
  ) s;
  select (r->>'id')::uuid into next_cursor
  from jsonb_array_elements(rows) r
  order by (r->>'created_at')::timestamptz asc
  limit 1;
  return jsonb_build_object('rows', coalesce(rows, '[]'::jsonb), 'next_cursor', next_cursor);
end;
$$;

grant execute on function public.founder_list_daily_quotes(uuid, integer) to authenticated;

create or replace function public.founder_upsert_daily_quote(
  p_id uuid default null,
  p_text text default null,
  p_author text default null,
  p_source text default null,
  p_kind text default null,
  p_active boolean default null
) returns uuid
language plpgsql security definer set search_path = public as $$
declare
  uid uuid := auth.uid();
  v_id uuid;
  v_kind text;
begin
  if not public.is_founder() then raise exception 'forbidden'; end if;
  delete from public.daily_quote_founder_attempts where founder_id = uid and created_at < now() - interval '1 day';
  if (select count(*) from public.daily_quote_founder_attempts where founder_id = uid and created_at > now() - interval '1 day') >= 60 then
    raise exception 'You can change daily quotes up to 60 times per day.';
  end if;
  insert into public.daily_quote_founder_attempts (founder_id) values (uid);

  v_kind := coalesce(nullif(btrim(p_kind), ''), 'original');
  if v_kind not in ('public_domain', 'original', 'owner') then
    raise exception 'Invalid quote kind.';
  end if;

  if p_id is null then
    if p_text is null or char_length(btrim(p_text)) < 1 then raise exception 'Quote text is required.'; end if;
    if p_author is null or char_length(btrim(p_author)) < 1 then raise exception 'Author is required.'; end if;
    insert into public.daily_quotes (text, author, source, active, kind)
    values (
      btrim(p_text),
      btrim(p_author),
      nullif(btrim(coalesce(p_source, '')), ''),
      coalesce(p_active, true),
      v_kind
    )
    returning id into v_id;
  else
    update public.daily_quotes set
      text = case when p_text is not null then btrim(p_text) else text end,
      author = case when p_author is not null then btrim(p_author) else author end,
      source = case when p_source is not null then nullif(btrim(p_source), '') else source end,
      kind = case when p_kind is not null then v_kind else kind end,
      active = case when p_active is not null then p_active else active end
    where id = p_id
    returning id into v_id;
    if v_id is null then raise exception 'Quote not found.'; end if;
  end if;

  perform public.founder_write_audit(
    'dismiss'::public.mod_action,
    'daily_quote',
    uid,
    uid,
    v_id,
    'Founder upsert daily quote ' || v_id::text
  );
  return v_id;
end;
$$;

grant execute on function public.founder_upsert_daily_quote(uuid, text, text, text, text, boolean) to authenticated;

create or replace function public.founder_active_daily_quote_count() returns integer
language sql stable security definer set search_path = public as $$
  select count(*)::integer from public.daily_quotes where active;
$$;

grant execute on function public.founder_active_daily_quote_count() to authenticated;
