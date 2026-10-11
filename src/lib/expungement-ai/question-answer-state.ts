import type { ProfileQuestion } from "@/lib/expungement-ai/frontend/contracts";

/** Shared input validation, not legal eligibility. Wire values remain unchanged. */
export type QuestionAnswerState = "unanswered" | "invalid" | "known_valid" | "uncertain" | "declined";
type QuestionContract = Pick<ProfileQuestion, "id" | "type"> & {
  options?: unknown;
  exclusiveOptions?: readonly string[];
};

const UNCERTAIN_VALUES = new Set(["i am not sure", "i'm not sure", "not sure", "unsure", "unknown", "not_sure"]);
const DECLINED_VALUES = new Set(["prefer not to say"]);

export function uncertaintyState(value: string): "uncertain" | "declined" | null {
  const token = value.trim().toLowerCase();
  return UNCERTAIN_VALUES.has(token) ? "uncertain" : DECLINED_VALUES.has(token) ? "declined" : null;
}

/** Supports legacy primitives without guessing the meaning of an arbitrary object. */
export function scalarAnswerText(value: unknown): string | null {
  if (typeof value === "string") return value;
  if (typeof value === "number" && Number.isFinite(value)) return String(value);
  if (value && typeof value === "object" && !Array.isArray(value) && "value" in value) {
    const nested = (value as { value?: unknown }).value;
    if (typeof nested === "string") return nested;
    if (typeof nested === "number" && Number.isFinite(nested)) return String(nested);
  }
  return null;
}

export function isCalendarDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value) || value.startsWith("0000")) return false;
  const parsed = new Date(`${value}T00:00:00.000Z`);
  return Number.isFinite(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
}

/** Exact canonical option identities; translated labels never control exclusivity. */
export function exclusiveOptionsFor(question: QuestionContract): readonly string[] {
  if (question.exclusiveOptions) return question.exclusiveOptions;
  return question.id === "state_exclusion_categories" ? ["None of these", "I am not sure"] : [];
}

export function toggleMultiSelect(values: readonly string[], option: string, exclusive: readonly string[]): string[] {
  if (values.includes(option)) return values.filter((value) => value !== option);
  return exclusive.includes(option) ? [option] : [...values.filter((value) => !exclusive.includes(value)), option];
}

export function questionAnswerState(question: QuestionContract, value: unknown, today = new Date().toISOString().slice(0, 10)): QuestionAnswerState {
  if (value === undefined || value === null || value === "") return "unanswered";
  const text = scalarAnswerText(value)?.trim();
  const wrappedUnknown = Boolean(value && typeof value === "object" && "unknown" in value && value.unknown === true);
  if (question.type.endsWith("_or_unknown") || question.type === "number_or_range") {
    if (wrappedUnknown) return "uncertain";
    if (text && uncertaintyState(text)) return uncertaintyState(text)!;
  } else if (wrappedUnknown) return "invalid";
  switch (question.type) {
    case "single_choice":
    case "yes_no_unsure":
    case "yes_no_prefer_not_to_say": {
      const options = question.type === "yes_no_unsure" ? ["Yes", "No", "I am not sure"]
        : question.type === "yes_no_prefer_not_to_say" ? ["Yes", "No", "Prefer not to say"] : question.options;
      if (!Array.isArray(options) || !options.length) return "invalid";
      const answer = typeof value === "boolean" ? value ? "Yes" : "No" : text;
      if (!answer) return "unanswered";
      if (!options.includes(answer)) return "invalid";
      return uncertaintyState(answer) ?? "known_valid";
    }
    case "multi_select": {
      if (!Array.isArray(value) || value.some((entry) => typeof entry !== "string")) return "invalid";
      if (!value.length) return "unanswered";
      const options = question.options;
      if (!Array.isArray(options) || value.some((entry) => !options.includes(entry))) return "invalid";
      if (new Set(value).size !== value.length || (value.length > 1 && value.some((entry) => exclusiveOptionsFor(question).includes(entry)))) return "invalid";
      return value.length === 1 ? uncertaintyState(value[0]) ?? "known_valid" : "known_valid";
    }
    case "date":
    case "date_or_unknown":
      if (!text) return "unanswered";
      if (!isCalendarDate(text) || (question.id === "date_of_birth" && text > today)) return "invalid";
      return "known_valid";
    case "number_or_range":
      return !text ? "unanswered" : /^\d+$/.test(text) && Number.isSafeInteger(Number(text)) ? "known_valid" : "invalid";
    case "text":
    case "textarea":
    case "text_or_unknown":
      return text ? "known_valid" : "unanswered";
    default:
      return "invalid";
  }
}

/** Legacy facts without a question contract still recognize exact uncertainty tokens. */
export function answerValueIsKnown(value: unknown): boolean {
  if (typeof value === "boolean") return true;
  if (Array.isArray(value)) return value.length > 0 && value.every(answerValueIsKnown);
  if (value && typeof value === "object" && "unknown" in value && value.unknown === true) return false;
  const text = scalarAnswerText(value)?.trim();
  return Boolean(text && !uncertaintyState(text));
}

/** Preserve authored choice values, display labels and Spanish without inventing options. */
export function normalizeQuestionChoices(options: unknown, existing?: ProfileQuestion["optionDisplay"]): {
  options: string[] | null; optionDisplay?: ProfileQuestion["optionDisplay"];
} {
  if (!Array.isArray(options) || !options.length) return { options: null, optionDisplay: existing };
  const values: string[] = [];
  const display = { ...existing };
  for (const option of options) {
    if (typeof option === "string" && option.trim()) values.push(option);
    else if (option && typeof option === "object" && typeof option.value === "string" && option.value.trim() && typeof option.label === "string" && option.label.trim()) {
      values.push(option.value);
      const spanish = option.translations?.es;
      display[option.value] = {
        label: option.label,
        ...(typeof option.helperText === "string" ? { helperText: option.helperText } : {}),
        ...(typeof spanish === "string" ? { translations: { es: { label: spanish } } }
          : spanish && typeof spanish.label === "string" ? { translations: { es: spanish } } : {}),
        ...existing?.[option.value]
      };
    } else return { options: null, optionDisplay: existing };
  }
  if (new Set(values).size !== values.length) return { options: null, optionDisplay: existing };
  return { options: values, ...(Object.keys(display).length ? { optionDisplay: display } : {}) };
}
