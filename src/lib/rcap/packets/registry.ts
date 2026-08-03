// Relief-track registry.
//
// Contains the non-production technical fixtures — four that prove the happy
// path for each renderer strategy and six that prove specific failures — plus
// implementation Tranche 1 (Mississippi). Every track in this file carries
// `technicalFixture: true` and `runtimeDisabled: true`, so
// `computeRuntimeStatus` never returns a ready status for any of them and none
// can fulfil a real participant request.
//
// Tranche 1 is the first real relief-track implementation: five Mississippi
// petition routes normalized from the accepted memo and pinned to Master
// Library Edition 1.2. They are runtime-disabled and awaiting counsel review.
// Every other jurisdiction still resolves to nothing and the resolver fails
// closed.
//
// Plan of record: docs/record-clearing/PLAN_OF_RECORD_RELIEF_TRACK_STRATEGY.md

import { MISSISSIPPI_TRANCHE_1_TRACKS } from "@/lib/rcap/packets/registry-mississippi";
import type { PacketSet, ReliefTrack } from "@/lib/rcap/packets/types";
import { computeRuntimeStatus } from "@/lib/rcap/packets/types";

/** Overlay placement on an official form. Rejected unless explicitly confirmed. */
export type OverlayPlacement = {
  componentId: string;
  fieldKey: string;
  page: number;
  x: number;
  y: number;
  size: number;
  maxWidth?: number;
  kind?: "text" | "checkbox";
  /**
   * True only when a human has looked at the rendered page and confirmed this
   * position sits in a blank. The placeholder anchors in the nationwide draft
   * corpus are all unconfirmed and must never be promoted by editing this flag
   * without doing the looking.
   */
  confirmed: boolean;
};

/** Named AcroForm field mapping. Rejected unless the field exists in the source. */
export type AcroFieldMapping = {
  componentId: string;
  fieldKey: string;
  pdfFieldName: string;
  kind: "text" | "checkbox";
  multiline?: boolean;
};

const IOWA_SOURCE =
  "private/Nationwide Record Clearing/LegalEase Iowa/2_86_4_123_PAULA_Expungement_18A04436D4107.pdf";
const IOWA_SHA = "8b2c33815548615733f01f964340fc39efcd8c252ad8c3ee50b97b0639753ffc";

const ARIZONA_SOURCE =
  "private/Nationwide Record Clearing/LegalEase Arizona/AOCCREM3F-071221.pdf";
const ARIZONA_SHA = "3f0a4f97f7a28a63f4f74e4f6c37cc4400a47e35c5669895ebf296c882b79652";

const FIXTURE_APPROVAL = {
  // A technical fixture is never visually or legally approved. These values are
  // what keep it out of packet_ready no matter how well it renders.
  visual: "not_reviewed",
  legal: "not_submitted"
} as const;

// ---------------------------------------------------------------------------
// Packet sets
// ---------------------------------------------------------------------------

const ACROFORM_PACKET_SET: PacketSet = {
  packetSetId: "technical-fixture-acroform-set",
  version: "1.0.0",
  components: [
    {
      componentId: "acroform-primary",
      role: "primary_filing",
      outputStrategy: "official_pdf_fill",
      rendererStrategy: "acroform_fill",
      templateId: null,
      sourcePath: IOWA_SOURCE,
      sourceSha256: IOWA_SHA,
      geographicScope: "statewide",
      requirement: "required",
      order: 1,
      approval: FIXTURE_APPROVAL,
      version: "1.0.0"
    },
    {
      // Mixed-strategy packet set: an official form plus generated
      // instructions. Proves a packet is not one PDF.
      componentId: "acroform-instructions",
      role: "instructions",
      outputStrategy: "process_guidance",
      rendererStrategy: "process_guidance",
      templateId: "technical-fixture-instructions",
      sourcePath: null,
      sourceSha256: null,
      geographicScope: "statewide",
      requirement: "required",
      order: 2,
      approval: FIXTURE_APPROVAL,
      version: "1.0.0"
    }
  ]
};

