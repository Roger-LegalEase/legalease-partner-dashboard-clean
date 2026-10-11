"use client";

import { SponsorCapacityEntryNotice } from "@/components/expungement-ai/SponsorCapacityNotice";
import { useRef, useState, type FormEvent } from "react";
import { useLocalization } from "@/components/expungement-ai/LocalizationProvider";
import type { PublicClinicEvent } from "@/lib/clinic-mode/types";
import { PROGRAM_JURISDICTIONS } from "@/lib/partners/onboarding/program-defaults";

export function ClinicAssistanceClient({ event, staff }: { event: PublicClinicEvent; staff: Array<{ id: string; label: string }> }) {
  const { text } = useLocalization();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [consumerUrl, setConsumerUrl] = useState("");
  const inFlight=useRef(false),request=useRef<{payload:string;id:string}|null>(null);

  async function start(formEvent: FormEvent<HTMLFormElement>) {
    formEvent.preventDefault();
    if(inFlight.current)return;inFlight.current=true;
    setBusy(true);
    setError("");
    const data = new FormData(formEvent.currentTarget);
    const payload={eventSlug:event.publicSlug,eventStaffId:String(data.get("eventStaffId")??""),jurisdiction:event.jurisdiction??String(data.get("jurisdiction")??""),consent:data.get("consent")==="yes"};
    const signature=JSON.stringify(payload);if(request.current?.payload!==signature)request.current={payload:signature,id:crypto.randomUUID()};
    const response = await fetch("/api/clinic/assistance/start", {
      method: "POST", headers: { "content-type": "application/json" },
      body: JSON.stringify({...payload,requestId:request.current.id})
    }).catch(() => null);
    const body = await response?.json().catch(() => null) as { screeningUrl?: string; consumerUrl?: string; outcome?: string; error?: string } | null;
    if (response?.ok && body?.outcome === "sponsor_capacity_exhausted" && body.consumerUrl?.startsWith("/expungement-ai/screening/")) {
      setConsumerUrl(body.consumerUrl);
      inFlight.current=false;setBusy(false);
      return;
    }
    if (!response?.ok || !body?.screeningUrl) {
      setError(body?.error ?? "The assisted session could not be started.");
      inFlight.current=false;setBusy(false);
      return;
    }
    window.location.replace(body.screeningUrl);
  }

  if (consumerUrl) return <SponsorCapacityEntryNotice consumerUrl={consumerUrl} />;

  return (
    <form onSubmit={start} autoComplete="off" className="rounded-2xl border border-[#E8DED3] bg-white p-6 shadow-sm">
      <p className="text-xs font-black uppercase tracking-[0.2em] text-[#127256]">{text("Participant-owned assistance")}</p>
      <h1 className="mt-3 text-3xl font-black text-[#0F1E3D]">{text("Consent to Clinic staff assistance")}</h1>
      <p className="mt-4 text-sm leading-6 text-[#5C5750]">{text("You remain the owner of your account, screening, matter, documents, and Briefcase. The approved staff member may help during this time-limited session only. Ending the Clinic session removes their assistance access.")}</p>
      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        <label className="text-sm font-black text-[#0F1E3D]">{text("Assisting staff member")}<select aria-label={text("Assisting staff member")} name="eventStaffId" required className={inputClass}><option value="">{text("Select approved staff")}</option>{staff.map((person) => <option key={person.id} value={person.id}>{person.label.replace(/^Approved staff (\d+)$/, (_, number) => text("Approved staff {number}", { vars: { number } }))}</option>)}</select></label>
        {event.jurisdiction ? (
          <div className="rounded-md border border-[#CFC4B8] bg-[#F3F8F5] px-4 py-3 text-sm text-[#29453B]">
            <span className="block font-black">{text("State or jurisdiction")}</span>
            <span className="mt-1 block">{PROGRAM_JURISDICTIONS[event.jurisdiction]??event.jurisdiction}{text(" - fixed by this clinic event")}</span>
            <input type="hidden" name="jurisdiction" value={event.jurisdiction} />
          </div>
        ) : (
          <p role="alert">{text("This event has no authorized screening jurisdiction. Ask the event coordinator to correct the event scope.")}</p>
        )}
      </div>
      <label className="mt-6 flex items-start gap-3 rounded-xl border border-[#D9E5DF] bg-[#F3F8F5] p-4 text-sm leading-6 text-[#29453B]"><input type="checkbox" name="consent" value="yes" required className="mt-1 h-5 w-5" /><span><strong>{text("I consent to assistance for this Clinic session.")}</strong>{text(" I understand I can end assistance at any time, and Clinic staff do not receive permanent access to my matter.")}</span></label>
      {error ? <p role="alert" className="mt-4 text-sm font-bold text-[#B43D20]">{text(error)}</p> : null}
      {!staff.length ? <p className="mt-4" role="status">{text("No approved assistance staff are available. Ask the event coordinator for help.")}</p> : null}
      <button disabled={busy || staff.length === 0 || !event.jurisdiction} className="mt-6 min-h-12 w-full rounded-md bg-[#0F1E3D] px-5 py-3 text-base font-black text-white hover:bg-[#1F365F] disabled:opacity-50">{busy ? text("Starting secure session…") : text("Start screening with assistance")}</button>
    </form>
  );
}

const inputClass = "mt-2 min-h-12 w-full rounded-md border border-[#CFC4B8] bg-white px-3 py-2 text-sm font-semibold text-[#0F1E3D] outline-none focus:border-[#1D9E75] focus:ring-2 focus:ring-[#1D9E75]/20";
