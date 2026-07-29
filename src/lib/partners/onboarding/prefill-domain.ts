import {
  getFieldDefinition,
  getPartnerEditableTopLevelFields,
  ONBOARDING_SECTION_ORDER
} from "./schema";
import { isFieldActive } from "./derivations";
import { Phase1OnboardingError } from "./errors";
import type {
  OnboardingDerivationContext,
  OnboardingFieldDefinition,
  OnboardingPartnerData,
  OnboardingSectionKey,
  OnboardingValidationContext
} from "./types";
import { validateOnboardingSection } from "./validation";

export const PREFILL_SOURCE_TYPES = [
  "partner_record",
  "contact_record",
  "order_form",
  "agreement",
  "proposal",
  "meeting",
  "email",
  "kickoff",
  "manual",
  "other"
] as const;

export type PrefillSourceType = (typeof PREFILL_SOURCE_TYPES)[number];

export const PREFILL_BATCH_STATUSES = [
  "draft",
  "ready_for_review",
  "approved",
  "partially_applied",
  "applied",
  "rejected",
  "superseded"
] as const;

export type PrefillBatchStatus = (typeof PREFILL_BATCH_STATUSES)[number];

export const PREFILL_REVIEW_STATUSES = [
  "proposed",
  "approved",
  "rejected",
  "applied",
  "conflict",
  "superseded"
] as const;

export type PrefillReviewStatus = (typeof PREFILL_REVIEW_STATUSES)[number];

export const PARTNER_PREFILL_REVIEW_STATUSES = [
  "not_applied",
  "pending",
  "confirmed",
  "modified",
  "rejected"
] as const;

export type PartnerPrefillReviewStatus =
  (typeof PARTNER_PREFILL_REVIEW_STATUSES)[number];

export const PREFILL_PROHIBITED_FIELD_KEYS = new Set<string>([
  // Allocation, credits, overage, and other commercial configuration.
  "code_level_capacity",
  "overage_approver_contact_id",
  "sponsored_screening_scope",
  "sponsored_packet_scope",
  "screening_allocation",
  "packet_credits",
  "recordshield_pathway",
  "overage_behavior",
  "overage_approver_authorization",
  // Dashboard and access authorization decisions remain partner-entered.
  "user_invitation_authority_role",
  "code_management_authority_role",
  "report_export_authority_role",
  // Legal escalation language is partner-confirmed and cannot be imported.
  "contested_matter_procedure",
  // Final authorization and acknowledgment fields.
  "organization_information_accurate",
  "program_scope_approved_for_configuration",
  "brand_assets_authorized_for_use",
  "no_eligibility_or_outcome_guarantee_understood",
  "contested_and_representation_matters_follow_escalation_plan",
  "dashboard_users_authorized",
  "legalease_may_prepare_draft_implementation_materials",
  "approver_name",
  "approver_title",
  "approver_user_id",
  "approver_work_email",
  "authorization_timestamp",
  "terms_or_schema_version"
]);

const PREFILL_COLLECTION_TYPES = new Set([
  "contact_collection",
  "planned_user_collection",
  "report_recipient_collection"
]);

export function isPrefillSourceType(
  value: unknown
): value is PrefillSourceType {
  return (
    typeof value === "string" &&
    (PREFILL_SOURCE_TYPES as readonly string[]).includes(value)
  );
}

export function isPrefillEligibleField(
  field: OnboardingFieldDefinition | undefined
): field is OnboardingFieldDefinition {
  return Boolean(
    field &&
      field.ownership === "partner_editable" &&
      !field.parentCollection &&
      field.sectionKey !== "review_authorization" &&
      field.sensitivity !== "commercial" &&
      field.sensitivity !== "system" &&
      !PREFILL_PROHIBITED_FIELD_KEYS.has(String(field.key))
  );
}

export function getPrefillEligibleFields(
  sectionKey?: OnboardingSectionKey,
  options: { includeCollections?: boolean } = {}
): readonly OnboardingFieldDefinition[] {
  const sections = sectionKey
    ? [sectionKey]
    : (ONBOARDING_SECTION_ORDER as readonly OnboardingSectionKey[]);
  return sections.flatMap((section) =>
    getPartnerEditableTopLevelFields(section).filter(
      (field) =>
        isPrefillEligibleField(field) &&
        (options.includeCollections === true ||
          !PREFILL_COLLECTION_TYPES.has(field.dataType))
    )
  );
}

