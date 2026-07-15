import type { ContentDestination, ContentType } from "@/lib/content/types";

/**
 * Surface brand tokens for the shared content platform.
 *
 * One set of components serves two public destinations whose visual languages must stay clearly
 * DIFFERENT: Expungement.ai is warm, rounded and consumer (14px radii, orange #FF3B00); LegalEase
 * Partner is sharp, institutional and B2B (2px radii, navy #101046, 17px body).
 *
 * Two rules this module exists to enforce:
 *
 *  1. NO RUNTIME-ASSEMBLED TAILWIND CLASSES. Tailwind's JIT only emits CSS for class strings it can
 *     see literally in the source, so `bg-[${brand.accent}]` produces nothing. Every class below is
 *     a complete literal string. The raw hexes are exported separately for inline styles and for
 *     places where a literal class will not do (e.g. an SVG fill or a JSON-LD/theme color).
 *  2. NO PHANTOM TAILWIND COLORS. tailwind.config.ts defines only navy/navy-mid/orange/teal/cream —
 *     `grayWilma-*`, `wilmaBlue` and `danger` do not exist and silently emit no CSS. Everything here
 *     uses the inline-hex convention the live consumer pages already use.
 */

export type ContentSurface = ContentDestination;

export type SurfaceCta = {
  label: string;
  href: string;
  /** Stable, low-cardinality analytics id. Never contains user or record data. */
  ctaId: string;
};

export type SurfaceBrand = {
  surface: ContentSurface;
  /** Human name of the destination, used in bylines, OG metadata, and the RSS channel title. */
  siteName: string;
  /** The editorial hub's own name on this surface. */
  hubName: string;
  /** Absolute-URL builder for this destination (canonicals, OG, RSS, JSON-LD). */
  eyebrow: string;
  colors: {
    ink: string;
    muted: string;
    accent: string;
    support: string;
    paper: string;
    border: string;
  };
  /** Literal Tailwind class strings — see rule 1 above. */
  cls: {
    page: string;
    shellPadding: string;
    heading: string;
    subheading: string;
    body: string;
    muted: string;
    eyebrow: string;
    card: string;
    cardHover: string;
    divider: string;
    ctaPrimary: string;
    ctaSecondary: string;
    ctaPanel: string;
    ctaPanelHeading: string;
    ctaPanelBody: string;
    link: string;
    tag: string;
    focus: string;
  };
  ctas: {
    primary: SurfaceCta;
    secondary: SurfaceCta;
  };
};

