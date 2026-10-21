# BUILD_05_MIXED_COMPOSER_PRIMARY_FILING_ARREST_EVENT_MAPPING

**Engine:** Codex  ·  **Lane:** packet-build  ·  **Sequence:** 2
**Worker branch:** `codex/build-05-mass-production`
**Branch from:** `27386bbf8471344143081de065311d761cfcf118`
**Read this assignment from:** `origin/claude/legalease-sprint-captain-utucnw` → `data/rcap-grade-a/launch-control/MASS_PACKET_PRODUCTION_150.json`
**Workspace:** one isolated workspace, one branch. No shared worktree.
**Repository:** Roger-LegalEase/legalease-partner-dashboard-clean

> The assignment manifest is NOT in the commit you branch from. Read it from the Captain branch tip and verify that its `captainBaseSha` is the commit you branched from — if it is not, stop.

## Mission

Build 10 packet families to the standard builder contract. They are one lane because they share sharedBuildRunner, fieldMapSchema — not because they share a state.

**Runs after:** SHARED_A_PRODUCTION_HARNESS. Do not start until that lane's work is integrated onto your base.

## The 10 families

Shared across the whole lane: **sharedBuildRunner, fieldMapSchema**. Varying: officialForm, overlayComposer, componentAssembly, routeOptionLogic.

shared build runner, official form, overlay/composer, component assembly, field-map schema and route-option logic. Jurisdiction is recorded on every family and used as a grouping reason on none.

| Family | Jur | Strategy | Official forms | Component assembly | Routes | Overlay directory |
| --- | --- | --- | --- | --- | ---: | --- |
| `mo-610-122-arrest-expungement-set` | MO | official_pdf_fill | CR143, CR145, FI-05, GN10 | Missouri §§ 610.122-.123 Petition | 1 | `data/rcap-all50/overlays/census-v1/mo/mo-610-122-arrest-expungement-set--official-pdf-fill` *(new)* |
| `mo-610-140-conviction-set` | MO | official_pdf_fill | CR360, CR370, FI-05, GN10 | Missouri § 610.140 Expungement Petition | 1 | `data/rcap-all50/overlays/census-v1/mo/mo-610-140-conviction-set--official-pdf-fill` *(new)* |
| `wi_nc_doj_fingerprint_removal-set` | WI | official_pdf_fill | DJ-LE-250B | arrest_event_mapping, disposition_documentation_package, filing_instructions, primary_filing | 1 | `data/rcap-all50/overlays/census-v1/wi/wi-nc-doj-fingerprint-removal-set--official-pdf-fill` *(new)* |
| `or_contempt_setaside-set` | OR | official_pdf_fill | OR-OJD-ADULT-SET-ASIDE-PACKET, OR-OSP-SET-ASIDE-CCH | fingerprint_step, objection_and_hearing_instructions, post_order_verification, primary_filing, proposed_order, record_gathering_instructions, service_instructions | 1 | `data/rcap-all50/overlays/census-v1/or/or-contempt-setaside-set--official-pdf-fill` *(new)* |
| `mt_misdemeanor_expungement-set` | MT | custom_pleading | EXPUNGEMENTREMOVALREQUESTFORM.DOCX | DOJ CRISS expungement submission after the court order (official_pdf_fill), District-court petition for expungement of misdemeanor records (custom_pleading) | 2 | `data/rcap-all50/overlays/census-v1/mt/mt-misdemeanor-expungement-set--custom-pleading` *(new)* |
| `mt_deferred_dismissal-set` | MT | custom_pleading | EXPUNGEMENTREMOVALREQUESTFORM.DOCX | DOJ CRISS submission after the dismissal order (official_pdf_fill), Motion in the sentencing court to strike the plea or verdict, dismiss the charge and seal the case (custom_pleading) | 2 | `data/rcap-all50/overlays/census-v1/mt/mt-deferred-dismissal-set--custom-pleading` *(new)* |
| `ks-21-6614-specialty-court-set` | KS | custom_pleading | KS-CRIMINAL-COVER-SHEET-10-14-2025, KSJC-NOTICE-OF-HEARING-12-2016, KSJC-ORDER-DENYING-EXPUNGEMENT-12-2016, KSJC-ORDER-EXPUNGEMENT-COVER-SHEET-12-2016, KSJC-ORDER-FOR-EXPUNGEMENT-CONVICTION-OR-DIVERSION-08-2022, KSJC-PETITION-EXPUNGEMENT-CONVICTION-OR-DIVERSION-08-2022 | Kansas Specialty-Court Expungement Petition under § 21-6614 | 1 | `data/rcap-all50/overlays/census-v1/ks/ks-21-6614-specialty-court-set--custom-pleading` *(new)* |
| `ks-22-4908-registration-relief-set` | KS | official_pdf_fill | KSJC-ORDER-RELIEF-FROM-OFFENDER-REGISTRATION-COVER-SHEET-06-2022, KSJC-PETITION-EXPUNGEMENT-CONVICTION-OR-DIVERSION-08-2022, KSJC-PETITION-RELIEF-FROM-OFFENDER-REGISTRATION-06-2022 | Companion or combined expungement petition under K.S.A. 21-6614 (official_pdf_fill), Verified petition for relief from offender registration (official_pdf_fill) | 2 | `data/rcap-all50/overlays/census-v1/ks/ks-22-4908-registration-relief-set--official-pdf-fill` *(new)* |
| `or_conviction_setaside-set` | OR | official_pdf_fill | OR-OJD-ADULT-SET-ASIDE-PACKET, OR-OSP-SET-ASIDE-CCH | Oregon Marijuana Set-Aside Motion under ORS 475C.397 | 1 | `data/rcap-all50/overlays/census-v1/or/or-conviction-setaside-set--official-pdf-fill` *(new)* |
| `ma-expunge-mj-set` | MA | official_pdf_fill | TC0021 | Massachusetts Marijuana Expungement Petition under §§ 100K / 100K¼ | 1 | `data/rcap-all50/overlays/census-v1/ma/ma-expunge-mj-set--official-pdf-fill` *(new)* |

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

