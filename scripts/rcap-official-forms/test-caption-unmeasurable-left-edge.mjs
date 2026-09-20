#!/usr/bin/env node
import assert from "node:assert/strict";
import test from "node:test";

import { captureWidgetContext } from "./rcap-pdf-anchor-capture.mjs";

const page = { getSize: () => ({ width: 612, height: 792 }) };
const widget = { name: "subject", rect: { x: 40, y: 10, width: 80, height: 10 } };
const line = (text, y, x, x2) => ({
  text, y, x, size: 10, metricsExact: Number.isFinite(x2), chars: [],
  runs: [{ text, x, x2, size: 10, metricsExact: Number.isFinite(x2) }],
});

test("a run without a finite right edge cannot supply a left caption", () => {
  for (const x2 of [null, undefined, Number.NaN, Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY]) {
    const [context] = captureWidgetContext(page, [widget], {
      precomputedLines: [line("unmeasurable glyph", 10, 2, x2)],
    });
    assert.equal(context.effectiveLabel, null, `x2=${String(x2)}`);
    assert.equal(context.labelBasis, "no_printed_caption_within_reach", `x2=${String(x2)}`);
    assert.equal(context.labelGap, null, `x2=${String(x2)}`);
  }
});

test("an unmeasurable left run cannot preempt a measured caption above", () => {
  const [context] = captureWidgetContext(page, [widget], {
    precomputedLines: [
      line("unmeasurable glyph", 10, 2, null),
      line("caption above", 34, 42, 100),
    ],
  });
  assert.equal(context.effectiveLabel, "caption above");
  assert.equal(context.labelBasis, "printed_directly_above_in_the_same_column");
  assert.equal(context.labelGap, 14);
});

test("a measured finite left run remains a valid caption", () => {
  const [context] = captureWidgetContext(page, [widget], {
    precomputedLines: [line("measured caption", 10, 5, 35)],
  });
  assert.equal(context.effectiveLabel, "measured caption");
  assert.equal(context.labelBasis, "printed_to_the_left_in_the_same_cell");
  assert.equal(context.labelGap, 5);
});

test("an unmeasurable run cannot become part of a measured left caption", () => {
  const [context] = captureWidgetContext(page, [widget], {
    precomputedLines: [{
      text: "unmeasurable measured caption", y: 10, x: 1, size: 10,
      metricsExact: false, chars: [],
      runs: [
        { text: "unmeasurable ", x: 1, x2: null, size: 10, metricsExact: false },
        { text: "measured caption", x: 8, x2: 35, size: 10, metricsExact: true },
      ],
    }],
  });
  assert.equal(context.effectiveLabel, "measured caption");
  assert.equal(context.labelBasis, "printed_to_the_left_in_the_same_cell");
  assert.equal(context.labelGap, 5);
});
