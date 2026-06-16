// Massachusetts sample intake data for shadow-mode verification only. Synthetic
// data modeling an adult misdemeanor conviction sealing (§ 100A) with the 3-year
// wait met. Not a real person or case.
export const maSampleDocumentInputs = {
  partnerSlug: "demo-partner",
  intakeSessionId: "00000000-0000-0000-0000-000000000000",
  state: "MA",
  petitionerFirstName: "Sample",
  petitionerLastName: "Person",
  courtName: "Boston Municipal Court",
  docketNumber: "0000CR000000",
  offenseName: "Misdemeanor larceny (M.G.L. c. 266 placeholder)",
  offenseStatute: "M.G.L. c. 266 placeholder",
  offenseLevel: "misdemeanor",
  disposition: "Convicted",
  dispositionDate: "2021",
  sentenceCompletionDate: "2021",
  pathway: "adult_conviction_sealing",
  coriObtained: "yes (iCORI)"
};
