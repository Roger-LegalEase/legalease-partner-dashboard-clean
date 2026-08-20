#!/usr/bin/env node
// Canaries for what a widget carries onto a filed page, and the mutations that
// prove each correction is load-bearing.
//
//   node scripts/verify-rcap-widget-appearance-canaries.mjs
//
// A widget is a picture as well as a value. Whoever built the form authored an
// appearance stream for it, flattening paints that stream onto the page, and
// the page is what gets filed. Two opposite failures live in those streams on
// this corpus, and the canaries below are both of them, measured on bytes this
// file renders rather than asserted against a matcher.
//
//   * A REFUSED WIDGET KEEPS ITS PROMPT. Nebraska's court and county choosers
//     ship with an appearance drawing "Choose the court" and "Choose the
//     county" and with no /V at all. The previous correction looked at the
//     SELECTED value, found none, and moved on -- so five filed Nebraska
//     pleadings still tell the court to choose one. The escalation that
//     covered this was recorded closed against a fixture whose chooser DID
//     carry a value, which is the one shape the defect does not take.
//
//   * A WRITTEN WIDGET ERASES THE FORM. Nebraska draws its statutory caption
//     through fields: TYPEOFCOURTRESULTS' appearance is the words "IN THE" and
//     "COURT OF", fullcountystatementRIGHT's is "COUNTY, NEBRASKA", and the
//     italic hints are two more. Writing a value into one regenerates its
//     appearance and the court's own wording is gone -- CC-6-15.1 filed as
//     "District CourtExample County COUNTY, NEBRASKA" with "IN THE" carrying
//     no ink at all -- and an /MK background paints an opaque rectangle over
//     whatever the form printed underneath.
//
// The fixture is a replica of NE CC-6-15.1's caption band. Its widget
// rectangles, option lists and appearance streams are transcribed from the
// committed artifact at
// data/rcap-all50/overlays/production/nebraska/cc-6-15-1-form-en/fixtures/
// canonical-filled.pdf, operator for operator, including the white background
// fill the source's own chooser appearance opens with. Nothing here is
// Nebraska-specific in the renderer: the discriminator is whether a field
// holds a value of its own, which is a question any form answers.
import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { finalizeOfficialForm } from "./rcap-official-forms/rcap-official-form-finalize.mjs";
import { sanitizeAndFlatten, fieldHoldsAValue, clearWidgetAppearance }
  from "./rcap-official-forms/rcap-active-content.mjs";
import { extractPageGeometry, groupIntoLines } from "./rcap-official-forms/rcap-pdf-anchor-capture.mjs";
import { isChooserPrompt } from "./rcap-official-forms/rcap-field-semantics.mjs";

const require = createRequire(import.meta.url);
const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const { PDFDocument, StandardFonts, PDFName } = require(path.join(rootDir, "node_modules/pdf-lib"));

const failures = [];
const note = (message) => failures.push(message);

// --- the fixture ------------------------------------------------------------

/**
 * The caption band of NE CC-6-15.1, with each widget's own appearance stream.
 *
 * `body` is the source's appearance, transcribed from the committed artifact.
 * `TYPEOFCOURTDROPDOWN`'s opens `1 g ... re f` -- the white background that
 * removes whatever the form prints under the box.
 */
