import "server-only";

import { getSupabaseAdminClient } from "@/lib/supabase/server";
import { activatePartner, getPartnerRecordBySlug, pausePartner } from "@/lib/partners/partner-repository";
import { getPartnerAccessMode, updatePartnerAccessMode, type PartnerAccessMode } from "@/lib/partners/partner-access-codes";

// Standardized RCAP partner onboarding workflow. This layer orchestrates the
// existing systems (partner_records profile, partner_entitlement cap/overage,
// partner_records.access_mode, partner_access_codes, partner_users) behind one
// checklist + status model. It never duplicates those systems; packet-credit
// consumption and access-code security are unchanged.

export const ONBOARDING_STATUSES = [
  "draft",
  "setup_in_progress",
  "waiting_on_partner",
  "ready_for_review",
  "ready_to_launch",
  "live",
  "paused"
] as const;
export type OnboardingStatus = (typeof ONBOARDING_STATUSES)[number];

export const AGREEMENT_STATUSES = ["not_sent", "sent", "signed", "waived_internal"] as const;
export type AgreementStatus = (typeof AGREEMENT_STATUSES)[number];

export const TASK_STATUSES = ["not_started", "in_progress", "complete", "blocked", "skipped"] as const;
export type TaskStatus = (typeof TASK_STATUSES)[number];

export type TaskOwner = "legalease" | "partner";

type StandardTask = {
  taskKey: string;
  title: string;
  description: string;
  owner: TaskOwner;
  required: boolean;
  autoComplete?: boolean;
};

// The launch checklist. owner=legalease required items gate go-live; owner=partner
// items are surfaced to partner admins but do not block launch.
export const STANDARD_TASKS: StandardTask[] = [
  { taskKey: "profile_complete", title: "Partner profile complete", description: "Organization name, contact, and jurisdiction are set.", owner: "legalease", required: true },
  { taskKey: "agreement_billing", title: "Agreement and billing configured", description: "Agreement status and billing contact are set.", owner: "legalease", required: true },
  { taskKey: "packet_cap", title: "Packet cap configured", description: "The included packet allocation is set.", owner: "legalease", required: true },
  { taskKey: "overage_pause", title: "Overage and pause-at-cap preference configured", description: "Decide whether to allow $50 overages or pause at the cap.", owner: "legalease", required: true },
  { taskKey: "access_mode", title: "Access mode selected", description: "Open link, optional code, required code, or invite only.", owner: "legalease", required: true },
  { taskKey: "codes_created", title: "Codes created if required", description: "At least one active access code exists when codes are required.", owner: "legalease", required: true },
  { taskKey: "landing_reviewed", title: "Landing page preview reviewed", description: "The co-branded landing page has been previewed and approved.", owner: "legalease", required: true },
  { taskKey: "admin_invited", title: "Partner admin invited", description: "At least one partner admin has been invited.", owner: "legalease", required: true },
  { taskKey: "launch_materials", title: "Launch materials generated", description: "The launch kit (link, QR code, copy) has been generated.", owner: "legalease", required: true },
  { taskKey: "disclaimers_visible", title: "Disclaimers visible", description: "Not-legal-advice and no-guarantee disclaimers appear on the partner page.", owner: "legalease", required: true, autoComplete: true },
  { taskKey: "internal_approval", title: "Internal approval completed", description: "LegalEase has reviewed and approved this partner for launch.", owner: "legalease", required: true },
  // Partner-owned (do not block launch)
  { taskKey: "partner_upload_logo", title: "Upload your logo", description: "Add your organization's logo for the co-branded page.", owner: "partner", required: false },
  { taskKey: "partner_confirm_description", title: "Confirm your public description", description: "Review the short description shown to your community.", owner: "partner", required: false },
  { taskKey: "partner_confirm_contact", title: "Confirm your main contact", description: "Verify the main contact for your program.", owner: "partner", required: false },
  { taskKey: "partner_review_landing", title: "Review your landing page", description: "Preview how your co-branded page will look.", owner: "partner", required: false },
  { taskKey: "partner_download_materials", title: "Download launch materials", description: "Grab your link, QR code, and suggested outreach copy.", owner: "partner", required: false }
];

export type PartnerOnboardingTaskView = {
  taskKey: string;
  title: string;
  description: string | null;
  status: TaskStatus;
  owner: TaskOwner;
  required: boolean;
  completedAt: string | null;
  completedBy: string | null;
  notes: string | null;
  updatedAt: string;
};

