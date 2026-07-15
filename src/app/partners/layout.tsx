import type { Metadata } from "next";
import { getPartnerAppBaseUrl } from "@/lib/app-url";

/**
 * Layout for the LegalEase Partner surface (legaleasepartner.com → /partners via src/proxy.ts).
 *
 * There was no React layout at this segment before the content platform: the partner landing page is
 * a static HTML file served by src/app/partners/route.ts, and route handlers are NOT wrapped by
 * layouts — so adding this cannot affect it.
 *
 * What this DOES do is give every /partners/* PAGE a metadataBase (so relative OG images and
 * canonicals resolve against legaleasepartner.com rather than the deployment URL) and a title
 * template, which is what makes per-page titles read correctly in a browser tab and in search
 * results. It renders children unchanged — the visual chrome belongs to the pages themselves, so the
 * pre-existing /partners/start page is untouched.
 */
export const metadata: Metadata = {
  metadataBase: new URL(getPartnerAppBaseUrl()),
  title: {
    default: "LegalEase Partner",
    template: "%s | LegalEase Partner"
  },
  description:
    "LegalEase partners with courts, nonprofits, employers, and community organizations to make record clearing reachable. Self-help document preparation — not a law firm.",
  openGraph: {
    siteName: "LegalEase Partner",
    type: "website"
  }
};

export default function PartnersLayout({ children }: { children: React.ReactNode }) {
  return children;
}
