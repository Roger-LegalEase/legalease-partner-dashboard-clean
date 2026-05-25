export type ProgramTierId = "starter" | "implementation" | "strategic";

export type ProgramTier = {
  id: ProgramTierId;
  name: string;
  investmentRange: string;
  userVolume: string;
  bestFor: string;
  scope: string[];
};

export type PartnerActivationStatus =
  | "Complete"
  | "In Setup"
  | "Draft Ready"
  | "Pending Activation"
  | "Generating"
  | "Scheduled";

export type Partner = {
  id: string;
  slug: string;
  name: string;
  organizationType: string;
  regionServed: string;
  selectedTierId: ProgramTierId;
  activationStatuses: {
    payment: PartnerActivationStatus;
    partnerProfile: PartnerActivationStatus;
    coBrandedPage: PartnerActivationStatus;
    dashboard: PartnerActivationStatus;
    launchKit: PartnerActivationStatus;
    reports: PartnerActivationStatus;
  };
};

export const programTiers: ProgramTier[] = [
  {
    id: "starter",
    name: "Starter Program",
    investmentRange: "$10K-$25K",
    userVolume: "250-500 users",
    bestFor: "Focused community access campaigns with defined jurisdictional scope.",
    scope: ["Co-branded access page", "Wilma intake setup", "Weekly implementation reports"]
  },
  {
    id: "implementation",
    name: "Implementation Program",
    investmentRange: "$50K-$100K",
    userVolume: "500-1,000 users",
    bestFor: "Regional partners coordinating outreach, screening, routing, and reporting.",
    scope: ["RecordShield access", "Expungement.ai routing", "Dashboard activation", "Launch kit"]
  },
  {
    id: "strategic",
    name: "Strategic Program",
    investmentRange: "$100K-$250K",
    userVolume: "Custom volume",
    bestFor: "Multi-region initiatives requiring custom implementation reporting and operating support.",
    scope: ["Custom volume planning", "Executive impact reporting", "Program governance support"]
  }
];

export const programComponents = [
  {
    name: "Partner Landing Page",
    description: "A public enterprise entry point that explains the record-clearing access model and partner implementation path."
  },
  {
    name: "Wilma Intake",
    description: "Guided intake for community members seeking expungement, sealing, record restriction, or Clean Slate relief."
  },
  {
    name: "RecordShield Access",
    description: "Structured access support for screening, document preparation, and court-ready support workflows."
  },
  {
    name: "Expungement.ai Routing",
    description: "Routing logic that helps direct participants based on jurisdiction, stated needs, and program scope."
  },
  {
    name: "Partner Dashboard",
    description: "Operational visibility into referrals, intake volume, eligibility signals, routing, and implementation activity."
  },
  {
    name: "Weekly Reports + Final Impact Report",
    description: "Implementation reporting that shows participation, progress, bottlenecks, and measurable outcomes."
  }
];

export const demoPartner: Partner = {
  id: "demo-partner",
  slug: "demo-partner",
  name: "Demo Justice Access Partner",
  organizationType: "Community justice organization",
  regionServed: "Multi-county region",
  selectedTierId: "implementation",
  activationStatuses: {
    payment: "Complete",
    partnerProfile: "In Setup",
    coBrandedPage: "Draft Ready",
    dashboard: "Pending Activation",
    launchKit: "Generating",
    reports: "Scheduled"
  }
};

export function getProgramTier(tierId: ProgramTierId): ProgramTier {
  return programTiers.find((tier) => tier.id === tierId) ?? programTiers[1];
}

export function getMockPartner(identifier: string): Partner {
  if (identifier === demoPartner.id || identifier === demoPartner.slug) {
    return demoPartner;
  }

  return {
    ...demoPartner,
    id: identifier,
    slug: identifier
  };
}

export function isMockPaid(searchParams: Record<string, string | string[] | undefined>): boolean {
  return searchParams.paid === "true";
}
