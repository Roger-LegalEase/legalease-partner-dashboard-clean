# D3A — official-form packages for CO, TX, ND, NH and MO

Lane D3A of the D state-regeneration wave. Branch
`claude/rcap-d3a-regenerate-co-tx-nd-nh-mo`, cut from
`03c14f985beda55596b894686bf70833e44a8f5b`.

At that base, `data/rcap-all50/overlays/production/` held only the nine D1
states. These five had no package directory, no source record and no entry in
either shared index, so this is a first build rather than a regeneration: each
family is established from the Edition 1 source pack, whose
`STATE_MANIFEST.csv` is the identity authority.

## What was built

66 family packages over 65 official PDFs and one non-PDF asset. Every delivered
binary hash-verified against its manifest row before it was opened, and every
census was taken from the binary rather than from the manifest's own column.

| | CO | TX | ND | NH | MO | lane |
|---|---|---|---|---|---|---|
| families | 21 | 28 | 3 | 9 | 5 | 66 |
| source hash matches | 21 | 28 | 3 | 9 | 5 | 66 |
| source mismatches | 0 | 0 | 0 | 0 | 0 | 0 |
| fields inventoried | 510 | 253 | 56 | 266 | 261 | 1346 |
| fields bound | 30 | 71 | 21 | 32 | 23 | 177 |
| protected or refused | 480 | 182 | 33 | 231 | 224 | 1150 |
| finalized PDFs | 18 | 27 | 6 | 21 | 9 | 81 |
| contact sheets | 6 | 9 | 2 | 6 | 3 | 26 |

The lane's numbers are produced by `--verify`, which re-reads the committed
packages and checks their claims against the artifacts they ship, rather than
by the build that wrote them.

## Why so much stays blank

1150 of 1346 fields are protected or refused, and that is the intended shape.
D0's binder starts every field protected, and the largest single reason a field
stays blank is that no allowlisted fact describes it. Beyond that:

**Court orders are not filled at all.** Twenty-two families carry the manifest's
`ORDER` role. D0 offers a caption-only path for court-issued documents, but
whether a participant may write even a caption onto a judge's order is a legal
question this lane is not entitled to answer, so orders are inventoried,
censused and left entirely blank. That is recorded as
`court_order_component_never_participant_filed`, not as an omission.

**Instructions and guides are not filled.** Eighteen families are participant
reference material. They are read, not filed.

**Flat participant forms produced no overlay.** Three participant-completed
forms carry no widgets, so the only honest write box would be one the document
itself draws. CO JDF-680 and TX CR-63 draw no rule line at all. CO JDF-683
draws five, but every one of them sits in its appeal-history block, where the
descriptors that match the labels — `matter.case_number` against "Appeal Case
Number", the filing date against the "Date" beside "Result" — would put a
correct value into the wrong statement. The measured candidates and the binder's
verdict on each are recorded in `reports/flat-anchor-evidence.json`; no
coordinate was synthesized and no overlay was written.

## Two things the generic binder got wrong

Reading the bindings field by field, against the forms rather than the field
names, found values that were correct in themselves and wrong where they landed.
Both classes are now withheld, and D0's own conflict path does the withholding:
naming a field with a fact its own name does not resolve to makes `decideBinding`
fail closed. No protection was weakened and `rcap-field-semantics.mjs` was not
edited.

**Fields whose subject is not the participant.** Colorado's caption block has a
`Court Address` — the court's address, reached through the street-address
descriptor's general `\baddress\b` alternative. Its `CoS_Name` and `CoS_Address`
are the certificate-of-service block, naming the party served. Missouri's
`County/City of St. Louis` is the venue selector, and on CR300 — a correction
petition after identity theft — the petitioner is the person whose identity was
used while the named defendant is the person the record identifies, so the
petitioner's own name and date of birth are exactly the values that must not
appear in the defendant block. On the same form `SSN Defendant` and
`Driver's License Number Defendant` resolve through the full-name descriptor's
`\bdefendant\b` alternative, so a name would be written into an identifier field.

**One value written into every slot of a construct.** A name cannot separate a
nine-row table column from a petitioner's name asked for twice, but geometry can:
the slots of a construct line up, and Texas's `Name` and `Name2` do not.
`isCompositionalGroup` treats a same-base group as one construct when its
widgets share an x or share a y on a page. That catches Missouri's
`Court NameRow1..9`, North Dakota's stacked `City or County` column and New
Hampshire's `name.1..4` — four boxes that together spell one name — while
leaving genuine repetition alone. Inside a construct, a slot may carry only its
own indexed fact. 92 fields are withheld this way across the lane, each with its
rationale in `reports/reviewed-withholdings.json`.

Where review cleared a mechanical withholding it says so: New Hampshire's two
stacked mailing-address boxes read as one construct, but the first is the wide
street line at 340pt against the second's 156pt, so the street address is
written there and the narrow second line is left blank.

## Where the escape hatch was used

Twelve fields bind through the sanctioned `explicitMappings` option, all of them
charge descriptions the participant writes about their own record: North Dakota's
pardon-application offence table and Missouri CR360's numbered charge rows. Each
resolves to that row's indexed charge, so a row with no charge stays blank.

CR375's equivalent column is named `Number and Description of Charge`. It asks
for two things and the fact set supplies one, so it was left refused rather than
partly filled — a half-answered field on a court filing reads as a whole one.

## Evidence carried by every filled family

- The contact sheet is built from the finalized artifact, and refuses to emit
  unless every expected value is provably visible in decoded page content and
  the two panels differ.
- The canonical fixture is rendered twice and the bytes compared.
- One byte of the verified source is inverted and the render re-attempted; it
  must be refused.
- Five mutations remove one protection each and confirm the matching guarantee
  stops holding — including that withdrawing a withholding lets the field bind
  again, so a withholding cannot be inert and still be claimed.
- The boundary fixture drives values far longer than any widget was drawn to
  hold; 33 are refused below the 6pt readable floor and left blank rather than
  stamped illegibly.
- `--verify` re-renders each canonical artifact from the pinned source. All 27
  came back byte-identical.

## Holds preserved

Every source lifecycle, currentness and adoption hold from the manifest and the
state README is carried into `productionHolds`; none were cleared. Colorado's
missing state legal review remains a release blocker on all 21 of its families.
New Hampshire's missing State Police fee-waiver affidavit, Texas's link-only OCA
overview and Missouri's three unconfirmed OSCA sets stay open. No source in these
five states states on its face that it must not be completed for filing, so no
non-filing hold fired; the refusal was exercised against every filled family
anyway to prove it is mechanical rather than advisory.

## Status

`implementation_complete_pending_independent_review`. This lane does not approve
its own output. Nothing here is technically approved, production ready, or live.

Texas-Harris remains a preserved live legacy generator. Nothing in this lane
touches it: the work is confined to
`data/rcap-all50/overlays/production/texas/**`.

## Indexes

This lane writes `state-index.json` per state and does not write
`verified-binary-index.json` or `implementation-index.json`. Seven lanes run
concurrently against those two files; the captain merges at import.
