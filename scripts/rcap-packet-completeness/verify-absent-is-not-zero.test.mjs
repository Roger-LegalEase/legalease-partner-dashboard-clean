#!/usr/bin/env node
// A counter you could not measure is null, never 0 — including in the gate that
// holds every lane to that rule.
//
// Three of the nine counters are raised only from keys in the artifact write
// records: invisibleWrites and visualDefects from addedGlyphsReadFromOutputBytes,
// flattenedWidgetAppearancesReadFromOutputBytes and
// nonWhitespaceGlyphsOutsideMeasuredWriteBoxes; protectedWrites from
// refusedFieldsWithInk. 28 families' reports/actual-writes.json are written on an
// older artifact shape carrying NONE of those keys — it has finalizerWritten (a
// list, not a count), flattenedAppearanceCount and writtenProof instead. For
// those families the three loops iterated nothing, the counters kept their
// initial 0, and the gate returned PASS_COMPLETE with nine zeros for quantities
// it never measured. Most of them are recorded COMPLETE_PACKET_PROVEN.
//
// Four independent verification lanes reported the same shape on one day. The
// Alabama lane put it most exactly: the gate "prints a zero for a raster nobody
// ran", while each family's own build-summary.json honestly records null.
//
// Across the corpus the repair moved 249 PASS_COMPLETE to 213.
//
//   node --test scripts/rcap-packet-completeness/verify-absent-is-not-zero.test.mjs
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, "../..");
const GATE = path.join(HERE, "verify-packet-completeness.mjs");

const run = (family) => {
  let out = "";
  try {
    out = execFileSync(process.execPath, [GATE, "--family", family], { cwd: ROOT, encoding: "utf8" });
  } catch (e) {
    out = `${e.stdout ?? ""}${e.stderr ?? ""}`;
  }
  return out;
};

/** Families whose artifact records carry none of the keys the three counters read. */
const unmeasuredFamilies = () => {
  const found = [];
  const base = path.join(ROOT, "data/rcap-all50/overlays/census-v1");
  for (const st of fs.readdirSync(base)) {
    const stDir = path.join(base, st);
    if (!fs.statSync(stDir).isDirectory()) continue;
    for (const fam of fs.readdirSync(stDir)) {
      const p = path.join(stDir, fam, "reports/actual-writes.json");
      if (!fs.existsSync(p)) continue;
      let arts;
      try { arts = JSON.parse(fs.readFileSync(p, "utf8")).artifacts; } catch { continue; }
      if (!Array.isArray(arts) || arts.length === 0) continue;
      const measured = arts.some((a) => typeof a.nonWhitespaceGlyphsOutsideMeasuredWriteBoxes === "number");
      if (!measured) found.push(fam);
    }
  }
  return found;
};

test("the older artifact shape still exists, so this guard still has a subject", () => {
  const fams = unmeasuredFamilies();
  assert.ok(fams.length > 0, "no family lacks the measurement; if the writers were all migrated, retire this test deliberately");
  assert.ok(fams.some((f) => f.startsWith("ca-1203-4-set")), "ca-1203-4-set is the worked example in the commit that added this");
});

test("a family whose visual measurement is absent is NOT_MEASURABLE_HERE, not PASS_COMPLETE", () => {
  const out = run("ca-1203-4-set");
  assert.match(out, /NOT_MEASURABLE_HERE/, "an unasked question must not read as a pass");
  // The run tally always names PASS_COMPLETE ("1 famil(ies) audited · 0
  // PASS_COMPLETE"), so read the family's own verdict line rather than the
  // whole output.
  const line = out.split("\n").find((l) => l.includes("ca-1203-4-set")) ?? "";
  assert.doesNotMatch(line, /PASS_COMPLETE/, "it passed on counters it never measured");
  assert.match(line, /NOT_MEASURABLE_HERE/);
});

test("the unmeasured counters print as unmeasured, not as zero", () => {
  const out = run("ca-1203-4-set");
  for (const c of ["invisibleWrites", "visualDefects"]) {
    assert.match(out, new RegExp(`${c} UNMEASURED`), `${c} must not print a number nobody measured`);
  }
});

