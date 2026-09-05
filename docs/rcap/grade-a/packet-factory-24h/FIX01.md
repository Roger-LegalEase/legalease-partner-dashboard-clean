# FIX01

**Environment:** LegalEase Packet Factory (Codex Cloud)  ·  **Lane:** rapid-repair
**Repository branch to select:** `claude/legalease-sprint-captain-utucnw`
**Branch in the container:** `work` — Codex Cloud names it. Do not rename it and do not create another.
**Minimum required ancestor:** `746ff79f60d3c54b45fed73fa73bcc5b896dbadd` (or the newer dispatch base)
**Execution contract:** `docs/rcap/grade-a/launch-control/CODEX_CLOUD_PACKET_EXECUTION.md` — read it before you start.
**Repository:** Roger-LegalEase/legalease-partner-dashboard-clean

> There is no origin, the checkout is shallow, and your finished diff returns through the Codex Cloud interface. That is the design.

> ## THIS PROMPT IS ONE INDEPENDENT CODEX CLOUD TASK.
>
> **DO NOT EXECUTE THE OTHER FIX PROMPTS IN THIS TASK.**
> **DO NOT EXECUTE ANOTHER LANE'S PROMPT IN THIS CONTAINER.**

## Before anything else

```sh
source $HOME/.legalease-corpus-env
node scripts/verify-packet-build-environment.mjs \
  --family 'co_motion_seal_conviction-set' \
  --codex-cloud \
  --minimum-captain-sha 746ff79f60d3c54b45fed73fa73bcc5b896dbadd
```

It must print **`PACKET_BUILD_ENVIRONMENT_READY with every registered applicable check passing`**. A -1/0 in cloud mode is a real failure, not the shallow checkout being tolerated.

## Never run these

- `git fetch`
- `git pull`
- `git push`
- `gh `
- `git worktree`
- `git remote add`
- `git clone`

## Claim before you read

- Assert only these 5 exact families before reading or writing family content:
- `node scripts/grade-a-packet-factory-24h/claim.mjs --assert FIX01 'co_motion_seal_conviction-set'`
- `node scripts/grade-a-packet-factory-24h/claim.mjs --assert FIX01 'co_petition_seal_arrest-set'`
- `node scripts/grade-a-packet-factory-24h/claim.mjs --assert FIX01 'agency-application-treatment:obligation:track-only:CT:ct-destruction-request'`
- `node scripts/grade-a-packet-factory-24h/claim.mjs --assert FIX01 'composed-treatment:obligation:runtime-only:WV:sex-trafficking-victim-vacatur-and-expungement'`
- `node scripts/grade-a-packet-factory-24h/claim.mjs --assert FIX01 'oh_marijuana_expungement-set'`
- A non-zero exit is a full stop for that family: report `BLOCKED_BEFORE_CLAIM` naming the exact refusal, and read none of its artifacts.
- Do not release a claim in a worker return. Captain releases it centrally after integrating the bounded return.

## How to raster

- **A missing Chromium is not a source blocker and it is not a legal blocker.** ENV-RAS01 established that this container cannot resolve or fetch one -- the Playwright CDN answers HTTP 403 from inside Codex. That is an environment fact about the container, not a fact about the packet, and classifying it as BLOCKED_SOURCE would put a packet defect on a record that has none.
- Finish every nonvisual obligation. Record the exact SHA-256 of the canonical and boundary PDFs you produced. Return the family `BUILT_RASTER_PENDING`.
- `BUILT_RASTER_PENDING` is a factory workflow state and not a launch verdict. It zeroes nothing and waives nothing: visualDefects stays whatever it is, because it records that nobody has looked, not that there is nothing to see. **No packet becomes PASS_COMPLETE without RASTER_PASS.**
- The render happens in `.github/workflows/rcap-packet-raster-acceptance-batch.yml` on a browser-equipped runner, against the exact bytes your hashes pin. RASTER_PASS sends the family to independent verification; RASTER_FAIL sends it to FIX.
- Page rasters go through `scripts/raster/pdf-page-raster.mjs`. It discovers its own browser and calibrates the page-to-pixel mapping against both the paper bounds and stamped marks.
- NEVER `pdftoppm`. NEVER `apt-get`. NEVER `playwright install`. The environment refuses package installation and a Poppler fallback is not a fallback, it is a different measurement.
- The preflight now gates on the rasterizer resolving a browser it can execute, so a lane that cannot raster learns before it builds rather than after.

## Mission

Repair exactly the proof obligations a verifier failed, on exactly the families it failed them on. Nothing else.

## The 5 families

- `co_motion_seal_conviction-set`
- `co_petition_seal_arrest-set`
- `agency-application-treatment:obligation:track-only:CT:ct-destruction-request`
- `composed-treatment:obligation:runtime-only:WV:sex-trafficking-victim-vacatur-and-expungement`
- `oh_marijuana_expungement-set`

