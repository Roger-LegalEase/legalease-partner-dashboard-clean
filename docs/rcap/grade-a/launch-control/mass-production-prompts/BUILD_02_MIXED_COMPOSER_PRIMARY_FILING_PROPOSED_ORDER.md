# BUILD_02_MIXED_COMPOSER_PRIMARY_FILING_PROPOSED_ORDER

**Engine:** Codex  ·  **Lane:** packet-build  ·  **Sequence:** 2
**Worker branch:** `codex/build-02-mass-production`
**Branch from:** `27386bbf8471344143081de065311d761cfcf118`
**Read this assignment from:** `origin/claude/legalease-sprint-captain-utucnw` → `data/rcap-grade-a/launch-control/MASS_PACKET_PRODUCTION_150.json`
**Workspace:** one isolated workspace, one branch. No shared worktree.
**Repository:** Roger-LegalEase/legalease-partner-dashboard-clean

> The assignment manifest is NOT in the commit you branch from. Read it from the Captain branch tip and verify that its `captainBaseSha` is the commit you branched from — if it is not, stop.

## Mission

Build 11 packet families to the standard builder contract. They are one lane because they share a component assembly — not because they share a state.

**Runs after:** SHARED_A_PRODUCTION_HARNESS. Do not start until that lane's work is integrated onto your base.

## The 11 families

Shared across the whole lane: **component assembly**. Varying: sharedBuildRunner, officialForm, overlayComposer, componentAssembly, fieldMapSchema, routeOptionLogic.

shared build runner, official form, overlay/composer, component assembly, field-map schema and route-option logic. Jurisdiction is recorded on every family and used as a grouping reason on none.

