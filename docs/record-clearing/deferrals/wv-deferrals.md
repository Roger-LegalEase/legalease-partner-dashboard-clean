# West Virginia — exact supported deferrals (lane B, partition B3)

Owner: Terminal B (guidance, exclusions and exact deferrals)
Authority source: `WV.memo.json` (Master Library legal design memo, pinned registry `3b6f4c10`)
Packet file: `data/rcap-all50/guidance-packets/wv.json`

All three deferrals below are W. Va. Code § 61-11-26 conviction routes and share one
statute, one shared procedure node (`wv_common_conv_procedure`), one fee structure and
one once-per-lifetime rule at § 61-11-26(o). They are deferred for different reasons and
are kept separate because each answers to different evidence in the memo. Every one of
them is `legal_design_approved_with_limitations` in the memo with `outputStrategy:
official_pdf_fill` — none is withheld for want of a form. What defers each is a recorded
`unresolvedQuestions` entry carrying `impact: release_blocker`, on a fact the packet
would otherwise have to choose for the participant.

## `wv_conv_multiple_misdemeanors`

Job: `T-B-WV-exact-supported-deferral`
Route: Verified Petition to Expunge Multiple Misdemeanour Convictions,
W. Va. Code § 61-11-26(a)(1) and (b)(2), on form SCA-C906
Treatment: `exact_supported_deferral`

### The exact supported reason

Two `unresolvedQuestions` on this track carry `impact: release_blocker`, and each
controls a decision the packet cannot make on the participant's behalf.

**1. The forum for a multi-county group is not identified** (`affectedElement: venue`,
`classificationBasis: counsel_confirmation_required`). Section 61-11-26 was read at
source on 2026-08-06: subsection (a)(1) names "the circuit court in which the conviction
or convictions occurred", and the subsection (d) proviso requires a multiple-misdemeanour
petition to "identify and group such information by circuit court, as applicable". The
memo records that those together support one petition covering several counties, but that
"the text does not say which of the several circuit courts is the forum, and it does not
contain the county-of-residence option the controlling review attributes to S.B. 562."
The counsel question is recorded verbatim: which circuit court receives a single
multi-county petition, and is there any surviving basis for filing in the county of
residence. Selecting a courthouse would be selecting the participant's forum on a
question the statute leaves open.

**2. Severance of an excluded conviction inside an eligible group is unresolved**
(`affectedElement: eligibility_branch`, `classificationBasis:
counsel_confirmation_required`). Whether an excluded conviction sitting inside an
otherwise eligible group can be severed so the remainder is expunged, or whether its
presence risks summary denial of the whole petition under § 61-11-26(i)(4), is open. The
memo notes the burden at subsection (h)(1) is framed per conviction, "which suggests
severance, but the once-per-lifetime rule makes the downside of getting it wrong
permanent." The counsel question asks whether the safer instruction is to omit any
doubtful conviction from the petition entirely. Because § 61-11-26(o) allows the relief
only once, an instruction either way is irreversible for the participant who follows it.

The shared form-identity and reply-window blockers recorded on
`wv_conv_single_misdemeanor` apply to this route too, since it files the same SCA-C906.

Ten `selfHelpStopConditions` stand independently of the two questions, including any
felony conviction anywhere on the record, any violence, domestic violence, household
member, strangulation, sex, child victim, deadly weapon, dwelling burglary or DUI issue
in any conviction in the group, any CDL or commercial motor vehicle issue, any prior
expungement, a group spanning more than one county where the filing circuit is unclear,
and the court setting the matter for hearing under § 61-11-26(i)(3).

### What the participant is told

- **What the mechanism is.** One verified petition to the circuit court of conviction
  covering every eligible misdemeanour, on the two-year clock measured from the last
  conviction, the end of any sentence of incarceration, or the end of any supervision
  ordered for that last conviction, whichever is later; the twelve subsection (d)
  content items; service on the five § 61-11-26(e) recipients with the prosecuting
  attorney serving identified victims; 30-day opposition and 30-day reply; a
  clear-and-convincing burden on six matters; a 60-day court decision with four permitted
  outcomes; sealing and a 60-day agency certification duty on a grant; and the
  once-per-lifetime rule at § 61-11-26(o) that makes bundling the point of the route.
- **The exact destination.** The clerk of the circuit court of the county of conviction,
  with that circuit court deciding; the circuit or magistrate clerk of each county of
  disposition for certified records; the supervising probation office for supervision
  completion; and the prosecuting attorney of each county of conviction among those
  served.
- **What they can do now.** Build the complete conviction inventory before anything else,
  because the relief is once per lifetime; compute the two-year date from the last
  conviction; order certified dispositions, judgment orders and sentencing orders for
  every conviction; obtain written proof supervision ended on the most recent one; run
  the § 61-11-26(c) list and the § 61-11-26b commercial-driving screen; record which
  convictions are in which county; write the rehabilitation account and the address
  history in their own words; and ask the circuit clerk what that circuit collects and
  expects.
