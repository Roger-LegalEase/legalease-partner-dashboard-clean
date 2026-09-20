import { createHash } from "node:crypto";

import {
  renderCustomPleading,
  type PleadingRenderResult,
  type PleadingSection
} from "../../../../record-clearing/renderers/custom-pleading-renderer";
import { ndSafetyDisclaimer } from "../index";
import { ndSealingConfigForGround } from "./pleading-config";
import {
  ND_CHAPTER_12_60_1_DOCUMENTS,
  ND_CHAPTER_12_60_1_FILING,
  ND_CHAPTER_12_60_1_SEALING_SPEC,
  ND_CHAPTER_12_60_1_STOP_CONDITIONS,
  ND_SEALING_GROUNDS,
  ndGradeASpecHash,
  resolveNdSealingRoute,
  type NdGradeAPacketSpec,
  type NdSealingExclusionId,
  type NdSealingGroundId
} from "./packet-spec";

/**
 * North Dakota Chapter 12-60.1 Grade-A packet composer.
 *
 * It does not replace `renderCustomPleading` — it calls it. The shared renderer
 * owns the pleading body; this module owns everything above it: route binding,
 * ground selection, required-fact enforcement, the document sequence, the
 * participant filing guide, deterministic pagination, and the document manifest
 * the artifact and its review are checked against.
 *
 * Determinism is a hard property. Given the same facts and the same
 * specification the composer emits byte-identical text: no clock, no locale, no
 * randomness, no iteration over an unordered map, and every page break is a
 * function of the line list alone.
 */

// ---------------------------------------------------------------------------
// Layout
// ---------------------------------------------------------------------------

/**
 * The composer paginates in characters and the artifact renderer draws in
 * Courier, a monospaced standard PDF font. That is why the page count the
 * composer reports is the page count the PDF has: 78 characters is exactly the
 * 468pt text measure at 10pt Courier (0.6 em advance), so a line that fits the
 * composer fits the page and never silently overflows the margin.
 */
export const ND_GRADE_A_LAYOUT = {
  measureChars: 78,
  bodyLinesPerPage: 46,
  fontName: "Courier",
  fontSize: 10,
  lineHeight: 13,
  pageWidth: 612,
  pageHeight: 792,
  margin: 72
} as const;

// ---------------------------------------------------------------------------
// Inputs
// ---------------------------------------------------------------------------

export interface NdGradeAFacts {
  petitionerName?: string;
  petitionerAddress?: string;
  petitionerAliases?: string;
  addressHistory?: string;
  newConvictionCheck?: string;
  courtName?: string;
  countyName?: string;
  judicialDistrict?: string;
  caseNumber?: string;
  charge?: string;
  statuteSection?: string;
  offenseLevel?: string;
  convictionDate?: string;
  sentenceCompletionDate?: string;
  restitutionStatus?: string;
  fullCriminalHistory?: string;
  pendingCharges?: string;
  priorReliefRequests?: string;
  reasonsForSealing?: string;
  rehabilitationEvidence?: string;
  prosecutorOffice?: string;
  serviceMethod?: string;
  clerkOfCourtDestination?: string;
  pardonDate?: string;
  arrestingAgency?: string;
  arrestDate?: string;
  /** Route facts. */
  convicted?: boolean;
  unconditionalPardon?: boolean;
  newConvictionInCleanPeriod?: boolean;
  imprisonmentAndProbationComplete?: boolean;
  restitutionPaid?: boolean;
  exclusions?: readonly NdSealingExclusionId[];
}

export interface NdGradeAComposeInput {
  facts: NdGradeAFacts;
  productName: string;
  expectedJurisdiction?: string;
  expectedSpecId?: string;
  expectedSpecVersion?: string;
  expectedSpecHash?: string;
}

// ---------------------------------------------------------------------------
// Outputs
// ---------------------------------------------------------------------------

export interface NdGradeADocument {
  documentId: string;
  sequence: number;
  title: string;
  audience: "court" | "participant";
  requirement: "required" | "conditional" | "absent_by_design";
  pages: string[][];
  pageCount: number;
  text: string;
}

