import "server-only";

import crypto from "node:crypto";
import { createServerSupabaseAuthClient } from "@/lib/supabase/auth-server";
import { getSupabaseAdminClient } from "@/lib/supabase/server";
import type {
  PartnerOnboardingContext,
  InternalOnboardingContext
} from "./auth-context";
import {
  deriveOnboardingSummary,
  isFieldActive,
  isFieldRequired,
  ONBOARDING_BLOCKER_COPY,
  ONBOARDING_NEXT_ACTION_COPY
} from "./derivations";
import { Phase1OnboardingError } from "./errors";
import { isRcapOnboardingPrefillEnabled } from "./feature";
import {
  getPartnerEditableTopLevelFields,
  ONBOARDING_SCHEMA_VERSION,
  ONBOARDING_SECTION_DEFINITIONS,
  ONBOARDING_SECTION_ORDER
} from "./schema";
import { deriveRecordShieldScope } from "./scope";
import {
  filterValidationIssuesForGuidedStep,
  getGuidedSection,
  type PartnerFacingChangeRequest
} from "./guided-substeps";
import type {
  CommercialGateOutcome,
  OnboardingContact,
  OnboardingDerivedSummary,
  OnboardingPartnerData,
  OnboardingReadOnlyValues,
  OnboardingReportRecipient,
  OnboardingSectionDataMap,
  OnboardingSectionKey,
  OnboardingSectionStatus,
  OnboardingValidationIssue,
  OnboardingValidationMode,
  OnboardingWorkspaceStatus,
  OrganizationalAssetCategory,
  PlannedDashboardUser
} from "./types";
import {
  validateFinalOnboardingSubmission,
  validateOnboardingSection
} from "./validation";

type SupabaseAdmin = NonNullable<ReturnType<typeof getSupabaseAdminClient>>;

export type OnboardingSectionView<K extends OnboardingSectionKey = OnboardingSectionKey> = {
  id: string;
  key: K;
  title: string;
  purpose: string;
  data: OnboardingSectionDataMap[K];
  revision: number;
  status: OnboardingSectionStatus;
  completionPercentage: number;
  missingRequiredKeys: string[];
  changeRequestInstructions: string[];
  changeRequestStatus: "open" | "partner_responded" | null;
  changeRequests: OnboardingChangeRequestView[];
  pendingPrefillFieldKeys: string[];
  hasPendingPrefill: boolean;
  firstStartedAt: string | null;
  completedAt: string | null;
  submittedAt: string | null;
  approvedAt: string | null;
  waivedAt: string | null;
  reviewedAt: string | null;
  createdAt: string | null;
  updatedAt: string | null;
};

export type OnboardingChangeRequestView = PartnerFacingChangeRequest;

export type OnboardingTeamMemberView = {
  id: string;
  name: string;
  workEmail: string;
  requestedRole: string;
  trainingAttendee: boolean;
  trainingStatus: "not_started" | "scheduled" | "in_progress" | "complete";
  trainingCompletedAt: string | null;
  invitationStatus: "not_invited" | "planned" | "released";
  membershipStatus: "planned" | "active" | "disabled";
  createdAt: string;
  updatedAt: string;
};

export type OnboardingAssetView = {
  id: string;
  category: OrganizationalAssetCategory;
  originalFileName: string;
  mediaType: string;
  byteSize: number;
  width: number | null;
  height: number | null;
  lifecycleStatus: string;
  reviewStatus: string;
  uploadedAt: string;
};

export type OnboardingAgreementView = {
  id: string;
  type: "order_form" | "master_services_agreement" | "data_privacy_security_addendum" | "procurement_requirements";
  status: string;
  required: boolean;
  partnerSafeDetail: string | null;
  finalizedAssetId: string | null;
  effectiveDate: string | null;
};

export type OnboardingActivityView = {
  id: string;
  eventType: string;
  sectionKey: OnboardingSectionKey | null;
  statusCode: string | null;
  label: string;
  occurredAt: string;
};

export type PartnerOnboardingPortal = {
  workspace: {
    id: string;
    partnerRecordId: string;
    partnerSlug: string;
    status: OnboardingWorkspaceStatus;
    schemaVersion: string;
    aggregateVersion: number;
    completionPercentage: number;
    blockerCode: string | null;
    blockerCopy: string;
    nextActionCode: string;
    nextActionCopy: string;
    nextActionOwner: "partner" | "legalease" | "none";
    targetLaunchDate: string | null;
    commercialGateStatus: CommercialGateOutcome;
    commercialGateChangedAt: string | null;
    submittedAt: string | null;
    internalApprovedAt: string | null;
    launchedAt: string | null;
    pausedAt: string | null;
    closedAt: string | null;
    lastMeaningfulActivityAt: string | null;
    createdAt: string;
    updatedAt: string;
  };
  organizationName: string;
  programName: string | null;
  role: "partner_admin" | "partner_staff";
  canEdit: boolean;
  data: OnboardingPartnerData;
  sections: OnboardingSectionView[];
  teamMembers: OnboardingTeamMemberView[];
  readOnlyValues: OnboardingReadOnlyValues;
  canonicalReferences: Record<string, { value: string; sourceSection: OnboardingSectionKey }>;
  assets: OnboardingAssetView[];
  agreements: OnboardingAgreementView[];
  activity: OnboardingActivityView[];
  derivation: OnboardingDerivedSummary;
  procurementRequired: boolean;
  recordShieldInScope: boolean;
  recordShieldScopeSource: "selected_partner_package" | "unavailable";
  overageApprovalRequired: boolean;
  prefill: {
    enabled: boolean;
    hasAppliedPrefill: boolean;
    pendingCount: number;
    pendingSections: OnboardingSectionKey[];
    /**
     * The three workload counts the prepared-onboarding summary reads. They answer
     * "what did LegalEase already do, what is genuinely mine, and what is discretionary"
     * without ever presenting the partner with a defect count.
     */
    preparedCount: number;
    needsInputCount: number;
    optionalCount: number;
  };
};

export type SaveSectionInput<K extends OnboardingSectionKey = OnboardingSectionKey> = {
  sectionKey: K;
  expectedRevision: number;
  expectedWorkspaceVersion: number;
  requestId: string;
  mode: Exclude<OnboardingValidationMode, "final_submit">;
  guidedStepId?: string;
  data: unknown;
};

export type SaveSectionResult<K extends OnboardingSectionKey = OnboardingSectionKey> = {
  section: OnboardingSectionView<K>;
  workspaceVersion: number;
  completionPercentage: number;
  blockerCode: string | null;
  nextActionCode: string;
  nextActionOwner: "partner" | "legalease" | "none";
  duplicate: boolean;
};

export type SubmissionResult = {
  status: "ready_for_review";
  workspaceVersion: number;
  submittedAt: string;
  duplicate: boolean;
};

type WorkspaceSafeRow = {
  id: string;
  partner_slug: string;
  partner_record_id: string | null;
  status: string;
  schema_version: string;
  aggregate_version: number;
  completion_percentage: number;
  blocker_code: string | null;
  next_action_code: string | null;
  next_action_owner: string;
  target_launch_date: string | null;
  commercial_gate_status: string;
  commercial_gate_changed_at: string | null;
  submitted_at: string | null;
  internal_approved_at: string | null;
  launched_at: string | null;
  paused_at: string | null;
  closed_at: string | null;
  last_meaningful_activity_at: string | null;
  created_at: string;
  updated_at: string;
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
  first_started_at: string | null;
  completed_at: string | null;
  submitted_at: string | null;
  approved_at: string | null;
  waived_at: string | null;
  reviewed_at: string | null;
  created_at: string | null;
  updated_at: string | null;
};

type ContactRow = {
  id: string;
  role: string;
  name: string;
  title: string;
  organization: string | null;
  work_email: string;
  phone: string | null;
};

