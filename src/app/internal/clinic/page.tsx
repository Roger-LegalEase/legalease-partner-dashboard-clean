import { ONBOARDING_JURISDICTIONS } from "@/lib/partners/onboarding/jurisdictions";
import { ClinicAdminConsole } from "@/components/clinic-mode/ClinicAdminConsole";
import { listClinicEvents, listClinicPrograms } from "@/lib/clinic-mode/service";
import { InternalAdminDenied, resolveInternalAdminPageAccess } from "@/lib/partners/internal-admin-gate";

export const dynamic = "force-dynamic";

export default async function InternalClinicPage({ searchParams }: { searchParams: Promise<{ partner?: string }> }) {
  const access = await resolveInternalAdminPageAccess("/internal/clinic");
  if (access.kind === "denied") return <InternalAdminDenied title={access.title} body={access.body} email={access.email} />;
  const { partner } = await searchParams;
  const events = (await listClinicEvents()).filter(event => !partner || event.partnerSlug === partner);
  const programs = await listClinicPrograms();
  return (
    <main className="min-h-screen bg-[#FBF7F2] text-[#0F1E3D]">
      <div className="mx-auto max-w-7xl px-4 py-10 md:px-6">
        <header className="mb-7 max-w-4xl">
          <p className="text-xs font-black uppercase tracking-[0.2em] text-[#A8431F]">LegalEase operations</p>
          <h1 className="mt-3 text-4xl font-black tracking-tight">Nationwide Clinic Mode</h1>
          <p className="mt-4 max-w-3xl text-sm leading-6 text-[#5C5750]">Create and run clinic events for an authorized partner. Select a program, set the schedule, and choose your team.</p>
        </header>
        <ClinicAdminConsole programs={programs} jurisdictionOptions={ONBOARDING_JURISDICTIONS} events={events} internal partnerSlug={partner} />
      </div>
    </main>
  );
}