- **The exact reason nothing is being prepared.** Stated without hedging: § 61-11-26(a)(1)
  names the circuit court of conviction and the subsection (d) proviso requires grouping
  by circuit court, but the text does not say which of several circuit courts is the forum
  for one multi-county petition and carries no county-of-residence option; and whether an
  excluded conviction inside an eligible group can be severed, or risks summary denial of
  the whole petition under § 61-11-26(i)(4), is unanswered while § 61-11-26(o) makes the
  consequence permanent.
- **The timing that is settled.** Two years from the latest of the last conviction, the
  end of incarceration and the end of supervision ordered for that conviction; 30 days to
  oppose; 60 days for the court; 60 days for agency certification. The reply window is
  stated as the statutory 30 days with the SCA-C900 ten-day discrepancy disclosed rather
  than resolved.
- **A precise handoff.** To a West Virginia record-clearing attorney or legal aid office
  with two named questions — which circuit court takes a multi-county petition, and
  whether to include or omit a doubtful conviction — plus immediate handoff on any felony,
  any violence, domestic violence, household member, strangulation, sex, child victim,
  deadly weapon, dwelling burglary or DUI issue, any CDL issue, a pending charge, a
  protection or no-contact order, an identified victim who may oppose, a prior
  expungement, or a hearing being set.

No packet is sold, no payment is opened, and no forum and no include-or-omit decision is
made for the participant.

## `wv_conv_nonviolent_felony`

Job: `T-B-WV-exact-supported-deferral`
Route: Verified Petition to Expunge a Nonviolent Felony Conviction,
W. Va. Code § 61-11-26(a)(2) and (b)(3), on form SCA-C907
Treatment: `exact_supported_deferral`

### The exact supported reason

`unresolvedQuestions[0]` carries `impact: release_blocker`, `affectedElement:
participant_instructions`, `classificationBasis: counsel_confirmation_required`, and
states the deferral in terms: how LegalEase should present a route it may generate but on
which it cannot make the central characterisation. Section 61-11-26(p)(5) makes two of the
four limbs of "nonviolent felony" express circuit-court findings — that the offence is
consistent with the purposes of the article, and that it does not involve violence or
potential violence to another person or the public — so the eligibility recital on
SCA-C907 is one the memo leaves for the participant and their counsel. The controlling
review "calls for a manual-review gate on every felony". The memo records that LegalEase
operates no review queue, no staff approval and no eligibility determination, so that
direction is normalized to a printed attorney-referral notice and a self-help boundary,
and expressly does not assume counsel accepts the translation:

> Whether counsel accepts that translation, or would rather the felony route not be
> offered at all until a referral partner is in place, is a question for counsel.

The counsel question is recorded as whether a printed attorney-referral notice plus a
self-help stop on any felony is an acceptable implementation of the manual-review
requirement, or whether the felony route should be withheld until a referral arrangement
exists. Until that is answered, the route is presented as guidance with a referral, not
as a self-prepared filing.

Two `manualCompletionItems` are congruent and are never generated: the characterisation
of the felony as nonviolent (SCA-C907 page 1 eligibility recitals) and the
same-transaction or series-of-transactions characterisation under § 61-11-26(a)(2). The
`self_help_boundary` limitation is explicit that LegalEase must not generate the
statements that a felony is nonviolent, that an offence is not on the § 61-11-26
exclusion list, that the petitioner has been rehabilitated, or that expungement is
consistent with the public welfare. The first `selfHelpStopConditions` entry is "Any
felony conviction" on its own terms.

A second `unresolvedQuestions` entry (`nonblocking_research_note`) — how to explain to a
participant who came in about a DUI that § 61-11-26(c)(7) excludes a DUI outright while a
DUI at least five years old does not preclude an unrelated felony expungement — is stated
to the participant rather than resolved.

### What the participant is told

- **What the mechanism is.** A verified SCA-C907 petition to the circuit court of
  conviction on the five-year clock measured from the latest of conviction, release and
  end of supervision; the § 61-11-26(p)(5) definition with its four limbs and the two that
  are judicial findings; the (p)(2) violence-against-the-person and (p)(3) minor-victim
  definitions with their Code cross-references; the same subsection (d) content items,
  five-recipient service, 30-day opposition and reply, clear-and-convincing burden,
  60-day decision, sealing and 60-day agency certification; the DUI five-year interaction;
  and the once-per-lifetime rule.
- **The exact destination.** The clerk of the circuit court of the county of conviction,
  with that circuit court deciding; the same circuit clerk for the certified disposition,
  judgment order, sentencing order and the indictment or information; the institution of
  confinement for the release date; and the supervising probation or parole office for the
  supervision end date.