const OVERLAY_PACKET_SET: PacketSet = {
  packetSetId: "technical-fixture-overlay-set",
  version: "1.0.0",
  components: [
    {
      componentId: "overlay-primary",
      role: "primary_filing",
      outputStrategy: "official_pdf_fill",
      rendererStrategy: "coordinate_overlay",
      templateId: null,
      sourcePath: ARIZONA_SOURCE,
      sourceSha256: ARIZONA_SHA,
      geographicScope: "statewide",
      requirement: "required",
      order: 1,
      approval: FIXTURE_APPROVAL,
      version: "1.0.0"
    }
  ]
};

const PLEADING_PACKET_SET: PacketSet = {
  packetSetId: "technical-fixture-pleading-set",
  version: "1.0.0",
  components: [
    {
      componentId: "pleading-primary",
      role: "primary_filing",
      outputStrategy: "custom_pleading",
      rendererStrategy: "custom_pleading",
      templateId: "technical-fixture-petition",
      sourcePath: null,
      sourceSha256: null,
      geographicScope: "statewide",
      requirement: "required",
      order: 1,
      approval: FIXTURE_APPROVAL,
      version: "1.0.0"
    },
    {
      componentId: "pleading-proposed-order",
      role: "proposed_order",
      outputStrategy: "custom_pleading",
      rendererStrategy: "custom_pleading",
      templateId: "technical-fixture-proposed-order",
      sourcePath: null,
      sourceSha256: null,
      geographicScope: "statewide",
      requirement: "required",
      order: 2,
      approval: FIXTURE_APPROVAL,
      version: "1.0.0"
    },
    {
      componentId: "pleading-certificate-of-service",
      role: "certificate_of_service",
      outputStrategy: "custom_pleading",
      rendererStrategy: "custom_pleading",
      templateId: "technical-fixture-certificate-of-service",
      sourcePath: null,
      sourceSha256: null,
      geographicScope: "statewide",
      requirement: "required",
      order: 3,
      approval: FIXTURE_APPROVAL,
      version: "1.0.0"
    },
    {
      // Conditional component. Renders only when the participant asks for it,
      // which proves the manifest drives assembly rather than a fixed list.
      componentId: "pleading-fee-waiver",
      role: "fee_waiver",
      outputStrategy: "custom_pleading",
      rendererStrategy: "custom_pleading",
      templateId: "technical-fixture-fee-waiver",
      sourcePath: null,
      sourceSha256: null,
      geographicScope: "statewide",
      requirement: "conditional",
      conditionKey: "requestsFeeWaiver",
      order: 4,
      approval: FIXTURE_APPROVAL,
      version: "1.0.0"
    }
  ]
};

const GUIDANCE_PACKET_SET: PacketSet = {
  packetSetId: "technical-fixture-guidance-set",
  version: "1.0.0",
  components: [
    {
      componentId: "guidance-primary",
      role: "process_guidance",
      outputStrategy: "process_guidance",
      rendererStrategy: "process_guidance",
      templateId: "technical-fixture-guidance",
      sourcePath: null,
      sourceSha256: null,
      geographicScope: "agency_specific",
      requirement: "required",
      order: 1,
      approval: FIXTURE_APPROVAL,
      version: "1.0.0"
    }
  ]
};

// ---------------------------------------------------------------------------
// Overlay placements and AcroForm mappings
// ---------------------------------------------------------------------------

/**
 * Arizona AOC CREM3F page 1. Derived from the form's own text layer via
 * `pdftotext -bbox-layout` and then confirmed against a rendered page image.
 * Coordinates are pdf-lib space, origin bottom-left, page 612x792.
 *
 * Every one of these sits in a blank. None overwrites fixed legal language.
 */
export const ARIZONA_OVERLAY_PLACEMENTS: readonly OverlayPlacement[] = [
  { componentId: "overlay-primary", fieldKey: "personFiling", page: 1, x: 141, y: 682, size: 10, maxWidth: 400, confirmed: true },
  { componentId: "overlay-primary", fieldKey: "mailingAddress", page: 1, x: 153, y: 667, size: 10, maxWidth: 390, confirmed: true },
  { componentId: "overlay-primary", fieldKey: "cityStateZip", page: 1, x: 173, y: 651, size: 10, maxWidth: 370, confirmed: true },
  { componentId: "overlay-primary", fieldKey: "emailAddress", page: 1, x: 146, y: 635, size: 10, maxWidth: 390, confirmed: true },
  { componentId: "overlay-primary", fieldKey: "telephone", page: 1, x: 178, y: 619, size: 10, maxWidth: 360, confirmed: true },
  { componentId: "overlay-primary", fieldKey: "county", page: 1, x: 262, y: 544, size: 10, maxWidth: 250, confirmed: true },
  { componentId: "overlay-primary", fieldKey: "caseNumber", page: 1, x: 390, y: 502, size: 10, maxWidth: 150, confirmed: true },
  { componentId: "overlay-primary", fieldKey: "defendantName", page: 1, x: 110, y: 449, size: 10, maxWidth: 260, confirmed: true },
  { componentId: "overlay-primary", fieldKey: "dateOfBirth", page: 1, x: 141, y: 409, size: 10, maxWidth: 240, confirmed: true }
];

