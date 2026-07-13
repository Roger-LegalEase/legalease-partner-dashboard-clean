import Link from "next/link";

import { ArticleTable } from "@/components/content/admin/ArticleTable";
import { ContentDenied } from "@/components/content/admin/ContentDenied";
import { Panel, StatCard } from "@/components/content/admin/primitives";
import { resolveContentPageAccess } from "@/lib/content/auth";
import { listCmsPosts } from "@/lib/content/cms-queries";

export const dynamic = "force-dynamic";

export default async function PartnerStoriesPage() {
  // GATE FIRST.
  const access = await resolveContentPageAccess("/internal/content/partner-stories");

  if (access.kind === "denied") {
    return <ContentDenied title={access.title} body={access.body} />;
  }

  const posts = await listCmsPosts({
    contentTypes: ["partner_story", "partner_insight", "testimonial_story"]
  });

  const stories = posts.filter((post) => post.contentType === "partner_story");
  const live = posts.filter((post) => post.status === "published" || post.status === "updated");
  const partners = new Set(posts.map((post) => post.partnerSlug).filter(Boolean));

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-navy">Partner stories</h1>
          <p className="mt-1 max-w-3xl text-sm leading-6 text-slate-600">
            Partner stories, partner insights, and testimonial stories. A partner_contributor can only
            see and edit drafts belonging to their own organization — that scoping is enforced by row
            level security, not by this page.
          </p>
        </div>
        <Link
          href="/internal/content/articles/new"
          className="rounded-md bg-navy px-4 py-2 text-sm font-bold text-white transition hover:bg-navy-mid"
        >
          New story
        </Link>
      </header>

      <section className="grid gap-3 sm:grid-cols-3">
        <StatCard label="Total" value={posts.length} />
        <StatCard label="Partner stories" value={stories.length} />
        <StatCard label="Live" value={live.length} />
      </section>

      <Panel
        title="Stories"
        description={`${partners.size} partner organization${partners.size === 1 ? "" : "s"} represented.`}
      >
        <ArticleTable
          rows={posts}
          emptyMessage="No partner stories yet. Create one and set its content type to partner_story."
        />
      </Panel>
    </div>
  );
}
