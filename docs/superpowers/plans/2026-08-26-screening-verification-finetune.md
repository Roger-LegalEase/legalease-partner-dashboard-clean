# Screening and Verification Fine-Tune Implementation Plan

> Execute in lane order. Write each focused verifier first, observe the intended RED, implement the smallest correction, then rerun only the affected checks. Do not regenerate canonical artifacts until Task 9 and do not run the complete repository chain until Task 10.

**Goal:** Deliver a surgical two-stage screening/packet-verification correction while retaining the nationwide product and all existing commercial/partner infrastructure.

**Architecture:** A server-owned question selector conservatively narrows route-specific questions using existing exact pathway/fact mappings. Packet information persists facts separately from an explicit versioned verification snapshot. Payment, sponsorship, webhook, render, and packet-generation paths require the current snapshot hash.

**Stack:** Next.js/React/TypeScript, existing RCAP engine and compiled JSON profiles, Supabase matter artifact envelope, Stripe checkout, Node verification scripts, Playwright hosted acceptance.

---

## Task 1: Freeze controls and focused RED baseline (Lane A)

**Files**

- External: `legalease-finetune-sprint-control/FINAL_EVIDENCE/BASELINE.json`
- External: `legalease-finetune-sprint-control/STATUS_A.md`

**Checks**

- `node scripts/verify-expungement-track1-dedup-questions.mjs`
- `node scripts/verify-expungement-court-requirements-gate.mjs`
- `node scripts/verify-expungement-date-year-selector.mjs`
- `node scripts/audit-all51-rule-grounded-screening-friction.mjs --self-test`
- `node scripts/verify-rcap-prepay-question-gate.mjs`
- `node scripts/verify-expungement-consumer-adapter.mjs`

Record known-red failures separately from product regressions. Keep the immutable 51/356/650 authority paths and SHA-256 values in the external baseline.

## Task 2: Shared question-selection and lifecycle contract (Lane B)

**Files**

- Add: `src/lib/rcap-engine/screening-question-selection.ts`
- Modify: `src/lib/rcap-engine/contracts.ts`
- Modify: `src/lib/rcap-engine/route-fact-relevance.ts`
- Modify: `src/lib/rcap-engine/public-profile-projection.ts`
- Add: `src/app/api/expungement-ai/screening/progress/route.ts`
- Modify: `src/lib/expungement-ai/frontend/contracts.ts`
- Modify: `src/lib/expungement-ai/frontend/schemas.ts`
- Add/modify focused verifier: `scripts/verify-screening-verification-finetune.mjs`

**TDD**

1. Assert the empty-answer progress response contains ordered universal questions and no route/payment/packet authority.
2. Assert exact pathway-context selection includes only questions mapped to that pathway.
3. Assert unmatched/unsupported context stays fail-closed and never invents a predicate.
4. Assert question IDs are deduplicated and remain in canonical stage order.
5. Assert packet/form/court/case fields remain present post-payment.
6. Assert all existing complete fixtures retain their evaluator terminal, packet plan, and payment result.

**Focused checks**

- `node scripts/verify-screening-verification-finetune.mjs`
- `node scripts/verify-public-profile-projection.mjs`
- `node scripts/verify-expungement-profile-screening-flow.mjs`
- `node scripts/verify-rcap-evaluator-public-ambiguity.mjs`
- `node scripts/verify-rcap-evaluator-all51-provability.mjs`

## Task 3: Durable final-verification snapshot (Lane B)

**Files**

- Modify: `src/lib/expungement-ai/packet-information.ts`
- Modify: `src/app/api/expungement-ai/briefcase/[itemId]/packet-information/route.ts`
- Modify: `src/app/api/expungement-ai/screening/pending/claim/route.ts`
- Modify: `src/lib/expungement-ai/types.ts`
- Extend: `scripts/verify-screening-verification-finetune.mjs`
- Modify: `scripts/verify-expungement-commercial-flow-contract.mjs`

**TDD**

1. Incomplete facts persist `in_progress`.
2. Complete facts persist `facts_complete` with no verification timestamp.
3. Explicit verification re-runs authoritative safety and persists `ready_to_generate`, snapshot, and hash.
4. Snapshot covers every screening, packet, server, plan, route, treatment, and profile dependency.
5. Any subsequent answer/dependency change persists `invalidated`, clears readiness, and changes the current hash.
6. A no-op save does not silently verify.

## Task 4: Shared verification-bound commerce and generation (Lane B)

**Files**

- Modify: `src/lib/expungement-ai/payment-adapter.ts`
- Modify: `src/lib/expungement-ai/checkout-reconciliation.ts`
- Modify: `src/lib/expungement-ai/packet-generation.ts`
- Modify: `src/lib/expungement-ai/consumer-render-request.ts`
- Modify: `src/app/api/expungement-ai/checkout/route.ts`
- Modify: `src/app/api/expungement-ai/packet/generate/route.ts`
- Extend: `scripts/verify-screening-verification-finetune.mjs`

**TDD**

1. Unverified/invalidated DTC matters cannot create or reuse checkout.
2. Stripe metadata carries the current verification hash.
3. Webhook mismatch or later invalidation records no new entitlement/render.
4. Active sponsorship without current verification cannot generate or consume a slot.
5. Paid and sponsored generation accept the same current snapshot.
6. Durable and synchronous render paths recheck it independently.

**Focused checks**

- consumer checkout/payment HTTP mutation verifiers
- RCAP phase 51/52/53/55 binding verifiers
- post-payment packet-generation and packet-contract verifiers

Commit Lane B only after these focused checks pass.

## Tasks 5A–5F: State lifecycle/conditionality shards (Lanes D–I)

