# R8_COMPLETENESS_REPAIR_PRIORITY_FOUR__CODEX_CLOUD

**Environment:** LegalEase Packet Factory (Codex Cloud)  ·  **Lane:** residual
**Branch:** `work` — Codex Cloud names the branch. Do not rename it, and do not create another.
**Minimum Captain SHA:** `98a7a57e2a354eeb8b33b3873e62f7a9785fedaf`
**Continues:** R8_COMPLETENESS_REPAIR_PRIORITY_FOUR (data/rcap-grade-a/launch-control/WAVE_2_ASSIGNMENTS.json)
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

It must print **`PACKET_BUILD_ENVIRONMENT_READY with every registered applicable check passing`**. with every registered applicable check passing or stop. Three Codespaces checks are replaced by cloud-native ones, not waived, so a any registered applicable check failing in cloud mode is a real failure and not the shallow checkout being tolerated.

## Never run these

- `git fetch`
- `git pull`
- `git push`
- `git remote add`
- `git clone`
- `git fetch --unshallow`

> Codex Cloud checks the selected Captain branch out as a local branch named `work`, shallow, and removes origin before the agent starts. Every one of those commands fails on a checkout that is working exactly as designed, and the failure looks like a broken environment rather than a wrong instruction.

## Mission

Repair the four families whose PASS was revoked, in priority order A to D, AFTER S1 has corrected the shared allowlist. Each has a complete per-field ledger in the repair plan: exactly which known facts must be written, which elections the route decides, which blanks need an approved disposition, and which components must render. Re-render each against its pinned source and prove it with the completeness verifier. You own each family's overlay directory and its own build script, so you can write every output this assignment requires.

**The base moved.** Your original assignment named `c8d912d9a1dea54043f6dbc2cda464d00946c74c`. The original base predates S1, S2 and the corrected completeness contract. A repair rendered against it would be measured by a contract that has since changed, and would fail the audit for a reason that is not the packet's.

## The 0 families



_Unchanged from the original dispatch. This continuation moves the environment, not the scope._

## Owned paths — write only here



## Never write here

- `data/rcap-grade-a/launch-control/**`
- `docs/rcap/grade-a/launch-control/**`
- `data/record-clearing/legal-decisions/**`
- `data/rcap-grade-a/route-obligation-census-v1/FREEZE.json`
- `data/rcap-grade-a/route-obligation-census-candidate/**`
- `data/rcap-ledger/**`
- `supabase/migrations/**`
- `package.json`
- `package-lock.json`
- `.github/workflows/**`
- `private/**`
- `data/rcap-grade-a/launch-control/**`

## Required outputs

- data/rcap-grade-a/wave-2/r8-completeness-repair-priority-four/rows.json — one row per family: itemId, status, counters before and after, and every field newly written or newly classified
- data/rcap-all50/overlays/census-v1/nj/nj-disorderly-persons-set--official-pdf-fill/production-field-map.json, source-receipt.json, fixtures/ and raster/ — the corrected field map, the updated receipt, and the re-rendered canonical and boundary artifacts
- data/rcap-all50/overlays/census-v1/ca/ca-17b-reduction-set--official-pdf-fill/production-field-map.json, source-receipt.json, fixtures/ and raster/ — the corrected field map, the updated receipt, and the re-rendered canonical and boundary artifacts
- data/rcap-all50/overlays/census-v1/ca/ca-1203-43-set--official-pdf-fill/production-field-map.json, source-receipt.json, fixtures/ and raster/ — the corrected field map, the updated receipt, and the re-rendered canonical and boundary artifacts
- data/rcap-all50/overlays/census-v1/az/az-marijuana-expungement-superior-court-set--official-pdf-fill/production-field-map.json, source-receipt.json, fixtures/ and raster/ — the corrected field map, the updated receipt, and the re-rendered canonical and boundary artifacts
- data/rcap-grade-a/codex-cloud/r8-completeness-repair-priority-four/rows.json — one row per family: itemId, status, the nine counters after your change

## Stop conditions

- WEC-6: every stop condition below states its scope. A ROW stop records that row and continues to the next; a LANE stop is named as such and says why the remaining rows are unsafe or meaningless without it.
- ACCEPTANCE — a family is repaired only when the completeness verifier returns PASS_COMPLETE with all nine counters at zero. There is no partial credit: a filing with a blank offence code is not 97 percent filable.
- ROW STOP — a required fact the platform genuinely does not hold is classified REQUIRED_BEFORE_FILING and surfaced to the participant in the packet's own instructions. A disposition without that surfacing is not an approved blank.
- NEVER invent a fact to fill a field. A guessed arresting agency is worse than a blank one, because the blank is visible and the guess is not.
- NEVER write a protected field: participant signature, signature date, certificate of mailing before mailing, or any court-only or prosecutor-only field.
- NEVER re-commit a private-corpus binary. Bind sources from MASTER_LIBRARY_SOURCE_DIR and record the SHA-256.
- LANE STOP — do not start until S1 has landed. The two shared runners are S1's, not yours: runWestFamilyCli serves nine families and runEastFamily fifteen, and changing either from here would alter twenty families you were not asked to touch.
- ROW STOP — a repair that cannot be completed without changing a shared runner stops and is reported to S1 rather than forking the runner.

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

Completing this assignment opens no commercial route, proves no packet and approves no output.
