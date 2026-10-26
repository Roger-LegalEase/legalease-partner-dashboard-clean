import { questionAnswerState, scalarAnswerText } from "@/lib/expungement-ai/question-answer-state";
import { convictionReliefQuestions } from "@/lib/rcap-engine/conviction-relief-request";
import "server-only";
import { contactRepresentationHash as hash } from "@/lib/expungement-ai/contact-representation";
import type { EngineProfile } from "@/lib/rcap-engine/contracts";
import contracts from "@/lib/legal-authority/routes/mississippi.json";
import memo from "../../../data/record-clearing/legal-design-intake/MS.memo.json";
import specification from "../../../data/record-clearing/packet-specifications/MS-first-offender-nontraffic-misdemeanor-conviction-expungement-99-19-71-1.v1.json";

export const MS_FIRST_OFFENDER_ROUTE = "first-offender-nontraffic-misdemeanor-conviction-expungement-99-19-71-1";
export const MS_FIRST_OFFENDER_SOURCE = "LD-MS-01;MS.memo:ms-misd-1st;99-19-71(1)";
export const MS_FIRST_OFFENDER_IDS = ["ms_misd1_conviction_finality", "ms_misd1_complete_conviction_history",
  "ms_misd1_traffic_record_classification", "ms_misd1_official_duty_nexus"] as const;
const REUSED_IDS = ["ms_conviction_court", "ms_prior_conviction_expungement"] as const;
type FactId = typeof MS_FIRST_OFFENDER_IDS[number] | typeof REUSED_IDS[number] | "charge";
type Facts = Readonly<Record<FactId, string | null>>;
/** Only the server-owned projection factory admits this internal context.
 * Saved facts use existing scalar/single-choice controls, not a JSON context
 * supplied through public screening. No verified-record/fulfillment authority. */
