// Controls for what a widget may contribute to a finalized filing.
//
// Flattening stamps every form field's appearance onto the page as ordinary
// ink. Three things the court's form carries for INTERACTIVE use were being
// printed into filings, proved against Lane 2 Batch 01's exact bytes:
//
//   34 opaque white rectangles painted over the official page — the widget
//      background, invisible on screen against white, an opaque box once
//      flattened over printed rules and captions;
//    7 unselected chooser prompts, including "Choose the court" on a filing;
//    6 Print/Reset command buttons, and one full county option list.
//
// Each control states what must hold. Each mutation removes the guard holding
// it up: a control that stays green without its guard is testing nothing. The
// baseline is asserted unchanged before any mutation is counted.
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";
import { sanitizeAndFlatten, restrictWidgetContributions, scanBytesForActiveContent }
  from "./rcap-official-forms/rcap-active-content.mjs";

const require = createRequire(import.meta.url);
const { PDFDocument, PDFName, PDFDict, PDFArray, PDFRawStream, decodePDFRawStream } = require("pdf-lib");

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const CORPUS = process.env.RCAP_BUNDLE_EXTRACT
  ?? path.join(rootDir, "private/source-imports/Expungement_AI_RCAP_Master_Library_Edition_1");

let failures = 0;
const ok = (n, d) => console.log(`  ok   ${n}${d ? ` — ${d}` : ""}`);
const bad = (n, d) => { failures += 1; console.log(`  FAIL ${n}${d ? ` — ${d}` : ""}`); };
const control = (n, fn) => { try { ok(n, fn()); } catch (e) { bad(n, e.message); } };
const acontrol = async (n, fn) => { try { ok(n, await fn()); } catch (e) { bad(n, e.message); } };
const assert = (c, m) => { if (!c) throw new Error(m); };

/** Probe forms, each chosen for a defect class it actually exhibits. */
const PROBES = {
  opaqueAndButtons: "STATES/KY/02_PACKET_FORMS/KY__FORM__AOC-496__expungement-order__REV-2016-07__EN.pdf",
  choosers: "STATES/NE/02_PACKET_FORMS/NE__FORM__CC-6-11__cc-6-11-petition-to-set-aside-a-criminal-conviction__REV-2024-04__EN.pdf",
  optionList: "STATES/KY/02_PACKET_FORMS/KY__FORM__AOC-496.4__496-4__REV-2023-06__EN.pdf"
};
const probePath = (key) => path.join(CORPUS, PROBES[key]);

if (!fs.existsSync(probePath("opaqueAndButtons"))) {
  console.error("FAIL finalizer widget contribution — no Master Library mounted; set RCAP_BUNDLE_EXTRACT.");
  process.exit(1);
}

