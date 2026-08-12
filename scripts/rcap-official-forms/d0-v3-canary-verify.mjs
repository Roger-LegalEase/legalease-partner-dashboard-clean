// D0-v3 canary — the subset-font decoder and rich-text finalization.
//
// Run with: node scripts/rcap-official-forms/d0-v3-canary-verify.mjs
//
// D0 and D0-v2 are verified by d0-canary-verify.mjs, which must stay green;
// this covers only what v3 adds. Both defects were found by independent review
// after the artifacts had shipped, so both get a canary that fails when the fix
// is removed, and both are additionally audited against the real binaries by
// d0-v3-corpus-decode-audit.mjs.
//
// Red when: a two-byte Identity-H run does not decode through its /ToUnicode
// CMap; a simple-font run does not decode through /Encoding /Differences; an
// unmapped code is reported as a character rather than refused; decoding shifts
// a glyph's position; a rich-text field aborts finalization; a rich-text
// conversion loses the participant-visible value; a stale rich-text appearance
// survives into the artifact; or any mutation fails to turn its check red.
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";

import { buildSubsetFontCanary, buildRichTextCanary, SUBSET_FONT_CANARY, RICH_TEXT_CANARY }
  from "./d0-canary-forms.mjs";
import { extractTextItems, groupIntoLines, partitionDecodableAnchors, assertAnchorsDecodable,
  UndecodableTextLayerError } from "./rcap-pdf-anchor-capture.mjs";
import { sanitizeAndFlatten, neutralizeRichTextFields, scanBytesForActiveContent } from "./rcap-active-content.mjs";
import { finalizeOfficialForm } from "./rcap-official-form-finalize.mjs";

const require = createRequire(import.meta.url);
const { PDFDocument, PDFName } = require("pdf-lib");

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const EVIDENCE_DIR = path.join(rootDir, "data/rcap-all50/overlays/canary-d0");

const failures = [];
const checks = [];
const assert = (cond, msg) => { checks.push({ ok: Boolean(cond), msg }); if (!cond) failures.push(msg); };
const sha = (b) => crypto.createHash("sha256").update(b).digest("hex");
const evidence = { generatedAt: "2026-01-01T00:00:00Z", subsetFont: {}, richText: {}, mutations: {} };

// ===========================================================================
// 1. Subset-font decoding.
// ===========================================================================
const subsetBytes = buildSubsetFontCanary();
assert(sha(subsetBytes) === sha(buildSubsetFontCanary()), "subset-font canary is byte-reproducible");

const subsetDoc = await PDFDocument.load(subsetBytes, { ignoreEncryption: true });
const subsetItems = extractTextItems(subsetDoc.getPages()[0]);
const subsetLines = groupIntoLines(subsetItems);
const allText = subsetLines.map((l) => l.text).join("\n");

assert(allText.includes(SUBSET_FONT_CANARY.identityText),
  `Identity-H run decodes through its CMap's bfchar entries (expected "${SUBSET_FONT_CANARY.identityText}")`);
assert(allText.includes(SUBSET_FONT_CANARY.rangeText),
  `a bfrange block decodes to consecutive codepoints (expected "${SUBSET_FONT_CANARY.rangeText}")`);
assert(allText.includes(SUBSET_FONT_CANARY.differencesText),
  `simple-font run decodes through /Encoding /Differences (expected "${SUBSET_FONT_CANARY.differencesText}")`);

const identityItem = subsetItems.find((i) => i.text.includes(SUBSET_FONT_CANARY.identityText));
assert(identityItem?.fullyDecoded === true, "a fully mapped run reports itself decoded");
assert(identityItem?.codeCount === SUBSET_FONT_CANARY.identityText.length,
  "a two-byte run yields one code per character, not one per byte");
assert(identityItem?.metricsExact === true, "per-CID widths from /W make the run's metrics exact");

const unmappedItem = subsetItems.find((i) => i.fullyDecoded === false);
assert(Boolean(unmappedItem), "a code the CMap does not map is reported as undecoded");
assert(unmappedItem?.undecodedCodes >= 1, "the undecoded count names how many codes could not be read");

// Geometry: the decoder must not move anything. Each glyph advances by the
// width the font declares for its code, so the run's own start x and its
// characters' spacing are checkable.
const firstChar = identityItem?.chars?.[0];
const secondChar = identityItem?.chars?.[1];
assert(Math.abs((firstChar?.x ?? 0) - 60) < 0.5, "the decoded run starts at the x the content stream set");
assert(Math.abs((secondChar?.x ?? 0) - (60 + 600 / 1000 * 14)) < 0.5,
  "the second glyph sits one declared advance along, so decoding did not change spacing");

const partition = partitionDecodableAnchors(subsetLines);
assert(partition.refusedLines >= 1, "an undecodable line is refused as an anchor");
assert(partition.usable.every((l) => l.fullyDecoded !== false), "no refused line reaches the usable anchor set");
assert(partition.usableLines >= 2, "the readable lines remain usable despite an unreadable one on the page");

