import "server-only";

import crypto from "node:crypto";
import { getSupabaseAdminClient } from "@/lib/supabase/server";
import type { InternalOnboardingContext } from "./auth-context";
import { deriveOnboardingSummary, isFieldActive } from "./derivations";
import { Phase1OnboardingError } from "./errors";
import { isRcapOnboardingPrefillEnabled } from "./feature";
import { canonicalOnboardingJurisdiction } from "./jurisdictions";
import {
  canonicalPrefillFieldValue,
  getPrefillEligibleFields,
  isPrefillSourceType,
  normalizePrefillValue,
  requirePrefillEligibleField,
  stablePrefillJson,
  withCanonicalPrefillValue,
  type PartnerPrefillReviewStatus,
  type PrefillBatchStatus,
  type PrefillReviewStatus,
  type PrefillSourceType
} from "./prefill-domain";
import {
  getFieldDefinition,
  ONBOARDING_SECTION_DEFINITIONS,
  ONBOARDING_SECTION_ORDER,
  ORGANIZATION_TYPES
} from "./schema";
import { deriveRecordShieldScope } from "./scope";
import type {
  OnboardingContact,
  OnboardingDerivedSummary,
  OnboardingPartnerData,
  OnboardingReportRecipient,
  OnboardingSectionDataMap,
  OnboardingSectionKey,
  OnboardingSectionStatus,
  OnboardingWorkspaceStatus,
  PlannedDashboardUser
} from "./types";
import { validateOnboardingSection } from "./validation";

type SupabaseAdmin = NonNullable<ReturnType<typeof getSupabaseAdminClient>>;

type WorkspaceRow = {
  id: string;
  partner_slug: string;
  partner_record_id: string | null;
  status: string;
  aggregate_version: number;
  commercial_gate_status: string;
  public_display_name: string | null;
  public_headline: string | null;
  public_subheadline: string | null;
  support_instructions: string | null;
  billing_contact_name: string | null;
  billing_contact_email: string | null;
  agreement_status: string;
};

type SectionRow = {
  id: string;
  workspace_id: string;
  section_key: string;
  response_data: Record<string, unknown> | null;
  revision: number;
  status: string;
  completion_percentage: number;
  missing_required_keys: string[] | null;
};

type BatchRow = {
  id: string;
  workspace_id: string;
  status: PrefillBatchStatus;
  source_summary: string;
  created_by: string;
  created_at: string;
  approved_by: string | null;
  approved_at: string | null;
  applied_at: string | null;
  superseded_at: string | null;
  aggregate_version: number;
};

type ValueRow = {
  id: string;
  batch_id: string;
  workspace_id: string;
  section_key: string;
  field_key: string;
  proposed_value: unknown;
  source_type: PrefillSourceType;
  source_reference_id: string | null;
  source_label: string;
  confidence: number | null;
  review_status: PrefillReviewStatus;
  base_value_hash: string;
  proposed_value_hash: string;
  base_section_revision: number;
  applied_value_hash: string | null;
  applied_section_revision: number | null;
  applied_workspace_version: number | null;
  partner_review_status: PartnerPrefillReviewStatus;
  partner_reviewed_at: string | null;
  partner_modified: boolean;
  created_by: string;
  created_at: string;
  reviewed_by: string | null;
  reviewed_at: string | null;
  applied_at: string | null;
  superseded_at: string | null;
};

type PartnerRecordSourceRow = {
  id: string;
  partner_slug: string;
  partner_name: string | null;
  organization_name: string | null;
  legal_name: string | null;
  primary_contact_name: string | null;
  primary_contact_title: string | null;
  primary_contact_email: string | null;
  primary_contact_phone: string | null;
  contact_name: string | null;
  contact_email: string | null;
  website: string | null;
  organization_type: string | null;
  program_name: string | null;
  program_description: string | null;
  target_state: string | null;
  target_county: string | null;
  service_area: string | null;
  expected_monthly_participants: number | null;
  audience_description: string | null;
  program_goal: string | null;
  selected_package_id: string | null;
  selected_package_name: string | null;
  access_mode: string | null;
};

type ActivePartnerUserRow = {
  id: string;
  invited_email: string | null;
  role: string;
};

type CandidateSuggestion = {
  sectionKey: OnboardingSectionKey;
  fieldKey: string;
  proposedValue: unknown;
  sourceType: PrefillSourceType;
  sourceReferenceId?: string | null;
  sourceLabel: string;
  confidence?: number | null;
};

type PreparedSuggestion = CandidateSuggestion & {
  id: string;
  baseValueHash: string;
  proposedValueHash: string;
  baseSectionRevision: number;
};

export type InternalPrefillSuggestionView = {
  id: string;
  batchId: string;
  batchVersion: number;
  sectionKey: OnboardingSectionKey;
  sectionLabel: string;
  fieldKey: string;
  fieldLabel: string;
  currentValue: unknown;
  proposedValue: unknown;
  sourceType: PrefillSourceType;
  sourceReferenceId: string | null;
  sourceLabel: string;
  confidence: number | null;
  reviewStatus: PrefillReviewStatus;
  partnerReviewStatus: PartnerPrefillReviewStatus;
  conflict: boolean;
  conflictReason: string | null;
  createdBy: string;
  createdAt: string;
  appliedAt: string | null;
};

export type InternalPrefillSnapshot = {
  enabled: true;
  workspace: null | {
    id: string;
    status: OnboardingWorkspaceStatus;
    aggregateVersion: number;
  };
  summary: {
    total: number;
    proposed: number;
    approved: number;
    conflicts: number;
    applied: number;
    awaitingPartnerReview: number;
    confirmed: number;
    modified: number;
    rejected: number;
  };
  eligibleFields: Array<{
    sectionKey: OnboardingSectionKey;
    sectionLabel: string;
    fieldKey: string;
    fieldLabel: string;
    dataType: string;
    enumValues: readonly string[];
    maxLength: number | null;
  }>;
  suggestions: InternalPrefillSuggestionView[];
};

export type PartnerPrefillMetadata = {
  enabled: boolean;
  hasAppliedPrefill: boolean;
  pendingCount: number;
  pendingSections: OnboardingSectionKey[];
  bySection: Partial<
    Record<
      OnboardingSectionKey,
      {
        pendingFieldKeys: string[];
        reviewedFieldKeys: string[];
      }
    >
  >;
};

