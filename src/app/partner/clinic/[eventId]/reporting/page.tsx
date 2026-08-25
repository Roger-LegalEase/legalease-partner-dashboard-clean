import Link from "next/link";
import { redirect } from "next/navigation";
import { ClinicReportingDashboard } from "@/components/clinic-mode/ClinicReportingDashboard";
import { getClinicEventReport } from "@/lib/clinic-mode/reporting-service";
import { ClinicServiceError, requireClinicPartnerAdmin } from "@/lib/clinic-mode/service";
import { parseEventId } from "@/lib/clinic-mode/validation";

export const dynamic = "force-dynamic";

export default async function PartnerClinicReportingPage({ params }: { params: Promise<{ eventId: string }> }) {
  try {
    await requireClinicPartnerAdmin();
    const { eventId: rawEventId } = await params;
    const eventId = parseEventId(rawEventId);
    const report = await getClinicEventReport(eventId);
    return <main className="min-h-screen bg-[#FBF7F2] px-4 py-10 text-[#0F1E3D]"><div className="mx-auto max-w-7xl"><Link href={`/partner/clinic/${eventId}`} className="text-sm font-bold text-[#0F6E56]">Back to event controls</Link><header className="mb-7 mt-5"><p className="text-xs font-black uppercase tracking-[0.2em] text-[#1D9E75]">Authorized event summary</p><h1 className="mt-3 text-4xl font-black">{report.eventName} reporting</h1><p className="mt-3 max-w-3xl text-sm leading-6 text-[#5C5750]">Operational totals only. Participant and matter identities are excluded before this report is returned.</p></header><ClinicReportingDashboard report={report} /></div></main>;
  } catch (error) {
    if (error instanceof ClinicServiceError && error.code === "unauthenticated") redirect("/sign-in?next=/partner/clinic");
    if (error instanceof ClinicServiceError) return <main className="min-h-screen bg-[#FBF7F2] px-4 py-20"><div className="mx-auto max-w-xl rounded-xl border border-[#E8DED3] bg-white p-7"><h1 className="text-2xl font-black text-[#0F1E3D]">Reporting unavailable</h1><p className="mt-3 text-sm text-[#5C5750]">{error.message}</p></div></main>;
    throw error;
  }
}
