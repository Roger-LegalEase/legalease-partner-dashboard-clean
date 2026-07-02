"use client";

/**
 * The question-type -> component mapping. This is the reusability key for the whole flow: the
 * `type` field on each profile question selects the input. One renderer handles all 51 states;
 * adding a new question type is a single case here, never a per-state component.
 *
 * Handles every type observed across the 51 consumer profiles:
 *   single_choice | multi_select | yes_no_unsure | yes_no_prefer_not_to_say
 *   text | text_or_unknown | date_or_unknown | number_or_range
 * Any unknown/future type degrades to a calm, non-blocking fallback (never a crash, never a
 * silently-skipped required answer that fakes a result).
 *
 * Accessibility: the prompt is a real heading (`<h1>`, one per screen). Choice groups and inputs
 * are named by it via `aria-labelledby`, with the contextOnly note and error text linked via
 * `aria-describedby`. Errors use `role="alert"`.
 */
import type { AnswerValue, ProfileQuestion } from "@/lib/expungement-ai/frontend/contracts";
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
  error
}: {
  question: ProfileQuestion;
  stateCode: string;
  value: AnswerValue | undefined;
  onChange: (value: AnswerValue) => void;
  error?: string | null;
}) {
  const { locale, t: translate } = useLocalization();
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
      {translate("screening.answer_required", error)}
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

      if (options.length === 0) return <MalformedQuestion prompt={promptText} />;

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
            value={typeof value === "string" ? value : ""}
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
      if (options.length === 0) return <MalformedQuestion prompt={promptText} />;

      return (
        <div className="grid gap-3">
          {heading}
          {helperNode}
          {bannerNode}
          <OptionGroup
            mode="multi"
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
            value={typeof value === "string" ? value : ""}
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

    case "date_or_unknown": {
      return (
        <div className="grid gap-3">
          {heading}
          {helperNode}
          {bannerNode}
          <DateOrUnknownField
            id={fieldId}
            value={readOrUnknown(value)}
            unknownLabel={translate("answer.dont_know_date", "I don't know the date")}
            onChange={(next: OrUnknownValue) => onChange(next)}
            ariaLabelledBy={promptId}
            ariaDescribedBy={describedBy}
            invalid={Boolean(error)}
          />
          {errorNode}
        </div>
      );
    }

    default:
      // Unknown/unsupported question type: render a calm note. The flow treats this as
      // non-blocking so a malformed type can never strand the user or fake a result.
      return <MalformedQuestion prompt={promptText} />;
  }
}

const OR_UNKNOWN_CONFIG = {
  text_or_unknown: { inputType: "text" as const, unknownLabel: "I'm not sure", unknownKey: "answer.not_sure", placeholder: undefined },
  number_or_range: { inputType: "number" as const, unknownLabel: "I'm not sure", unknownKey: "answer.not_sure", placeholder: undefined }
};

