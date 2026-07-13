import Link from "next/link";

import { ArticleTable } from "@/components/content/admin/ArticleTable";
import { ContentDenied } from "@/components/content/admin/ContentDenied";
import { Panel, humanize } from "@/components/content/admin/primitives";
import { resolveContentPageAccess } from "@/lib/content/auth";
import { listCmsPosts } from "@/lib/content/cms-queries";
import {
  CONTENT_DESTINATIONS,
  CONTENT_STATUSES,
  CONTENT_TYPES,
  isContentDestination,
  isContentStatus,
  isContentType
} from "@/lib/content/types";

export const dynamic = "force-dynamic";

type SearchParams = Promise<{ destination?: string; status?: string; type?: string }>;

export default async function ArticlesPage({ searchParams }: { searchParams: SearchParams }) {
  // GATE FIRST — before the filters are even read.
  const access = await resolveContentPageAccess("/internal/content/articles");

  if (access.kind === "denied") {
    return <ContentDenied title={access.title} body={access.body} />;
  }

  const params = await searchParams;
  const destination = isContentDestination(params.destination) ? params.destination : null;
  const status = isContentStatus(params.status) ? params.status : null;
  const contentType = isContentType(params.type) ? params.type : null;

  const posts = await listCmsPosts({ destination, status, contentType });

  const filterHref = (patch: Record<string, string | null>) => {
    const query = new URLSearchParams();
    const merged = {
      destination: destination ?? null,
      status: status ?? null,
      type: contentType ?? null,
      ...patch
    };
    for (const [key, value] of Object.entries(merged)) {
      if (value) query.set(key, value);
    }
    const search = query.toString();
    return search ? `/internal/content/articles?${search}` : "/internal/content/articles";
  };

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-navy">Articles</h1>
          <p className="mt-1 text-sm text-slate-600">
            {posts.length} article{posts.length === 1 ? "" : "s"} match this filter.
          </p>
        </div>
        <Link
          href="/internal/content/articles/new"
          className="rounded-md bg-navy px-4 py-2 text-sm font-bold text-white transition hover:bg-navy-mid"
        >
          New article
        </Link>
      </header>

      <Panel title="Filters">
        <div className="space-y-3">
          <FilterRow label="Destination">
            <FilterChip href={filterHref({ destination: null })} active={!destination} label="All" />
            {CONTENT_DESTINATIONS.map((option) => (
              <FilterChip
                key={option}
                href={filterHref({ destination: option })}
                active={destination === option}
                label={option === "expungement_ai" ? "Expungement.ai" : "Partner"}
              />
            ))}
          </FilterRow>

          <FilterRow label="Status">
            <FilterChip href={filterHref({ status: null })} active={!status} label="All" />
            {CONTENT_STATUSES.map((option) => (
              <FilterChip
                key={option}
                href={filterHref({ status: option })}
                active={status === option}
                label={humanize(option)}
              />
            ))}
          </FilterRow>

          <FilterRow label="Type">
            <FilterChip href={filterHref({ type: null })} active={!contentType} label="All" />
            {CONTENT_TYPES.map((option) => (
              <FilterChip
                key={option}
                href={filterHref({ type: option })}
                active={contentType === option}
                label={humanize(option)}
              />
            ))}
          </FilterRow>
        </div>
      </Panel>

      <Panel>
        <ArticleTable rows={posts} />
      </Panel>
    </div>
  );
}

function FilterRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="w-24 text-[11px] font-black uppercase tracking-wide text-slate-500">{label}</span>
      {children}
    </div>
  );
}

function FilterChip({ href, active, label }: { href: string; active: boolean; label: string }) {
  return (
    <Link
      href={href}
      className={`rounded-full border px-3 py-1 text-[11px] font-bold transition ${
        active
          ? "border-navy bg-navy text-white"
          : "border-slate-300 bg-white text-slate-600 hover:border-navy"
      }`}
    >
      {label}
    </Link>
  );
}
