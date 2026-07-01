# Prepay Question Reduction Plan

## Root Cause

`src/lib/rcap-engine/public-profile-projection.ts` appended broad `WILMA_FACT_QUESTIONS` into the public profile's `timing_and_completion` stage. That stage is before checkout, so the existing screening frontend rendered source-detail, form-detail, timing-detail, and external-document facts as free prepayment questions.

## Files Involved

- `src/lib/rcap-engine/public-profile-projection.ts`
- `src/lib/rcap-engine/answer-normalization.ts`
- `src/lib/rcap-engine/evaluator.ts`
- `src/components/expungement-ai/screening/screens.ts`
- `scripts/audit-prepay-question-load.mjs`
- `scripts/verify-rcap-prepay-question-gate.mjs`

## Current Behavior

The public profile mixes eligibility triage questions and packet-completion facts in the same before-checkout lifecycle. Because the frontend renders public questions in flow-stage order, appended Wilma/source-detail questions inflate every jurisdiction's prepayment flow.

## Desired Behavior

Every public question carries lifecycle metadata. The prepayment flow renders only route splitters, hard disqualifiers, timing gates, and required eligibility facts. Packet fields, official-form fields, custom pleading fields, external-document checks, filing-readiness items, service/mailing details, and narratives remain in the public payload under post-payment packet-completion metadata for the existing Briefcase/packet path.

## Safety Rule

Do not open payment from generic fallback or missing hard facts. Payment may open only for a deterministic, source-backed, paid-packet-eligible route with no hard disqualifier, required timing satisfied or plausibly satisfied, no open Legal Action Required blocker, and packet support available. External documents are filing-readiness items, not checkout blockers.

## PA Proof Target

Pennsylvania should drop from 37 estimated prepayment questions to 8-12 if possible, and must stay under the 15-question hard cap. PATCH/PSP handling moves to filing readiness and next steps, not checkout.

## Global Rollout Target

All 51 jurisdictions should stop showing broad Wilma/source-detail/form/external-document questions before payment. Any jurisdiction still over 15 questions must be explicitly reported with a legal reason and next action.
