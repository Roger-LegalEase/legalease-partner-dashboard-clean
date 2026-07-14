import Link from "next/link";

import CreateArticleForm from "@/components/content/admin/CreateArticleForm";
import { ContentDenied } from "@/components/content/admin/ContentDenied";
import { resolveContentPageAccess } from "@/lib/content/auth";
import { listCmsAuthors } from "@/lib/content/cms-queries";
import { listPublishableJurisdictions } from "@/lib/content/state-resources";
import { roleHasCapability } from "@/lib/content/types";

export const dynamic = "force-dynamic";

export default async function NewArticlePage() {
  // GATE FIRST.
  const access = await resolveContentPageAccess("/internal/content/articles/new");

  if (access.kind === "denied") {
    return <ContentDenied title={access.title} body={access.body} />;
  }

  const authors = await listCmsAuthors();
  const jurisdictions = listPublishableJurisdictions();
  const canCreate = roleHasCapability(access.session.role, "content.create");

  return (
    <div className="space-y-6">
      <header>
        <Link href="/internal/content/articles" className="text-xs font-bold text-navy underline">
          ← Articles
        </Link>
        <h1 className="mt-2 text-3xl font-black text-navy">New article</h1>
        <p className="mt-1 text-sm text-slate-600">
          Create the shell, then write it in the editor. Nothing is public until it has been through
          the workflow.
        </p>
      </header>

      <CreateArticleForm
        canCreate={canCreate}
        authors={authors.filter((author) => author.isActive).map((author) => ({
          authorId: author.authorId,
          name: author.name
        }))}
        jurisdictions={jurisdictions.map((item) => ({ code: item.code, name: item.name }))}
      />
    </div>
  );
}
