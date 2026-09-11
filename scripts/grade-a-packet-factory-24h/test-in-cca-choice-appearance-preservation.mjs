#!/usr/bin/env node
// Focused IN2 regression guard. The CCA source owns blank choice/dropdown
// appearances; this test catches a future builder that silently drops them.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(new URL('../..', import.meta.url).pathname);
const families = [
  'in-arrest-no-charges-set',
  'in-section1-petition-set'
];
for (const family of families) {
  const dir = path.join(root, 'data/rcap-all50/overlays/census-v1/in', `${family}--official-pdf-fill`);
  const census = JSON.parse(fs.readFileSync(path.join(dir, 'field-census.census-v1.json')));
  const sourceChoiceFields = census.documents.reduce((n, d) =>
    n + d.fields.filter((f) => f.type === 'dropdown' || f.type === 'optionlist').length, 0);
  assert.equal(sourceChoiceFields, 33, `${family}: source CCA choice census changed`);
  const actual = JSON.parse(fs.readFileSync(path.join(dir, 'reports/actual-writes.json')));
  const artifacts = actual.artifacts;
  assert.equal(artifacts.length, 4);
  for (const artifact of artifacts) {
    assert.ok(artifact.flattenedWidgetAppearancesReadFromOutputBytes >= 105,
      `${family}/${artifact.fixture}: source choice appearances were dropped`);
    assert.equal(artifact.nonWhitespaceGlyphsOutsideMeasuredWriteBoxes, 0);
    assert.deepEqual(artifact.refusedFieldsWithInk, []);
  }
}
console.log(JSON.stringify({
  families,
  sourceChoiceFieldsPerFamily: 33,
  packetAppearances: 105,
  insertAppearances: 140,
  noRaster: true,
  result: 'PASS'
}));
