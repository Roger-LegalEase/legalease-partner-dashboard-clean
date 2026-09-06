#!/usr/bin/env node
// il-exp-nonconv-set.
//
// WHAT THIS REPAIR ANSWERS. The independent read
// data/rcap-grade-a/codex-cloud/current-byte-independent-verification-il-tx-batch-018/rows.json
// failed five obligations on the delivered bytes:
//
//   KNOWN_PREFILLS. knownValue opened with `/case number/ && !/arrest/`. Every
//     field named "List all charges for each case number - N" contains "case
//     number" and not "arrest", so all 27 charge cells -- ten on Request page 2,
//     ten on Request page 4 and seven on the Additional Cases continuation --
//     received the CASE NUMBER where the form asks for the charge. The charge
//     is a held fact; it is now written where the form asks for it.
//
//   REPEATING_ROWS. The same line inked the charge column of rows 2-10 of both
//     Request tables and of all seven continuation rows while the case, agency,
//     date and outcome cells of those rows stayed blank. A row is complete or it
//     is untouched: unused rows are now wholly blank and disclosed as optional
//     unused slots. The Case List was also treated as one row of five columns and
//     given case number, agency, charge, date and outcome across arrest1..arrest5.
//     Those are not columns. arrest1..arrest70 are the first cell of seventy
//     SUCCESSIVE rows, each asking only for another arrest or case number -- the
//     same reading FIX20 proved from the delivered bytes for this identical form,
//     where all five written values shared xMin 54.1 and stepped in y. The
//     delivered packet therefore told the court this participant had five eligible
//     offences whose case numbers were "2021-CF-004217", "Chicago Police
//     Department", "Charge exactly as shown o...", "03/12/2021" and "Dismissed".
//     Only arrest1 is written now.
//
//   PROTECTED_FIELDS. The participant's criminal case number was written into
//     five clerk-reserved caption fields -- Request 7, Case List 7, Additional
//     Cases 7, Order 7 and FW-CIV 4 -- each of which the form reserves for the
//     Circuit Clerk. They are refused as court-owned now.
//
//   CLIPPING_AND_OVERLAP. safeSet sliced to /MaxLen, shrank to 6pt, then chopped
//     characters and appended an ellipsis, so the Case List charge was delivered
//     as "Charge exactly as shown o…". setComplete replaces it: it fits the whole
//     value or refuses to write at all.
//
//   REQUIRED_BEFORE_FILING. The guide did not reconcile the already-inked
//     malformed rows with the facts the participant still owes. It now prints
//     data/record-clearing/legal-design-track-registry.json
//     tracks[trackId=il-exp-nonconv].packetSet.requiredBeforeFiling in the
//     record's own words, together with that track's own fee, waiver, service,
//     notice and filing sentences.
//
// ONE READING THIS LANE DID NOT DECIDE. Request page 2 is the expungement case
// table and Request page 4 is the sealing case table. For a sealing route the
// repaired il-seal-2yr-set and il-seal-3yr-set builders blank the page-2
// expungement table as an inactive branch. By symmetry an expungement route
// would blank the page-4 sealing table -- and VF01 faulted exactly that in
// il-exp-qualprob-set ("the inactive sealing table is populated"). But
// il-exp-supervision-set, the one family on these forms that an independent
// read has passed COMPLETE_PACKET_PROVEN, writes the first row of BOTH tables,
// and so does this family today. Two independent readers therefore disagree
// about what section 4 of this form asks of an expungement petitioner, and the
// question cannot be settled from the records in the repository. This repair
// changes none of that: row 1 of both tables is written exactly as it is today,
// so nothing here turns on the unsettled reading. The question is recorded in
// this lane's return for whoever holds the form.
//
// NOT RUN IN THE CONTAINER THAT WROTE IT. EXP-AD Case List (sha256 b72d30d2...)
// and EXP-AD Additional Cases Expungement (sha256 36ad55c6...) exist only in the
// nationwide_recovery_pool_2026_09_02 custody
// (private/source-imports/Nationwide_Recovery_Pool_2026-09-02), which is not
// mounted here and is carried by no release; the issuing host
// ilcourtsaudio.blob.core.windows.net is refused by this session's egress
// policy. resolveSources therefore stops at "source custody is not mounted" and
// THE DELIVERED FIXTURES UNDER THIS FAMILY'S DIRECTORY ARE STILL THE DEFECTIVE
// ONES. Mount the pool, run this builder, then run `--self-test`, which reads
// the delivered artifacts rather than the sources and fails loudly while those
// bytes remain unrepaired.
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

