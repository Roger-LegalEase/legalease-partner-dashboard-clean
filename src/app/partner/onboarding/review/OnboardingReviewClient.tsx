"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import type {
  OnboardingSectionKey,
  OnboardingSectionStatus
} from "@/lib/partners/onboarding/types";

type ReviewValue =
  | string
  | number
  | boolean
  | null
  | undefined
  | readonly string[];

export type OnboardingReviewField = {
  fieldKey: string;
  label: string;
  value: ReviewValue;
  missing?: boolean;
};

export type OnboardingReviewSection = {
  key: OnboardingSectionKey;
  title: string;
  status: OnboardingSectionStatus;
  statusLabel: string;
  editHref: string;
  fields: OnboardingReviewField[];
  missingItems: Array<{
    fieldKey: string;
    label: string;
  }>;
  changeRequestInstructions?: string | null;
  changeRequestStatus?: "open" | "partner_responded" | null;
};

export type OnboardingReviewClientProps = {
  sections: OnboardingReviewSection[];
  canSubmit: boolean;
  canEdit: boolean;
  workspaceVersion: number;
};

type SubmissionState =
  | { kind: "idle" }
  | { kind: "submitting" }
  | {
      kind: "submitted";
      message: string;
      submittedAt: string | null;
      statusLabel: string;
    }
  | { kind: "error"; message: string; conflict: boolean };

