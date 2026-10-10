"use client";
import { programServiceArea, programGeographyIssue, STANDARD_PROGRAM_COPY } from "@/lib/partners/onboarding/program-defaults";
import { ProgramAddressEditor } from "./ProgramAddressEditor";
import { JurisdictionPicker } from "./JurisdictionPicker";
import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { PreparedCollectionEditor } from "./PreparedCollectionEditor";
import { ONBOARDING_SCHEMA_REGISTRY } from "@/lib/partners/onboarding/schema";
import { PROGRAM_CONFIGURATION_FIELDS, type ProgramConfiguration, type ProgramPatch } from "@/lib/partners/onboarding/program-configuration";
import type { getProgramOperations } from "@/lib/partners/onboarding/program-operations-service";
import type { OnboardingSectionKey } from "@/lib/partners/onboarding/types";

const control = "mt-2 min-h-11 w-full rounded border border-grayWilma-200 bg-white px-3 py-2 text-navy font-normal";
const display = (value: unknown) => Array.isArray(value) ? value.join(", ") : value == null ? "" : String(value);
const groups = [
  ["Organization", ["organization_contacts"]],
  ["Program and service area", ["program_goals", "geography_audience_language_accessibility", "access_sponsorship_capacity", "support_referrals_reporting"]],
  ["Participant page content", ["brand_public_page"]]
] as const;
const additionalFields = new Set(["website", "primary_address", "contacts", "operator_authority_reference", "external_agreement_applicability", "counties", "referral_arrangement", "contested_matter_procedure"]);

