import crypto from "node:crypto";

import {
  ONBOARDING_SCHEMA_REGISTRY,
  ONBOARDING_ASSET_DEFINITIONS
} from "./schema";
import type {
  OnboardingArtifactConsumer,
  OnboardingPartnerData,
  OnboardingReadOnlyValues,
  OnboardingSectionKey,
  OrganizationalAssetCategory
} from "./types";

/**
 * Phase 2A artifact types. All six are registered now so that Lane B2 adds
 * generators rather than schema.
 */
export const ARTIFACT_TYPES = [
  "implementation_brief",
  "operations_escalation_plan",
  "dashboard_user_reporting_matrix",
  "staff_quick_start_guide",
  "partner_launch_kit",
  "co_branded_page_configuration"
] as const;

export type ArtifactType = (typeof ARTIFACT_TYPES)[number];

/**
 * Only these types have a generator in this release. Everything else is shown
 * as not yet available rather than as a broken or empty row. The partner launch
 * kit is Lane B2b's and stays unavailable here.
 */
export const GENERATABLE_ARTIFACT_TYPES = [
  "implementation_brief",
  "operations_escalation_plan",
  "dashboard_user_reporting_matrix",
  "staff_quick_start_guide",
  "co_branded_page_configuration"
] as const;

export type GeneratableArtifactType =
  (typeof GENERATABLE_ARTIFACT_TYPES)[number];

export function isGeneratableArtifactType(
  value: string
): value is GeneratableArtifactType {
  return (GENERATABLE_ARTIFACT_TYPES as readonly string[]).includes(value);
}

export const ARTIFACT_TYPE_LABELS: Readonly<Record<ArtifactType, string>> = {
  implementation_brief: "Implementation Brief",
  operations_escalation_plan: "Operations and Escalation Plan",
  dashboard_user_reporting_matrix: "Dashboard User and Reporting Matrix",
  staff_quick_start_guide: "Staff Quick Start Guide",
  partner_launch_kit: "Partner Launch Kit",
  co_branded_page_configuration: "Co-branded Page Configuration"
};

/**
 * Phase 1 already carries an artifact-consumer taxonomy on every registry
 * field. Phase 2A maps onto it instead of introducing a second one.
 *
 * `order_form` is a Phase 1 commercial document and `launch_readiness` is B2's
 * launch-readiness engine — a computation over artifacts rather than an
 * artifact — so neither maps to a Phase 2A type.
 */
export const ARTIFACT_TYPE_CONSUMERS: Readonly<
  Record<ArtifactType, readonly OnboardingArtifactConsumer[]>
> = {
  implementation_brief: ["implementation_brief"],
  operations_escalation_plan: ["operations_plan"],
  dashboard_user_reporting_matrix: ["dashboard_user_matrix", "reporting_package"],
  staff_quick_start_guide: ["staff_quick_start"],
  partner_launch_kit: ["launch_kit"],
  co_branded_page_configuration: ["public_partner_page"]
};

/**
 * Hand-maintained. Bump this only when the rendered output of the
 * Implementation Brief actually changes — never from a file hash, build id, or
 * commit sha, and never as a side effect of a refactor.
 *
 * Bumping it is a fleet-wide invalidation event: every approved Implementation
 * Brief for every partner goes stale at once. The value is pinned by
 * scripts/verify-rcap-onboarding-artifact-domain.mjs so that a bump has to be
 * made deliberately, in the same commit as the test.
 */
export const IMPLEMENTATION_BRIEF_GENERATOR_VERSION = "implementation_brief_v1";

/**
 * Each generator carries its own hand-maintained constant, so a change to one
 * document does not invalidate the other four. The same rule applies to every
 * one of them: bump only when rendered output actually changes, and only in the
 * same commit as the assertion that pins it.
 */
export const OPERATIONS_ESCALATION_PLAN_GENERATOR_VERSION =
  "operations_escalation_plan_v1";
export const DASHBOARD_USER_REPORTING_MATRIX_GENERATOR_VERSION =
  "dashboard_user_reporting_matrix_v1";
