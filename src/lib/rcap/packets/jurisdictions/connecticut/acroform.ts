import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

import {
  PDFButton,
  PDFCheckBox,
  PDFDocument,
  PDFTextField,
  StandardFonts,
  type PDFFont,
  type PDFField
} from "pdf-lib";

const LOAD_OPTIONS = { updateMetadata: false } as const;
const DETERMINISTIC_TIMESTAMP = new Date(Date.UTC(2000, 0, 1, 0, 0, 0));
const FIELD_FONT_SIZE = 9;
const FIELD_HORIZONTAL_PADDING = 4;
const RECT_TOLERANCE = 0.02;

export const CONNECTICUT_ACROFORM_JOB_ID =
  "rcap-ct-acroform-fill" as const;
export const CONNECTICUT_ACROFORM_RUNTIME_DISABLED = true as const;
export const CONNECTICUT_ACROFORM_REVIEW_READY = false as const;
export const CONNECTICUT_ACROFORM_COUNSEL_ADOPTED = false as const;
export const CONNECTICUT_ACROFORM_RELEASE_ACTIVE = false as const;

export const CONNECTICUT_ACROFORM_TRACK_IDS = [
  "ct-cleanslate-petition"
] as const;

export const CONNECTICUT_ACROFORM_COMPONENT_IDS = [
  "ct-cleanslate-petition-primary-filing-1"
] as const;

export type ConnecticutAcroformTrackId =
  (typeof CONNECTICUT_ACROFORM_TRACK_IDS)[number];
export type ConnecticutAcroformDocumentId = "JD-CR-202";
export type ConnecticutAcroformFieldType = "text" | "checkbox" | "button";
export type ConnecticutFieldOwnership =
  | "participant_supplied"
  | "derived_deterministically_from_participant_answers"
  | "manual_participant_completion"
  | "outside_party_completion"
  | "court_or_agency_only"
  | "prohibited_from_generation"
  | "intentionally_blank"
  | "not_used_by_assigned_route";

export type ConnecticutAcroformWidget = Readonly<{
  page: number;
  x: number;
  y: number;
  width: number;
  height: number;
}>;

export type ConnecticutAcroformFieldInventory = Readonly<{
  name: string;
  type: ConnecticutAcroformFieldType;
  widgets: readonly ConnecticutAcroformWidget[];
  currentValue: "" | false | "action";
  options: readonly string[];
  multiline: boolean;
  ownership: ConnecticutFieldOwnership;
  inputKey: string | null;
  deterministicSource: string | null;
  treatment: string;
}>;

export type ConnecticutSourceRequirement = Readonly<{
  sourceIdentityKey: "rcap-ct-jd-cr-202-d37887dc0b";
  documentId: "JD-CR-202";
  documentRole: "PETITION";
  revision: "REV-2023-11";
  expectedSha256: string;
  expectedBytes: 820630;
  expectedMediaType: "application/pdf";
  expectedPageCount: 2;
  expectedCompletionFieldCount: 18;
  expectedActionButtonCount: 4;
  expectedTotalAcroformFieldCount: 22;
  structuralClass: "clean_acroform";
  materializationDestination: string;
  componentIds: readonly ["ct-cleanslate-petition-primary-filing-1"];
  trackIds: readonly ["ct-cleanslate-petition"];
}>;

export type ConnecticutRenderedDocument = Readonly<{
  documentId: "JD-CR-202";
  logicalComponentIds: readonly ["ct-cleanslate-petition-primary-filing-1"];
  physicalCopyCount: 1;
  bytes: Uint8Array;
  sha256: string;
  sourceSha256: string;
  sourceIdentityKey: "rcap-ct-jd-cr-202-d37887dc0b";
  pageCount: 2;
  mappedFieldNames: readonly string[];
  protectedFieldNames: readonly string[];
}>;

export type ConnecticutTrackRenderResult = Readonly<{
  trackId: "ct-cleanslate-petition";
  physicalDocuments: readonly [ConnecticutRenderedDocument];
  logicalComponentOrder: readonly ["ct-cleanslate-petition-primary-filing-1"];
  runtimeDisabled: true;
  packetReady: false;
  counselAdopted: false;
  releaseActive: false;
  technicalFixtureOnly: true;
}>;

type TextMapping = Readonly<{
  fieldName: string;
  inputKey:
    | "contactEmail"
    | "contactPhone"
    | "dateOfBirth"
    | "docketNumber"
    | "mailingAddress"
    | "petitionerName";
  required: boolean;
  ownership:
    | "participant_supplied"
    | "derived_deterministically_from_participant_answers";
  deterministicSource: string | null;
}>;

const widget = (
  page: number,
  x: number,
  y: number,
  width: number,
  height: number
): ConnecticutAcroformWidget => ({ page, x, y, width, height });

