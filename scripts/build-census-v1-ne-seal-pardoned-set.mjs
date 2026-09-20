#!/usr/bin/env node
/**
 * Route-obligation census v1 - packet family `ne-seal-pardoned-set`.
 *
 *   node scripts/build-census-v1-ne-seal-pardoned-set.mjs
 *
 * Nebraska, sealing the record of a conviction that was later PARDONED, route
 * `obligation:track-pathway:NE:ne-seal-pardoned:pardon-then-seal`, under
 * Neb. Rev. Stat. sections 29-2264, 29-3005 and 29-3523. Two official binaries:
 *
 *   CC 6:12   Rev. 04/2024, Motion to Seal an Adult Criminal Record. The filing.
 *   CC 6:12a  Rev. 06/2024, Completing the Motion to Seal an Adult Criminal
 *             Record. The court's own instructions, carried unchanged: it has
 *             no AcroForm and nothing on it is filled in.
 *
 * THE ELECTION THIS ROUTE ANSWERS
 *
 * Item 2 of CC 6:12 is a select-one:
 *
 *     2. All charges against me in this matter (select one):
 *          [ ] Were dismissed;
 *          [ ] Resulted in an acquittal;
 *          [ ] Resulted in a conviction that was later pardoned; or
 *          [ ] Resulted in a conviction that was later set aside because I was
 *              a victim of sex trafficking.
 *
 * The family IS the pardoned branch. The route determines the answer, so the
 * packet marks it rather than asking the participant, and the other three boxes
 * are declared not-applicable naming the selection that was made. Leaving this
 * one to the participant would be a route-determined election shipped unmade on
 * a filing whose whole identity is that branch.
 *
 * THE CAPTION IS A SCRIPTED FIELD, NOT PRINTED PAGE TEXT
 *
 * "IN THE ______ COURT OF ______ COUNTY, NEBRASKA" is not drawn on the page. It
 * is the default VALUE of two text fields, TYPEOFCOURTRESULTS and
 * fullcountystatementRIGHT, which the form's own script rewrites when the reader
 * uses the drop-downs. Three ways of filling this caption were rendered and
 * looked at before one was chosen:
 *
 *   - selecting only the drop-downs leaves the caption line empty and prints the
 *     selection over the chooser prompt beneath it;
 *   - writing the free-text alternates prints the court type across the tail of
 *     the right-aligned "IN THE ... COURT OF" that is still in the caption field;
 *   - writing the composed caption into the two caption fields, selecting the
 *     drop-downs to match, and clearing the two chooser prompts produces the
 *     caption the form's own script produces.
 *
 * The third is what this build does, and the rendered result was inspected
 * rather than inferred.
 *
 * SOURCE-CARRIED DEFAULTS ARE CLEARED, NOT DELIVERED
 *
 * "(Enter the type of court)" and "(Enter the county name)" are field defaults,
 * not page text. A filed motion carrying an instruction to itself in its caption
 * is a defect that no counter would show, so both are cleared, and both are
 * declared in the field map and in build-findings.json.
 *
 * This build renders no raster. rasterState is BUILT_RASTER_PENDING and this
 * lane issues no verdict on its own packet.
 */
import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import zlib from "node:zlib";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import { makeCorpusEntryResolver } from "./lib/corpus-index-paths.mjs";
import { classifyBlank, rowKeyOf, PASS_COUNTERS, BLANK_DISPOSITIONS, classifyField }
  from "./rcap-packet-completeness/completeness-contract.mjs";

const thisFile = fileURLToPath(import.meta.url);
const ROOT = path.resolve(path.dirname(thisFile), "..");
process.chdir(ROOT);
const require = createRequire(import.meta.url);
const { PDFDocument, PDFName, PDFRawStream, PDFButton, StandardFonts,
  pushGraphicsState, popGraphicsState, translate, drawObject, rotateInPlace } = require("pdf-lib");

const FAMILY_ID = "ne-seal-pardoned-set";
const OUT_REL = "data/rcap-all50/overlays/census-v1/ne/ne-seal-pardoned-set--official-pdf-fill";
const ROUTE_KEY = "obligation:track-pathway:NE:ne-seal-pardoned:pardon-then-seal";
const ROUTE_KEYS = [ROUTE_KEY];
const CORPUS_INDEX = "data/rcap-all50/local-source-corpus-index.json";
const FIXED_DATE = new Date("2026-09-09T00:00:00.000Z");

const MOTION = "CC 6:12";
const INSTRUCTIONS = "CC 6:12a";
const DECLARED_COMPONENT_DOCUMENTS = [MOTION, INSTRUCTIONS];

const SOURCES = Object.freeze({
  [MOTION]: {
    sourceId: "official-form:CC-6-12",
    path: "STATES/NE/02_PACKET_FORMS/NE__FORM__CC-6-12__motion-to-seal-an__REV-2024-04__EN.pdf",
    sha256: "68478452073cdb89dac20843e3d7f5df2ad31b41608ab04deafe940bd6401d28",
    revision: "CC 6:12 Rev. 04/2024", pageCount: 2
  },
  [INSTRUCTIONS]: {
    sourceId: "official-form:CC-6-12a",
    path: "STATES/NE/03_INSTRUCTIONS/NE__INSTRUCTIONS__CC-6-12__completing-the-motion-to__REV-2024-06__EN.pdf",
    sha256: "b76a0931b781a97de38d17d5856996de307e8c3fb9a67fb48e5679bd232da26a",
    revision: "CC 6:12a Rev. 06/2024", pageCount: 2
  }
});

const SIGNATURE_CLASS = "signature_or_date_participant_completion";
const ELECTION_CLASS = "participant_sworn_narrative_or_legal_election";

const sha256 = (bytes) => crypto.createHash("sha256").update(bytes).digest("hex");
const writeJson = (file, value) => fs.writeFileSync(file, `${JSON.stringify(value, null, 2)}\n`);
const readJson = (rel) => JSON.parse(fs.readFileSync(path.join(ROOT, rel), "utf8"));

const FIXTURES = {
  canonical: {
    "participant.full_legal_name": "Jordan Avery Reyes",
    "participant.street_address": "412 Walnut Street, Apartment 7",
    "participant.city_state_zip": "Omaha, NE 68102",
    "participant.phone": "402-555-0142",
    "participant.email": "jordan.reyes@example.org",
    "case.court_type": "DISTRICT",
    "case.county": "DOUGLAS",
    "case.county_titlecase": "Douglas",
    "case.case_number": "CR 19-1234",
    "case.crimes_charged_1": "Count I: Theft by unlawful taking, $500 or less, Neb. Rev. Stat. sec. 28-511",
    "case.crimes_charged_2": "Count II: Criminal mischief, Neb. Rev. Stat. sec. 28-519",
    "case.charge_date": "March 14, 2019"
  },
  boundary: {
    "participant.full_legal_name": "Maria-Alejandra O'Shaughnessy-Whitfield",
    "participant.street_address": "1188 Upper Coastal Crossing Road, Apartment 14B",
    "participant.city_state_zip": "Scottsbluff, NE 69361-4417",
    "participant.phone": "308-555-0199 ext. 4417",
    "participant.email": "maria.alejandra.oshaughnessy.whitfield@example.org",
    "case.court_type": "COUNTY",
    "case.county": "SCOTTS BLUFF",
    "case.county_titlecase": "Scotts Bluff",
    "case.case_number": "CR 08-000123456-01",
    "case.crimes_charged_1": "Count I: Possession of a controlled substance, Neb. Rev. Stat. sec. 28-416(3), a Class IV felony",
    "case.crimes_charged_2": "Count II: Obstructing a peace officer, Neb. Rev. Stat. sec. 28-906, a Class I misdemeanor",
    "case.charge_date": "November 2, 2008"
  }
};

/* ------------------------------------------------------------------ *
 * CC 6:12 - the motion.
 * ------------------------------------------------------------------ */
const ITEM_TWO_CONDITION =
  "item 2 of CC 6:12 is a select-one and this packet is the pardon-then-seal route, so it states \"Resulted in a "
  + "conviction that was later pardoned\". Marking a second box would contradict the statement the packet makes, "
  + "and the court's own instructions warn that the sex-trafficking box is only for a conviction set aside on that ground";

