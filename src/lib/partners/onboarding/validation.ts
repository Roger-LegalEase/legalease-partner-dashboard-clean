import { z } from "zod";

import {
  ACCESS_CODE_STRUCTURES,
  CONTACT_ROLES,
  DASHBOARD_SPECIAL_PERMISSIONS,
  ONBOARDING_FIELD_LIMITS,
  ONBOARDING_SCHEMA_REGISTRY,
  ONBOARDING_SECTION_ORDER,
  ORGANIZATION_TYPES,
  OUT_OF_AREA_POLICIES,
  PARTICIPANT_ACCESS_MODELS,
  PROGRAM_MODELS,
  REQUESTED_DASHBOARD_ROLES
} from "./schema";
import {
  calculateOnboardingCompletion,
  getMissingRequiredAssets
} from "./derivations";
import { canonicalOnboardingJurisdiction } from "./jurisdictions";
import type {
  AccessSponsorshipCapacitySectionData,
  OnboardingContact,
  OnboardingPartnerData,
  OnboardingReportRecipient,
  OnboardingSectionDataMap,
  OnboardingSectionKey,
  OnboardingValidationContext,
  OnboardingValidationIssue,
  OnboardingValidationIssueCode,
  OnboardingValidationMode,
  OnboardingValidationResult,
  PlannedDashboardUser,
  ProgramGoalsSectionData,
  StaffDashboardPlanSectionData,
  SupportReferralsReportingSectionData
} from "./types";

const FORBIDDEN_CONTROL_CHARACTERS =
  /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/u;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/u;
const PHONE_PATTERN = /^[0-9+().\-\s/xextEXT]*$/u;
const DATE_ONLY_PATTERN = /^\d{4}-\d{2}-\d{2}$/u;
const STABLE_ROW_ID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu;
const SLUG_PREFERENCE_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/u;

function containsUnpairedSurrogate(value: string): boolean {
  for (let index = 0; index < value.length; index += 1) {
    const unit = value.charCodeAt(index);
    if (unit >= 0xd800 && unit <= 0xdbff) {
      const next = value.charCodeAt(index + 1);
      if (!(next >= 0xdc00 && next <= 0xdfff)) {
        return true;
      }
      index += 1;
    } else if (unit >= 0xdc00 && unit <= 0xdfff) {
      return true;
    }
  }
  return false;
}

function normalizeSingleLine(value: string): string {
  return value.normalize("NFC").replace(/\s+/gu, " ").trim();
}

function normalizeMultiline(value: string): string {
  return value
    .normalize("NFC")
    .replace(/\r\n?/gu, "\n")
    .split("\n")
    .map((line) => line.replace(/[ \t]+/gu, " ").trim())
    .join("\n")
    .replace(/\n{3,}/gu, "\n\n")
    .trim();
}

function safeString(
  maxLength: number,
  normalization: "single_line" | "multiline" | "trim" = "single_line"
) {
  return z
    .string()
    .max(maxLength, `Must be ${maxLength} characters or fewer.`)
    .superRefine((value, issueContext) => {
      if (
        FORBIDDEN_CONTROL_CHARACTERS.test(value) ||
        containsUnpairedSurrogate(value)
      ) {
        issueContext.addIssue({
          code: "custom",
          message: "Remove unsupported control characters."
        });
      }
    })
    .transform((value) => {
      if (normalization === "multiline") {
        return normalizeMultiline(value);
      }
      if (normalization === "trim") {
        return value.normalize("NFC").trim();
      }
      return normalizeSingleLine(value);
    });
}

function emailSchema() {
  return safeString(
    ONBOARDING_FIELD_LIMITS.email,
    "trim"
  )
    .transform((value) => value.toLowerCase())
    .refine((value) => value.length === 0 || EMAIL_PATTERN.test(value), {
      message: "Enter a valid work email."
    });
}

