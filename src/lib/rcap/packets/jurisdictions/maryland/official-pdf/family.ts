/**
 * Fail-closed production-factory contract for the Maryland District Court
 * official-PDF family, including identity-only coverage for the completed
 * CC-DC-CR-148 / MDJ-008 shielding tranche.
 *
 * This module is intentionally not imported by the central packet registry.
 * Master Library Edition 1.2 retains every CC-DC-CR-072 primary as
 * `source_gated`, and the exact source bytes are not materialized in this
 * checkout. The shielding implementation remains external and unchanged. The
 * constants below make every queue identity and packet boundary code-readable
 * without creating a source read, renderer-selectable route, or runtime import.
 */

export const MARYLAND_REMAINING_OFFICIAL_PDF_FAMILY_ID =
  "md-district-court-expungement-form-family";

export const MARYLAND_OFFICIAL_PDF_SOURCE_AUTHORIZATION = {
  workerMaterializationAuthorized: false,
  workerReadAuthorized: false,
  workerReady: false
} as const;

export type MarylandRemainingOfficialPdfDocumentId =
  | "CC-DC-CR-072A"
  | "CC-DC-CR-072B"
  | "CC-DC-CR-072C"
  | "CC-DC-CR-072D"
  | "CC-DC-CR-078"
  | "CC-DC-089"
  | "CC-DC-CR-148"
  | "MDJ-008";

export type MarylandRemainingOfficialPdfTrackId =
  | "md_10105_favorable"
  | "md_10105_early"
  | "md_10110_conviction"
  | "md_cannabis_petition"
  | "md_pardon_expungement"
  | "md_second_chance_shielding";

export type MarylandOfficialPdfBlockCode =
  | "unknown_track"
  | "authority_source_gated"
  | "source_materialization_required"
  | "field_mapping_pending"
  | "conditional_component_rule_unresolved"
  | "unsupported_document"
  | "exact_source_pin_mismatch"
  | "generation_disabled"
  | "packet_assembly_blocked";

export type MarylandOfficialPdfSourceIdentity = {
  documentId: MarylandRemainingOfficialPdfDocumentId;
  sha256: string;
  bytes: number;
  mediaType: "application/pdf";
  packetRole: "primary_filing" | "attachment" | "fee_waiver";
  assetClass: "source_gated" | "packet_form";
  repositorySourcePathEvidence: string;
  workerMaterializationAuthorized: false;
  workerReadAuthorized: false;
  workerReady: false;
};

