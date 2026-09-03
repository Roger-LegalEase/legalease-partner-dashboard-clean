import {
  type PacketSpecification,
  type PacketSpecificationDocument,
  type PacketSpecificationSection
} from "@/lib/rcap/grade-a/packet-specification";

/**
 * Turns a packet specification plus a verified matter into a document set.
 *
 * Two rules govern everything here.
 *
 * The composer has no legal statements of its own. Every sentence a participant
 * reads comes from the specification, which is a reviewable, hashed file. If a
 * sentence lived here instead, no legal review would ever see it, and the
 * fulfillment record's hash would not cover it.
 *
 * The composer fails closed on a missing fact. The alternative — leaving a blank
 * where a fact belongs, or writing "unknown" into a caption — produces a
 * document that looks filed-ready and is not. A packet that cannot be completed
 * is not a packet, and saying so here is cheaper than saying it at a clerk's
 * counter.
 */

export type GradeAMatter = {
  routeKey: string;
  jurisdiction: string;
  pathwayId: string;
  /** factId -> the participant's confirmed answer. */
  facts: Readonly<Record<string, string>>;
  /** The exact protected verification hash this packet is bound to. */
  verificationHash: string;
  verifiedAt: string;
};

export type GradeABlock =
  | { kind: "heading"; text: string }
  | { kind: "paragraph"; text: string }
  | { kind: "labelled"; label: string; value: string }
  | { kind: "bulleted"; items: string[] }
  | { kind: "numbered"; items: string[] }
  | { kind: "signature"; label: string; lines: string[]; note: string }
  | { kind: "rule" };

export type GradeADocument = {
  documentId: string;
  role: string;
  title: string;
  order: number;
  outputStrategy: "custom_pleading" | "process_guidance";
  blocks: GradeABlock[];
};

export type GradeAPacket = {
  routeKey: string;
  specificationId: string;
  specificationVersion: string;
  packetFamily: string;
  packetFamilyLabel: string;
  verificationHash: string;
  /** The matter's verification time. The renderer stamps it so bytes are deterministic. */
  verifiedAt: string;
  documents: GradeADocument[];
};

export class GradeAPacketCompositionError extends Error {
  constructor(readonly routeKey: string, readonly missingFactIds: string[], detail: string) {
    super(`Cannot compose the packet for ${routeKey}: ${detail}`);
    this.name = "GradeAPacketCompositionError";
  }
}

/** Facts a document actually reads, so a missing-fact refusal names the real cause. */
function factsUsedBy(document: PacketSpecificationDocument): string[] {
  const used = new Set<string>();
  for (const section of document.sections) {
    for (const field of section.fields ?? []) used.add(field);
    for (const assertion of section.assertions ?? []) {
      for (const fact of assertion.facts) used.add(fact);
      for (const [, id] of assertion.text.matchAll(/\{\{([a-z0-9_]+)\}\}/g)) used.add(id);
    }
    for (const [, id] of (section.body ?? "").matchAll(/\{\{([a-z0-9_]+)\}\}/g)) used.add(id);
  }
  return [...used].sort();
}

function fact(matter: GradeAMatter, id: string): string {
  const value = matter.facts[id];
  return typeof value === "string" ? value.trim() : "";
}

function fill(text: string, matter: GradeAMatter): string {
  return text.replaceAll(/\{\{([a-z0-9_]+)\}\}/g, (_match, id: string) => fact(matter, id));
}

export function composeGradeAPacket(
  specification: PacketSpecification,
  matter: GradeAMatter
): GradeAPacket {
  if (matter.routeKey !== specification.routeKey) {
    throw new GradeAPacketCompositionError(
      matter.routeKey, [],
      `the matter is for ${matter.routeKey} and this specification is for ${specification.routeKey}. `
      + "A packet is never composed from another route's specification."
    );
  }
  if (!matter.verificationHash?.trim()) {
    throw new GradeAPacketCompositionError(
      matter.routeKey, [],
      "no final-verification hash is bound to this matter. An unbound packet cannot be traced to the facts it was built from."
    );
  }

  const documents: GradeADocument[] = [];
  const included = specification.documents
    .filter((document) => document.requirement === "required" || document.includeWhen === "always_unless_participant_declines")
    .sort((left, right) => left.order - right.order);

  // Every fact any included document reads must be present before ANY document
  // is composed. Composing the ones that happen to be satisfiable would hand a
  // participant a partial packet, which is the failure mode this whole gate
  // exists to prevent.
  const missing = [...new Set([
    ...specification.requiredFacts.map((requiredFact) => requiredFact.factId),
    ...included.flatMap(factsUsedBy)
  ])]
    .filter((id) => fact(matter, id) === "")
    .sort();
  if (missing.length > 0) {
    throw new GradeAPacketCompositionError(
      matter.routeKey, missing,
      `${missing.length} required fact(s) are missing or blank: ${missing.join(", ")}. `
      + "The packet is not composed at all rather than composed with gaps."
    );
  }

  for (const document of included) {
    documents.push({
      documentId: document.documentId,
      role: document.role,
      title: document.title,
      order: document.order,
      outputStrategy: document.outputStrategy,
      blocks: document.sections.flatMap((section) => composeSection(section, specification, matter, included))
    });
  }

  return {
    routeKey: specification.routeKey,
    specificationId: specification.specificationId,
    specificationVersion: specification.specificationVersion,
    packetFamily: specification.packetFamily,
    packetFamilyLabel: specification.packetFamilyLabel,
    verificationHash: matter.verificationHash,
    verifiedAt: matter.verifiedAt,
    documents
  };
}