Each shard writes its failing verifier first, changes only assigned state profiles/metadata/tests/evidence, and preserves every assigned manifest terminal/payment/packet witness. Shared one-line aggregates are captain-owned.

### Lane D

States: AL AK AZ AR CA CO CT DE DC.  
Baseline: 47 flows / 88 variants; 99 free questions; 7 completion overlaps; 12 generic special-route asks; 48 raw packet fields.  
Priorities: CA Prop 64 four-fact scoping; DC §16-803/§16-806 scoping; completion dedupe; explicit packet lifecycle metadata.

### Lane E

States: FL GA HI ID IL IN IA KS KY.  
Baseline: 55/104; 89 free; 5 overlaps; 16 special-route asks; 47 raw packet fields.  
Priorities: HI court-order and IN prosecutor-consent pathway scoping; completion dedupe; explicit packet lifecycle metadata.

### Lane F

States: LA ME MD MA MI MN MS MO MT.  
Baseline: 80/156; 108 free; all 9 exact-date inputs; 8 overlaps; 17 special-route asks; 45 raw packet fields.  
Priorities: move MD/MS/MO exact dates to packet information while retaining approved coarse screening gates; never invent the five unsupported Mississippi date predicates; completion dedupe and route scoping.

### Lane G

States: NE NV NH NJ NM NY NC ND.  
Baseline: 49/96; 93 free; 9 overlaps; 11 special-route asks; 36 raw packet fields.  
Priorities: scope seven CPL 160.59 facts and the CPL 160.58 treatment fact; dedupe NY pending-charge semantics; completion dedupe.

### Lane H

States: OH OK OR PA RI SC SD TN.  
Baseline: 67/108; 85 free; 10 overlaps; 14 special-route asks; 32 raw packet fields.  
Priorities: preserve PA/RI seven-question flows; condition only authority-mapped special facts; completion dedupe.

### Lane I

States: TX UT VT VA WA WV WI WY.  
Baseline: 58/98; 93 free; 8 overlaps; 21 special-route asks; 38 raw packet fields.  
Priorities: preserve UT six-question flow; scope the two Wisconsin §973.015 facts; completion dedupe.

**Per-shard checks**

- shard-specific verifier;
- Track 1 dedup verifier;
- approximate-timing verifier;
- public-profile projection verifier;
- assigned flow terminal/payment/packet witnesses.

## Task 6: Participant UX and explicit review action (Lane C)

**Files**

- Modify: `src/components/expungement-ai/screening/ScreeningFlow.tsx`
- Modify: `src/components/expungement-ai/screening/screens.ts`
- Modify: `src/components/expungement-ai/screening/ScreeningResult.tsx`
- Modify: `src/components/expungement-ai/PacketInformationBuilder.tsx`
- Add: `src/components/expungement-ai/PacketVerificationAction.tsx`
- Modify: `src/app/briefcase/[packetId]/packet-information/page.tsx`
- Modify: `src/app/briefcase/[packetId]/review/page.tsx`
- Modify: `src/app/briefcase/[packetId]/page.tsx`
- Modify: `src/components/expungement-ai/BriefcaseViews.tsx`
- Modify: `src/app/expungement-ai/pay/ConsumerCheckoutButton.tsx`
- Modify: `src/components/expungement-ai/PacketGenerateButton.tsx`
- Modify focused frontend/browser verifiers.

**TDD**

1. Dynamic screens consume only the server-selected question IDs.
2. Last packet-fact save is not verification.
3. Review summary must render before the explicit verification action.
4. Editing a material fact returns to an unverified review.
5. DTC checkout is absent until verification; sponsored UI contains no price/Stripe copy.
6. Result CTA describes the real Briefcase handoff.
7. Stepper has progress semantics/`aria-current`; async errors are live regions.
8. Mississippi DTC and Clinic journeys issue no checkout/generation request before verification.

## Task 7: Captain integration

Integrate in this exact order:

1. Lane B.
2. Lanes D, E, F, G, H, I.
3. Lane C.
4. Captain resolution of payment/sponsorship/current-hash bindings and aggregate state slices.

After each integration, run only its focused checks. Record each accepted head in the external queue/status files. Do not run canonical generators yet.

## Task 8: Migration decision

Run focused concurrent edit/checkout/generation mutation tests against the artifact envelope. If current-hash re-read and existing update semantics pass, record `MIGRATION: NONE`. If they cannot fail closed atomically, add one smallest additive migration with explicit authorization and rerun only the affected database/payment checks.

## Task 9: Single declared regeneration and reconciliation

Regenerate once, in dependency order:

1. public profile fixtures;
2. prepay/question-load and friction artifacts;
3. source-engine coverage;
4. flow manifest/final-disposition reconciliation;
5. fresh review/device matrix evidence.

Reconcile:

- 51 jurisdictions;
- 356 real flows;
- 650 browser-required variants;
- packet families/forms;
- paid/sponsored/no-packet outcomes;
- all mandatory before/after question and verification metrics.

## Task 10: Complete chain and candidate freeze

On a clean integrated tree, run the repository-declared full chain once. If it fails only because a deterministic generated dependency is stale, perform one currentness sweep and restart once.

Commit the integrated result and freeze one exact SHA. Verify `git status --short` is empty.

## Task 11: Independent QA and hosted acceptance

Give the exact frozen SHA to Lane J and Lane K simultaneously.

- Lane J is read-only for product behavior and may add only QA-owned tests/evidence.
- Lane K may deploy only to nonproduction and may add only hosted tools/evidence.
- Reproduce the full Mississippi journey screenshot set, the DTC verification/payment boundary, the sponsored verification/no-Stripe boundary, and Clinic shared-device reset/privacy behavior.
- Production remains untouched.

