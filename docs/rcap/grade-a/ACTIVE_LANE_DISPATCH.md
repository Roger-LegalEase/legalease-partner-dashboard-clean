# Active lane dispatch

Machine-readable source: `data/rcap-grade-a/active-lane-envelopes.json`.
Checked by: `node scripts/verify-active-lane-envelopes.mjs`.

Controlling base for every lane: `0cad61625a74665db23ac64988c301e48909cf81`, the exact remote tip of
`origin/claude/new-session-7rsiqq`. No lane starts from `origin/main`, from
`07675789`, from a merge base, or from a local default.

## Status

| Lane | Worker | Status | Branch | Families | Routes |
|---|---|---|---|---|---|
| B | Claude Opus 5 | `integrated` | `claude/legalease-sprint-captain-utucnw` | grade-a-fulfillment-authority | 8 |
| C | Claude Opus 5 | `integrated` | `claude/legalease-sprint-captain-utucnw` | oregon | 3 |
| D | Claude Opus 5 | `integrated` | `claude/legalease-sprint-captain-utucnw` | north-dakota | 5 |
| E | Codex | `active` | `codex/lane-e-claim-ownership-briefcase` | none | all, route-independent |
| F | Codex | `active` | `codex/lane-f-payment-sponsorship-delivery` | none | all, route-independent |
| G-CODE | Codex | `active` | `codex/lane-g-code-shard-1` | alabama, alaska, kentucky, nebraska, vermont | 26 |
| H | Codex | `active` | `codex/lane-h-clinic-security-acceptance` | none | all, route-independent |
| G-DOC | Claude Opus 5 | `queued` | `claude/lane-g-doc-shard-1` | arkansas, colorado, north-carolina | 9 |

Eight sessions maximum including the captain. Lanes B, C and D are integrated,
which is what releases the slot G-DOC takes; the verifier fails if G-DOC is
active while C or D still holds one.

## Identity gate — run before the first edit

```
git remote get-url origin
git fetch origin --prune
git rev-parse origin/claude/new-session-7rsiqq
```

The third command must print `0cad61625a74665db23ac64988c301e48909cf81`.
Anything else: return ENVIRONMENT MISROUTED and edit nothing. A misrouted Codex
lane is relaunched in a correctly attached Codex environment, never silently
reassigned to Claude.

## Captain-only paths

No worker writes these. A lane needing a change here returns a patch request.

- `package.json`
- `package-lock.json`
- `data/rcap-verifier-dispositions.json`
- `data/rcap-ledger/`
- `data/rcap-grade-a/`
- `supabase/migrations/`
- `docs/rcap/grade-a/captain/`

## Corpus

`RCAP_BUNDLE_EXTRACT=private/source-imports/Expungement_AI_RCAP_Master_Library_Edition_1`

Verified: 51 jurisdictions, 499 files, 329 PDFs, 498 of 498 governance checksums.
Archive SHA-256 `a26e3ca7d52db4460e53c2eddd893109037702f5c8035f2c698a7e16bad84e89`.

`OFFICIAL_FORMS_SOURCE_DIR`, the operational Nationwide tree, is a **different**
corpus and is absent. It may not be substituted for the Master Library; the
operational-corpus precondition refuses that substitution by name.

## Per-lane envelopes

### Lane B — Claude Opus 5 — `integrated`

| Field | Value |
|---|---|
| shardId | `S-B1` |
| laneBranch | `claude/legalease-sprint-captain-utucnw` |
| baseSha / remoteBaseSha | `0cad61625a74665db23ac64988c301e48909cf81` |
| jurisdictions | ND, OR |
| packetFamilyIds | grade-a-fulfillment-authority |
| routeIds | 8 concrete route ids, enumerated in the JSON |
| sourceIdentities | no official source document is consumed by this lane; its records derive from committed evidence ledgers |
| sourceHashes | not applicable: this lane consumes no official source bytes |
| requiredReturnCommit | `a25eec4cdc1f2193a591ba9c2991c3c6dd8a03ef` |

**Owned paths.**

- `src/lib/rcap/fulfillment/`
- `scripts/generate-rcap-grade-a-fulfillment-authority.mjs`
- `scripts/verify-rcap-grade-a-fulfillment-authority.mjs`

