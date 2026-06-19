import { ConsumerPageShell } from "@/components/expungement-ai/ConsumerPageShell";
import { ConsumerFlowCard } from "@/components/expungement-ai/ConsumerFlowCard";
import { getConsumerStateOptions } from "@/lib/expungement-ai/states";

export default function CheckPage() {
  const states = getConsumerStateOptions();

  return (
    <ConsumerPageShell wilmaContext="check">
      <ConsumerFlowCard eyebrow="Eligibility check" title="Which state is the record in?" lead="The state determines the law, the forms, and the filing steps.">
        <form className="mt-7 grid gap-4" action="/expungement-ai/results" data-state-select-count={states.length}>
          <label className="grid gap-2 text-[13px] font-semibold text-[#0B1320]">
            State
            <select className="min-h-12 rounded-xl border-[1.5px] border-[#E4E8EF] bg-white px-4 text-[15.5px] text-[#0B1320]" name="state" required>
              {states.map((state) => (
                <option key={state.abbreviation} value={state.abbreviation}>{state.label}</option>
              ))}
            </select>
          </label>
          <label className="grid gap-2 text-[13px] font-semibold text-[#0B1320]">
            Case ending
            <select className="min-h-12 rounded-xl border-[1.5px] border-[#E4E8EF] bg-white px-4 text-[15.5px] text-[#0B1320]" name="pathType">
              <option value="packet">Packet path</option>
              <option value="blocked_form">Record-clearing next steps</option>
              <option value="complex">Needs review</option>
              <option value="unsupported">Unsupported record type</option>
              <option value="outside_scope">Outside this self-help tool</option>
            </select>
          </label>
          <label className="flex items-center gap-3 rounded-[13px] border-[1.5px] border-[#E4E8EF] bg-white p-4 text-sm font-semibold text-[#0B1320]">
            <input name="hasRequiredFacts" type="checkbox" value="true" defaultChecked />
            I have the basic case details.
          </label>
          <button className="mt-2 min-h-14 rounded-[13px] bg-[#FF3B00] px-6 py-4 text-base font-bold text-white shadow-[0_10px_26px_rgba(255,59,0,.28)]" type="submit">Check my record &rarr;</button>
        </form>
        <p className="mt-4 text-center text-[12.5px] leading-6 text-[#8A93A6]">Saved privately to your Briefcase as you go.</p>
      </ConsumerFlowCard>
    </ConsumerPageShell>
  );
}
