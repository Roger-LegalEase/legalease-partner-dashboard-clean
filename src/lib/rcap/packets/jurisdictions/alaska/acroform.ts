import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

import {
  PDFCheckBox,
  PDFDocument,
  PDFRadioGroup,
  PDFTextField,
  StandardFonts,
  type PDFFont,
  type PDFField
} from "pdf-lib";

const LOAD_OPTIONS = { updateMetadata: false } as const;
const DETERMINISTIC_TIMESTAMP = new Date(Date.UTC(2000, 0, 1, 0, 0, 0));
const FIELD_FONT_SIZE = 12;
const FIELD_HORIZONTAL_PADDING = 4;
const FIELD_VERTICAL_PADDING = 4;
const MULTILINE_LINE_HEIGHT = 14;
const RECT_TOLERANCE = 0.02;

export const ALASKA_ACROFORM_JOB_ID = "rcap-ak-acroform-fill" as const;
export const ALASKA_ACROFORM_RUNTIME_DISABLED = true as const;
export const ALASKA_ACROFORM_PACKET_READY = false as const;
export const ALASKA_ACROFORM_COUNSEL_ADOPTED = false as const;
export const ALASKA_ACROFORM_RELEASE_ACTIVE = false as const;

export const ALASKA_ACROFORM_TRACK_IDS = [
  "ak-courtview",
  "ak-tf800",
  "ak-tf805"
] as const;

export const ALASKA_ACROFORM_COMPONENT_IDS = [
  "ak-courtview-primary-filing-2",
  "ak-tf800-primary-filing-1",
  "ak-tf805-certificate-of-service-2",
  "ak-tf805-primary-filing-1",
  "ak-tf805-proposed-order-3"
] as const;

export type AlaskaAcroformTrackId =
  (typeof ALASKA_ACROFORM_TRACK_IDS)[number];
export type AlaskaAcroformDocumentId = "TF-800" | "TF-805" | "TF-810";
export type AlaskaAcroformFieldType = "text" | "checkbox" | "radio";
export type AlaskaFieldOwnership =
  | "participant_supplied"
  | "derived_deterministically_from_participant_answers"
  | "manual_participant_completion"
  | "outside_party_completion"
  | "court_or_agency_only"
  | "prohibited_from_generation"
  | "intentionally_blank"
  | "not_used_by_assigned_route";

export type AlaskaAcroformWidget = Readonly<{
  page: number;
  x: number;
  y: number;
  width: number;
  height: number;
}>;

export type AlaskaAcroformFieldInventory = Readonly<{
  name: string;
  type: AlaskaAcroformFieldType;
  widgets: readonly AlaskaAcroformWidget[];
  currentValue: "";
  options: readonly string[];
  multiline: boolean;
  ownership: AlaskaFieldOwnership;
  inputKey: string | null;
  deterministicSource: string | null;
  treatment: string;
}>;

export type AlaskaSourceRequirement = Readonly<{
  sourceIdentityKey: string;
  documentId: AlaskaAcroformDocumentId;
  documentRole: "FORM";
  revision: "REV-2025-05";
  expectedSha256: string;
  expectedBytes: number;
  expectedMediaType: "application/pdf";
  expectedPageCount: number;
  expectedFieldCount: number;
  structuralClass: "clean_acroform";
  materializationDestination: string;
  componentIds: readonly string[];
  trackIds: readonly AlaskaAcroformTrackId[];
}>;

const widget = (
  page: number,
  x: number,
  y: number,
  width: number,
  height: number
): AlaskaAcroformWidget => ({ page, x, y, width, height });

const manualText = (
  name: string,
  widgets: readonly AlaskaAcroformWidget[],
  treatment: string,
  multiline = false
): AlaskaAcroformFieldInventory => ({
  name,
  type: "text",
  widgets,
  currentValue: "",
  options: [],
  multiline,
  ownership: "manual_participant_completion",
  inputKey: null,
  deterministicSource: null,
  treatment
});

const manualCheckbox = (
  name: string,
  widgets: readonly AlaskaAcroformWidget[],
  treatment: string
): AlaskaAcroformFieldInventory => ({
  name,
  type: "checkbox",
  widgets,
  currentValue: "",
  options: ["Yes"],
  multiline: false,
  ownership: "manual_participant_completion",
  inputKey: null,
  deterministicSource: null,
  treatment
});

const mappedText = (
  name: string,
  widgets: readonly AlaskaAcroformWidget[],
  inputKey: string,
  ownership:
    | "participant_supplied"
    | "derived_deterministically_from_participant_answers",
  deterministicSource: string | null,
  treatment: string,
  multiline = false
): AlaskaAcroformFieldInventory => ({
  name,
  type: "text",
  widgets,
  currentValue: "",
  options: [],
  multiline,
  ownership,
  inputKey,
  deterministicSource,
  treatment
});

