import type {
  ExpungementReadinessInput,
  ExpungementReadinessOutput,
  ExpungementReadinessStatus,
  NormalizedRecordItem
} from "@/lib/expungement/types";

const disclaimer =
  "This deterministic readiness screen is not legal advice, does not determine eligibility, and should be reviewed by a qualified attorney.";

export function evaluateCAExpungementReadiness(input: ExpungementReadinessInput): ExpungementReadinessOutput {
  const records = input.normalizedReport.records;
  const reasons: string[] = [];
  const missingInformation: string[] = [];
  const disqualifiers: string[] = [];

  if (records.length === 0) {
    return {
      state: "CA",
      status: "insufficient_information",
      reasons: ["No record items were provided for deterministic review."],
      missingInformation: ["At least one normalized record item is required."],
      disqualifiers,
      recommendedDocuments: recommendedDocuments(),
      disclaimer
    };
  }

  records.forEach((record, index) =>
    collectRecordFindings(record, index, reasons, missingInformation, disqualifiers)
  );

  return {
    state: "CA",
    status: selectStatus(records, missingInformation, disqualifiers),
    reasons,
    missingInformation,
    disqualifiers,
    recommendedDocuments: recommendedDocuments(),
    disclaimer
  };
}

function collectRecordFindings(
  record: NormalizedRecordItem,
  index: number,
  reasons: string[],
  missingInformation: string[],
  disqualifiers: string[]
): void {
  const label = record.charge ? `Record ${index + 1} (${record.charge})` : `Record ${index + 1}`;

  if (!record.recordType || record.recordType === "unknown") {
    missingInformation.push(`${label}: record type is missing or unknown.`);
  }
  if (!record.disposition && !record.dispositionCategory) {
    missingInformation.push(`${label}: disposition information is missing.`);
  }
  if (!record.offenseDate) {
    missingInformation.push(`${label}: offense date is missing.`);
  }
  if (record.pendingCase || record.dispositionCategory === "pending") {
    disqualifiers.push(`${label}: pending case or pending disposition requires attorney review.`);
    return;
  }
  if (record.recordType === "conviction" || record.dispositionCategory === "conviction") {
    reasons.push(`${label}: reported as a conviction, so the placeholder rule requires attorney review.`);
    return;
  }
  if (record.recordType === "arrest") {
    reasons.push(`${label}: reported as an arrest or non-conviction item; readiness remains provisional.`);
    return;
  }
  reasons.push(`${label}: available facts are not enough for a deterministic readiness conclusion.`);
}

function selectStatus(
  records: NormalizedRecordItem[],
  missingInformation: string[],
  disqualifiers: string[]
): ExpungementReadinessStatus {
  if (disqualifiers.length > 0 || missingInformation.length > 0) {
    return "needs_attorney_review";
  }
  const hasConviction = records.some(
    (record) => record.recordType === "conviction" || record.dispositionCategory === "conviction"
  );
  if (hasConviction) {
    return "needs_attorney_review";
  }
  const allNonConvictionArrests = records.every(
    (record) => record.recordType === "arrest" && record.dispositionCategory !== "conviction"
  );
  return allNonConvictionArrests ? "possibly_ready" : "needs_attorney_review";
}

function recommendedDocuments(): string[] {
  return [
    "Certified court docket or case summary",
    "Final disposition document",
    "Charging document or complaint",
    "Proof of sentence completion, if any sentence was imposed"
  ];
}