export const STAFF_QUICK_START_GUIDE_GENERATOR_VERSION =
  "staff_quick_start_guide_v1";
export const CO_BRANDED_PAGE_CONFIGURATION_GENERATOR_VERSION =
  "co_branded_page_configuration_v1";

export const ARTIFACT_GENERATOR_VERSIONS: Readonly<
  Record<GeneratableArtifactType, string>
> = {
  implementation_brief: IMPLEMENTATION_BRIEF_GENERATOR_VERSION,
  operations_escalation_plan: OPERATIONS_ESCALATION_PLAN_GENERATOR_VERSION,
  dashboard_user_reporting_matrix:
    DASHBOARD_USER_REPORTING_MATRIX_GENERATOR_VERSION,
  staff_quick_start_guide: STAFF_QUICK_START_GUIDE_GENERATOR_VERSION,
  co_branded_page_configuration:
    CO_BRANDED_PAGE_CONFIGURATION_GENERATOR_VERSION
};

/**
 * LegalEase platform support routing. It is not partner data, but it renders in
 * partner-visible documents, so it is projected as a value rather than inlined
 * at render time: that is what makes an edit to it detectable at all, and it is
 * a LegalEase-only key, so an edit spares the partner's attestation.
 */
export const LEGALEASE_TECHNICAL_SUPPORT_ROUTE =
  "Partner staff contact LegalEase platform support through the partner dashboard support link. LegalEase does not provide legal advice or representation to participants.";

/**
 * The LegalEase-controlled public-page language, keyed by the categories
 * LEGALEASE_CONTROLLED_PUBLIC_PAGE_CONTENT already enumerates in schema.ts. The
 * partner may never edit or approve any of it. Each entry is projected as a
 * value under a LegalEase-only key, following the same rule as the technical
 * support route above.
 */
export const LEGALEASE_PUBLIC_PAGE_LANGUAGE: Readonly<
  Record<string, { heading: string; body: string }>
> = {
  legal_disclaimers: {
    heading: "Legal disclaimer",
    body:
      "LegalEase provides self-help record-clearing tools and prepared documents. LegalEase is not a law firm, does not provide legal advice, and does not represent participants. Using this program does not create an attorney-client relationship."
  },
  self_help_and_service_boundary_language: {
    heading: "What this program does and does not do",
    body:
      "This program helps a participant prepare and file their own record-clearing paperwork. It stops short of legal representation. A contested matter, a prosecutor objection, or a scheduled contested hearing leaves the self-help path and follows the approved referral route."
  },
  eligibility_and_outcome_claims: {
    heading: "Eligibility and outcomes",
    body:
      "Eligibility is decided by the court and by state law, not by this program. Nothing here guarantees that a record will be cleared or that any particular outcome will follow."
  },
  platform_privacy_and_security_representations: {
    heading: "Privacy and security",
    body:
      "Participant information is handled under the LegalEase privacy practices. LegalEase does not sell participant information."
  },
  payment_logic: {
    heading: "Cost to the participant",
    body:
      "Sponsored participants pay nothing to LegalEase for the sponsored scope of this program. Court filing fees and other government charges are set by the court, not by LegalEase."
  },
  participant_routing: {
    heading: "Where participants are sent",
    body:
      "Participant routing between screening, document preparation, and the partner's own support is controlled by LegalEase so that a participant is never left without a next step."
  },
  platform_legal_links: {
    heading: "Platform terms",
    body:
      "The LegalEase terms of service, privacy policy, and accessibility statement apply to this page and are linked from it."
  }
};

export const LEGALEASE_PUBLIC_PAGE_PROJECTION_KEYS = Object.keys(
  LEGALEASE_PUBLIC_PAGE_LANGUAGE
).map((category) => `legalease_public_page.${category}`);

/**
 * Workspace-level values that no registry field covers. `target_launch_date` is
 * the one acceptance step 5 exercises; it lives on `partner_onboarding` and is
 * writable only by LegalEase, but it renders in the partner-visible document
 * and so invalidates the partner approval too.
 */
