import {
  finalReportApi,
  partnerDashboard,
  partnerEmailSequence,
  partnerLaunchKit,
  partnerOnboarding,
  partnerPublicPage,
  weeklyReportApi
} from "./routes";
import {
  partnerComplianceCopy,
  type PartnerAsset,
  type PartnerAssetKey,
  type PartnerAssetStatus,
  type PartnerMetrics,
  type PartnerRecord,
  type ProgramTier,
  type RecordClearingNeed
} from "./types";

function assetsForPartner({
  slug,
  coBrandedStatus,
  onboardingStatus,
  wilmaStatus,
  recordShieldStatus,
  routingStatus,
  dashboardStatus,
  launchKitStatus,
  emailSequenceStatus,
  weeklyReportsStatus,
  finalImpactReportStatus
}: {
  slug: string;
  coBrandedStatus: PartnerAssetStatus;
  onboardingStatus: PartnerAssetStatus;
  wilmaStatus: PartnerAssetStatus;
  recordShieldStatus: PartnerAssetStatus;
  routingStatus: PartnerAssetStatus;
  dashboardStatus: PartnerAssetStatus;
  launchKitStatus: PartnerAssetStatus;
  emailSequenceStatus: PartnerAssetStatus;
  weeklyReportsStatus: PartnerAssetStatus;
  finalImpactReportStatus: PartnerAssetStatus;
}): Record<PartnerAssetKey, PartnerAsset> {
  return {
    partnerLandingPage: {
      key: "partnerLandingPage",
      label: "Co-branded partner page",
      description: "Public partner access page for community members entering the record-clearing access flow.",
      status: coBrandedStatus,
      route: partnerPublicPage(slug, true),
      owner: "Partner Operations",
      nextAction: coBrandedStatus === "active" ? "Monitor participant access and partner feedback." : "Review co-branding language and activate for launch."
    },
    onboardingHub: {
      key: "onboardingHub",
      label: "Onboarding hub",
      description: "Paid partner workspace for setup status, launch resources, reports, and activation links.",
      status: onboardingStatus,
      route: partnerOnboarding(slug, true),
      owner: "Implementation Lead",
      nextAction: "Confirm partner stakeholders have reviewed setup milestones."
    },
    wilmaIntake: {
      key: "wilmaIntake",
      label: "Wilma intake",
      description: "Guided intake path for record-clearing participants by geography and support need.",
      status: wilmaStatus,
      owner: "Product Operations",
      nextAction: "Finalize intake scope and jurisdiction-specific question set."
    },
    recordShieldAccess: {
      key: "recordShieldAccess",
      label: "RecordShield access",
      description: "Structured support layer for document preparation workflows and court-ready support.",
      status: recordShieldStatus,
      owner: "Legal Operations",
      nextAction: "Map support boundaries and partner-approved escalation paths."
    },
    expungementRouting: {
      key: "expungementRouting",
      label: "Expungement.ai routing",
      description: "Routing configuration based on record-clearing need, jurisdiction, and program scope.",
      status: routingStatus,
      owner: "Product Operations",
      nextAction: "Validate routing rules for mixed and unknown record-clearing needs."
    },
    dashboard: {
      key: "dashboard",
      label: "Partner dashboard",
      description: "Operational dashboard for referrals, intake activity, routing, bottlenecks, and reports.",
      status: dashboardStatus,
      route: partnerDashboard(),
      owner: "Data Operations",
      nextAction: "Activate partner-specific filters after launch kickoff."
    },
    launchKit: {
      key: "launchKit",
      label: "Launch kit",
      description: "Partner announcement copy, email copy, social copy, staff talking points, and reporting schedule.",
      status: launchKitStatus,
      route: partnerLaunchKit(slug, true),
      owner: "Partner Marketing",
      nextAction: "Send launch kit to partner communications lead."
    },
    emailSequence: {
      key: "emailSequence",
      label: "Email sequence",
      description: "Partner-facing onboarding and reporting email sequence preview for program launch.",
      status: emailSequenceStatus,
      route: partnerEmailSequence(slug, true),
      owner: "Partner Marketing",
      nextAction: "Confirm list segmentation and partner approval."
    },
    weeklyReports: {
      key: "weeklyReports",
      label: "Weekly reports",
      description: "Weekly implementation reporting package for activity, routing, and progress signals.",
      status: weeklyReportsStatus,
      route: weeklyReportApi(),
      owner: "Data Operations",
      nextAction: "Generate first weekly report after launch week closes."
    },
    finalImpactReport: {
      key: "finalImpactReport",
      label: "Final impact report",
      description: "Final 90-day impact report covering participation, support, outcomes, and recommendations.",
      status: finalImpactReportStatus,
      route: finalReportApi(),
      owner: "Data Operations",
      nextAction: "Schedule final reporting review near end of implementation window."
    }
  };
}

