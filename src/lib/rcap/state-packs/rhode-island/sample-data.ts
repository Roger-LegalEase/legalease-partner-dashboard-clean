// Rhode Island sample intake data for shadow-mode verification only. Synthetic
// data modeling a § 12-1.3-2 first-offender single-misdemeanor conviction
// expungement with the 5-year period from completion of sentence met. Not a real
// person or case.
export const riSampleDocumentInputs = {
  partnerSlug: "demo-partner",
  intakeSessionId: "00000000-0000-0000-0000-000000000000",
  state: "RI",
  petitionerFirstName: "Sample",
  petitionerLastName: "Person",
  courtType: "District Court",
  filingCourt: "Rhode Island District Court, Sixth Division (Providence)",
  caseNumber: "00-0000-0000",
  bciNumber: "000000",
  chargingPoliceDepartment: "Providence Police Department",
  chargeAndStatute: "Misdemeanor shoplifting (R.I. Gen. Laws § 11-41-20)",
  offenseLevel: "misdemeanor",
  dispositionType: "convicted",
  convictionDate: "2017",
  sentenceCompletionDate: "2018",
  sealOrExpungeSelection: "expunge",
  firstOffenderStatus: "yes",
  crimeOfViolenceFlag: "no",
  financialObligationsStatus: "paid",
  pathway: "first_offender_conviction_expungement",
  noticeToAttorneyGeneral: "served at least 10 days before hearing",
  noticeToChargingPolice: "served at least 10 days before hearing"
};
