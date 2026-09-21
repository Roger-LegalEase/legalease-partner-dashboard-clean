# #53 shared composed-route footer correction — engineering evidence

Base: `dbf8284ca7a0b98381ae9c8bcfe40c7d9686b8a3`, containing canonical Captain
`b1e1f1e85b9922ad618a9306c1fb65787abd2e73`.

The correction lives once in `scripts/rcap-custom-pleading/court-facing-rows.mjs`.
The 114 existing composed-renderer adapters call that rule; no family
specification, legal text, source binding, official PDF fill, or approval is
rewritten. A complete logical `Route: obligation:...` line loses its ink after
wrapping. A space reserves each original wrapped row, including its nonempty-row
identity for page balancers. Empty strings failed the NH page-balancing
regression and are deliberately not used.

`regression-evidence.json` records synthetic before/after PDF hashes for every
adapter, unchanged page counts, page sizes, remaining text and coordinates, and
byte-identical output when the source has no internal route footer. The test
also restores only the adapter wrapper/import in memory and compares the entire
source file with Captain, proving all other code (including official filling)
unchanged. The four example PDFs are synthetic engineering cases, not a new DC
packet or qualified page approval. Existing token-splitting and markdown tests
also pass. `synthetic-raster-evidence.json` independently compares both example
PDF pairs at 2x resolution: only ink removal, with no added or shifted ink.

`affected-artifacts.json` identifies the exact saved fixture population, affected
pages, old hashes, and repository references to those hashes. The independent
PyMuPDF extraction covers all 858 canonical, boundary, component and named variant
PDFs. It detects 89/280 canonical packets, 89 boundary packets and four DC
variants (182 artifacts / 90 families), expanding the earlier 73/280
measurement. Every affected artifact is bound to its existing builder and an
import path reaching the shared rule. Parser diagnostics for 59 historical
PDFs remain visible in the evidence; four affected KY PDFs report ActualText
position warnings. These are not clean-read or visual-approval claims.
It does not modify any artifact. References are evidence locators, not a claim
that every reference grants approval. New hashes remain null until actual
rerendering; changed artifacts require renewed applicable evidence and cannot
inherit an old hash approval automatically.

This is a bounded before/after check, not a permanent freeze on legal edits.
For a later combined candidate, set `TASK53_BASE_SHA` to its matching pre-composer
base (including legitimate transcription changes); never revert later content
to satisfy this historical comparison.

Reproduce:

```sh
node scripts/test-rcap-release-containment.mjs
TASK53_EVIDENCE_DIR=data/rcap-grade-a/mission-lock/task53 node scripts/rcap-custom-pleading/court-facing-rows.test.mjs
node --test scripts/rcap-custom-pleading/split-token.test.mjs scripts/rcap-custom-pleading/no-markdown-on-delivered-pages.test.mjs
# Python requires PyMuPDF; this run used 1.28.2 in an isolated /tmp tool directory.
PYTHONPATH=/tmp/task53-pdf-tools node scripts/rcap-custom-pleading/route-footer-impact.mjs
```

`runner-evidence.json` captures the #49 attempt: the authorized runner dispatch
returned HTTP 403 and created no run. Local verification requires unavailable
PostgreSQL. The isolated mutation command's nominal 8/8 result gets zero
detection credit because the unchanged baseline verifier also fails. #49 is
implementation-complete and open for PostgreSQL/hosted evidence; no #49 source
was changed. The existing #42 image-input diff is byte-identical before/after
#46; its gate was not changed or bypassed. #46's containment regression passes.

This is implementation/engineering proof, pending Captain review, integration,
and required renewed artifact evidence. After integration, render DC once using
both Claude's #54 transcription and this composer correction, then renew the
applicable artifact, source and visual evidence. Do not rerender DC separately
for each change. No commercial authority or qualified approval is issued here.
