import "server-only";
import { contactRepresentationHash as hash } from "@/lib/expungement-ai/contact-representation";
import { isNy16059Packet, NY_PACKET_FACT_IDS } from "@/lib/expungement-ai/ny-16059-packet-facts";
import { NY_CASE_FACT_IDS } from "@/lib/expungement-ai/ny-16059-case-questions";
import type { PacketVerificationSnapshot } from "@/lib/expungement-ai/types";
import type { ProtectedPacketDraftSnapshot } from "@/lib/expungement-ai/verification-cas";
import type { ScreeningPacketPlan } from "@/lib/rcap-engine/contracts";

const priorContracts = [
  { plan: "1bee8cc16edfc95d402d21ca181767764f2c6e10ea49c7599936932cf62f7c3e", required: "aacc22f3100df5ba2cecf4391128023ac3d4a9456e55cd044ad085338e666f71", added: [...NY_PACKET_FACT_IDS, ...NY_CASE_FACT_IDS] },
  { plan: "d1dcc737857aa816c64f57579939f3dd43d1b5344ddab70d6b37fbb303783295", required: "21d5444c04de91a947652d7b3e4bf7e8afeef3563c3077a4eca68ed032dbedba", added: NY_CASE_FACT_IDS }
];

/** Exact fafc82a40 and f330ca64a prior plans. The existing protected reader validates record
 * hashes and current authority; this only projects newly missing packet facts. */
export function ny16059PacketPlanSuccessor<T extends PacketVerificationSnapshot | ProtectedPacketDraftSnapshot>(snapshot: T, plan: ScreeningPacketPlan | undefined): T | null {
  if (!isNy16059Packet(snapshot.jurisdiction, snapshot.pathwayId) || !plan || plan.pathwayId !== snapshot.pathwayId
    || snapshot.profileVersion !== "2026-06-19-source-conversion-1"
    || snapshot.profileSourceFingerprint !== "f69c70a88cf5d810cb49b83d572b070cade4a7e039b92b25f82cc68f647d4d99"
    || snapshot.profileAuthorityFingerprint !== "aeaa5c3b9d1071ad418c72da56ec63a0bf4fb6f8838293dd6dd9e3d5c106bf12"
    || hash(snapshot.serverFacts) !== hash({ jurisdiction: "NY", pathway_id: snapshot.pathwayId })
    || hash(snapshot.packetFamilyIdentifiers) !== hash({ mode: plan.mode, sourceFormIds: plan.sourceFormIds })) return null;
  const contract = priorContracts.find(candidate => hash(snapshot.packetPlan) === candidate.plan && hash(snapshot.requiredInputIds) === candidate.required);
  if (!contract) return null;
  const prior = { ...plan, requiredInputIds: plan.requiredInputIds.filter(id => !contract.added.includes(id)) };
  if (hash(prior) !== contract.plan || hash(plan.requiredInputIds) !== hash([...prior.requiredInputIds, ...contract.added])) return null;
  return { ...snapshot, packetPlan: { ...plan }, requiredInputIds: [...plan.requiredInputIds] };
}
