"use client";
import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { PreparedCollectionEditor } from "./PreparedCollectionEditor";
import { ONBOARDING_SCHEMA_REGISTRY } from "@/lib/partners/onboarding/schema";
import { PROGRAM_CONFIGURATION_FIELDS, type ProgramConfiguration, type ProgramPatch } from "@/lib/partners/onboarding/program-configuration";
import type { OnboardingSectionKey } from "@/lib/partners/onboarding/types";

const control = "mt-2 min-h-11 w-full rounded border border-grayWilma-200 bg-white px-3 py-2 text-navy font-normal";
const display = (value: unknown) => Array.isArray(value) ? value.join(", ") : value == null ? "" : String(value);
const groups = [
  ["Organization", ["organization_contacts"]],
  ["Program and service area", ["program_goals", "geography_audience_language_accessibility", "access_sponsorship_capacity", "support_referrals_reporting"]],
  ["Participant page content", ["brand_public_page"]]
] as const;

export function ManagedProgramEditor({ configuration }: { configuration: ProgramConfiguration }) {
  const router = useRouter();
  const [refreshing, startRefresh] = useTransition();
  const [current, setCurrent] = useState(configuration);
  const [draft, setDraft] = useState(configuration.data);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const request = useRef<{ payload: string; id: string } | null>(null);
  const locked = busy || refreshing || ["paused", "closed"].includes(current.status);
  const fields = ONBOARDING_SCHEMA_REGISTRY.filter(field => PROGRAM_CONFIGURATION_FIELDS[field.sectionKey]?.includes(field.key));
  function set(section: OnboardingSectionKey, key: string, value: unknown) {
    setDraft(previous => ({ ...previous, [section]: { ...previous[section], [key]: value } }));
  }
  async function save(event: React.FormEvent) {
    event.preventDefault(); setBusy(true); setMessage("");
    try {
      const patches: ProgramPatch[] = [];
      for (const [section, keys] of Object.entries(PROGRAM_CONFIGURATION_FIELDS)) {
        const key = section as OnboardingSectionKey;
        const before = (current.data[key] ?? {}) as Record<string, unknown>;
        const values = (draft[key] ?? {}) as Record<string, unknown>;
        const changed = Object.fromEntries(keys.filter(field => JSON.stringify(values[field] ?? null) !== JSON.stringify(before[field] ?? null)).map(field => [field, values[field]]));
        if (Object.keys(changed).length) patches.push({ section: key, values: changed, base: before });
      }
      if (!patches.length) { setMessage("No changes to save."); return; }
      const payload = JSON.stringify({ patches, expectedVersion: current.version });
      if (request.current?.payload !== payload) request.current = { payload, id: crypto.randomUUID() };
      const response = await fetch(`/api/internal/partners/onboarding/phase1/${encodeURIComponent(current.partnerSlug)}/configuration`, {
        method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ ...JSON.parse(payload), requestId: request.current.id })
      });
      const body = await response.json();
      if (!response.ok || !body.configuration) throw new Error(typeof body.error === "string" ? body.error : "Program configuration could not be saved. Please retry.");
      setCurrent(body.configuration); setDraft(body.configuration.data); request.current = null;
      setMessage("Program information saved. Readiness reflects these saved values.");
      startRefresh(() => router.refresh());
    } catch (error) { setMessage(error instanceof Error ? error.message : "Please retry saving this program."); }
    finally { setBusy(false); }
  }
  return <section id="configure-program" className="mt-6 rounded-xl border bg-white p-6" aria-labelledby="configure-program-heading">
    <h2 id="configure-program-heading" className="text-2xl font-bold">Configure program</h2>
    <p className="mt-2 text-sm">Save organization and program details together. Commercial authority and publication are separate decisions.</p>
    <form onSubmit={save}>
      {groups.map(([title, sections]) => <fieldset key={title} disabled={locked} className="mt-6"><legend className="text-lg font-bold">{title}</legend>
        <div className="mt-3 grid gap-5 sm:grid-cols-2">{fields.filter(field => (sections as readonly string[]).includes(field.sectionKey)).map(field => {
          const value = (draft[field.sectionKey] as Record<string, unknown> | undefined)?.[field.key];
          const disabled = field.key === "legal_organization_name" && current.legalIdentityLocked;
          const options = field.enumValues ?? [];
          return <div key={field.key} className={field.key === "contacts" || field.dataType === "long_text" ? "sm:col-span-2" : ""}>
            {field.key === "contacts" ? <><h3 className="mb-3 font-bold">Program contacts</h3><PreparedCollectionEditor fieldKey="contacts" rows={(value ?? []) as Record<string, unknown>[]} onChange={value => set(field.sectionKey, field.key, value)} /></> :
              <label className="block text-sm font-bold">{field.label}
                {field.dataType === "boolean" ? <select aria-label={field.label} className={control} value={display(value)} onChange={event => set(field.sectionKey, field.key, event.target.value === "true")}><option value="">Choose</option><option value="true">Yes</option><option value="false">No</option></select> :
                  options.length && !field.dataType.endsWith("_array") ? <select aria-label={field.label} className={control} value={display(value)} onChange={event => set(field.sectionKey, field.key, event.target.value)}><option value="">Choose</option>{options.map(option => <option key={option} value={option}>{option.replaceAll("_", " ")}</option>)}</select> :
                    field.dataType === "long_text" ? <textarea aria-label={field.label} className={control} rows={3} value={display(value)} maxLength={field.maxLength ?? undefined} onChange={event => set(field.sectionKey, field.key, event.target.value)} /> :
                      <input aria-label={field.label} className={control} disabled={disabled} type={field.dataType === "email" ? "email" : "text"} maxLength={field.maxLength ?? undefined} value={display(value)} onChange={event => set(field.sectionKey, field.key, field.dataType.endsWith("_array") ? event.target.value.split(",").map(v => v.trim()).filter(Boolean) : event.target.value)} />}
                {field.dataType.endsWith("_array") ? <span className="mt-1 block font-normal">Separate answers with commas.{field.key === "jurisdictions" ? " Use state names or postal codes. Publication currently supports one active jurisdiction; existing multi-state data is preserved." : ""}</span> : null}
                {disabled ? <span className="mt-1 block font-normal">Protected by recorded agreement or service authority.</span> : null}
              </label>}
          </div>;
        })}</div>
      </fieldset>)}
      <button type="submit" disabled={locked} className="mt-6 min-h-11 rounded bg-navy px-5 font-bold text-white disabled:opacity-50">{busy || refreshing ? "Saving…" : "Save program"}</button>
      <p role="status" className="mt-3">{message}</p>
    </form>
  </section>;
}
