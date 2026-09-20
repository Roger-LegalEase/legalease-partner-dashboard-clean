# C7 confirmed Category B guidance

This lane preserves three Category B stages. None has a participant Category A filing branch. Each route keeps its guidance family, records what the participant can check, and sends a failed implementation to the proper custodian or human handoff.

The lane names these packet families and creates none of them:

- `rcap-mn-guidance-implementation`
- `rcap-ne-guidance-implementation`
- `rcap-va-guidance-implementation`

The recorded proof leaves all three families runtime-disabled, not packet-ready, and not production-enabled. This work opens no commercial route.

## Route summary

| Route | Participant files | Official destination | Trigger | Participant deadline |
| --- | --- | --- | --- | --- |
| `obligation:track-only:MN:mn_pardon_auto_expungement` | Nothing in the post-pardon stage | The district court and record custodians responsible for the pardoned case | A qualifying pardon extraordinary has been granted | None for this stage |
| `obligation:track-only:NE:ne-out-of-jurisdiction-routing` | No Nebraska sealing or expungement filing | The court or repository in the jurisdiction that created the record | The record came from outside Nebraska | The originating jurisdiction controls; correction escalation starts when the participant finds an inaccurate Nebraska entry |
| `obligation:track-only:VA:va_exp_actual_innocence` | Nothing after the qualifying writ | The circuit court that entered the vacated conviction, then its clerk and the CCRE for verification | A qualifying writ vacates the conviction; the court's duty starts when it receives the writ | None for this downstream stage |

## Minnesota: post-pardon automatic expungement

### Scope and selector

Use this stage after a participant answers `pardonGranted=yes`. Capture the pardon date and whether the conviction still appears. The pardon application belongs to a separate clemency route.

### Participant action

The participant files no expungement petition, pays no filing fee, serves nobody, and gives no notice. The Board, court, and record custodians handle official notice and transmission.

The participant should:

1. Keep the pardon and any sealing or expungement order.
2. Request their own Minnesota criminal history from the Bureau of Criminal Apprehension.
3. Check each affected case in Minnesota Court Records Online and record the date of the check.

The participant should treat a record that still appears as pending. The committed guidance identifies no participant correction form, so this route must not name or generate one.

### Correction escalation and handoff

Identify which official record still carries the conviction. Use the case number, pardon, and any order when asking that record's custodian about implementation. Send the participant to a Minnesota lawyer or expungement clinic if the pardon scope is disputed, a custodian refuses the order, an omitted case requires litigation, or enforcement is needed. Counsel can determine whether a separate petition or enforcement route applies.

The committed record gives no implementation timetable and no participant deadline. Do not promise a clearance date.

Sources recorded for this decision:

- Minnesota Revisor, § 609A.035: <https://www.revisor.mn.gov/statutes/cite/609A.035>
- Minnesota Board of Pardons: <https://mn.gov/pardons/>
- `data/record-clearing/legal-design-intake/MN.memo.json`, `trackId=mn_pardon_auto_expungement`
- `src/lib/rcap/packets/jurisdictions/minnesota/guidance.ts` at `bf6f368c8a4cd72e0fa488bd37336c073f116925`

## Nebraska: record from another jurisdiction

### Scope and selector

The committed intake uses `recordJurisdiction`. Values `another_state`, `federal`, and `tribal` select this routing stage. `ojRecordJurisdiction` captures the court or agency and its location; `ojAlsoHoldsNebraskaRecords` lets intake split Nebraska records from the rest.

The revalidation record also covers a foreign jurisdiction. The committed selector has no foreign enum value. `branch-identities.json` records the governing condition without inventing a runtime value: the arrest, charge, or conviction was not created by a Nebraska court or Nebraska criminal-justice agency.

### Participant action

The participant files no Nebraska sealing or expungement document for the outside record. They should identify the originating jurisdiction, case number, and custodian, then ask that jurisdiction what relief and filing rules it provides. Nebraska records in the same history stay on Nebraska routes.

A Nebraska repository error has a narrower response. The participant may ask the Nebraska State Patrol to identify the source that supplied the entry and explain how an update reaches the repository. The participant should then ask that source court or agency to correct its information, using identity evidence and the certified foreign disposition. If the source agrees, it can provide the corrected information to NSP. The committed record names no correction form. This correction process does not seek Nebraska expungement.

