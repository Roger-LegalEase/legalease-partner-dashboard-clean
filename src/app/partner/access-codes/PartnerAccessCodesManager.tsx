"use client";

import Link from "next/link";
import { LocalizedRuntimeText as T } from "@/components/expungement-ai/LocalizationProvider";
import { cloneElement, isValidElement, useId, useRef, useState } from "react";
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

export function PartnerAccessCodesManager({
  partnerSlug,
  initialAnalytics,
  program
}: {
  partnerSlug: string;
  initialAnalytics: PartnerAccessCodeAnalytics | null;
  program?: { accessMode: PartnerAccessMode; live: boolean; settingsHref: string };
}) {
  const [analytics, setAnalytics] = useState<PartnerAccessCodeAnalytics | null>(initialAnalytics);
  const [mode, setMode] = useState<PartnerAccessMode>(initialAnalytics?.accessMode ?? "open");
  const [message, setMessage] = useState<{ tone: "ok" | "error"; text: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [createdCode, setCreatedCode] = useState("");

  const codes = analytics?.codes ?? [];
  const inFlight = useRef(false);

  async function refresh() {
    const res = await fetch(`/api/partners/access-codes?partnerSlug=${encodeURIComponent(partnerSlug)}`, { method: "GET" });
    if (!res.ok) throw new Error("The saved code list could not be reloaded. Reload this page to check the current records.");
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
    if (inFlight.current) return false;
    inFlight.current = true;
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
      setCreatedCode(form.code);
      setMessage({ tone: "ok", text: data.code?.reused ? "This matching access code is already saved. No second code was created." : "Access code created." });
      try { await refresh(); } catch { setMessage({ tone: "error", text: "Code saved. The list could not be refreshed; reload to see the current records." }); }
      return true;
    } catch (error) {
      setMessage({ tone: "error", text: error instanceof Error ? error.message : "Code creation could not be confirmed. Your entries are preserved. Reload the code list before retrying." });
      return false;
    } finally {
      inFlight.current = false;
      setBusy(false);
    }
  }

  async function toggleCode(code: PartnerAccessCodeView) {
    if (inFlight.current) return;
    inFlight.current = true;
    setBusy(true);
    setMessage(null);
    try {
      const res = await fetch("/api/partners/access-codes/toggle", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ partnerSlug, codeId: code.id, isActive: !code.isActive })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Could not update the code.");
      setMessage({ tone: "ok", text: code.isActive ? "Code disabled." : "Code reactivated." });
      try { await refresh(); } catch { setMessage({ tone: "error", text: "Code updated. Reload to check the current list." }); }
    } catch (error) {
      setMessage({ tone: "error", text: error instanceof Error ? error.message : "Could not update the code." });
    } finally {
      inFlight.current = false;
      setBusy(false);
    }
  }

  return (
    <div className="space-y-6">
      {createdCode ? <div className="rounded border bg-white p-4"><p><T text="Saved access code:" /> <code className="select-all break-all font-bold">{createdCode}</code></p><p className="mt-2 text-sm"><T text="Copy it before leaving. Entry remains subject to the published program, schedule and use limit." /></p><button type="button" className="min-h-11 underline" onClick={async () => { try { await navigator.clipboard.writeText(createdCode); setMessage({tone:"ok",text:"Code copied."}); } catch { setMessage({tone:"error",text:"Select the saved code above and copy it."}); } }}><T text="Copy code" /></button></div> : null}
      {message ? (
        <p role={message.tone === "error" ? "alert" : "status"}
          className={`rounded-md px-4 py-3 text-sm font-semibold ${
            message.tone === "ok" ? "bg-[#E7F7F0] text-[#0F6E56]" : "bg-[#FDF1E8] text-[#9A3412]"
          }`}
        >
          <T text={message.text} />
        </p>
      ) : null}

      <section className="rounded-lg border border-[#EEE6DB] bg-white p-6">
        <h2 className="text-lg font-black"><T text="Screening capacity" /></h2>
        <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-3">
          <Stat label="Screening allowance" value={analytics?.capacityAvailable ? String(analytics.packetCap) : "Unavailable"} />
          <Stat label="Screenings used" value={analytics?.capacityAvailable ? String(analytics.packetsUsed) : "Unavailable"} />
          <Stat label="Screenings remaining" value={analytics?.capacityAvailable ? String(analytics.remainingBalance) : "Unavailable"} />
        </div>
        <p className="mt-4 text-sm"><T text="These counts come from the screening allocation. Access codes do not grant packet credits or authorize additional charges." /></p>
      </section>

      {program ? <section className="rounded-lg border bg-white p-6"><h2 className="text-lg font-bold"><T text="Participant access" /></h2><p className="mt-2">{<T text={MODE_OPTIONS.find(option => option.value === program.accessMode)?.label ?? "Participant access"} />}</p><p className="mt-2">{<T text={program.live ? "Codes follow this program’s published access settings." : "This program is not open to participants. Codes cannot grant entry until the program is authorized and started."} />}</p><Link className="mt-3 inline-flex min-h-11 items-center underline" href={program.settingsHref}><T text="Review program settings" /></Link></section> : <section className="rounded-lg border border-[#EEE6DB] bg-white p-6">
        <h2 className="text-lg font-black"><T text="Require codes for this partner page" /></h2>
        <p className="mt-1 text-sm text-[#5C5750]"><T text="Choose how people join your program." /></p>
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
              <span className="block text-sm font-black"><T text={option.label} /></span>
              <span className="mt-1 block text-xs leading-5 text-[#6B625B]"><T text={option.help} /></span>
            </button>
          ))}
        </div>
      </section>}

      {/* Create code */}
      {(!program || program.accessMode !== "open") && analytics ? <CreateCodeForm busy={busy} onCreate={createCode} /> : <p className="rounded border p-4">{<T text={analytics ? "Open access does not require codes. Change participant access in Program settings before creating codes." : "Code records are unavailable. Reload this page before creating a code."} />}</p>}

      {/* Codes list */}
      <section className="rounded-lg border border-[#EEE6DB] bg-white p-6">
        <h2 className="text-lg font-black"><T text="Your access codes" /></h2>
        {codes.length === 0 ? (
          <p className="mt-3 text-sm text-[#6B625B]"><T text="You haven’t created any codes yet." /></p>
        ) : (
          <div className="mt-4 grid gap-4 lg:grid-cols-2">
            {codes.map(code => <article key={code.id} className="min-w-0 rounded-lg border p-4">
              <h3 className="break-words font-bold">{code.campaignName || <T text="Access Code" />} · <code>{code.displayHint ?? "••••"}</code></h3>
              <dl className="mt-3 grid grid-cols-2 gap-3 text-sm">
                <div><dt className="font-bold"><T text="Type" /></dt><dd><T text={typeLabel(code)} /></dd></div>
                <div><dt className="font-bold"><T text="Uses" /></dt><dd>{code.maxUses ? `${code.usesCount} / ${code.maxUses}` : code.usesCount}</dd></div>
                <div><dt className="font-bold"><T text="Enabled" /></dt><dd><T text={code.isActive ? "Yes" : "No"} /></dd></div>
                <div><dt className="font-bold"><T text="Starts" /></dt><dd>{formatDate(code.startsAt)}</dd></div>
                <div className="col-span-2"><dt className="font-bold"><T text="Expires" /></dt><dd>{formatDate(code.expiresAt)}</dd></div>
              </dl>
              <p className="mt-3 text-sm"><T text="Entry also requires a live program, current schedule and remaining uses." /></p>
              <button type="button" disabled={busy} onClick={() => toggleCode(code)} className="mt-3 min-h-11 rounded-md border px-3 py-2 font-bold"><T text={code.isActive ? "Disable Code" : "Reactivate"} /></button>
              <details className="mt-3"><summary className="min-h-11 cursor-pointer py-3 font-bold"><T text="Code usage" /></summary>
                <dl className="grid grid-cols-2 gap-3 text-sm">{Object.entries({"Screenings Started":code.screeningsStarted,"Completed":code.screeningsCompleted,"Eligible":code.eligiblePackets,"Guidance Only":code.guidanceOnly,"Packets Generated":code.packetsGenerated,"Packet Credits Used":code.packetCreditsUsed,"Overage":code.overagePackets,"Conversion":formatPercent(code.conversionRate)}).map(([label,value]) => <div key={label}><dt><T text={label}/></dt><dd className="font-bold">{value}</dd></div>)}</dl>
              </details>
            </article>)}
          </div>
        )}
        {analytics && hasDirectActivity(analytics.directAttribution) ? (
          <p className="mt-4 text-xs leading-5 text-[#6B625B]"> <T text="Direct partner page (no code):" /> {analytics.directAttribution.screeningsStarted} <T text="started," />{" "}
            {analytics.directAttribution.screeningsCompleted} <T text="completed," />{" "}
            {analytics.directAttribution.packetsGenerated} <T text="packets generated," />{" "}
            {analytics.directAttribution.overagePackets} <T text="overage." /> </p>
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
};

function CreateCodeForm({ busy, onCreate }: { busy: boolean; onCreate: (fields: CreateCodeFields) => Promise<boolean> }) {
  const [code, setCode] = useState("");
  const [campaignName, setCampaignName] = useState("");
  const [description, setDescription] = useState("");
  const [codeType, setCodeType] = useState<PartnerAccessCodeType>("shared");
  const [maxUses, setMaxUses] = useState("");
  const [expiresAt, setExpiresAt] = useState("");

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    const saved = await onCreate({
      code,
      campaignName,
      description,
      codeType,
      maxUses: codeType === "limited_use" && maxUses ? Number(maxUses) : null,
      expiresAt: expiresAt ? new Date(expiresAt).toISOString() : null
    });
    if (!saved) return;
    setCode("");
    setCampaignName("");
    setDescription("");
    setMaxUses("");
    setExpiresAt("");
    setCodeType("shared");
  }

  return (
    <section className="rounded-lg border border-[#EEE6DB] bg-white p-6">
      <h2 className="text-lg font-black"><T text="Create Code" /></h2>
      <form onSubmit={submit}><fieldset disabled={busy} className="mt-4 grid gap-4 sm:grid-cols-2">
        <Field label="Access Code">
          <input
            value={code}
            onChange={(e) => setCode(e.target.value)}
            required
            placeholder="e.g. FRESHSTART"
            className="min-h-11 w-full rounded-md border border-[#D7DEE8] px-3 py-2 text-sm uppercase"
          />
        </Field>
        <Field label="Campaign">
          <input
            value={campaignName}
            onChange={(e) => setCampaignName(e.target.value)}
            placeholder="e.g. July clinic"
            className="min-h-11 w-full rounded-md border border-[#D7DEE8] px-3 py-2 text-sm"
          />
        </Field>
        <Field label="Type">
          <select
            value={codeType}
            onChange={(e) => setCodeType(e.target.value as PartnerAccessCodeType)}
            className="min-h-11 w-full rounded-md border border-[#D7DEE8] px-3 py-2 text-sm"
          >
            {TYPE_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                <T text={option.label} />
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
              className="min-h-11 w-full rounded-md border border-[#D7DEE8] px-3 py-2 text-sm"
            />
          </Field>
        ) : (
          <div />
        )}
        <Field label="Expires (optional)">
          <input
            type="date"
            aria-describedby="code-expiry-help"
            value={expiresAt}
            onChange={(e) => setExpiresAt(e.target.value)}
            className="min-h-11 w-full rounded-md border border-[#D7DEE8] px-3 py-2 text-sm"
          />
        </Field>
        <p id="code-expiry-help" className="text-sm"><T text="The code expires at 00:00 UTC on the selected date." /></p>
        <Field label="Notes (optional)">
          <input
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Internal note"
            className="min-h-11 w-full rounded-md border border-[#D7DEE8] px-3 py-2 text-sm"
          />
        </Field>
        <div className="sm:col-span-2">
          <button
            type="submit"
            disabled={busy}
            className="rounded-md bg-[#D85A30] px-5 py-2.5 text-sm font-black text-white hover:bg-[#BF4B25] disabled:opacity-60"
          >
            <T text={busy ? "Saving code…" : "Create Code"} />
          </button>
        </div>
      </fieldset></form>
    </section>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-[#F0ECE3] bg-[#FBF7F2] px-3 py-3">
      <div className="text-[11px] font-bold uppercase tracking-wide text-[#6B625B]"><T text={label} /></div>
      <div className="mt-1 text-xl font-black">{value}</div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  const labelId = useId();
  return (
    <label className="block">
      <span id={labelId} className="mb-1 block text-xs font-black uppercase tracking-wide text-[#6B625B]"><T text={label} /></span>
      {isValidElement(children) ? cloneElement(children as React.ReactElement<{ "aria-labelledby"?: string }>, { "aria-labelledby": labelId }) : children}
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
  return date.toISOString().slice(0, 16).replace("T", " ") + " UTC";
}
