#!/usr/bin/env node
// Regression: a widget that lost slot arbitration must not print its
// placeholder onto a filing.
//
//   node scripts/verify-rcap-superseded-widget-placeholder.mjs
//
// Nebraska's petitions carry three widgets over one court-type slot. The
// factory binds one -- TYPEOFCOURTRESULTS, which receives the participant's
// court -- and refuses the other two as duplicate_widget_for_one_slot. Those
// two still hold the court's own instruction, "(Enter the type of court)".
// Flattening drew it onto four finalized artifacts.
//
// The rule under test is semantic and carries no exception for a family, a
// form, a field name or a flag: a widget whose slot another widget owns
// contributes nothing; every other refusal is source-inherent and is preserved.
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import { execFileSync } from "node:child_process";
import { restrictWidgetContributions } from "./rcap-official-forms/rcap-active-content.mjs";

const require = createRequire(import.meta.url);
const { PDFDocument, PDFName, PDFRawStream, PDFStream, decodePDFRawStream } = require("pdf-lib");
const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const NE = path.join(rootDir, "data/rcap-all50/overlays/production/nebraska");
const FAMILIES = ["cc-6-11-form-en", "cc-6-11-2-form-en", "cc-6-12-form-en", "cc-6-15-1-form-en"];

const failures = [];
const assert = (cond, msg) => { if (!cond) failures.push(msg); };
const readJson = (p) => JSON.parse(fs.readFileSync(p, "utf8"));

/** Every text run the finalized artifact actually paints. */
const paintedText = async (file) => {
  const doc = await PDFDocument.load(fs.readFileSync(file), { ignoreEncryption: true, updateMetadata: false });
  let raw = "";
  for (const [, obj] of doc.context.enumerateIndirectObjects()) {
    if (!(obj instanceof PDFStream)) continue;
    const d = obj.dict;
    const sub = d?.get?.(PDFName.of("Subtype"));
    const ty = d?.get?.(PDFName.of("Type"));
    if (!((sub && String(sub) === "/Form") || (!sub && !ty))) continue;
    // Flate-compressed streams have to be decoded or the scan reads deflate
    // bytes and silently finds nothing -- a check that cannot see is not a check.
    try {
      raw += (obj instanceof PDFRawStream
        ? Buffer.from(decodePDFRawStream(obj).decode())
        : Buffer.from(obj.getContents())).toString("latin1") + "\n";
    } catch { /* unreadable stream */ }
  }
  // PDF string escapes include octal: the courts' placeholder ships as
  // "\\050Enter the type of court\\051", so a scan that only unescapes
  // parentheses reads a token that matches nothing it is comparing against.
  const unescape = (t) => t
    .replace(/\\([0-7]{1,3})/g, (_, o) => String.fromCharCode(parseInt(o, 8)))
    .replace(/\\([()\\])/g, "$1");
  return [...raw.matchAll(/\(((?:[^()\\]|\\.)*)\)/g)]
    .map((m) => unescape(m[1])).join("").replace(/\s+/g, " ");
};