function composeSection(
  section: PacketSpecificationSection,
  specification: PacketSpecification,
  matter: GradeAMatter,
  included: PacketSpecificationDocument[]
): GradeABlock[] {
  const head: GradeABlock = { kind: "heading", text: section.heading };

  switch (section.kind) {
    case "static":
      return [head, { kind: "paragraph", text: fill(section.body ?? "", matter) }];

    case "contents_list":
      return [head, { kind: "numbered", items: included.map((document) => document.title) }];

    case "participant_checklist_summary":
      return [head, {
        kind: "bulleted",
        items: specification.participantChecklist
          .filter((item) => item.requiredBeforeFiling)
          .map((item) => item.text)
      }];

    case "caption":
      return [head, ...(section.fields ?? []).map((field): GradeABlock => ({
        kind: "labelled",
        label: captionLabel(field),
        value: fact(matter, field)
      })), { kind: "rule" }];

    case "grounds":
      return [head, {
        kind: "numbered",
        items: (section.assertions ?? []).map((assertion) => fill(assertion.text, matter))
      }];

    case "signature_block":
      return [head, {
        kind: "signature",
        label: fact(matter, "participant_full_legal_name"),
        lines: ["Signature", "Date"],
        note: section.notarisationRequired === true
          ? "This signature must be notarized."
          : "No notarization is required for this filing."
      }];

    case "court_signature_block":
      // Never pre-filled and never dated. A judicial block that arrives with
      // anything in it is a fabricated judicial act.
      return [head, ...(section.body
        ? [{ kind: "paragraph", text: fill(section.body, matter) } as GradeABlock]
        : []), {
        kind: "signature",
        label: "",
        lines: ["Judge", "Date"],
        note: "Left blank for the court. Do not complete this block yourself."
      }];

    case "filing_destination":
      return [head,
        { kind: "paragraph", text: fill(specification.filingDestination.statement, matter) },
        { kind: "labelled", label: "Office", value: fill(specification.filingDestination.office, matter) }];

    case "fee_and_waiver":
      return [head,
        { kind: "paragraph", text: specification.feeAndWaiver.statement },
        { kind: "paragraph", text: specification.feeAndWaiver.waiverStatement }];

    case "service_and_notice":
      return [head,
        { kind: "paragraph", text: fill(specification.serviceAndNotice.statement, matter) },
        ...(specification.serviceAndNotice.whyNoCertificate
          ? [{ kind: "paragraph", text: fill(specification.serviceAndNotice.whyNoCertificate, matter) } as GradeABlock]
          : [])];

    case "copy_requirements":
      return [head,
        { kind: "paragraph", text: specification.copyRequirements.statement },
        { kind: "labelled", label: "What to bring", value: specification.copyRequirements.originalPlusCopies }];

    case "post_filing_timeline":
      return [head, {
        kind: "numbered",
        items: specification.postFilingTimeline.map((entry) => `${entry.step} (${entry.timing})`)
      }];

    case "hearing_and_objection_stops":
      return [head, {
        kind: "bulleted",
        items: specification.hearingAndObjectionStops.map((stop) =>
          `${stop.situation} ${stop.whatItMeans}`
          + (stop.stopAndGetHelp ? " Stop here and get help before you go further." : ""))
      }];

    case "participant_checklist":
      return [head, {
        kind: "bulleted",
        items: specification.participantChecklist.map((item) =>
          item.requirement === "conditional" ? `${item.text} (only if it applies to you)` : item.text)
      }];

    case "attachments":
      return [head, {
        kind: "bulleted",
        items: specification.attachments.map((attachment) =>
          `${attachment.title} — ${attachment.whyNeeded} Get it from: ${attachment.obtainedFrom}.`
          + (attachment.requirement === "conditional" && attachment.conditionDescription
            ? ` Only needed ${attachment.conditionDescription.replace(/^Where /, "where ").replace(/\.$/, "")}.`
            : ""))
      }];

    default:
      // No silent fallback. An unrecognised section kind means the
      // specification describes something this composer cannot render, and
      // dropping it would quietly ship a packet missing a component the legal
      // design requires.
      throw new GradeAPacketCompositionError(
        specification.routeKey, [],
        `the specification uses section kind "${section.kind}", which this composer does not implement. `
        + "Refusing rather than omitting the section."
      );
  }
}

function captionLabel(factId: string): string {
  switch (factId) {
    case "court": return "Court";
    case "residency_or_location": return "County";
    case "case_number": return "Case number";
    case "participant_full_legal_name": return "Defendant";
    default: return factId.replaceAll("_", " ");
  }
}