export const WORKSPACE_LEVEL_PROJECTION_KEYS = [
  "workspace.target_launch_date",
  "workspace.commercial_gate_status",
  "workspace.public_display_name",
  "workspace.public_headline",
  "workspace.public_subheadline",
  "workspace.support_instructions",
  "workspace.show_partner_logo",
  "workspace.show_powered_by",
  "partner_record.access_mode"
] as const;

const WORKSPACE_KEYS_BY_TYPE: Readonly<
  Record<ArtifactType, readonly string[]>
> = {
  implementation_brief: [
    "workspace.target_launch_date",
    "workspace.commercial_gate_status",
    "workspace.public_display_name",
    "workspace.public_headline",
    "workspace.public_subheadline"
  ],
  operations_escalation_plan: [
    "workspace.target_launch_date",
    "workspace.commercial_gate_status",
    "workspace.support_instructions",
    "partner_record.access_mode"
  ],
  dashboard_user_reporting_matrix: ["workspace.target_launch_date"],
  staff_quick_start_guide: ["workspace.target_launch_date"],
  partner_launch_kit: ["workspace.target_launch_date"],
  co_branded_page_configuration: [
    "workspace.target_launch_date",
    "workspace.public_display_name",
    "workspace.public_headline",
    "workspace.public_subheadline",
    "workspace.support_instructions",
    "workspace.show_partner_logo",
    "workspace.show_powered_by",
    "partner_record.access_mode"
  ]
};

/**
 * Values whose change invalidates only the LegalEase approval, because the
 * partner never controlled and never attested to them. Everything else, when it
 * changes, invalidates both approvals.
 */
export const LEGALEASE_ONLY_PROJECTION_KEYS: ReadonlySet<string> = new Set([
  "workspace.public_display_name",
  "workspace.public_headline",
  "workspace.public_subheadline",
  "workspace.support_instructions",
  "workspace.show_partner_logo",
  "workspace.show_powered_by",
  "partner_record.access_mode",
  "access_sponsorship_capacity.sponsored_screening_scope",
  "access_sponsorship_capacity.sponsored_packet_scope",
  "access_sponsorship_capacity.recordshield_pathway",
  "access_sponsorship_capacity.screening_allocation",
  "access_sponsorship_capacity.packet_credits",
  "access_sponsorship_capacity.overage_behavior",
  "access_sponsorship_capacity.overage_approver_authorization",
  "support_referrals_reporting.legalease_technical_support_route",
  // The public-page language the partner may never edit or approve. A change to
  // any of it is a LegalEase change, so it invalidates the LegalEase approval
  // and leaves the partner's attestation about partner-owned content standing.
  ...LEGALEASE_PUBLIC_PAGE_PROJECTION_KEYS
]);

export type ArtifactAssetInput = {
  id: string;
  category: OrganizationalAssetCategory;
  sha256Hex: string | null;
  lifecycleStatus: string;
  reviewStatus: string;
};

export type ArtifactSourceInput = {
  workspace: {
    id: string;
    partnerSlug: string;
    aggregateVersion: number;
    status: string;
    targetLaunchDate: string | null;
    commercialGateStatus: string;
    publicDisplayName: string | null;
    publicHeadline: string | null;
    publicSubheadline: string | null;
    supportInstructions: string | null;
    showPartnerLogo: boolean | null;
    showPoweredBy: boolean | null;
  };
  partnerRecord: {
    organizationName: string;
    programName: string | null;
    accessMode: string | null;
  };
  data: OnboardingPartnerData;
  readOnlyValues: OnboardingReadOnlyValues;
  assets: readonly ArtifactAssetInput[];
  sectionRevisions: Partial<Record<OnboardingSectionKey, number>>;
  collectionRevisions: {
    contacts: Readonly<Record<string, number>>;
    plannedUsers: Readonly<Record<string, number>>;
    reportRecipients: Readonly<Record<string, number>>;
  };
};

export type ArtifactProjection = {
  artifactType: ArtifactType;
  values: Record<string, unknown>;
  hash: string;
};