export type PartnerOnboardingView = {
  partnerSlug: string;
  organizationName: string;
  status: OnboardingStatus;
  agreementStatus: AgreementStatus;
  agreementDate: string | null;
  billingContactName: string | null;
  billingContactEmail: string | null;
  packageName: string | null;
  internalNotes: string | null;
  internalBillingNotes: string | null;
  publicDisplayName: string | null;
  publicHeadline: string | null;
  publicSubheadline: string | null;
  supportInstructions: string | null;
  showPartnerLogo: boolean;
  showPoweredBy: boolean;
  sections: {
    profileReady: boolean;
    billingReady: boolean;
    accessControlsReady: boolean;
    landingPageReady: boolean;
    adminUsersReady: boolean;
    launchMaterialsReady: boolean;
    trainingReviewReady: boolean;
  };
  launchedAt: string | null;
  pausedAt: string | null;
  internalApprovedAt: string | null;
  // Live values pulled from the authoritative systems (not duplicated).
  packetCap: number;
  packetsUsed: number;
  remainingPackets: number;
  overageEnabled: boolean;
  overagePacketPriceCents: number;
  pauseAtCap: boolean;
  overagePackets: number;
  accessMode: PartnerAccessMode;
  activeCodeCount: number;
  adminUserCount: number;
  logoUrl: string | null;
  tasks: PartnerOnboardingTaskView[];
  readiness: LaunchReadiness;
};

export type LaunchReadiness = {
  ready: boolean;
  blockers: string[];
};

export class PartnerOnboardingError extends Error {
  constructor(
    readonly code:
      | "supabase_unconfigured"
      | "invalid_input"
      | "duplicate_slug"
      | "unknown_partner"
      | "not_found"
      | "not_ready"
      | "write_failed",
    message: string
  ) {
    super(message);
    this.name = "PartnerOnboardingError";
  }
}

type Admin = NonNullable<ReturnType<typeof getSupabaseAdminClient>>;

function admin(): Admin {
  const supabase = getSupabaseAdminClient();
  if (!supabase) throw new PartnerOnboardingError("supabase_unconfigured", "Supabase service-role access is not configured.");
  return supabase;
}

function normalizeSlug(value: string): string {
  return (value ?? "").trim().toLowerCase();
}

const SLUG_PATTERN = /^[a-z0-9][a-z0-9-]*$/;

// ---------------------------------------------------------------------------
// Create / start
// ---------------------------------------------------------------------------

export async function createPartnerOnboarding(input: {
  partnerSlug: string;
  organizationName: string;
  publicDisplayName?: string | null;
  website?: string | null;
  organizationType?: string | null;
  primaryContactName?: string | null;
  primaryContactEmail?: string | null;
  primaryContactPhone?: string | null;
  targetState?: string | null;
  targetCounty?: string | null;
  programDescription?: string | null;
  internalNotes?: string | null;
  createdBy?: string | null;
}): Promise<PartnerOnboardingView> {
  const supabase = admin();
  const slug = normalizeSlug(input.partnerSlug);
  if (!slug || slug.length > 120 || !SLUG_PATTERN.test(slug)) {
    throw new PartnerOnboardingError("invalid_input", "Enter a valid partner page address (letters, numbers, and dashes).");
  }
  const organizationName = (input.organizationName ?? "").trim();
  if (!organizationName) {
    throw new PartnerOnboardingError("invalid_input", "Organization name is required.");
  }

  // New partner record with safe pre-launch defaults. Duplicate slug is rejected.
  const { error: insertError } = await supabase.from("partner_records").insert({
    partner_id: slug,
    partner_slug: slug,
    partner_name: organizationName,
    organization_name: organizationName,
    website: cleanText(input.website),
    organization_type: cleanText(input.organizationType) ?? "other",
    primary_contact_name: cleanText(input.primaryContactName),
    primary_contact_email: cleanText(input.primaryContactEmail),
    primary_contact_phone: cleanText(input.primaryContactPhone),
    contact_name: cleanText(input.primaryContactName),
    contact_email: cleanText(input.primaryContactEmail),
    target_state: cleanText(input.targetState),
    target_county: cleanText(input.targetCounty),
    program_description: cleanText(input.programDescription),
    program_tier: "implementation",
    access_mode: "open",
    payment_status: "unpaid",
    qualification_status: "qualified",
    provisioning_status: "ready_for_onboarding",
    onboarding_status: "in_progress"
  });

  if (insertError) {
    if ((insertError as { code?: string }).code === "23505") {
      throw new PartnerOnboardingError("duplicate_slug", "That partner page address is already taken. Choose another.");
    }
    throw new PartnerOnboardingError("write_failed", "Could not create the partner.");
  }

  await ensureEntitlement(supabase, slug);
  await upsertOnboardingRow(supabase, slug, {
    status: "setup_in_progress",
    public_display_name: cleanText(input.publicDisplayName) ?? organizationName,
    internal_notes: cleanText(input.internalNotes)
  });
  await seedTasks(supabase, slug);
  await audit(supabase, slug, "partner_onboarding_started", { created_by: input.createdBy ?? "internal_admin" });

  return getOnboarding(slug);
}

export async function startOnboardingForExistingPartner(partnerSlug: string, createdBy?: string): Promise<PartnerOnboardingView> {
  const supabase = admin();
  const slug = normalizeSlug(partnerSlug);
  const partner = await getPartnerRecordBySlug(slug);
  if (!partner) throw new PartnerOnboardingError("unknown_partner", "Unknown partner.");

  await ensureEntitlement(supabase, slug);
  await upsertOnboardingRow(supabase, slug, { status: "setup_in_progress" });
  await seedTasks(supabase, slug);
  await audit(supabase, slug, "partner_onboarding_started", { created_by: createdBy ?? "internal_admin" });
  return getOnboarding(slug);
}

