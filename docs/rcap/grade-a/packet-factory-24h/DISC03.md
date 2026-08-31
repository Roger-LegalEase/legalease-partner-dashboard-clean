# DISC03

**Environment:** LegalEase Packet Factory (Codex Cloud)  ·  **Lane:** source-swarm
**Repository branch to select:** `claude/legalease-sprint-captain-utucnw`
**Branch in the container:** `work` — Codex Cloud names it. Do not rename it and do not create another.
**Minimum required ancestor:** `7476708c6236b7b2ce1b1112dbeef434d3957c59` (or the newer dispatch base)
**Execution contract:** `docs/rcap/grade-a/launch-control/CODEX_CLOUD_PACKET_EXECUTION.md` — read it before you start.
**Repository:** Roger-LegalEase/legalease-partner-dashboard-clean

> There is no origin, the checkout is shallow, and your finished diff returns through the Codex Cloud interface. That is the design.

## Before anything else

```sh
source $HOME/.legalease-corpus-env
node scripts/verify-packet-build-environment.mjs \
  --assignment-id DISC03 \
  --source-obligation 'agency-application-treatment:obligation:research-decision-route:CO:co_mistaken_identity_expungement:participant_investigation_and_finding_request::NO_DOCUMENT_SOURCE_NAMED' \
  --codex-cloud \
  --minimum-captain-sha 7476708c6236b7b2ce1b1112dbeef434d3957c59
```

It must print **`SOURCE_CONVEYOR_PREFLIGHT_READY`**. The lane gate and each owned row gate must both pass.

## Never run these

- `git fetch`
- `git pull`
- `git push`
- `gh `
- `git worktree`
- `git remote add`
- `git clone`

## Mission

Turn a descriptive label into a document identity: exact form number, official publisher, revision and the official URL it is published at. Resolve against committed inventories; never guess a form number.

## What bounds this lane

the issuing court or agency that publishes the document

**43 obligations · 28 families this lane WOULD release if every one of them resolves · hosts: AK, CO, IL, ND, RI, UT, VT**

> Prospective. Nothing below is promoted custody yet, and this number is not a count of families you can build today.

> This environment refuses outbound egress to court and agency hosts. Identity and inventory work runs here; anything needing a fetch is dispatched through the acquisition workflow, never attempted locally and never faked.

### Required operation record schema

- itemId
- sourceId
- jurisdiction
- issuingAuthority
- officialTitle
- formNumber
- revision
- officialUrl
- urlKind
- intendedPacketRole
- statewideOrLocal
- familyIds
- evidencePaths
- handoffOperation

### Exact obligation rows

