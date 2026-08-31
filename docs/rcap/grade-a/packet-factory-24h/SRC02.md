# SRC02

**Environment:** LegalEase Packet Factory (Codex Cloud)  ·  **Lane:** source-identity-acquisition-promotion
**Repository branch to select:** `claude/legalease-sprint-captain-utucnw`
**Branch in the container:** `work` — Codex Cloud names it. Do not rename it and do not create another.
**Minimum required ancestor:** `40ccc028a2af8eac94743cdb32237e3af56a6642` (or the newer dispatch base)
**Execution contract:** `docs/rcap/grade-a/launch-control/CODEX_CLOUD_PACKET_EXECUTION.md` — read it before you start.
**Repository:** Roger-LegalEase/legalease-partner-dashboard-clean

> There is no origin, the checkout is shallow, and your finished diff returns through the Codex Cloud interface. That is the design.

## Before anything else

```sh
source $HOME/.legalease-corpus-env
node scripts/verify-packet-build-environment.mjs \
  --family agency-application-treatment:obligation:unattached-decision-route:AK:ak-correct-record::official-form:Request to Correct Criminal Justice Information \
  --codex-cloud \
  --minimum-captain-sha 40ccc028a2af8eac94743cdb32237e3af56a6642
```

It must print **`PACKET_BUILD_ENVIRONMENT_READY: 14/14`**. A 13/14 in cloud mode is a real failure, not the shallow checkout being tolerated.

## Never run these

- `git fetch`
- `git pull`
- `git push`
- `gh `
- `git worktree`
- `git remote add`
- `git clone`

## Mission

Turn a descriptive label into a document identity: an exact form number or an exact content hash, resolved against committed inventories.

## What bounds this lane

the committed Nationwide inventory and the state packs, read only

**152 obligations · 72 families released if all clear · hosts: AK, AL, AR, DE, FL, IA, ID, IL, IN, LA, MA, MI, MT, ND, TX, UT**

> This environment refuses outbound egress to court and agency hosts. Resolution against committed inventories runs here; anything needing a fetch is recorded as an exact acquisition instruction naming its host, not attempted and not faked.

### Every acquired or promoted source records

- official publisher
- exact title
- form number
- revision
- official URL
- MIME type
- page count
- technology (acroform, xfa, flat)
- SHA-256
- byte size
- custody path

**As soon as a family becomes source-ready, report it in the checkpoint. Captain assigns it to the next available PF lane without waiting for this lane to finish.**

### Families this lane releases

`agency-application-treatment:obligation:unattached-decision-route:AK:ak-correct-record`, `ak-mistaken-identity-set`, `ar-act346-set`, `ar-cs-possession-seal-set`, `ar-drug-court-set`, `ar-felony-seal-set`, `ar-misdemeanor-seal-set`, `ar-nonconviction-seal-set`, `ar-veterans-court-set`, `de_mandatory_expungement-set`, `fl-10yr-bridge-set`, `fl-administrative-set`, `fl-early-juvenile-set`, `fl-expunction-set`, `fl-juvenile-diversion-set`, `fl-sealing-set`, `fl-self-defense-set`, `ia-12346-set`, `ia-12347-set`, `ia-7251-set`, `ia-901c2-set`, `ia-901c3-set`, `ia-dci77-set`, `id_isp_expungement-set`, `il-cannabis-vacate-set`, `il-exp-nonconv-set`, `il-exp-pardon-set`, `il-exp-precompletion-set`, `il-exp-qualprob-set`, `il-exp-supervision-set`, `il-prb-cert-set`, `il-seal-2yr-set`, `il-seal-3yr-set`, `il-seal-edu-set`, `il-seal-nonconv-set`, `in_arrest_no_charges-set`, `in_conviction_d6-set`, `in_conviction_felony-set`, `in_conviction_misd-set`, `in_section1_petition-set`, `la-976-arrest-no-conviction-set`, `la-977-misdemeanor-conviction-set`, `la-977d-marijuana-first-offense-set`, `la-978-felony-conviction-set`, `la-985-1-interim-expungement-set`, `la-985-expungement-by-redaction-set`, `la-987-set-aside-and-dismiss-set`, `ma-expunge-k-set`, `ma-expunge-time-set`, `ma-seal-admin-set`, `ma-seal-decrim-set`, `mi_setaside_application-set`, `mi_setaside_first_owi-set`, `mi_setaside_trafficking-set`, `mt_mmrta_completed-set`, `mt_mmrta_serving-set`, `nd-nonconviction-close-petition-set`, `nd-prohibit-remote-public-access-set`, `official-form-treatment:obligation:research-decision-route:AL:al-olr`, `rcap-in-custom-pleading`, `rcap-tx-custom-pleading`, `tx_exp_acquittal-set`, `tx_nd_automatic_misdemeanor_deferred-set`, `tx_nd_conviction_no_supervision-set`, `tx_nd_deferred_other-set`, `tx_nd_dwi_conviction-set`, `tx_nd_dwi_deferred-set`, `tx_nd_dwi_probation-set`, `tx_nd_probation_misdemeanor-set`, `tx_nd_veterans_court-set`, `tx_nd_veterans_reemployment-set`, `ut_pet_remove_link-set`