- `data/rcap-grade-a/mass-production/build-05-mass-production/**`
- `data/rcap-all50/overlays/census-v1/mo/mo-610-122-arrest-expungement-set--official-pdf-fill/**`
- `data/rcap-all50/overlays/census-v1/mo/mo-610-140-conviction-set--official-pdf-fill/**`
- `data/rcap-all50/overlays/census-v1/wi/wi-nc-doj-fingerprint-removal-set--official-pdf-fill/**`
- `data/rcap-all50/overlays/census-v1/or/or-contempt-setaside-set--official-pdf-fill/**`
- `data/rcap-all50/overlays/census-v1/mt/mt-misdemeanor-expungement-set--custom-pleading/**`
- `data/rcap-all50/overlays/census-v1/mt/mt-deferred-dismissal-set--custom-pleading/**`
- `data/rcap-all50/overlays/census-v1/ks/ks-21-6614-specialty-court-set--custom-pleading/**`
- `data/rcap-all50/overlays/census-v1/ks/ks-22-4908-registration-relief-set--official-pdf-fill/**`
- `data/rcap-all50/overlays/census-v1/or/or-conviction-setaside-set--official-pdf-fill/**`
- `data/rcap-all50/overlays/census-v1/ma/ma-expunge-mj-set--official-pdf-fill/**`
- `scripts/build-census-v1-mo-610-122-arrest-expungement-set.mjs`
- `scripts/build-census-v1-mo-610-140-conviction-set.mjs`
- `scripts/build-census-v1-wi_nc_doj_fingerprint_removal-set.mjs`
- `scripts/build-census-v1-or_contempt_setaside-set.mjs`
- `scripts/build-census-v1-mt_misdemeanor_expungement-set.mjs`
- `scripts/build-census-v1-mt_deferred_dismissal-set.mjs`
- `scripts/build-census-v1-ks-21-6614-specialty-court-set.mjs`
- `scripts/build-census-v1-ks-22-4908-registration-relief-set.mjs`
- `scripts/build-census-v1-or_conviction_setaside-set.mjs`
- `scripts/build-census-v1-ma-expunge-mj-set.mjs`

