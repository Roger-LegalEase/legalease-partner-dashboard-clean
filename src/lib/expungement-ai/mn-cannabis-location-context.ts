import "server-only";
import type { EngineProfile } from "@/lib/rcap-engine/contracts";
import type { ProfileQuestion } from "@/lib/expungement-ai/frontend/contracts";
import type { RegisteredSpecification } from "@/lib/rcap/grade-a/packet-specification";
import { contactRepresentationHash } from "@/lib/expungement-ai/contact-representation";
import memo from "../../../data/record-clearing/legal-design-intake/MN.memo.json";
import proof from "../../../data/record-clearing/production-factory/packet-proofs/rcap-mn-guidance-implementation.json";
import manifest from "../../../data/rcap-ledger/completed-output-counsel-manifest.json";

export const MN_CANNABIS_ROUTE = "cannabis-automatic-or-board-reviewed-expungement-under-609a-055-06";
const family = manifest.families.find(row => row.familyId === "rcap-mn-guidance-implementation");

/** Original GA14 Q-ba282e26d07f75ee6899. The retained BCA automatic
 * cannabis and Board review stages both have no participant application or
 * filing venue. Generic location is raw optional context; it does not select
 * either source stage, establish cannabis record facts or grant authority.
 * Preserve the existing merged review/referral posture and source holds. */
export function mnCannabisLocationIsContext(profile: EngineProfile | undefined,
  pathwayId: string | null, specification: RegisteredSpecification | null | undefined,
  current: { memo?: unknown; proof?: unknown; family?: unknown } = {}): boolean {
  const pathway = profile?.pathways.find(row => row.id === pathwayId);
  const plan = profile?.packetGenerator.pathways.find(row => row.pathwayId === pathwayId);
  const posture = pathway as { automatic?: unknown; filingRequired?: unknown; routeType?: unknown } | undefined;
  return profile?.jurisdiction.code === "MN" && pathwayId === MN_CANNABIS_ROUTE
    && specification == null && posture?.automatic === false && posture.filingRequired === false
    && posture.routeType === "review" && pathway?.legalAuthority?.decisionId === "LD-MN-01"
    && pathway.legalAuthority.ruleId === "MN-299C.11-609A-SIX-MECHANISM-MAP"
    && pathway.legalAuthority.outcomeMode === "referral" && pathway.legalAuthority.paymentAuthority === "closed"
    && plan?.mode === "automatic_relief_verification_and_guidance" && plan.formMappingStatus === "custom_or_manual_mapping_required"
    && plan.formCandidates?.length === 0
    && contactRepresentationHash(profile) === "f779704436f10e0aabf0949877f3213af1900d5bf51729cec8397006e6a3f8bf"
    && contactRepresentationHash(current.memo === undefined ? memo : current.memo) === "f0e6fbc0b3082a8721be317442151023be3a31fcb597dd96c4dde4e76596644a"
    && contactRepresentationHash(current.proof === undefined ? proof : current.proof) === "3f1d44fd1ea890ae48c3efeaa909aa925e65711a7336e6a709800f8fefd87993"
    && contactRepresentationHash(current.family === undefined ? family : current.family) === "b46f4ff38bc21c74ecbc632c94a3bd70d1e0bfed2e1e4cfd21540c556f8665c2";
}

export function mnCannabisLocationContextQuestion<T extends ProfileQuestion>(question: T,
  profile: EngineProfile | undefined, pathwayId: string | null,
  specification: RegisteredSpecification | null | undefined): T {
  if (question.id !== "residency_or_location" || question.stage !== "packet_information"
    || question.type !== "text_or_unknown" || question.prompt !== "What city or location belongs with this matter?"
    || (question.options != null && question.options.length !== 0)
    || !mnCannabisLocationIsContext(profile, pathwayId, specification)) return question;
  return { ...question, required: false, contextOnly: true, lifecyclePhase: "guidance_only" };
}
