import "server-only";
import { protectedPacketInformationModelFor } from "@/lib/expungement-ai/packet-information";
import type { ProtectedPacketVerificationRecord } from "@/lib/expungement-ai/verification-cas";
import { MN_PETITION_ROUTE } from "@/lib/expungement-ai/mn-two-county-source-facts";
import { getProfileByJurisdiction } from "@/lib/rcap-engine/profile-registry";
import { packetSpecificationFor } from "@/lib/rcap/grade-a/packet-specification";
import { mnPetitionCaptionFacts } from "./mn-petition-caption-facts";

/** Read-only held preparation; never current verification or delivery authority. */
export function mnHeldCaptionPreparationFor(verification: ProtectedPacketVerificationRecord) {
  if (verification.status === "verified"
    || verification.draftSnapshot.schemaVersion !== "expungement-ai/protected-packet-draft/v1") return null;
  const model = protectedPacketInformationModelFor(verification);
  if (!model || model.stateCode !== "MN" || model.pathwayId !== MN_PETITION_ROUTE
    || model.reviewSafety.safe || model.mnSourceStageCandidate?.authority !== false) return null;
  const preparation = {
    profile: getProfileByJurisdiction("MN"), pathwayId: model.pathwayId,
    specification: packetSpecificationFor(`MN:${model.pathwayId}`), answers: model.initialAnswers,
    confirmations: model.recordFactConfirmations,
    unresolved: [...(model.recordClarificationIds ?? []), ...model.questions.filter(question => question.savedAnswerNeedsClarification).map(question => question.id)]
  };
  try { mnPetitionCaptionFacts(preparation); } catch { return null; }
  return preparation;
}