export const ALASKA_ACROFORM_SOURCE_REQUIREMENTS:
  readonly AlaskaSourceRequirement[] = Object.freeze([
    {
      sourceIdentityKey: "rcap-ak-tf-800-e717f4aed8",
      documentId: "TF-800",
      documentRole: "FORM",
      revision: "REV-2025-05",
      expectedSha256:
        "94bab52533d74551f7a8ff8644a9671241b38075c7e05f10806d627dfb898cbd",
      expectedBytes: 130602,
      expectedMediaType: "application/pdf",
      expectedPageCount: 3,
      expectedFieldCount: 26,
      structuralClass: "clean_acroform",
      materializationDestination:
        "official-pdf/AK/AK__FORM__TF-800__request-to-make-case-records-confidential-or-sealed-under-administrative-rule-37-6__REV-2025-05__EN.pdf",
      componentIds: ["ak-tf800-primary-filing-1"],
      trackIds: ["ak-tf800"]
    },
    {
      sourceIdentityKey: "rcap-ak-tf-805-0d259b9bb8",
      documentId: "TF-805",
      documentRole: "FORM",
      revision: "REV-2025-05",
      expectedSha256:
        "96306d64eda397e25094f92c3d67a642372b82cba12f97c6666e5500136e8f54",
      expectedBytes: 93899,
      expectedMediaType: "application/pdf",
      expectedPageCount: 2,
      expectedFieldCount: 17,
      structuralClass: "clean_acroform",
      materializationDestination:
        "official-pdf/AK/AK__FORM__TF-805__request-to-remove-name-from-online-public-index-courtview-under-administrative-rule-40-b-o__REV-2025-05__EN.pdf",
      componentIds: [
        "ak-tf805-certificate-of-service-2",
        "ak-tf805-primary-filing-1",
        "ak-tf805-proposed-order-3"
      ],
      trackIds: ["ak-tf805"]
    },
    {
      sourceIdentityKey: "rcap-ak-tf-810-9daa019355",
      documentId: "TF-810",
      documentRole: "FORM",
      revision: "REV-2025-05",
      expectedSha256:
        "c5e55ce0c0bb2a008ad9cde5e62c4900f413c8fb64a913e94c81554c64b69582",
      expectedBytes: 85386,
      expectedMediaType: "application/pdf",
      expectedPageCount: 1,
      expectedFieldCount: 23,
      structuralClass: "clean_acroform",
      materializationDestination:
        "official-pdf/AK/AK__FORM__TF-810__request-to-exclude-case-from-online-public-index-courtview-under-administrative-rule-40-a__REV-2025-05__EN.pdf",
      componentIds: ["ak-courtview-primary-filing-2"],
      trackIds: ["ak-courtview"]
    }
  ]);

export const ALASKA_ACROFORM_FIELD_INVENTORIES: Readonly<
  Record<AlaskaAcroformDocumentId, readonly AlaskaAcroformFieldInventory[]>