**Required deliverables.**

- One versioned fulfillment record per candidate route binding it to the identity and hash of every Grade-A input.
- An admission facade taking exactly (admissionPoint, routeIdentity) and reading no request, header, cookie or environment.
- A generator and a verifier, with the verifier carrying in-memory mutations.

**Required tests.**

```
node scripts/generate-rcap-grade-a-fulfillment-authority.mjs --check
node scripts/verify-rcap-grade-a-fulfillment-authority.mjs
node scripts/verify-rcap-grade-a-fulfillment-authority.mjs --mutations
npm run typecheck
```

**Stop conditions.**

- The identity gate does not print 0cad61625a74665db23ac64988c301e48909cf81 for origin/claude/new-session-7rsiqq: return ENVIRONMENT MISROUTED without editing a file.
- A change is required inside a captain-only path: stop and return a patch request; do not claim the path.
- A required official source hash cannot be recomputed from the mounted corpus: stop rather than reading the hash back from a committed record.
- Any Production deployment, migration, environment change, secret change, Stripe live-mode call, participant creation, sponsored-credit consumption or domain activation would be needed: stop and return the blocker.

**Salvage.** Branch `claude/grade-a-fulfillment-core-jni395`, commits in order:

- `b52a94cef85c9abd4f7a89d3e28b081d3514ff6c`
- `0efc404b6fe72efe8557046e2bbc335d85448d3c`
- `0d36ac25b09f18d5fd445c03eb49dbf9984873ed`

Not merged as a branch. Reviewed commit by commit and replayed against the current contract.

### Lane C — Claude Opus 5 — `integrated`

| Field | Value |
|---|---|
| shardId | `S-C1` |
| laneBranch | `claude/legalease-sprint-captain-utucnw` |
| baseSha / remoteBaseSha | `0cad61625a74665db23ac64988c301e48909cf81` |
| jurisdictions | OR |
| packetFamilyIds | oregon |
| routeIds | 3 concrete route ids, enumerated in the JSON |
| sourceIdentities | 7 official source files, enumerated in the JSON |
| sourceHashes | 7 SHA-256 digests, recomputed from the mounted corpus |
| requiredReturnCommit | `92c6e2b92f11bdcbb27c503c2d3a0de009f4ce9d` |

**Owned paths.**

- `data/rcap-all50/overlays/lane-c-candidates/oregon/`
- `docs/RCAP_OREGON_OFFICIAL_PDF_GRADE_A_LANE_C.md`
- `scripts/verify-rcap-oregon-official-pdf-grade-a.mjs`

**Required deliverables.**

- Official-PDF overlay packages for the Oregon set, proven from the official bytes.
- Field census, classification, protected-field scan and contact-sheet proof per package.
- Oregon held outside production overlays and outside commercial admission.

**Required tests.**

```
node scripts/verify-rcap-oregon-official-pdf-grade-a.mjs
node scripts/verify-rcap-official-forms-d1.mjs
node scripts/verify-rcap-shared-pdf-contract.mjs
node scripts/verify-rcap-shared-pdf-contract.mjs --mutations
```

**Stop conditions.**

- The identity gate does not print 0cad61625a74665db23ac64988c301e48909cf81 for origin/claude/new-session-7rsiqq: return ENVIRONMENT MISROUTED without editing a file.
- A change is required inside a captain-only path: stop and return a patch request; do not claim the path.
- A required official source hash cannot be recomputed from the mounted corpus: stop rather than reading the hash back from a committed record.
- Any Production deployment, migration, environment change, secret change, Stripe live-mode call, participant creation, sponsored-credit consumption or domain activation would be needed: stop and return the blocker.

**Salvage.** Branch `claude/oregon-official-pdf-grade-a-3rtuq7`, commits in order:

- `bb26ac7822470f4b2d0a1cb0bcafe89e44abe2b4`
- `0a4e30171a3b3f87a7dbd7a87a09f47f76b03355`

Not merged as a branch. Reviewed commit by commit and replayed against the current contract.

### Lane D — Claude Opus 5 — `integrated`

