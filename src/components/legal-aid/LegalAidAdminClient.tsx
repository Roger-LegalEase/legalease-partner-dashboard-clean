"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import type { PolicyProfileSummary, StaffCandidate } from "@/lib/legal-aid/admin-service";
import { LEGAL_AID_PERMISSION_LABELS, LEGAL_AID_STAFF_PERMISSIONS, type LegalAidEventSummary } from "@/lib/legal-aid/types";
import { Panel, laInput, laPrimary, laSecondary } from "./LegalAidShell";

// Partner administration for a legal-aid clinic: the approved policy profile,
// the event's legal-aid settings, and the clinic team chosen by email with
// role-shaped permissions.

type Props = { event: LegalAidEventSummary; profiles: PolicyProfileSummary[]; staff: StaffCandidate[]; templateAvailable: boolean; registrationUrl: string };

export function LegalAidAdminClient({ event, profiles, staff, templateAvailable, registrationUrl }: Props) {
  const router = useRouter();
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);

  async function post(path: string, body: Record<string, unknown>, success: string) {
    setBusy(true);
    setNotice("");
    try {
      const response = await fetch(path, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
      const payload = await response.json().catch(() => ({})) as { error?: string };
      if (!response.ok) { setNotice(payload.error ?? "The request was refused."); return; }
      setNotice(success);
      router.refresh();
    } catch { setNotice("The request could not be completed."); }
    finally { setBusy(false); }
  }

  function configure(formEvent: FormEvent<HTMLFormElement>) {
    formEvent.preventDefault();
    const data = new FormData(formEvent.currentTarget);
    const local = (key: string) => { const value = String(data.get(key) ?? ""); return value ? new Date(value).toISOString() : null; };
    void post(`/api/legal-aid/admin/events/${event.id}`, {
      policyProfileId: String(data.get("policyProfileId") ?? ""), registrationOpensAt: local("registrationOpensAt"), registrationClosesAt: local("registrationClosesAt"),
      appointmentPolicy: String(data.get("appointmentPolicy") ?? ""), participantCostNote: String(data.get("participantCostNote") ?? ""), publicDescription: String(data.get("publicDescription") ?? "")
    }, "Clinic settings saved.");
  }

  function assign(formEvent: FormEvent<HTMLFormElement>) {
    formEvent.preventDefault();
    const data = new FormData(formEvent.currentTarget);
    void post(`/api/clinic/events/${event.id}/staff`, { partnerUserId: String(data.get("partnerUserId") ?? ""), status: String(data.get("status") ?? "approved"), permissions: data.getAll("permissions").map(String) }, "Clinic team updated.");
  }

  const approved = profiles.find((profile) => profile.status === "approved");

  return (
    <div className="space-y-5">
      <div aria-live="polite" className={`min-h-6 rounded-md px-3 py-2 text-sm font-semibold ${notice ? "border border-[#DCC9B8] bg-[#FFF7ED] text-[#8A3C1F]" : "text-transparent"}`}>{notice || "No update"}</div>

      <Panel eyebrow="Step 1" title="Policy profile">
        <p className="text-sm leading-6 text-[#5B4E66]">The profile records the partner&apos;s service rules (what counts as income, which documents need a notary, where records go). One administrator prepares it; a different administrator approves it. A clinic can only be published against an approved profile.</p>
        <ul className="mt-3 divide-y divide-[#EEE8F2] text-sm">{profiles.map((profile) => <li key={profile.id} className="flex flex-wrap items-center justify-between gap-2 py-2"><span><strong>Version {profile.version}</strong> · {profile.status} · prepared {fmt(profile.preparedAt)}{profile.approvedAt ? ` · approved ${fmt(profile.approvedAt)}` : ""}{profile.approvalNote ? ` · ${profile.approvalNote}` : ""}</span>{profile.status === "draft" ? <ApproveButton profileId={profile.id} busy={busy} onApprove={(note) => post(`/api/legal-aid/admin/profiles/${profile.id}`, { note }, "Profile approved. Earlier approved versions are retired.")} /> : null}</li>)}</ul>
        {profiles.length === 0 ? <p className="mt-2 text-sm text-[#7A6E85]">No profile has been prepared yet.</p> : null}
        <button type="button" disabled={busy || !templateAvailable} onClick={() => void post("/api/legal-aid/admin/profiles", {}, "Draft profile prepared. A second administrator approves it.")} className={`${laSecondary} mt-3`}>Prepare a new draft from the template</button>
        {!templateAvailable ? <p className="mt-2 text-xs text-[#7A6E85]">No profile template is available for this organization.</p> : null}
      </Panel>

      <Panel eyebrow="Step 2" title="Clinic settings">
        <form onSubmit={configure} className="grid gap-4 sm:grid-cols-2">
          <label className="block text-sm font-bold sm:col-span-2">Policy profile<select name="policyProfileId" required defaultValue={event.policyProfileId ?? approved?.id ?? ""} className={laInput}><option value="">Choose…</option>{profiles.map((profile) => <option key={profile.id} value={profile.id}>Version {profile.version} ({profile.status})</option>)}</select></label>
          <label className="block text-sm font-bold">Registration opens (optional)<input name="registrationOpensAt" type="datetime-local" defaultValue={toLocal(event.registrationOpensAt)} className={laInput} /></label>
          <label className="block text-sm font-bold">Registration closes (optional)<input name="registrationClosesAt" type="datetime-local" defaultValue={toLocal(event.registrationClosesAt)} className={laInput} /></label>
          <label className="block text-sm font-bold">Scheduling<select name="appointmentPolicy" defaultValue={event.appointmentPolicy} className={laInput}><option value="walk_in">Walk in during clinic hours</option><option value="appointment">By appointment</option><option value="mixed">Appointments and walk-ins</option></select></label>
          <label className="block text-sm font-bold">What it costs the participant<input name="participantCostNote" defaultValue={event.participantCostNote ?? ""} placeholder="e.g. Free clinic; court filing fees may apply" className={laInput} /></label>
          <label className="block text-sm font-bold sm:col-span-2">Public description<textarea name="publicDescription" rows={3} defaultValue={event.publicDescription ?? ""} className={laInput} /></label>
          <div className="sm:col-span-2 flex flex-wrap items-center gap-3"><button type="submit" disabled={busy} className={laPrimary}>Save clinic settings</button><span className="text-xs text-[#7A6E85]">Times are entered in your browser&apos;s time zone and shown to participants in {event.timezone}.</span></div>
        </form>
        <p className="mt-4 text-sm">Public registration page: <a href={registrationUrl} className="font-bold text-[var(--la-brand-dark)] underline">{registrationUrl}</a> {event.experience === "legal_aid" ? "" : "(becomes active once the clinic is saved as a legal-aid clinic and published)"}</p>
      </Panel>

      <Panel eyebrow="Step 3" title="Clinic team">
        <p className="text-sm leading-6 text-[#5B4E66]">Choose a person by email and give them only the roles they hold for this clinic. Roles apply to this event only.</p>
        <form onSubmit={assign} className="mt-3 grid gap-4 sm:grid-cols-2">
          <label className="block text-sm font-bold">Person<select name="partnerUserId" required className={laInput}><option value="">Choose…</option>{staff.map((member) => <option key={member.partnerUserId} value={member.partnerUserId}>{member.email} ({member.role.replace("partner_", "")})</option>)}</select></label>
          <label className="block text-sm font-bold">Status<select name="status" defaultValue="approved" className={laInput}><option value="approved">Approved</option><option value="suspended">Suspended</option><option value="revoked">Revoked</option></select></label>
          <fieldset className="sm:col-span-2"><legend className="text-sm font-bold">Roles for this clinic</legend>
            <div className="mt-2 grid gap-2 sm:grid-cols-2">{LEGAL_AID_STAFF_PERMISSIONS.map((permission) => <label key={permission} className="flex items-start gap-2 rounded-md border border-[#E8E1EE] p-2 text-sm"><input type="checkbox" name="permissions" value={permission} className="mt-1" /><span><strong>{LEGAL_AID_PERMISSION_LABELS[permission].title}</strong><br /><span className="text-xs text-[#5B4E66]">{LEGAL_AID_PERMISSION_LABELS[permission].responsibility}</span></span></label>)}</div>
          </fieldset>
          <div className="sm:col-span-2"><button type="submit" disabled={busy} className={laPrimary}>Save team member</button></div>
        </form>
        <ul className="mt-4 divide-y divide-[#EEE8F2] text-sm">{staff.filter((member) => member.status).map((member) => <li key={member.partnerUserId} className="flex flex-wrap justify-between gap-2 py-2"><span className="font-bold">{member.email}</span><span className="text-[#5B4E66]">{member.status} · {member.permissions.map((permission) => LEGAL_AID_PERMISSION_LABELS[permission as keyof typeof LEGAL_AID_PERMISSION_LABELS]?.title ?? permission).join(", ")}</span></li>)}</ul>
      </Panel>

      <p className="text-sm"><Link href={`/clinic/staff/${event.id}/applications`} className="font-bold text-[var(--la-brand-dark)] underline">Open the applications list</Link> · <Link href={`/partner/clinic/${event.id}`} className="font-bold text-[var(--la-brand-dark)] underline">Event controls (publish, pause, close)</Link></p>
    </div>
  );
}

function ApproveButton({ profileId, busy, onApprove }: { profileId: string; busy: boolean; onApprove: (note: string) => Promise<void> }) {
  const [note, setNote] = useState("");
  return <span className="flex flex-wrap items-center gap-2"><input aria-label={`Approval note for profile ${profileId}`} className={`${laInput} mt-0 min-w-48`} value={note} onChange={(event) => setNote(event.target.value)} placeholder="Approval note (optional)" /><button type="button" disabled={busy} onClick={() => void onApprove(note)} className={laSecondary}>Approve</button></span>;
}

function fmt(iso: string) { return new Intl.DateTimeFormat("en-US", { dateStyle: "medium" }).format(new Date(iso)); }
function toLocal(iso: string | null) { if (!iso) return ""; const date = new Date(iso); const pad = (value: number) => String(value).padStart(2, "0"); return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`; }
