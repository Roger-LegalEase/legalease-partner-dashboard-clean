"use client";

import type { FormEvent, InputHTMLAttributes, SelectHTMLAttributes } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { programTiers } from "@/lib/partners/types";

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

export function PartnerStartForm() {
  const router = useRouter();

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    router.push("/partners/checkout/demo-partner");
  }

  return (
    <form onSubmit={handleSubmit} className="grid gap-5">
      <div className="grid gap-5 md:grid-cols-2">
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

      <SelectField
        label="Preferred tier"
        name="preferredTier"
        options={programTiers.map((tier) => `${tier.name} (${tier.investmentRange})`)}
        required
      />

      <div className="flex flex-col gap-3 border-t border-grayWilma-200 pt-5 sm:flex-row sm:items-center sm:justify-between">
        <p className="max-w-2xl text-xs leading-5 text-grayWilma-600">
          This demo request uses local mock routing only. No database, payment processor, or CRM record is created.
        </p>
        <Button type="submit" className="min-h-11 whitespace-nowrap px-5">
          Continue to Demo Checkout
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
