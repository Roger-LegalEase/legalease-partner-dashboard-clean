import {
  CO_BRANDED_PAGE_CONFIGURATION_GENERATOR_VERSION,
  DASHBOARD_USER_REPORTING_MATRIX_GENERATOR_VERSION,
  IMPLEMENTATION_BRIEF_GENERATOR_VERSION,
  LEGALEASE_PUBLIC_PAGE_LANGUAGE,
  LEGALEASE_TECHNICAL_SUPPORT_ROUTE,
  OPERATIONS_ESCALATION_PLAN_GENERATOR_VERSION,
  PARTNER_LAUNCH_KIT_GENERATOR_VERSION,
  STAFF_QUICK_START_GUIDE_GENERATOR_VERSION,
  type ArtifactSourceInput
} from "./artifact-domain";
import {
  ONBOARDING_SCHEMA_REGISTRY,
  ONBOARDING_SECTION_DEFINITIONS
} from "./schema";
import type { OnboardingSectionKey } from "./types";

export type RenderedBlock =
  | { kind: "paragraph"; text: string }
  | { kind: "definitions"; items: Array<{ term: string; value: string }> }
  | { kind: "bullets"; items: string[] }
  | {
      kind: "gap";
      label: string;
      fieldKey: string;
      whereToSet: string;
    };

export type RenderedSection = {
  key: string;
  heading: string;
  blocks: RenderedBlock[];
};

/**
 * A slot on the co-branded page, carrying which side owns it. Ownership is the
 * source the value actually came from, so the preview can mark LegalEase-
 * controlled content as not partner-editable rather than asserting it in prose.
 */
export type PagePreviewField = {
  key: string;
  label: string;
  value: string | null;
  ownership: "partner_editable" | "legalease_controlled";
  whereToSet: string;
};

export type PagePreviewAsset = {
  key: string;
  label: string;
  assetId: string | null;
  whereToSet: string;
};

export type CoBrandedPagePreview = {
  publicName: PagePreviewField;
  programName: PagePreviewField;
  headline: PagePreviewField;
  subheadline: PagePreviewField;
  organizationDescription: PagePreviewField;
  serviceArea: PagePreviewField;
  targetAudience: PagePreviewField;
  languageAvailability: PagePreviewField;
  participantSupportCopy: PagePreviewField;
  supportEmail: PagePreviewField;
  supportPhone: PagePreviewField;
  primaryActionLabel: PagePreviewField;
  partnerPrivacyUrl: PagePreviewField;
  accessibilityUrl: PagePreviewField;
  legalEaseSupportRouting: PagePreviewField;
  logo: PagePreviewAsset;
  heroImage: PagePreviewAsset;
  showPartnerLogo: boolean;
  showPoweredBy: boolean;
  legalBlocks: Array<{ category: string; heading: string; body: string }>;
  missing: Array<{ label: string; whereToSet: string }>;
};

export type RenderedDocument = {
  documentTitle: string;
  organizationName: string;
  programName: string | null;
  generatorVersion: string;
  sections: RenderedSection[];
  gapCount: number;
  /**
   * Only the co-branded page configuration carries this. It is the model the
   * desktop and mobile previews render; every other artifact leaves it absent
   * and the document view, the PDF renderer, and the download path are
   * unaffected.
   */
  pagePreview?: CoBrandedPagePreview;
  /**
   * Only the partner launch kit carries this. Every other artifact leaves it
   * absent, so the document view, the PDF renderer, and the download path are
   * unaffected.
   */
  launchKit?: LaunchKitPayload;
};

const SECTION_TITLES = new Map<string, string>(
  ONBOARDING_SECTION_DEFINITIONS.map((definition) => [
    definition.key,
    definition.label
  ])
);

/**
 * Where a partner is told to go to fill a gap. Named per section so a gap never
 * reads as generic "missing data".
 */
function whereToSet(sectionKey: OnboardingSectionKey): string {
  const title = SECTION_TITLES.get(sectionKey) ?? sectionKey;
  return `Program setup → ${title}`;
}

type Ctx = {
  input: ArtifactSourceInput;
  gaps: number;
};

/**
 * Renders the Implementation Brief from canonical onboarding data only. It
 * never accepts a browser payload, and where a canonical value is missing it
 * renders an explicit gap naming the field and where it is set rather than
 * inventing placeholder content.
 */
export function renderImplementationBrief(
  input: ArtifactSourceInput
): RenderedDocument {
  const ctx: Ctx = { input, gaps: 0 };
  const sections: RenderedSection[] = [
    identitySection(ctx),
    objectiveSection(ctx),
    audienceAndGeographySection(ctx),
    accessAndCapacitySection(ctx),
    participantJourneySection(ctx),
    supportAndReferralSection(ctx),
    responsibilitiesSection(ctx),
    launchSection(ctx),
    openDecisionsSection(ctx)
  ];

  return {
    documentTitle: "Implementation Brief",
    organizationName:
      text(ctx, "organization_contacts", "public_organization_name") ??
      input.partnerRecord.organizationName,
    programName:
      text(ctx, "organization_contacts", "public_program_name") ??
      input.partnerRecord.programName,
    generatorVersion: IMPLEMENTATION_BRIEF_GENERATOR_VERSION,
    sections,
    gapCount: ctx.gaps
  };
}

// --- value helpers -----------------------------------------------------------

function raw(
  ctx: Ctx,
  sectionKey: OnboardingSectionKey,
  dataKey: string
): unknown {
  const section = (ctx.input.data as Record<string, unknown>)[sectionKey] as
    | Record<string, unknown>
    | undefined;
  return section?.[dataKey] ?? null;
}

/**
 * Enumerated values are stored as machine keys. A partner document must never
 * show one, so every enum the brief renders is mapped to plain language here.
 */
const ENUM_LABELS: Readonly<Record<string, string>> = {
  // organization_type
  nonprofit: "Nonprofit",
  government: "Government",
  legal_services: "Legal services",
  workforce: "Workforce development",
  faith_based: "Faith-based",
  other: "Other",
  // program_model
  year_round: "Year-round program",
  clinic: "Clinic",
  event: "Event",
  campaign: "Campaign",
  referral_only: "Referral only",
  cohort: "Cohort",
  // participant_access_model
  open: "Open to anyone",
  optional_code: "Optional access code",
  required_code: "Access code required",
  invite_only: "Invitation only",
  // code_structure
  shared: "One shared code",
  limited_use: "Limited-use codes",
  single_use: "Single-use codes",
  mixed: "Mixed code types",
  // out_of_area_policy
  allowed: "Served anyway",
  redirected: "Redirected to another service",
  case_by_case: "Decided case by case"
};

/**
 * Collection-row and access-lifecycle enums. These never pass through `text()`,
 * because they are not top-level registry fields, so they are mapped here and
 * every generator that renders one goes through `plainLabel`.
 */
const ROW_ENUM_LABELS: Readonly<Record<string, string>> = {
  // planned_users.requested_role and the authority roles
  partner_administrator: "Partner administrator",
  program_staff: "Program staff",
  reporting_viewer: "Reporting viewer",
  // planned_users.special_permissions
  manage_codes: "Manage access codes",
  view_reports: "View reports",
  export_reports: "Export reports",
  manage_users: "Manage users"
};

/**
 * Three access-lifecycle enums share literals (`planned`, `complete`, `active`), so
 * each gets its own map rather than one shared table that would mislabel them.
 * Lane A owns the values; this lane only reads and renders them.
 */
const TRAINING_STATUS_LABELS: Readonly<Record<string, string>> = {
  not_started: "Not started",
  scheduled: "Scheduled",
  in_progress: "In progress",
  complete: "Complete"
};

const INVITATION_STATUS_LABELS: Readonly<Record<string, string>> = {
  not_invited: "No invitation released",
  planned: "Planned, no invitation released",
  released: "Invitation released"
};

const MEMBERSHIP_STATUS_LABELS: Readonly<Record<string, string>> = {
  planned: "Planned, no dashboard access yet",
  active: "Dashboard access active",
  disabled: "Dashboard access disabled"
};

function labelFrom(
  table: Readonly<Record<string, string>>,
  value: unknown
): string | null {
  if (typeof value !== "string" || value.trim().length === 0) return null;
  const trimmed = value.trim();
  return table[trimmed] ?? trimmed.replace(/_/g, " ");
}

function enumLabel(value: string): string {
  return ENUM_LABELS[value] ?? value.replace(/_/g, " ");
}

function text(
  ctx: Ctx,
  sectionKey: OnboardingSectionKey,
  dataKey: string
): string | null {
  const value = raw(ctx, sectionKey, dataKey);
  if (typeof value === "string" && value.trim().length > 0) {
    const trimmed = value.trim();
    return isEnumField(sectionKey, dataKey) ? enumLabel(trimmed) : trimmed;
  }
  if (typeof value === "number") return String(value);
  if (typeof value === "boolean") return value ? "Yes" : "No";
  return null;
}

function isEnumField(sectionKey: OnboardingSectionKey, dataKey: string): boolean {
  return (
    ONBOARDING_SCHEMA_REGISTRY.find(
      (field) =>
        field.sectionKey === sectionKey &&
        field.dataKey === dataKey &&
        !field.parentCollection
    )?.dataType === "enum"
  );
}

function list(
  ctx: Ctx,
  sectionKey: OnboardingSectionKey,
  dataKey: string
): string[] {
  const value = raw(ctx, sectionKey, dataKey);
  if (!Array.isArray(value)) return [];
  return value.filter((entry): entry is string => typeof entry === "string");
}

/**
 * Labels come from the registry so that a copy change in one place moves every
 * document that renders the field.
 */
