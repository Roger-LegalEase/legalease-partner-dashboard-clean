export type ProgramTier = "starter" | "implementation" | "strategic";

export type PartnerPaymentStatus =
  | "unpaid"
  | "checkout_started"
  | "paid"
  | "failed"
  | "refunded"
  | "not_started"
  | "pending"
  | "demo_paid";

export type PartnerQualificationStatus = "request_received" | "under_review" | "qualified" | "declined";

export type PartnerProvisioningStatus =
  | "blocked_payment_required"
  | "ready_for_onboarding"
  | "onboarding_started"
  | "provisioning_in_progress"
  | "provisioned"
  | "request_received"
  | "qualified"
  | "payment_pending"
  | "payment_complete"
  | "provisioning"
  | "active"
  | "paused";

export type PartnerOnboardingStatus = "not_started" | "in_progress" | "submitted" | "needs_review" | "approved";

export type PartnerAssetStatus = "locked" | "pending" | "generating" | "ready" | "active";

export type RecordClearingNeed =
  | "expungement"
  | "sealing"
  | "record_restriction"
  | "clean_slate_awareness"
  | "mixed_unknown";

export type PartnerOrganizationType =
  | "nonprofit"
  | "workforce"
  | "reentry"
  | "city"
  | "county"
  | "court"
  | "clinic"
  | "funder"
  | "national_partner"
  | "other";

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

export type PartnerAsset = {
  key: PartnerAssetKey;
  label: string;
  description: string;
  status: PartnerAssetStatus;
  route?: string;
  owner: string;
  nextAction: string;
};

export type PartnerMetrics = {
  referrals: number;
  screenings: number;
  likelyEligible: number;
  productStarts: number;
  packetsReady: number;
  filings: number;
  outcomesAvailable: number;
};

export type PartnerEvent = {
  id: string;
  partnerSlug: string;
  eventType: string;
  eventLabel: string;
  eventPayload: Record<string, string | number | boolean | null>;
  createdAt: string;
};

export type PartnerWriteResult = {
  success: boolean;
  persisted: boolean;
  mode: "local_seeded" | "local_fallback" | "supabase";
  message: string;
  partnerSlug?: string;
  action?: string;
  error?: string;
};

export type PartnerRecord = {
  partnerId: string;
  partnerSlug: string;
  partnerName: string;
  contactName: string;
  contactEmail: string;
  organizationName?: string;
  legalName?: string;
  primaryContactName?: string;
  primaryContactTitle?: string;
  primaryContactEmail?: string;
  primaryContactPhone?: string;
  website: string;
  organizationType: PartnerOrganizationType;
  programName?: string;
  programDescription?: string;
  targetState?: string;
  targetCounty?: string;
  targetCity?: string;
  serviceArea?: string;
  expectedMonthlyParticipants?: number;
  expectedLaunchDate?: string;
  referralSources?: string;
  audienceDescription?: string;
  brandingNotes?: string;
  logoUrl?: string;
  onboardingStatus?: PartnerOnboardingStatus;
  onboardingStartedAt?: string;
  onboardingCompletedAt?: string;
  region: string;
  state: string;
  estimatedUsers90Days: number;
  recordClearingNeeds: RecordClearingNeed[];
  programGoal: string;
  programTier: ProgramTier;
  selectedPackageId?: string;
  selectedPackageName?: string;
  paymentStatus: PartnerPaymentStatus;
  qualificationStatus: PartnerQualificationStatus;
  provisioningStatus: PartnerProvisioningStatus;
  stripeCheckoutSessionId?: string;
  stripeCustomerId?: string;
  stripePaymentIntentId?: string;
  paidAt?: string;
  paymentAmount?: number;
  paymentCurrency?: string;
  assignedOwner: string;
  launchDateTarget: string;
  createdAt: string;
  updatedAt: string;
  assets: Record<PartnerAssetKey, PartnerAsset>;
  metrics: PartnerMetrics;
  complianceNotes: string;
};

export type ProgramTierDefinition = {
  id: ProgramTier;
  name: string;
  investmentRange: string;
  userVolume: string;
  bestFor: string;
  scope: string[];
};

export type SearchParamsRecord = Record<string, string | string[] | undefined>;

export type PartnerUrlOptions = {
  paid?: boolean;
};

export const partnerComplianceCopy =
  "LegalEase does not provide legal advice and does not guarantee eligibility, filing approval, court acceptance, or record-clearing outcomes. Program workflows support intake, routing, document preparation, and reporting based on jurisdiction, user-provided facts, and partner-approved scope.";

export const programTiers: ProgramTierDefinition[] = [
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
