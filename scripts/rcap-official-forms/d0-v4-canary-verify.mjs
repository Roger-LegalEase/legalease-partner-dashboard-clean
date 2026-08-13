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

import { assembleLabelTokens, assembleLabelTokensFromLines } from "./rcap-pdf-anchor-capture.mjs";
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

// --- provenance ------------------------------------------------------------
//
// Everything above selects runs by position, which is all a flat overlay
// offers. A filled AcroForm offers more: the value is drawn inside the field's
// own appearance stream, and that stream's placed box is the widget's own
// rectangle. Preferring provenance is not a refinement -- it is the difference
// between reading a field and reading the neighbourhood it sits in.
{
  const inAppearance = (text, x, width) =>
    ({ text, x, y: 504, width, container: { depth: 1, name: "Fm0", bbox: { ...rect } } });
  // The form's own printed text, on the same baseline, overlapping the widget:
  // a label to its left, a rule line under it, the next column to its right.
  const pageText = [
    { text: "Case No.", x: 40, y: 504, width: 55, container: null },
    { text: "________________________", x: 96, y: 504, width: 130, container: null },
    { text: "Filed:", x: 214, y: 504, width: 30, container: null }
  ];

  const v = verifyWrittenValue({
    value: "24-CR-001234", rect,
    runs: [...pageText, inAppearance("24-CR-001234", 102, 60)]
  });
  assert(v.outcome === "complete", "a whole value is complete even when page text shares its baseline", v);
  assert(v.selectedBy === "appearance_stream", "and the runs came from the field's appearance, not the neighbourhood", v.selectedBy);
  assert(v.drawnChars === 12, "so the character count is the field's, not the page's", v.drawnChars);

  // The same page text without provenance is exactly the false clip this
  // guards against: 12 supplied characters read back as 69 drawn ones.
  const byGeometry = verifyWrittenValue({
    value: "24-CR-001234", rect,
    runs: [...pageText, { text: "24-CR-001234", x: 102, y: 504, width: 60 }]
  });
  assert(byGeometry.outcome === "clipped" && byGeometry.selectedBy === "widget_geometry",
    "mutation: without provenance the same page reads as a clip", byGeometry.outcome);
  assert(byGeometry.drawnChars > 12, "mutation: because the neighbourhood is counted as the field", byGeometry.drawnChars);

  // Provenance must not rescue a genuine clip.
  const realClip = verifyWrittenValue({
    value: "Alexandrina-Katharine Montgomery-Vandenberg-Oyelaran y Fitzwilliam III", rect,
    runs: [inAppearance("Alexandrina-Katharine Montgomery-Vanden", 102, 115)]
  });
  assert(realClip.outcome === "clipped", "a real clip is still a clip when read from the appearance", realClip.outcome);

  // An appearance box belonging to a different widget is not this widget's.
  const otherWidget = verifyWrittenValue({
    value: "24-CR-001234", rect,
    runs: [{ text: "24-CR-001234", x: 102, y: 504, width: 60, container: { depth: 1, name: "Fm1", bbox: { x: 300, y: 500, width: 120, height: 14 } } }]
  });
  assert(otherWidget.outcome === "absent", "another widget's appearance does not satisfy this one", otherWidget.outcome);

  // A refused field on a flattened form. Its own appearance drew nothing, but
  // the form still prints a dot leader across the box. That is the shape of
  // Virginia's three false clips: three sound refusals read back as defects
  // because the page's own decoration was counted as the field's value.
  const refusedField = verifyWrittenValue({
    value: "24-CR-001234", rect,
    runs: [
      { text: " .......... )", x: 97.8, y: 504, width: 128, container: null },
      // Some other field on the same page did write, which is what makes this
      // a flattened AcroForm rather than a flat overlay.
      { text: "Jordan Avery Reyes", x: 302, y: 700, width: 90,
        container: { depth: 1, name: "Fm2", bbox: { x: 300, y: 696, width: 120, height: 14 } } }
    ]
  });
  assert(refusedField.outcome === "absent",
    "a refused field on a flattened form is absent, not clipped by the form's own dot leader", refusedField);
  assert(refusedField.selectedBy === "appearance_stream",
    "because the artifact draws values through appearances, so geometry never applies to it", refusedField.selectedBy);

  // Mutation: choosing the channel per field instead of per artifact is what
  // fabricates the defect.
  const perFieldFallback = verifyWrittenValue({
    value: "24-CR-001234", rect, runSource: "geometry",
    runs: [{ text: " .......... )", x: 97.8, y: 504, width: 128, container: null }]
  });
  assert(perFieldFallback.outcome === "clipped",
    "mutation: falling back to geometry for that field reports a clip", perFieldFallback.outcome);
  assert(perFieldFallback.drawnChars > expectedCharsOf("24-CR-001234"),
    "mutation: made of the form's decoration, not the value", perFieldFallback.drawnChars);

  // A genuine flat overlay has no appearance runs at all, and geometry is the
  // only channel there is. It must still work.
  const flatOverlay = verifyWrittenValue({
    value: "Jordan Avery Reyes", rect,
    runs: [{ text: "Jordan Avery Reyes", x: 102, y: 504, width: 90, container: null }]
  });
  assert(flatOverlay.outcome === "complete" && flatOverlay.selectedBy === "widget_geometry",
    "a flat overlay, which has no appearances to ask, still verifies by geometry", flatOverlay);
}