function phoneSchema() {
  return safeString(ONBOARDING_FIELD_LIMITS.phone, "single_line").refine(
    (value) => value.length === 0 || PHONE_PATTERN.test(value),
    { message: "Enter a valid phone number." }
  );
}

function urlSchema() {
  return safeString(ONBOARDING_FIELD_LIMITS.url, "trim").refine(
    (value) => {
      if (value.length === 0) {
        return true;
      }
      try {
        const parsed = new URL(value);
        return parsed.protocol === "https:" || parsed.protocol === "http:";
      } catch {
        return false;
      }
    },
    { message: "Enter a complete http or https URL." }
  );
}

function isRealDateOnly(value: string): boolean {
  if (!DATE_ONLY_PATTERN.test(value)) {
    return false;
  }
  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
  );
}

function dateOnlySchema() {
  return safeString(10, "trim").refine(
    (value) => value.length === 0 || isRealDateOnly(value),
    { message: "Enter a valid date in YYYY-MM-DD format." }
  );
}

function stableRowIdSchema() {
  return safeString(36, "trim")
    .transform((value) => value.toLowerCase())
    .refine((value) => STABLE_ROW_ID_PATTERN.test(value), {
      message: "A valid stable row ID is required."
    });
}

function optionalNullable<T extends z.ZodType<string>>(schema: T) {
  return z
    .union([schema, z.null(), z.literal("")])
    .transform((value) => (value === "" ? null : value))
    .optional();
}

function stringArraySchema(
  maxItemLength: number = ONBOARDING_FIELD_LIMITS.shortText
) {
  return z
    .array(safeString(maxItemLength, "single_line"))
    .max(
      ONBOARDING_FIELD_LIMITS.arrayRows,
      `Use no more than ${ONBOARDING_FIELD_LIMITS.arrayRows} entries.`
    )
    .transform((values) => {
      const seen = new Set<string>();
      return values.filter((value) => {
        if (!value) {
          return false;
        }
        const normalizedKey = value.toLocaleLowerCase("en-US");
        if (seen.has(normalizedKey)) {
          return false;
        }
        seen.add(normalizedKey);
        return true;
      });
    });
}

const jurisdictionArraySchema = stringArraySchema(
  ONBOARDING_FIELD_LIMITS.nameOrTitle
)
  .superRefine((values, issueContext) => {
    values.forEach((value, index) => {
      if (!canonicalOnboardingJurisdiction(value)) {
        issueContext.addIssue({
          code: "custom",
          message: "Choose a supported state or the District of Columbia.",
          path: [index]
        });
      }
    });
  })
  .transform((values) =>
    values
      .map((value) => canonicalOnboardingJurisdiction(value))
      .filter((value): value is string => value !== null)
  );

const nonNegativeIntegerSchema = z
  .number()
  .safe()
  .int("Enter a whole number.")
  .min(0, "Enter zero or a positive number.");

const contactDraftSchema = z
  .object({
    stable_row_id: stableRowIdSchema(),
    role: z.enum(CONTACT_ROLES).optional(),
    name: safeString(ONBOARDING_FIELD_LIMITS.nameOrTitle).optional(),
    title: safeString(ONBOARDING_FIELD_LIMITS.nameOrTitle).optional(),
    organization: optionalNullable(
      safeString(ONBOARDING_FIELD_LIMITS.organizationOrProgramName)
    ),
    work_email: emailSchema().optional(),
    phone: optionalNullable(phoneSchema())
  })
  .strict();

const plannedUserDraftSchema = z
  .object({
    stable_row_id: stableRowIdSchema(),
    name: safeString(ONBOARDING_FIELD_LIMITS.nameOrTitle).optional(),
    work_email: emailSchema().optional(),
    requested_role: z.enum(REQUESTED_DASHBOARD_ROLES).optional(),
    special_permissions: z
      .array(z.enum(DASHBOARD_SPECIAL_PERMISSIONS))
      .max(DASHBOARD_SPECIAL_PERMISSIONS.length)
      .transform((values) => [...new Set(values)])
      .optional(),
    training_attendee: z.boolean().optional()
  })
  .strict();

