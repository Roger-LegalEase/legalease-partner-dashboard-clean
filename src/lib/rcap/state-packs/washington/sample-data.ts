// Washington sample intake data for shadow-mode verification only. Synthetic data
// modeling an adult gross-misdemeanor conviction vacation under RCW 9.96.060 where
// the sentence was completed more than three years ago. Not a real person or case.
export const waSampleDocumentInputs = {
  partnerSlug: "demo-partner",
  intakeSessionId: "00000000-0000-0000-0000-000000000000",
  state: "WA",
  petitionerFirstName: "Sample",
  petitionerLastName: "Person",
  courtType: "District Court",
  county: "King",
  caseNumber: "0X0-0-00000-0",
  chargeAndRcw: "Gross misdemeanor (non-violent, not DUI), RCW reference on file",
  offenseClass: "gross misdemeanor",
  disposition: "convicted",
  sentencingDate: "2019",
  releaseFromConfinementDate: "not applicable",
  supervisionEndDate: "2020",
  sentenceTermsComplete: "yes",
  pendingChargesCheck: "no",
  newConvictionLookback: "no new conviction in prior 3 years",
  duiPriorOffenseCheck: "not DUI / not a prior-offense alcohol-drug case",
  violentOrBarredOffenseCheck: "not a violent or barred offense",
  protectionOrderCheck: "no qualifying protection/no-contact order in effect",
  pathway: "misdemeanor_gross_misdemeanor_vacation",
  firearmRightsQuestion: "separate process if needed"
};
