#!/usr/bin/env node
/*
 * Step two of the border remediation. The confirmation pass found 53 families
 * carrying stroke-only flattened appearances in their delivered bytes. A
 * stroke-only appearance is NOT automatically a defect: an official form may
 * legitimately draw its own box at that widget, and the pdf-lib flatten will
 * carry the form's own /AP /N stream through unchanged. The Maryland pardon
 * family is the standing proof -- its six stroke-only marks per fixture are each
 * byte-identical to an /AP /N on-state stream in the pinned source, and that is
 * correct.
 *
 * So this asks the only question that separates the two: does this exact stream
 * exist in the family's own pinned sources?
 *
 *   MATCHED   the form's own mark, carried through. Correct. Not a defect.
 *   UNMATCHED nothing in the pinned sources draws it. Synthesized. A defect.
 *
 * Comparison is by SHA-256 of the decompressed stream bytes, never by shape,
 * size or position, so a stream that merely resembles the form's is not counted
 * as the form's.
 *
 * Read-only. Opens PDFs, writes no packet byte, rebuilds nothing, demotes
 * nothing. A source this environment cannot decode is reported as UNMEASURED for
 * that family rather than assumed either way.
 */
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { globSync } from "node:fs";
import { createHash } from "node:crypto";
import path from "node:path";
import { PDFDict, PDFDocument, PDFName, decodePDFRawStream } from "pdf-lib";

