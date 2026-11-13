# Supabase email templates

Branded templates for every account email Supabase sends. Paste each one into **Supabase → Authentication → Emails → Templates**: the subject line in "Subject", and the whole HTML file in "Message body".

| Template in Supabase | File | Subject line | When it's sent |
|---|---|---|---|
| Confirm signup | `confirm-signup.html` | `Confirm your email for Crawlvane` | Someone creates an account with a password, or signs in with a code for the first time |
| Magic Link | `magic-link.html` | `Your Crawlvane sign-in code` | Someone signs in with an email that already has an account |
| Invite user | `invite-user.html` | `You're invited to Crawlvane` | You invite someone from the Supabase dashboard (team invites from the app send their own email) |
| Change Email Address | `change-email.html` | `Confirm your new email address` | Someone changes their email in Settings |
| Reset Password | `reset-password.html` | `Reset your Crawlvane password` | Someone asks for a reset on the forgot password page |
| Reauthentication | `reauthentication.html` | `Confirm it's you` | Supabase asks the user to confirm a sensitive change |

## Things to know

- **Sign-in codes:** "Confirm signup" and "Magic Link" show both the 6-digit code (`{{ .Token }}`) and a one-click link. The sign-in and sign-up pages ask for the code, so the code must stay in these two.
- **Links work on any device:** "Confirm signup", "Magic Link" and "Reset Password" link to `{{ .SiteURL }}/auth/callback?token_hash={{ .TokenHash }}&type=…` rather than `{{ .ConfirmationURL }}`. Supabase's own link only works in the browser that asked for the email, so a reset requested on a laptop and opened on a phone would fail. Keep these links as they are. "Invite user" and "Change Email Address" still use `{{ .ConfirmationURL }}`.
- **Site URL:** set Authentication → URL Configuration → Site URL to the app address (for example `https://app.crawlvane.com`), because the links above start with it. Add `https://app.crawlvane.com/auth/callback` (and `http://localhost:3000/auth/callback` for testing) under Redirect URLs.
- **Code length:** Supabase sends 6 digits by default. The sign-in page accepts 6 to 10, so changing it in Supabase (Authentication → Providers → Email → OTP length) is fine.
- **Logo:** loaded from `https://crawlvane.com/brand/crawlvane-lockup.png`. It shows once the site is live; until then, emails show the alt text "Crawlvane".
- **Placeholders** Supabase fills in: `{{ .Token }}` (the code), `{{ .ConfirmationURL }}` (Supabase's link), `{{ .TokenHash }}` (the code behind our links), `{{ .SiteURL }}` (your Site URL setting), `{{ .Email }}` (the account email) and `{{ .NewEmail }}` (the new address, for email changes). Don't rename them.
- **Email-safe HTML:** tables and inline styles only, no web fonts or external stylesheets, because many email apps ignore them. Keep that if you edit.
- **Design:** matches the website and design system 2.0: the pale blue page background, the logo above a white card with rounded corners, a red section label with its short dash, a Figtree heading (Segoe UI or Arial where Figtree isn't installed), the code in a pale blue panel, the site's signature button (a centred Vane Blue pill with a white arrow in a Signal Red circle) and a navy footer like the website's, with the tagline and links.
- **Sending:** these only go out reliably once your own mail service is set under Authentication → Emails → SMTP (see `docs/app/ACCOUNTS-TO-CREATE.md`).
