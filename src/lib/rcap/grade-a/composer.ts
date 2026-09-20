import {
  type PacketSpecification,
  type PacketSpecificationDocument,
  type PacketSpecificationSection
} from "@/lib/rcap/grade-a/packet-specification";
import { documentContractFor, isCourtFacing, type DocumentContract } from "@/lib/rcap/grade-a/document-contract";
import { NEVADA_176A_PETITION_BRANCH_CONDITION, nevada176ABranch } from "@/lib/rcap-engine/nevada-176a-branch";
import {
  SD_SIS_ESCALATION_CONDITION,
  SD_SIS_REMEDY_NEEDED_CONDITION,
  SD_SIS_COMPLETED_CONDITION,
  southDakotaEscalationStageReached,
  southDakotaRemedyStillNeeded,
  southDakotaRecordAlreadyCorrected
} from "@/lib/rcap-engine/south-dakota-23a-27-17-escalation";

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
  /** Internal review may render synthetic held artifacts without pretending court confirmation. */
  generationPurpose?: "participant_delivery" | "internal_review";
};

export type GradeABlock =
  | { kind: "heading"; text: string }
  | { kind: "paragraph"; text: string }
  | { kind: "labelled"; label: string; value: string }
  | { kind: "bulleted"; items: string[] }
  | { kind: "numbered"; items: string[] }
  | { kind: "signature"; label: string; lines: string[]; note: string }
  | { kind: "rule" }
  | {
      kind: "pleading_caption";
      court: string;
      /** Adopted multi-line court caption; each line may carry one blank. */
      courtLines?: Array<{ prefix?: string; value?: string; blank?: boolean; suffix?: string }>;
      caseNumberLabel?: string;
      /** Drawn beneath the court line where the court is a blank to complete. */
      courtInstruction?: string;
      /** True where the participant writes the court in at filing. */
      courtBlank?: boolean;
      /** An in-the-matter-of caption, drawn instead of PLAINTIFF / VS. / DEFENDANT. */
      matterTitle?: string;
      caseNumberInstruction?: string;
      caseNumberBlank?: boolean;
      plaintiff: string;
      defendant: string;
      /** The designation printed opposite the defendant. Families that do not
       * name one keep the renderer's generic DEFENDANT/PETITIONER. */
      defendantRole?: string;
      caseNumber: string;
      title: string;
    }
  | { kind: "pleading_paragraph"; text: string; number?: string }
  | {
      kind: "pleading_identity_list";
      introduction?: string;
      number?: string;
      /**
       * `blank` marks a value the participant writes on the printed page. The
       * renderer draws a line for it instead of a value, and the composer never
       * fills one, so an approved blank cannot quietly become a prefilled field.
       */
      items: Array<{ label: string; value: string; blank?: boolean; completedBy?: "participant" | "court" }>;
    }
  | {
      kind: "pleading_signature";
      heading: string;
      name: string;
      role: string;
      contactLines: string[];
      /**
       * The label for a dated signature, where the adopted page rules one.
       *
       * A signature block that cannot carry a date drops something the
       * participant must complete: Illinois's certification page rules
       * "DATE .......... SIGNATURE OF PETITIONER ..........", and a signature
       * rule alone leaves a certification under penalty of perjury undated.
       */
      dateLabel?: string;
    }
  | {
      kind: "notary_verification";
      title: string;
      statement: string;
      jurat: string;
      participantName: string;
      venueState: string;
    }
  | { kind: "service_certificate"; title: string; statement: string; participantName: string }
  | { kind: "official_signature"; title: string; role: string; note?: string }
  | {
      kind: "confidential_identifier_addendum";
      title: string;
      warning: string;
      items: Array<{ label: string; value: string }>;
    };

