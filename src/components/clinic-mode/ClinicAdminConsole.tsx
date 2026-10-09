"use client";

import { ClinicText, useClinicText } from "./ClinicText";

import Link from "next/link";
import { clinicEventTime } from "@/lib/clinic-mode/event-time";
import { useRouter } from "next/navigation";
import { useState, useSyncExternalStore, type FormEvent } from "react";
import type { ClinicEvent, ClinicEventStatus, ClinicEventWorkspace, ClinicProgramOption } from "@/lib/clinic-mode/types";

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
  const [busy, setBusy] = useState(false);
  const [selectedPartner, setSelectedPartner] = useState(partnerSlug ?? (internal ? "" : programs[0]?.slug ?? ""));
  const browserTimezone = useSyncExternalStore(subscribeToTimezone, readTimezone, serverTimezone);
  const [chosenTimezone, setTimezone] = useState<string | null>(null);
  const timezone = chosenTimezone ?? browserTimezone;
  const program = programs.find(option => option.slug === selectedPartner);
  const detailBase = internal ? "/internal/clinic" : "/partner/clinic";

  async function submit(path: string, init: RequestInit, success: (body: Record<string, unknown>) => string) {
    setBusy(true);
    setNotice("");
    try {
      const response = await fetch(path, { ...init, headers: { "content-type": "application/json", ...(init.headers ?? {}) } });
      const body = await response.json() as Record<string, unknown>;
      if (!response.ok) throw new Error(typeof body.error === "string" ? body.error : "Clinic request failed.");
      setNotice(success(body));
      if (typeof body.eventId !== "string" && !(body.accessCode && typeof body.accessCode === "object")) router.refresh();
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Clinic request failed.");
    } finally {
      setBusy(false);
    }
  }

  async function createEvent(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    let startsAt: string, endsAt: string;
    try { startsAt = clinicEventTime(value(data, "startsAt"), value(data, "timezone")); endsAt = clinicEventTime(value(data, "endsAt"), value(data, "timezone")); }
    catch (error) { setNotice(error instanceof Error ? error.message : "Check the event times."); return; }
    await submit("/api/clinic/events", {
      method: "POST",
      body: JSON.stringify({
        partnerSlug: selectedPartner || undefined,
        jurisdiction: value(data, "jurisdiction") || null,
        publicSlug: `${value(data, "name").normalize("NFKD").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0,70) || "clinic"}-${crypto.randomUUID().slice(0,8)}`, name: value(data, "name"),
        startsAt, endsAt,
        timezone: value(data, "timezone"), locationName: value(data, "locationName"),
        geography: value(data, "geography"), capacity: numberValue(data, "capacity"),
        sponsorshipAllocation: nullableNumberValue(data, "sponsorshipAllocation")
      })
    }, (body) => {
      if (typeof body.eventId === "string") window.location.assign(`${detailBase}/${encodeURIComponent(body.eventId)}`);
      return "Clinic event created. Opening event details…";
    });
  }

  async function setStatus(status: ClinicEventStatus) {
    if (!workspace) return;
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
    await submit(`/api/clinic/events/${workspace.event.id}/access-codes`, {
      method: "POST",
      body: JSON.stringify({ maxUses: nullableNumberValue(data, "maxUses"), startsAt, expiresAt })
    }, (body) => {
      const accessCode = body.accessCode as { code?: string } | undefined;
      return accessCode?.code ? `Event access code (shown once): ${accessCode.code}` : "Event access code created.";
    });
  }

  return (
    <div className="space-y-6">
      <Link prefetch={false} className="inline-flex min-h-11 items-center font-bold text-[#0F6E56]" href={internal && (partnerSlug || workspace?.event.partnerSlug) ? `/internal/partners/onboarding/${partnerSlug || workspace?.event.partnerSlug}` : "/partner/onboarding"}><ClinicText value="Back to program setup" /></Link>
      <div aria-live="polite" className={`min-h-6 rounded-md px-3 py-2 text-sm font-semibold ${notice ? "border border-[#DCC9B8] bg-[#FFF7ED] text-[#8A3C1F]" : "text-transparent"}`}>
        {text(notice || "No update")}
      </div>

      {!workspace ? (
        <section className="grid gap-6 xl:grid-cols-[0.9fr_1.3fr]">
          <form onSubmit={createEvent} className="rounded-xl border border-[#E8DED3] bg-white p-5 shadow-sm">
            <p className="text-xs font-black uppercase tracking-[0.18em] text-[#127256]"><ClinicText value="Event control" /></p>
            <h2 className="mt-2 text-xl font-black text-[#0F1E3D]"><ClinicText value="Create clinic event" /></h2>
            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              {internal ? <label className="block text-sm font-bold"><ClinicText value="Partner" /><select name="partnerSlug" className={inputClass} required value={selectedPartner} onChange={event => setSelectedPartner(event.target.value)}><option value=""><ClinicText value="Select a partner" /></option>{programs.map(option => <option key={option.slug} value={option.slug}>{option.name}</option>)}</select></label> : null}
              <Field label="Event name" name="name" required wide />
              <Field label="Starts" name="startsAt" type="datetime-local" required />
              <Field label="Ends" name="endsAt" type="datetime-local" required />
              <label className="block text-sm font-bold"><ClinicText value="Timezone" /><select name="timezone" className={inputClass} value={timezone} onChange={event => setTimezone(event.target.value)}>{TIMEZONES.map(([zone,label]) => <option key={zone} value={zone}>{text(label)}</option>)}{!TIMEZONES.some(([zone]) => zone === timezone) ? <option value={timezone}>{timezone.replaceAll("_", " ").split("/").at(-1)}</option> : null}</select></label>
              <Field label="Location" name="locationName" required />
              <Field key={`geography-${selectedPartner}`} label="Geography" name="geography" defaultValue={program?.geography ?? ""} placeholder={text("City, county, or statewide")} required />
              <label key={`jurisdiction-${selectedPartner}`} className="block text-sm font-bold"><ClinicText value="Participant state" /><select name="jurisdiction" className={inputClass} defaultValue={program?.jurisdictions.length === 1 ? program.jurisdictions[0] : ""}><option value=""><ClinicText value="Participants choose their state" /></option>{jurisdictionOptions.map(option => <option key={option.code} value={option.code}>{option.name}</option>)}</select></label>
              <Field label="Capacity" name="capacity" type="number" min="1" required />
              <details className="sm:col-span-2"><summary className="min-h-11 cursor-pointer font-bold"><ClinicText value="Event sponsorship limit (optional)" /></summary><p className="my-2 text-sm"><ClinicText value="This limit does not add funding or grant packet credits." /></p><Field label="Sponsored packet allocation" name="sponsorshipAllocation" type="number" min="0" /></details>
            </div>
            <button disabled={busy} className="mt-5 min-h-11 rounded-md bg-[#0F1E3D] px-5 py-2 text-sm font-bold text-white hover:bg-[#1F365F] disabled:opacity-50">
              <ClinicText value="Create clinic event" />
            </button>
          </form>

          <EventList events={events} detailBase={detailBase} programs={programs} />
        </section>
      ) : (
        <section className="space-y-6">
          <EventHeader workspace={workspace} detailBase={detailBase} busy={busy} setStatus={setStatus} />
          <div className="grid gap-6 xl:grid-cols-2">
            <form onSubmit={saveStaff} className="rounded-xl border border-[#E8DED3] bg-white p-5 shadow-sm">
              <p className="text-xs font-black uppercase tracking-[0.18em] text-[#127256]"><ClinicText value="Event team" /></p>
              <h2 className="mt-2 text-xl font-black text-[#0F1E3D]"><ClinicText value="Approved event staff" /></h2>
              <label className="mt-4 block text-sm font-bold text-[#0F1E3D]"><ClinicText value="Staff email" />
                <select aria-label={text("Staff email")} name="partnerUserId" required className={inputClass} value={selectedStaff} onChange={event => setSelectedStaff(event.target.value)}>
                  <option value="" disabled><ClinicText value="Select a team member" /></option>
                  {(workspace.staffOptions ?? []).map(member => <option key={member.id} value={member.id}>{member.email}</option>)}
                </select>
              </label>
              {!workspace.staffOptions?.length ? <p className="mt-2 text-sm"><ClinicText value="No active team members are available." /><Link prefetch={false} className="underline" href={internal ? `/internal/partners/provisioning/${workspace.event.partnerSlug}` : "/partner/team"}><ClinicText value="Manage partner team" /></Link></p> : null}
              <label className="mt-4 block text-sm font-bold text-[#0F1E3D]"><ClinicText value="Staff status" />
                <select aria-label={text("Staff status")} key={`status-${selectedStaff}`} name="staffStatus" className={inputClass} defaultValue={staffRecord?.status ?? "approved"}><option value="approved"><ClinicText value="Approved" /></option><option value="suspended"><ClinicText value="Suspended" /></option><option value="revoked"><ClinicText value="Revoked" /></option></select>
              </label>
              <fieldset key={`permissions-${selectedStaff}`} className="mt-4"><legend className="text-sm font-bold text-[#0F1E3D]"><ClinicText value="Event-only permissions" /></legend>
                <div className="mt-2 grid grid-cols-2 gap-2">{["assist","queue","follow_up","reporting","incident"].map((permission) => <label key={permission} className="flex items-center gap-2 text-sm text-[#5C5750]"><input type="checkbox" name="permissions" value={permission} defaultChecked={staffRecord ? staffRecord.permissions.includes(permission as typeof staffRecord.permissions[number]) : permission === "assist" || permission === "queue"} /><ClinicText value={PERMISSION_LABELS[permission]} /></label>)}</div>
              </fieldset>
              <button disabled={busy} className="mt-5 min-h-11 rounded-md bg-[#0F1E3D] px-5 py-2 text-sm font-bold text-white disabled:opacity-50"><ClinicText value="Save staff authorization" /></button>
              <div className="mt-5 divide-y divide-[#EEE6DB] border-t border-[#EEE6DB]">{workspace.staff.map((staff) => <div key={staff.id} className="py-3 text-sm"><p className="font-bold text-[#0F1E3D]">{workspace.staffOptions?.find(member => member.id === staff.partnerUserId)?.email ?? "Former team member"}</p><p className="text-[#6B625B]">{text(staff.status)} · {staff.permissions.map(permission => text(PERMISSION_LABELS[permission] ?? permission.replaceAll("_", " "))).join(", ")}</p></div>)}</div>
            </form>

            <form onSubmit={createCode} className="rounded-xl border border-[#E8DED3] bg-white p-5 shadow-sm">
              <p className="text-xs font-black uppercase tracking-[0.18em] text-[#A8431F]"><ClinicText value="Reveal once" /></p>
              <h2 className="mt-2 text-xl font-black text-[#0F1E3D]"><ClinicText value="Event access code" /></h2>
              <p className="mt-2 text-sm leading-6 text-[#5C5750]"><ClinicText value="The QR identifies this event. Participants enter the separate code after opening the event page, so the QR never carries a reusable secret." /></p>
              <details className="mt-4"><summary className="min-h-11 cursor-pointer font-bold"><ClinicText value="Optional code limits and schedule" /></summary><p className="text-sm">{text("Times use the event timezone.")}</p><div className="mt-4 grid gap-4 sm:grid-cols-2"><Field label="Maximum uses" name="maxUses" type="number" min="1" /><Field label="Code starts" name="codeStartsAt" type="datetime-local" /><Field label="Code expires" name="codeExpiresAt" type="datetime-local" /></div></details>
              <button disabled={busy} className="mt-5 min-h-11 rounded-md bg-[#B04A26] px-5 py-2 text-sm font-bold text-white disabled:opacity-50"><ClinicText value="Generate event access code" /></button>
              <div className="mt-5 divide-y divide-[#EEE6DB] border-t border-[#EEE6DB]">{workspace.accessCodes.map((code) => <div key={code.id} className="flex justify-between gap-4 py-3 text-sm"><span className="font-bold text-[#0F1E3D]">Ends in {code.codeHint}</span><span className="text-[#6B625B]">{code.usesCount}/{code.maxUses ?? "unlimited"}</span></div>)}</div>
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
  return <section className="rounded-xl border border-[#D9E5DF] bg-[#F3F8F5] p-5">
    <div className="flex flex-wrap justify-between gap-3">
      <Link prefetch={false} href={detailBase} className="inline-flex min-h-11 items-center text-sm font-bold text-[#0F6E56]"><ClinicText value="Back to Clinic Mode" /></Link>
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
        <a href={workspace.entryUrl} className="mt-3 block min-h-11 break-all text-sm font-bold text-[#0F6E56]">{workspace.entryUrl}</a>
      </div>
      {/* The generated data URL stays local and contains only the public event link. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={workspace.qrDataUrl} alt={`QR code for ${event.name}`} className="h-40 w-40 rounded-md border bg-white p-2" />
    </div>
    <div className="mt-5 flex flex-wrap gap-2">
      {event.status === "draft" ? <StatusButton label="Open clinic" status="published" disabled={busy} onClick={setStatus} /> : null}
      {event.status === "published" ? <StatusButton label="Pause event" status="paused" disabled={busy} onClick={setStatus} /> : null}
      {event.status === "paused" ? <StatusButton label="Resume event" status="published" disabled={busy} onClick={setStatus} /> : null}
      {["published", "paused"].includes(event.status) ? <StatusButton label="Close event" status="closed" disabled={busy} onClick={setStatus} /> : null}
      {event.status === "closed" ? <StatusButton label="Archive event" status="archived" disabled={busy} onClick={setStatus} /> : null}
    </div>
    <details className="mt-5"><summary className="min-h-11 cursor-pointer font-bold"><ClinicText value="Other event tools" /></summary>
      <p className="text-sm"><ClinicText value="Legal aid registration is a separate workflow with its own permissions." /></p>
      <Link prefetch={false} href={`${detailBase}/${event.id}/legal-aid`} className="inline-flex min-h-11 items-center underline"><ClinicText value="Legal aid clinic setup" /></Link>
    </details>
  </section>;
}

function StatusButton({ label, status, disabled, onClick }: { label: string; status: ClinicEventStatus; disabled: boolean; onClick: (status: ClinicEventStatus) => void }) {
  return <button type="button" disabled={disabled} onClick={() => onClick(status)} className="min-h-11 rounded-md border border-[#0F1E3D] px-4 py-2 text-sm font-bold text-[#0F1E3D] hover:bg-white disabled:cursor-not-allowed disabled:opacity-35"><ClinicText value={label} /></button>;
}

function EventList({ events, detailBase, programs }: { events: ClinicEvent[]; detailBase: string; programs: ClinicProgramOption[] }) {
  return <section className="rounded-xl border border-[#E8DED3] bg-white p-5 shadow-sm"><div className="flex items-end justify-between gap-3"><div><p className="text-xs font-black uppercase tracking-[0.18em] text-[#A8431F]"><ClinicText value="Event overview" /></p><h2 className="mt-2 text-xl font-black text-[#0F1E3D]"><ClinicText value="Clinic events" /></h2></div><span className="text-3xl font-black text-[#0F1E3D]">{events.length}</span></div><div className="mt-5 divide-y divide-[#EEE6DB]">{events.length ? events.map((event) => <Link prefetch={false} key={event.id} href={`${detailBase}/${event.id}`} className="grid gap-2 py-4 hover:bg-[#FBF7F2] sm:grid-cols-[1fr_auto]"><div><p className="font-black text-[#0F1E3D]">{event.name}</p><p className="mt-1 text-sm text-[#6B625B]">{programs.find(program => program.slug === event.partnerSlug)?.name} · {event.locationName} · <ClinicText value="Capacity" /> {event.capacity}</p></div><div className="text-sm font-bold text-[#0F6E56]"><ClinicText value={event.status} /><br /><span className="font-normal text-[#6B625B]">{formatDate(event.startsAt, event.timezone)}</span></div></Link>) : <p className="py-8 text-sm text-[#6B625B]"><ClinicText value="No Clinic events exist for this authorized scope." /></p>}</div></section>;
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
