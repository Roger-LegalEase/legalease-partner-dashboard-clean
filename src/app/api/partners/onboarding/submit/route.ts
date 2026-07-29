import type { NextRequest } from "next/server";
import { requirePartnerOnboardingContext } from "@/lib/partners/onboarding/auth-context";
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
import { submitPartnerOnboarding } from "@/lib/partners/onboarding/service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function POST(request: NextRequest) {
  try {
    assertSameOrigin(request);
    const context = await requirePartnerOnboardingContext({
      write: true,
      includeEmail: true
    });
    const body = await readBoundedJson(request);
    const requestId = requireRequestId(body.requestId);
    if (!Number.isSafeInteger(body.expectedWorkspaceVersion) || Number(body.expectedWorkspaceVersion) < 1) {
      throw new Phase1OnboardingError("invalid_input", "A valid workspace version is required.");
    }
    const submission = await submitPartnerOnboarding(context, {
      requestId,
      expectedWorkspaceVersion: Number(body.expectedWorkspaceVersion)
    });
    return onboardingJson({ success: true, submission });
  } catch (error) {
    return onboardingHttpError(error);
  }
}
