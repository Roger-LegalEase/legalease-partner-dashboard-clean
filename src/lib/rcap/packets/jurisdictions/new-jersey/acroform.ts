import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

import {
  PDFButton,
  PDFCheckBox,
  PDFDocument,
  PDFDropdown,
  PDFName,
  PDFTextField,
  StandardFonts,
  type PDFFont,
  type PDFField
} from "pdf-lib";

const LOAD_OPTIONS = { updateMetadata: false } as const;
const DETERMINISTIC_TIMESTAMP = new Date(Date.UTC(2000, 0, 1, 0, 0, 0));
const FIELD_FONT_SIZE_LADDER = [9, 8, 7] as const;
const FIELD_HORIZONTAL_PADDING = 4;
const RECT_TOLERANCE = 0.02;
const EXPECTED_PAGE_WIDTH = 612;
const EXPECTED_PAGE_HEIGHT = 792;
const EXPECTED_PAGE_ROTATION = 0;

export const NEW_JERSEY_ACROFORM_JOB_ID = "rcap-nj-acroform-fill" as const;
export const NEW_JERSEY_ACROFORM_RUNTIME_DISABLED = true as const;
export const NEW_JERSEY_ACROFORM_PACKET_READY = false as const;
export const NEW_JERSEY_ACROFORM_COUNSEL_ADOPTED = false as const;
export const NEW_JERSEY_ACROFORM_RELEASE_ACTIVE = false as const;
export const NEW_JERSEY_ACROFORM_REVIEW_READY = false as const;

export const NEW_JERSEY_ACROFORM_TRACK_IDS = [
  "nj_arrest_no_conviction",
  "nj_clean_slate",
  "nj_disorderly_persons",
  "nj_indictable_conviction",
  "nj_ordinance"
] as const;

export type NewJerseyAcroformTrackId =
  (typeof NEW_JERSEY_ACROFORM_TRACK_IDS)[number];

export type NewJerseyComponentRole =
  | "primary_filing"
  | "statements_accompanying_petition"
  | "order_for_hearing"
  | "proposed_order";

/**
 * CN-10557 is a single 43-page Judiciary kit. All four official-PDF components
 * that the assignment owns resolve to the same document, and the packet-set
 * manifest directs no extraction, no reordering and no page range. The kit is
 * therefore rendered whole, in its authored page order, and the four logical
 * components are carried as an ordered mapping onto that one physical document.
 */
export const NEW_JERSEY_ACROFORM_COMPONENT_ROLE_ORDER: readonly NewJerseyComponentRole[] =
  Object.freeze([
    "primary_filing",
    "statements_accompanying_petition",
    "order_for_hearing",
    "proposed_order"
  ]);

export const NEW_JERSEY_ACROFORM_COMPONENT_IDS_BY_TRACK = Object.freeze({
  nj_arrest_no_conviction: Object.freeze([
    "nj_arrest_no_conviction-primary-filing-1",
    "nj_arrest_no_conviction-statements-accompanying-petition-2",
    "nj_arrest_no_conviction-order-for-hearing-3",
    "nj_arrest_no_conviction-proposed-order-4"
  ]),
  nj_clean_slate: Object.freeze([
    "nj_clean_slate-primary-filing-1",
    "nj_clean_slate-statements-accompanying-petition-2",
    "nj_clean_slate-order-for-hearing-3",
    "nj_clean_slate-proposed-order-4"
  ]),
  nj_disorderly_persons: Object.freeze([
    "nj_disorderly_persons-primary-filing-1",
    "nj_disorderly_persons-statements-accompanying-petition-2",
    "nj_disorderly_persons-order-for-hearing-3",
    "nj_disorderly_persons-proposed-order-4"
  ]),
  nj_indictable_conviction: Object.freeze([
    "nj_indictable_conviction-primary-filing-1",
    "nj_indictable_conviction-statements-accompanying-petition-2",
    "nj_indictable_conviction-order-for-hearing-3",
    "nj_indictable_conviction-proposed-order-4"
  ]),
  nj_ordinance: Object.freeze([
    "nj_ordinance-primary-filing-1",
    "nj_ordinance-statements-accompanying-petition-2",
    "nj_ordinance-order-for-hearing-3",
    "nj_ordinance-proposed-order-4"
  ])
}) as Readonly<Record<NewJerseyAcroformTrackId, readonly string[]>>;

export const NEW_JERSEY_ACROFORM_COMPONENT_IDS: readonly string[] =
  Object.freeze(
    NEW_JERSEY_ACROFORM_TRACK_IDS.flatMap(
      (trackId) => NEW_JERSEY_ACROFORM_COMPONENT_IDS_BY_TRACK[trackId]
    )
  );

/**
 * The kit's authored page layout. Instruction pages carry no fields and are
 * preserved exactly; no page is removed to shorten the packet.
 */
export const NEW_JERSEY_ACROFORM_COMPONENT_PAGE_MAP = Object.freeze({
  primary_filing: Object.freeze({
    documentSection: "Petition for Expungement (Form A), CN 10171",
    pages: Object.freeze([18, 19, 20, 21, 22, 23])
  }),
  statements_accompanying_petition: Object.freeze({
    documentSection: "Verification (Form A - Continued), CN 10171",
    pages: Object.freeze([24])
  }),
  order_for_hearing: Object.freeze({
    documentSection: "Order for Hearing (Form B)",
    pages: Object.freeze([27])
  }),
  proposed_order: Object.freeze({
    documentSection: "Expungement Order (Form C), CN 10173",
    pages: Object.freeze([30, 31, 32, 33])
  })
});

export const NEW_JERSEY_ACROFORM_INSTRUCTION_PAGES: readonly number[] =
  Object.freeze([
    1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 25, 26, 28, 29,
    34, 36, 39, 41
  ]);

export const NEW_JERSEY_ACROFORM_UNASSIGNED_COMPONENT_PAGES: readonly number[] =
  Object.freeze([35, 37, 38, 40, 42, 43]);

export type NewJerseyAcroformFieldType =
  | "text"
  | "checkbox"
  | "dropdown"
  | "button";

export type NewJerseyFieldOwnership =
  | "participant_supplied"
  | "derived_deterministically_from_participant_answers"
  | "manual_participant_completion"
  | "outside_party_completion"
  | "court_or_agency_only"
  | "prohibited_from_generation"
  | "intentionally_blank"
  | "not_used_by_assigned_route";

export type NewJerseyAcroformWidget = Readonly<{
  page: number;
  x: number;
  y: number;
  width: number;
  height: number;
}>;

export type NewJerseyAcroformFieldInventory = Readonly<{
  name: string;
  type: NewJerseyAcroformFieldType;
  widgets: readonly NewJerseyAcroformWidget[];
  options: readonly string[];
  multiline: boolean;
  ownership: NewJerseyFieldOwnership;
  inputKey: string | null;
  deterministicSource: string | null;
  treatment: string;
}>;

export type NewJerseySourceRequirement = Readonly<{
  sourceIdentityKey: "rcap-nj-cn-10557-814e1397cd";
  documentId: "CN-10557";
  documentRole: "PACKET";
  officialTitle: "CN 10557 New Jersey Expungement Kit";
  revision: "REV-2020-06";
  expectedSha256: string;
  expectedBytes: 1924831;
  expectedMediaType: "application/pdf";
  expectedPageCount: 43;
  expectedTotalAcroformFieldCount: 179;
  expectedCompletionFieldCount: 177;
  expectedActionButtonCount: 2;
  structuralClass: "clean_acroform";
  encrypted: false;
  xfa: false;
  materializationDestination: string;
}>;

export const NEW_JERSEY_ACROFORM_SOURCE_REQUIREMENT: NewJerseySourceRequirement =
  Object.freeze({
    sourceIdentityKey: "rcap-nj-cn-10557-814e1397cd",
    documentId: "CN-10557",
    documentRole: "PACKET",
    officialTitle: "CN 10557 New Jersey Expungement Kit",
    revision: "REV-2020-06",
    expectedSha256:
      "c1dd37b5e27bd76ea2330b07f51847c420d359db8f10c0576682e6558d09c5f7",
    expectedBytes: 1924831,
    expectedMediaType: "application/pdf",
    expectedPageCount: 43,
    expectedTotalAcroformFieldCount: 179,
    expectedCompletionFieldCount: 177,
    expectedActionButtonCount: 2,
    structuralClass: "clean_acroform",
    encrypted: false,
    xfa: false,
    materializationDestination:
      "official-pdf/NJ/NJ__FORM__CN-10557__cn-10557-new-jersey-expungement-kit__REV-2020-06__EN.pdf"
  });

/**
 * Field names the kit reuses for semantically distinct blanks. The source PDF
 * is never renamed or restructured; the collision is recorded here, the fields
 * are never written, and the focused verifier asserts both facts.
 */
export const NEW_JERSEY_ACROFORM_AMBIGUOUS_FIELD_NAMES = Object.freeze([
  Object.freeze({
    name: "seek5yrsDetails",
    widgetCount: 3,
    pages: Object.freeze([22, 22, 24]),
    collision:
      "One field carries both compelling-circumstances narratives on Form A - Continued and the name-change explanation in the Verification. Any value would appear in all three blanks.",
    resolution: "never_written"
  }),
  Object.freeze({
    name: "dismissPlea",
    widgetCount: 2,
    pages: Object.freeze([18, 18]),
    collision:
      "A single checkbox field carries the Yes widget and the No widget of one question, so the two answers cannot be set independently.",
    resolution: "never_written"
  }),
  Object.freeze({
    name: "contDismissPlea",
    widgetCount: 2,
    pages: Object.freeze([20, 20]),
    collision:
      "A single checkbox field carries the Yes widget and the No widget of one question, so the two answers cannot be set independently.",
    resolution: "never_written"
  }),
  Object.freeze({
    name: "contDsmissOff2",
    widgetCount: 1,
    pages: Object.freeze([20]),
    collision:
      "The kit misspells the addendum dismissal offence field. The authored name is preserved exactly.",
    resolution: "never_written"
  })
]);

const w = (
  page: number,
  x: number,
  y: number,
  width: number,
  height: number
): NewJerseyAcroformWidget => Object.freeze({ page, x, y, width, height });

