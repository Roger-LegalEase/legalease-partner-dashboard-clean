# Route Map

This app keeps product implementation routes stable and uses host-based routing in `src/proxy.ts` for public product domains. Path-based URLs remain available during the transition.

> **Frontend ownership:** For per-surface frontend ownership (purpose, source files, design handoff,
> correct header, correct logo, required visible elements, and screenshot verification), see
> [`docs/FRONTEND_SOURCE_OF_TRUTH.md`](./FRONTEND_SOURCE_OF_TRUTH.md). This Route Map owns host/proxy
> and environment/URL routing; the Source of Truth owns what each surface must render. No frontend
> change is "done" without `npm run verify:frontend-surfaces` screenshots.

## Domain Ownership

| Public domain | Product owner | Public behavior | Internal route |
| --- | --- | --- | --- |
| `expungement.ai` | Expungement.ai consumer product | Consumer landing page | `/expungement-ai` |
| `www.expungement.ai` | Expungement.ai consumer product | Canonical redirect to `expungement.ai`, then consumer landing page | `/expungement-ai` |
| `expungement.ai/screening` | Expungement.ai consumer product | Consumer screening flow | `/expungement-ai/screening` |
| `www.expungement.ai/screening` | Expungement.ai consumer product | Canonical redirect to `expungement.ai/screening`, then consumer screening flow | `/expungement-ai/screening` |
| `expungement.ai/sign-in` | Expungement.ai consumer product | Consumer sign-in page | `/expungement-ai/sign-in` |
| `expungement.ai/briefcase` | Expungement.ai consumer product | Consumer briefcase route | `/briefcase` |
| `legalease.law` | LegalEase umbrella company / suite site | LegalEase suite landing page | `/legalease` via `/static/legalease/index.html` rewrite |
| `www.legalease.law` | LegalEase umbrella company / suite site | Canonical redirect to `legalease.law`, then LegalEase suite landing page | `/legalease` via `/static/legalease/index.html` rewrite |
| `legalease.com` | LegalEase umbrella company / suite site | LegalEase suite landing page | `/legalease` via `/static/legalease/index.html` rewrite |
| `www.legalease.com` | LegalEase umbrella company / suite site | Canonical redirect to `legalease.com`, then LegalEase suite landing page | `/legalease` via `/static/legalease/index.html` rewrite |
| `legaleasepartner.com` | LegalEase partner platform | Existing partner-facing production root | `/partners` |
| `www.legaleasepartner.com` | LegalEase partner platform | Canonical redirect to `legaleasepartner.com`, then partner-facing production root | `/partners` |

## Internal Route Ownership

| Internal route | Owner | Notes |
| --- | --- | --- |
| `/legalease` | LegalEase umbrella company / suite site | Preserved transition fallback on `legaleasepartner.com/legalease`. Exact route rewrites to `public/static/legalease/index.html`. |
| `/expungement-ai` | Expungement.ai consumer product | Preserved transition fallback on `legaleasepartner.com/expungement-ai`. |
| `/expungement-ai/screening` | Expungement.ai consumer product | Preserved transition fallback and clean-host target for `expungement.ai/screening`. |
| `/expungement-ai/sign-in` | Expungement.ai consumer product | Clean-host target for `expungement.ai/sign-in`. |
| `/briefcase` | Expungement.ai consumer product | Existing briefcase implementation route; clean-host route remains `/briefcase`. |
| `/partners` and `/partner/*` | LegalEase partner platform | Partner-facing platform and dashboard routes. |

## Proxy Behavior

`src/proxy.ts` runs host-based routing before auth refresh and internal admin protection.

- `www.*` public product hosts are redirected to their apex canonical hosts with `308`.
- `legaleasepartner.com/` rewrites to `/partners`; existing partner routes pass through.
- `expungement.ai/` rewrites to `/expungement-ai`.
- `expungement.ai/screening` and `expungement.ai/screening/*` rewrite to `/expungement-ai/screening` and `/expungement-ai/screening/*`.
- `expungement.ai/sign-in` rewrites to `/expungement-ai/sign-in`.
- `expungement.ai/briefcase` and `/briefcase/*` pass through to the existing briefcase routes.
- `legalease.law/` and `legalease.com/` rewrite to `/static/legalease/index.html`; LegalEase subpages rewrite to `/legalease/*`.
- Existing path-based fallback URLs such as `/expungement-ai`, `/expungement-ai/screening`, and `/legalease` remain available.

