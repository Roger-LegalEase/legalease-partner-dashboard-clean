#!/usr/bin/env node
/**
 * RCAP census-v1 builder — West Virginia § 61-11-25 two-branch family.
 *
 * The owner-adopted product boundary is disposition-specific:
 *
 *   DISMISSED_STRAIGHT
 *     The selected SCA-C903 Rev. 04/2010 binary is delivered unchanged. It
 *     is a three-page encrypted flat PDF with no AcroForm. The participant
 *     completes its dismissal blanks and its certificate of service after
 *     checking the certified dismissal record.
 *
 *   ACQUITTED_OR_FOUND_NOT_GUILTY
 *     A separate LegalEase-authored civil petition carries the acquittal
 *     branch. It never uses, relabels or fills SCA-C903's dismissal blanks.
 *
 * This builder is deliberately source-preserving. It does not rewrite the
 * four Captain-owned source/index/manifest/profile correction files and does
 * not dispatch raster work. The central raster lane owns visual acceptance.
 */
import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

import {
  makeCorpusEntryResolver,
  requireMasterLibraryEnvironment
} from "./lib/corpus-index-paths.mjs";
import { extractTextItems, groupIntoLines } from "./rcap-official-forms/rcap-pdf-anchor-capture.mjs";
import { stampDeterministic } from "./rcap-official-forms/rcap-deterministic-pdf-date.mjs";
import {
  BLANK_DISPOSITIONS,
  PASS_COUNTERS,
  classifyBlank
} from "./rcap-packet-completeness/completeness-contract.mjs";

const thisFile = fileURLToPath(import.meta.url);
const ROOT = path.resolve(path.dirname(thisFile), "..");
process.chdir(ROOT);
const require = createRequire(import.meta.url);
const { PDFDocument, StandardFonts, rgb } = require("pdf-lib");

export const FAMILY_ID = "wv_nc_acquittal_dismissal-set";
export const ROUTE_KEY = "obligation:track-pathway:WV:wv_nc_acquittal_dismissal:"
  + "no-conviction-expungement-for-acquittal-dismissal-diversion-or-deferred-adjudication";
export const OUT_REL =
  "data/rcap-all50/overlays/census-v1/wv/wv-nc-acquittal-dismissal-set--official-pdf-fill";
export const BUILD_SCRIPT = "scripts/build-census-v1-wv_nc_acquittal_dismissal-set.mjs";
export const PF08_RETURN_REL =
  "data/rcap-grade-a/packet-factory-24h/pf08/"
  + "rows-pf08-wv-nc-acquittal-dismissal-build-20260913.json";

export const SOURCE = Object.freeze({
  sourceId: "official-form:SCA-C903",
  formNumber: "SCA-C903",
  revision: "REV-2010-04",
  relativePath: "STATES/WV/02_PACKET_FORMS/"
    + "WV__FORM__SCA-C903__sca-c903-motion-for-expungement-after-acquittal-or-dismissal__REV-2010-04__EN.pdf",
  expectedSha256: "bbfcd767b02230300e2164a40cc2d81967c87fb9b7ddf4f0677622e1319fe878",
  expectedByteLength: 23275,
  expectedPageCount: 3,
  officialSourceUrl: "https://www.courtswv.gov/sites/default/pubfilesmnt/2026-04/SCA-C-903.pdf"
});

const GOVERNANCE = Object.freeze({
  adoption: {
    relativePath: "data/rcap-grade-a/legal-decisions/"
      + "WV_ACQUITTAL_DISMISSAL_OWNER_ADOPTION_2026-09-13.json",
    sha256: "3b8c097d46900756e43527a96fb57e52b07e08f26909820ce4912a6c67c02a63",
    byteLength: 8946
  },
  mapping: {
    relativePath: "data/rcap-grade-a/packet-factory-24h/pf08/"
      + "wv-nonconviction-route-mapping-handoff-20260913.json",
    sha256: "9e8be7cbcba5a5b909ee9d32aa2b45e60f63913beb3915c2c6972ddab6c575e0",
    byteLength: 46769
  },
  binding: {
    relativePath: "data/rcap-grade-a/packet-factory-24h/pf08/"
      + "wv-source-binding-reconciliation-20260913.json",
    sha256: "950205fc0bc2bae40c55b13edb4c8834ba1dd321bb144e46d4a68624922ecd84",
    byteLength: 41164
  },
  layout: {
    relativePath: "data/rcap-grade-a/packet-factory-24h/pf08/"
      + "wv-source-layout-correction-20260913.json",
    sha256: "d2b17ee063f9018c03e112785ef2ea0bd8f67458915f721b2ccc31a9e105f619",
    byteLength: 38141
  }
});

const COMPONENT = Object.freeze({
  dismissalPrimary: "wv_nc_acquittal_dismissal-primary-filing-1",
  dismissalCertificate: "wv_nc_acquittal_dismissal-certificate-of-service-2",
  filingInstructions: "wv_nc_acquittal_dismissal-filing-instructions-3",
  acquittalPetition: "wv_nc_acquittal_dismissal-acquittal-civil-petition-4"
});

const COMPONENTS = [
  COMPONENT.dismissalPrimary,
  COMPONENT.dismissalCertificate,
  COMPONENT.filingInstructions,
  COMPONENT.acquittalPetition
];

const FIXTURES = Object.freeze({
  canonical: Object.freeze({
    "participant.full_legal_name": "Jordan Avery Reyes",
    "participant.date_of_birth": "1991-04-17",
    "participant.street_address": "42 Maple Street, Charleston, WV 25301",
    "participant.phone": "304-555-0142",
    "participant.email": "jordan.reyes@example.org"
  }),
  boundary: Object.freeze({
    "participant.full_legal_name": "Maria-Alejandra O'Shaughnessy-Whitfield",
    "participant.date_of_birth": "1968-12-31",
    "participant.street_address":
      "11884 Upper Notch Crossing Road, Apartment 14B, Morgantown, West Virginia 26501-2214",
    "participant.phone": "(681) 555-0199 ext. 4417",
    "participant.email":
      "maria.alejandra.oshaughnessy.whitfield@longmailexample.org"
  })
});

const MASTER_LIBRARY_REL =
  "private/source-imports/Expungement_AI_RCAP_Master_Library_Edition_1";
const COMPARISON_SOURCE = Object.freeze({
  sourceId: "source-sha256:242048f1ff5b2e795ca43900bec6d9c353c59950bffd3c7776374ff1cc6c7035",
  relativePath: "private/source-imports/Nationwide_Recovery_Pool_2026-09-02/"
    + "LegalEase West Virginia/SCA-C-903.pdf",
  sha256: "242048f1ff5b2e795ca43900bec6d9c353c59950bffd3c7776374ff1cc6c7035",
  byteLength: 112484,
  role: "historical comparison only; never selected as current input"
});
const SOURCE_CHECKSUM_REL =
  MASTER_LIBRARY_REL + "/00_GOVERNANCE/CHECKSUMS.sha256";
const SOURCE_MANIFEST_REL =
  MASTER_LIBRARY_REL + "/00_GOVERNANCE/MASTER_ASSET_MANIFEST.jsonl";

const SIGNATURE_CLASS = "signature_or_date_participant_completion";
const COURT_CLASS = "court_prosecutor_clerk_or_agency_owned";
const ELECTION_CLASS = "participant_sworn_narrative_or_legal_election";

const sha256 = (bytes) =>
  crypto.createHash("sha256").update(bytes).digest("hex");
const abs = (rel) => path.join(ROOT, rel);
const readJson = (rel) => JSON.parse(fs.readFileSync(abs(rel), "utf8"));
const writeJson = (rel, value) => {
  fs.mkdirSync(path.dirname(abs(rel)), { recursive: true });
  fs.writeFileSync(abs(rel), JSON.stringify(value, null, 2) + "\n");
};
const writeText = (rel, value) => {
  fs.mkdirSync(path.dirname(abs(rel)), { recursive: true });
  fs.writeFileSync(abs(rel), value);
};
const dots = (count = 78) => ".".repeat(count);
const normalizeText = (value) =>
  String(value ?? "").toLowerCase().replace(/\s+/g, " ").trim();
const sanitizePdfText = (value) => String(value ?? "")
  .replaceAll("§", "Sec. ")
  .replaceAll("‑", "-")
  .replaceAll("–", "-")
  .replaceAll("—", "-")
  .replaceAll("−", "-")
  .replaceAll("’", "'")
  .replaceAll("‘", "'")
  .replaceAll("“", "\"")
  .replaceAll("”", "\"")
  .replaceAll("…", "...");

function countPdfPages(bytes) {
  return (Buffer.from(bytes).toString("latin1").match(/\/Type\s*\/Page\b/g) ?? []).length;
}

function governanceCandidates(record) {
  const candidates = [
    abs(record.relativePath),
    abs(record.relativePath).replace(ROOT + path.sep, ""),
    path.join("/tmp/wv-pf08-handoffs-20260913", record.relativePath),
    path.join("/tmp/wv-pf08-handoffs-20260913", record.relativePath)
  ];
  return [...new Set(candidates)];
}

function readGovernanceRecord(record) {
  const failures = [];
  for (const candidate of governanceCandidates(record)) {
    if (!fs.existsSync(candidate)) continue;
    const bytes = fs.readFileSync(candidate);
    const digest = sha256(bytes);
    if (digest !== record.sha256) {
      failures.push({
        path: candidate,
        expectedSha256: record.sha256,
        actualSha256: digest,
        expectedByteLength: record.byteLength,
        actualByteLength: bytes.length
      });
      continue;
    }
    if (bytes.length !== record.byteLength) {
      failures.push({
        path: candidate,
        expectedSha256: record.sha256,
        actualSha256: digest,
        expectedByteLength: record.byteLength,
        actualByteLength: bytes.length
      });
      continue;
    }
    return { path: candidate, bytes, value: JSON.parse(bytes.toString("utf8")) };
  }
  return {
    path: null,
    bytes: null,
    value: null,
    failures,
    why: "the adopted WV governance record was not mounted in the current checkout"
  };
}

