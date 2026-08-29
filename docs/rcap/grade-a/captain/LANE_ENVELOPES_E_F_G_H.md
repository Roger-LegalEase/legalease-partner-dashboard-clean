# Captain Lane Envelopes — E, F, G-CODE, G-DOC, H

Issued by Captain A against controlling base
`0cad61625a74665db23ac64988c301e48909cf81`. These are the concrete envelopes a
worker needs before touching a file. No field is a placeholder.

## Model routing

One captain, two model families executing.

| Lane | Worker family |
|---|---|
| A — captain and integration | Claude Opus 5 |
| B — Grade-A fulfillment core | Claude Opus 5 |
| C — Oregon official-PDF reference | Claude Opus 5 |
| D — North Dakota composed pleading | Claude Opus 5 |
| G-DOC — document-heavy packet-family shards | Claude Opus 5 |
| E — atomic claim, ownership, matter, Briefcase | Codex |
| F — payment, sponsorship, credits, rendering, delivery | Codex |
| G-CODE — code-heavy packet-family shards | Codex |
| H — RCAP, Clinic, security, hosted QA | Codex |

A Codex worker that fails repository identity returns `ENVIRONMENT MISROUTED`
without edits, and that same lane is relaunched in a correctly attached Codex
repository environment. It is not reassigned to Claude.

## Identity gate every worker runs before its first edit

    git remote get-url origin
    git fetch origin --prune
    git rev-parse origin/claude/new-session-7rsiqq

The third command must print
`0cad61625a74665db23ac64988c301e48909cf81`. Anything else is
`ENVIRONMENT MISROUTED`. Lane branches are cut from that SHA, never from
`origin/main`, never from `07675789`, never from a local default.

## Corpus

    RCAP_BUNDLE_EXTRACT=private/source-imports/Expungement_AI_RCAP_Master_Library_Edition_1

Verified: 51 jurisdictions, 499 files, 329 PDFs, archive SHA-256
`a26e3ca7d52db4460e53c2eddd893109037702f5c8035f2c698a7e16bad84e89`,
498/498 governance checksums OK.

`OFFICIAL_FORMS_SOURCE_DIR` (the operational Nationwide tree) is **absent** and
is a different corpus. `scripts/rcap-official-forms/operational-corpus-precondition.mjs`
refuses a Master Library mounted at the operational path by name. Never
substitute one for the other.

## Captain-only files — no lane may write these

Shared generated registries; the global fulfillment ledger; the commercial
denominator; the launch graph; migration numbering and ordering; root
`package.json` and `package-lock.json`; ratification projections; candidate
freeze records; Preview and deployment records.

Concretely: `package.json`, `package-lock.json`,
`data/rcap-verifier-dispositions.json`, `data/rcap-ledger/**`,
`data/rcap-grade-a/**`, `supabase/migrations/**`. A lane needing a change here
returns a proposal; the captain applies it.

---

## LANE E — atomic claim, participant ownership, matter and Briefcase

| Field | Value |
|---|---|
| LANE | `E-claim-ownership-briefcase` |
| MODEL | Codex |
| BASE_SHA | `0cad61625a74665db23ac64988c301e48909cf81` |
| REMOTE_BASE_SHA | `0cad61625a74665db23ac64988c301e48909cf81` |
| LANE_BRANCH | `codex/lane-e-claim-ownership-briefcase` |
| WORKTREE | `worktrees/lane-e-claim` |
| SHARD_ID | `S-E1` |
| ROUTE_IDS | none directly; the claim boundary is asserted for all 256 route ids carried by `data/rcap-ledger/launch-graph.json` |
| PACKET_FAMILY_IDS | none — identity and custody lane, renders no packet |
| JURISDICTIONS | all 51 |
| SOURCE_IDENTITIES | none consumed — this lane reads no official source document |
| SOURCE_HASHES | none consumed |
| OWNED_PATHS | `src/lib/rcap/briefcase/**`, `scripts/verify-shared-claim-boundary-app.mjs`, `scripts/verify-shared-claim-boundary-db.mjs`, `src/lib/supabase/auth-server.ts` |
| PROHIBITED_SHARED_PATHS | the captain-only list above, plus `src/lib/rcap/fulfillment/**` (Lane B owns), `src/lib/record-clearing/**` (Lane D owns) |
| REQUIRED_TESTS | `node scripts/verify-shared-claim-boundary-db.mjs`; `node scripts/verify-shared-claim-boundary-app.mjs`; `node scripts/verify-rcap-briefcase-result-persistence.mjs`; `node scripts/test-briefcase-presentation-authority.mjs`; `npm run typecheck`; `npm test` |
| REQUIRED_RETURN_COMMIT | one exact commit on `codex/lane-e-claim-ownership-briefcase`; return its full 40-character SHA |

Standing invariants this lane may not weaken: a Briefcase is never anonymous
(`user_id NOT NULL`); a claim is atomic with exactly one winner; a matter is
owned by its claimant; anonymous, wrong-user and wrong-matter access are denied.

## LANE F — payment, sponsorship, packet credits, rendering and delivery