export function ManagedProgramEditor({ configuration, onDraftChange, onSavingChange, onSaved }: {
  configuration: ProgramConfiguration;
  onDraftChange?: () => void;
  onSavingChange?: (saving: boolean) => void;
  onSaved?: (version: number, operations?: Awaited<ReturnType<typeof getProgramOperations>>, preparationError?: string | null) => void;
}) {
  const router = useRouter();
  const [refreshing, startRefresh] = useTransition();
  const [current, setCurrent] = useState(configuration);
  const [draft, setDraft] = useState(configuration.data);
  // Reconcile a newer server snapshot before rendering controls. A delayed
  // refresh must never move the editor back behind its latest save response.
  if (configuration.version > current.version) {
    // Rebase untouched fields after material generation; preserve user edits and
    // their original field bases so concurrent edits still receive a CAS conflict.
    const nextDraft = structuredClone(configuration.data);
    const nextBase = structuredClone(configuration.data);
    for (const [section, fields] of Object.entries(PROGRAM_CONFIGURATION_FIELDS)) {
      const key = section as OnboardingSectionKey;
      const base = (current.data[key] ?? {}) as Record<string, unknown>;
      const edited = (draft[key] ?? {}) as Record<string, unknown>;
      const values = {...nextDraft[key]} as Record<string, unknown>;
      const bases = {...nextBase[key]} as Record<string, unknown>;
      for (const field of fields) if (JSON.stringify(edited[field] ?? null) !== JSON.stringify(base[field] ?? null)) {
        values[field] = edited[field]; bases[field] = base[field];
      }
      Object.assign(nextDraft, {[key]: values}); Object.assign(nextBase, {[key]: bases});
    }
    setDraft(nextDraft); setCurrent({...configuration, data: nextBase});
  }
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [showReview, setShowReview] = useState(false);
  const [saveFailed, setSaveFailed] = useState(false);
  const [conflict, setConflict] = useState(false);
  const [loadingSaved, setLoadingSaved] = useState(false);
  const [reconciliation, setReconciliation] = useState<{ server: ProgramConfiguration; data: ProgramConfiguration["data"]; fields: Array<{ section: OnboardingSectionKey; key: string; saved: unknown; mine: unknown }> } | null>(null);
  const request = useRef<{ payload: string; id: string } | null>(null);
  const locked = busy || refreshing || Boolean(reconciliation) || ["paused", "closed"].includes(current.status);
  const dirty = JSON.stringify(draft) !== JSON.stringify(current.data);
  useEffect(() => {
    if (!dirty) return;
    const beforeUnload = (event: BeforeUnloadEvent) => event.preventDefault();
    const beforeNavigate = (event: MouseEvent) => {
      if (event.defaultPrevented || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey || event.button !== 0) return;
      const link = event.target instanceof Element ? event.target.closest<HTMLAnchorElement>("a[href]") : null;
      if (!link || link.target === "_blank") return;
      const destination = new URL(link.href, location.href);
      if (destination.origin === location.origin && destination.pathname === location.pathname && destination.search === location.search) return;
      if (!window.confirm("Leave without saving your program changes?")) { event.preventDefault(); event.stopPropagation(); }
    };
    window.addEventListener("beforeunload", beforeUnload);
    document.addEventListener("click", beforeNavigate, true);
    return () => { window.removeEventListener("beforeunload", beforeUnload); document.removeEventListener("click", beforeNavigate, true); };
  }, [dirty]);
  const managed=draft.program_goals?.operating_model === "legalease_managed";
  const spanish=draft.geography_audience_language_accessibility?.enable_spanish === true;
  const geographyIssue=programGeographyIssue(draft);
  const fields = ONBOARDING_SCHEMA_REGISTRY.filter(field => PROGRAM_CONFIGURATION_FIELDS[field.sectionKey]?.includes(field.key) && (managed || !["operator_authority_reference","external_agreement_applicability","service_mode"].includes(field.key)) && !field.key.endsWith("_es"));
  function set(section: OnboardingSectionKey, key: string, value: unknown) {
    onDraftChange?.(); setShowReview(false); setMessage("");
    setDraft(previous => {
      const next={...previous,[section]:{...previous[section],[key]:value}};
      if(key==="operating_model" && value==="legalease_managed") next.program_goals={...next.program_goals,service_mode:next.program_goals?.service_mode??"screening_only",external_agreement_applicability:"not_applicable",operator_authority_reference:next.program_goals?.operator_authority_reference??"LegalEase operates this program under its own internal business and publication authority."};
      if(key==="operating_model" && value==="legalease_managed" && !previous.access_sponsorship_capacity?.participant_access_model) next.access_sponsorship_capacity={...previous.access_sponsorship_capacity,participant_access_model:"open"};
      if(key==="jurisdictions") {const geo=previous.geography_audience_language_accessibility; if(!geo?.service_area_description || geo.service_area_description===programServiceArea(geo.jurisdictions??[])) next.geography_audience_language_accessibility={...next.geography_audience_language_accessibility,service_area_description:programServiceArea(value as string[])};}
      return next;
    });
  }
  async function save(event: React.FormEvent) {
    event.preventDefault();
    const confirmPublicationHold = current.status === "live" && dirty;
    if (confirmPublicationHold && !window.confirm("Save these changes and hold new participant entry until the updated program is reviewed and started again?")) return;
    setBusy(true); onSavingChange?.(true); setMessage(""); setShowReview(false); setSaveFailed(false);
    try {
      const patches: ProgramPatch[] = [];
      for (const [section, keys] of Object.entries(PROGRAM_CONFIGURATION_FIELDS)) {
        const key = section as OnboardingSectionKey;
        const before = (current.data[key] ?? {}) as Record<string, unknown>;
        const values = (draft[key] ?? {}) as Record<string, unknown>;
        const changed = Object.fromEntries(keys.filter(field => JSON.stringify(values[field] ?? null) !== JSON.stringify(before[field] ?? null)).map(field => [field, values[field]]));
        if (Object.keys(changed).length) patches.push({ section: key, values: changed, base: before });
      }
      const payload = JSON.stringify({ patches, expectedVersion: current.version, confirmPublicationHold });
      if (request.current?.payload !== payload) request.current = { payload, id: crypto.randomUUID() };
      const response = await fetch(`/api/internal/partners/onboarding/phase1/${encodeURIComponent(current.partnerSlug)}/configuration`, {
        method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ ...JSON.parse(payload), requestId: request.current.id })
      });
      const body = await response.json();
      if (body.code === "revision_conflict") setConflict(true);
      if (!response.ok || !body.configuration) throw new Error(typeof body.error === "string" ? body.error : "Program configuration could not be saved. Please retry.");
      setCurrent(body.configuration); setDraft(body.configuration.data); setConflict(false); request.current = null;
      onSaved?.(body.configuration.version, body.operations, body.preparationError); setShowReview(true);
      setMessage(body.preparationError
        ? `Program information saved and read back. Materials need attention: ${body.preparationError}`
        : body.operations?.view?.materials.length===2 ? "Program information saved and read back. Current materials are ready for your review and confirmation." : "Program information saved and read back. Review Program Materials for the next action.");
      startRefresh(() => router.refresh());
    } catch (error) { setSaveFailed(true); setMessage(error instanceof Error ? error.message : "Please retry saving this program."); }
    finally { setBusy(false); onSavingChange?.(false); }
  }
  async function reviewSavedVersion() {
    setBusy(true); setLoadingSaved(true);
    try {
      const response = await fetch(`/api/internal/partners/onboarding/phase1/${encodeURIComponent(current.partnerSlug)}/configuration`, { cache: "no-store" });
      const body = await response.json();
      if (!response.ok || !body.configuration) throw new Error(body.error ?? "The saved version could not be loaded. Your edits are preserved.");
      const server = body.configuration as ProgramConfiguration;
      const data = structuredClone(server.data);
      const fields: NonNullable<typeof reconciliation>["fields"] = [];
      for (const [section, keys] of Object.entries(PROGRAM_CONFIGURATION_FIELDS)) {
        const key = section as OnboardingSectionKey;
        for (const field of keys) {
          const base = (current.data[key] as Record<string, unknown> | undefined)?.[field];
          const mine = (draft[key] as Record<string, unknown> | undefined)?.[field];
          const saved = (server.data[key] as Record<string, unknown> | undefined)?.[field];
          if (JSON.stringify(base ?? null) === JSON.stringify(mine ?? null)) continue;
          Object.assign(data, { [key]: { ...data[key], [field]: mine } });
          if (JSON.stringify(base ?? null) !== JSON.stringify(saved ?? null) && JSON.stringify(mine ?? null) !== JSON.stringify(saved ?? null)) fields.push({ section: key, key: field, saved, mine });
        }
      }
      if (fields.length) setReconciliation({ server, data, fields });
      else { setCurrent(server); setDraft(data); request.current = null; setConflict(false); setSaveFailed(false); setMessage("Latest saved values loaded. Your unsaved edits are preserved. Review them, then Save program."); }
    } catch (failure) { setMessage(failure instanceof Error ? failure.message : "Could not load saved changes. Your edits are preserved."); }
    finally { setBusy(false); setLoadingSaved(false); }
  }
  function resolveField(section: OnboardingSectionKey, key: string, value: unknown) {
    if (!reconciliation) return;
    const data = { ...reconciliation.data, [section]: { ...reconciliation.data[section], [key]: value } };
    const fields = reconciliation.fields.filter(field => field.section !== section || field.key !== key);
    if (fields.length) setReconciliation({ ...reconciliation, data, fields });
    else { setCurrent(reconciliation.server); setDraft(data); setReconciliation(null); setConflict(false); setSaveFailed(false); request.current = null; setMessage("Conflicts resolved in your draft. Review the values, then Save program."); }
  }
  return <section id="configure-program" tabIndex={-1} className="mt-6 scroll-mt-32 rounded-xl border bg-white p-6" aria-labelledby="configure-program-heading">
    <h2 id="configure-program-heading" className="text-2xl font-bold">Configure program</h2>
    <p className="mt-2 text-sm">Save organization and program details together. The final Start Program confirmation authorizes the saved operating scope and current materials.</p>
    <p className="mt-3 text-sm">{managed ? "LegalEase operates this program." : "Partner-managed: existing consent and service authority apply."} {spanish ? "English and Spanish previews use one final review." : "English participant page."}</p>
    {managed && current.operatingModel !== "legalease_managed" ? <p className="mt-3 rounded border p-3 text-sm">Saving establishes LegalEase&apos;s operating responsibility for this program and records your Platform Admin decision. Administrator membership and a recorded Not Required agreement do not establish independent operating rights. Existing external agreement or operating-authority evidence prevents the change.</p> : null}
    {current.status === "live" ? <p className="mt-3 rounded border bg-slate-50 p-4">Your published program remains available while you review these settings. Saving changes that affect its approved scope or materials holds new participant entry until you review and start the updated program.</p> : null}
    <form onSubmit={save}>
      {conflict && !reconciliation ? <div role="alert" className="mt-4 rounded border border-orange p-4"><p>Another saved version is available. Your edits are preserved.</p><button type="button" disabled={busy} className="min-h-11 underline" onClick={reviewSavedVersion}>Review latest saved version</button></div> : null}
      {reconciliation ? <section className="mt-4 rounded border border-orange p-4" aria-label="Review saved changes"><h3 className="font-bold">Choose the value to keep in your draft</h3>{reconciliation.fields.map(field => <div key={`${field.section}.${field.key}`} className="mt-4 border-t pt-4"><h4 className="font-bold">{ONBOARDING_SCHEMA_REGISTRY.find(item => item.key === field.key)?.label ?? field.key}</h4><dl className="mt-2 grid gap-3 sm:grid-cols-2"><div><dt className="font-bold">Saved value</dt><dd className="whitespace-pre-wrap break-words">{typeof field.saved === "object" ? JSON.stringify(field.saved, null, 2) : display(field.saved)}</dd></div><div><dt className="font-bold">Your edit</dt><dd className="whitespace-pre-wrap break-words">{typeof field.mine === "object" ? JSON.stringify(field.mine, null, 2) : display(field.mine)}</dd></div></dl><div className="mt-3 flex gap-3"><button type="button" className="min-h-11 rounded border px-3" onClick={() => resolveField(field.section, field.key, field.saved)}>Use saved value</button><button type="button" className="min-h-11 rounded border px-3" onClick={() => resolveField(field.section, field.key, field.mine)}>Keep my edit</button></div></div>)}</section> : null}
      {geographyIssue ? <div role="alert" className="mt-4 rounded border border-orange p-4"><p>{geographyIssue}</p><button type="button" disabled={locked} className="mt-3 min-h-11 rounded border px-4 font-bold" onClick={()=>set("geography_audience_language_accessibility","service_area_description",programServiceArea(draft.geography_audience_language_accessibility?.jurisdictions??[]))}>Use selected jurisdictions in description</button><p className="mt-2 text-sm">Review the updated description, then Save Program. Selected jurisdictions are unchanged.</p></div> : null}
      {groups.map(([title, sections]) => <fieldset key={title} disabled={locked} className="mt-6"><legend className="text-lg font-bold">{title}</legend>
        {[false, true].map(additional => {
        const groupFields = fields.filter(field => (sections as readonly string[]).includes(field.sectionKey) && additionalFields.has(field.key) === additional);
        if (!groupFields.length) return null;
        const controls = <div className="mt-3 grid gap-5 sm:grid-cols-2">{groupFields.map(field => {
          const value = (draft[field.sectionKey] as Record<string, unknown> | undefined)?.[field.key];
          const disabled = field.key === "legal_organization_name" && current.legalIdentityLocked;
          const options = field.enumValues ?? [];
          return <div key={field.key} id={`program-field-${field.key}`} tabIndex={-1} className={`scroll-mt-32 ${field.key === "contacts" || field.key === "primary_address" || field.dataType === "long_text" ? "sm:col-span-2" : ""}`}>
            {field.key === "primary_address" ? <ProgramAddressEditor value={typeof value === "string" ? value : ""} onChange={address => set(field.sectionKey,field.key,address)} /> : field.key === "jurisdictions" ? <JurisdictionPicker value={Array.isArray(value) ? value : []} onChange={value => set(field.sectionKey, field.key, value)} /> : field.key === "contacts" ? <><h3 className="mb-3 font-bold">Program contacts</h3><PreparedCollectionEditor fieldKey="contacts" rows={(value ?? []) as Record<string, unknown>[]} onChange={value => set(field.sectionKey, field.key, value)} /></> :
              <label className="block text-sm font-bold">{field.label}
                {field.key === "enable_spanish" ? <><input aria-label="Enable Spanish" className="ml-3" type="checkbox" checked={value===true} onChange={event=>set(field.sectionKey,field.key,event.target.checked)}/><span className="mt-1 block font-normal">Save Program prepares Spanish drafts automatically for the same final bilingual review. Your English copy is preserved. Legal-document availability varies by jurisdiction.</span></> : field.dataType === "boolean" ? <select aria-label={field.label} className={control} value={display(value)} onChange={event => set(field.sectionKey, field.key, event.target.value === "true")}><option value="">Choose</option><option value="true">Yes</option><option value="false">No</option></select> :
                  options.length && !field.dataType.endsWith("_array") ? <select aria-label={field.label} className={control} value={display(value)} onChange={event => set(field.sectionKey, field.key, event.target.value)}><option value="">Choose</option>{options.map(option => <option key={option} value={option}>{({legalease_managed:"LegalEase-managed",partner_managed:"Partner-managed",screening_only:"Screening only",participant_paid:"Screening and participant-paid services",sponsored_packets:"Screening and funded sponsored packets",not_applicable:"Not Required (no external partner agreement applies)",required:"External agreement required"} as Record<string,string>)[option]??option.replaceAll("_", " ")}</option>)}</select> :
                    field.dataType === "long_text" ? <textarea aria-label={field.label} className={control} rows={3} value={display(value)} maxLength={field.maxLength ?? undefined} onChange={event => set(field.sectionKey, field.key, event.target.value)} /> :
                      <input aria-label={field.label} className={control} disabled={disabled} type={field.dataType === "email" ? "email" : "text"} maxLength={field.maxLength ?? undefined} value={display(value)} onChange={event => set(field.sectionKey, field.key, field.dataType.endsWith("_array") ? event.target.value.split(",").map(v => v.trim()).filter(Boolean) : event.target.value)} />}
                {field.dataType.endsWith("_array") ? <span className="mt-1 block font-normal">Separate answers with commas.</span> : null}
                {disabled ? <span className="mt-1 block font-normal">Protected by recorded agreement or service authority. Review the existing evidence before requesting an identity correction.</span> : null}
              </label>}
            {disabled ? <a className="inline-flex min-h-11 items-center text-sm underline" href={`/internal/partners/onboarding/${current.partnerSlug}/diagnostics#program-service-authority`}>Review legal identity evidence</a> : null}
            {field.key === "primary_cta_label" && display(value).length > 60 ? <div className="mt-2 text-sm"><p>A concise button label is easier to read. Keep supporting detail in the page description.</p><button type="button" className="min-h-11 underline" onClick={() => set(field.sectionKey, field.key, STANDARD_PROGRAM_COPY.primaryActionLabel[0])}>Use “Start free screening”</button></div> : null}
          </div>;
        })}</div>;
        return additional ? <details key="additional" className="mt-4"><summary className="min-h-11 cursor-pointer py-3 font-bold">More {title.toLowerCase()} details</summary>{controls}</details> : <div key="essential">{controls}</div>;
        })}
      </fieldset>)}
      <button type="submit" disabled={locked || conflict} className="mt-6 min-h-11 rounded bg-navy px-5 font-bold text-white disabled:opacity-50">{loadingSaved ? "Loading saved version…" : busy || refreshing ? "Saving and preparing…" : saveFailed ? "Retry saving" : "Save program"}</button>
      <p role={saveFailed ? "alert" : "status"} className="mt-3">{message}</p>
      {showReview && !busy ? <a className="mt-3 inline-flex min-h-11 items-center rounded border px-5 font-bold" href="#program-materials" onClick={() => document.getElementById("program-materials")?.focus({preventScroll: true})}>Review Program Materials</a> : null}
    </form>
  </section>;
}