export async function getInternalPrefillSnapshot(
  context: InternalOnboardingContext
): Promise<InternalPrefillSnapshot> {
  assertPrefillEnabled();
  const admin = requireAdmin();
  const loaded = await loadCanonicalWorkspace(admin, context.partnerSlug);
  if (!loaded) {
    return {
      enabled: true,
      workspace: null,
      summary: emptySummary(),
      eligibleFields: eligibleFieldOptions(),
      suggestions: []
    };
  }

  const [batchesResult, valuesResult] = await Promise.all([
    admin
      .from("partner_onboarding_prefill_batches")
      .select(
        "id, workspace_id, status, source_summary, created_by, created_at, approved_by, approved_at, applied_at, superseded_at, aggregate_version"
      )
      .eq("workspace_id", loaded.workspace.id)
      .order("created_at", { ascending: false }),
    admin
      .from("partner_onboarding_prefill_values")
      .select(
        "id, batch_id, workspace_id, section_key, field_key, proposed_value, source_type, source_reference_id, source_label, confidence, review_status, base_value_hash, proposed_value_hash, base_section_revision, applied_value_hash, applied_section_revision, applied_workspace_version, partner_review_status, partner_reviewed_at, partner_modified, created_by, created_at, reviewed_by, reviewed_at, applied_at, superseded_at"
      )
      .eq("workspace_id", loaded.workspace.id)
      .order("created_at", { ascending: false })
  ]);
  if (batchesResult.error || valuesResult.error) {
    throw persistenceError("Prefill suggestions could not be loaded.");
  }

  const batches = (batchesResult.data ?? []) as BatchRow[];
  const batchById = new Map(batches.map((batch) => [batch.id, batch]));
  const suggestions = ((valuesResult.data ?? []) as ValueRow[]).map((row) =>
    mapInternalSuggestion(row, batchById, loaded)
  );

  return {
    enabled: true,
    workspace: {
      id: loaded.workspace.id,
      status: asWorkspaceStatus(loaded.workspace.status),
      aggregateVersion: Number(loaded.workspace.aggregate_version)
    },
    summary: summarizeSuggestions(suggestions),
    eligibleFields: eligibleFieldOptions(),
    suggestions
  };
}

export async function importKnownPartnerData(
  context: InternalOnboardingContext,
  input: { requestId: string }
) {
  assertPrefillEnabled();
  const admin = requireAdmin();
  const loaded = await requireCanonicalWorkspace(admin, context.partnerSlug);
  const [partnerResult, usersResult, activeValuesResult] = await Promise.all([
    admin
      .from("partner_records")
      .select(
        "id, partner_slug, partner_name, organization_name, legal_name, primary_contact_name, primary_contact_title, primary_contact_email, primary_contact_phone, contact_name, contact_email, website, organization_type, program_name, program_description, target_state, target_county, service_area, expected_monthly_participants, audience_description, program_goal, selected_package_id, selected_package_name, access_mode"
      )
      .eq("id", loaded.workspace.partner_record_id)
      .maybeSingle(),
    admin
      .from("partner_users")
      .select("id, invited_email, role")
      .eq("partner_slug", context.partnerSlug)
      .eq("status", "active")
      .in("role", ["partner_admin", "partner_staff"])
      .order("created_at", { ascending: true }),
    admin
      .from("partner_onboarding_prefill_values")
      .select("section_key, field_key")
      .eq("workspace_id", loaded.workspace.id)
      .in("review_status", ["proposed", "approved", "applied", "conflict"])
      .is("superseded_at", null)
  ]);
  if (partnerResult.error || usersResult.error || activeValuesResult.error) {
    throw persistenceError("Known partner data could not be imported.");
  }
  const partner = partnerResult.data as PartnerRecordSourceRow | null;
  if (!partner || partner.id !== loaded.workspace.partner_record_id) {
    throw new Phase1OnboardingError(
      "workspace_not_found",
      "Partner workspace not found."
    );
  }

  const activeTargets = new Set(
    ((activeValuesResult.data ?? []) as Array<{
      section_key: string;
      field_key: string;
    }>).map((row) => `${row.section_key}:${row.field_key}`)
  );
  const candidates = knownPartnerCandidates(
    loaded,
    partner,
    (usersResult.data ?? []) as ActivePartnerUserRow[]
  ).filter(
    (candidate) =>
      !activeTargets.has(`${candidate.sectionKey}:${candidate.fieldKey}`)
  );
  const prepared = prepareSuggestions(loaded, candidates);
  if (prepared.length === 0) {
    return {
      created: 0,
      duplicate: false,
      message:
        "No new authoritative partner values were available for eligible prefill fields."
    };
  }
  return prepareBatch(admin, context, loaded, {
    requestId: input.requestId,
    sourceSummary: "Imported from existing LegalEase partner records.",
    batchStatus: "ready_for_review",
    origin: "import",
    suggestions: prepared
  });
}

export async function addStructuredPrefillSuggestion(
  context: InternalOnboardingContext,
  input: {
    requestId: string;
    sectionKey: OnboardingSectionKey;
    fieldKey: string;
    proposedValue: unknown;
    sourceType: PrefillSourceType;
    sourceLabel: string;
    sourceReferenceId?: string | null;
    confidence?: number | null;
  }
) {
  assertPrefillEnabled();
  if (!isPrefillSourceType(input.sourceType)) {
    throw new Phase1OnboardingError(
      "invalid_input",
      "Choose a supported source type."
    );
  }
  const admin = requireAdmin();
  const loaded = await requireCanonicalWorkspace(admin, context.partnerSlug);
  const { data: existing, error } = await admin
    .from("partner_onboarding_prefill_values")
    .select("id")
    .eq("workspace_id", loaded.workspace.id)
    .eq("section_key", input.sectionKey)
    .eq("field_key", input.fieldKey)
    .in("review_status", ["proposed", "approved", "applied", "conflict"])
    .is("superseded_at", null)
    .maybeSingle();
  if (error) throw persistenceError("The prefill suggestion could not be checked.");
  if (existing) {
    throw new Phase1OnboardingError(
      "invalid_input",
      "Supersede the active suggestion for this field before creating another."
    );
  }

  const prepared = prepareSuggestions(loaded, [
    {
      sectionKey: input.sectionKey,
      fieldKey: input.fieldKey,
      proposedValue: input.proposedValue,
      sourceType: input.sourceType,
      sourceLabel: safeInternalLabel(input.sourceLabel, 200),
      sourceReferenceId: optionalInternalReference(
        input.sourceReferenceId
      ),
      confidence: normalizeConfidence(input.confidence)
    }
  ]);
  if (prepared.length !== 1) {
    throw new Phase1OnboardingError(
      "invalid_input",
      "The proposed value already matches the current onboarding value."
    );
  }
  return prepareBatch(admin, context, loaded, {
    requestId: input.requestId,
    sourceSummary: `Structured ${input.sourceType.replaceAll("_", " ")} suggestion.`,
    batchStatus: "ready_for_review",
    origin: "manual",
    suggestions: prepared
  });
}

