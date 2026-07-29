import {
  ONBOARDING_ASSET_DEFINITIONS,
  ONBOARDING_SCHEMA_REGISTRY,
  ONBOARDING_SECTION_DEFINITIONS,
  ONBOARDING_SECTION_ORDER
} from "./schema";
import type {
  OnboardingBlockerCode,
  OnboardingCompletion,
  OnboardingConditionalRule,
  OnboardingDerivationContext,
  OnboardingDerivedSummary,
  OnboardingFieldDefinition,
  OnboardingNextActionCode,
  OnboardingPartnerData,
  OnboardingRequirementProgress,
  OnboardingSectionKey,
  OrganizationalAssetCategory,
  SectionTransitionDecision,
  SectionTransitionInput,
  WorkspaceTransitionDecision,
  WorkspaceTransitionInput
} from "./types";

export const ONBOARDING_BLOCKER_COPY: Readonly<
  Record<OnboardingBlockerCode, string>
> = {
  commercial_gate_blocked:
    "Setup is waiting for the commercial requirements shown in your agreement summary.",
  partner_changes_requested:
    "LegalEase requested updates to part of your onboarding package.",
  pending_prefill_review:
    "LegalEase pre-filled information that your organization still needs to review.",
  required_asset_missing:
    "A required organizational asset still needs to be uploaded.",
  required_procurement_item_missing:
    "A required procurement item still needs attention.",
  required_section_incomplete:
    "A required onboarding section still needs information."
};

export const ONBOARDING_NEXT_ACTION_COPY: Readonly<
  Record<OnboardingNextActionCode, string>
> = {
  complete_commercial_requirements:
    "Complete the requested commercial or procurement step.",
  address_change_request: "Review and respond to the requested changes.",
  review_prefilled_information: "Review the pre-filled information.",
  upload_required_asset: "Upload the required organizational asset.",
  complete_procurement_item: "Complete the required procurement item.",
  complete_section: "Continue the next incomplete setup section.",
  submit_for_review: "Review and submit the onboarding package.",
  await_legalease_review: "LegalEase is reviewing the submitted package.",
  prepare_for_launch: "LegalEase will coordinate launch preparation.",
  program_live: "Program setup is complete and the program is live.",
  program_paused: "The program is currently paused.",
  onboarding_closed: "This onboarding workspace is closed."
};

type DerivationConditionContext = Partial<OnboardingDerivationContext>;

function getSectionRecord(
  data: OnboardingPartnerData,
  sectionKey: OnboardingSectionKey
): Record<string, unknown> {
  return (data[sectionKey] ?? {}) as Record<string, unknown>;
}

export function isConditionalRuleActive(
  rule: OnboardingConditionalRule,
  data: OnboardingPartnerData,
  context: DerivationConditionContext = {}
): boolean {
  const goals = getSectionRecord(data, "program_goals");
  const geography = getSectionRecord(
    data,
    "geography_audience_language_accessibility"
  );
  const access = getSectionRecord(data, "access_sponsorship_capacity");

  switch (rule) {
    case "program_has_fixed_end":
      return goals.ongoing === false;
    case "known_barriers_include_other":
      return (
        Array.isArray(goals.known_barriers) &&
        goals.known_barriers.includes("other")
      );
    case "access_model_requires_code_plan":
      return (
        access.participant_access_model === "optional_code" ||
        access.participant_access_model === "required_code" ||
        access.participant_access_model === "invite_only"
      );
    case "counties_are_configured":
      return Array.isArray(geography.counties) && geography.counties.length > 0;
    case "recordshield_is_in_scope":
      return context.recordShieldInScope === true;
    case "overage_approval_is_required":
      return context.overageApprovalRequired === true;
    case "procurement_is_required":
      return context.procurementRequired === true;
  }
}

export function isFieldActive(
  field: OnboardingFieldDefinition,
  data: OnboardingPartnerData,
  context: DerivationConditionContext = {}
): boolean {
  return (
    !field.activeWhen ||
    isConditionalRuleActive(field.activeWhen, data, context)
  );
}

export function isFieldRequired(
  field: OnboardingFieldDefinition,
  data: OnboardingPartnerData,
  context: DerivationConditionContext = {}
): boolean {
  if (field.ownership !== "partner_editable") {
    return false;
  }

  if (field.requirement === "required") {
    return true;
  }

  if (field.requirement === "conditional" && field.requiredWhen) {
    return isConditionalRuleActive(field.requiredWhen, data, context);
  }

  return false;
}

