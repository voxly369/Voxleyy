# Voxleyy

## Environment variables

The app reads two public variables at build time:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

Copy `.env.example` to `.env.local` and set both for local development. These are the publishable project URL and the anon key. Do not put the service-role key, the database password, or a personal access token in any `VITE_` variable.

Render needs the same two names set in the service dashboard. `.env.local` stays on your machine and is not committed.

## Known limits

- **For You** feed: switcher label only; ranked full-screen feed is not built yet.
- **@mention notifications**: mentions render as profile links when the username exists; notification rows are not created yet (no `mentions` table in the database).
- **Cover Studio** is not built yet.
- **Manuscript import** is not built yet.
- **Links inside body text** are not supported yet (rich text allows bold, italic, headings, and line breaks only).
- **Home right rail**: shows writers to follow and your recent drafts only; trending tags and search arrive with Discover. Tablets below 1024px use the bottom navigation bar (no sidebar).