/**
 * Iowa 2.86-4 named fields, verified present in the source document.
 *
 * Field NAMES are detectable; field MEANING is not. These bindings were
 * corrected after reading each field's own maxLength: `01.02` accepts two
 * characters and `01.03` four, so neither is a description or a full date. The
 * key names below reflect what each field can physically hold.
 *
 * That is a technical mapping, not a semantic one. Which participant fact
 * belongs in each field is a question for the Iowa form's instructions and
 * counsel review, and is why this track is a fixture rather than a real track.
 */
export const IOWA_ACROFORM_MAPPINGS: readonly AcroFieldMapping[] = [
  { componentId: "acroform-primary", fieldKey: "county", pdfFieldName: "2.86-4.cap.01", kind: "text" },
  { componentId: "acroform-primary", fieldKey: "petitionerName", pdfFieldName: "2.86-4.cap.02", kind: "text" },
  { componentId: "acroform-primary", fieldKey: "caseNumber", pdfFieldName: "2.86-4.cap.03", kind: "text" },
  { componentId: "acroform-primary", fieldKey: "docketNumber", pdfFieldName: "2.86-4.cap.04", kind: "text" },
  { componentId: "acroform-primary", fieldKey: "offenseDate", pdfFieldName: "2.86-4.01.01", kind: "text" },
  { componentId: "acroform-primary", fieldKey: "offenseCode", pdfFieldName: "2.86-4.01.02", kind: "text" },
  { componentId: "acroform-primary", fieldKey: "offenseYear", pdfFieldName: "2.86-4.01.03", kind: "text" },
  { componentId: "acroform-primary", fieldKey: "confirmsEligibility", pdfFieldName: "2.86-4.01.00", kind: "checkbox" }
];

// ---------------------------------------------------------------------------
// Technical fixture tracks
// ---------------------------------------------------------------------------

function fixtureTrack(input: Omit<ReliefTrack, "statuses" | "technicalFixture" | "runtimeDisabled"> & {
  technical: ReliefTrack["statuses"]["technical"];
}): ReliefTrack {
  const statuses = {
    // A fixture proves plumbing, not law. Research is untouched.
    research: "research_pending" as const,
    technical: input.technical,
    visual: "not_reviewed" as const,
    legal: "not_submitted" as const
  };
  return {
    ...input,
    technicalFixture: true,
    runtimeDisabled: true,
    statuses: {
      ...statuses,
      runtime: computeRuntimeStatus({
        statuses,
        sourceCurrent: input.sourceCurrent,
        runtimeDisabled: true,
        outputStrategy: input.outputStrategy
      })
    }
  };
}

