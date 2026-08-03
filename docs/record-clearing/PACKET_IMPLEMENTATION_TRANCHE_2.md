# Packet implementation — Tranche 2, Maryland

**Implemented:** 3 August 2026
**Jurisdiction:** Maryland
**Tracks:** 1
**Authority:** Master Library Edition 1.2, `7edd0a0e8308b58e12f59494a326342cc83dd362bb58f787e43d6fb475ef43bd`
**Base commit:** `8df94fb`
**Legal recommendation:** `recommended_for_counsel_adoption`
**Human legal-review status:** `awaiting_counsel_adoption`
**Runtime:** `packet_ready` 0 · enabled jurisdictions 0 · launch gate red

## What this tranche is for

Tranche 1 proved the custom-pleading lane end to end. Nothing had yet proved
that LegalEase can take a current official state form, fill only the
participant's own blanks, leave every third-party blank empty, and hand the
participant one assembled PDF. This is that proof.

Maryland is the right jurisdiction for it: a large statewide market on MDEC
e-filing, a Judiciary that publishes Rules-approved forms the clerks are built
around, and a normalized legal design that expressly forbids substituting a
custom pleading for those forms. The selected route also carries the highest
per-participant cost of error in the Maryland set — Second Chance Act shielding
is granted once in a lifetime, so a defective packet is unrecoverable.

## The one track

| Track | Business label | Mechanism | Forms | Branch variants |
|---|---|---|---|---|
| `md_second_chance_shielding` | Second Chance Act shielding | Md. Code, Crim. Proc. §§ 10-301 – 10-306; Md. Rules 16-934, 16-941, 20-201.1 | CC-DC-CR-148 + MDJ-008 | `district_court`, `circuit_court` |

Plus twelve independent statutory offence branches on the petition, each its own
checkbox and case-number block.

## Why one and not four

Maryland has six `official_pdf_fill` tracks. Five of them depend on a
CC-DC-CR-072-family primary filing, and Edition 1.2 retains all four members of
that family as `source_gated` assets. The edition's own selection rule is
explicit: *"A source_gated, excluded, retired, superseded or unmanifested asset
is never resolver-selectable."*

Nothing remains to substitute. Maryland's whole Edition 1.2 footprint is eleven
assets, four of them `packet_form`, and only CC-DC-CR-148 commences a relief
proceeding — MDJ-008 is a companion notice, CC-DC-CR-078 is the General Waiver
and Release that attaches to CC-DC-CR-072C, and CC-DC-089 is a Request for
Waiver of Prepaid Costs. The count was not padded to reach a target: no
process-guidance route was converted, no closed-window route was reopened, and
no source-gated asset was reclassified.

**What would unblock the rest:** re-acquire CC-DC-CR-072A/B/C/D from the
Maryland Judiciary, confirm each printed revision with the publisher, and retain
them as `packet_form` assets in a future edition. That makes four further
Maryland routes selectable in one pass, and it is the highest-value source
acquisition in the Maryland backlog.

Five further Maryland nodes are `process_guidance` and were never candidates:
two automatic expungements, a completed DPSCS sweep, a closed-window legacy
police request, and pre-service nolle prosequi. In each the court or an agency
acts; there is no participant filing to generate.

## Source mappings closed

Both components already named exactly one Edition 1.2 document ID resolving to
exactly one retained packet-form asset. Only the SHA-256 was missing from the
track source relationship, which is what blocked them.

| Component | Asset | Revision | SHA-256 |
|---|---|---|---|
| `md_second_chance_shielding-primary-filing-1` | `MD:CC-DC-CR-148:PETITION:EN` | REV-2026-07 | `abcafbc2…b43e3f` |
| `md_second_chance_shielding-attachment-2` | `MD:MDJ-008:NOTICE:EN` | REV-2026-07 | `42510792…a6e369` |

Pinning is mechanical, not a new legal conclusion: no form identity, document
role or packet composition changed. The intake reads the pins back from
`tranche-2-authority-pins.json` so regeneration stays stable, and refuses a pin
whose form ID or source URL disagrees with the memo — a pin that disagrees about
which document this is would be a source substitution.

The track does **not** become authority-cleared, and that is correct. Edition 1.2
sets `generation_allowed = no` on all 443 retained assets. The remaining blocking
reason simply changes from a repository defect to the edition's release posture.

## Field ownership — the point of the tranche

113 fields across the two forms, each classified exactly once. Only
`participant` and `system_derived` fields carry a mapping; nothing else is
writable, because `acroMappingsFor` returns only registered mappings and there is
no mapping to write.

| Owner | Count |
|---|---|
| `participant` | 89 (56 mapped, 33 not applicable to this route) |
| `prohibited_from_generation` | 12 |
| `participant_manual` (blank signature lines) | 4 |
| `system_derived` | 3 |
| `court` | 3 |
| `agency` | 2 |

Both attorney blocks, both signature lines, both signature dates and MDJ-008's
Date of Court Order come out of the renderer blank. A blank signature line is the
output, not a gap — the packet's instructions name each one.

`system_derived` is used only where the value follows from what the packet is: on
MDJ-008 the two restricted-information boxes and the title of the submission,
because the confidential document this notice accompanies is always the shielding
petition.

## Renderer

