import Link from "next/link";
import { redirect } from "next/navigation";
import { logSecurityWarn } from "@/lib/observability/logger";
import { resolveSessionPartner, SessionPartnerError } from "@/lib/partners/session-partner";
import { getOnboardingForPartner, type PartnerFacingOnboarding } from "@/lib/partners/partner-onboarding";
import { isRcapPartnerOnboardingEnabled } from "@/lib/partners/onboarding/feature";
import { requirePartnerOnboardingContext } from "@/lib/partners/onboarding/auth-context";
import {
  getPartnerOnboardingPortal,
  type PartnerOnboardingPortal
} from "@/lib/partners/onboarding/service";
import { Phase1OnboardingHome } from "./Phase1OnboardingHome";

export const dynamic = "force-dynamic";

const ROUTE = "/partner/onboarding";

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

async function Phase1PartnerOnboardingPage() {
  let portal: Awaited<ReturnType<typeof getPartnerOnboardingPortal>>;
  try {
    const context = await requirePartnerOnboardingContext();
    portal = await getPartnerOnboardingPortal(context);
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
    return (
      <Shell>
        <h1 className="text-2xl font-black">Program setup</h1>
        <p className="mt-3 text-sm text-[#5C5750]">
          Program setup is not available for this account. Contact your existing LegalEase support channel if you expected access.
        </p>
      </Shell>
    );
  }
  const nextSection = portal.derivation.nextSectionKey;
  const reviewReady =
    portal.derivation.nextActionCode === "submit_for_review" ||
    portal.workspace.status === "ready_for_review";
  const dominantHref = reviewReady
    ? "/partner/onboarding/review"
    : nextSection
      ? `/partner/onboarding/${nextSection}`
      : "/partner/onboarding/review";

  return (
    <Shell wide>
      <Phase1OnboardingHome
        organizationName={portal.organizationName}
        programName={portal.programName}
        status={portal.workspace.status}
        statusLabel={workspaceStatusLabel(portal.workspace.status)}
        completionPercentage={portal.workspace.completionPercentage}
        targetLaunchDate={portal.workspace.targetLaunchDate}
        blockerCopy={portal.workspace.blockerCopy}
        nextActionCopy={portal.workspace.nextActionCopy}
        nextActionOwner={ownerLabel(portal.workspace.nextActionOwner)}
        dominantHref={dominantHref}
        dominantLabel={
          portal.role === "partner_staff"
            ? "View setup"
            : portal.canEdit
              ? reviewReady
                ? "Review and submit"
                : "Continue setup"
              : "View setup"
        }
        canEdit={portal.canEdit}
        isPartnerStaff={portal.role === "partner_staff"}
        sections={portal.sections.map((section) => ({
          key: section.key,
          title: section.title,
          status: section.status,
          statusLabel: sectionStatusLabel(section.status),
          missingSummary: sectionSummary(section, portal)
        }))}
        commercial={commercialSummary(portal)}
        agreements={portal.agreements.map((agreement) => ({
          label: agreementLabel(agreement.type),
          statusLabel: enumLabel(agreement.status),
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
      />
    </Shell>
  );
}

function Shell({ children, wide = false }: { children: React.ReactNode; wide?: boolean }) {
  return (
    <main className="min-h-screen bg-[#f7f8f6] text-[#0F1E3D]">
      <div className={`mx-auto px-4 py-10 md:px-6 ${wide ? "max-w-7xl" : "max-w-4xl"}`}>{children}</div>
    </main>
  );
}

function workspaceStatusLabel(status: string) {
  const labels: Record<string, string> = {
    draft: "Draft",
    commercially_blocked: "Commercial step required",
    setup_in_progress: "Setup in progress",
    waiting_on_partner: "Updates requested",
    ready_for_review: "Awaiting LegalEase review",
    ready_to_launch: "Ready for launch preparation",
    live: "Live",
    paused: "Paused",
    closed: "Closed"
  };
  return labels[status] ?? "Program setup";
}

function sectionStatusLabel(status: string) {
  const labels: Record<string, string> = {
    not_started: "Not started",
    in_progress: "In progress",
    submitted: "Submitted",
    needs_changes: "Needs changes",
    approved: "Approved",
    waived: "Waived",
    not_applicable: "Not applicable"
  };
  return labels[status] ?? "Pending";
}

function ownerLabel(owner: "partner" | "legalease" | "none") {
  if (owner === "partner") return "Your organization";
  if (owner === "legalease") return "LegalEase";
  return "No action needed";
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

function agreementLabel(type: string) {
  const labels: Record<string, string> = {
    order_form: "Order Form",
    master_services_agreement: "Master Services Agreement",
    data_privacy_security_addendum: "Data / Privacy / Security Addendum",
    procurement_requirements: "Procurement requirements"
  };
  return labels[type] ?? "Agreement";
}

function enumLabel(value: string) {
  return value
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}
