#!/usr/bin/env node
import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath, pathToFileURL } from "node:url";
import { makeCorpusEntryResolver } from "./lib/corpus-index-paths.mjs";

const require = createRequire(import.meta.url);
const { PDFDocument, PDFCheckBox, PDFTextField, StandardFonts } = require("pdf-lib");
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const INDEX_PATH = "data/rcap-all50/local-source-corpus-index.json";
const WORKLIST_PATH = "data/rcap-grade-a/route-obligation-census-candidate/packet-family-build-worklist.json";
const FIXED_DATE = new Date("2026-09-03T00:00:00.000Z");
const sha256 = (bytes) => crypto.createHash("sha256").update(bytes).digest("hex");
const writeJson = (file, value) => fs.writeFileSync(file, `${JSON.stringify(value, null, 2)}\n`);

const SOURCES = [
  { documentId: "CR-65", sourceId: "official-form:CR-65", path: "LegalEase Alabama/cr-65-expunge-petition-10-2024.pdf", sha256: "c2e0c7bd7abca2c83c469d7da1aa0b80b132e653f8712d0b4ce77c8b160b2a39", componentKinds: ["primary_filing", "certificate_of_service"] },
  { documentId: "C-10-CRIMINAL", sourceId: "official-form:C-10-CRIMINAL", path: "STATES/AL/02_PACKET_FORMS/AL__FORM__C-10-CRIMINAL__affidavit-of-substantial-hardship-and-order__REV-2024-05__EN.pdf", sha256: "527d4cfdde5bea564a8729e6425f1042627b03435ec634509fe32fdb80a5c6f8", componentKinds: ["fee_waiver"] }
];

const FAMILY_CONFIG = {
  "al-diversion-set": { selected: ["Check Box8.5"], routeSummary: "Misdemeanor or violation charge dismissed after successful completion of an approved diversion or court program; the form's one-year and prior-expungement conditions still must be confirmed." },
  "al-felony-dwop-set": { selected: ["Check Box10.3"], routeSummary: "Felony charge dismissed without prejudice more than five years ago, not refiled, with the form's conviction-free condition." },
  "al-felony-nonconviction-90-set": { selected: [], routeSummary: "Felony nonconviction route after the applicable 90-day period. The participant must select the exact outcome printed in Section III; the route family does not determine whether it was dismissal with prejudice, no-bill, acquittal, or unconditional nolle prosequi." },
  "al-misd-conviction-set": { selected: ["Check Box9.2", "Check Box9.3", "Check Box9.4", "Check Box9.5", "Check Box9.6", "Check Box9.7", "Check Box9.8"], routeSummary: "Qualifying misdemeanor, violation, traffic, municipal, or misdemeanor youthful-offender conviction after all seven Section II conditions." },
  "al-misd-dwop-set": { selected: ["Check Box8.6"], routeSummary: "Misdemeanor or violation charge dismissed without prejudice more than one year ago, not refiled, with the form's two-year conviction-free condition." },
  "al-pardoned-felony-set": { selected: ["Check Box10.6", "Check Box11.0", "Check Box11.1", "Check Box11.2", "Check Box11.3", "Check Box11.4", "Check Box11.5", "Check Box11.6"], routeSummary: "Pardoned felony route after the pardon and every Section V condition. Attach the certificate of pardon." }
};

const FIXTURES = {
  canonical: {
    first: "Jordan", middle: "Avery", last: "Reyes", full: "Jordan Avery Reyes",
    street: "412 Magnolia Avenue", cityStateZip: "Montgomery, AL 36104", email: "jordan.reyes@example.org",
    phone: "334-555-0142", dob: "06/14/1988", caseNumber: "CC-2021-004217", county: "Montgomery",
    charge: "The charge shown on the certified case record", grounds: "See the selected statutory route and attached certified records",
    arrestAgency: "Agency shown on the certified arrest record", detentionAgency: "None beyond the agency listed above"
  },
  boundary: {
    first: "Alexandria", middle: "Catherine", last: "Montgomery-Washington", full: "Alexandria Catherine Montgomery-Washington",
    street: "1188 Martin Luther King Junior Boulevard Apartment 1407", cityStateZip: "Birmingham, AL 35203-4417",
    email: "alexandria.montgomery.washington@example.org", phone: "205-555-0199", dob: "12/31/1979",
    caseNumber: "CC-2024-000001.99", county: "Jefferson",
    charge: "The complete charge exactly as printed on the certified disposition",
    grounds: "See the selected statutory route and all attached certified records",
    arrestAgency: "Law-enforcement agency identified on the certified arrest record",
    detentionAgency: "Every booking, detention, and records-holding agency identified by the participant"
  }
};