## Environment Variables

Production URL ownership is product-specific:

- `NEXT_PUBLIC_PARTNER_APP_URL=https://legaleasepartner.com`
- `NEXT_PUBLIC_EXPUNGEMENT_AI_URL=https://expungement.ai`
- `NEXT_PUBLIC_LEGALEASE_URL=https://legalease.law`

`NEXT_PUBLIC_APP_URL` is retained only as a legacy compatibility fallback for partner-domain behavior. Do not use it for new product-specific URLs, and do not let it control Expungement.ai consumer URLs.

Implemented ownership:

- Partner email links, invite redirects, password-reset redirects, partner landing URLs, onboarding URLs, dashboard URLs, and internal email preview URLs use `NEXT_PUBLIC_PARTNER_APP_URL`.
- Expungement.ai checkout success/cancel URLs, dry-run checkout URLs, screening resume links, and screening nudge opt-out links use `NEXT_PUBLIC_EXPUNGEMENT_AI_URL`.
- LegalEase umbrella metadata uses `NEXT_PUBLIC_LEGALEASE_URL`.

Existing env keys involved:

- `NEXT_PUBLIC_PARTNER_APP_URL`
- `NEXT_PUBLIC_EXPUNGEMENT_AI_URL`
- `NEXT_PUBLIC_LEGALEASE_URL`
- `NEXT_PUBLIC_APP_URL`
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `ENABLE_SUPABASE_PARTNER_DATA`
- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET`

## Supabase Auth Redirect URLs

Add these redirect URLs in Supabase Auth settings before public domain cutover:

- `https://legaleasepartner.com/auth/set-password`
- `https://www.legaleasepartner.com/auth/set-password`
- `https://legaleasepartner.com/partner/dashboard`
- `https://www.legaleasepartner.com/partner/dashboard`
- `https://expungement.ai/sign-in`
- `https://www.expungement.ai/sign-in`
- `https://expungement.ai/briefcase`
- `https://www.expungement.ai/briefcase`

Keep the internal path fallbacks during transition:

- `https://legaleasepartner.com/expungement-ai/sign-in`
- `https://www.legaleasepartner.com/expungement-ai/sign-in`
- `https://legaleasepartner.com/briefcase`
- `https://www.legaleasepartner.com/briefcase`

## Stripe URLs

Stripe webhook endpoint remains partner-app hosted unless deployment architecture changes:

- `https://legaleasepartner.com/api/stripe/webhook`
- `https://www.legaleasepartner.com/api/stripe/webhook`

Consumer checkout success/cancel URLs use `NEXT_PUBLIC_EXPUNGEMENT_AI_URL`:

- Success: `https://expungement.ai/packet-ready?briefcaseItemId=...&session_id={CHECKOUT_SESSION_ID}`
- Cancel: `https://expungement.ai/pay?briefcaseItemId=...`
- Dry-run success: `https://expungement.ai/packet-ready?briefcaseItemId=...&session_id=...&dry_run=1`

## Vercel Domain Setup

Add these domains to the same Vercel project after this proxy change is deployed:

- `expungement.ai`
- `www.expungement.ai`
- `legalease.law`
- `www.legalease.law`
- `legalease.com`
- `www.legalease.com`
- `legaleasepartner.com`
- `www.legaleasepartner.com`

Keep `legaleasepartner.com` as the partner platform production domain.

## DNS Records

Use Vercel's shown records for the project. Typical setup:

- Apex domains use Vercel apex `A` records.
- `www` domains use `CNAME` records to Vercel.

Configure DNS for:

- `expungement.ai`
- `www.expungement.ai`
- `legalease.law`
- `www.legalease.law`
- `legalease.com`
- `www.legalease.com`
- `legaleasepartner.com`
- `www.legaleasepartner.com`