function motionSpec(facts) {
  const w = (name, label, factId, size = 10, extra = {}) =>
    ({ name, label, factId, value: facts[factId], size, ...extra });
  const writes = [
    { name: "TYPEOFCOURTRESULTS", label: "Caption: the court this motion is filed in",
      value: `IN THE ${facts["case.court_type"]} COURT OF`, factId: "case.court_type", size: 12,
      basis: "the caption line is the value of this field, not printed page text, and the form's own script "
        + "composes it from the court chosen in the drop-down beneath it" },
    { name: "fullcountystatementRIGHT", label: "Caption: the county this motion is filed in",
      value: ` ${facts["case.county"]} COUNTY, NEBRASKA`, factId: "case.county", size: 12,
      basis: "the right half of the caption line is the value of this field, composed the same way" },
    { name: "TYPEOFCOURTDROPDOWN", kind: "dropdown", label: "Choose the court",
      value: facts["case.court_type"], factId: "case.court_type",
      basis: "the drop-down the court's instructions tell the reader to use, set to match the caption" },
    { name: "DROPDOWNCOUNTY2", kind: "dropdown", label: "Choose the county",
      value: facts["case.county"], factId: "case.county",
      basis: "the drop-down the court's instructions tell the reader to use, set to match the caption" },
    w("Case No", "Case No.", "case.case_number"),
    w("Adult name", "Defendant's full name in the caption", "participant.full_legal_name"),
    w("Text3", "Crime(s) charged, first rule", "case.crimes_charged_1", 9),
    w("Text4", "Crime(s) charged, second rule", "case.crimes_charged_2", 9),
    w("Text5", "Date of charge(s)", "case.charge_date", 10),
    { name: "Check Box3", kind: "checkbox",
      label: "All charges against me in this matter: Resulted in a conviction that was later pardoned",
      routeDetermined: true,
      basis: "this family is the pardon-then-seal route. Item 2 is a select-one whose answer the route determines, "
        + "so the packet states it" },
    w("printedname", "Printed Name", "participant.full_legal_name"),
    w("streetaddress", "Street Address/P.O. Box", "participant.street_address"),
    w("citystatezip", "City/State/ZIP Code", "participant.city_state_zip"),
    w("telephone number", "Telephone Number", "participant.phone"),
    w("emailaddress", "Email address", "participant.email")
  ];

  const notThisBranch = (name, label) => ({
    name, label, isSelectionControl: true,
    disposition: "NOT_APPLICABLE_ON_THIS_ROUTE",
    routeConditionThatMakesItInapplicable: ITEM_TWO_CONDITION,
    role: "participant", reason: "the packet states a different member of this select-one"
  });

  const blanks = [
    notThisBranch("Check Box1", "All charges against me in this matter: Were dismissed"),
    notThisBranch("Check Box2", "All charges against me in this matter: Resulted in an acquittal"),
    notThisBranch("Check Box4",
      "All charges against me in this matter: Resulted in a conviction that was later set aside because I was a victim of sex trafficking"),
    { name: "datesigned", label: "Date beside the defendant's signature",
      reason: "signature or date field; never prefilled by this build", refusalClass: SIGNATURE_CLASS,
      role: "protected", why: "the date beside a signature is written when the document is signed, and not before" },
    { name: "printed:defendant_signature", printedSlot: true, page: 2, label: "Defendant's signature",
      reason: "signature or date field; never prefilled by this build", refusalClass: SIGNATURE_CLASS,
      role: "protected", why: "the defendant signs the motion themselves" },
    { name: "Check Box7", isSelectionControl: true,
      label: "By checking this box, I am letting the court know that I do not have the ability to receive emails",
      disposition: "NOT_APPLICABLE_ON_THIS_ROUTE",
      routeConditionThatMakesItInapplicable:
        "this box is the alternative for a filer with no email capability, and the packet writes the participant's "
        + "email address in the block above as Nebraska Supreme Court Rule 2-208 requires of a self-represented filer",
      role: "participant", reason: "the packet supplies an email address, so the no-email alternative is not taken" },
    { name: "noemailreason", label: "First line of the reason I cannot receive email",
      disposition: "NOT_APPLICABLE_ON_THIS_ROUTE",
      routeConditionThatMakesItInapplicable:
        "these two rules explain the no-email box above, which this filing does not check because an email address "
        + "is supplied",
      role: "participant", reason: "the no-email alternative is not taken" },
    { name: "noemailreason2", label: "Second line of the reason I cannot receive email",
      disposition: "NOT_APPLICABLE_ON_THIS_ROUTE",
      routeConditionThatMakesItInapplicable:
        "these two rules explain the no-email box above, which this filing does not check because an email address "
        + "is supplied",
      role: "participant", reason: "the no-email alternative is not taken" },
    { name: "enter the type of court", label: "Free-text court type, for a court not on the drop-down list",
      disposition: "NOT_APPLICABLE_ON_THIS_ROUTE",
      routeConditionThatMakesItInapplicable:
        "the form offers this rule as the alternative to the drop-down for a court the list does not carry. This "
        + "motion is filed in a district or county court, both of which are on the list, so the alternative is unused",
      role: "participant", reason: "the drop-down carries this court, so the free-text alternative is unused" },
    { name: "enter the county", label: "Free-text county, for a county not on the drop-down list",
      disposition: "NOT_APPLICABLE_ON_THIS_ROUTE",
      routeConditionThatMakesItInapplicable:
        "the form offers this rule as the alternative to the drop-down for a county the list does not carry. Every "
        + "Nebraska county is on the list, so the alternative is unused",
      role: "participant", reason: "the drop-down carries every Nebraska county, so the free-text alternative is unused" }
  ];

  /* Field defaults the SOURCE carries, cleared so the filed motion does not
   * print an instruction to itself in its own caption. */
  const clearedSourceDefaults = [
    { name: "enter the type of court",
      why: "the field's default value is the chooser prompt \"(Enter the type of court)\". Left in place it prints "
        + "on the filed caption beside the court this packet states" },
    { name: "enter the county",
      why: "the field's default value is the chooser prompt \"(Enter the county name)\". Left in place it prints on "
        + "the filed caption beside the county this packet states" }
  ];

  return { documentId: MOTION, writes, blanks, clearedSourceDefaults };
}

function instructionsSpec() {
  return { documentId: INSTRUCTIONS, writes: [], blanks: [], clearedSourceDefaults: [] };
}

/* ---- source binding ------------------------------------------------------ */
function resolveSources() {
  const index = readJson(CORPUS_INDEX);
  const resolver = makeCorpusEntryResolver(index, { repoRoot: ROOT, masterLibraryRoot: process.env.MASTER_LIBRARY_SOURCE_DIR });
  const resolved = {};
  const failures = [];
  for (const [key, want] of Object.entries(SOURCES)) {
    const entry = (index.entries ?? []).find((row) => row.path === want.path);
    if (!entry) { failures.push({ sourceIdentity: want.sourceId, why: `no committed index entry at ${want.path}` }); continue; }
    if (entry.sha256 !== want.sha256) {
      failures.push({ sourceIdentity: want.sourceId, why: `the committed index pins ${entry.sha256}; this build binds ${want.sha256}` });
      continue;
    }
    const absolute = resolver.resolve(entry);
    if (!absolute || !fs.existsSync(absolute)) {
      failures.push({ sourceIdentity: want.sourceId, why: `the custody holding ${want.path} is not mounted here` });
      continue;
    }
    const bytes = fs.readFileSync(absolute);
    const digest = sha256(bytes);
    if (digest !== want.sha256) {
      failures.push({ sourceIdentity: want.sourceId, why: `SHA-256 drift: the corpus binary hashes ${digest}` });
      continue;
    }
    resolved[key] = {
      ...want, bytes, byteLength: bytes.length, custody: entry.custody,
      indexFormNumber: entry.formNumber, indexPageCount: entry.pageCount, indexAcroFieldCount: entry.acroFieldCount
    };
  }
  return { resolved, failures };
}

const inflate = (buf) => { try { return zlib.inflateSync(buf); } catch { return buf; } };

function contentStreamsOfPage(pdf, page) {
  const contents = page.node.Contents();
  const list = contents && contents.constructor.name === "PDFArray"
    ? contents.asArray().map((ref) => pdf.context.lookup(ref))
    : contents ? [contents] : [];
  return list.map((stream) => inflate(Buffer.from(stream.getContents())).toString("latin1"));
}

async function pageTexts(pdf) {
  const out = [];
  for (const page of pdf.getPages()) {
    const joined = contentStreamsOfPage(pdf, page).join("\n");
    let text = "";
    for (const token of joined.match(/\((?:[^()\\]|\\.)*\)|<[0-9A-Fa-f\s]{2,}>/g) ?? []) {
      text += token.startsWith("(")
        ? token.slice(1, -1).replace(/\\([()\\])/g, "$1")
        : Buffer.from(token.slice(1, -1).replace(/\s+/g, ""), "hex").toString("latin1");
    }
    out.push(text);
  }
  return out;
}

function normalizeRect(rect) {
  const x0 = Math.min(rect.x, rect.x + rect.width);
  const y0 = Math.min(rect.y, rect.y + rect.height);
  return {
    x: Number(x0.toFixed(3)), y: Number(y0.toFixed(3)),
    width: Number(Math.abs(rect.width).toFixed(3)), height: Number(Math.abs(rect.height).toFixed(3)),
    rawY: Number(rect.y.toFixed(3)), rawX: Number(rect.x.toFixed(3)),
    malformedInSource: rect.width < 0 || rect.height < 0
  };
}