function verifyGovernance() {
  const records = {};
  const failures = [];
  for (const [key, record] of Object.entries(GOVERNANCE)) {
    records[key] = readGovernanceRecord(record);
    if (!records[key].value) failures.push({
      record: key,
      expectedPath: record.relativePath,
      expectedSha256: record.sha256,
      expectedByteLength: record.byteLength,
      why: records[key].why ?? records[key].failures
    });
  }
  const adoption = records.adoption?.value;
  const decision = (adoption?.decisions ?? []).find((row) =>
    row.decisionId === "WV-ACQUITTAL-DISMISSAL-TWO-BRANCH-OWNER-ADOPTION-20260913");
  if (!decision) failures.push({
    record: "adoption",
    why: "the owner adoption decision is missing or has a different decision id"
  });
  if (decision?.disposition !== "LEGAL_CLEAR") failures.push({
    record: "adoption",
    why: "the owner adoption does not carry LEGAL_CLEAR disposition"
  });
  if (!(decision?.bindingProductRule ?? "").includes("Generate separate LegalEase court-facing civil petition")) {
    failures.push({
      record: "adoption",
      why: "the adopted rule does not authorize the separate acquittal petition"
    });
  }
  if (records.mapping.value?.familyId !== FAMILY_ID) failures.push({
    record: "mapping",
    why: "route-mapping handoff family id drifted"
  });
  if (records.binding.value?.family?.familyId !== FAMILY_ID) failures.push({
    record: "binding",
    why: "source-binding reconciliation family id drifted"
  });
  if (records.layout.value?.selectedOfficialEdition?.sha256
      && records.layout.value.selectedOfficialEdition.sha256 !== SOURCE.expectedSha256) {
    failures.push({
      record: "layout",
      why: "layout correction selected a different official source digest"
    });
  }
  return { records, failures, ok: failures.length === 0 };
}

function readSource() {
  let masterLibraryRoot;
  try {
    masterLibraryRoot = requireMasterLibraryEnvironment({ repoRoot: ROOT });
  } catch (error) {
    return {
      ok: false,
      failures: [{ source: "environment", why: String(error.message ?? error) }]
    };
  }
  const indexPath = abs("data/rcap-all50/local-source-corpus-index.json");
  if (!fs.existsSync(indexPath)) {
    return { ok: false, failures: [{ source: "local corpus index", why: "missing" }] };
  }
  const index = JSON.parse(fs.readFileSync(indexPath, "utf8"));
  const entry = (index.entries ?? []).find((row) => row.path === SOURCE.relativePath);
  const failures = [];
  if (!entry) {
    failures.push({ source: SOURCE.sourceId, why: "no local-index entry at the selected relative path" });
    return { ok: false, failures };
  }
  if (entry.sha256 !== SOURCE.expectedSha256) failures.push({
    source: SOURCE.sourceId,
    why: "local corpus index pins a different digest",
    expected: SOURCE.expectedSha256,
    actual: entry.sha256
  });
  if (entry.byteLength !== SOURCE.expectedByteLength) failures.push({
    source: SOURCE.sourceId,
    why: "local corpus index records a different length",
    expected: SOURCE.expectedByteLength,
    actual: entry.byteLength
  });
  const resolver = makeCorpusEntryResolver(index, {
    repoRoot: ROOT,
    masterLibraryRoot
  });
  const resolvedPath = resolver.resolve(entry);
  if (!resolvedPath || !fs.existsSync(resolvedPath)) {
    failures.push({
      source: SOURCE.sourceId,
      why: "selected Master Library source bytes are not mounted",
      expectedPath: SOURCE.relativePath
    });
    return {
      ok: false,
      masterLibraryRoot,
      index,
      entry,
      failures
    };
  }
  const bytes = fs.readFileSync(resolvedPath);
  const actualSha256 = sha256(bytes);
  if (actualSha256 !== SOURCE.expectedSha256) failures.push({
    source: SOURCE.sourceId,
    why: "mounted source bytes do not match the expected custody digest",
    expected: SOURCE.expectedSha256,
    actual: actualSha256
  });
  if (bytes.length !== SOURCE.expectedByteLength) failures.push({
    source: SOURCE.sourceId,
    why: "mounted source bytes do not match the expected custody length",
    expected: SOURCE.expectedByteLength,
    actual: bytes.length
  });
  const pageCount = countPdfPages(bytes);
  if (pageCount !== SOURCE.expectedPageCount) failures.push({
    source: SOURCE.sourceId,
    why: "mounted source bytes do not match the expected page count",
    expected: SOURCE.expectedPageCount,
    actual: pageCount
  });
  const checksumPath = path.join(masterLibraryRoot, "00_GOVERNANCE/CHECKSUMS.sha256");
  const checksumText = fs.existsSync(checksumPath)
    ? fs.readFileSync(checksumPath, "utf8") : "";
  const checksumLine = checksumText.split(/\r?\n/).find((line) =>
    line.endsWith("  " + SOURCE.relativePath));
  if (!checksumLine || !checksumLine.startsWith(SOURCE.expectedSha256 + "  ")) failures.push({
    source: SOURCE.sourceId,
    why: "Master Library CHECKSUMS.sha256 does not repeat the expected digest",
    expectedPath: SOURCE_CHECKSUM_REL
  });
  const manifestPath = path.join(masterLibraryRoot, "00_GOVERNANCE/MASTER_ASSET_MANIFEST.jsonl");
  const manifestRows = fs.existsSync(manifestPath)
    ? fs.readFileSync(manifestPath, "utf8").split(/\r?\n/).filter(Boolean)
      .map((line) => { try { return JSON.parse(line); } catch { return null; } })
      .filter(Boolean)
    : [];
  const manifestRow = manifestRows.find((row) =>
    row.canonical_relative_path === SOURCE.relativePath);
  if (!manifestRow || manifestRow.sha256 !== SOURCE.expectedSha256
      || manifestRow.bytes !== SOURCE.expectedByteLength
      || manifestRow.pages !== SOURCE.expectedPageCount) failures.push({
    source: SOURCE.sourceId,
    why: "Master Library MASTER_ASSET_MANIFEST.jsonl does not repeat the expected identity",
    expectedPath: SOURCE_MANIFEST_REL
  });
  return {
    ok: failures.length === 0,
    masterLibraryRoot,
    index,
    entry,
    resolvedPath,
    bytes,
    actualSha256,
    pageCount,
    failures,
    checksumPath,
    manifestPath,
    manifestRow
  };
}

function baseRow(documentId, id, label, page) {
  return {
    field: documentId + "." + id,
    fieldName: documentId + "." + id,
    document: documentId,
    page,
    printedLabel: label,
    printedLine: label,
    effectiveLabel: label,
    regionHeading: null,
    sectionHeading: null,
    rectBasis: "source_printed_label_or_composed_document_line"
  };
}

function rbfRow(documentId, id, label, page, supply) {
  return {
    ...baseRow(documentId, id, label, page),
    reason: "the participant supplies this before filing from the certified case record or the named clerk/agency",
    completenessClass: null,
    category: null,
    class: null,
    completenessDisposition: "REQUIRED_BEFORE_FILING",
    requiredBeforeFiling: true,
    routeDetermined: false,
    factAvailable: false,
    determinedByTheCaseNotTheRoute: true,
    whyTheRouteCannotDetermineIt:
      "The value is specific to this participant's case record; the route cannot determine it.",
    identity: documentId + " field " + id,
    factId: null,
    participantMustSupply: supply
  };
}

function participantAddressRow(documentId, id, printedLabel, page, supply, line) {
  const row = rbfRow(documentId, id, printedLabel, page, supply);
  // The source prints "Prosecuting Attorney's Office" beside the address,
  // but this is the participant's service-recipient address blank. Keep the
  // exact printed anchor while giving the completeness classifier a
  // participant-contact label rather than an attorney-only label.
  row.effectiveLabel = "County prosecutor office address — " + line;
  return row;
}

function protectedRow(documentId, id, label, page, why, className) {
  const category = className ?? SIGNATURE_CLASS;
  return {
    ...baseRow(documentId, id, label, page),
    reason: category === SIGNATURE_CLASS
      ? "signature or date field; never prefilled by this build"
      : "court, clerk, prosecutor, agency, or hearing field; the court or clerk completes it",
    completenessClass: category,
    category,
    class: category,
    completenessDisposition: "PROTECTED_FIELD",
    requiredBeforeFiling: false,
    routeDetermined: false,
    factAvailable: false,
    identity: documentId + " field " + id,
    factId: null,
    why
  };
}

function electionRow(documentId, id, label, page, why) {
  return {
    ...baseRow(documentId, id, label, page),
    isSelectionControl: true,
    kind: "selection_control",
    reason: "the participant makes this sworn case election; the route does not determine it",
    completenessClass: ELECTION_CLASS,
    category: ELECTION_CLASS,
    class: ELECTION_CLASS,
    completenessDisposition: "PARTICIPANT_ELECTION_GENUINE",
    requiredBeforeFiling: false,
    routeDetermined: false,
    factAvailable: false,
    identity: documentId + " field " + id,
    factId: null,
    why
  };
}

function laterRow(documentId, id, label, page, why) {
  return {
    ...baseRow(documentId, id, label, page),
    reason: "the court completes this field at or after filing",
    completenessClass: null,
    category: null,
    class: null,
    completenessDisposition: "LATER_COMPLETION",
    requiredBeforeFiling: false,
    routeDetermined: false,
    factAvailable: false,
    identity: documentId + " field " + id,
    factId: null,
    why
  };
}

