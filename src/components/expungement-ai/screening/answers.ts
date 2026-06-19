/**
 * Pure answer helpers for the screening flow.
 *
 * SAFETY: nothing here evaluates eligibility, derives a result, or decides packet/payment. These
 * are presentation-level helpers only — "has the user answered this required question well enough
 * to move to the next screen?" The engine alone decides outcomes.
 *
 * Answers are held in memory by the flow component and never written to URLs, analytics,
 * localStorage, or logs (sensitive-answer constraint).
 */
import type { AnswerValue, ProfileQuestion } from "@/lib/expungement-ai/frontend/contracts";

/** The "or unknown" / "prefer not to say" value shape used by open-text/number/date fields. */
export type OrUnknownValue = { value?: string; unknown?: boolean };

export function isOrUnknownValue(value: AnswerValue | undefined): value is OrUnknownValue {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/** Read an OrUnknown value safely from any stored answer. */
export function readOrUnknown(value: AnswerValue | undefined): OrUnknownValue {
  if (isOrUnknownValue(value)) {
    return { value: typeof value.value === "string" ? value.value : undefined, unknown: value.unknown === true };
  }
  return {};
}

/**
 * Whether an answer carries enough to satisfy a required question. For the open field types,
 * choosing "unknown" / "prefer not to say" counts as answered — that is the entire point of those
 * affordances, and it lets an anxious user who genuinely does not know still move forward.
 */
export function hasAnswer(question: ProfileQuestion, value: AnswerValue | undefined): boolean {
  switch (question.type) {
    case "single_choice":
    case "yes_no_unsure":
    case "yes_no_prefer_not_to_say":
    case "text":
      return typeof value === "string" && value.trim().length > 0;
    case "multi_select":
      return Array.isArray(value) && value.length > 0;
    case "date_or_unknown":
    case "number_or_range":
    case "text_or_unknown": {
      const v = readOrUnknown(value);
      return v.unknown === true || (typeof v.value === "string" && v.value.trim().length > 0);
    }
    default:
      // Unknown/unsupported type: never block Continue (it renders a calm fallback instead).
      return true;
  }
}

/**
 * Whether a question blocks the Continue button. A `contextOnly` question is optional and
 * non-routing: it NEVER blocks Continue, regardless of its `required` flag.
 */
export function blocksContinue(question: ProfileQuestion, value: AnswerValue | undefined): boolean {
  if (question.contextOnly) return false;
  if (!question.required) return false;
  return !hasAnswer(question, value);
}
