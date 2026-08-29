# Lane dispatch — all Claude — CLOSED

> **No lane is active.** All eleven — B, C, D, E, F, G, H, G-CO-SOURCE,
> G-CO-BUILD, I and J — are integrated as of head
> `1af36f03d8c9c08c9c3c17e9a5516f64a649b003`. Nothing below is a live
> instruction; the envelopes are kept as the record of what each lane was
> actually handed. `data/rcap-grade-a/active-lane-envelopes.json` remains the
> machine-readable source and `verify-rcap-active-lane-envelopes` still checks
> it, including a synthetic active lane so the dispatch rules stay proven
> between waves.

Machine-readable source: `data/rcap-grade-a/active-lane-envelopes.json`.
Checked by: `node scripts/verify-active-lane-envelopes.mjs`.

Every active lane runs Claude Opus 5. The verifier fails an active envelope that
carries any reference to a retired worker family, names a return branch other than
its own, names another lane's branch or base in a stop condition, bases on a commit
the captain branch does not contain, bases on the historical sprint base, or runs an
identity gate for a base or branch that is not its own.

It also fails the equality form of the identity gate. A gate that requires the live
captain tip to *equal* a worker's base is false the moment the captain commits
anything after dispatch, and a worker cannot tell that from a genuinely wrong clone.
Gates assert lineage instead: the base is contained in the captain branch, and the
lane branch contains the base. Both stay true as the captain branch grows.

## Bases

| | |
|---|---|
| Historical sprint base | `0cad61625a74665db23ac64988c301e48909cf81` — historical only; no identity gate reads it |
| Active base | `be673158bae0f3ffdb8b4c4408f989bcf69720e4` |
| Active base | `61ee6cc359bc19d32c6c071194e62a553446ca08` |
| Active base | `148382ab2a2acbe673b6d35c8967f5a908342e60` |

**`be673158bae0`** — Lanes E and H were dispatched from this base and are already running. Their branches begin here and must not be reset; their exact commits are transplanted onto the captain head when they return.

**`61ee6cc359bc`** — The consolidated Lane B, C and D base. Lanes F and G are dispatched fresh from it because both depend on the corrected Grade-A source-proof model and the v2 admission contract, which do not exist at the earlier base.

**`148382ab2a2a`** — The post-Colorado-audit base. The four closeout lanes are dispatched from it because each depends on work that does not exist earlier: the corrected Colorado registry, the integrated E ownership boundary, the F commercial admission treatment, and the H security and hosted runner.

Corpus bootstrap: `bash scripts/rcap-corpus/bootstrap-private-corpus.sh`

## Status

| Lane | Model | Status | Branch | Base | Families | Routes |
|---|---|---|---|---|---|---|
| B | Claude Opus 5 | `integrated` | `claude/legalease-sprint-captain-utucnw` | `0cad61625a74` | grade-a-fulfillment-authority | 8 |
| C | Claude Opus 5 | `integrated` | `claude/legalease-sprint-captain-utucnw` | `0cad61625a74` | oregon | 3 |
| D | Claude Opus 5 | `integrated` | `claude/legalease-sprint-captain-utucnw` | `0cad61625a74` | north-dakota | 5 |
| E | Claude Opus 5 | `integrated` | `claude/grade-a-68h-lane-e` | `be673158bae0` | none | route-independent |
| F | Claude Opus 5 | `integrated` | `claude/grade-a-v5-lane-f` | `61ee6cc359bc` | none | route-independent |
| G | Claude Opus 5 | `integrated` | `claude/grade-a-v5-lane-g-family-1` | `61ee6cc359bc` | colorado | 3 |
| H | Claude Opus 5 | `integrated` | `claude/grade-a-68h-lane-h` | `be673158bae0` | none | route-independent |
| G-CO-SOURCE | Claude Opus 5 | `integrated` | `claude/grade-a-v6-co-source` | `148382ab2a2a` | colorado | 3 |
| G-CO-BUILD | Claude Opus 5 | `integrated` | `claude/colorado-packet-deterministic-n4zdlz` (the harness pushed here; the designated `claude/grade-a-v6-co-build` still points at the base) | `148382ab2a2a` | colorado | 3 |
| I | Claude Opus 5 | `integrated` | `claude/grade-a-v6-first-packet-oregon` | `148382ab2a2a` | oregon | 3 |
| J | Claude Opus 5 | `integrated` | `claude/grade-a-v6-release-blockers` | `148382ab2a2a` | none | route-independent |

