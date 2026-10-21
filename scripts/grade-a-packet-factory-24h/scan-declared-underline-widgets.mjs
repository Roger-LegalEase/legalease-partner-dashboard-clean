#!/usr/bin/env node
/*
 * WHICH SOURCES TELL US, IN THEIR OWN BYTES, THAT A FIELD IS A RULE AND NOT A BOX.
 *
 * A widget's /BS /S is the source declaring how its border is drawn. /U is
 * UNDERLINE: the court prints one line under the writing space. /S is SOLID, a
 * box on all four sides. The distinction is the form's, not ours.
 *
 * VF29 measured what ignoring it costs. On co_multiple_conviction_seal-set all 16
 * written text widgets declare /BS /S /U with /BS /W 1, and each ships an /AP /N
 * that draws exactly one bottom rule -- County is `0 G / 0 0.5 m / 193.636 0.5 l
 * / s`. The delivered flattened appearance draws a closepath-stroked rectangle on
 * all four sides, so "Colorado County: ______", "Date of Birth: ______",
 * "Mailing Address: ______", "Phone: ______" and "Email: ______" all arrive as
 * BOXED FIELDS. In the 2pt bands along the three sides the source does not print:
 * 277,805 added dark pixels, 58.8% of all added ink on the packet.
 *
 * The remedy is already in the shared module. honorWidgetBorderStyle in
 * rcap-active-content.mjs reads the declared style, and its own comment says "a
 * court's writing rule delivered as a boxed field is wrong wherever it occurs".
 * TWO builders pass it.
 *
 * This is the same failure as Indiana's rule-line deletion seen from the other
 * side: there the court prints a rule and the packet deletes it, here the court
 * declares a rule and the packet draws a box over it. Both come from not reading
 * what the source says about how the field is drawn.
 *
 * So this asks every source in custody how many of its widgets declare an
 * underline, and separates the widgets whose own /AP /N already draws a single
 * horizontal rule -- the strongest evidence, because then the form has both said
 * it and drawn it.
 *
 * EXPOSURE, NOT A DEFECT LIST. A source declaring underlines is only a defect
 * where a family actually WRITES one of those fields and flattens it without the
 * option. A family may write none of them. Deciding that needs the delivered
 * bytes, which is a reader's measurement and not this file's.
 *
 * Read-only. Opens sources, writes one artifact, no packet byte.
 */
import { readFileSync, writeFileSync, globSync } from "node:fs";
import path from "node:path";
import { PDFDocument, PDFName, PDFDict } from "pdf-lib";

const OUT = "data/rcap-grade-a/packet-factory-24h/DECLARED_UNDERLINE_WIDGETS.json";
const LIBRARY = process.env.MASTER_LIBRARY_SOURCE_DIR
  ?? "/home/user/corpus-x/Expungement_AI_RCAP_Master_Library_Edition_1";

/* One horizontal rule and nothing else: a moveto, a lineto at the same y, a
 * stroke. That is what a declared underline looks like when the form draws it. */
const ONE_HORIZONTAL_RULE = (text) => {
  const ops = text.replace(/\s+/g, " ").trim();
  const m = /([-\d.]+) ([-\d.]+) m ([-\d.]+) ([-\d.]+) l S?s?/i.exec(ops);
  if (!m) return false;
  if (Math.abs(parseFloat(m[2]) - parseFloat(m[4])) > 0.01) return false;
  return !/\bre\b/.test(ops) && (ops.match(/ l /g) ?? []).length === 1;
};

const decodeStream = (stream) => {
  try { return Buffer.from(stream.getContents()).toString("latin1"); } catch { return ""; }
};

