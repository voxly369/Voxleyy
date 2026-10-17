# Voxleyy

## Environment variables

The app reads two public variables at build time:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

Copy `.env.example` to `.env.local` and set both for local development. These are the publishable project URL and the anon key. Do not put the service-role key, the database password, or a personal access token in any `VITE_` variable.

Render needs the same two names set in the service dashboard. `.env.local` stays on your machine and is not committed.