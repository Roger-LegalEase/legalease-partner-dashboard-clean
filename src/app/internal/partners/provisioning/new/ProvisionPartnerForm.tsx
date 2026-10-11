"use client";

import Link from "next/link";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { validatePartnerProvisioningInput, partnerPageNameError } from "@/lib/partners/partner-provisioning-domain";
import { programServiceArea } from "@/lib/partners/onboarding/program-defaults";
import { JurisdictionPicker } from "@/components/partners/onboarding/JurisdictionPicker";

const control = "mt-2 min-h-11 w-full rounded-lg border bg-white px-3 py-2 font-normal";
const button = "inline-flex min-h-11 items-center justify-center rounded-lg border px-5 py-3 font-bold disabled:opacity-50";
const initial = {
  operatingModel: "", organizationName: "", legalOrganizationName: "", partnerSlug: "", programName: "",
  programPurpose: "Free record-clearing screening for people in the program service area.",
  administratorName: "", administratorEmail: "", clearanceReason: "", jurisdictions: [] as string[],
  enableSpanish: false, website: "", template: "screening-standard-v1"
};

/** One reviewed, idempotent creation followed by the canonical Configure workspace. */
export function ProvisionPartnerForm() {
  const router = useRouter();
  const [values, setValues] = useState(initial);
  const [reviewing, setReviewing] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const request = useRef<{ payload: string; id: string } | null>(null);
  const inFlight = useRef(false);
  const created = useRef(false);
  const heading = useRef<HTMLHeadingElement>(null);
  useEffect(() => { heading.current?.focus({ preventScroll: true }); }, [reviewing]);
  const dirty = JSON.stringify(values) !== JSON.stringify(initial);
  useEffect(() => {
    if (!dirty) return;
    const unload = (event: BeforeUnloadEvent) => { if (!created.current) event.preventDefault(); };
    const navigate = (event: MouseEvent) => {
      if (created.current || event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      const link = event.target instanceof Element ? event.target.closest<HTMLAnchorElement>("a[href]") : null;
      if (!link || link.target === "_blank") return;
      const next = new URL(link.href, location.href);
      if (next.origin === location.origin && next.pathname === location.pathname && next.search === location.search) return;
      if (!window.confirm("Leave without creating this program? Your unsaved details will be discarded.")) { event.preventDefault(); event.stopPropagation(); }
    };
    window.addEventListener("beforeunload", unload); document.addEventListener("click", navigate, true);
    return () => { window.removeEventListener("beforeunload", unload); document.removeEventListener("click", navigate, true); };
  }, [dirty]);
  const managed = values.operatingModel === "legalease_managed";
  const suggestedSlug = (name: string) => name.normalize("NFKD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 100);
  const set = <K extends keyof typeof initial>(key: K, value: typeof initial[K]) => setValues(previous => {
    const next = { ...previous, [key]: value };
    if (key === "organizationName" && typeof value === "string") {
      if (!previous.programName || previous.programName === `${previous.organizationName} Record Clearing Program`) next.programName = value ? `${value} Record Clearing Program` : "";
      if (!previous.partnerSlug || previous.partnerSlug === suggestedSlug(previous.organizationName)) next.partnerSlug = suggestedSlug(value);
      if (!previous.legalOrganizationName || previous.legalOrganizationName === previous.organizationName) next.legalOrganizationName = value;
    }
    return next;
  });
  function review(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setError("");
    const payload = JSON.stringify(values);
    if (request.current?.payload !== payload) request.current = { payload, id: crypto.randomUUID() };
    const validated = validatePartnerProvisioningInput({ ...values, idempotencyKey: request.current.id });
    if (!validated.ok) {
      setError(validated.error);
      const field = event.currentTarget.elements.namedItem(validated.field ?? "");
      if (field instanceof HTMLElement) field.focus();
      return;
    }
    setReviewing(true);
  }
  async function create() {
    if (!request.current || inFlight.current) return;
    inFlight.current = true; setBusy(true); setError("");
    try {
      const response = await fetch("/api/internal/partners/provisioning", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ ...values, idempotencyKey: request.current.id }) });
      const body = await response.json();
      if (!response.ok || body.ok !== true || !body.result?.partnerSlug) throw new Error(body.message ?? "Creation could not be confirmed. Retry this request to check its original result.");
      created.current = true;
      router.push(`/internal/partners/onboarding/${encodeURIComponent(body.result.partnerSlug)}?created=1#configure-program`);
    } catch (failure) { setError(failure instanceof Error ? failure.message : "Creation could not be confirmed. Retry with this same request; it cannot create a second program."); setBusy(false); }
    finally { inFlight.current = false; }
  }
  const field = (key: "organizationName" | "legalOrganizationName" | "programName" | "website" | "administratorName" | "administratorEmail", label: string, required = false) => <label className="block font-bold">{label}<input name={key} className={control} type={key === "website" ? "url" : key === "administratorEmail" ? "email" : "text"} maxLength={key === "website" ? 2048 : key === "administratorEmail" ? 254 : 200} value={values[key]} required={required} onChange={event => set(key, event.target.value)} /></label>;
  return <section className="rounded-xl border bg-white p-5 sm:p-8" data-provisioning-state={reviewing ? "review" : "details"}>
    <h2 ref={heading} tabIndex={-1} className="text-2xl font-bold">{reviewing ? "Review your program" : "Program details"}</h2>
    {error ? <p role="alert" className="mt-4 rounded border border-orange p-4">{error}</p> : null}
    {reviewing ? <>
      <dl className="mt-5 grid gap-4 sm:grid-cols-2">{Object.entries({ Organization: values.organizationName, "Legal identity": values.legalOrganizationName, Program: values.programName, Operator: managed ? "LegalEase" : "Partner-managed", Jurisdictions: programServiceArea(values.jurisdictions), Languages: values.enableSpanish ? "English / Español" : "English", "Starting services": "Screening only", "Starting template": "Approved standard bilingual screening · v1", "Page address": `/p/${values.partnerSlug}`, "Administrator contact": values.administratorEmail ? `${values.administratorName} · ${values.administratorEmail}` : "No external administrator required" }).map(([label, value]) => <div key={label}><dt className="text-sm font-bold">{label}</dt><dd className="mt-1 break-words">{value}</dd></div>)}</dl>
      <p className="mt-5">Create one private program with these approved defaults, then review its configuration and materials. Invitations, publication, agreements, and packet funding require their actual authorized actions.</p>
      <div className="mt-6 flex flex-wrap gap-3"><button type="button" className={`${button} bg-navy text-white`} disabled={busy} onClick={create}>{busy ? "Creating program…" : error ? "Retry creation" : "Create program"}</button><button type="button" disabled={busy} className={button} onClick={() => { setReviewing(false); setError(""); }}>Edit details</button><Link className={button} href="/internal/partners/onboarding">Cancel</Link></div>
    </> : <form onSubmit={review} className="mt-5 space-y-6">
      <label className="block font-bold">Program operator<select aria-label="Program operator" name="operatingModel" className={control} value={values.operatingModel} required onChange={event => set("operatingModel", event.target.value)}><option value="">Choose the actual operator</option><option value="legalease_managed">LegalEase-managed</option><option value="partner_managed">Partner-managed</option></select></label>
      <div className="grid gap-5 sm:grid-cols-2">{field("organizationName", "Public organization name", true)}{field("legalOrganizationName", "Legal organization name", true)}{field("programName", "Program name", true)}{field("website", "Organization website (optional)")}
        <label className="block font-bold sm:col-span-2">Participant page address<input name="partnerSlug" aria-describedby="program-page-help" className={control} value={values.partnerSlug} maxLength={120} required onChange={event => set("partnerSlug", event.target.value.trim().toLowerCase())} /><span id="program-page-help" className="mt-2 block break-words text-sm font-normal">/p/{values.partnerSlug || "your-program"} · {values.partnerSlug ? partnerPageNameError(values.partnerSlug) || "Available for duplicate check on creation." : "Use lowercase letters, numbers, and hyphens."}</span></label>
      </div>
      <JurisdictionPicker value={values.jurisdictions} onChange={codes => set("jurisdictions", codes)} />
      <label className="flex min-h-11 items-center gap-3 font-bold"><input type="checkbox" checked={values.enableSpanish} onChange={event => set("enableSpanish", event.target.checked)} />Enable English and Spanish</label>
      <section className="rounded-lg bg-slate-50 p-4"><h3 className="font-bold">Approved standard bilingual screening · v1</h3><p className="mt-2 text-sm">Starts with free screening, online participation, open access, standard public messaging, and LegalEase support. Customize these values in Configure. No contacts, memberships, agreements, consent, or packet funding are copied.</p></section>
      {values.operatingModel && !managed ? <fieldset className="grid gap-5 rounded-lg border p-4 sm:grid-cols-2"><legend className="px-2 font-bold">First Partner Administrator</legend>{field("administratorName", "Administrator name", true)}{field("administratorEmail", "Administrator work email", true)}<p className="text-sm sm:col-span-2">A contact is recorded now. Send the actual invitation from this program when ready.</p></fieldset> : null}
      <details><summary className="min-h-11 cursor-pointer py-3 font-bold">Program purpose</summary><label className="block font-bold">Purpose<textarea name="programPurpose" className={control} rows={2} maxLength={2000} value={values.programPurpose} onChange={event => set("programPurpose", event.target.value)} /></label></details>
      <label className="block font-bold">Internal creation reason<textarea name="clearanceReason" className={control} required minLength={10} maxLength={2000} rows={2} value={values.clearanceReason} onChange={event => set("clearanceReason", event.target.value)} /><span className="mt-2 block text-sm font-normal">Record the actual basis for creating this program. This is private audit context.</span></label>
      <div className="flex flex-wrap gap-3"><button className={`${button} bg-navy text-white`}>Review program</button><Link className={button} href="/internal/partners/onboarding">Cancel</Link></div>
    </form>}
  </section>;
}
