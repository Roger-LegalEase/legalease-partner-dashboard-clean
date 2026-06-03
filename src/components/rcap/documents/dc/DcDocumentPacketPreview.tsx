"use client";

import { Briefcase, FileText, Printer, ShieldCheck } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import type { RcapDocumentPacket } from "@/lib/rcap/documents/mississippi/types";
import { dcFieldLabels } from "@/lib/rcap/state-packs/dc/required-fields";

export function DcDocumentPacketPreview({ packet }: { packet: RcapDocumentPacket }) {
  return (
    <section className="grid gap-5">
      <div className="flex flex-col gap-3 rounded-md border border-grayWilma-200 bg-white p-4 shadow-sm print:hidden sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-teal/10 text-teal">
            <FileText className="h-5 w-5" aria-hidden="true" />
          </span>
          <div>
            <p className="text-sm font-black text-navy">DC draft packet preview</p>
            <p className="mt-1 text-sm leading-6 text-grayWilma-700">This uses the DC motion packet template. Use browser print to preview or save as PDF after review.</p>
          </div>
        </div>
        <Button type="button" onClick={() => globalThis.print()} className="min-h-11">
          <Printer className="h-4 w-4" aria-hidden="true" />
          Print / save PDF
        </Button>
      </div>

      <div className="rounded-md border border-teal/30 bg-teal/10 p-4 text-sm font-semibold text-teal print:hidden">
        <Briefcase className="mr-2 inline h-4 w-4" aria-hidden="true" />
        Saved to your Briefcase.
      </div>

      {packet.missingFields.length > 0 ? (
        <section className="rounded-md border border-orange/30 bg-orange/10 p-5 print:hidden">
          <h2 className="text-lg font-black text-navy">More information needed</h2>
          <p className="mt-2 text-sm leading-6 text-grayWilma-800">A DC arrest record / MPD rap sheet and DC Superior Court disposition may help confirm these details.</p>
          <ul className="mt-4 grid gap-2 text-sm font-semibold text-grayWilma-800 sm:grid-cols-2">
            {packet.missingFields.map((field) => (
              <li key={field} className="rounded-md bg-white px-3 py-2">{dcFieldLabels[field as keyof typeof dcFieldLabels] ?? field}</li>
            ))}
          </ul>
        </section>
      ) : null}

      <article className="rounded-md border border-grayWilma-200 bg-white p-5 shadow-sm print:border-0 print:p-0 print:shadow-none">
        <header className="border-b border-grayWilma-200 pb-5 text-center">
          <Badge tone={String(packet.pathway).includes("needs") ? "orange" : "blue"}>{String(packet.pathway).replaceAll("_", " ")}</Badge>
          <h1 className="mt-4 text-2xl font-black text-navy">DC Record Relief Motion Packet</h1>
          <p className="mt-2 text-sm text-grayWilma-700">Superior Court of the District of Columbia - Criminal Division</p>
        </header>
        <pre className="mt-5 whitespace-pre-wrap rounded-md bg-[#f7f8f6] p-4 font-sans text-sm leading-7 text-grayWilma-900 print:bg-white print:p-0">
          {packet.generatedPlainText}
        </pre>
        <iframe title="DC motion packet HTML preview" srcDoc={packet.generatedHtml} className="mt-5 h-[720px] w-full rounded-md border border-grayWilma-200 print:hidden" />
        <div className="mt-5 flex items-start gap-3 rounded-md border border-orange/30 bg-orange/10 p-4 print:border-grayWilma-300 print:bg-white">
          <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-orange" aria-hidden="true" />
          <p className="text-sm leading-6 text-grayWilma-800">{packet.safetyDisclaimer}</p>
        </div>
      </article>

      <section className="rounded-md border border-grayWilma-200 bg-white p-5 shadow-sm print:break-before-page print:shadow-none">
        <h2 className="text-lg font-black text-navy">DC Filing Notes</h2>
        <ul className="mt-4 grid gap-2 text-sm leading-6 text-grayWilma-800">
          {[...packet.filingInstructions, ...packet.countyCourtInstructions].map((instruction) => (
            <li key={instruction} className="rounded-md bg-[#f7f8f6] px-3 py-2 print:bg-white">{instruction}</li>
          ))}
        </ul>
      </section>
    </section>
  );
}
