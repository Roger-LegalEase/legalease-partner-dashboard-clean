// Nevada sample intake data for shadow-mode verification only. Synthetic data
// modeling an NRS 179.245 conviction sealing of a gross misdemeanor (2-year
// waiting period met). Not a real person or case.
export const nvSampleDocumentInputs = {
  partnerSlug: "demo-partner",
  intakeSessionId: "00000000-0000-0000-0000-000000000000",
  state: "NV",
  petitionerFirstName: "Sample",
  petitionerLastName: "Person",
  county: "Clark",
  courtType: "district",
  caseNumber: "C-00-000000-0",
  arrestDate: "2020",
  arrestingAgency: "Las Vegas Metropolitan Police Department",
  prosecutingAgency: "Clark County District Attorney",
  originalCharge: "Gross misdemeanor (NRS placeholder)",
  finalCharge: "Gross misdemeanor",
  disposition: "Convicted; sentence completed",
  convictionCategory: "gross misdemeanor",
  releaseFromCustodyDate: "2021",
  pathway: "conviction_record_sealing",
  verifiedCriminalHistory: "obtained from Nevada DPS Central Repository",
  agencyCustodianList:
    "Las Vegas Metropolitan Police Department, Clark County District Attorney, Nevada Central Repository (DPS)"
};
