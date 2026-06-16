// South Carolina sample intake data for shadow-mode verification only. Synthetic
// data modeling a § 17-22-950 summary court non-conviction expungement (charge
// nolle prossed in municipal court). Not a real person or case.
export const scSampleDocumentInputs = {
  partnerSlug: "demo-partner",
  intakeSessionId: "00000000-0000-0000-0000-000000000000",
  state: "SC",
  petitionerFirstName: "Sample",
  petitionerLastName: "Person",
  courtLevel: "summary court (municipal)",
  county: "Richland",
  courtName: "Columbia Municipal Court",
  caseNumber: "0000-0000000",
  chargeAndStatute: "Petit larceny (summary court charge)",
  dispositionType: "nolle prossed",
  fingerprintedFlag: "yes",
  preliminaryHearingDismissalFlag: "no",
  relatedPendingChargesCheck: "none",
  pathway: "summary_court_non_conviction",
  solicitorOffice: "Fifth Judicial Circuit Solicitor's Office",
  sledRapSheet: "obtained from SLED",
  certifiedDisposition: "obtained from the summary court"
};