export async function reviewPrefillSuggestion(
  context: InternalOnboardingContext,
  input: {
    requestId: string;
    workspaceId: string;
    valueId: string;
    expectedBatchVersion: number;
    action: "approve" | "reject" | "supersede";
  }
) {
  assertPrefillEnabled();
  const admin = requireAdmin();
  const payloadHash = hashPrefill({
    partnerSlug: context.partnerSlug,
    ...input
  });
  const { data, error } = await admin.rpc(
    "rcap_service_review_onboarding_prefill",
    {
      p_partner_slug: context.partnerSlug,
      p_actor_user_id: context.authUserId,
      p_workspace_id: input.workspaceId,
      p_value_id: input.valueId,
      p_expected_batch_version: input.expectedBatchVersion,
      p_action: input.action,
      p_request_id: input.requestId,
      p_payload_hash: payloadHash
    }
  );
  if (error) throw mutationError(error);
  const row = firstRpcRow(data);
  if (!row) throw persistenceError("The prefill review was not saved.");
  return {
    batchVersion: Number(row.batch_aggregate_version),
    reviewStatus: String(row.review_status) as PrefillReviewStatus,
    duplicate: row.duplicate === true
  };
}

export async function applyOnboardingPrefill(
  context: InternalOnboardingContext,
  input: {
    requestId: string;
    workspaceId: string;
    expectedWorkspaceVersion: number;
    selectedValueIds: string[];
  }
) {
  assertPrefillEnabled();
  const admin = requireAdmin();
  const loaded = await requireCanonicalWorkspace(admin, context.partnerSlug);
  if (
    loaded.workspace.id !== input.workspaceId ||
    loaded.workspace.aggregate_version !== input.expectedWorkspaceVersion
  ) {
    throw new Phase1OnboardingError(
      "revision_conflict",
      "Newer onboarding information is available."
    );
  }
  const selectedIds = [...new Set(input.selectedValueIds)];
  if (selectedIds.length < 1 || selectedIds.length > 200) {
    throw new Phase1OnboardingError(
      "invalid_input",
      "Choose one or more approved suggestions."
    );
  }
  const { data: valuesData, error: valuesError } = await admin
    .from("partner_onboarding_prefill_values")
    .select(
      "id, batch_id, workspace_id, section_key, field_key, proposed_value, source_type, source_reference_id, source_label, confidence, review_status, base_value_hash, proposed_value_hash, base_section_revision, applied_value_hash, applied_section_revision, applied_workspace_version, partner_review_status, partner_reviewed_at, partner_modified, created_by, created_at, reviewed_by, reviewed_at, applied_at, superseded_at"
    )
    .eq("workspace_id", input.workspaceId)
    .in("id", selectedIds);
  if (valuesError) throw persistenceError("Approved suggestions could not be loaded.");
  const selected = (valuesData ?? []) as ValueRow[];
  if (selected.length !== selectedIds.length) {
    throw new Phase1OnboardingError(
      "invalid_input",
      "One or more selected suggestions are unavailable."
    );
  }

  let nextData = loaded.data;
  const conflictIds = new Set<string>();
  const grouped = new Map<OnboardingSectionKey, ValueRow[]>();
  for (const value of selected) {
    const sectionKey = asSectionKey(value.section_key);
    const section = loaded.sections.find(
      (candidate) => candidate.section_key === sectionKey
    );
    let eligible = value.review_status === "approved";
    try {
      const field = requirePrefillEligibleField(sectionKey, value.field_key);
      eligible =
        eligible &&
        Boolean(section) &&
        ["not_started", "in_progress"].includes(section?.status ?? "") &&
        Number(section?.revision ?? -1) === value.base_section_revision &&
        hashPrefill(
          canonicalPrefillFieldValue(
            loaded.data,
            sectionKey,
            value.field_key
          )
        ) === value.base_value_hash &&
        isFieldActive(field, loaded.data, loaded.derivationContext);
    } catch {
      eligible = false;
    }
    if (!eligible) {
      conflictIds.add(value.id);
      continue;
    }
    nextData = withCanonicalPrefillValue(
      nextData,
      sectionKey,
      value.field_key,
      value.proposed_value
    );
    grouped.set(sectionKey, [...(grouped.get(sectionKey) ?? []), value]);
  }

  const sectionUpdates: Array<Record<string, unknown>> = [];
  for (const [sectionKey, values] of grouped) {
    const section = loaded.sections.find(
      (candidate) => candidate.section_key === sectionKey
    );
    if (!section) {
      values.forEach((value) => conflictIds.add(value.id));
      continue;
    }
    const validation = validateOnboardingSection(
      sectionKey,
      nextData[sectionKey] ?? {},
      "draft_save",
      {
        ...loaded.derivationContext,
        allSections: nextData
      }
    );
    if (!validation.success || !validation.data) {
      values.forEach((value) => conflictIds.add(value.id));
      continue;
    }
    nextData = {
      ...nextData,
      [sectionKey]: validation.data
    };
  }

  const applicableSections = [...grouped.entries()]
    .filter(([, values]) =>
      values.every((value) => !conflictIds.has(value.id))
    )
    .map(([sectionKey]) => sectionKey);
  const pendingSections = new Set([
    ...loaded.pendingPrefillSections,
    ...applicableSections
  ]);
  const summary = deriveOnboardingSummary(nextData, {
    ...loaded.derivationContext,
    pendingPrefillSections: [...pendingSections]
  });

  for (const sectionKey of applicableSections) {
    const values = grouped.get(sectionKey) ?? [];
    const section = loaded.sections.find(
      (candidate) => candidate.section_key === sectionKey
    );
    if (!section) continue;
    const normalized = separateCollections(
      sectionKey,
      nextData[sectionKey] ?? {}
    );
    const missingRequiredKeys = summary.completion.missingRequirements
      .filter((item) => item.sectionKey === sectionKey)
      .map((item) => item.fieldKey);
    sectionUpdates.push({
      sectionKey,
      expectedRevision: section.revision,
      valueIds: values.map((value) => value.id),
      baseValues: Object.fromEntries(
        values.map((value) => [
          value.id,
          canonicalPrefillFieldValue(
            loaded.data,
            sectionKey,
            value.field_key
          )
        ])
      ),
      responseData: normalized.responseData,
      collections: normalized.collections,
      completionPercentage: sectionCompletion(summary, sectionKey),
      missingRequiredKeys
    });
  }

  const payload = {
    workspaceId: input.workspaceId,
    expectedWorkspaceVersion: input.expectedWorkspaceVersion,
    selectedValueIds: selectedIds,
    sectionUpdates,
    conflictIds: [...conflictIds]
  };
  const { data, error } = await admin.rpc(
    "rcap_service_apply_onboarding_prefill",
    {
      p_partner_slug: context.partnerSlug,
      p_actor_user_id: context.authUserId,
      p_workspace_id: input.workspaceId,
      p_expected_workspace_version: input.expectedWorkspaceVersion,
      p_selected_value_ids: selectedIds,
      p_section_updates: sectionUpdates,
      p_workspace_completion: summary.completion.percentage,
      p_blocker_code: summary.blockerCode,
      p_next_action_code: summary.nextActionCode,
      p_next_action_owner: summary.nextActionOwner,
      p_request_id: input.requestId,
      p_payload_hash: hashPrefill(payload)
    }
  );
  if (error) throw mutationError(error);
  const row = firstRpcRow(data);
  if (!row) throw persistenceError("Approved suggestions were not applied.");
  return {
    workspaceVersion: Number(row.workspace_aggregate_version),
    result: objectValue(row.result),
    duplicate: row.duplicate === true
  };
}

