# Captain Lane Assignment Record — National Grade-A Sprint

Authority: captain session. This record is the sole source of lane scope. A lane
that is not described here has no assignment, and a worker may not widen its own
envelope by inference.

## Controlling identity

| | |
|---|---|
| Repository | `Roger-LegalEase/legalease-partner-dashboard-clean` |
| Controlling continuation branch | `claude/new-session-7rsiqq` |
| Controlling BASE_SHA | `0cad61625a74665db23ac64988c301e48909cf81` |
| Captain branch | `claude/legalease-sprint-captain-utucnw` |
| Verified at | identity gate, this session: `origin/claude/new-session-7rsiqq` resolved to the BASE_SHA exactly |

Every lane bases on the BASE_SHA above. `origin/main`, a merge base, a lane
branch's own creation point and any local default are all rejected as bases.

## Worker capability classes

Product model identifiers are deliberately not written into repository
artifacts. Lanes are assigned a capability class instead, and the class is a
real, defined value — not a placeholder:

- `CAPTAIN` — captain session only. Owns shared state; see *Captain-exclusive ownership*.
- `DEEP_REASONING` — lanes whose failure mode is a wrong legal or commercial rule.
  Transplant review, legal-authority binding, commercial admission, security denial.
- `BUILD` — lanes whose failure mode is a wrong byte or a missing file. Overlay
  rendering, packet composition, artifact delivery, shard mechanics.

## Captain-exclusive ownership

No lane may write these. A lane needing a change here returns a proposal.

- shared generated registries (`data/rcap-verifier-dispositions.json`, `data/rcap-ledger/**`)
- global fulfillment ledger
- commercial denominator
- launch graph (`data/rcap-ledger/launch-graph.json`)
- migration numbering and ordering (`supabase/migrations/**`)
- root `package.json` and `package-lock.json`
- ratification projections
- candidate freeze records
- deployment records

## Corpus identity

The Master Library and the operational Nationwide tree are different corpora.
`scripts/rcap-official-forms/operational-corpus-precondition.mjs` refuses a
Master Library mounted at the operational path by name. Do not substitute.

| | |
|---|---|
| `RCAP_BUNDLE_EXTRACT` | Master Library Edition 1 — **MOUNTED AND VERIFIED** |
| Archive SHA-256 | `a26e3ca7d52db4460e53c2eddd893109037702f5c8035f2c698a7e16bad84e89` |
| Verified from disk | 51 jurisdictions, 499 files, 329 PDFs, 498/498 governance checksums OK |
| `OFFICIAL_FORMS_SOURCE_DIR` | operational Nationwide tree — **ABSENT**, not carried by the pinned release |

Lanes requiring operational-tree bytes are blocked on that corpus, not on the
Master Library. Lanes requiring official binaries may proceed.

---

# Lanes

## LANE A — Fulfillment core transplant (Lane B salvage)

| Field | Value |
|---|---|
| LANE | `A-fulfillment-core` |
| MODEL | `DEEP_REASONING` |
| BASE_SHA | `0cad61625a74665db23ac64988c301e48909cf81` |
| REMOTE_BASE_SHA | `0cad61625a74665db23ac64988c301e48909cf81` |
| LANE_BRANCH | `claude/lane-a-fulfillment-core-recovery` |
| WORKTREE | captain worktree (`/home/user/legalease-partner-dashboard-clean`) |
| SHARD_ID | `S-A1` |
| PACKET_FAMILY_IDS | none — this lane binds authority, it renders no packet |
| ROUTE_IDS | the nine candidate routes listed under Lane C and Lane D, as *records only* |
| JURISDICTIONS | `OR`, `ND` (candidate records only; no jurisdiction is made eligible here) |
| SOURCE_IDENTITIES | none consumed — records derive from committed evidence ledgers |
| SOURCE_HASHES | none consumed |
| OWNED_PATHS | `src/lib/rcap/fulfillment/**`, `data/rcap-grade-a/**`, `docs/rcap/grade-a/**` (excluding `docs/rcap/grade-a/captain/**`), `scripts/generate-rcap-grade-a-fulfillment-authority.mjs`, `scripts/verify-rcap-grade-a-fulfillment-authority.mjs` |
| PROHIBITED_SHARED_PATHS | `package.json`, `package-lock.json`, `data/rcap-verifier-dispositions.json`, `data/rcap-ledger/**`, `supabase/migrations/**` — all captain-applied |
| REQUIRED TESTS | `generate-rcap-grade-a-fulfillment-authority.mjs --check`; `verify-rcap-grade-a-fulfillment-authority.mjs`; same `--mutations`; full `npm test`; `npm run typecheck` |
| REQUIRED RETURN COMMIT | one exact commit on `claude/lane-a-fulfillment-core-recovery`, SHA recorded here on integration |

