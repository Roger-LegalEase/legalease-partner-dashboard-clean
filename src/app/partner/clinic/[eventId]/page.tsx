import { redirect } from "next/navigation";
import { ClinicAdminConsole } from "@/components/clinic-mode/ClinicAdminConsole";
import { ClinicServiceError, getClinicEventWorkspace, listClinicEvents, requireClinicPartnerAdmin } from "@/lib/clinic-mode/service";
import { parseEventId } from "@/lib/clinic-mode/validation";

export const dynamic = "force-dynamic";

export default async function PartnerClinicEventPage({ params }: { params: Promise<{ eventId: string }> }) {
  const result = await loadClinicEventPage(params);
  if (!result.ok) return <ClinicPageError message={result.message} />;

  return (
    <main className="min-h-screen bg-[#FBF7F2] text-[#0F1E3D]">
      <div className="mx-auto max-w-7xl px-4 py-10 md:px-6">
        <ClinicAdminConsole events={result.events} workspace={result.workspace} internal={false} />
      </div>
    </main>
  );
}

async function loadClinicEventPage(params: Promise<{ eventId: string }>) {
  try {
    await requireClinicPartnerAdmin();
    const { eventId } = await params;
    const [events, workspace] = await Promise.all([listClinicEvents(), getClinicEventWorkspace(parseEventId(eventId))]);
    return { ok: true as const, events, workspace };
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
        <h1 className="text-2xl font-black text-[#0F1E3D]">Clinic event unavailable</h1>
        <p className="mt-3 text-sm text-[#5C5750]">{message}</p>
      </div>
    </main>
  );
}