export function hashPrefill(value: unknown): string {
  return crypto
    .createHash("sha256")
    .update(stablePrefillJson(value))
    .digest("hex");
}

function prepareSuggestions(
  loaded: LoadedWorkspace,
  candidates: CandidateSuggestion[]
): PreparedSuggestion[] {
  const prepared: PreparedSuggestion[] = [];
  for (const candidate of candidates) {
    const section = loaded.sections.find(
      (row) => row.section_key === candidate.sectionKey
    );
    if (!section) continue;
    const proposedValue = normalizePrefillValue(
      candidate.sectionKey,
      candidate.fieldKey,
      candidate.proposedValue,
      loaded.data,
      loaded.derivationContext
    );
    const currentValue = canonicalPrefillFieldValue(
      loaded.data,
      candidate.sectionKey,
      candidate.fieldKey
    );
    if (stablePrefillJson(currentValue) === stablePrefillJson(proposedValue)) {
      continue;
    }
    prepared.push({
      ...candidate,
      id: crypto.randomUUID(),
      proposedValue,
      sourceLabel: safeInternalLabel(candidate.sourceLabel, 200),
      sourceReferenceId: optionalInternalReference(
        candidate.sourceReferenceId
      ),
      confidence: normalizeConfidence(candidate.confidence),
      baseValueHash: hashPrefill(currentValue),
      proposedValueHash: hashPrefill(proposedValue),
      baseSectionRevision: Number(section.revision)
    });
  }
  return prepared;
}

async function prepareBatch(
  admin: SupabaseAdmin,
  context: InternalOnboardingContext,
  loaded: LoadedWorkspace,
  input: {
    requestId: string;
    sourceSummary: string;
    batchStatus: "draft" | "ready_for_review";
    origin: "manual" | "import";
    suggestions: PreparedSuggestion[];
  }
) {
  const payloadHash = hashPrefill({
    workspaceId: loaded.workspace.id,
    sourceSummary: input.sourceSummary,
    batchStatus: input.batchStatus,
    origin: input.origin,
    suggestions: input.suggestions
  });
  const { data, error } = await admin.rpc(
    "rcap_service_prepare_onboarding_prefill",
    {
      p_partner_slug: context.partnerSlug,
      p_actor_user_id: context.authUserId,
      p_workspace_id: loaded.workspace.id,
      p_request_id: input.requestId,
      p_payload_hash: payloadHash,
      p_source_summary: safeInternalLabel(input.sourceSummary, 500),
      p_batch_status: input.batchStatus,
      p_origin: input.origin,
      p_suggestions: input.suggestions
    }
  );
  if (error) throw mutationError(error);
  const row = firstRpcRow(data);
  if (!row) throw persistenceError("The prefill batch was not created.");
  return {
    batchId: String(row.batch_id),
    batchVersion: Number(row.batch_aggregate_version),
    created: Number(row.suggestion_count),
    duplicate: row.duplicate === true
  };
}

