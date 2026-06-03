import type { DcPathway } from "./pathways";

export type DcDocumentFieldKey =
  | "petitionerName"
  | "caseNumber"
  | "charge"
  | "arrestingAgency"
  | "offenseDate"
  | "disposition"
  | "dispositionDate"
  | "sentenceCompletionDate"
  | "prosecutorOffice"
  | "serviceMethod"
  | "motionArgument"
  | "actualInnocenceStatement"
  | "interestsOfJusticeStatement"
  | "hasMpdRecord"
  | "hasCourtDisposition";

export const dcRequiredFields: Record<DcPathway, DcDocumentFieldKey[]> = {
  automatic_expungement: ["charge", "disposition", "hasMpdRecord", "hasCourtDisposition"],
  automatic_sealing: ["charge", "disposition", "hasMpdRecord", "hasCourtDisposition"],
  motion_actual_innocence_expungement: [
    "petitionerName",
    "charge",
    "arrestingAgency",
    "offenseDate",
    "disposition",
    "dispositionDate",
    "prosecutorOffice",
    "serviceMethod",
    "actualInnocenceStatement",
    "motionArgument"
  ],
  motion_interests_of_justice_sealing: [
    "petitionerName",
    "charge",
    "arrestingAgency",
    "offenseDate",
    "disposition",
    "dispositionDate",
    "sentenceCompletionDate",
    "prosecutorOffice",
    "serviceMethod",
    "interestsOfJusticeStatement",
    "motionArgument"
  ],
  needs_review: ["charge", "disposition", "hasMpdRecord", "hasCourtDisposition"]
};

export const dcFieldLabels: Record<DcDocumentFieldKey, string> = {
  petitionerName: "Movant full name",
  caseNumber: "DC Superior Court case number, if assigned",
  charge: "Charge or offense",
  arrestingAgency: "Arresting agency",
  offenseDate: "Offense or arrest date",
  disposition: "Case disposition",
  dispositionDate: "Disposition date",
  sentenceCompletionDate: "Sentence completion date",
  prosecutorOffice: "Prosecutor to serve",
  serviceMethod: "Service method",
  motionArgument: "Facts and argument for the statement of points and authorities",
  actualInnocenceStatement: "Actual innocence statement",
  interestsOfJusticeStatement: "Interests-of-justice statement",
  hasMpdRecord: "MPD arrest record / rap sheet",
  hasCourtDisposition: "DC Superior Court case disposition"
};