// ---------------------------------------------------------------------------
// Reads
// ---------------------------------------------------------------------------

export async function getOnboarding(partnerSlug: string): Promise<PartnerOnboardingView> {
  const supabase = admin();
  const slug = normalizeSlug(partnerSlug);

  const [onboardingRes, tasksRes, partner, partnerRowRes, accessMode, codesRes, usersRes] = await Promise.all([
    supabase.from("partner_onboarding").select("*").eq("partner_slug", slug).maybeSingle(),
    supabase.from("partner_onboarding_tasks").select("*").eq("partner_slug", slug).order("created_at", { ascending: true }),
    getPartnerRecordBySlug(slug),
    supabase.from("partner_records").select("id").eq("partner_slug", slug).maybeSingle(),
    getPartnerAccessMode(slug),
    supabase.from("partner_access_codes").select("id", { count: "exact", head: true }).eq("partner_slug", slug).eq("is_active", true),
    supabase.from("partner_users").select("id", { count: "exact", head: true }).eq("partner_slug", slug).eq("status", "active").in("role", ["partner_admin", "partner_staff", "partner_viewer"])
  ]);

  // Packet capacity comes from the canonical packet entitlement, never from the
  // screening allowance: the two are different products and are never blended.
  // Usage derives from the append-only credit ledger. Before the packet
  // accounting migration is applied these read honestly as unconfigured.
  const partnerRecordId = (partnerRowRes.data as { id?: string } | null)?.id ?? null;
  let packetEnt: { id?: string; packet_cap?: number; overage_enabled?: boolean; pause_at_cap?: boolean; contract_note?: string | null } = {};
  let packetsConsumed = 0;
  let overagePacketsConsumed = 0;
  if (partnerRecordId) {
    const packetEntRes = await supabase
      .from("partner_packet_entitlement")
      .select("id, packet_cap, overage_enabled, pause_at_cap, contract_note")
      .eq("partner_id", partnerRecordId)
      .eq("entitlement_scope", "sponsored_packets")
      .is("expires_at", null)
      .maybeSingle();
    packetEnt = (packetEntRes.data ?? {}) as typeof packetEnt;
    if (packetEnt.id) {
      const [consumedRes, overageRes] = await Promise.all([
        supabase.from("packet_credit_ledger").select("id", { count: "exact", head: true }).eq("entitlement_id", packetEnt.id).eq("event_type", "consumed"),
        supabase.from("packet_credit_ledger").select("id", { count: "exact", head: true }).eq("entitlement_id", packetEnt.id).eq("event_type", "overage_consumed")
      ]);
      packetsConsumed = consumedRes.count ?? 0;
      overagePacketsConsumed = overageRes.count ?? 0;
    }
  }

  const row = onboardingRes.data as OnboardingRow | null;
  if (!row) throw new PartnerOnboardingError("not_found", "This partner has not started onboarding.");
  if (!partner) throw new PartnerOnboardingError("unknown_partner", "Unknown partner.");

  const packetCap = packetEnt.packet_cap ?? 0;
  const packetsUsed = packetsConsumed;
  const overagePriceMatch = /overage_packet_price_cents=(\d+)/.exec(packetEnt.contract_note ?? "");
  const tasks = ((tasksRes.data ?? []) as TaskRow[]).map(taskView);

  const view: PartnerOnboardingView = {
    partnerSlug: slug,
    organizationName: partner.organizationName ?? partner.partnerName,
    status: row.status,
    agreementStatus: row.agreement_status,
    agreementDate: row.agreement_date,
    billingContactName: row.billing_contact_name,
    billingContactEmail: row.billing_contact_email,
    packageName: row.package_name,
    internalNotes: row.internal_notes,
    internalBillingNotes: row.internal_billing_notes,
    publicDisplayName: row.public_display_name,
    publicHeadline: row.public_headline,
    publicSubheadline: row.public_subheadline,
    supportInstructions: row.support_instructions,
    showPartnerLogo: row.show_partner_logo,
    showPoweredBy: row.show_powered_by,
    sections: {
      profileReady: row.profile_ready,
      billingReady: row.billing_ready,
      accessControlsReady: row.access_controls_ready,
      landingPageReady: row.landing_page_ready,
      adminUsersReady: row.admin_users_ready,
      launchMaterialsReady: row.launch_materials_ready,
      trainingReviewReady: row.training_review_ready
    },
    launchedAt: row.launched_at,
    pausedAt: row.paused_at,
    internalApprovedAt: row.internal_approved_at,
    packetCap,
    packetsUsed,
    remainingPackets: Math.max(0, packetCap - packetsUsed),
    overageEnabled: Boolean(packetEnt.overage_enabled),
    overagePacketPriceCents: overagePriceMatch ? Number(overagePriceMatch[1]) : 5000,
    // Fail closed until the packet entitlement is configured.
    pauseAtCap: packetEnt.id ? Boolean(packetEnt.pause_at_cap) : true,
    overagePackets: overagePacketsConsumed,
    accessMode,
    activeCodeCount: codesRes.count ?? 0,
    adminUserCount: usersRes.count ?? 0,
    logoUrl: partner.logoUrl ?? null,
    tasks,
    readiness: { ready: false, blockers: [] }
  };

  view.readiness = evaluateReadiness(view);
  return view;
}

