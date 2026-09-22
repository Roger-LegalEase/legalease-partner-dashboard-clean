# #53 noncommercial evidence-producer reconciliation

Base Captain: `4d00a1ffa16965290d55536787dca85981d0fced`.
Footer correction: `95ca90ba99de215d35dcbe06ddeb6528c42d8c7a`.
Scope: MS additional justice/municipal misdemeanor (`ms-misd-addl-set`) and WY
felony (`wy_fel_1502-set`) only. No #52 or #63 implementation is included.
The measured overall #53 scope remains **89/280 canonical fixtures, 182 PDFs**;
this reconciliation admits only the two families for which this proof exists.

## Root cause and contract

The census builders changed, but their historical evidence PDFs did not. MS's
successor recomputed the producer identity of an old approved PDF from today's
builder; WY's frozen supporting-input check refused today's builder outright.
Both records explicitly declare `isCurrentCommercialArtifact: false` and bind
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
Twenty-one preserved inputs bind the full specifications, track/legal authority,
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

Both builders ran before and after #53 in disposable sandboxes. The old renders
reproduce all four historical evidence PDFs byte-for-byte. Only task-evidence
copies were written; no approved artifact was overwritten.

| Family | Canonical | Boundary | Changed pages in each fixture |
| --- | --- | --- | --- |
| MS additional misdemeanor, both exact court routes | 7 pages | 7 pages | 2, 3, 4, 5, 7 |
| WY felony | 8 pages | 8 pages | 3, 4, 5, 6, 8 |

All 30 pages retain identical substantive text spans, fonts, coordinates and page
geometry. Each removed wrapped footer row becomes one blank row at its original
origin. Component/page order, captions, signatures/execution blocks, service,
orders, protected blanks and prefills remain exact. The before/after field-map,
actual-write and protected-blank reports are also byte-identical and bound.
No new blank page or clipping/overlap regression passes the comparator.

Raster comparison at 144 DPI allows only removed footer ink: zero new/darkened
pixels and zero changed pixels outside the footer regions. Forty PNGs provide
before/after evidence for all twenty changed pages. Sampled MS and WY proposed
order rasters were also viewed locally; this is engineering inspection, not a
new qualified visual or legal approval.

## Commercial artifacts and immutable approvals

Every one of the **18** artifacts named by
`OWNER_CURRENT_COMMERCIAL_ARTIFACT_APPROVAL_2026-09-20.json` is re-read and checked
against its exact approved digest and page count, including the nine entries for
MS justice, MS municipal and WY. The owner record itself remains SHA-256
`f6dfbd5e9336627df5a1beac174a85bf11d95849cf0cef6795ce86a8fd9c30d5`.
The three route records must still say the current commercial review is approved
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
positive control on all three routes and rejects **71/71 mutations**. Twelve PDF
mutations are independently rejected by the text/geometry/raster comparator,
beyond their immutable technical-artifact pins. The requested thirteen mutation
categories are all covered. Existing successor tests pass 18/18 and existing
specification-derivation tests pass 27/27.

The corrected Grade-A verifier clears MS/WY and returns the **byte-identical
result** of an isolated exact-Captain archive with only the two MS/WY builders
restored to their pre-#53 versions. Both retain one failure:

`IL:felony-prostitution-relief: artifact successor packetCompleteness differs from exact current authority evidence`

IL was masked by MS's earlier failure and remains outside this proof's scope.
The full authority gate is still red; this correction does not authorize release.
Its existing mutation mode reports 52 caught but remains red for IL; that output
is not claimed as new #53 mutation credit.

Two other controls were reproduced separately:

- Generator `--check`: unchanged Captain already refuses the stale MS
  **non-conviction** paid-packet proof's whole packet-set-manifest digest
  (`177d5d…` actual versus `9034e4…` pinned). No pin was moved and no generator
  output was written.
- Existing WY test: after restoring the pre-#53 builder, an expected-negative
  canonical-PDF mutation is correctly refused by specification derivation, but
  the test expects the older `WY unchanged-track refusal` error prefix. The same
  assertion mismatch remains on this correction; the gate was not weakened.

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

The counterfactual uses an isolated `git archive` of the exact Captain's scripts,
src, package.json and .gitignore; read-only shared data and dependencies; Git
history access through `GIT_DIR`; and only two pre-#53 builder replacements. The
archive is removed after execution. Nothing in the working tree is temporarily
mutated for these controls.
