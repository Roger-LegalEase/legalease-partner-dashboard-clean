import { GradeAPacketCompositionError, planIncludedDocuments, type GradeABlock, type GradeAMatter, type GradeAPacket } from "@/lib/rcap/grade-a/composer";
import { documentContractFor, isCourtFacing } from "@/lib/rcap/grade-a/document-contract";
import type { PacketSpecification } from "@/lib/rcap/grade-a/packet-specification";
import { contactRepresentationHash } from "@/lib/expungement-ai/contact-representation";
import { ND_FIRST_OFFENSE_FAMILY, ndFirstOffenseContactText } from "@/lib/expungement-ai/nd-first-offense-family-inputs";
import { ND_FIRST_OFFENSE_COMPONENTS, ND_FIRST_OFFENSE_COMPONENT_IDS, ndFirstOffenseBody } from "../../../../../scripts/lib/nd-first-offense-possession-composition.mjs";

import { courtFacingRows } from "../../../../../scripts/rcap-custom-pleading/court-facing-rows.mjs";

const ROUTE = "ND:first-offense-possession-sealing";
const PARTICIPANT = {
  participant_full_legal_name: "participant.full_legal_name",
  date_of_birth: "participant.date_of_birth",
  mailing_address: "participant.street_address",
  phone_number: "participant.phone",
  email_address: "participant.email"
} as const;

function refuse(missing: string[], reason: string): never {
  throw new GradeAPacketCompositionError(ROUTE, missing, reason);
}

function dateOfBirth(value: unknown): string | null {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const date = new Date(`${value}T00:00:00Z`);
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value
    && date.getTime() <= Date.now() ? value : null;
}

/**
 * The retained four-component family, connected to the existing participant
 * composer. This supplies no eligibility, verification or delivery authority.
 * Internal review may show missing identity as blanks; ordinary composition
 * refuses it. Contacts are optional, and record facts/signatures stay exactly
 * the source's handbacks even when similarly named screening answers exist.
 */
function composeNdFirstOffenseComponents(specification: PacketSpecification, matter: GradeAMatter) {
  if (matter.routeKey !== ROUTE || matter.jurisdiction !== "ND"
    || matter.pathwayId !== ND_FIRST_OFFENSE_FAMILY.route
    || specification.routeKey !== ROUTE || specification.packetFamily !== ND_FIRST_OFFENSE_FAMILY.familyId
    || contactRepresentationHash(specification) !== ND_FIRST_OFFENSE_FAMILY.successorSpecificationCanonicalSha256) {
    refuse([], "The exact ND route and adopted four-component specification are required; unmatched source contracts refuse.");
  }
  if (!matter.verificationHash?.trim()) refuse([], "No protected record hash is bound to this composition.");
  const internal = matter.generationPurpose === "internal_review";
  if (!internal && (!matter.verifiedAt || !Number.isFinite(Date.parse(matter.verifiedAt)))) {
    refuse([], "Participant composition requires an actual verified-at binding; internal review supplies no verification authority.");
  }
  const facts: Record<string, string> = {};
  const missing: string[] = [];
  for (const [id, destination] of Object.entries(PARTICIPANT)) {
    const raw = matter.facts[id];
    const value = id === "date_of_birth" ? dateOfBirth(raw) : ndFirstOffenseContactText(raw);
    if (value === null && ["participant_full_legal_name", "date_of_birth"].includes(id)) missing.push(id);
    facts[destination] = value ?? "";
  }
  if (missing.length && !internal) refuse(missing, "Missing exact participant identity; never substitute the canonical fixture person or infer a date.");

  const plan = planIncludedDocuments(specification, matter.facts);
  if (plan.unevaluable.length || plan.included.length !== ND_FIRST_OFFENSE_COMPONENT_IDS.length
    || plan.included.some((document, index) => document.manifestComponentId !== ND_FIRST_OFFENSE_COMPONENT_IDS[index])) {
    refuse([], "The planned component set differs from the retained ND four-component contract.");
  }
  const componentBodies: Array<{ componentId: string; title: string; body: string }> = [];
  const documents = plan.included.map(document => {
    const component = ND_FIRST_OFFENSE_COMPONENTS.find(item => item.id === document.manifestComponentId)!;
    const contract = documentContractFor(document);
    const court = isCourtFacing(contract);
    const bodyText = ndFirstOffenseBody(component.id, facts);
    componentBodies.push({ componentId: component.id, title: component.title, body: bodyText });
    // Apply the existing family renderer's exact metadata-ink rule. Source
    // bodies stay immutable; the route identifier remains in evidence only.
    const lines = bodyText.split("\n").flatMap(courtFacingRows((line: string) => [line]));
    let blocks: GradeABlock[];
    if (court) {
      // The source's caption occupies body lines 0–10. Its exact labels and
      // role are reused; county, judicial district and service prose supply none
      // of these blanks. The shorter case-number rule fits beside its full label.
      const body = lines.slice(2);
      blocks = [
        { kind: "pleading_paragraph", text: lines[0] },
        { kind: "pleading_caption", court: body[0],
          courtLines: [{ prefix: "IN THE", blank: true, suffix: "COURT" }],
          courtInstruction: body[1].slice(1, -1),
          matterTitle: `${body[3]} ${body[4]}`, captionOrder: "matter_title_first",
          caseNumberLabel: body[6], caseNumber: ".".repeat(26),
          plaintiff: "", defendant: facts["participant.full_legal_name"],
          defendantRole: "PETITIONER.", title: body[9], continuationTitle: document.title },
        ...body.slice(11).map(text => ({ kind: "pleading_paragraph" as const, text }))
      ];
    } else {
      blocks = lines.map(text => ({ kind: "paragraph" as const, text }));
    }
    return { documentId: document.documentId, role: document.role, title: document.title,
      order: document.order, outputStrategy: document.outputStrategy,
      presentation: document.presentation ?? (court ? "pleading" as const : "guidance" as const),
      captionTreatment: contract.captionTreatment, courtFacing: court,
      supersededByGuide: document.supersededBy === "supplemental_guide", blocks };
  });
  const packet: GradeAPacket = { routeKey: ROUTE, specificationId: specification.specificationId,
    specificationVersion: specification.specificationVersion, packetFamily: specification.packetFamily,
    packetFamilyLabel: specification.packetFamilyLabel, verificationHash: matter.verificationHash,
    verifiedAt: matter.verifiedAt, documents };
  return { packet, componentBodies, missingIdentityIds: missing };
}

export function composeNdFirstOffenseParticipantPacket(specification: PacketSpecification, matter: GradeAMatter): GradeAPacket {
  return composeNdFirstOffenseComponents(specification, matter).packet;
}

/**
 * Same-pass source bodies for the existing family's internal render utility.
 * This avoids the generic delivery renderer's final-verification appendix for
 * a held record. The caller must bind the actual protected record independently;
 * this pure composition interface authenticates nobody and approves nothing.
 */
export function composeNdFirstOffenseInternalReview(specification: PacketSpecification, matter: GradeAMatter) {
  if (matter.generationPurpose !== "internal_review") refuse([], "Internal held review must be explicitly requested.");
  return { ...composeNdFirstOffenseComponents(specification, matter),
    sourceContractSha256: ND_FIRST_OFFENSE_FAMILY.successorSpecificationCanonicalSha256,
    protectedRecordHash: matter.verificationHash, internalReviewOnly: true as const,
    finalVerificationAsserted: false as const, generationAllowed: false as const,
    deliveryAllowed: false as const, commercialAuthorityGranted: false as const };
}
