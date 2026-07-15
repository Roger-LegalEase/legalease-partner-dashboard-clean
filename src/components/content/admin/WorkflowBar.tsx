"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, Lock } from "lucide-react";

import {
  CONTENT_TRANSITIONS,
  type ContentCapability,
  type ContentRole,
  type ContentStatus,
  type ContentType,
  requiresLegalReview,
  roleHasCapability
} from "@/lib/content/types";
import { contentApi } from "./api-client";
import { STATUS_LABELS, StatusPill } from "./primitives";

/**
 * The workflow bar.
 *
 * It offers exactly the transitions that are legal from the current status (CONTENT_TRANSITIONS) and
 * that this role may drive — and when a transition is unavailable it says WHY, rather than hiding the
 * button and leaving the user to guess. "Needs legal review" is information; a missing button is not.
 *
 * These checks are a mirror, not the enforcement. src/lib/content/workflow.ts re-evaluates every
 * transition server-side and the database has its own CHECK constraint underneath that. This copy
 * exists so the UI can be honest before the round trip, and it is intentionally the same rules.
 */

export type WorkflowBarProps = {
  postId: string;
  status: ContentStatus;
  contentType: ContentType;
  legalSensitive: boolean;
  legalApprovedAt: string | null;
  scheduledFor: string | null;
  role: ContentRole;
};

type Action = {
  to: ContentStatus;
  label: string;
  intent: "primary" | "neutral" | "danger";
  capability: ContentCapability;
  needsSchedule?: boolean;
  needsNote?: boolean;
};

const PUBLISHING_STATUSES: ContentStatus[] = ["published", "updated", "scheduled"];

function actionsFor(status: ContentStatus): Action[] {
  const allowed = CONTENT_TRANSITIONS[status] ?? [];

  const catalog: Record<string, Action> = {
    in_editorial_review: {
      to: "in_editorial_review",
      label: "Submit for editorial review",
      intent: "primary",
      capability: "content.submit_for_review"
    },
    in_legal_review: {
      to: "in_legal_review",
      label: "Submit for legal review",
      intent: "primary",
      capability: "content.submit_for_review"
    },
    approved: {
      to: "approved",
      label: status === "in_legal_review" ? "Legal approve" : "Approve",
      intent: "primary",
      capability: status === "in_legal_review" ? "content.legal_approve" : "content.editorial_approve"
    },
    changes_requested: {
      to: "changes_requested",
      label: "Request changes",
      intent: "neutral",
      capability: status === "in_legal_review" ? "content.legal_approve" : "content.editorial_approve",
      needsNote: true
    },
    scheduled: {
      to: "scheduled",
      label: "Schedule",
      intent: "primary",
      capability: "content.schedule",
      needsSchedule: true
    },
    published: {
      to: "published",
      label: status === "updated" ? "Republish" : "Publish now",
      intent: "primary",
      capability: "content.publish"
    },
    updated: {
      to: "updated",
      label: "Publish update",
      intent: "primary",
      capability: "content.publish"
    },
    archived: {
      to: "archived",
      label: status === "published" || status === "updated" ? "Unpublish (archive)" : "Archive",
      intent: "danger",
      capability: "content.archive"
    },
    draft: {
      to: "draft",
      label: status === "archived" ? "Restore to draft" : "Return to draft",
      intent: "neutral",
      capability: status === "archived" ? "content.archive" : "content.edit_own"
    }
  };

  return allowed.map((to) => catalog[to]).filter(Boolean);
}

/** Why this role cannot make this move — or null when it can. Mirrors evaluateTransition(). */
function blockedReason(action: Action, props: WorkflowBarProps): string | null {
  const { role, status, contentType, legalSensitive, legalApprovedAt } = props;

  if (!roleHasCapability(role, action.capability)) {
    return `The ${role.replace(/_/g, " ")} role does not have the ${action.capability} capability.`;
  }

  if (action.to === "approved" && status === "in_legal_review" && !["primary_admin", "legal_reviewer"].includes(role)) {
    return "Only a legal reviewer or the primary admin can approve content out of legal review.";
  }

  if (PUBLISHING_STATUSES.includes(action.to) && !["primary_admin", "editor"].includes(role)) {
    return `The ${role.replace(/_/g, " ")} role cannot publish or schedule content.`;
  }

  if (action.to === "archived" && !["primary_admin", "editor"].includes(role)) {
    return `The ${role.replace(/_/g, " ")} role cannot archive content.`;
  }

  // THE GATE. Legally substantive content cannot go live unreviewed, no matter who is asking.
  if (
    PUBLISHING_STATUSES.includes(action.to) &&
    requiresLegalReview(contentType, legalSensitive) &&
    !legalApprovedAt
  ) {
    return "Needs legal review. This content is legally substantive and has no recorded legal approval, so it cannot be published or scheduled yet.";
  }

  return null;
}

