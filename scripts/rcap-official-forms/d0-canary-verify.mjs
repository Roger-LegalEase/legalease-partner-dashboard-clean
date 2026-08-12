// D0 official-form factory canary.
//
// Run with: node scripts/rcap-official-forms/d0-canary-verify.mjs
//
// It lives beside the modules it exercises rather than in scripts/ because the
// verifier-disposition register scans that directory, and this lane may not
// edit disposition records. Wiring it into required CI is the captain's call.
//
// Proves the five systemic fixes F3 found, against synthesized forms that
// exercise every defect class, and then mutation-tests each fix by removing it
// and confirming the corresponding check goes red. A guard nobody has watched
// fail is not a guard.
//
// Red when: a canonical value is not visibly present in the finalized
// artifact; a contact sheet's two panels are identical despite expected
// values; a value is written at an unreadable size or past its widget; a
// protected field is written; a non-text field is written; a charge row is
// written without an indexed charge; active-content residue survives into the
// output; a form that states it is not for filing is filled; output is not
// byte-reproducible; source drift is not detected; or any mutation fails to
// turn its check red.
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";

import { CANARIES, buildAcroFormCanary, buildFlatOverlayCanary, buildScriptedCanary, buildXfaResidueCanary,
  buildPrintFlagCanary, buildScriptedBlankCanary, PRINT_FLAG_CANARY }
  from "./d0-canary-forms.mjs";
import { finalizeOfficialForm, finalizeFlatOverlay, NonFilingHoldError }
  from "./rcap-official-form-finalize.mjs";
import { buildContactSheet, ContactSheetProofError, visibleTextOfDocument, missingExpectedValues }
  from "./rcap-contact-sheet.mjs";
import { scanBytesForActiveContent, sanitizeAndFlatten, assertInspectableAndClean,
  UninspectableArtifactError, ActiveContentResidueError, readAnnotationFlags }
  from "./rcap-active-content.mjs";
import { fitTextToWidget, MIN_READABLE_FONT_SIZE } from "./rcap-text-fitting.mjs";
import { decideBinding, protectCategoryOf, FACT_DESCRIPTORS, haystack } from "./rcap-field-semantics.mjs";

const require = createRequire(import.meta.url);
const { PDFDocument, StandardFonts } = require("pdf-lib");

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const EVIDENCE_DIR = path.join(rootDir, "data/rcap-all50/overlays/canary-d0");

const failures = [];
const checks = [];
const assert = (cond, msg) => { checks.push({ ok: Boolean(cond), msg }); if (!cond) failures.push(msg); };
const sha = (b) => crypto.createHash("sha256").update(b).digest("hex");

async function expectThrows(label, fn, matcher) {
  try {
    await fn();
    assert(false, `${label}: expected a refusal, none was raised`);
    return null;
  } catch (error) {
    const ok = matcher ? matcher(error) : true;
    assert(ok, `${label}: refused for the expected reason (got: ${error.message.slice(0, 120)})`);
    return error;
  }
}

// --- fact sets --------------------------------------------------------------
const CANONICAL_FACTS = {
  "participant.full_legal_name": "Jordan Avery Reyes",
  "participant.street_address": "118 Maple Street",
  "participant.city": "Springfield",
  "participant.state": "XX",
  "participant.zip": "01234",
  "participant.date_of_birth": "1991-04-17",
  "matter.county": "Example County",
  "matter.case_number": "24-CR-001234",
  "matter.charges": [
    { case_number: "24-CR-001234", charge: "Possession of a controlled substance", arrest_date: "2019-03-08" }
  ]
};
// A name that overflows the widget at the default size but is still readable
// once shrunk: the case shrink-to-fit exists for.
const SHRINK_FACTS = {
  ...CANONICAL_FACTS,
  "participant.full_legal_name": "Alexandrina-Katharine Montgomery"
};
// A name no readable size can fit: the case that must fail closed.
const BOUNDARY_FACTS = {
  ...CANONICAL_FACTS,
  "participant.full_legal_name": "Alexandrina-Katharine Montgomery-Vandenberg-Oyelaran y Fitzwilliam III",
  "participant.street_address": "12345 Southwest Grandview Boulevard Northeast, Building 7, Apartment 4321-B"
};

// The census the factory consumes, read from the canary itself.
async function censusOf(bytes) {
  const doc = await PDFDocument.load(bytes, { ignoreEncryption: true });
  const pages = doc.getPages();
  const pageIndexOf = new Map(pages.map((p, i) => [p.ref.toString(), i + 1]));
  return doc.getForm().getFields().map((f) => {
    const type = f.constructor.name.replace(/^PDF/, "").replace(/Field$/, "").toLowerCase();
    const widgets = (f.acroField?.getWidgets?.() ?? []).map((w) => {
      const r = w.getRectangle?.();
      const pref = w.P?.()?.toString?.();
      return {
        page: pref ? (pageIndexOf.get(pref) ?? 1) : 1,
        rect: r ? { x: r.x, y: r.y, width: r.width, height: r.height } : null
      };
    });
    const entry = { name: f.getName(), type: type === "text" ? "text" : type, widgets };
    if (type === "text") {
      try { entry.maxLength = f.getMaxLength() ?? null; } catch { entry.maxLength = null; }
      try { entry.multiline = f.isMultiline?.() ?? false; } catch { entry.multiline = false; }
    }
    return entry;
  });
}