Salvage constraints, from captain review of the stale branch:

- Stale Lane B commits `b52a94ce`, `0efc404b`, `0d36ac25` were created from
  `07675789a80e732d2b835c1e8ba2092b39201b79`. That SHA is an ancestor of the
  BASE_SHA, so they are *stale*, not divergent — but the branch must still not
  be merged, because two of its files are captain-owned and one is stale.
- `package.json` on the stale branch **must not be transplanted**. The stale
  test chain is missing six entries the controlling base added
  (`verify-md-10-103-signed-approval`, `verify-ms-99-15-59-packet-correction`,
  `generate-commercial-packet-integrity --check`,
  `verify-commercial-packet-integrity`, `verify-grade-a-first-packet`,
  `generate-route-ratification-projections --check`) and many more besides.
  Copying it would silently delete newer accepted work. Captain applies the
  additive delta only.
- `data/rcap-verifier-dispositions.json` is regenerated by the repository's own
  generator against the current base, never copied.
- The three `data/rcap-grade-a/*.json` artifacts are regenerated to the fixed
  point against the current base, never copied.
- The migration proposal stays unnumbered and outside `supabase/migrations/`.
  Captain reviews ordering before any numbering.
- Oregon and North Dakota candidate records remain INCOMPLETE. Evidence that
  requires official source bytes is **not** accepted from a committed ledger;
  Lane C and Lane D reverify it against the corpus.

## LANE C — Oregon corpus and official-PDF packet

| Field | Value |
|---|---|
| LANE | `C-oregon-official-pdf` |
| MODEL | `BUILD` |
| BASE_SHA | `0cad61625a74665db23ac64988c301e48909cf81` |
| REMOTE_BASE_SHA | `0cad61625a74665db23ac64988c301e48909cf81` |
| LANE_BRANCH | `claude/lane-c-oregon-official-pdf` |
| WORKTREE | `worktrees/lane-c-oregon` |
| SHARD_ID | `S-C1` |
| PACKET_FAMILY_IDS | `oregon` |
| ROUTE_IDS | `OR:set-aside-of-eligible-convictions-under-ors-137-225-1-a`, `OR:set-aside-of-arrests-or-charges-without-conviction-under-ors-137-225-1-c`, `OR:marijuana-specific-set-aside-redesignation` |
| JURISDICTIONS | `OR` |
| SOURCE_IDENTITIES | `OR__FORM__OR-OJD-ADULT-SET-ASIDE-PACKET__ojd-criminal-set-aside-adult-packet__REV-2026-01__EN.pdf`; `OR__FORM__OR-OJD-MJ-PCR__motion-and-declaration-to-modify-or-set-aside-marijuana-conviction__REV-2023-07__EN.pdf`; `OR__SUPPORT__OR-OJD-CLA-SET-ASIDE-CHECK__ojd-request-for-set-aside-criminal-record-check__REV-2022-01__EN.pdf`; `OR__SUPPORT__OR-OSP-SET-ASIDE-CCH__oregon-state-police-set-aside-criminal-history-request-and-instructions__REV-2022-01__EN.pdf`; `OR__LEGAL-REVIEW__STATEWIDE__oregon-record-clearing-legal-review__ASOF-2026-08-01__EN.md` |
| SOURCE_HASHES | `b22cc346caf6c38730e9992d74016e948180d92b379b6592ab333b06ac880071`; `6e7a2cde0c963159ad3b467a85985d8034f33f8bfa44d380bbaab774c55bcbd6`; `7f8ed25e959d8c942c0c4573c5cc235a1a1e61c31eeeaaf14d98cb7183fa6267`; `a523a9ffc3eb0cc35d89e1c81df8eafcd703cf1ffdb4237a0106b72e1e793ac6`; `61e87f6a222449865225aefb01439b3f433072628dae59a002477bfd605517b8` |
| OWNED_PATHS | `data/rcap-all50/overlays/production/oregon/**`, `src/lib/rcap/state-packs/oregon/**`, `docs/rcap/grade-a/oregon/**` |
| PROHIBITED_SHARED_PATHS | as Lane A, plus `src/lib/rcap/fulfillment/**` (Lane A owns) |
| REQUIRED TESTS | `verify-rcap-official-forms-d1.mjs`; `verify-rcap-hard-form-outputs.mjs`; `verify-rcap-shared-pdf-contract.mjs` and `--mutations`; `npm test` |
| REQUIRED RETURN COMMIT | one exact commit on `claude/lane-c-oregon-official-pdf` |