| Field | Value |
|---|---|
| shardId | `S-D1` |
| laneBranch | `claude/legalease-sprint-captain-utucnw` |
| baseSha / remoteBaseSha | `0cad61625a74665db23ac64988c301e48909cf81` |
| jurisdictions | ND |
| packetFamilyIds | north-dakota |
| routeIds | 5 concrete route ids, enumerated in the JSON |
| sourceIdentities | 6 official source files, enumerated in the JSON |
| sourceHashes | 6 SHA-256 digests, recomputed from the mounted corpus |
| requiredReturnCommit | `14ebc93ce531e7e753ffc1290191b1f4a66979fc` |

**Owned paths.**

- `data/rcap-lane-d/`
- `docs/rcap/lane-d/`
- `src/lib/record-clearing/north-dakota-nonconviction-spec.ts`
- `src/lib/record-clearing/north-dakota-nonconviction-config.ts`
- `src/lib/record-clearing/composers/nd-composed-packet-composer.ts`
- `src/lib/record-clearing/renderers/custom-pleading-renderer.ts`
- `scripts/generate-nd-composed-packet-artifacts.mjs`
- `scripts/lib/nd-composed-packet-pdf.mjs`
- `scripts/verify-nd-composed-packet.mjs`
- `scripts/verify-nd-grade-a-product-path.mjs`

**Required deliverables.**

- A versioned North Dakota specification with its own SHA-256 and a composer that fails closed on an unresolved branch.
- A composed filing packet with proposed order, service, filing destination, fee and post-filing steps.
- North Dakota held at IMPLEMENTATION_COMPLETE and COMMERCIAL_HOLD.

**Required tests.**

```
node scripts/generate-nd-composed-packet-artifacts.mjs --check
node scripts/verify-nd-composed-packet.mjs
node scripts/verify-nd-grade-a-product-path.mjs
npm run typecheck
```

**Stop conditions.**

- The identity gate does not print 0cad61625a74665db23ac64988c301e48909cf81 for origin/claude/new-session-7rsiqq: return ENVIRONMENT MISROUTED without editing a file.
- A change is required inside a captain-only path: stop and return a patch request; do not claim the path.
- A required official source hash cannot be recomputed from the mounted corpus: stop rather than reading the hash back from a committed record.
- Any Production deployment, migration, environment change, secret change, Stripe live-mode call, participant creation, sponsored-credit consumption or domain activation would be needed: stop and return the blocker.

**Salvage.** Branch `claude/north-dakota-grade-a-packet-wiludq`, commits in order:

- `2c65883ca2ed47504953420ceeb099c228ec390e`
- `46e42eed3d3aa8177145b39c322e524524349fb4`
- `4cc77558c64cf16903723594bf369398093cffee`
- `33cfc21f08bf8b876d6b68ebef357e589b054b4d`
- `f9bd937e1936fef2e98074c0666b2476542c31cd`

Not merged as a branch. Reviewed commit by commit and replayed against the current contract.

### Lane E — Codex — `active`

| Field | Value |
|---|---|
| shardId | `S-E1` |
| laneBranch | `codex/lane-e-claim-ownership-briefcase` |
| baseSha / remoteBaseSha | `0cad61625a74665db23ac64988c301e48909cf81` |
| jurisdictions | applies to all 51 jurisdictions; the claim boundary is jurisdiction-independent |
| packetFamilyIds | no packet family: this lane renders no packet |
| routeIds | applies to every route id in data/rcap-ledger/launch-graph.json; the claim boundary is route-independent and is asserted once for all 256 |
| sourceIdentities | no official source document is consumed by this lane |
| sourceHashes | not applicable: this lane consumes no official source bytes |
| requiredReturnCommit | not yet returned: the worker returns one exact 40-character commit SHA on codex/lane-e-claim-ownership-briefcase |

**Owned paths.**

- `src/lib/rcap/briefcase/`
- `src/lib/expungement-ai/claim/`
- `src/lib/expungement-ai/briefcase.ts`
- `src/lib/expungement-ai/briefcase-presentation-authority.ts`
- `src/lib/expungement-ai/verification-cas.ts`
- `scripts/verify-shared-claim-boundary-app.mjs`
- `scripts/verify-shared-claim-boundary-db.mjs`
- `scripts/test-briefcase-presentation-authority.mjs`

