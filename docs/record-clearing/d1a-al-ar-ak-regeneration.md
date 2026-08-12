# D1A — Alabama, Arkansas and Alaska, regenerated on the D0 factory

Lane D1A regenerates all 30 official-form families in AL, AR and AK from the
D1 source pack, driving the D0 remediated factory modules directly.

- Branch: `claude/rcap-d1a-regenerate-al-ar-ak`
- Base: `03c14f985beda55596b894686bf70833e44a8f5b`
- Driver: `scripts/rcap-official-forms/lanes/d1a-regenerate.mjs`
  (`--build`, `--verify`, `--selftest`)
- Source pack: `RCAP_D_D1_SOURCE_PACK.zip`,
  sha256 `01ab34d2eee2ae5621e18fa74e4c03f24df667965eb27a4e3bf7f80c3216acaa`

The D0 canary was run before any state work and reported 107 checks passed.

## Why this lane does not write the shared indexes

Seven D lanes run concurrently over one corpus. `verified-binary-index.json`
and `implementation-index.json` are read-modify-write documents covering all
nine D1 states, so two lanes finishing at once would each write a file
describing only its own families. This lane therefore writes
`data/rcap-all50/overlays/production/<state>/state-index.json` and leaves both
shared files untouched, for the captain to merge at import. For the same
reason it does not run `scripts/implement-rcap-official-forms-d1.mjs`, which
rewrites both.

The shared verifier walks `implementation-index.json`, so its invariants would
never reach these families. `--verify` applies the same rules directly and is
green over all 30.

## Source identity

All 30 canonical binaries hash-match `STATE_MANIFEST.csv` exactly, and every
byte length, page count and structural class the manifest declares was
re-derived from the file and agrees. Alabama's third binary, `C-10-CRIMINAL`
(Affidavit of Substantial Hardship and Order, REV-2024-05), is a family the
existing corpus did not have; it was established from the manifest like any
other. No source mismatches, no missing binaries, nothing invented.

## Every family is held

Every one of the 30 manifest rows carries `generation_allowed=no` and
`runtime_status=runtime_disabled`, and all three STATE_READMEs record the
state legal-design review as `missing_from_supplied_corpus` /
`release_blocker`. 25 of the 30 are additionally `source_gated` and never
runtime-selectable, and the same 25 carry `source_or_currentness_gate_open`.
202 holds are recorded across the three states.

Those holds survive regeneration and are re-derived from the manifest on every
build rather than copied forward. **A family that renders cleanly here is not
a sellable route.** Nothing in this lane promotes anything.

## The lane's own tightening

D0's binder is fail-closed, but its allowlist matches field *names*, and these
three states carry names its rules were not written against. Reading each
binding D0 produced against the field it produced it for turned up nine
distinct ways a wrong value was about to be written. Every rule below only
ever **removes** a binding D0 allowed; none adds one, and `rcap-field-semantics.mjs`
is unmodified. 85 bindings were withdrawn this way, each recorded field by
field in the family's map under `laneTightening`.

**Classifier agreement.** D0's protect rules are `\b`-anchored, so `\bjudge\b`
does not match `Judges Printed Name` and `\bemployer\b` does not match
`Employers Name Address`. The corpus classifier's patterns are unanchored and
catch both. Requiring the two to agree closes the whole plural-and-possessive
class rather than naming its members one at a time. `Judges Printed Name` on
Arkansas's order of probation was about to receive the petitioner's name.

**Service recipients and process servers.** `Mailing Address of Board or other
entity to be served`, `Name of Person Served`, `Address of Server` and
`Servers Printed Name` on Alabama's C-94A were each about to receive the
petitioner's own details.

**Service-block extent.** A service-recipient address block is a run of bare
contact fields under a heading naming somebody else: on C-94A it is the board's
mailing address, then `City State Zip Code`, then `Telephone Number`, and only
the first says whose address it is. The block's extent is read from the form's
layout — it opens on a contact field belonging to an agency, board or service
recipient and closes on the next field bound to something that is not a contact
detail. The opener must itself be a contact field, because a bare name field
does not head an address block: on Alabama's C-10 the affiant's own
`Complete Home Address` sits directly under `Spouses Full Name if married`.

**Service and notarization regions.** Where a page carries a service or jurat
heading, everything the page draws below that heading's measured baseline
belongs to the block. The headings came from the documents rather than from a
general idea of what such a block is called: C-94A titles its service page
`RETURN ON SERVICE` and opens its jurat `Before me, the undersigned authority`.

**Sentence-fragment field names.** A field named `1 The Defendant was arrested
on the` is quoting the clause its blank sits in, not labelling it — that blank
wants the arrest date, and D0 saw `Defendant` and offered the participant's
name. A label has no finite verb, which is what separates the two.

**Compound fields.** `City State and Zip` would have received only the city;
`FirstMiddleandLastname` matched D0's surname descriptor on its squashed form
and would have received `Reyes` alone; `COUNTY/CITY` asks for one or the other
and the form does not say which, so it is refused rather than guessed.

**Descriptor collisions.** `\baddress\b` outranks `\bemail\b` in D0's
descriptor order, so `Work Email Address` on SBI-Form-46 was about to receive a
street address.

**Statutory citations.** D0's `matter.charge` descriptor matches `\bstatute\b`
as well as `\bcharge\b`, so Arkansas's `in violation of ACA` slots — which want
an Arkansas Code citation — were about to receive the prose charge
description. The fact set holds no statutory citation and inventing one states
a legal rule to a court, so those slots stay blank.

