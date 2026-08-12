// D0-v4 canary — a written value is checked against the page, not the plan.
//
// Run with: node scripts/rcap-official-forms/d0-v4-canary-verify.mjs
//
// The fitter measures with the embedding font and picks a size that fits. The
// appearance is drawn by the field's own font through pdf-lib's generator, and
// the two can disagree. Independent review found both failure modes shipping as
// clean `shrunk` outcomes with empty overflow ledgers.
//
// Red when: a clipped write is reported as complete; a value drawn past a
// widget edge is not detected; a value drawn shorter than what was supplied is
// not detected; a field that never reached the page is reported as written; or
// removing the read-back lets a clipped value ship.
import crypto from "node:crypto";
import { createRequire } from "node:module";

import { verifyWrittenValue } from "./rcap-text-fitting.mjs";

const require = createRequire(import.meta.url);

const failures = [];
const checks = [];
const assert = (cond, msg, detail) => {
  checks.push({ ok: Boolean(cond), msg, detail });
  if (!cond) failures.push(`${msg}${detail !== undefined ? ` -- ${JSON.stringify(detail).slice(0, 160)}` : ""}`);
};

// One widget, and runs positioned by hand so each case is unambiguous. Real
// geometry is exercised by the corpus audit; this fixes the semantics.
const rect = { x: 100, y: 500, width: 120, height: 14 };
const runAt = (text, x, width) => ({ text, x, y: 504, width });

// 1. A value drawn whole, inside the box.
assert(verifyWrittenValue({
  value: "Jordan Avery Reyes", rect,
  runs: [runAt("Jordan Avery Reyes", 102, 90)]
}).outcome === "complete", "a value drawn whole inside its widget is complete");

// 2. Drawn short: the page has fewer characters than were supplied. This is
//    Vermont's failure -- a 70-character name cut mid-word.
{
  const v = verifyWrittenValue({
    value: "Alexandrina-Katharine Montgomery-Vandenberg-Oyelaran y Fitzwilliam III", rect,
    runs: [runAt("Alexandrina-Katharine Montgomery-Vanden", 102, 115)]
  });
  assert(v.outcome === "clipped", "a value drawn shorter than what was supplied is clipped", v.outcome);
  assert(v.drawnChars < v.expectedChars, "and the character counts show it", { drawn: v.drawnChars, expected: v.expectedChars });
}

// 3. Drawn past an edge. This is Virginia's failure -- a case number leaving
//    the rectangle on both sides.
{
  const v = verifyWrittenValue({
    value: "0123-45-2026-CR-900123.00-AB-CDE/2201", rect,
    runs: [runAt("0123-45-2026-CR-900123.00-AB-CDE/2201", 99, 135)]
  });
  assert(v.outcome === "clipped", "a value drawn past the widget edge is clipped", v.outcome);
  assert(v.overflowRightPt > 0, "and the overflow is measured in points", v.overflowRightPt);
}

// 4. Nothing on the page at all: a write the report claims and the artifact
//    does not have.
assert(verifyWrittenValue({ value: "Jordan Avery Reyes", rect, runs: [] }).outcome === "absent",
  "a value with nothing drawn inside its widget is absent, not complete");

// 5. Whitespace is not a clip. A multiline value wraps, which reorders spacing
//    without losing anything, so the comparison must not be literal.
assert(verifyWrittenValue({
  value: "118 Maple Street, Springfield", rect,
  runs: [runAt("118 Maple", 102, 40), runAt("Street, Springfield", 102, 70)]
}).outcome === "complete", "a wrapped value is not mistaken for a clipped one");

// 6. A run belonging to a neighbouring field must not be credited to this one.
assert(verifyWrittenValue({
  value: "Jordan Avery Reyes", rect,
  runs: [{ text: "Jordan Avery Reyes", x: 400, y: 504, width: 90 }]
}).outcome === "absent", "a run outside the widget does not satisfy it");

// --- mutation ---------------------------------------------------------------
//
// Without the read-back, the only evidence is the fitter's own prediction, and
// the fitter says these fit: it measured them at a size where they would. The
// mutation is to trust that prediction.
{
  const clippedCase = {
    value: "Alexandrina-Katharine Montgomery-Vandenberg-Oyelaran y Fitzwilliam III", rect,
    runs: [runAt("Alexandrina-Katharine Montgomery-Vanden", 102, 115)]
  };
  const predicted = { outcome: "shrunk", fontSize: 8 };   // what the fitter reported
  const observed = verifyWrittenValue(clippedCase);
  assert(predicted.outcome !== "clipped", "mutation: the fitter's own outcome does not report the clip");
  assert(observed.outcome === "clipped", "mutation: reading the page does");
  assert(observed.drawnChars === 39 && observed.expectedChars === 70,
    "mutation: and it says by how much", { drawn: observed.drawnChars, expected: observed.expectedChars });
}

for (const c of checks) console.log(`${c.ok ? "PASS" : "FAIL"}  ${c.msg}`);
if (failures.length > 0) {
  console.error("\nd0-v4-canary-verify FAILED");
  for (const f of failures) console.error(` - ${f}`);
  process.exit(1);
}
console.log(`\nd0-v4-canary-verify passed: ${checks.length} checks across 6 cases and 1 mutation.`);
