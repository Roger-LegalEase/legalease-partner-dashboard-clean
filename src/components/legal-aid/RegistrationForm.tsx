"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { laInput, laPrimary } from "./LegalAidShell";

// Clinic registration collects only what is needed to hold a place and reach
// the person: name, a way to be contacted, and assistance needs. The
// idempotency key is created once per form so a retried submit cannot create
// a second registration.

export function RegistrationForm({ eventId, partnerName, defaultEmail }: { eventId: string; partnerName: string; defaultEmail: string | null }) {
  const router = useRouter();
  const [idempotencyKey] = useState(() => (typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}`));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    const data = new FormData(event.currentTarget);
    const body = {
      eventId, idempotencyKey,
      contactName: String(data.get("contactName") ?? ""),
      contactEmail: String(data.get("contactEmail") ?? ""),
      contactPhone: String(data.get("contactPhone") ?? ""),
      preferredContact: String(data.get("preferredContact") ?? ""),
      languagePreference: String(data.get("languagePreference") ?? ""),
      assistanceNeeds: String(data.get("assistanceNeeds") ?? "")
    };
    try {
      const response = await fetch("/api/legal-aid/registrations", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
      const payload = await response.json().catch(() => ({})) as { error?: string };
      if (!response.ok) { setError(payload.error ?? "Your registration could not be saved. Please try again."); return; }
      router.refresh();
    } catch {
      setError("Your registration could not be saved. Check your connection and try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-4" noValidate>
      <label className="block text-sm font-bold">Your full name<input name="contactName" required autoComplete="name" className={laInput} /></label>
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block text-sm font-bold">Email<input name="contactEmail" type="email" autoComplete="email" defaultValue={defaultEmail ?? ""} className={laInput} /></label>
        <label className="block text-sm font-bold">Phone<input name="contactPhone" type="tel" autoComplete="tel" className={laInput} /></label>
      </div>
      <fieldset>
        <legend className="text-sm font-bold">How should {partnerName} contact you?</legend>
        <div className="mt-2 grid gap-2 sm:grid-cols-2">
          {[["email", "Email"], ["phone", "Phone call"], ["text", "Text message"], ["either", "Any of these"]].map(([value, label]) => (
            <label key={value} className="flex min-h-11 items-center gap-2 rounded-md border border-[#E8E1EE] bg-white px-3 text-sm"><input type="radio" name="preferredContact" value={value} defaultChecked={value === "either"} required />{label}</label>
          ))}
        </div>
      </fieldset>
      <label className="block text-sm font-bold">Language you prefer (optional)<input name="languagePreference" placeholder="English" className={laInput} /></label>
      <label className="block text-sm font-bold">Anything that would help us assist you at the clinic? (optional)<textarea name="assistanceNeeds" rows={3} placeholder="For example: I need an interpreter, I use a wheelchair, I can only come in the afternoon." className={laInput} /></label>
      <p className="text-xs leading-5 text-[#5B4E66]">Registration holds your place. It does not ask about your finances, citizenship, or Social Security number; that comes later, in your private application, and only if you choose to continue.</p>
      {error ? <p role="alert" className="rounded-md border border-[#E6B8B8] bg-[#FFF3F3] px-3 py-2 text-sm font-semibold text-[#8A1F1F]">{error}</p> : null}
      <button type="submit" disabled={busy} className={laPrimary}>{busy ? "Saving your place…" : "Register for this clinic"}</button>
    </form>
  );
}
