import { createHash } from "node:crypto";

import { ndSafetyDisclaimer } from "../../rcap/state-packs/north-dakota/index";
import { ndNonconvictionClosingConfig } from "../north-dakota-nonconviction-config";
import {
  ND_NONCONVICTION_DATE_SPLIT,
  ND_NONCONVICTION_DOCUMENTS,
  ND_NONCONVICTION_FILING,
  ND_NONCONVICTION_PETITION_SPEC,
  ndComposedPacketSpecHash,
  resolveNdNonconvictionRoute,
  type NdComposedPacketSpec,
  type NdNonconvictionExclusionId
} from "../north-dakota-nonconviction-spec";
import {
  renderCustomPleading,
  type PleadingRenderResult,
  type PleadingSection
} from "../renderers/custom-pleading-renderer";

/**
 * North Dakota composed-packet composer.
 *
 * This does not replace `renderCustomPleading` — it calls it. The shared
 * renderer owns the pleading body (caption, parties, allegations, requested
 * relief, verification, proposed order, proof of service); this module owns
 * everything above that: route binding, required-fact enforcement, the packet's
 * document sequence, the participant filing guide, deterministic pagination, and
 * the document manifest that the artifact and its review are checked against.
 *
 * Determinism is a hard property here, not an aspiration. Given the same facts
 * and the same specification the composer emits byte-identical text: there is no
 * clock, no locale, no randomness, no iteration over an unordered map, and every
 * page break is a function of the line list alone.
 */

// ---------------------------------------------------------------------------
// Layout constants
// ---------------------------------------------------------------------------

/**
 * The composer paginates in characters and the artifact renderer draws in
 * Courier, a monospaced standard PDF font. That is the whole reason the page
 * count the composer reports is the page count the PDF has: 78 characters is
 * exactly the 468pt text measure at 10pt Courier (0.6 em advance), so a line
 * that fits the composer fits the page and never silently overflows the margin.
 */
