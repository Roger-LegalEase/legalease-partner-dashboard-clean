import "server-only";

import crypto from "node:crypto";

import { createServerSupabaseAuthClient } from "@/lib/supabase/auth-server";
import { getSupabaseAdminClient } from "@/lib/supabase/server";

import {
  ARTIFACT_TYPES,
  ARTIFACT_TYPE_LABELS,
  ARTIFACT_GENERATOR_VERSIONS,
  GENERATABLE_ARTIFACT_TYPES,
  LEGALEASE_TECHNICAL_SUPPORT_ROUTE,
  buildArtifactProvenance,
  detectArtifactDrift,
  isGeneratableArtifactType,
  projectArtifactSource,
  type ArtifactSourceInput,
  type ArtifactType,
  type GeneratableArtifactType
} from "./artifact-domain";
import {
  renderCoBrandedPageConfiguration,
  renderDashboardUserReportingMatrix,
  renderImplementationBrief,
  renderOperationsEscalationPlan,
  renderStaffQuickStartGuide,
  type RenderedDocument
} from "./artifact-generator";
import { Phase1OnboardingError } from "./errors";
import { isRcapOnboardingLaunchPrepEnabled } from "./feature";
import { deriveRecordShieldScope } from "./scope";
import { createPrivateOnboardingAssetUrl } from "./storage";
import type {
  InternalOnboardingContext,
  PartnerOnboardingContext
} from "./auth-context";
import type { OnboardingPartnerData, OnboardingSectionKey } from "./types";

type SupabaseAdmin = NonNullable<ReturnType<typeof getSupabaseAdminClient>>;
type AnyClient = SupabaseAdmin | Awaited<ReturnType<typeof createServerSupabaseAuthClient>>;

function requireAdmin(): SupabaseAdmin {
  const admin = getSupabaseAdminClient();
  if (!admin) {
    throw new Phase1OnboardingError(
      "persistence_failed",
      "Program setup could not be updated. Try again."
    );
  }
  return admin;
}

function assertLaunchPrepEnabled(): void {
  if (!isRcapOnboardingLaunchPrepEnabled()) {
    throw new Phase1OnboardingError(
      "feature_disabled",
      "Launch preparation is not available."
    );
  }
}

// --- shared canonical source read -------------------------------------------

/**
 * The single shared read behind every artifact projection. It is performed once
 * per page load and reused by all six artifact types, so query cost is constant
 * in the number of artifacts rather than linear.
 */
