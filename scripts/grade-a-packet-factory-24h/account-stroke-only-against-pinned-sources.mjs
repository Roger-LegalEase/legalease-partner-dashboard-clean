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

/*
 * THE DISCRIMINATOR, NAMED ON THE BYTES BY VF22 AND FIX01 ON 2026-09-10.
 *
 * A delivered stream that matches no source stream is not automatically invented
 * ink. On co_petition_seal_arrest-set all 36 unmatched streams were a source
 * /AP stream minus its opaque background fill, and on
 * co_motion_seal_nonconviction-set every fill-only appearance is byte-identical
 * to a source /AP /N /Off stream whose /N differs from its /D only by a LEADING
 * OPAQUE BACKGROUND FILL -- `0.749023 g ... re f`.
 *
 * That distinction decides the remedy and nothing else does. Ink the source does
 * not ship is invented and is REMOVED. Ink that is the form's own appearance
 * with its background fill stripped is the form's ink and the remedy RESTORES --
 * a lane that removes it erases what the court prints, which has already
 * happened once in this cohort and cost a 213.6pt rule.
 *
 * So an unmatched stream is compared a second time against every source stream
 * with a leading fill removed from BOTH sides. The comparison stays SHA-256 of
 * bytes; only the leading fill is normalised away, and only a fill that sits at
 * the very start before any other painting.
 */
/*
 * TWO BUGS FIX131 FOUND IN THIS, AND NEITHER WAS THE FILL COLOUR.
 *
 * The regex matched `1 g` correctly and still reported 0 fill-stripped streams
 * across five Texas families whose ink was 100% fill-stripped source ink.
 *
 * First, whitespace. `^\s*` sat BEFORE the fill, so a source stream skeletonised
 * to text beginning at its next operator while the DELIVERED stream -- which had
 * the fill excised in place -- still began with the newlines left where it stood.
 * The two skeletons differed by two whitespace bytes and SHA-256 separated them.
 * Whitespace is now collapsed on both sides after stripping.
 *
 * Second, the fill is not always first. The Texas order's /Off opens `q` before
 * its fill, so the fill sat at no `^` at all and the pattern never fired. A
 * non-painting preamble -- `q`, a `cm`, a `gs`, a `w` -- is now allowed to
 * precede it, because none of those marks the page.
 */
const PREAMBLE = "(?:\\s*(?:q|Q|[-\\d.]+(?:\\s+[-\\d.]+){5}\\s+cm|\\/[A-Za-z0-9_.-]+\\s+gs|[-\\d.]+\\s+w|[-\\d.]+\\s+[JjMi]|\\[[^\\]]*\\]\\s*[-\\d.]+\\s+d))*";
const LEADING_FILL = new RegExp(
  "^" + PREAMBLE
  + "\\s*(?:[\\d.]+\\s+g|[\\d.]+\\s+[\\d.]+\\s+[\\d.]+\\s+rg|\\/[A-Za-z0-9_.-]+\\s+cs\\s+[\\d.\\s]+scn)"
  + "\\s+[-\\d.]+\\s+[-\\d.]+\\s+[-\\d.]+\\s+[-\\d.]+\\s+re\\s+f\\*?\\s*");
const skeleton = (buffer) => {
  const text = buffer.toString("latin1");
  const stripped = text.replace(LEADING_FILL, "");
  /* Collapse whitespace on BOTH sides after stripping. Excising a fill in place
   * leaves the newlines that stood around it, and two streams that differ only
   * by those bytes are the same drawing. */
  const normalised = stripped.replace(/\s+/g, " ").trim();
  return { changed: stripped !== text, sha256: sha(Buffer.from(normalised, "latin1")) };
};

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
      derivedFromSource: "byte-identical once a LEADING OPAQUE BACKGROUND FILL is removed from both sides -- 0.749023 g ... re f and its rg/scn equivalents. This is the form's own appearance with its background stripped, so the ink belongs on the page and the defect is the STRIPPING. The remedy RESTORES; removing it erases what the court prints.",
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
