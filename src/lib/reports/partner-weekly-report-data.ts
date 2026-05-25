import {
  campaigns,
  dropOffPoints,
  eligibilityBreakdown,
  kpis,
  productStarts,
  recentActivity,
  stateBreakdown
} from "@/lib/partner-dashboard-data";

export type WeeklyReportRequestContext = {
  partnerId: string;
  partnerName: string;
  dateRange?: string;
  state?: string;
  weekNumber?: number;
};

export type WeeklyMetric = {
  label: string;
  thisWeek: number | string;
  cumulative: number | string;
  note: string;
  tone?: "normal" | "hi" | "warn";
};

export type WeeklyFunnelStage = {
  label: string;
  count: number;
  percent: number | null;
  width: number;
  color: "navy" | "navyMid" | "teal" | "green" | "amber" | "orange";
};

export type WeeklyRoutingOutcome = {
  label: string;
  thisWeek: number;
  cumulative: number;
  tone?: "warn";
};

export type WeeklyBottleneck = {
  issue: string;
  impact: "High" | "Medium" | "Low";
  fix: string;
  owner: "LegalEase" | "Partner";
};

export type WeeklyAction = {
  text: string;
  owner: "LegalEase" | "Partner";
};

export type WeeklyTarget = {
  metric: string;
  target: number;
};

export type PartnerWeeklyReportData = {
  partnerId: string;
  partnerName: string;
  reportingPeriod: {
    startDate: string;
    endDate: string;
    label: string;
    weekNumber: number;
    totalWeeks: number;
  };
  atAGlance: {
    pageVisits: { thisWeek: number; cumulative: number };
    intakeStarts: { thisWeek: number; cumulative: number };
    screenings: { thisWeek: number; cumulative: number };
    likelyEligible: { thisWeek: number; cumulative: number };
  };
  weeklySnapshot: WeeklyMetric[];
  funnel: WeeklyFunnelStage[];
  routing: WeeklyRoutingOutcome[];
  bottlenecks: WeeklyBottleneck[];
  legalEaseActions: WeeklyAction[];
  partnerActions: WeeklyAction[];
  weekAheadTargets: WeeklyTarget[];
  supportThemes: string[];
  campaignNames: string[];
  recentActivityCount: number;
};

const totalWeeks = 12;

