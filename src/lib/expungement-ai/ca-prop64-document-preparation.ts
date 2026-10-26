import "server-only";
import { caProp64ContactQuestions, caProp64ContactFacts } from "@/lib/expungement-ai/ca-prop64-contact-questions";
import { questionAnswerState } from "@/lib/expungement-ai/question-answer-state";
import { caProp64CaptionFacts } from "@/lib/expungement-ai/ca-prop64-caption-facts";
import { protectedPacketInformationModelFor } from "@/lib/expungement-ai/packet-information";
import { caProp64Choice, CA_PROP64_COMPLETED, CA_PROP64_CURRENT } from "@/lib/expungement-ai/ca-prop64-choices";
import { caProp64Section } from "@/lib/rcap-engine/california-prop64-facts";
import { toScreeningAnswers } from "@/components/expungement-ai/screening/answers";
import type { ProtectedPacketVerificationRecord } from "@/lib/expungement-ai/verification-cas";

/** Preparation uses the same validated protected model as owner editing.
 * This is a review renderer input, not admission to commercial fulfillment.
 * The caller must obtain the record through an authorized owner/custody read. */
export function caProp64ProtectedDocumentPreparation(record: ProtectedPacketVerificationRecord) {
  const model = protectedPacketInformationModelFor(record);
  if (!model || !model.packetPlan) return null;
  const caption = caProp64CaptionFacts(model.stateCode, model.pathwayId, model.initialAnswers);
  if (!caption) return null;
  const answers = toScreeningAnswers(model.initialAnswers);
  if (answers.ca_prop64_court_type !== "adult" || answers.ca_prop64_next_step !== "apply") return null;
  const branch = caProp64Choice("ca_prop64_branch", answers.ca_prop64_branch);
  const variantId = model.pathwayId === CA_PROP64_CURRENT && branch === "currently-serving petition"
    ? "hs-11361-8-currently-serving-petition"
    : model.pathwayId === CA_PROP64_COMPLETED && branch === "completed-sentence application"
      ? "hs-11361-8-completed-sentence-application" : null;
  if (!variantId) return null;
  const resolved = caProp64Section(answers);
  const recordSection = resolved && ["11357", "11358", "11359", "11360", "11362.1"].includes(resolved) ? resolved : undefined;
  const contact = caProp64ContactFacts(model.initialAnswers);
  return {
    schemaVersion: "ca-prop64/protected-document-preparation/v1" as const,
    pathwayId: model.pathwayId, revision: model.revision, capturedAt: model.capturedAt,
    facts: { ...caption.facts, ...contact.facts }, missingCaptionFactIds: caption.missing,
    missingContactFactIds: caProp64ContactQuestions(model.initialAnswers).filter(q => questionAnswerState(q, model.initialAnswers[q.id]) !== "known_valid").map(q => q.id),
    absentContactFactIds: contact.absent, unresolvedOptionalContactFactIds: contact.unresolvedOptional,
    variantId, recordSection, sectionResolution: resolved ?? null,
    generationAllowed: false as const, reviewOnly: true as const,
    remainingRequirements: ["Complete applicable filer and court contacts", "Source-bound completion review", "Qualified source, legal, language and output acceptance", "Authorized fulfillment and protected delivery"]
  };
}
