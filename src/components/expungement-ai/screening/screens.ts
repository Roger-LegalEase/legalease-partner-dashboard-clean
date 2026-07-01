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
import type { JurisdictionProfile, ProfileQuestion } from "@/lib/expungement-ai/frontend/contracts";

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