function hasCompletedValue(
  field: OnboardingFieldDefinition,
  value: unknown
): boolean {
  if (field.requiredValue !== undefined) {
    return value === field.requiredValue;
  }

  if (field.dataType === "boolean") {
    return typeof value === "boolean";
  }

  if (field.dataType === "integer") {
    return (
      typeof value === "number" &&
      Number.isSafeInteger(value) &&
      value >= 0
    );
  }

  if (
    field.dataType === "string_array" ||
    field.dataType === "contact_collection" ||
    field.dataType === "planned_user_collection" ||
    field.dataType === "report_recipient_collection"
  ) {
    if (!Array.isArray(value)) {
      return false;
    }
    return value.length >= (field.minCount ?? 0);
  }

  return typeof value === "string" && value.trim().length > 0;
}

function addRequirement(
  requirements: OnboardingRequirementProgress[],
  field: OnboardingFieldDefinition,
  completed: boolean,
  rowId?: string
): void {
  requirements.push({
    sectionKey: field.sectionKey,
    fieldKey: String(field.key),
    label: field.label,
    completed,
    weight: field.completionWeight,
    rowId
  });
}

export function calculateOnboardingCompletion(
  data: OnboardingPartnerData,
  context: DerivationConditionContext = {}
): OnboardingCompletion {
  const requirements: OnboardingRequirementProgress[] = [];

  for (const sectionKey of ONBOARDING_SECTION_ORDER) {
    const sectionData = getSectionRecord(data, sectionKey);
    const topLevelFields = ONBOARDING_SCHEMA_REGISTRY.filter(
      (field) =>
        field.sectionKey === sectionKey &&
        !field.parentCollection &&
        field.completionWeight > 0 &&
        isFieldActive(field, data, context) &&
        isFieldRequired(field, data, context)
    );

    for (const field of topLevelFields) {
      const value = sectionData[field.dataKey];
      addRequirement(requirements, field, hasCompletedValue(field, value));

      if (
        !(
          field.dataType === "contact_collection" ||
          field.dataType === "planned_user_collection" ||
          field.dataType === "report_recipient_collection"
        ) ||
        !Array.isArray(value)
      ) {
        continue;
      }

      const rowFields = ONBOARDING_SCHEMA_REGISTRY.filter(
        (candidate) =>
          candidate.parentCollection === field.dataKey &&
          candidate.completionWeight > 0 &&
          isFieldRequired(candidate, data, context)
      );

      value.forEach((rawRow, rowIndex) => {
        const row =
          rawRow && typeof rawRow === "object"
            ? (rawRow as Record<string, unknown>)
            : {};
        const rowId =
          typeof row.stable_row_id === "string"
            ? row.stable_row_id
            : `row-${rowIndex + 1}`;

        for (const rowField of rowFields) {
          addRequirement(
            requirements,
            rowField,
            hasCompletedValue(rowField, row[rowField.dataKey]),
            rowId
          );
        }
      });
    }
  }

  const totalWeight = requirements.reduce(
    (sum, requirement) => sum + requirement.weight,
    0
  );
  const completedWeight = requirements.reduce(
    (sum, requirement) =>
      sum + (requirement.completed ? requirement.weight : 0),
    0
  );
  const percentage =
    totalWeight === 0
      ? 0
      : Math.round((completedWeight / totalWeight) * 100);

  return {
    completedWeight,
    totalWeight,
    percentage,
    requirements,
    missingRequirements: requirements.filter(
      (requirement) => !requirement.completed
    )
  };
}

export function getMissingRequiredAssets(
  data: OnboardingPartnerData,
  context: DerivationConditionContext = {}
): readonly OrganizationalAssetCategory[] {
  const present = new Set(context.presentAssetCategories ?? []);

  return ONBOARDING_ASSET_DEFINITIONS.filter((asset) => {
    const required =
      asset.requirement === "required" ||
      (asset.requirement === "conditional" &&
        asset.requiredWhen &&
        isConditionalRuleActive(asset.requiredWhen, data, context));
    return required && !present.has(asset.category);
  }).map((asset) => asset.category);
}

function firstSectionByCanonicalOrder(
  sectionKeys: readonly OnboardingSectionKey[]
): OnboardingSectionKey | undefined {
  const keys = new Set(sectionKeys);
  return ONBOARDING_SECTION_ORDER.find((sectionKey) => keys.has(sectionKey));
}