| Field | Value |
|---|---|
| LANE | `F-payment-sponsorship-delivery` |
| MODEL | Codex |
| BASE_SHA | `0cad61625a74665db23ac64988c301e48909cf81` |
| REMOTE_BASE_SHA | `0cad61625a74665db23ac64988c301e48909cf81` |
| LANE_BRANCH | `codex/lane-f-payment-sponsorship-delivery` |
| WORKTREE | `worktrees/lane-f-payment` |
| SHARD_ID | `S-F1` |
| ROUTE_IDS | none directly; every route is gated through `admitCommercial(point, identity)` |
| PACKET_FAMILY_IDS | none — consumes whatever the authority admits |
| JURISDICTIONS | all 51 |
| SOURCE_IDENTITIES | none consumed |
| SOURCE_HASHES | none consumed |
| OWNED_PATHS | `src/lib/rcap/render/**`, consumer payment route handlers, sponsorship entitlement modules, packet-credit admission modules |
| PROHIBITED_SHARED_PATHS | the captain-only list, plus `src/lib/rcap/fulfillment/**` — Lane F *calls* the authority and never edits it |
| REQUIRED_TESTS | `node scripts/verify-rcap-phase52-consumer-payment-authority.mjs`; `node scripts/test-rcap-phase52-mutations.mjs`; `node scripts/verify-rcap-phase51-consumer-payment-security.mjs`; `node scripts/verify-rcap-packet-delivery-e2e.mjs`; `node scripts/verify-stripe-runtime-key-policy.mjs`; `npm run typecheck`; `npm test` |
| REQUIRED_RETURN_COMMIT | one exact commit on `codex/lane-f-payment-sponsorship-delivery`; return its full 40-character SHA |

Hard boundary: Stripe test mode only. No live-mode behaviour, no sponsored-credit
consumption, no participant creation, no Production environment variable.

The nine admission points are enumerated with file:line anchors in
`docs/rcap/grade-a/GRADE_A_FULFILLMENT_INTEGRATION_NOTE.md`. Lane F needs no new
rule: `admitCommercial(point, identity)` is the whole interface, and today it
denies every route, because commercially eligible is zero.

## LANE H — RCAP, Clinic, security and hosted QA

| Field | Value |
|---|---|
| LANE | `H-rcap-clinic-security-acceptance` |
| MODEL | Codex |
| BASE_SHA | `0cad61625a74665db23ac64988c301e48909cf81` |
| REMOTE_BASE_SHA | `0cad61625a74665db23ac64988c301e48909cf81` |
| LANE_BRANCH | `codex/lane-h-clinic-security-acceptance` |
| WORKTREE | `worktrees/lane-h-acceptance` |
| SHARD_ID | `S-H1` |
| ROUTE_IDS | the hosted acceptance journeys enumerated in `data/rcap-all50/hosted-acceptance-journeys.json` |
| PACKET_FAMILY_IDS | none — proves the surfaces, builds no packet |
| JURISDICTIONS | all 51 |
| SOURCE_IDENTITIES | none consumed |
| SOURCE_HASHES | none consumed |
| OWNED_PATHS | `scripts/security/**`, Clinic Mode verifiers, hosted acceptance verifiers, `tsconfig.clinic-mode.json` |
| PROHIBITED_SHARED_PATHS | the captain-only list |
| REQUIRED_TESTS | `node scripts/security/test-auth-redirect-security.mjs`; `node scripts/security/test-sign-out-origin.mjs`; `node scripts/security/test-internal-admin-remediation.mjs`; `node scripts/verify-internal-admin-security-tools.mjs`; `node scripts/test-internal-admin-rls-hardening.mjs`; `npm test` |
| REQUIRED_RETURN_COMMIT | one exact commit on `codex/lane-h-clinic-security-acceptance`; return its full 40-character SHA |

Preview environments only. The Production-facing verifiers
(`verify-rcap-production-activation`, `-canary`, `-smoke`, `-clinic-migrate` and
their mutation harnesses) are all recorded `keep_available` and are **not** in
the test chain. This lane does not wire them in and does not run them.

Environment note: the pinned Playwright expects a Chromium revision this image
does not carry. Bridge it in the environment; never change a repository file or
weaken, skip or quarantine a browser-dependent security check to get green.

## LANE G — packet-family shards

Oregon (Lane C) and North Dakota (Lane D) are excluded; they are already
integrated. Every shard recomputes its source hashes from the mounted corpus
at start and fails rather than reading a hash back from a record.

The SOURCE_HASHES value below is each family's corpus-directory digest: the
SHA-256 of the sorted per-file SHA-256 listing for that jurisdiction. A shard
recomputes it first; a mismatch means the corpus is not the one this envelope
was written against, and the shard stops.

### G-DOC — document-heavy shards (Claude Opus 5)

