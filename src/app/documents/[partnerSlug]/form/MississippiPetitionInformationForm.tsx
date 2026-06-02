"use client";

import { useState } from "react";
import { Briefcase, FileText, Loader2, Save } from "lucide-react";
import { Button } from "@/components/ui/Button";
import type { RcapIntakeSession } from "@/lib/rcap-intake/types";
import type { RcapDocumentPacket } from "@/lib/rcap/documents/mississippi/types";

type Draft = {
  courtType: string;
  courtCounty: string;
  courtName: string;
  jurisdiction: string;
  causeNumber: string;
  charge: string;
  arrestDate: string;
  offenseDate: string;
  arrestingAgency: string;
  agencyCaseNumber: string;
  dispositionDate: string;
  convictionDate: string;
  sentenceCompletionDate: string;
  convictionLevel: "misdemeanor" | "felony" | "";
  hasZeroBalance: boolean;
  firstOffenderSignal: boolean;
  nonTrafficSignal: boolean;
  excludedOffenseScreening: boolean;
  oneFelonyExpungementSignal: boolean;
};

export function MississippiPetitionInformationForm({
  partnerSlug,
  session
}: {
  partnerSlug: string;
  session: RcapIntakeSession;
}) {
  const [draft, setDraft] = useState<Draft>({
    courtType: "",
    courtCounty: session.county ?? "",
    courtName: "",
    jurisdiction: session.county ?? "",
    causeNumber: "",
    charge: session.chargeOrCaseType ?? "",
    arrestDate: "",
    offenseDate: "",
    arrestingAgency: "",
    agencyCaseNumber: "",
    dispositionDate: "",
    convictionDate: "",
    sentenceCompletionDate: "",
    convictionLevel: session.recordType === "past_conviction" ? "misdemeanor" : "",
    hasZeroBalance: false,
    firstOffenderSignal: false,
    nonTrafficSignal: false,
    excludedOffenseScreening: false,
    oneFelonyExpungementSignal: false
  });
  const [packet, setPacket] = useState<RcapDocumentPacket | undefined>();
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<string | undefined>();
  const [error, setError] = useState<string | undefined>();

  async function saveForm(generate: boolean) {
    setIsSaving(true);
    setError(undefined);
    setMessage(undefined);
    const endpoint = packet ? `/api/rcap/documents/${packet.id}/${generate ? "generate" : "save"}` : "/api/rcap/documents/mississippi/create";
    const payload = packet && generate ? {} : { partnerSlug, intakeSessionId: session.id, ...draft };
    const response = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
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
          <h2 className="text-2xl font-black text-navy">Petition information form</h2>
          <p className="mt-2 text-sm leading-6 text-grayWilma-700">
            I’ll use what you shared with Wilma and ask for a few court details. If you do not have something, leave it blank and I’ll show what is still missing.
          </p>
        </div>
      </div>

      <div className="mt-6 grid gap-4 md:grid-cols-2">
        <Field label="Court case number, if you have it" value={draft.causeNumber} onChange={(causeNumber) => setDraft({ ...draft, causeNumber })} />
        <Field label="Charge or case type" value={draft.charge} onChange={(charge) => setDraft({ ...draft, charge })} />
        <Field label="County where the case started" value={draft.courtCounty} onChange={(courtCounty) => setDraft({ ...draft, courtCounty })} />
        <Select label="Court type, if you know it" value={draft.courtType} onChange={(courtType) => setDraft({ ...draft, courtType })} options={["", "Circuit Court", "County Court", "Justice Court", "Municipal Court"]} />
        <Field label="Court name, if you know it" value={draft.courtName} onChange={(courtName) => setDraft({ ...draft, courtName })} />
        <Field label="City/court jurisdiction, if you know it" value={draft.jurisdiction} onChange={(jurisdiction) => setDraft({ ...draft, jurisdiction })} />
        <Field label="About when did the arrest happen?" value={draft.arrestDate} onChange={(arrestDate) => setDraft({ ...draft, arrestDate })} />
        <Field label="About when did the event happen?" value={draft.offenseDate} onChange={(offenseDate) => setDraft({ ...draft, offenseDate })} />
        <Field label="Which police department, sheriff, or agency handled the arrest?" value={draft.arrestingAgency} onChange={(arrestingAgency) => setDraft({ ...draft, arrestingAgency })} />
        <Field label="Agency report or case number, if you have it" value={draft.agencyCaseNumber} onChange={(agencyCaseNumber) => setDraft({ ...draft, agencyCaseNumber })} />
        <Field label="About when did the court dismiss the case or make the final decision?" value={draft.dispositionDate} onChange={(dispositionDate) => setDraft({ ...draft, dispositionDate })} />
        <Field label="Conviction date, if this was a conviction" value={draft.convictionDate} onChange={(convictionDate) => setDraft({ ...draft, convictionDate })} />
        <Field label="When were all sentence terms finished?" value={draft.sentenceCompletionDate} onChange={(sentenceCompletionDate) => setDraft({ ...draft, sentenceCompletionDate })} />
        <Select label="If this was a conviction, what kind?" value={draft.convictionLevel} onChange={(convictionLevel) => setDraft({ ...draft, convictionLevel: convictionLevel as Draft["convictionLevel"] })} options={["", "misdemeanor", "felony"]} />
      </div>

      <div className="mt-5 grid gap-3 md:grid-cols-2">
        <Check label="Do you have proof that all fines, fees, and court costs were paid?" checked={draft.hasZeroBalance} onChange={(hasZeroBalance) => setDraft({ ...draft, hasZeroBalance })} />
        <Check label="Was this a first-offender misdemeanor, if you know?" checked={draft.firstOffenderSignal} onChange={(firstOffenderSignal) => setDraft({ ...draft, firstOffenderSignal })} />
        <Check label="Was the misdemeanor non-traffic, if you know?" checked={draft.nonTrafficSignal} onChange={(nonTrafficSignal) => setDraft({ ...draft, nonTrafficSignal })} />
        <Check label="For a felony, have excluded offense concerns been reviewed?" checked={draft.excludedOffenseScreening} onChange={(excludedOffenseScreening) => setDraft({ ...draft, excludedOffenseScreening })} />
        <Check label="For a felony, is this the only felony expungement request you know of?" checked={draft.oneFelonyExpungementSignal} onChange={(oneFelonyExpungementSignal) => setDraft({ ...draft, oneFelonyExpungementSignal })} />
      </div>

      <p className="mt-5 rounded-md border border-grayWilma-200 bg-[#f7f8f6] p-3 text-sm leading-6 text-grayWilma-700">
        Do not enter SSN or date of birth in this phase. If a court later requires a private detail, the draft will show a placeholder for you to add it yourself if required.
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

      {packet ? (
        <a href={`/documents/${partnerSlug}/${packet.id}`} className="mt-4 inline-flex text-sm font-black text-teal hover:text-navy">
          Open saved packet
        </a>
      ) : null}
      {message ? <p className="mt-4 rounded-md border border-teal/30 bg-teal/10 p-3 text-sm font-semibold text-teal">{message}</p> : null}
      {error ? <p className="mt-4 rounded-md border border-danger/30 bg-danger/10 p-3 text-sm font-semibold text-danger">{error}</p> : null}
    </section>
  );
}

