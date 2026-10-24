\set ON_ERROR_STOP on
-- Dry run: classification + row counts only (no mutations).

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

update wipe_class set kind = 'AMBIGUOUS', note = 'metrics refresh cursor; wiped with user metrics'
  where table_name = 'daily_metrics_state';

select kind, table_name, note,
  (xpath('/row/c/text()', query_to_xml(format('select count(*)::text as c from public.%I', table_name), false, true, '')))[1]::text::bigint as row_count
from wipe_class
order by kind, table_name;

select count(*) as auth_users from auth.users;

select b.id as bucket_id, b.name as bucket_name, count(o.id) as object_count
from storage.buckets b
left join storage.objects o on o.bucket_id = b.id
group by b.id, b.name
order by b.name;
