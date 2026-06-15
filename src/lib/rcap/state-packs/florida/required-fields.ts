import type { FlPathway } from "./pathways";

// Required-field keys derived from the Florida Wilma Agent Training Reference
// (the FDLE Certificate of Eligibility application requirements, the intake
// questions in section 16, and the petition/sworn-statement recitals). These
// describe the data each Florida pathway needs; they are not a field map to any
// specific FDLE/court PDF (no PDF field map exists yet) and no renderer is wired.
export type FlDocumentFieldKey =
  | "petitionerName"
  | "dateOfBirth"
  | "adultOrJuvenile"
  | "countyOfArrest"
  | "arrestType"
  | "arrestDate"
  | "arrestingAgency"
  | "chargeNameAndStatute"
  | "allCountsResolvedSame"
  | "disposition"
  | "adjudicationStatus"
  | "pleaEntered"
  | "supervisionComplete"
  | "priorAdjudicationCheck"
  | "sameCaseAdjudicationCheck"
  | "priorFloridaSealExpungeCheck"
  | "barredOffenseCheck"
  | "certifiedDisposition"
  | "fingerprints"
  | "notarizedSignature"
  | "fdleCertificate"
  | "prosecutorCertifiedStatement"
  | "swornStatement"
  | "proposedOrder"
  | "traffickingConnection"
  | "selfDefenseBasis"
  | "diversionCompletion"
  | "ageAndCleanPeriod"
  | "mistakenArrestBasis"
  | "stateAttorney";

export const flRequiredFields: Record<FlPathway, FlDocumentFieldKey[]> = {
  court_ordered_expunction: [
    "petitionerName",
    "dateOfBirth",
    "countyOfArrest",
    "arrestDate",
    "arrestingAgency",
    "chargeNameAndStatute",
    "disposition",
    "allCountsResolvedSame",
    "adjudicationStatus",
    "supervisionComplete",
    "priorAdjudicationCheck",
    "sameCaseAdjudicationCheck",
    "priorFloridaSealExpungeCheck",
    "barredOffenseCheck",
    "certifiedDisposition",
    "fingerprints",
    "notarizedSignature",
    "fdleCertificate",
    "prosecutorCertifiedStatement",
    "swornStatement",
    "proposedOrder",
    "stateAttorney"
  ],
  court_ordered_sealing: [
    "petitionerName",
    "dateOfBirth",
    "countyOfArrest",
    "arrestDate",
    "arrestingAgency",
    "chargeNameAndStatute",
    "disposition",
    "adjudicationStatus",
    "supervisionComplete",
    "priorFloridaSealExpungeCheck",
    "barredOffenseCheck",
    "certifiedDisposition",
    "fingerprints",
    "notarizedSignature",
    "fdleCertificate",
    "swornStatement",
    "proposedOrder",
    "stateAttorney"
  ],
  automatic_sealing: [
    "petitionerName",
    "dateOfBirth",
    "arrestDate",
    "chargeNameAndStatute",
    "disposition",
    "allCountsResolvedSame",
    "certifiedDisposition"
  ],
  human_trafficking_victim_expunction: [
    "petitionerName",
    "dateOfBirth",
    "countyOfArrest",
    "chargeNameAndStatute",
    "traffickingConnection",
    "swornStatement"
  ],
  lawful_self_defense_expunction: [
    "petitionerName",
    "dateOfBirth",
    "countyOfArrest",
    "chargeNameAndStatute",
    "disposition",
    "selfDefenseBasis",
    "prosecutorCertifiedStatement"
  ],
  juvenile_diversion_expunction: [
    "petitionerName",
    "dateOfBirth",
    "adultOrJuvenile",
    "chargeNameAndStatute",
    "diversionCompletion",
    "prosecutorCertifiedStatement",
    "fingerprints"
  ],
  early_juvenile_expunction: [
    "petitionerName",
    "dateOfBirth",
    "ageAndCleanPeriod",
    "chargeNameAndStatute",
    "certifiedDisposition",
    "prosecutorCertifiedStatement",
    "fingerprints"
  ],
  administrative_expunction: [
    "petitionerName",
    "dateOfBirth",
    "arrestDate",
    "arrestingAgency",
    "mistakenArrestBasis",
    "stateAttorney"
  ],
  needs_review: ["chargeNameAndStatute", "disposition", "adjudicationStatus"]
};

export const flFieldLabels: Record<FlDocumentFieldKey, string> = {
  petitionerName: "Petitioner / applicant full legal name",
  dateOfBirth: "Date of birth",
  adultOrJuvenile: "Whether this is an adult case or a juvenile case",
  countyOfArrest: "County where the arrest occurred",
  arrestType: "Whether the person was physically arrested or issued a Notice to Appear",
  arrestDate: "Arrest date or Notice to Appear date",
  arrestingAgency: "Arresting agency",
  chargeNameAndStatute: "Exact charge name and Florida statute",
  allCountsResolvedSame: "Whether all counts were resolved the same way",
  disposition:
    "Final disposition (no file, dismissed, nolle prosequi, not guilty, acquittal, withhold of adjudication, adjudicated guilty, diversion, or pending)",
  adjudicationStatus: "Whether adjudication was withheld or the person was adjudicated guilty",
  pleaEntered: "Whether the person pleaded guilty or no contest",
  supervisionComplete:
    "Whether the person is off all probation, court supervision, diversion, payment plan, and sentence conditions",
  priorAdjudicationCheck: "Whether the person has ever been adjudicated guilty of any criminal offense anywhere",
  sameCaseAdjudicationCheck:
    "Whether the person was adjudicated guilty/delinquent for acts from this arrest/incident",
  priorFloridaSealExpungeCheck: "Whether the person has ever had a Florida record sealed or expunged before",
  barredOffenseCheck: "Whether the charge is a § 943.0584 barred offense (note: a withhold can still be barred)",
  certifiedDisposition: "Clerk-certified disposition for each charge",
  fingerprints: "Fingerprints (required for the FDLE application)",
  notarizedSignature: "Signature notarized or made before a deputy clerk",
  fdleCertificate: "FDLE Certificate of Eligibility (valid 12 months)",
  prosecutorCertifiedStatement: "State Attorney / Statewide Prosecutor certified statement (expunction and certain routes)",
  swornStatement: "Sworn statement / affidavit that the person meets the requirements",
  proposedOrder: "Proposed order for the court",
  traffickingConnection:
    "Whether the offense was connected to trafficking, coercion, exploitation, or a trafficker's direction",
  selfDefenseBasis: "Whether the no-file/dismissal was because of lawful self-defense",
  diversionCompletion: "Proof of successful completion of an authorized diversion program",
  ageAndCleanPeriod: "Applicant age (18-20) and the 5-year clean period before application (early juvenile)",
  mistakenArrestBasis: "Basis that the arrest was made by mistake or contrary to law",
  stateAttorney: "State Attorney / Statewide Prosecutor to be served or to certify"
};