export const MARYLAND_REMAINING_OFFICIAL_PDF_SOURCE_IDENTITIES =
  [
    {
      documentId: "CC-DC-CR-072A",
      sha256: "8dcb7b177cfb8900edc03158b064a57121170761e6f34e2456f08fdc68f82db2",
      bytes: 195791,
      mediaType: "application/pdf",
      packetRole: "primary_filing",
      assetClass: "source_gated",
      repositorySourcePathEvidence:
        "private/Nationwide Record Clearing/LegalEase Maryland/LegalEase Maryland forms /ccdccr072A.pdf",
      workerMaterializationAuthorized: false,
      workerReadAuthorized: false,
      workerReady: false
    },
    {
      documentId: "CC-DC-CR-072B",
      sha256: "3a61136ead74ffc9a09652edf0ad4a113538f3e172c0ddea4df618cb3c0a4469",
      bytes: 764936,
      mediaType: "application/pdf",
      packetRole: "primary_filing",
      assetClass: "source_gated",
      repositorySourcePathEvidence:
        "private/Nationwide Record Clearing/LegalEase Maryland/LegalEase Maryland forms /ccdccr072B.pdf",
      workerMaterializationAuthorized: false,
      workerReadAuthorized: false,
      workerReady: false
    },
    {
      documentId: "CC-DC-CR-072C",
      sha256: "9faa52511adfce4c33a63fbc983f5999d288af2579c63f4425dd39714607c5ac",
      bytes: 888008,
      mediaType: "application/pdf",
      packetRole: "primary_filing",
      assetClass: "source_gated",
      repositorySourcePathEvidence:
        "private/Nationwide Record Clearing/LegalEase Maryland/LegalEase Maryland forms /ccdccr072c.pdf",
      workerMaterializationAuthorized: false,
      workerReadAuthorized: false,
      workerReady: false
    },
    {
      documentId: "CC-DC-CR-072D",
      sha256: "6a5337a5d142c8ae1cc41845bd4c5efb5598e7a64acbda17c9ab70134773f147",
      bytes: 166429,
      mediaType: "application/pdf",
      packetRole: "primary_filing",
      assetClass: "source_gated",
      repositorySourcePathEvidence:
        "private/Nationwide Record Clearing/LegalEase Maryland/LegalEase Maryland forms /ccdccr072d.pdf",
      workerMaterializationAuthorized: false,
      workerReadAuthorized: false,
      workerReady: false
    },
    {
      documentId: "CC-DC-CR-078",
      sha256: "6dc8f576c2fe488b488948c6d50e0137c2fd9781a904179219c491b2f776ea1b",
      bytes: 35270,
      mediaType: "application/pdf",
      packetRole: "attachment",
      assetClass: "packet_form",
      repositorySourcePathEvidence:
        "private/Nationwide Record Clearing/LegalEase Maryland/forms/CC-DC-CR-078__general-waiver-and-release__rev-2025-01.pdf",
      workerMaterializationAuthorized: false,
      workerReadAuthorized: false,
      workerReady: false
    },
    {
      documentId: "CC-DC-089",
      sha256: "eab9b1eb34b36beee57cb4ea3334ec7f8a6d825e853b73c87724c65066069384",
      bytes: 1062198,
      mediaType: "application/pdf",
      packetRole: "fee_waiver",
      assetClass: "packet_form",
      repositorySourcePathEvidence:
        "private/Nationwide Record Clearing/LegalEase Maryland/forms/CC-DC-089__request-for-waiver-of-prepaid-costs__rev-2025-11.pdf",
      workerMaterializationAuthorized: false,
      workerReadAuthorized: false,
      workerReady: false
    },
    {
      documentId: "CC-DC-CR-148",
      sha256: "abcafbc298d56937ad41ba44675147942b1ab540325898917efafed3f5b43e3f",
      bytes: 238823,
      mediaType: "application/pdf",
      packetRole: "primary_filing",
      assetClass: "packet_form",
      repositorySourcePathEvidence:
        "private/Nationwide Record Clearing/LegalEase Maryland/forms/CC-DC-CR-148__petition-for-shielding-under-maryland-second-chance-act__rev-2026-07.pdf",
      workerMaterializationAuthorized: false,
      workerReadAuthorized: false,
      workerReady: false
    },
    {
      documentId: "MDJ-008",
      sha256: "42510792803b979974b3967dfd0f871271e7518cf64e226d5a80e22b67a6e369",
      bytes: 248175,
      mediaType: "application/pdf",
      packetRole: "attachment",
      assetClass: "packet_form",
      repositorySourcePathEvidence:
        "private/Nationwide Record Clearing/LegalEase Maryland/forms/MDJ-008__notice-regarding-restricted-information-pursuant-to-rule-20-201.1__rev-2026-07.pdf",
      workerMaterializationAuthorized: false,
      workerReadAuthorized: false,
      workerReady: false
    }
  ] as const satisfies readonly MarylandOfficialPdfSourceIdentity[];

export type MarylandOfficialPdfPacketDocument = {
  documentId: MarylandRemainingOfficialPdfDocumentId;
  componentId: string;
  role: "primary_filing" | "attachment" | "fee_waiver";
  requirement: "required" | "conditional";
  conditionKey?: "requestsFeeWaiver";
};

export type MarylandOfficialPdfBlockedPacket = {
  trackId: MarylandRemainingOfficialPdfTrackId;
  documents: readonly MarylandOfficialPdfPacketDocument[];
  blockers: readonly MarylandOfficialPdfBlockCode[];
  runtimeDisabled: true;
  generationAllowed: false;
};

