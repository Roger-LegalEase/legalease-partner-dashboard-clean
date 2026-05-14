import type { WilmaDocumentGenerationBackend } from "@/wilma/orders/types";

type DocumentPrepModule = {
  requestWilmaDocumentGeneration?: (input: unknown) => Promise<{ documentGenerationJobId?: string }>;
  requestDocumentPrepHandoff?: (db: unknown, input: unknown) => Promise<unknown>;
};

export function createBackendWilmaDocumentGenerationAdapter(): WilmaDocumentGenerationBackend {
  return {
    async generateDocumentPrep(payload) {
      const documentPrepModule = (await import("@/lib/document-prep")) as DocumentPrepModule;

      if (documentPrepModule.requestWilmaDocumentGeneration) {
        return documentPrepModule.requestWilmaDocumentGeneration(payload);
      }

      if (documentPrepModule.requestDocumentPrepHandoff) {
        const prismaModule = (await import("@/lib/prisma")) as { prisma?: unknown; db?: unknown; default?: unknown };
        await documentPrepModule.requestDocumentPrepHandoff(prismaModule.prisma ?? prismaModule.db ?? prismaModule.default, {
          wilmaSessionId: payload.wilmaSessionId,
          wilmaDecisionId: payload.orderId,
          paidAt: new Date()
        });
      }

      return { documentGenerationJobId: `wilma_document_generation_${payload.orderId}` };
    }
  };
}
