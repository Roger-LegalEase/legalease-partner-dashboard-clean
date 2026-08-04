import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

import {
  PDFCheckBox,
  PDFDocument,
  PDFTextField,
  StandardFonts
} from "pdf-lib";

const LOAD_OPTIONS = { updateMetadata: false } as const;
const DETERMINISTIC_TIMESTAMP = new Date(Date.UTC(2000, 0, 1, 0, 0, 0));

export type PennsylvaniaOfficialPdfErrorCode =
  | "source_missing"
  | "source_hash_mismatch"
  | "source_size_mismatch"
  | "source_media_type_mismatch"
  | "source_structure_mismatch"
  | "source_unreadable"
  | "field_not_found"
  | "field_type_mismatch"
  | "field_value_too_long"
  | "missing_required_input"
  | "prohibited_fact"
  | "unconfirmed_widget_semantics"
  | "protected_field_modified"
  | "packet_source_incomplete";

export class PennsylvaniaOfficialPdfError extends Error {
  readonly code: PennsylvaniaOfficialPdfErrorCode;
  readonly details: Readonly<Record<string, unknown>>;

  constructor(
    code: PennsylvaniaOfficialPdfErrorCode,
    message: string,
    details: Readonly<Record<string, unknown>> = {}
  ) {
    super(message);
    this.name = "PennsylvaniaOfficialPdfError";
    this.code = code;
    this.details = details;
  }
}

export type PennsylvaniaSourceRequirement = {
  documentId: string;
  expectedSha256: string;
  expectedBytes: number;
  expectedMediaType: "application/pdf";
  expectedPageCount: number;
  expectedFieldCount: number;
  authorizedLocalReviewPaths: readonly string[];
};

export const PENNSYLVANIA_OFFICIAL_PDF_SOURCE_REQUIREMENTS:
  readonly PennsylvaniaSourceRequirement[] = Object.freeze([
    {
      documentId: "PA-RCRIM-P-490-PETITION",
      expectedSha256: "082c515ce5a60de33798508c6dd76589f83758ac2ddd8244e934b379ce05def3",
      expectedBytes: 87204,
      expectedMediaType: "application/pdf",
      expectedPageCount: 1,
      expectedFieldCount: 76,
      authorizedLocalReviewPaths: []
    },
    {
      documentId: "PA-RCRIM-P-490-ORDER",
      expectedSha256: "ac671421035b12b61d3cfbfaac04bb5676f619b968db879f6992e3279110ce90",
      expectedBytes: 143399,
      expectedMediaType: "application/pdf",
      expectedPageCount: 2,
      expectedFieldCount: 29,
      authorizedLocalReviewPaths: []
    },
    {
      documentId: "PA-RCRIM-P-790-PETITION",
      expectedSha256: "fc06486e75773d4f6d81c263706827ab7f9facfb6dde9907cbee120c063289de",
      expectedBytes: 87647,
      expectedMediaType: "application/pdf",
      expectedPageCount: 1,
      expectedFieldCount: 76,
      authorizedLocalReviewPaths: [
        "reference/pennsylvania/222612-petitionforexpungement790030912-000077.pdf"
      ]
    },
    {
      documentId: "PA-RCRIM-P-790-ORDER",
      expectedSha256: "4d312ebde4aed7c1941e1ae9d734c90ba7183db273778839b15a84be8e611c95",
      expectedBytes: 151853,
      expectedMediaType: "application/pdf",
      expectedPageCount: 2,
      expectedFieldCount: 29,
      authorizedLocalReviewPaths: []
    },
    {
      documentId: "PA-RCRIM-P-791-PETITION",
      expectedSha256: "945a630595c8f6fcbbfaf4f5532fc54ab7267ac585d2cb523bf0f5975d21c2ab",
      expectedBytes: 673358,
      expectedMediaType: "application/pdf",
      expectedPageCount: 1,
      expectedFieldCount: 60,
      authorizedLocalReviewPaths: []
    },
    {
      documentId: "PA-RCRIM-P-791-ORDER",
      expectedSha256: "99a7704e7d68c0478ef0be1d6c08a79f552a9f439d9468d6476c10e8a5c377cf",
      expectedBytes: 803224,
      expectedMediaType: "application/pdf",
      expectedPageCount: 2,
      expectedFieldCount: 24,
      authorizedLocalReviewPaths: []
    }
  ]);

