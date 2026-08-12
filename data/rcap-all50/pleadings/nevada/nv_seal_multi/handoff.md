# NV:nv_seal_multi — consolidated county sealing (NRS 179.2595)

Job `T-C-NV-production-packet`, terminalization window `2026-08-12-w1`.
Disposition: **drafted** (controlled custom pleading).

## Authority

Pinned registry authority for this track, verbatim from commit
`3b6f4c103d2f97249b45acc0ea3fb889ff8787e5`:

- NRS 179.2595
- NRS 179.245
- NRS 179.255

The pleading also cites NRS 179.285 for the effect of sealing. NRS 179.285,
179.295 and 179.301 are carried in the committed Nevada evidence and in the
scope-restriction language rather than as independent grants of relief.

## Mechanism

NRS 179.2595 permits a person seeking to seal more than one record to petition
the district court for the county, which may seal all records within that county
including justice and municipal court cases. It is a **venue overlay** on the
conviction (NRS 179.245) and non-conviction (NRS 179.255) tracks, not a separate
remedy: each underlying record must independently satisfy its own section.
Consolidation changes the venue, not the eligibility.

A verified criminal history from the Nevada Central Repository is a statutory
attachment under NRS 179.245(2)(a) and NRS 179.255(3)(a), obtained by the
participant on a fingerprint basis.

The Nevada workflow is prosecutor-first: the packet goes to the prosecuting
agency for stipulation **before** it is filed with the clerk. Clark County
practice is documented in the source — the district attorney will not stipulate
to petitions that include municipal court matters, so a mixed packet goes to the
city attorney and the district attorney with a separate signature line for each.

## Route decision

Drafted as a custom pleading rather than an official-form fill. The committed
Nevada evidence states that Nevada does not publish a single mandatory statewide
numbered form set and that the packet is a set of pleadings (petition, affidavit,
stipulation, proposed order), with district and justice courts using different
packets. That resolves the registry's `legalDesignBlocker` — "Reclassify Nevada
from official_pdf_fill to custom_pleading (undetermined: correct_form)" — for
drafting purposes. **No official Nevada PDF was replicated.** The source-form
catalog records that the exact published titles and form numbers inside the
Nevada source PDFs could not be machine-extracted, so no form title is asserted.

Caption is movant-first. The proposed order is included; a certificate of service
is not, because Nevada's vehicle is pre-filing prosecutor stipulation rather than
participant service.

### Not drafted, recorded as a dependency

The **affidavit/declaration in support** and the **prosecutor stipulation** are
required packet components and are deliberately **not** drafted. The stipulation
records the prosecuting agency's position, which LegalEase must never assert, and
the source reproduces the text and required contents of neither instrument. Both
are recorded in `dependencies` for lane D/E source retrieval and counsel review.
`componentInventory.notice_affidavit` is `blocked`, not `absent` — the components
exist and are required; we simply may not write them.

## Open counsel flags

- **Filing fee — source silent.** No fee is established for an NRS 179.2595
  petition. No amount appears in the packet or the participant guide. Recorded in
  `sourceSilences`.
- **Waiting period — source silent for this track.** The registry records the
  duration as "as for the underlying conviction or non-conviction track". No
  period is asserted here. Recorded in `sourceSilences`.
- **Verification statute — source silent.** Handwritten signature is established;
  no verification or notarization statute is identified. `verificationStatute
  .citation` is null with the silence recorded and surfaced as a counsel flag.
- **Registry release blocker (open):** whether every county's district court in
  fact accepts a consolidated petition covering municipal court records is
  documented in detail only for Clark County. Confirm before release outside
  Clark County.
- **Registry legal-design blocker (open):** the official_pdf_fill →
  custom_pleading reclassification remains counsel-confirmable even though the
  committed evidence supports drafting.
- Offence-category classification (category A–E felony / gross misdemeanour /
  misdemeanour, and crime-of-violence status) drives a one-year versus ten-year
  answer and is an attorney judgment. It is never asserted by the pleading.
- Prosecutor refusal to stipulate converts the matter to a contested hearing and
  ends self-help.

## Anti-invention proof

`fixtures/negative.json` reproduces the lane C1 failure mode directly: it
fabricates a court finding, a prosecutor's non-objection and stipulation, a
filing fee the source does not establish, completed service on a date, and
populated protected fields (docket number, OTN, judge). It declares
`qaPassed: true` because `runPleadingQa` genuinely does pass it — QA reads relief
vocabulary, template grade, the footer and seal markers, never truth. The
verifier's invention/protected-field scanner is what rejects it, and the verifier
asserts both that the scanner fires on this fixture and that it stays silent on
every production fixture.