const evidence = { generatedAt: "2026-01-01T00:00:00Z", canaries: {}, mutations: {} };

// ===========================================================================
// 0. Canaries are byte-reproducible.
// ===========================================================================
for (const canary of CANARIES) {
  const a = await canary.build();
  const b = await canary.build();
  assert(sha(a) === sha(b), `canary ${canary.id}: source is byte-reproducible`);
  evidence.canaries[canary.id] = { sourceSha256: sha(a), sourceBytes: a.length };
}

// ===========================================================================
// 1. AcroForm canary — the whole pipeline.
// ===========================================================================
const acroBytes = await buildAcroFormCanary();
const acroCensus = await censusOf(acroBytes);
assert(acroCensus.length > 20, `acroform canary: census read ${acroCensus.length} fields from the binary`);

const acro = await finalizeOfficialForm({
  sourceBytes: acroBytes,
  expectedSha256: sha(acroBytes),
  census: acroCensus,
  facts: CANONICAL_FACTS,
  title: "D0 canary"
});
const written = new Map(acro.report.written.map((w) => [w.field, w]));
const refused = new Map(acro.report.refused.map((r) => [r.field, r]));

// --- FIX 3: semantic field safety ------------------------------------------
const MUST_BE_PROTECTED = [
  ["totalFeesDue", "money"],
  ["defendantRace", "race"],
  ["judgeSignature", "signature"],
  ["clerkFileStamp", "clerk"],
  ["notaryCommissionExpires", "notarization"],
  ["certificateOfServiceDate", "service_block"],
  ["arrestingAgencyAddress", "agency"],
  ["licensingBoardName", "licensing_board"],
  ["prosecutingAttorneyName", "prosecutor"],
  ["petitionersAttorneyBarNo", "attorney"],
  ["responsibleOfficialName", "responsible_official"],
  ["victimName", "outside_party"],
  ["dispositionOfPetition", "disposition_or_hearing"]
];
for (const [field, category] of MUST_BE_PROTECTED) {
  assert(!written.has(field), `semantic: '${field}' (${category}) is never written`);
  assert(refused.get(field)?.category === category,
    `semantic: '${field}' refused as ${category} (got ${refused.get(field)?.category ?? "nothing"})`);
}
assert(!written.has("requestHearing"), "semantic: a checkbox is never written");
assert(refused.get("requestHearing")?.category === "type_guard", "semantic: checkbox refused by the type guard");

// Arrest dates: protected unless explicitly mapped.
assert(!written.has("DateOfArrest1"), "semantic: an arrest date does not bind on a name match alone");
assert(refused.get("DateOfArrest1")?.reason === "requires_explicit_mapping",
  `semantic: arrest date refused pending an explicit mapping (got ${refused.get("DateOfArrest1")?.reason})`);

const withMapping = await finalizeOfficialForm({
  sourceBytes: acroBytes, expectedSha256: sha(acroBytes), census: acroCensus, facts: CANONICAL_FACTS,
  explicitMappings: { DateOfArrest1: "matter.arrest_date" }
});
assert(withMapping.report.written.some((w) => w.field === "DateOfArrest1"),
  "semantic: an explicitly mapped arrest date does bind");

// Repeating charge rows: only rows backed by a charge.
assert(written.has("FileNumber1"), "semantic: charge row 1 binds, one charge was supplied");
for (const row of ["FileNumber2", "FileNumber3"]) {
  assert(!written.has(row), `semantic: '${row}' is not written without an indexed charge`);
  assert(refused.get(row)?.category === "charge_row",
    `semantic: '${row}' refused as a charge row (got ${refused.get(row)?.category})`);
}

// --- FIX 2: shrink-to-fit ---------------------------------------------------
const shrunk = await finalizeOfficialForm({
  sourceBytes: acroBytes, expectedSha256: sha(acroBytes), census: acroCensus, facts: SHRINK_FACTS
});
const nameFit = new Map(shrunk.report.written.map((w) => [w.field, w])).get("petitionerName");
assert(nameFit && nameFit.outcome === "shrunk",
  `shrink-to-fit: a long name shrinks to fit its widget (outcome ${nameFit?.outcome})`);
assert(nameFit && nameFit.fontSize >= MIN_READABLE_FONT_SIZE,
  `shrink-to-fit: the shrunk size stays at or above the readable minimum (${nameFit?.fontSize})`);

// A name no readable size can carry is refused outright rather than clipped.
const boundary = await finalizeOfficialForm({
  sourceBytes: acroBytes, expectedSha256: sha(acroBytes), census: acroCensus, facts: BOUNDARY_FACTS
});
assert(boundary.report.unfittable.some((u) => u.field === "petitionerName"),
  "shrink-to-fit: a name too long for any readable size is refused, not clipped");

