# BUILD_01_OFFICIAL_PDF_FILL_FEE_WAIVER_APPLICATION

**Engine:** Codex  ·  **Lane:** packet-build  ·  **Sequence:** 2
**Worker branch:** `codex/build-01-mass-production`
**Branch from:** `27386bbf8471344143081de065311d761cfcf118`
**Read this assignment from:** `origin/claude/legalease-sprint-captain-utucnw` → `data/rcap-grade-a/launch-control/MASS_PACKET_PRODUCTION_150.json`
**Workspace:** one isolated workspace, one branch. No shared worktree.
**Repository:** Roger-LegalEase/legalease-partner-dashboard-clean

> The assignment manifest is NOT in the commit you branch from. Read it from the Captain branch tip and verify that its `captainBaseSha` is the commit you branched from — if it is not, stop.

## Mission

Build 12 packet families to the standard builder contract. They are one lane because they share sharedBuildRunner, overlayComposer, fieldMapSchema, routeOptionLogic — not because they share a state.

**Runs after:** SHARED_A_PRODUCTION_HARNESS. Do not start until that lane's work is integrated onto your base.

## The 12 families

Shared across the whole lane: **sharedBuildRunner, overlayComposer, fieldMapSchema, routeOptionLogic**. Varying: officialForm, componentAssembly.

shared build runner, official form, overlay/composer, component assembly, field-map schema and route-option logic. Jurisdiction is recorded on every family and used as a grouping reason on none.

| Family | Jur | Strategy | Official forms | Component assembly | Routes | Overlay directory |
| --- | --- | --- | --- | --- | ---: | --- |
| `vt_seal_18_to_21-set` | VT | official_pdf_fill | 200-00130, 200-00132, 600-00228 | fee_waiver_application, filing_and_expectation_instructions, petition, stipulation_and_proposed_order | 1 | `data/rcap-all50/overlays/census-v1/vt/vt-seal-18-to-21-set--official-pdf-fill` *(new)* |
| `vt_seal_dui-set` | VT | official_pdf_fill | 200-00130, 200-00132, 600-00228 | fee_waiver_application, filing_and_expectation_instructions, petition, stipulation_and_proposed_order | 1 | `data/rcap-all50/overlays/census-v1/vt/vt-seal-dui-set--official-pdf-fill` *(new)* |
| `vt_seal_felony-set` | VT | official_pdf_fill | 200-00130, 200-00132, 600-00228 | fee_waiver_application, filing_and_expectation_instructions, petition, stipulation_and_proposed_order | 1 | `data/rcap-all50/overlays/census-v1/vt/vt-seal-felony-set--official-pdf-fill` *(new)* |
| `vt_seal_misdemeanor-set` | VT | official_pdf_fill | 200-00130, 200-00132, 600-00228 | fee_waiver_application, filing_and_expectation_instructions, petition, stipulation_and_proposed_order | 1 | `data/rcap-all50/overlays/census-v1/vt/vt-seal-misdemeanor-set--official-pdf-fill` *(new)* |
| `vt_seal_pardon-set` | VT | official_pdf_fill | 200-00130, 200-00132, 600-00228 | fee_waiver_application, filing_and_expectation_instructions, petition, stipulation_and_proposed_order | 1 | `data/rcap-all50/overlays/census-v1/vt/vt-seal-pardon-set--official-pdf-fill` *(new)* |
| `vt_exp_decriminalized-set` | VT | official_pdf_fill | 200-00129, 200-00132A, 600-00228 | fee_waiver_application, filing_and_expectation_instructions, petition, stipulation_and_proposed_order | 1 | `data/rcap-all50/overlays/census-v1/vt/vt-exp-decriminalized-set--official-pdf-fill` *(new)* |
| `va_seal_ancillary_matter_only-set` | VA | official_pdf_fill | CC-1201 | ccre_forwarding_request, commonwealth_service_and_stipulation_request, filing_instructions, primary_filing, records_checklist | 1 | `data/rcap-all50/overlays/census-v1/va/va-seal-ancillary-matter-only-set--official-pdf-fill` *(new)* |
| `va_seal_enumerated_seven_year-set` | VA | official_pdf_fill | CC-1201 | ccre_forwarding_request, commonwealth_service_and_stipulation_request, filing_instructions, primary_filing, records_checklist | 1 | `data/rcap-all50/overlays/census-v1/va/va-seal-enumerated-seven-year-set--official-pdf-fill` *(new)* |
| `va_seal_petition_felony-set` | VA | official_pdf_fill | CC-1201 | ccre_forwarding_request, commonwealth_service_and_stipulation_request, filing_instructions, primary_filing, records_checklist | 1 | `data/rcap-all50/overlays/census-v1/va/va-seal-petition-felony-set--official-pdf-fill` *(new)* |
| `va_seal_petition_misdemeanor-set` | VA | official_pdf_fill | CC-1201 | ccre_forwarding_request, commonwealth_service_and_stipulation_request, filing_instructions, primary_filing, records_checklist | 1 | `data/rcap-all50/overlays/census-v1/va/va-seal-petition-misdemeanor-set--official-pdf-fill` *(new)* |
| `va_exp_nonconviction-set` | VA | official_pdf_fill | CC-1473 | ccre_forwarding_request, commonwealth_service_and_stipulation_request, filing_instructions, primary_filing, records_checklist | 1 | `data/rcap-all50/overlays/census-v1/va/va-exp-nonconviction-set--official-pdf-fill` *(new)* |
| `wi_exp_cr266-set` | WI | official_pdf_fill | CR-266, CR-267 | filing_instructions, primary_filing, proposed_order | 1 | `data/rcap-all50/overlays/census-v1/wi/wi-exp-cr266-set--official-pdf-fill` *(new)* |

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