function label(sectionKey: OnboardingSectionKey, dataKey: string): string {
  const definition = ONBOARDING_SCHEMA_REGISTRY.find(
    (field) =>
      field.sectionKey === sectionKey &&
      field.dataKey === dataKey &&
      !field.parentCollection
  );
  return definition?.label ?? dataKey;
}

function gap(
  ctx: Ctx,
  sectionKey: OnboardingSectionKey,
  dataKey: string
): RenderedBlock {
  ctx.gaps += 1;
  return {
    kind: "gap",
    label: label(sectionKey, dataKey),
    fieldKey: `${sectionKey}.${dataKey}`,
    whereToSet: whereToSet(sectionKey)
  };
}

/** A definition row, or an explicit gap when the canonical value is absent. */
function row(
  ctx: Ctx,
  sectionKey: OnboardingSectionKey,
  dataKey: string,
  into: { items: Array<{ term: string; value: string }>; gaps: RenderedBlock[] }
): void {
  const value = text(ctx, sectionKey, dataKey);
  if (value === null) {
    into.gaps.push(gap(ctx, sectionKey, dataKey));
    return;
  }
  into.items.push({ term: label(sectionKey, dataKey), value });
}

function definitionSection(
  key: string,
  heading: string,
  ctx: Ctx,
  fields: Array<[OnboardingSectionKey, string]>,
  extra: RenderedBlock[] = []
): RenderedSection {
  const collected = {
    items: [] as Array<{ term: string; value: string }>,
    gaps: [] as RenderedBlock[]
  };
  for (const [sectionKey, dataKey] of fields) {
    row(ctx, sectionKey, dataKey, collected);
  }
  const blocks: RenderedBlock[] = [];
  if (collected.items.length > 0) {
    blocks.push({ kind: "definitions", items: collected.items });
  }
  blocks.push(...extra, ...collected.gaps);
  return { key, heading, blocks };
}

// --- sections ----------------------------------------------------------------

function identitySection(ctx: Ctx): RenderedSection {
  return definitionSection("identity", "Organization and program", ctx, [
    ["organization_contacts", "legal_organization_name"],
    ["organization_contacts", "public_organization_name"],
    ["organization_contacts", "public_program_name"],
    ["organization_contacts", "organization_type"],
    ["organization_contacts", "website"],
    ["organization_contacts", "primary_address"],
    ["organization_contacts", "main_phone"]
  ]);
}

function objectiveSection(ctx: Ctx): RenderedSection {
  const blocks: RenderedBlock[] = [];
  const goal = text(ctx, "program_goals", "primary_goal");
  if (goal) blocks.push({ kind: "paragraph", text: goal });
  else blocks.push(gap(ctx, "program_goals", "primary_goal"));

  const success = text(ctx, "program_goals", "definition_of_success");
  if (success) {
    blocks.push({
      kind: "definitions",
      items: [
        { term: label("program_goals", "definition_of_success"), value: success }
      ]
    });
  } else {
    blocks.push(gap(ctx, "program_goals", "definition_of_success"));
  }

  const model = text(ctx, "program_goals", "program_model");
  const start = text(ctx, "program_goals", "program_start_date");
  const end = text(ctx, "program_goals", "program_end_date");
  const ongoing = raw(ctx, "program_goals", "ongoing") === true;
  const items: Array<{ term: string; value: string }> = [];
  if (model) items.push({ term: label("program_goals", "program_model"), value: model });
  if (start) items.push({ term: label("program_goals", "program_start_date"), value: start });
  items.push({
    term: label("program_goals", "program_end_date"),
    value: ongoing ? "Ongoing program, no fixed end date" : end ?? "Not set"
  });
  if (items.length > 0) blocks.push({ kind: "definitions", items });
  if (!model) blocks.push(gap(ctx, "program_goals", "program_model"));
  if (!start) blocks.push(gap(ctx, "program_goals", "program_start_date"));

  return { key: "objective", heading: "Objective and definition of success", blocks };
}

function audienceAndGeographySection(ctx: Ctx): RenderedSection {
  const blocks: RenderedBlock[] = [];
  const population = text(ctx, "program_goals", "target_population");
  if (population) blocks.push({ kind: "paragraph", text: population });
  else blocks.push(gap(ctx, "program_goals", "target_population"));

  const jurisdictions = list(
    ctx,
    "geography_audience_language_accessibility",
    "jurisdictions"
  );
  if (jurisdictions.length > 0) {
    blocks.push({
      kind: "definitions",
      items: [
        {
          term: label("geography_audience_language_accessibility", "jurisdictions"),
          value: jurisdictions.join(", ")
        }
      ]
    });
  } else {
    blocks.push(gap(ctx, "geography_audience_language_accessibility", "jurisdictions"));
  }

  const counties = list(
    ctx,
    "geography_audience_language_accessibility",
    "counties"
  );
  if (counties.length > 0) {
    blocks.push({ kind: "bullets", items: counties });
  }

  const collected = {
    items: [] as Array<{ term: string; value: string }>,
    gaps: [] as RenderedBlock[]
  };
  for (const dataKey of [
    "service_area_description",
    "primary_language",
    "enable_spanish",
    "accessibility_accommodations",
    "population_restrictions"
  ]) {
    row(ctx, "geography_audience_language_accessibility", dataKey, collected);
  }
  if (collected.items.length > 0) {
    blocks.push({ kind: "definitions", items: collected.items });
  }
  blocks.push(...collected.gaps);

  return { key: "audience", heading: "Target population and geography", blocks };
}

function accessAndCapacitySection(ctx: Ctx): RenderedSection {
  const blocks: RenderedBlock[] = [];
  const collected = {
    items: [] as Array<{ term: string; value: string }>,
    gaps: [] as RenderedBlock[]
  };
  row(ctx, "access_sponsorship_capacity", "participant_access_model", collected);
  row(ctx, "access_sponsorship_capacity", "code_structure", collected);

  const readOnly = ctx.input.readOnlyValues;
  if (readOnly.sponsored_screening_scope) {
    collected.items.push({
      term: "Sponsored screening scope",
      value: readOnly.sponsored_screening_scope
    });
  }
  if (readOnly.sponsored_packet_scope) {
    collected.items.push({
      term: "Sponsored packet scope",
      value: readOnly.sponsored_packet_scope
    });
  }
  if (readOnly.recordshield_pathway) {
    collected.items.push({
      term: "RecordShield pathway",
      value: readOnly.recordshield_pathway
    });
  }

  const volumes: string[] = [];
  const screeningVolume = text(ctx, "program_goals", "expected_screening_volume");
  const screeningPeriod = text(ctx, "program_goals", "expected_screening_period");
  if (screeningVolume && screeningPeriod) {
    volumes.push(`Expected screenings: ${screeningVolume} per ${screeningPeriod}`);
  }
  const packetVolume = text(ctx, "program_goals", "expected_packet_volume");
  const packetPeriod = text(ctx, "program_goals", "expected_packet_period");
  if (packetVolume && packetPeriod) {
    volumes.push(`Expected packets: ${packetVolume} per ${packetPeriod}`);
  }

  if (collected.items.length > 0) {
    blocks.push({ kind: "definitions", items: collected.items });
  }
  if (volumes.length > 0) blocks.push({ kind: "bullets", items: volumes });
  blocks.push(...collected.gaps);

  const codeGroups = list(ctx, "access_sponsorship_capacity", "code_source_groups");
  if (codeGroups.length > 0) blocks.push({ kind: "bullets", items: codeGroups });

  return { key: "access", heading: "Access model, sponsored scope, and capacity", blocks };
}

function participantJourneySection(ctx: Ctx): RenderedSection {
  const blocks: RenderedBlock[] = [];
  const workflow = text(ctx, "program_goals", "current_workflow");
  if (workflow) blocks.push({ kind: "paragraph", text: workflow });
  else blocks.push(gap(ctx, "program_goals", "current_workflow"));

  const channels = list(ctx, "program_goals", "outreach_channels");
  if (channels.length > 0) blocks.push({ kind: "bullets", items: channels });
  else blocks.push(gap(ctx, "program_goals", "outreach_channels"));

  const barriers = list(ctx, "program_goals", "known_barriers");
  if (barriers.length > 0) {
    const other = text(ctx, "program_goals", "known_barriers_other");
    blocks.push({
      kind: "bullets",
      items: other ? [...barriers, other] : barriers
    });
  }
  return { key: "journey", heading: "Participant journey", blocks };
}

function supportAndReferralSection(ctx: Ctx): RenderedSection {
  const section = definitionSection(
    "support",
    "Support and legal-services referral",
    ctx,
    [
      ["support_referrals_reporting", "legal_services_referral_organization"],
      ["support_referrals_reporting", "referral_intake_method"],
      ["support_referrals_reporting", "referral_intake_details"],
      ["support_referrals_reporting", "contested_matter_procedure"]
    ]
  );
  // Preserves the existing product boundary. This sentence is LegalEase-
  // controlled language and is not partner-editable.
  section.blocks.push({
    kind: "paragraph",
    text:
      "Contested and individually represented matters leave the self-help path. " +
      "LegalEase does not provide legal representation, and a participant whose " +
      "matter becomes contested is routed to the referral process recorded above."
  });
  return section;
}

