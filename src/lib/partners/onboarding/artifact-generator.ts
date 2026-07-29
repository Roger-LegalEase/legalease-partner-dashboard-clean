import {
  IMPLEMENTATION_BRIEF_GENERATOR_VERSION,
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

export type RenderedDocument = {
  documentTitle: string;
  organizationName: string;
  programName: string | null;
  generatorVersion: string;
  sections: RenderedSection[];
  gapCount: number;
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
  mixed: "Mixed code types"
};

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
  technical_security_contact: "Technical and security contact"
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