## Owned paths — write only here

- `data/rcap-grade-a/packet-factory-24h/src02/**`
- `data/rcap-grade-a/source-acquisition/packet-factory-24h/src02/**`

## Never write here

- `data/rcap-all50/overlays/census-v1/**`
- `scripts/build-census-v1-*.mjs`
- `data/rcap-grade-a/launch-control/**`
- `private/**`
- `data/rcap-grade-a/wave-2/p2-wa-vacatur-completeness/**`
- `data/rcap-all50/overlays/census-v1/wa/wa-vac-cannabis-set--official-pdf-fill/**`
- `data/rcap-all50/overlays/census-v1/wa/wa-vac-domestic-violence-set--official-pdf-fill/**`
- `data/rcap-all50/overlays/census-v1/wa/wa-vac-felony-set--official-pdf-fill/**`
- `data/rcap-all50/overlays/census-v1/wa/wa-vac-homicide-victim-prostitution-set--official-pdf-fill/**`
- `data/rcap-all50/overlays/census-v1/wa/wa-vac-misdemeanor-ordinary-set--official-pdf-fill/**`
- `data/rcap-all50/overlays/census-v1/wa/wa-vac-substance-use-disorder-set--official-pdf-fill/**`
- `data/rcap-all50/overlays/census-v1/wa/wa-vac-survivor-felony-set--official-pdf-fill/**`
- `data/rcap-all50/overlays/census-v1/wa/wa-vac-survivor-misdemeanor-set--official-pdf-fill/**`
- `data/rcap-all50/overlays/census-v1/wa/wa-vac-treaty-fishing-set--official-pdf-fill/**`
- `scripts/build-census-v1-wa_vac_cannabis-set.mjs`
- `scripts/build-census-v1-wa_vac_domestic_violence-set.mjs`
- `scripts/build-census-v1-wa_vac_felony-set.mjs`
- `scripts/build-census-v1-wa_vac_homicide_victim_prostitution-set.mjs`
- `scripts/build-census-v1-wa_vac_misdemeanor_ordinary-set.mjs`
- `scripts/build-census-v1-wa_vac_substance_use_disorder-set.mjs`
- `scripts/build-census-v1-wa_vac_survivor_felony-set.mjs`
- `scripts/build-census-v1-wa_vac_survivor_misdemeanor-set.mjs`
- `scripts/build-census-v1-wa_vac_treaty_fishing-set.mjs`
- `scripts/build-census-v1-wa_blake_vacatur_and_lfo_refund-set.mjs`

## Required outputs

- data/rcap-grade-a/packet-factory-24h/src02/rows.json — one row per obligation: itemId, status, the identity resolved or the exact acquisition instruction, and the families it releases
- data/rcap-grade-a/source-acquisition/packet-factory-24h/src02/receipts.json — the eleven recorded fields per resolved source; no body is committed

### Output schema

Array key `rows`, item key `itemId`, status words: `COMPLETED`, `STOPPED`.

An unrecognised status is refused at integration rather than translated.

## Focused tests

- `node scripts/grade-a-packet-factory-24h/verify.mjs`

> Focused checks only. The full national repository chain runs at Captain checkpoints, never inside a worker.

## Stop conditions

- NEVER guess a form number and never accept an unofficial mirror. A secondary copy does not override an available official original.
- NEVER commit a source body, an extracted archive or anything under private/.
- LANE STOP — you build no packet and you touch no overlay directory.
- ROW STOP — an identity that cannot be settled from committed inventories is a STOPPED row naming the exact host to fetch from.

Stopping with an honest account of what is missing is a complete return. One blocked family never stops the lane.

## How you return

Commit locally. Leave the final diff for the Codex Cloud interface. There is no PUSHED line in a cloud return.

```text
ASSIGNMENT:
BASE SHA:
COMMIT:
OBLIGATIONS RESOLVED:
OBLIGATIONS STOPPED:
FAMILIES RELEASED INTO THE BUILD QUEUE:
IDENTITIES GUESSED: 0
SOURCE BODIES COMMITTED: 0
COMMERCIAL ROUTES OPENED: 0
PRODUCTION TOUCHED: NO
PREFLIGHT: PACKET_BUILD_ENVIRONMENT_READY 14/14
DIFF LEFT FOR THE CODEX UI: YES
```

## What finishing does not do

A bound source is a bound source. It builds nothing, proves nothing and approves nothing.
