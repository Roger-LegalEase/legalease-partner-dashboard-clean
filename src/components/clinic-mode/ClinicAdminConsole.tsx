"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";
import type { ClinicEvent, ClinicEventStatus, ClinicEventWorkspace } from "@/lib/clinic-mode/types";

type Props = {
  events: ClinicEvent[];
  workspace?: ClinicEventWorkspace;
  internal: boolean;
};

export function ClinicAdminConsole({ events, workspace, internal }: Props) {
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const detailBase = internal ? "/internal/clinic" : "/partner/clinic";

  async function submit(path: string, init: RequestInit, success: (body: Record<string, unknown>) => string) {
    setBusy(true);
    setNotice("");
    try {
      const response = await fetch(path, { ...init, headers: { "content-type": "application/json", ...(init.headers ?? {}) } });
      const body = await response.json() as Record<string, unknown>;
      if (!response.ok) throw new Error(typeof body.error === "string" ? body.error : "Clinic request failed.");
      setNotice(success(body));
      if (!(body.accessCode && typeof body.accessCode === "object")) window.setTimeout(() => window.location.reload(), 500);
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Clinic request failed.");
    } finally {
      setBusy(false);
    }
  }

  async function createEvent(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    await submit("/api/clinic/events", {
      method: "POST",
      body: JSON.stringify({
        partnerSlug: value(data, "partnerSlug") || undefined,
        publicSlug: value(data, "publicSlug"), name: value(data, "name"),
        startsAt: new Date(value(data, "startsAt")).toISOString(),
        endsAt: new Date(value(data, "endsAt")).toISOString(),
        timezone: value(data, "timezone"), locationName: value(data, "locationName"),
        geography: value(data, "geography"), capacity: numberValue(data, "capacity"),
        sponsorshipAllocation: nullableNumberValue(data, "sponsorshipAllocation")
      })
    }, () => "Clinic event created.");
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
    await submit(`/api/clinic/events/${workspace.event.id}/access-codes`, {
      method: "POST",
      body: JSON.stringify({ maxUses: nullableNumberValue(data, "maxUses"), startsAt: nullableDateValue(data, "codeStartsAt"), expiresAt: nullableDateValue(data, "codeExpiresAt") })
    }, (body) => {
      const accessCode = body.accessCode as { code?: string } | undefined;
      return accessCode?.code ? `Event access code (shown once): ${accessCode.code}` : "Event access code created.";
    });
  }

  return (
    <div className="space-y-6">
      <div aria-live="polite" className={`min-h-6 rounded-md px-3 py-2 text-sm font-semibold ${notice ? "border border-[#DCC9B8] bg-[#FFF7ED] text-[#8A3C1F]" : "text-transparent"}`}>
        {notice || "No update"}
      </div>

      {!workspace ? (
        <section className="grid gap-6 xl:grid-cols-[0.9fr_1.3fr]">
          <form onSubmit={createEvent} className="rounded-xl border border-[#E8DED3] bg-white p-5 shadow-sm">
            <p className="text-xs font-black uppercase tracking-[0.18em] text-[#1D9E75]">Event control</p>
            <h2 className="mt-2 text-xl font-black text-[#0F1E3D]">Create clinic event</h2>
            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              {internal ? <Field label="Partner slug" name="partnerSlug" required /> : null}
              <Field label="Public event slug" name="publicSlug" required />
              <Field label="Event name" name="name" required wide />
              <Field label="Starts" name="startsAt" type="datetime-local" required />
              <Field label="Ends" name="endsAt" type="datetime-local" required />
              <Field label="Timezone" name="timezone" defaultValue="America/New_York" required />
              <Field label="Location" name="locationName" required />
              <Field label="Geography" name="geography" placeholder="City, county, or statewide" required />
              <Field label="Capacity" name="capacity" type="number" min="1" required />
              <Field label="Sponsored packet allocation" name="sponsorshipAllocation" type="number" min="0" />
            </div>
            <button disabled={busy} className="mt-5 min-h-11 rounded-md bg-[#0F1E3D] px-5 py-2 text-sm font-bold text-white hover:bg-[#1F365F] disabled:opacity-50">
              Create clinic event
            </button>
          </form>

          <EventList events={events} detailBase={detailBase} />
        </section>
      ) : (
        <section className="space-y-6">
          <EventHeader workspace={workspace} detailBase={detailBase} busy={busy} setStatus={setStatus} />
          <div className="grid gap-6 xl:grid-cols-2">
            <form onSubmit={saveStaff} className="rounded-xl border border-[#E8DED3] bg-white p-5 shadow-sm">
              <p className="text-xs font-black uppercase tracking-[0.18em] text-[#1D9E75]">Least privilege</p>
              <h2 className="mt-2 text-xl font-black text-[#0F1E3D]">Approved event staff</h2>
              <Field label="Partner user UUID" name="partnerUserId" required wide />
              <label className="mt-4 block text-sm font-bold text-[#0F1E3D]">Staff status
                <select name="staffStatus" className={inputClass} defaultValue="approved"><option value="approved">Approved</option><option value="suspended">Suspended</option><option value="revoked">Revoked</option></select>
              </label>
              <fieldset className="mt-4"><legend className="text-sm font-bold text-[#0F1E3D]">Event-only permissions</legend>
                <div className="mt-2 grid grid-cols-2 gap-2">{["assist","queue","follow_up","reporting","incident"].map((permission) => <label key={permission} className="flex items-center gap-2 text-sm text-[#5C5750]"><input type="checkbox" name="permissions" value={permission} defaultChecked={permission === "assist" || permission === "queue"} />{permission.replace("_", " ")}</label>)}</div>
              </fieldset>
              <button disabled={busy} className="mt-5 min-h-11 rounded-md bg-[#0F1E3D] px-5 py-2 text-sm font-bold text-white disabled:opacity-50">Save staff authorization</button>
              <div className="mt-5 divide-y divide-[#EEE6DB] border-t border-[#EEE6DB]">{workspace.staff.map((staff) => <div key={staff.id} className="py-3 text-sm"><p className="font-bold text-[#0F1E3D]">{staff.partnerUserId}</p><p className="text-[#6B625B]">{staff.status} · {staff.permissions.join(", ")}</p></div>)}</div>
            </form>

            <form onSubmit={createCode} className="rounded-xl border border-[#E8DED3] bg-white p-5 shadow-sm">
              <p className="text-xs font-black uppercase tracking-[0.18em] text-[#D85A30]">Reveal once</p>
              <h2 className="mt-2 text-xl font-black text-[#0F1E3D]">Event access code</h2>
              <p className="mt-2 text-sm leading-6 text-[#5C5750]">The QR identifies this event. Participants enter the separate code after opening the event page, so the QR never carries a reusable secret.</p>
              <div className="mt-4 grid gap-4 sm:grid-cols-2"><Field label="Maximum uses" name="maxUses" type="number" min="1" /><Field label="Code starts" name="codeStartsAt" type="datetime-local" /><Field label="Code expires" name="codeExpiresAt" type="datetime-local" /></div>
              <button disabled={busy} className="mt-5 min-h-11 rounded-md bg-[#D85A30] px-5 py-2 text-sm font-bold text-white disabled:opacity-50">Generate event access code</button>
              <div className="mt-5 divide-y divide-[#EEE6DB] border-t border-[#EEE6DB]">{workspace.accessCodes.map((code) => <div key={code.id} className="flex justify-between gap-4 py-3 text-sm"><span className="font-bold text-[#0F1E3D]">Ends in {code.codeHint}</span><span className="text-[#6B625B]">{code.usesCount}/{code.maxUses ?? "unlimited"}</span></div>)}</div>
            </form>
          </div>

          <section className="rounded-xl border border-[#E8DED3] bg-white p-5 shadow-sm"><h2 className="text-xl font-black text-[#0F1E3D]">Event incident and audit history</h2><div className="mt-4 divide-y divide-[#EEE6DB]">{workspace.audit.map((entry) => <div key={entry.id} className="grid gap-1 py-3 text-sm sm:grid-cols-[1fr_auto]"><span className="font-bold text-[#0F1E3D]">{entry.action.replaceAll("_", " ")}</span><time className="text-[#6B625B]">{formatDate(entry.occurredAt)}</time></div>)}</div></section>
        </section>
      )}
    </div>
  );
}

