#!/usr/bin/env node
// The Lane 2 semantic appearance policy, proved on synthetic bytes.
//
//   node scripts/verify-rcap-appearance-semantics.mjs
//
// Three meanings, one switch. A field's appearance is the court's own text, or a
// participant input that renders only what this run wrote, or chrome for a
// person at a screen. The finalizer reads the disposition and nothing else — not
// the family, the form, the field name, the text drawn, or a flag bit — so the
// only way to know it still separates them is to build a form carrying all three
// and look at what reaches the page.
//
// The fixture is synthetic. It carries the Nebraska caption shapes because those
// are the shapes that broke: an unwritten /Tx widget drawing "(Enter the type of
// court)" and an unwritten /Tx widget drawing "COUNTY, NEBRASKA" are the same
// structure and opposite meanings. No production family artifact is generated,
// read or written.
import fs from "node:fs";
import path from "node:path";
import zlib from "node:zlib";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import { APPEARANCE_DISPOSITION, loadAppearanceSemantics, dispositionsForFamily }
  from "./rcap-official-forms/rcap-appearance-semantics.mjs";

const require = createRequire(import.meta.url);
const { PDFDocument, PDFName, PDFArray, PDFDict, StandardFonts } = require("pdf-lib");
const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const MODULE = path.join(rootDir, "scripts/rcap-official-forms/rcap-active-content.mjs");
const failures = [];
const note = (m) => failures.push(m);

const PLACEHOLDER_TEXT = "(Enter the type of court)";
const PARTICIPANT_COURT = "Separate Juvenile Court";
const COUNTY_CAPTION = "COUNTY, NEBRASKA";
const CASE_TYPE_HEADING = "Type of Case - Check only one:";
const COURT_OF_BAND = "IN THE ___ COURT OF";
const PARTICIPANT_NAME = "Jordan Avery Reyes";
const COURT_VALUE = "District Court";
const ANSWERED_OPTION = "Lancaster";
const CHOOSER_PROMPT = "Choose the county";
const RESET_CAPTION = "Reset Form";

const escape = (s) => s.replace(/([()\\])/g, "\\$1");

/** An appearance stream shaped like the ones these forms ship. */
function appearanceBody({ draws, background, width, height }) {
  const lines = [];
  // An opaque field background, painted the way Acrobat authors one: near-white
  // fill, the full size of the widget, then whatever the court drew on top.
  if (background) lines.push("q", "1 g", `0 0 ${width} ${height} re`, "f", "Q");
  if (draws) lines.push("/Tx BMC", "q", "BT", "/Helv 9 Tf", "0 g", "2 3 Td", `(${escape(draws)}) Tj`, "ET", "Q", "EMC");
  return `${lines.join("\n")}\n`;
}

/**
 * The fixture.
 *
 * `placeholderDrawsValue` is the difference between the two runs a participant
 * input has: unwritten, its appearance is the court's instruction to whoever
 * fills the form in by hand; written, the renderer has regenerated it and it is
 * the participant's answer. Same field, same structure, opposite content.
 *
 * `bandCover` is an opaque-backed widget sitting on top of the printed caption.
 * It is what makes "the band is preserved" a real question rather than a
 * tautology: something has to be able to hide it.
 */
