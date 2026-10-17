"use client";

import type { OrUnknownValue } from "@/components/expungement-ai/screening/answers";
import { useLocalization } from "@/components/expungement-ai/LocalizationProvider";
import { isCalendarDate } from "@/lib/expungement-ai/question-answer-state";

/** Partial dates remain drafts; only an actual ISO calendar date satisfies readiness. */
export function CalendarDateField({ id, value, onChange, unknownLabel, ariaLabelledBy, ariaDescribedBy, invalid, birthDate = false }: {
  id: string;
  value: OrUnknownValue;
  onChange: (value: OrUnknownValue) => void;
  unknownLabel?: string;
  ariaLabelledBy?: string;
  ariaDescribedBy?: string;
  invalid?: boolean;
  birthDate?: boolean;
}) {
  const { locale } = useLocalization();
  const es = locale === "es";
  const raw = value.value ?? "";
  const match = /^(\d{0,4})-(\d{0,2})-(\d{0,2})$/.exec(raw);
  const parts = match ? { year: match[1], month: match[2], day: match[3] } : { year: "", month: "", day: "" };
  const unknown = value.unknown === true;
  const invalidDate = !unknown && Boolean(raw) && (!isCalendarDate(raw) || (birthDate && raw > new Date().toISOString().slice(0, 10)));
  const detailId = `${id}-date-detail`;
  const description = [ariaDescribedBy, invalidDate ? detailId : undefined].filter(Boolean).join(" ") || undefined;
  const inputClass = "min-h-[48px] w-full rounded-xl border-[1.5px] border-[#E4E8EF] bg-white px-3 text-[15px] text-[#0B1320] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00A99D] disabled:bg-[#F2F4F8]";
  function update(part: "month" | "day" | "year", next: string) {
    const draft = { ...parts, [part]: next };
    onChange({ value: `${draft.year}-${draft.month}-${draft.day}`, unknown: false });
  }
  return (
    <div className="grid gap-2">
      {raw && !match && !unknown ? (
        <div className="grid gap-1 text-sm">
          <label htmlFor={`${id}-legacy`}>{es ? "Fecha guardada: revísela y escriba año-mes-día." : "Saved date: review it and enter year-month-day."}</label>
          <input id={`${id}-legacy`} className={inputClass} value={raw} onChange={(event) => onChange({ value: event.target.value, unknown: false })} aria-describedby={description} aria-invalid="true" />
        </div>
      ) : null}
      <div className="grid grid-cols-3 gap-2" role="group" aria-labelledby={ariaLabelledBy} aria-describedby={description}>
        <label className="grid gap-1 text-xs font-bold text-[#5A6275]">
          {es ? "Mes" : "Month"}
          <select id={id} className={inputClass} disabled={unknown} value={parts.month} onChange={(event) => update("month", event.target.value)} aria-invalid={invalid || invalidDate || undefined} aria-describedby={description}>
            <option value="">MM</option>
            {Array.from({ length: 12 }, (_, i) => String(i + 1).padStart(2, "0")).map((month) => <option key={month} value={month}>{month}</option>)}
          </select>
        </label>
        <label className="grid gap-1 text-xs font-bold text-[#5A6275]">
          {es ? "Día" : "Day"}
          <select className={inputClass} disabled={unknown} value={parts.day} onChange={(event) => update("day", event.target.value)} aria-invalid={invalid || invalidDate || undefined} aria-describedby={description}>
            <option value="">DD</option>
            {Array.from({ length: 31 }, (_, i) => String(i + 1).padStart(2, "0")).map((day) => <option key={day} value={day}>{day}</option>)}
          </select>
        </label>
        <label className="grid gap-1 text-xs font-bold text-[#5A6275]">
          {es ? "Año" : "Year"}
          <input className={inputClass} type="text" inputMode="numeric" maxLength={4} placeholder={es ? "AAAA" : "YYYY"} disabled={unknown} value={parts.year} onChange={(event) => update("year", event.target.value)} aria-invalid={invalid || invalidDate || undefined} aria-describedby={description} />
        </label>
      </div>
      {invalidDate ? <p id={detailId} className="text-sm text-[#9A3412]">{es ? "Complete una fecha válida. Puede guardar una fecha incompleta para terminarla después." : "Enter a complete, valid date. You can save an incomplete date and finish it later."}</p> : null}
      {unknownLabel ? (
        <label htmlFor={`${id}-unknown`} className="flex min-h-[44px] cursor-pointer items-center gap-3 rounded-xl border border-[#E4E8EF] bg-[#FBFCFE] px-4 py-2 text-sm font-semibold text-[#5A6275] focus-within:ring-2 focus-within:ring-[#00A99D]">
          <input id={`${id}-unknown`} className="h-5 w-5 shrink-0 accent-[#00A99D]" type="checkbox" checked={unknown} onChange={(event) => onChange(event.target.checked ? { value: raw, unknown: true } : { value: raw, unknown: false })} />
          <span>{unknownLabel}</span>
        </label>
      ) : null}
    </div>
  );
}
