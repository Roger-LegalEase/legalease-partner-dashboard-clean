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
    const question = questionsById.get(questionId);
    if (!question || question.id.startsWith(SOURCE_QUESTION_PREFIX) || !isPrepayQuestion(question)) continue;
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
  nextQuestionIds: readonly string[]
): Record<string, AnswerValue> {
  const previouslyRendered = new Set(previousQuestionIds);
  const stillSelected = new Set(nextQuestionIds);
  return Object.fromEntries(Object.entries(answers).filter(([questionId]) => (
    !previouslyRendered.has(questionId) || stillSelected.has(questionId)
  )));
}
