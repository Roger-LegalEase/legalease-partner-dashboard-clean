// Arkansas ACIC official-PDF family boundary.
//
// The two tracked Arkansas acquisition/reconciliation records are identity
// evidence only. This module intentionally has no filesystem, network,
// acquisition, projection, PDF, or packet-registry integration. Every public
// operation fails closed until a successor authority edition adopts exact
// descriptors and a captain supplies a portable projection.

export const ARKANSAS_OFFICIAL_PDF_FAMILY_ID =
  "rcap-ar-official-pdf-family" as const;

export const ARKANSAS_OFFICIAL_PDF_TRACK_IDS = [
  "ar-act346",
  "ar-act531",
  "ar-arrest-seal",
  "ar-cs-possession-seal",
  "ar-drug-court",
  "ar-felony-seal",
  "ar-misdemeanor-dwi-seal",
  "ar-misdemeanor-seal",
  "ar-nonconviction-seal",
  "ar-pardon-seal",
  "ar-veterans-court",
] as const;

export type ArkansasOfficialPdfTrackId =
  (typeof ARKANSAS_OFFICIAL_PDF_TRACK_IDS)[number];

export const ARKANSAS_OFFICIAL_PDF_FORM_IDS = [
  "ACIC-ORDER-DISMISS-AND-SEAL-FIRST-OFFENDERS",
  "ACIC-ORDER-DRUG-COURT",
  "ACIC-ORDER-SEAL-ACT-531-ACT-1460",
  "ACIC-ORDER-TO-SEAL-ARREST",
  "ACIC-ORDER-TO-SEAL-CS-POSSESSION",
  "ACIC-ORDER-TO-SEAL-MISDEMEANOR-DWI-BWI",
  "ACIC-ORDER-TO-SEAL-NONCONVICTION",
  "ACIC-ORDER-TO-SEAL-PARDONED-OFFENDER",
  "ACIC-ORDER-VETERANS-COURT",
  "ACIC-PETITION-DISMISS-AND-SEAL-FIRST-OFFENDERS",
  "ACIC-PETITION-DRUG-COURT",
  "ACIC-PETITION-SEAL-ACT-531-ACT-1460",
  "ACIC-PETITION-TO-SEAL-ARREST",
  "ACIC-PETITION-TO-SEAL-CS-POSSESSION",
  "ACIC-PETITION-TO-SEAL-MISDEMEANOR-DWI-BWI",
  "ACIC-PETITION-TO-SEAL-NONCONVICTION",
  "ACIC-PETITION-TO-SEAL-PARDONED-OFFENDER",
  "ACIC-PETITION-VETERANS-COURT",
  "ACIC-UNIFORM-ORDER-TO-SEAL",
  "ACIC-UNIFORM-PETITION-TO-SEAL",
] as const;

export type ArkansasOfficialPdfFormId =
  (typeof ARKANSAS_OFFICIAL_PDF_FORM_IDS)[number];

export type ArkansasOfficialPdfDocumentRole =
  "primary_filing" | "proposed_order";

export type ArkansasOfficialPdfEvidenceIssue =
  | "mixed_footer_revision_unresolved"
  | "composite_variant_binding_required"
  | null;

export type ArkansasOfficialPdfSourceBoundary = {
  officialFormId: ArkansasOfficialPdfFormId;
  documentRole: ArkansasOfficialPdfDocumentRole;
  authorityState: "authority_unmanifested_source";
  exactAuthorityDescriptor: null;
  revision: null;
  expectedSha256: null;
  expectedBytes: null;
  assignmentAnchor: null;
  portableProjection: null;
  candidateEvidenceCount: 1 | 2;
  evidenceIssue: ArkansasOfficialPdfEvidenceIssue;
  authoritySelectable: false;
  materializationAuthorized: false;
  rendererEnabled: false;
};

const ORDER_FORM_IDS = new Set<ArkansasOfficialPdfFormId>([
  "ACIC-ORDER-DISMISS-AND-SEAL-FIRST-OFFENDERS",
  "ACIC-ORDER-DRUG-COURT",
  "ACIC-ORDER-SEAL-ACT-531-ACT-1460",
  "ACIC-ORDER-TO-SEAL-ARREST",
  "ACIC-ORDER-TO-SEAL-CS-POSSESSION",
  "ACIC-ORDER-TO-SEAL-MISDEMEANOR-DWI-BWI",
  "ACIC-ORDER-TO-SEAL-NONCONVICTION",
  "ACIC-ORDER-TO-SEAL-PARDONED-OFFENDER",
  "ACIC-ORDER-VETERANS-COURT",
  "ACIC-UNIFORM-ORDER-TO-SEAL",
]);

