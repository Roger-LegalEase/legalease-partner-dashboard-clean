# Lane J — identity gate, test baseline, lane result

## Identity gate — all six conditions established before any file was edited

| # | Condition | Result |
|---|---|---|
| 1 | `148382ab2a2acbe673b6d35c8967f5a908342e60` exists as a commit in this clone | `git cat-file -t` → `commit` — **PASS** |
| 2 | base is an ancestor of `origin/claude/legalease-sprint-captain-utucnw` | `git merge-base --is-ancestor` → 0 — **PASS** (captain tip `57bf41104c15a80050d9bb4790d32bbdaaeb1703`, well ahead, as the gate expects) |
| 3 | base is an ancestor of `origin/claude/grade-a-v6-release-blockers` | → 0 — **PASS** |
| 4 | nothing but this lane's own commits between base and lane tip | `git rev-list --count 148382ab..origin/claude/grade-a-v6-release-blockers` → **0** at worker start — **PASS** |
| 5 | clean worktree at start | `git status --porcelain` → empty — **PASS** |
| 6 | origin names `Roger-LegalEase/legalease-partner-dashboard-clean` | `https://github.com/Roger-LegalEase/legalease-partner-dashboard-clean` — **PASS** |

Lane J's envelope was read from
`data/rcap-grade-a/active-lane-envelopes.json` on the live captain branch: lane
`J`, status `active`, `baseSha` and `remoteBaseSha` both
`148382ab2a2acbe673b6d35c8967f5a908342e60`, `laneBranch`
`claude/grade-a-v6-release-blockers`, `ownedPaths` `["docs/rcap/grade-a/lane-j/"]`.

Per the envelope's `worktreeRule`, work was done in a dedicated worktree created
from the base SHA at `/home/user/lane-j`, never in the captain worktree at
`/home/user/legalease-partner-dashboard-clean`.

## Baseline — at base `148382ab`, clean worktree, before this lane wrote anything

| Command | Exit | Result |
|---|---|---|
| `node scripts/verify-rcap-terminalize-c1.mjs` | 1 | **RED (expected).** 18 drift failures. No other failure class. |
| `node scripts/verify-expungement-plain-language-values.mjs` | 0 | PASS |
| `node scripts/test-expungement-parity-delta-mutations.mjs` | 0 | PASS — 26/26 mutations red, files restored |
| `npm run typecheck` | 0 | PASS |
| `git diff --check` | 0 | PASS |

Additional evidence gathered at baseline, outside the required list:

| Command | Exit | Result |
|---|---|---|
| `node scripts/verify-screening-verification-finetune.mjs` | 1 | **RED (BLOCKER-5).** `AssertionError: Got unwanted exception` at line 711 — `PacketFulfillmentNotProvenError` for `MS:non-conviction-expungement-for-dismissal-no-disposition-or-acquittal`, missing `["fulfillment record"]` |
| `node scripts/verify-rcap-worker-publication-workflow.mjs` | 1 | **RED (BLOCKER-1).** `verify-rcap-image-input-fingerprint.mjs` did not pass: `package.json`, `src/` and `scripts/lib/` all moved from fingerprint base `67a0a789` |
| `node scripts/verify-rcap-worker-tag-guard.mjs` | 0 | PASS 10/10 |
| `node scripts/verify-rcap-worker-source-binding-exception.mjs` | 0 | PASS — no exception in force |
| `node scripts/verify-rcap-render-worker-delivery.mjs` | 0 | PASS |
| `node scripts/test-rcap-image-fingerprint-mutations.mjs` | 0 | PASS 11/11 |

## Lane result — at the lane commit

| Command | Exit | Result |
|---|---|---|
| `node scripts/verify-rcap-terminalize-c1.mjs` | 1 | **RED — unchanged from baseline.** The same 18 drift failures. This lane moved no hash. |
| `node scripts/verify-expungement-plain-language-values.mjs` | 0 | PASS |
| `node scripts/test-expungement-parity-delta-mutations.mjs` | 0 | PASS — 26/26 |
| `npm run typecheck` | 0 | PASS |
| `git diff --check` | 0 | PASS |

**Baseline and lane result are identical.** This lane changed no behaviour and
touched no file outside `docs/rcap/grade-a/lane-j/`.

### One transient note

While this lane's documents were uncommitted, `verify-rcap-terminalize-c1.mjs`
emitted a nineteenth line:

```
 - working-tree change outside C1-owned paths: docs/rcap/grade-a/lane-j/
```

That is the verifier's working-tree cleanliness check, not a nineteenth drifted
record. It is absent from both the baseline and the committed lane result.