function EventHeader({ workspace, detailBase, busy, setStatus }: { workspace: ClinicEventWorkspace; detailBase: string; busy: boolean; setStatus: (status: ClinicEventStatus) => void }) {
  return <section className="rounded-xl border border-[#D9E5DF] bg-[#F3F8F5] p-5"><div className="flex flex-wrap justify-between gap-3"><Link href={detailBase} className="text-sm font-bold text-[#0F6E56]">Back to Clinic Mode</Link><div className="flex flex-wrap gap-2"><Link href={`/clinic/staff/${workspace.event.id}/queue`} className="rounded-md bg-[#0F1E3D] px-4 py-2 text-sm font-bold text-white">Staff case queue</Link><Link href={`${detailBase}/${workspace.event.id}/follow-up`} className="rounded-md border border-[#0F1E3D] bg-white px-4 py-2 text-sm font-bold text-[#0F1E3D]">Follow-up</Link><Link href={`${detailBase}/${workspace.event.id}/reporting`} className="rounded-md border border-[#0F1E3D] bg-white px-4 py-2 text-sm font-bold text-[#0F1E3D]">Reporting</Link></div></div><div className="mt-4 grid gap-6 lg:grid-cols-[1fr_auto]"><div><p className="text-xs font-black uppercase tracking-[0.18em] text-[#1D9E75]">{workspace.event.partnerSlug} · {workspace.event.status}</p><h1 className="mt-2 text-3xl font-black text-[#0F1E3D]">{workspace.event.name}</h1><p className="mt-2 text-sm text-[#5C5750]">{formatDate(workspace.event.startsAt)} · {workspace.event.locationName} · {workspace.event.timezone}</p><a href={workspace.entryUrl} className="mt-3 block break-all text-sm font-bold text-[#0F6E56]">{workspace.entryUrl}</a></div><img src={workspace.qrDataUrl} alt={`QR code for ${workspace.event.name}`} className="h-40 w-40 rounded-md border border-[#D9E5DF] bg-white p-2" /></div><div className="mt-5 flex flex-wrap gap-2"><StatusButton label="Publish event" status="published" disabled={busy || workspace.event.status !== "draft"} onClick={setStatus} /><StatusButton label="Pause event" status="paused" disabled={busy || workspace.event.status !== "published"} onClick={setStatus} /><StatusButton label="Resume event" status="published" disabled={busy || workspace.event.status !== "paused"} onClick={setStatus} /><StatusButton label="Close event" status="closed" disabled={busy || !["published","paused"].includes(workspace.event.status)} onClick={setStatus} /><StatusButton label="Archive event" status="archived" disabled={busy || workspace.event.status !== "closed"} onClick={setStatus} /></div></section>;
}

