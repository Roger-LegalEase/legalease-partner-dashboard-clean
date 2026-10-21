import { ClinicAdminConsole } from "@/components/clinic-mode/ClinicAdminConsole";
import { listClinicEvents } from "@/lib/clinic-mode/service";
import { InternalAdminDenied, resolveInternalAdminPageAccess } from "@/lib/partners/internal-admin-gate";

export const dynamic = "force-dynamic";

export default async function InternalClinicPage() {
  const access = await resolveInternalAdminPageAccess("/internal/clinic");
  if (access.kind === "denied") return <InternalAdminDenied title={access.title} body={access.body} email={access.email} />;
  const events = await listClinicEvents();
  return (
    <main className="min-h-screen bg-[#FBF7F2] text-[#0F1E3D]">
      <div className="mx-auto max-w-7xl px-4 py-10 md:px-6">
        <header className="mb-7 max-w-4xl">
          <p className="text-xs font-black uppercase tracking-[0.2em] text-[#A8431F]">LegalEase operations</p>
          <h1 className="mt-3 text-4xl font-black tracking-tight">Nationwide Clinic Mode</h1>
          <p className="mt-4 max-w-3xl text-sm leading-6 text-[#5C5750]">Create and govern tenant-owned record-clearing events. Event access, approved staff, assistance consent, participant matters, packet accounting, and incident history stay bound to one canonical event.</p>
        </header>
        <ClinicAdminConsole events={events} internal />
      </div>
    </main>
  );
}
