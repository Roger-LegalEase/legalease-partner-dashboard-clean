#!/usr/bin/env node
/*
 * WHICH PINNED SOURCES MAKE THE COURT'S OWN RULE LINE THE FIELD'S DEFAULT VALUE.
 *
 * rcap-official-form-finalize.mjs suppresses a chooser prompt a source ships
 * selected, and it is right to: Nebraska's forms ship selected on "Choose the
 * court", so a filed pleading told the court to choose one. Clearing /V alone
 * does not do it -- pdf-lib leaves the widget's appearance in place and the
 * prompt renders from that -- so the block deletes /V AND /AP.
 *
 * FIX132 found what that costs on a different shape. Indiana's inserts ship 33
 * dropdown fields, 66 widgets, whose /V is a RUN OF UNDERSCORES that is one of
 * the field's own /Opt entries: the publisher made the court's writing rule the
 * form's default. isChooserPrompt matches /^[\s_\-–—.·•]+$/, so /AP goes with
 * it, and 27,179 dark pixels of ruled writing lines vanish from the delivered
 * page while the participant guide names nineteen boxes in that table to fill
 * in by hand.
 *
 * A word prompt and a rule line look alike to that regex and have OPPOSITE
 * remedies. Removing "Choose the court" is correct; removing a rule line erases
 * what the court prints. That is the third pair of this shape today.
 *
 * DECIDING WHETHER TO CHANGE THE SHARED MODULE NEEDS A NUMBER NOBODY HAS.
 *
 * FIX132 estimated the change would reach "forty-odd families" -- that is how
 * many call the finalizer, not how many hit this branch with a rule line. The
 * finalizer's own promptsSuppressed report would answer it, but only 4 of 3,308
 * committed report files carry that key at all, so the delivered record cannot
 * bound the problem either.
 *
 * So this asks the sources. For every pinned source in custody it finds each
 * field whose /V is a value isChooserPrompt would suppress, and separates:
 *
 *   RULE_LINE   the value is a run of rule characters AND is one of the field's
 *               own /Opt entries. The publisher made the printed rule the
 *               default. Suppressing it deletes ink the court prints.
 *   WORD_PROMPT the value is a phrase like "Choose the court". Suppressing it is
 *               the behaviour the block was written for and is correct.
 *
 * It also records the widget's /BS /S, because a border style of /U (underline)
 * is the source itself declaring that the field is drawn as a rule.
 *
 * Read-only. Opens sources, writes one artifact, no packet byte, and decides
 * nothing: a count is not a remedy.
 */
import { readFileSync, writeFileSync, globSync } from "node:fs";
import path from "node:path";
import { PDFDocument, PDFName, PDFString, PDFHexString, PDFArray } from "pdf-lib";
import { isChooserPrompt } from "../rcap-official-forms/rcap-field-semantics.mjs";

const FACTORY = "data/rcap-grade-a/packet-factory-24h";
const OUT = `${FACTORY}/RULE_LINE_DEFAULTS.json`;
const RULE_CHARS = /^[\s_\-–—.·•]+$/;