type PlannedUserRow = {
  id: string;
  name: string;
  work_email: string;
  requested_role: string;
  special_permissions: string[] | null;
  training_attendee: boolean;
  training_status: string;
  training_completed_at: string | null;
  invitation_status: string;
  membership_status: string;
  created_at: string;
  updated_at: string;
};

type RecipientRow = {
  id: string;
  name: string | null;
  work_email: string;
};

type ChangeRequestRow = {
  id: string;
  section_id: string;
  status: string;
  partner_safe_instructions: string;
  requested_at: string;
  partner_response: string | null;
  responded_at: string | null;
  resolved_at: string | null;
};

type AssetRow = {
  id: string;
  category: string;
  original_filename: string;
  media_type: string;
  byte_size: number;
  width_pixels: number | null;
  height_pixels: number | null;
  lifecycle_status: string;
  review_status: string;
  uploaded_at: string;
};

type AgreementRow = {
  id: string;
  agreement_type: OnboardingAgreementView["type"];
  status: string;
  is_required: boolean;
  partner_safe_detail: string | null;
  finalized_asset_id: string | null;
  effective_date: string | null;
};

type ActivityRow = {
  id: string;
  event_type: string;
  section_key: string | null;
  status_code: string | null;
  summary_code: string;
  occurred_at: string;
};

type PartnerRecordRow = {
  id: string;
  organization_name: string | null;
  partner_name: string | null;
  program_name: string | null;
  selected_package_id: string | null;
};

type PartnerPrefillSafeRow = {
  section_key: string;
  field_key: string;
  partner_review_status: string;
};

type EntitlementRow = {
  screenings_allowed: number | null;
  screenings_used: number | null;
  overage_enabled: boolean | null;
  pause_at_cap: boolean | null;
};

const ACTIVITY_COPY: Readonly<Record<string, string>> = {
  workspace_created: "LegalEase created the program setup workspace.",
  commercial_gate_changed: "The commercial setup status changed.",
  section_started: "A setup section was started.",
  section_completed: "A setup section was completed.",
  section_change_requested: "LegalEase requested changes to a setup section.",
  section_resubmitted: "Requested section updates were resubmitted.",
  required_asset_uploaded: "A required organizational asset was uploaded.",
  required_asset_replaced: "A required organizational asset was replaced.",
  required_asset_deleted: "A required organizational asset was removed.",
  onboarding_submitted: "The onboarding package was submitted for LegalEase review.",
  section_approved: "LegalEase approved a setup section.",
  section_waived: "LegalEase waived a setup section requirement.",
  ready_for_launch_decided: "LegalEase marked setup ready for launch preparation."
  ,
  prefill_applied: "LegalEase pre-filled information for partner review.",
  prefill_section_confirmed: "Pre-filled information was reviewed.",
  prefill_section_modified: "Pre-filled information was reviewed and updated."
};

