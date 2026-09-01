import { unstable_noStore as noStore } from "next/cache";
import { notFound } from "next/navigation";
import { ClinicPrivacyBoundary } from "@/components/clinic-mode/ClinicPrivacyBoundary";
import { ScreeningFlow } from "@/components/expungement-ai/screening/ScreeningFlow";
import { getClinicParticipantSession } from "@/lib/clinic-mode/participant-service";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function ClinicScreeningPage({ params }: { params: Promise<{ eventSlug: string; state: string }> }) {
  noStore();
  const { eventSlug, state } = await params;
  const session = await getClinicParticipantSession(eventSlug);
  const participantUserId = session.participantUserId;
  const screeningSessionId = session.screeningSessionId;
  if (!participantUserId || session.jurisdiction !== state.toUpperCase()) notFound();
  return <ClinicPrivacyBoundary cleanEntryPath={`/clinic/${eventSlug}`}><main className="min-h-screen bg-[#F7F9FC] px-4 py-8"><div className="mx-auto max-w-4xl"><div className="mb-4 rounded-xl border border-[#D9E5DF] bg-[#F3F8F5] px-4 py-3 text-sm text-[#29453B]"><strong>Clinic assistance is time-limited.</strong> Your signed-in account remains the owner of this screening and any saved matter.</div><ScreeningFlow key={`${state}:${screeningSessionId}`} state={state} initialSessionId={screeningSessionId} /></div></main></ClinicPrivacyBoundary>;
}
