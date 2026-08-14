# Arkansas — exact supported deferrals (lane B, partition B2)

Owner: Terminal B (guidance, exclusions and exact deferrals)
Authority source: `AR.memo.json` (Master Library legal design memo, pinned registry `3b6f4c10`)
Packet file: `data/rcap-all50/guidance-packets/ar.json`

## `ar-misdemeanor-dwi-seal`

Job: `T-B-AR-exact-supported-deferral`
Route: Petition to Seal a Misdemeanor DWI or BWI Conviction, A.C.A. § 16-90-1405
Treatment: `exact_supported_deferral`

### The exact supported reason

The memo carries the reason verbatim, and it is a live legal conflict rather than a
missing artifact:

> **AR-2:** the DWI/BWI waiting-period conflict between the 2026 appellate reading,
> statutory text, and existing forms/practice is dispositive and prevents reliable
> routing.

Mechanically: A.C.A. § 16-90-1405(b)(2) refers out to the lookback periods in
A.C.A. § 5-65-111. Two readings of that lookback are live at the same time — the
2026 *Coleman* appellate reading on one side, and the statutory text together with
the existing ACIC forms and current practice on the other. The memo classifies this
as `legalDesignDecision.limitations[classification: legal_design_blocker]` with
`undeterminedElement: waiting_period`, and as an `unresolvedQuestion` with
`impact: build_blocker`.

Because the waiting period is what determines whether the participant may petition
at all and from what date, selecting either reading would amount to deciding the
participant's eligibility on a question Arkansas has not decided. The memo's
`packet_instruction` limitation states the required treatment directly: explain both
readings in plain English, tell the participant what the ACIC DWI form asks, and
**do not select an eligibility date**.

Two further supported facts reinforce the deferral rather than create it:

- `unresolvedQuestions[1]`: whether a petition for review or rehearing was filed in
  *Coleman*, and whether the Arkansas Supreme Court has acted, is unconfirmed.
- `unresolvedQuestions[2]`: the current ACIC Petition and Order to Seal Misdemeanor
  DWI/BWI has not been acquired, and the ACIC pair governs — the `scope_restriction`
  limitation forbids substituting a custom pleading where ACIC forms control.

The memo's own staging matches: `units[ar-misdemeanor-dwi-seal-stage-1]` is
process guidance and `available: true`; `units[ar-misdemeanor-dwi-seal-stage-2]`
(the ACIC petition and order fill) is `available: false` with
`unavailableReason: "The Coleman/statutory waiting-period conflict prevents reliable
routing and keeps this stage unavailable."`

### What the participant is told

The participant is given the full route in plain language and a real, usable set of
actions — not a placeholder:

- **What the mechanism is.** Arkansas seals a misdemeanor DWI or BWI conviction
  under § 5-65-103 on its own separate ACIC Petition and Order to Seal Misdemeanor
  DWI/BWI, controlled by A.C.A. § 16-90-1405, with § 16-90-1405(b)(2) sending the
  waiting period out to the lookback periods in § 5-65-111.
- **The exact destination.** The circuit or district court in the county where the
  offense was committed and the person was convicted, with the Arkansas Crime
  Information Center named for the criminal-history authorization and the published
  DWI/BWI form pair, and a law enforcement agency or authorised fingerprint vendor
  named for the fingerprint card.
- **What they can do now.** Fix the conviction (court, county, § 5-65-103), the
  conviction date, every prior DWI or BWI offence with its date, and whether the
  sentence including fines, costs and restitution is complete; submit the ACIC
  Authorization for Review of Criminal History Information and obtain their Arkansas
  criminal history; download and read the current ACIC DWI/BWI petition and order.
- **The exact reason nothing is being prepared for them.** Stated plainly: the
  waiting period is unsettled between the 2026 *Coleman* appellate reading and the
  statutory text with the existing ACIC forms and practice; whether the Arkansas
  Supreme Court has acted on *Coleman* is unconfirmed; filling in a date would mean
  choosing their eligibility on a question Arkansas has not yet decided. The
  participant is also told the current ACIC DWI/BWI pair has not been obtained and
  that no substitute pleading is used where ACIC forms control.
- **The timing that is settled.** Service on the prosecuting attorney within three
  days of filing, and the prosecuting attorney's 30-day objection window. No filing
  fee and no fee waiver are quoted, because the review states neither.
- **A precise handoff.** To an Arkansas attorney or legal-aid provider with a
  specific question — which lookback under § 5-65-111 applies to this conviction date
  and prior history, and has the Arkansas Supreme Court acted on *Coleman* — carried
  alongside the ACIC history and dates, plus immediate handoff on a prosecutor
  objection, a contested hearing, or immigration, licensing or firearm consequences.

No packet is sold, no payment is opened, and no eligibility date is stated to the
participant on this route.

## Not deferred in Arkansas lane B

`ar-preadjudication-probation` (job `T-B-AR-complete-guidance`) is treated as
`complete_guidance`, not a deferral. Its memo status is
`legal_design_approved_with_limitations` and the addendum expressly retains it as
guidance: prosecutor concurrence inside an active disposition is negotiation and is
not itself a participant packet. The participant receives the full guidance
treatment, including the statement that whether an independent participant-initiated
post-completion filing exists — and which ACIC form pair would apply to it — is not
identified, with no filing, form or deadline invented in its place.