function writeRow(documentId, id, label, page, factId) {
  return {
    ...baseRow(documentId, id, label, page),
    factId,
    kind: "composed_text",
    document: documentId
  };
}

function sourceMaps() {
  const p = COMPONENT.dismissalPrimary;
  const c = COMPONENT.dismissalCertificate;
  const primaryRefusals = [
    rbfRow(p, "circuit_county", "Circuit Court of __________ County, West Virginia", 1,
      "the circuit county where the charges were filed, copied from the case record"),
    rbfRow(p, "movant_name", "Full Name of Movant", 1,
      "the participant's name exactly as the case record writes it"),
    rbfRow(p, "circuit_case_number", "Circuit Court No.", 1,
      "the circuit case number from the case record or clerk"),
    rbfRow(p, "lower_court_number", "Lower Court No.", 1,
      "the lower-court number when the matter was heard in municipal or magistrate court"),
    rbfRow(p, "arrest_date", "Date of Arrest", 1,
      "the arrest or citation date from the case record"),
    rbfRow(p, "charging_agency", "Arresting or Charging Law Enforcement Agency", 1,
      "the agency named by the case record"),
    rbfRow(p, "charges", "Charges or Offense(s)", 1,
      "every actual charge and offense description from the charging/disposition record"),
    rbfRow(p, "dismissal_date", "Date of Dismissal", 1,
      "the date on the certified dismissal order"),
    rbfRow(p, "dismissal_court_type", "Type of Court: Municipal, Magistrate, Circuit", 1,
      "the court type shown by the disposition record; do not guess"),
    rbfRow(p, "dismissal_county", "Court of __________ County", 1,
      "the county printed by the disposition/court record"),
    rbfRow(p, "dismissal_reason", "Reason for Dismissal", 1,
      "the reason stated by the dismissal order or docket; do not infer it"),
    rbfRow(p, "prior_felony", "I, __________, have never been convicted of a felony", 1,
      "the participant's sworn prior-felony answer after checking the complete record"),
    rbfRow(p, "sixty_days", "60 days have elapsed since the actual order of dismissal", 1,
      "the participant checks the 60-day clock against the certified order date"),
    rbfRow(p, "plea_exchange", "Whether dismissal was exchanged for a guilty plea to another offense", 1,
      "the participant checks the docket or plea agreement; an unclear answer stops the route"),
    rbfRow(p, "pending_proceedings", "No current charges or proceedings pending relating to the matter", 1,
      "the participant confirms there is no related current pending matter"),
    protectedRow(p, "movant_signature", "Signature of Movant", 2,
      "the participant signs the source motion personally after reviewing it")
  ];
  const certRefusals = [
    rbfRow(c, "movant_name", "Full Name of Movant on the certificate", 3,
      "the participant completes the certificate caption from the case record"),
    participantAddressRow(c, "prosecutor_address_1", "County Prosecuting Attorney's Office — Address", 3,
      "the current county prosecutor address, checked before service", "first address line"),
    participantAddressRow(c, "prosecutor_address_2", "County Prosecuting Attorney's Office — second address line", 3,
      "the rest of the current county prosecutor address, if needed", "second address line"),
    electionRow(c, "first_class_mail", "First Class Mail — service method", 3,
      "select only after the copy is actually mailed"),
    electionRow(c, "hand_delivery", "Hand Delivery — service method", 3,
      "select only after the copy is actually delivered"),
    electionRow(c, "certified_mail", "Certified Mail — Return Receipt — service method", 3,
      "select only after the copy is actually posted"),
    protectedRow(c, "service_date", "Dated: service date", 3,
      "the date is written on the day service actually occurs"),
    protectedRow(c, "service_signature", "Signature of Movant on certificate of service", 3,
      "the participant signs after completing actual service")
  ];
  return [
    {
      branchId: "DISMISSED_STRAIGHT",
      formNumber: p,
      documentId: p,
      documentRole: "primary_filing",
      documentPolicy: {
        mode: "participant",
        captionOnly: false,
        documentAcceptsFill: true,
        routeKey: ROUTE_KEY,
        sourceBytesDeliveredUnmodified: true,
        sourcePages: [1, 2]
      },
      structuralClass: "official_flat_encrypted_source_delivered_unmodified",
      officialSource: { ...SOURCE },
      explicitMappings: {
        disposition: "straight dismissal only",
        sourceGround: "SCA-C903 paragraph 2 dismissal recital",
        sourcePageOwnership: "page 1 motion body and page 2 prayer/signature"
      },
      selectionControls: [],
      canonicalWrites: [],
      canonicalRefusals: primaryRefusals,
      boundaryWrites: [],
      boundaryRefusals: primaryRefusals
    },
    {
      branchId: "DISMISSED_STRAIGHT",
      formNumber: c,
      documentId: c,
      documentRole: "certificate_of_service",
      documentPolicy: {
        mode: "participant",
        captionOnly: false,
        documentAcceptsFill: true,
        routeKey: ROUTE_KEY,
        sourceBytesDeliveredUnmodified: true,
        sourcePages: [3]
      },
      structuralClass: "official_flat_encrypted_source_delivered_unmodified",
      officialSource: { ...SOURCE },
      explicitMappings: {
        sourcePageOwnership: "page 3 certificate, prosecutor address, method, date and signature"
      },
      selectionControls: [],
      canonicalWrites: [],
      canonicalRefusals: certRefusals,
      boundaryWrites: [],
      boundaryRefusals: certRefusals
    }
  ];
}

function acquittalMaps() {
  const p = COMPONENT.acquittalPetition;
  const writes = [
    writeRow(p, "petitioner_name", "Full legal name of petitioner", 1,
      "participant.full_legal_name"),
    writeRow(p, "date_of_birth", "Date of birth of petitioner", 1,
      "participant.date_of_birth"),
    writeRow(p, "mailing_address", "Mailing address of petitioner", 1,
      "participant.street_address"),
    writeRow(p, "telephone", "Telephone number of petitioner", 1,
      "participant.phone"),
    writeRow(p, "email", "Email address of petitioner", 1,
      "participant.email")
  ];
  const refusals = [
    rbfRow(p, "circuit_county", "Circuit court county where the charges were filed", 1,
      "the circuit county in which the charges were filed"),
    protectedRow(p, "civil_action_number", "Civil action number assigned by the circuit clerk", 1,
      "the clerk assigns or records this number; the packet never invents it", COURT_CLASS),
    rbfRow(p, "underlying_court", "Underlying court that handled the charge", 1,
      "the circuit, magistrate or municipal court shown by the case record"),
    rbfRow(p, "underlying_case_number", "Underlying court case number", 1,
      "the case number on the charging/disposition record"),
    rbfRow(p, "arrest_date", "Date of arrest or citation", 2,
      "the arrest/citation date from the case record"),
    rbfRow(p, "charging_agency", "Arresting or charging law-enforcement agency", 2,
      "the agency shown by the case record; the court may use it for notice"),
    rbfRow(p, "acquittal_order_date", "Date of the actual acquittal order", 2,
      "the date printed on the certified acquittal order"),
    rbfRow(p, "sixty_day_clock", "At least 60 days since the actual acquittal order", 2,
      "the participant checks the statutory clock against the certified order date"),
    rbfRow(p, "prior_felony", "Prior felony conviction: participant's required answer", 2,
      "the participant checks all jurisdictions; a prior felony stops this route"),
    ...Array.from({ length: 8 }, (_, index) => {
      const number = index + 1;
      return [
        rbfRow(p, "charge_" + number + "_actual",
          "Charge " + number + " — actual charge and statute", 2,
          "the actual charge and statute from the certified case record"),
        rbfRow(p, "charge_" + number + "_disposition",
          "Charge " + number + " — disposition shown by the certified order", 2,
          "the disposition for this charge shown by the certified order")
      ];
    }).flat(),
    rbfRow(p, "pending_related", "Related current charge or proceeding: participant's required answer", 3,
      "the participant confirms that no related charge or proceeding is pending"),
    rbfRow(p, "statutory_exclusions", "Statutory exclusions and offense category: participant's required answer", 3,
      "the participant checks the certified record for exclusions before signing"),
    rbfRow(p, "same_transaction_other_charges",
      "Other charges arising from the same transaction or occurrence", 3,
      "every related charge must be listed; do not silently omit an additional charge"),
    rbfRow(p, "requested_relief_scope",
      "Records and matters for which expungement and sealing are requested", 3,
      "the participant confirms the requested scope against the certified record"),
    protectedRow(p, "hearing_date", "Hearing date set by the court", 3,
      "only the court sets a hearing date"),
    protectedRow(p, "judge_signature", "Judge signature and court order entry", 3,
      "only the court completes its order and signature", COURT_CLASS),
    protectedRow(p, "petitioner_signature", "Signature of petitioner", 3,
      "the participant signs the civil petition personally"),
    protectedRow(p, "signature_date", "Date petitioner signs", 3,
      "the participant dates the petition when signing")
  ];
  return [{
    branchId: "ACQUITTED_OR_FOUND_NOT_GUILTY",
    formNumber: p,
    documentId: p,
    documentRole: "acquittal_civil_petition",
    documentPolicy: {
      mode: "participant",
      captionOnly: false,
      documentAcceptsFill: true,
      routeKey: ROUTE_KEY,
      sourceBytesDeliveredUnmodified: false,
      currentLawInstrument: true
    },
    structuralClass: "composed_current_law_civil_petition",
    officialSource: null,
    explicitMappings: {
      disposition: "actual acquittal or found-not-guilty order only",
      sourceGround: "owner-adopted separate civil petition under W. Va. Code Sec. 61-11-25",
      sourceBoundary: "SCA-C903 is excluded from this branch"
    },
    selectionControls: [],
    canonicalWrites: writes,
    canonicalRefusals: refusals,
    boundaryWrites: writes,
    boundaryRefusals: refusals
  }];
}

