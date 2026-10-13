import "server-only";
import { contactRepresentationHash as hash } from "@/lib/expungement-ai/contact-representation";
import { isNy16059Packet, NY_PACKET_FACT_IDS } from "@/lib/expungement-ai/ny-16059-packet-facts";
import type { PacketVerificationSnapshot } from "@/lib/expungement-ai/types";
import type { ProtectedPacketDraftSnapshot } from "@/lib/expungement-ai/verification-cas";
import type { ScreeningPacketPlan } from "@/lib/rcap-engine/contracts";

const priorPlanHash = "1bee8cc16edfc95d402d21ca181767764f2c6e10ea49c7599936932cf62f7c3e";
const priorRequiredHash = "aacc22f3100df5ba2cecf4391128023ac3d4a9456e55cd044ad085338e666f71";

/** Exact fafc82a40 prior plan. The existing protected reader validates record
 * hashes and current authority; this only projects newly missing packet facts. */
export function ny16059PacketPlanSuccessor<T extends PacketVerificationSnapshot | ProtectedPacketDraftSnapshot>(snapshot: T, plan: ScreeningPacketPlan | undefined): T | null {
  if (!isNy16059Packet(snapshot.jurisdiction, snapshot.pathwayId) || !plan || plan.pathwayId !== snapshot.pathwayId
    || snapshot.profileVersion !== "2026-06-19-source-conversion-1"
    || snapshot.profileSourceFingerprint !== "f69c70a88cf5d810cb49b83d572b070cade4a7e039b92b25f82cc68f647d4d99"
    || snapshot.profileAuthorityFingerprint !== "aeaa5c3b9d1071ad418c72da56ec63a0bf4fb6f8838293dd6dd9e3d5c106bf12"
    || hash(snapshot.packetPlan) !== priorPlanHash || hash(snapshot.requiredInputIds) !== priorRequiredHash
    || hash(snapshot.serverFacts) !== hash({ jurisdiction: "NY", pathway_id: snapshot.pathwayId })
    || hash(snapshot.packetFamilyIdentifiers) !== hash({ mode: plan.mode, sourceFormIds: plan.sourceFormIds })) return null;
  const prior = { ...plan, requiredInputIds: plan.requiredInputIds.filter(id => !NY_PACKET_FACT_IDS.includes(id)) };
  if (hash(prior) !== priorPlanHash || hash(plan.requiredInputIds) !== hash([...prior.requiredInputIds, ...NY_PACKET_FACT_IDS])) return null;
  return { ...snapshot, packetPlan: { ...plan }, requiredInputIds: [...plan.requiredInputIds] };
}
