import type { NextRequest } from "next/server";
import { requirePartnerOnboardingContext } from "@/lib/partners/onboarding/auth-context";
import {
  parseOnboardingAssetCategory,
  uploadPartnerOnboardingAsset
} from "@/lib/partners/onboarding/assets";
import { Phase1OnboardingError } from "@/lib/partners/onboarding/errors";
import {
  onboardingHttpError,
  onboardingJson
} from "@/lib/partners/onboarding/http";
import {
  assertSameOrigin,
  readBoundedMultipartFormData,
  requireRequestId
} from "@/lib/partners/onboarding/request-security";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

const MAX_MULTIPART_BYTES = 21 * 1024 * 1024;

export async function POST(request: NextRequest) {
  try {
    assertSameOrigin(request);
    const context = await requirePartnerOnboardingContext({ write: true });
    const form = await readBoundedMultipartFormData(
      request,
      MAX_MULTIPART_BYTES
    );
    const file = form.get("file");
    if (!(file instanceof File)) {
      throw new Phase1OnboardingError("invalid_input", "Choose a file to upload.");
    }
    const category = parseOnboardingAssetCategory(form.get("category"));
    const requestId = requireRequestId(form.get("requestId"));
    const expectedWorkspaceVersion = parseWorkspaceVersion(
      form.get("expectedWorkspaceVersion")
    );
    const result = await uploadPartnerOnboardingAsset(context, {
      category,
      file,
      requestId,
      expectedWorkspaceVersion
    });
    return onboardingJson({ success: true, ...result }, 201);
  } catch (error) {
    return onboardingHttpError(error);
  }
}

function parseWorkspaceVersion(value: FormDataEntryValue | null): number {
  const parsed =
    typeof value === "string" && /^\d+$/.test(value)
      ? Number(value)
      : Number.NaN;
  if (!Number.isSafeInteger(parsed) || parsed < 1) {
    throw new Phase1OnboardingError(
      "invalid_input",
      "A valid expected workspace version is required."
    );
  }
  return parsed;
}
