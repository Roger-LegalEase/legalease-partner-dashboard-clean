import Link from "next/link";
import { redirect } from "next/navigation";
import { ClinicFollowUpConsole } from "@/components/clinic-mode/ClinicFollowUpConsole";
import { listClinicQueue } from "@/lib/clinic-mode/participant-service";
import { listClinicFollowUps } from "@/lib/clinic-mode/reporting-service";
import { ClinicServiceError, getClinicEventWorkspace, requireClinicPartnerAdmin } from "@/lib/clinic-mode/service";
import { parseEventId } from "@/lib/clinic-mode/validation";

export const dynamic = "force-dynamic";

export default async function PartnerClinicFollowUpPage({ params }: { params: Promise<{ eventId: string }> }) {
  const result = await loadFollowUpPage(params);
  if (!result.ok) return <ClinicPageError message={result.message} />;

  const { eventId, workspace, cases, followUps } = result;
  return (
    <main className="min-h-screen bg-[#FBF7F2] px-4 py-10 text-[#0F1E3D]">
      <div className="mx-auto max-w-7xl">
        <Link href={`/partner/clinic/${eventId}`} className="text-sm font-bold text-[#0F6E56]">Back to event controls</Link>
        <header className="mb-7 mt-5">
          <p className="text-xs font-black uppercase tracking-[0.2em] text-[#127256]">Follow-up operations</p>
          <h1 className="mt-3 text-4xl font-black">{workspace.event.name}</h1>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-[#5C5750]">Manage time-bound follow-up without granting staff permanent access to a participant&apos;s account or matter.</p>
        </header>
        <ClinicFollowUpConsole eventId={eventId} cases={cases} staff={workspace.staff} initialFollowUps={followUps} />
      </div>
    </main>
  );
}

async function loadFollowUpPage(params: Promise<{ eventId: string }>) {
  try {
    await requireClinicPartnerAdmin();
    const { eventId: rawEventId } = await params;
    const eventId = parseEventId(rawEventId);
    const [workspace, cases, followUps] = await Promise.all([getClinicEventWorkspace(eventId), listClinicQueue(eventId), listClinicFollowUps(eventId)]);
    return { ok: true as const, eventId, workspace, cases, followUps };
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
        <h1 className="text-2xl font-black text-[#0F1E3D]">Follow-up unavailable</h1>
        <p className="mt-3 text-sm text-[#5C5750]">{message}</p>
      </div>
    </main>
  );
}
