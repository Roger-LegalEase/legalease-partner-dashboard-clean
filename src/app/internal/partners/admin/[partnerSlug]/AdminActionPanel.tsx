"use client";

import { useState } from "react";
import { CheckCircle2, Loader2, StickyNote } from "lucide-react";
import { Button } from "@/components/ui/Button";
import {
  type PartnerAdminAction,
  partnerAdminActionLabels
} from "@/lib/partners/admin-actions";
import { internalAdminActionApi } from "@/lib/partners/routes";
import type { PartnerAsset } from "@/lib/partners/types";

type ActionState = {
  message: string;
  persisted: boolean;
  mode?: string;
  error?: string;
} | null;

const primaryActions: PartnerAdminAction[] = [
  "mark_qualified",
  "mark_payment_complete",
  "move_to_provisioning",
  "activate_partner",
  "pause_partner"
];

const assetActions: PartnerAdminAction[] = ["mark_asset_ready", "mark_asset_active"];

export function AdminActionPanel({ partnerSlug, assets }: { partnerSlug: string; assets: PartnerAsset[] }) {
  const [pendingAction, setPendingAction] = useState<PartnerAdminAction | null>(null);
  const [selectedAssetKey, setSelectedAssetKey] = useState<string>(assets[0]?.key ?? "");
  const [note, setNote] = useState("");
  const [result, setResult] = useState<ActionState>(null);

  async function submitAction(action: PartnerAdminAction, options: { assetKey?: string; note?: string } = {}) {
    setPendingAction(action);
    setResult(null);

    try {
      const response = await fetch(internalAdminActionApi(), {
        method: "POST",
        headers: {
          "content-type": "application/json"
        },
        body: JSON.stringify({
          action,
          partnerSlug,
          assetKey: options.assetKey,
          note: options.note
        })
      });
      const body = (await response.json()) as { message?: string; error?: string; persisted?: boolean; mode?: string };

      setResult({
        message: response.ok ? body.message ?? "Write-ready action accepted." : body.error ?? "Admin action failed.",
        persisted: body.persisted ?? false,
        mode: body.mode,
        error: body.error
      });

      if (response.ok && action === "add_internal_note") {
        setNote("");
      }
    } catch {
      setResult({
        message: "Admin action request failed before it reached the server.",
        persisted: false
      });
    } finally {
      setPendingAction(null);
    }
  }

  return (
    <section className="rounded-md border border-orange/30 bg-orange/10 p-5">
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div>
          <h2 className="text-lg font-black text-navy">Write-ready admin actions</h2>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-grayWilma-800">
            If Supabase partner data is enabled, this action writes to the partner records. Otherwise it runs in safe
            fallback mode and does not persist.
          </p>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-grayWilma-800">
            Mark Payment Complete records paid state for internal operations only. Stripe Checkout payment IDs are recorded by webhook confirmation.
          </p>
        </div>
        <span className="inline-flex rounded-full border border-orange/30 bg-white px-3 py-1 text-xs font-black text-orange">
          Supabase write-ready
        </span>
      </div>

      <div className="mt-5 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
        {primaryActions.map((action) => (
          <Button
            key={action}
            type="button"
            variant={action === "pause_partner" ? "warning" : "secondary"}
            className="min-h-11"
            disabled={pendingAction !== null}
            onClick={() => void submitAction(action)}
          >
            {pendingAction === action ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : null}
            {partnerAdminActionLabels[action]}
          </Button>
        ))}
      </div>

      <div className="mt-5 grid gap-3 lg:grid-cols-[1fr_auto]">
        <label className="block">
          <span className="text-sm font-black text-navy">Asset action target</span>
          <select
            value={selectedAssetKey}
            onChange={(event) => setSelectedAssetKey(event.target.value)}
            className="mt-2 min-h-11 w-full rounded-md border border-grayWilma-200 bg-white px-3 py-2 text-sm font-semibold text-navy outline-none transition focus:border-teal focus:ring-2 focus:ring-teal/20"
          >
            {assets.map((asset) => (
              <option key={asset.key} value={asset.key}>
                {asset.label} ({asset.status})
              </option>
            ))}
          </select>
        </label>
        <div className="grid gap-2 sm:grid-cols-2 lg:self-end">
          {assetActions.map((action) => (
            <Button
              key={action}
              type="button"
              variant="secondary"
              className="min-h-11"
              disabled={pendingAction !== null || !selectedAssetKey}
              onClick={() => void submitAction(action, { assetKey: selectedAssetKey })}
            >
              {pendingAction === action ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : null}
              {partnerAdminActionLabels[action]}
            </Button>
          ))}
        </div>
      </div>

      <div className="mt-5 grid gap-3 lg:grid-cols-[1fr_auto]">
        <label className="block">
          <span className="text-sm font-black text-navy">Internal note</span>
          <textarea
            value={note}
            onChange={(event) => setNote(event.target.value)}
            rows={3}
            className="mt-2 w-full rounded-md border border-grayWilma-200 bg-white px-3 py-2 text-sm text-navy outline-none transition focus:border-teal focus:ring-2 focus:ring-teal/20"
            placeholder="Internal write-ready note"
          />
        </label>
        <Button
          type="button"
          className="min-h-11 self-end"
          disabled={pendingAction !== null || note.trim().length === 0}
          onClick={() => void submitAction("add_internal_note", { note: note.trim() })}
        >
          {pendingAction === "add_internal_note" ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <StickyNote className="h-4 w-4" aria-hidden="true" />}
          Add Internal Note
        </Button>
      </div>

      {result ? (
        <div className="mt-4 flex items-start gap-2 rounded-md border border-teal/30 bg-white px-3 py-3 text-sm font-semibold text-grayWilma-800">
          <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-teal" aria-hidden="true" />
          <span>
            {result.message} Persisted: {String(result.persisted)}.
            {result.mode ? ` Mode: ${result.mode}.` : ""}
            {result.error ? ` Error: ${result.error}` : ""}
          </span>
        </div>
      ) : null}
    </section>
  );
}