export const TECHNICAL_FIXTURE_TRACKS: readonly ReliefTrack[] = [
  fixtureTrack({
    jurisdiction: "IA",
    trackId: "technical-fixture-acroform",
    publicName: "TECHNICAL FIXTURE — AcroForm fill",
    mechanism: "technical_fixture",
    authority: "none; non-production fixture",
    recordTypes: ["technical_fixture"],
    dispositions: ["technical_fixture"],
    courtLevel: "technical_fixture",
    geographicScope: "statewide",
    geographyKeys: [],
    outputStrategy: "official_pdf_fill",
    packetSet: ACROFORM_PACKET_SET,
    requiredInputs: [
      { key: "county", label: "County", required: true },
      { key: "petitionerName", label: "Petitioner name", required: true },
      { key: "caseNumber", label: "Case number", required: true }
    ],
    sourceCurrent: true,
    technical: "renderer_ready",
    customerDeliverableDescription:
      "Non-production technical fixture. Not a filing and not a legal document.",
    notes: "Proves AcroFormFillStrategy against a real source with verified hash."
  }),
  fixtureTrack({
    jurisdiction: "AZ",
    trackId: "technical-fixture-overlay",
    publicName: "TECHNICAL FIXTURE — coordinate overlay",
    mechanism: "technical_fixture",
    authority: "none; non-production fixture",
    recordTypes: ["technical_fixture"],
    dispositions: ["technical_fixture"],
    courtLevel: "technical_fixture",
    geographicScope: "statewide",
    geographyKeys: [],
    outputStrategy: "official_pdf_fill",
    packetSet: OVERLAY_PACKET_SET,
    requiredInputs: [
      { key: "personFiling", label: "Person filing", required: true },
      { key: "county", label: "County", required: true }
    ],
    sourceCurrent: true,
    technical: "renderer_ready",
    customerDeliverableDescription:
      "Non-production technical fixture. Not a filing and not a legal document.",
    notes: "Proves CoordinateOverlayStrategy against a real statewide source."
  }),
  fixtureTrack({
    jurisdiction: "ND",
    trackId: "technical-fixture-pleading",
    publicName: "TECHNICAL FIXTURE — custom pleading",
    mechanism: "technical_fixture",
    authority: "none; non-production fixture",
    recordTypes: ["technical_fixture"],
    dispositions: ["technical_fixture"],
    courtLevel: "technical_fixture",
    geographicScope: "county",
    geographyKeys: ["cass"],
    outputStrategy: "custom_pleading",
    packetSet: PLEADING_PACKET_SET,
    requiredInputs: [
      { key: "petitionerName", label: "Petitioner name", required: true },
      { key: "county", label: "County", required: true },
      { key: "caseNumber", label: "Case number", required: true }
    ],
    sourceCurrent: true,
    technical: "renderer_ready",
    customerDeliverableDescription:
      "Non-production technical fixture. Not a filing and not a legal document.",
    notes:
      "County-scoped so geography fail-closed can be proven. Multi-component with a conditional fee waiver."
  }),
  fixtureTrack({
    jurisdiction: "UT",
    trackId: "technical-fixture-guidance",
    publicName: "TECHNICAL FIXTURE — process guidance",
    mechanism: "technical_fixture",
    authority: "none; non-production fixture",
    recordTypes: ["technical_fixture"],
    dispositions: ["technical_fixture"],
    courtLevel: "not_a_court_process",
    geographicScope: "agency_specific",
    geographyKeys: [],
    outputStrategy: "process_guidance",
    packetSet: GUIDANCE_PACKET_SET,
    requiredInputs: [{ key: "petitionerName", label: "Participant name", required: true }],
    sourceCurrent: true,
    technical: "renderer_ready",
    customerDeliverableDescription:
      "Non-production technical fixture. Guided process information, never a court filing.",
    notes: "Proves ProcessGuidanceRenderer produces guidance and never claims to be a filing."
  })
];

// ---------------------------------------------------------------------------
// Negative-path fixtures.
//
// Each one exists so a specific failure can be proven over real HTTP rather
// than asserted in a comment. They are fixtures like any other: never runtime
// enabled, never packet_ready.
// ---------------------------------------------------------------------------

function singleComponentSet(
  packetSetId: string,
  component: PacketSet["components"][number]
): PacketSet {
  return { packetSetId, version: "1.0.0", components: [component] };
}