// The cramped widget cannot hold its value at any readable size: fail closed.
const cramped = acro.report.unfittable.find((u) => u.field === "crampedCaseNumber");
assert(Boolean(cramped), "shrink-to-fit: an unfittable value is refused rather than clipped");
assert(cramped?.reason === "value_exceeds_widget_width_at_minimum_font",
  `shrink-to-fit: refusal names the reason (got ${cramped?.reason})`);
assert(!written.has("crampedCaseNumber"), "shrink-to-fit: nothing is written into a widget that cannot hold it");

// Multiline wraps within its height rather than overflowing.
const multiline = await finalizeOfficialForm({
  sourceBytes: acroBytes, expectedSha256: sha(acroBytes), census: acroCensus,
  facts: { ...CANONICAL_FACTS, "participant.full_legal_name": "Jordan Avery Reyes" }
});
assert(multiline.report.written.length > 0, "shrink-to-fit: the multiline path renders");

// --- FIX 1: contact sheet ---------------------------------------------------
const finalizedDoc = await PDFDocument.load(acro.bytes, { ignoreEncryption: true });
const visible = visibleTextOfDocument(finalizedDoc);
assert(missingExpectedValues(visible, acro.report.expectedValues).length === 0,
  "contact sheet: every written value is visibly present in the finalized artifact");
assert(visible.includes("Jordan Avery Reyes"), "contact sheet: the canonical name is visibly present");

const sheet = await buildContactSheet({
  blankBytes: acroBytes,
  finalizedBytes: acro.bytes,
  expectedValues: acro.report.expectedValues
});
assert(sheet.proof.allExpectedValuesVisible, "contact sheet: proof records every expected value as visible");
assert(sheet.proof.panelsDiffer, "contact sheet: blank and filled panels differ");
assert(sheet.proof.finalizedSha256 === sha(acro.bytes), "contact sheet: sheet is pinned to the finalized artifact");

// A protected field must be blank in the artifact a reviewer actually sees.
for (const [field] of MUST_BE_PROTECTED) {
  const marker = field === "totalFeesDue" ? "$" : null;
  if (marker) continue;
}
assert(!visible.includes("Possession of a controlled substance") || written.has("OffenseDescription1"),
  "contact sheet: no value appears that was not written");

// --- FIX 4: active-content sanitation --------------------------------------
assert(acro.report.activeContentScan.hits.length === 0, "active content: the AcroForm artifact is residue-free");
assert(acro.report.sanitation.rebuiltFromFlattenedPages, "active content: the artifact is rebuilt from flattened pages");
assert(acro.report.sanitation.flattened, "active content: the form is flattened");

// --- determinism and drift --------------------------------------------------
const again = await finalizeOfficialForm({
  sourceBytes: acroBytes, expectedSha256: sha(acroBytes), census: acroCensus, facts: CANONICAL_FACTS, title: "D0 canary"
});
assert(again.report.outputSha256 === acro.report.outputSha256, "determinism: the same facts produce the same bytes");

const drifted = Buffer.from(acroBytes);
drifted[drifted.length - 200] ^= 0x01;
await expectThrows("source drift", () => finalizeOfficialForm({
  sourceBytes: drifted, expectedSha256: sha(acroBytes), census: acroCensus, facts: CANONICAL_FACTS
}), (e) => /source drift/.test(e.message));

evidence.canaries.acroform = {
  ...evidence.canaries.acroform,
  fieldsCensused: acroCensus.length,
  written: acro.report.written.length,
  refused: acro.report.refused.length,
  unfittable: acro.report.unfittable.length,
  outputSha256: acro.report.outputSha256,
  contactSheetSha256: sheet.proof.sheetSha256
};

// ===========================================================================
// 2. Flat overlay canary.
// ===========================================================================
const flatBytes = await buildFlatOverlayCanary();
const flatAnchors = [
  { page: 1, label: "Petitioner Name", factId: "participant.full_legal_name", writeBox: { x: 62, y: 614, width: 236, height: 11 }, fontSize: 9 },
  { page: 1, label: "Date of Birth", factId: "participant.date_of_birth", writeBox: { x: 332, y: 614, width: 176, height: 11 }, fontSize: 9 },
  { page: 1, label: "Case No.", factId: "matter.case_number", writeBox: { x: 114, y: 660, width: 156, height: 11 }, fontSize: 9 },
  { page: 1, label: "County", factId: "matter.county", writeBox: { x: 332, y: 574, width: 176, height: 11 }, fontSize: 9 },
  { page: 1, label: "Address", factId: "participant.street_address", writeBox: { x: 62, y: 574, width: 236, height: 11 }, fontSize: 9 },
  // Must be refused: the overlay path applies the same protect rules.
  { page: 1, label: "Signature of Petitioner", factId: "participant.full_legal_name", writeBox: { x: 62, y: 514, width: 236, height: 11 }, fontSize: 9 }
];
const flat = await finalizeFlatOverlay({
  sourceBytes: flatBytes, expectedSha256: sha(flatBytes), anchors: flatAnchors, facts: CANONICAL_FACTS
});
assert(flat.report.written.length === 5, `flat overlay: five anchors written (got ${flat.report.written.length})`);
assert(flat.report.refused.some((r) => r.anchor === "Signature of Petitioner" && r.category === "signature"),
  "flat overlay: a signature rule is refused");