export async function getPartnerOnboardingPortal(
  context: PartnerOnboardingContext
): Promise<PartnerOnboardingPortal> {
  const supabase = await createServerSupabaseAuthClient();
  const { data: workspaceData, error: workspaceError } = await supabase
    .from("partner_onboarding_workspace_safe")
    .select(
      "id, partner_slug, partner_record_id, status, schema_version, aggregate_version, completion_percentage, blocker_code, next_action_code, next_action_owner, target_launch_date, commercial_gate_status, commercial_gate_changed_at, submitted_at, internal_approved_at, launched_at, paused_at, closed_at, last_meaningful_activity_at, created_at, updated_at"
    )
    .eq("partner_slug", context.partnerSlug)
    .maybeSingle();

  if (workspaceError) {
    throw new Phase1OnboardingError("persistence_failed", "Program setup could not be loaded.");
  }

  const workspace = workspaceData as WorkspaceSafeRow | null;
  if (!workspace?.partner_record_id || workspace.partner_slug !== context.partnerSlug) {
    throw new Phase1OnboardingError("workspace_not_found", "Program setup is not available for this partner.");
  }

  const workspaceId = workspace.id;
  const [
    sectionsResult,
    contactsResult,
    plannedUsersResult,
    recipientsResult,
    changeRequestsResult,
    assetsResult,
    agreementsResult,
    activityResult,
    partnerResult,
    entitlementResult
  ] = await Promise.all([
    supabase
      .from("partner_onboarding_sections")
      .select("id, workspace_id, section_key, response_data, revision, status, completion_percentage, missing_required_keys, first_started_at, completed_at, submitted_at, approved_at, waived_at, reviewed_at, created_at, updated_at")
      .eq("workspace_id", workspaceId),
    supabase
      .from("partner_onboarding_contacts")
      .select("id, role, name, title, organization, work_email, phone")
      .eq("workspace_id", workspaceId)
      .is("deleted_at", null)
      .order("created_at", { ascending: true }),
    supabase
      .from("partner_onboarding_planned_users")
      .select("id, name, work_email, requested_role, special_permissions, training_attendee, training_status, training_completed_at, invitation_status, membership_status, created_at, updated_at")
      .eq("workspace_id", workspaceId)
      .is("deleted_at", null)
      .order("created_at", { ascending: true }),
    supabase
      .from("partner_onboarding_report_recipients")
      .select("id, name, work_email")
      .eq("workspace_id", workspaceId)
      .is("deleted_at", null)
      .order("created_at", { ascending: true }),
    supabase
      .from("partner_onboarding_change_requests_safe")
      .select(
        "id, section_id, status, partner_safe_instructions, requested_at, partner_response, responded_at, resolved_at"
      )
      .eq("workspace_id", workspaceId)
      .order("requested_at", { ascending: false }),
    supabase
      .from("partner_onboarding_assets_safe")
      .select("id, category, original_filename, media_type, byte_size, width_pixels, height_pixels, lifecycle_status, review_status, uploaded_at")
      .eq("workspace_id", workspaceId)
      .is("deleted_at", null)
      .in("lifecycle_status", ["pending_review", "active"])
      .order("uploaded_at", { ascending: false }),
    supabase
      .from("partner_onboarding_agreements_safe")
      .select("id, agreement_type, status, is_required, partner_safe_detail, finalized_asset_id, effective_date")
      .eq("workspace_id", workspaceId)
      .order("agreement_type", { ascending: true }),
    supabase
      .from("partner_onboarding_activity")
      .select("id, event_type, section_key, status_code, summary_code, occurred_at")
      .eq("workspace_id", workspaceId)
      .order("occurred_at", { ascending: false })
      .limit(12),
    supabase
      .from("partner_records")
      .select(
        "id, organization_name, partner_name, program_name, selected_package_id"
      )
      .eq("id", workspace.partner_record_id)
      .maybeSingle(),
    supabase
      .from("partner_entitlement")
      .select("screenings_allowed, screenings_used, overage_enabled, pause_at_cap")
      .eq("partner_slug", context.partnerSlug)
      .maybeSingle()
  ]);

  const requiredRead = [
    sectionsResult,
    contactsResult,
    plannedUsersResult,
    recipientsResult,
    changeRequestsResult,
    assetsResult,
    agreementsResult,
    activityResult,
    partnerResult
  ];
  if (requiredRead.some((result) => result.error)) {
    throw new Phase1OnboardingError("persistence_failed", "Program setup could not be loaded.");
  }

  const sectionRows = (sectionsResult.data ?? []) as SectionRow[];
  let prefillRows: PartnerPrefillSafeRow[] = [];
  const prefillEnabled = isRcapOnboardingPrefillEnabled();
  if (prefillEnabled) {
    const { data: safePrefillData, error: safePrefillError } = await supabase
      .from("partner_onboarding_prefill_values_safe")
      .select("section_key, field_key, partner_review_status")
      .eq("workspace_id", workspaceId);
    if (safePrefillError) {
      throw new Phase1OnboardingError(
        "persistence_failed",
        "Pre-filled setup information could not be loaded."
      );
    }
    prefillRows = (safePrefillData ?? []) as PartnerPrefillSafeRow[];
  }
  const pendingPrefillRows = prefillRows.filter(
    (row) => row.partner_review_status === "pending"
  );
  const pendingPrefillSections = [
    ...new Set(
      pendingPrefillRows.map((row) => asSectionKey(row.section_key))
    )
  ];
  const contacts = ((contactsResult.data ?? []) as ContactRow[]).map(mapContact);
  const plannedUsers = ((plannedUsersResult.data ?? []) as PlannedUserRow[]).map(mapPlannedUser);
  const recipients = ((recipientsResult.data ?? []) as RecipientRow[]).map(mapRecipient);
  const changes = (changeRequestsResult.data ?? []) as ChangeRequestRow[];
  const assets = ((assetsResult.data ?? []) as AssetRow[]).map(mapAsset);
  const agreements = ((agreementsResult.data ?? []) as AgreementRow[]).map(mapAgreement);
  const partner = partnerResult.data as PartnerRecordRow | null;
  const entitlement = entitlementResult.error ? null : (entitlementResult.data as EntitlementRow | null);

  if (!partner || partner.id !== workspace.partner_record_id) {
    throw new Phase1OnboardingError("workspace_not_found", "Program setup is not available for this partner.");
  }

  const data = buildPartnerData(sectionRows, contacts, plannedUsers, recipients);
  const procurementRequired = agreements.some(
    (agreement) => agreement.type === "procurement_requirements" && agreement.required
  );
  const recordShieldScope = deriveRecordShieldScope(
    partner.selected_package_id
  );
  const recordShieldInScope = recordShieldScope.inScope;
  const overageApprovalRequired = entitlement?.overage_enabled === true;
  const presentAssetCategories = assets.map((asset) => asset.category);
  const derivationContext = {
    workspaceStatus: asWorkspaceStatus(workspace.status),
    commercialGateOutcome: asCommercialGate(workspace.commercial_gate_status),
    sectionStatuses: Object.fromEntries(
      sectionRows.map((section) => [
        asSectionKey(section.section_key),
        asSectionStatus(section.status)
      ])
    ),
    presentAssetCategories,
    unresolvedChangeRequests: changes
      .filter(
        (change) =>
          change.status === "open" || change.status === "partner_responded"
      )
      .map((change) => {
      const section = sectionRows.find(
        (candidate) => candidate.id === change.section_id
      );
      if (!section) {
        throw new Phase1OnboardingError(
          "persistence_failed",
          "A setup change request has an invalid section."
        );
      }
      return {
        sectionKey: asSectionKey(section.section_key),
        status: asChangeRequestStatus(change.status)
      };
      }),
    pendingPrefillSections,
    procurementRequired,
    recordShieldInScope,
    overageApprovalRequired,
    // "requested" is the one agreement state that names work on the partner's side. Every
    // other blocked-gate shape is LegalEase finalising terms.
    partnerOwedCommercialStep: agreements.some(
      (agreement) => agreement.status === "requested"
    )
  };
  const derivation = deriveOnboardingSummary(data, derivationContext);

  const instructionsBySection = new Map<string, string[]>();
  for (const change of changes.filter(
    (candidate) =>
      candidate.status === "open" || candidate.status === "partner_responded"
  )) {
    const list = instructionsBySection.get(change.section_id) ?? [];
    list.push(change.partner_safe_instructions);
    instructionsBySection.set(change.section_id, list);
  }

  const sections = ONBOARDING_SECTION_DEFINITIONS.map((definition) => {
    const row = sectionRows.find((candidate) => candidate.section_key === definition.key);
    return {
      id: row?.id ?? "",
      key: definition.key,
      title: definition.label,
      purpose: definition.purpose,
      data: (data[definition.key] ?? {}) as OnboardingSectionDataMap[typeof definition.key],
      revision: Number(row?.revision ?? 0),
      status: row ? asSectionStatus(row.status) : "not_started",
      completionPercentage: Number(row?.completion_percentage ?? 0),
      missingRequiredKeys: row?.missing_required_keys ?? [],
      changeRequestInstructions: row
        ? instructionsBySection.get(row.id) ?? []
        : [],
      changeRequestStatus: row
        ? latestChangeRequestStatus(changes, row.id)
        : null,
      changeRequests: row
        ? changes
            .filter((change) => change.section_id === row.id)
            .map((change) =>
              mapPartnerChangeRequest(
                change,
                asSectionKey(definition.key)
              )
            )
        : [],
      pendingPrefillFieldKeys: pendingPrefillRows
        .filter((prefill) => prefill.section_key === definition.key)
        .map((prefill) => prefill.field_key),
      hasPendingPrefill: pendingPrefillRows.some(
        (prefill) => prefill.section_key === definition.key
      ),
      firstStartedAt: row?.first_started_at ?? null,
      completedAt: row?.completed_at ?? null,
      submittedAt: row?.submitted_at ?? null,
      approvedAt: row?.approved_at ?? null,
      waivedAt: row?.waived_at ?? null,
      reviewedAt: row?.reviewed_at ?? null,
      createdAt: row?.created_at ?? null,
      updatedAt: row?.updated_at ?? null
    };
  }) as OnboardingSectionView[];

  const readOnlyValues: OnboardingReadOnlyValues = {
    sponsored_screening_scope: entitlement ? "Configured by the executed commercial scope" : "Not configured",
    sponsored_packet_scope: entitlement ? "Configured by the executed commercial scope" : "Not configured",
    screening_allocation: entitlement?.screenings_allowed ?? null,
    packet_credits: entitlement
      ? Math.max(0, Number(entitlement.screenings_allowed ?? 0) - Number(entitlement.screenings_used ?? 0))
      : null,
    recordshield_pathway: recordShieldInScope
      ? "Included in the authoritative selected partner package."
      : "Unavailable — no authoritative selected partner package includes RecordShield for this workspace.",
    overage_behavior: entitlement?.overage_enabled
      ? "Additional use follows the executed overage terms."
      : entitlement?.pause_at_cap
        ? "Participant sponsorship pauses at the configured capacity."
        : "No partner-editable overage rule is configured.",
    legalease_technical_support_route: "Use the existing LegalEase support channel for your organization.",
    terms_or_schema_version: workspace.schema_version
  };

  const canonicalReferences = buildCanonicalReferences(data);
  return {
    workspace: {
      id: workspace.id,
      partnerRecordId: workspace.partner_record_id,
      partnerSlug: workspace.partner_slug,
      status: asWorkspaceStatus(workspace.status),
      schemaVersion: workspace.schema_version,
      aggregateVersion: Number(workspace.aggregate_version),
      completionPercentage: derivation.completion.percentage,
      blockerCode: derivation.blockerCode,
      blockerCopy: derivation.blockerCopy ?? "No partner blocker is active.",
      nextActionCode: derivation.nextActionCode,
      nextActionCopy: derivation.nextActionCopy,
      nextActionOwner: derivation.nextActionOwner,
      targetLaunchDate: workspace.target_launch_date,
      commercialGateStatus: asCommercialGate(workspace.commercial_gate_status),
      commercialGateChangedAt: workspace.commercial_gate_changed_at,
      submittedAt: workspace.submitted_at,
      internalApprovedAt: workspace.internal_approved_at,
      launchedAt: workspace.launched_at,
      pausedAt: workspace.paused_at,
      closedAt: workspace.closed_at,
      lastMeaningfulActivityAt: workspace.last_meaningful_activity_at,
      createdAt: workspace.created_at,
      updatedAt: workspace.updated_at
    },
    organizationName: partner.organization_name ?? partner.partner_name ?? context.partnerSlug,
    programName: partner.program_name,
    role: context.role,
    canEdit:
      context.role === "partner_admin" &&
      workspace.commercial_gate_status !== "blocked" &&
      ["setup_in_progress", "waiting_on_partner"].includes(workspace.status),
    data,
    sections,
    teamMembers: ((plannedUsersResult.data ?? []) as PlannedUserRow[]).map(
      mapTeamMember
    ),
    readOnlyValues,
    canonicalReferences,
    assets,
    agreements,
    activity: ((activityResult.data ?? []) as ActivityRow[]).map(mapActivity),
    derivation,
    procurementRequired,
    recordShieldInScope,
    recordShieldScopeSource: recordShieldScope.source,
    overageApprovalRequired
    ,
    prefill: {
      enabled: prefillEnabled,
      hasAppliedPrefill: prefillRows.length > 0,
      pendingCount: pendingPrefillRows.length,
      pendingSections: pendingPrefillSections,
      ...countPreparedWorkload({
        prefillRows,
        data,
        derivationContext,
        sectionsNeedingInput: new Set(
          derivation.completion.missingRequirements.map(
            (requirement) => requirement.sectionKey
          )
        ).size
      })
    }
  };
}

