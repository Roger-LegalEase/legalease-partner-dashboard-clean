# Supabase Partner Setup

This guide helps a LegalEase operator create the Partner Journey OS Supabase database, load demo data, configure the app, and verify that server-side Supabase reads are available.

Supabase is optional for local development. If credentials are missing, the app continues to use the local seeded fallback.

## Safety Warning

Never paste `SUPABASE_SERVICE_ROLE_KEY` into browser code, public pages, screenshots, client components, or GitHub.

The service role key is server-only. It can read and write database records with elevated permissions and must stay in private environment variable settings only.

## 1. Create Or Open A Supabase Project

1. Sign in to Supabase.
2. Open the Supabase project for LegalEase Partner Journey OS, or create a new project.
3. Wait until the project is fully provisioned.
4. Keep the Supabase dashboard open.

## 2. Open SQL Editor

1. In the Supabase dashboard, open **SQL Editor**.
2. Create a new query.

## 3. Run The Schema File

1. Open `supabase/partner-journey-os.sql` from this repository.
2. Copy the full SQL file.
3. Paste it into the Supabase SQL Editor.
4. Run the query.
5. Confirm the query completes successfully.

This creates the Partner Journey OS tables, including:

- `partner_records`
- `partner_assets`
- `partner_metrics`
- `partner_events`

## 4. Run The Seed File

1. Open `supabase/partner-seed-demo.sql` from this repository.
2. Copy the full SQL file.
3. Paste it into a new Supabase SQL Editor query.
4. Run the query.
5. Confirm the query completes successfully.

The demo seed should add these partner slugs:

- `demo-partner`
- `we-must-vote`
- `fulton-county`

## 5. Find The Supabase Project URL

1. In Supabase, open **Project Settings**.
2. Open **API**.
3. Copy the project URL.
4. Save it as `NEXT_PUBLIC_SUPABASE_URL`.

This URL is not a secret, but it should still be managed through environment variables.

## 6. Find The Service Role Key

1. In Supabase, open **Project Settings**.
2. Open **API**.
3. Find the service role key.
4. Copy it only into private server environment variable settings.
5. Save it as `SUPABASE_SERVICE_ROLE_KEY`.

Do not place the service role key in client components, browser code, public pages, screenshots, or GitHub.

## 7. Add Env Vars Locally Or In Codespaces

Create or update `.env.local`:

```bash
NEXT_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
ENABLE_SUPABASE_PARTNER_DATA=true
```

Then restart the dev server:

```bash
npm run dev
```

If the dev server is already running, stop it and start it again so Next.js reads the new environment variables.

## 8. Add Env Vars In Production Hosting Later

When production hosting is ready, add the same variables in the hosting provider's private environment variable settings:

```bash
NEXT_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
ENABLE_SUPABASE_PARTNER_DATA=true
```

Only `NEXT_PUBLIC_SUPABASE_URL` is browser-safe. `SUPABASE_SERVICE_ROLE_KEY` must remain server-only.

## 9. Verify The App

Run local checks:

```bash
npm run partners:check-supabase-env
npm run partners:check-seed-sql
npm run partners:verify-supabase-readiness
npm run partners:verify-supabase-live-read
```

Open the internal diagnostic page:

```text
/internal/partners/data
```

Confirm:

- Repository mode says `supabase`.
- Supabase partner data enabled says `yes`.
- Supabase configured says `yes`.
- Partner count is greater than `0`.
- Seeded partners appear:
  - `demo-partner`
  - `we-must-vote`
  - `fulton-county`

## Expected Repository Modes

- `local_seeded`: `ENABLE_SUPABASE_PARTNER_DATA` is not `true`; the app uses local seeded data.
- `local_fallback`: Supabase partner data is enabled, but URL or service role key is missing; the app falls back safely.
- `supabase`: Supabase partner data is enabled and credentials are present; server-side reads use Supabase.

## Notes

- Stripe is still not connected.
- CRM integration is still not connected.
- Email sending is still not connected.
- Production auth is still not connected.
- The canonical co-branded partner route remains `/p/[partnerSlug]`.