> = Object.freeze({
  "TF-800": Object.freeze([
    manualText(
      "address",
      [widget(1, 115.878, 386.739, 425.011, 14.4)],
      "The normalized track does not provide a separately structured address; the participant completes this field."
    ),
    manualText(
      "audioRecording",
      [widget(1, 322.472, 143.941, 218.417, 15.84)],
      "Selecting and describing this record category remains a participant completion step."
    ),
    manualText(
      "caseName",
      [widget(1, 132.181, 328.792, 229.696, 14.4)],
      "The normalized track does not supply a distinct case caption."
    ),
    mappedText(
      "caseNo",
      [
        widget(1, 413.827, 328.792, 127.062, 14.4),
        widget(2, 119.937, 741.155, 134.39, 15.84),
        widget(3, 122.405, 741.971, 130.245, 15.84)
      ],
      "caseNumberAndCourt",
      "derived_deterministically_from_participant_answers",
      "Text before the first comma in caseNumberAndCourt.",
      "The same official field has three widgets, so one derived case number appears on all pages."
    ),
    manualText(
      "certDate",
      [widget(2, 127.762, 356.645, 89.199, 13.969)],
      "Service occurs after generation; the participant supplies the actual service date manually."
    ),
    manualCheckbox(
      "Check Box1",
      [widget(1, 72.853, 205.661, 11.52, 11.52)],
      "The participant must identify whether the entire case file is requested; free text is not converted into a legal selection."
    ),
    manualCheckbox(
      "Check Box2",
      [widget(1, 72.853, 191.046, 11.52, 11.52)],
      "The participant must select the document category manually."
    ),
    manualCheckbox(
      "Check Box3",
      [widget(1, 72.853, 160.715, 11.52, 11.52)],
      "The participant must select the log-note category manually."
    ),
    manualCheckbox(
      "Check Box4",
      [widget(1, 72.853, 144.624, 11.52, 11.52)],
      "The participant must select the audio-recording category manually."
    ),
    manualCheckbox(
      "Check Box5",
      [widget(1, 72.853, 130.26, 11.52, 11.52)],
      "The participant must select the transcript category manually."
    ),
    mappedText(
      "confidentialBecause",
      [widget(1, 71.413, 51.825, 469.177, 61.628)],
      "sealingNarrative",
      "participant_supplied",
      null,
      "The participant's narrative is copied verbatim; no advocacy or eligibility conclusion is added.",
      true
    ),
    manualText(
      "dateHearing",
      [widget(1, 291.818, 159.013, 249.071, 15.84)],
      "A hearing date and type must be specifically supplied by the participant; the normalized input does not separate them."
    ),
    manualText(
      "dayPhone",
      [widget(1, 442.563, 371.124, 98.326, 14.4)],
      "The normalized track does not provide a separately structured telephone number."
    ),
    mappedText(
      "documents",
      [widget(1, 157.036, 171.318, 383.853, 37.391)],
      "recordsToSeal",
      "participant_supplied",
      null,
      "The participant's identified-record text is copied verbatim. Category and confidential/sealed selections remain manual.",
      true
    ),
    manualText(
      "email",
      [widget(1, 111.109, 372.171, 249.175, 14.4)],
      "The normalized track does not provide a separately structured email address."
    ),
    manualCheckbox(
      "emailCB",
      [widget(2, 406.021, 344.601, 11.52, 11.519)],
      "The participant selects the service method after service occurs."
    ),
    {
      name: "Group1",
      type: "radio",
      widgets: [
        widget(1, 227.194, 221.588, 11.52, 11.52),
        widget(1, 340.83, 221.588, 11.52, 11.52)
      ],
      currentValue: "",
      options: ["Choice1", "Choice2"],
      multiline: false,
      ownership: "manual_participant_completion",
      inputKey: null,
      deterministicSource: null,
      treatment:
        "Confidential versus sealed is an explicit participant request; recordsToSeal does not safely encode this choice."
    },
    manualCheckbox(
      "hd",
      [widget(2, 245.734, 344.601, 11.531, 11.437)],
      "The participant selects the service method after service occurs."
    ),
    manualCheckbox(
      "mail",
      [widget(2, 198.985, 344.601, 11.531, 11.437)],
      "The participant selects the service method after service occurs."
    ),
    manualText(
      "name",
      [widget(1, 106.976, 402.306, 433.913, 14.4)],
      "The normalized track does not provide a separately structured requestor name."
    ),
    manualText(
      "needText1",
      [widget(2, 183.718, 316.883, 347.409, 16)],
      "The people actually served are recorded manually after service."
    ),
    manualText(
      "partyNames",
      [widget(1, 139.966, 314.796, 400.923, 14.4)],
      "The normalized track does not provide a distinct party-name list."
    ),
    manualText(
      "signature0",
      [widget(2, 124.309, 297.056, 164.791, 16)],
      "Certificate-of-service signature is always manual."
    ),
    manualCheckbox(
      "tf",
      [widget(2, 335.078, 344.601, 11.531, 11.437)],
      "The participant selects the service method after service occurs."
    ),
    manualText(
      "time2",
      [widget(2, 232.449, 356.645, 92.481, 13.969)],
      "Service occurs after generation; the participant supplies the actual service time manually."
    ),
    manualText(
      "transcript",
      [widget(1, 292.036, 128.504, 248.853, 15.84)],
      "Selecting and describing this record category remains a participant completion step."
    )
  ]),
  "TF-805": Object.freeze([
    manualText(
      "address",
      [widget(1, 115.425, 544.967, 425.011, 14.4)],
      "The normalized track does not provide a separately structured address."
    ),
    manualText(
      "caseName",
      [widget(1, 133.719, 490.261, 226.587, 14.4)],
      "The normalized track does not provide a distinct case caption."
    ),
    mappedText(
      "caseNo",
      [widget(1, 413.33, 489.261, 127.106, 14.4)],
      "caseNumberAndCourt",
      "derived_deterministically_from_participant_answers",
      "Text before the first comma in caseNumberAndCourt.",
      "Only the case-number portion is written; the source has no AcroForm field for the court name."
    ),
    manualText(
      "certDate",
      [widget(2, 127.427, 568.331, 89.199, 13.968)],
      "Service date is supplied manually after service occurs."
    ),
    manualText(
      "dayPhone",
      [widget(1, 442.959, 530.399, 97.477, 14.4)],
      "The normalized track does not provide a separately structured telephone number."
    ),
    manualText(
      "email",
      [widget(1, 106.13, 530.399, 253.718, 14.4)],
      "The normalized track does not provide a separately structured email address."
    ),
    manualCheckbox(
      "emailCB",
      [widget(2, 405.686, 557.286, 11.52, 11.519)],
      "The participant selects the service method after service occurs."
    ),
    manualCheckbox(
      "hd",
      [widget(2, 245.399, 557.286, 11.531, 11.438)],
      "The participant selects the service method after service occurs."
    ),
    manualCheckbox(
      "mail",
      [widget(2, 198.65, 557.286, 11.531, 11.438)],
      "The participant selects the service method after service occurs."
    ),
    manualText(
      "name",
      [widget(1, 106.523, 559.534, 433.913, 14.4)],
      "The normalized track does not provide a separately structured requestor name."
    ),
    manualText(
      "needText1",
      [widget(2, 183.383, 529.568, 347.409, 16.001)],
      "The people actually served are recorded manually after service."
    ),
    manualText(
      "partyNames",
      [widget(1, 139.84, 476.265, 400.596, 14.4)],
      "The normalized track does not provide a distinct party-name list."
    ),
    mappedText(
      "reason",
      [widget(1, 71.853, 213.564, 469.732, 79.873)],
      "groundsFacts",
      "participant_supplied",
      null,
      "The participant's grounds narrative is copied verbatim; no finding or advocacy is added.",
      true
    ),
    manualText(
      "signature0",
      [widget(2, 123.974, 509.742, 164.791, 16)],
      "Certificate-of-service signature is always manual."
    ),
    manualCheckbox(
      "tf",
      [widget(2, 334.743, 557.286, 11.531, 11.438)],
      "The participant selects the service method after service occurs."
    ),
    manualText(
      "time2",
      [widget(2, 232.114, 568.331, 92.481, 13.968)],
      "Service time is supplied manually after service occurs."
    ),
    {
      name: "why",
      type: "radio",
      widgets: [
        widget(1, 72.751, 358.706, 11.52, 11.52),
        widget(1, 72.751, 414.997, 11.52, 11.52)
      ],
      currentValue: "",
      options: ["Choice1", "Choice2"],
      multiline: false,
      ownership: "manual_participant_completion",
      inputKey: null,
      deterministicSource: null,
      treatment:
        "Rule 40(b) versus 40(c) is not inferred from the participant's free-text grounds narrative."
    }
  ]),
  "TF-810": Object.freeze([
    manualText(
      "address",
      [widget(1, 115.671, 534.228, 308.498, 15.281)],
      "The normalized track does not provide a separately structured address."
    ),
    mappedText(
      "caseNo",
      [widget(1, 440.83, 517.36, 98.906, 16.125)],
      "caseNumberAndCourt",
      "derived_deterministically_from_participant_answers",
      "Text before the first comma in caseNumberAndCourt.",
      "Only the case-number portion is written; the source has no AcroForm field for the court name."
    ),
    ...[
      ["Check Box1.0", widget(1, 90.898, 490.795, 10.5, 10.407)],
      ["Check Box2.0", widget(1, 90.898, 426.327, 10.5, 10.406)],
      ["Check Box2.1", widget(1, 108.992, 413.014, 10.5, 10.406)],
      ["Check Box2.2", widget(1, 108.992, 398.702, 10.5, 11.343)],
      ["Check Box3.0", widget(1, 90.898, 372.811, 10.5, 10.406)],
      ["Check Box3.1", widget(1, 108.992, 358.795, 10.5, 11.438)],
      ["Check Box3.2", widget(1, 108.992, 345.514, 10.5, 10.406)],
      ["Check Box4.0", widget(1, 90.898, 330.95, 10.5, 11.437)],
      ["Check Box5.0", widget(1, 90.898, 292.358, 10.5, 10.5)],
      ["Check Box6.0", widget(1, 90.898, 252.546, 11.438, 11.437)],
      ["Check Box7.0", widget(1, 90.843, 200.93, 10.5, 10.406)],
      ["Check Box8.0", widget(1, 90.898, 173.827, 10.5, 11.437)],
      ["Check Box8.1", widget(1, 90.898, 147.327, 10.5, 11.437)],
      ["Check Box8.2", widget(1, 90.679, 133.357, 10.5, 11.438)]
    ].map(([name, fieldWidget]) =>
      manualCheckbox(
        name as string,
        [fieldWidget as AlaskaAcroformWidget],
        "The participant must select the exact ground manually; the renderer does not infer eligibility or convert disposition answers into an assertion."
      )
    ),
    manualText(
      "dateSigned",
      [widget(1, 71.867, 99.046, 179.906, 15.187)],
      "Execution date is always manual."
    ),
    manualText(
      "email",
      [widget(1, 363.237, 576.509, 177.179, 17.063)],
      "The normalized track does not provide a separately structured email address."
    ),
    manualText(
      "name",
      [widget(1, 105.792, 577.447, 218.624, 16.125)],
      "The normalized track does not provide a separately structured requestor name."
    ),
    manualText(
      "partyNames",
      [widget(1, 130.517, 518.36, 238.875, 16.125)],
      "The normalized track does not provide a distinct case caption or party-name list."
    ),
    manualText(
      "phoneNo",
      [widget(1, 461.322, 533.194, 79.63, 15.84)],
      "The normalized track does not provide a separately structured telephone number."
    ),
    manualText(
      "rule",
      [widget(1, 107.727, 120.889, 261.169, 14.25)],
      "An otherwise-applicable rule or statute number is not inferred or generated."
    ),
    manualText(
      "signature",
      [widget(1, 287.716, 99.983, 252.372, 14.25)],
      "Requestor signature is always manual."
    )
  ])
});

