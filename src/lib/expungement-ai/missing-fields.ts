import type { ProfileQuestion, QuestionType } from "@/lib/expungement-ai/frontend/contracts";
import { resolveRuntimeText, t, type Locale } from "@/lib/expungement-ai/localization";

type MissingFieldFallback = {
  prompt: string;
  type: QuestionType;
  options?: string[] | null;
};

const FRIENDLY_MISSING_FIELD_FALLBACKS: Record<string, MissingFieldFallback> = {
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
  const sanitized = text
    .replace(/source_question_[a-z0-9_-]+/gi, "A source detail")
    .replace(/\b(age_at_offense|trafficking_status|pardon_status)\b/g, (fieldId) => friendlyMissingFieldLabel(fieldId, null, locale));
  return resolveRuntimeText(locale, sanitized);
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
