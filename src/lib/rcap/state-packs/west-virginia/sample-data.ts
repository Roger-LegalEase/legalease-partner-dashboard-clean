// West Virginia sample intake data for shadow-mode verification only. Synthetic
// data modeling a single misdemeanor conviction expungement under W. Va. Code
// § 61-11-26 more than one year after sentence completion. Not a real person or
// case.
export const wvSampleDocumentInputs = {
  partnerSlug: "demo-partner",
  intakeSessionId: "00000000-0000-0000-0000-000000000000",
  state: "WV",
  petitionerFirstName: "Sample",
  petitionerLastName: "Person",
  court: "Circuit Court of Kanawha County",
  county: "Kanawha",
  caseNumber: "00-M-0000",
  arrestDate: "2022",
  arrestingAgency: "Charleston Police Department",
  prosecutingAttorney: "Kanawha County Prosecuting Attorney",
  originalCharge: "Eligible misdemeanor (non-excluded)",
  finalCharge: "Eligible misdemeanor (non-excluded)",
  statuteNumbers: "W. Va. Code (charge statute on file)",
  disposition: "convicted",
  convictionCount: "single misdemeanor",
  sentenceDate: "2022",
  supervisionCompletionDate: "2023",
  pendingChargesCheck: "no",
  priorExpungementCheck: "no prior § 61-11-26 or § 61-11-26a relief",
  exclusionScreening: "no excluded category (no violence/DV/sex/weapon/DUI/CDL)",
  pathway: "misdemeanor_conviction_expungement",
  feeOrWaiver: "civil filing fee plus $100 State Police processing fee"
};
