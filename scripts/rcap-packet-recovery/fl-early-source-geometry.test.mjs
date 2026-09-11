#!/usr/bin/env node
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import {
  FIXTURES,
  WRITE_LAYOUT,
  checkStoredFixtures,
  renderAndMeasure
} from "../build-census-v1-fl-early-juvenile-set.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const SOURCE = process.env.PF20_FL_EARLY_JUVENILE_SOURCE
  || path.join(ROOT, "reference/source-recovery/2026-09-11-wave1/"
    + "CODEX-CS2-SRC2__FL-EARLY-JUVENILE-SET__FDLE-EARLY-JUVENILE-EXPUNCTION-APPLICATION__d9417ea382c9.pdf");
const sourceBytes = fs.readFileSync(SOURCE);

const layoutCopy = () => WRITE_LAYOUT.map((row) => ({
  ...row,
  region: [...row.region],
  anchor: { ...row.anchor }
}));

test("both real fixtures place all 28 writes inside named source regions", async () => {
  for (const fixture of ["canonical", "boundary"]) {
    const result = await renderAndMeasure(sourceBytes, FIXTURES[fixture]);
    assert.equal(result.measured.sourceRegionsMeasured, 28);
    assert.equal(result.measured.addedTextRunsReadFromOutputBytes, 28);
    assert.ok(result.measured.addedGlyphsReadFromOutputBytes > 0);
    assert.equal(result.measured.widgetAppearancesReadFromSourceBytes, 0);
    assert.equal(result.measured.flattenedWidgetAppearancesReadFromOutputBytes, 0);
    assert.equal(result.measured.nonWhitespaceGlyphsOutsideMeasuredWriteBoxes, 0);
    assert.ok(result.measured.actualWrites.every((row) => row.insideNamedSourceRegion));
  }
});

test("read-only artifact check measures and matches both stored fixtures", async () => {
  const checked = await checkStoredFixtures(sourceBytes);
  assert.equal(checked.length, 2);
  assert.ok(checked.every((row) => row.expectedSha256 === row.storedSha256));
  assert.ok(checked.every((row) => row.sourceRegionsMeasuredFromStoredBytes === 28));
  assert.ok(checked.every((row) => row.nonWhitespaceGlyphsOutsideMeasuredWriteBoxes === 0));
});

test("read-only artifact check rejects a mutated stored PDF", async () => {
  const fixtureDirectory = fs.mkdtempSync(path.join(os.tmpdir(), "fl-early-stored-check-"));
  try {
    for (const fixture of ["canonical", "boundary"]) {
      fs.copyFileSync(path.join(ROOT,
        `data/rcap-all50/overlays/census-v1/fl/fl-early-juvenile-set--official-pdf-fill/fixtures/${fixture}.pdf`),
      path.join(fixtureDirectory, `${fixture}.pdf`));
    }
    fs.appendFileSync(path.join(fixtureDirectory, "boundary.pdf"), "\n% mutated stored artifact\n");
    await assert.rejects(() => checkStoredFixtures(sourceBytes, fixtureDirectory),
      /boundary: stored fixture is stale or tampered/);
  } finally {
    fs.rmSync(fixtureDirectory, { recursive: true, force: true });
  }
});

