"use client";

import { useState } from "react";

import { Card } from "@/components/ui/Card";
import type { LegalEasePublicPageConfiguration } from "@/lib/partners/onboarding/artifact-service";

const buttonClass =
  "inline-flex min-h-11 items-center justify-center rounded-md bg-navy px-4 py-2 text-sm font-bold text-white hover:bg-teal disabled:cursor-not-allowed disabled:opacity-50";
const inputClass =
  "min-h-11 w-full rounded-md border border-grayWilma-200 bg-white px-3 py-2 text-sm text-navy outline-none focus:border-teal focus:ring-2 focus:ring-teal/25";

/**
 * The LegalEase side of the co-branded page ownership split. These values are
 * never partner-editable and never partner-approvable, which is why a change to
 * one of them invalidates the LegalEase approval of the page configuration and
 * leaves the partner's attestation about partner-owned content standing.
 *
 * Saving here publishes nothing and activates nothing.
 */
export function LegalEasePublicPageLanguagePanel({
  partnerSlug,
  configuration
}: {
  partnerSlug: string;
  configuration: LegalEasePublicPageConfiguration;
}) {
  const [values, setValues] = useState(configuration);
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function save() {
    if (pending) return;
    setPending(true);
    setMessage(null);
    try {
      const response = await fetch(
        `/api/internal/partners/onboarding/phase1/${encodeURIComponent(
          partnerSlug
        )}/artifacts`,
        {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            action: "configure_public_page_language",
            requestId: crypto.randomUUID(),
            payload: values
          })
        }
      );
      const body = (await response.json()) as {
        success?: boolean;
        error?: string;
        result?: LegalEasePublicPageConfiguration;
      };
      if (!response.ok || !body.success) {
        setMessage(body.error ?? "That change could not be saved.");
        return;
      }
      if (body.result) setValues(body.result);
      setMessage("Saved. Prepare a new draft of the co-branded page to use it.");
    } catch {
      setMessage("That change could not be saved.");
    } finally {
      setPending(false);
    }
  }

  return (
    <section className="mt-8" aria-labelledby="legalease-page-language-heading">
      <h2
        id="legalease-page-language-heading"
        className="text-xl font-black text-navy"
      >
        LegalEase public page language
      </h2>
      <p className="mt-1 text-xs text-grayWilma-700">
        LegalEase controls these values. The partner cannot edit or approve
        them, and saving here does not publish the page.
      </p>

      {message ? (
        <p
          role="status"
          className="mt-3 rounded-md border border-teal/30 bg-teal/10 px-4 py-3 text-sm font-semibold text-navy"
        >
          {message}
        </p>
      ) : null}

      <Card className="mt-4 p-5">
        <div className="grid gap-5 md:grid-cols-2">
          <Field
            id="legalease-public-display-name"
            label="Public display name"
            value={values.publicDisplayName}
            onChange={(value) =>
              setValues((current) => ({ ...current, publicDisplayName: value }))
            }
          />
          <Field
            id="legalease-public-headline"
            label="Public headline"
            value={values.publicHeadline}
            onChange={(value) =>
              setValues((current) => ({ ...current, publicHeadline: value }))
            }
          />
          <Field
            id="legalease-public-subheadline"
            label="Public subheadline"
            value={values.publicSubheadline}
            onChange={(value) =>
              setValues((current) => ({ ...current, publicSubheadline: value }))
            }
          />
        </div>

        <div className="mt-5">
          <label
            className="text-sm font-black text-navy"
            htmlFor="legalease-support-instructions"
          >
            Participant routing and support statement
          </label>
          <p className="mt-1 text-xs leading-5 text-grayWilma-600">
            This LegalEase-controlled disclaimer appears on the co-branded page
            in the LegalEase-controlled block.
          </p>
          <textarea
            id="legalease-support-instructions"
            className={`${inputClass} mt-2 min-h-24`}
            value={values.supportInstructions ?? ""}
            onChange={(event) =>
              setValues((current) => ({
                ...current,
                supportInstructions: event.target.value
              }))
            }
          />
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          <Toggle
            id="legalease-show-partner-logo"
            label="Show the partner logo on the page"
            checked={values.showPartnerLogo}
            onChange={(checked) =>
              setValues((current) => ({ ...current, showPartnerLogo: checked }))
            }
          />
          <Toggle
            id="legalease-show-powered-by"
            label="Show the LegalEase attribution"
            checked={values.showPoweredBy}
            onChange={(checked) =>
              setValues((current) => ({ ...current, showPoweredBy: checked }))
            }
          />
        </div>

        <button
          type="button"
          className={`${buttonClass} mt-5`}
          disabled={pending}
          onClick={() => void save()}
        >
          Save LegalEase page language
        </button>
      </Card>
    </section>
  );
}

function Field({
  id,
  label,
  value,
  onChange
}: {
  id: string;
  label: string;
  value: string | null;
  onChange: (value: string) => void;
}) {
  return (
    <div>
      <label className="text-sm font-black text-navy" htmlFor={id}>
        {label}
      </label>
      <input
        className={`${inputClass} mt-2`}
        id={id}
        onChange={(event) => onChange(event.target.value)}
        type="text"
        value={value ?? ""}
      />
    </div>
  );
}

function Toggle({
  id,
  label,
  checked,
  onChange
}: {
  id: string;
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label
      className="flex min-h-11 items-center gap-3 rounded-md border border-grayWilma-200 bg-grayWilma-100 px-3 py-2 text-sm font-black text-navy"
      htmlFor={id}
    >
      <input
        checked={checked}
        id={id}
        onChange={(event) => onChange(event.target.checked)}
        type="checkbox"
      />
      {label}
    </label>
  );
}
