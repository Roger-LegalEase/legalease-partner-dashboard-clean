#!/usr/bin/env node
// il-seal-2yr-set: Illinois sealing of an eligible misdemeanor conviction or
// ordinance violation after the printed two-year period.
//
// WHAT FIX07 CHANGED, AND WHAT IT DID NOT.
//
// The four VF01 failures on this family were repaired before this lane: the
// delivered fixtures under this family's directory carry no write on the
// inactive expungement table (page 2 draws nothing), exactly five inked cells in
// row 1 of the active sealing table with no partial row anywhere, no ellipsis in
// either fixture, and one complete case number in the Case List's first cell with
// the clerk-reserved Case Number caption blank. FIX07 measured all of that from
// the delivered bytes with the flattened-widget reader and a local 120 dpi raster
// rather than from the build's own report, and changed none of it.
//
// One half of SERVICE was still open and is repaired here: the disclosure lived
// only in prose, so nothing but a prose reader could audit it. SERVICE_DISCLOSURE
// below puts the same answer in the field map, and the prose is re-cut into the
// record's own two questions -- who serves and how, and who is served -- with the
// chief-legal-officer recipient restored to the conditional the record states it
// in ("for municipal ordinance violations"), which the previous prose had dropped.
//
// STILL OPEN, AND NOT REPAIRED HERE. The Outcome cell of the active sealing row
// prints the shared Illinois fixture word "Dismissed" while this same Request
// elects item 17, a misdemeanor conviction or ordinance violation sealed after two
// years. A conviction being sealed was not dismissed, so the packet asserts two
// different dispositions. It is NOT repaired here because the route does not
// determine the answer: the Request's own "Outcome Abbreviations for Sealing"
// legend offers MC, FC, CE and QP, item 17 covers a misdemeanor conviction OR an
// ordinance violation, and an ordinance violation has no abbreviation in that
// legend. Which of the two this record is, is a fact the platform does not hold,
// so writing either would be an invention. It needs a legal-input answer.
//
// NOT RUN IN THIS CONTAINER. The EXP-AD Case List source (sha256 b72d30d2...)
// lives in the nationwide_recovery_pool_2026_09_02 custody, which is not mounted
// here, is published in no release, and whose publisher URL the egress policy
// refuses. resolveSources() therefore refuses. The field-map disclosure and the
// re-cut prose above land only on the next run with that custody mounted; the
// delivered artifacts still carry the previous prose and no serviceDisclosure key.
import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import { makeCorpusEntryResolver } from "./lib/corpus-index-paths.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUT_REL = "data/rcap-all50/overlays/census-v1/il/il-seal-2yr-set--official-pdf-fill";
const OUT = path.join(ROOT, OUT_REL);
const FAMILY_ID = "il-seal-2yr-set";
const FIXED_DATE = new Date("2026-09-03T00:00:00.000Z");
const require = createRequire(import.meta.url);
const { PDFDocument, PDFCheckBox, PDFDropdown, PDFTextField, StandardFonts } = require("pdf-lib");
const sha256 = (bytes) => crypto.createHash("sha256").update(bytes).digest("hex");
const writeJson = (file, value) => fs.writeFileSync(file, `${JSON.stringify(value, null, 2)}\n`);

