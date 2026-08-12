# SC:sc_conditional_discharge_44_53_450 — first-offence drug conditional discharge expungement (S.C. Code § 44-53-450)

Job `T-C-SC-production-packet`, terminalization window `2026-08-12-w1`.
Disposition: **blocked_pleading** — official-form route, no pleading drafted.

## Authority

Pinned registry authority, verbatim from commit
`3b6f4c103d2f97249b45acc0ea3fb889ff8787e5`:

- S.C. Code § 44-53-450(A)
- S.C. Code § 44-53-450(B)
- S.C. Code § 44-53-450(C)
- S.C. Code § 44-53-370(c)
- S.C. Code § 44-53-370(d)
- S.C. Code § 44-53-375(A)
- S.C. Code § 17-22-940(D)
- S.C. Code § 17-22-940(E)

This track's statute was **read at source on 2026-08-06**, unlike several others
in this partition. The block here is not an evidence gap in the statute.

## Mechanism

§ 44-53-450(A) allows a person not previously convicted of any offence under
Article 3 of Chapter 53, Title 44, or under any state or federal marijuana,
stimulant, depressant or hallucinogenic drug statute, who pleads guilty to or is
found guilty of possession of a controlled substance under § 44-53-370(c) or (d)
or § 44-53-375(A), to be placed on probation **without entry of a judgment of
guilt**. On fulfilment of the terms the court discharges the person and dismisses
the proceedings. The discharge is not a conviction for purposes of any
disqualification or disability. A nonpublic record is retained by the Department
of Narcotic and Dangerous Drugs under SLED **solely** to determine whether a
later offence is a subsequent one. The discharge and dismissal may occur only
once with respect to any person.

§ 44-53-450(B) is the expungement: on dismissal and discharge the person may
apply to the court for an order expunging from all official records — other than
the retained nonpublic record — all recordation relating to the arrest,
indictment or information, trial, finding of guilt, and the dismissal and
discharge. **If the court determines after hearing** that the person was
dismissed and discharged, it shall enter the order, restoring the person in the
contemplation of law to the status occupied before arrest.

§ 44-53-450(C) requires payment before discharge of a fee of $350 in general
sessions court or $150 in summary court, waivable, reducible or suspendable only
for indigency.

§ 17-22-940(D) requires the summary court judge to attest where the matter was in
summary court; § 17-22-940(E) exempts the route from SLED verification and its
fee.

## Route decision

**Drafting is barred: this is an official-form route.**

The committed South Carolina evidence states that South Carolina expungements
start with either the Solicitor's Office or the summary court and **use the
official SCCA 223-series forms**. The instrument is a published South Carolina
Judicial Branch form:

- **SCCA 223A1** — Application for Expungement (with SCCA 223A1(a) continuation)
- **SCCA 223B1** — Order for Expungement
- **SCCA 223E** — Summary Court Application, not fingerprinted

Drafting a custom application or order would produce a **replica of a mandatory
official form**, which is prohibited outright. Official-PDF overlay work belongs
to lane D/E.

A second, narrower reason not to draft a court petition here: the court level
varies. The conditional discharge may be entered in general sessions **or**
summary court, and the fee and the attestor differ accordingly. A drafted caption
would have to name one.

### What is missing

A verified field map / overlay for SCCA 223A1 (and SCCA 223B1, SCCA 223E). The
committed form catalog records that the field-map detail lives in the
`south-carolina-scca223a1` draft, marked `visual_review_required` and
**hard-blocked**, with no field map and no renderer wired.

Blank PDFs are present in the sprint source inventory at
`private/Nationwide Record Clearing/` (LegalEase South Carolina): `SCCA223A1.pdf`,
`SCCA223A1(a).pdf`, `SCCA223B1.pdf`, `SCCA223D1.pdf`, `SCCA223E.pdf`.

Routed to lane D/E official-PDF overlay, then counsel review.

## Open counsel flags

- **Court level varies.** General sessions or summary court, with different fee
  and different attestor. Determine the court level and disposition first; no
  court is named by LegalEase.
- **Verification — source silent.** No verification or notarization statute is
  identified; verification is a feature of the official form.
- **Fee is source-established, not silent.** $350 general sessions / $150 summary
  court, payable **before discharge**, waivable, reducible or suspendable only
  for indigency. This may be stated to a participant — unlike the routes in this
  partition where the source is silent and no amount may be given.
- **No post-discharge waiting period.** Unlike several other states'
  conditional-discharge routes, § 44-53-450(B) imposes none.
- **One-time route.** The discharge and dismissal may occur only once, and a
  person previously convicted of a qualifying drug offence is excluded.
- **The retained nonpublic record survives the expungement.** SLED keeps it
  solely to determine whether a later offence is a subsequent one. A participant
  must be told this.
- **Adjudication of guilt defeats the route.** Where the terms were violated and
  the court entered an adjudication of guilt, the route is unavailable.
- **Hearing outcome is never asserted.** § 44-53-450(B) requires the court to
  determine after a hearing that the person was dismissed and discharged.
  LegalEase never asserts that a hearing occurred or predicts its outcome.
- **Registry release blocker (open):** the single-incident fee treatment under
  § 17-22-940(G) as amended by 2018 Act No. 254.
