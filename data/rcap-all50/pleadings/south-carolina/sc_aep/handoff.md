# SC:sc_aep — Alcohol Education Program record destruction (S.C. Code § 17-22-530)

Job `T-C-SC-production-packet`, terminalization window `2026-08-12-w1`.
Disposition: **blocked_pleading** — official-form route, no pleading drafted.

## Authority

Pinned registry authority, verbatim from commit
`3b6f4c103d2f97249b45acc0ea3fb889ff8787e5`:

- S.C. Code § 17-22-510
- S.C. Code § 17-22-520
- S.C. Code § 17-22-530(A)
- S.C. Code § 17-22-530(B)
- S.C. Code § 17-22-550
- S.C. Code § 17-22-940(D)
- S.C. Code § 17-22-940(E)

Section 17-22-550 is carried in the authority list but **its text was not read at
source**, so no content is asserted for it.

## Mechanism

Article 5 of Chapter 22, Title 17 is the Alcohol Education Program.
§ 17-22-510 gives each circuit solicitor prosecutorial discretion to establish
the programme, under the solicitor's direct supervision and control.
§ 17-22-520 confines eligibility to a person at least seventeen but under
twenty-one at the time of arrest, with no prior alcohol-related offence and no
significant history of prior delinquency or criminal activity, charged with one
of eleven enumerated offences or another offence similar in nature and severity
as determined by the circuit solicitor. DUI offences under §§ 56-5-2930 and
56-5-2933 are expressly excluded. Participation is once only.

Under § 17-22-530(A) the circuit solicitor **shall** effect a noncriminal
disposition on successful completion, and no record may be maintained except by
the Commission on Prosecution Coordination to prevent a second use. Under
§ 17-22-530(B) the person may then apply to the court for an order to destroy
all official records relating to the arrest.

§ 17-22-940(D) names the alcohol education program director as an attestor, and
§ 17-22-940(E)(1) exempts § 17-22-530(A) from the SLED verification fee.

## Route decision

**Drafting is barred: this is an official-form route.**

The committed South Carolina evidence is explicit — South Carolina expungements
start with either the Solicitor's Office or the summary court and **use the
official SCCA 223-series forms**. The instrument is a published South Carolina
Judicial Branch form, not a drafted pleading:

- **SCCA 223A1** — Application for Expungement (with SCCA 223A1(a) continuation)
- **SCCA 223B1** — Order for Expungement
- **SCCA 223E** — Summary Court Application, not fingerprinted

Drafting a custom application or order for this track would produce a **replica
of a mandatory official form**, which is prohibited outright. Official-PDF
overlay work belongs to lane D/E.

Note that the registry's own packet set for this track lists
`official_form_reference` as a **required** component with output strategy
`process_guidance` — the design already contemplates pointing at the official
form rather than reproducing it. What it also lists as `custom_pleading` (the
primary filing and the attestation request) cannot be produced by the controlled
custom-pleading renderer, which emits a court caption, jurisdiction and venue
allegations, a prayer for relief and a proposed order. Emitting those would both
replicate SCCA 223A1/223B1 and name a court the source does not name.

### What is missing

A verified field map / overlay for SCCA 223A1 (and SCCA 223B1, SCCA 223E). The
committed form catalog records that the supporting field-map detail lives in the
`south-carolina-scca223a1` field-map draft, which is marked
`visual_review_required` and **hard-blocked**, that no field map is wired, and
that no renderer is wired.

The blank PDFs themselves are present in the sprint source inventory at
`private/Nationwide Record Clearing/` (LegalEase South Carolina): `SCCA223A1.pdf`,
`SCCA223A1(a).pdf`, `SCCA223B1.pdf`, `SCCA223D1.pdf`, `SCCA223E.pdf`.

Routed to lane D/E official-PDF overlay, then counsel review.

## Open counsel flags

- **Court level not settled.** § 17-22-530(B) refers to "the court" without
  naming a level, and the source does not settle whether the application runs
  through general sessions or summary court. No court is named.
- **Verification — source silent.** No verification or notarization statute is
  identified; verification is a feature of the official form.
- **Waiting period — none** beyond successful completion and the solicitor's
  noncriminal disposition.
- **Solicitor discretion is not predictable.** Whether an offence is "similar in
  nature and severity" to the eleven enumerated offences is reserved to the
  circuit solicitor. LegalEase must never make or predict that determination.
- **Attestation is obtained, never asserted.** § 17-22-940(D) names the programme
  director as attestor; LegalEase never attests completion or states that it
  occurred.
- Fees at source: $250 programme fee plus possible provider fees; inability to
  pay cannot bar participation, and the solicitor may waive or reduce. SLED
  verification fee not charged for this route.
- **Registry release blocker (open):** the single-incident fee treatment under
  § 17-22-940(G) as amended by 2018 Act No. 254.