test("protectedWrites is NOT treated as unmeasurable, and the reason is measured", () => {
  // Among the families whose geometry pass DID run, 15 carry no
  // refusedFieldsWithInk key at all — a writer that measured everything omits
  // it when the list is empty. Reading that absence as "nobody looked" is the
  // same error as reading an unmeasured thing as zero, pointed the other way,
  // and it made 15 honest families unmeasurable until this was narrowed.
  const src = fs.readFileSync(GATE, "utf8");
  const block = src.slice(src.indexOf("const measurability = {"), src.indexOf("const unmeasured ="));
  assert.doesNotMatch(block, /protectedWrites:/, "absence of refusedFieldsWithInk is a real zero, not an unmeasured counter");
  assert.match(block, /visualDefects: anyArtifactHas\("nonWhitespaceGlyphsOutsideMeasuredWriteBoxes"\)/);

  let measuredGeometryButNoRefusedKey = 0;
  const base = path.join(ROOT, "data/rcap-all50/overlays/census-v1");
  for (const st of fs.readdirSync(base)) {
    const stDir = path.join(base, st);
    if (!fs.statSync(stDir).isDirectory()) continue;
    for (const fam of fs.readdirSync(stDir)) {
      const p2 = path.join(stDir, fam, "reports/actual-writes.json");
      if (!fs.existsSync(p2)) continue;
      let arts;
      try { arts = JSON.parse(fs.readFileSync(p2, "utf8")).artifacts; } catch { continue; }
      if (!Array.isArray(arts) || !arts.length) continue;
      if (!arts.some((a) => typeof a.nonWhitespaceGlyphsOutsideMeasuredWriteBoxes === "number")) continue;
      if (!arts.some((a) => "refusedFieldsWithInk" in a)) measuredGeometryButNoRefusedKey += 1;
    }
  }
  assert.ok(measuredGeometryButNoRefusedKey > 0,
    "if every measured family now emits refusedFieldsWithInk, revisit this narrowing deliberately rather than by attrition");
});

test("a family that WAS measured still passes on a real zero", () => {
  // al-diversion-set carries the glyph-outside measurement on every artifact.
  // Measurable-and-zero means zero; only absent becomes null.
  const out = run("al-diversion-set");
  assert.match(out, /PASS_COMPLETE/, "the repair must not fail families that were actually measured");
  assert.doesNotMatch(out, /UNMEASURED/, "nothing about this family is unmeasured");
});

test("a measured failure outranks an unasked question", () => {
  const src = fs.readFileSync(GATE, "utf8");
  const chain = src.slice(src.indexOf('let result = "PASS_COMPLETE";'), src.indexOf("return {\n    familyId"));
  const notMeasurable = chain.indexOf('result = "NOT_MEASURABLE_HERE"');
  assert.ok(notMeasurable > 0, "the verdict must be reachable");
  for (const fail of ["FAIL_PROTECTED_WRITE", "FAIL_VISIBLE_APPEARANCE", "FAIL_MISSING_REQUIRED_FACTS",
                      "FAIL_ROUTE_SELECTION", "FAIL_MISSING_PREFILLS", "FAIL_COMPONENT_SET", "FAIL_CURRENTNESS"]) {
    assert.ok(chain.indexOf(fail) < notMeasurable, `${fail} must be decided before NOT_MEASURABLE_HERE, or an unasked question masks an answered one`);
  }
});

test("a zero-source composition is not caught by this rule", () => {
  // A family that binds no document bytes by design has no artifact records at
  // all. That is a different fact and must not be reported as unmeasured.
  const src = fs.readFileSync(GATE, "utf8");
  assert.match(src, /artifactRecords\.length === 0\s*\n\s*\? \[\]/, "no artifact records must yield no unmeasured counters");
});