export async function loadArtifactSourceInput(
  client: AnyClient,
  partnerSlug: string
): Promise<ArtifactSourceInput> {
  const { data: workspaceRow, error: workspaceError } = await client
    .from("partner_onboarding_workspace_safe")
    .select(
      "id, partner_slug, partner_record_id, status, aggregate_version, target_launch_date, commercial_gate_status, public_display_name, public_headline, public_subheadline, support_instructions, show_partner_logo, show_powered_by"
    )
    .eq("partner_slug", partnerSlug)
    .maybeSingle();

  if (workspaceError) {
    throw new Phase1OnboardingError(
      "persistence_failed",
      "Program setup could not be loaded."
    );
  }
  const workspace = workspaceRow as Record<string, unknown> | null;
  if (!workspace?.partner_record_id) {
    throw new Phase1OnboardingError(
      "workspace_not_found",
      "Program setup is not available for this partner."
    );
  }
  const workspaceId = String(workspace.id);

  const [
    sections,
    contacts,
    plannedUsers,
    recipients,
    assets,
    partnerRecord,
    entitlement
  ] = await Promise.all([
    client
      .from("partner_onboarding_sections")
      .select("section_key, response_data, revision")
      .eq("workspace_id", workspaceId),
    client
      .from("partner_onboarding_contacts")
      .select("id, role, name, title, organization, work_email, phone, revision")
      .eq("workspace_id", workspaceId)
      .is("deleted_at", null)
      .order("created_at", { ascending: true }),
    client
      .from("partner_onboarding_planned_users")
      .select(
        // training_status, invitation_status and membership_status are written
        // by Lane A. The Dashboard User and Reporting Matrix reads them;
        // nothing in this module writes to this table.
        "id, name, work_email, requested_role, special_permissions, training_attendee, training_status, training_completed_at, invitation_status, membership_status, revision"
      )
      .eq("workspace_id", workspaceId)
      .is("deleted_at", null)
      .order("created_at", { ascending: true }),
    client
      .from("partner_onboarding_report_recipients")
      .select("id, name, work_email, revision")
      .eq("workspace_id", workspaceId)
      .is("deleted_at", null)
      .order("created_at", { ascending: true }),
    client
      .from("partner_onboarding_assets_safe")
      .select("id, category, lifecycle_status, review_status")
      .eq("workspace_id", workspaceId)
      .is("deleted_at", null)
      .in("lifecycle_status", ["pending_review", "active"]),
    client
      .from("partner_records")
      .select("id, organization_name, partner_name, program_name, selected_package_id, access_mode")
      .eq("id", String(workspace.partner_record_id))
      .maybeSingle(),
    client
      .from("partner_entitlement")
      // Keyed by partner_slug since phase 35. Filtering by partner_record_id
      // matched no column, so the allocation and overage values silently
      // resolved to null and never reached a document.
      .select("screenings_allowed, screenings_used, overage_enabled, pause_at_cap")
      .eq("partner_slug", partnerSlug)
      .maybeSingle()
  ]);

  const sectionRows = (sections.data ?? []) as Array<{
    section_key: string;
    response_data: Record<string, unknown> | null;
    revision: number;
  }>;

  const data: Record<string, unknown> = {};
  const sectionRevisions: Record<string, number> = {};
  for (const row of sectionRows) {
    data[row.section_key] = row.response_data ?? {};
    sectionRevisions[row.section_key] = Number(row.revision);
  }

  const contactRows = (contacts.data ?? []) as Array<Record<string, unknown>>;
  const plannedUserRows = (plannedUsers.data ?? []) as Array<Record<string, unknown>>;
  const recipientRows = (recipients.data ?? []) as Array<Record<string, unknown>>;

  // Collections are normalized rows, not section payload, so they are folded
  // back into the section shape the schema registry describes.
  const organizationContacts = (data.organization_contacts ?? {}) as Record<string, unknown>;
  organizationContacts.contacts = contactRows.map((row) => ({
    stable_row_id: String(row.id),
    role: row.role,
    name: row.name,
    title: row.title,
    organization: row.organization,
    work_email: row.work_email,
    phone: row.phone
  }));
  data.organization_contacts = organizationContacts;

  const staffPlan = (data.staff_dashboard_plan ?? {}) as Record<string, unknown>;
  staffPlan.planned_users = plannedUserRows.map((row) => ({
    stable_row_id: String(row.id),
    name: row.name,
    work_email: row.work_email,
    requested_role: row.requested_role,
    special_permissions: row.special_permissions ?? [],
    training_attendee: row.training_attendee,
    training_status: row.training_status,
    training_completed_at: row.training_completed_at ?? null,
    invitation_status: row.invitation_status,
    membership_status: row.membership_status
  }));
  data.staff_dashboard_plan = staffPlan;

  const supportSection = (data.support_referrals_reporting ?? {}) as Record<string, unknown>;
  supportSection.report_recipients = recipientRows.map((row) => ({
    stable_row_id: String(row.id),
    name: row.name,
    work_email: row.work_email
  }));
  data.support_referrals_reporting = supportSection;

  const partner = (partnerRecord.data ?? {}) as Record<string, unknown>;
  const entitlementRow = (entitlement.data ?? null) as Record<string, unknown> | null;

  const scope = deriveRecordShieldScope(
    typeof partner.selected_package_id === "string" ? partner.selected_package_id : null
  );

  const readOnlyValues = {
    sponsored_screening_scope:
      entitlementRow?.screenings_allowed != null
        ? `${entitlementRow.screenings_allowed} sponsored screenings`
        : undefined,
    sponsored_packet_scope:
      entitlementRow?.screenings_allowed != null
        ? `Sponsored packets follow the selected package`
        : undefined,
    recordshield_pathway: scope.inScope ? "RecordShield included" : null,
    overage_behavior: entitlementRow?.overage_enabled
      ? "Overage enabled"
      : entitlementRow?.pause_at_cap
        ? "Pauses at cap"
        : undefined,
    screening_allocation:
      entitlementRow?.screenings_allowed != null
        ? Number(entitlementRow.screenings_allowed)
        : null,
    // LegalEase boilerplate, projected as a value so that an edit to it is
    // detectable at all. It is a LegalEase-only key, so an edit spares the
    // partner's attestation.
    legalease_technical_support_route: LEGALEASE_TECHNICAL_SUPPORT_ROUTE
  };

  return {
    workspace: {
      id: workspaceId,
      partnerSlug,
      aggregateVersion: Number(workspace.aggregate_version ?? 0),
      status: String(workspace.status ?? ""),
      targetLaunchDate: (workspace.target_launch_date as string | null) ?? null,
      commercialGateStatus: String(workspace.commercial_gate_status ?? "blocked"),
      publicDisplayName: (workspace.public_display_name as string | null) ?? null,
      publicHeadline: (workspace.public_headline as string | null) ?? null,
      publicSubheadline: (workspace.public_subheadline as string | null) ?? null,
      supportInstructions: (workspace.support_instructions as string | null) ?? null,
      showPartnerLogo: (workspace.show_partner_logo as boolean | null) ?? null,
      showPoweredBy: (workspace.show_powered_by as boolean | null) ?? null
    },
    partnerRecord: {
      organizationName:
        (partner.organization_name as string | null) ??
        (partner.partner_name as string | null) ??
        partnerSlug,
      programName: (partner.program_name as string | null) ?? null,
      accessMode: (partner.access_mode as string | null) ?? null
    },
    data: data as OnboardingPartnerData,
    readOnlyValues,
    assets: ((assets.data ?? []) as Array<Record<string, unknown>>).map((row) => ({
      id: String(row.id),
      category: row.category as ArtifactSourceInput["assets"][number]["category"],
      // The safe view withholds the content hash, so asset identity here is the
      // row id plus its review state.
      sha256Hex: null,
      lifecycleStatus: String(row.lifecycle_status),
      reviewStatus: String(row.review_status)
    })),
    sectionRevisions: sectionRevisions as Partial<Record<OnboardingSectionKey, number>>,
    collectionRevisions: {
      contacts: Object.fromEntries(
        contactRows.map((row) => [String(row.id), Number(row.revision ?? 1)])
      ),
      plannedUsers: Object.fromEntries(
        plannedUserRows.map((row) => [String(row.id), Number(row.revision ?? 1)])
      ),
      reportRecipients: Object.fromEntries(
        recipientRows.map((row) => [String(row.id), Number(row.revision ?? 1)])
      )
    }
  };
}