- `data/rcap-grade-a/mass-production/build-01-mass-production/**`
- `data/rcap-all50/overlays/census-v1/vt/vt-seal-18-to-21-set--official-pdf-fill/**`
- `data/rcap-all50/overlays/census-v1/vt/vt-seal-dui-set--official-pdf-fill/**`
- `data/rcap-all50/overlays/census-v1/vt/vt-seal-felony-set--official-pdf-fill/**`
- `data/rcap-all50/overlays/census-v1/vt/vt-seal-misdemeanor-set--official-pdf-fill/**`
- `data/rcap-all50/overlays/census-v1/vt/vt-seal-pardon-set--official-pdf-fill/**`
- `data/rcap-all50/overlays/census-v1/vt/vt-exp-decriminalized-set--official-pdf-fill/**`
- `data/rcap-all50/overlays/census-v1/va/va-seal-ancillary-matter-only-set--official-pdf-fill/**`
- `data/rcap-all50/overlays/census-v1/va/va-seal-enumerated-seven-year-set--official-pdf-fill/**`
- `data/rcap-all50/overlays/census-v1/va/va-seal-petition-felony-set--official-pdf-fill/**`
- `data/rcap-all50/overlays/census-v1/va/va-seal-petition-misdemeanor-set--official-pdf-fill/**`
- `data/rcap-all50/overlays/census-v1/va/va-exp-nonconviction-set--official-pdf-fill/**`
- `data/rcap-all50/overlays/census-v1/wi/wi-exp-cr266-set--official-pdf-fill/**`
- `scripts/build-census-v1-vt_seal_18_to_21-set.mjs`
- `scripts/build-census-v1-vt_seal_dui-set.mjs`
- `scripts/build-census-v1-vt_seal_felony-set.mjs`
- `scripts/build-census-v1-vt_seal_misdemeanor-set.mjs`
- `scripts/build-census-v1-vt_seal_pardon-set.mjs`
- `scripts/build-census-v1-vt_exp_decriminalized-set.mjs`
- `scripts/build-census-v1-va_seal_ancillary_matter_only-set.mjs`
- `scripts/build-census-v1-va_seal_enumerated_seven_year-set.mjs`
- `scripts/build-census-v1-va_seal_petition_felony-set.mjs`
- `scripts/build-census-v1-va_seal_petition_misdemeanor-set.mjs`
- `scripts/build-census-v1-va_exp_nonconviction-set.mjs`
- `scripts/build-census-v1-wi_exp_cr266-set.mjs`

## Never write here

- `scripts/rcap-packet-completeness/**`
- `scripts/rcap-mass-production-pipeline/**`
- `data/rcap-grade-a/launch-control/**`

