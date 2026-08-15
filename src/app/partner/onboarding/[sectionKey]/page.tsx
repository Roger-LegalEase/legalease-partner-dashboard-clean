import { IBM_Plex_Mono, Inter } from "next/font/google";
import { notFound, redirect } from "next/navigation";
import { isRcapPartnerOnboardingEnabled } from "@/lib/partners/onboarding/feature";
import {
  requirePartnerOnboardingContext,
  type PartnerOnboardingContext
} from "@/lib/partners/onboarding/auth-context";
import { loadPartnerArtifactBoardWithSource } from "@/lib/partners/onboarding/artifact-service";
import { renderCoBrandedPageConfiguration } from "@/lib/partners/onboarding/artifact-generator";
import { getPartnerOnboardingPortal } from "@/lib/partners/onboarding/service";
import { ONBOARDING_JURISDICTIONS } from "@/lib/partners/onboarding/jurisdictions";
import {
  getFieldDefinition,
  ONBOARDING_SCHEMA_REGISTRY,
  ONBOARDING_SECTION_ORDER
} from "@/lib/partners/onboarding/schema";
import { isFieldActive } from "@/lib/partners/onboarding/derivations";
import {
  guidedSectionHref,
  guidedSubstepForField,
  resolveGuidedStep,
  SECTION_CHANGE_REQUEST_STEP
} from "@/lib/partners/onboarding/guided-substeps";
import type {
  OnboardingPartnerData,
  OnboardingReadOnlyValues,
  OnboardingSectionKey
} from "@/lib/partners/onboarding/types";
import {
  OnboardingSectionEditor,
  OnboardingStaffSectionSummary,
  type OnboardingCanonicalReference,
  type OnboardingReadOnlyValue
} from "./OnboardingSectionEditor";
import { onboardingRoleSurface } from "@/lib/partners/onboarding/review-presentation";

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