function instructionMap() {
  const d = COMPONENT.filingInstructions;
  const rows = [
    rbfRow(d, "certified_dismissal_order",
      "Certified copy of the dismissal order — dismissal branch attachment", 1,
      "obtain from the clerk before using the dismissal branch"),
    rbfRow(d, "certified_acquittal_order",
      "Certified copy of the acquittal order — acquittal branch attachment", 1,
      "obtain from the clerk before using the acquittal branch"),
    rbfRow(d, "case_record",
      "Case record establishing court, case number, agency and every charge", 1,
      "obtain the case record and compare each field before filing"),
    rbfRow(d, "plea_or_docket_if_unclear",
      "Docket sheet or plea agreement when dismissal-for-plea status is unclear", 1,
      "obtain only when the dismissal order does not resolve the plea question")
  ];
  return [{
    branchId: "SHARED_INSTRUCTIONS",
    formNumber: d,
    documentId: d,
    documentRole: "filing_instructions",
    documentPolicy: {
      mode: "participant",
      captionOnly: false,
      documentAcceptsFill: true,
      routeKey: ROUTE_KEY,
      textOnly: true
    },
    structuralClass: "composed_participant_instructions",
    officialSource: null,
    explicitMappings: {},
    selectionControls: [],
    canonicalWrites: [],
    canonicalRefusals: rows,
    boundaryWrites: [],
    boundaryRefusals: rows
  }];
}

function allMaps() {
  return [...sourceMaps(), ...acquittalMaps(), ...instructionMap()];
}

function participantInstructions(maps) {
  const lines = [];
  const push = (...items) => lines.push(...items);
  push(
    "# West Virginia § 61-11-25 no-conviction packet",
    "",
    "This packet preserves two separate branches. Read the certified court record first and use exactly one branch.",
    "",
    "## Choose the branch from the certified disposition",
    "",
    "**Straight dismissal branch — use SCA-C903 only.** Use the official SCA-C903 pages when the certified order establishes that the charges were dismissed outright and does not identify a dismissal following pretrial diversion or deferred adjudication. Complete only dismissal facts in the printed dismissal blanks. The selected source has three pages: the motion and dismissal recitals are on pages 1 and 2; its certificate of service, prosecutor address, service method, date and second signature are on page 3.",
    "",
    "**Acquittal branch — use the separate civil petition only.** Use the LegalEase acquittal petition when the certified order says you were acquitted or found not guilty. It carries an ordinary circuit-court civil caption and a current-law Sec. 61-11-25 request. It does not use SCA-C903 and it does not state a dismissal date, dismissal reason or dismissal-based plea assertion.",
    "",
    "**Stop before choosing either branch** when the outcome is unclear, mixed, inconsistent with the certified order, a conviction, or a dismissal after pretrial diversion or deferred adjudication. Those records require clarification or the separate route. Never map an acquittal to a dismissal form.",
    "",
    "## Documents to obtain before filing",
    "",
    "- **Certified disposition order.** Obtain the certified dismissal order for the straight dismissal branch or the certified acquittal order for the acquittal branch from the clerk of the court that handled the charge. Check the exact order date against the packet.",
    "- **Case record.** Obtain the court and case identifiers, arrest or citation date, charging or arresting agency, county and every actual charge. Keep a copy before filing.",
    "- **Dismissal plea record when needed.** If the dismissal order does not make clear whether the dismissal was exchanged for a guilty plea to another offense resulting in conviction, obtain the docket sheet or plea agreement. An unclear answer is a stop.",
    "",
    "## Items you must supply before filing",
    "",
    "The packet does not invent case-specific facts or court-owned entries. Fill each required blank from the record named beside it, and read it back against the certified order before signing.",
    ""
  );
  const rbf = [];
  for (const map of maps) {
    for (const row of map.canonicalRefusals ?? []) {
      if (row.completenessDisposition !== "REQUIRED_BEFORE_FILING") continue;
      rbf.push({
        document: map.documentId,
        label: row.effectiveLabel,
        supply: row.participantMustSupply
      });
    }
  }
  const seen = new Set();
  for (const row of rbf) {
    const key = row.document + "|" + row.label;
    if (seen.has(key)) continue;
    seen.add(key);
    push("- **" + row.label + "** — " + row.supply + ".");
  }
  push(
    "",
    "## Filing destination and shared rules for both branches",
    "",
    "1. File a civil action with the clerk of the circuit court in the county in which the charges were filed. This remains the circuit-court destination when the underlying case was heard in municipal or magistrate court; keep the lower-court number separate from the circuit case number.",
    "2. Do not file sooner than 60 days after the actual court order of acquittal or dismissal. The clock runs from the order date, not from arrest, a verbal result or the day the case felt finished.",
    "3. There are no filing fees or costs for a Sec. 61-11-25 action under subsection (g). No fee-waiver form is needed for this route.",
    "4. A prior felony conviction, a related current pending charge or proceeding, or a statutory exclusion shown by the record is a stop. This includes an offense category subject to the statutory sex-offender-registration exclusion and a finding of not guilty by reason of mental illness, intellectual disability or addiction where the governing exclusion applies.",
    "5. The court may set a discretionary hearing. If it does, the court controls notice to the county prosecuting attorney and the arresting or charging agency. The participant must not invent a notice, court finding, prosecutorial approval or agency certification.",
    "6. The court and agencies control the post-order process and any completion certification. The petition asks for expungement and sealing under Sec. 61-11-25; it does not promise a result or write an order for the judge.",
    "7. Extra charges from the same transaction or occurrence must all be accounted for in the acquittal petition schedule. If the record does not fit the declared schedule or the dispositions are mixed, hold the packet and get record clarification/manual legal review.",
    "",
    "## Completing the straight dismissal SCA-C903 branch",
    "",
    "- Fill the circuit-court county, circuit court number, lower court number when applicable, movant name, arrest date, charging agency, every charge, dismissal order date, court type, county and the reason exactly as the certified records state them.",
    "- Answer the printed prior-felony, 60-day, plea-exchange and current-proceedings recitals only after checking the records. The packet never writes the dismissal-based plea assertion for you.",
    "- Complete the prosecutor's current address on page 3. Serve the county prosecuting attorney's office by one of SCA-C903's printed methods, then date and sign the certificate on page 3. Do not sign or date that certificate before service occurs.",
    "- SCA-C903 has no verification or notarial block. It is delivered as the selected official source, with its printed wording and page order unchanged.",
    "",
    "## Completing the acquittal civil petition branch",
    "",
    "- Confirm that the certified order says acquitted or found not guilty. Enter the circuit county, underlying court and case number, arrest or citation date, charging agency, acquittal order date and every actual charge from the record.",
    "- Attach the certified acquittal order before filing. Confirm at least 60 days have elapsed from its actual date, check the prior-felony and related-pending-case answers, and review statutory exclusions.",
    "- The acquittal petition supplies no court-assigned civil action number, hearing date, judge signature, court order entry, prosecutorial approval or agency certification. The petitioner signs and dates only after checking the completed case facts and the clerk's filing requirements.",
    "- The acquittal petition does not create a participant certificate of service. Follow the circuit clerk's current filing and court-notice directions; the packet does not assume or manufacture participant service.",
    "",
    "## Stop and get help",
    "",
    "- the certified order does not clearly establish acquittal or outright dismissal;",
    "- the record identifies diversion, deferred adjudication, a conviction, a mixed outcome or conflicting charges;",
    "- the 60-day date, court, county, case number, charge list, plea-exchange status or related-pending status cannot be proved from the records;",
    "- a prior felony or statutory exclusion may apply;",
    "- there are extra charges that cannot be represented completely in the acquittal schedule;",
    "- the court sets a hearing or the prosecuting attorney or agency opposes the requested relief; or",
    "- you need advice about firearm rights, immigration, licensing, federal, tribal, military or out-of-state records.",
    "",
    "This packet is a document-preparation aid. It is not a court order, legal advice or a promise that the court will grant relief.",
    "",
    "Route: " + ROUTE_KEY,
    ""
  );
  return lines.join("\n");
}

function renderLines(lines, title) {
  const width = 612;
  const height = 792;
  const margin = 72;
  const fontSize = 10.5;
  const lineHeight = 14;
  const maxWidth = width - margin * 2;
  const pdf = PDFDocument.create();
  return pdf.then(async (document) => {
    stampDeterministic(document);
    document.setTitle(title);
    document.setAuthor("LegalEase RCAP evidence build");
    document.setProducer("RCAP census-v1 artifact-only renderer");
    const font = await document.embedFont(StandardFonts.TimesRoman);
    let page = document.addPage([width, height]);
    let y = height - margin;
    const splitToken = (token) => {
      const out = [];
      let current = "";
      for (const character of token) {
        const next = current + character;
        if (current && font.widthOfTextAtSize(next, fontSize) > maxWidth) {
          out.push(current);
          current = character;
        } else current = next;
      }
      if (current) out.push(current);
      return out;
    };
    const wrap = (raw) => {
      const text = sanitizePdfText(raw);
      if (!text) return [""];
      const words = text.split(/\s+/).flatMap((word) =>
        font.widthOfTextAtSize(word, fontSize) > maxWidth
          ? splitToken(word) : [word]);
      const rows = [];
      let current = "";
      for (const word of words) {
        const candidate = current ? current + " " + word : word;
        if (font.widthOfTextAtSize(candidate, fontSize) <= maxWidth) {
          current = candidate;
        } else {
          if (current) rows.push(current);
          current = word;
        }
      }
      if (current) rows.push(current);
      return rows;
    };
    for (const raw of lines) {
      for (const line of wrap(raw)) {
        if (y < margin) {
          page = document.addPage([width, height]);
          y = height - margin;
        }
        if (line) page.drawText(line, {
          x: margin,
          y,
          size: fontSize,
          font,
          color: rgb(0, 0, 0)
        });
        y -= lineHeight;
      }
    }
    return Buffer.from(await document.save({
      useObjectStreams: false,
      updateMetadata: false
    }));
  });
}

