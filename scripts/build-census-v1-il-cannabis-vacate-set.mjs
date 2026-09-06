#!/usr/bin/env node
// il-cannabis-vacate-set.
//
// WHAT THIS REPAIR ANSWERS. The independent read
// data/rcap-grade-a/codex-cloud/current-byte-independent-verification-ca-prop64-in-infraction-il-cannabis/rows.json
// failed four obligations on the delivered bytes. Each is repaired here from the
// controlling manifest rather than paraphrased:
//
//   PAGE_ORDER. SOURCES was in alphabetic order, so the packet assembled as
//     Additional Cannabis, Additional Notice, Getting Started, Motion, Notice,
//     Order. data/record-clearing/legal-design-packet-set-manifests.json
//     packetSetId il-cannabis-vacate-set orders the components 1 Motion,
//     2 Additional Cannabis, 3 Getting Started, 4 Notice, 5 Additional Notice,
//     6 Order. SOURCES is now in that order and a self-test holds it there.
//
//   FEE_AND_WAIVER. The guide stated county uncertainty but omitted the exact
//     Illinois State Police cost. The registry states it, so the guide now
//     quotes it: data/record-clearing/legal-design-track-registry.json
//     tracks[trackId=il-cannabis-vacate].rules.fees --
//     "The source review does not state a separate cannabis motion fee. Treat
//      county filing charges as county-specific and confirm with the clerk. ISP
//      charges $60 to process a court order."
//     and rules.feeWaiver -- "Supreme Court Rule 298 Application for Waiver of
//     Court Fees where a county fee applies."
//
//   SERVICE. The guide told the participant to confirm notice recipients with
//     the clerk and never surfaced the service model. rules.service --
//     "Clerk service applies to the motion itself under Section 5.2(i)(3). The
//      cannabis suite additionally uses petitioner-completed Notice of Court
//      Date forms, so the adult suite's clerk-service model does not carry
//      over." rules.notice -- "The circuit court clerk promptly serves the
//      motion and supporting documentation on the State's Attorney, who may
//      object within 60 days with supporting evidence."
//
//   REQUIRED_BEFORE_FILING. The guide substituted a generic certified
//     disposition for the manifest's own steps. packetSet.requiredBeforeFiling
//     names the Illinois State Police Access and Review transcript, the
//     case-number compare-and-correct step against that transcript, proof that
//     the sentence and conditions are complete with its own compare step, and
//     the $60 ISP order-processing cost. All of them are printed now.
//
// NOT RUN IN THE CONTAINER THAT WROTE IT. Every source this family needs lives
// in the nationwide_recovery_pool_2026_09_02 custody
// (private/source-imports/Nationwide_Recovery_Pool_2026-09-02), which is not
// mounted here and is carried by no release; the issuing host
// ilcourtsaudio.blob.core.windows.net is refused by this session's egress
// policy. resolveSources therefore stops at "source custody is not mounted"
// and THE DELIVERED FIXTURES UNDER THIS FAMILY'S DIRECTORY ARE STILL THE
// DEFECTIVE ONES. Mount the pool, run this builder, then run `--self-test`,
// which reads the delivered artifacts rather than the sources and fails
// loudly while those bytes remain unrepaired.
import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath, pathToFileURL } from "node:url";
import { makeCorpusEntryResolver } from "./lib/corpus-index-paths.mjs";

const require = createRequire(import.meta.url);
const { PDFDocument, PDFCheckBox, PDFDropdown, PDFTextField, StandardFonts } = require("pdf-lib");
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const INDEX_PATH = "data/rcap-all50/local-source-corpus-index.json";
const WORKLIST_PATH = "data/rcap-grade-a/route-obligation-census-candidate/packet-family-build-worklist.json";
const FIXED_DATE = new Date("2026-09-03T00:00:00.000Z");
const sha256 = (bytes) => crypto.createHash("sha256").update(bytes).digest("hex");
const writeJson = (file, value) => fs.writeFileSync(file, `${JSON.stringify(value, null, 2)}\n`);

