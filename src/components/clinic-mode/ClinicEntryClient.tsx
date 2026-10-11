"use client";

import { useRef, useState, type FormEvent } from "react";
import { useLocalization } from "@/components/expungement-ai/LocalizationProvider";
import type { PublicClinicEvent } from "@/lib/clinic-mode/types";

export function ClinicEntryClient({ event, practice = false }: { event: PublicClinicEvent; practice?: boolean }) {
  const { text, locale } = useLocalization();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const inFlight=useRef(false),request=useRef<{code:string;id:string}|null>(null);

  async function enterClinic(formEvent: FormEvent<HTMLFormElement>) {
    formEvent.preventDefault();
    if(inFlight.current)return;
    inFlight.current=true;
    setBusy(true);
    setError("");
    const code = String(new FormData(formEvent.currentTarget).get("eventCode") ?? "");
    if(request.current?.code!==code)request.current={code,id:crypto.randomUUID()};
    const response = await fetch("/api/clinic/entry", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ eventSlug: event.publicSlug, code, requestId:request.current.id }) }).catch(() => null);
    const body = await response?.json().catch(() => null) as { error?: string; next?: string } | null;
    if (!response?.ok || !body?.next) {
      setError(body?.error ?? "Clinic entry is temporarily unavailable.");
      setBusy(false);
      inFlight.current=false;
      return;
    }
    window.location.replace(body.next);
  }

  return (
    <form onSubmit={enterClinic} autoComplete="off" className="rounded-2xl border border-[#E8DED3] bg-white p-6 shadow-sm">
      <p className="text-xs font-black uppercase tracking-[0.2em] text-[#A8431F]">{text("Event-specific access")}</p>
      <h2 className="mt-3 text-2xl font-black text-[#0F1E3D]">{text("Enter this Clinic")}</h2>
      <p className="mt-3 text-sm leading-6 text-[#5C5750]">{text("Enter the code provided by Clinic staff. The code is checked by the server and cannot grant access to another event or organization.")}</p>
      <div className="mt-5 rounded-xl border border-[#D9E5DF] bg-[#F3F8F5] p-4 text-sm leading-6 text-[#29453B]">
        {practice ? <p>{locale === "es" ? "Evento de práctica: use una cuenta ficticia .test verificada. No se usan créditos patrocinados, pagos ni datos de participantes reales." : "Practice event: use a verified fictional .test account. No sponsor credits, payment, or real participant data are used."}</p> : <p><strong>{text("Screening is free")}</strong>{locale === "es" ? ". La disponibilidad de paquetes, el patrocinio y cualquier pago se confirman por separado para su caso. Usted conserva la propiedad de su cuenta y su caso." : ". Packet availability, sponsorship and any payment requirements are confirmed separately for your matter. You keep ownership of your account and matter."}</p>}
        <p className="mt-2">{text("Have your court or arrest records ready. A volunteer can help you find and enter record facts, but LegalEase does not file the packet or guarantee relief.")}</p>
      </div>
      <label className="mt-5 block text-sm font-black text-[#0F1E3D]" htmlFor="eventCode">{text("Event access code")}</label>
      <input id="eventCode" name="eventCode" required minLength={8} maxLength={120} autoCapitalize="characters" spellCheck={false}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? "eventCodeError" : undefined}
        className="mt-2 min-h-12 w-full rounded-md border border-[#CFC4B8] px-4 text-base font-bold uppercase tracking-wide outline-none focus:border-[#1D9E75] focus:ring-2 focus:ring-[#1D9E75]/20" />
      {/* The alert announces the failure; describedby ties it to the field so
          it is read again when focus returns there. */}
      <p id="eventCodeError" role="alert" className={error ? "mt-3 text-sm font-bold text-[#B43D20]" : "sr-only"}>{text(error)}</p>
      <button disabled={busy} className="mt-5 min-h-12 w-full rounded-md bg-[#0F1E3D] px-5 py-3 text-base font-black text-white hover:bg-[#1F365F] disabled:opacity-60">{busy ? text("Checking event…") : text("Continue to participant consent")}</button>
      <p className="mt-4 text-xs leading-5 text-[#786F67]">{text("Each participant signs in to their own account. Clinic staff assistance does not transfer ownership of the participant's matter or Briefcase.")}</p>
    </form>
  );
}

export function ClinicEventDate({ startsAt, timezone }: { startsAt: string; timezone: string }) {
  const { locale } = useLocalization();
  return <>{new Intl.DateTimeFormat(locale === "es" ? "es-US" : "en-US", { dateStyle: "full", timeStyle: "short", timeZone: timezone }).format(new Date(startsAt))}</>;
}
