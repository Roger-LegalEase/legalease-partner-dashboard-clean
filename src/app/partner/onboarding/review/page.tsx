import { notFound, redirect } from "next/navigation";
import { requirePartnerOnboardingContext } from "@/lib/partners/onboarding/auth-context";
import { isFieldActive } from "@/lib/partners/onboarding/derivations";
import { isRcapPartnerOnboardingEnabled } from "@/lib/partners/onboarding/feature";
import {
  getOnboardingFieldsForSection
} from "@/lib/partners/onboarding/schema";
import { getPartnerOnboardingPortal } from "@/lib/partners/onboarding/service";
import {
  sectionStatusLabel,
  workspaceStatusLabel
} from "@/lib/partners/onboarding/partner-labels";
import {
  getPartnerSupportContact,
  partnerSupportMailto
} from "@/lib/partners/onboarding/support-contact";
import type {
  OnboardingPartnerData,
  OnboardingSectionKey
} from "@/lib/partners/onboarding/types";
import {
  OnboardingReviewClient,
  type OnboardingReviewField
} from "./OnboardingReviewClient";

export const dynamic = "force-dynamic";
export const revalidate = 0;

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
  const sections = portal.sections.map((section) => ({
    key: section.key,
    title: section.title,
    status: section.status,
    statusLabel: sectionStatusLabel(section.status),
    editHref: `/partner/onboarding/${section.key}`,
    fields: reviewFields(
      section.key,
      portal.data,
      new Set(
        missing
          .filter((item) => item.sectionKey === section.key)
          .map((item) => item.fieldKey)
      ),
      {
        procurementRequired: portal.procurementRequired,
        recordShieldInScope: portal.recordShieldInScope,
        overageApprovalRequired: portal.overageApprovalRequired
      }
    ),
    missingItems: missing
      .filter((item) => item.sectionKey === section.key)
      .map((item) => ({
        fieldKey: item.fieldKey,
        label: item.label
      })),
    changeRequestInstructions: section.changeRequestInstructions.length
      ? section.changeRequestInstructions.join("\n\n")
      : null,
    changeRequestStatus: section.changeRequestStatus
    ,
    hasPendingPrefill: section.hasPendingPrefill
  }));
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

  return (
    <main className="min-h-screen bg-[#FBF7F2] px-4 py-8 md:px-6 md:py-10">
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
      value: reviewValue(sectionData[field.dataKey]),
      missing: missingFieldKeys.has(String(field.key))
    }));
}

function reviewValue(value: unknown): string | number | boolean | null | string[] {
  if (value === null || value === undefined) return null;
  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
    return value;
  }
  if (Array.isArray(value)) {
    return value.map((entry) => {
      if (typeof entry === "string") return entry;
      if (entry && typeof entry === "object") {
        const row = entry as Record<string, unknown>;
        return [
          row.role,
          row.name,
          row.work_email,
          row.requested_role
        ]
          .filter((part): part is string => typeof part === "string" && part.length > 0)
          .join(" · ");
      }
      return String(entry);
    });
  }
  return "Saved";
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
