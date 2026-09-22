# #53 noncommercial evidence-producer reconciliation

Base Captain: `4d00a1ffa16965290d55536787dca85981d0fced`.
Footer correction: `95ca90ba99de215d35dcbe06ddeb6528c42d8c7a`.
Scope: MS additional justice/municipal misdemeanor (`ms-misd-addl-set`) and WY
felony (`wy_fel_1502-set`) and IL felony prostitution
(`il-prostitution-j-vacate-set`). The separate Illinois follow-up starts from
`e68a7ababd719618bf15ccae20e8600d520626c9`; the accepted MS/WY commit is unchanged. No #52 or #63 implementation is included.
The measured overall #53 scope remains **89/280 canonical fixtures, 182 PDFs**;
this reconciliation admits only the three families for which this proof exists.

## Root cause and contract

The census builders changed, but their historical evidence PDFs did not. MS's
successor recomputed the producer identity of an old approved PDF from today's
builder; Illinois had the same recomputation failure. WY's frozen supporting-input check refused today's builder outright.
All affected records explicitly declare `isCurrentCommercialArtifact: false` and bind
separately approved participant artifacts. Changing an owner approval would
therefore repair the wrong identity.

`reconciliation.json` follows the existing specification-derivation and
unchanged-track reconciliation architecture: one byte-pinned technical receipt,
current-byte assertions, and bounded consumption by the existing generator and
verifier helpers. The approved evidence PDF retains its actual historical
producer identity. Current supporting-builder bytes are admitted only after
validating this distinct reconciliation. Historical pins are not overwritten.

The contract binds exact routes, both builder digests, the #53 commit, the shared
helper digest, archival pre-builder bytes and a byte-exact transformation that
adds only the `courtFacingRows` import/wrapper. Any extra builder edit fails.
Twenty-eight preserved inputs bind the full specifications, track/legal authority,
packet-set manifest, production field maps, old approvals/receipts, and separate
commercial provider publication. Complete objects/bytes are compared, not counts.
Previously reconciled specification changes retain their existing reconciliation.

All six scope statements are explicit and enforced:

- `changesLegalContent: false`
- `changesCurrentCommercialArtifacts: false`
- `changesShippingArtifactApproval: false`
- `createsApproval: false`
- `approvesNewBytes: false`
- `nonCommercialEvidenceProducerSupersession: true`

## MS and WY render proof

All three builders ran before and after #53 in disposable sandboxes. The old renders
reproduce all six historical evidence PDFs byte-for-byte. Only task-evidence
copies were written; no approved artifact was overwritten.

| Family | Canonical | Boundary | Changed pages in each fixture |
| --- | --- | --- | --- |
| MS additional misdemeanor, both exact court routes | 7 pages | 7 pages | 2, 3, 4, 5, 7 |
| WY felony | 8 pages | 8 pages | 3, 4, 5, 6, 8 |
| IL felony prostitution | 3 pages | 3 pages | 2, 3 |

All 36 pages retain identical substantive text spans, fonts, coordinates and page
geometry. Each removed wrapped footer row becomes one blank row at its original
origin. Component/page order, captions, signatures/execution blocks, service,
orders, protected blanks and prefills remain exact. The before/after field-map,
actual-write and protected-blank reports are also byte-identical and bound.
No new blank page or clipping/overlap regression passes the comparator.

Raster comparison at 144 DPI allows only removed footer ink: zero new/darkened
pixels and zero changed pixels outside the footer regions. Forty-eight PNGs provide
before/after evidence for all twenty-four changed pages. Sampled MS and WY proposed
order rasters were also viewed locally; this is engineering inspection, not a
new qualified visual or legal approval.

## Commercial artifacts and immutable approvals

