# KS:ks-12-4516-municipal — municipal conviction/diversion expungement (K.S.A. 12-4516)

Job `T-C-KS-production-packet`, terminalization window `2026-08-12-w1`.
Disposition: **drafted** (controlled custom pleading).

## Authority

Pinned registry authority, verbatim from commit
`3b6f4c103d2f97249b45acc0ea3fb889ff8787e5`:

- K.S.A. 12-4516(a) through (i)
- K.S.A. 12-16,134

Subsection attribution is disciplined: the registry attributes the commercial-DUI
exclusion to (f) and the felony-within-two-years exclusion to (h)(1), and does
**not** number the hearing, notice and findings provision. Those numbers are used
only where the registry supplies them; the findings provision is cited to
K.S.A. 12-4516 generally rather than guessed at a subsection. Subsections (g) and
(i) appear in the authority list with no content described — nothing is asserted
for them.

## Mechanism

A person convicted of a violation of a city ordinance may petition the convicting
municipal court to expunge the conviction and related arrest records; a person
who has fulfilled the terms of a diversion agreement based on a city ordinance
violation may likewise petition. The court sets a hearing and causes notice to be
given to the prosecuting attorney and the arresting law enforcement agency, and
**shall** order expungement on three findings: no felony conviction in the past
two years with no such proceeding pending or being instituted; that the
petitioner's circumstances and behaviour warrant expungement; and that
expungement is consistent with the public welfare.

There is **no firearms finding**, because a municipal ordinance conviction is not
a felony.

Waiting periods are offence-dependent: three years under (a)(1)/(a)(2); none
under (b) for a pre-1 July 2014 ordinance; one year under (c) for a
prostitution-equivalent violation with proved coercion; five years under (d);
five years under (e)(1) for a first DUI-equivalent and ten under (e)(2) for a
second or subsequent one.

## Route decision

Drafted as a custom pleading. The registry states the position directly: "Kansas
has hundreds of municipal courts and no unified municipal forms regime, so the
instrument is court-specific even though the mechanism is statewide." There is no
mandatory statewide form to replicate, and the statutory mechanism was read at
source, so nothing structural has to be invented.

Proposed order included; no certificate of service, because notice is the court's
act. `notice_affidavit` and `certificate_of_service` are **absent by design**, not
blocked — the source prescribes no such participant document.

### The city is never guessed

The city appears as a confirm-with-the-court bracket value in both the caption and
the court name. This is deliberate. Kansas municipal courts are **city** courts,
and the renderer's only geographic input is `caseData.countyName`. Wiring a county
name into a city-court caption would name a court that does not exist — so the
field is left unwired and the value is confirmed by the participant instead.
Recorded in `sourceSilences` and flagged for runtime wiring.

## Open counsel flags

- **Registry release blocker (open):** which Kansas municipal courts publish their
  own current expungement forms or require their own process, and which govern
  expungement by charter ordinance rather than by K.S.A. 12-4516 directly. The
  bounded sample confirmed Wichita proceeds under Charter Ordinance No. 224 and
  publishes its own Motion and Order. Where a city proceeds by charter ordinance,
  this petition may be the wrong instrument entirely.
- **Findings are the court's.** The three statutory findings are framed as relief
  requested, never as facts found.
- **Notice is the court's act.** The participant serves no one and no prosecuting
  attorney position is asserted.
- **Verification — source silent.** No verification or notarization requirement or
  statute is identified.
- **Filing fee — source silent.** Unlike K.S.A. 12-4516a, this section as
  described prescribes no fee mechanism at all. No amount is stated.
- **Waiting-period selection is an attorney question** where the offence
  classification is uncertain.
- Wrong-track risks: district court matters run under K.S.A. 21-6614; an arrest
  with no municipal conviction and no diversion runs under K.S.A. 12-4516a.

## Anti-invention proof

`fixtures/negative.json` converts the three statutory findings into findings
already made, asserts a prosecutor's non-objection, states a filing fee the source
does not establish, asserts served notice when notice is the court's act, and
populates protected fields. It declares `qaPassed: true` because
`runPleadingQa` genuinely passes it. The verifier's invention/protected-field
scanner rejects it, and asserts the scanner stays silent on every production
fixture.