// --- views -------------------------------------------------------------------

export type ArtifactVersionView = {
  id: string;
  versionNumber: number;
  generationStatus: "pending" | "succeeded" | "failed";
  generationErrorCode: string | null;
  approvalStatus: string;
  partnerReviewStatus: string;
  partnerVisibleInstructions: string | null;
  generatorVersion: string;
  generatedAt: string;
  supersededAt: string | null;
  staleAt: string | null;
  document: RenderedDocument | null;
};

export type ArtifactReviewView = {
  id: string;
  reviewerType: "legalease" | "partner";
  decision: "approve" | "request_changes" | "reject";
  comments: string | null;
  reviewedAt: string;
  versionNumber: number;
};

export type ArtifactBoardEntry = {
  artifactId: string | null;
  artifactType: ArtifactType;
  label: string;
  available: boolean;
  lifecycleStatus: string;
  currentVersion: ArtifactVersionView | null;
  versions: ArtifactVersionView[];
  reviews: ArtifactReviewView[];
  sourceFreshness: "no_version" | "current" | "stale" | "unavailable";
  staleFields: string[];
  /**
   * Which approvals the observed drift actually kills. A partner-owned value
   * changing makes the partner's own attestation false, so both die; a change
   * confined to LegalEase-controlled values leaves the partner's attestation
   * standing. Computed on read like the staleness it accompanies.
   */
  invalidatedApprovals: { legalease: boolean; partner: boolean };
  blocker: string | null;
};

/**
 * The phase-42 LegalEase-controlled public-page configuration. The partner can
 * neither edit nor approve any of it, which is what makes a change to it
 * invalidate the LegalEase approval alone. It is included for the internal
 * audience only.
 */
export type LegalEasePublicPageConfiguration = {
  publicDisplayName: string | null;
  publicHeadline: string | null;
  publicSubheadline: string | null;
  supportInstructions: string | null;
  showPartnerLogo: boolean;
  showPoweredBy: boolean;
};

export type ArtifactBoard = {
  workspaceId: string;
  partnerSlug: string;
  organizationName: string;
  entries: ArtifactBoardEntry[];
  legalEasePageConfiguration: LegalEasePublicPageConfiguration | null;
};

type ArtifactRow = {
  id: string;
  artifact_type: string;
  current_version_id: string | null;
  lifecycle_status: string;
};

type VersionRow = {
  id: string;
  artifact_id: string;
  version_number: number;
  generation_status: "pending" | "succeeded" | "failed";
  generation_error_code: string | null;
  approval_status: string;
  partner_review_status: string;
  partner_visible_instructions: string | null;
  generator_version: string;
  generated_at: string;
  superseded_at: string | null;
  source_drift_invalidated_at: string | null;
  normalized_snapshot: Record<string, unknown>;
  rendered_content: Record<string, unknown>;
};

