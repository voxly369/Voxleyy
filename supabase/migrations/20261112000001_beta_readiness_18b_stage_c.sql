-- Prompt 18B Stage C: languages reference, author post languages, discover search filters.

create table if not exists public.languages (
  code text primary key check (code ~ '^[a-z]{2}$'),
  name_en text not null,
  name_native text not null
);

do $migrate_languages_cols$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'languages' and column_name = 'name'
  ) and not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'languages' and column_name = 'name_en'
  ) then
    alter table public.languages rename column name to name_en;
    alter table public.languages add column if not exists name_native text;
    update public.languages set name_native = name_en where name_native is null;
    alter table public.languages alter column name_native set not null;
  end if;
end $migrate_languages_cols$;

alter table public.languages enable row level security;

drop policy if exists languages_select_authenticated on public.languages;
create policy languages_select_authenticated on public.languages
  for select to authenticated using (true);

revoke all on table public.languages from public, anon;
grant select on table public.languages to authenticated;

create or replace function public.list_author_post_languages(p_author_id uuid)
returns text[]
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    array_agg(distinct c.language order by c.language),
    '{}'::text[]
  )
  from public.creations c
  where c.author_id = p_author_id
    and c.status = 'published'
    and c.is_removed = false
    and c.language is not null
    and btrim(c.language) <> '';
$$;

revoke all on function public.list_author_post_languages(uuid) from public, anon;
grant execute on function public.list_author_post_languages(uuid) to authenticated;

drop view if exists public.discover_rising_writers;

create view public.discover_rising_writers
with (security_invoker = true)
as
select
  p.id,
  p.username,
  p.display_name,
  p.avatar_url,
  p.verified,
  p.country,
  p.follower_count,
  coalesce(f.new_followers, 0) as new_followers_7d,
  coalesce(e.recent_engagement, 0) as recent_engagement_7d,
  (coalesce(f.new_followers, 0) * 2 + coalesce(e.recent_engagement, 0)) as momentum_score
from public.profiles_public p
left join lateral (
  select count(*)::integer as new_followers
  from public.follows fo
  where fo.followee_id = p.id
    and fo.created_at >= now() - interval '7 days'
) f on true
left join lateral (
  select sum(
    public.compute_engagement_score(c.like_count, c.save_count, c.comment_count, c.view_count, c.published_at)
  )::numeric as recent_engagement
  from public.creations c
  where c.author_id = p.id
    and c.status = 'published'
    and c.audience = 'public'
    and c.is_removed = false
    and c.published_at >= now() - interval '7 days'
) e on true
where p.status = 'active'
  and p.follower_count < 1000
  and (coalesce(f.new_followers, 0) > 0 or coalesce(e.recent_engagement, 0) > 0);

revoke all on table public.discover_rising_writers from public, anon;
grant select on table public.discover_rising_writers to authenticated;

drop view if exists public.founder_featured_writers_public;

create view public.founder_featured_writers_public
with (security_invoker = false)
as
select
  ff.writer_id,
  ff.sort_order,
  p.id,
  p.username,
  p.display_name,
  p.avatar_url,
  p.verified,
  p.bio,
  p.country,
  p.follower_count
from public.founder_featured_writers ff
inner join public.profiles_public p on p.id = ff.writer_id
where ff.active
  and p.status = 'active'
  and not public.is_blocked_between(auth.uid(), p.id);

revoke all on table public.founder_featured_writers_public from public, anon;
grant select on table public.founder_featured_writers_public to authenticated;

drop function if exists public.search_discovery(text, text, integer);

create or replace function public.search_discovery(
  p_query text,
  p_tab text default 'top',
  p_limit integer default 20,
  p_languages text[] default null
) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user uuid := auth.uid();
  v_q text;
  v_tsquery tsquery;
  v_writers jsonb := '[]'::jsonb;
  v_posts jsonb := '[]'::jsonb;
  v_tags jsonb := '[]'::jsonb;
  v_langs text[];
