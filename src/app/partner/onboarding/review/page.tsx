import { notFound, redirect } from "next/navigation";
import { IBM_Plex_Mono, Inter } from "next/font/google";
import { requirePartnerOnboardingContext } from "@/lib/partners/onboarding/auth-context";
import { isFieldActive } from "@/lib/partners/onboarding/derivations";
import { isRcapPartnerOnboardingEnabled } from "@/lib/partners/onboarding/feature";
import {
  getOnboardingFieldsForSection
} from "@/lib/partners/onboarding/schema";
import { getPartnerOnboardingPortal } from "@/lib/partners/onboarding/service";
import {
  workspaceStatusLabel,
  onboardingOptionLabel
} from "@/lib/partners/onboarding/partner-labels";
import { buildPartnerImplementationPresentation } from "@/lib/partners/onboarding/implementation-presentation";
import {
  guidedChangeRequestHref,
  guidedSectionHref,
  guidedSectionResumeHref,
  guidedSubstepForField,
  slugFieldKey
} from "@/lib/partners/onboarding/guided-substeps";
import {
  getPartnerSupportContact,
  partnerSupportMailto
} from "@/lib/partners/onboarding/support-contact";
import type {
  OnboardingPartnerData,
  OnboardingSectionKey,
  OnboardingFieldDefinition
} from "@/lib/partners/onboarding/types";
import {
  OnboardingReviewClient,
  type OnboardingReviewField,
  type OnboardingReviewSectionState
} from "./OnboardingReviewClient";

export const dynamic = "force-dynamic";
export const revalidate = 0;
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

export default async function PartnerOnboardingReviewPage() {
  if (!isRcapPartnerOnboardingEnabled()) notFound();
  let portal: Awaited<ReturnType<typeof getPartnerOnboardingPortal>>;
  try {
    const context = await requirePartnerOnboardingContext();
    portal = await getPartnerOnboardingPortal(context);
  } catch (error) {
    if (isUnauthenticated(error)) {
      redirect("/sign-in?next=/partner/onboarding/review");
    }
    throw error;
  }
  const missing = portal.derivation.completion.missingRequirements;
  const sections = portal.sections.map((section) => {
    const activeRequest = section.changeRequests.find(
      (request) =>
        request.status === "open" || request.status === "partner_responded"
    );
    const missingItems = missing.filter(
      (item) => item.sectionKey === section.key
    );
    const changedSinceReview = hasChangedSinceReview(section);
    const editHref = activeRequest?.status === "open"
      ? guidedChangeRequestHref({
          sectionKey: section.key,
          targetFieldKey: activeRequest.targetFieldKey
        })
      : guidedSectionResumeHref({
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
        });
    return {
      key: section.key,
      title: section.title,
      state: reviewSectionState(section, missingItems.length, changedSinceReview),
      editHref,
      fields: reviewFields(
      section.key,
      portal.data,
      new Set(
        missingItems.map((item) => item.fieldKey)
      ),
      {
        procurementRequired: portal.procurementRequired,
        recordShieldInScope: portal.recordShieldInScope,
        overageApprovalRequired: portal.overageApprovalRequired
      }
    ),
      missingItems: missingItems.map((item) => ({
        fieldKey: item.fieldKey,
        label: item.label,
        href: guidedFieldHref(section.key, item.fieldKey)
      })),
      openChangeRequests: section.changeRequests.filter(
        (request) => request.status === "open"
      ).length,
      waitingChangeRequests: section.changeRequests.filter(
        (request) => request.status === "partner_responded"
      ).length,
      resolvedChangeRequests: section.changeRequests.filter(
        (request) => request.status === "resolved"
      ).length,
      hasPendingPrefill: section.hasPendingPrefill,
      completionPercentage: section.completionPercentage,
      lastUpdatedAt: section.updatedAt,
      submittedAt: section.submittedAt,
      approvedAt: section.approvedAt,
      approvalSatisfied: ["approved", "waived", "not_applicable"].includes(
        section.status
      ),
      changedSinceReview
    };
  });
  const canSubmit =
    portal.canEdit &&
    portal.workspace.commercialGateStatus !== "blocked" &&
    portal.workspace.status === "setup_in_progress" &&
    portal.prefill.pendingCount === 0 &&
    portal.sections.every(
      (section) =>
        ["submitted", "approved", "waived", "not_applicable"].includes(
          section.status
        ) &&
        (section.completionPercentage === 100 ||
          ["waived", "not_applicable"].includes(section.status))
    ) &&
    portal.derivation.nextActionCode === "submit_for_review";
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
    defaultActionHref: "/partner/onboarding#program-configuration",
    defaultActionLabel: "Return to implementation center",
    currentRole: portal.role,
    canEdit: portal.canEdit,
    sections: portal.sections.map((section) => ({
      key: section.key,
      title: section.title,
      status: section.status,
      missingSummary:
        section.missingRequiredKeys.length > 0
          ? `${section.missingRequiredKeys.length} required item${section.missingRequiredKeys.length === 1 ? "" : "s"} remain.`
          : null,
      hasPendingPrefill: section.hasPendingPrefill,
      changeRequestStatus: section.changeRequestStatus,
      submittedAt: section.submittedAt,
      approvedAt: section.approvedAt,
      updatedAt: section.updatedAt
    })),
    teamMembers: portal.teamMembers.map((member) => ({
      requestedRole: member.requestedRole,
      trainingStatus: member.trainingStatus,
      trainingCompletedAt: member.trainingCompletedAt,
      invitationStatus: member.invitationStatus,
      membershipStatus: member.membershipStatus,
      updatedAt: member.updatedAt
    })),
    readiness: null,
    coBrandedPageArtifact: null
  });

  return (
    <main className={`${rcapInter.variable} ${rcapMono.variable} min-h-screen break-words bg-[#F7F4EE] px-4 py-8 [font-family:var(--font-rcap-inter)] md:px-6 md:py-10`}>
      <OnboardingReviewClient
        sections={sections}
        canSubmit={canSubmit}
        canEdit={portal.canEdit}
        isPartnerStaff={portal.role === "partner_staff"}
        pendingPrefillSections={portal.prefill.pendingSections.map(
          (key) => portal.sections.find((section) => section.key === key)?.title ?? key
        )}
        initialSubmission={
          portal.workspace.submittedAt &&
          [
            "ready_for_review",
            "ready_to_launch",
            "live",
            "paused",
            "closed"
          ].includes(portal.workspace.status)
            ? {
                submittedAt: portal.workspace.submittedAt,
                statusLabel: workspaceStatusLabel(portal.workspace.status),
                historical: portal.workspace.status !== "ready_for_review"
              }
            : null
        }
        workspaceVersion={portal.workspace.aggregateVersion}
        support={getPartnerSupportContact()}
        supportHref={partnerSupportMailto({
          organizationName: portal.organizationName,
          subject: "Review and submission"
        })}
        statusPresentation={{
          setupInformation: presentation.setupInformation,
          legalEaseReview: presentation.legalEaseReview,
          publication: presentation.publication,
          programActivation: presentation.programActivation
        }}
      />
    </main>
  );
}