export const NEW_JERSEY_ACROFORM_FIELD_INVENTORY: readonly NewJerseyAcroformFieldInventory[] =
  Object.freeze([
  Object.freeze({
    name: "acquit",
    type: "checkbox",
    widgets: Object.freeze([
      w(18, 35.132, 128.949, 18, 18.001)
    ]),
    options: Object.freeze(["Yes"]),
    multiline: false,
    ownership: "manual_participant_completion",
    inputKey: null,
    deterministicSource: null,
    treatment:
      "The normalized New Jersey design collects the matter history as one composite participant answer covering county, court, complaint or indictment number, docket number, arrest date, offence, statute and disposition. It does not resolve that answer into this form's separate per-paragraph blanks, and choosing the paragraph that describes a disposition is a classification of the record. The participant completes it."
  }),
  Object.freeze({
    name: "acquitCrt",
    type: "text",
    widgets: Object.freeze([
      w(18, 193.709, 93.469, 185.635, 17.334)
    ]),
    options: Object.freeze([]),
    multiline: false,
    ownership: "manual_participant_completion",
    inputKey: null,
    deterministicSource: null,
    treatment:
      "The normalized New Jersey design collects the matter history as one composite participant answer covering county, court, complaint or indictment number, docket number, arrest date, offence, statute and disposition. It does not resolve that answer into this form's separate per-paragraph blanks, and choosing the paragraph that describes a disposition is a classification of the record. The participant completes it."
  }),
  Object.freeze({
    name: "acquitDt",
    type: "text",
    widgets: Object.freeze([
      w(18, 131.501, 126.284, 70.688, 17.333)
    ]),
    options: Object.freeze([]),
    multiline: false,
    ownership: "manual_participant_completion",
    inputKey: null,
    deterministicSource: null,
    treatment:
      "The normalized New Jersey design collects the matter history as one composite participant answer covering county, court, complaint or indictment number, docket number, arrest date, offence, statute and disposition. It does not resolve that answer into this form's separate per-paragraph blanks, and choosing the paragraph that describes a disposition is a classification of the record. The participant completes it."
  }),
  Object.freeze({
    name: "acquitOff1",
    type: "text",
    widgets: Object.freeze([
      w(18, 430.398, 129.665, 103.151, 14.956)
    ]),
    options: Object.freeze([]),
    multiline: false,
    ownership: "manual_participant_completion",
    inputKey: null,
    deterministicSource: null,
    treatment:
      "The normalized New Jersey design collects the matter history as one composite participant answer covering county, court, complaint or indictment number, docket number, arrest date, offence, statute and disposition. It does not resolve that answer into this form's separate per-paragraph blanks, and choosing the paragraph that describes a disposition is a classification of the record. The participant completes it."
  }),
  Object.freeze({
    name: "acquitOff2",
    type: "text",
    widgets: Object.freeze([
      w(18, 69.153, 111.552, 463.99, 17.334)
    ]),
    options: Object.freeze([]),
    multiline: false,
    ownership: "manual_participant_completion",
    inputKey: null,
    deterministicSource: null,
    treatment:
      "The normalized New Jersey design collects the matter history as one composite participant answer covering county, court, complaint or indictment number, docket number, arrest date, offence, statute and disposition. It does not resolve that answer into this form's separate per-paragraph blanks, and choosing the paragraph that describes a disposition is a classification of the record. The participant completes it."
  }),
  Object.freeze({
    name: "arrestMuni",
    type: "text",
    widgets: Object.freeze([
      w(18, 143.606, 319.849, 251.464, 17.333)
    ]),
    options: Object.freeze([]),
    multiline: false,
    ownership: "manual_participant_completion",
    inputKey: null,
    deterministicSource: null,
    treatment:
      "The normalized New Jersey design collects the matter history as one composite participant answer covering county, court, complaint or indictment number, docket number, arrest date, offence, statute and disposition. It does not resolve that answer into this form's separate per-paragraph blanks, and choosing the paragraph that describes a disposition is a classification of the record. The participant completes it."
  }),
  Object.freeze({
    name: "arrestOff1",
    type: "text",
    widgets: Object.freeze([
      w(18, 117.164, 373.035, 420.879, 17.334)
    ]),
    options: Object.freeze([]),
    multiline: false,
    ownership: "manual_participant_completion",
    inputKey: null,
    deterministicSource: null,
    treatment:
      "The normalized New Jersey design collects the matter history as one composite participant answer covering county, court, complaint or indictment number, docket number, arrest date, offence, statute and disposition. It does not resolve that answer into this form's separate per-paragraph blanks, and choosing the paragraph that describes a disposition is a classification of the record. The participant completes it."
  }),
  Object.freeze({
    name: "arrestOff2",
    type: "text",
    widgets: Object.freeze([
      w(18, 54.372, 353.613, 476.266, 17.333)
    ]),
    options: Object.freeze([]),
    multiline: false,
    ownership: "manual_participant_completion",
    inputKey: null,
    deterministicSource: null,
    treatment:
      "The normalized New Jersey design collects the matter history as one composite participant answer covering county, court, complaint or indictment number, docket number, arrest date, offence, statute and disposition. It does not resolve that answer into this form's separate per-paragraph blanks, and choosing the paragraph that describes a disposition is a classification of the record. The participant completes it."
  }),
  Object.freeze({
    name: "arrestStatute",
    type: "text",
    widgets: Object.freeze([
      w(18, 257.594, 337.508, 200.415, 17.334)
    ]),
    options: Object.freeze([]),
    multiline: false,
    ownership: "manual_participant_completion",
    inputKey: null,
    deterministicSource: null,
    treatment:
      "The normalized New Jersey design collects the matter history as one composite participant answer covering county, court, complaint or indictment number, docket number, arrest date, offence, statute and disposition. It does not resolve that answer into this form's separate per-paragraph blanks, and choosing the paragraph that describes a disposition is a classification of the record. The participant completes it."
  }),
  Object.freeze({
    name: "DefAddr2",
    type: "text",
    widgets: Object.freeze([
      w(18, 70.982, 677.053, 264.088, 17.335),
      w(27, 70.816, 671.413, 248.402, 15.24),
      w(30, 73.18, 662.404, 245.654, 15.24),
      w(35, 309.037, 225.472, 230.567, 15.24),
      w(38, 281.811, 493.499, 283.602, 15.24),
      w(40, 86.152, 656.773, 252.91, 15.24),
      w(43, 306.185, 507.568, 238.077, 15.24)
    ]),
    options: Object.freeze([]),
    multiline: false,
    ownership: "participant_supplied",
    inputKey: "mailingAddressCity",
    deterministicSource: null,
    treatment:
      "The participant's city in the shared caption block; the single field carries seven widgets and repeats verbatim."
  }),
  Object.freeze({
    name: "DefAddr3",
    type: "text",
    widgets: Object.freeze([
      w(18, 125.275, 658.85, 209.969, 17.263),
      w(27, 128.885, 651.594, 188.549, 15.24),
      w(30, 129.543, 642.65, 190.273, 15.24),
      w(35, 309.433, 192.969, 230.567, 15.24),
      w(38, 282.75, 461.115, 281.724, 15.24),
      w(40, 145.33, 639.834, 192.836, 15.24),
      w(43, 307.124, 474.245, 238.546, 15.241)
    ]),
    options: Object.freeze([]),
    multiline: false,
    ownership: "derived_deterministically_from_participant_answers",
    inputKey: "mailingAddressStateZip",
    deterministicSource: "mailingAddressState and mailingAddressZip joined by a single space, because the caption block exposes one combined state-and-zip blank.",
    treatment:
      "The combined state and zip caption value; the single field carries seven widgets and repeats verbatim."
  }),
  Object.freeze({
    name: "DefAddrCity",
    type: "text",
    widgets: Object.freeze([
      w(18, 72.144, 411.53, 188.614, 17.333)
    ]),
    options: Object.freeze([]),
    multiline: false,
    ownership: "derived_deterministically_from_participant_answers",
    inputKey: "mailingAddressCity",
    deterministicSource: "Exact copy of mailingAddressCity already written to the caption block.",
    treatment:
      "The residence sentence on Form A page 1 repeats the same city the caption states."
  }),
  Object.freeze({
    name: "DefAddrSt",
    type: "text",
    widgets: Object.freeze([
      w(18, 303.128, 410.736, 62.071, 17.334)
    ]),
    options: Object.freeze([]),
    multiline: false,
    ownership: "participant_supplied",
    inputKey: "mailingAddressState",
    deterministicSource: null,
    treatment:
      "The residence sentence exposes state as its own blank and takes the participant answer verbatim."
  }),
  Object.freeze({
    name: "DefAddrStr",
    type: "text",
    widgets: Object.freeze([
      w(18, 117.003, 693.698, 217.346, 18.128),
      w(27, 119.908, 690.835, 199.765, 15.24),
      w(30, 121.301, 682.116, 197.284, 15.24),
      w(35, 310.486, 259.077, 231.001, 15.24),
      w(38, 282.207, 527.083, 282.628, 15.24),
      w(40, 133.742, 675.546, 205.133, 15.24),
      w(43, 305.716, 540.883, 238.041, 15.24)
    ]),
    options: Object.freeze([]),
    multiline: false,
    ownership: "participant_supplied",
    inputKey: "mailingAddressStreet",
    deterministicSource: null,
    treatment:
      "The participant's street address in the shared caption block; the single field carries seven widgets and repeats verbatim."
  }),
  Object.freeze({
    name: "DefAddrStr2",
    type: "text",
    widgets: Object.freeze([
      w(18, 126.135, 431.372, 409.442, 17.333)
    ]),
    options: Object.freeze([]),
    multiline: false,
    ownership: "derived_deterministically_from_participant_answers",
    inputKey: "mailingAddressStreet",
    deterministicSource: "Exact copy of mailingAddressStreet already written to the caption block.",
    treatment:
      "The residence sentence on Form A page 1 repeats the same street address the caption states."
  }),
  Object.freeze({
    name: "DefAddrZip",
    type: "text",
    widgets: Object.freeze([
      w(18, 436.241, 411.529, 65.723, 15.75)
    ]),
    options: Object.freeze([]),
    multiline: false,
    ownership: "participant_supplied",
    inputKey: "mailingAddressZip",
    deterministicSource: null,
    treatment:
      "The residence sentence exposes zip code as its own blank and takes the participant answer verbatim."
  }),
  Object.freeze({
    name: "DefBirthDt",
    type: "text",
    widgets: Object.freeze([
      w(18, 119.048, 590.821, 88.348, 13.768),
      w(30, 120.983, 267.367, 79.071, 15.24)
    ]),
    options: Object.freeze([]),
    multiline: false,
    ownership: "participant_supplied",
    inputKey: "dateOfBirth",
    deterministicSource: null,
    treatment:
      "The participant's date of birth. Form C's own instruction 6 directs the filer to print date of birth on the proposed order, and the shared field carries both widgets."
  }),
  Object.freeze({
    name: "DefName",
    type: "text",
    widgets: Object.freeze([
      w(18, 117.326, 448.107, 333.238, 17.333),
      w(18, 55.137, 506.056, 266.235, 17.334),
      w(18, 106.151, 711.704, 228.918, 17.583),
      w(23, 344.853, 597.763, 208.232, 15.24),
      w(24, 115.597, 264.054, 209.039, 15.24),
      w(24, 146.483, 690.428, 243.551, 15.24),
      w(27, 108.828, 487.991, 255.434, 15.24),
      w(27, 58.395, 544.796, 240.872, 15.24),
      w(27, 107.63, 710.81, 212.969, 15.24),
      w(30, 147.936, 284.247, 247.579, 15.24),
      w(30, 57.02, 535.87, 237.137, 15.24),
      w(30, 108.436, 702.383, 211.609, 15.24),
      w(31, 143.417, 489.163, 366.152, 15.24),
      w(35, 308.504, 293.822, 232.304, 15.24),
      w(35, 176.784, 545.169, 361.883, 15.24),
      w(38, 283.688, 560.65, 279.237, 15.24),
      w(40, 71.036, 549.421, 251.078, 15.24),
      w(40, 121.94, 695.693, 218.29, 15.24),
      w(43, 306.185, 574.574, 239.344, 15.24),
      w(43, 62.836, 711.837, 253.687, 15.24)
    ]),
    options: Object.freeze([]),
    multiline: false,
    ownership: "participant_supplied",
    inputKey: "petitionerFullLegalName",
    deterministicSource: null,
    treatment:
      "The participant's full legal name. One AcroForm field carries twenty widgets, so the established answer is written once and repeats verbatim in every caption, case-title and printed-name position across Forms A, B and C and the kit's cover letters. No signature is created."
  }),
  Object.freeze({
    name: "DefPhone",
    type: "text",
    widgets: Object.freeze([
      w(18, 176.418, 641.588, 159.34, 16.542)
    ]),
    options: Object.freeze([]),
    multiline: false,
    ownership: "participant_supplied",
    inputKey: "contactPhone",
    deterministicSource: null,
    treatment:
      "The optional caption telephone number is copied verbatim and omitted when the participant supplies none."
  }),
  Object.freeze({
    name: "DefSbiNum",
    type: "text",
    widgets: Object.freeze([
      w(18, 106.817, 607.637, 165.111, 16.033),
      w(30, 303.834, 251.969, 102.183, 15.24)
    ]),
    options: Object.freeze([]),
    multiline: false,
    ownership: "participant_supplied",
    inputKey: "sbiNumber",
    deterministicSource: null,
    treatment:
      "The State Bureau of Identification number is conditional in the normalized design and in the form face, which reads 'if available'. It is omitted when the participant supplies none."
  }),
  Object.freeze({
    name: "dismiss",
    type: "checkbox",
    widgets: Object.freeze([
      w(18, 33.793, 214.365, 18, 18)
    ]),
    options: Object.freeze(["Yes"]),
    multiline: false,
    ownership: "manual_participant_completion",
    inputKey: null,
    deterministicSource: null,
    treatment:
      "The normalized New Jersey design collects the matter history as one composite participant answer covering county, court, complaint or indictment number, docket number, arrest date, offence, statute and disposition. It does not resolve that answer into this form's separate per-paragraph blanks, and choosing the paragraph that describes a disposition is a classification of the record. The participant completes it."
  }),
  Object.freeze({
    name: "dismissCrt",
    type: "text",
    widgets: Object.freeze([
      w(18, 315.144, 179.395, 135.691, 17.333),
      w(19, 314.515, 674.833, 157.618, 13.769)
    ]),
    options: Object.freeze([]),
    multiline: false,
    ownership: "manual_participant_completion",
    inputKey: null,
    deterministicSource: null,
    treatment:
      "The normalized New Jersey design collects the matter history as one composite participant answer covering county, court, complaint or indictment number, docket number, arrest date, offence, statute and disposition. It does not resolve that answer into this form's separate per-paragraph blanks, and choosing the paragraph that describes a disposition is a classification of the record. The participant completes it."
  }),
  Object.freeze({
    name: "dismissDt",
    type: "text",
    widgets: Object.freeze([
      w(18, 130.368, 211.711, 73.61, 17.333)
    ]),
    options: Object.freeze([]),
    multiline: false,
    ownership: "manual_participant_completion",
    inputKey: null,
    deterministicSource: null,
    treatment:
      "The normalized New Jersey design collects the matter history as one composite participant answer covering county, court, complaint or indictment number, docket number, arrest date, offence, statute and disposition. It does not resolve that answer into this form's separate per-paragraph blanks, and choosing the paragraph that describes a disposition is a classification of the record. The participant completes it."
  }),
  Object.freeze({
    name: "dismissOff1",
    type: "text",
    widgets: Object.freeze([
      w(18, 416.995, 214.587, 121.012, 17.333)
    ]),
    options: Object.freeze([]),
    multiline: false,
    ownership: "manual_participant_completion",
    inputKey: null,
    deterministicSource: null,
    treatment:
      "The normalized New Jersey design collects the matter history as one composite participant answer covering county, court, complaint or indictment number, docket number, arrest date, offence, statute and disposition. It does not resolve that answer into this form's separate per-paragraph blanks, and choosing the paragraph that describes a disposition is a classification of the record. The participant completes it."
  }),
  Object.freeze({
    name: "dismissOff2",
    type: "text",
    widgets: Object.freeze([
      w(18, 69.365, 196.357, 468.747, 17.333)
    ]),
    options: Object.freeze([]),
    multiline: false,
    ownership: "manual_participant_completion",
    inputKey: null,
    deterministicSource: null,
    treatment:
      "The normalized New Jersey design collects the matter history as one composite participant answer covering county, court, complaint or indictment number, docket number, arrest date, offence, statute and disposition. It does not resolve that answer into this form's separate per-paragraph blanks, and choosing the paragraph that describes a disposition is a classification of the record. The participant completes it."
  }),
  Object.freeze({
    name: "dismissPlea",
    type: "checkbox",
    widgets: Object.freeze([
      w(18, 317.593, 159.98, 18, 17.333),
      w(18, 368.621, 159.98, 18, 17.333)
    ]),
    options: Object.freeze(["No","Yes"]),
    multiline: false,
    ownership: "manual_participant_completion",
    inputKey: null,
    deterministicSource: null,
    treatment:
      "Whether a dismissal followed a plea bargain is a characterisation of the disposition that the normalized design does not establish. The participant answers it."
  }),
  Object.freeze({
    name: "ExpungeCntyName",
    type: "dropdown",
    widgets: Object.freeze([
      w(18, 391.748, 694.263, 148.298, 16.128),
      w(27, 391.762, 690.944, 174.458, 16.127),
      w(30, 398.979, 682, 148.298, 16.127),
      w(40, 392.286, 676.158, 163.786, 16.127)
    ]),
    options: Object.freeze(["  ","Atlantic","Bergen","Burlington","Camden","Cape May","Cumberland","Essex","Gloucester","Hudson","Hunterdon","Mercer","Middlesex","Monmouth","Morris","Ocean","Passaic","Salem","Somerset","Sussex","Union","Warren"]),
    multiline: false,
    ownership: "manual_participant_completion",
    inputKey: null,
    deterministicSource: null,
    treatment:
      "Venue is the county of residence or a county where a conviction was adjudged and the normalized design records that the participant may choose between them. The design also carries an open venue question on the arrest-only route, so no county is selected here."
  }),
  Object.freeze({
    name: "formPrint",
    type: "button",
    widgets: Object.freeze([
      w(18, 501.336, 756.622, 49.836, 21.378)
    ]),
    options: Object.freeze([]),
    multiline: false,
    ownership: "not_used_by_assigned_route",
    inputKey: null,
    deterministicSource: null,
    treatment:
      "The kit's print action is preserved as authored and is not participant data."
  }),
  Object.freeze({
    name: "formSafeClear",
    type: "button",
    widgets: Object.freeze([
      w(18, 555.324, 756.622, 49.835, 21.378)
    ]),
    options: Object.freeze([]),
    multiline: false,
    ownership: "not_used_by_assigned_route",
    inputKey: null,
    deterministicSource: null,
    treatment:
      "The kit's clear action is preserved as authored and is not participant data."
  }),
  Object.freeze({
    name: "origCaseNums",
    type: "text",
    widgets: Object.freeze([
      w(18, 53.9, 269.581, 477.396, 17.333)
    ]),
    options: Object.freeze([]),
    multiline: false,
    ownership: "manual_participant_completion",
    inputKey: null,
    deterministicSource: null,
    treatment:
      "The normalized New Jersey design collects the matter history as one composite participant answer covering county, court, complaint or indictment number, docket number, arrest date, offence, statute and disposition. It does not resolve that answer into this form's separate per-paragraph blanks, and choosing the paragraph that describes a disposition is a classification of the record. The participant completes it."
  }),
  Object.freeze({
    name: "contOwe",
    type: "checkbox",
    widgets: Object.freeze([
      w(19, 33.031, 416.859, 18, 18),
      w(21, 33.934, 678.768, 18, 18)
    ]),
    options: Object.freeze(["Yes"]),
    multiline: false,
    ownership: "manual_participant_completion",
    inputKey: null,
    deterministicSource: null,
    treatment:
      "Whether a financial assessment is still owed, and why, sits behind the normalized design's unpaid-assessment and willfulness boundary. The participant completes it."
  }),
  Object.freeze({
    name: "dismissPti",
    type: "checkbox",
    widgets: Object.freeze([
      w(19, 34.313, 707.901, 18, 18)
    ]),
    options: Object.freeze(["Yes"]),
    multiline: false,
    ownership: "manual_participant_completion",
    inputKey: null,
    deterministicSource: null,
    treatment:
      "A dismissal after pretrial intervention, conditional discharge or another diversion programme is an express self-help boundary in the normalized design. The participant completes it."
  }),
  Object.freeze({
    name: "dismissPtiDt",
    type: "text",
    widgets: Object.freeze([
      w(19, 121.574, 710.385, 73.437, 13.768)
    ]),
    options: Object.freeze([]),
    multiline: false,
    ownership: "manual_participant_completion",
    inputKey: null,
    deterministicSource: null,
    treatment:
      "The normalized New Jersey design collects the matter history as one composite participant answer covering county, court, complaint or indictment number, docket number, arrest date, offence, statute and disposition. It does not resolve that answer into this form's separate per-paragraph blanks, and choosing the paragraph that describes a disposition is a classification of the record. The participant completes it."
  }),
  Object.freeze({
    name: "dismissPtiOff1",
    type: "text",
    widgets: Object.freeze([
      w(19, 406.713, 709.919, 131.967, 13.767)
    ]),
    options: Object.freeze([]),
    multiline: false,
    ownership: "manual_participant_completion",
    inputKey: null,
    deterministicSource: null,
    treatment:
      "The normalized New Jersey design collects the matter history as one composite participant answer covering county, court, complaint or indictment number, docket number, arrest date, offence, statute and disposition. It does not resolve that answer into this form's separate per-paragraph blanks, and choosing the paragraph that describes a disposition is a classification of the record. The participant completes it."
  }),
  Object.freeze({
    name: "dismissPtiOff2",
    type: "text",
    widgets: Object.freeze([
      w(19, 67.203, 692.804, 473.171, 13.767)
    ]),
    options: Object.freeze([]),
    multiline: false,
    ownership: "manual_participant_completion",
    inputKey: null,
    deterministicSource: null,
    treatment:
      "The normalized New Jersey design collects the matter history as one composite participant answer covering county, court, complaint or indictment number, docket number, arrest date, offence, statute and disposition. It does not resolve that answer into this form's separate per-paragraph blanks, and choosing the paragraph that describes a disposition is a classification of the record. The participant completes it."
  }),
  Object.freeze({
    name: "guilty",
    type: "checkbox",
    widgets: Object.freeze([
      w(19, 34.971, 591.363, 18, 18)
    ]),
    options: Object.freeze(["Yes"]),
    multiline: false,
    ownership: "manual_participant_completion",
    inputKey: null,
    deterministicSource: null,
    treatment:
      "The normalized New Jersey design collects the matter history as one composite participant answer covering county, court, complaint or indictment number, docket number, arrest date, offence, statute and disposition. It does not resolve that answer into this form's separate per-paragraph blanks, and choosing the paragraph that describes a disposition is a classification of the record. The participant completes it."
  }),
  Object.freeze({
    name: "guiltyCrt",
    type: "text",
    widgets: Object.freeze([
      w(19, 198.006, 487.971, 189.994, 13.767)
    ]),
    options: Object.freeze([]),
    multiline: false,
    ownership: "manual_participant_completion",
    inputKey: null,
    deterministicSource: null,
    treatment:
      "The normalized New Jersey design collects the matter history as one composite participant answer covering county, court, complaint or indictment number, docket number, arrest date, offence, statute and disposition. It does not resolve that answer into this form's separate per-paragraph blanks, and choosing the paragraph that describes a disposition is a classification of the record. The participant completes it."
  }),
  Object.freeze({
    name: "guiltyDocCmpltDt",
    type: "text",
    widgets: Object.freeze([
      w(19, 455.077, 469.661, 77.678, 13.767)
    ]),
    options: Object.freeze([]),
    multiline: false,
    ownership: "manual_participant_completion",
    inputKey: null,
    deterministicSource: null,
    treatment:
      "The normalized New Jersey design collects the matter history as one composite participant answer covering county, court, complaint or indictment number, docket number, arrest date, offence, statute and disposition. It does not resolve that answer into this form's separate per-paragraph blanks, and choosing the paragraph that describes a disposition is a classification of the record. The participant completes it."
  }),
  Object.freeze({
    name: "guiltyDt",
    type: "text",
    widgets: Object.freeze([
      w(19, 125.375, 593.629, 69.803, 13.767)
    ]),
    options: Object.freeze([]),
    multiline: false,
    ownership: "manual_participant_completion",
    inputKey: null,
    deterministicSource: null,
    treatment:
      "The normalized New Jersey design collects the matter history as one composite participant answer covering county, court, complaint or indictment number, docket number, arrest date, offence, statute and disposition. It does not resolve that answer into this form's separate per-paragraph blanks, and choosing the paragraph that describes a disposition is a classification of the record. The participant completes it."
  }),
  Object.freeze({
    name: "guiltyFinal1",
    type: "text",
    widgets: Object.freeze([
      w(19, 155.766, 522.801, 383.251, 13.768)
    ]),
    options: Object.freeze([]),
    multiline: false,
    ownership: "manual_participant_completion",
    inputKey: null,
    deterministicSource: null,
    treatment:
      "The normalized New Jersey design collects the matter history as one composite participant answer covering county, court, complaint or indictment number, docket number, arrest date, offence, statute and disposition. It does not resolve that answer into this form's separate per-paragraph blanks, and choosing the paragraph that describes a disposition is a classification of the record. The participant completes it."
  }),
  Object.freeze({
    name: "guiltyFinal2",
    type: "text",
    widgets: Object.freeze([
      w(19, 68.155, 505.219, 470.918, 14.237)
    ]),
    options: Object.freeze([]),
    multiline: false,
    ownership: "manual_participant_completion",
    inputKey: null,
    deterministicSource: null,
    treatment:
      "The normalized New Jersey design collects the matter history as one composite participant answer covering county, court, complaint or indictment number, docket number, arrest date, offence, statute and disposition. It does not resolve that answer into this form's separate per-paragraph blanks, and choosing the paragraph that describes a disposition is a classification of the record. The participant completes it."
  }),
  Object.freeze({
    name: "guiltyFineDt",
    type: "text",
    widgets: Object.freeze([
      w(19, 424.259, 452.121, 93.394, 13.767)
    ]),
    options: Object.freeze([]),
    multiline: false,
    ownership: "manual_participant_completion",
    inputKey: null,
    deterministicSource: null,
    treatment:
      "The normalized New Jersey design collects the matter history as one composite participant answer covering county, court, complaint or indictment number, docket number, arrest date, offence, statute and disposition. It does not resolve that answer into this form's separate per-paragraph blanks, and choosing the paragraph that describes a disposition is a classification of the record. The participant completes it."
  }),
  Object.freeze({
    name: "guiltyOff1",
    type: "text",
    widgets: Object.freeze([
      w(19, 243.968, 575.795, 295.847, 13.767)
    ]),
    options: Object.freeze([]),
    multiline: false,
    ownership: "manual_participant_completion",
    inputKey: null,
    deterministicSource: null,
    treatment:
      "The normalized New Jersey design collects the matter history as one composite participant answer covering county, court, complaint or indictment number, docket number, arrest date, offence, statute and disposition. It does not resolve that answer into this form's separate per-paragraph blanks, and choosing the paragraph that describes a disposition is a classification of the record. The participant completes it."
  }),
  Object.freeze({
    name: "guiltyOff2",
    type: "text",
    widgets: Object.freeze([
      w(19, 67.667, 557.96, 460.249, 13.768)
    ]),
    options: Object.freeze([]),
    multiline: false,
    ownership: "manual_participant_completion",
    inputKey: null,
    deterministicSource: null,
    treatment:
      "The normalized New Jersey design collects the matter history as one composite participant answer covering county, court, complaint or indictment number, docket number, arrest date, offence, statute and disposition. It does not resolve that answer into this form's separate per-paragraph blanks, and choosing the paragraph that describes a disposition is a classification of the record. The participant completes it."
  }),
  Object.freeze({
    name: "guiltyProbDt",
    type: "text",
    widgets: Object.freeze([
      w(19, 173, 452.557, 76.435, 13.767)
    ]),
    options: Object.freeze([]),
    multiline: false,
    ownership: "manual_participant_completion",
    inputKey: null,
    deterministicSource: null,
    treatment:
      "The normalized New Jersey design collects the matter history as one composite participant answer covering county, court, complaint or indictment number, docket number, arrest date, offence, statute and disposition. It does not resolve that answer into this form's separate per-paragraph blanks, and choosing the paragraph that describes a disposition is a classification of the record. The participant completes it."
  }),
  Object.freeze({
    name: "guiltyStatute",
    type: "text",
    widgets: Object.freeze([
      w(19, 266.228, 539.89, 166.848, 14.707)
    ]),
    options: Object.freeze([]),
    multiline: false,
    ownership: "manual_participant_completion",
    inputKey: null,
    deterministicSource: null,
    treatment:
      "The normalized New Jersey design collects the matter history as one composite participant answer covering county, court, complaint or indictment number, docket number, arrest date, offence, statute and disposition. It does not resolve that answer into this form's separate per-paragraph blanks, and choosing the paragraph that describes a disposition is a classification of the record. The participant completes it."
  }),
  Object.freeze({
    name: "guiltyTimeType",
    type: "dropdown",
    widgets: Object.freeze([
      w(19, 239.574, 470.071, 158.512, 13.767)
    ]),
    options: Object.freeze(["  ","incarceration time","jail time","prison time"]),
    multiline: false,
    ownership: "manual_participant_completion",
    inputKey: null,
    deterministicSource: null,
    treatment:
      "The normalized New Jersey design collects the matter history as one composite participant answer covering county, court, complaint or indictment number, docket number, arrest date, offence, statute and disposition. It does not resolve that answer into this form's separate per-paragraph blanks, and choosing the paragraph that describes a disposition is a classification of the record. The participant completes it."
  }),
  Object.freeze({
    name: "oweAmt",
    type: "text",
    widgets: Object.freeze([
      w(19, 378.473, 370.507, 100.019, 13.767),
      w(21, 368.936, 631.502, 126.767, 13.767)
    ]),
    options: Object.freeze([]),
    multiline: false,
    ownership: "manual_participant_completion",
    inputKey: null,
    deterministicSource: null,
    treatment:
      "Whether a financial assessment is still owed, and why, sits behind the normalized design's unpaid-assessment and willfulness boundary. The participant completes it."
  }),
  Object.freeze({
    name: "oweDocket",
    type: "text",
    widgets: Object.freeze([
      w(19, 114.603, 371.087, 151.198, 13.767),
      w(21, 73.427, 632.476, 183.461, 14.237)
    ]),
    options: Object.freeze([]),
    multiline: false,
    ownership: "manual_participant_completion",
    inputKey: null,
    deterministicSource: null,
    treatment:
      "Whether a financial assessment is still owed, and why, sits behind the normalized design's unpaid-assessment and willfulness boundary. The participant completes it."
  }),
  Object.freeze({
    name: "cnt",
    type: "text",
    widgets: Object.freeze([
      w(20, 36.143, 630.051, 15.416, 15.24)
    ]),
    options: Object.freeze([]),
    multiline: false,
    ownership: "manual_participant_completion",
    inputKey: null,
    deterministicSource: null,
    treatment:
      "Form A's addendum page repeats the paragraph structure for each additional arrest and is numbered by hand from '2'. The normalized design supplies neither the per-arrest split nor the paragraph numbering, so the participant completes it."
  }),
  Object.freeze({
    name: "contAcquit",
    type: "checkbox",
    widgets: Object.freeze([
      w(20, 33.005, 384.231, 18, 18)
    ]),
    options: Object.freeze(["Yes"]),
    multiline: false,
    ownership: "manual_participant_completion",
    inputKey: null,
    deterministicSource: null,
    treatment:
      "Form A's addendum page repeats the paragraph structure for each additional arrest and is numbered by hand from '2'. The normalized design supplies neither the per-arrest split nor the paragraph numbering, so the participant completes it."
  }),
  Object.freeze({
    name: "contAcquitCrt",
    type: "text",
    widgets: Object.freeze([
      w(20, 198.588, 349.003, 231.258, 15.24)
    ]),
    options: Object.freeze([]),
    multiline: false,
    ownership: "manual_participant_completion",
    inputKey: null,
    deterministicSource: null,
    treatment:
      "Form A's addendum page repeats the paragraph structure for each additional arrest and is numbered by hand from '2'. The normalized design supplies neither the per-arrest split nor the paragraph numbering, so the participant completes it."
  }),
  Object.freeze({
    name: "contAcquitDt",
    type: "text",
    widgets: Object.freeze([
      w(20, 127.721, 384.672, 70.743, 15.24)
    ]),
    options: Object.freeze([]),
    multiline: false,
    ownership: "manual_participant_completion",
    inputKey: null,
    deterministicSource: null,
    treatment:
      "Form A's addendum page repeats the paragraph structure for each additional arrest and is numbered by hand from '2'. The normalized design supplies neither the per-arrest split nor the paragraph numbering, so the participant completes it."
  }),
  Object.freeze({
    name: "contAcquitOff1",
    type: "text",
    widgets: Object.freeze([
      w(20, 424.103, 384.672, 143.021, 15.24)
    ]),
    options: Object.freeze([]),
    multiline: false,
    ownership: "manual_participant_completion",
    inputKey: null,
    deterministicSource: null,
    treatment:
      "Form A's addendum page repeats the paragraph structure for each additional arrest and is numbered by hand from '2'. The normalized design supplies neither the per-arrest split nor the paragraph numbering, so the participant completes it."
  }),
  Object.freeze({
    name: "contAcquitOff2",
    type: "text",
    widgets: Object.freeze([
      w(20, 72.389, 366.838, 495.39, 15.24)
    ]),
    options: Object.freeze([]),
    multiline: false,
    ownership: "manual_participant_completion",
    inputKey: null,
    deterministicSource: null,
    treatment:
      "Form A's addendum page repeats the paragraph structure for each additional arrest and is numbered by hand from '2'. The normalized design supplies neither the per-arrest split nor the paragraph numbering, so the participant completes it."
  }),
  Object.freeze({
    name: "contArrestDt",
    type: "text",
    widgets: Object.freeze([
      w(20, 293.613, 629.57, 74.344, 15.24)
    ]),
    options: Object.freeze([]),
    multiline: false,
    ownership: "manual_participant_completion",
    inputKey: null,
    deterministicSource: null,
    treatment:
      "Form A's addendum page repeats the paragraph structure for each additional arrest and is numbered by hand from '2'. The normalized design supplies neither the per-arrest split nor the paragraph numbering, so the participant completes it."
  }),
  Object.freeze({
    name: "contArrestMuni",
    type: "text",
    widgets: Object.freeze([
      w(20, 147.053, 559.59, 322.169, 15.24)
    ]),
    options: Object.freeze([]),
    multiline: false,
    ownership: "manual_participant_completion",
    inputKey: null,
    deterministicSource: null,
    treatment:
      "Form A's addendum page repeats the paragraph structure for each additional arrest and is numbered by hand from '2'. The normalized design supplies neither the per-arrest split nor the paragraph numbering, so the participant completes it."
  }),
  Object.freeze({
    name: "contDismiss",
    type: "checkbox",
    widgets: Object.freeze([
      w(20, 34.588, 468.558, 18, 18)
    ]),
    options: Object.freeze(["Yes"]),
    multiline: false,
    ownership: "manual_participant_completion",
    inputKey: null,
    deterministicSource: null,
    treatment:
      "Form A's addendum page repeats the paragraph structure for each additional arrest and is numbered by hand from '2'. The normalized design supplies neither the per-arrest split nor the paragraph numbering, so the participant completes it."
  }),
  Object.freeze({
    name: "contDismissCrt",
    type: "text",
    widgets: Object.freeze([
      w(20, 315.194, 434.422, 200.328, 15.239)
    ]),
    options: Object.freeze([]),
    multiline: false,
    ownership: "manual_participant_completion",
    inputKey: null,
    deterministicSource: null,
    treatment:
      "Form A's addendum page repeats the paragraph structure for each additional arrest and is numbered by hand from '2'. The normalized design supplies neither the per-arrest split nor the paragraph numbering, so the participant completes it."
  }),
  Object.freeze({
    name: "contDismissDt",
    type: "text",
    widgets: Object.freeze([
      w(20, 129.162, 470.22, 71.058, 15.24)
    ]),
    options: Object.freeze([]),
    multiline: false,
    ownership: "manual_participant_completion",
    inputKey: null,
    deterministicSource: null,
    treatment:
      "Form A's addendum page repeats the paragraph structure for each additional arrest and is numbered by hand from '2'. The normalized design supplies neither the per-arrest split nor the paragraph numbering, so the participant completes it."
  }),
  Object.freeze({
    name: "contDismissOff1",
    type: "text",
    widgets: Object.freeze([
      w(20, 412.347, 469.152, 163.717, 15.24)
    ]),
    options: Object.freeze([]),
    multiline: false,
    ownership: "manual_participant_completion",
    inputKey: null,
    deterministicSource: null,
    treatment:
      "Form A's addendum page repeats the paragraph structure for each additional arrest and is numbered by hand from '2'. The normalized design supplies neither the per-arrest split nor the paragraph numbering, so the participant completes it."
  }),
  Object.freeze({
    name: "contDismissPlea",
    type: "checkbox",
    widgets: Object.freeze([
      w(20, 421.266, 417.617, 18, 13.656),
      w(20, 372.429, 418.12, 18, 13.657)
    ]),
    options: Object.freeze(["No","Yes"]),
    multiline: false,
    ownership: "manual_participant_completion",
    inputKey: null,
    deterministicSource: null,
    treatment:
      "Form A's addendum page repeats the paragraph structure for each additional arrest and is numbered by hand from '2'. The normalized design supplies neither the per-arrest split nor the paragraph numbering, so the participant completes it."
  }),
  Object.freeze({
    name: "contDismissPti",
    type: "checkbox",
    widgets: Object.freeze([
      w(20, 33.475, 298.343, 18, 18)
    ]),
    options: Object.freeze(["Yes"]),
    multiline: false,
    ownership: "manual_participant_completion",
    inputKey: null,
    deterministicSource: null,
    treatment:
      "Form A's addendum page repeats the paragraph structure for each additional arrest and is numbered by hand from '2'. The normalized design supplies neither the per-arrest split nor the paragraph numbering, so the participant completes it."
  }),
  Object.freeze({
    name: "contDismissPtiCrt",
    type: "text",
    widgets: Object.freeze([
      w(20, 319.549, 264.054, 170.029, 16.179)
    ]),
    options: Object.freeze([]),
    multiline: false,
    ownership: "manual_participant_completion",
    inputKey: null,
    deterministicSource: null,
    treatment:
      "Form A's addendum page repeats the paragraph structure for each additional arrest and is numbered by hand from '2'. The normalized design supplies neither the per-arrest split nor the paragraph numbering, so the participant completes it."
  }),
  Object.freeze({
    name: "contDismissPtiDt",
    type: "text",
    widgets: Object.freeze([
      w(20, 127.252, 298.785, 74.028, 15.24)
    ]),
    options: Object.freeze([]),
    multiline: false,
    ownership: "manual_participant_completion",
    inputKey: null,
    deterministicSource: null,
    treatment:
      "Form A's addendum page repeats the paragraph structure for each additional arrest and is numbered by hand from '2'. The normalized design supplies neither the per-arrest split nor the paragraph numbering, so the participant completes it."
  }),
  Object.freeze({
    name: "contDismissPtiOff1",
    type: "text",
    widgets: Object.freeze([
      w(20, 412.348, 299.723, 162.777, 15.24)
    ]),
    options: Object.freeze([]),
    multiline: false,
    ownership: "manual_participant_completion",
    inputKey: null,
    deterministicSource: null,
    treatment:
      "Form A's addendum page repeats the paragraph structure for each additional arrest and is numbered by hand from '2'. The normalized design supplies neither the per-arrest split nor the paragraph numbering, so the participant completes it."
  }),
  Object.freeze({
    name: "contDismissPtiOff2",
    type: "text",
    widgets: Object.freeze([
      w(20, 71.766, 282.358, 503.677, 15.24)
    ]),
    options: Object.freeze([]),
    multiline: false,
    ownership: "manual_participant_completion",
    inputKey: null,
    deterministicSource: null,
    treatment:
      "Form A's addendum page repeats the paragraph structure for each additional arrest and is numbered by hand from '2'. The normalized design supplies neither the per-arrest split nor the paragraph numbering, so the participant completes it."
  }),
  Object.freeze({
    name: "contDsmissOff2",
    type: "text",
    widgets: Object.freeze([
      w(20, 72.844, 451.586, 493.982, 15.24)
    ]),
    options: Object.freeze([]),
    multiline: false,
    ownership: "manual_participant_completion",
    inputKey: null,
    deterministicSource: null,
    treatment:
      "Form A's addendum page repeats the paragraph structure for each additional arrest and is numbered by hand from '2'. The normalized design supplies neither the per-arrest split nor the paragraph numbering, so the participant completes it. The kit spells this field name contDsmissOff2; the source name is preserved exactly as authored."
  }),
  Object.freeze({
    name: "contGuilty",
    type: "checkbox",
    widgets: Object.freeze([
      w(20, 36.291, 180.541, 18, 18)
    ]),
    options: Object.freeze(["Yes"]),
    multiline: false,
    ownership: "manual_participant_completion",
    inputKey: null,
    deterministicSource: null,
    treatment:
      "Form A's addendum page repeats the paragraph structure for each additional arrest and is numbered by hand from '2'. The normalized design supplies neither the per-arrest split nor the paragraph numbering, so the participant completes it."
  }),
  Object.freeze({
    name: "contGuiltyCrt",
    type: "text",
    widgets: Object.freeze([
      w(20, 204.126, 76.278, 171.69, 13.767)
    ]),
    options: Object.freeze([]),
    multiline: false,
    ownership: "manual_participant_completion",
    inputKey: null,
    deterministicSource: null,
    treatment:
      "Form A's addendum page repeats the paragraph structure for each additional arrest and is numbered by hand from '2'. The normalized design supplies neither the per-arrest split nor the paragraph numbering, so the participant completes it."
  }),
  Object.freeze({
    name: "contGuiltyDocCmpltDt",
    type: "text",
    widgets: Object.freeze([
      w(20, 496.694, 59.166, 70.632, 13.767)
    ]),
    options: Object.freeze([]),
    multiline: false,
    ownership: "manual_participant_completion",
    inputKey: null,
    deterministicSource: null,
    treatment:
      "Form A's addendum page repeats the paragraph structure for each additional arrest and is numbered by hand from '2'. The normalized design supplies neither the per-arrest split nor the paragraph numbering, so the participant completes it."
  }),
  Object.freeze({
    name: "contGuiltyDt",
    type: "text",
    widgets: Object.freeze([
      w(20, 126.314, 182.658, 72.619, 13.767)
    ]),
    options: Object.freeze([]),
    multiline: false,
    ownership: "manual_participant_completion",
    inputKey: null,
    deterministicSource: null,
    treatment:
      "Form A's addendum page repeats the paragraph structure for each additional arrest and is numbered by hand from '2'. The normalized design supplies neither the per-arrest split nor the paragraph numbering, so the participant completes it."
  }),
  Object.freeze({
    name: "contGuiltyFinal1",
    type: "text",
    widgets: Object.freeze([
      w(20, 160.949, 112.517, 414.695, 12.36)
    ]),
    options: Object.freeze([]),
    multiline: false,
    ownership: "manual_participant_completion",
    inputKey: null,
    deterministicSource: null,
    treatment:
      "Form A's addendum page repeats the paragraph structure for each additional arrest and is numbered by hand from '2'. The normalized design supplies neither the per-arrest split nor the paragraph numbering, so the participant completes it."
  }),
  Object.freeze({
    name: "contGuiltyFinal2",
    type: "text",
    widgets: Object.freeze([
      w(20, 72.399, 94.465, 502.362, 14.237)
    ]),
    options: Object.freeze([]),
    multiline: false,
    ownership: "manual_participant_completion",
    inputKey: null,
    deterministicSource: null,
    treatment:
      "Form A's addendum page repeats the paragraph structure for each additional arrest and is numbered by hand from '2'. The normalized design supplies neither the per-arrest split nor the paragraph numbering, so the participant completes it."
  }),
  Object.freeze({
    name: "contGuiltyOff1",
    type: "text",
    widgets: Object.freeze([
      w(20, 258.433, 165.293, 317.436, 13.767)
    ]),
    options: Object.freeze([]),
    multiline: false,
    ownership: "manual_participant_completion",
    inputKey: null,
    deterministicSource: null,
    treatment:
      "Form A's addendum page repeats the paragraph structure for each additional arrest and is numbered by hand from '2'. The normalized design supplies neither the per-arrest split nor the paragraph numbering, so the participant completes it."
  }),
  Object.freeze({
    name: "contGuiltyOff2",
    type: "text",
    widgets: Object.freeze([
      w(20, 71.891, 146.989, 492.633, 13.767)
    ]),
    options: Object.freeze([]),
    multiline: false,
    ownership: "manual_participant_completion",
    inputKey: null,
    deterministicSource: null,
    treatment:
      "Form A's addendum page repeats the paragraph structure for each additional arrest and is numbered by hand from '2'. The normalized design supplies neither the per-arrest split nor the paragraph numbering, so the participant completes it."
  }),
  Object.freeze({
    name: "contGuiltyStatute",
    type: "text",
    widgets: Object.freeze([
      w(20, 268.825, 130.032, 185.621, 13.768)
    ]),
    options: Object.freeze([]),
    multiline: false,
    ownership: "manual_participant_completion",
    inputKey: null,
    deterministicSource: null,
    treatment:
      "Form A's addendum page repeats the paragraph structure for each additional arrest and is numbered by hand from '2'. The normalized design supplies neither the per-arrest split nor the paragraph numbering, so the participant completes it."
  }),
  Object.freeze({
    name: "contGuiltyTimeType",
    type: "dropdown",
    widgets: Object.freeze([
      w(20, 311.845, 59.107, 130.5, 13.767)
    ]),
    options: Object.freeze(["  ","incarceration time","jail time","prison time"]),
    multiline: false,
    ownership: "manual_participant_completion",
    inputKey: null,
    deterministicSource: null,
    treatment:
      "Form A's addendum page repeats the paragraph structure for each additional arrest and is numbered by hand from '2'. The normalized design supplies neither the per-arrest split nor the paragraph numbering, so the participant completes it."
  }),
  Object.freeze({
    name: "contOffense1",
    type: "text",
    widgets: Object.freeze([
      w(20, 119.354, 611.911, 455.854, 15.24)
    ]),
    options: Object.freeze([]),
    multiline: false,
    ownership: "manual_participant_completion",
    inputKey: null,
    deterministicSource: null,
    treatment:
      "Form A's addendum page repeats the paragraph structure for each additional arrest and is numbered by hand from '2'. The normalized design supplies neither the per-arrest split nor the paragraph numbering, so the participant completes it."
  }),
  Object.freeze({
    name: "contOffense2",
    type: "text",
    widgets: Object.freeze([
      w(20, 58.555, 594.074, 504.408, 15.24)
    ]),
    options: Object.freeze([]),
    multiline: false,
    ownership: "manual_participant_completion",
    inputKey: null,
    deterministicSource: null,
    treatment:
      "Form A's addendum page repeats the paragraph structure for each additional arrest and is numbered by hand from '2'. The normalized design supplies neither the per-arrest split nor the paragraph numbering, so the participant completes it."
  }),
  Object.freeze({
    name: "contOrigNums",
    type: "text",
    widgets: Object.freeze([
      w(20, 316.228, 524.708, 250.273, 15.24)
    ]),
    options: Object.freeze([]),
    multiline: false,
    ownership: "manual_participant_completion",
    inputKey: null,
    deterministicSource: null,
    treatment:
      "Form A's addendum page repeats the paragraph structure for each additional arrest and is numbered by hand from '2'. The normalized design supplies neither the per-arrest split nor the paragraph numbering, so the participant completes it."
  }),
  Object.freeze({
    name: "contStatute",
    type: "text",
    widgets: Object.freeze([
      w(20, 254.748, 576.634, 239.339, 15.24)
    ]),
    options: Object.freeze([]),
    multiline: false,
    ownership: "manual_participant_completion",
    inputKey: null,
    deterministicSource: null,
    treatment:
      "Form A's addendum page repeats the paragraph structure for each additional arrest and is numbered by hand from '2'. The normalized design supplies neither the per-arrest split nor the paragraph numbering, so the participant completes it."
  }),
  Object.freeze({
    name: "contGuiltyFineDt",
    type: "text",
    widgets: Object.freeze([
      w(21, 428.272, 714.46, 79.147, 13.767)
    ]),
    options: Object.freeze([]),
    multiline: false,
    ownership: "manual_participant_completion",
    inputKey: null,
    deterministicSource: null,
    treatment:
      "Form A's addendum page repeats the paragraph structure for each additional arrest and is numbered by hand from '2'. The normalized design supplies neither the per-arrest split nor the paragraph numbering, so the participant completes it."
  }),
  Object.freeze({
    name: "contGuiltyProbDt",
    type: "text",
    widgets: Object.freeze([
      w(21, 180.847, 714.278, 70.273, 13.767)
    ]),
    options: Object.freeze([]),
    multiline: false,
    ownership: "manual_participant_completion",
    inputKey: null,
    deterministicSource: null,
    treatment:
      "Form A's addendum page repeats the paragraph structure for each additional arrest and is numbered by hand from '2'. The normalized design supplies neither the per-arrest split nor the paragraph numbering, so the participant completes it."
  }),
  Object.freeze({
    name: "seek34degree",
    type: "checkbox",
    widgets: Object.freeze([
      w(22, 100.589, 362.01, 18, 18)
    ]),
    options: Object.freeze(["Yes"]),
    multiline: false,
    ownership: "prohibited_from_generation",
    inputKey: null,
    deterministicSource: null,
    treatment:
      "Checking this box asserts the N.J.S.A. 2C:52-2(c)(3) third or fourth degree controlled dangerous substance route on compelling circumstances. The normalized design places that route outside self-help."
  }),
  Object.freeze({
    name: "seek5yrs",
    type: "checkbox",
    widgets: Object.freeze([
      w(22, 100.901, 598.238, 18, 18)
    ]),
    options: Object.freeze(["Yes"]),
    multiline: false,
    ownership: "prohibited_from_generation",
    inputKey: null,
    deterministicSource: null,
    treatment:
      "Checking this box asserts an early-pathway expungement under N.J.S.A. 2C:52-2(a)(2) or 2C:52-3(b)(2) on compelling circumstances. The normalized design places both early pathways outside self-help and records that compelling-circumstances narratives are attorney or assisted work rather than template output."
  }),
  Object.freeze({
    name: "seek5yrsDetails",
    type: "text",
    widgets: Object.freeze([
      w(22, 114.76, 273.763, 409.24, 43.838),
      w(22, 112.597, 389.496, 409.239, 86.001),
      w(24, 127.7, 338.29, 411.91, 60.267)
    ]),
    options: Object.freeze([]),
    multiline: true,
    ownership: "prohibited_from_generation",
    inputKey: null,
    deterministicSource: null,
    treatment:
      "One field name carries three semantically distinct blanks: both compelling-circumstances narratives on Form A - Continued and the name-change explanation in the Verification. Any value written would appear in all three. The compelling-circumstances narrative is an express self-help boundary, so the field is never written and the collision is recorded rather than resolved by renaming the source."
  }),
  Object.freeze({
    name: "changeName",
    type: "checkbox",
    widgets: Object.freeze([
      w(24, 106.909, 425.294, 18, 18)
    ]),
    options: Object.freeze(["Yes"]),
    multiline: false,
    ownership: "manual_participant_completion",
    inputKey: null,
    deterministicSource: null,
    treatment:
      "A sworn statement of legal name changes. The participant checks it and supplies the details on the accompanying lines."
  }),
  Object.freeze({
    name: "notaryDay",
    type: "text",
    widgets: Object.freeze([
      w(24, 315.523, 178.954, 64.656, 15.24)
    ]),
    options: Object.freeze([]),
    multiline: false,
    ownership: "outside_party_completion",
    inputKey: null,
    deterministicSource: null,
    treatment:
      "The notary or other authorized officer completes 'Sworn to and subscribed before me this ___ day of ___, ___'."
  }),
  Object.freeze({
    name: "notaryMnth",
    type: "dropdown",
    widgets: Object.freeze([
      w(24, 421.319, 177.744, 75.068, 15.24)
    ]),
    options: Object.freeze([" ","April","August","December","February","January","July","June","March","May","November","October","September"]),
    multiline: false,
    ownership: "outside_party_completion",
    inputKey: null,
    deterministicSource: null,
    treatment:
      "The notary or other authorized officer completes 'Sworn to and subscribed before me this ___ day of ___, ___'."
  }),
  Object.freeze({
    name: "notaryYear",
    type: "text",
    widgets: Object.freeze([
      w(24, 500.68, 178.954, 43.081, 15.24)
    ]),
    options: Object.freeze([]),
    multiline: false,
    ownership: "outside_party_completion",
    inputKey: null,
    deterministicSource: null,
    treatment:
      "The notary or other authorized officer completes 'Sworn to and subscribed before me this ___ day of ___, ___'."
  }),
  Object.freeze({
    name: "seekJuvNever",
    type: "checkbox",
    widgets: Object.freeze([
      w(24, 106.147, 522.421, 18, 18)
    ]),
    options: Object.freeze(["Yes"]),
    multiline: false,
    ownership: "manual_participant_completion",
    inputKey: null,
    deterministicSource: null,
    treatment:
      "Paragraph 3 is a sworn statement that no prior expungement, sealing or similar relief has been granted. The normalized design places prior expungement behind a self-help boundary and the petition is verified by the participant, so the participant checks it."
  }),
  Object.freeze({
    name: "hearDay",
    type: "text",
    widgets: Object.freeze([
      w(27, 110.995, 440.722, 34.861, 15.24)
    ]),
    options: Object.freeze([]),
    multiline: false,
    ownership: "court_or_agency_only",
    inputKey: null,
    deterministicSource: null,
    treatment:
      "The court clerk sets and enters the hearing date. No hearing date is supplied to LegalEase."
  }),
  Object.freeze({
    name: "hearMnth",
    type: "dropdown",
    widgets: Object.freeze([
      w(27, 186.797, 440.722, 68.762, 15.24)
    ]),
    options: Object.freeze([" ","April","August","December","February","January","July","June","March","May","November","October","September"]),
    multiline: false,
    ownership: "court_or_agency_only",
    inputKey: null,
    deterministicSource: null,
    treatment:
      "The court clerk sets and enters the hearing date. No hearing date is supplied to LegalEase."
  }),
  Object.freeze({
    name: "hearTime",
    type: "text",
    widgets: Object.freeze([
      w(27, 305.119, 440.395, 38.098, 15.24)
    ]),
    options: Object.freeze([]),
    multiline: false,
    ownership: "court_or_agency_only",
    inputKey: null,
    deterministicSource: null,
    treatment:
      "The court clerk sets and enters the hearing time. No hearing time is supplied to LegalEase."
  }),
  Object.freeze({
    name: "hearTimeM",
    type: "dropdown",
    widgets: Object.freeze([
      w(27, 398.022, 439.135, 24.85, 20)
    ]),
    options: Object.freeze(["   ","a","p"]),
    multiline: false,
    ownership: "court_or_agency_only",
    inputKey: null,
    deterministicSource: null,
    treatment:
      "The court clerk sets and enters the hearing meridiem. No hearing time is supplied to LegalEase."
  }),
  Object.freeze({
    name: "hearYr",
    type: "text",
    widgets: Object.freeze([
      w(27, 259.927, 440.503, 32.386, 15.24)
    ]),
    options: Object.freeze([]),
    multiline: false,
    ownership: "court_or_agency_only",
    inputKey: null,
    deterministicSource: null,
    treatment:
      "The court clerk sets and enters the hearing date. No hearing date is supplied to LegalEase."
  }),
  Object.freeze({
    name: "MuniCrts",
    type: "text",
    widgets: Object.freeze([
      w(27, 260.802, 291.336, 274.705, 15.12),
      w(30, 262.314, 63.205, 257.187, 15.12),
      w(37, 289.865, 590.256, 222.041, 13.836),
      w(40, 244.161, 368.477, 275.68, 15.12),
      w(42, 320.481, 594.968, 225.438, 13.836)
    ]),
    options: Object.freeze([]),
    multiline: false,
    ownership: "manual_participant_completion",
    inputKey: null,
    deterministicSource: null,
    treatment:
      "The service list names each county, municipality, department or institution that holds a record. The normalized design routes this to the service checklist built from the State Police history rather than to a generated value, and an omitted agency is the most common way a granted expungement fails."
  }),
  Object.freeze({
    name: "orderHearDay",
    type: "text",
    widgets: Object.freeze([
      w(27, 168.195, 457.37, 39.771, 15.24)
    ]),
    options: Object.freeze([]),
    multiline: false,
    ownership: "court_or_agency_only",
    inputKey: null,
    deterministicSource: null,
    treatment:
      "The kit's own instruction 6 directs the filer to leave the 'IT IS ORDERED this ___' lines blank for the court clerk."
  }),
  Object.freeze({
    name: "orderHearMnth",
    type: "dropdown",
    widgets: Object.freeze([
      w(27, 247.046, 456.974, 77.086, 15.24)
    ]),
    options: Object.freeze([" ","April","August","December","February","January","July","June","March","May","November","October","September"]),
    multiline: false,
    ownership: "court_or_agency_only",
    inputKey: null,
    deterministicSource: null,
    treatment:
      "The kit's own instruction 6 directs the filer to leave the 'IT IS ORDERED this ___' lines blank for the court clerk."
  }),
  Object.freeze({
    name: "orderHearYr",
    type: "text",
    widgets: Object.freeze([
      w(27, 332.086, 457.989, 40.312, 15.24)
    ]),
    options: Object.freeze([]),
    multiline: false,
    ownership: "court_or_agency_only",
    inputKey: null,
    deterministicSource: null,
    treatment:
      "The kit's own instruction 6 directs the filer to leave the 'IT IS ORDERED this ___' lines blank for the court clerk."
  }),
  Object.freeze({
    name: "PoliceLoc",
    type: "text",
    widgets: Object.freeze([
      w(27, 191.033, 253.563, 195.961, 13.243),
      w(31, 192.365, 679.633, 289.717, 15.12),
      w(37, 142.112, 500.448, 139.106, 13.836),
      w(40, 175.742, 329.474, 285.399, 15.12),
      w(42, 173.493, 503.361, 129.855, 13.836)
    ]),
    options: Object.freeze([]),
    multiline: false,
    ownership: "manual_participant_completion",
    inputKey: null,
    deterministicSource: null,
    treatment:
      "The service list names each county, municipality, department or institution that holds a record. The normalized design routes this to the service checklist built from the State Police history rather than to a generated value, and an omitted agency is the most common way a granted expungement fails."
  }),
  Object.freeze({
    name: "probDivCntys",
    type: "text",
    widgets: Object.freeze([
      w(27, 131.151, 231.701, 279.357, 15.12),
      w(31, 132.134, 641.837, 282.5, 15.12),
      w(40, 114.493, 232.545, 280.727, 15.121)
    ]),
    options: Object.freeze([]),
    multiline: false,
    ownership: "manual_participant_completion",
    inputKey: null,
    deterministicSource: null,
    treatment:
      "The service list names each county, municipality, department or institution that holds a record. The normalized design routes this to the service checklist built from the State Police history rather than to a generated value, and an omitted agency is the most common way a granted expungement fails."
  }),
  Object.freeze({
    name: "prosCntys",
    type: "text",
    widgets: Object.freeze([
      w(27, 212.82, 313.936, 236.202, 15.12),
      w(30, 211.622, 102.199, 304.837, 15.12),
      w(40, 195.546, 406.635, 320.158, 15.12)
    ]),
    options: Object.freeze([]),
    multiline: false,
    ownership: "manual_participant_completion",
    inputKey: null,
    deterministicSource: null,
    treatment:
      "The service list names each county, municipality, department or institution that holds a record. The normalized design routes this to the service checklist built from the State Police history rather than to a generated value, and an omitted agency is the most common way a granted expungement fails."
  }),
  Object.freeze({
    name: "sigHearJdg",
    type: "text",
    widgets: Object.freeze([
      w(27, 162.439, 81.494, 164.208, 15.12)
    ]),
    options: Object.freeze([]),
    multiline: false,
    ownership: "court_or_agency_only",
    inputKey: null,
    deterministicSource: null,
    treatment:
      "The signature line of the Judge of the Superior Court of New Jersey."
  }),
  Object.freeze({
    name: "SuperintendentLoc",
    type: "text",
    widgets: Object.freeze([
      w(27, 238.556, 172.3, 209.188, 15.12),
      w(31, 237.794, 581.341, 207.856, 15.12),
      w(37, 148.15, 275.049, 133.98, 13.836),
      w(40, 219.384, 269.869, 207.501, 15.12),
      w(42, 175.146, 285.098, 131.249, 15.244)
    ]),
    options: Object.freeze([]),
    multiline: false,
    ownership: "manual_participant_completion",
    inputKey: null,
    deterministicSource: null,
    treatment:
      "The service list names each county, municipality, department or institution that holds a record. The normalized design routes this to the service checklist built from the State Police history rather than to a generated value, and an omitted agency is the most common way a granted expungement fails."
  }),
  Object.freeze({
    name: "WardenLoc",
    type: "text",
    widgets: Object.freeze([
      w(27, 217.782, 194.66, 207.9, 15.12),
      w(31, 217.612, 604.242, 206.096, 16.101),
      w(37, 364.128, 500.448, 194.239, 13.836),
      w(40, 198.92, 292.397, 208.536, 15.12),
      w(42, 393.536, 502.891, 153.938, 13.836)
    ]),
    options: Object.freeze([]),
    multiline: false,
    ownership: "manual_participant_completion",
    inputKey: null,
    deterministicSource: null,
    treatment:
      "The service list names each county, municipality, department or institution that holds a record. The normalized design routes this to the service checklist built from the State Police history rather than to a generated value, and an omitted agency is the most common way a granted expungement fails."
  }),
  Object.freeze({
    name: "cleanSlate",
    type: "checkbox",
    widgets: Object.freeze([
      w(30, 323.634, 358.016, 18, 18)
    ]),
    options: Object.freeze(["yes"]),
    multiline: false,
    ownership: "manual_participant_completion",
    inputKey: null,
    deterministicSource: null,
    treatment:
      "The statutory-basis boxes on the proposed order state the route under which relief is sought. The normalized design records selection of the statutory basis as an item the participant completes, and the Clean Slate route still carries an unresolved eligibility question on the N.J.S.A. 2C:52-2(b) and (c) lists."
  }),
  Object.freeze({
    name: "gradDC",
    type: "checkbox",
    widgets: Object.freeze([
      w(30, 322.524, 459.931, 18, 18)
    ]),
    options: Object.freeze(["Yes"]),
    multiline: false,
    ownership: "manual_participant_completion",
    inputKey: null,
    deterministicSource: null,
    treatment:
      "The statutory-basis boxes on the proposed order state the route under which relief is sought. The normalized design records selection of the statutory basis as an item the participant completes, because choosing the route is a legal characterisation of the record."
  }),
  Object.freeze({
    name: "marijuana",
    type: "checkbox",
    widgets: Object.freeze([
      w(30, 323.35, 409, 18, 18)
    ]),
    options: Object.freeze(["Yes"]),
    multiline: false,
    ownership: "manual_participant_completion",
    inputKey: null,
    deterministicSource: null,
    treatment:
      "The statutory-basis boxes on the proposed order state the route under which relief is sought. The normalized design records selection of the statutory basis as an item the participant completes, and the marijuana and hashish counting rules remain an open legal-design question."
  }),
  Object.freeze({
    name: "orderFinalDay",
    type: "text",
    widgets: Object.freeze([
      w(30, 210.321, 165.617, 40.364, 12.894)
    ]),
    options: Object.freeze([]),
    multiline: false,
    ownership: "court_or_agency_only",
    inputKey: null,
    deterministicSource: null,
    treatment:
      "The kit's own instruction 7 directs the filer to leave the order's 'IT IS ORDERED this ___' spaces blank."
  }),
  Object.freeze({
    name: "orderFinalMnth",
    type: "dropdown",
    widgets: Object.freeze([
      w(30, 290.83, 164.679, 77.403, 15.24)
    ]),
    options: Object.freeze([" ","April","August","December","February","January","July","June","March","May","November","October","September"]),
    multiline: false,
    ownership: "court_or_agency_only",
    inputKey: null,
    deterministicSource: null,
    treatment:
      "The kit's own instruction 7 directs the filer to leave the order's 'IT IS ORDERED this ___' spaces blank."
  }),
  Object.freeze({
    name: "orderFinalYr",
    type: "text",
    widgets: Object.freeze([
      w(30, 370.418, 165.506, 40.047, 15.24)
    ]),
    options: Object.freeze([]),
    multiline: false,
    ownership: "court_or_agency_only",
    inputKey: null,
    deterministicSource: null,
    treatment:
      "The kit's own instruction 7 directs the filer to leave the order's 'IT IS ORDERED this ___' spaces blank."
  }),
  Object.freeze({
    name: "AdminMuniCts",
    type: "text",
    widgets: Object.freeze([
      w(31, 261.177, 718.113, 260.481, 15.12)
    ]),
    options: Object.freeze([]),
    multiline: false,
    ownership: "manual_participant_completion",
    inputKey: null,
    deterministicSource: null,
    treatment:
      "The service list names each county, municipality, department or institution that holds a record. The normalized design routes this to the service checklist built from the State Police history rather than to a generated value, and an omitted agency is the most common way a granted expungement fails."
  }),
  Object.freeze({
    name: "arrest1CaseNum",
    type: "text",
    widgets: Object.freeze([
      w(31, 418.607, 434.72, 104.88, 15.24)
    ]),
    options: Object.freeze([]),
    multiline: false,
    ownership: "manual_participant_completion",
    inputKey: null,
    deterministicSource: null,
    treatment:
      "The proposed order restates each arrest the court is asked to reach. The normalized design does not resolve the composite matter answer into these numbered rows, and the set of arrests placed before the court is the participant's own statement of the record."
  }),
  Object.freeze({
    name: "arrest1Dt",
    type: "text",
    widgets: Object.freeze([
      w(31, 143.197, 467.824, 68.553, 15.24)
    ]),
    options: Object.freeze([]),
    multiline: false,
    ownership: "manual_participant_completion",
    inputKey: null,
    deterministicSource: null,
    treatment:
      "The proposed order restates each arrest the court is asked to reach. The normalized design does not resolve the composite matter answer into these numbered rows, and the set of arrests placed before the court is the participant's own statement of the record."
  }),
  Object.freeze({
    name: "arrest1Statute",
    type: "text",
    widgets: Object.freeze([
      w(31, 156.005, 450.841, 113.482, 15.24)
    ]),
    options: Object.freeze([]),
    multiline: false,
    ownership: "manual_participant_completion",
    inputKey: null,
    deterministicSource: null,
    treatment:
      "The proposed order restates each arrest the court is asked to reach. The normalized design does not resolve the composite matter answer into these numbered rows, and the set of arrests placed before the court is the participant's own statement of the record."
  }),
  Object.freeze({
    name: "arrest2CaseNum",
    type: "text",
    widgets: Object.freeze([
      w(31, 420.097, 380.278, 105.186, 15.24)
    ]),
    options: Object.freeze([]),
    multiline: false,
    ownership: "manual_participant_completion",
    inputKey: null,
    deterministicSource: null,
    treatment:
      "The proposed order restates each arrest the court is asked to reach. The normalized design does not resolve the composite matter answer into these numbered rows, and the set of arrests placed before the court is the participant's own statement of the record."
  }),
  Object.freeze({
    name: "arrest2Dt",
    type: "text",
    widgets: Object.freeze([
      w(31, 139.694, 411.007, 70.43, 15.24)
    ]),
    options: Object.freeze([]),
    multiline: false,
    ownership: "manual_participant_completion",
    inputKey: null,
    deterministicSource: null,
    treatment:
      "The proposed order restates each arrest the court is asked to reach. The normalized design does not resolve the composite matter answer into these numbered rows, and the set of arrests placed before the court is the participant's own statement of the record."
  }),
  Object.freeze({
    name: "arrest2Statute",
    type: "text",
    widgets: Object.freeze([
      w(31, 153.824, 396.458, 117.895, 15.24)
    ]),
    options: Object.freeze([]),
    multiline: false,
    ownership: "manual_participant_completion",
    inputKey: null,
    deterministicSource: null,
    treatment:
      "The proposed order restates each arrest the court is asked to reach. The normalized design does not resolve the composite matter answer into these numbered rows, and the set of arrests placed before the court is the participant's own statement of the record."
  }),
  Object.freeze({
    name: "arrest3CaseNum",
    type: "text",
    widgets: Object.freeze([
      w(31, 420.138, 326.774, 104.165, 15.24)
    ]),
    options: Object.freeze([]),
    multiline: false,
    ownership: "manual_participant_completion",
    inputKey: null,
    deterministicSource: null,
    treatment:
      "The proposed order restates each arrest the court is asked to reach. The normalized design does not resolve the composite matter answer into these numbered rows, and the set of arrests placed before the court is the participant's own statement of the record."
  }),
  Object.freeze({
    name: "arrest3Dt",
    type: "text",
    widgets: Object.freeze([
      w(31, 141.571, 357.845, 70.43, 15.24)
    ]),
    options: Object.freeze([]),
    multiline: false,
    ownership: "manual_participant_completion",
    inputKey: null,
    deterministicSource: null,
    treatment:
      "The proposed order restates each arrest the court is asked to reach. The normalized design does not resolve the composite matter answer into these numbered rows, and the set of arrests placed before the court is the participant's own statement of the record."
  }),
  Object.freeze({
    name: "arrest3Statute",
    type: "text",
    widgets: Object.freeze([
      w(31, 155.548, 342.262, 114.265, 15.24)
    ]),
    options: Object.freeze([]),
    multiline: false,
    ownership: "manual_participant_completion",
    inputKey: null,
    deterministicSource: null,
    treatment:
      "The proposed order restates each arrest the court is asked to reach. The normalized design does not resolve the composite matter answer into these numbered rows, and the set of arrests placed before the court is the participant's own statement of the record."
  }),
  Object.freeze({
    name: "arrest4CaseNum",
    type: "text",
    widgets: Object.freeze([
      w(31, 419.188, 272.4, 103.227, 15.24)
    ]),
    options: Object.freeze([]),
    multiline: false,
    ownership: "manual_participant_completion",
    inputKey: null,
    deterministicSource: null,
    treatment:
      "The proposed order restates each arrest the court is asked to reach. The normalized design does not resolve the composite matter answer into these numbered rows, and the set of arrests placed before the court is the participant's own statement of the record."
  }),
  Object.freeze({
    name: "arrest4Dt",
    type: "text",
    widgets: Object.freeze([
      w(31, 143.369, 304.569, 68.553, 15.24)
    ]),
    options: Object.freeze([]),
    multiline: false,
    ownership: "manual_participant_completion",
    inputKey: null,
    deterministicSource: null,
    treatment:
      "The proposed order restates each arrest the court is asked to reach. The normalized design does not resolve the composite matter answer into these numbered rows, and the set of arrests placed before the court is the participant's own statement of the record."
  }),
  Object.freeze({
    name: "arrest4Statute",
    type: "text",
    widgets: Object.freeze([
      w(31, 156.133, 288.143, 115.531, 15.24)
    ]),
    options: Object.freeze([]),
    multiline: false,
    ownership: "manual_participant_completion",
    inputKey: null,
    deterministicSource: null,
    treatment:
      "The proposed order restates each arrest the court is asked to reach. The normalized design does not resolve the composite matter answer into these numbered rows, and the set of arrests placed before the court is the participant's own statement of the record."
  }),
  Object.freeze({
    name: "arrest5CaseNum",
    type: "text",
    widgets: Object.freeze([
      w(31, 418.382, 217.42, 105.33, 15.24)
    ]),
    options: Object.freeze([]),
    multiline: false,
    ownership: "manual_participant_completion",
    inputKey: null,
    deterministicSource: null,
    treatment:
      "The proposed order restates each arrest the court is asked to reach. The normalized design does not resolve the composite matter answer into these numbered rows, and the set of arrests placed before the court is the participant's own statement of the record."
  }),
  Object.freeze({
    name: "arrest5Dt",
    type: "text",
    widgets: Object.freeze([
      w(31, 141.029, 249.994, 69.961, 15.24)
    ]),
    options: Object.freeze([]),
    multiline: false,
    ownership: "manual_participant_completion",
    inputKey: null,
    deterministicSource: null,
    treatment:
      "The proposed order restates each arrest the court is asked to reach. The normalized design does not resolve the composite matter answer into these numbered rows, and the set of arrests placed before the court is the participant's own statement of the record."
  }),
  Object.freeze({
    name: "arrest5Statute",
    type: "text",
    widgets: Object.freeze([
      w(31, 155.628, 234.036, 116.327, 15.24)
    ]),
    options: Object.freeze([]),
    multiline: false,
    ownership: "manual_participant_completion",
    inputKey: null,
    deterministicSource: null,
    treatment:
      "The proposed order restates each arrest the court is asked to reach. The normalized design does not resolve the composite matter answer into these numbered rows, and the set of arrests placed before the court is the participant's own statement of the record."
  }),
  Object.freeze({
    name: "deputyClerkSCCOCnty",
    type: "text",
    widgets: Object.freeze([
      w(31, 209.728, 526.718, 157.212, 15.12)
    ]),
    options: Object.freeze([]),
    multiline: false,
    ownership: "manual_participant_completion",
    inputKey: null,
    deterministicSource: null,
    treatment:
      "The counties whose records the order reaches. That is the scope of relief the participant asks the court to order, and the normalized design does not resolve it."
  }),
  Object.freeze({
    name: "fjDocketNums",
    type: "text",
    widgets: Object.freeze([
      w(31, 74.206, 159.778, 443.947, 15.24),
      w(31, 383.879, 180.385, 132.311, 15.24)
    ]),
    options: Object.freeze([]),
    multiline: false,
    ownership: "manual_participant_completion",
    inputKey: null,
    deterministicSource: null,
    treatment:
      "Family Part co-delinquent docket numbers. The normalized design does not resolve the composite matter answer into this list."
  }),
  Object.freeze({
    name: "jdgmntAmt1",
    type: "text",
    widgets: Object.freeze([
      w(32, 383.549, 614.731, 115.09, 15.24)
    ]),
    options: Object.freeze([]),
    multiline: false,
    ownership: "court_or_agency_only",
    inputKey: null,
    deterministicSource: null,
    treatment:
      "The monies-owed section of the proposed order. The kit leaves it for the court to complete and the normalized design records the same treatment."
  }),
  Object.freeze({
    name: "jdgmntAmt2",
    type: "text",
    widgets: Object.freeze([
      w(32, 383.61, 572.508, 114.622, 15.24)
    ]),
    options: Object.freeze([]),
    multiline: false,
    ownership: "court_or_agency_only",
    inputKey: null,
    deterministicSource: null,
    treatment:
      "The monies-owed section of the proposed order. The kit leaves it for the court to complete and the normalized design records the same treatment."
  }),
  Object.freeze({
    name: "jdgmntAmt3",
    type: "text",
    widgets: Object.freeze([
      w(32, 382.444, 529.236, 118.376, 15.24)
    ]),
    options: Object.freeze([]),
    multiline: false,
    ownership: "court_or_agency_only",
    inputKey: null,
    deterministicSource: null,
    treatment:
      "The monies-owed section of the proposed order. The kit leaves it for the court to complete and the normalized design records the same treatment."
  }),
  Object.freeze({
    name: "jdgmntAmt4",
    type: "text",
    widgets: Object.freeze([
      w(32, 382.433, 486.543, 118.376, 15.24)
    ]),
    options: Object.freeze([]),
    multiline: false,
    ownership: "court_or_agency_only",
    inputKey: null,
    deterministicSource: null,
    treatment:
      "The monies-owed section of the proposed order. The kit leaves it for the court to complete and the normalized design records the same treatment."
  }),
  Object.freeze({
    name: "jdgmntDocket1",
    type: "text",
    widgets: Object.freeze([
      w(32, 90.275, 615.201, 182.611, 15.24)
    ]),
    options: Object.freeze([]),
    multiline: false,
    ownership: "court_or_agency_only",
    inputKey: null,
    deterministicSource: null,
    treatment:
      "The monies-owed section of the proposed order. The kit leaves it for the court to complete and the normalized design records the same treatment."
  }),
  Object.freeze({
    name: "jdgmntDocket2",
    type: "text",
    widgets: Object.freeze([
      w(32, 91.276, 572.039, 182.142, 15.24)
    ]),
    options: Object.freeze([]),
    multiline: false,
    ownership: "court_or_agency_only",
    inputKey: null,
    deterministicSource: null,
    treatment:
      "The monies-owed section of the proposed order. The kit leaves it for the court to complete and the normalized design records the same treatment."
  }),
  Object.freeze({
    name: "jdgmntDocket3",
    type: "text",
    widgets: Object.freeze([
      w(32, 88.158, 529.705, 185.428, 15.24)
    ]),
    options: Object.freeze([]),
    multiline: false,
    ownership: "court_or_agency_only",
    inputKey: null,
    deterministicSource: null,
    treatment:
      "The monies-owed section of the proposed order. The kit leaves it for the court to complete and the normalized design records the same treatment."
  }),
  Object.freeze({
    name: "jdgmntDocket4",
    type: "text",
    widgets: Object.freeze([
      w(32, 89.159, 486.543, 185.898, 15.24)
    ]),
    options: Object.freeze([]),
    multiline: false,
    ownership: "court_or_agency_only",
    inputKey: null,
    deterministicSource: null,
    treatment:
      "The monies-owed section of the proposed order. The kit leaves it for the court to complete and the normalized design records the same treatment."
  }),
  Object.freeze({
    name: "jdmnt",
    type: "checkbox",
    widgets: Object.freeze([
      w(32, 71.505, 663.474, 18, 18)
    ]),
    options: Object.freeze(["Yes"]),
    multiline: false,
    ownership: "court_or_agency_only",
    inputKey: null,
    deterministicSource: null,
    treatment:
      "The monies-owed section of the proposed order. The kit leaves it for the court to complete and the normalized design records the same treatment."
  }),
  Object.freeze({
    name: "sigFinalJdg",
    type: "text",
    widgets: Object.freeze([
      w(33, 131.249, 576.63, 192.383, 15.12)
    ]),
    options: Object.freeze([]),
    multiline: false,
    ownership: "court_or_agency_only",
    inputKey: null,
    deterministicSource: null,
    treatment:
      "The signature line of the Judge of the Superior Court of New Jersey on the expungement order."
  }),
  Object.freeze({
    name: "CoverLtrDDt",
    type: "text",
    widgets: Object.freeze([
      w(35, 393.841, 711.218, 146.618, 15.24)
    ]),
    options: Object.freeze([]),
    multiline: false,
    ownership: "not_used_by_assigned_route",
    inputKey: null,
    deterministicSource: null,
    treatment:
      "This field belongs to a kit cover letter or proof-of-notice component that this assignment does not own. The four assigned components are the petition, the accompanying verification, the order for hearing and the proposed order. The page is preserved intact and its own fields stay blank."
  }),
  Object.freeze({
    name: "enc",
    type: "text",
    widgets: Object.freeze([
      w(35, 98.089, 55.164, 287.401, 105.346)
    ]),
    options: Object.freeze([]),
    multiline: true,
    ownership: "not_used_by_assigned_route",
    inputKey: null,
    deterministicSource: null,
    treatment:
      "This field belongs to a kit cover letter or proof-of-notice component that this assignment does not own. The four assigned components are the petition, the accompanying verification, the order for hearing and the proposed order. The page is preserved intact and its own fields stay blank."
  }),
  Object.freeze({
    name: "SccAddr2",
    type: "text",
    widgets: Object.freeze([
      w(35, 191.178, 605.398, 338.651, 15.24)
    ]),
    options: Object.freeze([]),
    multiline: false,
    ownership: "not_used_by_assigned_route",
    inputKey: null,
    deterministicSource: null,
    treatment:
      "This field belongs to a kit cover letter or proof-of-notice component that this assignment does not own. The four assigned components are the petition, the accompanying verification, the order for hearing and the proposed order. The page is preserved intact and its own fields stay blank."
  }),
  Object.freeze({
    name: "SccAddrStr",
    type: "text",
    widgets: Object.freeze([
      w(35, 126.299, 626.406, 400.233, 15.24)
    ]),
    options: Object.freeze([]),
    multiline: false,
    ownership: "not_used_by_assigned_route",
    inputKey: null,
    deterministicSource: null,
    treatment:
      "This field belongs to a kit cover letter or proof-of-notice component that this assignment does not own. The four assigned components are the petition, the accompanying verification, the order for hearing and the proposed order. The page is preserved intact and its own fields stay blank."
  }),
  Object.freeze({
    name: "SccCntyName",
    type: "dropdown",
    widgets: Object.freeze([
      w(35, 126.378, 646.619, 153.499, 16.127)
    ]),
    options: Object.freeze(["  ","Atlantic","Bergen","Burlington","Camden","Cape May","Cumberland","Essex","Gloucester","Hudson","Hunterdon","Mercer","Middlesex","Monmouth","Morris","Ocean","Passaic","Salem","Somerset","Sussex","Union","Warren"]),
    multiline: false,
    ownership: "not_used_by_assigned_route",
    inputKey: null,
    deterministicSource: null,
    treatment:
      "This field belongs to a kit cover letter or proof-of-notice component that this assignment does not own. The four assigned components are the petition, the accompanying verification, the order for hearing and the proposed order. The page is preserved intact and its own fields stay blank."
  }),
  Object.freeze({
    name: "CoverLtrEDt",
    type: "text",
    widgets: Object.freeze([
      w(37, 364.234, 709.785, 139.148, 15.24)
    ]),
    options: Object.freeze([]),
    multiline: false,
    ownership: "not_used_by_assigned_route",
    inputKey: null,
    deterministicSource: null,
    treatment:
      "This field belongs to a kit cover letter or proof-of-notice component that this assignment does not own. The four assigned components are the petition, the accompanying verification, the order for hearing and the proposed order. The page is preserved intact and its own fields stay blank."
  }),
  Object.freeze({
    name: "MuniCrtsAddr2",
    type: "text",
    widgets: Object.freeze([
      w(37, 289.399, 540.878, 269.447, 13.836),
      w(42, 319.681, 545.6, 225.615, 13.837)
    ]),
    options: Object.freeze([]),
    multiline: false,
    ownership: "not_used_by_assigned_route",
    inputKey: null,
    deterministicSource: null,
    treatment:
      "This field belongs to a kit cover letter or proof-of-notice component that this assignment does not own. The four assigned components are the petition, the accompanying verification, the order for hearing and the proposed order. The page is preserved intact and its own fields stay blank."
  }),
  Object.freeze({
    name: "MuniCrtsAddrStr",
    type: "text",
    widgets: Object.freeze([
      w(37, 289.18, 573.281, 264.295, 13.836),
      w(42, 320.967, 578.9, 223.737, 13.836)
    ]),
    options: Object.freeze([]),
    multiline: false,
    ownership: "not_used_by_assigned_route",
    inputKey: null,
    deterministicSource: null,
    treatment:
      "This field belongs to a kit cover letter or proof-of-notice component that this assignment does not own. The four assigned components are the petition, the accompanying verification, the order for hearing and the proposed order. The page is preserved intact and its own fields stay blank."
  }),
  Object.freeze({
    name: "PoliceAddr2",
    type: "text",
    widgets: Object.freeze([
      w(37, 47.626, 435.434, 233.381, 13.836),
      w(42, 81.564, 437.049, 223.472, 13.836)
    ]),
    options: Object.freeze([]),
    multiline: false,
    ownership: "not_used_by_assigned_route",
    inputKey: null,
    deterministicSource: null,
    treatment:
      "This field belongs to a kit cover letter or proof-of-notice component that this assignment does not own. The four assigned components are the petition, the accompanying verification, the order for hearing and the proposed order. The page is preserved intact and its own fields stay blank."
  }),
  Object.freeze({
    name: "PoliceAddrStr",
    type: "text",
    widgets: Object.freeze([
      w(37, 48.202, 467.549, 231.399, 13.836),
      w(42, 80.924, 470.038, 223.473, 13.837)
    ]),
    options: Object.freeze([]),
    multiline: false,
    ownership: "not_used_by_assigned_route",
    inputKey: null,
    deterministicSource: null,
    treatment:
      "This field belongs to a kit cover letter or proof-of-notice component that this assignment does not own. The four assigned components are the petition, the accompanying verification, the order for hearing and the proposed order. The page is preserved intact and its own fields stay blank."
  }),
  Object.freeze({
    name: "Prob2Addr2",
    type: "text",
    widgets: Object.freeze([
      w(37, 289.175, 314.097, 269.732, 13.836),
      w(42, 319.681, 328.769, 226.554, 13.836)
    ]),
    options: Object.freeze([]),
    multiline: false,
    ownership: "not_used_by_assigned_route",
    inputKey: null,
    deterministicSource: null,
    treatment:
      "This field belongs to a kit cover letter or proof-of-notice component that this assignment does not own. The four assigned components are the petition, the accompanying verification, the order for hearing and the proposed order. The page is preserved intact and its own fields stay blank."
  }),
  Object.freeze({
    name: "Prob2AddrStr",
    type: "text",
    widgets: Object.freeze([
      w(37, 289.644, 346.481, 266.447, 13.836),
      w(42, 318.743, 361.622, 226.553, 13.837)
    ]),
    options: Object.freeze([]),
    multiline: false,
    ownership: "not_used_by_assigned_route",
    inputKey: null,
    deterministicSource: null,
    treatment:
      "This field belongs to a kit cover letter or proof-of-notice component that this assignment does not own. The four assigned components are the petition, the accompanying verification, the order for hearing and the proposed order. The page is preserved intact and its own fields stay blank."
  }),
  Object.freeze({
    name: "Prob2CntyName",
    type: "dropdown",
    widgets: Object.freeze([
      w(37, 386.858, 395.292, 167.293, 13.836),
      w(42, 422.997, 394.006, 122.236, 13.836)
    ]),
    options: Object.freeze(["  ","Atlantic","Bergen","Burlington","Camden","Cape May","Cumberland","Essex","Gloucester","Hudson","Hunterdon","Mercer","Middlesex","Monmouth","Morris","Ocean","Passaic","Salem","Somerset","Sussex","Union","Warren"]),
    multiline: false,
    ownership: "not_used_by_assigned_route",
    inputKey: null,
    deterministicSource: null,
    treatment:
      "This field belongs to a kit cover letter or proof-of-notice component that this assignment does not own. The four assigned components are the petition, the accompanying verification, the order for hearing and the proposed order. The page is preserved intact and its own fields stay blank."
  }),
  Object.freeze({
    name: "ProbAddr2",
    type: "text",
    widgets: Object.freeze([
      w(37, 47.013, 312.566, 233.381, 13.836),
      w(42, 81.394, 328.3, 223.471, 13.836)
    ]),
    options: Object.freeze([]),
    multiline: false,
    ownership: "not_used_by_assigned_route",
    inputKey: null,
    deterministicSource: null,
    treatment:
      "This field belongs to a kit cover letter or proof-of-notice component that this assignment does not own. The four assigned components are the petition, the accompanying verification, the order for hearing and the proposed order. The page is preserved intact and its own fields stay blank."
  }),
  Object.freeze({
    name: "ProbAddrStr",
    type: "text",
    widgets: Object.freeze([
      w(37, 47.013, 345.465, 231.795, 13.836),
      w(42, 81.863, 361.153, 223.472, 13.837)
    ]),
    options: Object.freeze([]),
    multiline: false,
    ownership: "not_used_by_assigned_route",
    inputKey: null,
    deterministicSource: null,
    treatment:
      "This field belongs to a kit cover letter or proof-of-notice component that this assignment does not own. The four assigned components are the petition, the accompanying verification, the order for hearing and the proposed order. The page is preserved intact and its own fields stay blank."
  }),
  Object.freeze({
    name: "ProbCntyName",
    type: "dropdown",
    widgets: Object.freeze([
      w(37, 159.161, 395.012, 117.691, 13.836),
      w(42, 185.515, 394.476, 116.605, 13.836)
    ]),
    options: Object.freeze(["  ","Atlantic","Bergen","Burlington","Camden","Cape May","Cumberland","Essex","Gloucester","Hudson","Hunterdon","Mercer","Middlesex","Monmouth","Morris","Ocean","Passaic","Salem","Somerset","Sussex","Union","Warren"]),
    multiline: false,
    ownership: "not_used_by_assigned_route",
    inputKey: null,
    deterministicSource: null,
    treatment:
      "This field belongs to a kit cover letter or proof-of-notice component that this assignment does not own. The four assigned components are the petition, the accompanying verification, the order for hearing and the proposed order. The page is preserved intact and its own fields stay blank."
  }),
  Object.freeze({
    name: "ProsAddr2",
    type: "text",
    widgets: Object.freeze([
      w(37, 45.824, 540.878, 235.363, 13.836),
      w(42, 81.394, 545.365, 223.472, 13.837)
    ]),
    options: Object.freeze([]),
    multiline: false,
    ownership: "not_used_by_assigned_route",
    inputKey: null,
    deterministicSource: null,
    treatment:
      "This field belongs to a kit cover letter or proof-of-notice component that this assignment does not own. The four assigned components are the petition, the accompanying verification, the order for hearing and the proposed order. The page is preserved intact and its own fields stay blank."
  }),
  Object.freeze({
    name: "ProsAddrStr",
    type: "text",
    widgets: Object.freeze([
      w(37, 50.004, 573.281, 223.472, 13.836),
      w(42, 81.346, 578.9, 223.941, 13.836)
    ]),
    options: Object.freeze([]),
    multiline: false,
    ownership: "not_used_by_assigned_route",
    inputKey: null,
    deterministicSource: null,
    treatment:
      "This field belongs to a kit cover letter or proof-of-notice component that this assignment does not own. The four assigned components are the petition, the accompanying verification, the order for hearing and the proposed order. The page is preserved intact and its own fields stay blank."
  }),
  Object.freeze({
    name: "ProsCntyName",
    type: "dropdown",
    widgets: Object.freeze([
      w(37, 129.01, 589.349, 143.013, 13.836),
      w(42, 152.872, 595.437, 149.584, 15.244)
    ]),
    options: Object.freeze(["  ","Atlantic","Bergen","Burlington","Camden","Cape May","Cumberland","Essex","Gloucester","Hudson","Hunterdon","Mercer","Middlesex","Monmouth","Morris","Ocean","Passaic","Salem","Somerset","Sussex","Union","Warren"]),
    multiline: false,
    ownership: "not_used_by_assigned_route",
    inputKey: null,
    deterministicSource: null,
    treatment:
      "This field belongs to a kit cover letter or proof-of-notice component that this assignment does not own. The four assigned components are the petition, the accompanying verification, the order for hearing and the proposed order. The page is preserved intact and its own fields stay blank."
  }),
  Object.freeze({
    name: "SheriffAddr2",
    type: "text",
    widgets: Object.freeze([
      w(37, 289.644, 187.847, 270.201, 13.837)
    ]),
    options: Object.freeze([]),
    multiline: false,
    ownership: "not_used_by_assigned_route",
    inputKey: null,
    deterministicSource: null,
    treatment:
      "This field belongs to a kit cover letter or proof-of-notice component that this assignment does not own. The four assigned components are the petition, the accompanying verification, the order for hearing and the proposed order. The page is preserved intact and its own fields stay blank."
  }),
  Object.freeze({
    name: "SheriffAddrStr",
    type: "text",
    widgets: Object.freeze([
      w(37, 288.705, 220.231, 270.671, 13.836)
    ]),
    options: Object.freeze([]),
    multiline: false,
    ownership: "not_used_by_assigned_route",
    inputKey: null,
    deterministicSource: null,
    treatment:
      "This field belongs to a kit cover letter or proof-of-notice component that this assignment does not own. The four assigned components are the petition, the accompanying verification, the order for hearing and the proposed order. The page is preserved intact and its own fields stay blank."
  }),
  Object.freeze({
    name: "SheriffLoc",
    type: "text",
    widgets: Object.freeze([
      w(37, 387.551, 275.683, 171.267, 13.836)
    ]),
    options: Object.freeze([]),
    multiline: false,
    ownership: "not_used_by_assigned_route",
    inputKey: null,
    deterministicSource: null,
    treatment:
      "This field belongs to a kit cover letter or proof-of-notice component that this assignment does not own. The four assigned components are the petition, the accompanying verification, the order for hearing and the proposed order. The page is preserved intact and its own fields stay blank."
  }),
  Object.freeze({
    name: "SuperintendentAddr2",
    type: "text",
    widgets: Object.freeze([
      w(37, 46.22, 187.31, 235.363, 13.837),
      w(42, 81.863, 211.436, 223.472, 13.837)
    ]),
    options: Object.freeze([]),
    multiline: false,
    ownership: "not_used_by_assigned_route",
    inputKey: null,
    deterministicSource: null,
    treatment:
      "This field belongs to a kit cover letter or proof-of-notice component that this assignment does not own. The four assigned components are the petition, the accompanying verification, the order for hearing and the proposed order. The page is preserved intact and its own fields stay blank."
  }),
  Object.freeze({
    name: "SuperintendentAddrStr",
    type: "text",
    widgets: Object.freeze([
      w(37, 48.995, 225.363, 230.21, 13.836),
      w(42, 80.455, 250.86, 223.472, 13.836)
    ]),
    options: Object.freeze([]),
    multiline: false,
    ownership: "not_used_by_assigned_route",
    inputKey: null,
    deterministicSource: null,
    treatment:
      "This field belongs to a kit cover letter or proof-of-notice component that this assignment does not own. The four assigned components are the petition, the accompanying verification, the order for hearing and the proposed order. The page is preserved intact and its own fields stay blank."
  }),
  Object.freeze({
    name: "WardenAddr2",
    type: "text",
    widgets: Object.freeze([
      w(37, 289.277, 435.237, 269.732, 13.836),
      w(42, 320.028, 437.049, 226.084, 13.836)
    ]),
    options: Object.freeze([]),
    multiline: false,
    ownership: "not_used_by_assigned_route",
    inputKey: null,
    deterministicSource: null,
    treatment:
      "This field belongs to a kit cover letter or proof-of-notice component that this assignment does not own. The four assigned components are the petition, the accompanying verification, the order for hearing and the proposed order. The page is preserved intact and its own fields stay blank."
  }),
  Object.freeze({
    name: "WardenAddrStr",
    type: "text",
    widgets: Object.freeze([
      w(37, 288.705, 468.507, 269.263, 13.836),
      w(42, 319.681, 470.038, 226.554, 13.837)
    ]),
    options: Object.freeze([]),
    multiline: false,
    ownership: "not_used_by_assigned_route",
    inputKey: null,
    deterministicSource: null,
    treatment:
      "This field belongs to a kit cover letter or proof-of-notice component that this assignment does not own. The four assigned components are the petition, the accompanying verification, the order for hearing and the proposed order. The page is preserved intact and its own fields stay blank."
  }),
  Object.freeze({
    name: "CoverLtrEHearDt",
    type: "text",
    widgets: Object.freeze([
      w(38, 197.006, 701.347, 83.69, 15.24)
    ]),
    options: Object.freeze([]),
    multiline: false,
    ownership: "court_or_agency_only",
    inputKey: null,
    deterministicSource: null,
    treatment:
      "The hearing date transcribed from the court-issued Order for Hearing. No hearing date is supplied to LegalEase."
  }),
  Object.freeze({
    name: "CoverLtrEHearTime",
    type: "text",
    widgets: Object.freeze([
      w(38, 296.974, 701.816, 67.869, 15.241)
    ]),
    options: Object.freeze([]),
    multiline: false,
    ownership: "court_or_agency_only",
    inputKey: null,
    deterministicSource: null,
    treatment:
      "The hearing time transcribed from the court-issued Order for Hearing. No hearing time is supplied to LegalEase."
  }),
  Object.freeze({
    name: "ExpungeDocketNum",
    type: "text",
    widgets: Object.freeze([
      w(38, 434.935, 725.43, 138.516, 15.24),
      w(43, 349.009, 712.306, 198.081, 15.24)
    ]),
    options: Object.freeze([]),
    multiline: false,
    ownership: "court_or_agency_only",
    inputKey: null,
    deterministicSource: null,
    treatment:
      "The expungement docket number. The kit states on its face that the space is left blank for the clerk to fill in."
  }),
  Object.freeze({
    name: "expungDocketNum",
    type: "text",
    widgets: Object.freeze([
      w(40, 449.414, 606.32, 107.887, 15.24)
    ]),
    options: Object.freeze([]),
    multiline: false,
    ownership: "court_or_agency_only",
    inputKey: null,
    deterministicSource: null,
    treatment:
      "The expungement docket number. The kit states on its face that the space is left blank for the clerk to fill in."
  }),
  Object.freeze({
    name: "mailPetition",
    type: "text",
    widgets: Object.freeze([
      w(40, 111.499, 504.474, 65.171, 15.241)
    ]),
    options: Object.freeze([]),
    multiline: false,
    ownership: "prohibited_from_generation",
    inputKey: null,
    deterministicSource: null,
    treatment:
      "The date the filed package was mailed to every agency asserts completed service. LegalEase does not complete service and does not state that service occurred."
  }),
  Object.freeze({
    name: "sigNoticeDt",
    type: "text",
    widgets: Object.freeze([
      w(40, 394.979, 101.417, 147.605, 15.241)
    ]),
    options: Object.freeze([]),
    multiline: false,
    ownership: "prohibited_from_generation",
    inputKey: null,
    deterministicSource: null,
    treatment:
      "The proof-of-notice execution date asserts completed service. LegalEase does not complete service and does not state that service occurred."
  }),
  Object.freeze({
    name: "CoverLtrGDt",
    type: "text",
    widgets: Object.freeze([
      w(42, 334.618, 718.235, 213.758, 15.24)
    ]),
    options: Object.freeze([]),
    multiline: false,
    ownership: "not_used_by_assigned_route",
    inputKey: null,
    deterministicSource: null,
    treatment:
      "This field belongs to a kit cover letter or proof-of-notice component that this assignment does not own. The four assigned components are the petition, the accompanying verification, the order for hearing and the proposed order. The page is preserved intact and its own fields stay blank."
  }),
  Object.freeze({
    name: "FamDivAddr2",
    type: "text",
    widgets: Object.freeze([
      w(42, 319.679, 95.105, 225.74, 13.836),
      w(42, 319.679, 211.968, 228.087, 14.305)
    ]),
    options: Object.freeze([]),
    multiline: false,
    ownership: "not_used_by_assigned_route",
    inputKey: null,
    deterministicSource: null,
    treatment:
      "This field belongs to a kit cover letter or proof-of-notice component that this assignment does not own. The four assigned components are the petition, the accompanying verification, the order for hearing and the proposed order. The page is preserved intact and its own fields stay blank."
  }),
  Object.freeze({
    name: "FamDivAddrStr",
    type: "text",
    widgets: Object.freeze([
      w(42, 319.795, 131.65, 225.388, 13.836)
    ]),
    options: Object.freeze([]),
    multiline: false,
    ownership: "not_used_by_assigned_route",
    inputKey: null,
    deterministicSource: null,
    treatment:
      "This field belongs to a kit cover letter or proof-of-notice component that this assignment does not own. The four assigned components are the petition, the accompanying verification, the order for hearing and the proposed order. The page is preserved intact and its own fields stay blank."
  }),
  Object.freeze({
    name: "FamDivName",
    type: "dropdown",
    widgets: Object.freeze([
      w(42, 319.59, 149.954, 132.4, 13.836)
    ]),
    options: Object.freeze(["  ","Atlantic","Bergen","Burlington","Camden","Cape May","Cumberland","Essex","Gloucester","Hudson","Hunterdon","Mercer","Middlesex","Monmouth","Morris","Ocean","Passaic","Salem","Somerset","Sussex","Union","Warren"]),
    multiline: false,
    ownership: "not_used_by_assigned_route",
    inputKey: null,
    deterministicSource: null,
    treatment:
      "This field belongs to a kit cover letter or proof-of-notice component that this assignment does not own. The four assigned components are the petition, the accompanying verification, the order for hearing and the proposed order. The page is preserved intact and its own fields stay blank."
  }),
  Object.freeze({
    name: "IdbAddrStr",
    type: "text",
    widgets: Object.freeze([
      w(42, 319.212, 245.228, 230.308, 13.836)
    ]),
    options: Object.freeze([]),
    multiline: false,
    ownership: "not_used_by_assigned_route",
    inputKey: null,
    deterministicSource: null,
    treatment:
      "This field belongs to a kit cover letter or proof-of-notice component that this assignment does not own. The four assigned components are the petition, the accompanying verification, the order for hearing and the proposed order. The page is preserved intact and its own fields stay blank."
  }),
  Object.freeze({
    name: "IdbCnty",
    type: "dropdown",
    widgets: Object.freeze([
      w(42, 320.202, 264.493, 118.521, 13.836)
    ]),
    options: Object.freeze(["  ","Atlantic","Bergen","Burlington","Camden","Cape May","Cumberland","Essex","Gloucester","Hudson","Hunterdon","Mercer","Middlesex","Monmouth","Morris","Ocean","Passaic","Salem","Somerset","Sussex","Union","Warren"]),
    multiline: false,
    ownership: "not_used_by_assigned_route",
    inputKey: null,
    deterministicSource: null,
    treatment:
      "This field belongs to a kit cover letter or proof-of-notice component that this assignment does not own. The four assigned components are the petition, the accompanying verification, the order for hearing and the proposed order. The page is preserved intact and its own fields stay blank."
  })
  ]);

