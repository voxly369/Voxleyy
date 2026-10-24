# Daily quotes — owner double-check list

Generated seed: `supabase/seeds/daily_quotes_120.generated.sql` (120 active rows target: 1 `owner`, 27 `original` Voxly, 92 `public_domain`).

## Removed from rotation (legacy migration `20261108000003`)

These were deactivated in `20261108000004` as **not public domain** in the United States:

- Margaret Atwood — *A word after a word after a word is power.*
- Anaïs Nin — *We write to taste life twice, in the moment and in retrospect.*

## Please verify (attribution / wording / jurisdiction)

Short aphorisms are often misquoted. Before launch, spot-check:

| Author | Note |
|--------|------|
| **William Shakespeare** | Paraphrases vs folio wording; many lines are close summaries. |
| **Mark Twain** | Several popular lines are commonly misattributed to Twain in reference books. |
| **Oscar Wilde** | Same as Twain for aphorisms. |
| **Ralph Waldo Emerson / Henry David Thoreau** | Some lines circulate in edited form. |
| **Leonardo da Vinci / Michelangelo / Socrates / Aristotle** | English phrasing is modern translation, not a specific PD edition. |
| **Jaydin, Founder of Voxly** | Owner line — confirm wording and attribution label. |
| **Voxly** | Original platform copy — no external rights issue. |

## Regenerate

```bash
node scripts/generate-daily-quotes-seed.mjs
cp supabase/seeds/daily_quotes_120.generated.sql supabase/migrations/20261108000004_daily_quotes_seed_120.sql
# prepend migration header comment if replacing file
```
