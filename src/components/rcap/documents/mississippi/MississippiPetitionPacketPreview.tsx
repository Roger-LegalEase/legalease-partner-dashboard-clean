"use client";

import { FileText, Printer, ShieldCheck } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import type { RcapDocumentPacket } from "@/lib/rcap/documents/mississippi/types";
import { mississippiFieldLabels, type MississippiDocumentFieldKey } from "@/lib/rcap/state-packs/mississippi/required-fields";

export function MississippiPetitionPacketPreview({ packet }: { packet: RcapDocumentPacket }) {
  return (
    <section className="grid gap-5">
      <MississippiPetitionControls />
      <BriefcaseSaveStatus />
      {packet.missingFields.length > 0 ? <MississippiMissingFieldsPanel packet={packet} /> : null}
      <div className="rounded-md border border-grayWilma-200 bg-white p-5 shadow-sm print:border-0 print:p-0 print:shadow-none">
        <MississippiPetitionCaption packet={packet} />
        <MississippiPetitionBody packet={packet} />
        <MississippiCertificateOfService packet={packet} />
        <MississippiProposedOrderPlaceholder />
      </div>
      <MississippiFilingInstructions packet={packet} />
    </section>
  );
}

export function BriefcaseSaveStatus() {
  return (
    <div className="rounded-md border border-teal/30 bg-teal/10 p-4 text-sm font-semibold text-teal print:hidden">
      Saved to your Briefcase. You can return later to review saved forms and draft packets.
    </div>
  );
}

export function MississippiPetitionControls() {
  return (
    <div className="flex flex-col gap-3 rounded-md border border-grayWilma-200 bg-white p-4 shadow-sm print:hidden sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-start gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-teal/10 text-teal">
          <FileText className="h-5 w-5" aria-hidden="true" />
        </span>
        <div>
          <p className="text-sm font-black text-navy">Draft packet preview</p>
          <p className="mt-1 text-sm leading-6 text-grayWilma-700">Use browser print to preview or save as PDF after review.</p>
        </div>
      </div>
      <Button type="button" onClick={() => globalThis.print()} className="min-h-11">
        <Printer className="h-4 w-4" aria-hidden="true" />
        Print / save PDF
      </Button>
    </div>
  );
}

export function MississippiPetitionCaption({ packet }: { packet: RcapDocumentPacket }) {
  return (
    <header className="border-b border-grayWilma-200 pb-5 text-center">
      <p className="text-sm font-black uppercase text-navy">In the {packet.courtType || "[Court type to be confirmed]"} of {packet.courtCounty || packet.county || "[County to be confirmed]"} County, Mississippi</p>
      <div className="mt-4 grid gap-2 text-left text-sm sm:grid-cols-2">
        <p><span className="font-black">In re:</span> {formatName(packet)}</p>
        <p><span className="font-black">Cause no.:</span> {packet.causeNumber || "[Cause number to be confirmed]"}</p>
      </div>
    </header>
  );
}

export function MississippiPetitionBody({ packet }: { packet: RcapDocumentPacket }) {
  return (
    <article className="prose prose-sm mt-5 max-w-none text-grayWilma-900">
      <Badge tone={packet.pathway === "felony_conviction" ? "orange" : "blue"}>{packet.pathway.replaceAll("_", " ")}</Badge>
      <h1 className="mt-4 text-2xl font-black text-navy">{titleFor(packet)}</h1>
      <pre className="mt-5 whitespace-pre-wrap rounded-md bg-[#f7f8f6] p-4 font-sans text-sm leading-7 text-grayWilma-900 print:bg-white print:p-0">
        {packet.generatedPlainText}
      </pre>
      <div className="mt-5 flex items-start gap-3 rounded-md border border-orange/30 bg-orange/10 p-4 print:border-grayWilma-300 print:bg-white">
        <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-orange" aria-hidden="true" />
        <p className="text-sm leading-6 text-grayWilma-800">{packet.safetyDisclaimer}</p>
      </div>
    </article>
  );
}

export function MississippiCertificateOfService({ packet }: { packet: RcapDocumentPacket }) {
  return (
    <section className="mt-6 border-t border-grayWilma-200 pt-5">
      <h2 className="text-lg font-black text-navy">Certificate of Service Draft</h2>
      <p className="mt-3 text-sm leading-7 text-grayWilma-800">
        I certify that a copy of this draft petition would be provided to the appropriate parties if required by current Mississippi law and local court procedure.
        {packet.pathway === "felony_conviction" ? " For felony conviction petitions, district attorney notice should be confirmed before any hearing." : ""}
      </p>
      <p className="mt-6 text-sm text-grayWilma-800">Signature: ________________________________</p>
    </section>
  );
}

export function MississippiProposedOrderPlaceholder() {
  return (
    <section className="mt-6 border-t border-grayWilma-200 pt-5">
      <h2 className="text-lg font-black text-navy">Proposed Order Placeholder</h2>
      <p className="mt-3 text-sm leading-7 text-grayWilma-800">
        Some courts may ask for a proposed order. This placeholder is included as a reminder to check local court requirements before filing.
      </p>
      <p className="mt-6 text-sm text-grayWilma-800">Judge signature line: ________________________________</p>
    </section>
  );
}

export function MississippiFilingInstructions({ packet }: { packet: RcapDocumentPacket }) {
  return (
    <section className="rounded-md border border-grayWilma-200 bg-white p-5 shadow-sm print:break-before-page print:shadow-none">
      <h2 className="text-lg font-black text-navy">Mississippi Filing Notes</h2>
      <ul className="mt-4 grid gap-2 text-sm leading-6 text-grayWilma-800">
        {[...packet.filingInstructions, ...packet.countyCourtInstructions].map((instruction) => (
          <li key={instruction} className="rounded-md bg-[#f7f8f6] px-3 py-2 print:bg-white">
            {instruction}
          </li>
        ))}
      </ul>
    </section>
  );
}

export function MississippiMissingFieldsPanel({ packet }: { packet: RcapDocumentPacket }) {
  return (
    <section className="rounded-md border border-orange/30 bg-orange/10 p-5 print:hidden">
      <h2 className="text-lg font-black text-navy">More information needed</h2>
      <p className="mt-2 text-sm leading-6 text-grayWilma-800">
        You can still start even if you do not have every paper in front of you. These details should be checked before this draft is treated as a filing packet.
      </p>
      <ul className="mt-4 grid gap-2 text-sm font-semibold text-grayWilma-800 sm:grid-cols-2">
        {packet.missingFields.map((field) => (
          <li key={field} className="rounded-md bg-white px-3 py-2">{mississippiFieldLabels[field as MississippiDocumentFieldKey] ?? field}</li>
        ))}
      </ul>
    </section>
  );
}

function titleFor(packet: RcapDocumentPacket) {
  if (packet.documentType === "mississippi_non_conviction_petition") {
    return "Petition for Dismissal and Expungement of Criminal Record";
  }
  if (packet.documentType === "mississippi_felony_conviction_petition") {
    return "Petition for Expungement of Criminal Record of Criminal Conviction";
  }
  return "Petition for Expungement of Criminal Record";
}

function formatName(packet: RcapDocumentPacket) {
  const name = [packet.petitionerFirstName, packet.petitionerLastName].filter(Boolean).join(" ").trim();
  return name || "[Petitioner name to be confirmed]";
}