Every source hash above was recomputed from the mounted corpus this session,
not read back from a record.

## LANE D — North Dakota composed pleading

| Field | Value |
|---|---|
| LANE | `D-north-dakota-composed-pleading` |
| MODEL | `BUILD` |
| BASE_SHA | `0cad61625a74665db23ac64988c301e48909cf81` |
| REMOTE_BASE_SHA | `0cad61625a74665db23ac64988c301e48909cf81` |
| LANE_BRANCH | `claude/lane-d-north-dakota-pleading` |
| WORKTREE | `worktrees/lane-d-north-dakota` |
| SHARD_ID | `S-D1` |
| PACKET_FAMILY_IDS | `north-dakota` |
| ROUTE_IDS | `ND:general-conviction-sealing-under-n-d-c-c-chapter-12-60-1`, `ND:non-conviction-court-record-closing-under-n-d-c-c-12-60-1-05`, `ND:deferred-imposition-dismissal-and-sealing`, `ND:first-offense-possession-sealing`, `ND:dui-record-sealing-under-the-separate-dui-statute`, `ND:marijuana-specific-summary-pardon-or-sealing-relief` |
| JURISDICTIONS | `ND` |
| SOURCE_IDENTITIES | `ND__FORM__EXPERTISE__instructions-for-petition-to-close-nonconviction-records__REV-2025-08-01__EN.pdf`; `ND__SUPPORT__SEALING-CRIMINAL-RECORDS-RESEARCH-GUIDE__sealing-criminal-records-or-closing-nonconviction__REV-UNKNOWN__EN.pdf`; `ND__SUPPORT__ND-NORTH-DAKOTA-PARDON-ADVISORY-BOARD-APPLICA__north-dakota-pardon-advisory-board-application-to-pardon-eligible__REV-2020-02__EN.pdf`; `ND__LEGAL-REVIEW__STATEWIDE__north-dakota-record-clearing-legal-review__ASOF-2026-08-01__EN.md` |
| SOURCE_HASHES | `21b3a790b35f35c345560d9840bf39ca6f1e46cf1b9166c0e5ae2cf8ff7e4d7f`; `b39a0c1532bff3381382544a3888478835edb2109af597a2468a34e2a5f19a3c`; `c59cd5b8c9938e78f951f3aea1d397fe896be253d8d35a14455d684ac56c697f`; `633c2959f0c7bec0272bbab17cba958dd6864c5f7c34ccfe1f9ff4ce09868d50` |
| OWNED_PATHS | `data/rcap-all50/composed-routes/north-dakota/**`, `src/lib/rcap/state-packs/north-dakota/**`, `docs/rcap/grade-a/north-dakota/**` |
| PROHIBITED_SHARED_PATHS | as Lane C |
| REQUIRED TESTS | `verify-rcap-non-filing-components.mjs` and `--mutations`; `verify-route-resolution.mjs`; `npm test` |
| REQUIRED RETURN COMMIT | one exact commit on `claude/lane-d-north-dakota-pleading` |

North Dakota's corpus carries **instructions for** the petition to close
non-conviction records and two supporting documents. It carries no fillable
official petition. That is why this lane composes a pleading rather than
overlaying an official PDF, and any candidate record asserting an official
Oregon-style form binding for ND is wrong on its face and must be rejected.

## LANE E — Claim, ownership, and Briefcase

