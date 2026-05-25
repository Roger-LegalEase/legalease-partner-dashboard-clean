This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

## Partner Journey OS Data Layer

The Partner Journey OS uses local seeded partner data by default so local development and `npm run build` do not require Supabase credentials.

- Local seeded data lives in `src/lib/partners/seed-partners.ts`.
- The Supabase-ready repository boundary lives in `src/lib/partners/partner-repository.ts`.
- The Supabase persistence schema lives in `supabase/partner-journey-os.sql`.
- Demo seed SQL can be exported with `npm run partners:export-seed-sql`.
- Repository fallback can be checked with `npm run partners:test-repository`.

Environment variables:

```bash
NEXT_PUBLIC_SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=
ENABLE_SUPABASE_PARTNER_DATA=false
```

`NEXT_PUBLIC_SUPABASE_URL` is safe for browser exposure. `SUPABASE_SERVICE_ROLE_KEY` is server-only and must never be exposed to client components. Set `ENABLE_SUPABASE_PARTNER_DATA=true` only when server-side Supabase reads should be attempted; otherwise the app stays on local seeded data.

## Partner Admin Activation Layer

Phase 7 added an internal LegalEase admin activation workflow for manually reviewing partner records before Stripe, CRM, email sending, full auth, and durable Supabase writes are enabled.

- Admin command center: `/internal/partners/admin`
- Partner admin detail: `/internal/partners/admin/[partnerSlug]`
- Mock action API: `/api/internal/partners/admin-action`
- Existing provisioning detail pages link to the admin activation detail route.
- The data diagnostic page links to both admin activation and provisioning views.

Admin actions validate action names, partner slugs, required asset keys, and required note text. Phase 8 routes supported actions through the Supabase Partner Write Layer, while Stripe payment source-of-truth behavior remains reserved for the future Stripe phase.

Test the mock action registry with:

```bash
npm run partners:test-admin-actions
```

## Supabase Partner Write Layer

Phase 8 makes internal admin actions write-ready through server-side partner repository functions.

- If Supabase partner data is disabled, admin actions return safe fallback responses with `persisted: false`.
- If Supabase partner data is enabled and configured, writes go through the server-side repository only.
- Payment complete records `demo_paid` until Stripe is added in a later phase.
- `SUPABASE_SERVICE_ROLE_KEY` must remain server-side and must never be exposed to browser code.
- Stripe, CRM integration, email sending, production auth, and RLS policy hardening remain later phases.

Test the write layer smoke checks with:

```bash
npm run partners:test-write-layer
```

## Phase 9: Supabase Setup + Seed Deployment

Phase 9 adds the operator-facing setup layer for creating the Partner Journey OS Supabase database, loading demo seed data, configuring environment variables, and verifying that the app can read from Supabase. It does not require live Supabase credentials for local checks, lint, or build.

What this phase adds:

- Non-developer Supabase setup guide and checklist.
- Local env diagnostics that never print secret values.
- Seed SQL validation for required Partner Journey OS demo records.
- Readiness verification for required files and expected repository mode.
- Optional live Supabase read verification when credentials are configured.
- Internal data page setup links and command references at `/internal/partners/data`.

Docs added:

- `docs/supabase-partner-setup.md`
- `docs/supabase-partner-setup-checklist.md`

Scripts added:

- `npm run partners:check-supabase-env`
- `npm run partners:check-seed-sql`
- `npm run partners:verify-supabase-readiness`
- `npm run partners:verify-supabase-live-read`

Required env vars for Supabase mode:

```bash
NEXT_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
ENABLE_SUPABASE_PARTNER_DATA=true
```

`SUPABASE_SERVICE_ROLE_KEY` is server-only. Never expose it in browser code, public pages, screenshots, client components, or GitHub.

Exact setup command list:

```bash
npm install
npm run partners:check-supabase-env
npm run partners:check-seed-sql
npm run partners:verify-supabase-readiness
npm run dev
```

After the Supabase project is created, run these SQL files in the Supabase SQL Editor:

```text
supabase/partner-journey-os.sql
supabase/partner-seed-demo.sql
```

Exact verification command list:

```bash
npm run partners:check-supabase-env
npm run partners:check-seed-sql
npm run partners:verify-supabase-readiness
npm run partners:verify-supabase-live-read
npm run partners:test-write-layer
npm run partners:test-admin-actions
npm run partners:test-repository
npm run partners:export-seed-sql
npm run lint
npm run build
```

Open `/internal/partners/data` and confirm the repository mode, Supabase configured status, data source label, partner count, and seeded partner slugs.

Stripe is still not connected. CRM integration, email sending, production auth, and RLS policy hardening remain later phases.

## Phase 10: Live Supabase Connection Verification

Phase 10 adds a read-only live verification layer for confirming that Partner Journey OS records are available from Supabase after the schema, seed data, and environment variables are configured.

- New route: `/internal/partners/supabase-check`
- New doc: `docs/supabase-live-verification.md`
- New script: `npm run partners:verify-supabase-required-partners`
- Expected live result: repository mode is `supabase`, partner count is at least `3`, and `demo-partner`, `we-must-vote`, and `fulton-county` are found.

Verification commands:

```bash
npm run partners:check-supabase-env
npm run partners:verify-supabase-readiness
npm run partners:verify-supabase-live-read
npm run partners:verify-supabase-required-partners
```

Do not commit real Supabase keys. Do not print the service role key in docs, code, screenshots, or public pages. `SUPABASE_SERVICE_ROLE_KEY` remains server-only.

Stripe is still not connected.
