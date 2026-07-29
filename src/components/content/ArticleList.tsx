import { ArticleCard } from "@/components/content/ArticleCard";
import { brandFor, type ContentSurface } from "@/components/content/brand";
import type { PublicArticle } from "@/lib/content/types";

/**
 * An index listing.
 *
 * RESILIENCE: Supabase can be unconfigured (no env at build time), in which case the repository
 * returns an empty array rather than throwing. An index page must then render an honest empty state
 * — never a crash, and never invented placeholder articles. `emptyMessage` is the copy for that.
 *
 * The first article gets the `lead` treatment only when there are enough others to make a hierarchy
 * meaningful; a lone article rendered as a giant lead card looks like a mistake.
 */
export function ArticleList({
  articles,
  surface,
  emptyTitle = "Nothing published yet",
  emptyMessage = "New articles will appear here as they are published.",
  featureFirst = true
}: {
  articles: PublicArticle[];
  surface: ContentSurface;
  emptyTitle?: string;
  emptyMessage?: string;
  featureFirst?: boolean;
}) {
  const brand = brandFor(surface);

  if (!articles.length) {
    return (
      <div className={`${brand.cls.card} px-6 py-14 text-center`}>
        <h2 className={`${brand.cls.subheading} text-[18px]`}>{emptyTitle}</h2>
        <p className={`mx-auto mt-2 max-w-md text-[15px] leading-7 ${brand.cls.muted}`}>{emptyMessage}</p>
      </div>
    );
  }

  const useLead = featureFirst && articles.length >= 3;
  const [lead, ...rest] = useLead ? articles : [];
  const grid = useLead ? rest : articles;

  return (
    <div className="grid gap-6">
      {lead ? <ArticleCard article={lead} surface={surface} variant="lead" /> : null}
      {grid.length ? (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {grid.map((article) => (
            <ArticleCard key={article.slug} article={article} surface={surface} />
          ))}
        </div>
      ) : null}
    </div>
  );
}
