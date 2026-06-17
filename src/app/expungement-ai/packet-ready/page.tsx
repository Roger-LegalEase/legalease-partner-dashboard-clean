import Link from "next/link";
import { Download, ListChecks, MessageCircle, Save } from "lucide-react";
import { ConsumerPageShell } from "@/components/expungement-ai/ConsumerPageShell";
import { saveGeneratedPacketToBriefcase } from "@/lib/expungement-ai/briefcase";
import { runExpungementAiEligibilityCheck } from "@/lib/expungement-ai/eligibility-adapter";

export default function PacketReadyPage() {
  const result = runExpungementAiEligibilityCheck({
    state: "PA",
    pathType: "packet",
    hasRequiredFacts: true,
    timing: "eligible_window",
    packetAvailable: true
  });
  const packet = saveGeneratedPacketToBriefcase(result);

  return (
    <ConsumerPageShell wilmaContext="packet-ready">
      <section className="mx-auto max-w-4xl px-4 pb-16 pt-32 md:px-8">
        <div className="rounded-md border border-[#ECEFF4] bg-white p-6">
          <p className="text-xs font-bold uppercase text-[#00A99D]">Packet generated</p>
          <h1 className="mt-3 text-4xl font-extrabold">Your packet is ready</h1>
          <p className="mt-3 text-sm leading-6 text-[#5A6275]">Generated packet saved to Briefcase item {packet.id}.</p>
          <div className="mt-6 grid gap-3 md:grid-cols-2">
            <Link className="inline-flex min-h-12 items-center justify-center gap-2 rounded-md bg-[#FF3B00] px-5 text-sm font-bold text-white" href="/briefcase/documents"><Download className="h-4 w-4" aria-hidden="true" /> Download packet</Link>
            <Link className="inline-flex min-h-12 items-center justify-center gap-2 rounded-md border border-[#D9DEE8] px-5 text-sm font-bold" href="/briefcase"><ListChecks className="h-4 w-4" aria-hidden="true" /> View filing checklist</Link>
            <Link className="inline-flex min-h-12 items-center justify-center gap-2 rounded-md border border-[#D9DEE8] px-5 text-sm font-bold" href="/briefcase/documents"><Save className="h-4 w-4" aria-hidden="true" /> Save to Briefcase</Link>
            <button className="inline-flex min-h-12 items-center justify-center gap-2 rounded-md border border-[#D9DEE8] px-5 text-sm font-bold" type="button"><MessageCircle className="h-4 w-4" aria-hidden="true" /> Ask Wilma about next steps</button>
          </div>
        </div>
      </section>
    </ConsumerPageShell>
  );
}
