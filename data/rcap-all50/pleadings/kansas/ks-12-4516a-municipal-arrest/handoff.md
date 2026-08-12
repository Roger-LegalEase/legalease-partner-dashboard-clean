# KS:ks-12-4516a-municipal-arrest — city ordinance arrest-record expungement (K.S.A. 12-4516a)

Job `T-C-KS-production-packet`, terminalization window `2026-08-12-w1`.
Disposition: **drafted** (controlled custom pleading).

## Authority

Pinned registry authority, verbatim from commit
`3b6f4c103d2f97249b45acc0ea3fb889ff8787e5`:

- K.S.A. 12-4516a(a) through (h)
- K.S.A. 21-6107
- K.S.A. 12-16,134

Subsections (e), (g) and (h) appear in the authority list with no content
described in the committed mechanism; nothing is asserted for them.

## Mechanism

Any person who has been arrested on a violation of a city ordinance may petition
the court to expunge the arrest record. When the petition is filed the court sets
a hearing date and causes notice to be given to the prosecuting attorney and the
arresting law enforcement agency. The official court file is separated from other
court records and disclosed only to a judge, designated court staff, the
prosecuting attorney, the arresting agency, or others by court order.

At the hearing the court **shall** order the arrest record and subsequent court
proceedings expunged on finding any of: mistaken identity; that a court found no
probable cause for the arrest; that the petitioner was found not guilty; that the
arrest was for a violation of an ordinance prohibited by K.S.A. 12-16,134(a) or
(b) adopted before 1 July 2014; or that expungement would be in the best
interests of justice and charges have been dismissed or no charges have been or
are likely to be filed.

**No waiting period.** K.S.A. 12-4516a states none.

A municipal court **may** prescribe a fee as costs, except that no fee may be
charged to a person arrested as a result of being a victim of identity theft.

## Route decision

Drafted as a custom pleading, on the same basis as the companion conviction
track: Kansas has no unified municipal forms regime, so there is no mandatory
statewide form to replicate, and the statutory mechanism was read at source.

Proposed order included; no certificate of service, because notice is the court's
act under (b). The city is left as a confirm-with-the-court value in the caption
and court name for the same reason as the companion track — see that handoff for
the runtime-wiring note.

## Open counsel flags

- **Registry release blocker (open):** municipal forms and charter-ordinance
  variation, as on the companion track. Wichita proceeds under Charter Ordinance
  No. 224 with its own Motion and Order.
- **The grounds are the court's to find.** The pleading identifies which ground is
  relied on and asks the court to find it; it never states that it has been found.
- **"Likely to be filed" is never asserted.** The best-interests-of-justice ground
  turns partly on whether charges are likely to be filed — a judgment about the
  prosecutor's future conduct. Any pending or possible charge should trigger
  attorney review.
- **Fee mechanism established, amount silent.** K.S.A. 12-4516a(f) establishes
  that a court may prescribe a fee as costs, but no amount is established. The
  mechanism is recorded; the amount is left unstated rather than estimated. The
  identity-theft-victim exemption is surfaced to the participant.
- **Verification — source silent.** No verification or notarization requirement or
  statute is identified.
- **Expungement here is separation, not destruction.** The official court file is
  kept separate and remains visible to a judge, designated court staff, the
  prosecuting attorney, the arresting agency, and anyone else the court allows.
  The participant guide says so plainly.
- Wrong-track risks: a municipal conviction or fulfilled diversion runs under
  K.S.A. 12-4516; an arrest on a state law violation runs under K.S.A. 22-2410 in
  the district court.

## Anti-invention proof

`fixtures/negative.json` converts the statutory grounds into findings already
made, asserts a prosecutor's non-objection and an arresting agency's consent,
states a costs amount the source does not establish, asserts served notice when
notice is the court's act, and populates protected fields. It declares
`qaPassed: true` because `runPleadingQa` genuinely passes it; the scanner rejects
it.