function knownPartnerCandidates(
  loaded: LoadedWorkspace,
  partner: PartnerRecordSourceRow,
  users: ActivePartnerUserRow[]
): CandidateSuggestion[] {
  const candidates: CandidateSuggestion[] = [];
  const add = (
    sectionKey: OnboardingSectionKey,
    fieldKey: string,
    proposedValue: unknown,
    sourceType: PrefillSourceType,
    sourceLabel: string,
    sourceReferenceId: string | null = partner.id
  ) => {
    if (
      proposedValue !== null &&
      proposedValue !== undefined &&
      proposedValue !== "" &&
      (!Array.isArray(proposedValue) || proposedValue.length > 0)
    ) {
      candidates.push({
        sectionKey,
        fieldKey,
        proposedValue,
        sourceType,
        sourceReferenceId,
        sourceLabel
      });
    }
  };

  add(
    "organization_contacts",
    "legal_organization_name",
    partner.legal_name,
    "partner_record",
    "Existing partner legal identity"
  );
  add(
    "organization_contacts",
    "public_organization_name",
    partner.organization_name ?? partner.partner_name,
    "partner_record",
    "Existing partner profile"
  );
  if (
    partner.organization_type &&
    (ORGANIZATION_TYPES as readonly string[]).includes(
      partner.organization_type
    )
  ) {
    add(
      "organization_contacts",
      "organization_type",
      partner.organization_type,
      "partner_record",
      "Existing partner profile"
    );
  }
  add(
    "organization_contacts",
    "website",
    partner.website,
    "partner_record",
    "Existing partner profile"
  );
  add(
    "organization_contacts",
    "public_program_name",
    partner.program_name,
    "partner_record",
    "Existing partner program"
  );
  add(
    "program_goals",
    "primary_goal",
    partner.program_goal,
    "partner_record",
    "Existing partner program"
  );
  add(
    "program_goals",
    "target_population",
    partner.audience_description,
    "partner_record",
    "Existing partner program"
  );
  add(
    "program_goals",
    "expected_screening_volume",
    partner.expected_monthly_participants,
    "partner_record",
    "Existing monthly participant estimate"
  );
  if (partner.expected_monthly_participants !== null) {
    add(
      "program_goals",
      "expected_screening_period",
      "Per month",
      "partner_record",
      "Existing monthly participant estimate"
    );
  }
  add(
    "geography_audience_language_accessibility",
    "service_area_description",
    partner.service_area,
    "partner_record",
    "Existing partner service area"
  );
  const jurisdiction = partner.target_state
    ? canonicalOnboardingJurisdiction(partner.target_state)
    : null;
  add(
    "geography_audience_language_accessibility",
    "jurisdictions",
    jurisdiction ? [jurisdiction] : null,
    "partner_record",
    "Existing partner jurisdiction"
  );
  add(
    "geography_audience_language_accessibility",
    "counties",
    partner.target_county ? [partner.target_county] : null,
    "partner_record",
    "Existing partner service area"
  );

  const contacts: OnboardingContact[] = [];
  const primaryEmail =
    partner.primary_contact_email ?? partner.contact_email;
  const primaryName =
    partner.primary_contact_name ?? partner.contact_name;
  if (primaryEmail || primaryName) {
    contacts.push({
      stable_row_id: deterministicUuid(
        `${loaded.workspace.id}:partner-contact:${partner.id}`
      ),
      role: "program_operator",
      name: primaryName ?? undefined,
      title: partner.primary_contact_title ?? undefined,
      organization:
        partner.organization_name ?? partner.partner_name ?? null,
      work_email: primaryEmail ?? undefined,
      phone: partner.primary_contact_phone
    });
  }
  if (
    loaded.workspace.billing_contact_email ||
    loaded.workspace.billing_contact_name
  ) {
    contacts.push({
      stable_row_id: deterministicUuid(
        `${loaded.workspace.id}:billing-contact`
      ),
      role: "finance_procurement_contact",
      name: loaded.workspace.billing_contact_name ?? undefined,
      organization:
        partner.organization_name ?? partner.partner_name ?? null,
      work_email: loaded.workspace.billing_contact_email ?? undefined
    });
  }
  add(
    "organization_contacts",
    "contacts",
    contacts,
    loaded.workspace.billing_contact_email ? "order_form" : "contact_record",
    "Existing partner and order-form contacts"
  );

  const plannedUsers: PlannedDashboardUser[] = users.flatMap((user) => {
    if (!user.invited_email) return [];
    return [
      {
        stable_row_id: user.id,
        work_email: user.invited_email,
        requested_role:
          user.role === "partner_admin"
            ? ("partner_administrator" as const)
            : ("program_staff" as const),
        special_permissions: [],
        training_attendee: false
      }
    ];
  });
  add(
    "staff_dashboard_plan",
    "planned_users",
    plannedUsers,
    "contact_record",
    "Existing active partner memberships",
    null
  );

  add(
    "organization_contacts",
    "public_organization_name",
    loaded.workspace.public_display_name,
    "partner_record",
    "Existing partner page configuration",
    loaded.workspace.id
  );
  add(
    "brand_public_page",
    "program_headline",
    loaded.workspace.public_headline,
    "partner_record",
    "Existing partner page configuration",
    loaded.workspace.id
  );
  add(
    "brand_public_page",
    "program_subheadline",
    loaded.workspace.public_subheadline,
    "partner_record",
    "Existing partner page configuration",
    loaded.workspace.id
  );
  add(
    "brand_public_page",
    "participant_support_copy",
    loaded.workspace.support_instructions,
    "partner_record",
    "Existing partner page configuration",
    loaded.workspace.id
  );
  if (partner.access_mode === "open") {
    add(
      "access_sponsorship_capacity",
      "participant_access_model",
      "open",
      "partner_record",
      "Existing partner access configuration"
    );
  }
  return dedupeCandidates(candidates);
}

type LoadedWorkspace = {
  workspace: WorkspaceRow;
  sections: SectionRow[];
  data: OnboardingPartnerData;
  pendingPrefillSections: OnboardingSectionKey[];
  derivationContext: Parameters<typeof deriveOnboardingSummary>[1];
};

