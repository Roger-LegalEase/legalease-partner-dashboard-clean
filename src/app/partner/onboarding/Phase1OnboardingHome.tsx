import Link from "next/link";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";

type BadgeTone = "teal" | "blue" | "orange" | "neutral";

export type Phase1OnboardingHomeProps = {
  organizationName: string;
  programName: string | null;
  status: string;
  statusLabel: string;
  completionPercentage: number;
  targetLaunchDate: string | null;
  blockerCopy: string;
  nextActionCopy: string;
  nextActionOwner: string;
  dominantHref: string;
  dominantLabel: string;
  canEdit: boolean;
  isPartnerStaff: boolean;
  sections: Array<{
    key: string;
    title: string;
    status: string;
    statusLabel: string;
    missingSummary: string | null;
  }>;
  commercial: {
    label: string;
    blocked: boolean;
    detail: string;
  };
  agreements: Array<{
    label: string;
    statusLabel: string;
    downloadHref: string | null;
  }>;
  activity: Array<{
    id: string;
    label: string;
    createdAt: string;
  }>;
};

export function Phase1OnboardingHome({
  organizationName,
  programName,
  status,
  statusLabel,
  completionPercentage,
  targetLaunchDate,
  blockerCopy,
  nextActionCopy,
  nextActionOwner,
  dominantHref,
  dominantLabel,
  canEdit,
  isPartnerStaff,
  sections,
  commercial,
  agreements,
  activity
}: Phase1OnboardingHomeProps) {
  const completion = clampPercentage(completionPercentage);
  const recentActivity = activity.slice(0, 6);

  return (
    <div className="text-[#0F1E3D]">
      <div className="mb-6">
        <Link
          className="inline-flex min-h-11 items-center text-sm font-semibold text-[#0F6E56] underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1D9E75] focus-visible:ring-offset-2"
          href="/partner/dashboard"
        >
          Back to dashboard
        </Link>
      </div>

      <header className="mb-6">
        <div className="flex flex-wrap items-center gap-3">
          <Badge tone={toneForStatus(status)}>{statusLabel}</Badge>
          {isPartnerStaff ? <span className="text-xs font-semibold text-[#8A8278]">View only</span> : null}
        </div>
        <h1 className="mt-4 text-3xl font-black tracking-[-0.02em] text-[#0F1E3D] md:text-4xl">
          Program setup
        </h1>
        <p className="mt-2 text-lg font-semibold text-[#0F1E3D]">{programName || organizationName}</p>
        {programName ? <p className="mt-1 text-sm text-[#8A8278]">{organizationName}</p> : null}
      </header>

      <Card className="mb-6 overflow-hidden rounded-[20px] border-[#EEE6DB] shadow-sm">
        <div className="grid gap-0 lg:grid-cols-[minmax(0,1.2fr)_minmax(280px,0.8fr)]">
          <section className="p-5 md:p-7" aria-labelledby="onboarding-progress-heading">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.06em] text-[#A8543A]">Setup progress</p>
                <h2 id="onboarding-progress-heading" className="mt-2 text-2xl font-black text-[#0F1E3D]">
                  {completion}% complete
                </h2>
              </div>
              <p className="text-sm font-semibold text-[#5C5750]">
                Target launch: <span className="text-[#0F1E3D]">{formatDate(targetLaunchDate)}</span>
              </p>
            </div>

            <div
              className="mt-5"
              role="progressbar"
              aria-label="Partner onboarding completion"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={completion}
              aria-valuetext={`${completion}% complete`}
            >
              <div className="h-2.5 overflow-hidden rounded-full bg-[#EEE6DB]">
                <div className="h-full rounded-full bg-[#1D9E75]" style={{ width: `${completion}%` }} />
              </div>
            </div>

            <dl className="mt-6 grid gap-4 sm:grid-cols-2">
              <div className="rounded-xl border border-[#EFE7DB] bg-[#FBF7F2] p-4">
                <dt className="text-xs font-bold uppercase tracking-[0.05em] text-[#8A8278]">Current blocker</dt>
                <dd className="mt-2 text-sm font-semibold leading-6 text-[#3A332C]">{blockerCopy}</dd>
              </div>
              <div className="rounded-xl border border-[#EFE7DB] bg-[#FBF7F2] p-4">
                <dt className="text-xs font-bold uppercase tracking-[0.05em] text-[#8A8278]">Next action owner</dt>
                <dd className="mt-2 text-sm font-semibold leading-6 text-[#3A332C]">{nextActionOwner}</dd>
              </div>
            </dl>
          </section>

          <section className="border-t border-[#EEE6DB] bg-[#FBF7F2] p-5 md:p-7 lg:border-l lg:border-t-0" aria-labelledby="onboarding-next-action-heading">
            <p className="text-xs font-bold uppercase tracking-[0.06em] text-[#D85A30]">Current next action</p>
            <h2 id="onboarding-next-action-heading" className="mt-3 text-xl font-black leading-7 text-[#0F1E3D]">
              {nextActionCopy}
            </h2>
            <Link
              className="mt-6 inline-flex min-h-12 w-full items-center justify-center rounded-xl bg-[#0F1E3D] px-5 py-3 text-center text-sm font-bold text-white transition hover:bg-[#0F6E56] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1D9E75] focus-visible:ring-offset-2"
              href={dominantHref}
            >
              {dominantLabel}
            </Link>
            {isPartnerStaff ? (
              <p className="mt-3 text-xs leading-5 text-[#8A8278]">
                A partner administrator can make changes. You can review current setup information.
              </p>
            ) : null}
          </section>
        </div>
      </Card>

      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1.45fr)_minmax(300px,0.75fr)]">
        <section aria-labelledby="onboarding-sections-heading">
          <div className="mb-3 flex flex-wrap items-end justify-between gap-3">
            <div>
              <h2 id="onboarding-sections-heading" className="text-xl font-black text-[#0F1E3D]">
                Setup sections
              </h2>
              <p className="mt-1 text-sm text-[#8A8278]">Review each section and address the items shown.</p>
            </div>
            <span className="text-xs font-semibold text-[#8A8278]">{sections.length} sections</span>
          </div>

          <Card className="overflow-hidden rounded-[20px] border-[#EEE6DB] shadow-sm">
            <ol className="divide-y divide-[#EEE6DB]">
              {sections.map((section, index) => (
                <li
                  key={section.key}
                  className="grid gap-3 px-4 py-4 sm:grid-cols-[auto_minmax(0,1fr)_auto] sm:items-center md:px-5"
                >
                  <span
                    className="flex h-8 w-8 items-center justify-center rounded-full bg-[#FBEAE1] text-sm font-bold text-[#A8543A]"
                    aria-hidden="true"
                  >
                    {index + 1}
                  </span>
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-sm font-bold text-[#0F1E3D]">{section.title}</h3>
                      <Badge tone={toneForStatus(section.status)}>{section.statusLabel}</Badge>
                    </div>
                    <p className="mt-1 text-sm leading-5 text-[#8A8278]">
                      {section.missingSummary || fallbackSectionSummary(section.status)}
                    </p>
                  </div>
                  <Link
                    className="inline-flex min-h-11 items-center justify-center rounded-xl border border-[#EEE6DB] bg-white px-4 py-2 text-sm font-bold text-[#0F1E3D] hover:border-[#1D9E75] hover:text-[#0F6E56] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1D9E75] focus-visible:ring-offset-2 sm:justify-self-end"
                    href={`/partner/onboarding/${encodeURIComponent(section.key)}`}
                    aria-label={`${canEdit ? "Open" : "View"} ${section.title}`}
                  >
                    {canEdit ? "Open section" : "View section"}
                  </Link>
                </li>
              ))}
            </ol>
          </Card>
        </section>

        <aside className="grid gap-4" aria-label="Program setup details">
          <Card className="rounded-[20px] border-[#EEE6DB] p-5 shadow-sm">
            <section aria-labelledby="commercial-heading">
              <h2 id="commercial-heading" className="text-base font-black text-[#0F1E3D]">
                Commercial status
              </h2>
              <p
                className={`mt-3 rounded-xl px-4 py-3 text-sm font-bold ${
                  commercial.blocked
                    ? "bg-[#FCEFD9] text-[#8A5A12]"
                    : "bg-teal/10 text-teal"
                }`}
              >
                {commercial.label}
              </p>
              <p className="mt-3 text-sm leading-6 text-[#5C5750]">{commercial.detail}</p>
            </section>

            <section className="mt-5 border-t border-[#EEE6DB] pt-5" aria-labelledby="agreements-heading">
              <h2 id="agreements-heading" className="text-base font-black text-[#0F1E3D]">
                Agreements and procurement
              </h2>
              {agreements.length > 0 ? (
                <dl className="mt-3 grid gap-3">
                  {agreements.map((agreement) => (
                    <div key={agreement.label} className="flex items-start justify-between gap-3">
                      <dt className="text-sm leading-5 text-[#5C5750]">{agreement.label}</dt>
                      <dd className="shrink-0 text-right text-sm font-bold text-[#0F1E3D]">
                        <span>{agreement.statusLabel}</span>
                        {agreement.downloadHref ? (
                          <Link
                            className="mt-1 block min-h-8 text-xs text-teal underline underline-offset-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal"
                            href={agreement.downloadHref}
                          >
                            Download finalized copy
                          </Link>
                        ) : null}
                      </dd>
                    </div>
                  ))}
                </dl>
              ) : (
                <p className="mt-3 text-sm leading-6 text-[#8A8278]">No agreement updates are available yet.</p>
              )}
            </section>
          </Card>

          <Card className="rounded-[20px] border-[#EEE6DB] p-5 shadow-sm">
            <section aria-labelledby="recent-activity-heading">
              <h2 id="recent-activity-heading" className="text-base font-black text-[#0F1E3D]">
                Recent activity
              </h2>
              {recentActivity.length > 0 ? (
                <ol className="mt-3 grid gap-3">
                  {recentActivity.map((item) => (
                    <li key={item.id} className="border-l-2 border-[#1D9E75] pl-3">
                      <p className="text-sm font-semibold leading-5 text-[#3A332C]">{item.label}</p>
                      <time className="mt-1 block text-xs text-[#8A8278]" dateTime={item.createdAt}>
                        {formatActivityDate(item.createdAt)}
                      </time>
                    </li>
                  ))}
                </ol>
              ) : (
                <p className="mt-3 text-sm leading-6 text-[#8A8278]">Meaningful setup activity will appear here.</p>
              )}
            </section>

            <section className="mt-5 border-t border-[#EEE6DB] pt-5" aria-labelledby="setup-support-heading">
              <h2 id="setup-support-heading" className="text-base font-black text-[#0F1E3D]">
                Need help?
              </h2>
              <p className="mt-2 text-sm leading-6 text-[#5C5750]">
                Contact your LegalEase program lead through the support channel already provided to your organization.
              </p>
            </section>
          </Card>
        </aside>
      </div>
    </div>
  );
}

