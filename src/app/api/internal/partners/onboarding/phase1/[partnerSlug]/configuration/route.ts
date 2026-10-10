import type { NextRequest } from "next/server";
import { requireInternalOnboardingContext } from "@/lib/partners/onboarding/auth-context";
import { onboardingHttpError, onboardingJson } from "@/lib/partners/onboarding/http";
import { assertSameOrigin, readBoundedJson, requireRequestId } from "@/lib/partners/onboarding/request-security";
import { getProgramConfiguration, saveProgramConfiguration } from "@/lib/partners/onboarding/program-configuration-service";
import type { ProgramPatch } from "@/lib/partners/onboarding/program-configuration";
import { Phase1OnboardingError } from "@/lib/partners/onboarding/errors";
export const dynamic = "force-dynamic";
export async function GET(_request: NextRequest, { params }: { params: Promise<{ partnerSlug: string }> }) {
  try { return onboardingJson({ configuration: await getProgramConfiguration(await requireInternalOnboardingContext((await params).partnerSlug)) }); }
  catch (error) { return onboardingHttpError(error); }
}
export async function POST(request: NextRequest, { params }: { params: Promise<{ partnerSlug: string }> }) {
  try {
    assertSameOrigin(request);
    const context = await requireInternalOnboardingContext((await params).partnerSlug);
    const body = await readBoundedJson(request);
    if (!Number.isSafeInteger(body.expectedVersion) || Number(body.expectedVersion) < 1) throw new Phase1OnboardingError("invalid_input", "Reload the program before saving.");
    const configuration = await saveProgramConfiguration(context, { patches: body.patches as ProgramPatch[], requestId: requireRequestId(body.requestId), expectedVersion: Number(body.expectedVersion) });
    return onboardingJson({ configuration });
  } catch (error) { return onboardingHttpError(error); }
}