## Required outputs

- data/rcap-grade-a/mass-production/build-01-mass-production/rows.json — one row per family: itemId, status, the nine counters, and the artifacts produced
- data/rcap-grade-a/mass-production/build-01-mass-production/completeness.json — the per-family completeness report, nine counters each
- data/rcap-grade-a/mass-production/build-01-mass-production/blank-dispositions.json — the blank-disposition ledger for every family in this lane
- data/rcap-grade-a/mass-production/build-01-mass-production/visible-writes.json — the visible-write proof for every family in this lane
- data/rcap-grade-a/mass-production/build-01-mass-production/filing-instructions.json — the complete filing instructions for every family in this lane
- data/rcap-all50/overlays/census-v1/vt/vt-seal-18-to-21-set--official-pdf-fill/reports/rendered-artifacts.json — the canonical and boundary artifacts for vt_seal_18_to_21-set, with companion documents
- data/rcap-all50/overlays/census-v1/vt/vt-seal-dui-set--official-pdf-fill/reports/rendered-artifacts.json — the canonical and boundary artifacts for vt_seal_dui-set, with companion documents
- data/rcap-all50/overlays/census-v1/vt/vt-seal-felony-set--official-pdf-fill/reports/rendered-artifacts.json — the canonical and boundary artifacts for vt_seal_felony-set, with companion documents
- data/rcap-all50/overlays/census-v1/vt/vt-seal-misdemeanor-set--official-pdf-fill/reports/rendered-artifacts.json — the canonical and boundary artifacts for vt_seal_misdemeanor-set, with companion documents
- data/rcap-all50/overlays/census-v1/vt/vt-seal-pardon-set--official-pdf-fill/reports/rendered-artifacts.json — the canonical and boundary artifacts for vt_seal_pardon-set, with companion documents
- data/rcap-all50/overlays/census-v1/vt/vt-exp-decriminalized-set--official-pdf-fill/reports/rendered-artifacts.json — the canonical and boundary artifacts for vt_exp_decriminalized-set, with companion documents
- data/rcap-all50/overlays/census-v1/va/va-seal-ancillary-matter-only-set--official-pdf-fill/reports/rendered-artifacts.json — the canonical and boundary artifacts for va_seal_ancillary_matter_only-set, with companion documents
- data/rcap-all50/overlays/census-v1/va/va-seal-enumerated-seven-year-set--official-pdf-fill/reports/rendered-artifacts.json — the canonical and boundary artifacts for va_seal_enumerated_seven_year-set, with companion documents
- data/rcap-all50/overlays/census-v1/va/va-seal-petition-felony-set--official-pdf-fill/reports/rendered-artifacts.json — the canonical and boundary artifacts for va_seal_petition_felony-set, with companion documents
- data/rcap-all50/overlays/census-v1/va/va-seal-petition-misdemeanor-set--official-pdf-fill/reports/rendered-artifacts.json — the canonical and boundary artifacts for va_seal_petition_misdemeanor-set, with companion documents
- data/rcap-all50/overlays/census-v1/va/va-exp-nonconviction-set--official-pdf-fill/reports/rendered-artifacts.json — the canonical and boundary artifacts for va_exp_nonconviction-set, with companion documents
- data/rcap-all50/overlays/census-v1/wi/wi-exp-cr266-set--official-pdf-fill/reports/rendered-artifacts.json — the canonical and boundary artifacts for wi_exp_cr266-set, with companion documents

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
git checkout -b codex/build-01-mass-production 27386bbf8471344143081de065311d761cfcf118
git show origin/claude/legalease-sprint-captain-utucnw:data/rcap-grade-a/launch-control/MASS_PACKET_PRODUCTION_150.json > /tmp/codex-build-01-mass-production.json
# STOP unless that file's captainBaseSha === 27386bbf8471344143081de065311d761cfcf118
npm ci --cache /tmp/legalease-npm-cache   # requires at least 4096 MiB free
bash scripts/rcap-corpus/bootstrap-private-corpus.sh
source private/source-corpus-environment.txt
export MASTER_LIBRARY_SOURCE_DIR="$RCAP_BUNDLE_EXTRACT"
```

Commit your work and `git push -u origin codex/build-01-mass-production`.
