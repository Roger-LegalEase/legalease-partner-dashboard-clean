import Link from "next/link";
import { unstable_noStore as noStore } from "next/cache";
import { notFound } from "next/navigation";
import { LegalAidShell, Panel, laPrimary, laSecondary } from "@/components/legal-aid/LegalAidShell";
import { requireConsumerBriefcaseSession } from "@/lib/expungement-ai/auth";
import { formatClinicDate, getLegalAidBranding } from "@/lib/legal-aid/branding";
import { getParticipantIntake } from "@/lib/legal-aid/intake-service";
import { listParticipantRegistrations } from "@/lib/legal-aid/registration-service";
import type { IntakeStatus, ParticipantIntakeView } from "@/lib/legal-aid/types";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const STATUS_COPY: Record<IntakeStatus, string> = {
  draft: "Your application is saved and not yet submitted.",
  submitted: "Your application has been received and is waiting for review.",
  needs_information: "The clinic team has asked you for more information.",
  staff_review: "The clinic team is reviewing your application.",
  approved: "You are approved for clinic services. See your next steps below.",
  declined_for_program: "The clinic team could not accept this application. They will explain your options.",
  referred: "The clinic team has referred you to another resource.",
  withdrawn: "You withdrew this application."
};

// The participant's hub: every clinic they registered for, the state of each
// application, and the one link that continues it. Requires the same
// authenticated account that registered.
export default async function ContinuePage({ params }: { params: Promise<{ partnerSlug: string }> }) {
  noStore();
  const { partnerSlug } = await params;
  const branding = getLegalAidBranding(partnerSlug);
  if (!branding) notFound();
  const session = await requireConsumerBriefcaseSession(`/p/${partnerSlug}/continue`);
  const registrations = (await listParticipantRegistrations(session.userId)).filter((entry) => entry.event.partnerSlug === partnerSlug);
  const intakes = await Promise.all(registrations.map((entry) => getParticipantIntake(entry.event.id, session.userId)));

  return (
    <LegalAidShell branding={branding}>
      <h1 className="text-3xl font-black tracking-tight sm:text-4xl">My application</h1>
      <p className="mt-3 max-w-2xl text-base leading-7 text-[#5B4E66]">Signed in as {session.userEmail ?? "your account"}. Your answers are saved as you go, and only the {branding.name} team assigned to your clinic can see them.</p>
      <div className="mt-8 space-y-4">
        {registrations.length === 0 ? (
          <Panel tone="brand" title="You have not registered for a clinic yet">
            <p className="text-sm leading-6 text-[#5B4E66]">Choose a clinic date first. Registration takes about two minutes.</p>
            <Link href={branding.clinicsHref} className={`${laPrimary} mt-4`}>See open clinics</Link>
          </Panel>
        ) : null}
        {registrations.map((entry, index) => <RegistrationCard key={entry.registration.id} entry={entry} intake={intakes[index]} />)}
      </div>
      <p className="mt-8 text-sm text-[#5B4E66]"><Link href="/briefcase" className="font-bold text-[var(--la-brand-dark)] underline">Go to my LegalEase briefcase</Link> for screening results and prepared documents.</p>
    </LegalAidShell>
  );
}

function RegistrationCard({ entry, intake }: { entry: Awaited<ReturnType<typeof listParticipantRegistrations>>[number]; intake: ParticipantIntakeView | null }) {
  const { registration, event } = entry;
  const cancelled = registration.status === "cancelled" || registration.status === "declined";
  const editable = intake ? intake.status === "draft" || intake.status === "needs_information" : true;
  return (
    <article className="rounded-2xl border border-[#E8E1EE] bg-white p-5 sm:p-6">
      <p className="text-xs font-black uppercase tracking-[0.18em] text-[var(--la-brand)]">{registrationLabel(registration.status)}</p>
      <h2 className="mt-1 text-2xl font-black">{event.name}</h2>
      <p className="mt-2 text-sm leading-6 text-[#5B4E66]">{formatClinicDate(event.startsAt, event.timezone)} · {event.locationName}</p>
      <p className="mt-3 text-sm leading-6">{intake ? STATUS_COPY[intake.status] : "You have not started your application."}</p>
      {intake && intake.openRequests.length > 0 ? <ul className="mt-3 list-disc space-y-1 pl-5 text-sm">{intake.openRequests.map((request) => <li key={request.id}>{request.requestText}</li>)}</ul> : null}
      {intake && intake.nextSteps.filter((step) => step.status === "pending").length > 0 ? (
        <div className="mt-3 rounded-md bg-[var(--la-soft)] p-3 text-sm"><p className="font-bold">Your next steps</p><ul className="mt-1 list-disc space-y-1 pl-5">{intake.nextSteps.filter((step) => step.status === "pending").map((step) => <li key={step.id}>{step.title}{step.dueAt ? ` (by ${new Intl.DateTimeFormat("en-US", { dateStyle: "medium" }).format(new Date(step.dueAt))})` : ""}</li>)}</ul></div>
      ) : null}
      <div className="mt-5 flex flex-wrap gap-2">
        {!cancelled ? <Link href={`/clinic/${event.publicSlug}/intake`} className={laPrimary}>{intake ? (editable ? "Continue my application" : "View my application") : "Start my application"}</Link> : null}
        <Link href={`/clinic/${event.publicSlug}/register`} className={laSecondary}>Registration details</Link>
      </div>
    </article>
  );
}

function registrationLabel(status: string): string {
  return status === "confirmed" ? "Registration confirmed" : status === "waitlisted" ? "On the waitlist" : status === "cancelled" ? "Registration cancelled" : status === "declined" ? "Registration not accepted" : "Registration received";
}
