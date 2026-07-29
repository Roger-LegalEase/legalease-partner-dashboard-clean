// Type-only, so this domain module pulls in none of the server-only service.
import type { ArtifactBoardEntry } from "./artifact-service";
import type { ArtifactSourceInput } from "./artifact-domain";

/**
 * Launch readiness, derived rather than stored.
 *
 * Every automated check below reads real data through the same canonical
 * projection the generators use. There is no stored automated state to drift
 * away from the truth, and there is no check whose status can be set by
 * clicking something: a manual check needs an authorized reviewer, and the
 * database refuses to record one without a reviewer and a timestamp.
 */

export const LAUNCH_CHECK_CATEGORIES = [
  "commercial_and_procurement",
  "configuration",
  "page_and_brand",
  "partner_team_and_reporting",
  "participant_journey",
  "training_and_resources",
  "approvals"
] as const;

export type LaunchCheckCategory = (typeof LAUNCH_CHECK_CATEGORIES)[number];

export const LAUNCH_CHECK_CATEGORY_LABELS: Readonly<
  Record<LaunchCheckCategory, string>
> = {
  commercial_and_procurement: "Commercial and procurement",
  configuration: "Configuration",
  page_and_brand: "Page and brand",
  partner_team_and_reporting: "Partner team and reporting",
  participant_journey: "Participant journey",
  training_and_resources: "Training and resources",
  approvals: "Approvals"
};

export type LaunchCheckOwner = "legalease" | "partner";
export type LaunchCheckDetermination = "automated" | "manual";

export const LAUNCH_CHECK_STATUSES = [
  "not_started",
  "passing",
  "failing",
  "needs_review",
  "waived",
  "not_applicable"
] as const;

export type LaunchCheckStatus = (typeof LAUNCH_CHECK_STATUSES)[number];

/** The statuses that satisfy a blocking check. */
const SATISFIED_STATUSES: ReadonlySet<LaunchCheckStatus> = new Set([
  "passing",
  "waived",
  "not_applicable"
]);

export function isSatisfiedLaunchCheckStatus(status: LaunchCheckStatus): boolean {
  return SATISFIED_STATUSES.has(status);
}

export type LaunchCheckDefinition = {
  key: string;
  label: string;
  category: LaunchCheckCategory;
  owner: LaunchCheckOwner;
  determination: LaunchCheckDetermination;
  blocking: boolean;
  /** Shown to a partner. Internal-only checks are withheld from that surface. */
  partnerVisible: boolean;
  /** The single next action a failing check asks for. */
  nextAction: string;
};

export type LaunchCheckEvaluation = LaunchCheckDefinition & {
  status: LaunchCheckStatus;
  evidenceSummary: string;
  evidenceReference: string;
  checkedAt: string | null;
  invalidatedAt: string | null;
  invalidatedReason: string | null;
};

export type LaunchCheckGroup = {
  category: LaunchCheckCategory;
  label: string;
  checks: LaunchCheckEvaluation[];
};

export type LaunchReadiness = {
  ready: boolean;
  groups: LaunchCheckGroup[];
  checks: LaunchCheckEvaluation[];
  blockingFailures: number;
  /** One action, not a list. The most upstream unmet blocking check. */
  primaryNextAction: {
    checkKey: string;
    label: string;
    owner: LaunchCheckOwner;
    action: string;
  } | null;
};

/** A recorded manual decision, as stored. */
export type RecordedLaunchCheck = {
  checkKey: string;
  status: LaunchCheckStatus;
  evidenceSummary: string | null;
  evidenceReference: string | null;
  checkedAt: string | null;
  invalidatedAt: string | null;
  invalidatedReason: string | null;
};

export type LaunchCheckSource = {
  source: ArtifactSourceInput;
  artifacts: readonly ArtifactBoardEntry[];
  recorded: readonly RecordedLaunchCheck[];
};

type AutomatedResult = {
  status: LaunchCheckStatus;
  evidence: string;
  reference: string;
};

/**
 * The artifact types that must be approved before a partner can launch. The
 * launch kit is produced after readiness is reached, so it is deliberately not
 * one of them.
 */
