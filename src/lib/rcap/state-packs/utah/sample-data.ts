// Utah sample intake data for shadow-mode verification only. Synthetic data
// modeling a traffic-conviction expungement petition (no BCI certificate required)
// under Utah Code Title 77, Chapter 40a. Not a real person or case.
export const utSampleDocumentInputs = {
  partnerSlug: "demo-partner",
  intakeSessionId: "00000000-0000-0000-0000-000000000000",
  state: "UT",
  petitionerFirstName: "Sample",
  petitionerLastName: "Person",
  filingCourt: "Utah Third District Court (Salt Lake County)",
  county: "Salt Lake",
  caseNumber: "000000000",
  chargeAndStatute: "Class C misdemeanor traffic offense",
  offenseLevel: "Class C misdemeanor (traffic)",
  disposition: "convicted",
  convictionDate: "2021",
  trafficOffenseClass: "Class C misdemeanor/infraction",
  trafficPendingCheck: "no pending traffic case, no pending traffic plea in abeyance, not on traffic probation",
  finesInterestPaid: "yes",
  restitutionPaid: "not applicable",
  pendingChargeCheck: "no",
  priorExpungements: "none",
  pathway: "traffic_expungement",
  feeWaiverRequest: "none"
};
