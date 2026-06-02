# Phase 18 RCAP Wilma Intake

## What Phase 18 Adds

Phase 18 adds the RCAP Wilma Eligibility Chat foundation for the LegalEase Record-Clearing Access Program / Partner Journey OS.

The public partner intake route is:

```text
/intake/[partnerSlug]
```

The route loads the partner by slug, shows partner-specific LegalEase/RCAP context, requires disclaimer acknowledgment, asks a deterministic guided question flow, stores sessions and responses in Supabase, and generates a safe pathway summary.

## RCAP Independence

RCAP Wilma is native to `https://www.legaleasepartner.com`.

It does not route users into the consumer-facing Expungement.ai funnel by default. Expungement.ai may remain listed as a LegalEase record-clearing service/module, but Phase 18 intake state, routing, disclaimers, and persistence are owned by the Partner Journey OS.

## Route Structure

Public intake:

```text
/intake/[partnerSlug]
```

API routes:

```text
POST /api/rcap/intake/start
POST /api/rcap/intake/respond
POST /api/rcap/intake/complete
GET  /api/rcap/intake/[sessionId]
```

Partner landing pages route primary CTAs to `/intake/[partnerSlug]`.

## Intake Question Flow

1. Welcome and legal disclaimer acknowledgment.
2. What the participant is trying to understand:
   old arrest, charged but not convicted, past conviction, not sure what shows up, or background check concern.
3. State where the case happened.
4. County or local area.
5. What happened with the case:
   dismissed, no bill / not prosecuted, convicted, completed sentence, or not sure.
6. Approximate year or timeframe.
7. Whether the participant has paperwork.
8. Whether the participant wants help getting a record checked.
9. Basic contact information.
10. Final pathway summary.

## Data Captured

Phase 18 may capture:

- Partner slug and partner ID.
- Session status and current step.
- First name, last name, email, and phone.
- State and county.
- General record type.
- General case outcome.
- Approximate case year or timeframe.
- Whether paperwork exists.
- Whether a record check may be needed.
- Deterministic pathway summary, suggested next step, and eligibility signal.
- Disclaimer acknowledgment.
- Created, updated, and completed timestamps.

## Data Not Captured

Phase 18 does not capture:

- SSN.
- Date of birth.
- Uploaded documents.
- Detailed case narratives beyond the structured fields.
- Payment secrets.
- Supabase secrets.
- Resend secrets.
- AI provider secrets.

## Disclaimer Requirements

The intake must show and require acknowledgment of:

```text
This tool does not provide legal advice and does not guarantee eligibility or outcomes.
```

The final summary must continue to use safe, non-legal-advice language.

## Pathway Summary Rules

The summary generator is deterministic and does not use a live LLM by default.

- Dismissed or not prosecuted matters may return `possible_pathway` or `needs_more_information`.
- Charged but not convicted may return a possible pathway signal when enough basic information exists.
- Conviction or completed sentence responses return `needs_more_information` or `human_review_recommended`.
- Not sure responses and missing paperwork steer toward record review.
- No documents can recommend RecordShield-style record review before further routing.

The summary must not say:

- You are eligible.
- You qualify.
- Your record can be cleared.
- We guarantee.

Safe language should use:

- may
- possible
- needs review
- next step
- more information may be needed

## Supabase Data Model

Migration:

```text
supabase/phase-18-rcap-wilma-intake.sql
```

Tables:

```text
rcap_intake_sessions
rcap_intake_responses
```

The API uses the server-side Supabase admin client. The service role key is never exposed to the browser.

## Commands To Run

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
npm run partners:verify-email-delivery
npm run partners:verify-launch-readiness
npm run partners:verify-rcap-wilma-intake
```

## Known Not-Yet-Built Items

- RCAP document generator.
- Command Center integration.
- Full RLS policies.
- Production auth.
- CRM integration.
- Analytics/monitoring.
