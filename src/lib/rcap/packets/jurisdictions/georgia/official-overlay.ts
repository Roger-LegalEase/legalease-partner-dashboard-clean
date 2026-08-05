import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

import {
  PDFDocument,
  StandardFonts,
  rgb,
  type PDFFont,
  type PDFPage
} from "pdf-lib";

const LOAD_OPTIONS = { updateMetadata: false } as const;
const DETERMINISTIC_TIMESTAMP = new Date(Date.UTC(2000, 0, 1, 0, 0, 0));
const OVERLAY_FONT_SIZE = 9;
const MINIMUM_READABLE_FONT_SIZE = 9;

export const GEORGIA_OFFICIAL_OVERLAY_JOB_ID =
  "rcap-ga-flat-pdf-overlay" as const;
export const GEORGIA_OFFICIAL_OVERLAY_RUNTIME_DISABLED = true as const;
export const GEORGIA_OFFICIAL_OVERLAY_REVIEW_READY = false as const;
export const GEORGIA_OFFICIAL_OVERLAY_COUNSEL_ADOPTED = false as const;
export const GEORGIA_OFFICIAL_OVERLAY_RELEASE_ACTIVE = false as const;
export const GEORGIA_OFFICIAL_OVERLAY_ENGINE_FAMILY =
  "coordinate-overlay/1.0.1" as const;

export const GEORGIA_OFFICIAL_OVERLAY_TRACK_IDS = [
  "ga-nonconv-pre2013"
] as const;

export const GEORGIA_OFFICIAL_OVERLAY_COMPONENT_IDS = [
  "ga-nonconv-pre2013-primary-filing-1"
] as const;

export type GeorgiaOfficialOverlayTrackId =
  (typeof GEORGIA_OFFICIAL_OVERLAY_TRACK_IDS)[number];
export type GeorgiaOverlayOwnership =
  | "participant_supplied"
  | "derived_deterministically_from_participant_answers"
  | "manual_participant_completion"
  | "outside_party_completion"
  | "court_or_agency_only"
  | "prohibited_from_generation"
  | "intentionally_blank"
  | "not_used_by_assigned_route";

export type GeorgiaOverlayLineAnchor = Readonly<{
  x: number;
  y: number;
  maxWidth: number;
}>;

export type GeorgiaOverlayPlacement = Readonly<{
  regionId: string;
  page: 2;
  sourceRegions: readonly Readonly<{
    x: number;
    y: number;
    width: number;
    height: number;
  }>[];
  lineAnchors: readonly GeorgiaOverlayLineAnchor[];
  font: "Helvetica";
  fontSize: 9;
  ownership:
    | "participant_supplied"
    | "derived_deterministically_from_participant_answers";
  inputKey:
    | "arrestDate"
    | "arrestingAgency"
    | "cityStateZip"
    | "dateOfBirth"
    | "emailForAgency"
    | "fullLegalName"
    | "offensesArrestedFor"
    | "race"
    | "sex"
    | "socialSecurityNumber"
    | "streetAddressForCompletionLetter"
    | "telephoneNumber";
  transform:
    | "identity"
    | "city_from_city_state_zip"
    | "state_from_city_state_zip"
    | "zip_from_city_state_zip";
  confirmedAgainstSourceSha256: string;
  confirmedAgainstRenderedPage: true;
  coversOfficialText: false;
  treatment: string;
}>;

export type GeorgiaProtectedRegion = Readonly<{
  regionId: string;
  pages: readonly number[];
  ownership:
    | "manual_participant_completion"
    | "outside_party_completion"
    | "court_or_agency_only"
    | "prohibited_from_generation"
    | "not_used_by_assigned_route";
  treatment: "blank" | "unchanged";
  description: string;
}>;

export type GeorgiaOverlaySourceRequirement = Readonly<{
  sourceIdentityKey: "rcap-ga-gbi-gcic-request-to-restrict-arrest-record-prior-c9460dd6ad";
  documentId: "GBI-GCIC-REQUEST-TO-RESTRICT-ARREST-RECORD-PRIOR-TO-07-01-2013";
  documentRole: "PRIMARY_FILING";
  revision: "REV-2013-07-01";
  expectedSha256: string;
  expectedBytes: 449903;
  expectedMediaType: "application/pdf";
  expectedPageCount: 4;
  expectedFieldCount: 0;
  structuralClass: "flat_pdf";
  materializationDestination: string;
  componentIds: readonly ["ga-nonconv-pre2013-primary-filing-1"];
  trackIds: readonly ["ga-nonconv-pre2013"];
}>;