export function deriveOnboardingSummary(
  data: OnboardingPartnerData,
  context: OnboardingDerivationContext
): OnboardingDerivedSummary {
  const completion = calculateOnboardingCompletion(data, context);

  if (context.commercialGateOutcome === "blocked") {
    return buildSummary(
      completion,
      "commercial_gate_blocked",
      "complete_commercial_requirements",
      "partner"
    );
  }

  const changeRequestSection = firstSectionByCanonicalOrder(
    (context.unresolvedChangeRequests ?? [])
      .filter((request) => request.status === "open")
      .map((request) => request.sectionKey)
  );
  if (changeRequestSection) {
    return {
      ...buildSummary(
        completion,
        "partner_changes_requested",
        "address_change_request",
        "partner"
      ),
      nextSectionKey: changeRequestSection
    };
  }

  const pendingPrefillSection = firstSectionByCanonicalOrder(
    context.pendingPrefillSections ?? []
  );
  if (pendingPrefillSection) {
    return {
      ...buildSummary(
        completion,
        "pending_prefill_review",
        "review_prefilled_information",
        "partner"
      ),
      nextActionCopy: `Review pre-filled information in ${
        ONBOARDING_SECTION_DEFINITIONS.find(
          (section) => section.key === pendingPrefillSection
        )?.label ?? "program setup"
      }.`,
      nextSectionKey: pendingPrefillSection
    };
  }

  const firstIncompleteSection = firstSectionByCanonicalOrder(
    completion.missingRequirements.map(
      (requirement) => requirement.sectionKey
    )
  );
  if (firstIncompleteSection) {
    return {
      ...buildSummary(
        completion,
        "required_section_incomplete",
        "complete_section",
        "partner"
      ),
      nextSectionKey: firstIncompleteSection
    };
  }

  const missingAssets = getMissingRequiredAssets(data, context);
  const missingAsset = missingAssets.find(
    (category) => category !== "procurement_document"
  );
  if (missingAsset) {
    return {
      ...buildSummary(
        completion,
        "required_asset_missing",
        "upload_required_asset",
        "partner"
      ),
      nextSectionKey: "brand_public_page",
      missingAssetCategory: missingAsset
    };
  }

  if (
    context.procurementItemsMissing === true ||
    missingAssets.includes("procurement_document")
  ) {
    return {
      ...buildSummary(
        completion,
        "required_procurement_item_missing",
        "complete_procurement_item",
        "partner"
      ),
      nextSectionKey: "brand_public_page",
      missingAssetCategory: missingAssets.includes("procurement_document")
        ? "procurement_document"
        : undefined
    };
  }

  const incompleteSectionState = context.sectionStatuses
    ? ONBOARDING_SECTION_ORDER.find((sectionKey) => {
        const status = context.sectionStatuses?.[sectionKey];
        return !(
          status &&
          ["submitted", "approved", "waived", "not_applicable"].includes(
            status
          )
        );
      })
    : undefined;
  if (
    incompleteSectionState &&
    !["ready_for_review", "ready_to_launch", "live", "paused", "closed"].includes(
      context.workspaceStatus
    )
  ) {
    return {
      ...buildSummary(
        completion,
        "required_section_incomplete",
        "complete_section",
        "partner"
      ),
      nextSectionKey: incompleteSectionState
    };
  }

  if (
    (context.unresolvedChangeRequests ?? []).some(
      (request) => request.status === "partner_responded"
    )
  ) {
    return buildSummary(
      completion,
      null,
      "await_legalease_review",
      "legalease"
    );
  }

  switch (context.workspaceStatus) {
    case "ready_for_review":
      return buildSummary(
        completion,
        null,
        "await_legalease_review",
        "legalease"
      );
    case "ready_to_launch":
      return buildSummary(
        completion,
        null,
        "prepare_for_launch",
        "legalease"
      );
    case "live":
      return buildSummary(completion, null, "program_live", "none");
    case "paused":
      return buildSummary(completion, null, "program_paused", "legalease");
    case "closed":
      return buildSummary(completion, null, "onboarding_closed", "none");
    default:
      return {
        ...buildSummary(
          completion,
          null,
          "submit_for_review",
          "partner"
        ),
        nextSectionKey: "review_authorization"
      };
  }
}

