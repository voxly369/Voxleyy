# Voxly pre-beta launch checklist

Use this before opening a closed beta to real users. Legal placeholders in `src/config/organization.ts` must be replaced first.

## Legal and policy

- [ ] Counsel review of Terms, Privacy, Community Guidelines, and Copyright pages
- [ ] Replace organization placeholders (company name, DPO, postal address, governing law, minimum age)
- [ ] Bump `LEGAL_DOCUMENT_VERSIONS` and migrate consent records if text changed
- [ ] Confirm cookie/analytics disclosures match what the app actually loads

## Security and secrets

- [ ] No service-role keys in client bundle or public env vars
- [ ] RLS enabled on all user tables; founder RPCs gated by `is_founder`
- [ ] Client errors scrubbed before `report_client_error` (tokens, emails, query strings)
- [ ] Production build passes `npm run check:production` (no source maps, no e2e hooks)

## Beta access

- [ ] `get_beta_signup_config` reflects intended sign-up / invite-only / waitlist state
- [ ] Invite codes tested end-to-end (`redeem_invite_code` after sign-up)
- [ ] Waitlist flow tested when sign-ups closed (`join_beta_waitlist`)
- [ ] Founder beta tab flags documented for on-call

## Account lifecycle

- [ ] `export_my_data` returns expected JSON for a test account
- [ ] `delete_my_account` removes auth user and profile; session ends in UI
- [ ] Password reset and email confirmation flows tested on production domain

## Observability

- [ ] `/health` returns `{ "status": "ok" }` from static hosting
- [ ] `scripts/load-smoke.mjs` green against staging `BASE_URL`
- [ ] Error inbox (founder Errors tab) wired when RPC is ready
- [ ] Optional third-party error hook documented in `reportError.ts` if enabled

## Performance and limits

- [ ] Review `ops/LIMITS.md` against Supabase plan and CDN
- [ ] Rate limits on auth email sends verified
- [ ] Load test critical paths: feed, publish, reader, messages

## Deployment

- [ ] Migrations applied to production in order (`npm run check:migrations`)
- [ ] `npm run verify` green on release commit
- [ ] Rollback plan: previous static build + DB migration notes
- [ ] Status page or founder comms template for incidents