export function buildPartnerWeeklyReportData(context: WeeklyReportRequestContext): PartnerWeeklyReportData {
  const stateFilteredBreakdown = context.state && context.state !== "All States"
    ? stateBreakdown.filter((item) => item.state === context.state)
    : stateBreakdown;
  const stateFilteredCampaigns = context.state && context.state !== "All States"
    ? campaigns.filter((campaign) => campaign.state === context.state)
    : campaigns;

  const cumulativeReferrals = sumOrFallback(stateFilteredBreakdown.map((item) => item.referrals), kpis.totalReferrals);
  const cumulativeScreenings = sumOrFallback(stateFilteredBreakdown.map((item) => item.screenings), kpis.totalScreenings);
  const cumulativeLikelyEligible = sumOrFallback(stateFilteredBreakdown.map((item) => item.likelyEligible), kpis.likelyEligible);
  const cumulativeRecordShieldStarts = sumOrFallback(stateFilteredBreakdown.map((item) => item.recordShieldStarts), kpis.recordShieldStarts);
  const cumulativeExpungementStarts = sumOrFallback(stateFilteredBreakdown.map((item) => item.expungementStarts), kpis.expungementStarts);
  const cumulativeCompletedPackets = sumOrFallback(stateFilteredBreakdown.map((item) => item.completedPackets), kpis.completedPackets);
  const cumulativeFiledPetitions = sumOrFallback(stateFilteredBreakdown.map((item) => item.filedPetitions), kpis.filedPetitions);

  const cumulativeIntakeStarts = productStarts
    .filter((product) => product.status === "active")
    .reduce((total, product) => total + (product.starts ?? 0), 0);
  const cumulativePageVisits = Math.round(cumulativeReferrals * 1.46);
  const cumulativeNeedsReview = eligibilityBreakdown.find((item) => item.id === "needs_review")?.count ?? kpis.needsReview;
  const cumulativePacketsStarted = Math.round(cumulativeCompletedPackets * 1.62);
  const mainDropOff = dropOffPoints[0] ?? {
    label: "Did not complete screening",
    count: Math.max(cumulativeReferrals - cumulativeScreenings, 0),
    percentage: 0,
    suggestedAction: "Send reminder"
  };
  const weekNumber = normalizeWeekNumber(context.weekNumber);
  const reportingPeriod = buildReportingPeriod(context.dateRange, weekNumber);

  const thisWeek = {
    pageVisits: weekSlice(cumulativePageVisits, weekNumber, 1.08),
    intakeStarts: weekSlice(cumulativeIntakeStarts, weekNumber, 1.04),
    screenings: weekSlice(cumulativeScreenings, weekNumber, 1.02),
    likelyEligible: weekSlice(cumulativeLikelyEligible, weekNumber, 1.01),
    needsReview: weekSlice(cumulativeNeedsReview, weekNumber, 0.98),
    recordShieldStarts: weekSlice(cumulativeRecordShieldStarts, weekNumber, 1.07),
    expungementStarts: weekSlice(cumulativeExpungementStarts, weekNumber, 1.05),
    packetsStarted: weekSlice(cumulativePacketsStarted, weekNumber, 1.03),
    completedPackets: weekSlice(cumulativeCompletedPackets, weekNumber, 1.03),
    filedPetitions: weekSlice(cumulativeFiledPetitions, weekNumber, 1.02)
  };

  return {
    partnerId: context.partnerId,
    partnerName: context.partnerName,
    reportingPeriod,
    atAGlance: {
      pageVisits: { thisWeek: thisWeek.pageVisits, cumulative: cumulativePageVisits },
      intakeStarts: { thisWeek: thisWeek.intakeStarts, cumulative: cumulativeIntakeStarts },
      screenings: { thisWeek: thisWeek.screenings, cumulative: cumulativeScreenings },
      likelyEligible: { thisWeek: thisWeek.likelyEligible, cumulative: cumulativeLikelyEligible }
    },
    weeklySnapshot: [
      metric("Campaign page visits", thisWeek.pageVisits, cumulativePageVisits, "Visits to partner referral entry point"),
      metric("Intake starts", thisWeek.intakeStarts, cumulativeIntakeStarts, "People who began the intake flow"),
      metric("Completed screenings", thisWeek.screenings, cumulativeScreenings, "People who answered required screening questions"),
      metric("Likely eligible users", thisWeek.likelyEligible, cumulativeLikelyEligible, "Screening result, not legal determination", "hi"),
      metric("Users needing review", thisWeek.needsReview, cumulativeNeedsReview, "Requires further information", "warn"),
      metric("RecordShield starts", thisWeek.recordShieldStarts, cumulativeRecordShieldStarts, "Users beginning record check"),
      metric("Expungement.ai starts", thisWeek.expungementStarts, cumulativeExpungementStarts, "Routed to expungement workflow"),
      metric("Packets started", thisWeek.packetsStarted, cumulativePacketsStarted, "Where available"),
      metric("Packets completed", thisWeek.completedPackets, cumulativeCompletedPackets, "Where available"),
      metric("Filed petitions", thisWeek.filedPetitions, cumulativeFiledPetitions, "Where available"),
      {
        label: "Main drop-off point",
        thisWeek: mainDropOff.label,
        cumulative: `${mainDropOff.count.toLocaleString()} users`,
        note: mainDropOff.suggestedAction,
        tone: "warn"
      }
    ],
    funnel: buildWeeklyFunnel({
      pageVisits: cumulativePageVisits,
      intakeStarts: cumulativeIntakeStarts,
      screenings: cumulativeScreenings,
      likelyEligible: cumulativeLikelyEligible,
      completedPackets: cumulativeCompletedPackets,
      filedPetitions: cumulativeFiledPetitions
    }),
    routing: [
      route("Expungement.ai", thisWeek.expungementStarts, cumulativeExpungementStarts),
      route("RecordShield", thisWeek.recordShieldStarts, cumulativeRecordShieldStarts),
      route("Clinic review", thisWeek.needsReview, cumulativeNeedsReview),
      route("Partner referral", Math.round(thisWeek.needsReview * 0.42), Math.round(cumulativeNeedsReview * 0.42)),
      route("Future eligibility notification", Math.round((kpis.notLikelyEligible / totalWeeks) * 0.84), kpis.notLikelyEligible),
      route("Incomplete intake", Math.max(thisWeek.pageVisits - thisWeek.intakeStarts, 0), Math.max(cumulativePageVisits - cumulativeIntakeStarts, 0), "warn"),
      route("Unable to determine", Math.round(thisWeek.needsReview * 0.28), Math.round(cumulativeNeedsReview * 0.28))
    ],
    bottlenecks: [
      {
        issue: "People do not complete screening after referral",
        impact: "Medium",
        fix: "Send a reminder within 24 hours of referral",
        owner: "Partner"
      },
      {
        issue: "People need case or record information before continuing",
        impact: "High",
        fix: "Add a short preparation checklist before intake",
        owner: "LegalEase"
      },
      {
        issue: "Paperwork completion trails product starts",
        impact: "Medium",
        fix: "Request missing documents from started users",
        owner: "LegalEase"
      }
    ],
    legalEaseActions: [
      { text: "Add a preparation checklist to the campaign landing page.", owner: "LegalEase" },
      { text: "Send a completion reminder to users who started but did not finish paperwork.", owner: "LegalEase" },
      { text: "Review needs-review cases for missing or unclear answers.", owner: "LegalEase" }
    ],
    partnerActions: [
      { text: "Send a reminder to referred users who have not completed screening.", owner: "Partner" },
      { text: "Share the campaign link in the next partner newsletter or staff message.", owner: "Partner" },
      { text: "Invite incomplete users to the next clinic or webinar event.", owner: "Partner" }
    ],
    weekAheadTargets: [
      target("Campaign page visits", thisWeek.pageVisits),
      target("Intake starts", thisWeek.intakeStarts),
      target("Completed screenings", thisWeek.screenings),
      target("Likely eligible users identified", thisWeek.likelyEligible),
      target("RecordShield starts", thisWeek.recordShieldStarts),
      target("Expungement.ai starts", thisWeek.expungementStarts),
      target("Completed packets", thisWeek.completedPackets),
      target("Filed petitions, where available", thisWeek.filedPetitions)
    ],
    supportThemes: [
      "Understanding whether screening results mean they may be able to continue",
      "Finding case, court, or record information before completing paperwork",
      "Knowing the difference between screening and a court outcome",
      "Getting reminders about missing documents and next steps"
    ],
    campaignNames: stateFilteredCampaigns.map((campaign) => campaign.campaign),
    recentActivityCount: recentActivity.filter((activity) => !context.state || context.state === "All States" || activity.state === context.state).length
  };
}