export default async function PartnerOnboardingSectionPage({
  params,
  searchParams
}: {
  params: Promise<{ sectionKey: string }>;
  searchParams: Promise<{ step?: string | string[] }>;
}) {
  if (!isRcapPartnerOnboardingEnabled()) notFound();
  const { sectionKey: rawSectionKey } = await params;
  if (!(ONBOARDING_SECTION_ORDER as readonly string[]).includes(rawSectionKey)) {
    notFound();
  }
  const sectionKey = rawSectionKey as OnboardingSectionKey;
  const resolvedSearchParams = await searchParams;
  const requestedStep = Array.isArray(resolvedSearchParams.step)
    ? resolvedSearchParams.step[0] ?? null
    : resolvedSearchParams.step ?? null;

  let portal: Awaited<ReturnType<typeof getPartnerOnboardingPortal>>;
  let context: PartnerOnboardingContext;
  try {
    context = await requirePartnerOnboardingContext();
    portal = await getPartnerOnboardingPortal(context);
  } catch (error) {
    if (isUnauthenticated(error)) {
      const next = requestedStep
        ? guidedSectionHref(sectionKey, requestedStep)
        : `/partner/onboarding/${sectionKey}`;
      redirect(
        `/sign-in?next=${encodeURIComponent(next)}`
      );
    }
    throw error;
  }
  const section = portal.sections.find(
    (candidate) => candidate.key === sectionKey
  );
  if (!section) notFound();
  const sectionCanEdit =
    portal.canEdit &&
    !["approved", "waived", "not_applicable"].includes(section.status);
  const sectionIndex = ONBOARDING_SECTION_ORDER.indexOf(sectionKey);
  const previousKey = ONBOARDING_SECTION_ORDER[sectionIndex - 1];
  const nextKey = ONBOARDING_SECTION_ORDER[sectionIndex + 1];
  const activeChangeRequest = section.changeRequests.find(
    (request) =>
      request.status === "open" || request.status === "partner_responded"
  );
  const guided = resolveGuidedStep({
    sectionKey,
    requestedStep,
    missingRequiredKeys: section.missingRequiredKeys,
    pendingPrefillFieldKeys: section.pendingPrefillFieldKeys,
    changeRequest: activeChangeRequest
      ? {
          status: activeChangeRequest.status,
          targetFieldKey: activeChangeRequest.targetFieldKey
        }
      : null,
    canEdit: sectionCanEdit
  });
  const initialStepId = guided.requestOverview
    ? SECTION_CHANGE_REQUEST_STEP
    : guided.substep.id;
  const administratorName = primaryAdministratorName(portal.data);
  const lastDecisionAt =
    section.approvedAt ?? section.submittedAt ?? section.completedAt;
  const brandExperience =
    sectionKey === "brand_public_page"
      ? await loadBrandExperience(context, portal)
      : null;

  if (onboardingRoleSurface(portal.role) === "staff_summary") {
    return (
      <main
        className={`${rcapInter.variable} ${rcapMono.variable} min-h-screen break-words bg-[#F7F4EE] px-4 py-8 text-[#071B33] [font-family:var(--font-rcap-inter)] md:px-6 md:py-10`}
      >
        <OnboardingStaffSectionSummary
          administratorName={administratorName}
          lastDecisionAt={lastDecisionAt}
          organizationName={portal.organizationName}
          readOnlyValues={portal.readOnlyValues as Record<string, unknown>}
          resolution={guided}
          section={section}
          values={section.data as Record<string, unknown>}
        />
      </main>
    );
  }

  return (
    <main
      className={`${rcapInter.variable} ${rcapMono.variable} min-h-screen break-words bg-[#F7F4EE] px-4 py-8 text-[#071B33] [font-family:var(--font-rcap-inter)] md:px-6 md:py-10`}
    >
      <OnboardingSectionEditor
        sectionKey={section.key}
        sectionStatus={section.status}
        title={section.title}
        purpose={section.purpose}
        initialData={section.data as Record<string, unknown>}
        initialRevision={section.revision}
        initialWorkspaceVersion={portal.workspace.aggregateVersion}
        canEdit={sectionCanEdit}
        isPartnerStaff={false}
        commercialBlocked={portal.workspace.commercialGateStatus === "blocked"}
        changeRequestInstructions={
          section.changeRequestInstructions.length
            ? section.changeRequestInstructions.join("\n\n")
            : null
        }
        changeRequestStatus={section.changeRequestStatus}
        changeRequests={section.changeRequests}
        canonicalReferences={canonicalReferences(
          portal.canonicalReferences,
          portal.data.organization_contacts?.contacts ?? []
        )}
        readOnlyValues={readOnlyValues(
          portal.readOnlyValues,
          portal.procurementRequired,
          sectionKey,
          portal.data,
          portal.recordShieldInScope,
          portal.overageApprovalRequired
        )}
        assets={portal.assets.map((asset) => ({
          ...asset,
          previewHref: asset.mediaType.startsWith("image/")
            ? `/api/partners/onboarding/assets/${asset.id}`
            : null,
          downloadHref: `/api/partners/onboarding/assets/${asset.id}`
        }))}
        previousHref={
          previousKey
            ? `/partner/onboarding/${previousKey}`
            : "/partner/onboarding"
        }
        nextHref={
          nextKey
            ? `/partner/onboarding/${nextKey}`
            : "/partner/onboarding/review"
        }
        pendingPrefillFieldKeys={section.pendingPrefillFieldKeys}
        initialStepId={initialStepId}
        missingRequiredKeys={section.missingRequiredKeys}
        completionHref="/partner/onboarding#program-configuration"
        sectionSummary={{
          completedSections: portal.sections.filter(
            (candidate) => candidate.completionPercentage === 100
          ).length,
          totalSections: portal.sections.length,
          openPartnerChanges: portal.sections.filter(
            (candidate) => candidate.changeRequestStatus === "open"
          ).length,
          waitingOnLegalEase: portal.sections.filter(
            (candidate) =>
              candidate.changeRequestStatus === "partner_responded" ||
              candidate.status === "submitted"
          ).length
        }}
        brandExperience={brandExperience}
      />
    </main>
  );
}

async function loadBrandExperience(
  context: PartnerOnboardingContext,
  portal: Awaited<ReturnType<typeof getPartnerOnboardingPortal>>
) {
  try {
    const { board, source } = await loadPartnerArtifactBoardWithSource(context);
    const entry =
      board.entries.find(
        (candidate) =>
          candidate.artifactType === "co_branded_page_configuration"
      ) ?? null;
    const version = entry?.currentVersion ?? null;
    return {
      preview:
        renderCoBrandedPageConfiguration(source).pagePreview ?? null,
      previewUnavailable: false,
      artifactVersionId: version?.id ?? null,
      partnerReviewStatus: version?.partnerReviewStatus ?? null,
      legalEaseApprovalStatus: version?.approvalStatus ?? null,
      sourceFreshness: entry?.sourceFreshness ?? "no_version",
      invalidatedApprovals: entry?.invalidatedApprovals ?? {
        partner: false,
        legalease: false
      },
      canPartnerReview:
        portal.role === "partner_admin" &&
        entry?.sourceFreshness === "current" &&
        version?.approvalStatus === "approved" &&
        version.partnerReviewStatus === "awaiting_partner",
      workspaceStatus: portal.workspace.status,
      targetLaunchDate: portal.workspace.targetLaunchDate,
      launchedAt: portal.workspace.launchedAt,
      pausedAt: portal.workspace.pausedAt,
      closedAt: portal.workspace.closedAt
    } as const;
  } catch {
    return {
      preview: null,
      previewUnavailable: true,
      artifactVersionId: null,
      partnerReviewStatus: null,
      legalEaseApprovalStatus: null,
      sourceFreshness: "unavailable" as const,
      invalidatedApprovals: { partner: false, legalease: false },
      canPartnerReview: false,
      workspaceStatus: portal.workspace.status,
      targetLaunchDate: portal.workspace.targetLaunchDate,
      launchedAt: portal.workspace.launchedAt,
      pausedAt: portal.workspace.pausedAt,
      closedAt: portal.workspace.closedAt
    };
  }
}

