# P2_WA_VACATUR_COMPLETENESS__CODEX_CLOUD

**Environment:** LegalEase Packet Factory (Codex Cloud)  ·  **Lane:** completeness-repair
**Branch:** `work` — Codex Cloud names the branch. Do not rename it, and do not create another.
**Minimum Captain SHA:** `98a7a57e2a354eeb8b33b3873e62f7a9785fedaf`
**Continues:** P2_WA_VACATUR_COMPLETENESS (data/rcap-grade-a/launch-control/COMPLETENESS_REPAIR_WAVE.json)
**Repository:** Roger-LegalEase/legalease-partner-dashboard-clean

> This task runs in Codex Cloud. There is no origin, the checkout is shallow, and your finished diff returns through the Codex UI. That is the design, not a broken environment.

## Before anything else

```sh
# The setup phase already ran scripts/codex-cloud/setup-packet-factory.sh and printed
# LEGALEASE_CODEX_CLOUD_READY. Your job is to load what it left and prove the gate.
source $HOME/.legalease-corpus-env
node scripts/verify-packet-build-environment.mjs \
  --family <FAMILY_ID> \
  --codex-cloud \
  --minimum-captain-sha 98a7a57e2a354eeb8b33b3873e62f7a9785fedaf
```

It must print **`PACKET_BUILD_ENVIRONMENT_READY with every registered applicable check passing`**. 14/14 or stop. Three Codespaces checks are replaced by cloud-native ones, not waived, so a 13/14 in cloud mode is a real failure and not the shallow checkout being tolerated.

## Never run these

- `git fetch`
- `git pull`
- `git push`
- `git remote add`
- `git clone`
- `git fetch --unshallow`

> Codex Cloud checks the selected Captain branch out as a local branch named `work`, shallow, and removes origin before the agent starts. Every one of those commands fails on a checkout that is working exactly as designed, and the failure looks like a broken environment rather than a wrong instruction.

## Mission

Repair 9 packet families that import neither S1 runner, so none of them waits for the post-S1 audit. They share one form family and one root cause; repair them together and re-render each against its pinned source.

**The base moved.** Your original assignment named `33dfea59fe85b9dc86469d12e04fd65c51b480fa`. The original base predates S1, S2 and the corrected completeness contract. A repair rendered against it would be measured by a contract that has since changed, and would fail the audit for a reason that is not the packet's.

## The 0 families



_Unchanged from the original dispatch. This continuation moves the environment, not the scope._

## Owned paths — write only here



## Never write here

- `scripts/build-census-v1-az_marijuana_expungement_arrest_no_charges-set.mjs`
- `scripts/build-census-v1-nj_arrest_no_conviction-set.mjs`
- `data/rcap-grade-a/launch-control/**`
- `docs/rcap/grade-a/launch-control/**`
- `data/rcap-grade-a/route-obligation-census-candidate/**`
- `data/record-clearing/legal-decisions/**`
- `supabase/migrations/**`
- `package.json`
- `package-lock.json`
- `.github/workflows/**`
- `private/**`
- `data/rcap-grade-a/launch-control/**`

## Required outputs

- data/rcap-grade-a/wave-2/p2-wa-vacatur-completeness/rows.json — one row per family: itemId, status, counters before and after, every field newly written, and every blank newly given an approved disposition
- data/rcap-all50/overlays/census-v1/wa/wa-vac-cannabis-set--official-pdf-fill/ — the corrected production-field-map.json, the updated source-receipt.json, and re-rendered canonical and boundary fixtures with their page rasters
- data/rcap-all50/overlays/census-v1/wa/wa-vac-domestic-violence-set--official-pdf-fill/ — the corrected production-field-map.json, the updated source-receipt.json, and re-rendered canonical and boundary fixtures with their page rasters
- data/rcap-all50/overlays/census-v1/wa/wa-vac-felony-set--official-pdf-fill/ — the corrected production-field-map.json, the updated source-receipt.json, and re-rendered canonical and boundary fixtures with their page rasters
- data/rcap-all50/overlays/census-v1/wa/wa-vac-homicide-victim-prostitution-set--official-pdf-fill/ — the corrected production-field-map.json, the updated source-receipt.json, and re-rendered canonical and boundary fixtures with their page rasters
- data/rcap-all50/overlays/census-v1/wa/wa-vac-misdemeanor-ordinary-set--official-pdf-fill/ — the corrected production-field-map.json, the updated source-receipt.json, and re-rendered canonical and boundary fixtures with their page rasters
- data/rcap-all50/overlays/census-v1/wa/wa-vac-substance-use-disorder-set--official-pdf-fill/ — the corrected production-field-map.json, the updated source-receipt.json, and re-rendered canonical and boundary fixtures with their page rasters
- data/rcap-all50/overlays/census-v1/wa/wa-vac-survivor-felony-set--official-pdf-fill/ — the corrected production-field-map.json, the updated source-receipt.json, and re-rendered canonical and boundary fixtures with their page rasters
- data/rcap-all50/overlays/census-v1/wa/wa-vac-survivor-misdemeanor-set--official-pdf-fill/ — the corrected production-field-map.json, the updated source-receipt.json, and re-rendered canonical and boundary fixtures with their page rasters
- data/rcap-all50/overlays/census-v1/wa/wa-vac-treaty-fishing-set--official-pdf-fill/ — the corrected production-field-map.json, the updated source-receipt.json, and re-rendered canonical and boundary fixtures with their page rasters
- data/rcap-grade-a/codex-cloud/p2-wa-vacatur-completeness/rows.json — one row per family: itemId, status, the nine counters after your change

## Stop conditions

- WEC-6: every stop below states its scope. A ROW stop records that family and continues; a LANE stop says why the rest are unsafe without it.
- ACCEPTANCE — a family is repaired only when the completeness verifier returns PASS_COMPLETE with all nine counters at zero. A filing with a blank offence code is not 97 percent filable.
- You own scripts/build-census-v1-wa_blake_vacatur_and_lfo_refund-set.mjs because every script that imports it is one of your families. Changing it changes all of them, which is the point; measure every one of your families before and after.
- ROW STOP — a required fact the platform genuinely does not hold is classified required_before_filing and surfaced in the packet's own participant instructions. A disposition without that surfacing is not an approved blank.
- NEVER invent a fact to fill a field. A guessed arresting agency is worse than a blank one: the blank is visible and the guess is not.
- NEVER write a protected field — participant signature, signature date, certificate of mailing before mailing, or any court-only or prosecutor-only field.
- NEVER touch an S1 runner, an R8 family, or another lane's overlay directory.
- NEVER re-commit a private-corpus binary. Bind from MASTER_LIBRARY_SOURCE_DIR and record the SHA-256.

Stopping with an honest account of what is missing is a complete return.

## How you return

Commit your work locally. Leave the final diff for the Codex UI. **PUSHED: YES is not part of a cloud return. There is nothing to push to and asking for it turns a complete task into a failed one.**

```text
ASSIGNMENT:
BASE SHA:
COMMIT:
FAMILIES COMPLETED:
FAMILIES STOPPED:
NINE COUNTERS ZERO ON:
COMMERCIAL ROUTES OPENED: 0
PRODUCTION TOUCHED: NO
PREFLIGHT: PACKET_BUILD_ENVIRONMENT_READY with every registered applicable check passing
DIFF LEFT FOR THE CODEX UI: YES
```

## What finishing does not do

A repaired packet is a complete packet. It is not independently verified, not visually reviewed, not legally approved, and not COMPLETE_PACKET_PROVEN.
