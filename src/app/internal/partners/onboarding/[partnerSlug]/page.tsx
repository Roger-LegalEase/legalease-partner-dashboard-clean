import Link from "next/link";
import { InternalAdminDenied, resolveInternalAdminPageAccess } from "@/lib/partners/internal-admin-gate";
import { getOnboarding, startOnboardingForExistingPartner, statusLabel, type PartnerOnboardingView } from "@/lib/partners/partner-onboarding";
import { requireInternalOnboardingContext } from "@/lib/partners/onboarding/auth-context";
import {
  isRcapOnboardingLaunchPrepEnabled,
  isRcapOnboardingPrefillEnabled,
  isRcapPartnerOnboardingEnabled
} from "@/lib/partners/onboarding/feature";
import { getInternalPrefillSnapshot } from "@/lib/partners/onboarding/prefill-service";
import { getInternalArtifactBoard } from "@/lib/partners/onboarding/artifact-service";
import { getInternalOnboardingSnapshot } from "@/lib/partners/onboarding/service";
import { Phase1InternalReviewPanel } from "./Phase1InternalReviewPanel";
import { Phase1PrefillPanel } from "./Phase1PrefillPanel";
import { Phase2AArtifactsPanel } from "./Phase2AArtifactsPanel";
import { LegalEasePublicPageLanguagePanel } from "./LegalEasePublicPageLanguagePanel";
import { OnboardingWizard } from "./OnboardingWizard";

export const dynamic = "force-dynamic";

export default async function OnboardingDetailPage({ params }: { params: Promise<{ partnerSlug: string }> }) {
  const { partnerSlug } = await params;
  const access = await resolveInternalAdminPageAccess(`/internal/partners/onboarding/${partnerSlug}`);
  if (access.kind === "denied") {
    return <InternalAdminDenied title={access.title} body={access.body} />;
  }

  if (isRcapPartnerOnboardingEnabled()) {
    let phase1Snapshot: Awaited<ReturnType<typeof getInternalOnboardingSnapshot>> | null = null;
    let prefillSnapshot: Awaited<ReturnType<typeof getInternalPrefillSnapshot>> | null = null;
    let artifactBoard: Awaited<ReturnType<typeof getInternalArtifactBoard>> | null = null;
    let phase1LoadError: string | null = null;
    try {
      const context = await requireInternalOnboardingContext(partnerSlug);
      phase1Snapshot = await getInternalOnboardingSnapshot(context);
      if (isRcapOnboardingPrefillEnabled()) {
        prefillSnapshot = await getInternalPrefillSnapshot(context);
      }
      if (isRcapOnboardingLaunchPrepEnabled()) {
        artifactBoard = await getInternalArtifactBoard(context);
      }
    } catch {
      phase1LoadError = "The Phase 1 onboarding workspace could not be loaded.";
    }

    return (
      <main className="min-h-screen bg-[#f7f8f6] text-navy">
        <div className="mx-auto max-w-7xl px-4 py-10 md:px-6">
          <Link
            href="/internal/partners/onboarding"
            className="inline-flex min-h-11 items-center text-sm font-semibold text-teal hover:text-navy"
          >
            Back to onboarding
          </Link>
          <header className="mt-4">
            <p className="text-xs font-black uppercase tracking-wide text-orange">
              RCAP Partner Onboarding · Phase 1
            </p>
            <h1 className="mt-2 text-3xl font-black">Internal onboarding review</h1>
            <p className="mt-2 text-sm text-grayWilma-700">
              Partner: <span className="font-mono font-semibold">{partnerSlug}</span>
            </p>
          </header>

          {phase1LoadError || !phase1Snapshot ? (
            <p className="mt-6 rounded-md border border-orange/30 bg-orange/10 px-4 py-3 text-sm font-semibold text-orange">
              {phase1LoadError ?? "The Phase 1 workspace was not found."}
            </p>
          ) : (
            <>
              <Phase1InternalReviewPanel
                partnerSlug={partnerSlug}
                snapshot={phase1Snapshot}
              />
              {prefillSnapshot ? (
                <Phase1PrefillPanel
                  partnerSlug={partnerSlug}
                  snapshot={prefillSnapshot}
                />
              ) : null}
              {artifactBoard?.legalEasePageConfiguration ? (
                <LegalEasePublicPageLanguagePanel
                  partnerSlug={partnerSlug}
                  configuration={artifactBoard.legalEasePageConfiguration}
                />
              ) : null}
              {artifactBoard ? (
                <Phase2AArtifactsPanel
                  partnerSlug={partnerSlug}
                  board={artifactBoard}
                />
              ) : null}
            </>
          )}
        </div>
      </main>
    );
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