begin
  if v_user is null then
    raise exception 'Sign in to search.';
  end if;

  perform public.record_search_event(v_user);

  v_q := public.sanitize_search_query(p_query);
  if char_length(v_q) < 2 then
    return jsonb_build_object('writers', v_writers, 'posts', v_posts, 'tags', v_tags);
  end if;

  v_tsquery := plainto_tsquery('simple', v_q);
  v_langs := nullif(
    array(
      select distinct lower(btrim(x))
      from unnest(coalesce(p_languages, '{}'::text[])) x
      where btrim(x) ~ '^[a-z]{2,8}$'
    ),
    '{}'::text[]
  );

  if p_tab in ('top', 'writers') then
    select coalesce(jsonb_agg(row_to_json(w)), '[]'::jsonb) into v_writers
    from (
      select p.id, p.username, p.display_name, p.avatar_url, p.verified, p.follower_count, p.country
      from public.profiles_public p
      where p.status = 'active'
        and not public.is_muted_by(v_user, p.id)
        and (
          p.username ilike v_q || '%'
          or p.display_name ilike '%' || v_q || '%'
          or similarity(p.username, v_q) > 0.25
          or similarity(p.display_name, v_q) > 0.25
        )
        and (
          v_langs is null
          or exists (
            select 1
            from public.creations c
            where c.author_id = p.id
              and c.status = 'published'
              and c.audience = 'public'
              and c.is_removed = false
              and lower(c.language) = any (v_langs)
          )
        )
      order by greatest(similarity(p.username, v_q), similarity(p.display_name, v_q)) desc
      limit least(p_limit, 30)
    ) w;
  end if;

  if p_tab in ('top', 'posts') then
    select coalesce(jsonb_agg(row_to_json(x)), '[]'::jsonb) into v_posts
    from (
      select
        fc.id,
        fc.type,
        fc.title,
        fc.caption,
        fc.body_excerpt,
        fc.body_truncated,
        fc.published_at,
        fc.like_count,
        fc.author_id,
        pp.username as author_username,
        pp.display_name as author_display_name,
        pp.avatar_url as author_avatar_url,
        pp.verified as author_verified
      from public.feed_creations fc
      inner join public.profiles_public pp on pp.id = fc.author_id
      inner join public.creations c on c.id = fc.id
      where (c.search_tsv @@ v_tsquery
         or fc.title ilike '%' || v_q || '%'
         or fc.caption ilike '%' || v_q || '%')
        and (v_langs is null or lower(c.language) = any (v_langs))
      order by fc.published_at desc
      limit least(p_limit, 30)
    ) x;
  end if;

  if p_tab in ('top', 'tags') then
    select coalesce(jsonb_agg(row_to_json(t)), '[]'::jsonb) into v_tags
    from (
      select ct.tag, count(*)::integer as post_count
      from public.creation_tags ct
      inner join public.creations c on c.id = ct.creation_id
      inner join public.profiles p on p.id = c.author_id
      where c.status = 'published'
        and c.audience = 'public'
        and c.is_removed = false
        and p.status = 'active'
        and not public.is_blocked_between(v_user, c.author_id)
        and (v_langs is null or lower(c.language) = any (v_langs))
        and (
          ct.tag::text ilike v_q || '%'
          or similarity(ct.tag::text, v_q) > 0.25
        )
      group by ct.tag
      order by post_count desc, ct.tag
      limit least(p_limit, 30)
    ) t;
  end if;

  return jsonb_build_object('writers', v_writers, 'posts', v_posts, 'tags', v_tags);
end;
$$;

revoke all on function public.search_discovery(text, text, integer, text[]) from public, anon;
grant execute on function public.search_discovery(text, text, integer, text[]) to authenticated;

