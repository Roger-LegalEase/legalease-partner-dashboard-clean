# Kentucky — exact supported deferrals (lane B, partition B3)

Owner: Terminal B (guidance, exclusions and exact deferrals)
Authority source: `KY.memo.json` (Master Library legal design memo, pinned registry `3b6f4c10`)
Packet file: `data/rcap-all50/guidance-packets/ky.json`

Both deferrals below sit on the same official application, AOC-496.3 (Application to
Vacate and Expunge Felony Conviction, Rev. 6-23), and on the same statute, KRS 431.073.
They are deferred for different reasons and are kept separate because the branches
answer to different evidence.

## `ky_felony_vacatur_expungement`

Job: `T-B-KY-exact-supported-deferral`
Route: Application to Vacate and Expunge a Class D Felony Conviction, KRS 431.073
Treatment: `exact_supported_deferral`

### The exact supported reason

Two of the memo's `unresolvedQuestions` on this track carry `impact: release_blocker`,
and each of them controls a fact the packet would otherwise have to fill in for the
participant.

**1. The eligibility list is date-dependent and not yet parameterised**
(`affectedElement: eligibility_branch`). The Legislative Research Commission publishes
two versions of KRS 431.073 concurrently: the text effective until 30 April 2027, and a
successor enacted by 2026 Ky. Acts ch. 126 sec. 31, effective 30 April 2027, which adds
KRS 286.13-150 to the subsection (1)(a) enumerated list. The two texts are otherwise
identical. The memo states the list "must be date-parameterised before release, and the
controlling review's statement that no future amendment exists is incorrect". The
track's `effectiveDates` carry `effectiveTo: 2027-04-30` for the same reason. Because
subsection (1)(a) is the list that decides whether the participant's offence is reached
at all, selecting a version for the participant would decide their eligibility on a
list that moves under a known date.

**2. The cost at filing is in conflict on primary authority**
(`affectedElement: participant_instructions`, `classificationBasis:
counsel_confirmation_required`). KRS 431.073(10) and (11) set a $50 non-refundable fee
at filing and a separate $250 expungement fee payable after the order. The memo records
that at least one circuit clerk's published page states $300 is due at filing, and poses
the counsel question: "What should the packet tell a participant whose circuit clerk
asks for $300 at filing contrary to KRS 431.073(10)?" That is unanswered, and the answer
determines whether a participant can afford to file.

Two further `unresolvedQuestions` (both `nonblocking_research_note`) are stated to the
participant rather than resolved: whether an offence enumerated in KRS 431.073(1)(a) may
instead be brought under the broader (1)(d) branch, and what the applicant's position is
where the conviction is vacated but the $250 is never paid so the record is not expunged.

The memo's `self_help_boundary` limitation independently removes the broader branch from
self-help: "A KRS 431.073(1)(d) application, a Commonwealth objection or a
serious-bodily-injury question ends automated assistance," alongside eight
`selfHelpStopConditions` including a disputed Class D classification,
persistent-felony-offender exposure, an identified victim, a non-citizen applicant, and
an applicant who needs an instalment plan argued for them.

### What the participant is told

The participant gets the whole route in plain language and a usable set of actions, not
a placeholder.

- **What the mechanism is.** A verified application in the original criminal case, on
  AOC-496.3, on which the circuit court may vacate an eligible Class D felony
  conviction, dismiss the charges with prejudice and order the record expunged. Relief
  is discretionary. The record is expunged only on payment of the $250 expungement fee
  in full (KRS 431.073(5) and (7)), with KRS 534.020 instalments and a compliance date
  at least eighteen months out. Vacatur does not revive an expired limitations period,
  is not a finding of legal error or innocence, and does not nullify findings of fact
  or law; a nonpublic law-enforcement record and the KRS 431.074 index remain.
- **The exact destination.** The Office of the Circuit Court Clerk in the county of
  conviction, filed as a motion in the original criminal case, with the circuit court
  that entered the conviction deciding it; the same clerk for the judgment and discharge
  record; and the Administrative Office of the Courts Records Unit for the KRS 431.079
  certification requested on AOC-RU-009.
- **What they can do now.** Obtain the judgment and any probation or parole discharge
  record; fix the offence and its class; count the five-year date from the later of
  sentence completion and the end of probation or parole; check the recent-conviction
  and pending-proceeding exclusions; ask the clerk's office what is actually collected
  at filing and about proceeding in forma pauperis; request the AOC certification on
  AOC-RU-009 and file it within thirty days of receipt.
- **The exact reason nothing is being prepared.** Stated plainly and without hedging:
  KRS 431.073(1)(a) is published in two versions at once, the one in force through
  30 April 2027 and a successor effective 30 April 2027 adding KRS 286.13-150, so
  choosing between them would be choosing the participant's eligibility on a moving
  list; and KRS 431.073(10) and (11) set $50 then and $250 after the order while at
  least one circuit clerk's page states $300 at filing, with no settled answer on what
  the participant should do at that counter. The two open research points are stated
  rather than papered over.
- **The timing that is settled.** Five years from the later of sentence completion and
  successful completion of probation or parole; the certification filed within thirty
  days of receipt; the $250 falling due after a grant with instalments at least eighteen
  months out.
