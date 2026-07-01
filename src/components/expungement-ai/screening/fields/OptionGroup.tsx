"use client";

/**
 * Reusable choice primitive: a radio group (single select) or checkbox group (multi select).
 * Powers `single_choice`, `multi_select`, `yes_no_unsure`, and `yes_no_prefer_not_to_say`.
 *
 * Accessibility: each option is a >=44px tap target with a visible keyboard focus ring. The
 * prompt/legend is provided by the parent <fieldset> in QuestionField.
 */
import { useId } from "react";
import { useLocalization } from "@/components/expungement-ai/LocalizationProvider";
import { localizeProfileText, runtimeCopyKeyForText } from "@/lib/expungement-ai/localization";

type SingleProps = {
  mode: "single";
  options: string[];
  optionDisplay?: OptionDisplayMap;
  value: string;
  onChange: (value: string) => void;
  name: string;
  ariaLabelledBy?: string;
  ariaDescribedBy?: string;
  invalid?: boolean;
  questionId: string;
  stateCode: string;
};

type MultiProps = {
  mode: "multi";
  options: string[];
  optionDisplay?: OptionDisplayMap;
  value: string[];
  onChange: (value: string[]) => void;
  name: string;
  ariaLabelledBy?: string;
  ariaDescribedBy?: string;
  invalid?: boolean;
  questionId: string;
  stateCode: string;
};

export type OptionGroupProps = SingleProps | MultiProps;
type OptionDisplayMap = Record<string, {
  label: string;
  helperText?: string;
  translations?: {
    es?: {
      label?: string;
      helperText?: string;
    };
  };
}>;

export function OptionGroup(props: OptionGroupProps) {
  const groupId = useId();
  const { locale, text: localize } = useLocalization();
  const inputType = props.mode === "single" ? "radio" : "checkbox";

  function isChecked(option: string): boolean {
    return props.mode === "single" ? props.value === option : props.value.includes(option);
  }

  function toggle(option: string) {
    if (props.mode === "single") {
      props.onChange(option);
      return;
    }
    const next = props.value.includes(option)
      ? props.value.filter((item) => item !== option)
      : [...props.value, option];
    props.onChange(next);
  }

  return (
    <div
      className="grid gap-2"
      role={props.mode === "single" ? "radiogroup" : "group"}
      aria-labelledby={props.ariaLabelledBy}
      aria-describedby={props.ariaDescribedBy}
    >
      {props.options.map((option, index) => {
        const id = `${groupId}-${index}`;
        const display = props.optionDisplay?.[option];
        const label = display?.label ?? option;
        const localizedLabel = display?.label
          ? locale === "es" && display.translations?.es?.label
            ? display.translations.es.label
            : localizeProfileText(locale, display.label, { state: props.stateCode, questionId: props.questionId, part: `option.${option}.label` })
          : localize(option, { key: runtimeCopyKeyForText(option) });
        const localizedHelper = display?.helperText
          ? locale === "es" && display.translations?.es?.helperText
            ? display.translations.es.helperText
            : localizeProfileText(locale, display.helperText, { state: props.stateCode, questionId: props.questionId, part: `option.${option}.helper` })
          : "";
        const checked = isChecked(option);
        return (
          <label
            key={option}
            htmlFor={id}
            className={`flex min-h-[48px] cursor-pointer items-center gap-3 rounded-xl border px-4 py-3 text-sm font-semibold transition-colors focus-within:ring-2 focus-within:ring-[#00A99D] focus-within:ring-offset-1 motion-reduce:transition-none ${
              checked
                ? "border-[#00A99D] bg-[#E7F7F4] text-[#0B1320]"
                : "border-[#E4E8EF] bg-[#FBFCFE] text-[#0B1320] hover:border-[#CBD5E1]"
            }`}
          >
            <input
              id={id}
              className="h-5 w-5 shrink-0 accent-[#00A99D]"
              type={inputType}
              name={props.name}
              value={option}
              checked={checked}
              onChange={() => toggle(option)}
              aria-describedby={props.ariaDescribedBy}
              aria-invalid={props.invalid || undefined}
            />
            <span className="grid gap-1">
              <span>{localizedLabel || label}</span>
              {display?.helperText ? (
                <span className="text-[12.5px] font-medium leading-5 text-[#5A6275]">{localizedHelper}</span>
              ) : null}
            </span>
          </label>
        );
      })}
    </div>
  );
}
