"use client";

import { useState } from "react";
import { internalSendPartnerEmailApi } from "@/lib/partners/routes";

export function EmailDryRunButton({ partnerSlug, emailType }: { partnerSlug: string; emailType: string }) {
  const [message, setMessage] = useState<string>("");
  const [isRunning, setIsRunning] = useState(false);

  async function runDryRun() {
    setIsRunning(true);
    setMessage("");

    try {
      const response = await fetch(internalSendPartnerEmailApi(), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ partnerSlug, emailType, mode: "dry_run" })
      });
      const result = (await response.json()) as { message?: string; status?: string };
      setMessage(`${result.status ?? "dry_run"}: ${result.message ?? "Dry-run request completed."}`);
    } catch {
      setMessage("Dry-run request failed.");
    } finally {
      setIsRunning(false);
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <button
        type="button"
        onClick={runDryRun}
        disabled={isRunning}
        className="inline-flex min-h-10 items-center justify-center rounded-md bg-navy px-4 py-2 text-sm font-semibold text-white transition hover:bg-navy-mid disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isRunning ? "Recording dry-run" : "Record dry-run"}
      </button>
      {message ? <p className="text-sm font-semibold text-grayWilma-700">{message}</p> : null}
    </div>
  );
}
