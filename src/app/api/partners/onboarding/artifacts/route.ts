import type { NextRequest } from "next/server";

import { requirePartnerOnboardingContext } from "@/lib/partners/onboarding/auth-context";
import { Phase1OnboardingError } from "@/lib/partners/onboarding/errors";
import { onboardingHttpError, onboardingJson } from "@/lib/partners/onboarding/http";
import {
  getPartnerArtifactBoard,
  reviewArtifactVersion
} from "@/lib/partners/onboarding/artifact-service";
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
    return onboardingJson({
      success: true,
      board: await getPartnerArtifactBoard(context)
    });
  } catch (error) {
    return onboardingHttpError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    assertSameOrigin(request);
    // Partner review is a change to program setup, so it requires a partner
    // administrator. Staff and viewers remain read-only, matching Phase 1.
    const context = await requirePartnerOnboardingContext({ write: true });
    const body = await readBoundedJson(request);
    const requestId = requireRequestId(body.requestId);
    const action = requiredString(body.action, 40);
    const payload = objectValue(body.payload);

    if (action !== "approve" && action !== "request_correction") {
      throw new Phase1OnboardingError("invalid_input", "Unsupported action.");
    }

    const result = await reviewArtifactVersion(context, {
      reviewerType: "partner",
      artifactVersionId: requiredString(payload.artifactVersionId, 40),
      decision: action === "approve" ? "approve" : "request_changes",
      comments:
        action === "approve"
          ? optionalString(payload.comments, 5000)
          : requiredString(payload.comments, 5000),
      requestId
    });

    return onboardingJson({
      success: true,
      result,
      board: await getPartnerArtifactBoard(context)
    });
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
