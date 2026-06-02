"use client";

import { CheckCircle2, Loader2, Save } from "lucide-react";
import { useState, type FormEvent, type InputHTMLAttributes, type SelectHTMLAttributes, type TextareaHTMLAttributes } from "react";
import { Button } from "@/components/ui/Button";
import type { PartnerRecord } from "@/lib/partners/types";

type SaveMode = "draft" | "submit";

const organizationTypes = [
  ["nonprofit", "Nonprofit"],
  ["workforce", "Workforce organization"],
  ["reentry", "Reentry organization"],
  ["city", "City agency"],
  ["county", "County agency"],
  ["court", "Court"],
  ["clinic", "Clinic"],
  ["funder", "Funder"],
  ["national_partner", "National partner"],
  ["other", "Other"]
] as const;

export function PartnerOnboardingForm({ partner }: { partner: PartnerRecord }) {
  const [isSaving, setIsSaving] = useState<SaveMode | null>(null);
  const [submitMode, setSubmitMode] = useState<SaveMode>("draft");
  const [message, setMessage] = useState("");
  const [errors, setErrors] = useState<string[]>([]);
  const submitted = partner.onboardingStatus === "submitted" || partner.onboardingStatus === "needs_review" || partner.onboardingStatus === "approved";

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const mode = submitMode;
    setIsSaving(mode);
    setMessage("");
    setErrors([]);

    const formData = new FormData(event.currentTarget);
    const payload = Object.fromEntries(formData.entries());

    try {
      const response = await fetch("/api/partners/onboarding", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...payload,
          mode,
          partnerSlug: partner.partnerSlug,
          expectedMonthlyParticipants: Number(payload.expectedMonthlyParticipants || 0) || undefined
        })
      });
      const body = (await response.json()) as { message?: string; error?: string; errors?: string[] };

      if (!response.ok) {
        setErrors(body.errors?.length ? body.errors : [body.error ?? "Could not save onboarding."]);
        return;
      }

      setMessage(body.message ?? (mode === "submit" ? "Onboarding submitted for review." : "Draft saved."));
    } catch (error) {
      setErrors([error instanceof Error ? error.message : "Could not save onboarding."]);
    } finally {
      setIsSaving(null);
    }
  }

  return (
    <form className="grid gap-6" onSubmit={handleSubmit}>
      <div className="grid gap-4 md:grid-cols-2">
        <TextField label="Organization name" name="organizationName" defaultValue={partner.organizationName ?? partner.partnerName} disabled={submitted} />
        <TextField label="Legal name" name="legalName" defaultValue={partner.legalName ?? ""} disabled={submitted} />
        <TextField label="Primary contact name" name="primaryContactName" defaultValue={partner.primaryContactName ?? partner.contactName} disabled={submitted} />
        <TextField label="Primary contact title" name="primaryContactTitle" defaultValue={partner.primaryContactTitle ?? ""} disabled={submitted} />
        <TextField label="Primary contact email" name="primaryContactEmail" type="email" defaultValue={partner.primaryContactEmail ?? partner.contactEmail} disabled={submitted} />
        <TextField label="Primary contact phone" name="primaryContactPhone" type="tel" defaultValue={partner.primaryContactPhone ?? ""} disabled={submitted} />
        <TextField label="Website" name="website" type="url" defaultValue={partner.website} disabled={submitted} />
        <SelectField label="Organization type" name="organizationType" defaultValue={partner.organizationType} disabled={submitted} />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <TextField label="Program name" name="programName" defaultValue={partner.programName ?? `${partner.partnerName} Record-Clearing Access Program`} disabled={submitted} />
        <TextField label="Expected launch date" name="expectedLaunchDate" type="date" defaultValue={formatDate(partner.expectedLaunchDate ?? partner.launchDateTarget)} disabled={submitted} />
        <TextField label="Target state" name="targetState" defaultValue={partner.targetState ?? partner.state} disabled={submitted} />
        <TextField label="Target county" name="targetCounty" defaultValue={partner.targetCounty ?? ""} disabled={submitted} />
        <TextField label="Target city" name="targetCity" defaultValue={partner.targetCity ?? ""} disabled={submitted} />
        <TextField label="Service area" name="serviceArea" defaultValue={partner.serviceArea ?? partner.region} disabled={submitted} />
        <TextField
          label="Expected monthly participants"
          name="expectedMonthlyParticipants"
          type="number"
          min="0"
          defaultValue={partner.expectedMonthlyParticipants?.toString() ?? ""}
          disabled={submitted}
        />
        <TextField label="Logo URL" name="logoUrl" type="url" defaultValue={partner.logoUrl ?? ""} disabled={submitted} />
      </div>

      <TextareaField label="Program description" name="programDescription" defaultValue={partner.programDescription ?? partner.programGoal} disabled={submitted} />
      <TextareaField label="Referral sources" name="referralSources" defaultValue={partner.referralSources ?? ""} disabled={submitted} />
      <TextareaField label="Audience description" name="audienceDescription" defaultValue={partner.audienceDescription ?? ""} disabled={submitted} />
      <TextareaField label="Branding notes" name="brandingNotes" defaultValue={partner.brandingNotes ?? ""} disabled={submitted} />

      {message ? (
        <p className="rounded-md border border-teal/30 bg-teal/10 px-3 py-2 text-sm font-semibold text-teal">{message}</p>
      ) : null}

      {errors.length > 0 ? (
        <div className="rounded-md border border-danger/20 bg-danger/5 px-3 py-2 text-sm font-semibold text-danger">
          {errors.map((error) => (
            <p key={error}>{error}</p>
          ))}
        </div>
      ) : null}

      <div className="flex flex-col gap-3 border-t border-grayWilma-200 pt-5 sm:flex-row sm:items-center sm:justify-between">
        <p className="max-w-2xl text-xs leading-5 text-grayWilma-600">
          Save a draft anytime. Submit when the required partner details are ready for LegalEase review.
        </p>
        <div className="flex flex-col gap-3 sm:flex-row">
          <Button type="submit" variant="secondary" disabled={Boolean(isSaving) || submitted} onClick={() => setSubmitMode("draft")}>
            {isSaving === "draft" ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <Save className="h-4 w-4" aria-hidden="true" />}
            Save draft
          </Button>
          <Button type="submit" disabled={Boolean(isSaving) || submitted} onClick={() => setSubmitMode("submit")}>
            {isSaving === "submit" ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <CheckCircle2 className="h-4 w-4" aria-hidden="true" />}
            Submit for review
          </Button>
        </div>
      </div>
    </form>
  );
}

