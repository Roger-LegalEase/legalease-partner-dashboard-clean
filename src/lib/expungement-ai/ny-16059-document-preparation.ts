import "server-only";
import { contactRepresentationHash as hash } from "@/lib/expungement-ai/contact-representation";
import { protectedPacketInformationModelFor } from "@/lib/expungement-ai/packet-information";
import { questionAnswerState } from "@/lib/expungement-ai/question-answer-state";
import { isNy16059Packet, NY_PACKET_QUESTIONS, NY_PACKET_CONDITIONS } from "@/lib/expungement-ai/ny-16059-packet-facts";
import { NY_CURRENT_COMPONENTS, NY_CURRENT_SOURCE_CONTEXT } from "@/lib/expungement-ai/ny-16059-current-components";
import type { ProtectedPacketVerificationRecord } from "@/lib/expungement-ai/verification-cas";

/** Caller must obtain this record through authenticated owner/custody access.
 * The protected model validates hash/profile/route dependencies. This projection
 * grants no source, signature, service, legal, payment or generation authority. */
export function ny16059ProtectedDocumentPreparation(record: ProtectedPacketVerificationRecord) {
  const model = protectedPacketInformationModelFor(record);
  if (!model || !isNy16059Packet(model.stateCode, model.pathwayId)) return null;
  const snapshot = record.status === "verified" ? record.snapshot : record.draftSnapshot;
  if (!snapshot) return null;
  const recordHash = record.status === "verified" ? record.hash : record.draftHash;
  function owned(id: string) {
    const question = model!.questions.find(candidate => candidate.id === id);
    const sources = ["packetAnswers", "prefilledAnswers", "screeningAnswers"] as const;
    const source = sources.find(key => Object.hasOwn(model![key], id));
    if (!question || !source) return null;
    const raw = model![source][id];
    // A display normalization or derived value is not raw owner evidence.
    if (!Object.hasOwn(snapshot![source], id) || hash(snapshot![source][id]) !== hash(raw)) return null;
    if (questionAnswerState(question, raw) !== "known_valid") return null;
    const value = raw && typeof raw === "object" && !Array.isArray(raw) ? raw.value : raw;
    return { factId: id, source, raw: structuredClone(raw), value, revision: model!.revision, recordHash };
  }
  function choice(id: string) {
    const evidence = owned(id);
    const value = evidence?.value === "Yes" ? true : evidence?.value === "No" ? false : null;
    return { value, evidence, status: value === null ? "unresolved" : "owned_answer" };
  }
  const conditions = {
    second_covered_case: choice("ny_16059_additional_cases"),
    covered_case_alias_exists: choice("ny_16059_case_alias"),
    nysid_known: choice("ny_16059_nysid_known"),
    future_sealing_application_intended: choice("ny_16059_future_application")
  };
  const availableFacts = Object.fromEntries(NY_PACKET_QUESTIONS.flatMap(question => {
    const gate = NY_PACKET_CONDITIONS[question.id];
    if (gate && choice(gate).value !== true) return [];
    const evidence = owned(question.id);
    return evidence ? [[question.id, evidence]] : [];
  }));
  const missingFactIds = NY_PACKET_QUESTIONS.filter(question => {
    const gate = NY_PACKET_CONDITIONS[question.id];
    return (!gate || choice(gate).value !== false) && !owned(question.id);
  }).map(question => question.id);
  const prior16059 = owned("ny_16059_application_status"), prior16058 = owned("ny_16059_16058_grants");
  const priorApplication = (evidence: typeof prior16059, noneMeansNoApplication: boolean) => ({
    occurred: typeof evidence?.value === "string" && ["denied", "pending", "granted", "mixed"].includes(evidence.value) ? true
      : noneMeansNoApplication && evidence?.value === "none" ? false : null,
    evidence, attachmentIncluded: null
  });
  return {
    schemaVersion: "ny-16059/protected-document-preparation/v1" as const,
    pathwayId: model.pathwayId, revision: model.revision, recordHash,
    source: structuredClone(NY_CURRENT_SOURCE_CONTEXT), logicalComponents: structuredClone(NY_CURRENT_COMPONENTS),
    conditions, availableFacts, missingFactIds,
    priorApplications: { cpl16059: priorApplication(prior16059, true), cpl16058: priorApplication(prior16058, false) },
    unresolvedConditions: ["any_alias_exists", "defendant_alias_exists", "source_revision_review", "covered_vtl_conviction",
      "first_case_postsentence_incarceration", "second_case_postsentence_incarceration", "new_certificate_request_needed",
      "arrest_date_is_range", "incident_date_is_range", "source_specific_attachments", "actual_service", "actual_filing", "actual_copy_retention"],
    remainingRequirements: ["Each actual covered court and filing destination", "Case-specific sentence/release and offense facts",
      "Per-case certificate or explanation and actual attachments", "Required applicant statement", "Exact authentic source bytes and widget bindings",
      "Qualified source, legal, bilingual and output acceptance", "Actual signatures/service/filing by the responsible actors", "Authorized generation and protected delivery"],
    sourceVerified: false as const, conditionalBlankAcceptance: false as const,
    generationAllowed: false as const, reviewOnly: true as const
  };
}
