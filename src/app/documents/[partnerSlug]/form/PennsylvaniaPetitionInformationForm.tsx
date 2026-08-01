"use client";

import { useState } from "react";
import { Briefcase, FileText, Loader2, Save } from "lucide-react";
import { Button } from "@/components/ui/Button";
import type { RcapIntakeSession } from "@/lib/rcap-intake/types";
import type { RcapDocumentPacket } from "@/lib/rcap/documents/types";
import type { PennsylvaniaOffenseGrade } from "@/lib/rcap/documents/types";

type Draft = {
  county: string;
  judicialDistrict: string;
  docketNumber: string;
  otn: string;
  charge: string;
  offenseGrade: PennsylvaniaOffenseGrade;
  disposition: string;
  arrestingAgency: string;
  arrestDate: string;
  complaintDate: string;
  dispositionDate: string;
  hasPatchReport: boolean;
  patchWithin60Days: boolean;
  patchMissingReason: string;
  restitutionPaid: boolean;
  victimRestitutionOwed: boolean;
  nonRestitutionCostsOnly: boolean;
  waitingPeriodSatisfied: boolean;
  noPendingProceedings: boolean;
  noArrestOrProsecutionFiveYears: boolean;
  convictionFreeSevenYears: boolean;
  convictionFreeTenYears: boolean;
  sentenceUnderThirtyMonths: boolean;
  ardCompleted: boolean;
  fullPardon: boolean;
  ageSeventyOrOlder: boolean;
  deceasedThreeYears: boolean;
  excludedOffenseSignal: boolean;
  sexOffenderRegistrationSignal: boolean;
  firearmWeaponSignal: boolean;
  familyOrDangerToPersonSignal: boolean;
  federalOrOutOfStateSignal: boolean;
  cleanSlateAutomaticSignal: boolean;
  commonwealthServiceReady: boolean;
  feeWaiverRequested: boolean;
};

