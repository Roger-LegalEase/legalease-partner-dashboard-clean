import {
  GradeAPacketCompositionError,
  type GradeABlock,
  type GradeADocument,
  type GradeAMatter,
  type GradeAPacket
} from "@/lib/rcap/grade-a/composer";
import type { PacketSpecification } from "@/lib/rcap/grade-a/packet-specification";
import {
  IL_PROSTITUTION_J_VACATE_COMPONENTS,
  IL_PROSTITUTION_J_VACATE_FAMILY_ID,
  composedCourtDocumentBlocks
} from "../../../../../scripts/lib/il-prostitution-j-vacate-composition.mjs";

/**
 * The participant-rendering entry point for the Illinois Class 4 felony
 * prostitution vacate-and-expunge family.
 *
 * WHY THIS EXISTS
 *
 * The registered Illinois specification declares both of its documents as
 * pleadings but describes their sections generically (caption / static /
 * signature_block), so the generic composer emits generic guidance blocks and
 * the Grade-A renderer correctly refuses them: a pleading without a pleading
 * caption is not a pleading, and renderer.ts says so. The approved documents
 * themselves were never composed through the generic composer at all — the
 * family builder composed their text directly and rendered the committed
 * fixtures from it.
 *
 * So the missing piece was never a caption block on a generic composition. It
 * was a way to compose THIS family's approved documents for one participant.
 * That is what this function does, from the same sentences the committed
 * fixtures are built from
 * (scripts/lib/il-prostitution-j-vacate-composition.mjs), returned as
 * court-document blocks the shared renderer draws unchanged.
 *
 * WHAT IT REFUSES
 *
 * Every fact the specification requires must be present, the specification must
 * be this family's, the matter must be this route's, and the document set must
 * be the approved two components in the approved order. A packet is not
 * composed with gaps, and it is not composed from another route's
 * specification.
 *
 * WHAT IT IS NOT
 *
 * Not an approval, not a fulfillment record, and not a route. Composing a
 * participant's copy of these documents says nothing about whether Illinois may
 * sell or deliver them; the committed authority decides that and still refuses.
 */

export const IL_PROSTITUTION_J_VACATE_ROUTE_KEY = "IL:felony-prostitution-relief";

const PARTICIPANT_FACTS = {
  fullLegalName: "participant_full_legal_name",
  mailingAddress: "mailing_address",
  phone: "phone_number",
  email: "email_address"
} as const;

function refuse(routeKey: string, missing: string[], detail: string): never {
  throw new GradeAPacketCompositionError(routeKey, missing, detail);
}

/** The two approved components, named so the composed blocks are type-checked. */
const APPROVED_COMPONENT_IDS = ["primary_filing", "proposed_order"] as const;
type ApprovedComponentId = (typeof APPROVED_COMPONENT_IDS)[number];

function approvedComponentId(routeKey: string, documentId: string): ApprovedComponentId {
  const found = APPROVED_COMPONENT_IDS.find((component) => component === documentId);
  if (!found) {
    refuse(routeKey, [], `document ${documentId} is not one of this family's approved components.`);
  }
  return found;
}

function trimmedFact(matter: GradeAMatter, factId: string): string {
  const value = matter.facts[factId];
  return typeof value === "string" ? value.trim() : "";
}

/**
 * Compose one participant's copy of the approved Illinois vacate-and-expunge
 * documents. Signature-compatible with composeGradeAPacket, so a caller swaps
 * the function and nothing else.
 */
export function composeIlProstitutionJVacateParticipantPacket(
  specification: PacketSpecification,
  matter: GradeAMatter
): GradeAPacket {
  if (specification.packetFamily !== IL_PROSTITUTION_J_VACATE_FAMILY_ID) {
    refuse(matter.routeKey, [],
      `this composer serves ${IL_PROSTITUTION_J_VACATE_FAMILY_ID} and the specification is for `
      + `${specification.packetFamily}. A packet is never composed from another family's specification.`);
  }
  if (matter.routeKey !== specification.routeKey) {
    refuse(matter.routeKey, [],
      `the matter is for ${matter.routeKey} and this specification is for ${specification.routeKey}. `
      + "A packet is never composed from another route's specification.");
  }
  if (!matter.verificationHash?.trim()) {
    refuse(matter.routeKey, [],
      "no final-verification hash is bound to this matter. An unbound packet cannot be traced to the facts it "
      + "was built from.");
  }

  const missing = [...new Set(specification.requiredFacts.map((required) => required.factId))]
    .filter((factId) => trimmedFact(matter, factId) === "")
    .sort();
  if (missing.length > 0) {
    refuse(matter.routeKey, missing,
      `${missing.length} required fact(s) are missing or blank: ${missing.join(", ")}. `
      + "The packet is not composed at all rather than composed with gaps.");
  }

  const included = specification.documents
    .filter((document) => document.requirement === "required"
      || document.includeWhen === "always_unless_participant_declines")
    .sort((left, right) => left.order - right.order);
  const approved: string[] = [...IL_PROSTITUTION_J_VACATE_COMPONENTS];
  if (approved.length !== APPROVED_COMPONENT_IDS.length
    || approved.some((id, index) => id !== APPROVED_COMPONENT_IDS[index])) {
    refuse(matter.routeKey, [],
      "the approved component list in the family composition module no longer matches this composer.");
  }
  const componentIds = included.map((document) => document.documentId);
  if (componentIds.length !== approved.length
    || componentIds.some((id, index) => id !== approved[index])) {
    refuse(matter.routeKey, [],
      `the specification's document set is ${componentIds.join(", ") || "empty"} and the approved family is `
      + `${approved.join(", ")}. Refusing rather than composing a different packet.`);
  }
  for (const document of included) {
    if (document.presentation !== "pleading" || document.outputStrategy !== "custom_pleading") {
      refuse(matter.routeKey, [],
        `document ${document.documentId} is declared ${document.presentation ?? "guidance"}/`
        + `${document.outputStrategy}, and this family's approved documents are pleading/custom_pleading.`);
    }
  }

  const participant = {
    fullLegalName: trimmedFact(matter, PARTICIPANT_FACTS.fullLegalName),
    mailingAddress: trimmedFact(matter, PARTICIPANT_FACTS.mailingAddress),
    phone: trimmedFact(matter, PARTICIPANT_FACTS.phone),
    email: trimmedFact(matter, PARTICIPANT_FACTS.email)
  };

  const documents: GradeADocument[] = included.map((document) => ({
    documentId: document.documentId,
    role: document.role,
    title: document.title,
    order: document.order,
    outputStrategy: document.outputStrategy,
    presentation: "pleading",
    blocks: composedCourtDocumentBlocks(
      approvedComponentId(matter.routeKey, document.documentId), participant) as GradeABlock[]
  }));

  for (const document of documents) {
    if (!document.blocks.some((block) => block.kind === "pleading_caption")) {
      refuse(matter.routeKey, [],
        `composed document ${document.documentId} carries no pleading caption. Refusing rather than handing the `
        + "renderer a pleading that is not one.");
    }
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
