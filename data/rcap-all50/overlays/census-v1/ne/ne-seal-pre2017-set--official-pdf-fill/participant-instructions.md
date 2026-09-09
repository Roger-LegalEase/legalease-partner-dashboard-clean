# Nebraska motion to seal a pre-2017 dismissal or acquittal - ne-seal-pre2017-set

## What this packet is

Motion to Seal a Pre-2017 Dismissal or Acquittal (Neb. Rev. Stat. § 29-3523(6)). In plain words: Ask a Nebraska court to seal a case that was dismissed before 2017.

The record states the controlling summary: "Where a case was dismissed before 1 January 2017 for one of the qualifying reasons, the court shall grant a motion to seal. This is the only conviction-adjacent Nebraska route with no judicial discretion. The resulting order places the records outside the public record, bars dissemination other than to criminal justice agencies, orders the notified agencies to seal, and reaches the transferring court. Section 29-3523(10) makes the provision retroactive regardless of the arrest, citation or referral date."

## Which version of this packet you file

- **Dismissed on the motion of the prosecuting attorney.** Ticked on the paper at CC 6:12, paragraph 2, "Were dismissed;"; CC 6:15.1, "on the motion of the prosecuting attorney;". Delivered as `canonical--dismissed-prosecutor-motion.pdf` and `boundary--dismissed-prosecutor-motion.pdf`.
- **Dismissed after completing a problem-solving-court programme.** Ticked on the paper at CC 6:12, paragraph 2, "Were dismissed;"; CC 6:15.1, "after completion of a program prescribed by a"; CC 6:15.1, "problem solving court.". Delivered as `canonical--dismissed-problem-solving-court.pdf` and `boundary--dismissed-problem-solving-court.pdf`.
- **Acquitted.** Ticked on the paper at CC 6:12, paragraph 2, "Resulted in an acquittal;"; CC 6:15.1, "after acquittal;". Delivered as `canonical--acquitted.pdf` and `boundary--acquitted.pdf`.

Nebraska decides this motion on two facts about your case: whether the case was
dismissed or you were acquitted, and which of the qualifying reasons in Neb.
Rev. Stat. § 29-3523(3)(c) describes the dismissal. Neither is decided by the
route, so the packet is delivered in one version per combination and you file
the one that matches your certified disposition. If none of them matches your
record, do not adapt one: that is the point at which to speak with a Nebraska
lawyer.

## Two motions, and which one is the primary

The record settles this itself and records that it still needs a clerk-level
answer. CC 6:12 is delivered as the primary motion because that is what the
Nebraska judiciary's own adult record sealing page links and what clerks are
expected to want. CC 6:15.1 is delivered as a conditional alternate because its
checkboxes map one-to-one onto the five qualifying dismissal reasons that
§ 29-3523(6) requires the court to find, which CC 6:12 does not capture. File
CC 6:12 unless the clerk asks for the other. Do not file both.

CC 6:12a, the judiciary's own instructions for completing CC 6:12, is included
in this packet unaltered.

## What the held record establishes

Every quoted line below is taken verbatim from the Nebraska legal-design record `data/record-clearing/legal-design-intake/NE.memo.json`, track `ne-seal-pre2017` (sha256 46103ae8848c7459ad921b38e72c8d19a38598b86bbf18a839d9d16236157750), and from the legal-design track registry `data/record-clearing/legal-design-track-registry.json`, packet set `ne-seal-pre2017-set` (sha256 555e5700c049608b0766cc7f5f65adfa748bbd32fae790d2220652bf08b958dc). Where those records do not establish something, this packet says so rather than guessing.

- Where to file: "File the motion in the existing case with the clerk of court."
- Filing fee: "Not established; the statewide schedule carries no line item for a motion within an existing criminal case."
- Fee waiver: "Available in principle under Neb. Rev. Stat. § 25-2301.01. The official DC 6:7.1 form does not fit a criminal case, which is recorded as a release blocker."
- Notice: "The court notifies the county or city attorney. The participant does not."
- Service: "None by the participant."
- Who signs: "The participant signs the motion."
- Notarization: "none required on the face of the form."
- Venue: "The court in which the case was filed, in county court or district court."
- Destination: Clerk of the court holding the case - "Filed in the existing case. The court, not the participant, notifies the county or city attorney, so no certificate of service applies to this motion."

## Who this route does not reach

- Convictions, which this subsection does not reach.
- Cases dismissed on or after 1 January 2017, which are sealed automatically and free of charge.
- Any dismissal reason outside the five qualifying categories in § 29-3523(3)(c).

## Do these before you file

