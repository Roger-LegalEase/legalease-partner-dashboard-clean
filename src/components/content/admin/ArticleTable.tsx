import Link from "next/link";

import type { ContentDestination, ContentStatus, ContentType } from "@/lib/content/types";
import { EmptyState, StatusPill, formatDateTime, humanize } from "./primitives";

/**
 * The article table, shared by the article list, partner stories, reviews, and the scheduled queue.
 * Presentational only — every caller has already gated and fetched.
 */

export type ArticleTableRow = {
  postId: string;
  title: string;
  slug: string;
  destination: ContentDestination;
  contentType: ContentType;
  status: ContentStatus;
  authorName: string | null;
  legalSensitive: boolean;
  legalApprovedAt: string | null;
  scheduledFor: string | null;
  updatedAt: string | null;
};

const DESTINATION_LABELS: Record<ContentDestination, string> = {
  expungement_ai: "Expungement.ai",
  legalease_partner: "Partner"
};

export function ArticleTable({
  rows,
  emptyMessage = "No articles match this filter.",
  showSchedule = false
}: {
  rows: ArticleTableRow[];
  emptyMessage?: string;
  showSchedule?: boolean;
}) {
  if (!rows.length) {
    return <EmptyState message={emptyMessage} />;
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[52rem] border-collapse text-left">
        <thead>
          <tr className="border-b border-slate-200 text-[11px] font-black uppercase tracking-wide text-slate-500">
            <th className="py-2 pr-3">Title</th>
            <th className="py-2 pr-3">Status</th>
            <th className="py-2 pr-3">Destination</th>
            <th className="py-2 pr-3">Type</th>
            <th className="py-2 pr-3">Author</th>
            <th className="py-2 pr-3">{showSchedule ? "Scheduled" : "Updated"}</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-200">
          {rows.map((row) => (
            <tr key={row.postId} className="align-top hover:bg-slate-50">
              <td className="py-3 pr-3">
                <Link
                  href={`/internal/content/articles/${row.postId}`}
                  className="text-sm font-bold text-navy hover:underline"
                >
                  {row.title || "Untitled"}
                </Link>
                <p className="mt-0.5 font-mono text-[11px] text-slate-400">/{row.slug}</p>
                {row.legalSensitive && (
                  <span
                    className={`mt-1 inline-block rounded-full border px-2 py-0.5 text-[10px] font-black uppercase ${
                      row.legalApprovedAt
                        ? "border-emerald-400 bg-emerald-50 text-emerald-800"
                        : "border-indigo-300 bg-indigo-50 text-indigo-800"
                    }`}
                  >
                    {row.legalApprovedAt ? "Legal approved" : "Legal review required"}
                  </span>
                )}
              </td>
              <td className="py-3 pr-3">
                <StatusPill status={row.status} />
              </td>
              <td className="py-3 pr-3 text-xs text-slate-600">{DESTINATION_LABELS[row.destination]}</td>
              <td className="py-3 pr-3 text-xs text-slate-600">{humanize(row.contentType)}</td>
              <td className="py-3 pr-3 text-xs text-slate-600">{row.authorName ?? "—"}</td>
              <td className="py-3 pr-3 text-xs text-slate-500">
                {formatDateTime(showSchedule ? row.scheduledFor : row.updatedAt)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
