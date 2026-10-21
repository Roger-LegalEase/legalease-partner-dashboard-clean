#!/usr/bin/env node
import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

import {
  IN_SECTION1_BASELINE_ABOVE_RULE,
  IN_SECTION1_BASELINE_EVIDENCE_SHA256,
  IN_SECTION1_DATE_FULL_GLYPH_EVIDENCE_SHA256
} from "../lib/indiana-cca-section1-occurrence-repair.mjs";

const root = path.resolve(new URL("../..", import.meta.url).pathname);
const evidencePath = path.join(root,
  "data/rcap-grade-a/packet-factory-24h/warp-20260912/in-two/semantic-repair/followup-repair/independent-final-review/current-original-baseline-measurements.json");
const evidenceBytes = fs.readFileSync(evidencePath);
assert.equal(crypto.createHash("sha256").update(evidenceBytes).digest("hex"),
  IN_SECTION1_BASELINE_EVIDENCE_SHA256, "the baseline profile must remain bound to the frozen complete sweep");
const evidence = JSON.parse(evidenceBytes);
const dateEvidencePath = path.join(root,
  "data/rcap-grade-a/packet-factory-24h/warp-20260912/in-two/semantic-repair/followup-repair/original-baseline-repair/independent-final-review/in_section1_petition-set.current-original-baseline-measurements.json");
const dateEvidenceBytes = fs.readFileSync(dateEvidencePath);
assert.equal(crypto.createHash("sha256").update(dateEvidenceBytes).digest("hex"),
  IN_SECTION1_DATE_FULL_GLYPH_EVIDENCE_SHA256,
  "the DateChargesFiled profile must remain bound to the frozen whole-glyph sweep");
const dateEvidence = JSON.parse(dateEvidenceBytes);

const families = new Map([
  ["in_arrest_no_charges-set", "in-arrest-no-charges-set--official-pdf-fill"],
  ["in_section1_petition-set", "in-section1-petition-set--official-pdf-fill"]
]);
const close = (a, b, tolerance = 0.02) => Math.abs(a - b) <= tolerance;
const rectMatches = (a, b) => ["x", "y", "width", "height"].every((key) => close(a[key], b[key]));
let assertions = 1;
let placementsSwept = 0;
let oldCrossings = 0;
let sourceRuleSafePlacements = 0;
let cleanBaselinesPreserved = 0;
const usedProfileKeys = new Set();

for (const family of evidence.families) {
  const leaf = families.get(family.familyId);
  assert.ok(leaf, `unexpected Indiana family in frozen sweep: ${family.familyId}`); assertions += 1;
  const actual = JSON.parse(fs.readFileSync(path.join(root,
    `data/rcap-all50/overlays/census-v1/in/${leaf}/reports/actual-writes.json`)));
  for (const measuredDocument of family.documents) {
    const artifact = actual.artifacts.find((row) => row.fixture === measuredDocument.fixture
      && path.resolve(root, row.file) === path.resolve(root, measuredDocument.path));
    assert.ok(artifact, `missing current saved-byte proof for ${measuredDocument.path}`); assertions += 1;
    for (const measured of measuredDocument.rows) {
      placementsSwept += 1;
      if (measured.confirmedInkCrossing) oldCrossings += 1;
      const matches = artifact.occurrenceWrites.filter((row) => row.field === measured.field
        && row.page === measured.page && row.value === measured.value && rectMatches(row.rect, measured.sourceRect));
      assert.equal(matches.length, 1,
        `${family.familyId}/${measuredDocument.fixture}/p${measured.page}/${measured.field} must retain one exact occurrence`);
      assertions += 1;
      const [current] = matches;
      assert.equal(current.exactPositionedTextRuns, 1, "the repaired baseline must be proved from saved bytes");
      assert.ok(close(current.readback[0].y, current.baselineY), "saved text origin must equal the governed baseline");
      assert.ok(current.baselineY >= current.rect.y - 0.01
        && current.baselineY < current.rect.y + current.rect.height,
      "the corrected baseline must remain inside the source widget rectangle");
      assertions += 3;
      if (measured.confirmedInkCrossing) {
        const measuredCrossingRules = measured.rules.filter((rule) => rule.nonDescenderCharactersCrossed > 0);
        assert.ok(measuredCrossingRules.length > 0, "a demonstrated crossing must name its measured source rule");
        const expectedSourceRuleY = Number((measured.sourceRect.y + Math.max(
          ...measuredCrossingRules.map((rule) => rule.baselineBelowRulePx)
        ) / measuredDocument.pixelTransform.pxPerPt).toFixed(2));
        assert.equal(typeof current.sourceRuleY, "number", "every demonstrated collision needs a measured source rule");
        assert.ok(close(current.sourceRuleY, expectedSourceRuleY),
          "the production profile must retain the source rule measured in the frozen paper calibration");
        assert.ok(current.baselineY >= current.sourceRuleY + IN_SECTION1_BASELINE_ABOVE_RULE - 0.01,
          "a non-descender collision must move above the source rule");
        assertions += 4;
      }
      if (current.sourceRuleY === null) {
        assert.ok(close(current.baselineY, current.rect.y), "a clean source baseline must not move");
        cleanBaselinesPreserved += 1;
      } else {
        sourceRuleSafePlacements += 1;
        usedProfileKeys.add([current.documentKey, current.field, current.localSourcePage,
          current.rect.x, current.rect.y].join("|"));
      }
      assertions += 1;
    }
  }
}