export default function WorkflowBar(props: WorkflowBarProps) {
  const router = useRouter();
  const [pending, setPending] = useState<ContentStatus | null>(null);
  const [error, setError] = useState<{ message: string; problems: string[] } | null>(null);
  const [note, setNote] = useState("");
  const [scheduledFor, setScheduledFor] = useState(toLocalInput(props.scheduledFor));

  const actions = useMemo(() => actionsFor(props.status), [props.status]);
  const legalGate = requiresLegalReview(props.contentType, props.legalSensitive);

  const run = async (action: Action) => {
    setError(null);

    if (action.needsSchedule && !scheduledFor) {
      setError({ message: "Pick a publication time before scheduling.", problems: [] });
      return;
    }

    setPending(action.to);
    const result = await contentApi.transition(props.postId, {
      to: action.to,
      scheduledFor: action.needsSchedule ? new Date(scheduledFor).toISOString() : null,
      note: note.trim() || null
    });
    setPending(null);

    if (!result.ok) {
      setError({ message: result.message, problems: result.problems });
      return;
    }

    setNote("");
    router.refresh();
  };

  return (
    <section className="rounded-md border border-slate-200 bg-white shadow-sm">
      <header className="flex flex-wrap items-center gap-3 border-b border-slate-200 px-5 py-3">
        <h2 className="text-sm font-black uppercase tracking-wide text-navy">Workflow</h2>
        <StatusPill status={props.status} />
        {legalGate && (
          <span
            className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wide ${
              props.legalApprovedAt
                ? "border-emerald-400 bg-emerald-50 text-emerald-800"
                : "border-indigo-300 bg-indigo-50 text-indigo-800"
            }`}
          >
            <Lock className="h-3 w-3" aria-hidden="true" />
            {props.legalApprovedAt ? "Legal approved" : "Legal review required"}
          </span>
        )}
        {props.scheduledFor && (
          <span className="text-xs font-semibold text-slate-600">
            Scheduled for {new Date(props.scheduledFor).toLocaleString()}
          </span>
        )}
      </header>

      <div className="space-y-4 px-5 py-4">
        {actions.length === 0 ? (
          <p className="text-sm text-slate-500">
            No transitions are available from {STATUS_LABELS[props.status]}.
          </p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {actions.map((action) => {
              const reason = blockedReason(action, props);
              const disabled = Boolean(reason) || pending !== null;
              return (
                <div key={action.to} className="flex flex-col">
                  <button
                    type="button"
                    disabled={disabled}
                    title={reason ?? action.label}
                    onClick={() => void run(action)}
                    className={`inline-flex min-h-9 items-center rounded-md border px-3 py-1.5 text-xs font-bold transition disabled:cursor-not-allowed disabled:opacity-50 ${
                      action.intent === "primary"
                        ? "border-navy bg-navy text-white hover:bg-navy-mid"
                        : action.intent === "danger"
                          ? "border-red-300 bg-white text-red-700 hover:bg-red-50"
                          : "border-slate-300 bg-white text-navy hover:border-navy"
                    }`}
                  >
                    {pending === action.to ? "Working…" : action.label}
                  </button>
                  {reason && (
                    <span className="mt-1 max-w-[16rem] text-[11px] leading-4 text-slate-500">{reason}</span>
                  )}
                </div>
              );
            })}
          </div>
        )}

        <div className="grid gap-3 md:grid-cols-2">
          <label className="block">
            <span className="text-xs font-bold uppercase tracking-wide text-slate-500">
              Note (recorded on the review / audit trail)
            </span>
            <textarea
              value={note}
              rows={2}
              onChange={(event) => setNote(event.target.value)}
              placeholder="Why are you requesting changes? What did you check?"
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
            />
          </label>
          <label className="block">
            <span className="text-xs font-bold uppercase tracking-wide text-slate-500">
              Publication time (for Schedule)
            </span>
            <input
              type="datetime-local"
              value={scheduledFor}
              onChange={(event) => setScheduledFor(event.target.value)}
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
            />
            <span className="mt-1 block text-[11px] text-slate-500">
              The scheduler publishes at this time. Scheduling does not skip legal review.
            </span>
          </label>
        </div>

        {error && (
          <div className="rounded-md border border-red-300 bg-red-50 px-4 py-3">
            <p className="flex items-center gap-2 text-sm font-bold text-red-700">
              <AlertTriangle className="h-4 w-4" aria-hidden="true" />
              {error.message}
            </p>
            {error.problems.length > 0 && (
              <ul className="mt-1 list-disc space-y-1 pl-5">
                {error.problems.map((problem, index) => (
                  <li key={index} className="text-xs leading-5 text-red-700">
                    {problem}
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>
    </section>
  );
}

/** ISO -> the value shape <input type="datetime-local"> expects, in the viewer's local zone. */
function toLocalInput(iso: string | null): string {
  if (!iso) return "";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}
