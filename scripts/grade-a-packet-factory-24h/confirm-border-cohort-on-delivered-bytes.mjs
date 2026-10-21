#!/usr/bin/env node
/*
 * The confirmation pass Roger asked for on 2026-09-10: review the entire exposed
 * synthesized-widget-border cohort, and "document unchanged-output findings
 * where the scan shows exposure but the delivered artifact is not defective."
 *
 * fix80/MK_BORDER_COHORT.json is a static PREDICTION over pinned SOURCE forms.
 * FIX121 then executed the counterfactual on New Jersey CN-10557 -- it turned
 * suppressSynthesizedWidgetBorders on, rebuilt all three families and got
 * BYTE-IDENTICAL digests -- so the prediction of 597 exposed widgets there
 * corresponds to zero ink and the remedy is a measured no-op. The reason is in
 * pdf-lib: drawRectangle strokes only with a border width and fills only with a
 * colour, and on that form 269 widgets carry /MK, only 2 carry /MK /BC, and NONE
 * carries a /BS dictionary. With neither, it emits the path and closes it
 * without painting.
 *
 * So exposure is not defect. This runs FIX121's classifier over every cohort
 * family's DELIVERED fixtures and separates the two. It opens PDFs read-only,
 * writes no packet byte, rebuilds nothing and demotes nothing.
 *
 * CONFIRMED_DEFECTIVE means the delivered bytes carry at least one stroke-only
 * flattened appearance, which still has to be accounted for against the pinned
 * source before anyone calls it synthesized -- an official form may legitimately
 * draw its own box at that widget. CONFIRMED_UNAFFECTED means zero, on every
 * fixture the family delivers. Neither is a verdict on the packet.
 */
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { globSync } from "node:fs";
import path from "node:path";

const LEDGER = "data/rcap-grade-a/packet-factory-24h/BORDER_COHORT_REMEDIATION.json";
const CLASSIFIER = "scripts/grade-a-packet-factory-24h/classify-flattened-widget-appearances.mjs";

const ledger = JSON.parse(readFileSync(LEDGER, "utf8"));

const classify = (pdf) => {
  try {
    const out = execFileSync("node", [CLASSIFIER, pdf], { encoding: "utf8", maxBuffer: 64 * 1024 * 1024, stdio: ["ignore", "pipe", "pipe"] });
    return { ok: true, summary: JSON.parse(out) };
  } catch (error) {
    return { ok: false, error: String(error.stderr || error.message).trim().split("\n").slice(-2).join(" | ").slice(0, 300) };
  }
};

let defective = 0, unaffected = 0, unmeasured = 0;

for (const row of ledger.rows) {
  const dir = row.familyDirectory;
  if (!dir || !existsSync(dir)) {
    row.confirmation = "UNMEASURED";
    row.confirmationWhy = dir ? `family directory not present at ${dir}` : "no family directory recorded in the cohort";
    unmeasured += 1;
    continue;
  }
  const fixtures = globSync(path.join(dir, "fixtures", "*.pdf")).sort();
  if (fixtures.length === 0) {
    row.confirmation = "UNMEASURED";
    row.confirmationWhy = `no delivered fixture PDF under ${path.join(dir, "fixtures")}`;
    unmeasured += 1;
    continue;
  }
  const measured = [];
  let failed = null;
  for (const pdf of fixtures) {
    const r = classify(pdf);
    if (!r.ok) { failed = { pdf, error: r.error }; break; }
    const s = r.summary;
    measured.push({
      fixture: path.basename(pdf),
      flattenedAppearances: s.flattenedAppearances,
      carryingAPathPaintingOperator: s.carryingAPathPaintingOperator,
      strokeOnly: s.strokeOnly,
      marksNothing: s.marksNothing,
      showTextOnly: s.showTextOnly,
      paintsAndShowsText: s.paintsAndShowsText,
      addedNonWhitespaceGlyphs: s.addedNonWhitespaceGlyphs,
      strokeOnlyDetail: s.strokeOnlyAppearancesRequiringSourceAccounting,
    });
  }
  if (failed) {
    row.confirmation = "UNMEASURED";
    row.confirmationWhy = `classifier refused ${path.basename(failed.pdf)}: ${failed.error}`;
    unmeasured += 1;
    continue;
  }
  const strokeOnly = measured.reduce((n, m) => n + m.strokeOnly, 0);
  const painting = measured.reduce((n, m) => n + m.carryingAPathPaintingOperator, 0);
  row.measuredFixtures = measured;
  row.strokeOnlyAcrossFixtures = strokeOnly;
  row.pathPaintingAcrossFixtures = painting;
  if (strokeOnly > 0) {
    row.confirmation = "CONFIRMED_DEFECTIVE_PENDING_SOURCE_ACCOUNTING";
    row.confirmationWhy = `${strokeOnly} stroke-only flattened appearance(s) across ${measured.length} delivered fixture(s). Each must be matched byte for byte against an /AP /N stream in the pinned source before it is called synthesized; a matched one is the form's own mark and is correct.`;
    defective += 1;
  } else {
    row.confirmation = "CONFIRMED_UNAFFECTED";
    row.confirmationWhy = `zero stroke-only flattened appearances across ${measured.length} delivered fixture(s), and ${painting} appearance(s) carrying any path-painting operator. The predicted border is not in the bytes. No rebuild, no demotion, no change.`;
    unaffected += 1;
  }
}

ledger.confirmationPass = {
  ranAt: new Date().toISOString(),
  by: "scripts/grade-a-packet-factory-24h/confirm-border-cohort-on-delivered-bytes.mjs",
  using: CLASSIFIER,
  whatItMeasures: "Stroke-only flattened widget appearances in the DELIVERED fixtures, counted by operator semantics rather than by regex, so that an S inside a string operand is not read as a stroke and a path built and closed without painting is not read as ink.",
  whatItDoesNotMeasure: "Ink on the page. Over-suppression -- ink the official form itself draws that a remedy removed -- is invisible to byte classification and is caught only by a directional raster difference against a render of the pinned source, read in both directions. Every repair still owes that.",
  results: {
    CONFIRMED_DEFECTIVE_PENDING_SOURCE_ACCOUNTING: defective,
    CONFIRMED_UNAFFECTED: unaffected,
    UNMEASURED: unmeasured,
  },
  grantsNothing: "A confirmation is a measurement. It promotes nothing, demotes nothing and approves no packet.",
};

writeFileSync(LEDGER, JSON.stringify(ledger, null, 2) + "\n");

console.log(`confirmed defective (pending source accounting): ${defective}`);
console.log(`confirmed unaffected:                            ${unaffected}`);
console.log(`unmeasured:                                      ${unmeasured}`);
for (const r of ledger.rows.filter((r) => r.confirmation?.startsWith("CONFIRMED_DEFECTIVE"))) {
  console.log(`  ${String(r.strokeOnlyAcrossFixtures).padStart(5)}  ${r.tier.padEnd(22)} ${r.currentState?.padEnd(24)} ${r.familyId}`);
}