export type ArtifactProvenance = {
  sourceWorkspaceVersion: number;
  sourceSectionRevisions: Record<string, number>;
  sourceAssetVersions: Record<string, string>;
};

/**
 * Deterministic JSON with sorted object keys, so that key insertion order can
 * never change a hash.
 */
export function stableArtifactJson(value: unknown): string {
  return JSON.stringify(sortValue(value));
}

function sortValue(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(sortValue);
  if (value && typeof value === "object") {
    const source = value as Record<string, unknown>;
    const sorted: Record<string, unknown> = {};
    for (const key of Object.keys(source).sort()) {
      sorted[key] = sortValue(source[key]);
    }
    return sorted;
  }
  return value;
}

export function hashArtifactSnapshot(value: unknown): string {
  return crypto.createHash("sha256").update(stableArtifactJson(value)).digest("hex");
}

/**
 * Applies the same normalization Phase 1 applies on save, so that a re-save
 * differing only in whitespace or email casing produces an identical projection
 * and is therefore non-material by construction. This is the only formatting
 * exemption and it lives in exactly one place.
 */
function normalizeProjectedValue(value: unknown, rule: string): unknown {
  if (value === null || value === undefined) return null;
  if (Array.isArray(value)) {
    return value.map((entry) => normalizeProjectedValue(entry, rule));
  }
  if (typeof value !== "string") return value;

  const nfc = value.normalize("NFC");
  switch (rule) {
    case "email_lowercase":
      return nfc.trim().toLowerCase();
    case "trim":
    case "url":
    case "date_only":
      return nfc.trim();
    case "multiline":
      return nfc.replace(/[ \t]+$/gm, "").trim();
    case "single_line":
    case "phone":
      return nfc.replace(/\s+/g, " ").trim();
    default:
      return nfc.trim();
  }
}

function consumersForType(
  artifactType: ArtifactType
): ReadonlySet<OnboardingArtifactConsumer> {
  return new Set(ARTIFACT_TYPE_CONSUMERS[artifactType]);
}

/**
 * Builds the value set this artifact type renders from. Only fields whose
 * registry `consumers` map to this type are included, so a change to a field
 * the artifact never renders cannot make it stale.
 */
export function projectArtifactSource(
  artifactType: ArtifactType,
  input: ArtifactSourceInput
): ArtifactProjection {
  const consumers = consumersForType(artifactType);
  const values: Record<string, unknown> = {};

  for (const field of ONBOARDING_SCHEMA_REGISTRY) {
    if (!field.consumers.some((consumer) => consumers.has(consumer))) continue;
    // Collection member fields are projected as part of their collection.
    if (field.parentCollection) continue;

    const projectionKey = `${field.sectionKey}.${field.dataKey}`;

    if (
      field.ownership === "internal_read_only" ||
      field.dataType === "internal_value"
    ) {
      const readOnly = input.readOnlyValues as Record<string, unknown>;
      values[projectionKey] = normalizeProjectedValue(
        readOnly[field.dataKey] ?? null,
        field.normalization
      );
      continue;
    }

    const section = (input.data as Record<string, unknown>)[field.sectionKey] as
      | Record<string, unknown>
      | undefined;
    values[projectionKey] = normalizeProjectedValue(
      section?.[field.dataKey] ?? null,
      field.normalization
    );
  }

  for (const key of WORKSPACE_KEYS_BY_TYPE[artifactType]) {
    values[key] = workspaceValue(key, input);
  }

  // The co-branded page is the only artifact that renders the LegalEase-
  // controlled public-page language, so only it projects those values.
  if (artifactType === "co_branded_page_configuration") {
    for (const [category, block] of Object.entries(
      LEGALEASE_PUBLIC_PAGE_LANGUAGE
    )) {
      values[`legalease_public_page.${category}`] = `${block.heading}: ${block.body}`;
    }
  }

  for (const definition of ONBOARDING_ASSET_DEFINITIONS) {
    if (!definition.consumers.some((consumer) => consumers.has(consumer))) {
      continue;
    }
    const asset = input.assets.find(
      (candidate) =>
        candidate.category === definition.category &&
        candidate.lifecycleStatus !== "deleted"
    );
    // Assets carry no revision column, so identity is the content tuple.
    values[`asset.${definition.category}`] = asset
      ? {
          id: asset.id,
          sha256: asset.sha256Hex,
          lifecycle_status: asset.lifecycleStatus,
          review_status: asset.reviewStatus
        }
      : null;
  }

  return {
    artifactType,
    values,
    hash: hashArtifactSnapshot(values)
  };
}

