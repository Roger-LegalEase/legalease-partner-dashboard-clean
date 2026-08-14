import Link from "next/link";
import {
  guidedSectionHref,
  SECTION_CHANGE_REQUEST_STEP,
  type GuidedStepResolution
} from "@/lib/partners/onboarding/guided-substeps";
import { getFieldDefinition } from "@/lib/partners/onboarding/schema";
import type { OnboardingSectionView } from "@/lib/partners/onboarding/service";
import {
  onboardingOptionLabel,
  sectionStatusLabel
} from "@/lib/partners/onboarding/partner-labels";
import { GuidedChangeRequestPanel } from "./GuidedChangeRequestPanel";

export function OnboardingStaffSectionSummary({
  resolution,
  section,
  values,
  readOnlyValues,
  administratorName,
  lastDecisionAt,
  organizationName
}: {
  resolution: GuidedStepResolution;
  section: OnboardingSectionView;
  values: Readonly<Record<string, unknown>>;
  readOnlyValues: Readonly<Record<string, unknown>>;
  administratorName: string | null;
  lastDecisionAt: string | null;
  organizationName: string;
}) {
  const currentStepId = resolution.requestOverview
    ? SECTION_CHANGE_REQUEST_STEP
    : resolution.substep.id;
  const displayFields = resolution.substep.ownedFieldKeys.map((fieldKey) => {
    const key = String(fieldKey);
    const definition = getFieldDefinition(
      fieldKey as Parameters<typeof getFieldDefinition>[0]
    );
    return {
      key,
      label: definition?.label ?? "Saved information",
      dataType: definition?.dataType ?? null,
      value:
        definition?.ownership === "partner_editable"
          ? values[definition.dataKey]
          : readOnlyValues[definition?.dataKey ?? key]
    };
  });

  return (
    <div className="mx-auto max-w-6xl text-[#071B33]">
      <header className="border-b-4 border-[#071B33] pb-6">
        <Link className={utilityLinkClass} href="/partner/onboarding#program-configuration">
          Return to implementation center
        </Link>
        <p className="mt-5 text-xs font-bold uppercase tracking-[0.12em] text-[#0A8E9A] [font-family:var(--font-rcap-mono)]">
          Staff program summary
        </p>
        <h1 className="mt-2 text-3xl font-extrabold tracking-[-0.02em] md:text-4xl">
          {section.title}
        </h1>
        <p className="mt-3 max-w-3xl text-sm leading-6 text-[#475A6E]">
          You can read the submitted or approved implementation record because
          your active {organizationName} staff role includes this workspace. A partner
          administrator manages corrections and submission.
        </p>
        <dl className="mt-5 grid border border-[#B8C1C7] bg-white sm:grid-cols-3">
          <StaffFact label="Section state" value={sectionStatusLabel(section.status)} />
          <StaffFact
            label="Partner administrator"
            value={administratorName || "Not recorded"}
          />
          <StaffFact
            label="Last submitted or approved"
            value={formatDate(lastDecisionAt)}
          />
        </dl>
      </header>

      <div className="sticky top-0 z-20 -mx-4 mt-5 border-y border-[#B8C1C7] bg-[#F7F4EE] px-4 py-3 lg:hidden">
        <p className="text-xs font-bold uppercase tracking-[0.08em] text-[#475A6E] [font-family:var(--font-rcap-mono)]">
          {resolution.requestOverview
            ? "Requested update"
            : `Step ${resolution.index + 1} of ${resolution.section.substeps.length}`}
        </p>
        <p className="mt-1 break-words text-sm font-extrabold text-[#071B33]">
          {resolution.requestOverview
            ? "LegalEase request"
            : resolution.substep.title}
        </p>
      </div>

      <div className="mt-7 grid gap-6 lg:grid-cols-[280px_minmax(0,1fr)]">
        <nav
          aria-label="Section tasks"
          className="hidden border border-[#B8C1C7] bg-white lg:sticky lg:top-6 lg:block lg:self-start"
        >
          <div className="border-b border-[#B8C1C7] p-4">
            <p className="text-xs font-bold uppercase tracking-[0.1em] text-[#475A6E] [font-family:var(--font-rcap-mono)]">
              Read-only section
            </p>
          </div>
          <ol>
            {section.changeRequestStatus ? (
              <li className="border-b border-[#D8DDDF]">
                <StaffStepLink
                  active={currentStepId === SECTION_CHANGE_REQUEST_STEP}
                  href={guidedSectionHref(section.key, SECTION_CHANGE_REQUEST_STEP)}
                  label="LegalEase request"
                  marker="CR"
                />
              </li>
            ) : null}
            {resolution.section.substeps.map((substep, index) => (
              <li className="border-b border-[#D8DDDF] last:border-b-0" key={substep.id}>
                <StaffStepLink
                  active={currentStepId === substep.id}
                  href={guidedSectionHref(section.key, substep.id)}
                  label={substep.title}
                  marker={String(index + 1).padStart(2, "0")}
                />
              </li>
            ))}
          </ol>
        </nav>

        <div className="min-w-0">
          {resolution.requestOverview ? (
            <GuidedChangeRequestPanel
              requests={section.changeRequests}
              sectionLevel
            />
          ) : (
            <section aria-labelledby="staff-summary-step" className="border border-[#B8C1C7] bg-white p-5 md:p-7">
              <p className="text-xs font-bold uppercase tracking-[0.1em] text-[#0A8E9A] [font-family:var(--font-rcap-mono)]">
                Step {resolution.index + 1} of {resolution.section.substeps.length}
              </p>
              <h2 className="mt-2 text-2xl font-extrabold" id="staff-summary-step">
                {resolution.substep.title}
              </h2>
              <p className="mt-2 max-w-3xl text-sm leading-6 text-[#475A6E]">
                {resolution.substep.purpose}
              </p>

              {displayFields.length > 0 ? (
                <dl className="mt-6 divide-y divide-[#D8DDDF] border-y border-[#D8DDDF]">
                  {displayFields.map((field) => (
                    <div className="grid gap-2 py-4 sm:grid-cols-[minmax(180px,0.38fr)_minmax(0,1fr)] sm:gap-6" key={field.key}>
                      <dt className="text-sm font-bold text-[#475A6E]">{field.label}</dt>
                      <dd className="break-words whitespace-pre-wrap text-sm leading-6 text-[#071B33]">
                        {formatValue(field.value, field.dataType)}
                      </dd>
                    </div>
                  ))}
                </dl>
              ) : (
                <div className="mt-6 border-l-4 border-[#0A8E9A] bg-[#EEF7F6] p-4 text-sm leading-6 text-[#475A6E]">
                  This task explains the implementation decision and has no
                  staff-editable field.
                </div>
              )}

              <p className="mt-6 border-t border-[#D8DDDF] pt-4 text-sm leading-6 text-[#475A6E]">
                {resolution.substep.outcome}
              </p>
            </section>
          )}

          <div className="mt-5 border-t-4 border-[#071B33] pt-5">
            <p className="text-sm leading-6 text-[#475A6E]">
              Need a correction? Contact {administratorName || "your partner administrator"}.
              Staff access cannot edit or submit this record.
            </p>
            <Link
              className="mt-4 inline-flex min-h-12 items-center justify-center border border-[#071B33] bg-[#071B33] px-5 py-3 text-sm font-extrabold text-white focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#0A8E9A] focus-visible:ring-offset-2"
              href="/partner/onboarding#program-configuration"
            >
              Return to implementation center
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

function StaffFact({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0 border-b border-[#D8DDDF] p-4 last:border-b-0 sm:border-b-0 sm:border-r sm:last:border-r-0">
      <dt className="text-xs font-bold uppercase tracking-[0.08em] text-[#475A6E] [font-family:var(--font-rcap-mono)]">
        {label}
      </dt>
      <dd className="mt-2 break-words text-sm font-extrabold text-[#071B33]">{value}</dd>
    </div>
  );
}

function StaffStepLink({
  active,
  href,
  label,
  marker
}: {
  active: boolean;
  href: string;
  label: string;
  marker: string;
}) {
  return (
    <Link
      aria-current={active ? "step" : undefined}
      className={`grid min-h-12 grid-cols-[32px_minmax(0,1fr)] items-center gap-3 px-4 py-3 text-sm font-bold focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-inset focus-visible:ring-[#0A8E9A] ${
        active
          ? "border-l-4 border-[#FF3B00] bg-[#EEF7F6] text-[#071B33]"
          : "border-l-4 border-transparent text-[#475A6E] hover:text-[#0A8E9A]"
      }`}
      href={href}
    >
      <span className="text-xs [font-family:var(--font-rcap-mono)]">{marker}</span>
      <span className="break-words">{label}</span>
    </Link>
  );
}

function formatValue(value: unknown, dataType: string | null = null): string {
  if (Array.isArray(value)) {
    if (value.length === 0) return "Not provided";
    return value
      .map((item) => {
        if (item && typeof item === "object") {
          const row = item as Record<string, unknown>;
          const parts = [
            row.name,
            typeof row.role === "string"
              ? onboardingOptionLabel(row.role)
              : row.role,
            typeof row.requested_role === "string"
              ? onboardingOptionLabel(row.requested_role)
              : row.requested_role,
            row.work_email
          ].filter((part): part is string =>
            typeof part === "string" && part.trim().length > 0
          );
          return parts.join(" | ") || "Saved list item";
        }
        return String(item);
      })
      .join("\n");
  }
  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (typeof value === "number") return String(value);
  if (typeof value === "string") {
    if (!value.trim()) return "Not provided";
    return dataType === "enum" ? onboardingOptionLabel(value) : value;
  }
  return "Not provided";
}

function formatDate(value: string | null): string {
  if (!value) return "Not recorded";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Recorded date unavailable";
  return new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
    timeZone: "UTC"
  }).format(date);
}

const utilityLinkClass =
  "inline-flex min-h-11 items-center text-sm font-bold text-[#0A6E77] underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#0A8E9A] focus-visible:ring-offset-2";