export const MARYLAND_REMAINING_OFFICIAL_PDF_PACKETS =
  [
    {
      trackId: "md_10105_favorable",
      documents: [
        {
          documentId: "CC-DC-CR-072A",
          componentId: "md_10105_favorable-primary-filing-1",
          role: "primary_filing",
          requirement: "required"
        }
      ],
      blockers: [
        "authority_source_gated",
        "source_materialization_required",
        "field_mapping_pending"
      ],
      runtimeDisabled: true,
      generationAllowed: false
    },
    {
      trackId: "md_10105_early",
      documents: [
        {
          documentId: "CC-DC-CR-072C",
          componentId: "md_10105_early-primary-filing-1",
          role: "primary_filing",
          requirement: "required"
        },
        {
          documentId: "CC-DC-CR-078",
          componentId: "md_10105_early-attachment-2",
          role: "attachment",
          requirement: "conditional"
        }
      ],
      blockers: [
        "authority_source_gated",
        "source_materialization_required",
        "field_mapping_pending",
        "conditional_component_rule_unresolved"
      ],
      runtimeDisabled: true,
      generationAllowed: false
    },
    {
      trackId: "md_10110_conviction",
      documents: [
        {
          documentId: "CC-DC-CR-072B",
          componentId: "md_10110_conviction-primary-filing-1",
          role: "primary_filing",
          requirement: "required"
        },
        {
          documentId: "CC-DC-089",
          componentId: "md_10110_conviction-fee-waiver-2",
          role: "fee_waiver",
          requirement: "conditional",
          conditionKey: "requestsFeeWaiver"
        }
      ],
      blockers: [
        "authority_source_gated",
        "source_materialization_required",
        "field_mapping_pending"
      ],
      runtimeDisabled: true,
      generationAllowed: false
    },
    {
      trackId: "md_cannabis_petition",
      documents: [
        {
          documentId: "CC-DC-CR-072D",
          componentId: "md_cannabis_petition-primary-filing-1",
          role: "primary_filing",
          requirement: "required"
        },
        {
          documentId: "CC-DC-089",
          componentId: "md_cannabis_petition-fee-waiver-2",
          role: "fee_waiver",
          requirement: "conditional",
          conditionKey: "requestsFeeWaiver"
        }
      ],
      blockers: [
        "authority_source_gated",
        "source_materialization_required",
        "field_mapping_pending"
      ],
      runtimeDisabled: true,
      generationAllowed: false
    },
    {
      trackId: "md_pardon_expungement",
      documents: [
        {
          documentId: "CC-DC-CR-072B",
          componentId: "md_pardon_expungement-primary-filing-1",
          role: "primary_filing",
          requirement: "required"
        },
        {
          documentId: "CC-DC-089",
          componentId: "md_pardon_expungement-fee-waiver-2",
          role: "fee_waiver",
          requirement: "conditional",
          conditionKey: "requestsFeeWaiver"
        }
      ],
      blockers: [
        "authority_source_gated",
        "source_materialization_required",
        "field_mapping_pending"
      ],
      runtimeDisabled: true,
      generationAllowed: false
    },
    {
      trackId: "md_second_chance_shielding",
      documents: [
        {
          documentId: "CC-DC-CR-148",
          componentId: "md_second_chance_shielding-primary-filing-1",
          role: "primary_filing",
          requirement: "required"
        },
        {
          documentId: "MDJ-008",
          componentId: "md_second_chance_shielding-attachment-2",
          role: "attachment",
          requirement: "required"
        }
      ],
      blockers: [
        "source_materialization_required",
        "field_mapping_pending"
      ],
      runtimeDisabled: true,
      generationAllowed: false
    }
  ] as const satisfies readonly MarylandOfficialPdfBlockedPacket[];

/**
 * Active mappings remain empty until exact bytes are present, freshly
 * inspected, fully ownership-classified, and visually reviewed.
 */
export const MARYLAND_REMAINING_ACROFORM_MAPPINGS: readonly never[] = [];
export const MARYLAND_REMAINING_OVERLAY_PLACEMENTS: readonly never[] = [];