export function OnboardingReviewClient({
  sections,
  canSubmit,
  canEdit,
  workspaceVersion
}: OnboardingReviewClientProps) {
  const [submission, setSubmission] = useState<SubmissionState>({
    kind: "idle"
  });
  const requestIdRef = useRef<string | null>(null);
  const submittingRef = useRef(false);

  const missingCount = sections.reduce(
    (total, section) => total + section.missingItems.length,
    0
  );
  const changeRequestCount = sections.filter(
    (section) =>
      section.status === "needs_changes" ||
      section.changeRequestStatus === "open"
  ).length;
  const pendingLegaleaseCount = sections.filter(
    (section) => section.changeRequestStatus === "partner_responded"
  ).length;
  const submitted = submission.kind === "submitted";
  const submitEnabled =
    canSubmit &&
    canEdit &&
    missingCount === 0 &&
    changeRequestCount === 0 &&
    !submitted;

  async function submitForReview() {
    if (!submitEnabled || submittingRef.current) return;
    submittingRef.current = true;
    setSubmission({ kind: "submitting" });
    requestIdRef.current ??= crypto.randomUUID();

    try {
      const response = await fetch("/api/partners/onboarding/submit", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          requestId: requestIdRef.current,
          expectedWorkspaceVersion: workspaceVersion
        })
      });
      const payload = await readJsonObject(response);

      if (
        response.status === 409 &&
        (payload?.code === "revision_conflict" ||
          typeof payload?.currentWorkspaceVersion === "number")
      ) {
        setSubmission({
          kind: "error",
          conflict: true,
          message:
            "Newer saved onboarding information is available. Reload the review before submitting."
        });
        return;
      }

      if (!response.ok || payload?.success !== true) {
        setSubmission({
          kind: "error",
          conflict: false,
          message: submissionErrorMessage(response.status, payload)
        });
        return;
      }

      const savedSubmission = objectValue(payload.submission);
      const savedStatus =
        typeof savedSubmission?.status === "string"
          ? savedSubmission.status
          : null;
      setSubmission({
        kind: "submitted",
        message:
          typeof payload.message === "string"
            ? payload.message
            : "Your onboarding package was submitted for LegalEase review.",
        submittedAt:
          typeof savedSubmission?.submittedAt === "string"
            ? savedSubmission.submittedAt
            : typeof payload.submittedAt === "string"
              ? payload.submittedAt
            : null,
        statusLabel:
          typeof payload.statusLabel === "string"
            ? payload.statusLabel
            : savedStatus === "ready_for_review"
              ? "Awaiting LegalEase review"
              : "Submitted"
      });
    } catch {
      setSubmission({
        kind: "error",
        conflict: false,
        message:
          "Could not confirm submission. No success has been shown. Check your connection and try again with the same request."
      });
    } finally {
      submittingRef.current = false;
    }
  }

  return (
    <div className="mx-auto max-w-5xl text-navy">
      <header className="mb-6">
        <Link
          className="inline-flex min-h-11 items-center text-sm font-semibold text-teal underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal focus-visible:ring-offset-2"
          href="/partner/onboarding"
        >
          Back to program setup
        </Link>
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <Badge tone={submitted ? "teal" : "blue"}>
            {submitted ? "Submitted" : "Final review"}
          </Badge>
          {!canEdit ? <Badge>View only</Badge> : null}
        </div>
        <h1 className="mt-4 text-3xl font-black tracking-[-0.02em] md:text-4xl">
          Review your onboarding package
        </h1>
        <p className="mt-2 max-w-3xl text-base leading-7 text-grayWilma-700">
          Confirm the information below before sending it to LegalEase. Use
          each section’s edit link to update the canonical source.
        </p>
      </header>

      {submission.kind === "submitted" ? (
        <Card
          className="mb-6 border-teal/30 bg-teal/10 p-5 md:p-6"
          role="status"
          aria-labelledby="submission-complete-heading"
        >
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <h2
                className="text-xl font-black"
                id="submission-complete-heading"
              >
                Submitted for LegalEase review
              </h2>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-grayWilma-800">
                {submission.message}
              </p>
              {submission.submittedAt ? (
                <p className="mt-2 text-xs font-semibold text-grayWilma-600">
                  Submitted {formatTimestamp(submission.submittedAt)}
                </p>
              ) : null}
            </div>
            <Badge tone="teal">{submission.statusLabel}</Badge>
          </div>
          <p className="mt-4 text-sm leading-6 text-grayWilma-700">
            Submission starts review; it does not approve launch. LegalEase
            will either approve the package for launch preparation or request
            section-specific changes here.
          </p>
        </Card>
      ) : null}

      {submission.kind === "error" ? (
        <Card
          className="mb-6 border-orange/40 bg-orange/10 p-5"
          role="alert"
          aria-labelledby="submission-error-heading"
        >
          <h2 id="submission-error-heading" className="font-black">
            The package was not submitted
          </h2>
          <p className="mt-2 text-sm leading-6 text-grayWilma-800">
            {submission.message}
          </p>
          {submission.conflict ? (
            <Button
              className="mt-4 min-h-11"
              onClick={() => window.location.reload()}
              type="button"
              variant="secondary"
            >
              Reload review
            </Button>
          ) : (
            <Button
              className="mt-4 min-h-11"
              disabled={!submitEnabled}
              onClick={() => void submitForReview()}
              type="button"
              variant="secondary"
            >
              Try submission again
            </Button>
          )}
        </Card>
      ) : null}

      {!submitted && (missingCount > 0 || changeRequestCount > 0) ? (
        <Card
          className="mb-6 border-orange/30 bg-orange/10 p-5"
          aria-labelledby="review-blockers-heading"
        >
          <h2 id="review-blockers-heading" className="font-black">
            Complete these items before submission
          </h2>
          <div className="mt-3 grid gap-4 md:grid-cols-2">
            {missingCount > 0 ? (
              <div>
                <p className="text-sm font-black">
                  {missingCount} missing{" "}
                  {missingCount === 1 ? "requirement" : "requirements"}
                </p>
                <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-grayWilma-800">
                  {sections.flatMap((section) =>
                    section.missingItems.map((item) => (
                      <li key={`${section.key}-${item.fieldKey}`}>
                        <Link
                          className="font-semibold underline decoration-orange underline-offset-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal"
                          href={`${section.editHref}#${fieldAnchor(item.fieldKey)}`}
                        >
                          {section.title}: {item.label}
                        </Link>
                      </li>
                    ))
                  )}
                </ul>
              </div>
            ) : null}
            {changeRequestCount > 0 ? (
              <div>
                <p className="text-sm font-black">
                  {changeRequestCount}{" "}
                  {changeRequestCount === 1
                    ? "section needs changes"
                    : "sections need changes"}
                </p>
                <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-grayWilma-800">
                  {sections
                    .filter(
                      (section) =>
                        section.status === "needs_changes" ||
                        section.changeRequestStatus === "open"
                    )
                    .map((section) => (
                      <li key={section.key}>
                        <Link
                          className="font-semibold underline decoration-orange underline-offset-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal"
                          href={section.editHref}
                        >
                          {section.title}
                        </Link>
                      </li>
                    ))}
                </ul>
              </div>
            ) : null}
          </div>
        </Card>
      ) : null}

      {!submitted && pendingLegaleaseCount > 0 ? (
        <Card
          className="mb-6 border-teal/30 bg-teal/10 p-5"
          role="status"
          aria-labelledby="pending-legalease-heading"
        >
          <h2 id="pending-legalease-heading" className="font-black">
            Updates submitted to LegalEase
          </h2>
          <p className="mt-2 text-sm leading-6 text-grayWilma-800">
            {pendingLegaleaseCount}{" "}
            {pendingLegaleaseCount === 1 ? "section is" : "sections are"} pending
            LegalEase review. No further partner action is required unless
            LegalEase requests another change.
          </p>
        </Card>
      ) : null}

      <div className="grid gap-5">
        {sections.map((section, sectionIndex) => (
          <Card
            className="overflow-hidden rounded-[20px] border-grayWilma-200 shadow-sm"
            key={section.key}
          >
            <section aria-labelledby={`review-section-${section.key}`}>
              <div className="flex flex-col gap-3 border-b border-grayWilma-200 bg-grayWilma-100 px-5 py-4 sm:flex-row sm:items-center sm:justify-between md:px-6">
                <div className="flex min-w-0 items-center gap-3">
                  <span
                    aria-hidden="true"
                    className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white text-sm font-black text-orange"
                  >
                    {sectionIndex + 1}
                  </span>
                  <div className="min-w-0">
                    <h2
                      className="font-black"
                      id={`review-section-${section.key}`}
                    >
                      {section.title}
                    </h2>
                    <Badge
                      className="mt-1"
                      tone={toneForStatus(section.status)}
                    >
                      {section.statusLabel}
                    </Badge>
                  </div>
                </div>
                <Link
                  className="inline-flex min-h-11 items-center justify-center rounded-md border border-grayWilma-200 bg-white px-4 py-2 text-sm font-semibold text-navy transition hover:bg-grayWilma-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal focus-visible:ring-offset-2"
                  href={section.editHref}
                >
                  {canEdit && !submitted ? "Edit section" : "View section"}
                </Link>
              </div>

              {section.changeRequestInstructions ? (
                <div
                  className={`border-b px-5 py-4 md:px-6 ${
                    section.changeRequestStatus === "partner_responded"
                      ? "border-teal/20 bg-teal/10"
                      : "border-orange/20 bg-orange/10"
                  }`}
                >
                  <h3 className="text-sm font-black">
                    {section.changeRequestStatus === "partner_responded"
                      ? "Updates submitted — LegalEase review pending"
                      : "LegalEase change request"}
                  </h3>
                  <p className="mt-1 whitespace-pre-wrap text-sm leading-6 text-grayWilma-800">
                    {section.changeRequestInstructions}
                  </p>
                </div>
              ) : null}

              {section.missingItems.length > 0 ? (
                <div className="border-b border-orange/20 px-5 py-4 md:px-6">
                  <h3 className="text-sm font-black text-orange">
                    Missing requirements
                  </h3>
                  <ul className="mt-2 list-disc space-y-1 pl-5 text-sm">
                    {section.missingItems.map((item) => (
                      <li key={item.fieldKey}>
                        <Link
                          className="font-semibold underline decoration-orange underline-offset-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal"
                          href={`${section.editHref}#${fieldAnchor(item.fieldKey)}`}
                        >
                          {item.label}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}

              <dl className="divide-y divide-grayWilma-200">
                {section.fields.map((field) => (
                  <div
                    className={`grid gap-1 px-5 py-4 sm:grid-cols-[minmax(180px,0.4fr)_minmax(0,0.6fr)] sm:gap-5 md:px-6 ${
                      field.missing ? "bg-orange/5" : ""
                    }`}
                    key={field.fieldKey}
                  >
                    <dt className="text-sm font-black text-grayWilma-700">
                      {field.label}
                    </dt>
                    <dd
                      className={`break-words whitespace-pre-wrap text-sm leading-6 ${
                        field.missing
                          ? "font-semibold text-orange"
                          : "text-navy"
                      }`}
                    >
                      {field.missing
                        ? "Required information is missing"
                        : formatReviewValue(field.value)}
                    </dd>
                  </div>
                ))}
              </dl>
            </section>
          </Card>
        ))}
      </div>

      <Card className="mt-6 rounded-[20px] border-grayWilma-200 p-5 shadow-sm md:p-6">
        <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
          <div>
            <h2 className="text-xl font-black">
              {submitted ? "Package submitted" : "Send to LegalEase"}
            </h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-grayWilma-700">
              {submitted
                ? "Your saved submission is awaiting LegalEase review."
                : "Submitting records your authenticated identity and the server time. It does not create an e-signature, approve launch, send invitations, or publish a page."}
            </p>
            {!canEdit ? (
              <p className="mt-2 text-sm font-semibold text-grayWilma-600">
                A partner administrator must submit this package.
              </p>
            ) : null}
            {canEdit && !canSubmit && missingCount === 0 && changeRequestCount === 0 ? (
              <p className="mt-2 text-sm font-semibold text-orange">
                Submission is not available in the current commercial or
                workspace state.
              </p>
            ) : null}
          </div>
          <Button
            className="min-h-12 w-full px-6 lg:w-auto"
            disabled={!submitEnabled || submission.kind === "submitting"}
            onClick={() => void submitForReview()}
            type="button"
          >
            {submission.kind === "submitting"
              ? "Submitting…"
              : submitted
                ? "Submitted"
                : "Submit for LegalEase review"}
          </Button>
        </div>
      </Card>
    </div>
  );
}

function toneForStatus(
  status: OnboardingSectionStatus
): "teal" | "blue" | "orange" | "neutral" {
  if (status === "approved" || status === "waived") return "teal";
  if (status === "needs_changes") return "orange";
  if (status === "in_progress" || status === "submitted") return "blue";
  return "neutral";
}

function formatReviewValue(value: ReviewValue) {
  if (Array.isArray(value)) {
    return value.length > 0 ? value.join(", ") : "Not provided";
  }
  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (value === null || value === undefined || value === "") {
    return "Not provided";
  }
  return String(value);
}

function fieldAnchor(fieldKey: string) {
  const slug =
    fieldKey
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "") || "value";
  return `field-${slug}`;
}

function formatTimestamp(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "at the recorded server time";
  return new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(date);
}

function objectValue(value: unknown): Record<string, unknown> | null {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? Object.fromEntries(Object.entries(value))
    : null;
}

async function readJsonObject(response: Response) {
  if (!(response.headers.get("content-type") ?? "").includes("application/json")) {
    return null;
  }
  try {
    return objectValue(await response.json());
  } catch {
    return null;
  }
}

function submissionErrorMessage(
  status: number,
  payload: Record<string, unknown> | null
) {
  if (status === 401) {
    return "Your session expired. Sign in again before retrying submission.";
  }
  if (status === 403) {
    return "A partner administrator with a commercially cleared workspace must submit this package.";
  }
  if (status === 422 || status === 400) {
    return typeof payload?.error === "string"
      ? payload.error
      : "Some required onboarding information still needs attention.";
  }
  if (typeof payload?.error === "string") return payload.error;
  return "Could not submit the package. No submission was recorded.";
}
