// Wisconsin disqualifying offenses and escalation/blocks. Sourced from the
// "Wisconsin Expungement — Wilma Agent Training Reference" (Nationwide Record
// Clearing), sections 4, 5, 7, 10, reflecting the § 973.015 at-sentencing
// requirement and felony exclusions, the DOJ-CIB removal limits, and the pardon
// limits. Screening notes, not an exhaustive legal test; verify the exact current
// Wis. Stat. text.
export const wiDisqualifyingOffenseNotes = [
  "At-sentencing requirement (Wis. Stat. § 973.015): adult conviction expungement must be ordered at sentencing. If it was not ordered then, the circuit court generally cannot revisit the decision later, so the conviction is likely not expungeable later (except via the trafficking-victim route). This is the biggest Wisconsin block.",
  "Adult basic-eligibility limits (§ 973.015): the person must have been under 25 at the offense and the maximum imprisonment must be 6 years or less; older offenders or higher-maximum offenses do not qualify for the standard adult route.",
  "Class H felony exclusions (§ 973.015): the court may not order expungement if the person has a prior felony, the offense is a violent offense, or the offense is stalking, certain child-abuse offenses, or sexual assault by school staff.",
  "Class I felony exclusions (§ 973.015): the court may not order expungement if the person has a prior felony, the offense is violent, or the offense is concealing the death of a child.",
  "Successful-completion blocks (§ 973.015): a subsequent conviction before completion, a probation revocation, or unsatisfied probation conditions prevent the expungement from taking effect even when it was ordered at sentencing.",
  "DOJ-CIB removal limits (§ 165.84): arrest fingerprint removal requires that the arrest ended in release without charge, no-file, dismissal, or acquittal AND that ALL charges from the arrest fingerprint event are cleared; if one charge resulted in conviction, removal may be blocked. A conviction ordered expunged by a court cannot be removed from the Wisconsin criminal-history repository.",
  "Pardon is not expungement: a Governor's pardon does not remove the arrest from the criminal-history record; do not treat a pardon as expungement.",
  "Out-of-scope matters: civil forfeitures, traffic citations, small claims, and civil cases are not covered by the Wisconsin criminal expungement statute.",
  "Escalation categories (legal review): any adult conviction where it is unclear whether expungement was ordered at sentencing; Class H/I felony eligibility and exclusion analysis; trafficking-victim relief; juvenile matters; arrest events where one charge resulted in conviction; pardon/rights-restoration questions; and firearm-rights, immigration, or professional-licensing questions.",
  "Scope limits: Wisconsin expungement removes only the court record of conviction from public court access and does not remove DOJ-CIB, police, district-attorney, DOT, FBI, or private-background records, restore firearm rights, or fix immigration consequences."
];