export interface NdGradeAPacket {
  specId: string;
  specVersion: string;
  specHash: string;
  routeId: string;
  packetFamilyId: string;
  groundId: NdSealingGroundId;
  composerVersion: string;
  documents: NdGradeADocument[];
  documentManifest: Array<{
    documentId: string;
    sequence: number;
    title: string;
    audience: "court" | "participant";
    requirement: "required" | "conditional" | "absent_by_design";
    pageCount: number;
    startPage: number;
    endPage: number;
    textSha256: string;
  }>;
  totalPageCount: number;
  fullText: string;
  fullTextSha256: string;
  counselFlags: string[];
  placeholderScan: { disallowedTokens: string[]; bracketTokensPresent: string[] };
  warnings: string[];
  pleadingRenderResult: PleadingRenderResult;
}

export type NdGradeAComposeResult =
  | { status: "composed"; packet: NdGradeAPacket }
  | {
    status: "refused";
    reasonCode:
    | "route_not_eligible_to_file"
    | "missing_required_facts"
    | "missing_local_configuration"
    | "jurisdiction_mismatch"
    | "spec_identity_mismatch"
    | "stale_spec_hash";
    reason: string;
    detail: string[];
  };

// ---------------------------------------------------------------------------
// Compose
// ---------------------------------------------------------------------------

/**
 * Compose the North Dakota Chapter 12-60.1 sealing packet, or refuse and say
 * why. Refusal is the normal outcome for anything that is not an established,
 * unexcluded, fully-facted matter. Nothing degrades to a partial packet, a
 * guessed filing destination, or another state's form.
 */
