# Texas — exact supported deferrals (lane B, partition B3)

Owner: Terminal B (guidance, exclusions and exact deferrals)
Authority source: `TX.memo.json` (Master Library legal design memo, pinned registry `3b6f4c10`)
Packet file: `data/rcap-all50/guidance-packets/tx.json`

Texas has two deferrals, both on the `T-B-TX-exact-supported-deferral` job. Neither rests on
a missing form — Texas publishes no expunction form at any level of state government, and the
memo settles that art. 55A.253 prescribes the contents of the pleading instead. Both rest on
`unresolvedQuestions` the memo marks `impact: release_blocker`, and in one case on a second
blocker that is about the participant's own identifying data rather than money.

The third Texas track in lane B, `tx_exp_discretionary` (job `T-B-TX-complete-guidance`), is
**not** a deferral. It is treated as `complete_guidance` and is described at the end of this
file so the distinction is on the record.

---

## `tx_exp_acquittal`

Job: `T-B-TX-exact-supported-deferral`
Route: Expunction after trial court acquittal, Tex. Code Crim. Proc. arts. 55A.002 and 55A.201,
with the ordinary ex parte petition under art. 55A.251 as the out-of-window fallback
Treatment: `exact_supported_deferral`

### The exact supported reason

The memo's `legalDesignDecision.status` on this track is
`legal_design_approved_with_limitations`, and both units are `available: true` — the design is
settled, the entitlement is not discretionary, and the pleading contents are prescribed. What
is not settled is what the participant would be told to pay. Both of the track's
`unresolvedQuestions` carry `impact: release_blocker` and `affectedElement:
participant_instructions`.

**1. The county filing figure is not established.** Read at source on 2026-08-06: art. 102.006
was repealed by S.B. 1667 effective 2025-09-01, temporarily re-added by H.B. 16 (89th Leg.,
2nd C.S.) with a built-in expiry, and permanently replaced by art. 102.0061 effective
2026-01-01. Article 102.0061(a) sets the district-court fee as the fee applicable to filing an
ex parte petition in a civil action in district court — the ordinary county civil filing fee,
which the memo states "varies by county and is not a flat statutory amount"; (b) sets a flat
$100 in justice or municipal court of record. The memo's own words: "That resolves which
provision governs but not the county figure." The same entry records that whether the $25
per-non-electronic-entity charge applies twice for the same agency — once under art. 55A.254(f)
and again under art. 55A.351(b-3) — "is supported by the text and unconfirmed in practice; it
changes the participant's total by a multiple of the agency count." The memo's `rules.fees`
adds the negative instruction directly: "The packet does not quote the old $250 to $500 range,
which is no longer reliable."

**2. Whether art. 55A.201 permits a fee at all on the in-window request is not stated.**
Article 55A.203(c) expressly forbids fees for specialty-court orders and art. 55A.201 carries no
equivalent prohibition. Article 102.0061(c) now requires waiver of the filing fee for a timely
acquittal petition, but the memo records that "Whether that reaches a non-petition request under
art. 55A.201 is not stated." This entry also carries `impact: release_blocker` and
`affectedElement: participant_instructions`.

The memo's `selfHelpStopConditions` are honoured as real stops rather than caveats: the
art. 55A.151 criminal-episode bar (also a `self_help_boundary` limitation), any multi-count
indictment with a mixed verdict, mixed outcomes across charges from one arrest under
*State v. T.S.N.* and *Ex parte R.P.G.P.*, state opposition or retention under art. 55A.302, a
felony from the same transaction, a contested limitations period or an unclear full-versus-partial
question, absconding history under art. 55A.154, an arrest on a community-supervision violation
warrant barred by art. 55A.153, unclear venue across two counties, and immigration consequences.
The `post_generation_handoff` limitation is honoured verbatim: on the in-window route the order
is prepared by the acquitted person's attorney if represented, otherwise by the attorney
representing the state, and nothing here generates it.

### What the participant is told

The participant gets the entire route in plain language, the 30-day clock, an exact destination
and a usable set of actions — and then the exact reason nothing is being prepared, stated
without hedging.

- **What the mechanism is.** Entitlement under art. 55A.002; the order shall be entered not
  later than the 30th day after acquittal under art. 55A.201, on request of the acquitted
  person after notice to the state or of the attorney representing the state with consent; the
  trial court must advise of the right to expunction; the requesting party supplies the full
  art. 55A.253 information set; the order is prepared by the participant's trial attorney if
  represented and otherwise by the attorney representing the state under art. 55A.201(d); and
  where the window closes, art. 55A.251 lists art. 55A.002 among the qualifying entitlements so
  the ordinary verified ex parte petition remains open. The art. 55A.151 criminal-episode bar
  is stated as an outright bar.
- **The exact destination.** The trial court that acquitted them while the 30-day window is
  open — that court where it is a district, justice or municipal court of record, or a district
  court in the county where it sits — and otherwise a district court for the county of arrest or
  of the alleged offense, filed through the district clerk, with art. 55A.252 available for a
  fine-only arrest. The district clerk's art. 55A.253(c) agency and e-mail list is named as the
  first call.