function responsibilitiesSection(ctx: Ctx): RenderedSection {
  const contacts = ctx.input.data.organization_contacts?.contacts ?? [];
  const blocks: RenderedBlock[] = [];

  if (contacts.length > 0) {
    blocks.push({
      kind: "definitions",
      items: contacts
        .filter((contact) => contact.role && contact.name)
        .map((contact) => ({
          term: contactRoleLabel(contact.role as string),
          value: [contact.name, contact.title, contact.work_email]
            .filter((part): part is string => Boolean(part))
            .join(" · ")
        }))
    });
  } else {
    blocks.push(gap(ctx, "organization_contacts", "contacts"));
  }

  blocks.push({
    kind: "bullets",
    items: [
      "LegalEase configures the partner workspace, the participant experience, and the record-clearing packet generation for the jurisdictions listed above.",
      "LegalEase provides platform support to partner staff and maintains the eligibility rules and generated documents.",
      `${
        ctx.input.partnerRecord.organizationName
      } operates outreach, participant support, and the referral route for contested matters.`
    ]
  });

  return { key: "responsibilities", heading: "Responsibilities", blocks };
}

const CONTACT_ROLE_LABELS: Readonly<Record<string, string>> = {
  executive_sponsor: "Executive sponsor",
  program_operator: "Program operator",
  communications_lead: "Communications lead",
  reporting_evaluation_lead: "Reporting and evaluation lead",
  legal_services_referral_contact: "Legal-services referral contact",
  finance_procurement_contact: "Finance and procurement contact",
  technical_security_contact: "Technical and security contact",
  media_contact: "Media contact"
};

function contactRoleLabel(role: string): string {
  return CONTACT_ROLE_LABELS[role] ?? role;
}

function launchSection(ctx: Ctx): RenderedSection {
  const blocks: RenderedBlock[] = [];
  const target = ctx.input.workspace.targetLaunchDate;
  if (target) {
    blocks.push({
      kind: "definitions",
      items: [{ term: "Target launch date", value: target }]
    });
  } else {
    ctx.gaps += 1;
    blocks.push({
      kind: "gap",
      label: "Target launch date",
      fieldKey: "workspace.target_launch_date",
      whereToSet: "Internal onboarding review → Target launch date"
    });
  }
  return { key: "launch", heading: "Target launch date", blocks };
}

function openDecisionsSection(ctx: Ctx): RenderedSection {
  const blocks: RenderedBlock[] = [];
  const open: string[] = [];

  if (ctx.input.workspace.commercialGateStatus === "blocked") {
    open.push(
      "Commercial requirements are not yet cleared, so configuration cannot be finalized."
    );
  }
  const restrictions = text(
    ctx,
    "geography_audience_language_accessibility",
    "population_restrictions"
  );
  if (restrictions) {
    open.push(`Population restrictions to confirm in configuration: ${restrictions}`);
  }

  if (open.length > 0) blocks.push({ kind: "bullets", items: open });
  else {
    blocks.push({
      kind: "paragraph",
      text: "No open decisions or blockers are recorded for this program."
    });
  }
  return { key: "open_decisions", heading: "Open decisions and blockers", blocks };
}

// --- shared helpers for the Phase 2A generators ------------------------------

type ContactRow = {
  stable_row_id?: string;
  role?: string;
  name?: string;
  title?: string;
  organization?: string | null;
  work_email?: string;
  phone?: string | null;
};

function contacts(ctx: Ctx): ContactRow[] {
  const rows = ctx.input.data.organization_contacts?.contacts;
  return Array.isArray(rows) ? (rows as ContactRow[]) : [];
}

function contactByRole(ctx: Ctx, role: string): ContactRow | null {
  return contacts(ctx).find((contact) => contact.role === role) ?? null;
}

function contactById(ctx: Ctx, id: unknown): ContactRow | null {
  if (typeof id !== "string" || id.length === 0) return null;
  return contacts(ctx).find((contact) => contact.stable_row_id === id) ?? null;
}

/** A person, rendered the way a document names one: never a row id. */
function contactLine(contact: ContactRow): string {
  return (
    [contact.name, contact.title, contact.work_email, contact.phone]
      .map((part) => (typeof part === "string" ? part.trim() : ""))
      .filter((part) => part.length > 0)
      .join(" · ") || "Saved contact with no name recorded"
  );
}

/** A gap for something the schema registry does not describe as a field. */
function customGap(
  ctx: Ctx,
  label: string,
  fieldKey: string,
  where: string
): RenderedBlock {
  ctx.gaps += 1;
  return { kind: "gap", label, fieldKey, whereToSet: where };
}

const CONTACTS_LOCATION = "Program setup → Organization and contacts";

type RouteSpec = {
  key: string;
  heading: string;
  /** Free-text procedure, or null when the partner has not recorded one. */
  procedure: string | null;
  procedureGap: RenderedBlock | null;
  owner: string | null;
  ownerGap: RenderedBlock | null;
  responseExpectation: string | null;
  responseExpectationGap: RenderedBlock | null;
  extra?: RenderedBlock[];
};

/**
 * Every escalation route is rendered the same way: what the route is, who owns
 * it, and how quickly they respond. Anything the partner has not recorded is an
 * explicit named gap rather than invented text, which is why this returns a
 * section even when nothing is filled in.
 */
function routeSection(spec: RouteSpec): RenderedSection {
  const blocks: RenderedBlock[] = [];
  if (spec.procedure) blocks.push({ kind: "paragraph", text: spec.procedure });

  const items: Array<{ term: string; value: string }> = [];
  if (spec.owner) items.push({ term: "Owner", value: spec.owner });
  if (spec.responseExpectation) {
    items.push({ term: "Response expectation", value: spec.responseExpectation });
  }
  if (items.length > 0) blocks.push({ kind: "definitions", items });
  if (spec.extra) blocks.push(...spec.extra);

  for (const gapBlock of [
    spec.procedureGap,
    spec.ownerGap,
    spec.responseExpectationGap
  ]) {
    if (gapBlock) blocks.push(gapBlock);
  }
  return { key: spec.key, heading: spec.heading, blocks };
}

function supportText(ctx: Ctx, dataKey: string): string | null {
  return text(ctx, "support_referrals_reporting", dataKey);
}

// --- Operations and Escalation Plan ------------------------------------------

/**
 * Renders every support and escalation route this program runs, each with the
 * person who owns it and the response the partner has committed to. It projects
 * from the shared canonical read only, and it preserves the existing product
 * boundary: contested or individually represented matters leave the self-help
 * path.
 */
export function renderOperationsEscalationPlan(
  input: ArtifactSourceInput
): RenderedDocument {
  const ctx: Ctx = { input, gaps: 0 };

  const sections: RenderedSection[] = [
    operationsOverviewSection(ctx),
    participantSupportRoute(ctx),
    technicalSupportRoute(),
    legalReferralRoute(ctx),
    contestedMatterRoute(ctx),
    privacyRequestRoute(ctx),
    securityConcernRoute(ctx),
    mediaInquiryRoute(ctx),
    capacityEscalationRoute(ctx),
    programPauseRoute(ctx)
  ];

  return {
    documentTitle: "Operations and Escalation Plan",
    organizationName:
      text(ctx, "organization_contacts", "public_organization_name") ??
      input.partnerRecord.organizationName,
    programName:
      text(ctx, "organization_contacts", "public_program_name") ??
      input.partnerRecord.programName,
    generatorVersion: OPERATIONS_ESCALATION_PLAN_GENERATOR_VERSION,
    sections,
    gapCount: ctx.gaps
  };
}

function operationsOverviewSection(ctx: Ctx): RenderedSection {
  const blocks: RenderedBlock[] = [
    {
      kind: "paragraph",
      text:
        "This plan records how the program answers a participant, escalates a problem, and stops. Each route below names the person who owns it and the response the program has committed to. Anything not yet recorded is shown as a gap rather than filled in on the program's behalf."
    }
  ];

  const collected = {
    items: [] as Array<{ term: string; value: string }>,
    gaps: [] as RenderedBlock[]
  };
  row(ctx, "program_goals", "primary_goal", collected);
  row(ctx, "program_goals", "program_model", collected);
  row(ctx, "geography_audience_language_accessibility", "service_area_description", collected);
  row(ctx, "geography_audience_language_accessibility", "out_of_area_policy", collected);
  if (collected.items.length > 0) {
    blocks.push({ kind: "definitions", items: collected.items });
  }
  blocks.push(...collected.gaps);

  const target = ctx.input.workspace.targetLaunchDate;
  if (target) {
    blocks.push({
      kind: "definitions",
      items: [{ term: "Target launch date", value: target }]
    });
  } else {
    blocks.push(
      customGap(
        ctx,
        "Target launch date",
        "workspace.target_launch_date",
        "Internal onboarding review → Target launch date"
      )
    );
  }

  return { key: "overview", heading: "How this plan works", blocks };
}

function participantSupportRoute(ctx: Ctx): RenderedSection {
  const email = supportText(ctx, "participant_support_email");
  const phone = supportText(ctx, "participant_support_phone");
  const staffContact = contactById(
    ctx,
    raw(ctx, "support_referrals_reporting", "partner_staff_support_contact_id")
  );
  const owner = [
    email ? `Participant support email ${email}` : null,
    phone ? `Participant support phone ${phone}` : null,
    staffContact ? `Partner staff support: ${contactLine(staffContact)}` : null
  ]
    .filter((part): part is string => part !== null)
    .join(" · ");

  return routeSection({
    key: "route_participant_support",
    heading: "General participant support",
    procedure: text(ctx, "brand_public_page", "participant_support_copy"),
    procedureGap: text(ctx, "brand_public_page", "participant_support_copy")
      ? null
      : gap(ctx, "brand_public_page", "participant_support_copy"),
    owner: owner.length > 0 ? owner : null,
    ownerGap:
      owner.length > 0
        ? null
        : gap(ctx, "support_referrals_reporting", "participant_support_email"),
    responseExpectation: supportText(
      ctx,
      "participant_support_response_expectation"
    ),
    responseExpectationGap: supportText(
      ctx,
      "participant_support_response_expectation"
    )
      ? null
      : gap(
          ctx,
          "support_referrals_reporting",
          "participant_support_response_expectation"
        )
  });
}