export const ALASKA_ACROFORM_PROTECTED_SURFACES = Object.freeze({
  "TF-800": Object.freeze([
    {
      page: 2,
      owner: "outside_party_completion" as const,
      region: "sworn verification administration and notary or clerk completion",
      treatment: "blank"
    },
    {
      page: 2,
      owner: "court_or_agency_only" as const,
      region: "order decision, findings, and judicial completion",
      treatment: "blank"
    },
    {
      page: 3,
      owner: "court_or_agency_only" as const,
      region: "order findings, judicial signatures, and clerk distribution",
      treatment: "blank"
    }
  ]),
  "TF-805": Object.freeze([
    {
      page: 1,
      owner: "outside_party_completion" as const,
      region: "sworn verification administration and notary or clerk completion",
      treatment: "blank"
    },
    {
      page: 2,
      owner: "court_or_agency_only" as const,
      region: "order decision, findings, judicial signature, and clerk distribution",
      treatment: "blank"
    }
  ]),
  "TF-810": Object.freeze([
    {
      page: 1,
      owner: "court_or_agency_only" as const,
      region: "clerk instructions, HelpDesk response, date sent, and initials",
      treatment: "blank"
    }
  ])
});

type TextMapping = Readonly<{
  fieldName: string;
  inputKey: string;
  transform: "identity" | "case_number_before_first_comma";
}>;

export const ALASKA_ACROFORM_TEXT_MAPPINGS: Readonly<
  Record<AlaskaAcroformDocumentId, readonly TextMapping[]>
> = Object.freeze({
  "TF-800": Object.freeze([
    {
      fieldName: "caseNo",
      inputKey: "caseNumberAndCourt",
      transform: "case_number_before_first_comma"
    },
    {
      fieldName: "documents",
      inputKey: "recordsToSeal",
      transform: "identity"
    },
    {
      fieldName: "confidentialBecause",
      inputKey: "sealingNarrative",
      transform: "identity"
    }
  ]),
  "TF-805": Object.freeze([
    {
      fieldName: "caseNo",
      inputKey: "caseNumberAndCourt",
      transform: "case_number_before_first_comma"
    },
    {
      fieldName: "reason",
      inputKey: "groundsFacts",
      transform: "identity"
    }
  ]),
  "TF-810": Object.freeze([
    {
      fieldName: "caseNo",
      inputKey: "caseNumberAndCourt",
      transform: "case_number_before_first_comma"
    }
  ])
});

export type AlaskaAcroformErrorCode =
  | "unsupported_track"
  | "unsupported_document"
  | "source_root_required"
  | "source_path_escape"
  | "source_missing"
  | "source_not_read_only"
  | "source_hash_mismatch"
  | "source_size_mismatch"
  | "source_media_type_mismatch"
  | "source_structure_mismatch"
  | "source_unreadable"
  | "missing_required_input"
  | "invalid_case_number_and_court"
  | "field_not_found"
  | "field_type_mismatch"
  | "content_overflow"
  | "protected_input"
  | "protected_field_modified";

export class AlaskaAcroformError extends Error {
  constructor(
    readonly code: AlaskaAcroformErrorCode,
    message: string,
    readonly details: Readonly<Record<string, unknown>> = {}
  ) {
    super(message);
    this.name = "AlaskaAcroformError";
  }
}

export type AlaskaVerifiedSource = Readonly<{
  requirement: AlaskaSourceRequirement;
  absolutePath: string;
  bytes: Uint8Array;
  sha256: string;
  pageCount: number;
  fieldNames: readonly string[];
}>;

export type AlaskaRenderedPhysicalDocument = Readonly<{
  documentId: AlaskaAcroformDocumentId;
  logicalComponentIds: readonly string[];
  physicalCopyCount: 1;
  bytes: Uint8Array;
  sha256: string;
  sourceSha256: string;
  sourceIdentityKey: string;
  pageCount: number;
  mappedFieldNames: readonly string[];
  manualFieldNames: readonly string[];
}>;

