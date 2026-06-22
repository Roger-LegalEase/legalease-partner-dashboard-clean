import {
  campaigns,
  dropOffPoints,
  eligibilityBreakdown,
  kpis,
  productStarts,
  recentActivity,
  stateBreakdown
} from "@/lib/partner-dashboard-data";

export type FinalImpactReportRequestContext = {
  partnerId: string;
  partnerName: string;
  dateRange?: string;
  state?: string;
  actualReliefDeliveredPackets?: number;
  reliefOutcomeBreakdown?: Record<string, number>;
};

export type FinalImpactMetric = {
  label: string;
  value: number;
  note: string;
};

export type FinalImpactFunnelStage = {
  label: string;
  count: number;
  percentOfReferrals: number | null;
  priorConversion: number | null;
  color: "navy" | "navyMid" | "teal" | "green" | "amber" | "orange";
};

export type FinalImpactTableRow = {
  label: string;
  count: number;
  conversion: string;
};

export type FinalImpactReportData = {
  partnerId: string;
  partnerName: string;
  stateLabel: string;
  dateRangeLabel: string;
  reportDate: string;
  reportPeriod: string;
  metrics: {
    referrals: number;
    screenings: number;
    likelyEligible: number;
    needsReview: number;
    notLikelyReady: number;
    recordShieldStarts: number;
    expungementStarts: number;
    productStarts: number;
    packetStarted: number;
    packetReady: number;
    filedMatters: number;
    outcomesAvailable: number;
    actualReliefDelivered: number;
    outcomesPending: number;
    pageVisits: number;
    intakeStarts: number;
    missingDocuments: number;
    filingFeeBarrier: number;
  };
  heroMetrics: FinalImpactMetric[];
  funnel: FinalImpactFunnelStage[];
  metricRows: FinalImpactTableRow[];
  routingRows: FinalImpactTableRow[];
  outcomeRows: FinalImpactTableRow[];
  outreachRows: FinalImpactTableRow[];
  dropOffPoints: Array<{ label: string; count: number; percentage: number; action: string }>;
  campaignNames: string[];
  topStates: string[];
  recentActivityCount: number;
};