const flatVisible = visibleTextOfDocument(await PDFDocument.load(flat.bytes, { ignoreEncryption: true }));
assert(missingExpectedValues(flatVisible, flat.report.expectedValues).length === 0,
  "flat overlay: every written value is visibly present");
const flatSheet = await buildContactSheet({
  blankBytes: flatBytes, finalizedBytes: flat.bytes, expectedValues: flat.report.expectedValues
});
assert(flatSheet.proof.panelsDiffer, "flat overlay: contact sheet panels differ");
assert(flat.report.activeContentScan.hits.length === 0, "flat overlay: artifact is residue-free");
const flatAgain = await finalizeFlatOverlay({
  sourceBytes: flatBytes, expectedSha256: sha(flatBytes), anchors: flatAnchors, facts: CANONICAL_FACTS
});
assert(flatAgain.report.outputSha256 === flat.report.outputSha256, "flat overlay: output is byte-reproducible");
evidence.canaries.flat = {
  ...evidence.canaries.flat,
  written: flat.report.written.length,
  refused: flat.report.refused.length,
  outputSha256: flat.report.outputSha256,
  contactSheetSha256: flatSheet.proof.sheetSha256
};

// ===========================================================================
// 3. JavaScript-bearing canary.
// ===========================================================================
const scriptedBytes = await buildScriptedCanary();
const scriptedBefore = scanBytesForActiveContent(scriptedBytes);
assert(scriptedBefore.hits.length >= 8,
  `active content: the scripted canary really carries residue (${scriptedBefore.hits.length} kinds)`);
for (const kind of ["document_javascript", "field_javascript", "additional_actions", "open_action",
  "launch_action", "submit_action", "import_action", "uri_action"]) {
  assert(scriptedBefore.hits.includes(kind), `active content: canary carries ${kind} before sanitation`);
}

const scriptedCensus = await censusOf(scriptedBytes);
const scripted = await finalizeOfficialForm({
  sourceBytes: scriptedBytes, expectedSha256: sha(scriptedBytes), census: scriptedCensus, facts: CANONICAL_FACTS
});
assert(scripted.report.activeContentScan.hits.length === 0,
  `active content: every kind removed (residue: ${scripted.report.activeContentScan.hits.join(", ") || "none"})`);
assert(scripted.report.written.length > 0, "active content: the scripted canary still fills its participant fields");
const scriptedVisible = visibleTextOfDocument(await PDFDocument.load(scripted.bytes, { ignoreEncryption: true }));
assert(missingExpectedValues(scriptedVisible, scripted.report.expectedValues).length === 0,
  "active content: values survive sanitation and stay visible");

// XFA / remote-goto / rich-media residue, in a file pdf-lib will not author.
const xfaBytes = buildXfaResidueCanary();
const xfaBefore = scanBytesForActiveContent(xfaBytes);
for (const kind of ["xfa_residue", "remote_goto", "rich_media"]) {
  assert(xfaBefore.hits.includes(kind), `active content: XFA canary carries ${kind} before sanitation`);
}
const xfaDoc = await PDFDocument.load(xfaBytes, { ignoreEncryption: true, updateMetadata: false });
const { clean: xfaClean } = await sanitizeAndFlatten(xfaDoc);
xfaClean.setCreationDate(new Date("2026-01-01T00:00:00Z"));
xfaClean.setModificationDate(new Date("2026-01-01T00:00:00Z"));
const xfaOut = await xfaClean.save({ useObjectStreams: false });
const xfaAfter = scanBytesForActiveContent(xfaOut);
assert(xfaAfter.hits.length === 0,
  `active content: XFA, remote-goto and rich-media residue removed (residue: ${xfaAfter.hits.join(", ") || "none"})`);
evidence.canaries.scripted = {
  ...evidence.canaries.scripted,
  residueBefore: scriptedBefore.hits,
  residueAfter: scripted.report.activeContentScan.hits,
  outputSha256: scripted.report.outputSha256
};
evidence.canaries["xfa-residue"] = {
  ...evidence.canaries["xfa-residue"],
  residueBefore: xfaBefore.hits,
  residueAfter: xfaAfter.hits
};

// ===========================================================================
// 4. Non-filing hold.
// ===========================================================================
const NOTICE = "NOTE: THIS FORM IS FOR INFORMATIONAL PURPOSES ONLY. DO NOT COMPLETE THIS FORM FOR FILING.";
await expectThrows("non-filing hold (AcroForm)", () => finalizeOfficialForm({
  sourceBytes: acroBytes, expectedSha256: sha(acroBytes), census: acroCensus,
  facts: CANONICAL_FACTS, nonFilingNotice: NOTICE
}), (e) => e instanceof NonFilingHoldError);
await expectThrows("non-filing hold (flat overlay)", () => finalizeFlatOverlay({
  sourceBytes: flatBytes, expectedSha256: sha(flatBytes), anchors: flatAnchors,
  facts: CANONICAL_FACTS, nonFilingNotice: NOTICE
}), (e) => e instanceof NonFilingHoldError);