| Family | Jur | Strategy | Official forms | Component assembly | Routes | Overlay directory |
| --- | --- | --- | --- | --- | ---: | --- |
| `ks-21-6614-conviction-set` | KS | official_pdf_fill | KS-CRIMINAL-COVER-SHEET-10-14-2025, KSJC-NOTICE-OF-HEARING-12-2016, KSJC-ORDER-DENYING-EXPUNGEMENT-12-2016, KSJC-ORDER-EXPUNGEMENT-COVER-SHEET-12-2016, KSJC-ORDER-FOR-EXPUNGEMENT-CONVICTION-OR-DIVERSION-08-2022, KSJC-PETITION-EXPUNGEMENT-CONVICTION-OR-DIVERSION-08-2022 | cover_sheet, notice, primary_filing, proposed_order | 1 | `data/rcap-all50/overlays/census-v1/ks/ks-21-6614-conviction-set--official-pdf-fill` *(new)* |
| `ks-21-6614-diversion-set` | KS | official_pdf_fill | KS-CRIMINAL-COVER-SHEET-10-14-2025, KSJC-NOTICE-OF-HEARING-12-2016, KSJC-ORDER-DENYING-EXPUNGEMENT-12-2016, KSJC-ORDER-EXPUNGEMENT-COVER-SHEET-12-2016, KSJC-ORDER-FOR-EXPUNGEMENT-CONVICTION-OR-DIVERSION-08-2022, KSJC-PETITION-EXPUNGEMENT-CONVICTION-OR-DIVERSION-08-2022 | cover_sheet, notice, primary_filing, proposed_order | 1 | `data/rcap-all50/overlays/census-v1/ks/ks-21-6614-diversion-set--official-pdf-fill` *(new)* |
| `ks-21-6614-prostitution-coercion-set` | KS | official_pdf_fill | KS-CRIMINAL-COVER-SHEET-10-14-2025, KSJC-NOTICE-OF-HEARING-12-2016, KSJC-ORDER-DENYING-EXPUNGEMENT-12-2016, KSJC-ORDER-EXPUNGEMENT-COVER-SHEET-12-2016, KSJC-ORDER-FOR-EXPUNGEMENT-CONVICTION-OR-DIVERSION-08-2022, KSJC-PETITION-EXPUNGEMENT-CONVICTION-OR-DIVERSION-08-2022 | cover_sheet, notice, primary_filing, proposed_order | 1 | `data/rcap-all50/overlays/census-v1/ks/ks-21-6614-prostitution-coercion-set--official-pdf-fill` *(new)* |
| `ks-22-2410-arrest-set` | KS | official_pdf_fill | KS-CRIMINAL-COVER-SHEET-10-14-2025, KSJC-ORDER-EXPUNGEMENT-ARREST-RECORD-COVER-SHEET-12-2016, KSJC-PETITION-EXPUNGEMENT-ARREST-RECORD-02-2013 | cover_sheet, primary_filing, proposed_order | 1 | `data/rcap-all50/overlays/census-v1/ks/ks-22-2410-arrest-set--official-pdf-fill` *(new)* |
| `co_multiple_conviction_seal-set` | CO | official_pdf_fill | JDF-641, JDF-642 | primary_filing, proposed_order | 1 | `data/rcap-all50/overlays/census-v1/co/co-multiple-conviction-seal-set--official-pdf-fill` *(new)* |
| `co_pardoned_conviction_seal-set` | CO | official_pdf_fill | JDF-680, JDF-681 | primary_filing, proposed_order | 1 | `data/rcap-all50/overlays/census-v1/co/co-pardoned-conviction-seal-set--official-pdf-fill` *(new)* |
| `ky_void_seal_controlled_substance-set` | KY | custom_pleading | AOC-334 | certificate_of_service, primary_filing, proposed_order | 1 | `data/rcap-all50/overlays/census-v1/ky/ky-void-seal-controlled-substance-set--custom-pleading` *(new)* |
| `ky_void_seal_marijuana_synthetic_salvia-set` | KY | custom_pleading | AOC-334 | certificate_of_service, primary_filing, proposed_order | 1 | `data/rcap-all50/overlays/census-v1/ky/ky-void-seal-marijuana-synthetic-salvia-set--custom-pleading` *(new)* |
| `pa_age70_deceased-set` | PA | official_pdf_fill | PA-RCRIM-P-790-ORDER, PA-RCRIM-P-790-PETITION | certificate_of_service, primary_filing, proposed_order | 2 | `data/rcap-all50/overlays/census-v1/pa/pa-age70-deceased-set--official-pdf-fill` *(new)* |
| `ak-tf805-set` | AK | official_pdf_fill | TF-805 | certificate_of_service, primary_filing, proposed_order | 1 | `data/rcap-all50/overlays/census-v1/ak/ak-tf805-set--official-pdf-fill` |
| `co_motion_seal_conviction-set` | CO | official_pdf_fill | JDF-612, JDF-615 | primary_filing, proposed_order, required_filing | 1 | `data/rcap-all50/overlays/census-v1/co/co-motion-seal-conviction-set--official-pdf-fill` *(new)* |

## The standard builder contract

Every family produces all eight, or it is a STOPPED row:

- canonical artifact — the filing-ready document set, rendered
- boundary artifact — the same set at the route's boundary condition, so a reader can see what changes and what does not
- all required companion documents — every component the route's assembly names, rendered; none mapped into the packet and skipped
- complete filing instructions — where it goes, what it costs, what must be served, and in what order
- visible-write proof — every write located on the page it renders on, so an invisible write cannot pass as a written field
- blank-disposition ledger — every blank carrying an approved disposition from the closed vocabulary
- completeness report — the nine counters, per document and for the family
- all nine completeness counters equal zero

A family is COMPLETED only when all nine counters are zero. A counter this lane cannot zero is a STOPPED row with the exact reason, never a lowered bar.

**A builder may not approve its own packet. Verification is a separate lane, and a builder that reports its own family as proven has exceeded its authority.**

Run the focused checks named in the assignment. Do not run the full national repository chain: it runs at Captain integration checkpoints, and a worker that runs it spends its slot proving something nobody asked it to prove.

A fact the platform does not hold is classified required_before_filing and surfaced to the participant. A guessed arresting agency is worse than a blank one: the blank is visible and the guess is not.

Never prefill: participant signature; signature date; certificate of mailing before actual mailing; any court-only or prosecutor-only field.

## Owned paths — write only here

