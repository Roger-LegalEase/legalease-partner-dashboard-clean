import { redirect } from "next/navigation";
import { ClinicAdminConsole } from "@/components/clinic-mode/ClinicAdminConsole";
import { ClinicServiceError, listClinicEvents, requireClinicPartnerAdmin } from "@/lib/clinic-mode/service";

export const dynamic = "force-dynamic";

export default async function PartnerClinicPage() {
  const access = await partnerAccess();
  if (access.kind === "denied") return <Denied title={access.title} body={access.body} />;
  const events = await listClinicEvents();
  return (
    <main className="min-h-screen bg-[#FBF7F2] text-[#0F1E3D]">
      <div className="mx-auto max-w-7xl px-4 py-10 md:px-6">
        <header className="mb-7 max-w-4xl">
          <p className="text-xs font-black uppercase tracking-[0.2em] text-[#1D9E75]">{access.partnerSlug}</p>
          <h1 className="mt-3 text-4xl font-black tracking-tight">Clinic Mode administration</h1>
          <p className="mt-4 max-w-3xl text-sm leading-6 text-[#5C5750]">Manage event schedules, capacity, approved staff, participant entry, and operating status. Your access is permanently limited to your organization.</p>
        </header>
        <ClinicAdminConsole events={events} internal={false} />
      </div>
    </main>
  );
}

async function partnerAccess() {
  try {
    const actor = await requireClinicPartnerAdmin();
    return { kind: "allowed" as const, partnerSlug: actor.partnerSlug };
  } catch (error) {
    if (error instanceof ClinicServiceError && error.code === "unauthenticated") redirect("/sign-in?next=/partner/clinic");
    if (error instanceof ClinicServiceError) return { kind: "denied" as const, title: "Clinic access denied", body: error.message };
    throw error;
  }
}

function Denied({ title, body }: { title: string; body: string }) {
  return <main className="min-h-screen bg-[#FBF7F2] px-4 py-20"><div className="mx-auto max-w-xl rounded-xl border border-[#E8DED3] bg-white p-7"><h1 className="text-2xl font-black text-[#0F1E3D]">{title}</h1><p className="mt-3 text-sm leading-6 text-[#5C5750]">{body}</p></div></main>;
}
