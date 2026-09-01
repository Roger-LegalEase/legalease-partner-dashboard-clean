"use client";

import { useState, type FormEvent } from "react";

const jurisdictions = ["AL","AK","AZ","AR","CA","CO","CT","DE","DC","FL","GA","HI","ID","IL","IN","IA","KS","KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ","NM","NY","NC","ND","OH","OK","OR","PA","RI","SC","SD","TN","TX","UT","VT","VA","WA","WV","WI","WY"];

export function ClinicAssistanceClient({ eventSlug, staff }: { eventSlug: string; staff: Array<{ id: string; label: string }> }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function start(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    const data = new FormData(event.currentTarget);
    const response = await fetch("/api/clinic/assistance/start", {
      method: "POST", headers: { "content-type": "application/json" },
      body: JSON.stringify({ eventSlug, eventStaffId: String(data.get("eventStaffId") ?? ""), jurisdiction: String(data.get("jurisdiction") ?? ""), consent: data.get("consent") === "yes" })
    }).catch(() => null);
    const body = await response?.json().catch(() => null) as { screeningUrl?: string; error?: string } | null;
    if (!response?.ok || !body?.screeningUrl) {
      setError(body?.error ?? "The assisted session could not be started.");
      setBusy(false);
      return;
    }
    window.location.replace(body.screeningUrl);
  }

  return (
    <form onSubmit={start} autoComplete="off" className="rounded-2xl border border-[#E8DED3] bg-white p-6 shadow-sm">
      <p className="text-xs font-black uppercase tracking-[0.2em] text-[#127256]">Participant-owned assistance</p>
      <h1 className="mt-3 text-3xl font-black text-[#0F1E3D]">Consent to Clinic staff assistance</h1>
      <p className="mt-4 text-sm leading-6 text-[#5C5750]">You remain the owner of your account, screening, matter, documents, and Briefcase. The approved staff member may help during this time-limited session only. Ending the Clinic session removes their assistance access.</p>
      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        <label className="text-sm font-black text-[#0F1E3D]">Assisting staff member<select name="eventStaffId" required className={inputClass}><option value="">Select approved staff</option>{staff.map((person) => <option key={person.id} value={person.id}>{person.label}</option>)}</select></label>
        <label className="text-sm font-black text-[#0F1E3D]">State or jurisdiction<select name="jurisdiction" required className={inputClass}><option value="">Select state</option>{jurisdictions.map((state) => <option key={state} value={state}>{state}</option>)}</select></label>
      </div>
      <label className="mt-6 flex items-start gap-3 rounded-xl border border-[#D9E5DF] bg-[#F3F8F5] p-4 text-sm leading-6 text-[#29453B]"><input type="checkbox" name="consent" value="yes" required className="mt-1 h-5 w-5" /><span><strong>I consent to assistance for this Clinic session.</strong> I understand I can end assistance at any time, and Clinic staff do not receive permanent access to my matter.</span></label>
      {error ? <p role="alert" className="mt-4 text-sm font-bold text-[#B43D20]">{error}</p> : null}
      <button disabled={busy || staff.length === 0} className="mt-6 min-h-12 w-full rounded-md bg-[#0F1E3D] px-5 py-3 text-base font-black text-white hover:bg-[#1F365F] disabled:opacity-50">{busy ? "Starting secure session…" : "Start assisted nationwide screening"}</button>
    </form>
  );
}

const inputClass = "mt-2 min-h-12 w-full rounded-md border border-[#CFC4B8] bg-white px-3 py-2 text-sm font-semibold text-[#0F1E3D] outline-none focus:border-[#1D9E75] focus:ring-2 focus:ring-[#1D9E75]/20";
