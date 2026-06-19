"use client";

import { useState } from "react";
import { Briefcase, FileText, Loader2, Save } from "lucide-react";
import { Button } from "@/components/ui/Button";
import type { RcapIntakeSession } from "@/lib/rcap-intake/types";
import type { RcapDocumentPacket } from "@/lib/rcap/documents/types";

type Draft = {
  petitionerFirstName: string;
  petitionerLastName: string;
  caseNumber: string;
  charge: string;
  arrestingAgency: string;
  offenseDate: string;
  arrestDate: string;
  disposition: string;
  dispositionDate: string;
  sentenceCompletionDate: string;
  convictionLevel: "misdemeanor" | "felony" | "unknown";
  reliefTrack: "automatic_expungement" | "automatic_sealing" | "actual_innocence_expungement" | "interests_of_justice_sealing" | "needs_review";
  prosecutorOffice: "USAO" | "OAG" | "unknown";
  serviceMethod: "email" | "mail" | "hand_delivery" | "unknown";
  hasMpdRecord: boolean;
  hasCourtDisposition: boolean;
  openOrPendingCharges: boolean;
  masterGridGroupOneToThree: boolean;
  automaticExcludedOffenseConcern: boolean;
  decriminalizedLegalizedOrUnconstitutionalOffense: boolean;
  marijuanaRelatedSignal: boolean;
  actualInnocenceStatement: string;
  interestsOfJusticeStatement: string;
  motionArgument: string;
};

