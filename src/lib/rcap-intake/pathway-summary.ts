import type { RcapIntakeSession, RcapPathwaySummary } from "./types";
import { rcapIntakeDisclaimer } from "./types";

export function generateRcapPathwaySummary(session: RcapIntakeSession): RcapPathwaySummary {
  if (isPennsylvania(session.state)) {
    return generatePennsylvaniaPathwaySummary(session);
  }

  if (isDc(session.state)) {
    return generateDcPathwaySummary(session);
  }

  if (isIllinois(session.state)) {
    return generateIllinoisPathwaySummary(session);
  }

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

function generatePennsylvaniaPathwaySummary(session: RcapIntakeSession): RcapPathwaySummary {
  const needsPatch = session.hasDocuments !== true || session.needsRecordCheck === true || session.caseOutcome === "not_sure" || session.recordType === "not_sure_what_shows";

  if (session.caseOutcome === "convicted" || session.caseOutcome === "completed_sentence" || session.recordType === "past_conviction") {
    return {
      eligibilitySignal: needsPatch ? "needs_more_information" : "possible_sealing_path",
      pathwaySummary: needsPatch
        ? "Based on what you shared, Pennsylvania limited access or Clean Slate sealing may be worth reviewing, but a PATCH report and court docket may be needed first."
        : "Based on what you shared, this may be a Pennsylvania limited access or Clean Slate sealing review path. A conviction is generally not called expungement unless a narrow pardon, age 70+, or similar pathway applies.",
      suggestedNextStep: "Continue to the Pennsylvania record relief form and use PATCH plus court records to confirm the county, docket, grade, disposition, waiting period, and restitution.",
      recommendedService: needsPatch ? "RecordShield" : "Wilma Intake",
      disclaimer: rcapIntakeDisclaimer
    };
  }

  if (session.caseOutcome === "dismissed" || session.caseOutcome === "not_prosecuted" || session.caseOutcome === "no_charges_filed" || session.caseOutcome === "not_guilty" || session.recordType === "charged_not_convicted" || session.recordType === "old_arrest") {
    return {
      eligibilitySignal: needsPatch ? "needs_more_information" : "possible_expungement_path",
      pathwaySummary: needsPatch
        ? "This may be a possible Pennsylvania expungement or Clean Slate path, but a PATCH report may help confirm what is actually showing."
        : "This may be a possible Pennsylvania expungement path if the case did not end in a conviction. Clean Slate may also apply automatically, but it should be verified and not treated as already complete.",
      suggestedNextStep: "Continue to the Pennsylvania form, gather PATCH and court details, and verify whether expungement, limited access, or Clean Slate review fits best.",
      recommendedService: needsPatch ? "RecordShield" : "Wilma Intake",
      disclaimer: rcapIntakeDisclaimer
    };
  }

  return {
    eligibilitySignal: "needs_more_information",
    pathwaySummary: "More information may be needed before a Pennsylvania expungement, limited access, Clean Slate, or needs-review pathway can be suggested.",
    suggestedNextStep: "A PATCH report or record review may help confirm the county, docket, grade, disposition, and whether any exclusion or restitution concern exists.",
    recommendedService: "RecordShield",
    disclaimer: rcapIntakeDisclaimer
  };
}

function generateDcPathwaySummary(session: RcapIntakeSession): RcapPathwaySummary {
  const needsRecordReview = session.needsRecordCheck === true || session.caseOutcome === "not_sure" || session.recordType === "not_sure_what_shows";

  if (session.caseOutcome === "convicted" || session.caseOutcome === "completed_sentence" || session.recordType === "past_conviction") {
    return {
      eligibilitySignal: needsRecordReview ? "human_review_recommended" : "possible_sealing_path",
      pathwaySummary: needsRecordReview
        ? "Based on what you shared, DC sealing may be worth reviewing, but a DC arrest record and case disposition may be needed first."
        : "Based on what you shared, a DC sealing motion based on interests of justice may be a possible pathway to review. This does not guarantee eligibility or an outcome.",
      suggestedNextStep: "Continue to the DC record relief form and use DC records to confirm the charge, outcome, timing, and prosecutor service.",
      recommendedService: needsRecordReview ? "RecordShield" : "Wilma Intake",
      disclaimer: rcapIntakeDisclaimer
    };
  }

  if (session.caseOutcome === "dismissed" || session.caseOutcome === "not_prosecuted" || session.caseOutcome === "no_charges_filed" || session.caseOutcome === "not_guilty" || session.recordType === "charged_not_convicted" || session.recordType === "old_arrest") {
    return {
      eligibilitySignal: needsRecordReview ? "needs_more_information" : "future_eligibility_update",
      pathwaySummary: "DC may have automatic sealing or a motion pathway to review. Automatic processing may be phased or scheduled and should not be treated as proof of completed record clearing.",
      suggestedNextStep: "Continue to the DC record relief form, request the MPD arrest record and DC Superior Court disposition, and confirm whether automatic or by-motion relief is the better review path.",
      recommendedService: needsRecordReview ? "RecordShield" : "Wilma Intake",
      disclaimer: rcapIntakeDisclaimer
    };
  }

  return {
    eligibilitySignal: "needs_more_information",
    pathwaySummary: "More information may be needed before a DC sealing, expungement, automatic relief, or needs-review pathway can be suggested.",
    suggestedNextStep: "A record review may help confirm the DC record, case result, and whether any open charges or excluded-offense concerns exist.",
    recommendedService: "RecordShield",
    disclaimer: rcapIntakeDisclaimer
  };
}

function generateIllinoisPathwaySummary(session: RcapIntakeSession): RcapPathwaySummary {
  const hasRapSheet = session.hasDocuments === true;
  const needsRapSheet = !hasRapSheet || session.needsRecordCheck === true || session.caseOutcome === "not_sure";

  if (session.caseOutcome === "convicted" || session.caseOutcome === "completed_sentence" || session.recordType === "past_conviction") {
    return {
      eligibilitySignal: needsRapSheet ? "needs_rap_sheet" : "possible_sealing_path",
      pathwaySummary: needsRapSheet
        ? "Based on what you shared, sealing may be worth reviewing, but an Illinois criminal history report can help confirm the charge, outcome, and timing."
        : "Based on what you shared, this may be the kind of record where sealing could be worth reviewing. Sealing is different from expungement and may hide the record from most public searches.",
      suggestedNextStep: "Continue to the Illinois form and use a RAP sheet or court record to confirm the details before anything is filed.",
      recommendedService: needsRapSheet ? "RecordShield" : "Wilma Intake",
      disclaimer: rcapIntakeDisclaimer
    };
  }

  if (
    session.caseOutcome === "dismissed" ||
    session.caseOutcome === "not_prosecuted" ||
    session.caseOutcome === "no_charges_filed" ||
    session.caseOutcome === "not_guilty" ||
    session.caseOutcome === "court_supervision" ||
    session.caseOutcome === "qualified_probation" ||
    session.recordType === "charged_not_convicted" ||
    session.recordType === "old_arrest"
  ) {
    return {
      eligibilitySignal: needsRapSheet ? "needs_rap_sheet" : "possible_expungement_path",
      pathwaySummary: needsRapSheet
        ? "This may be a possible expungement path, but a RAP sheet or court record may help confirm the details."
        : "This may be a possible expungement path, especially if the case did not end in a conviction. This does not guarantee eligibility or outcomes.",
      suggestedNextStep: "Continue to the Illinois form, gather available case details, and verify the record before filing.",
      recommendedService: needsRapSheet ? "RecordShield" : "Wilma Intake",
      disclaimer: rcapIntakeDisclaimer
    };
  }

  return {
    eligibilitySignal: "needs_more_information",
    pathwaySummary: "More information may be needed before an Illinois expungement or sealing pathway can be suggested.",
    suggestedNextStep: "A record review or RAP sheet may help confirm the next step.",
    recommendedService: "RecordShield",
    disclaimer: rcapIntakeDisclaimer
  };
}

function isIllinois(state?: string) {
  return state?.toLowerCase() === "illinois" || state?.toUpperCase() === "IL";
}

function isDc(state?: string) {
  const normalized = state?.trim().toLowerCase();
  return normalized === "dc" || normalized === "d.c." || normalized === "district of columbia" || normalized === "washington, dc";
}

function isPennsylvania(state?: string) {
  const normalized = state?.trim().toLowerCase();
  return normalized === "pa" || normalized === "pennsylvania";
}