const COMPOSITE_FORM_IDS = new Set<ArkansasOfficialPdfFormId>([
  "ACIC-UNIFORM-ORDER-TO-SEAL",
  "ACIC-UNIFORM-PETITION-TO-SEAL",
]);

export const ARKANSAS_OFFICIAL_PDF_SOURCE_BOUNDARIES: readonly ArkansasOfficialPdfSourceBoundary[] =
  Object.freeze(
    ARKANSAS_OFFICIAL_PDF_FORM_IDS.map((officialFormId) =>
      Object.freeze({
        officialFormId,
        documentRole: ORDER_FORM_IDS.has(officialFormId)
          ? "proposed_order"
          : "primary_filing",
        authorityState: "authority_unmanifested_source",
        exactAuthorityDescriptor: null,
        revision: null,
        expectedSha256: null,
        expectedBytes: null,
        assignmentAnchor: null,
        portableProjection: null,
        candidateEvidenceCount: COMPOSITE_FORM_IDS.has(officialFormId) ? 2 : 1,
        evidenceIssue:
          officialFormId === "ACIC-PETITION-DISMISS-AND-SEAL-FIRST-OFFENDERS"
            ? "mixed_footer_revision_unresolved"
            : COMPOSITE_FORM_IDS.has(officialFormId)
              ? "composite_variant_binding_required"
              : null,
        authoritySelectable: false,
        materializationAuthorized: false,
        rendererEnabled: false,
      }),
    ),
  );

export type ArkansasOfficialPdfRouteBoundary = {
  trackId: ArkansasOfficialPdfTrackId;
  officialFormIds: readonly ArkansasOfficialPdfFormId[];
  blockingReasonCodes: readonly ArkansasOfficialPdfBlockingReasonCode[];
  packetReady: false;
  rendererEnabled: false;
};

export type ArkansasOfficialPdfBlockingReasonCode =
  | "legal_design_waiting_period_blocker"
  | "legal_design_venue_blocker"
  | "authority_mixed_footer_revision_unresolved"
  | "authority_composite_identity_unresolved"
  | "authority_unmanifested_source"
  | "candidate_evidence_not_authority"
  | "captain_assignment_required"
  | "portable_projection_required"
  | "field_mapping_pending"
  | "generation_disabled";

const COMMON_ROUTE_BLOCKERS = [
  "authority_unmanifested_source",
  "captain_assignment_required",
  "portable_projection_required",
  "field_mapping_pending",
  "generation_disabled",
] as const;

export const ARKANSAS_OFFICIAL_PDF_ROUTE_BOUNDARIES: readonly ArkansasOfficialPdfRouteBoundary[] =
  Object.freeze([
    {
      trackId: "ar-act346",
      officialFormIds: [
        "ACIC-PETITION-DISMISS-AND-SEAL-FIRST-OFFENDERS",
        "ACIC-ORDER-DISMISS-AND-SEAL-FIRST-OFFENDERS",
      ],
      blockingReasonCodes: [
        "authority_mixed_footer_revision_unresolved",
        ...COMMON_ROUTE_BLOCKERS,
      ],
      packetReady: false,
      rendererEnabled: false,
    },
    {
      trackId: "ar-act531",
      officialFormIds: [
        "ACIC-PETITION-SEAL-ACT-531-ACT-1460",
        "ACIC-ORDER-SEAL-ACT-531-ACT-1460",
      ],
      blockingReasonCodes: COMMON_ROUTE_BLOCKERS,
      packetReady: false,
      rendererEnabled: false,
    },
    {
      trackId: "ar-arrest-seal",
      officialFormIds: [
        "ACIC-PETITION-TO-SEAL-ARREST",
        "ACIC-ORDER-TO-SEAL-ARREST",
      ],
      blockingReasonCodes: COMMON_ROUTE_BLOCKERS,
      packetReady: false,
      rendererEnabled: false,
    },
    {
      trackId: "ar-cs-possession-seal",
      officialFormIds: [
        "ACIC-PETITION-TO-SEAL-CS-POSSESSION",
        "ACIC-ORDER-TO-SEAL-CS-POSSESSION",
      ],
      blockingReasonCodes: COMMON_ROUTE_BLOCKERS,
      packetReady: false,
      rendererEnabled: false,
    },
    {
      trackId: "ar-drug-court",
      officialFormIds: ["ACIC-PETITION-DRUG-COURT", "ACIC-ORDER-DRUG-COURT"],
      blockingReasonCodes: COMMON_ROUTE_BLOCKERS,
      packetReady: false,
      rendererEnabled: false,
    },
    {
      trackId: "ar-felony-seal",
      officialFormIds: [
        "ACIC-UNIFORM-PETITION-TO-SEAL",
        "ACIC-UNIFORM-ORDER-TO-SEAL",
      ],
      blockingReasonCodes: [
        "authority_composite_identity_unresolved",
        ...COMMON_ROUTE_BLOCKERS,
      ],
      packetReady: false,
      rendererEnabled: false,
    },
    {
      trackId: "ar-misdemeanor-dwi-seal",
      officialFormIds: [
        "ACIC-PETITION-TO-SEAL-MISDEMEANOR-DWI-BWI",
        "ACIC-ORDER-TO-SEAL-MISDEMEANOR-DWI-BWI",
      ],
      blockingReasonCodes: [
        "legal_design_waiting_period_blocker",
        ...COMMON_ROUTE_BLOCKERS,
      ],
      packetReady: false,
      rendererEnabled: false,
    },
    {
      trackId: "ar-misdemeanor-seal",
      officialFormIds: [
        "ACIC-UNIFORM-PETITION-TO-SEAL",
        "ACIC-UNIFORM-ORDER-TO-SEAL",
      ],
      blockingReasonCodes: [
        "authority_composite_identity_unresolved",
        ...COMMON_ROUTE_BLOCKERS,
      ],
      packetReady: false,
      rendererEnabled: false,
    },
    {
      trackId: "ar-nonconviction-seal",
      officialFormIds: [
        "ACIC-PETITION-TO-SEAL-NONCONVICTION",
        "ACIC-ORDER-TO-SEAL-NONCONVICTION",
      ],
      blockingReasonCodes: [
        "legal_design_venue_blocker",
        ...COMMON_ROUTE_BLOCKERS,
      ],
      packetReady: false,
      rendererEnabled: false,
    },
    {
      trackId: "ar-pardon-seal",
      officialFormIds: [
        "ACIC-PETITION-TO-SEAL-PARDONED-OFFENDER",
        "ACIC-ORDER-TO-SEAL-PARDONED-OFFENDER",
      ],
      blockingReasonCodes: COMMON_ROUTE_BLOCKERS,
      packetReady: false,
      rendererEnabled: false,
    },
    {
      trackId: "ar-veterans-court",
      officialFormIds: [
        "ACIC-PETITION-VETERANS-COURT",
        "ACIC-ORDER-VETERANS-COURT",
      ],
      blockingReasonCodes: COMMON_ROUTE_BLOCKERS,
      packetReady: false,
      rendererEnabled: false,
    },
  ]);

