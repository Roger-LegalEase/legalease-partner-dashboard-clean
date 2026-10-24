import "server-only";
import type { EngineProfile } from "@/lib/rcap-engine/contracts";
import type { RegisteredSpecification } from "@/lib/rcap/grade-a/packet-specification";
import { contactRepresentationHash } from "@/lib/expungement-ai/contact-representation";
import { OH_JUVENILE_ROUTE, OH_JUVENILE_STAGE_IDS } from "@/lib/expungement-ai/oh-juvenile-stage-questions";
import memo from "../../../data/record-clearing/legal-design-intake/OH.memo.json";

/** Original GA14 Q-da1aeae32132608fb1f4. Existing oh-ls-1/2 distinguish
 * court duties from applications; this contract grants neither application nor
 * packet authority and does not retire the original application commitment. */
export function ohJuvenileSourceContract(profile: EngineProfile | undefined, pathway: string | null,
  specification: RegisteredSpecification | null | undefined, currentMemo: unknown = memo.tracks.filter(t => ["oh-ls-1", "oh-ls-2"].includes(t.trackId))): boolean {
  return specification == null && pathway === OH_JUVENILE_ROUTE && profile?.jurisdiction.code === "OH"
    && profile.profileVersion === "2026-06-19-source-conversion-1"
    && profile.source?.sourceCorpusSha256 === "0109b1358bbee282e159113ced5f86734a6c0cf281c51aca4c3703dedb4552e7"
    && contactRepresentationHash(profile.pathways.find(p => p.id === pathway)) === "34e02a923c13655174fd9f858f3c1508e82804774756aad2b6238cc3b33d10aa"
    && contactRepresentationHash(profile.packetGenerator.pathways.find(p => p.pathwayId === pathway)) === "c8047fe4702893ead246a6e98e4967cde0e18ffdd6f377caaa92d5d19782059f"
    && contactRepresentationHash(juvenileRuleAuthority(profile)) === "02bcd24676fab08a60cb043a15006179d3be00490e2ef6e8b500ec401366e6c3"
    && contactRepresentationHash(currentMemo) === "f0fda1c5286a99c806abdd0a3b2f6c6f1532d59d7755d7457f43faf5366722d5";
}
// Bind the actual ordered juvenile candidates and the statute-specific source
// rules. Adult nonconviction rule-04 is not juvenile exclusion-04.
function juvenileRuleAuthority(profile: EngineProfile) {
  const ruleId = (rule: unknown) => rule && typeof rule === "object" && "id" in rule ? rule.id : null;
  return {
    orderedDecisionRules: profile.orderedDecisionRules.filter(rule => rule.candidatePathwayIds?.includes(OH_JUVENILE_ROUTE)),
    waitingPeriodRules: (profile.waitingPeriodRules ?? []).filter(rule => ["wait-13", "wait-22"].some(id => id === ruleId(rule))),
    exclusionRules: (profile.exclusionRules ?? []).filter(rule => ["exclusion-04", "exclusion-05"].some(id => id === ruleId(rule)))
  };
}
const choice = (value: unknown): string => typeof value === "string" ? value : "unknown";
export function ohJuvenileStageFacts(answers: Readonly<Record<string, unknown>>) {
  const request = choice(answers[OH_JUVENILE_STAGE_IDS[0]]), forum = choice(answers[OH_JUVENILE_STAGE_IDS[1]]), sealed = choice(answers[OH_JUVENILE_STAGE_IDS[2]]);
  const code = request === "court_status_information" ? "information"
    : !["sealing_application", "earlier_expungement_request"].includes(request) ? "unknown_stage"
      : forum !== "juvenile_court_record" ? "forum_review"
        : request === "sealing_application" ? "sealing_application_held"
          : sealed === "yes" ? "earlier_request_held" : "sealed_record_review";
  return { code, request, forum, sealed, paymentAllowed: false as const, applicationReady: false as const };
}
export function ohJuvenileStageFactIds(answers: Readonly<Record<string, unknown>>, includeInactive = false): string[] {
  if (includeInactive) return [...OH_JUVENILE_STAGE_IDS];
  const facts = ohJuvenileStageFacts(answers);
  return [OH_JUVENILE_STAGE_IDS[0], ...(["sealing_application", "earlier_expungement_request"].includes(facts.request) ? [OH_JUVENILE_STAGE_IDS[1]] : []),
    ...(facts.request === "earlier_expungement_request" && facts.forum === "juvenile_court_record" ? [OH_JUVENILE_STAGE_IDS[2]] : [])];
}