function widgetPageIndex(pdf, widget) {
  const pages = pdf.getPages();
  for (let i = 0; i < pages.length; i += 1) {
    const annots = pages[i].node.Annots();
    if (!annots) continue;
    for (const ref of annots.asArray()) {
      if (pdf.context.lookup(ref) === widget.dict) return i;
    }
  }
  return -1;
}

/*
 * A STRING IN THE BYTES IS NOT A VALUE ON THE PAGE.
 *
 * A value written at a size that does not fit its widget is clipped by the
 * appearance's own clip path, and a proof that reads the string back out of the
 * stream sees the whole string while the page shows two thirds of it. Nebraska's
 * boundary fixture found this: a charge line ended "a Class IV felo" on the
 * paper and "a Class IV felony" in the bytes.
 *
 * So a size is FITTED before the value is set, measured with the same standard
 * Helvetica pdf-lib embeds when it regenerates the appearance, and the proof
 * measures every drawn run against its own box afterwards.
 */
const USABLE_PADDING_PT = 3;
const LINE_HEIGHT_FACTOR = 1.16;
const MIN_READABLE_PT = 5.5;

function fitValue(font, text, rect, requested, multiline) {
  const width = Math.max(1, rect.width - USABLE_PADDING_PT);
  const height = Math.max(1, rect.height - 2);
  let size = requested;
  const linesAt = (pt) => {
    if (!multiline) return [text];
    const lines = [];
    for (const paragraph of String(text).split("\n")) {
      let current = "";
      for (const word of paragraph.split(/\s+/)) {
        const next = current ? `${current} ${word}` : word;
        if (font.widthOfTextAtSize(next, pt) <= width || current === "") current = next;
        else { lines.push(current); current = word; }
      }
      lines.push(current);
    }
    return lines;
  };
  while (size > MIN_READABLE_PT) {
    const lines = linesAt(size);
    const widest = Math.max(...lines.map((line) => font.widthOfTextAtSize(line, size)));
    if (widest <= width && lines.length * size * LINE_HEIGHT_FACTOR <= height) break;
    size -= 0.25;
  }
  const lines = linesAt(size);
  const widest = Math.max(...lines.map((line) => font.widthOfTextAtSize(line, size)));
  return {
    size: Number(size.toFixed(2)),
    fits: widest <= width && lines.length * size * LINE_HEIGHT_FACTOR <= height,
    lines: lines.length, widestLinePt: Number(widest.toFixed(3)), usableWidthPt: Number(width.toFixed(3))
  };
}

/*
 * FLATTEN WITHOUT DELETING ANYTHING.
 *
 * pdf-lib's own form.flatten() ends each field with removeField(), which calls
 * context.delete() on the field's objects. The writer then emits an xref table
 * with entries for object numbers that no longer exist, and any reference left
 * pointing at one of them is dangling: copyPages reserves a slot for it and
 * writes nothing there. Poppler reported "Invalid XRef entry 93" on the first
 * Maryland artifact and had to reconstruct the table before it could draw a
 * page - on a document a court is meant to accept.
 *
 * This does the same drawing pdf-lib does, operator for operator, and then
 * DETACHES rather than deletes: the widget comes off the page's /Annots, the
 * field comes off the AcroForm's /Fields, and the AcroForm comes off the
 * catalog. Nothing is removed from the object table, so nothing can dangle, and
 * the orphans are unreachable from any page - so copyPages never carries them
 * into the assembled artifact at all.
 */
function detachAnnotation(pdf, page, dict) {
  const annots = page.node.Annots();
  if (!annots) return;
  const kept = annots.asArray().filter((ref) => pdf.context.lookup(ref) !== dict);
  if (kept.length !== annots.size()) page.node.set(PDFName.of("Annots"), pdf.context.obj(kept));
}

function flattenWithoutDeleting(pdf, form) {
  form.updateFieldAppearances();
  const fields = form.getFields();
  for (const field of fields) {
    for (const widget of field.acroField.getWidgets()) {
      const page = form.findWidgetPage(widget);
      const appearanceRef = form.findWidgetAppearanceRef(field, widget);
      const xObjectKey = page.node.newXObject("FlatWidget", appearanceRef);
      const rectangle = widget.getRectangle();
      const operators = [
        pushGraphicsState(),
        translate(rectangle.x, rectangle.y),
        ...rotateInPlace({ ...rectangle, rotation: 0 }),
        drawObject(xObjectKey),
        popGraphicsState()
      ].filter(Boolean);
      page.pushOperators(...operators);
      detachAnnotation(pdf, page, widget.dict);
    }
    form.acroForm.removeField(field.acroField);
  }
  pdf.catalog.delete(PDFName.of("AcroForm"));
}

async function fillDocument(sourceBytes, spec) {
  const pdf = await PDFDocument.load(sourceBytes);
  const form = pdf.getForm();
  const measuringFont = await (await PDFDocument.create()).embedFont(StandardFonts.Helvetica);
  const unfittable = [];
  const drawn = [];
  const geometry = new Map();
  /* The source's own "Off" appearance for a checkbox, captured before anything
   * is marked, so the byte proof can compare the flattened appearance against
   * it instead of assuming a mark is always a glyph. */
  const offAppearanceOf = (widget) => {
    try {
      const ap = pdf.context.lookup(widget.dict.get(PDFName.of("AP")));
      const normal = ap && pdf.context.lookup(ap.get(PDFName.of("N")));
      if (!normal || typeof normal.get !== "function") return null;
      const off = pdf.context.lookup(normal.get(PDFName.of("Off")));
      if (!(off instanceof PDFRawStream)) return null;
      return inflate(Buffer.from(off.contents)).toString("latin1");
    } catch { return null; }
  };
  /*
   * ONE FIELD, SEVERAL WIDGETS.
   *
   * A caption field repeated on every page of a form is ONE AcroForm field with
   * one widget per page, and setting it once puts ink on all of them. A proof
   * that recorded only the first widget counted the ink on the others as
   * unexplained marks and would have failed a correctly filled form for a defect
   * it did not have. Every widget is recorded, and every one is proved.
   */
  const record = (name) => {
    const field = form.getField(name);
    const widgets = field.acroField.getWidgets();
    const placements = widgets.map((widget) => {
      const rect = normalizeRect(widget.getRectangle());
      const page = widgetPageIndex(pdf, widget) + 1;
      assert.ok(page > 0, `a widget of ${name} is on no page of ${spec.documentId}`);
      return { rect, page };
    });
    assert.ok(placements.length > 0, `${spec.documentId}:${name} has no widget`);
    geometry.set(name, placements);
    return { field, widgets, placements };
  };
  const attach = (row, placements) => {
    row.rect = placements[0].rect;
    row.page = placements[0].page;
    row.widgetCount = placements.length;
    row.placements = placements.map((pl) => ({ page: pl.page, rect: pl.rect }));
  };
  for (const row of spec.writes) {
    const { field, widgets, placements } = record(row.name);
    attach(row, placements);
    if (row.kind === "checkbox") {
      const offs = widgets.map((widget) => offAppearanceOf(widget));
      field.check();
      placements.forEach((pl, i) => drawn.push({ ...row, rect: pl.rect, page: pl.page, widgetIndex: i, text: "✓", offAppearance: offs[i] }));
      continue;
    }
    const value = String(row.value ?? "");
    assert.ok(value.length > 0, `no fixture value for ${spec.documentId}:${row.name}`);
    if (row.kind === "dropdown") {
      field.select(value);
      placements.forEach((pl, i) => drawn.push({ ...row, rect: pl.rect, page: pl.page, widgetIndex: i, text: value }));
      continue;
    }
    if (row.multiline) field.enableMultiline();
    const narrowest = placements.reduce((a, b) => (a.rect.width <= b.rect.width ? a : b)).rect;
    const fit = fitValue(measuringFont, value, narrowest, row.size ?? 9, row.multiline === true);
    if (!fit.fits) unfittable.push({ field: `${spec.documentId}:${row.name}`, value, fit, rect: narrowest });
    field.setText(value);
    field.setFontSize(fit.size);
    row.fittedFontSize = fit.size;
    placements.forEach((pl, i) => drawn.push({ ...row, rect: pl.rect, page: pl.page, widgetIndex: i, text: value, fontSize: fit.size, fit }));
  }
  assert.equal(unfittable.length, 0,
    `${unfittable.length} value(s) do not fit their own widget even at ${MIN_READABLE_PT}pt: ${JSON.stringify(unfittable).slice(0, 1200)}`);
  for (const row of spec.blanks) {
    if (row.printedSlot) continue;
    const { placements } = record(row.name);
    attach(row, placements);
  }
  /*
   * Values the SOURCE carries, cleared rather than delivered.
   *
   * A chooser prompt like "(Enter the county name)" is a field default, not
   * printed page text, and a packet that leaves it in place delivers a filed
   * document with an instruction to itself printed in the caption. Every one
   * cleared here is declared in the field map and in build-findings.json, so
   * nothing is removed from a participant's document silently.
   */
  const cleared = [];
  for (const row of spec.clearedSourceDefaults ?? []) {
    const { field, placements } = record(row.name);
    const before = typeof field.getText === "function" ? field.getText() : null;
    field.setText("");
    cleared.push({ ...row, rect: placements[0].rect, page: placements[0].page, sourceCarriedValue: before ?? null });
  }
  /*
   * VIEWER CONTROLS ARE NOT FILING CONTENT.
   *
   * "Reset", "Clear Form", "Lock & Save Form" and "Top of Page" are push buttons
   * a reader clicks on screen. Flattening draws their captions onto the page, so
   * a packet that flattens without removing them delivers a filed document with
   * a picture of a Reset button printed on it - ten glyphs of ink nobody asked
   * for, on two Maryland forms, which is how this was found. Every push button
   * is removed before flattening and every one is recorded.
   */
  const viewerControlsRemoved = [];
  for (const field of form.getFields()) {
    if (!(field instanceof PDFButton)) continue;
    const name = field.getName();
    const widgets = field.acroField.getWidgets();
    const pages = widgets.map((widget) => widgetPageIndex(pdf, widget) + 1);
    /*
     * Detached, not deleted.
     *
     * pdf-lib's form.removeField() calls context.delete() on the field's own
     * objects, and the writer then emits an xref table with entries for object
     * numbers that no longer exist: poppler reported "Invalid XRef entry 93" on
     * the first Maryland artifact built that way and had to reconstruct the
     * table. The widget is taken off the page's /Annots and the field off the
     * AcroForm's /Fields instead. Nothing is deleted, the xref stays whole, and
     * the orphaned objects are simply not reachable from any page - so
     * copyPages never carries them into the assembled artifact.
     */
    for (const page of pdf.getPages()) for (const widget of widgets) detachAnnotation(pdf, page, widget.dict);
    form.acroForm.removeField(field.acroField);
    viewerControlsRemoved.push({ name, pages, kind: "push_button", detachedNotDeleted: true });
  }
  flattenWithoutDeleting(pdf, form);
  return { pdf, drawn, cleared, viewerControlsRemoved, geometry };
}