const reportRecipientDraftSchema = z
  .object({
    stable_row_id: stableRowIdSchema(),
    name: optionalNullable(
      safeString(ONBOARDING_FIELD_LIMITS.nameOrTitle)
    ),
    work_email: emailSchema().optional()
  })
  .strict();

const sectionSchemas = {
  organization_contacts: z
    .object({
      legal_organization_name: safeString(
        ONBOARDING_FIELD_LIMITS.organizationOrProgramName
      ).optional(),
      public_organization_name: safeString(
        ONBOARDING_FIELD_LIMITS.organizationOrProgramName
      ).optional(),
      organization_type: z.enum(ORGANIZATION_TYPES).optional(),
      website: urlSchema().optional(),
      primary_address: safeString(
        ONBOARDING_FIELD_LIMITS.shortText,
        "multiline"
      ).optional(),
      main_phone: phoneSchema().optional(),
      public_program_name: safeString(
        ONBOARDING_FIELD_LIMITS.organizationOrProgramName
      ).optional(),
      partner_slug_preference: safeString(
        ONBOARDING_FIELD_LIMITS.nameOrTitle,
        "trim"
      )
        .transform((value) => value.toLowerCase())
        .refine(
          (value) =>
            value.length === 0 || SLUG_PREFERENCE_PATTERN.test(value),
          {
            message:
              "Use lowercase letters, numbers, and single hyphens only."
          }
        )
        .optional(),
      contacts: z
        .array(contactDraftSchema)
        .max(ONBOARDING_FIELD_LIMITS.arrayRows)
        .optional()
    })
    .strict(),
  program_goals: z
    .object({
      primary_goal: safeString(
        ONBOARDING_FIELD_LIMITS.longText,
        "multiline"
      ).optional(),
      definition_of_success: safeString(
        ONBOARDING_FIELD_LIMITS.longText,
        "multiline"
      ).optional(),
      target_population: safeString(
        ONBOARDING_FIELD_LIMITS.longText,
        "multiline"
      ).optional(),
      expected_screening_volume: nonNegativeIntegerSchema.optional(),
      expected_screening_period: safeString(
        ONBOARDING_FIELD_LIMITS.nameOrTitle
      ).optional(),
      expected_packet_volume: nonNegativeIntegerSchema.optional(),
      expected_packet_period: safeString(
        ONBOARDING_FIELD_LIMITS.nameOrTitle
      ).optional(),
      program_model: z.enum(PROGRAM_MODELS).optional(),
      program_start_date: dateOnlySchema().optional(),
      program_end_date: optionalNullable(dateOnlySchema()),
      ongoing: z.boolean().optional(),
      outreach_channels: stringArraySchema().optional(),
      current_workflow: safeString(
        ONBOARDING_FIELD_LIMITS.longText,
        "multiline"
      ).optional(),
      known_barriers: stringArraySchema().optional(),
      known_barriers_other: optionalNullable(
        safeString(ONBOARDING_FIELD_LIMITS.longText, "multiline")
      ),
      partner_side_outcome_tracking: safeString(
        ONBOARDING_FIELD_LIMITS.longText,
        "multiline"
      ).optional()
    })
    .strict(),
  geography_audience_language_accessibility: z
    .object({
      jurisdictions: jurisdictionArraySchema.optional(),
      service_area_description: safeString(
        ONBOARDING_FIELD_LIMITS.longText,
        "multiline"
      ).optional(),
      counties: stringArraySchema(
        ONBOARDING_FIELD_LIMITS.nameOrTitle
      ).optional(),
      default_county: optionalNullable(
        safeString(ONBOARDING_FIELD_LIMITS.nameOrTitle)
      ),
      out_of_area_policy: z.enum(OUT_OF_AREA_POLICIES).optional(),
      primary_language: safeString(
        ONBOARDING_FIELD_LIMITS.nameOrTitle
      ).optional(),
      enable_spanish: z.boolean().optional(),
      additional_languages: stringArraySchema(
        ONBOARDING_FIELD_LIMITS.nameOrTitle
      ).optional(),
      accessibility_accommodations: safeString(
        ONBOARDING_FIELD_LIMITS.longText,
        "multiline"
      ).optional(),
      community_specific_terminology: safeString(
        ONBOARDING_FIELD_LIMITS.longText,
        "multiline"
      ).optional(),
      population_restrictions: safeString(
        ONBOARDING_FIELD_LIMITS.longText,
        "multiline"
      ).optional()
    })
    .strict(),
  access_sponsorship_capacity: z
    .object({
      participant_access_model: z.enum(
        PARTICIPANT_ACCESS_MODELS
      ).optional(),
      code_structure: z.enum(ACCESS_CODE_STRUCTURES).optional(),
      code_source_groups: stringArraySchema().optional(),
      code_expiration: optionalNullable(dateOnlySchema()),
      code_level_capacity: z
        .union([nonNegativeIntegerSchema, z.null()])
        .optional(),
      overage_approver_contact_id: optionalNullable(stableRowIdSchema())
    })
    .strict(),
  brand_public_page: z
    .object({
      approved_organization_description: safeString(
        ONBOARDING_FIELD_LIMITS.longText,
        "multiline"
      ).optional(),
      program_headline: safeString(
        ONBOARDING_FIELD_LIMITS.shortText
      ).optional(),
      program_subheadline: safeString(
        ONBOARDING_FIELD_LIMITS.shortText
      ).optional(),
      primary_cta_label: safeString(
        ONBOARDING_FIELD_LIMITS.nameOrTitle
      ).optional(),
      participant_support_copy: safeString(
        ONBOARDING_FIELD_LIMITS.longText,
        "multiline"
      ).optional(),
      partner_privacy_url: optionalNullable(urlSchema()),
      accessibility_url: optionalNullable(urlSchema()),
      impact_reporting_url: optionalNullable(urlSchema())
    })
    .strict(),
  staff_dashboard_plan: z
    .object({
      planned_users: z
        .array(plannedUserDraftSchema)
        .max(ONBOARDING_FIELD_LIMITS.arrayRows)
        .optional(),
      primary_dashboard_administrator_row_id: stableRowIdSchema().optional(),
      user_invitation_authority_role: z
        .enum(REQUESTED_DASHBOARD_ROLES)
        .optional(),
      code_management_authority_role: z
        .enum(REQUESTED_DASHBOARD_ROLES)
        .optional(),
      report_export_authority_role: z
        .enum(REQUESTED_DASHBOARD_ROLES)
        .optional(),
      access_review_frequency: safeString(
        ONBOARDING_FIELD_LIMITS.shortText
      ).optional()
    })
    .strict(),
  support_referrals_reporting: z
    .object({
      participant_support_email: emailSchema().optional(),
      participant_support_phone: optionalNullable(phoneSchema()),
      partner_staff_support_contact_id: stableRowIdSchema().optional(),
      legal_services_referral_organization: safeString(
        ONBOARDING_FIELD_LIMITS.organizationOrProgramName
      ).optional(),
      referral_intake_method: safeString(
        ONBOARDING_FIELD_LIMITS.shortText
      ).optional(),
      referral_intake_details: safeString(
        ONBOARDING_FIELD_LIMITS.longText,
        "multiline"
      ).optional(),
      contested_matter_procedure: safeString(
        ONBOARDING_FIELD_LIMITS.longText,
        "multiline"
      ).optional(),
      urgent_escalation_contact_id: stableRowIdSchema().optional(),
      report_recipients: z
        .array(reportRecipientDraftSchema)
        .max(ONBOARDING_FIELD_LIMITS.arrayRows)
        .optional(),
      reporting_cadence: safeString(
        ONBOARDING_FIELD_LIMITS.shortText
      ).optional(),
      funder_required_metrics: stringArraySchema().optional(),
      data_use_restrictions: stringArraySchema().optional(),
      external_outcome_data_description: safeString(
        ONBOARDING_FIELD_LIMITS.longText,
        "multiline"
      ).optional()
    })
    .strict(),
  review_authorization: z
    .object({
      organization_information_accurate: z.boolean().optional(),
      program_scope_approved_for_configuration: z.boolean().optional(),
      brand_assets_authorized_for_use: z.boolean().optional(),
      no_eligibility_or_outcome_guarantee_understood: z
        .boolean()
        .optional(),
      contested_and_representation_matters_follow_escalation_plan: z
        .boolean()
        .optional(),
      dashboard_users_authorized: z.boolean().optional(),
      legalease_may_prepare_draft_implementation_materials: z
        .boolean()
        .optional(),
      approver_name: safeString(
        ONBOARDING_FIELD_LIMITS.nameOrTitle
      ).optional(),
      approver_title: safeString(
        ONBOARDING_FIELD_LIMITS.nameOrTitle
      ).optional()
    })
    .strict()
} as const;