type TextMapping = Readonly<{
  fieldName: string;
  inputKey: NewJerseyMappedInputKey;
  required: boolean;
  ownership:
    | "participant_supplied"
    | "derived_deterministically_from_participant_answers";
  deterministicSource: string | null;
}>;

export type NewJerseyMappedInputKey =
  | "petitionerFullLegalName"
  | "mailingAddressStreet"
  | "mailingAddressCity"
  | "mailingAddressState"
  | "mailingAddressZip"
  | "mailingAddressStateZip"
  | "contactPhone"
  | "dateOfBirth"
  | "sbiNumber";

export const NEW_JERSEY_ACROFORM_TEXT_MAPPINGS: readonly TextMapping[] =
  Object.freeze([
  Object.freeze({
    fieldName: "DefName",
    inputKey: "petitionerFullLegalName",
    required: true,
    ownership: "participant_supplied",
    deterministicSource: null
  }),
  Object.freeze({
    fieldName: "DefAddrStr",
    inputKey: "mailingAddressStreet",
    required: true,
    ownership: "participant_supplied",
    deterministicSource: null
  }),
  Object.freeze({
    fieldName: "DefAddr2",
    inputKey: "mailingAddressCity",
    required: true,
    ownership: "participant_supplied",
    deterministicSource: null
  }),
  Object.freeze({
    fieldName: "DefAddr3",
    inputKey: "mailingAddressStateZip",
    required: true,
    ownership: "derived_deterministically_from_participant_answers",
    deterministicSource: "mailingAddressState and mailingAddressZip joined by a single space, because the caption block exposes one combined state-and-zip blank."
  }),
  Object.freeze({
    fieldName: "DefAddrStr2",
    inputKey: "mailingAddressStreet",
    required: true,
    ownership: "derived_deterministically_from_participant_answers",
    deterministicSource: "Exact copy of mailingAddressStreet already written to the caption block."
  }),
  Object.freeze({
    fieldName: "DefAddrCity",
    inputKey: "mailingAddressCity",
    required: true,
    ownership: "derived_deterministically_from_participant_answers",
    deterministicSource: "Exact copy of mailingAddressCity already written to the caption block."
  }),
  Object.freeze({
    fieldName: "DefAddrSt",
    inputKey: "mailingAddressState",
    required: true,
    ownership: "participant_supplied",
    deterministicSource: null
  }),
  Object.freeze({
    fieldName: "DefAddrZip",
    inputKey: "mailingAddressZip",
    required: true,
    ownership: "participant_supplied",
    deterministicSource: null
  }),
  Object.freeze({
    fieldName: "DefPhone",
    inputKey: "contactPhone",
    required: false,
    ownership: "participant_supplied",
    deterministicSource: null
  }),
  Object.freeze({
    fieldName: "DefBirthDt",
    inputKey: "dateOfBirth",
    required: true,
    ownership: "participant_supplied",
    deterministicSource: null
  }),
  Object.freeze({
    fieldName: "DefSbiNum",
    inputKey: "sbiNumber",
    required: false,
    ownership: "participant_supplied",
    deterministicSource: null
  })
  ]);

