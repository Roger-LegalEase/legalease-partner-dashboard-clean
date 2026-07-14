import { absoluteExpungementAiUrl, absolutePartnerAppUrl } from "@/lib/app-url";
import type { ContentDestination, PublicAuthor } from "@/lib/content/types";

/**
 * SEO helpers for the public content surfaces (isomorphic — no server-only import, so metadata
 * builders, page components, and the RSS routes can all share one definition of a canonical URL).
 *
 * Structured-data policy: articles are typed as schema.org `Article` and the publisher as a plain
 * `Organization`. We deliberately never emit `LegalService`, `Attorney`, `GovernmentService`, or
 * FAQ answers carrying legal conclusions — the same restraint the live state landing pages apply —
 * so the markup can never imply LegalEase is a law firm or an official agency.
 *
 * Article pages assemble their own `Article` + `BreadcrumbList` graphs from the node builders below
 * rather than receiving a finished blob. That is deliberate: each page states, in its own source,
 * exactly what it publishes about itself (headline, datePublished, dateModified, breadcrumb trail),
 * which is both easier to audit and what scripts/verify-content-routes.mjs checks.
 */

export type JsonLdNode = Record<string, unknown>;

/** Absolute URL on the destination's own public domain. */
export function absoluteContentUrl(surface: ContentDestination, path: string): string {
  return surface === "expungement_ai" ? absoluteExpungementAiUrl(path) : absolutePartnerAppUrl(path);
}

export function siteNameFor(surface: ContentDestination): string {
  return surface === "expungement_ai" ? "Expungement.ai" : "LegalEase Partner";
}

/** schema.org Person for a byline, or the publishing Organization when a post has no author. */
export function authorJsonLdNode(author: PublicAuthor | null, surface: ContentDestination): JsonLdNode {
  if (!author) {
    return publisherJsonLdNode(surface);
  }

  const node: JsonLdNode = {
    "@type": "Person",
    name: author.name,
    url: absoluteContentUrl(surface, `/authors/${author.slug}`)
  };
  if (author.title) node.jobTitle = author.title;
  if (author.organization) {
    node.affiliation = { "@type": "Organization", name: author.organization };
  }
  return node;
}

export function publisherJsonLdNode(surface: ContentDestination): JsonLdNode {
  return {
    "@type": "Organization",
    name: siteNameFor(surface),
    url: absoluteContentUrl(surface, "/")
  };
}

/** The itemListElement array for a BreadcrumbList. Paths are public paths on the surface's domain. */
export function breadcrumbItems(
  surface: ContentDestination,
  crumbs: { name: string; path: string }[]
): JsonLdNode[] {
  return crumbs.map((crumb, index) => ({
    "@type": "ListItem",
    position: index + 1,
    name: crumb.name,
    item: absoluteContentUrl(surface, crumb.path)
  }));
}

/** Complete BreadcrumbList graph — for index, author, and resource pages. */
export function buildBreadcrumbJsonLd(
  surface: ContentDestination,
  crumbs: { name: string; path: string }[]
): JsonLdNode {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: breadcrumbItems(surface, crumbs)
  };
}

/** ProfilePage markup for an author page. */
export function buildAuthorJsonLd(
  author: PublicAuthor,
  surface: ContentDestination,
  canonical: string
): JsonLdNode {
  return {
    "@context": "https://schema.org",
    "@type": "ProfilePage",
    url: canonical,
    mainEntity: authorJsonLdNode(author, surface)
  };
}

/** CollectionPage markup for an index (blog, insights, partner stories, resource directory). */
export function buildCollectionJsonLd(options: {
  surface: ContentDestination;
  name: string;
  description: string;
  canonical: string;
  items: { title: string; path: string }[];
}): JsonLdNode {
  return {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: options.name,
    description: options.description,
    url: options.canonical,
    isPartOf: {
      "@type": "WebSite",
      name: siteNameFor(options.surface),
      url: absoluteContentUrl(options.surface, "/")
    },
    mainEntity: {
      "@type": "ItemList",
      itemListElement: options.items.map((item, index) => ({
        "@type": "ListItem",
        position: index + 1,
        name: item.title,
        url: absoluteContentUrl(options.surface, item.path)
      }))
    }
  };
}
