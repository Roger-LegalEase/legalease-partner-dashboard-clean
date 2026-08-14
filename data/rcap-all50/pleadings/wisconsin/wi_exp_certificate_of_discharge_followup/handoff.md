# WI:wi_exp_certificate_of_discharge_followup — request that the authority issue and forward the certificate of discharge (Wis. Stat. § 973.015(1m)(b))

Job `T-C-WI-production-packet`, terminalization window `2026-08-12-w1`.
Disposition: **blocked_pleading** — wrong instrument class, no pleading drafted.

## Authority

Pinned registry authority, verbatim from commit
`3b6f4c103d2f97249b45acc0ea3fb889ff8787e5`:

- Wis. Stat. § 973.015(1m)
- Wis. Stat. § 973.015(1m)(b)

## Mechanism

Section 973.015(1m)(b) makes issuance **mandatory rather than discretionary**:
upon successful completion of the sentence the detaining or probationary authority
**shall** issue a certificate of discharge, which shall be forwarded to the court
of record and which shall have the effect of expunging the record. The triggering
event is successful completion — no subsequent conviction and, where the person
was on probation, no revocation and satisfied conditions.

Where that mandatory certificate was not issued, or was issued but never forwarded
to the clerk, the participant may write to the supervising or detaining authority
asking that it be issued and forwarded.

No statute or rule prescribes the contents of that request, and Wisconsin
publishes no official participant form for it, so the correspondence is drafted.
The letter supports implementation of an expungement the court already ordered; it
does not itself change legal status, and the certificate remains the authority's
document.

## Route decision

**Drafting is barred — but not on the merits, and not for want of evidence.**

The source is unusually clear here. It states that no form exists, that no
prescribed contents exist, and that the correspondence is to be drafted. There is
nothing missing about the law.

What is wrong is the **instrument class**. The registry states it plainly: *"Not a
court filing. The request is addressed to the supervising or detaining authority
for the participant's own case."* The addressee is the Department of Corrections
in most probation cases, or the detaining authority where the sentence included
confinement. The certificate's destination is the clerk of circuit court.

Lane C3 owns exactly one instrument: the controlled custom-pleading renderer. That
renderer emits a court caption, jurisdiction and venue allegations, a prayer for
relief addressed to a court, a verification, and a proposed order carrying a
judge's signature block. **None of those exist on this route.** Rendering them
would fabricate a court proceeding against an executive authority that
§ 973.015(1m)(b) does not create, and would dress a follow-up letter as a filing —
which risks a participant believing they have commenced something they have not.

This is the same structural contradiction recorded for `NV:nv_repository_removal`,
and it is recorded rather than resolved by drafting.

### Recommended reclassification

The ledger classifies this track's `outputStrategy` as `custom_pleading`. On the
committed evidence that is wrong: it is participant correspondence. The track
should be reclassified and routed to the guidance-packet /
participant-correspondence lane, which owns non-pleading participant documents.
The letter itself is straightforward to produce **there**.

## Open counsel flags

- **The letter changes nothing by itself.** It supports implementation of an
  expungement the court already ordered. Issuance remains the authority's act and
  the certificate remains the authority's document. A participant must not be told
  that sending the letter expunges anything.
- **It is a follow-up, not a first step.** Allow the authority and the clerk a
  reasonable interval to complete issuance and forwarding, and confirm with the
  clerk of circuit court that the certificate has not already arrived, before
  writing.
- **Registry release blocker (open):** what recourse a participant has where the
  authority does not respond, or declines to issue the certificate, is unresolved.
  Any correspondence must not promise an outcome or imply that a remedy follows
  automatically from non-response.
- **The addressee is never guessed.** It depends on whether the participant was
  supervised on probation or detained.
- **Verification — not applicable.** Not a court filing; no verification statute
  applies, and no contents are prescribed.
