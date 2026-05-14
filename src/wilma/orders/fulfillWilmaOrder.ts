import type {
  WilmaDocumentGenerationBackend,
  WilmaDocumentGenerationPayload,
  WilmaDocumentPrepOrder,
  WilmaOrderBackend,
  WilmaOrderSession,
  WilmaTrackerBackend
} from "@/wilma/orders/types";
import { trackWilmaEvent } from "@/wilma/analytics/trackWilmaEvent";

export async function fulfillWilmaOrder(
  order: WilmaDocumentPrepOrder,
  session: WilmaOrderSession,
  dependencies: {
    orderBackend: WilmaOrderBackend;
    documentGenerationBackend: WilmaDocumentGenerationBackend;
    trackerBackend: WilmaTrackerBackend;
    now?: () => Date;
  }
): Promise<WilmaDocumentPrepOrder> {
  if (order.status === "fulfilled" || order.status === "generating_documents") {
    return order;
  }

  const generating = await dependencies.orderBackend.updateOrderStatus({
    orderId: order.id,
    status: "generating_documents"
  });
  await trackWilmaEvent(dependencies.orderBackend, {
    event: "wilma_document_generation_started",
    wilmaSessionId: session.id,
    actorEmail: order.leadEmail,
    state: order.state,
    decisionStatus: "likely_eligible_for_document_prep",
    documentTarget: order.documentTarget,
    ruleVersion: order.ruleVersion,
    orderId: order.id,
    reasonCodes: order.reasonCodes,
    facts: session.facts,
    metadata: { orderId: order.id }
  });

  try {
    const payload = createDocumentGenerationPayload(generating, session);
    const documentResult = await dependencies.documentGenerationBackend.generateDocumentPrep(payload);
    const trackerResult = await dependencies.trackerBackend.createTrackerWorkspace({
      order: generating,
      payload
    });

    return dependencies.orderBackend.updateOrderStatus({
      orderId: order.id,
      status: "fulfilled",
      documentGenerationJobId: documentResult.documentGenerationJobId,
      trackerWorkspaceId: trackerResult.trackerWorkspaceId
    }).then(async (fulfilled) => {
      await trackWilmaEvent(dependencies.orderBackend, {
        event: "wilma_document_generation_succeeded",
        wilmaSessionId: session.id,
        actorEmail: order.leadEmail,
        state: order.state,
        decisionStatus: "likely_eligible_for_document_prep",
        documentTarget: order.documentTarget,
        ruleVersion: order.ruleVersion,
        orderId: order.id,
        reasonCodes: order.reasonCodes,
        facts: session.facts,
        metadata: {
          orderId: order.id,
          documentGenerationJobId: documentResult.documentGenerationJobId,
          trackerWorkspaceId: trackerResult.trackerWorkspaceId
        }
      });
      await trackWilmaEvent(dependencies.orderBackend, {
        event: "wilma_tracker_created",
        wilmaSessionId: session.id,
        actorEmail: order.leadEmail,
        state: order.state,
        decisionStatus: "likely_eligible_for_document_prep",
        documentTarget: order.documentTarget,
        ruleVersion: order.ruleVersion,
        orderId: order.id,
        reasonCodes: order.reasonCodes,
        facts: session.facts,
        metadata: {
          orderId: order.id,
          trackerWorkspaceId: trackerResult.trackerWorkspaceId
        }
      });
      return fulfilled;
    });
  } catch {
    await trackWilmaEvent(dependencies.orderBackend, {
      event: "wilma_document_generation_failed",
      wilmaSessionId: session.id,
      actorEmail: order.leadEmail,
      state: order.state,
      decisionStatus: "likely_eligible_for_document_prep",
      documentTarget: order.documentTarget,
      ruleVersion: order.ruleVersion,
      orderId: order.id,
      reasonCodes: order.reasonCodes,
      facts: session.facts,
      metadata: { orderId: order.id }
    });
    return dependencies.orderBackend.updateOrderStatus({
      orderId: order.id,
      status: "fulfillment_failed"
    });
  }
}

export function createDocumentGenerationPayload(
  order: WilmaDocumentPrepOrder,
  session: WilmaOrderSession
): WilmaDocumentGenerationPayload {
  return {
    source: "wilma",
    wilmaSessionId: session.id,
    orderId: order.id,
    state: order.state,
    documentTarget: order.documentTarget,
    leadEmail: order.leadEmail,
    facts: session.facts,
    decision: {
      status: "likely_eligible_for_document_prep",
      ruleVersion: order.ruleVersion,
      reasonCodes: order.reasonCodes
    }
  };
}
