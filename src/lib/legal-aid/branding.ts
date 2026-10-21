// Branding for the legal-aid participant and staff pages. MVLP is explicit;
// any other partner falls back to its seed record with LegalEase colours.
// Nothing here is internal vocabulary: it is what the public sees.

import { seedPartners } from "@/lib/partners/seed-partners";

export type LegalAidBranding = {
  slug: string;
  name: string;
  fullName: string;
  logoUrl: string | null;
  brand: string;
  brandDark: string;
  accentSoft: string;
  contactPhone: string | null;
  contactEmail: string | null;
  homeHref: string;
  clinicsHref: string;
  continueHref: string;
};

const MVLP: LegalAidBranding = {
  slug: "mvlp",
  name: "MVLP",
  fullName: "Mississippi Volunteer Lawyers Project",
  logoUrl: "/assets/partners/mvlp/mvlp-logo.png",
  brand: "#6D378F",
  brandDark: "#3A1E52",
  accentSoft: "#F3ECF8",
  contactPhone: "601-960-9577",
  contactEmail: "mvlp@mvlp.org",
  homeHref: "/p/mvlp",
  clinicsHref: "/p/mvlp/clinics",
  continueHref: "/p/mvlp/continue"
};

export function getLegalAidBranding(partnerSlug: string): LegalAidBranding | null {
  if (partnerSlug === MVLP.slug) return MVLP;
  const partner = seedPartners.find((record) => record.partnerSlug === partnerSlug);
  if (!partner) return null;
  return {
    slug: partnerSlug,
    name: partner.partnerName,
    fullName: partner.organizationName ?? partner.partnerName,
    logoUrl: partner.logoUrl ?? null,
    brand: "#0F1F5C",
    brandDark: "#0B1640",
    accentSoft: "#EEF1FA",
    contactPhone: partner.primaryContactPhone ?? null,
    contactEmail: partner.primaryContactEmail ?? partner.contactEmail ?? null,
    homeHref: `/p/${partnerSlug}`,
    clinicsHref: `/p/${partnerSlug}/clinics`,
    continueHref: `/p/${partnerSlug}/continue`
  };
}

export function formatClinicDate(iso: string, timezone: string): string {
  return new Intl.DateTimeFormat("en-US", { dateStyle: "full", timeStyle: "short", timeZone: timezone }).format(new Date(iso));
}

export function formatClinicTime(iso: string, timezone: string): string {
  return new Intl.DateTimeFormat("en-US", { timeStyle: "short", timeZone: timezone }).format(new Date(iso));
}