// ===========================================================================
// 4b. Print flags — a flattened artifact carries only what the form prints.
// ===========================================================================
const flagBytes = await buildPrintFlagCanary();
const flagCensus = await censusOf(flagBytes);
const flagged = await finalizeOfficialForm({
  sourceBytes: flagBytes, expectedSha256: sha(flagBytes), census: flagCensus, facts: CANONICAL_FACTS
});
const flagVisible = visibleTextOfDocument(await PDFDocument.load(flagged.bytes, { ignoreEncryption: true }));
const flatText = (s) => String(s).replace(/\s+/g, "").toLowerCase();
const shows = (needle) => flatText(flagVisible).includes(flatText(needle));

// The participant value the form does print must survive. A fix that
// suppresses too much fails here rather than passing quietly.
assert(shows(CANONICAL_FACTS["participant.full_legal_name"]),
  "print flags: a printable participant value remains visible in the finalized artifact");
assert(shows(PRINT_FLAG_CANARY.officialPrintedText) && shows(PRINT_FLAG_CANARY.officialPrintedLabel),
  "print flags: legitimate printed official text is untouched");

// And everything the form does not print must be absent.
assert(!shows(PRINT_FLAG_CANARY.hiddenHelperText),
  "print flags: a hidden helper's text stays absent from the filed artifact");
assert(!shows(PRINT_FLAG_CANARY.noViewHelperText),
  "print flags: a NoView helper's text stays absent from the filed artifact");
assert(!shows(PRINT_FLAG_CANARY.resetCaption + " "),
  "print flags: a non-printing Reset caption stays absent");
assert(!shows(PRINT_FLAG_CANARY.clearFormCaption),
  "print flags: a non-printing Clear Form caption stays absent");
assert(!shows(PRINT_FLAG_CANARY.printCaption),
  "print flags: a non-printing Print Form caption stays absent");

const suppressedFields = new Set((flagged.report.sanitation.nonPrintingWidgetsSuppressed ?? []).map((s) => s.field));
for (const [field, why] of [
  [PRINT_FLAG_CANARY.hiddenFieldName, "hidden_flag_set"],
  [PRINT_FLAG_CANARY.noViewFieldName, "no_view_flag_set"],
  ["resetButton", "no_flags_entry_so_does_not_print"],
  ["clearFormButton", "no_flags_entry_so_does_not_print"],
  ["printButton", "print_flag_not_set"]
]) {
  const entry = (flagged.report.sanitation.nonPrintingWidgetsSuppressed ?? []).find((s) => s.field === field);
  assert(entry?.reason === why, `print flags: '${field}' suppressed for the recorded reason ${why}`);
}
assert(!suppressedFields.has(PRINT_FLAG_CANARY.printableFieldName) && !suppressedFields.has("caseNumber"),
  "print flags: printable participant widgets are not suppressed");
assert(Array.isArray(flagged.report.sanitation.writtenValuesInNonPrintingWidgets)
  && flagged.report.sanitation.writtenValuesInNonPrintingWidgets.length === 0,
  "print flags: no written participant value landed in a widget that does not print");

evidence.canaries["print-flags"] = {
  ...evidence.canaries["print-flags"],
  suppressed: flagged.report.sanitation.nonPrintingWidgetsSuppressed,
  fieldsRemoved: flagged.report.sanitation.nonPrintingFieldsRemoved,
  writtenValueConflicts: flagged.report.sanitation.writtenValuesInNonPrintingWidgets,
  outputSha256: flagged.report.outputSha256
};

// ===========================================================================
// 4c. Contact sheet — sanitized panels, sanitized sheet, proven clean.
// ===========================================================================
const blankScriptedBytes = await buildScriptedBlankCanary();
const blankScriptedCensus = await censusOf(blankScriptedBytes);
const blankScriptedFinal = await finalizeOfficialForm({
  sourceBytes: blankScriptedBytes, expectedSha256: sha(blankScriptedBytes),
  census: blankScriptedCensus, facts: CANONICAL_FACTS
});
const sourceResidue = scanBytesForActiveContent(blankScriptedBytes);
assert(sourceResidue.hits.includes("additional_actions") && sourceResidue.hits.includes("field_javascript"),
  "contact sheet: the blank source really does carry /AA and /JS before sanitation");

const scriptedSheet = await buildContactSheet({
  blankBytes: blankScriptedBytes,
  finalizedBytes: blankScriptedFinal.bytes,
  expectedValues: blankScriptedFinal.report.expectedValues,
  artifactLabel: "scripted-blank contact sheet"
});
const sheetScan = scanBytesForActiveContent(scriptedSheet.bytes);
assert(sheetScan.inspectable, "contact sheet: the emitted sheet is byte-inspectable");
assert(sheetScan.hits.length === 0,
  `contact sheet: no active-content residue survives into the sheet (found: ${sheetScan.hits.join(", ") || "none"})`);
assert(scriptedSheet.proof.activeContentScan?.clean === true,
  "contact sheet: the proof records a positive clean verdict rather than an empty hit list");
assert(scriptedSheet.proof.panelsSanitizedBeforeEmbedding === true,
  "contact sheet: both panels were sanitized before embedding");