export const ARKANSAS_OFFICIAL_PDF_ACTIVE_FIELD_MAPPINGS: Readonly<
  Record<ArkansasOfficialPdfFormId, readonly never[]>
> = Object.freeze(
  Object.fromEntries(
    ARKANSAS_OFFICIAL_PDF_FORM_IDS.map((officialFormId) => [
      officialFormId,
      Object.freeze([]),
    ]),
  ) as Record<ArkansasOfficialPdfFormId, readonly never[]>,
);

export const ARKANSAS_OFFICIAL_PDF_ACTIVE_OVERLAY_PLACEMENTS: Readonly<
  Record<ArkansasOfficialPdfFormId, readonly never[]>
> = Object.freeze(
  Object.fromEntries(
    ARKANSAS_OFFICIAL_PDF_FORM_IDS.map((officialFormId) => [
      officialFormId,
      Object.freeze([]),
    ]),
  ) as Record<ArkansasOfficialPdfFormId, readonly never[]>,
);

export const ARKANSAS_OFFICIAL_PDF_ACTIVE_RENDERERS: readonly never[] =
  Object.freeze([]);

export const ARKANSAS_OFFICIAL_PDF_SOURCE_BACKED_SAMPLES: readonly never[] =
  Object.freeze([]);

export type ArkansasOfficialPdfErrorCode =
  | "unsupported_track"
  | "unsupported_document"
  | ArkansasOfficialPdfBlockingReasonCode;

export class ArkansasOfficialPdfFamilyBlockedError extends Error {
  constructor(
    readonly code: ArkansasOfficialPdfErrorCode,
    message: string,
    readonly details: Readonly<Record<string, unknown>> = {},
  ) {
    super(message);
    this.name = "ArkansasOfficialPdfFamilyBlockedError";
  }
}

function sourceBoundary(
  officialFormId: string,
): ArkansasOfficialPdfSourceBoundary {
  const boundary = ARKANSAS_OFFICIAL_PDF_SOURCE_BOUNDARIES.find(
    (candidate) => candidate.officialFormId === officialFormId,
  );

  if (!boundary) {
    throw new ArkansasOfficialPdfFamilyBlockedError(
      "unsupported_document",
      `Arkansas official-PDF family does not declare "${officialFormId}".`,
      { officialFormId },
    );
  }

  return boundary;
}

