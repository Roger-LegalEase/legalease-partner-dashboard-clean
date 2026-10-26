import "server-only";
import { contactRepresentationHash as hash } from "@/lib/expungement-ai/contact-representation";
import { CA_CONTACT_IDS } from "@/lib/expungement-ai/ca-prop64-contact-answer";
import type { PacketVerificationSnapshot } from "@/lib/expungement-ai/types";
import type { ProtectedPacketDraftSnapshot } from "@/lib/expungement-ai/verification-cas";
import type { ScreeningPacketPlan } from "@/lib/rcap-engine/contracts";

const prior: Record<string, { plan: string; authority: string }> = {
  "prop-64-currently-serving-petition-11361-8": {
    plan: "9505701701a96ae84c421b786c5dd239f94be4e336f783c90be93cca123b6ab4",
    authority: "89f6c99c7cda8eabe8942ca4417647d05b4a13cc0532cfb57f07ab16616cf098"
  },
  "prop-64-completed-sentence-application-11361-8": {
    plan: "045095c795dd6f7bf2699e7d88dc57ea86cc2061d543c91c15d12044e35bfdb7",
    authority: "2c993fd1f44682c8f0c4c3f6473c54ebae68217cb7e351107947a04dd9748bb2"
  }
};

/** Exact pre-contact plan, for chaining the existing older caption/conduct successors.
 * No old approval hash changes and no raw answer acquires a new meaning. */
export function caProp64PriorContactPlan(plan: ScreeningPacketPlan | undefined): ScreeningPacketPlan | undefined {
  if (!plan || !prior[plan.pathwayId]) return undefined;
  const old = { ...plan, requiredInputIds: plan.requiredInputIds.filter(id => !CA_CONTACT_IDS.includes(id)) };
  if (hash(old) !== prior[plan.pathwayId].plan
    || hash(plan.requiredInputIds) !== hash([...old.requiredInputIds, ...CA_CONTACT_IDS])) return undefined;
  return old;
}

/** The caller validates the protected hashes and complete current authority.
 * This read projection adds missing packet requirements; it never verifies. */
export function caProp64ContactPlanSuccessor<T extends PacketVerificationSnapshot | ProtectedPacketDraftSnapshot>(snapshot: T, plan: ScreeningPacketPlan | undefined): T | null {
  const pin = snapshot.pathwayId ? prior[snapshot.pathwayId] : undefined;
  const old = caProp64PriorContactPlan(plan);
  if (!pin || !old || !plan || snapshot.jurisdiction !== "CA" || plan.pathwayId !== snapshot.pathwayId
    || snapshot.profileVersion !== "2026-06-19-source-conversion-1"
    || snapshot.profileSourceFingerprint !== "0fddd0751f1ac9d006244dd220f5eb99ba7cf2bbc3e0b3d26ec70b4680f789ac"
    || snapshot.profileAuthorityFingerprint !== pin.authority
    || hash(snapshot.serverFacts) !== hash({ jurisdiction: "CA", pathway_id: snapshot.pathwayId })
    || hash(snapshot.packetFamilyIdentifiers) !== hash({ mode: old.mode, sourceFormIds: old.sourceFormIds })
    || hash(snapshot.packetPlan) !== pin.plan || hash(snapshot.requiredInputIds) !== hash(old.requiredInputIds)) return null;
  return { ...snapshot, packetPlan: { ...plan }, requiredInputIds: [...plan.requiredInputIds] };
}