function StatusButton({ label, status, disabled, onClick }: { label: string; status: ClinicEventStatus; disabled: boolean; onClick: (status: ClinicEventStatus) => void }) {
  return <button type="button" disabled={disabled} onClick={() => onClick(status)} className="min-h-10 rounded-md border border-[#0F1E3D] px-4 py-2 text-sm font-bold text-[#0F1E3D] hover:bg-white disabled:cursor-not-allowed disabled:opacity-35">{label}</button>;
}

function EventList({ events, detailBase }: { events: ClinicEvent[]; detailBase: string }) {
  return <section className="rounded-xl border border-[#E8DED3] bg-white p-5 shadow-sm"><div className="flex items-end justify-between gap-3"><div><p className="text-xs font-black uppercase tracking-[0.18em] text-[#D85A30]">Live authority</p><h2 className="mt-2 text-xl font-black text-[#0F1E3D]">Clinic events</h2></div><span className="text-3xl font-black text-[#0F1E3D]">{events.length}</span></div><div className="mt-5 divide-y divide-[#EEE6DB]">{events.length ? events.map((event) => <Link key={event.id} href={`${detailBase}/${event.id}`} className="grid gap-2 py-4 hover:bg-[#FBF7F2] sm:grid-cols-[1fr_auto]"><div><p className="font-black text-[#0F1E3D]">{event.name}</p><p className="mt-1 text-sm text-[#6B625B]">{event.partnerSlug} · {event.locationName} · capacity {event.capacity}</p></div><div className="text-sm font-bold text-[#0F6E56]">{event.status}<br /><span className="font-normal text-[#6B625B]">{formatDate(event.startsAt)}</span></div></Link>) : <p className="py-8 text-sm text-[#6B625B]">No Clinic events exist for this authorized scope.</p>}</div></section>;
}

function Field({ label, name, type = "text", wide = false, ...inputProps }: { label: string; name: string; type?: string; wide?: boolean; [key: string]: unknown }) {
  return <label className={`block text-sm font-bold text-[#0F1E3D] ${wide ? "sm:col-span-2" : ""}`}>{label}<input {...inputProps} name={name} type={type} className={inputClass} /></label>;
}

const inputClass = "mt-2 min-h-11 w-full rounded-md border border-[#CFC4B8] bg-white px-3 py-2 text-sm font-normal text-[#0F1E3D] outline-none focus:border-[#1D9E75] focus:ring-2 focus:ring-[#1D9E75]/20";
const value = (data: FormData, key: string) => String(data.get(key) ?? "").trim();
const numberValue = (data: FormData, key: string) => Number(value(data, key));
const nullableNumberValue = (data: FormData, key: string) => value(data, key) ? Number(value(data, key)) : null;
const nullableDateValue = (data: FormData, key: string) => value(data, key) ? new Date(value(data, key)).toISOString() : null;
const formatDate = (date: string) => new Intl.DateTimeFormat("en-US", { dateStyle: "medium", timeStyle: "short" }).format(new Date(date));
