import specification from "@/../data/record-clearing/packet-specifications/ND-first-offense-possession-sealing.v1.json";
import oregonSetAside from "@/../data/record-clearing/packet-specifications/OR-set-aside-without-conviction.v1.json";
import kansasMunicipalConvictionOrDiversion from "@/../data/record-clearing/packet-specifications/KS-municipal-conviction-or-diversion-expungement-under-12-4516.v1.json";
import kansasMunicipalArrestRecord from "@/../data/record-clearing/packet-specifications/KS-municipal-arrest-record-expungement-under-12-4516a.v1.json";
import mississippiNonConviction from "@/../data/record-clearing/packet-specifications/MS-nonconviction-expungement-99-19-71-4.v1.json";
import virginiaAbsolutePardon from "@/../data/record-clearing/packet-specifications/VA-absolute-pardon-expungement.v1.json";
import nevadaProbationSpecialtyCourt from "@/../data/record-clearing/packet-specifications/NV-probation-specialty-court-dismissal-set-aside-sealing.v1.json";
import illinoisFelonyProstitutionRelief from "@/../data/record-clearing/packet-specifications/IL-felony-prostitution-relief.v1.json";

/**
 * A packet specification is the exact statement of what one packet family
 * contains, versioned and hashed.
 *
 * The point of hashing it is not integrity in the security sense. It is that a
 * fulfillment record grants commercial authority to a route, and the thing the
 * record is vouching for has to be pinned to something. Without a hash, "this
 * route delivers a complete packet" is a claim about whatever the composer
 * happens to produce today. With one, the claim is about an exact document set,
 * and changing that set is visible as a changed hash rather than as nothing.
 *
 * Everything a document says about the law comes from here. The composer's job
 * is to place facts into the structure this file describes; it has no legal
 * statements of its own and must never acquire any, because a statement that
 * lives in the composer is a statement no legal review can see.
 */

export type PacketSpecificationFact = {
  factId: string;
  use: string;
  inRegistryRequiredInputs: boolean;
  gapNote?: string;
  ownership?: "participant" | "server";
  prompt?: string;
  helperText?: string;
  questionType?: string;
  options?: string[];
};

export type PacketSpecificationSection = {
  heading: string;
  kind: string;
  body?: string;
  jurat?: string;
  fields?: string[];
  fieldLabels?: Record<string, string>;
  fieldValueTemplates?: Record<string, string>;
  assertions?: Array<{ id: string; text: string; facts: string[] }>;
  notarisationRequired?: boolean;
};

export type PacketSpecificationDocument = {
  documentId: string;
  role: string;
  title: string;
  order: number;
  outputStrategy: "custom_pleading" | "process_guidance";
  presentation?: "guidance" | "pleading";
  requirement: "required" | "conditional";
  conditionDescription?: string;
  includeWhen?: string;
  manifestComponentId?: string;
  /** One rendered document may intentionally cover multiple manifest components. */
  manifestComponentIds?: string[];
  sections: PacketSpecificationSection[];
};

/**
 * A legal section a packet may print as fact. It is either bound -- decided by a
 * legal-design owner and carrying the statement -- or unbound, carrying the
 * decision that would bind it and no statement at all.
 *
 * The distinction exists because a specification is the ONLY place a document's
 * legal statements may live, so that legal review can see them. A specification
 * derived from an approved packet set can be perfectly real about its documents,
 * components, sources and field maps while still having no approved answer for
 * which court a motion is filed in. Writing a plausible answer into the gap
 * would put an unreviewed statement into a participant's packet wearing the
 * authority of a versioned record; leaving the section out entirely would let
 * the packet compose without it. So the gap is declared instead, and
 * `legalSectionsBound` is what the composer and the authority read.
 */
export type UnboundLegalSection = {
  bound: false;
  boundBy: null;
  decisionRequired: string;
};

export type PacketSpecification = {
  schemaVersion: number;
  specificationId: string;
  specificationVersion: string;
  routeKey: string;
  jurisdiction: string;
  pathwayId: string;
  pathwayLabel: string;
  packetFamily: string;
  packetFamilyLabel: string;
  trackId: string;
  packetSetId: string;
  packetSetVersion: string;
  profileId: string;
  profileVersion: string;
  specificationNote: string;
  statutoryAuthority: {
    primary: string;
    sourceUrl: string;
    ruleStatement: string;
    reliefIsMandatoryOnMotion: boolean;
    doNotImport: string[];
  };
  sourceIdentities: Array<{
    sourceId: string;
    kind: string;
    verification: "present_in_repository" | "asserted_by_ingestion";
    location?: string;
    note?: string;
  }>;
  requiredFacts: PacketSpecificationFact[];
  finalVerificationRequirements: string[];
  legalSectionsBound?: true;
  fieldOwnership?: {
    participantOwnedFacts: string[];
    serverOwnedRouteFacts: string[];
    participantAtSigningFields: string[];
    participantAtServiceFields: string[];
    notaryOwnedFields?: string[];
    prosecutorOwnedFields: string[];
    courtOwnedFields: string[];
  };
  documents: PacketSpecificationDocument[];
  filingDestination: { statement: string; office: string; newCaseOrExisting: string; sourceOfRule: string };
  feeAndWaiver: {
    feeIdentified: boolean;
    statement: string;
    waiverApplicable: boolean;
    waiverStatement: string;
    sourceOfRule: string;
  };
  serviceAndNotice: {
    serviceRequired: boolean;
    statement: string;
    certificateOfServiceIncluded: boolean;
    whyNoCertificate?: string;
    sourceOfRule: string;
  };
  copyRequirements: { statement: string; originalPlusCopies: string; sourceOfRule: string };
  postFilingTimeline: Array<{ step: string; timing: string }>;
  hearingAndObjectionStops: Array<{ situation: string; whatItMeans: string; stopAndGetHelp: boolean }>;
  attachments: Array<{
    attachmentId: string;
    title: string;
    requirement: "required" | "conditional";
    conditionDescription?: string;
    obtainedFrom: string;
    whyNeeded: string;
    requiredBeforeFiling: boolean;
  }>;
  participantChecklist: Array<{
    id: string;
    text: string;
    requiredBeforeFiling: boolean;
    requirement?: string;
    kind?: string;
  }>;
};

