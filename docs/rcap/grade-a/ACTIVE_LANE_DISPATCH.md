# Active lane dispatch — all Claude

Machine-readable source: `data/rcap-grade-a/active-lane-envelopes.json`.
Checked by: `node scripts/verify-active-lane-envelopes.mjs`.

Codex is removed from this sprint. Every active lane runs Claude Opus 5.
Historical Codex branches remain in the remote as history; they authorize
nothing and are not active lanes. The verifier fails if an active lane names a
Codex model or a `codex/` branch.

| | |
|---|---|
| Controlling branch | `claude/legalease-sprint-captain-utucnw` |
| Active base SHA | `be673158bae0f3ffdb8b4c4408f989bcf69720e4` |

## Status

| Lane | Model | Status | Branch | Families | Routes |
|---|---|---|---|---|---|
| B | Claude Opus 5 | `integrated` | `claude/legalease-sprint-captain-utucnw` | grade-a-fulfillment-authority | 8 |
| C | Claude Opus 5 | `integrated` | `claude/legalease-sprint-captain-utucnw` | oregon | 3 |
| D | Claude Opus 5 | `integrated` | `claude/legalease-sprint-captain-utucnw` | north-dakota | 5 |
| E | Claude Opus 5 | `active` | `claude/grade-a-68h-lane-e` | none | route-independent |
| F | Claude Opus 5 | `active` | `claude/grade-a-68h-lane-f` | none | route-independent |
| G | Claude Opus 5 | `active` | `claude/grade-a-68h-lane-g` | colorado | 3 |
| H | Claude Opus 5 | `active` | `claude/grade-a-68h-lane-h` | none | route-independent |

Concurrency: Captain A plus lanes E, F, G and H. Lane G may use at most three internal subagents for genuinely independent state-family analysis; the captain, the four lanes and those subagents together must not exceed eight.

## Captain-only paths

No worker writes these. A lane needing a change here returns a patch request.

- `package.json`
- `package-lock.json`
- `data/rcap-verifier-dispositions.json`
- `data/rcap-ledger/`
- `data/rcap-grade-a/`
- `supabase/migrations/`
- `docs/rcap/grade-a/captain/`

## Identity gate — run before the first edit

```
git remote get-url origin
git fetch origin --prune
git rev-parse origin/claude/legalease-sprint-captain-utucnw
```

A lane branches from `be673158bae0f3ffdb8b4c4408f989bcf69720e4`, which is where all four
lane branches already begin. Do not reset or replace them.

## Per-lane envelopes

### Lane E — Claude Opus 5

| Field | Value |
|---|---|
| laneBranch | `claude/grade-a-68h-lane-e` |
| baseSha / remoteBaseSha | `be673158bae0f3ffdb8b4c4408f989bcf69720e4` |
| shardId | `S-E1` |
| jurisdictions | applies to all 51 jurisdictions; the claim boundary is jurisdiction-independent |
| packetFamilyIds | no packet family: this lane renders no packet |
| routeIds | applies to every route id in data/rcap-ledger/launch-graph.json; the claim boundary is route-independent and is asserted once for all 256 |
| sourceIdentities | no official source document is consumed by this lane |
| sourceHashes | not applicable: this lane consumes no official source bytes |

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

- The identity gate does not print be673158bae0f3ffdb8b4c4408f989bcf69720e4 for origin/claude/new-session-7rsiqq: return ENVIRONMENT MISROUTED without editing a file.
- A change is required inside a captain-only path: stop and return a patch request; do not claim the path.
- A required official source hash cannot be recomputed from the mounted corpus: stop rather than reading the hash back from a committed record.
- Any Production deployment, migration, environment change, secret change, Stripe live-mode call, participant creation, sponsored-credit consumption or domain activation would be needed: stop and return the blocker.
- A change to payment, sponsorship, rendering or delivery would be needed: that is lane F; return a patch request instead.

### Lane F — Claude Opus 5

| Field | Value |
|---|---|
| laneBranch | `claude/grade-a-68h-lane-f` |
| baseSha / remoteBaseSha | `be673158bae0f3ffdb8b4c4408f989bcf69720e4` |
| shardId | `S-F1` |
| jurisdictions | applies to all 51 jurisdictions; commercial admission is jurisdiction-independent |
| packetFamilyIds | no packet family of its own: this lane fulfills whatever the authority admits |
| routeIds | applies to every route id in data/rcap-ledger/launch-graph.json; every route is gated through admitCommercial and today every route is denied |
| sourceIdentities | no official source document is consumed by this lane |
| sourceHashes | not applicable: this lane consumes no official source bytes |

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