Concurrency: Captain A alone. Every lane is integrated and none occupies a session. The eight-session limit stands for any future dispatch.

## Captain-only paths

No worker writes these, and no worker may list one in its owned paths.

- `package.json`
- `package-lock.json`
- `data/rcap-verifier-dispositions.json`
- `data/rcap-ledger/`
- `data/rcap-grade-a/`
- `supabase/migrations/`
- `docs/rcap/grade-a/captain/`

## Commercial admission points

Lane F must cover exactly the set exported as `COMMERCIAL_ADMISSION_POINTS`.
The verifier imports that constant rather than restating it, so a point added to
the authority fails this dispatch until the envelope agrees.

- `consumer_checkout`
- `sponsored_entitlement`
- `packet_credit_admission`
- `generation_admission`
- `provider_dispatch`
- `artifact_commercial_attachment`
- `briefcase_ready`
- `private_download`
- `repeat_download`
- `launch_graph_commercial_status`

## Per-lane envelopes

### Lane E — Claude Opus 5

| Field | Value |
|---|---|
| laneBranch | `claude/grade-a-68h-lane-e` |
| controllingBranch | `claude/legalease-sprint-captain-utucnw` |
| baseSha / remoteBaseSha | `be673158bae0f3ffdb8b4c4408f989bcf69720e4` |
| shardId | `S-E1` |
| jurisdictions | applies to all 51 jurisdictions; the claim boundary is jurisdiction-independent |
| packetFamilyIds | no packet family: this lane renders no packet |
| routeIds | applies to every route id in data/rcap-ledger/launch-graph.json; the claim boundary is route-independent and is asserted once for all 256 |
| sourceIdentities | no official source document is consumed by this lane |
| sourceHashes | not applicable: this lane consumes no official source bytes |
| requiredReturnCommit | not yet returned: the worker returns one exact 40-character commit SHA on claude/grade-a-68h-lane-e |

**Owned paths.**

- `src/lib/rcap/briefcase/`
- `src/lib/expungement-ai/claim/`
- `src/lib/expungement-ai/briefcase.ts`
- `src/lib/expungement-ai/briefcase-presentation-authority.ts`
- `src/lib/expungement-ai/verification-cas.ts`
- `scripts/verify-shared-claim-boundary-app.mjs`
- `scripts/verify-shared-claim-boundary-db.mjs`
- `scripts/test-briefcase-presentation-authority.mjs`

**Prohibited shared paths.**

- `package.json`
- `package-lock.json`
- `data/rcap-verifier-dispositions.json`
- `data/rcap-ledger/`
- `data/rcap-grade-a/`
- `supabase/migrations/`
- `docs/rcap/grade-a/captain/`
- `src/lib/rcap/fulfillment/`
- `src/lib/record-clearing/`
- `src/lib/expungement-ai/payment-adapter.ts`
- `src/lib/expungement-ai/consumer-payment-authority.ts`
- `src/lib/rcap/render/`
- `data/rcap-all50/overlays/lane-c-candidates/`

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

