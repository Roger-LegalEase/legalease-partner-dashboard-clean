import AuthorForm from "@/components/content/admin/AuthorForm";
import { ContentDenied } from "@/components/content/admin/ContentDenied";
import { EmptyState, Panel, Pill } from "@/components/content/admin/primitives";
import { resolveContentPageAccess } from "@/lib/content/auth";
import { isContentStorageConfigured, listCmsAuthors } from "@/lib/content/cms-queries";
import { roleHasCapability } from "@/lib/content/types";

export const dynamic = "force-dynamic";

export default async function AuthorsPage() {
  // GATE FIRST.
  const access = await resolveContentPageAccess("/internal/content/authors");

  if (access.kind === "denied") {
    return <ContentDenied title={access.title} body={access.body} />;
  }

  const authors = await listCmsAuthors();
  const configured = isContentStorageConfigured();
  const canManage = roleHasCapability(access.session.role, "taxonomy.manage");

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-3xl font-black text-navy">Authors</h1>
        <p className="mt-1 max-w-3xl text-sm leading-6 text-slate-600">
          Public bylines. An author is not a login: a byline can exist for someone who has no Supabase
          account, and a Supabase account is not automatically a byline.
        </p>
      </header>

      <Panel title="Add an author">
        <AuthorForm canManage={canManage} />
      </Panel>

      <Panel title={`Authors (${authors.length})`}>
        {authors.length === 0 ? (
          <EmptyState
            message="No authors yet."
            hint={configured ? "Add one above." : "Content storage is not configured in this environment."}
          />
        ) : (
          <ul className="divide-y divide-slate-200">
            {authors.map((author) => (
              <li key={author.authorId} className="flex flex-wrap items-start gap-3 py-3">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-bold text-navy">{author.name}</p>
                  <p className="font-mono text-[11px] text-slate-400">/{author.slug}</p>
                  {(author.title || author.organization) && (
                    <p className="mt-0.5 text-xs text-slate-600">
                      {[author.title, author.organization].filter(Boolean).join(" · ")}
                    </p>
                  )}
                  {author.bio && <p className="mt-1 text-xs leading-5 text-slate-600">{author.bio}</p>}
                </div>
                <Pill tone={author.isActive ? "ok" : "neutral"}>
                  {author.isActive ? "Active" : "Inactive"}
                </Pill>
              </li>
            ))}
          </ul>
        )}
      </Panel>
    </div>
  );
}