export const LAUNCH_REQUIRED_ARTIFACT_TYPES = [
  "implementation_brief",
  "operations_escalation_plan",
  "dashboard_user_reporting_matrix",
  "staff_quick_start_guide",
  "co_branded_page_configuration"
] as const;

// --- value helpers -----------------------------------------------------------

function section(
  input: ArtifactSourceInput,
  key: string
): Record<string, unknown> {
  return ((input.data as Record<string, unknown>)[key] ?? {}) as Record<
    string,
    unknown
  >;
}

function text(input: ArtifactSourceInput, sectionKey: string, dataKey: string) {
  const value = section(input, sectionKey)[dataKey];
  return typeof value === "string" && value.trim().length > 0
    ? value.trim()
    : null;
}

function rows(
  input: ArtifactSourceInput,
  sectionKey: string,
  dataKey: string
): Array<Record<string, unknown>> {
  const value = section(input, sectionKey)[dataKey];
  return Array.isArray(value) ? (value as Array<Record<string, unknown>>) : [];
}

function asset(input: ArtifactSourceInput, category: string) {
  return (
    input.assets.find(
      (candidate) =>
        candidate.category === category && candidate.lifecycleStatus !== "deleted"
    ) ?? null
  );
}

function missing(labels: string[]): string {
  return labels.length === 1 ? labels[0] : labels.join(", ");
}

// --- automated checks --------------------------------------------------------

/**
 * Each evaluator returns the state it derived and the evidence it derived it
 * from. A check with no derivation is not a check.
 */
const AUTOMATED_EVALUATORS: Readonly<
  Record<string, (input: LaunchCheckSource) => AutomatedResult>