export type Rule790PetitionTextMapping = {
  pdfFieldName: string;
  valuePath: string;
  owner: "participant" | "system_derived";
  allowBlank?: boolean;
};

const participant = (
  pdfFieldName: string,
  valuePath: string,
  allowBlank = false
): Rule790PetitionTextMapping => ({
  pdfFieldName,
  valuePath,
  owner: "participant",
  ...(allowBlank ? { allowBlank: true } : {})
});

const derived = (
  pdfFieldName: string,
  valuePath: string,
  allowBlank = false
): Rule790PetitionTextMapping => ({
  pdfFieldName,
  valuePath,
  owner: "system_derived",
  ...(allowBlank ? { allowBlank: true } : {})
});

const rows = [0, 1, 2, 3, 4] as const;

export const RULE_790_PETITION_TEXT_MAPPINGS:
  readonly Rule790PetitionTextMapping[] = Object.freeze([
    participant("Addr1", "participant.address.line1"),
    participant("Addr2", "participant.address.line2", true),
    participant("AddrCity", "participant.address.city"),
    participant("AddrState", "participant.address.state"),
    participant("AddrZip", "participant.address.zip"),
    derived("AffiantAddr1", "case.affiant.address.line1", true),
    derived("AffiantAddr2", "case.affiant.address.line2", true),
    derived("AffiantAddrCity", "case.affiant.address.city", true),
    derived("AffiantAddrState", "case.affiant.address.state", true),
    derived("AffiantAddrZip", "case.affiant.address.zip", true),
    ...rows.map((row) => participant(`Aliases${row + 1}`, `participant.aliases.${row}`, true)),
    ...rows.map((row) => derived(`CountsRow${row + 1}`, `case.charges.${row}.count`, row !== 0)),
    derived("CountyOf", "case.county"),
    derived("CPDocketNumber", "case.docketNumber"),
    derived("Date of Arrest", "case.arrestDate"),
    derived("Date on Complaint", "case.complaintDate", true),
    participant("Defendant", "participant.fullName"),
    ...rows.map((row) =>
      derived(`DispositionRow${row + 1}`, `case.charges.${row}.disposition`, row !== 0)
    ),
    derived("District#", "case.judicialDistrict"),
    participant("DOB", "participant.dateOfBirth"),
    ...rows.slice(0, 4).map((row) =>
      derived(`DocketSeg${row + 1}`, `case.docketSegments.${row}`)
    ),
    participant("Full Name", "participant.fullName"),
    ...rows.map((row) => derived(`GradeRow${row + 1}`, `case.charges.${row}.grade`, row !== 0)),
    derived("Judge", "case.judge.name"),
    derived("JudgeAddr1", "case.judge.address.line1"),
    derived("JudgeAddr2", "case.judge.address.line2", true),
    derived("JudgeAddrCity", "case.judge.address.city"),
    derived("JudgeAddrState", "case.judge.address.state"),
    derived("JudgeAddrZip", "case.judge.address.zip"),
    derived("Name of Affiant", "case.affiant.name", true),
    derived("Name of Arresting Agency", "case.arrestingAgency", true),
    derived("Offense Tracking Number OTN", "case.otn"),
    ...rows.map((row) =>
      derived(`PA Statute TitleRow${row + 1}`, `case.charges.${row}.statuteTitle`, row !== 0)
    ),
    participant("ReasonForExpungement", "petition.reasonForExpungement"),
    participant("ReasonForMissingHistory", "petition.reasonForMissingHistory", true),
    ...rows.map((row) => derived(`SectionRow${row + 1}`, `case.charges.${row}.section`, row !== 0)),
    ...rows.map((row) =>
      derived(
        `Statute DescriptionRow${row + 1}`,
        `case.charges.${row}.description`,
        row !== 0
      )
    ),
    ...rows.map((row) =>
      derived(`SubsectionRow${row + 1}`, `case.charges.${row}.subsection`, true)
    )
  ]);