async function buildFixture({ placeholderDrawsValue = false } = {}) {
  const doc = await PDFDocument.create();
  const page = doc.addPage([612, 792]);
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const form = doc.getForm();

  // The band's fixed words are page content the court published, exactly as on
  // the real forms, where no drawn run inside a widget carries them.
  page.drawText(COURT_OF_BAND, { x: 100, y: 700, size: 12, font });

  const fields = [
    { name: "enter the type of court", kind: "text", draws: placeholderDrawsValue ? PARTICIPANT_COURT : PLACEHOLDER_TEXT, background: true },
    { name: "fullcountystatementRIGHT", kind: "text", draws: COUNTY_CAPTION, background: true },
    { name: "Text24", kind: "text", draws: CASE_TYPE_HEADING, background: false },
    { name: "bandCover", kind: "text", draws: "", background: true, over: true },
    { name: "TYPEOFCOURTRESULTS", kind: "text", draws: COURT_VALUE, background: false },
    { name: "printedname", kind: "text", draws: PARTICIPANT_NAME, background: false },
    { name: "ResetButton", kind: "pushbutton", draws: RESET_CAPTION, background: false },
    { name: "unansweredChooser", kind: "choice", draws: CHOOSER_PROMPT, background: false },
    { name: "answeredChooser", kind: "choice", draws: ANSWERED_OPTION, background: false, answered: true }
  ];

  let y = 690;
  for (const spec of fields) {
    const rect = spec.over ? { x: 98, y: 696, width: 220, height: 20 } : { x: 100, y: (y -= 24), width: 200, height: 16 };
    let field;
    if (spec.kind === "choice") {
      field = form.createDropdown(spec.name);
      field.addOptions([ANSWERED_OPTION, "Douglas", "Sarpy"]);
      if (spec.answered) field.select(ANSWERED_OPTION);
      field.addToPage(page, { ...rect, font });
    } else if (spec.kind === "pushbutton") {
      field = form.createButton(spec.name);
      field.addToPage(RESET_CAPTION, page, { ...rect, font });
    } else {
      field = form.createTextField(spec.name);
      field.addToPage(page, { ...rect, font });
    }

    for (const widget of field.acroField.getWidgets()) {
      const stream = doc.context.flateStream(appearanceBody({ ...spec, width: rect.width, height: rect.height }));
      stream.dict.set(PDFName.of("Type"), PDFName.of("XObject"));
      stream.dict.set(PDFName.of("Subtype"), PDFName.of("Form"));
      stream.dict.set(PDFName.of("BBox"), doc.context.obj([0, 0, rect.width, rect.height]));
      const resources = doc.context.obj({});
      const fonts = doc.context.obj({});
      fonts.set(PDFName.of("Helv"), font.ref);
      resources.set(PDFName.of("Font"), fonts);
      stream.dict.set(PDFName.of("Resources"), resources);
      const ap = doc.context.obj({});
      ap.set(PDFName.of("N"), doc.context.register(stream));
      widget.dict.set(PDFName.of("AP"), ap);
      if (spec.background) {
        const mk = doc.context.obj({});
        mk.set(PDFName.of("BG"), doc.context.obj([1]));
        widget.dict.set(PDFName.of("MK"), mk);
      }
    }
  }
  return doc.save({ useObjectStreams: false });
}

const unhex = (h) => Buffer.from(h.replace(/[^0-9a-fA-F]/g, ""), "hex").toString("latin1");
function showRuns(text) {
  const out = [];
  for (const m of text.matchAll(/\(((?:\\.|[^\\()])*)\)\s*Tj/g)) out.push(m[1].replace(/\\([()\\])/g, "$1"));
  for (const m of text.matchAll(/<([0-9a-fA-F\s]*)>\s*Tj/g)) out.push(unhex(m[1]));
  for (const m of text.matchAll(/\[((?:[^\][]|\\.)*)\]\s*TJ/g)) {
    let joined = "";
    for (const lit of m[1].matchAll(/\(((?:\\.|[^\\()])*)\)/g)) joined += lit[1].replace(/\\([()\\])/g, "$1");
    for (const hex of m[1].matchAll(/<([0-9a-fA-F\s]*)>/g)) joined += unhex(hex[1]);
    if (joined) out.push(joined);
  }
  return out;
}