> = {
  commercial_gate_cleared: ({ source }) => {
    const status = source.workspace.commercialGateStatus;
    const cleared = status !== "blocked";
    return {
      status: cleared ? "passing" : "failing",
      evidence: cleared
        ? `The commercial gate is recorded as ${commercialGateLabel(status)}.`
        : "The commercial gate is still blocked.",
      reference: "partner_onboarding.commercial_gate_status"
    };
  },

  agreements_and_procurement_recorded: ({ source }) => {
    const agreement = source.workspace.agreementStatus;
    const agreementRecorded =
      typeof agreement === "string" &&
      agreement.length > 0 &&
      agreement !== "not_started";
    const procurement = asset(source, "procurement_document");
    if (!agreementRecorded) {
      return {
        status: "failing",
        evidence: "No agreement status has been recorded for this partner.",
        reference: "partner_onboarding.agreement_status"
      };
    }
    return {
      status: "passing",
      evidence: procurement
        ? `Agreement status ${agreementLabel(agreement)}, with a procurement document on file.`
        : `Agreement status ${agreementLabel(agreement)}. No procurement document was requested.`,
      reference: "partner_onboarding.agreement_status, asset.procurement_document"
    };
  },

  onboarding_sections_complete: ({ source }) => {
    const statuses = source.sectionStatuses ?? {};
    const entries = Object.entries(statuses);
    if (entries.length === 0) {
      return {
        status: "failing",
        evidence: "No onboarding section has been started.",
        reference: "partner_onboarding_sections.status"
      };
    }
    const unfinished = entries.filter(
      ([, value]) => !["approved", "waived", "not_applicable"].includes(value)
    );
    if (unfinished.length === 0) {
      return {
        status: "passing",
        evidence: `All ${entries.length} onboarding sections are approved or waived.`,
        reference: "partner_onboarding_sections.status"
      };
    }
    const submitted = unfinished.every(([, value]) => value === "submitted");
    return {
      status: submitted ? "needs_review" : "failing",
      evidence: submitted
        ? `${unfinished.length} submitted sections are waiting on LegalEase review.`
        : `${unfinished.length} sections are not yet complete.`,
      reference: "partner_onboarding_sections.status"
    };
  },

  access_model_and_capacity_present: ({ source }) => {
    const model = text(source, "access_sponsorship_capacity", "participant_access_model");
    const allocation = source.readOnlyValues.screening_allocation;
    const gaps: string[] = [];
    if (!model) gaps.push("participant access model");
    if (allocation == null) gaps.push("screening allocation");
    if (gaps.length > 0) {
      return {
        status: "failing",
        evidence: `Missing ${missing(gaps)}.`,
        reference:
          "access_sponsorship_capacity.participant_access_model, partner_entitlement.screenings_allowed"
      };
    }
    return {
      status: "passing",
      evidence: `Access model recorded, with an allocation of ${allocation} screenings.`,
      reference:
        "access_sponsorship_capacity.participant_access_model, partner_entitlement.screenings_allowed"
    };
  },

  required_logo_present: ({ source }) => {
    const logo = asset(source, "transparent_logo");
    if (!logo) {
      return {
        status: "failing",
        evidence: "No transparent logo has been uploaded.",
        reference: "partner_onboarding_assets.transparent_logo"
      };
    }
    return {
      status: "passing",
      evidence: `A transparent logo is on file and ${assetReviewLabel(logo.reviewStatus)}.`,
      reference: "partner_onboarding_assets.transparent_logo"
    };
  },

  public_page_fields_present: ({ source }) => {
    const required: Array<[string, string | null]> = [
      [
        "public organization name",
        source.workspace.publicDisplayName ??
          text(source, "organization_contacts", "public_organization_name")
      ],
      [
        "program headline",
        source.workspace.publicHeadline ??
          text(source, "brand_public_page", "program_headline")
      ],
      [
        "organization description",
        text(source, "brand_public_page", "approved_organization_description")
      ],
      ["primary action label", text(source, "brand_public_page", "primary_cta_label")]
    ];
    const gaps = required.filter(([, value]) => !value).map(([label]) => label);
    if (gaps.length > 0) {
      return {
        status: "failing",
        evidence: `The public page is missing ${missing(gaps)}.`,
        reference: "brand_public_page, partner_onboarding public page configuration"
      };
    }
    return {
      status: "passing",
      evidence: "Every required public page field has a value.",
      reference: "brand_public_page, partner_onboarding public page configuration"
    };
  },

  planned_partner_administrator_present: ({ source }) => {
    const planned = rows(source, "staff_dashboard_plan", "planned_users");
    const administrators = planned.filter(
      (row) => row.requested_role === "partner_administrator"
    );
    if (administrators.length === 0) {
      return {
        status: "failing",
        evidence: "No planned user is requested as a partner administrator.",
        reference: "staff_dashboard_plan.planned_users"
      };
    }
    const primary = section(source, "staff_dashboard_plan")
      .primary_dashboard_administrator_row_id;
    const primaryNamed = administrators.some(
      (row) => row.stable_row_id === primary
    );
    return {
      status: primaryNamed ? "passing" : "needs_review",
      evidence: primaryNamed
        ? `${administrators.length} planned administrator${
            administrators.length === 1 ? "" : "s"
          }, with a primary named.`
        : "A planned administrator exists but no primary has been named.",
      reference:
        "staff_dashboard_plan.planned_users, staff_dashboard_plan.primary_dashboard_administrator_row_id"
    };
  },

  report_recipients_configured: ({ source }) => {
    const recipients = rows(
      source,
      "support_referrals_reporting",
      "report_recipients"
    ).filter((row) => typeof row.work_email === "string" && row.work_email);
    const cadence = text(
      source,
      "support_referrals_reporting",
      "reporting_cadence"
    );
    const gaps: string[] = [];
    if (recipients.length === 0) gaps.push("report recipients");
    if (!cadence) gaps.push("reporting cadence");
    if (gaps.length > 0) {
      return {
        status: "failing",
        evidence: `Missing ${missing(gaps)}.`,
        reference:
          "support_referrals_reporting.report_recipients, support_referrals_reporting.reporting_cadence"
      };
    }
    return {
      status: "passing",
      evidence: `${recipients.length} report recipient${
        recipients.length === 1 ? "" : "s"
      }, reported ${(cadence ?? "").toLowerCase()}.`,
      reference:
        "support_referrals_reporting.report_recipients, support_referrals_reporting.reporting_cadence"
    };
  },

  support_and_referral_contacts_configured: ({ source }) => {
    const supportEmail = text(
      source,
      "support_referrals_reporting",
      "participant_support_email"
    );
    const referral = text(
      source,
      "support_referrals_reporting",
      "legal_services_referral_organization"
    );
    const escalationId = section(source, "support_referrals_reporting")
      .urgent_escalation_contact_id;
    const contacts = rows(source, "organization_contacts", "contacts");
    const escalationResolved = contacts.some(
      (row) => row.stable_row_id === escalationId
    );
    const gaps: string[] = [];
    if (!supportEmail) gaps.push("participant support email");
    if (!referral) gaps.push("legal-services referral organization");
    if (!escalationResolved) gaps.push("urgent escalation contact");
    if (gaps.length > 0) {
      return {
        status: "failing",
        evidence: `Missing ${missing(gaps)}.`,
        reference:
          "support_referrals_reporting.participant_support_email, .legal_services_referral_organization, .urgent_escalation_contact_id"
      };
    }
    return {
      status: "passing",
      evidence: `Participant support, the referral organization, and an urgent escalation contact are all recorded.`,
      reference:
        "support_referrals_reporting.participant_support_email, .legal_services_referral_organization, .urgent_escalation_contact_id"
    };
  },

  artifact_versions_current: ({ artifacts }) => {
    const stale = artifacts.filter(
      (entry) =>
        entry.available && entry.sourceFreshness === "stale"
    );
    if (stale.length > 0) {
      return {
        status: "failing",
        evidence: `${stale.length} document${
          stale.length === 1 ? " is" : "s are"
        } out of date with current program data: ${stale
          .map((entry) => entry.label)
          .join(", ")}.`,
        reference: "partner_onboarding_artifact_versions.normalized_snapshot"
      };
    }
    const generated = artifacts.filter(
      (entry) => entry.available && entry.currentVersion !== null
    );
    if (generated.length === 0) {
      return {
        status: "failing",
        evidence: "No document has been generated yet.",
        reference: "partner_onboarding_artifact_versions"
      };
    }
    return {
      status: "passing",
      evidence: `${generated.length} generated document${
        generated.length === 1 ? " is" : "s are"
      } current with program data.`,
      reference: "partner_onboarding_artifact_versions.normalized_snapshot"
    };
  },

  required_artifact_approvals_complete: ({ artifacts }) => {
    const required = artifacts.filter((entry) =>
      (LAUNCH_REQUIRED_ARTIFACT_TYPES as readonly string[]).includes(
        entry.artifactType
      )
    );
    const unapproved = required.filter(
      (entry) => entry.currentVersion?.approvalStatus !== "approved"
    );
    if (unapproved.length > 0) {
      return {
        status: "failing",
        evidence: `${unapproved.length} required document${
          unapproved.length === 1 ? " is" : "s are"
        } not approved: ${unapproved.map((entry) => entry.label).join(", ")}.`,
        reference: "partner_onboarding_artifact_versions.approval_status"
      };
    }
    return {
      status: "passing",
      evidence: `All ${required.length} required documents are approved by LegalEase.`,
      reference: "partner_onboarding_artifact_versions.approval_status"
    };
  }
};

