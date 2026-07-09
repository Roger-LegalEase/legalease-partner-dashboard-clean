"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

const ORG_TYPES = [
  ["nonprofit", "Nonprofit"],
  ["legal_aid", "Legal aid"],
  ["workforce", "Workforce"],
  ["reentry", "Reentry"],
  ["city", "City / county"],
  ["funder", "Funder"],
  ["other", "Other"]
] as const;

export function NewPartnerForm() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fields, setFields] = useState({
    organizationName: "",
    partnerSlug: "",
    publicDisplayName: "",
    website: "",
    organizationType: "nonprofit",
    primaryContactName: "",
    primaryContactEmail: "",
    primaryContactPhone: "",
    targetState: "",
    targetCounty: "",
    programDescription: "",
    internalNotes: ""
  });

  function set<K extends keyof typeof fields>(key: K, value: string) {
    setFields((f) => ({ ...f, [key]: value }));
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/internal/partners/onboarding", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(fields)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Could not create the partner.");
      router.push(`/internal/partners/onboarding/${data.onboarding.partnerSlug}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not create the partner.");
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="rounded-lg border border-[#EEE6DB] bg-white p-6">
      {error ? <p className="mb-4 rounded-md bg-[#FDF1E8] px-4 py-3 text-sm text-[#9A3412]">{error}</p> : null}
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Organization name" required>
          <input required value={fields.organizationName} onChange={(e) => set("organizationName", e.target.value)} className="input" />
        </Field>
        <Field label="Page address" hint="Powers your public page: /p/your-address">
          <input required value={fields.partnerSlug} onChange={(e) => set("partnerSlug", e.target.value.toLowerCase())} placeholder="we-must-vote" className="input" />
        </Field>
        <Field label="Public display name">
          <input value={fields.publicDisplayName} onChange={(e) => set("publicDisplayName", e.target.value)} className="input" />
        </Field>
        <Field label="Website">
          <input value={fields.website} onChange={(e) => set("website", e.target.value)} className="input" />
        </Field>
        <Field label="Organization type">
          <select value={fields.organizationType} onChange={(e) => set("organizationType", e.target.value)} className="input">
            {ORG_TYPES.map(([v, l]) => (
              <option key={v} value={v}>{l}</option>
            ))}
          </select>
        </Field>
        <Field label="Primary state / jurisdiction">
          <input value={fields.targetState} onChange={(e) => set("targetState", e.target.value.toUpperCase())} placeholder="MS" className="input" />
        </Field>
        <Field label="Main contact name">
          <input value={fields.primaryContactName} onChange={(e) => set("primaryContactName", e.target.value)} className="input" />
        </Field>
        <Field label="Main contact email">
          <input type="email" value={fields.primaryContactEmail} onChange={(e) => set("primaryContactEmail", e.target.value)} className="input" />
        </Field>
        <Field label="Main contact phone">
          <input value={fields.primaryContactPhone} onChange={(e) => set("primaryContactPhone", e.target.value)} className="input" />
        </Field>
        <Field label="Counties served (optional)">
          <input value={fields.targetCounty} onChange={(e) => set("targetCounty", e.target.value)} className="input" />
        </Field>
        <Field label="Short public description" full>
          <textarea value={fields.programDescription} onChange={(e) => set("programDescription", e.target.value)} rows={2} className="input" />
        </Field>
        <Field label="Internal notes (never shown to the partner)" full>
          <textarea value={fields.internalNotes} onChange={(e) => set("internalNotes", e.target.value)} rows={2} className="input" />
        </Field>
      </div>
      <button type="submit" disabled={busy} className="mt-6 rounded-md bg-[#D85A30] px-6 py-2.5 text-sm font-black text-white hover:bg-[#BF4B25] disabled:opacity-60">
        {busy ? "Creating…" : "Create partner and start onboarding"}
      </button>
      <style>{`.input{width:100%;border:1px solid #D7DEE8;border-radius:8px;padding:8px 12px;font-size:14px}`}</style>
    </form>
  );
}

function Field({ label, hint, required, full, children }: { label: string; hint?: string; required?: boolean; full?: boolean; children: React.ReactNode }) {
  return (
    <label className={`block ${full ? "sm:col-span-2" : ""}`}>
      <span className="mb-1 block text-xs font-black uppercase tracking-wide text-[#8A8278]">
        {label} {required ? <span className="text-[#D85A30]">*</span> : null}
      </span>
      {children}
      {hint ? <span className="mt-1 block text-[11px] text-[#8A8278]">{hint}</span> : null}
    </label>
  );
}