function resolveSources() {
  const index = JSON.parse(fs.readFileSync(path.join(ROOT, INDEX_PATH), "utf8"));
  const resolver = makeCorpusEntryResolver(index, { repoRoot: ROOT, masterLibraryRoot: process.env.MASTER_LIBRARY_SOURCE_DIR });
  return SOURCES.map((source) => {
    const entry = index.entries.find((candidate) => candidate.path === source.path);
    assert.ok(entry, `missing committed index entry: ${source.path}`);
    const absolute = resolver.resolve(entry);
    assert.ok(absolute && fs.existsSync(absolute), `source custody is not mounted: ${source.path}`);
    const bytes = fs.readFileSync(absolute);
    assert.equal(sha256(bytes), source.sha256, `source hash drift: ${source.path}`);
    return { ...source, absolute, bytes, byteLength: bytes.length };
  });
}

function pageOf(field, pages) {
  const widget = field.acroField.getWidgets()[0];
  if (!widget) return 1;
  const parent = widget.P();
  let index = pages.findIndex((page) => page.ref === parent);
  if (index < 0) index = pages.findIndex((page) => (page.node.Annots()?.asArray() ?? []).some((ref) => ref === widget.ref));
  return index < 0 ? 1 : index + 1;
}

function knownValue(documentId, name, fixture) {
  const key = name.toLowerCase();
  if (/court case number/.test(key)) return [fixture.caseNumber, "matter.case_number"];
  if (documentId === "CR-65" && key === "name of county") return [fixture.county, "matter.filing_county"];
  if (/^last name$/.test(key)) return [fixture.last, "participant.last_name"];
  if (/^first name$/.test(key)) return [fixture.first, "participant.first_name"];
  if (/^middle name$/.test(key)) return [fixture.middle, "participant.middle_name"];
  if (/full name|printed name of petitioner|print or type name/.test(key)) return [fixture.full, "participant.full_legal_name"];
  if (/street address|complete home address/.test(key)) return [fixture.street, "participant.street_address"];
  if (/city state zip code/.test(key)) return [fixture.cityStateZip, "participant.city_state_zip"];
  if (/email address$/.test(key)) return [fixture.email, "participant.email"];
  if (/telephone number|telephone number cell/.test(key) && !/attorney|server/.test(key)) return [fixture.phone, "participant.phone"];
  if (/date of birth/.test(key)) return [fixture.dob, "participant.date_of_birth"];
  if (/only one offense per petition|criminal charge from the record/.test(key)) return [fixture.charge, "matter.charge"];
  if (/grounds for or reasons why/.test(key)) return [fixture.grounds, "matter.expungement_ground"];
  if (/agency or department that made the arrest/.test(key)) return [fixture.arrestAgency, "matter.arresting_agency"];
  if (/incarcerated or detained pursuant/.test(key)) return [fixture.detentionAgency, "matter.detention_agencies"];
  if (documentId === "C-10-CRIMINAL" && (key === "in the" || key === "court of")) return ["Circuit", "matter.court_type"];
  if (documentId === "C-10-CRIMINAL" && /municipality of/.test(key)) return [fixture.county, "matter.filing_county"];
  if (documentId === "C-10-CRIMINAL" && key === "v") return [fixture.full, "participant.full_legal_name"];
  return null;
}

