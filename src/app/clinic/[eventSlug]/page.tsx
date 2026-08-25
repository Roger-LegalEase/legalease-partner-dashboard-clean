import { unstable_noStore as noStore } from "next/cache";
import { notFound } from "next/navigation";
import { ClinicEntryClient } from "@/components/clinic-mode/ClinicEntryClient";
import { getPublicClinicEvent } from "@/lib/clinic-mode/participant-service";
import { ClinicServiceError } from "@/lib/clinic-mode/errors";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function ClinicEntryPage({ params }: { params: Promise<{ eventSlug: string }> }) {
  noStore();
  const { eventSlug } = await params;
  let event;
  try { event = await getPublicClinicEvent(eventSlug); }
  catch (error) { if (error instanceof ClinicServiceError && error.code === "not_found") notFound(); throw error; }
  return <main className="min-h-screen bg-[#FBF7F2] px-4 py-10 text-[#0F1E3D]"><div className="mx-auto max-w-4xl"><header className="grid gap-6 rounded-2xl border border-[#D9E5DF] bg-[#F3F8F5] p-6 md:grid-cols-[1fr_auto]"><div><p className="text-xs font-black uppercase tracking-[0.2em] text-[#1D9E75]">Dedicated Clinic Mode</p><h1 className="mt-3 text-4xl font-black tracking-tight">{event.name}</h1><p className="mt-4 text-sm leading-6 text-[#5C5750]">{event.locationName} · {event.geography}<br />{new Intl.DateTimeFormat("en-US", { dateStyle: "full", timeStyle: "short", timeZone: event.timezone }).format(new Date(event.startsAt))} · {event.timezone}</p></div><div className="rounded-xl bg-[#0F1E3D] px-5 py-4 text-white"><p className="text-xs font-black uppercase tracking-wide text-[#9FE0CA]">Privacy rule</p><p className="mt-2 max-w-48 text-sm leading-5">One participant per session. Reset the device before the next person.</p></div></header><div className="mx-auto mt-8 max-w-xl"><ClinicEntryClient event={event} /></div></div></main>;
}
