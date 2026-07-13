import { ArticleTable } from "@/components/content/admin/ArticleTable";
import { ContentDenied } from "@/components/content/admin/ContentDenied";
import { Panel, StatCard } from "@/components/content/admin/primitives";
import { resolveContentPageAccess } from "@/lib/content/auth";
import { listScheduledPosts, type CmsPostSummary } from "@/lib/content/cms-queries";

export const dynamic = "force-dynamic";

/**
 * Posts whose publication time has passed while they are still sitting in `scheduled`. That means
 * either the scheduler did not run or the publish was refused — both are worth shouting about, so
 * this is surfaced rather than left for someone to notice.
 */
function selectOverdue(posts: CmsPostSummary[]): CmsPostSummary[] {
  const now = Date.now();
  return posts.filter((post) => post.scheduledFor && new Date(post.scheduledFor).getTime() < now);
}

export default async function ScheduledPage() {
  // GATE FIRST.
  const access = await resolveContentPageAccess("/internal/content/scheduled");

  if (access.kind === "denied") {
    return <ContentDenied title={access.title} body={access.body} />;
  }

  const scheduled = await listScheduledPosts();

  const overdue = selectOverdue(scheduled);
  const awaitingLegal = scheduled.filter((post) => post.legalSensitive && !post.legalApprovedAt);

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-3xl font-black text-navy">Scheduled</h1>
        <p className="mt-1 max-w-3xl text-sm leading-6 text-slate-600">
          The scheduler moves these to published at their publication time. Scheduling is not a way
          around legal review: a legally substantive post cannot even enter this queue without a
          recorded legal approval.
        </p>
      </header>

      <section className="grid gap-3 sm:grid-cols-3">
        <StatCard label="Scheduled" value={scheduled.length} />
        <StatCard label="Past their time" value={overdue.length} />
        <StatCard label="Missing legal approval" value={awaitingLegal.length} />
      </section>

      {overdue.length > 0 && (
        <div className="rounded-md border border-amber-300 bg-amber-50 px-4 py-3 text-sm leading-6 text-amber-800">
          <strong>
            {overdue.length} post{overdue.length === 1 ? "" : "s"} are past their scheduled time and are
            still not published.
          </strong>{" "}
          Either the scheduler has not run, or the publish was refused. Open one to see its workflow
          state.
        </div>
      )}

      {awaitingLegal.length > 0 && (
        <div className="rounded-md border border-red-300 bg-red-50 px-4 py-3 text-sm leading-6 text-red-700">
          <strong>
            {awaitingLegal.length} scheduled post{awaitingLegal.length === 1 ? "" : "s"} are marked
            legally sensitive with no recorded legal approval.
          </strong>{" "}
          This should be impossible — the workflow and the database both refuse it. Investigate before
          the publication time.
        </div>
      )}

      <Panel title="Scheduled queue">
        <ArticleTable rows={scheduled} showSchedule emptyMessage="Nothing is scheduled." />
      </Panel>
    </div>
  );
}