function expectedCharsOf(s) { return String(s).length; }

// --- label tokens ----------------------------------------------------------
//
// Two Washington forms draw every glyph as its own text-showing operator, and
// a run-level matcher on those pages concludes that no label exists. It is the
// matcher that cannot see, not the form that lacks labels.
{
  const size = 10;
  // "Plaintiff" on the left and "No." far to the right, drawn one glyph at a
  // time, as those forms actually do it.
  const glyphs = (text, startX) => {
    const out = [];
    let x = startX;
    for (const c of text) { out.push({ c, x, w: 5 }); x += 5; }
    return out;
  };
  const line = {
    y: 519.8, x: 72.7, size, fullyDecoded: true, metricsExact: true,
    chars: [...glyphs("Plaintiff", 72.7), ...glyphs("No.", 313.2)]
  };
  const tokens = assembleLabelTokens(line);
  assert(tokens.length === 2, "a line of single-character runs assembles into its labels", tokens.map((t) => t.text));
  assert(tokens[0].text === "Plaintiff" && tokens[1].text === "No.",
    "and the labels read as the form prints them", tokens.map((t) => t.text));
  assert(tokens[0].x2 < tokens[1].x, "each token carries its own extent, so it can be anchored against",
    { first: tokens[0], second: tokens[1] });

  // A word space must not split a token; a column gap must.
  const sentence = { y: 100, x: 0, size, fullyDecoded: true, metricsExact: true, chars: glyphs("County of King", 50) };
  assert(assembleLabelTokens(sentence).length === 1, "an ordinary word space does not end a token",
    assembleLabelTokens(sentence).map((t) => t.text));

  // Mutation: the run-level view of the same line, which is what produced
  // "no participant label matched".
  const runLevelLabels = line.chars.map((c) => c.c).filter((t) => t.trim().length > 1);
  assert(runLevelLabels.length === 0, "mutation: matching on runs finds nothing on this line", runLevelLabels.length);
  assert(tokens.length > 0, "mutation: assembling first finds the labels that were always there", tokens.length);

  // A rule line is where the value goes, so it has to survive as its own token
  // rather than being glued onto the caption in front of it. Washington's
  // Blake-006 prints "State of Washington/City of ______________," with no gap
  // at all, and a single merged token has neither a readable label nor a
  // write area.
  {
    const ruled = { y: 527.9, x: 72.7, size, fullyDecoded: true, metricsExact: true,
      chars: glyphs("State of Washington/City of ______________,", 72.7) };
    const parts = assembleLabelTokens(ruled);
    assert(parts.length === 3, "a caption, its rule line and its trailing comma separate", parts.map((p) => p.text));
    assert(parts[0].text === "State of Washington/City of", "the caption reads as printed", parts[0].text);
    assert(/^_+$/.test(parts[1].text) && parts[1].x >= parts[0].x2 - 1,
      "the rule line is its own token, positioned after the caption", parts[1]);

    // But punctuation is not a rule. A trailing period and a decimal point are
    // the same character as the blank, and splitting on them would shatter
    // every citation on the page.
    const punctuated = { y: 519.8, x: 313.2, size, fullyDecoded: true, metricsExact: true,
      chars: glyphs("No. 197 Wn.2d 170", 313.2) };
    assert(assembleLabelTokens(punctuated).length === 1,
      "mutation: a period is not a rule line", assembleLabelTokens(punctuated).map((p) => p.text));
  }

  // A line the decoder refused must contribute no token at all.
  const refusedLine = { ...line, fullyDecoded: false };
  assert(assembleLabelTokensFromLines([refusedLine]).length === 0,
    "an undecodable line yields no label token", assembleLabelTokensFromLines([refusedLine]).length);
  assert(assembleLabelTokensFromLines([line]).length === 2,
    "a decodable line still does", assembleLabelTokensFromLines([line]).length);
}

for (const c of checks) console.log(`${c.ok ? "PASS" : "FAIL"}  ${c.msg}`);
if (failures.length > 0) {
  console.error("\nd0-v4-canary-verify FAILED");
  for (const f of failures) console.error(` - ${f}`);
  process.exit(1);
}
console.log(`\nd0-v4-canary-verify passed: ${checks.length} checks across 11 cases and 6 mutations.`);
