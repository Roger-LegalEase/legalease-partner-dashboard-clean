# WA:wa_crop_certificate_of_restoration — certificate of restoration of opportunity (RCW 9.97.020)

Job `T-C-WA-production-packet`, terminalization window `2026-08-12-w1`.
Disposition: **blocked_pleading** — official-form route, no pleading drafted.

## Authority

Pinned registry authority, verbatim from commit
`3b6f4c103d2f97249b45acc0ea3fb889ff8787e5`:

- RCW 9.97.010(1), 9.97.010(2)
- RCW 9.97.020(1), (1)(a), (2), (2)(a), (4), (6), (7), (8), (9), (11)
- RCW 9.94A.030(11), RCW 9.94A.030
- RCW 9.41.110

Read at source on 2026-08-06.

## Mechanism

A certificate of restoration of opportunity is a **court-issued instrument that
operates on the collateral consequences of a conviction rather than on the record
itself**. RCW 9.94A.030(11) treats issued certificates as part of the criminal
history a sentencing court sees, which confirms it is a recognised instrument —
and confirms it does not remove anything.

Its operative effect is at RCW 9.97.020(1): no state, county or municipal
department, board, officer or agency authorised to assess the qualifications of an
applicant for a licence, certificate of authority, qualification to engage in a
profession or business, or admission to a qualifying examination may disqualify a
qualified applicant **solely** on the basis of criminal history where the applicant
holds a certificate and meets all other statutory and regulatory requirements,
except as required by federal law or as exempted.

**The exemptions are extensive and must be encoded.** Criminal justice agencies as
defined in RCW 10.97.030 and the Washington State Bar Association are exempt
outright, and the section does not apply to the licensing, certification or
qualification of accountants, bail bond agents, escrow agents, nursing home
administrators, nursing, physicians and physician assistants, private
investigators, and the other categories the section lists.

Venue is a closed statutory set under RCW 9.97.010(2): the superior court where
the applicant resides, or the superior court of the county that sentenced or
adjudicated them. Where the sentencing court was a court of limited jurisdiction,
the qualified court is the superior court of that county — the district or
municipal court that convicted the applicant is never itself a qualified court.
RCW 9.97.020(8) provides that the superior court of the county of conviction may
not decline to consider the application.

## Route decision

**Drafting is barred: this is an official-form route, and the forms are not yet
acquirable.**

A **complete statewide form set has existed since 2016** under the RCW 9.97.020(11)
duty:

- **CRO 01.0100** — petition
- **CRO 01.0200** — notice
- **CRO 01.0300** — proof of service
- **CRO 01.0700** — order and certificate
- **CRO 01.0600** — the court's own dismissal order

plus instructions and a brochure. Drafting a custom petition, notice, proof of
service or order would replicate CRO 01.0100, 01.0200, 01.0300 and 01.0700
respectively.

Two build-level dependencies stand in the way, and they compound:

1. **Form status is unresolved.** Whether the AOC forms are mandatory forms a
   superior court must accept and a filer must use, pattern forms a filer may
   adapt, or optional, is not answered. This decides whether the route is
   `official_pdf_fill` on the state's own forms or a custom pleading *conforming
   to* them. The registry notes that the statutory word "sample" in
   RCW 9.97.020(11)(b) points toward pattern rather than mandatory, but that the
   Washington court rule governing the status of AOC forms **was not read**, and
   declines to guess. This packet declines likewise.
2. **The binaries do not exist in the source inventory.** The five CRO forms have
   not been acquired, pinned or measured, and no Washington source-materialization
   receipt exists for them. That is a separate build-level dependency owned by the
   source-acquisition lane.

Either alone would bar drafting. Together they mean that even the "conforming
pleading" answer cannot be executed, because there is nothing committed to
conform to.

### What is missing

1. The Washington court rule governing the status of Administrative Office of the
   Courts forms.
2. The five CRO binaries (CRO 01.0100, 01.0200, 01.0300, 01.0600, 01.0700),
   acquired, pinned and measured, with a Washington source-materialization
   receipt.

Routed to the source-acquisition lane first, then lane D/E overlay or
conforming-pleading build, then counsel review.

## Open counsel flags

- **This is not record relief.** A certificate operates on collateral consequences
  only. It does not vacate, seal or expunge anything, and an issued certificate
  becomes part of the criminal history a sentencing court sees. A participant
  seeking record relief needs a different route entirely, and screening must not
  present this as one.
- **The exemption list decides whether the certificate is worth anything.** It must
  be encoded before this track screens anyone: a certificate does nothing for an
  applicant whose target occupation is exempted (accountants, bail bond agents,
  escrow agents, nursing home administrators, nursing, physicians and physician
  assistants, private investigators, and others), and criminal justice agencies
  and the Washington State Bar Association are exempt outright.
- **Venue is closed and statutory** — see the mechanism above. The convicting
  district or municipal court is never a qualified court.
- **Verification — source silent**, and in any event a feature of the CRO form set.
- **Filing fee — source silent.** No amount is stated.
- **Local requirements — source silent.** Which counties impose additional local
  requirements under the Washington Courts local-rule warning was not established.
- **Firearm rights.** RCW 9.41.110 is carried in the authority list; a certificate
  does not restore firearm rights.
