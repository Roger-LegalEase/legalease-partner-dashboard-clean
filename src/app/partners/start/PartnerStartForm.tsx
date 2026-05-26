"use client";

import { CheckCircle2, CreditCard, Loader2 } from "lucide-react";
import { useState, type FormEvent, type InputHTMLAttributes, type SelectHTMLAttributes } from "react";
import { Button } from "@/components/ui/Button";
import type { PartnerPackage } from "@/lib/partners/packages";

const organizationTypes = [
  "Nonprofit",
  "Public agency",
  "Workforce organization",
  "Community college",
  "Legal aid partner",
  "Employer coalition",
  "Other"
];

const primaryNeeds = [
  "Expungement",
  "Sealing",
  "Record restriction",
  "Clean Slate awareness",
  "Mixed/unknown"
];

export function PartnerStartForm({ packages }: { packages: PartnerPackage[] }) {
  const [selectedPackageId, setSelectedPackageId] = useState(packages[1]?.id ?? packages[0]?.id ?? "");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);
    setError("");

    try {
      const formData = new FormData(event.currentTarget);
      const packageId = String(formData.get("packageId") ?? "");

      const response = await fetch("/api/partners/checkout", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ packageId })
      });

      const payload = (await response.json()) as { url?: string; error?: string };

      if (!response.ok || !payload.url) {
        throw new Error(payload.error ?? "Unable to create a checkout session.");
      }

      window.location.assign(payload.url);
    } catch (checkoutError) {
      setError(checkoutError instanceof Error ? checkoutError.message : "Unable to create a checkout session.");
      setIsSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="grid gap-6">
      <fieldset className="grid gap-3">
        <legend className="text-sm font-black text-navy">Program package</legend>
        <div className="grid gap-3">
          {packages.map((partnerPackage) => {
            const selected = selectedPackageId === partnerPackage.id;

            return (
              <label
                key={partnerPackage.id}
                className={`grid cursor-pointer gap-3 rounded-md border p-4 transition ${
                  selected
                    ? "border-teal bg-teal/5 ring-2 ring-teal/15"
                    : "border-grayWilma-200 bg-white hover:border-teal/50"
                }`}
              >
                <input
                  type="radio"
                  name="packageId"
                  value={partnerPackage.id}
                  checked={selected}
                  onChange={() => setSelectedPackageId(partnerPackage.id)}
                  className="sr-only"
                />
                <span className="flex items-start justify-between gap-4">
                  <span>
                    <span className="block text-base font-black text-navy">{partnerPackage.name}</span>
                    <span className="mt-1 block text-sm font-semibold text-teal">{partnerPackage.priceLabel}</span>
                  </span>
                  {selected ? <CheckCircle2 className="h-5 w-5 shrink-0 text-teal" aria-hidden="true" /> : null}
                </span>
                <span className="text-sm leading-6 text-grayWilma-700">{partnerPackage.description}</span>
                <span className="flex flex-wrap gap-2">
                  {partnerPackage.includedComponents.map((component) => (
                    <span
                      key={component}
                      className="rounded-md border border-grayWilma-200 bg-[#f7f8f6] px-2.5 py-1 text-xs font-semibold text-grayWilma-700"
                    >
                      {component}
                    </span>
                  ))}
                </span>
                <span className="text-xs leading-5 text-grayWilma-600">{partnerPackage.recommendedFor}</span>
              </label>
            );
          })}
        </div>
      </fieldset>

      <div className="grid gap-5 border-t border-grayWilma-200 pt-6 md:grid-cols-2">
        <TextField label="Organization name" name="organizationName" required />
        <TextField label="Contact name" name="contactName" required />
        <TextField label="Email" name="email" type="email" required />
        <TextField label="Website" name="website" type="url" placeholder="https://example.org" />
        <SelectField label="Organization type" name="organizationType" options={organizationTypes} required />
        <TextField label="State/region served" name="regionServed" required />
        <TextField
          label="Estimated people served in 90 days"
          name="estimatedVolume"
          type="number"
          min="1"
          required
        />
        <SelectField label="Primary record-clearing need" name="primaryNeed" options={primaryNeeds} required />
      </div>

      <label className="grid gap-2 text-sm font-semibold text-navy">
        Program goal
        <textarea
          name="programGoal"
          required
          rows={5}
          className="rounded-md border border-grayWilma-200 bg-white px-3 py-2 text-sm font-normal text-grayWilma-800 outline-none transition focus:border-teal focus:ring-2 focus:ring-teal/20"
          placeholder="Describe the community, implementation goal, and record-clearing access need."
        />
      </label>

      {error ? (
        <p className="rounded-md border border-danger/20 bg-danger/5 px-3 py-2 text-sm font-semibold text-danger">
          {error}
        </p>
      ) : null}

      <div className="flex flex-col gap-3 border-t border-grayWilma-200 pt-5 sm:flex-row sm:items-center sm:justify-between">
        <p className="max-w-2xl text-xs leading-5 text-grayWilma-600">
          Payment is required before provisioning begins. Checkout does not create production provisioning, CRM records, or
          email sends in this phase.
        </p>
        <Button type="submit" className="min-h-11 whitespace-nowrap px-5" disabled={isSubmitting}>
          {isSubmitting ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
              Creating Checkout
            </>
          ) : (
            <>
              <CreditCard className="h-4 w-4" aria-hidden="true" />
              Begin Checkout
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
