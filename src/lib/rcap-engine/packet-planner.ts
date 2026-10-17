import { mnTwoCountyFactIds, mnTwoCountySourceContract } from "@/lib/expungement-ai/mn-two-county-source-facts";
import { isMontanaDeferredWithoutMmrtaForm } from "@/lib/rcap-engine/montana-deferred-facts";
import { isMissouriClosureGuidanceWithoutIdentityForm } from "@/lib/rcap-engine/missouri-closed-record-facts";
import { isMaineNonconvictionGuidanceWithoutCr218 } from "@/lib/rcap-engine/maine-nonconviction-facts";
import { isNy16059Packet, NY_PACKET_FACT_IDS } from "@/lib/expungement-ai/ny-16059-packet-facts";
import { NY_CASE_FACT_IDS } from "@/lib/expungement-ai/ny-16059-case-questions";
import "server-only";
import { isCaProp64Pathway } from "@/lib/expungement-ai/ca-prop64-choices";
import { CA_PROP64_LEGACY_IDS } from "@/lib/rcap-engine/california-prop64-facts";
import { CA_CONTACT_IDS } from "@/lib/expungement-ai/ca-prop64-contact-answer";
import { CA_PROP64_CAPTION_FACT_IDS } from "@/lib/expungement-ai/ca-prop64-caption-facts";

import type { EngineProfile, ScreeningPacketPlan } from "@/lib/rcap-engine/contracts";
import { isGeorgiaAgencyWithoutCounty } from "@/lib/rcap-engine/georgia-agency-county-context";
import { dcInnocenceLocationIsContext, DC_LEGACY_LOCATION } from "@/lib/rcap-engine/dc-innocence-location-context";
import { packetSpecificationFor, packetSpecificationRequiredFactIdsFor } from "@/lib/rcap/grade-a/packet-specification";

export type CompiledScreeningPacketPlan = ScreeningPacketPlan & { packetReadyWhen: string[] };

export function isMarylandAutomaticWithoutCounty(profile: EngineProfile, pathwayId: string): boolean {
  const pathway = profile.pathways.find((candidate) => candidate.id === pathwayId) as
    { automatic?: unknown; filingRequired?: unknown; routeType?: unknown } | undefined;
  const plan = profile.packetGenerator.pathways.find((candidate) => candidate.pathwayId === pathwayId);
  return profile.jurisdiction.code === "MD"
    && pathwayId === "automatic-expungement-under-crim-proc-10-105-1"
    && pathway?.automatic === true && pathway.filingRequired === false && pathway.routeType === "automatic"
    && plan?.mode === "automatic_relief_verification_and_guidance" && plan.formMappingStatus === "not_required";
}

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
  // MD.memo md_10105_1_automatic: statewide, no venue or participant filing.
  // Crim. Proc. § 10-105.1(b)-(d) assigns expungement and notices to the court.
  // The inherited county input came from an unscoped probation-violation rule
  // (rule-53), not this automatic route. Correct only its runtime dependency;
  // keep the compiled source and every saved county answer intact.
  const marylandAutomaticWithoutCounty = isMarylandAutomaticWithoutCounty(profile, pathwayId);
  const georgiaAgencyWithoutCounty = isGeorgiaAgencyWithoutCounty(profile, pathwayId)
    && !registeredPacketFactIds.includes("county");

  const dcLocationIsContext = dcInnocenceLocationIsContext(profile, pathwayId,
    packetSpecificationFor(`${profile.jurisdiction.code}:${pathwayId}`));

  const montanaDeferredWithoutMmrtaForm = isMontanaDeferredWithoutMmrtaForm(profile, pathwayId);
  const missouriClosureWithoutIdentityForm = isMissouriClosureGuidanceWithoutIdentityForm(profile, pathwayId);
  const maineNonconvictionWithoutCr218 = isMaineNonconvictionGuidanceWithoutCr218(profile, pathwayId);

  return {
    pathwayId,
    mode: plan.mode,
    formMappingStatus: maineNonconvictionWithoutCr218 || missouriClosureWithoutIdentityForm || montanaDeferredWithoutMmrtaForm ? "not_required" : plan.formMappingStatus,
    sourceFormIds: (maineNonconvictionWithoutCr218 || missouriClosureWithoutIdentityForm || montanaDeferredWithoutMmrtaForm ? [] : plan.formCandidates ?? []).map((candidate) => `${profile.jurisdiction.code}:${candidate.relativePath}:${candidate.sha256}`),
    requiredInputIds: [...new Set([
      ...scopedBaseRequiredInputIds,
      ...routedExactPacketFactIds,
      ...registeredPacketFactIds,
      ...(mnTwoCountySourceContract(profile, pathwayId, packetSpecificationFor(`${profile.jurisdiction.code}:${pathwayId}`)) ? mnTwoCountyFactIds(pathwayId) : []),
      ...(isCaProp64Pathway(profile.jurisdiction.code, pathwayId) ? [...CA_PROP64_CAPTION_FACT_IDS, ...CA_CONTACT_IDS] : []),
      ...(isNy16059Packet(profile.jurisdiction.code, pathwayId) ? [...NY_PACKET_FACT_IDS, ...NY_CASE_FACT_IDS] : [])
    ])].filter(id => (!isCaProp64Pathway(profile.jurisdiction.code, pathwayId) || !CA_PROP64_LEGACY_IDS.includes(id))
      && (!(marylandAutomaticWithoutCounty || georgiaAgencyWithoutCounty) || id !== "county")
      && (!dcLocationIsContext || id !== DC_LEGACY_LOCATION)),
    sourceRuleRefs: plan.sourceRuleRefs ?? [],
    packetReadyWhen: plan.packetReadyWhen ?? []
  };
}

export function isPacketPlanFulfillmentReady(plan: ScreeningPacketPlan | undefined) {
  if (!plan) return false;
  if (plan.mode === "automatic_relief_verification_and_guidance") return false;
  return plan.requiredInputIds.length > 0 && plan.sourceRuleRefs.length > 0 && plan.sourceFormIds.every((id) => id.includes(":"));
}
