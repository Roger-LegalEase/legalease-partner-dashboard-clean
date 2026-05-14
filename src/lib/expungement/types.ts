export type ExpungementReadinessStatus =
  | "likely_not_ready"
  | "possibly_ready"
  | "needs_attorney_review"
  | "insufficient_information"
  | "out_of_scope";

export type NormalizedRecordItem = {
  id?: string;
  recordType?: "arrest" | "charge" | "conviction" | "unknown";
  offenseLevel?: "civil" | "summary" | "misdemeanor" | "felony" | "traffic" | "unknown";
  charge?: string;
  jurisdiction?: string;
  state?: string;
  disposition?: string;
  dispositionCategory?: "conviction" | "dismissed" | "acquitted" | "not_guilty" | "dropped" | "no_charges" | "pending" | "unknown";
  diversionProgram?: "supervision" | "qualified_probation" | "ard" | "pbj" | "stet" | "nolle_prosequi" | "non_adjudication" | "pretrial_intervention";
  offenseDate?: string;
  dispositionDate?: string;
  sentenceCompleted?: boolean;
  sentenceCompletedDate?: string;
  supervisionCompleted?: boolean;
  supervisionCompletedDate?: string;
  waitingPeriodSatisfied?: boolean;
  firstOffender?: boolean;
  finesAndCostsPaid?: boolean;
  waiverSubmitted?: boolean;
  tags?: string[];
  pendingCase?: boolean;
};

export type NormalizedReportForExpungement = {
  records: NormalizedRecordItem[];
};

export type ExpungementReadinessInput = {
  state?: string;
  normalizedReport: NormalizedReportForExpungement;
};

export type ExpungementReadinessOutput = {
  state: string;
  status: ExpungementReadinessStatus;
  reasons: string[];
  missingInformation: string[];
  disqualifiers: string[];
  recommendedDocuments: string[];
  disclaimer: string;
};