Every one of the **18** artifacts named by
`OWNER_CURRENT_COMMERCIAL_ARTIFACT_APPROVAL_2026-09-20.json` is re-read and checked
against its exact approved digest and page count, including the twelve entries for
MS justice, MS municipal, WY and IL. The owner record itself remains SHA-256
`f6dfbd5e9336627df5a1beac174a85bf11d95849cf0cef6795ce86a8fd9c30d5`.
The four route records must still say the current commercial review is approved
and retain their exact separate provider/publication identity. Moved commercial
artifacts, changed approval bytes or a pending review make reconciliation fail.
No old approval, registry, projection, observation or worker-static authority was
edited. Technical output hashes do not acquire shipping approval.

All seven filing-format bindings remain exact: **1 true, 6 false**. The three
owner approval records protected by Claude's gate are pinned in full and
unchanged. Mutating any classification or protected approval fails.

## Results and other failures

`results.json` indexes exact evidence and commands. Claude's unmodified review
gate passes **16/16**. `npm run typecheck` passes. The shared footer regression verifies all 114 composed
adapters and passes; the 18 successor tests and 27 derivation controls pass. The focused gate has a green
positive control on all four routes and rejects **93/93 mutations**. Eighteen PDF
mutations are independently rejected by the text/geometry/raster comparator,
beyond their immutable technical-artifact pins. The requested thirteen mutation
categories are all covered. Existing successor tests pass 18/18 and existing
specification-derivation tests pass 27/27.

The corrected Grade-A verifier passes **78/78**, with 14 registry routes and six
commercially eligible routes. Its output is byte-identical to the actual
pre-#53 Captain `16aaf5ea08bfd531576334ad88cccab934aff215`.

The earlier MS/WY-only counterfactual left the IL builder changed and therefore
could not classify Illinois as unrelated. That earlier classification was wrong:
Illinois is a #53 consequence, now resolved by the same reconciliation. Historical
partial-experiment logs remain identifiable as such in `results.json`.

Two separate failures were reproduced on the actual pre-#53 Captain and the
corrected tree:

- Generator `--check`: stale MS **non-conviction** paid-packet proof's whole
  packet-set-manifest digest (`177d5d…` actual versus `9034e4…` pinned).
- Existing WY test: the negative canonical-PDF mutation is correctly refused by
  specification derivation, but the assertion expects the older
  `WY unchanged-track refusal` error prefix.

Illinois's separately delivered full-en, court-only and full-es remain exact,
with 9, 4 and 11 pages respectively. The current-commercial owner approval and
`OWNER_ARTIFACT_REREVIEW_IL_VACATUR_2026-09-14.json` remain byte-identical. The
census classification remains false and the commercial provider is unchanged.
Illinois adds eight raster PNGs for canonical/boundary pages 2 and 3; each
comparison has zero new/darkened pixels and zero differences outside footer ink.

## Reproduction

The regular fulfillment gate requires the existing Poppler `pdfinfo` tool.
Technical rendering/comparison additionally uses isolated Python tools:
PyMuPDF 1.28.2 and NumPy 2.5.3. This run used Poppler 24.02.0.

```sh
PYTHONPATH=<isolated-python-tools> node scripts/generate-noncommercial-evidence-producer-proof.mjs
PYTHONPATH=<isolated-python-tools> node scripts/test-noncommercial-evidence-producer-reconciliation.mjs
node scripts/verify-rcap-grade-a-fulfillment-authority.mjs
node scripts/generate-rcap-grade-a-fulfillment-authority.mjs --check
node --test scripts/artifact-approval-successor.test.mjs
node scripts/test-specification-derivation-reconciliation.mjs
```

The actual pre-#53 baseline uses an isolated archive of Captain
`16aaf5ea08bfd531576334ad88cccab934aff215` (the parent of integrated #53), including
its scripts, src, package.json and .gitignore. A temporary data view restores every
tracked data difference to that baseline, with unchanged files accessed read-only.
It shares installed dependencies and history through `GIT_DIR`. The temporary view
is removed after execution. No working-tree source or approved artifact is
modified to run baseline controls.