export type AlaskaTrackRenderResult = Readonly<{
  trackId: AlaskaAcroformTrackId;
  physicalDocuments: readonly AlaskaRenderedPhysicalDocument[];
  logicalComponentOrder: readonly string[];
  noFilingRequired: boolean;
  runtimeDisabled: true;
  packetReady: false;
  counselAdopted: false;
  releaseActive: false;
  technicalFixtureOnly: true;
}>;

export const ALASKA_ACROFORM_TECHNICAL_FIXTURES = Object.freeze([
  {
    fixtureId: "ak-courtview-visible",
    trackId: "ak-courtview" as const,
    facts: Object.freeze({
      stillOnCourtView: true,
      caseNumberAndCourt: "1JU-00-00000CR, Juneau Trial Court",
      disposition: "dismissed",
      dismissalPartOfPlea: false,
      dispositionDate: "2000-01-01",
      finalDispositionOrderAvailable: true
    }),
    expectedDocumentIds: ["TF-810"] as const,
    expectedPageCount: 1
  },
  {
    fixtureId: "ak-courtview-already-absent",
    trackId: "ak-courtview" as const,
    facts: Object.freeze({
      stillOnCourtView: false,
      caseNumberAndCourt: "3AN-00-00000CR, Anchorage Trial Court"
    }),
    expectedDocumentIds: [] as const,
    expectedPageCount: 0
  },
  {
    fixtureId: "ak-tf800-standard",
    trackId: "ak-tf800" as const,
    facts: Object.freeze({
      caseNumberAndCourt: "3PA-00-00000CR, Palmer Trial Court",
      recordsToSeal: "Synthetic identified record",
      sealingNarrative:
        "Synthetic participant narrative describing the effect of public access."
    }),
    expectedDocumentIds: ["TF-800"] as const,
    expectedPageCount: 3
  },
  {
    fixtureId: "ak-tf805-standard",
    trackId: "ak-tf805" as const,
    facts: Object.freeze({
      caseNumberAndCourt: "3AN-00-00001CR, Anchorage Trial Court",
      groundsFacts:
        "Synthetic participant narrative describing the requested name protection."
    }),
    expectedDocumentIds: ["TF-805"] as const,
    expectedPageCount: 2
  }
]);

// Filled after the source-bound renderer is generated. These values are
// technical fixtures only and do not grant visual or legal approval.
export const ALASKA_ACROFORM_EXPECTED_FIXTURE_HASHES: Readonly<
  Record<string, string>
> = Object.freeze({
  "ak-courtview-visible":
    "ffaecab7d507158d8ddc245d0256cc07f8acadb7dc512c99bd6c5e8be3f34bf3",
  "ak-tf800-standard":
    "d334a729ee9e1e8f80b5a53cd4a1cd0f70965278c8a90c9c10815928f4aa18d7",
  "ak-tf805-standard":
    "9cee2c2a6a3785eddfcf366b9ca9ce960548bb9ff39131fe42cc586f2ab984dc"
});

function sha256(bytes: Uint8Array): string {
  return crypto.createHash("sha256").update(bytes).digest("hex");
}

function requirementFor(
  documentId: AlaskaAcroformDocumentId
): AlaskaSourceRequirement {
  const requirement = ALASKA_ACROFORM_SOURCE_REQUIREMENTS.find(
    (candidate) => candidate.documentId === documentId
  );
  if (!requirement) {
    throw new AlaskaAcroformError(
      "unsupported_document",
      `No Alaska AcroForm assignment exists for ${documentId}.`,
      { documentId }
    );
  }
  return requirement;
}

function inventoryFor(
  documentId: AlaskaAcroformDocumentId
): readonly AlaskaAcroformFieldInventory[] {
  return ALASKA_ACROFORM_FIELD_INVENTORIES[documentId];
}

function resolveMaterializedSource(
  materializationRoot: string,
  destination: string
): string {
  if (!materializationRoot.trim()) {
    throw new AlaskaAcroformError(
      "source_root_required",
      "A portable source-materialization root is required."
    );
  }
  const root = path.resolve(materializationRoot);
  const absolutePath = path.resolve(root, destination);
  if (
    absolutePath === root ||
    !absolutePath.startsWith(`${root}${path.sep}`)
  ) {
    throw new AlaskaAcroformError(
      "source_path_escape",
      "The assigned Alaska source destination escapes the materialization root.",
      { destination }
    );
  }
  if (!fs.existsSync(absolutePath)) {
    throw new AlaskaAcroformError(
      "source_missing",
      "The exact assigned Alaska source is not materialized.",
      { destination }
    );
  }
  const stat = fs.lstatSync(absolutePath);
  if (
    !stat.isFile() ||
    stat.isSymbolicLink() ||
    (stat.mode & 0o222) !== 0
  ) {
    throw new AlaskaAcroformError(
      "source_not_read_only",
      "The assigned Alaska source must be a regular read-only file.",
      { destination, mode: stat.mode & 0o777 }
    );
  }
  const realRoot = fs.realpathSync(root);
  const realSource = fs.realpathSync(absolutePath);
  if (!realSource.startsWith(`${realRoot}${path.sep}`)) {
    throw new AlaskaAcroformError(
      "source_path_escape",
      "The assigned Alaska source resolves outside the materialization root.",
      { destination }
    );
  }
  return absolutePath;
}

function fieldType(field: PDFField): AlaskaAcroformFieldType | null {
  if (field instanceof PDFTextField) return "text";
  if (field instanceof PDFCheckBox) return "checkbox";
  if (field instanceof PDFRadioGroup) return "radio";
  return null;
}

function fieldIsBlank(field: PDFField): boolean {
  if (field instanceof PDFTextField) {
    return (field.getText() ?? "").trim() === "";
  }
  if (field instanceof PDFCheckBox) return !field.isChecked();
  if (field instanceof PDFRadioGroup) {
    return (field.getSelected() ?? "").trim() === "";
  }
  return false;
}