const INTERNAL_VERSION_COLUMNS =
  "id, artifact_id, version_number, generation_status, generation_error_code, approval_status, partner_review_status, partner_visible_instructions, generator_version, generated_at, superseded_at, source_drift_invalidated_at, normalized_snapshot, rendered_content";

const PARTNER_VERSION_COLUMNS =
  "id, artifact_id, version_number, generation_status, approval_status, partner_review_status, partner_visible_instructions, generator_version, generated_at, superseded_at, source_drift_invalidated_at, rendered_content";

function toVersionView(row: VersionRow): ArtifactVersionView {
  const content = row.rendered_content as unknown;
  return {
    id: row.id,
    versionNumber: Number(row.version_number),
    generationStatus: row.generation_status,
    generationErrorCode: row.generation_error_code ?? null,
    approvalStatus: row.approval_status,
    partnerReviewStatus: row.partner_review_status,
    partnerVisibleInstructions: row.partner_visible_instructions ?? null,
    generatorVersion: row.generator_version,
    generatedAt: row.generated_at,
    supersededAt: row.superseded_at,
    staleAt: row.source_drift_invalidated_at,
    document:
      row.generation_status === "succeeded" && content && typeof content === "object"
        ? (content as RenderedDocument)
        : null
  };
}

function blockerFor(entry: {
  available: boolean;
  current: ArtifactVersionView | null;
  stale: boolean;
}): string | null {
  if (!entry.available) return "Not yet available in this release";
  if (!entry.current) return "No draft has been generated yet";
  if (entry.current.generationStatus === "failed") {
    return "The last generation failed and produced no document";
  }
  if (entry.stale) return "Source data changed after this version was generated";
  if (entry.current.approvalStatus === "changes_requested") {
    return "LegalEase requested changes";
  }
  if (entry.current.approvalStatus === "draft") return "Awaiting LegalEase review";
  if (entry.current.approvalStatus === "approved") {
    if (entry.current.partnerReviewStatus === "awaiting_partner") {
      return "Awaiting partner review";
    }
    if (entry.current.partnerReviewStatus === "changes_requested") {
      return "The partner requested a correction";
    }
    return null;
  }
  return null;
}

/**
 * Builds the board for either audience. Staleness is recomputed here on every
 * read; the stored provenance is displayed as history but never gates the
 * comparison.
 */