const textField = (input: {
  name: string;
  widget: ConnecticutAcroformWidget;
  ownership: ConnecticutFieldOwnership;
  inputKey?: string;
  deterministicSource?: string;
  treatment: string;
  multiline?: boolean;
}): ConnecticutAcroformFieldInventory => ({
  name: input.name,
  type: "text",
  widgets: [input.widget],
  currentValue: "",
  options: [],
  multiline: input.multiline ?? false,
  ownership: input.ownership,
  inputKey: input.inputKey ?? null,
  deterministicSource: input.deterministicSource ?? null,
  treatment: input.treatment
});

const actionButton = (
  name: string,
  fieldWidget: ConnecticutAcroformWidget,
  treatment: string
): ConnecticutAcroformFieldInventory => ({
  name,
  type: "button",
  widgets: [fieldWidget],
  currentValue: "action",
  options: [],
  multiline: false,
  ownership: "not_used_by_assigned_route",
  inputKey: null,
  deterministicSource: null,
  treatment
});

const courtCheckbox = (
  name: string,
  fieldWidget: ConnecticutAcroformWidget,
  treatment: string
): ConnecticutAcroformFieldInventory => ({
  name,
  type: "checkbox",
  widgets: [fieldWidget],
  currentValue: false,
  options: ["1"],
  multiline: false,
  ownership: "court_or_agency_only",
  inputKey: null,
  deterministicSource: null,
  treatment
});

export const CONNECTICUT_ACROFORM_SOURCE_REQUIREMENT:
  ConnecticutSourceRequirement = Object.freeze({
    sourceIdentityKey: "rcap-ct-jd-cr-202-d37887dc0b",
    documentId: "JD-CR-202",
    documentRole: "PETITION",
    revision: "REV-2023-11",
    expectedSha256:
      "b5a917c2cd07727172a50534a4884a63e8ae08704b631c62a199c3454623062c",
    expectedBytes: 820630,
    expectedMediaType: "application/pdf",
    expectedPageCount: 2,
    expectedCompletionFieldCount: 18,
    expectedActionButtonCount: 4,
    expectedTotalAcroformFieldCount: 22,
    structuralClass: "clean_acroform",
    materializationDestination:
      "official-pdf/CT/CT__FORM__JD-CR-202__petition-for-clean-slate-erasure-convictions-before-1-1-2000__REV-2023-11__EN.pdf",
    componentIds: ["ct-cleanslate-petition-primary-filing-1"] as const,
    trackIds: ["ct-cleanslate-petition"] as const
  });

export const CONNECTICUT_ACROFORM_SOURCE_PAGES = Object.freeze([
  Object.freeze({
    page: 1,
    mediaBox: Object.freeze({ x: 0, y: 0, width: 612, height: 792 }),
    cropBox: Object.freeze({ x: 0, y: 0, width: 612, height: 792 }),
    rotation: 0
  }),
  Object.freeze({
    page: 2,
    mediaBox: Object.freeze({ x: 0, y: 0, width: 612, height: 792 }),
    cropBox: Object.freeze({ x: 0, y: 0, width: 612, height: 792 }),
    rotation: 0
  })
]);

