import {
  campaigns,
  dropOffPoints,
  eligibilityBreakdown,
  kpis,
  productStarts,
  recentActivity,
  stateBreakdown
} from "@/lib/partner-dashboard-data";
import { getRcapPersonOutcomeSummary } from "@/lib/rcap/person-identity";
import { getSupabaseAdminClient } from "@/lib/supabase/server";

export type FinalImpactReportRequestContext = {
  partnerId: string;
  partnerName: string;
  dateRange?: string;
  state?: string;
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
    distinctPeopleHelped: number;
    actualReliefDelivered: number;
    outcomesPending: number;
    pageVisits: number;
    intakeStarts: number;
    missingDocuments: number;
    filingFeeBarrier: number;
    durableRecords: number;
    auditTrailEvents: number;
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
  dataSource: "live_supabase" | "seed_dev" | "live_empty";
  reliefOutcomePeople: Record<string, number>;
};

export async function buildPartnerFinalImpactReportData(context: FinalImpactReportRequestContext): Promise<FinalImpactReportData> {
  if (shouldUseSeedFinalImpactReportData()) return buildSeedPartnerFinalImpactReportData(context);
  return buildLivePartnerFinalImpactReportData(context);
}

async function buildLivePartnerFinalImpactReportData(context: FinalImpactReportRequestContext): Promise<FinalImpactReportData> {
  const supabase = getSupabaseAdminClient();
  if (!supabase) return buildEmptyLiveFinalImpactReportData(context);

  const period = resolveReportPeriod(context.dateRange);
  const partnerSlug = context.partnerId;
  let intakeQuery = supabase
    .from("rcap_intake_sessions")
    .select("id, status, eligibility_signal, person_id, state, county, created_at, completed_at")
    .eq("partner_slug", partnerSlug);
  let packetQuery = supabase
    .from("rcap_document_packets")
    .select("id, status, relief_outcome, person_id, state, county, created_at, completed_at")
    .eq("partner_slug", partnerSlug);
  let eventQuery = supabase
    .from("rcap_record_events")
    .select("id, record_type, event_type, record_id, occurred_at")
    .eq("partner_slug", partnerSlug);

  if (period.startAt) {
    intakeQuery = intakeQuery.gte("created_at", period.startAt);
    packetQuery = packetQuery.gte("created_at", period.startAt);
    eventQuery = eventQuery.gte("occurred_at", period.startAt);
  }
  if (period.endAt) {
    intakeQuery = intakeQuery.lte("created_at", period.endAt);
    packetQuery = packetQuery.lte("created_at", period.endAt);
    eventQuery = eventQuery.lte("occurred_at", period.endAt);
  }
  if (context.state && context.state !== "All States") {
    intakeQuery = intakeQuery.eq("state", context.state);
    packetQuery = packetQuery.eq("state", context.state);
  }

  const [intakeResult, packetResult, eventResult, personOutcomeSummary] = await Promise.all([
    intakeQuery,
    packetQuery,
    eventQuery,
    getRcapPersonOutcomeSummary(supabase, partnerSlug, {
      startAt: period.startAt,
      endAt: period.endAt,
      state: context.state
    })
  ]);

  if (intakeResult.error || packetResult.error || eventResult.error) return buildEmptyLiveFinalImpactReportData(context);

  const intakeRows = (intakeResult.data ?? []) as LiveIntakeRow[];
  const packetRows = (packetResult.data ?? []) as LivePacketRow[];
  const eventRows = (eventResult.data ?? []) as LiveEventRow[];

  const reliefOutcomePeople = personOutcomeSummary.reliefOutcomePeople;
  const packetPeople = distinctNonNull(packetRows.map((row) => row.person_id));
  const intakePeople = distinctNonNull(intakeRows.map((row) => row.person_id));
  const distinctPeopleHelped = personOutcomeSummary.distinctPeople || unionSize(intakePeople, packetPeople);
  const completedStatuses = new Set(["ready_for_review", "preview_generated", "exported"]);
  const filedPeople =
    (reliefOutcomePeople.filed_pending ?? 0) +
    (reliefOutcomePeople.relief_granted ?? 0) +
    (reliefOutcomePeople.relief_partially_granted ?? 0) +
    (reliefOutcomePeople.relief_denied ?? 0) +
    (reliefOutcomePeople.relief_unavailable ?? 0) +
    (reliefOutcomePeople.withdrawn ?? 0);
  const outcomeReported =
    (reliefOutcomePeople.relief_granted ?? 0) +
    (reliefOutcomePeople.relief_partially_granted ?? 0) +
    (reliefOutcomePeople.relief_denied ?? 0) +
    (reliefOutcomePeople.relief_unavailable ?? 0) +
    (reliefOutcomePeople.withdrawn ?? 0);
  const actualReliefDelivered = personOutcomeSummary.actualReliefDeliveredPeople;
  const screenings = intakeRows.filter((row) => row.completed_at || row.status === "completed" || row.status === "needs_review").length;
  const likelyEligible = intakeRows.filter((row) => isLikelyEligibleSignal(row.eligibility_signal)).length;
  const needsReview = intakeRows.filter((row) => row.status === "needs_review" || row.eligibility_signal === "human_review_recommended").length;
  const packetReady = packetRows.filter((row) => completedStatuses.has(row.status ?? "")).length;
  const packetStarted = packetRows.length;
  const referrals = distinctPeopleHelped || intakeRows.length;
  const productStartTotal = packetStarted;
  const outcomesPending = reliefOutcomePeople.filed_pending ?? 0;
  const jurisdictionRows = buildJurisdictionRows(intakeRows, packetRows);

  const metrics = {
    referrals,
    screenings,
    likelyEligible,
    needsReview,
    notLikelyReady: Math.max(screenings - likelyEligible - needsReview, 0),
    recordShieldStarts: 0,
    expungementStarts: packetStarted,
    productStarts: productStartTotal,
    packetStarted,
    packetReady,
    filedMatters: filedPeople,
    outcomesAvailable: outcomeReported,
    distinctPeopleHelped,
    actualReliefDelivered,
    outcomesPending,
    pageVisits: 0,
    intakeStarts: intakeRows.length,
    missingDocuments: packetRows.filter((row) => row.status === "missing_information").length,
    filingFeeBarrier: 0,
    durableRecords: intakeRows.length + packetRows.length,
    auditTrailEvents: eventRows.length
  };

  return assembleFinalImpactReportData({
    context,
    metrics,
    stateLabel: context.state && context.state !== "All States" ? context.state : "All States",
    dateRangeLabel: context.dateRange ?? "Last 90 days",
    reportPeriod: buildReportPeriod(context.dateRange),
    routingRows: jurisdictionRows.length > 0 ? jurisdictionRows : [{ label: "No recorded jurisdictions yet", count: 0, conversion: "No durable records" }],
    outcomeRows: buildLiveOutcomeRows(metrics, reliefOutcomePeople),
    outreachRows: [{ label: "Durable RCAP records", count: metrics.durableRecords, conversion: `${metrics.auditTrailEvents} audit events` }],
    dropOffPoints: buildLiveDropOffPoints(metrics),
    campaignNames: ["Live RCAP durable records"],
    topStates: jurisdictionRows.slice(0, 3).map((row) => row.label),
    recentActivityCount: eventRows.length,
    dataSource: "live_supabase",
    reliefOutcomePeople
  });
}