## Never write here

- `scripts/rcap-packet-completeness/**`
- `scripts/rcap-mass-production-pipeline/**`
- `data/rcap-grade-a/launch-control/**`

## Required outputs

- data/rcap-grade-a/mass-production/build-05-mass-production/rows.json — one row per family: itemId, status, the nine counters, and the artifacts produced
- data/rcap-grade-a/mass-production/build-05-mass-production/completeness.json — the per-family completeness report, nine counters each
- data/rcap-grade-a/mass-production/build-05-mass-production/blank-dispositions.json — the blank-disposition ledger for every family in this lane
- data/rcap-grade-a/mass-production/build-05-mass-production/visible-writes.json — the visible-write proof for every family in this lane
- data/rcap-grade-a/mass-production/build-05-mass-production/filing-instructions.json — the complete filing instructions for every family in this lane
- data/rcap-all50/overlays/census-v1/mo/mo-610-122-arrest-expungement-set--official-pdf-fill/reports/rendered-artifacts.json — the canonical and boundary artifacts for mo-610-122-arrest-expungement-set, with companion documents
- data/rcap-all50/overlays/census-v1/mo/mo-610-140-conviction-set--official-pdf-fill/reports/rendered-artifacts.json — the canonical and boundary artifacts for mo-610-140-conviction-set, with companion documents
- data/rcap-all50/overlays/census-v1/wi/wi-nc-doj-fingerprint-removal-set--official-pdf-fill/reports/rendered-artifacts.json — the canonical and boundary artifacts for wi_nc_doj_fingerprint_removal-set, with companion documents
- data/rcap-all50/overlays/census-v1/or/or-contempt-setaside-set--official-pdf-fill/reports/rendered-artifacts.json — the canonical and boundary artifacts for or_contempt_setaside-set, with companion documents
- data/rcap-all50/overlays/census-v1/mt/mt-misdemeanor-expungement-set--custom-pleading/reports/rendered-artifacts.json — the canonical and boundary artifacts for mt_misdemeanor_expungement-set, with companion documents
- data/rcap-all50/overlays/census-v1/mt/mt-deferred-dismissal-set--custom-pleading/reports/rendered-artifacts.json — the canonical and boundary artifacts for mt_deferred_dismissal-set, with companion documents
- data/rcap-all50/overlays/census-v1/ks/ks-21-6614-specialty-court-set--custom-pleading/reports/rendered-artifacts.json — the canonical and boundary artifacts for ks-21-6614-specialty-court-set, with companion documents
- data/rcap-all50/overlays/census-v1/ks/ks-22-4908-registration-relief-set--official-pdf-fill/reports/rendered-artifacts.json — the canonical and boundary artifacts for ks-22-4908-registration-relief-set, with companion documents
- data/rcap-all50/overlays/census-v1/or/or-conviction-setaside-set--official-pdf-fill/reports/rendered-artifacts.json — the canonical and boundary artifacts for or_conviction_setaside-set, with companion documents
- data/rcap-all50/overlays/census-v1/ma/ma-expunge-mj-set--official-pdf-fill/reports/rendered-artifacts.json — the canonical and boundary artifacts for ma-expunge-mj-set, with companion documents

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
git checkout -b codex/build-05-mass-production 27386bbf8471344143081de065311d761cfcf118
git show origin/claude/legalease-sprint-captain-utucnw:data/rcap-grade-a/launch-control/MASS_PACKET_PRODUCTION_150.json > /tmp/codex-build-05-mass-production.json
# STOP unless that file's captainBaseSha === 27386bbf8471344143081de065311d761cfcf118
npm ci --cache /tmp/legalease-npm-cache   # requires at least 4096 MiB free
bash scripts/rcap-corpus/bootstrap-private-corpus.sh
source private/source-corpus-environment.txt
export MASTER_LIBRARY_SOURCE_DIR="$RCAP_BUNDLE_EXTRACT"
```

Commit your work and `git push -u origin codex/build-05-mass-production`.
