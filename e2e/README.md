# Voxly layout e2e checks

These tests use Playwright (Chromium) against `vite preview`. They do not call the real Supabase project.

## Run

```bash
npm run test:e2e
```

Requires a built app (`npm run build` runs automatically via the Playwright `webServer` config).

## Mocking

`e2e/fixtures.ts` registers `page.route` handlers for Supabase auth, REST, and storage URLs. A fake session is written to `localStorage` before navigation so protected routes render without credentials.

Feed data is synthetic (10 posts including long title, long unbroken word, quote card, and long body excerpt). Screenshots are written to `e2e/screenshots/` (gitignored).

## What is checked

For each viewport width and light/dark scheme, tests visit core screens and assert: no horizontal document scroll, nav visibility (bottom bar below 1024px, sidebar at 1024px+), right rail only on Home/Following at 1280px+, minimum touch targets, reading line length, and non-broken images.
