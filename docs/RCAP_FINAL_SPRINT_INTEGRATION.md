# RCAP Final Sprint — Captain Integration Record

Integration branch `claude/rcap-final-sprint-integration`, cut from the verified
delivery base `d29829c5` (itself 8 commits ahead of `origin/main` `2dced50e`,
both GitHub checks observed green on that exact SHA).

This record supplements `docs/RCAP_DELIVERY_LANE_RECONCILIATION.md`, which holds
the delivery-lane overlap matrix and the phase-49/phase-50 disposition. Nothing
here changes those decisions.

## Canonical branch for the remainder of the sprint

Ruled by Roger on 2026-08-11: `claude/rcap-final-sprint-integration` is the
canonical integration branch for the rest of this sprint, and work continues
from the PR #93 tip.

Earlier session instructions named `claude/rcap-nationwide-build-pkbkeh` as the
standing development branch. **That instruction is stale.** It is recorded here
so a later reader does not act on it: this lane was cut from the verified
delivery base rather than from that branch, and it reapplied and superseded the
work that branch carried — phase-48 SQL by `phase-49`, and
`completion-ledger.json` v1 by `data/rcap-ledger/authority-ledger.json` at
schemaVersion `rcap-completion-ledger/v2`.

`claude/rcap-nationwide-build-pkbkeh` is preserved as **superseded, read-only
history**. It is not to be force-pushed, merged, retargeted or rewritten, and
PR #93 is not to be retargeted onto it. The one file on it that this lane had
neither carried over nor superseded — `docs/RCAP_EXTERNAL_ACTION_REGISTER.md`,
whose item 9 the authorization queue cites — has been restored here, so no live
reference depends on that branch remaining readable.

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

## Lane B / C / D integration window (one pass)

All three lanes branched from `e078a87f`, an ancestor of the Terminal E
integration `72574ecc`, so nothing was cherry-picked wholesale. Lane-owned files
were taken by path; `package.json`, `package-lock.json` and
`data/rcap-verifier-dispositions.json` are captain-owned and recreated by hand.

| Lane | Branch | Tip | Imported |
|---|---|---|---|
| B | `claude/database-role-private-storage-security-mamuvg` | `c8fa6663` | runtime-credential boundary verifier, migration apply-order security note |
| C | `claude/packet-cap-entitlement-audit-7u1hce` | `d06cf61f` | corrected audit read, CAS backfill, guarded rollback, row-evidence harness and report |
| D | `claude/durable-worker-container-t6gobo` | `87a5185c` | worker drain loop, claim-lease config, runtime verifier, worker deployment spec |

**Rejected shared-file changes** (recreated by hand instead): each lane's
`package.json` edit, lane C's and lane B's `data/rcap-verifier-dispositions.json`
edits, and lane D's `package-lock.json` edit. The recreated lock diff was checked
byte-for-byte against lane D's — identical.

Lane D's dependency move is real and load-bearing: `typescript` was a
devDependency, and the worker image installs production dependencies only, so the
container could not start. It is now a runtime dependency.

## The consumer payment gate (phase 51)

Directive item 8 asked for an explicit consumer entitlement test. Writing it
surfaced a defect rather than confirming a guarantee.

Phase 50 gave an unsponsored job the accounting result `zero_charge` **and** the
delivery eligibility `eligible`. Those are two facts and only the first was
true. `zero_charge` means no partner credit moved — correct, there is no
partner. It says nothing about whether the consumer paid, and the consumer
product is paid: `consumer_briefcase_items.amount_cents` has been constrained to
5000 since phase 27. The delivery core gates on authentication, briefcase
ownership, `delivery_eligibility` and artifact hash; none of those is a payment
check, so nothing downstream caught it. **Any job enqueued without partner
sponsorship was deliverable on the strength of having no sponsor.**

`supabase/phase-51-rcap-consumer-payment-gate.sql` is additive, so phase 50's
file and its published digest `15063ea9…` are untouched. Apply order is
49 → 50 → 51.

| Case | Result | Eligibility | Ledger rows |
|---|---|---|---:|
| Unsponsored, payment table absent | `consumer_payment_required` | `accounting_blocked` | 0 |
| Unsponsored, no briefcase item | `consumer_payment_required` | `accounting_blocked` | 0 |
| Unsponsored, `unpaid` | `consumer_payment_required` | `accounting_blocked` | 0 |
| Unsponsored, `refunded` | `consumer_payment_required` | `accounting_blocked` | 0 |
| Unsponsored, `paid` at 2500 cents | `consumer_payment_required` | `accounting_blocked` | 0 |
| Unsponsored, `paid` at 5000 cents | `zero_charge` | `eligible` | 1, unattributed |

The paid case consumes no partner packet credit — checked against the partner
ledger before and after. Phase 50's
`packet_render_jobs_eligible_requires_accounting_check` already restricts
`eligible` to the four consuming results, so `consumer_payment_required` cannot
be marked deliverable structurally, not merely by convention.

Mutation-tested twice: returning `true` on the absent-table branch turns B3a red;
widening the accepted `payment_status` set turns B3c red. Every delivery verifier
now applies 49 → 50 → 51, so the tested state is the shipped state — without
that, the gate could be deleted and the suite would stay green.

## E2 dispatch

`scripts/generate-rcap-e2-dispatch-assignment.mjs` partitions the 363 frozen jobs
across eight lanes, asserting coverage and exclusivity rather than trusting them.
Lanes write **evidence only**, to one file each; they never touch the canonical
crosswalk or the compiled profiles, even where a frozen job's `ownedPaths` names
them. Those paths are contended across lanes and are generated output, and a lane
that could edit the crosswalk could close its own row on a guess. E3 adjudicates.

Milestone 1 item 2 remains blocked. 497 tracks are represented, not terminal.
