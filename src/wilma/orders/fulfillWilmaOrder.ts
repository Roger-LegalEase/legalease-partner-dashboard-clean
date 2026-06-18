import type {
  WilmaDocumentGenerationBackend,
  WilmaDocumentGenerationPayload,
  WilmaDocumentPrepOrder,
  WilmaOrderBackend,
  WilmaOrderSession,
  WilmaTrackerBackend
} from "@/wilma/orders/types";
import { trackWilmaEvent } from "@/wilma/analytics/trackWilmaEvent";
import { emitLegalEaseOsEvent, type LegalEaseOsEventOptions } from "@/lib/legalese-os-events";

export async function fulfillWilmaOrder(
  order: WilmaDocumentPrepOrder,
  session: WilmaOrderSession,
  dependencies: {
    orderBackend: WilmaOrderBackend;
    documentGenerationBackend: WilmaDocumentGenerationBackend;
    trackerBackend: WilmaTrackerBackend;
    now?: () => Date;
    legalEaseOsConfigEnv?: LegalEaseOsEventOptions["configEnv"];
    legalEaseOsFetch?: LegalEaseOsEventOptions["fetcher"];
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
      await emitPacketGeneratedEvent(fulfilled, {
        configEnv: dependencies.legalEaseOsConfigEnv,
        fetcher: dependencies.legalEaseOsFetch,
        now: dependencies.now
      });
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
    const failed = await dependencies.orderBackend.updateOrderStatus({
      orderId: order.id,
      status: "fulfillment_failed"
    });
    await emitPacketGenerationFailureHealthEvent(failed, {
      configEnv: dependencies.legalEaseOsConfigEnv,
      fetcher: dependencies.legalEaseOsFetch,
      now: dependencies.now
    });
    return failed;
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

async function emitPacketGeneratedEvent(
  order: WilmaDocumentPrepOrder,
  options: LegalEaseOsEventOptions
): Promise<void> {
  try {
    await emitLegalEaseOsEvent(
      {
        source_system: "expungement_ai",
        event_type: "packet.generated",
        occurred_at: options.now?.() ?? new Date(),
        subject_type: "packet_generation",
        subject_ref: `wilma_packet:${order.id}:${order.documentTarget}`,
        jurisdiction: order.state,
        packet_type: order.documentTarget,
        metrics: {
          reason_code_count: order.reasonCodes.length,
          has_tracker_workspace: Boolean(order.trackerWorkspaceId),
          rule_version: order.ruleVersion
        },
        summary: "Document-prep packet generation completed.",
        recommended_operator_action: "Review packet generation trends if failures increase.",
        pii_classification: "hashed_reference_only"
      },
      options
    );
  } catch {
    // LegalEase OS telemetry must never affect fulfillment.
  }
}

async function emitPacketGenerationFailureHealthEvent(
  order: WilmaDocumentPrepOrder,
  options: LegalEaseOsEventOptions
): Promise<void> {
  try {
    await emitLegalEaseOsEvent(
      {
        source_system: "expungement_ai",
        event_type: "engine.health_changed",
        occurred_at: options.now?.() ?? new Date(),
        subject_type: "packet_generation",
        subject_ref: `wilma_packet_failure:${order.id}:${order.documentTarget}`,
        jurisdiction: order.state,
        packet_type: order.documentTarget,
        metrics: {
          status: "fulfillment_failed",
          reason_code_count: order.reasonCodes.length,
          rule_version: order.ruleVersion,
          failure_stage: "document_or_tracker_generation"
        },
        summary: "Document-prep fulfillment failed before packet completion.",
        recommended_operator_action: "Review fulfillment health and retry manually if needed.",
        pii_classification: "hashed_reference_only"
      },
      options
    );
  } catch {
    // LegalEase OS telemetry must never affect fulfillment failure handling.
  }
}