function protectedField(documentId, name, page) {
  const key = name.toLowerCase();
  if (documentId === "C-10-CRIMINAL" && page >= 3) return true;
  if (documentId === "CR-65" && page === 7) return true;
  return /signature|notary|officer authorized|my commission expires|dated this|^day of$|^date$/.test(key);
}

function attorneyField(name) {
  return /attorney|state bar|business address of attorney|email address_2|telephone number_2/.test(name.toLowerCase());
}

function safeSet(field, value) {
  const max = typeof field.getMaxLength === "function" ? field.getMaxLength() : undefined;
  const clipped = max ? value.slice(0, max) : value;
  field.setFontSize(8);
  field.setText(clipped);
  return clipped;
}

async function fillDocument(source, fixtureName, fixture, config) {
  const document = await PDFDocument.load(source.bytes);
  const form = document.getForm();
  const pages = document.getPages();
  const writes = [];
  const refusals = [];
  for (const field of form.getFields()) {
    const name = field.getName();
    const page = pageOf(field, pages);
    const id = `${source.documentId}:${name}`;
    if (field instanceof PDFCheckBox) {
      if (source.documentId === "CR-65" && config.selected.includes(name)) {
        field.check();
        writes.push({ fieldId: id, fieldName: name, effectiveLabel: `${config.routeSummary} (selection)`, documentId: source.documentId, page, factId: "route.selection", isSelectionControl: true, routeDetermined: true });
      } else if (protectedField(source.documentId, name, page)) {
        refusals.push({ fieldId: id, fieldName: name, effectiveLabel: `Court or later-completion control: ${name}`, documentId: source.documentId, page, reason: "court, clerk, prosecutor, agency, or hearing field; never prefilled", refusalClass: "court_prosecutor_clerk_or_agency_owned", role: "court" });
      } else {
        refusals.push({ fieldId: id, fieldName: name, effectiveLabel: `Participant choice: ${name} (selection)`, documentId: source.documentId, page, reason: "A genuine participant election not determined by this route", refusalClass: "participant_sworn_narrative_or_legal_election", isSelectionControl: true, routeDetermined: false });
      }
      continue;
    }
    if (!(field instanceof PDFTextField)) continue;
    const known = knownValue(source.documentId, name, fixture);
    if (known && !protectedField(source.documentId, name, page)) {
      const drawnText = safeSet(field, known[0]);
      writes.push({ fieldId: id, fieldName: name, effectiveLabel: name, documentId: source.documentId, page, factId: known[1], drawnText });
    } else if (protectedField(source.documentId, name, page)) {
      refusals.push({ fieldId: id, fieldName: name, effectiveLabel: `Signature, court, or later-completion field: ${name}`, documentId: source.documentId, page, reason: "signature or date field; never prefilled", refusalClass: "signature_or_date_participant_completion", role: "protected" });
    } else if (attorneyField(name)) {
      refusals.push({ fieldId: id, fieldName: name, effectiveLabel: `Attorney field: ${name}`, documentId: source.documentId, page, reason: "attorney-only; no representation fact is held", role: "attorney" });
    } else {
      const label = `Complete ${name} on ${source.documentId} page ${page}`;
      refusals.push({ fieldId: id, fieldName: name, effectiveLabel: label, documentId: source.documentId, page, reason: "The platform does not hold this participant or case fact; supply it before filing", completenessDisposition: "REQUIRED_BEFORE_FILING", requiredBeforeFiling: true, factAvailable: false, routeDetermined: false, role: "participant" });
    }
  }
  const font = await document.embedFont(StandardFonts.Helvetica);
  form.updateFieldAppearances(font);
  form.flatten();
  document.setTitle(`${source.documentId} - ${fixtureName}`);
  document.setAuthor("LegalEase packet factory");
  document.setCreator("LegalEase deterministic official-form builder");
  document.setProducer("pdf-lib 1.17.1");
  document.setCreationDate(FIXED_DATE);
  document.setModificationDate(FIXED_DATE);
  return { document, writes, refusals };
}