-- Generated by scripts/generate-languages.mjs — do not edit by hand.
insert into public.languages (code, name_en, name_native)
values
  ('ab', 'Abkhazian', 'Abkhazian'),
  ('aa', 'Afar', 'Afar'),
  ('af', 'Afrikaans', 'Afrikaans'),
  ('ak', 'Akan', 'Akan'),
  ('tw', 'Akan', 'Akan'),
  ('sq', 'Albanian', 'shqip'),
  ('am', 'Amharic', 'አማርኛ'),
  ('ar', 'Arabic', 'العربية'),
  ('an', 'Aragonese', 'Aragonese'),
  ('hy', 'Armenian', 'հայերեն'),
  ('as', 'Assamese', 'অসমীয়া'),
  ('av', 'Avaric', 'Avaric'),
  ('ae', 'Avestan', 'Avestan'),
  ('ay', 'Aymara', 'Aymara'),
  ('az', 'Azerbaijani', 'azərbaycan'),
  ('bm', 'Bambara', 'bamanakan'),
  ('bn', 'Bangla', 'বাংলা'),
  ('ba', 'Bashkir', 'Bashkir'),
  ('eu', 'Basque', 'euskara'),
  ('be', 'Belarusian', 'беларуская'),
  ('bh', 'Bhojpuri', 'Bhojpuri'),
  ('bi', 'Bislama', 'Bislama'),
  ('bs', 'Bosnian', 'bosanski'),
  ('br', 'Breton', 'brezhoneg'),
  ('bg', 'Bulgarian', 'български'),
  ('my', 'Burmese', 'မြန်မာ'),
  ('ca', 'Catalan', 'català'),
  ('ch', 'Chamorro', 'Chamorro'),
  ('ce', 'Chechen', 'нохчийн'),
  ('zh', 'Chinese', '中文'),
  ('cu', 'Church Slavic', 'Church Slavic'),
  ('cv', 'Chuvash', 'чӑваш'),
  ('kw', 'Cornish', 'kernewek'),
  ('co', 'Corsican', 'Corsican'),
  ('cr', 'Cree', 'Cree'),
  ('hr', 'Croatian', 'hrvatski'),
  ('cs', 'Czech', 'čeština'),
  ('da', 'Danish', 'dansk'),
  ('dv', 'Divehi', 'Divehi'),
  ('nl', 'Dutch', 'Nederlands'),
  ('dz', 'Dzongkha', 'རྫོང་ཁ'),
  ('en', 'English', 'English'),
  ('eo', 'Esperanto', 'Esperanto'),
  ('et', 'Estonian', 'eesti'),
  ('ee', 'Ewe', 'eʋegbe'),
  ('fo', 'Faroese', 'føroyskt'),
  ('fj', 'Fijian', 'Fijian'),
  ('tl', 'Filipino', 'Filipino'),
  ('fi', 'Finnish', 'suomi'),
  ('fr', 'French', 'français'),
  ('ff', 'Fula', 'Pulaar'),
  ('gl', 'Galician', 'galego'),
  ('lg', 'Ganda', 'Luganda'),
  ('ka', 'Georgian', 'ქართული'),
  ('de', 'German', 'Deutsch'),
  ('el', 'Greek', 'Ελληνικά'),
  ('gn', 'Guarani', 'Guarani'),
  ('gu', 'Gujarati', 'ગુજરાતી'),
  ('ht', 'Haitian Creole', 'Haitian Creole'),
  ('ha', 'Hausa', 'Hausa'),
  ('he', 'Hebrew', 'עברית'),
  ('iw', 'Hebrew', 'עברית'),
  ('hz', 'Herero', 'Herero'),
  ('hi', 'Hindi', 'हिन्दी'),
  ('ho', 'Hiri Motu', 'Hiri Motu'),
  ('hu', 'Hungarian', 'magyar'),
  ('is', 'Icelandic', 'íslenska'),
  ('io', 'Ido', 'Ido'),
  ('ig', 'Igbo', 'Igbo'),
  ('id', 'Indonesian', 'Indonesia'),
  ('in', 'Indonesian', 'Indonesia'),
  ('ia', 'Interlingua', 'interlingua'),
  ('ie', 'Interlingue', 'Interlingue'),
  ('iu', 'Inuktitut', 'Inuktitut'),
  ('ik', 'Inupiaq', 'Inupiaq'),
  ('ga', 'Irish', 'Gaeilge'),
  ('it', 'Italian', 'italiano'),
  ('ja', 'Japanese', '日本語'),
  ('jv', 'Javanese', 'Jawa'),
  ('jw', 'Javanese', 'Jawa'),
  ('kl', 'Kalaallisut', 'kalaallisut'),
  ('kn', 'Kannada', 'ಕನ್ನಡ'),
  ('kr', 'Kanuri', 'Kanuri'),
  ('ks', 'Kashmiri', 'کٲشُر'),
  ('kk', 'Kazakh', 'қазақ тілі'),
  ('km', 'Khmer', 'ខ្មែរ'),
  ('ki', 'Kikuyu', 'Gikuyu'),
  ('rw', 'Kinyarwanda', 'Ikinyarwanda'),
  ('kv', 'Komi', 'Komi'),
  ('kg', 'Kongo', 'Kongo'),
  ('ko', 'Korean', '한국어'),
  ('kj', 'Kuanyama', 'Kuanyama'),
  ('ku', 'Kurdish', 'kurdî (kurmancî)'),
  ('ky', 'Kyrgyz', 'кыргызча'),
  ('lo', 'Lao', 'ລາວ'),
  ('la', 'Latin', 'Latin'),
  ('lv', 'Latvian', 'latviešu'),
  ('li', 'Limburgish', 'Limburgish'),
  ('ln', 'Lingala', 'lingála'),
  ('lt', 'Lithuanian', 'lietuvių'),
  ('lu', 'Luba-Katanga', 'Tshiluba'),
  ('lb', 'Luxembourgish', 'Lëtzebuergesch'),
  ('mk', 'Macedonian', 'македонски'),
  ('mg', 'Malagasy', 'Malagasy'),
  ('ms', 'Malay', 'Melayu'),
  ('ml', 'Malayalam', 'മലയാളം'),
  ('mt', 'Maltese', 'Malti'),
  ('gv', 'Manx', 'Gaelg'),
  ('mi', 'Māori', 'Māori'),
  ('mr', 'Marathi', 'मराठी'),
  ('mh', 'Marshallese', 'Marshallese'),
  ('mn', 'Mongolian', 'монгол'),
  ('na', 'Nauru', 'Nauru'),
  ('nv', 'Navajo', 'Navajo'),
  ('ng', 'Ndonga', 'Ndonga'),
  ('ne', 'Nepali', 'नेपाली'),
  ('nd', 'North Ndebele', 'isiNdebele'),
  ('se', 'Northern Sami', 'davvisámegiella'),
  ('no', 'Norwegian', 'norsk'),
  ('nb', 'Norwegian Bokmål', 'norsk bokmål'),
  ('nn', 'Norwegian Nynorsk', 'norsk nynorsk'),
  ('ny', 'Nyanja', 'Nyanja'),
  ('oc', 'Occitan', 'occitan'),
  ('or', 'Odia', 'ଓଡ଼ିଆ'),
  ('oj', 'Ojibwa', 'Ojibwa'),
  ('om', 'Oromo', 'Oromoo'),
  ('os', 'Ossetic', 'ирон'),
  ('pi', 'Pali', 'Pali'),
  ('ps', 'Pashto', 'پښتو'),
  ('fa', 'Persian', 'فارسی'),
  ('pl', 'Polish', 'polski'),
  ('pt', 'Portuguese', 'português'),
  ('pa', 'Punjabi', 'ਪੰਜਾਬੀ'),
  ('qu', 'Quechua', 'Runasimi'),
  ('mo', 'Romanian', 'română'),
  ('ro', 'Romanian', 'română'),
  ('rm', 'Romansh', 'rumantsch'),
  ('rn', 'Rundi', 'Ikirundi'),
  ('ru', 'Russian', 'русский'),
  ('sm', 'Samoan', 'Samoan'),
  ('sg', 'Sango', 'Sängö'),
  ('sa', 'Sanskrit', 'संस्कृत भाषा'),
  ('sc', 'Sardinian', 'sardu'),
  ('gd', 'Scottish Gaelic', 'Gàidhlig'),
  ('sr', 'Serbian', 'српски'),
  ('sh', 'Serbian (Latin)', 'srpski (latinica)'),
  ('sn', 'Shona', 'chiShona'),
  ('ii', 'Sichuan Yi', 'ꆈꌠꉙ'),
  ('sd', 'Sindhi', 'سنڌي'),
  ('si', 'Sinhala', 'සිංහල'),
  ('sk', 'Slovak', 'slovenčina'),
  ('sl', 'Slovenian', 'slovenščina'),
  ('so', 'Somali', 'Soomaali'),
  ('nr', 'South Ndebele', 'South Ndebele'),
  ('st', 'Southern Sotho', 'Sesotho'),
  ('es', 'Spanish', 'español'),
  ('su', 'Sundanese', 'Basa Sunda'),
  ('sw', 'Swahili', 'Kiswahili'),
  ('ss', 'Swati', 'Swati'),
  ('sv', 'Swedish', 'svenska'),
  ('ty', 'Tahitian', 'Tahitian'),
  ('tg', 'Tajik', 'тоҷикӣ'),
  ('ta', 'Tamil', 'தமிழ்'),
  ('tt', 'Tatar', 'татар'),
  ('te', 'Telugu', 'తెలుగు'),
  ('th', 'Thai', 'ไทย'),
  ('bo', 'Tibetan', 'བོད་སྐད་'),
  ('ti', 'Tigrinya', 'ትግርኛ'),
  ('to', 'Tongan', 'lea fakatonga'),
  ('ts', 'Tsonga', 'Tsonga'),
  ('tn', 'Tswana', 'Setswana'),
  ('tr', 'Turkish', 'Türkçe'),
  ('tk', 'Turkmen', 'türkmen dili'),
  ('uk', 'Ukrainian', 'українська'),
  ('ur', 'Urdu', 'اردو'),
  ('ug', 'Uyghur', 'ئۇيغۇرچە'),
  ('uz', 'Uzbek', 'o‘zbek'),
  ('ve', 'Venda', 'Venda'),
  ('vi', 'Vietnamese', 'Tiếng Việt'),
  ('vo', 'Volapük', 'Volapük'),
  ('wa', 'Walloon', 'Walloon'),
  ('cy', 'Welsh', 'Cymraeg'),
  ('fy', 'Western Frisian', 'Frysk'),
  ('wo', 'Wolof', 'Wolof'),
  ('xh', 'Xhosa', 'IsiXhosa'),
  ('ji', 'Yiddish', 'ייִדיש'),
  ('yi', 'Yiddish', 'ייִדיש'),
  ('yo', 'Yoruba', 'Èdè Yorùbá'),
  ('za', 'Zhuang', 'Vahcuengh'),
  ('zu', 'Zulu', 'isiZulu')
