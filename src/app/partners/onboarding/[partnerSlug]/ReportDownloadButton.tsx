"use client";

import { useState } from "react";
import { Download } from "lucide-react";
import { Button } from "@/components/ui/Button";

export function ReportDownloadButton({
  endpoint,
  filename,
  label,
  partnerId,
  partnerName
}: {
  endpoint: string;
  filename: string;
  label: string;
  partnerId: string;
  partnerName: string;
}) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function downloadReport() {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          partnerId,
          partnerName,
          dateRange: "Last 90 days",
          state: "All States"
        })
      });

      if (!response.ok) {
        throw new Error("Could not generate report.");
      }

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = filename;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(url);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not generate report.");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="grid gap-2">
      <Button
        type="button"
        variant="secondary"
        onClick={downloadReport}
        disabled={isLoading}
        className="min-h-11 w-full"
      >
        <Download className="h-4 w-4" aria-hidden="true" />
        {isLoading ? "Generating..." : label}
      </Button>
      {error ? <p className="text-xs font-semibold text-orange">{error}</p> : null}
    </div>
  );
}