/**
 * A specification whose legal sections are not yet decided. It is registered --
 * so the family binding is a real, independently resolvable fact rather than a
 * null agreeing with a null -- and it can never compose a packet or prove a
 * route while `legalSectionsBound` is false.
 */
export type DerivedPacketSpecification = {
  schemaVersion: number;
  specificationId: string;
  specificationVersion: string;
  routeKey: string;
  jurisdiction: string;
  pathwayId: string;
  pathwayLabel: string;
  packetFamily: string;
  packetFamilyLabel: string;
  trackId: string;
  packetSetId: string;
  packetSetVersion: string;
  specificationSha256: string;
  legalSectionsBound: boolean;
  unboundLegalSections: string[];
  legalSections: Record<string, UnboundLegalSection | { bound: true }>;
  sourceIdentities: Array<{ sourceId: string; sha256: string; fieldMap: { overlayProfileSha256: string } }>;
  documents: Array<{ documentId: string; role: string; order: number }>;
};

export type RegisteredSpecification = PacketSpecification | DerivedPacketSpecification;

const SPECIFICATIONS: ReadonlyMap<string, RegisteredSpecification> = new Map<string, RegisteredSpecification>([
  [(specification as PacketSpecification).routeKey, specification as PacketSpecification],
  [(oregonSetAside as unknown as DerivedPacketSpecification).routeKey, oregonSetAside as unknown as DerivedPacketSpecification],
  // The two Kansas municipal routes. Registered so `resolvePacketFamilyId` has an
  // independent server-side statement of the family each route delivers, and
  // unbound so neither can compose a packet or prove a route: Kansas municipal
  // filing practice is court by court, and the approved memorandum yields to a
  // municipal court's own published instrument wherever one exists.
  [(kansasMunicipalConvictionOrDiversion as unknown as DerivedPacketSpecification).routeKey, kansasMunicipalConvictionOrDiversion as unknown as DerivedPacketSpecification],
  [(kansasMunicipalArrestRecord as unknown as DerivedPacketSpecification).routeKey, kansasMunicipalArrestRecord as unknown as DerivedPacketSpecification],
  [(mississippiNonConviction as unknown as PacketSpecification).routeKey, mississippiNonConviction as unknown as PacketSpecification],
  [(virginiaAbsolutePardon as unknown as PacketSpecification).routeKey, virginiaAbsolutePardon as unknown as PacketSpecification],
  [(nevadaProbationSpecialtyCourt as unknown as PacketSpecification).routeKey, nevadaProbationSpecialtyCourt as unknown as PacketSpecification],
  [(illinoisFelonyProstitutionRelief as unknown as PacketSpecification).routeKey, illinoisFelonyProstitutionRelief as unknown as PacketSpecification]
]);

/**
 * True when every legal section a document may print is decided. A
 * specification that does not say is treated as bound only if it predates the
 * field, which is why the check is for an explicit `false` rather than a
 * falsy value.
 */
export function specificationLegalSectionsBound(spec: RegisteredSpecification): boolean {
  return (spec as DerivedPacketSpecification).legalSectionsBound !== false;
}

/**
 * The canonical content digest a fulfillment record pins. A specification that
 * carries one uses it; one that does not is not yet hashed over its content and
 * says so with the empty string rather than with a hash of something narrower.
 */
export function specificationContentSha256(spec: RegisteredSpecification): string {
  return (spec as DerivedPacketSpecification).specificationSha256 ?? "";
}

export function packetSpecificationFor(routeKey: string): RegisteredSpecification | undefined {
  return SPECIFICATIONS.get(routeKey);
}

/**
 * The composable subset. A specification with unbound legal sections resolves
 * for identity -- family, version, content hash -- and is deliberately not
 * returned here, so no caller can compose from it by forgetting to check.
 */
export function composablePacketSpecificationFor(routeKey: string): PacketSpecification | undefined {
  const spec = SPECIFICATIONS.get(routeKey);
  if (!spec || !specificationLegalSectionsBound(spec)) return undefined;
  return spec as PacketSpecification;
}

/** Packet-completion facts supplied by the exact registered document set. */
export function packetSpecificationRequiredFactIdsFor(routeKey: string): string[] {
  return composablePacketSpecificationFor(routeKey)?.requiredFacts.map((fact) => fact.factId) ?? [];
}

/** Presentation metadata for one exact packet fact, when the specification owns it. */
export function packetSpecificationFactFor(
  routeKey: string,
  factId: string
): PacketSpecificationFact | undefined {
  return composablePacketSpecificationFor(routeKey)?.requiredFacts.find((fact) => fact.factId === factId);
}

export function packetSpecificationRouteKeys(): string[] {
  return [...SPECIFICATIONS.keys()].sort();
}
