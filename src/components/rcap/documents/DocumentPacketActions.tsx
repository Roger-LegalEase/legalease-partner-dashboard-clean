"use client";

import { Download, FileDown, FileText, Printer } from "lucide-react";
import { Button } from "@/components/ui/Button";

export function DocumentPacketActions({ packetId, label = "Draft packet preview" }: { packetId: string; label?: string }) {
  return (
    <div className="flex flex-col gap-3 rounded-md border border-grayWilma-200 bg-white p-4 shadow-sm print:hidden lg:flex-row lg:items-center lg:justify-between">
      <div className="flex items-start gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-teal/10 text-teal">
          <FileText className="h-5 w-5" aria-hidden="true" />
        </span>
        <div>
          <p className="text-sm font-black text-navy">{label}</p>
          <p className="mt-1 text-sm leading-6 text-grayWilma-700">Preview, print, or download the saved packet PDFs from your Briefcase packet.</p>
        </div>
      </div>
      <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
        <PdfLink href={`/api/rcap/documents/${packetId}/pdf/full`} label="Full LegalEase PDF" icon="full" />
        <PdfLink href={`/api/rcap/documents/${packetId}/pdf/court`} label="Court Filing PDF" icon="court" />
        <Button type="button" onClick={() => globalThis.print()} className="min-h-11">
          <Printer className="h-4 w-4" aria-hidden="true" />
          Print
        </Button>
      </div>
    </div>
  );
}

function PdfLink({ href, label, icon }: { href: string; label: string; icon: "full" | "court" }) {
  const Icon = icon === "full" ? Download : FileDown;
  return (
    <a href={href} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-md border border-grayWilma-200 bg-white px-4 py-2 text-sm font-semibold text-navy transition hover:bg-grayWilma-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal focus-visible:ring-offset-2">
      <Icon className="h-4 w-4" aria-hidden="true" />
      {label}
    </a>
  );
}
