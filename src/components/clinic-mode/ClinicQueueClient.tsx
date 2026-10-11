"use client";

import { ClinicText, useClinicText } from "./ClinicText";

import { useState } from "react";
import type { ClinicQueueCase } from "@/lib/clinic-mode/types";

const statuses: ClinicQueueCase["queueStatus"][] = ["started","in_progress","needs_information","attorney_review","packet_ready","referred","closed"];
export const clinicQueueStatusLabels: Record<ClinicQueueCase["queueStatus"], string> = {
  started: "Screening in progress",
  in_progress: "Result saved",
  needs_information: "Packet information needed",
  attorney_review: "Attorney review requested",
  packet_ready: "Packet prepared",
  referred: "Referred for help",
  closed: "Closed"
};

export function ClinicQueueClient({ eventId, initialCases }: { eventId: string; initialCases: ClinicQueueCase[] }) {
  const text = useClinicText();
  const [cases, setCases] = useState(initialCases);
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  async function transition(caseId: string, queueStatus: ClinicQueueCase["queueStatus"]) {
    setNotice(""); setBusy(true);
    try {
      const response = await fetch(`/api/clinic/events/${eventId}/queue`, { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ caseId, queueStatus }) });
      const body=await response.json();
      if (!response.ok) throw new Error(body.error??"That queue update was denied.");
      setCases(current => current.map(item => item.id === caseId ? {...item, queueStatus} : item));
      setNotice("Queue status updated.");
    } catch (error) { setNotice(error instanceof Error?error.message:"That queue update was denied."); }
    finally { setBusy(false); }
  }
  const statusControl = (item: ClinicQueueCase, index: number) => <select disabled={busy} aria-label={`${text("Packet status")} — ${text("Case")} ${item.reference ?? index + 1}`} value={item.queueStatus} onChange={event => void transition(item.id, event.target.value as ClinicQueueCase["queueStatus"])} className="min-h-11 w-full rounded-md border border-[#CFC4B8] bg-white px-3 font-semibold">{statuses.map(status => <option key={status} value={status} disabled={status==="packet_ready"&&!item.canMarkPacketPrepared||status==="in_progress"&&!item.canMarkResultSaved}>{text(clinicQueueStatusLabels[status])}</option>)}</select>;
  return <div><p className="mb-4 text-sm">{text("Result saved and Packet prepared are available only after those steps are completed in the participant’s own matter. Queue changes do not verify a case or grant funding.")}</p><p aria-live="polite" className="mb-3 min-h-5 text-sm font-bold text-[#8A3C1F]">{text(notice)}</p><div className="mb-4 space-y-3 md:hidden">{cases.map((item,index) => <article key={item.id} className="rounded-xl border bg-white p-4"><h2 className="font-bold">{text("Case")} {item.reference ?? index + 1} · {item.jurisdiction}</h2><label className="mt-3 block text-sm font-bold">{text("Packet status")}{statusControl(item,index)}</label></article>)}</div><div className="hidden overflow-x-auto rounded-xl md:block border border-[#E8DED3] bg-white"><table className="w-full min-w-[760px] text-left text-sm"><thead className="bg-[#F3F8F5] text-xs font-black uppercase tracking-wide text-[#50635B]"><tr><th className="px-4 py-3"><ClinicText value="Participant reference" /></th><th className="px-4 py-3"><ClinicText value="Jurisdiction" /></th><th className="px-4 py-3"><ClinicText value="Route" /></th><th className="px-4 py-3"><ClinicText value="Court identity" /></th><th className="px-4 py-3"><ClinicText value="Packet status" /></th></tr></thead><tbody className="divide-y divide-[#EEE6DB]">{cases.map((item, index) => <tr key={item.id}><td className="px-4 py-4 font-mono text-xs text-[#0F1E3D]"><ClinicText value="Case" /> {item.reference ?? index + 1}</td><td className="px-4 py-4 font-black text-[#0F1E3D]">{item.jurisdiction}</td><td className="px-4 py-4 text-[#5C5750]"><ClinicText value={item.routeDisposition.replace("_", " ")} /></td><td className="px-4 py-4 text-[#5C5750]"><ClinicText value={item.courtIdentityVerified ? "Verified" : "Manual / unverified"} /></td><td className="px-4 py-4">{statusControl(item, index)}</td></tr>)}</tbody></table></div>{cases.length === 0 ? <p className="p-8 text-sm text-[#6B625B]"><ClinicText value="No participant cases are available to you." /></p> : null}</div>;
}