export function buildPartnerFinalImpactReportData(context: FinalImpactReportRequestContext): FinalImpactReportData {
  const scopedStates = context.state && context.state !== "All States"
    ? stateBreakdown.filter((item) => item.state === context.state)
    : stateBreakdown;
  const scopedCampaigns = context.state && context.state !== "All States"
    ? campaigns.filter((campaign) => campaign.state === context.state)
    : campaigns;

  const referrals = sumOrFallback(scopedStates.map((item) => item.referrals), kpis.totalReferrals);
  const screenings = sumOrFallback(scopedStates.map((item) => item.screenings), kpis.totalScreenings);
  const likelyEligible = sumOrFallback(scopedStates.map((item) => item.likelyEligible), kpis.likelyEligible);
  const recordShieldStarts = sumOrFallback(scopedStates.map((item) => item.recordShieldStarts), kpis.recordShieldStarts);
  const expungementStarts = sumOrFallback(scopedStates.map((item) => item.expungementStarts), kpis.expungementStarts);
  const packetReady = sumOrFallback(scopedStates.map((item) => item.completedPackets), kpis.completedPackets);
  const filedMatters = sumOrFallback(scopedStates.map((item) => item.filedPetitions), kpis.filedPetitions);
  const needsReview = context.state && context.state !== "All States"
    ? Math.round(screenings * 0.15)
    : eligibilityBreakdown.find((item) => item.id === "needs_review")?.count ?? kpis.needsReview;
  const notLikelyReady = Math.max(screenings - likelyEligible - needsReview, 0);
  const productStartTotal = context.state && context.state !== "All States"
    ? recordShieldStarts + expungementStarts
    : productStarts.filter((product) => product.status === "active").reduce((total, product) => total + (product.starts ?? 0), 0);
  const packetStarted = Math.max(packetReady, Math.round(packetReady * 1.25));
  const outcomesAvailable = context.state && context.state !== "All States"
    ? Math.min(filedMatters, Math.round(filedMatters * 0.41))
    : kpis.outcomesAvailable;
  const actualReliefDelivered = context.actualReliefDeliveredPackets ?? 0;
  const outcomesPending = Math.max(filedMatters - outcomesAvailable, 0);
  const pageVisits = Math.max(referrals, Math.round(referrals * 1.72));
  const intakeStarts = Math.max(screenings, Math.round(referrals * 0.87));
  const missingDocuments = Math.max(Math.round((productStartTotal - packetReady) * 0.32), 0);
  const filingFeeBarrier = Math.max(Math.round(Math.max(packetReady - filedMatters, 0) * 0.52), 0);
  const stateLabel = context.state && context.state !== "All States" ? context.state : "All States";
  const reportDate = formatDate(new Date());

  const metrics = {
    referrals,
    screenings,
    likelyEligible,
    needsReview,
    notLikelyReady,
    recordShieldStarts,
    expungementStarts,
    productStarts: productStartTotal,
    packetStarted,
    packetReady,
    filedMatters,
    outcomesAvailable,
    actualReliefDelivered,
    outcomesPending,
    pageVisits,
    intakeStarts,
    missingDocuments,
    filingFeeBarrier
  };

  return {
    partnerId: context.partnerId,
    partnerName: context.partnerName,
    stateLabel,
    dateRangeLabel: context.dateRange ?? "Last 90 days",
    reportDate,
    reportPeriod: buildReportPeriod(context.dateRange),
    metrics,
    heroMetrics: [
      { label: "Total Referrals", value: referrals, note: "People referred into LegalEase" },
      { label: "Completed Screenings", value: screenings, note: "People who completed screening" },
      { label: "Likely Eligible", value: likelyEligible, note: "Screening result, not a legal determination" },
      { label: "Product Starts", value: productStartTotal, note: "RecordShield and Expungement.ai starts" },
      { label: "Packets Completed", value: packetReady, note: "Paperwork ready for filing or review" },
      { label: "Relief Delivered", value: actualReliefDelivered, note: "Granted or partially granted outcomes" }
    ],
    funnel: buildFunnel(metrics),
    metricRows: buildMetricRows(metrics),
    routingRows: buildRoutingRows(metrics),
    outcomeRows: buildOutcomeRows(metrics),
    outreachRows: buildOutreachRows(scopedCampaigns, referrals),
    dropOffPoints: dropOffPoints.map((point) => ({
      label: point.label,
      count: point.count,
      percentage: point.percentage,
      action: point.suggestedAction
    })),
    campaignNames: scopedCampaigns.map((campaign) => campaign.campaign),
    topStates: [...scopedStates]
      .sort((a, b) => b.referrals - a.referrals)
      .slice(0, 3)
      .map((item) => item.state),
    recentActivityCount: recentActivity.filter((activity) => !context.state || context.state === "All States" || activity.state === context.state).length
  };
}

function buildFunnel(metrics: FinalImpactReportData["metrics"]): FinalImpactFunnelStage[] {
  const stages = [
    { label: "Total referrals", count: metrics.referrals, color: "navy" as const },
    { label: "Intake starts", count: metrics.intakeStarts, color: "navyMid" as const },
    { label: "Screenings completed", count: metrics.screenings, color: "teal" as const },
    { label: "Likely eligible", count: metrics.likelyEligible, color: "teal" as const },
    { label: "Product starts", count: metrics.productStarts, color: "green" as const },
    { label: "Packets started", count: metrics.packetStarted, color: "green" as const },
    { label: "Packets completed", count: metrics.packetReady, color: "amber" as const },
    { label: "Filed matters", count: metrics.filedMatters, color: "orange" as const },
    { label: "Relief delivered", count: metrics.actualReliefDelivered, color: "orange" as const }
  ];

  return stages.map((stage, index) => {
    const previous = stages[index - 1];
    return {
      ...stage,
      percentOfReferrals: index === 0 ? null : percent(stage.count, metrics.referrals),
      priorConversion: previous ? percent(stage.count, previous.count) : null
    };
  });
}