function routeBoundary(trackId: string): ArkansasOfficialPdfRouteBoundary {
  const boundary = ARKANSAS_OFFICIAL_PDF_ROUTE_BOUNDARIES.find(
    (candidate) => candidate.trackId === trackId,
  );

  if (!boundary) {
    throw new ArkansasOfficialPdfFamilyBlockedError(
      "unsupported_track",
      `Arkansas official-PDF family does not declare track "${trackId}".`,
      { trackId },
    );
  }

  return boundary;
}

/**
 * Always throws. The production queue contains zero exact Arkansas source
 * requirements, and candidate hashes cannot be promoted by this worker.
 */
export function assertArkansasOfficialPdfExactRequirement(
  officialFormId: string,
): never {
  const boundary = sourceBoundary(officialFormId);

  throw new ArkansasOfficialPdfFamilyBlockedError(
    "authority_unmanifested_source",
    `${officialFormId} has candidate identity evidence but no adopted exact authority descriptor.`,
    {
      officialFormId,
      authorityState: boundary.authorityState,
      exactAuthorityDescriptor: boundary.exactAuthorityDescriptor,
    },
  );
}

/**
 * Always throws. It preserves the mixed-footer and composite identity
 * decisions instead of selecting a candidate revision or variant.
 */
export function assertArkansasOfficialPdfAuthorityResolved(
  officialFormId: string,
): never {
  const boundary = sourceBoundary(officialFormId);

  if (boundary.evidenceIssue === "mixed_footer_revision_unresolved") {
    throw new ArkansasOfficialPdfFamilyBlockedError(
      "authority_mixed_footer_revision_unresolved",
      `${officialFormId} has mixed page-footer revisions and no adopted authority revision.`,
      { officialFormId, revision: boundary.revision },
    );
  }

  if (boundary.evidenceIssue === "composite_variant_binding_required") {
    throw new ArkansasOfficialPdfFamilyBlockedError(
      "authority_composite_identity_unresolved",
      `${officialFormId} represents distinct felony and misdemeanor candidate variants that require authority track binding.`,
      {
        officialFormId,
        candidateEvidenceCount: boundary.candidateEvidenceCount,
      },
    );
  }

  throw new ArkansasOfficialPdfFamilyBlockedError(
    "authority_unmanifested_source",
    `${officialFormId} has no adopted exact authority asset.`,
    { officialFormId, authorityState: boundary.authorityState },
  );
}

/**
 * Always throws. Candidate evidence may prove that a historical or public
 * artifact was observed, but it is not an authority descriptor or a resolver
 * source.
 */
export function assertArkansasCandidateEvidenceSelectable(
  officialFormId: string,
): never {
  const boundary = sourceBoundary(officialFormId);

  throw new ArkansasOfficialPdfFamilyBlockedError(
    "candidate_evidence_not_authority",
    `${officialFormId} candidate evidence is not selectable authority.`,
    {
      officialFormId,
      candidateEvidenceCount: boundary.candidateEvidenceCount,
    },
  );
}

/**
 * Always throws before any local read. Authority adoption is a prerequisite to
 * a captain assignment, portable projection, and fresh local verification.
 */
export function assertArkansasOfficialPdfDocumentMaterialized(
  officialFormId: string,
): never {
  return assertArkansasOfficialPdfAuthorityResolved(officialFormId);
}

/**
 * Always throws on the first preserved route blocker. No route has an active
 * renderer, source, mapping, or legal-design override.
 */
export function assertArkansasOfficialPdfTrackRenderable(
  trackId: string,
): never {
  const boundary = routeBoundary(trackId);
  const code = boundary.blockingReasonCodes[0];

  throw new ArkansasOfficialPdfFamilyBlockedError(
    code,
    `${trackId} is not renderable: ${code}.`,
    {
      trackId,
      familyId: ARKANSAS_OFFICIAL_PDF_FAMILY_ID,
      blockingReasonCodes: boundary.blockingReasonCodes,
    },
  );
}

/**
 * Always throws. Deterministic component order does not mean that a packet is
 * source-complete, legally unblocked, or generation-ready.
 */
export function assertArkansasOfficialPdfPacketReady(trackId: string): never {
  const boundary = routeBoundary(trackId);
  const code = boundary.blockingReasonCodes[0];

  throw new ArkansasOfficialPdfFamilyBlockedError(
    code,
    `${trackId} packet assembly remains blocked: ${code}.`,
    {
      trackId,
      officialFormIds: boundary.officialFormIds,
      packetReady: boundary.packetReady,
    },
  );
}

/**
 * Runtime packet generation is deliberately impossible in this isolated
 * boundary.
 */
export function renderArkansasOfficialPdfFamilyPacket(
  trackId: string,
  facts: Readonly<Record<string, unknown>>,
): never {
  void facts;
  return assertArkansasOfficialPdfTrackRenderable(trackId);
}
