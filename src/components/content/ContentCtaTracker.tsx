"use client";

import { useEffect } from "react";
import { trackFunnelEvent } from "@/lib/analytics/client";
import type { ContentSurface } from "@/components/content/brand";

/**
 * Click tracking for in-article CTAs.
 *
 * The renderer emits `<a class="content-cta-primary" href="…" data-cta-id="…">` and NEVER an inline
 * script or an onclick attribute — that is the whole point of the allowlisting renderer. So the only
 * safe way to instrument those links is from the outside: one delegated listener on the article
 * container, matching `a[data-cta-id]` via closest(). This survives any body markup the renderer can
 * produce, adds no per-link JS, and keeps the article HTML inert.
 *
 * Renders nothing. Fires `content_cta_clicked` with low-cardinality, public-safe meta only.
 */
export function ContentCtaTracker({
  containerId,
  articleSlug,
  surface
}: {
  containerId: string;
  articleSlug: string;
  surface: ContentSurface;
}) {
  useEffect(() => {
    const root = document.getElementById(containerId);
    if (!root) return;

    const onClick = (event: MouseEvent) => {
      const target = event.target;
      if (!(target instanceof Element)) return;

      const link = target.closest<HTMLAnchorElement>("a[data-cta-id]");
      if (!link || !root.contains(link)) return;

      const ctaId = link.getAttribute("data-cta-id");
      if (!ctaId) return;

      // Fire and forget: trackFunnelEvent uses sendBeacon and never throws, so navigation is never
      // delayed or blocked by analytics.
      trackFunnelEvent("content_cta_clicked", {
        cta_id: ctaId,
        article_slug: articleSlug,
        product_surface: surface
      });
    };

    root.addEventListener("click", onClick);
    return () => root.removeEventListener("click", onClick);
  }, [containerId, articleSlug, surface]);

  return null;
}