- `data/rcap-grade-a/mass-production/build-02-mass-production/**`
- `data/rcap-all50/overlays/census-v1/ks/ks-21-6614-conviction-set--official-pdf-fill/**`
- `data/rcap-all50/overlays/census-v1/ks/ks-21-6614-diversion-set--official-pdf-fill/**`
- `data/rcap-all50/overlays/census-v1/ks/ks-21-6614-prostitution-coercion-set--official-pdf-fill/**`
- `data/rcap-all50/overlays/census-v1/ks/ks-22-2410-arrest-set--official-pdf-fill/**`
- `data/rcap-all50/overlays/census-v1/co/co-multiple-conviction-seal-set--official-pdf-fill/**`
- `data/rcap-all50/overlays/census-v1/co/co-pardoned-conviction-seal-set--official-pdf-fill/**`
- `data/rcap-all50/overlays/census-v1/ky/ky-void-seal-controlled-substance-set--custom-pleading/**`
- `data/rcap-all50/overlays/census-v1/ky/ky-void-seal-marijuana-synthetic-salvia-set--custom-pleading/**`
- `data/rcap-all50/overlays/census-v1/pa/pa-age70-deceased-set--official-pdf-fill/**`
- `data/rcap-all50/overlays/census-v1/ak/ak-tf805-set--official-pdf-fill/**`
- `data/rcap-all50/overlays/census-v1/co/co-motion-seal-conviction-set--official-pdf-fill/**`
- `scripts/build-census-v1-ks-21-6614-conviction-set.mjs`
- `scripts/build-census-v1-ks-21-6614-diversion-set.mjs`
- `scripts/build-census-v1-ks-21-6614-prostitution-coercion-set.mjs`
- `scripts/build-census-v1-ks-22-2410-arrest-set.mjs`
- `scripts/build-census-v1-co_multiple_conviction_seal-set.mjs`
- `scripts/build-census-v1-co_pardoned_conviction_seal-set.mjs`
- `scripts/build-census-v1-ky_void_seal_controlled_substance-set.mjs`
- `scripts/build-census-v1-ky_void_seal_marijuana_synthetic_salvia-set.mjs`
- `scripts/build-census-v1-pa_age70_deceased-set.mjs`
- `scripts/build-census-v1-ak-tf805-set.mjs`
- `scripts/build-census-v1-co_motion_seal_conviction-set.mjs`

## Never write here

- `scripts/rcap-packet-completeness/**`
- `scripts/rcap-mass-production-pipeline/**`
- `data/rcap-grade-a/launch-control/**`

## Required outputs

- data/rcap-grade-a/mass-production/build-02-mass-production/rows.json — one row per family: itemId, status, the nine counters, and the artifacts produced
- data/rcap-grade-a/mass-production/build-02-mass-production/completeness.json — the per-family completeness report, nine counters each
- data/rcap-grade-a/mass-production/build-02-mass-production/blank-dispositions.json — the blank-disposition ledger for every family in this lane
- data/rcap-grade-a/mass-production/build-02-mass-production/visible-writes.json — the visible-write proof for every family in this lane
- data/rcap-grade-a/mass-production/build-02-mass-production/filing-instructions.json — the complete filing instructions for every family in this lane
- data/rcap-all50/overlays/census-v1/ks/ks-21-6614-conviction-set--official-pdf-fill/reports/rendered-artifacts.json — the canonical and boundary artifacts for ks-21-6614-conviction-set, with companion documents
- data/rcap-all50/overlays/census-v1/ks/ks-21-6614-diversion-set--official-pdf-fill/reports/rendered-artifacts.json — the canonical and boundary artifacts for ks-21-6614-diversion-set, with companion documents
- data/rcap-all50/overlays/census-v1/ks/ks-21-6614-prostitution-coercion-set--official-pdf-fill/reports/rendered-artifacts.json — the canonical and boundary artifacts for ks-21-6614-prostitution-coercion-set, with companion documents
- data/rcap-all50/overlays/census-v1/ks/ks-22-2410-arrest-set--official-pdf-fill/reports/rendered-artifacts.json — the canonical and boundary artifacts for ks-22-2410-arrest-set, with companion documents
- data/rcap-all50/overlays/census-v1/co/co-multiple-conviction-seal-set--official-pdf-fill/reports/rendered-artifacts.json — the canonical and boundary artifacts for co_multiple_conviction_seal-set, with companion documents
- data/rcap-all50/overlays/census-v1/co/co-pardoned-conviction-seal-set--official-pdf-fill/reports/rendered-artifacts.json — the canonical and boundary artifacts for co_pardoned_conviction_seal-set, with companion documents
- data/rcap-all50/overlays/census-v1/ky/ky-void-seal-controlled-substance-set--custom-pleading/reports/rendered-artifacts.json — the canonical and boundary artifacts for ky_void_seal_controlled_substance-set, with companion documents
- data/rcap-all50/overlays/census-v1/ky/ky-void-seal-marijuana-synthetic-salvia-set--custom-pleading/reports/rendered-artifacts.json — the canonical and boundary artifacts for ky_void_seal_marijuana_synthetic_salvia-set, with companion documents
- data/rcap-all50/overlays/census-v1/pa/pa-age70-deceased-set--official-pdf-fill/reports/rendered-artifacts.json — the canonical and boundary artifacts for pa_age70_deceased-set, with companion documents
- data/rcap-all50/overlays/census-v1/ak/ak-tf805-set--official-pdf-fill/reports/rendered-artifacts.json — the canonical and boundary artifacts for ak-tf805-set, with companion documents
- data/rcap-all50/overlays/census-v1/co/co-motion-seal-conviction-set--official-pdf-fill/reports/rendered-artifacts.json — the canonical and boundary artifacts for co_motion_seal_conviction-set, with companion documents

