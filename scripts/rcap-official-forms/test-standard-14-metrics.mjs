#!/usr/bin/env node
// The two-direction control over base-14 font metrics, on real delivered pages.
//
//   node scripts/rcap-official-forms/test-standard-14-metrics.mjs
//
// A geometry check computes a drawn string's width from font metrics and
// compares its end x against a write box, a clip window or a page margin. If
// the metrics do not come from the font the page actually uses, the check
// reports a number with nothing to do with the page, and it fails silently in
// BOTH directions:
//
//   Helvetica metrics on a Times page MANUFACTURE an overflow that is not
//   there, and send a repair lane after a defect that does not exist.
//
//   Times metrics on a Helvetica page HIDE an overflow that is there, and ship
//   a clipped filing under a green counter. That is the worse direction, and a
//   test that only proves the first one leaves it unproven.
//
// So both are proved here, and neither on a synthetic page. Every case below is
// a run this repository has already delivered, named by file, page, origin and
// type size, so a reader can open the artifact and check the number.
//
// Nothing here writes. No packet, overlay, manifest or fixture is touched.
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

import { extractTextItems, extractPageGeometry } from "./rcap-pdf-anchor-capture.mjs";
import { measureStandard14, isStandard14, normalizeBaseFontName, STANDARD_14_FACES }
  from "./rcap-standard-14-metrics.mjs";

const require = createRequire(import.meta.url);
const { PDFDocument } = require("pdf-lib");

const thisFile = fileURLToPath(import.meta.url);
const rootDir = path.resolve(path.dirname(thisFile), "..", "..");
process.chdir(rootDir);

/**
 * The ruler this replaces: a uniform half-em advance for every glyph of every
 * font that carried no /Widths array.
 *
 * It is reproduced here rather than described, because a control that cannot
 * state the wrong answer cannot prove the right one is different.
 */
const HALF_EM_MILS = 500;
const halfEmWidth = (glyphCount, size) => Number(((glyphCount * HALF_EM_MILS / 1000) * size).toFixed(2));

// The reproduction above models the metric term only. The committed reader also
// folded /Tc, /Tw and /Tz into the same advance, so on a run that sets any of
// them its reading differs from this model by a fraction of a point (the PA
// case below: 170.16 against 170.20). The corrected numbers are asserted
// exactly, because they come straight from the module under test; the half-em
// reproduction is asserted to a tenth of a point, because it is a model of code
// that no longer exists.
const HALF_EM_TOLERANCE = 0.1;
const closeTo = (actual, expected, what) => assert.ok(Math.abs(actual - expected) <= HALF_EM_TOLERANCE,
  `${what}: ${actual} is not within ${HALF_EM_TOLERANCE} of ${expected}`);

const failures = [];
// Awaited, so a rejected assertion inside an async control is a failure rather
// than an unhandled rejection that leaves the run reporting success.
async function check(name, fn) {
  try { await fn(); process.stdout.write(`  ok   ${name}\n`); }
  catch (error) { failures.push({ name, error }); process.stdout.write(`  FAIL ${name}\n         ${error.message}\n`); }
}

function pageOf(file, pageNumber) {
  const bytes = fs.readFileSync(file);
  return PDFDocument.load(bytes, { ignoreEncryption: true, updateMetadata: false })
    .then((doc) => doc.getPages()[pageNumber - 1]);
}

function findRun(items, text, x) {
  const hit = items.find((i) => i.text === text && Math.abs(i.x - x) < 0.05);
  assert.ok(hit, `no run "${text}" at x=${x} on this page`);
  return hit;
}

console.log("standard-14 metrics: the two directions, on delivered pages\n");

// ---------------------------------------------------------------------------
// 0. The metrics themselves, against the four numbers the defect turns on.
// ---------------------------------------------------------------------------
await check("Times-Roman and Helvetica differ across lowercase by the known amounts", () => {
  const at1000 = (face, ch) => measureStandard14(face, ch, 1000, { encoding: "WinAnsiEncoding" }).width;
  for (const [ch, times, helvetica] of [["a", 444, 556], ["e", 444, 556], ["n", 500, 556], ["s", 389, 500]]) {
    assert.equal(at1000("Times-Roman", ch), times, `Times-Roman "${ch}"`);
    assert.equal(at1000("Helvetica", ch), helvetica, `Helvetica "${ch}"`);
  }
});

