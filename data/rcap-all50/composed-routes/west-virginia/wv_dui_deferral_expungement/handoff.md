# Handoff — First-offence DUI deferral, dismissal and expungement (wv_dui_deferral_expungement)

Job `T-C-WV-complete-composed-route`. Family `composed_route`, treatment `complete_composed_route`.
Registry pin `3b6f4c103d2f97249b45acc0ea3fb889ff8787e5`.

## Authority

- W. Va. Code § 17C-5-2(e) — the offence the deferral operates on
- W. Va. Code § 17C-5-2b(a), (b) — the deferral, and probation conditioned on the Motor Vehicle Alcohol
  Test and Lock Program
- W. Va. Code § 17C-5A-3a — the test and lock program itself; the Division of Motor Vehicles certifies
  completion
- W. Va. Code § 17C-5-2b(c) — **unit 1**: motion to dismiss the charges, supported by the defendant's
  affidavit and the DMV certification; 30-day prosecutor objection window from service; absent objections
  the court shall dismiss
- W. Va. Code § 17C-5-2b(d) — dismissal and discharge without adjudication of guilt; not a conviction for
  disqualifications or disabilities
- W. Va. Code § 17C-5-2b(e), (f) — one discharge only; four ineligibility categories
- W. Va. Code § 17C-5-2b(g) — **unit 2**: application to expunge all official records of the arrest, trial
  and conviction except DMV records; not less than one year from expiration of probation; prior felony
  conviction bars the motion; objections within 30 days of service; hearing if objections filed
- W. Va. Code § 17C-5-2b(h) — court costs that could be assessed against a person convicted
- W. Va. Code § 17C-5-2b(i) — carried in the track authority list
- W. Va. Code § 61-11-25(a) — independent bar: no DMV record is expunged by virtue of any § 17C-5-2b order
- Contrast only, not the basis of this relief: the West Virginia Judiciary Court Forms index (five
  expungement forms, all §§ 61-11-25/26 instruments) and W. Va. Code §§ 61-11-26, 61-11-26a, 61-11-26b

## Mechanism

Section 17C-5-2b operates on a person who pleads to or is found guilty of the § 17C-5-2(e) offence, has no
prior DUI-type conviction, and notifies the court within 30 days of arrest of the intention to participate
in a deferral. The court, without entering a judgment of guilt, defers further proceedings and imposes
probation conditioned on successful completion of the test and lock program under § 17C-5A-3a — at least
165 days after a 15-day licence suspension, completed within one year thereafter.

The section then creates **two separate participant-facing submissions**, and the registry models them as
separate units because their required contents, their timing and their legal effect all differ. Subsection
(c) produces dismissal and discharge; subsection (g) produces expungement, cannot be reached until a year
has run from the expiration of probation, and is barred outright by any prior felony conviction. Only one
discharge and dismissal is available under the section.

Venue recorded: the court in which the § 17C-5-2(e) charge was brought and which deferred proceedings and
imposed probation. Both units are filed with the clerk of that court.

## Route decision

Composed route, `compositionMode` **sequential**. Two registry units and seven registry packetSet
components, expressed as **7 units / 7 components**:

| unit | requiredOutput | component | stage |
| --- | --- | --- | --- |
| wv-dui-deferral-unit-1-motion-to-dismiss | pleading_document | `…-primary-filing-1` | (c) |
| wv-dui-deferral-unit-1-supporting-affidavit | pleading_document | `…-supporting-affidavit-2` | (c) |
| wv-dui-deferral-unit-2-application-to-expunge | pleading_document | `…-secondary-filing-3` | (g) |
| wv-dui-deferral-unit-2-supporting-timeline | pleading_document | `…-supporting-timeline-4` | (g) |
| wv-dui-deferral-certificate-of-service | pleading_document | `…-certificate-of-service-5` | both |
| wv-dui-deferral-records-checklist | participant_instruction | `…-records-checklist-6` | both |
| wv-dui-deferral-filing-instructions | participant_instruction | `…-filing-instructions-7` | both |

Five custom pleadings are drafted. Both registry units declare `outputStrategy: custom_pleading`,
`outputStrategyStatus: resolved`, `packetIdentity: identified`, `available: true`; five of the seven
packetSet components carry `custom_pleading` and two carry `process_guidance`.

**No official-form dependency exists on this route, and no `dependency.json` is written.** This is a
positive, sourced finding rather than a gap. The West Virginia Judiciary Court Forms index was read at
source on 2026-08-06 and publishes exactly five expungement forms — SCA-C900, SCA-C903, SCA-C906, SCA-C907,
SCA-C912 — none of which is a § 17C-5-2b filing. The committed state pack catalogues the same five and ties
each to § 61-11-25 or § 61-11-26. On that basis the controlling review's build blocker is answered in the
negative. Whether an unpublished local form is used in some courts was not tested, and that remains a
release blocker.

