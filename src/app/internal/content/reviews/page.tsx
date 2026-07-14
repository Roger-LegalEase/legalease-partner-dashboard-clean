import { ArticleTable } from "@/components/content/admin/ArticleTable";
import { ContentDenied } from "@/components/content/admin/ContentDenied";
import { Panel, StatCard } from "@/components/content/admin/primitives";
import { resolveContentPageAccess } from "@/lib/content/auth";
import { listReviewQueues } from "@/lib/content/cms-queries";
import { roleHasCapability } from "@/lib/content/types";

export const dynamic = "force-dynamic";

export default async function ReviewsPage() {
  // GATE FIRST.
  const access = await resolveContentPageAccess("/internal/content/reviews");

  if (access.kind === "denied") {
    return <ContentDenied title={access.title} body={access.body} />;
  }

  const queues = await listReviewQueues();
  const role = access.session.role;
  const canEditorialApprove = roleHasCapability(role, "content.editorial_approve");
  const canLegalApprove = roleHasCapability(role, "content.legal_approve");

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-3xl font-black text-navy">Review queues</h1>
        <p className="mt-1 max-w-3xl text-sm leading-6 text-slate-600">
          Editorial review and legal review are separate decisions with separate reviewers, and they
          are not interchangeable. Legally substantive content cannot reach a published state without a
          recorded legal approval — the workflow refuses it, and so does a database constraint
          underneath.
        </p>
      </header>

      <section className="grid gap-3 sm:grid-cols-3">
        <StatCard label="Editorial review" value={queues.editorial.length} />
        <StatCard label="Legal review" value={queues.legal.length} />
        <StatCard label="Changes requested" value={queues.changesRequested.length} />
      </section>

      <Panel
        title="Legal review queue"
        description={
          canLegalApprove
            ? "You can approve content out of legal review. Open an article to record the decision."
            : `Read-only for the ${role.replace(/_/g, " ")} role — only a legal reviewer or the primary admin can approve out of legal review.`
        }
      >
        <ArticleTable rows={queues.legal} emptyMessage="Nothing is waiting for legal review." />
      </Panel>

      <Panel
        title="Editorial review queue"
        description={
          canEditorialApprove
            ? "You can approve or request changes on these."
            : `Read-only for the ${role.replace(/_/g, " ")} role.`
        }
      >
        <ArticleTable rows={queues.editorial} emptyMessage="Nothing is waiting for editorial review." />
      </Panel>

      <Panel
        title="Changes requested"
        description="Sent back to the author. These are not blocked — they are waiting on a rewrite."
      >
        <ArticleTable rows={queues.changesRequested} emptyMessage="No articles have changes requested." />
      </Panel>
    </div>
  );
}