export type GradeADocument = {
  documentId: string;
  role: string;
  title: string;
  order: number;
  outputStrategy: "custom_pleading" | "process_guidance";
  presentation: "guidance" | "pleading";
  /**
   * The component's own caption decision and whether it is court-facing,
   * carried from the §4.2 document contract so the renderer enforces the
   * contract rather than re-deriving one from `presentation`.
   */
  captionTreatment: DocumentContract["captionTreatment"];
  courtFacing: boolean;
  /**
   * True where the shared §7 guide is built to replace this page.
   *
   * Carried so the renderer can drop it when the guide is actually assembled
   * with the packet, and only then. Marking a component superseded and then
   * shipping it beside its replacement gives the participant two sets of
   * instructions that can drift apart, which is the failure the shared guide
   * exists to end.
   */
  supersededByGuide: boolean;
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

/**
 * Values the participant writes on the printed page rather than supplies to us.
 *
 * Declared by the specification, never inferred: a field is a blank because the
 * approved packet design made it one, and this function reports that decision
 * rather than making it.
 */
/**
 * Fields the platform does not supply.
 *
 * This is an OWNERSHIP question and it answers exactly one thing: whether the
 * composer may demand the value as a fact. It deliberately says nothing about
 * how the field is drawn. An earlier version of this let ownership decide the
 * shape too — every non-platform field became a ruled line — which is wrong:
 * a signature, a jurat, a judicial signature and a court's own findings space
 * are different document structures, and "we do not hold this value" does not
 * distinguish them. Presentation is declared per field in
 * `section.fieldTreatments`.
 */
function notSuppliedByPlatform(specification: PacketSpecification): ReadonlySet<string> {
  const ownership = specification.fieldOwnership;
  return new Set([
    ...(ownership?.participantCompletesBeforeFilingFields ?? []),
    ...(ownership?.participantAtSigningFields ?? []),
    ...(ownership?.participantAtServiceFields ?? []),
    ...(ownership?.notaryOwnedFields ?? []),
    ...(ownership?.prosecutorOwnedFields ?? []),
    ...(ownership?.courtOwnedFields ?? [])
  ]);
}

/** Facts a document actually reads, so a missing-fact refusal names the real cause. */
function factsUsedBy(document: PacketSpecificationDocument, blanks: ReadonlySet<string>): string[] {
  const used = new Set<string>();
  for (const section of document.sections) {
    for (const field of section.fields ?? []) if (!blanks.has(field)) used.add(field);
    for (const assertion of section.assertions ?? []) {
      for (const fact of assertion.facts) used.add(fact);
      for (const [, id] of assertion.text.matchAll(/\{\{([a-z0-9_]+)\}\}/g)) used.add(id);
    }
    for (const [, id] of (section.body ?? "").matchAll(/\{\{([a-z0-9_]+)\}\}/g)) used.add(id);
    for (const [, id] of (section.jurat ?? "").matchAll(/\{\{([a-z0-9_]+)\}\}/g)) used.add(id);
  }
  return [...used].sort();
}

function fact(matter: GradeAMatter, id: string): string {
  const value = matter.facts[id];
  return typeof value === "string" ? value.trim() : "";
}

/**
 * The conditions a specification may gate a component on, and how each is
 * decided. `true` includes the component, `false` omits it, and `undefined` —
 * including a condition with no entry here at all — means the composer cannot
 * tell, which is a refusal and never an omission.
 *
 * The filter used to drop every conditional document unless it carried the one
 * literal string this composer implemented. That is right for a component the
 * participant may simply choose not to supply — Georgia's optional supporting
 * exhibits, South Dakota's escalation motion used only if the record is not
 * corrected — which is why a conditional with NO stated condition is still
 * omitted. It was wrong for a component gated on a branch of the route: Nevada
 * records its subsection 2 petition, proposed order, declaration and filing
 * instructions as conditional on `subsection_2_petition_branch`, and while
 * nothing evaluated that string a participant on that branch would have received
 * a packet with no petition in it and nothing would have said so.
 *
 * The Nevada condition is decided by the same resolver the evaluator routes on
 * and the collection policy gates Checkout on, so the packet cannot disagree
 * with the result the participant was shown. A participant on the automatic
 * branch does not reach this composer at all — screening resolves them to
 * guidance — and a branch the facts do not establish refuses.
 */
const CONDITION_EVALUATORS: Record<string, (facts: Readonly<Record<string, string>>) => boolean | undefined> = {
  always_unless_participant_declines: () => true,
  [NEVADA_176A_PETITION_BRANCH_CONDITION]: (facts) => {
    const branch = nevada176ABranch(facts);
    return branch === "unresolved" ? undefined : branch === "subsection_2_petition";
  },
  /*
   * South Dakota's ordered pair. The written request comes first; the motion to
   * enforce applies only where the request was made and the record was still
   * not corrected. Unanswered is undefined, so the planner reports the
   * condition unevaluable and composition refuses rather than shipping a packet
   * missing the instrument the participant needs.
   */
  [SD_SIS_ESCALATION_CONDITION]: (facts) => southDakotaEscalationStageReached(facts),
  /*
   * Every remedial component on the route, not just the escalation motion. The
   * written request asks a court to fix a record the participant may already
   * have told us is fixed, so it is selected by whether a remedy is needed at
   * all rather than shipped unconditionally.
   */
  [SD_SIS_REMEDY_NEEDED_CONDITION]: (facts) => southDakotaRemedyStillNeeded(facts),
  [SD_SIS_COMPLETED_CONDITION]: (facts) => southDakotaRecordAlreadyCorrected(facts)
};

/**
 * Which components this matter's facts put in the packet, and which conditions
 * could not be decided. Separated from composition so the include decision can
 * be measured on its own, without a full render and without a control having to
 * infer it from an unrelated refusal.
 */
export function planIncludedDocuments(
  specification: PacketSpecification,
  facts: Readonly<Record<string, string>>
): { included: PacketSpecificationDocument[]; unevaluable: PacketSpecificationDocument[] } {
  const decide = (includeWhen: string | undefined) =>
    typeof includeWhen === "string" && includeWhen.length > 0
      ? CONDITION_EVALUATORS[includeWhen]?.(facts)
      : false;
  return {
    included: specification.documents
      .filter((document) =>
        document.requirement === "required"
        /*
         * An optional component is PROVIDED, not demanded.
         *
         * Its source states no condition the platform may evaluate -- the only
         * condition is the participant's own choice or the court's expectation
         * -- so there is nothing to decide and nothing to ask. Georgia's four
         * participant-supplied exhibits sat as `conditional` with no
         * `includeWhen`, which reads as undecidable, and were omitted from
         * every packet permanently. Including them asserts nothing about
         * whether the participant needs them; it puts the separator and its
         * instructions in their hands and leaves the choice where the source
         * leaves it.
         */
        || document.requirement === "optional"
        || decide(document.includeWhen) === true)
      .sort((left, right) => left.order - right.order),
    unevaluable: specification.documents.filter((document) =>
      document.requirement === "conditional"
      && typeof document.includeWhen === "string"
      && document.includeWhen.length > 0
      && decide(document.includeWhen) === undefined)
  };
}

export function includedDocumentIdsForFacts(
  specification: PacketSpecification,
  facts: Readonly<Record<string, string>>
): string[] {
  return planIncludedDocuments(specification, facts).included.map((document) => document.documentId);
}


/**
 * A structured body's own paragraph and list boundaries, as BLOCKS.
 *
 * A transcribed body is not one flowed string: a blank line is a paragraph
 * boundary and a run of "- " lines is a list. Those are the document's
 * structure, and structure is decided here, in the block model, where the
 * section says what it is.
 *
 * It is emphatically NOT decided by `sanitize()`. That function exists to make
 * a single run of text drawable -- folding curly quotes, dropping characters
 * the standard fonts cannot encode -- and it was silently deciding structure by
 * deleting newlines, welding the end of one paragraph to the start of the next.
 * Replacing the newline with a space stopped the welding and still flattened
 * six adopted paragraphs into one. Inline text normalises whitespace; a
 * structured body keeps its boundaries.
 */
function structuredBlocks(
  body: string,
  paragraphKind: "pleading_paragraph" | "paragraph"
): GradeABlock[] {
  const isListLine = (line: string) => /^\s*(?:[-•*]|\(?\d+[.)])\s+/.test(line);
  const blocks: GradeABlock[] = [];
  for (const chunk of body.split(/\n\s*\n/)) {
    const lines = chunk.split("\n").map((line) => line.trimEnd()).filter((line) => line.trim().length > 0);
    if (lines.length === 0) continue;
    // A run of list lines is a list, and keeps one item per line.
    if (lines.length > 1 && lines.every(isListLine)) {
      blocks.push({
        kind: "bulleted",
        items: lines.map((line) => line.replace(/^\s*(?:[-•*]|\(?\d+[.)])\s+/, "").trim())
      } as GradeABlock);
      continue;
    }
    blocks.push({ kind: paragraphKind, text: lines.join(" ").trim() } as GradeABlock);
  }
  return blocks;
}

/**
 * The heading a pleading section DRAWS, where the section says it draws one.
 *
 * Most section headings are the specification's own labels for its parts --
 * "Caption", "Petitioner", "The conviction" -- and belong in the file rather
 * than on the page, which is why a pleading section's heading was never drawn.
 * But some adopted pleadings organise themselves with printed section markers:
 * Illinois's mistaken-identity petition runs A. REQUEST FOR MISTAKEN-IDENTITY
 * CORRECTION through E. CERTIFICATION UNDER 735 ILCS 5/1-109, and its own
 * filing instructions tell the participant to "Complete C1, C2 and C6". A page
 * that drops those markers loses the structure its instructions refer to.
 *
 * IT IS DECLARED, NOT INFERRED FROM SPELLING.
 *
 * A first version drew any heading shaped like a marker -- a letter or number,
 * a period, then a title. That got Illinois's headings onto the page and put a
 * new shared assumption underneath every route: whether a heading is printed
 * would depend on how somebody happened to word it, so renaming an internal
 * label could publish it and rewording a printed one could delete it. The
 * document contract decides structure, so the section says which it is.
 *
 * The pre-existing bare-number rule is untouched: a heading that is literally
 * "3." has always meant a numbered block and still does. It is not widened,
 * and no heading anywhere currently relies on it.
 */
function sectionDesignator(section: PacketSpecificationSection): string | undefined {
  const text = String(section.heading ?? "").trim();
  if (section.headingPresentation === "printed") return text;
  if (section.headingPresentation === "internal") return undefined;
  return /^\d+\.$/.test(text) ? text : undefined;
}

function fill(text: string, matter: GradeAMatter): string {
  return text
    .replaceAll(/\{\{([a-z0-9_]+)\}\}/g, (_match, id: string) => fact(matter, id))
    // A participant may paste a sentence-ending period into a fact that the
    // reviewed template already punctuates. Collapse only an isolated doubled
    // stop; leave deliberate ellipses untouched.
    .replace(/([^.]|^)\.\.(?=\s|$)/g, "$1.");
}

const MISSISSIPPI_NONCONVICTION_ROUTE =
  "MS:non-conviction-expungement-for-dismissal-no-disposition-or-acquittal";

function isoCalendarDateUtc(value: string): number | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return null;
  const [, yearText, monthText, dayText] = match;
  const year = Number(yearText);
  const month = Number(monthText);
  const day = Number(dayText);
  const timestamp = Date.UTC(year, month - 1, day);
  const roundTrip = new Date(timestamp);
  return roundTrip.getUTCFullYear() === year
    && roundTrip.getUTCMonth() === month - 1
    && roundTrip.getUTCDate() === day
    ? timestamp
    : null;
}

