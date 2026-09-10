#!/usr/bin/env node
import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath, pathToFileURL } from "node:url";
import { makeCorpusEntryResolver } from "./lib/corpus-index-paths.mjs";

const require = createRequire(import.meta.url);
const { PDFDocument, PDFButton, PDFCheckBox, PDFDropdown, PDFName, PDFTextField, StandardFonts } = require("pdf-lib");
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const INDEX_PATH = "data/rcap-all50/local-source-corpus-index.json";
const WORKLIST_PATH = "data/rcap-grade-a/route-obligation-census-candidate/packet-family-build-worklist.json";
const FIXED_DATE = new Date("2026-09-03T00:00:00.000Z");
const sha256 = (bytes) => crypto.createHash("sha256").update(bytes).digest("hex");
const writeJson = (file, value) => fs.writeFileSync(file, `${JSON.stringify(value, null, 2)}\n`);

/*
 * FIX147. THE TWO PUSH-BUTTON CAPTIONS THIS PACKET WAS PRINTING ONTO THE
 * REQUEST THE AOC RECEIVES.
 *
 * WHAT WAS WRONG. AOC-RU-009 ships the issuer's own viewer chrome as two
 * /Ff 65536 push buttons in the bottom margin, named "Print Form 2" and
 * "Clear Form 2" and captioned, in the appearance the issuer drew for them,
 * "Print Form" and "Reset Form". `form.updateFieldAppearances()` keeps that
 * appearance and `form.flatten()` draws it onto the page, so both captions
 * became page CONTENT in the delivered bytes. The builder already refused both
 * fields as viewer UI controls and wrote nothing to them; refusing a field does
 * not stop the flattener drawing the caption the source put on it.
 *
 * WHICH PAGE. This packet is one page. AOC-RU-009 page 1 IS the document the
 * participant signs and mails to the Records Unit with the $40 payment, so
 * there is no cover, checklist or guidance page here to absorb the defect: the
 * captions were on the only page, and it is the one that gets sent.
 *
 * MEASURED, NOT ASSUMED. 600 dpi, PGM single channel, dark = grey < 128 of 255,
 * rendered WITH annotations, rects [191.43, 6.67, 97.48 x 23.00] and
 * [321.09, 6.67, 97.48 x 23.00] in PDF user space. On the ISSUER'S OWN SOURCE,
 * annotations on minus annotations hidden reads 29,901 and 31,544 dark pixels
 * -- the POSITIVE control, proving the render draws the ink being counted. At
 * threshold 160 the same rects read 30,182 and 31,849, and at 200, 30,463 and
 * 32,180; the caption is near-black, so it does not hide under a threshold.
 *
 * The DELIVERED pre-repair bytes read 29,901 and 31,544 with annotations ON and
 * the SAME 29,901 and 31,544 with annotations HIDDEN. That is NOT a negative
 * control. It is the proof the caption had been flattened into page content and
 * would print from any viewer and off any printer.
 *
 * OVER-SUPPRESSION WAS CHECKED RATHER THAN ASSUMED. With annotations hidden the
 * issuer's own page draws 0 dark pixels inside both rectangles at thresholds
 * 128, 160 and 200. The paper under the button is blank, so what is withdrawn
 * is viewer chrome and not one mark of the form.
 *
 * WHY NOT THE SHARED FLAG. FIX143 repaired this class on Connecticut with
 * `detachNestedControlFields` at its `finalizeOfficialForm` call site. This
 * builder does not call finalizeOfficialForm -- it drives pdf-lib directly --
 * so that flag is not reachable from here, and migrating the family onto the
 * shared finalizer would move far more of these bytes than the defect does.
 * The mechanism differs too: Connecticut's controls hang below a nested
 * AcroForm root, while both of these sit DIRECTLY in the AcroForm's /Fields
 * array, where a flat detachment reaches them.
 *
 * Opt-in and local: nothing outside this family is touched and no shared
 * default moves.
 */
const DETACH_SOURCE_FORM_CONTROLS = true;
const EXPECTED_CONTROLS_PER_DOCUMENT = { "AOC-RU-009": 2 };
const EXPECTED_CONTROLS_TOTAL = Object.values(EXPECTED_CONTROLS_PER_DOCUMENT).reduce((sum, n) => sum + n, 0);