export function DcMotionInformationForm({ partnerSlug, session }: { partnerSlug: string; session: RcapIntakeSession }) {
  const [draft, setDraft] = useState<Draft>({
    petitionerFirstName: session.userFirstName ?? "",
    petitionerLastName: session.userLastName ?? "",
    caseNumber: "",
    charge: session.chargeOrCaseType ?? "",
    arrestingAgency: "Metropolitan Police Department",
    offenseDate: session.approximateCaseYear ?? "",
    arrestDate: "",
    disposition: session.caseOutcome ?? "",
    dispositionDate: "",
    sentenceCompletionDate: "",
    convictionLevel: session.recordType === "past_conviction" ? "misdemeanor" : "unknown",
    reliefTrack: session.recordType === "past_conviction" || session.caseOutcome === "convicted" ? "interests_of_justice_sealing" : "automatic_sealing",
    prosecutorOffice: "unknown",
    serviceMethod: "unknown",
    hasMpdRecord: session.hasDocuments === true,
    hasCourtDisposition: session.hasDocuments === true,
    openOrPendingCharges: false,
    masterGridGroupOneToThree: false,
    automaticExcludedOffenseConcern: false,
    decriminalizedLegalizedOrUnconstitutionalOffense: false,
    marijuanaRelatedSignal: false,
    actualInnocenceStatement: "",
    interestsOfJusticeStatement: "",
    motionArgument: ""
  });
  const [packet, setPacket] = useState<RcapDocumentPacket | undefined>();
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<string | undefined>();
  const [error, setError] = useState<string | undefined>();

  async function saveForm(generate: boolean) {
    setIsSaving(true);
    setMessage(undefined);
    setError(undefined);
    const endpoint = packet ? `/api/rcap/documents/${packet.id}/${generate ? "generate" : "save"}` : "/api/rcap/documents/dc/create";
    const payload = packet && generate ? {} : { partnerSlug, intakeSessionId: session.id, state: "DC", ...draft };
    const response = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    const body = (await response.json().catch(() => ({}))) as { packet?: RcapDocumentPacket; error?: string };
    setIsSaving(false);
    if (!response.ok || body.error || !body.packet) {
      setError(body.error ?? "We could not save this DC form yet.");
      return;
    }
    setPacket(body.packet);
    setMessage(generate ? "DC draft packet generated and saved to your Briefcase." : "Saved to your Briefcase. You can come back later.");
  }

  return (
    <section className="rounded-md border border-grayWilma-200 bg-white p-5 shadow-sm md:p-6">
      <div className="flex items-start gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-teal/10 text-teal">
          <FileText className="h-5 w-5" aria-hidden="true" />
        </span>
        <div>
          <h2 className="text-2xl font-black text-navy">DC record relief information</h2>
          <p className="mt-2 text-sm leading-6 text-grayWilma-700">
            DC uses motion papers for by-motion sealing or expungement. Some relief may be automatic or scheduled, but automatic processing still needs to be checked.
          </p>
        </div>
      </div>

      <div className="mt-6 grid gap-4 md:grid-cols-2">
        <Field label="First name" value={draft.petitionerFirstName} onChange={(petitionerFirstName) => setDraft({ ...draft, petitionerFirstName })} />
        <Field label="Last name" value={draft.petitionerLastName} onChange={(petitionerLastName) => setDraft({ ...draft, petitionerLastName })} />
        <Field label="DC Superior Court case number, if assigned" value={draft.caseNumber} onChange={(caseNumber) => setDraft({ ...draft, caseNumber })} />
        <Field label="Charge or offense" value={draft.charge} onChange={(charge) => setDraft({ ...draft, charge })} />
        <Field label="Arresting agency" value={draft.arrestingAgency} onChange={(arrestingAgency) => setDraft({ ...draft, arrestingAgency })} />
        <Field label="Offense or arrest date" value={draft.offenseDate} onChange={(offenseDate) => setDraft({ ...draft, offenseDate })} />
        <Field label="Disposition" value={draft.disposition} onChange={(disposition) => setDraft({ ...draft, disposition })} />
        <Field label="Disposition date" value={draft.dispositionDate} onChange={(dispositionDate) => setDraft({ ...draft, dispositionDate })} />
        <Field label="Sentence completion date, if a conviction" value={draft.sentenceCompletionDate} onChange={(sentenceCompletionDate) => setDraft({ ...draft, sentenceCompletionDate })} />
        <Select label="Conviction level, if any" value={draft.convictionLevel} onChange={(convictionLevel) => setDraft({ ...draft, convictionLevel: convictionLevel as Draft["convictionLevel"] })} options={["unknown", "misdemeanor", "felony"]} />
        <Select label="Path to organize" value={draft.reliefTrack} onChange={(reliefTrack) => setDraft({ ...draft, reliefTrack: reliefTrack as Draft["reliefTrack"] })} options={["automatic_expungement", "automatic_sealing", "actual_innocence_expungement", "interests_of_justice_sealing", "needs_review"]} />
        <Select label="Prosecutor to serve" value={draft.prosecutorOffice} onChange={(prosecutorOffice) => setDraft({ ...draft, prosecutorOffice: prosecutorOffice as Draft["prosecutorOffice"] })} options={["unknown", "USAO", "OAG"]} />
        <Select label="Service method" value={draft.serviceMethod} onChange={(serviceMethod) => setDraft({ ...draft, serviceMethod: serviceMethod as Draft["serviceMethod"] })} options={["unknown", "email", "mail", "hand_delivery"]} />
      </div>

      <div className="mt-5 grid gap-3 md:grid-cols-2">
        <Check label="Do you have the DC arrest record / MPD rap sheet?" checked={draft.hasMpdRecord} onChange={(hasMpdRecord) => setDraft({ ...draft, hasMpdRecord })} />
        <Check label="Do you have the DC Superior Court case disposition?" checked={draft.hasCourtDisposition} onChange={(hasCourtDisposition) => setDraft({ ...draft, hasCourtDisposition })} />
        <Check label="Are there open or pending charges?" checked={draft.openOrPendingCharges} onChange={(openOrPendingCharges) => setDraft({ ...draft, openOrPendingCharges })} />
        <Check label="Is there a Master Grid Group 1-3 felony concern?" checked={draft.masterGridGroupOneToThree} onChange={(masterGridGroupOneToThree) => setDraft({ ...draft, masterGridGroupOneToThree })} />
        <Check label="Is there an automatic-sealing excluded-offense concern?" checked={draft.automaticExcludedOffenseConcern} onChange={(automaticExcludedOffenseConcern) => setDraft({ ...draft, automaticExcludedOffenseConcern })} />
        <Check label="Is this tied to a decriminalized, legalized, or unconstitutional offense?" checked={draft.decriminalizedLegalizedOrUnconstitutionalOffense} onChange={(decriminalizedLegalizedOrUnconstitutionalOffense) => setDraft({ ...draft, decriminalizedLegalizedOrUnconstitutionalOffense })} />
        <Check label="Is this marijuana-related?" checked={draft.marijuanaRelatedSignal} onChange={(marijuanaRelatedSignal) => setDraft({ ...draft, marijuanaRelatedSignal })} />
      </div>

      <div className="mt-5 grid gap-4">
        <Textarea label="Actual innocence statement, if asking to expunge" value={draft.actualInnocenceStatement} onChange={(actualInnocenceStatement) => setDraft({ ...draft, actualInnocenceStatement })} />
        <Textarea label="Interests-of-justice statement, if asking to seal" value={draft.interestsOfJusticeStatement} onChange={(interestsOfJusticeStatement) => setDraft({ ...draft, interestsOfJusticeStatement })} />
        <Textarea label="Facts and argument for points and authorities" value={draft.motionArgument} onChange={(motionArgument) => setDraft({ ...draft, motionArgument })} />
      </div>

      <p className="mt-5 rounded-md border border-grayWilma-200 bg-[#f7f8f6] p-3 text-sm leading-6 text-grayWilma-700">
        Do not enter SSN or date of birth here. DC automatic processing may be delayed or scheduled through October 1, 2027, so this tool does not treat automatic relief as completed record clearing.
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
  return <label className="grid gap-2 text-xs font-bold uppercase text-grayWilma-600">{label}<select value={value} onChange={(event) => onChange(event.target.value)} className="min-h-11 rounded-md border border-grayWilma-200 px-3 text-sm font-semibold normal-case text-navy outline-none focus:border-teal">{options.map((option) => <option key={option} value={option}>{option.replaceAll("_", " ")}</option>)}</select></label>;
}

function Check({ label, checked, onChange }: { label: string; checked: boolean; onChange: (value: boolean) => void }) {
  return <label className="flex gap-3 rounded-md border border-grayWilma-200 bg-[#f7f8f6] p-3 text-sm font-semibold text-grayWilma-800"><input type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} className="mt-1 h-4 w-4" />{label}</label>;
}

function Textarea({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return <label className="grid gap-2 text-xs font-bold uppercase text-grayWilma-600">{label}<textarea value={value} onChange={(event) => onChange(event.target.value)} className="min-h-28 rounded-md border border-grayWilma-200 px-3 py-2 text-sm font-semibold normal-case text-navy outline-none focus:border-teal" /></label>;
}
