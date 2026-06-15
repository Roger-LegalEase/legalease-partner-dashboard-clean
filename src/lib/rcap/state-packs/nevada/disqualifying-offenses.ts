// Nevada disqualifying / excluded offenses and eligibility blocks. Sourced from
// the Nevada Record-Sealing Reference for Wilma (Nationwide Record Clearing),
// sections 3-4 and 12-16, reflecting the NRS 179.245 conviction exclusions and
// the clean-period / pending-charge blocks. Screening notes, not an exhaustive
// legal test; verify the exact current NRS text.
export const nvDisqualifyingOffenseNotes = [
  "NRS 179.245 conviction exclusions: a conviction may NOT be sealed if it is a crime against a child, a sexual offense, invasion of the home with a deadly weapon, certain felony DUI offenses, vehicular homicide / DUI-related homicide, certain felony boating-under-the-influence offenses, or certain boating DUI offenses — hard-stop or attorney review.",
  "Clean-period / pending-charge blocks (NRS 179.245): during the applicable waiting period the person must not have pending charges and must not have been convicted of another offense (minor moving or standing traffic violations excepted); open warrants and still-active probation/parole/suspended sentences also block sealing.",
  "Reentry-program limits (NRS 179.259): available only for a single nonviolent felony (no use or threatened use of force/violence); crimes against children and sexual offenses are excluded, and licensing boards / the Division of Insurance may still inspect these sealed records.",
  "Decriminalized-offense limit (NRS 179.271): the no-fee decriminalized-offense route does not apply to traffic offenses.",
  "Favorable-disposition repository removal limits (NRS 179A.160): not available where the person is a fugitive, the matter is in active prosecution, the disposition was a deferred-prosecution / plea-bargain type, the person has a prior felony or gross-misdemeanor conviction, or there was a new arrest/charge after the record at issue.",
  "Presumption limit (NRS 179.2445 / 176A.850): the rebuttable presumption in favor of sealing does not apply to a defendant who received a dishonorable discharge from probation.",
  "Scope limits: sealing does not destroy every copy, does not restore firearm rights without a qualifying pardon (NRS 179.285), and does not bind out-of-state, federal, tribal, or military agencies; authorized entities may still inspect sealed records under NRS 179.301."
];