export function requirePrefillEligibleField(
  sectionKey: OnboardingSectionKey,
  fieldKey: string
): OnboardingFieldDefinition {
  const field = getFieldDefinition(
    fieldKey as Parameters<typeof getFieldDefinition>[0]
  );
  if (
    !isPrefillEligibleField(field) ||
    field.sectionKey !== sectionKey ||
    String(field.key) !== fieldKey
  ) {
    throw new Phase1OnboardingError(
      "invalid_input",
      "Choose a partner-editable onboarding field that is eligible for prefill."
    );
  }
  return field;
}

export function normalizePrefillValue(
  sectionKey: OnboardingSectionKey,
  fieldKey: string,
  proposedValue: unknown,
  currentData: OnboardingPartnerData,
  context: OnboardingValidationContext = {}
): unknown {
  const field = requirePrefillEligibleField(sectionKey, fieldKey);
  if (!isFieldActive(field, currentData, context)) {
    throw new Phase1OnboardingError(
      "invalid_input",
      "This field is not active for the current onboarding configuration."
    );
  }

  const currentSection = {
    ...((currentData[sectionKey] ?? {}) as Record<string, unknown>)
  };
  currentSection[field.dataKey] = proposedValue;
  const validation = validateOnboardingSection(
    sectionKey,
    currentSection,
    "draft_save",
    {
      ...context,
      allSections: {
        ...currentData,
        [sectionKey]: currentSection
      }
    }
  );
  const normalizedSection = validation.data as
    | Record<string, unknown>
    | undefined;
  const targetIssues = validation.issues.filter(
    (issue) =>
      issue.fieldKey === fieldKey ||
      issue.fieldKey === field.dataKey ||
      issue.fieldKey.startsWith(`${field.dataKey}[`)
  );
  if (!normalizedSection || targetIssues.length > 0) {
    throw new Phase1OnboardingError(
      "invalid_input",
      targetIssues[0]?.message ?? "The proposed value is invalid."
    );
  }
  return normalizedSection[field.dataKey];
}

export function canonicalPrefillFieldValue(
  data: OnboardingPartnerData,
  sectionKey: OnboardingSectionKey,
  fieldKey: string
): unknown {
  const field = requirePrefillEligibleField(sectionKey, fieldKey);
  const section = (data[sectionKey] ?? {}) as Record<string, unknown>;
  return section[field.dataKey] ?? null;
}

export function withCanonicalPrefillValue(
  data: OnboardingPartnerData,
  sectionKey: OnboardingSectionKey,
  fieldKey: string,
  value: unknown
): OnboardingPartnerData {
  const field = requirePrefillEligibleField(sectionKey, fieldKey);
  return {
    ...data,
    [sectionKey]: {
      ...((data[sectionKey] ?? {}) as Record<string, unknown>),
      [field.dataKey]: value
    }
  };
}

export function isPrefillFieldActive(
  data: OnboardingPartnerData,
  sectionKey: OnboardingSectionKey,
  fieldKey: string,
  context: Partial<OnboardingDerivationContext> = {}
): boolean {
  const field = requirePrefillEligibleField(sectionKey, fieldKey);
  return isFieldActive(field, data, context);
}

export function stablePrefillJson(value: unknown): string {
  return JSON.stringify(sortJson(value));
}

export function classifyPartnerPrefillReview(
  proposedValue: unknown,
  currentValue: unknown
): PartnerPrefillReviewStatus {
  if (stablePrefillJson(proposedValue) === stablePrefillJson(currentValue)) {
    return "confirmed";
  }
  if (
    currentValue === null ||
    currentValue === undefined ||
    currentValue === "" ||
    (Array.isArray(currentValue) && currentValue.length === 0)
  ) {
    return "rejected";
  }
  return "modified";
}

function sortJson(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(sortJson);
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([key, nested]) => [key, sortJson(nested)])
    );
  }
  return value ?? null;
}
