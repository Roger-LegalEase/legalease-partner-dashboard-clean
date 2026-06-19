"use client";

/**
 * Reusable open-input primitive with an "I'm not sure" / "Prefer not to say" escape hatch.
 * Powers `date_or_unknown`, `number_or_range`, and `text_or_unknown`.
 *
 * Choosing the unknown toggle clears any typed value and counts as a complete answer, so a user
 * who genuinely does not know can still move forward. The escape-hatch wording is supplied by the
 * caller so it matches each question type.
 */
import type { OrUnknownValue } from "@/components/expungement-ai/screening/answers";

export function OrUnknownField({
  id,
  inputType,
  unknownLabel,
  placeholder,
  value,
  onChange,
  ariaLabelledBy,
  ariaDescribedBy,
  invalid
}: {
  id: string;
  inputType: "text" | "number" | "date";
  unknownLabel: string;
  placeholder?: string;
  value: OrUnknownValue;
  onChange: (value: OrUnknownValue) => void;
  ariaLabelledBy?: string;
  ariaDescribedBy?: string;
  invalid?: boolean;
}) {
  const isUnknown = value.unknown === true;
  const unknownId = `${id}-unknown`;

  return (
    <div className="grid gap-2">
      <input
        id={id}
        className="min-h-[48px] rounded-xl border-[1.5px] border-[#E4E8EF] bg-white px-4 text-[15.5px] text-[#0B1320] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00A99D] disabled:cursor-not-allowed disabled:bg-[#F2F4F8] disabled:text-[#8A93A6]"
        type={inputType}
        inputMode={inputType === "number" ? "numeric" : undefined}
        placeholder={placeholder}
        value={value.value ?? ""}
        disabled={isUnknown}
        onChange={(event) => onChange({ value: event.target.value, unknown: false })}
        aria-labelledby={ariaLabelledBy}
        aria-describedby={ariaDescribedBy}
        aria-invalid={invalid || undefined}
      />
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