export const RULE_790_PETITION_PROTECTED_FIELDS = Object.freeze([
  "Check Box1",
  "Checkbox2",
  "Social Security Number"
] as const);

export const RULE_790_PETITION_FIELD_NAMES = Object.freeze([
  "Addr1",
  "Addr2",
  "AddrCity",
  "AddrState",
  "AddrZip",
  "AffiantAddr1",
  "AffiantAddr2",
  "AffiantAddrCity",
  "AffiantAddrState",
  "AffiantAddrZip",
  "Aliases1",
  "Aliases2",
  "Aliases3",
  "Aliases4",
  "Aliases5",
  "Check Box1",
  "Checkbox2",
  "CountsRow1",
  "CountsRow2",
  "CountsRow3",
  "CountsRow4",
  "CountsRow5",
  "CountyOf",
  "CPDocketNumber",
  "Date of Arrest",
  "Date on Complaint",
  "Defendant",
  "DispositionRow1",
  "DispositionRow2",
  "DispositionRow3",
  "DispositionRow4",
  "DispositionRow5",
  "District#",
  "DOB",
  "DocketSeg1",
  "DocketSeg2",
  "DocketSeg3",
  "DocketSeg4",
  "Full Name",
  "GradeRow1",
  "GradeRow2",
  "GradeRow3",
  "GradeRow4",
  "GradeRow5",
  "Judge",
  "JudgeAddr1",
  "JudgeAddr2",
  "JudgeAddrCity",
  "JudgeAddrState",
  "JudgeAddrZip",
  "Name of Affiant",
  "Name of Arresting Agency",
  "Offense Tracking Number OTN",
  "PA Statute TitleRow1",
  "PA Statute TitleRow2",
  "PA Statute TitleRow3",
  "PA Statute TitleRow4",
  "PA Statute TitleRow5",
  "ReasonForExpungement",
  "ReasonForMissingHistory",
  "SectionRow1",
  "SectionRow2",
  "SectionRow3",
  "SectionRow4",
  "SectionRow5",
  "Social Security Number",
  "Statute DescriptionRow1",
  "Statute DescriptionRow2",
  "Statute DescriptionRow3",
  "Statute DescriptionRow4",
  "Statute DescriptionRow5",
  "SubsectionRow1",
  "SubsectionRow2",
  "SubsectionRow3",
  "SubsectionRow4",
  "SubsectionRow5"
] as const);

export type VerifiedPennsylvaniaSource = {
  documentId: string;
  relativePath: string;
  absolutePath: string;
  bytes: Uint8Array;
  sha256: string;
  byteLength: number;
  pageCount: number;
  fieldNames: readonly string[];
};

function sha256(bytes: Uint8Array): string {
  return crypto.createHash("sha256").update(bytes).digest("hex");
}

function sourceRequirement(documentId: string): PennsylvaniaSourceRequirement {
  const requirement = PENNSYLVANIA_OFFICIAL_PDF_SOURCE_REQUIREMENTS.find(
    (candidate) => candidate.documentId === documentId
  );
  if (!requirement) {
    throw new PennsylvaniaOfficialPdfError(
      "source_missing",
      "No exact Pennsylvania source requirement exists for this document.",
      { documentId }
    );
  }
  return requirement;
}