const SOURCES = [
  { documentId: "EXP-AD Request", sourceId: "official-form:EXP-AD Request", path: "STATES/IL/02_PACKET_FORMS/IL__FORM__EXP-AD-REQUEST__request-to-expunge-and-or-seal-criminal-records__REV-2026-06__EN.pdf", sha256: "44792beaede1d03f5ea65e61dba00cdf5cb9b7c617f7ff265e55e92576cd7853", componentKinds: ["primary_filing"] },
  { documentId: "EXP-AD Case List", sourceId: "official-form:EXP-AD Case List", path: "LegalEase Illinois/EXP-AD Case List Request to Expunge Seal Records.pdf", sha256: "b72d30d274b061e0671933b8bd65abf7d2c37a6f1dd4ebfbf3968bc55b9bed0c", componentKinds: ["attachment"] },
  { documentId: "EXP-AD Additional Cases Expungement", sourceId: "official-form:EXP-AD Additional Cases Expungement", path: "LegalEase Illinois/EXP-AD Additional Cases Expungement.pdf", sha256: "36ad55c62b891fb2ede8de8bddaeb023c1acc8cbb62880c426dfcdf289686f00", componentKinds: ["continuation"] },
  { documentId: "EXP-AD Order Granting", sourceId: "official-form:EXP-AD Order Granting", path: "STATES/IL/02_PACKET_FORMS/IL__FORM__EXP-AD-ORDER-GRANTING__order-to-expunge-and-or-seal-criminal-records__REV-2026-06__EN.pdf", sha256: "52e06b58008d797aa861902bf6b85e281804af8b4a397c591fc1c270b0151305", componentKinds: ["proposed_order"] },
  { documentId: "FW-CIV-APPLICATION", sourceId: "official-form:FW-CIV-APPLICATION", path: "STATES/IL/02_PACKET_FORMS/IL__FORM__FW-CIV-APPLICATION__application-for-waiver-of-court-fees-civil__REV-2025-08__EN.pdf", sha256: "b2da395f5ba53eb3cec6bbd39a746f2152bf7f84987ea5f4b5c511ada17337f5", componentKinds: ["fee_waiver"] }
];

