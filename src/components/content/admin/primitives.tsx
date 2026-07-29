import type { ReactNode } from "react";

import type { ContentStatus } from "@/lib/content/types";
import type { MediaIssue } from "@/lib/content/media";

/**
 * Presentational primitives shared by the CMS server pages and the CMS client components.
 *
 * No "use client" and no server imports: this file is safe on both sides of the boundary. It also
 * deliberately avoids src/components/ui/{Card,Badge,Button}, which reference Tailwind classes that
 * do not exist in the config (grayWilma-*, wilmaBlue, danger) and therefore render unstyled.
 */

export function Panel({
  title,
  description,
  actions,
  children,
  className = ""
}: {
  title?: string;
  description?: string;
  actions?: ReactNode;
  children?: ReactNode;
  className?: string;
}) {
  return (
    <section className={`rounded-md border border-slate-200 bg-white shadow-sm ${className}`}>
      {(title || actions) && (
        <header className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-200 px-5 py-4">
          <div>
            {title && <h2 className="text-sm font-black uppercase tracking-wide text-navy">{title}</h2>}
            {description && <p className="mt-1 text-xs leading-5 text-slate-500">{description}</p>}
          </div>
          {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
        </header>
      )}
      <div className="p-5">{children}</div>
    </section>
  );
}

export function EmptyState({ message, hint }: { message: string; hint?: string }) {
  return (
    <div className="rounded-md border border-dashed border-slate-300 bg-slate-50 px-4 py-8 text-center">
      <p className="text-sm font-semibold text-slate-600">{message}</p>
      {hint && <p className="mt-1 text-xs leading-5 text-slate-500">{hint}</p>}
    </div>
  );
}

// NOTE: the Tailwind config maps `orange` and `teal` to single hex values, which REPLACES the
// default orange-*/teal-* scales — orange-50 and teal-400 do not exist and emit no CSS. Brand tints
// are therefore written as arbitrary values, not as scale steps.
const STATUS_STYLES: Record<ContentStatus, string> = {
  draft: "bg-slate-100 text-slate-700 border-slate-300",
  in_editorial_review: "bg-amber-50 text-amber-800 border-amber-300",
  changes_requested: "bg-[#FDEDE8] text-[#E83A0A] border-[#E83A0A]",
  in_legal_review: "bg-indigo-50 text-indigo-800 border-indigo-300",
  approved: "bg-[#E6F6F5] text-[#00776F] border-[#00A99D]",
  scheduled: "bg-sky-50 text-sky-800 border-sky-300",
  published: "bg-emerald-50 text-emerald-800 border-emerald-400",
  updated: "bg-emerald-50 text-emerald-800 border-emerald-400",
  archived: "bg-slate-100 text-slate-500 border-slate-300"
};

export const STATUS_LABELS: Record<ContentStatus, string> = {
  draft: "Draft",
  in_editorial_review: "In editorial review",
  changes_requested: "Changes requested",
  in_legal_review: "In legal review",
  approved: "Approved",
  scheduled: "Scheduled",
  published: "Published",
  updated: "Updated",
  archived: "Archived"
};

export function StatusPill({ status }: { status: ContentStatus }) {
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wide ${STATUS_STYLES[status] ?? STATUS_STYLES.draft}`}
    >
      {STATUS_LABELS[status] ?? status}
    </span>
  );
}

export function Pill({ tone = "neutral", children }: { tone?: "neutral" | "warn" | "block" | "ok"; children: ReactNode }) {
  const styles: Record<string, string> = {
    neutral: "bg-slate-100 text-slate-700 border-slate-300",
    warn: "bg-amber-50 text-amber-800 border-amber-300",
    block: "bg-red-50 text-red-700 border-red-300",
    ok: "bg-emerald-50 text-emerald-800 border-emerald-300"
  };
  return (
    <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wide ${styles[tone]}`}>
      {children}
    </span>
  );
}

export function StatCard({ label, value, href }: { label: string; value: number | string; href?: string }) {
  const body = (
    <div className="rounded-md border border-slate-200 bg-white px-4 py-4 shadow-sm transition hover:border-navy">
      <p className="text-2xl font-black text-navy">{value}</p>
      <p className="mt-1 text-[11px] font-semibold uppercase tracking-wide text-slate-500">{label}</p>
    </div>
  );
  if (!href) return body;
  return (
    <a href={href} className="block">
      {body}
    </a>
  );
}

/**
 * Render media issues from validateMediaForPublication(). Blocking issues are shown as blocking —
 * never softened into a warning, because "unknown permission" and "no alt text" are the two mistakes
 * a publishing platform cannot afford to make quietly.
 */
export function MediaIssueList({ issues, compact = false }: { issues: MediaIssue[]; compact?: boolean }) {
  if (!issues.length) {
    return compact ? null : (
      <p className="text-xs font-semibold text-emerald-700">Ready to publish — no blocking issues.</p>
    );
  }

  const blocking = issues.filter((issue) => issue.severity === "block");
  const warnings = issues.filter((issue) => issue.severity === "warn");

  return (
    <div className="space-y-2">
      {blocking.length > 0 && (
        <div className="rounded-md border border-red-300 bg-red-50 px-3 py-2">
          <p className="text-[11px] font-black uppercase tracking-wide text-red-700">
            Blocks publication ({blocking.length})
          </p>
          <ul className="mt-1 list-disc space-y-1 pl-4">
            {blocking.map((issue) => (
              <li key={issue.code} className="text-xs leading-5 text-red-700">
                {issue.message}
              </li>
            ))}
          </ul>
        </div>
      )}
      {warnings.length > 0 && (
        <div className="rounded-md border border-amber-300 bg-amber-50 px-3 py-2">
          <p className="text-[11px] font-black uppercase tracking-wide text-amber-800">
            Warnings ({warnings.length})
          </p>
          <ul className="mt-1 list-disc space-y-1 pl-4">
            {warnings.map((issue) => (
              <li key={issue.code} className="text-xs leading-5 text-amber-800">
                {issue.message}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

export function formatDateTime(value: string | null | undefined): string {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit"
  });
}

export function humanize(value: string): string {
  return value.replace(/_/g, " ").replace(/\b\w/g, (char) => char.toUpperCase());
}