| SHARD_ID | LANE_BRANCH | PACKET_FAMILY_IDS | JURISDICTIONS | corpus files / PDFs | SOURCE_HASHES (family digest) |
|---|---|---|---|---|---|
| `S-GDOC-AR` | `claude/lane-g-doc-arkansas` | `arkansas` | `AR` | 24 / 22 | `eb4c6523c567c70668ba581d7eec562c085aa0bbc85494a06f38f9e8343c9539` |
| `S-GDOC-CO` | `claude/lane-g-doc-colorado` | `colorado` | `CO` | 23 / 21 | `0579389bb95c44e5249c9264dfcf076114495965e0ebdf7bdb11c3594e245084` |
| `S-GDOC-NC` | `claude/lane-g-doc-north-carolina` | `north-carolina` | `NC` | 24 / 21 | `e4e1f9a3ab091b07bea0527ada290b190c24b980783acc3e5f1bd6eaaef4aedb` |

### G-CODE — code-heavy shards (Codex)

| SHARD_ID | LANE_BRANCH | PACKET_FAMILY_IDS | JURISDICTIONS | corpus files / PDFs | SOURCE_HASHES (family digest) |
|---|---|---|---|---|---|
| `S-GCODE-AL` | `codex/lane-g-code-alabama` | `alabama` | `AL` | 5 / 3 | `6dfe3416d4fcbff845757099fd0a1bb718bbb7b623bd1658236d3b879e2b2e86` |
| `S-GCODE-AK` | `codex/lane-g-code-alaska` | `alaska` | `AK` | 7 / 5 | `c65d3752aaacbb50dcf8d8283901c44f1bd6fc2a0610ad6cfcb5b1f8264f0e4d` |
| `S-GCODE-KY` | `codex/lane-g-code-kentucky` | `kentucky` | `KY` | 13 / 10 | `2c05ba1dc10609892492544e1ed2a386f5d5e95d09e743e13e2b599a5e9975eb` |
| `S-GCODE-NE` | `codex/lane-g-code-nebraska` | `nebraska` | `NE` | 14 / 11 | `0c3e2b3023a599c6d35b7cd120565d5cf69679caa12a42e153a0dd4274377352` |
| `S-GCODE-VT` | `codex/lane-g-code-vermont` | `vermont` | `VT` | 12 / 9 | `0a216b4ee2ce8c3ffaa1c2a94ba28cc7b1719d87881fd3b1bdc4d9ec19cf913d` |
| `S-GCODE-VA` | `codex/lane-g-code-virginia` | `virginia` | `VA` | 9 / 6 | `99c6a5a28d65e89e78ef4df9b0f5d0a61ec67f4c12ba2089ff2c611bd8edfb5f` |
| `S-GCODE-WI` | `codex/lane-g-code-wisconsin` | `wisconsin` | `WI` | 7 / 4 | `b0c2e8f22229d49e096448dd6eee7c347bf1d0eb94b570101182df53cf120d8a` |
| `S-GCODE-CA` | `codex/lane-g-code-california` | `california` | `CA` | 15 / 13 | `c185abaab0347e2129d0087005b90db49910cfd9b808a4c98069a552b5665f10` |
| `S-GCODE-DE` | `codex/lane-g-code-delaware` | `delaware` | `DE` | 6 / 3 | `fce4acc9b0936950021cc35aad01559d660e4e2a2a3c5ecc1b380e401e247a5d` |
| `S-GCODE-ME` | `codex/lane-g-code-maine` | `maine` | `ME` | 5 / 2 | `cb718f5b1382ec7196882eea1f5a2679c24ef2bf36368fcc6be8e24f3f7164ed` |

Common to every G shard:

| Field | Value |
|---|---|
| BASE_SHA / REMOTE_BASE_SHA | `0cad61625a74665db23ac64988c301e48909cf81` |
| WORKTREE | `worktrees/` followed by the shard id in lower case, for example `worktrees/s-gdoc-ar` — one worktree per shard, never shared |
| ROUTE_IDS | the route ids that `data/rcap-ledger/launch-graph.json` carries for the shard's jurisdiction |
| SOURCE_IDENTITIES | every file under `RCAP_BUNDLE_EXTRACT/STATES/` for the shard's two-letter code, by exact filename |
| OWNED_PATHS | the shard's own family directory under `data/rcap-all50/overlays/production/` or `data/rcap-all50/hard-forms/`, and `src/lib/rcap/state-packs/` for its jurisdiction |
| PROHIBITED_SHARED_PATHS | the captain-only list, plus every other shard's family directories, plus `data/rcap-all50/overlays/lane-c-candidates/**` |
| REQUIRED_TESTS | `node scripts/verify-rcap-hard-form-dispositions.mjs`; `node scripts/verify-rcap-hard-form-outputs.mjs`; `node scripts/generate-packet-family-build-status.mjs --check`; `npm run typecheck`; `npm test` |
| REQUIRED_RETURN_COMMIT | one exact commit per shard branch; return the full 40-character SHA |

## Concurrency

Eight active sessions initially: Claude A, B, C, D and Codex E, F, G-CODE, H.
Lanes B, C and D are complete and integrated, so their Claude slots are released;
the first released slot recycles into G-DOC.

## Return protocol

A worker returns an exact commit SHA, not a branch to merge. The captain reviews
each commit individually, reruns the lane's required tests against the current
captain head, and integrates in written order. Whole worker branches are never
merged.