function buildSeedPartnerFinalImpactReportData(context: FinalImpactReportRequestContext): FinalImpactReportData {
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
  const distinctPeopleHelped = 0;
  const actualReliefDelivered = 0;
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
    distinctPeopleHelped,
    actualReliefDelivered,
    outcomesPending,
    pageVisits,
    intakeStarts,
    missingDocuments,
    filingFeeBarrier,
    durableRecords: 0,
    auditTrailEvents: 0
  };

  return assembleFinalImpactReportData({
    context,
    metrics,
    stateLabel,
    dateRangeLabel: context.dateRange ?? "Last 90 days",
    reportPeriod: buildReportPeriod(context.dateRange),
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
    recentActivityCount: recentActivity.filter((activity) => !context.state || context.state === "All States" || activity.state === context.state).length,
    dataSource: "seed_dev",
    reliefOutcomePeople: {}
  });
}

type FinalImpactMetrics = FinalImpactReportData["metrics"];
type LiveIntakeRow = {
  id: string;
  status: string | null;
  eligibility_signal: string | null;
  person_id: string | null;
  state: string | null;
  county: string | null;
  created_at: string | null;
  completed_at: string | null;
};
type LivePacketRow = {
  id: string;
  status: string | null;
  relief_outcome: string | null;
  person_id: string | null;
  state: string | null;
  county: string | null;
  created_at: string | null;
  completed_at: string | null;
};
type LiveEventRow = {
  id: string;
  record_type: string | null;
  event_type: string | null;
  record_id: string | null;
  occurred_at: string | null;
};