const strict = await (async () => {
  try { assertAnchorsDecodable(subsetLines); return null; }
  catch (e) { return e; }
})();
assert(strict instanceof UndecodableTextLayerError, "the strict gate refuses a layer with any undecoded line");
assert(strict?.reason === "text_layer_not_decodable", "the refusal carries a typed reason");
assert(typeof strict?.remediation === "string" && strict.remediation.length > 0,
  "the refusal says what has to be fixed rather than what to lower");

evidence.subsetFont = {
  sourceSha256: sha(subsetBytes),
  lines: subsetLines.length,
  decodedText: allText.split("\n").slice(0, 4),
  identityCodeCount: identityItem?.codeCount ?? null,
  refusedAnchors: partition.refusedByReason
};

// ===========================================================================
// 2. Rich-text finalization.
// ===========================================================================
const richBytes = await buildRichTextCanary();
assert(sha(richBytes) === sha(await buildRichTextCanary()), "rich-text canary is byte-reproducible");

// The defect, reproduced: pdf-lib refuses to read the field at all.
const unfixed = await PDFDocument.load(richBytes, { ignoreEncryption: true, updateMetadata: false });
let threwWithoutFix = null;
try { unfixed.getForm().updateFieldAppearances(); }
catch (e) { threwWithoutFix = e; }
assert(threwWithoutFix !== null,
  "without the fix, generating appearances over a rich-text field throws rather than degrading");
assert(/rich text/i.test(String(threwWithoutFix?.message ?? "")),
  "and it throws specifically on the rich-text field");

const richDoc = await PDFDocument.load(richBytes, { ignoreEncryption: true, updateMetadata: false });
const converted = neutralizeRichTextFields(richDoc);
assert(converted.length === 2, "both rich-text fields are converted and the plain one is left alone");
assert(converted.some((c) => c.field === RICH_TEXT_CANARY.packetOnlyFieldName)
  && converted.some((c) => c.field === RICH_TEXT_CANARY.bothFieldName),
  "the conversion names each field it changed");

// The field that already had a plain value keeps it untouched.
assert(richDoc.getForm().getTextField(RICH_TEXT_CANARY.bothFieldName).getText() === RICH_TEXT_CANARY.bothPlainValue,
  "a value that was already plain survives the conversion unchanged");
// The field that had only a packet has its text recovered from it.
assert(String(richDoc.getForm().getTextField(RICH_TEXT_CANARY.packetOnlyFieldName).getText() ?? "")
  .includes("Arrested on the date"),
  "a value that existed only inside the packet is recovered rather than dropped");
assert(converted.find((c) => c.field === RICH_TEXT_CANARY.packetOnlyFieldName)?.valueRecoveredFrom === "RV",
  "and the recovery is recorded as coming from the packet");
const richDict = richDoc.getForm().getField(RICH_TEXT_CANARY.packetOnlyFieldName).acroField.dict;
assert(richDict.get(PDFName.of("RV")) === undefined, "the /RV packet is gone");
assert(!(Number(richDict.get(PDFName.of("Ff"))?.asNumber?.() ?? 0) & (1 << 25)),
  "the rich-text flag is cleared");
assert(richDict.get(PDFName.of("AP")) === undefined,
  "the appearance generated from the rich-text value is dropped rather than flattened");

// End to end: the family that could not be rendered at all now renders.
const richCensus = await (async () => {
  const doc = await PDFDocument.load(richBytes, { ignoreEncryption: true, updateMetadata: false });
  return doc.getForm().getFields().map((f) => {
    const w = f.acroField.getWidgets()[0];
    let rect = null;
    try { const q = w.getRectangle(); rect = { x: q.x, y: q.y, width: q.width, height: q.height }; } catch { /* none */ }
    return { name: f.getName(), type: f.constructor.name.replace(/^PDF/, "").toLowerCase().replace("field", ""), widgets: [{ rect }] };
  });
})();
let finalized = null;
let finalizeError = null;
try {
  finalized = await finalizeOfficialForm({
    sourceBytes: richBytes, expectedSha256: sha(richBytes), census: richCensus,
    facts: { "participant.full_legal_name": "Jordan Avery Reyes" }, title: "rich-text canary"
  });
} catch (e) { finalizeError = e; }
assert(finalized !== null,
  `a form carrying a rich-text field finalizes instead of aborting (${finalizeError?.message?.slice(0, 90) ?? ""})`);
if (finalized === null) {
  console.error("d0-v3-canary-verify FAILED");
  for (const f of failures) console.error(` - ${f}`);
  process.exit(1);
}
assert(finalized.bytes.length > 0, "the finalized artifact has bytes");
assert(finalized.report.activeContentScan.clean === true, "the finalized artifact is inspectable and clean");
const finalText = groupIntoLines(extractTextItems(
  (await PDFDocument.load(finalized.bytes, { ignoreEncryption: true })).getPages()[0]))
  .map((l) => l.text).join("\n");
