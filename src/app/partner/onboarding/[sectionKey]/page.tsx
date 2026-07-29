import { notFound, redirect } from "next/navigation";
import { isRcapPartnerOnboardingEnabled } from "@/lib/partners/onboarding/feature";
import { requirePartnerOnboardingContext } from "@/lib/partners/onboarding/auth-context";
import { getPartnerOnboardingPortal } from "@/lib/partners/onboarding/service";
import { ONBOARDING_JURISDICTIONS } from "@/lib/partners/onboarding/jurisdictions";
import {
  getFieldDefinition,
  ONBOARDING_SCHEMA_REGISTRY,
  ONBOARDING_SECTION_ORDER
} from "@/lib/partners/onboarding/schema";
import { isFieldActive } from "@/lib/partners/onboarding/derivations";
import type {
  OnboardingPartnerData,
  OnboardingReadOnlyValues,
  OnboardingSectionKey
} from "@/lib/partners/onboarding/types";
import {
  OnboardingSectionEditor,
  type OnboardingCanonicalReference,
  type OnboardingReadOnlyValue
} from "./OnboardingSectionEditor";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function PartnerOnboardingSectionPage({
  params
}: {
  params: Promise<{ sectionKey: string }>;
}) {
  if (!isRcapPartnerOnboardingEnabled()) notFound();
  const { sectionKey: rawSectionKey } = await params;
  if (!(ONBOARDING_SECTION_ORDER as readonly string[]).includes(rawSectionKey)) {
    notFound();
  }
  const sectionKey = rawSectionKey as OnboardingSectionKey;

  let portal: Awaited<ReturnType<typeof getPartnerOnboardingPortal>>;
  try {
    const context = await requirePartnerOnboardingContext();
    portal = await getPartnerOnboardingPortal(context);
  } catch (error) {
    if (isUnauthenticated(error)) {
      redirect(
        `/sign-in?next=${encodeURIComponent(`/partner/onboarding/${sectionKey}`)}`
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

  return (
    <main className="min-h-screen bg-[#FBF7F2] px-4 py-8 text-navy md:px-6 md:py-10">
      <OnboardingSectionEditor
        sectionKey={section.key}
        sectionStatus={section.status}
        title={section.title}
        purpose={section.purpose}
        initialData={section.data as Record<string, unknown>}
        initialRevision={section.revision}
        initialWorkspaceVersion={portal.workspace.aggregateVersion}
        canEdit={sectionCanEdit}
        isPartnerStaff={portal.role === "partner_staff"}
        commercialBlocked={portal.workspace.commercialGateStatus === "blocked"}
        changeRequestInstructions={
          section.changeRequestInstructions.length
            ? section.changeRequestInstructions.join("\n\n")
            : null
        }
        changeRequestStatus={section.changeRequestStatus}
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
      />
    </main>
  );
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
    )?.label ?? humanLabel(fieldKey),
    value: reference.value,
    editHref: `/partner/onboarding/${reference.sourceSection}`,
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
  for (const fieldKey of [
    "overage_approver_contact_id",
    "partner_staff_support_contact_id",
    "urgent_escalation_contact_id"
  ]) {
    canonical.push({
      fieldKey,
      label:
        getFieldDefinition(
          fieldKey as Parameters<typeof getFieldDefinition>[0]
        )?.label ?? humanLabel(fieldKey),
      value: "",
      editHref: "/partner/onboarding/organization_contacts",
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
      label: definitions.get(fieldKey)?.label ?? humanLabel(fieldKey),
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

function humanLabel(value: string) {
  return value
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
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