function buildSummary(
  completion: OnboardingCompletion,
  blockerCode: OnboardingBlockerCode | null,
  nextActionCode: OnboardingNextActionCode,
  nextActionOwner: OnboardingDerivedSummary["nextActionOwner"]
): OnboardingDerivedSummary {
  return {
    completion,
    blockerCode,
    blockerCopy: blockerCode ? ONBOARDING_BLOCKER_COPY[blockerCode] : null,
    nextActionCode,
    nextActionCopy: ONBOARDING_NEXT_ACTION_COPY[nextActionCode],
    nextActionOwner
  };
}

const PRE_LIVE_CLOSABLE_STATUSES = new Set([
  "draft",
  "commercially_blocked",
  "setup_in_progress",
  "waiting_on_partner",
  "ready_for_review",
  "ready_to_launch"
]);

function deny(
  code: Exclude<WorkspaceTransitionDecision, { allowed: true }>["code"],
  message: string
): WorkspaceTransitionDecision {
  return { allowed: false, code, message };
}

export function evaluateWorkspaceTransition(
  transition: WorkspaceTransitionInput
): WorkspaceTransitionDecision {
  const {
    from,
    to,
    actor,
    cause,
    commercialGateOutcome,
    partnerRequirementsComplete,
    hasUnresolvedChangeRequests,
    reviewApproved
  } = transition;

  if (from === null && to === "draft" && cause === "workspace_created") {
    return actor === "internal"
      ? { allowed: true }
      : deny(
          "actor_not_allowed",
          "Only an authorized internal actor may create an onboarding workspace."
        );
  }

  if (
    from &&
    PRE_LIVE_CLOSABLE_STATUSES.has(from) &&
    to === "closed" &&
    cause === "workspace_closed"
  ) {
    return actor === "internal"
      ? { allowed: true }
      : deny(
          "actor_not_allowed",
          "Only an authorized internal actor may close an onboarding workspace."
        );
  }

  if (
    from === "draft" &&
    to === "commercially_blocked" &&
    cause === "commercial_gate_blocked"
  ) {
    return actor === "internal" || actor === "system"
      ? { allowed: true }
      : deny(
          "actor_not_allowed",
          "A partner cannot set the commercial gate."
        );
  }

  if (
    (from === "draft" || from === "commercially_blocked") &&
    to === "setup_in_progress" &&
    cause === "commercial_gate_cleared"
  ) {
    if (actor !== "internal" && actor !== "system") {
      return deny(
        "actor_not_allowed",
        "A partner cannot clear the commercial gate."
      );
    }
    return commercialGateOutcome === "blocked"
      ? deny(
          "commercial_gate_blocked",
          "Setup cannot begin until the authoritative commercial gate is clear."
        )
      : { allowed: true };
  }

  if (
    from === "setup_in_progress" &&
    to === "ready_for_review" &&
    cause === "partner_submitted"
  ) {
    if (actor !== "partner") {
      return deny(
        "actor_not_allowed",
        "Only an authorized partner administrator may submit onboarding."
      );
    }
    if (commercialGateOutcome === "blocked") {
      return deny(
        "commercial_gate_blocked",
        "Onboarding cannot be submitted while the commercial gate is blocked."
      );
    }
    if (!partnerRequirementsComplete) {
      return deny(
        "requirements_incomplete",
        "All active partner requirements must be complete before submission."
      );
    }
    if (hasUnresolvedChangeRequests) {
      return deny(
        "change_request_unresolved",
        "Requested changes must be addressed before resubmission."
      );
    }
    return { allowed: true };
  }

  if (
    from === "ready_for_review" &&
    to === "waiting_on_partner" &&
    cause === "change_requested"
  ) {
    if (actor !== "internal") {
      return deny(
        "actor_not_allowed",
        "Only an authorized internal reviewer may request changes."
      );
    }
    return hasUnresolvedChangeRequests
      ? { allowed: true }
      : deny(
          "change_request_required",
          "A partner-safe section change request is required."
        );
  }

  if (
    from === "waiting_on_partner" &&
    to === "setup_in_progress" &&
    cause === "partner_resumed"
  ) {
    return actor === "partner"
      ? { allowed: true }
      : deny(
          "actor_not_allowed",
          "Only an authorized partner administrator may resume requested work."
        );
  }

  if (
    from === "ready_for_review" &&
    to === "ready_to_launch" &&
    cause === "review_approved"
  ) {
    if (actor !== "internal") {
      return deny(
        "actor_not_allowed",
        "Only an authorized internal reviewer may mark setup ready for launch."
      );
    }
    if (commercialGateOutcome === "blocked") {
      return deny(
        "commercial_gate_blocked",
        "Launch preparation cannot be approved while the commercial gate is blocked."
      );
    }
    if (hasUnresolvedChangeRequests) {
      return deny(
        "change_request_unresolved",
        "Requested changes must be resolved before launch preparation."
      );
    }
    return reviewApproved
      ? { allowed: true }
      : deny(
          "review_not_approved",
          "The internal review decision must be approved."
        );
  }

  return deny(
    "transition_not_allowed",
    "That onboarding status transition is not available in Phase 1."
  );
}