| Item id | Source id | Jurisdiction | Current operation | Family ownership | Required input | Handoff |
| --- | --- | --- | --- | --- | --- | --- |
| `agency-application-treatment:obligation:research-decision-route:CO:co_mistaken_identity_expungement:participant_investigation_and_finding_request::NO_DOCUMENT_SOURCE_NAMED` | `NO_DOCUMENT_SOURCE_NAMED` | CO | `exact-source-identity` | `agency-application-treatment:obligation:research-decision-route:CO:co_mistaken_identity_expungement:participant_investigation_and_finding_request` | unresolved exact identity or URL | `ACQ` |
| `agency-application-treatment:obligation:unattached-decision-route:AK:ak-correct-record::official-form:Request to Correct Criminal Justice Information` | `official-form:Request to Correct Criminal Justice Information` | AK | `exact-source-identity` | `agency-application-treatment:obligation:unattached-decision-route:AK:ak-correct-record` | unresolved exact identity or URL | `ACQ` |
| `ak-mistaken-identity-set::official-form:DPS-REQUEST-TO-SEAL-CRIM-INFO` | `official-form:DPS-REQUEST-TO-SEAL-CRIM-INFO` | AK | `exact-source-identity` | `ak-mistaken-identity-set` | unresolved exact identity or URL | `ACQ` |
| `census-pending-family:UT:path-l-vacatur-human-trafficking-related-expungement::NO_DOCUMENT_SOURCE_NAMED` | `NO_DOCUMENT_SOURCE_NAMED` | UT | `exact-source-identity` | `census-pending-family:UT:path-l-vacatur-human-trafficking-related-expungement` | unresolved exact identity or URL | `ACQ` |
| `census-pending-family:UT:path-m-juvenile-expungement::NO_DOCUMENT_SOURCE_NAMED` | `NO_DOCUMENT_SOURCE_NAMED` | UT | `exact-source-identity` | `census-pending-family:UT:path-m-juvenile-expungement` | unresolved exact identity or URL | `ACQ` |
| `composed-treatment:nd-nonconviction-auto-close-verify::NO_DOCUMENT_SOURCE_NAMED` | `NO_DOCUMENT_SOURCE_NAMED` | ND | `exact-source-identity` | `composed-treatment:nd-nonconviction-auto-close-verify` | unresolved exact identity or URL | `ACQ` |
| `composed-treatment:obligation:research-decision-route:CO:co_mistaken_identity_expungement:participant_court_petition_after_90_days::NO_DOCUMENT_SOURCE_NAMED` | `NO_DOCUMENT_SOURCE_NAMED` | CO | `exact-source-identity` | `composed-treatment:obligation:research-decision-route:CO:co_mistaken_identity_expungement:participant_court_petition_after_90_days` | unresolved exact identity or URL | `ACQ` |
| `composed-treatment:obligation:runtime-only:AK:set-aside-after-a-suspended-imposition-of-sentence-as-12-55-085::NO_DOCUMENT_SOURCE_NAMED` | `NO_DOCUMENT_SOURCE_NAMED` | AK | `exact-source-identity` | `composed-treatment:obligation:runtime-only:AK:set-aside-after-a-suspended-imposition-of-sentence-as-12-55-085` | unresolved exact identity or URL | `ACQ` |
| `composed-treatment:obligation:runtime-only:IL:criminal-identity-theft-mistaken-identity-relief::NO_DOCUMENT_SOURCE_NAMED` | `NO_DOCUMENT_SOURCE_NAMED` | IL | `exact-source-identity` | `composed-treatment:obligation:runtime-only:IL:criminal-identity-theft-mistaken-identity-relief` | unresolved exact identity or URL | `ACQ` |
| `il-cannabis-vacate-set::official-form:CXP Additional Cannabis Convictions` | `official-form:CXP Additional Cannabis Convictions` | IL | `exact-source-identity` | `il-cannabis-vacate-set` | unresolved exact identity or URL | `ACQ` |
| `il-cannabis-vacate-set::official-form:CXP Additional Notice of Court Date` | `official-form:CXP Additional Notice of Court Date` | IL | `exact-source-identity` | `il-cannabis-vacate-set` | unresolved exact identity or URL | `ACQ` |
| `il-cannabis-vacate-set::official-form:CXP Getting Started Motion to Vacate and Expunge` | `official-form:CXP Getting Started Motion to Vacate and Expunge` | IL | `exact-source-identity` | `il-cannabis-vacate-set` | unresolved exact identity or URL | `ACQ` |
| `il-cannabis-vacate-set::official-form:CXP Motion to Vacate and Expunge` | `official-form:CXP Motion to Vacate and Expunge` | IL | `exact-source-identity` | `il-cannabis-vacate-set` | unresolved exact identity or URL | `ACQ` |
| `il-cannabis-vacate-set::official-form:CXP Notice of Court Date for Motion` | `official-form:CXP Notice of Court Date for Motion` | IL | `exact-source-identity` | `il-cannabis-vacate-set` | unresolved exact identity or URL | `ACQ` |
| `il-cannabis-vacate-set::official-form:CXP Order Granting or Denying Motion` | `official-form:CXP Order Granting or Denying Motion` | IL | `exact-source-identity` | `il-cannabis-vacate-set` | unresolved exact identity or URL | `ACQ` |
| `il-exp-nonconv-set::official-form:EXP-AD Additional Cases Expungement` | `official-form:EXP-AD Additional Cases Expungement` | IL | `exact-source-identity` | `il-exp-nonconv-set` | unresolved exact identity or URL | `ACQ` |
| `il-exp-nonconv-set::official-form:EXP-AD Case List` | `official-form:EXP-AD Case List` | IL | `exact-source-identity` | `il-exp-nonconv-set` | unresolved exact identity or URL | `ACQ` |
| `il-exp-pardon-set::official-form:EXP-AD Case List` | `official-form:EXP-AD Case List` | IL | `exact-source-identity` | `il-exp-pardon-set` | unresolved exact identity or URL | `ACQ` |
| `il-exp-precompletion-set::official-form:EXP-AD Case List` | `official-form:EXP-AD Case List` | IL | `exact-source-identity` | `il-exp-precompletion-set` | unresolved exact identity or URL | `ACQ` |
| `il-exp-qualprob-set::official-form:EXP-AD Case List` | `official-form:EXP-AD Case List` | IL | `exact-source-identity` | `il-exp-qualprob-set` | unresolved exact identity or URL | `ACQ` |
| `il-exp-supervision-set::official-form:EXP-AD Case List` | `official-form:EXP-AD Case List` | IL | `exact-source-identity` | `il-exp-supervision-set` | unresolved exact identity or URL | `ACQ` |
| `il-prb-cert-set::official-form:PRB Certificate of Expungement for Military Application` | `official-form:PRB Certificate of Expungement for Military Application` | IL | `exact-source-identity` | `il-prb-cert-set` | unresolved exact identity or URL | `ACQ` |
| `il-prb-cert-set::official-form:PRB Certificate of Expungement for Military Eligibility Acknowledgement` | `official-form:PRB Certificate of Expungement for Military Eligibility Acknowledgement` | IL | `exact-source-identity` | `il-prb-cert-set` | unresolved exact identity or URL | `ACQ` |
| `il-prb-cert-set::official-form:PRB Certificate of Sealing Application` | `official-form:PRB Certificate of Sealing Application` | IL | `exact-source-identity` | `il-prb-cert-set` | unresolved exact identity or URL | `ACQ` |
| `il-prb-cert-set::official-form:PRB Certificate of Sealing Eligibility Acknowledgement` | `official-form:PRB Certificate of Sealing Eligibility Acknowledgement` | IL | `exact-source-identity` | `il-prb-cert-set` | unresolved exact identity or URL | `ACQ` |
| `il-prostitution-j-vacate-set::NO_DOCUMENT_SOURCE_NAMED` | `NO_DOCUMENT_SOURCE_NAMED` | IL | `exact-source-identity` | `il-prostitution-j-vacate-set` | unresolved exact identity or URL | `ACQ` |
| `il-seal-2yr-set::official-form:EXP-AD Case List` | `official-form:EXP-AD Case List` | IL | `exact-source-identity` | `il-seal-2yr-set` | unresolved exact identity or URL | `ACQ` |
| `il-seal-3yr-set::official-form:EXP-AD Case List` | `official-form:EXP-AD Case List` | IL | `exact-source-identity` | `il-seal-3yr-set` | unresolved exact identity or URL | `ACQ` |
| `il-seal-edu-set::official-form:EXP-AD Case List` | `official-form:EXP-AD Case List` | IL | `exact-source-identity` | `il-seal-edu-set` | unresolved exact identity or URL | `ACQ` |
| `il-seal-nonconv-set::official-form:EXP-AD Case List` | `official-form:EXP-AD Case List` | IL | `exact-source-identity` | `il-seal-nonconv-set` | unresolved exact identity or URL | `ACQ` |
| `nd-deferred-imposition-records-set::NO_DOCUMENT_SOURCE_NAMED` | `NO_DOCUMENT_SOURCE_NAMED` | ND | `exact-source-identity` | `nd-deferred-imposition-records-set` | unresolved exact identity or URL | `ACQ` |
| `nd-nonconviction-close-petition-set::official-form:ND-INSTRUCTIONS-CLOSE-NONCONVICTION` | `official-form:ND-INSTRUCTIONS-CLOSE-NONCONVICTION` | ND | `exact-source-identity` | `nd-nonconviction-close-petition-set` | unresolved exact identity or URL | `ACQ` |
| `nd-nonconviction-close-petition-set::official-form:ND-ORDER-CLOSE-NONCONVICTION` | `official-form:ND-ORDER-CLOSE-NONCONVICTION` | ND | `exact-source-identity` | `nd-nonconviction-close-petition-set` | unresolved exact identity or URL | `ACQ` |
| `nd-nonconviction-close-petition-set::official-form:ND-PETITION-CLOSE-NONCONVICTION` | `official-form:ND-PETITION-CLOSE-NONCONVICTION` | ND | `exact-source-identity` | `nd-nonconviction-close-petition-set` | unresolved exact identity or URL | `ACQ` |
| `nd-prohibit-remote-public-access-set::official-form:ND-BRIEF-PROHIBIT-PUBLIC-ACCESS` | `official-form:ND-BRIEF-PROHIBIT-PUBLIC-ACCESS` | ND | `exact-source-identity` | `nd-prohibit-remote-public-access-set` | unresolved exact identity or URL | `ACQ` |
| `nd-prohibit-remote-public-access-set::official-form:ND-DECLARATION-OF-SERVICE` | `official-form:ND-DECLARATION-OF-SERVICE` | ND | `exact-source-identity` | `nd-prohibit-remote-public-access-set` | unresolved exact identity or URL | `ACQ` |
| `nd-prohibit-remote-public-access-set::official-form:ND-MOTION-PROHIBIT-PUBLIC-ACCESS` | `official-form:ND-MOTION-PROHIBIT-PUBLIC-ACCESS` | ND | `exact-source-identity` | `nd-prohibit-remote-public-access-set` | unresolved exact identity or URL | `ACQ` |
| `nd-prohibit-remote-public-access-set::official-form:ND-PROPOSED-FINDINGS-PROHIBIT-PUBLIC-ACCESS` | `official-form:ND-PROPOSED-FINDINGS-PROHIBIT-PUBLIC-ACCESS` | ND | `exact-source-identity` | `nd-prohibit-remote-public-access-set` | unresolved exact identity or URL | `ACQ` |
| `rcap-nd-custom-pleading::NO_DOCUMENT_SOURCE_NAMED` | `NO_DOCUMENT_SOURCE_NAMED` | ND | `exact-source-identity` | `rcap-nd-custom-pleading` | unresolved exact identity or URL | `ACQ` |
| `ri_marijuana-set::NO_DOCUMENT_SOURCE_NAMED` | `NO_DOCUMENT_SOURCE_NAMED` | RI | `exact-source-identity` | `ri_marijuana-set` | unresolved exact identity or URL | `ACQ` |
| `ut_pet_remove_link-set::official-form:1110GE or 1111GE` | `official-form:1110GE or 1111GE` | UT | `exact-source-identity` | `ut_pet_remove_link-set` | unresolved exact identity or URL | `ACQ` |
| `vt_exp_deferred_sentence-set::NO_DOCUMENT_SOURCE_NAMED` | `NO_DOCUMENT_SOURCE_NAMED` | VT | `exact-source-identity` | `vt_exp_deferred_sentence-set` | unresolved exact identity or URL | `ACQ` |
| `vt_seal_under_25-set::NO_DOCUMENT_SOURCE_NAMED` | `NO_DOCUMENT_SOURCE_NAMED` | VT | `exact-source-identity` | `vt_seal_under_25-set` | unresolved exact identity or URL | `ACQ` |