function technicalSupportRoute(): RenderedSection {
  // LegalEase-controlled. It is projected as a value so that an edit to it is
  // detectable, and it is not partner-editable.
  return {
    key: "route_technical_support",
    heading: "LegalEase technical support",
    blocks: [
      { kind: "paragraph", text: LEGALEASE_TECHNICAL_SUPPORT_ROUTE },
      {
        kind: "definitions",
        items: [
          { term: "Owner", value: "LegalEase platform support" },
          {
            term: "Response expectation",
            value: "One business day for partner staff requests"
          }
        ]
      }
    ]
  };
}

function legalReferralRoute(ctx: Ctx): RenderedSection {
  const organization = supportText(
    ctx,
    "legal_services_referral_organization"
  );
  const referralContact = contactByRole(ctx, "legal_services_referral_contact");
  const method = supportText(ctx, "referral_intake_method");
  const details = supportText(ctx, "referral_intake_details");
  const extra: RenderedBlock[] = [];
  if (method || details) {
    extra.push({
      kind: "definitions",
      items: [
        ...(method
          ? [
              {
                term: label("support_referrals_reporting", "referral_intake_method"),
                value: method
              }
            ]
          : []),
        ...(details
          ? [
              {
                term: label(
                  "support_referrals_reporting",
                  "referral_intake_details"
                ),
                value: details
              }
            ]
          : [])
      ]
    });
  }

  return routeSection({
    key: "route_legal_referral",
    heading: "Legal-services referral",
    procedure: organization
      ? `Participants who need legal advice or representation are referred to ${organization}.`
      : null,
    procedureGap: organization
      ? null
      : gap(
          ctx,
          "support_referrals_reporting",
          "legal_services_referral_organization"
        ),
    owner: referralContact ? contactLine(referralContact) : organization,
    ownerGap:
      referralContact || organization
        ? null
        : customGap(
            ctx,
            "Legal-services referral contact",
            "organization_contacts.contacts[legal_services_referral_contact]",
            CONTACTS_LOCATION
          ),
    responseExpectation: supportText(ctx, "referral_response_expectation"),
    responseExpectationGap: supportText(ctx, "referral_response_expectation")
      ? null
      : gap(ctx, "support_referrals_reporting", "referral_response_expectation"),
    extra
  });
}

function contestedMatterRoute(ctx: Ctx): RenderedSection {
  const procedure = supportText(ctx, "contested_matter_procedure");
  const escalationContact = contactById(
    ctx,
    raw(ctx, "support_referrals_reporting", "urgent_escalation_contact_id")
  );

  const section = routeSection({
    key: "route_contested_matter",
    heading: "Prosecutor objection and contested hearing",
    procedure,
    procedureGap: procedure
      ? null
      : gap(ctx, "support_referrals_reporting", "contested_matter_procedure"),
    owner: escalationContact ? contactLine(escalationContact) : null,
    ownerGap: escalationContact
      ? null
      : gap(ctx, "support_referrals_reporting", "urgent_escalation_contact_id"),
    responseExpectation: supportText(
      ctx,
      "contested_matter_response_expectation"
    ),
    responseExpectationGap: supportText(
      ctx,
      "contested_matter_response_expectation"
    )
      ? null
      : gap(
          ctx,
          "support_referrals_reporting",
          "contested_matter_response_expectation"
        )
  });

  // The existing product boundary, unchanged. LegalEase-controlled language.
  section.blocks.push({
    kind: "paragraph",
    text:
      "Contested and individually represented matters leave the self-help path. " +
      "LegalEase does not provide legal representation, and a participant whose " +
      "matter becomes contested is routed to the referral process recorded above."
  });
  return section;
}

function privacyRequestRoute(ctx: Ctx): RenderedSection {
  const procedure = supportText(ctx, "privacy_request_route");
  const owner = contactById(
    ctx,
    raw(ctx, "support_referrals_reporting", "privacy_request_owner_contact_id")
  );
  return routeSection({
    key: "route_privacy_request",
    heading: "Privacy requests",
    procedure,
    procedureGap: procedure
      ? null
      : gap(ctx, "support_referrals_reporting", "privacy_request_route"),
    owner: owner ? contactLine(owner) : null,
    ownerGap: owner
      ? null
      : gap(
          ctx,
          "support_referrals_reporting",
          "privacy_request_owner_contact_id"
        ),
    responseExpectation: supportText(
      ctx,
      "privacy_request_response_expectation"
    ),
    responseExpectationGap: supportText(
      ctx,
      "privacy_request_response_expectation"
    )
      ? null
      : gap(
          ctx,
          "support_referrals_reporting",
          "privacy_request_response_expectation"
        )
  });
}

function securityConcernRoute(ctx: Ctx): RenderedSection {
  const procedure = supportText(ctx, "security_concern_route");
  const owner = contactByRole(ctx, "technical_security_contact");
  return routeSection({
    key: "route_security_concern",
    heading: "Security concerns",
    procedure,
    procedureGap: procedure
      ? null
      : gap(ctx, "support_referrals_reporting", "security_concern_route"),
    owner: owner ? contactLine(owner) : null,
    ownerGap: owner
      ? null
      : customGap(
          ctx,
          "Technical and security contact",
          "organization_contacts.contacts[technical_security_contact]",
          CONTACTS_LOCATION
        ),
    responseExpectation: supportText(
      ctx,
      "security_concern_response_expectation"
    ),
    responseExpectationGap: supportText(
      ctx,
      "security_concern_response_expectation"
    )
      ? null
      : gap(
          ctx,
          "support_referrals_reporting",
          "security_concern_response_expectation"
        )
  });
}

function mediaInquiryRoute(ctx: Ctx): RenderedSection {
  const owner = contactByRole(ctx, "media_contact");
  return routeSection({
    key: "route_media",
    heading: "Media inquiries",
    procedure:
      "Press and media questions about the program go to the media contact below. Participant information is never discussed with media.",
    procedureGap: null,
    owner: owner ? contactLine(owner) : null,
    ownerGap: owner
      ? null
      : customGap(
          ctx,
          "Media contact",
          "organization_contacts.contacts[media_contact]",
          CONTACTS_LOCATION
        ),
    responseExpectation: supportText(
      ctx,
      "media_inquiry_response_expectation"
    ),
    responseExpectationGap: supportText(ctx, "media_inquiry_response_expectation")
      ? null
      : gap(
          ctx,
          "support_referrals_reporting",
          "media_inquiry_response_expectation"
        )
  });
}

function capacityEscalationRoute(ctx: Ctx): RenderedSection {
  const procedure = text(
    ctx,
    "access_sponsorship_capacity",
    "capacity_escalation_procedure"
  );
  const owner = contactById(
    ctx,
    raw(ctx, "access_sponsorship_capacity", "overage_approver_contact_id")
  );
  const readOnly = ctx.input.readOnlyValues;
  const extra: RenderedBlock[] = [];
  const capacityItems: Array<{ term: string; value: string }> = [];
  if (readOnly.screening_allocation != null) {
    capacityItems.push({
      term: "Screening allocation",
      value: String(readOnly.screening_allocation)
    });
  }
  if (readOnly.overage_behavior) {
    capacityItems.push({
      term: "Overage behavior",
      value: readOnly.overage_behavior
    });
  }
  const codeCapacity = text(
    ctx,
    "access_sponsorship_capacity",
    "code_level_capacity"
  );
  if (codeCapacity) {
    capacityItems.push({
      term: label("access_sponsorship_capacity", "code_level_capacity"),
      value: codeCapacity
    });
  }
  if (capacityItems.length > 0) {
    extra.push({ kind: "definitions", items: capacityItems });
  }

  return routeSection({
    key: "route_capacity",
    heading: "Capacity escalation",
    procedure,
    procedureGap: procedure
      ? null
      : gap(
          ctx,
          "access_sponsorship_capacity",
          "capacity_escalation_procedure"
        ),
    owner: owner ? contactLine(owner) : null,
    ownerGap: owner
      ? null
      : gap(
          ctx,
          "access_sponsorship_capacity",
          "overage_approver_contact_id"
        ),
    responseExpectation: text(
      ctx,
      "access_sponsorship_capacity",
      "capacity_escalation_response_expectation"
    ),
    responseExpectationGap: text(
      ctx,
      "access_sponsorship_capacity",
      "capacity_escalation_response_expectation"
    )
      ? null
      : gap(
          ctx,
          "access_sponsorship_capacity",
          "capacity_escalation_response_expectation"
        ),
    extra
  });
}

function programPauseRoute(ctx: Ctx): RenderedSection {
  const procedure = supportText(ctx, "program_pause_route");
  const owner = contactById(
    ctx,
    raw(ctx, "support_referrals_reporting", "program_pause_authority_contact_id")
  );
  const section = routeSection({
    key: "route_program_pause",
    heading: "Pausing the program",
    procedure,
    procedureGap: procedure
      ? null
      : gap(ctx, "support_referrals_reporting", "program_pause_route"),
    owner: owner ? contactLine(owner) : null,
    ownerGap: owner
      ? null
      : gap(
          ctx,
          "support_referrals_reporting",
          "program_pause_authority_contact_id"
        ),
    responseExpectation: supportText(ctx, "program_pause_response_expectation"),
    responseExpectationGap: supportText(ctx, "program_pause_response_expectation")
      ? null
      : gap(
          ctx,
          "support_referrals_reporting",
          "program_pause_response_expectation"
        )
  });
  section.blocks.push({
    kind: "paragraph",
    text:
      "A pause is carried out by LegalEase. This plan records who may ask for one and what participants are told; it does not pause anything by itself."
  });
  return section;
}