## What you receive

Only the failed families and their exact failed proof obligations.

A repair lane does not repeat broad family analysis. If the failure is not reproducible from the obligations you were given, stop and say so rather than re-deriving the family.

**After repair, the family goes to a verifier that is neither its builder nor its repairer. Captain routes it; you do not choose.**

## Owned paths — write only here

- `data/rcap-grade-a/packet-factory-24h/fix01/**`
- `data/rcap-all50/overlays/census-v1/co/co-motion-seal-conviction-set--official-pdf-fill/**`
- `data/rcap-all50/overlays/census-v1/co/co-petition-seal-arrest-set--official-pdf-fill/**`
- `data/rcap-all50/overlays/census-v1/ct/agency-application-treatment:obligation:track-only:ct:ct-destruction-request--official-pdf-fill/**`
- `data/rcap-all50/overlays/census-v1/wv/composed-treatment:obligation:runtime-only:wv:sex-trafficking-victim-vacatur-and-expungement--custom-pleading/**`
- `data/rcap-all50/overlays/census-v1/oh/oh-marijuana-expungement-set--custom-pleading/**`
- `scripts/build-census-v1-co_motion_seal_conviction-set.mjs`
- `scripts/build-census-v1-co_petition_seal_arrest-set.mjs`
- `scripts/build-census-v1-agency-application-treatment:obligation:track-only:CT:ct-destruction-request.mjs`
- `scripts/build-census-v1-composed-treatment:obligation:runtime-only:WV:sex-trafficking-victim-vacatur-and-expungement.mjs`
- `scripts/build-census-v1-oh_marijuana_expungement-set.mjs`

## Never write here

- `scripts/rcap-packet-completeness/**`
- `data/rcap-grade-a/launch-control/**`
- `data/rcap-grade-a/codex-cloud/p2v01-washington-independent-verification/**`
- `data/rcap-grade-a/codex-cloud/p2v02-washington-independent-verification/**`
- `data/rcap-grade-a/codex-cloud/p2v03-washington-independent-verification/**`
- `data/rcap-grade-a/codex-cloud/sdv01-south-dakota-independent-verification/**`
- `data/rcap-all50/overlays/census-v1/**/ny-160-59-petition-set*`

## Required outputs

- data/rcap-grade-a/packet-factory-24h/fix01/rows.json — one row per family: itemId, status, the obligation repaired, repairedByThisLane, and countersAfter (all nine, as an object). If this directory already holds a return under that name, write yours alongside under a distinct name rather than overwriting it — returns are found by shape, not by filename.

### Output schema

Array key `rows`, item key `itemId`, status words: `COMPLETED`, `STOPPED`.

- `repairedByThisLane` — true only where THIS lane changed the family. A family you re-measured and found already sound is COMPLETED with this false or absent, and its stale verdict is Captain's to clear -- claiming a repair you did not perform is how a verdict gets superseded by nothing.
- `countersAfter` — the nine completeness counters as an object, measured after your change by verify-packet-completeness.mjs --family <id>. Every value must be zero for the repair to supersede the failing verdict. Report a non-zero counter honestly rather than omitting it; a repair that did not finish is a finding, not a pass.
- `laneKind` — omit it, or set it to "repair" or "shared-host-repair". Any other value is read as not-a-repair.
- `obligationCoverage` — the row text must name every obligation in the family's failedObligationNames. A repair that does not mention what it repaired cannot be matched to the verdict it answers.

An unrecognised status is refused at integration rather than translated. A COMPLETED row missing repairedByThisLane or countersAfter is read as work not done -- it is not translated into a pass.

## Focused tests

- `node scripts/rcap-packet-completeness/verify-packet-completeness.mjs --family <familyId>`

> Focused checks only. The full national repository chain runs at Captain checkpoints, never inside a worker.

## Stop conditions

- LANE STOP — you do not change the completeness contract.
- LANE STOP — only the families and obligations handed to you.
- ROW STOP — an obligation you cannot repair without re-deriving the family is STOPPED with what is missing.
- NEVER invent a fact and never write a protected field.

Stopping with an honest account of what is missing is a complete return. One blocked family never stops the lane.

## How you return

Commit locally. Leave the final diff for the Codex Cloud interface. There is no PUSHED line in a cloud return.

```text
ASSIGNMENT:
BASE SHA:
COMMIT:
FAMILIES REPAIRED:
FAMILIES STOPPED:
NINE COUNTERS ZERO ON:
COMMERCIAL ROUTES OPENED: 0
PRODUCTION TOUCHED: NO
PREFLIGHT: PACKET_BUILD_ENVIRONMENT_READY with every registered applicable check passing
DIFF LEFT FOR THE CODEX UI: YES
```

## What finishing does not do

A repaired family is a repaired family. It must be verified again, by someone who neither built nor repaired it.
