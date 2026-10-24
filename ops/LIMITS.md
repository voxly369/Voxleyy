# Voxly platform limits (draft)

Document enforced limits for beta ops. Adjust when product or infrastructure changes.

## Authentication

| Limit | Value | Notes |
| --- | --- | --- |
| Password minimum length | 10 | Enforced in client schema; mirror in auth policy |
| Login failure cooldown (client) | 5 failures → 30s | UI-only; server rate limits still apply |
| Email send rate limit | Supabase defaults | Surfaces as `over_email_send_rate_limit` |

## Content

| Limit | Value | Notes |
| --- | --- | --- |
| Username | 3–30 chars `[a-z0-9_]` | Reserved list in app |
| Report details | 500 chars | `reportSchema` |
| Draft autosave | Existing editor limits | See creation editor docs |

## Beta

| Limit | Value | Notes |
| --- | --- | --- |
| Invite codes | One-time redeem | Invalid/expired codes rejected at RPC |
| Waitlist | Email only when sign-ups closed | No account created until invite |
| Platform flags | Founder-only RPC | `founder_set_platform_flag` |

## Client error reports

| Limit | Value | Notes |
| --- | --- | --- |
| Payload scrubbing | Required | No tokens, emails, or secrets in `report_client_error` |
| Third-party forwarding | Off by default | `reportErrorToThirdParty` is a no-op until wired |

## Data export and deletion

| Limit | Value | Notes |
| --- | --- | --- |
| Export format | JSON via `export_my_data` | User-initiated from Settings |
| Account deletion | Irreversible | Requires typing username in modal |

## Infrastructure smoke

| Check | Command | Notes |
| --- | --- | --- |
| Health | `GET /health` | Static JSON `{ "status": "ok" }` |
| Load smoke | `BASE_URL=… node scripts/load-smoke.mjs` | Refuses production DB URL without override |

## E2E and production bundle

Production `dist/` must not contain `.map` files, `sourceMappingURL` references, or e2e mock markers (`npm run check:production`).