on conflict (code) do update set
  name_en = excluded.name_en,
  name_native = excluded.name_native;

-- Generated by scripts/generate-countries.mjs — do not edit by hand.
update public.countries set main_languages = ARRAY['fa']::text[] where code = 'AF';
update public.countries set main_languages = ARRAY['sv']::text[] where code = 'AX';
update public.countries set main_languages = ARRAY['sq']::text[] where code = 'AL';
update public.countries set main_languages = ARRAY['ar']::text[] where code = 'DZ';
update public.countries set main_languages = ARRAY['sm']::text[] where code = 'AS';
update public.countries set main_languages = ARRAY['ca']::text[] where code = 'AD';
update public.countries set main_languages = ARRAY['pt']::text[] where code = 'AO';
update public.countries set main_languages = ARRAY['en']::text[] where code = 'AI';
update public.countries set main_languages = ARRAY['en']::text[] where code = 'AQ';
update public.countries set main_languages = ARRAY['en']::text[] where code = 'AG';
update public.countries set main_languages = ARRAY['es']::text[] where code = 'AR';
update public.countries set main_languages = ARRAY['hy']::text[] where code = 'AM';
update public.countries set main_languages = ARRAY['nl']::text[] where code = 'AW';
update public.countries set main_languages = ARRAY['en']::text[] where code = 'AC';
update public.countries set main_languages = ARRAY['en']::text[] where code = 'AU';
update public.countries set main_languages = ARRAY['de']::text[] where code = 'AT';
update public.countries set main_languages = ARRAY['az']::text[] where code = 'AZ';
update public.countries set main_languages = ARRAY['en']::text[] where code = 'BS';
update public.countries set main_languages = ARRAY['ar']::text[] where code = 'BH';
update public.countries set main_languages = ARRAY['bn']::text[] where code = 'BD';
update public.countries set main_languages = ARRAY['en']::text[] where code = 'BB';
update public.countries set main_languages = ARRAY['be']::text[] where code = 'BY';
update public.countries set main_languages = ARRAY['nl']::text[] where code = 'BE';
update public.countries set main_languages = ARRAY['en']::text[] where code = 'BZ';
update public.countries set main_languages = ARRAY['fr']::text[] where code = 'BJ';
update public.countries set main_languages = ARRAY['fr']::text[] where code = 'DY';
update public.countries set main_languages = ARRAY['en']::text[] where code = 'BM';
update public.countries set main_languages = ARRAY['dz']::text[] where code = 'BT';
update public.countries set main_languages = ARRAY['es']::text[] where code = 'BO';
update public.countries set main_languages = ARRAY['bs']::text[] where code = 'BA';
update public.countries set main_languages = ARRAY['en']::text[] where code = 'BW';
update public.countries set main_languages = ARRAY['en']::text[] where code = 'BV';
update public.countries set main_languages = ARRAY['pt']::text[] where code = 'BR';
update public.countries set main_languages = ARRAY['en']::text[] where code = 'IO';
update public.countries set main_languages = ARRAY['en']::text[] where code = 'VG';
update public.countries set main_languages = ARRAY['ms']::text[] where code = 'BN';
update public.countries set main_languages = ARRAY['bg']::text[] where code = 'BG';
update public.countries set main_languages = ARRAY['fr']::text[] where code = 'BF';
update public.countries set main_languages = ARRAY['fr']::text[] where code = 'HV';
update public.countries set main_languages = ARRAY['rn']::text[] where code = 'BI';
update public.countries set main_languages = ARRAY['km']::text[] where code = 'KH';
update public.countries set main_languages = ARRAY['fr']::text[] where code = 'CM';
update public.countries set main_languages = ARRAY['en']::text[] where code = 'CA';
update public.countries set main_languages = ARRAY['es']::text[] where code = 'IC';
update public.countries set main_languages = ARRAY['pt']::text[] where code = 'CV';
update public.countries set main_languages = ARRAY['en']::text[] where code = 'KY';
update public.countries set main_languages = ARRAY['fr']::text[] where code = 'CF';
update public.countries set main_languages = ARRAY['es']::text[] where code = 'EA';
update public.countries set main_languages = ARRAY['fr']::text[] where code = 'TD';
update public.countries set main_languages = ARRAY['es']::text[] where code = 'CL';
update public.countries set main_languages = ARRAY['zh']::text[] where code = 'CN';
update public.countries set main_languages = ARRAY['en']::text[] where code = 'CX';
update public.countries set main_languages = ARRAY['en']::text[] where code = 'CP';
update public.countries set main_languages = ARRAY['ms']::text[] where code = 'CC';
update public.countries set main_languages = ARRAY['es']::text[] where code = 'CO';
update public.countries set main_languages = ARRAY['ar']::text[] where code = 'KM';
update public.countries set main_languages = ARRAY['fr']::text[] where code = 'CG';
update public.countries set main_languages = ARRAY['sw']::text[] where code = 'CD';
update public.countries set main_languages = ARRAY['sw']::text[] where code = 'ZR';
update public.countries set main_languages = ARRAY['en']::text[] where code = 'CK';
update public.countries set main_languages = ARRAY['es']::text[] where code = 'CR';
update public.countries set main_languages = ARRAY['fr']::text[] where code = 'CI';
update public.countries set main_languages = ARRAY['hr']::text[] where code = 'HR';
update public.countries set main_languages = ARRAY['es']::text[] where code = 'CU';
update public.countries set main_languages = ARRAY['el']::text[] where code = 'CY';
update public.countries set main_languages = ARRAY['cs']::text[] where code = 'CZ';
update public.countries set main_languages = ARRAY['da']::text[] where code = 'DK';
update public.countries set main_languages = ARRAY['en']::text[] where code = 'DG';
update public.countries set main_languages = ARRAY['aa']::text[] where code = 'DJ';
update public.countries set main_languages = ARRAY['en']::text[] where code = 'DM';
update public.countries set main_languages = ARRAY['es']::text[] where code = 'DO';
update public.countries set main_languages = ARRAY['es']::text[] where code = 'EC';
update public.countries set main_languages = ARRAY['ar']::text[] where code = 'EG';
update public.countries set main_languages = ARRAY['es']::text[] where code = 'SV';
update public.countries set main_languages = ARRAY['es']::text[] where code = 'GQ';
update public.countries set main_languages = ARRAY['ti']::text[] where code = 'ER';
update public.countries set main_languages = ARRAY['et']::text[] where code = 'EE';
update public.countries set main_languages = ARRAY['en']::text[] where code = 'SZ';
update public.countries set main_languages = ARRAY['am']::text[] where code = 'ET';
update public.countries set main_languages = ARRAY['en']::text[] where code = 'EU';
update public.countries set main_languages = ARRAY['en']::text[] where code = 'EZ';
update public.countries set main_languages = ARRAY['en']::text[] where code = 'FK';
update public.countries set main_languages = ARRAY['fo']::text[] where code = 'FO';
update public.countries set main_languages = ARRAY['en']::text[] where code = 'FJ';
update public.countries set main_languages = ARRAY['fi']::text[] where code = 'FI';
update public.countries set main_languages = ARRAY['fr']::text[] where code = 'FR';
update public.countries set main_languages = ARRAY['fr']::text[] where code = 'FX';
update public.countries set main_languages = ARRAY['fr']::text[] where code = 'GF';
update public.countries set main_languages = ARRAY['fr']::text[] where code = 'PF';
update public.countries set main_languages = ARRAY['fr']::text[] where code = 'TF';
update public.countries set main_languages = ARRAY['fr']::text[] where code = 'GA';
update public.countries set main_languages = ARRAY['en']::text[] where code = 'GM';
update public.countries set main_languages = ARRAY['ka']::text[] where code = 'GE';
update public.countries set main_languages = ARRAY['de']::text[] where code = 'DD';
update public.countries set main_languages = ARRAY['de']::text[] where code = 'DE';
update public.countries set main_languages = ARRAY['ak']::text[] where code = 'GH';
update public.countries set main_languages = ARRAY['en']::text[] where code = 'GI';
update public.countries set main_languages = ARRAY['el']::text[] where code = 'GR';
update public.countries set main_languages = ARRAY['kl']::text[] where code = 'GL';
update public.countries set main_languages = ARRAY['en']::text[] where code = 'GD';
update public.countries set main_languages = ARRAY['fr']::text[] where code = 'GP';
update public.countries set main_languages = ARRAY['en']::text[] where code = 'GU';
update public.countries set main_languages = ARRAY['es']::text[] where code = 'GT';
update public.countries set main_languages = ARRAY['en']::text[] where code = 'GG';
update public.countries set main_languages = ARRAY['fr']::text[] where code = 'GN';
update public.countries set main_languages = ARRAY['pt']::text[] where code = 'GW';
update public.countries set main_languages = ARRAY['en']::text[] where code = 'GY';
update public.countries set main_languages = ARRAY['ht']::text[] where code = 'HT';
update public.countries set main_languages = ARRAY['en']::text[] where code = 'HM';
update public.countries set main_languages = ARRAY['es']::text[] where code = 'HN';
update public.countries set main_languages = ARRAY['zh']::text[] where code = 'HK';
update public.countries set main_languages = ARRAY['hu']::text[] where code = 'HU';
update public.countries set main_languages = ARRAY['is']::text[] where code = 'IS';
update public.countries set main_languages = ARRAY['hi']::text[] where code = 'IN';
update public.countries set main_languages = ARRAY['id']::text[] where code = 'ID';
update public.countries set main_languages = ARRAY['fa']::text[] where code = 'IR';
update public.countries set main_languages = ARRAY['ar']::text[] where code = 'IQ';
update public.countries set main_languages = ARRAY['en']::text[] where code = 'IE';
update public.countries set main_languages = ARRAY['en']::text[] where code = 'IM';
update public.countries set main_languages = ARRAY['he']::text[] where code = 'IL';
update public.countries set main_languages = ARRAY['it']::text[] where code = 'IT';
update public.countries set main_languages = ARRAY['en']::text[] where code = 'JM';
update public.countries set main_languages = ARRAY['ja']::text[] where code = 'JP';
update public.countries set main_languages = ARRAY['en']::text[] where code = 'JE';
update public.countries set main_languages = ARRAY['ar']::text[] where code = 'JO';
update public.countries set main_languages = ARRAY['ru']::text[] where code = 'KZ';
update public.countries set main_languages = ARRAY['sw']::text[] where code = 'KE';
update public.countries set main_languages = ARRAY['en']::text[] where code = 'KI';
update public.countries set main_languages = ARRAY['sq']::text[] where code = 'XK';
update public.countries set main_languages = ARRAY['ar']::text[] where code = 'KW';
update public.countries set main_languages = ARRAY['ky']::text[] where code = 'KG';
update public.countries set main_languages = ARRAY['lo']::text[] where code = 'LA';
update public.countries set main_languages = ARRAY['lv']::text[] where code = 'LV';
update public.countries set main_languages = ARRAY['ar']::text[] where code = 'LB';
update public.countries set main_languages = ARRAY['st']::text[] where code = 'LS';
update public.countries set main_languages = ARRAY['en']::text[] where code = 'LR';
update public.countries set main_languages = ARRAY['ar']::text[] where code = 'LY';
update public.countries set main_languages = ARRAY['de']::text[] where code = 'LI';
update public.countries set main_languages = ARRAY['lt']::text[] where code = 'LT';
update public.countries set main_languages = ARRAY['fr']::text[] where code = 'LU';
update public.countries set main_languages = ARRAY['zh']::text[] where code = 'MO';
update public.countries set main_languages = ARRAY['mg']::text[] where code = 'MG';
update public.countries set main_languages = ARRAY['en']::text[] where code = 'MW';
update public.countries set main_languages = ARRAY['ms']::text[] where code = 'MY';
update public.countries set main_languages = ARRAY['dv']::text[] where code = 'MV';
update public.countries set main_languages = ARRAY['bm']::text[] where code = 'ML';
update public.countries set main_languages = ARRAY['mt']::text[] where code = 'MT';
update public.countries set main_languages = ARRAY['en']::text[] where code = 'MH';
update public.countries set main_languages = ARRAY['fr']::text[] where code = 'MQ';
update public.countries set main_languages = ARRAY['ar']::text[] where code = 'MR';
update public.countries set main_languages = ARRAY['fr']::text[] where code = 'YT';
update public.countries set main_languages = ARRAY['es']::text[] where code = 'MX';
update public.countries set main_languages = ARRAY['en']::text[] where code = 'FM';
update public.countries set main_languages = ARRAY['ro']::text[] where code = 'MD';
update public.countries set main_languages = ARRAY['fr']::text[] where code = 'MC';
update public.countries set main_languages = ARRAY['mn']::text[] where code = 'MN';
update public.countries set main_languages = ARRAY['sr']::text[] where code = 'ME';
update public.countries set main_languages = ARRAY['en']::text[] where code = 'MS';
update public.countries set main_languages = ARRAY['ar']::text[] where code = 'MA';
update public.countries set main_languages = ARRAY['pt']::text[] where code = 'MZ';
update public.countries set main_languages = ARRAY['my']::text[] where code = 'BU';
update public.countries set main_languages = ARRAY['my']::text[] where code = 'MM';
update public.countries set main_languages = ARRAY['af']::text[] where code = 'NA';
update public.countries set main_languages = ARRAY['en']::text[] where code = 'NR';
update public.countries set main_languages = ARRAY['ne']::text[] where code = 'NP';
update public.countries set main_languages = ARRAY['nl']::text[] where code = 'NL';
update public.countries set main_languages = ARRAY['fr']::text[] where code = 'NC';
update public.countries set main_languages = ARRAY['en']::text[] where code = 'NZ';
update public.countries set main_languages = ARRAY['es']::text[] where code = 'NI';
update public.countries set main_languages = ARRAY['ha']::text[] where code = 'NE';
update public.countries set main_languages = ARRAY['en']::text[] where code = 'NG';
update public.countries set main_languages = ARRAY['en']::text[] where code = 'NU';
update public.countries set main_languages = ARRAY['en']::text[] where code = 'NF';
update public.countries set main_languages = ARRAY['ko']::text[] where code = 'KP';
update public.countries set main_languages = ARRAY['mk']::text[] where code = 'MK';
update public.countries set main_languages = ARRAY['en']::text[] where code = 'MP';
update public.countries set main_languages = ARRAY['nb']::text[] where code = 'NO';
update public.countries set main_languages = ARRAY['ar']::text[] where code = 'OM';
update public.countries set main_languages = ARRAY['en']::text[] where code = 'QO';
update public.countries set main_languages = ARRAY['ur']::text[] where code = 'PK';
update public.countries set main_languages = ARRAY['ar']::text[] where code = 'PS';
update public.countries set main_languages = ARRAY['es']::text[] where code = 'PA';
update public.countries set main_languages = ARRAY['gn']::text[] where code = 'PY';
update public.countries set main_languages = ARRAY['es']::text[] where code = 'PE';
update public.countries set main_languages = ARRAY['en']::text[] where code = 'PN';
update public.countries set main_languages = ARRAY['pl']::text[] where code = 'PL';
update public.countries set main_languages = ARRAY['pt']::text[] where code = 'PT';
update public.countries set main_languages = ARRAY['en']::text[] where code = 'XA';
update public.countries set main_languages = ARRAY['en']::text[] where code = 'XB';
update public.countries set main_languages = ARRAY['es']::text[] where code = 'PR';
update public.countries set main_languages = ARRAY['ar']::text[] where code = 'QA';
update public.countries set main_languages = ARRAY['fr']::text[] where code = 'RE';
update public.countries set main_languages = ARRAY['ro']::text[] where code = 'RO';
update public.countries set main_languages = ARRAY['ru']::text[] where code = 'RU';
update public.countries set main_languages = ARRAY['ru']::text[] where code = 'SU';
update public.countries set main_languages = ARRAY['rw']::text[] where code = 'RW';
update public.countries set main_languages = ARRAY['sm']::text[] where code = 'WS';
update public.countries set main_languages = ARRAY['it']::text[] where code = 'SM';
update public.countries set main_languages = ARRAY['pt']::text[] where code = 'ST';
update public.countries set main_languages = ARRAY['en']::text[] where code = 'CQ';
update public.countries set main_languages = ARRAY['ar']::text[] where code = 'SA';
update public.countries set main_languages = ARRAY['fr']::text[] where code = 'SN';
update public.countries set main_languages = ARRAY['sr']::text[] where code = 'CS';
update public.countries set main_languages = ARRAY['sr']::text[] where code = 'RS';
update public.countries set main_languages = ARRAY['sr']::text[] where code = 'YU';
update public.countries set main_languages = ARRAY['fr']::text[] where code = 'SC';
update public.countries set main_languages = ARRAY['en']::text[] where code = 'SG';
update public.countries set main_languages = ARRAY['en']::text[] where code = 'SX';
update public.countries set main_languages = ARRAY['sk']::text[] where code = 'SK';
update public.countries set main_languages = ARRAY['sl']::text[] where code = 'SI';
update public.countries set main_languages = ARRAY['en']::text[] where code = 'SB';
update public.countries set main_languages = ARRAY['so']::text[] where code = 'SO';
update public.countries set main_languages = ARRAY['en']::text[] where code = 'ZA';
update public.countries set main_languages = ARRAY['en']::text[] where code = 'GS';
update public.countries set main_languages = ARRAY['ko']::text[] where code = 'KR';
update public.countries set main_languages = ARRAY['ar']::text[] where code = 'SS';
update public.countries set main_languages = ARRAY['es']::text[] where code = 'ES';
update public.countries set main_languages = ARRAY['si']::text[] where code = 'LK';
update public.countries set main_languages = ARRAY['fr']::text[] where code = 'BL';
update public.countries set main_languages = ARRAY['en']::text[] where code = 'SH';
update public.countries set main_languages = ARRAY['en']::text[] where code = 'KN';
update public.countries set main_languages = ARRAY['en']::text[] where code = 'LC';
update public.countries set main_languages = ARRAY['fr']::text[] where code = 'MF';
update public.countries set main_languages = ARRAY['fr']::text[] where code = 'PM';
update public.countries set main_languages = ARRAY['en']::text[] where code = 'VC';
update public.countries set main_languages = ARRAY['ar']::text[] where code = 'SD';
update public.countries set main_languages = ARRAY['nl']::text[] where code = 'SR';
update public.countries set main_languages = ARRAY['nb']::text[] where code = 'SJ';
update public.countries set main_languages = ARRAY['sv']::text[] where code = 'SE';
update public.countries set main_languages = ARRAY['de']::text[] where code = 'CH';
update public.countries set main_languages = ARRAY['ar']::text[] where code = 'SY';
update public.countries set main_languages = ARRAY['zh']::text[] where code = 'TW';
update public.countries set main_languages = ARRAY['tg']::text[] where code = 'TJ';
update public.countries set main_languages = ARRAY['sw']::text[] where code = 'TZ';
update public.countries set main_languages = ARRAY['th']::text[] where code = 'TH';
update public.countries set main_languages = ARRAY['pt']::text[] where code = 'TL';
update public.countries set main_languages = ARRAY['pt']::text[] where code = 'TP';
update public.countries set main_languages = ARRAY['fr']::text[] where code = 'TG';
update public.countries set main_languages = ARRAY['to']::text[] where code = 'TO';
update public.countries set main_languages = ARRAY['en']::text[] where code = 'TT';
update public.countries set main_languages = ARRAY['en']::text[] where code = 'TA';
update public.countries set main_languages = ARRAY['ar']::text[] where code = 'TN';
update public.countries set main_languages = ARRAY['tr']::text[] where code = 'TR';
update public.countries set main_languages = ARRAY['tk']::text[] where code = 'TM';
update public.countries set main_languages = ARRAY['en']::text[] where code = 'TC';
update public.countries set main_languages = ARRAY['en']::text[] where code = 'UM';
update public.countries set main_languages = ARRAY['en']::text[] where code = 'VI';
update public.countries set main_languages = ARRAY['sw']::text[] where code = 'UG';
update public.countries set main_languages = ARRAY['uk']::text[] where code = 'UA';
update public.countries set main_languages = ARRAY['ar']::text[] where code = 'AE';
update public.countries set main_languages = ARRAY['en']::text[] where code = 'GB';
update public.countries set main_languages = ARRAY['en']::text[] where code = 'UK';
update public.countries set main_languages = ARRAY['en']::text[] where code = 'UN';
update public.countries set main_languages = ARRAY['en']::text[] where code = 'US';
update public.countries set main_languages = ARRAY['en']::text[] where code = 'ZZ';
update public.countries set main_languages = ARRAY['es']::text[] where code = 'UY';
update public.countries set main_languages = ARRAY['uz']::text[] where code = 'UZ';
update public.countries set main_languages = ARRAY['bi']::text[] where code = 'NH';
update public.countries set main_languages = ARRAY['bi']::text[] where code = 'VU';
update public.countries set main_languages = ARRAY['it']::text[] where code = 'VA';
update public.countries set main_languages = ARRAY['es']::text[] where code = 'VE';
update public.countries set main_languages = ARRAY['vi']::text[] where code = 'VD';
update public.countries set main_languages = ARRAY['vi']::text[] where code = 'VN';
update public.countries set main_languages = ARRAY['fr']::text[] where code = 'WF';
update public.countries set main_languages = ARRAY['ar']::text[] where code = 'EH';
update public.countries set main_languages = ARRAY['ar']::text[] where code = 'YD';
update public.countries set main_languages = ARRAY['ar']::text[] where code = 'YE';
update public.countries set main_languages = ARRAY['sn']::text[] where code = 'RH';
update public.countries set main_languages = ARRAY['sn']::text[] where code = 'ZW';

