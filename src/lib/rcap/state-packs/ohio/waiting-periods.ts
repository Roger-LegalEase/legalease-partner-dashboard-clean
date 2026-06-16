// Ohio waiting periods. Sourced from the Ohio Sealing & Expungement — Wilma Agent
// Training Reference (Nationwide Record Clearing), sections 4-5 and 16,
// corroborated by Ohio Rev. Code §§ 2953.32, 2953.33, 2953.321, 2151.358. Adult
// conviction waits run from final discharge, not the conviction date.
export const ohWaitingPeriodNotes = {
  // Sealing (§ 2953.32)
  sealingMinorMisdemeanor: "Sealing (§ 2953.32): minor misdemeanor — 6 months after final discharge.",
  sealingMisdemeanor: "Sealing (§ 2953.32): misdemeanor — 1 year after final discharge.",
  sealingF4F5: "Sealing (§ 2953.32): F4 or F5 — 1 year after final discharge.",
  sealingOneOrTwoF3: "Sealing (§ 2953.32): one or two F3 convictions — 3 years after final discharge.",
  sealingSolicitingImproperCompensation:
    "Sealing (§ 2953.32): soliciting improper compensation (§ 2921.43) — 7 years after final discharge.",
  sealingFormerRegistrant:
    "Sealing (§ 2953.32): person formerly subject to Chapter 2950 registration — 5 years after registration requirements end/terminate.",
  // Expungement (§ 2953.32)
  expungementMinorMisdemeanor: "Expungement (§ 2953.32): minor misdemeanor — 6 months after final discharge.",
  expungementMisdemeanor: "Expungement (§ 2953.32): misdemeanor — 1 year after final discharge.",
  expungementFelony:
    "Expungement (§ 2953.32): felony — 10 years after the date the person first becomes eligible to apply for sealing for that felony.",
  // Bail forfeiture
  bailForfeitureSealing: "Misdemeanor bail forfeiture: sealing — any time after the bail-forfeiture entry.",
  bailForfeitureExpungement:
    "Misdemeanor bail forfeiture: expungement — generally 1 year after entry; 6 months for a minor misdemeanor.",
  // Non-conviction (§ 2953.33)
  notGuilty: "Non-conviction (§ 2953.33): not guilty — any time after entry.",
  dismissal:
    "Non-conviction (§ 2953.33): dismissal — any time after the dismissal entry, subject to dismissal-without-prejudice / statute-of-limitations and multiple-charge limits.",
  noBill: "Non-conviction (§ 2953.33): grand-jury no bill — usually 2 years after the no bill is reported.",
  pardon: "Non-conviction (§ 2953.33): governor pardon — any time after the pardon or after conditions are met.",
  // Special routes
  marijuanaHashish:
    "Marijuana/hashish expungement (§ 2953.321): available on/after the March 20, 2026 effective date if statutory criteria are met; hearing 45-90 days after filing.",
  traffickingSurvivor:
    "Human-trafficking-survivor expungement (§§ 2953.36, 2953.521): may be filed at any time.",
  juvenileExpungement:
    "Juvenile expungement (§ 2151.358): sealed juvenile records are expunged 5 years after the sealing order or upon the person's 23rd birthday, whichever is earlier (earlier application possible).",
  clockStart:
    "Use FINAL DISCHARGE (probation, parole, post-release control, incarceration, and sentence-related fines complete), not just the conviction date, for adult conviction timing."
};