// Partner-safe projection: never returns internal notes/billing internals, and
// omits task notes. Partner admins see their own status + tasks only.
export type PartnerFacingOnboarding = {
  partnerSlug: string;
  organizationName: string;
  status: OnboardingStatus;
  statusLabel: string;
  packetCap: number;
  packetsUsed: number;
  remainingPackets: number;
  accessMode: PartnerAccessMode;
  logoUrl: string | null;
  publicDisplayName: string | null;
  tasks: Array<{ taskKey: string; title: string; description: string | null; status: TaskStatus; owner: TaskOwner; required: boolean }>;
};

export async function getOnboardingForPartner(partnerSlug: string): Promise<PartnerFacingOnboarding> {
  const full = await getOnboarding(partnerSlug);
  return {
    partnerSlug: full.partnerSlug,
    organizationName: full.organizationName,
    status: full.status,
    statusLabel: statusLabel(full.status),
    packetCap: full.packetCap,
    packetsUsed: full.packetsUsed,
    remainingPackets: full.remainingPackets,
    accessMode: full.accessMode,
    logoUrl: full.logoUrl,
    publicDisplayName: full.publicDisplayName,
    tasks: full.tasks.map((t) => ({
      taskKey: t.taskKey,
      title: t.title,
      description: t.description,
      status: t.status,
      owner: t.owner,
      required: t.required
      // notes intentionally omitted
    }))
  };
}

export type OnboardingSummary = {
  partnerSlug: string;
  organizationName: string;
  status: OnboardingStatus;
  statusLabel: string;
  packetCap: number;
  packetsUsed: number;
  accessMode: PartnerAccessMode;
  agreementStatus: AgreementStatus;
  launchReady: boolean;
  updatedAt: string;
};

export async function listOnboardingSummaries(): Promise<OnboardingSummary[]> {
  const supabase = admin();
  const { data, error } = await supabase
    .from("partner_onboarding")
    .select("partner_slug, status, agreement_status, updated_at")
    .order("updated_at", { ascending: false });
  if (error) throw new PartnerOnboardingError("write_failed", "Could not list onboarding.");

  const rows = (data ?? []) as Array<{ partner_slug: string; status: OnboardingStatus; agreement_status: AgreementStatus; updated_at: string }>;
  const summaries = await Promise.all(
    rows.map(async (r) => {
      const view = await getOnboarding(r.partner_slug).catch(() => null);
      if (!view) return null;
      return {
        partnerSlug: view.partnerSlug,
        organizationName: view.organizationName,
        status: view.status,
        statusLabel: statusLabel(view.status),
        packetCap: view.packetCap,
        packetsUsed: view.packetsUsed,
        accessMode: view.accessMode,
        agreementStatus: view.agreementStatus,
        launchReady: view.readiness.ready,
        updatedAt: r.updated_at
      } satisfies OnboardingSummary;
    })
  );
  return summaries.filter((s): s is OnboardingSummary => s !== null);
}

// ---------------------------------------------------------------------------
// Section configuration (internal admin)
// ---------------------------------------------------------------------------

export async function updateProfile(partnerSlug: string, fields: {
  organizationName?: string;
  publicDisplayName?: string;
  website?: string;
  organizationType?: string;
  primaryContactName?: string;
  primaryContactEmail?: string;
  primaryContactPhone?: string;
  targetState?: string;
  targetCounty?: string;
  programDescription?: string;
  internalNotes?: string;
}, actor = "internal_admin"): Promise<PartnerOnboardingView> {
  const supabase = admin();
  const slug = normalizeSlug(partnerSlug);
  await requireOnboarding(supabase, slug);

  const partnerUpdate: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (fields.organizationName !== undefined) { partnerUpdate.organization_name = cleanText(fields.organizationName); partnerUpdate.partner_name = cleanText(fields.organizationName); }
  if (fields.website !== undefined) partnerUpdate.website = cleanText(fields.website);
  if (fields.organizationType !== undefined) partnerUpdate.organization_type = cleanText(fields.organizationType);
  if (fields.primaryContactName !== undefined) { partnerUpdate.primary_contact_name = cleanText(fields.primaryContactName); partnerUpdate.contact_name = cleanText(fields.primaryContactName); }
  if (fields.primaryContactEmail !== undefined) { partnerUpdate.primary_contact_email = cleanText(fields.primaryContactEmail); partnerUpdate.contact_email = cleanText(fields.primaryContactEmail); }
  if (fields.primaryContactPhone !== undefined) partnerUpdate.primary_contact_phone = cleanText(fields.primaryContactPhone);
  if (fields.targetState !== undefined) partnerUpdate.target_state = cleanText(fields.targetState);
  if (fields.targetCounty !== undefined) partnerUpdate.target_county = cleanText(fields.targetCounty);
  if (fields.programDescription !== undefined) partnerUpdate.program_description = cleanText(fields.programDescription);

  if (Object.keys(partnerUpdate).length > 1) {
    const { error } = await supabase.from("partner_records").update(partnerUpdate).eq("partner_slug", slug);
    if (error) throw new PartnerOnboardingError("write_failed", "Could not save the partner profile.");
  }

  const onboardingUpdate: Record<string, unknown> = {};
  if (fields.publicDisplayName !== undefined) onboardingUpdate.public_display_name = cleanText(fields.publicDisplayName);
  if (fields.internalNotes !== undefined) onboardingUpdate.internal_notes = cleanText(fields.internalNotes);
  if (Object.keys(onboardingUpdate).length) await patchOnboarding(supabase, slug, onboardingUpdate);

  const partner = await getPartnerRecordBySlug(slug);
  const hasProfile = Boolean(partner?.organizationName && (partner?.primaryContactEmail || partner?.contactEmail) && (partner?.targetState || partner?.serviceArea));
  if (hasProfile) {
    await patchOnboarding(supabase, slug, { profile_ready: true });
    await completeTask(supabase, slug, "profile_complete", actor);
  }
  return getOnboarding(slug);
}

