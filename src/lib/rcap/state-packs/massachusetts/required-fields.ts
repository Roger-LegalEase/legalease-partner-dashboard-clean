import type { MaPathway } from "./pathways";

// Required-field keys derived from the Massachusetts Sealing & Expungement — Wilma
// Agent Training Reference (the § 100A/§ 100I criteria and the record-request /
// intake decision tree in sections 11 and 13). These describe the data each
// Massachusetts pathway needs; they are not a field map to the Trial Court PDFs
// (no field map exists yet) and no renderer is wired.
export type MaDocumentFieldKey =
  | "petitionerName"
  | "priorNames"
  | "dateOfBirth"
  | "adultOrJuvenile"
  | "courtName"
  | "docketNumber"
  | "offenseName"
  | "offenseStatute"
  | "offenseLevel"
  | "disposition"
  | "dispositionDate"
  | "sentenceCompletionDate"
  | "pendingChargesCheck"
  | "newConvictionsInWaitingPeriod"
  | "outOfStateFederalRecords"
  | "under21Check"
  | "recordCountCheck"
  | "activeInvestigationCheck"
  | "section100JExclusionCheck"
  | "section100KGround"
  | "marijuanaOnlyCheck"
  | "sexOffenseRegistrationCheck"
  | "firearmOffenseCheck"
  | "cwofCheck"
  | "coriObtained"
  | "doNotSealRequest";

export const maRequiredFields: Record<MaPathway, MaDocumentFieldKey[]> = {
  adult_conviction_sealing: [
    "petitionerName",
    "priorNames",
    "dateOfBirth",
    "courtName",
    "docketNumber",
    "offenseName",
    "offenseStatute",
    "offenseLevel",
    "disposition",
    "dispositionDate",
    "sentenceCompletionDate",
    "pendingChargesCheck",
    "newConvictionsInWaitingPeriod",
    "outOfStateFederalRecords",
    "sexOffenseRegistrationCheck",
    "firearmOffenseCheck",
    "coriObtained"
  ],
  non_conviction_sealing: [
    "petitionerName",
    "dateOfBirth",
    "courtName",
    "docketNumber",
    "offenseName",
    "disposition",
    "dispositionDate",
    "doNotSealRequest",
    "coriObtained"
  ],
  juvenile_sealing: [
    "petitionerName",
    "dateOfBirth",
    "adultOrJuvenile",
    "courtName",
    "docketNumber",
    "offenseName",
    "disposition",
    "sentenceCompletionDate",
    "newConvictionsInWaitingPeriod",
    "coriObtained"
  ],
  time_based_expungement: [
    "petitionerName",
    "dateOfBirth",
    "courtName",
    "docketNumber",
    "offenseName",
    "offenseLevel",
    "under21Check",
    "recordCountCheck",
    "sentenceCompletionDate",
    "section100JExclusionCheck",
    "activeInvestigationCheck",
    "outOfStateFederalRecords",
    "coriObtained"
  ],
  non_time_based_expungement: [
    "petitionerName",
    "dateOfBirth",
    "courtName",
    "docketNumber",
    "offenseName",
    "disposition",
    "section100KGround",
    "coriObtained"
  ],
  marijuana_expungement: [
    "petitionerName",
    "dateOfBirth",
    "courtName",
    "docketNumber",
    "offenseName",
    "offenseStatute",
    "marijuanaOnlyCheck",
    "disposition"
  ],
  needs_review: ["offenseName", "disposition", "offenseLevel"]
};

export const maFieldLabels: Record<MaDocumentFieldKey, string> = {
  petitionerName: "Petitioner full legal name",
  priorNames: "Prior names",
  dateOfBirth: "Date of birth",
  adultOrJuvenile: "Whether the case is adult or juvenile/youthful-offender",
  courtName: "Court name",
  docketNumber: "Docket number",
  offenseName: "Offense name",
  offenseStatute: "Offense statute",
  offenseLevel: "Offense level (misdemeanor / felony; unknown is treated as misdemeanor)",
  disposition:
    "Disposition (conviction, CWOF, dismissal, nolle prosequi, not guilty, no bill, no probable cause, pending)",
  dispositionDate: "Disposition date",
  sentenceCompletionDate: "Sentence/probation/parole/custody completion date",
  pendingChargesCheck: "Whether any charges are pending",
  newConvictionsInWaitingPeriod:
    "Whether there were new guilty findings/convictions during the waiting period (minor motor-vehicle excepted)",
  outOfStateFederalRecords: "Whether there are out-of-state/federal records in the lookback period",
  under21Check: "Whether all offenses occurred before the person's 21st birthday (time-based expungement)",
  recordCountCheck: "Whether the person has not more than 2 records (time-based expungement)",
  activeInvestigationCheck:
    "Whether the petitioner is currently the subject of an active criminal investigation (§ 100I)",
  section100JExclusionCheck:
    "Whether the record involves a § 100J exclusion (death/serious injury, dangerous weapon, sex offense, OUI, firearms, restraining-order violation, domestic A&B, elderly/disabled victim)",
  section100KGround:
    "The § 100K ground (false ID, identity theft, offense no longer a crime, law-enforcement/witness/court error, or fraud)",
  marijuanaOnlyCheck: "Whether the record was marijuana-only and the conduct is now decriminalized/legalized",
  sexOffenseRegistrationCheck:
    "Whether a sex offense / sex-offender registration applies (affects sealing wait and eligibility)",
  firearmOffenseCheck: "Whether a firearms offense applies (generally not sealable under § 100A)",
  cwofCheck: "Whether the disposition is a CWOF (flag for review)",
  coriObtained: "Whether the Massachusetts CORI has been obtained (iCORI)",
  doNotSealRequest: "Whether the defendant has requested NOT to seal (§ 100C)"
};
