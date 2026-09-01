# Protected Briefcase Presentation Authority Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Provide C with a server-only, fail-closed Briefcase view model and close the combined protected-authority commerce, legacy, Stripe, and semantic-no-op gaps.

**Architecture:** A dedicated module exposes pure injected assembly plus single/batch runtime wrappers. Protected verification/artifact/payment/sponsorship readers and owner-bound pending re-evaluation are the only authority sources; checkout/render/generation consume protected snapshot facts rather than the participant JSON mirror.

**Tech Stack:** TypeScript, Next.js server modules, Supabase service-role readers/RPCs, Node focused verifier and mutation harnesses.

## Approved implementation amendment

Captain/C integration review expanded the protected contract after this task sequence was written. The implemented contract supersedes the early type sketch below:

- every verification status/revision has a protected `draftHash`/`draftSnapshot`; unverified and invalidated presentation uses that draft and never pending/raw JSON fallback;
- `BriefcasePresentationItem` adds `protected_draft`, explicit `packetProgress`, and a canonical `packetDraft` containing protected answer maps, builder questions, verification summary/context/manifest, plan/components, and review safety;
- exact protected-missing fallback calls `get_consumer_briefcase_presentation_source(owner,item)`, verifies owner/item/matter/source/claim/answer/linkage digests, and keeps an already claimed source durable after its pre-claim TTL;
- a trusted source supplies the canonical first-open draft, while the captain claim/persistence migration initializes that same protected draft before the first save;
- render/generation reconstruct solely from the protected final snapshot even after complete `commercialFlow` deletion.

---

### Task 1: Presentation authority contract and forged-row tests

**Files:**
- Create: `src/lib/expungement-ai/briefcase-presentation-authority.ts`
- Create: `scripts/test-briefcase-presentation-authority.mjs`

- [ ] **Step 1: Write the failing pure-contract test**

Build a forged `ConsumerBriefcaseItem` containing `packetStatus: "ready"`, fake artifact/download paths, fake summary/next steps/pathway/result/track/treatment, and a deleted `commercialFlow`. Import the not-yet-created adapter with deterministic injected protected verification, protected artifact, payment, sponsorship, and pending readers. Assert the output equals only the protected/compiled values and the known protected artifact metadata.

- [ ] **Step 2: Run the focused test and verify RED**

Run: `node scripts/test-briefcase-presentation-authority.mjs`

Expected: failure because `briefcase-presentation-authority.ts` or its exports do not exist.

- [ ] **Step 3: Implement the narrow exported types and pure assembler**

Define these stable exports:

```ts
export type BriefcasePresentationAuthorityStatus =
  | "protected_verified"
  | "trusted_source"
  | "unavailable";

export type BriefcasePresentationArtifact =
  | { status: "absent"; canDownload: false; documents: [] }
  | {
      status: "ready";
      canDownload: boolean;
      source: "source_driven_packet_plan" | "mississippi_legacy_petition_packet";
      packetId: string;
      packetPlanId: string | null;
      generatedAt: string;
      documents: Array<{ kind: "full" | "court"; fileName: string; downloadPath: string }>;
    };

export type BriefcasePresentationItem = {
  id: string;
  createdAt: string;
  authorityStatus: BriefcasePresentationAuthorityStatus;
  unavailableReason: string | null;
  jurisdiction: string | null;
  title: string;
  resultCode: ExpungementAiResultCode | null;
  pathwayId: string | null;
  pathwayLabel: string | null;
  summary: string | null;
  nextSteps: string[];
  checklist: string[];
  packetType: ExpungementAiEligibilityResult["packetType"] | null;
  selectedTrackId: string | null;
  treatmentClassification: ConsumerBriefcaseItem["treatmentClassification"] | null;
  verificationStatus: "verified" | "trusted_source" | "unavailable";
  paymentState: "paid" | "unpaid" | "sponsored" | "unavailable";
  artifact: BriefcasePresentationArtifact;
};
```

