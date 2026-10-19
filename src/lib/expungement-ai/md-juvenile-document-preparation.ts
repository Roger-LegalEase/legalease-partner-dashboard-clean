import "server-only";
import { mdJuvenilePreparationModelFor } from "@/lib/expungement-ai/packet-information";
import { mdJuvenileDocumentFacts, MD_JUVENILE_SOURCE_SHA256 } from "@/lib/expungement-ai/md-juvenile-document-questions";
import type { ProtectedPacketVerificationRecord } from "@/lib/expungement-ai/verification-cas";

/** Called only after the existing owner/item/protected-record boundary. This
 * projection supplies the held source renderer; it creates no delivery authority. */
export function mdJuvenileProtectedDocumentPreparation(record: ProtectedPacketVerificationRecord) {
  const model = mdJuvenilePreparationModelFor(record);
  const snapshot = record.draftSnapshot;
  if (!model || !snapshot) return null;
  const answers = structuredClone(model.initialAnswers);
  // Keep conflicting raw maps in custody; none may silently win a source write.
  for (const id of model.recordClarificationIds ?? []) if (id !== "county") delete answers[id];
  const input = { routeKey: "MD:juvenile-expungement", answers,
    recordFactConfirmations: structuredClone(snapshot.dependencies.recordFactConfirmations ?? {}) };
  return {
    schemaVersion: "md-juvenile/protected-document-preparation/v1" as const,
    sourceSha256: MD_JUVENILE_SOURCE_SHA256, revision: record.revision, recordHash: record.draftHash,
    input, documentFacts: mdJuvenileDocumentFacts(answers),
    conflictingOrUnconfirmedFactIds: model.recordClarificationIds ?? [],
    generationAllowed: false as const, reviewOnly: true as const,
    signatureCompleted: false as const, participantCompletedServiceCertification: false as const
  };
}
