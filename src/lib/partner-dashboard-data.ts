export type Partner = {
  id: string;
  name: string;
  type: "nonprofit" | "government" | "workforce" | "foundation" | "internal" | "demo";
  states: string[];
};

export type ProductId =
  | "wilma_intake"
  | "recordshield"
  | "expungement_ai"
  | "partner_dashboard"
  | "weekly_reports"
  | "final_impact_report";

export type PartnerReferral = {
  id: string;
  partnerId: string;
  campaignId?: string;
  userId: string;
  state: string;
  source: string;
  referredAt: string;
  screenedAt?: string;
  productStartedAt?: string;
  packetCompletedAt?: string;
  filingSubmittedAt?: string;
  outcomeReceivedAt?: string;
  product?: ProductId;
  screeningStatus: "likely_eligible" | "not_likely_eligible" | "needs_review" | "not_screened";
  workflowStatus:
    | "referred"
    | "screened"
    | "started"
    | "packet_completed"
    | "pending_filing"
    | "filed"
    | "outcome_available";
  outcome?: "granted" | "denied" | "pending" | "unknown";
};

export type PartnerDashboardKpis = {
  totalReferrals: number;
  totalScreenings: number;
  likelyEligible: number;
  notLikelyEligible: number;
  needsReview: number;
  recordShieldStarts: number;
  expungementStarts: number;
  completedPackets: number;
  pendingFilings: number;
  filedPetitions: number;
  outcomesAvailable: number;
  overallConversionRate: number;
};

export type KpiMetric = {
  id: keyof PartnerDashboardKpis;
  label: string;
  value: number;
  supportingLabel: string;
  change: string;
  format?: "number" | "percent";
};

export type FunnelStage = {
  stage: string;
  count: number;
  previousConversion: number;
  overallConversion: number;
};

export type EligibilitySegment = {
  id: "likely_eligible" | "not_likely_eligible" | "needs_review";
  label: string;
  count: number;
  percentage: number;
  definition: string;
};

export type ProductStart = {
  id: ProductId;
  name: string;
  starts?: number;
  metricLabel?: string;
  description: string;
  status: "active" | "scheduled";
};

export type StateBreakdown = {
  state: string;
  referrals: number;
  screenings: number;
  likelyEligible: number;
  recordShieldStarts: number;
  expungementStarts: number;
  completedPackets: number;
  filedPetitions: number;
  conversionRate: number;
};

export type CampaignPerformance = {
  campaign: string;
  partner: string;
  channel: string;
  state: string;
  referrals: number;
  screenings: number;
  starts: number;
  completedPackets: number;
  filedPetitions: number;
  conversionRate: number;
  status: "Active" | "Paused" | "Completed" | "Draft";
};

export type DropOffPoint = {
  label: string;
  count: number;
  percentage: number;
  suggestedAction: string;
};

export type RecentActivity = {
  userId: string;
  partner: string;
  state: string;
  product: string;
  status: string;
  lastActivity: string;
  outcome: string;
};

export const partners: Partner[] = [
  {
    id: "current-partner",
    name: "Current Partner",
    type: "demo",
    states: ["Mississippi", "Illinois", "Pennsylvania", "Georgia", "Maryland", "District of Columbia", "California", "Ohio", "New York"]
  }
];

export const kpis: PartnerDashboardKpis = {
  totalReferrals: 1248,
  totalScreenings: 924,
  likelyEligible: 612,
  notLikelyEligible: 178,
  needsReview: 134,
  recordShieldStarts: 312,
  expungementStarts: 176,
  completedPackets: 302,
  pendingFilings: 85,
  filedPetitions: 217,
  outcomesAvailable: 89,
  overallConversionRate: 17.4
};

