"use client";

import { useState } from "react";
import { Send } from "lucide-react";

const categories = [
  { value: "account_login", label: "Account or login" },
  { value: "payment_receipt", label: "Payment or receipt" },
  { value: "packet_download", label: "Packet download" },
  { value: "briefcase", label: "Briefcase" },
  { value: "wilma", label: "Wilma" },
  { value: "something_else", label: "Something else" }
];

type SupportResponse =
  | { ok: true; supportRequestId: string; mode: "dry_run"; piiDetected: boolean; message: string }
  | { ok?: false; error: string };

export function SupportRequestForm({ briefcaseItemId }: { briefcaseItemId?: string }) {
  const [category, setCategory] = useState(categories[0].value);
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [status, setStatus] = useState<SupportResponse | null>(null);
  const [pending, setPending] = useState(false);

  async function submitSupportRequest(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setStatus(null);

    try {
      const response = await fetch("/api/expungement-ai/support", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ category, email, briefcaseItemId, message })
      });
      const body = (await response.json()) as SupportResponse;
      const errorMessage = "error" in body ? body.error : "Unable to send support request.";
      setStatus(response.ok ? body : { ok: false, error: errorMessage });
      if (response.ok) setMessage("");
    } catch {
      setStatus({ ok: false, error: "Unable to send support request right now." });
    } finally {
      setPending(false);
    }
  }

  return (
    <form className="rounded-md border border-[#ECEFF4] bg-white p-5" onSubmit={submitSupportRequest}>
      <h2 className="text-xl font-extrabold">Request technical help</h2>
      <div className="mt-5 grid gap-4">
        <label className="grid gap-2 text-sm font-bold">
          What do you need help with?
          <select className="min-h-11 rounded-md border border-[#D9DEE8] bg-white px-3 text-sm font-semibold" value={category} onChange={(event) => setCategory(event.target.value)}>
            {categories.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
          </select>
        </label>
        <label className="grid gap-2 text-sm font-bold">
          Email
          <input className="min-h-11 rounded-md border border-[#D9DEE8] px-3 text-sm" type="email" value={email} onChange={(event) => setEmail(event.target.value)} required />
        </label>
        <label className="grid gap-2 text-sm font-bold">
          Message
          <textarea className="min-h-32 rounded-md border border-[#D9DEE8] px-3 py-2 text-sm leading-6" value={message} onChange={(event) => setMessage(event.target.value)} required maxLength={2000} />
        </label>
      </div>
      <button className="mt-5 inline-flex min-h-11 items-center justify-center gap-2 rounded-md bg-[#FF3B00] px-5 text-sm font-bold text-white disabled:opacity-60" type="submit" disabled={pending}>
        <Send className="h-4 w-4" aria-hidden="true" />
        {pending ? "Sending" : "Send request"}
      </button>
      {status?.ok ? (
        <p className="mt-4 rounded-md bg-[#00A99D]/10 p-3 text-sm font-semibold text-[#007A72]">
          Request received for support triage. Reference: {status.supportRequestId}{status.piiDetected ? " Sensitive details were redacted before logging." : ""}
        </p>
      ) : status?.error ? (
        <p className="mt-4 rounded-md bg-[#FF3B00]/10 p-3 text-sm font-semibold text-[#8F2300]">{status.error}</p>
      ) : null}
    </form>
  );
}