function Field({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return (
    <label className="grid gap-2 text-xs font-bold uppercase text-grayWilma-600">
      {label}
      <input value={value} onChange={(event) => onChange(event.target.value)} className="min-h-11 rounded-md border border-grayWilma-200 px-3 text-sm font-semibold normal-case text-navy outline-none focus:border-teal" />
    </label>
  );
}

function Select({ label, value, options, onChange }: { label: string; value: string; options: string[]; onChange: (value: string) => void }) {
  return (
    <label className="grid gap-2 text-xs font-bold uppercase text-grayWilma-600">
      {label}
      <select value={value} onChange={(event) => onChange(event.target.value)} className="min-h-11 rounded-md border border-grayWilma-200 px-3 text-sm font-semibold normal-case text-navy outline-none focus:border-teal">
        {options.map((option) => <option key={option || "blank"} value={option}>{option || "Not sure yet"}</option>)}
      </select>
    </label>
  );
}

function Check({ label, checked, onChange }: { label: string; checked: boolean; onChange: (value: boolean) => void }) {
  return (
    <label className="flex gap-3 rounded-md border border-grayWilma-200 bg-[#f7f8f6] p-3 text-sm font-semibold text-grayWilma-800">
      <input type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} className="mt-1 h-4 w-4" />
      {label}
    </label>
  );
}