function assertPdfEnvelope(
  bytes: Uint8Array,
  requirement: PennsylvaniaSourceRequirement,
  relativePath: string
): void {
  if (bytes.byteLength !== requirement.expectedBytes) {
    throw new PennsylvaniaOfficialPdfError(
      "source_size_mismatch",
      "The Pennsylvania source byte length does not match its pinned identity.",
      {
        documentId: requirement.documentId,
        sourcePath: relativePath,
        expected: requirement.expectedBytes,
        actual: bytes.byteLength
      }
    );
  }
  const actualSha256 = sha256(bytes);
  if (actualSha256 !== requirement.expectedSha256) {
    throw new PennsylvaniaOfficialPdfError(
      "source_hash_mismatch",
      "The Pennsylvania source hash does not match its pinned identity.",
      {
        documentId: requirement.documentId,
        sourcePath: relativePath,
        expected: requirement.expectedSha256,
        actual: actualSha256
      }
    );
  }
  if (!Buffer.from(bytes.subarray(0, 5)).equals(Buffer.from("%PDF-"))) {
    throw new PennsylvaniaOfficialPdfError(
      "source_media_type_mismatch",
      "The exact Pennsylvania source requirement is application/pdf but the bytes lack a PDF header.",
      { documentId: requirement.documentId, sourcePath: relativePath }
    );
  }
  const latin = Buffer.from(bytes).toString("latin1");
  if (/\/Encrypt\b/.test(latin) || /\/XFA\b/.test(latin)) {
    throw new PennsylvaniaOfficialPdfError(
      "source_structure_mismatch",
      "The Pennsylvania source is encrypted or contains XFA and cannot be used by this family.",
      {
        documentId: requirement.documentId,
        sourcePath: relativePath,
        encrypted: /\/Encrypt\b/.test(latin),
        xfa: /\/XFA\b/.test(latin)
      }
    );
  }
}

export async function verifyPennsylvaniaOfficialPdfSource(
  rootDir: string,
  documentId: string
): Promise<VerifiedPennsylvaniaSource> {
  const requirement = sourceRequirement(documentId);
  const availablePath = requirement.authorizedLocalReviewPaths.find((relativePath) =>
    fs.existsSync(path.resolve(rootDir, relativePath))
  );
  if (!availablePath) {
    throw new PennsylvaniaOfficialPdfError(
      "source_missing",
      "The exact Pennsylvania official source is not locally available.",
      {
        documentId,
        attemptedPaths: requirement.authorizedLocalReviewPaths,
        workerProjectionRequired: true
      }
    );
  }

  const absolutePath = path.resolve(rootDir, availablePath);
  const stat = fs.lstatSync(absolutePath);
  if (!stat.isFile() || stat.isSymbolicLink()) {
    throw new PennsylvaniaOfficialPdfError(
      "source_structure_mismatch",
      "The Pennsylvania source must be a regular file and not a symbolic link.",
      { documentId, sourcePath: availablePath }
    );
  }

  const bytes = new Uint8Array(fs.readFileSync(absolutePath));
  assertPdfEnvelope(bytes, requirement, availablePath);

  let doc: PDFDocument;
  try {
    doc = await PDFDocument.load(bytes, LOAD_OPTIONS);
  } catch (error) {
    throw new PennsylvaniaOfficialPdfError(
      "source_unreadable",
      "The Pennsylvania source could not be parsed.",
      {
        documentId,
        sourcePath: availablePath,
        reason: String((error as Error)?.message ?? "").slice(0, 160)
      }
    );
  }
  const fieldNames = doc.getForm().getFields().map((field) => field.getName());
  if (
    doc.getPageCount() !== requirement.expectedPageCount ||
    fieldNames.length !== requirement.expectedFieldCount
  ) {
    throw new PennsylvaniaOfficialPdfError(
      "source_structure_mismatch",
      "The Pennsylvania source page or AcroForm field count differs from its exact requirement.",
      {
        documentId,
        sourcePath: availablePath,
        expectedPageCount: requirement.expectedPageCount,
        actualPageCount: doc.getPageCount(),
        expectedFieldCount: requirement.expectedFieldCount,
        actualFieldCount: fieldNames.length
      }
    );
  }

  return {
    documentId,
    relativePath: availablePath,
    absolutePath,
    bytes,
    sha256: requirement.expectedSha256,
    byteLength: bytes.byteLength,
    pageCount: doc.getPageCount(),
    fieldNames
  };
}