function assertApproximate(
  actual: number,
  expected: number,
  label: string
): void {
  if (Math.abs(actual - expected) > RECT_TOLERANCE) {
    throw new AlaskaAcroformError(
      "source_structure_mismatch",
      `${label} differs from the receipt-backed field inventory.`,
      { expected, actual }
    );
  }
}

function assertExactInventory(
  doc: PDFDocument,
  documentId: AlaskaAcroformDocumentId,
  requireBlankSource: boolean
): void {
  const inventory = inventoryFor(documentId);
  const fields = doc.getForm().getFields();
  const expectedNames = inventory.map((field) => field.name).sort();
  const actualNames = fields.map((field) => field.getName()).sort();
  if (
    expectedNames.length !== actualNames.length ||
    expectedNames.some((name, index) => name !== actualNames[index])
  ) {
    throw new AlaskaAcroformError(
      "source_structure_mismatch",
      `${documentId} has a different AcroForm field inventory.`,
      { expectedNames, actualNames }
    );
  }

  for (const expected of inventory) {
    const field = doc.getForm().getField(expected.name);
    if (fieldType(field) !== expected.type) {
      throw new AlaskaAcroformError(
        "field_type_mismatch",
        `${documentId}:${expected.name} has a different field type.`,
        { expected: expected.type, actual: field.constructor.name }
      );
    }
    const widgets = field.acroField.getWidgets();
    if (widgets.length !== expected.widgets.length) {
      throw new AlaskaAcroformError(
        "source_structure_mismatch",
        `${documentId}:${expected.name} has a different widget count.`,
        { expected: expected.widgets.length, actual: widgets.length }
      );
    }
    const actualRectangles = widgets
      .map((sourceWidget) => sourceWidget.getRectangle())
      .sort((left, right) => left.y - right.y || left.x - right.x);
    const declaredRectangles = expected.widgets
      .map((declared) => ({
        x: declared.x,
        y: declared.y,
        width: declared.width,
        height: declared.height
      }))
      .sort((left, right) => left.y - right.y || left.x - right.x);
    actualRectangles.forEach((actual, index) => {
      const declared = declaredRectangles[index];
      assertApproximate(
        actual.x,
        declared.x,
        `${documentId}:${expected.name}:widget${index + 1}:x`
      );
      assertApproximate(
        actual.y,
        declared.y,
        `${documentId}:${expected.name}:widget${index + 1}:y`
      );
      assertApproximate(
        actual.width,
        declared.width,
        `${documentId}:${expected.name}:widget${index + 1}:width`
      );
      assertApproximate(
        actual.height,
        declared.height,
        `${documentId}:${expected.name}:widget${index + 1}:height`
      );
    });
    if (requireBlankSource && !fieldIsBlank(field)) {
      throw new AlaskaAcroformError(
        "source_structure_mismatch",
        `${documentId}:${expected.name} is not blank in the controlling source.`,
        { fieldName: expected.name }
      );
    }
  }
}

export async function verifyAlaskaAcroformSource(input: {
  materializationRoot: string;
  documentId: AlaskaAcroformDocumentId;
}): Promise<AlaskaVerifiedSource> {
  const requirement = requirementFor(input.documentId);
  const absolutePath = resolveMaterializedSource(
    input.materializationRoot,
    requirement.materializationDestination
  );
  const bytes = new Uint8Array(fs.readFileSync(absolutePath));
  if (bytes.byteLength !== requirement.expectedBytes) {
    throw new AlaskaAcroformError(
      "source_size_mismatch",
      "The Alaska source byte count differs from its exact assignment.",
      {
        documentId: input.documentId,
        expected: requirement.expectedBytes,
        actual: bytes.byteLength
      }
    );
  }
  const actualSha256 = sha256(bytes);
  if (actualSha256 !== requirement.expectedSha256) {
    throw new AlaskaAcroformError(
      "source_hash_mismatch",
      "The Alaska source hash differs from its exact assignment.",
      {
        documentId: input.documentId,
        expected: requirement.expectedSha256,
        actual: actualSha256
      }
    );
  }
  if (Buffer.from(bytes.subarray(0, 5)).toString("ascii") !== "%PDF-") {
    throw new AlaskaAcroformError(
      "source_media_type_mismatch",
      "The assigned Alaska source is not a PDF.",
      { documentId: input.documentId }
    );
  }
  const latin = Buffer.from(bytes).toString("latin1");
  if (/\/Encrypt\b/u.test(latin) || /\/XFA\b/u.test(latin)) {
    throw new AlaskaAcroformError(
      "source_structure_mismatch",
      "The assigned Alaska source is encrypted or XFA.",
      {
        documentId: input.documentId,
        encrypted: /\/Encrypt\b/u.test(latin),
        xfa: /\/XFA\b/u.test(latin)
      }
    );
  }

  let doc: PDFDocument;
  try {
    doc = await PDFDocument.load(bytes, LOAD_OPTIONS);
  } catch (error) {
    throw new AlaskaAcroformError(
      "source_unreadable",
      "The assigned Alaska source cannot be parsed.",
      {
        documentId: input.documentId,
        reason: String((error as Error)?.message ?? "").slice(0, 160)
      }
    );
  }
  if (doc.getPageCount() !== requirement.expectedPageCount) {
    throw new AlaskaAcroformError(
      "source_structure_mismatch",
      "The Alaska source page count differs from its assignment.",
      {
        documentId: input.documentId,
        expected: requirement.expectedPageCount,
        actual: doc.getPageCount()
      }
    );
  }
  assertExactInventory(doc, input.documentId, true);
  return {
    requirement,
    absolutePath,
    bytes,
    sha256: actualSha256,
    pageCount: doc.getPageCount(),
    fieldNames: Object.freeze(
      doc
        .getForm()
        .getFields()
        .map((field) => field.getName())
    )
  };
}

