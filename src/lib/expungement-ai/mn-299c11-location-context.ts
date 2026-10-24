import "server-only";
import type { EngineProfile } from "@/lib/rcap-engine/contracts";
import type { ProfileQuestion } from "@/lib/expungement-ai/frontend/contracts";
import type { RegisteredSpecification } from "@/lib/rcap/grade-a/packet-specification";
import { contactRepresentationHash } from "@/lib/expungement-ai/contact-representation";
import memo from "../../../data/record-clearing/legal-design-intake/MN.memo.json";
import proof from "../../../data/record-clearing/production-factory/packet-proofs/rcap-mn-custom-pleading.json";
import manifest from "../../../data/rcap-ledger/completed-output-counsel-manifest.json";

export const MN_299C11_ROUTE = "arrest-identification-data-destruction-when-no-charges-were-filed-minn-stat-299c-11";
const family = manifest.families.find(row => row.familyId === "rcap-mn-custom-pleading");

/** Original GA14 Q-349904621014116bdccf. The retained agency demand has
 * no court venue. Its independent arrestingAgency and custodiansHoldingRecord
 * facts identify the arrest and actual recipients. Generic location stays
 * optional retained context and supplies neither fact, qualification nor authority.
 * This does not activate the separately held demand/intake implementation. */
export function mn299c11LocationIsContext(profile: EngineProfile | undefined,
  pathwayId: string | null, specification: RegisteredSpecification | null | undefined,
  current: { memo?: unknown; proof?: unknown; family?: unknown } = {}): boolean {
  const pathway = profile?.pathways.find(row => row.id === pathwayId);
  const plan = profile?.packetGenerator.pathways.find(row => row.pathwayId === pathwayId);
  const posture = pathway as { automatic?: unknown; filingRequired?: unknown; routeType?: unknown } | undefined;
  return profile?.jurisdiction.code === "MN" && pathwayId === MN_299C11_ROUTE
    && specification == null && posture?.automatic === false && posture.filingRequired === true
    && posture.routeType === "administrative" && pathway?.legalAuthority?.decisionId === "LD-MN-01"
    && pathway.legalAuthority.ruleId === "MN-299C.11-609A-SIX-MECHANISM-MAP"
    && pathway.legalAuthority.outcomeMode === "agency_application" && pathway.legalAuthority.paymentAuthority === "packet_checkout"
    && plan?.mode === "state_specific_custom_packet_from_source_rules" && plan.formMappingStatus === "custom_or_manual_mapping_required"
    && plan.formCandidates?.length === 0
    && contactRepresentationHash(profile) === "f779704436f10e0aabf0949877f3213af1900d5bf51729cec8397006e6a3f8bf"
    && contactRepresentationHash(current.memo === undefined ? memo : current.memo) === "f0e6fbc0b3082a8721be317442151023be3a31fcb597dd96c4dde4e76596644a"
    && contactRepresentationHash(current.proof === undefined ? proof : current.proof) === "dd40258cc16e3bef024ded22c951543470dd98fbd02747f767d7141965a0a486"
    && contactRepresentationHash(current.family === undefined ? family : current.family) === "f082fa2eb3966930ef87d9035159d372f24756f820dccab6339f00b852eefa3c";
}

export function mn299c11LocationContextQuestion<T extends ProfileQuestion>(question: T,
  profile: EngineProfile | undefined, pathwayId: string | null,
  specification: RegisteredSpecification | null | undefined): T {
  if (question.id !== "residency_or_location" || question.stage !== "packet_information"
    || question.type !== "text_or_unknown" || question.prompt !== "What city or location belongs with this matter?"
    || (question.options != null && question.options.length !== 0)
    || !mn299c11LocationIsContext(profile, pathwayId, specification)) return question;
  return { ...question, required: false, contextOnly: true, lifecyclePhase: "guidance_only" };
}