- **What they can do now.** Get the certified judgment of acquittal from the trial court clerk;
  write down the acquittal date and count to the 30th day; call the trial attorney, because that
  is who prepares the order in-window; answer the art. 55A.151 question; request the DPS
  criminal history via form CR-63 ($10 fingerprinting plus $15 record fee, or the hard-card mail
  route) for the TRN art. 55A.301 requires; ask the district clerk by name for the
  art. 55A.253(c) list and for the county's current ex parte civil filing fee.
- **The exact reason nothing is being prepared.** Both release blockers, in participant words:
  the county filing figure under art. 102.0061(a) is not a flat amount and is not established;
  the $25 paper-only agency charge under art. 55A.254(f) and again under art. 55A.351(b-3) may
  or may not apply twice, which multiplies by the agency count; and it is not stated whether
  art. 55A.201 permits a fee on the in-window request at all. The old $250-to-$500 range is
  named and explicitly disclaimed rather than repeated. The copy says plainly that the
  entitlement, the 30-day clock and the destination are settled and are theirs to act on today.
- **The timing that is settled.** The 30th day after acquittal under art. 55A.201; the same
  30th day as the art. 102.0061(c) fee-waiver date where art. 55A.151 does not apply; no waiting
  period on either route; and, on the petition route, a hearing set not earlier than the 30th day
  after filing, with the clerk serving and DPS notifying the central federal depositories.
- **A precise handoff.** The trial attorney first, because of art. 55A.201(d) and the short
  clock. Then, out of self-help: the art. 55A.151 criminal-episode analysis, mixed verdicts and
  mixed outcomes across charges from one arrest, state opposition or art. 55A.302 retention, a
  same-transaction felony, contested limitations, absconding history, an art. 42A.751(b)
  community-supervision warrant, and unclear venue — each named specifically, each to a Texas
  record-clearing attorney or legal aid office. Any immigration matter goes to an immigration
  attorney before any Texas route is used. Rule 145's Statement of Inability to Afford Payment
  of Court Costs is named as the cost route, with the Misc. Docket No. 22-9090 bilingual form.

No packet is sold, no payment is opened, no eligibility determination is made, and no filing
fee figure is selected for the participant.

---

## `tx_exp_dismissed`

Job: `T-B-TX-exact-supported-deferral`
Route: Expunction where the charge was dismissed or quashed, Tex. Code Crim. Proc.
arts. 55A.051 and 55A.053
Treatment: `exact_supported_deferral`

### The exact supported reason

The memo's `legalDesignDecision.status` is `legal_design_approved_with_limitations`. Three
`unresolvedQuestions`-level facts support the deferral; two are shared with the acquittal track
and one is specific to this one and is about the participant's identifying data.