function isSupplied(value: unknown): boolean {
  return value !== undefined && value !== null && String(value).trim() !== "";
}

function requiredText(
  facts: Readonly<Record<string, unknown>>,
  inputKey: string,
  documentId: AlaskaAcroformDocumentId
): string {
  const value = facts[inputKey];
  if (!isSupplied(value)) {
    throw new AlaskaAcroformError(
      "missing_required_input",
      `The normalized participant input ${inputKey} is required for ${documentId}.`,
      { documentId, inputKey }
    );
  }
  return String(value).trim();
}

function caseNumberFromCombinedInput(value: string): string {
  const separator = value.indexOf(",");
  if (separator <= 0 || separator === value.length - 1) {
    throw new AlaskaAcroformError(
      "invalid_case_number_and_court",
      "caseNumberAndCourt must contain a case number followed by a comma and the participant-supplied court.",
      { inputKey: "caseNumberAndCourt" }
    );
  }
  const caseNumber = value.slice(0, separator).trim();
  const court = value.slice(separator + 1).trim();
  if (!caseNumber || !court) {
    throw new AlaskaAcroformError(
      "invalid_case_number_and_court",
      "caseNumberAndCourt must contain both values.",
      { inputKey: "caseNumberAndCourt" }
    );
  }
  return caseNumber;
}

function mappedValue(
  mapping: TextMapping,
  facts: Readonly<Record<string, unknown>>,
  documentId: AlaskaAcroformDocumentId
): string {
  const value = requiredText(facts, mapping.inputKey, documentId);
  return mapping.transform === "case_number_before_first_comma"
    ? caseNumberFromCombinedInput(value)
    : value;
}

function assertNoProtectedInputs(
  facts: Readonly<Record<string, unknown>>
): void {
  const protectedKeys = [
    "signature",
    "signature0",
    "dateSigned",
    "notary",
    "notarySignature",
    "judge",
    "judgeSignature",
    "judicialDecision",
    "courtDecision",
    "clerk",
    "clerkInitials",
    "agencyResponse",
    "prosecutorApproval",
    "serviceCompleted"
  ];
  const supplied = protectedKeys.filter((key) => isSupplied(facts[key]));
  if (supplied.length > 0) {
    throw new AlaskaAcroformError(
      "protected_input",
      "The Alaska technical renderer does not accept signatures, execution facts, or outside-party completion.",
      { supplied }
    );
  }
}

function wrapLineCount(
  value: string,
  font: PDFFont,
  size: number,
  maxWidth: number
): number {
  const paragraphs = value.replace(/\r\n?/gu, "\n").split("\n");
  let lineCount = 0;
  for (const paragraph of paragraphs) {
    const words = paragraph.trim().split(/\s+/u).filter(Boolean);
    if (words.length === 0) {
      lineCount += 1;
      continue;
    }
    let line = "";
    for (const word of words) {
      if (font.widthOfTextAtSize(word, size) > maxWidth) return Infinity;
      const candidate = line ? `${line} ${word}` : word;
      if (font.widthOfTextAtSize(candidate, size) <= maxWidth) {
        line = candidate;
      } else {
        lineCount += 1;
        line = word;
      }
    }
    lineCount += 1;
  }
  return lineCount;
}

function assertTextFits(
  field: PDFTextField,
  inventory: AlaskaAcroformFieldInventory,
  value: string,
  font: PDFFont,
  documentId: AlaskaAcroformDocumentId
): void {
  const minWidth = Math.min(...inventory.widgets.map((entry) => entry.width));
  const minHeight = Math.min(...inventory.widgets.map((entry) => entry.height));
  const availableWidth = minWidth - FIELD_HORIZONTAL_PADDING;
  if (inventory.multiline) {
    const maxLines = Math.max(
      1,
      Math.floor(
        (minHeight - FIELD_VERTICAL_PADDING) / MULTILINE_LINE_HEIGHT
      )
    );
    const actualLines = wrapLineCount(
      value,
      font,
      FIELD_FONT_SIZE,
      availableWidth
    );
    if (actualLines > maxLines) {
      throw new AlaskaAcroformError(
        "content_overflow",
        "Participant text does not fit legibly in the controlling Alaska field.",
        {
          documentId,
          fieldName: inventory.name,
          maxLines,
          actualLines,
          fontSize: FIELD_FONT_SIZE
        }
      );
    }
  } else {
    const requiredWidth = font.widthOfTextAtSize(value, FIELD_FONT_SIZE);
    if (requiredWidth > availableWidth) {
      throw new AlaskaAcroformError(
        "content_overflow",
        "Participant text does not fit legibly in the controlling Alaska field.",
        {
          documentId,
          fieldName: inventory.name,
          availableWidth: Number(availableWidth.toFixed(2)),
          requiredWidth: Number(requiredWidth.toFixed(2)),
          fontSize: FIELD_FONT_SIZE
        }
      );
    }
  }
  const maxLength = field.getMaxLength();
  if (
    typeof maxLength === "number" &&
    maxLength > 0 &&
    value.length > maxLength
  ) {
    throw new AlaskaAcroformError(
      "content_overflow",
      "Participant text exceeds the controlling Alaska field's maximum length.",
      {
        documentId,
        fieldName: inventory.name,
        maxLength,
        actualLength: value.length
      }
    );
  }
}

function assertOnlyMappedFieldsWritten(
  doc: PDFDocument,
  documentId: AlaskaAcroformDocumentId,
  expectedValues: ReadonlyMap<string, string>
): void {
  for (const inventory of inventoryFor(documentId)) {
    const field = doc.getForm().getField(inventory.name);
    const expected = expectedValues.get(inventory.name);
    if (expected !== undefined) {
      if (
        !(field instanceof PDFTextField) ||
        (field.getText() ?? "") !== expected
      ) {
        throw new AlaskaAcroformError(
          "protected_field_modified",
          `${documentId}:${inventory.name} did not preserve its mapped value.`,
          { fieldName: inventory.name }
        );
      }
      continue;
    }
    if (!fieldIsBlank(field)) {
      throw new AlaskaAcroformError(
        "protected_field_modified",
        `${documentId}:${inventory.name} must remain blank for manual or outside-party completion.`,
        { fieldName: inventory.name, ownership: inventory.ownership }
      );
    }
  }
}