export function composeNdSealingPacket(input: NdGradeAComposeInput): NdGradeAComposeResult {
  const spec: NdGradeAPacketSpec = ND_CHAPTER_12_60_1_SEALING_SPEC;
  const facts = input.facts;

  if (input.expectedJurisdiction && input.expectedJurisdiction.trim().toUpperCase() !== "ND") {
    return refuse(
      "jurisdiction_mismatch",
      `This composer produces North Dakota packets only; ${input.expectedJurisdiction} was requested.`,
      [`expectedJurisdiction=${input.expectedJurisdiction}`]
    );
  }
  if (
    (input.expectedSpecId && input.expectedSpecId !== spec.specId)
    || (input.expectedSpecVersion && input.expectedSpecVersion !== spec.specVersion)
  ) {
    return refuse(
      "spec_identity_mismatch",
      "The requested specification identity is not the specification this composer implements.",
      [
        `requested=${input.expectedSpecId ?? "(none)"}@${input.expectedSpecVersion ?? "(none)"}`,
        `implemented=${spec.specId}@${spec.specVersion}`
      ]
    );
  }
  const specHash = ndGradeASpecHash(spec);
  if (input.expectedSpecHash && input.expectedSpecHash !== specHash) {
    return refuse(
      "stale_spec_hash",
      "The pinned specification hash does not match the specification in this build; the packet authority is stale.",
      [`pinned=${input.expectedSpecHash}`, `current=${specHash}`]
    );
  }

  const route = resolveNdSealingRoute({
    offenseLevel: facts.offenseLevel,
    convicted: facts.convicted,
    unconditionalPardon: facts.unconditionalPardon,
    newConvictionInCleanPeriod: facts.newConvictionInCleanPeriod,
    imprisonmentAndProbationComplete: facts.imprisonmentAndProbationComplete,
    restitutionPaid: facts.restitutionPaid,
    exclusions: facts.exclusions
  });
  if (route.status !== "eligible_to_file") {
    return refuse("route_not_eligible_to_file", route.reason, [
      `routeStatus=${route.status}`,
      route.status === "excluded"
        ? `exclusions=${route.exclusionIds.join(",")}`
        : `reasonCode=${route.reasonCode}`
    ]);
  }
  const groundId = route.groundId;
  const ground = ND_SEALING_GROUNDS.find((candidate) => candidate.groundId === groundId)!;

  const missing = spec.requiredFacts
    .filter((fact) => !fact.optional)
    .filter((fact) => !fact.grounds || fact.grounds.includes(groundId))
    .filter((fact) => {
      const value = (facts as Record<string, unknown>)[fact.factId];
      return typeof value !== "string" || value.trim().length === 0;
    })
    .map((fact) => fact.factId);

  // The filing destination is separated from the other required facts because
  // it decides where paper physically goes. A packet that guessed it would
  // misdirect the filing, so it gets its own refusal code.
  const localConfigFacts = ["countyName", "judicialDistrict", "courtName", "clerkOfCourtDestination"];
  const missingLocalConfig = missing.filter((factId) => localConfigFacts.includes(factId));
  if (missingLocalConfig.length > 0) {
    return refuse(
      "missing_local_configuration",
      "The filing destination is governed configuration and is not defaulted; the packet cannot be composed without it.",
      missingLocalConfig
    );
  }
  if (missing.length > 0) {
    return refuse(
      "missing_required_facts",
      "Required facts for the North Dakota Chapter 12-60.1 sealing petition are absent.",
      missing
    );
  }

  const warnings: string[] = [];
  const config = ndSealingConfigForGround(groundId);
  const convictionDateLong = longDate(facts.convictionDate as string);

  const additionalFacts: string[] = [];
  if (groundId === "unconditional_pardon") {
    additionalFacts.push(
      `The Governor of North Dakota granted Petitioner an unconditional pardon for this conviction on ${longDate(facts.pardonDate as string)}.`
    );
  } else {
    additionalFacts.push(
      `Petitioner has not been convicted of a new crime during the ${ground.cleanPeriodYears}-year period immediately before this Petition is filed: ${facts.newConvictionCheck}`,
      `All terms of imprisonment and probation in this case are complete as of ${longDate(facts.sentenceCompletionDate as string)}.`,
      `All restitution ordered in this case has been paid: ${facts.restitutionStatus}.`,
      `Petitioner's complete criminal history, including North Dakota, other states, federal court and foreign countries, is: ${facts.fullCriminalHistory}`,
      `All of Petitioner's prior and pending charges, and all deferred, stayed or continued-for-dismissal matters, are: ${facts.pendingCharges}`,
      `Petitioner's prior pardon, sealing, or return-of-arrest-record requests in any forum are: ${facts.priorReliefRequests}`,
      `Petitioner's address history from the date of the offence to the date of this Petition is: ${facts.addressHistory}`,
      `Petitioner's reformation and rehabilitation are shown by: ${facts.rehabilitationEvidence}`
    );
  }
  additionalFacts.push(`Petitioner asks the Court to grant sealing because: ${facts.reasonsForSealing}`);

  const renderResult = renderCustomPleading({
    config,
    partyData: {
      petitionerName: facts.petitionerName as string,
      petitionerAddress: facts.petitionerAddress,
      otherNamesUsed: facts.petitionerAliases
    },
    caseData: {
      countyName: facts.countyName as string,
      judicialDistrict: facts.judicialDistrict,
      docketNumber: facts.caseNumber
    },
    chargeData: {
      chargeDescription: facts.charge,
      offenseGrade: facts.offenseLevel,
      disposition: "Convicted",
      dispositionDate: convictionDateLong,
      arrestDate: facts.arrestDate ? longDate(facts.arrestDate) : undefined,
      arrestingAgency: facts.arrestingAgency,
      statuteSection: facts.statuteSection
    },
    eligibilityData: {
      eligibilityBasisLabel: ground.label,
      additionalFacts
    },
    attachments: ["[Proposed] Order to Seal Criminal Records"],
    productName: input.productName,
    shadowMode: true
  });
  warnings.push(...renderResult.warnings);

  const bySection = new Map(renderResult.sections.map((section) => [section.sectionId, section]));
  const footer = `---\nPrepared by petitioner using ${input.productName}. This is not an official court form.`;
  const specById = new Map(ND_CHAPTER_12_60_1_DOCUMENTS.map((document) => [document.documentId, document]));

  const petitionSectionIds = [
    "court_caption",
    "case_number_block",
    "document_title",
    "statutory_authority",
    "jurisdiction_venue",
    "parties",
    "facts_case_history",
    "eligibility_allegations",
    "requested_relief",
    "verification_signature"
  ];

  const documents: NdGradeADocument[] = [
    buildDocument(
      specById.get("nd_sealing_filing_instructions")!,
      participantInstructionBlocks(facts, spec, ground.label),
      footer
    ),
    buildDocument(
      specById.get("nd_petition_to_seal_criminal_records")!,
      [...sectionBlocks(petitionSectionIds, bySection), ...filedWithBlocks(spec)],
      footer
    ),
    buildDocument(
      specById.get("nd_proposed_order_to_seal_criminal_records")!,
      // Standalone document: the shared renderer's in-petition heading would
      // misdescribe a document that is no longer a section of the petition.
      sectionBlocks(["proposed_order"], bySection, { proposed_order: "" }),
      footer
    ),
    buildDocument(
      specById.get("nd_proof_of_service_prosecutor")!,
      sectionBlocks(["certificate_of_service"], bySection, {
        certificate_of_service: "PROOF OF SERVICE ON THE PROSECUTING ATTORNEY"
      }),
      footer
    )
  ];

  const emptyRequired = documents.filter(
    (document) => document.requirement === "required" && document.text.replace(/[\s-]/g, "").length === 0
  );
  if (emptyRequired.length > 0) {
    return refuse(
      "missing_required_facts",
      "A required packet document composed empty.",
      emptyRequired.map((document) => document.documentId)
    );
  }

  let cursor = 0;
  const documentManifest = documents.map((document) => {
    const startPage = cursor + 1;
    cursor += document.pageCount;
    return {
      documentId: document.documentId,
      sequence: document.sequence,
      title: document.title,
      audience: document.audience,
      requirement: document.requirement,
      pageCount: document.pageCount,
      startPage,
      endPage: cursor,
      textSha256: sha256(document.text)
    };
  });

  const fullText = documents.map((document) => document.text).join("\n\n");

  return {
    status: "composed",
    packet: {
      specId: spec.specId,
      specVersion: spec.specVersion,
      specHash,
      routeId: spec.routeId,
      packetFamilyId: spec.packetFamilyId,
      groundId,
      composerVersion: spec.provider.rendererVersion,
      documents,
      documentManifest,
      totalPageCount: cursor,
      fullText,
      fullTextSha256: sha256(fullText),
      counselFlags: config.counselFlags,
      placeholderScan: scanPlaceholders(fullText),
      warnings,
      pleadingRenderResult: renderResult
    }
  };
}

