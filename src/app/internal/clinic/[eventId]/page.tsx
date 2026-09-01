import { ClinicAdminConsole } from "@/components/clinic-mode/ClinicAdminConsole";
import { getClinicEventWorkspace, listClinicEvents } from "@/lib/clinic-mode/service";
import { parseEventId } from "@/lib/clinic-mode/validation";
import { InternalAdminDenied, resolveInternalAdminPageAccess } from "@/lib/partners/internal-admin-gate";

export const dynamic = "force-dynamic";

export default async function InternalClinicEventPage({ params }: { params: Promise<{ eventId: string }> }) {
  const access = await resolveInternalAdminPageAccess("/internal/clinic");
  if (access.kind === "denied") return <InternalAdminDenied title={access.title} body={access.body} email={access.email} />;
  const { eventId } = await params;
  const [events, workspace] = await Promise.all([listClinicEvents(), getClinicEventWorkspace(parseEventId(eventId))]);
  return <main className="min-h-screen bg-[#FBF7F2] text-[#0F1E3D]"><div className="mx-auto max-w-7xl px-4 py-10 md:px-6"><ClinicAdminConsole events={events} workspace={workspace} internal /></div></main>;
}
