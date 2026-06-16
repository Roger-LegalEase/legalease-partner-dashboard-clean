// Wisconsin waiting periods / timing. Sourced from the "Wisconsin Expungement —
// Wilma Agent Training Reference" (Nationwide Record Clearing), section 11,
// corroborated by Wis. Stat. § 973.015, § 938.355(4m), and § 165.84 / Wisconsin
// DOJ-CIB guidance. Wisconsin's adult expungement is governed by an at-sentencing
// order, not by a years-based waiting period. Citations are Wis. Stat. unless noted.
export const wiWaitingPeriodNotes = {
  adultAtSentencing:
    "Adult § 973.015 expungement: must be ORDERED AT SENTENCING (when the sentence is imposed). It takes effect only after successful sentence completion; the court generally cannot add it later.",
  adultWithProbationOrIncarceration:
    "Adult conviction with probation/incarceration: the certificate of discharge from the detaining/probationary authority triggers court expungement after successful completion — confirm it was forwarded to the clerk.",
  adultNoProbationNoIncarceration:
    "Adult conviction with no probation/incarceration: use CR-266 after successful completion, but only if expungement was ordered at sentencing.",
  youthfulInvasionOfPrivacy:
    "Mandatory youthful invasion-of-privacy route (§ 942.08): ordered at sentencing if statutory criteria met; effective after successful completion.",
  traffickingVictim:
    "Trafficking-victim prostitution route (§ 973.015(2m)): the motion may be filed after the conviction/adjudication/NGI finding, subject to due-diligence and safety considerations; not tied to a fixed waiting period.",
  dojCibArrestRemoval:
    "DOJ-CIB arrest fingerprint removal (§ 165.84): available after release without charge, no-file, dismissal, acquittal, or other clearing of ALL charges from the arrest event.",
  juvenile:
    "Juvenile adjudication expungement (§ 938.355(4m)): petition after reaching age 17 and satisfactorily completing the dispositional order.",
  successfulCompletion:
    "Successful completion (§ 973.015): no subsequent conviction before completion, probation not revoked, probation conditions satisfied, and sentence terms complete."
};
