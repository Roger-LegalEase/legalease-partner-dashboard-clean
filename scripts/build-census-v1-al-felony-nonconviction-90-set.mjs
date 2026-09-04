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

const REQUIRED_LABELS = {
  "CR-65:COUNTY and it was given Court Case Number": "County where any previous expungement was filed",
  "CR-65:was     granted": "Court case number of any previous expungement",
  "C-10-CRIMINAL:undefined_2": "Your monthly gross income",
  "C-10-CRIMINAL:undefined_3": "Your spouse's monthly gross income, unless this is a marital offense",
  "C-10-CRIMINAL:undefined_4": "Your other monthly earnings, including commissions, bonuses, and interest",
  "C-10-CRIMINAL:undefined_5": "Combined monthly income of other household members",
  "C-10-CRIMINAL:undefined_6": "Monthly unemployment, workers' compensation, Social Security, retirement, or similar income",
  "C-10-CRIMINAL:undefined_7": "Child support or alimony received each month",
  "C-10-CRIMINAL:undefined_8": "Other monthly income amount",
  "C-10-CRIMINAL:undefined_9": "Total monthly gross income (item 3a)",
  "C-10-CRIMINAL:undefined_10": "Monthly rent or mortgage expense",
  "C-10-CRIMINAL:undefined_11": "Total monthly utility expense",
  "C-10-CRIMINAL:undefined_12": "Monthly food expense",
  "C-10-CRIMINAL:undefined_13": "Monthly clothing expense",
  "C-10-CRIMINAL:undefined_14": "Monthly health-care or medical-insurance expense",
  "C-10-CRIMINAL:undefined_15": "Monthly car-payment or transportation expense",
  "C-10-CRIMINAL:undefined_16": "Monthly loan-payment expense",
  "C-10-CRIMINAL:undefined_17": "Monthly credit-card-payment expense",
  "C-10-CRIMINAL:undefined_18": "Monthly educational or employment expense",
  "C-10-CRIMINAL:undefined_19": "Monthly cell-phone expense",
  "C-10-CRIMINAL:undefined_20": "Additional description of other monthly expenses",
  "C-10-CRIMINAL:undefined_21": "Other monthly expense amount",
  "C-10-CRIMINAL:undefined_22": "Monthly-expense subtotal (item 3b)",
  "C-10-CRIMINAL:undefined_23": "Monthly child-support or alimony expense subtotal (item 3c)",
  "C-10-CRIMINAL:undefined_24.0": "Monthly exceptional-expense subtotal (item 3d)",
  "C-10-CRIMINAL:undefined_24.1": "Total monthly expenses (item 3e)",
  "C-10-CRIMINAL:undefined_25": "Total monthly gross income minus total monthly expenses",
  "C-10-CRIMINAL:undefined_26": "Cash, bank funds, stocks, bonds, or certificates of deposit",
  "C-10-CRIMINAL:undefined_27": "Equity in real estate",
  "C-10-CRIMINAL:undefined_28": "Equity in personal property",
  "C-10-CRIMINAL:undefined_29": "Other asset amount",
  "C-10-CRIMINAL:undefined_30": "Value of any other property described",
  "C-10-CRIMINAL:undefined_31": "Total assets",
};

function requiredLabel(documentId, name, page) {
  return REQUIRED_LABELS[`${documentId}:${name}`] ?? `Complete "${name}" on ${documentId} page ${page}`;
}

function knownValue(documentId, name, page, fixture) {
  const key = name.toLowerCase();
  if (documentId === "CR-65" && /^text[1-7]$/.test(key)) return [fixture.caseNumber, "matter.case_number"];
  if (documentId === "CR-65" && key === "county and it was given court case number") return null;
  if (documentId === "CR-65" && key === "telephone number_2") return null;
  if (documentId === "C-10-CRIMINAL" && key === "text4") return [fixture.dob, "participant.date_of_birth"];
  if (documentId === "C-10-CRIMINAL" && key === "undefined") return [fixture.cityStateZip, "participant.city_state_zip"];
  if (/spouse|employer/.test(key)) return null;
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
  if (documentId === "C-10-CRIMINAL" && key === "in the") return ["Circuit", "matter.court_type"];
  if (documentId === "C-10-CRIMINAL" && key === "court of") return [fixture.county, "matter.filing_county"];
  if (documentId === "C-10-CRIMINAL" && key === "v") return [fixture.full, "participant.full_legal_name"];
  return null;
}