async function buildBoard(options: {
  client: AnyClient;
  partnerSlug: string;
  audience: "internal" | "partner";
  persistInvalidation: boolean;
}): Promise<ArtifactBoard> {
  const { client, partnerSlug, audience } = options;
  const source = await loadArtifactSourceInput(client, partnerSlug);

  const [artifactsResult, versionsResult, reviewsResult] = await Promise.all([
    client
      .from("partner_onboarding_artifacts")
      .select("id, artifact_type, current_version_id, lifecycle_status")
      .eq("workspace_id", source.workspace.id),
    client
      .from(
        audience === "internal"
          ? "partner_onboarding_artifact_versions"
          : "partner_onboarding_artifact_versions_safe"
      )
      .select(audience === "internal" ? INTERNAL_VERSION_COLUMNS : PARTNER_VERSION_COLUMNS)
      .eq("workspace_id", source.workspace.id)
      .order("version_number", { ascending: false }),
    client
      .from("partner_onboarding_artifact_reviews")
      .select("id, artifact_version_id, reviewer_type, decision, comments, reviewed_at")
      .eq("workspace_id", source.workspace.id)
      .order("reviewed_at", { ascending: false })
  ]);

  const artifacts = (artifactsResult.data ?? []) as ArtifactRow[];
  // The column list differs by audience, so the typed client cannot infer a
  // single row shape here.
  const versions = (versionsResult.data ?? []) as unknown as VersionRow[];
  const reviews = (reviewsResult.data ?? []) as Array<{
    id: string;
    artifact_version_id: string;
    reviewer_type: "legalease" | "partner";
    decision: "approve" | "request_changes" | "reject";
    comments: string | null;
    reviewed_at: string;
  }>;

  const versionNumberById = new Map(versions.map((row) => [row.id, Number(row.version_number)]));
  const entries: ArtifactBoardEntry[] = [];

  for (const artifactType of ARTIFACT_TYPES) {
    const artifact = artifacts.find((row) => row.artifact_type === artifactType) ?? null;
    const available = isGeneratableArtifactType(artifactType);
    const own = versions.filter((row) => row.artifact_id === artifact?.id);
    const current = artifact?.current_version_id
      ? own.find((row) => row.id === artifact.current_version_id) ?? null
      : own[0] ?? null;

    let stale = Boolean(current?.source_drift_invalidated_at);
    let staleFields: string[] = [];
    let invalidatedApprovals = { legalease: false, partner: false };

    if (available && current && current.generation_status === "succeeded") {
      const projection = projectArtifactSource(artifactType, source);
      const stored =
        audience === "internal"
          ? (current.normalized_snapshot ?? {})
          : null;

      if (stored) {
        const drift = detectArtifactDrift({
          storedSnapshot: stored,
          storedGeneratorVersion: current.generator_version,
          current: projection,
          currentGeneratorVersion: ARTIFACT_GENERATOR_VERSIONS[
            artifactType as keyof typeof ARTIFACT_GENERATOR_VERSIONS
          ]
        });
        stale = stale || drift.stale;
        staleFields = drift.changedKeys;
        invalidatedApprovals = {
          legalease: drift.invalidatesLegalEaseApproval,
          partner: drift.invalidatesPartnerApproval
        };

        // Persist once, and only when this read actually observed new drift on
        // an approved version. An unchanged read issues no statement at all.
        if (
          options.persistInvalidation &&
          drift.stale &&
          !current.source_drift_invalidated_at &&
          current.approval_status === "approved"
        ) {
          const admin = requireAdmin();
          await admin.rpc("rcap_service_invalidate_onboarding_artifact_version", {
            p_partner_slug: partnerSlug,
            p_artifact_version_id: current.id,
            p_current_snapshot_hash: projection.hash,
            p_drift_fields: drift.changedKeys
          });
        }
      } else if (current.source_drift_invalidated_at) {
        stale = true;
      }
    }

    const currentView = current ? toVersionView(current) : null;
    if (currentView && stale && !currentView.staleAt) {
      // The partner path cannot write, so it renders computed staleness rather
      // than presenting a drifted version as current.
      currentView.staleAt = "computed";
    }

    entries.push({
      artifactId: artifact?.id ?? null,
      artifactType,
      label: ARTIFACT_TYPE_LABELS[artifactType],
      available,
      lifecycleStatus: artifact?.lifecycle_status ?? "not_generated",
      currentVersion: currentView,
      versions: own.map(toVersionView),
      reviews: reviews
        .filter((row) => own.some((version) => version.id === row.artifact_version_id))
        .map((row) => ({
          id: row.id,
          reviewerType: row.reviewer_type,
          decision: row.decision,
          comments: row.comments,
          reviewedAt: row.reviewed_at,
          versionNumber: versionNumberById.get(row.artifact_version_id) ?? 0
        })),
      sourceFreshness: !available
        ? "unavailable"
        : !currentView
          ? "no_version"
          : stale
            ? "stale"
            : "current",
      staleFields,
      invalidatedApprovals,
      blocker: blockerFor({ available, current: currentView, stale })
    });
  }

  return {
    workspaceId: source.workspace.id,
    partnerSlug,
    organizationName: source.partnerRecord.organizationName,
    entries,
    legalEasePageConfiguration:
      audience === "internal"
        ? {
            publicDisplayName: source.workspace.publicDisplayName,
            publicHeadline: source.workspace.publicHeadline,
            publicSubheadline: source.workspace.publicSubheadline,
            supportInstructions: source.workspace.supportInstructions,
            showPartnerLogo: source.workspace.showPartnerLogo !== false,
            showPoweredBy: source.workspace.showPoweredBy !== false
          }
        : null
  };
}

export async function getInternalArtifactBoard(
  context: InternalOnboardingContext
): Promise<ArtifactBoard> {
  assertLaunchPrepEnabled();
  const admin = requireAdmin();
  await admin.rpc("rcap_service_ensure_onboarding_artifacts", {
    p_partner_slug: context.partnerSlug,
    p_workspace_id: (await loadArtifactSourceInput(admin, context.partnerSlug)).workspace.id,
    p_generatable_types: [...GENERATABLE_ARTIFACT_TYPES]
  });
  return buildBoard({
    client: admin,
    partnerSlug: context.partnerSlug,
    audience: "internal",
    persistInvalidation: true
  });
}

export async function getPartnerArtifactBoard(
  context: PartnerOnboardingContext
): Promise<ArtifactBoard> {
  assertLaunchPrepEnabled();
  const supabase = await createServerSupabaseAuthClient();
  return buildBoard({
    client: supabase,
    partnerSlug: context.partnerSlug,
    audience: "partner",
    persistInvalidation: false
  });
}

// --- mutations ---------------------------------------------------------------

/**
 * One renderer per generatable type. Every one of them takes the same shared
 * canonical read, so adding a document costs no extra query.
 */
const ARTIFACT_RENDERERS: Readonly<
  Record<GeneratableArtifactType, (input: ArtifactSourceInput) => RenderedDocument>
