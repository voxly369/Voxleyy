# 18B query plans (live pooler, rolled-back EXPLAIN)

Captured against production Postgres via the session pooler in a `BEGIN` / `ROLLBACK` transaction (no durable changes). Index detection matches `public.smoke_plan_includes_index_scan` (Index Scan, Index Only Scan, or Bitmap Index Scan anywhere in the plan).

## Country and language queries

| Query | Top plan shape | Uses index? | Smoke assertion |
| --- | --- | --- | --- |
| Country trending (`discover_trending_creations` ⋈ `profiles`, `country = 'ZA'`) | `Limit` → nested loops; `creations_author_country_published_idx`, `profiles_pkey`, `creations_pkey`, `ranking_settings_pkey` | Yes | `country trending plan uses index` |
| Published creations by language (`language = 'en'`) | `Limit` → `Index Scan` on `creations_published_language_idx` | Yes | `language filter plan uses index` |
| Country metadata lookup (`countries.code = 'ZA'`) | `Index Only Scan` on `countries_pkey` | Yes | `get_country_page countries lookup uses index` |
| Active writers in country (`profiles`, `country` + `status`) | `Aggregate` → `Index Only Scan` on `profiles_country_active_idx` | Yes | `country active writers count uses index` |
| Public posts by country (creations ⋈ profiles) | `Aggregate` → nested loop; `creations_author_country_published_idx`, `profiles_pkey` | Yes | `country public post count uses index` |
| Rising writers in country (`discover_rising_writers` ⋈ profiles) | `Limit` → nested loops; includes `Seq Scan on profiles` subquery but also multiple index scans (`follows_followee_idx`, `creations_published_language_idx`, `profiles_pkey`) | Yes (helper finds index scan) | `country rising writers plan uses index` |
| Search / feed posts with language (`feed_creations` ⋈ `creations`, `language = 'en'`) | `Limit` → nested loops; `creations_author_country_published_idx`, `profiles_pkey`, `creations_pkey` with filter on `language` | Yes | `search posts language filter plan uses index` |
| Discover trending with language (`discover_trending_creations`, `language = 'en'`) | `Limit` → nested loops; `creations_author_country_published_idx` with `language` filter | Yes | `discover trending language filter plan uses index` |

## Full-text search (`simple` config on `search_tsv`)

Smoke inserts run as the postgres role inside the rolled-back RLS smoke transaction (before switching to `authenticated` for plan checks).

| Script | `plainto_tsquery('simple', …)` | Matches in smoke? |
| --- | --- | --- |
| Arabic (`مرحبا`) | Yes | `hits=1` — **matches** |
| Hindi (`नमस्ते`) | Yes | `hits=1` — **matches** |
| Japanese (`こんにちは`) | Yes | `hits=1` — **matches** |
| Cyrillic (`Привет`) | Yes | `hits=1` — **matches** |
| Chinese (`你好`) | No | `hits=0` — **does not match** |

**Honest limit:** Voxly indexes `search_tsv` with the `simple` text search configuration. Tokenization is byte-oriented; Arabic, Hindi, Japanese kana, and Cyrillic samples tokenize enough for `plainto_tsquery('simple', …)` to match in smoke. **Simplified Chinese han characters in isolation are not indexed as searchable tokens under `simple`**, so Chinese queries like `你好` return zero hits unless users search Latin transliteration or we add a CJK-aware configuration (out of scope for 18B hardening).

## Home / Following feed language filter (item 7)

**Out of scope.** SPEC §9 lists language under **Discover** filters only: “Filters: genre, mood, language, country, trending, new.” Home / For You / Following (§122–128) do not require a URL language filter; no home-feed smoke assertion was added.