function DateOrUnknownField({
  id,
  value,
  unknownLabel,
  onChange,
  ariaLabelledBy,
  ariaDescribedBy,
  invalid
}: {
  id: string;
  value: OrUnknownValue;
  unknownLabel: string;
  onChange: (value: OrUnknownValue) => void;
  ariaLabelledBy?: string;
  ariaDescribedBy?: string;
  invalid?: boolean;
}) {
  const parsed = parseIsoDate(value.value);
  const isUnknown = value.unknown === true;
  const unknownId = `${id}-unknown`;
  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 90 }, (_, index) => currentYear - index);

  function update(part: "month" | "day" | "year", next: string) {
    const parts = {
      month: parsed?.month ?? "",
      day: parsed?.day ?? "",
      year: parsed?.year ?? "",
      [part]: next
    };
    const iso = toIsoDate(parts.year, parts.month, parts.day);
    onChange({ value: iso, unknown: false });
  }

  return (
    <div className="grid gap-2">
      <div className="grid grid-cols-3 gap-2" role="group" aria-labelledby={ariaLabelledBy} aria-describedby={ariaDescribedBy}>
        <label className="grid gap-1 text-xs font-bold uppercase text-[#5A6275]">
          Month
          <select
            className="min-h-[48px] rounded-xl border-[1.5px] border-[#E4E8EF] bg-white px-3 text-[15px] text-[#0B1320] disabled:bg-[#F2F4F8]"
            disabled={isUnknown}
            value={parsed?.month ?? ""}
            onChange={(event) => update("month", event.target.value)}
            aria-invalid={invalid || undefined}
          >
            <option value="">MM</option>
            {Array.from({ length: 12 }, (_, index) => String(index + 1).padStart(2, "0")).map((month) => <option key={month} value={month}>{month}</option>)}
          </select>
        </label>
        <label className="grid gap-1 text-xs font-bold uppercase text-[#5A6275]">
          Day
          <select
            className="min-h-[48px] rounded-xl border-[1.5px] border-[#E4E8EF] bg-white px-3 text-[15px] text-[#0B1320] disabled:bg-[#F2F4F8]"
            disabled={isUnknown}
            value={parsed?.day ?? ""}
            onChange={(event) => update("day", event.target.value)}
            aria-invalid={invalid || undefined}
          >
            <option value="">DD</option>
            {Array.from({ length: 31 }, (_, index) => String(index + 1).padStart(2, "0")).map((day) => <option key={day} value={day}>{day}</option>)}
          </select>
        </label>
        <label className="grid gap-1 text-xs font-bold uppercase text-[#5A6275]">
          Year
          <select
            className="min-h-[48px] rounded-xl border-[1.5px] border-[#E4E8EF] bg-white px-3 text-[15px] text-[#0B1320] disabled:bg-[#F2F4F8]"
            disabled={isUnknown}
            value={parsed?.year ?? ""}
            onChange={(event) => update("year", event.target.value)}
            aria-invalid={invalid || undefined}
          >
            <option value="">YYYY</option>
            {years.map((year) => <option key={year} value={year}>{year}</option>)}
          </select>
        </label>
      </div>
      <input id={id} type="hidden" value={value.value ?? ""} readOnly />
      <label
        htmlFor={unknownId}
        className="flex min-h-[44px] cursor-pointer items-center gap-3 rounded-xl border border-[#E4E8EF] bg-[#FBFCFE] px-4 py-2 text-sm font-semibold text-[#5A6275] focus-within:ring-2 focus-within:ring-[#00A99D]"
      >
        <input
          id={unknownId}
          className="h-5 w-5 shrink-0 accent-[#00A99D]"
          type="checkbox"
          checked={isUnknown}
          onChange={(event) => onChange(event.target.checked ? { unknown: true } : { value: "", unknown: false })}
        />
        <span>{unknownLabel}</span>
      </label>
    </div>
  );
}

function parseIsoDate(value: string | undefined) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value ?? "");
  return match ? { year: match[1], month: match[2], day: match[3] } : null;
}

function toIsoDate(year: string, month: string, day: string) {
  if (!/^\d{4}$/.test(year) || !/^\d{2}$/.test(month) || !/^\d{2}$/.test(day)) return "";
  const date = new Date(`${year}-${month}-${day}T00:00:00.000Z`);
  if (Number.isNaN(date.getTime())) return "";
  if (date.getUTCFullYear() !== Number(year) || date.getUTCMonth() + 1 !== Number(month) || date.getUTCDate() !== Number(day)) return "";
  return `${year}-${month}-${day}`;
}

function PromptHeading({
  id,
  prompt,
  optional,
  contextOnly,
  optionalLabel
}: {
  id: string;
  prompt: string;
  optional: boolean;
  contextOnly: boolean;
  optionalLabel: string;
}) {
  return (
    <h1 id={id} className="text-[19px] font-extrabold leading-[1.3] text-[#0B1320] md:text-[22px]">
      {prompt}
      {optional && !contextOnly ? (
        <span className="ml-2 align-middle text-xs font-bold uppercase tracking-[0.06em] text-[#8A93A6]">{optionalLabel}</span>
      ) : null}
    </h1>
  );
}

function MalformedQuestion({ prompt }: { prompt: string }) {
  const { t: translate } = useLocalization();
  return (
    <div className="grid gap-2">
      <h1 className="text-[19px] font-extrabold leading-[1.3] text-[#0B1320] md:text-[22px]">{prompt}</h1>
      <p className="rounded-xl border border-[#F4D9C7] bg-[#FDF1E8] px-4 py-3 text-[13px] leading-6 text-[#9A3412]">
        {translate("screening.question_unavailable", "We could not show this question right now. You can continue, and a reviewer will follow up if this detail is needed.")}
      </p>
    </div>
  );
}