function issue(
  sectionKey: OnboardingSectionKey,
  fieldKey: string,
  code: OnboardingValidationIssueCode,
  message: string,
  rowId?: string
): OnboardingValidationIssue {
  return {
    sectionKey,
    fieldKey,
    code,
    message,
    ...(rowId ? { rowId } : {})
  };
}

function inspectTopLevelOwnership(
  sectionKey: OnboardingSectionKey,
  input: unknown
): OnboardingValidationIssue[] {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    return [];
  }

  const definitions = ONBOARDING_SCHEMA_REGISTRY.filter(
    (field) => field.sectionKey === sectionKey && !field.parentCollection
  );
  const definitionsByKey = new Map(
    definitions.map((field) => [field.dataKey, field])
  );

  return Object.keys(input).flatMap((key) => {
    const definition = definitionsByKey.get(key);
    if (!definition) {
      return [
        issue(
          sectionKey,
          key,
          "unknown_field",
          "This field is not part of the onboarding section."
        )
      ];
    }
    if (definition.ownership !== "partner_editable") {
      return [
        issue(
          sectionKey,
          key,
          "read_only_field",
          "This value is controlled by LegalEase or derived by the system."
        )
      ];
    }
    return [];
  });
}

function zodIssueCode(code: string): OnboardingValidationIssueCode {
  if (code === "unrecognized_keys") {
    return "unknown_field";
  }
  if (code === "too_big") {
    return "too_long";
  }
  if (code === "invalid_type") {
    return "invalid_type";
  }
  return "invalid_format";
}

