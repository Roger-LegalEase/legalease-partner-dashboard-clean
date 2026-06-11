"use client";

import { CheckCircle2, Loader2, Send } from "lucide-react";
import { useState, type FormEvent, type InputHTMLAttributes, type SelectHTMLAttributes, type TextareaHTMLAttributes } from "react";
import { interestedWorkflowOptions, organizationTypeOptions } from "@/lib/request-pilot/validation";

type ApiResponse = {
  ok: boolean;
  error?: string;
};

export function RequestPilotForm() {
  const [status, setStatus] = useState<"idle" | "submitting" | "success">("idle");
  const [error, setError] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    setError("");
    setStatus("submitting");

    const formData = new FormData(form);
    const payload = Object.fromEntries(formData.entries());

    try {
      const response = await fetch("/api/request-pilot", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          ...payload,
          consent_to_contact: formData.get("consent_to_contact") === "true"
        })
      });

      const result = (await response.json()) as ApiResponse;
      if (!response.ok || !result.ok) {
        throw new Error(result.error ?? "Unable to submit request.");
      }

      setStatus("success");
      form.reset();
    } catch (submitError) {
      setStatus("idle");
      setError(submitError instanceof Error ? submitError.message : "Unable to submit request.");
    }
  }

  if (status === "success") {
    return (
      <section className="rounded-md border border-[#0f7f80]/25 bg-white p-6 shadow-sm">
        <CheckCircle2 className="h-8 w-8 text-[#0f7f80]" aria-hidden="true" />
        <p className="mt-5 text-xs font-black uppercase tracking-[0.16em] text-[#c84f2b]">Request received</p>
        <h2 className="mt-3 font-serif text-4xl font-black leading-tight text-[#102d4a]">Thanks for reaching out.</h2>
        <p className="mt-4 text-base font-semibold leading-7 text-[#526173]">
          LegalEase received your pilot request. We will review the organization, geography, community served, and
          record-clearing support goals before following up.
        </p>
        <button
          type="button"
          onClick={() => setStatus("idle")}
          className="mt-6 inline-flex min-h-11 items-center justify-center rounded-md border border-[#d8c9b7] bg-white px-5 py-2 text-sm font-black text-[#102d4a] transition hover:bg-[#f4eadc]"
        >
          Submit another request
        </button>
      </section>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="rounded-md border border-[#e0d4c4] bg-white p-5 shadow-sm md:p-6">
      <div className="mb-6">
        <p className="text-xs font-black uppercase tracking-[0.16em] text-[#c84f2b]">Partner pilot request</p>
        <h2 className="mt-2 text-2xl font-black text-[#102d4a]">Tell us about the program you want to explore.</h2>
        <p className="mt-2 text-sm leading-6 text-[#526173]">
          Share enough context for a first conversation. Please do not include sensitive personal records or case details.
        </p>
      </div>

      <input type="text" name="company_website" tabIndex={-1} autoComplete="off" className="hidden" aria-hidden="true" />

      <div className="grid gap-5 md:grid-cols-2">
        <TextField label="Contact name" name="contact_name" required maxLength={120} />
        <TextField label="Organization name" name="organization_name" required maxLength={180} />
        <TextField label="Email" name="email" type="email" required maxLength={254} />
        <TextField label="Phone" name="phone" type="tel" maxLength={40} />
        <TextField label="Role or title" name="role_title" maxLength={120} />
        <SelectField label="Organization type" name="organization_type" options={organizationTypeOptions} required />
        <TextField label="State or jurisdiction" name="state_or_jurisdiction" required maxLength={120} />
        <TextField label="Estimated people served" name="estimated_people_served" maxLength={80} />
        <SelectField label="Interested workflow" name="interested_workflow" options={interestedWorkflowOptions} />
      </div>

      <div className="mt-5 grid gap-5">
        <TextAreaField
          label="Community served"
          name="community_served"
          required
          maxLength={500}
          rows={4}
          placeholder="Describe the community, geography, or participant group this pilot would support."
        />
        <TextAreaField
          label="Message"
          name="message"
          maxLength={2000}
          rows={5}
          placeholder="Share goals, timeline, partners involved, or questions about guided workflow, possible eligibility, general legal information, document automation, or dashboard reporting."
        />
      </div>

      <label className="mt-5 flex gap-3 rounded-md border border-[#e0d4c4] bg-[#fbf6ee] p-4 text-sm leading-6 text-[#31465b]">
        <input
          type="checkbox"
          name="consent_to_contact"
          value="true"
          required
          className="mt-1 h-4 w-4 rounded border-[#d8c9b7] text-[#0f7f80]"
        />
        <span>
          I agree that LegalEase may contact me about this Partner Program pilot request. This form is for partnership
          conversations and does not create an attorney-client relationship or promise legal outcomes.
        </span>
      </label>

      {error ? (
        <p className="mt-5 rounded-md border border-[#d96c3b]/25 bg-[#d96c3b]/10 px-4 py-3 text-sm font-bold text-[#9d371d]">
          {error}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={status === "submitting"}
        className="mt-6 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-md bg-[#d96c3b] px-5 py-3 text-sm font-black text-white transition hover:bg-[#c84f2b] disabled:cursor-not-allowed disabled:opacity-60"
      >
        {status === "submitting" ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
            Submitting request
          </>
        ) : (
          <>
            <Send className="h-4 w-4" aria-hidden="true" />
            Submit pilot request
          </>
        )}
      </button>
    </form>
  );
}

function TextField({ label, ...props }: InputHTMLAttributes<HTMLInputElement> & { label: string }) {
  return (
    <label className="grid gap-2 text-sm font-bold text-[#102d4a]">
      {label}
      <input
        {...props}
        className="min-h-11 rounded-md border border-[#d8c9b7] bg-white px-3 py-2 text-sm font-normal text-[#102033] outline-none transition focus:border-[#0f7f80] focus:ring-2 focus:ring-[#0f7f80]/20"
      />
    </label>
  );
}

function SelectField({
  label,
  options,
  ...props
}: SelectHTMLAttributes<HTMLSelectElement> & { label: string; options: readonly string[] }) {
  return (
    <label className="grid gap-2 text-sm font-bold text-[#102d4a]">
      {label}
      <select
        {...props}
        defaultValue=""
        className="min-h-11 rounded-md border border-[#d8c9b7] bg-white px-3 py-2 text-sm font-normal text-[#102033] outline-none transition focus:border-[#0f7f80] focus:ring-2 focus:ring-[#0f7f80]/20"
      >
        <option value="" disabled>
          Select one
        </option>
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    </label>
  );
}

function TextAreaField({ label, ...props }: TextareaHTMLAttributes<HTMLTextAreaElement> & { label: string }) {
  return (
    <label className="grid gap-2 text-sm font-bold text-[#102d4a]">
      {label}
      <textarea
        {...props}
        className="rounded-md border border-[#d8c9b7] bg-white px-3 py-2 text-sm font-normal text-[#102033] outline-none transition focus:border-[#0f7f80] focus:ring-2 focus:ring-[#0f7f80]/20"
      />
    </label>
  );
}