/**
 * The three numbers the prepared-onboarding summary shows a partner: what LegalEase
 * already prepared, what only their team can answer, and what is discretionary.
 *
 * Deliberately not a defect count. The screen this feeds used to read "59 required items
 * remain", which framed a normal, mostly-prepared workspace as a wall of failures.
 *
 * "Prepared" counts distinct applied fields rather than prefill rows, because a field
 * re-proposed and re-applied is still one prepared field to the partner.
 */
function countPreparedWorkload(input: {
  prefillRows: PartnerPrefillSafeRow[];
  data: OnboardingPartnerData;
  derivationContext: Parameters<typeof deriveOnboardingSummary>[1];
  sectionsNeedingInput: number;
}): { preparedCount: number; needsInputCount: number; optionalCount: number } {
  const preparedFieldKeys = new Set(
    input.prefillRows
      .filter((row) => row.partner_review_status !== "not_applied")
      .map((row) => `${row.section_key}.${row.field_key}`)
  );

  let optionalCount = 0;
  for (const sectionKey of ONBOARDING_SECTION_ORDER) {
    const section = (input.data[sectionKey] ?? {}) as Record<string, unknown>;
    for (const field of getPartnerEditableTopLevelFields(sectionKey)) {
      if (!isFieldActive(field, input.data, input.derivationContext)) continue;
      if (isFieldRequired(field, input.data, input.derivationContext)) continue;
      const value = section[field.dataKey];
      const empty =
        value === null ||
        value === undefined ||
        value === "" ||
        (Array.isArray(value) && value.length === 0);
      if (empty) optionalCount += 1;
    }
  }

  return {
    preparedCount: preparedFieldKeys.size,
    // Sections, not individual decisions. A single "59" on the landing banner is the
    // same wall of requirements the review page was rebuilt to remove; the per-section
    // breakdown underneath is where a partner can actually act on the detail.
    needsInputCount: input.sectionsNeedingInput,
    optionalCount
  };
}

export async function savePartnerOnboardingSection<K extends OnboardingSectionKey>(
  context: PartnerOnboardingContext,
  input: SaveSectionInput<K>
): Promise<SaveSectionResult<K>> {
  if (context.role !== "partner_admin") {
    throw new Phase1OnboardingError("forbidden", "Partner administrator access is required.");
  }

  const portal = await getPartnerOnboardingPortal(context);
  if (portal.workspace.commercialGateStatus === "blocked") {
    throw new Phase1OnboardingError("commercially_blocked", "Complete the commercial requirements before editing setup.");
  }
  if (!["setup_in_progress", "waiting_on_partner"].includes(portal.workspace.status)) {
    throw new Phase1OnboardingError("invalid_transition", "This setup package is not currently editable.");
  }
  const section = portal.sections.find((candidate) => candidate.key === input.sectionKey);
  if (!section) {
    throw new Phase1OnboardingError("invalid_input", "Choose a valid onboarding section.");
  }

  const validationContext = {
    commercialGateOutcome: portal.workspace.commercialGateStatus,
    allSections: portal.data,
    presentAssetCategories: portal.assets.map((asset) => asset.category),
    unresolvedChangeRequests: portal.sections
      .filter((candidate) => candidate.changeRequestStatus === "open")
      .map((candidate) => ({
        sectionKey: candidate.key,
        status: "open" as const
      })),
    procurementRequired: portal.procurementRequired,
    recordShieldInScope: portal.recordShieldInScope,
    overageApprovalRequired: portal.overageApprovalRequired
  };
  const validation = validateOnboardingSection(
    input.sectionKey,
    input.data,
    input.mode,
    validationContext
  );

  if (!validation.success) {
    throw validationError(validation.issues, validation.data);
  }

  if (input.guidedStepId) {
    const guidedSection = getGuidedSection(input.sectionKey);
    if (
      input.mode !== "draft_save" ||
      !guidedSection.substeps.some(
        (substep) => substep.id === input.guidedStepId
      )
    ) {
      throw new Phase1OnboardingError(
        "invalid_input",
        "Choose a valid onboarding task."
      );
    }
    const completeValidation = validateOnboardingSection(
      input.sectionKey,
      input.data,
      "section_complete",
      validationContext
    );
    if (!completeValidation.success) {
      const guidedIssues = filterValidationIssuesForGuidedStep(
        input.sectionKey,
        input.guidedStepId,
        completeValidation.issues
      );
      if (guidedIssues.length > 0) {
        throw validationError(guidedIssues, completeValidation.data);
      }
    }
  }

  const nextData: OnboardingPartnerData = {
    ...portal.data,
    [input.sectionKey]: validation.data
  };
  const resubmittingRequestedSection =
    section.changeRequestStatus === "open" &&
    input.mode === "section_complete";
  const otherOpenChangeRequestExists = portal.sections.some(
    (candidate) =>
      candidate.key !== input.sectionKey &&
      candidate.changeRequestStatus === "open"
  );
  const nextWorkspaceStatus =
    resubmittingRequestedSection && !otherOpenChangeRequestExists
      ? "ready_for_review"
      : portal.workspace.status === "waiting_on_partner"
        ? "setup_in_progress"
        : portal.workspace.status;
  const nextDerivation = deriveOnboardingSummary(nextData, {
    workspaceStatus: nextWorkspaceStatus,
    commercialGateOutcome: portal.workspace.commercialGateStatus,
    sectionStatuses: Object.fromEntries(
      portal.sections.map((candidate) => [
        candidate.key,
        candidate.key === input.sectionKey
          ? nextSectionStatus(candidate.status, input.mode)
          : candidate.status
      ])
    ),
    presentAssetCategories: portal.assets.map((asset) => asset.category),
    unresolvedChangeRequests: portal.sections.flatMap((candidate) => {
      const currentStatus = candidate.changeRequestStatus;
      if (!currentStatus) return [];
      return [
        {
          sectionKey: candidate.key,
          status:
            candidate.key === input.sectionKey &&
            currentStatus === "open" &&
            input.mode === "section_complete"
              ? ("partner_responded" as const)
              : currentStatus
        }
      ];
    }),
    pendingPrefillSections:
      input.mode === "section_complete"
        ? portal.prefill.pendingSections.filter(
            (sectionKey) => sectionKey !== input.sectionKey
          )
        : portal.prefill.pendingSections,
    procurementRequired: portal.procurementRequired,
    recordShieldInScope: portal.recordShieldInScope,
    overageApprovalRequired: portal.overageApprovalRequired
  });

  const sectionMissing = nextDerivation.completion.missingRequirements
    .filter((requirement) => requirement.sectionKey === input.sectionKey)
    .map((requirement) => requirement.fieldKey);
  const normalized = separateCollections(input.sectionKey, validation.data);
  const payloadHash = sha256({
    workspaceId: portal.workspace.id,
    sectionKey: input.sectionKey,
    expectedRevision: input.expectedRevision,
    expectedWorkspaceVersion: input.expectedWorkspaceVersion,
    mode: input.mode,
    guidedStepId: input.guidedStepId ?? null,
    data: normalized.responseData,
    collections: normalized.collections
  });
  const admin = requireAdmin();
  const { data: mutationData, error } = await admin.rpc(
    portal.prefill.enabled && section.hasPendingPrefill
      ? "rcap_service_save_onboarding_section_with_prefill"
      : "rcap_service_save_onboarding_section",
    {
      p_partner_slug: context.partnerSlug,
      p_actor_user_id: context.authUserId,
      p_workspace_id: portal.workspace.id,
      p_section_key: input.sectionKey,
      p_expected_revision: input.expectedRevision,
      p_expected_workspace_version: input.expectedWorkspaceVersion,
      p_response_data: normalized.responseData,
      p_collections: normalized.collections,
      p_mode: input.mode,
      p_section_completion:
        sectionMissing.length === 0 && input.mode === "section_complete" ? 100 : sectionCompletion(nextDerivation, input.sectionKey),
      p_missing_required_keys: sectionMissing,
      p_workspace_completion: nextDerivation.completion.percentage,
      p_blocker_code: nextDerivation.blockerCode,
      p_next_action_code: nextDerivation.nextActionCode,
      p_next_action_owner: nextDerivation.nextActionOwner,
      p_request_id: input.requestId,
      p_payload_hash: payloadHash
    }
  );

  if (error) {
    throw mutationError(error);
  }
  const mutation = firstRpcRow(mutationData);
  if (!mutation) {
    throw new Phase1OnboardingError("persistence_failed", "The section could not be saved.");
  }

  return {
    section: {
      ...section,
      data: validation.data,
      revision: Number(mutation.section_revision),
      status: asSectionStatus(String(mutation.section_status)),
      completionPercentage:
        sectionMissing.length === 0 && input.mode === "section_complete"
          ? 100
          : sectionCompletion(nextDerivation, input.sectionKey),
      missingRequiredKeys: sectionMissing,
      changeRequestInstructions: section.changeRequestInstructions,
      changeRequestStatus: resubmittingRequestedSection
        ? "partner_responded"
        : section.changeRequestStatus,
      pendingPrefillFieldKeys:
        input.mode === "section_complete"
          ? []
          : section.pendingPrefillFieldKeys,
      hasPendingPrefill:
        input.mode === "section_complete"
          ? false
          : section.hasPendingPrefill
    } as OnboardingSectionView<K>,
    workspaceVersion: Number(mutation.workspace_aggregate_version),
    completionPercentage: nextDerivation.completion.percentage,
    blockerCode: nextDerivation.blockerCode,
    nextActionCode: nextDerivation.nextActionCode,
    nextActionOwner: nextDerivation.nextActionOwner,
    duplicate: mutation.duplicate === true
  };
}

