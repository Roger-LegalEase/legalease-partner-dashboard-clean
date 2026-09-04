# Ohio custom-pleading packet — participant instructions

This packet contains one statutory-content draft and one unchanged official Ohio BCI request held as post-order companion evidence. The drafts are review artifacts. They are not statewide Ohio court forms and they are not filing-ready.

## What you must supply before filing

- **Name of court and local caption.** The pleading prints “LOCAL CAPTION MUST BE CONFIRMED” because no held source names a statewide Ohio caption; the participant supplies the caption used by the filing court the filing rule in these instructions names, and does not guess.
- **Date of arrest.** The pleading prints “[ARREST DATE TO BE CONFIRMED]” because the packet holds no arrest date; the participant reads it off the certified record and does not guess.
- **Date of disposition.** The pleading prints “[DISPOSITION DATE TO BE CONFIRMED]” because the packet holds no disposition date; the participant reads it off the certified record and does not guess.
- **Arresting agency.** The pleading prints “[ARRESTING AGENCY MUST BE CONFIRMED]” because the packet holds no agency name; the participant reads it off the certified record and does not guess.
- **Date of birth and Social Security Number, if the local court form requires them.** The pleading carries a note that these identifiers are added by the applicant where the local form or local rule requires them; the packet holds no value for either and writes neither.
- **Ohio Rev. Code Sec. 2953.61 same-act charge schedule.** Paragraph 9 of this application promises a list of every charge arising from the same act, and Ohio Rev. Code Sec. 2953.61 makes that list decisive for whether the qualifying conviction can be expunged at all. The packet holds no charge list and never guesses one; the attachment schedule names it as a document the participant assembles from the certified record and files with the application.

## What you must obtain

- The certified disposition for the case, from the court that handled it.
- Your Ohio BCI criminal-history record.
- The certified **charging document** — the complaint, indictment or information — as well as the disposition, from the clerk of the sentencing court. Sec. 2953.321 requires evidence that the offence falls within it, and the substance, the quantity and the Ohio Rev. Code Sec. 2925.11 division are what that evidence has to show.
- The current local application, caption and filing instructions from the court the filing rule below sends you to.

## What you must do with them before you file

- **Compare every Ohio case against the BCI record.** Check your answer to "What other Ohio cases do you have, in any court?" against the BCI criminal-history record and correct the packet if they disagree. The BCI record is not a statutory attachment, but it is the only practical way to assemble the full docket that Ohio Rev. Code Sec. 2953.61 makes decisive.
- **Compare the quantity against the charging document.** Check your answer to "How much was involved, according to the charge or the court record?" against the certified disposition and charging document, and correct the packet if they disagree.
- **Have the fifty dollar filing fee, or your indigency showing, ready for the clerk at filing.** The amount and the waiver limb are stated under "What this costs" below.

## Where this is filed

The compiled Ohio profile this repository holds, `src/lib/rcap-engine/compiled/profiles/OH-ohio.json`, states the filing rule for each route in this packet, and this packet states it rather than sending you to ask for it:

- **Ohio Rev. Code Sec. 2953.321.** Apply to the sentencing court. The application identifies the applicant and the offence, includes evidence that the offence falls within Sec. 2953.321, and requests expungement.

Ohio has no single mandatory statewide form packet. Get the current application, caption and filing instructions from that court, which may keep different packets for convictions and for non-convictions.

## What this costs

The compiled Ohio profile and the committed legal-design track registry (`data/record-clearing/legal-design-track-registry.json`, track `oh_marijuana_expungement`) both state this route's fee, and this packet states it rather than sending you to ask for it:

- **Ohio Rev. Code Sec. 2953.321.** Fifty dollars unless indigent. Indigency excuses the fee under Sec. 2953.321(G), which also directs thirty dollars of the fee to the state treasury, half of that credited to the Attorney General Reimbursement Fund, and twenty dollars to the county general revenue fund. No held source fixes an additional local court fee for this section; ask the clerk of the sentencing court whether that court charges one and how it takes an indigency affidavit.

## Who is served

You serve nobody. On this scheme the court notifies the prosecutor and sets the hearing, and the compiled Ohio profile and the committed track registry both state the mechanism for this route:

- **Ohio Rev. Code Sec. 2953.321.** The court notifies the prosecutor of the hearing and the prosecutor may object by filing an objection with the court before the date set for the hearing. The hearing is held 45 to 90 days after filing. Sec. 2953.321 sets no sixty-day notice period and no thirty-day objection deadline; those figures come from Sec. 2953.32 and do not govern this route. No held source states a separate participant service act for this section.

These drafts generate no certificate of service and you must not complete one. There is no service step for you to perform, so do not go looking for one.

## You sign; nothing here is signed for you

- You sign and date the application. The signature and date rules are left blank on purpose.
- Do not complete judge, clerk, prosecutor, agency, hearing, or order fields.
- The official Ohio BCI request is a post-order transmission aid, not your primary court filing. It is included unchanged and is not prefilled; it is not sent before a signed order exists.

## Where self-help ends

This packet does not decide whether you are eligible, and no lawyer has reviewed your case in preparing it. **Stop and take your case to an Ohio lawyer or an Ohio legal-aid office, rather than filing, if any of the following is true.** Each one is carried word for word from this route's own committed track record — `data/record-clearing/legal-design-track-registry.json`, track `oh_marijuana_expungement`, `selfHelpStopConditions` — and each is a point at which this packet stops being enough:

- Any question about the exact ORC 2925.11 division, or about the substance or quantity.
- Any hashish matter near the fifteen-gram line.
- Mixed cases with non-marijuana charges, which trigger ORC 2953.61.
- Any disposition on or after March 20, 2026, which is outside the section.
- Any incident that produced more than one charge with different dispositions, which triggers ORC 2953.61.
- Pending criminal proceedings or open warrants.
- Prosecutor objection, and any victim objection where applicable.
- Choosing between sealing and expungement, which is a legal judgment with different waits and different exclusions.
- Immigration exposure.

The last of these is not a formality. Ohio expungement has no federal immigration effect, and the record may still be reachable in an immigration proceeding.

## What this packet is not

This packet is not legal advice, is not a lawyer, and does not decide whether you are eligible. It does not guarantee any court outcome. Eligibility under the cited Ohio statutes, the same-act limitation in Ohio Rev. Code § 2953.61, waiting periods and every statutory exclusion all require review against the primary authority and your own record before you file. If any of that is unclear, stop and ask a lawyer or an Ohio legal-aid office.

Tracks in this packet: `oh_marijuana_expungement`. Commercial and runtime authority remain false.