assert.equal(placementsSwept, 340, "the complete frozen known-text inventory must be swept");
assert.equal(oldCrossings, 171, "the historical defect census must stay exact");
assert.equal(sourceRuleSafePlacements, 184,
  "all uses of the 38 source-rule profiles, including the four full-glyph date repairs, must be checked");
assert.equal(usedProfileKeys.size, 38, "every exact source-rule profile must be exercised");
assert.equal(cleanBaselinesPreserved, 156, "ordinary clean source baselines must remain unmoved");
assertions += 5;

// The original detector looked only four points above the text baseline.  The
// follow-up evidence examines the complete numeric glyph height and proves all
// eight digits in each date had ink on both sides of the source rule.  Verify
// each exact occurrence now starts above that rule, remains inside the widget,
// and reads back as the complete date rather than a clipped or shortened value.
const sectionLeaf = families.get("in_section1_petition-set");
const sectionWrites = JSON.parse(fs.readFileSync(path.join(root,
  `data/rcap-all50/overlays/census-v1/in/${sectionLeaf}/reports/actual-writes.json`)));
const dateRows = dateEvidence.family.rows.filter((row) => row.field === "DateChargesFiled");
assert.equal(dateRows.length, 4, "the frozen full-glyph failure has exactly four date occurrences");
assert.match(dateEvidence.method, /full glyph bounding-box height/,
  "the follow-up detector must cover the whole glyph rather than the old four-point window");
assertions += 2;
for (const measured of dateRows) {
  assert.match(measured.value, /^\d{2}\/\d{2}\/\d{4}$/,
    "the full-glyph control applies to a complete numeric filing date");
  const crossedDigits = measured.ruleCandidates.flatMap((rule) => rule.nonDescenderLettersWithInkOnBothSides);
  assert.equal(crossedDigits.length, 8, "all eight numeric glyphs must be represented by the measured collision");
  assert.ok(crossedDigits.every((glyph) => /^\d$/.test(glyph.char)
    && glyph.inkAboveRule >= 4 && glyph.inkBelowRule >= 4),
  "the failure control must demonstrate actual numeric ink on both sides of the rule");
  const artifact = sectionWrites.artifacts.find((row) => row.fixture === measured.fixture
    && path.resolve(root, row.file) === path.resolve(root, measured.pdfPath));
  assert.ok(artifact, `missing current saved-byte proof for ${measured.pdfPath}`);
  const matches = artifact.occurrenceWrites.filter((row) => row.field === measured.field
    && row.page === measured.page && row.value === measured.value && rectMatches(row.rect, measured.sourceRect));
  assert.equal(matches.length, 1, "each demonstrated date collision must map to one exact current write");
  const [current] = matches;
  const [rule] = measured.ruleCandidates;
  const measuredSourceRuleY = Number((measured.sourceRect.y
    + (rule.textBaselinePixelY - Math.max(...rule.ruleRowsPixels))
      / measured.pixelTransform.pxPerPt).toFixed(2));
  assert.ok(close(current.sourceRuleY, measuredSourceRuleY),
    "the production profile must use the whole-glyph sweep's measured source rule");
  assert.ok(current.baselineY >= measuredSourceRuleY + IN_SECTION1_BASELINE_ABOVE_RULE - 0.01,
    "the complete numeric glyph must begin above the source rule");
  assert.equal(current.exactPositionedTextRuns, 1, "the complete date must read back exactly once from saved bytes");
  assert.equal(current.readback[0].text, measured.value, "the repair may not truncate the date");
  assert.equal(current.fullGlyphEvidenceSha256, IN_SECTION1_DATE_FULL_GLYPH_EVIDENCE_SHA256,
    "the repaired occurrence must carry the frozen whole-glyph evidence binding");
  assertions += 10;
}

// Frozen negative controls distinguish a legitimate clean underline from the
// old collision.  The address and no-charges disposition stay at the source
// widget baseline; neither is swept into a blanket upward movement.
for (const example of evidence.positiveAndNegativeExamples.filter((row) => row.confirmedOverlap === false)) {
  const familyId = example.originalMember.split("/")[0];
  const fixture = example.originalMember.includes("boundary") ? "boundary" : "canonical";
  const documentKey = example.originalMember.includes("inserts-") ? "inserts" : "packet";
  const leaf = families.get(familyId);
  const actual = JSON.parse(fs.readFileSync(path.join(root,
    `data/rcap-all50/overlays/census-v1/in/${leaf}/reports/actual-writes.json`)));
  const rows = actual.artifacts.find((row) => row.fixture === fixture
    && row.occurrenceWrites.some((write) => write.documentKey === documentKey)).occurrenceWrites;
  const candidates = rows.filter((row) => row.field === example.field && row.value === example.value);
  assert.ok(candidates.length > 0, `negative control ${example.label} must remain in current byte proof`);
  assert.ok(candidates.every((row) => row.sourceRuleY === null && close(row.baselineY, row.rect.y)),
    `negative control ${example.label} must remain a clean, unmoved underline placement`);
  assertions += 2;
}

console.log(JSON.stringify({ result: "PASS", families: 2, assertions, placementsSwept,
  historicalNonDescenderCrossingsRepaired: oldCrossings, sourceRuleSafePlacements,
  uniqueSourceRuleProfilesExercised: usedProfileKeys.size, cleanBaselinesPreserved,
  cleanUnderlineNegativeControls: 2 }));
