#!/usr/bin/env node
import assert from "node:assert/strict";

import { countCompleteness } from "./build-census-v1-co_motion_seal_conviction-set.mjs";

const maps = [{
  formNumber: "JDF-205",
  canonicalWrites: [],
  canonicalRefusals: [],
  selectionControls: []
}];
const artifacts = [{ file: "fixture.pdf", documents: ["JDF-205"] }];
const baseProof = {
  fixture: "boundary", formNumber: "JDF-205",
  actualWrites: [], refusedFieldsWithInk: [],
  addedGlyphsReadFromOutputBytes: 0,
  flattenedWidgetAppearancesReadFromOutputBytes: 0,
  valuesReportedByFinalizer: 0,
  nonWhitespaceGlyphsOutsideMeasuredWriteBoxes: 0
};

const refused = countCompleteness(maps, [{
  ...baseProof,
  unfittable: [{
    field: "Email", factId: "participant.email",
    reason: "single_line_value_exceeds_widget_at_minimum_font"
  }]
}], artifacts, "");
assert.equal(refused.counters.knownRequiredFieldsMissing, 1);
assert.equal(refused.findings[0].fixture, "boundary");
assert.equal(refused.findings[0].field, "Email");
assert.equal(refused.findings[0].factId, "participant.email");

const rendered = countCompleteness(maps, [{ ...baseProof, unfittable: [] }], artifacts, "");
assert.equal(rendered.counters.knownRequiredFieldsMissing, 0);
assert.equal(Object.values(rendered.counters).reduce((sum, count) => sum + count, 0), 0);

console.log("PASS CO conviction boundary-fit counter: 6 assertions");
