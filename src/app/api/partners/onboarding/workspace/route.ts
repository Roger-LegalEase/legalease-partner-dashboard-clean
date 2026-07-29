import { requirePartnerOnboardingContext } from "@/lib/partners/onboarding/auth-context";
import {
  onboardingHttpError,
  onboardingJson
} from "@/lib/partners/onboarding/http";
import { getPartnerOnboardingPortal } from "@/lib/partners/onboarding/service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET() {
  try {
    const context = await requirePartnerOnboardingContext();
    const onboarding = await getPartnerOnboardingPortal(context);
    return onboardingJson({ success: true, onboarding });
  } catch (error) {
    return onboardingHttpError(error);
  }
}
