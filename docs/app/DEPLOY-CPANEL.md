# Deploying to cPanel (crawlvane.com)

The app runs on cPanel's **Setup Node.js App** (Phusion Passenger). All data is saved in Supabase, so run `supabase/schema.sql` in the Supabase SQL Editor and set `SUPABASE_URL` and `SUPABASE_SECRET_KEY` before starting it.

## 0. Requirements

- A hosting plan that includes **"Setup Node.js App"** in cPanel. Most CloudLinux hosts do: Namecheap, A2, HostGator Business, InMotion and others. If you can't find it, ask your host to enable Node.js.
- **Node.js 20.18.1 or newer.** Pick the highest version offered (22 if available).
- About 300 MB of disk space.

## 1. Create the subdomain

In cPanel, go to **Domains → Create a new domain** (or **Subdomains**) and add `crawlvane.com`. Leave the document root as suggested, e.g. `/home/USER/crawlvane.com`.

## 2. Upload the app

1. Upload `seo-app-cpanel.zip` with **File Manager** to your home folder (`/home/USER/`). Don't put it inside `public_html`.
2. Extract it. You get `/home/USER/seo-app/`.
3. Inside `seo-app`, copy `.env.example` to `.env` and fill in at least:
   - `ANTHROPIC_API_KEY`: needed for the AI fix plan
   - `ADMIN_KEY`: a long random password, used to preview hidden features
   - `CRON_SECRET`: another random string, used by the hourly cron job
   - `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`: the newsletter, waitlist, quote and contact forms send submissions straight to Supabase. Use the public key only. They're read at build time, so set them before `npm run build`
   - `NEXT_PUBLIC_PLAUSIBLE_DOMAIN` (optional): turns on cookie-free analytics. It's read at build time, so set it before `npm run build`

## 3. Create the Node.js app

cPanel → **Setup Node.js App → Create Application**:

| Field | Value |
|---|---|
| Node.js version | 22.x (or the highest version, at least 20.18.1) |
| Application mode | Production |
| Application root | `seo-app` |
| Application URL | `crawlvane.com` |
| Application startup file | `app.js` |

Click **Create**, then **Restart**. Don't click "Run NPM Install": all dependencies are already bundled in the upload.

Open https://crawlvane.com and the audit page should load.

> If you see a Passenger error page, open **Setup Node.js App → your app → stderr.log**, or check `~/seo-app/stderr.log`. The most common cause is a Node version below 20.9.

## 4. HTTPS

Go to cPanel → **SSL/TLS Status** and run AutoSSL for `crawlvane.com`. Most hosts do this automatically for new subdomains.

## 5. Cron job (hourly)

cPanel → **Cron Jobs → Add new cron job**, set to *Once per hour*:

```
curl -s "https://crawlvane.com/api/cron?secret=YOUR_CRON_SECRET" > /dev/null 2>&1
```

This deletes reports older than 30 days. Once monitoring is enabled, it also runs the weekly re-audits.

## 6. Email for alerts (when you enable monitoring)

1. cPanel → **Email Accounts**: create `alerts@crawlvane.com`.
2. Open **Connect Devices** to see its SMTP server and port. Put them in `.env` as `SMTP_HOST`, `SMTP_PORT=465`, `SMTP_USER` and `SMTP_PASS`.
3. Set `FEATURE_MONITORING=1` and restart the app.

## 7. Turning on "Coming soon" features

Test a feature privately first by visiting `https://crawlvane.com/?admin=YOUR_ADMIN_KEY`. Every feature unlocks for you, and the feature list shows which settings each one still needs. To make a feature public, set it to `1` in `.env` and restart:

| Feature | Setting | Also needs |
|---|---|---|
| AI visibility test | `FEATURE_AI_VISIBILITY=1` | Any of `ANTHROPIC_API_KEY`, `OPENAI_API_KEY`, `PERPLEXITY_API_KEY`, `GEMINI_API_KEY` |
| Deep niche research | `FEATURE_DEEP_RESEARCH=1` | `ANTHROPIC_API_KEY` |
| AI social media posts | `FEATURE_SOCIAL_POSTS=1` | `ANTHROPIC_API_KEY` |
| Monitoring & alerts | `FEATURE_MONITORING=1` | `CRON_SECRET`, SMTP settings, cron job |
| JavaScript rendering | `FEATURE_JS_RENDER=1` | `BROWSERLESS_URL` |
| White-label reports | `FEATURE_WHITE_LABEL=1` | none |

To hide a live feature, set it to `0`, e.g. `FEATURE_COMPETITORS=0`.

## 8. Updating

1. On your computer, run `npm install`, then `npm run package:cpanel`. This creates `dist/seo-app-cpanel.zip`.
2. Upload and extract it over `~/seo-app`. Your `.env` is kept because the zip doesn't contain them.
3. **Setup Node.js App → Restart**.

## Shared hosting notes

- **Memory:** crawls use roughly 150–300 MB. If the host kills the process on large crawls, lower `MAX_PAGES_HARD` (e.g. 100) and `CRAWL_CONCURRENCY` (e.g. 2).
- **Idle shutdown:** Passenger stops idle apps, so the first visit after a quiet period takes 2–5 seconds.
- **Interrupted reports:** a running report lives in the process that started it. If the host restarts the app mid-report, that report shows a "please run again" message.
- **Outbound connections:** some hosts block outgoing HTTP from Node. If every audit fails with "Couldn't load", ask the host to allow outbound ports 80 and 443.
- **Building on the server:** don't run `next build` on shared hosting, because it often runs out of memory. Build locally and upload the zip.
