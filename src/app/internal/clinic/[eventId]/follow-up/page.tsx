import Link from "next/link";
import { ClinicFollowUpConsole } from "@/components/clinic-mode/ClinicFollowUpConsole";
import { listClinicQueue } from "@/lib/clinic-mode/participant-service";
import { listClinicFollowUps } from "@/lib/clinic-mode/reporting-service";
import { getClinicEventWorkspace } from "@/lib/clinic-mode/service";
import { parseEventId } from "@/lib/clinic-mode/validation";
import { InternalAdminDenied, resolveInternalAdminPageAccess } from "@/lib/partners/internal-admin-gate";

export const dynamic = "force-dynamic";

export default async function InternalClinicFollowUpPage({ params }: { params: Promise<{ eventId: string }> }) {
  const access = await resolveInternalAdminPageAccess("/internal/clinic");
  if (access.kind === "denied") return <InternalAdminDenied title={access.title} body={access.body} email={access.email} />;
  const { eventId: rawEventId } = await params;
  const eventId = parseEventId(rawEventId);
  const [workspace, cases, followUps] = await Promise.all([getClinicEventWorkspace(eventId), listClinicQueue(eventId), listClinicFollowUps(eventId)]);
  return <main className="min-h-screen bg-[#FBF7F2] px-4 py-10 text-[#0F1E3D]"><div className="mx-auto max-w-7xl"><Link href={`/internal/clinic/${eventId}`} className="text-sm font-bold text-[#0F6E56]">Back to internal event controls</Link><header className="mb-7 mt-5"><p className="text-xs font-black uppercase tracking-[0.2em] text-[#127256]">Internal follow-up oversight</p><h1 className="mt-3 text-4xl font-black">{workspace.event.name}</h1></header><ClinicFollowUpConsole eventId={eventId} cases={cases} staff={workspace.staff} initialFollowUps={followUps} /></div></main>;
}
