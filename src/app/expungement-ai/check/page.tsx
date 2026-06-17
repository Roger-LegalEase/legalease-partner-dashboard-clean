import { ConsumerPageShell } from "@/components/expungement-ai/ConsumerPageShell";
import { getConsumerStateOptions } from "@/lib/expungement-ai/states";

export default function CheckPage() {
  const states = getConsumerStateOptions();

  return (
    <ConsumerPageShell wilmaContext="check">
      <section className="mx-auto max-w-4xl px-4 pb-16 pt-32 md:px-8">
        <p className="text-xs font-bold uppercase text-[#00A99D]">Eligibility check</p>
        <h1 className="mt-3 text-4xl font-extrabold">Choose your state and path</h1>
        <form className="mt-8 grid gap-5 rounded-md border border-[#ECEFF4] bg-white p-6" action="/expungement-ai/results" data-state-select-count={states.length}>
          <label className="grid gap-2 text-sm font-bold">
            State
            <select className="min-h-12 rounded-md border border-[#D9DEE8] px-3" name="state" required>
              {states.map((state) => (
                <option key={state.abbreviation} value={state.abbreviation}>{state.label}</option>
              ))}
            </select>
          </label>
          <label className="grid gap-2 text-sm font-bold">
            Path type
            <select className="min-h-12 rounded-md border border-[#D9DEE8] px-3" name="pathType">
              <option value="packet">Packet path</option>
              <option value="blocked_form">In-scope guidance-only path</option>
              <option value="complex">Complex path needing review</option>
              <option value="unsupported">Unsupported record type</option>
              <option value="outside_scope">Hard stop</option>
            </select>
          </label>
          <label className="flex items-center gap-3 text-sm font-bold">
            <input name="hasRequiredFacts" type="checkbox" value="true" defaultChecked />
            I have the basic case facts
          </label>
          <label className="flex items-center gap-3 text-sm font-bold">
            <input name="caution" type="checkbox" value="true" />
            Add caution to packet-ready result
          </label>
          <button className="min-h-12 rounded-md bg-[#FF3B00] px-5 text-sm font-extrabold text-white" type="submit">Run check</button>
        </form>
      </section>
    </ConsumerPageShell>
  );
}
