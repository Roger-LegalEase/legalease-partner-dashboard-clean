import { Lock } from "lucide-react";
import { ConsumerPageShell } from "@/components/expungement-ai/ConsumerPageShell";
import { getConsumerStateOptions } from "@/lib/expungement-ai/states";

const outcomeOptions = [
  "Dismissed or dropped",
  "Found not guilty",
  "Completed sentence",
  "Still pending",
  "I am not sure"
];

const recordOptions = [
  "Misdemeanor",
  "Felony",
  "Arrest with no conviction",
  "Municipal or ordinance matter",
  "I am not sure"
];

export default function CheckPage() {
  const states = getConsumerStateOptions();

  return (
    <ConsumerPageShell wilmaContext="check">
      <section className="mx-auto max-w-2xl px-4 pb-16 pt-28 font-sans md:px-8">
        <div className="mb-5">
          <div className="flex items-center gap-3">
            <div className="h-2 flex-1 overflow-hidden rounded-full bg-[#E4E8EF]">
              <div className="h-full w-[58%] rounded-full bg-[#00A99D]" />
            </div>
            <span className="text-xs font-bold text-[#5A6275]">1 of 1</span>
          </div>
        </div>

        <form className="rounded-[24px] border border-[#ECEFF4] bg-white p-5 shadow-sm md:p-8" action="/expungement-ai/results" data-state-select-count={states.length}>
          <p className="text-xs font-extrabold uppercase tracking-[0.08em] text-[#00A99D]">Free screening</p>
          <h1 className="mt-3 text-[30px] font-extrabold leading-tight text-[#0B1320] md:text-[38px]">Tell us about the record.</h1>
          <p className="mt-3 text-sm leading-6 text-[#5A6275]">The live engine decides the result. These answers help it identify the state, record type, timing, and missing details.</p>

          <div className="mt-7 grid gap-4">
            <label className="grid gap-2 text-[13px] font-bold text-[#0B1320]">
              State or District
              <select className="min-h-12 rounded-xl border-[1.5px] border-[#E4E8EF] bg-white px-4 text-[15.5px] text-[#0B1320]" name="state" required>
                <option value="">Choose your state...</option>
                {states.map((state) => (
                  <option key={state.abbreviation} value={state.abbreviation}>{state.label}</option>
                ))}
              </select>
            </label>

            <fieldset className="grid gap-2">
              <legend className="text-[13px] font-bold text-[#0B1320]">What kind of record is this?</legend>
              <div className="grid gap-2">
                {recordOptions.map((option) => (
                  <label key={option} className="flex min-h-12 items-center gap-3 rounded-xl border border-[#E4E8EF] bg-[#FBFCFE] px-4 text-sm font-semibold text-[#0B1320]">
                    <input name="recordCategory" type="radio" value={option} required />
                    {option}
                  </label>
                ))}
              </div>
            </fieldset>

            <fieldset className="grid gap-2">
              <legend className="text-[13px] font-bold text-[#0B1320]">What happened with the case?</legend>
              <div className="grid gap-2">
                {outcomeOptions.map((option) => (
                  <label key={option} className="flex min-h-12 items-center gap-3 rounded-xl border border-[#E4E8EF] bg-[#FBFCFE] px-4 text-sm font-semibold text-[#0B1320]">
                    <input name="caseOutcome" type="radio" value={option} required />
                    {option}
                  </label>
                ))}
              </div>
            </fieldset>

            <label className="grid gap-2 text-[13px] font-bold text-[#0B1320]">
              When did it happen?
              <select className="min-h-12 rounded-xl border-[1.5px] border-[#E4E8EF] bg-white px-4 text-[15.5px] text-[#0B1320]" name="timing" required>
                <option value="eligible_window">More than a year ago</option>
                <option value="too_early">Recently</option>
                <option value="unknown">I am not sure</option>
              </select>
            </label>

            <div className="grid gap-3 rounded-2xl bg-[#F7F3EC] p-4 md:grid-cols-2">
              <label className="grid gap-2 text-[13px] font-bold text-[#0B1320]">
                County
                <input className="min-h-12 rounded-xl border border-[#E4E8EF] bg-white px-4 text-sm" name="county" placeholder="Optional" />
              </label>
              <label className="grid gap-2 text-[13px] font-bold text-[#0B1320]">
                Case number
                <input className="min-h-12 rounded-xl border border-[#E4E8EF] bg-white px-4 text-sm" name="caseNumber" placeholder="Optional" />
              </label>
            </div>
          </div>

          <button className="mt-7 min-h-14 w-full rounded-[14px] bg-[#FF3B00] px-6 py-4 text-base font-extrabold text-white shadow-[0_10px_26px_rgba(255,59,0,.28)]" type="submit">See my result &rarr;</button>
          <p className="mt-4 flex items-start justify-center gap-2 text-center text-[12.5px] leading-6 text-[#8A93A6]">
            <Lock className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
            Saved privately to your Briefcase as you go.
          </p>
        </form>
      </section>
    </ConsumerPageShell>
  );
}
