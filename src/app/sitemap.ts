import type { MetadataRoute } from "next";
import { productionExpungementAiUrl } from "@/lib/app-url";
import { listStateLandingSlugs } from "@/lib/expungement-ai/state-landing/state-landing-data";
import { listPublishedSlugs } from "@/lib/content/repository";
import { listPublishableJurisdictionSlugs } from "@/lib/content/state-resources";

/**
 * Code-generated sitemap for the Expungement.ai consumer surface, served at /sitemap.xml.
 *
 * Scope note: this deployment serves several domains from one app. This sitemap intentionally lists
 * only the public expungement.ai URLs (all absolute), because those are the pages meant to be
 * indexed for consumer growth. The state landing pages are included here so search engines can
 * discover all 50 states + DC.
 *
 * The partner surface (legaleasepartner.com) is deliberately NOT listed: a sitemap may only contain
 * URLs on its own host, and mixing hosts here would invalidate the whole document. The partner pages
 * are discoverable through the partner site's own navigation.
 *
 * Async because published posts come from the database. When Supabase is unconfigured (a bare CI
 * build), listPublishedSlugs returns [] and the sitemap degrades to the static routes rather than
 * failing the build.
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = productionExpungementAiUrl;

  const corePaths = ["/", "/start", "/how-it-works", "/pricing", "/blog", "/resources"];
  const core: MetadataRoute.Sitemap = corePaths.map((p) => ({
    url: `${base}${p === "/" ? "" : p}`,
    changeFrequency: "weekly",
    priority: p === "/" ? 1 : 0.7
  }));

  const states: MetadataRoute.Sitemap = listStateLandingSlugs().map((slug) => ({
    url: `${base}/states/${slug}`,
    changeFrequency: "monthly",
    priority: 0.8
  }));

  // Per-state resource pages — only the jurisdictions the promotion manifest has approved for live.
  const resources: MetadataRoute.Sitemap = listPublishableJurisdictionSlugs().map((slug) => ({
    url: `${base}/resources/${slug}`,
    changeFrequency: "monthly",
    priority: 0.8
  }));

  const posts = await listPublishedSlugs("expungement_ai");
  const articles: MetadataRoute.Sitemap = posts.map((post) => ({
    url: `${base}/blog/${post.slug}`,
    lastModified: new Date(post.updatedAt ?? post.publishedAt),
    changeFrequency: "monthly",
    priority: 0.6
  }));

  return [...core, ...states, ...resources, ...articles];
}
