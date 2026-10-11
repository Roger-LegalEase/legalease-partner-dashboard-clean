import { ClinicText } from "@/components/clinic-mode/ClinicText";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ClinicServiceError } from "@/lib/clinic-mode/errors";
import { unstable_noStore as noStore } from "next/cache";
import { ClinicQueueClient } from "@/components/clinic-mode/ClinicQueueClient";
import { getClinicQueueEvent, listClinicQueue } from "@/lib/clinic-mode/participant-service";
import { parseEventId } from "@/lib/clinic-mode/validation";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function ClinicStaffQueuePage({ params }: { params: Promise<{ eventId: string }> }) {
  noStore();
  const result = await loadQueue(params);
  if (!result.ok) return <main className="min-h-screen bg-[#FBF7F2] px-4 py-20"><div className="mx-auto max-w-xl rounded-xl border bg-white p-7"><h1 className="text-2xl font-black"><ClinicText value="Clinic queue unavailable" /></h1><p className="mt-3"><ClinicText value={result.message} /></p><Link prefetch={false} href="/partner/clinic" className="mt-4 inline-flex min-h-11 items-center font-bold underline"><ClinicText value="Back to clinics" /></Link></div></main>;
  const { eventId, event, cases } = result;
  return <main className="min-h-screen bg-[#FBF7F2] px-4 py-10 text-[#0F1E3D]"><div className="mx-auto max-w-7xl"><Link prefetch={false} href={event.controlsHref} className="text-sm font-bold text-[#0F6E56]"><ClinicText value={event.controlsLabel} /></Link><header className="mt-5 mb-7"><p className="text-xs font-black uppercase tracking-[0.2em] text-[#127256]"><ClinicText value="Approved event staff" /></p><h1 className="mt-3 text-4xl font-black">{event.name} <ClinicText value="case queue" /></h1><p className="mt-3 max-w-3xl text-sm leading-6 text-[#5C5750]"><ClinicText value="Queue access is event-scoped. Participant references are intentionally minimized; payment, entitlement, verified court identity, and another tenant's matters cannot be changed here." /></p></header><ClinicQueueClient eventId={eventId} initialCases={cases} /></div></main>;
}

async function loadQueue(params: Promise<{ eventId: string }>) {
  try {
    const { eventId: rawEventId } = await params;
    const eventId = parseEventId(rawEventId);
    const [event, cases] = await Promise.all([getClinicQueueEvent(eventId), listClinicQueue(eventId)]);
    return {ok: true as const, eventId, event, cases};
  } catch (error) {
    if (error instanceof ClinicServiceError && error.code === "unauthenticated") redirect("/sign-in?next=/partner/clinic");
    if (error instanceof ClinicServiceError) return {ok: false as const,message:error.code==="forbidden"?"Ask your program administrator to confirm your assignment and queue permission for this event.":error.message};
    throw error;
  }
}