function commercialGateLabel(value: string): string {
  switch (value) {
    case "cleared_by_paid_invoice":
      return "cleared by a paid invoice";
    case "cleared_by_approved_purchase_order":
      return "cleared by an approved purchase order";
    case "cleared_by_authorized_internal_override":
      return "cleared by an authorized internal override";
    default:
      return "blocked";
  }
}

function agreementLabel(value: string): string {
  return value.replace(/_/g, " ");
}

function assetReviewLabel(value: string): string {
  switch (value) {
    case "approved":
      return "approved";
    case "rejected":
      return "rejected in review";
    default:
      return "awaiting review";
  }
}

// --- the catalogue -----------------------------------------------------------

export const LAUNCH_CHECK_DEFINITIONS: readonly LaunchCheckDefinition[] = [
  {
    key: "commercial_gate_cleared",
    label: "Commercial gate cleared",
    category: "commercial_and_procurement",
    owner: "legalease",
    determination: "automated",
    blocking: true,
    partnerVisible: false,
    nextAction: "Record the authoritative commercial outcome on this workspace."
  },
  {
    key: "agreements_and_procurement_recorded",
    label: "Agreements and procurement recorded",
    category: "commercial_and_procurement",
    owner: "legalease",
    determination: "automated",
    blocking: true,
    partnerVisible: false,
    nextAction: "Record the agreement status, and the procurement document if one was requested."
  },
  {
    key: "onboarding_sections_complete",
    label: "Onboarding sections complete and approved",
    category: "configuration",
    owner: "partner",
    determination: "automated",
    blocking: true,
    partnerVisible: true,
    nextAction: "Complete and submit the remaining program setup sections."
  },
  {
    key: "access_model_and_capacity_present",
    label: "Access model and capacity present",
    category: "configuration",
    owner: "partner",
    determination: "automated",
    blocking: true,
    partnerVisible: true,
    nextAction: "Choose a participant access model in Access, sponsorship, and capacity plan."
  },
  {
    key: "required_logo_present",
    label: "Required logo present",
    category: "page_and_brand",
    owner: "partner",
    determination: "automated",
    blocking: true,
    partnerVisible: true,
    nextAction: "Upload a transparent logo in Brand and public-page content."
  },
  {
    key: "public_page_fields_present",
    label: "Public page fields present",
    category: "page_and_brand",
    owner: "partner",
    determination: "automated",
    blocking: true,
    partnerVisible: true,
    nextAction: "Fill in the remaining public page fields in Brand and public-page content."
  },
  {
    key: "planned_partner_administrator_present",
    label: "Planned partner administrator present",
    category: "partner_team_and_reporting",
    owner: "partner",
    determination: "automated",
    blocking: true,
    partnerVisible: true,
    nextAction: "Name a planned partner administrator in Staff and dashboard plan."
  },
  {
    key: "report_recipients_configured",
    label: "Report recipients configured",
    category: "partner_team_and_reporting",
    owner: "partner",
    determination: "automated",
    blocking: true,
    partnerVisible: true,
    nextAction: "Add a report recipient and a reporting cadence in Support, legal referrals, and reporting."
  },
  {
    key: "support_and_referral_contacts_configured",
    label: "Support and referral contacts configured",
    category: "participant_journey",
    owner: "partner",
    determination: "automated",
    blocking: true,
    partnerVisible: true,
    nextAction: "Record participant support, the referral organization, and an urgent escalation contact."
  },
  {
    key: "artifact_versions_current",
    label: "Documents current with program data",
    category: "approvals",
    owner: "legalease",
    determination: "automated",
    blocking: true,
    partnerVisible: true,
    nextAction: "Regenerate the documents that are out of date with current program data."
  },
  {
    key: "required_artifact_approvals_complete",
    label: "Required document approvals complete",
    category: "approvals",
    owner: "legalease",
    determination: "automated",
    blocking: true,
    partnerVisible: true,
    nextAction: "Approve the remaining required documents."
  },
  {
    key: "staff_training_completed",
    label: "Staff training completed",
    category: "training_and_resources",
    owner: "partner",
    determination: "manual",
    blocking: true,
    partnerVisible: true,
    nextAction: "Confirm that partner staff have completed training."
  },
  {
    key: "communications_approved",
    label: "Communications approved",
    category: "training_and_resources",
    owner: "legalease",
    determination: "manual",
    blocking: false,
    partnerVisible: false,
    nextAction: "Review the outreach copy and record approval."
  },
  {
    key: "partner_launch_approval_received",
    label: "Partner launch approval received",
    category: "approvals",
    owner: "partner",
    determination: "manual",
    blocking: true,
    partnerVisible: true,
    nextAction: "Ask the partner administrator to record the launch approval."
  },
  {
    key: "legalease_final_review_complete",
    label: "LegalEase final review complete",
    category: "approvals",
    owner: "legalease",
    determination: "manual",
    blocking: true,
    partnerVisible: false,
    nextAction: "Complete the LegalEase final review."
  }
];