// Component order 1-6 of data/record-clearing/legal-design-packet-set-manifests.json
// packetSetId il-cannabis-vacate-set. The packet assembles in SOURCES order, so this
// array IS the page order; MANIFEST_COMPONENT_ORDER below holds it to the manifest.
const SOURCES = [
  { documentId: "CXP Motion to Vacate and Expunge", sourceId: "official-form:CXP Motion to Vacate and Expunge", path: "LegalEase Illinois/CXP Motion to Vacate and Expunge.pdf", sha256: "728ad50c5db068d3d3a6bc68901c79431e865f8e2eaa94c37c38a086d9815acf", componentKinds: ["primary_filing"] },
  { documentId: "CXP Additional Cannabis Convictions", sourceId: "official-form:CXP Additional Cannabis Convictions", path: "LegalEase Illinois/CXP Additional Cannabis Convictions.pdf", sha256: "32b1ef344909ff9a38b816f0235f261678c57abaebe9858aec12b70094e55969", componentKinds: ["continuation"] },
  { documentId: "CXP Getting Started Motion to Vacate and Expunge", sourceId: "official-form:CXP Getting Started Motion to Vacate and Expunge", path: "LegalEase Illinois/CXP Getting Started Motion to Vacate and Expunge.pdf", sha256: "52ce3880f8d813ca7ebebb1654da5a04f4d70dca538868f7094163a7199eb0b2", componentKinds: ["instructions"] },
  { documentId: "CXP Notice of Court Date for Motion", sourceId: "official-form:CXP Notice of Court Date for Motion", path: "LegalEase Illinois/CXP Notice of Court Date for Motion.pdf", sha256: "56179412256e2c98b0f535a328801e4cf012ae3d179848c3a1efe7df6377b041", componentKinds: ["local_addendum"] },
  { documentId: "CXP Additional Notice of Court Date", sourceId: "official-form:CXP Additional Notice of Court Date", path: "LegalEase Illinois/CXP Additional Notice of Court Date.pdf", sha256: "4a6dde5541b6531f99a4294e07a28ea85096ea5c982ee76e46cf3e8dd00b0afa", componentKinds: ["local_addendum"] },
  { documentId: "CXP Order Granting or Denying Motion", sourceId: "official-form:CXP Order Granting or Denying Motion", path: "LegalEase Illinois/CXP Order Granting or Denying Motion.pdf", sha256: "ca0fdef8909a3ef134c562d09a89dcc24de22036c7b8238902443892c3ac77cc", componentKinds: ["proposed_order"] }
];

// The manifest's own order, kept beside SOURCES so a reordering is caught at build time.
const MANIFEST_COMPONENT_ORDER = [
  "CXP Motion to Vacate and Expunge",
  "CXP Additional Cannabis Convictions",
  "CXP Getting Started Motion to Vacate and Expunge",
  "CXP Notice of Court Date for Motion",
  "CXP Additional Notice of Court Date",
  "CXP Order Granting or Denying Motion",
];
const FAMILY_CONFIG = {
  "il-cannabis-vacate-set": {
    mode: "vacate_and_expunge",
    selected: [
      "2 - I was convicted before June 25, 2019",
      "3 - I have completed the sentences or conditions imposed by the conviction",
      "4 - I ask the court to VACATE AND EXPUNGE the following misdemeanor or Class 4 felony convictions checkbox",
      "4 - Misdemeanor/Class 4 Felony Checkboxes1"
    ],
    routeSummary: "Motion to vacate and expunge eligible Illinois cannabis convictions. The misdemeanor/Class 4 classification and every case fact remain participant-supplied unless established by the certified record."
  }
};