**Required deliverables.**

- An atomic, exactly-once claim: one winner under concurrency, no stranded slot on rollback.
- A matter and Briefcase that are never anonymous, with user_id NOT NULL enforced in the database rather than only in the application.
- Review and Edit that is deterministic and reversible and that changes the render input hash.
- Verification invalidation: a stale specification refuses to render.
- Denials proven for anonymous access, wrong user and wrong matter.

**Required tests.**

```
node scripts/verify-shared-claim-boundary-db.mjs
node scripts/verify-shared-claim-boundary-app.mjs
node scripts/verify-rcap-briefcase-result-persistence.mjs
node scripts/test-briefcase-presentation-authority.mjs
npm run typecheck
npm test
```

**Stop conditions.**

- The identity gate does not print 0cad61625a74665db23ac64988c301e48909cf81 for origin/claude/new-session-7rsiqq: return ENVIRONMENT MISROUTED without editing a file.
- A change is required inside a captain-only path: stop and return a patch request; do not claim the path.
- A required official source hash cannot be recomputed from the mounted corpus: stop rather than reading the hash back from a committed record.
- Any Production deployment, migration, environment change, secret change, Stripe live-mode call, participant creation, sponsored-credit consumption or domain activation would be needed: stop and return the blocker.
- A change to payment, sponsorship, rendering or delivery would be needed: that is lane F; return a patch request instead.

### Lane F — Codex — `active`

| Field | Value |
|---|---|
| shardId | `S-F1` |
| laneBranch | `codex/lane-f-payment-sponsorship-delivery` |
| baseSha / remoteBaseSha | `0cad61625a74665db23ac64988c301e48909cf81` |
| jurisdictions | applies to all 51 jurisdictions; commercial admission is jurisdiction-independent |
| packetFamilyIds | no packet family of its own: this lane fulfills whatever the authority admits |
| routeIds | applies to every route id in data/rcap-ledger/launch-graph.json; every route is gated through admitCommercial and today every route is denied |
| sourceIdentities | no official source document is consumed by this lane |
| sourceHashes | not applicable: this lane consumes no official source bytes |
| requiredReturnCommit | not yet returned: the worker returns one exact 40-character commit SHA on codex/lane-f-payment-sponsorship-delivery |

**Owned paths.**

- `src/lib/rcap/render/`
- `src/lib/expungement-ai/payment-adapter.ts`
- `src/lib/expungement-ai/consumer-payment-authority.ts`
- `src/lib/expungement-ai/checkout-reconciliation.ts`
- `src/lib/expungement-ai/consumer-render-request.ts`
- `src/lib/expungement-ai/packet-generation.ts`
- `src/app/api/expungement-ai/checkout/`
- `src/app/api/expungement-ai/packet/`

**Required deliverables.**

- Every one of the nine commercial admission points gated through admitCommercial(point, identity), with no second commercial rule created anywhere.
- Consumer and sponsored paths admitted by the same function, not by parallel code paths.
- Payment and sponsorship idempotency: a receipt is single-use and a repeat consumes nothing.
- Durable render, artifact validation, private delivery, download and repeat download.

**Required tests.**

```
node scripts/verify-rcap-phase52-consumer-payment-authority.mjs
node scripts/test-rcap-phase52-mutations.mjs
node scripts/verify-rcap-phase51-consumer-payment-security.mjs
node scripts/verify-rcap-packet-delivery-e2e.mjs
node scripts/verify-stripe-runtime-key-policy.mjs
npm run typecheck
npm test
```

**Stop conditions.**

- The identity gate does not print 0cad61625a74665db23ac64988c301e48909cf81 for origin/claude/new-session-7rsiqq: return ENVIRONMENT MISROUTED without editing a file.
- A change is required inside a captain-only path: stop and return a patch request; do not claim the path.
- A required official source hash cannot be recomputed from the mounted corpus: stop rather than reading the hash back from a committed record.
- Any Production deployment, migration, environment change, secret change, Stripe live-mode call, participant creation, sponsored-credit consumption or domain activation would be needed: stop and return the blocker.
- A route appears to need commercial enabling: it does not. admitCommercial denies every route today because commercially eligible is zero. Do not add an override, a bypass or a second rule.
- Stripe live mode, a real charge, a real participant or a sponsored-credit consumption would be needed: stop. Test mode and synthetic evidence only.