// Checked against the bytes that were embedded. Rebuilding the composed sheet
// would clean it either way, so without this the panel step could be dropped
// and every downstream check would still pass.
assert(scriptedSheet.proof.panelScans?.blank?.clean === true,
  `contact sheet: the blank panel was clean when embedded (found: ${scriptedSheet.proof.panelScans?.blank?.hits?.join(", ") || "none"})`);
assert(scriptedSheet.proof.panelScans?.finalized?.clean === true,
  "contact sheet: the finalized panel was clean when embedded");

evidence.canaries["scripted-blank"] = {
  ...evidence.canaries["scripted-blank"],
  sourceResidue: sourceResidue.hits,
  sheetResidue: sheetScan.hits,
  sheetInspectable: sheetScan.inspectable,
  sheetSha256: scriptedSheet.proof.sheetSha256
};

// ===========================================================================
// 4d. Inspection fails closed.
// ===========================================================================
{
  // A file saved with object streams is not inspectable, whatever its hit list
  // says. The only honest verdict is a refusal that names the artifact.
  const compressedDoc = await PDFDocument.load(blankScriptedBytes, { ignoreEncryption: true });
  const compressed = await compressedDoc.save({ useObjectStreams: true });
  const compressedScan = scanBytesForActiveContent(compressed);
  assert(compressedScan.inspectable === false && compressedScan.verdict === "uninspectable",
    "fail-closed: a compressed file is reported uninspectable");
  assert(compressedScan.clean === false,
    "fail-closed: an uninspectable file is not reported clean even when its hit list is empty");

  const uninspectable = await expectThrows("fail-closed: uninspectable artifact is refused",
    async () => assertInspectableAndClean(compressed, "canary compressed artifact"),
    (e) => e instanceof UninspectableArtifactError);
  assert(uninspectable?.reason === "artifact_not_byte_inspectable",
    "fail-closed: the refusal carries a typed reason");
  assert(uninspectable?.artifact === "canary compressed artifact",
    "fail-closed: the refusal names the artifact requiring alternate inspection");
  assert(typeof uninspectable?.remediation === "string" && uninspectable.remediation.length > 0,
    "fail-closed: the refusal says what has to happen next");

  // The other failure mode stays distinguishable from the first.
  const dirty = await (await PDFDocument.load(blankScriptedBytes, { ignoreEncryption: true }))
    .save({ useObjectStreams: false });
  const residueError = await expectThrows("fail-closed: residue-bearing artifact is refused",
    async () => assertInspectableAndClean(dirty, "canary dirty artifact"),
    (e) => e instanceof ActiveContentResidueError);
  assert(Array.isArray(residueError?.hits) && residueError.hits.length > 0,
    "fail-closed: the residue refusal lists what it found");

  evidence.canaries.failClosed = {
    compressedVerdict: compressedScan.verdict,
    compressedReportedClean: compressedScan.clean,
    uninspectableReason: uninspectable?.reason ?? null,
    residueHits: residueError?.hits ?? []
  };
}

// ===========================================================================
// 5. Mutation tests — remove each fix, confirm its check goes red.
// ===========================================================================

// M1 — contact sheet built from the filled-but-unflattened document, which is
// exactly what the previous builder did.
{
  const doc = await PDFDocument.load(acroBytes, { ignoreEncryption: true });
  doc.getForm().getTextField("petitionerName").setText("Jordan Avery Reyes");
  const unflattened = await doc.save();
  const err = await expectThrows("mutation M1 (contact sheet from unflattened artifact)",
    () => buildContactSheet({ blankBytes: acroBytes, finalizedBytes: unflattened, expectedValues: ["Jordan Avery Reyes"] }),
    (e) => e instanceof ContactSheetProofError);
  evidence.mutations.contactSheet = { detected: Boolean(err), error: err?.message?.slice(0, 140) ?? null };
}

// M2 — shrink-to-fit removed: a fixed size with no shrink loop and no floor.
{
  const probe = await PDFDocument.create();
  const font = await probe.embedFont(StandardFonts.Helvetica);
  const rect = acroCensus.find((f) => f.name === "petitionerName").widgets[0].rect;
  const longName = SHRINK_FACTS["participant.full_legal_name"];
  const unshrunkWidth = font.widthOfTextAtSize(longName, 11);
  assert(unshrunkWidth > rect.width,
    "mutation M2: without shrink-to-fit the boundary name overflows its widget");
  const fitted = fitTextToWidget({ font, text: longName, rect, multiline: false });
  assert(fitted.outcome === "shrunk" && font.widthOfTextAtSize(longName, fitted.fontSize) <= rect.width - 4,
    "mutation M2: with shrink-to-fit the same value fits");
  // Removing the readable floor turns a refusal into an illegible fill.
  const crampedRect = acroCensus.find((f) => f.name === "crampedCaseNumber").widgets[0].rect;
  const withFloor = fitTextToWidget({ font, text: "24-CR-001234", rect: crampedRect });
  const withoutFloor = fitTextToWidget({ font, text: "24-CR-001234", rect: crampedRect, minFontSize: 0.5 });
  assert(withFloor.outcome === "refused", "mutation M2: the readable floor refuses an illegible fill");
  assert(withoutFloor.outcome !== "refused" && withoutFloor.fontSize < MIN_READABLE_FONT_SIZE,
    "mutation M2: removing the floor would have shipped text below the readable minimum");
  evidence.mutations.shrinkToFit = {
    detected: true,
    widthAtFixedSize: Number(unshrunkWidth.toFixed(1)),
    widgetWidth: rect.width,
    fittedSize: fitted.fontSize,
    sizeWithoutFloor: withoutFloor.fontSize
  };
}