async function loadCanonicalWorkspace(
  admin: SupabaseAdmin,
  partnerSlug: string
): Promise<LoadedWorkspace | null> {
  const { data: workspaceData, error: workspaceError } = await admin
    .from("partner_onboarding")
    .select(
      "id, partner_slug, partner_record_id, status, aggregate_version, commercial_gate_status, public_display_name, public_headline, public_subheadline, support_instructions, billing_contact_name, billing_contact_email, agreement_status"
    )
    .eq("partner_slug", partnerSlug)
    .maybeSingle();
  if (workspaceError) throw persistenceError("The onboarding workspace could not be loaded.");
  if (!workspaceData) return null;
  const workspace = workspaceData as WorkspaceRow;
  if (!workspace.partner_record_id) {
    throw persistenceError("The onboarding workspace is missing its immutable partner relationship.");
  }

  const [
    sectionsResult,
    contactsResult,
    plannedUsersResult,
    recipientsResult,
    changesResult,
    assetsResult,
    agreementsResult,
    partnerResult,
    entitlementResult,
    pendingResult
  ] = await Promise.all([
    admin
      .from("partner_onboarding_sections")
      .select(
        "id, workspace_id, section_key, response_data, revision, status, completion_percentage, missing_required_keys"
      )
      .eq("workspace_id", workspace.id),
    admin
      .from("partner_onboarding_contacts")
      .select("id, role, name, title, organization, work_email, phone")
      .eq("workspace_id", workspace.id)
      .is("deleted_at", null)
      .order("created_at", { ascending: true }),
    admin
      .from("partner_onboarding_planned_users")
      .select(
        "id, name, work_email, requested_role, special_permissions, training_attendee"
      )
      .eq("workspace_id", workspace.id)
      .is("deleted_at", null)
      .order("created_at", { ascending: true }),
    admin
      .from("partner_onboarding_report_recipients")
      .select("id, name, work_email")
      .eq("workspace_id", workspace.id)
      .is("deleted_at", null)
      .order("created_at", { ascending: true }),
    admin
      .from("partner_onboarding_change_requests")
      .select("section_id, status")
      .eq("workspace_id", workspace.id)
      .in("status", ["open", "partner_responded"]),
    admin
      .from("partner_onboarding_assets")
      .select("category")
      .eq("workspace_id", workspace.id)
      .is("deleted_at", null)
      .in("lifecycle_status", ["pending_review", "active"]),
    admin
      .from("partner_onboarding_agreements")
      .select("agreement_type, is_required, status")
      .eq("workspace_id", workspace.id),
    admin
      .from("partner_records")
      .select("id, selected_package_id")
      .eq("id", workspace.partner_record_id)
      .maybeSingle(),
    admin
      .from("partner_entitlement")
      .select("overage_enabled")
      .eq("partner_slug", partnerSlug)
      .maybeSingle(),
    admin
      .from("partner_onboarding_prefill_values")
      .select("section_key")
      .eq("workspace_id", workspace.id)
      .eq("review_status", "applied")
      .eq("partner_review_status", "pending")
  ]);
  const required = [
    sectionsResult,
    contactsResult,
    plannedUsersResult,
    recipientsResult,
    changesResult,
    assetsResult,
    agreementsResult,
    partnerResult,
    pendingResult
  ];
  if (required.some((result) => result.error)) {
    throw persistenceError("The onboarding workspace could not be loaded.");
  }
  const sections = (sectionsResult.data ?? []) as SectionRow[];
  const contacts = (contactsResult.data ?? []) as Array<{
    id: string;
    role: string;
    name: string;
    title: string;
    organization: string | null;
    work_email: string;
    phone: string | null;
  }>;
  const plannedUsers = (plannedUsersResult.data ?? []) as Array<{
    id: string;
    name: string;
    work_email: string;
    requested_role: string;
    special_permissions: string[] | null;
    training_attendee: boolean;
  }>;
  const recipients = (recipientsResult.data ?? []) as Array<{
    id: string;
    name: string | null;
    work_email: string;
  }>;
  const data = buildPartnerData(sections, contacts, plannedUsers, recipients);
  const pendingPrefillSections = [
    ...new Set(
      ((pendingResult.data ?? []) as Array<{ section_key: string }>).map(
        (row) => asSectionKey(row.section_key)
      )
    )
  ];
  const agreements = (agreementsResult.data ?? []) as Array<{
    agreement_type: string;
    is_required: boolean;
    status: string;
  }>;
  const procurementRequired = agreements.some(
    (agreement) =>
      agreement.agreement_type === "procurement_requirements" &&
      agreement.is_required
  );
  const procurementItemsMissing = agreements.some(
    (agreement) =>
      agreement.agreement_type === "procurement_requirements" &&
      agreement.is_required &&
      !["finalized", "executed", "approved", "waived"].includes(
        agreement.status
      )
  );
  const recordShieldScope = deriveRecordShieldScope(
    (
      partnerResult.data as {
        id: string;
        selected_package_id: string | null;
      } | null
    )?.selected_package_id
  );
  const derivationContext: Parameters<typeof deriveOnboardingSummary>[1] = {
    workspaceStatus: asWorkspaceStatus(workspace.status),
    commercialGateOutcome: asCommercialGate(
      workspace.commercial_gate_status
    ),
    sectionStatuses: Object.fromEntries(
      sections.map((section) => [
        asSectionKey(section.section_key),
        asSectionStatus(section.status)
      ])
    ),
    presentAssetCategories: (
      (assetsResult.data ?? []) as Array<{ category: string }>
    ).map((asset) => asset.category) as Parameters<
      typeof deriveOnboardingSummary
    >[1]["presentAssetCategories"],
    unresolvedChangeRequests: (
      (changesResult.data ?? []) as Array<{
        section_id: string;
        status: "open" | "partner_responded";
      }>
    ).map((change) => {
      const section = sections.find(
        (candidate) => candidate.id === change.section_id
      );
      if (!section) throw persistenceError("A change request has no section.");
      return {
        sectionKey: asSectionKey(section.section_key),
        status: change.status
      };
    }),
    pendingPrefillSections,
    procurementRequired,
    procurementItemsMissing,
    recordShieldInScope: recordShieldScope.inScope,
    overageApprovalRequired:
      (
        entitlementResult.data as { overage_enabled?: boolean } | null
      )?.overage_enabled === true
  };
  return {
    workspace,
    sections,
    data,
    pendingPrefillSections,
    derivationContext
  };
}

async function requireCanonicalWorkspace(
  admin: SupabaseAdmin,
  partnerSlug: string
): Promise<LoadedWorkspace> {
  const loaded = await loadCanonicalWorkspace(admin, partnerSlug);
  if (!loaded) {
    throw new Phase1OnboardingError(
      "workspace_not_found",
      "Create the Phase 1 onboarding workspace before preparing prefill."
    );
  }
  return loaded;
}

