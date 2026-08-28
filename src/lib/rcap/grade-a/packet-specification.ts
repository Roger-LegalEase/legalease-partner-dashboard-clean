import specification from "@/../data/record-clearing/packet-specifications/ND-first-offense-possession-sealing.v1.json";

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
};

export type PacketSpecificationSection = {
  heading: string;
  kind: string;
  body?: string;
  fields?: string[];
  assertions?: Array<{ id: string; text: string; facts: string[] }>;
  notarisationRequired?: boolean;
};

export type PacketSpecificationDocument = {
  documentId: string;
  role: string;
  title: string;
  order: number;
  outputStrategy: "custom_pleading" | "process_guidance";
  requirement: "required" | "conditional";
  conditionDescription?: string;
  includeWhen?: string;
  manifestComponentId?: string;
  sections: PacketSpecificationSection[];
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

const SPECIFICATIONS: ReadonlyMap<string, PacketSpecification> = new Map([
  [(specification as PacketSpecification).routeKey, specification as PacketSpecification]
]);

export function packetSpecificationFor(routeKey: string): PacketSpecification | undefined {
  return SPECIFICATIONS.get(routeKey);
}

export function packetSpecificationRouteKeys(): string[] {
  return [...SPECIFICATIONS.keys()].sort();
}
