import Link from "next/link";
import { unstable_noStore as noStore } from "next/cache";
import { ClinicQueueClient } from "@/components/clinic-mode/ClinicQueueClient";
import { getClinicQueueEvent, listClinicQueue } from "@/lib/clinic-mode/participant-service";
import { parseEventId } from "@/lib/clinic-mode/validation";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function ClinicStaffQueuePage({ params }: { params: Promise<{ eventId: string }> }) {
  noStore();
  const { eventId: rawEventId } = await params;
  const eventId = parseEventId(rawEventId);
  const [event, cases] = await Promise.all([getClinicQueueEvent(eventId), listClinicQueue(eventId)]);
  return <main className="min-h-screen bg-[#FBF7F2] px-4 py-10 text-[#0F1E3D]"><div className="mx-auto max-w-7xl"><Link href={`/partner/clinic/${eventId}`} className="text-sm font-bold text-[#0F6E56]">Back to event controls</Link><header className="mt-5 mb-7"><p className="text-xs font-black uppercase tracking-[0.2em] text-[#1D9E75]">Approved event staff</p><h1 className="mt-3 text-4xl font-black">{event.name} case queue</h1><p className="mt-3 max-w-3xl text-sm leading-6 text-[#5C5750]">Queue access is event-scoped. Participant references are intentionally minimized; payment, entitlement, verified court identity, and another tenant&apos;s matters cannot be changed here.</p></header><ClinicQueueClient eventId={eventId} initialCases={cases} /></div></main>;
}
