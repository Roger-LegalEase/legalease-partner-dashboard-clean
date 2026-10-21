import Link from "next/link";
import { unstable_noStore as noStore } from "next/cache";
import { notFound, redirect } from "next/navigation";
import { LegalAidShell, Panel } from "@/components/legal-aid/LegalAidShell";
import { ClinicServiceError } from "@/lib/clinic-mode/errors";
import { parseEventId } from "@/lib/clinic-mode/validation";
import { formatClinicDate, getLegalAidBranding } from "@/lib/legal-aid/branding";
import { getEventForStaff, listEventIntakes } from "@/lib/legal-aid/intake-service";
import { LEGAL_AID_PERMISSION_LABELS, type LegalAidStaffPermission } from "@/lib/legal-aid/types";
import { resolveSessionPartner, SessionPartnerError } from "@/lib/partners/session-partner";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const STATUS_LABELS: Record<string, string> = {
  draft: "Draft", submitted: "Submitted", needs_information: "Needs information", staff_review: "In review", approved: "Approved", declined_for_program: "Declined", referred: "Referred", withdrawn: "Withdrawn"
};

// The clinic team's list of applications for one legal-aid event. Visible only
// to staff approved on this event; the list carries no financial detail.
export default async function ApplicationsPage({ params }: { params: Promise<{ eventId: string }> }) {
  noStore();
  const { eventId: raw } = await params;
  const eventId = parseEventId(raw);
  const actor = await staffOrRedirect(`/clinic/staff/${eventId}/applications`);
  let context;
  try { context = await getEventForStaff(eventId, actor.authUserId); }
  catch (error) { if (error instanceof ClinicServiceError) return <Denied message={error.message} />; throw error; }
  const branding = getLegalAidBranding(context.event.partnerSlug);
  if (!branding || context.event.experience !== "legal_aid") notFound();
  const intakes = await listEventIntakes(eventId, actor.authUserId).catch((error: unknown) => { if (error instanceof ClinicServiceError && error.code === "forbidden") return null; throw error; });

  return (
    <LegalAidShell branding={branding} audience="staff" maxWidth="max-w-6xl">
      <Link href={`/partner/clinic/${eventId}`} className="text-sm font-bold text-[var(--la-brand-dark)]">← Event controls</Link>
      <h1 className="mt-4 text-3xl font-black tracking-tight">{context.event.name}: applications</h1>
      <p className="mt-2 text-sm text-[#5B4E66]">{formatClinicDate(context.event.startsAt, context.event.timezone)} · {context.event.locationName} · Your roles: {context.permissions.map((permission) => LEGAL_AID_PERMISSION_LABELS[permission as LegalAidStaffPermission]?.title ?? permission).join(", ")}</p>
      <div className="mt-6">
        {intakes === null ? (
          <Panel tone="warn" title="Your role does not include reviewing applications"><p className="text-sm">Open an application from a link the coordinator gives you, or ask the coordinator to add the intake, program review or attorney role.</p></Panel>
        ) : (
          <div className="overflow-x-auto rounded-2xl border border-[#E8E1EE] bg-white">
            <table className="w-full min-w-[720px] text-left text-sm">
              <thead className="bg-[var(--la-soft)] text-xs font-black uppercase tracking-wide text-[var(--la-brand-dark)]"><tr><th className="px-4 py-3">Applicant</th><th className="px-4 py-3">Status</th><th className="px-4 py-3">Matter</th><th className="px-4 py-3">Registration</th><th className="px-4 py-3">Attorney</th><th className="px-4 py-3">Open requests</th><th className="px-4 py-3">Last activity</th></tr></thead>
              <tbody className="divide-y divide-[#EEE8F2]">
                {intakes.map((intake) => (
                  <tr key={intake.id}>
                    <td className="px-4 py-3 font-bold"><Link href={`/clinic/staff/${eventId}/applications/${intake.id}`} className="text-[var(--la-brand-dark)] underline">{intake.contactName}</Link></td>
                    <td className="px-4 py-3">{STATUS_LABELS[intake.status] ?? intake.status}</td>
                    <td className="px-4 py-3">{intake.legalMatter?.replaceAll("_", " ") ?? "—"}</td>
                    <td className="px-4 py-3">{intake.registrationStatus ?? "—"}</td>
                    <td className="px-4 py-3">{intake.attorneyReviewStatus.replaceAll("_", " ")}</td>
                    <td className="px-4 py-3">{intake.openRequestCount}</td>
                    <td className="px-4 py-3 text-[#5B4E66]">{new Intl.DateTimeFormat("en-US", { dateStyle: "medium", timeStyle: "short" }).format(new Date(intake.lastActivityAt))}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {intakes.length === 0 ? <p className="p-8 text-sm text-[#7A6E85]">No applications have been started for this clinic.</p> : null}
          </div>
        )}
      </div>
    </LegalAidShell>
  );
}

export async function staffOrRedirect(next: string) {
  try { return await resolveSessionPartner(); }
  catch (error) {
    if (error instanceof SessionPartnerError && error.code === "unauthenticated") redirect(`/sign-in?next=${encodeURIComponent(next)}`);
    throw new ClinicServiceError("forbidden", "Staff access is denied.");
  }
}

export function Denied({ message }: { message: string }) {
  return <main className="min-h-screen bg-[#FBFAFC] px-4 py-20"><div className="mx-auto max-w-xl rounded-xl border border-[#E8E1EE] bg-white p-7"><h1 className="text-2xl font-black text-[#1E1129]">Clinic access denied</h1><p className="mt-3 text-sm leading-6 text-[#5B4E66]">{message}</p></div></main>;
}
