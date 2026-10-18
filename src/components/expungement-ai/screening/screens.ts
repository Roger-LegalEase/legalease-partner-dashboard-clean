import { IL_PROSTITUTION_FACT_ID } from "@/lib/rcap-engine/illinois-prostitution-facts";
import { CT_PETITION_FACT_IDS, ctPetitionDateQuestion } from "@/lib/rcap-engine/connecticut-clean-slate-petition-facts";
import { GA_SB288_FACT_IDS } from "@/lib/rcap-engine/georgia-sb288-facts";
import { MD_POLICE_IDS } from "@/lib/rcap-engine/maryland-police-record-facts";
import { CA_12034_FACT_IDS } from "@/lib/rcap-engine/california-1203-4-facts";
import { MT_DEFERRED_FACT_IDS } from "@/lib/rcap-engine/montana-deferred-facts";
import { MO_MARIJUANA_FACT_IDS } from "@/lib/rcap-engine/missouri-marijuana-status-facts";
import { AR_RECORD_ORIGIN_ID } from "@/lib/rcap-engine/arkansas-record-origin";
import { convictionReliefQuestions } from "@/lib/rcap-engine/conviction-relief-request";
import { MS_EXACT_TIMING_FACT_IDS } from "@/lib/rcap-engine/mississippi-exact-timing";
import { CA_PROP64_FACT_IDS, CA_PROP64_LEGACY_IDS } from "@/lib/rcap-engine/california-prop64-facts";
import { NY_16059_FACT_IDS, NY_16059_LEGACY_IDS } from "@/lib/rcap-engine/new-york-16059-questions";
import { DE_CONVICTION_FACT_IDS } from "@/lib/rcap-engine/delaware-conviction-questions";
import { MS_PROGRAM_COMPLETION_FACT_IDS } from "@/lib/rcap-engine/mississippi-program-completion";
import { MS_CONDITIONAL_DISCHARGE_FACT_IDS } from "@/lib/rcap-engine/mississippi-conditional-discharge";
import { KS_RECORD_SCOPE_FACT_IDS } from "@/lib/rcap-engine/kansas-record-scope";
/**
 * Pure helpers for turning a jurisdiction profile into the ordered consumer screen list.
 *
 * Rendering rule (non-negotiable): consumer screens come from `flowStages` order. Raw
 * `source_question_*` rows are the engine's evaluation surface and are NEVER rendered as
 * consumer screens. (The trimmed consumer profiles already exclude them; this drop is defensive.)
 *
 * The observed model across all 51 profiles is one question per screen (e.g. PA 5, IL 16,
 * TX 17, NE 20 — each matching that state's question count). So a "screen" here is a single
 * question, ordered by its stage's position then by its original order within the profile.
 */
import { caProp64RecordQuestion } from "@/lib/expungement-ai/ca-prop64-record-facts";
import { NEVADA_176A_ROUTE_SAFETY_FACT_IDS } from "@/lib/rcap-engine/nevada-176a-branch";
import { GA_PARDON_FACT_IDS } from "@/lib/rcap-engine/georgia-pardon-facts";
import { GA_FIRST_OFFENDER_FACT_IDS } from "@/lib/rcap-engine/georgia-first-offender";
import { IL_CANNABIS_FACT_IDS } from "@/lib/rcap-engine/illinois-cannabis-facts";
import type { AnswerValue, JurisdictionProfile, ProfileQuestion } from "@/lib/expungement-ai/frontend/contracts";

const SOURCE_QUESTION_PREFIX = "source_question";
const POSTPAY_STAGES = new Set([
  "record_readiness",
  "case_details",
  "packet_information"
]);

function isPrepayQuestion(question: ProfileQuestion) {
  if (question.lifecyclePhase) return question.lifecyclePhase.startsWith("prepay_");
  return !POSTPAY_STAGES.has(question.stage);
}

function isCompletionStatusQuestion(question: ProfileQuestion) {
  return ["financial_obligations", "sentence_completion_date"].includes(question.id)
    && question.type === "yes_no_unsure";
}

