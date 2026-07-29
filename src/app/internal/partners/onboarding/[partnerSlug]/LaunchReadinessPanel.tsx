"use client";

import { useState } from "react";

import { LaunchReadinessView } from "@/components/partners/onboarding/LaunchReadinessView";
import type {
  LaunchCheckEvaluation,
  LaunchReadiness
} from "@/lib/partners/onboarding/launch-readiness";

const buttonClass =
  "inline-flex min-h-10 items-center justify-center rounded-md bg-navy px-3 py-2 text-xs font-bold text-white hover:bg-teal disabled:cursor-not-allowed disabled:opacity-50";
const quietButtonClass =
  "inline-flex min-h-10 items-center justify-center rounded-md border border-grayWilma-200 bg-white px-3 py-2 text-xs font-bold text-navy hover:border-teal hover:text-teal disabled:cursor-not-allowed disabled:opacity-50";

/**
 * The internal Launch Readiness area.
 *
 * Its only actions record a LegalEase decision on a LegalEase-owned manual
 * check. Automated checks have no control at all, because their state comes
 * from program data. There is no publish, activate, invite, or send control
 * here, and none can be added without also changing the service and the
 * database, both of which refuse.
 */
export function LaunchReadinessPanel({
  partnerSlug,
  readiness
}: {
  partnerSlug: string;
  readiness: LaunchReadiness;
}) {
  const [current, setCurrent] = useState(readiness);
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function mutate(action: string, payload: Record<string, unknown>) {
    if (pending) return;
    setPending(true);
    setMessage(null);
    try {
      const response = await fetch(
        `/api/internal/partners/onboarding/phase1/${encodeURIComponent(
          partnerSlug
        )}/launch-readiness`,
        {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            action,
            requestId: crypto.randomUUID(),
            payload
          })
        }
      );
      const body = (await response.json()) as {
        success?: boolean;
        error?: string;
        readiness?: LaunchReadiness;
      };
      if (!response.ok || !body.success) {
        setMessage(body.error ?? "That action could not be completed.");
        return;
      }
      if (body.readiness) setCurrent(body.readiness);
    } catch {
      setMessage("That action could not be completed.");
    } finally {
      setPending(false);
    }
  }

  function renderCheckAction(check: LaunchCheckEvaluation) {
    // Automated checks are derived, so there is nothing to click.
    if (check.determination !== "manual") return null;
    // A partner-owned check is recorded by the partner, not here.
    if (check.owner !== "legalease") {
      return (
        <p className="text-xs text-grayWilma-700">
          The partner records this one.
        </p>
      );
    }

    const satisfied =
      check.status === "passing" ||
      check.status === "waived" ||
      check.status === "not_applicable";

    if (check.key === "legalease_final_review_complete") {
      return (
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            className={buttonClass}
            disabled={pending || satisfied}
            onClick={() =>
              mutate("record_final_review", { decision: "approve" })
            }
          >
            Record final review complete
          </button>
          {satisfied ? (
            <button
              type="button"
              className={quietButtonClass}
              disabled={pending}
              onClick={() =>
                mutate("record_final_review", { decision: "withdraw" })
              }
            >
              Withdraw
            </button>
          ) : null}
        </div>
      );
    }

    return (
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          className={buttonClass}
          disabled={pending || satisfied}
          onClick={() =>
            mutate("record_check", {
              checkKey: check.key,
              status: "passing",
              evidenceSummary: "Marked complete by an internal reviewer."
            })
          }
        >
          Mark complete
        </button>
        <button
          type="button"
          className={quietButtonClass}
          disabled={pending || check.status === "waived"}
          onClick={() =>
            mutate("record_check", {
              checkKey: check.key,
              status: "waived",
              evidenceSummary: "Waived by an internal reviewer."
            })
          }
        >
          Waive
        </button>
      </div>
    );
  }

  return (
    <div>
      {message ? (
        <p
          role="alert"
          className="mb-4 rounded-md border border-orange/30 bg-orange/10 px-4 py-3 text-sm font-semibold text-orange"
        >
          {message}
        </p>
      ) : null}
      <LaunchReadinessView
        readiness={current}
        audience="internal"
        renderCheckAction={renderCheckAction}
      />
    </div>
  );
}