function sumOrFallback(values: number[], fallback: number) {
  const total = values.reduce((sum, value) => sum + value, 0);
  return total || fallback;
}

function normalizeWeekNumber(value: unknown) {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return 3;
  }
  return Math.min(Math.max(Math.round(value), 1), totalWeeks);
}

function buildReportingPeriod(label = "Last 90 days", weekNumber: number) {
  const end = new Date();
  const start = new Date(end);
  start.setDate(end.getDate() - 6);
  return {
    startDate: formatDate(start),
    endDate: formatDate(end),
    label,
    weekNumber,
    totalWeeks
  };
}

function formatDate(date: Date) {
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric" }).format(date);
}

function weekSlice(cumulative: number, weekNumber: number, momentum: number) {
  const baseline = cumulative / Math.max(weekNumber, 1);
  return Math.max(Math.round(baseline * momentum), cumulative > 0 ? 1 : 0);
}

function metric(label: string, thisWeek: number, cumulative: number, note: string, tone: WeeklyMetric["tone"] = "normal"): WeeklyMetric {
  return { label, thisWeek, cumulative, note, tone };
}

function route(label: string, thisWeek: number, cumulative: number, tone?: WeeklyRoutingOutcome["tone"]): WeeklyRoutingOutcome {
  return { label, thisWeek, cumulative, tone };
}

function target(metricName: string, current: number): WeeklyTarget {
  return { metric: metricName, target: Math.max(Math.ceil(current * 1.15), current + 1) };
}

function buildWeeklyFunnel(values: {
  pageVisits: number;
  intakeStarts: number;
  screenings: number;
  likelyEligible: number;
  completedPackets: number;
  filedPetitions: number;
}): WeeklyFunnelStage[] {
  const packetStarted = Math.round(values.completedPackets * 1.62);
  const routed = Math.max(values.likelyEligible - Math.round(kpis.needsReview * 0.15), 0);
  const stages = [
    { label: "Campaign page visits", count: values.pageVisits, color: "navy" as const },
    { label: "Intake starts", count: values.intakeStarts, color: "navyMid" as const },
    { label: "Intake completed", count: Math.max(values.screenings + Math.round(kpis.needsReview * 0.25), values.screenings), color: "teal" as const },
    { label: "Screening completed", count: values.screenings, color: "teal" as const },
    { label: "Likely eligible", count: values.likelyEligible, color: "green" as const },
    { label: "Routed to next step", count: routed, color: "green" as const },
    { label: "Packet started", count: packetStarted, color: "amber" as const },
    { label: "Packet completed", count: values.completedPackets, color: "amber" as const },
    { label: "Filed, where available", count: values.filedPetitions, color: "orange" as const }
  ];
  const max = stages[0]?.count || 1;
  return stages.map((stage, index) => ({
    ...stage,
    percent: index === 0 ? null : Math.round((stage.count / max) * 100),
    width: Math.max(Math.round((stage.count / max) * 100), 6)
  }));
}
