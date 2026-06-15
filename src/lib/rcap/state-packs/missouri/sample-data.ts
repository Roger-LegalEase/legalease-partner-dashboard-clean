// Missouri sample intake data for shadow-mode verification only. Synthetic data
// modeling a § 610.140 general expungement of a misdemeanor conviction (1-year
// waiting period met). Not a real person or case.
export const moSampleDocumentInputs = {
  partnerSlug: "demo-partner",
  intakeSessionId: "00000000-0000-0000-0000-000000000000",
  state: "MO",
  petitionerFirstName: "Sample",
  petitionerLastName: "Person",
  county: "Jackson",
  municipality: "Kansas City",
  courtName: "Circuit Court of Jackson County",
  caseNumber: "1600-CR00000",
  chargeDate: "2021",
  originalCharge: "Misdemeanor stealing (Mo. Rev. Stat. § 570.030)",
  offenseLevel: "misdemeanor",
  disposition: "Guilty; sentence completed",
  dispositionCompletionDate: "2022",
  pathway: "general_expungement",
  finesRestitutionStatus: "paid",
  namedRecordHolders: "Circuit Clerk, Kansas City Police Department, Jackson County Prosecutor, MSHP central repository"
};