`OfficialPdfRenderer → AcroFormFillStrategy` for both forms. Both sources are
clean single-page AcroForms — no XFA, no encryption, no read-only fields, one
widget per field — so no overlay is needed and none is used.

Three renderer changes were needed and benefit every future official-form state:

- **Determinism.** pdf-lib stamps the wall clock into a loaded document on save.
  Two renders of identical facts that straddled a second produced different
  bytes, which would make every recorded packet hash unverifiable. Loading with
  `updateMetadata: false` and stamping a fixed timestamp fixes it.
- **The form's own typeface.** `updateFieldAppearances()` writes everything in
  Helvetica whatever the form asked for. Maryland's fields declare `/TiRo` —
  Times-Roman — and Helvetica is wider, so values the court's blank was sized to
  hold overran it and clipped silently. The renderer now resolves and reproduces
  the declared face.
- **Measured overflow.** A value's width is measured in the form's own font at
  the size the field declares, against the widget's own width. A character count
  cannot answer this: `1B02SYN0041` and `CRSYNCRSYNC` are both eleven characters
  and the second is a third wider.

Case lists that outgrow a blank continue onto the form's own printed continuation
line, split on a case-number boundary. Where the form provides no continuation
line, generation **stops** — there is no truncation and no shrink-to-fit path.

## Deliverable

One assembled PDF per route: the completed petition, the companion notice the
petition's own text requires, then the LegalEase participant guide. Six pages.
No ZIP, for the participant or for review.

`GET /api/rcap/packets/{fulfillmentId}/packet` serves it. Authenticated, owner
only, a non-owner gets the same 404 as a missing packet, stored bytes only, and
it refuses rather than serving a partial packet.

The guide is not a filing and says so in its first sentence. It carries the
required-before-filing checklist, filing destination and method, fee
verification, who serves whom, the supporting-document checklist, the post-filing
timeline, and the stop-and-see-a-lawyer conditions.

## What the packet refuses to do

Generation stops, rather than producing a caveated packet, where the participant
reports a prior shielding petition, pending charges, a domestically related
conviction, an ineligible offence from the same incident, or eligible convictions
in more than one court or county. An unanswered scope question stops it too —
silence is not a "no".

## Source gates still open

- Edition 1.2 sets `generation_allowed = no` on every retained asset, including
  both forms here. Clearing that is an edition decision, not an implementation
  one.
- **The filing fee is unresolved.** The Judiciary shielding page and
  CC-DC-CR-148A indicate $0; neither was confirmed at build time, and
  CC-DC-CR-148A is not a held asset. **No dollar amount is printed anywhere in
  the packet** — the guide tells the participant to ask the clerk.
- The CC-DC-CR-072 family and DC-CR-071 remain source-gated. Untouched here.
- The retained Maryland legal review pins no SHA-256 for its three cited official
  sources, so staleness cannot be detected automatically.

## Known limitations

Recorded in `tranche-2-visual-review.json` and
`tranche-2-legal-output-recommendation.json` rather than repaired, because each
is either the court's own form design or a decision beyond this pass:

1. The City/County combo box on CC-DC-CR-148 is auto-sizing and 100.7pt wide, so
   the longest court names render at 6–8pt. Nothing is lost; the caption is small
   on the longest-named jurisdictions. Dropdowns are not width-measured.
2. A mapping may declare `overflow: "fail"`, but that is downgraded to a warning
   on auto-sizing fields, so the declaration is unreachable on both Court Address
   fields. No packet in this tranche is affected.
3. Assembly copies pages without the form dictionary, so the assembled
   deliverable carries no AcroForm. Safety-neutral, but it contradicts the
   recorded reason for leaving components unflattened.
4. Caption capacity is measured in points, so an all-capitals name holds about
   half as many characters. It fails loudly rather than clipping.
5. The draft banner appears on the first page of the guide only.

## Verification

```
npm run rcap:generate-tranche-2-review     # regenerates every review output
npm run rcap:verify-tranche-2-packets      # focused verification, in npm test
```

Review output goes to `tmp/packet-output-review/tranche-2/` and stays untracked:
four assembled packets, their components, and every page as a PNG. The tracked
`tranche-2-review-manifest.json` carries the hashes and page counts, and no wall
clock, so a rerun is not a diff.

`verify-rcap-tranche-2-packets.mjs` runs fourteen checks against the real
renderer, re-deriving everything from the source PDFs and the registry rather
than trusting the ownership map. It proves, among the rest, that every field the
map does not classify as writable comes out **blank on the produced bytes**, that
22 forged attorney, judge, clerk and prosecutor values injected past the fact
builder produce **byte-identical** documents, that all 9 boundary fixtures stop,
and that rendering the same facts twice produces the same bytes.

Tranche 1 remains green, the authority verifier passes, and both state-promotion
verifiers pass. The new download route is registered in
`docs/rcap-promotion/inherited-restricted-changes.json`, pinned to its content
hash, as the restricted-change guard requires.

## What this tranche does not do

No Maryland legal-design conclusion was altered. No Master Library edition was
created or amended. No source-gated asset was reclassified. No track was
promoted, no jurisdiction enabled, `packet_ready` remains 0 and the launch gate
stays red until reviewing counsel adopts the route in a separate recorded
decision.
