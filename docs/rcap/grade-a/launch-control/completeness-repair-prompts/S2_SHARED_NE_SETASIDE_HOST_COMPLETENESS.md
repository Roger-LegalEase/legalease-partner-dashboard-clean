# S2_SHARED_NE_SETASIDE_HOST_COMPLETENESS

**Engine:** Codex  ·  **Lane:** shared-host-fix  ·  **Runs first**
**Worker branch:** `codex/s2-shared-ne-setaside-host-completeness`
**Branch from:** `09ada500b42b7e2181b30155412bb7e70176b70b`
**Read this assignment from:** `origin/claude/legalease-sprint-captain-utucnw` → `data/rcap-grade-a/launch-control/S2_SHARED_HOST_ASSIGNMENT.json`
**Repository:** Roger-LegalEase/legalease-partner-dashboard-clean

> The assignment manifest is NOT in the commit you branch from. Read it from the Captain branch tip and verify that its `captainBaseSha` is the commit you branched from — if it is not, stop.

## Mission

Correct the completeness defects carried by scripts/build-census-v1-ne-setaside-custodial-set.mjs, once, for all 12 scripts that import it. You render no packet and you touch no overlay directory: this lane changes shared logic and measures what that does to every importer.

## The host and who depends on it

`scripts/build-census-v1-ne-setaside-custodial-set.mjs`

**12 importers**, all direct (12 direct, 0 transitive-only). With the host itself that is **13 scripts** and **11 built families** in the closure.

| Family | C11 status | Owning lane | Completeness now |
| --- | --- | --- | --- |
| `ne-setaside-noncustodial-set` | STOPPED_WITH_EXACT_BLOCKER | R3_ROUTE_MAPPING_REMAINDER | — |
| `ne-trafficking-setaside-and-seal-set` | STOPPED_WITH_EXACT_BLOCKER | R4_SOURCE_IDENTITY_AND_ACQUISITION | — |
| `sd_arrest_expungement-set` | BUILT | P4_NE_SD_SETASIDE_COMPLETENESS | FAIL_MISSING_REQUIRED_FACTS |
| `ut_pet_acquittal-set` | BUILT | P1_UT_PETITION_EXPUNGE_COMPLETENESS | FAIL_MISSING_PREFILLS |
| `ut_pet_conviction-set` | BUILT | P1_UT_PETITION_EXPUNGE_COMPLETENESS | FAIL_MISSING_PREFILLS |
| `ut_pet_dismissed_with_prejudice-set` | BUILT | P1_UT_PETITION_EXPUNGE_COMPLETENESS | FAIL_MISSING_PREFILLS |
| `ut_pet_dismissed_without_prejudice-set` | BUILT | P1_UT_PETITION_EXPUNGE_COMPLETENESS | FAIL_MISSING_PREFILLS |
| `ut_pet_limitations-set` | BUILT | P1_UT_PETITION_EXPUNGE_COMPLETENESS | FAIL_MISSING_PREFILLS |
| `ut_pet_no_charges-set` | BUILT | P1_UT_PETITION_EXPUNGE_COMPLETENESS | FAIL_MISSING_PREFILLS |
| `ut_pet_traffic-set` | BUILT | P1_UT_PETITION_EXPUNGE_COMPLETENESS | FAIL_MISSING_PREFILLS |
| `wv_conv_multiple_misdemeanors-set` | BUILT | P3_WV_CONVICTION_COMPLETENESS | FAIL_MISSING_PREFILLS |
| `wv_conv_single_misdemeanor-set` | BUILT | P3_WV_CONVICTION_COMPLETENESS | FAIL_MISSING_PREFILLS |
| `ne-setaside-custodial-set` **(the host itself)** | BUILT | P4_NE_SD_SETASIDE_COMPLETENESS | FAIL_MISSING_REQUIRED_FACTS |

_The host is itself a built family. Its packet is repaired by its own lane, not by S2; S2 changes only the shared logic inside its build script._

### Why two counts have been quoted

