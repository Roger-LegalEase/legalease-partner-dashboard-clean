# Expungement.ai State Landing Pages

State-specific consumer landing pages for Expungement.ai — one per US state plus the District of
Columbia (51 total). They exist for consumer growth, trust, SEO, paid ads, and state-specific user
education, and they route visitors into the **existing** free DTC screening flow with the state
preselected but never locked.

These pages are a **marketing surface only**. They do not add an eligibility engine, change any
rule, touch payment, or alter the partner/RCAP flow.

## Purpose

- Give each state an accurate, non-thin page using that state's real record-clearing vocabulary and
  routes (sourced from the engine profiles), not a cloned template with only the name swapped.
- Send users into the free check (`/expungement-ai/screening/<CODE>`) with their state preselected.
- Reinforce the DTC promises: free to start, `$50` only if a self-help packet path may be available,
  not a law firm, and the court or agency makes the final decision.

## URL structure

- Public: `https://expungement.ai/states/<stateSlug>` (e.g. `/states/mississippi`,
  `/states/pennsylvania`, `/states/district-of-columbia`).
- App route: `src/app/expungement-ai/states/[stateSlug]/page.tsx`.
- Host mapping: `src/proxy.ts` maps `expungement.ai/states/...` → `/expungement-ai/states/...` via a
  `startsWith("/states/")` branch, mirroring the existing `/screening/` wildcard. No `/states` index
  page is exposed.
- Statically generated per jurisdiction via `generateStaticParams`; `dynamicParams = false`, so any
  unknown slug is a real 404 (`notFound()`) — there is **no generic fallback state**.

## Data source

Everything state-specific is derived from the compiled engine profiles, the same source of truth the
screening flow uses:

- Source: `src/lib/rcap-engine/compiled/profiles/<CODE>-<slug>.json` (51 jurisdictions incl. DC).
- Projection: `scripts/lib/state-landing-derive.mjs` extracts jurisdiction identity, allowed state
  terms, and copy-safe `pathways[].label` highlights.
- Generated file: `npm run expungement:build-state-landing-content` writes
  `src/lib/expungement-ai/state-landing/generated-state-content.json` (a committed, intended repo
  file, analogous to `compiled/all51.json`).
- View model: `src/lib/expungement-ai/state-landing/state-landing-data.ts` builds the full per-state
  page content from the generated JSON + curated terminology.
- The verifier re-derives from the profiles and asserts the committed JSON is byte-exact, so the
  pages can never silently drift from the engine or fall back to another state.

## State terminology

`terminology.primaryConsumerTerm` is uniformly `"expungement"` in the engine, but several states do
not call the process that. `src/lib/expungement-ai/state-landing/state-terminology.ts` holds a small
**presentation-only** override map (grounded in each state's real pathway labels) for the states with
distinctive vocabulary; all other states derive a term from their `allowedStateTerms`. Examples:

- Alaska — **CourtView Removal** & Record Sealing (no single expungement statute).
- Nevada — **Record Sealing** (NRS Chapter 179).
- Massachusetts — **CORI Sealing** & record expungement.
- Pennsylvania — **Court Case Expungement**, **Summary Expungement**, **Limited Access**, Clean Slate.
- Hawaii — Record Expungement via **Administrative Application**.
- Delaware — Mandatory & **Discretionary** Expungement.
- Texas — Expunction & Nondisclosure. California — Dismissal/Set-Aside & Sealing. New York — Sealing
  & Clean Slate.

This map changes only display copy. It never changes eligibility, routing, or payment.

## Copy safety rules

State page copy is scanned by the verifier against the outcome-promise avoid-list (`qualify`,
`eligible`, `approved`, `guaranteed`, and Spanish equivalents) plus `law firm`, `legal advice`,
`legal representation`, `attorney`, `evaluator`, `engine decides`, `we decide`. The only allowed
occurrences are the safe negations: **not a law firm**, **not legal advice**, **no legal
representation**, **no guaranteed court outcome**. Every page must carry the not-a-law-firm,
self-help, court/agency-final-decision, and "a path may be available" language.

Prefer: "a path may be available", "based on what you shared", "self-help packet", "record-clearing
check", "the court or agency makes the final decision", "may need", "next steps".

## CTA routing

- Primary CTA "Start free record-clearing check" → `/expungement-ai/screening/<CODE>` (uppercase
  jurisdiction code, matching `StatePicker`). This preselects the state and enters the existing DTC
  flow. No `?session=` and no partner slug, so the flow stays in DTC/`$50` mode.
- "See how it works" → `/expungement-ai/how-it-works`.
- Payment stays Stripe-gated in the screening flow; the landing pages contain no checkout logic.

## Multi-state behavior (preselect, never lock)

A state page preselects a state as a convenience only. Every page:

- Links to the general picker `/expungement-ai/screening` via a "Wrong state? Choose a different
  state" affordance, so the user can switch (e.g. enter via `/states/mississippi` but screen
  Tennessee) without a dead end.
- Reassures the user in the FAQ that they can check as many cases as they need and start another
  free check for any state from their **Briefcase** — starting here never locks them into one state.
- Does not create one-state-only accounts or one-state-only Briefcase logic. The Briefcase's "New
  record check" path (`BriefcaseShell`, → `/expungement-ai/check`) continues to support additional
  states and matters.

## SEO & structured data

- `generateMetadata` sets a per-state `title`, `description`, `alternates.canonical`
  (`https://expungement.ai/states/<slug>`), and Open Graph title/description.
- `src/app/sitemap.ts` (code-generated, served at `/sitemap.xml`) lists all 51 state pages plus core
  expungement.ai pages, with absolute URLs. It intentionally scopes to expungement.ai content.
- Each page emits `FAQPage` JSON-LD built from its own FAQ. The structured data is deliberately
  limited to the Q&A — no `Organization`, `LegalService`, `Attorney`, or `GovernmentService` typing,
  so nothing implies Expungement.ai is a law firm or agency.

## How to add or update a state

1. Ensure the jurisdiction exists in `src/lib/rcap-engine/compiled/profiles/`.
2. (Optional) Add or adjust a display term in `state-terminology.ts`.
3. Run `npm run expungement:build-state-landing-content` to regenerate the JSON.
4. Run `npm run expungement:verify-state-landing-pages`.

## How to run the verifier

```
npm run expungement:verify-state-landing-pages
```

It checks: route coverage (51, incl. DC; unknown slug 404s), data-source integrity (no drift, no
fallback), terminology, CTA routing + multi-state non-lock, copy/legal safety, SEO + sitemap, thin-
page/similarity protection, and that no payment/partner surface is touched.

## Intentionally NOT included (current pass)

- **Spanish (ES) copy for the state pages.** The DTC landing and app copy catalogs are bilingual, but
  the per-state landing body is English-only in this pass to avoid machine-generating state-specific
  legal Spanish. The data model is structured to add ES later. This is a known follow-up.
- Per-state hero imagery, testimonials, and paid-ad variants.

## Warning: no thin cloned pages

Do not add "doorway" pages where only the state name changes. The verifier fails if pages share an
identical pathway-highlight set, duplicate SEO titles, or a near-duplicate content fingerprint. Every
page must carry genuine state-specific value: the state's term, at least two real state route labels,
a state-specific FAQ, and the state name in the hero and at least one FAQ answer.
