import Link from "next/link";

import { ContentDenied } from "@/components/content/admin/ContentDenied";
import {
  EmptyState,
  Panel,
  StatCard,
  StatusPill,
  formatDateTime,
  humanize
} from "@/components/content/admin/primitives";
import { resolveContentPageAccess } from "@/lib/content/auth";
import {
  countPostsByStatus,
  isContentStorageConfigured,
  listRecentActivity,
  listReviewQueues,
  listScheduledPosts
} from "@/lib/content/cms-queries";

export const dynamic = "force-dynamic";

export default async function ContentDashboardPage() {
  // GATE FIRST. Nothing below this line runs for an unauthorized caller.
  const access = await resolveContentPageAccess("/internal/content");

  if (access.kind === "denied") {
    return <ContentDenied title={access.title} body={access.body} />;
  }

  const configured = isContentStorageConfigured();
  const [counts, scheduled, queues, activity] = await Promise.all([
    countPostsByStatus(),
    listScheduledPosts(),
    listReviewQueues(),
    listRecentActivity(15)
  ]);

  const totalDrafts = counts.draft + counts.changes_requested;
  const totalLive = counts.published + counts.updated;

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-navy">Content dashboard</h1>
          <p className="mt-1 text-sm text-slate-600">
            Signed in as <strong>{humanize(access.session.role)}</strong>
            {access.session.partnerSlug ? ` · ${access.session.partnerSlug}` : ""}.
          </p>
        </div>
        <Link
          href="/internal/content/articles/new"
          className="rounded-md bg-navy px-4 py-2 text-sm font-bold text-white transition hover:bg-navy-mid"
        >
          New article
        </Link>
      </header>

      {!configured && (
        <div className="rounded-md border border-amber-300 bg-amber-50 px-4 py-3 text-sm leading-6 text-amber-800">
          <strong>Content storage is not configured in this environment.</strong> Every count below is
          zero because there is nothing to read, not because there is nothing there. Set the Supabase
          environment variables to connect.
        </div>
      )}

      <section className="grid gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <StatCard label="Drafts" value={totalDrafts} href="/internal/content/articles?status=draft" />
        <StatCard
          label="Editorial review"
          value={counts.in_editorial_review}
          href="/internal/content/reviews"
        />
        <StatCard label="Legal review" value={counts.in_legal_review} href="/internal/content/reviews" />
        <StatCard label="Approved" value={counts.approved} href="/internal/content/articles?status=approved" />
        <StatCard label="Scheduled" value={counts.scheduled} href="/internal/content/scheduled" />
        <StatCard label="Live" value={totalLive} href="/internal/content/articles?status=published" />
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        <Panel
          title="Review queue"
          description="Editorial and legal review are separate decisions and are never merged."
          actions={
            <Link href="/internal/content/reviews" className="text-xs font-bold text-navy underline">
              Open queues
            </Link>
          }
        >
          {queues.editorial.length + queues.legal.length === 0 ? (
            <EmptyState message="Nothing is waiting for review." />
          ) : (
            <ul className="divide-y divide-slate-200">
              {[...queues.legal, ...queues.editorial].slice(0, 8).map((post) => (
                <li key={post.postId} className="flex items-center gap-3 py-2">
                  <StatusPill status={post.status} />
                  <Link
                    href={`/internal/content/articles/${post.postId}`}
                    className="min-w-0 flex-1 truncate text-sm font-semibold text-navy hover:underline"
                  >
                    {post.title}
                  </Link>
                  <span className="text-xs text-slate-500">{formatDateTime(post.updatedAt)}</span>
                </li>
              ))}
            </ul>
          )}
        </Panel>

        <Panel
          title="Scheduled queue"
          description="The scheduler publishes these. Scheduling never skips legal review."
          actions={
            <Link href="/internal/content/scheduled" className="text-xs font-bold text-navy underline">
              Open
            </Link>
          }
        >
          {scheduled.length === 0 ? (
            <EmptyState message="Nothing is scheduled." />
          ) : (
            <ul className="divide-y divide-slate-200">
              {scheduled.slice(0, 8).map((post) => (
                <li key={post.postId} className="flex items-center gap-3 py-2">
                  <Link
                    href={`/internal/content/articles/${post.postId}`}
                    className="min-w-0 flex-1 truncate text-sm font-semibold text-navy hover:underline"
                  >
                    {post.title}
                  </Link>
                  <span className="text-xs font-bold text-sky-800">
                    {formatDateTime(post.scheduledFor)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>

      <Panel
        title="Recent activity"
        description="Append-only audit trail. Every approval, publication, and promotion is recorded."
      >
        {activity.length === 0 ? (
          <EmptyState
            message="No recorded activity."
            hint={configured ? "Activity appears here as soon as content moves." : "Storage is not configured."}
          />
        ) : (
          <ul className="divide-y divide-slate-200">
            {activity.map((event, index) => (
              <li key={`${event.entityId}-${index}`} className="flex flex-wrap items-center gap-3 py-2">
                <span className="rounded-full border border-slate-300 bg-slate-50 px-2 py-0.5 text-[11px] font-bold uppercase tracking-wide text-slate-600">
                  {humanize(event.action)}
                </span>
                <span className="text-sm text-slate-700">{humanize(event.entityType)}</span>
                {event.actorRole && (
                  <span className="text-xs text-slate-500">by {humanize(event.actorRole)}</span>
                )}
                <span className="ml-auto text-xs text-slate-500">{formatDateTime(event.createdAt)}</span>
              </li>
            ))}
          </ul>
        )}
      </Panel>
    </div>
  );
}