function buildPartnerData(
  sections: SectionRow[],
  contacts: Array<{
    id: string;
    role: string;
    name: string;
    title: string;
    organization: string | null;
    work_email: string;
    phone: string | null;
  }>,
  plannedUsers: Array<{
    id: string;
    name: string;
    work_email: string;
    requested_role: string;
    special_permissions: string[] | null;
    training_attendee: boolean;
  }>,
  recipients: Array<{
    id: string;
    name: string | null;
    work_email: string;
  }>
): OnboardingPartnerData {
  const data: OnboardingPartnerData = {};
  for (const sectionKey of ONBOARDING_SECTION_ORDER) {
    const row = sections.find(
      (candidate) => candidate.section_key === sectionKey
    );
    data[sectionKey] = { ...(row?.response_data ?? {}) } as never;
  }
  data.organization_contacts = {
    ...(data.organization_contacts ?? {}),
    contacts: contacts.map((contact) => ({
      stable_row_id: contact.id,
      role: contact.role as OnboardingContact["role"],
      name: contact.name,
      title: contact.title,
      organization: contact.organization,
      work_email: contact.work_email,
      phone: contact.phone
    }))
  };
  data.staff_dashboard_plan = {
    ...(data.staff_dashboard_plan ?? {}),
    planned_users: plannedUsers.map((user) => ({
      stable_row_id: user.id,
      name: user.name,
      work_email: user.work_email,
      requested_role:
        user.requested_role as PlannedDashboardUser["requested_role"],
      special_permissions:
        (user.special_permissions ??
          []) as PlannedDashboardUser["special_permissions"],
      training_attendee: user.training_attendee
    }))
  };
  data.support_referrals_reporting = {
    ...(data.support_referrals_reporting ?? {}),
    report_recipients: recipients.map((recipient) => ({
      stable_row_id: recipient.id,
      name: recipient.name,
      work_email: recipient.work_email
    }))
  };
  return data;
}

function mapInternalSuggestion(
  row: ValueRow,
  batches: ReadonlyMap<string, BatchRow>,
  loaded: LoadedWorkspace
): InternalPrefillSuggestionView {
  const sectionKey = asSectionKey(row.section_key);
  const section = loaded.sections.find(
    (candidate) => candidate.section_key === sectionKey
  );
  const currentValue = canonicalPrefillFieldValue(
    loaded.data,
    sectionKey,
    row.field_key
  );
  let conflictReason: string | null = null;
  if (
    ["proposed", "approved", "conflict"].includes(row.review_status) &&
    !["not_started", "in_progress"].includes(section?.status ?? "")
  ) {
    conflictReason = "The section is no longer eligible for prefill.";
  } else if (
    ["proposed", "approved", "conflict"].includes(row.review_status) &&
    Number(section?.revision ?? -1) !== row.base_section_revision
  ) {
    conflictReason = "The section changed after this suggestion was prepared.";
  } else if (
    ["proposed", "approved", "conflict"].includes(row.review_status) &&
    hashPrefill(currentValue) !== row.base_value_hash
  ) {
    conflictReason = "The current field value changed after this suggestion was prepared.";
  } else {
    try {
      const field = requirePrefillEligibleField(sectionKey, row.field_key);
      if (!isFieldActive(field, loaded.data, loaded.derivationContext)) {
        conflictReason = "The field is not active for the current setup.";
      }
    } catch {
      conflictReason = "The field is no longer eligible for prefill.";
    }
  }
  if (row.review_status === "conflict" && !conflictReason) {
    conflictReason = "The suggestion requires a new reviewed value.";
  }
  const batch = batches.get(row.batch_id);
  return {
    id: row.id,
    batchId: row.batch_id,
    batchVersion: Number(batch?.aggregate_version ?? 0),
    sectionKey,
    sectionLabel:
      ONBOARDING_SECTION_DEFINITIONS.find(
        (definition) => definition.key === sectionKey
      )?.label ?? sectionKey,
    fieldKey: row.field_key,
    fieldLabel:
      getFieldDefinition(
        row.field_key as Parameters<typeof getFieldDefinition>[0]
      )?.label ?? row.field_key,
    currentValue,
    proposedValue: row.proposed_value,
    sourceType: row.source_type,
    sourceReferenceId: row.source_reference_id,
    sourceLabel: row.source_label,
    confidence:
      row.confidence === null ? null : Number(row.confidence),
    reviewStatus: row.review_status,
    partnerReviewStatus: row.partner_review_status,
    conflict:
      row.review_status === "conflict" || conflictReason !== null,
    conflictReason,
    createdBy: row.created_by,
    createdAt: row.created_at,
    appliedAt: row.applied_at
  };
}

function summarizeSuggestions(
  suggestions: InternalPrefillSuggestionView[]
): InternalPrefillSnapshot["summary"] {
  return {
    total: suggestions.length,
    proposed: suggestions.filter(
      (suggestion) => suggestion.reviewStatus === "proposed"
    ).length,
    approved: suggestions.filter(
      (suggestion) => suggestion.reviewStatus === "approved"
    ).length,
    conflicts: suggestions.filter((suggestion) => suggestion.conflict).length,
    applied: suggestions.filter(
      (suggestion) => suggestion.reviewStatus === "applied"
    ).length,
    awaitingPartnerReview: suggestions.filter(
      (suggestion) => suggestion.partnerReviewStatus === "pending"
    ).length,
    confirmed: suggestions.filter(
      (suggestion) => suggestion.partnerReviewStatus === "confirmed"
    ).length,
    modified: suggestions.filter(
      (suggestion) => suggestion.partnerReviewStatus === "modified"
    ).length,
    rejected: suggestions.filter(
      (suggestion) =>
        suggestion.reviewStatus === "rejected" ||
        suggestion.partnerReviewStatus === "rejected"
    ).length
  };
}

function emptySummary(): InternalPrefillSnapshot["summary"] {
  return {
    total: 0,
    proposed: 0,
    approved: 0,
    conflicts: 0,
    applied: 0,
    awaitingPartnerReview: 0,
    confirmed: 0,
    modified: 0,
    rejected: 0
  };
}

function eligibleFieldOptions(): InternalPrefillSnapshot["eligibleFields"] {
  return getPrefillEligibleFields(undefined, {
    includeCollections: false
  }).map((field) => ({
    sectionKey: field.sectionKey,
    sectionLabel:
      ONBOARDING_SECTION_DEFINITIONS.find(
        (section) => section.key === field.sectionKey
      )?.label ?? field.sectionKey,
    fieldKey: String(field.key),
    fieldLabel: field.label,
    dataType: field.dataType,
    enumValues: field.enumValues ?? [],
    maxLength: field.maxLength ?? null
  }));
}