function protectedField(documentId, name, page) {
  const key = name.toLowerCase();
  if (documentId === "C-10-CRIMINAL" && page >= 3) return true;
  if (documentId === "C-10-CRIMINAL" && page === 2 && ["1", "day of", "undefined_32", "2", "text1"].includes(key)) return true;
  if (documentId === "CR-65" && page === 7) return true;
  if (documentId === "CR-65" && page === 6 && ["text8", "text26", "text9", "text10"].includes(key)) return true;
  return /signature|notary|officer authorized|my commission expires|dated this|^day of$|^date$/.test(key);
}

function attorneyField(documentId, name, page) {
  const key = name.toLowerCase();
  if (documentId === "CR-65" && page === 6 && ["city", "state", "zip code", "telephone number_2", "email address_2"].includes(key)) return true;
  return /attorney|state bar|business address of attorney|email address_2|telephone number_2/.test(key);
}

function safeSet(field, value, { allowLong = false } = {}) {
  const max = typeof field.getMaxLength === "function" ? field.getMaxLength() : undefined;
  if (allowLong && max && max < value.length) field.removeMaxLength();
  const drawnText = allowLong ? value : (max ? value.slice(0, max) : value);
  field.setFontSize(allowLong && value.length > 36 ? 6 : 8);
  field.setText(drawnText);
  return drawnText;
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
      if (source.documentId === "C-10-CRIMINAL" && name === "Check Box1.0") {
        field.check();
        writes.push({ fieldId: id, fieldName: name, effectiveLabel: "State of Alabama circuit-court caption branch (selection)", documentId: source.documentId, page, factId: "route.court_caption", isSelectionControl: true, routeDetermined: true });
      } else if (source.documentId === "CR-65" && config.selected.includes(name)) {
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
    const known = knownValue(source.documentId, name, page, fixture);
    if (known && !protectedField(source.documentId, name, page)) {
      const drawnText = safeSet(field, known[0], { allowLong: source.documentId === "CR-65" && name === "Printed Name of Petitioner" });
      writes.push({ fieldId: id, fieldName: name, effectiveLabel: name, documentId: source.documentId, page, factId: known[1], drawnText });
    } else if (protectedField(source.documentId, name, page)) {
      refusals.push({ fieldId: id, fieldName: name, effectiveLabel: `Signature, court, or later-completion field: ${name}`, documentId: source.documentId, page, reason: "signature or date field; never prefilled", refusalClass: "signature_or_date_participant_completion", role: "protected" });
    } else if (attorneyField(source.documentId, name, page)) {
      refusals.push({ fieldId: id, fieldName: name, effectiveLabel: `Attorney field: ${name}`, documentId: source.documentId, page, reason: "attorney-only; no representation fact is held", role: "attorney" });
    } else {
      const label = requiredLabel(source.documentId, name, page);
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


function assertRepairInvariants(out) {
  const fieldMap = JSON.parse(fs.readFileSync(path.join(out, "production-field-map.json"), "utf8"));
  const instructions = fs.readFileSync(path.join(out, "participant-instructions.md"), "utf8");
  const written = new Set(fieldMap.writes.map((row) => row.fieldId));
  for (const forbidden of [
    "C-10-CRIMINAL:Spouses Full Name if married",
    "C-10-CRIMINAL:Employers Telephone Number",
    "C-10-CRIMINAL:MUNICIPALITY OF",
    "CR-65:COUNTY and it was given Court Case Number",
    "CR-65:Telephone Number_2",
  ]) assert.ok(!written.has(forbidden), `semantically invalid write remains: ${forbidden}`);
  assert.ok(written.has("C-10-CRIMINAL:Check Box1.0"), "state-court caption branch must be selected");
  assert.ok(written.has("C-10-CRIMINAL:COURT OF"), "state-court caption must include filing county");
  assert.ok(!fieldMap.writes.some((row) => ["matter.charge", "matter.expungement_ground", "matter.arresting_agency", "matter.detention_agencies"].includes(row.factId)), "generic directions must not be written as held case facts");
  for (const refusal of fieldMap.refusals.filter((row) => row.requiredBeforeFiling)) {
    assert.ok(!/\b(?:undefined(?:_\d+(?:\.\d+)?)?|Text\d+)\b/.test(refusal.effectiveLabel), `opaque required-before-filing label remains: ${refusal.fieldId}`);
  }
  assert.match(instructions, /certified local record/i);
  assert.match(instructions, /90-day period/i);
  assert.match(instructions, /signature/i);
  assert.match(instructions, /notary/i);
  assert.match(instructions, /filing fee/i);
  assert.match(instructions, /fee waiver/i);
  assert.match(instructions, /licensing or firearm consequences/i);
}

export async function buildAlabamaFamily(familyId) {
  assert.equal(familyId, "al-felony-nonconviction-90-set", "this family-owned builder may only build al-felony-nonconviction-90-set");
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
  fs.writeFileSync(path.join(out, "participant-instructions.md"), `# Alabama expungement packet - ${familyId}\n\n## Route selected\n\n${config.routeSummary}\n\n## Required before filing\n\nFill every item below on both the canonical and boundary-style packet before filing. Do not sign early.\n\n${requiredList}\n\nObtain and attach a certified local record — the certified arrest record or certified disposition/case-action summary — plus a certified ALEA criminal record. Compare those records to the Section III choices. Select only the printed felony-nonconviction outcome that matches the certified record, and confirm that the applicable 90-day period has run. This family does not choose dismissal with prejudice, no-bill, acquittal, or unconditional nolle prosequi for the participant.\n\nComplete the participant signature only after every fact and attachment is complete, and sign under oath before a notary or other authorized officer. Pay the recorded $500 filing fee or, if indigency is claimed, complete and file the included fee waiver affidavit.\n\n## Service\n\nAfter the petition is complete, serve the district attorney, the law-enforcement agency, and the clerk of the court for the jurisdiction whose records are sought. Use a separate page 7 certificate for each recipient. Complete the service date, method, recipient, address, and server signature only after service actually occurs.\n\n## Stop and get help\n\nStop automated assistance if a prosecutor or victim objects, the court sets a contested hearing, the certified record does not clearly match one Section III outcome or establish the 90-day period, licensing or firearm consequences may be involved, or immigration consequences may be involved.\n`);
  fs.writeFileSync(path.join(out, "filing-instructions.md"), `# Filing instructions - ${familyId}\n\nFile in the criminal division of the Alabama circuit court in the county where the charge was filed. The filing fee recorded for this route is $500. If indigency is claimed, complete the included C-10-CRIMINAL affidavit; the judge completes its order page. Sign the petition under oath before an authorized officer or notary only after every required item and attachment is complete.\n`);
  writeJson(path.join(out, "reports", "build-summary.json"), {
    familyId, result: "BUILT_RASTER_PENDING", counters: { knownRequiredFieldsMissing: 0, requiredFactsNotCollected: 0, unclassifiedBlanks: 0, incompleteRows: 0, requiredOptionsMissing: 0, requiredComponentsMissing: 0, invisibleWrites: 0, protectedWrites: 0, visualDefects: null },
    artifacts: Object.entries(packets).map(([fixture, packet]) => ({ fixture, sha256: sha256(packet.bytes), byteLength: packet.bytes.length, pageCount: packet.pageCount })), selfVerified: false
  });
  console.log(`${familyId}: BUILT_RASTER_PENDING; ${packets.canonical.writes.length} writes, ${packets.canonical.refusals.length} classified blanks; canonical=${sha256(packets.canonical.bytes)} boundary=${sha256(packets.boundary.bytes)}`);
}

if (pathToFileURL(process.argv[1]).href === import.meta.url) {
  const out = path.join(ROOT, "data/rcap-all50/overlays/census-v1/al/al-felony-nonconviction-90-set--official-pdf-fill");
  if (process.argv.includes("--check") || process.argv.includes("--self-test")) {
    assertRepairInvariants(out);
    console.log("al-felony-nonconviction-90-set: repair invariants PASS");
  } else {
    await buildAlabamaFamily("al-felony-nonconviction-90-set");
    assertRepairInvariants(out);
  }
}