function validateRouteSpecificFacts(specification: PacketSpecification, matter: GradeAMatter): void {
  if (specification.routeKey !== MISSISSIPPI_NONCONVICTION_ROUTE) return;

  const invalid: string[] = [];
  if (fact(matter, "actual_arrest") !== "Yes") invalid.push("actual_arrest must be Yes");
  if (fact(matter, "release_confirmed") !== "Yes") invalid.push("release_confirmed must be Yes");
  if (/citation only|no (custodial )?arrest/i.test(fact(matter, "record_type"))) {
    invalid.push("a citation-only record does not establish the actual arrest required by this route");
  }

  const fullSsnDigits = fact(matter, "social_security_number").replace(/\D/g, "");
  const lastFour = fact(matter, "social_security_number_last_four").replace(/\D/g, "");
  if (fullSsnDigits.length !== 9 || lastFour.length !== 4 || !fullSsnDigits.endsWith(lastFour)) {
    invalid.push("social_security_number does not match social_security_number_last_four");
  }

  // The certified disposition and the docket sheet are records the participant
  // fetches from a clerk. Expungement.ai cannot produce either, so neither is a
  // condition of producing what Expungement.ai CAN produce. The petition's
  // "attached as Exhibit A" sentence describes the filing package the
  // participant is instructed to assemble — obtain it, attach it behind the
  // petition, do not file without it — and refusing to compose until they have
  // been to the courthouse would block a purchase on a county clerk. Their
  // status stays a filing-readiness task, asked and tracked, never a gate.

  if (matter.generationPurpose !== "internal_review") {
    const method = fact(matter, "mcic_identifier_delivery_method");
    const methodSource = fact(matter, "mcic_identifier_method_confirmation_source");
    const allowedMethods = new Set([
      "Confidential court-approved MCIC identifier addendum",
      "Court-approved MCIC identifier sheet",
      "Court-approved nonpublic certified copy",
      "Court-approved signed-order identifier channel"
    ]);
    if (!allowedMethods.has(method)) {
      invalid.push("the MCIC identifier-delivery method is not a protected court-approved channel");
    }
    const methodSourceMatch =
      /^Confirmed by (?:the )?[A-Za-z0-9 .,'-]*(?:Court|Clerk)(?:'s Office)? on (\d{4}-\d{2}-\d{2})$/i.exec(methodSource);
    const methodConfirmedAt = isoCalendarDateUtc(methodSourceMatch?.[1] ?? "");
    const verifiedAt = new Date(matter.verifiedAt).getTime();
    if (!methodSourceMatch || methodConfirmedAt === null || !Number.isFinite(verifiedAt) || methodConfirmedAt > verifiedAt) {
      invalid.push("the court of origin has not confirmed the MCIC identifier-delivery method");
    }
    // Not the service-address confirmation either. The specification offers
    // "To be confirmed before filing or service" as an answer and gives the
    // certificate an explicit court-confirmation placeholder for exactly that
    // state, so demanding the confirmed answer made the specification's own
    // second option unreachable. Confirming an address with a clerk is a
    // filing-readiness task.
  }

  if (invalid.length > 0) {
    throw new GradeAPacketCompositionError(
      matter.routeKey,
      [],
      `route-specific filing gate failed: ${invalid.join("; ")}. The packet is not composed.`
    );
  }
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

  // An outside filing-readiness task is not a question the participant has to
  // answer before we will build their packet. We already know a certified
  // disposition has to be fetched; asking them to confirm they have not
  // fetched it yet is friction that buys nothing. The specification supplies
  // its own wording for the not-yet state, and the packet states that, which
  // is also the conservative reading: we hold no confirmation, so we claim
  // none. Applied here as well as in the collection policy so composition
  // never depends on which caller prepared the facts.
  const FILING_READINESS_USE = /filing-readiness gate|assembly and filing|prevents an unverified/;
  const notYetStates: Record<string, string> = {};
  for (const requiredFact of specification.requiredFacts) {
    if (fact(matter, requiredFact.factId) !== "") continue;
    if (!FILING_READINESS_USE.test(String(requiredFact.use ?? ""))) continue;
    const notYet = (requiredFact.options ?? [])
      .find((option) => typeof option === "string" && /^(not |to be )/i.test(option));
    if (notYet) notYetStates[requiredFact.factId] = notYet;
  }
  if (Object.keys(notYetStates).length > 0) {
    matter = { ...matter, facts: { ...matter.facts, ...notYetStates } };
  }

  const plan = planIncludedDocuments(specification, matter.facts);
  if (plan.unevaluable.length > 0) {
    const conditions = [...new Set(plan.unevaluable.map((document) => document.includeWhen))];
    const unknown = conditions.filter((condition) => !(condition! in CONDITION_EVALUATORS));
    throw new GradeAPacketCompositionError(
      matter.routeKey, [],
      `${plan.unevaluable.length} component(s) are conditional on "${conditions.join('", "')}", `
      + (unknown.length > 0
        ? "which this composer does not evaluate: "
        : "which this matter's facts do not establish either way: ")
      + `${plan.unevaluable.map((document) => document.documentId).join(", ")}. `
      + "Refusing rather than shipping a packet that silently omits them."
    );
  }

  const documents: GradeADocument[] = [];
  const included = plan.included;

  // Every fact any included document reads must be present before ANY document
  // is composed. Composing the ones that happen to be satisfiable would hand a
  // participant a partial packet, which is the failure mode this whole gate
  // exists to prevent.
  const blanks = notSuppliedByPlatform(specification);
  const missing = [...new Set([
    ...specification.requiredFacts.map((requiredFact) => requiredFact.factId),
    ...included.flatMap((document) => factsUsedBy(document, blanks))
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

  validateRouteSpecificFacts(specification, matter);

  for (const document of included) {
    documents.push({
      documentId: document.documentId,
      role: document.role,
      title: document.title,
      order: document.order,
      outputStrategy: document.outputStrategy,
      presentation: document.presentation ?? "guidance",
      captionTreatment: documentContractFor(document).captionTreatment,
      courtFacing: isCourtFacing(documentContractFor(document)),
      supersededByGuide: document.supersededBy === "supplemental_guide",
      blocks: document.sections.flatMap((section) =>
        composeSection(section, specification, matter, included, document.presentation ?? "guidance"))
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
  included: PacketSpecificationDocument[],
  presentation: "guidance" | "pleading"
): GradeABlock[] {
  const head: GradeABlock = { kind: "heading", text: section.heading };
  const blanks = notSuppliedByPlatform(specification);
  // A field the approved design leaves for the participant to write on the page
  // is emitted as a labelled blank, never filled. `fact()` is not consulted for
  // one: there is nothing to consult, and reaching for a value here is how an
  // approved blank turns into a prefilled field nobody approved.
  // Presentation comes from the section's own declaration, never from who owns
  // the value. A field nobody else supplies and that declares no treatment is a
  // refusal: the composer does not know what the adopted page draws there, and
  // guessing a ruled line is how one shape silently becomes every shape.
  const fieldItem = (field: string) => {
    const label = section.fieldLabels?.[field] ?? captionLabel(field);
    const treatment = section.fieldTreatments?.[field]
      ?? (blanks.has(field) ? undefined : "value");
    if (treatment === "ruled_blank") return { label, value: "", blank: true, completedBy: "participant" as const };
    if (treatment === "court_owned_space") return { label, value: "", blank: true, completedBy: "court" as const };
    if (treatment === "value") {
      return { label, value: fill(section.fieldValueTemplates?.[field] ?? `{{${field}}}`, matter) };
    }
    throw new GradeAPacketCompositionError(
      specification.routeKey, [],
      `field "${field}" in section "${section.heading}" is not supplied by the platform and declares no `
      + "presentation. Record how the adopted page draws it — a ruled blank the participant completes, a "
      + "space the court completes, or a signature structure — rather than letting ownership imply a shape."
    );
  };

  switch (section.kind) {
    case "pleading_caption": {
      const contract = section.captionContract;
      if (contract) {
        return [{
          kind: "pleading_caption",
          court: blanks.has(contract.court) ? "" : fact(matter, contract.court),
          courtBlank: blanks.has(contract.court),
          ...(contract.courtLines ? { courtLines: contract.courtLines.map((line) => ({
            ...(line.prefix ? { prefix: line.prefix } : {}),
            ...(line.suffix ? { suffix: line.suffix } : {}),
            ...(line.field
              ? (blanks.has(line.field) ? { blank: true } : { value: fact(matter, line.field) })
              : {})
          })) } : {}),
          ...(contract.caseNumberLabel ? { caseNumberLabel: contract.caseNumberLabel } : {}),
          ...(contract.courtInstruction ? { courtInstruction: contract.courtInstruction } : {}),
          ...(contract.matterTitle ? { matterTitle: fill(contract.matterTitle, matter) } : {}),
          plaintiff: "",
          defendant: "",
          caseNumber: blanks.has(contract.caseNumber) ? "" : fact(matter, contract.caseNumber),
          caseNumberBlank: blanks.has(contract.caseNumber),
          ...(contract.caseNumberInstruction ? { caseNumberInstruction: contract.caseNumberInstruction } : {}),
          title: contract.documentTitle ?? section.heading
        }];
      }
      return [{
        kind: "pleading_caption",
        court: fact(matter, "court_name"),
        plaintiff: fact(matter, "case_caption_plaintiff_name"),
        defendant: fact(matter, "case_caption_defendant_name"),
        caseNumber: fact(matter, "case_number"),
        title: section.heading
      }];
    }

    case "pleading_paragraph": {
      const blocks = structuredBlocks(fill(section.body ?? "", matter), "pleading_paragraph");
      const designator = sectionDesignator(section);
      // The designator belongs to the section, so it is drawn once, above the
      // first paragraph -- not repeated over each one.
      if (designator && blocks.length > 0 && blocks[0].kind === "pleading_paragraph") {
        blocks[0] = { ...blocks[0], number: designator };
      }
      return blocks;
    }

    case "pleading_numbered_assertions": {
      const assertions = (section.assertions ?? []).filter((assertion) =>
        assertion.id !== "personal-impact" || fact(matter, "personal_impact_confirmed") === "Yes");
      const numbered = assertions.map((assertion, index) => ({
        kind: "pleading_paragraph" as const,
        text: fill(assertion.text, matter),
        number: `${index + 1}.`
      }));
      // Where the section also declares fields, they follow the numbered
      // paragraphs as labelled lines, which is what an assertion reading "the
      // petitioner states, from the court's own records:" is pointing at. Only
      // Nevada declares them today, so every other route renders exactly as
      // before.
      const listed = (section.fields ?? []).map(fieldItem);
      return listed.length === 0
        ? numbered
        : [...numbered, { kind: "pleading_identity_list" as const, items: listed }];
    }

    // Nevada's participant declaration: the adopted page is an introduction,
    // six numbered paragraphs, and the two lines paragraphs 2 and 3 say are
    // "stated below". Composed from the specification's own text, as every
    // other pleading kind is.
    case "declaration": {
      const introduction = fill(section.body ?? "", matter);
      const numbered = (section.assertions ?? []).map((assertion, index) => ({
        kind: "pleading_paragraph" as const,
        text: fill(assertion.text, matter),
        number: `${index + 1}.`
      }));
      const listed = (section.fields ?? []).map(fieldItem);
      return [
        ...(introduction ? [{ kind: "pleading_paragraph" as const, text: introduction }] : []),
        ...numbered,
        ...(listed.length === 0 ? [] : [{ kind: "pleading_identity_list" as const, items: listed }])
      ];
    }

    // The three participant-guidance screens. Their document contracts record
    // them as `participant_guidance` / `not_a_filing` / recipient participant,
    // so they render as guidance prose and never as pleadings. The prose is the
    // specification's, like every other section's.
    case "route_detection":
    case "route_branch_screen":
    case "discharge_type_screen":
      return [head, ...structuredBlocks(fill(section.body ?? "", matter), "paragraph")];

    case "pleading_identity_list": {
      const hasImpact = fact(matter, "personal_impact_confirmed") === "Yes";
      const number = section.heading === "AUTO"
        ? (hasImpact ? "5." : "4.")
        : sectionDesignator(section);
      /*
       * A multi-paragraph introduction is not one run of text. Nevada's
       * proposed order opens with a recital, then a blank line, then the
       * sentence that introduces the list -- and only the last of those is the
       * list's introduction. Earlier paragraphs stand on their own, as they do
       * on the adopted page.
       */
      const introBlocks = structuredBlocks(fill(section.body ?? "", matter), "pleading_paragraph");
      const introduces = introBlocks.length > 0 ? introBlocks[introBlocks.length - 1] : null;
      const standalone = introBlocks.slice(0, Math.max(0, introBlocks.length - 1));
      return [
        ...standalone,
        {
          kind: "pleading_identity_list",
          introduction: introduces && "text" in introduces ? introduces.text : "",
          number,
          items: (section.fields ?? []).map(fieldItem)
        }
      ];
    }

    case "pro_se_signature_block":
      return [{
        kind: "pleading_signature",
        heading: section.heading,
        name: fact(matter, "participant_full_legal_name"),
        role: fill(section.body ?? "{{participant_full_legal_name}}, Petitioner, Pro Se", matter),
        contactLines: [
          fact(matter, "mailing_address"),
          `Telephone: ${fact(matter, "phone_number")}`,
          `Email: ${fact(matter, "email_address")}`
        ],
        ...(section.signatureDateLabel ? { dateLabel: section.signatureDateLabel } : {})
      }];

    case "verification_on_oath":
      return [{
        kind: "notary_verification",
        title: section.heading,
        statement: fill(section.body ?? "", matter),
        jurat: fill(section.jurat ?? "", matter),
        participantName: fact(matter, "participant_full_legal_name"),
        venueState: "STATE OF MISSISSIPPI"
      }];

    case "service_certificate":
      return [{
        kind: "service_certificate",
        title: "CERTIFICATE OF SERVICE",
        statement: fill(section.body ?? "", matter),
        participantName: fact(matter, "participant_full_legal_name")
      }];

    case "prosecutor_signature_block":
      return [{
        kind: "official_signature",
        title: section.heading,
        role: "PROSECUTING ATTORNEY",
        note: fill(section.body ?? "", matter)
      }];

    case "clerk_certification_block":
      return [{
        kind: "official_signature",
        title: section.heading,
        role: `${fact(matter, "court_type").toUpperCase()} CLERK`,
        note: fill(section.body ?? "", matter)
      }];

    case "confidential_identifier_addendum":
      return [{
        kind: "confidential_identifier_addendum",
        title: section.heading,
        warning: fill(section.body ?? "", matter),
        items: (section.fields ?? []).map(fieldItem)
      }];

    case "static":
      return [head, ...structuredBlocks(fill(section.body ?? "", matter), "paragraph")];

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
      if (presentation === "pleading") {
        return [{
          kind: "official_signature",
          title: section.heading,
          role: `${fact(matter, "court_type").toUpperCase()} JUDGE`,
          note: fill(section.body ?? "", matter)
        }];
      }
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

    case "approved_shipping_component":
      // Not a composer gap, and deliberately not implemented.
      //
      // This kind is a DESCRIPTION of an approved component — a heading naming
      // what it contains ("Caption and motion", "the numbered eligibility
      // statements under § 35-3-37(j)(7), the pardon, ...") plus the field ids
      // it uses. It carries no body, no assertions and no text. There is
      // nothing authoritative here to render, so generic handling could only
      // be invention, and inventing a motion's words is the one thing this
      // composer may never do.
      //
      // The approved text does exist: all 8 families carrying this kind have a
      // census-v1 build host that composed the adopted artifact. So each is the
      // same derivation defect Nevada had — the specification kept the
      // description and dropped the substance — and the fix is per family, in
      // its own §5 batch, by transcribing the adopted text. The shared
      // capabilities that transcription needs (the declaration kind, blanks on
      // numbered assertions, the explicit caption contract) were built for
      // Nevada and are reused, so this is 8 transcriptions and not 8 bespoke
      // renderers.
      throw new GradeAPacketCompositionError(
        specification.routeKey, [],
        `section "${section.heading}" is recorded as an approved_shipping_component, which describes an `
        + "approved component rather than carrying its text. The approved substance is in this family's "
        + "census-v1 build host and was dropped when the specification was derived; transcribe it into the "
        + "specification. Refusing rather than inventing the words it describes."
      );

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