1. (confirm_answer) Check your answer to "Is the case still showing publicly?" against Nebraska State Patrol criminal history report, and correct the packet if they disagree.
2. (confirm_answer) Check your answer to "On what date was the case dismissed or the acquittal entered?" against Nebraska court case search result, and correct the packet if they disagree.
3. (confirm_answer) Check your answer to "Which of these describes the dismissal — on the prosecutor's motion, after a hearing that is not being appealed, an acquittal, after a deferred judgment, or after you completed a drug court or other problem-solving court programme?" against Certified disposition, and correct the packet if they disagree. Applies when: Useful where the dismissal reason is not clear from the online record.
4. (complete_field) Signature on the motion — CC 6:12 or CC 6:15.1, signature block.
5. (complete_field) Obtaining the signed order before leaving the courthouse — After the hearing.
6. (sign) The participant signs the motion.
7. (notarize) none required on the face of the form.
8. (pay_fee) Not established; the statewide schedule carries no line item for a motion within an existing criminal case.
9. (apply_fee_waiver) Available in principle under Neb. Rev. Stat. § 25-2301.01. The official DC 6:7.1 form does not fit a criminal case, which is recorded as a release blocker. Applies when: Applies only when the participant cannot pay the filing fee.

## Documents to obtain

1. Nebraska State Patrol criminal history report - from Nebraska State Patrol. How: Request a limited criminal history search through nebraska.gov.
2. Nebraska court case search result - from Nebraska Judicial Branch online case search. How: Run a case search on the Nebraska courts site to confirm the case number and the disposition date.
3. Certified disposition - from Clerk of the court holding the case. How: Ask the clerk for the disposition. It is source data for the motion, not a filing requirement. Applies when: Useful where the dismissal reason is not clear from the online record.

## Blanks you must fill in

- None. Every blank on the two motions is either filled from your answers, protected until you sign, or classified as belonging to a branch of the form this packet does not take.

## Blanks this packet left blank on purpose, for you to complete by hand

Every one of these is deliberately empty. Complete them when you sign the motion
you are filing, and not before.

- Date beside your signature (CC 6:12 page 2)
- Date beside your signature (CC 6:15.1, party contact block)

## Facts this packet holds but could not print

- None. Every fact this packet holds printed complete inside its box.

## The caption on both motions

Both Nebraska motions leave the whole caption line - "IN THE ____ COURT OF ____
COUNTY, NEBRASKA" - to form fields rather than printing it. This packet wrote
it, and here is exactly how:

- CC-6-12 `TYPEOFCOURTRESULTS` was written "IN THE COUNTY COURT OF", which is the export value the source itself attaches to the option "COUNTY" in `TYPEOFCOURTDROPDOWN`. The source's own calculation is `event.value = this.getField("TYPEOFCOURTDROPDOWN").value;`; no JavaScript was executed.
- CC-6-12 `fullcountystatementRIGHT` was written "DOUGLAS COUNTY, NEBRASKA", which is the export value the source itself attaches to the option "DOUGLAS" in `DROPDOWNCOUNTY2`. The source's own calculation is `event.value = this.getField("DROPDOWNCOUNTY2").value;`; no JavaScript was executed.
- CC-6-15.1 `TYPEOFCOURTRESULTS` was written "IN THE COUNTY COURT OF", which is the export value the source itself attaches to the option "COUNTY" in `TYPEOFCOURTDROPDOWN`. The source's own calculation is `event.value = this.getField("TYPEOFCOURTDROPDOWN").value;`; no JavaScript was executed.
- CC-6-15.1 `fullcountystatementRIGHT` was written "DOUGLAS COUNTY, NEBRASKA", which is the export value the source itself attaches to the option "DOUGLAS" in `DROPDOWNCOUNTY2`. The source's own calculation is `event.value = this.getField("DROPDOWNCOUNTY2").value;`; no JavaScript was executed.

Check the printed caption against your own court papers before you file. If it
is wrong, the motion is addressed to the wrong court.

## Controls this packet removed rather than printed

The source marks these widgets as never printing. Flattening them anyway would
stamp a screen control onto a filed motion, so they were detached instead:

- CC-6-12 `TYPEOFCOURTDROPDOWN` (annotation flags /F 0)
- CC-6-12 `DROPDOWNCOUNTY2` (annotation flags /F 0)
- CC-6-15.1 `TYPEOFCOURTDROPDOWN` (annotation flags /F 0)
- CC-6-15.1 `DROPDOWNCOUNTY2` (annotation flags /F 0)

Nothing you need was removed: the value each of them carries is printed by its
companion caption field, named above.

## Components of this packet that carry no form

