import Link from "next/link";
import { redirect } from "next/navigation";
import { logSecurityWarn } from "@/lib/observability/logger";
import { resolveSessionPartner, SessionPartnerError } from "@/lib/partners/session-partner";
import { getOnboardingForPartner, type PartnerFacingOnboarding } from "@/lib/partners/partner-onboarding";

export const dynamic = "force-dynamic";

const ROUTE = "/partner/onboarding";

export default async function PartnerOnboardingPage() {
  let partnerSlug: string;
  try {
    const session = await resolveSessionPartner();
    if (session.kind === "internal_admin") {
      redirect("/internal/partners/onboarding");
    }
    partnerSlug = session.partnerSlug;
  } catch (error) {
    if (error instanceof SessionPartnerError) {
      if (error.code === "unauthenticated") redirect(`/sign-in?next=${ROUTE}`);
      logSecurityWarn({ event: "partner onboarding denied", route: ROUTE, outcome: "forbidden", error });
      return (
        <Shell>
          <h1 className="text-2xl font-black">Onboarding</h1>
          <p className="mt-3 text-sm text-[#5C5750]">Your account does not have an active partner identity.</p>
        </Shell>
      );
    }
    throw error;
  }

  let onboarding: PartnerFacingOnboarding | null = null;
  try {
    onboarding = await getOnboardingForPartner(partnerSlug);
  } catch {
    return (
      <Shell>
        <h1 className="text-2xl font-black">Onboarding</h1>
        <p className="mt-3 text-sm text-[#5C5750]">
          Your onboarding hasn&rsquo;t started yet. Your LegalEase contact will set things up and share your tasks here.
        </p>
      </Shell>
    );
  }

  const { PartnerOnboardingChecklist } = await import("./PartnerOnboardingChecklist");
  return (
    <Shell>
      <div className="mb-6">
        <Link href="/partner/dashboard" className="text-sm font-semibold text-[#1D9E75] hover:text-[#0F1E3D]">Back to dashboard</Link>
      </div>
      <h1 className="text-3xl font-black">Getting {onboarding.organizationName} ready</h1>
      <p className="mb-6 mt-2 max-w-2xl text-sm text-[#5C5750]">
        Here&rsquo;s where things stand and what we need from you. Packet credits are only used when Expungement.ai
        successfully generates a personalized record-clearing packet.
      </p>
      <PartnerOnboardingChecklist initial={onboarding} />
    </Shell>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <main className="min-h-screen bg-[#f7f8f6] text-[#0F1E3D]">
      <div className="mx-auto max-w-4xl px-4 py-10 md:px-6">{children}</div>
    </main>
  );
}
