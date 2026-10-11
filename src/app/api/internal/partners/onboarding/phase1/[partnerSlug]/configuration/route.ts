import type { NextRequest } from "next/server";
import { requireInternalOnboardingContext } from "@/lib/partners/onboarding/auth-context";
import { onboardingHttpError, onboardingJson } from "@/lib/partners/onboarding/http";
import { assertSameOrigin, readBoundedJson, requireRequestId } from "@/lib/partners/onboarding/request-security";
import { getProgramConfiguration, saveProgramConfiguration } from "@/lib/partners/onboarding/program-configuration-service";
import type { ProgramPatch } from "@/lib/partners/onboarding/program-configuration";
import { Phase1OnboardingError } from "@/lib/partners/onboarding/errors";
import { prepareInternalProgram, getProgramOperations } from "@/lib/partners/onboarding/program-operations-service";
export const maxDuration = 60;
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
    let configuration = await saveProgramConfiguration(context, { patches: body.patches as ProgramPatch[], requestId: requireRequestId(body.requestId), expectedVersion: Number(body.expectedVersion), confirmPublicationHold: body.confirmPublicationHold === true });
    let preparationError: string | null = null;
    if(configuration.policyVersion==="rcap2.2" && !["live","paused","closed"].includes(configuration.status)) {
      try { await prepareInternalProgram(context); }
      catch(error) { preparationError=error instanceof Phase1OnboardingError ? error.message : "Materials could not be prepared. Retry Update Materials."; }
      // Save succeeded even if a provider failed. Return the persisted values,
      // not a false save failure that would discard or repeat the user's edits.
      configuration=await getProgramConfiguration(context);
    }
    return onboardingJson({ configuration, operations:await getProgramOperations(context), preparationError });
  } catch (error) { return onboardingHttpError(error); }
}