export function launchCheckDefinition(
  key: string
): LaunchCheckDefinition | undefined {
  return LAUNCH_CHECK_DEFINITIONS.find((definition) => definition.key === key);
}

// --- evaluation --------------------------------------------------------------

/**
 * Evaluates every check. Automated checks are derived here and now; manual
 * checks are read from what an authorized reviewer actually recorded, and an
 * invalidated decision reverts to needing review rather than silently standing.
 */
export function evaluateLaunchReadiness(
  input: LaunchCheckSource
): LaunchReadiness {
  const recordedByKey = new Map(
    input.recorded.map((row) => [row.checkKey, row])
  );

  const checks: LaunchCheckEvaluation[] = LAUNCH_CHECK_DEFINITIONS.map(
    (definition) => {
      const recorded = recordedByKey.get(definition.key) ?? null;

      if (definition.determination === "automated") {
        const evaluator = AUTOMATED_EVALUATORS[definition.key];
        const derived = evaluator(input);
        return {
          ...definition,
          status: derived.status,
          evidenceSummary: derived.evidence,
          evidenceReference: derived.reference,
          checkedAt: null,
          invalidatedAt: null,
          invalidatedReason: null
        };
      }

      if (!recorded) {
        return {
          ...definition,
          status: "not_started",
          evidenceSummary: "No reviewer has recorded this yet.",
          evidenceReference: "manual_review",
          checkedAt: null,
          invalidatedAt: null,
          invalidatedReason: null
        };
      }

      const invalidated = recorded.invalidatedAt !== null;
      return {
        ...definition,
        // An invalidated decision is not a passing one. It goes back to the
        // reviewer rather than quietly counting toward readiness.
        status: invalidated ? "needs_review" : recorded.status,
        evidenceSummary: invalidated
          ? `Recorded, then invalidated: ${recorded.invalidatedReason ?? "source data changed"}.`
          : recorded.evidenceSummary ?? "Recorded by an authorized reviewer.",
        evidenceReference: recorded.evidenceReference ?? "manual_review",
        checkedAt: recorded.checkedAt,
        invalidatedAt: recorded.invalidatedAt,
        invalidatedReason: recorded.invalidatedReason
      };
    }
  );

  const blockingFailures = checks.filter(
    (check) => check.blocking && !isSatisfiedLaunchCheckStatus(check.status)
  );

  const groups: LaunchCheckGroup[] = LAUNCH_CHECK_CATEGORIES.map((category) => ({
    category,
    label: LAUNCH_CHECK_CATEGORY_LABELS[category],
    checks: checks.filter((check) => check.category === category)
  })).filter((group) => group.checks.length > 0);

  // The most upstream unmet blocking check, in catalogue order. One action,
  // never a list.
  const primary = blockingFailures[0] ?? null;

  return {
    // Ready is the absence of every blocking failure, computed here. There is
    // no stored ready flag that could disagree with the checks on screen.
    ready: blockingFailures.length === 0,
    groups,
    checks,
    blockingFailures: blockingFailures.length,
    primaryNextAction: primary
      ? {
          checkKey: primary.key,
          label: primary.label,
          owner: primary.owner,
          action: primary.nextAction
        }
      : null
  };
}

/** The partner sees only the checks it owns or is expected to act on. */
export function partnerVisibleReadiness(
  readiness: LaunchReadiness
): LaunchReadiness {
  const checks = readiness.checks.filter((check) => check.partnerVisible);
  const blockingFailures = checks.filter(
    (check) => check.blocking && !isSatisfiedLaunchCheckStatus(check.status)
  );
  const primary = blockingFailures.find((check) => check.owner === "partner") ?? null;
  return {
    // Readiness itself is never recomputed from the filtered set: a partner
    // must not read "ready" because the checks it cannot see were hidden.
    ready: readiness.ready,
    groups: LAUNCH_CHECK_CATEGORIES.map((category) => ({
      category,
      label: LAUNCH_CHECK_CATEGORY_LABELS[category],
      checks: checks.filter((check) => check.category === category)
    })).filter((group) => group.checks.length > 0),
    checks,
    blockingFailures: blockingFailures.length,
    primaryNextAction: primary
      ? {
          checkKey: primary.key,
          label: primary.label,
          owner: primary.owner,
          action: primary.nextAction
        }
      : null
  };
}