export async function renderAlaskaAcroformDocument(input: {
  materializationRoot: string;
  documentId: AlaskaAcroformDocumentId;
  facts: Readonly<Record<string, unknown>>;
}): Promise<AlaskaRenderedPhysicalDocument> {
  assertNoProtectedInputs(input.facts);
  const source = await verifyAlaskaAcroformSource({
    materializationRoot: input.materializationRoot,
    documentId: input.documentId
  });
  const doc = await PDFDocument.load(source.bytes, LOAD_OPTIONS);
  const form = doc.getForm();
  const font = await doc.embedFont(StandardFonts.TimesRoman);
  const expectedValues = new Map<string, string>();

  for (const mapping of ALASKA_ACROFORM_TEXT_MAPPINGS[input.documentId]) {
    let field: PDFField;
    try {
      field = form.getField(mapping.fieldName);
    } catch {
      throw new AlaskaAcroformError(
        "field_not_found",
        `${input.documentId}:${mapping.fieldName} is absent from the assigned source.`,
        { documentId: input.documentId, fieldName: mapping.fieldName }
      );
    }
    if (!(field instanceof PDFTextField)) {
      throw new AlaskaAcroformError(
        "field_type_mismatch",
        `${input.documentId}:${mapping.fieldName} is not a text field.`,
        { documentId: input.documentId, fieldName: mapping.fieldName }
      );
    }
    const value = mappedValue(mapping, input.facts, input.documentId);
    const inventory = inventoryFor(input.documentId).find(
      (candidate) => candidate.name === mapping.fieldName
    );
    if (!inventory) {
      throw new AlaskaAcroformError(
        "field_not_found",
        `${input.documentId}:${mapping.fieldName} is absent from the declared inventory.`,
        { documentId: input.documentId, fieldName: mapping.fieldName }
      );
    }
    assertTextFits(field, inventory, value, font, input.documentId);
    if (inventory.multiline) field.enableMultiline();
    field.setFontSize(FIELD_FONT_SIZE);
    field.setText(value);
    expectedValues.set(mapping.fieldName, value);
  }

  assertOnlyMappedFieldsWritten(doc, input.documentId, expectedValues);
  form.updateFieldAppearances(font);
  doc.setModificationDate(DETERMINISTIC_TIMESTAMP);
  doc.setProducer("LegalEase technical fixture");
  const bytes = await doc.save({
    addDefaultPage: false,
    updateFieldAppearances: false
  });

  const reopened = await PDFDocument.load(bytes, LOAD_OPTIONS);
  if (reopened.getPageCount() !== source.requirement.expectedPageCount) {
    throw new AlaskaAcroformError(
      "source_structure_mismatch",
      "The rendered Alaska document changed the official page count.",
      {
        documentId: input.documentId,
        expected: source.requirement.expectedPageCount,
        actual: reopened.getPageCount()
      }
    );
  }
  assertExactInventory(reopened, input.documentId, false);
  assertOnlyMappedFieldsWritten(reopened, input.documentId, expectedValues);

  const manualFieldNames = inventoryFor(input.documentId)
    .filter((field) => !expectedValues.has(field.name))
    .map((field) => field.name);
  return {
    documentId: input.documentId,
    logicalComponentIds: source.requirement.componentIds,
    physicalCopyCount: 1,
    bytes,
    sha256: sha256(bytes),
    sourceSha256: source.sha256,
    sourceIdentityKey: source.requirement.sourceIdentityKey,
    pageCount: reopened.getPageCount(),
    mappedFieldNames: Object.freeze([...expectedValues.keys()]),
    manualFieldNames: Object.freeze(manualFieldNames)
  };
}

export async function renderAlaskaAcroformTrack(input: {
  materializationRoot: string;
  trackId: AlaskaAcroformTrackId;
  facts: Readonly<Record<string, unknown>>;
}): Promise<AlaskaTrackRenderResult> {
  if (!ALASKA_ACROFORM_TRACK_IDS.includes(input.trackId)) {
    throw new AlaskaAcroformError(
      "unsupported_track",
      `The Alaska AcroForm assignment does not include ${input.trackId}.`,
      { trackId: input.trackId }
    );
  }
  assertNoProtectedInputs(input.facts);

  if (input.trackId === "ak-courtview") {
    if (typeof input.facts.stillOnCourtView !== "boolean") {
      throw new AlaskaAcroformError(
        "missing_required_input",
        "stillOnCourtView is required for the assigned conditional TF-810 component.",
        { trackId: input.trackId, inputKey: "stillOnCourtView" }
      );
    }
    if (input.facts.stillOnCourtView === false) {
      return {
        trackId: input.trackId,
        physicalDocuments: Object.freeze([]),
        logicalComponentOrder: Object.freeze([]),
        noFilingRequired: true,
        runtimeDisabled: true,
        packetReady: false,
        counselAdopted: false,
        releaseActive: false,
        technicalFixtureOnly: true
      };
    }
  }

  const documentId: AlaskaAcroformDocumentId =
    input.trackId === "ak-tf800"
      ? "TF-800"
      : input.trackId === "ak-tf805"
        ? "TF-805"
        : "TF-810";
  const document = await renderAlaskaAcroformDocument({
    materializationRoot: input.materializationRoot,
    documentId,
    facts: input.facts
  });

  return {
    trackId: input.trackId,
    physicalDocuments: Object.freeze([document]),
    logicalComponentOrder: Object.freeze([...document.logicalComponentIds]),
    noFilingRequired: false,
    runtimeDisabled: true,
    packetReady: false,
    counselAdopted: false,
    releaseActive: false,
    technicalFixtureOnly: true
  };
}