// --- Dashboard User and Reporting Matrix -------------------------------------

type PlannedUserRow = {
  stable_row_id?: string;
  name?: string;
  work_email?: string;
  requested_role?: string;
  special_permissions?: string[];
  training_attendee?: boolean;
  training_status?: string;
  training_completed_at?: string | null;
  invitation_status?: string;
  membership_status?: string;
};

function plannedUsers(ctx: Ctx): PlannedUserRow[] {
  const rows = ctx.input.data.staff_dashboard_plan?.planned_users;
  return Array.isArray(rows) ? (rows as PlannedUserRow[]) : [];
}

type RecipientRow = { name?: string | null; work_email?: string };

function reportRecipients(ctx: Ctx): RecipientRow[] {
  const rows = ctx.input.data.support_referrals_reporting?.report_recipients;
  return Array.isArray(rows) ? (rows as RecipientRow[]) : [];
}

/**
 * Renders the planned dashboard roster and the reporting plan. This is a plan
 * only: rendering it sends no invitation, creates no membership, and writes
 * nothing to partner_onboarding_planned_users. `invitation_status` and
 * `membership_status` are owned by Lane A and are read here purely to
 * report what the roster looks like today.
 */
export function renderDashboardUserReportingMatrix(
  input: ArtifactSourceInput
): RenderedDocument {
  const ctx: Ctx = { input, gaps: 0 };
  const sections: RenderedSection[] = [
    matrixScopeSection(),
    plannedUserSection(ctx),
    dashboardAuthoritySection(ctx),
    reportingSection(ctx),
    reportingConstraintsSection(ctx)
  ];

  return {
    documentTitle: "Dashboard User and Reporting Matrix",
    organizationName:
      text(ctx, "organization_contacts", "public_organization_name") ??
      input.partnerRecord.organizationName,
    programName:
      text(ctx, "organization_contacts", "public_program_name") ??
      input.partnerRecord.programName,
    generatorVersion: DASHBOARD_USER_REPORTING_MATRIX_GENERATOR_VERSION,
    sections,
    gapCount: ctx.gaps
  };
}

function matrixScopeSection(): RenderedSection {
  return {
    key: "matrix_scope",
    heading: "What this matrix is",
    blocks: [
      {
        kind: "paragraph",
        text:
          "This is the plan for who will use the partner dashboard, what each person will be able to do, and who receives reports. Preparing or approving it invites nobody, creates no dashboard account, and changes no existing access. Access is released separately by LegalEase."
      }
    ]
  };
}

function plannedUserSection(ctx: Ctx): RenderedSection {
  const users = plannedUsers(ctx);
  const blocks: RenderedBlock[] = [];

  if (users.length === 0) {
    blocks.push(gap(ctx, "staff_dashboard_plan", "planned_users"));
    return { key: "planned_users", heading: "Planned dashboard users", blocks };
  }

  const administratorRowId = raw(
    ctx,
    "staff_dashboard_plan",
    "primary_dashboard_administrator_row_id"
  );

  for (const [index, user] of users.entries()) {
    const items: Array<{ term: string; value: string }> = [];
    const role = labelFrom(ROW_ENUM_LABELS, user.requested_role);
    if (role) items.push({ term: "Requested role", value: role });
    if (user.work_email) items.push({ term: "Work email", value: user.work_email });

    const permissions = Array.isArray(user.special_permissions)
      ? user.special_permissions
          .map((permission) => labelFrom(ROW_ENUM_LABELS, permission))
          .filter((permission): permission is string => permission !== null)
      : [];
    items.push({
      term: "Special permissions",
      value: permissions.length > 0 ? permissions.join(", ") : "None requested"
    });

    items.push({
      term: "Training",
      value:
        labelFrom(TRAINING_STATUS_LABELS, user.training_status) ??
        (user.training_attendee ? "Attending training" : "Not attending training")
    });
    if (user.training_completed_at) {
      items.push({
        term: "Training completed",
        value: String(user.training_completed_at).slice(0, 10)
      });
    }
    items.push({
      term: "Invitation",
      value:
        labelFrom(INVITATION_STATUS_LABELS, user.invitation_status) ??
        "No invitation released"
    });
    items.push({
      term: "Dashboard access",
      value:
        labelFrom(MEMBERSHIP_STATUS_LABELS, user.membership_status) ??
        "Planned, no dashboard access yet"
    });
    if (
      typeof administratorRowId === "string" &&
      administratorRowId === user.stable_row_id
    ) {
      items.push({
        term: "Primary dashboard administrator",
        value: "Yes"
      });
    }

    blocks.push({
      kind: "paragraph",
      text: user.name?.trim() || `Planned user ${index + 1}`
    });
    blocks.push({ kind: "definitions", items });

    if (!role) {
      blocks.push(
        customGap(
          ctx,
          `Requested role for ${user.name?.trim() || `planned user ${index + 1}`}`,
          "staff_dashboard_plan.planned_users[].requested_role",
          whereToSet("staff_dashboard_plan")
        )
      );
    }
  }

  return { key: "planned_users", heading: "Planned dashboard users", blocks };
}

function dashboardAuthoritySection(ctx: Ctx): RenderedSection {
  const blocks: RenderedBlock[] = [];
  const items: Array<{ term: string; value: string }> = [];
  const gaps: RenderedBlock[] = [];

  for (const dataKey of [
    "user_invitation_authority_role",
    "code_management_authority_role",
    "report_export_authority_role"
  ]) {
    const value = labelFrom(
      ROW_ENUM_LABELS,
      raw(ctx, "staff_dashboard_plan", dataKey)
    );
    if (value) {
      items.push({ term: label("staff_dashboard_plan", dataKey), value });
    } else {
      gaps.push(gap(ctx, "staff_dashboard_plan", dataKey));
    }
  }

  const administratorRowId = raw(
    ctx,
    "staff_dashboard_plan",
    "primary_dashboard_administrator_row_id"
  );
  const administrator = plannedUsers(ctx).find(
    (user) => user.stable_row_id === administratorRowId
  );
  if (administrator) {
    items.push({
      term: label("staff_dashboard_plan", "primary_dashboard_administrator_row_id"),
      value: [administrator.name, administrator.work_email]
        .filter((part): part is string => Boolean(part))
        .join(" · ")
    });
  } else {
    gaps.push(
      gap(ctx, "staff_dashboard_plan", "primary_dashboard_administrator_row_id")
    );
  }

  const reviewFrequency = text(
    ctx,
    "staff_dashboard_plan",
    "access_review_frequency"
  );
  if (reviewFrequency) {
    items.push({
      term: label("staff_dashboard_plan", "access_review_frequency"),
      value: reviewFrequency
    });
  } else {
    gaps.push(gap(ctx, "staff_dashboard_plan", "access_review_frequency"));
  }

  if (items.length > 0) blocks.push({ kind: "definitions", items });
  blocks.push(...gaps);
  return {
    key: "authority",
    heading: "Who may do what, and how often access is reviewed",
    blocks
  };
}

function reportingSection(ctx: Ctx): RenderedSection {
  const blocks: RenderedBlock[] = [];
  const recipients = reportRecipients(ctx);

  if (recipients.length > 0) {
    blocks.push({
      kind: "definitions",
      items: recipients.map((recipient, index) => ({
        term: recipient.name?.trim() || `Report recipient ${index + 1}`,
        value: recipient.work_email ?? "No work email recorded"
      }))
    });
  } else {
    blocks.push(gap(ctx, "support_referrals_reporting", "report_recipients"));
  }

  const collected = {
    items: [] as Array<{ term: string; value: string }>,
    gaps: [] as RenderedBlock[]
  };
  row(ctx, "support_referrals_reporting", "reporting_cadence", collected);
  if (collected.items.length > 0) {
    blocks.push({ kind: "definitions", items: collected.items });
  }
  blocks.push(...collected.gaps);

  const metrics = list(
    ctx,
    "support_referrals_reporting",
    "funder_required_metrics"
  );
  if (metrics.length > 0) blocks.push({ kind: "bullets", items: metrics });

  return { key: "reporting", heading: "Reports and who receives them", blocks };
}

function reportingConstraintsSection(ctx: Ctx): RenderedSection {
  const blocks: RenderedBlock[] = [];
  const restrictions = list(
    ctx,
    "support_referrals_reporting",
    "data_use_restrictions"
  );
  if (restrictions.length > 0) {
    blocks.push({ kind: "bullets", items: restrictions });
  }
  const external = text(
    ctx,
    "support_referrals_reporting",
    "external_outcome_data_description"
  );
  if (external) blocks.push({ kind: "paragraph", text: external });

  const readOnly = ctx.input.readOnlyValues;
  const items: Array<{ term: string; value: string }> = [];
  if (readOnly.screening_allocation != null) {
    items.push({
      term: "Screening allocation",
      value: String(readOnly.screening_allocation)
    });
  }
  if (readOnly.packet_credits != null) {
    items.push({ term: "Packet credits", value: String(readOnly.packet_credits) });
  }
  if (items.length > 0) blocks.push({ kind: "definitions", items });

  if (blocks.length === 0) {
    blocks.push({
      kind: "paragraph",
      text: "No data-use restriction or external outcome data source is recorded."
    });
  }
  return {
    key: "reporting_constraints",
    heading: "Data-use restrictions and allocation",
    blocks
  };
}

// --- Staff Quick-Start Guide -------------------------------------------------

/**
 * The one-page guide partner staff work from. Everything about what the program
 * is and is not, and what staff must not say, is LegalEase-controlled language
 * and is covered by this generator's version rather than by partner data.
 */