await check("a face with no AFM here measures to null, never to a guess", () => {
  // Arial is the face a viewer SUBSTITUTES Helvetica for. Their metrics are
  // close, and treating a substitution as a measurement is the defect in
  // miniature, so this refuses rather than approximates.
  assert.equal(isStandard14("ArialMT"), false);
  assert.equal(measureStandard14("ArialMT", "petitioner", 10, { encoding: "WinAnsiEncoding" }), null);
  assert.equal(measureStandard14("HVCGOJ+TimesNewRomanPSMT", "petitioner", 10, {}), null);
  // A subset tag on a standard name is stripped, not used to refuse.
  assert.equal(normalizeBaseFontName("ABCDEF+Helvetica"), "Helvetica");
  assert.equal(STANDARD_14_FACES.length, 14);
});

await check("StandardEncoding and WinAnsiEncoding disagree where they really disagree", () => {
  // Code 39 is quoteright (222) under Standard and quotesingle (191) under
  // WinAnsi in Helvetica; code 96 is quoteleft (222) vs grave (333).
  const w = (enc, ch) => measureStandard14("Helvetica", ch, 1000, { encoding: enc }).width;
  assert.equal(w("StandardEncoding", "'"), 222);
  assert.equal(w("WinAnsiEncoding", "'"), 191);
  assert.equal(w("StandardEncoding", "`"), 222);
  assert.equal(w("WinAnsiEncoding", "`"), 333);
});

// ---------------------------------------------------------------------------
// 1. DIRECTION ONE -- manufactured overflow, on a real Times-Roman page.
//
// Rhode Island's decriminalized-record packet composes its own order page,
// because Rhode Island publishes no template for one. It is drawn in base-14
// Times-Roman at 11pt from the left margin at x=72 on a 612pt page, so its body
// lines are exactly the shape the half-em ruler reads worst.
// ---------------------------------------------------------------------------
const RI = "data/rcap-all50/overlays/census-v1/ri/ri-decriminalized-set--official-pdf-fill/fixtures/boundary.pdf";
const RI_LINE = "above-referenced case under R.I. Gen. Laws Sec. 12-1.3-2(g) and Sec. 12-1.3-3(e), and on the Affidavit in";
// The same page, same font, same type size, drawn in capitals -- where the same
// half-em ruler errs the OTHER way. Both directions, on one delivered page.
const RI_CAPS = "THIS IS NOT A FORM PUBLISHED BY THE RHODE ISLAND JUDICIARY. Instruction 7 on page 1";

await check("RI composed order page 5 is drawn in base-14 Times-Roman with no /Widths", async () => {
  const items = extractTextItems(await pageOf(RI, 5));
  const run = findRun(items, RI_LINE, 72);
  assert.equal(run.baseFont, "Times-Roman");
  assert.equal(run.metricsSource, "afm:@pdf-lib/standard-fonts:Times-Roman");
  assert.equal(run.metricsExact, true);
});

await check("the half-em ruler puts that line 55.5pt past the right margin; it is 53.7pt clear", async () => {
  const page = await pageOf(RI, 5);
  const items = extractTextItems(page);
  const run = findRun(items, RI_LINE, 72);
  const margin = 594;                       // 0.25in inside a 612pt page edge
  const glyphs = run.chars.length;

  const halfEm = halfEmWidth(glyphs, run.size);
  const halfEmEnd = Number((run.x + halfEm).toFixed(2));
  const realEnd = Number((run.x + run.width).toFixed(2));

  // What the old ruler said: an overflow of 55.5pt past the right margin.
  closeTo(halfEm, 577.5, "half-em width");
  closeTo(halfEmEnd, 649.5, "half-em end x");
  assert.ok(halfEmEnd > margin, "the old ruler must report this line as overflowing, or this control proves nothing");
  closeTo(halfEmEnd - margin, 55.5, "half-em overflow");

  // What Times-Roman's own metrics say: it clears the margin by 53.73pt.
  assert.equal(Number(run.width.toFixed(2)), 468.27);
  assert.equal(realEnd, 540.27);
  assert.ok(realEnd <= margin, "measured with Times metrics this line must clear the margin");
  assert.equal(Number((margin - realEnd).toFixed(2)), 53.73);

  // The whole error, in one number: the half-em ruler read 109.23pt too wide.
  closeTo(halfEm - run.width, 109.23, "over-read");
});

