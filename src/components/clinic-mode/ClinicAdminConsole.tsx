"use client";

import { ClinicText, useClinicText } from "./ClinicText";

import Link from "next/link";
import { clinicEventTime } from "@/lib/clinic-mode/event-time";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useSyncExternalStore, type FormEvent } from "react";
import type { ClinicEvent, ClinicEventStatus, ClinicEventWorkspace, ClinicProgramOption } from "@/lib/clinic-mode/types";
import { PROGRAM_JURISDICTIONS } from "@/lib/partners/onboarding/program-defaults";

type Props = {
  events: ClinicEvent[];
  workspace?: ClinicEventWorkspace;
  internal: boolean;
  partnerSlug?: string;
  programs?: ClinicProgramOption[];
  jurisdictionOptions?: readonly {code: string; name: string}[];
};

export function ClinicAdminConsole({ events, workspace, internal, partnerSlug, programs = [], jurisdictionOptions = [] }: Props) {
  const text = useClinicText();
  const router = useRouter();
  const [selectedStaff, setSelectedStaff] = useState("");
  const staffRecord = workspace?.staff.find(staff => staff.partnerUserId === selectedStaff);
  const [notice, setNotice] = useState("");
  const [revealedCode,setRevealedCode]=useState("");
  const [busy, setBusy] = useState(false);
  const inFlight = useRef(false);
  const draftChanged = useRef(false);
  useEffect(() => {
    if (workspace) return;
    const unload = (event: BeforeUnloadEvent) => { if (draftChanged.current) event.preventDefault(); };
    const navigate = (event: MouseEvent) => {
      if (!draftChanged.current || event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      const link = event.target instanceof Element ? event.target.closest<HTMLAnchorElement>("a[href]") : null;
      if (!link || link.target === "_blank") return;
      const next = new URL(link.href, location.href);
      if (next.origin === location.origin && next.pathname === location.pathname && next.search === location.search) return;
      if (!window.confirm(text("Leave without creating this clinic? Your unsaved event details will be discarded."))) { event.preventDefault(); event.stopPropagation(); }
    };
    window.addEventListener("beforeunload", unload); document.addEventListener("click", navigate, true);
    return () => { window.removeEventListener("beforeunload", unload); document.removeEventListener("click", navigate, true); };
  }, [workspace, text]);
  const eventRequest = useRef<{ payload: string; slug: string } | null>(null);
  const codeRequest = useRef<{ payload: string; id: string } | null>(null);
  const [selectedPartner, setSelectedPartner] = useState(partnerSlug ?? (internal ? "" : programs[0]?.slug ?? ""));
  const browserTimezone = useSyncExternalStore(subscribeToTimezone, readTimezone, serverTimezone);
  const [chosenTimezone, setTimezone] = useState<string | null>(null);
  const timezone = chosenTimezone ?? browserTimezone;
  const program = programs.find(option => option.slug === selectedPartner);
  const detailBase = internal ? "/internal/clinic" : "/partner/clinic";

  async function submit(path: string, init: RequestInit, success: (body: Record<string, unknown>) => string) {
    if (inFlight.current) return false;
    inFlight.current = true;
    setBusy(true);
    setNotice("");
    try {
      const response = await fetch(path, { ...init, headers: { "content-type": "application/json", ...(init.headers ?? {}) } });
      const body = await response.json() as Record<string, unknown>;
      if (!response.ok) throw new Error(typeof body.error === "string" ? body.error : "Clinic request failed.");
      setNotice(success(body));
      if (typeof body.eventId !== "string" && !(body.accessCode && typeof body.accessCode === "object")) router.refresh();
      return true;
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Clinic request failed.");
      return false;
    } finally {
      inFlight.current = false;
      setBusy(false);
    }
  }

  async function createEvent(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    if (!program?.canCreate) { setNotice(program?.creationIssue ?? "Select an authorized program before creating a clinic."); return; }
    let startsAt: string, endsAt: string;
    try { startsAt = clinicEventTime(value(data, "startsAt"), value(data, "timezone")); endsAt = clinicEventTime(value(data, "endsAt"), value(data, "timezone")); }
    catch (error) { setNotice(error instanceof Error ? error.message : "Check the event times."); return; }
    if (Date.parse(endsAt) <= Date.parse(startsAt)) { setNotice("The end time must be after the start time."); return; }
    const payload = JSON.stringify([selectedPartner, ...data.entries()]);
    if (eventRequest.current?.payload !== payload) eventRequest.current = { payload, slug: `${value(data, "name").normalize("NFKD").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0,70) || "clinic"}-${crypto.randomUUID().slice(0,8)}` };
    await submit("/api/clinic/events", {
      method: "POST",
      body: JSON.stringify({
        partnerSlug: selectedPartner || undefined,
        jurisdiction: value(data, "jurisdiction") || null,
        publicSlug: eventRequest.current.slug, name: value(data, "name"),
        startsAt, endsAt,
        timezone: value(data, "timezone"), locationName: value(data, "locationName"),
        geography: value(data, "geography"), capacity: numberValue(data, "capacity"),
        sponsorshipAllocation: nullableNumberValue(data, "sponsorshipAllocation")
      })
    }, (body) => {
      if (typeof body.eventId !== "string") throw new Error("Clinic creation could not be confirmed. Retry this same request.");
      draftChanged.current = false;
      router.push(`${detailBase}/${encodeURIComponent(body.eventId)}`);
      return "Clinic event created. Opening event details…";
    });
  }

  async function setStatus(status: ClinicEventStatus) {
    if (!workspace) return;
    if(status==="closed"&&!window.confirm(text("Close this event and end active assistance sessions? Participant-owned matters and authorized follow-up are preserved.")))return;
    await submit(`/api/clinic/events/${workspace.event.id}`, { method: "PATCH", body: JSON.stringify({ status }) }, () => `Event moved to ${status}.`);
  }

  async function saveStaff(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!workspace) return;
    const data = new FormData(event.currentTarget);
    await submit(`/api/clinic/events/${workspace.event.id}/staff`, {
      method: "POST",
      body: JSON.stringify({
        partnerUserId: value(data, "partnerUserId"), status: value(data, "staffStatus"),
        permissions: data.getAll("permissions").map(String)
      })
    }, () => "Approved event staff updated.");
  }

  async function createCode(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!workspace) return;
    const data = new FormData(event.currentTarget);
    let startsAt: string | null, expiresAt: string | null;
    try {
      startsAt = value(data, "codeStartsAt") ? clinicEventTime(value(data, "codeStartsAt"), workspace.event.timezone) : null;
      expiresAt = value(data, "codeExpiresAt") ? clinicEventTime(value(data, "codeExpiresAt"), workspace.event.timezone) : null;
    } catch (error) { setNotice(error instanceof Error ? error.message : "Check the event times."); return; }
    const limits = { maxUses: nullableNumberValue(data, "maxUses"), startsAt, expiresAt };
    const payload = JSON.stringify(limits);
    if (codeRequest.current?.payload !== payload) codeRequest.current = { payload, id: crypto.randomUUID() };
    const saved = await submit(`/api/clinic/events/${workspace.event.id}/access-codes`, {
      method: "POST",
      body: JSON.stringify({ ...limits, requestId: codeRequest.current.id })
    }, (body) => {
      const accessCode = body.accessCode as { code?: string } | undefined;
      if(!accessCode?.code)throw new Error("The generated code could not be read back. Retry this same request.");
      setRevealedCode(accessCode.code);
      return "Event access code created. Copy it before leaving this page.";
    });
    if (saved) { codeRequest.current = null; router.refresh(); }
  }

  return (
    <div className="space-y-6">
      <Link prefetch={false} className="inline-flex min-h-11 items-center font-bold text-[#0F6E56]" href={internal ? partnerSlug || workspace?.event.partnerSlug ? `/internal/partners/onboarding/${partnerSlug || workspace?.event.partnerSlug}` : "/internal/partners/onboarding" : "/partner/dashboard"}><ClinicText value="Back to program" /></Link>
      {revealedCode?<div className="rounded border bg-white p-4"><p><ClinicText value="Event access code (shown once):"/> <code className="select-all break-all font-bold">{revealedCode}</code></p><button type="button" className="min-h-11 underline" onClick={async()=>{try{await navigator.clipboard.writeText(revealedCode);setNotice('Code copied.');}catch{setNotice('Select the code above and copy it.');}}}><ClinicText value="Copy code"/></button></div>:null}
      <div aria-live="polite" className={`min-h-6 rounded-md px-3 py-2 text-sm font-semibold ${notice ? "border border-[#DCC9B8] bg-[#FFF7ED] text-[#8A3C1F]" : "text-transparent"}`}>
        {text(notice || "No update")}
      </div>

      {!workspace ? (
        <section className="grid gap-6 xl:grid-cols-[0.9fr_1.3fr]">
          <form id="create-clinic" tabIndex={-1} onChange={() => { draftChanged.current = true; }} onSubmit={createEvent} className="scroll-mt-32 rounded-xl border border-[#E8DED3] bg-white p-5 shadow-sm">
            <p className="text-xs font-black uppercase tracking-[0.18em] text-[#127256]"><ClinicText value="Event control" /></p>
            <h2 className="mt-2 text-xl font-black text-[#0F1E3D]"><ClinicText value="Create clinic event" /></h2>
            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              {internal ? <label className="block text-sm font-bold"><ClinicText value="Partner" /><select name="partnerSlug" className={inputClass} required value={selectedPartner} onChange={event => setSelectedPartner(event.target.value)}><option value=""><ClinicText value="Select a partner" /></option>{programs.map(option => <option key={option.slug} value={option.slug}>{option.name}</option>)}</select></label> : null}
              {!program?.canCreate ? <div role="status" className="rounded border border-orange/40 bg-orange/5 p-4 sm:col-span-2"><p>{text(program?.creationIssue ?? "Select an authorized program before creating a clinic.")}</p>{program ? <Link className="mt-2 inline-flex min-h-11 items-center underline" href={internal ? `/internal/partners/onboarding/${program.slug}#configure-program` : "/partner/settings?step=program"}><ClinicText value="Review program settings" /></Link> : null}</div> : null}
              <fieldset disabled={busy || !program?.canCreate} className="contents">
              <Field label="Event name" name="name" required wide />
              <Field label="Starts" name="startsAt" type="datetime-local" required />
              <Field label="Ends" name="endsAt" type="datetime-local" required />
              <label className="block text-sm font-bold"><ClinicText value="Timezone" /><select name="timezone" className={inputClass} value={timezone} onChange={event => setTimezone(event.target.value)}>{TIMEZONES.map(([zone,label]) => <option key={zone} value={zone}>{text(label)}</option>)}{!TIMEZONES.some(([zone]) => zone === timezone) ? <option value={timezone}>{timezone.replaceAll("_", " ").split("/").at(-1)}</option> : null}</select></label>
              <Field label="Location" name="locationName" required />
              <input type="hidden" name="geography" value={program?.geography??""}/><p className="text-sm">{program?.name} · {program?.geography}</p>
              {program?.jurisdictions.length===1?<div className="text-sm"><p className="font-bold"><ClinicText value="Participant state"/></p><p>{PROGRAM_JURISDICTIONS[program.jurisdictions[0]]??program.jurisdictions[0]}</p><input type="hidden" name="jurisdiction" value={program.jurisdictions[0]}/></div>:<label className="block text-sm font-bold"><ClinicText value="Participant state"/><select key={selectedPartner} name="jurisdiction" className={inputClass} required><option value="">{text("Select a state")}</option>{jurisdictionOptions.filter(j=>program?.jurisdictions.includes(j.code)).map(j=><option key={j.code} value={j.code}>{j.name}</option>)}</select></label>}
              <Field label="Capacity" name="capacity" type="number" min="1" required />
              <p className="text-sm sm:col-span-2"><ClinicText value="Capacity limits event intake. It does not grant packet funding. The new event stays a draft until you choose Open clinic." /></p>
              {program?.canSponsor ? <details className="sm:col-span-2"><summary className="min-h-11 cursor-pointer font-bold"><ClinicText value="Event sponsorship limit (optional)" /></summary><p className="my-2 text-sm"><ClinicText value="This limit does not add funding or grant packet credits." /></p><Field label="Sponsored packet allocation" name="sponsorshipAllocation" type="number" min="0" /></details> : null}
              </fieldset>
            </div>
            <button disabled={busy || !program?.canCreate} className="mt-5 min-h-11 rounded-md bg-[#0F1E3D] px-5 py-2 text-sm font-bold text-white hover:bg-[#1F365F] disabled:opacity-50">
              <ClinicText value={busy ? "Creating clinic…" : "Create clinic event"} />
            </button>
            <Link className="ml-4 inline-flex min-h-11 items-center underline" href={internal ? selectedPartner ? `/internal/partners/onboarding/${selectedPartner}` : "/internal/partners/onboarding" : "/partner/dashboard"}><ClinicText value="Cancel" /></Link>
          </form>

          <EventList events={events} detailBase={detailBase} programs={programs} />
        </section>
      ) : (
        <section className="space-y-6">
          <EventHeader workspace={workspace} detailBase={detailBase} busy={busy} setStatus={setStatus} />
          <div className="grid gap-6 xl:grid-cols-2">
            <form id="clinic-staff" tabIndex={-1} onSubmit={saveStaff} className="rounded-xl border border-[#E8DED3] bg-white p-5 shadow-sm">
              <p className="text-xs font-black uppercase tracking-[0.18em] text-[#127256]"><ClinicText value="Event team" /></p>
              <h2 className="mt-2 text-xl font-black text-[#0F1E3D]"><ClinicText value="Approved event staff" /></h2>
              <label className="mt-4 block text-sm font-bold text-[#0F1E3D]"><ClinicText value="Staff email" />
                <select aria-label={text("Staff email")} name="partnerUserId" required className={inputClass} value={selectedStaff} onChange={event => setSelectedStaff(event.target.value)}>
                  <option value="" disabled><ClinicText value="Select a team member" /></option>
                  {(workspace.staffOptions ?? []).map(member => <option key={member.id} value={member.id}>{member.email}</option>)}
                </select>
              </label>
              {!workspace.staffOptions?.length ? <p className="mt-2 text-sm"><ClinicText value="No active team members are available." /><Link prefetch={false} className="underline" href={internal ? `/internal/partners/onboarding/${workspace.event.partnerSlug}#program-team` : "/partner/team"}><ClinicText value="Manage partner team" /></Link></p> : null}
              <label className="mt-4 block text-sm font-bold text-[#0F1E3D]"><ClinicText value="Staff status" />
                <select aria-label={text("Staff status")} key={`status-${selectedStaff}`} name="staffStatus" className={inputClass} defaultValue={staffRecord?.status ?? "approved"}><option value="approved"><ClinicText value="Approved" /></option><option value="suspended"><ClinicText value="Suspended" /></option><option value="revoked"><ClinicText value="Revoked" /></option></select>
              </label>
              <fieldset key={`permissions-${selectedStaff}`} className="mt-4"><legend className="text-sm font-bold text-[#0F1E3D]"><ClinicText value="Event-only permissions" /></legend>
                <div className="mt-2 grid grid-cols-2 gap-2">{["assist","queue","follow_up","reporting","incident"].map((permission) => <label key={permission} className="flex items-center gap-2 text-sm text-[#5C5750]"><input type="checkbox" name="permissions" value={permission} defaultChecked={staffRecord ? staffRecord.permissions.includes(permission as typeof staffRecord.permissions[number]) : permission === "assist" || permission === "queue"} /><ClinicText value={PERMISSION_LABELS[permission]} /></label>)}</div>
              </fieldset>
              <button disabled={busy} className="mt-5 min-h-11 rounded-md bg-[#0F1E3D] px-5 py-2 text-sm font-bold text-white disabled:opacity-50"><ClinicText value="Save staff authorization" /></button>
              <div className="mt-5 divide-y divide-[#EEE6DB] border-t border-[#EEE6DB]">{workspace.staff.map((staff) => <div key={staff.id} className="py-3 text-sm"><p className="font-bold text-[#0F1E3D]">{workspace.staffOptions?.find(member => member.id === staff.partnerUserId)?.email ?? "Former team member"}</p><p className="text-[#6B625B]">{text(staff.status)} · {staff.permissions.map(permission => text(PERMISSION_LABELS[permission] ?? permission.replaceAll("_", " "))).join(", ")}</p></div>)}</div>
            </form>

            <form id="clinic-codes" tabIndex={-1} onSubmit={createCode} className="rounded-xl border border-[#E8DED3] bg-white p-5 shadow-sm">
              <p className="text-xs font-black uppercase tracking-[0.18em] text-[#A8431F]"><ClinicText value="Reveal once" /></p>
              <h2 className="mt-2 text-xl font-black text-[#0F1E3D]"><ClinicText value="Event access code" /></h2>
              <p className="mt-2 text-sm leading-6 text-[#5C5750]"><ClinicText value="The QR identifies this event. Participants enter the separate code after opening the event page, so the QR never carries a reusable secret." /></p>
              <details className="mt-4"><summary className="min-h-11 cursor-pointer font-bold"><ClinicText value="Optional code limits and schedule" /></summary><p className="text-sm">{text("Times use the event timezone.")}</p><div className="mt-4 grid gap-4 sm:grid-cols-2"><Field label="Maximum uses" name="maxUses" type="number" min="1" /><Field label="Code starts" name="codeStartsAt" type="datetime-local" /><Field label="Code expires" name="codeExpiresAt" type="datetime-local" /></div></details>
              <button disabled={busy} className="mt-5 min-h-11 rounded-md bg-[#B04A26] px-5 py-2 text-sm font-bold text-white disabled:opacity-50"><ClinicText value="Generate event access code" /></button>
              <div className="mt-5 divide-y divide-[#EEE6DB] border-t border-[#EEE6DB]">{workspace.accessCodes.map((code) => <article key={code.id} className="py-3 text-sm"><h3 className="font-bold text-[#0F1E3D]">{text("Code ending in")} {code.codeHint}</h3><p className="mt-1">{text(code.isActive ? "Enabled" : "Disabled")} · {text("Uses")}: {code.usesCount}/{code.maxUses ?? text("No code limit")}</p><p className="mt-1">{text("Valid during")}: {formatDate(code.startsAt && Date.parse(code.startsAt)>Date.parse(workspace.event.startsAt) ? code.startsAt : workspace.event.startsAt,workspace.event.timezone)} – {formatDate(code.expiresAt && Date.parse(code.expiresAt)<Date.parse(workspace.event.endsAt) ? code.expiresAt : workspace.event.endsAt,workspace.event.timezone)} · {workspace.event.timezone}</p><p className="mt-1 text-[#6B625B]">{text("Entry still requires an open event and remaining event capacity.")}</p></article>)}</div>
            </form>
          </div>

          <section className="rounded-xl border border-[#E8DED3] bg-white p-5 shadow-sm"><h2 className="text-xl font-black text-[#0F1E3D]"><ClinicText value="Event incident and audit history" /></h2><div className="mt-4 divide-y divide-[#EEE6DB]">{workspace.audit.map((entry) => <div key={entry.id} className="grid gap-1 py-3 text-sm sm:grid-cols-[1fr_auto]"><span className="font-bold text-[#0F1E3D]">{entry.action.replaceAll("_", " ")}</span><time className="text-[#6B625B]">{formatDate(entry.occurredAt)}</time></div>)}</div></section>
        </section>
      )}
    </div>
  );
}