function clampPercentage(value: number) {
  if (!Number.isFinite(value)) return 0;
  return Math.min(100, Math.max(0, Math.round(value)));
}

function toneForStatus(status: string): BadgeTone {
  const normalized = status.trim().toLowerCase();
  if (["approved", "ready_to_launch", "live", "waived"].includes(normalized)) return "teal";
  if (["commercially_blocked", "waiting_on_partner", "needs_changes", "blocked"].includes(normalized)) return "orange";
  if (["draft", "setup_in_progress", "ready_for_review", "submitted", "in_progress"].includes(normalized)) return "blue";
  return "neutral";
}

function fallbackSectionSummary(status: string) {
  const normalized = status.trim().toLowerCase();
  return ["approved", "waived", "not_applicable"].includes(normalized) ? "No partner action is needed." : "Open this section to review its requirements.";
}

function formatDate(value: string | null) {
  if (!value) return "Not scheduled";
  return formatDateValue(value, { month: "short", day: "numeric", year: "numeric" }) ?? "Not scheduled";
}

function formatActivityDate(value: string) {
  return formatDateValue(value, { month: "short", day: "numeric", year: "numeric" }) ?? "Date unavailable";
}

function formatDateValue(value: string, options: Intl.DateTimeFormatOptions) {
  const dateOnly = /^\d{4}-\d{2}-\d{2}$/.test(value);
  const date = new Date(dateOnly ? `${value}T00:00:00.000Z` : value);
  if (Number.isNaN(date.getTime())) return null;
  return new Intl.DateTimeFormat("en", { ...options, timeZone: "UTC" }).format(date);
}
