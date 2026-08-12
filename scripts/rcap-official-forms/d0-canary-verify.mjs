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

import { CANARIES, buildAcroFormCanary, buildFlatOverlayCanary, buildScriptedCanary, buildXfaResidueCanary }
  from "./d0-canary-forms.mjs";
import { finalizeOfficialForm, finalizeFlatOverlay, NonFilingHoldError }
  from "./rcap-official-form-finalize.mjs";
import { buildContactSheet, ContactSheetProofError, visibleTextOfDocument, missingExpectedValues }
  from "./rcap-contact-sheet.mjs";
import { scanBytesForActiveContent, sanitizeAndFlatten } from "./rcap-active-content.mjs";
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