> = {
  implementation_brief: renderImplementationBrief,
  operations_escalation_plan: renderOperationsEscalationPlan,
  dashboard_user_reporting_matrix: renderDashboardUserReportingMatrix,
  staff_quick_start_guide: renderStaffQuickStartGuide,
  co_branded_page_configuration: renderCoBrandedPageConfiguration
};

export async function generateArtifactVersion(
  context: InternalOnboardingContext,
  input: { artifactType: string; requestId: string }
): Promise<{ versionId: string; versionNumber: number; duplicate: boolean }> {
  assertLaunchPrepEnabled();
  if (!isGeneratableArtifactType(input.artifactType)) {
    throw new Phase1OnboardingError(
      "invalid_input",
      "That document is not available to generate in this release."
    );
  }
  const admin = requireAdmin();
  const source = await loadArtifactSourceInput(admin, context.partnerSlug);
  const artifactType: GeneratableArtifactType = input.artifactType;
  const projection = projectArtifactSource(artifactType, source);
  const provenance = buildArtifactProvenance(source);

  let rendered: RenderedDocument | null = null;
  let generationStatus: "succeeded" | "failed" = "succeeded";
  let generationErrorCode: string | null = null;
  try {
    rendered = ARTIFACT_RENDERERS[artifactType](source);
  } catch {
    generationStatus = "failed";
    generationErrorCode = "render_failed";
  }

  const { data, error } = await admin.rpc(
    "rcap_service_generate_onboarding_artifact_version",
    {
      p_partner_slug: context.partnerSlug,
      p_actor_user_id: context.authUserId,
      p_workspace_id: source.workspace.id,
      p_artifact_type: artifactType,
      p_request_id: input.requestId,
      p_source_workspace_version: provenance.sourceWorkspaceVersion,
      p_source_section_revisions: provenance.sourceSectionRevisions,
      p_source_asset_versions: provenance.sourceAssetVersions,
      p_normalized_snapshot: projection.values,
      p_snapshot_hash: projection.hash,
      p_generator_version: ARTIFACT_GENERATOR_VERSIONS[artifactType],
      p_rendered_content: generationStatus === "succeeded" ? rendered : {},
      p_generation_status: generationStatus,
      p_generation_error_code: generationErrorCode
    }
  );

  if (error) {
    throw new Phase1OnboardingError(
      "persistence_failed",
      "The document could not be generated. Try again."
    );
  }
  const row = firstRow(data);
  if (!row) {
    throw new Phase1OnboardingError(
      "persistence_failed",
      "The document could not be generated. Try again."
    );
  }
  return {
    versionId: String(row.version_id),
    versionNumber: Number(row.version_number),
    duplicate: row.duplicate === true
  };
}

export async function reviewArtifactVersion(
  context: InternalOnboardingContext | PartnerOnboardingContext,
  input: {
    reviewerType: "legalease" | "partner";
    artifactVersionId: string;
    decision: "approve" | "request_changes" | "reject";
    comments?: string | null;
    partnerVisibleInstructions?: string | null;
    requestId: string;
  }
): Promise<{ approvalStatus: string; partnerReviewStatus: string; duplicate: boolean }> {
  assertLaunchPrepEnabled();
  const admin = requireAdmin();

  const { data, error } = await admin.rpc("rcap_service_review_onboarding_artifact", {
    p_partner_slug: context.partnerSlug,
    p_actor_user_id: context.authUserId,
    p_reviewer_type: input.reviewerType,
    p_artifact_version_id: input.artifactVersionId,
    p_decision: input.decision,
    p_comments: input.comments ?? null,
    p_partner_visible_instructions: input.partnerVisibleInstructions ?? null,
    p_request_id: input.requestId
  });

  if (error) {
    const message = String(error.message ?? "");
    if (message.includes("artifact_version_stale")) {
      throw new Phase1OnboardingError(
        "invalid_transition",
        "This version is out of date with the current program data. Regenerate it before approving."
      );
    }
    if (message.includes("artifact_generation_failed")) {
      throw new Phase1OnboardingError(
        "invalid_transition",
        "This version failed to generate and cannot be reviewed."
      );
    }
    throw new Phase1OnboardingError(
      "persistence_failed",
      "The review could not be saved. Try again."
    );
  }
  const row = firstRow(data);
  if (!row) {
    throw new Phase1OnboardingError(
      "persistence_failed",
      "The review could not be saved. Try again."
    );
  }
  return {
    approvalStatus: String(row.approval_status),
    partnerReviewStatus: String(row.partner_review_status),
    duplicate: row.duplicate === true
  };
}

