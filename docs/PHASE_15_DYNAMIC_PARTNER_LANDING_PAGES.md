# Phase 15 Dynamic Partner Landing Pages

Phase 15 converts the We Must Vote co-branded landing page structure into a reusable dynamic partner landing page template.

The production route is `/p/[partnerSlug]`. It now renders partner-specific public landing pages from persisted partner data and safe fallbacks.

## What Phase 15 Adds

- `PartnerLandingPageTemplate` for reusable co-branded landing pages.
- Dynamic landing page data builder for We Must Vote, Fulton County, demo partner, and future partners.
- Mississippi county selector behavior for We Must Vote.
- Fulton County/Georgia service-area behavior for Fulton County.
- Public asset directory structure under `public/assets/partners/`.
- Reference HTML placeholder under `docs/reference/wemustvote-landing-reference.html`.
- Verification script: `npm run partners:verify-partner-landing-pages`.

## Reference Preservation

The template preserves the We Must Vote reference page structure:

- Powered by LegalEase branding
- hero section
- county/service area selector
- Start My Free Screening CTA
- help-if-you-do-not-know-where-to-start section
- promise section
- quote section
- comparison section
- how it works section
- what you'll need section
- FAQ section
- final CTA

The static reference file is not served as production UI.

## Asset Placement

Binary assets were not present in this repo at Phase 15 implementation time. The app uses intended public paths and renders styled fallback panels when assets are missing.

Place uploaded assets here:

```text
public/assets/partners/legalease/
public/assets/partners/wemustvote/
```

Expected filenames are listed in:

```text
public/assets/partners/README.md
```

## Partner Versions

- `we-must-vote`: Mississippi-focused We Must Vote version with Mississippi county options.
- `fulton-county`: Georgia/Fulton County version with Fulton County as the default service area.
- `demo-partner`: safe demo version built from seeded/persisted partner profile data.
- Future partners: generated from Supabase onboarding/profile fields with defaults when fields are incomplete.

## Public Data Boundary

The public page does not expose internal payment details, Stripe IDs, Supabase IDs, or private admin state. It uses public-facing organization, program, service area, and landing page copy.

## Commands

```bash
npm run lint
npm run typecheck
npm test
npm run partners:verify-supabase-live-read
npm run partners:verify-supabase-required-partners
npm run partners:verify-supabase-admin-write
npm run partners:verify-production-readiness
npm run partners:verify-stripe-readiness
npm run partners:verify-paid-provisioning
npm run partners:verify-onboarding-persistence
npm run partners:verify-partner-landing-pages
```

## Not Yet Built

- live Wilma screening intake submission
- CRM integration
- email sending
- production auth
- RLS policies
- production domain deployment
