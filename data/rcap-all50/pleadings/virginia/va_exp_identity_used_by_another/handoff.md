# VA:va_exp_identity_used_by_another — expungement where another used the petitioner's identity (Va. Code § 19.2-392.2(B))

Job `T-C-VA-production-packet`, terminalization window `2026-08-12-w1`.
Disposition: **blocked_pleading** — unresolved official-form question, no pleading drafted.

## Authority

Pinned registry authority, verbatim from commit
`3b6f4c103d2f97249b45acc0ea3fb889ff8787e5`:

- Va. Code § 19.2-392.2(B), (C), (D), (E), (F), (H), (L)

Read at source on 2026-08-06. Only the subsections whose content the committed
mechanism actually describes — (B), (E) and (H) — are cited in the config;
(C), (D), (F) and (L) are carried in the authority list without content asserted.

## Mechanism

**Subsection (B).** If any person whose name or other identification has been used
without his consent or authorisation by another person who has been charged or
arrested using such name or identification, he may file a petition with the court
disposing of the charge for relief under the section, **without paying any court
fees or costs**. The petition shall include one complete set of the petitioner's
fingerprints obtained from a law-enforcement agency. No waiting period applies.

**Subsection (E)** prescribes the proof route the controlling review could not
verify: the petitioner obtains the fingerprint set from a law-enforcement agency
and gives that agency a copy of the petition; the agency submits the fingerprints
to the Central Criminal Records Exchange with the petition attached; the CCRE
forwards the criminal history and the fingerprint set to the court under seal. On
completion of the hearing the court returns the fingerprint card, and where no
hearing was held the card is destroyed unless the petitioner asks for it back
within thirty days or supplies a stamped self-addressed envelope.

**Subsection (H)** supplies a distinct and **faster** route where the charge is
dismissed because the court finds the person arrested or charged is not the person
named in the summons, warrant, indictment or presentment: the dismissing court, on
motion of the person improperly charged, enters the expungement order.

## Route decision

**Drafting is barred on an unresolved official-form question.**

Virginia circuit-court expungement runs on Supreme Court of Virginia forms, and
one such form demonstrably exists for the adjacent subsection:

- **CC-1473** was retrieved and hashed at the official library on 2026-08-06. It
  is **captioned to § 19.2-392.2(A) alone.** The controlling review assigned
  CC-1473 to this route, and the form's own caption does not support that
  assignment.
- Retrieval of **any other** circuit-court expungement form at that library was
  attempted on the same date and returned **HTTP 404**.

That combination is what blocks. The 404s establish that the library was not fully
readable on the retrieval date — not that no subsection (B) form exists. So
drafting a custom petition would either replicate an official form that exists but
was not retrievable, or invent an instrument for a route Virginia may already have
formalised. Neither is acceptable.

Whether the subsection (H) misidentification motion has its own instrument is
unresolved along with it.

### What is missing

Confirmation of whether the Supreme Court of Virginia publishes a form for a
§ 19.2-392.2(B) identity-use petition, and whether the § 19.2-392.2(H)
misidentification motion has its own instrument. No form covering subsection (B)
is committed anywhere.

Routed to lane D/E for a Supreme Court of Virginia form-library re-crawl, then
counsel review.

## Open counsel flags

- **Screen for the subsection (H) route first.** Where the charge was dismissed
  because the court found the person charged was not the person named, (H) is
  faster and the dismissing court enters the order on motion. Screening must not
  push a participant onto the (B) petition where (H) fits.
- **Fee is exempted, not amounted.** § 19.2-392.2(B) provides the petition is
  filed without paying any court fees or costs. That exemption is recorded; no
  amount is stated.
- **Fingerprints and CCRE involve third parties.** The petitioner obtains the
  fingerprint set, gives the agency a copy of the petition, the agency submits to
  the CCRE, and the CCRE forwards to the court under seal. LegalEase never asserts
  that any of those steps has been performed.
- **Fingerprint card handling must be disclosed.** Where no hearing is held the
  card is destroyed unless the petitioner asks for it back within thirty days or
  supplies a stamped self-addressed envelope.
- **Verification — source silent**, and in any event a feature of whatever form
  governs.
- **Registry release blocker (open):** Chapter 23.2 and § 19.2-392.2 both carry
  future versions the controlling review predates and does not record. Subsection
  lettering relied on here may shift between versions, so any instrument must be
  rebuilt against the version in force at build time.
