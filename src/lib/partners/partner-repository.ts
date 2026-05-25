import { getSupabaseAdminClient, isSupabaseConfigured } from "@/lib/supabase/server";
import { seedPartners } from "./seed-partners";
import type {
  PartnerAsset,
  PartnerAssetKey,
  PartnerAssetStatus,
  PartnerMetrics,
  PartnerOrganizationType,
  PartnerPaymentStatus,
  PartnerProvisioningStatus,
  PartnerQualificationStatus,
  PartnerRecord,
  ProgramTier,
  RecordClearingNeed
} from "./types";

export type PartnerRepositoryMode = "local_seeded" | "local_fallback" | "supabase";

type PartnerRecordRow = {
  partner_id: string;
  partner_slug: string;
  partner_name: string;
  contact_name: string | null;
  contact_email: string | null;
  website: string | null;
  organization_type: string | null;
  region: string | null;
  state: string | null;
  estimated_users_90_days: number | null;
  record_clearing_needs: string[] | null;
  program_goal: string | null;
  program_tier: string;
  payment_status: string;
  qualification_status: string;
  provisioning_status: string;
  assigned_owner: string | null;
  launch_date_target: string | null;
  compliance_notes: string | null;
  created_at: string | null;
  updated_at: string | null;
};

type PartnerAssetRow = {
  partner_slug: string;
  asset_key: string;
  label: string;
  description: string | null;
  status: string;
  route: string | null;
  owner: string | null;
  next_action: string | null;
};

type PartnerMetricsRow = {
  partner_slug: string;
  referrals: number | null;
  screenings: number | null;
  likely_eligible: number | null;
  product_starts: number | null;
  packets_ready: number | null;
  filings: number | null;
  outcomes_available: number | null;
};

export async function getPartnerRepositoryMode(): Promise<PartnerRepositoryMode> {
  if (!isSupabasePartnerDataEnabled()) {
    return "local_seeded";
  }

  return isSupabaseConfigured() ? "supabase" : "local_fallback";
}

export async function getAllPartnerRecords(): Promise<PartnerRecord[]> {
  if (!(await shouldReadSupabase())) {
    return seedPartners;
  }

  try {
    const supabase = getSupabaseAdminClient();
    if (!supabase) {
      return seedPartners;
    }

    const [{ data: recordRows, error: recordsError }, { data: assetRows, error: assetsError }, { data: metricsRows, error: metricsError }] =
      await Promise.all([
        supabase.from("partner_records").select("*").order("created_at", { ascending: true }),
        supabase.from("partner_assets").select("*").order("asset_key", { ascending: true }),
        supabase.from("partner_metrics").select("*")
      ]);

    if (recordsError || assetsError || metricsError || !recordRows) {
      return seedPartners;
    }

    return (recordRows as PartnerRecordRow[]).map((row) =>
      mapPartnerRecordRow(row, assetRows as PartnerAssetRow[] | null, metricsRows as PartnerMetricsRow[] | null)
    );
  } catch {
    return seedPartners;
  }
}

export async function getPartnerRecordBySlug(slug: string): Promise<PartnerRecord | undefined> {
  const partners = await getAllPartnerRecords();
  return partners.find((partner) => partner.partnerSlug === slug);
}

export async function getPartnerRecordById(partnerId: string): Promise<PartnerRecord | undefined> {
  const partners = await getAllPartnerRecords();
  return partners.find((partner) => partner.partnerId === partnerId);
}

export async function getPartnerAssetsBySlug(slug: string): Promise<PartnerAsset[]> {
  const partner = await getPartnerRecordBySlug(slug);
  return partner ? Object.values(partner.assets) : [];
}

export async function getPartnerMetricsBySlug(slug: string): Promise<PartnerMetrics | undefined> {
  return (await getPartnerRecordBySlug(slug))?.metrics;
}

function isSupabasePartnerDataEnabled(): boolean {
  return process.env.ENABLE_SUPABASE_PARTNER_DATA === "true";
}

async function shouldReadSupabase(): Promise<boolean> {
  return (await getPartnerRepositoryMode()) === "supabase";
}

function mapPartnerRecordRow(
  row: PartnerRecordRow,
  assetRows: PartnerAssetRow[] | null,
  metricsRows: PartnerMetricsRow[] | null
): PartnerRecord {
  const seedPartner = seedPartners.find((partner) => partner.partnerSlug === row.partner_slug);
  const assets = mapAssets(row.partner_slug, assetRows, seedPartner?.assets);
  const metrics = mapMetrics(row.partner_slug, metricsRows, seedPartner?.metrics);

  return {
    partnerId: row.partner_id,
    partnerSlug: row.partner_slug,
    partnerName: row.partner_name,
    contactName: row.contact_name ?? "",
    contactEmail: row.contact_email ?? "",
    website: row.website ?? "",
    organizationType: (row.organization_type ?? "other") as PartnerOrganizationType,
    region: row.region ?? "",
    state: row.state ?? "",
    estimatedUsers90Days: row.estimated_users_90_days ?? 0,
    recordClearingNeeds: (row.record_clearing_needs ?? []) as RecordClearingNeed[],
    programGoal: row.program_goal ?? "",
    programTier: row.program_tier as ProgramTier,
    paymentStatus: row.payment_status as PartnerPaymentStatus,
    qualificationStatus: row.qualification_status as PartnerQualificationStatus,
    provisioningStatus: row.provisioning_status as PartnerProvisioningStatus,
    assignedOwner: row.assigned_owner ?? "",
    launchDateTarget: row.launch_date_target ?? "",
    createdAt: row.created_at ?? "",
    updatedAt: row.updated_at ?? "",
    assets,
    metrics,
    complianceNotes: row.compliance_notes ?? seedPartner?.complianceNotes ?? ""
  };
}

function mapAssets(
  slug: string,
  rows: PartnerAssetRow[] | null,
  fallbackAssets?: PartnerRecord["assets"]
): PartnerRecord["assets"] {
  const assets = fallbackAssets ? { ...fallbackAssets } : ({} as PartnerRecord["assets"]);

  for (const row of rows?.filter((asset) => asset.partner_slug === slug) ?? []) {
    const key = row.asset_key as PartnerAssetKey;
    assets[key] = {
      key,
      label: row.label,
      description: row.description ?? "",
      status: row.status as PartnerAssetStatus,
      route: row.route ?? undefined,
      owner: row.owner ?? "",
      nextAction: row.next_action ?? ""
    };
  }

  return assets;
}

function mapMetrics(
  slug: string,
  rows: PartnerMetricsRow[] | null,
  fallbackMetrics?: PartnerMetrics
): PartnerMetrics {
  const row = rows?.find((metrics) => metrics.partner_slug === slug);

  return {
    referrals: row?.referrals ?? fallbackMetrics?.referrals ?? 0,
    screenings: row?.screenings ?? fallbackMetrics?.screenings ?? 0,
    likelyEligible: row?.likely_eligible ?? fallbackMetrics?.likelyEligible ?? 0,
    productStarts: row?.product_starts ?? fallbackMetrics?.productStarts ?? 0,
    packetsReady: row?.packets_ready ?? fallbackMetrics?.packetsReady ?? 0,
    filings: row?.filings ?? fallbackMetrics?.filings ?? 0,
    outcomesAvailable: row?.outcomes_available ?? fallbackMetrics?.outcomesAvailable ?? 0
  };
}