export type GeorgiaRenderedOverlayDocument = Readonly<{
  documentId: "GBI-GCIC-REQUEST-TO-RESTRICT-ARREST-RECORD-PRIOR-TO-07-01-2013";
  logicalComponentIds: readonly ["ga-nonconv-pre2013-primary-filing-1"];
  physicalCopyCount: 1;
  bytes: Uint8Array;
  sha256: string;
  sourceSha256: string;
  sourceIdentityKey: "rcap-ga-gbi-gcic-request-to-restrict-arrest-record-prior-c9460dd6ad";
  pageCount: 4;
  overlayPages: readonly [2];
  mappedRegionIds: readonly string[];
  protectedRegionIds: readonly string[];
}>;

export type GeorgiaOverlayTrackRenderResult = Readonly<{
  trackId: "ga-nonconv-pre2013";
  physicalDocuments: readonly [GeorgiaRenderedOverlayDocument];
  logicalComponentOrder: readonly ["ga-nonconv-pre2013-primary-filing-1"];
  runtimeDisabled: true;
  packetReady: false;
  counselAdopted: false;
  releaseActive: false;
  technicalFixtureOnly: true;
}>;

const SOURCE_SHA256 =
  "5fe841de263070f192ddfb0e322e41b2c2a97e8d07e7e643e98fdf780aefa1ab";

const line = (
  x: number,
  y: number,
  maxWidth: number
): GeorgiaOverlayLineAnchor => ({ x, y, maxWidth });

const placement = (input: {
  regionId: string;
  x: number;
  y: number;
  width: number;
  inputKey: GeorgiaOverlayPlacement["inputKey"];
  ownership?: GeorgiaOverlayPlacement["ownership"];
  transform?: GeorgiaOverlayPlacement["transform"];
  treatment: string;
}): GeorgiaOverlayPlacement => ({
  regionId: input.regionId,
  page: 2,
  sourceRegions: [
    {
      x: input.x,
      y: input.y - 1,
      width: input.width,
      height: 12
    }
  ],
  lineAnchors: [line(input.x, input.y, input.width)],
  font: "Helvetica",
  fontSize: OVERLAY_FONT_SIZE,
  ownership: input.ownership ?? "participant_supplied",
  inputKey: input.inputKey,
  transform: input.transform ?? "identity",
  confirmedAgainstSourceSha256: SOURCE_SHA256,
  confirmedAgainstRenderedPage: true,
  coversOfficialText: false,
  treatment: input.treatment
});

export const GEORGIA_OFFICIAL_OVERLAY_SOURCE_REQUIREMENT:
  GeorgiaOverlaySourceRequirement = Object.freeze({
    sourceIdentityKey:
      "rcap-ga-gbi-gcic-request-to-restrict-arrest-record-prior-c9460dd6ad",
    documentId:
      "GBI-GCIC-REQUEST-TO-RESTRICT-ARREST-RECORD-PRIOR-TO-07-01-2013",
    documentRole: "PRIMARY_FILING",
    revision: "REV-2013-07-01",
    expectedSha256: SOURCE_SHA256,
    expectedBytes: 449903,
    expectedMediaType: "application/pdf",
    expectedPageCount: 4,
    expectedFieldCount: 0,
    structuralClass: "flat_pdf",
    materializationDestination:
      "official-pdf/GA/GA__FORM__GBI-GCIC-REQUEST-TO-RESTRICT-ARREST-RECORD-PRIOR-TO-07-01-2013__agency-instructions-and-request-to-restrict-expunge-arrest-record__REV-2013-07-01__EN.pdf",
    componentIds: ["ga-nonconv-pre2013-primary-filing-1"] as const,
    trackIds: ["ga-nonconv-pre2013"] as const
  });

export const GEORGIA_OFFICIAL_OVERLAY_SOURCE_PAGES = Object.freeze(
  [1, 2, 3, 4].map((page) =>
    Object.freeze({
      page,
      mediaBox: Object.freeze({ x: 0, y: 0, width: 612, height: 792 }),
      cropBox: Object.freeze({ x: 0, y: 0, width: 612, height: 792 }),
      rotation: 0
    })
  )
);