- **fee_waiver** (`ne-seal-pre2017-fee-waiver-4`, conditional). The registry gives this component outputStrategy custom_pleading and no officialFormId, and NE.memo.json records the reason as an open release blocker: DC 6:7.1's case-type box offers only Civil, Name change and Emancipation while this motion is filed in the existing criminal case, and there is no county-court in forma pauperis application form at all. Whether the branch should generate a custom affidavit under Neb. Rev. Stat. ss 25-2301 to 25-2310 is a counsel question the memo asks and does not answer. This build does not draft an affidavit to answer it.
- **hearing_instructions** (`ne-seal-pre2017-hearing-instructions-5`, required). The registry gives this component outputStrategy process_guidance and no officialFormId. It is guidance rather than a filed document, so it is delivered as written guidance in participant-instructions.md, quoting the record's own hearing script, rather than as a PDF component.

## At the hearing

The record publishes the script and this packet does not improve on it. Identify
yourself and your address, state that the charge was dismissed or that you were
acquitted, state that the record is still public and eligible to be sealed, then
stop.

Get a copy of the signed order before you leave the courthouse. The record is
explicit about why: "Once the record is sealed the participant cannot retrieve
it without a separate request to release sealed records."

## Service, and why there is no certificate of service in this packet

The record states: "None by the participant." and "The court notifies the county or city attorney. The participant does not." There is no
certificate of service in this packet because on this route you serve nobody.

## Notarization

The record states: "none required on the face of the form."

## A wording problem on CC 6:12 that the record flags

CC 6:12's closing sentence asks the court for an order sealing "my above
conviction", while the checkboxes above it cover dismissal and acquittal. The
official text is used unaltered. If the clerk or the judge asks about it, the
answer is that the form's closing sentence is the form's, and the checkbox you
ticked is the relief you are asking for.

## Open questions on this route that have not been answered

These are recorded on the legal record as release blockers. They do not stop you
filing, and you should know about them:

- Which form is primary, CC 6:12 or CC 6:15.1. Both are live, current and not retired on the official host. CC 6:15.1 is the better statutory fit because its five checkboxes map onto the five qualifying dismissal reasons that § 29-3523(6) requires the court to find, whereas CC 6:12 records only the disposition type. Against that, the judiciary's own adult record sealing page links only CC 6:12, and CC 6:12 carries the later revision. CC 6:12 is built as primary because that is what the judiciary directs and what clerks will expect, with CC 6:15.1 held as a conditional alternate. This needs a clerk-level answer from more than one county.
  Counsel question on the record: "Which motion do Nebraska clerks expect for a pre-2017 dismissal or acquittal, CC 6:12 or CC 6:15.1?"
- The filing fee for a petition or motion filed within an existing Nebraska criminal case is not established. The statewide Filing Fees and Court Costs schedule effective 1 July 2026 carries no line item for post-judgment petitions or motions within a criminal case. No fee figure may be displayed to a participant until a clerk-level answer is obtained from at least one county court and one district court.
  Counsel question on the record: "What filing fee, if any, attaches to a petition to set aside or a motion to seal filed in an existing Nebraska criminal case, in county court and in district court?"
- The fee-waiver branch has no fitting official form. DC 6:7.1's case-type box offers only Civil, Name change and Emancipation, and its official title is scoped to civil, appeals and emancipation matters, while a set-aside petition or sealing motion is filed in the existing criminal case. There is no county-court in forma pauperis application form at all: CC 8:1 is the order only. Neb. Rev. Stat. § 25-2301.01 nonetheless permits proceeding in forma pauperis in a civil or criminal case in any county or state court, so the mechanism exists and the form does not fit it. A custom affidavit and application under §§ 25-2301 to 25-2310 is the resolution rather than mis-scoping DC 6:7.1.
  Counsel question on the record: "Should the Nebraska fee-waiver branch generate a custom affidavit and application under Neb. Rev. Stat. §§ 25-2301 to 25-2310 rather than use DC 6:7.1, which is scoped to civil, appeals and emancipation matters?"

Other recorded notes:

- (counsel_classification_required) Whether an absolute discharge under Neb. Rev. Stat. § 29-1207, the six-month speedy-trial rule, is a dismissal as a result of a hearing that is not the subject of a pending appeal for the second checkbox on CC 6:15.1.
- (nonblocking_research_note) No statewide proposed sealing order form exists. An exhaustive search of the Master Forms List returns none, so the choice is between filing nothing and drafting one. The packet files nothing and tells the participant the court drafts the order.
- (nonblocking_research_note) CC 6:12's closing sentence asks for an order sealing the participant's conviction, which contradicts its own dismissal and acquittal checkboxes. The official text is used unaltered and the wording is flagged in participant instructions.

## Stop and get help

Stop using automated assistance and speak with a Nebraska lawyer if any of these
is true:

- Any signal that the prosecutor objects.
- A dismissal reason that does not clearly match one of the five categories, such as a dismissal for want of prosecution.
- A post-2016 case where the participant insists on filing rather than relying on the automatic route.
- A participant who wants the records physically destroyed.
- Multiple counties or courts involved.
- A participant who may later need the sealed record released.
