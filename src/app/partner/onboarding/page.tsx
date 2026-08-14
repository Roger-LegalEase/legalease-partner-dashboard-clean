import Link from "next/link";
import { IBM_Plex_Mono, Inter } from "next/font/google";
import { redirect } from "next/navigation";
import { logSecurityWarn } from "@/lib/observability/logger";
import { resolveSessionPartner, SessionPartnerError } from "@/lib/partners/session-partner";
import { getOnboardingForPartner, type PartnerFacingOnboarding } from "@/lib/partners/partner-onboarding";
import {
  isRcapOnboardingLaunchPrepEnabled,
  isRcapPartnerOnboardingEnabled
} from "@/lib/partners/onboarding/feature";
import { requirePartnerOnboardingContext } from "@/lib/partners/onboarding/auth-context";
import {
  getPartnerOnboardingPortal,
  type PartnerOnboardingPortal
} from "@/lib/partners/onboarding/service";
import {
  agreementStatusLabel,
  agreementTypeLabel
} from "@/lib/partners/onboarding/partner-labels";
import { getPartnerLaunchReadiness } from "@/lib/partners/onboarding/launch-readiness-service";
import { buildPartnerImplementationPresentation } from "@/lib/partners/onboarding/implementation-presentation";
import {
  guidedSectionResumeHref,
  resolveGuidedStep
} from "@/lib/partners/onboarding/guided-substeps";
import {
  getPartnerSupportContact,
  partnerSupportMailto
} from "@/lib/partners/onboarding/support-contact";
import { PartnerSupportLink } from "./PartnerSupportLink";
import { Phase1OnboardingHome } from "./Phase1OnboardingHome";

export const dynamic = "force-dynamic";

const ROUTE = "/partner/onboarding";
const rcapInter = Inter({
  subsets: ["latin"],
  variable: "--font-rcap-inter",
  display: "swap"
});
const rcapMono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-rcap-mono",
  display: "swap"
});

