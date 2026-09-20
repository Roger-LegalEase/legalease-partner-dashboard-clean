import Link from "next/link";
import { unstable_noStore as noStore } from "next/cache";
import { notFound, redirect } from "next/navigation";
import { IntakeClient } from "@/components/legal-aid/IntakeClient";
import { LegalAidShell } from "@/components/legal-aid/LegalAidShell";
import { requireConsumerBriefcaseSession } from "@/lib/expungement-ai/auth";
import { formatClinicDate, getLegalAidBranding } from "@/lib/legal-aid/branding";
import { getParticipantContextForEvent } from "@/lib/legal-aid/intake-service";
import { getLegalAidEventBySlug } from "@/lib/legal-aid/registration-service";

export const dynamic = "force-dynamic";
export const revalidate = 0;

// The participant's confidential application for one clinic. Requires the
// registered account; a person who has not registered is sent to register.
export default async function ClinicIntakePage({ params }: { params: Promise<{ eventSlug: string }> }) {
  noStore();
  const { eventSlug } = await params;
  const event = await getLegalAidEventBySlug(eventSlug);
  if (!event) notFound();
  const branding = getLegalAidBranding(event.partnerSlug);
  if (!branding) notFound();
  const session = await requireConsumerBriefcaseSession(`/clinic/${eventSlug}/intake`);
  const { registration, intake } = await getParticipantContextForEvent(event.id, session.userId);
  if (!registration || registration.status === "cancelled" || registration.status === "declined") redirect(`/clinic/${eventSlug}/register`);
  const clinicLabel = `${event.name} · ${formatClinicDate(event.startsAt, event.timezone)}`;

  return (
    <LegalAidShell branding={branding}>
      <Link href={branding.continueHref} className="text-sm font-bold text-[var(--la-brand-dark)]">← My application</Link>
      <h1 className="mt-4 text-3xl font-black tracking-tight sm:text-4xl">Your {branding.name} clinic application</h1>
      <p className="mt-2 max-w-2xl text-sm leading-6 text-[#5B4E66]">{event.name} · {formatClinicDate(event.startsAt, event.timezone)} · {event.locationName}</p>
      <div className="mt-6">
        <IntakeClient eventId={event.id} eventSlug={event.publicSlug} clinicLabel={clinicLabel} partnerName={branding.name} applicantName={registration.contactName} registrationEmail={registration.contactEmail} registrationPhone={registration.contactPhone} initial={intake} />
      </div>
    </LegalAidShell>
  );
}