function assembleFinalImpactReportData({
  context,
  metrics,
  stateLabel,
  dateRangeLabel,
  reportPeriod,
  routingRows,
  outcomeRows,
  outreachRows,
  dropOffPoints: reportDropOffPoints,
  campaignNames,
  topStates,
  recentActivityCount,
  dataSource,
  reliefOutcomePeople
}: {
  context: FinalImpactReportRequestContext;
  metrics: FinalImpactMetrics;
  stateLabel: string;
  dateRangeLabel: string;
  reportPeriod: string;
  routingRows: FinalImpactTableRow[];
  outcomeRows: FinalImpactTableRow[];
  outreachRows: FinalImpactTableRow[];
  dropOffPoints: FinalImpactReportData["dropOffPoints"];
  campaignNames: string[];
  topStates: string[];
  recentActivityCount: number;
  dataSource: FinalImpactReportData["dataSource"];
  reliefOutcomePeople: Record<string, number>;
}): FinalImpactReportData {
  return {
    partnerId: context.partnerId,
    partnerName: context.partnerName,
    stateLabel,
    dateRangeLabel,
    reportDate: formatDate(new Date()),
    reportPeriod,
    metrics,
    heroMetrics: [
      { label: "People Served", value: metrics.distinctPeopleHelped, note: "Distinct people, not record rows" },
      { label: "Completed Screenings", value: metrics.screenings, note: "Durable intake records" },
      { label: "Likely Eligible", value: metrics.likelyEligible, note: "Screening result, not a legal determination" },
      { label: "Packets Completed", value: metrics.packetReady, note: "Durable packet records" },
      { label: "Relief Delivered", value: metrics.actualReliefDelivered, note: "Distinct people granted or partially granted relief" },
      { label: "Audit Events", value: metrics.auditTrailEvents, note: "Immutable rcap_record_events trail" }
    ],
    funnel: buildFunnel(metrics),
    metricRows: buildMetricRows(metrics),
    routingRows,
    outcomeRows,
    outreachRows,
    dropOffPoints: reportDropOffPoints,
    campaignNames,
    topStates,
    recentActivityCount,
    dataSource,
    reliefOutcomePeople
  };
}

function buildEmptyLiveFinalImpactReportData(context: FinalImpactReportRequestContext): FinalImpactReportData {
  const emptyMetrics = emptyFinalImpactMetrics();
  return assembleFinalImpactReportData({
    context,
    metrics: emptyMetrics,
    stateLabel: context.state && context.state !== "All States" ? context.state : "All States",
    dateRangeLabel: context.dateRange ?? "Last 90 days",
    reportPeriod: buildReportPeriod(context.dateRange),
    routingRows: [{ label: "No recorded jurisdictions yet", count: 0, conversion: "No durable records" }],
    outcomeRows: buildLiveOutcomeRows(emptyMetrics, {}),
    outreachRows: [{ label: "Durable RCAP records", count: 0, conversion: "0 audit events" }],
    dropOffPoints: buildLiveDropOffPoints(emptyMetrics),
    campaignNames: ["No live RCAP records yet"],
    topStates: [],
    recentActivityCount: 0,
    dataSource: "live_empty",
    reliefOutcomePeople: {}
  });
}