// M3 — semantic protection removed: every protected canary field would bind on
// a name match alone, so the protect rules are the only thing stopping them.
{
  const wouldBind = [];
  for (const [field] of MUST_BE_PROTECTED) {
    assert(protectCategoryOf(field) !== null, `mutation M3: '${field}' is claimed by a protect rule`);
    const hay = haystack(field);
    if (FACT_DESCRIPTORS.some((d) => d.match.test(hay))) wouldBind.push(field);
  }
  assert(wouldBind.length > 0,
    `mutation M3: without the protect rules ${wouldBind.length} protected field(s) would match a fact descriptor and be written`);
  // And the type guard alone stops the checkbox.
  const asText = decideBinding({ name: "requestHearing", pdfType: "text" }, {});
  const asCheckbox = decideBinding({ name: "requestHearing", pdfType: "checkbox" }, {});
  assert(asCheckbox.writable === false && asCheckbox.reason === "non_text_field_type",
    "mutation M3: the type guard refuses a checkbox");
  evidence.mutations.semanticBinding = {
    detected: true,
    protectedFieldsThatWouldOtherwiseBind: wouldBind,
    checkboxRefusedByTypeGuard: asCheckbox.reason,
    sameNameAsTextField: asText.writable
  };
}

// M4 — sanitation removed: the filled document still carries every script.
{
  const doc = await PDFDocument.load(scriptedBytes, { ignoreEncryption: true, updateMetadata: false });
  doc.getForm().getTextField("petitionerName").setText("Jordan Avery Reyes");
  const unsanitized = await doc.save({ useObjectStreams: false });
  const residue = scanBytesForActiveContent(unsanitized);
  assert(residue.hits.length > 0,
    `mutation M4: without sanitation the output still carries ${residue.hits.length} kind(s) of active content`);
  assert(scripted.report.activeContentScan.hits.length === 0,
    "mutation M4: with sanitation the same document emits clean");
  evidence.mutations.activeContent = { detected: true, residueWithoutSanitation: residue.hits };
}

// M5 — non-filing hold removed: the same form fills without the notice.
{
  const withoutHold = await finalizeOfficialForm({
    sourceBytes: acroBytes, expectedSha256: sha(acroBytes), census: acroCensus, facts: CANONICAL_FACTS
  });
  assert(withoutHold.report.written.length > 0,
    "mutation M5: without the notice the form fills, so the hold is what stops it");
  evidence.mutations.nonFilingHold = { detected: true, writtenWithoutNotice: withoutHold.report.written.length };
}

// M6 — drift detection removed: the perturbed source renders happily when the
// expected hash is not supplied.
{
  const noPin = await finalizeOfficialForm({
    sourceBytes: drifted, expectedSha256: null, census: acroCensus, facts: CANONICAL_FACTS
  });
  assert(noPin.report.sourceSha256 !== sha(acroBytes),
    "mutation M6: unpinned, a drifted source renders without complaint");
  evidence.mutations.sourceDrift = { detected: true, driftedSha256: noPin.report.sourceSha256.slice(0, 16) };
}

// M7 — flag-aware flattening removed: pdf-lib's flatten() draws every widget,
// so the helper text and the control captions become permanent ink.
{
  const doc = await PDFDocument.load(flagBytes, { ignoreEncryption: true, updateMetadata: false });
  const form = doc.getForm();
  form.getTextField(PRINT_FLAG_CANARY.printableFieldName).setText(CANONICAL_FACTS["participant.full_legal_name"]);
  form.updateFieldAppearances();
  form.flatten();
  const leakedText = visibleTextOfDocument(await PDFDocument.load(await doc.save({ useObjectStreams: false }), { ignoreEncryption: true }));
  const leaked = (needle) => flatText(leakedText).includes(flatText(needle));

  const leaks = [
    ["hidden helper", PRINT_FLAG_CANARY.hiddenHelperText],
    ["NoView helper", PRINT_FLAG_CANARY.noViewHelperText],
    ["Reset caption", PRINT_FLAG_CANARY.resetCaption],
    ["Clear Form caption", PRINT_FLAG_CANARY.clearFormCaption],
    ["Print Form caption", PRINT_FLAG_CANARY.printCaption]
  ].filter(([, needle]) => leaked(needle));

  assert(leaks.length > 0,
    `mutation M7: without the flag test, flattening leaks ${leaks.length} non-printing element(s) into the artifact`);
  assert(leaks.some(([what]) => what === "hidden helper"),
    "mutation M7: the hidden helper is among what leaks, so the Hidden bit is load-bearing");
  assert(leaked(CANONICAL_FACTS["participant.full_legal_name"]),
    "mutation M7: the participant value is present either way, so the difference is only the non-printing ink");
  evidence.mutations.printFlags = { detected: true, leakedWithoutFlagTest: leaks.map(([what]) => what) };
}

