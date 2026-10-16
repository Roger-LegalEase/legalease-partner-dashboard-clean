import "server-only";
import type { EngineProfile, ScreeningAnswerValue } from "@/lib/rcap-engine/contracts";
import { contactRepresentationHash as hash } from "@/lib/expungement-ai/contact-representation";
import { legalRouteContract } from "@/lib/legal-authority/index";
import { packetSpecificationFor } from "@/lib/rcap/grade-a/packet-specification";
import memo from "../../../data/record-clearing/legal-design-intake/CT.memo.json";
import guides from "../../../data/rcap-all50/guidance-packets/ct.json";
import crosswalk from "../../../data/rcap-ledger/track-pathway-crosswalk.json";
import manifest from "../../../data/rcap-ledger/completed-output-counsel-manifest.json";

export const CT_NONCONVICTION_ROUTE = "automatic-non-conviction-erasure-under-conn-gen-stat-54-142a";
export const CT_CLEANSLATE_ROUTE = "automatic-clean-slate-erasure-for-eligible-post-2000-convictions";
export const CT_AUTOMATIC_INFORMATION_SOURCE = "CT.memo:ct-nonconviction-auto/ct-cleanslate-auto;conditional-general-information";
export const CT_AUTOMATIC_INFORMATION_COPY = {
  "nonconviction": {
    "general": "General information about Connecticut erasure after an acquittal under § 54-142a(a) and (b). This result does not establish that your record qualifies for erasure or has been erased.",
    "checks": [
      "Write down how the charge ended — dismissed, or found not guilty — and the exact date the case ended. Those two facts drive everything else on this route.",
      "Check whether an appeal is open or the time to file a writ of error or take an appeal is still running. The erasure is triggered when that time expires, or when an appeal sustaining the dismissal or the not guilty finding is finally determined.",
      "Use the Connecticut Judicial Branch case look-up to check a non-conviction; the SPBI conviction-only record cannot confirm its erasure."
    ],
    "limits": [
      "Answer the one question that takes a charge outside § 54-142a(a): was the finding not guilty by reason of mental disease or defect, or guilty but not criminally responsible by reason of mental disease or defect? If it was, this is not your route.",
      "If you have any immigration matter, pending or possible, take those case papers to an immigration attorney before the erasure takes effect — § 54-142a(j) means erasure can make a disposition harder to prove to federal authorities.",
      "There is no petition, form or filing fee for this automatic process. Section 54-142a(b) preserves a petition option for records before October 1, 1969; this result does not prepare that petition. If a record remains when erasure was expected, get help with the separate review route."
    ]
  },
  "cleanslate": {
    "general": "General information about Connecticut automatic Clean Slate erasure. Qualifying offenses committed on or after January 1, 2000 may be erased by operation of law. This result does not establish that you qualify, that a waiting period has run, or that your record has been erased. There is no participant petition or filing fee for this automatic process.",
    "checks": [
      "Check the date of the conduct, the statute section, and the offense classification and maximum sentence under the law in effect when the offense was committed, rather than current law.",
      "The source uses seven- or ten-year periods from the court’s most recent judgment of conviction for any crime. The applicable period depends on the offense classification and statutory exceptions; a generic elapsed-time answer does not establish it.",
      "Check every count and referenced defendant, relevant supervision completion and any pending state charge. Keep these facts unknown unless the actual record establishes them."
    ],
    "limits": [
      "A § 14-227a DUI uses the ten-year period; another § 14-227a conviction within the following ten years is a separate bar. The enumerated statute sections must be checked individually, rather than treating all firearms offenses as excluded.",
      "A family-violence designation on a conviction entered on or after January 1, 2000, a nonviolent sexual offense or sexually violent offense as defined in § 54-250, a listed statute, a pending state charge or an ineligible count can prevent erasure. Get help with uncertainty, immigration matters or a record that remains when erasure was expected.",
      "Erasure does not cancel an unremitted fine, registration obligations or a standing criminal protective order, and does not require the DMV to erase its record."
    ]
  }
};
const expected = {
  "automatic-non-conviction-erasure-under-conn-gen-stat-54-142a": {
    "pathway": "096ebd4bef9d9da6f0284c9557cb6d1fd5c64d3b87cdf13894a00be56f87639c",
    "plan": "f24980b25115a5cd4d19aade4e740ed5f8425b9bef57a2110c0599ce72ed7ac2",
    "rules": "46430f53483bbf4c8bdc0163448038690dd18131308620bc84001b0beaa8c19c",
    "memo": "ca9f8b34f9ede503dc04d6ee0e88c3a2bdc3e80f8c7dd4bc4b141ee9a9a19f81",
    "crosswalk": "56b6306c770204bdad1f3615ff454b8633c6f61cec8113436c4c6abeb9667680"
  },
  "automatic-clean-slate-erasure-for-eligible-post-2000-convictions": {
    "pathway": "d860ee38d4096f45678694a3176908fbbf68b3b3403aea4d92b926416bc12a2b",
    "plan": "2bf4e429ca4bf3ad764795c38c669fb6f6faee8b2dd22464f5ba8433591c1320",
    "rules": "ef5ccd78a7dee2aee9c400fa6d2094ecdb9bdd422913d51dde90b9eb4eb36b9b",
    "memo": "d84e331ab9135208a48943137fbe18b4a954327323f5192e159a6d8cc5a5ab5a",
    "crosswalk": "cdc0fafc4b1bfafeeed305266a119cc52dfb878a3bdb5c7e9790eb9a7a5cf3d4"
  }
};
const genericStatusIds = ["pardon_status", "sentence_completion_date", "financial_obligations", "resolved_timing_bucket"];
type Current = { memo?: unknown; guide?: unknown; crosswalk?: unknown; approvedAsset?: unknown; contract?: unknown; specification?: unknown };

