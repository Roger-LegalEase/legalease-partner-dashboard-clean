import type { EngineProfile } from "@/lib/rcap-engine/contracts";
import { routeDecidingFactScope } from "@/lib/rcap-engine/route-fact-relevance";

export const GA_AGENCY_RESTRICTION_PATHWAY = "non-conviction-record-restriction-through-the-agency-prosecutor-process";

// GA.memo / ga-nonconv-pre2013 and the pinned GBI application (5fe841de…):
// Section One identifies the arresting agency, not a participant county.
// Submit there; the agency and prosecutor complete Sections Two and Three.
// A county answer cannot identify that agency, supply its acts, or authorize
// court sealing. The post-2013 automatic process likewise creates no county
// application. This only retires the reviewed, inherited packet dependency.
const SOURCE_REFS = ["pathways:68-115", "section:260-272", "section:68-115", "corpus-unit:64", "corpus-unit:25"];
const COUNTY_FRAGMENT = "the current text of O.C.G.A. § 35-3-37, the § (j)(4) excluded-offense list, GCIC request procedures, county filing specifics, and the";

export function isGeorgiaAgencyWithoutCounty(profile: EngineProfile, pathwayId: string): boolean {
  if (profile.jurisdiction.code !== "GA" || pathwayId !== GA_AGENCY_RESTRICTION_PATHWAY) return false;
  const pathway = profile.pathways.find(candidate => candidate.id === pathwayId);
  const plan = profile.packetGenerator.pathways.find(candidate => candidate.pathwayId === pathwayId);
  if (!pathway || !plan || plan.requiredInputIds !== undefined
    || plan.mode !== "state_specific_custom_packet_from_source_rules"
    || plan.formMappingStatus !== "custom_or_manual_mapping_required"
    || (plan.formCandidates ?? []).length !== 0
    || JSON.stringify(plan.sourceRuleRefs) !== JSON.stringify(SOURCE_REFS)
    || pathway.sourceRef !== SOURCE_REFS.join("; ")) return false;
  const scope = routeDecidingFactScope(profile, pathway);
  const unresolved = scope.unresolvedRules.filter(rule => rule.factIds.includes("county"));
  const fragment = profile.exclusionRules?.find((rule): rule is Record<string, unknown> =>
    typeof rule === "object" && rule !== null && "id" in rule && rule.id === "exclusion-29");
  // A changed rule, an authored route consumer, or a new form/plan requires its
  // own review. Never let this exception suppress a genuine county predicate.
  return !scope.factIds.has("county") && unresolved.length === 1
    && unresolved[0].section === "exclusionRules" && unresolved[0].ruleId === "exclusion-29"
    && fragment?.ruleText === COUNTY_FRAGMENT
    && JSON.stringify(fragment.fieldsReferenced) === JSON.stringify(["county", "charge"]);
}
