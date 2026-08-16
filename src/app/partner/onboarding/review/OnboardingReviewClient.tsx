"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import type { PartnerImplementationFact } from "@/lib/partners/onboarding/implementation-presentation";
import type { PartnerSupportContact } from "@/lib/partners/onboarding/support-contact";
import type { OnboardingSectionKey } from "@/lib/partners/onboarding/types";
import {
  DEFAULT_ONBOARDING_REVIEW_DETAIL_MODE,
  isOnboardingReviewAuditOpen
} from "@/lib/partners/onboarding/review-presentation";
import { PartnerSupportLink } from "../PartnerSupportLink";

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

export type OnboardingReviewSectionState =
  | "Complete"
  | "Needs attention"
  | "Changed since review"
  | "Waiting on LegalEase"
  | "Not started";

export type OnboardingReviewSection = {
  key: OnboardingSectionKey;
  title: string;
  state: OnboardingReviewSectionState;
  editHref: string;
  fields: OnboardingReviewField[];
  missingItems: Array<{
    fieldKey: string;
    label: string;
    href: string;
  }>;
  openChangeRequests: number;
  waitingChangeRequests: number;
  resolvedChangeRequests: number;
  hasPendingPrefill: boolean;
  completionPercentage: number;
  lastUpdatedAt: string | null;
  submittedAt: string | null;
  approvedAt: string | null;
  approvalSatisfied: boolean;
  changedSinceReview: boolean;
};

export type OnboardingReviewClientProps = {
  sections: OnboardingReviewSection[];
  canSubmit: boolean;
  canEdit: boolean;
  isPartnerStaff: boolean;
  support: PartnerSupportContact;
  supportHref: string;
  initialSubmission: {
    submittedAt: string;
    statusLabel: string;
    historical: boolean;
  } | null;
  workspaceVersion: number;
  pendingPrefillSections: string[];
  statusPresentation: {
    setupInformation: PartnerImplementationFact;
    legalEaseReview: PartnerImplementationFact;
    publication: PartnerImplementationFact;
    programActivation: PartnerImplementationFact;
  };
};

type SubmissionState =
  | { kind: "idle" }
  | { kind: "submitting" }
  | {
      kind: "submitted";
      message: string;
      submittedAt: string | null;
      statusLabel: string;
      historical: boolean;
    }
  | { kind: "error"; message: string; conflict: boolean };

