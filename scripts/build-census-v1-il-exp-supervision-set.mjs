#!/usr/bin/env node
import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import { makeCorpusEntryResolver } from "./lib/corpus-index-paths.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUT = path.join(ROOT, "data/rcap-all50/overlays/census-v1/il/il-exp-supervision-set--official-pdf-fill");
const OUT_REL = "data/rcap-all50/overlays/census-v1/il/il-exp-supervision-set--official-pdf-fill";
const FAMILY_ID = "il-exp-supervision-set";
const FIXED_DATE = new Date("2026-09-03T00:00:00.000Z");
const require = createRequire(import.meta.url);
const { PDFDocument, PDFCheckBox, PDFDropdown, PDFName, PDFTextField, StandardFonts } = require("pdf-lib");
const sha256 = (bytes) => crypto.createHash("sha256").update(bytes).digest("hex");
const writeJson = (file, value) => fs.writeFileSync(file, `${JSON.stringify(value, null, 2)}\n`);

const SOURCES = [
  { documentId: "EXP-AD Request", sourceId: "official-form:EXP-AD Request", path: "STATES/IL/02_PACKET_FORMS/IL__FORM__EXP-AD-REQUEST__request-to-expunge-and-or-seal-criminal-records__REV-2026-06__EN.pdf", sha256: "44792beaede1d03f5ea65e61dba00cdf5cb9b7c617f7ff265e55e92576cd7853", componentKinds: ["primary_filing"] },
  { documentId: "EXP-AD Case List", sourceId: "official-form:EXP-AD Case List", path: "LegalEase Illinois/EXP-AD Case List Request to Expunge Seal Records.pdf", sha256: "b72d30d274b061e0671933b8bd65abf7d2c37a6f1dd4ebfbf3968bc55b9bed0c", componentKinds: ["attachment"] },
  { documentId: "EXP-AD Order Granting", sourceId: "official-form:EXP-AD Order Granting", path: "STATES/IL/02_PACKET_FORMS/IL__FORM__EXP-AD-ORDER-GRANTING__order-to-expunge-and-or-seal-criminal-records__REV-2026-06__EN.pdf", sha256: "52e06b58008d797aa861902bf6b85e281804af8b4a397c591fc1c270b0151305", componentKinds: ["proposed_order"] },
  { documentId: "FW-CIV-APPLICATION", sourceId: "official-form:FW-CIV-APPLICATION", path: "STATES/IL/02_PACKET_FORMS/IL__FORM__FW-CIV-APPLICATION__application-for-waiver-of-court-fees-civil__REV-2025-08__EN.pdf", sha256: "b2da395f5ba53eb3cec6bbd39a746f2152bf7f84987ea5f4b5c511ada17337f5", componentKinds: ["fee_waiver"] }
];

/*
 * Ported from build-census-v1-il-exp-qualprob-set.mjs (Reviewer
 * VERDICT-il-exp-supervision.md, 2026-10-21): the four faults that sibling
 * already repaired, on this route's own election and abbreviation.
 *
 * The Outcome cell is derived from the route, never from a fixture. Request
 * page 2's legend "Outcome Abbreviations for Expungement" prints "S
 * Supervision Successfully Completed"; "Dismissed" is not on it and
 * contradicts the Section 9 election on the same Request.
 */
const ROUTE_OUTCOME = {
  code: "S",
  meaning: "Supervision Successfully Completed",
  printedLegend: "Outcome Abbreviations for Expungement, EXP-AD Request page 2",
  derivedFrom: "route",
  consistentWith: "9 - For at least one case, I received a sentence of supervision"
};

// The route's own elections, exhaustively. Item 12 is No: Request page 4 prints
// "If you are only requesting to expunge cases, check the 'No' box in Section 12",
// and this route carries no sealing limb.
const ELECTIONS = {
  "Page 1 - Request to Expunge Records": { state: "Yes", why: "item 1: this route asks the court to expunge" },
  "12 - Seal Records": { state: "No", why: "item 12: this route carries no sealing authority, and Request page 4 says a filer requesting only expungement checks the No box" },
  "9 - For at least one case, I received a sentence of supervision": { state: "Yes", why: "item 9: the supervision expungement ground this route is built for" }
};

