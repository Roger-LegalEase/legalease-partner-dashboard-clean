/**
 * Pure answer helpers for the screening flow.
 *
 * SAFETY: nothing here evaluates eligibility, derives a result, or decides packet/payment. These
 * are presentation-level helpers only — "has the user answered this required question well enough
 * to move to the next screen?" The engine alone decides outcomes.
 *
 * Answers are held in memory by the flow component and never written to URLs, analytics,
 * localStorage, or logs (sensitive-answer constraint).
 *
 * One deliberate exception, added with UX-GLOBAL-017: the in-progress set is mirrored into
 * sessionStorage so a refresh, a back-forward navigation or a tab restore does not silently
 * drop every answer and return the participant to question one. sessionStorage and not
 * localStorage, because the answers must not outlive the browser session on a shared machine;
 * the key is cleared as soon as the matter is claimed. See ScreeningFlow.tsx.
 */
import type {
  AnswerValue,
  ControlledLocationValue,
  ProfileQuestion,
  ScreeningAnswerValue
} from "@/lib/expungement-ai/frontend/contracts";

/** The "or unknown" / "prefer not to say" value shape used by open-text/number/date fields. */
export type OrUnknownValue = { value?: string; unknown?: boolean };

export function isOrUnknownValue(value: AnswerValue | undefined): value is OrUnknownValue {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/**
 * Read a county/court answer.
 *
 * `value` is the label of a controlled option and is the only half ever treated
 * as verified. `manualValue` is what the participant typed when the list did not
 * carry their court; it lives in its own field so nothing downstream can mistake
 * it for a confirmed filing destination.
 */
export function readControlledLocation(value: AnswerValue | undefined): ControlledLocationValue {
  if (!isOrUnknownValue(value)) return {};
  const record = value as ControlledLocationValue;
  return {
    value: typeof record.value === "string" ? record.value : undefined,
    controlledId: typeof record.controlledId === "string" ? record.controlledId : undefined,
    controlledCountyId: typeof record.controlledCountyId === "string" ? record.controlledCountyId : undefined,
    manualValue: typeof record.manualValue === "string" ? record.manualValue : undefined,
    unknown: record.unknown === true
  };
}

/** Is this answer for a question the jurisdiction publishes a controlled dataset for? */
function isControlledLocationQuestion(question: ProfileQuestion) {
  return question.controlledLocationDataset !== undefined;
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
  if (isControlledLocationQuestion(question)) {
    // A controlled pick, an explicit "I'm not sure" and a typed-in value are all
    // answers. Only the first is verified, and that difference is carried on the
    // value rather than by refusing to accept the other two.
    const location = readControlledLocation(value);
    return location.unknown === true
      || (typeof location.controlledId === "string" && location.controlledId !== "")
      || (typeof location.manualValue === "string" && location.manualValue.trim() !== "");
  }
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

/**
 * The token sent for an "unknown" / "prefer not to say" answer. It is non-empty (so the engine
 * does not treat a required question as missing) and contains a phrase the engine recognizes as
 * unknown. The frontend never decides anything from this; it just reports what the user said.
 */
const UNKNOWN_WIRE_VALUE = "I am not sure";

/**
 * Convert the UI answer map into the wire shape the engine accepts
 * (`Record<string, ScreeningAnswerValue>`). Unanswered/empty entries are omitted so they do not
 * masquerade as answers; the "or unknown" toggle becomes a recognizable non-empty token. This is
 * a pure shape transform, not a routing decision.
 */
export function toScreeningAnswers(
  answers: Record<string, AnswerValue>
): Record<string, ScreeningAnswerValue> {
  const out: Record<string, ScreeningAnswerValue> = {};
  for (const [id, value] of Object.entries(answers)) {
    const wire = toWireValue(value);
    if (wire !== undefined) out[id] = wire;
  }
  return out;
}

function toWireValue(value: AnswerValue | undefined): ScreeningAnswerValue | undefined {
  if (value === undefined || value === null) return undefined;
  if (typeof value === "string") return value.trim() === "" ? undefined : value;
  if (typeof value === "number") return value;
  if (Array.isArray(value)) return value.length > 0 ? value : undefined;
  const location = readControlledLocation(value);
  if (location.controlledId !== undefined || location.manualValue !== undefined) {
    // Only the controlled label goes over the wire as the fact. A manual value is
    // reported as not-yet-confirmed, which is what it is: it travels alongside in
    // its own field for a human to check, and never becomes the verified answer.
    if (typeof location.value === "string" && location.value.trim() !== "") return location.value;
    return UNKNOWN_WIRE_VALUE;
  }
  const orUnknown = readOrUnknown(value);
  if (orUnknown.unknown === true) return UNKNOWN_WIRE_VALUE;
  if (typeof orUnknown.value === "string" && orUnknown.value.trim() !== "") return orUnknown.value;
  return undefined;
}

/**
 * The manual county/court values a participant typed, keyed by question id.
 *
 * Kept apart from `toScreeningAnswers` on purpose: these are unverified, they are
 * never the answer to the question, and a caller has to ask for them explicitly.
 */
export function manualLocationValues(answers: Record<string, AnswerValue>): Record<string, { manualValue: string; verified: false }> {
  const out: Record<string, { manualValue: string; verified: false }> = {};
  for (const [id, value] of Object.entries(answers)) {
    const location = readControlledLocation(value);
    if (location.controlledId) continue;
    if (typeof location.manualValue === "string" && location.manualValue.trim() !== "") {
      out[id] = { manualValue: location.manualValue.trim(), verified: false };
    }
  }
  return out;
}
