import { redirect } from "next/navigation";
import { getPublicClinicEvent } from "@/lib/clinic-mode/participant-service";

export const dynamic = "force-dynamic";
export default async function ClinicEntryIndex({ searchParams }: { searchParams: Promise<{ event?: string }> }) {
  const { event } = await searchParams;
  let unavailable = false;
  if (event) {
    if (/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(event) && event.length <= 120) {
      let valid = false;
      try { valid = (await getPublicClinicEvent(event)).publicSlug === event; } catch { unavailable = true; }
      if (valid) redirect(`/clinic/${event}`);
    }
    unavailable = true;
  }
  return <main className="mx-auto max-w-xl px-4 py-12 text-[#0F1E3D]">
    <h1 className="text-3xl font-bold">Open your Clinic event</h1>
    <p className="mt-4">Use the event link or QR code provided by Clinic staff. Confirm the event name before the next participant signs in.</p>
    <p className="mt-3">If the original event is no longer available, ask staff which event to use. This page does not restore an assisted session or participant data.</p>
    <form action="/clinic" method="get" className="mt-6 space-y-3">
      <label htmlFor="clinic-event" className="block font-semibold">Event address name provided by staff</label>
      <input id="clinic-event" name="event" required maxLength={120} pattern="[a-z0-9]+(-[a-z0-9]+)*" className="w-full rounded border p-3" autoComplete="off" />
      <button className="rounded bg-[#0F1E3D] px-5 py-3 font-semibold text-white" type="submit">Open event</button>
    </form>
    {unavailable && <p role="alert" className="mt-4">That event is not available. Ask Clinic staff for the current event link.</p>}
  </main>;
}