export type MsFirstOffenderSourceContext = Readonly<{
  pathwayId: typeof MS_FIRST_OFFENDER_ROUTE;
  profileVersion: string;
  facts: Facts;
}>;
const admitted = new WeakSet<object>();
function ruleAuthority(profile: EngineProfile) {
  const ids = new Set(["case_outcome", "offense_level", "offense_category", "disposition_date",
    "sentence_completion_date", "financial_obligations", "residency_or_location",
    "ownership_scope", "jurisdiction_scope", "state_exclusion_categories", ...REUSED_IDS, "charge", "prior_relief"]);
  const ruleId = (rule: unknown): string => rule && typeof rule === "object" && "id" in rule && typeof rule.id === "string" ? rule.id : "";
  return {
    pathways: profile.pathways.filter(path => path.id === MS_FIRST_OFFENDER_ROUTE),
    packetPathways: profile.packetGenerator.pathways.filter(path => path.pathwayId === MS_FIRST_OFFENDER_ROUTE),
    orderedDecisionRules: profile.orderedDecisionRules.filter(rule => rule.candidatePathwayIds?.includes(MS_FIRST_OFFENDER_ROUTE)
      || rule.when.backendPathwayId === MS_FIRST_OFFENDER_ROUTE),
    // The mixed source selector/quick-reference rows are retained, but the
    // separate felony/DUI/MIP waits do not authorize subsection1 timing.
    waitingPeriodRules: (profile.waitingPeriodRules ?? []).filter(rule => ["wait-10", "wait-17", `authority-${MS_FIRST_OFFENDER_ROUTE}`].includes(ruleId(rule))),
    exclusionRules: (profile.exclusionRules ?? []).filter(rule => ["exclusion-04", "exclusion-05", "exclusion-08"].includes(ruleId(rule))),
    questions: profile.questions.filter(question => ids.has(question.id))
  };
}
export function msFirstOffenderSourceContract(profile: EngineProfile | undefined, pathwayId: string | null | undefined, currentSpecification: unknown = specification): boolean {
  // Exact route/rule/question authority and adopted track, not the entire MS
  // corpus. Unrelated sibling edits do not acquire or revoke this exception.
  return profile?.jurisdiction.code === "MS" && pathwayId === MS_FIRST_OFFENDER_ROUTE
    && profile.profileVersion === "2026-06-19-source-conversion-1"
    && profile.source?.sourceCorpusSha256 === "459d9c5d3774787130ceb3ab2a5b980f71fe18e6ee214a7066288dadd6ccd991"
    && hash(ruleAuthority(profile)) === "64d9f949be0ec18c4570e45f100c3bfc23a18ac61e57063475c5d6999f441c8f"
    && hash(contracts.routes.filter(route => route.pathwayId === MS_FIRST_OFFENDER_ROUTE)) === "883bb579846fbf180b230f67ba16705f092f2cb2272701b579d04dec3f2dc796"
    && hash(memo.tracks.filter(track => track.trackId === "ms-misd-1st")) === "5a8d9e5fd1ab7082da586881857312c69e0a9c5bb42ee5b7b6759016909db1ed"
    && hash(REUSED_IDS.map(id => convictionReliefQuestions("MS").find(question => question.id === id))) === "26f2ee3b78c5a7d981b3c76ebcde3cacb301e12c6d15ce7f12f5ab76ca48fb39"
    && hash(specification) === "aa49658426eb26b05cdc5cbcf0db8fe9e01f05dab62a402a5fc7e34a7510e66f"
    && hash(currentSpecification) === hash(specification);
}
export const MS_FIRST_OFFENDER_CHOICES = {
  ms_misd1_conviction_finality: ["final_conviction_record_confirmed", "not_final_or_still_pending", "unknown"],
  ms_misd1_complete_conviction_history: ["checked_own_history_no_other_convictions", "checked_own_history_other_conviction", "history_not_checked_or_incomplete", "unknown"],
  ms_misd1_traffic_record_classification: ["nontraffic_nondui_record_confirmed", "traffic_or_title63_record", "dui_record", "unknown"],
  ms_misd1_official_duty_nexus: ["not_a_public_official", "public_official_unrelated_to_duties", "official_duty_related", "unknown"]
} as const;
function choice(value: unknown, values: readonly string[]): string | null {
  return questionAnswerState({ id: "ms_source_fact", type: "single_choice", options: values }, value) === "known_valid"
    ? scalarAnswerText(value)?.trim() ?? null : null;
}
export function projectMsFirstOffenderSourceFacts(profile: EngineProfile, pathwayId: string | null | undefined,
  raw: Record<string, unknown>, currentSpecification: unknown = specification): MsFirstOffenderSourceContext | null {
  if (!msFirstOffenderSourceContract(profile, pathwayId, currentSpecification)) return null;
  // Preserve the existing text-or-unknown wire contract, including exact
  // uncertainty/declined tokens and value-only wrappers. No prose parsing.
  const charge = questionAnswerState({ id: "charge", type: "text_or_unknown" }, raw.charge) === "known_valid"
    ? scalarAnswerText(raw.charge) : null;
  const facts: Facts = Object.freeze({
    // Identity text only: never parse a charge name/citation into traffic,
    // first-offender status, finality or an official-duty conclusion.
    charge,
    ms_misd1_conviction_finality: choice(raw.ms_misd1_conviction_finality, MS_FIRST_OFFENDER_CHOICES.ms_misd1_conviction_finality),
    // The choice explicitly reports checking one's own complete history.
    // A prior bare scalar, narrative or old {value,basis} object supplies none.
    ms_misd1_complete_conviction_history: choice(raw.ms_misd1_complete_conviction_history, MS_FIRST_OFFENDER_CHOICES.ms_misd1_complete_conviction_history),
    ms_misd1_traffic_record_classification: choice(raw.ms_misd1_traffic_record_classification, MS_FIRST_OFFENDER_CHOICES.ms_misd1_traffic_record_classification),
    ms_misd1_official_duty_nexus: choice(raw.ms_misd1_official_duty_nexus, MS_FIRST_OFFENDER_CHOICES.ms_misd1_official_duty_nexus),
    ms_conviction_court: choice(raw.ms_conviction_court, ["justice", "municipal", "county", "circuit", "unknown"]),
    ms_prior_conviction_expungement: choice(raw.ms_prior_conviction_expungement, ["yes", "no", "unknown"])
  });
  const context = Object.freeze({ pathwayId: MS_FIRST_OFFENDER_ROUTE, profileVersion: profile.profileVersion, facts });
  admitted.add(context);
  return context;
}
export function isMsFirstOffenderSourceContext(profile: EngineProfile, context: MsFirstOffenderSourceContext): boolean {
  return admitted.has(context) && context.profileVersion === profile.profileVersion
    && msFirstOffenderSourceContract(profile, context.pathwayId);
}
export type MsFirstOffenderDecision = { status: "satisfied" | "missing" | "review"; ids: string[]; code: string };
export function msFirstOffenderSourceDecision(profile: EngineProfile, pathwayId: string, answers: Record<string, unknown>,
  context: MsFirstOffenderSourceContext): MsFirstOffenderDecision {
  if (pathwayId !== MS_FIRST_OFFENDER_ROUTE || !isMsFirstOffenderSourceContext(profile, context)) {
    return { status: "review", ids: [], code: "source_context_refused" };
  }
  // Context never selects a route or supplies a conviction from an old
  // dismissed seed. Contradictory public record facts remain explicit holds.
  if (answers.case_outcome !== "Misdemeanor conviction" || answers.offense_level !== "Misdemeanor") {
    return { status: "review", ids: [], code: "conviction_record_conflict" };
  }
  const f = context.facts;
  if (REUSED_IDS.some(id => Object.hasOwn(answers, id) && answers[id] !== f[id])) {
    return { status: "review", ids: [], code: "record_fact_conflict" };
  }
  const adverse = f.ms_misd1_conviction_finality === "not_final_or_still_pending" ? "conviction_not_final"
    : f.ms_misd1_complete_conviction_history === "checked_own_history_other_conviction" || f.ms_prior_conviction_expungement === "yes" ? "first_offender_history_review"
    : ["traffic_or_title63_record", "dui_record"].includes(f.ms_misd1_traffic_record_classification ?? "") ? "traffic_record_review"
    : f.ms_misd1_official_duty_nexus === "official_duty_related" ? "official_duty_exclusion_review" : null;
  if (adverse) return { status: "review", ids: [], code: adverse };
  const expected: Record<Exclude<FactId, "charge">, readonly string[]> = {
    ms_misd1_conviction_finality: ["final_conviction_record_confirmed"],
    ms_misd1_complete_conviction_history: ["checked_own_history_no_other_convictions"],
    ms_misd1_traffic_record_classification: ["nontraffic_nondui_record_confirmed"],
    ms_misd1_official_duty_nexus: ["not_a_public_official", "public_official_unrelated_to_duties"],
    ms_conviction_court: ["justice", "municipal", "county", "circuit"],
    ms_prior_conviction_expungement: ["no"]
  };
  const ids: string[] = (Object.keys(expected) as Exclude<FactId, "charge">[]).filter(id => !expected[id].includes(f[id] ?? ""));
  if (!f.charge) ids.push("charge");
  return ids.length ? { status: "missing", ids, code: "source_facts_unresolved" }
    : { status: "satisfied", ids: [], code: "final_conviction_event_confirmed" };
}