export const kpiMetrics: KpiMetric[] = [
  { id: "totalReferrals", label: "Total Referrals", value: kpis.totalReferrals, supportingLabel: "Partner-sourced justice-impacted users", change: "+18% vs previous period" },
  { id: "totalScreenings", label: "Total Screenings", value: kpis.totalScreenings, supportingLabel: "Screening throughput completed", change: "+14% vs previous period" },
  { id: "likelyEligible", label: "Likely Eligible", value: kpis.likelyEligible, supportingLabel: "Screening result, not a legal determination", change: "+11% vs previous period" },
  { id: "notLikelyEligible", label: "Not Likely Eligible", value: kpis.notLikelyEligible, supportingLabel: "Based on user-provided information", change: "-3% vs previous period" },
  { id: "needsReview", label: "Needs Review", value: kpis.needsReview, supportingLabel: "Routed for legal operations review", change: "+7% vs previous period" },
  { id: "recordShieldStarts", label: "RecordShield Starts", value: kpis.recordShieldStarts, supportingLabel: "Personal record check workflow", change: "+22% vs previous period" },
  { id: "expungementStarts", label: "Expungement.ai Starts", value: kpis.expungementStarts, supportingLabel: "Packet preparation workflow", change: "+16% vs previous period" },
  { id: "completedPackets", label: "Completed Packets", value: kpis.completedPackets, supportingLabel: "Filing readiness milestone", change: "+9% vs previous period" },
  { id: "pendingFilings", label: "Pending Filings", value: kpis.pendingFilings, supportingLabel: "Completed packets awaiting filing", change: "+5% vs previous period" },
  { id: "filedPetitions", label: "Filed Petitions", value: kpis.filedPetitions, supportingLabel: "Petitions submitted where available", change: "+12% vs previous period" },
  { id: "outcomesAvailable", label: "Outcomes Available", value: kpis.outcomesAvailable, supportingLabel: "Outcome visibility reported", change: "+6% vs previous period" },
  { id: "overallConversionRate", label: "Overall Conversion Rate", value: kpis.overallConversionRate, supportingLabel: "Referral to filed petition", change: "+2.8 pts vs previous period", format: "percent" }
];

export const funnelStages: FunnelStage[] = [
  { stage: "Referred", count: 1248, previousConversion: 100, overallConversion: 100 },
  { stage: "Screened", count: 924, previousConversion: 74, overallConversion: 74 },
  { stage: "Likely Eligible", count: 612, previousConversion: 66, overallConversion: 49 },
  { stage: "Product Started", count: 488, previousConversion: 80, overallConversion: 39 },
  { stage: "Packet Completed", count: 302, previousConversion: 62, overallConversion: 24 },
  { stage: "Filing Pending", count: 260, previousConversion: 86, overallConversion: 21 },
  { stage: "Filed", count: 217, previousConversion: 83, overallConversion: 17 },
  { stage: "Outcome Available", count: 89, previousConversion: 41, overallConversion: 7 }
];

export const eligibilityBreakdown: EligibilitySegment[] = [
  {
    id: "likely_eligible",
    label: "Likely eligible",
    count: 612,
    percentage: 66,
    definition: "User appears to meet screening criteria based on provided information."
  },
  {
    id: "not_likely_eligible",
    label: "Not likely eligible",
    count: 178,
    percentage: 19,
    definition: "User does not appear to meet current screening criteria based on provided information."
  },
  {
    id: "needs_review",
    label: "Needs review",
    count: 134,
    percentage: 15,
    definition: "User information is incomplete, conflicting, or requires human/legal operations review."
  }
];

export const productStarts: ProductStart[] = [
  {
    id: "wilma_intake",
    name: "Wilma Intake",
    metricLabel: "924 intake starts",
    description: "Guided eligibility and intake workflow",
    status: "active"
  },
  { id: "recordshield", name: "RecordShield", starts: 312, description: "Personal record check and review workflow", status: "active" },
  {
    id: "expungement_ai",
    name: "Expungement.ai",
    starts: 176,
    description: "Expungement, sealing, record restriction, and Clean Slate routing workflow",
    status: "active"
  },
  {
    id: "partner_dashboard",
    name: "Partner Dashboard",
    metricLabel: "Active",
    description: "Partner-facing implementation and reporting dashboard",
    status: "active"
  },
  {
    id: "weekly_reports",
    name: "Weekly Reports",
    metricLabel: "Scheduled",
    description: "Recurring implementation reporting",
    status: "scheduled"
  },
  {
    id: "final_impact_report",
    name: "Final Impact Report",
    metricLabel: "Scheduled",
    description: "End-of-program outcome and impact report",
    status: "scheduled"
  }
];

export const stateBreakdown: StateBreakdown[] = [
  { state: "Mississippi", referrals: 198, screenings: 151, likelyEligible: 103, recordShieldStarts: 62, expungementStarts: 31, completedPackets: 58, filedPetitions: 37, conversionRate: 18.7 },
  { state: "Illinois", referrals: 176, screenings: 132, likelyEligible: 91, recordShieldStarts: 54, expungementStarts: 27, completedPackets: 45, filedPetitions: 33, conversionRate: 18.8 },
  { state: "Pennsylvania", referrals: 164, screenings: 126, likelyEligible: 86, recordShieldStarts: 46, expungementStarts: 29, completedPackets: 43, filedPetitions: 31, conversionRate: 18.9 },
  { state: "Georgia", referrals: 153, screenings: 109, likelyEligible: 68, recordShieldStarts: 34, expungementStarts: 31, completedPackets: 39, filedPetitions: 29, conversionRate: 19.0 },
  { state: "Maryland", referrals: 139, screenings: 102, likelyEligible: 69, recordShieldStarts: 35, expungementStarts: 22, completedPackets: 34, filedPetitions: 25, conversionRate: 18.0 },
  { state: "District of Columbia", referrals: 121, screenings: 89, likelyEligible: 57, recordShieldStarts: 28, expungementStarts: 18, completedPackets: 28, filedPetitions: 18, conversionRate: 14.9 },
  { state: "California", referrals: 118, screenings: 82, likelyEligible: 52, recordShieldStarts: 22, expungementStarts: 14, completedPackets: 19, filedPetitions: 13, conversionRate: 11.0 },
  { state: "Ohio", referrals: 96, screenings: 74, likelyEligible: 48, recordShieldStarts: 20, expungementStarts: 3, completedPackets: 17, filedPetitions: 11, conversionRate: 11.5 },
  { state: "New York", referrals: 83, screenings: 59, likelyEligible: 38, recordShieldStarts: 11, expungementStarts: 1, completedPackets: 19, filedPetitions: 20, conversionRate: 24.1 }
];

