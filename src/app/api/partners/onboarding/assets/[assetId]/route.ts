import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { requirePartnerOnboardingContext } from "@/lib/partners/onboarding/auth-context";
import {
  deletePartnerOnboardingAsset,
  getPartnerOnboardingAssetDownload
} from "@/lib/partners/onboarding/assets";
import { Phase1OnboardingError } from "@/lib/partners/onboarding/errors";
import {
  onboardingHttpError,
  onboardingJson
} from "@/lib/partners/onboarding/http";
import {
  assertSameOrigin,
  ONBOARDING_PRIVATE_RESPONSE_HEADERS,
  readBoundedJson,
  requireRequestId
} from "@/lib/partners/onboarding/request-security";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ assetId: string }> }
) {
  try {
    const context = await requirePartnerOnboardingContext();
    const { assetId } = await params;
    assertUuid(assetId);
    const download = await getPartnerOnboardingAssetDownload(context, assetId);
    return NextResponse.redirect(download.url, {
      status: 307,
      headers: ONBOARDING_PRIVATE_RESPONSE_HEADERS
    });
  } catch (error) {
    return onboardingHttpError(error);
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ assetId: string }> }
) {
  try {
    assertSameOrigin(request);
    const context = await requirePartnerOnboardingContext({ write: true });
    const { assetId } = await params;
    assertUuid(assetId);
    const body = await readBoundedJson(request);
    const requestId = requireRequestId(body.requestId);
    const expectedWorkspaceVersion = parseWorkspaceVersion(
      body.expectedWorkspaceVersion
    );
    const result = await deletePartnerOnboardingAsset(context, {
      assetId,
      requestId,
      expectedWorkspaceVersion
    });
    return onboardingJson({ success: true, ...result });
  } catch (error) {
    return onboardingHttpError(error);
  }
}

function parseWorkspaceVersion(value: unknown): number {
  if (!Number.isSafeInteger(value) || Number(value) < 1) {
    throw new Phase1OnboardingError(
      "invalid_input",
      "A valid expected workspace version is required."
    );
  }
  return Number(value);
}

function assertUuid(value: string) {
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)) {
    throw new Phase1OnboardingError("workspace_not_found", "Organizational asset not found.");
  }
}