export function renderStaffQuickStartGuide(
  input: ArtifactSourceInput
): RenderedDocument {
  const ctx: Ctx = { input, gaps: 0 };
  const sections: RenderedSection[] = [
    quickStartWhatItIsSection(),
    quickStartWhereToSendSection(ctx),
    quickStartAccessSection(ctx),
    quickStartReferralLanguageSection(ctx),
    quickStartSupportSection(ctx),
    quickStartDashboardSection(ctx),
    quickStartAvoidSection()
  ];

  return {
    documentTitle: "Staff Quick-Start Guide",
    organizationName:
      text(ctx, "organization_contacts", "public_organization_name") ??
      input.partnerRecord.organizationName,
    programName:
      text(ctx, "organization_contacts", "public_program_name") ??
      input.partnerRecord.programName,
    generatorVersion: STAFF_QUICK_START_GUIDE_GENERATOR_VERSION,
    sections,
    gapCount: ctx.gaps
  };
}

function quickStartWhatItIsSection(): RenderedSection {
  return {
    key: "what_it_is",
    heading: "What this program does and does not do",
    blocks: [
      {
        kind: "bullets",
        items: [
          "It helps a participant find out whether their record may be clearable and prepare their own paperwork.",
          "It prepares record-clearing documents for the participant to review, sign, and file.",
          "It does not give legal advice, and it does not represent anyone in court.",
          "It does not decide eligibility. The court and state law decide that.",
          "It does not promise that a record will be cleared."
        ]
      },
      {
        kind: "paragraph",
        text:
          "When a prosecutor objects, a contested hearing is scheduled, or a participant needs individual legal advocacy, the self-help path stops and the referral route below applies."
      }
    ]
  };
}

function quickStartWhereToSendSection(ctx: Ctx): RenderedSection {
  const blocks: RenderedBlock[] = [
    {
      kind: "definitions",
      items: [
        {
          term: "Participant page address",
          value:
            "Confirmed by LegalEase when the co-branded page is approved for launch. Do not share an address before then."
        }
      ]
    }
  ];
  const area = text(
    ctx,
    "geography_audience_language_accessibility",
    "service_area_description"
  );
  if (area) {
    blocks.push({
      kind: "definitions",
      items: [
        {
          term: label(
            "geography_audience_language_accessibility",
            "service_area_description"
          ),
          value: area
        }
      ]
    });
  } else {
    blocks.push(
      gap(ctx, "geography_audience_language_accessibility", "service_area_description")
    );
  }

  const outOfArea = text(
    ctx,
    "geography_audience_language_accessibility",
    "out_of_area_policy"
  );
  if (outOfArea) {
    blocks.push({
      kind: "definitions",
      items: [
        {
          term: "Someone outside the service area",
          value: outOfArea
        }
      ]
    });
  }
  const restrictions = text(
    ctx,
    "geography_audience_language_accessibility",
    "population_restrictions"
  );
  if (restrictions) {
    blocks.push({ kind: "paragraph", text: restrictions });
  }
  return { key: "where_to_send", heading: "Where to send a participant", blocks };
}

function quickStartAccessSection(ctx: Ctx): RenderedSection {
  const blocks: RenderedBlock[] = [];
  const collected = {
    items: [] as Array<{ term: string; value: string }>,
    gaps: [] as RenderedBlock[]
  };
  row(ctx, "access_sponsorship_capacity", "participant_access_model", collected);
  row(ctx, "access_sponsorship_capacity", "code_structure", collected);
  row(ctx, "access_sponsorship_capacity", "code_expiration", collected);
  if (collected.items.length > 0) {
    blocks.push({ kind: "definitions", items: collected.items });
  }
  blocks.push(...collected.gaps);
  blocks.push({
    kind: "paragraph",
    text:
      "Access codes are released by LegalEase. Staff never create, edit, or share a code that LegalEase has not released."
  });
  const accommodations = text(
    ctx,
    "geography_audience_language_accessibility",
    "accessibility_accommodations"
  );
  if (accommodations) {
    blocks.push({ kind: "paragraph", text: accommodations });
  }
  return { key: "access", heading: "How a participant gets in", blocks };
}

function quickStartReferralLanguageSection(ctx: Ctx): RenderedSection {
  const organization = supportText(
    ctx,
    "legal_services_referral_organization"
  );
  const blocks: RenderedBlock[] = [];

  if (organization) {
    blocks.push({
      kind: "bullets",
      items: [
        `"This program helps you prepare your own record-clearing paperwork. It is not a law firm and cannot give you legal advice."`,
        `"If your case is contested or you need a lawyer, we refer you to ${organization}."`,
        `"Whether your record can be cleared is decided by the court, not by us."`
      ]
    });
  } else {
    blocks.push(
      gap(
        ctx,
        "support_referrals_reporting",
        "legal_services_referral_organization"
      )
    );
  }

  const collected = {
    items: [] as Array<{ term: string; value: string }>,
    gaps: [] as RenderedBlock[]
  };
  row(ctx, "support_referrals_reporting", "referral_intake_method", collected);
  row(ctx, "support_referrals_reporting", "referral_intake_details", collected);
  row(
    ctx,
    "support_referrals_reporting",
    "referral_response_expectation",
    collected
  );
  if (collected.items.length > 0) {
    blocks.push({ kind: "definitions", items: collected.items });
  }
  blocks.push(...collected.gaps);
  return {
    key: "referral_language",
    heading: "Approved referral language",
    blocks
  };
}

function quickStartSupportSection(ctx: Ctx): RenderedSection {
  const blocks: RenderedBlock[] = [];
  const collected = {
    items: [] as Array<{ term: string; value: string }>,
    gaps: [] as RenderedBlock[]
  };
  row(ctx, "support_referrals_reporting", "participant_support_email", collected);
  row(ctx, "support_referrals_reporting", "participant_support_phone", collected);
  row(
    ctx,
    "support_referrals_reporting",
    "participant_support_response_expectation",
    collected
  );
  if (collected.items.length > 0) {
    blocks.push({ kind: "definitions", items: collected.items });
  }
  blocks.push(...collected.gaps);

  const escalation = contactById(
    ctx,
    raw(ctx, "support_referrals_reporting", "urgent_escalation_contact_id")
  );
  if (escalation) {
    blocks.push({
      kind: "definitions",
      items: [{ term: "Urgent escalation", value: contactLine(escalation) }]
    });
  } else {
    blocks.push(
      gap(ctx, "support_referrals_reporting", "urgent_escalation_contact_id")
    );
  }

  blocks.push({ kind: "paragraph", text: LEGALEASE_TECHNICAL_SUPPORT_ROUTE });
  return { key: "support", heading: "Who to contact", blocks };
}

function quickStartDashboardSection(ctx: Ctx): RenderedSection {
  const blocks: RenderedBlock[] = [];
  const administratorRowId = raw(
    ctx,
    "staff_dashboard_plan",
    "primary_dashboard_administrator_row_id"
  );
  const administrator = plannedUsers(ctx).find(
    (user) => user.stable_row_id === administratorRowId
  );
  if (administrator) {
    blocks.push({
      kind: "definitions",
      items: [
        {
          term: "Primary dashboard administrator",
          value: [administrator.name, administrator.work_email]
            .filter((part): part is string => Boolean(part))
            .join(" · ")
        }
      ]
    });
  } else {
    blocks.push(
      gap(ctx, "staff_dashboard_plan", "primary_dashboard_administrator_row_id")
    );
  }
  blocks.push({
    kind: "paragraph",
    text:
      "Dashboard access is released by LegalEase to the people named in the dashboard user plan. If you need access, ask the primary dashboard administrator rather than sharing an account."
  });
  return { key: "dashboard", heading: "Getting into the dashboard", blocks };
}

function quickStartAvoidSection(): RenderedSection {
  return {
    key: "avoid",
    heading: "What staff must not say",
    blocks: [
      {
        kind: "bullets",
        items: [
          "Do not say a record will be cleared, or that clearing is guaranteed.",
          "Do not say how long a court will take.",
          "Do not tell a participant whether they are eligible. Let the screening and the court decide.",
          "Do not give legal advice or interpret a statute for a participant.",
          "Do not fill in a participant's answers for them.",
          "Do not promise that a fee will be waived.",
          "Do not share a participant's information with anyone outside the program, including media.",
          "Do not describe this program as legal representation."
        ]
      },
      {
        kind: "paragraph",
        text:
          "This wording is set by LegalEase and is not partner-editable. If something here is wrong for your program, ask LegalEase to change it rather than changing it locally."
      }
    ]
  };
}

// --- Co-branded page configuration -------------------------------------------

const LEGALEASE_PAGE_LOCATION =
  "Internal onboarding review → LegalEase public page language";

function partnerField(
  ctx: Ctx,
  key: string,
  sectionKey: OnboardingSectionKey,
  dataKey: string,
  value: string | null
): PagePreviewField {
  return {
    key,
    label: label(sectionKey, dataKey),
    value,
    ownership: "partner_editable",
    whereToSet: whereToSet(sectionKey)
  };
}

function legalEaseField(
  key: string,
  fieldLabel: string,
  value: string | null
): PagePreviewField {
  return {
    key,
    label: fieldLabel,
    value,
    ownership: "legalease_controlled",
    whereToSet: LEGALEASE_PAGE_LOCATION
  };
}

/**
 * A page slot LegalEase configures, falling back to the partner's approved copy
 * when LegalEase has set nothing. Ownership follows the value that is actually
 * rendered, so the preview marks the slot for whoever really controls what a
 * participant would see.
 */
function configuredField(
  ctx: Ctx,
  key: string,
  fieldLabel: string,
  legalEaseValue: string | null,
  sectionKey: OnboardingSectionKey,
  dataKey: string
): PagePreviewField {
  const legalEase = normalizeText(legalEaseValue);
  if (legalEase) return legalEaseField(key, fieldLabel, legalEase);
  return partnerField(ctx, key, sectionKey, dataKey, text(ctx, sectionKey, dataKey));
}