## Expected red gates

These are red at the lane commit and stay red. **None of them is a passing
release gate and none should be reported as one.**

| Gate | Why it is red | What clears it |
|---|---|---|
| `verify-rcap-terminalize-c1.mjs` | 18 provenance hashes drifted | Applying the ten-record mechanical patch takes it to **8**, still red. Zero requires Q-J-01 … Q-J-04 to be answered and the eight dispositioned. |
| `verify-screening-verification-finetune.mjs` | Line 711 asserts Mississippi reaches checkout; the runtime correctly refuses | Roger's new proof authorization, then the three-file edit |
| `verify-rcap-worker-publication-workflow.mjs` | The image-input fingerprint no longer describes what a build at HEAD would copy | Regenerating the fingerprint at a candidate SHA, then republishing under Roger's authorization |

## Effect on measured verifier state, if the prepared patch is applied

Confirmed by applying and reverting the patch in a clean worktree at the base:

| | Drift failures |
|---|---|
| Base, unpatched | **18** |
| Base + `patches/blocker-4-decision-unchanged-repin.patch` | **8** |

The residual eight are exactly the INSUFFICIENT_AUTHORITY records.

## Exact blockers this lane could not clear, and who owns each

| Blocker | Owner | What is needed |
|---|---|---|
| BLOCKER-4, 8 of 18 records | **Lawrence (counsel)** | Answers to Q-J-01 (IL § 5.2(g)), Q-J-02 (KY 218A.275), Q-J-03 (KY 218A.276), Q-J-04 (WV § 17C-5-2b vs § 61-11-25) |
| BLOCKER-4, 10 of 18 records | **Captain** | Apply the prepared patch; no approval required |
| BLOCKER-5 | **Roger Roman** | The approver statement in the packet, §11 |
| BLOCKER-1, gate 1 | **Captain** | A candidate integration SHA after 4 and 5 land, and a decision on `RELEASE_INTEGRATION_BRANCH` in the publish workflow |
| BLOCKER-1, gate 2 | **Roger Roman** | Publication authorization, runbook §11 |
| BLOCKER-1, gate 3 | **Roger Roman** | A separate authorization to move the Preview `WORKER_IMAGE_DIGEST` |

## Stop conditions honoured

- **No hash re-pinned to make a verifier green.** All eighteen are still at their
  original values. The ten-record patch exists as a file and is not applied.
- **The pinned Mississippi proof and its approval record were not edited.**
  `data/expungement-ai/screening-parity-approved-deltas.json`,
  `scripts/lib/screening-parity-deltas.mjs` and
  `scripts/verify-screening-verification-finetune.mjs` are byte-identical to the
  base. The proof's live hash is still
  `74624c8464e40e02c272b967ebeba42452681d163ea4be6d013af01778b7759d`.
- **No Mississippi fulfillment record added.**
  `data/rcap-ledger/packet-fulfillment-records.json` still holds its one record,
  `ND:first-offense-possession-sealing`.
- **No worker image published or deployed.** No workflow dispatched, nothing
  built, tagged, pushed or pulled.
- **No commercial enabling.** `commerciallyEligible` is 0. No override, bypass
  or second commercial rule was added.
- **No captain-only path claimed.** `package.json`, `package-lock.json`,
  `data/rcap-verifier-dispositions.json`, `data/rcap-ledger/`,
  `data/rcap-grade-a/`, `supabase/migrations/`, `docs/rcap/grade-a/captain/`,
  `src/lib/rcap/fulfillment/`, `src/lib/rcap/render/`,
  `src/lib/rcap/state-packs/colorado/` — all untouched.
- **Production not touched.**

## Method notes, for anyone re-deriving this

Two temporary files were created inside the lane worktree and deleted
immediately after use, each with the worktree confirmed clean afterwards:

- `scripts/_tmp-v-instr.mjs` — a copy of `verify-rcap-terminalize-c1.mjs` with
  the drift assertion instrumented to print `configPath` and both hashes, used
  to resolve the eighteen verifier labels to eighteen distinct files. The
  verifier's own working-tree check caught it while it existed, which is the
  behaviour you want.
- `scripts/_lane_j_probe.mjs` — a copy of
  `verify-screening-verification-finetune.mjs` carrying only the proposed line-711
  edit, used to establish that the single change makes the whole proof pass
  (`screening-verification-finetune: OK`, exit 0) and to compute the proposed new
  proof hash. The protected original was never written to.

Every hash quoted in this lane was recomputed from the file it names. None was
read back out of a committed record.
