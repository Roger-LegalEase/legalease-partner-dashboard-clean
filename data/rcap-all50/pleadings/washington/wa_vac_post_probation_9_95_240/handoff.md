# WA:wa_vac_post_probation_9_95_240 — dismissal after probation / vacation of a pre-1984 conviction (RCW 9.95.240)

Job `T-C-WA-production-packet`, terminalization window `2026-08-12-w1`.
Disposition: **drafted** (controlled custom pleading).

## Authority

Pinned registry authority, verbatim from commit
`3b6f4c103d2f97249b45acc0ea3fb889ff8787e5`:

- RCW 9.95.240(1)
- RCW 9.95.240(2)(a)
- RCW 9.95.240(2)(b)
- RCW 9.94A.640(2)
- RCW 9.94A.030(11)(b)

Read at source on 2026-08-06.

## Mechanism

RCW 9.95.240 is one of only four routes RCW 9.94A.030(11)(b) recognises for
removing a conviction from criminal history, and it has **two distinct limbs**.

**Subsection (1).** Every defendant who fulfilled the conditions of probation for
the entire period, or who was discharged from probation before the period ended,
may — at any time before the maximum period of punishment for the offence expires
— be permitted **in the court's discretion** to withdraw a guilty plea and enter a
plea of not guilty, or, where convicted after a plea of not guilty, have the
verdict set aside. The court may then dismiss the information or indictment,
after which the person is released from all penalties and disabilities resulting
from the offence. The probationer is to be informed of this right in their
probation papers. A **proviso preserves the conviction** for pleading and proof in
any subsequent prosecution for any other offence, with the same effect as if
probation had not been granted.

**Subsection (2)(a).** After the period of probation has expired, the defendant
may apply to the sentencing court for vacation of the record of conviction under
RCW 9.94A.640, and the court may **in its discretion** clear the record if it
finds the defendant has met the equivalent of the RCW 9.94A.640(2) tests as those
tests would be applied to a person convicted of a crime committed **before 1 July
1984**. That fixes the scope the controlling review could not: this is the
pre-Sentencing Reform Act route.

**Subsection (2)(b)** carries the clerk transmittal to the Washington State Patrol
identification section and any local police agency, the immediate-update and FBI
transmittal duties, and the bar on dissemination except to criminal justice
enforcement agencies.

## Route decision

Drafted as a custom pleading, and the registry's own build blocker is what
authorises it. The blocker asked "whether a Washington Courts pattern form exists
for RCW 9.95.240", and answered itself: "None was identified by the controlling
review or located on this pass, and the section itself prescribes no form. The
pleading is therefore drafted on the RCW 9.94A.640 model, and the review's own
note that Part 3 should be revisited if this section turns out to have no pattern
form is answered in the affirmative."

So: no form to replicate, no form the pleading must conform to, and a statute read
at source. Nothing structural is invented.

Caption is sovereign-first in the existing criminal case, and the movant is styled
**Defendant** — which is what RCW 9.95.240 calls them — rather than Petitioner.
The county token is genuinely a county here, because the qualified court is the
superior court that imposed the sentence.

Proposed order included: RCW 9.95.240(2)(b) attaches the clerk transmittal and
agency-update duties to the order, so the order is the operative instrument.

### Certificate of service deliberately absent

RCW 9.95.240 as read at source prescribes **no service**, identifies no recipient,
and no pattern form supplies one. Rather than invent a service step or assert a
recipient, none is drafted and the packet carries a confirm-local-rules
instruction. Recorded as a source silence, not as an absent-by-design component of
a settled process — the distinction matters, because here the source is silent
rather than affirmatively assigning the step elsewhere.

## Open counsel flags

- **Pre-1984 scope is the gate.** An offence committed on or after 1 July 1984
  runs under RCW 9.94A.640 or RCW 9.96.060 directly. Screening must confirm the
  offence date.
- **Two limbs, opposite timing.** Subsection (1) has a deadline (before the
  maximum period of punishment expires) and no waiting period; subsection (2)(a)
  requires that the period of probation has already expired.
- **Relief is discretionary on both limbs.** Nothing in the pleading asserts that
  the court has exercised or will exercise its discretion.
- **The conviction survives for later prosecutions.** The subsection (1) proviso
  is surfaced to the participant in plain terms; this relief is not erasure.
- **Service — source silent.** See above.
- **Verification — source silent.** No requirement, no statute, no pattern form.
- **Filing fee — source silent.** The registry records that fees in district,
  municipal and superior court were not established at source and that the packet
  does not quote a fee. No amount is stated.
- **Local requirements — source silent.** The Washington Courts local-rule warning
  applies but the specific counties and requirements were not established. The
  packet carries a local-check instruction.
- **Registry release blocker (open):** local requirements and filing fees, as
  above.
- If a Washington pattern form for RCW 9.95.240 later surfaces, this instrument
  must be revisited.

## Anti-invention proof

`fixtures/negative.json` asserts the RCW 9.94A.640(2) tests as already found when
the finding is discretionary and the court's, asserts a prosecutor's
non-objection, states a filing fee the source expressly does not establish,
asserts completed service where the statute prescribes no service at all, and
populates protected fields. It declares `qaPassed: true` because `runPleadingQa`
genuinely passes it; the verifier's scanner is what rejects it.
