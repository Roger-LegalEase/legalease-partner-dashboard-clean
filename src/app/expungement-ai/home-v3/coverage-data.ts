import "server-only";

import type { PublicJurisdictionProfile, PublicQuestion } from "@/lib/rcap-engine/contracts";
import { getAllJurisdictionProfiles } from "@/lib/rcap-engine/profile-registry";
import { projectPublicProfile } from "@/lib/rcap-engine/public-profile-projection";
import type { CoverageSummary } from "./coverage-types";

const POSTPAY_STAGES = new Set(["record_readiness", "case_details", "packet_information"]);
const BASELINE_QUESTION_IDS = new Set([
  "ownership_scope",
  "jurisdiction_scope",
  "case_outcome",
  "offense_level",
  "possible_pathway_context",
  "resolved_timing_bucket",
  "court_requirements_completed"
]);
const TOPIC_FALLBACK_IDS = new Set([
  "case_outcome",
  "offense_level",
  "possible_pathway_context",
  "resolved_timing_bucket",
  "court_requirements_completed"
]);

const STATE_NAMES_ES: Record<string, string> = {
  AL: "Alabama", AK: "Alaska", AZ: "Arizona", AR: "Arkansas", CA: "California",
  CO: "Colorado", CT: "Connecticut", DE: "Delaware", DC: "Distrito de Columbia",
  FL: "Florida", GA: "Georgia", HI: "Hawái", ID: "Idaho", IL: "Illinois",
  IN: "Indiana", IA: "Iowa", KS: "Kansas", KY: "Kentucky", LA: "Luisiana",
  ME: "Maine", MD: "Maryland", MA: "Massachusetts", MI: "Míchigan", MN: "Minnesota",
  MS: "Misisipi", MO: "Misuri", MT: "Montana", NE: "Nebraska", NV: "Nevada",
  NH: "Nuevo Hampshire", NJ: "Nueva Jersey", NM: "Nuevo México", NY: "Nueva York",
  NC: "Carolina del Norte", ND: "Dakota del Norte", OH: "Ohio", OK: "Oklahoma",
  OR: "Oregón", PA: "Pensilvania", RI: "Rhode Island", SC: "Carolina del Sur",
  SD: "Dakota del Sur", TN: "Tennessee", TX: "Texas", UT: "Utah", VT: "Vermont",
  VA: "Virginia", WA: "Washington", WV: "Virginia Occidental", WI: "Wisconsin", WY: "Wyoming"
};

function isGuidedCheckQuestion(question: PublicQuestion) {
  if (question.id.startsWith("source_question")) return false;
  if (question.lifecyclePhase) return question.lifecyclePhase.startsWith("prepay_");
  return !POSTPAY_STAGES.has(question.stage);
}

function orderedGuidedCheckQuestions(profile: PublicJurisdictionProfile) {
  const stageOrder = new Map(profile.flowStages.map((stage) => [stage.id, stage.order]));
  return profile.questions
    .map((question, index) => ({ question, index }))
    .filter(({ question }) => isGuidedCheckQuestion(question))
    .sort((a, b) => {
      const orderA = stageOrder.get(a.question.stage) ?? Number.MAX_SAFE_INTEGER;
      const orderB = stageOrder.get(b.question.stage) ?? Number.MAX_SAFE_INTEGER;
      return orderA - orderB || a.index - b.index;
    })
    .map(({ question }) => question);
}

function hasCompletePublicLabels(question: PublicQuestion) {
  return Boolean(question.prompt.trim() && question.translations?.es?.prompt?.trim());
}

function topicQuestions(questions: PublicQuestion[]) {
  const localized = questions.filter(hasCompletePublicLabels);
  const distinctive = localized.filter((question) => !BASELINE_QUESTION_IDS.has(question.id));
  const fallback = localized.filter((question) => TOPIC_FALLBACK_IDS.has(question.id));
  const ordered = [...distinctive, ...fallback];
  const unique = ordered.filter((question, index) => ordered.findIndex((candidate) => candidate.id === question.id) === index);
  return unique.slice(0, 4);
}

/**
 * Build the homepage's presentation-safe state summaries from the same public projection served
 * to the guided check. Only names, counts, and participant-facing prompts cross into the client.
 */
export function buildCoverageSummaries(): CoverageSummary[] {
  const summaries = getAllJurisdictionProfiles()
    .map(projectPublicProfile)
    .map((profile) => {
      const questions = orderedGuidedCheckQuestions(profile);
      const topics = topicQuestions(questions).map((question) => ({
        en: question.prompt,
        es: question.translations?.es?.prompt ?? ""
      }));
      const code = profile.jurisdiction.code.toUpperCase();
      if (!STATE_NAMES_ES[code] || topics.length < 2) {
        throw new Error(`Coverage summary could not be safely derived for ${code}.`);
      }
      return {
        code,
        name: profile.jurisdiction.name,
        nameEs: STATE_NAMES_ES[code],
        questionCount: questions.length,
        topics
      };
    })
    .sort((a, b) => a.name.localeCompare(b.name));

  const uniqueCodes = new Set(summaries.map((summary) => summary.code));
  if (summaries.length !== 51 || uniqueCodes.size !== 51) {
    throw new Error(`Coverage explorer requires exactly 51 unique jurisdictions; received ${summaries.length}.`);
  }
  return summaries;
}
