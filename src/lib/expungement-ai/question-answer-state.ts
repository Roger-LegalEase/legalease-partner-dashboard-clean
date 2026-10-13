import { NY_SEALING_HISTORY_ID, NY_SEALING_HISTORY_CONTRACT, parseNySealingHistory, nySealingHistoryState } from "@/lib/expungement-ai/ny-16059-sealing-history";
import { CA_CONTACT_CONTRACT, CA_CONTACT_IDS, parseCaContact, caContactAnswerState } from "@/lib/expungement-ai/ca-prop64-contact-answer";
import { nyPacketTextAnswerState, NY_PACKET_TEXT_CONTRACT } from "@/lib/expungement-ai/ny-16059-packet-facts";
import { NY_CASE_RECORDS_ID, NY_CASE_RECORDS_CONTRACT, NY_STATEMENT_ID, NY_STATEMENT_CONTRACT, parseNyCourtCaseRecords, nyCourtCaseRecordsState, nyApplicantStatementState } from "@/lib/expungement-ai/ny-16059-case-records";
import { NY_CASE_COURT_TEXT_CONTRACT, NY_OTHER_COURT_NAME, NY_OTHER_COURT_COUNTY, NY_COURT_DIRECTION_TEXT_IDS, nyCaseCourtTextState } from "@/lib/expungement-ai/ny-16059-case-questions";
import { caProp64RecordAnswerState, CA_PROP64_RECORD_ANSWER_CONTRACT } from "@/lib/expungement-ai/ca-prop64-record-answer";
import { caProp64CaptionAnswerState, CA_PROP64_CAPTION_ANSWER_CONTRACT } from "@/lib/expungement-ai/ca-prop64-caption-answer";
import { caProp64Choice, isCaProp64ChoiceQuestion } from "@/lib/expungement-ai/ca-prop64-choices";
import { isCaProp64QuantityQuestion, isCaProp64GramText } from "@/lib/expungement-ai/ca-prop64-quantity";
import type { ProfileQuestion } from "@/lib/expungement-ai/frontend/contracts";

/** Shared input validation, not legal eligibility. Wire values remain unchanged. */
export type QuestionAnswerState = "unanswered" | "invalid" | "known_valid" | "uncertain" | "declined";
type QuestionContract = Pick<ProfileQuestion, "id" | "type"> & {
  answerContract?: ProfileQuestion["answerContract"];
  contactContext?: ProfileQuestion["contactContext"];
  prior16058ApplicationKnown?: true;
  options?: unknown;
  exclusiveOptions?: readonly string[];
};

const UNCERTAIN_VALUES = new Set(["i am not sure", "i'm not sure", "not sure", "unsure", "unknown", "not_sure"]);
const DECLINED_VALUES = new Set(["prefer not to say"]);