// ---------------------------------------------------------------------------
// Blocks
// ---------------------------------------------------------------------------

interface Block {
  lines: string[];
  /** A block that must not be split across a page boundary. */
  keepTogether: boolean;
}

function sectionBlocks(
  sectionIds: string[],
  bySection: Map<string, PleadingSection>,
  headingOverrides: Record<string, string> = {}
): Block[] {
  const blocks: Block[] = [];
  for (const sectionId of sectionIds) {
    const section = bySection.get(sectionId);
    if (!section) continue;
    const heading = sectionId in headingOverrides ? headingOverrides[sectionId] : section.heading;
    const paragraphs = section.text.split("\n\n");
    paragraphs.forEach((paragraph, index) => {
      const lines = paragraph.split("\n");
      const isFirst = index === 0;
      const withHeading = isFirst && heading ? [heading, "", ...lines] : lines;
      blocks.push({
        lines: withHeading,
        // Signature blocks and the BY THE COURT block stay whole: a signature
        // line stranded at the top of a page reads as an unsigned filing, and is
        // the most common filing-readability defect there is.
        keepTogether: isSignatureBlock(paragraph) || (isFirst && Boolean(heading))
      });
    });
  }
  return blocks;
}

function isSignatureBlock(paragraph: string): boolean {
  return (
    paragraph.includes("________________________________")
    || paragraph.startsWith("BY THE COURT:")
    || paragraph.startsWith("Date: ")
  );
}

function filedWithBlocks(spec: NdGradeAPacketSpec): Block[] {
  const courtDocuments = spec.documents.filter(
    (document) =>
      document.audience === "court"
      && document.requirement === "required"
      && document.documentId !== "nd_petition_to_seal_criminal_records"
  );
  return [
    {
      lines: [
        "FILED WITH THIS PETITION",
        "",
        ...courtDocuments.map((document) => `- ${document.title}`)
      ],
      keepTogether: true
    }
  ];
}