- The identity gate does not print be673158bae0f3ffdb8b4c4408f989bcf69720e4 for origin/claude/new-session-7rsiqq: return ENVIRONMENT MISROUTED without editing a file.
- A change is required inside a captain-only path: stop and return a patch request; do not claim the path.
- A required official source hash cannot be recomputed from the mounted corpus: stop rather than reading the hash back from a committed record.
- Any Production deployment, migration, environment change, secret change, Stripe live-mode call, participant creation, sponsored-credit consumption or domain activation would be needed: stop and return the blocker.
- A route appears to need commercial enabling: it does not. admitCommercial denies every route today because commercially eligible is zero. Do not add an override, a bypass or a second rule.
- Stripe live mode, a real charge, a real participant or a sponsored-credit consumption would be needed: stop. Test mode and synthetic evidence only.

### Lane G — Claude Opus 5

| Field | Value |
|---|---|
| laneBranch | `claude/grade-a-68h-lane-g` |
| baseSha / remoteBaseSha | `be673158bae0f3ffdb8b4c4408f989bcf69720e4` |
| shardId | `S-G-CO` |
| jurisdictions | CO |
| packetFamilyIds | colorado |
| routeIds | CO:juvenile-expungement-19-1-306, CO:petition-based-conviction-sealing-jdf-612-24-72-706, CO:petition-based-non-conviction-sealing-jdf-417-24-72-704 |
| sourceIdentities | 23 official source files, enumerated in the JSON |
| sourceHashes | 23 SHA-256 digests recomputed from the mounted corpus |

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

- Recompute every Colorado official source hash from the mounted corpus at start; stop rather than reading a hash back from a record.
- A field census, field classification and protected-field scan per official Colorado form.
- A deterministic fixture and a rendered artifact with its SHA-256 for each packet in the family.
- A truthful route disposition for every Colorado route id listed in this envelope.

**Required tests.**

```
node scripts/verify-rcap-hard-form-dispositions.mjs
node scripts/verify-rcap-hard-form-outputs.mjs
node scripts/generate-packet-family-build-status.mjs --check
npm run typecheck
npm test
```

**Stop conditions.**

- The identity gate does not print be673158bae0f3ffdb8b4c4408f989bcf69720e4 for origin/claude/new-session-7rsiqq: return ENVIRONMENT MISROUTED without editing a file.
- A change is required inside a captain-only path: stop and return a patch request; do not claim the path.
- A required official source hash cannot be recomputed from the mounted corpus: stop rather than reading the hash back from a committed record.
- Any Production deployment, migration, environment change, secret change, Stripe live-mode call, participant creation, sponsored-credit consumption or domain activation would be needed: stop and return the blocker.
- A family outside this shard's packetFamilyIds would need editing: stop. Another shard owns it.
- An official form is absent for an assigned route: produce a guidance fallback and record the disposition honestly. Never disguise unfinished packet work as guidance.

### Lane H — Claude Opus 5

| Field | Value |
|---|---|
| laneBranch | `claude/grade-a-68h-lane-h` |
| baseSha / remoteBaseSha | `be673158bae0f3ffdb8b4c4408f989bcf69720e4` |
| shardId | `S-H1` |
| jurisdictions | applies to all 51 jurisdictions through the hosted acceptance journeys |
| packetFamilyIds | no packet family: this lane proves surfaces and builds no packet |
| routeIds | the hosted acceptance journeys enumerated in data/rcap-all50/hosted-acceptance-journeys.json |
| sourceIdentities | no official source document is consumed by this lane |
| sourceHashes | not applicable: this lane consumes no official source bytes |

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

- The identity gate does not print be673158bae0f3ffdb8b4c4408f989bcf69720e4 for origin/claude/new-session-7rsiqq: return ENVIRONMENT MISROUTED without editing a file.
- A change is required inside a captain-only path: stop and return a patch request; do not claim the path.
- A required official source hash cannot be recomputed from the mounted corpus: stop rather than reading the hash back from a committed record.
- Any Production deployment, migration, environment change, secret change, Stripe live-mode call, participant creation, sponsored-credit consumption or domain activation would be needed: stop and return the blocker.
- The Production-facing verifiers (verify-rcap-production-activation, -canary, -smoke, -clinic-migrate and their mutation harnesses) are recorded keep_available and are not in the test chain. Do not wire them in and do not run them.
- A browser-dependent check fails on a missing Chromium revision: bridge it in the environment. Never change a repository file, and never skip, disable or quarantine a security check to get green.

## Grade-A control

Only `COMPLETE_PACKET_PROVEN` may open checkout, sponsored entitlement,
packet-credit consumption, generation, provider dispatch, artifact attachment,
Briefcase Ready, private download, repeat download or commercial launch status.
A rendered PDF, a passing synthetic payment and an existing payment record are
not commercial authority. Commercially eligible is currently 0.