const NEGATIVE_FIXTURE_TRACKS: readonly ReliefTrack[] = [
  fixtureTrack({
    jurisdiction: "IA",
    trackId: "technical-fixture-missing-source",
    publicName: "TECHNICAL FIXTURE — absent official source",
    mechanism: "technical_fixture",
    authority: "none; non-production fixture",
    recordTypes: ["technical_fixture"],
    dispositions: ["technical_fixture"],
    courtLevel: "technical_fixture",
    geographicScope: "statewide",
    geographyKeys: [],
    outputStrategy: "official_pdf_fill",
    packetSet: singleComponentSet("technical-fixture-missing-source-set", {
      componentId: "missing-source-primary",
      role: "primary_filing",
      outputStrategy: "official_pdf_fill",
      rendererStrategy: "acroform_fill",
      templateId: null,
      sourcePath: "private/Nationwide Record Clearing/LegalEase Iowa/__does-not-exist__.pdf",
      sourceSha256: "0".repeat(64),
      geographicScope: "statewide",
      requirement: "required",
      order: 1,
      approval: FIXTURE_APPROVAL,
      version: "1.0.0"
    }),
    requiredInputs: [],
    sourceCurrent: true,
    technical: "renderer_ready",
    customerDeliverableDescription: "Non-production fixture. Proves an absent source fails closed.",
    notes: "Renderer failure must leave the packet non-ready."
  }),
  fixtureTrack({
    jurisdiction: "IA",
    trackId: "technical-fixture-hash-mismatch",
    publicName: "TECHNICAL FIXTURE — source hash mismatch",
    mechanism: "technical_fixture",
    authority: "none; non-production fixture",
    recordTypes: ["technical_fixture"],
    dispositions: ["technical_fixture"],
    courtLevel: "technical_fixture",
    geographicScope: "statewide",
    geographyKeys: [],
    outputStrategy: "official_pdf_fill",
    packetSet: singleComponentSet("technical-fixture-hash-mismatch-set", {
      componentId: "acroform-primary",
      role: "primary_filing",
      outputStrategy: "official_pdf_fill",
      rendererStrategy: "acroform_fill",
      templateId: null,
      sourcePath: IOWA_SOURCE,
      // Deliberately wrong: the file is real, the recorded hash is not.
      sourceSha256: "f".repeat(64),
      geographicScope: "statewide",
      requirement: "required",
      order: 1,
      approval: FIXTURE_APPROVAL,
      version: "1.0.0"
    }),
    requiredInputs: [],
    sourceCurrent: true,
    technical: "renderer_ready",
    customerDeliverableDescription: "Non-production fixture. Proves a changed source fails closed.",
    notes: "Source-hash mismatch must refuse to render."
  }),
  fixtureTrack({
    jurisdiction: "AZ",
    trackId: "technical-fixture-unconfirmed-overlay",
    publicName: "TECHNICAL FIXTURE — unconfirmed overlay coordinates",
    mechanism: "technical_fixture",
    authority: "none; non-production fixture",
    recordTypes: ["technical_fixture"],
    dispositions: ["technical_fixture"],
    courtLevel: "technical_fixture",
    geographicScope: "statewide",
    geographyKeys: [],
    outputStrategy: "official_pdf_fill",
    packetSet: singleComponentSet("technical-fixture-unconfirmed-overlay-set", {
      componentId: "unconfirmed-overlay-primary",
      role: "primary_filing",
      outputStrategy: "official_pdf_fill",
      rendererStrategy: "coordinate_overlay",
      templateId: null,
      sourcePath: ARIZONA_SOURCE,
      sourceSha256: ARIZONA_SHA,
      geographicScope: "statewide",
      requirement: "required",
      order: 1,
      approval: FIXTURE_APPROVAL,
      version: "1.0.0"
    }),
    requiredInputs: [],
    sourceCurrent: true,
    technical: "renderer_ready",
    customerDeliverableDescription: "Non-production fixture. Proves placeholder coordinates fail closed.",
    notes: "Its placements carry confirmed:false, exactly like the nationwide draft anchors."
  }),
  fixtureTrack({
    jurisdiction: "PA",
    trackId: "technical-fixture-xfa",
    publicName: "TECHNICAL FIXTURE — XFA source",
    mechanism: "technical_fixture",
    authority: "none; non-production fixture",
    recordTypes: ["technical_fixture"],
    dispositions: ["technical_fixture"],
    courtLevel: "technical_fixture",
    geographicScope: "statewide",
    geographyKeys: [],
    outputStrategy: "official_pdf_fill",
    packetSet: singleComponentSet("technical-fixture-xfa-set", {
      componentId: "xfa-primary",
      role: "primary_filing",
      outputStrategy: "official_pdf_fill",
      rendererStrategy: "acroform_fill",
      templateId: null,
      sourcePath: "private/Nationwide Record Clearing/LegalEase Pennsylvania/213825-file-6289.pdf",
      sourceSha256: "9cc88dc153ffdbc23c94c11eca2153d82926c3bfd1557610cda6577bebb3beac",
      geographicScope: "statewide",
      requirement: "required",
      order: 1,
      approval: FIXTURE_APPROVAL,
      version: "1.0.0"
    }),
    requiredInputs: [],
    sourceCurrent: true,
    technical: "renderer_ready",
    customerDeliverableDescription: "Non-production fixture. Proves an XFA source is handled, not guessed at.",
    notes: "Real XFA source from the nationwide corpus."
  }),
  fixtureTrack({
    jurisdiction: "ME",
    trackId: "technical-fixture-encrypted",
    publicName: "TECHNICAL FIXTURE — encrypted source",
    mechanism: "technical_fixture",
    authority: "none; non-production fixture",
    recordTypes: ["technical_fixture"],
    dispositions: ["technical_fixture"],
    courtLevel: "technical_fixture",
    geographicScope: "statewide",
    geographyKeys: [],
    outputStrategy: "official_pdf_fill",
    packetSet: singleComponentSet("technical-fixture-encrypted-set", {
      componentId: "encrypted-primary",
      role: "primary_filing",
      outputStrategy: "official_pdf_fill",
      rendererStrategy: "acroform_fill",
      templateId: null,
      sourcePath: "private/Nationwide Record Clearing/LegalEase Maine/MJB-Form-cr-218.pdf",
      sourceSha256: "82a9e8084346aa736cf25dc6c663d511e96e7205900b97a7dc2adc4ceec905d4",
      geographicScope: "statewide",
      requirement: "required",
      order: 1,
      approval: FIXTURE_APPROVAL,
      version: "1.0.0"
    }),
    requiredInputs: [],
    sourceCurrent: true,
    technical: "renderer_ready",
    customerDeliverableDescription: "Non-production fixture. Proves an encrypted source is handled, not guessed at.",
    notes: "Real encrypted source from the nationwide corpus."
  }),
  fixtureTrack({
    jurisdiction: "IA",
    trackId: "technical-fixture-stale-source",
    publicName: "TECHNICAL FIXTURE — stale source",
    mechanism: "technical_fixture",
    authority: "none; non-production fixture",
    recordTypes: ["technical_fixture"],
    dispositions: ["technical_fixture"],
    courtLevel: "technical_fixture",
    geographicScope: "statewide",
    geographyKeys: [],
    outputStrategy: "official_pdf_fill",
    packetSet: ACROFORM_PACKET_SET,
    requiredInputs: [],
    // The one difference: the source is no longer current, which alone must
    // withdraw readiness regardless of every other approval.
    sourceCurrent: false,
    technical: "technical_proof_passed",
    customerDeliverableDescription: "Non-production fixture. Proves a stale source blocks readiness.",
    notes: "computeRuntimeStatus must return stale_blocked."
  })
];