export async function configureBilling(partnerSlug: string, input: {
  packetCap: number;
  packageName?: string;
  overageEnabled: boolean;
  overagePacketPriceCents?: number;
  pauseAtCap: boolean;
  agreementStatus?: AgreementStatus;
  agreementDate?: string | null;
  billingContactName?: string | null;
  billingContactEmail?: string | null;
  internalBillingNotes?: string | null;
}, actor = "internal_admin"): Promise<PartnerOnboardingView> {
  const supabase = admin();
  const slug = normalizeSlug(partnerSlug);
  await requireOnboarding(supabase, slug);

  if (!Number.isInteger(input.packetCap) || input.packetCap < 0) {
    throw new PartnerOnboardingError("invalid_input", "Packet cap must be a whole number of packets.");
  }
  const price = input.overagePacketPriceCents ?? 5000;
  if (!Number.isInteger(price) || price < 0) {
    throw new PartnerOnboardingError("invalid_input", "Overage price must be a whole number of cents.");
  }
  if (input.agreementStatus && !(AGREEMENT_STATUSES as readonly string[]).includes(input.agreementStatus)) {
    throw new PartnerOnboardingError("invalid_input", "Unknown agreement status.");
  }

  // Packet capacity is its own product fact and lives in
  // partner_packet_entitlement, keyed on the immutable partner_records.id.
  // partner_entitlement remains the screening allowance and is deliberately
  // not written here: the previous upsert stored the packet cap into
  // screenings_allowed, silently overwriting the partner's screening capacity
  // with a packet number.
  const { data: partnerRow, error: partnerError } = await supabase
    .from("partner_records")
    .select("id")
    .eq("partner_slug", slug)
    .maybeSingle();
  if (partnerError || !partnerRow?.id) {
    throw new PartnerOnboardingError("write_failed", "Could not resolve the partner record for packet capacity.");
  }
  // One ACTIVE entitlement per partner and program (partial unique index on
  // expires_at is null), so this is select-then-write rather than an upsert.
  const { data: activeEnt } = await supabase
    .from("partner_packet_entitlement")
    .select("id")
    .eq("partner_id", partnerRow.id)
    .eq("entitlement_scope", "sponsored_packets")
    .is("expires_at", null)
    .maybeSingle();
  const entValues = {
    packet_cap: input.packetCap,
    overage_enabled: input.overageEnabled,
    pause_at_cap: input.pauseAtCap,
    contract_note: `overage_packet_price_cents=${price}`
  };
  const { error: entError } = activeEnt?.id
    ? await supabase.from("partner_packet_entitlement").update(entValues).eq("id", activeEnt.id)
    : await supabase.from("partner_packet_entitlement").insert({
        partner_id: partnerRow.id,
        entitlement_scope: "sponsored_packets",
        ...entValues
      });
  if (entError) throw new PartnerOnboardingError("write_failed", "Could not save packet cap and overage settings.");

  await patchOnboarding(supabase, slug, {
    package_name: cleanText(input.packageName),
    agreement_status: input.agreementStatus ?? undefined,
    agreement_date: cleanText(input.agreementDate),
    billing_contact_name: cleanText(input.billingContactName),
    billing_contact_email: cleanText(input.billingContactEmail),
    internal_billing_notes: cleanText(input.internalBillingNotes),
    billing_ready: true
  });

  await completeTask(supabase, slug, "packet_cap", actor);
  await completeTask(supabase, slug, "overage_pause", actor);
  await completeTask(supabase, slug, "agreement_billing", actor);
  await audit(supabase, slug, "partner_packet_cap_configured", { packet_cap: input.packetCap, overage_enabled: input.overageEnabled, pause_at_cap: input.pauseAtCap });
  return getOnboarding(slug);
}

