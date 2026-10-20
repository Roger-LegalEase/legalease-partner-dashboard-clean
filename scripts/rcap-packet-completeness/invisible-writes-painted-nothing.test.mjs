// An appearance is not ink. The invisibleWrites rule summed added glyphs and
// flattened appearances, so a record claiming addedGlyphs 0 with appearances
// present passed. A reader that counts the appearances that paint nothing
// (appearancesThatPaintNothingReadFromOutputBytes) lets the rule raise when every
// appearance paints nothing and no glyph was added; a record without that reading
// keeps the sum rule, so no existing audit result moves.
//
//   node --test scripts/rcap-packet-completeness/invisible-writes-painted-nothing.test.mjs
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { auditFamily, auditPreparedInputs } from "./verify-packet-completeness.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const FAMILY = "ny_160_59_petition-set";
const DIR = "data/rcap-all50/overlays/census-v1/ny/ny-160-59-petition-set--official-pdf-fill";
const read = (rel) => JSON.parse(fs.readFileSync(path.join(ROOT, DIR, rel), "utf8"));
const baseline = auditFamily(DIR, FAMILY);
const inputs = {
  fieldMap: read("production-field-map.json"), actualWrites: read("reports/actual-writes.json"),
  rendered: read("reports/rendered-artifacts.json"), receipt: read("source-receipt.json"),
  census: read("field-census.census-v1.json"), approval: read("approval-request.json"),
  instructions: fs.readFileSync(path.join(ROOT, DIR, "participant-instructions.md"), "utf8")
};

/** The real NY family's inputs, with every artifact's output readings replaced. */
const audit = (readings) => {
  const prepared = structuredClone(inputs);
  for (const artifact of prepared.actualWrites.artifacts) {
    delete artifact.appearancesThatPaintNothingReadFromOutputBytes;
    Object.assign(artifact, readings(artifact));
  }
  return { counters: auditPreparedInputs(DIR, FAMILY, prepared).counters, artifacts: prepared.actualWrites.artifacts.length };
};

test("control: the injected real inputs audit exactly as the family on disk", () => {
  assert.deepEqual(auditPreparedInputs(DIR, FAMILY, structuredClone(inputs)).counters, baseline.counters);
  assert.equal(baseline.counters.invisibleWrites, 0);
  assert.ok(inputs.actualWrites.artifacts.length > 0, "the family carries artifacts to vary");
});

test("every appearance paints nothing and no glyph was added: the reported values are invisible writes", () => {
  const { counters, artifacts } = audit((a) => ({
    valuesReportedByFinalizer: 3, addedGlyphsReadFromOutputBytes: 0,
    flattenedWidgetAppearancesReadFromOutputBytes: 3, appearancesThatPaintNothingReadFromOutputBytes: 3
  }));
  assert.equal(counters.invisibleWrites, artifacts, "one raise per artifact");
});

test("one appearance paints: not invisible, even with zero glyphs (a check box is ink)", () => {
  const { counters } = audit(() => ({
    valuesReportedByFinalizer: 3, addedGlyphsReadFromOutputBytes: 0,
    flattenedWidgetAppearancesReadFromOutputBytes: 3, appearancesThatPaintNothingReadFromOutputBytes: 2
  }));
  assert.equal(counters.invisibleWrites, 0);
});

test("without the painted-nothing reading the sum rule stands: appearances present, zero glyphs, no raise", () => {
  const { counters } = audit(() => ({
    valuesReportedByFinalizer: 3, addedGlyphsReadFromOutputBytes: 0, flattenedWidgetAppearancesReadFromOutputBytes: 3
  }));
  assert.equal(counters.invisibleWrites, 0, "an older record is judged exactly as before");
});

test("nothing reported by the finalizer raises nothing, whatever the readings say", () => {
  const { counters } = audit(() => ({
    valuesReportedByFinalizer: 0, addedGlyphsReadFromOutputBytes: 0,
    flattenedWidgetAppearancesReadFromOutputBytes: 3, appearancesThatPaintNothingReadFromOutputBytes: 3
  }));
  assert.equal(counters.invisibleWrites, 0);
});
