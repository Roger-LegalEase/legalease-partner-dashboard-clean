import Link from "next/link";
import { InternalAdminDenied, resolveInternalAdminPageAccess } from "@/lib/partners/internal-admin-gate";
import { getOnboarding, startOnboardingForExistingPartner, statusLabel, type PartnerOnboardingView } from "@/lib/partners/partner-onboarding";
import { OnboardingWizard } from "./OnboardingWizard";

export const dynamic = "force-dynamic";

export default async function OnboardingDetailPage({ params }: { params: Promise<{ partnerSlug: string }> }) {
  const { partnerSlug } = await params;
  const access = await resolveInternalAdminPageAccess(`/internal/partners/onboarding/${partnerSlug}`);
  if (access.kind === "denied") {
    return <InternalAdminDenied title={access.title} body={access.body} />;
  }

  let onboarding: PartnerOnboardingView | null = null;
  let loadError: string | null = null;
  try {
    onboarding = await getOnboarding(partnerSlug);
  } catch {
    // The partner may exist but not yet have an onboarding record; start it.
    try {
      onboarding = await startOnboardingForExistingPartner(partnerSlug);
    } catch {
      loadError = "This partner could not be loaded for onboarding.";
    }
  }

  return (
    <main className="min-h-screen bg-[#f7f8f6] text-[#0F1E3D]">
      <div className="mx-auto max-w-5xl px-4 py-10 md:px-6">
        <Link href="/internal/partners/onboarding" className="text-sm font-semibold text-[#1D9E75] hover:text-[#0F1E3D]">
          Back to onboarding
        </Link>

        {loadError || !onboarding ? (
          <p className="mt-6 rounded-md border border-[#F3C9B8] bg-[#FDF1E8] px-4 py-3 text-sm text-[#9A3412]">{loadError ?? "Not found."}</p>
        ) : (
          <>
            <header className="mb-6 mt-4">
              <h1 className="text-3xl font-black">{onboarding.organizationName}</h1>
              <p className="mt-1 text-sm text-[#5C5750]">
                Page address: <span className="font-mono">/p/{onboarding.partnerSlug}</span> · Status:{" "}
                <span className="font-bold">{statusLabel(onboarding.status)}</span>
              </p>
              <p className="mt-1 text-sm text-[#5C5750]">
                Packet Cap {onboarding.packetCap} · Packets Used {onboarding.packetsUsed} · Remaining Packets {onboarding.remainingPackets}
                {onboarding.overageEnabled ? ` · Overage on ($${(onboarding.overagePacketPriceCents / 100).toFixed(0)}/packet)` : ""}
                {onboarding.pauseAtCap ? " · Pauses at cap" : ""}
              </p>
            </header>
            <OnboardingWizard onboarding={onboarding} />
          </>
        )}
      </div>
    </main>
  );
}