export function OnboardingReviewClient({
  sections,
  canSubmit,
  canEdit,
  isPartnerStaff,
  initialSubmission,
  workspaceVersion,
  pendingPrefillSections,
  support,
  supportHref,
  statusPresentation
}: OnboardingReviewClientProps) {
  const [submission, setSubmission] = useState<SubmissionState>(
    initialSubmission
      ? {
          kind: "submitted",
          message: "Your onboarding package was submitted for LegalEase review.",
          submittedAt: initialSubmission.submittedAt,
          statusLabel: initialSubmission.statusLabel,
          historical: initialSubmission.historical
        }
      : { kind: "idle" }
  );
  const requestIdRef = useRef<string | null>(null);
  const submittingRef = useRef(false);

  const sectionsComplete = sections.filter((section) =>
    ["Complete", "Changed since review", "Waiting on LegalEase"].includes(
      section.state
    )
  ).length;
  const openPartnerChanges = sum(
    sections.map((section) => section.openChangeRequests)
  );
  const waitingOnLegalEase = sections.filter(
    (section) =>
      section.waitingChangeRequests > 0 ||
      section.state === "Waiting on LegalEase"
  ).length;
  const changedSincePriorReview = sections.filter(
    (section) => section.changedSinceReview
  ).length;
  const missingCount = sum(
    sections.map((section) => section.missingItems.length)
  );
  const prefillBlockers = pendingPrefillSections.length;
  const partnerBlockers = missingCount + openPartnerChanges + prefillBlockers;
  const submitted = submission.kind === "submitted";
  const submitEnabled =
    canSubmit &&
    canEdit &&
    partnerBlockers === 0 &&
    !submitted;
  const firstActionSection =
    sections.find((section) => section.openChangeRequests > 0) ??
    sections.find(
      (section) =>
        section.missingItems.length > 0 || section.hasPendingPrefill
    ) ??
    sections.find((section) => section.state === "Needs attention");

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
              : "Submitted",
        historical: false
      });
    } catch {
      setSubmission({
        kind: "error",
        conflict: false,
        message:
          "Could not confirm submission. Nothing was submitted. Check your connection and retry with the same request."
      });
    } finally {
      submittingRef.current = false;
    }
  }

  return (
    <div className="mx-auto max-w-6xl text-[#071B33]">
      <header className="border-b-4 border-[#071B33] pb-6">
        <Link className={utilityLinkClass} href="/partner/onboarding#program-configuration">
          Return to implementation center
        </Link>
        <p className="mt-5 text-xs font-bold uppercase tracking-[0.1em] text-[#0A8E9A] [font-family:var(--font-rcap-mono)]">
          Program configuration | Decision summary
        </p>
        <h1 className="mt-2 text-3xl font-extrabold tracking-[-0.02em] md:text-4xl">
          Review the decisions and exceptions
        </h1>
        <p className="mt-3 max-w-3xl text-sm leading-6 text-[#475A6E]">
          {isPartnerStaff
            ? "This read-only summary shows the submitted implementation record. A partner administrator manages changes and submission."
            : "Start with blockers, changes, and decisions. Open the full field audit only when you need the complete saved record."}
        </p>
      </header>

      <section aria-labelledby="review-status-heading" className="border-x border-b border-[#B8C1C7] bg-white">
        <h2 className="sr-only" id="review-status-heading">Current program status</h2>
        <dl className="grid sm:grid-cols-2 lg:grid-cols-4">
          <StatusFact label="Setup information" fact={statusPresentation.setupInformation} />
          <StatusFact label="LegalEase review" fact={statusPresentation.legalEaseReview} />
          <StatusFact label="Publication" fact={statusPresentation.publication} />
          <StatusFact label="Program activation" fact={statusPresentation.programActivation} />
        </dl>
      </section>

      {submission.kind === "submitted" ? (
        <section aria-labelledby="submitted-heading" className="mt-6 border-l-[6px] border-[#0A8E9A] bg-white p-5" role="status">
          <h2 className="text-xl font-extrabold" id="submitted-heading">Submitted for LegalEase review</h2>
          <p className="mt-2 text-sm leading-6 text-[#475A6E]">{submission.message}</p>
          {submission.submittedAt ? (
            <p className="mt-2 text-xs font-bold text-[#475A6E] [font-family:var(--font-rcap-mono)]">
              Submitted {formatTimestamp(submission.submittedAt)}
            </p>
          ) : null}
          <p className="mt-3 text-sm leading-6 text-[#475A6E]">
            {submission.historical
              ? "This submission remains in program setup history. The status dimensions above describe the current program state."
              : "Submission starts LegalEase review. It does not publish the page, activate participant intake, or approve launch."}
          </p>
        </section>
      ) : null}

      {submission.kind === "error" ? (
        <section aria-labelledby="submission-error-heading" className="mt-6 border-l-[6px] border-[#FF3B00] bg-white p-5" role="alert">
          <h2 className="text-xl font-extrabold" id="submission-error-heading">The package was not submitted</h2>
          <p className="mt-2 text-sm leading-6 text-[#475A6E]">{submission.message}</p>
          <button
            className={`${secondaryActionClass} mt-4`}
            onClick={() =>
              submission.conflict
                ? window.location.reload()
                : void submitForReview()
            }
            type="button"
          >
            {submission.conflict ? "Reload review" : "Retry submission"}
          </button>
          <p className="mt-4 break-words text-sm leading-6 text-[#475A6E]">
            Your confirmed saves remain available. If this continues, contact{" "}
            <PartnerSupportLink contact={support} href={supportHref} />.
          </p>
        </section>
      ) : null}

      {pendingPrefillSections.length > 0 ? (
        <section
          aria-labelledby="prefill-review-heading"
          className="mt-6 border-l-[6px] border-[#0A8E9A] bg-white p-5"
        >
          <h2 className="text-xl font-extrabold" id="prefill-review-heading">
            Pre-filled information needs review
          </h2>
          <p className="mt-2 text-sm leading-6 text-[#475A6E]">
            Confirm the marked information in {pendingPrefillSections.join(", ")}
            before submission. Internal source notes are not shown here.
          </p>
        </section>
      ) : null}

      <section aria-labelledby="review-summary-heading" className="mt-8">
        <div className="grid gap-2 md:grid-cols-[minmax(0,1fr)_minmax(260px,0.4fr)] md:items-end">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.1em] text-[#475A6E] [font-family:var(--font-rcap-mono)]">Executive review</p>
            <h2 className="mt-2 text-2xl font-extrabold" id="review-summary-heading">Decisions before submission</h2>
          </div>
          <p className="text-sm leading-6 text-[#475A6E] md:text-right">
            The field audit remains available below, but it is not the default view.
          </p>
        </div>
        <dl className="mt-5 grid border border-[#B8C1C7] bg-white sm:grid-cols-2 lg:grid-cols-3">
          <Metric label="Sections complete" value={`${sectionsComplete} of 8`} />
          <Metric label="Open partner changes" value={String(openPartnerChanges)} />
          <Metric label="Waiting on LegalEase" value={String(waitingOnLegalEase)} />
          <Metric label="Changed since prior review" value={String(changedSincePriorReview)} />
          <Metric label="Partner blockers" value={String(partnerBlockers)} />
          <Metric
            label="Approvals missing"
            value={String(sections.filter((section) => !section.approvalSatisfied).length)}
          />
        </dl>
      </section>

      {partnerBlockers > 0 ? (
        <section aria-labelledby="partner-blockers-heading" className="mt-6 border-l-[6px] border-[#FF3B00] bg-white p-5">
          <h2 className="text-xl font-extrabold" id="partner-blockers-heading">Partner changes are still required</h2>
          <p className="mt-2 text-sm leading-6 text-[#475A6E]">
            Resolve {partnerBlockers} required item{partnerBlockers === 1 ? "" : "s"} before final submission.
          </p>
          <ul className="mt-3 grid gap-2 text-sm">
            {sections.flatMap((section) =>
              section.missingItems.map((item) => (
                <li key={`${section.key}-${item.fieldKey}`}>
                  <Link className={inlineLinkClass} href={item.href}>
                    {section.title}: {item.label}
                  </Link>
                </li>
              ))
            )}
          </ul>
        </section>
      ) : null}

      <section aria-labelledby="section-decisions-heading" className="mt-8">
        <h2 className="text-2xl font-extrabold" id="section-decisions-heading">Section decisions</h2>
        <p className="mt-2 text-sm leading-6 text-[#475A6E]">
          Each section is collapsed until you choose to review its decision.
        </p>
        <div className="mt-5 border border-[#B8C1C7] bg-white">
          {sections.map((section, index) => (
            <details className="border-t border-[#D8DDDF] first:border-t-0" key={section.key}>
              <summary className="grid min-h-16 cursor-pointer list-none gap-3 p-4 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-inset focus-visible:ring-[#0A8E9A] sm:grid-cols-[38px_minmax(0,1fr)_auto] sm:items-center md:p-5">
                <span className="text-xs font-bold text-[#0A8E9A] [font-family:var(--font-rcap-mono)]" aria-hidden="true">
                  {String(index + 1).padStart(2, "0")}
                </span>
                <span className="min-w-0">
                  <span className="block break-words text-sm font-extrabold">{section.title}</span>
                  <span className="mt-1 block text-xs text-[#475A6E] [font-family:var(--font-rcap-mono)]">
                    {section.openChangeRequests} requested change{section.openChangeRequests === 1 ? "" : "s"} | {lastStateCopy(section)}
                  </span>
                </span>
                <span className={`text-sm font-bold ${stateClass(section.state)}`}>
                  {section.state}
                </span>
              </summary>
              <div className="border-t border-[#D8DDDF] bg-[#F7F4EE] p-4 md:p-5">
                <dl className="grid gap-3 sm:grid-cols-3">
                  <DecisionFact label="Setup information" value={`${section.completionPercentage}% recorded`} />
                  <DecisionFact label="Requested changes" value={String(section.openChangeRequests)} />
                  <DecisionFact label="Resolved history" value={String(section.resolvedChangeRequests)} />
                </dl>
                <Link className={`${secondaryActionClass} mt-4`} href={section.editHref}>
                  {sectionActionLabel(section, canEdit)}
                </Link>
              </div>
            </details>
          ))}
        </div>
      </section>

      <details
        className="mt-8 border border-[#B8C1C7] bg-white"
        data-full-audit-default={DEFAULT_ONBOARDING_REVIEW_DETAIL_MODE}
        open={isOnboardingReviewAuditOpen()}
      >
        <summary className="flex min-h-14 cursor-pointer list-none items-center justify-between gap-4 p-5 text-base font-extrabold focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-inset focus-visible:ring-[#0A8E9A]">
          <span>View full details</span>
          <span className="text-xs text-[#475A6E] [font-family:var(--font-rcap-mono)]">Field audit</span>
        </summary>
        <div className="border-t border-[#B8C1C7] p-5 md:p-7" data-full-audit-details>
          <p className="text-sm leading-6 text-[#475A6E]">
            This is the complete saved field-level record. Use a section link to change its canonical source.
          </p>
          <div className="mt-6 grid gap-7">
            {sections.map((section) => (
              <section aria-labelledby={`audit-${section.key}`} className="border-t-4 border-[#071B33] pt-4" key={section.key}>
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <h3 className="text-lg font-extrabold" id={`audit-${section.key}`}>{section.title}</h3>
                  <Link className={inlineLinkClass} href={section.editHref}>View full section</Link>
                </div>
                <dl className="mt-4 divide-y divide-[#D8DDDF] border-y border-[#D8DDDF]">
                  {section.fields.map((field) => (
                    <div className="grid gap-2 py-3 sm:grid-cols-[minmax(180px,0.38fr)_minmax(0,1fr)] sm:gap-6" key={field.fieldKey}>
                      <dt className="text-sm font-bold text-[#475A6E]">{field.label}</dt>
                      <dd className="break-words whitespace-pre-wrap text-sm leading-6">{formatValue(field.value)}</dd>
                    </div>
                  ))}
                </dl>
              </section>
            ))}
          </div>
        </div>
      </details>

      <section aria-labelledby="current-review-action-heading" className="mt-8 border border-[#B8C1C7] border-t-4 border-t-[#071B33] bg-[#F7F4EE] p-5 md:p-6">
        <p className="text-xs font-bold uppercase tracking-[0.1em] text-[#475A6E] [font-family:var(--font-rcap-mono)]">Current next action</p>
        <h2 className="mt-2 text-xl font-extrabold" id="current-review-action-heading">
          {submitted
            ? "Monitor LegalEase review"
            : firstActionSection
              ? "Resolve the next partner item"
              : submitEnabled
                ? "Submit for LegalEase review"
                : "Review the current implementation status"}
        </h2>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-[#475A6E]">
          {submitted
            ? "LegalEase owns the next review decision. Return here if a correction is requested."
            : firstActionSection
              ? `Open ${firstActionSection.title} at the narrowest available task.`
              : submitEnabled
                ? "All current partner blockers are clear. Submission starts review and does not activate or publish the program."
                : "No submission action is available for this role or current state."}
        </p>
        <div className="mt-5">
          {submitEnabled ? (
            <button
              className={primaryActionClass}
              data-review-primary-action="submit"
              disabled={submission.kind === "submitting"}
              onClick={() => void submitForReview()}
              type="button"
            >
              {submission.kind === "submitting" ? "Submitting" : "Submit for LegalEase review"}
            </button>
          ) : (
            <Link
              className={primaryActionClass}
              data-review-primary-action={firstActionSection ? "resolve" : "return"}
              href={firstActionSection?.editHref ?? "/partner/onboarding#program-configuration"}
            >
              {firstActionSection ? "Open next required task" : "Return to implementation center"}
            </Link>
          )}
        </div>
      </section>
    </div>
  );
}