function fieldKeyForPath(path: PropertyKey[]): string {
  if (path.length === 0) {
    return "section";
  }
  if (typeof path[1] === "number" && typeof path[2] === "string") {
    return `${String(path[0])}[].${path[2]}`;
  }
  return String(path[0]);
}

function rowIdForPath(input: unknown, path: PropertyKey[]): string | undefined {
  if (
    !input ||
    typeof input !== "object" ||
    Array.isArray(input) ||
    typeof path[0] !== "string" ||
    typeof path[1] !== "number"
  ) {
    return undefined;
  }
  const collection = (input as Record<string, unknown>)[path[0]];
  if (!Array.isArray(collection)) {
    return undefined;
  }
  const row = collection[path[1]];
  return row &&
    typeof row === "object" &&
    typeof (row as Record<string, unknown>).stable_row_id === "string"
    ? String((row as Record<string, unknown>).stable_row_id)
    : undefined;
}

function mapZodIssues(
  sectionKey: OnboardingSectionKey,
  input: unknown,
  zodIssues: readonly z.core.$ZodIssue[],
  ownershipIssues: readonly OnboardingValidationIssue[]
): OnboardingValidationIssue[] {
  const preflightKeys = new Set(
    ownershipIssues.map((ownershipIssue) => ownershipIssue.fieldKey)
  );

  return zodIssues.flatMap((zodIssue) => {
    const fieldKey = fieldKeyForPath(zodIssue.path);
    if (
      zodIssue.code === "unrecognized_keys" &&
      preflightKeys.has(fieldKey)
    ) {
      return [];
    }
    return [
      issue(
        sectionKey,
        fieldKey,
        zodIssueCode(zodIssue.code),
        zodIssue.message,
        rowIdForPath(input, zodIssue.path)
      )
    ];
  });
}