/** Placements for the unconfirmed-overlay negative fixture. */
const UNCONFIRMED_OVERLAY_PLACEMENTS: readonly OverlayPlacement[] = [
  {
    componentId: "unconfirmed-overlay-primary",
    fieldKey: "personFiling",
    page: 1,
    // The two repeated geometries from the nationwide draft corpus, unconfirmed.
    x: 72,
    y: 120,
    size: 10,
    confirmed: false
  }
];

/**
 * Every track known to the runtime.
 *
 * The Mississippi entries are implementation Tranche 1: real relief tracks with
 * real pleadings, still carrying `technicalFixture: true` and
 * `runtimeDisabled: true` because reviewing counsel has not approved them. They
 * are generated for review through an explicit `allowTechnicalFixtures` opt-in
 * and can never fulfil a participant request.
 */
export const RELIEF_TRACKS: readonly ReliefTrack[] = [
  ...TECHNICAL_FIXTURE_TRACKS,
  ...NEGATIVE_FIXTURE_TRACKS,
  ...MISSISSIPPI_TRANCHE_1_TRACKS
];

const ALL_OVERLAY_PLACEMENTS: readonly OverlayPlacement[] = [
  ...ARIZONA_OVERLAY_PLACEMENTS,
  ...UNCONFIRMED_OVERLAY_PLACEMENTS
];

export function overlayPlacementsFor(componentId: string): readonly OverlayPlacement[] {
  return ALL_OVERLAY_PLACEMENTS.filter((p) => p.componentId === componentId);
}

export function acroMappingsFor(componentId: string): readonly AcroFieldMapping[] {
  return IOWA_ACROFORM_MAPPINGS.filter((m) => m.componentId === componentId);
}
