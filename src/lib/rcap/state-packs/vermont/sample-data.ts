// Vermont sample intake data for shadow-mode verification only. Synthetic data
// modeling a qualifying misdemeanor sealing under 13 V.S.A. § 7602(c) where the
// sentence was completed more than three years ago. Not a real person or case.
export const vtSampleDocumentInputs = {
  partnerSlug: "demo-partner",
  intakeSessionId: "00000000-0000-0000-0000-000000000000",
  state: "VT",
  petitionerFirstName: "Sample",
  petitionerLastName: "Person",
  filingCourt: "Vermont Superior Court, Criminal Division (Chittenden Unit)",
  county: "Chittenden",
  docketNumber: "000-0-00 Cncr",
  offenseAndStatute: "Qualifying misdemeanor (not an excluded category)",
  disposition: "convicted",
  convictionDate: "2020",
  ageAtOffense: "30",
  sentenceCompletionDate: "2021",
  restitutionSurchargesStatus: "paid",
  pendingChargesCheck: "no",
  qualifyingCrimeCheck: "qualifying misdemeanor, not excluded",
  prosecutorStipulation: "unknown — contact State's Attorney",
  pathway: "misdemeanor_sealing",
  feeWaiverRequest: "none"
};