function workspaceValue(key: string, input: ArtifactSourceInput): unknown {
  const { workspace, partnerRecord } = input;
  switch (key) {
    case "workspace.target_launch_date":
      return workspace.targetLaunchDate;
    case "workspace.commercial_gate_status":
      return workspace.commercialGateStatus;
    case "workspace.public_display_name":
      return workspace.publicDisplayName;
    case "workspace.public_headline":
      return workspace.publicHeadline;
    case "workspace.public_subheadline":
      return workspace.publicSubheadline;
    case "workspace.support_instructions":
      return workspace.supportInstructions;
    case "workspace.show_partner_logo":
      return workspace.showPartnerLogo;
    case "workspace.show_powered_by":
      return workspace.showPoweredBy;
    case "partner_record.access_mode":
      return partnerRecord.accessMode;
    default:
      return null;
  }
}

export function buildArtifactProvenance(
  input: ArtifactSourceInput
): ArtifactProvenance {
  const sourceSectionRevisions: Record<string, number> = {};
  for (const [key, revision] of Object.entries(input.sectionRevisions)) {
    if (typeof revision === "number") sourceSectionRevisions[key] = revision;
  }
  const sourceAssetVersions: Record<string, string> = {};
  for (const asset of input.assets) {
    sourceAssetVersions[asset.category] = `${asset.id}:${asset.sha256Hex ?? "none"}`;
  }
  return {
    sourceWorkspaceVersion: input.workspace.aggregateVersion,
    sourceSectionRevisions,
    sourceAssetVersions
  };
}

export type ArtifactDriftResult = {
  stale: boolean;
  changedKeys: string[];
  invalidatesLegalEaseApproval: boolean;
  invalidatesPartnerApproval: boolean;
};

/**
 * Compares the recomputed projection against the snapshot a version was
 * generated from. This runs unconditionally on read: values such as
 * `partner_entitlement` and `partner_records.selected_package_id` sit outside
 * the workspace aggregate and bump no revision counter, so a revision-gated
 * check would silently miss them.
 *
 * A `generator_version` mismatch is material on its own, because the rendered
 * output can change without any source value changing.
 */
export function detectArtifactDrift(input: {
  storedSnapshot: Record<string, unknown>;
  storedGeneratorVersion: string;
  current: ArtifactProjection;
  currentGeneratorVersion: string;
}): ArtifactDriftResult {
  const changedKeys: string[] = [];
  const keys = new Set([
    ...Object.keys(input.storedSnapshot),
    ...Object.keys(input.current.values)
  ]);

  for (const key of keys) {
    const before = stableArtifactJson(input.storedSnapshot[key] ?? null);
    const after = stableArtifactJson(input.current.values[key] ?? null);
    if (before !== after) changedKeys.push(key);
  }
  changedKeys.sort();

  const generatorChanged =
    input.storedGeneratorVersion !== input.currentGeneratorVersion;
  if (generatorChanged) changedKeys.push("generator_version");

  const partnerOwnedChanged = changedKeys.some(
    (key) => key !== "generator_version" && !LEGALEASE_ONLY_PROJECTION_KEYS.has(key)
  );

  return {
    stale: changedKeys.length > 0,
    changedKeys,
    // Any rendered value changing means LegalEase approved a document that no
    // longer matches source.
    invalidatesLegalEaseApproval: changedKeys.length > 0,
    // The partner's attestation covers partner-owned content only, so a
    // LegalEase-only change leaves it standing.
    invalidatesPartnerApproval: partnerOwnedChanged || generatorChanged
  };
}