- **A precise handoff.** To a Kentucky record-clearing attorney or legal aid office with
  two named questions — is my offence within KRS 431.073(1) for the date I would file,
  given the 30 April 2027 successor; and what do I do if my clerk asks for $300 at
  filing — plus immediate handoff on the (1)(d) branch, a Commonwealth objection, a
  serious-bodily-injury or death question, an identified victim, a disputed Class D
  classification or persistent-felony-offender exposure, an uncertain charge list across
  district and circuit court, an instalment plan needing argument, and immigration
  exposure.

No packet is sold, no payment is opened, and no eligibility list, filing date or filing
cost is selected for the participant on this route.

## `ky_felony_expungement_after_pardon`

Job: `T-B-KY-exact-supported-deferral`
Route: Application to Vacate and Expunge a Felony Conviction After a Full Pardon,
KRS 431.073(1)(c)
Treatment: `exact_supported_deferral`

### The exact supported reason

The memo's `unresolvedQuestions[0]` on this track carries `impact: release_blocker`,
`affectedElement: eligibility_branch`, `classificationBasis:
counsel_confirmation_required`, and states the deferral in terms:

> Whether the pardon instrument is a full pardon is a legal reading of a document
> LegalEase does not see. The packet asks the participant what their document says and
> routes to counsel on anything other than a plain full pardon, but the characterisation
> should be reviewed before release.

The counsel question is recorded as: "What should the packet do where a participant's
pardon document is ambiguous between a full pardon, a conditional pardon and a
commutation?"

Everything on this branch turns on that single characterisation. KRS 431.073(1)(c) makes
eligibility turn on a full pardon granted by the Governor; the `scope_restriction`
limitation states that "a conditional pardon, a partial pardon or a commutation is not
within KRS 431.073(1)(c)"; and paragraph 2, option 3 of AOC-496.3 reads "a full pardon
has been granted by the Governor, a copy of which is attached". The
`pardon_attachment_instructions` component records that the participant supplies the
pardon and that "LegalEase names it and explains where it goes but never inspects or
authenticates it". Ticking option 3 for a participant would therefore be asserting, on
a document never seen, the exact legal characterisation reserved for counsel review.

The `self_help_boundary` limitation is congruent: "Anything other than a plain full
pardon on the face of the document needs a lawyer." A second
`selfHelpStopConditions` entry catches the branch's characteristic case: "Any case where
the underlying offence falls outside KRS 431.073(1)(a) and (1)(d), so that the pardon is
the only route." Commonwealth objection and non-citizen status are the remaining stops.

### What the participant is told

- **What the mechanism is.** Where the Governor has granted a full pardon, the pardoned
  conviction is eligible for vacatur and expungement on the same verified application,
  AOC-496.3, as any other KRS 431.073 case, filed as a motion in the original criminal
  case. The branch switches off the Class D limitation and the enumerated-offence list,
  because the pardon itself is the eligibility ground; it does not switch off the
  five-year wait in KRS 431.073(2)(a), which is not branch-specific.
- **The exact destination.** The Office of the Circuit Court Clerk in the county of
  conviction, with the circuit court that entered the conviction deciding; the
  Administrative Office of the Courts Records Unit for the KRS 431.079 certification on
  AOC-RU-009; and the Office of the Governor for a replacement copy of the pardon.
- **What they can do now.** Read the pardon document word for word and record exactly
  what it calls itself; fix the county, circuit case number, conviction and pardon date;
  count the five-year date from the later of sentence completion and the end of
  probation or parole; check the recent-conviction and pending-proceeding exclusions;
  request the AOC certification, which KRS 431.079(1) requires on every application to
  expunge a conviction with no pardon carve-out, and file it within thirty days of
  receipt.
- **The exact reason nothing is being prepared.** Eligibility on this branch is entirely
  a reading of a document LegalEase never sees. KRS 431.073(1)(c) turns on a full
  pardon; a conditional pardon, a partial pardon or a commutation is not this branch;
  the characterisation is recorded as requiring counsel review before release; and the
  memo's own stops end automated assistance on anything other than a plainly full and
  unconditional pardon on the face of the instrument, and on any case where the pardon
  is the only route because the offence falls outside KRS 431.073(1)(a) and (1)(d).
- **The timing that is settled.** The five-year wait under KRS 431.073(2)(a); the
  thirty-day window for filing the certification after receipt; the version of
  KRS 431.073 relied on being the text in effect through 30 April 2027. No deadline for
  applying after a pardon is stated in the memo and none is invented.
- **A precise handoff.** To a Kentucky attorney or legal aid office with one question
  answerable in minutes with the document in hand — is this instrument a full pardon
  within KRS 431.073(1)(c), or is it conditional, partial, or a commutation — plus
  immediate handoff where the offence sits outside (1)(a) and (1)(d), where the
  Commonwealth objects, and where the participant is not a United States citizen.

No packet is sold, no payment is opened, and no characterisation of the pardon
instrument is made for the participant.

## Not deferred in Kentucky lane B

`ky_automatic_nonconviction_expungement_verification` and
`ky_diversion_disposition_routing` (job `T-B-KY-complete-guidance`) are treated as
`complete_guidance`, not deferrals. Neither has a participant-facing submission at all:
KRS 431.076(1)(a) states that the order of automatic expungement "shall not require any
action by the person", and the dismissed-diverted designation attaches by operation of
law under KRS 533.258(1). Each participant receives the full guidance treatment,
including the stated limits — that no participant is told their case has cleared without
the circuit court clerk's confirmation, and that whether a dismissed-diverted disposition
is a dismissal with prejudice for KRS 431.076(1)(a) is a question reserved for Kentucky
counsel, with no filing, form, fee or deadline invented in its place.
