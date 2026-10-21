"use client";

import { useState, type FormEvent } from "react";
import type { ClinicEventStaff, ClinicFollowUp, ClinicQueueCase } from "@/lib/clinic-mode/types";

export function ClinicFollowUpConsole({ eventId, cases, staff, initialFollowUps }: { eventId: string; cases: ClinicQueueCase[]; staff: ClinicEventStaff[]; initialFollowUps: ClinicFollowUp[] }) {
  const [followUps, setFollowUps] = useState(initialFollowUps);
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setNotice("");
    const form = event.currentTarget;
    const data = new FormData(form);
    const response = await fetch(`/api/clinic/events/${eventId}/follow-ups`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        clinicCaseId: String(data.get("clinicCaseId") ?? ""),
        ownerEventStaffId: String(data.get("ownerEventStaffId") ?? "") || null,
        dueAt: String(data.get("dueAt") ?? "") || null,
        status: "open",
        communicationState: "draft",
        participantSafeMessage: String(data.get("participantSafeMessage") ?? ""),
        internalNotes: String(data.get("internalNotes") ?? "")
      })
    });
    if (!response.ok) setNotice("The follow-up was denied or could not be saved.");
    else {
      const refreshed = await fetch(`/api/clinic/events/${eventId}/follow-ups`, { cache: "no-store" });
      const body = await refreshed.json() as { followUps?: ClinicFollowUp[] };
      setFollowUps(body.followUps ?? followUps);
      form.reset();
      setNotice("Follow-up saved in this event.");
    }
    setBusy(false);
  }

  async function complete(item: ClinicFollowUp) {
    setBusy(true);
    const response = await fetch(`/api/clinic/events/${eventId}/follow-ups`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        id: item.id, clinicCaseId: item.clinicCaseId, ownerEventStaffId: item.ownerEventStaffId,
        dueAt: item.dueAt, status: "completed", communicationState: item.communicationState,
        participantSafeMessage: item.participantSafeMessage ?? "", internalNotes: item.internalNotes ?? ""
      })
    });
    if (response.ok) setFollowUps((current) => current.map((row) => row.id === item.id ? { ...row, status: "completed" } : row));
    else setNotice("That follow-up update was denied.");
    setBusy(false);
  }

  return <div className="grid gap-6 xl:grid-cols-[0.8fr_1.2fr]">
    <form onSubmit={save} className="rounded-xl border border-[#E8DED3] bg-white p-5 shadow-sm">
      <p className="text-xs font-black uppercase tracking-[0.18em] text-[#127256]">Event-scoped work</p>
      <h2 className="mt-2 text-xl font-black text-[#0F1E3D]">Schedule follow-up</h2>
      <p className="mt-2 text-sm leading-6 text-[#5C5750]">Participant-safe copy is kept separate from internal notes. Neither field changes account or matter ownership.</p>
      <label className={labelClass}>Clinic case<select required name="clinicCaseId" className={inputClass}><option value="">Select a case</option>{cases.map((item) => <option key={item.id} value={item.id}>{item.jurisdiction} · case …{item.id.slice(-8)} · {item.queueStatus.replaceAll("_", " ")}</option>)}</select></label>
      <label className={labelClass}>Owner<select name="ownerEventStaffId" className={inputClass}><option value="">Unassigned</option>{staff.filter((item) => item.status === "approved" && item.permissions.includes("follow_up")).map((item) => <option key={item.id} value={item.id}>Approved staff …{item.partnerUserId.slice(-8)}</option>)}</select></label>
      <label className={labelClass}>Due date<input name="dueAt" type="datetime-local" className={inputClass} /></label>
      <label className={labelClass}>Participant-safe message<textarea name="participantSafeMessage" maxLength={1200} rows={4} className={inputClass} /></label>
      <label className={labelClass}>Internal notes<textarea name="internalNotes" maxLength={4000} rows={5} className={inputClass} /></label>
      <button disabled={busy || cases.length === 0} className="mt-5 min-h-11 rounded-md bg-[#0F1E3D] px-5 py-2 text-sm font-black text-white disabled:opacity-45">Save follow-up</button>
      <p aria-live="polite" className="mt-3 min-h-5 text-sm font-bold text-[#8A3C1F]">{notice}</p>
    </form>
    <section className="rounded-xl border border-[#E8DED3] bg-white p-5 shadow-sm">
      <div className="flex items-end justify-between gap-4"><div><p className="text-xs font-black uppercase tracking-[0.18em] text-[#A8431F]">No participant identity</p><h2 className="mt-2 text-xl font-black text-[#0F1E3D]">Follow-up queue</h2></div><span className="text-3xl font-black text-[#0F1E3D]">{followUps.length}</span></div>
      <div className="mt-5 divide-y divide-[#EEE6DB]">{followUps.map((item) => <article key={item.id} className="py-5"><div className="flex flex-col justify-between gap-3 sm:flex-row"><div><p className="font-black text-[#0F1E3D]">{item.jurisdiction} · case …{item.clinicCaseId.slice(-8)}</p><p className="mt-1 text-sm text-[#6B625B]">{item.status.replaceAll("_", " ")} · communication {item.communicationState.replaceAll("_", " ")} · {item.dueAt ? formatDate(item.dueAt) : "no due date"}</p></div>{item.status !== "completed" ? <button type="button" disabled={busy} onClick={() => void complete(item)} className="min-h-10 rounded-md border border-[#0F1E3D] px-4 text-sm font-bold text-[#0F1E3D]">Mark completed</button> : null}</div>{item.participantSafeMessage ? <p className="mt-3 rounded-md bg-[#F3F8F5] p-3 text-sm text-[#29453B]"><strong>Participant-safe:</strong> {item.participantSafeMessage}</p> : null}{item.internalNotes ? <p className="mt-2 text-sm text-[#5C5750]"><strong>Internal:</strong> {item.internalNotes}</p> : null}</article>)}{followUps.length === 0 ? <p className="py-10 text-sm text-[#6B625B]">No follow-up work is scheduled.</p> : null}</div>
    </section>
  </div>;
}

const labelClass = "mt-4 block text-sm font-bold text-[#0F1E3D]";
const inputClass = "mt-2 min-h-11 w-full rounded-md border border-[#CFC4B8] bg-white px-3 py-2 text-sm font-normal text-[#0F1E3D] outline-none focus:border-[#1D9E75] focus:ring-2 focus:ring-[#1D9E75]/20";
const formatDate = (date: string) => new Intl.DateTimeFormat("en-US", { dateStyle: "medium", timeStyle: "short" }).format(new Date(date));