function TextField({ label, ...props }: InputHTMLAttributes<HTMLInputElement> & { label: string }) {
  return (
    <label className="grid gap-2 text-sm font-semibold text-navy">
      {label}
      <input
        {...props}
        className="rounded-md border border-grayWilma-200 bg-white px-3 py-2 text-sm font-normal text-grayWilma-800 outline-none transition focus:border-teal focus:ring-2 focus:ring-teal/20 disabled:bg-grayWilma-100"
      />
    </label>
  );
}

function SelectField({ label, ...props }: SelectHTMLAttributes<HTMLSelectElement> & { label: string }) {
  return (
    <label className="grid gap-2 text-sm font-semibold text-navy">
      {label}
      <select
        {...props}
        className="rounded-md border border-grayWilma-200 bg-white px-3 py-2 text-sm font-normal text-grayWilma-800 outline-none transition focus:border-teal focus:ring-2 focus:ring-teal/20 disabled:bg-grayWilma-100"
      >
        {organizationTypes.map(([value, label]) => (
          <option key={value} value={value}>
            {label}
          </option>
        ))}
      </select>
    </label>
  );
}

function TextareaField({ label, ...props }: TextareaHTMLAttributes<HTMLTextAreaElement> & { label: string }) {
  return (
    <label className="grid gap-2 text-sm font-semibold text-navy">
      {label}
      <textarea
        {...props}
        rows={4}
        className="rounded-md border border-grayWilma-200 bg-white px-3 py-2 text-sm font-normal text-grayWilma-800 outline-none transition focus:border-teal focus:ring-2 focus:ring-teal/20 disabled:bg-grayWilma-100"
      />
    </label>
  );
}

function formatDate(value: string | undefined) {
  return value ? value.slice(0, 10) : "";
}
