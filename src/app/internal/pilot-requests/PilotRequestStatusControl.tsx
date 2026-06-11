"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { pilotRequestStatusLabels, pilotRequestStatuses, type PilotRequestStatus } from "@/lib/partners/pilot-request-status";

export function PilotRequestStatusControl({
  id,
  status
}: {
  id: string;
  status: PilotRequestStatus;
}) {
  const router = useRouter();
  const [selectedStatus, setSelectedStatus] = useState(status);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");

  async function updateStatus(nextStatus: PilotRequestStatus) {
    setSelectedStatus(nextStatus);
    setIsSaving(true);
    setError("");

    try {
      const response = await fetch("/api/internal/pilot-requests/status", {
        method: "POST",
        headers: {
          "content-type": "application/json"
        },
        body: JSON.stringify({ id, status: nextStatus })
      });

      const result = (await response.json().catch(() => null)) as { ok?: boolean; error?: string } | null;
      if (!response.ok || !result?.ok) {
        throw new Error(result?.error ?? "Unable to update status.");
      }

      router.refresh();
    } catch (caught) {
      setSelectedStatus(status);
      setError(caught instanceof Error ? caught.message : "Unable to update status.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="grid gap-2">
      <select
        aria-label="Pilot request status"
        value={selectedStatus}
        disabled={isSaving}
        onChange={(event) => updateStatus(event.currentTarget.value as PilotRequestStatus)}
        className="min-h-10 rounded-md border border-[#d8d2c7] bg-white px-3 text-sm font-bold text-[#17213a] shadow-sm outline-none transition focus:border-[#0f7f80] focus:ring-2 focus:ring-[#0f7f80]/20 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {pilotRequestStatuses.map((option) => (
          <option key={option} value={option}>
            {pilotRequestStatusLabels[option]}
          </option>
        ))}
      </select>
      {error ? <p className="text-xs font-bold text-[#9d371d]">{error}</p> : null}
    </div>
  );
}