function EventHeader({ workspace, detailBase, busy, setStatus }: { workspace: ClinicEventWorkspace; detailBase: string; busy: boolean; setStatus: (status: ClinicEventStatus) => void }) {
  const event = workspace.event;
  const [copyMessage,setCopyMessage]=useState("");
  const text=useClinicText();
  return <section className="rounded-xl border border-[#D9E5DF] bg-[#F3F8F5] p-5">
    <div className="flex flex-wrap justify-between gap-3">
      <Link prefetch={false} href={`${detailBase}${detailBase.startsWith("/internal")?`?partner=${encodeURIComponent(event.partnerSlug)}`:""}`} className="inline-flex min-h-11 items-center text-sm font-bold text-[#0F6E56]"><ClinicText value="Back to Clinic Mode" /></Link>
      <div className="flex flex-wrap gap-2">
        <Link prefetch={false} href={`/clinic/staff/${event.id}/queue`} className="min-h-11 rounded-md bg-[#0F1E3D] px-4 py-2 text-sm font-bold text-white"><ClinicText value="Staff case queue" /></Link>
        <Link prefetch={false} href={`${detailBase}/${event.id}/follow-up`} className="min-h-11 rounded-md border bg-white px-4 py-2 text-sm font-bold"><ClinicText value="Follow-up" /></Link>
        <Link prefetch={false} href={`${detailBase}/${event.id}/reporting`} className="min-h-11 rounded-md border bg-white px-4 py-2 text-sm font-bold"><ClinicText value="Reporting" /></Link>
      </div>
    </div>
    <div className="mt-4 grid gap-6 lg:grid-cols-[1fr_auto]">
      <div><p className="text-xs font-black uppercase tracking-wide text-[#127256]">{workspace.partnerName} · <ClinicText value={event.status} /></p>
        <h1 className="mt-2 text-3xl font-black">{event.name}</h1>
        <p className="mt-2 text-sm">{formatDate(event.startsAt, event.timezone)} · {event.locationName}</p>
        <p className="mt-2 text-sm"><ClinicText value="Participant state" />: {event.jurisdiction ? PROGRAM_JURISDICTIONS[event.jurisdiction]??event.jurisdiction : <ClinicText value="Not configured" />}</p>
        <p className="mt-2 text-sm"><ClinicText value={event.experience === "legal_aid" ? "Legal Aid registration" : "Standard screening and assistance"} /></p>
        {event.status === "published" ? <div><a href={workspace.entryUrl} className="mt-3 block min-h-11 break-all text-sm font-bold text-[#0F6E56]">{workspace.entryUrl}</a><button type="button" className="min-h-11 underline" onClick={async()=>{try{await navigator.clipboard.writeText(workspace.entryUrl);setCopyMessage("Event link copied.");}catch{setCopyMessage("Select the event link above to copy it.");}}}>{text("Copy event link")}</button><p role="status">{text(copyMessage)}</p></div> : <p className="mt-3 text-sm"><ClinicText value="Participant entry is unavailable until this clinic is open." /></p>}
      </div>
      {/* The generated data URL stays local and contains only the public event link. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      {event.status === "published" ? <img src={workspace.qrDataUrl} alt={`QR code for ${event.name}`} className="h-40 w-40 rounded-md border bg-white p-2" /> : null}
    </div>
    {workspace.openingIssue?<div className="mt-4 rounded border bg-white p-4" role="status"><p><ClinicText value={workspace.openingIssue.reason}/></p><a className="mt-2 inline-flex min-h-11 items-center underline" href={workspace.openingIssue.destination==='clinics'?`${detailBase}${detailBase.startsWith('/internal')?`?partner=${encodeURIComponent(event.partnerSlug)}`:''}`:`#clinic-${workspace.openingIssue.destination}`} onClick={()=>document.getElementById(`clinic-${workspace.openingIssue?.destination}`)?.focus({preventScroll:true})}><ClinicText value={workspace.openingIssue.destination==='staff'?'Assign event staff':workspace.openingIssue.destination==='codes'?'Prepare event access code':'Back to Clinic Mode'}/></a></div>:null}
    <div className="mt-5 flex flex-wrap gap-2">
      {event.status === "draft" && !workspace.openingIssue ? <StatusButton label="Open clinic" status="published" disabled={busy} onClick={setStatus} /> : null}
      {event.status === "published" ? <StatusButton label="Pause event" status="paused" disabled={busy} onClick={setStatus} /> : null}
      {event.status === "paused" && !workspace.openingIssue ? <StatusButton label="Resume event" status="published" disabled={busy} onClick={setStatus} /> : null}
      {["published", "paused"].includes(event.status) ? <StatusButton label="Close event" status="closed" disabled={busy} onClick={setStatus} /> : null}
      {event.status === "closed" ? <StatusButton label="Archive event" status="archived" disabled={busy} onClick={setStatus} /> : null}
    </div>
    {event.experience === "legal_aid" || event.status === "draft" && workspace.legalAidAvailable ? <details className="mt-5"><summary className="min-h-11 cursor-pointer font-bold"><ClinicText value={event.experience === "legal_aid" ? "Legal Aid event tools" : "Choose Legal Aid registration mode"} /></summary>
      <p className="text-sm"><ClinicText value="Legal aid registration is a separate workflow with its own permissions." /></p>
      <Link prefetch={false} href={`${detailBase}/${event.id}/legal-aid`} className="inline-flex min-h-11 items-center underline"><ClinicText value="Legal aid clinic setup" /></Link>
    </details> : null}
  </section>;
}

function StatusButton({ label, status, disabled, onClick }: { label: string; status: ClinicEventStatus; disabled: boolean; onClick: (status: ClinicEventStatus) => void }) {
  return <button type="button" disabled={disabled} onClick={() => onClick(status)} className="min-h-11 rounded-md border border-[#0F1E3D] px-4 py-2 text-sm font-bold text-[#0F1E3D] hover:bg-white disabled:cursor-not-allowed disabled:opacity-35"><ClinicText value={label} /></button>;
}

function EventList({ events, detailBase, programs }: { events: ClinicEvent[]; detailBase: string; programs: ClinicProgramOption[] }) {
  return <section className="rounded-xl border border-[#E8DED3] bg-white p-5 shadow-sm"><div className="flex items-end justify-between gap-3"><div><p className="text-xs font-black uppercase tracking-[0.18em] text-[#A8431F]"><ClinicText value="Event overview" /></p><h2 className="mt-2 text-xl font-black text-[#0F1E3D]"><ClinicText value="Clinic events" /></h2></div><span className="text-3xl font-black text-[#0F1E3D]">{events.length}</span></div><div className="mt-5 divide-y divide-[#EEE6DB]">{events.length ? events.map((event) => <Link prefetch={false} key={event.id} href={`${detailBase}/${event.id}`} className="grid gap-2 py-4 hover:bg-[#FBF7F2] sm:grid-cols-[1fr_auto]"><div><p className="font-black text-[#0F1E3D]">{event.name}</p><p className="mt-1 text-sm text-[#6B625B]">{programs.find(program => program.slug === event.partnerSlug)?.name} · {event.locationName} · <ClinicText value="Capacity" /> {event.capacity}</p></div><div className="text-sm font-bold text-[#0F6E56]"><ClinicText value={event.status} /><br /><span className="font-normal text-[#6B625B]">{formatDate(event.startsAt, event.timezone)}</span></div></Link>) : <p className="py-8 text-sm text-[#6B625B]"><ClinicText value="No Clinic events exist for this authorized scope." />{programs.some(program=>program.canCreate)?<a href="#create-clinic" className="mt-2 flex min-h-11 items-center underline" onClick={()=>document.getElementById("create-clinic")?.focus({preventScroll:true})}><ClinicText value="Create first clinic"/></a>:null}</p>}</div></section>;
}

const subscribeToTimezone = () => () => {};
const readTimezone = () => Intl.DateTimeFormat().resolvedOptions().timeZone;
const serverTimezone = () => "UTC";

const PERMISSION_LABELS: Record<string, string> = {assist: "Assist participants", queue: "Manage case queue", follow_up: "Manage follow-up", reporting: "View reports", incident: "Record incidents"};
const TIMEZONES = [["America/New_York", "Eastern time"], ["America/Chicago", "Central time"], ["America/Denver", "Mountain time"], ["America/Phoenix", "Arizona time"], ["America/Los_Angeles", "Pacific time"], ["America/Anchorage", "Alaska time"], ["Pacific/Honolulu", "Hawaii time"], ["America/Puerto_Rico", "Puerto Rico time"], ["UTC", "Universal time (UTC)"]];

function Field({ label, name, type = "text", wide = false, ...inputProps }: { label: string; name: string; type?: string; wide?: boolean; [key: string]: unknown }) {
  return <label className={`block text-sm font-bold text-[#0F1E3D] ${wide ? "sm:col-span-2" : ""}`}><ClinicText value={label} /><input {...inputProps} name={name} type={type} className={inputClass} /></label>;
}

const inputClass = "mt-2 min-h-11 w-full rounded-md border border-[#CFC4B8] bg-white px-3 py-2 text-sm font-normal text-[#0F1E3D] outline-none focus:border-[#1D9E75] focus:ring-2 focus:ring-[#1D9E75]/20";
const value = (data: FormData, key: string) => String(data.get(key) ?? "").trim();
const numberValue = (data: FormData, key: string) => Number(value(data, key));
const nullableNumberValue = (data: FormData, key: string) => value(data, key) ? Number(value(data, key)) : null;

const formatDate = (date: string, timeZone = "UTC") => new Intl.DateTimeFormat("en-US", { dateStyle: "medium", timeStyle: "short", timeZone }).format(new Date(date));