### Lane G-CODE — Codex — `active`

| Field | Value |
|---|---|
| shardId | `S-GCODE-ALAKKYNEVT` |
| laneBranch | `codex/lane-g-code-shard-1` |
| baseSha / remoteBaseSha | `0cad61625a74665db23ac64988c301e48909cf81` |
| jurisdictions | AL, AK, KY, NE, VT |
| packetFamilyIds | alabama, alaska, kentucky, nebraska, vermont |
| routeIds | 26 concrete route ids, enumerated in the JSON |
| sourceIdentities | 51 official source files, enumerated in the JSON |
| sourceHashes | 51 SHA-256 digests, recomputed from the mounted corpus |
| requiredReturnCommit | not yet returned: the worker returns one exact 40-character commit SHA on codex/lane-g-code-shard-1 |

**Owned paths.**

- `data/rcap-all50/overlays/production/alabama/`
- `data/rcap-all50/overlays/production/alaska/`
- `data/rcap-all50/overlays/production/kentucky/`
- `data/rcap-all50/overlays/production/nebraska/`
- `data/rcap-all50/overlays/production/vermont/`
- `src/lib/rcap/state-packs/alabama/`
- `src/lib/rcap/state-packs/alaska/`
- `src/lib/rcap/state-packs/kentucky/`
- `src/lib/rcap/state-packs/nebraska/`
- `src/lib/rcap/state-packs/vermont/`

**Required deliverables.**

- For each assigned family: official source identity and hash recomputed from the mounted corpus, not read back from a record.
- A field census, field classification and protected-field scan per official form.
- A deterministic fixture and a rendered artifact with its SHA-256.
- A truthful route disposition for every assigned route id.

**Required tests.**

```
node scripts/verify-rcap-hard-form-dispositions.mjs
node scripts/verify-rcap-hard-form-outputs.mjs
node scripts/generate-packet-family-build-status.mjs --check
npm run typecheck
npm test
```

**Stop conditions.**

- The identity gate does not print 0cad61625a74665db23ac64988c301e48909cf81 for origin/claude/new-session-7rsiqq: return ENVIRONMENT MISROUTED without editing a file.
- A change is required inside a captain-only path: stop and return a patch request; do not claim the path.
- A required official source hash cannot be recomputed from the mounted corpus: stop rather than reading the hash back from a committed record.
- Any Production deployment, migration, environment change, secret change, Stripe live-mode call, participant creation, sponsored-credit consumption or domain activation would be needed: stop and return the blocker.
- A family outside this shard's packetFamilyIds would need editing: stop. Another shard owns it.
- An official form is absent for an assigned route: produce a guidance fallback and record the disposition honestly. Never disguise unfinished packet work as guidance.

### Lane H — Codex — `active`

| Field | Value |
|---|---|
| shardId | `S-H1` |
| laneBranch | `codex/lane-h-clinic-security-acceptance` |
| baseSha / remoteBaseSha | `0cad61625a74665db23ac64988c301e48909cf81` |
| jurisdictions | applies to all 51 jurisdictions through the hosted acceptance journeys |
| packetFamilyIds | no packet family: this lane proves surfaces and builds no packet |
| routeIds | the hosted acceptance journeys enumerated in data/rcap-all50/hosted-acceptance-journeys.json |
| sourceIdentities | no official source document is consumed by this lane |
| sourceHashes | not applicable: this lane consumes no official source bytes |
| requiredReturnCommit | not yet returned: the worker returns one exact 40-character commit SHA on codex/lane-h-clinic-security-acceptance |

**Owned paths.**

- `scripts/security/`
- `scripts/verify-internal-admin-security-tools.mjs`
- `scripts/test-internal-admin-rls-hardening.mjs`
- `src/lib/clinic-mode/`
- `tsconfig.clinic-mode.json`

**Required deliverables.**

