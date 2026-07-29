import type { NextRequest } from "next/server";

import { requirePartnerOnboardingContext } from "@/lib/partners/onboarding/auth-context";
import { Phase1OnboardingError } from "@/lib/partners/onboarding/errors";
import { onboardingHttpError, onboardingJson } from "@/lib/partners/onboarding/http";
import {
  getPartnerLaunchReadiness,
  recordLaunchApproval,
  recordLaunchCheck
} from "@/lib/partners/onboarding/launch-readiness-service";
import {
  assertSameOrigin,
  readBoundedJson,
  requireRequestId
} from "@/lib/partners/onboarding/request-security";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET() {
  try {
    const context = await requirePartnerOnboardingContext();
    const { readiness } = await getPartnerLaunchReadiness(context);
    return onboardingJson({ success: true, readiness });
  } catch (error) {
    return onboardingHttpError(error);
  }
}

/**
 * The partner surface can record its own launch approval and confirm its own
 * staff training. It cannot waive anything, cannot touch a LegalEase-owned
 * check, and cannot publish, invite, release, or activate: the service refuses
 * a mismatched owner and the database constraint refuses it again.
 */
export async function POST(request: NextRequest) {
  try {
    assertSameOrigin(request);
    const context = await requirePartnerOnboardingContext({ write: true });
    const body = await readBoundedJson(request);
    const requestId = requireRequestId(body.requestId);
    const action = requiredString(body.action, 40);
    const payload = objectValue(body.payload);

    let result: unknown;
    if (action === "confirm_check") {
      result = await recordLaunchCheck(context, {
        reviewerType: "partner",
        checkKey: requiredString(payload.checkKey, 80),
        // A partner confirms; it never waives and never marks not applicable.
        status: "passing",
        evidenceSummary: optionalString(payload.evidenceSummary, 2000),
        requestId
      });
    } else if (action === "record_launch_approval") {
      result = await recordLaunchApproval(context, {
        reviewerType: "partner",
        approvalType: "partner_launch_approval",
        decision: "approve",
        comments: optionalString(payload.comments, 5000),
        requestId
      });
    } else {
      throw new Phase1OnboardingError("invalid_input", "Unsupported action.");
    }

    const { readiness } = await getPartnerLaunchReadiness(context);
    return onboardingJson({ success: true, result, readiness });
  } catch (error) {
    return onboardingHttpError(error);
  }
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