/*
 * The nine completeness counters, as this builder is entitled to report them.
 *
 * They used to be published here as eight literal zeros beside one null, which
 * reported a clean measurement that had never been taken: nothing in this file
 * counts an invisible write, a protected write or an unclassified blank. They
 * are the completeness verifier's and an independent lane's to count from the
 * delivered bytes. il-cannabis-vacate-set was corrected the same way.
 */
const NOT_MEASURED_BY_THIS_BUILDER = { knownRequiredFieldsMissing: null, requiredFactsNotCollected: null, unclassifiedBlanks: null, incompleteRows: null, requiredOptionsMissing: null, requiredComponentsMissing: null, invisibleWrites: null, protectedWrites: null, visualDefects: null };

const SOURCES = [
  { documentId: "AOC-RU-009", sourceId: "official-form:AOC-RU-009", path: "STATES/KY/02_PACKET_FORMS/KY__FORM__AOC-009__records-unit__REV-UNKNOWN__EN.pdf", sha256: "469835852a1d7427a2212403aacd3118e93d6adc07791653aab25cb93324f662", componentKinds: ["primary_filing", "online_channel_instructions", "timing_instructions"] }
];

const FAMILY_CONFIG = {
  "ky_expungement_certification-set": { routeSummary: "Request the statewide Kentucky expungement certification from the Administrative Office of the Courts Records Unit by mail or through the official AOC record-request portal." }
};

const FIXTURES = {
  canonical: { first: "Jordan", middle: "Avery", last: "Reyes", full: "Jordan Avery Reyes", alias: "None", dob: "06/14/1988", phone: "502-555-0142", email: "jordan.reyes@example.org", street: "412 West Main Street", cityStateZip: "Louisville, KY 40202" },
  boundary: { first: "Alexandria", middle: "Catherine", last: "Montgomery-Washington", full: "Alexandria Catherine Montgomery-Washington", alias: "Alexandria Catherine Washington-Montgomery", dob: "12/31/1979", phone: "859-555-0199", email: "alexandria.montgomery.washington@example.org", street: "1188 Martin Luther King Jr. Drive, Apartment 1407", cityStateZip: "Lexington, KY 40507" }
};

