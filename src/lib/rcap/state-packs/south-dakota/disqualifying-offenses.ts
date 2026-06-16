// South Dakota disqualifying offenses and escalation/blocks. Sourced from the
// South Dakota Expungement Reference for Wilma (Nationwide Record Clearing),
// sections 9, 10, 11, 12, 16, reflecting the SIS once-only limits, the drug
// deferred-route exclusions, the pardon limits, and the attorney/legal-aid
// referral triggers. Screening notes, not an exhaustive legal test; verify the
// exact current SDCL text.
export const sdDisqualifyingOffenseNotes = [
  "No broad adult conviction expungement: an adult conviction that is not clearly SIS-based, pardon-based, diversion-based, or minor-case automatic removal generally has NO South Dakota expungement route — escalate for attorney review.",
  "Suspended imposition of sentence limits (§§ 23A-27-13 to 23A-27-17): felony SIS is available only if the person has never before been convicted of a felony, and a person may not receive a second felony SIS if they already had one; the benefit is limited to once for felony SIS and once for misdemeanor SIS. SIS does not apply to offenses punishable by death or life imprisonment.",
  "Controlled-substance deferred route exclusions (§ 23A-27-53): not available if there are aggravating circumstances or if the person is serving a sentence with the executive branch; requires treatment completion and the specified plea — route to legal review.",
  "Pardon is not expungement (§ 24-14-11 / Chapter 24-14): a pardon may still count as a prior conviction for later sentencing, habitual-offender proceedings, and later DUI sentencing; sealing happens only through the Chapter 24-14 Board of Pardons and Paroles process.",
  "Minor-case automatic removal limits (§ 23A-3-34): blocked if court-ordered conditions are unpaid/unsatisfied or there is a new conviction within the 5-year period; even after removal the record may be used by the court or to enhance a later offense.",
  "Juvenile sealing blocks (§§ 26-7A-115 to 26-7A-116): the 1-year wait must have passed, there must be no later delinquency adjudication and no pending or instituted serious proceeding of the listed types, and the court must find rehabilitation; sealed juvenile records may still be used in later proceedings or sentencing.",
  "Escalation categories (legal review): any felony; any DUI, domestic violence, sex offense, child-victim offense, violence, firearm, or protection-order issue; compelling-necessity early filing within one year of dismissal; victim-objection or hearing-waiver issues; multiple arrests in multiple counties; federal, tribal, military, or out-of-state records; firearm-rights, immigration, licensing, or employment-disclosure questions; and juvenile trafficking / sexual-exploitation matters.",
  "Scope limits: South Dakota relief does not remove federal/FBI records, clear tribal/military/out-of-state convictions, automatically update private background-check copies, restore firearm rights, or fix immigration consequences; DCI retains nonpublic records and sealing is not destruction."
];