const BAND = {
  TYPEOFCOURTDROPDOWN: {
    type: "dropdown",
    options: ["Choose the court", "_________________________________________", "DISTRICT", "COUNTY", "JUVENILE"],
    rect: { x: 142, y: 659, width: 79.416, height: 14.4 },
    body: "q\n1 g\n0 0 79.416 14.4 re\nf\nQ\n/Tx BMC \nq\n2 1 75.416 12.4 re\nW\nn\nBT\n/Helv 8 Tf\n0 g\n2 4.2681 Td\n(Choose ) Tj\n26.004 0 Td\n(the ) Tj\n11.778 0 Td\n(court) Tj\nET\nQ\nEMC\n"
  },
  DROPDOWNCOUNTY2: {
    type: "dropdown",
    options: ["Choose the county", " ", "ADAMS", "ANTELOPE", "DOUGLAS", "LANCASTER"],
    rect: { x: 290, y: 659, width: 78.983, height: 14.4 },
    body: "/Tx BMC \nq\n2 1 74.983 12.4 re\nW\nn\nBT\n/Helv 8 Tf\n0 g\n2 4.2681 Td\n(Choose ) Tj\n26.004 0 Td\n(the ) Tj\n11.778 0 Td\n(county) Tj\nET\nQ\nEMC\n"
  },
  TYPEOFCOURTRESULTS: {
    type: "text",
    rect: { x: 43, y: 672, width: 236.6189, height: 18 },
    body: "/Tx BMC \nq\n1 1 234.6 16 re\nW\nn\nBT\n/Helv 12 Tf\n0 g\n2 4.6021 Td\n(IN THE ) Tj\n84 0 Td\n(COURT OF ) Tj\nET\nQ\nEMC\n"
  },
  fullcountystatementRIGHT: {
    type: "text",
    rect: { x: 279, y: 672, width: 225.707, height: 18 },
    body: "/Tx BMC \nq\n1 1 223.707 16 re\nW\nn\nBT\n/Helv 12 Tf\n0 g\n2 4.6021 Td\n( ) Tj\n84 0 Td\n(COUNTY, ) Tj\n55.992 0 Td\n(NEBRASKA ) Tj\nET\nQ\nEMC\n"
  },
  "enter the type of court": {
    type: "text",
    rect: { x: 138, y: 659, width: 103.527, height: 26.836 },
    body: "/Tx BMC \nq\n1 1 101.527 24.836 re\nW\nn\nBT\n/Helv 8 Tf\n0 g\n2 15.908 Td\n( ) Tj\n0 -8.928 Td\n(\\050Enter ) Tj\n21.966 0 Td\n(the ) Tj\n11.112 0 Td\n(type ) Tj\n15.108 0 Td\n(of ) Tj\n8.892 0 Td\n(court\\051) Tj\nET\nQ\nEMC\n"
  },
  "enter the county": {
    type: "text",
    rect: { x: 277, y: 659, width: 103.527, height: 26.836 },
    body: "/Tx BMC \nq\n1 1 101.527 24.836 re\nW\nn\nBT\n/Helv 8 Tf\n0 g\n2 15.908 Td\n( ) Tj\n0 -8.928 Td\n(\\050Enter ) Tj\n21.966 0 Td\n(the ) Tj\n11.112 0 Td\n(county ) Tj\n27.552 0 Td\n(name\\051) Tj\nET\nQ\nEMC\n"
  }
};

const CENSUS = Object.entries(BAND).map(([name, spec]) => ({
  name, type: spec.type, multiline: false, maxLength: null,
  widgets: [{ page: 1, rect: { ...spec.rect } }]
}));

const FACTS = {
  "participant.full_legal_name": "Jordan Avery Reyes",
  "matter.county": "Douglas",
  "matter.court": "DISTRICT",
  "deterministic.filing_date": "2026-08-12"
};

/** Builds the blank: source appearances in place, and no value on any field. */
async function buildBlank({ selectThePrompt = false } = {}) {
  const doc = await PDFDocument.create();
  const page = doc.addPage([612, 792]);
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const form = doc.getForm();

  // Page content the form prints for itself, outside the band.
  page.drawText("Nebraska State Court Form", { x: 111, y: 760, size: 10, font });
  page.drawText("CC 6:15.1   NEW 05/2021", { x: 110, y: 750, size: 10, font });
  page.drawText("STATE OF NEBRASKA", { x: 112, y: 628, size: 12, font });

  const made = [];
  for (const [name, spec] of Object.entries(BAND)) {
    let field;
    if (spec.type === "dropdown") {
      field = form.createDropdown(name);
      field.addOptions(spec.options);
      if (selectThePrompt) field.select(spec.options[0]);
    } else {
      field = form.createTextField(name);
    }
    field.addToPage(page, { ...spec.rect, font });
    made.push({ name, field, spec });
  }

  for (const { field, spec } of made) {
    for (const widget of field.acroField.getWidgets()) {
      const stream = doc.context.flateStream(spec.body);
      stream.dict.set(PDFName.of("Type"), PDFName.of("XObject"));
      stream.dict.set(PDFName.of("Subtype"), PDFName.of("Form"));
      stream.dict.set(PDFName.of("BBox"), doc.context.obj([0, 0, spec.rect.width, spec.rect.height]));
      const resources = doc.context.obj({});
      const fonts = doc.context.obj({});
      fonts.set(PDFName.of("Helv"), font.ref);
      resources.set(PDFName.of("Font"), fonts);
      stream.dict.set(PDFName.of("Resources"), resources);
      const ap = doc.context.obj({});
      ap.set(PDFName.of("N"), doc.context.register(stream));
      widget.dict.set(PDFName.of("AP"), ap);
      // A white field background, as Acrobat authors one.
      const mk = doc.context.obj({});
      mk.set(PDFName.of("BG"), doc.context.obj([1]));
      widget.dict.set(PDFName.of("MK"), mk);
    }
    if (!selectThePrompt) {
      field.acroField.dict.delete(PDFName.of("V"));
      field.acroField.dict.delete(PDFName.of("DV"));
    }
  }
  return Buffer.from(await doc.save({ useObjectStreams: false, updateMetadata: false }));
}