export async function submitPartnerOnboarding(
  context: PartnerOnboardingContext,
  input: { requestId: string; expectedWorkspaceVersion: number }
): Promise<SubmissionResult> {
  if (context.role !== "partner_admin" || !context.workEmail) {
    throw new Phase1OnboardingError("forbidden", "Partner administrator authorization is required.");
  }
  const portal = await getPartnerOnboardingPortal(context);
  if (portal.prefill.pendingCount > 0) {
    throw new Phase1OnboardingError(
      "invalid_transition",
      "Review all pre-filled information before final submission."
    );
  }
  const validation = validateFinalOnboardingSubmission(portal.data, {
    commercialGateOutcome: portal.workspace.commercialGateStatus,
    allSections: portal.data,
    presentAssetCategories: portal.assets.map((asset) => asset.category),
    unresolvedChangeRequests: portal.sections
      .filter((section) => section.changeRequestStatus !== null)
      .map((section) => ({
        sectionKey: section.key,
        status: section.changeRequestStatus ?? "open"
      })),
    procurementRequired: portal.procurementRequired,
    recordShieldInScope: portal.recordShieldInScope,
    overageApprovalRequired: portal.overageApprovalRequired
  });
  if (!validation.success) {
    throw validationError(validation.issues, validation.data);
  }

  const authorization = validation.data.review_authorization;
  if (!authorization) {
    throw new Phase1OnboardingError("invalid_input", "Review authorization is required.");
  }

  const admin = requireAdmin();
  const payloadHash = sha256({
    workspaceId: portal.workspace.id,
    version: input.expectedWorkspaceVersion,
    authorization
  });
  const { data, error } = await admin.rpc("rcap_service_submit_onboarding", {
    p_partner_slug: context.partnerSlug,
    p_actor_user_id: context.authUserId,
    p_actor_work_email: context.workEmail,
    p_workspace_id: portal.workspace.id,
    p_expected_workspace_version: input.expectedWorkspaceVersion,
    p_request_id: input.requestId,
    p_payload_hash: payloadHash,
    p_schema_version: ONBOARDING_SCHEMA_VERSION,
    p_authorization: authorization
  });
  if (error) throw mutationError(error);
  const row = firstRpcRow(data);
  if (!row) {
    throw new Phase1OnboardingError("persistence_failed", "The onboarding package could not be submitted.");
  }

  return {
    status: "ready_for_review",
    workspaceVersion: Number(row.workspace_aggregate_version),
    submittedAt: String(row.submitted_at),
    duplicate: row.duplicate === true
  };
}

export async function createOrGetOnboardingWorkspace(
  context: InternalOnboardingContext,
  input: { requestId: string; targetLaunchDate?: string | null }
): Promise<{ workspaceId: string; created: boolean; status: OnboardingWorkspaceStatus }> {
  const admin = requireAdmin();
  const { data, error } = await admin.rpc("rcap_service_create_onboarding_workspace", {
    p_partner_slug: context.partnerSlug,
    p_actor_user_id: context.authUserId,
    p_request_id: input.requestId,
    p_target_launch_date: input.targetLaunchDate ?? null,
    p_schema_version: ONBOARDING_SCHEMA_VERSION,
    p_payload_hash: sha256({
      partnerSlug: context.partnerSlug,
      targetLaunchDate: input.targetLaunchDate ?? null,
      schemaVersion: ONBOARDING_SCHEMA_VERSION
    })
  });
  if (error) throw mutationError(error);
  const row = firstRpcRow(data);
  if (!row) {
    throw new Phase1OnboardingError("persistence_failed", "The onboarding workspace could not be created.");
  }
  return {
    workspaceId: String(row.workspace_id),
    created: row.created === true,
    status: asWorkspaceStatus(String(row.workspace_status))
  };
}

export type InternalOnboardingSnapshot = {
  workspace: null | {
    id: string;
    status: OnboardingWorkspaceStatus;
    aggregateVersion: number;
    targetLaunchDate: string | null;
    commercialGateStatus: CommercialGateOutcome;
    completionPercentage: number;
    blockerCode: string | null;
    nextActionCode: string | null;
  };
  sections: Array<{
    key: OnboardingSectionKey;
    status: OnboardingSectionStatus;
    revision: number;
    completionPercentage: number;
  }>;
  agreements: OnboardingAgreementView[];
  assets: OnboardingAssetView[];
};