| Field | Value |
|---|---|
| LANE | `E-claim-ownership-briefcase` |
| MODEL | `DEEP_REASONING` |
| BASE_SHA / REMOTE_BASE_SHA | `0cad61625a74665db23ac64988c301e48909cf81` |
| LANE_BRANCH | `claude/lane-e-claim-ownership-briefcase` |
| WORKTREE | `worktrees/lane-e-claim` |
| SHARD_ID | `S-E1` |
| PACKET_FAMILY_IDS | none — identity and custody lane |
| ROUTE_IDS | none directly; asserts the claim boundary for all 256 route ids in the launch graph |
| JURISDICTIONS | all 51 |
| SOURCE_IDENTITIES | none consumed |
| SOURCE_HASHES | none consumed |
| OWNED_PATHS | `src/lib/rcap/briefcase/**`, `scripts/verify-shared-claim-boundary-app.mjs`, `scripts/verify-shared-claim-boundary-db.mjs` |
| PROHIBITED_SHARED_PATHS | as Lane A, plus `src/lib/rcap/fulfillment/**` |
| REQUIRED TESTS | `verify-shared-claim-boundary-db.mjs`; `verify-shared-claim-boundary-app.mjs`; `verify-rcap-briefcase-result-persistence.mjs`; `npm test` |
| REQUIRED RETURN COMMIT | one exact commit on `claude/lane-e-claim-ownership-briefcase` |

## LANE F — Payment, sponsorship, rendering, delivery

| Field | Value |
|---|---|
| LANE | `F-payment-sponsorship-delivery` |
| MODEL | `DEEP_REASONING` |
| BASE_SHA / REMOTE_BASE_SHA | `0cad61625a74665db23ac64988c301e48909cf81` |
| LANE_BRANCH | `claude/lane-f-payment-sponsorship-delivery` |
| WORKTREE | `worktrees/lane-f-payment` |
| SHARD_ID | `S-F1` |
| PACKET_FAMILY_IDS | none — consumes whatever Lane A admits |
| ROUTE_IDS | none directly; gates every route through `admitCommercial(point, identity)` |
| JURISDICTIONS | all 51 |
| SOURCE_IDENTITIES | none consumed |
| SOURCE_HASHES | none consumed |
| OWNED_PATHS | `src/lib/rcap/render/**`, consumer payment route handlers, sponsorship entitlement modules |
| PROHIBITED_SHARED_PATHS | as Lane A, plus `src/lib/rcap/fulfillment/**` — Lane F *calls* the authority, it never edits it |
| REQUIRED TESTS | `verify-rcap-phase52-consumer-payment-authority.mjs`; `test-rcap-phase52-mutations.mjs`; `verify-rcap-phase51-consumer-payment-security.mjs`; `verify-rcap-packet-delivery-e2e.mjs`; `verify-stripe-runtime-key-policy.mjs`; `npm test` |
| REQUIRED RETURN COMMIT | one exact commit on `claude/lane-f-payment-sponsorship-delivery` |

Hard boundary: test mode only. No live Stripe behaviour, no sponsored-credit
consumption, no participant creation.

## LANE G — Packet-family shards

| Field | Value |
|---|---|
| LANE | `G-packet-family-shards` |
| MODEL | `BUILD` |
| BASE_SHA / REMOTE_BASE_SHA | `0cad61625a74665db23ac64988c301e48909cf81` |
| LANE_BRANCH | `claude/lane-g-packet-family-shards` |
| WORKTREE | `worktrees/lane-g-shards` |
| SHARD_ID | `S-G1` .. `S-G4`, assigned per shard at dispatch |
| PACKET_FAMILY_IDS | every family under `data/rcap-all50/hard-forms/` and `data/rcap-all50/overlays/production/` except `oregon` (Lane C) and `north-dakota` (Lane D) |
| ROUTE_IDS | the launch graph's 256 route ids minus Lane C's three and Lane D's six |
| JURISDICTIONS | all 51 except `OR` and `ND` |
| SOURCE_IDENTITIES | per-shard, drawn from `RCAP_BUNDLE_EXTRACT/STATES/` plus the shard's two-letter jurisdiction code; each shard records the identities it consumed |
| SOURCE_HASHES | recomputed from the mounted corpus at shard start; a shard that cannot recompute a hash fails rather than reading a record |
| OWNED_PATHS | the shard's own family directories only |
| PROHIBITED_SHARED_PATHS | as Lane C, plus every other shard's family directories |
| REQUIRED TESTS | `verify-rcap-hard-form-dispositions.mjs`; `verify-rcap-hard-form-outputs.mjs`; `generate-packet-family-build-status.mjs --check`; `npm test` |
| REQUIRED RETURN COMMIT | one exact commit per shard branch |

## LANE H — RCAP, Clinic, security, hosted acceptance