function duplicateIssues<T extends { stable_row_id: string }>(
  sectionKey: OnboardingSectionKey,
  collectionKey: string,
  rows: readonly T[],
  emailForRow?: (row: T) => string | undefined
): OnboardingValidationIssue[] {
  const issues: OnboardingValidationIssue[] = [];
  const rowIds = new Set<string>();
  const emails = new Set<string>();

  for (const row of rows) {
    if (rowIds.has(row.stable_row_id)) {
      issues.push(
        issue(
          sectionKey,
          `${collectionKey}[].stable_row_id`,
          "duplicate",
          "Each row must have a unique stable ID.",
          row.stable_row_id
        )
      );
    }
    rowIds.add(row.stable_row_id);

    const email = emailForRow?.(row)?.toLowerCase();
    if (email) {
      if (emails.has(email)) {
        issues.push(
          issue(
            sectionKey,
            `${collectionKey}[].work_email`,
            "duplicate",
            "Each row in this list must use a unique work email.",
            row.stable_row_id
          )
        );
      }
      emails.add(email);
    }
  }
  return issues;
}

function validateContactDuplicates(
  contacts: readonly OnboardingContact[]
): OnboardingValidationIssue[] {
  const issues = duplicateIssues(
    "organization_contacts",
    "contacts",
    contacts
  );
  const roleEmailPairs = new Set<string>();

  for (const contact of contacts) {
    if (!contact.role || !contact.work_email) {
      continue;
    }
    const pair = `${contact.role}:${contact.work_email.toLowerCase()}`;
    if (roleEmailPairs.has(pair)) {
      issues.push(
        issue(
          "organization_contacts",
          "contacts[].work_email",
          "duplicate",
          "The same work email may hold different roles, but a role and email pair may appear only once.",
          contact.stable_row_id
        )
      );
    }
    roleEmailPairs.add(pair);
  }
  return issues;
}