Export `assembleBriefcasePresentationItem` with injected authority values, and runtime `decorateBriefcaseItemForPresentation` / `decorateBriefcaseItemsForPresentation` wrappers. The unavailable constructor retains only ID/created time and neutral copy.

- [ ] **Step 4: Run the focused test and verify GREEN**

Run: `node scripts/test-briefcase-presentation-authority.mjs`

Expected: all forged-row, unavailable, and batch-order assertions pass.

### Task 2: Protected/trusted-source runtime resolution

**Files:**
- Modify: `src/lib/expungement-ai/briefcase-presentation-authority.ts`
- Modify: `scripts/test-briefcase-presentation-authority.mjs`

- [ ] **Step 1: Add failing runtime-reader tests**

Mock protected readers and the service-role client. Prove protected verified wins; exact missing permits an owner-bound claimed pending row; unverified, invalidated, storage error, wrong owner, unclaimed/expired row, or source mismatch returns unavailable and never consults participant legal/output fields.

- [ ] **Step 2: Run and verify RED**

Run: `node scripts/test-briefcase-presentation-authority.mjs`

Expected: the runtime wrapper assertions fail before the readers are wired.

- [ ] **Step 3: Implement protected-first resolution**

Use `readProtectedPacketVerification`, `readProtectedPacketArtifact`, `consumerPacketPaymentAuthority`, and a service-role partner-source lookup. Query `consumer_pending_screening_results` by exact owner and either pending ID or exact source-session ID only after the protected verification reader returns `protected_verification_authority_missing`. Re-evaluate stored inputs with `evaluateAuthoritativeScreeningResult`; require exact profile, pathway/result/track/treatment/plan consistency for protected snapshots.

- [ ] **Step 4: Run and verify GREEN**

Run: `node scripts/test-briefcase-presentation-authority.mjs`

Expected: protected-first/fallback-order tests pass.

### Task 3: Strict protected legacy artifact evidence

**Files:**
- Modify: `src/lib/expungement-ai/verification-cas.ts`
- Modify: `src/lib/expungement-ai/packet-generation.ts`
- Modify: `scripts/test-briefcase-presentation-authority.mjs`
- Modify: `scripts/verify-screening-verification-finetune.mjs`

- [ ] **Step 1: Add failing evidence tests**

Assert label-only `legacy_backfill`, null/missing digest, wrong owner/item/matter/source/plan, or missing issuance record is rejected. Assert an exact consumer payment + immutable render output tuple and an exact sponsored generation/credit + source-session tuple are admitted.

- [ ] **Step 2: Run and verify RED**

Run: `node scripts/test-briefcase-presentation-authority.mjs`

Expected: current protected parser incorrectly admits label-only legacy rows.

- [ ] **Step 3: Extend and validate the protected contract**

Add a discriminated `ProtectedLegacyArtifactEvidence` carrying evidence kind, owner/item/matter/source/packet-plan IDs, issuance/output record ID, artifact SHA-256, and optional historical verification hash. Require exact artifact/evidence tuple equality before `readyPacketArtifactAccess` or the presentation sanitizer accepts `legacy_backfill`.

- [ ] **Step 4: Run and verify GREEN**

Run: `node scripts/test-briefcase-presentation-authority.mjs && node scripts/verify-screening-verification-finetune.mjs`

Expected: strict evidence matrix passes.

### Task 4: Protected snapshot self-sufficient checkout/render/generation

**Files:**
- Modify: `src/lib/expungement-ai/packet-information.ts`
- Modify: `src/lib/expungement-ai/consumer-render-request.ts`
- Modify: `src/lib/expungement-ai/packet-generation.ts`
- Modify: `scripts/test-expungement-checkout-guards.mjs`
- Modify: `scripts/verify-screening-verification-finetune.mjs`

- [ ] **Step 1: Add failing whole-mirror deletion tests**

