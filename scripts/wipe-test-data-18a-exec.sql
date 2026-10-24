\set ON_ERROR_STOP on

create temp table wipe_class (table_name text primary key, kind text not null, note text);

insert into wipe_class values
  ('badges', 'REFERENCE', 'badge definition catalog'),
  ('writing_prompts', 'REFERENCE', 'seed writing prompts'),
  ('ranking_settings', 'REFERENCE', 'discover ranking config row'),
  ('platform_settings', 'REFERENCE', 'platform flags; values reset on wipe only');

insert into wipe_class (table_name, kind, note)
select c.relname, 'USER', 'user or derived operational data'
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public' and c.relkind = 'r'
  and not exists (select 1 from wipe_class w where w.table_name = c.relname);

create temp table wipe_counts_before as
select w.table_name, w.kind,
  (xpath('/row/c/text()', query_to_xml(format('select count(*)::text as c from public.%I', w.table_name), false, true, '')))[1]::text::bigint as row_count
from wipe_class w;

create temp table ref_counts_before as
select table_name, row_count from wipe_counts_before where kind = 'REFERENCE';

select sum(row_count) filter (where kind = 'USER') as user_rows_total_before,
       (select count(*) from auth.users) as auth_users_before
from wipe_counts_before;

begin;

alter table public.moderation_actions disable trigger user;

do $$
declare r record;
begin
  for r in select table_name from wipe_class where kind = 'USER' order by table_name loop
    execute format('truncate table public.%I restart identity cascade', r.table_name);
  end loop;
end $$;

alter table public.moderation_actions enable trigger user;

delete from auth.users;

update public.platform_settings
set value = jsonb_build_object(
  'invite_only', true,
  'signups_open', true,
  'waitlist_open', false,
  'closed_message', null
)
where key = 'beta';

insert into public.platform_settings (key, value)
values ('signups', jsonb_build_object('open', true))
on conflict (key) do update set value = excluded.value;

do $$
declare
  r record;
  c bigint;
  ref_before bigint;
  ref_after bigint;
begin
  if (select count(*) from auth.users) <> 0 then
    raise exception 'assert fail: auth.users not empty';
  end if;
  for r in select table_name from wipe_class where kind in ('USER', 'AMBIGUOUS') loop
    execute format('select count(*) from public.%I', r.table_name) into c;
    if c <> 0 then raise exception 'assert fail: % has % rows', r.table_name, c; end if;
  end loop;
  for r in select table_name from ref_counts_before loop
    select row_count into ref_before from ref_counts_before where table_name = r.table_name;
    execute format('select count(*) from public.%I', r.table_name) into ref_after;
    if ref_after is distinct from ref_before then
      raise exception 'assert fail: reference % count % -> %', r.table_name, ref_before, ref_after;
    end if;
  end loop;
end $$;

select (select count(*) from auth.users) as auth_users_after;

select w.kind, w.table_name, b.row_count as rows_before,
  (xpath('/row/c/text()', query_to_xml(format('select count(*)::text as c from public.%I', w.table_name), false, true, '')))[1]::text::bigint as rows_after
from wipe_class w
join wipe_counts_before b on b.table_name = w.table_name
order by w.kind, w.table_name;

commit;