function sectionCrossFieldIssues(
  sectionKey: OnboardingSectionKey,
  sectionData: OnboardingSectionDataMap[OnboardingSectionKey],
  allSections: OnboardingPartnerData,
  mode: OnboardingValidationMode
): OnboardingValidationIssue[] {
  const issues: OnboardingValidationIssue[] = [];

  if (sectionKey === "organization_contacts") {
    const contacts = (sectionData as { contacts?: OnboardingContact[] })
      .contacts;
    if (contacts) {
      issues.push(...validateContactDuplicates(contacts));
    }
  }

  if (sectionKey === "program_goals") {
    const goals = sectionData as ProgramGoalsSectionData;
    if (
      goals.program_start_date &&
      goals.program_end_date &&
      goals.program_end_date < goals.program_start_date
    ) {
      issues.push(
        issue(
          sectionKey,
          "program_end_date",
          "invalid_value",
          "The program end date cannot be before the start date."
        )
      );
    }
  }

  if (sectionKey === "geography_audience_language_accessibility") {
    const geography = sectionData as {
      counties?: string[];
      default_county?: string | null;
    };
    if (
      geography.default_county &&
      !geography.counties?.includes(geography.default_county)
    ) {
      issues.push(
        issue(
          sectionKey,
          "default_county",
          "invalid_reference",
          "Choose a default county from the configured counties."
        )
      );
    }
  }

  if (sectionKey === "access_sponsorship_capacity") {
    const access = sectionData as AccessSponsorshipCapacitySectionData;
    if (access.overage_approver_contact_id) {
      issues.push(
        ...validateContactReferences(
          sectionKey,
          [
            {
              fieldKey: "overage_approver_contact_id",
              rowId: access.overage_approver_contact_id
            }
          ],
          allSections
        )
      );
    }
  }

  if (sectionKey === "staff_dashboard_plan") {
    const staff = sectionData as StaffDashboardPlanSectionData;
    if (staff.planned_users) {
      issues.push(
        ...duplicateIssues(
          sectionKey,
          "planned_users",
          staff.planned_users as Array<
            PlannedDashboardUser & { stable_row_id: string }
          >,
          (row) => row.work_email
        )
      );
    }
    if (staff.primary_dashboard_administrator_row_id) {
      const administrator = staff.planned_users?.find(
        (row) =>
          row.stable_row_id ===
          staff.primary_dashboard_administrator_row_id
      );
      if (!administrator) {
        issues.push(
          issue(
            sectionKey,
            "primary_dashboard_administrator_row_id",
            "invalid_reference",
            "Choose a primary administrator from the planned users."
          )
        );
      } else if (
        mode !== "draft_save" &&
        administrator.requested_role !== "partner_administrator"
      ) {
        issues.push(
          issue(
            sectionKey,
            "primary_dashboard_administrator_row_id",
            "invalid_reference",
            "The primary dashboard administrator must have the partner administrator role.",
            administrator.stable_row_id
          )
        );
      }
    }
  }

  if (sectionKey === "support_referrals_reporting") {
    const support = sectionData as SupportReferralsReportingSectionData;
    if (support.report_recipients) {
      issues.push(
        ...duplicateIssues(
          sectionKey,
          "report_recipients",
          support.report_recipients as Array<
            OnboardingReportRecipient & { stable_row_id: string }
          >,
          (row) => row.work_email
        )
      );
    }

    issues.push(
      ...validateContactReferences(
        sectionKey,
        [
          {
            fieldKey: "partner_staff_support_contact_id",
            rowId: support.partner_staff_support_contact_id
          },
          {
            fieldKey: "urgent_escalation_contact_id",
            rowId: support.urgent_escalation_contact_id
          }
        ],
        allSections
      )
    );

    if (
      mode !== "draft_save" &&
      support.contested_matter_procedure &&
      !describesRequiredContestedMatterStop(
        support.contested_matter_procedure
      )
    ) {
      issues.push(
        issue(
          sectionKey,
          "contested_matter_procedure",
          "invalid_value",
          "Explain that the self-help path stops for a prosecutor objection, contested hearing, or individualized advocacy, and that the approved referral or escalation process then applies."
        )
      );
    }
  }

  return issues;
}

function validateContactReferences(
  sectionKey: OnboardingSectionKey,
  references: readonly { fieldKey: string; rowId?: string | null }[],
  allSections: OnboardingPartnerData
): OnboardingValidationIssue[] {
  const contacts =
    allSections.organization_contacts?.contacts?.map(
      (contact) => contact.stable_row_id
    ) ?? [];
  const ids = new Set(contacts);

  return references.flatMap(({ fieldKey, rowId }) => {
    if (!rowId || ids.has(rowId)) {
      return [];
    }
    return [
      issue(
        sectionKey,
        fieldKey,
        "invalid_reference",
        "Choose a contact saved in Organization and contacts."
      )
    ];
  });
}

function describesRequiredContestedMatterStop(value: string): boolean {
  const normalized = value.toLowerCase();
  return (
    /self[- ]help/u.test(normalized) &&
    /\bstop(?:s|ped)?\b/u.test(normalized) &&
    /prosecutor/u.test(normalized) &&
    /(contested|hearing)/u.test(normalized) &&
    /(advocacy|representation|attorney|lawyer|counsel)/u.test(normalized) &&
    /(referral|escalation)/u.test(normalized)
  );
}

