# VibeVerse AdSense Reporting Service

**Status:** Deployed, but locked until the eligible AdSense account holder and VibeVerse administrator complete setup. No revenue is fabricated.

Private admin page: https://vibeverse-adsense-reports-brightusiabulu0-1852.vercel.app

Google Cloud OAuth redirect URI, exact match:
`https://vibeverse-adsense-reports-brightusiabulu0-1852.vercel.app/api/oauth/callback`

## Vercel environment variables

Set these **in Vercel project `vibeverse-adsense-reports` → Settings → Environment Variables**, never in this public GitHub repo, and redeploy after changes.

Already configured as non-secret values:
- `GOOGLE_REDIRECT_URI` — exact callback above
- `SUPABASE_URL` — `https://qngkwjhhykugjfkwoyam.supabase.co`
- `ADSENSE_ACCOUNT_NAME` — `accounts/pub-3767027718493089`

Still required:
- `GOOGLE_CLIENT_ID` — OAuth web client ID from Google Auth Platform (non-secret)
- `GOOGLE_CLIENT_SECRET` — Google OAuth client secret (**sensitive**, never send through chat)
- `SUPABASE_ANON_KEY` — VibeVerse Supabase *publishable/anon* key, NOT service_role
- `SUPABASE_SERVICE_ROLE_KEY` — server-only Supabase service-role or compatible secret key (**sensitive**)
- `ADSENSE_ADMIN_UID` — exact Supabase Auth user UUID of the authorized VibeVerse administrator; no user metadata/username shortcuts
- `ADSENSE_ENCRYPTION_KEY` — random 32-byte AES key, encoded in base64 (**sensitive**). Generate using a trusted local cryptographic generator; rotate carefully because old encrypted tokens become unreadable.

Optional:
- `REQUIRE_AAL2=true` — require a verified two-factor authentication level on the admin session after MFA is configured.

## Supabase database

A table `public.adsense_connections` was created in **VibeVerse Production**, with RLS enabled, no public policies, and no access for anon or authenticated roles. A service-role backend can store one AES-256-GCM encrypted Google OAuth refresh token. Never write raw refresh tokens to logs, public pages, GitHub, or localStorage.

## Google Cloud settings

- Use your existing Google Cloud project with AdSense Management API enabled.
- OAuth Client → Web application → Authorized redirect URIs: add the **exact** address above.
- Google Auth Platform → Audience → if external app is in testing, add the eligible AdSense account holder as test user.
- Required OAuth scope: `https://www.googleapis.com/auth/adsense.readonly`.
- A service account does not work for this API.
- Refresh tokens in external **Testing** mode often expire in 7 days. Do not promise uninterrupted reporting before production authorization.

## APIs

- `GET /api/status` — deployment readiness, no sensitive data
- `GET /api/public` — public Supabase client config (only after supplied)
- `POST /api/oauth/start` — same-origin, authenticated VibeVerse admin; returns Google authorization URL and secure short-lived state cookie
- `GET /api/oauth/callback` — validates state, exchanges Google code, encrypts refresh token, stores privately
- `GET /api/earnings?period=today|yesterday|last7|month` — authenticated VibeVerse administrator only; reports Google estimated earnings, impressions and clicks

The admin page authenticates using the existing VibeVerse Supabase account. It will not show private reports until all backend configuration and the eligible account holder's Google consent are complete.

## Scope and checks

- Separate Vercel service; does not replace the live VibeVerse social application.
- No payments, refunds, payout operations, or AdSense configuration modifications.
- No fake metric values.
- Current smoke test: frontend HTTP 200; `/api/status` HTTP 200; unconfigured routes HTTP 503.
- After entering env settings, redeploy the reporting service, complete Google consent and test with a verified admin. Review API logs, confirm auth rejects a non-admin user and reports match the official AdSense dashboard.
