"use client";

import { useState } from "react";
import { Briefcase, FileText, Loader2, Save } from "lucide-react";
import { Button } from "@/components/ui/Button";
import type { RcapIntakeSession } from "@/lib/rcap-intake/types";
import type { RcapDocumentPacket } from "@/lib/rcap/documents/types";
import type { TexasHarrisCourtType, TexasHarrisDispositionRoute } from "@/lib/rcap/documents/types";

type Draft = {
  courtType: TexasHarrisCourtType;
  caseNumber: string;
  petitionerDateOfBirth: string;
  petitionerDriverLicenseOrId: string;
  petitionerSsnLastFour: string;
  arrestDate: string;
  arrestingAgency: string;
  agencyCaseNumber: string;
  charge: string;
  disposition: string;
  dispositionDate: string;
  dispositionRoute: TexasHarrisDispositionRoute;
  statutoryRoute: string;
  waitingPeriodFacts: string;
  noDisqualifyingHistory: boolean;
  disqualifierNotes: string;
  includeHoustonPoliceDepartment: boolean;
  additionalAgenciesText: string;
  verificationReady: boolean;
  feeWaiverRequested: boolean;
};

export function TexasHarrisPetitionInformationForm({ partnerSlug, session }: { partnerSlug: string; session: RcapIntakeSession }) {
  const [draft, setDraft] = useState<Draft>({
    courtType: "unknown",
    caseNumber: "",
    petitionerDateOfBirth: "",
    petitionerDriverLicenseOrId: "",
    petitionerSsnLastFour: "",
    arrestDate: "",
    arrestingAgency: "",
    agencyCaseNumber: "",
    charge: session.chargeOrCaseType ?? "",
    disposition: session.caseOutcome ?? "",
    dispositionDate: "",
    dispositionRoute: "unknown",
    statutoryRoute: "",
    waitingPeriodFacts: "",
    noDisqualifyingHistory: false,
    disqualifierNotes: "",
    includeHoustonPoliceDepartment: false,
    additionalAgenciesText: "",
    verificationReady: false,
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
    const response = await fetch("/api/rcap/documents/texas-harris/create", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        partnerSlug,
        intakeSessionId: session.id,
        ...draft,
        additionalAgencies: draft.additionalAgenciesText.split(/\r?\n|,/).map((agency) => agency.trim()).filter(Boolean)
      })
    });
    const body = (await response.json().catch(() => ({}))) as { packet?: RcapDocumentPacket; error?: string };
    setIsSaving(false);
    if (!response.ok || body.error || !body.packet) {
      setError(body.error ?? "We could not save this form yet.");
      return;
    }
    setPacket(body.packet);
    setMessage(generate ? "Harris County draft packet generated and saved to your Briefcase." : "Saved to your Briefcase. You can come back later.");
  }

  return (
    <section className="rounded-md border border-grayWilma-200 bg-white p-5 shadow-sm md:p-6">
      <div className="flex items-start gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-teal/10 text-teal">
          <FileText className="h-5 w-5" aria-hidden="true" />
        </span>
        <div>
          <h2 className="text-2xl font-black text-navy">Harris County, Texas record relief information</h2>
          <p className="mt-2 text-sm leading-6 text-grayWilma-700">
            This prepares a Harris County packet for Chapter 55A expunction or Government Code Chapter 411 nondisclosure review.
          </p>
        </div>
      </div>

      <div className="mt-6 grid gap-4 md:grid-cols-2">
        <Select label="Disposition route" value={draft.dispositionRoute} onChange={(dispositionRoute) => setDraft({ ...draft, dispositionRoute: dispositionRoute as TexasHarrisDispositionRoute })} options={["unknown", "acquittal_not_guilty", "arrest_no_charge", "dismissal_or_quashed", "limitations_expired", "pardon_actual_innocence", "class_c_deferred_completed", "deferred_adjudication_completed", "eligible_conviction", "first_offense_dwi", "final_conviction"]} />
        <Select label="Harris County court type" value={draft.courtType} onChange={(courtType) => setDraft({ ...draft, courtType: courtType as TexasHarrisCourtType })} options={["unknown", "district", "county_criminal", "municipal_class_c", "justice"]} />
        <Field label="Case or cause number" value={draft.caseNumber} onChange={(caseNumber) => setDraft({ ...draft, caseNumber })} />
        <Field label="Date of birth" value={draft.petitionerDateOfBirth} onChange={(petitionerDateOfBirth) => setDraft({ ...draft, petitionerDateOfBirth })} />
        <Field label="Driver license or ID" value={draft.petitionerDriverLicenseOrId} onChange={(petitionerDriverLicenseOrId) => setDraft({ ...draft, petitionerDriverLicenseOrId })} />
        <Field label="SSN last four, if required by packet" value={draft.petitionerSsnLastFour} onChange={(petitionerSsnLastFour) => setDraft({ ...draft, petitionerSsnLastFour })} />
        <Field label="Arrest date" value={draft.arrestDate} onChange={(arrestDate) => setDraft({ ...draft, arrestDate })} />
        <Field label="Arresting agency" value={draft.arrestingAgency} onChange={(arrestingAgency) => setDraft({ ...draft, arrestingAgency, includeHoustonPoliceDepartment: /houston police/i.test(arrestingAgency) || draft.includeHoustonPoliceDepartment })} />
        <Field label="Agency case number" value={draft.agencyCaseNumber} onChange={(agencyCaseNumber) => setDraft({ ...draft, agencyCaseNumber })} />
        <Field label="Charge/offense details" value={draft.charge} onChange={(charge) => setDraft({ ...draft, charge })} />
        <Field label="Disposition details" value={draft.disposition} onChange={(disposition) => setDraft({ ...draft, disposition })} />
        <Field label="Disposition date" value={draft.dispositionDate} onChange={(dispositionDate) => setDraft({ ...draft, dispositionDate })} />
        <Field label="Statutory route/basis" value={draft.statutoryRoute} onChange={(statutoryRoute) => setDraft({ ...draft, statutoryRoute })} />
        <Field label="Waiting-period facts" value={draft.waitingPeriodFacts} onChange={(waitingPeriodFacts) => setDraft({ ...draft, waitingPeriodFacts })} />
        <Field label="Disqualifier notes" value={draft.disqualifierNotes} onChange={(disqualifierNotes) => setDraft({ ...draft, disqualifierNotes })} />
        <Field label="Additional agencies from DPS/arrest paperwork" value={draft.additionalAgenciesText} onChange={(additionalAgenciesText) => setDraft({ ...draft, additionalAgenciesText })} />
      </div>

      <div className="mt-5 grid gap-3 md:grid-cols-2">
        <Check label="No disqualifying history is apparent from the DPS/criminal history review." checked={draft.noDisqualifyingHistory} onChange={(noDisqualifyingHistory) => setDraft({ ...draft, noDisqualifyingHistory })} />
        <Check label="Houston Police Department should be included as arresting agency or notice party." checked={draft.includeHoustonPoliceDepartment} onChange={(includeHoustonPoliceDepartment) => setDraft({ ...draft, includeHoustonPoliceDepartment })} />
        <Check label="Signature and verification/notary block are ready for review." checked={draft.verificationReady} onChange={(verificationReady) => setDraft({ ...draft, verificationReady })} />
        <Check label="Filing costs may be a barrier; surface Statement of Inability option." checked={draft.feeWaiverRequested} onChange={(feeWaiverRequested) => setDraft({ ...draft, feeWaiverRequested })} />
      </div>

      <p className="mt-5 rounded-md border border-grayWilma-200 bg-[#f7f8f6] p-3 text-sm leading-6 text-grayWilma-700">
        The preserved Harris County source packet supplies petition, order, verification, attachment, agency-list, and nondisclosure service language. Current fee amounts, exact filing method, copy counts, and agency-specific service mechanics still require clerk confirmation before filing.
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