- The identity gate does not print be673158bae0f3ffdb8b4c4408f989bcf69720e4 for origin/claude/legalease-sprint-captain-utucnw: return ENVIRONMENT MISROUTED without editing a file.
- A change is required inside a captain-only path: stop and return a patch request; do not claim the path.
- A required official source hash cannot be recomputed from the mounted corpus: stop rather than reading the hash back from a committed record.
- Any Production deployment, migration, environment change, secret change, Stripe live-mode call, participant creation, sponsored-credit consumption or domain activation would be needed: stop and return the blocker.
- A change to payment, sponsorship, rendering or delivery would be needed: that is lane F; return a patch request instead.

### Lane F — Claude Opus 5

| Field | Value |
|---|---|
| laneBranch | `claude/grade-a-v5-lane-f` |
| controllingBranch | `claude/legalease-sprint-captain-utucnw` |
| baseSha / remoteBaseSha | `61ee6cc359bc19d32c6c071194e62a553446ca08` |
| shardId | `S-F1` |
| jurisdictions | applies to all 51 jurisdictions; commercial admission is jurisdiction-independent |
| packetFamilyIds | no packet family of its own: this lane fulfills whatever the authority admits |
| routeIds | applies to every route id in data/rcap-ledger/launch-graph.json; every route is gated through admitCommercial and today every route is denied |
| sourceIdentities | no official source document is consumed by this lane |
| sourceHashes | not applicable: this lane consumes no official source bytes |
| requiredReturnCommit | not yet returned: the worker returns one exact 40-character commit SHA on claude/grade-a-v5-lane-f |

**Owned paths.**

- `src/lib/rcap/render/`
- `src/lib/expungement-ai/payment-adapter.ts`
- `src/lib/expungement-ai/consumer-payment-authority.ts`
- `src/lib/expungement-ai/checkout-reconciliation.ts`
- `src/lib/expungement-ai/consumer-render-request.ts`
- `src/lib/expungement-ai/packet-generation.ts`
- `src/app/api/expungement-ai/checkout/`
- `src/app/api/expungement-ai/packet/`

**Prohibited shared paths.**

- `package.json`
- `package-lock.json`
- `data/rcap-verifier-dispositions.json`
- `data/rcap-ledger/`
- `data/rcap-grade-a/`
- `supabase/migrations/`
- `docs/rcap/grade-a/captain/`
- `src/lib/rcap/fulfillment/`
- `src/lib/rcap/briefcase/`
- `src/lib/expungement-ai/claim/`
- `src/lib/record-clearing/`
- `data/rcap-all50/overlays/lane-c-candidates/`

**Required deliverables.**

- Every value exported by COMMERCIAL_ADMISSION_POINTS gated through admitCommercial(point, identity), each with exactly one governed call-site treatment and no second commercial rule anywhere.
- Consumer and sponsored paths admitted by the same function, not by parallel code paths.
- Payment and sponsorship idempotency: a receipt is single-use and a repeat consumes nothing.
- Durable render, artifact validation, private delivery, download and repeat download.
- An acceptance verifier that imports COMMERCIAL_ADMISSION_POINTS from the authority rather than restating it, and fails if any exported point has no governed call site or more than one.

**Required tests.**

```
node scripts/verify-active-lane-envelopes.mjs
node scripts/verify-rcap-phase52-consumer-payment-authority.mjs
node scripts/test-rcap-phase52-mutations.mjs
node scripts/verify-rcap-phase51-consumer-payment-security.mjs
node scripts/verify-rcap-packet-delivery-e2e.mjs
node scripts/verify-stripe-runtime-key-policy.mjs
npm run typecheck
npm test
```

**Stop conditions.**

- The identity gate does not print 61ee6cc359bc19d32c6c071194e62a553446ca08 for origin/claude/legalease-sprint-captain-utucnw: return ENVIRONMENT MISROUTED without editing a file.
- A change is required inside a captain-only path: stop and return a patch request; do not claim the path.
- A required official source hash cannot be recomputed from the mounted corpus: stop rather than reading the hash back from a committed record.
- Any Production deployment, migration, environment change, secret change, Stripe live-mode call, participant creation, sponsored-credit consumption or domain activation would be needed: stop and return the blocker.
- A route appears to need commercial enabling: it does not. admitCommercial denies every route today because commercially eligible is zero. Do not add an override, a bypass or a second rule.
- Stripe live mode, a real charge, a real participant or a sponsored-credit consumption would be needed: stop. Test mode and synthetic evidence only.