export const CONNECTICUT_ACROFORM_FIELD_INVENTORY:
  readonly ConnecticutAcroformFieldInventory[] = Object.freeze([
    actionButton(
      "form1[0].#pageSet[0].Page1[0].ResetButton1[0]",
      widget(1, 414, 12.004, 68.4, 12),
      "The source reset action is preserved and is not participant data."
    ),
    actionButton(
      "form1[0].#pageSet[0].Page1[0].PrintButton1[0]",
      widget(1, 126, 12.004, 68.4, 12),
      "The source print action is preserved and is not participant data."
    ),
    actionButton(
      "form1[0].#pageSet[0].Page1[1].ResetButton1[0]",
      widget(2, 414, 12.004, 68.4, 12),
      "The source reset action is preserved and is not participant data."
    ),
    actionButton(
      "form1[0].#pageSet[0].Page1[1].PrintButton1[0]",
      widget(2, 126, 12.004, 68.4, 12),
      "The source print action is preserved and is not participant data."
    ),
    textField({
      name: "form1[0].PAGE1[0].CRIMES2ERASE[0]",
      widget: widget(1, 28.8, 503.997, 555.84, 45.122),
      ownership: "manual_participant_completion",
      treatment:
        "The adopted design makes selection of the convictions to erase a manual legal-judgment step; offense-section answers are not copied here.",
      multiline: true
    }),
    textField({
      name: "form1[0].PAGE1[0].DEFEMAIL[0]",
      widget: widget(1, 194.4, 581.995, 167.04, 15.123),
      ownership: "participant_supplied",
      inputKey: "contactEmail",
      treatment:
        "The optional standard participant contact value is copied verbatim."
    }),
    textField({
      name: "form1[0].PAGE1[0].DOCKETNO[0]",
      widget: widget(1, 424.8, 605.996, 159.84, 15.123),
      ownership: "participant_supplied",
      inputKey: "docketNumber",
      treatment:
        "The normalized one-docket-per-form answer is copied verbatim."
    }),
    textField({
      name: "form1[0].PAGE1[0].DOB[0]",
      widget: widget(1, 496.8, 581.995, 87.84, 15.123),
      ownership: "participant_supplied",
      inputKey: "dateOfBirth",
      treatment:
        "The standard participant date-of-birth value is copied verbatim."
    }),
    textField({
      name: "form1[0].PAGE1[0].PRINTNAME[0]",
      widget: widget(1, 316.8, 113.998, 185.04, 15.123),
      ownership: "derived_deterministically_from_participant_answers",
      inputKey: "petitionerName",
      deterministicSource:
        "Exact copy of petitionerName; the adjacent signature and execution date remain manual.",
      treatment:
        "The participant's printed name is repeated without creating a signature."
    }),
    textField({
      name: "form1[0].PAGE1[0].DATESIGN[0]",
      widget: widget(1, 507.6, 113.998, 77.04, 15.123),
      ownership: "manual_participant_completion",
      treatment:
        "The participant supplies the actual execution date when signing before the authorized officer."
    }),
    textField({
      name: "form1[0].PAGE1[0].DEFNAME[0]",
      widget: widget(1, 28.8, 581.995, 159.84, 15.123),
      ownership: "participant_supplied",
      inputKey: "petitionerName",
      treatment:
        "The standard participant full legal name is copied verbatim."
    }),
    textField({
      name: "form1[0].PAGE1[0].COURTADDRESS[0]",
      widget: widget(1, 86.4, 605.996, 332.64, 15.123),
      ownership: "manual_participant_completion",
      treatment:
        "The normalized design supplies only sentencingLocation. It does not safely separate the filing-court address or apply every closed-court redirect, so this field remains manual."
    }),
    textField({
      name: "form1[0].PAGE1[0].JDGANUM[0]",
      widget: widget(1, 28.8, 605.996, 51.84, 15.123),
      ownership: "manual_participant_completion",
      treatment:
        "The normalized design does not provide a separately structured JD/GA number, so no identifier is inferred."
    }),
    textField({
      name: "form1[0].PAGE1[0].DATESIGN[1]",
      widget: widget(1, 507.6, 89.997, 77.04, 15.123),
      ownership: "outside_party_completion",
      treatment:
        "The notary, commissioner, clerk, or other proper officer supplies the sworn-administration date."
    }),
    textField({
      name: "form1[0].PAGE1[0].PRINTNAME[1]",
      widget: widget(1, 316.803, 89.997, 185.04, 15.123),
      ownership: "outside_party_completion",
      treatment:
        "The notary, commissioner, clerk, or other proper officer supplies their printed name."
    }),
    textField({
      name: "form1[0].PAGE1[0].DEFADDRESS[0]",
      widget: widget(1, 28.8, 557.997, 555.84, 15.123),
      ownership: "participant_supplied",
      inputKey: "mailingAddress",
      treatment:
        "The standard participant mailing address is copied verbatim."
    }),
    textField({
      name: "form1[0].PAGE1[0].DEFPHONE[0]",
      widget: widget(1, 367.2, 581.998, 123.84, 15.123),
      ownership: "participant_supplied",
      inputKey: "contactPhone",
      treatment:
        "The optional standard participant contact value is copied verbatim."
    }),
    textField({
      name: "form1[0].#subform[1].MODIFIED[0]",
      widget: widget(2, 64.803, 614.16, 519.84, 69.84),
      ownership: "court_or_agency_only",
      treatment:
        "Only the court may identify convictions as to which relief is granted.",
      multiline: true
    }),
    courtCheckbox(
      "form1[0].#subform[1].DENIED[0]",
      widget(2, 46.8, 709.001, 10, 10),
      "Only the court may deny the petition."
    ),
    courtCheckbox(
      "form1[0].#subform[1].GRANTED[0]",
      widget(2, 46.8, 690.999, 10, 10),
      "Only the court may grant the petition."
    ),
    textField({
      name: "form1[0].#subform[1].TOWNJUDGMNT[0]",
      widget: widget(2, 28.803, 581.998, 192.24, 15.123),
      ownership: "court_or_agency_only",
      treatment:
        "The name-of-judge field is completed only by the court."
    }),
    textField({
      name: "form1[0].#subform[1].DATEJUDGMNT[0]",
      widget: widget(2, 496.8, 581.995, 87.84, 15.123),
      ownership: "court_or_agency_only",
      treatment:
        "The court supplies the order date."
    })
  ]);