/** Everything a flattened page shows, and every opaque area it paints. */
async function pageEvidence(bytes) {
  const doc = await PDFDocument.load(bytes, { ignoreEncryption: true });
  const { text, paths } = extractPageGeometry(doc.getPages()[0]);
  const lines = groupIntoLines(text).map((l) => l.text);
  const fills = paths
    .filter((p) => /^(f|F|f\*|B|B\*|b|b\*)$/.test(p.paintedBy) && p.width > 4 && p.height > 4)
    .map((fill) => ({
      ...fill,
      covers: text.filter((t) => t.text.trim() !== ""
        && t.x + (t.width ?? 0) > fill.x && t.x < fill.x + fill.width
        && t.y > fill.y - 2 && t.y < fill.y + fill.height).map((t) => t.text)
    }));
  return { visible: lines.join("\n"), lines, fills, fillsOverText: fills.filter((f) => f.covers.length > 0) };
}

// --- the corrected renderer -------------------------------------------------

const blank = await buildBlank();
const corrected = await finalizeOfficialForm({ sourceBytes: blank, census: CENSUS, facts: FACTS });
const after = await pageEvidence(corrected.bytes);

const PROMPTS = ["Choose the court", "Choose the county"];
const PRINTED = ["IN THE", "COURT OF", "COUNTY, NEBRASKA", "(Enter the type of court)", "(Enter the county name)"];

const CANARIES = [
  {
    id: "PROMPT-GONE-COURT",
    holds: () => !after.visible.includes("Choose the court"),
    consequence: "a filed Nebraska pleading telling the court to choose which court it is"
  },
  {
    id: "PROMPT-GONE-COUNTY",
    holds: () => !after.visible.includes("Choose the county"),
    consequence: "a filed Nebraska pleading telling the court to choose the county"
  },
  {
    id: "PROMPT-CLEARED-WITHOUT-A-VALUE",
    holds: () => corrected.report.appearanceDispositions
      .some((d) => d.field === "DROPDOWNCOUNTY2" && d.disposition === "cleared"),
    consequence: "a chooser that never carried a value, so nothing looked at it, and its prompt flattened onto the page"
  },
  {
    id: "PRINTED-CAPTION-SURVIVES",
    holds: () => PRINTED.every((needle) => after.visible.includes(needle)),
    consequence: "the statute's own caption wording erased off a court filing by the value written over it"
  },
  {
    id: "PRINTED-TEXT-FIELD-REFUSED",
    holds: () => corrected.report.refused
      .some((r) => r.field === "TYPEOFCOURTRESULTS" && r.reason === "widget_appearance_carries_printed_form_text"),
    consequence: "a value written into the field the form prints IN THE ... COURT OF through"
  },
  {
    id: "NO-OPAQUE-FILL-OVER-PRINTED-TEXT",
    holds: () => after.fillsOverText.length === 0,
    consequence: "the chooser's own white background flattened over the form's printed wording, which reads as blank paper"
  },
  {
    id: "VALUE-STILL-REACHES-THE-PAPER",
    holds: () => after.visible.includes("DISTRICT")
      && corrected.report.written.some((w) => w.field === "TYPEOFCOURTDROPDOWN" && w.factId === "matter.court"),
    consequence: "a caption band corrected into carrying nothing at all"
  }
];

console.log("  canaries, on flattened bytes");
for (const canary of CANARIES) {
  const passed = canary.holds();
  console.log(`    ${passed ? "ok  " : "FAIL"} ${canary.id}`);
  if (!passed) note(`${canary.id}: ${canary.consequence}`);
}

// --- mutations --------------------------------------------------------------
//
// Each removes one correction from a copy of the pipeline and requires the
// canary that covers it to go red. A correction whose removal changes nothing
// was never doing anything, and the canary over it proves nothing.