function separateCollections<K extends OnboardingSectionKey>(
  sectionKey: K,
  data: OnboardingSectionDataMap[K]
) {
  const responseData = { ...(data as Record<string, unknown>) };
  const collections: {
    contacts?: OnboardingContact[];
    planned_users?: PlannedDashboardUser[];
    report_recipients?: OnboardingReportRecipient[];
  } = {};
  if (sectionKey === "organization_contacts") {
    collections.contacts =
      (responseData.contacts as OnboardingContact[] | undefined) ?? [];
    delete responseData.contacts;
  }
  if (sectionKey === "staff_dashboard_plan") {
    collections.planned_users =
      (responseData.planned_users as PlannedDashboardUser[] | undefined) ?? [];
    delete responseData.planned_users;
  }
  if (sectionKey === "support_referrals_reporting") {
    collections.report_recipients =
      (responseData.report_recipients as
        | OnboardingReportRecipient[]
        | undefined) ?? [];
    delete responseData.report_recipients;
  }
  return { responseData, collections };
}

function sectionCompletion(
  summary: OnboardingDerivedSummary,
  sectionKey: OnboardingSectionKey
): number {
  const requirements = summary.completion.requirements.filter(
    (requirement) => requirement.sectionKey === sectionKey
  );
  const total = requirements.reduce(
    (sum, requirement) => sum + requirement.weight,
    0
  );
  const completed = requirements.reduce(
    (sum, requirement) =>
      sum + (requirement.completed ? requirement.weight : 0),
    0
  );
  return total === 0 ? 100 : Math.round((completed / total) * 100);
}

function dedupeCandidates(
  candidates: CandidateSuggestion[]
): CandidateSuggestion[] {
  const byTarget = new Map<string, CandidateSuggestion>();
  for (const candidate of candidates) {
    const key = `${candidate.sectionKey}:${candidate.fieldKey}`;
    if (!byTarget.has(key)) byTarget.set(key, candidate);
  }
  return [...byTarget.values()];
}

function deterministicUuid(seed: string): string {
  const bytes = crypto.createHash("sha256").update(seed).digest().subarray(0, 16);
  bytes[6] = (bytes[6] & 0x0f) | 0x50;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = bytes.toString("hex");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

function safeInternalLabel(value: string, maxLength: number): string {
  const normalized = value.replace(/\s+/gu, " ").trim();
  if (
    normalized.length < 1 ||
    normalized.length > maxLength ||
    /[\u0000-\u001f\u007f]/u.test(normalized)
  ) {
    throw new Phase1OnboardingError(
      "invalid_input",
      "Enter a short source label without control characters."
    );
  }
  return normalized;
}

function optionalInternalReference(
  value: string | null | undefined
): string | null {
  if (!value?.trim()) return null;
  return safeInternalLabel(value, 200);
}

function normalizeConfidence(
  value: number | null | undefined
): number | null {
  if (value === null || value === undefined) return null;
  if (!Number.isFinite(value) || value < 0 || value > 1) {
    throw new Phase1OnboardingError(
      "invalid_input",
      "Confidence must be between 0 and 1."
    );
  }
  return Math.round(value * 10_000) / 10_000;
}

function asWorkspaceStatus(value: string): OnboardingWorkspaceStatus {
  const allowed: readonly string[] = [
    "draft",
    "commercially_blocked",
    "setup_in_progress",
    "waiting_on_partner",
    "ready_for_review",
    "ready_to_launch",
    "live",
    "paused",
    "closed"
  ];
  if (!allowed.includes(value)) throw persistenceError("Invalid workspace status.");
  return value as OnboardingWorkspaceStatus;
}

function asSectionStatus(value: string): OnboardingSectionStatus {
  const allowed: readonly string[] = [
    "not_started",
    "in_progress",
    "submitted",
    "needs_changes",
    "approved",
    "waived",
    "not_applicable"
  ];
  if (!allowed.includes(value)) throw persistenceError("Invalid section status.");
  return value as OnboardingSectionStatus;
}

function asSectionKey(value: string): OnboardingSectionKey {
  if (!(ONBOARDING_SECTION_ORDER as readonly string[]).includes(value)) {
    throw persistenceError("Invalid onboarding section.");
  }
  return value as OnboardingSectionKey;
}

function asCommercialGate(value: string) {
  const allowed = [
    "blocked",
    "cleared_by_paid_invoice",
    "cleared_by_approved_purchase_order",
    "cleared_by_authorized_internal_override"
  ] as const;
  if (!(allowed as readonly string[]).includes(value)) {
    throw persistenceError("Invalid commercial gate.");
  }
  return value as (typeof allowed)[number];
}

function requireAdmin(): SupabaseAdmin {
  const admin = getSupabaseAdminClient();
  if (!admin) throw persistenceError("Onboarding persistence is not configured.");
  return admin;
}

function assertPrefillEnabled(): void {
  if (!isRcapOnboardingPrefillEnabled()) {
    throw new Phase1OnboardingError(
      "feature_disabled",
      "Onboarding prefill is not available."
    );
  }
}

function mutationError(error: { code?: string; message?: string }) {
  const message = error.message ?? "";
  if (error.code === "40001" || /revision conflict/iu.test(message)) {
    return new Phase1OnboardingError(
      "revision_conflict",
      "Newer onboarding information is available."
    );
  }
  if (error.code === "23505" || /idempotency/iu.test(message)) {
    return new Phase1OnboardingError(
      "duplicate_request",
      "This request ID was already used for different prefill work."
    );
  }
  if (error.code === "42501") {
    return new Phase1OnboardingError(
      "forbidden",
      "This account cannot change onboarding prefill."
    );
  }
  if (error.code === "55000") {
    return new Phase1OnboardingError(
      "invalid_transition",
      "The current onboarding state does not allow this prefill action."
    );
  }
  return persistenceError("The onboarding prefill change could not be saved.");
}

function persistenceError(message: string) {
  return new Phase1OnboardingError("persistence_failed", message);
}

function firstRpcRow(data: unknown): Record<string, unknown> | null {
  if (Array.isArray(data)) {
    const first = data[0];
    return first && typeof first === "object"
      ? (first as Record<string, unknown>)
      : null;
  }
  return data && typeof data === "object"
    ? (data as Record<string, unknown>)
    : null;
}

function objectValue(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}
