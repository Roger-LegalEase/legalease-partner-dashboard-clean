"use client";

import { Loader2, Send } from "lucide-react";
import { useState, type FormEvent, type InputHTMLAttributes, type SelectHTMLAttributes } from "react";
import { Button } from "@/components/ui/Button";
import { interestedWorkflowOptions, organizationTypeOptions } from "@/lib/request-pilot/validation";

export function PartnerStartForm() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);
    setError("");
    setMessage("");

    try {
      const formData = new FormData(event.currentTarget);
      const response = await fetch("/api/request-pilot", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          contact_name: String(formData.get("contact_name") ?? ""),
          organization_name: String(formData.get("organization_name") ?? ""),
          email: String(formData.get("email") ?? ""),
          phone: String(formData.get("phone") ?? ""),
          role_title: String(formData.get("role_title") ?? ""),
          organization_type: String(formData.get("organization_type") ?? ""),
          state_or_jurisdiction: String(formData.get("state_or_jurisdiction") ?? ""),
          community_served: String(formData.get("community_served") ?? ""),
          estimated_people_served: String(formData.get("estimated_people_served") ?? ""),
          interested_workflow: String(formData.get("interested_workflow") ?? ""),
          message: String(formData.get("message") ?? ""),
          consent_to_contact: formData.get("consent_to_contact") === "on",
          website: String(formData.get("website") ?? "")
        })
      });
      const payload = (await response.json()) as { ok?: boolean; error?: string };

      if (!response.ok || !payload.ok) {
        throw new Error(payload.error ?? "Unable to submit request.");
      }

      event.currentTarget.reset();
      setMessage("Request received. LegalEase will follow up after discovery review.");
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Unable to submit request.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="grid gap-6">
      <div className="hidden" aria-hidden="true">
        <TextField label="Website" name="website" tabIndex={-1} autoComplete="off" />
      </div>

      <div className="grid gap-5 md:grid-cols-2">
        <TextField label="Organization name" name="organization_name" required />
        <TextField label="Contact name" name="contact_name" required />
        <TextField label="Email" name="email" type="email" required />
        <TextField label="Phone" name="phone" type="tel" />
        <TextField label="Role or title" name="role_title" />
        <SelectField label="Organization type" name="organization_type" options={[...organizationTypeOptions]} required />
        <TextField label="State or jurisdiction" name="state_or_jurisdiction" required />
        <TextField label="Estimated people served" name="estimated_people_served" />
      </div>

      <SelectField label="Interested workflow" name="interested_workflow" options={[...interestedWorkflowOptions]} />

      <label className="grid gap-2 text-sm font-semibold text-navy">
        Community served
        <textarea
          name="community_served"
          required
          rows={4}
          className="rounded-md border border-grayWilma-200 bg-white px-3 py-2 text-sm font-normal text-grayWilma-800 outline-none transition focus:border-teal focus:ring-2 focus:ring-teal/20"
          placeholder="Describe the community, region, or partner audience."
        />
      </label>

      <label className="grid gap-2 text-sm font-semibold text-navy">
        Discovery notes
        <textarea
          name="message"
          rows={5}
          className="rounded-md border border-grayWilma-200 bg-white px-3 py-2 text-sm font-normal text-grayWilma-800 outline-none transition focus:border-teal focus:ring-2 focus:ring-teal/20"
          placeholder="Share goals, timeline, scope, procurement needs, or record-clearing access questions."
        />
      </label>

      <label className="flex items-start gap-3 text-sm font-semibold leading-6 text-grayWilma-700">
        <input name="consent_to_contact" type="checkbox" required className="mt-1 h-4 w-4 rounded border-grayWilma-300 text-teal" />
        LegalEase may contact me about partner discovery and scoped billing.
      </label>

      {message ? (
        <p className="rounded-md border border-teal/20 bg-teal/5 px-3 py-2 text-sm font-semibold text-teal">
          {message}
        </p>
      ) : null}

      {error ? (
        <p className="rounded-md border border-danger/20 bg-danger/5 px-3 py-2 text-sm font-semibold text-danger">
          {error}
        </p>
      ) : null}

      <div className="flex flex-col gap-3 border-t border-grayWilma-200 pt-5 sm:flex-row sm:items-center sm:justify-between">
        <p className="max-w-2xl text-xs leading-5 text-grayWilma-600">
          Partner pricing is custom-scoped after discovery. LegalEase creates Stripe invoices internally after scope is agreed.
        </p>
        <Button type="submit" className="min-h-11 whitespace-nowrap px-5" disabled={isSubmitting}>
          {isSubmitting ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
              Sending request
            </>
          ) : (
            <>
              <Send className="h-4 w-4" aria-hidden="true" />
              Request discovery
            </>
          )}
        </Button>
      </div>
    </form>
  );
}

function TextField({
  label,
  ...props
}: InputHTMLAttributes<HTMLInputElement> & { label: string }) {
  return (
    <label className="grid gap-2 text-sm font-semibold text-navy">
      {label}
      <input
        {...props}
        className="rounded-md border border-grayWilma-200 bg-white px-3 py-2 text-sm font-normal text-grayWilma-800 outline-none transition focus:border-teal focus:ring-2 focus:ring-teal/20"
      />
    </label>
  );
}

function SelectField({
  label,
  options,
  ...props
}: SelectHTMLAttributes<HTMLSelectElement> & { label: string; options: string[] }) {
  return (
    <label className="grid gap-2 text-sm font-semibold text-navy">
      {label}
      <select
        {...props}
        className="rounded-md border border-grayWilma-200 bg-white px-3 py-2 text-sm font-normal text-grayWilma-800 outline-none transition focus:border-teal focus:ring-2 focus:ring-teal/20"
        defaultValue=""
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
