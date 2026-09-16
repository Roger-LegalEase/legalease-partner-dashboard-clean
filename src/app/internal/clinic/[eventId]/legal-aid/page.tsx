import Link from "next/link";
import { unstable_noStore as noStore } from "next/cache";
import { notFound } from "next/navigation";
import { LegalAidAdminClient } from "@/components/legal-aid/LegalAidAdminClient";
import { LegalAidShell } from "@/components/legal-aid/LegalAidShell";
import { absolutePartnerAppUrl } from "@/lib/app-url";
import { parseEventId } from "@/lib/clinic-mode/validation";
import { listPolicyProfiles, listStaffCandidates, loadProfileTemplate } from "@/lib/legal-aid/admin-service";
import { getLegalAidBranding } from "@/lib/legal-aid/branding";
import { getLegalAidEventById } from "@/lib/legal-aid/registration-service";
import { InternalAdminDenied, resolveInternalAdminPageAccess } from "@/lib/partners/internal-admin-gate";

export const dynamic = "force-dynamic";
export const revalidate = 0;

// LegalEase internal administration of one clinic's legal-aid experience.
// The same setup as the partner page, reached through the internal Clinic
// Mode console, for the interim coordinator whose LegalEase identity is an
// internal administrator rather than a member of the organization. The
// authority is the existing internal_admin authority every Legal Aid service
// call already accepts; this page only makes it reachable.
export default async function InternalLegalAidAdminPage({ params }: { params: Promise<{ eventId: string }> }) {
  noStore();
  const { eventId: raw } = await params;
  const eventId = parseEventId(raw);
  const access = await resolveInternalAdminPageAccess(`/internal/clinic/${eventId}/legal-aid`);
  if (access.kind === "denied") return <InternalAdminDenied title={access.title} body={access.body} email={access.email} />;
  const event = await getLegalAidEventById(eventId);
  if (!event) notFound();
  const branding = getLegalAidBranding(event.partnerSlug);
  if (!branding) return <Denied message="Legal Aid Clinic Mode is not enabled for this organization." />;
  const [profiles, staff] = await Promise.all([listPolicyProfiles(event.partnerSlug), listStaffCandidates(eventId, { kind: "internal_admin" })]);

  return (
    <LegalAidShell branding={branding} audience="staff" maxWidth="max-w-5xl">
      <Link href={`/internal/clinic/${eventId}`} className="text-sm font-bold text-[var(--la-brand-dark)]">← Event controls</Link>
      <h1 className="mt-4 text-3xl font-black tracking-tight">{event.name}: legal aid clinic setup</h1>
      <p className="mt-2 text-sm text-[#5B4E66]">{event.status} · {event.locationName} · capacity {event.capacity} · LegalEase internal administration</p>
      <div className="mt-6"><LegalAidAdminClient event={event} profiles={profiles} staff={staff} templateAvailable={loadProfileTemplate(event.partnerSlug) !== null} registrationUrl={absolutePartnerAppUrl(`/clinic/${event.publicSlug}/register`)} consoleBase="/internal/clinic" /></div>
    </LegalAidShell>
  );
}

function Denied({ message }: { message: string }) {
  return <main className="min-h-screen bg-[#FBFAFC] px-4 py-20"><div className="mx-auto max-w-xl rounded-xl border border-[#E8E1EE] bg-white p-7"><h1 className="text-2xl font-black text-[#1E1129]">Clinic access denied</h1><p className="mt-3 text-sm leading-6 text-[#5B4E66]">{message}</p></div></main>;
}