Both numbers were correct about different populations and neither was stated with its scope. The import graph controls: 12 importers, 13 scripts in the closure once the host is counted.

- **12** — 12 scripts import the host. That is the number the prompt tables showed, because ownership is decided by scripts, not by families.
- **10** — 10 of the 12 importers are BUILT families inside the S1-unaffected repair wave, and that is the number the family-level view showed. It was right about built families and silent about the rest.
- The gap is `ne-setaside-noncustodial-set` (STOPPED_WITH_EXACT_BLOCKER, R3_ROUTE_MAPPING_REMAINDER) and `ne-trafficking-setaside-and-seal-set` (STOPPED_WITH_EXACT_BLOCKER, R4_SOURCE_IDENTITY_AND_ACQUISITION).

## What you correct

**In scope — only what the host actually carries:**

- shared fact-map defects: a known participant or case fact the host refuses with a statement of build policy rather than a property of the field
- blank-disposition defects: a blank the host leaves with no approved disposition from the closed vocabulary
- route-option defects: an election the route determines that the host leaves to the participant
- row-completion defects: a repeating row the host fills partially, which reads as a finished row and is not
- component-policy defects: a document the host maps into the packet and never renders

**Out of scope:**

- any packet render
- any overlay directory
- any other build script, including the two S1 runners
- any change that is a per-family correction rather than shared logic — if it belongs to one family it belongs to that family's lane


Correct only what the host actually carries. A defect that turns out to be per-family is reported to the owning lane, not fixed here.

## Measurement you owe

- **before** — `node scripts/rcap-packet-completeness/verify-packet-completeness.mjs --write, captured before any edit`
- **after** — `the same command after the correction`
- **report** — every one of the 11 built families in the closure, with counters before and after, plus any family outside the closure whose counters moved — a family outside the closure that moves means the change was not confined to this host

Report movement, not improvement. A counter that rises is as important as one that falls, and a family outside the closure that moves at all is a finding.

## Owned paths — write only here

- `data/rcap-grade-a/wave-2/s2-shared-ne-setaside-host-completeness/**`
- `scripts/build-census-v1-ne-setaside-custodial-set.mjs`

**You render zero packets and modify zero overlay directories.**

## Required inputs

- `data/rcap-grade-a/launch-control/S2_SHARED_HOST_ASSIGNMENT.json  (read from the Captain branch tip, not from the baseline)`
- `scripts/rcap-packet-completeness/completeness-contract.mjs`
- `data/rcap-grade-a/packet-completeness/PACKET_COMPLETENESS_MATRIX.json`
- `data/rcap-grade-a/launch-control/COMPLETENESS_REPAIR_WAVE.json`
- `docs/rcap/grade-a/route-obligation-census/PACKET_WORKER_BRIEF.md`

## Required outputs

- data/rcap-grade-a/wave-2/s2-shared-ne-setaside-host-completeness/rows.json — one row per defect corrected in the host: itemId, status, the defect class, the field classes it affected, and the importer families it reaches
- data/rcap-grade-a/wave-2/s2-shared-ne-setaside-host-completeness/fleet-audit-before-after.json — the full completeness matrix before and after, and the per-family counter movement for every family in the closure
- scripts/build-census-v1-ne-setaside-custodial-set.mjs — the corrected shared host

### Output schema

WEC-5: the output schema is fixed, not left to the lane. Array key `rows`, item key `itemId`, completion words `COMPLETED` and `STOPPED` only.

Detail goes in separate fields. An unrecognised status is refused at integration rather than translated.

## Focused tests

- `node scripts/rcap-packet-completeness/verify-packet-completeness.mjs`
- `node scripts/rcap-packet-completeness/verify-packet-completeness.mjs --mutations`
- `node scripts/grade-a-launch-control/verify-launch-control.mjs`
- `npm run typecheck`

## Stop conditions

