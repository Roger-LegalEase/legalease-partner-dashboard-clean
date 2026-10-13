import { isNy16059Packet, NY_PACKET_FACT_IDS } from "@/lib/expungement-ai/ny-16059-packet-facts";
import "server-only";
import { isCaProp64Pathway } from "@/lib/expungement-ai/ca-prop64-choices";
import { CA_PROP64_LEGACY_IDS } from "@/lib/rcap-engine/california-prop64-facts";
import { CA_PROP64_CAPTION_FACT_IDS } from "@/lib/expungement-ai/ca-prop64-caption-facts";

import type { EngineProfile, ScreeningPacketPlan } from "@/lib/rcap-engine/contracts";
import { packetSpecificationRequiredFactIdsFor } from "@/lib/rcap/grade-a/packet-specification";

export type CompiledScreeningPacketPlan = ScreeningPacketPlan & { packetReadyWhen: string[] };

export function packetPlanForPathway(profile: EngineProfile, pathwayId: string): CompiledScreeningPacketPlan | undefined {
  const plan = profile.packetGenerator.pathways.find((candidate) => candidate.pathwayId === pathwayId);
  if (!plan) return undefined;
  const baseRequiredInputIds = plan.requiredInputIds ?? profile.packetGenerator.requiredInputs ?? [];
  const routedExactPacketFactIds = (profile.questionLifecycle?.exactPacketFactIds ?? [])
    .filter((id) => profile.questionLifecycle?.routeConsumers[id]?.includes(pathwayId));
  const registeredPacketFactIds = packetSpecificationRequiredFactIdsFor(
    `${profile.jurisdiction.code}:${pathwayId}`
  );
  // This specification used a victimhood identifier for a different, charged-conduct question.
  // Preserve the old position but never carry its answer into the separated fact.
  const scopedBaseRequiredInputIds = profile.jurisdiction.code === "MS"
    && pathwayId === "non-conviction-expungement-for-dismissal-no-disposition-or-acquittal"
    && registeredPacketFactIds.includes("ms_charged_trafficking_distribution_manufacture")
    && !registeredPacketFactIds.includes("trafficking_status")
    ? baseRequiredInputIds.map((id) => id === "trafficking_status" ? "ms_charged_trafficking_distribution_manufacture" : id)
    : baseRequiredInputIds;

  return {
    pathwayId,
    mode: plan.mode,
    formMappingStatus: plan.formMappingStatus,
    sourceFormIds: (plan.formCandidates ?? []).map((candidate) => `${profile.jurisdiction.code}:${candidate.relativePath}:${candidate.sha256}`),
    requiredInputIds: [...new Set([
      ...scopedBaseRequiredInputIds,
      ...routedExactPacketFactIds,
      ...registeredPacketFactIds,
      ...(isCaProp64Pathway(profile.jurisdiction.code, pathwayId) ? CA_PROP64_CAPTION_FACT_IDS : []),
      ...(isNy16059Packet(profile.jurisdiction.code, pathwayId) ? NY_PACKET_FACT_IDS : [])
    ])].filter(id => !isCaProp64Pathway(profile.jurisdiction.code, pathwayId) || !CA_PROP64_LEGACY_IDS.includes(id)),
    sourceRuleRefs: plan.sourceRuleRefs ?? [],
    packetReadyWhen: plan.packetReadyWhen ?? []
  };
}

export function isPacketPlanFulfillmentReady(plan: ScreeningPacketPlan | undefined) {
  if (!plan) return false;
  if (plan.mode === "automatic_relief_verification_and_guidance") return false;
  return plan.requiredInputIds.length > 0 && plan.sourceRuleRefs.length > 0 && plan.sourceFormIds.every((id) => id.includes(":"));
}
