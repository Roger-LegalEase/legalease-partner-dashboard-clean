#!/usr/bin/env node
/**
 * A delivered page may not print markdown emphasis delimiters.
 *
 * VF02 found the defect on the Oklahoma trafficking-survivor packet: page 4 of
 * 4, component ok-trafficking-survivor-19c-filing-instructions-2, section
 * "WHEN TO STOP AND GET HELP INSTEAD", a single Tj at x=72.0 baseline y=517.0
 * in Times-Roman 11pt reading
 *
 *   - **this is the first thing the committed record says about this route:**
 *     Oklahoma has a special
 *
 * with the two delimiter pairs at x 78.41-89.41 and 369.99-380.99 -- legible
 * black asterisks at full body size on a page a participant files. VF09 found
 * the same shape on the West Virginia sibling. The string is markdown in
 * participant-instructions.md, where it renders as emphasis correctly; a PDF
 * page renders nothing, so it printed the markup.
 *
 * This test proves four things:
 *
 *   1. the rule DISCRIMINATES -- the pre-repair Oklahoma bytes, recovered from
 *      git rather than described, fail it, on the page and line VF02 named;
 *   2. the repaired bytes now on disk pass it, for both repaired families and
 *      both fixtures;
 *   3. the transform is a NO-OP on everything that is not a closed emphasis
 *      pair, including the `_____` rules that 386 delivered fixtures print and
 *      the identifiers that carry two underscore runs;
 *   4. no word is lost: the repaired page text equals the pre-repair page text
 *      with exactly the delimiter characters removed.
 *
 *   node scripts/rcap-custom-pleading/no-markdown-on-delivered-pages.test.mjs
 */
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

import { extractTextItems, groupIntoLines } from "../rcap-official-forms/rcap-pdf-anchor-capture.mjs";
import {
  stripMarkdownEmphasis,
  markdownDelimitersOnPage,
  assertNoMarkdownDelimitersOnDeliveredPages
} from "./composed-page-markdown.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const require = createRequire(import.meta.url);
const { PDFDocument } = require("pdf-lib");

const OK_DIR = "data/rcap-all50/overlays/census-v1/ok/composed-treatment:obligation:runtime-only:ok:human-trafficking-survivor-relief--custom-pleading";
const WV_DIR = "data/rcap-all50/overlays/census-v1/wv/composed-treatment:obligation:runtime-only:wv:sex-trafficking-victim-vacatur-and-expungement--custom-pleading";
/* The commit the repair was made from: its bytes are the ones VF02 read. */
const PRE_REPAIR_REF = "b96bad780";

const fail = [];
const check = (name, ok, detail = "") => {
  if (!ok) fail.push(`${name}${detail ? `: ${detail}` : ""}`);
  console.log(`  ${ok ? "ok  " : "FAIL"}  ${name}${ok || !detail ? "" : ` -- ${detail}`}`);
};

const pageTexts = async (bytes) => {
  const doc = await PDFDocument.load(bytes, { ignoreEncryption: true, updateMetadata: false });
  return doc.getPages().map((p) => groupIntoLines(extractTextItems(p)).map((l) => l.text).join(" ").replace(/\s+/g, " "));
};
const atRef = (rel) => {
  try { return execFileSync("git", ["show", `${PRE_REPAIR_REF}:${rel}`], { cwd: ROOT, maxBuffer: 1 << 28 }); }
  catch { return null; }
};

/* ---- 1. the rule discriminates: the pre-repair bytes fail it ---------------- */
console.log("\nthe pre-repair bytes VF02 read");
let preRepairPages = null;
for (const fixture of ["canonical", "boundary"]) {
  const bytes = atRef(`${OK_DIR}/fixtures/${fixture}.pdf`);
  if (!bytes) { check(`OK ${fixture} at ${PRE_REPAIR_REF} is readable`, false, "git show returned nothing; this proof needs the pre-repair bytes"); continue; }
  const texts = await pageTexts(bytes);
  if (fixture === "canonical") preRepairPages = texts;
  const hits = texts.flatMap((t, i) => markdownDelimitersOnPage(t).map((h) => ({ page: i + 1, ...h })));
  check(`OK ${fixture} at ${PRE_REPAIR_REF} carries a delimiter pair`, hits.length > 0, "the pre-repair bytes must fail, or this rule proves nothing");
  check(`OK ${fixture} at ${PRE_REPAIR_REF}: the defect is on page 4`, hits.length > 0 && hits.every((h) => h.page === 4), JSON.stringify(hits.map((h) => h.page)));
  let threw = false;
  try { assertNoMarkdownDelimitersOnDeliveredPages(texts, `${fixture} at ${PRE_REPAIR_REF}`); } catch { threw = true; }
  check(`OK ${fixture} at ${PRE_REPAIR_REF}: the build-time assertion throws`, threw);
}

