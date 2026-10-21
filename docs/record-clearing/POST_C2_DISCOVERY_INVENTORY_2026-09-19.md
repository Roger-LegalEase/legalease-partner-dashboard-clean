# Post-C2 discovery inventory — frozen 2026-09-19

Read-only sweep of the 154 canonical `npm test` steps that follow
`verify-rcap-terminalize-c2`, run at commit `17632728e`.

**Frozen. Nothing in this inventory has been fixed.** It is the record the
remediation lanes are planned from, and it should not be edited to reflect
work done afterwards — a new sweep produces a new inventory.

## How it was run

Every step executed independently, with no `set -e`, so one failure never
hid the steps behind it. No regeneration, no commits, no fixes, no authority
changes, no worker-input changes. The working tree was verified clean
afterwards: the mutation harnesses that transiently rewrite Phase-52,
Phase-53 and fixture files restored every byte.

This sweep exists because an earlier claim — "the remaining 155 steps run
clean except C2" — was wrong. That run used `set -e` and C2 was the first
step after C1, so it aborted there and steps 2–154 were never observed. The
correct statement at the time was "unknown beyond C2".

## Headline

| | |
|---|---|
| Steps swept | 154 |
| Pass | 121 |
| Fail | 33 |
| **Failing identically at the accepted Production baseline `8682bd007`** | **33 of 33** |
| **Regressions introduced by this session's work** | **0** |

Every failure was re-run at the accepted baseline in an isolated worktree.
All 33 fail there too. Nothing in the provenance-supersession work, the
worker republications, the crosswalk reconciliation or the disposition
recording introduced any of them.

That is the answer to "pre-existing?" for the whole set. It is **not** an
answer to "does it matter?" — several of these are real, and two touch
commercial admission.

## Root causes

Thirty-three failing steps are not thirty-three problems. Grouped by what
actually has to change:

| Root cause | Steps affected | Current | Baseline | Worker-input impact | Fixable while reviews run? |
|---|---|---|---|---|---|
| **R1** Pending provenance review — the same root as the 32 review units | 2 (`1`, `122`) | FAIL | FAIL | No | **No — wait for review.** The control wiring is Lane A; green is Lane B |
| **R2** Lane F profile-surface hashes (LA, MD, MA) | 1 (`101`) | FAIL | FAIL | **Yes** (`f2-dispositions.json`) | No — same family, not covered by the 32 units |
| **R3** Stale derived artifacts, one dependency chain | 13 | FAIL | FAIL | No | **Yes** — except the two with content gaps |
| **R4** Stale harness / control | 12 (3 strictly downstream) | FAIL | FAIL | Mixed | **Mostly yes**; `17`/`18` touch a worker input |
| **R5** Owner / legal decision | 4 | FAIL | FAIL | Mixed | **Wait** |
| **R6** Worker-publication workflow control | 1 (`58`) | FAIL | FAIL | No (`.github/workflows/` is not an image input) | **Yes** |

### R1 — pending provenance review (2 steps)

- **Step 1** `verify-rcap-terminalize-c3` — WA, NE, OH, OK records failing
  `provenance.fingerprint does not match`. **These are the same records
  already covered by the supersession record.** C3 is a *third* control
  doing its own raw digest comparison, never wired to the two-state model.
  It needs the same wiring C2 got. That wiring is safe to do now; it will
  then report `SUPERSEDED_PIN_AWAITING_REREVIEW` and stay red until the
  reviews land. **No new review units.**
- **Step 122** `verify-rcap-answer-dependent-patches` — Q-J-04 says outright
  that the WV component records "is repinned to the profile's live digest".
  That is the 2026-08-29 Lane J re-pin, already enumerated in
  `priorUnrecordedRepins`. Same root, resolved by the WV reviews.

Leaving a third control enforcing its own independent rule is the risk the
C2 wiring already removed once: two controls under one name enforcing two
different rules.

### R2 — Lane F profile-surface hashes (1 step)

**Step 101** `verify-screening-verification-finetune-shard-f` — LA, MD and
MA report "legal/route/packet profile surface changed". Same family as the
provenance condition: a profile moved and a control holds a recorded hash of
it. But LA and MD are **not** among the 32 review units, and the recorded
surface is a different artifact from the provenance pins, so this is not
discharged by the 32 reviews. It needs its own decision about whether a
surface hash is re-recordable without a legal review or not — and its
remediation path touches `f2-dispositions.json`, a worker-image input.

### R3 — stale derived artifacts (13 steps, one chain)

A visible dependency chain, not 13 independent problems:

```
28 all51-branch-port-evidence
   └─ 29 all51-coverage-reconciliation
        └─ 31 all51-legal-authority-reconciliation
             └─ 33 all51-legal-authority-finalization
                  ├─ 36 all51-current-legal-questions
                  └─ 40 pathway-bridge-adjudication
```

plus `11` track-terminalization, `12` d-track-queue (`expected 67 D tracks,
found 68`), `30` legal-review-decision-sets, `39` renderer-gap-decomposition,
`41` closure-authority-contradictions, `78` registry-gap-dossier, `79`
witness-divergence-diagnosis.

None of these outputs is a worker-image input. **Two are not pure
staleness** and must not be swept up as if they were:

