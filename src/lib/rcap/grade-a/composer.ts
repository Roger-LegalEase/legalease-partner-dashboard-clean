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
      items: Array<{ label: string; value: string }>;
    }
  | {
      kind: "pleading_signature";
      heading: string;
      name: string;
      role: string;
      contactLines: string[];
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
    for (const [, id] of (section.jurat ?? "").matchAll(/\{\{([a-z0-9_]+)\}\}/g)) used.add(id);
  }
  return [...used].sort();
}

function fact(matter: GradeAMatter, id: string): string {
  const value = matter.facts[id];
  return typeof value === "string" ? value.trim() : "";
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

  for (const exhibitFact of ["certified_disposition_exhibit_status", "docket_sheet_exhibit_status"]) {
    if (/^(missing|no|none|not available|not attached|not inserted|unsure)\b/i.test(fact(matter, exhibitFact))) {
      invalid.push(`${exhibitFact} does not confirm that the participant-supplied court record is available`);
    }
  }

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
    const serviceConfirmation = fact(matter, "service_address_confirmation_status");
    if (serviceConfirmation !== "Confirmed by court or prosecutor") {
      invalid.push("the prosecuting authority service address has not been confirmed");
    }
    const requiredExhibitStates = {
      certified_disposition_exhibit_status: "Attached as Exhibit A",
      docket_sheet_exhibit_status: "Inserted as Exhibit B"
    } as const;
    for (const [exhibitFact, readyState] of Object.entries(requiredExhibitStates)) {
      if (fact(matter, exhibitFact) !== readyState) {
        invalid.push(`${exhibitFact} is not ready for participant delivery; expected ${readyState}`);
      }
    }
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

  validateRouteSpecificFacts(specification, matter);

  for (const document of included) {
    documents.push({
      documentId: document.documentId,
      role: document.role,
      title: document.title,
      order: document.order,
      outputStrategy: document.outputStrategy,
      presentation: document.presentation ?? "guidance",
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

  switch (section.kind) {
    case "pleading_caption":
      return [{
        kind: "pleading_caption",
        court: fact(matter, "court_name"),
        plaintiff: fact(matter, "case_caption_plaintiff_name"),
        defendant: fact(matter, "case_caption_defendant_name"),
        caseNumber: fact(matter, "case_number"),
        title: section.heading
      }];

    case "pleading_paragraph":
      return [{ kind: "pleading_paragraph", text: fill(section.body ?? "", matter) }];

    case "pleading_numbered_assertions": {
      const assertions = (section.assertions ?? []).filter((assertion) =>
        assertion.id !== "personal-impact" || fact(matter, "personal_impact_confirmed") === "Yes");
      return assertions.map((assertion, index) => ({
        kind: "pleading_paragraph" as const,
        text: fill(assertion.text, matter),
        number: `${index + 1}.`
      }));
    }

    case "pleading_identity_list": {
      const hasImpact = fact(matter, "personal_impact_confirmed") === "Yes";
      const number = section.heading === "AUTO"
        ? (hasImpact ? "5." : "4.")
        : (/^\d+\.$/.test(section.heading) ? section.heading : undefined);
      return [{
        kind: "pleading_identity_list",
        introduction: fill(section.body ?? "", matter),
        number,
        items: (section.fields ?? []).map((field) => ({
          label: section.fieldLabels?.[field] ?? captionLabel(field),
          value: fill(section.fieldValueTemplates?.[field] ?? `{{${field}}}`, matter)
        }))
      }];
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
        ]
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
        items: (section.fields ?? []).map((field) => ({
          label: section.fieldLabels?.[field] ?? captionLabel(field),
          value: fill(section.fieldValueTemplates?.[field] ?? `{{${field}}}`, matter)
        }))
      }];

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