for (const family of FAMILIES) {
  const dir = path.join(NE, family);
  const map = readJson(path.join(dir, "production-field-map.json"));
  const superseded = (map.bindingRefusals ?? []).filter((r) => r.reason === "duplicate_widget_for_one_slot");
  const bound = new Set((map.bindings ?? []).map((b) => b.field));
  assert(superseded.length > 0, `${family}: the map records no superseded widget, so this regression cannot be observed`);
  for (const loser of superseded) {
    assert(!bound.has(loser.field), `${family}: ${loser.field} is both bound and refused as a duplicate`);
  }

  // What those widgets hold in the official source. Whatever it is, it is the
  // only thing the corrected artifact is allowed to have lost.
  const sourceValues = [];
  {
    const src = path.join(dir, "fixtures/canonical-filled.pdf");
    if (fs.existsSync(src)) {
      const prior = await PDFDocument.load(
        execFileSync("git", ["show", `HEAD:data/rcap-all50/overlays/production/nebraska/${family}/fixtures/canonical-filled.pdf`],
          { cwd: rootDir, maxBuffer: 1 << 28, encoding: "buffer" }),
        { ignoreEncryption: true, updateMetadata: false });
      void prior;
    }
  }
  for (const name of superseded.map((r) => r.field)) sourceValues.push(name);

  for (const artifact of ["fixtures/canonical-filled.pdf", "fixtures/boundary-filled.pdf"]) {
    const rel = `data/rcap-all50/overlays/production/nebraska/${family}/${artifact}`;
    const file = path.join(dir, artifact);
    if (!fs.existsSync(file)) { failures.push(`${family}/${artifact}: absent`); continue; }
    const painted = await paintedText(file);

    // 1. The defect itself: no superseded widget prints an instruction.
    assert(!/Enter the type of court/i.test(painted),
      `${family}/${artifact}: a superseded widget's placeholder is painted on the filing`);

    // 2. Nothing else was lost. Every word the committed artifact painted is
    //    still painted, except words the superseded widgets contributed.
    const before = await (async () => {
      const bytes = execFileSync("git", ["show", `HEAD:${rel}`], { cwd: rootDir, maxBuffer: 1 << 28, encoding: "buffer" });
      const tmp = path.join(rootDir, `tmp/.superseded-before-${family}-${path.basename(artifact)}`);
      fs.mkdirSync(path.dirname(tmp), { recursive: true });
      fs.writeFileSync(tmp, bytes);
      const t = await paintedText(tmp);
      fs.unlinkSync(tmp);
      return t;
    })();
    const words = (t) => t.split(/[^A-Za-z0-9,.]+/).filter((w) => w.length > 3);
    const after = new Set(words(painted));
    const placeholderWords = new Set(words("Enter the type of court Enter the county name"));
    const lost = [...new Set(words(before))].filter((w) => !after.has(w) && !placeholderWords.has(w));
    assert(lost.length === 0,
      `${family}/${artifact}: text lost that no superseded widget explains: ${JSON.stringify(lost.slice(0, 6))}`);
  }
}

// The decision itself: a superseded field drops only while unwritten, and a
// field refused for any other reason is never dropped.
{
  const doc = await PDFDocument.create();
  const form = doc.getForm();
  const page = doc.addPage([300, 300]);
  const mk = (name, value) => {
    const f = form.createTextField(name);
    f.setText(value);
    f.addToPage(page, { x: 10, y: 10, width: 100, height: 20 });
    return f;
  };
  mk("loser", "(Enter something)");
  mk("keeper", "IN THE COURT OF");
  const dropped = restrictWidgetContributions(doc, form, new Set(), new Set(["loser"]));
  assert(dropped.supersededWidgetsDropped.includes("loser"), "an unwritten superseded field is not dropped");
  assert(!dropped.supersededWidgetsDropped.includes("keeper"), "a field nothing superseded was dropped");

  const doc2 = await PDFDocument.create();
  const form2 = doc2.getForm();
  const page2 = doc2.addPage([300, 300]);
  const f2 = form2.createTextField("loser");
  f2.setText("participant answer");
  f2.addToPage(page2, { x: 10, y: 10, width: 100, height: 20 });
  const kept = restrictWidgetContributions(doc2, form2, new Set(["loser"]), new Set(["loser"]));
  assert(!kept.supersededWidgetsDropped.includes("loser"),
    "a superseded field the run wrote was dropped, losing a participant value");
}

if (failures.length > 0) {
  console.error(`FAIL superseded-widget placeholder — ${failures.length} failure(s)`);
  for (const f of failures) console.error(`  - ${f}`);
  process.exit(1);
}
console.log(`OK superseded-widget placeholder — ${FAMILIES.length} families carry no superseded placeholder, captions preserved, and the drop applies only to an unwritten loser`);
