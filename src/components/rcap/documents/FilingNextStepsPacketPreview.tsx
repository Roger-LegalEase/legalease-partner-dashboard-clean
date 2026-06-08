import { ShieldCheck } from "lucide-react";
import { userFacingWorkflowGaps } from "@/lib/rcap/documents/filing-next-steps";
import type { RcapDocumentPacket } from "@/lib/rcap/documents/mississippi/types";

export function FilingNextStepsPacketPreview({ packet }: { packet: RcapDocumentPacket }) {
  const nextSteps = packet.filingNextStepsPacket;
  return (
    <section className="rounded-md border border-grayWilma-200 bg-white p-5 shadow-sm print:break-before-page print:shadow-none">
      <h2 className="text-lg font-black text-navy">{nextSteps.title}</h2>
      <p className="mt-2 text-sm leading-6 text-grayWilma-700">
        These instructions are generated from the preserved LegalEase source materials for this workflow. Any court, county, filing-method, or exact-fee detail that still needs checking is marked as confirm before filing.
      </p>

      <div className="mt-5 grid gap-4">
        <InstructionBlock title="Generated petition/form packet" items={["Review the generated petition, motion, or form packet before treating it as ready to file."]} />
        <InstructionBlock title="Filing instructions / next steps packet" items={[`Where to file: ${nextSteps.filingLocation}`, `How to file: ${nextSteps.filingMethod}`, ...nextSteps.requiredDocuments.map((item) => `Include: ${item}`), ...nextSteps.serviceAndCopies]} />
        <InstructionBlock title="Fee summary" items={nextSteps.feeSummary} />
        <InstructionBlock title="Court/contact/location guidance" items={nextSteps.courtContactOrLocationGuidance} />
        <InstructionBlock title="What happens after filing" items={nextSteps.afterFiling} />
        <InstructionBlock title="What to track after submission" items={nextSteps.trackingChecklist} />
        <InstructionBlock title="Confirm before filing" items={nextSteps.workflowGaps.length > 0 ? userFacingWorkflowGaps(nextSteps.title, nextSteps.workflowGaps) : ["No unresolved filing details were identified from the preserved workflow instructions."]} />
      </div>

      <div className="mt-5 flex items-start gap-3 rounded-md border border-orange/30 bg-orange/10 p-4 print:border-grayWilma-300 print:bg-white">
        <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-orange" aria-hidden="true" />
        <p className="text-sm leading-6 text-grayWilma-800">{nextSteps.safetyDisclaimer}</p>
      </div>

      <pre className="mt-5 whitespace-pre-wrap rounded-md bg-[#f7f8f6] p-4 font-sans text-sm leading-7 text-grayWilma-900 print:bg-white print:p-0">
        {nextSteps.plainText}
      </pre>
    </section>
  );
}


function InstructionBlock({ title, items }: { title: string; items: string[] }) {
  return (
    <section>
      <h3 className="text-sm font-black text-navy">{title}</h3>
      <ul className="mt-2 grid gap-2 text-sm leading-6 text-grayWilma-800">
        {items.map((item) => (
          <li key={item} className="rounded-md bg-[#f7f8f6] px-3 py-2 print:bg-white">{item}</li>
        ))}
      </ul>
    </section>
  );
}