function normalizeText(value: string | null | undefined): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function assetSlot(
  ctx: Ctx,
  key: string,
  category: string,
  fieldLabel: string
): PagePreviewAsset {
  const asset = ctx.input.assets.find(
    (candidate) =>
      candidate.category === category && candidate.lifecycleStatus !== "deleted"
  );
  return {
    key,
    label: fieldLabel,
    assetId: asset ? asset.id : null,
    whereToSet: "Program setup → Brand and public-page content → Private organizational assets"
  };
}

function languageAvailability(ctx: Ctx): string | null {
  const primary = text(
    ctx,
    "geography_audience_language_accessibility",
    "primary_language"
  );
  const spanish =
    raw(ctx, "geography_audience_language_accessibility", "enable_spanish") ===
    true;
  const additional = list(
    ctx,
    "geography_audience_language_accessibility",
    "additional_languages"
  );
  const languages = [
    ...(primary ? [primary] : []),
    ...(spanish ? ["Spanish"] : []),
    ...additional
  ];
  const unique = languages.filter(
    (language, index) => languages.indexOf(language) === index
  );
  return unique.length > 0 ? unique.join(", ") : null;
}

/**
 * Builds the draft co-branded page configuration and the model both previews
 * render from. It publishes nothing: there is no publication call here, no URL
 * is minted, and approving this artifact makes no page live.
 */
export function renderCoBrandedPageConfiguration(
  input: ArtifactSourceInput
): RenderedDocument {
  const ctx: Ctx = { input, gaps: 0 };

  const preview: CoBrandedPagePreview = {
    publicName: configuredField(
      ctx,
      "public_name",
      "Public organization name",
      input.workspace.publicDisplayName,
      "organization_contacts",
      "public_organization_name"
    ),
    programName: partnerField(
      ctx,
      "program_name",
      "organization_contacts",
      "public_program_name",
      text(ctx, "organization_contacts", "public_program_name")
    ),
    headline: configuredField(
      ctx,
      "headline",
      "Program headline",
      input.workspace.publicHeadline,
      "brand_public_page",
      "program_headline"
    ),
    subheadline: configuredField(
      ctx,
      "subheadline",
      "Program subheadline",
      input.workspace.publicSubheadline,
      "brand_public_page",
      "program_subheadline"
    ),
    organizationDescription: partnerField(
      ctx,
      "organization_description",
      "brand_public_page",
      "approved_organization_description",
      text(ctx, "brand_public_page", "approved_organization_description")
    ),
    serviceArea: partnerField(
      ctx,
      "service_area",
      "geography_audience_language_accessibility",
      "service_area_description",
      text(
        ctx,
        "geography_audience_language_accessibility",
        "service_area_description"
      )
    ),
    targetAudience: partnerField(
      ctx,
      "target_audience",
      "program_goals",
      "target_population",
      text(ctx, "program_goals", "target_population")
    ),
    languageAvailability: {
      key: "language_availability",
      label: "Languages available",
      value: languageAvailability(ctx),
      ownership: "partner_editable",
      whereToSet: whereToSet("geography_audience_language_accessibility")
    },
    participantSupportCopy: partnerField(
      ctx,
      "participant_support_copy",
      "brand_public_page",
      "participant_support_copy",
      text(ctx, "brand_public_page", "participant_support_copy")
    ),
    supportEmail: partnerField(
      ctx,
      "support_email",
      "support_referrals_reporting",
      "participant_support_email",
      supportText(ctx, "participant_support_email")
    ),
    supportPhone: partnerField(
      ctx,
      "support_phone",
      "support_referrals_reporting",
      "participant_support_phone",
      supportText(ctx, "participant_support_phone")
    ),
    primaryActionLabel: partnerField(
      ctx,
      "primary_action_label",
      "brand_public_page",
      "primary_cta_label",
      text(ctx, "brand_public_page", "primary_cta_label")
    ),
    partnerPrivacyUrl: partnerField(
      ctx,
      "partner_privacy_url",
      "brand_public_page",
      "partner_privacy_url",
      text(ctx, "brand_public_page", "partner_privacy_url")
    ),
    accessibilityUrl: partnerField(
      ctx,
      "accessibility_url",
      "brand_public_page",
      "accessibility_url",
      text(ctx, "brand_public_page", "accessibility_url")
    ),
    legalEaseSupportRouting: legalEaseField(
      "legalease_support_routing",
      "Participant routing and support statement",
      normalizeText(input.workspace.supportInstructions)
    ),
    logo: assetSlot(ctx, "logo", "transparent_logo", "Transparent logo"),
    heroImage: assetSlot(
      ctx,
      "hero_image",
      "hero_or_community_image",
      "Hero or community image"
    ),
    showPartnerLogo: input.workspace.showPartnerLogo !== false,
    showPoweredBy: input.workspace.showPoweredBy !== false,
    legalBlocks: Object.entries(LEGALEASE_PUBLIC_PAGE_LANGUAGE).map(
      ([category, block]) => ({
        category,
        heading: block.heading,
        body: block.body
      })
    ),
    missing: []
  };

  const missing: Array<{ label: string; whereToSet: string }> = [];
  for (const field of [
    preview.publicName,
    preview.headline,
    preview.subheadline,
    preview.organizationDescription,
    preview.serviceArea,
    preview.targetAudience,
    preview.languageAvailability,
    preview.supportEmail,
    preview.primaryActionLabel
  ]) {
    if (field.value === null) {
      missing.push({ label: field.label, whereToSet: field.whereToSet });
    }
  }
  // The logo is only missing if the page is configured to show one.
  if (preview.showPartnerLogo && preview.logo.assetId === null) {
    missing.push({
      label: preview.logo.label,
      whereToSet: preview.logo.whereToSet
    });
  }
  preview.missing = missing;
  ctx.gaps += missing.length;

  const sections: RenderedSection[] = [
    pageOwnershipSection(preview),
    pageLegalEaseSection(preview),
    pageAssetSection(preview),
    pageMissingSection(preview),
    pagePublicationBoundarySection()
  ];

  return {
    documentTitle: "Co-Branded Page Configuration",
    organizationName:
      preview.publicName.value ?? input.partnerRecord.organizationName,
    programName: preview.programName.value ?? input.partnerRecord.programName,
    generatorVersion: CO_BRANDED_PAGE_CONFIGURATION_GENERATOR_VERSION,
    sections,
    gapCount: ctx.gaps,
    pagePreview: preview
  };
}

function pageOwnershipSection(preview: CoBrandedPagePreview): RenderedSection {
  const partnerOwned = [
    preview.publicName,
    preview.programName,
    preview.headline,
    preview.subheadline,
    preview.organizationDescription,
    preview.serviceArea,
    preview.targetAudience,
    preview.languageAvailability,
    preview.participantSupportCopy,
    preview.supportEmail,
    preview.supportPhone,
    preview.primaryActionLabel,
    preview.partnerPrivacyUrl,
    preview.accessibilityUrl
  ].filter((field) => field.ownership === "partner_editable" && field.value);

  return {
    key: "page_partner_content",
    heading: "Content this organization provides and approves",
    blocks:
      partnerOwned.length > 0
        ? [
            {
              kind: "definitions",
              items: partnerOwned.map((field) => ({
                term: field.label,
                value: field.value as string
              }))
            }
          ]
        : [
            {
              kind: "paragraph",
              text: "No partner-provided page content has been recorded yet."
            }
          ]
  };
}

function pageLegalEaseSection(preview: CoBrandedPagePreview): RenderedSection {
  const blocks: RenderedBlock[] = [
    {
      kind: "paragraph",
      text:
        "The content below is set by LegalEase. The partner cannot edit or approve it, and it appears on the page exactly as written here."
    },
    {
      kind: "definitions",
      items: preview.legalBlocks.map((block) => ({
        term: block.heading,
        value: block.body
      }))
    }
  ];

  const legalEaseConfigured = [
    preview.publicName,
    preview.headline,
    preview.subheadline,
    preview.legalEaseSupportRouting
  ].filter((field) => field.ownership === "legalease_controlled" && field.value);
  if (legalEaseConfigured.length > 0) {
    blocks.push({
      kind: "definitions",
      items: legalEaseConfigured.map((field) => ({
        term: field.label,
        value: field.value as string
      }))
    });
  }
  return {
    key: "page_legalease_content",
    heading: "Content LegalEase controls",
    blocks
  };
}

function pageAssetSection(preview: CoBrandedPagePreview): RenderedSection {
  return {
    key: "page_assets",
    heading: "Brand assets on the page",
    blocks: [
      {
        kind: "definitions",
        items: [
          {
            term: preview.logo.label,
            value: preview.logo.assetId
              ? "Uploaded and used on the page"
              : preview.showPartnerLogo
                ? "Not uploaded"
                : "Not uploaded, and the page is configured not to show one"
          },
          {
            term: preview.heroImage.label,
            value: preview.heroImage.assetId ? "Uploaded" : "Not uploaded"
          },
          {
            term: "Partner logo shown on the page",
            value: preview.showPartnerLogo ? "Yes" : "No"
          },
          {
            term: "LegalEase attribution shown",
            value: preview.showPoweredBy ? "Yes" : "No"
          }
        ]
      }
    ]
  };
}

function pageMissingSection(preview: CoBrandedPagePreview): RenderedSection {
  return {
    key: "page_missing",
    heading: "Still needed before this page can be approved",
    blocks:
      preview.missing.length > 0
        ? preview.missing.map((item) => ({
            kind: "gap" as const,
            label: item.label,
            fieldKey: item.label,
            whereToSet: item.whereToSet
          }))
        : [
            {
              kind: "paragraph",
              text: "Every field and asset this page needs has been provided."
            }
          ]
  };
}