function valueAtPath(facts: Readonly<Record<string, unknown>>, valuePath: string): unknown {
  let current: unknown = facts;
  for (const segment of valuePath.split(".")) {
    if (current === null || current === undefined) return undefined;
    if (Array.isArray(current)) {
      const index = Number.parseInt(segment, 10);
      if (!Number.isInteger(index)) return undefined;
      current = current[index];
      continue;
    }
    if (typeof current !== "object") return undefined;
    current = (current as Readonly<Record<string, unknown>>)[segment];
  }
  return current;
}

function isSupplied(value: unknown): boolean {
  return value !== undefined && value !== null && String(value).trim() !== "";
}

function assertNoProtectedFacts(facts: Readonly<Record<string, unknown>>): void {
  for (const valuePath of [
    "participant.socialSecurityNumber",
    "participant.ssn",
    "socialSecurityNumber"
  ]) {
    if (isSupplied(valueAtPath(facts, valuePath))) {
      throw new PennsylvaniaOfficialPdfError(
        "prohibited_fact",
        "The Rule 790 review renderer never accepts a Social Security Number.",
        { valuePath }
      );
    }
  }
  for (const valuePath of [
    "petition.amountsPaid",
    "petition.criminalHistoryAttached",
    "petition.patchAttached"
  ]) {
    if (valueAtPath(facts, valuePath) !== undefined) {
      throw new PennsylvaniaOfficialPdfError(
        "unconfirmed_widget_semantics",
        "The Rule 790 checkbox semantics remain unconfirmed and must be completed manually.",
        { valuePath }
      );
    }
  }
}

function assertExactRule790FieldInventory(fieldNames: readonly string[]): void {
  const expected = [...RULE_790_PETITION_FIELD_NAMES].sort();
  const actual = [...fieldNames].sort();
  if (
    expected.length !== actual.length ||
    expected.some((fieldName, index) => fieldName !== actual[index])
  ) {
    throw new PennsylvaniaOfficialPdfError(
      "source_structure_mismatch",
      "The Rule 790 petition field names differ from the freshly verified inventory.",
      { expected, actual }
    );
  }
}

function assertProtectedFieldsBlank(doc: PDFDocument): void {
  const form = doc.getForm();
  const socialSecurityNumber = form.getField("Social Security Number");
  if (
    !(socialSecurityNumber instanceof PDFTextField) ||
    isSupplied(socialSecurityNumber.getText())
  ) {
    throw new PennsylvaniaOfficialPdfError(
      "protected_field_modified",
      "The Social Security Number field must remain blank.",
      { pdfFieldName: "Social Security Number" }
    );
  }
  for (const pdfFieldName of ["Check Box1", "Checkbox2"]) {
    const field = form.getField(pdfFieldName);
    if (!(field instanceof PDFCheckBox) || field.isChecked()) {
      throw new PennsylvaniaOfficialPdfError(
        "protected_field_modified",
        "Unconfirmed Rule 790 checkbox fields must remain blank.",
        { pdfFieldName }
      );
    }
  }
}

export type Rule790ReviewRenderResult = {
  bytes: Uint8Array;
  sha256: string;
  sourceSha256: string;
  sourcePath: string;
  pageCount: number;
  filledFieldNames: readonly string[];
  protectedBlankFieldNames: readonly string[];
  reviewOnly: true;
  participantPacket: false;
};