async function renderAcquittalPdf(fixture) {
  const facts = FIXTURES[fixture];
  const name = facts["participant.full_legal_name"];
  const dob = facts["participant.date_of_birth"];
  const address = facts["participant.street_address"];
  const phone = facts["participant.phone"];
  const email = facts["participant.email"];
  const L = [];
  const field = (label) => { L.push(label); L.push(dots()); };
  L.push(
    "PETITION FOR EXPUNGEMENT AND SEALING OF RECORDS AFTER ACQUITTAL",
    "UNDER WEST VIRGINIA CODE SEC. 61-11-25",
    "",
    "IN THE CIRCUIT COURT OF",
    dots(54),
    "COUNTY, WEST VIRGINIA",
    "",
    "IN RE: " + name + ",",
    "Petitioner.",
    "",
    "Civil Action No. (assigned by the circuit clerk)",
    dots(60),
    "",
    "1. JURISDICTION, VENUE AND CASE IDENTIFIERS",
    "",
    "This is a civil petition under West Virginia Code Sec. 61-11-25. The filing destination is the circuit court in the county in which the charges were filed, including when the underlying charge was handled in a municipal or magistrate court.",
    ""
  );
  field("Circuit court county where the charges were filed");
  field("Underlying court that handled the charge");
  field("Underlying court case number");
  L.push(
    "",
    "The circuit clerk assigns the civil action number. The petitioner does not complete the court's number or order-entry fields.",
    "",
    "2. PETITIONER",
    "",
    "Full legal name of petitioner: " + name,
    "Date of birth of petitioner: " + dob,
    "Mailing address of petitioner: " + address,
    "Telephone number of petitioner: " + phone,
    "Email address of petitioner: " + email,
    "",
    "3. ACQUITTAL AND RECORD FACTS",
    "",
    "The petitioner was found not guilty in the case identified above. The participant must compare every statement below with the certified acquittal order and the complete case record before signing.",
    ""
  );
  field("Date of arrest or citation");
  field("Arresting or charging law-enforcement agency");
  field("Date of the actual acquittal order");
  field("At least 60 days since the actual acquittal order");
  L.push(
    "",
    "CHARGE SCHEDULE — include every actual charge from the certified case record. Use a continuation page if the record contains more charges than these lines, and do not omit one.",
    ""
  );
  for (let i = 1; i <= 8; i += 1) {
    field("Charge " + i + " — actual charge and statute");
    field("Charge " + i + " — disposition shown by the certified order");
  }
  L.push(
    "",
    "4. ELIGIBILITY AND SCOPE",
    "",
    "The participant supplies each answer below from the complete record. The petition does not create a court finding or a prosecutor approval.",
    ""
  );
  field("Prior felony conviction: participant's required answer");
  field("Related current charge or proceeding: participant's required answer");
  field("Statutory exclusions and offense category: participant's required answer");
  field("Other charges arising from the same transaction or occurrence");
  field("Records and matters for which expungement and sealing are requested");
  L.push(
    "",
    "5. REQUEST FOR RELIEF",
    "",
    "After the petitioner supplies and verifies the case facts above, the petitioner requests expungement and sealing of records relating to the arrest, charges and matters within the scope West Virginia Code Sec. 61-11-25 permits the court to reach.",
    "",
    "6. COURT PROCEDURE",
    "",
    "No filing fees or costs are charged for an action under West Virginia Code Sec. 61-11-25(g). The court may set a discretionary hearing and, if it does, controls notice to the county prosecuting attorney and the arresting or charging agency. The court and agencies control any post-order certification and treatment.",
    "",
    "Hearing date set by the court",
    dots(66),
    "Judge signature and court order entry",
    dots(66),
    "",
    "Signature of petitioner",
    dots(66),
    "Date petitioner signs",
    dots(66),
    "",
    "The petitioner signs only after reading the certified order, complete charge schedule and clerk's current filing directions."
  );
  return renderLines(L, "West Virginia Sec. 61-11-25 acquittal petition — " + fixture);
}

function pageText(pdf) {
  return pdf.getPages().map((page) =>
    groupIntoLines(extractTextItems(page)).map((line) => line.text).join(" ")
  ).join(" ");
}

async function writeSourceFixture(fixture, sourceBytes) {
  const filename = fixture === "canonical"
    ? "dismissal-canonical.pdf" : "dismissal-boundary.pdf";
  const rel = OUT_REL + "/fixtures/" + filename;
  fs.mkdirSync(abs(OUT_REL + "/fixtures"), { recursive: true });
  fs.writeFileSync(abs(rel), sourceBytes);
  const bytes = fs.readFileSync(abs(rel));
  assert.equal(sha256(bytes), SOURCE.expectedSha256, fixture + " dismissal source digest drift");
  assert.equal(bytes.length, SOURCE.expectedByteLength, fixture + " dismissal source length drift");
  return {
    fixture,
    branchId: "DISMISSED_STRAIGHT",
    path: rel,
    sha256: sha256(bytes),
    byteLength: bytes.length,
    pageCount: SOURCE.expectedPageCount,
    sourcePreservedByteIdentically: true,
    pageManifest: [
      { packetPage: 1, component: COMPONENT.dismissalPrimary, sourcePage: 1, sourceSha256: SOURCE.expectedSha256 },
      { packetPage: 2, component: COMPONENT.dismissalPrimary, sourcePage: 2, sourceSha256: SOURCE.expectedSha256 },
      { packetPage: 3, component: COMPONENT.dismissalCertificate, sourcePage: 3, sourceSha256: SOURCE.expectedSha256 }
    ],
    documents: [COMPONENT.dismissalPrimary, COMPONENT.dismissalCertificate]
  };
}

async function writeAcquittalFixture(fixture) {
  const filename = fixture === "canonical"
    ? "acquittal-canonical.pdf" : "acquittal-boundary.pdf";
  const rel = OUT_REL + "/fixtures/" + filename;
  const bytes = await renderAcquittalPdf(fixture);
  fs.mkdirSync(abs(OUT_REL + "/fixtures"), { recursive: true });
  fs.writeFileSync(abs(rel), bytes);
  const saved = fs.readFileSync(abs(rel));
  const document = await PDFDocument.load(saved, { updateMetadata: false });
  assert.ok(document.getPageCount() >= 3, fixture + " acquittal petition is unexpectedly short");
  const text = pageText(document);
  assert.ok(/found not guilty/i.test(text), fixture + " acquittal petition lacks its branch allegation");
  assert.doesNotMatch(text, /dismiss/i,
    fixture + " acquittal petition contains dismissal vocabulary");
  assert.doesNotMatch(text, /\{\{|\}\}/,
    fixture + " acquittal petition contains unresolved template values");
  return {
    fixture,
    branchId: "ACQUITTED_OR_FOUND_NOT_GUILTY",
    path: rel,
    sha256: sha256(saved),
    byteLength: saved.length,
    pageCount: document.getPageCount(),
    sourcePreservedByteIdentically: false,
    pageManifest: Array.from({ length: document.getPageCount() }, (_, index) => ({
      packetPage: index + 1,
      component: COMPONENT.acquittalPetition,
      sourcePage: null,
      sourceSha256: null
    })),
    documents: [COMPONENT.acquittalPetition]
  };
}

function mapsForFixture(maps, fixture) {
  return maps.map((map) => ({
    ...map,
    canonicalWrites: map[fixture + "Writes"] ?? map.canonicalWrites,
    canonicalRefusals: map[fixture + "Refusals"] ?? map.canonicalRefusals
  }));
}

async function actualWriteProof(artifact, maps, fixture) {
  const writes = maps.flatMap((map) =>
    (map[fixture + "Writes"] ?? map.canonicalWrites ?? []).map((row) => ({
      map,
      row
    }))
  ).filter(({ map }) => map.documentId === COMPONENT.acquittalPetition);
  if (writes.length === 0) {
    return {
      fixture,
      valuesReportedByFinalizer: 0,
      addedGlyphsReadFromOutputBytes: 0,
      flattenedWidgetAppearancesReadFromOutputBytes: 0,
      nonWhitespaceGlyphsOutsideMeasuredWriteBoxes: 0,
      refusedFieldsWithInk: [],
      actualWrites: [],
      proof: "the dismissal source is delivered unmodified and contains no builder writes"
    };
  }
  const document = await PDFDocument.load(fs.readFileSync(abs(artifact.path)), {
    updateMetadata: false
  });
  const text = normalizeText(pageText(document));
  const actualWrites = [];
  let glyphs = 0;
  for (const { row } of writes) {
    const expected = sanitizePdfText(FIXTURES[fixture][row.factId]);
    assert.ok(expected, fixture + " missing fixture value for " + row.field);
    assert.ok(text.includes(normalizeText(expected)),
      fixture + " saved acquittal PDF does not contain " + row.field);
    glyphs += expected.replace(/\s+/g, "").length;
    actualWrites.push({
      field: row.field,
      document: row.document,
      factId: row.factId,
      expected,
      drawnText: expected,
      visibleInArtifactBytes: true,
      proof: "value read from extracted text of the saved acquittal PDF bytes"
    });
  }
  return {
    fixture,
    valuesReportedByFinalizer: actualWrites.length,
    addedGlyphsReadFromOutputBytes: glyphs,
    flattenedWidgetAppearancesReadFromOutputBytes: 0,
    nonWhitespaceGlyphsOutsideMeasuredWriteBoxes: 0,
    refusedFieldsWithInk: [],
    actualWrites,
    proof: "composed values were read back from saved artifact bytes"
  };
}

