# Supabase Auth email templates (Voxly)

Plain HTML suitable for Supabase **Authentication → Email templates**. Keep links absolute to production.

## Confirm sign up

**Subject:** Confirm your Voxly account

**Body:**

```html
<p>Welcome to Voxly — a calm place to write and be read.</p>
<p>Confirm your email to finish creating your account:</p>
<p><a href="{{ .ConfirmationURL }}">Confirm my email</a></p>
<p>If you did not request this, you can ignore this message.</p>
<p>— The Voxly team</p>
```

## Reset password

**Subject:** Reset your Voxly password

**Body:**

```html
<p>We received a request to reset your Voxly password.</p>
<p><a href="{{ .ConfirmationURL }}">Choose a new password</a></p>
<p>If you did not ask for this, you can safely ignore this email.</p>
<p>— The Voxly team</p>
```

## Change email

**Subject:** Confirm your new email on Voxly

**Body:**

```html
<p>Confirm this address for your Voxly account:</p>
<p><a href="{{ .ConfirmationURL }}">Confirm new email</a></p>
<p>— The Voxly team</p>
```

## Invite user (Auth dashboard invite)

**Subject:** You are invited to Voxly

**Body:**

```html
<p>You have been invited to join Voxly.</p>
<p><a href="{{ .ConfirmationURL }}">Accept invitation</a></p>
<p>— The Voxly team</p>
```

## Auth dashboard settings (owner)

| Setting | Value |
|--------|--------|
| Site URL | `https://voxleyyy.onrender.com` |
| Redirect URLs | `https://voxleyyy.onrender.com/auth/confirm`, `https://voxleyyy.onrender.com/auth/callback`, `https://voxleyyy.onrender.com/reset-password` |
| Confirm email | **On** |
| Minimum password length | **10** (match app rules) |
| SMTP | Brevo or Resend with SPF/DKIM for the sending domain |
| Rate limits | Use Supabase defaults; app adds invite-check and resend cooldowns |

**DNS:** Publish SPF and DKIM records from your SMTP provider before sending production mail.
