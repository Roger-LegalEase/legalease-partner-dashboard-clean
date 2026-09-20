"use client";

import { useState } from "react";
import type { ClinicQueueCase } from "@/lib/clinic-mode/types";

const statuses: ClinicQueueCase["queueStatus"][] = ["started","in_progress","needs_information","attorney_review","packet_ready","referred","closed"];
const statusLabels: Record<ClinicQueueCase["queueStatus"], string> = {
  started: "Screening in progress",
  in_progress: "Result saved",
  needs_information: "Packet information needed",
  attorney_review: "Attorney review requested",
  packet_ready: "Packet prepared",
  referred: "Referred for help",
  closed: "Closed"
};

export function ClinicQueueClient({ eventId, initialCases }: { eventId: string; initialCases: ClinicQueueCase[] }) {
  const [cases, setCases] = useState(initialCases);
  const [notice, setNotice] = useState("");
  async function transition(caseId: string, queueStatus: ClinicQueueCase["queueStatus"]) {
    setNotice("");
    const response = await fetch(`/api/clinic/events/${eventId}/queue`, { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ caseId, queueStatus }) });
    if (!response.ok) { setNotice("That queue update was denied."); return; }
    setCases((current) => current.map((item) => item.id === caseId ? { ...item, queueStatus } : item));
    setNotice("Queue status updated.");
  }
  return <div><p aria-live="polite" className="mb-3 min-h-5 text-sm font-bold text-[#8A3C1F]">{notice}</p><div className="overflow-x-auto rounded-xl border border-[#E8DED3] bg-white"><table className="w-full min-w-[760px] text-left text-sm"><thead className="bg-[#F3F8F5] text-xs font-black uppercase tracking-wide text-[#50635B]"><tr><th className="px-4 py-3">Participant reference</th><th className="px-4 py-3">Jurisdiction</th><th className="px-4 py-3">Route</th><th className="px-4 py-3">Court identity</th><th className="px-4 py-3">Packet status</th></tr></thead><tbody className="divide-y divide-[#EEE6DB]">{cases.map((item) => <tr key={item.id}><td className="px-4 py-4 font-mono text-xs text-[#0F1E3D]">…{item.participantUserId.slice(-8)}</td><td className="px-4 py-4 font-black text-[#0F1E3D]">{item.jurisdiction}</td><td className="px-4 py-4 text-[#5C5750]">{item.routeDisposition.replace("_", " ")}</td><td className="px-4 py-4 text-[#5C5750]">{item.courtIdentityVerified ? "Verified" : "Manual / unverified"}</td><td className="px-4 py-4"><select aria-label={`Packet status for participant ending ${item.participantUserId.slice(-8)}`} value={item.queueStatus} onChange={(event) => void transition(item.id, event.target.value as ClinicQueueCase["queueStatus"])} className="min-h-10 rounded-md border border-[#CFC4B8] bg-white px-3 font-semibold">{statuses.map((status) => <option key={status} value={status}>{statusLabels[status]}</option>)}</select></td></tr>)}</tbody></table>{cases.length === 0 ? <p className="p-8 text-sm text-[#6B625B]">No participants have entered this event.</p> : null}</div></div>;
}