Delete `artifactRefs.commercialFlow` before checkout and after protected payment. Assert checkout uses protected verification, and render/generation derive packet facts solely from protected snapshot fact maps and compiled plan. Assert no paid/no-delivery state and no participant mirror read.

- [ ] **Step 2: Run and verify RED**

Run: `node scripts/test-expungement-checkout-guards.mjs && node scripts/verify-screening-verification-finetune.mjs`

Expected: render/generation fails because current packet model still requires the mirror.

- [ ] **Step 3: Implement protected snapshot derivation**

Add a protected-snapshot packet model that validates the snapshot, reconstructs required answers/facts and compiled plan, and feeds render/generation. Keep participant JSON only as a compatibility mirror; never use it after current protected verification is available.

- [ ] **Step 4: Run and verify GREEN**

Run: `node scripts/test-expungement-checkout-guards.mjs && node scripts/verify-screening-verification-finetune.mjs`

Expected: both mirror-deletion phases pass without commerce/delivery divergence.

### Task 5: Reusable Stripe expiry and all-status semantic no-op

**Files:**
- Modify: `src/lib/expungement-ai/payment-adapter.ts`
- Modify: `src/lib/expungement-ai/packet-information.ts`
- Modify: `scripts/test-expungement-checkout-guards.mjs`
- Modify: `scripts/verify-screening-verification-finetune.mjs`

- [ ] **Step 1: Add failing Stripe/no-op tests**

Assert an invalid binding or success/cancel origin on a reusable open Session expires that Session, returns no URL, and creates no replacement. Assert identical verified, unverified, and invalidated transitions preserve revision and all timestamps.

- [ ] **Step 2: Run and verify RED**

Run: `node scripts/test-expungement-checkout-guards.mjs && node scripts/verify-screening-verification-finetune.mjs`

Expected: invalid reusable reconciliation leaves the old Session open; non-verified no-op metadata changes.

- [ ] **Step 3: Implement minimal corrections**

Expire the reusable open Session whenever immutable binding/origin reconciliation returns null. Generalize semantic transition equality so every unchanged protected status returns the exact prior record and revision.

- [ ] **Step 4: Run and verify GREEN**

Run: `node scripts/test-expungement-checkout-guards.mjs && node scripts/verify-screening-verification-finetune.mjs`

Expected: expiry and all-status no-op tests pass.

### Task 6: Mutation coverage, handoff, verification, and review

**Files:**
- Modify: `scripts/test-screening-verification-finetune-mutations.mjs`
- Modify: `docs/superpowers/plans/2026-08-26-screening-verification-concurrency-handoff.md`
- Modify: `STATUS_B.md` in the sprint-control workspace after the final commit

- [ ] **Step 1: Add negative mutations**

Add mutations for participant presentation pass-through, protected-missing fallback widening, label-only legacy acceptance, mirror-dependent render, invalid-session non-expiry, and non-verified no-op revision churn.

- [ ] **Step 2: Correct the captain backfill handoff**

State that writable JSON is never issuance evidence. Require exact owner/item/matter/source/plan correlation to payment entitlement + immutable render output or sponsored generation/credit + source session, including byte digest; ambiguous rows remain protected absent/regenerable.

- [ ] **Step 3: Run focused and baseline verification**

Run the presentation test, checkout test, focused verifier, both mutation harnesses, typecheck, focused ESLint, plain-language parity, all-51 money/delivery verifier, and `git diff --check`.

Expected: all ordinary checks exit zero; every mutation is caught.

- [ ] **Step 4: Obtain independent exact-diff review**

Require explicit Critical/Important/Minor counts. Fix and re-review until Critical and Important are both zero.

- [ ] **Step 5: Create one cumulative commit and update external status**

Commit the spec, plan, implementation, tests, and handoff together. Update external `STATUS_B.md` with the new head, exact C API, evidence, and captain SQL/backfill requirements.
