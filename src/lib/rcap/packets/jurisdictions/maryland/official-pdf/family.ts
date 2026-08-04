/**
 * Fail-closed contract for the Maryland District Court expungement form family
 * that remains after the completed CC-DC-CR-148 / MDJ-008 shielding tranche.
 *
 * This module is intentionally not imported by the central packet registry.
 * Master Library Edition 1.2 retains every CC-DC-CR-072 primary as
 * `source_gated`, and the exact source bytes are not materialized in this
 * checkout. The constants below make the identity and packet boundary
 * code-readable without creating a renderer-selectable route.
 */

export const MARYLAND_REMAINING_OFFICIAL_PDF_FAMILY_ID =
  "md-district-court-expungement-form-family";

export type MarylandRemainingOfficialPdfDocumentId =
  | "CC-DC-CR-072A"
  | "CC-DC-CR-072B"
  | "CC-DC-CR-072C"
  | "CC-DC-CR-072D"
  | "CC-DC-CR-078"
  | "CC-DC-089";

export type MarylandRemainingOfficialPdfTrackId =
  | "md_10105_favorable"
  | "md_10105_early"
  | "md_10110_conviction"
  | "md_cannabis_petition"
  | "md_pardon_expungement";

export type MarylandOfficialPdfBlockCode =
  | "unknown_track"
  | "authority_source_gated"
  | "source_materialization_required"
  | "field_mapping_pending"
  | "conditional_component_rule_unresolved";

export type MarylandOfficialPdfSourceIdentity = {
  documentId: MarylandRemainingOfficialPdfDocumentId;
  sha256: string;
  bytes: number;
  mediaType: "application/pdf";
  packetRole: "primary_filing" | "attachment" | "fee_waiver";
  assetClass: "source_gated" | "packet_form";
  materializationDestination: string;
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
      materializationDestination:
        "private/Nationwide Record Clearing/LegalEase Maryland/LegalEase Maryland forms /ccdccr072A.pdf"
    },
    {
      documentId: "CC-DC-CR-072B",
      sha256: "3a61136ead74ffc9a09652edf0ad4a113538f3e172c0ddea4df618cb3c0a4469",
      bytes: 764936,
      mediaType: "application/pdf",
      packetRole: "primary_filing",
      assetClass: "source_gated",
      materializationDestination:
        "private/Nationwide Record Clearing/LegalEase Maryland/LegalEase Maryland forms /ccdccr072B.pdf"
    },
    {
      documentId: "CC-DC-CR-072C",
      sha256: "9faa52511adfce4c33a63fbc983f5999d288af2579c63f4425dd39714607c5ac",
      bytes: 888008,
      mediaType: "application/pdf",
      packetRole: "primary_filing",
      assetClass: "source_gated",
      materializationDestination:
        "private/Nationwide Record Clearing/LegalEase Maryland/LegalEase Maryland forms /ccdccr072c.pdf"
    },
    {
      documentId: "CC-DC-CR-072D",
      sha256: "6a5337a5d142c8ae1cc41845bd4c5efb5598e7a64acbda17c9ab70134773f147",
      bytes: 166429,
      mediaType: "application/pdf",
      packetRole: "primary_filing",
      assetClass: "source_gated",
      materializationDestination:
        "private/Nationwide Record Clearing/LegalEase Maryland/LegalEase Maryland forms /ccdccr072d.pdf"
    },
    {
      documentId: "CC-DC-CR-078",
      sha256: "6dc8f576c2fe488b488948c6d50e0137c2fd9781a904179219c491b2f776ea1b",
      bytes: 35270,
      mediaType: "application/pdf",
      packetRole: "attachment",
      assetClass: "packet_form",
      materializationDestination:
        "private/Nationwide Record Clearing/LegalEase Maryland/forms/CC-DC-CR-078__general-waiver-and-release__rev-2025-01.pdf"
    },
    {
      documentId: "CC-DC-089",
      sha256: "eab9b1eb34b36beee57cb4ea3334ec7f8a6d825e853b73c87724c65066069384",
      bytes: 1062198,
      mediaType: "application/pdf",
      packetRole: "fee_waiver",
      assetClass: "packet_form",
      materializationDestination:
        "private/Nationwide Record Clearing/LegalEase Maryland/forms/CC-DC-089__request-for-waiver-of-prepaid-costs__rev-2025-11.pdf"
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
