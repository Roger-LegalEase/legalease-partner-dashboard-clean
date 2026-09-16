"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { laSecondary } from "./LegalAidShell";

export function CancelRegistrationButton({ registrationId }: { registrationId: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState("");
  async function cancel() {
    setBusy(true);
    setError("");
    try {
      const response = await fetch(`/api/legal-aid/registrations/${registrationId}`, { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ status: "cancelled" }) });
      if (!response.ok) { const body = await response.json().catch(() => ({})) as { error?: string }; setError(body.error ?? "The registration could not be cancelled."); return; }
      router.refresh();
    } finally { setBusy(false); }
  }
  if (!confirming) return <button type="button" onClick={() => setConfirming(true)} className={laSecondary}>Cancel my registration</button>;
  return (
    <div className="rounded-md border border-[#E6C9A8] bg-[#FFF8EE] p-4 text-sm">
      <p className="font-bold">Cancel your place at this clinic?</p>
      <p className="mt-1 text-[#5B4E66]">Your application answers are kept, but your seat is released to someone else.</p>
      <div className="mt-3 flex flex-wrap gap-2">
        <button type="button" disabled={busy} onClick={cancel} className={laSecondary}>{busy ? "Cancelling…" : "Yes, cancel my registration"}</button>
        <button type="button" disabled={busy} onClick={() => setConfirming(false)} className={laSecondary}>Keep my place</button>
      </div>
      {error ? <p role="alert" className="mt-2 font-semibold text-[#8A1F1F]">{error}</p> : null}
    </div>
  );
}
