import Link from "next/link";
import { unstable_noStore as noStore } from "next/cache";
import { notFound } from "next/navigation";
import { LegalAidShell } from "@/components/legal-aid/LegalAidShell";
import { NotaryClient } from "@/components/legal-aid/NotaryClient";
import { ReviewClient } from "@/components/legal-aid/ReviewClient";
import { ClinicServiceError } from "@/lib/clinic-mode/errors";
import { parseEventId } from "@/lib/clinic-mode/validation";
import { getLegalAidBranding } from "@/lib/legal-aid/branding";
import { getEventForStaff, getNotaryTaskView, getStaffIntakeDetail, intakePermissionsFor, listEventStaffDirectory } from "@/lib/legal-aid/intake-service";
import { Denied, staffOrRedirect } from "../page";

export const dynamic = "force-dynamic";
export const revalidate = 0;

// One application, for the assigned staff member. Reviewers get the full
// detail; a notary gets only the execution view.
export default async function ApplicationDetailPage({ params }: { params: Promise<{ eventId: string; intakeId: string }> }) {
  noStore();
  const { eventId: rawEvent, intakeId: rawIntake } = await params;
  const eventId = parseEventId(rawEvent);
  const intakeId = parseEventId(rawIntake);
  const actor = await staffOrRedirect(`/clinic/staff/${eventId}/applications/${intakeId}`);
  let context;
  try { context = await getEventForStaff(eventId, actor.authUserId); }
  catch (error) { if (error instanceof ClinicServiceError) return <Denied message={error.message} />; throw error; }
  const branding = getLegalAidBranding(context.event.partnerSlug);
  if (!branding) notFound();
  const permissions = await intakePermissionsFor(intakeId, actor.authUserId);
  const reviewer = permissions.some((permission) => ["coordinator", "intake_review", "program_review", "attorney"].includes(permission));
  const notaryOnly = !reviewer && permissions.includes("notary");
  if (!reviewer && !notaryOnly && !permissions.includes("follow_up") && !permissions.includes("export")) return <Denied message="You are not assigned to this application." />;

  const loaded = await load(notaryOnly, intakeId, eventId, actor.authUserId);
  if (loaded.kind === "denied") return <Denied message={loaded.message} />;
  if (loaded.kind === "notary") {
    return (
      <LegalAidShell branding={branding} audience="staff" maxWidth="max-w-4xl">
        <Link href={`/clinic/staff/${eventId}/applications`} className="text-sm font-bold text-[var(--la-brand-dark)]">← Applications</Link>
        <h1 className="mt-4 text-3xl font-black tracking-tight">Notarization</h1>
        <div className="mt-6"><NotaryClient intakeId={intakeId} applicantName={loaded.view.applicantName} tasks={loaded.view.tasks} executedDocuments={loaded.view.executedDocuments} /></div>
      </LegalAidShell>
    );
  }
  if (loaded.detail.eventId !== eventId) notFound();
  return (
    <LegalAidShell branding={branding} audience="staff" maxWidth="max-w-6xl">
      <Link href={`/clinic/staff/${eventId}/applications`} className="text-sm font-bold text-[var(--la-brand-dark)]">← Applications</Link>
      <h1 className="mt-4 text-3xl font-black tracking-tight">Application review</h1>
      <p className="mt-2 text-sm text-[#5B4E66]">{context.event.name}. Every view of this page is recorded in the access log.</p>
      <div className="mt-6"><ReviewClient detail={loaded.detail} staff={loaded.staff} eventId={eventId} /></div>
    </LegalAidShell>
  );
}

async function load(notaryOnly: boolean, intakeId: string, eventId: string, actorUserId: string) {
  try {
    if (notaryOnly) return { kind: "notary" as const, view: await getNotaryTaskView(intakeId, actorUserId) };
    const [detail, staff] = await Promise.all([getStaffIntakeDetail(intakeId, actorUserId), listEventStaffDirectory(eventId, actorUserId)]);
    return { kind: "review" as const, detail, staff };
  } catch (error) {
    if (error instanceof ClinicServiceError) return { kind: "denied" as const, message: error.message };
    throw error;
  }
}