export default async function PartnerOnboardingPage() {
  if (isRcapPartnerOnboardingEnabled()) {
    return Phase1PartnerOnboardingPage();
  }

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
      const support = getPartnerSupportContact();
      return (
        <Shell>
          <h1 className="text-2xl font-black">Onboarding</h1>
          <p className="mt-3 text-sm leading-6 text-[#5C5750]">
            Your account does not have an active partner identity, so there is no onboarding to
            show yet.
          </p>
          <p className="mt-3 break-words text-sm leading-6 text-[#5C5750]">
            If you expected access, email LegalEase partner support at{" "}
            <PartnerSupportLink
              contact={support}
              href={partnerSupportMailto({ subject: "Partner account access" })}
            />
            . <span className="text-[#8A8278]">Opens your email app.</span>
          </p>
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

async function Phase1PartnerOnboardingPage() {
  let portal: Awaited<ReturnType<typeof getPartnerOnboardingPortal>>;
  let readinessView: Awaited<ReturnType<typeof getPartnerLaunchReadiness>> | null = null;
  try {
    const context = await requirePartnerOnboardingContext();
    [portal, readinessView] = await Promise.all([
      getPartnerOnboardingPortal(context),
      isRcapOnboardingLaunchPrepEnabled()
        ? getPartnerLaunchReadiness(context)
        : Promise.resolve(null)
    ]);
  } catch (error) {
    if (
      error instanceof SessionPartnerError &&
      error.code === "unauthenticated"
    ) {
      redirect(`/sign-in?next=${ROUTE}`);
    }
    if (
      error &&
      typeof error === "object" &&
      "code" in error &&
      error.code === "unauthenticated"
    ) {
      redirect(`/sign-in?next=${ROUTE}`);
    }
    logSecurityWarn({
      event: "partner onboarding phase1 denied",
      route: ROUTE,
      outcome: "unavailable",
      error
    });
    const support = getPartnerSupportContact();
    return (
      <Shell>
        <h1 className="text-2xl font-black">Program setup</h1>
        <p className="mt-3 text-sm leading-6 text-[#5C5750]">
          Program setup is not available for this account. Nothing you entered has been lost.
          This usually means your account is not yet linked to a partner organization.
        </p>
        <p className="mt-3 break-words text-sm leading-6 text-[#5C5750]">
          If you expected access, email LegalEase partner support at{" "}
          <PartnerSupportLink
            contact={support}
            href={partnerSupportMailto({ subject: "Program setup access" })}
          />
          . <span className="text-[#8A8278]">Opens your email app.</span>
        </p>
      </Shell>
    );
  }
  const nextSection = portal.derivation.nextSectionKey;
  const reviewReady =
    portal.derivation.nextActionCode === "submit_for_review" ||
    portal.workspace.status === "ready_for_review";
  const guidedSections = new Map(
    portal.sections.map((section) => {
      const activeRequest = section.changeRequests.find(
        (request) =>
          request.status === "open" ||
          request.status === "partner_responded"
      );
      const resolutionInput = {
        sectionKey: section.key,
        requestedStep: null,
        missingRequiredKeys: section.missingRequiredKeys,
        pendingPrefillFieldKeys: section.pendingPrefillFieldKeys,
        changeRequest: activeRequest
          ? {
              status: activeRequest.status,
              targetFieldKey: activeRequest.targetFieldKey
            }
          : null,
        canEdit: portal.canEdit
      } as const;
      return [
        section.key,
        {
          href: guidedSectionResumeHref(resolutionInput),
          resolution: resolveGuidedStep(resolutionInput)
        }
      ] as const;
    })
  );
  const dominantHref = reviewReady
    ? "/partner/onboarding/review"
    : nextSection
      ? guidedSections.get(nextSection)?.href ??
        `/partner/onboarding/${nextSection}`
      : "/partner/onboarding/review";
  const dominantLabel =
    portal.role === "partner_staff"
      ? "View setup"
      : portal.canEdit
        ? reviewReady
          ? "Review and submit"
          : "Continue setup"
        : "View setup";
  const coBrandedPageArtifact = readinessView?.board.entries.find(
    (entry) => entry.artifactType === "co_branded_page_configuration"
  );
  const presentation = buildPartnerImplementationPresentation({
    workspaceStatus: portal.workspace.status,
    completionPercentage: portal.workspace.completionPercentage,
    commercialGateStatus: portal.workspace.commercialGateStatus,
    commercialGateChangedAt: portal.workspace.commercialGateChangedAt,
    submittedAt: portal.workspace.submittedAt,
    internalApprovedAt: portal.workspace.internalApprovedAt,
    launchedAt: portal.workspace.launchedAt,
    pausedAt: portal.workspace.pausedAt,
    closedAt: portal.workspace.closedAt,
    lastMeaningfulActivityAt: portal.workspace.lastMeaningfulActivityAt,
    targetLaunchDate: portal.workspace.targetLaunchDate,
    blockerCopy: portal.workspace.blockerCopy,
    nextActionCopy: portal.workspace.nextActionCopy,
    nextActionOwner: portal.workspace.nextActionOwner,
    defaultActionHref: dominantHref,
    defaultActionLabel: dominantLabel,
    currentRole: portal.role,
    canEdit: portal.canEdit,
    sections: portal.sections.map((section) => ({
      key: section.key,
      title: section.title,
      status: section.status,
      missingSummary: sectionSummary(section, portal),
      hasPendingPrefill: section.hasPendingPrefill,
      changeRequestStatus: section.changeRequestStatus,
      submittedAt: section.submittedAt,
      approvedAt: section.approvedAt,
      updatedAt: section.updatedAt,
      resumeHref: guidedSections.get(section.key)?.href,
      currentSubstepTitle:
        guidedSections.get(section.key)?.resolution.requestOverview
          ? "LegalEase requested update"
          : guidedSections.get(section.key)?.resolution.substep.title ?? null
    })),
    teamMembers: portal.teamMembers.map((member) => ({
      requestedRole: member.requestedRole,
      trainingStatus: member.trainingStatus,
      trainingCompletedAt: member.trainingCompletedAt,
      invitationStatus: member.invitationStatus,
      membershipStatus: member.membershipStatus,
      updatedAt: member.updatedAt
    })),
    readiness: readinessView
      ? {
          ready: readinessView.readiness.ready,
          blockingFailures: readinessView.readiness.blockingFailures,
          primaryNextAction: readinessView.readiness.primaryNextAction
        }
      : null,
    coBrandedPageArtifact: coBrandedPageArtifact
      ? {
          available: coBrandedPageArtifact.available,
          approvalStatus:
            coBrandedPageArtifact.currentVersion?.approvalStatus ?? null,
          partnerReviewStatus:
            coBrandedPageArtifact.currentVersion?.partnerReviewStatus ?? null
        }
      : null
  });

  return (
    <Shell wide>
      <Phase1OnboardingHome
        organizationName={portal.organizationName}
        programName={portal.programName}
        implementationOwner={null}
        presentation={presentation}
        isPartnerStaff={portal.role === "partner_staff"}
        hasPendingPrefill={portal.prefill.pendingCount > 0}
        commercial={commercialSummary(portal)}
        agreements={portal.agreements.map((agreement) => ({
          label: agreementTypeLabel(agreement.type),
          statusLabel: agreementStatusLabel(agreement.status),
          detail: agreement.partnerSafeDetail,
          downloadHref:
            agreement.finalizedAssetId &&
            ["finalized", "executed", "approved"].includes(agreement.status)
              ? `/api/partners/onboarding/assets/${agreement.finalizedAssetId}`
              : null
        }))}
        activity={portal.activity.map((activity) => ({
          id: activity.id,
          label: activity.label,
          createdAt: activity.occurredAt
        }))}
        support={getPartnerSupportContact()}
        supportHref={partnerSupportMailto({
          organizationName: portal.organizationName,
          subject: portal.workspace.blockerCopy ? "Setup question" : null
        })}
      />
    </Shell>
  );
}

function Shell({ children, wide = false }: { children: React.ReactNode; wide?: boolean }) {
  return (
    <main
      className={`${rcapInter.variable} ${rcapMono.variable} min-h-screen break-words bg-[#F7F4EE] text-[#071B33] [font-family:var(--font-rcap-inter)]`}
    >
      <div className={`mx-auto px-4 py-10 md:px-6 ${wide ? "max-w-7xl" : "max-w-4xl"}`}>{children}</div>
    </main>
  );
}

function sectionSummary(
  section: PartnerOnboardingPortal["sections"][number],
  portal: PartnerOnboardingPortal
) {
  if (section.changeRequestStatus === "partner_responded") {
    return "Your updates are awaiting LegalEase review.";
  }
  if (section.changeRequestStatus === "open") {
    return "LegalEase requested an update in this section.";
  }
  const missing = portal.derivation.completion.missingRequirements.filter(
    (requirement) => requirement.sectionKey === section.key
  );
  if (missing.length === 0) return null;
  if (missing.length === 1) return `Missing: ${missing[0].label}`;
  return `${missing.length} required items remain`;
}

function commercialSummary(portal: PartnerOnboardingPortal) {
  if (portal.workspace.commercialGateStatus === "blocked") {
    return {
      label: "Commercial step required",
      blocked: true,
      detail:
        "Setup editing will open after the authoritative billing or procurement requirement is cleared. Your organization cannot change this status here."
    };
  }
  return {
    label: "Cleared for setup",
    blocked: false,
    detail:
      "LegalEase recorded the applicable paid invoice, approved purchase order, or authorized internal clearance."
  };
}