export async function getInternalOnboardingSnapshot(
  context: InternalOnboardingContext
): Promise<InternalOnboardingSnapshot> {
  const admin = requireAdmin();
  const { data: workspaceData, error: workspaceError } = await admin
    .from("partner_onboarding_workspace_safe")
    .select(
      "id, partner_slug, status, aggregate_version, target_launch_date, commercial_gate_status, completion_percentage, blocker_code, next_action_code"
    )
    .eq("partner_slug", context.partnerSlug)
    .maybeSingle();
  if (workspaceError) {
    throw new Phase1OnboardingError("persistence_failed", "The onboarding workspace could not be loaded.");
  }
  if (!workspaceData) {
    return { workspace: null, sections: [], agreements: [], assets: [] };
  }
  const workspace = workspaceData as WorkspaceSafeRow;
  const [sectionsResult, agreementsResult, assetsResult] = await Promise.all([
    admin
      .from("partner_onboarding_sections")
      .select("section_key, status, revision, completion_percentage")
      .eq("workspace_id", workspace.id)
      .order("created_at", { ascending: true }),
    admin
      .from("partner_onboarding_agreements_safe")
      .select("id, agreement_type, status, is_required, partner_safe_detail, finalized_asset_id, effective_date")
      .eq("workspace_id", workspace.id)
      .order("agreement_type", { ascending: true }),
    admin
      .from("partner_onboarding_assets_safe")
      .select("id, category, original_filename, media_type, byte_size, width_pixels, height_pixels, lifecycle_status, review_status, uploaded_at")
      .eq("workspace_id", workspace.id)
      .is("deleted_at", null)
      .in("lifecycle_status", ["pending_review", "active"])
      .order("uploaded_at", { ascending: false })
  ]);
  if (sectionsResult.error || agreementsResult.error || assetsResult.error) {
    throw new Phase1OnboardingError("persistence_failed", "The onboarding workspace could not be loaded.");
  }
  return {
    workspace: {
      id: workspace.id,
      status: asWorkspaceStatus(workspace.status),
      aggregateVersion: Number(workspace.aggregate_version),
      targetLaunchDate: workspace.target_launch_date,
      commercialGateStatus: asCommercialGate(workspace.commercial_gate_status),
      completionPercentage: Number(workspace.completion_percentage),
      blockerCode: workspace.blocker_code,
      nextActionCode: workspace.next_action_code
    },
    sections: ((sectionsResult.data ?? []) as Array<{
      section_key: string;
      status: string;
      revision: number;
      completion_percentage: number;
    }>).map((section) => ({
      key: asSectionKey(section.section_key),
      status: asSectionStatus(section.status),
      revision: Number(section.revision),
      completionPercentage: Number(section.completion_percentage)
    })),
    agreements: ((agreementsResult.data ?? []) as AgreementRow[]).map(mapAgreement),
    assets: ((assetsResult.data ?? []) as AssetRow[]).map(mapAsset)
  };
}

export type InternalReviewAction =
  | {
      action: "target_launch_date";
      targetLaunchDate: string | null;
      reason: string;
    }
  | {
      action: "commercial_gate";
      outcome: Exclude<CommercialGateOutcome, "blocked"> | "blocked";
      evidenceReference?: string | null;
      overrideReason?: string | null;
    }
  | {
      action: "agreement";
      agreementType: OnboardingAgreementView["type"];
      status: string;
      required: boolean;
      partnerSafeDetail?: string | null;
      finalizedAssetId?: string | null;
      effectiveDate?: string | null;
    }
  | {
      action: "request_changes";
      sectionKey: OnboardingSectionKey;
      instructions: string;
    }
  | {
      action: "approve_section" | "waive_section";
      sectionKey: OnboardingSectionKey;
      reason: string;
    }
  | {
      action: "ready_for_launch" | "close";
      reason: string;
    };

export async function applyInternalOnboardingReview(
  context: InternalOnboardingContext,
  input: {
    workspaceId: string;
    expectedWorkspaceVersion: number;
    requestId: string;
    operation: InternalReviewAction;
  }
): Promise<{ workspaceVersion: number; status: OnboardingWorkspaceStatus; duplicate: boolean }> {
  const admin = requireAdmin();
  const systemDerived =
    input.operation.action === "agreement" ||
    input.operation.action === "commercial_gate"
      ? await deriveInternalReviewSummary(
          admin,
          context,
          input.workspaceId,
          input.operation
        )
      : null;
  const rpcOperation = systemDerived
    ? {
        ...input.operation,
        systemDerived: {
          completionPercentage: systemDerived.completion.percentage,
          blockerCode: systemDerived.blockerCode,
          nextActionCode: systemDerived.nextActionCode,
          nextActionOwner: systemDerived.nextActionOwner
        }
      }
    : input.operation;
  const { data, error } = await admin.rpc("rcap_service_review_onboarding", {
    p_partner_slug: context.partnerSlug,
    p_actor_user_id: context.authUserId,
      p_workspace_id: input.workspaceId,
      p_expected_workspace_version: input.expectedWorkspaceVersion,
      p_request_id: input.requestId,
      p_payload_hash: sha256({
        workspaceId: input.workspaceId,
        expectedWorkspaceVersion: input.expectedWorkspaceVersion,
        operation: rpcOperation
      }),
      p_operation: rpcOperation
  });
  if (error) throw mutationError(error);
  const row = firstRpcRow(data);
  if (!row) {
    throw new Phase1OnboardingError("persistence_failed", "The review action could not be saved.");
  }
  return {
    workspaceVersion: Number(row.workspace_aggregate_version),
    status: asWorkspaceStatus(String(row.workspace_status)),
    duplicate: row.duplicate === true
  };
}