function emptyFinalImpactMetrics(): FinalImpactMetrics {
  return {
    referrals: 0,
    screenings: 0,
    likelyEligible: 0,
    needsReview: 0,
    notLikelyReady: 0,
    recordShieldStarts: 0,
    expungementStarts: 0,
    productStarts: 0,
    packetStarted: 0,
    packetReady: 0,
    filedMatters: 0,
    outcomesAvailable: 0,
    distinctPeopleHelped: 0,
    actualReliefDelivered: 0,
    outcomesPending: 0,
    pageVisits: 0,
    intakeStarts: 0,
    missingDocuments: 0,
    filingFeeBarrier: 0,
    durableRecords: 0,
    auditTrailEvents: 0
  };
}

function buildLiveOutcomeRows(metrics: FinalImpactMetrics, reliefOutcomePeople: Record<string, number>): FinalImpactTableRow[] {
  return [
    { label: "Relief granted", count: reliefOutcomePeople.relief_granted ?? 0, conversion: "Actual relief delivered" },
    { label: "Partial relief granted", count: reliefOutcomePeople.relief_partially_granted ?? 0, conversion: "Actual relief delivered" },
    { label: "Filed pending", count: reliefOutcomePeople.filed_pending ?? 0, conversion: "Filed, awaiting outcome" },
    { label: "Relief denied", count: reliefOutcomePeople.relief_denied ?? 0, conversion: "Outcome recorded" },
    { label: "Not recorded", count: reliefOutcomePeople.not_recorded ?? 0, conversion: metrics.durableRecords ? "No recorded outcomes yet" : "No durable records yet" },
    { label: "Audit trail events", count: metrics.auditTrailEvents, conversion: "rcap_record_events" }
  ];
}

function buildLiveDropOffPoints(metrics: FinalImpactMetrics) {
  return [
    {
      label: "No recorded outcomes yet",
      count: Math.max(metrics.packetReady - metrics.outcomesAvailable, 0),
      percentage: percent(Math.max(metrics.packetReady - metrics.outcomesAvailable, 0), metrics.packetReady),
      action: "Continue outcome follow-up only where durable packet records exist."
    },
    {
      label: "Filed pending",
      count: metrics.outcomesPending,
      percentage: percent(metrics.outcomesPending, metrics.filedMatters),
      action: "Track court or partner updates without counting pending matters as delivered relief."
    }
  ];
}

function buildJurisdictionRows(intakeRows: LiveIntakeRow[], packetRows: LivePacketRow[]): FinalImpactTableRow[] {
  const counts = new Map<string, { people: Set<string>; records: number }>();
  for (const row of [...intakeRows, ...packetRows]) {
    const label = [row.state ?? "Unknown state", row.county].filter(Boolean).join(" / ");
    const current = counts.get(label) ?? { people: new Set<string>(), records: 0 };
    current.records += 1;
    if (row.person_id) current.people.add(row.person_id);
    counts.set(label, current);
  }

  return Array.from(counts.entries())
    .map(([label, value]) => ({
      label,
      count: value.people.size || value.records,
      conversion: `${value.records} durable records`
    }))
    .sort((left, right) => right.count - left.count);
}

function resolveReportPeriod(label = "Last 90 days") {
  const now = new Date();
  if (label === "Year to date") return { startAt: new Date(Date.UTC(now.getUTCFullYear(), 0, 1)).toISOString(), endAt: now.toISOString() };
  if (label === "All time") return {};
  const days = Number(label.match(/Last\s+(\d+)\s+days/i)?.[1] ?? 90);
  return { startAt: new Date(now.getTime() - days * 24 * 60 * 60 * 1000).toISOString(), endAt: now.toISOString() };
}

function distinctNonNull(values: Array<string | null>) {
  return new Set(values.filter((value): value is string => Boolean(value)));
}

function unionSize(left: Set<string>, right: Set<string>) {
  return new Set([...left, ...right]).size;
}

function isLikelyEligibleSignal(value: string | null) {
  return value === "possible_pathway" || value === "possible_expungement_path" || value === "possible_sealing_path";
}

function shouldUseSeedFinalImpactReportData() {
  return process.env.LEGALEASE_FINAL_IMPACT_REPORT_USE_SEED_FIXTURES === "true" && process.env.NODE_ENV !== "production";
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
    { label: "Distinct people helped", count: metrics.distinctPeopleHelped, color: "orange" as const },
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
    { label: "Distinct people helped", count: metrics.distinctPeopleHelped, conversion: "Deduped by person identity" },
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