export async function renderRule790PetitionReviewComponent(input: {
  rootDir: string;
  facts: Readonly<Record<string, unknown>>;
}): Promise<Rule790ReviewRenderResult> {
  assertNoProtectedFacts(input.facts);
  const source = await verifyPennsylvaniaOfficialPdfSource(
    input.rootDir,
    "PA-RCRIM-P-790-PETITION"
  );
  assertExactRule790FieldInventory(source.fieldNames);

  const doc = await PDFDocument.load(source.bytes, LOAD_OPTIONS);
  const form = doc.getForm();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const filledFieldNames: string[] = [];

  for (const mapping of RULE_790_PETITION_TEXT_MAPPINGS) {
    const value = valueAtPath(input.facts, mapping.valuePath);
    if (!isSupplied(value)) {
      if (!mapping.allowBlank) {
        throw new PennsylvaniaOfficialPdfError(
          "missing_required_input",
          "A required Rule 790 review value was not supplied.",
          { pdfFieldName: mapping.pdfFieldName, valuePath: mapping.valuePath }
        );
      }
      continue;
    }
    const field = form.getField(mapping.pdfFieldName);
    if (!(field instanceof PDFTextField)) {
      throw new PennsylvaniaOfficialPdfError(
        "field_type_mismatch",
        "A Rule 790 text mapping does not resolve to a text field.",
        { pdfFieldName: mapping.pdfFieldName, valuePath: mapping.valuePath }
      );
    }
    const text = String(value);
    const maxLength = field.getMaxLength();
    if (maxLength !== undefined && text.length > maxLength) {
      throw new PennsylvaniaOfficialPdfError(
        "field_value_too_long",
        "A Rule 790 value exceeds the official field's maximum length.",
        {
          pdfFieldName: mapping.pdfFieldName,
          valuePath: mapping.valuePath,
          maxLength,
          actualLength: text.length
        }
      );
    }
    field.setText(text);
    filledFieldNames.push(mapping.pdfFieldName);
  }

  assertProtectedFieldsBlank(doc);
  form.updateFieldAppearances(font);
  doc.setModificationDate(DETERMINISTIC_TIMESTAMP);
  doc.setProducer("LegalEase");
  const bytes = await doc.save({
    addDefaultPage: false,
    updateFieldAppearances: false
  });

  const reopened = await PDFDocument.load(bytes, LOAD_OPTIONS);
  assertExactRule790FieldInventory(
    reopened.getForm().getFields().map((field) => field.getName())
  );
  assertProtectedFieldsBlank(reopened);
  if (reopened.getPageCount() !== 1) {
    throw new PennsylvaniaOfficialPdfError(
      "source_structure_mismatch",
      "The rendered Rule 790 review component must remain one page.",
      { actualPageCount: reopened.getPageCount() }
    );
  }

  return {
    bytes,
    sha256: sha256(bytes),
    sourceSha256: source.sha256,
    sourcePath: source.relativePath,
    pageCount: reopened.getPageCount(),
    filledFieldNames: Object.freeze([...filledFieldNames]),
    protectedBlankFieldNames: RULE_790_PETITION_PROTECTED_FIELDS,
    reviewOnly: true,
    participantPacket: false
  };
}

export async function assertPennsylvaniaPacketSourcesAvailable(
  rootDir: string,
  documentIds: readonly string[]
): Promise<readonly VerifiedPennsylvaniaSource[]> {
  const sources: VerifiedPennsylvaniaSource[] = [];
  const failures: Array<{ documentId: string; code: PennsylvaniaOfficialPdfErrorCode }> = [];
  for (const documentId of documentIds) {
    try {
      sources.push(await verifyPennsylvaniaOfficialPdfSource(rootDir, documentId));
    } catch (error) {
      if (error instanceof PennsylvaniaOfficialPdfError) {
        failures.push({ documentId, code: error.code });
        continue;
      }
      throw error;
    }
  }
  if (failures.length > 0) {
    throw new PennsylvaniaOfficialPdfError(
      "packet_source_incomplete",
      "A complete Pennsylvania participant packet cannot be assembled from the exact local sources.",
      { documentIds, failures }
    );
  }
  return Object.freeze(sources);
}