export function uncertaintyState(value: string): "uncertain" | "declined" | null {
  // Recognize the same exact answer with a typographic apostrophe without
  // rewriting the saved value or treating uncertainty inside prose as a token.
  const token = value.trim().toLowerCase().replace(/\u2019/g, "'");
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

/** A saved shape that the existing control cannot represent must be clarified, not coerced. */
export function hasIncompatibleAnswerShape(question: QuestionContract, value: unknown): boolean {
  if (value === undefined || value === null || value === "") return false;
  if (question.type === "filing_contact") return !CA_CONTACT_IDS.includes(question.id) || question.answerContract !== CA_CONTACT_CONTRACT || !(Array.isArray(value) && value.length === 0 || parseCaContact(question.id, value));
  if (question.type === "sealing_history") return question.id !== NY_SEALING_HISTORY_ID || question.answerContract !== NY_SEALING_HISTORY_CONTRACT || !(Array.isArray(value) && !value.length || parseNySealingHistory(value));
  if (question.type === "court_case_records") return question.id !== NY_CASE_RECORDS_ID || question.answerContract !== NY_CASE_RECORDS_CONTRACT || parseNyCourtCaseRecords(value) === null;
  if (question.type === "multi_select") return !Array.isArray(value) || value.some((entry) => typeof entry !== "string");
  if (Array.isArray(value)) return true;
  if (typeof value === "boolean") {
    return !(question.type === "yes_no_unsure" || question.type === "yes_no_prefer_not_to_say"
      || question.type === "single_choice" && Array.isArray(question.options) && question.options.includes(value ? "Yes" : "No"));
  }
  if (typeof value === "number") return !Number.isFinite(value);
  if (typeof value === "string") return false;
  if (typeof value !== "object") return true;
  const prototype = Object.getPrototypeOf(value);
  if (prototype !== Object.prototype && prototype !== null) return true;
  const wrapper = value as Record<string, unknown>;
  return Object.keys(wrapper).some((key) => key !== "value" && key !== "unknown")
    || wrapper.unknown !== undefined && typeof wrapper.unknown !== "boolean"
    || wrapper.unknown === true && !question.type.endsWith("_or_unknown") && question.type !== "number_or_range"
    || wrapper.value !== undefined && wrapper.value !== null && typeof wrapper.value !== "string"
      && !(typeof wrapper.value === "number" && Number.isFinite(wrapper.value));
}

export function isFullSsnFormat(value: string): boolean {
  return /^(?:\d{9}|\d{3}-\d{2}-\d{4})$/.test(value.trim()) && value.replace(/\D/g, "") !== "000000000";
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
  if (hasIncompatibleAnswerShape(question, value)) return "invalid";
  if (question.answerContract === CA_CONTACT_CONTRACT) return question.type === "filing_contact" && CA_CONTACT_IDS.includes(question.id) ? caContactAnswerState(question.id, value, question.contactContext) : "invalid";
  if (question.answerContract === NY_SEALING_HISTORY_CONTRACT) return question.id === NY_SEALING_HISTORY_ID && question.type === "sealing_history" ? nySealingHistoryState(value, today, question.prior16058ApplicationKnown) : "invalid";
  if (question.answerContract === NY_CASE_RECORDS_CONTRACT) return question.id === NY_CASE_RECORDS_ID && question.type === "court_case_records" ? nyCourtCaseRecordsState(value, today) : "invalid";
  if (question.answerContract === NY_STATEMENT_CONTRACT) return question.id === NY_STATEMENT_ID && question.type === "text_or_unknown" ? nyApplicantStatementState(value) : "invalid";
  if (question.answerContract === NY_CASE_COURT_TEXT_CONTRACT) return [NY_OTHER_COURT_NAME, NY_OTHER_COURT_COUNTY, ...NY_COURT_DIRECTION_TEXT_IDS].includes(question.id) && question.type === "text_or_unknown" ? nyCaseCourtTextState(value) : "invalid";
  if (question.answerContract === NY_PACKET_TEXT_CONTRACT) return question.type === "text_or_unknown" ? nyPacketTextAnswerState(question.id, value) : "invalid";
  if (question.answerContract === CA_PROP64_CAPTION_ANSWER_CONTRACT) {
    return question.type === "text_or_unknown" ? caProp64CaptionAnswerState(question.id, value) : "invalid";
  }
  if (question.answerContract === CA_PROP64_RECORD_ANSWER_CONTRACT) {
    return question.type === "text_or_unknown" ? caProp64RecordAnswerState(question.id, value) : "invalid";
  }
  if (value === undefined || value === null || value === "") return "unanswered";
  if (isCaProp64ChoiceQuestion(question)) {
    const choice = caProp64Choice(question.id, value);
    return choice === "I am not sure" ? "uncertain" : choice ? "known_valid" : "invalid";
  }
  const text = scalarAnswerText(value)?.trim();
  const exactUncertainty = text ? uncertaintyState(text) : null;
  const wrappedUnknown = Boolean(value && typeof value === "object" && "unknown" in value && value.unknown === true);
  if (question.type.endsWith("_or_unknown") || question.type === "number_or_range") {
    if (wrappedUnknown) return "uncertain";
    if (exactUncertainty) return exactUncertainty;
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
      return !text ? "unanswered" : (isCaProp64QuantityQuestion(question) ? isCaProp64GramText(text)
        : /^\d+$/.test(text) && Number.isSafeInteger(Number(text))) ? "known_valid" : "invalid";
    case "text":
    case "textarea":
    case "text_or_unknown":
      if (exactUncertainty) return exactUncertainty;
      if (question.id === "social_security_number" && text) return isFullSsnFormat(text) ? "known_valid" : "invalid";
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

/** Equivalent legacy wrappers do not change a known fact or invalidate review. */
export function sameKnownQuestionAnswer(question: QuestionContract, left: unknown, right: unknown): boolean {
  if (questionAnswerState(question, left) !== "known_valid" || questionAnswerState(question, right) !== "known_valid") return false;
  if (question.answerContract === CA_CONTACT_CONTRACT) return JSON.stringify(left) === JSON.stringify(right);
  if (question.answerContract === NY_SEALING_HISTORY_CONTRACT) return JSON.stringify(left) === JSON.stringify(right);
  if (question.answerContract === NY_CASE_RECORDS_CONTRACT) return JSON.stringify(left) === JSON.stringify(right);
  if (question.type === "multi_select" && Array.isArray(left) && Array.isArray(right)) {
    return left.length === right.length && left.every((value) => right.includes(value));
  }
  if (isCaProp64ChoiceQuestion(question)) return caProp64Choice(question.id, left) === caProp64Choice(question.id, right);
  // Boolean equivalence is limited to a control that already accepts that
  // exact Yes/No choice; the known-valid guards above exclude all other types.
  const leftText = typeof left === "boolean" ? left ? "Yes" : "No" : scalarAnswerText(left);
  const rightText = typeof right === "boolean" ? right ? "Yes" : "No" : scalarAnswerText(right);
  return leftText !== null && rightText !== null && leftText.trim() === rightText.trim();
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