/** Ordered consumer question screens for a profile. */
export function deriveScreens(profile: JurisdictionProfile): ProfileQuestion[] {
  const stageOrder = new Map(profile.flowStages.map((stage) => [stage.id, stage.order]));

  return profile.questions
    .map((question, index) => ({ question, index }))
    .filter(({ question }) => !question.id.startsWith(SOURCE_QUESTION_PREFIX))
    .filter(({ question }) => isPrepayQuestion(question))
    .sort((a, b) => {
      const orderA = stageOrder.get(a.question.stage) ?? Number.MAX_SAFE_INTEGER;
      const orderB = stageOrder.get(b.question.stage) ?? Number.MAX_SAFE_INTEGER;
      // Stable: fall back to original profile order within the same stage.
      return orderA - orderB || a.index - b.index;
    })
    .map(({ question }) => question);
}

/** Project the server's ordered screening plan onto the trusted profile questions. */
export function screensFromQuestionIds(
  profile: JurisdictionProfile,
  questionIds: readonly string[]
): ProfileQuestion[] {
  const questionsById = new Map(profile.questions.map((question) => [question.id, question]));
  const seen = new Set<string>();
  const selected: ProfileQuestion[] = [];

  for (const questionId of questionIds) {
    if (seen.has(questionId)) continue;
    seen.add(questionId);
    const original = questionsById.get(questionId);
    const question = original ? ctPetitionDateQuestion(caProp64RecordQuestion(profile.jurisdiction.code, original) ?? original,
      profile.jurisdiction.code === "CT" && questionIds.includes("ct_petition_count")) : undefined;
    if (!question || question.id.startsWith(SOURCE_QUESTION_PREFIX)
      || (!isPrepayQuestion(question) && !isCompletionStatusQuestion(question))) continue;
    selected.push(question);
  }

  return selected;
}

/**
 * Remove answers only when a previously rendered branch question is no longer
 * selected by the server. Answers that were never UI questions may be
 * authoritative hidden facts, so they deliberately survive this projection.
 */
