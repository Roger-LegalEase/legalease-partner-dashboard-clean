// Wisconsin sample intake data for shadow-mode verification only. Synthetic data
// modeling an adult § 973.015 conviction where expungement was ordered at
// sentencing, there was no probation/incarceration, and the sentence was
// successfully completed (the CR-266/CR-267 execution route). Not a real person or
// case.
export const wiSampleDocumentInputs = {
  partnerSlug: "demo-partner",
  intakeSessionId: "00000000-0000-0000-0000-000000000000",
  state: "WI",
  petitionerFirstName: "Sample",
  petitionerLastName: "Person",
  county: "Dane",
  circuitCourtCaseNumber: "0000CM000000",
  chargeAndStatute: "Eligible misdemeanor (max imprisonment 6 years or less)",
  offenseClass: "misdemeanor",
  maximumImprisonment: "6 years or less",
  ageAtOffense: "22",
  sentencingDate: "2021",
  expungementOrderedAtSentencing: "yes",
  sentenceType: "fine and conditions (no probation, no incarceration)",
  sentenceCompletionDate: "2022",
  probationRevokedCheck: "not applicable",
  subsequentConvictionCheck: "no subsequent conviction before completion",
  certificateOfDischargeStatus: "not applicable (no probation/incarceration — use CR-266)",
  pathway: "adult_conviction_expungement_at_sentencing",
  feeNote: "verify CR-266 court-fee handling with the clerk"
};