const PAGE_CONFIGURATION_LIMITS = {
  publicDisplayName: 200,
  publicHeadline: 500,
  publicSubheadline: 500,
  supportInstructions: 5_000
} as const;

/**
 * Records the LegalEase-controlled public-page language for one workspace.
 *
 * This is not a generic patch endpoint: the shape is fixed at six named
 * columns, every value is length-bounded and normalized here, the row is
 * selected by the partner slug the internal context was authorized against, and
 * nothing about publication, activation, access codes, invitations, or payment
 * is reachable from it. Without it the LegalEase half of the co-branded page
 * ownership split would be inert while the launch-prep flag is on.
 */
export async function updateLegalEasePublicPageConfiguration(
  context: InternalOnboardingContext,
  input: {
    publicDisplayName?: unknown;
    publicHeadline?: unknown;
    publicSubheadline?: unknown;
    supportInstructions?: unknown;
    showPartnerLogo?: unknown;
    showPoweredBy?: unknown;
  }
): Promise<LegalEasePublicPageConfiguration> {
  assertLaunchPrepEnabled();
  const admin = requireAdmin();

  const patch = {
    public_display_name: boundedText(
      input.publicDisplayName,
      PAGE_CONFIGURATION_LIMITS.publicDisplayName
    ),
    public_headline: boundedText(
      input.publicHeadline,
      PAGE_CONFIGURATION_LIMITS.publicHeadline
    ),
    public_subheadline: boundedText(
      input.publicSubheadline,
      PAGE_CONFIGURATION_LIMITS.publicSubheadline
    ),
    support_instructions: boundedText(
      input.supportInstructions,
      PAGE_CONFIGURATION_LIMITS.supportInstructions
    ),
    show_partner_logo: input.showPartnerLogo === true,
    show_powered_by: input.showPoweredBy === true
  };

  const { data, error } = await admin
    .from("partner_onboarding")
    .update(patch)
    .eq("partner_slug", context.partnerSlug)
    .select(
      "public_display_name, public_headline, public_subheadline, support_instructions, show_partner_logo, show_powered_by"
    )
    .maybeSingle();

  if (error || !data) {
    throw new Phase1OnboardingError(
      "persistence_failed",
      "The public page language could not be saved. Try again."
    );
  }
  const row = data as Record<string, unknown>;
  return {
    publicDisplayName: (row.public_display_name as string | null) ?? null,
    publicHeadline: (row.public_headline as string | null) ?? null,
    publicSubheadline: (row.public_subheadline as string | null) ?? null,
    supportInstructions: (row.support_instructions as string | null) ?? null,
    showPartnerLogo: row.show_partner_logo !== false,
    showPoweredBy: row.show_powered_by !== false
  };
}

function boundedText(value: unknown, maxLength: number): string | null {
  if (typeof value !== "string") return null;
  const normalized = value
    .normalize("NFC")
    .replace(/\r\n?/gu, "\n")
    // Control characters other than the newline are stripped rather than
    // stored, matching the Phase 1 normalization rules.
    .replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/gu, "")
    .trim();
  if (normalized.length === 0) return null;
  if (normalized.length > maxLength) {
    throw new Phase1OnboardingError(
      "invalid_input",
      `That value must be ${maxLength} characters or fewer.`
    );
  }
  return normalized;
}

export async function supersedeArtifactVersion(
  context: InternalOnboardingContext,
  input: { artifactVersionId: string }
): Promise<{ superseded: boolean }> {
  assertLaunchPrepEnabled();
  const admin = requireAdmin();
  const { data, error } = await admin.rpc(
    "rcap_service_supersede_onboarding_artifact_version",
    {
      p_partner_slug: context.partnerSlug,
      p_actor_user_id: context.authUserId,
      p_artifact_version_id: input.artifactVersionId
    }
  );
  if (error) {
    throw new Phase1OnboardingError(
      "persistence_failed",
      "The version could not be superseded."
    );
  }
  const row = firstRow(data);
  return { superseded: row?.superseded === true };
}

// --- co-branded page preview assets ------------------------------------------

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/**
 * Resolves one organizational asset to a short-lived private URL so the
 * internal co-branded page preview can show the partner's real logo instead of
 * a placeholder. Read-only, internal-admin only, and scoped to the workspace
 * the partner slug names, so it cannot reach another tenant's asset. No public
 * URL is minted and nothing is published.
 */