function canonicalReferences(
  references: Record<string, { value: string; sourceSection: OnboardingSectionKey }>,
  contacts: Array<{
    stable_row_id: string;
    name?: string;
    work_email?: string;
    role?: string;
  }>
): OnboardingCanonicalReference[] {
  const jurisdictionOptions = ONBOARDING_JURISDICTIONS.map((jurisdiction) => ({
    id: jurisdiction.code,
    label: jurisdiction.name,
    detail: jurisdiction.code
  }));
  const contactOptions = contacts.map((contact, index) => ({
    id: contact.stable_row_id,
    label: contact.name?.trim() || `Contact ${index + 1}`,
    detail: [contact.role, contact.work_email].filter(Boolean).join(" · ")
  }));
  const canonical = Object.entries(references).map(([fieldKey, reference]) => ({
    fieldKey,
    label: getFieldDefinition(
      fieldKey as Parameters<typeof getFieldDefinition>[0]
    )?.label ?? "Saved information",
    value: reference.value,
    editHref: guidedHrefForField(reference.sourceSection, fieldKey),
    helperCopy: "This canonical value is edited in its source section.",
    ...(fieldKey === "jurisdictions" ? { options: jurisdictionOptions } : {})
  }));
  if (!canonical.some((reference) => reference.fieldKey === "jurisdictions")) {
    canonical.push({
      fieldKey: "jurisdictions",
      label: "Jurisdictions",
      value: "",
      editHref:
        "/partner/onboarding/geography_audience_language_accessibility",
      helperCopy: "This canonical value is edited in its source section.",
      options: jurisdictionOptions
    });
  }
  // Derived from the registry so that a contact reference added later gets its
  // chooser without a second list to keep in step.
  for (const definition of ONBOARDING_SCHEMA_REGISTRY.filter(
    (field) => field.dataType === "contact_reference" && !field.parentCollection
  )) {
    const fieldKey = String(definition.key);
    canonical.push({
      fieldKey,
      label:
        getFieldDefinition(
          fieldKey as Parameters<typeof getFieldDefinition>[0]
        )?.label ?? "Saved contact",
      value: "",
      editHref: guidedHrefForField(
        "organization_contacts",
        "contacts"
      ),
      helperCopy: "Choose a contact saved in Organization and contacts.",
      options: contactOptions
    });
  }
  return canonical;
}

function readOnlyValues(
  values: OnboardingReadOnlyValues,
  procurementRequired: boolean,
  sectionKey: OnboardingSectionKey,
  data: OnboardingPartnerData,
  recordShieldInScope: boolean,
  overageApprovalRequired: boolean
): OnboardingReadOnlyValue[] {
  const definitions = new Map(
    ONBOARDING_SCHEMA_REGISTRY.map((field) => [String(field.key), field])
  );
  const entries: OnboardingReadOnlyValue[] = Object.entries(values)
    .filter(([fieldKey, value]) => {
      const definition = definitions.get(fieldKey);
      return (
        value !== undefined &&
        definition?.sectionKey === sectionKey &&
        isFieldActive(definition, data, {
          recordShieldInScope,
          overageApprovalRequired
        })
      );
    })
    .map(([fieldKey, value]) => ({
      fieldKey,
      label: definitions.get(fieldKey)?.label ?? "Saved information",
      value
    }));
  if (sectionKey === "brand_public_page") {
    entries.push({
      fieldKey: "procurement_required",
      label: "Procurement document required",
      value: procurementRequired,
      helperCopy:
        "LegalEase controls this requirement from the procurement record."
    });
  }
  return entries;
}

function guidedHrefForField(
  sectionKey: OnboardingSectionKey,
  fieldKey: string
) {
  const substep = guidedSubstepForField(sectionKey, fieldKey);
  return substep
    ? guidedSectionHref(sectionKey, substep.id)
    : `/partner/onboarding/${sectionKey}`;
}

function primaryAdministratorName(data: OnboardingPartnerData): string | null {
  const staff = data.staff_dashboard_plan;
  const rowId = staff?.primary_dashboard_administrator_row_id;
  const administrator = staff?.planned_users?.find(
    (user) => user.stable_row_id === rowId
  );
  if (administrator?.name?.trim()) return administrator.name.trim();
  const plannedAdministrator = staff?.planned_users?.find(
    (user) => user.requested_role === "partner_administrator"
  );
  return plannedAdministrator?.name?.trim() || null;
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