/**
 * Page 2 is PDF page two (the form's printed "Page 1 of 3"). Coordinates are
 * bottom-left PDF points from the exact receipt-bound source. Each anchor was
 * derived from that source's text layer and confirmed against its 150-DPI
 * raster. Values sit above the printed underline; no label or instruction is
 * covered.
 */
export const GEORGIA_OFFICIAL_OVERLAY_PLACEMENTS:
  readonly GeorgiaOverlayPlacement[] = Object.freeze([
    placement({
      regionId: "section-one-full-legal-name",
      x: 106,
      y: 561,
      width: 428,
      inputKey: "fullLegalName",
      treatment: "Copy the participant's full legal name verbatim."
    }),
    placement({
      regionId: "section-one-date-of-birth",
      x: 136,
      y: 534,
      width: 155,
      inputKey: "dateOfBirth",
      treatment: "Copy the participant's date of birth verbatim."
    }),
    placement({
      regionId: "section-one-race",
      x: 324,
      y: 534,
      width: 100,
      inputKey: "race",
      treatment: "Copy the participant's form-supplied race value verbatim."
    }),
    placement({
      regionId: "section-one-sex",
      x: 451,
      y: 534,
      width: 84,
      inputKey: "sex",
      treatment: "Copy the participant's form-supplied sex value verbatim."
    }),
    placement({
      regionId: "section-one-social-security-number",
      x: 183,
      y: 507,
      width: 351,
      inputKey: "socialSecurityNumber",
      treatment:
        "Copy only the participant-supplied value requested by the controlling form; the runtime remains disabled."
    }),
    placement({
      regionId: "section-one-telephone-number",
      x: 166,
      y: 480,
      width: 111,
      inputKey: "telephoneNumber",
      treatment: "Copy the participant's agency contact number verbatim."
    }),
    placement({
      regionId: "section-one-email",
      x: 313,
      y: 480,
      width: 221,
      inputKey: "emailForAgency",
      treatment: "Copy the participant's agency contact email verbatim."
    }),
    placement({
      regionId: "section-one-street-address",
      x: 145,
      y: 453,
      width: 390,
      inputKey: "streetAddressForCompletionLetter",
      treatment:
        "Copy the participant's completion-letter street address verbatim."
    }),
    placement({
      regionId: "section-one-city",
      x: 96,
      y: 426,
      width: 210,
      inputKey: "cityStateZip",
      ownership: "derived_deterministically_from_participant_answers",
      transform: "city_from_city_state_zip",
      treatment:
        "Parse the participant's combined city, state, and ZIP answer without normalization."
    }),
    placement({
      regionId: "section-one-state",
      x: 341,
      y: 426,
      width: 89,
      inputKey: "cityStateZip",
      ownership: "derived_deterministically_from_participant_answers",
      transform: "state_from_city_state_zip",
      treatment:
        "Parse the participant's combined city, state, and ZIP answer without normalization."
    }),
    placement({
      regionId: "section-one-zip",
      x: 481,
      y: 426,
      width: 56,
      inputKey: "cityStateZip",
      ownership: "derived_deterministically_from_participant_answers",
      transform: "zip_from_city_state_zip",
      treatment:
        "Parse the participant's combined city, state, and ZIP answer without normalization."
    }),
    placement({
      regionId: "section-one-arresting-agency",
      x: 155,
      y: 399,
      width: 379,
      inputKey: "arrestingAgency",
      treatment: "Copy the participant-identified arresting agency verbatim."
    }),
    placement({
      regionId: "section-one-date-of-arrest",
      x: 142,
      y: 373,
      width: 390,
      inputKey: "arrestDate",
      treatment:
        "Copy the participant's one assigned arrest date verbatim; no eligibility conclusion is made."
    }),
    Object.freeze({
      regionId: "section-one-offenses-arrested-for",
      page: 2 as const,
      sourceRegions: Object.freeze([
        Object.freeze({ x: 188, y: 345, width: 346, height: 12 }),
        Object.freeze({ x: 74, y: 318, width: 461, height: 12 }),
        Object.freeze({ x: 74, y: 291, width: 461, height: 12 })
      ]),
      lineAnchors: Object.freeze([
        line(188, 346, 346),
        line(74, 319, 461),
        line(74, 292, 461)
      ]),
      font: "Helvetica" as const,
      fontSize: OVERLAY_FONT_SIZE,
      ownership: "participant_supplied" as const,
      inputKey: "offensesArrestedFor" as const,
      transform: "identity" as const,
      confirmedAgainstSourceSha256: SOURCE_SHA256,
      confirmedAgainstRenderedPage: true as const,
      coversOfficialText: false as const,
      treatment:
        "Wrap the participant's verbatim arrest-offense answer across only the source's three printed blank lines; refuse overflow."
    })
  ]);

