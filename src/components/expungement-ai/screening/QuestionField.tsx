"use client";

/**
 * The question-type -> component mapping. This is the reusability key for the whole flow: the
 * `type` field on each profile question selects the input. One renderer handles all 51 states;
 * adding a new question type is a single case here, never a per-state component.
 *
 * Handles every type observed across the 51 consumer profiles:
 *   single_choice | multi_select | yes_no_unsure | yes_no_prefer_not_to_say
 *   text | text_or_unknown | date_or_unknown | number_or_range
 * An unsupported required type stays unresolved with an explicit recovery message.
 *
 * Accessibility: the prompt is a real heading, and exactly one heading on a
 * screen is an `<h1>`. On a screening screen that is the question itself. Inside
 * a packet-information section the page owns the `<h1>` ("Complete packet
 * information"), the section heading is an `<h2>` and each question below it is
 * an `<h3>`, which is what `headingLevel` selects. The naming relationships are
 * unchanged either way. Choice groups and inputs
 * are named by it via `aria-labelledby`, with the contextOnly note and error text linked via
 * `aria-describedby`. Errors use `role="alert"`.
 */
import type { AnswerValue, ProfileQuestion } from "@/lib/expungement-ai/frontend/contracts";
import { CalendarDateField } from "@/components/expungement-ai/screening/fields/CalendarDateField";
import { exclusiveOptionsFor, scalarAnswerText } from "@/lib/expungement-ai/question-answer-state";
import { readOrUnknown, type OrUnknownValue } from "@/components/expungement-ai/screening/answers";
import { ContextOnlyBanner } from "@/components/expungement-ai/screening/ContextOnlyBanner";
import { OptionGroup } from "@/components/expungement-ai/screening/fields/OptionGroup";
import { OrUnknownField } from "@/components/expungement-ai/screening/fields/OrUnknownField";
import { useLocalization } from "@/components/expungement-ai/LocalizationProvider";
import { localizeProfileText } from "@/lib/expungement-ai/localization";

const YES_NO_UNSURE_OPTIONS = ["Yes", "No", "I am not sure"];
const YES_NO_PREFER_NOT_OPTIONS = ["Yes", "No", "Prefer not to say"];

export function QuestionField({
  question,
  stateCode,
  value,
  onChange,
  error,
  headingLevel = 1
}: {
  question: ProfileQuestion;
  stateCode: string;
  value: AnswerValue | undefined;
  onChange: (value: AnswerValue) => void;
  error?: string | null;
  /** 1 when the question is the screen's own heading, 3 when it sits under a section heading. */
  headingLevel?: 1 | 2 | 3;
}) {
  const { locale, t: translate, text: localizeText } = useLocalization();
  const fieldId = `q-${question.id}`;
  const promptId = `${fieldId}-prompt`;
  const errorId = error ? `${fieldId}-error` : undefined;
  const contextId = question.contextOnly ? `${fieldId}-context` : undefined;
  const helperId = question.helperText ? `${fieldId}-helper` : undefined;
  const describedBy = [contextId, helperId, errorId].filter(Boolean).join(" ") || undefined;
  const optional = question.contextOnly || !question.required;
  const promptText =
    locale === "es" && question.translations?.es?.prompt
      ? question.translations.es.prompt
      : localizeProfileText(locale, question.prompt, { state: stateCode, questionId: question.id, part: "prompt" });
  const helperText =
    locale === "es" && question.translations?.es?.helperText
      ? question.translations.es.helperText
      : question.helperText
        ? localizeProfileText(locale, question.helperText, { state: stateCode, questionId: question.id, part: "helper" })
        : "";

  const heading = (
    <PromptHeading
      id={promptId}
      prompt={promptText}
      optional={optional}
      contextOnly={question.contextOnly}
      optionalLabel={translate("common.optional", "Optional")}
      headingLevel={headingLevel}
    />
  );
  const bannerNode = question.contextOnly ? <ContextOnlyBanner id={contextId} /> : null;
  // TODO(save-and-resume): PR 3 attaches the save affordance near readiness helper copy.
  const helperNode = question.helperText ? (
    <p id={helperId} className="text-[13.5px] leading-6 text-[#5A6275]">
      {helperText}
    </p>
  ) : null;
  const errorNode = error ? (
    <p id={errorId} role="alert" className="text-[13px] font-semibold text-[#C2410C]">
      {localizeText(error)}
    </p>
  ) : null;

  switch (question.type) {
    case "single_choice":
    case "yes_no_unsure":
    case "yes_no_prefer_not_to_say": {
      const options =
        question.type === "yes_no_unsure"
          ? YES_NO_UNSURE_OPTIONS
          : question.type === "yes_no_prefer_not_to_say"
            ? YES_NO_PREFER_NOT_OPTIONS
            : question.options ?? [];

      if (options.length === 0) return <MalformedQuestion prompt={promptText} headingLevel={headingLevel} required={!optional} />;

      return (
        <div className="grid gap-3">
          {heading}
          {helperNode}
          {bannerNode}
          <OptionGroup
            mode="single"
            name={fieldId}
            options={options}
            optionDisplay={question.optionDisplay}
            questionId={question.id}
            stateCode={stateCode}
            value={value && typeof value === "object" && "unknown" in value && value.unknown ? "" : scalarAnswerText(value) ?? ""}
            onChange={(next) => onChange(next)}
            ariaLabelledBy={promptId}
            ariaDescribedBy={describedBy}
            invalid={Boolean(error)}
          />
          {errorNode}
        </div>
      );
    }

    case "multi_select": {
      const options = question.options ?? [];
      if (options.length === 0) return <MalformedQuestion prompt={promptText} headingLevel={headingLevel} required={!optional} />;

      return (
        <div className="grid gap-3">
          {heading}
          {helperNode}
          {bannerNode}
          <OptionGroup
            mode="multi"
            exclusiveOptions={exclusiveOptionsFor(question)}
            name={fieldId}
            options={options}
            optionDisplay={question.optionDisplay}
            questionId={question.id}
            stateCode={stateCode}
            value={Array.isArray(value) ? value : []}
            onChange={(next) => onChange(next)}
            ariaLabelledBy={promptId}
            ariaDescribedBy={describedBy}
            invalid={Boolean(error)}
          />
          {errorNode}
        </div>
      );
    }

    case "text":
      return (
        <div className="grid gap-3">
          {heading}
          {helperNode}
          {bannerNode}
          <input
            id={fieldId}
            className="min-h-[48px] rounded-xl border-[1.5px] border-[#E4E8EF] bg-white px-4 text-[15.5px] text-[#0B1320] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00A99D]"
            type="text"
            value={scalarAnswerText(value) ?? ""}
            onChange={(event) => onChange(event.target.value)}
            aria-labelledby={promptId}
            aria-describedby={describedBy}
            aria-invalid={Boolean(error) || undefined}
          />
          {errorNode}
        </div>
      );

    case "text_or_unknown":
    case "number_or_range": {
      const config = OR_UNKNOWN_CONFIG[question.type as keyof typeof OR_UNKNOWN_CONFIG];
      return (
        <div className="grid gap-3">
          {heading}
          {helperNode}
          {bannerNode}
          <OrUnknownField
            id={fieldId}
            inputType={config.inputType}
            unknownLabel={translate(config.unknownKey, config.unknownLabel)}
            placeholder={config.placeholder}
            value={readOrUnknown(value)}
            onChange={(next: OrUnknownValue) => onChange(next)}
            ariaLabelledBy={promptId}
            ariaDescribedBy={describedBy}
            invalid={Boolean(error)}
          />
          {errorNode}
        </div>
      );
    }

    case "date":
    case "date_or_unknown": {
      return (
        <div className="grid gap-3">
          {heading}
          {helperNode}
          {bannerNode}
          <CalendarDateField
            id={fieldId}
            value={readOrUnknown(value)}
            unknownLabel={question.type === "date_or_unknown" ? translate("answer.dont_know_date", "I don't know the date") : undefined}
            birthDate={question.id === "date_of_birth"}
            onChange={(next: OrUnknownValue) => onChange(question.type === "date" ? next.value ?? "" : next)}
            ariaLabelledBy={promptId}
            ariaDescribedBy={describedBy}
            invalid={Boolean(error)}
          />
          {errorNode}
        </div>
      );
    }

    default:
      // A required unsupported control stays unresolved; never promise an uncreated review task.
      return <MalformedQuestion prompt={promptText} headingLevel={headingLevel} required={!optional} />;
  }
}