function partnerRecord({
  partnerId,
  partnerSlug,
  partnerName,
  contactName,
  contactEmail,
  website,
  organizationType,
  region,
  state,
  estimatedUsers90Days,
  recordClearingNeeds,
  programGoal,
  programTier,
  selectedPackageId,
  selectedPackageName,
  paymentStatus,
  qualificationStatus,
  provisioningStatus,
  stripeCheckoutSessionId,
  stripeCustomerId,
  stripePaymentIntentId,
  paidAt,
  paymentAmount,
  paymentCurrency,
  assignedOwner,
  launchDateTarget,
  createdAt,
  updatedAt,
  metrics,
  assets
}: Omit<PartnerRecord, "complianceNotes">) {
  return {
    partnerId,
    partnerSlug,
    partnerName,
    contactName,
    contactEmail,
    website,
    organizationType,
    region,
    state,
    estimatedUsers90Days,
    recordClearingNeeds,
    programGoal,
    programTier,
    selectedPackageId,
    selectedPackageName,
    paymentStatus,
    qualificationStatus,
    provisioningStatus,
    stripeCheckoutSessionId,
    stripeCustomerId,
    stripePaymentIntentId,
    paidAt,
    paymentAmount,
    paymentCurrency,
    assignedOwner,
    launchDateTarget,
    createdAt,
    updatedAt,
    assets,
    metrics,
    complianceNotes: partnerComplianceCopy
  } satisfies PartnerRecord;
}

const demoMetrics: PartnerMetrics = {
  referrals: 218,
  screenings: 164,
  likelyEligible: 96,
  productStarts: 71,
  packetsReady: 28,
  filings: 14,
  outcomesAvailable: 6
};