/** Every string the finalized page shows, wherever it is stored. */
async function visibleText(bytes) {
  const doc = await PDFDocument.load(bytes, { ignoreEncryption: true, updateMetadata: false });
  const decode = (ref) => {
    const stream = doc.context.lookup(ref);
    if (!stream?.contents) return "";
    const raw = Buffer.from(stream.contents);
    const filter = stream.dict?.get(PDFName.of("Filter"));
    const name = filter ? String(filter) : "";
    if (!name) return raw.toString("latin1");
    if (name.includes("FlateDecode")) { try { return zlib.inflateSync(raw).toString("latin1"); } catch { return ""; } }
    return "";
  };
  const chunks = [];
  for (const page of doc.getPages()) {
    const contents = page.node.get(PDFName.of("Contents"));
    let content = "";
    if (contents instanceof PDFArray) { for (let i = 0; i < contents.size(); i += 1) content += `${decode(contents.get(i))}\n`; }
    else if (contents) content = decode(contents);
    chunks.push(content);

    // Only the XObjects the page actually DRAWS. Flattening can leave an
    // appearance stream registered in Resources that nothing invokes — a widget
    // this run dropped, whose stream pdf-lib regenerated on its way past — and
    // reading Resources wholesale would count that as ink on the filing. It is
    // not: if no `Do` names it, it is not on the page.
    const resources = doc.context.lookup(page.node.get(PDFName.of("Resources")));
    const xobjects = resources instanceof PDFDict ? doc.context.lookup(resources.get(PDFName.of("XObject"))) : null;
    if (!(xobjects instanceof PDFDict)) continue;
    for (const m of content.matchAll(/\/([^\s/<>\[\]()]+)\s+Do\b/g)) {
      const ref = xobjects.get(PDFName.of(m[1]));
      if (ref) chunks.push(decode(ref));
    }
  }
  return showRuns(chunks.join("\n")).join("").replace(/\s+/g, " ");
}

/** Finalizes the fixture through a module, which a mutation may have replaced. */
async function finalize(moduleUrl, { dispositions, written, placeholderDrawsValue = false }) {
  const { sanitizeAndFlatten } = await import(moduleUrl);
  const doc = await PDFDocument.load(await buildFixture({ placeholderDrawsValue }),
    { ignoreEncryption: true, updateMetadata: false });
  const { clean } = await sanitizeAndFlatten(doc, {
    writtenFields: new Set(written),
    appearanceDispositions: dispositions
  });
  // sanitizeAndFlatten hands back the rebuilt document, not its bytes.
  return visibleText(await clean.save({ useObjectStreams: false }));
}

const { PRESERVE_SOURCE_APPEARANCE, RENDER_PARTICIPANT_VALUE_ONLY_WHEN_WRITTEN, SUPPRESS_CONTROL_APPEARANCE }
  = APPEARANCE_DISPOSITION;

// The dispositions a Nebraska caption family carries, in the shape the driver
// hands over: field name to meaning, with no family identity attached.
const DISPOSITIONS = new Map([
  ["enter the type of court", RENDER_PARTICIPANT_VALUE_ONLY_WHEN_WRITTEN],
  ["fullcountystatementRIGHT", PRESERVE_SOURCE_APPEARANCE],
  ["Text24", PRESERVE_SOURCE_APPEARANCE],
  ["bandCover", PRESERVE_SOURCE_APPEARANCE]
]);
const WRITTEN = ["TYPEOFCOURTRESULTS", "printedname", "answeredChooser"];
const MODULE_URL = `file://${MODULE}`;

console.log("appearance-semantics controls");
const unwritten = await finalize(MODULE_URL, { dispositions: DISPOSITIONS, written: WRITTEN });
const written = await finalize(MODULE_URL, {
  dispositions: DISPOSITIONS,
  written: [...WRITTEN, "enter the type of court"],
  placeholderDrawsValue: true
});