export const CONNECTICUT_ACROFORM_PROTECTED_SURFACES = Object.freeze([
  Object.freeze({
    page: 1,
    owner: "manual_participant_completion" as const,
    region: "defendant signature and execution date",
    treatment: "blank"
  }),
  Object.freeze({
    page: 1,
    owner: "outside_party_completion" as const,
    region:
      "subscribed-and-sworn officer signature, printed name, and administration date",
    treatment: "blank"
  }),
  Object.freeze({
    page: 2,
    owner: "court_or_agency_only" as const,
    region:
      "order decision, granted-conviction list, judge name, clerk signature, and order date",
    treatment: "blank"
  })
]);

export const CONNECTICUT_ACROFORM_TEXT_MAPPINGS:
  readonly TextMapping[] = Object.freeze([
    Object.freeze({
      fieldName: "form1[0].PAGE1[0].DEFEMAIL[0]",
      inputKey: "contactEmail",
      required: false,
      ownership: "participant_supplied",
      deterministicSource: null
    }),
    Object.freeze({
      fieldName: "form1[0].PAGE1[0].DOCKETNO[0]",
      inputKey: "docketNumber",
      required: true,
      ownership: "participant_supplied",
      deterministicSource: null
    }),
    Object.freeze({
      fieldName: "form1[0].PAGE1[0].DOB[0]",
      inputKey: "dateOfBirth",
      required: true,
      ownership: "participant_supplied",
      deterministicSource: null
    }),
    Object.freeze({
      fieldName: "form1[0].PAGE1[0].PRINTNAME[0]",
      inputKey: "petitionerName",
      required: true,
      ownership: "derived_deterministically_from_participant_answers",
      deterministicSource: "Exact copy of petitionerName."
    }),
    Object.freeze({
      fieldName: "form1[0].PAGE1[0].DEFNAME[0]",
      inputKey: "petitionerName",
      required: true,
      ownership: "participant_supplied",
      deterministicSource: null
    }),
    Object.freeze({
      fieldName: "form1[0].PAGE1[0].DEFADDRESS[0]",
      inputKey: "mailingAddress",
      required: true,
      ownership: "participant_supplied",
      deterministicSource: null
    }),
    Object.freeze({
      fieldName: "form1[0].PAGE1[0].DEFPHONE[0]",
      inputKey: "contactPhone",
      required: false,
      ownership: "participant_supplied",
      deterministicSource: null
    })
  ]);

export const CONNECTICUT_ACROFORM_NORMALIZED_INPUT_KEYS = Object.freeze([
  "offenseDate",
  "docketNumber",
  "sentencingLocation",
  "offenseSections",
  "offenseClassThenCurrent",
  "mostRecentConvictionDate",
  "countsOnDocket",
  "supervisionComplete",
  "pendingCharges"
] as const);

export const CONNECTICUT_ACROFORM_STANDARD_PARTICIPANT_KEYS = Object.freeze([
  "petitionerName",
  "dateOfBirth",
  "mailingAddress",
  "contactPhone",
  "contactEmail"
] as const);

export const CONNECTICUT_ACROFORM_TECHNICAL_FIXTURES = Object.freeze([
  Object.freeze({
    fixtureId: "ct-cleanslate-petition-standard",
    trackId: "ct-cleanslate-petition" as const,
    facts: Object.freeze({
      petitionerName: "Jordan Example",
      dateOfBirth: "02/03/1980",
      mailingAddress: "44 Sample Street, Hartford, CT 06103",
      contactPhone: "860-555-0142",
      contactEmail: "jordan@example.test",
      offenseDate: "12/15/1998",
      docketNumber: "H14H-CR98-0012345-S",
      sentencingLocation: "G.A. 14 at Hartford",
      offenseSections: "Synthetic section supplied for manual review",
      offenseClassThenCurrent: "Synthetic participant answer",
      mostRecentConvictionDate: "07/08/2006",
      countsOnDocket: "One synthetic count; participant review required",
      supervisionComplete: true,
      pendingCharges: false
    })
  }),
  Object.freeze({
    fixtureId: "ct-cleanslate-petition-optional-contact-blank",
    trackId: "ct-cleanslate-petition" as const,
    facts: Object.freeze({
      petitionerName: "Casey Sample",
      dateOfBirth: "11/12/1975",
      mailingAddress: "9 Fixture Avenue, New Haven, CT 06510",
      docketNumber: "N23N-CR97-0009876-S",
      sentencingLocation: "G.A. 23 at New Haven",
      offenseDate: "06/01/1997",
      offenseSections: "Synthetic section supplied for manual review",
      offenseClassThenCurrent: "Synthetic participant answer",
      mostRecentConvictionDate: "03/04/2004",
      countsOnDocket: "One synthetic count; participant review required",
      supervisionComplete: true,
      pendingCharges: false
    })
  })
]);

