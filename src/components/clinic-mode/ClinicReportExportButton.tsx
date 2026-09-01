"use client";

import { useState } from "react";

export function ClinicReportExportButton({ eventId }: { eventId: string }) {
  const [status, setStatus] = useState<"idle" | "working" | "error">("idle");

  async function exportReport() {
    setStatus("working");
    try {
      const response = await fetch(`/api/clinic/events/${encodeURIComponent(eventId)}/reporting/export`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: "{}"
      });
      if (!response.ok) throw new Error("export failed");
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `clinic-${eventId}-aggregate.csv`;
      link.click();
      URL.revokeObjectURL(url);
      setStatus("idle");
    } catch {
      setStatus("error");
    }
  }

  return (
    <div>
      <button
        type="button"
        disabled={status === "working"}
        onClick={exportReport}
        className="rounded-md border border-[#0F6E56] px-4 py-2 text-sm font-black text-[#0F6E56] disabled:opacity-60"
      >
        {status === "working" ? "Preparing export..." : "Export aggregate CSV"}
      </button>
      <p aria-live="polite" className="mt-2 text-sm text-[#9A3412]">
        {status === "error" ? "The aggregate export could not be prepared." : ""}
      </p>
    </div>
  );
}
