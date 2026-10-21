import Link from "next/link";
import { unstable_noStore as noStore } from "next/cache";
import { notFound } from "next/navigation";
import { LegalAidShell, Panel, laPrimary, laSecondary } from "@/components/legal-aid/LegalAidShell";
import { ClinicServiceError } from "@/lib/clinic-mode/errors";
import { formatClinicDate, getLegalAidBranding } from "@/lib/legal-aid/branding";
import { listOpenLegalAidEvents } from "@/lib/legal-aid/registration-service";
import type { LegalAidEventSummary } from "@/lib/legal-aid/types";

export const dynamic = "force-dynamic";
export const revalidate = 0;

// Public list of the partner's open legal-aid clinics, from saved event
// configuration. Nothing here is a copied date; each card is a real event.
export default async function PartnerClinicsPage({ params }: { params: Promise<{ partnerSlug: string }> }) {
  noStore();
  const { partnerSlug } = await params;
  const branding = getLegalAidBranding(partnerSlug);
  if (!branding) notFound();
  let events: LegalAidEventSummary[] = [];
  let unavailable = "";
  try { events = await listOpenLegalAidEvents(partnerSlug); }
  catch (error) { if (error instanceof ClinicServiceError) unavailable = "The clinic schedule is temporarily unavailable. Please try again in a few minutes."; else throw error; }

  return (
    <LegalAidShell branding={branding}>
      <h1 className="text-3xl font-black tracking-tight sm:text-4xl">Register for an expungement clinic</h1>
      <p className="mt-3 max-w-2xl text-base leading-7 text-[#5B4E66]">Choose a clinic, save your place, and complete your private application before you arrive. {branding.name} reviews every application and tells you your next step.</p>
      <div className="mt-8 space-y-4">
        {unavailable ? <Panel tone="warn"><p className="text-sm font-semibold">{unavailable}</p></Panel> : null}
        {!unavailable && events.length === 0 ? (
          <Panel tone="brand" title="No clinics are open for registration right now">
            <p className="text-sm leading-6 text-[#5B4E66]">New clinic dates are added here as soon as {branding.name} opens them. {branding.contactPhone ? `You can also call ${branding.contactPhone}.` : ""}</p>
            <Link href={branding.continueHref} className={`${laSecondary} mt-4`}>Continue an application I already started</Link>
          </Panel>
        ) : null}
        {events.map((event) => <EventCard key={event.id} event={event} partnerName={branding.name} />)}
      </div>
      <p className="mt-8 text-sm text-[#5B4E66]">Already registered? <Link href={branding.continueHref} className="font-bold text-[var(--la-brand-dark)] underline">Continue my application</Link></p>
    </LegalAidShell>
  );
}

function EventCard({ event, partnerName }: { event: LegalAidEventSummary; partnerName: string }) {
  const full = event.seatsRemaining !== null && event.seatsRemaining <= 0;
  return (
    <article className="rounded-2xl border border-[#E8E1EE] bg-white p-5 sm:p-6">
      <p className="text-xs font-black uppercase tracking-[0.18em] text-[var(--la-brand)]">{event.geography}</p>
      <h2 className="mt-1 text-2xl font-black">{event.name}</h2>
      <p className="mt-2 text-sm leading-6 text-[#5B4E66]">{formatClinicDate(event.startsAt, event.timezone)}<br />{event.locationName}</p>
      {event.publicDescription ? <p className="mt-3 text-sm leading-6">{event.publicDescription}</p> : null}
      <dl className="mt-4 grid gap-2 text-sm sm:grid-cols-3">
        <div><dt className="font-bold">Format</dt><dd className="text-[#5B4E66]">{event.appointmentPolicy === "appointment" ? "By appointment" : event.appointmentPolicy === "mixed" ? "Appointments and walk-ins" : "Walk in during clinic hours"}</dd></div>
        <div><dt className="font-bold">Cost</dt><dd className="text-[#5B4E66]">{event.participantCostNote ?? `${partnerName} will explain any court costs at the clinic.`}</dd></div>
        <div><dt className="font-bold">Places</dt><dd className="text-[#5B4E66]">{event.seatsRemaining === null ? "Open" : full ? "Full (waitlist available)" : `${event.seatsRemaining} remaining`}</dd></div>
      </dl>
      <div className="mt-5">
        {event.registrationOpen ? <Link href={`/clinic/${event.publicSlug}/register`} className={laPrimary}>{full ? "Join the waitlist" : "Register for this clinic"}</Link> : <span className="inline-block rounded-md bg-[#F1ECF4] px-4 py-2 text-sm font-bold text-[#5B4E66]">Registration is closed</span>}
      </div>
    </article>
  );
}
