# Voxly launch checklist (ops)

## Pending file cleanups after account deletion

When a member deletes their account, Voxly records storage object paths in `deletion_storage_queue`. Rows are **not** removed from Supabase Storage automatically in the current beta build.

Before public launch (or on a regular cadence during private beta):

1. Open the Founder dashboard **Beta** tab and note **Pending file cleanups**.
2. Download the CSV of `bucket_id` and `object_path` values.
3. In the Supabase project **Storage** dashboard, delete those objects (or run an Edge Function with the service role to batch-delete queued paths and mark `done_at`).

Update member-facing Privacy copy if automation is not yet live — exports and account deletion proceed immediately; file blobs may remain until manual or automated cleanup runs.

## Auth and email (Supabase dashboard)

- [ ] Site URL `https://voxleyyy.onrender.com`
- [ ] Redirect URLs include `/auth/confirm`, `/auth/callback`, `/reset-password`
- [ ] Confirm email enabled
- [ ] Minimum password length 10
- [ ] SMTP (Brevo or Resend) with SPF/DKIM
- [ ] Paste templates from `ops/EMAIL-TEMPLATES.md`
