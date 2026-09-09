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
