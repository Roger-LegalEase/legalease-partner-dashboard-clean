"use client";

import { useState } from "react";

import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { LaunchKitView } from "@/components/partners/onboarding/LaunchKitView";
import { LaunchReadinessView } from "@/components/partners/onboarding/LaunchReadinessView";
import type { ArtifactBoardEntry } from "@/lib/partners/onboarding/artifact-service";
import { ACTION_FAILURE_COPY } from "@/lib/partners/onboarding/partner-copy";
import type {
  LaunchCheckEvaluation,
  LaunchReadiness
} from "@/lib/partners/onboarding/launch-readiness";

const buttonClass =
  "inline-flex min-h-10 items-center justify-center rounded-md bg-navy px-3 py-2 text-xs font-bold text-white hover:bg-teal disabled:cursor-not-allowed disabled:opacity-50";
const quietButtonClass =
  "inline-flex min-h-10 items-center justify-center rounded-md border border-grayWilma-200 bg-white px-3 py-2 text-xs font-bold text-navy hover:border-teal hover:text-teal";

/**
 * The partner's resources area.
 *
 * It offers exactly two decisions, both the partner's own: confirming staff
 * training and recording the partner's launch approval. There is no waive
 * control, no internal check, and nothing that publishes, invites, releases a
 * code, or activates a program.
 */
export function PartnerResourcesClient({
  readiness,
  entries,
  canReview
}: {
  readiness: LaunchReadiness;
  entries: ArtifactBoardEntry[];
  canReview: boolean;
}) {
  const [current, setCurrent] = useState(readiness);
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const available = entries.filter(
    (entry) =>
      entry.currentVersion?.approvalStatus === "approved" &&
      entry.currentVersion.partnerReviewStatus === "approved"
  );
  const launchKit = entries.find(
    (entry) => entry.artifactType === "partner_launch_kit"
  );
  const launchKitPayload =
    launchKit?.currentVersion?.approvalStatus === "approved"
      ? launchKit.currentVersion.document?.launchKit ?? null
      : null;

  async function mutate(action: string, payload: Record<string, unknown>) {
    if (pending) return;
    setPending(true);
    setMessage(null);
    try {
      const response = await fetch("/api/partners/onboarding/launch-readiness", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action, requestId: crypto.randomUUID(), payload })
      });
      const body = (await response.json()) as {
        success?: boolean;
        error?: string;
        readiness?: LaunchReadiness;
      };
      if (!response.ok || !body.success) {
        setMessage(ACTION_FAILURE_COPY);
        return;
      }
      if (body.readiness) setCurrent(body.readiness);
    } catch {
      setMessage(ACTION_FAILURE_COPY);
    } finally {
      setPending(false);
    }
  }

  function renderCheckAction(check: LaunchCheckEvaluation) {
    if (check.determination !== "manual" || check.owner !== "partner") {
      return null;
    }
    if (!canReview) {
      return (
        <p className="text-xs text-grayWilma-700">
          A partner administrator records this one.
        </p>
      );
    }
    const satisfied = check.status === "passing";
    if (check.key === "partner_launch_approval_received") {
      return (
        <button
          type="button"
          className={buttonClass}
          disabled={pending || satisfied}
          onClick={() => mutate("record_launch_approval", {})}
        >
          Record our launch approval
        </button>
      );
    }
    return (
      <button
        type="button"
        className={buttonClass}
        disabled={pending || satisfied}
        onClick={() =>
          mutate("confirm_check", {
            checkKey: check.key,
            evidenceSummary: "Confirmed by the partner administrator."
          })
        }
      >
        Confirm complete
      </button>
    );
  }

  return (
    <div className="mt-8 space-y-8">
      {message ? (
        <p
          role="alert"
          className="rounded-md border border-orange/30 bg-orange/10 px-4 py-3 text-sm font-semibold text-orange"
        >
          {message}
        </p>
      ) : null}

      <section aria-labelledby="partner-resources-heading">
        <h2
          id="partner-resources-heading"
          className="text-lg font-black text-navy"
        >
          Approved resources
        </h2>
        {available.length === 0 ? (
          <p className="mt-2 text-sm text-grayWilma-700">
            Resources appear here once LegalEase has approved them and you have
            reviewed them in Program documents.
          </p>
        ) : (
          <ul className="mt-3 space-y-2">
            {available.map((entry) => (
              <li
                key={entry.artifactType}
                className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-grayWilma-200 bg-white px-4 py-3"
                data-resource-type={entry.artifactType}
              >
                <div className="min-w-0">
                  <p className="text-sm font-bold text-navy">{entry.label}</p>
                  <p className="text-xs text-grayWilma-700">
                    Version {entry.currentVersion?.versionNumber}
                  </p>
                </div>
                <a
                  className={quietButtonClass}
                  href={`/api/partners/onboarding/artifacts/download?versionId=${encodeURIComponent(
                    entry.currentVersion?.id ?? ""
                  )}`}
                >
                  Download
                </a>
              </li>
            ))}
          </ul>
        )}
      </section>

      {launchKitPayload ? (
        <section aria-labelledby="partner-launch-kit-heading">
          <h2
            id="partner-launch-kit-heading"
            className="text-lg font-black text-navy"
          >
            Your launch kit
          </h2>
          <div className="mt-3">
            <LaunchKitView launchKit={launchKitPayload} />
          </div>
        </section>
      ) : (
        <section aria-labelledby="partner-launch-kit-pending-heading">
          <h2
            id="partner-launch-kit-pending-heading"
            className="text-lg font-black text-navy"
          >
            Your launch kit
          </h2>
          <Card className="mt-3 p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="text-sm text-grayWilma-700">
                Your launch kit appears here once LegalEase has approved it.
              </p>
              <Badge>Not yet approved</Badge>
            </div>
          </Card>
        </section>
      )}

      <section aria-labelledby="partner-readiness-heading">
        <h2 id="partner-readiness-heading" className="text-lg font-black text-navy">
          Launch readiness
        </h2>
        <p className="mt-1 text-sm text-grayWilma-700">
          These are the items your team owns or needs to know about. LegalEase
          tracks its own preparation work separately.
        </p>
        <div className="mt-3">
          <LaunchReadinessView
            readiness={current}
            audience="partner"
            renderCheckAction={renderCheckAction}
          />
        </div>
      </section>
    </div>
  );
}