Run the row gate once per listed item, after the lane gate. This exact first command demonstrates the interface; substitute each other exact item id from the table without changing the lane:

```sh
node scripts/verify-packet-build-environment.mjs --assignment-id DISC03 --source-obligation 'agency-application-treatment:obligation:research-decision-route:CO:co_mistaken_identity_expungement:participant_investigation_and_finding_request::NO_DOCUMENT_SOURCE_NAMED' --codex-cloud --minimum-captain-sha 7476708c6236b7b2ce1b1112dbeef434d3957c59

# A failed row is recorded STOPPED; continue with unrelated rows.
```

**Prospective release is never actual release. Record familiesActuallyReleasedNow only after every remaining source binds; otherwise it is an empty array.**

### Families this lane would release

`agency-application-treatment:obligation:research-decision-route:CO:co_mistaken_identity_expungement:participant_investigation_and_finding_request`, `agency-application-treatment:obligation:unattached-decision-route:AK:ak-correct-record`, `ak-mistaken-identity-set`, `census-pending-family:UT:path-l-vacatur-human-trafficking-related-expungement`, `census-pending-family:UT:path-m-juvenile-expungement`, `composed-treatment:nd-nonconviction-auto-close-verify`, `composed-treatment:obligation:research-decision-route:CO:co_mistaken_identity_expungement:participant_court_petition_after_90_days`, `composed-treatment:obligation:runtime-only:AK:set-aside-after-a-suspended-imposition-of-sentence-as-12-55-085`, `composed-treatment:obligation:runtime-only:IL:criminal-identity-theft-mistaken-identity-relief`, `il-cannabis-vacate-set`, `il-exp-nonconv-set`, `il-exp-pardon-set`, `il-exp-precompletion-set`, `il-exp-qualprob-set`, `il-exp-supervision-set`, `il-prb-cert-set`, `il-prostitution-j-vacate-set`, `il-seal-2yr-set`, `il-seal-3yr-set`, `il-seal-edu-set`, `il-seal-nonconv-set`, `nd-deferred-imposition-records-set`, `nd-nonconviction-close-petition-set`, `nd-prohibit-remote-public-access-set`, `rcap-nd-custom-pleading`, `ri_marijuana-set`, `vt_exp_deferred_sentence-set`, `vt_seal_under_25-set`