function pagePublicationBoundarySection(): RenderedSection {
  return {
    key: "page_boundary",
    heading: "Publication",
    blocks: [
      {
        kind: "paragraph",
        text:
          "This is a draft configuration and a preview of it. Nothing here publishes the page, activates the program, releases an access code, or makes any address reachable by a participant. Publication is a separate, later decision."
      }
    ]
  };
}

// --- Partner Launch Kit ------------------------------------------------------

/**
 * The QR code and the address it encodes. Both are produced on the server from
 * the partner slug the authorized context named; nothing here is ever taken
 * from a browser payload.
 */
export type LaunchKitQr = {
  targetUrl: string;
  qrSvg: string;
  qrDataUrl: string;
  /** True once the page is actually published. It is not, in this release. */
  published: boolean;
};

export type LaunchKitCopyBlock = {
  key: string;
  label: string;
  body: string;
};

export type LaunchKitPayload = {
  qr: LaunchKitQr;
  copy: LaunchKitCopyBlock[];
  guardrails: string[];
  faq: Array<{ question: string; answer: string }>;
};

/**
 * Claims and terminology guardrails. LegalEase-controlled: outreach copy may
 * never promise eligibility or an outcome, and every block below is written to
 * that rule.
 */
export const LAUNCH_KIT_GUARDRAILS: readonly string[] = [
  "Never say a record will be cleared, sealed, or expunged. Say a person may be able to find out whether clearing is possible.",
  "Never promise eligibility. Eligibility is decided by the court and by state law.",
  "Never promise a timeline. Courts set their own schedules.",
  "Never describe this program as legal advice or legal representation.",
  "Never imply a fee will be waived, and never quote a court filing fee as final.",
  "Say self-help paperwork, not case handling, and say participant, not client.",
  "Always keep the LegalEase disclaimer with any public claim about the program."
];

const LAUNCH_KIT_FAQ: ReadonlyArray<{ question: string; answer: string }> = [
  {
    question: "What is this program?",
    answer:
      "It is a free way to find out whether clearing your record may be possible, and to prepare the paperwork to ask the court yourself."
  },
  {
    question: "Does it cost anything?",
    answer:
      "The program is sponsored, so there is nothing to pay for the sponsored scope. Courts charge their own filing fees, which the program does not control."
  },
  {
    question: "Is this a lawyer?",
    answer:
      "No. LegalEase is not a law firm and does not give legal advice or represent anyone. If a matter becomes contested, staff refer participants to the legal-services partner recorded in the operations plan."
  },
  {
    question: "Will my record definitely be cleared?",
    answer:
      "No one can promise that. The court decides, using state law and the facts of each case."
  },
  {
    question: "How long does it take?",
    answer:
      "Preparing the paperwork takes most people well under an hour. How long the court takes afterwards is up to the court."
  },
  {
    question: "What happens to my information?",
    answer:
      "It is handled under the LegalEase privacy practices and is not sold. Participants can see what they submitted in their own private Briefcase."
  }
];

/**
 * Renders the outreach kit a partner launches with. The QR code and its target
 * are computed by the service and passed in; this renderer never derives a URL
 * of its own and never accepts one.
 */
export function renderPartnerLaunchKit(
  input: ArtifactSourceInput,
  qr: LaunchKitQr
): RenderedDocument {
  const ctx: Ctx = { input, gaps: 0 };

  const organization =
    text(ctx, "organization_contacts", "public_organization_name") ??
    input.partnerRecord.organizationName;
  const program =
    text(ctx, "organization_contacts", "public_program_name") ??
    input.partnerRecord.programName;
  const description = text(
    ctx,
    "brand_public_page",
    "approved_organization_description"
  );
  const headline = text(ctx, "brand_public_page", "program_headline");
  const serviceArea = text(
    ctx,
    "geography_audience_language_accessibility",
    "service_area_description"
  );
  const supportEmail = supportText(ctx, "participant_support_email");
  const supportPhone = supportText(ctx, "participant_support_phone");
  const referral = supportText(ctx, "legal_services_referral_organization");
  const accessModel = text(
    ctx,
    "access_sponsorship_capacity",
    "participant_access_model"
  );
  const codeSentence =
    accessModel && accessModel !== "Open to anyone"
      ? ` If ${organization} gave you an access code, enter it when the page asks.`
      : "";
  const where = qr.published
    ? qr.targetUrl
    : `${qr.targetUrl} (not published yet — do not share this address until LegalEase publishes the page)`;

  const shortDescription = headline
    ? `${headline} — a free service from ${organization}.`
    : `A free way to find out whether clearing your record may be possible, from ${organization}.`;

  const longDescription = [
    description,
    `${organization} is working with LegalEase so community members can check whether record clearing may be possible and prepare their own paperwork.`,
    serviceArea ? `Who it serves: ${serviceArea}` : null,
    "LegalEase is not a law firm and does not give legal advice. Whether a record can be cleared is decided by the court."
  ]
    .filter((part): part is string => Boolean(part))
    .join("\n\n");

  const copy: LaunchKitCopyBlock[] = [
    { key: "short_description", label: "Short description", body: shortDescription },
    { key: "long_description", label: "Long description", body: longDescription },
    {
      key: "email",
      label: "Email copy",
      body: [
        `Subject: A free way to check whether your record can be cleared`,
        ``,
        `${organization} is offering a free way to find out whether clearing your record may be possible, and to prepare the paperwork to ask the court yourself.`,
        ``,
        `Start here: ${where}${codeSentence}`,
        ``,
        `There is nothing to pay for the sponsored part of this program. LegalEase is not a law firm and does not give legal advice, and no one can promise that a record will be cleared — the court decides.`,
        ``,
        supportEmail ? `Questions? Email ${supportEmail}.` : ""
      ]
        .filter((line, index, all) => !(line === "" && all[index - 1] === ""))
        .join("\n")
        .trim()
    },
    {
      key: "sms",
      label: "SMS copy",
      body: `${organization}: free help checking whether your record can be cleared, and preparing your own paperwork. Start: ${qr.targetUrl}${codeSentence} Not legal advice; the court decides.`
    },
    {
      key: "social",
      label: "Social copy",
      body: [
        `${organization} + LegalEase`,
        ``,
        `Wondering whether an old record can be cleared? You can find out for free and prepare your own paperwork to ask the court.`,
        ``,
        `${where}`,
        ``,
        `Not legal advice. Eligibility and outcomes are decided by the court.`
      ].join("\n")
    },
    {
      key: "flyer",
      label: "Flyer copy",
      body: [
        `${organization}${program ? ` · ${program}` : ""}`,
        headline ?? "Find out whether your record can be cleared",
        ``,
        `Free. Scan the code or visit ${qr.targetUrl}.${codeSentence}`,
        supportPhone ? `Questions? Call ${supportPhone}.` : "",
        ``,
        `LegalEase is not a law firm and does not give legal advice. No outcome is guaranteed.`
      ]
        .filter(Boolean)
        .join("\n")
    },
    {
      key: "staff_referral_script",
      label: "Staff referral script",
      body: [
        `"We work with a free service that can tell you whether clearing your record might be possible, and help you prepare the paperwork to ask the court yourself."`,
        ``,
        `"I can't tell you whether you qualify — the court decides that — but the screening will walk you through it."`,
        ``,
        referral
          ? `"If it turns out your case is contested or you need a lawyer, we refer people to ${referral}."`
          : `"If it turns out your case is contested or you need a lawyer, we'll refer you to our legal-services partner."`,
        ``,
        `"It's free, and it takes most people under an hour."`
      ].join("\n")
    }
  ];

  const blocks: RenderedSection[] = [
    {
      key: "launch_where",
      heading: "Where to send people",
      blocks: [
        {
          kind: "definitions",
          items: [
            { term: "Participant address", value: where },
            {
              term: "QR code",
              value: qr.published
                ? "Encodes the address above."
                : "Encodes the address above, which is not reachable until LegalEase publishes the page."
            }
          ]
        }
      ]
    },
    ...copy.map((block) => ({
      key: `launch_${block.key}`,
      heading: block.label,
      blocks: [{ kind: "paragraph" as const, text: block.body }]
    })),
    {
      key: "launch_faq",
      heading: "Participant questions",
      blocks: [
        {
          kind: "definitions",
          items: LAUNCH_KIT_FAQ.map((entry) => ({
            term: entry.question,
            value: entry.answer
          }))
        }
      ]
    },
    {
      key: "launch_guardrails",
      heading: "Claims and terminology guardrails",
      blocks: [
        { kind: "bullets", items: [...LAUNCH_KIT_GUARDRAILS] },
        {
          kind: "paragraph",
          text:
            "This wording is set by LegalEase and is not partner-editable. Outreach that promises eligibility, an outcome, or a timeline must not be published."
        }
      ]
    }
  ];

  if (!description) {
    blocks.push({
      key: "launch_gaps",
      heading: "Still needed",
      blocks: [gap(ctx, "brand_public_page", "approved_organization_description")]
    });
  }

  return {
    documentTitle: "Partner Launch Kit",
    organizationName: organization,
    programName: program,
    generatorVersion: PARTNER_LAUNCH_KIT_GENERATOR_VERSION,
    sections: blocks,
    gapCount: ctx.gaps,
    launchKit: {
      qr,
      copy,
      guardrails: [...LAUNCH_KIT_GUARDRAILS],
      faq: LAUNCH_KIT_FAQ.map((entry) => ({ ...entry }))
    }
  };
}