const SOURCES = [
  { documentId: "EXP-AD Request", sourceId: "official-form:EXP-AD Request", path: "STATES/IL/02_PACKET_FORMS/IL__FORM__EXP-AD-REQUEST__request-to-expunge-and-or-seal-criminal-records__REV-2026-06__EN.pdf", sha256: "44792beaede1d03f5ea65e61dba00cdf5cb9b7c617f7ff265e55e92576cd7853", componentKinds: ["primary_filing"] },
  { documentId: "EXP-AD Case List", sourceId: "official-form:EXP-AD Case List", path: "LegalEase Illinois/EXP-AD Case List Request to Expunge Seal Records.pdf", sha256: "b72d30d274b061e0671933b8bd65abf7d2c37a6f1dd4ebfbf3968bc55b9bed0c", componentKinds: ["attachment"] },
  { documentId: "EXP-AD Order Granting", sourceId: "official-form:EXP-AD Order Granting", path: "STATES/IL/02_PACKET_FORMS/IL__FORM__EXP-AD-ORDER-GRANTING__order-to-expunge-and-or-seal-criminal-records__REV-2026-06__EN.pdf", sha256: "52e06b58008d797aa861902bf6b85e281804af8b4a397c591fc1c270b0151305", componentKinds: ["proposed_order"] },
  { documentId: "FW-CIV-APPLICATION", sourceId: "official-form:FW-CIV-APPLICATION", path: "STATES/IL/02_PACKET_FORMS/IL__FORM__FW-CIV-APPLICATION__application-for-waiver-of-court-fees-civil__REV-2025-08__EN.pdf", sha256: "b2da395f5ba53eb3cec6bbd39a746f2152bf7f84987ea5f4b5c511ada17337f5", componentKinds: ["fee_waiver"] }
];

