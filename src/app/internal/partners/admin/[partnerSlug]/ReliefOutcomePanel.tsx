"use client";

import { useState } from "react";
import { CheckCircle2, Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { internalRcapReliefOutcomeApi } from "@/lib/partners/routes";
import type { RcapReliefOutcomeAdminRow } from "@/lib/rcap/documents/source-repository";
import { type RcapReliefOutcome, rcapReliefOutcomeValues } from "@/lib/rcap/documents/types";

type ResultState = {
  message: string;
  error?: string;
} | null;

export function ReliefOutcomePanel({ partnerSlug, packets }: { partnerSlug: string; packets: RcapReliefOutcomeAdminRow[] }) {
  const [rows, setRows] = useState(packets);
  const [pendingPacketId, setPendingPacketId] = useState<string | null>(null);
  const [result, setResult] = useState<ResultState>(null);

  async function setOutcome(packetId: string, reliefOutcome: RcapReliefOutcome) {
    setPendingPacketId(packetId);
    setResult(null);
    try {
      const response = await fetch(internalRcapReliefOutcomeApi(packetId), {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ partnerSlug, reliefOutcome })
      });
      const body = (await response.json()) as { success?: boolean; changed?: boolean; packet?: RcapReliefOutcomeAdminRow; error?: string };
      if (!response.ok || !body.success || !body.packet) {
        setResult({ message: "Relief outcome update failed.", error: body.error });
        return;
      }

      setRows((current) => current.map((row) => (row.id === packetId ? body.packet as RcapReliefOutcomeAdminRow : row)));
      setResult({ message: body.changed ? "Relief outcome updated and audit-triggered." : "Relief outcome already matched." });
    } catch {
      setResult({ message: "Relief outcome request failed before it reached the server." });
    } finally {
      setPendingPacketId(null);
    }
  }

  return (
    <section className="mt-8 rounded-md border border-grayWilma-200 bg-white p-6 shadow-sm">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-lg font-black text-navy">RCAP relief outcomes</h2>
          <p className="mt-2 text-sm leading-6 text-grayWilma-700">
            Internal outcome setting for impact reporting. Each changed value is audited by the database trigger.
          </p>
        </div>
        <Badge tone="teal">Verifiable outcomes</Badge>
      </div>

      <div className="mt-5 grid gap-3">
        {rows.length > 0 ? rows.map((packet) => (
          <div key={packet.id} className="grid gap-3 rounded-md bg-[#f7f8f6] p-3 lg:grid-cols-[1fr_220px_auto] lg:items-center">
            <div>
              <p className="text-sm font-black text-navy">{packet.state}{packet.county ? ` · ${packet.county}` : ""}</p>
              <p className="mt-1 text-xs font-semibold text-grayWilma-600">
                {packet.status.replaceAll("_", " ")} · {packet.id}
              </p>
            </div>
            <label className="block">
              <span className="sr-only">Relief outcome</span>
              <select
                value={packet.reliefOutcome}
                onChange={(event) => void setOutcome(packet.id, event.target.value as RcapReliefOutcome)}
                disabled={pendingPacketId !== null}
                className="min-h-11 w-full rounded-md border border-grayWilma-200 bg-white px-3 py-2 text-sm font-semibold text-navy outline-none transition focus:border-teal focus:ring-2 focus:ring-teal/20"
              >
                {rcapReliefOutcomeValues.map((outcome) => (
                  <option key={outcome} value={outcome}>{reliefOutcomeLabel(outcome)}</option>
                ))}
              </select>
            </label>
            <Button
              type="button"
              variant="secondary"
              className="min-h-11"
              disabled
            >
              {pendingPacketId === packet.id ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : null}
              {reliefOutcomeLabel(packet.reliefOutcome)}
            </Button>
          </div>
        )) : (
          <p className="text-sm font-semibold text-grayWilma-600">No document packets are available for outcome tracking yet.</p>
        )}
      </div>

      {result ? (
        <div className="mt-4 flex items-start gap-2 rounded-md border border-teal/30 bg-white px-3 py-3 text-sm font-semibold text-grayWilma-800">
          <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-teal" aria-hidden="true" />
          <span>{result.message}{result.error ? ` Error: ${result.error}` : ""}</span>
        </div>
      ) : null}
    </section>
  );
}

function reliefOutcomeLabel(outcome: RcapReliefOutcome) {
  const labels: Record<RcapReliefOutcome, string> = {
    not_recorded: "Not recorded",
    filed_pending: "Filed pending",
    relief_granted: "Relief granted",
    relief_partially_granted: "Partial relief granted",
    relief_denied: "Relief denied",
    relief_unavailable: "Relief unavailable",
    withdrawn: "Withdrawn"
  };

  return labels[outcome];
}