test("boundary full name, agency, arrest row, and fingerprint fields read back at corrected geometry", async () => {
  const { measured } = await renderAndMeasure(sourceBytes, FIXTURES.boundary);
  const bySuffix = (suffix) => measured.actualWrites.find((row) => row.field.endsWith(suffix));
  assert.equal(bySuffix(".page2_name").drawnText,
    "O'Shaughnessy-Whitfield, Maria-Alejandra Isabel");
  assert.equal(bySuffix(".page2_name").heldValue,
    "Maria-Alejandra Isabel O'Shaughnessy-Whitfield");
  assert.equal(bySuffix(".page2_name").printedFormat, "last_comma_first_middle");
  assert.deepEqual(bySuffix(".page1_arresting_agency").measuredOrigin, { x: 136, y: 467 });
  assert.deepEqual(bySuffix(".page1_arrest_date_1").measuredOrigin, { x: 63, y: 427 });
  assert.deepEqual(bySuffix(".page1_charge_1").measuredOrigin, { x: 136, y: 427 });
  for (const [suffix, origin, span] of [
    [".page3_last_name", { x: 66, y: 690 }, [64.74, 214.86]],
    [".page3_first_name", { x: 247, y: 690 }, [245.778, 387.558]],
    [".page3_middle_name", { x: 426.5, y: 690 }, [425.122, 561.342]],
    [".page3_race", { x: 77, y: 618 }, [75.84, 142.56]],
    [".page3_sex", { x: 174.5, y: 618 }, [173.36, 198.38]],
    [".page3_dob", { x: 230, y: 618 }, [228.49, 281.31]]
  ]) {
    const write = bySuffix(suffix);
    assert.deepEqual(write.measuredOrigin, origin);
    assert.ok(write.measuredGlyphBounds.x0 >= span[0] && write.measuredGlyphBounds.x1 <= span[1],
      `${suffix} must fit wholly inside its own printed source rule`);
    assert.ok(write.measuredGlyphBounds.y0 >= write.sourceAnchor.ruleY
      && write.measuredGlyphBounds.y1 <= write.sourceAnchor.regionTop,
    `${suffix} must sit on its printed source rule row`);
  }
});

const priorFingerprintGeometry = [
  ["page3_last_name", 75, 704],
  ["page3_first_name", 217, 704],
  ["page3_middle_name", 375, 704],
  ["page3_race", 79, 632],
  ["page3_sex", 176, 632],
  ["page3_dob", 231, 632]
];

for (const [id, oldX, oldY] of priorFingerprintGeometry) {
  test(`${id} rejects its prior displaced coordinates`, async () => {
    const layout = layoutCopy();
    const field = layout.find((row) => row.id === id);
    field.x = oldX;
    field.y = oldY;
    await assert.rejects(() => renderAndMeasure(sourceBytes, FIXTURES.canonical, layout),
      /added glyphs left their named source regions/);
  });
}

test("fingerprint geometry rejects the prior broad surrounding regions", async () => {
  const layout = layoutCopy();
  const oldRegions = new Map([
    ["page3_last_name", [71.96, 214.86, 687.425, 711]],
    ["page3_first_name", [214.86, 387.558, 687.425, 711]],
    ["page3_middle_name", [367, 561.342, 687.425, 711]],
    ["page3_race", [75.84, 142.56, 615.425, 641.845]],
    ["page3_sex", [173.36, 198.38, 615.425, 641.845]],
    ["page3_dob", [228.49, 281.31, 615.425, 641.845]]
  ]);
  for (const row of layout) {
    if (oldRegions.has(row.id)) row.region = oldRegions.get(row.id);
  }
  await assert.rejects(() => renderAndMeasure(sourceBytes, FIXTURES.canonical, layout),
    /allowed region must equal its measured source blank/);
});

test("a missing fixture fact fails the production render-and-measure entrypoint", async () => {
  const facts = { ...FIXTURES.canonical };
  delete facts["participant.last_name"];
  await assert.rejects(() => renderAndMeasure(sourceBytes, facts), /required fixture value must be a string/);
});

test("an overflow value fails the production render-and-measure entrypoint", async () => {
  const facts = { ...FIXTURES.canonical, "participant.last_name": "W".repeat(500) };
  await assert.rejects(() => renderAndMeasure(sourceBytes, facts), /does not fit measured rectangle/);
});

test("coordinate drift fails final-PDF measurement against the source region", async () => {
  const layout = layoutCopy();
  const agency = layout.find((row) => row.id === "page1_arresting_agency");
  agency.x = 100;
  agency.y = 459;
  await assert.rejects(() => renderAndMeasure(sourceBytes, FIXTURES.canonical, layout),
    /added glyphs left their named source regions/);
});

test("a moved source anchor fails before artifact acceptance", async () => {
  const layout = layoutCopy();
  layout[0].anchor.x += 1;
  await assert.rejects(() => renderAndMeasure(sourceBytes, FIXTURES.canonical, layout),
    /named source anchor .* moved or disappeared/);
});
