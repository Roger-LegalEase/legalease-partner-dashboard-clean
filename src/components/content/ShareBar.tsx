"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Check, Link2 } from "lucide-react";
import { trackFunnelEvent } from "@/lib/analytics/client";
import { brandFor, type ContentSurface } from "@/components/content/brand";

/**
 * Share controls for an article.
 *
 * Analytics note: every meta key here is deliberately chosen against the forbidden-fragment
 * blocklist in src/lib/analytics/sanitize.ts, which DROPS any key whose normalized form contains
 * "name", "record", "case", "answer", "ip", etc. So: `article_slug`, never `article_name`;
 * `channel`, never `description`. A dropped key fails silently, which is exactly the kind of bug
 * that goes unnoticed for months — hence this comment.
 */

type ShareChannel = "linkedin" | "x" | "facebook";

const CHANNEL_LABELS: Record<ShareChannel, string> = {
  linkedin: "Share on LinkedIn",
  x: "Share on X",
  facebook: "Share on Facebook"
};

function shareUrlFor(channel: ShareChannel, url: string, title: string): string {
  const encodedUrl = encodeURIComponent(url);
  const encodedTitle = encodeURIComponent(title);
  switch (channel) {
    case "linkedin":
      return `https://www.linkedin.com/sharing/share-offsite/?url=${encodedUrl}`;
    case "x":
      return `https://x.com/intent/post?url=${encodedUrl}&text=${encodedTitle}`;
    case "facebook":
      return `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`;
  }
}

export function ShareBar({
  url,
  title,
  articleSlug,
  surface
}: {
  url: string;
  title: string;
  articleSlug: string;
  surface: ContentSurface;
}) {
  const brand = brandFor(surface);
  const [copied, setCopied] = useState(false);
  const copyTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (copyTimer.current) clearTimeout(copyTimer.current);
    };
  }, []);

  const share = useCallback(
    (channel: ShareChannel) => {
      trackFunnelEvent("content_share_clicked", {
        article_slug: articleSlug,
        product_surface: surface,
        channel
      });
      window.open(shareUrlFor(channel, url, title), "_blank", "noopener,noreferrer,width=600,height=640");
    },
    [articleSlug, surface, title, url]
  );

  const copyLink = useCallback(async () => {
    trackFunnelEvent("content_link_copied", {
      article_slug: articleSlug,
      product_surface: surface
    });

    try {
      await navigator.clipboard.writeText(url);
    } catch {
      // Clipboard can be unavailable (insecure context, permissions). Fall back to a selection copy
      // so the control still does something useful rather than appearing broken.
      const field = document.createElement("textarea");
      field.value = url;
      field.setAttribute("readonly", "");
      field.style.position = "fixed";
      field.style.opacity = "0";
      document.body.appendChild(field);
      field.select();
      try {
        document.execCommand("copy");
      } catch {
        /* nothing more we can do; leave the UI unchanged */
        document.body.removeChild(field);
        return;
      }
      document.body.removeChild(field);
    }

    setCopied(true);
    if (copyTimer.current) clearTimeout(copyTimer.current);
    copyTimer.current = setTimeout(() => setCopied(false), 2000);
  }, [articleSlug, surface, url]);

  const buttonBase =
    surface === "expungement_ai"
      ? `inline-flex h-11 w-11 items-center justify-center rounded-[12px] border border-[#ECEFF4] bg-white text-[#5A6275] transition hover:border-[#00A99D] hover:text-[#0B1320] ${brand.cls.focus}`
      : `inline-flex h-11 w-11 items-center justify-center rounded-[2px] border border-[#DCDCE6] bg-white text-[#54546B] transition hover:border-[#1F8F88] hover:text-[#101046] ${brand.cls.focus}`;

  return (
    <div className="flex items-center gap-2" role="group" aria-label="Share this article">
      {(Object.keys(CHANNEL_LABELS) as ShareChannel[]).map((channel) => (
        <button
          key={channel}
          type="button"
          onClick={() => share(channel)}
          className={buttonBase}
          aria-label={CHANNEL_LABELS[channel]}
          title={CHANNEL_LABELS[channel]}
        >
          {channel === "linkedin" ? <LinkedInMark /> : channel === "facebook" ? <FacebookMark /> : <XMark />}
        </button>
      ))}

      <button
        type="button"
        onClick={copyLink}
        className={buttonBase}
        aria-label={copied ? "Link copied" : "Copy link"}
        title={copied ? "Link copied" : "Copy link"}
      >
        {copied ? (
          <Check className="h-[18px] w-[18px] text-[#1F8F88]" aria-hidden="true" />
        ) : (
          <Link2 className="h-[18px] w-[18px]" aria-hidden="true" />
        )}
      </button>

      {/* Announce the copy result to screen readers without moving focus. */}
      <span aria-live="polite" className="sr-only">
        {copied ? "Link copied to clipboard" : ""}
      </span>
    </div>
  );
}

/**
 * Brand glyphs. lucide-react dropped its brand icons, so these are inlined rather than pulling in a
 * second icon dependency for three paths. Each is decorative — the accessible name lives on the
 * button (aria-label), so every glyph is aria-hidden and not focusable.
 */
function XMark() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4 fill-current" aria-hidden="true" focusable="false">
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
  );
}

function LinkedInMark() {
  return (
    <svg viewBox="0 0 24 24" className="h-[18px] w-[18px] fill-current" aria-hidden="true" focusable="false">
      <path d="M20.45 20.45h-3.55v-5.57c0-1.33-.02-3.03-1.85-3.03-1.85 0-2.13 1.45-2.13 2.94v5.66H9.36V9h3.41v1.56h.05c.47-.9 1.63-1.85 3.37-1.85 3.6 0 4.27 2.37 4.27 5.46v6.28zM5.34 7.43a2.06 2.06 0 1 1 0-4.12 2.06 2.06 0 0 1 0 4.12zM7.12 20.45H3.55V9h3.57v11.45zM22.22 0H1.77C.79 0 0 .77 0 1.72v20.56C0 23.23.79 24 1.77 24h20.45c.98 0 1.78-.77 1.78-1.72V1.72C24 .77 23.2 0 22.22 0z" />
    </svg>
  );
}

function FacebookMark() {
  return (
    <svg viewBox="0 0 24 24" className="h-[18px] w-[18px] fill-current" aria-hidden="true" focusable="false">
      <path d="M24 12.07C24 5.4 18.63 0 12 0S0 5.4 0 12.07C0 18.1 4.39 23.1 10.13 24v-8.44H7.08v-3.49h3.05V9.41c0-3.02 1.79-4.69 4.53-4.69 1.31 0 2.68.24 2.68.24v2.97h-1.51c-1.49 0-1.96.93-1.96 1.89v2.25h3.33l-.53 3.49h-2.8V24C19.61 23.1 24 18.1 24 12.07z" />
    </svg>
  );
}
