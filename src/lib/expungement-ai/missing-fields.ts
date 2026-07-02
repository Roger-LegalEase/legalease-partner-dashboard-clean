import type { ProfileQuestion, QuestionType } from "@/lib/expungement-ai/frontend/contracts";
import { resolveRuntimeText, t, type Locale } from "@/lib/expungement-ai/localization";

type MissingFieldFallback = {
  prompt: string;
  type: QuestionType;
  options?: string[] | null;
};

const FRIENDLY_MISSING_FIELD_FALLBACKS: Record<string, MissingFieldFallback> = {
  disposition_date: {
    prompt: "What date should we use to check the waiting period for this case?",
    type: "date_or_unknown"
  },
  age_at_offense: {
    prompt: "How old were you when the case happened?",
    type: "number_or_range"
  },
  trafficking_status: {
    prompt: "Was this connected to human trafficking survivor relief?",
    type: "yes_no_prefer_not_to_say"
  },
  pardon_status: {
    prompt: "Have you received a pardon for this case?",
    type: "yes_no_unsure"
  }
};

export function friendlyMissingFieldLabel(fieldId: string, profileQuestion?: Pick<ProfileQuestion, "prompt"> | null, locale: Locale = "en") {
  const fallback = FRIENDLY_MISSING_FIELD_FALLBACKS[fieldId];
  if (fallback) return resolveRuntimeText(locale, fallback.prompt);

  const prompt = profileQuestion?.prompt?.trim();
  if (prompt && !looksLikeRawFieldKey(prompt)) return prompt;

  return t(locale, "missing.tell_more", "Tell us more about {field}.", { field: humanizeFieldId(fieldId) });
}

export function questionForMissingField(fieldId: string, profileQuestion?: ProfileQuestion | null): ProfileQuestion {
  const fallback = FRIENDLY_MISSING_FIELD_FALLBACKS[fieldId];
  const prompt = friendlyMissingFieldLabel(fieldId, profileQuestion);

  if (profileQuestion) {
    return {
      ...profileQuestion,
      prompt,
      required: true,
      contextOnly: false
    };
  }

  return {
    id: fieldId,
    stage: "missing_details",
    prompt,
    type: fallback?.type ?? "text_or_unknown",
    required: true,
    contextOnly: false,
    options: fallback?.options ?? null
  };
}

export function safeUserFacingEngineText(text: string, options?: { locale?: Locale }) {
  const locale = options?.locale ?? "en";
  const plain = consumerSafeEngineText(text, locale);
  const sanitized = text
    .replace(/source_question_[a-z0-9_-]+/gi, "A source detail")
    .replace(/\b(age_at_offense|trafficking_status|pardon_status|disposition_date)\b/g, (fieldId) => friendlyMissingFieldLabel(fieldId, null, locale));
  if (plain) return plain;
  return resolveRuntimeText(locale, sanitized);
}

function consumerSafeEngineText(text: string, locale: Locale) {
  if (text === "The answers require source review before a packet decision.") {
    return t(locale, "result.ms_missing_detail_title", "We need one more detail before we can prepare the right packet.");
  }
  if (
    text === "The source-specific waiting period has no safely executable date anchor."
    || /^The .+ date is needed before the source-specific waiting period can be evaluated\.$/.test(text)
  ) {
    return t(locale, "result.ms_missing_date_anchor", "We need the case date, disposition date, or completion date used to check the waiting period.");
  }
  if (text === "Get source review before any filing packet is generated.") {
    return t(locale, "result.ms_missing_date_next_step", "Save your progress and update your answers when you have that detail.");
  }
  return "";
}

function looksLikeRawFieldKey(value: string) {
  return /(^|[^a-z])[a-z0-9]+_[a-z0-9_]+([^a-z]|$)/.test(value);
}

function humanizeFieldId(fieldId: string) {
  const words = fieldId
    .replace(/source_question_/gi, "")
    .split(/[_\W]+/)
    .map((word) => word.trim())
    .filter(Boolean);

  if (words.length === 0) return "this detail";
  return words.join(" ");
}