function StatusFact({ label, fact }: { label: string; fact: PartnerImplementationFact }) {
  return (
    <div className="min-w-0 border-b border-[#D8DDDF] p-4 last:border-b-0 sm:border-r lg:border-b-0 lg:last:border-r-0">
      <dt className={docketClass}>{label}</dt>
      <dd className="mt-2 text-base font-extrabold">{fact.label}</dd>
      <p className="mt-1 text-xs leading-5 text-[#475A6E]">{fact.description}</p>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="border-b border-[#D8DDDF] p-4 last:border-b-0 sm:border-r lg:[&:nth-child(3n)]:border-r-0">
      <dt className={docketClass}>{label}</dt>
      <dd className="mt-2 text-2xl font-extrabold">{value}</dd>
    </div>
  );
}

function DecisionFact({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className={docketClass}>{label}</dt>
      <dd className="mt-1 text-sm font-extrabold">{value}</dd>
    </div>
  );
}

function sectionActionLabel(section: OnboardingReviewSection, canEdit: boolean) {
  if (section.openChangeRequests > 0) return "Review changes";
  if (section.changedSinceReview) return "Review changes";
  return canEdit && section.state === "Needs attention" ? "Edit section" : "View full section";
}

function lastStateCopy(section: OnboardingReviewSection) {
  if (section.approvedAt) return `Approved ${formatTimestamp(section.approvedAt)}`;
  if (section.submittedAt) return `Submitted ${formatTimestamp(section.submittedAt)}`;
  if (section.lastUpdatedAt) return `Last saved ${formatTimestamp(section.lastUpdatedAt)}`;
  return "No saved date recorded";
}