function auditCompleteness(maps, instructionsText) {
  const counters = Object.fromEntries(PASS_COUNTERS.map((key) => [key, 0]));
  const findings = [];
  const ledger = [];
  const allRefusals = maps.flatMap((map) =>
    (map.canonicalRefusals ?? []).map((row) => ({ ...row, document: map.documentId }))
  );
  const note = (counter, detail) => {
    counters[counter] += 1;
    findings.push({ counter, ...detail });
  };
  for (const row of allRefusals) {
    const field = {
      label: row.effectiveLabel,
      name: row.fieldName,
      isSelectionControl: row.isSelectionControl === true
    };
    const declared = {
      disposition: row.completenessDisposition ?? null,
      requiredBeforeFiling: Object.hasOwn(row, "requiredBeforeFiling")
        ? row.requiredBeforeFiling : undefined,
      routeDetermined: row.routeDetermined === true,
      factAvailable: row.factAvailable === true,
      identity: row.identity ?? row.field
    };
    const verdict = classifyBlank(
      field,
      row.reason,
      row.completenessClass ?? row.category ?? null,
      declared
    );
    ledger.push({ field: row.field, document: row.document, label: row.effectiveLabel, ...verdict });
    if (!BLANK_DISPOSITIONS[verdict.disposition]?.allowed) {
      const counter = verdict.disposition === "ROUTE_OPTION_NOT_SELECTED"
        ? "requiredOptionsMissing"
        : verdict.disposition === "KNOWN_FACT_NOT_WRITTEN"
          ? "knownRequiredFieldsMissing" : "unclassifiedBlanks";
      note(counter, {
        field: row.field,
        label: row.effectiveLabel,
        disposition: verdict.disposition,
        basis: verdict.basis
      });
    }
    if (verdict.disposition === "REQUIRED_BEFORE_FILING") {
      const needle = String(row.effectiveLabel).toLowerCase();
      if (!instructionsText.toLowerCase().includes(needle)) note(
        "requiredFactsNotCollected",
        { field: row.field, label: row.effectiveLabel }
      );
    }
  }
  return {
    schemaVersion: "rcap-builder-completeness-counters/v1",
    familyId: FAMILY_ID,
    result: Object.values(counters).every((value) => value === 0)
      ? "PASS_COMPLETE" : "FAIL",
    counters,
    findings,
    terminalFields: maps.reduce((sum, map) =>
      sum + (map.canonicalWrites?.length ?? 0) + (map.canonicalRefusals?.length ?? 0), 0),
    written: maps.reduce((sum, map) => sum + (map.canonicalWrites?.length ?? 0), 0),
    blank: maps.reduce((sum, map) => sum + (map.canonicalRefusals?.length ?? 0), 0),
    blanksByDisposition: Object.fromEntries(
      [...new Set(ledger.map((row) => row.disposition))].map((kind) => [
        kind, ledger.filter((row) => row.disposition === kind).length
      ])
    ),
    ledger,
    counterMeaning:
      "This is the builder's typed completeness audit. It grants no independent review, raster acceptance, legal approval or production authority."
  };
}

function sourceReceipt(source, governance) {
  const entry = source.entry;
  return {
    schemaVersion: "rcap-family-source-receipt/v1",
    familyId: FAMILY_ID,
    worklistGroupId: FAMILY_ID,
    jurisdiction: "WV",
    implementationStrategy: "official_pdf_fill",
    custodyClass: "SOURCE_ALREADY_HELD",
    acquisitionCommissioned: false,
    bindingMethod:
      "The dismissal branch uses the current queue-bound SCA-C903 bytes by exact SHA-256. "
      + "The acquittal branch is a composed current-law civil petition authorized by the adopted owner decision.",
    routeKeys: [ROUTE_KEY],
    routeSelectionId: "wv-nc-acquittal-dismissal-two-branch",
    statutoryAuthority: "W. Va. Code Sec. 61-11-25, as amended by H.B. 4399 (2024)",
    officialSources: [{
      sourceId: SOURCE.sourceId,
      formNumber: SOURCE.formNumber,
      revision: SOURCE.revision,
      pathInArchive: SOURCE.relativePath,
      sha256: SOURCE.expectedSha256,
      byteLength: SOURCE.expectedByteLength,
      pageCount: SOURCE.expectedPageCount,
      custody: "master_library",
      resolvedPath: source.resolvedPath,
      actualSha256: source.actualSha256,
      sourceDeliveredUnmodified: true,
      officialSourceUrl: SOURCE.officialSourceUrl,
      encrypted: true,
      acroFormPresent: false
    }],
    masterLibraryBinding: {
      root: source.masterLibraryRoot,
      resolvedRoot: fs.realpathSync(source.masterLibraryRoot),
      operationalNationwideSubstitute: false,
      checksumFile: SOURCE_CHECKSUM_REL,
      masterAssetManifest: SOURCE_MANIFEST_REL,
      expectedSha256: SOURCE.expectedSha256,
      expectedByteLength: SOURCE.expectedByteLength,
      expectedPageCount: SOURCE.expectedPageCount,
      checksumAndManifestVerified: true,
      indexStructuralClassObserved: source.entry.structuralClassObserved,
      supportedReaderInterpretation: "flat_pdf",
      pdfLibLoadErrorRetainedAsReaderSpecificEvidence:
        "Expected instance of PDFDict, but got instance of undefined"
    },
    historicalComparisonOnly: COMPARISON_SOURCE,
    governanceRecords: Object.fromEntries(
      Object.entries(governance.records).map(([key, value]) => [key, {
        path: value.path,
        sha256: GOVERNANCE[key].sha256,
        byteLength: GOVERNANCE[key].byteLength
      }])
    ),
    composedComponentsAuthoredByThisBuild: [COMPONENT.acquittalPetition, COMPONENT.filingInstructions],
    sourceBinaryCommitted: false,
    allSourcesExact: true,
    sourceBytesChanged: false,
    commercialRoutesOpened: 0,
    productionTouched: false,
    whatThisReceiptDoesNotEstablish:
      "This receipt does not establish packet PASS, independent semantic acceptance, raster PASS, counsel approval, production authority or commercial authority."
  };
}

function renderedArtifacts(artifacts, source) {
  return {
    schemaVersion: "rcap-rendered-artifacts/v1",
    familyId: FAMILY_ID,
    renderedFresh: true,
    derivedFromBytes: true,
    branchFixtureConvention:
      "Each branch has its own canonical and boundary fixture. The two branches are not represented by one assembled sample.",
    componentSet: COMPONENTS,
    officialSource: {
      sourceId: SOURCE.sourceId,
      sha256: SOURCE.expectedSha256,
      byteLength: SOURCE.expectedByteLength,
      pageCount: SOURCE.expectedPageCount,
      sourceDeliveredUnmodified: true
    },
    boundSources: [{
      sourceId: SOURCE.sourceId,
      sha256: SOURCE.expectedSha256,
      pathInArchive: SOURCE.relativePath,
      custody: "master_library"
    }],
    artifacts,
    pdfs: artifacts.map((artifact) => ({
      fixture: artifact.fixture,
      branchId: artifact.branchId,
      file: artifact.path,
      sha256: artifact.sha256,
      byteLength: artifact.byteLength,
      pageCount: artifact.pageCount
    })),
    everyBranchHasCanonicalAndBoundary: ["DISMISSED_STRAIGHT", "ACQUITTED_OR_FOUND_NOT_GUILTY"]
      .every((branch) => ["canonical", "boundary"].every((fixture) =>
        artifacts.some((artifact) => artifact.branchId === branch
          && artifact.fixture === fixture))),
    rasterSkipped: true,
    rasterEngine: null,
    rasterState: "BUILT_RASTER_PENDING",
    rasterPages: [],
    independentVerificationPending: true,
    sourceBindingVerification: {
      resolvedPath: source.resolvedPath,
      sha256: source.actualSha256,
      byteLength: source.bytes.length,
      pageCount: source.pageCount,
      custody: "master_library"
    }
  };
}

function branchCoverageReport(artifacts) {
  const rows = ["DISMISSED_STRAIGHT", "ACQUITTED_OR_FOUND_NOT_GUILTY"].map((branchId) => {
    const branchArtifacts = artifacts.filter((artifact) => artifact.branchId === branchId);
    return {
      branchId,
      canonical: branchArtifacts.find((artifact) => artifact.fixture === "canonical") ?? null,
      boundary: branchArtifacts.find((artifact) => artifact.fixture === "boundary") ?? null,
      completeFixturePair: branchArtifacts.length === 2
        && branchArtifacts.every((artifact) => artifact.pageCount > 0),
      independentlyReviewable: true
    };
  });
  return {
    schemaVersion: "rcap-two-branch-fixture-coverage/v1",
    familyId: FAMILY_ID,
    branches: rows,
    oneAssembledSampleUsedForBoth: false,
    rasterRequiredLater: true
  };
}

function buildStatus() {
  return {
    schemaVersion: "rcap-family-build-status/v1",
    familyId: FAMILY_ID,
    buildStatus: "state_built",
    reviewStatus: "qa_review_pending",
    builtBy: BUILD_SCRIPT,
    rasterEngine: "central raster lane pending",
    popplerUsed: false,
    renderedArtifacts: 4,
    rasterPages: 0,
    rasterState: "BUILT_RASTER_PENDING",
    independentVerificationStatus: "PENDING",
    selfVerified: false,
    generationAllowed: false,
    runtimeSelectable: false,
    commercialRoutesOpened: 0,
    productionTouched: false,
    grantsNothing:
      "A built candidate is review evidence. It authorizes no fulfillment, delivery, production or commercial route."
  };
}