const CONTROLS = [
  { id: "an_unwritten_participant_input_contributes_no_appearance",
    holds: () => unwritten.includes(PLACEHOLDER_TEXT) ? `the placeholder ${JSON.stringify(PLACEHOLDER_TEXT)} reached the page` : null },
  { id: "the_same_field_renders_the_participant_value_when_written",
    holds: () => written.includes(PARTICIPANT_COURT) ? null : "the value written into that field is not on the page" },
  { id: "a_source_caption_stored_in_a_widget_appearance_stays_visible",
    holds: () => unwritten.includes(COUNTY_CAPTION) ? null : `${JSON.stringify(COUNTY_CAPTION)} was removed with the placeholder` },
  { id: "in_the_blank_court_of_is_preserved",
    holds: () => unwritten.includes(COURT_OF_BAND) ? null : `${JSON.stringify(COURT_OF_BAND)} is no longer on the page` },
  { id: "county_nebraska_is_preserved",
    holds: () => unwritten.includes(COUNTY_CAPTION) ? null : `${JSON.stringify(COUNTY_CAPTION)} is no longer on the page` },
  { id: "type_of_case_check_only_one_is_preserved",
    holds: () => unwritten.includes(CASE_TYPE_HEADING) ? null : `${JSON.stringify(CASE_TYPE_HEADING)} is no longer on the page` },
  { id: "control_chrome_remains_suppressed",
    holds: () => unwritten.includes(RESET_CAPTION) ? `${JSON.stringify(RESET_CAPTION)} reached the page` : null },
  { id: "answered_choice_behaviour_is_unchanged",
    holds: () => {
      if (unwritten.includes(CHOOSER_PROMPT)) return "an unanswered chooser drew its prompt";
      return unwritten.includes(ANSWERED_OPTION) ? null : "an answered chooser lost its selection";
    } },
  { id: "existing_participant_values_are_unchanged",
    holds: () => unwritten.includes(PARTICIPANT_NAME) && unwritten.includes(COURT_VALUE)
      ? null : "a written participant value is missing" },
  { id: "no_family_form_field_text_or_flag_based_exception_exists",
    holds: () => {
      const source = fs.readFileSync(MODULE, "utf8");
      const start = source.indexOf("export function restrictWidgetContributions");
      const body = source.slice(start, source.indexOf("\n}", start));
      const forbidden = [
        [/NE:|KY:|VA:|VT:/, "a family id"],
        [/CC-6|DC-1|AOC-|CR-2\d\d/, "a form id"],
        [/enter the type of court|fullcountystatementRIGHT|Text24|adoptionof|probateof/, "a field name"],
        [/Enter the type of court|COUNTY, NEBRASKA|Type of Case|Choose |Print Form|Reset Form/, "literal visible text"],
        [/RichText|Multiline|ReadOnly/, "a flag heuristic"],
        [/Ff|0x[0-9a-f]+|1\s*<<\s*\d+/, "a raw /Ff bit test"]
      ];
      const hits = forbidden.filter(([re]) => re.test(body)).map(([, what]) => what);
      if (hits.length) return `restrictWidgetContributions branches on ${hits.join(", ")}`;
      if (!/dispositions\.get\(name\)/.test(body)) return "the function no longer reads a disposition";
      return null;
    } }
];

for (const control of CONTROLS) {
  let problem;
  try { problem = control.holds(); } catch (error) { problem = `threw: ${error.message}`; }
  console.log(`  ${problem ? "FAIL" : "ok  "} ${control.id}`);
  if (problem) note(`${control.id}: ${problem}`);
}

// --- mutations --------------------------------------------------------------
//
// Each removes one arm of the switch from a copy of the module and requires the
// control watching it to go red. The copy sits beside the original so its own
// relative imports still resolve, and is removed on exit.