### Lane G — Claude Opus 5

| Field | Value |
|---|---|
| laneBranch | `claude/grade-a-v5-lane-g-family-1` |
| controllingBranch | `claude/legalease-sprint-captain-utucnw` |
| baseSha / remoteBaseSha | `61ee6cc359bc19d32c6c071194e62a553446ca08` |
| shardId | `S-G-CO` |
| jurisdictions | CO |
| packetFamilyIds | colorado |
| routeIds | CO:juvenile-expungement-19-1-306, CO:petition-based-conviction-sealing-jdf-612-24-72-706, CO:petition-based-non-conviction-sealing-jdf-417-24-72-704 |
| sourceIdentities | 23 official source files, enumerated in the JSON |
| sourceHashes | 23 SHA-256 digests recomputed from the mounted corpus |
| requiredReturnCommit | not yet returned: the worker returns one exact 40-character commit SHA on claude/grade-a-v5-lane-g-family-1 |

**Owned paths.**

- `data/rcap-all50/overlays/production/colorado/`
- `src/lib/rcap/state-packs/colorado/`

**Prohibited shared paths.**

- `package.json`
- `package-lock.json`
- `data/rcap-verifier-dispositions.json`
- `data/rcap-ledger/`
- `data/rcap-grade-a/`
- `supabase/migrations/`
- `docs/rcap/grade-a/captain/`
- `src/lib/rcap/fulfillment/`
- `src/lib/rcap/briefcase/`
- `src/lib/record-clearing/`
- `data/rcap-all50/overlays/lane-c-candidates/`
- `data/rcap-lane-d/`

**Required deliverables.**

- Run the committed corpus bootstrap first: bash scripts/rcap-corpus/bootstrap-private-corpus.sh
- Recompute every Colorado official source hash from the mounted corpus at start; stop rather than reading a hash back from a record.
- A field census, field classification and protected-field scan per official Colorado form.
- A deterministic fixture and a rendered artifact with its SHA-256 for each packet in the family.
- A truthful route disposition for every Colorado route id listed in this envelope.

**Required tests.**

```
bash scripts/rcap-corpus/bootstrap-private-corpus.sh
node scripts/verify-rcap-hard-form-dispositions.mjs
node scripts/verify-rcap-hard-form-outputs.mjs
node scripts/generate-packet-family-build-status.mjs --check
npm run typecheck
npm test
```

**Stop conditions.**

- The identity gate does not print 61ee6cc359bc19d32c6c071194e62a553446ca08 for origin/claude/legalease-sprint-captain-utucnw: return ENVIRONMENT MISROUTED without editing a file.
- A change is required inside a captain-only path: stop and return a patch request; do not claim the path.
- A required official source hash cannot be recomputed from the mounted corpus: stop rather than reading the hash back from a committed record.
- Any Production deployment, migration, environment change, secret change, Stripe live-mode call, participant creation, sponsored-credit consumption or domain activation would be needed: stop and return the blocker.
- A family outside this shard's packetFamilyIds would need editing: stop. Another shard owns it.
- An official form is absent for an assigned route: produce a guidance fallback and record the disposition honestly. Never disguise unfinished packet work as guidance.

### Lane H — Claude Opus 5