export async function configureAccessMode(partnerSlug: string, mode: PartnerAccessMode, actor = "internal_admin"): Promise<PartnerOnboardingView> {
  const supabase = admin();
  const slug = normalizeSlug(partnerSlug);
  await requireOnboarding(supabase, slug);
  await updatePartnerAccessMode({ partnerSlug: slug, accessMode: mode });
  await patchOnboarding(supabase, slug, { access_controls_ready: true });
  await completeTask(supabase, slug, "access_mode", actor);

  // When codes are not required, the "codes created" item can be skipped.
  if (mode === "open" || mode === "optional_code") {
    await skipTask(supabase, slug, "codes_created", actor);
  }
  await audit(supabase, slug, "partner_access_mode_configured", { access_mode: mode });
  return getOnboarding(slug);
}

export async function updateBranding(partnerSlug: string, fields: {
  publicDisplayName?: string;
  publicHeadline?: string;
  publicSubheadline?: string;
  supportInstructions?: string;
  showPartnerLogo?: boolean;
  showPoweredBy?: boolean;
  logoUrl?: string;
}, actor = "internal_admin"): Promise<PartnerOnboardingView> {
  const supabase = admin();
  const slug = normalizeSlug(partnerSlug);
  await requireOnboarding(supabase, slug);

  if (fields.logoUrl !== undefined) {
    const { error } = await supabase.from("partner_records").update({ logo_url: cleanText(fields.logoUrl), updated_at: new Date().toISOString() }).eq("partner_slug", slug);
    if (error) throw new PartnerOnboardingError("write_failed", "Could not save the logo.");
  }
  const patch: Record<string, unknown> = {};
  if (fields.publicDisplayName !== undefined) patch.public_display_name = cleanText(fields.publicDisplayName);
  if (fields.publicHeadline !== undefined) patch.public_headline = cleanText(fields.publicHeadline);
  if (fields.publicSubheadline !== undefined) patch.public_subheadline = cleanText(fields.publicSubheadline);
  if (fields.supportInstructions !== undefined) patch.support_instructions = cleanText(fields.supportInstructions);
  if (fields.showPartnerLogo !== undefined) patch.show_partner_logo = fields.showPartnerLogo;
  if (fields.showPoweredBy !== undefined) patch.show_powered_by = fields.showPoweredBy;
  if (Object.keys(patch).length) await patchOnboarding(supabase, slug, patch);
  void actor;
  return getOnboarding(slug);
}

export async function markLandingPageReady(partnerSlug: string, actor = "internal_admin"): Promise<PartnerOnboardingView> {
  const supabase = admin();
  const slug = normalizeSlug(partnerSlug);
  const view = await getOnboarding(slug);

  const blockers: string[] = [];
  const displayName = view.publicDisplayName ?? view.organizationName;
  if (!displayName) blockers.push("Add a public display name.");
  if (!view.publicHeadline) blockers.push("Add a landing page headline.");
  if (view.showPartnerLogo && !view.logoUrl) blockers.push("Add a logo, or turn off showing the partner logo.");
  if (blockers.length) {
    throw new PartnerOnboardingError("not_ready", `Landing page is not ready: ${blockers.join(" ")}`);
  }

  await patchOnboarding(supabase, slug, { landing_page_ready: true });
  await completeTask(supabase, slug, "landing_reviewed", actor);
  await audit(supabase, slug, "partner_landing_page_previewed", {});
  return getOnboarding(slug);
}

export async function recordAdminInvited(partnerSlug: string, invitedEmail: string, actor = "internal_admin"): Promise<void> {
  const supabase = admin();
  const slug = normalizeSlug(partnerSlug);
  await patchOnboarding(supabase, slug, { admin_users_ready: true });
  await completeTask(supabase, slug, "admin_invited", actor);
  await audit(supabase, slug, "partner_admin_invited", { invited_email: invitedEmail });
}

export async function recordLaunchMaterialsGenerated(partnerSlug: string, actor = "internal_admin"): Promise<void> {
  const supabase = admin();
  const slug = normalizeSlug(partnerSlug);
  await patchOnboarding(supabase, slug, { launch_materials_ready: true });
  await completeTask(supabase, slug, "launch_materials", actor);
  await audit(supabase, slug, "partner_launch_materials_generated", {});
}