const asText = (obj) => {
  if (obj instanceof PDFString || obj instanceof PDFHexString) return obj.decodeText();
  if (obj instanceof PDFName) return obj.asString().replace(/^\//, "");
  return null;
};

const optionsOf = (dict) => {
  const opt = dict.lookupMaybe?.(PDFName.of("Opt"), PDFArray) ?? null;
  if (!opt) return [];
  const out = [];
  for (let i = 0; i < opt.size(); i += 1) {
    const entry = opt.lookup(i);
    if (entry instanceof PDFArray && entry.size() > 0) { const t = asText(entry.lookup(1)) ?? asText(entry.lookup(0)); if (t !== null) out.push(t); }
    else { const t = asText(entry); if (t !== null) out.push(t); }
  }
  return out;
};

/*
 * WALK THE CUSTODY, NOT A RECORD THAT POINTS AT IT.
 *
 * The first version of this harvested source paths out of the buildability
 * record and found 45 files and zero findings -- while Indiana's inserts, which
 * carry 32 of them, sat unopened. A scan that misses the one case you already
 * know about is not a low number, it is a broken scan, and reporting its zero
 * would have said the problem was confined to one family when nothing had
 * looked.
 *
 * So this walks the master library's own packet-form directories. That is what
 * is actually in custody, it does not depend on any record staying current, and
 * a source it cannot open is reported rather than skipped.
 */
const LIBRARY = process.env.MASTER_LIBRARY_SOURCE_DIR
  ?? "/home/user/corpus-x/Expungement_AI_RCAP_Master_Library_Edition_1";
const sources = new Map();
for (const file of globSync(path.join(LIBRARY, "STATES", "*", "*", "*.pdf"))) {
  const state = path.relative(LIBRARY, file).split(path.sep)[1] ?? "?";
  sources.set(file, new Set([state]));
}

const rows = [];
for (const [file, families] of sources) {
  let doc;
  try { doc = await PDFDocument.load(readFileSync(file), { ignoreEncryption: true, updateMetadata: false }); }
  catch (error) { rows.push({ source: file, unreadable: String(error.message).slice(0, 140), states: [...families] }); continue; }
  /* A malformed AcroForm array throws inside getFields, not inside getForm, so
   * both go in the same try and the source is REPORTED as unreadable rather
   * than dropped -- a form this scan cannot enumerate is not a form with no
   * findings. */
  let fields;
  try { fields = doc.getForm().getFields(); }
  catch (error) { rows.push({ source: file, unreadable: `form not enumerable: ${String(error.message).slice(0, 120)}`, states: [...families] }); continue; }
  const findings = [];
  for (const handle of fields) {
    if (typeof handle.getOptions !== "function" || typeof handle.getSelected !== "function") continue;
    let selected = [], options = [];
    /* getSelected returns a string on a single-select field in some pdf-lib
     * paths and an array in others; normalise before asking anything of it. */
    try {
      const s = handle.getSelected();
      selected = Array.isArray(s) ? s : (s == null ? [] : [s]);
      const o = handle.getOptions();
      options = Array.isArray(o) ? o : (o == null ? [] : [o]);
    } catch { continue; }
    if (!selected.length) continue;
    if (!selected.some((v) => isChooserPrompt(v, options))) continue;
    const dict = handle.acroField.dict;
    const opts = options.length ? options : optionsOf(dict);
    const widgets = handle.acroField.getWidgets();
    /* lookupMaybe needs a class to test against; passing undefined throws
     * inside pdf-lib rather than returning null. Look the /BS up plainly. */
    const borderStyles = [...new Set(widgets.map((w) => {
      try {
        const bs = w.dict.lookup(PDFName.of("BS"));
        const style = bs?.get?.(PDFName.of("S"));
        return style instanceof PDFName ? style.asString() : null;
      } catch { return null; }
    }).filter(Boolean))];
    const hasAppearance = widgets.some((w) => Boolean(w.dict.get(PDFName.of("AP"))));
    for (const value of selected) {
      const text = String(value ?? "").trim();
      if (!text || !isChooserPrompt(value, options)) continue;
      const isRule = RULE_CHARS.test(text);
      const isOwnOption = opts.some((o) => String(o).trim() === text);
      findings.push({
        field: handle.getName(),
        value: text.slice(0, 40),
        classification: isRule && isOwnOption ? "RULE_LINE" : isRule ? "RULE_SHAPED_BUT_NOT_AN_OPTION" : "WORD_PROMPT",
        valueIsOneOfTheFieldsOwnOptions: isOwnOption,
        widgetCount: widgets.length,
        widgetsCarryingAnAppearance: widgets.filter((w) => Boolean(w.dict.get(PDFName.of("AP")))).length,
        borderStyles,
        theSourceDeclaresAnUnderline: borderStyles.includes("/U"),
      });
    }
    void hasAppearance;
  }
  if (findings.length) rows.push({ source: file, states: [...families].sort(), findings });
}

const count = (cls) => rows.reduce((n, r) => n + (r.findings ?? []).filter((f) => f.classification === cls).length, 0);
const familiesWith = (cls) => new Set(rows.filter((r) => (r.findings ?? []).some((f) => f.classification === cls)).flatMap((r) => r.states ?? [])).size;

writeFileSync(OUT, JSON.stringify({
  schemaVersion: "rcap-rule-line-defaults/v1",
  generatedBy: "scripts/grade-a-packet-factory-24h/scan-rule-line-defaults.mjs",
  generatedAt: new Date().toISOString(),
  question: "Which pinned sources ship a field selected on a value the finalizer's chooser-prompt suppression would delete, and is that value a word prompt (correct to suppress) or the court's own printed rule line (deleting it erases what the court prints)?",
  whyItMatters: "Suppressing a prompt deletes both /V and /AP, because clearing the value alone leaves the widget's appearance to render it. On Indiana that deleted 27,179 dark pixels of ruled writing lines from a FACTS offence grid and a seven-row disposition table, while the participant guide named nineteen boxes in that table to fill in by hand.",
  theDiscriminator: "A run of rule characters that is ALSO one of the field's own /Opt entries is the publisher making the printed rule the default. A phrase like 'Choose the court' is a prompt. They look alike to /^[\\s_\\-–—.·•]+$/ and their remedies are opposite.",
  totals: {
    sourcesScanned: sources.size,
    sourcesWithAFinding: rows.filter((r) => r.findings?.length).length,
    unreadableSources: rows.filter((r) => r.unreadable).length,
    RULE_LINE: count("RULE_LINE"),
    RULE_SHAPED_BUT_NOT_AN_OPTION: count("RULE_SHAPED_BUT_NOT_AN_OPTION"),
    WORD_PROMPT: count("WORD_PROMPT"),
    statesTouchingARuleLine: familiesWith("RULE_LINE"),
    statesTouchingAWordPrompt: familiesWith("WORD_PROMPT"),
  },
  whatThisIsNot: "Not a defect list. A source shipping a rule-line default is only a defect where a family actually flattens that field through the suppression path; a family may never touch it. And a count is not a remedy: changing isChooserPrompt or gating promptsSuppressed moves bytes for every family that calls the finalizer, and that decision is not this file's.",
  rows,
  grantsNothing: "A measurement promotes nothing, demotes nothing and approves no packet.",
}, null, 2) + "\n");

console.log(`sources scanned:            ${sources.size}`);
console.log(`  with a suppressible value: ${rows.filter((r) => r.findings?.length).length}`);
console.log(`  unreadable:                ${rows.filter((r) => r.unreadable).length}`);
console.log(`RULE_LINE fields:            ${count("RULE_LINE")}  across ${familiesWith("RULE_LINE")} state(s)`);
console.log(`RULE_SHAPED not an option:   ${count("RULE_SHAPED_BUT_NOT_AN_OPTION")}`);
console.log(`WORD_PROMPT fields:          ${count("WORD_PROMPT")}  across ${familiesWith("WORD_PROMPT")} state(s)`);