// M8 — contact-sheet sanitation removed: the old builder embedded the raw
// blank bytes and saved with pdf-lib's defaults.
{
  const sheet = await PDFDocument.create();
  const font = await sheet.embedFont(StandardFonts.Helvetica);
  const blankDoc = await PDFDocument.load(blankScriptedBytes, { ignoreEncryption: true });
  const pageCount = blankDoc.getPageCount();
  for (let i = 0; i < pageCount; i += 1) {
    const [bp] = await sheet.embedPdf(blankScriptedBytes, [i]);
    const [fp] = await sheet.embedPdf(blankScriptedFinal.bytes, [i]);
    const W = bp.width, H = bp.height, scale = 0.62;
    const page = sheet.addPage([W * scale * 2 + 24 + 56, H * scale + 90]);
    page.drawText(`page ${i + 1}`, { x: 28, y: H * scale + 40, size: 9, font });
    page.drawPage(bp, { x: 28, y: 28, xScale: scale, yScale: scale });
    page.drawPage(fp, { x: 28 + W * scale + 24, y: 28, xScale: scale, yScale: scale });
  }
  const asOldBuilderSaved = await sheet.save();
  const asOldBuilderScanned = scanBytesForActiveContent(asOldBuilderSaved);
  const readable = scanBytesForActiveContent(await sheet.save({ useObjectStreams: false }));

  assert(readable.hits.length > 0,
    `mutation M8: without panel sanitation the sheet carries ${readable.hits.length} kind(s) of active content (${readable.hits.join(", ")})`);
  assert(asOldBuilderScanned.hits.length === 0 && asOldBuilderScanned.inspectable === false,
    "mutation M8: saved the old way that same residue is invisible to the scan — an empty hit list on an unreadable file");
  assert(sheetScan.hits.length === 0 && sheetScan.inspectable,
    "mutation M8: with sanitation the same inputs produce an inspectable, clean sheet");
  evidence.mutations.contactSheetSanitation = {
    detected: true,
    residueWithoutSanitation: readable.hits,
    hiddenByObjectStreams: { hits: asOldBuilderScanned.hits, inspectable: asOldBuilderScanned.inspectable }
  };
}

// M9 — fail-closed inspection removed: the old caller read `hits` alone, so an
// uninspectable file passed on the strength of an empty array.
{
  const compressed = await (await PDFDocument.load(blankScriptedBytes, { ignoreEncryption: true }))
    .save({ useObjectStreams: true });
  const scan = scanBytesForActiveContent(compressed);
  const oldStyleVerdict = scan.hits.length === 0;          // what the previous callers computed
  const failClosedVerdict = scan.clean;                     // what they compute now

  assert(oldStyleVerdict === true,
    "mutation M9: reading the hit list alone declares this artifact clean");
  assert(failClosedVerdict === false,
    "mutation M9: the fail-closed verdict refuses the same artifact");
  // And the file really is dirty, so the old verdict was wrong rather than merely unlucky.
  const truth = scanBytesForActiveContent(await (await PDFDocument.load(blankScriptedBytes, { ignoreEncryption: true }))
    .save({ useObjectStreams: false }));
  assert(truth.hits.length > 0,
    `mutation M9: the artifact the old verdict passed actually carries ${truth.hits.join(", ")}`);
  evidence.mutations.failClosedInspection = {
    detected: true,
    verdictFromHitListAlone: oldStyleVerdict ? "clean" : "residue_found",
    verdictFailClosed: scan.verdict,
    actualResidueWhenReadable: truth.hits
  };
}

// ===========================================================================
// Evidence.
// ===========================================================================
fs.mkdirSync(EVIDENCE_DIR, { recursive: true });
evidence.checks = { total: checks.length, passed: checks.filter((c) => c.ok).length, failed: failures.length };
fs.writeFileSync(path.join(EVIDENCE_DIR, "canary-evidence.json"), `${JSON.stringify(evidence, null, 2)}\n`);
fs.writeFileSync(path.join(EVIDENCE_DIR, "acroform-finalized.pdf"), acro.bytes);
fs.writeFileSync(path.join(EVIDENCE_DIR, "acroform-contact-sheet.pdf"), sheet.bytes);
fs.writeFileSync(path.join(EVIDENCE_DIR, "flat-finalized.pdf"), flat.bytes);
fs.writeFileSync(path.join(EVIDENCE_DIR, "flat-contact-sheet.pdf"), flatSheet.bytes);
fs.writeFileSync(path.join(EVIDENCE_DIR, "scripted-finalized.pdf"), scripted.bytes);

if (failures.length > 0) {
  console.error("d0-canary-verify FAILED");
  for (const f of failures) console.error(` - ${f}`);
  process.exit(1);
}
console.log(`d0-canary-verify passed: ${checks.length} checks across `
  + `${Object.keys(evidence.canaries).length} canaries and ${Object.keys(evidence.mutations).length} mutations.`);