**Table rows.** D0 applies row discipline to the facts it indexes per charge,
so `OFFENSE 02` stays blank without a second charge. `matter.county` is not on
that list, so `COUNTY 02` and `COUNTY 03` were each receiving the first case's
county — one county stamped down a multi-case table. Rows whose fact D0 indexes
are left to D0 and bounded only by the form's capacity; rows with no indexed
fact at all are refused outright. The suffix has to be read carefully: Acrobat
appends `_2` to disambiguate two fields sharing a name, so `Name of County_2`
is the same county again while `COUNTY 02` is a second row.

**Identification documents.** `State  Last 4 Digits of Driver Licenses Number`
and `Issuing State` would have received a bare state code.

**Secondary address lines.** `ADDRESS 1` and `ADDRESS 2` are two lines of one
address and D0's descriptor matches both, so the street address was being
written into each. There is no second-line fact, so the second line stays empty.

## The explicit-mapping escape hatch

D0 refuses `matter.charge`, `matter.offense_date` and `matter.arrest_date` on a
name match alone. This lane reopens 6 fields across 3 Arkansas petitions, all
offence-description slots on participant-completed filings, each recorded with
its rationale in `reports/explicit-mappings.json`. The policy opens only where
the document is participant-completed, no protect rule fired, the corpus
classifier independently placed the field in `participant`, no lane guard
fired, the field is a text field, and the name describes the offence.

That last clause matters: `No Charge` on SBI-Form-46's fee line contains
`charge` and means the opposite of a criminal charge. It is excluded, not
mapped. No court-issued order receives an explicit mapping — orders are
caption-only, and none of these facts is a caption fact.

## Proof carried by each rendered family

- **Visibility** — `contact-sheet/contact-sheet-proof.json`: every expected
  value decoded out of the finalized flattened artifact, and the blank and
  filled panels proven to differ. 28/28.
- **Placement** — `reports/placement-proof.json`: for every value written, its
  glyphs are decoded from the finalized artifact and confirmed to land inside
  the rectangle of the widget it was written into. One test discharges four
  defects: a value outside its box is misplaced, one running past the edge is
  clipped, one appearing twice in a box is duplicated, and two intersecting
  written boxes overlap. 126/126 values, 28/28 families, no overlaps.
- **Protection** — `reports/protected-fields-scan.json`: nothing protected
  written, no active-content residue, no value written but invisible. 28/28.
- **Negative fixture** — rendered with an empty fact set; nothing is written.
  28/28.
- **Boundary fixture** — 42 values across the corpus could not be made readable
  inside their widget and were refused rather than stamped at an illegible
  size. Refusals, not clipping.

`--selftest` runs 32 checks over four representative families: byte
determinism, source-drift refusal, the non-filing hold, the negative fixture,
active-content inspectability, and four mutations that each remove a protection
and require its check to go red — naming a protected field explicitly, a
contact sheet whose filled panel carries no values, a displaced widget
rectangle, and a widget narrowed until nothing legible fits.

Two full builds produced byte-identical output: 84 PDFs and 479 JSON files.

## No non-filing notices in this corpus

None of the 30 sources states `DO NOT COMPLETE THIS FORM FOR FILING`, so the
hold has nothing to fire on here. That is a reason to test the mechanism rather
than assume it: `--selftest` injects the notice into each representative family
and requires `NonFilingHoldError` and no fill.

## Families that produce no fill

- `AK/dps-seal-req-2-04-source-gated-en` — an instructional document. It is
  read, not filed, so no participant fill is produced, and its
  `not_participant_fillable_no_fixture_fill` hold is recorded.
- `AR/ar-acic-petition-to-seal-records-of-pardoned-offender-or-youthful-source-gated-e`
  — a flat PDF whose text layer yields no participant label with a measurable
  write box. No coordinate is asserted rather than one being invented.

## Findings for the captain, outside this lane's ownership

**The shared verifier's placeholder scan reads PDFs as UTF-8.**
`scripts/verify-rcap-official-forms-d1.mjs` scans every file in a family
directory as text and rejects `/xxx+/i`, which then matches arbitrary bytes
inside a Flate-compressed stream. This is the same false-positive class D0
already fixed in the active-content residue scan by blanking stream payloads
before matching. It predates this lane — the base commit's own committed
`arkansas/ar-acic-petition-to-seal-felony-under-act-1460-source-gated-en/fixtures/canonical-filled.pdf`
matches it. The file is outside this lane's ownership, so it is reported rather
than patched. This lane's `--verify` scopes the same scan to JSON and Markdown.

Relatedly, Alabama's C-94A prints an `XXX-XX-____` social-security mask on its
own face. A placeholder scan reading the whole finalized page attributes the
form's typography to the renderer, so this lane's scan judges only the values
the renderer wrote, and discloses the preprinted count separately.

**`notForFilingNotice` is referenced but never declared** in
`scripts/implement-rcap-official-forms-d1.mjs` (lines 541 and 546). Under ESM
strict mode that raises a `ReferenceError`, which the surrounding `try` catches
and records as `finalize_refused` — so a run of that script would silently
produce no fixture for every family. This lane does not run or edit it.

## Status

`implementation_complete_pending_independent_review`.

Not technically approved, not production ready, not launch ready, not live.
Every family remains `runtime_disabled` with `generation_allowed=no`, and the
state legal-design review is missing from the supplied corpus for all three
states.