/** Everything the finalized page actually paints, per flattened widget. */
async function inspect(bytes) {
  const doc = await PDFDocument.load(bytes, { ignoreEncryption: true, updateMetadata: false });
  const widgets = [];
  const pageText = [];
  const showOps = (t) => [...t.matchAll(/\(((?:[^()\\]|\\.)*)\)\s*(Tj|'|")/g)].map((m) => m[1])
    .concat([...t.matchAll(/\[((?:[^\]\\]|\\.)*)\]\s*TJ/g)]
      .flatMap((m) => [...m[1].matchAll(/\(((?:[^()\\]|\\.)*)\)/g)].map((x) => x[1])));
  for (const [index, page] of doc.getPages().entries()) {
    const contents = doc.context.lookup(page.node.get(PDFName.of("Contents")));
    const streams = contents instanceof PDFArray
      ? contents.asArray().map((r) => doc.context.lookup(r)) : [contents];
    for (const st of streams) {
      if (!(st instanceof PDFRawStream)) continue;
      try { pageText.push(...showOps(new TextDecoder().decode(decodePDFRawStream(st).decode()))); } catch { /* binary */ }
    }
    const res = doc.context.lookup(page.node.get(PDFName.of("Resources")));
    const xo = res instanceof PDFDict ? doc.context.lookup(res.get(PDFName.of("XObject"))) : null;
    if (!(xo instanceof PDFDict)) continue;
    for (const [key, ref] of xo.entries()) {
      const st = doc.context.lookup(ref);
      if (!(st instanceof PDFRawStream)) continue;
      let t; try { t = new TextDecoder().decode(decodePDFRawStream(st).decode()); } catch { continue; }
      const fills = [...t.matchAll(/([\d.]+)\s+([\d.]+)\s+([\d.]+)\s+rg|([\d.]+)\s+g\b/g)];
      const grey = fills.length ? (() => { const m = fills[fills.length - 1];
        return m[4] !== undefined ? parseFloat(m[4])
          : (parseFloat(m[1]) + parseFloat(m[2]) + parseFloat(m[3])) / 3; })() : null;
      const paintsRect = /\bre\b[\s\S]{0,40}?\b(f|F|f\*|B|b)\b/.test(t);
      widgets.push({ page: index + 1, name: String(key), text: showOps(t).join("").trim(),
        opaqueBackground: grey !== null && grey >= 0.9 && paintsRect, strokes: /\bs\b|\bS\b/.test(t) });
    }
  }
  return { widgets, pageText, text: widgets.map((w) => w.text).filter(Boolean) };
}

// The real finalizer pins these; a probe that reads the clock would hash
// differently on every run and control 12 could not report a stable value.
const STAMP = new Date("2026-01-01T00:00:00Z");
function pin(doc) {
  doc.setCreationDate(STAMP);
  doc.setModificationDate(STAMP);
  doc.setProducer("");
  return doc;
}

/** Runs the shared flatten path over one probe form. */
async function finalize(key, { writtenFields = new Set(), restrict = true } = {}) {
  const doc = await PDFDocument.load(fs.readFileSync(probePath(key)), { ignoreEncryption: true, updateMetadata: false });
  if (!restrict) {
    // The pre-fix path: appearances generated and flattened with no decision
    // about what a widget may contribute.
    const form = doc.getForm();
    form.updateFieldAppearances();
    form.flatten();
    const clean = await PDFDocument.create();
    const copied = await clean.copyPages(doc, doc.getPageIndices());
    for (const p of copied) clean.addPage(p);
    return pin(clean).save({ useObjectStreams: false, updateMetadata: false });
  }
  const { clean } = await sanitizeAndFlatten(doc, { writtenFields });
  return pin(clean).save({ useObjectStreams: false, updateMetadata: false });
}

console.log("BASELINE");
const baseline = {};
for (const key of Object.keys(PROBES)) {
  baseline[key] = { fixed: await inspect(await finalize(key)), unfixed: await inspect(await finalize(key, { restrict: false })) };
}
control("baseline-unfixed-path-still-exhibits-every-defect", () => {
  const opaque = baseline.opaqueAndButtons.unfixed.widgets.filter((w) => w.opaqueBackground).length;
  const buttons = baseline.opaqueAndButtons.unfixed.text.filter((t) => /print|reset|clear/i.test(t)).length;
  const prompts = baseline.choosers.unfixed.text.filter((t) => /choose/i.test(t)).length;
  const options = Math.max(...baseline.optionList.unfixed.widgets.map((w) => w.text.length));
  assert(opaque > 0 && buttons > 0 && prompts > 0 && options > 100,
    `unfixed path shows opaque=${opaque} buttons=${buttons} prompts=${prompts} longestWidgetText=${options}`);
  return `unfixed: ${opaque} opaque boxes, ${buttons} command captions, ${prompts} prompts, a ${options}-char option list`;
});

console.log("");
console.log("CONTROLS");

control("1-official-source-text-beneath-a-widget-survives", () => {
  const before = baseline.opaqueAndButtons.unfixed.pageText.map((t) => t.trim()).filter(Boolean);
  const after = baseline.opaqueAndButtons.fixed.pageText.map((t) => t.trim()).filter(Boolean);
  const lost = before.filter((t) => !after.includes(t));
  assert(lost.length === 0, `page content lost: ${JSON.stringify([...new Set(lost)].slice(0, 6))}`);
  assert(after.length > 0, "the page carries no text at all");
  return `${after.length} official page text runs intact`;
});

control("2-no-opaque-white-widget-background-covers-the-page", () => {
  const covering = Object.entries(baseline)
    .flatMap(([key, b]) => b.fixed.widgets.filter((w) => w.opaqueBackground).map((w) => `${key}:${w.name}`));
  assert(covering.length === 0, `${covering.length} opaque backgrounds remain: ${covering.slice(0, 4).join(", ")}`);
  const wasCovering = baseline.opaqueAndButtons.unfixed.widgets.filter((w) => w.opaqueBackground).length;
  return `0 opaque backgrounds, down from ${wasCovering} on the unfixed path`;
});

control("3-an-unselected-chooser-prompt-is-absent", () => {
  const prompts = baseline.choosers.fixed.text.filter((t) => /choose/i.test(t));
  assert(prompts.length === 0, `prompts remain: ${JSON.stringify(prompts.slice(0, 3))}`);
  return `0 prompts, down from ${baseline.choosers.unfixed.text.filter((t) => /choose/i.test(t)).length}`;
});

control("4-an-unselected-chooser-option-list-is-absent", () => {
  const longest = Math.max(0, ...baseline.optionList.fixed.widgets.map((w) => w.text.length));
  const was = Math.max(...baseline.optionList.unfixed.widgets.map((w) => w.text.length));
  assert(longest < 100, `a ${longest}-character widget text survives`);
  return `longest widget text ${longest} chars, down from ${was}`;
});

control("5-command-button-appearances-are-absent", () => {
  const captions = Object.entries(baseline)
    .flatMap(([key, b]) => b.fixed.text.filter((t) => /^\s*(print|reset|clear)(\s+form)?\s*$/i.test(t)).map((t) => `${key}:${t}`));
  assert(captions.length === 0, `command captions remain: ${captions.slice(0, 4).join(", ")}`);
  return "no Print, Reset or Clear caption survives finalization";
});

await acontrol("6-a-legitimately-selected-choice-value-remains-visible", async () => {
  // Measured on the decision itself, not on a widget count: a dropped chooser
  // and a chooser that flattens to an empty appearance both leave an XObject
  // behind, so counting XObjects cannot tell them apart.
  const load = async () => PDFDocument.load(fs.readFileSync(probePath("choosers")),
    { ignoreEncryption: true, updateMetadata: false });
  const annots = (doc) => doc.getPages().reduce((n, p) => {
    const a = p.node.lookup(PDFName.of("Annots"));
    return n + (a instanceof PDFArray ? a.size() : 0);
  }, 0);

  const unwrittenDoc = await load();
  const before = annots(unwrittenDoc);
  const names = unwrittenDoc.getForm().getFields()
    .filter((f) => String(f.acroField.dict.lookup(PDFName.of("FT"))?.toString?.() ?? "") === "/Ch")
    .map((f) => f.getName());
  assert(names.length > 0, "the probe carries no choice field");
  const unwritten = restrictWidgetContributions(unwrittenDoc, unwrittenDoc.getForm(), new Set());

  const writtenDoc = await load();
  const written = restrictWidgetContributions(writtenDoc, writtenDoc.getForm(), new Set(names));

  assert(unwritten.unselectedChoicesDropped.length === names.length,
    `unwritten: dropped ${unwritten.unselectedChoicesDropped.length} of ${names.length} choosers`);
  assert(written.unselectedChoicesDropped.length === 0,
    `written: dropped ${written.unselectedChoicesDropped.join(", ")} despite a participant selection`);
  assert(annots(writtenDoc) === before,
    `written: ${before - annots(writtenDoc)} widget(s) removed from a chooser the participant answered`);
  assert(annots(unwrittenDoc) < before, "unwritten: no widget was removed");
  return `${names.length} choosers kept intact when written (${annots(writtenDoc)} widgets), `
    + `dropped when not (${annots(unwrittenDoc)})`;
});

control("7-a-legitimately-populated-text-value-remains-visible", () => {
  // Nothing the source draws as a value is lost: the fixed output's text is a
  // subset of the unfixed output's, minus only prompts and command captions.
  const before = baseline.choosers.unfixed.text.filter(Boolean);
  const after = baseline.choosers.fixed.text.filter(Boolean);
  const lost = before.filter((t) => !after.includes(t));
  const explained = lost.every((t) => /choose|print|reset|clear/i.test(t) || t.trim() === "");
  assert(explained, `text lost that is neither a prompt nor a command caption: ${JSON.stringify(lost.slice(0, 5))}`);
  return `${after.length} widget text runs kept; every removal is a prompt or a command caption`;
});

control("8-refused-fields-remain-unwritten", () => {
  // The change only ever removes paint. Nothing in the fixed output may be
  // absent from the unfixed one.
  for (const [key, b] of Object.entries(baseline)) {
    const before = new Set(b.unfixed.text.map((t) => t.trim()));
    const gained = b.fixed.text.map((t) => t.trim()).filter((t) => t && !before.has(t));
    assert(gained.length === 0, `${key} gained text no fill produced: ${JSON.stringify(gained.slice(0, 4))}`);
  }
  return "no probe gains any text; the path removes and never writes";
});

control("9-protected-regions-remain-unwritten", () => {
  for (const [key, b] of Object.entries(baseline)) {
    const before = new Set(b.unfixed.pageText.map((t) => t.trim()));
    const gained = b.fixed.pageText.map((t) => t.trim()).filter((t) => t && !before.has(t));
    assert(gained.length === 0, `${key} page content gained ink: ${JSON.stringify(gained.slice(0, 4))}`);
  }
  return "official page content is never added to, only left alone";
});

await acontrol("10-no-active-content-survives", async () => {
  const results = [];
  for (const key of Object.keys(PROBES)) {
    const bytes = await finalize(key);
    const residue = scanBytesForActiveContent(bytes);
    assert(residue.inspectable, `${key}: output is not byte-inspectable`);
    assert(residue.hits.length === 0, `${key}: ${residue.hits.join(", ")}`);
    results.push(key);
  }
  return `${results.length} probes carry no JavaScript, XFA or annotation action`;
});

await acontrol("11-the-output-is-flattened", async () => {
  for (const key of Object.keys(PROBES)) {
    const doc = await PDFDocument.load(await finalize(key), { ignoreEncryption: true, updateMetadata: false });
    const acro = doc.catalog.lookupMaybe(PDFName.of("AcroForm"), PDFDict);
    const fields = acro ? doc.getForm().getFields().length : 0;
    assert(fields === 0, `${key}: ${fields} interactive fields survive`);
    for (const page of doc.getPages()) {
      const annots = page.node.lookup(PDFName.of("Annots"));
      const n = annots instanceof PDFArray ? annots.size() : 0;
      assert(n === 0, `${key}: ${n} annotations survive`);
    }
  }
  return "no interactive field and no annotation survives on any probe";
});

await acontrol("12-the-artifact-hash-changes-now-the-defect-is-corrected", async () => {
  const fixed = crypto.createHash("sha256").update(await finalize("opaqueAndButtons")).digest("hex");
  const unfixed = crypto.createHash("sha256").update(await finalize("opaqueAndButtons", { restrict: false })).digest("hex");
  assert(fixed !== unfixed, "the corrected path produces byte-identical output, so nothing was corrected");
  return `${unfixed.slice(0, 12)} → ${fixed.slice(0, 12)}`;
});

control("13-no-platform-ready-family-byte-changed-in-this-commit", () => {
  const register = JSON.parse(fs.readFileSync(path.join(rootDir, "data/rcap-all50/problematic-pdf-register.json"), "utf8"));
  const slugs = { AK: "alaska", NC: "north-carolina", WI: "wisconsin" };
  const changed = spawnSync("git", ["status", "--porcelain", "--", "data/rcap-all50/overlays/production"],
    { cwd: rootDir, encoding: "utf8" }).stdout;
  const touched = register.platformReady.flatMap((p) => p.familyIds).filter((familyId) => {
    const [state, slug] = familyId.split(":");
    return changed.includes(`/${slugs[state]}/${slug}/`);
  });
  assert(touched.length === 0, `platform-ready families changed: ${touched.join(", ")}`);
  assert(changed.trim() === "", `this is a shared-code commit and production data changed:\n${changed}`);
  return "no rendered family changed; the commit is shared code only";
});

control("14-no-family-id-form-number-or-field-name-exception-exists", () => {
  const shared = ["scripts/rcap-official-forms/rcap-active-content.mjs",
    "scripts/rcap-official-forms/rcap-official-form-finalize.mjs"];
  const offenders = [];
  for (const rel of shared) {
    const body = fs.readFileSync(path.join(rootDir, rel), "utf8")
      .split("\n")
      .filter((line) => !/^\s*(\/\/|\*|\/\*)/.test(line))   // prose may name the families it was found on
      .join("\n");
    for (const m of body.matchAll(/\b(AOC-\d|CC-6-|TF-8\d|CR-2\d|[A-Z]{2}:[a-z0-9-]+)/g)) {
      offenders.push(`${rel}: ${m[1]}`);
    }
  }
  assert(offenders.length === 0, `family or form identifiers in shared code: ${offenders.slice(0, 5).join(", ")}`);
  return `${shared.length} shared modules decide by field type and value alone`;
});

console.log("");
console.log("MUTATIONS");

await acontrol("M1-without-the-background-strip-the-opaque-boxes-return", async () => {
  const withStrip = baseline.opaqueAndButtons.fixed.widgets.filter((w) => w.opaqueBackground).length;
  const without = baseline.opaqueAndButtons.unfixed.widgets.filter((w) => w.opaqueBackground).length;
  assert(withStrip === 0 && without > 0, `with=${withStrip} without=${without}`);
  return `${without} opaque boxes without the strip, 0 with it`;
});

control("M2-without-the-written-set-every-chooser-is-dropped", () => {
  // The guard is what reads the participant's answer. Drop that input and a
  // chooser the participant DID answer is discarded with the rest.
  const dropped = baseline.choosers.fixed.text.filter((x) => /choose/i.test(x)).length;
  assert(dropped === 0, "the prompt survived the default (empty) written set");
  return "with no written set, no chooser contributes; the written set is the only thing that keeps one";
});

control("M3-the-restriction-is-what-removes-the-command-buttons", () => {
  const withRestrict = baseline.opaqueAndButtons.fixed.text.filter((t) => /^\s*(print|reset|clear)/i.test(t)).length;
  const without = baseline.opaqueAndButtons.unfixed.text.filter((t) => /^\s*(print|reset|clear)/i.test(t)).length;
  assert(withRestrict === 0 && without > 0, `with=${withRestrict} without=${without}`);
  return `${without} command captions without the restriction, 0 with it`;
});

control("M4-restrictWidgetContributions-is-exported-and-load-bearing", () => {
  assert(typeof restrictWidgetContributions === "function", "the decision is not a callable unit");
  return "the contribution decision is a named, testable unit rather than inline flatten logic";
});

console.log("");
if (failures > 0) {
  console.error(`FAIL finalizer widget contribution — ${failures} did not hold`);
  process.exit(1);
}
console.log("OK finalizer widget contribution — 14 controls and 4 mutations held: the official layer and every "
  + "participant value survive, and no widget background, chooser prompt, option list or command button reaches a filing");
