# Voxleyy

## Environment variables

The app reads two public variables at build time:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

Copy `.env.example` to `.env.local` and set both for local development. These are the publishable project URL and the anon key. Do not put the service-role key, the database password, or a personal access token in any `VITE_` variable.

Render needs the same two names set in the service dashboard. `.env.local` stays on your machine and is not committed.

## Deploy to Render

1. Connect this repository to Render and apply the root `render.yaml` blueprint (static site service **voxly**).
2. Set **Build command** to `npm ci && npm run build` and **Publish directory** to `dist` if you configure manually instead of the blueprint.
3. Environment variables:
   - `VITE_SUPABASE_URL` — set to `https://ktgxdqplvggeyrnuqljx.supabase.co` (public; already in the blueprint).
   - `VITE_SUPABASE_ANON_KEY` — enter the project **anon / publishable** key in the Render dashboard only (`sync: false` in the blueprint). Never commit this value.
4. After the site URL is known, open Supabase **Authentication → URL configuration** and set:
   - **Site URL** — your Render URL (for example `https://voxly.onrender.com`).
   - **Redirect URLs** — include these paths on that origin (same host as the static site):
     - `/auth/callback` (email confirmation and OAuth return)
     - `/login` (session expiry notice)
     - `/reset-password` (password reset completion)
5. Pre-launch: `index.html` includes `<meta name="robots" content="noindex">` and `public/robots.txt` is permissive with a comment only. Remove the noindex meta when you launch for SEO.
6. **Credential hygiene:** Supabase management tokens, secret keys, and database passwords shared during development must be rotated before public launch.

## Known limits

- **For You** feed: switcher label only; ranked full-screen feed is not built yet.
- **@mention notifications**: mentions render as profile links when the username exists; notification rows are not created yet (no `mentions` table in the database).
- **Cover Studio** is not built yet.
- **Manuscript import** is not built yet.
- **Links inside body text** are not supported yet (rich text allows bold, italic, headings, and line breaks only).
- **Home right rail**: shows writers to follow and your recent drafts only; trending tags and search arrive with Discover. Tablets below 1024px use the bottom navigation bar (no sidebar).