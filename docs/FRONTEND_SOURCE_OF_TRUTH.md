# Frontend Source of Truth

This document is the authoritative ownership map for the user-facing frontend surfaces inside this
single Next.js app. It exists because multiple distinct products live in one codebase and have been
repeatedly confused, producing pages that compile but visually regress (wrong header, wrong logo,
missing content, wrong domain/env).

If you are about to edit a frontend surface, find its row here first. Do not edit a surface using
another surface's files, header, or logo. When in doubt, stop and check this document and
[`docs/ROUTE_MAP.md`](./ROUTE_MAP.md) (host/proxy + env ownership).

Hard rule: **no frontend change is "done" without screenshot verification.** Run
`npm run verify:frontend-surfaces` and review the screenshots under `artifacts/frontend-surfaces/`.

---

## Surface index

| Surface | Internal route | Canonical domain | Rendering | Header type |
| --- | --- | --- | --- | --- |
| LegalEase umbrella/suite | `/legalease` | `legalease.law` / `legalease.com` | Static HTML rewrite | Suite marketing header (self-contained in HTML) |
| Expungement.ai landing | `/expungement-ai` | `expungement.ai` | Server-injected handoff HTML | Consumer marketing nav (handoff HTML's own nav) |
| Expungement.ai screening | `/expungement-ai/screening` | `expungement.ai/screening` | React (`ConsumerPageShell` app header) | App-style screening header |
| Expungement.ai sign-in | `/expungement-ai/sign-in` | `expungement.ai/sign-in` | React (`ConsumerPageShell` app header) | App-style header |
| Expungement.ai Briefcase | `/briefcase` | `expungement.ai/briefcase` | React (existing briefcase) | Briefcase app header (existing) |
| Partner platform | `/partners` | `legaleasepartner.com` | React (partner dashboard) | Partner platform header — DO NOT TOUCH in frontend-stabilization work |
| We Must Vote partner page | `/p/we-must-vote` | (partner domain) | Static HTML rewrite | Partner landing — DO NOT TOUCH |

---

## /legalease — LegalEase umbrella company / suite site

- **Public purpose:** LegalEase parent-company / product-suite marketing site. Presents the whole
  product family (Expungement.ai, RCAP, Record Shield, StartApart, ClaimCoach, The Fresh Start
  Network) and routes visitors into each one.
- **Canonical public domain:** `https://legalease.law` (also `legalease.com`). `www.*` → 308 → apex.
- **Fallback/transition URL:** `https://legaleasepartner.com/legalease` and direct `/legalease`.
- **Internal route:** `/legalease` (exact path).
- **Rendering mechanism:** `src/proxy.ts` rewrites the exact `/legalease` path (and the apex
  `legalease.law` / `legalease.com` host root) to the static file
  `public/static/legalease/index.html`. The React route `src/app/legalease/page.tsx` exists for
  subpages and as a transition fallback but is **bypassed for the exact `/legalease` landing** —
  the served landing is the static HTML.
- **Source files:**
  - `public/static/legalease/index.html` (the actually-served landing — edit this for landing content)
  - `src/app/legalease/*` (subpages: contact, waitlist, terms, disclaimer + nav/footer)
  - `src/lib/legalease/products.ts` (canonical suite product list — keep in sync with the static landing)
- **Design handoff source:** `design-handoff/legalease-suite-page/latest/legalease-handoff/handoff/`
  (`HANDOFF.md`, `DESIGN-TOKENS.md`, `pages/`, `assets/brand/`).
- **Allowed files to edit:** `public/static/legalease/index.html`, `src/app/legalease/**`,
  `src/lib/legalease/products.ts`, `public/legalease/**` assets.
- **Must NOT be confused with:** `/expungement-ai` (that is one product, not the suite),
  `/partners` (partner platform), `legaleasepartner.com` (partner domain).
- **Correct header:** the suite marketing header baked into the static HTML. Do not graft the
  Expungement.ai consumer nav onto it.
- **Correct logo:** LegalEase wordmark (`public/legalease/logos/legalease-wordmark.png`,
  `public/legalease/brand/og-card.png`); inline brand assets in the static HTML.
- **Required visible elements:** real suite content (NOT a blank app shell); the names
  **Expungement.ai, RCAP, Record Shield, StartApart, ClaimCoach, The Fresh Start Network**;
  product cards/links; trust + partners sections; footer.
- **Verification:** `npm run legalease:verify-umbrella-site` (structural) **and**
  `npm run verify:frontend-surfaces` (visual desktop screenshot + brand-string assertions).

## /expungement-ai — Expungement.ai consumer landing

- **Public purpose:** Consumer landing for the $50 self-help record-clearing product. Markets the
  product, explains how it works, and pushes visitors into the free screening.
- **Canonical public domain:** `https://expungement.ai`. `www.expungement.ai` → 308 → apex.
- **Fallback/transition URL:** `https://legaleasepartner.com/expungement-ai` and direct `/expungement-ai`.
- **Internal route:** `/expungement-ai`.
- **Rendering mechanism:** React server component `src/app/expungement-ai/page.tsx` →
  `ExpungementLandingHandoff`, which reads the design-handoff HTML, **strips its `<script>` tags**,
  rewrites asset/href paths, injects the markup via `dangerouslySetInnerHTML`, and mounts
  `ExpungementLandingInteractions` (nav toggle, smooth scroll, static Wilma panel). Because the
  handoff scroll-reveal JS is stripped, a `noScriptRevealFallback` `<style>` block forces the
  "How it works" steps/connector visible. **Core content must never depend on animation JS.**
- **Source files:**
  - `src/app/expungement-ai/page.tsx`
  - `src/app/expungement-ai/ExpungementLandingHandoff.tsx` (loader + reveal fallback)
  - `src/app/expungement-ai/ExpungementLandingInteractions.tsx` (progressive enhancement)
  - `src/app/expungement-ai/layout.tsx` (metadata, uses `getExpungementAiBaseUrl()`)
- **Design handoff source:**
  `design-handoff/expungement-ai-frontend/files-6/Expungement-Landing-Full.html` (+ `hero-*` images).
- **Allowed files to edit:** the four source files above, `public/expungement-ai/**` assets, and the
  handoff HTML (the handoff file is the content source of truth for the landing).
- **Must NOT be confused with:** `/expungement-ai/screening` (the flow, different header),
  `/legalease` (the suite), `/partners`.
- **Correct header:** the handoff HTML's own polished marketing nav — SVG sunrise logomark +
  "Expungement.ai" wordmark, links: How it works / Pricing / Why trust us / FAQ, Log in, Start free.
  Allowed marketing nav items: How it works, Pricing, Support/FAQ, Sign in, Start free.
  "Start free" → `/expungement-ai/start` → screening. "Sign in/Log in" → `/expungement-ai/sign-in`.
- **Correct logo:** the inline SVG sunrise-arch logomark + "Expungement.ai" wordmark in the handoff
  HTML. The reusable React equivalent is `src/components/expungement-ai/ExpungementWordmark.tsx`.
  Never a bare plain-text "Expungement.ai" fallback.
- **Required visible elements:** logo/header; aligned marketing nav; hero with "Start free" CTA and
  "Sign in"; **"How it works" with all three numbered step cards visible** (no lone gray line, no
  giant blank gap); Pricing section; FAQ/trust; footer. Mobile menu opens/closes.
- **Verification:** `npm run verify:frontend-surfaces` (desktop + mobile screenshots, asserts the
  three step cards, nav, Start free, Sign in, Pricing, no broken hero image).

## /expungement-ai/screening — Expungement.ai consumer screening flow

- **Public purpose:** The free, no-account screening. State picker → per-state question flow →
  plain-language result. This is an **app surface inside the product flow**, not a marketing page.
- **Canonical public domain:** `https://expungement.ai/screening` (and `/screening/*`).
- **Fallback/transition URL:** `https://legaleasepartner.com/expungement-ai/screening` and direct route.
- **Internal route:** `/expungement-ai/screening`, `/expungement-ai/screening/[state]`,
  `/expungement-ai/screening/resume`.
- **Rendering mechanism:** React. `ConsumerPageShell` (with `headerVariant="app"`) wraps
  `StatePicker` / `ScreeningFlow`. The per-state route disables the shell's global Wilma bubble and
  renders a single phase-aware Wilma surface inside the flow.
- **Source files:**
  - `src/app/expungement-ai/screening/page.tsx`, `screening/[state]/page.tsx`, `screening/resume/page.tsx`
  - `src/components/expungement-ai/ConsumerPageShell.tsx`
  - `src/components/expungement-ai/ConsumerNav.tsx` (`variant="app"`)
  - `src/components/expungement-ai/ExpungementWordmark.tsx`
  - `src/components/expungement-ai/screening/*` (StatePicker, ScreeningFlow, QuestionField, …)
  - `src/components/expungement-ai/WilmaBubble.tsx`
- **Design handoff source:**
  `design-handoff/expungement-ai-frontend/files-6/Expungement-Flow-Prototype.html` and the Wilma
  specs in the same folder.
- **Allowed files to edit:** the screening route/components above, `ConsumerPageShell`,
  `ConsumerNav` (app variant), `ExpungementWordmark`, `WilmaBubble`.
- **Must NOT be confused with:** `/expungement-ai` landing (marketing nav is correct THERE, wrong
  here). Do not show the marketing nav or a "Start free" CTA inside the flow.
- **Correct header:** **app-style screening header** (`ConsumerNav variant="app"`): clean light bar,
  polished logo linking to `/expungement-ai`, plus only Briefcase + Sign in. **No** marketing nav,
  **no** "Start free", **no** How it works / Pricing links. The fixed header must not cover the
  screening card (inner content uses top padding, e.g. `pt-28`) and must not collide with the Wilma
  bubble (Wilma is bottom-right, `z-50`; header is top, `z-40`).
- **Correct logo:** `ExpungementWordmark` `tone="dark"` (navy mark on the light app bar). Never
  plain-text fallback.
- **Required visible elements:** app header with logo; screening card; progress bar; question text;
  answer choices; Wilma bubble. No marketing nav, no "Start free", no giant blank section.
- **Verification:** `npm run verify:frontend-surfaces` (desktop + mobile screenshots; asserts logo,
  app header, screening card, progress bar, question + answers, Wilma bubble, and the ABSENCE of
  "Start free" / "How it works" / "Pricing").

## /expungement-ai/sign-in — Expungement.ai sign-in

- **Public purpose:** Consumer sign-in entry point; reuses the existing auth entry without changing
  partner auth/RLS/session logic.
- **Canonical public domain:** `https://expungement.ai/sign-in`.
- **Fallback/transition URL:** `https://legaleasepartner.com/expungement-ai/sign-in` and direct route.
- **Internal route:** `/expungement-ai/sign-in` (continues to `/sign-in?next=/briefcase`).
- **Rendering mechanism:** React, `ConsumerPageShell` with `headerVariant="app"`.
- **Source files:** `src/app/expungement-ai/sign-in/page.tsx`, `ConsumerPageShell`, `ConsumerNav`.
- **Allowed files to edit:** the sign-in page + shared shell/nav.
- **Must NOT be confused with:** partner `/sign-in` auth UI or partner dashboard auth. Do not modify
  Supabase auth/session/RLS here.
- **Correct header:** app-style header (no marketing nav, no Start free).
- **Correct logo:** `ExpungementWordmark` `tone="dark"`.
- **Required visible elements:** app header + sign-in card + continue action.
- **Verification:** covered indirectly by `verify:frontend-surfaces` header checks; structural by
  `npm run expungement:verify-production-readiness`.

## Expungement.ai Briefcase — consumer saved results / packets

- **Public purpose:** Consumer's private area for saved screening results, guidance, packet status,
  receipts, and next steps.
- **Canonical public domain:** `https://expungement.ai/briefcase`.
- **Fallback/transition URL:** `https://legaleasepartner.com/briefcase` and direct `/briefcase`.
- **Internal route:** `/briefcase` (and `/briefcase/*`). The proxy passes `expungement.ai/briefcase`
  straight through to the existing `/briefcase` implementation; it is an auth-session path.
- **Rendering mechanism:** React (existing briefcase implementation).
- **Source files:** `src/app/briefcase/**`, `src/lib/expungement-ai/briefcase.ts`.
- **Allowed files to edit:** briefcase route + briefcase lib (out of scope for frontend
  stabilization unless explicitly tasked).
- **Must NOT be confused with:** partner dashboard. Briefcase is a consumer surface.
- **Correct header:** existing briefcase header (app/consumer). Keep its own header; do not graft
  the marketing nav.
- **Correct logo:** Expungement.ai branded logo.
- **Required visible elements:** saved matters / packet area for the signed-in consumer.
- **Verification:** existing briefcase/consumer verifiers; not screenshot-gated here (auth-gated).

## /partners — LegalEase partner platform (DO NOT TOUCH in this work)

- **Public purpose:** Partner-facing platform and dashboard (clinics, legal aid, reentry, RCAP).
- **Canonical public domain:** `https://legaleasepartner.com` (root → `/partners`).
- **Fallback/transition URL:** direct `/partners`, `/partner/*`.
- **Internal route:** `/partners`, `/partner/*`.
- **Rendering mechanism:** React partner dashboard.
- **Source files:** `src/app/partners/**`, `src/app/partner/**`.
- **Allowed files to edit:** **none** during frontend stabilization — partner UI is explicitly out
  of scope.
- **Must NOT be confused with:** any Expungement.ai consumer surface or `/legalease`. Consumer
  checkout URLs and consumer env vars must never point at the partner app (see ROUTE_MAP env rules).
- **Correct header:** partner platform header (existing). Do not change.
- **Correct logo:** LegalEase partner branding.
- **Required visible elements:** N/A for this work.
- **Verification:** `npm run partners:verify-launch-readiness` (has two known unrelated pre-existing
  failures: internal route marker + RCAP intake disclaimer — do not chase those here).

## /p/we-must-vote — We Must Vote partner page (DO NOT TOUCH)

- **Public purpose:** We Must Vote partner landing page.
- **Internal route:** `/p/we-must-vote` (proxy rewrites to `public/wemustvote-landing.html`).
- **Rendering mechanism:** static HTML rewrite via `src/proxy.ts`.
- **Source files:** `public/wemustvote-landing.html`.
- **Allowed files to edit:** **none** during frontend stabilization.
- **Must NOT be confused with:** Expungement.ai or LegalEase surfaces.
- **Verification:** `npm run partners:verify-we-must-vote-launch`.

---

## Environment / URL ownership (summary — full detail in ROUTE_MAP.md)

- `NEXT_PUBLIC_EXPUNGEMENT_AI_URL=https://expungement.ai` — owns all Expungement.ai consumer URLs,
  including Stripe checkout success/cancel URLs (via `absoluteExpungementAiUrl`).
- `NEXT_PUBLIC_PARTNER_APP_URL=https://legaleasepartner.com` — owns partner URLs and the Stripe
  webhook endpoint host.
- `NEXT_PUBLIC_LEGALEASE_URL=https://legalease.law` — owns LegalEase umbrella metadata.
- `NEXT_PUBLIC_APP_URL` — legacy fallback only; must NOT control Expungement.ai consumer URLs.

## Stripe checkout URL behavior (consumer)

- Source: `src/lib/expungement-ai/payment-adapter.ts` → `createConsumerPacketCheckout`.
- Success URL: `${NEXT_PUBLIC_EXPUNGEMENT_AI_URL}/packet-ready?briefcaseItemId=…&session_id={CHECKOUT_SESSION_ID}`.
- Cancel URL: `${NEXT_PUBLIC_EXPUNGEMENT_AI_URL}/pay?briefcaseItemId=…`.
- Dry-run success: `${NEXT_PUBLIC_EXPUNGEMENT_AI_URL}/packet-ready?…&dry_run=1`.
- The checkout API route (`src/app/api/expungement-ai/checkout/route.ts`) passes no overrides, so the
  product-owned defaults apply. Consumer checkout never uses `NEXT_PUBLIC_APP_URL` and never defaults
  to `legaleasepartner.com` (except the local/dev `http://localhost:3000` fallback).
- Webhook endpoint stays partner-app hosted: `https://legaleasepartner.com/api/stripe/webhook`.