export const seedPartners: PartnerRecord[] = [
  partnerRecord({
    partnerId: "demo-partner",
    partnerSlug: "demo-partner",
    partnerName: "Demo Justice Access Partner",
    contactName: "Avery Coleman",
    contactEmail: "avery.coleman@example.org",
    website: "https://example.org/demo-justice-access",
    organizationType: "nonprofit",
    region: "Multi-county region",
    state: "GA",
    estimatedUsers90Days: 750,
    recordClearingNeeds: ["expungement", "sealing", "record_restriction", "clean_slate_awareness"],
    programGoal: "Launch a 90-day record-clearing access implementation for community members with mixed record-clearing needs.",
    programTier: "implementation",
    selectedPackageId: "community-access-program",
    selectedPackageName: "Community Access Program",
    paymentStatus: "paid",
    qualificationStatus: "qualified",
    provisioningStatus: "provisioning_in_progress",
    paidAt: "2026-05-24T18:30:00.000Z",
    paymentCurrency: "usd",
    assignedOwner: "LegalEase Partner Operations",
    launchDateTarget: "2026-06-15",
    createdAt: "2026-05-01T14:00:00.000Z",
    updatedAt: "2026-05-24T18:30:00.000Z",
    metrics: demoMetrics,
    assets: assetsForPartner({
      slug: "demo-partner",
      coBrandedStatus: "ready",
      onboardingStatus: "active",
      wilmaStatus: "generating",
      recordShieldStatus: "pending",
      routingStatus: "generating",
      dashboardStatus: "ready",
      launchKitStatus: "ready",
      emailSequenceStatus: "ready",
      weeklyReportsStatus: "active",
      finalImpactReportStatus: "pending"
    })
  }),
  partnerRecord({
    partnerId: "we-must-vote",
    partnerSlug: "we-must-vote",
    partnerName: "We Must Vote Action Fund",
    contactName: "Maya Turner",
    contactEmail: "maya.turner@example.org",
    website: "https://example.org/we-must-vote",
    organizationType: "national_partner",
    region: "Southeast voter access network",
    state: "AL",
    estimatedUsers90Days: 1200,
    recordClearingNeeds: ["clean_slate_awareness", "expungement", "mixed_unknown"],
    programGoal: "Help voter access organizers route community members to record-clearing intake and Clean Slate awareness resources.",
    programTier: "strategic",
    selectedPackageId: "county-access-program",
    selectedPackageName: "Full Access Program",
    paymentStatus: "paid",
    qualificationStatus: "qualified",
    provisioningStatus: "provisioned",
    paidAt: "2026-05-22T21:10:00.000Z",
    paymentCurrency: "usd",
    assignedOwner: "LegalEase Strategic Programs",
    launchDateTarget: "2026-06-03",
    createdAt: "2026-04-18T15:15:00.000Z",
    updatedAt: "2026-05-22T21:10:00.000Z",
    metrics: {
      referrals: 486,
      screenings: 337,
      likelyEligible: 182,
      productStarts: 141,
      packetsReady: 52,
      filings: 23,
      outcomesAvailable: 9
    },
    assets: assetsForPartner({
      slug: "we-must-vote",
      coBrandedStatus: "active",
      onboardingStatus: "active",
      wilmaStatus: "active",
      recordShieldStatus: "active",
      routingStatus: "active",
      dashboardStatus: "active",
      launchKitStatus: "active",
      emailSequenceStatus: "active",
      weeklyReportsStatus: "active",
      finalImpactReportStatus: "ready"
    })
  }),
  partnerRecord({
    partnerId: "fulton-county",
    partnerSlug: "fulton-county",
    partnerName: "Fulton County Reentry Services",
    contactName: "Jordan Lee",
    contactEmail: "jordan.lee@example.gov",
    website: "https://example.gov/fulton-reentry",
    organizationType: "county",
    region: "Fulton County",
    state: "GA",
    estimatedUsers90Days: 500,
    recordClearingNeeds: ["expungement", "record_restriction", "sealing"],
    programGoal: "Coordinate county reentry referrals into a measurable record-clearing access workflow.",
    programTier: "implementation",
    selectedPackageId: "community-access-program",
    selectedPackageName: "Community Access Program",
    paymentStatus: "unpaid",
    qualificationStatus: "qualified",
    provisioningStatus: "blocked_payment_required",
    assignedOwner: "LegalEase Implementation Team",
    launchDateTarget: "2026-07-01",
    createdAt: "2026-05-12T13:20:00.000Z",
    updatedAt: "2026-05-23T16:45:00.000Z",
    metrics: {
      referrals: 74,
      screenings: 43,
      likelyEligible: 21,
      productStarts: 12,
      packetsReady: 4,
      filings: 0,
      outcomesAvailable: 0
    },
    assets: assetsForPartner({
      slug: "fulton-county",
      coBrandedStatus: "locked",
      onboardingStatus: "pending",
      wilmaStatus: "pending",
      recordShieldStatus: "locked",
      routingStatus: "pending",
      dashboardStatus: "pending",
      launchKitStatus: "generating",
      emailSequenceStatus: "pending",
      weeklyReportsStatus: "pending",
      finalImpactReportStatus: "locked"
    })
  })
];

export function getSeedProgramTier(tier: ProgramTier) {
  return tier;
}

export function getNeedLabels(needs: RecordClearingNeed[]) {
  const labels: Record<RecordClearingNeed, string> = {
    expungement: "Expungement",
    sealing: "Sealing",
    record_restriction: "Record restriction",
    clean_slate_awareness: "Clean Slate awareness",
    mixed_unknown: "Mixed/unknown"
  };

  return needs.map((need) => labels[need]);
}
