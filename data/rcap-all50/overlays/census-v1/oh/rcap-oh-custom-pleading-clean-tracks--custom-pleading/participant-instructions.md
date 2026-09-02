# Ohio custom-pleading packet — participant instructions

This packet contains 4 statutory-content drafts and one unchanged official Ohio BCI request held as post-order companion evidence. The drafts are review artifacts. They are not statewide Ohio court forms and they are not filing-ready.

## What you must supply before filing

- **Name of court and local caption.** The pleading prints “LOCAL CAPTION MUST BE CONFIRMED” because no held source names a statewide Ohio caption; the participant supplies the caption used by the filing court the filing rule in these instructions names, and does not guess.
- **Date of arrest.** The pleading prints “[ARREST DATE TO BE CONFIRMED]” because the packet holds no arrest date; the participant reads it off the certified record and does not guess.
- **Date of disposition.** The pleading prints “[DISPOSITION DATE TO BE CONFIRMED]” because the packet holds no disposition date; the participant reads it off the certified record and does not guess.
- **Arresting agency.** The pleading prints “[ARRESTING AGENCY MUST BE CONFIRMED]” because the packet holds no agency name; the participant reads it off the certified record and does not guess.
- **Date of birth and Social Security Number, if the local court form requires them.** The pleading carries a note that these identifiers are added by the applicant where the local form or local rule requires them; the packet holds no value for either and writes neither.
- **Charge as it appears on the certified disposition.** The pleading prints “[CHARGE MUST BE CONFIRMED FROM THE CERTIFIED DISPOSITION]” because the packet holds no charge for this matter; the participant copies the charge off the certified disposition and does not guess.
- **Disposition as it appears on the certified disposition.** The pleading prints “[DISPOSITION MUST BE CONFIRMED FROM THE CERTIFIED DISPOSITION]” because the packet holds no disposition for this matter; the participant copies the disposition off the certified disposition and does not guess.
- **Statutory basis alleged for eligibility.** The pleading prints “[STATUTORY ELIGIBILITY BASIS MUST BE CONFIRMED AGAINST THE CITED STATUTE AND THE CERTIFIED RECORD]” because this packet does not decide eligibility and must not put its own non-certification sentence into a pleading's eligibility allegation; the participant, or a lawyer, states the statutory basis after reading the cited statute against the certified record.

## What you must obtain

- The certified disposition for the case, from the court that handled it.
- Your Ohio BCI criminal-history record.
- The current local application, caption and filing instructions from the court the filing rule below sends you to.

## Where this is filed

The compiled Ohio profile this repository holds, `src/lib/rcap-engine/compiled/profiles/OH-ohio.json`, states the filing rule for each route in this packet, and this packet states it rather than sending you to ask for it:

- **Ohio Rev. Code Sec. 2953.32.** File in the sentencing court for an Ohio conviction or in a court of common pleas for an out-of-state or federal conviction.
- **Ohio Rev. Code Sec. 2953.33.** File in the court where the case was pending, dismissed, resulted in not guilty, or where the grand jury no bill was reported.
- **Ohio Rev. Code Sec. 2953.35.** The application is filed in the sentencing court.

Ohio has no single mandatory statewide form packet. Get the current application, caption and filing instructions from that court, which may keep different packets for convictions and for non-convictions.

## What this costs

The same compiled Ohio profile carries a fee table keyed by statutory section, and this packet states the row for each route it carries:

- **Ohio Rev. Code Sec. 2953.32.** $50 application fee unless indigent, plus possible local court fee up to $50.
- **Ohio Rev. Code Sec. 2953.33.** Ohio Legal Help says no fee for dismissal, not-guilty and no-bill sealing.
- **Ohio Rev. Code Sec. 2953.35.** $50 unless indigent.

The waiver limb is indigency: where the applicant is indigent, the $50 application fee is not charged. The additional local court fee is permitted up to $50 and is not fixed by the statute, so ask the clerk of the filing court what that court charges and how it takes an indigency affidavit.

## Who is served

You serve nobody. On this scheme the court notifies the prosecutor and sets the hearing, and the compiled Ohio profile states the mechanism for each route in this packet:

- **Ohio Rev. Code Sec. 2953.32.** The court schedules a hearing, notifies the prosecutor at least 60 days before the hearing, and holds the hearing 45-90 days after filing. The prosecutor may object at least 30 days before the hearing, and victims may be heard if applicable.
- **Ohio Rev. Code Sec. 2953.33.** The court holds a hearing 45-90 days after filing, and the prosecutor may object.
- **Ohio Rev. Code Sec. 2953.35.** The court considers prosecutor objections and weighs the applicant's interest against government needs.

These drafts generate no certificate of service and you must not complete one. There is no service step for you to perform, so do not go looking for one.

## You sign; nothing here is signed for you

- You sign and date the application. The signature and date rules are left blank on purpose.
- Do not complete judge, clerk, prosecutor, agency, hearing, or order fields.
- The official Ohio BCI request is a post-order transmission aid, not your primary court filing. It is included unchanged and is not prefilled; it is not sent before a signed order exists.

## What this packet is not

This packet is not legal advice, is not a lawyer, and does not decide whether you are eligible. It does not guarantee any court outcome. Eligibility under the cited Ohio statutes, the same-act limitation in Ohio Rev. Code § 2953.61, waiting periods and every statutory exclusion all require review against the primary authority and your own record before you file. If any of that is unclear, stop and ask a lawyer or an Ohio legal-aid office.

Tracks in this packet: `oh_2953_32_sealing`, `oh_2953_32_expungement`, `oh_2953_33_nonconviction`, `oh_2953_35_firearm`. Commercial and runtime authority remain false.
