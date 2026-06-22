"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { internalRcapAllowanceApi } from "@/lib/partners/routes";

type RcapPartnerAllowance = {
  partnerSlug: string;
  screeningsAllowed: number;
  screeningsUsed: number;
  contractNote: string | null;
  periodLabel: string | null;
  warning: string | null;
  hasEntitlement: boolean;
};

type SaveState =
  | { kind: "idle" }
  | { kind: "saving" }
  | { kind: "saved"; message: string; warning: string | null }
  | { kind: "error"; message: string };

export function RcapAllowanceControl({
  partnerSlug,
  initialAllowance
}: {
  partnerSlug: string;
  initialAllowance: RcapPartnerAllowance | null;
}) {
  const [allowance, setAllowance] = useState<RcapPartnerAllowance | null>(initialAllowance);
  const [screeningsAllowed, setScreeningsAllowed] = useState(String(initialAllowance?.screeningsAllowed ?? 0));
  const [contractNote, setContractNote] = useState(initialAllowance?.contractNote ?? "");
  const [periodLabel, setPeriodLabel] = useState(initialAllowance?.periodLabel ?? "");
  const [saveState, setSaveState] = useState<SaveState>({ kind: "idle" });

  async function submit() {
    setSaveState({ kind: "saving" });
    try {
      const response = await fetch(internalRcapAllowanceApi(), {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          partnerSlug,
          screeningsAllowed,
          contractNote,
          periodLabel
        })
      });
      const body = await response.json() as { allowance?: RcapPartnerAllowance; error?: string };
      if (!response.ok || !body.allowance) {
        setSaveState({ kind: "error", message: body.error ?? "Allowance update failed." });
        return;
      }
      setAllowance(body.allowance);
      setScreeningsAllowed(String(body.allowance.screeningsAllowed));
      setContractNote(body.allowance.contractNote ?? "");
      setPeriodLabel(body.allowance.periodLabel ?? "");
      setSaveState({
        kind: "saved",
        message: "RCAP allowance updated.",
        warning: body.allowance.warning
      });
    } catch {
      setSaveState({ kind: "error", message: "Allowance update failed before it reached the server." });
    }
  }

  return (
    <section className="mt-8 rounded-md border border-grayWilma-200 bg-white p-6 shadow-sm">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h2 className="text-lg font-black text-navy">RCAP screening allowance</h2>
          <p className="mt-2 text-sm leading-6 text-grayWilma-700">
            Internal admins can set the contract allowance for this partner. Used count is read-only and maintained by slot claim, release, completion, and recompute jobs.
          </p>
          <p className="mt-2 text-sm leading-6 text-grayWilma-700">
            Active RCAP access still requires paid/demo_paid, qualified, and provisioned partner status. New entitlement rows default to zero allowance until ops sets a value here.
          </p>
        </div>
        <span className="inline-flex rounded-full border border-orange/30 bg-orange/10 px-3 py-1 text-xs font-black text-orange">
          Internal admin only
        </span>
      </div>

      <div className="mt-5 grid gap-3 md:grid-cols-4">
        <ReadOnlyMetric label="Allowed" value={(allowance?.screeningsAllowed ?? 0).toLocaleString()} />
        <ReadOnlyMetric label="Used" value={(allowance?.screeningsUsed ?? 0).toLocaleString()} />
        <ReadOnlyMetric label="At capacity" value={(allowance && allowance.screeningsUsed >= allowance.screeningsAllowed) ? "Yes" : "No"} />
        <ReadOnlyMetric label="Entitlement row" value={allowance?.hasEntitlement ? "Present" : "Not created"} />
      </div>

      {allowance?.warning ? (
        <p className="mt-4 rounded-md border border-orange/30 bg-orange/10 px-4 py-3 text-sm font-semibold leading-6 text-orange">
          {allowance.warning}
        </p>
      ) : null}

      <div className="mt-5 grid gap-4 lg:grid-cols-[0.7fr_1fr_0.8fr_auto] lg:items-end">
        <label className="block">
          <span className="text-sm font-black text-navy">screenings_allowed</span>
          <input
            value={screeningsAllowed}
            onChange={(event) => setScreeningsAllowed(event.target.value)}
            inputMode="numeric"
            className="mt-2 min-h-11 w-full rounded-md border border-grayWilma-200 bg-white px-3 py-2 text-sm font-semibold text-navy outline-none transition focus:border-teal focus:ring-2 focus:ring-teal/20"
          />
        </label>
        <label className="block">
          <span className="text-sm font-black text-navy">contract_note</span>
          <input
            value={contractNote}
            onChange={(event) => setContractNote(event.target.value)}
            className="mt-2 min-h-11 w-full rounded-md border border-grayWilma-200 bg-white px-3 py-2 text-sm font-semibold text-navy outline-none transition focus:border-teal focus:ring-2 focus:ring-teal/20"
          />
        </label>
        <label className="block">
          <span className="text-sm font-black text-navy">period_label</span>
          <input
            value={periodLabel}
            onChange={(event) => setPeriodLabel(event.target.value)}
            className="mt-2 min-h-11 w-full rounded-md border border-grayWilma-200 bg-white px-3 py-2 text-sm font-semibold text-navy outline-none transition focus:border-teal focus:ring-2 focus:ring-teal/20"
          />
        </label>
        <Button type="button" className="min-h-11" disabled={saveState.kind === "saving"} onClick={() => void submit()}>
          {saveState.kind === "saving" ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : null}
          Save allowance
        </Button>
      </div>

      {saveState.kind === "saved" ? (
        <p className="mt-4 rounded-md border border-teal/30 bg-teal/10 px-4 py-3 text-sm font-semibold leading-6 text-teal">
          {saveState.message}{saveState.warning ? ` ${saveState.warning}` : ""}
        </p>
      ) : null}
      {saveState.kind === "error" ? (
        <p className="mt-4 rounded-md border border-orange/30 bg-orange/10 px-4 py-3 text-sm font-semibold leading-6 text-orange">
          {saveState.message}
        </p>
      ) : null}
    </section>
  );
}

function ReadOnlyMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-grayWilma-200 bg-[#f7f8f6] p-4">
      <p className="text-xs font-black uppercase tracking-wide text-grayWilma-600">{label}</p>
      <p className="mt-2 text-lg font-black text-navy">{value}</p>
    </div>
  );
}
