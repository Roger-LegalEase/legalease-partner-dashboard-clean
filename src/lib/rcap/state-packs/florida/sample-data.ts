// Florida sample intake data for shadow-mode verification only. Synthetic data
// modeling a § 943.0585 court-ordered expunction (dismissed non-conviction).
// Not a real person or case.
export const flSampleDocumentInputs = {
  partnerSlug: "demo-partner",
  intakeSessionId: "00000000-0000-0000-0000-000000000000",
  state: "FL",
  petitionerFirstName: "Sample",
  petitionerLastName: "Person",
  countyOfArrest: "Orange",
  arrestType: "physical arrest",
  arrestDate: "2021",
  arrestingAgency: "Orange County Sheriff's Office",
  chargeNameAndStatute: "Possession of cannabis (misdemeanor)",
  disposition: "Dismissed (non-conviction)",
  adjudicationStatus: "no adjudication",
  supervisionComplete: "yes",
  pathway: "court_ordered_expunction",
  fdleCertificate: "to be obtained (FDLE Certificate of Eligibility)",
  stateAttorney: "Office of the State Attorney, Ninth Judicial Circuit"
};