const rows = [];
for (const file of globSync(path.join(LIBRARY, "STATES", "*", "*", "*.pdf"))) {
  const state = path.relative(LIBRARY, file).split(path.sep)[1] ?? "?";
  let fields;
  let doc;
  try { doc = await PDFDocument.load(readFileSync(file), { ignoreEncryption: true, updateMetadata: false }); fields = doc.getForm().getFields(); }
  catch (error) { rows.push({ source: file, state, unreadable: String(error.message).slice(0, 120) }); continue; }
  let underline = 0, solid = 0, other = 0, undeclared = 0, underlineDrawnAsARule = 0;
  const examples = [];
  for (const handle of fields) {
    for (const widget of handle.acroField.getWidgets()) {
      let style = null;
      try {
        const bs = widget.dict.lookup(PDFName.of("BS"));
        const s = bs instanceof PDFDict ? bs.get(PDFName.of("S")) : null;
        style = s instanceof PDFName ? s.asString() : null;
      } catch { style = null; }
      if (style === "/U") {
        underline += 1;
        let drawsARule = false;
        try {
          const ap = widget.dict.lookup(PDFName.of("AP"));
          const n = ap instanceof PDFDict ? ap.lookup(PDFName.of("N")) : null;
          if (n && typeof n.getContents === "function" && ONE_HORIZONTAL_RULE(decodeStream(n))) drawsARule = true;
        } catch { /* leave false */ }
        if (drawsARule) underlineDrawnAsARule += 1;
        if (examples.length < 4) examples.push({ field: handle.getName(), apDrawsASingleHorizontalRule: drawsARule });
      } else if (style === "/S") solid += 1;
      else if (style) other += 1;
      else undeclared += 1;
    }
  }
  if (underline > 0) rows.push({ source: file, state, underline, underlineDrawnAsARule, solid, other, undeclared, examples });
}

const totalUnderline = rows.reduce((n, r) => n + (r.underline ?? 0), 0);
const totalDrawn = rows.reduce((n, r) => n + (r.underlineDrawnAsARule ?? 0), 0);
const states = new Set(rows.filter((r) => r.underline).map((r) => r.state));

writeFileSync(OUT, JSON.stringify({
  schemaVersion: "rcap-declared-underline-widgets/v1",
  generatedBy: "scripts/grade-a-packet-factory-24h/scan-declared-underline-widgets.mjs",
  generatedAt: new Date().toISOString(),
  question: "Which pinned sources declare, in a widget's own /BS /S, that the field is drawn as an UNDERLINE rather than a box?",
  whyItMatters: "The flatten draws a closepath-stroked rectangle on all four sides regardless. On co_multiple_conviction_seal-set that put a box around every one of sixteen writing rules the court prints as a single line, 277,805 added dark pixels, 58.8% of all added ink on the packet.",
  theRemedyAlreadyExists: "honorWidgetBorderStyle in scripts/rcap-official-forms/rcap-active-content.mjs, whose own comment reads: a court's writing rule delivered as a boxed field is wrong wherever it occurs. Two builders pass it.",
  whatThisIsNot: "Not a defect list. A source declaring underlines is a defect only where a family WRITES one of those fields and flattens it without the option, and that is a measurement on delivered bytes, not on a source. A count is not a remedy.",
  totals: {
    sourcesScanned: globSync(path.join(LIBRARY, "STATES", "*", "*", "*.pdf")).length,
    sourcesDeclaringAnUnderline: rows.filter((r) => r.underline).length,
    statesDeclaringAnUnderline: [...states].sort(),
    underlineWidgets: totalUnderline,
    underlineWidgetsWhoseOwnAppearanceDrawsASingleRule: totalDrawn,
    unreadableSources: rows.filter((r) => r.unreadable).length,
  },
  rows,
  grantsNothing: "A measurement promotes nothing, demotes nothing and approves no packet.",
}, null, 2) + "\n");

console.log(`sources declaring an underline: ${rows.filter((r) => r.underline).length}`);
console.log(`underline widgets:              ${totalUnderline}`);
console.log(`  whose /AP /N draws one rule:  ${totalDrawn}`);
console.log(`states:                         ${[...states].sort().join(", ")}`);
console.log(`unreadable:                     ${rows.filter((r) => r.unreadable).length}`);
