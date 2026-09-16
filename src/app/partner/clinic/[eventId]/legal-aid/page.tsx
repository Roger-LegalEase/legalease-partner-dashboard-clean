import Link from "next/link";
import { unstable_noStore as noStore } from "next/cache";
import { notFound, redirect } from "next/navigation";
import { LegalAidAdminClient } from "@/components/legal-aid/LegalAidAdminClient";
import { LegalAidShell } from "@/components/legal-aid/LegalAidShell";
import { absolutePartnerAppUrl } from "@/lib/app-url";
import { ClinicServiceError } from "@/lib/clinic-mode/errors";
import { parseEventId } from "@/lib/clinic-mode/validation";
import { listPolicyProfiles, listStaffCandidates, loadProfileTemplate, requireLegalAidAdministrator } from "@/lib/legal-aid/admin-service";
import { getLegalAidBranding } from "@/lib/legal-aid/branding";
import { getLegalAidEventById } from "@/lib/legal-aid/registration-service";

export const dynamic = "force-dynamic";
export const revalidate = 0;

// Partner administration of one clinic's legal-aid experience.
export default async function LegalAidAdminPage({ params }: { params: Promise<{ eventId: string }> }) {
  noStore();
  const { eventId: raw } = await params;
  const eventId = parseEventId(raw);
  let actor;
  try { actor = await requireLegalAidAdministrator(); }
  catch (error) {
    if (error instanceof ClinicServiceError && error.code === "unauthenticated") redirect(`/sign-in?next=${encodeURIComponent(`/partner/clinic/${eventId}/legal-aid`)}`);
    if (error instanceof ClinicServiceError) return <Denied message={error.message} />;
    throw error;
  }
  const event = await getLegalAidEventById(eventId);
  if (!event) notFound();
  if (actor.kind === "partner" && actor.partnerSlug !== event.partnerSlug) return <Denied message="Cross-tenant Clinic access is denied." />;
  const branding = getLegalAidBranding(event.partnerSlug);
  if (!branding) return <Denied message="Legal Aid Clinic Mode is not enabled for this organization." />;
  const [profiles, staff] = await Promise.all([listPolicyProfiles(event.partnerSlug), listStaffCandidates(eventId, actor.kind === "partner" ? { kind: "partner", partnerSlug: actor.partnerSlug } : { kind: "internal_admin" })]);

  return (
    <LegalAidShell branding={branding} audience="staff" maxWidth="max-w-5xl">
      <Link href={`/partner/clinic/${eventId}`} className="text-sm font-bold text-[var(--la-brand-dark)]">← Event controls</Link>
      <h1 className="mt-4 text-3xl font-black tracking-tight">{event.name}: legal aid clinic setup</h1>
      <p className="mt-2 text-sm text-[#5B4E66]">{event.status} · {event.locationName} · capacity {event.capacity}</p>
      <div className="mt-6"><LegalAidAdminClient event={event} profiles={profiles} staff={staff} templateAvailable={loadProfileTemplate(event.partnerSlug) !== null} registrationUrl={absolutePartnerAppUrl(`/clinic/${event.publicSlug}/register`)} /></div>
    </LegalAidShell>
  );
}

function Denied({ message }: { message: string }) {
  return <main className="min-h-screen bg-[#FBFAFC] px-4 py-20"><div className="mx-auto max-w-xl rounded-xl border border-[#E8E1EE] bg-white p-7"><h1 className="text-2xl font-black text-[#1E1129]">Clinic access denied</h1><p className="mt-3 text-sm leading-6 text-[#5B4E66]">{message}</p></div></main>;
}
