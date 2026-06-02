import { getSupabaseAdminClient, isSupabaseConfigured } from "@/lib/supabase/server";
import type { PartnerOnboardingInput } from "./onboarding";
import { seedPartners } from "./seed-partners";
import type {
  PartnerAsset,
  PartnerAssetKey,
  PartnerAssetStatus,
  PartnerEmailDeliveryRecord,
  PartnerEmailStatus,
  PartnerEmailType,
  PartnerMetrics,
  PartnerOrganizationType,
  PartnerPaymentStatus,
  PartnerProvisioningStatus,
  PartnerQualificationStatus,
  PartnerRecord,
  PartnerWriteResult,
  ProgramTier,
  RecordClearingNeed
} from "./types";

type PartnerEventPayload = Record<string, string | number | boolean | null>;

export type PartnerRepositoryMode = "local_seeded" | "local_fallback" | "supabase";

type PartnerRecordRow = {
  partner_id: string;
  partner_slug: string;
  partner_name: string;
  contact_name: string | null;
  contact_email: string | null;
  organization_name: string | null;
  legal_name: string | null;
  primary_contact_name: string | null;
  primary_contact_title: string | null;
  primary_contact_email: string | null;
  primary_contact_phone: string | null;
  website: string | null;
  organization_type: string | null;
  program_name: string | null;
  program_description: string | null;
  target_state: string | null;
  target_county: string | null;
  target_city: string | null;
  service_area: string | null;
  expected_monthly_participants: number | null;
  expected_launch_date: string | null;
  referral_sources: string | null;
  audience_description: string | null;
  branding_notes: string | null;
  logo_url: string | null;
  onboarding_status: string | null;
  onboarding_started_at: string | null;
  onboarding_completed_at: string | null;
  region: string | null;
  state: string | null;
  estimated_users_90_days: number | null;
  record_clearing_needs: string[] | null;
  program_goal: string | null;
  program_tier: string;
  selected_package_id: string | null;
  selected_package_name: string | null;
  payment_status: string;
  qualification_status: string;
  provisioning_status: string;
  stripe_checkout_session_id: string | null;
  stripe_customer_id: string | null;
  stripe_payment_intent_id: string | null;
  paid_at: string | null;
  payment_amount: number | null;
  payment_currency: string | null;
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

type PartnerEmailDeliveryRow = {
  id: string;
  partner_slug: string;
  email_type: string;
  recipient_email: string | null;
  recipient_name: string | null;
  subject: string;
  status: string;
  provider: string | null;
  provider_message_id: string | null;
  preview_url: string | null;
  sent_at: string | null;
  failed_at: string | null;
  error_message: string | null;
  created_at: string | null;
  updated_at: string | null;
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

export async function getPartnerEmailDeliveryRecords(slug: string): Promise<PartnerEmailDeliveryRecord[]> {
  if (!(await shouldReadSupabase())) {
    return [];
  }

  try {
    const supabase = getSupabaseAdminClient();
    if (!supabase) {
      return [];
    }

    const { data, error } = await supabase
      .from("partner_email_deliveries")
      .select("*")
      .eq("partner_slug", slug)
      .order("created_at", { ascending: false });

    if (error || !data) {
      return [];
    }

    return (data as PartnerEmailDeliveryRow[]).map(mapPartnerEmailDeliveryRow);
  } catch {
    return [];
  }
}

export async function updatePartnerPaymentStatus(
  slug: string,
  paymentStatus: PartnerPaymentStatus
): Promise<PartnerWriteResult> {
  return updatePartnerRecordField(slug, "payment_status", paymentStatus, "update_partner_payment_status");
}

export async function markPartnerCheckoutStarted({
  slug,
  selectedPackageId,
  selectedPackageName
}: {
  slug: string;
  selectedPackageId: string;
  selectedPackageName: string;
}): Promise<PartnerWriteResult> {
  return updatePartnerRecordFields(
    slug,
    {
      selected_package_id: selectedPackageId,
      selected_package_name: selectedPackageName,
      payment_status: "checkout_started",
      provisioning_status: "blocked_payment_required"
    },
    "mark_partner_checkout_started"
  );
}

export async function activatePaidPartnerProvisioning({
  slug,
  selectedPackageId,
  selectedPackageName,
  stripeCheckoutSessionId,
  stripeCustomerId,
  stripePaymentIntentId,
  paidAt,
  paymentAmount,
  paymentCurrency
}: {
  slug: string;
  selectedPackageId: string;
  selectedPackageName: string;
  stripeCheckoutSessionId: string;
  stripeCustomerId?: string;
  stripePaymentIntentId?: string;
  paidAt: string;
  paymentAmount?: number;
  paymentCurrency?: string;
}): Promise<PartnerWriteResult> {
  return updatePartnerRecordFields(
    slug,
    {
      selected_package_id: selectedPackageId,
      selected_package_name: selectedPackageName,
      stripe_checkout_session_id: stripeCheckoutSessionId,
      stripe_customer_id: stripeCustomerId ?? null,
      stripe_payment_intent_id: stripePaymentIntentId ?? null,
      paid_at: paidAt,
      payment_amount: paymentAmount ?? null,
      payment_currency: paymentCurrency ?? null,
      payment_status: "paid",
      provisioning_status: "ready_for_onboarding"
    },
    "activate_paid_partner_provisioning"
  );
}

export async function updatePartnerQualificationStatus(
  slug: string,
  qualificationStatus: PartnerQualificationStatus
): Promise<PartnerWriteResult> {
  return updatePartnerRecordField(slug, "qualification_status", qualificationStatus, "update_partner_qualification_status");
}

export async function updatePartnerProvisioningStatus(
  slug: string,
  provisioningStatus: PartnerProvisioningStatus
): Promise<PartnerWriteResult> {
  return updatePartnerRecordField(slug, "provisioning_status", provisioningStatus, "update_partner_provisioning_status");
}

export async function savePartnerOnboardingProfile({
  input,
  onboardingStatus
}: {
  input: PartnerOnboardingInput;
  onboardingStatus: "in_progress" | "submitted";
}): Promise<PartnerWriteResult> {
  const readiness = await getWriteReadiness(input.partnerSlug, "save_partner_onboarding_profile");
  if (!readiness.ready) {
    return readiness.result;
  }

  if (readiness.partner.paymentStatus !== "paid") {
    return writeFailure(
      input.partnerSlug,
      "save_partner_onboarding_profile",
      readiness.mode,
      "Payment is required before onboarding can be submitted."
    );
  }

  const now = new Date().toISOString();
  const updates: Record<string, string | number | null> = {
    organization_name: nullableString(input.organizationName),
    legal_name: nullableString(input.legalName),
    primary_contact_name: nullableString(input.primaryContactName),
    primary_contact_title: nullableString(input.primaryContactTitle),
    primary_contact_email: nullableString(input.primaryContactEmail),
    primary_contact_phone: nullableString(input.primaryContactPhone),
    website: nullableString(input.website),
    organization_type: nullableString(input.organizationType),
    program_name: nullableString(input.programName),
    program_description: nullableString(input.programDescription),
    target_state: nullableString(input.targetState),
    target_county: nullableString(input.targetCounty),
    target_city: nullableString(input.targetCity),
    service_area: nullableString(input.serviceArea),
    expected_monthly_participants: input.expectedMonthlyParticipants ?? null,
    expected_launch_date: nullableString(input.expectedLaunchDate),
    referral_sources: nullableString(input.referralSources),
    audience_description: nullableString(input.audienceDescription),
    branding_notes: nullableString(input.brandingNotes),
    logo_url: nullableString(input.logoUrl),
    onboarding_status: onboardingStatus,
    onboarding_started_at: readiness.partner.onboardingStartedAt ?? now,
    onboarding_completed_at: onboardingStatus === "submitted" ? now : readiness.partner.onboardingCompletedAt ?? null,
    partner_name: input.organizationName || readiness.partner.partnerName,
    contact_name: input.primaryContactName || readiness.partner.contactName,
    contact_email: input.primaryContactEmail || readiness.partner.contactEmail,
    region: input.serviceArea || input.targetCounty || readiness.partner.region,
    state: input.targetState || readiness.partner.state,
    program_goal: input.programDescription || readiness.partner.programGoal,
    launch_date_target: input.expectedLaunchDate || readiness.partner.launchDateTarget
  };

  return updatePartnerRecordFields(input.partnerSlug, updates, "save_partner_onboarding_profile");
}

export async function updatePartnerAssetStatus(
  slug: string,
  assetKey: PartnerAssetKey,
  status: PartnerAssetStatus
): Promise<PartnerWriteResult> {
  const readiness = await getWriteReadiness(slug, "update_partner_asset_status");
  if (!readiness.ready) {
    return readiness.result;
  }

  const partner = readiness.partner;
  if (!partner.assets[assetKey]) {
    return writeFailure(slug, "update_partner_asset_status", readiness.mode, `Unknown asset key: ${assetKey}.`);
  }

  try {
    const supabase = getSupabaseAdminClient();
    if (!supabase) {
      return localFallbackResult(slug, "update_partner_asset_status");
    }

    const { error } = await supabase
      .from("partner_assets")
      .update({ status, updated_at: new Date().toISOString() })
      .eq("partner_slug", slug)
      .eq("asset_key", assetKey);

    if (error) {
      return writeFailure(slug, "update_partner_asset_status", "supabase", "Supabase asset status update failed.", error.message);
    }

    return supabaseSuccess(slug, "update_partner_asset_status");
  } catch (error) {
    return writeFailure(slug, "update_partner_asset_status", "supabase", "Supabase asset status update failed.", getErrorMessage(error));
  }
}

export async function addPartnerEvent(
  slug: string,
  eventType: string,
  eventLabel: string,
  eventPayload: PartnerEventPayload = {}
): Promise<PartnerWriteResult> {
  const readiness = await getWriteReadiness(slug, "add_partner_event");
  if (!readiness.ready) {
    return readiness.result;
  }

  try {
    const supabase = getSupabaseAdminClient();
    if (!supabase) {
      return localFallbackResult(slug, "add_partner_event");
    }

    const { error } = await supabase.from("partner_events").insert({
      partner_slug: slug,
      event_type: eventType,
      event_label: eventLabel,
      event_payload: eventPayload
    });

    if (error) {
      return writeFailure(slug, "add_partner_event", "supabase", "Supabase partner event insert failed.", error.message);
    }

    return supabaseSuccess(slug, "add_partner_event");
  } catch (error) {
    return writeFailure(slug, "add_partner_event", "supabase", "Supabase partner event insert failed.", getErrorMessage(error));
  }
}

export async function addPartnerInternalNote(
  slug: string,
  note: string,
  author = "LegalEase internal admin"
): Promise<PartnerWriteResult> {
  return addPartnerEvent(slug, "internal_note", "Internal note", {
    note,
    author,
    source: "admin_action"
  });
}

export async function addPartnerEmailDeliveryRecord(
  delivery: Omit<PartnerEmailDeliveryRecord, "id" | "createdAt" | "updatedAt">
): Promise<PartnerWriteResult> {
  const readiness = await getWriteReadiness(delivery.partnerSlug, "add_partner_email_delivery_record");
  if (!readiness.ready) {
    return readiness.result;
  }

  try {
    const supabase = getSupabaseAdminClient();
    if (!supabase) {
      return localFallbackResult(delivery.partnerSlug, "add_partner_email_delivery_record");
    }

    const { error } = await supabase.from("partner_email_deliveries").insert({
      partner_slug: delivery.partnerSlug,
      email_type: delivery.emailType,
      recipient_email: delivery.recipientEmail,
      recipient_name: delivery.recipientName ?? null,
      subject: delivery.subject,
      status: delivery.status,
      provider: delivery.provider ?? null,
      provider_message_id: delivery.providerMessageId ?? null,
      preview_url: delivery.previewUrl ?? null,
      sent_at: delivery.sentAt ?? null,
      failed_at: delivery.failedAt ?? null,
      error_message: delivery.errorMessage ?? null
    });

    if (error) {
      return writeFailure(delivery.partnerSlug, "add_partner_email_delivery_record", "supabase", "Supabase email delivery insert failed.", error.message);
    }

    return supabaseSuccess(delivery.partnerSlug, "add_partner_email_delivery_record");
  } catch (error) {
    return writeFailure(
      delivery.partnerSlug,
      "add_partner_email_delivery_record",
      "supabase",
      "Supabase email delivery insert failed.",
      getErrorMessage(error)
    );
  }
}

export async function activatePartner(slug: string): Promise<PartnerWriteResult> {
  return updatePartnerProvisioningStatus(slug, "provisioned");
}

export async function pausePartner(slug: string): Promise<PartnerWriteResult> {
  return updatePartnerProvisioningStatus(slug, "paused");
}

function isSupabasePartnerDataEnabled(): boolean {
  return process.env.ENABLE_SUPABASE_PARTNER_DATA === "true";
}

async function shouldReadSupabase(): Promise<boolean> {
  return (await getPartnerRepositoryMode()) === "supabase";
}

type WriteReadiness =
  | {
      ready: true;
      mode: "supabase";
      partner: PartnerRecord;
    }
  | {
      ready: false;
      result: PartnerWriteResult;
      mode: PartnerRepositoryMode;
    };

async function getWriteReadiness(slug: string, action: string): Promise<WriteReadiness> {
  const mode = await getPartnerRepositoryMode();
  const partner = await getPartnerRecordBySlug(slug);

  if (!partner) {
    return {
      ready: false,
      mode,
      result: writeFailure(slug, action, mode, `Partner ${slug} was not found.`)
    };
  }

  if (mode === "local_seeded") {
    return {
      ready: false,
      mode,
      result: localSeededResult(slug, action)
    };
  }

  if (mode === "local_fallback") {
    return {
      ready: false,
      mode,
      result: localFallbackResult(slug, action)
    };
  }

  const supabasePartnerExists = await partnerExistsInSupabase(slug);
  if (supabasePartnerExists !== true) {
    return {
      ready: false,
      mode,
      result: writeFailure(
        slug,
        action,
        mode,
        supabasePartnerExists === false ? `Partner ${slug} was not found.` : "Unable to verify partner before Supabase write.",
        supabasePartnerExists === false ? undefined : supabasePartnerExists
      )
    };
  }

  return {
    ready: true,
    mode,
    partner
  };
}

async function partnerExistsInSupabase(slug: string): Promise<true | false | string> {
  try {
    const supabase = getSupabaseAdminClient();
    if (!supabase) {
      return "Supabase is not configured.";
    }

    const { data, error } = await supabase
      .from("partner_records")
      .select("partner_slug")
      .eq("partner_slug", slug)
      .maybeSingle();

    if (error) {
      return error.message;
    }

    return Boolean(data);
  } catch (error) {
    return getErrorMessage(error);
  }
}

async function updatePartnerRecordField(
  slug: string,
  column: "payment_status" | "qualification_status" | "provisioning_status",
  value: string,
  action: string
): Promise<PartnerWriteResult> {
  return updatePartnerRecordFields(slug, { [column]: value }, action);
}

async function updatePartnerRecordFields(
  slug: string,
  values: Record<string, string | number | null>,
  action: string
): Promise<PartnerWriteResult> {
  const readiness = await getWriteReadiness(slug, action);
  if (!readiness.ready) {
    return readiness.result;
  }

  try {
    const supabase = getSupabaseAdminClient();
    if (!supabase) {
      return localFallbackResult(slug, action);
    }

    const { error } = await supabase
      .from("partner_records")
      .update({ ...values, updated_at: new Date().toISOString() })
      .eq("partner_slug", slug);

    if (error) {
      return writeFailure(slug, action, "supabase", "Supabase partner record update failed.", error.message);
    }

    return supabaseSuccess(slug, action);
  } catch (error) {
    return writeFailure(slug, action, "supabase", "Supabase partner record update failed.", getErrorMessage(error));
  }
}

function localSeededResult(slug: string, action: string): PartnerWriteResult {
  return {
    success: true,
    persisted: false,
    mode: "local_seeded",
    partnerSlug: slug,
    action,
    message: "Supabase partner data is disabled. Mock action accepted but not persisted."
  };
}

function localFallbackResult(slug: string, action: string): PartnerWriteResult {
  return {
    success: true,
    persisted: false,
    mode: "local_fallback",
    partnerSlug: slug,
    action,
    message: "Supabase is not configured. Mock action accepted but not persisted."
  };
}

function supabaseSuccess(slug: string, action: string): PartnerWriteResult {
  return {
    success: true,
    persisted: true,
    mode: "supabase",
    partnerSlug: slug,
    action,
    message: "Partner record updated."
  };
}

function writeFailure(
  slug: string,
  action: string,
  mode: PartnerRepositoryMode,
  message: string,
  error?: string
): PartnerWriteResult {
  return {
    success: false,
    persisted: false,
    mode,
    partnerSlug: slug,
    action,
    message,
    error
  };
}

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "Unknown Supabase write error.";
}

function nullableString(value: string | undefined): string | null {
  return value?.trim() ? value.trim() : null;
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
    organizationName: row.organization_name ?? row.partner_name ?? seedPartner?.organizationName,
    legalName: row.legal_name ?? seedPartner?.legalName,
    primaryContactName: row.primary_contact_name ?? row.contact_name ?? seedPartner?.primaryContactName,
    primaryContactTitle: row.primary_contact_title ?? seedPartner?.primaryContactTitle,
    primaryContactEmail: row.primary_contact_email ?? row.contact_email ?? seedPartner?.primaryContactEmail,
    primaryContactPhone: row.primary_contact_phone ?? seedPartner?.primaryContactPhone,
    website: row.website ?? "",
    organizationType: (row.organization_type ?? "other") as PartnerOrganizationType,
    programName: row.program_name ?? seedPartner?.programName,
    programDescription: row.program_description ?? row.program_goal ?? seedPartner?.programDescription,
    targetState: row.target_state ?? row.state ?? seedPartner?.targetState,
    targetCounty: row.target_county ?? seedPartner?.targetCounty,
    targetCity: row.target_city ?? seedPartner?.targetCity,
    serviceArea: row.service_area ?? row.region ?? seedPartner?.serviceArea,
    expectedMonthlyParticipants: row.expected_monthly_participants ?? seedPartner?.expectedMonthlyParticipants,
    expectedLaunchDate: row.expected_launch_date ?? row.launch_date_target ?? seedPartner?.expectedLaunchDate,
    referralSources: row.referral_sources ?? seedPartner?.referralSources,
    audienceDescription: row.audience_description ?? seedPartner?.audienceDescription,
    brandingNotes: row.branding_notes ?? seedPartner?.brandingNotes,
    logoUrl: row.logo_url ?? seedPartner?.logoUrl,
    onboardingStatus: (row.onboarding_status ?? seedPartner?.onboardingStatus ?? "not_started") as PartnerRecord["onboardingStatus"],
    onboardingStartedAt: row.onboarding_started_at ?? seedPartner?.onboardingStartedAt,
    onboardingCompletedAt: row.onboarding_completed_at ?? seedPartner?.onboardingCompletedAt,
    region: row.region ?? "",
    state: row.state ?? "",
    estimatedUsers90Days: row.estimated_users_90_days ?? 0,
    recordClearingNeeds: (row.record_clearing_needs ?? []) as RecordClearingNeed[],
    programGoal: row.program_goal ?? "",
    programTier: row.program_tier as ProgramTier,
    selectedPackageId: row.selected_package_id ?? seedPartner?.selectedPackageId,
    selectedPackageName: row.selected_package_name ?? seedPartner?.selectedPackageName,
    paymentStatus: row.payment_status as PartnerPaymentStatus,
    qualificationStatus: row.qualification_status as PartnerQualificationStatus,
    provisioningStatus: row.provisioning_status as PartnerProvisioningStatus,
    stripeCheckoutSessionId: row.stripe_checkout_session_id ?? seedPartner?.stripeCheckoutSessionId,
    stripeCustomerId: row.stripe_customer_id ?? seedPartner?.stripeCustomerId,
    stripePaymentIntentId: row.stripe_payment_intent_id ?? seedPartner?.stripePaymentIntentId,
    paidAt: row.paid_at ?? seedPartner?.paidAt,
    paymentAmount: row.payment_amount ?? seedPartner?.paymentAmount,
    paymentCurrency: row.payment_currency ?? seedPartner?.paymentCurrency,
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

function mapPartnerEmailDeliveryRow(row: PartnerEmailDeliveryRow): PartnerEmailDeliveryRecord {
  return {
    id: row.id,
    partnerSlug: row.partner_slug,
    emailType: row.email_type as PartnerEmailType,
    recipientEmail: row.recipient_email ?? "",
    recipientName: row.recipient_name ?? undefined,
    subject: row.subject,
    status: row.status as PartnerEmailStatus,
    provider: row.provider ?? undefined,
    providerMessageId: row.provider_message_id ?? undefined,
    previewUrl: row.preview_url ?? undefined,
    sentAt: row.sent_at ?? undefined,
    failedAt: row.failed_at ?? undefined,
    errorMessage: row.error_message ?? undefined,
    createdAt: row.created_at ?? undefined,
    updatedAt: row.updated_at ?? undefined
  };
}
