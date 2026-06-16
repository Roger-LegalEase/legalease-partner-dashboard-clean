// South Dakota sample intake data for shadow-mode verification only. Synthetic
// data modeling a § 23A-3-27 adult arrest-record expungement where the entire
// case was formally dismissed more than one year ago. Not a real person or case.
export const sdSampleDocumentInputs = {
  partnerSlug: "demo-partner",
  intakeSessionId: "00000000-0000-0000-0000-000000000000",
  state: "SD",
  petitionerFirstName: "Sample",
  petitionerLastName: "Person",
  filingCourt: "South Dakota Second Judicial Circuit Court (Minnehaha County)",
  county: "Minnehaha",
  caseNumber: "CRI00-000000",
  arrestDate: "2023",
  arrestingAgency: "Sioux Falls Police Department",
  prosecutingAgency: "Minnehaha County State's Attorney",
  originalCharge: "Simple possession (charge formally dismissed)",
  highestCharge: "Class 1 misdemeanor",
  accusatoryInstrumentFiled: "yes",
  caseFormallyDismissed: "yes",
  dismissalDate: "2024",
  acquittalStatus: "no",
  pathway: "adult_arrest_record_expungement",
  feeWaiverRequest: "none"
};