### Correction escalation and handoff

Send substantive relief to the court or repository that created the record. That jurisdiction controls the filing, fee, notice, and deadline. For a Nebraska data error, start with NSP to identify the source, pursue the correction with that source, and follow up with NSP after the source provides corrected information. NSP record-copy fees may apply.

Send conflicts between jurisdictions to counsel. Send federal consequences to counsel with the relevant federal practice. An immigration consequence requires an immigration attorney before the participant relies on record-clearing guidance.

Sources recorded for this decision:

- Nebraska Legislature, § 29-3523: <https://nebraskalegislature.gov/laws/statutes.php?statute=29-3523>
- Nebraska State Patrol, criminal history record requests: <https://statepatrol.nebraska.gov/services/criminal-history-record-requests>
- `data/record-clearing/legal-design-intake/NE.memo.json`, `trackId=ne-out-of-jurisdiction-routing`
- `src/lib/rcap/packets/jurisdictions/nebraska/guidance.ts` at `ac4f9f2b106c79e00461861920b210aa537f57f2`

## Virginia: expungement after a writ of actual innocence

### Scope and selector

Use this stage for a conviction when `writGranted=yes` and `writSection` is `section_19_2_327_5` or `section_19_2_327_13`. The participant must know which circuit court entered the vacated conviction. The writ litigation belongs to a separate appellate post-conviction route and remains outside this lane.

### Participant action

The participant files no petition, application, or request after the writ, pays no court filing fee for this stage, serves nobody, and gives no notice. The circuit court enters the expungement order after it receives the writ.

The participant should:

1. Keep a copy of the writ or vacatur order.
2. Ask the counsel who obtained the writ whether the convicting circuit court received it, then ask the circuit court clerk to confirm receipt.
3. Ask the clerk whether the court entered an order under Va. Code § 19.2-392.2(J). The order should identify that subsection.
4. Request their own Virginia criminal history from the Virginia State Police, Central Criminal Records Exchange, and check the vacated conviction.
5. Keep dated copies and check again after a reasonable interval. The committed record supplies no processing period.

Court records, the CCRE record, and private background-check databases may update on different schedules. A private vendor's lag does not establish that the court failed to act.

### Correction escalation and handoff

Raise a missing order with the counsel who obtained the writ. If that counsel is no longer available, start with the circuit court clerk and then use Virginia legal aid, a Virginia legal clinic, or a Virginia attorney. Do not create a new self-help filing under subsection J.

Send the participant to counsel if the writ does not cover the disputed record, an agency refuses implementation, or enforcement or appeal is required. An immigration question goes to an immigration attorney.

The participant has no downstream filing deadline. The retained guidance was written against the version of § 19.2-392.2 effective before December 1, 2026. The controlling legal record requires a source refresh before that date; this lane does not decide the version question or approve release.

Sources recorded for this decision:

- Virginia LIS, § 19.2-392.2: <https://law.lis.virginia.gov/vacode/title19.2/chapter23.1/section19.2-392.2/>
- Virginia LIS, writ of actual innocence statutes: <https://law.lis.virginia.gov/vacodefull/title19.2/chapter19.2/>
- `data/record-clearing/legal-design-intake/VA.memo.json`, `trackId=va_exp_actual_innocence`
- `src/lib/rcap/packets/jurisdictions/virginia/guidance.ts` at `e6367e3ee4a41a1d6baa4dc2294c699c0f23c5f0`

## Crosswalk result

All three routes use `SALVAGE_SPECIFIC_ASSETS`. None uses `REUSE_AS_IS`, so `crosswalks.json` contains zero Category A route crosswalks. Retaining a guidance family does not create an A branch or bind one of these stages to an existing Category A filing route.

## Evidence boundary

The worker branch starts at `227f095d5d1493feca56779cf60c6f177caebd61`. The dispatch manifest lives in follow-up commit `1fa0f3328a614f73330256bee5df75fc655e9d79`; workers read it as a control input and do not copy launch-control files onto their branches. The manifest names `data/rcap-grade-a/launch-control/GRADE_A_LAUNCH_STATUS.md`, which does not exist. The committed mirror is `docs/rcap/grade-a/launch-control/GRADE_A_LAUNCH_STATUS.md`; it reports HOLD, zero commercially eligible routes, and zero COMPLETE_PACKET_PROVEN families.
