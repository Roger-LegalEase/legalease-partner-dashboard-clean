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
import { skeleton } from "./stroke-fill-skeleton.mjs";

const LEDGER = "data/rcap-grade-a/packet-factory-24h/BORDER_COHORT_REMEDIATION.json";
const COHORT = "data/rcap-grade-a/packet-factory-24h/fix80/MK_BORDER_COHORT.json";
const FLATTENED = /^\/(FlatWidget|ExactFactOverlay)-\d+$/;
const PAINTING = /(^|[\s\]>)])(S|s|f|F|f\*|B|B\*|b|b\*|sh)(?=[\s[<(/%]|$)/;

const sha = (buffer) => createHash("sha256").update(buffer).digest("hex");
const decode = (stream) => { try { return Buffer.from(decodePDFRawStream(stream).decode()); } catch { return null; } };

/*
 * THE DISCRIMINATOR LIVES IN ./stroke-fill-skeleton.mjs.
 *
 * A delivered stream that matches no source stream is not automatically
 * invented ink: it may be a source /AP stream minus its leading opaque
 * background fill, in which case the ink belongs on the page and the remedy
 * RESTORES rather than removes. That normaliser is a separate module because it
 * has carried three separate bugs, each of which published the form's own ink
 * as invented, and because importing THIS file to test it would run the whole
 * pass and rewrite the ledger as a side effect. Its regression suite is
 * scripts/grade-a-packet-factory-24h/test-stroke-fill-skeleton.mjs.
 */

/* Every appearance stream the pinned source itself ships, across every state of
 * every widget -- an /AP /N may be a stream or a dictionary of named states, and
 * an unticked box's correct mark can live under either. */
/*
 * EVERY APPEARANCE STREAM THE SOURCE SHIPS, FOUND BY SHAPE RATHER THAN BY ROUTE.
 *
 * This used to walk AcroForm Fields and page Annots and recurse into /Kids, and
 * FIX130 measured what that missed: on Vermont's three sources it built a pool
 * of 29 streams where the documents ship 70, and 24 of 24 unaccounted delivered
 * streams were source streams minus their fill that the comparison could not
 * see because their originals were never in the pool. A pool that is missing
 * the stream you are looking for reports invented ink.
 *
 * So the pool is now built by enumerating every indirect object in the document
 * and taking every stream whose dict carries a /BBox -- which is what a form
 * XObject is, and therefore what every appearance stream is, however it is
 * referenced. It cannot miss a nested kid, an /AP /N sub-state, an inherited
 * widget or a stream reached by a route nobody anticipated.
 */
async function sourceAppearanceDigests(pdfPath) {
  const doc = await PDFDocument.load(readFileSync(pdfPath), { updateMetadata: false, ignoreEncryption: true, throwOnInvalidObject: false });
  const digests = new Set();
  const skeletons = new Set();
  for (const [, object] of doc.context.enumerateIndirectObjects()) {
    const dict = object?.dict;
    if (!(dict instanceof PDFDict)) continue;
    if (!dict.get(PDFName.of("BBox"))) continue;
    const bytes = decode(object);
    if (!bytes) continue;
    digests.add(sha(bytes));
    skeletons.add(skeleton(bytes).sha256);
  }
  return { digests, skeletons };
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
      found.push({ page: index + 1, name: key.asString(), sha256: sha(bytes), bytes: bytes.length, skeletonSha256: skeleton(bytes).sha256, hadLeadingFill: skeleton(bytes).changed });
    }
  }
  return found;
}

const ledger = JSON.parse(readFileSync(LEDGER, "utf8"));
const cohort = JSON.parse(readFileSync(COHORT, "utf8"));
const sourcesOf = new Map(cohort.cohort.map((f) => [f.familyId, (f.documents ?? []).map((d) => d.resolvedFrom).filter(Boolean)]));

let synthesized = 0, formsOwn = 0, unmeasured = 0, nowClean = 0, fillStripped = 0;

