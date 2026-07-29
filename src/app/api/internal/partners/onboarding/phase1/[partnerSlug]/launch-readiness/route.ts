import type { NextRequest } from "next/server";

import { requireInternalOnboardingContext } from "@/lib/partners/onboarding/auth-context";
import { Phase1OnboardingError } from "@/lib/partners/onboarding/errors";
import { onboardingHttpError, onboardingJson } from "@/lib/partners/onboarding/http";
import {
  getInternalLaunchReadiness,
  recordLaunchApproval,
  recordLaunchCheck
} from "@/lib/partners/onboarding/launch-readiness-service";
import type { LaunchCheckStatus } from "@/lib/partners/onboarding/launch-readiness";
import {
  assertSameOrigin,
  readBoundedJson,
  requireRequestId
} from "@/lib/partners/onboarding/request-security";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

const INTERNAL_STATUSES: readonly LaunchCheckStatus[] = [
  "passing",
  "needs_review",
  "waived",
  "not_applicable"
];

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ partnerSlug: string }> }
) {
  try {
    const { partnerSlug } = await params;
    const context = await requireInternalOnboardingContext(partnerSlug);
    const view = await getInternalLaunchReadiness(context);
    return onboardingJson({ success: true, readiness: view.readiness });
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
    const action = requiredString(body.action, 40);
    const payload = objectValue(body.payload);

    let result: unknown;
    if (action === "record_check") {
      result = await recordLaunchCheck(context, {
        reviewerType: "legalease",
        checkKey: requiredString(payload.checkKey, 80),
        status: parseStatus(payload.status),
        evidenceSummary: optionalString(payload.evidenceSummary, 2000),
        requestId
      });
    } else if (action === "record_final_review") {
      result = await recordLaunchApproval(context, {
        reviewerType: "legalease",
        approvalType: "legalease_final_review",
        decision: parseDecision(payload.decision),
        comments: optionalString(payload.comments, 5000),
        requestId
      });
    } else {
      throw new Phase1OnboardingError("invalid_input", "Unsupported action.");
    }

    const view = await getInternalLaunchReadiness(context);
    return onboardingJson({
      success: true,
      result,
      readiness: view.readiness
    });
  } catch (error) {
    return onboardingHttpError(error);
  }
}

function parseStatus(value: unknown): LaunchCheckStatus {
  const status = requiredString(value, 40);
  if (!(INTERNAL_STATUSES as readonly string[]).includes(status)) {
    throw new Phase1OnboardingError("invalid_input", "That status is not allowed.");
  }
  return status as LaunchCheckStatus;
}

function parseDecision(value: unknown): "approve" | "withdraw" {
  const decision = requiredString(value, 20);
  if (decision !== "approve" && decision !== "withdraw") {
    throw new Phase1OnboardingError("invalid_input", "That decision is not allowed.");
  }
  return decision;
}

function objectValue(value: unknown): Record<string, unknown> {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  return {};
}

function requiredString(value: unknown, maxLength: number): string {
  if (typeof value !== "string") {
    throw new Phase1OnboardingError("invalid_input", "A required value is missing.");
  }
  const trimmed = value.trim();
  if (trimmed.length === 0 || trimmed.length > maxLength) {
    throw new Phase1OnboardingError("invalid_input", "A required value is missing.");
  }
  return trimmed;
}

function optionalString(value: unknown, maxLength: number): string | null {
  if (value === undefined || value === null || value === "") return null;
  return requiredString(value, maxLength);
}
