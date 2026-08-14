import type { NextRequest } from "next/server";
import { requirePartnerOnboardingContext } from "@/lib/partners/onboarding/auth-context";
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
  savePartnerOnboardingSection
} from "@/lib/partners/onboarding/service";
import { ONBOARDING_SECTION_ORDER } from "@/lib/partners/onboarding/schema";
import type {
  OnboardingSectionKey,
  OnboardingValidationMode
} from "@/lib/partners/onboarding/types";
import { Phase1OnboardingError } from "@/lib/partners/onboarding/errors";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ sectionKey: string }> }
) {
  try {
    assertSameOrigin(request);
    const context = await requirePartnerOnboardingContext({ write: true });
    const { sectionKey: rawSectionKey } = await params;
    const sectionKey = parseSectionKey(rawSectionKey);
    const body = await readBoundedJson(request);
    const requestId = requireRequestId(body.requestId);
    const expectedRevision = parseRevision(body.expectedRevision);
    const expectedWorkspaceVersion = parseWorkspaceVersion(
      body.expectedWorkspaceVersion
    );
    const mode = parseMode(body.mode);
    const guidedStepId = parseGuidedStepId(body.guidedStepId);

    const result = await savePartnerOnboardingSection(context, {
      sectionKey,
      expectedRevision,
      expectedWorkspaceVersion,
      requestId,
      mode,
      ...(guidedStepId ? { guidedStepId } : {}),
      data: body.data
    });
    return onboardingJson({ success: true, ...result });
  } catch (error) {
    return onboardingHttpError(error);
  }
}

function parseGuidedStepId(value: unknown): string | undefined {
  if (value === undefined || value === null || value === "") return undefined;
  if (
    typeof value !== "string" ||
    value.length > 80 ||
    !/^[a-z0-9]+(?:-[a-z0-9]+)*$/u.test(value)
  ) {
    throw new Phase1OnboardingError(
      "invalid_input",
      "Choose a valid onboarding task."
    );
  }
  return value;
}

function parseSectionKey(value: string): OnboardingSectionKey {
  if (!(ONBOARDING_SECTION_ORDER as readonly string[]).includes(value)) {
    throw new Phase1OnboardingError("workspace_not_found", "Setup section not found.");
  }
  return value as OnboardingSectionKey;
}

function parseRevision(value: unknown): number {
  if (!Number.isSafeInteger(value) || Number(value) < 0) {
    throw new Phase1OnboardingError("invalid_input", "A valid expected revision is required.");
  }
  return Number(value);
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

function parseMode(value: unknown): Exclude<OnboardingValidationMode, "final_submit"> {
  if (value !== "draft_save" && value !== "section_complete") {
    throw new Phase1OnboardingError("invalid_input", "Choose a valid save mode.");
  }
  return value;
}