export const CONNECTICUT_ACROFORM_EXPECTED_FIXTURE_HASHES = Object.freeze({
  "ct-cleanslate-petition-standard":
    "f2e3dd07c1a22006cc820de3a86c549df5eb861c541a546cbc2af1ef3f1d6c3d",
  "ct-cleanslate-petition-optional-contact-blank":
    "010eda6d9417dd06674f1163fbccaf26c365b257a45491a0070750c50fc21ddf"
});

export class ConnecticutAcroformError extends Error {
  constructor(
    readonly code:
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
    this.name = "ConnecticutAcroformError";
  }
}

function sha256(bytes: Uint8Array): string {
  return crypto.createHash("sha256").update(bytes).digest("hex");
}

function nearlyEqual(left: number, right: number): boolean {
  return Math.abs(left - right) <= RECT_TOLERANCE;
}

function pageForWidget(
  document: PDFDocument,
  field: PDFField
): readonly ConnecticutAcroformWidget[] {
  const pages = document.getPages();
  const pagesByReference = new Map(
    pages.map((page, index) => [page.ref.toString(), index + 1])
  );
  return field.acroField.getWidgets().map((entry) => {
    const rectangle = entry.getRectangle();
    const page = pagesByReference.get(entry.P()?.toString() ?? "");
    if (!page) {
      throw new ConnecticutAcroformError(
        "source_structure_mismatch",
        `${field.getName()} has a widget that is not attached to an assigned page.`,
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
  if (
    document.getPageCount() !==
    CONNECTICUT_ACROFORM_SOURCE_REQUIREMENT.expectedPageCount
  ) {
    throw new ConnecticutAcroformError(
      "source_structure_mismatch",
      "The Connecticut source page count differs from its assignment.",
      {
        expected:
          CONNECTICUT_ACROFORM_SOURCE_REQUIREMENT.expectedPageCount,
        actual: document.getPageCount()
      }
    );
  }
  for (const expected of CONNECTICUT_ACROFORM_SOURCE_PAGES) {
    const page = document.getPage(expected.page - 1);
    const media = page.getMediaBox();
    const crop = page.getCropBox();
    if (
      !nearlyEqual(media.x, expected.mediaBox.x) ||
      !nearlyEqual(media.y, expected.mediaBox.y) ||
      !nearlyEqual(media.width, expected.mediaBox.width) ||
      !nearlyEqual(media.height, expected.mediaBox.height) ||
      !nearlyEqual(crop.x, expected.cropBox.x) ||
      !nearlyEqual(crop.y, expected.cropBox.y) ||
      !nearlyEqual(crop.width, expected.cropBox.width) ||
      !nearlyEqual(crop.height, expected.cropBox.height) ||
      page.getRotation().angle !== expected.rotation
    ) {
      throw new ConnecticutAcroformError(
        "source_structure_mismatch",
        `JD-CR-202 page ${expected.page} geometry differs from its assignment.`,
        { page: expected.page }
      );
    }
  }
}

function fieldMatchesType(
  field: PDFField,
  expected: ConnecticutAcroformFieldType
): boolean {
  if (expected === "text") return field instanceof PDFTextField;
  if (expected === "checkbox") return field instanceof PDFCheckBox;
  return field instanceof PDFButton;
}

function fieldIsBlank(field: PDFField): boolean {
  if (field instanceof PDFTextField) return (field.getText() ?? "") === "";
  if (field instanceof PDFCheckBox) return field.isChecked() === false;
  return true;
}

function checkboxOptions(field: PDFCheckBox): readonly string[] {
  return field.acroField.getWidgets().map((entry) => {
    const value = entry.getOnValue();
    return value ? value.asString().replace(/^\//u, "") : "";
  });
}

function assertExactInventory(
  document: PDFDocument,
  requireBlankCompletionFields: boolean
): void {
  const form = document.getForm();
  if (form.hasXFA()) {
    throw new ConnecticutAcroformError(
      "source_structure_mismatch",
      "The assigned Connecticut source unexpectedly contains XFA."
    );
  }
  const actualFields = form.getFields();
  if (
    actualFields.length !==
    CONNECTICUT_ACROFORM_SOURCE_REQUIREMENT.expectedTotalAcroformFieldCount
  ) {
    throw new ConnecticutAcroformError(
      "source_structure_mismatch",
      "The Connecticut AcroForm field count differs from its inspected inventory.",
      {
        expected:
          CONNECTICUT_ACROFORM_SOURCE_REQUIREMENT
            .expectedTotalAcroformFieldCount,
        actual: actualFields.length
      }
    );
  }
  const byName = new Map(actualFields.map((field) => [field.getName(), field]));
  if (byName.size !== actualFields.length) {
    throw new ConnecticutAcroformError(
      "source_structure_mismatch",
      "The Connecticut source contains duplicate fully qualified field names."
    );
  }
  for (const expected of CONNECTICUT_ACROFORM_FIELD_INVENTORY) {
    const field = byName.get(expected.name);
    if (!field) {
      throw new ConnecticutAcroformError(
        "field_not_found",
        `${expected.name} is absent from JD-CR-202.`,
        { fieldName: expected.name }
      );
    }
    if (!fieldMatchesType(field, expected.type)) {
      throw new ConnecticutAcroformError(
        "field_type_mismatch",
        `${expected.name} has a different field type than the inspected source.`,
        { fieldName: expected.name, expectedType: expected.type }
      );
    }
    const actualWidgets = pageForWidget(document, field);
    if (
      actualWidgets.length !== expected.widgets.length ||
      actualWidgets.some((actual, index) => {
        const target = expected.widgets[index];
        return (
          actual.page !== target.page ||
          !nearlyEqual(actual.x, target.x) ||
          !nearlyEqual(actual.y, target.y) ||
          !nearlyEqual(actual.width, target.width) ||
          !nearlyEqual(actual.height, target.height)
        );
      })
    ) {
      throw new ConnecticutAcroformError(
        "source_structure_mismatch",
        `${expected.name} widget geometry differs from the inspected source.`,
        { fieldName: expected.name }
      );
    }
    if (
      field instanceof PDFTextField &&
      field.isMultiline() !== expected.multiline
    ) {
      throw new ConnecticutAcroformError(
        "source_structure_mismatch",
        `${expected.name} multiline state differs from the inspected source.`,
        { fieldName: expected.name }
      );
    }
    if (
      field instanceof PDFCheckBox &&
      JSON.stringify(checkboxOptions(field)) !==
        JSON.stringify(expected.options)
    ) {
      throw new ConnecticutAcroformError(
        "source_structure_mismatch",
        `${expected.name} export value differs from the inspected source.`,
        { fieldName: expected.name }
      );
    }
    if (
      requireBlankCompletionFields &&
      expected.type !== "button" &&
      !fieldIsBlank(field)
    ) {
      throw new ConnecticutAcroformError(
        "source_structure_mismatch",
        `${expected.name} is not blank in the controlling source.`,
        { fieldName: expected.name }
      );
    }
    byName.delete(expected.name);
  }
  if (byName.size > 0) {
    throw new ConnecticutAcroformError(
      "source_structure_mismatch",
      "The Connecticut source contains unclassified fields.",
      { fieldNames: [...byName.keys()] }
    );
  }
}

function assertSealedBoundary(root: string, destination: string): void {
  let rootStat: fs.Stats;
  try {
    rootStat = fs.lstatSync(root);
  } catch {
    throw new ConnecticutAcroformError(
      "invalid_materialization_root",
      "The source materialization root does not exist."
    );
  }
  if (
    !rootStat.isDirectory() ||
    rootStat.isSymbolicLink() ||
    (rootStat.mode & 0o777) !== 0o555
  ) {
    throw new ConnecticutAcroformError(
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
      throw new ConnecticutAcroformError(
        "invalid_materialization_root",
        "A source materialization directory is not sealed.",
        { path: current }
      );
    }
    if (current === root) break;
    const parent = path.dirname(current);
    if (parent === current) {
      throw new ConnecticutAcroformError(
        "invalid_materialization_root",
        "The assigned source escapes the materialization root."
      );
    }
    current = parent;
  }
}

export async function verifyConnecticutAcroformSource(input: {
  materializationRoot: string;
}): Promise<Readonly<{
  absolutePath: string;
  bytes: Uint8Array;
  sha256: string;
  pageCount: 2;
  fieldNames: readonly string[];
}>> {
  const root = path.resolve(input.materializationRoot);
  const absolutePath = path.resolve(
    root,
    ...CONNECTICUT_ACROFORM_SOURCE_REQUIREMENT.materializationDestination.split(
      "/"
    )
  );
  const relative = path.relative(root, absolutePath);
  if (
    relative === "" ||
    relative === ".." ||
    relative.startsWith(`..${path.sep}`) ||
    path.isAbsolute(relative)
  ) {
    throw new ConnecticutAcroformError(
      "invalid_materialization_root",
      "The assigned source escapes the portable source contract."
    );
  }
  assertSealedBoundary(root, absolutePath);
  let stat: fs.Stats;
  try {
    stat = fs.lstatSync(absolutePath);
  } catch {
    throw new ConnecticutAcroformError(
      "source_missing",
      "The receipt-bound Connecticut source is absent.",
      { sourceIdentityKey: CONNECTICUT_ACROFORM_SOURCE_REQUIREMENT.sourceIdentityKey }
    );
  }
  if (
    !stat.isFile() ||
    stat.isSymbolicLink() ||
    stat.nlink !== 1 ||
    (stat.mode & 0o777) !== 0o444
  ) {
    throw new ConnecticutAcroformError(
      "source_structure_mismatch",
      "The assigned Connecticut source is not a read-only regular file."
    );
  }
  const realPath = fs.realpathSync(absolutePath);
  const realRelative = path.relative(root, realPath);
  if (
    realRelative === ".." ||
    realRelative.startsWith(`..${path.sep}`) ||
    path.isAbsolute(realRelative)
  ) {
    throw new ConnecticutAcroformError(
      "invalid_materialization_root",
      "The assigned Connecticut source resolves outside the portable source contract."
    );
  }
  if (stat.size !== CONNECTICUT_ACROFORM_SOURCE_REQUIREMENT.expectedBytes) {
    throw new ConnecticutAcroformError(
      "source_hash_mismatch",
      "The Connecticut source byte count differs from its receipt.",
      {
        expected: CONNECTICUT_ACROFORM_SOURCE_REQUIREMENT.expectedBytes,
        actual: stat.size
      }
    );
  }
  const bytes = new Uint8Array(fs.readFileSync(absolutePath));
  if (Buffer.from(bytes.subarray(0, 5)).toString("ascii") !== "%PDF-") {
    throw new ConnecticutAcroformError(
      "source_media_type_mismatch",
      "The assigned Connecticut source is not a PDF."
    );
  }
  const actualSha256 = sha256(bytes);
  if (
    actualSha256 !==
    CONNECTICUT_ACROFORM_SOURCE_REQUIREMENT.expectedSha256
  ) {
    throw new ConnecticutAcroformError(
      "source_hash_mismatch",
      "The Connecticut source hash differs from its receipt.",
      {
        expected: CONNECTICUT_ACROFORM_SOURCE_REQUIREMENT.expectedSha256,
        actual: actualSha256
      }
    );
  }
  const latin = Buffer.from(bytes).toString("latin1");
  if (/\/Encrypt\b/u.test(latin) || /\/XFA\b/u.test(latin)) {
    throw new ConnecticutAcroformError(
      "source_structure_mismatch",
      "The assigned Connecticut source is encrypted or XFA.",
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
    throw new ConnecticutAcroformError(
      "source_unreadable",
      "The assigned Connecticut source cannot be parsed.",
      { reason: String((error as Error)?.message ?? "").slice(0, 160) }
    );
  }
  assertPageGeometry(document);
  assertExactInventory(document, true);
  return {
    absolutePath,
    bytes,
    sha256: actualSha256,
    pageCount: 2,
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

function assertNoProtectedInputs(
  facts: Readonly<Record<string, unknown>>
): void {
  const protectedKeys = [
    "signature",
    "defendantSignature",
    "signatureDate",
    "notary",
    "notaryName",
    "notarySignature",
    "notaryDate",
    "judge",
    "judgeName",
    "judgeSignature",
    "clerk",
    "clerkSignature",
    "courtDecision",
    "courtOrderDate",
    "granted",
    "denied",
    "prosecutorResponse",
    "serviceCompleted"
  ];
  const supplied = protectedKeys.filter((key) => isSupplied(facts[key]));
  if (supplied.length > 0) {
    throw new ConnecticutAcroformError(
      "protected_input",
      "The Connecticut technical renderer does not accept execution or outside-party completion.",
      { supplied }
    );
  }
}

function mappedValue(
  mapping: TextMapping,
  facts: Readonly<Record<string, unknown>>
): string | null {
  const raw = facts[mapping.inputKey];
  if (!isSupplied(raw)) {
    if (!mapping.required) return null;
    throw new ConnecticutAcroformError(
      "missing_required_input",
      `The established participant input ${mapping.inputKey} is required for JD-CR-202.`,
      { inputKey: mapping.inputKey }
    );
  }
  return String(raw).trim();
}

function assertTextFits(
  field: PDFTextField,
  inventory: ConnecticutAcroformFieldInventory,
  value: string,
  font: PDFFont
): void {
  const availableWidth =
    Math.min(...inventory.widgets.map((entry) => entry.width)) -
    FIELD_HORIZONTAL_PADDING;
  const requiredWidth = font.widthOfTextAtSize(value, FIELD_FONT_SIZE);
  if (requiredWidth > availableWidth) {
    throw new ConnecticutAcroformError(
      "content_overflow",
      "Participant text does not fit legibly in the controlling Connecticut field.",
      {
        fieldName: inventory.name,
        availableWidth: Number(availableWidth.toFixed(2)),
        requiredWidth: Number(requiredWidth.toFixed(2)),
        fontSize: FIELD_FONT_SIZE
      }
    );
  }
  const maxLength = field.getMaxLength();
  if (
    typeof maxLength === "number" &&
    maxLength > 0 &&
    value.length > maxLength
  ) {
    throw new ConnecticutAcroformError(
      "content_overflow",
      "Participant text exceeds the controlling Connecticut field's maximum length.",
      {
        fieldName: inventory.name,
        maxLength,
        actualLength: value.length
      }
    );
  }
}

function assertOnlyMappedFieldsWritten(
  document: PDFDocument,
  expectedValues: ReadonlyMap<string, string>
): void {
  const form = document.getForm();
  for (const inventory of CONNECTICUT_ACROFORM_FIELD_INVENTORY) {
    if (inventory.type === "button") continue;
    const field = form.getField(inventory.name);
    const expected = expectedValues.get(inventory.name);
    if (expected !== undefined) {
      if (
        !(field instanceof PDFTextField) ||
        (field.getText() ?? "") !== expected
      ) {
        throw new ConnecticutAcroformError(
          "protected_field_modified",
          `${inventory.name} did not preserve its mapped value.`,
          { fieldName: inventory.name }
        );
      }
      continue;
    }
    if (!fieldIsBlank(field)) {
      throw new ConnecticutAcroformError(
        "protected_field_modified",
        `${inventory.name} must remain blank for manual or outside-party completion.`,
        { fieldName: inventory.name, ownership: inventory.ownership }
      );
    }
  }
}

export async function renderConnecticutAcroformDocument(input: {
  materializationRoot: string;
  facts: Readonly<Record<string, unknown>>;
}): Promise<ConnecticutRenderedDocument> {
  assertNoProtectedInputs(input.facts);
  const source = await verifyConnecticutAcroformSource({
    materializationRoot: input.materializationRoot
  });
  const document = await PDFDocument.load(source.bytes, LOAD_OPTIONS);
  const form = document.getForm();
  const font = await document.embedFont(StandardFonts.HelveticaBold);
  const expectedValues = new Map<string, string>();

  for (const mapping of CONNECTICUT_ACROFORM_TEXT_MAPPINGS) {
    const value = mappedValue(mapping, input.facts);
    if (value === null) continue;
    let field: PDFField;
    try {
      field = form.getField(mapping.fieldName);
    } catch {
      throw new ConnecticutAcroformError(
        "field_not_found",
        `${mapping.fieldName} is absent from JD-CR-202.`,
        { fieldName: mapping.fieldName }
      );
    }
    if (!(field instanceof PDFTextField)) {
      throw new ConnecticutAcroformError(
        "field_type_mismatch",
        `${mapping.fieldName} is not a text field.`,
        { fieldName: mapping.fieldName }
      );
    }
    const inventory = CONNECTICUT_ACROFORM_FIELD_INVENTORY.find(
      (candidate) => candidate.name === mapping.fieldName
    );
    if (!inventory) {
      throw new ConnecticutAcroformError(
        "field_not_found",
        `${mapping.fieldName} is absent from the declared inventory.`,
        { fieldName: mapping.fieldName }
      );
    }
    assertTextFits(field, inventory, value, font);
    field.setFontSize(FIELD_FONT_SIZE);
    field.setText(value);
    expectedValues.set(mapping.fieldName, value);
  }

  assertOnlyMappedFieldsWritten(document, expectedValues);
  form.updateFieldAppearances(font);
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

  const protectedFieldNames =
    CONNECTICUT_ACROFORM_FIELD_INVENTORY.filter(
      (entry) =>
        entry.type !== "button" &&
        !CONNECTICUT_ACROFORM_TEXT_MAPPINGS.some(
          (mapping) => mapping.fieldName === entry.name
        )
    ).map((entry) => entry.name);
  return {
    documentId: "JD-CR-202",
    logicalComponentIds: ["ct-cleanslate-petition-primary-filing-1"],
    physicalCopyCount: 1,
    bytes,
    sha256: sha256(bytes),
    sourceSha256: source.sha256,
    sourceIdentityKey:
      CONNECTICUT_ACROFORM_SOURCE_REQUIREMENT.sourceIdentityKey,
    pageCount: 2,
    mappedFieldNames: Object.freeze([...expectedValues.keys()]),
    protectedFieldNames: Object.freeze(protectedFieldNames)
  };
}

export async function renderConnecticutAcroformTrack(input: {
  materializationRoot: string;
  trackId: ConnecticutAcroformTrackId;
  facts: Readonly<Record<string, unknown>>;
}): Promise<ConnecticutTrackRenderResult> {
  if (!CONNECTICUT_ACROFORM_TRACK_IDS.includes(input.trackId)) {
    throw new ConnecticutAcroformError(
      "unsupported_track",
      `The Connecticut AcroForm assignment does not include ${input.trackId}.`,
      { trackId: input.trackId }
    );
  }
  const document = await renderConnecticutAcroformDocument({
    materializationRoot: input.materializationRoot,
    facts: input.facts
  });
  return {
    trackId: "ct-cleanslate-petition",
    physicalDocuments: [document],
    logicalComponentOrder: ["ct-cleanslate-petition-primary-filing-1"],
    runtimeDisabled: true,
    packetReady: false,
    counselAdopted: false,
    releaseActive: false,
    technicalFixtureOnly: true
  };
}