**No agency request letter is drafted.** The one agency contact — the Division of Motor Vehicles, for
certification that the test and lock program was successfully completed — is recorded as made by asking,
with no form number, URL or template named anywhere. The clerk and the probation office are likewise
recorded as asked, not written to. Drafting a letter would add a document the sources do not record. The
DMV certification is required by § 17C-5-2b(c) to support the motion, so it is listed in
`filingSeparation.courtDocuments` as `drafted: false` with the reason, and handled in the records-checklist
component.

**No proposed order and no cover sheet is drafted.** The registry packetSet has seven components and
neither is among them; the section makes both dispositions the court's own act and names no custodian the
expungement order must direct.

## Terminology and vocabulary control

The instruments are a **motion** (subsection (c): "the defendant may move the court") and an
**application** (subsection (g): "the person may apply to the court"). `petition` and `petitioner` are
prohibited terms in every component's rendered document text, because every West Virginia Judiciary
expungement petition belongs to § 61-11-25 or § 61-11-26 — a different statute with a different fee regime,
a different service list, a once-per-lifetime limit under § 61-11-26(o), and an express § 61-11-26b bar on
expunging DUI convictions.

Also prohibited across all components: `seal` / `sealed` / `sealing` (the § 61-11-26 remedy),
`destroy` / `destroyed` / `destruction` / `erase` (the state pack's own never-say list), and
`pardon` / `vacate` / `vacatur` / `acquittal` / `acquitted` / `pretrial diversion` / `deferred adjudication`
(each names a different West Virginia route — and DUI is expressly excluded from § 61-11-22 pretrial
diversion, so calling this a diversion would be doubly wrong).

Additionally prohibited on the two stage-one components (`…-primary-filing-1`, `…-supporting-affidavit-2`):
`expunge` / `expunged` / `expunging` / `expungement`. Subsection (c) produces dismissal and discharge, not
expungement. A stage-one document that asked for or promised expungement would collapse the two-stage
separation the registry deliberately models.

These prohibitions apply to rendered document text only. Several of the words necessarily appear in
participant-facing routing and disclosure copy, where they do necessary work.

## Nulls, and why

Following the ND config's handling of its own missing verification statute, everything the sources do not
state is null with a stated reason and a counsel flag, not filled:

- `presentation.sovereignPartyName` / `sovereignPartyProper` / `sovereignRole` / `movantFirstInCaption` —
  no source read for this track states a caption party structure. A "State of West Virginia v. Defendant"
  styling appears nowhere in the registry entry, the compiled profile or the committed state pack.
- `courtName` — a `{court}` token filled only from the participant's own answer. The compiled profile's
  intake checklist records West Virginia courts as "circuit, magistrate, municipal" and nothing states
  which hears a § 17C-5-2b matter. The circuit-court destination the state pack records is for
  §§ 61-11-25/26 filings and is **not** imported.
- `verificationStatute.citation` — null on four of the five components. Cited only on the affidavit, and
  only for the subsection that requires an affidavit to exist; the jurat wording and the class of officer
  are unstated by every source and are not invented.
- `recordCustodianLead` — null everywhere. Section 17C-5-2b(g) names no custodian; the § 61-11-26 service
  list (State Police Superintendent, prosecutor, arresting agency, institution of confinement, disposing
  court) belongs to the conviction route and is not imported.
- `recordsScopePhrase` — null on the stage-one components; on the application it is the subsection's own
  words *including its own DMV exception*, so the application can never read as asking for the driving
  record.
- No fee amount anywhere. § 17C-5-2b charges none; subsection (h) court costs are stated nowhere as an
  amount; the registry records the waiver as "none stated in § 17C-5-2b"; the state pack's § 61-11-26 civil
  filing fee and $100 State Police processing fee belong to a different route and are not imported.

## Filing instructions provenance — a deliberate non-import

The committed state pack's `filing-instructions.ts` was read in full. **Every one of its ten steps belongs
to a different statute** — § 61-11-25 on SCA-C903, § 61-11-26 on SCA-C906/C907 with its five-recipient
service list and $100 State Police fee, § 61-11-26a, § 60A-4-407, § 5-1-16a. None of it describes a
§ 17C-5-2b filing, and importing any of it would put a participant into the conviction-expungement route
where § 61-11-26b expressly bars expunging DUI convictions. The participant filing steps in this route are
drawn from the pinned registry entry's `rules.filing`, `rules.service`, `rules.notice`, `rules.fees`,
`rules.participantSignature`, `rules.notarization` and `destination`, which are the only committed source
that describes filing for this track. The state pack supplies court-identity and terminology facts only.

## Open counsel flags

23 route-level flags. Ranked by impact:

**Release blockers (5)**

1. `wv-dui-deferral-no-judiciary-form` — whether an unpublished local form is used in some courts was not
   tested.
2. `wv-dui-deferral-stale-file-vehicle` — where the deferral was years ago and no dismissal was ever
   entered, whether the (c) motion is still the right vehicle on an administratively closed file is not
   established. Nothing in the route asserts that it is.
3. `wv-dui-deferral-lifetime-limit-interaction` — whether § 17C-5-2b relief counts against the
   § 61-11-26(o) once-per-lifetime limit. No participant copy tells the participant either way.
4. `wv-dui-deferral-legal-status` — output review, visual review and technical proof all outstanding.
5. `wv-dui-deferral-source-sha-missing` — every official source on this track has a null sha256, so
   staleness cannot be detected (source gate).

**Counsel confirmation (10)** — `felony-bar-not-in-controlling-review` (the (g)(1) felony bar is not in the
controlling review; this route treats it as excluding unit 2 only), `court-level-unstated`,
`caption-and-party-structure-unstated`, `verification-form-unprescribed`, `no-proposed-order`,
`costs-under-subsection-h`, `profile-silent-and-routing-hazard`,
`motion-and-application-not-petition`, `service-is-a-participant-act`, `hearing-date-left-blank`.

**Scope restrictions (2)** — `two-stage-separation`, `stage-one-out-of-scope` (the 30-day notice-of-intent
window is charge-stage criminal defence and outside product scope).

**Self-help boundaries (3)** — `subsection-f-bars`, `dmv-certification-participant-obtained`,
`probation-violation-hearing` (automated assistance ends at the hearing).

**Packet instructions (3)** — `dmv-record-never-reached`, `probation-expiry-clock`,
`disclosure-protection-limits`.

### The routing hazard worth reading twice

The compiled WV profile never mentions § 17C-5-2b. Its only occurrences of "17C-5-2" say DUI is excluded
from § 61-11-22 pretrial diversion. The committed state pack goes further and states flatly that "DUI
convictions cannot be expunged." Both statements are true of the routes they describe. Both would turn away
exactly the participant this track exists for — the person whose proceedings were deferred under
§ 17C-5-2b with no judgment of guilt ever entered. The controlling review's own words: "a participant who
completed a DUI deferral years ago and was told nothing could be done is exactly the person this product
exists for, and the reference would currently turn them away." The West Virginia routing table needs to
send that participant here.

## F-review pointers

- **Two-stage gating.** `stageNeeded` must gate which components render. The pipeline must not be able to
  emit the (g) application alongside the (c) motion. See `route.json` `units[].applicability` and
  `compositionMode: sequential`.
- **Clock direction.** Any waiting-period computation must measure from `probationExpiryDate`, never from
  `dismissalDate`. The boundary fixtures on `…-secondary-filing-3` and `…-supporting-timeline-4` exist to
  prove the two dates stay distinct and that nothing concludes the period has run.
- **Felony bar asymmetry.** `priorFelonyConviction` excludes unit 3 and unit 4 only. It must not exclude
  units 1 and 2. This is the reading of the (g)(1) proviso and is an open counsel question.
- **DMV certification precondition.** No stage-one production or filing without the participant holding it.
- **Stage parameterisation of the certificate.** One drafted component, two renderings, different
  served-document titles and a different movant role (`Defendant` at (c), `Applicant` at (g)). The
  boundary fixture on `…-certificate-of-service-5` is the stage-one rendering and carries an expected
  pleading-QA *warning* (primary relief term absent) that must not be silenced by adding relief vocabulary.
- **Renderer adapter defects.** Seven recorded in each config's `rendererCompatibility.adapterDefects` —
  null-stringification, the verification section rendering on a null verb, `usesCounty:true` being a
  hardcoded Pennsylvania branch, the unsupported `{court}` and `{caseNumberLine}` tokens, the party block
  assuming a sovereign party, and the absence of any stage parameter. No source-faithful field was altered
  to work around any of them.
- **Negative fixtures.** One per pleading component and one per instruction component; each `expectFailure`
  states its own grounds. Each combines prohibited terms, prefilled court identity, populated protected
  fields, asserted outside-party acts, asserted service completion, predicted court outcomes, unsourced
  money statements, and proceeding through statutory bars.