const PLACEMENT = /q\s*\n1 0 0 1 ([\d.-]+) ([\d.-]+) cm\s*\n(?:1 0 0 1 0 0 cm\s*\n)*\/(FlatWidget-\d+) Do\s*\nQ/g;
const DIRECT_SHOW = /1 0 0 1 (-?[\d.]+) (-?[\d.]+) Tm\s*\n<([0-9A-Fa-f]*)> Tj/g;

function decodeToken(token) {
  if (token.startsWith("(")) return token.slice(1, -1).replace(/\\([()\\])/g, "$1");
  return Buffer.from(token.slice(1, -1).replace(/\s+/g, ""), "hex").toString("latin1");
}

function runsOfAppearance(stream) {
  const runs = [];
  let font = null;
  let size = null;
  const token = "(\\((?:[^()\\\\]|\\\\.)*\\)|<[0-9A-Fa-f\\s]*>)";
  const re = new RegExp(
    `\\/(\\S+)\\s+([\\d.]+)\\s+Tf|([\\d.-]+)\\s+([\\d.-]+)\\s+Td|1 0 0 1 ([\\d.-]+)\\s+([\\d.-]+)\\s+Tm|${token}\\s*Tj`,
    "g"
  );
  let x = 0;
  let y = 0;
  let m;
  while ((m = re.exec(stream)) !== null) {
    if (m[1] !== undefined) { font = m[1]; size = Number(m[2]); continue; }
    if (m[3] !== undefined) { x = Number(m[3]); y = Number(m[4]); continue; }
    if (m[5] !== undefined) { x = Number(m[5]); y = Number(m[6]); continue; }
    if (m[7] !== undefined) runs.push({ font, size, x, y, text: decodeToken(m[7]) });
  }
  return runs;
}

/*
 * A TICK IS NOT ALWAYS TEXT.
 *
 * Missouri's FI-05 draws a marked box as a ZapfDingbats glyph; Nebraska's
 * CC 6:12 draws one as two stroked line segments, and Maryland's CC-DC-CR-072B
 * as its own path. A proof that looked only for show-text operators read the
 * second kind as an unmarked box, which is the worst direction for a route
 * election to be wrong in. So a marked box is proved three ways, and the
 * strongest available one decides: the flattened appearance must differ from
 * the source's own "Off" appearance for that same widget, and it must carry
 * ink - a show-text run, or more path moveto operators than clip paths.
 */
function markEvidence(placements, row) {
  const here = placements.filter((pl) =>
    Math.abs(pl.ox - row.rect.rawX) < 0.51 && Math.abs(pl.oy - row.rect.rawY) < 0.51);
  if (here.length === 0) return { marked: false, why: "no flattened appearance is placed at this widget's own /Rect", claimedInk: [] };
  const stream = here[0].stream;
  const runs = runsOfAppearance(stream).filter((r) => r.text.trim() !== "");
  const moveTos = (stream.match(/(?:^|[\s\n])-?[\d.]+\s+-?[\d.]+\s+m(?=[\s\n])/g) ?? []).length;
  const clips = (stream.match(/W\s*\n?\s*n/g) ?? []).length;
  const vectorMarkDrawn = moveTos > clips;
  const differsFromOff = typeof row.offAppearance === "string" ? stream !== row.offAppearance : null;
  const marked = differsFromOff === false ? false : (runs.length > 0 || vectorMarkDrawn);
  return {
    marked, differsFromOff, vectorMarkDrawn, moveToOperators: moveTos, clipPaths: clips,
    markKind: runs.length > 0 ? "show_text_glyph" : vectorMarkDrawn ? "stroked_vector_mark" : "none",
    font: runs[0]?.font ?? null,
    drawnText: runs.map((r) => r.text).join("").trim() || null,
    why: marked ? null
      : differsFromOff === false
        ? "the flattened appearance is byte-identical to the source's own Off appearance for this widget"
        : "the flattened appearance carries neither a show-text run nor path ink beyond its clip",
    claimedInk: []
  };
}