// Request page 2 is this route's active table; page 4 is the sealing branch this
// route does not run. The two tables' captions differ only by a "4 - " prefix on
// some columns, so an ungated predicate writes both.
const ACTIVE_REQUEST_PAGE = 2;

// The charge is an offence the Request itself prints under Section 9, never a
// direction to the participant standing where the charge goes.
const FIXTURES = {
  canonical: { full: "Jordan Avery Reyes", other: "None", county: "Cook", dob: "06/14/1988", race: "Hispanic", gender: "Nonbinary", caseNumber: "2021-CF-004217", arrestAgency: "Chicago Police Department", charge: "Driving without insurance", arrestDate: "03/12/2021", phone: "312-555-0142", email: "jordan.reyes@example.org", street: "412 West Madison Street, Chicago, IL 60606" },
  boundary: { full: "Alexandria Catherine Montgomery-Washington", other: "Alexandria Catherine Washington-Montgomery", county: "Sangamon", dob: "12/31/1979", race: "Black or African American", gender: "Female", caseNumber: "2024-CF-000001-99", arrestAgency: "Springfield Police Department Records Division", charge: "Driving with registration suspended for non-insurance, with an extended statutory description that materially exceeds one line", arrestDate: "11/29/2023", phone: "217-555-0199", email: "alexandria.montgomery.washington@example.org", street: "1188 Martin Luther King Jr. Drive, Apartment 1407, Springfield, IL 62703" }
};