async function deriveInternalReviewSummary(
  admin: SupabaseAdmin,
  context: InternalOnboardingContext,
  workspaceId: string,
  operation: Extract<
    InternalReviewAction,
    { action: "agreement" | "commercial_gate" }
  >
) {
  const [
    workspaceResult,
    sectionsResult,
    contactsResult,
    plannedUsersResult,
    recipientsResult,
    changeRequestsResult,
    assetsResult,
    agreementsResult,
    partnerResult,
    entitlementResult
  ] = await Promise.all([
    admin
      .from("partner_onboarding")
      .select("id, partner_slug, status, commercial_gate_status")
      .eq("id", workspaceId)
      .eq("partner_slug", context.partnerSlug)
      .maybeSingle(),
    admin
      .from("partner_onboarding_sections")
      .select("id, workspace_id, section_key, response_data, revision, status, completion_percentage, missing_required_keys")
      .eq("workspace_id", workspaceId),
    admin
      .from("partner_onboarding_contacts")
      .select("id, role, name, title, organization, work_email, phone")
      .eq("workspace_id", workspaceId)
      .is("deleted_at", null)
      .order("created_at", { ascending: true }),
    admin
      .from("partner_onboarding_planned_users")
      .select("id, name, work_email, requested_role, special_permissions, training_attendee")
      .eq("workspace_id", workspaceId)
      .is("deleted_at", null)
      .order("created_at", { ascending: true }),
    admin
      .from("partner_onboarding_report_recipients")
      .select("id, name, work_email")
      .eq("workspace_id", workspaceId)
      .is("deleted_at", null)
      .order("created_at", { ascending: true }),
    admin
      .from("partner_onboarding_change_requests")
      .select("section_id, status")
      .eq("workspace_id", workspaceId)
      .in("status", ["open", "partner_responded"]),
    admin
      .from("partner_onboarding_assets")
      .select("category")
      .eq("workspace_id", workspaceId)
      .is("deleted_at", null)
      .in("lifecycle_status", ["pending_review", "active"]),
    admin
      .from("partner_onboarding_agreements")
      .select("agreement_type, is_required")
      .eq("workspace_id", workspaceId),
    admin
      .from("partner_records")
      .select("id, selected_package_id")
      .eq("partner_slug", context.partnerSlug)
      .maybeSingle(),
    admin
      .from("partner_entitlement")
      .select("overage_enabled")
      .eq("partner_slug", context.partnerSlug)
      .maybeSingle()
  ]);
  const requiredResults = [
    workspaceResult,
    sectionsResult,
    contactsResult,
    plannedUsersResult,
    recipientsResult,
    changeRequestsResult,
    assetsResult,
    agreementsResult,
    partnerResult
  ];
  if (
    requiredResults.some((result) => result.error) ||
    !workspaceResult.data
  ) {
    throw new Phase1OnboardingError(
      "persistence_failed",
      "The onboarding review summary could not be derived."
    );
  }
  let pendingPrefillSections: OnboardingSectionKey[] = [];
  if (isRcapOnboardingPrefillEnabled()) {
    const { data: pendingData, error: pendingError } = await admin
      .from("partner_onboarding_prefill_values")
      .select("section_key")
      .eq("workspace_id", workspaceId)
      .eq("review_status", "applied")
      .eq("partner_review_status", "pending");
    if (pendingError) {
      throw new Phase1OnboardingError(
        "persistence_failed",
        "Onboarding prefill status could not be loaded."
      );
    }
    pendingPrefillSections = [
      ...new Set(
        ((pendingData ?? []) as Array<{ section_key: string }>).map((row) =>
          asSectionKey(row.section_key)
        )
      )
    ];
  }

  const sectionRows = (sectionsResult.data ?? []) as SectionRow[];
  const data = buildPartnerData(
    sectionRows,
    ((contactsResult.data ?? []) as ContactRow[]).map(mapContact),
    ((plannedUsersResult.data ?? []) as PlannedUserRow[]).map(mapPlannedUser),
    ((recipientsResult.data ?? []) as RecipientRow[]).map(mapRecipient)
  );
  const agreements = (
    (agreementsResult.data ?? []) as Array<{
      agreement_type: OnboardingAgreementView["type"];
      is_required: boolean;
    }>
  ).filter((agreement) =>
    operation.action === "agreement"
      ? agreement.agreement_type !== operation.agreementType
      : true
  );
  if (operation.action === "agreement") {
    agreements.push({
      agreement_type: operation.agreementType,
      is_required: operation.required
    });
  }
  const changeRequests = (
    (changeRequestsResult.data ?? []) as Array<{
      section_id: string;
      status: string;
    }>
  ).map((change) => ({
    sectionId: change.section_id,
    status: asChangeRequestStatus(change.status)
  }));
  const workspace = workspaceResult.data as {
    status: string;
    commercial_gate_status: string;
  };
  const recordShieldScope = deriveRecordShieldScope(
    (
      partnerResult.data as {
        selected_package_id?: string | null;
      } | null
    )?.selected_package_id
  );

  return deriveOnboardingSummary(data, {
    workspaceStatus: asWorkspaceStatus(workspace.status),
    commercialGateOutcome:
      operation.action === "commercial_gate"
        ? operation.outcome
        : asCommercialGate(workspace.commercial_gate_status),
    sectionStatuses: Object.fromEntries(
      sectionRows.map((section) => [
        asSectionKey(section.section_key),
        asSectionStatus(section.status)
      ])
    ),
    presentAssetCategories: (
      (assetsResult.data ?? []) as Array<{
        category: OrganizationalAssetCategory;
      }>
    ).map((asset) => asset.category),
    unresolvedChangeRequests: changeRequests.map((change) => {
      const section = sectionRows.find(
        (candidate) => candidate.id === change.sectionId
      );
      if (!section) {
        throw new Phase1OnboardingError(
          "persistence_failed",
          "A setup change request has an invalid section."
        );
      }
      return {
        sectionKey: asSectionKey(section.section_key),
        status: change.status
      };
    }),
    pendingPrefillSections,
    procurementRequired: agreements.some(
      (agreement) =>
        agreement.agreement_type === "procurement_requirements" &&
        agreement.is_required
    ),
    recordShieldInScope: recordShieldScope.inScope,
    overageApprovalRequired:
      entitlementResult.error
        ? false
        : (entitlementResult.data as { overage_enabled?: boolean } | null)
            ?.overage_enabled === true
  });
}

function buildPartnerData(
  sectionRows: SectionRow[],
  contacts: OnboardingContact[],
  plannedUsers: PlannedDashboardUser[],
  recipients: OnboardingReportRecipient[]
): OnboardingPartnerData {
  const data: OnboardingPartnerData = {};
  for (const sectionKey of ONBOARDING_SECTION_ORDER) {
    const row = sectionRows.find((candidate) => candidate.section_key === sectionKey);
    data[sectionKey] = { ...(row?.response_data ?? {}) } as never;
  }
  data.organization_contacts = {
    ...(data.organization_contacts ?? {}),
    contacts
  };
  data.staff_dashboard_plan = {
    ...(data.staff_dashboard_plan ?? {}),
    planned_users: plannedUsers
  };
  data.support_referrals_reporting = {
    ...(data.support_referrals_reporting ?? {}),
    report_recipients: recipients
  };
  return data;
}

function buildCanonicalReferences(data: OnboardingPartnerData) {
  const organization = data.organization_contacts ?? {};
  const geography = data.geography_audience_language_accessibility ?? {};
  const references: Record<string, { value: string; sourceSection: OnboardingSectionKey }> = {};
  for (const [key, value] of Object.entries({
    public_organization_name: organization.public_organization_name,
    website: organization.website,
    public_program_name: organization.public_program_name,
    enable_spanish:
      typeof geography.enable_spanish === "boolean"
        ? geography.enable_spanish
          ? "Enabled"
          : "Not enabled"
        : undefined,
    jurisdictions: geography.jurisdictions?.join(", "),
    service_area_description: geography.service_area_description
  })) {
    if (typeof value === "string" && value.trim()) {
      references[key] = {
        value,
        sourceSection:
          key === "enable_spanish" || key === "jurisdictions" || key === "service_area_description"
            ? "geography_audience_language_accessibility"
            : "organization_contacts"
      };
    }
  }
  return references;
}

function mapContact(row: ContactRow): OnboardingContact {
  return {
    stable_row_id: row.id,
    role: row.role as OnboardingContact["role"],
    name: row.name,
    title: row.title,
    organization: row.organization,
    work_email: row.work_email,
    phone: row.phone
  };
}

function mapPlannedUser(row: PlannedUserRow): PlannedDashboardUser {
  return {
    stable_row_id: row.id,
    name: row.name,
    work_email: row.work_email,
    requested_role: row.requested_role as PlannedDashboardUser["requested_role"],
    special_permissions: (row.special_permissions ?? []) as PlannedDashboardUser["special_permissions"],
    training_attendee: row.training_attendee
  };
}