export const GEORGIA_OFFICIAL_OVERLAY_PROTECTED_REGIONS:
  readonly GeorgiaProtectedRegion[] = Object.freeze([
    Object.freeze({
      regionId: "instructions-page",
      pages: [1],
      ownership: "not_used_by_assigned_route" as const,
      treatment: "unchanged" as const,
      description:
        "Agency instructions remain intact; the overlay writes no value on PDF page 1."
    }),
    Object.freeze({
      regionId: "gbi-use-only",
      pages: [2],
      ownership: "court_or_agency_only" as const,
      treatment: "blank" as const,
      description:
        "Money-order, certified-check, and GBI-reference entries are reserved for agency processing."
    }),
    Object.freeze({
      regionId: "applicant-signature-and-date",
      pages: [2],
      ownership: "manual_participant_completion" as const,
      treatment: "blank" as const,
      description:
        "The participant signs and dates Section One at execution."
    }),
    Object.freeze({
      regionId: "section-two-arrest-information",
      pages: [3],
      ownership: "outside_party_completion" as const,
      treatment: "blank" as const,
      description:
        "The arresting agency completes Section Two in its entirety."
    }),
    Object.freeze({
      regionId: "section-three-prosecuting-attorney",
      pages: [4],
      ownership: "outside_party_completion" as const,
      treatment: "blank" as const,
      description:
        "The prosecuting attorney completes Section Three in its entirety."
    })
  ]);

export const GEORGIA_OFFICIAL_OVERLAY_NORMALIZED_INPUT_KEYS = Object.freeze([
  "fullLegalName",
  "dateOfBirth",
  "race",
  "sex",
  "socialSecurityNumber",
  "telephoneNumber",
  "emailForAgency",
  "streetAddressForCompletionLetter",
  "cityStateZip",
  "arrestingAgency",
  "arrestDate",
  "offensesArrestedFor",
  "disposition",
  "appearsOnCriminalHistory",
  "pleaAgreementSameTransaction"
] as const);

export const GEORGIA_OFFICIAL_OVERLAY_UNWRITTEN_INPUTS = Object.freeze([
  Object.freeze({
    inputKey: "disposition",
    treatment: "not written; Section Two is arresting-agency completion"
  }),
  Object.freeze({
    inputKey: "appearsOnCriminalHistory",
    treatment: "not written; the source yes/no field is in agency-completed Section Two"
  }),
  Object.freeze({
    inputKey: "pleaAgreementSameTransaction",
    treatment:
      "not written; the renderer does not convert this screening answer into an agency or prosecutor assertion"
  })
]);

export const GEORGIA_OFFICIAL_OVERLAY_TECHNICAL_FIXTURES = Object.freeze([
  Object.freeze({
    fixtureId: "ga-nonconv-pre2013-synthetic-layout",
    trackId: "ga-nonconv-pre2013" as const,
    facts: Object.freeze({
      fullLegalName: "Morgan Example",
      dateOfBirth: "04/05/1986",
      race: "Synthetic",
      sex: "X",
      socialSecurityNumber: "000-00-0000",
      telephoneNumber: "404-555-0148",
      emailForAgency: "morgan@example.test",
      streetAddressForCompletionLetter: "125 Fixture Lane",
      cityStateZip: "Atlanta, GA 30303",
      arrestingAgency: "Fixture County Police Department",
      arrestDate: "06/15/2012",
      offensesArrestedFor:
        "Synthetic misdemeanor charge and synthetic ordinance allegation for deterministic layout testing only",
      disposition: "Synthetic participant answer; agency entry remains blank",
      appearsOnCriminalHistory: true,
      pleaAgreementSameTransaction: false
    })
  })
]);

export const GEORGIA_OFFICIAL_OVERLAY_EXPECTED_FIXTURE_HASHES =
  Object.freeze({
    "ga-nonconv-pre2013-synthetic-layout":
      "50ab667554ca4148a8488b844b82fc99799df88f2eb712e8c7c2ff9832e747ed"
  });