export type NewJerseyTechnicalFixture = Readonly<{
  fixtureId: string;
  trackId: NewJerseyAcroformTrackId;
  intent: string;
  facts: Readonly<Record<string, unknown>>;
}>;

/**
 * Deterministic synthetic fixtures. No real participant information appears
 * here and no fixture asserts an eligibility conclusion, a court finding or a
 * completed service step.
 */
export const NEW_JERSEY_ACROFORM_TECHNICAL_FIXTURES: readonly NewJerseyTechnicalFixture[] =
  Object.freeze([
    Object.freeze({
      fixtureId: "nj-arrest-no-conviction-standard",
      trackId: "nj_arrest_no_conviction",
      intent:
        "Every mapped identity and contact value supplied, including both conditional values.",
      facts: Object.freeze({
        petitionerFullLegalName: "Jordan Example",
        dateOfBirth: "02/03/1984",
        sbiNumber: "000000000A",
        mailingAddressStreet: "12 Sample Street",
        mailingAddressCity: "Trenton",
        mailingAddressState: "NJ",
        mailingAddressZip: "08608",
        contactPhone: "609-555-0142"
      })
    }),
    Object.freeze({
      fixtureId: "nj-arrest-no-conviction-optional-blank",
      trackId: "nj_arrest_no_conviction",
      intent:
        "Both conditional values omitted, so the SBI and telephone blanks stay empty without placeholder text.",
      facts: Object.freeze({
        petitionerFullLegalName: "Casey Sample",
        dateOfBirth: "11/12/1979",
        mailingAddressStreet: "9 Fixture Avenue",
        mailingAddressCity: "Camden",
        mailingAddressState: "NJ",
        mailingAddressZip: "08102"
      })
    }),
    Object.freeze({
      fixtureId: "nj-clean-slate-standard",
      trackId: "nj_clean_slate",
      intent:
        "Clean Slate route. The statutory-basis box on the proposed order stays unchecked.",
      facts: Object.freeze({
        petitionerFullLegalName: "Riley Placeholder",
        dateOfBirth: "07/19/1971",
        sbiNumber: "111111111B",
        mailingAddressStreet: "4400 Synthetic Boulevard",
        mailingAddressCity: "Newark",
        mailingAddressState: "NJ",
        mailingAddressZip: "07102",
        contactPhone: "973-555-0118"
      })
    }),
    Object.freeze({
      fixtureId: "nj-disorderly-persons-standard",
      trackId: "nj_disorderly_persons",
      intent:
        "Disorderly persons route with a two-line synthetic street address value.",
      facts: Object.freeze({
        petitionerFullLegalName: "Morgan Testcase",
        dateOfBirth: "01/05/1990",
        sbiNumber: "222222222C",
        mailingAddressStreet: "77 Placeholder Lane, Apt 4B",
        mailingAddressCity: "Paterson",
        mailingAddressState: "NJ",
        mailingAddressZip: "07501",
        contactPhone: "862-555-0193"
      })
    }),
    Object.freeze({
      fixtureId: "nj-indictable-conviction-standard",
      trackId: "nj_indictable_conviction",
      intent:
        "Indictable route. The compelling-circumstances boxes and narrative stay blank.",
      facts: Object.freeze({
        petitionerFullLegalName: "Avery Synthetic",
        dateOfBirth: "09/30/1966",
        sbiNumber: "333333333D",
        mailingAddressStreet: "1 Example Court",
        mailingAddressCity: "Jersey City",
        mailingAddressState: "NJ",
        mailingAddressZip: "07302",
        contactPhone: "201-555-0177"
      })
    }),
    Object.freeze({
      fixtureId: "nj-indictable-conviction-long-name-reduction",
      trackId: "nj_indictable_conviction",
      intent:
        "A long legal name that exceeds the narrowest DefName widget at the first ladder size and is placed only after deterministic font reduction.",
      facts: Object.freeze({
        petitionerFullLegalName:
          "Alexandria Bartholomew Fitzgerald-Montgomery Rivers",
        dateOfBirth: "04/22/1958",
        sbiNumber: "444444444E",
        mailingAddressStreet: "250 Longvalue Terrace",
        mailingAddressCity: "New Brunswick",
        mailingAddressState: "NJ",
        mailingAddressZip: "08901",
        contactPhone: "732-555-0155"
      })
    }),
    Object.freeze({
      fixtureId: "nj-ordinance-standard",
      trackId: "nj_ordinance",
      intent:
        "Municipal ordinance route with every mapped value supplied.",
      facts: Object.freeze({
        petitionerFullLegalName: "Quinn Fixture",
        dateOfBirth: "12/01/1987",
        sbiNumber: "555555555F",
        mailingAddressStreet: "18 Ordinance Way",
        mailingAddressCity: "Atlantic City",
        mailingAddressState: "NJ",
        mailingAddressZip: "08401",
        contactPhone: "609-555-0164"
      })
    })
  ]);

