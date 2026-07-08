import type { MetadataRoute } from "next";
import { productionExpungementAiUrl } from "@/lib/app-url";
import { listStateLandingSlugs } from "@/lib/expungement-ai/state-landing/state-landing-data";

/**
 * Code-generated sitemap for the Expungement.ai consumer surface, served at /sitemap.xml.
 *
 * Scope note: this deployment serves several domains from one app. This sitemap intentionally lists
 * only the public expungement.ai URLs (all absolute), because those are the pages meant to be
 * indexed for consumer growth. The state landing pages are included here so search engines can
 * discover all 50 states + DC.
 */
export default function sitemap(): MetadataRoute.Sitemap {
  const base = productionExpungementAiUrl;

  const corePaths = ["/", "/start", "/how-it-works", "/pricing"];
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

  return [...core, ...states];
}
