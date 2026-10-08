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

/** No measured weekly source exists yet. Never infer a trend from demo totals. */
export function buildPartnerWeeklyReportData(_context: WeeklyReportRequestContext): PartnerWeeklyReportData {
  throw new Error("Weekly reporting is unavailable until measured source data is connected.");
}
