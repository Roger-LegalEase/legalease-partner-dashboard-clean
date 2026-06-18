export type LegalEaseProductId =
  | "expungement-ai"
  | "rcap"
  | "record-shield"
  | "startapart"
  | "claimcoach"
  | "fresh-start-network";

export type LegalEaseProduct = {
  id: LegalEaseProductId;
  name: string;
  status: "dominant-proof-point" | "available-now" | "roadmap";
  shortDescription: string;
  description: string;
  ctaHref: string;
  ctaLabel: string;
  waitlistLabel?: string;
};

export const legaleaseProducts: LegalEaseProduct[] = [
  {
    id: "expungement-ai",
    name: "Expungement.ai",
    status: "dominant-proof-point",
    shortDescription: "Clear or seal an eligible record yourself.",
    description: "The first live proof point: a $50 guided self-help packet path for record clearing across all 50 states and DC.",
    ctaHref: "/expungement-ai",
    ctaLabel: "Open Expungement.ai"
  },
  {
    id: "rcap",
    name: "RCAP",
    status: "available-now",
    shortDescription: "Record-clearing infrastructure for partners.",
    description: "Partner-facing record-clearing automation, forms, packets, and program workflow infrastructure.",
    ctaHref: "/partners",
    ctaLabel: "Explore partner access"
  },
  {
    id: "record-shield",
    name: "Record Shield",
    status: "available-now",
    shortDescription: "See your background check the way an employer does.",
    description: "A personal record visibility and monitoring workflow for people preparing for work, housing, and reentry steps.",
    ctaHref: "/legalease/waitlist?product=record-shield",
    ctaLabel: "Join the waitlist",
    waitlistLabel: "In beta"
  },
  {
    id: "startapart",
    name: "StartApart",
    status: "roadmap",
    shortDescription: "A simple, no-fault divorce without a retainer.",
    description: "A planned guided self-help path for simple, no-fault divorce workflows.",
    ctaHref: "/legalease/waitlist?product=startapart",
    ctaLabel: "Join the waitlist",
    waitlistLabel: "In build"
  },
  {
    id: "claimcoach",
    name: "ClaimCoach",
    status: "roadmap",
    shortDescription: "Handle your own injury claim and keep the lawyer's share.",
    description: "A planned claim-organization tool for people handling injury claims and settlement paperwork.",
    ctaHref: "/legalease/waitlist?product=claimcoach",
    ctaLabel: "Join the waitlist",
    waitlistLabel: "In build"
  },
  {
    id: "fresh-start-network",
    name: "The Fresh Start Network",
    status: "roadmap",
    shortDescription: "Move from legal cleanup to work and stability.",
    description: "A planned partner and opportunity network for people moving from legal cleanup to work and stability.",
    ctaHref: "/legalease/waitlist?product=fresh-start-network",
    ctaLabel: "Join the waitlist",
    waitlistLabel: "Roadmap"
  }
];

export const waitlistProductIds = legaleaseProducts.map((product) => product.id);

export function isLegalEaseProductId(value: string): value is LegalEaseProductId {
  return waitlistProductIds.includes(value as LegalEaseProductId);
}

export function productNameFor(id: LegalEaseProductId) {
  return legaleaseProducts.find((product) => product.id === id)?.name ?? "LegalEase";
}
