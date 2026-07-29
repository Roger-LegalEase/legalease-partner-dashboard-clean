import "server-only";

import crypto from "node:crypto";

import { createServerSupabaseAuthClient } from "@/lib/supabase/auth-server";
import { getSupabaseAdminClient } from "@/lib/supabase/server";

import {
  loadInternalArtifactBoardWithSource,
  loadPartnerArtifactBoardWithSource,
  type ArtifactBoard
} from "./artifact-service";
import type { ArtifactSourceInput } from "./artifact-domain";
import { Phase1OnboardingError } from "./errors";
import { isRcapOnboardingLaunchPrepEnabled } from "./feature";
import {
  evaluateLaunchReadiness,
  launchCheckDefinition,
  partnerVisibleReadiness,
  type LaunchCheckStatus,
  type LaunchReadiness,
  type RecordedLaunchCheck
} from "./launch-readiness";
import type {
  InternalOnboardingContext,
  PartnerOnboardingContext
} from "./auth-context";

type SupabaseAdmin = NonNullable<ReturnType<typeof getSupabaseAdminClient>>;

function requireAdmin(): SupabaseAdmin {
  const admin = getSupabaseAdminClient();
  if (!admin) {
    throw new Phase1OnboardingError(
      "persistence_failed",
      "Launch readiness could not be updated. Try again."
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

const RECORDED_COLUMNS =
  "check_key, status, evidence_summary, evidence_reference, checked_at, invalidated_at, invalidated_reason";

type RecordedRow = {
  check_key: string;
  status: string;
  evidence_summary: string | null;
  evidence_reference: string | null;
  checked_at: string | null;
  invalidated_at: string | null;
  invalidated_reason: string | null;
};

function toRecorded(rows: RecordedRow[]): RecordedLaunchCheck[] {
  return rows.map((row) => ({
    checkKey: row.check_key,
    status: row.status as LaunchCheckStatus,
    evidenceSummary: row.evidence_summary,
    evidenceReference: row.evidence_reference,
    checkedAt: row.checked_at,
    invalidatedAt: row.invalidated_at,
    invalidatedReason: row.invalidated_reason
  }));
}

export type LaunchReadinessView = {
  partnerSlug: string;
  organizationName: string;
  readiness: LaunchReadiness;
  board: ArtifactBoard;
};

/**
 * Internal launch readiness.
 *
 * Cost is one canonical read shared with the artifact board, the board's own
 * three reads, and exactly one further read for recorded check decisions.
 * Adding a check to the catalogue adds no query.
 *
 * Two writes are possible and both are conditional on something having actually
 * changed: recorded decisions are invalidated when the board reports newly
 * observed drift, and a readiness transition is recorded when the computed
 * state differs from the last one observed. An unchanged read issues neither.
 */
export async function getInternalLaunchReadiness(
  context: InternalOnboardingContext
): Promise<LaunchReadinessView> {
  assertLaunchPrepEnabled();
  const admin = requireAdmin();
  const { board, source } = await loadInternalArtifactBoardWithSource(context);

  const { data } = await admin
    .from("partner_onboarding_launch_checks")
    .select(RECORDED_COLUMNS)
    .eq("workspace_id", source.workspace.id);

  let recorded = toRecorded((data ?? []) as RecordedRow[]);

  // Readiness follows the artifacts: a material source change invalidates a
  // recorded decision the same way it invalidates an approval, with the same
  // ownership asymmetry. The board already computed both.
  const drifted = board.entries.filter(
    (entry) => entry.available && entry.sourceFreshness === "stale"
  );
  const invalidatesPartnerOwned = drifted.some(
    (entry) => entry.invalidatedApprovals.partner
  );
  const standing = recorded.filter(
    (row) =>
      row.invalidatedAt === null &&
      ["passing", "waived", "not_applicable"].includes(row.status) &&
      (invalidatesPartnerOwned ||
        launchCheckDefinition(row.checkKey)?.owner === "legalease")
  );

  if (drifted.length > 0 && standing.length > 0) {
    await admin.rpc("rcap_service_invalidate_onboarding_launch_checks", {
      p_partner_slug: context.partnerSlug,
      p_workspace_id: source.workspace.id,
      p_invalidate_partner_owned: invalidatesPartnerOwned,
      p_reason: `Program data changed after these were recorded: ${drifted
        .map((entry) => entry.label)
        .join(", ")}`
    });
    const refreshed = await admin
      .from("partner_onboarding_launch_checks")
      .select(RECORDED_COLUMNS)
      .eq("workspace_id", source.workspace.id);
    recorded = toRecorded((refreshed.data ?? []) as RecordedRow[]);
  }

  const readiness = evaluateLaunchReadiness({
    source,
    artifacts: board.entries,
    recorded
  });

  await recordReadinessTransition(admin, context.partnerSlug, source, readiness);

  return {
    partnerSlug: context.partnerSlug,
    organizationName: board.organizationName,
    readiness,
    board
  };
}

/**
 * Records the transition only. The RPC's UPDATE is conditional on the state
 * differing, and it is not called at all when the state already matches, so an
 * unchanged read touches no row and stamps no `updated_at`.
 */
async function recordReadinessTransition(
  admin: SupabaseAdmin,
  partnerSlug: string,
  source: ArtifactSourceInput,
  readiness: LaunchReadiness
): Promise<void> {
  const state = readiness.ready ? "ready" : "not_ready";
  if (source.workspace.launchReadinessState === state) return;
  await admin.rpc("rcap_service_record_onboarding_launch_readiness", {
    p_partner_slug: partnerSlug,
    p_workspace_id: source.workspace.id,
    p_state: state
  });
}

/**
 * The partner's view. Internal-only checks are filtered out here, and the
 * partner client holds only a session under RLS, whose select policy withholds
 * every check it does not own regardless of what this code asks for.
 */
export async function getPartnerLaunchReadiness(
  context: PartnerOnboardingContext
): Promise<{ readiness: LaunchReadiness; board: ArtifactBoard }> {
  assertLaunchPrepEnabled();
  const supabase = await createServerSupabaseAuthClient();
  const { board, source } = await loadPartnerArtifactBoardWithSource(context);

  const { data } = await supabase
    .from("partner_onboarding_launch_checks")
    .select(RECORDED_COLUMNS)
    .eq("workspace_id", source.workspace.id);

  // The partner surface persists nothing: it holds only a session client under
  // RLS, and every mutation RPC is revoked from browser roles. It renders
  // computed readiness rather than a stored verdict.
  const readiness = evaluateLaunchReadiness({
    source,
    artifacts: board.entries,
    recorded: toRecorded((data ?? []) as RecordedRow[])
  });

  return { readiness: partnerVisibleReadiness(readiness), board };
}

// --- mutations ---------------------------------------------------------------

export async function recordLaunchCheck(
  context: InternalOnboardingContext | PartnerOnboardingContext,
  input: {
    reviewerType: "legalease" | "partner";
    checkKey: string;
    status: LaunchCheckStatus;
    evidenceSummary?: string | null;
    requestId: string;
  }
): Promise<{ checkId: string; status: string; duplicate: boolean }> {
  assertLaunchPrepEnabled();
  const definition = launchCheckDefinition(input.checkKey);
  if (!definition) {
    throw new Phase1OnboardingError("invalid_input", "That check does not exist.");
  }
  // An automated check derives its own state; nobody sets it by hand.
  if (definition.determination !== "manual") {
    throw new Phase1OnboardingError(
      "invalid_input",
      "That check is derived from program data and cannot be set by hand."
    );
  }
  if (definition.owner !== input.reviewerType) {
    throw new Phase1OnboardingError(
      "forbidden",
      "This check is not yours to record."
    );
  }
  if (
    input.reviewerType === "partner" &&
    (input.status === "waived" || input.status === "not_applicable")
  ) {
    throw new Phase1OnboardingError(
      "forbidden",
      "Only LegalEase can waive a launch check."
    );
  }

  const admin = requireAdmin();
  const workspaceId = await workspaceIdFor(admin, context.partnerSlug);

  const { data, error } = await admin.rpc(
    "rcap_service_record_onboarding_launch_check",
    {
      p_partner_slug: context.partnerSlug,
      p_actor_user_id: context.authUserId,
      p_reviewer_type: input.reviewerType,
      p_workspace_id: workspaceId,
      p_check_key: definition.key,
      p_category: definition.category,
      p_owner_type: definition.owner,
      p_blocking: definition.blocking,
      p_status: input.status,
      p_evidence_summary: input.evidenceSummary ?? null,
      p_request_id: input.requestId
    }
  );

  if (error) {
    throw launchCheckError(error);
  }
  const row = firstRow(data);
  if (!row) {
    throw new Phase1OnboardingError(
      "persistence_failed",
      "The check could not be recorded. Try again."
    );
  }
  return {
    checkId: String(row.check_id),
    status: String(row.check_status),
    duplicate: row.duplicate === true
  };
}

export async function recordLaunchApproval(
  context: InternalOnboardingContext | PartnerOnboardingContext,
  input: {
    reviewerType: "legalease" | "partner";
    approvalType: "partner_launch_approval" | "legalease_final_review";
    decision: "approve" | "withdraw";
    comments?: string | null;
    requestId: string;
  }
): Promise<{ approvalId: string; duplicate: boolean }> {
  assertLaunchPrepEnabled();
  const admin = requireAdmin();
  const workspaceId = await workspaceIdFor(admin, context.partnerSlug);

  const { data, error } = await admin.rpc(
    "rcap_service_record_onboarding_launch_approval",
    {
      p_partner_slug: context.partnerSlug,
      p_actor_user_id: context.authUserId,
      p_reviewer_type: input.reviewerType,
      p_workspace_id: workspaceId,
      p_approval_type: input.approvalType,
      p_decision: input.decision,
      p_comments: input.comments ?? null,
      p_request_id: input.requestId
    }
  );

  if (error) {
    throw launchCheckError(error);
  }
  const row = firstRow(data);
  if (!row) {
    throw new Phase1OnboardingError(
      "persistence_failed",
      "The approval could not be recorded. Try again."
    );
  }
  return {
    approvalId: String(row.approval_id),
    duplicate: row.duplicate === true
  };
}

async function workspaceIdFor(
  admin: SupabaseAdmin,
  partnerSlug: string
): Promise<string> {
  const { data } = await admin
    .from("partner_onboarding")
    .select("id")
    .eq("partner_slug", partnerSlug)
    .maybeSingle();
  const id = (data as { id?: string } | null)?.id;
  if (!id) {
    throw new Phase1OnboardingError(
      "workspace_not_found",
      "Program setup is not available for this partner."
    );
  }
  return id;
}

function launchCheckError(error: { message?: string }): Phase1OnboardingError {
  const message = String(error.message ?? "");
  if (message.includes("waiver_requires_legalease")) {
    return new Phase1OnboardingError(
      "forbidden",
      "Only LegalEase can waive a launch check."
    );
  }
  if (
    message.includes("reviewer_does_not_own_check") ||
    message.includes("reviewer_does_not_own_approval")
  ) {
    return new Phase1OnboardingError(
      "forbidden",
      "This check is not yours to record."
    );
  }
  return new Phase1OnboardingError(
    "persistence_failed",
    "The check could not be recorded. Try again."
  );
}

function firstRow(data: unknown): Record<string, unknown> | null {
  if (Array.isArray(data)) {
    return (data[0] as Record<string, unknown>) ?? null;
  }
  if (data && typeof data === "object") return data as Record<string, unknown>;
  return null;
}

export function newLaunchRequestId(): string {
  return crypto.randomUUID();
}