| Field | Value |
|---|---|
| LANE | `H-rcap-clinic-security-acceptance` |
| MODEL | `DEEP_REASONING` |
| BASE_SHA / REMOTE_BASE_SHA | `0cad61625a74665db23ac64988c301e48909cf81` |
| LANE_BRANCH | `claude/lane-h-clinic-security-acceptance` |
| WORKTREE | `worktrees/lane-h-acceptance` |
| SHARD_ID | `S-H1` |
| PACKET_FAMILY_IDS | none — proves the surfaces, builds no packet |
| ROUTE_IDS | the hosted acceptance journeys in `data/rcap-all50/hosted-acceptance-journeys.json` |
| JURISDICTIONS | all 51 |
| SOURCE_IDENTITIES | none consumed |
| SOURCE_HASHES | none consumed |
| OWNED_PATHS | `scripts/security/**`, Clinic Mode verifiers, hosted acceptance verifiers |
| PROHIBITED_SHARED_PATHS | as Lane A |
| REQUIRED TESTS | `scripts/security/test-auth-redirect-security.mjs`; `scripts/security/test-sign-out-origin.mjs`; `scripts/security/test-internal-admin-remediation.mjs`; `verify-internal-admin-security-tools.mjs`; `npm test` |
| REQUIRED RETURN COMMIT | one exact commit on `claude/lane-h-clinic-security-acceptance` |

Preview environments only. No Production deployment, migration, environment
change or domain activation is authorized by this record.

---

## Envelope validity rule

An envelope is rejected if any required field is empty, or contains
angle-bracket placeholder text, `NOT SUPPLIED`, or `TBD`. Every field above is
populated with a real value; where a lane genuinely consumes no source, the
field records that fact explicitly rather than being left blank.

---

# Salvage inventory — captain findings

Three worker branches were pushed from the older base
`07675789a80e732d2b835c1e8ba2092b39201b79`. That SHA is an *ancestor* of the
BASE_SHA, so these branches are stale rather than divergent. None is merged as a
branch; commits are reviewed and integrated individually.

| Lane | Branch | Stated tip | Actual remote tip at review |
|---|---|---|---|
| B | `claude/grade-a-fulfillment-core-jni395` | `0efc404b` | `0d36ac25` — branch advanced by one commit past the stated tip |
| C | `claude/oregon-official-pdf-grade-a-3rtuq7` | `0a4e3017` | `0a4e3017` |
| D | `claude/north-dakota-grade-a-packet-wiludq` | `f9bd937e` | `f9bd937e` |

Lane B's extra commit `0d36ac25` registers the new verifier in
`data/rcap-verifier-dispositions.json`. That file is captain-owned, so the
registration is reproduced by running the repository's own generator against the
current base, not by copying the stale commit.

## Integration order (captain-executed)

1. Lane B fulfillment core architecture
2. Lane D North Dakota packet
3. Lane C Oregon pair, as one atomic unit
4. Lane B integration documentation and migration proposal

## Containment rules carried into integration

- **Oregon stays candidate.** Lane C's artifacts live under
  `data/rcap-all50/overlays/lane-c-candidates/oregon/` and are not promoted into
  `data/rcap-all50/overlays/production/` or into any commercial fulfillment
  freeze until corpus, provenance, independent review and the captain-owned
  admission gates all pass. The lane's own commit already placed them in the
  candidate area; integration preserves that placement rather than moving them.
- **North Dakota stays held.** ND is classified `IMPLEMENTATION_COMPLETE` and
  `COMMERCIAL_HOLD` until the integrated Grade-A fulfillment record for its
  routes reaches `COMPLETE_PACKET_PROVEN`. Implementation completeness and
  commercial eligibility are recorded as two separate facts precisely so that
  finishing the build cannot be mistaken for permission to sell.

## Collision review against the controlling base

- Lane B: 12 of 14 paths are new namespaces. `package.json` and
  `data/rcap-verifier-dispositions.json` are captain-owned and are applied by
  the captain as a delta, never copied.
- Lane C: every path is new, and all packet artifacts are already under the
  candidate directory. No file collides with the controlling base.
- Lane D: every path is new except
  `src/lib/record-clearing/renderers/custom-pleading-renderer.ts`, which the
  controlling base did not touch since the stale base, so the lane's patch
  applies cleanly. The change is additive — two optional presentation fields
  whose absence preserves existing output byte for byte.

## Environment note

The pinned Playwright expects a Chromium revision the image does not carry. This
was bridged in the execution environment only. No repository file was changed to
accommodate it, and no browser-dependent security check was weakened, skipped or
quarantined.