function stateClass(state: OnboardingReviewSectionState) {
  if (state === "Needs attention") return "text-[#C42E00]";
  if (state === "Complete") return "text-[#0A6E77]";
  return "text-[#071B33]";
}

function sum(values: number[]) {
  return values.reduce((total, value) => total + value, 0);
}

function formatValue(value: ReviewValue): string {
  if (Array.isArray(value)) return value.length > 0 ? value.join("\n") : "Not provided";
  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (typeof value === "number") return String(value);
  if (typeof value === "string") return value.trim() || "Not provided";
  return "Not provided";
}

function formatTimestamp(value: string) {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "Recorded date unavailable";
  return new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
    timeZone: "UTC"
  }).format(parsed);
}

async function readJsonObject(response: Response): Promise<Record<string, unknown> | null> {
  const contentType = response.headers.get("content-type") ?? "";
  if (!contentType.includes("application/json")) return null;
  const value: unknown = await response.json();
  return objectValue(value);
}

function objectValue(value: unknown): Record<string, unknown> | null {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function submissionErrorMessage(status: number, payload: Record<string, unknown> | null) {
  const code = typeof payload?.code === "string" ? payload.code : null;
  if (status === 401) {
    return "Your session expired. Sign in again to submit. Your last confirmed save is still available.";
  }
  if (status === 403) return "This role cannot submit the onboarding package.";
  if (code === "submission_blocked") {
    return typeof payload?.error === "string"
      ? payload.error
      : "Required partner items remain. Open the affected section and retry after saving.";
  }
  return "Could not submit the package. Nothing was submitted. Review the saved information and retry.";
}

const docketClass =
  "text-[0.68rem] font-bold uppercase tracking-[0.08em] text-[#475A6E] [font-family:var(--font-rcap-mono)]";
const utilityLinkClass =
  "inline-flex min-h-11 items-center text-sm font-bold text-[#0A6E77] underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#0A8E9A] focus-visible:ring-offset-2";
const inlineLinkClass =
  "font-bold text-[#071B33] underline decoration-[#FF3B00] underline-offset-4 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#0A8E9A] focus-visible:ring-offset-2";
const secondaryActionClass =
  "inline-flex min-h-11 items-center justify-center border border-[#071B33] bg-white px-4 py-2 text-center text-sm font-bold text-[#071B33] hover:border-[#0A8E9A] hover:text-[#0A8E9A] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#0A8E9A] focus-visible:ring-offset-2";
const primaryActionClass =
  "inline-flex min-h-12 items-center justify-center bg-[#FF3B00] px-6 py-3 text-center text-sm font-extrabold text-white hover:bg-[#D93400] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#0A8E9A] focus-visible:ring-offset-2 disabled:cursor-wait disabled:opacity-70";