function mapTeamMember(row: PlannedUserRow): OnboardingTeamMemberView {
  return {
    id: row.id,
    name: row.name,
    workEmail: row.work_email,
    requestedRole: row.requested_role,
    trainingAttendee: row.training_attendee,
    trainingStatus: asTeamLifecycleValue(
      row.training_status,
      ["not_started", "scheduled", "in_progress", "complete"],
      "not_started"
    ),
    trainingCompletedAt: row.training_completed_at,
    invitationStatus: asTeamLifecycleValue(
      row.invitation_status,
      ["not_invited", "planned", "released"],
      "not_invited"
    ),
    membershipStatus: asTeamLifecycleValue(
      row.membership_status,
      ["planned", "active", "disabled"],
      "planned"
    ),
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

function asTeamLifecycleValue<const T extends string>(
  value: string,
  allowed: readonly T[],
  fallback: T
): T {
  return allowed.includes(value as T) ? (value as T) : fallback;
}

function mapRecipient(row: RecipientRow): OnboardingReportRecipient {
  return {
    stable_row_id: row.id,
    name: row.name,
    work_email: row.work_email
  };
}

function mapAsset(row: AssetRow): OnboardingAssetView {
  return {
    id: row.id,
    category: row.category as OrganizationalAssetCategory,
    originalFileName: row.original_filename,
    mediaType: row.media_type,
    byteSize: Number(row.byte_size),
    width: row.width_pixels,
    height: row.height_pixels,
    lifecycleStatus: row.lifecycle_status,
    reviewStatus: row.review_status,
    uploadedAt: row.uploaded_at
  };
}

function mapAgreement(row: AgreementRow): OnboardingAgreementView {
  return {
    id: row.id,
    type: row.agreement_type,
    status: row.status,
    required: row.is_required,
    partnerSafeDetail: row.partner_safe_detail,
    finalizedAssetId: row.finalized_asset_id,
    effectiveDate: row.effective_date
  };
}

function mapActivity(row: ActivityRow): OnboardingActivityView {
  return {
    id: row.id,
    eventType: row.event_type,
    sectionKey: row.section_key ? asSectionKey(row.section_key) : null,
    statusCode: row.status_code,
    label: ACTIVITY_COPY[row.summary_code] ?? ACTIVITY_COPY[row.event_type] ?? "Program setup status changed.",
    occurredAt: row.occurred_at
  };
}

function separateCollections<K extends OnboardingSectionKey>(
  sectionKey: K,
  data: OnboardingSectionDataMap[K]
): {
  responseData: Record<string, unknown>;
  collections: {
    contacts?: OnboardingContact[];
    planned_users?: PlannedDashboardUser[];
    report_recipients?: OnboardingReportRecipient[];
  };
} {
  const responseData = { ...(data as Record<string, unknown>) };
  const collections: {
    contacts?: OnboardingContact[];
    planned_users?: PlannedDashboardUser[];
    report_recipients?: OnboardingReportRecipient[];
  } = {};
  if (sectionKey === "organization_contacts") {
    collections.contacts = (responseData.contacts as OnboardingContact[] | undefined) ?? [];
    delete responseData.contacts;
  }
  if (sectionKey === "staff_dashboard_plan") {
    collections.planned_users = (responseData.planned_users as PlannedDashboardUser[] | undefined) ?? [];
    delete responseData.planned_users;
  }
  if (sectionKey === "support_referrals_reporting") {
    collections.report_recipients =
      (responseData.report_recipients as OnboardingReportRecipient[] | undefined) ?? [];
    delete responseData.report_recipients;
  }
  return { responseData, collections };
}

function sectionCompletion(summary: OnboardingDerivedSummary, sectionKey: OnboardingSectionKey): number {
  const requirements = summary.completion.requirements.filter(
    (requirement) => requirement.sectionKey === sectionKey
  );
  const total = requirements.reduce((sum, requirement) => sum + requirement.weight, 0);
  const complete = requirements.reduce(
    (sum, requirement) => sum + (requirement.completed ? requirement.weight : 0),
    0
  );
  return total === 0 ? 100 : Math.round((complete / total) * 100);
}

function nextSectionStatus(
  current: OnboardingSectionStatus,
  mode: Exclude<OnboardingValidationMode, "final_submit">
): OnboardingSectionStatus {
  if (mode === "section_complete") return "submitted";
  if (["approved", "waived", "not_applicable"].includes(current)) {
    return current;
  }
  return "in_progress";
}

function validationError(
  issues: readonly OnboardingValidationIssue[],
  normalizedData: unknown
) {
  return new Phase1OnboardingError("invalid_input", "Review the highlighted fields and try again.", {
    issues,
    normalizedData
  });
}

function mutationError(error: { code?: string; message?: string }) {
  const message = error.message ?? "";
  if (error.code === "40001" || /revision conflict/i.test(message)) {
    return new Phase1OnboardingError("revision_conflict", "Newer saved information exists.");
  }
  if (error.code === "23505" || /idempotency/i.test(message)) {
    return new Phase1OnboardingError("duplicate_request", "This request was already processed.");
  }
  if (error.code === "42501") {
    return new Phase1OnboardingError("forbidden", "This account cannot change the onboarding workspace.");
  }
  if (/commercial/i.test(message)) {
    return new Phase1OnboardingError("commercially_blocked", "Complete the commercial requirements before continuing.");
  }
  return new Phase1OnboardingError("persistence_failed", "The onboarding change could not be saved.");
}

function requireAdmin(): SupabaseAdmin {
  const admin = getSupabaseAdminClient();
  if (!admin) {
    throw new Phase1OnboardingError("persistence_failed", "Onboarding persistence is not configured.");
  }
  return admin;
}

function sha256(value: unknown): string {
  return crypto.createHash("sha256").update(stableJson(value)).digest("hex");
}

function stableJson(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stableJson).join(",")}]`;
  if (value && typeof value === "object") {
    return `{${Object.entries(value as Record<string, unknown>)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, child]) => `${JSON.stringify(key)}:${stableJson(child)}`)
      .join(",")}}`;
  }
  return JSON.stringify(value) ?? "null";
}

function firstRpcRow(data: unknown): Record<string, unknown> | null {
  if (Array.isArray(data)) {
    const first = data[0];
    return first && typeof first === "object" ? (first as Record<string, unknown>) : null;
  }
  return data && typeof data === "object" ? (data as Record<string, unknown>) : null;
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
  if (!allowed.includes(value)) {
    throw new Phase1OnboardingError("persistence_failed", "The onboarding workspace has an invalid status.");
  }
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
  if (!allowed.includes(value)) {
    throw new Phase1OnboardingError("persistence_failed", "A setup section has an invalid status.");
  }
  return value as OnboardingSectionStatus;
}

function asChangeRequestStatus(
  value: string
): "open" | "partner_responded" {
  if (value !== "open" && value !== "partner_responded") {
    throw new Phase1OnboardingError(
      "persistence_failed",
      "A setup change request has an invalid status."
    );
  }
  return value;
}

function asChangeRequestHistoryStatus(
  value: string
): OnboardingChangeRequestView["status"] {
  if (
    value !== "open" &&
    value !== "partner_responded" &&
    value !== "resolved" &&
    value !== "cancelled"
  ) {
    throw new Phase1OnboardingError(
      "persistence_failed",
      "A setup change request has an invalid status."
    );
  }
  return value;
}

function mapPartnerChangeRequest(
  row: ChangeRequestRow,
  sectionKey: OnboardingSectionKey
): OnboardingChangeRequestView {
  return {
    id: row.id,
    sectionKey,
    status: asChangeRequestHistoryStatus(row.status),
    requestedByLabel: "LegalEase",
    requestedAt: row.requested_at,
    requestedCorrection: row.partner_safe_instructions,
    partnerResponse: row.partner_response,
    respondedAt: row.responded_at,
    resolvedAt: row.resolved_at,
    // The current safe view is section-level. Task 2 does not infer a field
    // target from prose because that would create false precision.
    targetFieldKey: null
  };
}

function latestChangeRequestStatus(
  changes: ChangeRequestRow[],
  sectionId: string
): "open" | "partner_responded" | null {
  const sectionChanges = changes.filter(
    (change) => change.section_id === sectionId
  );
  if (sectionChanges.some((change) => change.status === "open")) {
    return "open";
  }
  return sectionChanges.some(
    (change) => change.status === "partner_responded"
  )
    ? "partner_responded"
    : null;
}

function asSectionKey(value: string): OnboardingSectionKey {
  if (!(ONBOARDING_SECTION_ORDER as readonly string[]).includes(value)) {
    throw new Phase1OnboardingError("persistence_failed", "A setup section has an invalid key.");
  }
  return value as OnboardingSectionKey;
}

function asCommercialGate(value: string): CommercialGateOutcome {
  const allowed: readonly string[] = [
    "blocked",
    "cleared_by_paid_invoice",
    "cleared_by_approved_purchase_order",
    "cleared_by_authorized_internal_override"
  ];
  if (!allowed.includes(value)) {
    throw new Phase1OnboardingError("persistence_failed", "The commercial setup status is invalid.");
  }
  return value as CommercialGateOutcome;
}

export function partnerSafeBlockerCopy(code: string | null): string {
  return code && code in ONBOARDING_BLOCKER_COPY
    ? ONBOARDING_BLOCKER_COPY[code as keyof typeof ONBOARDING_BLOCKER_COPY]
    : "No partner blocker is active.";
}

export function partnerSafeNextActionCopy(code: string): string {
  return code in ONBOARDING_NEXT_ACTION_COPY
    ? ONBOARDING_NEXT_ACTION_COPY[code as keyof typeof ONBOARDING_NEXT_ACTION_COPY]
    : "Review the current setup status.";
}
