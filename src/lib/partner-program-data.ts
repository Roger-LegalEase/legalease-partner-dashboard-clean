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

export type PartnerProvisioningStatus =
  | "request_received"
  | "qualified"
  | "payment_pending"
  | "payment_complete"
  | "provisioning"
  | "active"
  | "paused";

export type PartnerAssetStatus = "locked" | "pending" | "generating" | "ready" | "active";

export type PartnerPaymentStatus = "pending" | "complete" | "failed" | "refunded";

export type PartnerAssetKey =
  | "partnerLandingPage"
  | "onboardingHub"
  | "wilmaIntake"
  | "recordShieldAccess"
  | "expungementRouting"
  | "dashboard"
  | "launchKit"
  | "emailSequence"
  | "weeklyReports"
  | "finalImpactReport";

export type PartnerProvisioningAsset = {
  key: PartnerAssetKey;
  label: string;
  description: string;
  status: PartnerAssetStatus;
  route?: string;
  owner: string;
  nextAction: string;
};

export type PartnerProvisioningRecord = {
  partnerId: string;
  partnerSlug: string;
  partnerName: string;
  programTier: ProgramTierId;
  provisioningStatus: PartnerProvisioningStatus;
  paymentStatus: PartnerPaymentStatus;
  assignedOwner: string;
  launchDateTarget: string;
  region: string;
  recordClearingNeeds: string[];
  assets: Record<PartnerAssetKey, PartnerProvisioningAsset>;
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

export const partnerComplianceCopy =
  "LegalEase does not provide legal advice and does not guarantee eligibility, filing approval, court acceptance, or record-clearing outcomes. Program workflows support intake, routing, document preparation, and reporting based on jurisdiction, user-provided facts, and partner-approved scope.";

export const demoPartnerProvisioningRecord: PartnerProvisioningRecord = {
  partnerId: demoPartner.id,
  partnerSlug: demoPartner.slug,
  partnerName: demoPartner.name,
  programTier: demoPartner.selectedTierId,
  provisioningStatus: "provisioning",
  paymentStatus: "complete",
  assignedOwner: "LegalEase Partner Operations",
  launchDateTarget: "2026-06-15",
  region: demoPartner.regionServed,
  recordClearingNeeds: ["Expungement", "Sealing", "Record restriction", "Clean Slate awareness"],
  assets: {
    partnerLandingPage: {
      key: "partnerLandingPage",
      label: "Co-branded partner page",
      description: "Public partner access page for community members entering the record-clearing access flow.",
      status: "ready",
      route: `/p/${demoPartner.slug}?paid=true`,
      owner: "Partner Operations",
      nextAction: "Review co-branding language and activate for launch."
    },
    onboardingHub: {
      key: "onboardingHub",
      label: "Onboarding hub",
      description: "Paid partner workspace for setup status, launch resources, reports, and activation links.",
      status: "active",
      route: `/partners/onboarding/${demoPartner.slug}?paid=true`,
      owner: "Implementation Lead",
      nextAction: "Confirm partner stakeholders have reviewed setup milestones."
    },
    wilmaIntake: {
      key: "wilmaIntake",
      label: "Wilma intake",
      description: "Guided intake path for record-clearing participants by geography and support need.",
      status: "generating",
      owner: "Product Operations",
      nextAction: "Finalize intake scope and jurisdiction-specific question set."
    },
    recordShieldAccess: {
      key: "recordShieldAccess",
      label: "RecordShield access",
      description: "Structured support layer for document preparation workflows and court-ready support.",
      status: "pending",
      owner: "Legal Operations",
      nextAction: "Map support boundaries and partner-approved escalation paths."
    },
    expungementRouting: {
      key: "expungementRouting",
      label: "Expungement.ai routing",
      description: "Routing configuration based on record-clearing need, jurisdiction, and program scope.",
      status: "generating",
      owner: "Product Operations",
      nextAction: "Validate routing rules for mixed and unknown record-clearing needs."
    },
    dashboard: {
      key: "dashboard",
      label: "Partner dashboard",
      description: "Operational dashboard for referrals, intake activity, routing, bottlenecks, and reports.",
      status: "ready",
      route: "/dashboard/partners",
      owner: "Data Operations",
      nextAction: "Activate partner-specific filters after launch kickoff."
    },
    launchKit: {
      key: "launchKit",
      label: "Launch kit",
      description: "Partner announcement copy, email copy, social copy, staff talking points, and reporting schedule.",
      status: "ready",
      route: `/partners/onboarding/${demoPartner.slug}/launch-kit?paid=true`,
      owner: "Partner Marketing",
      nextAction: "Send launch kit to partner communications lead."
    },
    emailSequence: {
      key: "emailSequence",
      label: "Email sequence",
      description: "Partner-facing onboarding and reporting email sequence preview for program launch.",
      status: "ready",
      route: `/partners/onboarding/${demoPartner.slug}/email-sequence?paid=true`,
      owner: "Partner Marketing",
      nextAction: "Confirm list segmentation and partner approval."
    },
    weeklyReports: {
      key: "weeklyReports",
      label: "Weekly reports",
      description: "Weekly implementation reporting package for activity, routing, and progress signals.",
      status: "active",
      route: "/api/partner-reports/weekly",
      owner: "Data Operations",
      nextAction: "Generate first weekly report after launch week closes."
    },
    finalImpactReport: {
      key: "finalImpactReport",
      label: "Final impact report",
      description: "Final 90-day impact report covering participation, support, outcomes, and recommendations.",
      status: "pending",
      route: "/api/partner-reports/final",
      owner: "Data Operations",
      nextAction: "Schedule final reporting review near end of implementation window."
    }
  }
};

export const partnerProvisioningRecords: PartnerProvisioningRecord[] = [demoPartnerProvisioningRecord];

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

export function getPartnerProvisioningRecord(identifier: string): PartnerProvisioningRecord {
  return (
    partnerProvisioningRecords.find(
      (record) => record.partnerId === identifier || record.partnerSlug === identifier
    ) ?? demoPartnerProvisioningRecord
  );
}

export function getProvisioningStatusLabel(status: PartnerProvisioningStatus): string {
  const labels: Record<PartnerProvisioningStatus, string> = {
    request_received: "Request received",
    qualified: "Qualified",
    payment_pending: "Payment pending",
    payment_complete: "Payment complete",
    provisioning: "Provisioning",
    active: "Active",
    paused: "Paused"
  };

  return labels[status];
}

export function getAssetStatusLabel(status: PartnerAssetStatus): string {
  const labels: Record<PartnerAssetStatus, string> = {
    locked: "Locked",
    pending: "Pending",
    generating: "Generating",
    ready: "Ready",
    active: "Active"
  };

  return labels[status];
}

export function getPartnerRoutes(partnerSlug: string) {
  return {
    checkout: `/partners/checkout/${partnerSlug}`,
    onboarding: `/partners/onboarding/${partnerSlug}?paid=true`,
    coBrandedPage: `/p/${partnerSlug}?paid=true`,
    dashboard: "/dashboard/partners",
    launchKit: `/partners/onboarding/${partnerSlug}/launch-kit?paid=true`,
    emailSequence: `/partners/onboarding/${partnerSlug}/email-sequence?paid=true`,
    internalProvisioning: `/internal/partners/provisioning/${partnerSlug}`
  };
}