## Owned paths — write only here

- `data/rcap-grade-a/packet-factory-24h/disc03/**`
- `data/rcap-grade-a/source-acquisition/packet-factory-24h/disc03/**`

## Never write here

- `data/rcap-all50/overlays/census-v1/**`
- `scripts/build-census-v1-*.mjs`
- `data/rcap-grade-a/launch-control/**`
- `private/**`
- `data/rcap-grade-a/codex-cloud/p2v01-washington-independent-verification/**`
- `data/rcap-grade-a/codex-cloud/p2v02-washington-independent-verification/**`
- `data/rcap-grade-a/codex-cloud/p2v03-washington-independent-verification/**`
- `data/rcap-all50/overlays/census-v1/nj/nj-disorderly-persons-set--official-pdf-fill/**`
- `scripts/build-census-v1-nj_disorderly_persons-set.mjs`
- `data/rcap-grade-a/codex-cloud/r8a-nj-disorderly-persons/**`
- `data/rcap-all50/overlays/census-v1/ca/ca-17b-reduction-set--official-pdf-fill/**`
- `scripts/build-census-v1-ca-17b-reduction-set.mjs`
- `data/rcap-grade-a/codex-cloud/r8b-ca-17b-reduction/**`
- `data/rcap-all50/overlays/census-v1/ca/ca-1203-43-set--official-pdf-fill/**`
- `scripts/build-census-v1-ca-1203-43-set.mjs`
- `data/rcap-grade-a/codex-cloud/r8c-ca-1203-43/**`
- `data/rcap-all50/overlays/census-v1/az/az-marijuana-expungement-superior-court-set--official-pdf-fill/**`
- `scripts/build-census-v1-az_marijuana_expungement_superior_court-set.mjs`
- `data/rcap-grade-a/codex-cloud/r8d-az-marijuana-superior-court/**`
- `data/rcap-grade-a/codex-cloud/sdv01-south-dakota-independent-verification/**`
- `data/rcap-all50/overlays/census-v1/**/nj-ordinance-set*`
- `data/rcap-all50/overlays/census-v1/**/pa-summary-conviction-set*`
- `data/rcap-all50/overlays/census-v1/**/ut-pet-dismissed-without-prejudice-set*`
- `data/rcap-all50/overlays/census-v1/**/wa-vac-homicide-victim-prostitution-set*`