export class GeorgiaOfficialOverlayError extends Error {
  constructor(
    readonly code:
      | "content_overflow"
      | "invalid_city_state_zip"
      | "invalid_materialization_root"
      | "mapping_unconfirmed"
      | "missing_required_input"
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
    this.name = "GeorgiaOfficialOverlayError";
  }
}

function sha256(bytes: Uint8Array): string {
  return crypto.createHash("sha256").update(bytes).digest("hex");
}

function assertPageGeometry(document: PDFDocument): void {
  if (
    document.getPageCount() !==
    GEORGIA_OFFICIAL_OVERLAY_SOURCE_REQUIREMENT.expectedPageCount
  ) {
    throw new GeorgiaOfficialOverlayError(
      "source_structure_mismatch",
      "The Georgia source page count differs from its assignment.",
      {
        expected:
          GEORGIA_OFFICIAL_OVERLAY_SOURCE_REQUIREMENT.expectedPageCount,
        actual: document.getPageCount()
      }
    );
  }
  for (const expected of GEORGIA_OFFICIAL_OVERLAY_SOURCE_PAGES) {
    const page = document.getPage(expected.page - 1);
    const media = page.getMediaBox();
    const crop = page.getCropBox();
    if (
      media.x !== expected.mediaBox.x ||
      media.y !== expected.mediaBox.y ||
      media.width !== expected.mediaBox.width ||
      media.height !== expected.mediaBox.height ||
      crop.x !== expected.cropBox.x ||
      crop.y !== expected.cropBox.y ||
      crop.width !== expected.cropBox.width ||
      crop.height !== expected.cropBox.height ||
      page.getRotation().angle !== expected.rotation
    ) {
      throw new GeorgiaOfficialOverlayError(
        "source_structure_mismatch",
        `Georgia source page ${expected.page} geometry differs from its assignment.`,
        { page: expected.page }
      );
    }
  }
}

function assertSealedBoundary(root: string, destination: string): void {
  let rootStat: fs.Stats;
  try {
    rootStat = fs.lstatSync(root);
  } catch {
    throw new GeorgiaOfficialOverlayError(
      "invalid_materialization_root",
      "The source materialization root does not exist."
    );
  }
  if (
    !rootStat.isDirectory() ||
    rootStat.isSymbolicLink() ||
    (rootStat.mode & 0o777) !== 0o555
  ) {
    throw new GeorgiaOfficialOverlayError(
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
      throw new GeorgiaOfficialOverlayError(
        "invalid_materialization_root",
        "A source materialization directory is not sealed.",
        { path: current }
      );
    }
    if (current === root) break;
    const parent = path.dirname(current);
    if (parent === current) {
      throw new GeorgiaOfficialOverlayError(
        "invalid_materialization_root",
        "The assigned source escapes the materialization root."
      );
    }
    current = parent;
  }
}