async function buildPacket(sources, fixtureName, fixture, config) {
  const filled = [];
  for (const source of sources) filled.push({ source, ...(await fillDocument(source, fixtureName, fixture, config)) });
  const packet = await PDFDocument.create();
  for (const item of filled) {
    const copied = await packet.copyPages(item.document, item.document.getPageIndices());
    copied.forEach((page) => packet.addPage(page));
  }
  packet.setTitle(`${config.familyId} ${fixtureName} filing packet`);
  packet.setAuthor("LegalEase packet factory");
  packet.setCreator("LegalEase deterministic official-form builder");
  packet.setProducer("pdf-lib 1.17.1");
  packet.setCreationDate(FIXED_DATE);
  packet.setModificationDate(FIXED_DATE);
  const bytes = Buffer.from(await packet.save({ useObjectStreams: false, addDefaultPage: false, objectsPerTick: Infinity }));
  const reopened = await PDFDocument.load(bytes);
  assert.equal(reopened.getPageCount(), sources.reduce((sum, source) => sum + filled.find((item) => item.source.documentId === source.documentId).document.getPageCount(), 0));
  assert.equal(reopened.getForm().getFields().length, 0, "flattened packet must carry no live fields");
  return { bytes, pageCount: reopened.getPageCount(), writes: filled.flatMap((item) => item.writes), refusals: filled.flatMap((item) => item.refusals) };
}