function participantInstructionBlocks(
  facts: NdGradeAFacts,
  spec: NdGradeAPacketSpec,
  groundLabel: string
): Block[] {
  const courtDocuments = spec.documents.filter(
    (document) => document.audience === "court" && document.requirement === "required"
  );
  return [
    { lines: ["HOW TO FILE THIS PACKET"], keepTogether: true },
    {
      lines: [
        "North Dakota Petition to Seal Criminal Records",
        `Ground: ${groundLabel}`,
        `Case: ${facts.caseNumber}`,
        `Court: ${facts.courtName}`,
        `County: ${facts.countyName} County`,
        `Judicial district: ${facts.judicialDistrict}`
      ],
      keepTogether: true
    },
    {
      lines: ["WHAT IS IN THIS PACKET", "", ...courtDocuments.map((document, index) => `${index + 1}. ${document.title}`)],
      keepTogether: false
    },
    {
      lines: [
        "THE ORDER YOU DO THINGS IN",
        "",
        "1. Serve the prosecuting attorney first.",
        `   ${ND_CHAPTER_12_60_1_FILING.orderOfOperations}`,
        `   Prosecuting attorney to serve: ${facts.prosecutorOffice}`,
        `   Method of service: ${facts.serviceMethod}`,
        "2. Complete and sign the Proof of Service after you have served.",
        "3. File the Petition, the [Proposed] Order and the Proof of Service together.",
        `   File with: ${facts.clerkOfCourtDestination}`,
        "4. Keep a complete copy of everything you filed."
      ],
      keepTogether: false
    },
    { lines: ["WHERE TO FILE", "", ND_CHAPTER_12_60_1_FILING.venue], keepTogether: false },
    {
      lines: ["FILING FEE", "", ND_CHAPTER_12_60_1_FILING.feeRule, "", ND_CHAPTER_12_60_1_FILING.feeWaiverRule],
      keepTogether: false
    },
    { lines: ["COPIES", "", ND_CHAPTER_12_60_1_FILING.copiesRule], keepTogether: false },
    {
      lines: ["AFTER YOU FILE", "", ND_CHAPTER_12_60_1_FILING.burdenAndStopConditionsRule],
      keepTogether: false
    },
    {
      lines: [
        "WHEN TO STOP AND GET HELP",
        "",
        ...ND_CHAPTER_12_60_1_STOP_CONDITIONS.flatMap((stop, index) => [
          ...(index === 0 ? [] : [""]),
          `${index + 1}. ${stop.condition}`,
          `   ${stop.participantAction}`
        ])
      ],
      keepTogether: false
    },
    {
      lines: [
        "WHAT SEALING DOES AND DOES NOT REACH",
        "",
        ND_CHAPTER_12_60_1_FILING.scopeRule
      ],
      keepTogether: false
    },
    { lines: ["IMPORTANT", "", ndSafetyDisclaimer], keepTogether: false }
  ];
}

// ---------------------------------------------------------------------------
// Pagination
// ---------------------------------------------------------------------------

function buildDocument(
  documentSpec: (typeof ND_CHAPTER_12_60_1_DOCUMENTS)[number],
  blocks: Block[],
  footer: string
): NdGradeADocument {
  const withFooter: Block[] = [...blocks, { lines: footer.split("\n"), keepTogether: true }];
  const pages = paginate(withFooter);
  return {
    documentId: documentSpec.documentId,
    sequence: documentSpec.sequence,
    title: documentSpec.title,
    audience: documentSpec.audience,
    requirement: documentSpec.requirement,
    pages,
    pageCount: pages.length,
    text: pages.map((page) => page.join("\n")).join("\n")
  };
}

/**
 * Wrap one logical line to the measure. A word wider than the measure is split
 * rather than allowed to run past the margin, because an overrun is invisible in
 * text and clipped in the PDF. Leading indentation is preserved on continuation
 * lines so a wrapped caption or numbered allegation still reads as one unit.
 */