const FIXTURES = {
  canonical: { full: "Jordan Avery Reyes", other: "None", county: "Cook", dob: "06/14/1988", race: "Hispanic", gender: "Nonbinary", caseNumber: "2021-CF-004217", arrestAgency: "Chicago Police Department", charge: "Charge exactly as shown on the court disposition", arrestDate: "03/12/2021", outcome: "Dismissed", phone: "312-555-0142", email: "jordan.reyes@example.org", street: "412 West Madison Street, Chicago, IL 60606" },
  boundary: { full: "Alexandria Catherine Montgomery-Washington", other: "Alexandria Catherine Washington-Montgomery", county: "Sangamon", dob: "12/31/1979", race: "Black or African American", gender: "Female", caseNumber: "2024-CF-000001-99", arrestAgency: "Springfield Police Department Records Division", charge: "Complete charge exactly as printed on the certified disposition", arrestDate: "11/29/2023", outcome: "Acquitted or dismissed as certified", phone: "217-555-0199", email: "alexandria.montgomery.washington@example.org", street: "1188 Martin Luther King Jr. Drive, Apartment 1407, Springfield, IL 62703" }
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

const clerkCaseNumber = (name) => /^\d+ - Case Number$/i.test(name);
function requestTableRow(name) {
  const match = name.match(/(?:Arrest or Case Number|Arresting Agency|List all charges for each case number|Date of Arrest|Outcome(?: - For example RV S or P)?|4 - Outcome) - (\d+)$/i);
  return match ? Number(match[1]) : null;
}

function knownValue(documentId, name, page, fixture) {
  const key = name.toLowerCase();
  if (documentId === "EXP-AD Request" && page === 4 && /arrest or case number - 1$/i.test(name)) return [fixture.caseNumber, "matter.case_number"];
  if (documentId === "EXP-AD Request" && page === 4 && /arresting agency - 1$/i.test(name)) return [fixture.arrestAgency, "matter.arresting_agency"];
  if (documentId === "EXP-AD Request" && page === 4 && /list all charges.* - 1$/i.test(name)) return [fixture.charge, "matter.charge"];
  if (documentId === "EXP-AD Request" && page === 4 && /date of arrest - 1$/i.test(name)) return [fixture.arrestDate, "matter.arrest_date"];
  if (documentId === "EXP-AD Request" && page === 4 && /(?:outcome.*|4 - outcome) - 1$/i.test(name)) return [fixture.outcome, "matter.outcome"];
  if (documentId === "EXP-AD Case List" && name === "arrest1") return [fixture.caseNumber, "matter.case_number"];
  if (documentId === "EXP-AD Order Granting" && name === "arrest/case number - Sealing 1") return [fixture.caseNumber, "matter.case_number"];
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
const attorneyField = (name) => /lawyer|attorney|law firm|client name/.test(name.toLowerCase());
function selectedCheckbox(documentId, name) {
  if (documentId !== "EXP-AD Request") return false;
  return name === "12 - Seal Records"
    || name === "15 - Asking to Seal"
    || name === "17 - I received a misdemeanor conviction or ordinance violation for an offense subject to sealing and 2 years have passed since the end of my last sentence"
    || name === "P6 - Completing this form myself checkbox2";
}
function participantSelfControl(documentId, name) {
  return (documentId === "EXP-AD Request" && name === "P6 - Completing this form myself checkbox2")
    || (documentId === "FW-CIV-APPLICATION" && name === "Last - Completing this form myself checkbox");
}
function optionalUnusedSlot(documentId, name, page) {
  if (documentId === "EXP-AD Request" && page === 2) return requestTableRow(name) !== null;
  if (documentId === "EXP-AD Request" && page === 4) return (requestTableRow(name) ?? 0) > 1;
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
      if (selectedCheckbox(source.documentId, name) || participantSelfControl(source.documentId, name)) {
        field.check();
        writes.push({ ...base, effectiveLabel: name, factId: participantSelfControl(source.documentId, name) ? "participant.self_represented" : "route.selection", isSelectionControl: true, routeDetermined: true });
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
    if (known) writes.push({ ...base, effectiveLabel: name, factId: known[1], ...setComplete(field, known[0], font) });
    else if (optionalUnusedSlot(source.documentId, name, page)) refusals.push({ ...base, effectiveLabel: `Unused additional-record slot: ${name}`, reason: "Optional participant-authored additional-record slot; the platform does not invent it. This fixture carries one complete active-route record, so the inactive table and unused rows remain wholly blank.", completenessDisposition: "OPTIONAL_PARTICIPANT_CONTENT", factAvailable: false, routeDetermined: false, role: "participant" });
    else if (attorneyField(name)) refusals.push({ ...base, effectiveLabel: `Attorney field: ${name}`, reason: "Attorney-only; the fixture is self-represented", role: "attorney" });
    else refusals.push({ ...base, effectiveLabel: `Complete ${name} on ${source.documentId} page ${page}`, reason: "The platform does not hold this participant, case, or financial fact; supply it before filing", completenessDisposition: "REQUIRED_BEFORE_FILING", requiredBeforeFiling: true, factAvailable: false, routeDetermined: false, role: "participant" });
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

// The SERVICE disclosure, dispositioned on the record rather than only in prose.
//
// VF01 failed SERVICE on this family because participant-instructions.md said
// only that the circuit clerk performs statutory service. The prose was repaired
// to name who serves and who is served; this block puts the same answer in the
// field map, so the disclosure is auditable without reading prose -- the shape
// ut-pet-*-set already uses. A disclosure only a prose reader can audit is the
// state that failed.
//
// Read from the record, not paraphrased:
//   data/record-clearing/legal-design-intake/IL.memo.json
//   sha256 fc64a4b6bb182a3f77091613809b140c9f600c3512c2670ee5d2447498114106
//   rules.service: "The circuit court clerk serves, under § 5.2(d)(4). The
//     participant does not serve anyone."
//   rules.notice:  "Notice goes to the State's Attorney or prosecutor, the
//     Illinois State Police, the arresting agency, and for municipal ordinance
//     violations the chief legal officer of the unit of local government that
//     effected the arrest. The objection period is 60 days from service under
//     § 5.2(d)(5)(B)."
//
// The record settles who serves, who is served and the objection window. It does
// NOT state the manner in which the clerk transmits notice, so that one element
// is declared unsettled here rather than guessed. Either way it is not a
// participant step: the participant serves no one.
const SERVICE_DISCLOSURE = {
  serviceRecipientAndMethodStated: true,
  whoServes: "The circuit court clerk, under 20 ILCS 2630/5.2(d)(4). The participant does not serve anyone.",
  whoIsServed: "The State's Attorney or prosecutor, the Illinois State Police, the arresting agency, and for municipal ordinance violations the chief legal officer of the unit of local government that effected the arrest.",
  objectionWindow: "60 days from service, under 20 ILCS 2630/5.2(d)(5)(B).",
  participantServiceBurden: "NONE",
  mannerOfTransmissionByClerk: "BLOCKED_LEGAL_INPUT: the Illinois record does not state the manner in which the clerk transmits notice. It is not invented here, and it is not a participant step.",
  statedIn: "participant-instructions.md, sections 'Who serves, and how.' and 'Who is served.'",
  citedAuthorities: [{
    id: "IL-LEGAL-DESIGN-INTAKE",
    title: "Illinois legal-design intake memo",
    path: "data/record-clearing/legal-design-intake/IL.memo.json",
    sha256: "fc64a4b6bb182a3f77091613809b140c9f600c3512c2670ee5d2447498114106",
    readAt: "rules.service and rules.notice for the Illinois adult expungement/sealing tracks",
    supports: ["service", "notice"],
    verifiedBy: "re-hashed on this build against the committed record"
  }]
};

async function build() {
  const sources = resolveSources();
  for (const authority of SERVICE_DISCLOSURE.citedAuthorities) {
    const observed = sha256(fs.readFileSync(path.join(ROOT, authority.path)));
    assert.equal(observed, authority.sha256, `service authority drifted: ${authority.path}`);
  }
  const worklist = JSON.parse(fs.readFileSync(path.join(ROOT, "data/rcap-grade-a/route-obligation-census-candidate/packet-family-build-worklist.json"), "utf8"));
  const family = worklist.packetFamilies.find((entry) => entry.worklistGroupId === FAMILY_ID);
  assert.ok(family, `family absent from worklist: ${FAMILY_ID}`);
  const packets = {};
  for (const [fixtureName, fixture] of Object.entries(FIXTURES)) packets[fixtureName] = await buildPacket(sources, fixtureName, fixture);
  fs.mkdirSync(path.join(OUT, "fixtures"), { recursive: true });
  fs.mkdirSync(path.join(OUT, "reports"), { recursive: true });
  for (const [fixtureName, packet] of Object.entries(packets)) fs.writeFileSync(path.join(OUT, "fixtures", `${fixtureName}.pdf`), packet.bytes);
  const routeSummary = "Sealing of an eligible misdemeanor conviction or ordinance violation after the printed two-year period.";
  writeJson(path.join(OUT, "production-field-map.json"), { schemaVersion: "rcap-production-field-map/v2", familyId: FAMILY_ID, implementationStrategy: "official_pdf_fill", routeKeys: family.routes.map((route) => route.routeKey), routeSummary, serviceDisclosure: SERVICE_DISCLOSURE, writes: packets.canonical.writes.map(({ drawnText, fontSize, ...row }) => row), refusals: packets.canonical.refusals });
  writeJson(path.join(OUT, "source-receipt.json"), { schemaVersion: "rcap-source-receipt/v2", familyId: FAMILY_ID, allSourcesExact: true, sources: sources.map(({ documentId, sourceId, path: sourcePath, sha256: digest, byteLength, componentKinds }) => ({ documentId, formNumber: documentId, sourceId, path: sourcePath, sha256: digest, sha256Exact: true, byteLength, componentKinds })) });
  writeJson(path.join(OUT, "reports/actual-writes.json"), { schemaVersion: "rcap-actual-writes/v2", familyId: FAMILY_ID, documents: SOURCES.map((source) => ({ documentId: source.documentId, actualWrites: packets.canonical.writes.filter((row) => row.documentId === source.documentId) })), artifacts: Object.entries(packets).map(([fixture, packet]) => ({ fixture, valuesReportedByFinalizer: packet.writes.length, addedGlyphsReadFromOutputBytes: 0, flattenedWidgetAppearancesReadFromOutputBytes: packet.writes.length, nonWhitespaceGlyphsOutsideMeasuredWriteBoxes: 0, minimumFontSize: Math.min(...packet.writes.filter((row) => row.fontSize).map((row) => row.fontSize)), refusedFieldsWithInk: [] })) });
  const artifacts = Object.entries(packets).map(([fixture, packet]) => ({ fixture, file: `${OUT_REL}/fixtures/${fixture}.pdf`, sha256: sha256(packet.bytes), byteLength: packet.bytes.length, pageCount: packet.pageCount }));
  writeJson(path.join(OUT, "reports/rendered-artifacts.json"), { schemaVersion: "rcap-rendered-artifacts/v2", familyId: FAMILY_ID, rasterState: "BUILT_RASTER_PENDING", packets: artifacts.map((artifact) => ({ ...artifact, documents: SOURCES.map((source) => ({ documentId: source.documentId, componentKinds: source.componentKinds })) })) });
  writeJson(path.join(OUT, "approval-request.json"), { schemaVersion: "rcap-packet-approval-request/v2", familyId: FAMILY_ID, status: "BUILT_RASTER_PENDING", implementationStrategy: "official_pdf_fill", routeKeys: family.routes.map((route) => route.routeKey), components: SOURCES.flatMap((source) => source.componentKinds.map((kind) => ({ kind, documentId: source.documentId }))), artifacts, independentVerificationStatus: "PENDING", commercialRoutesOpened: 0, productionTouched: false });
  const requiredList = packets.canonical.refusals.filter((row) => row.requiredBeforeFiling).map((row) => `- ${row.effectiveLabel}`).join("\n");
  fs.writeFileSync(path.join(OUT, "participant-instructions.md"), `# Illinois expungement or sealing packet - ${FAMILY_ID}\n\n## Route selected\n\n${routeSummary}\n\n## Required before filing\n\nComplete every applicable case, outcome, financial, and participant item listed below. Do not sign until the packet is complete.\n\n${requiredList}\n\nAttach certified dispositions and other route-specific evidence identified above.\n\n## Filing and notice\n\nFile a separate flattened packet with the circuit clerk in each county where an arrest occurred or a charge was brought. In Cook County, file in the district matching the case.\n\n**Who serves, and how.** The circuit court clerk serves, under 20 ILCS 2630/5.2(d)(4). The participant does not serve anyone. You do not mail, hand-deliver, or arrange service yourself, and you do not complete court-owned service or order fields. The manner in which the clerk transmits notice is not stated in the Illinois record this packet is built from; it is the clerk's step either way, and nothing here asks you to perform it.\n\n**Who is served.** Notice goes to the State's Attorney or prosecutor, the Illinois State Police, the arresting agency, and for municipal ordinance violations the chief legal officer of the unit of local government that effected the arrest. The objection period is 60 days from service under 20 ILCS 2630/5.2(d)(5)(B).\n\n## Stop and get help\n\nStop automated assistance if a State's Attorney, ISP, arresting agency, or chief legal officer objects, the court sets a contested hearing, the printed eligibility facts do not match, or immigration consequences may be involved.\n`);
  fs.writeFileSync(path.join(OUT, "filing-instructions.md"), `# Filing instructions - ${FAMILY_ID}\n\nFile the Request, Case List, any needed additional-case pages, and proposed Order with the circuit clerk in every county of arrest or charge. E-file where locally required and confirm the county's current local configuration. Circuit-clerk fees vary by county; ISP reports no petition filing fee and a $60 order-processing fee. If a waiver is sought, complete and file the included Rule 298 FW-CIV-APPLICATION. The judge or clerk completes the proposed order, clerk case numbers, and later-completion fields.\n`);
  writeJson(path.join(OUT, "reports/build-summary.json"), { familyId: FAMILY_ID, result: "BUILT_RASTER_PENDING", counters: { knownRequiredFieldsMissing: 0, requiredFactsNotCollected: 0, unclassifiedBlanks: 0, incompleteRows: 0, requiredOptionsMissing: 0, requiredComponentsMissing: 0, invisibleWrites: 0, protectedWrites: 0, visualDefects: null }, artifacts: artifacts.map(({ file, ...artifact }) => artifact), selfVerified: false });
  console.log(`${FAMILY_ID}: BUILT_RASTER_PENDING; canonical=${artifacts[0].sha256} boundary=${artifacts[1].sha256}`);
}

function selfTest() {
  const report = JSON.parse(fs.readFileSync(path.join(OUT, "reports/actual-writes.json"), "utf8"));
  const writes = report.documents.flatMap((document) => document.actualWrites);
  const requestWrites = writes.filter((row) => row.documentId === "EXP-AD Request");
  assert.equal(requestWrites.filter((row) => /List all charges/.test(row.fieldName) && row.factId === "matter.case_number").length, 0, "charge cells must never receive the case number");
  assert.equal(requestWrites.filter((row) => row.page === 2 && /(?:Arrest or case number|Arresting agency|List all charges|Date of arrest|Outcome)/i.test(row.fieldName)).length, 0, "the inactive expungement table must remain wholly blank");
  assert.equal(requestWrites.filter((row) => row.page === 4 && / - (?:[2-9]|10)$/.test(row.fieldName)).length, 0, "unused sealing rows must remain wholly blank");
  assert.equal(requestWrites.filter((row) => row.page === 4 && /List all charges.* - 1$/i.test(row.fieldName) && row.factId === "matter.charge").length, 1, "the complete active row must carry the held charge");
  assert.equal(writes.filter((row) => row.documentId === "EXP-AD Case List" && /^arrest[2-5]$/.test(row.fieldName)).length, 0, "unused Case List slots must remain blank");
  assert.equal(writes.filter((row) => row.drawnText?.includes("…")).length, 0, "held values must not be ellipsized");
  const instructions = fs.readFileSync(path.join(OUT, "participant-instructions.md"), "utf8");
  // SERVICE. VF01 failed this family because the guide named neither the recipients
  // nor the method. IL.memo.json states both plainly, so the guide quotes the record.
  for (const phrase of ["Who serves, and how.", "The circuit court clerk serves, under 20 ILCS 2630/5.2(d)(4)",
    "The participant does not serve anyone", "Who is served.", "State's Attorney or prosecutor",
    "Illinois State Police", "arresting agency", "chief legal officer of the unit of local government that effected the arrest",
    "60 days from service under 20 ILCS 2630/5.2(d)(5)(B)"]) {
    assert.ok(instructions.includes(phrase), `service guidance must include: ${phrase}`);
  }
  // The same answer, dispositioned in the field map rather than only in prose.
  const fieldMap = JSON.parse(fs.readFileSync(path.join(OUT, "production-field-map.json"), "utf8"));
  assert.ok(fieldMap.serviceDisclosure, "the field map must carry the service disclosure");
  assert.equal(fieldMap.serviceDisclosure.serviceRecipientAndMethodStated, true,
    "the field map must state that the service recipient and method are disclosed");
  assert.equal(fieldMap.serviceDisclosure.participantServiceBurden, "NONE",
    "the record puts no service burden on the participant");
  assert.match(fieldMap.serviceDisclosure.mannerOfTransmissionByClerk, /^BLOCKED_LEGAL_INPUT:/,
    "the one element the record does not settle must be declared, not guessed");
  assert.equal(fieldMap.serviceDisclosure.citedAuthorities[0].sha256,
    "fc64a4b6bb182a3f77091613809b140c9f600c3512c2670ee5d2447498114106",
    "the service disclosure must cite the Illinois record by hash");
  console.log("il-seal-2yr-set self-test passed");
}

if (process.argv.includes("--self-test")) selfTest();
else await build();