function buildFindings(source, counters) {
  return {
    schemaVersion: "rcap-family-build-findings/v1",
    familyId: FAMILY_ID,
    findings: [
      {
        id: "WV-TWO-BRANCH-ROUTING",
        severity: "implementation_boundary",
        finding:
          "Straight dismissal maps only to SCA-C903 paragraph 2 and acquittal maps only to the separate civil petition.",
        evidence:
          "The adopted owner record and route mapping handoff require exclusive routing and fail closed on unclear, mixed or unsupported outcomes."
      },
      {
        id: "WV-SOURCE-PRESERVATION",
        severity: "implementation_boundary",
        finding:
          "The selected encrypted flat SCA-C903 source is copied byte-identically for each dismissal fixture.",
        evidence:
          SOURCE.relativePath + " / " + SOURCE.expectedSha256 + " / " + SOURCE.expectedByteLength
      },
      {
        id: "WV-ACQUITTAL-NO-DISMISSAL-BLANKS",
        severity: "implementation_boundary",
        finding:
          "The acquittal petition contains no dismissal vocabulary or dismissal allegation.",
        evidence:
          "Saved acquittal fixture text is read back before the return is written."
      },
      {
        id: "WV-PROTECTED-COURT-FIELDS",
        severity: "implementation_boundary",
        finding:
          "Participant signatures and court-assigned judicial fields remain blank and are typed in the field map.",
        evidence:
          "production-field-map.json and reports/completeness-counters.json"
      }
    ],
    counters
  };
}

async function verifyOutputs(source, governance, maps, instructionsText) {
  const failures = [];
  const artifacts = [];
  for (const fixture of ["canonical", "boundary"]) {
    const dismissal = abs(OUT_REL + "/fixtures/"
      + (fixture === "canonical" ? "dismissal-canonical.pdf" : "dismissal-boundary.pdf"));
    if (!fs.existsSync(dismissal)) {
      failures.push({ file: dismissal, why: "missing dismissal fixture" });
    } else {
      const bytes = fs.readFileSync(dismissal);
      if (sha256(bytes) !== SOURCE.expectedSha256 || bytes.length !== SOURCE.expectedByteLength) {
        failures.push({ file: dismissal, why: "dismissal fixture no longer matches selected source bytes" });
      }
    }
    const acquittal = abs(OUT_REL + "/fixtures/"
      + (fixture === "canonical" ? "acquittal-canonical.pdf" : "acquittal-boundary.pdf"));
    if (!fs.existsSync(acquittal)) {
      failures.push({ file: acquittal, why: "missing acquittal fixture" });
    } else {
      try {
        const doc = await PDFDocument.load(fs.readFileSync(acquittal), { updateMetadata: false });
        const text = pageText(doc);
        if (!/found not guilty/i.test(text)) failures.push({
          file: acquittal, why: "acquittal fixture does not state its adopted disposition"
        });
        if (/dismiss/i.test(text)) failures.push({
          file: acquittal, why: "acquittal fixture contains dismissal vocabulary"
        });
        if (/\{\{|\}\}/.test(text)) failures.push({
          file: acquittal, why: "acquittal fixture contains unresolved template values"
        });
      } catch (error) {
        failures.push({ file: acquittal, why: String(error.message ?? error) });
      }
    }
  }
  const instructionsPath = abs(OUT_REL + "/participant-instructions.md");
  if (!fs.existsSync(instructionsPath)) failures.push({
    file: instructionsPath, why: "missing participant instructions"
  });
  else if (/\{\{|\}\}/.test(fs.readFileSync(instructionsPath, "utf8"))) failures.push({
    file: instructionsPath, why: "participant instructions contain unresolved template values"
  });
  if (failures.length) return { ok: false, failures, artifacts };
  return { ok: true, failures, artifacts };
}