### Output schema

Array key `rows`, item key `itemId`, status words: `COMPLETED`, `STOPPED`.

Detail goes in separate fields. An unrecognised status is refused at integration rather than translated.

## Focused tests

- `node scripts/rcap-packet-completeness/verify-packet-completeness.mjs`
- `npm run typecheck`

> Focused checks only. The full national repository chain runs at Captain integration checkpoints, never inside a worker.

## Stop conditions

- WEC-6: every stop states its scope. A ROW stop records that family and continues; a LANE stop says why the rest are unsafe without it.
- LANE STOP — you do not approve your own packets. Verification is a separate lane and a builder verdict is not a verdict.
- LANE STOP — you build only the families listed here, in only the paths listed here.
- NEVER invent a fact. An unavailable fact is required_before_filing, surfaced to the participant, never guessed.
- NEVER write a protected field — participant signature, signature date, certificate of mailing before mailing, or any court-only or prosecutor-only field.
- ROW STOP — a family whose official source turns out not to be exact after all stops as BLOCKED_SOURCE naming the exact identity that failed, and is reported to the source lane rather than built on a guess.

Stopping with an honest account of what is missing is a complete return.

## Return format

```text
ASSIGNMENT:
WORKER BRANCH:
BASE SHA:
ASSIGNMENT READ FROM:
COMMIT:
FAMILIES COMPLETED:
FAMILIES STOPPED:
NINE COUNTERS ZERO ON:
FACTS CLASSIFIED REQUIRED_BEFORE_FILING:
PROTECTED FIELDS WRITTEN: 0
PACKETS SELF-APPROVED: 0
COMMERCIAL ROUTES OPENED: 0
PRODUCTION TOUCHED: NO
```

## What finishing does not do

A built family is a built family. It is not verified, not approved and not sellable, and this lane may not say otherwise.

## Setup

```sh
git fetch origin --prune
git checkout -b codex/build-02-mass-production 27386bbf8471344143081de065311d761cfcf118
git show origin/claude/legalease-sprint-captain-utucnw:data/rcap-grade-a/launch-control/MASS_PACKET_PRODUCTION_150.json > /tmp/codex-build-02-mass-production.json
# STOP unless that file's captainBaseSha === 27386bbf8471344143081de065311d761cfcf118
npm ci --cache /tmp/legalease-npm-cache   # requires at least 4096 MiB free
bash scripts/rcap-corpus/bootstrap-private-corpus.sh
source private/source-corpus-environment.txt
export MASTER_LIBRARY_SOURCE_DIR="$RCAP_BUNDLE_EXTRACT"
```

Commit your work and `git push -u origin codex/build-02-mass-production`.