function reviewFields(
  sectionKey: OnboardingSectionKey,
  data: OnboardingPartnerData,
  missingFieldKeys: ReadonlySet<string>,
  context: {
    procurementRequired: boolean;
    recordShieldInScope: boolean;
    overageApprovalRequired: boolean;
  }
): OnboardingReviewField[] {
  const sectionData = (data[sectionKey] ?? {}) as Record<string, unknown>;
  return getOnboardingFieldsForSection(sectionKey)
    .filter(
      (field) =>
        field.ownership === "partner_editable" &&
        !field.parentCollection &&
        isFieldActive(field, data, context)
    )
    .map((field) => ({
      fieldKey: String(field.key),
      label: field.label,
      value: reviewValue(field, sectionData[field.dataKey]),
      missing: missingFieldKeys.has(String(field.key))
    }));
}

function reviewValue(
  field: OnboardingFieldDefinition,
  value: unknown
): string | number | boolean | null | string[] {
  if (value === null || value === undefined) return null;
  if (typeof value === "string") {
    return field.dataType === "enum" ? onboardingOptionLabel(value) : value;
  }
  if (typeof value === "number" || typeof value === "boolean") {
    return value;
  }
  if (Array.isArray(value)) {
    return value.map((entry) => {
      if (typeof entry === "string") return entry;
      if (entry && typeof entry === "object") {
        const row = entry as Record<string, unknown>;
        return [
          typeof row.role === "string" ? onboardingOptionLabel(row.role) : row.role,
          row.name,
          row.work_email,
          typeof row.requested_role === "string"
            ? onboardingOptionLabel(row.requested_role)
            : row.requested_role
        ]
          .filter((part): part is string => typeof part === "string" && part.length > 0)
          .join(" | ");
      }
      return String(entry);
    });
  }
  return "Saved";
}

function guidedFieldHref(sectionKey: OnboardingSectionKey, fieldKey: string) {
  const step = guidedSubstepForField(sectionKey, fieldKey);
  return step
    ? guidedSectionHref(
        sectionKey,
        step.id,
        `field-${slugFieldKey(fieldKey)}`
      )
    : `/partner/onboarding/${sectionKey}`;
}

function hasChangedSinceReview(
  section: Awaited<ReturnType<typeof getPartnerOnboardingPortal>>["sections"][number]
) {
  if (!section.reviewedAt) return false;
  const reviewedAt = Date.parse(section.reviewedAt);
  if (!Number.isFinite(reviewedAt)) return false;
  const candidateDates = [
    section.updatedAt,
    ...section.changeRequests.flatMap((request) => [
      request.respondedAt,
      request.resolvedAt
    ])
  ];
  return candidateDates.some(
    (value) => value && Date.parse(value) > reviewedAt
  );
}

function reviewSectionState(
  section: Awaited<ReturnType<typeof getPartnerOnboardingPortal>>["sections"][number],
  missingCount: number,
  changedSinceReview: boolean
): OnboardingReviewSectionState {
  if (
    section.changeRequestStatus === "open" ||
    section.hasPendingPrefill ||
    missingCount > 0 ||
    (section.completionPercentage > 0 && section.completionPercentage < 100)
  ) {
    return "Needs attention";
  }
  if (changedSinceReview) return "Changed since review";
  if (
    section.changeRequestStatus === "partner_responded" ||
    section.status === "submitted"
  ) {
    return "Waiting on LegalEase";
  }
  if (
    section.completionPercentage === 100 ||
    ["approved", "waived", "not_applicable"].includes(section.status)
  ) {
    return "Complete";
  }
  return "Not started";
}

function isUnauthenticated(error: unknown) {
  return (
    error !== null &&
    error !== undefined &&
    typeof error === "object" &&
    "code" in error &&
    error.code === "unauthenticated"
  );
}
