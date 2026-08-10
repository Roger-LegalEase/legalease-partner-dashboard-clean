# RCAP Final Sprint — Captain Integration Record

Integration branch `claude/rcap-final-sprint-integration`, cut from the verified
delivery base `d29829c5` (itself 8 commits ahead of `origin/main` `2dced50e`,
both GitHub checks observed green on that exact SHA).

This record supplements `docs/RCAP_DELIVERY_LANE_RECONCILIATION.md`, which holds
the delivery-lane overlap matrix and the phase-49/phase-50 disposition. Nothing
here changes those decisions.

## Entry gate

| Fact | Value |
|---|---|
| Working tree at entry | clean, single worktree, no stray processes |
| Branch / HEAD at entry | `claude/rcap-delivery-unification` @ `d29829c5` |
| Ahead/behind upstream | 0 / 0 (in sync) |
| Ahead of `origin/main` | 8 / 0 |
| `origin/main` | `2dced50e` (unchanged this pass) |
| Baseline chain before editing | `npm test` exit 0, reproduced on this tree |
| Deployed application SHA | **unverified** — no production credentials exist in this environment by design |
| Applied migrations | **unverified** — same reason; provable only by object presence during an authorized window |

Every reported ref verified as a real commit: `2dced50e`, `78539358`,
`de89694`, `53ab0248`, `3b6f4c1`, `aa52c6b1`. `3b6f4c1` resolves on
`origin/feat/record-clearing-production-integration` — the ledger's authority
ref. PR #91 open (phase 49); PR #92 open (delivery reconciliation, draft).

**No lane B/C/D branch exists.** No security, packet-cap or worker-runtime lane
produced a commit to cherry-pick. The only independent lane with landed work is
the crosswalk/authority lane (`claude/codespaces-zip-retrieval-jr89us` @
`fdfd7322`), integrated here.

## Crosswalk lane integration (Terminal E)

Adopted byte-identical, lane-owned:

- `data/rcap-ledger/*` — authority ledger v1 (497 tracks), HTML board, diff
- `data/rcap-verifier-audit.json`, `data/rcap-verifier-dispositions.json`
- `docs/record-clearing/*` — denominator reconciliation, master-library
  reconciliation, state-pack substance audit, verifier-coverage audit
- generators and verifiers: authority ledger, denominator reconciliation,
  verifier dispositions, orphan audit, state-pack substance, authorization
  queue, exact-path authorization, backups

**Not adopted:** that lane's `src/lib/rcap/render/job-contract.ts` and
`worker.ts`, which the delivery lane supersedes, and therefore not its
`verify-rcap-render-worker.mjs`; `verify-rcap-render-worker-delivery.mjs`
covers that behaviour here. Recorded so the lane rebases rather than merges
those two files.

## Captain resolutions on shared paths

**1. Contract-verifier cache key (`scripts/source-engine-change-scope.mjs`).**
The lane added a content-addressed pass cache keyed on three files. This
branch's contract verifier also reads the phase-49 and phase-50 migrations, so
an edited migration could have reused a cached pass — a stale green on the gate
the exact-path authorization depends on. The key now derives the migration list
from the verifier's own source, so a new input widens the key automatically.
Proven behaviourally: appending one comment byte to phase 50 changes the key;
reverting restores it.

**2. Authorization queue vocabulary (`data/rcap-authorization-queue.json`).**
Conformed to the vocabulary its verifier owns. Phase 48 is `declined` with an
empty artifact list and its digest kept as `supersededSha256` history only —
the file no longer exists and the grant must not outlive it. Phase 50 is
`authorized_scoped`, naming each environment separately rather than collapsing
them: repository integration and ephemeral local tests authorized, staging and
production still queued.

## Crosswalk status: finitely blocked, owner named

The 497-track registry exists and is authoritative (authority ledger, sourced
from `rcap-factory-status.mjs --json` at pinned commit `3b6f4c103d`). The
**registry-track → compiled-pathway crosswalk does not exist on any branch.**
The lane's own denominator reconciliation states why: the two identifier spaces
do not join (`ak-courtview` vs
`set-aside-after-a-suspended-imposition-of-sentence-as-12-55-085`), so
reconciliation today is by jurisdiction count only.

- Reconciled by jurisdiction: 51 of 51 jurisdictions counted; 50 disagree with
  the registry, 43 under-compiled, 0 with nothing compiled.
- **Surplus classifications** preserved: 7 jurisdictions compile more pathways
  than the registry lists — ID +1, LA +2, MS +4, OK +8, PA +1, SD +3, WY +2
  (21 surplus pathways). These cannot be explained as unfinished work and need
  identity resolution, not more building.
- **Milestone 1 item 2 disposition:** blocked pending the crosswalk. No
  per-track coverage claim may be made until it exists.
- **Owner / next action:** crosswalk lane owns it; the next executable step is a
  deterministic registry-track → pathway mapping emitted as a generated
  artifact, with every unmapped track and every surplus pathway listed rather
  than silently dropped.

## Ledger and residual jobs

The canonical writer (`scripts/generate-rcap-authority-ledger.mjs`) was run in
`--check` mode against its pinned authority: **current at version 1, no drift**,
so regeneration is a byte-level no-op and the artifacts are not churned.

| Metric | Value |
|---|---|
| Tracks | 497 / 497 denominator |
| tracksTerminal | 0 |
| experienceLevel 3 (all tracks) | 497 |
| unownedBlockers | 0 |
| Tracks with no implementation queue | **0** |
| Queue split | F_source_problem 265, D_composed_or_process_guidance 132, C_custom_pleading 94, E_local_variant 4, B_official_pdf_overlay 2 |
| Root blockers (stage → owner) | authority_clearance 355 → source_acquisition; source_pinning 83 → source_materialization; implementation 22 → implementation_lane; visual_proof 21 → independent_review; staging_acceptance 14 → captain |
| launchGate | red |

Every remaining required component is assigned: no track lacks a queue, and
every blocker stage carries a named owner. Milestone 1 item 1 evidence lives in
`data/rcap-render/delivery-gate-evidence.json` with a queued instruction for the
ledger owner, because the ledger's authority ref does not carry the delivery
branch and this pass does not fabricate a fact into it.

## Operational hazard recorded

`scripts/audit-orphaned-verifiers.mjs` restores tracked files that verifiers
dirty (`git checkout --`). Run it **only from a clean tree**: during this pass it
silently reverted an uncommitted edit to the authorization queue. The audit and
the disposition regeneration are therefore run after committing, never before.
