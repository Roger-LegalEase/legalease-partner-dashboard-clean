import type { MetadataRoute } from "next";
import { productionExpungementAiUrl } from "@/lib/app-url";

/**
 * robots.txt for the public surfaces.
 *
 * Disallows every non-public surface rather than relying on obscurity:
 *   /internal  — the CMS and the internal admin tools (the CMS layout is also noindex).
 *   /api       — nothing there is a page.
 *   /briefcase — a signed-in consumer's own documents.
 *   /partner/dashboard, /dashboard — signed-in partner surfaces.
 *   /auth      — sign-in / password-reset flows; indexing them is pure downside.
 *
 * The sitemap URL is the expungement.ai one on purpose: src/app/sitemap.ts lists only expungement.ai
 * URLs (a sitemap may not mix hosts), so pointing at it from any host is still correct and
 * unambiguous.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: [
          "/internal",
          "/internal/",
          "/api/",
          "/briefcase",
          "/briefcase/",
          "/dashboard/",
          "/partner/dashboard",
          "/auth/",
          "/sign-in",
          "/sign-out"
        ]
      }
    ],
    sitemap: `${productionExpungementAiUrl}/sitemap.xml`
  };
}