export const campaigns: CampaignPerformance[] = [
  { campaign: "Fresh Start Month (30 day kickoff)", partner: "Current Partner", channel: "Partner outreach", state: "Mississippi", referrals: 184, screenings: 139, starts: 86, completedPackets: 51, filedPetitions: 34, conversionRate: 18.5, status: "Active" },
  { campaign: "Fresh Start Fridays (Live webinars)", partner: "Current Partner", channel: "Live webinar", state: "Illinois", referrals: 126, screenings: 94, starts: 57, completedPackets: 33, filedPetitions: 22, conversionRate: 17.5, status: "Active" },
  { campaign: "Expungement Clinic", partner: "Current Partner", channel: "Clinic intake", state: "Georgia", referrals: 153, screenings: 109, starts: 65, completedPackets: 39, filedPetitions: 29, conversionRate: 19.0, status: "Active" }
];

export const dropOffPoints: DropOffPoint[] = [
  { label: "Referral but no screening", count: 324, percentage: 26, suggestedAction: "Send reminder campaign" },
  { label: "Screened but no product start", count: 286, percentage: 31, suggestedAction: "Send partner-branded follow-up SMS/email campaign" },
  { label: "Started but packet incomplete", count: 186, percentage: 38, suggestedAction: "Request missing documents" },
  { label: "Packet complete but not filed", count: 85, percentage: 28, suggestedAction: "Route to human review" },
  { label: "Filed but outcome pending", count: 128, percentage: 59, suggestedAction: "Follow up by phone" }
];

export const recentActivity: RecentActivity[] = [
  { userId: "User-1048", partner: "Current Partner", state: "Pennsylvania", product: "RecordShield", status: "Screening complete", lastActivity: "2 hours ago", outcome: "Needs review" },
  { userId: "User-1051", partner: "Current Partner", state: "Georgia", product: "Expungement.ai", status: "Packet completed", lastActivity: "1 day ago", outcome: "Pending filing" },
  { userId: "User-1063", partner: "Current Partner", state: "Mississippi", product: "RecordShield", status: "Product started", lastActivity: "1 day ago", outcome: "Outcome where available" },
  { userId: "User-1072", partner: "Current Partner", state: "California", product: "RecordShield", status: "Referral received", lastActivity: "2 days ago", outcome: "Not screened" },
  { userId: "User-1084", partner: "Current Partner", state: "District of Columbia", product: "Expungement.ai", status: "Filed", lastActivity: "3 days ago", outcome: "Pending" },
  { userId: "User-1090", partner: "Current Partner", state: "Ohio", product: "RecordShield", status: "Needs documents", lastActivity: "4 days ago", outcome: "Needs review" },
  { userId: "User-1106", partner: "Current Partner", state: "Illinois", product: "Expungement.ai", status: "Outcome received", lastActivity: "5 days ago", outcome: "Granted" },
  { userId: "User-1118", partner: "Current Partner", state: "Maryland", product: "RecordShield", status: "Screening complete", lastActivity: "6 days ago", outcome: "Likely eligible" }
];

export const dateRanges = ["Last 7 days", "Last 30 days", "Last 90 days", "Year to date", "Custom"] as const;
export const stateFilters = ["All States", ...stateBreakdown.map((item) => item.state)] as const;

// Replace this seeded layer with live loaders from Supabase, Postgres, Airtable,
// HubSpot, or CSV import once partner reporting data contracts are finalized.
export const partnerDashboardData = {
  partners,
  campaigns,
  stateBreakdown,
  kpis,
  kpiMetrics,
  funnelStages,
  eligibilityBreakdown,
  productStarts,
  dropOffPoints,
  recentActivity,
  dateRanges,
  stateFilters
};
