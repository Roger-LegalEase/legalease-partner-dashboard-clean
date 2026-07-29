import type { NextRequest } from "next/server";

import { requireInternalOnboardingContext } from "@/lib/partners/onboarding/auth-context";
import { Phase1OnboardingError } from "@/lib/partners/onboarding/errors";
import { onboardingHttpError, onboardingJson } from "@/lib/partners/onboarding/http";
import {
  generateArtifactVersion,
  getInternalArtifactBoard,
  reviewArtifactVersion,
  supersedeArtifactVersion,
  updateLegalEasePublicPageConfiguration
} from "@/lib/partners/onboarding/artifact-service";
import {
  assertSameOrigin,
  readBoundedJson,
  requireRequestId
} from "@/lib/partners/onboarding/request-security";

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
    return onboardingJson({
      success: true,
      board: await getInternalArtifactBoard(context)
    });
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
    if (action === "generate" || action === "regenerate") {
      result = await generateArtifactVersion(context, {
        artifactType: requiredString(payload.artifactType, 60),
        requestId
      });
    } else if (action === "approve") {
      result = await reviewArtifactVersion(context, {
        reviewerType: "legalease",
        artifactVersionId: requiredString(payload.artifactVersionId, 40),
        decision: "approve",
        comments: optionalString(payload.comments, 5000),
        requestId
      });
    } else if (action === "request_changes") {
      result = await reviewArtifactVersion(context, {
        reviewerType: "legalease",
        artifactVersionId: requiredString(payload.artifactVersionId, 40),
        decision: "request_changes",
        comments: requiredString(payload.comments, 5000),
        partnerVisibleInstructions: optionalString(
          payload.partnerVisibleInstructions,
          5000
        ),
        requestId
      });
    } else if (action === "supersede") {
      result = await supersedeArtifactVersion(context, {
        artifactVersionId: requiredString(payload.artifactVersionId, 40)
      });
    } else if (action === "configure_public_page_language") {
      // LegalEase records its own controlled page language here. There is no
      // partner path to this action, and it publishes and activates nothing.
      result = await updateLegalEasePublicPageConfiguration(context, {
        publicDisplayName: optionalString(payload.publicDisplayName, 200),
        publicHeadline: optionalString(payload.publicHeadline, 500),
        publicSubheadline: optionalString(payload.publicSubheadline, 500),
        supportInstructions: optionalString(payload.supportInstructions, 5000),
        showPartnerLogo: payload.showPartnerLogo === true,
        showPoweredBy: payload.showPoweredBy === true
      });
    } else {
      throw new Phase1OnboardingError("invalid_input", "Unsupported action.");
    }

    return onboardingJson({
      success: true,
      result,
      board: await getInternalArtifactBoard(context)
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
