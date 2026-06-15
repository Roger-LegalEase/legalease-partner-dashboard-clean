// New Mexico sample intake data for shadow-mode verification only. Synthetic data
// modeling a § 29-3A-5 conviction expungement of a misdemeanor (2-year waiting
// period met). Not a real person or case.
export const nmSampleDocumentInputs = {
  partnerSlug: "demo-partner",
  intakeSessionId: "00000000-0000-0000-0000-000000000000",
  state: "NM",
  petitionerFirstName: "Sample",
  petitionerLastName: "Person",
  county: "Bernalillo",
  judicialDistrict: "Second Judicial District",
  courtName: "Second Judicial District Court",
  caseNumber: "D-202-CR-0000-00000",
  arrestDate: "2021",
  arrestingAgency: "Albuquerque Police Department",
  districtAttorney: "Second Judicial District Attorney",
  originalCharge: "Misdemeanor (NMSA placeholder)",
  finalCharge: "Misdemeanor",
  convictionFlag: "yes",
  convictionLevel: "misdemeanor",
  disposition: "Convicted; sentence completed",
  sentenceCompletionDate: "2022",
  finesFeesPaid: "yes",
  restitutionStatus: "none ordered",
  pathway: "conviction_expungement",
  justiceServedStatement: "Employment and housing stability since sentence completion"
};
