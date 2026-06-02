"use client";

import { useState } from "react";
import { Briefcase, FileText, Loader2, Save } from "lucide-react";
import { Button } from "@/components/ui/Button";
import type { RcapIntakeSession } from "@/lib/rcap-intake/types";
import type { RcapDocumentPacket } from "@/lib/rcap/documents/mississippi/types";

type Draft = {
  county: string;
  cookCountyDistrict: string;
  caseOrArrestNumber: string;
  charge: string;
  disposition: string;
  arrestingAgency: string;
  arrestDate: string;
  dispositionDate: string;
  supervisionCompletedDate: string;
  qualifiedProbationCompletedDate: string;
  sentenceTerminationDate: string;
  remedyType: "expungement" | "sealing" | "";
  hasRapSheet: boolean;
  needsRapSheet: boolean;
  excludedOffenseSignal: boolean;
  educationWaiverSignal: boolean;
  cannabisSignal: boolean;
  feeWaiverRequested: boolean;
};

export function IllinoisPetitionInformationForm({ partnerSlug, session }: { partnerSlug: string; session: RcapIntakeSession }) {
  const [draft, setDraft] = useState<Draft>({
    county: session.county ?? "",
    cookCountyDistrict: "",
    caseOrArrestNumber: "",
    charge: session.chargeOrCaseType ?? "",
    disposition: session.caseOutcome ?? "",
    arrestingAgency: "",
    arrestDate: "",
    dispositionDate: "",
    supervisionCompletedDate: "",
    qualifiedProbationCompletedDate: "",
    sentenceTerminationDate: "",
    remedyType: session.recordType === "past_conviction" || session.caseOutcome === "convicted" ? "sealing" : "expungement",
    hasRapSheet: session.hasDocuments === true,
    needsRapSheet: session.hasDocuments !== true,
    excludedOffenseSignal: false,
    educationWaiverSignal: false,
    cannabisSignal: false,
    feeWaiverRequested: false
  });
  const [packet, setPacket] = useState<RcapDocumentPacket | undefined>();
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<string | undefined>();
  const [error, setError] = useState<string | undefined>();

  async function saveForm(generate: boolean) {
    setIsSaving(true);
    setMessage(undefined);
    setError(undefined);
    const response = await fetch("/api/rcap/documents/illinois/create", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ partnerSlug, intakeSessionId: session.id, ...draft })
    });
    const body = (await response.json().catch(() => ({}))) as { packet?: RcapDocumentPacket; error?: string };
    setIsSaving(false);
    if (!response.ok || body.error || !body.packet) {
      setError(body.error ?? "We could not save this form yet.");
      return;
    }
    setPacket(body.packet);
    setMessage(generate ? "Draft packet generated and saved to your Briefcase." : "Saved to your Briefcase. You can come back later.");
  }

  return (
    <section className="rounded-md border border-grayWilma-200 bg-white p-5 shadow-sm md:p-6">
      <div className="flex items-start gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-teal/10 text-teal">
          <FileText className="h-5 w-5" aria-hidden="true" />
        </span>
        <div>
          <h2 className="text-2xl font-black text-navy">Illinois form information</h2>
          <p className="mt-2 text-sm leading-6 text-grayWilma-700">
            Illinois uses two main paths: expungement and sealing. I can help organize your information into a draft packet.
          </p>
        </div>
      </div>
      <div className="mt-6 grid gap-4 md:grid-cols-2">
        <Field label="County where the arrest or charge happened" value={draft.county} onChange={(county) => setDraft({ ...draft, county })} />
        <Field label="Cook County district, if you know it" value={draft.cookCountyDistrict} onChange={(cookCountyDistrict) => setDraft({ ...draft, cookCountyDistrict })} />
        <Field label="Court case number or arrest number, if you have it" value={draft.caseOrArrestNumber} onChange={(caseOrArrestNumber) => setDraft({ ...draft, caseOrArrestNumber })} />
        <Field label="Charge or case type" value={draft.charge} onChange={(charge) => setDraft({ ...draft, charge })} />
        <Field label="How did the case end?" value={draft.disposition} onChange={(disposition) => setDraft({ ...draft, disposition })} />
        <Select label="Which path are we organizing?" value={draft.remedyType} onChange={(remedyType) => setDraft({ ...draft, remedyType: remedyType as Draft["remedyType"] })} options={["", "expungement", "sealing"]} />
        <Field label="Which police department, sheriff, or agency handled the arrest?" value={draft.arrestingAgency} onChange={(arrestingAgency) => setDraft({ ...draft, arrestingAgency })} />
        <Field label="About when did the arrest happen?" value={draft.arrestDate} onChange={(arrestDate) => setDraft({ ...draft, arrestDate })} />
        <Field label="About when did the court make the final decision?" value={draft.dispositionDate} onChange={(dispositionDate) => setDraft({ ...draft, dispositionDate })} />
        <Field label="When did you finish supervision, if applicable?" value={draft.supervisionCompletedDate} onChange={(supervisionCompletedDate) => setDraft({ ...draft, supervisionCompletedDate })} />
        <Field label="When did you finish qualified probation, if applicable?" value={draft.qualifiedProbationCompletedDate} onChange={(qualifiedProbationCompletedDate) => setDraft({ ...draft, qualifiedProbationCompletedDate })} />
        <Field label="When did you finish the last part of your sentence or court requirement?" value={draft.sentenceTerminationDate} onChange={(sentenceTerminationDate) => setDraft({ ...draft, sentenceTerminationDate })} />
      </div>
      <div className="mt-5 grid gap-3 md:grid-cols-2">
        <Check label="Do you have your Illinois criminal history report yet?" checked={draft.hasRapSheet} onChange={(hasRapSheet) => setDraft({ ...draft, hasRapSheet, needsRapSheet: !hasRapSheet })} />
        <Check label="Are there any DUI, domestic battery, sex offense, violent offense, or other hard-to-seal concerns?" checked={draft.excludedOffenseSignal} onChange={(excludedOffenseSignal) => setDraft({ ...draft, excludedOffenseSignal })} />
        <Check label="Could filing costs be a barrier?" checked={draft.feeWaiverRequested} onChange={(feeWaiverRequested) => setDraft({ ...draft, feeWaiverRequested })} />
        <Check label="Is this related to a cannabis record?" checked={draft.cannabisSignal} onChange={(cannabisSignal) => setDraft({ ...draft, cannabisSignal })} />
        <Check label="Could an education waiver matter for timing?" checked={draft.educationWaiverSignal} onChange={(educationWaiverSignal) => setDraft({ ...draft, educationWaiverSignal })} />
      </div>
      <p className="mt-5 rounded-md border border-grayWilma-200 bg-[#f7f8f6] p-3 text-sm leading-6 text-grayWilma-700">
        Do not enter SSN or date of birth in this phase. The draft uses private-field placeholders if a court form later requires them.
      </p>
      <div className="mt-5 flex flex-col gap-3 sm:flex-row">
        <Button type="button" disabled={isSaving} onClick={() => saveForm(false)} className="min-h-11">
          {isSaving ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <Save className="h-4 w-4" aria-hidden="true" />}
          Save for later
        </Button>
        <Button type="button" disabled={isSaving} onClick={() => saveForm(true)} variant="secondary" className="min-h-11">
          <Briefcase className="h-4 w-4" aria-hidden="true" />
          Generate draft packet
        </Button>
      </div>
      {packet ? <a href={`/documents/${partnerSlug}/${packet.id}`} className="mt-4 inline-flex text-sm font-black text-teal hover:text-navy">Open saved packet</a> : null}
      {message ? <p className="mt-4 rounded-md border border-teal/30 bg-teal/10 p-3 text-sm font-semibold text-teal">{message}</p> : null}
      {error ? <p className="mt-4 rounded-md border border-danger/30 bg-danger/10 p-3 text-sm font-semibold text-danger">{error}</p> : null}
    </section>
  );
}

function Field({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return <label className="grid gap-2 text-xs font-bold uppercase text-grayWilma-600">{label}<input value={value} onChange={(event) => onChange(event.target.value)} className="min-h-11 rounded-md border border-grayWilma-200 px-3 text-sm font-semibold normal-case text-navy outline-none focus:border-teal" /></label>;
}

function Select({ label, value, options, onChange }: { label: string; value: string; options: string[]; onChange: (value: string) => void }) {
  return <label className="grid gap-2 text-xs font-bold uppercase text-grayWilma-600">{label}<select value={value} onChange={(event) => onChange(event.target.value)} className="min-h-11 rounded-md border border-grayWilma-200 px-3 text-sm font-semibold normal-case text-navy outline-none focus:border-teal">{options.map((option) => <option key={option || "blank"} value={option}>{option || "Not sure yet"}</option>)}</select></label>;
}

function Check({ label, checked, onChange }: { label: string; checked: boolean; onChange: (value: boolean) => void }) {
  return <label className="flex gap-3 rounded-md border border-grayWilma-200 bg-[#f7f8f6] p-3 text-sm font-semibold text-grayWilma-800"><input type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} className="mt-1 h-4 w-4" />{label}</label>;
}
