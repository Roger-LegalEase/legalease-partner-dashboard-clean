"use client";
import { PROGRAM_JURISDICTIONS, programServiceArea, programGeographyIssue } from "@/lib/partners/onboarding/program-defaults";
import { useRef, useState, useTransition } from "react";
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
  const request = useRef<{ payload: string; id: string } | null>(null);
  const locked = busy || refreshing || ["paused", "closed"].includes(current.status);
  const managed=draft.program_goals?.operating_model === "legalease_managed";
  const spanish=draft.geography_audience_language_accessibility?.enable_spanish === true;
  const geographyIssue=programGeographyIssue(draft);
  const fields = ONBOARDING_SCHEMA_REGISTRY.filter(field => PROGRAM_CONFIGURATION_FIELDS[field.sectionKey]?.includes(field.key) && (managed || !["operator_authority_reference","external_agreement_applicability","service_mode"].includes(field.key)) && (!field.key.endsWith("_es") || (!managed && spanish)));
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
    event.preventDefault(); setBusy(true); onSavingChange?.(true); setMessage(""); setShowReview(false);
    try {
      const patches: ProgramPatch[] = [];
      for (const [section, keys] of Object.entries(PROGRAM_CONFIGURATION_FIELDS)) {
        const key = section as OnboardingSectionKey;
        const before = (current.data[key] ?? {}) as Record<string, unknown>;
        const values = (draft[key] ?? {}) as Record<string, unknown>;
        const changed = Object.fromEntries(keys.filter(field => JSON.stringify(values[field] ?? null) !== JSON.stringify(before[field] ?? null)).map(field => [field, values[field]]));
        if (Object.keys(changed).length) patches.push({ section: key, values: changed, base: before });
      }
      const payload = JSON.stringify({ patches, expectedVersion: current.version });
      if (request.current?.payload !== payload) request.current = { payload, id: crypto.randomUUID() };
      const response = await fetch(`/api/internal/partners/onboarding/phase1/${encodeURIComponent(current.partnerSlug)}/configuration`, {
        method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ ...JSON.parse(payload), requestId: request.current.id })
      });
      const body = await response.json();
      if (!response.ok || !body.configuration) throw new Error(typeof body.error === "string" ? body.error : "Program configuration could not be saved. Please retry.");
      setCurrent(body.configuration); setDraft(body.configuration.data); request.current = null;
      onSaved?.(body.configuration.version, body.operations, body.preparationError); setShowReview(true);
      setMessage(body.preparationError
        ? `Program information saved and read back. Materials need attention: ${body.preparationError}`
        : body.operations?.view?.materials.length===2 ? "Program information saved and read back. Current materials are ready for your review and confirmation." : "Program information saved and read back. Review Program Materials for the next action.");
      startRefresh(() => router.refresh());
    } catch (error) { setMessage(error instanceof Error ? error.message : "Please retry saving this program."); }
    finally { setBusy(false); onSavingChange?.(false); }
  }
  return <section id="configure-program" tabIndex={-1} className="mt-6 scroll-mt-32 rounded-xl border bg-white p-6" aria-labelledby="configure-program-heading">
    <h2 id="configure-program-heading" className="text-2xl font-bold">Configure program</h2>
    <p className="mt-2 text-sm">Save organization and program details together. The final Start Program confirmation authorizes the saved operating scope and current materials.</p>
    {managed && current.operatingModel !== "legalease_managed" ? <p className="mt-3 rounded border p-3 text-sm">Saving establishes LegalEase&apos;s operating responsibility for this program and records your Platform Admin decision. Administrator membership and a recorded Not Required agreement do not establish independent operating rights. Existing external agreement or operating-authority evidence prevents the change.</p> : null}
    <form onSubmit={save}>
      {geographyIssue ? <div role="alert" className="mt-4 rounded border border-orange p-4"><p>{geographyIssue}</p><button type="button" disabled={locked} className="mt-3 min-h-11 rounded border px-4 font-bold" onClick={()=>set("geography_audience_language_accessibility","service_area_description",programServiceArea(draft.geography_audience_language_accessibility?.jurisdictions??[]))}>Use selected jurisdictions in description</button><p className="mt-2 text-sm">Review the updated description, then Save Program. Selected jurisdictions are unchanged.</p></div> : null}
      {groups.map(([title, sections]) => <fieldset key={title} disabled={locked} className="mt-6"><legend className="text-lg font-bold">{title}</legend>
        <div className="mt-3 grid gap-5 sm:grid-cols-2">{fields.filter(field => (sections as readonly string[]).includes(field.sectionKey)).map(field => {
          const value = (draft[field.sectionKey] as Record<string, unknown> | undefined)?.[field.key];
          const disabled = field.key === "legal_organization_name" && current.legalIdentityLocked;
          const options = field.enumValues ?? [];
          return <div key={field.key} id={`program-field-${field.key}`} tabIndex={-1} className={`scroll-mt-32 ${field.key === "contacts" || field.dataType === "long_text" ? "sm:col-span-2" : ""}`}>
            {field.key === "contacts" ? <><h3 className="mb-3 font-bold">Program contacts</h3><PreparedCollectionEditor fieldKey="contacts" rows={(value ?? []) as Record<string, unknown>[]} onChange={value => set(field.sectionKey, field.key, value)} /></> :
              <label className="block text-sm font-bold">{field.label}
                {field.key === "enable_spanish" ? <><input aria-label="Enable Spanish" className="ml-3" type="checkbox" checked={value===true} onChange={event=>set(field.sectionKey,field.key,event.target.checked)}/><span className="mt-1 block font-normal">Save Program prepares Spanish drafts automatically for the same final bilingual review. Your English copy is preserved. Legal-document availability varies by jurisdiction.</span></> : field.key === "jurisdictions" ? <select aria-label="Jurisdictions" multiple size={6} className={control} value={Array.isArray(value)?value:[]} onChange={event=>set(field.sectionKey,field.key,Array.from(event.target.selectedOptions,option=>option.value))}>{Object.entries(PROGRAM_JURISDICTIONS).map(([code,name])=><option key={code} value={code}>{name}</option>)}</select> : field.dataType === "boolean" ? <select aria-label={field.label} className={control} value={display(value)} onChange={event => set(field.sectionKey, field.key, event.target.value === "true")}><option value="">Choose</option><option value="true">Yes</option><option value="false">No</option></select> :
                  options.length && !field.dataType.endsWith("_array") ? <select aria-label={field.label} className={control} value={display(value)} onChange={event => set(field.sectionKey, field.key, event.target.value)}><option value="">Choose</option>{options.map(option => <option key={option} value={option}>{({legalease_managed:"LegalEase-managed",partner_managed:"Partner-managed",screening_only:"Screening only",participant_paid:"Screening and participant-paid services",sponsored_packets:"Screening and funded sponsored packets",not_applicable:"Not Required (no external partner agreement applies)",required:"External agreement required"} as Record<string,string>)[option]??option.replaceAll("_", " ")}</option>)}</select> :
                    field.dataType === "long_text" ? <textarea aria-label={field.label} className={control} rows={3} value={display(value)} maxLength={field.maxLength ?? undefined} onChange={event => set(field.sectionKey, field.key, event.target.value)} /> :
                      <input aria-label={field.label} className={control} disabled={disabled} type={field.dataType === "email" ? "email" : "text"} maxLength={field.maxLength ?? undefined} value={display(value)} onChange={event => set(field.sectionKey, field.key, field.dataType.endsWith("_array") ? event.target.value.split(",").map(v => v.trim()).filter(Boolean) : event.target.value)} />}
                {field.dataType.endsWith("_array") && field.key!=="jurisdictions" ? <span className="mt-1 block font-normal">Separate answers with commas.</span> : null}
                {disabled ? <span className="mt-1 block font-normal">Protected by recorded agreement or service authority.</span> : null}
              </label>}
          </div>;
        })}</div>
      </fieldset>)}
      <button type="submit" disabled={locked} className="mt-6 min-h-11 rounded bg-navy px-5 font-bold text-white disabled:opacity-50">{busy || refreshing ? "Saving and preparing…" : "Save program"}</button>
      <p role="status" className="mt-3">{message}</p>
      {showReview && !busy ? <a className="mt-3 inline-flex min-h-11 items-center rounded border px-5 font-bold" href="#program-materials" onClick={() => document.getElementById("program-materials")?.focus({preventScroll: true})}>Review Program Materials</a> : null}
    </form>
  </section>;
}
