import { ONBOARDING_JURISDICTIONS } from "@/lib/partners/onboarding/jurisdictions";
import { ClinicText } from "@/components/clinic-mode/ClinicText";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ClinicAdminConsole } from "@/components/clinic-mode/ClinicAdminConsole";
import { ClinicServiceError, listClinicEvents, listClinicPrograms, requireClinicPartnerActor } from "@/lib/clinic-mode/service";

export const dynamic = "force-dynamic";

export default async function PartnerClinicPage() {
  const access = await partnerAccess();
  if (access.kind === "denied") return <Denied title={access.title} body={access.body} />;
  const events = await listClinicEvents();
  const programs = access.isAdmin ? await listClinicPrograms() : [];
  return (
    <main className="min-h-screen bg-[#FBF7F2] text-[#0F1E3D]">
      <div className="mx-auto max-w-7xl px-4 py-10 md:px-6">
        <header className="mb-7 max-w-4xl">
          <p className="text-xs font-black uppercase tracking-[0.2em] text-[#127256]">{programs[0]?.name}</p>
          <h1 className="mt-3 text-4xl font-black tracking-tight"><ClinicText value={access.isAdmin ? "Clinic Mode administration" : "Your clinic assignments"} /></h1>
          <p className="mt-4 max-w-3xl text-sm leading-6 text-[#5C5750]"><ClinicText value={access.isAdmin ? "Manage event schedules, capacity, approved staff, participant entry, and operating status. Access is permanently limited to the LegalEase partner account shown above." : "Choose an assigned event to assist participants, manage its queue, or complete authorized follow-up."} /></p>
        </header>
        {access.isAdmin ? <ClinicAdminConsole programs={programs} jurisdictionOptions={ONBOARDING_JURISDICTIONS} events={events} internal={false} /> :
          <section className="space-y-4">{events.map(event => <article key={event.id} className="rounded-xl border bg-white p-5">
            <h2 className="text-xl font-bold">{event.name}</h2><p className="mt-2">{event.locationName} · <ClinicText value={event.status} /></p>
            <nav className="mt-4 flex flex-wrap gap-4">
              {event.staffPermissions?.includes("queue") ? <Link prefetch={false} className="inline-flex min-h-11 items-center font-bold underline" href={`/clinic/staff/${event.id}/queue`}><ClinicText value="Staff case queue" /></Link> : null}
              {event.staffPermissions?.includes("follow_up") ? <Link prefetch={false} className="inline-flex min-h-11 items-center font-bold underline" href={`/partner/clinic/${event.id}/follow-up`}><ClinicText value="Follow-up" /></Link> : null}
              {event.staffPermissions?.includes("reporting") ? <Link prefetch={false} className="inline-flex min-h-11 items-center font-bold underline" href={`/partner/clinic/${event.id}/reporting`}><ClinicText value="Reporting" /></Link> : null}
              {event.staffPermissions?.includes("assist") ? <Link prefetch={false} className="inline-flex min-h-11 items-center font-bold underline" href={`/clinic/${event.publicSlug}`}><ClinicText value="Participant entry" /></Link> : null}
            </nav></article>)}{events.length === 0 ? <p><ClinicText value="No clinics are assigned to you. Ask your program administrator for an event assignment." /></p> : null}</section>}
      </div>
    </main>
  );
}

async function partnerAccess() {
  try {
    const actor = await requireClinicPartnerActor();
    return { kind: "allowed" as const, partnerSlug: actor.partnerSlug, isAdmin: actor.role === "partner_admin" };
  } catch (error) {
    if (error instanceof ClinicServiceError && error.code === "unauthenticated") redirect("/sign-in?next=/partner/clinic");
    if (error instanceof ClinicServiceError) return { kind: "denied" as const, title: "Clinic access denied", body: error.message };
    throw error;
  }
}

function Denied({ title, body }: { title: string; body: string }) {
  return <main className="min-h-screen bg-[#FBF7F2] px-4 py-20"><div className="mx-auto max-w-xl rounded-xl border border-[#E8DED3] bg-white p-7"><h1 className="text-2xl font-black text-[#0F1E3D]">{title}</h1><p className="mt-3 text-sm leading-6 text-[#5C5750]">{body}</p></div></main>;
}