- **33** also reports `3 question(s) have a provenance with no owner mapping`
- **41** also reports four routes (NJ, NV, OR, SD) with `no individual
  adjudication; the eleven rows are not one move`

Those are content gaps behind a decision, not a regeneration. Regenerating
around them would record the gap as resolved.

### R4 — stale harness / control (12 steps, 9 independent)

| Step | What it reports | Note |
|---|---|---|
| `5` | `verify-c-dependency-deferrals`: patches 10–13 bytes match no recorded state | |
| `15` | `lane-b-exact-deferrals --mutations` throws a TypeError at line 614 | harness crash, not a finding |
| `17` | `terminalization-treatments`: four SC tracks have a treatment the window never briefed | **touches `terminalization-treatments/`, a worker input** |
| `18` | ↳ `--mutations` of step 17 | downstream of `17` |
| `22` | `verifier-dispositions`: 3 scripts with no recorded disposition, 1 recorded as `keep_available` while in the test chain | register vs reality |
| `26` | `test-lane-e-review-edit-ownership` assertion on `'verified'` | |
| `27` | ↳ says so itself: "verifier not green on clean source — `test-lane-e-review-edit-ownership`" | downstream of `26` |
| `50` | `consumer-payment-http-mutations`: **2 mutations left the suite green** | a real control weakness, not staleness |
| `80` | `reachability-evidence`: "the diagnosis was built against a different canonical graph than the one on disk" | |
| `81` | ↳ `--mutations` reports `MISSED the diagnosis built against a different graph` | downstream of `80` |
| `142` | `node --test` across 7 files: 72 pass, 6 fail | needs per-test breakdown |
| `144` | `governance-state-preserved-on-rebuild` digest assertion | |

Step `50` deserves separate attention: two mutations that should have turned
the suite red did not. A control that fails to catch its own mutations is
weaker than it reports, and that is worth more than its position in this
list suggests.

### R5 — owner / legal decision (4 steps)

- **Step 32** `legal-design-memo-import` — PA, RI, VA, VT memos differ from
  `origin/feat/record-clearing-production-integration`. Source fidelity.
- **Step 123** `oregon-decision-alternatives` — the three configurations
  exist, the superseded route is recorded, none is commercially open, and
  then: `not commercially eligible and is not proven: INCOMPLETE /
  not_commercially_eligible / eligible 6`.
- **Step 131** `grade-a-lane-b-v2-candidate` — `No packet fulfillment record
  for ND:first-offense-possession-sealing; the artifact evidence would have
  to be invented`. This is the known ND position: ND stays commercially
  refused, and the verifier refusing to invent evidence is correct
  behaviour, not a defect.
- **Step 132** `grade-a-fulfillment-hardening` — **`MS:non-conviction-expungement-for-dismissal-no-disposition-or-acquittal`
  was unexpectedly admitted at `consumer_checkout`.** The hardening control
  admits only five exact evidence-complete productized records, and the
  Mississippi release route is admitted beyond that set. This is
  pre-existing and it is about the commercial admission of the route this
  whole release lane is for. It is either a stale five-record list that
  never followed the MS admission forward, or a real over-admission.
  **Not something to widen or narrow quietly in either direction.**

### R6 — worker-publication workflow control (1 step)

**Step 58** `verify-rcap-worker-publication-workflow`: `a full integration
SHA is a required input` and `the only tag is the full commit SHA`. The
remediation lives in `.github/workflows/`, which the gate confirms is not a
worker-image input.

## Remediation lanes

### Lane A — clear now, while counsel reviews

No worker-image input, no legal or product judgement.

- **R3**, the 13-step stale chain — **excluding** the content gaps in `33`
  and `41`, which go to Lane B
- **R4** steps `5`, `15`, `22`, `26` (which clears `27`), `50`, `80` (which
  clears `81`), `142`, `144`
- **R6** step `58`
- **R1** step `1` — the C3 *wiring* only. It will not turn C3 green; it
  makes C3 tell the truth about why it is red and closes a third
  independently-enforced rule.

### Lane B — hold

Truthful resolution is one of the 32 reviews or another real judgement.

- **R1** steps `1`, `122` for their *green* state
- **R2** step `101`
- **R3** the content gaps inside `33` and `41`
- **R5** steps `32`, `123`, `131`, `132`

### Lane C — batch, one publication after the reviews settle

Legitimately changes a worker-image input. Accumulated, not published
one-by-one, because a HOLD from counsel may produce a compiled-profile
correction that itself moves worker bytes.

- **R4** steps `17` / `18` — `data/rcap-all50/terminalization-treatments/`
- **R2** step `101` — `data/rcap-all50/review-artifacts/f2-dispositions.json`
- **R5** step `131` if it ever resolves — `data/rcap-ledger/packet-fulfillment-records.json`

Current gate state at `17632728e`: `rebuildRequired: false`, changed inputs
`[]`. Nothing in Lane A moves that.

## What this inventory does not say

It does not say the 121 passing steps are correct — only that they pass. It
does not rank the 33 by importance beyond the notes above. And it does not
propose fixing anything: the lanes are a plan, and Lane A work should be
taken one boundary at a time with the same discipline as everything before
it.