export const NEW_JERSEY_ACROFORM_EXPECTED_FIXTURE_HASHES = Object.freeze({
  "nj-arrest-no-conviction-standard":
    "9f71b50c62466747c5da74ca85fa6eb797682c5f1476aeb13acc7d8a4cce4f71",
  "nj-arrest-no-conviction-optional-blank":
    "40a7d40c214198fb2b6cbe7a2f5ab57d78a3734b2da260655c799b46bcfb987d",
  "nj-clean-slate-standard":
    "c6088d04d4d8ff2351df87707fd8982be27321ed505d6bf1f8ed8ce824d2b8f9",
  "nj-disorderly-persons-standard":
    "e35c4a40af9cc09f83dc44be308609b093eb44523798f3187df36d36ed60ebc9",
  "nj-indictable-conviction-standard":
    "ae70102977ad2faac1cc58f8975f4594e688ba014fe81b1de9fd8a70b80e53c4",
  "nj-indictable-conviction-long-name-reduction":
    "9ae068e52e792700ffffa699b3feaf7a26ddbbb0a8f0085747a01a6afcb924a1",
  "nj-ordinance-standard":
    "c920690c000a5b55550d050305acd80a03cf9197b99a2fdee20f8f7d41bbad95"
});

/**
 * Participant answers the normalized New Jersey design establishes and this
 * renderer consumes. mailingAddressStateZip is not collected; it is composed
 * deterministically from mailingAddressState and mailingAddressZip because the
 * kit's caption block exposes one combined blank.
 */