export function sanitizeAnswersForQuestionIds(
  answers: Record<string, AnswerValue>,
  previousQuestionIds: readonly string[],
  nextQuestionIds: readonly string[],
  profile?: JurisdictionProfile
): Record<string, AnswerValue> {
  const previouslyRendered = new Set(previousQuestionIds);
  const stillSelected = new Set(nextQuestionIds);
  return Object.fromEntries(Object.entries(answers).filter(([questionId]) => (
    !previouslyRendered.has(questionId) || stillSelected.has(questionId)
    || Boolean(profile && convictionReliefQuestions(profile.jurisdiction.code).some(q => q.id === questionId))
    // A corrected completion answer may disappear from the correction plan;
    // it remains a fact of this case and must survive that transition.
    || Boolean(profile?.questions.some(question => question.id === questionId && isCompletionStatusQuestion(question))
      && (profile.jurisdiction.code !== "CT" || nextQuestionIds.some(id => CT_PETITION_FACT_IDS.includes(id))))
    // The exact VA server projection retires compulsory victim disclosure.
    // Keep every prior raw answer when that screen leaves the plan.
    || Boolean(profile?.jurisdiction.code === "VA" && questionId === "trafficking_status"
      && profile.questions.some(question => question.id === questionId && question.contextOnly === true && question.required === false))
    // These are the same case record facts across CA branches, not branch-only answers.
    || Boolean(profile?.questions.some((question) => question.id === questionId && caProp64RecordQuestion(profile.jurisdiction.code, question)))
    || Boolean(profile?.jurisdiction.code === "CA" && [...CA_PROP64_FACT_IDS, ...CA_PROP64_LEGACY_IDS, "ca_prop64_branch", "ca_prop64_relief_requested"].includes(questionId)
      && profile.questions.some(question => question.id === questionId))
    || Boolean(profile?.jurisdiction.code === "CA" && CA_12034_FACT_IDS.includes(questionId)
      && profile.questions.some(question => question.id === questionId))
    // NV charge and program-disposition facts still describe the same record
    // when a sibling remedy is selected. Keep their independent raw answers;
    // route-scoped evaluation decides whether they are currently relevant.
    || Boolean(profile?.jurisdiction.code === "NV" && NEVADA_176A_ROUTE_SAFETY_FACT_IDS.includes(questionId)
      && profile.questions.some(question => question.id === questionId))
    || Boolean(profile?.jurisdiction.code === "AR" && [AR_RECORD_ORIGIN_ID, "residency_or_location", "court", "county_or_filing_location"].includes(questionId))
    || Boolean(profile?.jurisdiction.code === "IL" && questionId === IL_PROSTITUTION_FACT_ID
      && profile.questions.some(question => question.id === questionId))
    || Boolean(profile?.jurisdiction.code === "CT" && CT_PETITION_FACT_IDS.includes(questionId)
      && profile.questions.some(question => question.id === questionId))
    || Boolean(profile?.jurisdiction.code === "GA" && [...GA_SB288_FACT_IDS, ...GA_FIRST_OFFENDER_FACT_IDS, ...GA_PARDON_FACT_IDS].some(id => id === questionId)
      && profile.questions.some(question => question.id === questionId))
    || Boolean(profile?.jurisdiction.code === "NY" && [...NY_16059_FACT_IDS, ...NY_16059_LEGACY_IDS, "ny_16059_later_conviction_entered", "ny_16059_undisposed_arrest", "sentencing_date", "release_date"].includes(questionId)
      && profile.questions.some(question => question.id === questionId))
    || Boolean(profile?.jurisdiction.code === "DE" && DE_CONVICTION_FACT_IDS.includes(questionId) && profile.questions.some(question => question.id === questionId))
    || Boolean(profile?.jurisdiction.code === "MS" && (questionId === "ms_program_final_disposition" || MS_EXACT_TIMING_FACT_IDS.some(id => id === questionId) || MS_PROGRAM_COMPLETION_FACT_IDS.some(id => id === questionId) || MS_CONDITIONAL_DISCHARGE_FACT_IDS.some(id => id === questionId))
      && profile.questions.some(question => question.id === questionId))
    || Boolean(profile?.jurisdiction.code === "KS" && KS_RECORD_SCOPE_FACT_IDS.some(id => id === questionId)
      && profile.questions.some(question => question.id === questionId))
    || Boolean(profile?.jurisdiction.code === "MD" && [...MD_POLICE_IDS, "arrest_date"].includes(questionId)
      && profile.questions.some(question => question.id === questionId))
    || Boolean(profile?.jurisdiction.code === "MT" && MT_DEFERRED_FACT_IDS.includes(questionId)
      && profile.questions.some(question => question.id === questionId))
    || Boolean(profile?.jurisdiction.code === "MO" && MO_MARIJUANA_FACT_IDS.includes(questionId)
      && profile.questions.some(question => question.id === questionId))
    || Boolean(profile?.jurisdiction.code === "IL" && IL_CANNABIS_FACT_IDS.some(id => id === questionId)
      && profile.questions.some(question => question.id === questionId))
  )));
}

/**
 * A resume payload may contain an answer from a branch selected in an earlier
 * visit. Treat every question the participant could have rendered as prior UI
 * state, while preserving facts that are not participant-facing screens.
 */
export function sanitizeResumedAnswersForQuestionIds(
  profile: JurisdictionProfile,
  answers: Record<string, AnswerValue>,
  selectedQuestionIds: readonly string[]
): Record<string, AnswerValue> {
  return sanitizeAnswersForQuestionIds(
    answers,
    deriveScreens(profile).map((question) => question.id),
    selectedQuestionIds,
    ["WY", "SD", "CT", "AR", "CA", "NV", "GA", "IL", "KS", "MS", "DE", "NY", "NE", "LA", "ME", "MO", "MT", "VA", "MD"].includes(profile.jurisdiction.code) ? profile : undefined
  );
}