- **What they can do now.** Fix the exact Code section of conviction, because every screen
  in the section is written by section number; order the certified records; obtain the
  release and supervision end dates in writing; count the five-year date; record the DUI
  date if there is one; check the prior-expungement and pending-charge exclusions; write
  the rehabilitation account and the address history; ask the circuit clerk what the
  circuit collects and expects; and take the papers to counsel with three named questions.
- **The exact reason nothing is being prepared.** Two of the four limbs of the nonviolent
  definition are the circuit court's own findings, the eligibility recital asks the
  petitioner to assert that characterisation up front, the same-transaction analysis is
  likewise a legal conclusion, and the controlling review requires legal review on every
  felony — a review LegalEase cannot itself perform, holding no records, reviewing nothing
  and approving no filing. Whether a printed referral is an acceptable substitute is an
  open question for counsel and is not answered in the participant's favour.
- **The timing that is settled.** Five years from the latest of conviction, completion of
  incarceration and completion of supervision; an unrelated DUI conviction at least five
  years old at filing; 30 days to oppose; 30 days to reply; 60 days for the court; 60 days
  for agency certification.
- **A precise handoff.** To a West Virginia record-clearing attorney or legal aid office
  with three questions answerable with the papers in hand — is the offence outside the
  § 61-11-26(c) list and outside the (p)(2) and (p)(3) definitions; would a circuit court
  treat it as nonviolent within (p)(5); and did multiple felonies arise from the same
  transaction or series — plus immediate handoff on any violence, domestic violence,
  household member, strangulation, sex, child victim, deadly weapon or dwelling burglary
  issue, a pending charge, a protection or no-contact order, an identified victim who may
  oppose, a prior expungement, or a § 61-11-26(j) hearing.

No packet is sold, no payment is opened, and no characterisation of a felony as
nonviolent and no same-transaction conclusion is made for the participant.

## `wv_conv_single_misdemeanor`

Job: `T-B-WV-exact-supported-deferral`
Route: Verified Petition to Expunge a Single Misdemeanour Conviction,
W. Va. Code § 61-11-26(a)(1) and (b)(1), on form SCA-C906
Treatment: `exact_supported_deferral`

### The exact supported reason

The memo calls this "the highest-volume paid track in West Virginia and the cleanest" on
the law, and nothing about the participant's own record defers it. What defers it is the
published paperwork. Two `unresolvedQuestions` carry `impact: release_blocker`, both
`classificationBasis: counsel_confirmation_required`.

**1. Which published form is the operative § 61-11-26 misdemeanour petition**
(`affectedElement: correct_form`). The Judiciary Court Forms index was read at source on
2026-08-06 and publishes exactly five expungement forms. SCA-C900, captioned
"Instructions for Expungement of Records Petition" and revised 04/01/2021, is a five-page
document whose pages 2 to 5 are themselves a petition. The memo records that embedded
petition as materially stale: it requires the petitioner to have been "between eighteen
and twenty-six years of age", requires "no prior or subsequent convictions other than
minor traffic violations", recites "W. Va. Code § 61-11-26 (2009)", and cross-references
the exclusion list to "§ 61-11-26(i)" — all features of the pre-2019 section. The section
in force places exclusions at subsection (c) and imposes no age limit. SCA-C906 matches
the current subsection (c) and (d) structure and carries the § 61-11-26a elections, and is
the form the memo uses. The counsel question asks for confirmation that SCA-C906 is
operative, that SCA-C900 is for its page-one instructions only, and that the stale
embedded petition must never be generated. Two petitions are published concurrently and
one of them carries repealed requirements; completing either for a participant would be
choosing between them on an unanswered question.

**2. The reply window after a notice of opposition** (`affectedElement:
notice_or_service`). SCA-C900 tells the petitioner they "will then have ten (10) days of
being served of such notice to reply" and cites § 61-11-26(e); § 61-11-26 was read in full
at source and opposition sits at subsection (g), with subsection (g)(3) giving the
petitioner 30 days after service of the opposition to reply. The memo records that the
packet states the statutory 30 days and flags the discrepancy, "but which the circuits
apply in practice is not established, and a participant who relies on the form's ten days
would not be prejudiced while one who relies on thirty might be."

A third `unresolvedQuestions` entry (`nonblocking_research_note`) is disclosed rather than
resolved: the SCA-C906 certificate of service lists eight recipients including a municipal
police chief, while § 61-11-26(e) as amended by S.B. 562 (2020) lists five and reaches
only the arresting agency's chief law-enforcement officer. Serving the additional
recipient is harmless and the participant is told to serve them.