/** Existing source association only, never a participant contract. These
 * exact routes currently have neither a legalRouteContract nor a registered
 * specification. Future authority must refuse this exception until reviewed.
 * General explanation supplies no personal erasure/clock qualification. */
export function ctAutomaticInformationSourceIsCurrent(profile: EngineProfile, pathwayId: string | undefined, current: Current = {}): boolean {
  const route = pathwayId === CT_NONCONVICTION_ROUTE ? CT_NONCONVICTION_ROUTE : pathwayId === CT_CLEANSLATE_ROUTE ? CT_CLEANSLATE_ROUTE : null;
  if (!route) return false;
  const pinned = expected[route];
  const trackId = route === CT_NONCONVICTION_ROUTE ? "ct-nonconviction-auto" : "ct-cleanslate-auto";
  const pathway = profile.pathways.find(row => row.id === route);
  const plan = profile.packetGenerator.pathways.find(row => row.pathwayId === route);
  const rules = profile.orderedDecisionRules?.filter(row => row.candidatePathwayIds?.includes(route) || row.when?.backendPathwayId === route);
  const guide = guides.packets.find(row => row.trackId === "ct-nonconviction-auto");
  const asset = manifest.families.find(row => row.familyId === "rcap-ct-guidance-implementation")?.finalizedSampleOutputs.find(row => row.trackId === "ct-nonconviction-auto");
  return profile.jurisdiction.code === "CT" && profile.profileVersion === "2026-06-19-source-conversion-1"
    && profile.source?.sourceCorpusSha256 === "9417e1863420e1df725060c38960b7ac19da40f59f1f329e30436a0d31a8589a"
    && hash(pathway ?? null) === pinned.pathway && hash(plan ?? null) === pinned.plan && hash(rules ?? null) === pinned.rules
    && hash((current.memo === undefined ? memo.tracks.find(row => row.trackId === trackId) : current.memo) ?? null) === pinned.memo
    && hash((current.crosswalk === undefined ? crosswalk.compiledPathways.find(row => row.compiledPathwayId === route) : current.crosswalk) ?? null) === pinned.crosswalk
    && (route !== CT_NONCONVICTION_ROUTE || (hash((current.guide === undefined ? guide : current.guide) ?? null) === "0a90e7977b745cc71af919f189d06fd66ba8f0317128c74e4fde89ebbbfd1d44"
      && hash((current.approvedAsset === undefined ? asset : current.approvedAsset) ?? null) === "dd45bba42393706a019271235c4dbeb838f07e7ca6099e3a0fc0771ee2c6126e"))
    && (current.contract === undefined ? legalRouteContract("CT", route) : current.contract) == null
    && (current.specification === undefined ? packetSpecificationFor(`CT:${route}`) : current.specification) == null;
}

export function ctAutomaticInformationContext(profile: EngineProfile, pathwayId: string | undefined, answers: Record<string, ScreeningAnswerValue>): "nonconviction" | "cleanslate" | null {
  if (!ctAutomaticInformationSourceIsCurrent(profile, pathwayId)
    || !["Yes", "I am helping someone complete their own check"].includes(String(answers.ownership_scope))
    || answers.jurisdiction_scope !== "State or local" || !["Misdemeanor", "Felony"].includes(String(answers.offense_level))) return null;
  if (pathwayId === CT_NONCONVICTION_ROUTE && answers.case_outcome === "Acquitted or found not guilty") return "nonconviction";
  if (pathwayId === CT_CLEANSLATE_ROUTE && ["Misdemeanor conviction", "Other conviction or adjudication"].includes(String(answers.case_outcome))) return "cleanslate";
  return null;
}

export function ctAutomaticInformationQuestionApplies(profile: EngineProfile, pathwayId: string | undefined, answers: Record<string, ScreeningAnswerValue>, id: string): boolean {
  // Only the general explanation uses this exception. Actual source dates,
  // appeal/finding/class/count/supervision and eligibility remain unestablished.
  return !genericStatusIds.includes(id) || ctAutomaticInformationContext(profile, pathwayId, answers) === null;
}
