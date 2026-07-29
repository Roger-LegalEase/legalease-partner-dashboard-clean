import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import type {
  LaunchCheckEvaluation,
  LaunchCheckStatus,
  LaunchReadiness
} from "@/lib/partners/onboarding/launch-readiness";

const STATUS_COPY: Readonly<Record<LaunchCheckStatus, string>> = {
  not_started: "Not started",
  passing: "Met",
  failing: "Not met",
  needs_review: "Needs review",
  waived: "Waived by LegalEase",
  not_applicable: "Not applicable"
};

const OWNER_COPY = {
  legalease: "LegalEase",
  partner: "Partner"
} as const;

function statusTone(status: LaunchCheckStatus) {
  if (status === "passing" || status === "waived" || status === "not_applicable") {
    return "teal" as const;
  }
  if (status === "needs_review") return "orange" as const;
  return "neutral" as const;
}

/**
 * The readiness summary and its grouped checks. It reports state and asks for
 * one next action; it offers nothing that could publish, activate, invite, or
 * send, on either surface that renders it.
 */
export function LaunchReadinessView({
  readiness,
  audience,
  renderCheckAction
}: {
  readiness: LaunchReadiness;
  audience: "internal" | "partner";
  renderCheckAction?: (check: LaunchCheckEvaluation) => React.ReactNode;
}) {
  return (
    <div className="space-y-5" data-readiness-audience={audience}>
      <Card className="p-5" data-readiness-summary={readiness.ready ? "ready" : "not_ready"}>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h3 className="text-base font-black text-navy">
              {readiness.ready
                ? "Ready to launch"
                : "Not ready to launch"}
            </h3>
            <p className="mt-1 text-sm text-grayWilma-700">
              {readiness.ready
                ? "Every blocking check is met. Launching itself is a separate, later decision."
                : `${readiness.blockingFailures} blocking ${
                    readiness.blockingFailures === 1 ? "check is" : "checks are"
                  } not met yet.`}
            </p>
          </div>
          <Badge tone={readiness.ready ? "teal" : "orange"}>
            {readiness.ready ? "Ready" : "Not ready"}
          </Badge>
        </div>

        {readiness.primaryNextAction ? (
          <div className="mt-4 rounded-md border border-orange/30 bg-orange/10 px-4 py-3">
            <p className="text-[0.68rem] font-black uppercase tracking-wide text-orange">
              Next action · {OWNER_COPY[readiness.primaryNextAction.owner]}
            </p>
            <p className="mt-1 text-sm font-semibold text-navy">
              {readiness.primaryNextAction.action}
            </p>
            <p className="mt-1 text-xs text-grayWilma-700">
              For: {readiness.primaryNextAction.label}
            </p>
          </div>
        ) : null}

        <p className="mt-4 text-xs text-grayWilma-700">
          This page reports readiness only. It does not publish the page,
          activate the program, release an access code, or send anything.
        </p>
      </Card>

      {readiness.groups.map((group) => (
        <section key={group.category} aria-labelledby={`readiness-${group.category}`}>
          <h4
            id={`readiness-${group.category}`}
            className="text-sm font-black uppercase tracking-wide text-navy"
          >
            {group.label}
          </h4>
          <div className="mt-3 space-y-3">
            {group.checks.map((check) => (
              <Card
                key={check.key}
                className="p-4"
                data-check-key={check.key}
                data-check-status={check.status}
                data-check-blocking={check.blocking ? "true" : "false"}
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-black text-navy">{check.label}</p>
                    <p className="mt-1 text-xs text-grayWilma-700">
                      {OWNER_COPY[check.owner]} ·{" "}
                      {check.determination === "automated"
                        ? "Derived from program data"
                        : "Recorded by a reviewer"}{" "}
                      · {check.blocking ? "Blocking" : "Not blocking"}
                    </p>
                  </div>
                  <Badge tone={statusTone(check.status)}>
                    {STATUS_COPY[check.status]}
                  </Badge>
                </div>

                <p className="mt-3 text-sm leading-relaxed text-grayWilma-800">
                  {check.evidenceSummary}
                </p>
                <p className="mt-1 text-[0.68rem] uppercase tracking-wide text-grayWilma-600">
                  Evidence: {check.evidenceReference}
                </p>

                {check.blocking &&
                check.status !== "passing" &&
                check.status !== "waived" &&
                check.status !== "not_applicable" ? (
                  <p className="mt-3 rounded-md border border-grayWilma-200 bg-[#faf9f7] px-3 py-2 text-xs font-semibold text-navy">
                    {OWNER_COPY[check.owner]} next: {check.nextAction}
                  </p>
                ) : null}

                {renderCheckAction ? (
                  <div className="mt-3">{renderCheckAction(check)}</div>
                ) : null}
              </Card>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
