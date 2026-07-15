/**
 * Related-content plumbing.
 *
 * The renderer refuses to let an editor supply link text for another article (that is how stale or
 * misleading titles get published), so a `relatedContent` block becomes an empty placeholder:
 *
 *     <div class="content-related" data-related-slugs="a,b,c"></div>
 *
 * The page reads the slugs back out, looks the posts up for real, and renders them from the live
 * records. We never inject HTML back into the rendered body string — the placeholder stays empty and
 * is hidden by `.content-related:empty` — because rewriting rendered HTML would reopen the injection
 * hole the renderer exists to close.
 */

const RELATED_ATTR = /data-related-slugs="([^"]*)"/g;
const SLUG_SHAPE = /^[a-z0-9][a-z0-9-]{0,95}$/;

/** Pull the related slugs out of a rendered article body. Order preserved, duplicates removed. */
export function extractRelatedSlugs(html: string, exclude?: string): string[] {
  const found: string[] = [];
  const seen = new Set<string>(exclude ? [exclude] : []);

  for (const match of html.matchAll(RELATED_ATTR)) {
    // The renderer HTML-escaped the attribute; `&amp;` is the only entity a slug list could carry.
    const raw = (match[1] ?? "").replace(/&amp;/g, "&");
    for (const part of raw.split(",")) {
      const slug = part.trim().toLowerCase();
      // Shape-check before it becomes a database lookup. A slug is a slug, never a path or a filter.
      if (!slug || seen.has(slug) || !SLUG_SHAPE.test(slug)) continue;
      seen.add(slug);
      found.push(slug);
    }
  }

  return found;
}