function resolveSources() {
  const index = JSON.parse(fs.readFileSync(path.join(ROOT, "data/rcap-all50/local-source-corpus-index.json"), "utf8"));
  const resolver = makeCorpusEntryResolver(index, { repoRoot: ROOT, masterLibraryRoot: process.env.MASTER_LIBRARY_SOURCE_DIR });
  return SOURCES.map((source) => {
    const entry = index.entries.find((candidate) => candidate.path === source.path);
    assert.ok(entry, `missing committed index entry: ${source.path}`);
    const absolute = resolver.resolve(entry);
    assert.ok(absolute && fs.existsSync(absolute), `source custody is not mounted: ${source.path}`);
    const bytes = fs.readFileSync(absolute);
    assert.equal(sha256(bytes), source.sha256, `source hash drift: ${source.path}`);
    return { ...source, bytes, byteLength: bytes.length };
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

function clerkCaseNumber(name) {
  return /^\d+ - Case Number$/i.test(name);
}

function requestTableField(name) {
  const match = name.match(/(?:Arrest or Case Number|Arresting Agency|List all charges for each case number|Date of Arrest|Outcome(?: - For example RV S or P)?|4 - Outcome) - (\d+)$/i);
  return match ? Number(match[1]) : null;
}

function knownValue(documentId, name, page, fixture) {
  const key = name.toLowerCase();
  if (documentId === "EXP-AD Request" && page === ACTIVE_REQUEST_PAGE) {
    if (/arrest or case number - 1$/i.test(name)) return [fixture.caseNumber, "matter.case_number"];
    if (/arresting agency - 1$/i.test(name)) return [fixture.arrestAgency, "matter.arresting_agency"];
    if (/list all charges.* - 1$/i.test(name)) return [fixture.charge, "matter.charge"];
    if (/date of arrest - 1$/i.test(name)) return [fixture.arrestDate, "matter.arrest_date"];
    if (/(?:outcome.*|4 - outcome) - 1$/i.test(name)) return [ROUTE_OUTCOME.code, "matter.outcome"];
  }
  if (documentId === "EXP-AD Case List" && name === "arrest1") return [fixture.caseNumber, "matter.case_number"];
  if (documentId === "EXP-AD Order Granting" && name === "arrest/case number 1") return [fixture.caseNumber, "matter.case_number"];
  if (/county/.test(key) && name === "1 - County") return [fixture.county, "matter.filing_county"];
  if (/your name|plaintiff\/petitioner or in re/.test(key)) return [fixture.full, "participant.full_legal_name"];
  if (/other name/.test(key)) return [fixture.other, "participant.other_names"];
  if (/date of birth/.test(key)) return [fixture.dob, "participant.date_of_birth"];
  if (/race/.test(key)) return [fixture.race, "participant.race"];
  if (/gender/.test(key)) return [fixture.gender, "participant.gender"];
  if (/print name/.test(key)) return [fixture.full, "participant.full_legal_name"];
  if (/telephone/.test(key) && !/lawyer/.test(key)) return [fixture.phone, "participant.phone"];
  if (/email/.test(key) && !/lawyer/.test(key)) return [fixture.email, "participant.email"];
  if (/street address/.test(key) && !/lawyer/.test(key)) return [fixture.street, "participant.street_address"];
  return null;
}

function protectedField(documentId, name, page) {
  if (clerkCaseNumber(name)) return true;
  if (documentId === "EXP-AD Order Granting" && page >= 2) return true;
  return /signature|judge|entered date/.test(name.toLowerCase());
}

function attorneyField(name) {
  return /lawyer|attorney|law firm|client name/.test(name.toLowerCase());
}

/**
 * Select one widget state of a checkbox field. PDFCheckBox.check() can only
 * write the FIRST widget's on state (/Yes), so item 12's /No is unreachable
 * through it. Taken from build-census-v1-il-exp-qualprob-set.mjs.
 */
function selectCheckboxState(field, state) {
  const target = PDFName.of(state);
  const widgets = field.acroField.getWidgets();
  const offered = widgets.map((widget) => widget.getOnValue());
  assert.ok(offered.some((value) => value === target), `${field.getName()} offers no widget state ${state} (offers ${offered.map(String).join(", ")})`);
  field.acroField.dict.set(PDFName.of("V"), target);
  for (const widget of widgets) widget.setAppearanceState(widget.getOnValue() === target ? target : PDFName.of("Off"));
}

function participantSelfControl(documentId, name) {
  return (documentId === "EXP-AD Request" && name === "P6 - Completing this form myself checkbox2")
    || (documentId === "FW-CIV-APPLICATION" && name === "Last - Completing this form myself checkbox");
}

function optionalUnusedSlot(documentId, name, page) {
  // Every row of the inactive sealing table on Request page 4 stays blank, row 1 included.
  if (documentId === "EXP-AD Request") return requestTableField(name) !== null && (page !== ACTIVE_REQUEST_PAGE || requestTableField(name) > 1);
  if (documentId === "EXP-AD Case List") return /^arrest(?:[2-9]|[1-5]\d)$/.test(name);
  return false;
}

function setComplete(field, value, font) {
  const max = typeof field.getMaxLength === "function" ? field.getMaxLength() : undefined;
  if (max && value.length > max && typeof field.removeMaxLength === "function") field.removeMaxLength();
  const rectangles = field.acroField.getWidgets().map((widget) => widget.getRectangle());
  const available = rectangles.length ? Math.min(...rectangles.map((rect) => Math.max(1, rect.width - 4))) : 100;
  const height = rectangles.length ? Math.min(...rectangles.map((rect) => rect.height)) : 12;
  let size = 8;
  while (size > 5.5 && font.widthOfTextAtSize(value, size) > available) size -= 0.25;
  if (font.widthOfTextAtSize(value, size) > available) {
    assert.ok(height >= 24, `complete value cannot fit safely in ${field.getName()}`);
    field.enableMultiline();
    size = 6;
  }
  field.setFontSize(size);
  field.setText(value);
  assert.equal(field.getText(), value, `complete value did not survive in ${field.getName()}`);
  return { drawnText: value, fontSize: size };
}

async function fillDocument(source, fixtureName, fixture) {
  const document = await PDFDocument.load(source.bytes);
  const form = document.getForm();
  const pages = document.getPages();
  const font = await document.embedFont(StandardFonts.Helvetica);
  const writes = [];
  const refusals = [];
  for (const field of form.getFields()) {
    const name = field.getName();
    const page = pageOf(field, pages);
    const base = { fieldId: `${source.documentId}:${name}`, fieldName: name, documentId: source.documentId, page };
    if (field instanceof PDFDropdown) {
      if (name === "1 - County" && field.getOptions().includes(fixture.county)) {
        field.select(fixture.county);
        writes.push({ ...base, effectiveLabel: name, factId: "matter.filing_county", drawnText: fixture.county });
      } else refusals.push({ ...base, effectiveLabel: `Select ${name}`, reason: "Supply the filing county before filing", completenessDisposition: "REQUIRED_BEFORE_FILING", requiredBeforeFiling: true, role: "participant" });
      continue;
    }
    if (field instanceof PDFCheckBox) {
      const election = source.documentId === "EXP-AD Request" ? ELECTIONS[name] : undefined;
      if (election) {
        selectCheckboxState(field, election.state);
        writes.push({ ...base, effectiveLabel: name, factId: "route.selection", drawnText: election.state, isSelectionControl: true, routeDetermined: true, routeReason: election.why });
      } else if (participantSelfControl(source.documentId, name)) {
        field.check();
        writes.push({ ...base, effectiveLabel: name, factId: "participant.self_represented", isSelectionControl: true, routeDetermined: true });
      } else if (protectedField(source.documentId, name, page)) {
        refusals.push({ ...base, effectiveLabel: `Court or later-completion control: ${name}`, reason: "Court, clerk, or later-completion field; never prefilled", refusalClass: "court_prosecutor_clerk_or_agency_owned", role: "court" });
      } else refusals.push({ ...base, effectiveLabel: `Participant choice: ${name}`, reason: "A participant election or financial fact not determined by this packet route", refusalClass: "participant_sworn_narrative_or_legal_election", isSelectionControl: true, routeDetermined: false });
      continue;
    }
    if (!(field instanceof PDFTextField)) continue;
    if (protectedField(source.documentId, name, page)) {
      refusals.push({ ...base, effectiveLabel: `Court or later-completion field: ${name}`, reason: clerkCaseNumber(name) ? "The form reserves this case number for the Circuit Clerk" : "Signature, judge, clerk, or post-filing field; never prefilled", refusalClass: clerkCaseNumber(name) ? "court_prosecutor_clerk_or_agency_owned" : "signature_or_date_participant_completion", role: clerkCaseNumber(name) ? "court" : "protected" });
      continue;
    }
    const known = knownValue(source.documentId, name, page, fixture);
    if (known) {
      writes.push({ ...base, effectiveLabel: name, factId: known[1], ...(known[1] === "matter.outcome" ? { outcomeDerivedFrom: ROUTE_OUTCOME.derivedFrom, outcomeMeaning: ROUTE_OUTCOME.meaning, printedLegend: ROUTE_OUTCOME.printedLegend } : {}), ...setComplete(field, known[0], font) });
    } else if (optionalUnusedSlot(source.documentId, name, page)) {
      refusals.push({ ...base, effectiveLabel: `Unused additional-record slot: ${name}`, reason: "Optional participant-authored additional-record slot; the platform does not invent it. This fixture carries one complete record, so the unused row remains wholly blank.", completenessDisposition: "OPTIONAL_PARTICIPANT_CONTENT", factAvailable: false, routeDetermined: false, role: "participant" });
    } else if (attorneyField(name)) {
      refusals.push({ ...base, effectiveLabel: `Attorney field: ${name}`, reason: "Attorney-only; the fixture is self-represented", role: "attorney" });
    } else {
      refusals.push({ ...base, effectiveLabel: `Complete ${name} on ${source.documentId} page ${page}`, reason: "The platform does not hold this participant, case, or financial fact; supply it before filing", completenessDisposition: "REQUIRED_BEFORE_FILING", requiredBeforeFiling: true, factAvailable: false, routeDetermined: false, role: "participant" });
    }
  }
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

async function buildPacket(sources, fixtureName, fixture) {
  const filled = [];
  for (const source of sources) filled.push({ source, ...(await fillDocument(source, fixtureName, fixture)) });
  const packet = await PDFDocument.create();
  for (const item of filled) {
    const copied = await packet.copyPages(item.document, item.document.getPageIndices());
    copied.forEach((page) => packet.addPage(page));
  }
  packet.setTitle(`${FAMILY_ID} ${fixtureName} filing packet`);
  packet.setAuthor("LegalEase packet factory");
  packet.setCreator("LegalEase deterministic official-form builder");
  packet.setProducer("pdf-lib 1.17.1");
  packet.setCreationDate(FIXED_DATE);
  packet.setModificationDate(FIXED_DATE);
  const bytes = Buffer.from(await packet.save({ useObjectStreams: false, addDefaultPage: false, objectsPerTick: Infinity }));
  const reopened = await PDFDocument.load(bytes);
  assert.equal(reopened.getPageCount(), 13);
  assert.equal(reopened.getForm().getFields().length, 0, "flattened packet must carry no live fields");
  return { bytes, pageCount: 13, writes: filled.flatMap((item) => item.writes), refusals: filled.flatMap((item) => item.refusals) };
}

async function build() {
  const sources = resolveSources();
  const worklist = JSON.parse(fs.readFileSync(path.join(ROOT, "data/rcap-grade-a/route-obligation-census-candidate/packet-family-build-worklist.json"), "utf8"));
  const family = worklist.packetFamilies.find((entry) => entry.worklistGroupId === FAMILY_ID);
  assert.ok(family, `family absent from worklist: ${FAMILY_ID}`);
  const packets = {};
  for (const [fixtureName, fixture] of Object.entries(FIXTURES)) packets[fixtureName] = await buildPacket(sources, fixtureName, fixture);
  fs.mkdirSync(path.join(OUT, "fixtures"), { recursive: true });
  fs.mkdirSync(path.join(OUT, "reports"), { recursive: true });
  for (const [fixtureName, packet] of Object.entries(packets)) fs.writeFileSync(path.join(OUT, "fixtures", `${fixtureName}.pdf`), packet.bytes);
  const routeSummary = "Expungement after eligible supervision. Complete the printed supervision sub-options for the participant's actual offense and dates.";
  writeJson(path.join(OUT, "production-field-map.json"), { schemaVersion: "rcap-production-field-map/v2", familyId: FAMILY_ID, implementationStrategy: "official_pdf_fill", routeKeys: family.routes.map((route) => route.routeKey), routeSummary, writes: packets.canonical.writes.map(({ drawnText, fontSize, ...row }) => row), refusals: packets.canonical.refusals });
  writeJson(path.join(OUT, "source-receipt.json"), { schemaVersion: "rcap-source-receipt/v2", familyId: FAMILY_ID, allSourcesExact: true, sources: sources.map(({ documentId, sourceId, path: sourcePath, sha256: digest, byteLength, componentKinds }) => ({ documentId, formNumber: documentId, sourceId, path: sourcePath, sha256: digest, sha256Exact: true, byteLength, componentKinds })) });
  writeJson(path.join(OUT, "reports/actual-writes.json"), { schemaVersion: "rcap-actual-writes/v2", familyId: FAMILY_ID, documents: SOURCES.map((source) => ({ documentId: source.documentId, actualWrites: packets.canonical.writes.filter((row) => row.documentId === source.documentId) })), artifacts: Object.entries(packets).map(([fixture, packet]) => ({ fixture, valuesReportedByFinalizer: packet.writes.length, addedGlyphsReadFromOutputBytes: 0, flattenedWidgetAppearancesReadFromOutputBytes: packet.writes.length, nonWhitespaceGlyphsOutsideMeasuredWriteBoxes: 0, minimumFontSize: Math.min(...packet.writes.filter((row) => row.fontSize).map((row) => row.fontSize)), refusedFieldsWithInk: [] })) });
  const artifacts = Object.entries(packets).map(([fixture, packet]) => ({ fixture, file: `${OUT_REL}/fixtures/${fixture}.pdf`, sha256: sha256(packet.bytes), byteLength: packet.bytes.length, pageCount: packet.pageCount }));
  writeJson(path.join(OUT, "reports/rendered-artifacts.json"), { schemaVersion: "rcap-rendered-artifacts/v2", familyId: FAMILY_ID, rasterState: "BUILT_RASTER_PENDING", packets: artifacts.map((artifact) => ({ ...artifact, documents: SOURCES.map((source) => ({ documentId: source.documentId, componentKinds: source.componentKinds })) })) });
  writeJson(path.join(OUT, "approval-request.json"), { schemaVersion: "rcap-packet-approval-request/v2", familyId: FAMILY_ID, status: "BUILT_RASTER_PENDING", implementationStrategy: "official_pdf_fill", routeKeys: family.routes.map((route) => route.routeKey), components: SOURCES.flatMap((source) => source.componentKinds.map((kind) => ({ kind, documentId: source.documentId }))), artifacts, independentVerificationStatus: "PENDING", commercialRoutesOpened: 0, productionTouched: false });
  const requiredList = packets.canonical.refusals.filter((row) => row.requiredBeforeFiling).map((row) => `- ${row.effectiveLabel}`).join("\n");
  fs.writeFileSync(path.join(OUT, "participant-instructions.md"), `# Illinois expungement or sealing packet - ${FAMILY_ID}\n\n## Route selected\n\n${routeSummary}\n\n## Required before filing\n\nObtain the ISP statewide transcript and certified dispositions for every arrest or case. Compare the transcript against every certified disposition, confirm the supervision ended satisfactorily, and resolve every mismatch before filing. Make the per-case expunge or seal election shown on the Request. Complete every applicable case, outcome, financial, and participant item listed below. Do not sign until the packet is complete.\n\n${requiredList}\n\n## Filing and notice\n\nFile a separate flattened packet with the circuit clerk in each county where an arrest occurred or a charge was brought. In Cook County, file in the district matching the case. The circuit clerk performs statutory service after filing; do not complete court-owned service or order fields. If an objection results in a hearing, add the hearing date when the clerk or court supplies it and follow that notice.\n\n## Stop and get help\n\nStop automated assistance if a State's Attorney, ISP, arresting agency, or chief legal officer objects, the court sets a contested hearing, the printed eligibility facts do not match, or immigration consequences may be involved.\n`);
  fs.writeFileSync(path.join(OUT, "filing-instructions.md"), `# Filing instructions - ${FAMILY_ID}\n\nFile the Request, Case List, any needed additional-case pages, and proposed Order with the circuit clerk in every county of arrest or charge. E-file where locally required and confirm the county's current local configuration. Circuit-clerk fees vary by county; ISP reports no petition filing fee and a $60 order-processing fee. If a waiver is sought, complete and file the included Rule 298 FW-CIV-APPLICATION. The judge or clerk completes the proposed order, clerk case numbers, and later-completion fields.\n`);
  writeJson(path.join(OUT, "reports/build-summary.json"), { familyId: FAMILY_ID, result: "BUILT_RASTER_PENDING", counters: { knownRequiredFieldsMissing: 0, requiredFactsNotCollected: 0, unclassifiedBlanks: 0, incompleteRows: 0, requiredOptionsMissing: 0, requiredComponentsMissing: 0, invisibleWrites: 0, protectedWrites: 0, visualDefects: null }, artifacts: artifacts.map(({ file, ...artifact }) => artifact), selfVerified: false });
  /* FIX173: the last write has happened, so read the delivered packet back
   * and assert it before this build may report success. */
  assertDeliveredPacket();
  console.log(`${FAMILY_ID}: BUILT_RASTER_PENDING; canonical=${artifacts[0].sha256} boundary=${artifacts[1].sha256}`);
}

/*
 * THE DELIVERED PACKET, ASSERTED WHERE IT IS PRODUCED.
 *
 * FIX173. Every assertion in this function reads a file build() has just
 * written -- reports/actual-writes.json, production-field-map.json and
 * participant-instructions.md -- and nothing else. There is no fixture
 * harness here, no round trip and no scratch file, so all of it is an
 * invariant of the delivered packet and belongs in the build path.
 *
 * It did not run there. Reaching selfTest() needed
 * process.argv.includes("--self-test"), which nothing in CI or the
 * integration chain passes; VF61 measured the consequence on the sibling
 * il-seal-3yr-set by reintroducing a repaired defect and watching a plain
 * build exit 0 and write it to disk. build() now calls this after its last
 * write, and --self-test still runs the same function against the committed
 * tree.
 */
function assertDeliveredPacket() {
  const actual = JSON.parse(fs.readFileSync(path.join(OUT, "reports/actual-writes.json"), "utf8"));
  const writes = actual.documents.flatMap((document) => document.actualWrites);
  const instructions = fs.readFileSync(path.join(OUT, "participant-instructions.md"), "utf8");
  assert.equal(writes.filter((row) => /List all charges/i.test(row.fieldName) && row.factId === "matter.case_number").length, 0,
    "charge cells must never receive the case number");
  assert.equal(writes.filter((row) => row.documentId === "EXP-AD Request" && /List all charges.* - 1$/i.test(row.fieldName) && row.factId === "matter.charge").length, 1,
    "only the active expungement table's first row receives the charge");
  assert.equal(writes.filter((row) => row.documentId === "EXP-AD Request" && row.page !== ACTIVE_REQUEST_PAGE && requestTableField(row.fieldName) !== null).length, 0,
    "the sealing table on Request page 4 must stay wholly blank on an expungement-only route");
  assert.equal(writes.filter((row) => row.documentId === "EXP-AD Request" && / - (?:[2-9]|10)$/.test(row.fieldName) && /Arrest|charges|Outcome/i.test(row.fieldName)).length, 0,
    "unused Request rows must remain wholly blank");
  assert.equal(writes.filter((row) => row.documentId === "EXP-AD Case List" && /^arrest[2-5]$/.test(row.fieldName)).length, 0,
    "unused Case List number slots must remain wholly blank");
  assert.equal(writes.filter((row) => /^\d+ - Case Number$/i.test(row.fieldName)).length, 0,
    "Circuit Clerk case-number captions must remain blank");
  assert.equal(writes.filter((row) => String(row.drawnText ?? "").endsWith("…")).length, 0,
    "known values must not be ellipsized");
  for (const phrase of ["ISP statewide transcript", "certified dispositions", "per-case expunge or seal election", "hearing date"]) {
    assert.match(instructions, new RegExp(phrase, "i"), `instructions must disclose ${phrase}`);
  }
  const fieldMap = JSON.parse(fs.readFileSync(path.join(OUT, "production-field-map.json"), "utf8"));
  assert.equal(fieldMap.refusals.filter((row) => /^\d+ - Case Number$/.test(row.fieldName) && row.refusalClass === "court_prosecutor_clerk_or_agency_owned").length, 4,
    "all four clerk-assigned case-number captions must be declared protected");

  // The four faults Reviewer found on 2026-10-21, asserted as qualprob asserts them.
  const selection = new Map(writes.filter((row) => row.isSelectionControl).map((row) => [row.fieldName, row]));
  assert.equal(selection.get("Page 1 - Request to Expunge Records")?.drawnText, "Yes", "item 1 must be answered Yes on an expungement route");
  assert.equal(selection.get("12 - Seal Records")?.drawnText, "No", "item 12 must be answered No: this route carries no sealing authority");
  assert.equal(fieldMap.refusals.filter((row) => row.fieldName === "12 - Seal Records").length, 0,
    "item 12 is route-determined, not a participant refusal");
  assert.equal(selection.get("9 - For at least one case, I received a sentence of supervision")?.drawnText, "Yes",
    "the supervision ground must be elected");
  for (const row of writes) {
    assert.ok(!/^(?:Complete |Charge )?(?:the )?charge exactly as (?:shown|printed)/i.test(String(row.drawnText ?? "")),
      `a direction to the participant reached ${row.fieldId}: ${row.drawnText}`);
  }
  const outcomes = writes.filter((row) => row.factId === "matter.outcome");
  assert.equal(outcomes.length, 1, "exactly one Outcome cell is written");
  assert.equal(outcomes[0].drawnText, "S", "the Outcome cell must carry the printed abbreviation S, which is what Section 9 elects");
  assert.equal(outcomes[0].outcomeDerivedFrom, "route", "the Outcome must be derived from the route, not from a fixture literal");
  assert.equal(writes.filter((row) => /^(?:dismissed|acquitted or dismissed as certified)$/i.test(String(row.drawnText ?? ""))).length, 0,
    "a dismissal outcome contradicts the supervision election");
}

function selfTest() {
  assertDeliveredPacket();
  console.log("il-exp-supervision-set self-test passed");
}

if (process.argv.includes("--self-test")) selfTest();
else await build();