export function PennsylvaniaPetitionInformationForm({ partnerSlug, session }: { partnerSlug: string; session: RcapIntakeSession }) {
  const [draft, setDraft] = useState<Draft>({
    county: session.county ?? "",
    judicialDistrict: "",
    docketNumber: "",
    otn: "",
    charge: session.chargeOrCaseType ?? "",
    offenseGrade: "unknown",
    disposition: session.caseOutcome ?? "",
    arrestingAgency: "",
    arrestDate: "",
    complaintDate: "",
    dispositionDate: "",
    hasPatchReport: session.hasDocuments === true,
    patchWithin60Days: false,
    patchMissingReason: "",
    restitutionPaid: false,
    victimRestitutionOwed: false,
    nonRestitutionCostsOnly: false,
    waitingPeriodSatisfied: false,
    noPendingProceedings: false,
    noArrestOrProsecutionFiveYears: false,
    convictionFreeSevenYears: false,
    convictionFreeTenYears: false,
    sentenceUnderThirtyMonths: false,
    ardCompleted: false,
    fullPardon: false,
    ageSeventyOrOlder: false,
    deceasedThreeYears: false,
    excludedOffenseSignal: false,
    sexOffenderRegistrationSignal: false,
    firearmWeaponSignal: false,
    familyOrDangerToPersonSignal: false,
    federalOrOutOfStateSignal: false,
    cleanSlateAutomaticSignal: false,
    commonwealthServiceReady: false,
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
    const response = await fetch("/api/rcap/documents/pennsylvania/create", {
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
          <h2 className="text-2xl font-black text-navy">Pennsylvania record relief information</h2>
          <p className="mt-2 text-sm leading-6 text-grayWilma-700">
            Pennsylvania uses expungement, limited access / sealing, and automatic Clean Slate sealing. I can help organize details for review without promising a result.
          </p>
        </div>
      </div>

      <div className="mt-6 grid gap-4 md:grid-cols-2">
        <Field label="County where the case was heard" value={draft.county} onChange={(county) => setDraft({ ...draft, county })} />
        <Field label="Judicial district, if known" value={draft.judicialDistrict} onChange={(judicialDistrict) => setDraft({ ...draft, judicialDistrict })} />
        <Field label="Court docket number" value={draft.docketNumber} onChange={(docketNumber) => setDraft({ ...draft, docketNumber })} />
        <Field label="OTN, if available" value={draft.otn} onChange={(otn) => setDraft({ ...draft, otn })} />
        <Field label="Charge or statute description" value={draft.charge} onChange={(charge) => setDraft({ ...draft, charge })} />
        <Select label="Offense grade" value={draft.offenseGrade} onChange={(offenseGrade) => setDraft({ ...draft, offenseGrade: offenseGrade as PennsylvaniaOffenseGrade })} options={["unknown", "summary", "M3", "M2", "M1", "F3_property", "drug_felony", "felony_other"]} />
        <Field label="Disposition" value={draft.disposition} onChange={(disposition) => setDraft({ ...draft, disposition })} />
        <Field label="Disposition or sentence completion date" value={draft.dispositionDate} onChange={(dispositionDate) => setDraft({ ...draft, dispositionDate })} />
        <Field label="Arresting agency" value={draft.arrestingAgency} onChange={(arrestingAgency) => setDraft({ ...draft, arrestingAgency })} />
        <Field label="Arrest date" value={draft.arrestDate} onChange={(arrestDate) => setDraft({ ...draft, arrestDate })} />
        <Field label="Complaint date" value={draft.complaintDate} onChange={(complaintDate) => setDraft({ ...draft, complaintDate })} />
        <Field label="If no PATCH report, why is it missing?" value={draft.patchMissingReason} onChange={(patchMissingReason) => setDraft({ ...draft, patchMissingReason })} />
      </div>

      <div className="mt-5 grid gap-3 md:grid-cols-2">
        <Check label="Do you have a PATCH report from Pennsylvania State Police?" checked={draft.hasPatchReport} onChange={(hasPatchReport) => setDraft({ ...draft, hasPatchReport })} />
        <Check label="Was the PATCH report obtained within 60 days?" checked={draft.patchWithin60Days} onChange={(patchWithin60Days) => setDraft({ ...draft, patchWithin60Days })} />
        <Check label="Is victim restitution paid?" checked={draft.restitutionPaid} onChange={(restitutionPaid) => setDraft({ ...draft, restitutionPaid, victimRestitutionOwed: restitutionPaid ? false : draft.victimRestitutionOwed })} />
        <Check label="Is victim restitution still owed?" checked={draft.victimRestitutionOwed} onChange={(victimRestitutionOwed) => setDraft({ ...draft, victimRestitutionOwed, restitutionPaid: victimRestitutionOwed ? false : draft.restitutionPaid })} />
        <Check label="Are only non-restitution fines or costs unpaid?" checked={draft.nonRestitutionCostsOnly} onChange={(nonRestitutionCostsOnly) => setDraft({ ...draft, nonRestitutionCostsOnly })} />
        <Check label="Does a waiting period appear satisfied?" checked={draft.waitingPeriodSatisfied} onChange={(waitingPeriodSatisfied) => setDraft({ ...draft, waitingPeriodSatisfied })} />
        <Check label="No pending proceedings for a no-disposition arrest?" checked={draft.noPendingProceedings} onChange={(noPendingProceedings) => setDraft({ ...draft, noPendingProceedings })} />
        <Check label="Five years arrest/prosecution-free for summary expungement?" checked={draft.noArrestOrProsecutionFiveYears} onChange={(noArrestOrProsecutionFiveYears) => setDraft({ ...draft, noArrestOrProsecutionFiveYears })} />
        <Check label="Seven years conviction-free for misdemeanor sealing?" checked={draft.convictionFreeSevenYears} onChange={(convictionFreeSevenYears) => setDraft({ ...draft, convictionFreeSevenYears })} />
        <Check label="Ten years conviction-free for felony Clean Slate / property felony review?" checked={draft.convictionFreeTenYears} onChange={(convictionFreeTenYears) => setDraft({ ...draft, convictionFreeTenYears })} />
        <Check label="For a drug felony, was the sentence under 30 months?" checked={draft.sentenceUnderThirtyMonths} onChange={(sentenceUnderThirtyMonths) => setDraft({ ...draft, sentenceUnderThirtyMonths })} />
        <Check label="Successful ARD completion?" checked={draft.ardCompleted} onChange={(ardCompleted) => setDraft({ ...draft, ardCompleted })} />
        <Check label="Full gubernatorial pardon?" checked={draft.fullPardon} onChange={(fullPardon) => setDraft({ ...draft, fullPardon })} />
        <Check label="Age 70 or older pathway?" checked={draft.ageSeventyOrOlder} onChange={(ageSeventyOrOlder) => setDraft({ ...draft, ageSeventyOrOlder })} />
        <Check label="Deceased for 3 years pathway?" checked={draft.deceasedThreeYears} onChange={(deceasedThreeYears) => setDraft({ ...draft, deceasedThreeYears })} />
        <Check label="Possible automatic Clean Slate review?" checked={draft.cleanSlateAutomaticSignal} onChange={(cleanSlateAutomaticSignal) => setDraft({ ...draft, cleanSlateAutomaticSignal })} />
        <Check label="Excluded offense, sex registration, weapons, family, danger-to-person, federal, or out-of-state concern?" checked={draft.excludedOffenseSignal} onChange={(excludedOffenseSignal) => setDraft({ ...draft, excludedOffenseSignal })} />
        <Check label="Offense requires sex offender registration?" checked={draft.sexOffenderRegistrationSignal} onChange={(sexOffenderRegistrationSignal) => setDraft({ ...draft, sexOffenderRegistrationSignal })} />
        <Check label="Firearms or weapons concern?" checked={draft.firearmWeaponSignal} onChange={(firearmWeaponSignal) => setDraft({ ...draft, firearmWeaponSignal })} />
        <Check label="Family-related or danger-to-person concern?" checked={draft.familyOrDangerToPersonSignal} onChange={(familyOrDangerToPersonSignal) => setDraft({ ...draft, familyOrDangerToPersonSignal })} />
        <Check label="Federal or out-of-state record?" checked={draft.federalOrOutOfStateSignal} onChange={(federalOrOutOfStateSignal) => setDraft({ ...draft, federalOrOutOfStateSignal })} />
        <Check label="Ready to serve attorney for the Commonwealth / DA?" checked={draft.commonwealthServiceReady} onChange={(commonwealthServiceReady) => setDraft({ ...draft, commonwealthServiceReady })} />
        <Check label="Could filing costs be a barrier?" checked={draft.feeWaiverRequested} onChange={(feeWaiverRequested) => setDraft({ ...draft, feeWaiverRequested })} />
      </div>

      <p className="mt-5 rounded-md border border-grayWilma-200 bg-[#f7f8f6] p-3 text-sm leading-6 text-grayWilma-700">
        Do not enter SSN or date of birth in this phase. If the court form requires private fields, the draft uses placeholders for the petitioner to complete outside this workflow.
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