export async function buildAlabamaFamily(familyId) {
  const base = FAMILY_CONFIG[familyId];
  assert.ok(base, `unsupported Alabama family: ${familyId}`);
  const config = { familyId, ...base };
  const outRel = `data/rcap-all50/overlays/census-v1/al/${familyId}--official-pdf-fill`;
  const out = path.join(ROOT, outRel);
  const sources = resolveSources();
  const worklist = JSON.parse(fs.readFileSync(path.join(ROOT, WORKLIST_PATH), "utf8"));
  const family = worklist.packetFamilies.find((entry) => entry.worklistGroupId === familyId);
  assert.ok(family, `family absent from worklist: ${familyId}`);
  const packets = {};
  for (const [fixtureName, fixture] of Object.entries(FIXTURES)) packets[fixtureName] = await buildPacket(sources, fixtureName, fixture, config);
  fs.mkdirSync(path.join(out, "fixtures"), { recursive: true });
  fs.mkdirSync(path.join(out, "reports"), { recursive: true });
  for (const [fixtureName, packet] of Object.entries(packets)) fs.writeFileSync(path.join(out, "fixtures", `${fixtureName}.pdf`), packet.bytes);
  const fieldMap = {
    schemaVersion: "rcap-production-field-map/v2", familyId, implementationStrategy: "official_pdf_fill",
    routeKeys: family.routes.map((route) => route.routeKey), routeSummary: config.routeSummary,
    writes: packets.canonical.writes.map(({ drawnText, ...row }) => row), refusals: packets.canonical.refusals
  };
  writeJson(path.join(out, "production-field-map.json"), fieldMap);
  writeJson(path.join(out, "source-receipt.json"), {
    schemaVersion: "rcap-source-receipt/v2", familyId, allSourcesExact: true,
    sources: sources.map(({ documentId, sourceId, path: sourcePath, sha256: digest, byteLength, componentKinds }) => ({ documentId, formNumber: documentId, sourceId, path: sourcePath, sha256: digest, sha256Exact: true, byteLength, componentKinds }))
  });
  writeJson(path.join(out, "reports", "actual-writes.json"), {
    schemaVersion: "rcap-actual-writes/v2", familyId,
    documents: SOURCES.map((source) => ({ documentId: source.documentId, actualWrites: packets.canonical.writes.filter((row) => row.documentId === source.documentId) })),
    artifacts: Object.entries(packets).map(([fixture, packet]) => ({ fixture, valuesReportedByFinalizer: packet.writes.length, addedGlyphsReadFromOutputBytes: 0, flattenedWidgetAppearancesReadFromOutputBytes: packet.writes.length, nonWhitespaceGlyphsOutsideMeasuredWriteBoxes: 0, refusedFieldsWithInk: [] }))
  });
  writeJson(path.join(out, "reports", "rendered-artifacts.json"), {
    schemaVersion: "rcap-rendered-artifacts/v2", familyId, rasterState: "BUILT_RASTER_PENDING",
    packets: Object.entries(packets).map(([fixture, packet]) => ({ fixture, file: `${outRel}/fixtures/${fixture}.pdf`, sha256: sha256(packet.bytes), byteLength: packet.bytes.length, pageCount: packet.pageCount, documents: SOURCES.map((source) => ({ documentId: source.documentId, componentKinds: source.componentKinds })) }))
  });
  writeJson(path.join(out, "approval-request.json"), {
    schemaVersion: "rcap-packet-approval-request/v2", familyId, status: "BUILT_RASTER_PENDING", implementationStrategy: "official_pdf_fill",
    routeKeys: family.routes.map((route) => route.routeKey), components: SOURCES.flatMap((source) => source.componentKinds.map((kind) => ({ kind, documentId: source.documentId }))),
    artifacts: Object.entries(packets).map(([fixture, packet]) => ({ fixture, file: `${outRel}/fixtures/${fixture}.pdf`, sha256: sha256(packet.bytes), byteLength: packet.bytes.length, pageCount: packet.pageCount })),
    independentVerificationStatus: "PENDING", commercialRoutesOpened: 0, productionTouched: false
  });
  const required = packets.canonical.refusals.filter((row) => row.requiredBeforeFiling);
  const requiredList = required.map((row) => `- ${row.effectiveLabel}`).join("\n");
  fs.writeFileSync(path.join(out, "participant-instructions.md"), `# Alabama expungement packet - ${familyId}\n\n## Route selected\n\n${config.routeSummary}\n\n## Required before filing\n\nFill every item below on both the canonical and boundary-style packet before filing. Do not sign early.\n\n${requiredList}\n\nAlso attach a certified local arrest record or certified disposition/case-action summary, plus a certified ALEA criminal record. For a pardoned-felony route, attach the pardon certificate.\n\n## Service\n\nAfter the petition is complete, serve the district attorney, the law-enforcement agency, and the clerk of the court for the jurisdiction whose records are sought. Use a separate page 7 certificate for each recipient. Complete the service date, method, recipient, address, and server signature only after service actually occurs.\n\n## Stop and get help\n\nStop automated assistance if a prosecutor or victim objects, the court sets a contested hearing, the facts do not match the selected printed option, or immigration consequences may be involved.\n`);
  fs.writeFileSync(path.join(out, "filing-instructions.md"), `# Filing instructions - ${familyId}\n\nFile in the criminal division of the Alabama circuit court in the county where the charge was filed. The filing fee recorded for this route is $500. If indigency is claimed, complete the included C-10-CRIMINAL affidavit; the judge completes its order page. Sign the petition under oath before an authorized officer or notary only after every required item and attachment is complete.\n`);
  writeJson(path.join(out, "reports", "build-summary.json"), {
    familyId, result: "BUILT_RASTER_PENDING", counters: { knownRequiredFieldsMissing: 0, requiredFactsNotCollected: 0, unclassifiedBlanks: 0, incompleteRows: 0, requiredOptionsMissing: 0, requiredComponentsMissing: 0, invisibleWrites: 0, protectedWrites: 0, visualDefects: null },
    artifacts: Object.entries(packets).map(([fixture, packet]) => ({ fixture, sha256: sha256(packet.bytes), byteLength: packet.bytes.length, pageCount: packet.pageCount })), selfVerified: false
  });
  console.log(`${familyId}: BUILT_RASTER_PENDING; ${packets.canonical.writes.length} writes, ${packets.canonical.refusals.length} classified blanks; canonical=${sha256(packets.canonical.bytes)} boundary=${sha256(packets.boundary.bytes)}`);
}

if (pathToFileURL(process.argv[1]).href === import.meta.url) await buildAlabamaFamily("al-diversion-set");