## Required outputs

- data/rcap-grade-a/packet-factory-24h/disc03/rows.json — one row per obligation: itemId, status, the identity or receipt, and the families it releases
- data/rcap-grade-a/source-acquisition/packet-factory-24h/disc03/receipts.json — the eleven recorded fields per resolved source; no body is committed

### Output schema

Array key `rows`, item key `itemId`, status words: `COMPLETED`, `STOPPED`.

An unrecognised status is refused at integration rather than translated.

## Focused tests

- `node scripts/grade-a-packet-factory-24h/verify.mjs`

> Focused checks only. The full national repository chain runs at Captain checkpoints, never inside a worker.

## Stop conditions

- NEVER guess a form number and never accept an unofficial mirror. A secondary copy does not override an available official original.
- NEVER commit a source body, an extracted archive or anything under private/. A receipt carrying an exact hash is the deliverable.
- NEVER promote a source without exact bytes. A promotion is a release, and a released family goes to a builder that will try to open the file.
- LANE STOP — you build no packet and you touch no overlay directory.
- ROW STOP — an obligation that cannot be settled here is STOPPED naming the exact host and the next operation that owns it.

Stopping with an honest account of what is missing is a complete return. One blocked family never stops the lane.

## How you return

Commit locally. Leave the final diff for the Codex Cloud interface. There is no PUSHED line in a cloud return.

```text
ASSIGNMENT:
OPERATION:
BASE SHA:
COMMIT:
OBLIGATIONS RESOLVED:
OBLIGATIONS STOPPED:
HANDED OFF:
FAMILIES RELEASED:
IDENTITIES GUESSED: 0
SOURCE BODIES COMMITTED: 0
PROMOTIONS WITHOUT EXACT BYTES: 0
COMMERCIAL ROUTES OPENED: 0
PRODUCTION TOUCHED: NO
PREFLIGHT: PACKET_BUILD_ENVIRONMENT_READY 14/14
DIFF LEFT FOR THE CODEX UI: YES
```

## What finishing does not do

A bound source is a bound source. It builds nothing, proves nothing and approves nothing.