const OR_UNKNOWN_CONFIG = {
  text_or_unknown: { inputType: "text" as const, unknownLabel: "I'm not sure", unknownKey: "answer.not_sure", placeholder: undefined },
  number_or_range: { inputType: "number" as const, unknownLabel: "I'm not sure", unknownKey: "answer.not_sure", placeholder: undefined }
};

function PromptHeading({
  id,
  prompt,
  optional,
  contextOnly,
  optionalLabel,
  headingLevel
}: {
  id: string;
  prompt: string;
  optional: boolean;
  contextOnly: boolean;
  optionalLabel: string;
  headingLevel: 1 | 2 | 3;
}) {
  const Heading = headingLevel === 3 ? "h3" : headingLevel === 2 ? "h2" : "h1";
  const className = headingLevel === 1
    ? "text-[19px] font-extrabold leading-[1.3] text-[#0B1320] md:text-[22px]"
    : "text-[16px] font-extrabold leading-[1.35] text-[#0B1320] md:text-[17px]";
  return (
    <Heading id={id} className={className}>
      {prompt}
      {optional && !contextOnly ? (
        <span className="ml-2 align-middle text-xs font-bold uppercase tracking-[0.06em] text-[#8A93A6]">{optionalLabel}</span>
      ) : null}
    </Heading>
  );
}

function MalformedQuestion({ prompt, headingLevel, required }: { prompt: string; headingLevel: 1 | 2 | 3; required: boolean }) {
  const Heading = headingLevel === 3 ? "h3" : headingLevel === 2 ? "h2" : "h1";
  const { t: translate } = useLocalization();
  return (
    <div className="grid gap-2">
      <Heading className="text-[19px] font-extrabold leading-[1.3] text-[#0B1320] md:text-[22px]">{prompt}</Heading>
      <p className="rounded-xl border border-[#F4D9C7] bg-[#FDF1E8] px-4 py-3 text-[13px] leading-6 text-[#9A3412]">
        {required
          ? translate("screening.question_unavailable_required", "We could not show this required question. Save your progress and try again. This detail is still needed before verification.")
          : translate("screening.question_unavailable_optional", "We could not show this optional question. You can continue without answering it.")}
      </p>
    </div>
  );
}