const MUTATIONS = [
  { id: "break_placeholder_suppression", covers: "an_unwritten_participant_input_contributes_no_appearance",
    mutate: (s) => s.replace(/if \(disposition === APPEARANCE_DISPOSITION\.RENDER_PARTICIPANT_VALUE_ONLY_WHEN_WRITTEN && !writtenFields\.has\(name\)\) \{[\s\S]*?\n    \}\n/, ""),
    detect: (text) => text.includes(PLACEHOLDER_TEXT) },
  { id: "break_participant_written_rendering", covers: "the_same_field_renders_the_participant_value_when_written",
    mutate: (s) => s.replace("=== APPEARANCE_DISPOSITION.RENDER_PARTICIPANT_VALUE_ONLY_WHEN_WRITTEN && !writtenFields.has(name)",
      "=== APPEARANCE_DISPOSITION.RENDER_PARTICIPANT_VALUE_ONLY_WHEN_WRITTEN"),
    run: { written: [...WRITTEN, "enter the type of court"], placeholderDrawsValue: true },
    detect: (text) => !text.includes(PARTICIPANT_COURT) },
  { id: "break_official_caption_preservation", covers: "a_source_caption_stored_in_a_widget_appearance_stays_visible",
    mutate: (s) => s.replace("if (disposition === APPEARANCE_DISPOSITION.PRESERVE_SOURCE_APPEARANCE) report.sourceAppearancesPreserved.push(name);",
      "if (disposition === APPEARANCE_DISPOSITION.PRESERVE_SOURCE_APPEARANCE) { dropWidgets(pdfDoc, acroField); continue; }"),
    detect: (text) => !text.includes(COUNTY_CAPTION) },
  { id: "break_control_chrome_suppression", covers: "control_chrome_remains_suppressed",
    mutate: (s) => s.replace(/if \(disposition === APPEARANCE_DISPOSITION\.SUPPRESS_CONTROL_APPEARANCE\) \{[\s\S]*?\n    \}\n/, ""),
    detect: (text) => text.includes(RESET_CAPTION) }
];

console.log("  mutations");
const original = fs.readFileSync(MODULE, "utf8");
const copies = [];
process.on("exit", () => { for (const file of copies) { try { fs.rmSync(file, { force: true }); } catch { /* best effort */ } } });

for (const [index, mutation] of MUTATIONS.entries()) {
  const mutated = mutation.mutate(original);
  if (mutated === original) {
    console.log(`    FAIL ${mutation.id.padEnd(38)} changed nothing`);
    note(`mutation "${mutation.id}" matched no source text, so ${mutation.covers} proves nothing`);
    continue;
  }
  const copy = path.join(path.dirname(MODULE), `rcap-active-content.mutation-${index}.mjs`);
  copies.push(copy);
  fs.writeFileSync(copy, mutated);
  let wentRed = false;
  try {
    const text = await finalize(`file://${copy}`, { dispositions: DISPOSITIONS, written: WRITTEN, ...(mutation.run ?? {}) });
    wentRed = mutation.detect(text);
  } catch { wentRed = true; }
  fs.rmSync(copy, { force: true });
  console.log(`    ${wentRed ? "ok  " : "FAIL"} ${mutation.id.padEnd(38)} -> ${mutation.covers} goes red`);
  if (!wentRed) note(`mutation "${mutation.id}" changed nothing measurable, so ${mutation.covers} proves nothing`);
}

// The committed registry has to be loadable and cover exactly the five families.
const registry = loadAppearanceSemantics();
const covered = Object.keys(registry.families ?? {}).sort();
const EXPECTED = ["NE:cc-6-11-2-form-en", "NE:cc-6-11-form-en", "NE:cc-6-12-form-en", "NE:cc-6-15-1-form-en", "NE:dc-1-15-form-en"];
if (JSON.stringify(covered) !== JSON.stringify(EXPECTED)) {
  note(`the registry covers ${covered.join(", ")}; the assignment names ${EXPECTED.join(", ")}`);
}
for (const familyId of EXPECTED.filter((f) => !f.includes("dc-1-15"))) {
  const map = dispositionsForFamily(registry, familyId);
  if (map.get("enter the type of court") !== RENDER_PARTICIPANT_VALUE_ONLY_WHEN_WRITTEN) {
    note(`${familyId} does not classify the placeholder field as a participant input`);
  }
  if (map.get("fullcountystatementRIGHT") !== PRESERVE_SOURCE_APPEARANCE) {
    note(`${familyId} does not preserve its county caption`);
  }
}
console.log(`  ok   the registry covers exactly ${covered.length} families`);

if (failures.length) {
  console.error(`FAIL appearance semantics — ${failures.length} problem(s)`);
  for (const failure of failures) console.error(`  ${failure}`);
  process.exit(1);
}
console.log(`OK appearance semantics — ${CONTROLS.length} controls hold on synthetic bytes, `
  + `${MUTATIONS.length} mutations each turn their control red, and the registry covers exactly the five assigned families`);