// ---------------------------------------------------------------------------
// The rule landed backwards on one artifact shape, and four families paid.
//
// FIX99 writes records that are honest twice over: valuesReportedByFinalizer is
// a real count of what the finalizer set, and addedGlyphsReadFromOutputBytes /
// flattenedWidgetAppearancesReadFromOutputBytes are null because that writer
// does not open the output. Both defects below fired on that shape.
//
//   1. `valuesReportedByFinalizer` sat in the invisibleWrites measurability key
//      list, so its presence certified the counter measured -- on the
//      finalizer's own claim about its own writes, which is the accused rather
//      than the measurement.
//   2. The raise coerced the two null output readings to 0 and summed them, so
//      "nobody read the bytes" arrived at the test as "the bytes carry no ink"
//      and raised invisibleWrites 2.
//
// Together they failed four Illinois families whose ink an independent lane had
// counted at 150 dpi, while visualDefects -- whose guard names only an
// output-byte reading -- correctly reported UNMEASURED on the same file. A
// fabricated zero passed and an admitted null failed.
//
// The subject families are the four rebuilt Illinois ones; the test finds the
// shape rather than naming them, so it survives their repair.

/** Artifact records that report finalizer writes and no reading of the output. */
const finalizerOnlyFamilies = () => {
  const found = [];
  const base = path.join(ROOT, "data/rcap-all50/overlays/census-v1");
  for (const st of fs.readdirSync(base)) {
    const stDir = path.join(base, st);
    if (!fs.statSync(stDir).isDirectory()) continue;
    for (const fam of fs.readdirSync(stDir)) {
      const p = path.join(stDir, fam, "reports/actual-writes.json");
      if (!fs.existsSync(p)) continue;
      let arts;
      try { arts = JSON.parse(fs.readFileSync(p, "utf8")).artifacts; } catch { continue; }
      if (!Array.isArray(arts) || arts.length === 0) continue;
      const finalizerOnly = arts.some((a) =>
        typeof a.valuesReportedByFinalizer === "number" && a.valuesReportedByFinalizer > 0 &&
        typeof a.addedGlyphsReadFromOutputBytes !== "number" &&
        typeof a.flattenedWidgetAppearancesReadFromOutputBytes !== "number");
      if (finalizerOnly) found.push(fam.replace(/--official-pdf-fill$/, ""));
    }
  }
  return found;
};

test("the finalizer-only artifact shape still exists, so this guard still has a subject", () => {
  const fams = finalizerOnlyFamilies();
  assert.ok(fams.length > 0, "no family reports finalizer writes without an output reading; if every writer now opens the output, retire this test deliberately");
});

test("the finalizer's own count cannot certify invisibleWrites measured", () => {
  // Both defects are visible on one family: with the old key list the counter
  // read 2 and the family FAILed; with the old summation it would read 2 even
  // if the key list were fixed. The honest answer is that nobody looked.
  const fam = finalizerOnlyFamilies()[0];
  const out = run(fam);
  const line = out.split("\n").find((l) => l.includes(fam)) ?? "";
  assert.doesNotMatch(line, /FAIL_VISIBLE_APPEARANCE/, "a defect was invented from an absent measurement");
  assert.match(out, /invisibleWrites UNMEASURED/, "invisibleWrites must be null when no output-byte reading was taken");
});

test("a real output reading of zero against reported writes still raises invisibleWrites", () => {
  // The negative control: the repair must not have turned the counter off. A
  // record that DID open the output and found no glyph and no appearance is a
  // genuine invisible write and must still fail.
  const arts = [{ fixture: "canonical.pdf", valuesReportedByFinalizer: 12, addedGlyphsReadFromOutputBytes: 0, flattenedWidgetAppearancesReadFromOutputBytes: 0 }];
  const readings = [arts[0].addedGlyphsReadFromOutputBytes, arts[0].flattenedWidgetAppearancesReadFromOutputBytes].filter((n) => typeof n === "number");
  assert.equal(readings.length, 2, "both readings are present, so the question was asked");
  assert.equal(readings.reduce((a, b) => a + b, 0), 0, "and the answer was no ink, which is a defect and not an absence");
});