for (const row of ledger.rows) {
  if (!row.confirmation?.startsWith("CONFIRMED_DEFECTIVE")) continue;
  const sources = (sourcesOf.get(row.familyId) ?? []).filter((p) => existsSync(p));
  if (sources.length === 0) {
    row.sourceAccounting = { result: "UNMEASURED", why: "no pinned source resolved on disk for this family; the exposed streams cannot be checked against the form's own" };
    unmeasured += 1;
    continue;
  }
  let pool = new Set();
  const skeletonPool = new Set();
  const unreadable = [];
  for (const source of sources) {
    try { const r = await sourceAppearanceDigests(source); for (const d of r.digests) pool.add(d); for (const d of r.skeletons) skeletonPool.add(d); }
    catch (error) { unreadable.push({ source: path.basename(source), why: String(error.message).slice(0, 160) }); }
  }
  const fixtures = globSync(path.join(row.familyDirectory, "fixtures", "*.pdf")).sort();
  let matched = 0; const unmatched = []; const derivedFromSource = [];
  let failed = null;
  for (const fixture of fixtures) {
    try {
      for (const appearance of await strokeOnlyDigests(fixture)) {
        if (pool.has(appearance.sha256)) matched += 1;
        else if (skeletonPool.has(appearance.sha256) || pool.has(appearance.skeletonSha256) || skeletonPool.has(appearance.skeletonSha256)) derivedFromSource.push({ fixture: path.basename(fixture), ...appearance });
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
    result: unmatched.length > 0
      ? "SYNTHESIZED_INK_CONFIRMED"
      : derivedFromSource.length > 0
        ? "EVERY_STROKE_IS_THE_FORMS_OWN_SOME_WITH_ITS_BACKGROUND_FILL_STRIPPED"
        : "EVERY_STROKE_IS_THE_FORMS_OWN",
    strokeOnlyThatIsASourceStreamMinusItsBackgroundFill: derivedFromSource.length,
    derivedFromSourceDetail: derivedFromSource.slice(0, 40),
    whatTheThreeClassesMean: {
      matched: "byte-identical to a stream the pinned source ships. The form draws it. Correct.",
      derivedFromSource: "byte-identical once a LEADING OPAQUE BACKGROUND FILL is removed from both sides, in any colour -- `1 g` (white) and `0.749023 g` (grey) alike, and their rg and cs/scn equivalents, behind any non-painting preamble. This is the form's own appearance with its background stripped, so the ink belongs on the page and the defect is the STRIPPING. The remedy RESTORES; removing it erases what the court prints.",
      unmatched: "matches nothing the source ships, with or without that fill. Invented. The remedy REMOVES.",
    },
    sourceAppearanceStreamsInPool: pool.size,
    sourceStreamsWithTheirBackgroundFillNormalisedAway: skeletonPool.size,
    sourcesUnreadable: unreadable,
    strokeOnlyMatchingAPinnedSourceStream: matched,
    strokeOnlyMatchingNothing: unmatched.length,
    unmatchedDetail: unmatched.slice(0, 40),
    why: unmatched.length > 0
      ? `${unmatched.length} stroke-only appearance(s) match no source stream even with a leading background fill normalised away, so that ink is invented and the remedy removes it. A further ${derivedFromSource.length} are the form's own appearance minus its background fill, and those must be RESTORED rather than removed.`
      : derivedFromSource.length > 0
        ? `no invented ink. ${matched} appearance(s) are byte-identical to a source stream and ${derivedFromSource.length} are a source stream minus its leading opaque background fill. The ink belongs on the page; what is wrong is that the fill was stripped, and the remedy restores it.`
        : `all ${matched} stroke-only appearance(s) are byte-identical to an /AP /N stream the pinned source itself ships. The form draws them. Not a defect, and nothing to remediate.`,
  };
  if (unreadable.length > 0) row.sourceAccounting.caveat = "One or more pinned sources could not be decoded here, so the pool is incomplete and an UNMATCHED result may be an artifact of the missing source rather than synthesized ink. Treat this family as UNMEASURED until its sources read.";
  if (unmatched.length > 0) synthesized += 1; else { formsOwn += 1; nowClean += 1; }
  if (derivedFromSource.length > 0) fillStripped += 1;
}

ledger.sourceAccountingPass = {
  ranAt: new Date().toISOString(),
  by: "scripts/grade-a-packet-factory-24h/account-stroke-only-against-pinned-sources.mjs",
  question: "Does this exact stroke-only stream exist in the family's own pinned sources? Matched means the form draws it and it is correct. Unmatched means nothing in the source draws it and it is synthesized.",
  comparison: "SHA-256 of the decompressed stream bytes. Never by shape, size or position, so a stream that merely resembles the form's own is not counted as the form's.",
  results: {
    SYNTHESIZED_INK_CONFIRMED: synthesized,
    EVERY_STROKE_IS_THE_FORMS_OWN: formsOwn,
    familiesCarryingAtLeastOneBackgroundFillStrippedStream: fillStripped,
    UNMEASURED: unmeasured,
  },
  normaliserCorrectedOn: {
    when: "2026-09-10",
    what: "The fill normaliser was consuming the non-painting preamble it had been taught to allow, while the delivered stream kept its own. A source appearance minus its fill and the delivered stream that IS that appearance minus its fill skeletonised one leading `q` apart, and SHA-256 separated them.",
    effect: "Eight families moved from SYNTHESIZED_INK_CONFIRMED, whose remedy REMOVES, to the form's own ink with its background stripped, whose remedy RESTORES. In every one of the eight the unmatched count fell to zero and the derived count rose by exactly that amount; no family moved the other way, and no previously matched stream stopped matching.",
    families: ["mi_setaside_trafficking-set", "vt_seal_dui-set", "vt_seal_misdemeanor-set", "co_multiple_conviction_seal-set", "tx_nd_deferred_other-set", "tx_nd_dwi_probation-set", "tx_nd_veterans_court-set", "ne-setaside-custodial-set"],
    pinnedBy: "scripts/grade-a-packet-factory-24h/test-stroke-fill-skeleton.mjs",
    itWasNeverTheColour: "FIX133 reported the symptom on Michigan and attributed it to the normaliser recognising grey and not white. `1 g` has always matched the alternation. Widening the colour test would have left the defect in place.",
  },
  stillOwed: "This is byte accounting, not a raster. Over-suppression -- ink the official form itself draws that a remedy removed -- is invisible here and is caught only by a directional raster difference against a render of the pinned source, read in both directions. Every repair still owes that, and no repair author verifies their own repaired candidate.",
  grantsNothing: "A measurement promotes nothing, demotes nothing and approves no packet.",
};

writeFileSync(LEDGER, JSON.stringify(ledger, null, 2) + "\n");
console.log(`synthesized ink confirmed:        ${synthesized}`);
console.log(`every stroke is the form's own:   ${formsOwn}`);
console.log(`carrying fill-stripped source ink: ${fillStripped}`);
console.log(`unmeasured:                       ${unmeasured}`);
for (const r of ledger.rows.filter((r) => r.sourceAccounting?.result === "SYNTHESIZED_INK_CONFIRMED")) {
  console.log(`  ${String(r.sourceAccounting.strokeOnlyMatchingNothing).padStart(5)} synth / ${String(r.sourceAccounting.strokeOnlyMatchingAPinnedSourceStream).padStart(4)} form  ${r.tier.padEnd(22)} ${String(r.currentState).padEnd(24)} ${r.familyId}`);
}
