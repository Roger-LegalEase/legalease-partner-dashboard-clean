import type { RcapIntakeSession, RcapPathwaySummary } from "./types";
import { rcapIntakeDisclaimer } from "./types";

export function generateRcapPathwaySummary(session: RcapIntakeSession): RcapPathwaySummary {
  const hasDocuments = session.hasDocuments === true;
  const needsRecordCheck =
    session.needsRecordCheck === true ||
    session.recordType === "not_sure_what_shows" ||
    session.caseOutcome === "not_sure";

  if (session.caseOutcome === "dismissed" || session.caseOutcome === "not_prosecuted" || session.recordType === "charged_not_convicted") {
    return {
      eligibilitySignal: hasDocuments ? "possible_pathway" : "needs_more_information",
      pathwaySummary: hasDocuments
        ? "Based on what you shared, there may be a possible record-clearing pathway to review with the program."
        : "Based on what you shared, there may be a possible pathway, but more case information may be needed before anyone can review next steps.",
      suggestedNextStep: hasDocuments
        ? "Share the basic case information with the partner program for a record-clearing review."
        : "Start with a record review or gather available case paperwork before the program reviews options.",
      recommendedService: hasDocuments ? "Wilma Intake" : "RecordShield",
      disclaimer: rcapIntakeDisclaimer
    };
  }

  if (session.caseOutcome === "convicted" || session.caseOutcome === "completed_sentence" || session.recordType === "past_conviction") {
    return {
      eligibilitySignal: needsRecordCheck ? "human_review_recommended" : "needs_more_information",
      pathwaySummary: "A past conviction may still have a pathway in some places, but it needs more information and human review.",
      suggestedNextStep: needsRecordCheck
        ? "A record review may be the right next step before any pathway is discussed."
        : "Have the partner program review the charge type, outcome, timing, and local rules before deciding what comes next.",
      recommendedService: "RecordShield",
      disclaimer: rcapIntakeDisclaimer
    };
  }

  if (needsRecordCheck || !hasDocuments) {
    return {
      eligibilitySignal: "needs_more_information",
      pathwaySummary: "More information may be needed before a pathway can be suggested.",
      suggestedNextStep: "A record review may be the right next step, especially if you are not sure what appears on your record.",
      recommendedService: "RecordShield",
      disclaimer: rcapIntakeDisclaimer
    };
  }

  return {
    eligibilitySignal: "human_review_recommended",
    pathwaySummary: "The information you shared should be reviewed by the partner program before any next step is chosen.",
    suggestedNextStep: "Ask the partner program to review the basic case details and local record-clearing options.",
    recommendedService: "Wilma Intake",
    disclaimer: rcapIntakeDisclaimer
  };
}