const FIELD_LABELS = {
  "Text Field 1": "Social Security Number",
  "Text Field 2": "Driver's License Number (DLN)",
  "Text Field 3": "First Name",
  "Text Field 4": "Middle Name",
  "Text Field 5": "Last Name",
  "Text Field 6": "Maiden Name(s) and/or Alias",
  "Text Field 7": "Date of Birth",
  "Text Field 8": "Street Address / P.O. Box",
  "Text Field 9": "City, State, ZIP Code",
  "Text Field 10": "Date request is signed or mailed",
  "Text Field 11": "Company (if applicable)",
  "Text Field 12": "Requestor/Contact Person",
  "Text Field 13": "Requestor Address",
  "Text Field 14": "Requestor City, State, ZIP",
  "Text Field 15": "Telephone Number",
  "Text Field 16": "E-mail Address",
  "Text Field 17": "Additional Information (optional)"
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

function knownValue(documentId, name, fixture, config) {
  const values = {
    "Text Field 3": [fixture.first, "participant.first_name"],
    "Text Field 4": [fixture.middle, "participant.middle_name"],
    "Text Field 5": [fixture.last, "participant.last_name"],
    "Text Field 6": [fixture.alias, "participant.other_names"],
    "Text Field 7": [fixture.dob, "participant.date_of_birth"],
    "Text Field 8": [fixture.street, "participant.street_address"],
    "Text Field 9": [fixture.cityStateZip, "participant.city_state_zip"],
    "Text Field 12": [fixture.full, "participant.full_legal_name"],
    "Text Field 13": [fixture.street, "participant.street_address"],
    "Text Field 14": [fixture.cityStateZip, "participant.city_state_zip"],
    "Text Field 15": [fixture.phone, "participant.phone"],
    "Text Field 16": [fixture.email, "participant.email"]
  };
  return values[name] ?? null;
}

function protectedField(documentId, name, page) {
  return name === "Text Field 10";
}

function attorneyField(name) {
  return false;
}

function routeSelected(documentId, name, config) {
  return false;
}

function participantSelfControl(documentId, name) {
  return false;
}

const optionalField = (name) => name === "Text Field 11" || name === "Text Field 17";
const unavailableRequiredField = (name) => name === "Text Field 1" || name === "Text Field 2";

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
  // The source's own viewer chrome, collected while the form is still walkable
  // and detached below, before any appearance is generated. See
  // DETACH_SOURCE_FORM_CONTROLS.
  const controls = [];
  for (const field of form.getFields()) {
    const name = field.getName();
    const page = pageOf(field, pages);
    const id = `${source.documentId}:${name}`;
    const effectiveLabel = FIELD_LABELS[name] ?? name;
    if (field instanceof PDFButton) {
      /*
       * AOC-RU-009's "Print Form 2" and "Clear Form 2". Declared AND detached:
       * refusing the field was never what stopped the caption printing. See
       * DETACH_SOURCE_FORM_CONTROLS for the measurement.
       */
      controls.push(field);
      refusals.push({ fieldId: id, fieldName: name, effectiveLabel: `${name} viewer UI control`, documentId: source.documentId, page, reason: DETACH_SOURCE_FORM_CONTROLS ? "viewer UI control; never a filing fact. Detached before flatten(), so the delivered page carries no button caption." : "viewer UI control; never a filing fact", role: "viewer", sourceAuthoredInk: !DETACH_SOURCE_FORM_CONTROLS, controlDetachedBeforeFlatten: DETACH_SOURCE_FORM_CONTROLS });
      continue;
    }
    if (field instanceof PDFDropdown) {
      const known = knownValue(source.documentId, name, fixture, config);
      if (known && field.getOptions().includes(known[0])) {
        field.select(known[0]);
        writes.push({ fieldId: id, fieldName: name, effectiveLabel, documentId: source.documentId, page, factId: known[1], drawnText: known[0] });
      } else {
        refusals.push({ fieldId: id, fieldName: name, effectiveLabel: `Select ${name}`, documentId: source.documentId, page, reason: "Supply the filing county before filing", completenessDisposition: "REQUIRED_BEFORE_FILING", requiredBeforeFiling: true, role: "participant" });
      }
      continue;
    }
    if (field instanceof PDFCheckBox) {
      if (routeSelected(source.documentId, name, config) || participantSelfControl(source.documentId, name)) {
        field.check();
        writes.push({ fieldId: id, fieldName: name, effectiveLabel, documentId: source.documentId, page, factId: participantSelfControl(source.documentId, name) ? "participant.self_represented" : "route.selection", isSelectionControl: true, routeDetermined: true });
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
      writes.push({ fieldId: id, fieldName: name, effectiveLabel, documentId: source.documentId, page, factId: known[1], ...fitted });
    } else if (protectedField(source.documentId, name, page)) {
      refusals.push({ fieldId: id, fieldName: name, effectiveLabel, documentId: source.documentId, page, reason: "Date completed by the participant when signing or mailing; never prefilled", refusalClass: "signature_or_date_participant_completion", role: "protected" });
    } else if (attorneyField(name)) {
      refusals.push({ fieldId: id, fieldName: name, effectiveLabel: `Attorney field: ${name}`, documentId: source.documentId, page, reason: "Attorney-only; the fixture is self-represented", role: "attorney" });
    } else if (optionalField(name)) {
      refusals.push({ fieldId: id, fieldName: name, effectiveLabel, documentId: source.documentId, page, reason: "optional participant-authored content the form itself marks optional; supply only if applicable", role: "participant" });
    } else {
      assert.ok(unavailableRequiredField(name), `unmapped Kentucky field: ${name}`);
      refusals.push({ fieldId: id, fieldName: name, effectiveLabel, documentId: source.documentId, page, reason: "The platform does not hold this sensitive identity fact; supply it before filing", completenessDisposition: "REQUIRED_BEFORE_FILING", requiredBeforeFiling: true, factAvailable: false, routeDetermined: false, role: "participant" });
    }
  }
  /*
   * Detach BEFORE updateFieldAppearances and BEFORE flatten, which is the only
   * order that works: flatten() reaches the page through the widget's own /P
   * rather than through /Annots, so a control still listed at that moment is
   * stamped anyway.
   */
  const controlAppearanceRefs = new Set();
  let controlsDetached = 0;
  if (DETACH_SOURCE_FORM_CONTROLS) {
    for (const field of controls) {
      for (const widget of field.acroField.getWidgets()) {
        const ap = widget.dict.get(PDFName.of("AP"));
        if (ap) controlAppearanceRefs.add(String(ap));
        const normal = widget.dict.lookup(PDFName.of("AP"))?.get?.(PDFName.of("N"));
        if (normal) controlAppearanceRefs.add(String(normal));
      }
      form.removeField(field);
      controlsDetached += 1;
    }
  }
  form.updateFieldAppearances(font);
  form.flatten();
  /*
   * Proof in the builder that the detachment reached the page: flatten() draws
   * a widget by referencing its existing appearance stream from the page's own
   * /Resources /XObject. If a detached control's appearance is still referenced
   * there, its caption is on the page and this build must not emit.
   */
  for (const page of document.getPages()) {
    const resources = page.node.lookup(PDFName.of("Resources"));
    const xobjects = resources?.lookup?.(PDFName.of("XObject"));
    for (const [, value] of xobjects?.entries?.() ?? []) {
      assert.ok(!controlAppearanceRefs.has(String(value)),
        `${source.documentId}: a detached viewer control's appearance is still drawn on the page`);
    }
  }
  assert.equal(controlsDetached, DETACH_SOURCE_FORM_CONTROLS ? (EXPECTED_CONTROLS_PER_DOCUMENT[source.documentId] ?? 0) : 0,
    `${source.documentId}: unexpected number of source viewer controls`);
  document.setTitle(`${source.documentId} - ${fixtureName}`);
  document.setAuthor("LegalEase packet factory");
  document.setCreator("LegalEase deterministic official-form builder");
  document.setProducer("pdf-lib 1.17.1");
  document.setCreationDate(FIXED_DATE);
  document.setModificationDate(FIXED_DATE);
  return { document, writes, refusals, controlsDetached };
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
  const controlsDetached = filled.reduce((sum, item) => sum + item.controlsDetached, 0);
  assert.equal(controlsDetached, DETACH_SOURCE_FORM_CONTROLS ? EXPECTED_CONTROLS_TOTAL : 0,
    "every source viewer control must be detached before the packet is assembled");
  return { bytes, pageCount: reopened.getPageCount(), controlsDetached, writes: filled.flatMap((item) => item.writes), refusals: filled.flatMap((item) => item.refusals) };
}

export async function buildIllinoisFamily(familyId) {
  const base = FAMILY_CONFIG[familyId];
  assert.ok(base, `unsupported Illinois family: ${familyId}`);
  const config = { familyId, ...base };
  const outRel = `data/rcap-all50/overlays/census-v1/ky/ky-expungement-certification-set--official-pdf-fill`;
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
  writeJson(path.join(out, "production-field-map.json"), { schemaVersion: "rcap-production-field-map/v2", familyId, implementationStrategy: "official_pdf_fill", routeKeys: family.routes.map((route) => route.routeKey), routeSummary: config.routeSummary, writes: packets.canonical.writes.map(({ drawnText, fontSize, ...row }) => row), refusals: packets.canonical.refusals });
  writeJson(path.join(out, "source-receipt.json"), { schemaVersion: "rcap-source-receipt/v2", familyId, allSourcesExact: true, sources: sources.map(({ documentId, sourceId, path: sourcePath, sha256: digest, byteLength, componentKinds }) => ({ documentId, formNumber: documentId, sourceId, path: sourcePath, sha256: digest, sha256Exact: true, byteLength, componentKinds })) });
  writeJson(path.join(out, "reports", "actual-writes.json"), { schemaVersion: "rcap-actual-writes/v2", familyId, countersNote: "Three counters here name a byte reading this builder does not perform. addedGlyphsReadFromOutputBytes published a literal 0 while the packet adds glyphs at every write; flattenedWidgetAppearancesReadFromOutputBytes republished the WRITE count, which is not the number of appearances flatten() draws; nonWhitespaceGlyphsOutsideMeasuredWriteBoxes published a literal 0 that was never measured. FIX147 made them null rather than inventing a measurement. scripts/rcap-official-forms/rcap-output-glyph-reading.mjs reads these from the output bytes and this builder does not call it.", documents: SOURCES.map((source) => ({ documentId: source.documentId, actualWrites: packets.canonical.writes.filter((row) => row.documentId === source.documentId) })), artifacts: Object.entries(packets).map(([fixture, packet]) => ({ fixture, valuesReportedByFinalizer: packet.writes.length, addedGlyphsReadFromOutputBytes: null, flattenedWidgetAppearancesReadFromOutputBytes: null, nonWhitespaceGlyphsOutsideMeasuredWriteBoxes: null, minimumFontSize: Math.min(...packet.writes.filter((row) => row.fontSize).map((row) => row.fontSize)), refusedFieldsWithInk: packet.refusals.filter((row) => row.sourceAuthoredInk === true).map((row) => row.fieldId) })) });
  writeJson(path.join(out, "reports", "rendered-artifacts.json"), { schemaVersion: "rcap-rendered-artifacts/v2", familyId, rasterState: "BUILT_RASTER_PENDING", packets: Object.entries(packets).map(([fixture, packet]) => ({ fixture, file: `${outRel}/fixtures/${fixture}.pdf`, sha256: sha256(packet.bytes), byteLength: packet.bytes.length, pageCount: packet.pageCount, documents: SOURCES.map((source) => ({ documentId: source.documentId, componentKinds: source.componentKinds })) })) });
  writeJson(path.join(out, "approval-request.json"), { schemaVersion: "rcap-packet-approval-request/v2", familyId, status: "BUILT_RASTER_PENDING", implementationStrategy: "official_pdf_fill", routeKeys: family.routes.map((route) => route.routeKey), components: SOURCES.flatMap((source) => source.componentKinds.map((kind) => ({ kind, documentId: source.documentId }))), artifacts: Object.entries(packets).map(([fixture, packet]) => ({ fixture, file: `${outRel}/fixtures/${fixture}.pdf`, sha256: sha256(packet.bytes), byteLength: packet.bytes.length, pageCount: packet.pageCount })), independentVerificationStatus: "PENDING", commercialRoutesOpened: 0, productionTouched: false });
  const requiredList = packets.canonical.refusals.filter((row) => row.requiredBeforeFiling).map((row) => `- ${row.effectiveLabel}`).join("\n");
  fs.writeFileSync(path.join(out, "participant-instructions.md"), `# Kentucky expungement certification request - ${familyId}\n\n## Route selected\n\n${config.routeSummary}\n\n## Required before sending\n\nComplete the following sensitive identity items yourself. Do not send the request until every required item is complete.\n\n${requiredList}\n\nThe form's company and additional-case-information areas are optional and remain blank unless they apply. Add the date only when you sign or mail the request.\n\n## Send or request online\n\nMail the completed AOC-RU-009 with a $40 check or money order payable to the Kentucky State Treasurer to Administrative Office of the Courts, Records Unit, 1001 Vandalay Drive, Frankfort, Kentucky 40601. The official AOC record-request portal is an alternative channel for the same certification and requires an account and card payment.\n\n## Timing\n\nThere is no waiting period to request the certification. After it is issued, the certification must reach the circuit court clerk with the later expungement filing within 30 days of receipt.\n`);
  fs.writeFileSync(path.join(out, "filing-instructions.md"), `# Filing instructions - ${familyId}\n\nThis packet requests the statewide Kentucky expungement certification; it is not the later circuit-court expungement application. Mail AOC-RU-009 with the $40 check or money order to the AOC Records Unit at 1001 Vandalay Drive, Frankfort, Kentucky 40601, or use the official AOC record-request portal. The committed route record identifies no fee-waiver treatment for this certification. Once received, use the certification with the later circuit-court filing within 30 days.\n`);
  writeJson(path.join(out, "reports", "build-summary.json"), { familyId, result: "BUILT_RASTER_PENDING", counters: NOT_MEASURED_BY_THIS_BUILDER, countersNote: "A builder does not measure its own output. Every one of the nine is null here because this file measures none of them: they are the completeness verifier's and an independent lane's to count from the delivered bytes. Eight of them used to be written as zeros, which reported a clean measurement that had never been taken.", artifacts: Object.entries(packets).map(([fixture, packet]) => ({ fixture, sha256: sha256(packet.bytes), byteLength: packet.bytes.length, pageCount: packet.pageCount })), selfVerified: false });
  console.log(`${familyId}: BUILT_RASTER_PENDING; ${packets.canonical.writes.length} writes, ${packets.canonical.refusals.length} classified blanks; canonical=${sha256(packets.canonical.bytes)} boundary=${sha256(packets.boundary.bytes)}`);
}

if (pathToFileURL(process.argv[1]).href === import.meta.url) await buildIllinoisFamily("ky_expungement_certification-set");
