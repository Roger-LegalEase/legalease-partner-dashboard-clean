import { ClinicText } from "@/components/clinic-mode/ClinicText";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ClinicReportingDashboard } from "@/components/clinic-mode/ClinicReportingDashboard";
import { getClinicEventReport } from "@/lib/clinic-mode/reporting-service";
import { ClinicServiceError, requireClinicPartnerActor } from "@/lib/clinic-mode/service";
import { parseEventId } from "@/lib/clinic-mode/validation";

export const dynamic = "force-dynamic";

export default async function PartnerClinicReportingPage({ params }: { params: Promise<{ eventId: string }> }) {
  const result = await loadReportingPage(params);
  if (!result.ok) return <ClinicPageError message={result.message} />;

  const { eventId, report } = result;
  return (
    <main className="min-h-screen bg-[#FBF7F2] px-4 py-10 text-[#0F1E3D]">
      <div className="mx-auto max-w-7xl">
        <Link prefetch={false} href={result.canManage ? `/partner/clinic/${eventId}` : "/partner/clinic"} className="text-sm font-bold text-[#0F6E56]"><ClinicText value={result.canManage ? "Back to event controls" : "Back to clinics"} /></Link>
        <header className="mb-7 mt-5">
          <p className="text-xs font-black uppercase tracking-[0.2em] text-[#127256]"><ClinicText value="Authorized event summary" /></p>
          <h1 className="mt-3 text-4xl font-black">{report.eventName} <ClinicText value="reporting" /></h1>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-[#5C5750]"><ClinicText value="Operational totals only. Participant and matter identities are excluded before this report is returned." /></p>
        </header>
        <ClinicReportingDashboard report={report} />
      </div>
    </main>
  );
}

async function loadReportingPage(params: Promise<{ eventId: string }>) {
  try {
    const actor = await requireClinicPartnerActor();
    const { eventId: rawEventId } = await params;
    const eventId = parseEventId(rawEventId);
    const report = await getClinicEventReport(eventId);
    return { ok: true as const, canManage: actor.role === "partner_admin", eventId, report };
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
        <h1 className="text-2xl font-black text-[#0F1E3D]"><ClinicText value="Reporting unavailable" /></h1>
        <p className="mt-3 text-sm text-[#5C5750]">{message}</p>
      </div>
    </main>
  );
}