await check("the SAME page, same font, same size, in capitals: the half-em ruler reads NARROW", async () => {
  // This is what makes the defect impossible to compensate for with a constant.
  // Two lines of one page, one face, one type size: on the lowercase line the
  // half-em ruler is 109.23pt too wide, and on the capitals line 7.29pt too
  // narrow. A guard subtracted from every box cannot correct a signed error.
  const run = findRun(extractTextItems(await pageOf(RI, 5)), RI_CAPS, 72);
  assert.equal(run.baseFont, "Times-Roman");
  assert.equal(run.size, 11);
  const halfEm = halfEmWidth(run.chars.length, run.size);
  closeTo(halfEm, 456.5, "half-em width");
  assert.equal(Number(run.width.toFixed(2)), 463.79);
  assert.ok(run.width > halfEm, "on capitals the corrected reading must be WIDER than the half-em one");
  closeTo(run.width - halfEm, 7.29, "under-read");
});

// ---------------------------------------------------------------------------
// 2. DIRECTION TWO -- hidden overflow, on a real Helvetica page.
//
// Maryland's CC-DC-CR-072A early-termination packet writes the boundary case
// number into the court's own case-number cell on page 1. The cell is a printed
// rule the form draws from x=385.20 to x=572.40. The value is drawn in base-14
// Helvetica at 10.24pt from x=386.04 -- uppercase and digits, which is the
// shape the half-em ruler reads NARROW.
//
// This is the direction that ships. The page was passing a clearance check on
// a number that overstated its headroom by a factor of ten.
// ---------------------------------------------------------------------------
const MD = "data/rcap-all50/overlays/census-v1/md/md-10105-early-set--official-pdf-fill/fixtures/boundary.pdf";
const MD_VALUE = "C-04-CR-24-0011882-SUPPLEMENTAL";

await check("MD 10-105 page 1 draws the case number in base-14 Helvetica with no /Widths", async () => {
  const items = extractTextItems(await pageOf(MD, 1));
  const run = findRun(items, MD_VALUE, 386.04);
  assert.equal(run.baseFont, "Helvetica");
  assert.equal(run.metricsSource, "afm:@pdf-lib/standard-fonts:Helvetica");
  assert.equal(run.metricsExact, true);
  assert.equal(run.size, 10.24);
});

await check("the half-em ruler leaves that value 27.64pt clear of the court's rule; it is 2.56pt clear", async () => {
  const page = await pageOf(MD, 1);
  const run = findRun(extractTextItems(page), MD_VALUE, 386.04);

  // The boundary is the court's own printed rule, read from the page's paths
  // rather than assumed: a horizontal stroke under this baseline starting at
  // or left of the value's origin.
  const rules = (extractPageGeometry(page).paths ?? [])
    .filter((p) => p.height <= 1.5 && p.width >= 20 && p.x <= run.x + 1
      && p.x + p.width > run.x + 2 && run.y - p.y >= -1 && run.y - p.y <= 6);
  assert.ok(rules.length > 0, "the case-number cell's printed rule must be on the page");
  const ruleEnd = Number((rules[0].x + rules[0].width).toFixed(2));
  assert.equal(ruleEnd, 572.4);

  const halfEm = halfEmWidth(run.chars.length, run.size);
  const halfEmEnd = Number((run.x + halfEm).toFixed(2));
  const realEnd = Number((run.x + run.width).toFixed(2));

  // The old ruler read the value 25.08pt NARROWER than it is drawn.
  closeTo(halfEm, 158.72, "half-em width");
  assert.equal(Number(run.width.toFixed(2)), 183.8);
  closeTo(run.width - halfEm, 25.08, "under-read");

  // Apparent clearance under the old ruler: 27.64pt. Comfortable.
  closeTo(halfEmEnd, 544.76, "half-em end x");
  closeTo(ruleEnd - halfEmEnd, 27.64, "apparent clearance");

  // Actual clearance: 2.56pt. Ten times tighter, on the same bytes.
  assert.equal(realEnd, 569.84);
  assert.equal(Number((ruleEnd - realEnd).toFixed(2)), 2.56);

  // Both rulers say this value fits. Only one of them knows by how little,
  // and a case number four characters longer crosses the rule while the old
  // ruler still reports 15pt of room.
  assert.ok(realEnd <= ruleEnd);
});