export class MarylandOfficialPdfFamilyBlockedError extends Error {
  readonly code: MarylandOfficialPdfBlockCode;
  readonly trackId: string;

  constructor(code: MarylandOfficialPdfBlockCode, trackId: string) {
    super(`Maryland official PDF track ${trackId} is blocked: ${code}.`);
    this.name = "MarylandOfficialPdfFamilyBlockedError";
    this.code = code;
    this.trackId = trackId;
  }
}

export class MarylandOfficialPdfSourceBlockedError extends Error {
  readonly code: MarylandOfficialPdfBlockCode;
  readonly documentId: string;

  constructor(code: MarylandOfficialPdfBlockCode, documentId: string) {
    super(`Maryland official PDF document ${documentId} is blocked: ${code}.`);
    this.name = "MarylandOfficialPdfSourceBlockedError";
    this.code = code;
    this.documentId = documentId;
  }
}

function marylandOfficialPdfSourceIdentity(
  documentId: string
): MarylandOfficialPdfSourceIdentity {
  const identity = MARYLAND_REMAINING_OFFICIAL_PDF_SOURCE_IDENTITIES.find(
    (candidate) => candidate.documentId === documentId
  );
  if (!identity) {
    throw new MarylandOfficialPdfSourceBlockedError(
      "unsupported_document",
      documentId
    );
  }
  return identity;
}

/**
 * Confirms only the carried immutable identity. A matching pin does not
 * authorize this worker to read or materialize the source.
 */
export function assertMarylandOfficialPdfExactSourcePin(
  documentId: string,
  sha256: string,
  bytes: number
): true {
  const identity = marylandOfficialPdfSourceIdentity(documentId);
  if (identity.sha256 !== sha256 || identity.bytes !== bytes) {
    throw new MarylandOfficialPdfSourceBlockedError(
      "exact_source_pin_mismatch",
      documentId
    );
  }
  return true;
}

/**
 * Always throws until a captain-owned assignment and verified portable
 * projection exist for this factory scaffold.
 */
export function preflightMarylandOfficialPdfDocument(
  documentId: string
): never {
  marylandOfficialPdfSourceIdentity(documentId);
  throw new MarylandOfficialPdfSourceBlockedError(
    "source_materialization_required",
    documentId
  );
}

export function marylandOfficialPdfBlockersFor(
  trackId: string
): readonly MarylandOfficialPdfBlockCode[] {
  const packet = MARYLAND_REMAINING_OFFICIAL_PDF_PACKETS.find(
    (candidate) => candidate.trackId === trackId
  );
  return packet?.blockers ?? ["unknown_track"];
}

/**
 * There is deliberately no rendering path in this module. Callers receive a
 * typed terminal stop instead of a partially assembled form or a fallback
 * source.
 */
export function assertMarylandRemainingOfficialPdfTrackRenderable(
  trackId: string
): never {
  const [firstBlocker] = marylandOfficialPdfBlockersFor(trackId);
  throw new MarylandOfficialPdfFamilyBlockedError(
    firstBlocker ?? "unknown_track",
    trackId
  );
}

/**
 * Uniform production rendering gate. The older `Remaining` assertion above is
 * retained for compatibility with its source/authority-specific semantics.
 */
export function assertMarylandOfficialPdfTrackRenderable(
  trackId: string
): never {
  if (marylandOfficialPdfBlockersFor(trackId)[0] === "unknown_track") {
    throw new MarylandOfficialPdfFamilyBlockedError("unknown_track", trackId);
  }
  throw new MarylandOfficialPdfFamilyBlockedError(
    "generation_disabled",
    trackId
  );
}

export function assertMarylandOfficialPdfPacketAssemblable(
  trackId: string
): never {
  if (marylandOfficialPdfBlockersFor(trackId)[0] === "unknown_track") {
    throw new MarylandOfficialPdfFamilyBlockedError("unknown_track", trackId);
  }
  throw new MarylandOfficialPdfFamilyBlockedError(
    "packet_assembly_blocked",
    trackId
  );
}
