// Ohio sample intake data for shadow-mode verification only. Synthetic data
// modeling a § 2953.32 adult misdemeanor conviction sealing with the 1-year wait
// after final discharge met. Not a real person or case.
export const ohSampleDocumentInputs = {
  partnerSlug: "demo-partner",
  intakeSessionId: "00000000-0000-0000-0000-000000000000",
  state: "OH",
  applicantFirstName: "Sample",
  applicantLastName: "Person",
  countyAndCourt: "Franklin County Municipal Court",
  caseNumber: "0000 CRB 000000",
  chargeAndStatute: "Misdemeanor theft (Ohio Rev. Code § 2913.02)",
  offenseDegree: "M1",
  finalDisposition: "Convicted",
  convictionSentenceDate: "2022",
  finalDischargeDate: "2023",
  sealingOrExpungementChoice: "sealing",
  pathway: "adult_conviction_sealing_expungement",
  openWarrantsPendingCharges: "none",
  biciRecordObtained: "yes (Ohio BCI)"
};