export async function updateTask(partnerSlug: string, taskKey: string, input: {
  status?: TaskStatus;
  owner?: TaskOwner;
  notes?: string | null;
  actor?: string;
}): Promise<PartnerOnboardingTaskView> {
  const supabase = admin();
  const slug = normalizeSlug(partnerSlug);
  if (input.status && !(TASK_STATUSES as readonly string[]).includes(input.status)) {
    throw new PartnerOnboardingError("invalid_input", "Unknown task status.");
  }
  const patch: Record<string, unknown> = {};
  if (input.status) {
    patch.status = input.status;
    patch.completed_at = input.status === "complete" ? new Date().toISOString() : null;
    patch.completed_by = input.status === "complete" ? (input.actor ?? "internal_admin") : null;
  }
  if (input.owner) patch.owner = input.owner;
  if (input.notes !== undefined) patch.notes = cleanText(input.notes);

  const { data, error } = await supabase
    .from("partner_onboarding_tasks")
    .update(patch)
    .eq("partner_slug", slug)
    .eq("task_key", taskKey)
    .select("*")
    .maybeSingle();
  if (error) throw new PartnerOnboardingError("write_failed", "Could not update the task.");
  if (!data) throw new PartnerOnboardingError("not_found", "Task not found.");

  if (input.status === "complete") await audit(supabase, slug, "partner_onboarding_task_completed", { task_key: taskKey });
  if (input.status === "blocked") await audit(supabase, slug, "partner_onboarding_task_blocked", { task_key: taskKey });
  return taskView(data as TaskRow);
}

// Partner-facing: a partner admin may only touch their own partner-owned tasks.
export async function updatePartnerOwnedTask(partnerSlug: string, taskKey: string, status: TaskStatus, actor: string): Promise<PartnerOnboardingTaskView> {
  const supabase = admin();
  const slug = normalizeSlug(partnerSlug);
  const { data: existing } = await supabase
    .from("partner_onboarding_tasks")
    .select("owner")
    .eq("partner_slug", slug)
    .eq("task_key", taskKey)
    .maybeSingle();
  if (!existing) throw new PartnerOnboardingError("not_found", "Task not found.");
  if ((existing as { owner: TaskOwner }).owner !== "partner") {
    throw new PartnerOnboardingError("invalid_input", "This task is managed by LegalEase.");
  }
  return updateTask(slug, taskKey, { status, actor });
}

export async function setOnboardingStatus(partnerSlug: string, status: OnboardingStatus): Promise<PartnerOnboardingView> {
  const supabase = admin();
  const slug = normalizeSlug(partnerSlug);
  if (!(ONBOARDING_STATUSES as readonly string[]).includes(status)) {
    throw new PartnerOnboardingError("invalid_input", "Unknown onboarding status.");
  }
  await requireOnboarding(supabase, slug);
  await patchOnboarding(supabase, slug, { status });
  if (status === "ready_for_review") await audit(supabase, slug, "partner_marked_ready_for_review", {});
  return getOnboarding(slug);
}

// ---------------------------------------------------------------------------
// Go-live / pause
// ---------------------------------------------------------------------------

export async function markLive(partnerSlug: string, actor = "internal_admin"): Promise<PartnerOnboardingView> {
  const supabase = admin();
  const slug = normalizeSlug(partnerSlug);
  const view = await getOnboarding(slug);
  if (!view.readiness.ready) {
    throw new PartnerOnboardingError("not_ready", `This partner is not ready to launch: ${view.readiness.blockers.join(" ")}`);
  }

  await completeTask(supabase, slug, "internal_approval", actor);
  await patchOnboarding(supabase, slug, {
    status: "live",
    launched_at: new Date().toISOString(),
    internal_approved_at: new Date().toISOString(),
    training_review_ready: true
  });
  // Reuse the existing activation path (provisioning_status -> provisioned),
  // which is what makes the co-branded page and dashboard active.
  await activatePartner(slug);
  await audit(supabase, slug, "partner_marked_live", { actor });
  return getOnboarding(slug);
}

export async function pauseOnboarding(partnerSlug: string, actor = "internal_admin"): Promise<PartnerOnboardingView> {
  const supabase = admin();
  const slug = normalizeSlug(partnerSlug);
  await requireOnboarding(supabase, slug);
  await patchOnboarding(supabase, slug, { status: "paused", paused_at: new Date().toISOString() });
  // Reuse the existing pause path (provisioning_status -> paused). isActiveRcapPartner
  // then returns false, so the partner page no longer promises sponsored packets and
  // partner attribution cannot consume packet credits.
  await pausePartner(slug);
  await audit(supabase, slug, "partner_paused", { actor });
  return getOnboarding(slug);
}

// ---------------------------------------------------------------------------
// Readiness
// ---------------------------------------------------------------------------

export function evaluateReadiness(view: PartnerOnboardingView): LaunchReadiness {
  const blockers: string[] = [];

  const requiredTasks = view.tasks.filter((t) => t.required && t.owner === "legalease");
  const incomplete = requiredTasks.filter((t) => t.status !== "complete" && t.status !== "skipped" && t.taskKey !== "internal_approval");
  for (const t of incomplete) blockers.push(`${t.title} is not complete.`);

  if (view.packetCap < 1) blockers.push("Set a packet cap of at least 1.");
  if (!view.sections.landingPageReady) blockers.push("Review and approve the landing page.");
  if (view.adminUserCount < 1 && !view.sections.adminUsersReady) blockers.push("Invite at least one partner admin.");

  const codesRequired = view.accessMode === "required_code" || view.accessMode === "invite_only";
  if (codesRequired && view.activeCodeCount < 1) {
    blockers.push("Create at least one active access code before launch.");
  }

  return { ready: blockers.length === 0, blockers };
}

