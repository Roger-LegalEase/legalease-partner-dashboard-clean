import { ManagedProgramEditor } from "@/components/partners/onboarding/ManagedProgramEditor";
import { LaunchSimulation } from "@/components/partners/onboarding/LaunchSimulation";
import { isDisposableLaunchEnvironment } from "@/lib/partners/onboarding/synthetic-launch-security";
import { StudioSection } from "@/components/partners/onboarding/StudioSection";
import {AssetReviewControl} from "./AssetReviewControl";
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
import { getInternalLaunchReadiness } from "@/lib/partners/onboarding/launch-readiness-service";
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
    let launchPrep: Awaited<ReturnType<typeof getInternalLaunchReadiness>> | null = null;
    let phase1LoadError: string | null = null;
    let launchPrepLoadError: string | null = null;
    let prefillLoadError: string | null = null;
    try {
      const context = await requireInternalOnboardingContext(partnerSlug);
      phase1Snapshot = await getInternalOnboardingSnapshot(context);
      if (phase1Snapshot.workspace && isRcapOnboardingLaunchPrepEnabled()) {
        // One call: readiness carries the artifact board it was derived from,
        // so the page does not read the same source twice.
        try {
          launchPrep = await getInternalLaunchReadiness(context);
        } catch {
          launchPrepLoadError = "The review package could not be loaded. Reload to retry.";
        }
      }
      // Readiness can record a state transition. Read editors after that write
      // so their optimistic versions describe the page the operator receives.
      phase1Snapshot = await getInternalOnboardingSnapshot(context);
      if (phase1Snapshot.workspace && isRcapOnboardingPrefillEnabled()) {
        try {
          prefillSnapshot = await getInternalPrefillSnapshot(context);
        } catch {
          prefillLoadError = "Program information could not be loaded. Reload to retry.";
        }
      }
    } catch {
      phase1LoadError = "This partner program could not be loaded. Reload to retry.";
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
              RCAP Partner Launch Studio
            </p>
            <h1 className="mt-2 text-3xl font-black">Prepare your partner program</h1>

            <p className="mt-2 text-sm text-grayWilma-700">
              Partner: <span className="font-semibold">{String(prefillSnapshot?.currentValues?.public_organization_name ?? prefillSnapshot?.currentValues?.legal_organization_name ?? "Partner program")}</span>
            </p>
          </header>
            <nav aria-label="Launch Studio tasks" className="sticky top-0 z-[60] mt-5 flex flex-wrap gap-3 border-b bg-[#f7f8f6] py-3">
              <Link href="/internal/partners/onboarding" className="inline-flex min-h-11 items-center rounded-md border px-4 font-bold">Create / resume partner</Link>
              <a href="#prefill-heading" className="inline-flex min-h-11 items-center rounded-md border px-4 font-bold">Configure program</a>
              <a href="#launch-prep-area-co_branded_page" className="inline-flex min-h-11 items-center rounded-md border px-4 font-bold">Preview</a>
              <a href="#launch-prep-area-artifacts" className="inline-flex min-h-11 items-center rounded-md border px-4 font-bold">Review</a>
              <a href="#launch-prep-area-launch_readiness" className="inline-flex min-h-11 items-center rounded-md bg-navy px-4 font-bold text-white">Launch</a>
            </nav>

          {phase1LoadError || !phase1Snapshot ? (
            <p className="mt-6 rounded-md border border-orange/30 bg-orange/10 px-4 py-3 text-sm font-semibold text-orange">
              {phase1LoadError ?? "This partner program was not found."}
            </p>
          ) : (
            <>
              <StudioSection stage="configure">
                {prefillSnapshot ? <ManagedProgramEditor partnerSlug={partnerSlug} snapshot={prefillSnapshot} /> : null}
                <Link href={`/internal/clinic?partner=${encodeURIComponent(partnerSlug)}`} className="mt-6 inline-flex min-h-11 items-center rounded-md border border-teal px-5 font-bold text-teal">Configure clinic events</Link>
                {prefillLoadError ? <p role="status" className="mt-6 text-sm text-orange">{prefillLoadError}</p> : null}
                {launchPrepLoadError ? <p role="status" className="mt-6 text-sm text-orange">{launchPrepLoadError}</p> : null}
                <details id="setup-review" className="mt-6 rounded-xl border bg-white p-6">
                  <summary className="min-h-11 cursor-pointer font-bold">Funding, agreements, and administrative settings</summary>
                  <Phase1InternalReviewPanel partnerSlug={partnerSlug} snapshot={phase1Snapshot} launchPreparation={launchPrep ? { href: "#launch-prep-area-artifacts" } : undefined} />
                  <AssetReviewControl partnerSlug={partnerSlug} assets={phase1Snapshot.assets} />
                  {launchPrep?.board.legalEasePageConfiguration ? <LegalEasePublicPageLanguagePanel partnerSlug={partnerSlug} configuration={launchPrep.board.legalEasePageConfiguration} /> : null}
                  {launchPrep?.program ? <details className="mt-6"><summary className="cursor-pointer font-bold">Administrative diagnostics</summary>
                    <p>{launchPrep.program.funding.explanation}</p>
                    <p>Recorded payment: {launchPrep.program.funding.paymentStatus ?? "Unavailable"}. Screening allowance: {launchPrep.program.screeningAllowance.value ?? "Not configured"}. Packet allowance: {launchPrep.program.packetAllowance.value ?? "Not configured"}.</p>
                    {launchPrep.program.discrepancies.map(detail => <p key={detail}>{detail}</p>)}
                  </details> : null}
                </details>
                <details className="mt-6"><summary className="min-h-11 cursor-pointer font-bold">Preparation history and corrections</summary>
                  {prefillSnapshot ? <Phase1PrefillPanel key={prefillSnapshot.workspace?.aggregateVersion} partnerSlug={partnerSlug} snapshot={prefillSnapshot} /> : null}
                </details>
              </StudioSection>
              <StudioSection stage="materials">
              {launchPrep ? (
                <Phase2AArtifactsPanel
                  key={launchPrep.board.workspaceVersion}
                  partnerSlug={partnerSlug}
                  board={launchPrep.board}
                  readiness={launchPrep.readiness}
                  unifiedNavigation
                  launchSimulation={isDisposableLaunchEnvironment() ? <LaunchSimulation partnerSlug={partnerSlug} /> : undefined}
                />
              ) : null}
              </StudioSection>
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