// ---------------------------------------------------------------------------
// 3. A REAL OVERFLOW THAT THE OLD RULER UNDERSTATED.
//
// Pennsylvania's Rule 490 boundary petition writes the boundary case number
// into a cell whose printed rule ends at x=437.16. It overflows under both
// rulers -- this is a genuine defect and a repair lane owns it -- but the old
// ruler reported the overrun 10.81pt short of what it is. An artifact and an
// understated real defect are different findings and both come from the same
// wrong table.
// ---------------------------------------------------------------------------
const PA = "data/rcap-all50/overlays/census-v1/pa/pa-490-nonconviction-set--official-pdf-fill/fixtures/rule-490-petition-boundary.pdf";
const PA_VALUE = "0123-45-2026-CR-900123.00-AB-CDE/2201";

await check("PA rule-490 boundary case number overflows under both rulers, by 77.83pt and 88.64pt", async () => {
  const page = await pageOf(PA, 1);
  const run = findRun(extractTextItems(page), PA_VALUE, 344.83);
  assert.equal(run.baseFont, "Helvetica");
  assert.equal(run.metricsSource, "afm:@pdf-lib/standard-fonts:Helvetica");

  const rules = (extractPageGeometry(page).paths ?? [])
    .filter((p) => p.height <= 1.5 && p.width >= 20 && p.x <= run.x + 1
      && p.x + p.width > run.x + 2 && run.y - p.y >= -1 && run.y - p.y <= 6);
  assert.ok(rules.length > 0);
  const ruleEnd = Number((rules[0].x + rules[0].width).toFixed(2));
  assert.equal(ruleEnd, 437.16);

  const halfEm = halfEmWidth(run.chars.length, run.size);
  closeTo(halfEm, 170.16, "half-em width");
  assert.equal(Number(run.width.toFixed(2)), 180.97);

  const halfEmOver = run.x + halfEm - ruleEnd;
  const realOver = Number((run.x + run.width - ruleEnd).toFixed(2));
  closeTo(halfEmOver, 77.83, "overrun as it was reported");
  assert.equal(realOver, 88.64);
  assert.ok(realOver > halfEmOver, "the real overrun must be larger than the one that was reported");
});

// ---------------------------------------------------------------------------
// 4. UNMEASURABLE IS NULL, NOT ZERO.
//
// The RI packets draw checkbox and bullet glyphs through Type0 symbol fonts.
// This walker does not read their CID widths (see the flagged trap in
// rcap-pdf-anchor-capture.mjs), so their width is null and says so, where the
// old code returned a half-em for each of them. A null that a caller coalesces
// to zero collapses the run to a point, which reads as no overflow -- so the
// line-level `x2` is null too, rather than `x + 0`.
// ---------------------------------------------------------------------------
await check("a run whose metrics are not held reports null and names why", async () => {
  const items = extractTextItems(await pageOf(RI, 2));
  const unmeasured = items.filter((i) => i.width === null);
  assert.ok(unmeasured.length > 0, "RI page 2 draws symbol-font glyphs this walker cannot measure");
  for (const run of unmeasured.slice(0, 20)) {
    assert.equal(run.width, null, "an unmeasurable width must be null, never 0");
    assert.equal(run.widthIsUnmeasurable, true);
    assert.equal(run.metricsExact, false);
    assert.ok(/not_read_by_this_walker|unmeasurable/.test(run.metricsSource),
      `metricsSource must say why: got ${run.metricsSource}`);
    for (const ch of run.chars) assert.notEqual(ch.w, 0, "a glyph box must not claim a measured width of 0");
  }
});

await check("every measured run in the corpus sample names the table it was measured with", async () => {
  const items = extractTextItems(await pageOf(RI, 5));
  const measured = items.filter((i) => i.width !== null);
  assert.ok(measured.length > 0);
  for (const run of measured) {
    assert.ok(run.metricsSource === "font_widths_array"
      || run.metricsSource === "type0_w_array"
      || run.metricsSource.startsWith("afm:"),
    `a measured run must name its metric table: got ${run.metricsSource}`);
  }
});

// ---------------------------------------------------------------------------
if (failures.length > 0) {
  console.log(`\n${failures.length} of the controls above failed`);
  process.exit(1);
}
console.log("\nall controls passed");