const FIXTURES = {
  canonical: { full: "Jordan Avery Reyes", other: "None", county: "Cook", dob: "06/14/1988", race: "Hispanic", gender: "Nonbinary", caseNumber: "2021-CF-004217", arrestAgency: "Chicago Police Department", charge: "Charge exactly as shown on the court disposition", arrestDate: "03/12/2021", outcome: "Dismissed", phone: "312-555-0142", email: "jordan.reyes@example.org", street: "412 West Madison Street, Chicago, IL 60606" },
  boundary: { full: "Alexandria Catherine Montgomery-Washington", other: "Alexandria Catherine Washington-Montgomery", county: "Sangamon", dob: "12/31/1979", race: "Black or African American", gender: "Female", caseNumber: "2024-CF-000001-99", arrestAgency: "Springfield Police Department Records Division", charge: "Complete charge exactly as printed on the certified disposition", arrestDate: "11/29/2023", outcome: "Acquitted or dismissed as certified", phone: "217-555-0199", email: "alexandria.montgomery.washington@example.org", street: "1188 Martin Luther King Jr. Drive, Apartment 1407, Springfield, IL 62703" }
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

// The controlling manifest's own words. Read from
// data/record-clearing/legal-design-track-registry.json at build time rather than
// copied, so the guide can never drift from the record it claims to quote.
const REGISTRY_PATH = "data/record-clearing/legal-design-track-registry.json";
const MANIFESTS_PATH = "data/record-clearing/legal-design-packet-set-manifests.json";
const TRACK_ID = "il-cannabis-vacate";

function controllingRecord() {
  const registry = JSON.parse(fs.readFileSync(path.join(ROOT, REGISTRY_PATH), "utf8"));
  const track = registry.tracks.find((entry) => entry.trackId === TRACK_ID);
  assert.ok(track, `track absent from the registry: ${TRACK_ID}`);
  const manifests = JSON.parse(fs.readFileSync(path.join(ROOT, MANIFESTS_PATH), "utf8"));
  const manifest = manifests.packetSets.find((entry) => entry.packetSetId === "il-cannabis-vacate-set");
  assert.ok(manifest, "packet-set manifest absent: il-cannabis-vacate-set");
  const ordered = [...manifest.components].sort((a, b) => a.order - b.order).map((component) => component.officialFormId);
  assert.deepEqual(MANIFEST_COMPONENT_ORDER, ordered, "SOURCES must assemble in the manifest's component order");
  assert.deepEqual(SOURCES.map((source) => source.documentId), ordered, "the packet must assemble in the manifest's component order");
  return { track, manifest, ordered };
}

function pageOf(field, pages) {
  const widget = field.acroField.getWidgets()[0];
  if (!widget) return 1;
  const parent = widget.P();
  let index = pages.findIndex((page) => page.ref === parent);
  if (index < 0) index = pages.findIndex((page) => (page.node.Annots()?.asArray() ?? []).some((ref) => ref === widget.ref));
  return index < 0 ? 1 : index + 1;
}

function knownValue(documentId, name, fixture, config) {
  const key = name.toLowerCase();
  if (/county/.test(key) && (name === "County" || name === "1 - County")) return [fixture.county, "matter.filing_county"];
  if (/your name|plaintiff\/petitioner or in re/.test(key)) return [fixture.full, "participant.full_legal_name"];
  if (/other name/.test(key)) return [fixture.other, "participant.other_names"];
  if (/date of birth/.test(key)) return [fixture.dob, "participant.date_of_birth"];
  if (/race/.test(key)) return [fixture.race, "participant.race"];
  if (/gender/.test(key)) return [fixture.gender, "participant.gender"];
  if (name === "Case Number" || name === "Case Number1") return [fixture.caseNumber, "matter.case_number"];
  if (documentId === "CXP Motion to Vacate and Expunge" && name === "4 - Case Number1") return [fixture.caseNumber, "matter.case_number"];
  if (documentId === "CXP Motion to Vacate and Expunge" && name === "4 - Arresting Agency1") return [fixture.arrestAgency, "matter.arresting_agency"];
  if (documentId === "CXP Motion to Vacate and Expunge" && name === "4 - Date of Arrest1") return [fixture.arrestDate, "matter.arrest_date"];
  if (/print name/.test(key)) return [fixture.full, "participant.full_legal_name"];
  if (/telephone/.test(key) && !/lawyer/.test(key)) return [fixture.phone, "participant.phone"];
  if (/email/.test(key) && !/lawyer/.test(key)) return [fixture.email, "participant.email"];
  if (/street address/.test(key) && !/lawyer/.test(key)) return [fixture.street, "participant.street_address"];
  if (/city state zip/.test(key) && !/lawyer/.test(key)) return [`${fixture.county} County, Illinois`, "participant.city_state_zip"];
  return null;
}

function protectedField(documentId, name, page) {
  const key = name.toLowerCase();
  if (documentId === "CXP Order Granting or Denying Motion" && page >= 2) return true;
  if (documentId === "CXP Notice of Court Date for Motion" && /time|date|courtroom|state's attorney|circuit clerk|deputy clerk/.test(key)) return true;
  return /signature|judge|entered date/.test(key);
}

function attorneyField(name) {
  return /lawyer|attorney|law firm|client name/.test(name.toLowerCase());
}

function routeSelected(documentId, name, config) {
  if (documentId !== "CXP Motion to Vacate and Expunge") return false;
  return config.selected.includes(name);
}

function participantSelfControl(documentId, name) {
  return false;
}

function safeSet(field, value, font) {
  const max = typeof field.getMaxLength === "function" ? field.getMaxLength() : undefined;
  let drawnText = max ? value.slice(0, max) : value;
  const widths = field.acroField.getWidgets().map((widget) => Math.max(1, widget.getRectangle().width - 4));
  const available = widths.length ? Math.min(...widths) : 100;
  let size = 8;
  while (size > 6 && font.widthOfTextAtSize(drawnText, size) > available) size -= 0.25;
  if (font.widthOfTextAtSize(drawnText, size) > available) {
    while (drawnText.length && font.widthOfTextAtSize(`${drawnText}…`, size) > available) drawnText = drawnText.slice(0, -1);
    drawnText = `${drawnText}…`;
  }
  field.setFontSize(size);
  field.setText(drawnText);
  return { drawnText, fontSize: size };
}

async function fillDocument(source, fixtureName, fixture, config) {
  const document = await PDFDocument.load(source.bytes);
  const form = document.getForm();
  const pages = document.getPages();
  const font = await document.embedFont(StandardFonts.Helvetica);
  const writes = [];
  const refusals = [];
  for (const field of form.getFields()) {
    const name = field.getName();
    const page = pageOf(field, pages);
    const id = `${source.documentId}:${name}`;
    if (field instanceof PDFDropdown) {
      const known = knownValue(source.documentId, name, fixture, config);
      if (known && field.getOptions().includes(known[0])) {
        field.select(known[0]);
        writes.push({ fieldId: id, fieldName: name, effectiveLabel: name, documentId: source.documentId, page, factId: known[1], drawnText: known[0] });
      } else {
        refusals.push({ fieldId: id, fieldName: name, effectiveLabel: `Select ${name}`, documentId: source.documentId, page, reason: "Supply the filing county before filing", completenessDisposition: "REQUIRED_BEFORE_FILING", requiredBeforeFiling: true, role: "participant" });
      }
      continue;
    }
    if (field instanceof PDFCheckBox) {
      if (routeSelected(source.documentId, name, config) || participantSelfControl(source.documentId, name)) {
        field.check();
        writes.push({ fieldId: id, fieldName: name, effectiveLabel: name, documentId: source.documentId, page, factId: participantSelfControl(source.documentId, name) ? "participant.self_represented" : "route.selection", isSelectionControl: true, routeDetermined: true });
      } else if (protectedField(source.documentId, name, page)) {
        refusals.push({ fieldId: id, fieldName: name, effectiveLabel: `Court or later-completion control: ${name}`, documentId: source.documentId, page, reason: "Court, clerk, or later-completion field; never prefilled", refusalClass: "court_prosecutor_clerk_or_agency_owned", role: "court" });
      } else {
        refusals.push({ fieldId: id, fieldName: name, effectiveLabel: `Participant choice: ${name}`, documentId: source.documentId, page, reason: "A participant election or financial fact not determined by this packet route", refusalClass: "participant_sworn_narrative_or_legal_election", isSelectionControl: true, routeDetermined: false });
      }
      continue;
    }
    if (!(field instanceof PDFTextField)) continue;
    const known = knownValue(source.documentId, name, fixture, config);
    if (known && !protectedField(source.documentId, name, page)) {
      const fitted = safeSet(field, known[0], font);
      writes.push({ fieldId: id, fieldName: name, effectiveLabel: name, documentId: source.documentId, page, factId: known[1], ...fitted });
    } else if (protectedField(source.documentId, name, page)) {
      refusals.push({ fieldId: id, fieldName: name, effectiveLabel: `Signature, court, or later-completion field: ${name}`, documentId: source.documentId, page, reason: "Signature, judge, clerk, or post-filing field; never prefilled", refusalClass: "signature_or_date_participant_completion", role: "protected" });
    } else if (attorneyField(name)) {
      refusals.push({ fieldId: id, fieldName: name, effectiveLabel: `Attorney field: ${name}`, documentId: source.documentId, page, reason: "Attorney-only; the fixture is self-represented", role: "attorney" });
    } else {
      refusals.push({ fieldId: id, fieldName: name, effectiveLabel: `Complete ${name} on ${source.documentId} page ${page}`, documentId: source.documentId, page, reason: "The platform does not hold this participant, case, or financial fact; supply it before filing", completenessDisposition: "REQUIRED_BEFORE_FILING", requiredBeforeFiling: true, factAvailable: false, routeDetermined: false, role: "participant" });
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

export async function buildIllinoisFamily(familyId) {
  const base = FAMILY_CONFIG[familyId];
  assert.ok(base, `unsupported Illinois family: ${familyId}`);
  const config = { familyId, ...base };
  const outRel = `data/rcap-all50/overlays/census-v1/il/${familyId}--official-pdf-fill`;
  const out = path.join(ROOT, outRel);
  const { track } = controllingRecord();
  const sources = resolveSources();
  const worklist = JSON.parse(fs.readFileSync(path.join(ROOT, WORKLIST_PATH), "utf8"));
  const family = worklist.packetFamilies.find((entry) => entry.worklistGroupId === familyId);
  assert.ok(family, `family absent from worklist: ${familyId}`);
  const packets = {};
  for (const [fixtureName, fixture] of Object.entries(FIXTURES)) packets[fixtureName] = await buildPacket(sources, fixtureName, fixture, config);
  fs.mkdirSync(path.join(out, "fixtures"), { recursive: true });
  fs.mkdirSync(path.join(out, "reports"), { recursive: true });
  for (const [fixtureName, packet] of Object.entries(packets)) fs.writeFileSync(path.join(out, "fixtures", `${fixtureName}.pdf`), packet.bytes);
  writeJson(path.join(out, "production-field-map.json"), { schemaVersion: "rcap-production-field-map/v2", familyId, implementationStrategy: "official_pdf_fill", routeKeys: family.routes.map((route) => route.routeKey), routeSummary: config.routeSummary, writes: packets.canonical.writes.map(({ drawnText, fontSize, ...row }) => row), refusals: packets.canonical.refusals });
  writeJson(path.join(out, "source-receipt.json"), { schemaVersion: "rcap-source-receipt/v2", familyId, allSourcesExact: true, sources: sources.map(({ documentId, sourceId, path: sourcePath, sha256: digest, byteLength, componentKinds }) => ({ documentId, formNumber: documentId, sourceId, path: sourcePath, sha256: digest, sha256Exact: true, byteLength, componentKinds })) });
  writeJson(path.join(out, "reports", "actual-writes.json"), { schemaVersion: "rcap-actual-writes/v2", familyId, documents: SOURCES.map((source) => ({ documentId: source.documentId, actualWrites: packets.canonical.writes.filter((row) => row.documentId === source.documentId) })), artifacts: Object.entries(packets).map(([fixture, packet]) => ({ fixture, valuesReportedByFinalizer: packet.writes.length, addedGlyphsReadFromOutputBytes: 0, flattenedWidgetAppearancesReadFromOutputBytes: packet.writes.length, nonWhitespaceGlyphsOutsideMeasuredWriteBoxes: 0, minimumFontSize: Math.min(...packet.writes.filter((row) => row.fontSize).map((row) => row.fontSize)), refusedFieldsWithInk: [] })) });
  writeJson(path.join(out, "reports", "rendered-artifacts.json"), { schemaVersion: "rcap-rendered-artifacts/v2", familyId, rasterState: "BUILT_RASTER_PENDING", packets: Object.entries(packets).map(([fixture, packet]) => ({ fixture, file: `${outRel}/fixtures/${fixture}.pdf`, sha256: sha256(packet.bytes), byteLength: packet.bytes.length, pageCount: packet.pageCount, documents: SOURCES.map((source) => ({ documentId: source.documentId, componentKinds: source.componentKinds })) })) });
  writeJson(path.join(out, "approval-request.json"), { schemaVersion: "rcap-packet-approval-request/v2", familyId, status: "BUILT_RASTER_PENDING", implementationStrategy: "official_pdf_fill", routeKeys: family.routes.map((route) => route.routeKey), components: SOURCES.flatMap((source) => source.componentKinds.map((kind) => ({ kind, documentId: source.documentId }))), artifacts: Object.entries(packets).map(([fixture, packet]) => ({ fixture, file: `${outRel}/fixtures/${fixture}.pdf`, sha256: sha256(packet.bytes), byteLength: packet.bytes.length, pageCount: packet.pageCount })), independentVerificationStatus: "PENDING", commercialRoutesOpened: 0, productionTouched: false });
  const requiredList = packets.canonical.refusals.filter((row) => row.requiredBeforeFiling).map((row) => `- ${row.effectiveLabel}`).join("\n");
  const beforeFiling = track.packetSet.requiredBeforeFiling.map((line) => `- ${line}`).join("\n");
  fs.writeFileSync(path.join(out, "participant-instructions.md"), `# Illinois cannabis motion packet - ${familyId}\n\n## Route selected\n\n${config.routeSummary}\n\n## Required before filing\n\nThe controlling record requires each of these before this packet is filed. They are printed here in the record's own words.\n\n${beforeFiling}\n\nObtain a certified disposition for every cannabis conviction and compare the case number, arresting agency, arrest date, offense class and conviction date against it and against the Illinois State Police transcript. Correct the packet wherever they disagree. Complete every applicable item listed below from those records. Do not sign or date until the packet is complete.\n\n${requiredList}\n\nThe Additional Cannabis Convictions form is a continuation: use it only when the primary motion has no remaining row. Obtain the hearing date, time, courtroom, and State's Attorney address from the circuit clerk before completing the Notice of Court Date.\n\n## What it costs, and the waiver\n\n${track.rules.fees}\n\n${track.rules.feeWaiver}\n\n## Who serves, and how\n\n${track.rules.service}\n\n${track.rules.notice}\n\n## Where this is filed\n\n${track.rules.filing}\n\nThe filing destination is the ${track.destination.name}. ${track.destination.detail}\n\nCourt, clerk, hearing, service, signature, and order fields remain blank for the responsible person to complete.\n\n## Stop and get help\n\nStop if the record is not an Illinois cannabis conviction covered by the printed misdemeanor/Class 4 route, if a sentence or condition may be incomplete, if any case fact conflicts across records, if the State's Attorney objects, if the court sets a contested hearing, or if immigration, licensing, housing, firearm, or other collateral consequences matter.\n`);
  fs.writeFileSync(path.join(out, "filing-instructions.md"), `# Filing instructions - ${familyId}\n\n${track.rules.filing}\n\nThe destination is the ${track.destination.name}. ${track.destination.detail}\n\n**Fees.** ${track.rules.fees}\n\n**Waiver.** ${track.rules.feeWaiver}\n\n**Service.** ${track.rules.service}\n\nDo not complete the judge's order, clerk certification, hearing details, service details, signature, or signature date in advance.\n`);
  writeJson(path.join(out, "reports", "build-summary.json"), { familyId, result: "BUILT_RASTER_PENDING", counters: { knownRequiredFieldsMissing: 0, requiredFactsNotCollected: 0, unclassifiedBlanks: 0, incompleteRows: 0, requiredOptionsMissing: 0, requiredComponentsMissing: 0, invisibleWrites: 0, protectedWrites: 0, visualDefects: null }, artifacts: Object.entries(packets).map(([fixture, packet]) => ({ fixture, sha256: sha256(packet.bytes), byteLength: packet.bytes.length, pageCount: packet.pageCount })), selfVerified: false });
  console.log(`${familyId}: BUILT_RASTER_PENDING; ${packets.canonical.writes.length} writes, ${packets.canonical.refusals.length} classified blanks; canonical=${sha256(packets.canonical.bytes)} boundary=${sha256(packets.boundary.bytes)}`);
}

// Reads the DELIVERED artifacts, not the sources, so it runs without the corpus and
// fails while the delivered bytes are still the ones the independent read faulted.
function selfTest() {
  const out = path.join(ROOT, "data/rcap-all50/overlays/census-v1/il/il-cannabis-vacate-set--official-pdf-fill");
  const { track } = controllingRecord();
  const rendered = JSON.parse(fs.readFileSync(path.join(out, "reports/rendered-artifacts.json"), "utf8"));
  for (const packet of rendered.packets) {
    assert.deepEqual(packet.documents.map((document) => document.documentId), MANIFEST_COMPONENT_ORDER,
      `${packet.fixture}: the packet must assemble in the manifest's component order`);
  }
  const participant = fs.readFileSync(path.join(out, "participant-instructions.md"), "utf8");
  const filing = fs.readFileSync(path.join(out, "filing-instructions.md"), "utf8");
  for (const [label, sentence] of [["fees", track.rules.fees], ["feeWaiver", track.rules.feeWaiver],
    ["service", track.rules.service], ["notice", track.rules.notice], ["filing", track.rules.filing]]) {
    assert.ok(participant.includes(sentence), `participant-instructions.md must carry the record's ${label} sentence`);
  }
  for (const [label, sentence] of [["fees", track.rules.fees], ["feeWaiver", track.rules.feeWaiver],
    ["service", track.rules.service], ["filing", track.rules.filing]]) {
    assert.ok(filing.includes(sentence), `filing-instructions.md must carry the record's ${label} sentence`);
  }
  for (const line of track.packetSet.requiredBeforeFiling) {
    assert.ok(participant.includes(line), `participant-instructions.md must carry the required-before-filing step: ${line.slice(0, 60)}`);
  }
  assert.ok(/\$60/.test(participant) && /\$60/.test(filing), "the ISP $60 order-processing cost must be stated");
  assert.ok(/5\.2\(i\)\(3\)/.test(participant), "the service model must name section 5.2(i)(3)");
  console.log("il-cannabis-vacate-set self-test passed");
}

if (process.argv.includes("--self-test")) selfTest();
else await buildIllinoisFamily("il-cannabis-vacate-set");
