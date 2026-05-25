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