- Security denial proof: anonymous, wrong-user, wrong-matter and cross-tenant access all denied.
- Clinic acceptance including shared-device reset clearing participant state.
- Mobile and accessibility evidence.
- Local harness work started immediately; this lane does not idle waiting for a Preview.

**Required tests.**

```
node scripts/security/test-auth-redirect-security.mjs
node scripts/security/test-sign-out-origin.mjs
node scripts/security/test-internal-admin-remediation.mjs
node scripts/verify-internal-admin-security-tools.mjs
node scripts/test-internal-admin-rls-hardening.mjs
npm test
```

**Stop conditions.**

- The identity gate does not print 0cad61625a74665db23ac64988c301e48909cf81 for origin/claude/new-session-7rsiqq: return ENVIRONMENT MISROUTED without editing a file.
- A change is required inside a captain-only path: stop and return a patch request; do not claim the path.
- A required official source hash cannot be recomputed from the mounted corpus: stop rather than reading the hash back from a committed record.
- Any Production deployment, migration, environment change, secret change, Stripe live-mode call, participant creation, sponsored-credit consumption or domain activation would be needed: stop and return the blocker.
- The Production-facing verifiers (verify-rcap-production-activation, -canary, -smoke, -clinic-migrate and their mutation harnesses) are recorded keep_available and are not in the test chain. Do not wire them in and do not run them.
- A browser-dependent check fails on a missing Chromium revision: bridge it in the environment. Never change a repository file, and never skip, disable or quarantine a security check to get green.

### Lane G-DOC — Claude Opus 5 — `queued`

| Field | Value |
|---|---|
| shardId | `S-GDOC-ARCONC` |
| laneBranch | `claude/lane-g-doc-shard-1` |
| baseSha / remoteBaseSha | `0cad61625a74665db23ac64988c301e48909cf81` |
| jurisdictions | AR, CO, NC |
| packetFamilyIds | arkansas, colorado, north-carolina |
| routeIds | 9 concrete route ids, enumerated in the JSON |
| sourceIdentities | 71 official source files, enumerated in the JSON |
| sourceHashes | 71 SHA-256 digests, recomputed from the mounted corpus |
| requiredReturnCommit | not yet returned: the worker returns one exact 40-character commit SHA on claude/lane-g-doc-shard-1 |

**Owned paths.**

- `data/rcap-all50/overlays/production/arkansas/`
- `data/rcap-all50/overlays/production/colorado/`
- `data/rcap-all50/overlays/production/north-carolina/`
- `src/lib/rcap/state-packs/arkansas/`
- `src/lib/rcap/state-packs/colorado/`
- `src/lib/rcap/state-packs/north-carolina/`

**Required deliverables.**

- For each assigned family: official source identity and hash recomputed from the mounted corpus, not read back from a record.
- A field census, field classification and protected-field scan per official form.
- A deterministic fixture and a rendered artifact with its SHA-256.
- A truthful route disposition for every assigned route id.

**Required tests.**

```
node scripts/verify-rcap-hard-form-dispositions.mjs
node scripts/verify-rcap-hard-form-outputs.mjs
node scripts/generate-packet-family-build-status.mjs --check
npm run typecheck
npm test
```

**Stop conditions.**

- The identity gate does not print 0cad61625a74665db23ac64988c301e48909cf81 for origin/claude/new-session-7rsiqq: return ENVIRONMENT MISROUTED without editing a file.
- A change is required inside a captain-only path: stop and return a patch request; do not claim the path.
- A required official source hash cannot be recomputed from the mounted corpus: stop rather than reading the hash back from a committed record.
- Any Production deployment, migration, environment change, secret change, Stripe live-mode call, participant creation, sponsored-credit consumption or domain activation would be needed: stop and return the blocker.
- A family outside this shard's packetFamilyIds would need editing: stop. Another shard owns it.
- An official form is absent for an assigned route: produce a guidance fallback and record the disposition honestly. Never disguise unfinished packet work as guidance.

## Return protocol

A worker returns one exact 40-character commit SHA, the commands it ran, and
their result. The captain reviews the commit, reruns the lane tests against the
current captain head, and integrates. Whole branches are never merged.