/** Shared visible-focus ring. Keyboard users must always be able to see where they are. */
const FOCUS_EXPUNGEMENT =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00A99D] focus-visible:ring-offset-2 focus-visible:ring-offset-[#FBFAF7]";
const FOCUS_PARTNER =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1F8F88] focus-visible:ring-offset-2 focus-visible:ring-offset-[#FBFAF7]";

export const EXPUNGEMENT_BRAND: SurfaceBrand = {
  surface: "expungement_ai",
  siteName: "Expungement.ai",
  hubName: "The Record-Clearing Blog",
  eyebrow: "Expungement.ai",
  colors: {
    ink: "#0B1320",
    muted: "#5A6275",
    accent: "#FF3B00",
    support: "#00A99D",
    paper: "#FBFAF7",
    border: "#ECEFF4"
  },
  cls: {
    page: "min-h-screen bg-[#FBFAF7] text-[#0B1320] font-sans",
    shellPadding: "mx-auto w-full max-w-5xl px-4 pb-24 pt-16 md:px-8",
    heading: "font-extrabold tracking-[-0.02em] text-[#0B1320]",
    subheading: "font-bold text-[#0B1320]",
    body: "text-[16px] leading-7 text-[#5A6275]",
    muted: "text-[#5A6275]",
    eyebrow:
      "inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 text-xs font-extrabold uppercase tracking-[0.08em] text-[#00A99D] shadow-sm",
    card: "rounded-[20px] border border-[#ECEFF4] bg-white shadow-sm",
    cardHover: "transition hover:-translate-y-0.5 hover:shadow-md",
    divider: "border-[#ECEFF4]",
    ctaPrimary: `inline-flex min-h-14 items-center justify-center gap-2 rounded-[14px] bg-[#FF3B00] px-6 py-4 text-base font-bold text-white shadow-[0_10px_26px_rgba(255,59,0,.28)] transition hover:brightness-105 ${FOCUS_EXPUNGEMENT}`,
    ctaSecondary: `inline-flex min-h-14 items-center justify-center rounded-[14px] border border-[#D9DEE8] bg-white px-6 py-4 text-base font-bold text-[#0B1320] transition hover:border-[#00A99D] ${FOCUS_EXPUNGEMENT}`,
    ctaPanel: "mt-16 rounded-[22px] bg-[#0B1320] px-6 py-10 text-center md:px-10",
    ctaPanelHeading: "text-[26px] font-extrabold text-white md:text-[32px]",
    ctaPanelBody: "mx-auto mt-3 max-w-xl text-[15px] leading-7 text-[#C3C9D6]",
    link: `font-semibold text-[#0E9C8E] underline underline-offset-4 hover:text-[#0B1320] ${FOCUS_EXPUNGEMENT}`,
    tag: "inline-flex items-center rounded-full bg-[#E7F7F4] px-3 py-1 text-[11px] font-extrabold uppercase tracking-[0.08em] text-[#00A99D]",
    focus: FOCUS_EXPUNGEMENT
  },
  ctas: {
    primary: { label: "Start Free Check", href: "/expungement-ai/start", ctaId: "start_free_check" },
    secondary: {
      label: "Sign In to My Briefcase",
      href: "/expungement-ai/sign-in?mode=signin",
      ctaId: "sign_in_briefcase"
    }
  }
};

export const PARTNER_BRAND: SurfaceBrand = {
  surface: "legalease_partner",
  siteName: "LegalEase Partner",
  hubName: "Partner Insights",
  eyebrow: "LegalEase Partner",
  colors: {
    ink: "#101046",
    muted: "#54546B",
    accent: "#F04800",
    support: "#1F8F88",
    paper: "#FBFAF7",
    border: "#DCDCE6"
  },
  cls: {
    page: "min-h-screen bg-[#FBFAF7] text-[#101046] font-sans",
    shellPadding: "mx-auto w-full max-w-5xl px-4 pb-24 pt-16 md:px-8",
    heading: "font-extrabold tracking-[-0.015em] text-[#101046]",
    subheading: "font-bold text-[#101046]",
    body: "text-[17px] leading-7 text-[#54546B]",
    muted: "text-[#54546B]",
    eyebrow:
      "inline-flex items-center gap-2 rounded-[2px] border border-[#B8D8D8] bg-white px-3 py-1.5 text-[11px] font-extrabold uppercase tracking-[0.12em] text-[#1F8F88]",
    card: "rounded-[2px] border border-[#DCDCE6] bg-white",
    cardHover: "transition hover:border-[#1F8F88] hover:shadow-[0_8px_24px_rgba(16,16,70,.08)]",
    divider: "border-[#DCDCE6]",
    ctaPrimary: `inline-flex min-h-12 items-center justify-center gap-2 rounded-[2px] bg-[#F04800] px-6 py-3.5 text-[15px] font-bold uppercase tracking-[0.04em] text-white transition hover:bg-[#101046] ${FOCUS_PARTNER}`,
    ctaSecondary: `inline-flex min-h-12 items-center justify-center rounded-[2px] border border-[#101046] bg-white px-6 py-3.5 text-[15px] font-bold text-[#101046] transition hover:bg-[#101046] hover:text-white ${FOCUS_PARTNER}`,
    ctaPanel: "mt-16 rounded-[2px] bg-[#070725] px-6 py-10 md:px-10",
    ctaPanelHeading: "text-[24px] font-extrabold text-white md:text-[30px]",
    ctaPanelBody: "mt-3 max-w-2xl text-[16px] leading-7 text-[#B8D8D8]",
    link: `font-semibold text-[#1F8F88] underline underline-offset-4 hover:text-[#101046] ${FOCUS_PARTNER}`,
    tag: "inline-flex items-center rounded-[2px] border border-[#B8D8D8] bg-white px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-[0.1em] text-[#1F8F88]",
    focus: FOCUS_PARTNER
  },
  ctas: {
    primary: { label: "Request a Walkthrough", href: "/request-pilot", ctaId: "request_walkthrough" },
    secondary: {
      label: "Bring Record-Clearing Access to Your Community",
      href: "/partners/start",
      ctaId: "bring_access_to_community"
    }
  }
};

export const SURFACE_BRANDS: Record<ContentSurface, SurfaceBrand> = {
  expungement_ai: EXPUNGEMENT_BRAND,
  legalease_partner: PARTNER_BRAND
};

export function brandFor(surface: ContentSurface): SurfaceBrand {
  return SURFACE_BRANDS[surface];
}

// --- Public paths ---------------------------------------------------------------------------------

/**
 * Content-to-content links use the PUBLIC path (`/blog/x`), not the internal route path
 * (`/expungement-ai/blog/x`), because the proxy maps the public host onto the internal tree and the
 * public path is what repository.ts already declares as the canonical URL. Linking internally here
 * would put a non-canonical URL in the address bar of every reader who clicks through.
 *
 * Product CTAs are the deliberate exception: they point at `/expungement-ai/...` / `/partners/...`,
 * matching ConsumerNav and the `screeningHref` the state-resource adapter hands us. Those paths are
 * passthrough on the public hosts, so they resolve on both the public domain and in local dev.
 */
export function articleHref(surface: ContentSurface, contentType: ContentType, slug: string): string {
  if (surface === "expungement_ai") {
    return `/blog/${slug}`;
  }
  return contentType === "partner_story" ? `/partner-stories/${slug}` : `/insights/${slug}`;
}

export function authorHref(surface: ContentSurface, slug: string): string {
  return `/authors/${slug}`;
}

/**
 * The partner surface splits its content across two hubs. `partner_story` is canonical under
 * /partner-stories/<slug> (repository.ts decides that), so "Insights" is everything else. Both the
 * /insights page and its RSS feed read this one list — if they drifted apart, the feed would
 * advertise posts the hub does not show.
 *
 * `state_resource` is excluded on purpose: state content is canonical on Expungement.ai and is never
 * republished on the partner domain.
 */
export const PARTNER_INSIGHT_TYPES: ContentType[] = [
  "partner_insight",
  "blog_article",
  "product_announcement",
  "founder_note",
  "testimonial_story",
  "resource_guide",
  "downloadable_resource"
];

export function indexHref(surface: ContentSurface, contentType?: ContentType): string {
  if (surface === "expungement_ai") {
    return "/blog";
  }
  return contentType === "partner_story" ? "/partner-stories" : "/insights";
}

// --- Formatting -----------------------------------------------------------------------------------

export function formatPublishDate(iso: string | null | undefined): string {
  if (!iso) return "";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC"
  });
}
