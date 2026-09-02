"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { PartnerUserRole } from "@/lib/partners/session-partner";

const roleOptions: Array<{ value: PartnerUserRole; label: string }> = [
  { value: "partner_viewer", label: "Partner viewer" },
  { value: "partner_staff", label: "Partner staff" },
  { value: "partner_admin", label: "Partner administrator" }
];

export function PartnerTeamMemberManager({
  memberId,
  role,
  status
}: {
  memberId: string;
  role: PartnerUserRole;
  status: string;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  async function mutate(payload: { action: "change_role"; role: PartnerUserRole } | { action: "revoke" }) {
    setBusy(true);
    setMessage("");
    try {
      const response = await fetch(`/partner/team/members/${encodeURIComponent(memberId)}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload)
      });
      const body = await response.json().catch(() => null) as { message?: string } | null;
      setMessage(body?.message ?? (response.ok ? "Team access updated." : "The team change was denied."));
      if (response.ok) router.refresh();
    } catch {
      setMessage("The team change did not reach the server. Try again.");
    } finally {
      setBusy(false);
    }
  }

  if (status !== "active") {
    return <span className="text-xs font-semibold text-grayWilma-600">Offboarded</span>;
  }

  return (
    <div className="grid min-w-48 gap-2">
      <select
        aria-label="Team member role"
        className="min-h-10 rounded-md border border-grayWilma-200 bg-white px-2 text-xs font-semibold text-navy"
        defaultValue={role}
        disabled={busy}
        onChange={(event) => void mutate({ action: "change_role", role: event.target.value as PartnerUserRole })}
      >
        {roleOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
      </select>
      <button
        type="button"
        className="min-h-10 rounded-md border border-orange/40 px-3 text-xs font-bold text-orange disabled:opacity-50"
        disabled={busy}
        onClick={() => void mutate({ action: "revoke" })}
      >
        Revoke access
      </button>
      <span aria-live="polite" className="min-h-4 text-xs text-grayWilma-600">{message}</span>
    </div>
  );
}