function buildMetricRows(metrics: FinalImpactReportData["metrics"]): FinalImpactTableRow[] {
  return [
    { label: "Campaign page visits", count: metrics.pageVisits, conversion: "Entry point visits" },
    { label: "Intake starts", count: metrics.intakeStarts, conversion: `${percent(metrics.intakeStarts, metrics.pageVisits)}% of visits` },
    { label: "Screenings completed", count: metrics.screenings, conversion: `${percent(metrics.screenings, metrics.intakeStarts)}% of starts` },
    { label: "Likely eligible based on screening", count: metrics.likelyEligible, conversion: `${percent(metrics.likelyEligible, metrics.screenings)}% of screened` },
    { label: "Needs review", count: metrics.needsReview, conversion: `${percent(metrics.needsReview, metrics.screenings)}% of screened` },
    { label: "May not be ready right now", count: metrics.notLikelyReady, conversion: `${percent(metrics.notLikelyReady, metrics.screenings)}% of screened` },
    { label: "RecordShield starts", count: metrics.recordShieldStarts, conversion: "Product workflow" },
    { label: "Expungement.ai starts", count: metrics.expungementStarts, conversion: "Product workflow" },
    { label: "Packets started", count: metrics.packetStarted, conversion: `${percent(metrics.packetStarted, metrics.productStarts)}% of starts` },
    { label: "Packets completed", count: metrics.packetReady, conversion: `${percent(metrics.packetReady, metrics.packetStarted)}% of started` },
    { label: "Filed matters", count: metrics.filedMatters, conversion: `${percent(metrics.filedMatters, metrics.packetReady)}% of packets` },
    { label: "Outcomes available", count: metrics.outcomesAvailable, conversion: `${percent(metrics.outcomesAvailable, metrics.filedMatters)}% of filed` },
    { label: "Actual relief delivered", count: metrics.actualReliefDelivered, conversion: `${percent(metrics.actualReliefDelivered, metrics.filedMatters)}% of filed` }
  ];
}

function buildRoutingRows(metrics: FinalImpactReportData["metrics"]): FinalImpactTableRow[] {
  return [
    { label: "Expungement.ai workflow", count: metrics.expungementStarts, conversion: `${percent(metrics.expungementStarts, metrics.screenings)}% of screened` },
    { label: "RecordShield check", count: metrics.recordShieldStarts, conversion: `${percent(metrics.recordShieldStarts, metrics.screenings)}% of screened` },
    { label: "Human or clinic review", count: metrics.needsReview, conversion: `${percent(metrics.needsReview, metrics.screenings)}% of screened` },
    { label: "Future follow-up", count: metrics.notLikelyReady, conversion: `${percent(metrics.notLikelyReady, metrics.screenings)}% of screened` },
    { label: "Filed matters", count: metrics.filedMatters, conversion: `${percent(metrics.filedMatters, metrics.referrals)}% of referrals` }
  ];
}

function buildOutcomeRows(metrics: FinalImpactReportData["metrics"]): FinalImpactTableRow[] {
  const courtUpdate = Math.round(metrics.outcomesAvailable * 0.72);
  const needsFollowUp = Math.max(metrics.outcomesAvailable - courtUpdate, 0);
  return [
    { label: "Actual relief delivered", count: metrics.actualReliefDelivered, conversion: `${percent(metrics.actualReliefDelivered, metrics.filedMatters)}% of filed` },
    { label: "Outcome reported", count: metrics.outcomesAvailable, conversion: `${percent(metrics.outcomesAvailable, metrics.filedMatters)}% of filed` },
    { label: "Court update received", count: courtUpdate, conversion: "Reported where available" },
    { label: "Needs follow-up or correction", count: needsFollowUp, conversion: "Operational follow-up" },
    { label: "Outcome pending", count: metrics.outcomesPending, conversion: "No update yet" }
  ];
}

function buildOutreachRows(scopedCampaigns: typeof campaigns, referrals: number): FinalImpactTableRow[] {
  if (scopedCampaigns.length === 0) {
    return [{ label: "Partner outreach", count: referrals, conversion: "100% of referrals" }];
  }
  return scopedCampaigns.map((campaign) => ({
    label: campaign.campaign,
    count: campaign.referrals,
    conversion: `${percent(campaign.referrals, referrals)}% of referrals`
  }));
}

function sumOrFallback(values: number[], fallback: number) {
  const total = values.reduce((sum, value) => sum + value, 0);
  return total || fallback;
}

function percent(value: number, total: number) {
  if (!total) {
    return 0;
  }
  return Math.round((value / total) * 100);
}

function buildReportPeriod(label = "Last 90 days") {
  if (label === "Year to date") {
    return `Jan 1 - ${formatDate(new Date())}`;
  }
  return label;
}

function formatDate(date: Date) {
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric" }).format(date);
}
