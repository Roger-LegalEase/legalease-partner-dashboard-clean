import Link from "next/link";
import { unstable_noStore as noStore } from "next/cache";
import { notFound } from "next/navigation";
import { LegalAidShell, Panel, laPrimary } from "@/components/legal-aid/LegalAidShell";
import { CancelRegistrationButton } from "@/components/legal-aid/RegistrationActions";
import { RegistrationForm } from "@/components/legal-aid/RegistrationForm";
import { requireConsumerBriefcaseSession } from "@/lib/expungement-ai/auth";
import { formatClinicDate, getLegalAidBranding } from "@/lib/legal-aid/branding";
import { getLegalAidEventBySlug, getParticipantRegistration } from "@/lib/legal-aid/registration-service";

export const dynamic = "force-dynamic";
export const revalidate = 0;

// Registration for one legal-aid clinic, tied to the signed-in account. After
// registering, the same page is the confirmation and the door to the intake.
export default async function ClinicRegisterPage({ params }: { params: Promise<{ eventSlug: string }> }) {
  noStore();
  const { eventSlug } = await params;
  const event = await getLegalAidEventBySlug(eventSlug);
  if (!event) notFound();
  const branding = getLegalAidBranding(event.partnerSlug);
  if (!branding) notFound();
  const session = await requireConsumerBriefcaseSession(`/clinic/${eventSlug}/register`);
  const registration = await getParticipantRegistration(event.id, session.userId);
  const full = event.seatsRemaining !== null && event.seatsRemaining <= 0;

  return (
    <LegalAidShell branding={branding}>
      <Link href={branding.clinicsHref} className="text-sm font-bold text-[var(--la-brand-dark)]">← All clinics</Link>
      <h1 className="mt-4 text-3xl font-black tracking-tight sm:text-4xl">{event.name}</h1>
      <p className="mt-2 text-base leading-7 text-[#5B4E66]">{formatClinicDate(event.startsAt, event.timezone)}<br />{event.locationName} · {event.geography}</p>
      {event.publicDescription ? <p className="mt-3 max-w-2xl text-sm leading-6">{event.publicDescription}</p> : null}

      <div className="mt-8 space-y-4">
        {registration && registration.status !== "cancelled" && registration.status !== "declined" ? (
          <>
            <Panel tone="brand" eyebrow="You are registered" title={registration.status === "waitlisted" ? "You are on the waitlist" : registration.status === "confirmed" ? "Your place is confirmed" : "We have your registration"}>
              <p className="text-sm leading-6">{registration.status === "waitlisted" ? `${branding.name} will contact you if a place opens.` : `${branding.name} will contact you ${contactPhrase(registration.preferredContact)} with anything you need to bring.`}</p>
              <dl className="mt-4 grid gap-2 text-sm sm:grid-cols-2">
                <div><dt className="font-bold">Name</dt><dd>{registration.contactName}</dd></div>
                <div><dt className="font-bold">Contact</dt><dd>{[registration.contactEmail, registration.contactPhone].filter(Boolean).join(" · ")}</dd></div>
              </dl>
            </Panel>
            <Panel title="Next: complete your private application">
              <p className="text-sm leading-6 text-[#5B4E66]">Your application asks about your household, income, and your record so the clinic team can prepare. It saves as you go and you can finish it later. Only you sign it.</p>
              <div className="mt-4 flex flex-wrap gap-2">
                <Link href={`/clinic/${event.publicSlug}/intake`} className={laPrimary}>Start my application</Link>
                <CancelRegistrationButton registrationId={registration.id} />
              </div>
            </Panel>
          </>
        ) : !event.registrationOpen ? (
          <Panel tone="warn" title="Registration is closed for this clinic">
            <p className="text-sm leading-6">{registration ? "Your earlier registration was cancelled." : ""} See the <Link href={branding.clinicsHref} className="font-bold underline">list of open clinics</Link> for other dates.</p>
          </Panel>
        ) : (
          <Panel eyebrow={full ? "Clinic is full" : "Save your place"} title={full ? "Join the waitlist" : "Register"}>
            {registration ? <p className="mb-4 rounded-md bg-[var(--la-soft)] p-3 text-sm">Your earlier registration was cancelled. Register again to hold a new place.</p> : null}
            <RegistrationForm eventId={event.id} partnerName={branding.name} defaultEmail={session.userEmail ?? null} />
          </Panel>
        )}
      </div>
    </LegalAidShell>
  );
}

function contactPhrase(preferred: string): string {
  return preferred === "email" ? "by email" : preferred === "phone" ? "by phone" : preferred === "text" ? "by text message" : "by email or phone";
}