export const NEW_JERSEY_ACROFORM_PARTICIPANT_KEYS = Object.freeze([
  "petitionerFullLegalName",
  "dateOfBirth",
  "sbiNumber",
  "mailingAddressStreet",
  "mailingAddressCity",
  "mailingAddressState",
  "mailingAddressZip",
  "contactPhone"
] as const);

/**
 * Normalized answers the design collects for these tracks that this renderer
 * deliberately does not write to any field. They drive eligibility screening
 * and the guidance components, not the official form face.
 */
export const NEW_JERSEY_ACROFORM_UNWRITTEN_DESIGN_KEYS = Object.freeze([
  "residenceCounty",
  "matterDetails",
  "allConvictions",
  "pendingCharges",
  "priorExpungement",
  "diversion",
  "title39",
  "financialAssessment",
  "sentenceCompletion",
  "allCountsResolved",
  "grading",
  "singleJudgment",
  "closelyRelated",
  "marijuanaCounts",
  "drugCrimeRoute",
  "offenceCount",
  "anyCrime",
  "singleDay"
] as const);

export class NewJerseyAcroformError extends Error {
  constructor(
    readonly code:
      | "ambiguous_field_written"
      | "content_overflow"
      | "field_not_found"
      | "field_type_mismatch"
      | "invalid_materialization_root"
      | "missing_required_input"
      | "protected_field_modified"
      | "protected_input"
      | "source_hash_mismatch"
      | "source_media_type_mismatch"
      | "source_missing"
      | "source_structure_mismatch"
      | "source_unreadable"
      | "unsupported_track",
    message: string,
    readonly detail: Readonly<Record<string, unknown>> = {}
  ) {
    super(message);
    this.name = "NewJerseyAcroformError";
  }
}