export async function loadInternalOnboardingAssetUrl(
  context: InternalOnboardingContext,
  assetId: string
): Promise<{ url: string; mediaType: string }> {
  assertLaunchPrepEnabled();
  if (!UUID_PATTERN.test(assetId)) {
    throw new Phase1OnboardingError(
      "workspace_not_found",
      "Organizational asset not found."
    );
  }
  const admin = requireAdmin();

  const { data: workspaceRow } = await admin
    .from("partner_onboarding")
    .select("id")
    .eq("partner_slug", context.partnerSlug)
    .maybeSingle();
  const workspaceId = (workspaceRow as { id?: string } | null)?.id;
  if (!workspaceId) {
    throw new Phase1OnboardingError(
      "workspace_not_found",
      "Organizational asset not found."
    );
  }

  const { data, error } = await admin
    .from("partner_onboarding_assets")
    .select("object_path, media_type")
    .eq("id", assetId)
    .eq("workspace_id", workspaceId)
    .is("deleted_at", null)
    .in("lifecycle_status", ["pending_review", "active"])
    .maybeSingle();

  if (error || !data) {
    throw new Phase1OnboardingError(
      "workspace_not_found",
      "Organizational asset not found."
    );
  }
  const row = data as { object_path: string; media_type: string };
  if (!row.media_type.startsWith("image/")) {
    throw new Phase1OnboardingError(
      "workspace_not_found",
      "Organizational asset not found."
    );
  }
  return {
    url: await createPrivateOnboardingAssetUrl({ objectPath: row.object_path }),
    mediaType: row.media_type
  };
}

// --- downloads ---------------------------------------------------------------

export type ApprovedSnapshot = {
  document: RenderedDocument;
  versionNumber: number;
  generatedAt: string;
  artifactType: ArtifactType;
  organizationName: string;
};

/**
 * Loads an approved version for download. Tenant scoping is enforced by the
 * partner slug on the query, never by a browser-supplied partner identifier.
 */
export async function loadApprovedSnapshot(
  context: InternalOnboardingContext | PartnerOnboardingContext,
  input: { artifactVersionId: string; audience: "internal" | "partner" }
): Promise<ApprovedSnapshot> {
  assertLaunchPrepEnabled();
  const client: AnyClient =
    input.audience === "internal"
      ? requireAdmin()
      : await createServerSupabaseAuthClient();

  const { data, error } = await client
    .from("partner_onboarding_artifact_versions")
    .select(
      "id, artifact_id, workspace_id, version_number, approval_status, partner_review_status, generation_status, generated_at, rendered_content"
    )
    .eq("id", input.artifactVersionId)
    .maybeSingle();

  if (error || !data) {
    throw new Phase1OnboardingError("workspace_not_found", "That document is not available.");
  }
  const version = data as Record<string, unknown>;

  const { data: workspaceRow } = await client
    .from("partner_onboarding_workspace_safe")
    .select("id, partner_slug")
    .eq("id", String(version.workspace_id))
    .maybeSingle();

  const workspace = workspaceRow as { partner_slug?: string } | null;
  if (!workspace || workspace.partner_slug !== context.partnerSlug) {
    throw new Phase1OnboardingError("workspace_not_found", "That document is not available.");
  }

  if (version.generation_status !== "succeeded") {
    throw new Phase1OnboardingError("workspace_not_found", "That document is not available.");
  }
  if (version.approval_status !== "approved") {
    throw new Phase1OnboardingError(
      "invalid_transition",
      "Only an approved version can be downloaded."
    );
  }

  const { data: artifactRow } = await client
    .from("partner_onboarding_artifacts")
    .select("artifact_type")
    .eq("id", String(version.artifact_id))
    .maybeSingle();

  const source = await loadArtifactSourceInput(client, context.partnerSlug);

  return {
    document: version.rendered_content as RenderedDocument,
    versionNumber: Number(version.version_number),
    generatedAt: String(version.generated_at),
    artifactType: String(
      (artifactRow as { artifact_type?: string } | null)?.artifact_type ??
        "implementation_brief"
    ) as ArtifactType,
    organizationName: source.partnerRecord.organizationName
  };
}

/** Safe, tenant-scoped filename carrying the version and the date. */
export function approvedSnapshotFilename(snapshot: ApprovedSnapshot): string {
  const slug = snapshot.artifactType.replace(/_/g, "-");
  const date = snapshot.generatedAt.slice(0, 10);
  const safeDate = /^\d{4}-\d{2}-\d{2}$/.test(date) ? date : "undated";
  return `${slug}-v${snapshot.versionNumber}-${safeDate}.pdf`;
}

export function newRequestId(): string {
  return crypto.randomUUID();
}

function firstRow(data: unknown): Record<string, unknown> | null {
  if (Array.isArray(data)) {
    return (data[0] as Record<string, unknown>) ?? null;
  }
  if (data && typeof data === "object") return data as Record<string, unknown>;
  return null;
}