create index if not exists creations_published_language_idx
  on public.creations (language)
  where status = 'published' and audience = 'public' and is_removed = false;

update public.creations set language = lower(btrim(language)) where language is not null;
update public.creations c
set language = 'en'
where language is null
   or btrim(language) = ''
   or not exists (select 1 from public.languages l where l.code = lower(c.language));

alter table public.creations drop constraint if exists creations_language_fkey;
alter table public.creations
  add constraint creations_language_fkey
  foreign key (language) references public.languages (code);

alter table public.creations drop constraint if exists creations_language_code_check;
alter table public.creations
  add constraint creations_language_code_check check (language ~ '^[a-z]{2}$');

create or replace function public.smoke_plan_includes_index_scan(p_sql text)
returns boolean
language plpgsql
volatile
set search_path = public
as $$
declare
  v_line text;
  v_found boolean := false;
begin
  for v_line in execute 'explain (format text) ' || p_sql loop
    if v_line ilike '%Index Scan%' or v_line ilike '%Index Only Scan%' or v_line ilike '%Bitmap Index Scan%' then
      v_found := true;
      exit;
    end if;
  end loop;
  return v_found;
end;
$$;

revoke all on function public.smoke_plan_includes_index_scan(text) from public, anon;
grant execute on function public.smoke_plan_includes_index_scan(text) to authenticated;
