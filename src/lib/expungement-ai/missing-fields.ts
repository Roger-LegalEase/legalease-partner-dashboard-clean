import type { ProfileQuestion, QuestionType } from "@/lib/expungement-ai/frontend/contracts";
import { resolveRuntimeText, t, type Locale } from "@/lib/expungement-ai/localization";

type MissingFieldFallback = {
  prompt: string;
  type: QuestionType;
  options?: string[] | null;
};

const FRIENDLY_MISSING_FIELD_FALLBACKS: Record<string, MissingFieldFallback> = {
  resolved_timing_bucket: {
    prompt: "About how long ago did this case end or get resolved?",
    type: "single_choice",
    options: [
      "lt_1_year",
      "years_1_to_2",
      "years_2_to_3",
      "years_3_to_5",
      "years_5_to_7",
      "years_7_to_10",
      "gt_10_years",
      "not_sure",
      "still_open"
    ]
  },
  court_requirements_completed: {
    prompt: "Have you completed everything the court ordered in this case?",
    type: "single_choice",
    options: ["yes", "no", "not_sure", "not_applicable"]
  },
  disposition_date: {
    prompt: "About how long ago did this case end or get resolved?",
    type: "single_choice",
    options: [
      "lt_1_year",
      "years_1_to_2",
      "years_2_to_3",
      "years_3_to_5",
      "years_5_to_7",
      "years_7_to_10",
      "gt_10_years",
      "not_sure",
      "still_open"
    ]
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
    .replace(/\b(age_at_offense|trafficking_status|pardon_status|disposition_date|resolved_timing_bucket|court_requirements_completed)\b/g, (fieldId) => friendlyMissingFieldLabel(fieldId, null, locale));
  if (plain) return plain;
  return resolveRuntimeText(locale, sanitized);
}

function consumerSafeEngineText(text: string, locale: Locale) {
  if (
    text === "The answers require source review before a packet decision."
    || /source review|packet decision|compiled source rule|deterministic compiled|evaluator|diagnostic/i.test(text)
  ) {
    return t(locale, "result.ms_missing_detail_title", "We need one more detail before we can prepare the right packet.");
  }
  if (
    text === "The source-specific waiting period has no safely executable date anchor."
    || /^The .+ date is needed before the source-specific waiting period can be evaluated\.$/.test(text)
    || /date anchor|safely executable|source-specific waiting period/i.test(text)
  ) {
    const waitUntil = text.match(/\b(\d{4}-\d{2}-\d{2})\b/);
    if (waitUntil) {
      return resolveRuntimeText(locale, `The waiting period appears to run until ${waitUntil[1]}. The court or agency makes the final decision.`);
    }
    return t(locale, "result.ms_missing_date_anchor", "We need one more detail before we can prepare the right packet.");
  }
  if (text === "Get source review before any filing packet is generated.") {
    return t(locale, "result.ms_missing_date_next_step", "Save your progress and update your answers when you have that detail.");
  }
  const softened = text
    .replace(/source-defined/gi, "state")
    .replace(/source-backed/gi, "state")
    .replace(/source-listed/gi, "required")
    .replace(/source-specific/gi, "state")
    .replace(/engine decides/gi, "the court or agency makes the final decision");
  return softened === text ? "" : softened;
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
