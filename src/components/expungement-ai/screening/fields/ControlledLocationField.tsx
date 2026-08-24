"use client";

/**
 * The county/court field: a searchable controlled list, a county-filtered court
 * list, an explicit "I'm not sure", and a manual entry whose value is stored in
 * its own field and never presented as confirmed.
 *
 * This is the renderer half of UX-COUNTY-001 / UX-COURT-001. Six Phase 3 shards
 * each prepared their state's dataset and every one of them stopped here,
 * because `QuestionField` had no arm that could offer a controlled option list
 * and a separate manual value at the same time — so county and court stayed free
 * text and a misspelling could reach a filing unchecked.
 *
 * Nothing here decides eligibility, a packet or a payment. It collects a
 * location and is honest about which half of it is confirmed.
 */
import { useMemo, useState } from "react";
import type { AnswerValue, ControlledLocationDatasetPayload, ControlledLocationValue } from "@/lib/expungement-ai/frontend/contracts";

function readValue(value: AnswerValue | undefined): ControlledLocationValue {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    // A plain string is a pre-existing free-text answer for this question. It is
    // kept as an unverified manual value rather than silently discarded.
    const text = typeof value === "string" ? value.trim() : "";
    return text ? { manualValue: text } : {};
  }
  const record = value as ControlledLocationValue;
  return {
    value: typeof record.value === "string" ? record.value : undefined,
    controlledId: typeof record.controlledId === "string" ? record.controlledId : undefined,
    controlledCountyId: typeof record.controlledCountyId === "string" ? record.controlledCountyId : undefined,
    manualValue: typeof record.manualValue === "string" ? record.manualValue : undefined,
    unknown: record.unknown === true
  };
}

const NOT_SURE = "__not_sure__";
const MANUAL = "__manual__";

export function ControlledLocationField({
  dataset,
  value,
  onChange,
  labelledBy,
  describedBy
}: {
  dataset: ControlledLocationDatasetPayload;
  value: AnswerValue | undefined;
  onChange: (next: AnswerValue) => void;
  labelledBy: string;
  describedBy?: string;
}) {
  const current = readValue(value);
  const [search, setSearch] = useState("");

  const isCourt = dataset.kind === "court";
  const countyId = current.controlledCountyId;

  const courts = useMemo(() => {
    if (!isCourt) return [];
    if (!countyId) return dataset.courts;
    const filtered = dataset.courts.filter((court) => court.counties === null || court.counties.includes(countyId));
    return filtered.length > 0 ? filtered : dataset.courts.filter((court) => court.counties === null);
  }, [isCourt, countyId, dataset.courts]);

  const options = isCourt
    ? courts.map((court) => ({ id: court.id, label: court.label, detail: [court.courtType, court.location].filter(Boolean).join(" · ") }))
    : dataset.counties.map((county) => ({ id: county.id, label: county.label, detail: "" }));

  const needle = search.trim().toLowerCase();
  const visible = needle ? options.filter((option) => option.label.toLowerCase().includes(needle) || option.detail.toLowerCase().includes(needle)) : options;

  const mode = current.unknown ? NOT_SURE : current.manualValue !== undefined && !current.controlledId ? MANUAL : current.controlledId ?? "";

  const pickControlled = (id: string, label: string) => {
    onChange({
      value: label,
      controlledId: id,
      ...(isCourt && countyId ? { controlledCountyId: countyId } : {}),
      ...(!isCourt ? { controlledCountyId: id } : {})
    });
  };

  return (
    <div className="space-y-3" role="group" aria-labelledby={labelledBy} aria-describedby={describedBy}>
      {isCourt && dataset.counties.length > 0 ? (
        <label className="block space-y-1.5">
          <span className="text-[13.5px] font-semibold text-[#41506B]">First, which county is the case in?</span>
          <select
            className="w-full rounded-[10px] border border-[#DCE6F5] bg-white px-3 py-2.5 text-[15px] text-[#1F2937]"
            value={countyId ?? ""}
            onChange={(event) => {
              const nextCounty = event.target.value || undefined;
              // Changing the county invalidates a court chosen under the old one.
              onChange({ controlledCountyId: nextCounty });
              setSearch("");
            }}
          >
            <option value="">Select a county</option>
            {dataset.counties.map((county) => (
              <option key={county.id} value={county.id}>{county.label}</option>
            ))}
          </select>
        </label>
      ) : null}

      {options.length > 8 ? (
        <input
          type="search"
          className="w-full rounded-[10px] border border-[#DCE6F5] bg-white px-3 py-2.5 text-[15px] text-[#1F2937]"
          placeholder={isCourt ? "Search courts" : "Search counties"}
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          aria-label={isCourt ? "Search courts" : "Search counties"}
        />
      ) : null}

      <div className="max-h-[19rem] space-y-1.5 overflow-y-auto">
        {visible.map((option) => (
          <label key={option.id} className="flex cursor-pointer items-start gap-2.5 rounded-[10px] border border-[#DCE6F5] bg-white px-3 py-2.5">
            <input
              type="radio"
              className="mt-1"
              name={labelledBy}
              checked={mode === option.id}
              onChange={() => pickControlled(option.id, option.label)}
            />
            <span>
              <span className="block text-[15px] text-[#1F2937]">{option.label}</span>
              {option.detail ? <span className="block text-[13px] text-[#5A6275]">{option.detail}</span> : null}
            </span>
          </label>
        ))}
        {visible.length === 0 ? (
          <p className="px-1 text-[13.5px] text-[#5A6275]">
            {needle ? "Nothing on the list matches that. You can type it below instead." : "This state has no confirmed list for this question yet. You can type it below."}
          </p>
        ) : null}
      </div>

      <label className="flex cursor-pointer items-start gap-2.5 rounded-[10px] border border-[#DCE6F5] bg-white px-3 py-2.5">
        <input type="radio" className="mt-1" name={labelledBy} checked={mode === NOT_SURE} onChange={() => onChange({ unknown: true })} />
        <span>
          <span className="block text-[15px] text-[#1F2937]">{dataset.notSure.label}</span>
          <span className="block text-[13px] text-[#5A6275]">{dataset.notSure.helperText}</span>
        </span>
      </label>

      <label className="flex cursor-pointer items-start gap-2.5 rounded-[10px] border border-[#DCE6F5] bg-white px-3 py-2.5">
        <input
          type="radio"
          className="mt-1"
          name={labelledBy}
          checked={mode === MANUAL}
          onChange={() => onChange({ manualValue: current.manualValue ?? "", ...(countyId ? { controlledCountyId: countyId } : {}) })}
        />
        <span className="w-full">
          <span className="block text-[15px] text-[#1F2937]">{dataset.manualEntry.label}</span>
          <span className="block text-[13px] text-[#5A6275]">{dataset.manualEntry.helperText}</span>
          {mode === MANUAL ? (
            <input
              type="text"
              className="mt-2 w-full rounded-[10px] border border-[#DCE6F5] bg-white px-3 py-2 text-[15px] text-[#1F2937]"
              value={current.manualValue ?? ""}
              onChange={(event) => onChange({ manualValue: event.target.value, ...(countyId ? { controlledCountyId: countyId } : {}) })}
              aria-label={dataset.manualEntry.label}
            />
          ) : null}
        </span>
      </label>
    </div>
  );
}