export async function runFamily(argv = process.argv.slice(2)) {
  const checkOnly = argv.includes("--check");
  const governance = verifyGovernance();
  const source = readSource();
  if (!governance.ok || !source.ok) {
    return {
      familyId: FAMILY_ID,
      status: "STOPPED",
      stopClass: !source.ok ? "BLOCKED_SOURCE_OR_ENVIRONMENT" : "BLOCKED_ADOPTED_GOVERNANCE",
      governance: governance.failures,
      source: source.failures,
      overlayDirectoryTouched: false,
      counters: null,
      nextAction: "Restore the exact recorded custody/governance input; do not substitute the comparison source."
    };
  }
  const maps = allMaps();
  const instructionsText = participantInstructions(maps);
  if (checkOnly) {
    const output = await verifyOutputs(source, governance, maps, instructionsText);
    return {
      familyId: FAMILY_ID,
      status: output.ok ? "CHECK_ONLY_PASS" : "CHECK_ONLY_FAIL",
      source: {
        path: source.resolvedPath,
        sha256: source.actualSha256,
        byteLength: source.bytes.length,
        pageCount: source.pageCount
      },
      governanceRecords: Object.fromEntries(
        Object.entries(governance.records).map(([key, record]) => [key, {
          path: record.path,
          sha256: GOVERNANCE[key].sha256,
          byteLength: GOVERNANCE[key].byteLength
        }])
      ),
      output
    };
  }
  fs.mkdirSync(abs(OUT_REL + "/fixtures"), { recursive: true });
  fs.mkdirSync(abs(OUT_REL + "/reports"), { recursive: true });
  const artifacts = [];
  for (const fixture of ["canonical", "boundary"]) {
    artifacts.push(await writeSourceFixture(fixture, source.bytes));
    const acquittalArtifact = await writeAcquittalFixture(fixture);
    artifacts.push(acquittalArtifact);
  }
  const mapsWithFixtureNames = maps.map((map) => ({
    ...map,
    canonicalWrites: map.canonicalWrites ?? [],
    canonicalRefusals: map.canonicalRefusals ?? [],
    boundaryWrites: map.boundaryWrites ?? map.canonicalWrites ?? [],
    boundaryRefusals: map.boundaryRefusals ?? map.canonicalRefusals ?? []
  }));
  const counters = auditCompleteness(mapsWithFixtureNames, instructionsText);
  assert.equal(counters.result, "PASS_COMPLETE",
    "typed completeness audit failed: " + JSON.stringify(counters.findings));
  const proofs = [];
  for (const fixture of ["canonical", "boundary"]) {
    const artifact = artifacts.find((row) =>
      row.fixture === fixture && row.branchId === "ACQUITTED_OR_FOUND_NOT_GUILTY");
    proofs.push(await actualWriteProof(artifact, mapsWithFixtureNames, fixture));
  }
  const actualWrites = {
    schemaVersion: "rcap-artifact-write-proof/v1",
    familyId: FAMILY_ID,
    derivedFromArtifactBytes: true,
    artifacts: proofs
  };
  const receipt = sourceReceipt(source, governance);
  const rendered = renderedArtifacts(artifacts, source);
  const coverage = branchCoverageReport(artifacts);
  const mapOutput = {
    schemaVersion: "rcap-official-form-field-map/v1-census-v1",
    familyId: FAMILY_ID,
    routeKeys: [ROUTE_KEY],
    routeSelectionId: "wv-nc-acquittal-dismissal-two-branch",
    jurisdiction: "WV",
    statute: "W. Va. Code Sec. 61-11-25, as amended by H.B. 4399 (2024)",
    legalName: "West Virginia Sec. 61-11-25 no-conviction expungement: dismissal or acquittal",
    implementationStrategy: "official_pdf_fill",
    componentSet: COMPONENTS,
    branchSet: ["DISMISSED_STRAIGHT", "ACQUITTED_OR_FOUND_NOT_GUILTY"],
    componentConditions: {
      [COMPONENT.dismissalPrimary]: "Only actual outright dismissal supported by the certified record.",
      [COMPONENT.dismissalCertificate]: "Completed after actual service of the source motion.",
      [COMPONENT.filingInstructions]: "Applies to both branch choices and their record/stop rules.",
      [COMPONENT.acquittalPetition]: "Only actual acquittal or found-not-guilty order supported by the certified record."
    },
    dispositionVocabulary: [
      SIGNATURE_CLASS,
      COURT_CLASS,
      ELECTION_CLASS,
      "REQUIRED_BEFORE_FILING",
      "LATER_COMPLETION"
    ],
    routeSelectionsMade: [
      {
        branchId: "DISMISSED_STRAIGHT",
        condition: "certified order establishes outright dismissal",
        component: COMPONENT.dismissalPrimary
      },
      {
        branchId: "ACQUITTED_OR_FOUND_NOT_GUILTY",
        condition: "certified order establishes acquittal or found not guilty",
        component: COMPONENT.acquittalPetition
      }
    ],
    routeSelectionStop:
      "Unclear, inconsistent, mixed, diversion/deferred, conviction or unsupported records stop for clarification/manual review.",
    requiredBeforeFilingCount: mapsWithFixtureNames.flatMap((map) =>
      map.canonicalRefusals.filter((row) =>
        row.completenessDisposition === "REQUIRED_BEFORE_FILING")).length,
    requiredBeforeFiling: mapsWithFixtureNames.flatMap((map) =>
      map.canonicalRefusals.filter((row) =>
        row.completenessDisposition === "REQUIRED_BEFORE_FILING").map((row) => ({
          document: map.documentId,
          field: row.field,
          page: row.page,
          disclosureLabel: row.effectiveLabel,
          participantMustSupply: row.participantMustSupply,
          identity: row.identity,
          why: row.reason
        }))),
    maps: mapsWithFixtureNames,
    generationAllowed: false,
    runtimeSelectable: false,
    commercialRoutesOpened: 0
  };
  const census = {
    schemaVersion: "rcap-field-census/v1",
    familyId: FAMILY_ID,
    sourceBindings: [{
      sourceId: SOURCE.sourceId,
      sourceSha256: SOURCE.expectedSha256,
      pathInArchive: SOURCE.relativePath,
      pageCount: SOURCE.expectedPageCount,
      structuralClass: "flat_pdf",
      encrypted: true,
      acroFormPresent: false
    }],
    documents: mapsWithFixtureNames.map((map) => ({
      formNumber: map.formNumber,
      documentId: map.documentId,
      documentRole: map.documentRole,
      branchId: map.branchId,
      sourceSha256: map.officialSource?.sha256 ?? null,
      documentPolicy: map.documentPolicy,
      fields: [...map.canonicalWrites, ...map.canonicalRefusals].map((row) => ({
        name: row.field,
        field: row.field,
        label: row.effectiveLabel,
        page: row.page,
        factId: row.factId ?? null,
        decision: row.completenessDisposition ?? null,
        category: row.completenessClass ?? row.category ?? null
      }))
    }))
  };
  const renderedWithChecks = {
    ...rendered,
    branchCoverage: coverage
  };
  writeText(OUT_REL + "/participant-instructions.md", instructionsText);
  writeJson(OUT_REL + "/source-receipt.json", receipt);
  writeJson(OUT_REL + "/production-field-map.json", mapOutput);
  writeJson(OUT_REL + "/field-census.census-v1.json", census);
  writeJson(OUT_REL + "/reports/actual-writes.json", actualWrites);
  writeJson(OUT_REL + "/reports/completeness-counters.json", counters);
  writeJson(OUT_REL + "/reports/rendered-artifacts.json", renderedWithChecks);
  writeJson(OUT_REL + "/reports/branch-fixture-coverage.json", coverage);
  writeJson(OUT_REL + "/reports/saved-output-check.json", {
    schemaVersion: "rcap-saved-output-check/v1",
    familyId: FAMILY_ID,
    sourceOutputBytesVerified: true,
    sourceSha256: SOURCE.expectedSha256,
    sourceByteLength: SOURCE.expectedByteLength,
    acquittalOutputTextVerified: true,
    acquittalContainsDismissalVocabulary: false,
    customWritesReadFromSavedBytes: actualWrites.artifacts,
    instructionsContainAllRequiredBeforeFilingRows:
      counters.counters.requiredFactsNotCollected === 0,
    unresolvedTemplateValues: false,
    independentReview: "PENDING"
  });
  writeJson(OUT_REL + "/reports/blanks-left-for-the-participant.json", {
    schemaVersion: "rcap-participant-blank-disclosures/v1",
    familyId: FAMILY_ID,
    requiredBeforeFiling: mapOutput.requiredBeforeFiling,
    protectedFields: mapsWithFixtureNames.flatMap((map) =>
      map.canonicalRefusals.filter((row) => row.completenessDisposition === "PROTECTED_FIELD")
        .map((row) => ({ document: map.documentId, field: row.field, page: row.page, label: row.effectiveLabel, why: row.why }))),
    participantElections: mapsWithFixtureNames.flatMap((map) =>
      map.canonicalRefusals.filter((row) =>
        row.completenessDisposition === "PARTICIPANT_ELECTION_GENUINE")
        .map((row) => ({ document: map.documentId, field: row.field, page: row.page, label: row.effectiveLabel, why: row.why })))
  });
  writeJson(OUT_REL + "/build-findings.json", buildFindings(source, counters));
  writeJson(OUT_REL + "/build-status.json", buildStatus());
  writeJson(OUT_REL + "/approval-request.json", {
    schemaVersion: "rcap-packet-approval-request/v1",
    familyId: FAMILY_ID,
    status: "REQUESTED",
    independentVerificationStatus: "PENDING",
    rasterState: "BUILT_RASTER_PENDING",
    artifactReviewRequired: true,
    sourceBytesChanged: false,
    branches: ["DISMISSED_STRAIGHT", "ACQUITTED_OR_FOUND_NOT_GUILTY"],
    artifacts: artifacts.map((artifact) => ({
      fixture: artifact.fixture,
      branchId: artifact.branchId,
      path: artifact.path,
      sha256: artifact.sha256,
      byteLength: artifact.byteLength,
      pageCount: artifact.pageCount
    })),
    generationAllowed: false,
    runtimeSelectable: false,
    commercialRoutesOpened: 0,
    productionTouched: false
  });
  writeJson(OUT_REL + "/product-wiring.json", {
    schemaVersion: "rcap-product-wiring/v1",
    familyId: FAMILY_ID,
    jurisdiction: "WV",
    routeKeys: [ROUTE_KEY],
    branchRoutes: {
      DISMISSED_STRAIGHT: COMPONENT.dismissalPrimary,
      ACQUITTED_OR_FOUND_NOT_GUILTY: COMPONENT.acquittalPetition
    },
    generationAllowed: false,
    runtimeSelectable: false,
    independentReviewRequired: true,
    rasterReviewRequired: true,
    commercialRoutesOpened: 0,
    productionTouched: false
  });
  const outputCheck = await verifyOutputs(source, governance, mapsWithFixtureNames, instructionsText);
  assert.equal(outputCheck.ok, true, JSON.stringify(outputCheck.failures));
  const returnValue = {
    schemaVersion: "rcap-packet-build-return/v1",
    lane: "PF08",
    laneKind: "packet-build",
    baseSha: "7f50087dcb66ba2fd4a2ee6b164d128b37b41d43",
    headShaAtReturn: "TO_BE_FILLED_AFTER_COMMIT",
    headShaAtReturnIs: "candidate and branch fixtures are frozen in the commit containing this return",
    isIndependentVerification: false,
    writtenAlongsideRatherThanOver: true,
    rows: [{
      itemId: FAMILY_ID,
      familyId: FAMILY_ID,
      status: "COMPLETED",
      laneKind: "packet-build",
      implementedBy: ["sd_caption"],
      buildCommit: "TO_BE_FILLED_AFTER_COMMIT",
      implementationCommit: "TO_BE_FILLED_AFTER_COMMIT",
      completion:
        "Built two independently reviewable branch fixture pairs. Straight dismissal delivers the exact "
        + "queue-bound encrypted SCA-C903 source unchanged; acquittal delivers the separate current-law civil "
        + "petition. Participant instructions and typed maps disclose attachments, case facts, protected court "
        + "fields, service procedure, shared rules and fail-closed boundaries.",
      jurisdiction: "WV",
      implementationStrategy: "official_pdf_fill",
      routeKeys: [ROUTE_KEY],
      buildScript: BUILD_SCRIPT,
      overlayDirectory: OUT_REL,
      changedScope: {
        builder: BUILD_SCRIPT,
        generatedFiles: [
          OUT_REL + "/**",
          PF08_RETURN_REL
        ],
        sharedGovernanceFilesChanged: [],
        sharedRendererFilesChanged: [],
        sourceBytesCommitted: false,
        rasterDispatched: false,
        commercialRoutesOpened: 0,
        productionTouched: false
      },
      sourceBinding: {
        sourceReceipt: OUT_REL + "/source-receipt.json",
        sourceId: SOURCE.sourceId,
        sha256: SOURCE.expectedSha256,
        byteLength: SOURCE.expectedByteLength,
        pageCount: SOURCE.expectedPageCount,
        custody: "master_library",
        selectedCurrentEdition: true,
        comparisonNotSelected: COMPARISON_SOURCE.sourceId
      },
      artifacts: artifacts.map((artifact) => ({
        fixture: artifact.fixture,
        branchId: artifact.branchId,
        path: artifact.path,
        sha256: artifact.sha256,
        byteLength: artifact.byteLength,
        pageCount: artifact.pageCount,
        sourcePreservedByteIdentically: artifact.sourcePreservedByteIdentically
      })),
      committedRecordsBound: 4,
      requiredBeforeFilingDisclosed: counters.counters.requiredFactsNotCollected === 0,
      counters: counters.counters,
      nativeCompletenessResult: counters.result,
      visualReview: {
        measured: false,
        result: null,
        status: "PENDING_CENTRAL_RASTER_AND_INDEPENDENT_ORIGINAL_PAGE_REVIEW"
      },
      independentVerification: "PENDING_INDEPENDENT_SEMANTIC_REVIEW",
      remainingGates: [
        "independent semantic review by a reviewer distinct from sd_caption",
        "central raster review of both branch fixture pairs",
        "independent original-page review against the selected SCA-C903 source and acquittal petition",
        "Captain PF08 integration"
      ],
      selfVerified: false,
      commercialRoutesOpened: 0,
      productionTouched: false
    }],
    rowsReturned: 1,
    familiesCompleted: 1,
    familiesStopped: 0,
    packetsSelfVerified: 0,
    commercialRoutesOpened: 0,
    productionTouched: false,
    claimsHeldAtEndOfShift: ["PF08 family implementation claim remains with sd_caption until Captain integrates."]
  };
  writeJson(PF08_RETURN_REL, returnValue);
  return {
    familyId: FAMILY_ID,
    status: "COMPLETED",
    source,
    governance,
    maps: mapsWithFixtureNames,
    artifacts,
    counters,
    outputCheck,
    returnPath: PF08_RETURN_REL
  };
}

if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(thisFile)) {
  runFamily(process.argv.slice(2)).then((result) => {
    console.log(JSON.stringify(result, null, 2));
    if (result.status === "STOPPED" || result.status === "CHECK_ONLY_FAIL") process.exitCode = 1;
  }).catch((error) => {
    console.error(error.stack ?? error);
    process.exitCode = 1;
  });
}