/** Runs the fill/flatten by hand so one correction at a time can be withheld. */
async function renderWith(dispose, { selectTheCourt = true } = {}) {
  const doc = await PDFDocument.load(await buildBlank(), { ignoreEncryption: true, updateMetadata: false });
  const helvetica = await doc.embedFont(StandardFonts.Helvetica);
  const form = doc.getForm();
  if (selectTheCourt) form.getDropdown("TYPEOFCOURTDROPDOWN").select("DISTRICT");
  dispose(form, doc);
  const { clean } = await sanitizeAndFlatten(doc, { defaultFont: helvetica });
  return pageEvidence(await clean.save({ useObjectStreams: false, updateMetadata: false }));
}

const MUTATIONS = [
  {
    id: "clear only a chooser whose VALUE is a prompt",
    detect: (evidence) => evidence.visible.includes("Choose the county"),
    covers: "PROMPT-CLEARED-WITHOUT-A-VALUE",
    run: (form) => {
      for (const field of form.getFields()) {
        if (typeof field.getSelected !== "function") continue;
        let selected = [], options = [];
        try { selected = field.getSelected() ?? []; options = field.getOptions() ?? []; } catch { continue; }
        if (!selected.some((value) => isChooserPrompt(value, options))) continue;
        clearWidgetAppearance(field);
      }
    }
  },
  {
    // The source's own chooser appearance opens by filling its whole box
    // white. Left in place through a flatten that is exactly what erases the
    // form's printed wording underneath it -- the reviewer measured zero ink
    // over "IN THE" and a vanished "(Enter the county name)" on artifacts
    // whose page text still contained both.
    id: "leave a chooser that holds no value alone",
    detect: (evidence) => evidence.fillsOverText.length > 0 && evidence.visible.includes("Choose the court"),
    covers: "NO-OPAQUE-FILL-OVER-PRINTED-TEXT",
    selectTheCourt: false,
    run: () => { /* the previous behaviour: nothing to do, because nothing selected it */ }
  },
  {
    id: "write into the field the form prints its caption through",
    detect: (evidence) => !evidence.visible.includes("IN THE"),
    covers: "PRINTED-CAPTION-SURVIVES",
    run: (form) => {
      for (const field of form.getFields()) {
        if (typeof field.getSelected === "function") { clearWidgetAppearance(field); continue; }
        if (field.getName() !== "TYPEOFCOURTRESULTS") continue;
        field.setText("District Court");
      }
    }
  }
];

console.log("  mutations");
for (const mutation of MUTATIONS) {
  const evidence = await renderWith(mutation.run, { selectTheCourt: mutation.selectTheCourt !== false });
  const detected = mutation.detect(evidence);
  console.log(`    ${detected ? "ok  " : "FAIL"} ${mutation.id.padEnd(56)} → ${mutation.covers} goes red`);
  if (!detected) {
    note(`mutation "${mutation.id}" changed nothing measurable — the correction it removes is not load-bearing, so ${mutation.covers} proves nothing`);
  }
}

// --- the discriminator the previous fixture did not have --------------------
//
// The escalation this replaces recorded its own mutation test as "flatten a
// form with an unselected dropdown: the prompt string must not appear in the
// page content stream", and proved it on a chooser carrying the prompt as its
// VALUE. Nebraska's carry it only as a picture. Both shapes are rendered here,
// and both must come out clean.

console.log("  both shapes of the same defect");
for (const [label, selectThePrompt] of [["prompt as the field's value", true], ["prompt as the widget's picture only", false]]) {
  const source = await buildBlank({ selectThePrompt });
  const doc = await PDFDocument.load(source, { ignoreEncryption: true, updateMetadata: false });
  const holdsValue = fieldHoldsAValue(doc.getForm().getField("DROPDOWNCOUNTY2").acroField);
  const rendered = await finalizeOfficialForm({ sourceBytes: source, census: CENSUS, facts: FACTS });
  const evidence = await pageEvidence(rendered.bytes);
  const clean = PROMPTS.every((needle) => !evidence.visible.includes(needle));
  console.log(`    ${clean ? "ok  " : "FAIL"} ${label.padEnd(38)} (field holds a value: ${holdsValue})`);
  if (!clean) note(`the chooser prompt survives when the ${label}`);
}

if (failures.length) {
  console.error(`FAIL widget-appearance canaries — ${failures.length} problem(s)`);
  for (const failure of failures) console.error(`  ${failure}`);
  process.exit(1);
}

console.log(
  `OK widget-appearance canaries — ${CANARIES.length} canaries hold on flattened bytes, ` +
    `${MUTATIONS.length} mutations each turn their canary red, no chooser prompt survives in either shape, ` +
    "and the form's own printed caption is still on the page"
);
