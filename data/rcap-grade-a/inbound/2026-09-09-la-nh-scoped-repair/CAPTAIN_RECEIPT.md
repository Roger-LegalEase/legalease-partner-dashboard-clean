# LA/NH scoped repair — received, partly verified, NOT installed

Received 2026-09-09 from Roger. Preserved here rather than in either family
directory, because installing it is not yet possible. Nothing under this path
is read by any generator, verifier or runtime; it is an inbound holding area.

## What arrived, and what it proves

Six files: the README, three evidence records, and the two CANONICAL PDFs.

**Verified here, first-hand:**

| claim | check | result |
|---|---|---|
| LA canonical is `8b64a06c…` | recomputed SHA-256 | matches the audit exactly |
| NH canonical is `230b7d96…` | recomputed SHA-256 | matches the audit exactly |
| LA canonical is five pages | `pdfinfo` | 5 |
| NH canonical is fifteen pages | `pdfinfo` | 15 |
| preimages match Captain `2a01a9730` | `git merge-base --is-ancestor` | it is a real ancestor of this head |
| the patch targets have not moved since | `git diff 2a01a9730..HEAD` on both families and both builders | one file moved, below |

The one moved target is
`la-987-set-aside-and-dismiss-set--official-pdf-fill/product-wiring.json`: its
generator-owned `acceptanceReceipt` went from a RASTER_PASS bound to canonical
`8b931df1…` to `null`, because the queue no longer holds a receipt for those
bytes. A patch hunk touching that file would need reconciling rather than
applying.

## Why it is not installed

The installation needs four things that did not arrive:

1. `candidate.patch` — the actual code. The repair IS the two builders; the PDFs
   are its output.
2. `INSTALL_MANIFEST.json` — the 25 targets with their before/after SHA-256s.
   The README's own instruction is to read it FIRST and verify every `before`
   against disk.
3. `INPUT_BINDINGS.json` — the shared authority inputs and their hashes, needed
   to reconcile against current Captain.
4. Both BOUNDARY PDFs — `50d95ab2…` (LA) and `47fb91fb…` (NH). The audit checks
   four fixtures; two of them are not here.

Installing the two canonical PDFs alone would be actively wrong. It would put
new bytes on disk with no builder that reproduces them, no boundary
counterparts, and every record — field map, receipts, rendered-artifacts, the
raster queue — still naming the old bytes. That is precisely the
records-disagree-with-bytes class that failed `ms-nonconv-set` four times in a
row this shift, and it is the class
`scripts/verify-acceptance-receipt-agreement.mjs` now exists to refuse.

## Current state of both families

Both are LEGAL_BLOCKED on independent verdicts of BLOCKED_LEGAL_INPUT — LA from
vf01 at `b35fbc6ed`, NH from vf03 at `d974bcdd8`. On disk today:

- LA canonical `8b931df1…` 15011 B, boundary `8e967c9d…` 15249 B
- NH canonical `436ed4d5…` 202264 B, boundary `f53a1a29…` 202315 B

## What the delivery does NOT claim, in its own words

No independent verdict, approval record, national queue, runtime entitlement,
production setting or terminal count changes. Author QA is not independent
review and not central Chromium acceptance; the measurements file says its own
visual inspection is "pending". Both families keep real open questions — LA the
selected parish's cost and service handling, NH the automatic-cohort
applicability and the separate financial-statement service. The README says
plainly: do not count this archive as two closed families.

Nothing here has been counted. Terminal families are unchanged by this receipt.

## To proceed

Send `candidate.patch`, `INSTALL_MANIFEST.json`, `INPUT_BINDINGS.json` and the
two boundary PDFs. Then: a clean worktree off current Captain, verify every
`before` hash against disk, reconcile the one moved product-wiring rather than
overwriting it, apply, verify every target against `after`, run the 22 focused
tests with `RCAP_NH_REPAIR_BASELINE_DIR` pointed at the ORIGINAL bound packets
from `2a01a9730` (not at the corrected PDFs), and only then re-raster and put
both families to an independent reader who did not build them.
