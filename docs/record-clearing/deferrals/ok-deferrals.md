# Oklahoma — exact supported deferrals (lane B, partition B3)

Owner: Terminal B (guidance, exclusions and exact deferrals)
Authority source: `OK.memo.json` (Master Library legal design memo, pinned registry `3b6f4c10`)
Packet file: `data/rcap-all50/guidance-packets/ok.json`

Oklahoma has one deferral. It sits on Senate Bill 2030 (2026), enacted as Laws 2026, c. 282
and effective 1 July 2026, which put clean slate eligibility in 22 O.S. § 18b and the process
in 22 O.S. § 19d.

## `ok_clean_slate`

Job: `T-B-OK-exact-supported-deferral`
Route: Clean Slate Sealing Without Petition, 22 O.S. §§ 18b and 19d
Treatment: `exact_supported_deferral`

### The exact supported reason

The memo's `legalDesignDecision.status` on this track is
`legal_design_approved_with_limitations`, and two of its limitations are classified
`legal_design_blocker`. Both bear directly on whether anything can be prepared for a
participant.

**1. Eligibility exists in statute but is conditioned on money that has not been traced.**
The memo's limitation reads: "Administration of the sealing-without-petition route is not
established. Section 18b(B) conditions eligibility on the availability of funds and no
appropriation determination has been made, so nothing may be built that depends on the
route reaching a participant's record." The statutory text is quoted in the memo's
provenance: "Beginning on the effective date of this act and subject to the availability of
funds, individuals with clean slate eligible records shall be eligible to have their
records sealed without filing a court petition." The corresponding `unresolvedQuestions`
entry carries `impact: release_blocker`, `affectedElement: governing_mechanism`, and states
the consequence in terms: "Until that is known, no participant may be told that the
sealing-without-petition route will reach their record."

**2. The administration does not exist yet, and its outside dates are years away.**
The second `legal_design_blocker` records that the § 19d(A) request portal "is not published
and its procedure is undetermined", against a statutory deadline of 1 November 2026 that had
not arrived at the memo's review date. The `unresolvedQuestions` entry answering the launch
question in the negative is dated: the Bureau's own criminal history record expungement page,
last updated 23 July 2026 and therefore after the Act took effect, describes no portal and
does not state that automatic sealing is operating. Under § 19d(D) the Bureau has until
1 November 2027 to begin implementing the automatic process and until 1 November 2029 to
identify and clear the electronic records eligible on or after the earlier date. No rules
under § 19d(E)(7) were located.

The memo's `selfHelpStopConditions` make the same point as real stops rather than caveats.
The first is "Any participant relying on this route rather than filing" — because statutory
eligibility is not an operating process — with the stated next step being the petition
routes, which § 19d(G) preserves. The second is "Any participant who wants a record
unavailable to law enforcement", because § 18b(D) seals only partially. The remaining two
are federal, tribal, military and out-of-state records — tribal records being a live
Oklahoma issue after McGirt — and immigration exposure.

One further limitation is honoured in wording rather than resolved: the memo records that
codified confirmation of §§ 18b, 19 and 19d is outstanding, that the § 19 subsection
re-lettering is derived from the enrolled amendatory text, and that the § 19(L) citation
"should be confirmed against the codified section before it is relied on in
participant-facing text." No subsection letter of § 19 is therefore stated to the
participant, and the ten-year obliteration rule is not asserted.

### What the participant is told

The participant gets the whole route in plain language, a usable set of actions and an
exact destination — not a placeholder and not a date to wait for.

- **What the mechanism is.** Senate Bill 2030 put eligibility in § 18b and the process in
  § 19d. Section 19d(E) has the Bureau identify eligible records monthly, notify the
  arresting and prosecuting agencies, and — where no agency objects within forty-five days —
  send the courts a list from which a signed expungement order issues, with § 19d(E)(6)
  allowing the court to set an objection for hearing. The scope is stated in both
  directions: the Act widened the eligible set rather than narrowing it — § 18b reaches
  records including court records, sets a floor of 1 January 1980, carries forward the
  § 18(A)(15) identity-theft category and adds two conviction categories — but the sealing
  is partial under § 18b(D) and (E).
- **The exact destination.** The Oklahoma State Bureau of Investigation, both for the
  participant's own criminal history record request and as the body that runs § 19d(E), with
  its criminal history record expungement page and its Clean Slate page named as where the
  status is checked; the district court enters the signed order; and the district court is
  also where the § 19 petition preserved by § 19d(G) is filed.
- **What they can do now.** Request the OSBI criminal history record and read it; test the
  record against the petition route under 22 O.S. § 19; decide whether partial sealing is
  enough or whether a § 18(A) petition category is needed for full sealing; record the scope
  facts — record type, date against the 1 January 1980 floor, single-source status, and for
  a conviction the end date of the last sentence and any pending charge; mark federal,
  tribal, military and out-of-state entries separately; raise immigration exposure first.
- **The exact reason nothing is being prepared.** Stated plainly and without hedging:
  § 18b(B) confers eligibility "subject to the availability of funds", the Act makes no
  appropriation determinable from its own text, and until that is known nobody can be told
  the route will reach their record; the process is not being administered, the Bureau has
  until 1 November 2027 to begin and until 1 November 2029 to finish the records eligible
  then, and the Bureau's own page — last updated 23 July 2026, after the Act took effect —
  describes no portal and does not say automatic sealing is running; and what the route
  gives even when it runs is partial sealing, with the record still available to law
  enforcement and still admissible to prove a prior conviction or a deferred judgment.
- **The timing that is settled.** Eligibility from 1 July 2026 under § 18b(B), subject to
  funds; the 1 November 2026 portal date under § 19d(A); the 1 November 2027 start and
  1 November 2029 completion dates under § 19d(D); and the forty-five-day agency objection
  window under § 19d(E)(3). The participant is told explicitly that none of those gives a
  date on which their own record would be reached, and none is invented.
- **A precise handoff.** First to the petition route in the district court under 22 O.S.
  § 19, which § 19d(G) expressly preserves and which is the only route usable today. Then,
  out of self-help entirely: a record that needs to be invisible to law enforcement, which
  is a § 18(A) petition question for an Oklahoma record-clearing attorney or legal aid
  office; federal, tribal, military and out-of-state records, which need tribal counsel or
  counsel in the convicting jurisdiction; and any immigration matter, which goes to an
  immigration attorney before any Oklahoma route is used. The participant is also told not
  to take anyone's word that their record has already cleared — the OSBI criminal history
  is what shows it.

No packet is sold, no payment is opened, no eligibility determination is made, and no date,
notification or turnaround for the § 19d process is selected for the participant.

## Not deferred in Oklahoma lane B

`ok_osbi_portal` (job `T-B-OK-complete-guidance`) is treated as `complete_guidance`, not a
deferral. Its status is fully determined on the enacted text: § 19d(A) requires the Bureau
to establish and maintain the expedited request portal by 1 November 2026, § 19d(B) states
what a request may require, § 19d(C) states the review sequence and the written or
electronic notice of rejection, and the statute sets no fee. The participant receives the
full guidance treatment built around the cost decision the memo identifies as the node's
whole value — $150 in OSBI processing fees for an arrest-record petition plus possible local
law enforcement fees, no fee for a court-record expungement, no statutory fee for a portal
request — together with the stated limits: no portal was published as of 7 August 2026, the
published procedure and turnaround are not identified anywhere and none is invented, and the
statute provides no remedy if 1 November 2026 passes, so waiting is presented as a decision
to revisit rather than a plan to leave running.
