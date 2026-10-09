import { ClinicText } from "@/components/clinic-mode/ClinicText";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ClinicFollowUpConsole } from "@/components/clinic-mode/ClinicFollowUpConsole";
import { listClinicQueue } from "@/lib/clinic-mode/participant-service";
import { listClinicFollowUps } from "@/lib/clinic-mode/reporting-service";
import { ClinicServiceError, getClinicEventWorkspace, requireClinicPartnerActor } from "@/lib/clinic-mode/service";
import { parseEventId } from "@/lib/clinic-mode/validation";

export const dynamic = "force-dynamic";

export default async function PartnerClinicFollowUpPage({ params }: { params: Promise<{ eventId: string }> }) {
  const result = await loadFollowUpPage(params);
  if (!result.ok) return <ClinicPageError message={result.message} />;

  const { eventId, workspace, cases, followUps } = result;
  return (
    <main className="min-h-screen bg-[#FBF7F2] px-4 py-10 text-[#0F1E3D]">
      <div className="mx-auto max-w-7xl">
        <Link prefetch={false} href={result.canManage ? `/partner/clinic/${eventId}` : "/partner/clinic"} className="text-sm font-bold text-[#0F6E56]"><ClinicText value={result.canManage ? "Back to event controls" : "Back to clinics"} /></Link>
        <header className="mb-7 mt-5">
          <p className="text-xs font-black uppercase tracking-[0.2em] text-[#127256]"><ClinicText value="Follow-up operations" /></p>
          <h1 className="mt-3 text-4xl font-black">{workspace.event.name}</h1>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-[#5C5750]"><ClinicText value="Manage time-bound follow-up without granting staff permanent access to a participant's account or matter." /></p>
        </header>
        <ClinicFollowUpConsole eventId={eventId} cases={cases} staff={workspace.staff} staffOptions={workspace.staffOptions} initialFollowUps={followUps} />
      </div>
    </main>
  );
}

async function loadFollowUpPage(params: Promise<{ eventId: string }>) {
  try {
    const actor = await requireClinicPartnerActor();
    const { eventId: rawEventId } = await params;
    const eventId = parseEventId(rawEventId);
    const followUps = await listClinicFollowUps(eventId);
    const [workspace, cases] = await Promise.all([getClinicEventWorkspace(eventId), listClinicQueue(eventId).catch(error => {
      if (error instanceof ClinicServiceError && error.code === "forbidden") return [];
      throw error;
    })]);
    return { ok: true as const, canManage: actor.role === "partner_admin", eventId, workspace, cases, followUps };
  } catch (error) {
    if (error instanceof ClinicServiceError && error.code === "unauthenticated") redirect("/sign-in?next=/partner/clinic");
    if (error instanceof ClinicServiceError) return { ok: false as const, message: error.message };
    throw error;
  }
}

function ClinicPageError({ message }: { message: string }) {
  return (
    <main className="min-h-screen bg-[#FBF7F2] px-4 py-20">
      <div className="mx-auto max-w-xl rounded-xl border border-[#E8DED3] bg-white p-7">
        <h1 className="text-2xl font-black text-[#0F1E3D]"><ClinicText value="Follow-up unavailable" /></h1>
        <p className="mt-3 text-sm text-[#5C5750]">{message}</p>
      </div>
    </main>
  );
}