- WEC-6: every stop below states its scope. A ROW stop records that defect and continues; a LANE stop says why the rest are unsafe without it.
- LANE STOP — you render no packet and you write into no overlay directory. Re-rendering belongs to P1, P3, P4 and the host family's own lane, after Captain publishes the continuation record.
- LANE STOP — you own one build script. Do not touch the two S1 runners, any other build script, or any other lane's paths.
- NEVER invent a fact. A fact the platform does not hold is classified required_before_filing and surfaced to the participant, not guessed. A guessed arresting agency is worse than a blank one: the blank is visible and the guess is not.
- NEVER write a protected field — participant signature, signature date, certificate of mailing before mailing, or any court-only or prosecutor-only field.
- ROW STOP — a defect that is per-family rather than shared is reported to the owning lane (R3_ROUTE_MAPPING_REMAINDER, R4_SOURCE_IDENTITY_AND_ACQUISITION, P4_NE_SD_SETASIDE_COMPLETENESS, P1_UT_PETITION_EXPUNGE_COMPLETENESS, P3_WV_CONVICTION_COMPLETENESS) and left alone.
- ROW STOP — a correction that would move a family outside the closure stops and is reported. Its blast radius is the twelve importers and the host, and nothing else.

Stopping with an honest account of what is missing is a complete return.

## How P1, P3 and P4 consume your result

They already carry a stop condition sending an unresolvable host defect to Captain. This contract is what Captain does with it, so nothing they were dispatched with has to move underneath them.

| Step | Actor | Action |
| ---: | --- | --- |
| 1 | S2 worker | returns on codex/s2-shared-ne-setaside-host-completeness with the corrected host and a before/after fleet audit |
| 2 | Captain | verifies the return, confirms it modified scripts/build-census-v1-ne-setaside-custodial-set.mjs and nothing else, and integrates it by cherry-picking the exact commit |
| 3 | Captain | runs the completeness fleet audit and publishes data/rcap-grade-a/launch-control/S2_CONTINUATION.json naming the integration commit, the per-family counter movement, and the exact continuation base |
| 4 | P1, P3, P4 | rebase the worker branch onto the continuation base named in that record, then re-render |
| 5 | Captain | reruns the fleet audit and confirms every repaired family reaches PASS_COMPLETE |

A lane may not re-render against a host it has not confirmed by ancestry. The continuation record names the commit; the worker checks that its base is an ancestor of it, and stops if it is not. `git merge-base --is-ancestor <continuationBase> HEAD`

## Return format

```text
ASSIGNMENT:
WORKER BRANCH:
BASE SHA:
ASSIGNMENT READ FROM:
COMMIT:
HOST DEFECTS CORRECTED:
DEFECT CLASSES:
IMPORTER FAMILIES WHOSE COUNTERS MOVED:
FAMILIES OUTSIDE THE CLOSURE THAT MOVED: 0
PACKETS RENDERED: 0
OVERLAY DIRECTORIES MODIFIED: 0
FACTS CLASSIFIED REQUIRED_BEFORE_FILING:
STOPPED AND REPORTED:
COMMERCIAL ROUTES OPENED: 0
PRODUCTION TOUCHED: NO
```

## What finishing does not do

A corrected host is corrected logic. It renders no packet, proves no packet, opens no route and approves no output.

## Setup

```sh
git fetch origin --prune
git checkout -b codex/s2-shared-ne-setaside-host-completeness 09ada500b42b7e2181b30155412bb7e70176b70b
git show origin/claude/legalease-sprint-captain-utucnw:data/rcap-grade-a/launch-control/S2_SHARED_HOST_ASSIGNMENT.json > /tmp/s2-assignment.json
# STOP unless /tmp/s2-assignment.json captainBaseSha === 09ada500b42b7e2181b30155412bb7e70176b70b
npm ci --cache /tmp/legalease-npm-cache   # requires at least 4096 MiB free
bash scripts/rcap-corpus/bootstrap-private-corpus.sh
source private/source-corpus-environment.txt
export MASTER_LIBRARY_SOURCE_DIR="$RCAP_BUNDLE_EXTRACT"
```

Commit your work and `git push -u origin codex/s2-shared-ne-setaside-host-completeness`.