**1 and 2. The same two cost blockers.** `unresolvedQuestions[0]` on this track is identical in
substance to the acquittal track's first: art. 102.0061 resolves which provision governs but not
the county figure, and the doubled $25 per-non-electronic-entity charge is "supported by the text
and unconfirmed in practice". `impact: release_blocker`, `affectedElement:
participant_instructions`.

**3. Sensitive data in a public filing.** `unresolvedQuestions[1]` carries `impact:
release_blocker` and `affectedElement: packet_components`: "How the largest counties handle
sensitive data in a public civil expunction filing, given that art. 55A.253 requires the social
security number and date of birth and the petition is public until the order issues. Harris,
Dallas, Bexar, Tarrant and Travis practice should be pulled." This is a participant-safety
blocker, not a cosmetic one — the memo classifies it as a packet-formatting question on a known
pleading, and the pleading cannot be handed over while it is open, because handing it over means
putting a social security number into a public civil filing on a formatting guess.

Two further constraints are honoured as permanent hard stops rather than as reasons for the
deferral, because they will not be resolved by later research. The `packet_instruction`
limitation reads: "The engine must not treat dismissed as sufficient. It must capture the
documented dismissal reason and must hard-stop where the reason is not one of the five statutory
grounds." And the `legalDesignDecision.rationale` states that LegalEase "does not generate a
statement that a dismissal was for want of probable cause where the order does not say so, and
does not treat a completed deferred adjudication as a dismissal; both are on the review's list of
conclusions LegalEase must not generate, and both are hard stops rather than warnings."

The memo's twelve `selfHelpStopConditions` are honoured as real stops, including the two that are
specific to this route: "The dismissal reason is not stated on the face of the dismissal order"
and "The participant completed deferred adjudication rather than receiving a dismissal", plus the
question whether a pretrial diversion was authorised under Government Code 76.011 rather than
being an informal county programme.

### What the participant is told

- **What the mechanism is.** Article 55A.053 in full: dismissal or quashal of a presented
  indictment or information, with expunction available only where the court finds one of five
  grounds — completed veterans treatment court under Government Code Chapter 124, completed
  mental health court under Chapter 125, completed pretrial intervention authorized under
  Government Code 76.011, presentment because of mistake, false information or another similar
  reason indicating absence of probable cause at the time of dismissal, or a void charging
  instrument. The copy states in terms that the word "dismissed" alone is not a ground. It states
  that relief is mandatory on the findings but that making the finding is a real evidentiary
  burden; that art. 55A.053(d) removes any limitations-period dependence; that the veterans and
  mental health grounds are once-only with an affidavit under art. 55A.053(b) and (c); and that
  art. 55A.051 threshold conditions and the art. 55A.153 probation-violation-warrant bar apply.
- **The exact destination.** A district court for the county of arrest or of the alleged offense,
  filed through the district clerk under art. 55A.251 — never the county of residence — with
  art. 55A.252 available for a fine-only arrest, a new civil action and a new cause number. The
  clerk of the court that dismissed the charge is named as where the dismissal order comes from,
  and the district clerk's published art. 55A.253(c) list is named as the first call.
- **What they can do now.** Get the dismissal order for every charge and read its exact wording;
  test it against the five grounds; check the once-only specialty-court history; settle the
  deferred adjudication question first; request the DPS criminal history via form CR-63 for the
  TRN; ask the district clerk for the art. 55A.253(c) list, for the county's current ex parte
  civil filing fee, and for how that county wants the social security number and date of birth
  handled; and write down the screening answers — same-incident felony, community supervision,
  probation-violation warrant arrest, absconding.
- **The exact reason nothing is being prepared.** All three blockers in participant words: the
  county filing figure is not established under art. 102.0061(a); the $25 paper-only charge may
  apply twice under art. 55A.254(f) and art. 55A.351(b-3), multiplying by the agency count; and
  how Harris, Dallas, Bexar, Tarrant and Travis handle the art. 55A.253 social security number
  and date of birth in a filing that stays public until the order issues has not been
  established, so no pleading carrying that data is handed over on a guess. The two permanent
  hard stops are stated separately and marked as not about readiness: a dismissal order that
  states no statutory ground supports none, and a completed deferred adjudication is not a
  dismissal for this route except for certain Class C matters.
- **The timing that is settled.** No waiting period under art. 55A.053 and no limitations
  dependence under art. 55A.053(d); a hearing set not earlier than the 30th day after filing;
  clerk service and DPS notification of the central federal depositories; and the art. 55A.302(c)
  retention trap, which the copy states plainly — waiting for a limitations period to run can
  turn a full expunction into a partial one.
- **A precise handoff.** Named, specific escalations rather than a bare referral: an order with
  no stated reason, a completed deferred adjudication, an unclear Government Code 76.011
  authorisation, state opposition or art. 55A.302 retention, mixed outcomes across charges from
  one arrest under *State v. T.S.N.* and *Ex parte R.P.G.P.*, a same-transaction felony,
  contested limitations or full-versus-partial, absconding history under art. 55A.154, an
  art. 42A.751(b) warrant barred by art. 55A.153, split venue, wanting to attack the underlying
  case, and immigration. Cost handling names the Rule 145 Statement of Inability (Misc. Docket
  No. 22-9090) and the art. 102.0061(d) waiver for entitlement under art. 55A.053(a)(2)(A) or (B).

No packet is sold, no payment is opened, no dismissal ground is inferred, and no county
formatting practice or filing fee figure is selected for the participant.

---

## Not deferred in Texas lane B

`tx_exp_discretionary` (job `T-B-TX-complete-guidance`) is treated as `complete_guidance`, not a
deferral. Its `legalDesignDecision.status` is `legal_design_approved` with no unresolved
questions at all, and its `outputStrategy` is `process_guidance` on substantive grounds that will
not change with further research: the memo's `scope_restriction` limitation states "Outside the
current LegalEase self-help scope. Provide guidance and an attorney referral only", and its
`self_help_boundary` limitation states that "The prosecutor-recommendation route requires
negotiation with the prosecutor's office. The appellate-acquittal route requires appellate posture
analysis. Neither is suitable for an approved template, and discretionary relief is expressly
named in the template as a self-help stop condition." The memo's `guidanceRationales` are
`requires_negotiation` and `individualized_advocacy`, both in the preserved group.

The participant therefore receives the complete guidance treatment rather than a deferral
statement: what art. 55A.101 provides on both routes, the art. 55A.101(b) fine-only limit on
justice and municipal courts of record, the art. 55A.151 criminal-episode bar, the timing on each
route (on the acquittal for the Court of Criminal Appeals, on expiry of the discretionary-review
period for a court of appeals, and before trial for a prosecutor's recommendation), the appellate
opinion and mandate as the documents to obtain and the appellate clerk as where they come from,
the warning that a trial court acquittal is the different and time-limited art. 55A.002 route, and
a referral that is an addition to those steps rather than the answer in place of them. No fee is
quoted for the article, because the memo quotes none for it. The stop reason states that relief
is discretionary — the court may expunge — so no outcome is implied either way.