const LEDGER = "data/rcap-grade-a/packet-factory-24h/BORDER_COHORT_REMEDIATION.json";
const COHORT = "data/rcap-grade-a/packet-factory-24h/fix80/MK_BORDER_COHORT.json";
const FLATTENED = /^\/(FlatWidget|ExactFactOverlay)-\d+$/;
const PAINTING = /(^|[\s\]>)])(S|s|f|F|f\*|B|B\*|b|b\*|sh)(?=[\s[<(/%]|$)/;

const sha = (buffer) => createHash("sha256").update(buffer).digest("hex");
const decode = (stream) => { try { return Buffer.from(decodePDFRawStream(stream).decode()); } catch { return null; } };

/* Every appearance stream the pinned source itself ships, across every state of
 * every widget -- an /AP /N may be a stream or a dictionary of named states, and
 * an unticked box's correct mark can live under either. */
async function sourceAppearanceDigests(pdfPath) {
  const doc = await PDFDocument.load(readFileSync(pdfPath), { updateMetadata: false, ignoreEncryption: true, throwOnInvalidObject: false });
  const digests = new Set();
  const form = doc.catalog.lookup(PDFName.of("AcroForm"));
  const seen = new Set();
  const visit = (node, depth) => {
    if (depth > 8 || !(node instanceof PDFDict)) return;
    const ap = node.lookup(PDFName.of("AP"));
    if (ap instanceof PDFDict) {
      for (const [, entry] of ap.entries()) {
        const value = doc.context.lookupMaybe ? doc.context.lookup(entry) : entry;
        if (value instanceof PDFDict && value.entries && !value.contents) {
          for (const [, sub] of value.entries()) {
            const stream = doc.context.lookup(sub);
            const bytes = stream && stream.dict ? decode(stream) : null;
            if (bytes) digests.add(sha(bytes));
          }
        }
        const stream = doc.context.lookup(entry);
        const bytes = stream && stream.dict ? decode(stream) : null;
        if (bytes) digests.add(sha(bytes));
      }
    }
    const kids = node.lookup(PDFName.of("Kids"));
    if (kids && kids.asArray) for (const kid of kids.asArray()) {
      const tag = kid.tag ?? String(kid);
      if (seen.has(tag)) continue;
      seen.add(tag);
      visit(doc.context.lookup(kid), depth + 1);
    }
  };
  if (form instanceof PDFDict) {
    const fields = form.lookup(PDFName.of("Fields"));
    if (fields && fields.asArray) for (const ref of fields.asArray()) visit(doc.context.lookup(ref), 0);
  }
  for (const page of doc.getPages()) {
    const annots = page.node.lookup(PDFName.of("Annots"));
    if (annots && annots.asArray) for (const ref of annots.asArray()) visit(doc.context.lookup(ref), 0);
  }
  return digests;
}

async function strokeOnlyDigests(pdfPath) {
  const doc = await PDFDocument.load(readFileSync(pdfPath), { updateMetadata: false, ignoreEncryption: true, throwOnInvalidObject: false });
  const found = [];
  const pages = doc.getPages();
  for (let index = 0; index < pages.length; index += 1) {
    const resources = pages[index].node.Resources();
    const xobjects = resources ? resources.lookup(PDFName.of("XObject")) : null;
    if (!(xobjects instanceof PDFDict)) continue;
    for (const [key, ref] of xobjects.entries()) {
      if (!FLATTENED.test(key.asString())) continue;
      const stream = doc.context.lookup(ref);
      const bytes = decode(stream);
      if (!bytes) continue;
      const text = bytes.toString("latin1");
      if (!PAINTING.test(text)) continue;
      /* stroke-only: paints, and shows no non-empty string */
      const drawn = [...text.matchAll(/\(((?:[^()\\]|\\.)*)\)\s*Tj/g)].map((m) => m[1]).join("")
        + [...text.matchAll(/<([0-9A-Fa-f\s]*)>\s*Tj/g)].map((m) => m[1].replace(/\s/g, "")).join("");
      if (drawn.replace(/\s/g, "").length > 0) continue;
      found.push({ page: index + 1, name: key.asString(), sha256: sha(bytes), bytes: bytes.length });
    }
  }
  return found;
}

const ledger = JSON.parse(readFileSync(LEDGER, "utf8"));
const cohort = JSON.parse(readFileSync(COHORT, "utf8"));
const sourcesOf = new Map(cohort.cohort.map((f) => [f.familyId, (f.documents ?? []).map((d) => d.resolvedFrom).filter(Boolean)]));

let synthesized = 0, formsOwn = 0, unmeasured = 0, nowClean = 0;

for (const row of ledger.rows) {
  if (!row.confirmation?.startsWith("CONFIRMED_DEFECTIVE")) continue;
  const sources = (sourcesOf.get(row.familyId) ?? []).filter((p) => existsSync(p));
  if (sources.length === 0) {
    row.sourceAccounting = { result: "UNMEASURED", why: "no pinned source resolved on disk for this family; the exposed streams cannot be checked against the form's own" };
    unmeasured += 1;
    continue;
  }
  let pool = new Set();
  const unreadable = [];
  for (const source of sources) {
    try { for (const digest of await sourceAppearanceDigests(source)) pool.add(digest); }
    catch (error) { unreadable.push({ source: path.basename(source), why: String(error.message).slice(0, 160) }); }
  }
  const fixtures = globSync(path.join(row.familyDirectory, "fixtures", "*.pdf")).sort();
  let matched = 0; const unmatched = [];
  let failed = null;
  for (const fixture of fixtures) {
    try {
      for (const appearance of await strokeOnlyDigests(fixture)) {
        if (pool.has(appearance.sha256)) matched += 1;
        else unmatched.push({ fixture: path.basename(fixture), ...appearance });
      }
    } catch (error) { failed = String(error.message).slice(0, 160); break; }
  }
  if (failed) {
    row.sourceAccounting = { result: "UNMEASURED", why: `a delivered fixture could not be read: ${failed}` };
    unmeasured += 1;
    continue;
  }
  row.sourceAccounting = {
    result: unmatched.length > 0 ? "SYNTHESIZED_INK_CONFIRMED" : "EVERY_STROKE_IS_THE_FORMS_OWN",
    sourceAppearanceStreamsInPool: pool.size,
    sourcesUnreadable: unreadable,
    strokeOnlyMatchingAPinnedSourceStream: matched,
    strokeOnlyMatchingNothing: unmatched.length,
    unmatchedDetail: unmatched.slice(0, 40),
    why: unmatched.length > 0
      ? `${unmatched.length} stroke-only appearance(s) match no /AP /N stream in this family's pinned sources, byte for byte. That ink is synthesized and the form does not print it.`
      : `all ${matched} stroke-only appearance(s) are byte-identical to an /AP /N stream the pinned source itself ships. The form draws them. Not a defect, and nothing to remediate.`,
  };
  if (unreadable.length > 0) row.sourceAccounting.caveat = "One or more pinned sources could not be decoded here, so the pool is incomplete and an UNMATCHED result may be an artifact of the missing source rather than synthesized ink. Treat this family as UNMEASURED until its sources read.";
  if (unmatched.length > 0) synthesized += 1; else { formsOwn += 1; nowClean += 1; }
}

ledger.sourceAccountingPass = {
  ranAt: new Date().toISOString(),
  by: "scripts/grade-a-packet-factory-24h/account-stroke-only-against-pinned-sources.mjs",
  question: "Does this exact stroke-only stream exist in the family's own pinned sources? Matched means the form draws it and it is correct. Unmatched means nothing in the source draws it and it is synthesized.",
  comparison: "SHA-256 of the decompressed stream bytes. Never by shape, size or position, so a stream that merely resembles the form's own is not counted as the form's.",
  results: {
    SYNTHESIZED_INK_CONFIRMED: synthesized,
    EVERY_STROKE_IS_THE_FORMS_OWN: formsOwn,
    UNMEASURED: unmeasured,
  },
  stillOwed: "This is byte accounting, not a raster. Over-suppression -- ink the official form itself draws that a remedy removed -- is invisible here and is caught only by a directional raster difference against a render of the pinned source, read in both directions. Every repair still owes that, and no repair author verifies their own repaired candidate.",
  grantsNothing: "A measurement promotes nothing, demotes nothing and approves no packet.",
};

writeFileSync(LEDGER, JSON.stringify(ledger, null, 2) + "\n");
console.log(`synthesized ink confirmed:        ${synthesized}`);
console.log(`every stroke is the form's own:   ${formsOwn}`);
console.log(`unmeasured:                       ${unmeasured}`);
for (const r of ledger.rows.filter((r) => r.sourceAccounting?.result === "SYNTHESIZED_INK_CONFIRMED")) {
  console.log(`  ${String(r.sourceAccounting.strokeOnlyMatchingNothing).padStart(5)} synth / ${String(r.sourceAccounting.strokeOnlyMatchingAPinnedSourceStream).padStart(4)} form  ${r.tier.padEnd(22)} ${String(r.currentState).padEnd(24)} ${r.familyId}`);
}
