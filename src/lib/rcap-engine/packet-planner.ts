import "server-only";

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

  return {
    pathwayId,
    mode: plan.mode,
    formMappingStatus: plan.formMappingStatus,
    sourceFormIds: (plan.formCandidates ?? []).map((candidate) => `${profile.jurisdiction.code}:${candidate.relativePath}:${candidate.sha256}`),
    requiredInputIds: [...new Set([
      ...baseRequiredInputIds,
      ...routedExactPacketFactIds,
      ...registeredPacketFactIds
    ])],
    sourceRuleRefs: plan.sourceRuleRefs ?? [],
    packetReadyWhen: plan.packetReadyWhen ?? []
  };
}

export function isPacketPlanFulfillmentReady(plan: ScreeningPacketPlan | undefined) {
  if (!plan) return false;
  if (plan.mode === "automatic_relief_verification_and_guidance") return false;
  return plan.requiredInputIds.length > 0 && plan.sourceRuleRefs.length > 0 && plan.sourceFormIds.every((id) => id.includes(":"));
}