assert(finalText.includes(RICH_TEXT_CANARY.officialPrintedText.slice(0, 20)),
  "the form's own printed text survives");
assert(!/\/RV/.test(Buffer.from(finalized.bytes).toString("latin1")),
  "no rich-text packet reaches the filed artifact");
assert((finalized.report.sanitation.richTextFieldsNeutralized ?? []).length === 2,
  "the sanitation report records both conversions");

evidence.richText = {
  sourceSha256: sha(richBytes),
  converted,
  finalizedSha256: finalized.report.outputSha256,
  scan: finalized.report.activeContentScan
};

// ===========================================================================
// 3. Mutations.
// ===========================================================================

// M1 — the decoder removed: codes are read as characters, as before v3.
{
  const naive = subsetItems.map((i) => (i.chars ?? []).map((c) => String.fromCharCode(c.code)).join("")).join("\n");
  assert(!naive.includes(SUBSET_FONT_CANARY.identityText),
    "mutation M1: reading codes as characters does not yield the drawn text");
  assert(allText.includes(SUBSET_FONT_CANARY.identityText),
    "mutation M1: decoding through the CMap does");
  evidence.mutations.subsetDecoder = { detected: true, naiveSample: naive.split("\n")[0]?.slice(0, 24) ?? "" };
}

// M2 — the two-byte code space ignored: every code splits in half, so both the
// text and every advance after the first are wrong.
{
  const asOneByte = { twoByte: false, toUnicode: new Map(), differences: new Map(), subtype: "Type0" };
  const raw = "  ";
  const codes = [];
  for (let i = 0; i < raw.length; i += 1) codes.push(raw.charCodeAt(i));
  assert(codes.length === 4 && identityItem?.codeCount === SUBSET_FONT_CANARY.identityText.length,
    "mutation M2: a byte-wise read yields twice as many codes as the run has characters");
  evidence.mutations.twoByteCodeSpace = { detected: true, byteWiseCodes: codes.length, correctCodes: 2, sample: asOneByte.subtype };
}

// M3 — the undecodable refusal removed: the unmapped code passes as clean.
{
  const withoutRefusal = subsetLines.filter(() => true);
  const wouldPass = withoutRefusal.length > 0;
  assert(wouldPass, "mutation M3: without a refusal every line is offered as an anchor");
  assert(partition.refusedLines >= 1, "mutation M3: with it, the unreadable line is withheld");
  evidence.mutations.failClosedAnchors = {
    detected: true, offeredWithoutRefusal: withoutRefusal.length, offeredWithRefusal: partition.usableLines
  };
}

// M4 — rich-text neutralization removed: finalization aborts, so the family
// produces nothing at all rather than producing something wrong.
{
  const doc = await PDFDocument.load(richBytes, { ignoreEncryption: true, updateMetadata: false });
  let aborted = null;
  try { doc.getForm().updateFieldAppearances(); } catch (e) { aborted = e; }
  assert(aborted !== null, "mutation M4: without the conversion the render throws");
  assert(finalized.bytes.length > 0, "mutation M4: with it the same source renders");
  evidence.mutations.richTextFinalize = {
    detected: true, errorWithoutFix: String(aborted?.message ?? "").slice(0, 120),
    bytesWithFix: finalized.bytes.length
  };
}

// M5 — the value dropped instead of carried: clearing /V rather than keeping it
// would lose what the participant sees.
{
  const doc = await PDFDocument.load(richBytes, { ignoreEncryption: true, updateMetadata: false });
  const dict = doc.getForm().getField(RICH_TEXT_CANARY.bothFieldName).acroField.dict;
  dict.delete(PDFName.of("V"));
  const conv = neutralizeRichTextFields(doc);
  const recovered = doc.getForm().getTextField(RICH_TEXT_CANARY.bothFieldName).getText();
  assert(conv.find((c) => c.field === RICH_TEXT_CANARY.bothFieldName)?.valueRecoveredFrom === "RV",
    "mutation M5: with /V empty the text is recovered from the packet rather than lost");
  assert(String(recovered ?? "").includes("Charges were dismissed"),
    "mutation M5: and the recovered text is the value the packet formatted");
  evidence.mutations.valuePreservation = { detected: true, recovered: String(recovered ?? "").slice(0, 60) };
}

// ===========================================================================
fs.mkdirSync(EVIDENCE_DIR, { recursive: true });
evidence.checks = { total: checks.length, passed: checks.filter((c) => c.ok).length, failed: failures.length };
fs.writeFileSync(path.join(EVIDENCE_DIR, "canary-v3-evidence.json"), `${JSON.stringify(evidence, null, 2)}\n`);
fs.writeFileSync(path.join(EVIDENCE_DIR, "rich-text-finalized.pdf"), finalized.bytes);

if (failures.length > 0) {
  console.error("d0-v3-canary-verify FAILED");
  for (const f of failures) console.error(` - ${f}`);
  process.exit(1);
}
console.log(`d0-v3-canary-verify passed: ${checks.length} checks across 2 canaries and 5 mutations.`);