export function assertWorkspaceTransition(
  transition: WorkspaceTransitionInput
): void {
  const decision = evaluateWorkspaceTransition(transition);
  if (!decision.allowed) {
    throw new Error(`${decision.code}: ${decision.message}`);
  }
}

function denySection(
  code: Exclude<SectionTransitionDecision, { allowed: true }>["code"],
  message: string
): SectionTransitionDecision {
  return { allowed: false, code, message };
}

export function evaluateSectionTransition(
  transition: SectionTransitionInput
): SectionTransitionDecision {
  const {
    from,
    to,
    actor,
    cause,
    sectionComplete,
    partnerSafeInstructionsPresent,
    internalReasonPresent
  } = transition;

  if (
    from === "not_started" &&
    to === "in_progress" &&
    cause === "partner_started"
  ) {
    return actor === "partner"
      ? { allowed: true }
      : denySection(
          "actor_not_allowed",
          "Only an authorized partner editor may start a section."
        );
  }

  if (
    from === "in_progress" &&
    to === "submitted" &&
    cause === "partner_completed"
  ) {
    if (actor !== "partner") {
      return denySection(
        "actor_not_allowed",
        "Only an authorized partner editor may complete a section."
      );
    }
    return sectionComplete
      ? { allowed: true }
      : denySection(
          "section_incomplete",
          "Complete the active section requirements before continuing."
        );
  }

  if (
    from === "needs_changes" &&
    to === "in_progress" &&
    cause === "partner_started"
  ) {
    return actor === "partner"
      ? { allowed: true }
      : denySection(
          "actor_not_allowed",
          "Only an authorized partner editor may resume requested work."
        );
  }

  if (
    from === "needs_changes" &&
    to === "submitted" &&
    cause === "partner_resubmitted"
  ) {
    if (actor !== "partner") {
      return denySection(
        "actor_not_allowed",
        "Only an authorized partner editor may resubmit a section."
      );
    }
    return sectionComplete
      ? { allowed: true }
      : denySection(
          "section_incomplete",
          "Complete the requested section requirements before resubmitting."
        );
  }

  if (
    from === "submitted" &&
    to === "needs_changes" &&
    cause === "change_requested"
  ) {
    if (actor !== "internal") {
      return denySection(
        "actor_not_allowed",
        "Only an authorized internal reviewer may request changes."
      );
    }
    return partnerSafeInstructionsPresent
      ? { allowed: true }
      : denySection(
          "instructions_required",
          "Partner-safe change instructions are required."
        );
  }

  if (
    from === "submitted" &&
    to === "approved" &&
    cause === "section_approved"
  ) {
    if (actor !== "internal") {
      return denySection(
        "actor_not_allowed",
        "Only an authorized internal reviewer may approve a section."
      );
    }
    return internalReasonPresent
      ? { allowed: true }
      : denySection(
          "reason_required",
          "An internal review reason is required."
        );
  }

  if (
    (to === "waived" && cause === "section_waived") ||
    (to === "not_applicable" && cause === "section_not_applicable")
  ) {
    if (actor !== "internal") {
      return denySection(
        "actor_not_allowed",
        "Only an authorized internal reviewer may waive a section requirement."
      );
    }
    return internalReasonPresent
      ? { allowed: true }
      : denySection(
          "reason_required",
          "An internal reason is required for this review decision."
        );
  }

  return denySection(
    "transition_not_allowed",
    "That section status transition is not available in Phase 1."
  );
}

export function assertSectionTransition(
  transition: SectionTransitionInput
): void {
  const decision = evaluateSectionTransition(transition);
  if (!decision.allowed) {
    throw new Error(`${decision.code}: ${decision.message}`);
  }
}
