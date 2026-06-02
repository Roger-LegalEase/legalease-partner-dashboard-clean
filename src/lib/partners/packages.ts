export type PartnerPackageId =
  | "starter-access-program"
  | "community-access-program"
  | "county-access-program";

export type PartnerPackage = {
  id: PartnerPackageId;
  name: string;
  description: string;
  priceLabel: string;
  stripePriceEnvVar: string;
  includedComponents: string[];
  recommendedFor: string;
};

export const partnerPackages: PartnerPackage[] = [
  {
    id: "starter-access-program",
    name: "Starter Access Program",
    description: "A focused record-clearing access launch for a defined community or campaign.",
    priceLabel: "Starter implementation investment",
    stripePriceEnvVar: "STRIPE_PRICE_STARTER_ACCESS_PROGRAM",
    includedComponents: ["Wilma Intake", "RecordShield", "Expungement.ai", "Weekly Reports"],
    recommendedFor: "Nonprofits, clinics, and community organizations starting with a defined 90-day record-clearing access push."
  },
  {
    id: "community-access-program",
    name: "Community Access Program",
    description: "A broader partner implementation with dashboard visibility and recurring reporting.",
    priceLabel: "Community implementation investment",
    stripePriceEnvVar: "STRIPE_PRICE_COMMUNITY_ACCESS_PROGRAM",
    includedComponents: ["Wilma Intake", "RecordShield", "Expungement.ai", "Partner Dashboard", "Weekly Reports"],
    recommendedFor: "Regional coalitions, workforce partners, and multi-site community programs coordinating outreach and intake."
  },
  {
    id: "county-access-program",
    name: "Full Access Program",
    description: "A county-scale record-clearing access program with implementation reporting through closeout.",
    priceLabel: "Full Access implementation investment",
    stripePriceEnvVar: "STRIPE_PRICE_COUNTY_ACCESS_PROGRAM",
    includedComponents: [
      "Wilma Intake",
      "RecordShield",
      "Expungement.ai",
      "Partner Dashboard",
      "Weekly Reports",
      "Final Impact Report"
    ],
    recommendedFor: "County agencies, courts, funders, and public-sector partners supporting higher-volume record-clearing programs."
  }
];

export function getPartnerPackage(packageId: string): PartnerPackage | undefined {
  return partnerPackages.find((partnerPackage) => partnerPackage.id === packageId);
}
