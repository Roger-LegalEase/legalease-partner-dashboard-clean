import "server-only";

import { createServerSupabaseAuthClient } from "@/lib/supabase/auth-server";
import { resolveSessionPartner, type PartnerUserRole, type SessionPartner } from "@/lib/partners/session-partner";

export type PartnerDashboardRlsData =
  | {
      kind: "partner";
      authUserId: string;
      partnerSlug: string;
      role: PartnerUserRole;
      partner: PartnerDashboardPartner | null;
      metrics: PartnerDashboardMetrics | null;
      intake: PartnerDashboardIntakeSummary;
      documents: PartnerDashboardDocumentSummary;
      briefcaseItems: number;
      warnings: string[];
    }
  | {
      kind: "internal_admin";
      authUserId: string;
      redirectTo: "/dashboard/partners";
    };

export type PartnerDashboardPartner = {
  partnerSlug: string;
  partnerName: string;
  organizationName?: string;
  programName?: string;
  serviceArea?: string;
  targetState?: string;
  targetCounty?: string;
};

export type PartnerDashboardMetrics = {
  referrals: number;
  screenings: number;
  likelyEligible: number;
  productStarts: number;
  packetsReady: number;
  filings: number;
  outcomesAvailable: number;
};

export type PartnerDashboardIntakeSummary = {
  totalSessions: number;
  completedSessions: number;
  needsReviewSessions: number;
  latestIntakeDate?: string;
};

export type PartnerDashboardDocumentSummary = {
  totalPackets: number;
  missingInformationPackets: number;
  readyForReviewPackets: number;
  latestPacketDate?: string;
};

type PartnerRecordRow = {
  partner_slug: string;
  partner_name: string | null;
  organization_name: string | null;
  program_name: string | null;
  service_area: string | null;
  target_state: string | null;
  target_county: string | null;
};

type PartnerMetricsRow = {
  referrals: number | null;
  screenings: number | null;
  likely_eligible: number | null;
  product_starts: number | null;
  packets_ready: number | null;
  filings: number | null;
  outcomes_available: number | null;
};

type IntakeSessionRow = {
  status: string | null;
  eligibility_signal: string | null;
  created_at: string | null;
  completed_at: string | null;
};

type DocumentPacketRow = {
  status: string | null;
  created_at: string | null;
};

export async function getPartnerDashboardRlsData(): Promise<PartnerDashboardRlsData> {
  const sessionPartner = await resolveSessionPartner();

  if (sessionPartner.kind === "internal_admin") {
    return {
      kind: "internal_admin",
      authUserId: sessionPartner.authUserId,
      redirectTo: "/dashboard/partners"
    };
  }

  return loadPartnerDashboardForSession(sessionPartner);
}

async function loadPartnerDashboardForSession(sessionPartner: Extract<SessionPartner, { kind: "partner" }>): Promise<PartnerDashboardRlsData> {
  const supabase = await createServerSupabaseAuthClient();
  const warnings: string[] = [];

  const [
    partnerResult,
    metricsResult,
    intakeResult,
    documentResult,
    briefcaseResult
  ] = await Promise.all([
    supabase
      .from("partner_records")
      .select("partner_slug, partner_name, organization_name, program_name, service_area, target_state, target_county")
      .maybeSingle(),
    supabase
      .from("partner_metrics")
      .select("referrals, screenings, likely_eligible, product_starts, packets_ready, filings, outcomes_available")
      .maybeSingle(),
    supabase
      .from("rcap_intake_sessions")
      .select("status, eligibility_signal, created_at, completed_at")
      .order("created_at", { ascending: false })
      .limit(250),
    supabase
      .from("rcap_document_packets")
      .select("status, created_at")
      .order("created_at", { ascending: false })
      .limit(250),
    supabase
      .from("rcap_briefcase_items")
      .select("id", { count: "exact", head: true })
  ]);

  if (partnerResult.error) {
    warnings.push(`Partner record unavailable: ${partnerResult.error.message}`);
  }

  if (metricsResult.error) {
    warnings.push(`Partner metrics unavailable: ${metricsResult.error.message}`);
  }

  if (intakeResult.error) {
    warnings.push(`Intake summary unavailable: ${intakeResult.error.message}`);
  }

  if (documentResult.error) {
    warnings.push(`Document summary unavailable: ${documentResult.error.message}`);
  }

  if (briefcaseResult.error) {
    warnings.push(`Briefcase count unavailable: ${briefcaseResult.error.message}`);
  }

  return {
    kind: "partner",
    authUserId: sessionPartner.authUserId,
    partnerSlug: sessionPartner.partnerSlug,
    role: sessionPartner.role,
    partner: mapPartner(partnerResult.data as PartnerRecordRow | null, sessionPartner.partnerSlug),
    metrics: mapMetrics(metricsResult.data as PartnerMetricsRow | null),
    intake: summarizeIntake((intakeResult.data ?? []) as IntakeSessionRow[]),
    documents: summarizeDocuments((documentResult.data ?? []) as DocumentPacketRow[]),
    briefcaseItems: briefcaseResult.count ?? 0,
    warnings
  };
}

function mapPartner(row: PartnerRecordRow | null, sessionPartnerSlug: string): PartnerDashboardPartner | null {
  if (!row) {
    return null;
  }

  if (row.partner_slug !== sessionPartnerSlug) {
    return null;
  }

  return {
    partnerSlug: row.partner_slug,
    partnerName: row.partner_name ?? row.partner_slug,
    organizationName: row.organization_name ?? undefined,
    programName: row.program_name ?? undefined,
    serviceArea: row.service_area ?? undefined,
    targetState: row.target_state ?? undefined,
    targetCounty: row.target_county ?? undefined
  };
}

function mapMetrics(row: PartnerMetricsRow | null): PartnerDashboardMetrics | null {
  if (!row) {
    return null;
  }

  return {
    referrals: row.referrals ?? 0,
    screenings: row.screenings ?? 0,
    likelyEligible: row.likely_eligible ?? 0,
    productStarts: row.product_starts ?? 0,
    packetsReady: row.packets_ready ?? 0,
    filings: row.filings ?? 0,
    outcomesAvailable: row.outcomes_available ?? 0
  };
}

function summarizeIntake(rows: IntakeSessionRow[]): PartnerDashboardIntakeSummary {
  return {
    totalSessions: rows.length,
    completedSessions: rows.filter((row) => row.status === "completed" || Boolean(row.completed_at)).length,
    needsReviewSessions: rows.filter((row) => row.status === "needs_review" || row.eligibility_signal === "human_review_recommended").length,
    latestIntakeDate: rows[0]?.created_at ?? undefined
  };
}

function summarizeDocuments(rows: DocumentPacketRow[]): PartnerDashboardDocumentSummary {
  return {
    totalPackets: rows.length,
    missingInformationPackets: rows.filter((row) => row.status === "missing_information").length,
    readyForReviewPackets: rows.filter((row) => row.status === "ready_for_review" || row.status === "preview_generated").length,
    latestPacketDate: rows[0]?.created_at ?? undefined
  };
}