export const ND_PACKET_LAYOUT = {
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

export interface NdComposedPacketFacts {
  petitionerName?: string;
  petitionerAddress?: string;
  otherNamesUsed?: string;
  courtName?: string;
  countyName?: string;
  judicialDistrict?: string;
  caseNumber?: string;
  charge?: string;
  /** ISO calendar date of the order of nonconviction. */
  nonconvictionOrderDate?: string;
  allChargesDismissedOrAcquitted?: boolean;
  /** Governed local configuration: the clerk office where the case is filed. */
  clerkOfCourtDestination?: string;
  prosecutorOffice?: string;
  arrestingAgency?: string;
  arrestDate?: string;
  exclusions?: readonly NdNonconvictionExclusionId[];
}

export interface NdComposePacketInput {
  facts: NdComposedPacketFacts;
  productName: string;
  /** Route/spec the caller believes applies. Both are checked, never trusted. */
  expectedJurisdiction?: string;
  expectedSpecId?: string;
  expectedSpecVersion?: string;
  /** Pinned spec hash. A mismatch invalidates authority and refuses the compose. */
  expectedSpecHash?: string;
}

// ---------------------------------------------------------------------------
// Outputs
// ---------------------------------------------------------------------------

export interface NdComposedDocument {
  documentId: string;
  sequence: number;
  title: string;
  audience: "court" | "participant";
  requirement: "required" | "conditional";
  /** Paginated lines. `pages[i]` is the exact line list of page i + 1. */
  pages: string[][];
  pageCount: number;
  text: string;
}

export interface NdComposedPacket {
  specId: string;
  specVersion: string;
  specHash: string;
  routeId: string;
  branch: "petition_to_close_nonconviction_records";
  composerVersion: string;
  documents: NdComposedDocument[];
  documentManifest: Array<{
    documentId: string;
    sequence: number;
    title: string;
    audience: "court" | "participant";
    requirement: "required" | "conditional";
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

export type NdComposePacketResult =
  | { status: "composed"; packet: NdComposedPacket }
  | {
    status: "refused";
    reasonCode:
    | "route_not_composed_packet"
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
 * Compose the North Dakota nonconviction-closing packet, or refuse and say why.
 *
 * Refusal is the normal outcome for every input that is not the pre-August 1,
 * 2025 petition branch with complete governed facts. Nothing here degrades to a
 * partial packet, a guessed filing destination, or another state's form.
 */
export function composeNdNonconvictionPacket(
  input: NdComposePacketInput
): NdComposePacketResult {
  const spec: NdComposedPacketSpec = ND_NONCONVICTION_PETITION_SPEC;
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
  const specHash = ndComposedPacketSpecHash(spec);
  if (input.expectedSpecHash && input.expectedSpecHash !== specHash) {
    return refuse(
      "stale_spec_hash",
      "The pinned specification hash does not match the specification in this build; the packet authority is stale.",
      [`pinned=${input.expectedSpecHash}`, `current=${specHash}`]
    );
  }

  const route = resolveNdNonconvictionRoute({
    nonconvictionOrderDate: facts.nonconvictionOrderDate,
    allChargesDismissedOrAcquitted: facts.allChargesDismissedOrAcquitted,
    exclusions: facts.exclusions
  });
  if (route.status !== "composed_packet") {
    return refuse("route_not_composed_packet", route.reason, [
      `routeStatus=${route.status}`,
      `reasonCode=${route.reasonCode}`,
      `branch=${route.branch ?? "(none)"}`
    ]);
  }

  const missing = spec.requiredFacts
    .filter((fact) => !fact.optional)
    .filter((fact) => {
      const value = (facts as Record<string, unknown>)[fact.factId];
      if (fact.factId === "allChargesDismissedOrAcquitted") return value !== true;
      return typeof value !== "string" || value.trim().length === 0;
    })
    .map((fact) => fact.factId);
  // The filing destination is separated from the other required facts because
  // it is the one that decides where paper physically goes. A packet that
  // guessed it would misdirect the filing, so it gets its own refusal code.
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
      "Required facts for the North Dakota nonconviction-closing petition are absent.",
      missing
    );
  }

  const warnings: string[] = [];
  const orderDateLong = longDate(facts.nonconvictionOrderDate as string);
  const arrestDateLong = facts.arrestDate ? longDate(facts.arrestDate) : undefined;
  const renderResult = renderCustomPleading({
    config: ndNonconvictionClosingConfig,
    partyData: {
      petitionerName: facts.petitionerName as string,
      petitionerAddress: facts.petitionerAddress,
      otherNamesUsed: facts.otherNamesUsed
    },
    caseData: {
      countyName: facts.countyName as string,
      judicialDistrict: facts.judicialDistrict,
      docketNumber: facts.caseNumber
    },
    chargeData: {
      chargeDescription: facts.charge,
      disposition:
        "Nonconviction — all criminal charges in the case were dismissed, or the Petitioner was acquitted of all criminal charges",
      dispositionDate: orderDateLong,
      arrestDate: arrestDateLong,
      arrestingAgency: facts.arrestingAgency
    },
    eligibilityData: {
      eligibilityBasisLabel: `Nonconviction court record closing under N.D.C.C. § 12-60.1-05, petition branch — the order of nonconviction was entered before ${longDate(ND_NONCONVICTION_DATE_SPLIT)}`,
      waitingPeriodText: ND_NONCONVICTION_FILING.postFilingRule,
      additionalFacts: [
        "All criminal charges in the above-captioned case were dismissed, or the Petitioner was acquitted of all criminal charges.",
        `The order of nonconviction was entered on ${orderDateLong}, which is before August 1, 2025, so this case uses the Petition to Close Nonconviction Records rather than the automatic closing that applies to orders of nonconviction entered on or after August 1, 2025.`,
        "The dismissal was not part of a plea agreement involving conviction on another offense; the dismissal was not due to a finding that the Petitioner was not fit to proceed; any not-guilty verdict was not due to lack of criminal responsibility; and the case was not appealed."
      ]
    },
    attachments: ["[Proposed] Order Closing Nonconviction Records"],
    productName: input.productName,
    shadowMode: true
  });
  warnings.push(...renderResult.warnings);

  const bySection = new Map(renderResult.sections.map((section) => [section.sectionId, section]));
  const footer = `---\nPrepared by petitioner using ${input.productName}. This is not an official court form.`;

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

  const documents: NdComposedDocument[] = [];
  const specById = new Map(ND_NONCONVICTION_DOCUMENTS.map((doc) => [doc.documentId, doc]));

  documents.push(
    buildDocument(
      specById.get("nd_nonconviction_filing_instructions")!,
      participantInstructionBlocks(facts, spec),
      footer
    )
  );
  documents.push(
    buildDocument(
      specById.get("nd_petition_to_close_nonconviction_records")!,
      [...sectionBlocks(petitionSectionIds, bySection), ...filedWithBlocks(spec)],
      footer
    )
  );
  documents.push(
    buildDocument(
      specById.get("nd_proposed_order_closing_nonconviction_records")!,
      // Standalone document: the shared renderer's in-petition heading ("PROPOSED
      // ORDER") and the petition's roman numeral would both misdescribe a
      // document that is no longer a section of the petition.
      sectionBlocks(["proposed_order"], bySection, { proposed_order: "" }),
      footer
    )
  );
  documents.push(
    buildDocument(
      specById.get("nd_proof_of_service_prosecutor")!,
      sectionBlocks(["certificate_of_service"], bySection, {
        certificate_of_service: "PROOF OF SERVICE ON THE PROSECUTING ATTORNEY"
      }),
      footer
    )
  );

  const emptyRequired = documents.filter(
    (doc) => doc.requirement === "required" && doc.text.replace(/[\s-]/g, "").length === 0
  );
  if (emptyRequired.length > 0) {
    return refuse(
      "missing_required_facts",
      "A required packet document composed empty.",
      emptyRequired.map((doc) => doc.documentId)
    );
  }

  let cursor = 0;
  const documentManifest = documents.map((doc) => {
    const startPage = cursor + 1;
    cursor += doc.pageCount;
    return {
      documentId: doc.documentId,
      sequence: doc.sequence,
      title: doc.title,
      audience: doc.audience,
      requirement: doc.requirement,
      pageCount: doc.pageCount,
      startPage,
      endPage: cursor,
      textSha256: sha256(doc.text)
    };
  });

  const fullText = documents.map((doc) => doc.text).join("\n\n");

  return {
    status: "composed",
    packet: {
      specId: spec.specId,
      specVersion: spec.specVersion,
      specHash,
      routeId: spec.routeId,
      branch: "petition_to_close_nonconviction_records",
      composerVersion: spec.provider.composerVersion,
      documents,
      documentManifest,
      totalPageCount: cursor,
      fullText,
      fullTextSha256: sha256(fullText),
      counselFlags: ndNonconvictionClosingConfig.counselFlags,
      placeholderScan: scanPlaceholders(fullText),
      warnings,
      pleadingRenderResult: renderResult
    }
  };
}

// ---------------------------------------------------------------------------
// Blocks and pagination
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
      // A heading never ends a page alone: it is carried in the same block as
      // the first paragraph under it.
      const withHeading = isFirst && heading ? [heading, "", ...lines] : lines;
      blocks.push({
        lines: withHeading,
        // Signature blocks, the BY THE COURT block and the date line stay whole:
        // a signature line stranded at the top of a page reads as an unsigned
        // filing and is the single most common filing-readability defect.
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

function participantInstructionBlocks(
  facts: NdComposedPacketFacts,
  spec: NdComposedPacketSpec
): Block[] {
  const documentLines = spec.documents
    .filter((doc) => doc.audience === "court")
    .map(
      (doc) =>
        `${doc.sequence - 1}. ${doc.title}${doc.requirement === "conditional" ? " (file only if the judge requires service)" : ""}`
    );

  return [
    { lines: ["HOW TO FILE THIS PACKET"], keepTogether: true },
    {
      lines: [
        "North Dakota Petition to Close Nonconviction Records",
        `Case: ${facts.caseNumber}`,
        `Court: ${facts.courtName}`,
        `County: ${facts.countyName} County`,
        `Judicial district: ${facts.judicialDistrict}`,
        `Order of nonconviction entered: ${longDate(facts.nonconvictionOrderDate as string)}`
      ],
      keepTogether: true
    },
    {
      lines: ["WHY THIS PACKET AND NOT AUTOMATIC CLOSING", "", dateSplitExplanation()],
      keepTogether: false
    },
    { lines: ["WHAT IS IN THIS PACKET", "", ...documentLines], keepTogether: false },
    {
      lines: ["WHERE TO FILE", "", `File with: ${facts.clerkOfCourtDestination}`, "", ND_NONCONVICTION_FILING.destinationRule],
      keepTogether: false
    },
    { lines: ["FILING FEE", "", ND_NONCONVICTION_FILING.feeRule, "", ND_NONCONVICTION_FILING.feeWaiverRule], keepTogether: false },
    { lines: ["COPIES AND SERVICE", "", ND_NONCONVICTION_FILING.copiesRule], keepTogether: false },
    {
      lines: [
        "AFTER YOU FILE",
        "",
        ND_NONCONVICTION_FILING.postFilingRule,
        "",
        ND_NONCONVICTION_FILING.hearingOrObjectionRule
      ],
      keepTogether: false
    },
    {
      lines: [
        "WHAT THE ORDER DOES AND DOES NOT REACH",
        "",
        ND_NONCONVICTION_FILING.reliefScopeRule,
        "",
        ND_NONCONVICTION_FILING.accessAfterClosingRule
      ],
      keepTogether: false
    },
    { lines: ["IMPORTANT", "", ndSafetyDisclaimer], keepTogether: false }
  ];
}

/**
 * The petition's own list of what is filed with it. Composed here rather than
 * taken from the shared renderer's attachment list, because the packet's
 * documents carry their own titles and one of them is conditional; an
 * attachment list that named a document the packet does not use, or that
 * asserted a conditional filing as mandatory, would be wrong on the face of the
 * filing.
 */
function filedWithBlocks(spec: NdComposedPacketSpec): Block[] {
  const courtDocuments = spec.documents.filter(
    (doc) => doc.audience === "court" && doc.documentId !== "nd_petition_to_close_nonconviction_records"
  );
  return [
    {
      lines: [
        "FILED WITH THIS PETITION",
        "",
        ...courtDocuments.map(
          (doc) =>
            `- ${doc.title}${doc.requirement === "conditional" ? " (filed only if the judge requires service on the prosecuting attorney)" : ""}`
        )
      ],
      keepTogether: true
    }
  ];
}

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];

/**
 * ISO calendar date to a court-readable long date, with no locale and no clock:
 * "2021-04-12" becomes "April 12, 2021". A value that is not an ISO date is
 * returned unchanged rather than guessed at.
 */
export function longDate(value: string): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value ?? "");
  if (!match) return value;
  const month = MONTHS[Number(match[2]) - 1];
  if (!month) return value;
  return `${month} ${Number(match[3])}, ${Number(match[1])}`;
}

function dateSplitExplanation(): string {
  return "The order of nonconviction in this case was entered before August 1, 2025. Court records for orders of nonconviction entered on or after August 1, 2025 close on their own 61 days after the order and need no filing. Because this order came earlier, the court record is closed by filing the Petition to Close Nonconviction Records in this packet.";
}

function buildDocument(
  spec: (typeof ND_NONCONVICTION_DOCUMENTS)[number],
  blocks: Block[],
  footer: string
): NdComposedDocument {
  const withFooter: Block[] = [...blocks, { lines: footer.split("\n"), keepTogether: true }];
  const pages = paginate(withFooter);
  return {
    documentId: spec.documentId,
    sequence: spec.sequence,
    title: spec.title,
    audience: spec.audience,
    requirement: spec.requirement,
    pages,
    pageCount: pages.length,
    text: pages.map((page) => page.join("\n")).join("\n")
  };
}

/**
 * Wrap one logical line to the measure.
 *
 * A word longer than the measure (a long docket number, a long URL-shaped
 * value, a long unbroken name) is hard-split rather than allowed to run past
 * the margin, because an overrun is invisible in text and clipped in the PDF.
 * Leading indentation is preserved on continuation lines so a wrapped caption
 * or numbered allegation still reads as one unit.
 */
export function wrapLine(line: string, measure: number = ND_PACKET_LAYOUT.measureChars): string[] {
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
    // A single word wider than the measure is split rather than allowed to run
    // past the margin: an overrun is invisible in text and clipped in the PDF.
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
  const limit = ND_PACKET_LAYOUT.bodyLinesPerPage;
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
      // The block moves whole to the next page rather than being split.
      flush();
    }
    for (const line of wrapped) pushLine(line);
  });
  flush();
  return pages.length > 0 ? pages : [[]];
}

// ---------------------------------------------------------------------------
// Placeholder scan
// ---------------------------------------------------------------------------

/**
 * Tokens that must never appear in composed output. These are the shapes an
 * unfinished template leaves behind: a literal `null`/`undefined` printed from
 * a missing value, an unresolved `{token}`, drafting scaffolding, or a citation
 * the renderer could not resolve.
 */
export const ND_DISALLOWED_OUTPUT_TOKENS = [
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
  const disallowedTokens: string[] = ND_DISALLOWED_OUTPUT_TOKENS.filter((token) =>
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
  reasonCode: Extract<NdComposePacketResult, { status: "refused" }>["reasonCode"],
  reason: string,
  detail: string[]
): NdComposePacketResult {
  return { status: "refused", reasonCode, reason, detail };
}