// ---------------------------------------------------------------------------
// Internals
// ---------------------------------------------------------------------------

type OnboardingRow = {
  partner_slug: string;
  status: OnboardingStatus;
  agreement_status: AgreementStatus;
  agreement_date: string | null;
  billing_contact_name: string | null;
  billing_contact_email: string | null;
  package_name: string | null;
  internal_billing_notes: string | null;
  internal_notes: string | null;
  public_display_name: string | null;
  public_headline: string | null;
  public_subheadline: string | null;
  support_instructions: string | null;
  show_partner_logo: boolean;
  show_powered_by: boolean;
  profile_ready: boolean;
  billing_ready: boolean;
  access_controls_ready: boolean;
  landing_page_ready: boolean;
  admin_users_ready: boolean;
  launch_materials_ready: boolean;
  training_review_ready: boolean;
  internal_approved_at: string | null;
  launched_at: string | null;
  paused_at: string | null;
};

type TaskRow = {
  task_key: string;
  title: string;
  description: string | null;
  status: TaskStatus;
  owner: TaskOwner;
  required: boolean;
  completed_at: string | null;
  completed_by: string | null;
  notes: string | null;
  updated_at: string;
};

function taskView(row: TaskRow): PartnerOnboardingTaskView {
  return {
    taskKey: row.task_key,
    title: row.title,
    description: row.description,
    status: row.status,
    owner: row.owner,
    required: row.required,
    completedAt: row.completed_at,
    completedBy: row.completed_by,
    notes: row.notes,
    updatedAt: row.updated_at
  };
}

async function ensureEntitlement(supabase: Admin, slug: string) {
  await supabase.from("partner_entitlement").upsert({ partner_slug: slug }, { onConflict: "partner_slug", ignoreDuplicates: true });
}

async function upsertOnboardingRow(supabase: Admin, slug: string, fields: Record<string, unknown>) {
  const { error } = await supabase.from("partner_onboarding").upsert({ partner_slug: slug, ...fields }, { onConflict: "partner_slug" });
  if (error) throw new PartnerOnboardingError("write_failed", "Could not save onboarding.");
}

async function patchOnboarding(supabase: Admin, slug: string, fields: Record<string, unknown>) {
  const clean = Object.fromEntries(Object.entries(fields).filter(([, v]) => v !== undefined));
  if (Object.keys(clean).length === 0) return;
  const { error } = await supabase.from("partner_onboarding").update(clean).eq("partner_slug", slug);
  if (error) throw new PartnerOnboardingError("write_failed", "Could not save onboarding.");
}

async function requireOnboarding(supabase: Admin, slug: string) {
  const { data } = await supabase.from("partner_onboarding").select("partner_slug").eq("partner_slug", slug).maybeSingle();
  if (!data) throw new PartnerOnboardingError("not_found", "This partner has not started onboarding.");
}

async function seedTasks(supabase: Admin, slug: string) {
  const rows = STANDARD_TASKS.map((t) => ({
    partner_slug: slug,
    task_key: t.taskKey,
    title: t.title,
    description: t.description,
    owner: t.owner,
    required: t.required,
    status: t.autoComplete ? "complete" : "not_started",
    completed_at: t.autoComplete ? new Date().toISOString() : null,
    completed_by: t.autoComplete ? "system" : null
  }));
  // Idempotent: do nothing on conflict so re-starting onboarding keeps progress.
  await supabase.from("partner_onboarding_tasks").upsert(rows, { onConflict: "partner_slug,task_key", ignoreDuplicates: true });
}

async function completeTask(supabase: Admin, slug: string, taskKey: string, actor: string) {
  await supabase
    .from("partner_onboarding_tasks")
    .update({ status: "complete", completed_at: new Date().toISOString(), completed_by: actor })
    .eq("partner_slug", slug)
    .eq("task_key", taskKey)
    .neq("status", "complete");
}

async function skipTask(supabase: Admin, slug: string, taskKey: string, actor: string) {
  await supabase
    .from("partner_onboarding_tasks")
    .update({ status: "skipped", completed_by: actor })
    .eq("partner_slug", slug)
    .eq("task_key", taskKey)
    .eq("status", "not_started");
}

async function audit(supabase: Admin, slug: string, eventType: string, metadata: Record<string, unknown>) {
  try {
    await supabase.from("rcap_record_events").insert({
      record_type: "partner_onboarding",
      record_id: slug,
      partner_slug: slug,
      event_type: eventType,
      actor: "internal_admin",
      metadata
    });
  } catch {
    // Audit is best-effort; never block the mutation.
  }
}

export function statusLabel(status: OnboardingStatus): string {
  const labels: Record<OnboardingStatus, string> = {
    draft: "Draft",
    setup_in_progress: "Setup in progress",
    waiting_on_partner: "Waiting on partner",
    ready_for_review: "Ready for review",
    ready_to_launch: "Ready to launch",
    live: "Live",
    paused: "Paused"
  };
  return labels[status] ?? status;
}

function cleanText(value: string | null | undefined): string | null {
  const text = value?.trim();
  return text ? text : null;
}
