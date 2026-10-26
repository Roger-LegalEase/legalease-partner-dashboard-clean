import "server-only";
import type { EngineProfile, ScreeningAnswerValue } from "@/lib/rcap-engine/contracts";
import { contactRepresentationHash as hash } from "@/lib/expungement-ai/contact-representation";
import { legalRouteContract } from "@/lib/legal-authority/index";
import { packetSpecificationFor } from "@/lib/rcap/grade-a/packet-specification";
import memo from "../../../data/record-clearing/legal-design-intake/CT.memo.json";
import e4 from "../../../data/rcap-ledger/crosswalk-resolution/E4-R2.json";
import manifest from "../../../data/rcap-ledger/completed-output-counsel-manifest.json";

export const CT_CANNABIS_ROUTE = "cannabis-conviction-erasure";
export const CT_CANNABIS_SOURCE = "CT.memo:ct-cannabis-auto;E4-R2;C.G.S.54-142u";
const routeKey = `CT:${CT_CANNABIS_ROUTE}`;
export const CT_CANNABIS_COPY = {
  "general": "General information about Connecticut § 54-142u: a qualifying possession conviction under § 21a-279(c), entered on or after January 1, 2000 and before October 1, 2015, is erased if electronic or deemed erased by operation of law if not. Every count must be entitled to erasure. There is no petition, form or filing fee for this automatic process. This explanation does not establish that your conviction qualifies or that your record has been erased.",
  "checks": "Check the conviction date, statute section and every count using the Judicial Branch case look-up and State Police Bureau of Identification record.",
  "boundary": "If the conviction falls outside this window, check the requirements of the separate cannabis erasure petition route. Get help if any count is uncertain, you have an immigration matter, or a record you expect to be erased still appears.",
  "effect": "Once erased, you may deny that arrest or conviction except to a criminal justice agency. Internal physical or scanned agency copies need not be redacted, and this provision does not erase DMV records."
};
const genericStatusIds = ["pardon_status", "sentence_completion_date", "financial_obligations", "resolved_timing_bucket"];

/** General conditional information only. This does not decide the actual
 * statute, conviction date, every-count eligibility or present record status.
 * Bind only this source/route's relevant objects; unrelated state work is not
 * an authority dependency. The archived approved guide remains unchanged. */
export function ctCannabisGuidanceSourceIsCurrent(profile: EngineProfile,
  current: { memo?: unknown; resolution?: unknown; family?: unknown; contract?: unknown; specification?: unknown } = {}): boolean {
  const pathway = profile.pathways.find(row => row.id === CT_CANNABIS_ROUTE);
  const plan = profile.packetGenerator.pathways.find(row => row.pathwayId === CT_CANNABIS_ROUTE);
  const rules = profile.orderedDecisionRules?.filter(row => row.candidatePathwayIds?.includes(CT_CANNABIS_ROUTE)
    || row.when?.backendPathwayId === CT_CANNABIS_ROUTE);
  return profile.jurisdiction.code === "CT"
    && profile.profileVersion === "2026-06-19-source-conversion-1"
    && profile.source?.sourceCorpusSha256 === "9417e1863420e1df725060c38960b7ac19da40f59f1f329e30436a0d31a8589a"
    && hash(pathway ?? null) === "0530458b610fa91dc6b5306cb90182e248039412cb188c1f6ef71330875844c1"
    && hash(plan ?? null) === "552d28db23ebb261082e95d3d58a7be1e354e45fb256f9e28a22bc57f911f138"
    && hash(rules ?? null) === "fa80811cbd81a10ef65eb363da392f0441e6123c3a4896f387c4d1fee962dfd6"
    && hash(current.memo === undefined ? memo.tracks.find(row => row.trackId === "ct-cannabis-auto") : current.memo) === "0263161181ab56cc01a8ad9c2feb059fa16bc6518916ba54ca03530b939cf6cd"
    && hash(current.resolution === undefined ? e4.resolutions[0] : current.resolution) === "70a154b7ad3be2560864c47a9d6dc817743a522a3602267af9f1495604bd4879"
    && hash(current.family === undefined ? manifest.families.find(row => row.familyId === "rcap-ct-guidance-implementation") : current.family) === "a55cb6cab69fda47535e52e20f9badfa01371a46f23d19320e9a1850901a5808"
    && hash(current.contract === undefined ? legalRouteContract("CT", CT_CANNABIS_ROUTE) : current.contract) === "9da0ee56f52f8ca789968618e30c711e6730284c88c4dd0758579985d80cbdc1"
    && (current.specification === undefined ? packetSpecificationFor(routeKey) : current.specification) == null;
}

export function ctCannabisGeneralInformationContext(profile: EngineProfile, pathwayId: string | undefined,
  answers: Record<string, ScreeningAnswerValue>): boolean {
  return pathwayId === CT_CANNABIS_ROUTE && ctCannabisGuidanceSourceIsCurrent(profile)
    && ["Yes", "I am helping someone complete their own check"].includes(String(answers.ownership_scope))
    && answers.jurisdiction_scope === "State or local"
    && ["Misdemeanor conviction", "Other conviction or adjudication"].includes(String(answers.case_outcome))
    && ["Misdemeanor", "Felony"].includes(String(answers.offense_level));
}

export function ctCannabisGeneralInformationQuestionApplies(profile: EngineProfile, pathwayId: string | undefined,
  answers: Record<string, ScreeningAnswerValue>, id: string): boolean {
  return !genericStatusIds.includes(id) || !ctCannabisGeneralInformationContext(profile, pathwayId, answers);
}