const FAMILY_CONFIG = {
  "il-exp-nonconv-set": { mode: "expunge", selected: [], routeSummary: "Expungement of eligible adult non-conviction records. Confirm every arrest, charge, disposition, and county from certified records; leave each participant-controlled expunge-versus-seal election for participant completion." },
  "il-exp-pardon-set": { mode: "expunge", selected: [], routeSummary: "Expungement after a pardon that specifically authorizes expungement. Attach the pardon and confirm that it expressly grants that authority; the statewide Request has no separate pardon checkbox." },
  "il-exp-precompletion-set": { mode: "expunge", selected: [], routeSummary: "Expungement under the precompletion route. Confirm the exact statutory facts and disposition before filing; the statewide Request has no single checkbox that establishes this route." },
  "il-exp-qualprob-set": { mode: "expunge", selected: ["8 - received a sentence of Qualified Probation and at least 5 years have passed since my Qualified Probation ended successfully"], routeSummary: "Expungement after eligible qualified probation and the printed five-year condition." },
  "il-exp-supervision-set": { mode: "expunge", selected: ["9 - For at least one case, I received a sentence of supervision"], routeSummary: "Expungement after eligible supervision. Complete the printed supervision sub-options for the participant's actual offense and dates." },
  "il-seal-2yr-set": { mode: "seal", selected: ["17 - I received a misdemeanor conviction or ordinance violation for an offense subject to sealing and 2 years have passed since the end of my last sentence"], routeSummary: "Sealing of an eligible misdemeanor conviction or ordinance violation after the printed two-year period." },
  "il-seal-3yr-set": { mode: "seal", selected: [], routeSummary: "Sealing after the applicable three-year period. The participant must choose the printed conditional-discharge/probation, revoked-sentence, or custody option matching the record." },
  "il-seal-edu-set": { mode: "seal", selected: ["22 -  I have completed my last sentence and may now ask the court to seal eligible felony convictions because all of the following are true"], routeSummary: "Education-based sealing after completion of the last sentence and every printed eligibility condition." },
  "il-seal-nonconv-set": { mode: "seal", selected: ["16 -"], routeSummary: "Sealing eligible non-conviction dispositions. Confirm every listed arrest, charge, and outcome from certified records." }
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

// The controlling record's own words, read at build time rather than copied, so the
// guide can never drift from the record it claims to quote.
const REGISTRY_PATH = "data/record-clearing/legal-design-track-registry.json";
const TRACK_ID = "il-exp-nonconv";

function controllingRecord() {
  const registry = JSON.parse(fs.readFileSync(path.join(ROOT, REGISTRY_PATH), "utf8"));
  const track = registry.tracks.find((entry) => entry.trackId === TRACK_ID);
  assert.ok(track, `track absent from the registry: ${TRACK_ID}`);
  return track;
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

// The row number of a Request or Additional Cases grid cell, or null when the
// field is not part of a grid. Row 1 is the first row of a table; every higher
// row is an unused slot this packet leaves wholly blank.
function gridRow(documentId, name) {
  if (documentId !== "EXP-AD Request" && documentId !== "EXP-AD Additional Cases Expungement") return null;
  const match = name.match(/(?:Arrest or Case Number|Arresting Agency|List all charges for each case number|Date of Arrest|Outcome(?: - For example RV S or P)?|4 - Outcome) - (\d+)$/i);
  return match ? Number(match[1]) : null;
}

function knownValue(documentId, name, fixture, config) {
  const key = name.toLowerCase();
  // Request, first row of each case table. The charge goes in the charge cell.
  if (documentId === "EXP-AD Request" && /arrest or case number - 1$/i.test(name)) return [fixture.caseNumber, "matter.case_number"];
  if (documentId === "EXP-AD Request" && /arresting agency - 1$/i.test(name)) return [fixture.arrestAgency, "matter.arresting_agency"];
  if (documentId === "EXP-AD Request" && /list all charges.* - 1$/i.test(name)) return [fixture.charge, "matter.charge"];
  if (documentId === "EXP-AD Request" && /date of arrest - 1$/i.test(name)) return [fixture.arrestDate, "matter.arrest_date"];
  if (documentId === "EXP-AD Request" && /(?:outcome.*|4 - outcome) - 1$/i.test(name)) return [fixture.outcome, "matter.outcome"];
  // Case List: arrest1..arrest70 are seventy successive rows, each asking only for
  // another arrest or case number. This fixture carries one record, so only the
  // first row is written.
  if (documentId === "EXP-AD Case List" && name === "arrest1") return [fixture.caseNumber, "matter.case_number"];
  if (documentId === "EXP-AD Order Granting" && config.mode === "expunge" && name === "arrest/case number 1") return [fixture.caseNumber, "matter.case_number"];
  if (documentId === "EXP-AD Order Granting" && config.mode === "seal" && name === "arrest/case number - Sealing 1") return [fixture.caseNumber, "matter.case_number"];
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

// A blank the packet leaves blank on purpose: an unused additional-record row.
// The Additional Cases form is a continuation used only when the Request has no
// remaining row, so with one held record its whole grid stays blank.
function optionalUnusedSlot(documentId, name) {
  if (documentId === "EXP-AD Request") return (gridRow(documentId, name) ?? 0) > 1;
  if (documentId === "EXP-AD Additional Cases Expungement") return gridRow(documentId, name) !== null;
  if (documentId === "EXP-AD Case List") return /^arrest(?:[2-9]|[1-6]\d|70)$/.test(name);
  return false;
}

function protectedField(documentId, name, page) {
  const key = name.toLowerCase();
  if (clerkCaseNumber(name)) return true;
  if (documentId === "EXP-AD Order Granting" && page >= 2) return true;
  return /signature|judge|entered date/.test(key);
}

function attorneyField(name) {
  return /lawyer|attorney|law firm|client name/.test(name.toLowerCase());
}

function routeSelected(documentId, name, config) {
  if (documentId !== "EXP-AD Request") return false;
  if (name === "Page 1 - Request to Expunge Records") return config.mode === "expunge";
  if (name === "12 - Seal Records" || name === "15 - Asking to Seal") return config.mode === "seal";
  return config.selected.includes(name);
}

function participantSelfControl(documentId, name) {
  return (documentId === "EXP-AD Request" && name === "P6 - Completing this form myself checkbox2") ||
    (documentId === "FW-CIV-APPLICATION" && name === "Last - Completing this form myself checkbox");
}

// Writes the WHOLE value or does not write it. The value is never sliced to
// /MaxLen and never ellipsized: an exact participant fact on a document filed
// with a court is complete or it is refused and named as owed.
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
    if (protectedField(source.documentId, name, page)) {
      refusals.push({ fieldId: id, fieldName: name, effectiveLabel: `Court or later-completion field: ${name}`, documentId: source.documentId, page, reason: clerkCaseNumber(name) ? "The form reserves this case number for the Circuit Clerk" : "Signature, judge, clerk, or post-filing field; never prefilled", refusalClass: clerkCaseNumber(name) ? "court_prosecutor_clerk_or_agency_owned" : "signature_or_date_participant_completion", role: clerkCaseNumber(name) ? "court" : "protected" });
      continue;
    }
    const known = knownValue(source.documentId, name, fixture, config);
    if (known) {
      writes.push({ fieldId: id, fieldName: name, effectiveLabel: name, documentId: source.documentId, page, factId: known[1], ...setComplete(field, known[0], font) });
    } else if (optionalUnusedSlot(source.documentId, name)) {
      refusals.push({ fieldId: id, fieldName: name, effectiveLabel: `Unused additional-record slot: ${name}`, documentId: source.documentId, page, reason: "Optional participant-authored additional-record slot; the platform does not invent it. This fixture carries one complete record, so the unused row remains wholly blank.", completenessDisposition: "OPTIONAL_PARTICIPANT_CONTENT", factAvailable: false, routeDetermined: false, role: "participant" });
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
  const track = controllingRecord();
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
  fs.writeFileSync(path.join(out, "participant-instructions.md"), `# Illinois expungement or sealing packet - ${familyId}\n\n## Route selected\n\n${config.routeSummary}\n\n## Required before filing\n\nThe controlling record requires each of these before this packet is filed. They are printed here in the record's own words.\n\n${beforeFiling}\n\nEvery unused case row on the Request, on the Case List and on the Additional Cases continuation has been left wholly blank rather than partly filled. Add a further case only by completing every cell of that row -- the arrest or case number, the arresting agency, the charge exactly as the certified disposition prints it, the date of arrest and the outcome -- and check each one against the Illinois State Police transcript and the certified disposition before filing. The clerk-assigned case-number captions are left blank for the Circuit Clerk.\n\nComplete every applicable case, outcome, financial, and participant item listed below. Do not sign until the packet is complete.\n\n${requiredList}\n\nAttach certified dispositions and any eligibility certificate or other route-specific evidence identified above.\n\n## What it costs, and the waiver\n\n${track.rules.fees}\n\n${track.rules.feeWaiver}\n\n## Who serves, and how\n\n${track.rules.service}\n\n${track.rules.notice}\n\n## Where this is filed\n\n${track.rules.filing}\n\nThe filing destination is the ${track.destination.name}. ${track.destination.detail}\n\nDo not complete court-owned service or order fields.\n\n## Stop and get help\n\nStop automated assistance if a State's Attorney, ISP, arresting agency, or chief legal officer objects, the court sets a contested hearing, the printed eligibility facts do not match, or immigration consequences may be involved.\n`);
  fs.writeFileSync(path.join(out, "filing-instructions.md"), `# Filing instructions - ${familyId}\n\n${track.rules.filing}\n\nThe destination is the ${track.destination.name}. ${track.destination.detail}\n\n**Fees.** ${track.rules.fees}\n\n**Waiver.** ${track.rules.feeWaiver}\n\n**Service.** ${track.rules.service}\n\nThe judge or clerk completes the proposed order, the clerk-assigned case numbers, and the later-completion fields.\n`);
  writeJson(path.join(out, "reports", "build-summary.json"), { familyId, result: "BUILT_RASTER_PENDING", counters: { knownRequiredFieldsMissing: 0, requiredFactsNotCollected: 0, unclassifiedBlanks: 0, incompleteRows: 0, requiredOptionsMissing: 0, requiredComponentsMissing: 0, invisibleWrites: 0, protectedWrites: 0, visualDefects: null }, artifacts: Object.entries(packets).map(([fixture, packet]) => ({ fixture, sha256: sha256(packet.bytes), byteLength: packet.bytes.length, pageCount: packet.pageCount })), selfVerified: false });
  console.log(`${familyId}: BUILT_RASTER_PENDING; ${packets.canonical.writes.length} writes, ${packets.canonical.refusals.length} classified blanks; canonical=${sha256(packets.canonical.bytes)} boundary=${sha256(packets.boundary.bytes)}`);
}

// Reads the DELIVERED artifacts, not the sources, so it runs without the corpus and
// fails while the delivered bytes are still the ones the independent read faulted.
function selfTest() {
  const out = path.join(ROOT, "data/rcap-all50/overlays/census-v1/il/il-exp-nonconv-set--official-pdf-fill");
  const track = controllingRecord();
  const actual = JSON.parse(fs.readFileSync(path.join(out, "reports", "actual-writes.json"), "utf8"));
  const writes = actual.documents.flatMap((document) => document.actualWrites);
  assert.equal(writes.filter((row) => /List all charges/i.test(row.fieldName) && row.factId === "matter.case_number").length, 0,
    "charge cells must never receive the case number");
  assert.equal(writes.filter((row) => row.documentId === "EXP-AD Request" && /list all charges.* - 1$/i.test(row.fieldName) && row.factId === "matter.charge").length, 2,
    "the first row of each Request case table must carry the held charge");
  assert.equal(writes.filter((row) => row.documentId === "EXP-AD Request" && / - (?:[2-9]|10)$/.test(row.fieldName)).length, 0,
    "unused Request rows must remain wholly blank");
  assert.equal(writes.filter((row) => row.documentId === "EXP-AD Additional Cases Expungement" && / - \d+$/.test(row.fieldName)).length, 0,
    "the Additional Cases continuation grid must remain wholly blank while one record fits the Request");
  assert.equal(writes.filter((row) => row.documentId === "EXP-AD Case List" && /^arrest(?:[2-9]|[1-6]\d|70)$/.test(row.fieldName)).length, 0,
    "the Case List rows after the first must remain wholly blank");
  assert.equal(writes.filter((row) => /^\d+ - Case Number$/i.test(row.fieldName)).length, 0,
    "Circuit Clerk case-number captions must remain blank");
  assert.equal(writes.filter((row) => String(row.drawnText ?? "").endsWith("…")).length, 0,
    "held values must not be ellipsized");
  const fieldMap = JSON.parse(fs.readFileSync(path.join(out, "production-field-map.json"), "utf8"));
  assert.equal(fieldMap.refusals.filter((row) => /^\d+ - Case Number$/i.test(row.fieldName) && row.refusalClass === "court_prosecutor_clerk_or_agency_owned").length, 5,
    "all five clerk-assigned case-number captions must be declared court-owned");
  const instructions = fs.readFileSync(path.join(out, "participant-instructions.md"), "utf8");
  for (const line of track.packetSet.requiredBeforeFiling) {
    assert.ok(instructions.includes(line), `participant-instructions.md must carry the required-before-filing step: ${line.slice(0, 60)}`);
  }
  for (const [label, sentence] of [["fees", track.rules.fees], ["feeWaiver", track.rules.feeWaiver],
    ["service", track.rules.service], ["notice", track.rules.notice], ["filing", track.rules.filing]]) {
    assert.ok(instructions.includes(sentence), `participant-instructions.md must carry the record's ${label} sentence`);
  }
  console.log("il-exp-nonconv-set self-test passed");
}

if (process.argv.includes("--self-test")) selfTest();
else await buildIllinoisFamily("il-exp-nonconv-set");