function completenessIssues(
  sectionKey: OnboardingSectionKey,
  data: OnboardingPartnerData,
  context: OnboardingValidationContext
): OnboardingValidationIssue[] {
  const completion = calculateOnboardingCompletion(data, context);
  return completion.missingRequirements
    .filter((requirement) => requirement.sectionKey === sectionKey)
    .map((requirement) =>
      issue(
        sectionKey,
        requirement.fieldKey,
        "missing_required",
        `${requirement.label} is required.`,
        requirement.rowId
      )
    );
}

export function validateOnboardingSection<K extends OnboardingSectionKey>(
  sectionKey: K,
  input: unknown,
  mode: OnboardingValidationMode = "draft_save",
  context: OnboardingValidationContext = {}
): OnboardingValidationResult<OnboardingSectionDataMap[K]> {
  const ownershipIssues = inspectTopLevelOwnership(sectionKey, input);
  const parsed = sectionSchemas[sectionKey].safeParse(input);

  if (!parsed.success) {
    return {
      success: false,
      issues: [
        ...ownershipIssues,
        ...mapZodIssues(
          sectionKey,
          input,
          parsed.error.issues,
          ownershipIssues
        )
      ]
    };
  }

  const normalized = parsed.data as OnboardingSectionDataMap[K];
  const allSections: OnboardingPartnerData = {
    ...(context.allSections ?? {}),
    [sectionKey]: normalized
  };
  const issues = [
    ...ownershipIssues,
    ...sectionCrossFieldIssues(
      sectionKey,
      normalized,
      allSections,
      mode
    )
  ];

  if (mode !== "draft_save") {
    issues.push(...completenessIssues(sectionKey, allSections, context));
  }

  return issues.length > 0
    ? { success: false, data: normalized, issues }
    : { success: true, data: normalized, issues: [] };
}

export function validateFinalOnboardingSubmission(
  input: unknown,
  context: OnboardingValidationContext
): OnboardingValidationResult<OnboardingPartnerData> {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    return {
      success: false,
      issues: [
        issue(
          "organization_contacts",
          "package",
          "invalid_type",
          "The onboarding package must be an object."
        )
      ]
    };
  }

  const source = input as Record<string, unknown>;
  const issues: OnboardingValidationIssue[] = [];
  const normalized: OnboardingPartnerData = {};
  const allowedSections = new Set<string>(ONBOARDING_SECTION_ORDER);

  for (const key of Object.keys(source)) {
    if (!allowedSections.has(key)) {
      issues.push(
        issue(
          "organization_contacts",
          key,
          "unknown_field",
          "This section is not part of the onboarding package."
        )
      );
    }
  }

  const allSectionsForReferences = source as OnboardingPartnerData;
  for (const sectionKey of ONBOARDING_SECTION_ORDER) {
    const result = validateOnboardingSection(
      sectionKey,
      source[sectionKey] ?? {},
      "final_submit",
      {
        ...context,
        allSections: allSectionsForReferences
      }
    );
    if (result.data) {
      normalized[sectionKey] = result.data;
    }
    if (!result.success) {
      issues.push(...result.issues);
    }
  }

  if (!context.commercialGateOutcome || context.commercialGateOutcome === "blocked") {
    issues.push(
      issue(
        "review_authorization",
        "commercial_gate",
        "commercial_gate_blocked",
        "The authoritative commercial gate must be clear before submission."
      )
    );
  }

  if ((context.unresolvedChangeRequests?.length ?? 0) > 0) {
    for (const changeRequest of context.unresolvedChangeRequests ?? []) {
      issues.push(
        issue(
          changeRequest.sectionKey,
          "change_request",
          "change_request_unresolved",
          "Resolve the requested changes before submitting."
        )
      );
    }
  }

  for (const category of getMissingRequiredAssets(normalized, context)) {
    issues.push(
      issue(
        "brand_public_page",
        category,
        "required_asset_missing",
        "Upload this required organizational asset before submitting."
      )
    );
  }

  return issues.length > 0
    ? { success: false, data: normalized, issues }
    : { success: true, data: normalized, issues: [] };
}
