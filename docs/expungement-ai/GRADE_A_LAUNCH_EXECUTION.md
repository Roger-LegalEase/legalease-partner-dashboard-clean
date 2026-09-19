# Grade A launch execution

Controlling plan: `ExpungementAI_Captain_Handoff_v2/01_Grade_A_Launch_Build_Plan.md`.
Everything else — old prompts, blocker ledgers, audits, verifier reports,
source-recovery reports, finish queues — supplies facts, not missions.

**Rule: every active task names a Build Plan section. If it cannot, it goes to
POST_LAUNCH_BACKLOG, unless it proves a defect that stops the intended launch
product working correctly.**

Release candidate: `captain-release` @ `0bf6f8191` (local; 5 commits unpushed,
push held by owner instruction).

## Scope gate — answer before any item becomes active

- **A.** Which Build Plan item does this close?
- **B.** What customer or release defect does it fix?
- **C.** Is it necessary for the intended launch product? If no → backlog.
- **D.** What is the smallest change that closes it?

A failing test alone is not sufficient.

## Phases and states

States: `ACTIVE` · `READY` · `EXTERNAL BLOCKER` · `DONE`.
WIP limit: **3 implementation lanes**. Captain owns integration and shared files.
One writer per shared file. No verifier-governance lane, no ledger-reconciliation
lane, no agent swarm.

| # | Phase | Plan §  |
|---|---|---|
| 1 | Shared document foundation | 4 |
| 2 | Packet-information UX | 6 |
| 3 | Nationwide document remediation | 5 |
| 4 | Supplemental renderer | 7 |
| 5 | Integrated acceptance | 9 |
| 6 | Build / deploy / launch | 10 |

## Active

| Item | Phase | State | Note |
|---|---|---|---|
| GA-5-TOKENS unresolved caption tokens on filed documents | 3 | `READY` | 11 of 28 rendered documents print `{courtLevel}`, `{county}`, `{caseNumber}` etc. in captions; needs per-config sourced values |
| GA-5-MS reapply the reverted `routeKeys` binding fix | 3 | `ACTIVE` | 132C. Reverted earlier to hold `rebuildRequired:false`; that is no longer the accepted end state |

## External blockers

| Item | Phase | Exact action needed | From |
|---|---|---|---|
| GA-5-CA 1203.4a output legal approval | 3 | Grant or refuse the output legal approval; `approval-request.json` is `REQUESTED`, `grantedBy: null` | Roger / counsel |
| GA-5-KYWV successor answers (1/122) | 3 | Re-review owner answers against successor compiled-profile bytes | Counsel / owner |
| GA-5-41 six pathway adjudications | 3 | Individual commercial classification for MA, NE, NJ, NV, OR, SD | Roger |
| GA-8-127 nine patch successors + CA carrier | 3 | Adopt successor bytes; authorize re-freezing the correction assignment | Roger |
| GA-8-22E1 corpus mount | 3 | Master Library (28 sources) + complete 583-file Nationwide package at their declared paths | Source custodian |
| GA-10 push target and hosted-acceptance token role | 6 | Resolve branch target; grant Auth Config read-write on `hyflxnlhpmiqxvvcoiia` | Roger |
| GA-4.4-ND visual review re-run | 1 | Page-by-page visual review of both ND packets at renderer 2.0.0 (8 pages each); the committed reviews are bound to 1.x bytes and are stale. Not regenerable — a person performs it | Visual reviewer |
| GA-4.4-ND output legal review re-run | 1 | Output legal review of the ND Chapter 12-60.1 packet at 2.0.0 bytes | Counsel |

## Done

| Item | Phase | Evidence |
|---|---|---|
| GA-4.3 cross-jurisdiction presentation fallback removed | 1 | 13 configs now refuse; PA byte-identical 3/3; 190 checks |
| GA-4.4 product branding removed from court-facing documents | 1 | renderer 1.0.0 -> 2.0.0; QA rule inverted; ND footer now audience-driven |
| Memo lineage restoration (32) | — | `e1834aac7`; sweep step 154 |
| Resolution-lane sidecar (33) | — | `d01cc0e30`; steps 155, 158 |
| Per-question out-of-scope reasons (36B) | — | steps 164, 165 |
| Authority-derived hardening expectation | — | step 254 |
| Verifier register re-observed | — | `11fe14d0f`; 513-script audit |

## Post-launch backlog

One sentence each. No investigation beyond bucket assignment.

- Tracked Python bytecode cache `scripts/rcap-packet-recovery/__pycache__/*.pyc` dirties the tree on every Python test run.
- Price-surface mutation is honestly `undetected`; re-aim it when next in that file.
- `verify-rcap-session-13-terminalization.mjs` rewrites tracked files when run (now `quarantine`).

## Owner-only decisions

1. Reduce intended launch coverage.
2. Production promotion or production-risk actions not already authorized.
3. Change the Build Plan's definition of done.

Routine implementation choices are the Captain's.

## Commit convention

`GA-<section> <what changed>` — e.g. `GA-4.3 remove cross-jurisdiction presentation fallback`.