export function wrapLine(line: string, measure: number = ND_GRADE_A_LAYOUT.measureChars): string[] {
  if (line.length <= measure) return [line];
  const indent = (/^\s*/.exec(line) ?? [""])[0];
  const continuation = indent.length + 2 <= measure - 20 ? `${indent}  ` : indent;
  const words = line.trim().split(/\s+/);
  const rows: string[] = [];
  let prefix = indent;
  let current = "";
  const push = () => {
    rows.push(`${prefix}${current}`);
    prefix = continuation;
    current = "";
  };

  for (const rawWord of words) {
    let word = rawWord;
    while (word.length > measure - prefix.length) {
      const room = measure - prefix.length - (current.length > 0 ? current.length + 1 : 0);
      if (room > 8) {
        current = current.length > 0 ? `${current} ${word.slice(0, room)}` : word.slice(0, room);
        word = word.slice(room);
      }
      push();
    }
    const candidate = current.length > 0 ? `${current} ${word}` : word;
    if (prefix.length + candidate.length <= measure) {
      current = candidate;
    } else {
      push();
      current = word;
    }
  }
  if (current.length > 0) push();
  return rows.length > 0 ? rows : [line];
}

function paginate(blocks: Block[]): string[][] {
  const limit = ND_GRADE_A_LAYOUT.bodyLinesPerPage;
  const pages: string[][] = [];
  let page: string[] = [];

  const flush = () => {
    while (page.length > 0 && page[page.length - 1] === "") page.pop();
    if (page.length > 0) pages.push(page);
    page = [];
  };
  const pushLine = (line: string) => {
    if (page.length === 0 && line === "") return;
    if (page.length >= limit) flush();
    if (page.length === 0 && line === "") return;
    page.push(line);
  };

  blocks.forEach((block, blockIndex) => {
    const wrapped = block.lines.flatMap((line) => wrapLine(line));
    if (blockIndex > 0) pushLine("");
    if (block.keepTogether && wrapped.length <= limit && page.length + wrapped.length > limit) {
      flush();
    }
    for (const line of wrapped) pushLine(line);
  });
  flush();
  return pages.length > 0 ? pages : [[]];
}

// ---------------------------------------------------------------------------
// Dates and placeholder scan
// ---------------------------------------------------------------------------

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];

/**
 * ISO calendar date to a court-readable long date, with no locale and no clock.
 * A value that is not an ISO date is returned unchanged rather than guessed at,
 * because a misread date in a pleading is worse than an unformatted one.
 */
export function longDate(value: string): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value ?? "");
  if (!match) return value;
  const month = MONTHS[Number(match[2]) - 1];
  if (!month) return value;
  return `${month} ${Number(match[3])}, ${Number(match[1])}`;
}

/**
 * Tokens that must never appear in composed output: the shapes an unfinished
 * template leaves behind — a literal `null`/`undefined` printed from a missing
 * value, an unresolved `{token}`, drafting scaffolding, or a citation the
 * renderer could not resolve.
 */
export const ND_GRADE_A_DISALLOWED_TOKENS = [
  "undefined",
  "NaN",
  "TODO",
  "TBD",
  "FIXME",
  "Lorem ipsum",
  "XXXX",
  "[CITATION REQUIRED",
  "{county}",
  "{",
  "}",
  "[seal]",
  "[logo]"
] as const;

export function scanPlaceholders(text: string): {
  disallowedTokens: string[];
  bracketTokensPresent: string[];
} {
  const disallowedTokens: string[] = ND_GRADE_A_DISALLOWED_TOKENS.filter((token) =>
    text.toLowerCase().includes(token.toLowerCase())
  );
  // A bare `null` only counts when it is a printed value, not part of a word.
  if (/(^|[^A-Za-z])null([^A-Za-z]|$)/.test(text)) disallowedTokens.push("null");
  const bracketTokensPresent = [...new Set(text.match(/\[[^[\]\n]*\]/g) ?? [])].sort();
  return { disallowedTokens: [...new Set(disallowedTokens)], bracketTokensPresent };
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function sha256(value: string): string {
  return createHash("sha256").update(value, "utf8").digest("hex");
}

function refuse(
  reasonCode: Extract<NdGradeAComposeResult, { status: "refused" }>["reasonCode"],
  reason: string,
  detail: string[]
): NdGradeAComposeResult {
  return { status: "refused", reasonCode, reason, detail };
}
