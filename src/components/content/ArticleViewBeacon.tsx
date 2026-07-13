import { FunnelBeacon } from "@/components/analytics/FunnelBeacon";
import type { ContentSurface } from "@/components/content/brand";
import type { ContentType } from "@/lib/content/types";

/**
 * Fires `content_article_viewed` once when an article page mounts.
 *
 * Thin wrapper over the existing FunnelBeacon pattern (src/components/analytics/FunnelBeacon.tsx) so
 * an article page stays a server component: FunnelBeacon is the client boundary, this is not.
 *
 * Meta is low-cardinality and public-safe by construction — a slug, a surface, a content type. Note
 * the key names dodge the sanitizer's forbidden-fragment blocklist (no "name", no "record").
 */
export function ArticleViewBeacon({
  articleSlug,
  surface,
  contentType
}: {
  articleSlug: string;
  surface: ContentSurface;
  contentType: ContentType;
}) {
  return (
    <FunnelBeacon
      event="content_article_viewed"
      meta={{ article_slug: articleSlug, product_surface: surface, content_type: contentType }}
    />
  );
}
