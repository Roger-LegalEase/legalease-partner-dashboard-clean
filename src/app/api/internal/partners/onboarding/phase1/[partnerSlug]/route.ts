import type { NextRequest } from "next/server";
import {
  requireInternalOnboardingContext
} from "@/lib/partners/onboarding/auth-context";
import { Phase1OnboardingError } from "@/lib/partners/onboarding/errors";
import {
  onboardingHttpError,
  onboardingJson
} from "@/lib/partners/onboarding/http";
import {
  assertSameOrigin,
  readBoundedJson,
  requireRequestId
} from "@/lib/partners/onboarding/request-security";
import {
  applyInternalOnboardingReview,
  createOrGetOnboardingWorkspace,
  getInternalOnboardingSnapshot,
  type InternalReviewAction
} from "@/lib/partners/onboarding/service";
import { ONBOARDING_SECTION_ORDER } from "@/lib/partners/onboarding/schema";
import type {
  CommercialGateOutcome,
  OnboardingSectionKey
} from "@/lib/partners/onboarding/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ partnerSlug: string }> }
) {
  try {
    const { partnerSlug } = await params;
    const context = await requireInternalOnboardingContext(partnerSlug);
    const snapshot = await getInternalOnboardingSnapshot(context);
    return onboardingJson({ success: true, snapshot });
  } catch (error) {
    return onboardingHttpError(error);
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ partnerSlug: string }> }
) {
  try {
    assertSameOrigin(request);
    const { partnerSlug } = await params;
    const context = await requireInternalOnboardingContext(partnerSlug);
    const body = await readBoundedJson(request);
    const requestId = requireRequestId(body.requestId);
    const action = requiredString(body.action, 50);
    const payload = objectValue(body.payload);

    if (action === "create") {
      await createOrGetOnboardingWorkspace(context, {
        requestId,
        targetLaunchDate: optionalDate(payload.targetLaunchDate)
      });
      return onboardingJson({
        success: true,
        snapshot: await getInternalOnboardingSnapshot(context)
      });
    }

    const workspaceId = requiredUuid(body.workspaceId);
    const expectedWorkspaceVersion = requiredVersion(body.expectedWorkspaceVersion);
    const operation = parseOperation(action, payload);
    const result = await applyInternalOnboardingReview(context, {
      workspaceId,
      expectedWorkspaceVersion,
      requestId,
      operation
    });
    return onboardingJson({
      success: true,
      result,
      snapshot: await getInternalOnboardingSnapshot(context)
    });
  } catch (error) {
    return onboardingHttpError(error);
  }
}

function parseOperation(action: string, payload: Record<string, unknown>): InternalReviewAction {
  switch (action) {
    case "target_launch_date":
      return {
        action,
        targetLaunchDate: optionalDate(payload.targetLaunchDate),
        reason: requiredString(payload.reason, 5000)
      };
    case "commercial_gate":
      return parseCommercialGateOperation(payload);
    case "agreement":
      return parseAgreementOperation(payload);
    case "request_changes":
      return {
        action,
        sectionKey: sectionKey(payload.sectionKey),
        instructions: requiredString(payload.instructions, 5000)
      };
    case "approve_section":
    case "waive_section":
      return {
        action,
        sectionKey: sectionKey(payload.sectionKey),
        reason: requiredString(payload.reason, 5000)
      };
    case "ready_for_launch":
    case "close":
      return {
        action,
        reason: requiredString(payload.reason, 5000)
      };
    default:
      throw new Phase1OnboardingError("invalid_input", "Choose a supported internal review action.");
  }
}

function parseAgreementOperation(
  payload: Record<string, unknown>
): Extract<InternalReviewAction, { action: "agreement" }> {
  const status = agreementStatus(payload.status);
  const finalizedAssetId = optionalUuid(payload.finalizedAssetId);
  if (
    finalizedAssetId &&
    !["finalized", "executed", "approved"].includes(status)
  ) {
    throw new Phase1OnboardingError(
      "invalid_input",
      "A finalized document can be attached only to a finalized, executed, or approved status."
    );
  }
  return {
    action: "agreement",
    agreementType: agreementType(payload.agreementType),
    status,
    required: payload.required === true,
    partnerSafeDetail: optionalString(payload.partnerSafeDetail, 5000),
    finalizedAssetId,
    effectiveDate: optionalDate(payload.effectiveDate)
  };
}

