"use client";

import { useState } from "react";
import type {
  PartnerAccessCodeAnalytics,
  PartnerAccessCodeType,
  PartnerAccessCodeView,
  PartnerAccessMode
} from "@/lib/partners/partner-access-codes";

const MODE_OPTIONS: Array<{ value: PartnerAccessMode; label: string; help: string }> = [
  { value: "open", label: "No code required", help: "Anyone who enters through your page joins your program." },
  { value: "optional_code", label: "Code optional", help: "People can enter a code, but it isn't required to join." },
  { value: "required_code", label: "Require a code", help: "Only people with a valid code join your program; everyone else uses the standard experience." },
  { value: "invite_only", label: "Invite only", help: "Each code works a limited number of times (great for single-use invitations)." }
];

const TYPE_OPTIONS: Array<{ value: PartnerAccessCodeType; label: string }> = [
  { value: "shared", label: "Shared (unlimited uses)" },
  { value: "limited_use", label: "Limited uses" },
  { value: "single_use", label: "Single use" }
];

function centsToDollars(cents: number): string {
  return `$${(cents / 100).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
}

export function PartnerAccessCodesManager({
  partnerSlug,
  initialAnalytics
}: {
  partnerSlug: string;
  initialAnalytics: PartnerAccessCodeAnalytics | null;
}) {
  const [analytics, setAnalytics] = useState<PartnerAccessCodeAnalytics | null>(initialAnalytics);
  const [mode, setMode] = useState<PartnerAccessMode>(initialAnalytics?.accessMode ?? "open");
  const [message, setMessage] = useState<{ tone: "ok" | "error"; text: string } | null>(null);
  const [busy, setBusy] = useState(false);

  const codes = analytics?.codes ?? [];

  async function refresh() {
    const res = await fetch(`/api/partners/access-codes?partnerSlug=${encodeURIComponent(partnerSlug)}`, { method: "GET" });
    if (res.ok) {
      const data = await res.json();
      setAnalytics(data.analytics);
      setMode(data.analytics.accessMode);
    }
  }

  async function saveMode(next: PartnerAccessMode) {
    setBusy(true);
    setMessage(null);
    setMode(next);
    try {
      const res = await fetch("/api/partners/access-mode", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ partnerSlug, accessMode: next })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Could not update.");
      setMessage({ tone: "ok", text: "Access setting saved." });
    } catch (error) {
      setMessage({ tone: "error", text: error instanceof Error ? error.message : "Could not update." });
    } finally {
      setBusy(false);
    }
  }

  async function createCode(form: CreateCodeFields) {
    setBusy(true);
    setMessage(null);
    try {
      const res = await fetch("/api/partners/access-codes", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ partnerSlug, ...form })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Could not create the code.");
      setMessage({ tone: "ok", text: "Access code saved as a draft. Activate it after launch approval." });
      await refresh();
    } catch (error) {
      setMessage({ tone: "error", text: error instanceof Error ? error.message : "Could not create the code." });
    } finally {
      setBusy(false);
    }
  }

  async function changeCodeLifecycle(code: PartnerAccessCodeView, lifecycleStatus: "live" | "paused" | "revoked") {
    setBusy(true);
    setMessage(null);
    try {
      const res = await fetch("/api/partners/access-codes/toggle", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ partnerSlug, codeId: code.id, isActive: lifecycleStatus === "live", lifecycleStatus })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Could not update the code.");
      await refresh();
    } catch (error) {
      setMessage({ tone: "error", text: error instanceof Error ? error.message : "Could not update the code." });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-6">
      {message ? (
        <p
          className={`rounded-md px-4 py-3 text-sm font-semibold ${
            message.tone === "ok" ? "bg-[#E7F7F0] text-[#0F6E56]" : "bg-[#FDF1E8] text-[#9A3412]"
          }`}
        >
          {message.text}
        </p>
      ) : null}

      {/* Usage summary */}
      <section className="rounded-lg border border-[#EEE6DB] bg-white p-6">
        <h2 className="text-lg font-black">Packet usage</h2>
        <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
          <Stat label="Packets available" value={analytics ? String(analytics.packetCap) : "Not available"} />
          <Stat label="Packets used" value={analytics ? String(analytics.packetsUsed) : "Not available"} />
          <Stat label="Packets remaining" value={analytics ? String(analytics.remainingBalance) : "Not available"} />
          <Stat label="Additional packets" value={analytics ? String(analytics.overagePackets) : "Not available"} />
          <Stat label="Additional packet cost" value={analytics ? centsToDollars(analytics.overageAmountCents) : "Not available"} />
        </div>
        <p className="mt-4 text-xs leading-5 text-[#8A8278]">
          After your included packet allocation is used, additional successfully generated packets are billed at{" "}
          {analytics ? centsToDollars(analytics.overagePacketPriceCents) : "$50"} per packet unless your
          organization has chosen to pause sponsored packet generation at the cap.
        </p>
      </section>

      {/* Access mode */}
      <section className="rounded-lg border border-[#EEE6DB] bg-white p-6">
        <h2 className="text-lg font-black">Require codes for this partner page</h2>
        <p className="mt-1 text-sm text-[#5C5750]">Choose how people join your program.</p>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          {MODE_OPTIONS.map((option) => (
            <button
              key={option.value}
              type="button"
              disabled={busy}
              onClick={() => saveMode(option.value)}
              className={`rounded-md border p-4 text-left transition ${
                mode === option.value
                  ? "border-[#1D9E75] bg-[#E7F7F0]"
                  : "border-[#EEE6DB] bg-white hover:border-[#CBD5E1]"
              }`}
            >
              <span className="block text-sm font-black">{option.label}</span>
              <span className="mt-1 block text-xs leading-5 text-[#8A8278]">{option.help}</span>
            </button>
          ))}
        </div>
      </section>

      {/* Create code */}
      <CreateCodeForm busy={busy} onCreate={createCode} />

      {/* Codes list */}
      <section className="rounded-lg border border-[#EEE6DB] bg-white p-6">
        <h2 className="text-lg font-black">Your access codes</h2>
        {codes.length === 0 ? (
          <p className="mt-3 text-sm text-[#8A8278]">You haven&rsquo;t created any codes yet.</p>
        ) : (
          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[1080px] text-left text-sm">
              <thead>
                <tr className="border-b border-[#EEE6DB] text-xs font-black uppercase tracking-wide text-[#8A8278]">
                  <th className="py-2 pr-3">Access Code</th>
                  <th className="py-2 pr-3">Campaign</th>
                  <th className="py-2 pr-3">Type</th>
                  <th className="py-2 pr-3">Uses</th>
                  <th className="py-2 pr-3">Screenings Started</th>
                  <th className="py-2 pr-3">Completed</th>
                  <th className="py-2 pr-3">Eligible</th>
                  <th className="py-2 pr-3">Guidance Only</th>
                  <th className="py-2 pr-3">Packets Generated</th>
                  <th className="py-2 pr-3">Packet Credits Used</th>
                  <th className="py-2 pr-3">Overage</th>
                  <th className="py-2 pr-3">Conversion</th>
                  <th className="py-2 pr-3">Scope</th>
                  <th className="py-2 pr-3">Status</th>
                  <th className="py-2 pr-3">Expires</th>
                  <th className="py-2 pr-3" />
                </tr>
              </thead>
              <tbody>
                {codes.map((code) => (
                  <tr key={code.id} className="border-b border-[#F3EEE5]">
                    <td className="py-2.5 pr-3 font-mono text-[13px]">{code.displayHint ?? "••••"}</td>
                    <td className="py-2.5 pr-3">{code.campaignName ?? "—"}</td>
                    <td className="py-2.5 pr-3">{typeLabel(code)}</td>
                    <td className="py-2.5 pr-3">{code.maxUses ? `${code.usesCount} / ${code.maxUses}` : code.usesCount}</td>
                    <td className="py-2.5 pr-3">{code.screeningsStarted}</td>
                    <td className="py-2.5 pr-3">{code.screeningsCompleted}</td>
                    <td className="py-2.5 pr-3">{code.eligiblePackets}</td>
                    <td className="py-2.5 pr-3">{code.guidanceOnly}</td>
                    <td className="py-2.5 pr-3">{code.packetsGenerated}</td>
                    <td className="py-2.5 pr-3">{code.packetCreditsUsed}</td>
                    <td className="py-2.5 pr-3">{code.overagePackets}</td>
                    <td className="py-2.5 pr-3">{formatPercent(code.conversionRate)}</td>
                    <td className="py-2.5 pr-3">{formatScope(code)}</td>
                    <td className="py-2.5 pr-3">{formatLifecycle(code.lifecycleStatus)}</td>
                    <td className="py-2.5 pr-3">{formatDate(code.expiresAt)}</td>
                    <td className="py-2.5 pr-3">
                      <div className="flex gap-2">
                        {code.lifecycleStatus !== "revoked" ? (
                          <button
                            type="button"
                            disabled={busy}
                            onClick={() => changeCodeLifecycle(code, code.isActive ? "paused" : "live")}
                            className="rounded-md border border-[#D7DEE8] px-3 py-1.5 text-xs font-bold hover:border-[#CBD5E1]"
                          >
                            {code.isActive ? "Pause code" : "Activate code"}
                          </button>
                        ) : null}
                        {code.lifecycleStatus !== "revoked" ? (
                          <button
                            type="button"
                            disabled={busy}
                            onClick={() => changeCodeLifecycle(code, "revoked")}
                            className="rounded-md border border-[#F0B7A2] px-3 py-1.5 text-xs font-bold text-[#9A3412]"
                          >
                            Revoke
                          </button>
                        ) : null}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {analytics && hasDirectActivity(analytics.directAttribution) ? (
          <p className="mt-4 text-xs leading-5 text-[#8A8278]">
            Direct partner page (no code): {analytics.directAttribution.screeningsStarted} started,{" "}
            {analytics.directAttribution.screeningsCompleted} completed,{" "}
            {analytics.directAttribution.packetsGenerated} packets generated,{" "}
            {analytics.directAttribution.overagePackets} overage.
          </p>
        ) : null}
      </section>
    </div>
  );
}

type CreateCodeFields = {
  code: string;
  campaignName: string;
  description: string;
  codeType: PartnerAccessCodeType;
  maxUses: number | null;
  expiresAt: string | null;
  jurisdictions: string[];
  programId: string | null;
  eventId: string | null;
};

function CreateCodeForm({ busy, onCreate }: { busy: boolean; onCreate: (fields: CreateCodeFields) => void }) {
  const [code, setCode] = useState("");
  const [campaignName, setCampaignName] = useState("");
  const [description, setDescription] = useState("");
  const [codeType, setCodeType] = useState<PartnerAccessCodeType>("shared");
  const [maxUses, setMaxUses] = useState("");
  const [expiresAt, setExpiresAt] = useState("");
  const [jurisdictions, setJurisdictions] = useState("");
  const [programId, setProgramId] = useState("");
  const [eventId, setEventId] = useState("");

  function submit(event: React.FormEvent) {
    event.preventDefault();
    onCreate({
      code,
      campaignName,
      description,
      codeType,
      maxUses: codeType === "limited_use" && maxUses ? Number(maxUses) : null,
      expiresAt: expiresAt ? new Date(expiresAt).toISOString() : null,
      jurisdictions: jurisdictions.split(",").map((value) => value.trim().toUpperCase()).filter(Boolean),
      programId: programId.trim() || null,
      eventId: eventId.trim() || null
    });
    setCode("");
    setCampaignName("");
    setDescription("");
    setMaxUses("");
    setExpiresAt("");
    setCodeType("shared");
    setJurisdictions("");
    setProgramId("");
    setEventId("");
  }

  return (
    <section className="rounded-lg border border-[#EEE6DB] bg-white p-6">
      <h2 className="text-lg font-black">Create Code</h2>
      <form onSubmit={submit} className="mt-4 grid gap-4 sm:grid-cols-2">
        <Field label="Access Code">
          <input
            value={code}
            onChange={(e) => setCode(e.target.value)}
            required
            placeholder="e.g. FRESHSTART"
            className="w-full rounded-md border border-[#D7DEE8] px-3 py-2 text-sm uppercase"
          />
        </Field>
        <Field label="Campaign">
          <input
            value={campaignName}
            onChange={(e) => setCampaignName(e.target.value)}
            placeholder="e.g. July clinic"
            className="w-full rounded-md border border-[#D7DEE8] px-3 py-2 text-sm"
          />
        </Field>
        <Field label="Type">
          <select
            value={codeType}
            onChange={(e) => setCodeType(e.target.value as PartnerAccessCodeType)}
            className="w-full rounded-md border border-[#D7DEE8] px-3 py-2 text-sm"
          >
            {TYPE_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </Field>
        {codeType === "limited_use" ? (
          <Field label="Uses allowed">
            <input
              value={maxUses}
              onChange={(e) => setMaxUses(e.target.value.replace(/[^0-9]/g, ""))}
              inputMode="numeric"
              placeholder="e.g. 25"
              className="w-full rounded-md border border-[#D7DEE8] px-3 py-2 text-sm"
            />
          </Field>
        ) : (
          <div />
        )}
        <Field label="Expires (optional)">
          <input
            type="date"
            value={expiresAt}
            onChange={(e) => setExpiresAt(e.target.value)}
            className="w-full rounded-md border border-[#D7DEE8] px-3 py-2 text-sm"
          />
        </Field>
        <Field label="State / jurisdiction scope (optional)">
          <input
            value={jurisdictions}
            onChange={(e) => setJurisdictions(e.target.value.toUpperCase())}
            placeholder="e.g. DC, MD, VA"
            className="w-full rounded-md border border-[#D7DEE8] px-3 py-2 text-sm uppercase"
          />
        </Field>
        <Field label="Program key (optional)">
          <input
            value={programId}
            onChange={(e) => setProgramId(e.target.value)}
            placeholder="e.g. record-clearing"
            maxLength={120}
            className="w-full rounded-md border border-[#D7DEE8] px-3 py-2 text-sm"
          />
        </Field>
        <Field label="Clinic event ID (optional)">
          <input
            value={eventId}
            onChange={(e) => setEventId(e.target.value)}
            placeholder="Clinic event reference"
            className="w-full rounded-md border border-[#D7DEE8] px-3 py-2 text-sm"
          />
        </Field>
        <Field label="Notes (optional)">
          <input
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Internal note"
            className="w-full rounded-md border border-[#D7DEE8] px-3 py-2 text-sm"
          />
        </Field>
        <div className="sm:col-span-2">
          <button
            type="submit"
            disabled={busy}
            className="rounded-md bg-[#D85A30] px-5 py-2.5 text-sm font-black text-white hover:bg-[#BF4B25] disabled:opacity-60"
          >
            Create Code
          </button>
        </div>
      </form>
    </section>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-[#F0ECE3] bg-[#FBF7F2] px-3 py-3">
      <div className="text-[11px] font-bold uppercase tracking-wide text-[#9A9288]">{label}</div>
      <div className="mt-1 text-xl font-black">{value}</div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-black uppercase tracking-wide text-[#8A8278]">{label}</span>
      {children}
    </label>
  );
}

function typeLabel(code: PartnerAccessCodeView): string {
  if (code.codeType === "single_use") return "Single use";
  if (code.codeType === "limited_use") return "Limited";
  return "Shared";
}

function formatPercent(rate: number): string {
  return `${Math.round(rate * 100)}%`;
}

function hasDirectActivity(row: { screeningsStarted: number; packetsGenerated: number }): boolean {
  return row.screeningsStarted > 0 || row.packetsGenerated > 0;
}

function formatDate(value: string | null): string {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString();
}

function formatLifecycle(value: PartnerAccessCodeView["lifecycleStatus"]) {
  return value.charAt(0).toUpperCase() + value.slice(1).replaceAll("_", " ");
}

function formatScope(code: PartnerAccessCodeView) {
  const parts = [
    code.programId ? `Program: ${code.programId}` : null,
    code.eventId ? `Event: ${code.eventId.slice(0, 8)}` : null,
    code.jurisdictions.length > 0 ? code.jurisdictions.join(", ") : null
  ].filter(Boolean);
  return parts.length > 0 ? parts.join(" · ") : "Program-wide";
}
