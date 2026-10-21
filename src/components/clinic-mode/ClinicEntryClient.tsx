"use client";

import { useState, type FormEvent } from "react";
import type { PublicClinicEvent } from "@/lib/clinic-mode/types";

export function ClinicEntryClient({ event }: { event: PublicClinicEvent }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function enterClinic(formEvent: FormEvent<HTMLFormElement>) {
    formEvent.preventDefault();
    setBusy(true);
    setError("");
    const code = String(new FormData(formEvent.currentTarget).get("eventCode") ?? "");
    const response = await fetch("/api/clinic/entry", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ eventSlug: event.publicSlug, code }) }).catch(() => null);
    const body = await response?.json().catch(() => null) as { error?: string; next?: string } | null;
    if (!response?.ok || !body?.next) {
      setError(body?.error ?? "Clinic entry is temporarily unavailable.");
      setBusy(false);
      return;
    }
    window.location.replace(body.next);
  }

  return (
    <form onSubmit={enterClinic} autoComplete="off" className="rounded-2xl border border-[#E8DED3] bg-white p-6 shadow-sm">
      <p className="text-xs font-black uppercase tracking-[0.2em] text-[#A8431F]">Event-specific access</p>
      <h2 className="mt-3 text-2xl font-black text-[#0F1E3D]">Enter this Clinic</h2>
      <p className="mt-3 text-sm leading-6 text-[#5C5750]">Enter the code provided by Clinic staff. The code is checked by the server and cannot grant access to another event or organization.</p>
      <div className="mt-5 rounded-xl border border-[#D9E5DF] bg-[#F3F8F5] p-4 text-sm leading-6 text-[#29453B]">
        <p><strong>Screening is free</strong>, and the partner covers the packet. You will use your own account and keep ownership of your matter.</p>
        <p className="mt-2">Have your court or arrest records ready. A volunteer can help you find and enter record facts, but LegalEase does not file the packet or guarantee relief.</p>
      </div>
      <label className="mt-5 block text-sm font-black text-[#0F1E3D]" htmlFor="eventCode">Event access code</label>
      <input id="eventCode" name="eventCode" required minLength={8} maxLength={120} autoCapitalize="characters" spellCheck={false}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? "eventCodeError" : undefined}
        className="mt-2 min-h-12 w-full rounded-md border border-[#CFC4B8] px-4 text-base font-bold uppercase tracking-wide outline-none focus:border-[#1D9E75] focus:ring-2 focus:ring-[#1D9E75]/20" />
      {/* The alert announces the failure; describedby ties it to the field so
          it is read again when focus returns there. */}
      <p id="eventCodeError" role="alert" className={error ? "mt-3 text-sm font-bold text-[#B43D20]" : "sr-only"}>{error}</p>
      <button disabled={busy} className="mt-5 min-h-12 w-full rounded-md bg-[#0F1E3D] px-5 py-3 text-base font-black text-white hover:bg-[#1F365F] disabled:opacity-60">{busy ? "Checking event…" : "Continue to participant consent"}</button>
      <p className="mt-4 text-xs leading-5 text-[#786F67]">Each participant signs in to their own account. Clinic staff assistance does not transfer ownership of the participant&apos;s matter or Briefcase.</p>
    </form>
  );
}
