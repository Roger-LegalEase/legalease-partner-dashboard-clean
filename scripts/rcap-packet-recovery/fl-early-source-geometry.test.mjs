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

test("boundary full name, agency, arrest row, and surname read back at corrected geometry", async () => {
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
  assert.deepEqual(bySuffix(".page3_last_name").measuredOrigin, { x: 75, y: 704 });
  assert.ok(bySuffix(".page3_last_name").measuredGlyphBounds.x0
    > bySuffix(".page3_last_name").sourceAnchor.x + 30.56,
  "surname must clear the source Name: caption ending at x=71.96");
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
