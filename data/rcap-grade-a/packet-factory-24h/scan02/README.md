# SCAN02 — hard-split route keys on proven families, re-measured

Lane SCAN02, measurement only. Base 427afe413, branch scan02-hard-split-proven.
No packet, builder, receipt, ledger, queue or script was edited. This directory
holds one JSON (`hard-split-proven-measurement.json`) and this note. The JSON
carries no `rows` array and is not a lane return.

## What was measured

Every COMPLETE_PACKET_PROVEN family in MASTER_QUEUE.json at the base (150) plus
ri_multiple_misdemeanors-set, ri_first_offender_felony-set,
ri_first_offender_misdemeanor-set and ri_deferred_sentence-set: 154 families,
478 fixture PDFs, 3,066 pages. Every page was inflated through the repository's
own content-stream walker (rcap-pdf-anchor-capture.mjs), each drawn line was
reconstructed with its baseline, and the text was matched against the family's
own route keys (MASTER_QUEUE routeKeys plus every `obligation:` string in its
field map and source receipt). Sixty-six encrypted California
`*-unchanged-official.pdf` forms cannot be walked; those families have no
composer and their filled companions were read.

Four classes: (a) a route key broken across two drawn lines by a char-by-char
cut (mid-word, or just before its own separator); (b) a page whose every line
is route-key text; (c) a route key drawn below a signature or certification
line of an order component; (d) FIX30's closed markdown emphasis pair
(`**…**` / `__…__`), added at the Captain's request mid-run. A key broken after
its own separator is the repaired splitter's break and is recorded but not
counted. The instrument's full source is embedded in the JSON.

## Result

35 of 154 families carry at least one defect (31 proven, all four Rhode Island);
119 were inspected page by page and carry none. 23 of the 35 are owner-approved
under OWN-ADOPT-2026-09-02-BATCH-53, so repairing them moves owner-pinned
digests; four (il-prostitution-j-vacate-set, ms-misd-addl-set, ms-nonconv-set,
wy_fel_1502-set) hold fulfillment authority records.

Hosts, one writer each: build-census-v1-ri_decriminalized-set.mjs (5 families),
build-census-v1-ga-host.mjs (8, class c only, already on the shared splitter),
rcap-custom-pleading/composed-family-host.mjs (2: ms-misd-1st-set and
ms-nonconv-set, 10 hard splits each), and nineteen private-copy builders with
one family each; the Wisconsin markdown hit is the official DJ-LE-250B form's
own printed text and has no composer host.

## Why SCAN01 "missed" it

It did not. The committed SCAN01 sweep lists all five families with the exact
fragments; SCAN01's unmodified script re-run today on ms-misd-1st-set's
canonical bytes reports the same ten cuts. SCAN01 is a verdict-less
measurement whose worklist was never joined to the proven state and was
dispatched only for four cohorts, and the record's `scan01SawIt: false` is
wrong. Two instrument gaps compound it (split-key trailer pages misnamed
`fragment_page`; no class for a key under an order's signature line), and the
sweep is a snapshot: az_wrongful_arrest_clearance-set was clean at the sweep
tip and regressed when rebuilt afterwards. Details under `whyScan01Missed`.
