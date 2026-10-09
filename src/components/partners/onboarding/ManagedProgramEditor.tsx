"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { InternalPrefillSnapshot } from "@/lib/partners/onboarding/prefill-service";
import { PreparedCollectionEditor } from "./PreparedCollectionEditor";

const control = "mt-2 min-h-11 w-full rounded border border-grayWilma-200 bg-white px-3 py-2 text-navy";
const display = (value: unknown) => Array.isArray(value) ? value.join(", ") : value == null ? "" : String(value);

function preparedValues(snapshot: InternalPrefillSnapshot) {
  const values = {...snapshot.currentValues};
  for (const suggestion of snapshot.suggestions) {
    if (["proposed", "approved"].includes(suggestion.reviewStatus) && !suggestion.conflict &&
      (values[suggestion.fieldKey] == null || values[suggestion.fieldKey] === "" || Array.isArray(values[suggestion.fieldKey]) && (values[suggestion.fieldKey] as unknown[]).length === 0)) values[suggestion.fieldKey] = suggestion.proposedValue;
  }
  return values;
}

export function ManagedProgramEditor({ partnerSlug, snapshot }: { partnerSlug: string; snapshot: InternalPrefillSnapshot }) {
  const router = useRouter();
  const [refreshing, startRefresh] = useTransition();
  const [current, setCurrent] = useState(snapshot);
  const sections = [...new Map(current.eligibleFields.map(field => [field.sectionKey, field.sectionLabel])).entries()];
  const [section, setSection] = useState(sections[0]?.[0]);
  const [draft, setDraft] = useState<Record<string, unknown>>(() => preparedValues(snapshot));
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const fields = current.eligibleFields.filter(field => field.sectionKey === section);
  const contacts = (current.currentValues?.contacts ?? []) as Array<{ stable_row_id: string; name: string; work_email?: string }>;
  function set(key: string, value: unknown) { setDraft(previous => ({...previous, [key]: value})); }
  async function save() {
    setBusy(true); setMessage("");
    let latest = current;
    try {
      for (const field of fields) {
        if (JSON.stringify(draft[field.fieldKey] ?? null) === JSON.stringify(current.currentValues?.[field.fieldKey] ?? null)) continue;
        const response = await fetch(`/api/internal/partners/onboarding/phase1/${encodeURIComponent(partnerSlug)}/prefill`, {
          method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({
            action: "save_prepared", requestId: crypto.randomUUID(), expectedWorkspaceVersion: latest.workspace?.aggregateVersion,
            payload: { sectionKey: section, fieldKey: field.fieldKey, proposedValue: draft[field.fieldKey], expectedFieldValueHash: latest.fieldValueHashes?.[field.fieldKey] }
          })
        });
        const body = await response.json();
        if (!response.ok || !body.snapshot) throw new Error(typeof body.error === "string" ? body.error : "This answer could not be saved. Please retry.");
        latest = body.snapshot; setCurrent(latest);
      }
      setDraft(previous => ({...previous, ...Object.fromEntries(fields.map(field => [field.fieldKey, latest.currentValues?.[field.fieldKey]]))}));
      setMessage("Program information saved.");
      startRefresh(() => router.refresh());
    } catch (error) { setMessage(error instanceof Error ? error.message : "Please retry saving this section."); }
    finally { setBusy(false); }
  }
  async function reuseKnown() {
    setBusy(true);
    try {
      const response = await fetch(`/api/internal/partners/onboarding/phase1/${encodeURIComponent(partnerSlug)}/prefill`, {
        method: "POST", headers: {"content-type": "application/json"}, body: JSON.stringify({action: "reuse_known", requestId: crypto.randomUUID(), payload: {}})
      });
      const body = await response.json();
      if (!response.ok || !body.snapshot) throw new Error(typeof body.error === "string" ? body.error : "Saved partner details could not be loaded.");
      setCurrent(body.snapshot); setDraft(preparedValues(body.snapshot)); setMessage("Saved partner details reused. Existing answers were preserved."); startRefresh(() => router.refresh());
    } catch(error) { setMessage(error instanceof Error ? error.message : "Please retry."); }
    finally { setBusy(false); }
  }
  return <section id="prefill-heading" className="mt-6 scroll-mt-52 sm:scroll-mt-28 rounded-xl border bg-white p-6" aria-labelledby="configure-program-heading">
    <h2 id="configure-program-heading" className="text-2xl font-bold">Configure program</h2>
    <p className="mt-2 text-sm">Save each section as you go. Previously saved answers remain available when you return.</p>
    <button type="button" disabled={busy || refreshing} onClick={reuseKnown} className="mt-4 min-h-11 rounded border px-4 font-bold">Use saved partner details</button>
    <label className="mt-4 block font-bold">Program section<select className={control} disabled={busy || refreshing} value={section} onChange={event => {
      setSection(event.target.value as typeof section); setMessage("");
    }}>{sections.map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select></label>
    <div className="mt-5 grid gap-5 sm:grid-cols-2">{fields.map(field => <div key={field.fieldKey} className={field.dataType.endsWith("_collection") || field.dataType === "long_text" ? "sm:col-span-2" : ""}>
      {field.dataType.endsWith("_collection") ? <><h3 className="mb-3 font-bold">{field.fieldLabel}</h3><PreparedCollectionEditor fieldKey={field.fieldKey} rows={(draft[field.fieldKey] ?? []) as Record<string, unknown>[]} onChange={value => set(field.fieldKey, value)} /></> :
      <label className="block text-sm font-bold">{field.fieldLabel}
        {field.dataType.endsWith("_reference") ? <select aria-label={field.fieldLabel} className={control} disabled={busy || refreshing} value={display(draft[field.fieldKey])} onChange={event => set(field.fieldKey,event.target.value)}><option value="">Select a saved contact</option>{(field.dataType === "planned_user_reference" ? (draft.planned_users ?? []) as typeof contacts : contacts).map(contact => <option key={contact.stable_row_id} value={contact.stable_row_id}>{contact.name} {contact.work_email ? `(${contact.work_email})` : ""}</option>)}</select> :
        field.dataType === "boolean" ? <select aria-label={field.fieldLabel} className={control} disabled={busy || refreshing} value={display(draft[field.fieldKey])} onChange={event => set(field.fieldKey, event.target.value === "true")}><option value="">Choose</option><option value="true">Yes</option><option value="false">No</option></select> :
        field.enumValues.length && !field.dataType.endsWith("_array") ? <select aria-label={field.fieldLabel} className={control} disabled={busy || refreshing} value={display(draft[field.fieldKey])} onChange={event => set(field.fieldKey, event.target.value)}><option value="">Choose</option>{field.enumValues.map(value => <option key={value} value={value}>{value.replaceAll("_", " ")}</option>)}</select> :
        field.dataType === "long_text" ? <textarea aria-label={field.fieldLabel} className={control} disabled={busy || refreshing} rows={3} maxLength={field.maxLength ?? undefined} value={display(draft[field.fieldKey])} onChange={event => set(field.fieldKey, event.target.value)} /> :
        <input aria-label={field.fieldLabel} className={control} disabled={busy || refreshing} type={field.dataType === "integer" ? "number" : field.dataType === "date" ? "date" : field.dataType === "email" ? "email" : "text"} maxLength={field.maxLength ?? undefined} value={display(draft[field.fieldKey])} onChange={event => set(field.fieldKey, field.dataType === "integer" ? Number(event.target.value) : field.dataType.endsWith("_array") ? event.target.value.split(",").map(value => value.trim()).filter(Boolean) : event.target.value)} />}
        {field.dataType.endsWith("_array") ? <span className="mt-1 block font-normal">Separate multiple answers with commas.{field.enumValues.length ? ` Options: ${field.enumValues.join(", ")}.` : ""}</span> : null}
      </label>}
    </div>)}</div>
    <button type="button" disabled={busy || refreshing} onClick={save} className="mt-6 min-h-11 rounded bg-navy px-5 font-bold text-white disabled:opacity-50">{busy || refreshing ? "Saving…" : "Save section"}</button>
    <p role="status" className="mt-3">{refreshing ? "Updating program materials…" : message}</p>
  </section>;
}