| Field | Value |
|---|---|
| laneBranch | `claude/grade-a-68h-lane-h` |
| controllingBranch | `claude/legalease-sprint-captain-utucnw` |
| baseSha / remoteBaseSha | `be673158bae0f3ffdb8b4c4408f989bcf69720e4` |
| shardId | `S-H1` |
| jurisdictions | applies to all 51 jurisdictions through the hosted acceptance journeys |
| packetFamilyIds | no packet family: this lane proves surfaces and builds no packet |
| routeIds | the hosted acceptance journeys enumerated in data/rcap-all50/hosted-acceptance-journeys.json |
| sourceIdentities | no official source document is consumed by this lane |
| sourceHashes | not applicable: this lane consumes no official source bytes |
| requiredReturnCommit | not yet returned: the worker returns one exact 40-character commit SHA on claude/grade-a-68h-lane-h |

**Owned paths.**

- `scripts/security/`
- `scripts/verify-internal-admin-security-tools.mjs`
- `scripts/test-internal-admin-rls-hardening.mjs`
- `src/lib/clinic-mode/`
- `tsconfig.clinic-mode.json`

**Prohibited shared paths.**

- `package.json`
- `package-lock.json`
- `data/rcap-verifier-dispositions.json`
- `data/rcap-ledger/`
- `data/rcap-grade-a/`
- `supabase/migrations/`
- `docs/rcap/grade-a/captain/`
- `src/lib/rcap/fulfillment/`
- `src/lib/rcap/render/`
- `src/lib/expungement-ai/claim/`
- `src/lib/record-clearing/`
- `data/rcap-all50/overlays/lane-c-candidates/`

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

- The identity gate does not print be673158bae0f3ffdb8b4c4408f989bcf69720e4 for origin/claude/legalease-sprint-captain-utucnw: return ENVIRONMENT MISROUTED without editing a file.
- A change is required inside a captain-only path: stop and return a patch request; do not claim the path.
- A required official source hash cannot be recomputed from the mounted corpus: stop rather than reading the hash back from a committed record.
- Any Production deployment, migration, environment change, secret change, Stripe live-mode call, participant creation, sponsored-credit consumption or domain activation would be needed: stop and return the blocker.
- The Production-facing verifiers (verify-rcap-production-activation, -canary, -smoke, -clinic-migrate and their mutation harnesses) are recorded keep_available and are not in the test chain. Do not wire them in and do not run them.
- A browser-dependent check fails on a missing Chromium revision: bridge it in the environment. Never change a repository file, and never skip, disable or quarantine a security check to get green.

## Closeout lanes — the lineage identity gate

The four active lanes share one identity gate, differing only in their own lane
branch. It is written out in full in each envelope; this is the shape.

Before any file is edited, the identity gate must establish all six of the
following; if any one of them fails, return `ENVIRONMENT MISROUTED` without
editing a file.

1. `148382ab2a2acbe673b6d35c8967f5a908342e60` exists as a commit in this clone.
2. `git merge-base --is-ancestor 148382ab2a2acbe673b6d35c8967f5a908342e60 origin/claude/legalease-sprint-captain-utucnw` exits zero, so the captain branch still contains this base. The captain tip may already be well ahead of it — every lane integrated after dispatch moves it — and the gate deliberately does not compare the two.
3. `git merge-base --is-ancestor 148382ab2a2acbe673b6d35c8967f5a908342e60 origin/<this lane's branch>` exits zero, so the lane branch contains the base as an ancestor.
4. At worker start, nothing but this lane's own commits sits between the base and the tip of the lane branch.
5. `git status --porcelain` prints nothing, so the worker begins from a clean worktree.
6. `git remote get-url origin` names `Roger-LegalEase/legalease-partner-dashboard-clean`.

The gates recorded for the integrated lanes E, F, G and H below are the equality
form these replace. They are left as written because they are the record of what
those lanes were actually handed, not instructions anyone runs now.

## Grade-A control

Only `COMPLETE_PACKET_PROVEN` may open checkout, sponsored entitlement,
packet-credit consumption, generation, provider dispatch, artifact attachment,
Briefcase Ready, private download, repeat download or commercial launch status.
A rendered PDF, a passing synthetic payment and an existing payment record are
not commercial authority. Commercially eligible is 0 and COMPLETE_PACKET_PROVEN is 0.
