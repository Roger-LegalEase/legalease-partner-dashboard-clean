# Supabase Partner Setup Checklist

## Before You Start

- [ ] Supabase project exists and is fully provisioned.
- [ ] Repository is available locally or in Codespaces.
- [ ] `supabase/partner-journey-os.sql` exists.
- [ ] `supabase/partner-seed-demo.sql` exists.
- [ ] `.env.example` exists.

## Run Schema

- [ ] Open Supabase SQL Editor.
- [ ] Copy `supabase/partner-journey-os.sql`.
- [ ] Run the schema SQL.
- [ ] Confirm no SQL errors.

## Run Seed Data

- [ ] Copy `supabase/partner-seed-demo.sql`.
- [ ] Run the seed SQL.
- [ ] Confirm no SQL errors.
- [ ] Confirm seed partners are expected:
  - [ ] `demo-partner`
  - [ ] `we-must-vote`
  - [ ] `fulton-county`

## Configure Env Vars

- [ ] Add `NEXT_PUBLIC_SUPABASE_URL`.
- [ ] Add `SUPABASE_SERVICE_ROLE_KEY`.
- [ ] Add `ENABLE_SUPABASE_PARTNER_DATA=true`.
- [ ] Confirm `SUPABASE_SERVICE_ROLE_KEY` is stored only in private server env settings.
- [ ] Restart the dev server.

## Verify App

- [ ] Run `npm run partners:check-supabase-env`.
- [ ] Run `npm run partners:check-seed-sql`.
- [ ] Run `npm run partners:verify-supabase-readiness`.
- [ ] Run `npm run partners:verify-supabase-live-read`.
- [ ] Visit `/internal/partners/data`.
- [ ] Confirm repository mode says `supabase`.
- [ ] Confirm Supabase configured says `yes`.
- [ ] Confirm partner count is greater than `0`.
- [ ] Confirm seeded partners appear.

## Troubleshooting

- [ ] Repository mode still says `local_seeded`: confirm `ENABLE_SUPABASE_PARTNER_DATA=true`, then restart the dev server.
- [ ] Repository mode says `local_fallback`: confirm both `NEXT_PUBLIC_SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are present.
- [ ] Supabase configured says `no`: confirm the URL and service role key are set in the current runtime environment.
- [ ] Partner count is `0`: confirm the schema SQL and seed SQL both ran successfully in the same Supabase project.
- [ ] Admin action returns `persisted: false`: confirm repository mode is `supabase`; fallback modes do not persist writes.
- [ ] Build should pass without Supabase env vars: unset Supabase env vars and run `npm run build`.