async function proveWrites(assembledBytes, sourceStreamsByPage, drawnByPage, fixtureName) {
  const pdf = await PDFDocument.load(assembledBytes, { updateMetadata: false });
  const measuringFont = await (await PDFDocument.create()).embedFont(StandardFonts.Helvetica);
  const pages = pdf.getPages();
  assert.equal(pages.length, sourceStreamsByPage.length, "the assembled artifact must carry one page per source page");
  const proofs = [];
  const unproved = [];
  let addedGlyphs = 0;
  let vectorMarks = 0;
  let outsideBoxes = 0;
  for (let p = 0; p < pages.length; p += 1) {
    const page = pages[p];
    const original = new Set(sourceStreamsByPage[p]);
    const added = contentStreamsOfPage(pdf, page).filter((s) => !original.has(s));
    const resources = page.node.get(PDFName.of("Resources"));
    const xObjectDict = resources ? pdf.context.lookup(resources).get(PDFName.of("XObject")) : null;
    const xObjects = new Map();
    if (xObjectDict) {
      for (const [name, ref] of pdf.context.lookup(xObjectDict).entries()) {
        const object = pdf.context.lookup(ref);
        if (!(object instanceof PDFRawStream)) continue;
        xObjects.set(name.asString().replace(/^\//, ""), inflate(Buffer.from(object.contents)).toString("latin1"));
      }
    }
    const placementsOnPage = [];
    const inkOnPage = [];
    for (const stream of added) {
      PLACEMENT.lastIndex = 0;
      let m;
      while ((m = PLACEMENT.exec(stream)) !== null) {
        const [ox, oy, name] = [Number(m[1]), Number(m[2]), m[3]];
        const appearance = xObjects.get(name);
        if (appearance === undefined) continue;
        placementsOnPage.push({ ox, oy, name, stream: appearance });
        for (const run of runsOfAppearance(appearance)) {
          if (run.text.trim() === "") continue;
          inkOnPage.push({ ...run, pageX: ox + run.x, pageY: oy + run.y, placementX: ox, placementY: oy, appearance: name });
        }
      }
      DIRECT_SHOW.lastIndex = 0;
      while ((m = DIRECT_SHOW.exec(stream)) !== null) {
        const text = Buffer.from(m[3], "hex").toString("latin1");
        if (text.trim() === "") continue;
        inkOnPage.push({ font: null, size: null, pageX: Number(m[1]), pageY: Number(m[2]), placementX: null, placementY: null, text, appearance: null });
      }
    }
    for (const ink of inkOnPage) addedGlyphs += ink.text.replace(/\s/g, "").length;
    const claimed = new Set();
    for (const row of (drawnByPage.get(p + 1) ?? [])) {
      if (row.kind === "checkbox") {
        const evidence = markEvidence(placementsOnPage, row);
        if (!evidence.marked) {
          unproved.push({ field: `${row.document}:${row.name}`, page: p + 1, expected: "a marked checkbox", why: evidence.why });
          continue;
        }
        if (evidence.vectorMarkDrawn) vectorMarks += 1;
        for (const ink of inkOnPage) {
          if (ink.placementX !== null
            && Math.abs(ink.placementX - row.rect.rawX) < 0.51 && Math.abs(ink.placementY - row.rect.rawY) < 0.51) claimed.add(ink);
        }
        proofs.push({
          field: `${row.document}:${row.name}`, fieldName: row.name, effectiveLabel: row.label,
          documentId: row.document, page: p + 1, factId: row.factId ?? null,
          expected: "a marked checkbox", drawnText: evidence.drawnText, markKind: evidence.markKind,
          differsFromTheSourceOffAppearance: evidence.differsFromOff,
          moveToOperators: evidence.moveToOperators, clipPaths: evidence.clipPaths,
          drawnAt: [{ x: row.rect.x, y: row.rect.y, fontSize: null, font: evidence.font }],
          declaredRect: row.rect,
          visibleInArtifactBytes: true, everyWidgetVisibleInArtifactBytes: true, insideDeclaredRect: true
        });
        continue;
      }
      const mine = inkOnPage.filter((ink) => ink.placementX !== null
        && Math.abs(ink.placementX - row.rect.rawX) < 0.51 && Math.abs(ink.placementY - row.rect.rawY) < 0.51);
      if (mine.length === 0) { unproved.push({ field: `${row.document}:${row.name}`, page: p + 1, expected: row.text }); continue; }
      for (const ink of mine) claimed.add(ink);
      const readBack = mine.map((ink) => ink.text).join(" ").replace(/\s+/g, " ").trim();
      const expected = String(row.text).replace(/\s+/g, " ").trim();
      if (readBack !== expected) {
        unproved.push({ field: `${row.document}:${row.name}`, page: p + 1, expected, readBack });
        continue;
      }
      let inside = true;
      const overruns = [];
      for (const ink of mine) {
        const top = ink.pageY + (ink.size ?? 0);
        const drawnWidth = ink.size ? measuringFont.widthOfTextAtSize(ink.text, ink.size) : 0;
        const right = ink.pageX + drawnWidth;
        if (right > row.rect.x + row.rect.width + 1) {
          inside = false;
          overruns.push({ text: ink.text, drawnWidthPt: Number(drawnWidth.toFixed(3)), rightEdgePt: Number(right.toFixed(3)), boxRightEdgePt: Number((row.rect.x + row.rect.width).toFixed(3)) });
        }
        if (ink.pageX < row.rect.x - 1 || ink.pageY < row.rect.y - 3 || top > row.rect.y + row.rect.height + 3) inside = false;
      }
      if (!inside) outsideBoxes += readBack.replace(/\s/g, "").length;
      proofs.push({
        field: `${row.document}:${row.name}`, fieldName: row.name, effectiveLabel: row.label,
        documentId: row.document, page: p + 1, factId: row.factId ?? null,
        expected, drawnText: readBack,
        drawnAt: mine.map((ink) => ({ x: Number(ink.pageX.toFixed(3)), y: Number(ink.pageY.toFixed(3)), fontSize: ink.size, font: ink.font,
          drawnWidthPt: ink.size ? Number(measuringFont.widthOfTextAtSize(ink.text, ink.size).toFixed(3)) : null })),
        runsWiderThanTheirOwnBox: overruns,
        declaredRect: row.rect,
        visibleInArtifactBytes: true, everyWidgetVisibleInArtifactBytes: true, insideDeclaredRect: inside
      });
    }
    for (const ink of inkOnPage) {
      if (claimed.has(ink)) continue;
      outsideBoxes += ink.text.replace(/\s/g, "").length;
    }
  }
  assert.equal(unproved.length, 0,
    `${unproved.length} declared write(s) are not readable in the ${fixtureName} output bytes: ${JSON.stringify(unproved).slice(0, 2000)}`);
  return { proofs, addedGlyphs, vectorMarks, outsideBoxes };
}

function builderCounters(map, artifacts, instructions) {
  const counters = Object.fromEntries(PASS_COUNTERS.map((c) => [c, 0]));
  const findings = [];
  const note = (counter, detail) => { counters[counter] += 1; findings.push({ counter, ...detail }); };
  const norm = (x) => String(x ?? "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
  const writes = map.writes.map((w) => ({ ...w, name: w.fieldName, label: w.effectiveLabel, document: w.documentId, isSelectionControl: false }));
  const blanks = map.refusals.map((r) => ({ ...r, name: r.fieldName, label: r.effectiveLabel, document: r.documentId, isSelectionControl: r.isSelectionControl === true }));

  const availableFacts = new Set(writes.map((w) => w.factId).filter(Boolean));
  const writtenInDocument = new Map();
  for (const w of writes) {
    const doc = String(w.document ?? "");
    if (!writtenInDocument.has(doc)) writtenInDocument.set(doc, new Set());
    for (const key of [norm(w.label), norm(w.name)]) if (key.length >= 4) writtenInDocument.get(doc).add(key);
  }
  for (const w of writes) {
    if (classifyField(w.label, false).requirement === "PROTECTED") note("protectedWrites", { field: w.fieldId, label: w.label });
  }
  const ledger = [];
  for (const blank of blanks) {
    const here = writtenInDocument.get(String(blank.document ?? "")) ?? new Set();
    const declared = {
      sourcePresentation: null,
      disposition: blank.completenessDisposition ?? null,
      ...(Object.hasOwn(blank, "requiredBeforeFiling") ? { requiredBeforeFiling: blank.requiredBeforeFiling === true } : {}),
      routeDetermined: blank.routeDetermined === true,
      factAvailable: (blank.factId ? availableFacts.has(String(blank.factId)) : false)
        || here.has(norm(blank.label)) || here.has(norm(blank.name)),
      routeConditionThatMakesItInapplicable: blank.routeConditionThatMakesItInapplicable ?? null,
      determinedByTheCaseNotTheRoute: false, whyTheRouteCannotDetermineIt: null,
      factId: blank.factId ?? null, identity: blank.identity ?? blank.field ?? blank.fieldId
    };
    const verdict = classifyBlank(blank, blank.reason, blank.refusalClass ?? null, declared);
    ledger.push({ ...blank, ...verdict });
    if (BLANK_DISPOSITIONS[verdict.disposition].allowed) continue;
    if (verdict.disposition === "KNOWN_FACT_NOT_WRITTEN") note("knownRequiredFieldsMissing", { field: blank.fieldId, label: blank.label, basis: verdict.basis });
    else if (verdict.disposition === "ROUTE_OPTION_NOT_SELECTED") note("requiredOptionsMissing", { field: blank.fieldId, label: blank.label, basis: verdict.basis });
    else note("unclassifiedBlanks", { field: blank.fieldId, label: blank.label, basis: verdict.basis });
  }
  for (const b of ledger.filter((x) => x.disposition === "REQUIRED_BEFORE_FILING")) {
    const needles = [b.label, b.fieldId, b.identity].map((x) => String(x ?? "").trim()).filter((x) => x.length >= 3);
    if (needles.some((n) => instructions.toLowerCase().includes(n.toLowerCase().slice(0, 60)))) continue;
    note("requiredFactsNotCollected", { field: b.fieldId, label: b.label });
  }
  const rows = new Map();
  for (const f of [...writes.map((w) => ({ ...w, written: true })), ...blanks.map((b) => ({ ...b, written: false }))]) {
    const key = rowKeyOf(f);
    if (!key) continue;
    if (!rows.has(key)) rows.set(key, []);
    rows.get(key).push(f);
  }
  for (const [key, cells] of rows) {
    if (!cells.some((c) => c.written)) continue;
    const missing = cells.filter((c) => !c.written && classifyField(c.label, c.isSelectionControl === true).requirement === "REQUIRED_KNOWN");
    if (missing.length > 0) note("incompleteRows", { row: key, missingCells: missing.map((m) => m.label) });
  }
  for (const a of artifacts) {
    const visible = (a.addedGlyphsReadFromOutputBytes ?? 0) + (a.flattenedWidgetAppearancesReadFromOutputBytes ?? 0);
    if ((a.valuesReportedByFinalizer ?? 0) > 0 && visible === 0) note("invisibleWrites", { fixture: a.fixture });
    if ((a.nonWhitespaceGlyphsOutsideMeasuredWriteBoxes ?? 0) > 0) note("visualDefects", { fixture: a.fixture, glyphsOutsideMeasuredBoxes: a.nonWhitespaceGlyphsOutsideMeasuredWriteBoxes });
    for (const r of a.refusedFieldsWithInk ?? []) note("protectedWrites", { fixture: a.fixture, field: r });
  }
  const declaredComponents = new Set(DECLARED_COMPONENT_DOCUMENTS);
  const mapped = new Set([...writes, ...blanks].map((f) => f.document).filter(Boolean));
  for (const doc of mapped) if (!declaredComponents.has(doc)) note("requiredComponentsMissing", { component: doc });
  return { counters, findings, ledger, terminalFields: writes.length + blanks.length, written: writes.length, blank: blanks.length };
}

async function sourcePageStreams(bytes) {
  const pdf = await PDFDocument.load(bytes, { updateMetadata: false });
  return pdf.getPages().map((page) => contentStreamsOfPage(pdf, page));
}

async function renderFixture(resolved, fixtureName, facts) {
  const { parts, agencies } = partsFor(facts);
  const filled = [];
  const clearedRows = [];
  const viewerControlsRemoved = [];
  const sourceStreamsByPage = [];
  const drawnByPage = new Map();
  let offset = 0;
  for (const part of parts) {
    const source = resolved[part.key];
    const result = await fillDocument(source.bytes, part.spec);
    for (const row of result.drawn) {
      row.document = part.documentId;
      row.packetPage = offset + row.page;
      const list = drawnByPage.get(row.packetPage) ?? [];
      list.push(row);
      drawnByPage.set(row.packetPage, list);
    }
    for (const row of part.spec.writes) row.packetPage = offset + (row.page ?? 0);
    for (const row of part.spec.blanks) row.packetPage = offset + (row.page ?? 0);
    sourceStreamsByPage.push(...(await sourcePageStreams(source.bytes)));
    for (const row of result.cleared) { row.document = part.documentId; row.packetPage = offset + row.page; clearedRows.push(row); }
    for (const control of result.viewerControlsRemoved) viewerControlsRemoved.push({ ...control, document: part.documentId });
    filled.push({ pdf: result.pdf, documentId: part.documentId, component: part.component, sourceSha256: source.sha256 });
    offset += source.pageCount;
  }
  const assembled = await assemble(filled, fixtureName);
  const proof = await proveWrites(assembled.bytes, sourceStreamsByPage, drawnByPage, fixtureName);
  const drawnCount = [...drawnByPage.values()].reduce((n, list) => n + list.length, 0);
  return { ...assembled, ...proof, parts, agencies, drawnCount, clearedRows, viewerControlsRemoved };
}

/* ---- assembly ------------------------------------------------------------ */
async function assemble(filled, fixtureName) {
  const out = await PDFDocument.create();
  const manifest = [];
  for (const part of filled) {
    const pages = await out.copyPages(part.pdf, part.pdf.getPageIndices());
    pages.forEach((page, i) => {
      out.addPage(page);
      manifest.push({
        packetPage: out.getPageCount(), component: part.component, documentId: part.documentId,
        sourcePage: i + 1, sourceSha256: part.sourceSha256
      });
    });
  }
  out.setTitle(`${FAMILY_ID} ${fixtureName}`);
  out.setAuthor("Nebraska State Court forms, assembled without alteration of their printed content");
  out.setSubject("Motion to Seal an Adult Criminal Record after a pardon, Neb. Rev. Stat. secs. 29-2264, 29-3005 and 29-3523");
  out.setCreator("LegalEase deterministic official-form builder");
  out.setProducer("pdf-lib 1.17.1");
  out.setCreationDate(FIXED_DATE);
  out.setModificationDate(FIXED_DATE);
  const bytes = Buffer.from(await out.save({ useObjectStreams: false, addDefaultPage: false, objectsPerTick: Infinity }));
  return { bytes, manifest, pageCount: out.getPageCount() };
}

/* ---- the field map ------------------------------------------------------- */
function productionFieldMap(parts, clearedRows) {
  const writes = [];
  const refusals = [];
  for (const part of parts) {
    for (const row of part.spec.writes) {
      writes.push({
        fieldId: `${part.documentId}:${row.name}`, fieldName: row.name, field: row.name,
        effectiveLabel: row.label, printedLabel: row.label, sourceLabel: row.label,
        documentId: part.documentId, component: part.component,
        page: row.packetPage, sourcePage: row.page, widgetCount: row.widgetCount ?? 1, widgets: row.placements ?? null, factId: row.factId ?? null,
        rect: row.rect, rectBasis: `the /Rect of the AcroForm widget named ${JSON.stringify(row.name)} on page ${row.page} of the source binary${row.widgetCount > 1 ? ` (this field has ${row.widgetCount} widgets, one per page it repeats on, and every one is proved)` : ""}`,
        kind: row.kind === "checkbox" ? "selection_control" : row.kind === "dropdown" ? "acroform_chooser" : "acroform_text_field",
        disposition: row.kind === "checkbox" ? "selected_by_route" : "written",
        routeDetermined: row.routeDetermined === true,
        selectionBasis: row.basis ?? null
      });
    }
    for (const row of part.spec.blanks) {
      refusals.push({
        fieldId: `${part.documentId}:${row.name}`, fieldName: row.name, field: row.name,
        effectiveLabel: row.label, printedLabel: row.label,
        documentId: part.documentId, component: part.component,
        page: row.packetPage ?? null, sourcePage: row.page ?? null,
        rect: row.rect ?? null, printedSlot: row.printedSlot === true,
        isSelectionControl: row.isSelectionControl === true,
        kind: row.isSelectionControl === true ? "selection_control" : "acroform_text_field",
        reason: row.supply ? `the participant supplies this before filing: ${row.supply}` : row.reason,
        refusalClass: row.refusalClass ?? null,
        completenessDisposition: row.disposition ?? null,
        requiredBeforeFiling: row.requiredBeforeFiling === true,
        routeDetermined: false,
        routeConditionThatMakesItInapplicable: row.routeConditionThatMakesItInapplicable ?? null,
        factAvailable: false, factId: null,
        identity: `${part.documentId} field ${row.name}`,
        participantMustSupply: row.supply ?? null,
        role: row.role ?? "participant",
        why: row.why ?? row.reason
      });
    }
  }
  return {
    schemaVersion: "rcap-production-field-map/v2",
    familyId: FAMILY_ID, worklistGroupId: FAMILY_ID, jurisdiction: "NE",
    implementationStrategy: "official_pdf_fill", routeKeys: ROUTE_KEYS,
    structuralClass: "flattened_acroform",
    captionBasis: "every write box is the /Rect of the source's own AcroForm widget, read from the binary at build "
      + "time. No coordinate in this map is hand-entered, and every write is proved back out of the saved content "
      + "streams and flattened appearances.",
    routeSelectionNote:
      "Item 2 of CC 6:12 is a select-one and this family is the pardon-then-seal route, so the packet states "
      + "\"Resulted in a conviction that was later pardoned\" and declares the other three boxes not applicable "
      + "naming the selection made. The caption is composed into the two caption fields the form's own script "
      + "writes, and the drop-downs are set to match.",
    routeSelectionsMade: [
      { routeKey: ROUTE_KEY,
        selection: "CC 6:12 item 2: Resulted in a conviction that was later pardoned",
        sourceSupport: "the route this family is built for, and the only branch of item 2 that describes it" }
    ],
    sourceCarriedDefaultsCleared: clearedRows.map((row) => ({
      fieldId: `${row.document}:${row.name}`, documentId: row.document, page: row.packetPage,
      sourceCarriedValue: row.sourceCarriedValue, why: row.why,
      deliveredValue: "", disposition: "CLEARED_SOURCE_CHOOSER_PROMPT"
    })),
    dispositionVocabulary: [SIGNATURE_CLASS, ELECTION_CLASS],
    writes, refusals
  };
}

/* ---- the two participant-facing documents -------------------------------- */
function participantInstructions(ledger) {
  const rbf = ledger.filter((x) => x.disposition === "REQUIRED_BEFORE_FILING");
  return [
    "# Before you sign or file this motion",
    "",
    "This packet is Nebraska State Court form CC 6:12, *Motion to Seal an Adult Criminal Record*, drafted for a",
    "conviction that was later **pardoned**, under Neb. Rev. Stat. sections 29-2264, 29-3005 and 29-3523. The",
    "court's own instructions, form CC 6:12a, are included after it, unchanged. This is a prepared draft. It is not",
    "legal advice, it is not signed, and it has not been filed.",
    "",
    "## What the packet answered because the route answers it",
    "",
    "Item 2 of the motion asks you to select one of four outcomes. This packet is the pardon route, so",
    "**\"Resulted in a conviction that was later pardoned\"** is already marked. The other three are left unmarked:",
    "your charges were not dismissed, you were not acquitted, and the last box is only for a conviction set aside",
    "because you were a victim of sex trafficking, which the court's instructions say in terms.",
    "",
    "**Check this against your own case before you sign.** If your conviction was not pardoned, this is the wrong",
    "packet and the motion would say something untrue about your case.",
    "",
    "## Have your pardon paperwork with you",
    "",
    "The motion itself has no place to attach the pardon, and this packet does not create one. Bring the Nebraska",
    "Board of Pardons document that granted your pardon when you file, and ask the clerk whether the court wants a",
    "copy filed with the motion. Nothing here proves you were pardoned, and nothing here asks the court to assume it.",
    "",
    "## What is deliberately left blank",
    "",
    "Your signature and the date beside it are blank. Sign and date the motion yourself, after you have read it.",
    "A date written beside a signature that has not been made would be false.",
    "",
    rbf.length === 0
      ? "Every other fact this motion needs is drafted from the case facts you gave, so there is no separate list of blanks to fill."
      : ["| Blank | What you must supply |", "| --- | --- |",
        ...rbf.map((r) => `| ${String(r.label).replaceAll("|", "-")} | ${String(r.participantMustSupply ?? "").replaceAll("|", "-")} |`)].join("\n"),
    "",
    "## About your own details",
    "",
    "Your name, address, telephone number and email address are drafted into the block under the signature line.",
    "Read them and correct anything that is wrong before you sign. Nebraska Supreme Court Rule 2-208 requires a",
    "self-represented filer to give an email address, and the packet gives yours; if you cannot receive email, cross",
    "it out, check the box lower down and write why.",
    "",
    "## Stop conditions",
    "",
    "Stop using this self-help packet and talk to a lawyer if the conviction was not pardoned, if you are unsure",
    "whether the record is still public, if any charge in the case is still pending, or if you have any immigration",
    "matter pending or possible.",
    "",
    `Route: ${ROUTE_KEY}`,
    ""
  ].join("\n");
}

function filingInstructions() {
  return `# Filing instructions - Nebraska motion to seal a pardoned conviction

## Before you file

1. Read the whole motion and the court's instructions, form CC 6:12a, which is the second document in this packet.
2. Check the caption, the case number, the charges and the date of charge against your own court record.
3. Confirm that item 2 says what is true of your case: that the conviction was later pardoned.
4. Sign the motion and write the date beside your signature. Do not date it before you sign it.

## Where it goes

File the motion with the clerk of the court shown in the caption - the court where the charge was filed. The
court's instructions tell you how to find that: the Nebraska State Patrol will give you a copy of your criminal
history for a small charge, a one-time court case search of Nebraska court records will show the case, and the
public access terminal at the courthouse will show it too.

## Bring the pardon

Bring the Board of Pardons document granting your pardon. The motion form has no attachment page and this packet
adds none. Ask the clerk whether a copy should be filed with the motion.

## Fees

The held sources establish no filing fee for this motion and this packet states no amount. Ask the clerk. If you
cannot afford a fee the clerk names, ask the clerk for Nebraska's in forma pauperis application; this packet does
not carry one, because no Nebraska fee-waiver form is bound to this family.

## What this packet is not

This is a prepared set of the court's own form and the court's own instructions. It is not legal advice, it is not
filed for you, and it does not decide whether the court will seal your record.

Route: ${ROUTE_KEY}
`;
}

/* ---- build --------------------------------------------------------------- */
function partsFor(facts) {
  return {
    agencies: null,
    parts: [
      { key: MOTION, documentId: MOTION, component: "primary_filing", spec: motionSpec(facts) },
      { key: INSTRUCTIONS, documentId: INSTRUCTIONS, component: "instructions", spec: instructionsSpec() }
    ]
  };
}

async function build() {
  const { resolved, failures } = resolveSources();
  if (failures.length > 0) {
    return { familyId: FAMILY_ID, status: "STOPPED", stopClass: "BLOCKED_SOURCE",
      failedSourceIdentities: failures, overlayDirectoryTouched: false };
  }
  const instructionsDoc = await PDFDocument.load(resolved[INSTRUCTIONS].bytes, { updateMetadata: false });
  const instructionsFieldCount = instructionsDoc.getForm().getFields().length;
  assert.equal(instructionsFieldCount, 0,
    "CC 6:12a must remain the flat instructions document this build carries unchanged");

  const fixtures = {};
  for (const [name, facts] of Object.entries(FIXTURES)) fixtures[name] = await renderFixture(resolved, name, facts);

  const map = productionFieldMap(fixtures.canonical.parts, fixtures.canonical.clearedRows);
  /* Push buttons detached before flattening, so a viewer control is never drawn
   * onto a filed page. Declared rather than done quietly. */
  map.viewerControlsRemoved = fixtures.canonical.viewerControlsRemoved;
  const artifactCounters = Object.entries(fixtures).map(([fixture, f]) => ({
    fixture,
    valuesReportedByFinalizer: f.drawnCount,
    addedGlyphsReadFromOutputBytes: 0,
    flattenedWidgetAppearancesReadFromOutputBytes: f.addedGlyphs + f.vectorMarks,
    flattenedShowTextGlyphsReadFromOutputBytes: f.addedGlyphs,
    flattenedVectorMarksReadFromOutputBytes: f.vectorMarks,
    nonWhitespaceGlyphsOutsideMeasuredWriteBoxes: f.outsideBoxes,
    refusedFieldsWithInk: []
  }));
  const preliminary = builderCounters(map, artifactCounters, "");
  const instructions = participantInstructions(preliminary.ledger);
  const audit = builderCounters(map, artifactCounters, instructions);
  const allZero = PASS_COUNTERS.every((c) => audit.counters[c] === 0);
  if (!allZero) {
    return { familyId: FAMILY_ID, status: "STOPPED", stopClass: "COMPLETENESS_COUNTER_NOT_ZERO",
      nonZeroCounters: PASS_COUNTERS.filter((c) => audit.counters[c] > 0),
      counters: audit.counters, findings: audit.findings.slice(0, 40), overlayDirectoryTouched: false };
  }

  const out = path.join(ROOT, OUT_REL);
  fs.mkdirSync(path.join(out, "fixtures"), { recursive: true });
  fs.mkdirSync(path.join(out, "reports"), { recursive: true });
  for (const [name, f] of Object.entries(fixtures)) fs.writeFileSync(path.join(out, "fixtures", `${name}.pdf`), f.bytes);

  const artifactRows = Object.entries(fixtures).map(([fixture, f]) => ({
    fixture, file: `${OUT_REL}/fixtures/${fixture}.pdf`,
    sha256: sha256(f.bytes), byteLength: f.bytes.length, pageCount: f.pageCount,
    documents: [
      { documentId: MOTION, componentKinds: ["primary_filing"], sourceSha256: resolved[MOTION].sha256 },
      { documentId: INSTRUCTIONS, componentKinds: ["instructions"], sourceSha256: resolved[INSTRUCTIONS].sha256 }
    ],
    pageManifest: f.manifest
  }));

  writeJson(path.join(out, "production-field-map.json"), map);
  writeJson(path.join(out, "source-receipt.json"), {
    schemaVersion: "rcap-family-source-receipt/v1",
    familyId: FAMILY_ID, worklistGroupId: FAMILY_ID, jurisdiction: "NE",
    implementationStrategy: "official_pdf_fill", custodyClass: "SOURCE_ALREADY_HELD",
    acquisitionCommissioned: false, allSourcesExact: true,
    bindingMethod: "committed corpus-index path + index SHA-256 + on-disk SHA-256, re-read at build time",
    documents: [
      { sourceIds: [SOURCES[MOTION].sourceId], formNumber: "CC-6-12", documentId: MOTION,
        revision: SOURCES[MOTION].revision, pathInArchive: SOURCES[MOTION].path, custody: resolved[MOTION].custody,
        sha256: resolved[MOTION].sha256, byteLength: resolved[MOTION].byteLength,
        componentKinds: ["primary_filing"], pages: [1, 2] },
      { sourceIds: [SOURCES[INSTRUCTIONS].sourceId], formNumber: "CC-6-12a", documentId: INSTRUCTIONS,
        revision: SOURCES[INSTRUCTIONS].revision, pathInArchive: SOURCES[INSTRUCTIONS].path,
        custody: resolved[INSTRUCTIONS].custody, sha256: resolved[INSTRUCTIONS].sha256,
        byteLength: resolved[INSTRUCTIONS].byteLength, componentKinds: ["instructions"], pages: [1, 2],
        acroFormFields: instructionsFieldCount,
        carriedUnchanged: "the court's own instructions have no AcroForm and nothing on them is filled in" }
    ],
    whatThisReceiptDoesNotEstablish: [
      "that any pardon was granted, or on what date",
      "that the record is still public, which item 3 of the motion states",
      "any filing fee, or the existence of a bound Nebraska fee-waiver form for this family",
      "independent verification, raster acceptance, counsel approval, or fulfillment authority"
    ],
    commercialRoutesOpened: 0
  });
  writeJson(path.join(out, "reports", "actual-writes.json"), {
    schemaVersion: "rcap-actual-writes-byte-proof/v1", familyId: FAMILY_ID,
    derivedFromArtifactBytes: true,
    proofMethod: "each saved fixture is re-opened, every page content stream is decompressed, the streams the "
      + "source page already carried are excluded, each remaining /FlatWidget-n Do is resolved to its XObject, that "
      + "stream is decompressed, and every show-text operator in it is decoded with the matrix or text offset that "
      + "precedes it and carried back into page coordinates by the placement cm.",
    documents: Object.entries(fixtures).map(([fixture, f]) => ({ fixture, actualWrites: f.proofs })),
    sourceCarriedDefaultsCleared: fixtures.canonical.clearedRows.map((row) => ({
      fieldId: `${row.document}:${row.name}`, sourceCarriedValue: row.sourceCarriedValue, deliveredValue: "", why: row.why
    })),
    artifacts: artifactCounters
  });
  writeJson(path.join(out, "reports", "rendered-artifacts.json"), {
    schemaVersion: "rcap-rendered-artifacts/v2", familyId: FAMILY_ID, renderedFresh: true,
    componentSet: ["primary_filing", "instructions"], componentIdentityMode: "exact",
    artifacts: artifactRows,
    packets: artifactRows.map((a) => ({ fixture: a.fixture, file: a.file, sha256: a.sha256, byteLength: a.byteLength, pageCount: a.pageCount, documents: a.documents, pageManifest: a.pageManifest })),
    rasterEngine: null, rasterState: "BUILT_RASTER_PENDING"
  });
  writeJson(path.join(out, "reports", "builder-completeness-counters.json"), {
    schemaVersion: "rcap-builder-completeness-counters/v1", familyId: FAMILY_ID,
    thisIsNotAVerdict: "A builder verdict is not a verdict. These counters are the builder contract's own "
      + "obligation, computed with scripts/rcap-packet-completeness/completeness-contract.mjs. An independent "
      + "verification lane that did not build this packet decides whether it passes.",
    counters: audit.counters, allNineZero: allZero,
    totals: { terminalFields: audit.terminalFields, written: audit.written, blank: audit.blank },
    blanksByDisposition: audit.ledger.reduce((acc, b) => { acc[b.disposition] = (acc[b.disposition] ?? 0) + 1; return acc; }, {}),
    findings: audit.findings
  });
  writeJson(path.join(out, "reports", "blanks-left-for-the-participant.json"), {
    schemaVersion: "rcap-blank-ledger/v1", familyId: FAMILY_ID,
    blanks: audit.ledger.map((b) => ({
      field: b.fieldId, documentId: b.documentId, page: b.page, label: b.effectiveLabel,
      disposition: b.disposition, basis: b.basis, participantMustSupply: b.participantMustSupply ?? null
    }))
  });
  fs.writeFileSync(path.join(out, "participant-instructions.md"), instructions);
  fs.writeFileSync(path.join(out, "filing-instructions.md"), filingInstructions());
  writeJson(path.join(out, "build-status.json"), {
    schemaVersion: "rcap-family-build-status/v1", familyId: FAMILY_ID,
    buildStatus: "state_built", reviewStatus: "qa_review_pending",
    builtBy: "scripts/build-census-v1-ne-seal-pardoned-set.mjs",
    rasterEngine: null, popplerUsed: false, rasterState: "BUILT_RASTER_PENDING",
    packetsSelfVerified: 0, commercialRoutesOpened: 0, productionTouched: false,
    grantsNothing: "A rendered packet is review evidence. It authorizes no fulfillment and opens no commercial route."
  });
  writeJson(path.join(out, "build-findings.json"), {
    schemaVersion: "rcap-family-build-findings/v1", familyId: FAMILY_ID,
    findings: [
      { finding: "Item 2 of CC 6:12 is a select-one whose pardoned branch is this family's whole identity.",
        consequence: "The packet marks \"Resulted in a conviction that was later pardoned\" and declares the other three boxes not applicable, naming the selection made. A route-determined election is not left to the participant." },
      { finding: "The caption \"IN THE ______ COURT OF ______ COUNTY, NEBRASKA\" is not printed page text. It is the default value of two text fields the form's own script rewrites from the drop-downs.",
        consequence: "The packet writes the composed caption into those two fields and sets the drop-downs to match. Three fill strategies were rendered and looked at first: selecting only the drop-downs leaves the caption empty and overprints the chooser prompt beneath it, and writing the free-text alternates collides with the right-aligned caption still in the caption field." },
      { finding: "\"(Enter the type of court)\" and \"(Enter the county name)\" are field default values, not page text.",
        consequence: "Both are cleared, and both are recorded with their source-carried value in production-field-map.json and reports/actual-writes.json. A filed motion that prints an instruction to itself in its caption is a defect no counter would show." },
      { finding: "CC 6:12 has no place to attach the pardon and this build creates none.",
        consequence: "Nothing in this packet asserts that a pardon was granted or names a date. The participant is told to bring the Board of Pardons document and to ask the clerk whether a copy should be filed." },
      { finding: "The family's instrument kinds name a fee waiver, and no Nebraska fee-waiver form is bound to this family by any source record.",
        consequence: "No fee-waiver component is built and none is implied. The filing instructions say plainly that the participant should ask the clerk for Nebraska's in forma pauperis application, and that this packet does not carry one." },
      { finding: "CC 6:12a carries no AcroForm at all, which the build asserts before assembly.",
        consequence: "The court's own instructions are carried unchanged, with nothing written on them, and the source receipt records the measured field count." }
    ]
  });
  writeJson(path.join(out, "approval-request.json"), {
    schemaVersion: "rcap-family-approval-request/v2", familyId: FAMILY_ID,
    status: "BUILT_RASTER_PENDING", implementationStrategy: "official_pdf_fill",
    routeKeys: ROUTE_KEYS, buildStatus: "state_built",
    requested: "visual review and counsel review",
    components: [{ kind: "primary_filing", documentId: MOTION }, { kind: "instructions", documentId: INSTRUCTIONS }],
    artifacts: artifactRows.map((a) => ({ fixture: a.fixture, file: a.file, sha256: a.sha256, byteLength: a.byteLength, pageCount: a.pageCount })),
    counselQuestionsRaised: [
      "Item 3 of the motion states that the information related to the charges still appears in the public record. The packet does not mark it because it is not a checkbox, but it is a sworn statement in the body of the motion. Confirm the participant is adequately warned to verify it.",
      "The packet writes the caption into the two fields the form's script drives, rather than through the drop-downs. Confirm a Nebraska clerk accepts a flattened motion whose caption reads correctly and whose drop-downs are shown selected.",
      "No fee-waiver form is bound to this family. Confirm whether a Nebraska in forma pauperis application should be a component of this packet rather than a pointer in the filing instructions."
    ],
    independentVerificationStatus: "PENDING",
    approvedForLive: false, live: false,
    packetsSelfVerified: 0, commercialRoutesOpened: 0, productionTouched: false
  });

  return {
    familyId: FAMILY_ID, status: "COMPLETED", directory: OUT_REL,
    structuralClass: "flattened_acroform",
    officialForms: [
      { formNumber: "CC-6-12", sha256: resolved[MOTION].sha256 },
      { formNumber: "CC-6-12a", sha256: resolved[INSTRUCTIONS].sha256 }
    ],
    components: ["primary_filing", "instructions"],
    terminalFields: audit.terminalFields, written: audit.written, blank: audit.blank,
    counters: audit.counters, nineCountersZero: allZero,
    blanksByDisposition: audit.ledger.reduce((acc, b) => { acc[b.disposition] = (acc[b.disposition] ?? 0) + 1; return acc; }, {}),
    sourceCarriedDefaultsCleared: fixtures.canonical.clearedRows.length,
    rasterState: "BUILT_RASTER_PENDING",
    artifactHashes: artifactRows.map((a) => ({ fixture: a.fixture, sha256: a.sha256, byteLength: a.byteLength, pageCount: a.pageCount })),
    packetsSelfVerified: 0, commercialRoutesOpened: 0, productionTouched: false
  };
}

if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(thisFile)) {
  build().then((r) => console.log(JSON.stringify(r, null, 2))).catch((e) => { console.error(e); process.exit(1); });
}

export { build, FAMILY_ID, OUT_REL };
