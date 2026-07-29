import Link from "next/link";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";

type BadgeTone = "teal" | "blue" | "orange" | "neutral";

export type OnboardingDashboardCardProps = {
  completionPercentage: number;
  status: string;
  statusLabel: string;
  blockerCopy: string;
  nextActionCopy: string;
  nextActionOwner: string;
  targetLaunchDate: string | null;
  href: string;
  actionLabel: "Continue setup" | "Review and submit" | "View setup" | "View program setup";
};

export function OnboardingDashboardCard({
  completionPercentage,
  status,
  statusLabel,
  blockerCopy,
  nextActionCopy,
  nextActionOwner,
  targetLaunchDate,
  href,
  actionLabel
}: OnboardingDashboardCardProps) {
  const completion = clampPercentage(completionPercentage);
  const compactCompleteState = [
    "ready_to_launch",
    "live",
    "paused",
    "closed"
  ].includes(status.trim().toLowerCase());

  return (
    <section aria-labelledby="partner-onboarding-card-title" className="mb-[1.1rem]">
      <Card className="overflow-hidden rounded-[20px] border-[#EEE6DB] shadow-sm">
        <div className={`grid gap-0 ${compactCompleteState ? "" : "lg:grid-cols-[minmax(0,1fr)_minmax(280px,0.55fr)]"}`}>
          <div className="p-5 md:p-6">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.06em] text-[#D85A30]">Program setup</p>
                <h2 id="partner-onboarding-card-title" className="mt-2 text-xl font-black text-[#0F1E3D]">
                  {compactCompleteState ? "Your setup history" : "Complete your onboarding"}
                </h2>
              </div>
              <Badge tone={toneForStatus(status)}>{statusLabel}</Badge>
            </div>

            <div className="mt-5 flex flex-wrap items-end justify-between gap-3">
              <p className="text-3xl font-black tracking-[-0.03em] text-[#0F1E3D]">{completion}%</p>
              <p className="text-sm font-semibold text-[#5C5750]">
                Target launch: <span className="text-[#0F1E3D]">{formatDate(targetLaunchDate)}</span>
              </p>
            </div>
            <div
              className="mt-3"
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

            {!compactCompleteState ? (
              <dl className="mt-5 grid gap-3 sm:grid-cols-3">
                <div>
                  <dt className="text-xs font-bold uppercase tracking-[0.05em] text-[#8A8278]">Current blocker</dt>
                  <dd className="mt-1 text-sm font-semibold leading-5 text-[#3A332C]">{blockerCopy}</dd>
                </div>
                <div>
                  <dt className="text-xs font-bold uppercase tracking-[0.05em] text-[#8A8278]">Next action</dt>
                  <dd className="mt-1 text-sm font-semibold leading-5 text-[#3A332C]">{nextActionCopy}</dd>
                </div>
                <div>
                  <dt className="text-xs font-bold uppercase tracking-[0.05em] text-[#8A8278]">Next-action owner</dt>
                  <dd className="mt-1 text-sm font-semibold leading-5 text-[#3A332C]">{nextActionOwner}</dd>
                </div>
              </dl>
            ) : (
              <p className="mt-4 text-sm leading-6 text-[#5C5750]">
                Your program setup is complete. The workspace remains available as a record of approved configuration.
              </p>
            )}
          </div>

          <div className={`flex items-center border-t border-[#EEE6DB] bg-[#FBF7F2] p-5 md:p-6 ${compactCompleteState ? "" : "lg:border-l lg:border-t-0"}`}>
            <Link
              className="inline-flex min-h-12 w-full items-center justify-center rounded-xl bg-[#0F1E3D] px-5 py-3 text-center text-sm font-bold text-white transition hover:bg-[#0F6E56] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1D9E75] focus-visible:ring-offset-2"
              href={href}
            >
              {actionLabel}
            </Link>
          </div>
        </div>
      </Card>
    </section>
  );
}

function clampPercentage(value: number) {
  if (!Number.isFinite(value)) return 0;
  return Math.min(100, Math.max(0, Math.round(value)));
}

function toneForStatus(status: string): BadgeTone {
  const normalized = status.trim().toLowerCase();
  if (["approved", "ready_to_launch", "live"].includes(normalized)) return "teal";
  if (["commercially_blocked", "waiting_on_partner", "needs_changes", "blocked", "paused"].includes(normalized)) return "orange";
  if (["draft", "setup_in_progress", "ready_for_review"].includes(normalized)) return "blue";
  return "neutral";
}

function formatDate(value: string | null) {
  if (!value) return "Not scheduled";
  const dateOnly = /^\d{4}-\d{2}-\d{2}$/.test(value);
  const date = new Date(dateOnly ? `${value}T00:00:00.000Z` : value);
  if (Number.isNaN(date.getTime())) return "Not scheduled";
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC"
  }).format(date);
}