function parseCommercialGateOperation(
  payload: Record<string, unknown>
): Extract<InternalReviewAction, { action: "commercial_gate" }> {
  const outcome = commercialOutcome(payload.outcome);
  const evidenceReference = optionalString(payload.evidenceReference, 500);
  const overrideReason = optionalString(payload.overrideReason, 5000);
  if (
    outcome === "cleared_by_approved_purchase_order" &&
    !evidenceReference
  ) {
    throw new Phase1OnboardingError(
      "invalid_input",
      "An authoritative commercial evidence reference is required."
    );
  }
  if (
    outcome === "cleared_by_authorized_internal_override" &&
    !overrideReason
  ) {
    throw new Phase1OnboardingError(
      "invalid_input",
      "An authorized override reason is required."
    );
  }
  return {
    action: "commercial_gate",
    outcome,
    evidenceReference,
    overrideReason:
      outcome === "cleared_by_authorized_internal_override"
        ? overrideReason
        : null
  };
}

function objectValue(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Phase1OnboardingError("invalid_input", "A typed operation payload is required.");
  }
  return value as Record<string, unknown>;
}

function requiredString(value: unknown, maxLength: number): string {
  if (typeof value !== "string") {
    throw new Phase1OnboardingError("invalid_input", "A required value is missing.");
  }
  const normalized = value.replace(/\s+/g, " ").trim();
  if (!normalized || normalized.length > maxLength || /[\u0000-\u001f\u007f]/.test(normalized)) {
    throw new Phase1OnboardingError("invalid_input", "A required value is invalid.");
  }
  return normalized;
}

function optionalString(value: unknown, maxLength: number): string | null {
  if (value === null || value === undefined || value === "") return null;
  return requiredString(value, maxLength);
}

function requiredUuid(value: unknown): string {
  const normalized = requiredString(value, 36);
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(normalized)) {
    throw new Phase1OnboardingError("workspace_not_found", "Onboarding workspace not found.");
  }
  return normalized.toLowerCase();
}

function optionalUuid(value: unknown): string | null {
  if (value === null || value === undefined || value === "") return null;
  return requiredUuid(value);
}

function requiredVersion(value: unknown): number {
  if (!Number.isSafeInteger(value) || Number(value) < 1) {
    throw new Phase1OnboardingError("invalid_input", "A valid workspace version is required.");
  }
  return Number(value);
}

function optionalDate(value: unknown): string | null {
  if (value === null || value === undefined || value === "") return null;
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    throw new Phase1OnboardingError("invalid_input", "Enter a valid date.");
  }
  const date = new Date(`${value}T00:00:00.000Z`);
  if (Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== value) {
    throw new Phase1OnboardingError("invalid_input", "Enter a valid date.");
  }
  return value;
}

function sectionKey(value: unknown): OnboardingSectionKey {
  const normalized = requiredString(value, 80);
  if (!(ONBOARDING_SECTION_ORDER as readonly string[]).includes(normalized)) {
    throw new Phase1OnboardingError("invalid_input", "Choose a valid onboarding section.");
  }
  return normalized as OnboardingSectionKey;
}

function commercialOutcome(value: unknown): CommercialGateOutcome {
  const normalized = requiredString(value, 80);
  const allowed: readonly string[] = [
    "blocked",
    "cleared_by_paid_invoice",
    "cleared_by_approved_purchase_order",
    "cleared_by_authorized_internal_override"
  ];
  if (!allowed.includes(normalized)) {
    throw new Phase1OnboardingError("invalid_input", "Choose a valid commercial outcome.");
  }
  return normalized as CommercialGateOutcome;
}

function agreementType(value: unknown) {
  const normalized = requiredString(value, 80);
  const allowed = [
    "order_form",
    "master_services_agreement",
    "data_privacy_security_addendum",
    "procurement_requirements"
  ] as const;
  if (!(allowed as readonly string[]).includes(normalized)) {
    throw new Phase1OnboardingError("invalid_input", "Choose a valid agreement type.");
  }
  return normalized as (typeof allowed)[number];
}

function agreementStatus(value: unknown): string {
  const normalized = requiredString(value, 80);
  const allowed = [
    "not_required",
    "not_started",
    "requested",
    "under_review",
    "finalized",
    "executed",
    "approved",
    "waived"
  ];
  if (!allowed.includes(normalized)) {
    throw new Phase1OnboardingError("invalid_input", "Choose a valid agreement status.");
  }
  return normalized;
}