export type NewJerseyRenderedDocument = Readonly<{
  documentId: "CN-10557";
  documentRole: "PACKET";
  logicalComponentIds: readonly string[];
  logicalComponentRoles: readonly NewJerseyComponentRole[];
  physicalCopyCount: 1;
  bytes: Uint8Array;
  sha256: string;
  sourceSha256: string;
  sourceIdentityKey: "rcap-nj-cn-10557-814e1397cd";
  pageCount: 43;
  mappedFieldNames: readonly string[];
  protectedFieldNames: readonly string[];
}>;

export type NewJerseyTrackRenderResult = Readonly<{
  trackId: NewJerseyAcroformTrackId;
  physicalDocuments: readonly [NewJerseyRenderedDocument];
  logicalComponentOrder: readonly string[];
  runtimeDisabled: true;
  packetReady: false;
  counselAdopted: false;
  releaseActive: false;
  technicalFixtureOnly: true;
}>;

function sha256(bytes: Uint8Array): string {
  return crypto.createHash("sha256").update(bytes).digest("hex");
}

function nearlyEqual(left: number, right: number): boolean {
  return Math.abs(left - right) <= RECT_TOLERANCE;
}

function sortedUnique(values: readonly string[]): string {
  return JSON.stringify([...new Set(values)].sort());
}

/**
 * The kit attaches several fields to many widgets, and the order of the
 * annotation Kids array is not the order the inspection report records. Widget
 * sets are therefore compared as canonically ordered geometry rather than
 * positionally, so a reordering of equivalent annotations is not read as a
 * changed source.
 */
function canonicalWidgets(
  widgets: readonly NewJerseyAcroformWidget[]
): readonly NewJerseyAcroformWidget[] {
  return [...widgets].sort(
    (left, right) =>
      left.page - right.page ||
      left.x - right.x ||
      left.y - right.y ||
      left.width - right.width ||
      left.height - right.height
  );
}

function widgetSetsMatch(
  actual: readonly NewJerseyAcroformWidget[],
  expected: readonly NewJerseyAcroformWidget[]
): boolean {
  if (actual.length !== expected.length) return false;
  const left = canonicalWidgets(actual);
  const right = canonicalWidgets(expected);
  return left.every(
    (entry, index) =>
      entry.page === right[index].page &&
      nearlyEqual(entry.x, right[index].x) &&
      nearlyEqual(entry.y, right[index].y) &&
      nearlyEqual(entry.width, right[index].width) &&
      nearlyEqual(entry.height, right[index].height)
  );
}

function widgetsFor(
  document: PDFDocument,
  field: PDFField
): readonly NewJerseyAcroformWidget[] {
  const pagesByReference = new Map(
    document.getPages().map((page, index) => [page.ref.toString(), index + 1])
  );
  return field.acroField.getWidgets().map((entry) => {
    const rectangle = entry.getRectangle();
    const page = pagesByReference.get(entry.P()?.toString() ?? "");
    if (!page) {
      throw new NewJerseyAcroformError(
        "source_structure_mismatch",
        `${field.getName()} has a widget that is not attached to a kit page.`,
        { fieldName: field.getName() }
      );
    }
    return {
      page,
      x: rectangle.x,
      y: rectangle.y,
      width: rectangle.width,
      height: rectangle.height
    };
  });
}

function assertPageGeometry(document: PDFDocument): void {
  const requirement = NEW_JERSEY_ACROFORM_SOURCE_REQUIREMENT;
  if (document.getPageCount() !== requirement.expectedPageCount) {
    throw new NewJerseyAcroformError(
      "source_structure_mismatch",
      "The New Jersey kit page count differs from its assignment.",
      {
        expected: requirement.expectedPageCount,
        actual: document.getPageCount()
      }
    );
  }
  for (let index = 0; index < requirement.expectedPageCount; index += 1) {
    const page = document.getPage(index);
    const media = page.getMediaBox();
    const crop = page.getCropBox();
    if (
      !nearlyEqual(media.x, 0) ||
      !nearlyEqual(media.y, 0) ||
      !nearlyEqual(media.width, EXPECTED_PAGE_WIDTH) ||
      !nearlyEqual(media.height, EXPECTED_PAGE_HEIGHT) ||
      !nearlyEqual(crop.x, 0) ||
      !nearlyEqual(crop.y, 0) ||
      !nearlyEqual(crop.width, EXPECTED_PAGE_WIDTH) ||
      !nearlyEqual(crop.height, EXPECTED_PAGE_HEIGHT) ||
      page.getRotation().angle !== EXPECTED_PAGE_ROTATION
    ) {
      throw new NewJerseyAcroformError(
        "source_structure_mismatch",
        `CN-10557 page ${index + 1} geometry differs from its assignment.`,
        { page: index + 1 }
      );
    }
  }
}

function fieldMatchesType(
  field: PDFField,
  expected: NewJerseyAcroformFieldType
): boolean {
  if (expected === "text") return field instanceof PDFTextField;
  if (expected === "checkbox") return field instanceof PDFCheckBox;
  if (expected === "dropdown") return field instanceof PDFDropdown;
  return field instanceof PDFButton;
}

/**
 * Every dropdown in the kit ships selected on its own blank placeholder option
 * rather than on no selection at all. The authored export value of that
 * placeholder is the field's unfilled state, so it is recorded here and an
 * untouched dropdown is one that still carries it.
 */
export const NEW_JERSEY_ACROFORM_AUTHORED_DROPDOWN_SELECTIONS = Object.freeze({
  ExpungeCntyName: "00",
  FamDivName: "00",
  IdbCnty: "00",
  Prob2CntyName: "00",
  ProbCntyName: "00",
  ProsCntyName: "00",
  SccCntyName: "00",
  contGuiltyTimeType: "0",
  guiltyTimeType: "0",
  hearMnth: "0",
  hearTimeM: "0",
  notaryMnth: "0",
  orderFinalMnth: "0",
  orderHearMnth: "0"
}) as Readonly<Record<string, string>>;

function fieldIsBlank(field: PDFField): boolean {
  if (field instanceof PDFTextField) return (field.getText() ?? "") === "";
  if (field instanceof PDFCheckBox) return field.isChecked() === false;
  if (field instanceof PDFDropdown) {
    const authored =
      NEW_JERSEY_ACROFORM_AUTHORED_DROPDOWN_SELECTIONS[field.getName()];
    const selected = field.getSelected();
    if (authored === undefined) return selected.length === 0;
    return selected.length === 1 && selected[0] === authored;
  }
  return true;
}