/* ---- 2. the repaired bytes on disk pass ------------------------------------- */
console.log("\nthe bytes on disk now");
for (const [label, dir] of [["OK", OK_DIR], ["WV", WV_DIR]]) {
  for (const fixture of ["canonical", "boundary"]) {
    const rel = `${dir}/fixtures/${fixture}.pdf`;
    const absolute = path.join(ROOT, rel);
    if (!fs.existsSync(absolute)) { check(`${label} ${fixture} present`, false, rel); continue; }
    const texts = await pageTexts(fs.readFileSync(absolute));
    const hits = texts.flatMap((t, i) => markdownDelimitersOnPage(t).map((h) => ({ page: i + 1, ...h })));
    check(`${label} ${fixture}: no delimiter pair on any of its ${texts.length} pages`, hits.length === 0, JSON.stringify(hits.slice(0, 3)));
    let threw = false;
    try { assertNoMarkdownDelimitersOnDeliveredPages(texts, `${label} ${fixture}`); } catch (e) { threw = true; check(`${label} ${fixture}: assertion message`, false, e.message.slice(0, 200)); }
    check(`${label} ${fixture}: the build-time assertion passes`, !threw);
  }
}

/* ---- 3. a no-op on everything that is not emphasis --------------------------- */
console.log("\nwhat the transform must not touch");
const untouched = [
  ["a rule of underscores", "_____"],
  ["a signature rule", "Name: _______________ Date: ____"],
  ["an identifier with two underscore runs", "snake__case__name"],
  ["a lone opening run", "a ** lone asterisk pair"],
  ["a longer asterisk run", "***emphatic***"],
  ["dotted rules", `${".".repeat(84)} ${".".repeat(20)}`],
  ["a route key", "Route: obligation:runtime-only:OK:human-trafficking-survivor-relief"],
  ["ordinary prose", "No committed record this packet binds states a filing fee."]
];
for (const [name, text] of untouched) {
  check(`unchanged: ${name}`, stripMarkdownEmphasis(text) === text, JSON.stringify(stripMarkdownEmphasis(text)));
  check(`not flagged: ${name}`, markdownDelimitersOnPage(text).length === 0);
}
const removed = [
  ["the Oklahoma stop condition", "- **this is the first thing the committed record says about this route:** Oklahoma has a special expungement pathway", "- this is the first thing the committed record says about this route: Oklahoma has a special expungement pathway"],
  ["underscore emphasis", "__really__ bold", "really bold"],
  ["two pairs on one line", "**a** and **b**", "a and b"]
];
for (const [name, before, after] of removed) {
  check(`removed: ${name}`, stripMarkdownEmphasis(before) === after, JSON.stringify(stripMarkdownEmphasis(before)));
}

/* ---- 4. nothing but the delimiters left the page ----------------------------- */
console.log("\nno word was lost from the repaired page");
if (preRepairPages) {
  const now = await pageTexts(fs.readFileSync(path.join(ROOT, `${OK_DIR}/fixtures/canonical.pdf`)));
  const words = (pages) => pages.join(" ").replace(/\*\*/g, "").replace(/\s+/g, " ").trim();
  check("OK canonical: page text is identical once the delimiters are discounted", words(preRepairPages) === words(now),
    `${words(preRepairPages).length} chars before vs ${words(now).length} after`);
  check("OK canonical: page count unchanged", preRepairPages.length === now.length, `${preRepairPages.length} -> ${now.length}`);
}

console.log(`\n${fail.length === 0 ? "NO_MARKDOWN_ON_DELIVERED_PAGES_PROVEN" : `FAILED (${fail.length})`}`);
for (const f of fail) console.log(`  ${f}`);
process.exit(fail.length === 0 ? 0 : 1);