Ten `selfHelpStopConditions` stand independently, including any felony conviction anywhere
on the record, any violence, domestic violence, household member, strangulation, sex,
child victim, deadly weapon, dwelling burglary or DUI issue, any CDL or commercial motor
vehicle issue, any pending charge, any protection or no-contact order, any identified
victim who may oppose, any prior expungement, and the court setting the matter for hearing
under § 61-11-26(i)(3).

### What the participant is told

- **What the mechanism is.** A verified SCA-C906 petition to the circuit court of
  conviction on the one-year clock measured from the latest of conviction, completion of
  incarceration and completion of supervision; the twelve subsection (d) content items
  including names and aliases, the full address history, the participant's own
  rehabilitation account, the prior-expungement disclosure and any current protective
  order; service on the five § 61-11-26(e) recipients with the prosecuting attorney serving
  identified victims; 30-day opposition and 30-day reply; a clear-and-convincing burden on
  six matters; a 60-day decision with four permitted outcomes; sealing and 60-day agency
  certification on a grant; the once-per-lifetime rule at § 61-11-26(o); and the narrower
  subsection (l) effect, under which law-enforcement-position applicants must still
  disclose and entities required by law to obtain criminal history checks may still learn
  of the conviction.
- **The exact destination.** The clerk of the circuit court of the county of conviction,
  with that circuit court deciding; the same circuit or magistrate clerk for the certified
  disposition, judgment order and sentencing order; the supervising probation office for
  written proof supervision ended; and the prosecuting attorney of the county of conviction
  among those served.
- **What they can do now.** Order the certified records; obtain the release and supervision
  end dates in writing; compute the one-year date; run the § 61-11-26(c) list by Code
  section and the § 61-11-26b commercial-driving screen; establish whether any other
  misdemeanour conviction exists, because the once-per-lifetime rule and the two-year
  multiple-conviction clock change what belongs in one petition; obtain a copy of any
  current protective order, which § 61-11-26(d)(7) requires to be attached; write the
  rehabilitation account and the address history; and ask the circuit clerk what that
  circuit collects at filing and which petition form it expects.
- **The exact reason nothing is being prepared.** Two petitions are published at once and
  the operative one is unconfirmed, the SCA-C900 embedded petition carrying a repealed
  eighteen-to-twenty-six age band, a prior-conviction condition, a 2009 recital and a
  § 61-11-26(i) exclusion cross-reference that no longer exists; and the reply window after
  an opposition is ten days on the Judiciary's published instruction sheet and 30 days
  under § 61-11-26(g)(3), with circuit practice unestablished and the shorter figure the
  safer one to know about. The certificate-of-service recipient mismatch is disclosed, with
  the instruction to serve the extra recipient.
- **The timing that is settled.** One year from the latest of conviction, completion of
  incarceration and completion of supervision; 30 days to oppose; 60 days for the court;
  60 days for agency certification. The reply window is stated from the statute with the
  discrepancy named.
- **A precise handoff.** To a West Virginia record-clearing attorney or legal aid office,
  and in part to the circuit clerk, with two short questions — which published form the
  circuit expects on a § 61-11-26 misdemeanour case, and whether a reply to a notice of
  opposition is due in ten days or 30 — plus immediate handoff on any felony, any
  violence, domestic violence, household member, strangulation, sex, child victim, deadly
  weapon, dwelling burglary or DUI issue, any CDL issue, a pending charge, a protection or
  no-contact order, an identified victim who may oppose, a prior expungement, or a hearing
  being set.

No packet is sold, no payment is opened, and no petition form and no reply deadline is
selected for the participant.

## Not deferred in West Virginia lane B

`wv_common_nc_procedure` and `wv_dui_test_and_lock_dismissal` (job
`T-B-WV-complete-guidance`) are treated as `complete_guidance`, not deferrals. Neither has
a participant-facing submission at the point the packet reaches: the first is the shared
§ 61-11-25 threshold screen and routing node, which the memo records as
`no_participant_filing_exists` because the petition belongs to the route it selects and
§ 61-11-25(g) charges no fee on either; the second is a court-ordered dismissal and
expungement that § 17C-5-2(j)(1) makes mandatory on successful completion of the Motor
Vehicle Test and Lock Program, with no petition, no application and no waiting period
described in the subsection. Each participant receives the full guidance treatment
including the stated limits — that § 61-11-25 relief is discretionary in form and must not
be described as automatic; that a prior felony conviction closes the whole of § 61-11-25;
that no Division of Motor Vehicles record is expunged by virtue of any order under
§ 17C-5-2b; that what enforces the § 17C-5-2(j)(1) duty where a court has not acted is not
identified, so no enforcement pleading is generated; and that how far the (j)(1)
expungement reaches beyond the court record is not established, so no background-check
expectation is stated in its place.
