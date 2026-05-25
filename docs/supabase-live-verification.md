# Supabase Live Verification

Use this checklist after the Supabase project exists and the Partner Journey OS schema and seed data are ready to verify.

## Safety Warning

Never paste `SUPABASE_SERVICE_ROLE_KEY` into browser code, public pages, screenshots, docs, or GitHub.

The service role key is server-only and must stay in private environment variable settings.

## Step 1: Run The Schema

Open Supabase SQL Editor and run:

```text
supabase/partner-journey-os.sql
```

## Step 2: Run The Seed Data

In the same Supabase project, run:

```text
supabase/partner-seed-demo.sql
```

## Step 3: Set Env Vars

Set these variables in local, Codespaces, or private production hosting settings:

```bash
NEXT_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
ENABLE_SUPABASE_PARTNER_DATA=true
```

Only the URL is browser-safe. The service role key is server-only.

## Step 4: Restart Dev Server

Restart the app so Next.js reads the updated environment variables:

```bash
npm run dev
```

## Step 5: Run Verification Commands

Run:

```bash
npm run partners:check-supabase-env
npm run partners:verify-supabase-readiness
npm run partners:verify-supabase-live-read
npm run partners:verify-supabase-required-partners
```

## Step 6: Open The Internal Check Page

Open:

```text
/internal/partners/supabase-check
```

Expected result:

- Repository mode: `supabase`
- Partner count: at least `3`
- Required seeded partners found:
  - `demo-partner`
  - `we-must-vote`
  - `fulton-county`

## Troubleshooting

- Repository mode says `local_seeded`: confirm `ENABLE_SUPABASE_PARTNER_DATA=true`, then restart the dev server.
- Repository mode says `local_fallback`: confirm both `NEXT_PUBLIC_SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are configured in the current runtime environment.
- Supabase configured says `no`: confirm the project URL and service role key were added to private environment settings.
- Partner count is `0`: confirm the schema SQL and seed SQL were both run in the same Supabase project.
- Missing seeded partners: run `supabase/partner-seed-demo.sql` again or inspect `partner_records` in Supabase.
- Live read script fails: confirm the service role key is valid, the project URL is correct, and the `partner_records` table exists.
- Build passes but app still reads local data: restart the dev server after setting env vars and confirm `ENABLE_SUPABASE_PARTNER_DATA=true`.

## Notes

- Stripe is still not connected.
- CRM integration is still not connected.
- Email automation is still not connected.
- Production auth is still not connected.
