import Link from "next/link";
import type {
  PartnerImplementationFact,
  PartnerImplementationPresentation,
  PartnerImplementationTone
} from "@/lib/partners/onboarding/implementation-presentation";
import {
  PREPARATION_CARD_LABELS,
  PREPARED_BANNER
} from "@/lib/partners/onboarding/partner-copy";
import type { PartnerSupportContact } from "@/lib/partners/onboarding/support-contact";
import { PartnerSupportLink } from "./PartnerSupportLink";

export type Phase1OnboardingHomeProps = {
  organizationName: string;
  programName: string | null;
  implementationOwner: string | null;
  presentation: PartnerImplementationPresentation;
  isPartnerStaff: boolean;
  hasPendingPrefill: boolean;
  preparedWorkload: { prepared: number; needsInput: number; optional: number };
  commercial: {
    label: string;
    blocked: boolean;
    detail: string;
  };
  agreements: Array<{
    label: string;
    statusLabel: string;
    detail: string | null;
    downloadHref: string | null;
  }>;
  activity: Array<{
    id: string;
    label: string;
    createdAt: string;
  }>;
  support: PartnerSupportContact;
  supportHref: string;
};

export function Phase1OnboardingHome({
  organizationName,
  programName,
  implementationOwner,
  presentation,
  isPartnerStaff,
  hasPendingPrefill,
  preparedWorkload,
  commercial,
  agreements,
  activity,
  support,
  supportHref
}: Phase1OnboardingHomeProps) {
  const recentActivity = activity.slice(0, 5);
  // The prepared banner already carries this screen's primary action, so the current
  // next action only competes with it when the partner is the one who owes something.
  const legalEaseOwnsNextAction =
    presentation.currentAction.owner === "LegalEase" && hasPendingPrefill;

  return (
    <div className="min-w-0 text-[#071B33]">
      <nav className="mb-7 flex flex-wrap gap-x-6 gap-y-2" aria-label="Implementation navigation">
        <PortalLink href="/partner/dashboard">Back to dashboard</PortalLink>
        <PortalLink href="/partner/onboarding/resources">Resources and launch readiness</PortalLink>
        <PortalLink href="/partner/onboarding/artifacts">Implementation materials</PortalLink>
      </nav>

      <header className="border-b-4 border-[#071B33] pb-6">
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(280px,0.42fr)] lg:items-end">
          <div className="min-w-0">
            <p className={docketClass}>RCAP implementation center</p>
            <h1 className="mt-3 break-words text-3xl font-extrabold tracking-[-0.025em] text-[#071B33] sm:text-4xl lg:text-5xl">
              {programName || organizationName}
            </h1>
            {programName ? (
              <p className="mt-2 break-words text-base font-semibold text-[#475A6E]">
                {organizationName}
              </p>
            ) : null}
            <div
              className={`mt-5 border-l-4 px-4 py-2 ${toneBorder(presentation.overall.tone)}`}
              data-overall-implementation-state={presentation.overall.key}
            >
              <p className="text-lg font-extrabold text-[#071B33]">
                {presentation.overall.label}
              </p>
              <p className="mt-1 max-w-3xl text-sm leading-6 text-[#475A6E]">
                {presentation.overall.description}
              </p>
            </div>
          </div>

          <dl className="grid border border-[#B8C1C7] bg-white sm:grid-cols-2 lg:grid-cols-1">
            <HeaderFact
              label="Target launch date"
              value={formatDate(presentation.targetLaunchDate, "Not scheduled")}
              helper={
                presentation.targetLaunchDate
                  ? "Recorded target date"
                  : "Set after readiness planning"
              }
            />
            <HeaderFact
              label="LegalEase implementation owner"
              value={implementationOwner || "Not assigned"}
              helper={
                implementationOwner
                  ? "Named implementation contact"
                  : "Contact support to confirm ownership"
              }
            />
          </dl>
        </div>
        {isPartnerStaff ? (
          <p className="mt-5 border-l-4 border-[#475A6E] pl-4 text-sm font-semibold text-[#475A6E]">
            View only access. A partner administrator manages configuration changes.
          </p>
        ) : null}
      </header>

      <section className="border-x border-b border-[#B8C1C7] bg-white" aria-labelledby="status-architecture-heading">
        <h2 id="status-architecture-heading" className="sr-only">
          Implementation status
        </h2>
        <dl className="grid sm:grid-cols-2 xl:grid-cols-5">
          {presentation.dimensions.map((dimension) => (
            <div
              className="min-w-0 border-b border-[#D8DDDF] p-4 last:border-b-0 sm:border-r sm:last:border-r-0 xl:border-b-0"
              key={dimension.label}
              data-status-dimension={dimension.fact.key}
            >
              <dt className={docketClass}>{dimension.label}</dt>
              <dd className={`mt-2 text-base font-extrabold ${toneText(dimension.fact.tone)}`}>
                {dimension.fact.label}
              </dd>
              <p className="mt-1 text-xs leading-5 text-[#475A6E]">
                {dimension.fact.description}
              </p>
            </div>
          ))}
        </dl>
      </section>

      {hasPendingPrefill ? (
        <div
          className="mt-6 border border-[#0A8E9A] bg-[#EAF5F4] px-4 py-4 text-sm leading-6 text-[#071B33] md:px-5"
          data-prepared-onboarding-banner
        >
          <p className="text-base font-extrabold">{PREPARED_BANNER.heading}</p>
          <p className="mt-2 max-w-3xl">{PREPARED_BANNER.explanation}</p>
          <dl className="mt-4 grid gap-3 sm:grid-cols-3" data-prepared-workload>
            <WorkloadCard
              label={PREPARATION_CARD_LABELS.prepared}
              count={preparedWorkload.prepared}
              scope="prepared"
            />
            <WorkloadCard
              label={PREPARATION_CARD_LABELS.needsInput}
              count={preparedWorkload.needsInput}
              scope="needs-input"
            />
            <WorkloadCard
              label={PREPARATION_CARD_LABELS.optional}
              count={preparedWorkload.optional}
              scope="optional"
            />
          </dl>
          {PREPARED_BANNER.primaryAction ? (
            <Link
              className="mt-4 inline-flex min-h-11 items-center justify-center bg-[#071B33] px-5 py-2.5 text-sm font-extrabold text-white hover:bg-[#0A2A4E] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#0A8E9A] focus-visible:ring-offset-2"
              href={PREPARED_BANNER.primaryAction.href ?? "/partner/onboarding"}
              data-prepared-onboarding-action
            >
              {PREPARED_BANNER.primaryAction.label}
            </Link>
          ) : null}
        </div>
      ) : null}

      <section
        className="mt-8 border border-[#071B33] bg-white"
        aria-labelledby="current-next-action-heading"
        data-current-next-action
      >
        <div className="border-l-[6px] border-[#FF3B00] p-5 sm:p-7">
          <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(250px,0.42fr)] lg:items-end">
            <div className="min-w-0">
              <p className={`${docketClass} text-[#C42E00]`}>Current next action</p>
              <h2 id="current-next-action-heading" className="mt-3 text-2xl font-extrabold leading-tight text-[#071B33] sm:text-3xl">
                {presentation.currentAction.action}
              </h2>
              <p className="mt-3 max-w-3xl text-sm leading-6 text-[#475A6E]">
                {presentation.currentAction.whyItMatters}
              </p>
            </div>
            {/* A state LegalEase owns gets a quiet link, not a second orange call to
                action. Two primary actions on one screen leaves a program director
                guessing which one is theirs. */}
            <Link
              className={
                legalEaseOwnsNextAction
                  ? "inline-flex min-h-11 items-center justify-center border border-[#475A6E] px-5 py-2.5 text-center text-sm font-bold text-[#071B33] hover:bg-[#EDF1F3] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#0A8E9A] focus-visible:ring-offset-2"
                  : "inline-flex min-h-12 w-full items-center justify-center bg-[#FF3B00] px-5 py-3 text-center text-sm font-extrabold text-white hover:bg-[#D93400] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#0A8E9A] focus-visible:ring-offset-2"
              }
              href={presentation.currentAction.href}
              data-primary-next-action={legalEaseOwnsNextAction ? undefined : true}
              data-secondary-next-action={legalEaseOwnsNextAction ? true : undefined}
            >
              {presentation.currentAction.label}
            </Link>
          </div>
          <dl className="mt-6 grid border-t border-[#D8DDDF] pt-4 sm:grid-cols-3">
            <ActionFact
              label="Owner"
              value={presentation.currentAction.owner}
              dataAttribute="owner"
            />
            <ActionFact
              label="Due date"
              value={presentation.currentAction.dueDateFallback}
              dataAttribute="due-date"
            />
            <ActionFact
              label="Scheduling action"
              value={presentation.currentAction.schedulingAction}
              dataAttribute="scheduling-action"
            />
          </dl>
          {isPartnerStaff ? (
            <p className="mt-4 text-sm leading-6 text-[#475A6E]">
              You can review this workspace. A partner administrator must complete any configuration change.
            </p>
          ) : null}
        </div>
      </section>

      <section className="mt-10" aria-labelledby="implementation-milestones-heading">
        <SectionHeading
          eyebrow="Implementation path"
          heading="Seven implementation milestones"
          id="implementation-milestones-heading"
          detail="The current milestone is expanded on mobile. Every milestone links to its working area."
        />
        <ol className="mt-5 border border-[#B8C1C7] bg-white">
          {presentation.milestones.map((milestone, index) => (
            <li
              className={`relative grid min-w-0 gap-4 border-t border-[#D8DDDF] p-4 first:border-t-0 sm:grid-cols-[32px_minmax(0,1fr)] sm:p-5 ${
                milestone.current ? "bg-[#F2F8F7]" : ""
              }`}
              key={milestone.key}
              data-current-milestone={milestone.current ? "true" : "false"}
            >
              <div
                className={`flex h-8 w-8 items-center justify-center border text-xs font-bold [font-family:var(--font-rcap-mono)] ${
                  milestone.current
                    ? "border-[#FF3B00] bg-[#FF3B00] text-white"
                    : milestone.state.tone === "teal"
                      ? "border-[#0A8E9A] bg-[#0A8E9A] text-white"
                      : "border-[#82919F] bg-white text-[#475A6E]"
                }`}
                aria-hidden="true"
              >
                {String(index + 1).padStart(2, "0")}
              </div>
              <div className="min-w-0">
                <div className="flex min-w-0 flex-wrap items-start justify-between gap-x-5 gap-y-2">
                  <div className="min-w-0">
                    <h3 className="break-words text-base font-extrabold text-[#071B33]">
                      {milestone.title}
                    </h3>
                    <p className="mt-1 text-sm leading-6 text-[#475A6E]">
                      {milestone.description}
                    </p>
                  </div>
                  <StatusText fact={milestone.state} />
                </div>

                <div
                  className={milestone.current ? "mt-4 grid gap-4" : "mt-4 hidden gap-4 md:grid"}
                  data-milestone-details
                >
                  <dl className="grid gap-3 border-t border-[#C9D1D5] pt-4 sm:grid-cols-3">
                    <ActionFact label="Owner" value={milestone.owner} />
                    <ActionFact
                      label={milestone.dateLabel}
                      value={formatDate(milestone.date, milestone.dateFallback)}
                    />
                    <ActionFact label="Blocker" value={milestone.blocker} />
                  </dl>
                  <div className="flex flex-col gap-3 border-t border-[#D8DDDF] pt-4 sm:flex-row sm:items-center sm:justify-between">
                    <p className="text-sm font-semibold leading-6 text-[#071B33]">
                      Next: {milestone.nextAction}
                    </p>
                    <PortalLink href={milestone.href}>{milestone.actionLabel}</PortalLink>
                  </div>
                </div>
              </div>
            </li>
          ))}
        </ol>
      </section>

      <section className="mt-10 scroll-mt-4" id="program-configuration" aria-labelledby="program-configuration-heading">
        <SectionHeading
          eyebrow="Milestone 03"
          heading="Program configuration"
          id="program-configuration-heading"
          detail="The eight setup sections are one part of implementation, not the overall program state."
        />
        <div className="mt-5 border border-[#B8C1C7] bg-white">
          <div className="grid gap-5 border-b border-[#B8C1C7] p-5 md:grid-cols-[minmax(0,1fr)_minmax(220px,0.36fr)] md:items-end">
            <div>
              <p className={docketClass}>Setup information</p>
              <p className="mt-2 text-xl font-extrabold text-[#071B33]">
                {presentation.setupInformation.label}
              </p>
              <p className="mt-1 text-sm leading-6 text-[#475A6E]">
                {presentation.setupInformation.description}
              </p>
            </div>
            <div>
              <div
                className="h-3 border border-[#82919F] bg-white"
                role="progressbar"
                aria-label="Setup information completion"
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={presentation.configuration.completionPercentage}
                aria-valuetext={presentation.setupInformation.label}
              >
                <div
                  className="h-full bg-[#0A8E9A]"
                  style={{ width: `${presentation.configuration.completionPercentage}%` }}
                />
              </div>
              <p className="mt-2 text-xs leading-5 text-[#475A6E]">
                {presentation.configuration.unresolvedChangeRequests > 0
                  ? `${presentation.configuration.unresolvedChangeRequests} unresolved change request${presentation.configuration.unresolvedChangeRequests === 1 ? "" : "s"}`
                  : "No unresolved change requests"}
              </p>
            </div>
          </div>

          <ol>
            {presentation.configuration.sections.map((section, index) => (
              <li
                className="grid min-w-0 gap-4 border-t border-[#D8DDDF] p-4 first:border-t-0 sm:grid-cols-[36px_minmax(0,1fr)_auto] sm:items-center md:p-5"
                key={section.key}
              >
                <span className={`${docketClass} text-[#0A8E9A]`} aria-hidden="true">
                  {String(index + 1).padStart(2, "0")}
                </span>
                <div className="min-w-0">
                  <div className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1">
                    <h3 className="break-words text-sm font-extrabold text-[#071B33]">
                      {section.title}
                    </h3>
                    <StatusText fact={section.state} compact />
                  </div>
                  <p className="mt-1 text-sm leading-5 text-[#475A6E]">
                    {section.changeRequest || section.summary}
                  </p>
                  {section.currentSubstepTitle ? (
                    <p className="mt-2 text-xs font-bold text-[#071B33] [font-family:var(--font-rcap-mono)]">
                      Current task: {section.currentSubstepTitle}
                    </p>
                  ) : null}
                  <p className="mt-2 text-xs text-[#475A6E] [font-family:var(--font-rcap-mono)]">
                    {section.lastStateLabel}
                    {section.lastStateAt ? ` ${formatDate(section.lastStateAt, "")}` : ""}
                  </p>
                </div>
                <Link
                  className="inline-flex min-h-11 items-center justify-center border border-[#071B33] bg-white px-4 py-2 text-center text-sm font-bold text-[#071B33] hover:border-[#0A8E9A] hover:text-[#0A8E9A] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#0A8E9A] focus-visible:ring-offset-2 sm:justify-self-end"
                  href={section.href}
                  aria-label={`${section.actionLabel}: ${section.title}`}
                >
                  {section.actionLabel}
                </Link>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="mt-10" aria-labelledby="implementation-schedule-heading">
        <SectionHeading
          eyebrow="Decision calendar"
          heading="Implementation schedule"
          id="implementation-schedule-heading"
          detail="Only dates recorded in the implementation source appear here."
        />
        <div className="mt-5 overflow-hidden border border-[#B8C1C7] bg-white">
          <ul>
            {presentation.schedule.map((item) => (
              <li
                className="grid min-w-0 gap-2 border-t border-[#D8DDDF] p-4 first:border-t-0 md:grid-cols-[minmax(180px,0.38fr)_minmax(150px,0.25fr)_minmax(0,1fr)] md:gap-5 md:p-5"
                key={item.key}
                data-schedule-state={item.date ? "scheduled" : "not-scheduled"}
              >
                <h3 className="text-sm font-extrabold text-[#071B33]">{item.label}</h3>
                <p className="text-sm font-bold text-[#475A6E] [font-family:var(--font-rcap-mono)]">
                  {formatDate(item.date, item.dateFallback)}
                </p>
                <p className="text-sm leading-6 text-[#475A6E]">{item.schedulingAction}</p>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="mt-10 scroll-mt-4" id="commercial-support" aria-labelledby="commercial-support-heading">
        <SectionHeading
          eyebrow="Reference"
          heading="Commercial and support summary"
          id="commercial-support-heading"
          detail="Supporting information stays available without competing with the current action."
        />
        <div className="mt-5 grid items-start gap-5 lg:grid-cols-2">
          <div className="border border-[#B8C1C7] bg-white p-5">
            <h3 className="text-base font-extrabold text-[#071B33]">Commercial record</h3>
            <p className={`mt-3 border-l-4 pl-3 text-sm font-bold ${commercial.blocked ? "border-[#FF3B00] text-[#C42E00]" : "border-[#0A8E9A] text-[#0A6E77]"}`}>
              {commercial.label}
            </p>
            <p className="mt-3 text-sm leading-6 text-[#475A6E]">{commercial.detail}</p>

            <h4 className="mt-6 border-t border-[#D8DDDF] pt-5 text-sm font-extrabold text-[#071B33]">
              Agreements and procurement
            </h4>
            {agreements.length > 0 ? (
              <dl className="mt-3 grid gap-4">
                {agreements.map((agreement) => (
                  <div className="grid gap-1" key={agreement.label}>
                    <div className="flex min-w-0 flex-wrap items-start justify-between gap-3">
                      <dt className="min-w-0 text-sm leading-5 text-[#475A6E]">{agreement.label}</dt>
                      <dd className="text-sm font-bold text-[#071B33]">
                        {agreement.statusLabel}
                      </dd>
                    </div>
                    {agreement.detail ? (
                      <p className="text-xs leading-5 text-[#475A6E]">{agreement.detail}</p>
                    ) : null}
                    {agreement.downloadHref ? (
                      <PortalLink href={agreement.downloadHref}>Download finalized copy</PortalLink>
                    ) : null}
                  </div>
                ))}
              </dl>
            ) : (
              <p className="mt-3 text-sm leading-6 text-[#475A6E]">
                No agreement updates are available yet.
              </p>
            )}
          </div>

          <div className="border border-[#B8C1C7] bg-white p-5">
            <h3 className="text-base font-extrabold text-[#071B33]">LegalEase support</h3>
            <p className="mt-3 text-sm leading-6 text-[#475A6E]">
              Ask about implementation ownership, scheduling, commercial status, or a launch-readiness decision.
            </p>
            <p className="mt-3 break-all text-sm font-bold leading-6">
              <PartnerSupportLink contact={support} href={supportHref} />
            </p>
            <p className="mt-1 text-xs leading-5 text-[#475A6E]">
              Opens your email app with this organization in the subject.
            </p>

            <h4 className="mt-6 border-t border-[#D8DDDF] pt-5 text-sm font-extrabold text-[#071B33]">
              Recent implementation activity
            </h4>
            {recentActivity.length > 0 ? (
              <ol className="mt-3 grid gap-3">
                {recentActivity.map((item) => (
                  <li className="border-l-2 border-[#0A8E9A] pl-3" key={item.id}>
                    <p className="text-sm font-semibold leading-5 text-[#071B33]">{item.label}</p>
                    <time
                      className="mt-1 block text-xs text-[#475A6E] [font-family:var(--font-rcap-mono)]"
                      dateTime={item.createdAt}
                    >
                      {formatDate(item.createdAt, "Date unavailable")}
                    </time>
                  </li>
                ))}
              </ol>
            ) : (
              <p className="mt-3 text-sm leading-6 text-[#475A6E]">
                Meaningful implementation activity will appear here.
              </p>
            )}
          </div>
        </div>
      </section>

      <footer className="mt-10 border-t-4 border-[#071B33] py-6" aria-labelledby="documented-next-step-heading">
        <p className={docketClass}>Documented next step</p>
        <h2 id="documented-next-step-heading" className="mt-2 text-lg font-extrabold text-[#071B33]">
          {presentation.currentAction.action}
        </h2>
        <p className="mt-2 text-sm leading-6 text-[#475A6E]">
          Owner: {presentation.currentAction.owner}. Due date: {presentation.currentAction.dueDateFallback}.
        </p>
        <div className="mt-3">
          <PortalLink href={presentation.currentAction.href}>
            Return to the current action
          </PortalLink>
        </div>
      </footer>
    </div>
  );
}

function HeaderFact({ label, value, helper }: { label: string; value: string; helper: string }) {
  return (
    <div className="min-w-0 border-t border-[#D8DDDF] p-4 first:border-t-0 sm:border-l sm:border-t-0 sm:first:border-l-0 lg:border-l-0 lg:border-t lg:first:border-t-0">
      <dt className={docketClass}>{label}</dt>
      <dd className="mt-2 break-words text-sm font-extrabold text-[#071B33]">{value}</dd>
      <p className="mt-1 text-xs leading-5 text-[#475A6E]">{helper}</p>
    </div>
  );
}

function ActionFact({
  label,
  value,
  dataAttribute
}: {
  label: string;
  value: string;
  dataAttribute?: string;
}) {
  return (
    <div className="min-w-0 border-t border-[#D8DDDF] py-3 first:border-t-0 sm:border-l sm:border-t-0 sm:px-4 sm:py-0 sm:first:border-l-0 sm:first:pl-0">
      <dt className={docketClass}>{label}</dt>
      <dd
        className="mt-2 break-words text-sm font-semibold leading-5 text-[#071B33]"
        {...(dataAttribute ? { [`data-next-action-${dataAttribute}`]: true } : {})}
      >
        {value}
      </dd>
    </div>
  );
}

function SectionHeading({
  eyebrow,
  heading,
  id,
  detail
}: {
  eyebrow: string;
  heading: string;
  id: string;
  detail: string;
}) {
  return (
    <div className="grid gap-2 md:grid-cols-[minmax(0,0.58fr)_minmax(280px,0.42fr)] md:items-end">
      <div>
        <p className={docketClass}>{eyebrow}</p>
        <h2 id={id} className="mt-2 text-2xl font-extrabold tracking-[-0.015em] text-[#071B33] sm:text-3xl">
          {heading}
        </h2>
      </div>
      <p className="text-sm leading-6 text-[#475A6E] md:text-right">{detail}</p>
    </div>
  );
}

function StatusText({ fact, compact = false }: { fact: PartnerImplementationFact; compact?: boolean }) {
  return (
    <span
      className={`${compact ? "text-xs" : "text-sm"} font-bold ${toneText(fact.tone)} [font-family:var(--font-rcap-mono)]`}
      data-presentation-state={fact.key}
    >
      {fact.label}
    </span>
  );
}

/** One prepared-onboarding workload count. A number and what it is, never a defect. */
function WorkloadCard({
  label,
  count,
  scope
}: {
  label: string;
  count: number;
  scope: string;
}) {
  return (
    <div className="border border-[#0A8E9A] bg-white px-3 py-2" data-workload-scope={scope}>
      <dt className="text-xs font-bold uppercase tracking-[0.05em] text-[#475A6E]">{label}</dt>
      <dd className="mt-1 text-xl font-extrabold text-[#071B33]">{count}</dd>
    </div>
  );
}

function PortalLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link
      className="inline-flex min-h-11 max-w-full items-center break-words text-sm font-bold text-[#0A6E77] underline decoration-2 underline-offset-4 hover:text-[#071B33] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#0A8E9A] focus-visible:ring-offset-2"
      href={href}
    >
      {children}
    </Link>
  );
}

const docketClass =
  "text-[0.68rem] font-bold uppercase tracking-[0.08em] text-[#475A6E] [font-family:var(--font-rcap-mono)]";

function toneText(tone: PartnerImplementationTone): string {
  const classes: Record<PartnerImplementationTone, string> = {
    teal: "text-[#0A6E77]",
    navy: "text-[#071B33]",
    orange: "text-[#C42E00]",
    slate: "text-[#475A6E]"
  };
  return classes[tone];
}

function toneBorder(tone: PartnerImplementationTone): string {
  const classes: Record<PartnerImplementationTone, string> = {
    teal: "border-[#0A8E9A]",
    navy: "border-[#071B33]",
    orange: "border-[#FF3B00]",
    slate: "border-[#475A6E]"
  };
  return classes[tone];
}

function formatDate(value: string | null, fallback: string): string {
  if (!value) return fallback;
  const dateOnly = /^\d{4}-\d{2}-\d{2}$/.test(value);
  const date = new Date(dateOnly ? `${value}T00:00:00.000Z` : value);
  if (Number.isNaN(date.getTime())) return fallback;
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC"
  }).format(date);
}