export async function verifyGeorgiaOfficialOverlaySource(input: {
  materializationRoot: string;
}): Promise<Readonly<{
  absolutePath: string;
  bytes: Uint8Array;
  sha256: string;
  pageCount: 4;
  fieldCount: 0;
}>> {
  const requirement = GEORGIA_OFFICIAL_OVERLAY_SOURCE_REQUIREMENT;
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
    throw new GeorgiaOfficialOverlayError(
      "invalid_materialization_root",
      "The assigned source escapes the portable source contract."
    );
  }
  assertSealedBoundary(root, absolutePath);
  let stat: fs.Stats;
  try {
    stat = fs.lstatSync(absolutePath);
  } catch {
    throw new GeorgiaOfficialOverlayError(
      "source_missing",
      "The receipt-bound Georgia source is absent.",
      { sourceIdentityKey: requirement.sourceIdentityKey }
    );
  }
  if (
    !stat.isFile() ||
    stat.isSymbolicLink() ||
    stat.nlink !== 1 ||
    (stat.mode & 0o777) !== 0o444
  ) {
    throw new GeorgiaOfficialOverlayError(
      "source_structure_mismatch",
      "The assigned Georgia source is not a read-only regular file."
    );
  }
  const realPath = fs.realpathSync(absolutePath);
  const realRelative = path.relative(root, realPath);
  if (
    realRelative === ".." ||
    realRelative.startsWith(`..${path.sep}`) ||
    path.isAbsolute(realRelative)
  ) {
    throw new GeorgiaOfficialOverlayError(
      "invalid_materialization_root",
      "The assigned Georgia source resolves outside the portable source contract."
    );
  }
  if (stat.size !== requirement.expectedBytes) {
    throw new GeorgiaOfficialOverlayError(
      "source_hash_mismatch",
      "The Georgia source byte count differs from its receipt.",
      { expected: requirement.expectedBytes, actual: stat.size }
    );
  }
  const bytes = new Uint8Array(fs.readFileSync(absolutePath));
  if (Buffer.from(bytes.subarray(0, 5)).toString("ascii") !== "%PDF-") {
    throw new GeorgiaOfficialOverlayError(
      "source_media_type_mismatch",
      "The assigned Georgia source is not a PDF."
    );
  }
  const actualSha256 = sha256(bytes);
  if (actualSha256 !== requirement.expectedSha256) {
    throw new GeorgiaOfficialOverlayError(
      "source_hash_mismatch",
      "The Georgia source hash differs from its receipt.",
      { expected: requirement.expectedSha256, actual: actualSha256 }
    );
  }
  const latin = Buffer.from(bytes).toString("latin1");
  if (/\/Encrypt\b/u.test(latin) || /\/XFA\b/u.test(latin)) {
    throw new GeorgiaOfficialOverlayError(
      "source_structure_mismatch",
      "The assigned Georgia source is encrypted or XFA.",
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
    throw new GeorgiaOfficialOverlayError(
      "source_unreadable",
      "The assigned Georgia source cannot be parsed.",
      { reason: String((error as Error)?.message ?? "").slice(0, 160) }
    );
  }
  assertPageGeometry(document);
  const fieldCount = document.getForm().getFields().length;
  if (fieldCount !== requirement.expectedFieldCount) {
    throw new GeorgiaOfficialOverlayError(
      "source_structure_mismatch",
      "The assigned Georgia source is no longer a flat zero-field PDF.",
      { expected: requirement.expectedFieldCount, actual: fieldCount }
    );
  }
  return {
    absolutePath,
    bytes,
    sha256: actualSha256,
    pageCount: 4,
    fieldCount: 0
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
    "applicantSignature",
    "signatureDate",
    "moneyOrder",
    "certifiedCheck",
    "gbiReferenceNumber",
    "sid",
    "otn",
    "ori",
    "agencyCaseNumber",
    "agencyOfficialName",
    "agencyOfficialSignature",
    "agencyCompletionDate",
    "prosecutorName",
    "prosecutorSignature",
    "prosecutorDecision",
    "prosecutorComments"
  ];
  const supplied = protectedKeys.filter((key) => isSupplied(facts[key]));
  if (supplied.length > 0) {
    throw new GeorgiaOfficialOverlayError(
      "protected_input",
      "The Georgia technical renderer does not accept execution, agency, or prosecutor completion.",
      { supplied }
    );
  }
}