function actualOptions(field: PDFField): readonly string[] {
  if (field instanceof PDFDropdown) return field.getOptions();
  if (field instanceof PDFCheckBox) {
    return field.acroField.getWidgets().map((entry) => {
      const value = entry.getOnValue();
      return value ? value.asString().replace(/^\//u, "") : "";
    });
  }
  return [];
}

function assertExactInventory(
  document: PDFDocument,
  requireBlankCompletionFields: boolean
): void {
  const requirement = NEW_JERSEY_ACROFORM_SOURCE_REQUIREMENT;
  const form = document.getForm();
  if (form.hasXFA()) {
    throw new NewJerseyAcroformError(
      "source_structure_mismatch",
      "The assigned New Jersey kit unexpectedly contains XFA."
    );
  }
  const actualFields = form.getFields();
  if (actualFields.length !== requirement.expectedTotalAcroformFieldCount) {
    throw new NewJerseyAcroformError(
      "source_structure_mismatch",
      "The New Jersey AcroForm field count differs from its inspected inventory.",
      {
        expected: requirement.expectedTotalAcroformFieldCount,
        actual: actualFields.length
      }
    );
  }
  const byName = new Map(actualFields.map((field) => [field.getName(), field]));
  if (byName.size !== actualFields.length) {
    throw new NewJerseyAcroformError(
      "source_structure_mismatch",
      "The New Jersey kit contains duplicate fully qualified field names."
    );
  }
  for (const expected of NEW_JERSEY_ACROFORM_FIELD_INVENTORY) {
    const field = byName.get(expected.name);
    if (!field) {
      throw new NewJerseyAcroformError(
        "field_not_found",
        `${expected.name} is absent from CN-10557.`,
        { fieldName: expected.name }
      );
    }
    if (!fieldMatchesType(field, expected.type)) {
      throw new NewJerseyAcroformError(
        "field_type_mismatch",
        `${expected.name} has a different field type than the inspected source.`,
        { fieldName: expected.name, expectedType: expected.type }
      );
    }
    const widgets = widgetsFor(document, field);
    if (!widgetSetsMatch(widgets, expected.widgets)) {
      throw new NewJerseyAcroformError(
        "source_structure_mismatch",
        `${expected.name} widget geometry differs from the inspected source.`,
        { fieldName: expected.name }
      );
    }
    if (
      field instanceof PDFTextField &&
      field.isMultiline() !== expected.multiline
    ) {
      throw new NewJerseyAcroformError(
        "source_structure_mismatch",
        `${expected.name} multiline state differs from the inspected source.`,
        { fieldName: expected.name }
      );
    }
    if (
      expected.type !== "text" &&
      expected.type !== "button" &&
      sortedUnique(actualOptions(field)) !== sortedUnique(expected.options)
    ) {
      throw new NewJerseyAcroformError(
        "source_structure_mismatch",
        `${expected.name} option set differs from the inspected source.`,
        { fieldName: expected.name }
      );
    }
    if (
      requireBlankCompletionFields &&
      expected.type !== "button" &&
      !fieldIsBlank(field)
    ) {
      throw new NewJerseyAcroformError(
        "source_structure_mismatch",
        `${expected.name} is not blank in the controlling source.`,
        { fieldName: expected.name }
      );
    }
    byName.delete(expected.name);
  }
  if (byName.size > 0) {
    throw new NewJerseyAcroformError(
      "source_structure_mismatch",
      "The New Jersey kit contains unclassified fields.",
      { fieldNames: [...byName.keys()] }
    );
  }
}

function assertSealedBoundary(root: string, destination: string): void {
  let rootStat: fs.Stats;
  try {
    rootStat = fs.lstatSync(root);
  } catch {
    throw new NewJerseyAcroformError(
      "invalid_materialization_root",
      "The source materialization root does not exist."
    );
  }
  if (
    !rootStat.isDirectory() ||
    rootStat.isSymbolicLink() ||
    (rootStat.mode & 0o777) !== 0o555
  ) {
    throw new NewJerseyAcroformError(
      "invalid_materialization_root",
      "The source materialization root is not a sealed read-only directory."
    );
  }
  let current = path.dirname(destination);
  while (true) {
    const stat = fs.lstatSync(current);
    if (
      !stat.isDirectory() ||
      stat.isSymbolicLink() ||
      (stat.mode & 0o777) !== 0o555
    ) {
      throw new NewJerseyAcroformError(
        "invalid_materialization_root",
        "A source materialization directory is not sealed.",
        { path: current }
      );
    }
    if (current === root) break;
    const parent = path.dirname(current);
    if (parent === current) {
      throw new NewJerseyAcroformError(
        "invalid_materialization_root",
        "The assigned source escapes the materialization root."
      );
    }
    current = parent;
  }
}

export async function verifyNewJerseyAcroformSource(input: {
  materializationRoot: string;
}): Promise<
  Readonly<{
    absolutePath: string;
    bytes: Uint8Array;
    sha256: string;
    pageCount: 43;
    fieldNames: readonly string[];
  }>
> {
  const requirement = NEW_JERSEY_ACROFORM_SOURCE_REQUIREMENT;
  const root = path.resolve(input.materializationRoot);
  const absolutePath = path.resolve(
    root,
    ...requirement.materializationDestination.split("/")
  );
  const relative = path.relative(root, absolutePath);
  if (
    relative === "" ||
    relative === ".." ||
    relative.startsWith(`..${path.sep}`) ||
    path.isAbsolute(relative)
  ) {
    throw new NewJerseyAcroformError(
      "invalid_materialization_root",
      "The assigned source escapes the portable source contract."
    );
  }
  assertSealedBoundary(root, absolutePath);
  let stat: fs.Stats;
  try {
    stat = fs.lstatSync(absolutePath);
  } catch {
    throw new NewJerseyAcroformError(
      "source_missing",
      "The receipt-bound New Jersey source is absent.",
      { sourceIdentityKey: requirement.sourceIdentityKey }
    );
  }
  if (
    !stat.isFile() ||
    stat.isSymbolicLink() ||
    stat.nlink !== 1 ||
    (stat.mode & 0o777) !== 0o444
  ) {
    throw new NewJerseyAcroformError(
      "source_structure_mismatch",
      "The assigned New Jersey source is not a read-only regular file."
    );
  }
  const realPath = fs.realpathSync(absolutePath);
  const realRelative = path.relative(root, realPath);
  if (
    realRelative === ".." ||
    realRelative.startsWith(`..${path.sep}`) ||
    path.isAbsolute(realRelative)
  ) {
    throw new NewJerseyAcroformError(
      "invalid_materialization_root",
      "The assigned New Jersey source resolves outside the portable source contract."
    );
  }
  if (stat.size !== requirement.expectedBytes) {
    throw new NewJerseyAcroformError(
      "source_hash_mismatch",
      "The New Jersey source byte count differs from its receipt.",
      { expected: requirement.expectedBytes, actual: stat.size }
    );
  }
  const bytes = new Uint8Array(fs.readFileSync(absolutePath));
  if (Buffer.from(bytes.subarray(0, 5)).toString("ascii") !== "%PDF-") {
    throw new NewJerseyAcroformError(
      "source_media_type_mismatch",
      "The assigned New Jersey source is not a PDF."
    );
  }
  const actualSha256 = sha256(bytes);
  if (actualSha256 !== requirement.expectedSha256) {
    throw new NewJerseyAcroformError(
      "source_hash_mismatch",
      "The New Jersey source hash differs from its receipt.",
      { expected: requirement.expectedSha256, actual: actualSha256 }
    );
  }
  const latin = Buffer.from(bytes).toString("latin1");
  if (/\/Encrypt\b/u.test(latin) || /\/XFA\b/u.test(latin)) {
    throw new NewJerseyAcroformError(
      "source_structure_mismatch",
      "The assigned New Jersey source is encrypted or XFA.",
      {
        encrypted: /\/Encrypt\b/u.test(latin),
        xfa: /\/XFA\b/u.test(latin)
      }
    );
  }
  let document: PDFDocument;
  try {
    document = await PDFDocument.load(bytes, LOAD_OPTIONS);
  } catch (error) {
    throw new NewJerseyAcroformError(
      "source_unreadable",
      "The assigned New Jersey source cannot be parsed.",
      { reason: String((error as Error)?.message ?? "").slice(0, 160) }
    );
  }
  assertPageGeometry(document);
  assertExactInventory(document, true);
  return {
    absolutePath,
    bytes,
    sha256: actualSha256,
    pageCount: 43,
    fieldNames: Object.freeze(
      document
        .getForm()
        .getFields()
        .map((field) => field.getName())
    )
  };
}

function isSupplied(value: unknown): boolean {
  return value !== undefined && value !== null && String(value).trim() !== "";
}

const PROTECTED_INPUT_KEYS = Object.freeze([
  "signature",
  "petitionerSignature",
  "signatureDate",
  "notary",
  "notaryName",
  "notarySignature",
  "notaryDay",
  "notaryMonth",
  "notaryYear",
  "judge",
  "judgeName",
  "judgeSignature",
  "clerk",
  "clerkSignature",
  "expungementDocketNumber",
  "hearingDate",
  "hearingTime",
  "orderDate",
  "courtDecision",
  "granted",
  "denied",
  "prosecutorResponse",
  "serviceCompleted",
  "serviceDate",
  "mailingDate",
  "compellingCircumstances",
  "statutoryBasis",
  "eligibilityConclusion"
]);

function assertNoProtectedInputs(
  facts: Readonly<Record<string, unknown>>
): void {
  const supplied = PROTECTED_INPUT_KEYS.filter((key) => isSupplied(facts[key]));
  if (supplied.length > 0) {
    throw new NewJerseyAcroformError(
      "protected_input",
      "The New Jersey technical renderer does not accept execution, court, outside-party or legal-conclusion values.",
      { supplied }
    );
  }
}

function resolveValue(
  mapping: TextMapping,
  facts: Readonly<Record<string, unknown>>
): string | null {
  if (mapping.inputKey === "mailingAddressStateZip") {
    const state = facts.mailingAddressState;
    const zip = facts.mailingAddressZip;
    if (!isSupplied(state) || !isSupplied(zip)) {
      throw new NewJerseyAcroformError(
        "missing_required_input",
        "mailingAddressState and mailingAddressZip are both required for the CN-10557 caption block.",
        { inputKey: mapping.inputKey }
      );
    }
    return `${String(state).trim()} ${String(zip).trim()}`;
  }
  const raw = facts[mapping.inputKey];
  if (!isSupplied(raw)) {
    if (!mapping.required) return null;
    throw new NewJerseyAcroformError(
      "missing_required_input",
      `The established participant input ${mapping.inputKey} is required for CN-10557.`,
      { inputKey: mapping.inputKey }
    );
  }
  return String(raw).trim();
}

/**
 * The kit repeats several caption values across widgets of different widths.
 * The narrowest widget governs, and the font is reduced deterministically down
 * a fixed ladder before the renderer refuses a value that cannot be shown
 * legibly in every position it occupies.
 */
function resolveFontSize(
  inventory: NewJerseyAcroformFieldInventory,
  field: PDFTextField,
  value: string,
  font: PDFFont
): number {
  const availableWidth =
    Math.min(...inventory.widgets.map((entry) => entry.width)) -
    FIELD_HORIZONTAL_PADDING;
  const maxLength = field.getMaxLength();
  if (
    typeof maxLength === "number" &&
    maxLength > 0 &&
    value.length > maxLength
  ) {
    throw new NewJerseyAcroformError(
      "content_overflow",
      "Participant text exceeds the controlling New Jersey field's maximum length.",
      { fieldName: inventory.name, maxLength, actualLength: value.length }
    );
  }
  for (const size of FIELD_FONT_SIZE_LADDER) {
    if (font.widthOfTextAtSize(value, size) <= availableWidth) return size;
  }
  throw new NewJerseyAcroformError(
    "content_overflow",
    "Participant text does not fit legibly in the narrowest widget of the controlling New Jersey field.",
    {
      fieldName: inventory.name,
      availableWidth: Number(availableWidth.toFixed(2)),
      requiredWidth: Number(
        font
          .widthOfTextAtSize(
            value,
            FIELD_FONT_SIZE_LADDER[FIELD_FONT_SIZE_LADDER.length - 1]
          )
          .toFixed(2)
      ),
      smallestFontSize:
        FIELD_FONT_SIZE_LADDER[FIELD_FONT_SIZE_LADDER.length - 1]
    }
  );
}

function assertOnlyMappedFieldsWritten(
  document: PDFDocument,
  expectedValues: ReadonlyMap<string, string>
): void {
  const form = document.getForm();
  for (const inventory of NEW_JERSEY_ACROFORM_FIELD_INVENTORY) {
    if (inventory.type === "button") continue;
    const field = form.getField(inventory.name);
    const expected = expectedValues.get(inventory.name);
    if (expected !== undefined) {
      if (
        !(field instanceof PDFTextField) ||
        (field.getText() ?? "") !== expected
      ) {
        throw new NewJerseyAcroformError(
          "protected_field_modified",
          `${inventory.name} did not preserve its mapped value.`,
          { fieldName: inventory.name }
        );
      }
      continue;
    }
    if (!fieldIsBlank(field)) {
      throw new NewJerseyAcroformError(
        "protected_field_modified",
        `${inventory.name} must remain blank for manual, outside-party, court or unassigned completion.`,
        { fieldName: inventory.name, ownership: inventory.ownership }
      );
    }
  }
  for (const ambiguous of NEW_JERSEY_ACROFORM_AMBIGUOUS_FIELD_NAMES) {
    if (expectedValues.has(ambiguous.name)) {
      throw new NewJerseyAcroformError(
        "ambiguous_field_written",
        `${ambiguous.name} carries semantically distinct blanks and must never be written.`,
        { fieldName: ambiguous.name }
      );
    }
  }
}

export async function renderNewJerseyAcroformDocument(input: {
  materializationRoot: string;
  trackId: NewJerseyAcroformTrackId;
  facts: Readonly<Record<string, unknown>>;
}): Promise<NewJerseyRenderedDocument> {
  assertNoProtectedInputs(input.facts);
  const source = await verifyNewJerseyAcroformSource({
    materializationRoot: input.materializationRoot
  });
  const document = await PDFDocument.load(source.bytes, LOAD_OPTIONS);
  const form = document.getForm();
  const font = await document.embedFont(StandardFonts.Helvetica);
  const expectedValues = new Map<string, string>();
  const written: PDFTextField[] = [];

  for (const mapping of NEW_JERSEY_ACROFORM_TEXT_MAPPINGS) {
    const value = resolveValue(mapping, input.facts);
    if (value === null) continue;
    let field: PDFField;
    try {
      field = form.getField(mapping.fieldName);
    } catch {
      throw new NewJerseyAcroformError(
        "field_not_found",
        `${mapping.fieldName} is absent from CN-10557.`,
        { fieldName: mapping.fieldName }
      );
    }
    if (!(field instanceof PDFTextField)) {
      throw new NewJerseyAcroformError(
        "field_type_mismatch",
        `${mapping.fieldName} is not a text field.`,
        { fieldName: mapping.fieldName }
      );
    }
    const inventory = NEW_JERSEY_ACROFORM_FIELD_INVENTORY.find(
      (candidate) => candidate.name === mapping.fieldName
    );
    if (!inventory) {
      throw new NewJerseyAcroformError(
        "field_not_found",
        `${mapping.fieldName} is absent from the declared inventory.`,
        { fieldName: mapping.fieldName }
      );
    }
    /**
     * Several widgets of the shared caption fields carry their own default
     * appearance at the kit's authored 14pt. A widget-level default overrides
     * the field-level one, so a value sized for the narrowest widget would
     * still be drawn at 14pt there and clipped. The widget-level defaults of a
     * written field are removed so every one of its widgets inherits the single
     * size resolved from its narrowest box. Fields this renderer never writes
     * keep their authored defaults untouched.
     */
    const fontSize = resolveFontSize(inventory, field, value, font);
    for (const widget of field.acroField.getWidgets()) {
      widget.dict.delete(PDFName.of("DA"));
    }
    field.acroField.setDefaultAppearance(`/Helv ${fontSize} Tf 0 g`);
    field.setText(value);
    written.push(field);
    expectedValues.set(mapping.fieldName, value);
  }

  assertOnlyMappedFieldsWritten(document, expectedValues);
  /**
   * Appearances are regenerated only for the fields this renderer wrote.
   * Refreshing the whole form would rebuild the appearance streams of every
   * untouched checkbox and dropdown as well, which visibly redraws official
   * blanks the participant, an outside party or the court must complete.
   */
  for (const field of written) field.updateAppearances(font);
  document.setModificationDate(DETERMINISTIC_TIMESTAMP);
  document.setProducer("LegalEase technical fixture");
  const bytes = await document.save({
    addDefaultPage: false,
    updateFieldAppearances: false
  });
  const reopened = await PDFDocument.load(bytes, LOAD_OPTIONS);
  assertPageGeometry(reopened);
  assertExactInventory(reopened, false);
  assertOnlyMappedFieldsWritten(reopened, expectedValues);

  const protectedFieldNames = NEW_JERSEY_ACROFORM_FIELD_INVENTORY.filter(
    (entry) => entry.type !== "button" && !expectedValues.has(entry.name)
  ).map((entry) => entry.name);

  return {
    documentId: "CN-10557",
    documentRole: "PACKET",
    logicalComponentIds: NEW_JERSEY_ACROFORM_COMPONENT_IDS_BY_TRACK[
      input.trackId
    ],
    logicalComponentRoles: NEW_JERSEY_ACROFORM_COMPONENT_ROLE_ORDER,
    physicalCopyCount: 1,
    bytes,
    sha256: sha256(bytes),
    sourceSha256: source.sha256,
    sourceIdentityKey:
      NEW_JERSEY_ACROFORM_SOURCE_REQUIREMENT.sourceIdentityKey,
    pageCount: 43,
    mappedFieldNames: Object.freeze([...expectedValues.keys()]),
    protectedFieldNames: Object.freeze(protectedFieldNames)
  };
}

export async function renderNewJerseyAcroformTrack(input: {
  materializationRoot: string;
  trackId: NewJerseyAcroformTrackId;
  facts: Readonly<Record<string, unknown>>;
}): Promise<NewJerseyTrackRenderResult> {
  if (!NEW_JERSEY_ACROFORM_TRACK_IDS.includes(input.trackId)) {
    throw new NewJerseyAcroformError(
      "unsupported_track",
      `The New Jersey AcroForm assignment does not include ${input.trackId}.`,
      { trackId: input.trackId }
    );
  }
  const document = await renderNewJerseyAcroformDocument({
    materializationRoot: input.materializationRoot,
    trackId: input.trackId,
    facts: input.facts
  });
  return {
    trackId: input.trackId,
    physicalDocuments: [document],
    logicalComponentOrder:
      NEW_JERSEY_ACROFORM_COMPONENT_IDS_BY_TRACK[input.trackId],
    runtimeDisabled: true,
    packetReady: false,
    counselAdopted: false,
    releaseActive: false,
    technicalFixtureOnly: true
  };
}
