import { LocalizedRuntimeText } from "@/components/expungement-ai/LocalizationProvider";
import { unstable_noStore as noStore } from "next/cache";
import { redirect } from "next/navigation";
import { ClinicAssistanceClient } from "@/components/clinic-mode/ClinicAssistanceClient";
import { ClinicPrivacyBoundary } from "@/components/clinic-mode/ClinicPrivacyBoundary";
import { getClinicEntryContext, getPublicClinicEvent, listApprovedClinicStaff, hasClinicDeviceRecoveryContext } from "@/lib/clinic-mode/participant-service";
import { getServerAuthState } from "@/lib/supabase/auth-server";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function ClinicAssistPage({ params }: { params: Promise<{ eventSlug: string }> }) {
  noStore();
  const { eventSlug } = await params;
  const auth = await getServerAuthState();
  if (!auth.isAuthenticated && await hasClinicDeviceRecoveryContext()) return <ClinicPrivacyBoundary cleanEntryPath="/clinic" recovery />;
  if (!auth.isAuthenticated) redirect(`/expungement-ai/sign-in?mode=create&next=${encodeURIComponent(`/clinic/${eventSlug}/assist`)}`);
  const context = await Promise.all([getPublicClinicEvent(eventSlug), getClinicEntryContext(eventSlug)]).catch(async (error) => {
    if (await hasClinicDeviceRecoveryContext()) return null;
    throw error;
  });
  if (!context) return <ClinicPrivacyBoundary cleanEntryPath="/clinic" recovery />;
  const [event, entry] = context;
  const staff = await listApprovedClinicStaff(entry.eventId);
  return <ClinicPrivacyBoundary cleanEntryPath={`/clinic/${eventSlug}`}><main className="min-h-screen bg-[#FBF7F2] px-4 py-10"><div className="mx-auto max-w-2xl"><p className="mb-5 text-sm font-bold text-[#0F6E56]">{event.name} · <LocalizedRuntimeText text="signed in participant" /></p><ClinicAssistanceClient event={event} staff={staff} /></div></main></ClinicPrivacyBoundary>;
}