function parseCityStateZip(value: string): Readonly<{
  city: string;
  state: string;
  zip: string;
}> {
  const match =
    /^(.+),\s*([A-Za-z][A-Za-z .'-]{0,29})\s+(\d{5}(?:-\d{4})?)$/u.exec(
      value
    );
  const city = match?.[1]?.trim() ?? "";
  const state = match?.[2]?.trim() ?? "";
  const zip = match?.[3]?.trim() ?? "";
  if (!city || !state || !zip) {
    throw new GeorgiaOfficialOverlayError(
      "invalid_city_state_zip",
      "cityStateZip must contain participant-supplied city, state, and ZIP values in a parseable form.",
      { inputKey: "cityStateZip" }
    );
  }
  return { city, state, zip };
}

function valueForPlacement(
  placement: GeorgiaOverlayPlacement,
  facts: Readonly<Record<string, unknown>>
): string {
  const raw = facts[placement.inputKey];
  if (!isSupplied(raw)) {
    throw new GeorgiaOfficialOverlayError(
      "missing_required_input",
      `The normalized participant input ${placement.inputKey} is required for the Georgia overlay.`,
      { inputKey: placement.inputKey, regionId: placement.regionId }
    );
  }
  const value = String(raw).trim();
  if (placement.transform === "identity") return value;
  const parsed = parseCityStateZip(value);
  if (placement.transform === "city_from_city_state_zip") return parsed.city;
  if (placement.transform === "state_from_city_state_zip") return parsed.state;
  return parsed.zip;
}

function wrapToAnchors(
  value: string,
  anchors: readonly GeorgiaOverlayLineAnchor[],
  font: PDFFont,
  fontSize: number,
  regionId: string
): readonly string[] {
  const words = value.replace(/\r\n?/gu, "\n").split(/(\s+)/u);
  const lines: string[] = [];
  let current = "";
  for (const token of words) {
    if (!token) continue;
    if (token.includes("\n")) {
      const parts = token.split("\n");
      for (let index = 0; index < parts.length; index += 1) {
        const part = parts[index].trim();
        if (part) {
          const candidate = current ? `${current} ${part}` : part;
          const anchor = anchors[lines.length];
          if (
            !anchor ||
            font.widthOfTextAtSize(candidate, fontSize) > anchor.maxWidth
          ) {
            if (current) lines.push(current);
            current = part;
          } else {
            current = candidate;
          }
        }
        if (index < parts.length - 1) {
          if (current) lines.push(current);
          current = "";
        }
      }
      continue;
    }
    const word = token.trim();
    if (!word) continue;
    const lineIndex = lines.length;
    const anchor = anchors[lineIndex];
    if (!anchor) {
      throw new GeorgiaOfficialOverlayError(
        "content_overflow",
        "Participant text exceeds the confirmed Georgia overlay region.",
        { regionId, maxLines: anchors.length }
      );
    }
    if (font.widthOfTextAtSize(word, fontSize) > anchor.maxWidth) {
      throw new GeorgiaOfficialOverlayError(
        "content_overflow",
        "A participant value contains a word wider than the confirmed Georgia overlay region.",
        { regionId, maxWidth: anchor.maxWidth, fontSize }
      );
    }
    const candidate = current ? `${current} ${word}` : word;
    if (font.widthOfTextAtSize(candidate, fontSize) <= anchor.maxWidth) {
      current = candidate;
      continue;
    }
    if (current) lines.push(current);
    current = word;
  }
  if (current) lines.push(current);
  if (lines.length === 0 || lines.length > anchors.length) {
    throw new GeorgiaOfficialOverlayError(
      "content_overflow",
      "Participant text exceeds the confirmed Georgia overlay region.",
      { regionId, maxLines: anchors.length, actualLines: lines.length }
    );
  }
  for (let index = 0; index < lines.length; index += 1) {
    if (
      font.widthOfTextAtSize(lines[index], fontSize) >
      anchors[index].maxWidth
    ) {
      throw new GeorgiaOfficialOverlayError(
        "content_overflow",
        "Participant text exceeds the confirmed Georgia overlay width.",
        { regionId, line: index + 1 }
      );
    }
  }
  return Object.freeze(lines);
}

function assertPlacementGeometry(
  placement: GeorgiaOverlayPlacement,
  page: PDFPage
): void {
  if (
    placement.confirmedAgainstRenderedPage !== true ||
    placement.confirmedAgainstSourceSha256 !== SOURCE_SHA256
  ) {
    throw new GeorgiaOfficialOverlayError(
      "mapping_unconfirmed",
      `${placement.regionId} is not confirmed against the assigned source.`,
      { regionId: placement.regionId }
    );
  }
  if (
    placement.coversOfficialText !== false ||
    placement.fontSize < MINIMUM_READABLE_FONT_SIZE
  ) {
    throw new GeorgiaOfficialOverlayError(
      "mapping_unconfirmed",
      `${placement.regionId} violates the confirmed blank-only readable overlay contract.`,
      { regionId: placement.regionId }
    );
  }
  const { width, height } = page.getSize();
  if (
    placement.sourceRegions.length !== placement.lineAnchors.length ||
    placement.sourceRegions.some(
      (region) =>
        region.x < 0 ||
        region.y < 0 ||
        region.width <= 0 ||
        region.height <= 0 ||
        region.x + region.width > width ||
        region.y + region.height > height
    ) ||
    placement.lineAnchors.some(
      (entry) =>
        entry.x < 0 ||
        entry.y < 0 ||
        entry.maxWidth <= 0 ||
        entry.x + entry.maxWidth > width ||
        entry.y + placement.fontSize + 2 > height
    )
  ) {
    throw new GeorgiaOfficialOverlayError(
      "mapping_unconfirmed",
      `${placement.regionId} escapes the assigned page box.`,
      { regionId: placement.regionId }
    );
  }
}

export async function renderGeorgiaOfficialOverlayDocument(input: {
  materializationRoot: string;
  facts: Readonly<Record<string, unknown>>;
}): Promise<GeorgiaRenderedOverlayDocument> {
  assertNoProtectedInputs(input.facts);
  const source = await verifyGeorgiaOfficialOverlaySource({
    materializationRoot: input.materializationRoot
  });
  const document = await PDFDocument.load(source.bytes, LOAD_OPTIONS);
  const font = await document.embedFont(StandardFonts.Helvetica);
  const pages = document.getPages();
  const mappedRegionIds: string[] = [];

  for (const placement of GEORGIA_OFFICIAL_OVERLAY_PLACEMENTS) {
    const page = pages[placement.page - 1];
    if (!page) {
      throw new GeorgiaOfficialOverlayError(
        "mapping_unconfirmed",
        `${placement.regionId} names an absent source page.`,
        { regionId: placement.regionId, page: placement.page }
      );
    }
    assertPlacementGeometry(placement, page);
    const value = valueForPlacement(placement, input.facts);
    const lines = wrapToAnchors(
      value,
      placement.lineAnchors,
      font,
      placement.fontSize,
      placement.regionId
    );
    lines.forEach((text, index) => {
      const anchor = placement.lineAnchors[index];
      page.drawText(text, {
        x: anchor.x,
        y: anchor.y,
        size: placement.fontSize,
        font,
        color: rgb(0, 0, 0)
      });
    });
    mappedRegionIds.push(placement.regionId);
  }

  document.setModificationDate(DETERMINISTIC_TIMESTAMP);
  document.setProducer("LegalEase technical fixture");
  const bytes = await document.save({ addDefaultPage: false });
  const reopened = await PDFDocument.load(bytes, LOAD_OPTIONS);
  assertPageGeometry(reopened);
  if (reopened.getForm().getFields().length !== 0) {
    throw new GeorgiaOfficialOverlayError(
      "source_structure_mismatch",
      "The Georgia overlay unexpectedly created AcroForm fields."
    );
  }
  return {
    documentId:
      "GBI-GCIC-REQUEST-TO-RESTRICT-ARREST-RECORD-PRIOR-TO-07-01-2013",
    logicalComponentIds: ["ga-nonconv-pre2013-primary-filing-1"],
    physicalCopyCount: 1,
    bytes,
    sha256: sha256(bytes),
    sourceSha256: source.sha256,
    sourceIdentityKey: sourceRequirementIdentity(),
    pageCount: 4,
    overlayPages: [2],
    mappedRegionIds: Object.freeze(mappedRegionIds),
    protectedRegionIds: Object.freeze(
      GEORGIA_OFFICIAL_OVERLAY_PROTECTED_REGIONS.map(
        (region) => region.regionId
      )
    )
  };
}

function sourceRequirementIdentity():
  "rcap-ga-gbi-gcic-request-to-restrict-arrest-record-prior-c9460dd6ad" {
  return GEORGIA_OFFICIAL_OVERLAY_SOURCE_REQUIREMENT.sourceIdentityKey;
}

export async function renderGeorgiaOfficialOverlayTrack(input: {
  materializationRoot: string;
  trackId: GeorgiaOfficialOverlayTrackId;
  facts: Readonly<Record<string, unknown>>;
}): Promise<GeorgiaOverlayTrackRenderResult> {
  if (!GEORGIA_OFFICIAL_OVERLAY_TRACK_IDS.includes(input.trackId)) {
    throw new GeorgiaOfficialOverlayError(
      "unsupported_track",
      `The Georgia overlay assignment does not include ${input.trackId}.`,
      { trackId: input.trackId }
    );
  }
  const document = await renderGeorgiaOfficialOverlayDocument({
    materializationRoot: input.materializationRoot,
    facts: input.facts
  });
  return {
    trackId: "ga-nonconv-pre2013",
    physicalDocuments: [document],
    logicalComponentOrder: ["ga-nonconv-pre2013-primary-filing-1"],
    runtimeDisabled: true,
    packetReady: false,
    counselAdopted: false,
    releaseActive: false,
    technicalFixtureOnly: true
  };
}
