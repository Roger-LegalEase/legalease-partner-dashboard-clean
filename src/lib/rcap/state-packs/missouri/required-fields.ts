import type { MoPathway } from "./pathways";

// Required-field keys derived from the Missouri Expungement Reference for Wilma
// (the § 610.140 required petition information, the intake checklist in section
// 16, and the §§ 610.122-610.123 petition requirements). These describe the data
// each Missouri pathway needs; they are not a field map to the CR-series PDFs (no
// PDF field map exists yet) and no renderer is wired.
export type MoDocumentFieldKey =
  | "petitionerName"
  | "petitionerAliases"
  | "dateOfBirth"
  | "sex"
  | "race"
  | "driversLicenseNumber"
  | "currentAddress"
  | "addressAtArrest"
  | "cdlStatus"
  | "commercialVehicleAtTime"
  | "county"
  | "municipality"
  | "courtName"
  | "caseNumber"
  | "arrestDate"
  | "chargeDate"
  | "arrestingAgency"
  | "prosecutingAttorney"
  | "originalCharge"
  | "finalCharge"
  | "offenseLevel"
  | "disposition"
  | "dispositionCompletionDate"
  | "finesRestitutionStatus"
  | "pendingChargesCheck"
  | "newGuiltDuringWaitingPeriod"
  | "priorExpungementsCount"
  | "sameCourseOfConductFlag"
  | "namedRecordHolders"
  | "excludedOffenseCheck"
  | "fingerprintCard"
  | "identityTheftBasis"
  | "marijuanaDetails"
  | "feeWaiverRequest"
  | "publicWelfareStatement";

export const moRequiredFields: Record<MoPathway, MoDocumentFieldKey[]> = {
  general_expungement: [
    "petitionerName",
    "petitionerAliases",
    "dateOfBirth",
    "sex",
    "race",
    "driversLicenseNumber",
    "currentAddress",
    "county",
    "municipality",
    "courtName",
    "caseNumber",
    "chargeDate",
    "originalCharge",
    "finalCharge",
    "offenseLevel",
    "disposition",
    "dispositionCompletionDate",
    "finesRestitutionStatus",
    "pendingChargesCheck",
    "newGuiltDuringWaitingPeriod",
    "priorExpungementsCount",
    "sameCourseOfConductFlag",
    "namedRecordHolders",
    "excludedOffenseCheck",
    "publicWelfareStatement",
    "feeWaiverRequest"
  ],
  arrest_only_expungement: [
    "petitionerName",
    "dateOfBirth",
    "county",
    "arrestDate",
    "arrestingAgency",
    "originalCharge",
    "pendingChargesCheck",
    "newGuiltDuringWaitingPeriod",
    "namedRecordHolders"
  ],
  closed_record: [
    "petitionerName",
    "county",
    "courtName",
    "caseNumber",
    "disposition",
    "dispositionCompletionDate"
  ],
  false_information_arrest: [
    "petitionerName",
    "dateOfBirth",
    "county",
    "municipality",
    "arrestDate",
    "arrestingAgency",
    "originalCharge",
    "caseNumber",
    "cdlStatus",
    "commercialVehicleAtTime",
    "fingerprintCard",
    "namedRecordHolders"
  ],
  first_intoxication_offense: [
    "petitionerName",
    "dateOfBirth",
    "county",
    "courtName",
    "caseNumber",
    "originalCharge",
    "disposition",
    "dispositionCompletionDate",
    "cdlStatus",
    "priorExpungementsCount"
  ],
  marijuana_expungement: [
    "petitionerName",
    "dateOfBirth",
    "county",
    "courtName",
    "caseNumber",
    "originalCharge",
    "offenseLevel",
    "disposition",
    "marijuanaDetails",
    "excludedOffenseCheck"
  ],
  identity_theft_mistaken_identity: [
    "petitionerName",
    "dateOfBirth",
    "county",
    "courtName",
    "caseNumber",
    "originalCharge",
    "disposition",
    "identityTheftBasis"
  ],
  minor_in_possession_alcohol: [
    "petitionerName",
    "dateOfBirth",
    "county",
    "courtName",
    "caseNumber",
    "originalCharge",
    "disposition",
    "cdlStatus",
    "priorExpungementsCount"
  ],
  needs_review: ["originalCharge", "disposition", "offenseLevel"]
};

export const moFieldLabels: Record<MoDocumentFieldKey, string> = {
  petitionerName: "Petitioner full legal name",
  petitionerAliases: "Former names / aliases",
  dateOfBirth: "Date of birth",
  sex: "Sex (required § 610.140 petition field)",
  race: "Race (required § 610.140 petition field)",
  driversLicenseNumber: "Driver's license number and state, if applicable",
  currentAddress: "Current address",
  addressAtArrest: "Address at time of arrest, if relevant",
  cdlStatus: "CDL status (yes/no)",
  commercialVehicleAtTime: "Whether the person was operating a commercial motor vehicle at the time",
  county: "County",
  municipality: "Municipality where charged",
  courtName: "Court name",
  caseNumber: "Case number",
  arrestDate: "Arrest date",
  chargeDate: "Approximate date charged for each crime",
  arrestingAgency: "Arresting agency",
  prosecutingAttorney: "Prosecuting attorney / circuit attorney",
  originalCharge: "Original charge",
  finalCharge: "Final charge",
  offenseLevel: "Offense level (felony / misdemeanor / municipal violation / infraction)",
  disposition:
    "Disposition (dismissed, nolle prossed, not guilty, guilty, SIS, SES, conviction, probation, parole, completed sentence)",
  dispositionCompletionDate: "Date the authorized disposition (sentence/probation/parole) was completed",
  finesRestitutionStatus: "Whether fines, restitution, and court obligations are paid",
  pendingChargesCheck: "Whether any charges are pending",
  newGuiltDuringWaitingPeriod: "Whether there was any new misdemeanor/felony finding during the waiting period",
  priorExpungementsCount: "Number of prior Missouri expungements (felony/misdemeanor/ordinance) already granted",
  sameCourseOfConductFlag: "Whether multiple charges were part of the same course of criminal conduct",
  namedRecordHolders: "All agencies/entities to be named as defendants that may possess the records",
  excludedOffenseCheck: "Whether the offense is a § 610.140 excluded offense",
  fingerprintCard: "Fingerprint card (required for §§ 610.122-610.123 arrest expungement)",
  identityTheftBasis: "Basis for identity theft / mistaken identity (§ 610.145)",
  marijuanaDetails: "Marijuana details — amount, charge class, and any distribution-to-minor/violence/vehicle-intoxication flags",
  feeWaiverRequest: "Whether a poor-person fee waiver is requested",
  publicWelfareStatement:
    "Statement that the petitioner meets the public-safety and interests-of-justice factors (rebuttable presumption)"
};
