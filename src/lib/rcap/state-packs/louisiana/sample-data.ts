// Louisiana sample intake data for shadow-mode verification only. Synthetic data
// modeling an art. 977 misdemeanor conviction expungement via the 5-year clean
// period. Not a real person or case.
export const laSampleDocumentInputs = {
  partnerSlug: "demo-partner",
  intakeSessionId: "00000000-0000-0000-0000-000000000000",
  state: "LA",
  petitionerFirstName: "Sample",
  petitionerLastName: "Person",
  parishOfArrest: "Orleans",
  arrestingAgency: "New Orleans Police Department",
  arrestDate: "2018",
  originalArrestCharge: "Misdemeanor theft (La. R.S. placeholder)",
  docketNumber: "000-000",
  courtParish: "Orleans Parish",
  finalDisposition: "Convicted; sentence completed",
  dispositionType: "convicted",
  convictionClass: "misdemeanor",
  sentenceCompletionDate: "2019",
  pathway: "misdemeanor_conviction_expungement",
  daCertification: "no felony conviction during the 5-year period; no pending felony bill/indictment",
  rightToReviewRapSheet: "obtained from Louisiana State Police / BCII"
};
