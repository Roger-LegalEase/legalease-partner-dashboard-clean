#!/usr/bin/env node
/** Production builder for Alabama packet family al-pardon-set. */
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import { finalizeOfficialForm } from "./rcap-official-forms/rcap-official-form-finalize.mjs";
import { flattenedWidgets, drawnAt } from "./rcap-official-forms/pdf-flattened-widgets.mjs";

const thisFile = fileURLToPath(import.meta.url);
const ROOT = path.resolve(path.dirname(thisFile), "..");
process.chdir(ROOT);
const require = createRequire(import.meta.url);
const { PDFDocument, PDFTextField, PDFCheckBox, PDFSignature, PDFName, PDFArray, PDFRawStream } = require("pdf-lib");

const FAMILY_ID = "al-pardon-set";
const OUT_REL = "data/rcap-all50/overlays/census-v1/al/al-pardon-set--official-pdf-fill";
const OUT = path.join(ROOT, OUT_REL);
const ROUTE_KEY = "obligation:track-only:AL:al-pardon";
const ROUTE_SELECTION_ID = "al-pardon-primary-filing-1";
const SOURCE = Object.freeze({
  sourceId: "official-form:ABPP-3", officialFormId: "ABPP-3",
  title: "Application for Pardon (Alabama Board of Pardons and Paroles)",
  relativePath: "LegalEase Alabama/AL_ABPP-3_rev-2025-06-14.pdf",
  restoredPath: "private/source-imports/src05-worker-materialization-2026-09-02/LegalEase Alabama/AL_ABPP-3_rev-2025-06-14.pdf",
  recoveryRecord: "reference/source-recovery/2026-09-11-wave1/CODEX-CS1-SRC2__ABPP-3__874e738a83c3.pdf",
  sha256: "874e738a83c3577413a29a92eb0b999e8c9aab36ddf83589191e33d3c63ac327",
  byteLength: 160009, pageCount: 4, fieldCount: 30, widgetCount: 31,
  componentId: "al-pardon-primary-filing-1"
});
const sha256 = (bytes) => crypto.createHash("sha256").update(bytes).digest("hex");
const round = (n) => Number(n.toFixed(3));
const writeJson = (rel, value) => { const target = path.join(ROOT, rel); fs.mkdirSync(path.dirname(target), { recursive: true }); fs.writeFileSync(target, `${JSON.stringify(value, null, 2)}\n`); };
const readJson = (rel) => JSON.parse(fs.readFileSync(path.join(ROOT, rel), "utf8"));

function sourcePath() {
  const candidates = [
    process.env.MASTER_LIBRARY_SOURCE_DIR && path.join(process.env.MASTER_LIBRARY_SOURCE_DIR, SOURCE.relativePath),
    path.join(ROOT, SOURCE.restoredPath), path.join(ROOT, SOURCE.recoveryRecord)
  ].filter(Boolean);
  const absolute = candidates.find((p) => fs.existsSync(p));
  if (!absolute) throw new Error(`ABPP-3 source unavailable; tried: ${candidates.join(", ")}`);
  const bytes = fs.readFileSync(absolute);
  if (sha256(bytes) !== SOURCE.sha256 || bytes.length !== SOURCE.byteLength) throw new Error(`ABPP-3 source drift at ${absolute}`);
  return { absolute, bytes };
}

const LABELS = Object.freeze({
  "Application received on": "Board use only — application received on",
  "Tracking Number": "Board use only — tracking number",
  Signature: "Board use only — Board member signature",
  "Remission of Fines": "FOR: REMISSION OF FINES", Both: "FOR: BOTH",
  Name: "Name of applicant at time of conviction", AIS: "AIS number, if applicable",
  "Current Name": "Current name, if different",
  "Mailing Address": "Mailing address — street or P.O. Box, city, state, ZIP",
  Email: "Email", Phone: "Phone", "Mobile Phone": "Mobile phone", Race: "Race", Sex: "Sex",
  DOB: "Date of birth", SSN: "Social Security number", State: "Convictions — State",
  Federal: "Convictions — Federal",
  "Claim of Innocence": "Do you claim innocence of the crime for which you are seeking a pardon?",
  Pardon: "FOR: PARDON", Fines: "Previously applied for — Fines", Neither: "Previously applied for — Neither",
  Date: "Shared source field: date of last hearing; and applicant signature date",
  Text: "If previously pardoned: rights not restored and relief sought now",
  "Signature 1": "Signature of applicant", "Print Name": "Board use only — Board member print name",
  "Print Name 1": "Applicant print name", "Check Box25": "Previously applied for — Pardon",
  Yes: "Board use only — waiver received: Yes", No: "Board use only — waiver received: No"
});
function typeOf(field) { if (field instanceof PDFTextField) return "text"; if (field instanceof PDFCheckBox) return "checkbox"; if (field instanceof PDFSignature) return "signature"; return field.constructor.name; }

async function censusOf(bytes) {
  const doc = await PDFDocument.load(bytes, { ignoreEncryption: true, updateMetadata: false });
  const pages = doc.getPages();
  const fields = doc.getForm().getFields().map((field, fieldIndex) => {
    const name = field.getName(); let sourceValue = null;
    try { sourceValue = field instanceof PDFTextField ? field.getText() ?? "" : field instanceof PDFCheckBox ? field.isChecked() : null; } catch {}
    const widgets = field.acroField.getWidgets().map((widget, widgetIndex) => {
      const rect = widget.getRectangle(); const ref = widget.P(); const pageIndex = pages.findIndex((p) => ref && p.ref === ref);
      return { widgetIndex, page: pageIndex + 1, rect: { x: round(rect.x), y: round(rect.y), width: round(rect.width), height: round(rect.height) } };
    });
    return { fieldIndex, name, type: typeOf(field), effectiveLabel: LABELS[name] ?? name, sourceValue, widgets };
  });
  return { pageCount: doc.getPageCount(), fields, widgetCount: fields.reduce((n, f) => n + f.widgets.length, 0) };
}

const WRITES = Object.freeze({ Email: "participant.email", Phone: "participant.phone", DOB: "participant.date_of_birth", "Print Name 1": "participant.full_legal_name" });
const PROTECTED = new Set(["Application received on", "Tracking Number", "Signature", "Signature 1", "Print Name", "Yes", "No", "Date"]);
const REQUIRED = new Set(["Name", "Mailing Address", "Race", "Sex", "SSN", "Claim of Innocence"]);
const OPTIONAL = new Set(["AIS", "Current Name", "Mobile Phone", "Text"]);
const ELECTIONS = new Set(["State", "Federal", "Check Box25", "Fines", "Neither"]);
const OFF_ROUTE = new Set(["Remission of Fines", "Both"]);

function mapFor(census) {
  const writes = [], refusals = [];
  for (const field of census.fields) {
    const common = { sourceId: SOURCE.sourceId, formNumber: SOURCE.officialFormId, field: field.name, effectiveLabel: field.effectiveLabel, page: field.widgets[0]?.page ?? null, widgets: field.widgets };
    if (Object.hasOwn(WRITES, field.name)) writes.push({ ...common, factId: WRITES[field.name], kind: "participant_fact", sourceAppearanceWasBlank: field.sourceValue === "" });
    else if (field.name === "Pardon") writes.push({ ...common, factId: null, kind: "route_selection", isSelectionControl: true, basis: `The selected packet route is ${ROUTE_KEY}; this is the form's PARDON box.` });
    else if (PROTECTED.has(field.name)) {
      const sharedDate = field.name === "Date";
      refusals.push({ ...common, factId: null, refusalClass: field.name.startsWith("Signature") || sharedDate ? "signature_or_date_participant_completion" : "court_prosecutor_clerk_or_agency_owned",
        reason: sharedDate ? "The PDF reuses one field for two distinct printed blanks: date of last hearing and applicant signature date. Electronic fill would repeat one value into both; both widgets stay blank."
          : field.name === "Signature 1" ? "The participant signs this attestation after reviewing the completed packet." : "Reserved to the Alabama Board in the source's BOARD USE ONLY block." });
    } else if (REQUIRED.has(field.name)) refusals.push({ ...common, factId: null, completenessDisposition: "REQUIRED_BEFORE_FILING", requiredBeforeFiling: true, routeDetermined: false,
      reason: "The official application requests this participant fact, but this route does not hold it in a safely typed field." });
    else if (OPTIONAL.has(field.name)) refusals.push({ ...common, factId: null, refusalClass: "optional_participant_authored_content",
      reason: field.name === "Mobile Phone" ? "Optional participant-authored contact detail; the platform writes the separate Phone field when held." : "Optional participant-authored content, completed only when the condition printed on the form applies." });
    else if (ELECTIONS.has(field.name)) refusals.push({ ...common, factId: null, refusalClass: "participant_sworn_narrative_or_legal_election", isSelectionControl: true,
      reason: "The participant must answer this form question from their own record; the builder does not infer or select it." });
    else if (OFF_ROUTE.has(field.name)) refusals.push({ ...common, factId: null, completenessDisposition: "NOT_APPLICABLE_ON_THIS_ROUTE", routeConditionThatMakesItInapplicable: `This control belongs to the remission-of-fines branch of ABPP-3; ${ROUTE_KEY} selects the pardon branch alone.`, routeDetermined: false, reason: "The route is pardon-only, so this different top-line request box remains unmarked." });
    else throw new Error(`unclassified ABPP-3 field ${field.name}`);
  }
  return { writes, refusals };
}

function pageContentDigests(doc) {
  return doc.getPages().map((page, index) => {
    const node = page.node.get(PDFName.of("Contents")); const refs = node instanceof PDFArray ? node.asArray() : node ? [node] : [];
    const bytes = Buffer.concat(refs.map((ref) => { const obj = doc.context.lookup(ref); return obj instanceof PDFRawStream ? Buffer.from(obj.contents) : Buffer.from(String(obj)); }));
    return { page: index + 1, sha256: sha256(bytes), contentBytes: bytes.length, width: page.getWidth(), height: page.getHeight() };
  });
}
function pageStreamDigests(doc) {
  return doc.getPages().map((page, index) => {
    const node = page.node.get(PDFName.of("Contents")); const refs = node instanceof PDFArray ? node.asArray() : node ? [node] : [];
    return { page: index + 1, streams: refs.map((ref) => { const obj = doc.context.lookup(ref); return sha256(obj instanceof PDFRawStream ? Buffer.from(obj.contents) : Buffer.from(String(obj))); }) };
  });
}
const FIXTURES = Object.freeze({
  canonical: { "participant.full_legal_name": "Jordan Avery Reyes", "participant.date_of_birth": "1991-04-17", "participant.email": "jordan.reyes@example.org", "participant.phone": "(334) 555-0142" },
  boundary: { "participant.full_legal_name": "Alexandrina-Katharine Montgomery-Vandenberg III", "participant.date_of_birth": "1960-12-31", "participant.email": "alexandrina.montgomery-vandenberg@example.org", "participant.phone": "+1 (205) 555-0199 ext. 204" }
});

async function renderFixture(name, facts, sourceBytes, census, map) {
  const { bytes, report } = await finalizeOfficialForm({ sourceBytes, expectedSha256: SOURCE.sha256, census: census.fields, facts, explicitMappings: WRITES,
    unwritableFields: map.refusals.map((r) => r.field), selectionsFromHeldFacts: { Pardon: { checked: true, basis: `Selected route ${ROUTE_KEY} is a pardon application.` } },
    suppressSynthesizedAppearances: true, evaluateDeclaredMinimumSize: true, alignWidgetFontSizeToFit: true, fitTextPerWidget: true,
    printedDateOrderByField: { DOB: "month_day_year" }, maxFontSize: 10, title: SOURCE.title });
  if (report.written.length !== 5 || report.refused.some((r) => !map.refusals.some((m) => m.field === r.field))) throw new Error(`${name}: finalizer writes/refusals differ from map: ${JSON.stringify(report)}`);
  const rel = `${OUT_REL}/fixtures/${name}.pdf`; fs.mkdirSync(path.dirname(path.join(ROOT, rel)), { recursive: true }); fs.writeFileSync(path.join(ROOT, rel), bytes);
  const widgets = await flattenedWidgets(path.join(ROOT, rel)); const fieldByName = new Map(census.fields.map((f) => [f.name, f]));
  const writeReadbacks = report.written.filter((w) => w.kind !== "selection_settled_from_held_facts").map((w) => {
    const field = fieldByName.get(w.field); const at = field.widgets.flatMap((widget) => drawnAt(widgets, widget));
    return { field: w.field, factId: w.factId, widgets: field.widgets, appearances: at, visible: at.some((a) => String(a.text).trim().length > 0) };
  });
  const selectionField = fieldByName.get("Pardon"); const selectionAppearances = selectionField.widgets.flatMap((widget) => drawnAt(widgets, widget));
  const permittedInkWidgets = [...Object.keys(WRITES), "Pardon"].flatMap((fieldName) => fieldByName.get(fieldName).widgets);
  const nonWhitespaceGlyphsOutsideMeasuredWriteBoxes = widgets
    .filter((appearance) => String(appearance.text).trim())
    .filter((appearance) => !permittedInkWidgets.some((widget) => drawnAt([appearance], widget).length > 0))
    .reduce((count, appearance) => count + String(appearance.text).replace(/\s/g, "").length, 0);
  const refusedFieldsWithInk = map.refusals.filter((r) => r.field !== "Date").filter((r) => fieldByName.get(r.field).widgets.flatMap((w) => drawnAt(widgets, w)).some((a) => String(a.text).trim())).map((r) => r.field);
  const outDoc = await PDFDocument.load(bytes, { ignoreEncryption: true, updateMetadata: false });
  if (outDoc.getPageCount() !== 4 || outDoc.getForm().getFields().length !== 0) throw new Error(`${name}: output is not a flattened four-page form`);
  if (writeReadbacks.some((r) => !r.visible) || selectionAppearances.length === 0 || refusedFieldsWithInk.length || nonWhitespaceGlyphsOutsideMeasuredWriteBoxes !== 0) throw new Error(`${name}: byte readback failed: ${JSON.stringify({ writeReadbacks, selectionAppearances, refusedFieldsWithInk, nonWhitespaceGlyphsOutsideMeasuredWriteBoxes })}`);
  return { fixture: name, rel, bytes, report, widgets, writeReadbacks, selectionAppearances, refusedFieldsWithInk, nonWhitespaceGlyphsOutsideMeasuredWriteBoxes, pageContent: pageContentDigests(outDoc), pageStreams: pageStreamDigests(outDoc) };
}

function instructions(map) {
  const required = map.refusals.filter((r) => r.requiredBeforeFiling);
  return `# Alabama ABPP-3 pardon application — completion guide\n\nThis packet contains the official four-page ABPP-3. The builder prefilled only held contact and identity facts and marked **FOR: PARDON**. Read all four official pages before signing.\n\n## Complete these blanks before submission\n\n${required.map((r) => `- **${r.effectiveLabel}** (page ${r.page}): supply the answer exactly as the form requests.`).join("\n")}\n- **Convictions — State / Federal** (page 1): mark every category that applies. Attach a complete list of the convictions for which you seek a pardon, including counties and dates, as ABPP-3 instructs.\n- **Previously applied for — Pardon / Fines / Neither** (page 1): choose the truthful answer. If you applied before, handwrite the **date of last hearing** in its printed blank. If previously pardoned, complete **rights not restored and relief sought now**.\n- **Applicant signature and signature date** (page 1): after reviewing the application and its printed attestation, sign and date it by hand. The PDF uses one technical field for both the hearing-date blank and signature-date blank, so neither date is prefilled.\n- Review the prefilled **Email**, **Phone**, **Date of birth**, and **Applicant print name**. Correct them before signing if needed. Complete **AIS number, if applicable**, **Current name, if different**, and **Mobile phone** when applicable.\n\nDo not mark **FOR: REMISSION OF FINES** or **FOR: BOTH** for this pardon-only route. The BOARD USE ONLY fields remain blank for the Board.\n\nABPP-3's printed instructions require the completed application and a separate Waiver of Liability and Authority for Release of Information. The waiver and the attached conviction list are not extra packet components generated here; obtain and complete them separately. The form says to submit those materials to the Alabama Bureau of Pardons and Paroles, 301 South Ripley Street, Montgomery, Alabama 36104, or pardons.application@paroles.alabama.gov. The held route record also says the filing process begins through the local probation office and then goes to the Board. Before sending, use the local probation office to confirm the current procedure and follow the current printed ABPP-3 instructions.\n\nThe printed pardon instructions say an investigation starts only at the convicted person's request; the sentence must be complete or at least three years of parole successfully completed. A claim of innocence has extra proof and written-approval requirements printed on the form. After a denial, the form says another application ordinarily cannot be filed for two years unless the Board orders otherwise. The investigation and Board decision occur after submission.\n\nThe held route and official form do not state a filing fee, fee-waiver process, notarization requirement, or service-on-another-party step. This guide does not promise that none will apply; confirm current requirements with the local probation office or Board.\n\nStop and seek individualized legal help if:\n\n- The participant needs individualized advocacy before the Board.\n- Immigration, licensing or firearm consequences are in play.\n\nThis is a preparation guide. It does not decide eligibility, guarantee a pardon, or represent Board approval.\n`;
}
function artifactSummary(r) { return { fixture: r.fixture, file: r.rel, document: SOURCE.officialFormId, componentId: SOURCE.componentId, sha256: sha256(r.bytes), byteLength: r.bytes.length, pageCount: 4, sourceSha256: SOURCE.sha256 }; }

async function verifyCurrent({ sourceBytes, census }) {
  const required = ["source-receipt.json", "field-census.census-v1.json", "production-field-map.json", "packet-set-manifest.json", "participant-instructions.md", "reports/actual-writes.json", "reports/blanks-left-for-the-participant.json", "reports/completeness-counters.json", "reports/rendered-artifacts.json", "fixtures/canonical.pdf", "fixtures/boundary.pdf", "build-status.json"];
  for (const rel of required) if (!fs.existsSync(path.join(OUT, rel))) throw new Error(`missing artifact ${rel}`);
  const receipt = readJson(`${OUT_REL}/source-receipt.json`); if (!receipt.allSourcesExact || receipt.documents[0].sha256 !== SOURCE.sha256) throw new Error("source receipt drift");
  const savedCensus = readJson(`${OUT_REL}/field-census.census-v1.json`); if (savedCensus.fields.length !== 30 || savedCensus.widgetCount !== 31 || JSON.stringify(savedCensus.fields) !== JSON.stringify(census.fields)) throw new Error("field census drift");
  const map = readJson(`${OUT_REL}/production-field-map.json`); if (map.writes.length !== 5 || map.refusals.length !== 25 || map.writes.some((w) => !census.fields.some((f) => f.name === w.field))) throw new Error("field map drift");
  const sourceDoc = await PDFDocument.load(sourceBytes, { ignoreEncryption: true, updateMetadata: false }); const sourcePages = pageContentDigests(sourceDoc); const sourceStreams = pageStreamDigests(sourceDoc);
  for (const fixture of ["canonical", "boundary"]) { const bytes = fs.readFileSync(path.join(OUT, "fixtures", `${fixture}.pdf`)); const doc = await PDFDocument.load(bytes, { ignoreEncryption: true, updateMetadata: false });
    if (doc.getPageCount() !== 4 || doc.getForm().getFields().length !== 0) throw new Error(`${fixture}: page/flatten drift`); const pages = pageContentDigests(doc); const streams = pageStreamDigests(doc);
    if (sourceStreams.some((page, i) => page.streams.some((digest) => !streams[i].streams.includes(digest)))) throw new Error(`${fixture}: an original official page content stream is absent`);
    for (let p = 1; p <= 3; p++) if (pages[p].sha256 !== sourcePages[p].sha256) throw new Error(`${fixture}: printed instruction page ${p + 1} changed`); }
  return { checked: required.length, sourceSha256: SOURCE.sha256, fields: 30, widgets: 31, fixtures: 2 };
}

async function build({ check = false, noRaster = false } = {}) {
  const { absolute, bytes: sourceBytes } = sourcePath(); const census = await censusOf(sourceBytes);
  if (census.pageCount !== SOURCE.pageCount || census.fields.length !== SOURCE.fieldCount || census.widgetCount !== SOURCE.widgetCount) throw new Error(`ABPP-3 topology drift: ${JSON.stringify({ pages: census.pageCount, fields: census.fields.length, widgets: census.widgetCount })}`);
  if (census.fields.some((f) => f.sourceValue !== "" && f.sourceValue !== false && f.sourceValue !== null)) throw new Error("ABPP-3 source carries a nonblank participant answer");
  if (check) return { familyId: FAMILY_ID, status: "CHECK_PASS", ...(await verifyCurrent({ sourceBytes, census })) };
  const map = mapFor(census); fs.mkdirSync(path.join(OUT, "reports"), { recursive: true });
  const sourceDoc = await PDFDocument.load(sourceBytes, { ignoreEncryption: true, updateMetadata: false }); const sourcePageContent = pageContentDigests(sourceDoc); const sourcePageStreams = pageStreamDigests(sourceDoc);
  const rendered = []; for (const [name, facts] of Object.entries(FIXTURES)) rendered.push(await renderFixture(name, facts, sourceBytes, census, map));
  const guide = instructions(map); fs.writeFileSync(path.join(OUT, "participant-instructions.md"), guide);
  writeJson(`${OUT_REL}/source-receipt.json`, { schemaVersion: "rcap-family-source-receipt/v1", familyId: FAMILY_ID, jurisdiction: "AL", implementationStrategy: "official_pdf_fill", routeKey: ROUTE_KEY, allSourcesExact: true,
    bindingMethod: "Exact restored ABPP-3 bytes, bound by SHA-256 before census or rendering.", recoveryRecord: SOURCE.recoveryRecord, resolvedPath: path.relative(ROOT, absolute),
    documents: [{ sourceId: SOURCE.sourceId, officialFormId: SOURCE.officialFormId, title: SOURCE.title, pathInArchive: SOURCE.relativePath, sha256: SOURCE.sha256, byteLength: sourceBytes.length, pageCount: 4, acroFieldCount: 30, widgetCount: 31, componentId: SOURCE.componentId }], sourcePageContent, sourcePageStreams, commercialRoutesOpened: 0 });
  writeJson(`${OUT_REL}/field-census.census-v1.json`, { schemaVersion: "rcap-official-form-field-census/v1-census-v1", familyId: FAMILY_ID, jurisdiction: "AL", sourceId: SOURCE.sourceId, sourceSha256: SOURCE.sha256, pageCount: census.pageCount, fieldCount: census.fields.length, widgetCount: census.widgetCount, fields: census.fields });
  writeJson(`${OUT_REL}/production-field-map.json`, { schemaVersion: "rcap-official-form-field-map/v1-census-v1", familyId: FAMILY_ID, jurisdiction: "AL", routeKeys: [ROUTE_KEY], routeSelectionId: ROUTE_SELECTION_ID, implementationStrategy: "official_pdf_fill", renderStrategy: "official_pdf_fill", componentSet: [SOURCE.componentId], componentRoutes: { [SOURCE.componentId]: ROUTE_KEY }, componentConditions: {}, sourceSha256: SOURCE.sha256,
    writes: map.writes, refusals: map.refusals, maps: [{ formNumber: SOURCE.officialFormId, sourceId: SOURCE.sourceId, sourceSha256: SOURCE.sha256, writes: map.writes, canonicalRefusals: map.refusals }], routeSelectionsMade: [{ field: "Pardon", value: true, basis: `Exact selected route ${ROUTE_KEY}.` }], generationAllowed: false, runtimeSelectable: false, commercialRoutesOpened: 0 });
  writeJson(`${OUT_REL}/packet-set-manifest.json`, { schemaVersion: "rcap-packet-set-manifest/v1", packetSetId: FAMILY_ID, familyId: FAMILY_ID, jurisdiction: "AL", routeKeys: [ROUTE_KEY], routeSelectionId: ROUTE_SELECTION_ID,
    componentList: [{ componentId: SOURCE.componentId, componentType: "primary_filing", required: true, officialFormId: SOURCE.officialFormId, sourceId: SOURCE.sourceId, sourceSha256: SOURCE.sha256, pageCount: 4 }], conditionalComponents: [], noAdditionalComponentInvented: true });
  const summaries = rendered.map(artifactSummary);
  writeJson(`${OUT_REL}/reports/rendered-artifacts.json`, { schemaVersion: "rcap-rendered-artifacts/v1", familyId: FAMILY_ID, renderedFresh: true, derivedFromBytes: true, componentSet: [SOURCE.componentId], componentConditions: {}, pdfs: summaries, artifacts: summaries,
    packets: summaries.map((a) => ({ fixture: a.fixture, documents: [{ document: SOURCE.officialFormId, componentId: SOURCE.componentId, file: a.file, pageCount: 4, sha256: a.sha256, sourceSha256: SOURCE.sha256 }] })), rasterSkipped: true, rasterPages: [], everyPageRastered: false, rasterStatus: "RASTER_PENDING", independentVerificationPending: true });
  writeJson(`${OUT_REL}/reports/actual-writes.json`, { schemaVersion: "rcap-actual-writes-byte-proof/v1", familyId: FAMILY_ID, derivedFromArtifactBytes: true,
    documents: rendered.map((r) => ({ fixture: r.fixture, document: SOURCE.officialFormId, sourceSha256: SOURCE.sha256, outputSha256: sha256(r.bytes), valuesReportedByFinalizer: r.report.expectedValues, writeReadbacks: r.writeReadbacks, routeSelection: { field: "Pardon", appearances: r.selectionAppearances }, addedGlyphsReadFromOutputBytes: r.widgets.reduce((n, w) => n + String(w.text).replace(/\s/g, "").length, 0), flattenedWidgetAppearancesReadFromOutputBytes: r.widgets.length, nonWhitespaceGlyphsOutsideMeasuredWriteBoxes: r.nonWhitespaceGlyphsOutsideMeasuredWriteBoxes, refusedFieldsWithInk: r.refusedFieldsWithInk, allOriginalOfficialPageContentStreamsPreserved: sourcePageStreams.every((page, i) => page.streams.every((digest) => r.pageStreams[i].streams.includes(digest))), sourceInstructionPagesPreserved: [2, 3, 4].every((p) => r.pageContent[p - 1].sha256 === sourcePageContent[p - 1].sha256) })),
    artifacts: rendered.map((r) => ({ fixture: r.fixture, valuesReportedByFinalizer: r.report.written.length, addedGlyphsReadFromOutputBytes: r.widgets.reduce((n, w) => n + String(w.text).replace(/\s/g, "").length, 0), flattenedWidgetAppearancesReadFromOutputBytes: r.widgets.length, nonWhitespaceGlyphsOutsideMeasuredWriteBoxes: r.nonWhitespaceGlyphsOutsideMeasuredWriteBoxes, refusedFieldsWithInk: r.refusedFieldsWithInk })), blockingFindings: [] });
  writeJson(`${OUT_REL}/reports/blanks-left-for-the-participant.json`, { schemaVersion: "rcap-blanks-left-for-the-participant/v1", familyId: FAMILY_ID, requiredBeforeFiling: map.refusals.filter((r) => r.requiredBeforeFiling), participantElections: map.refusals.filter((r) => r.refusalClass === "participant_sworn_narrative_or_legal_election"), protectedBlanks: map.refusals.filter((r) => PROTECTED.has(r.field)), everyRequiredBeforeFilingItemIsDisclosed: true, disclosedIn: `${OUT_REL}/participant-instructions.md` });
  writeJson(`${OUT_REL}/build-findings.json`, { schemaVersion: "rcap-family-build-findings/v1", familyId: FAMILY_ID, findings: [{ finding: "ABPP-3 reuses one AcroForm field named Date for the last-hearing date and applicant-signature date.", disposition: "Both widgets remain blank and are separately described in participant guidance." }], blockers: [] });
  writeJson(`${OUT_REL}/approval-request.json`, { schemaVersion: "rcap-approval-request/v1", familyId: FAMILY_ID, status: "PENDING_INDEPENDENT_REVIEW", sourceSha256: SOURCE.sha256, artifactHashes: summaries, rasterStatus: "RASTER_PENDING", selfApproved: false, approvedForLive: false });
  // This verifier validates its CLI argv at module load. Hide this builder's
  // --no-raster flag while importing its pure audit export, then restore argv.
  const savedArgv = process.argv;
  process.argv = [process.execPath, "al-pardon-completeness-import"];
  let auditFamily;
  try { ({ auditFamily } = await import("./rcap-packet-completeness/verify-packet-completeness.mjs")); }
  finally { process.argv = savedArgv; }
  const audit = auditFamily(OUT_REL, FAMILY_ID);
  if (audit.result !== "PASS_COMPLETE") throw new Error(`repository completeness verifier refused generated artifacts: ${JSON.stringify(audit)}`);
  const counters = audit.counters;
  writeJson(`${OUT_REL}/reports/completeness-counters.json`, { schemaVersion: "rcap-builder-completeness-counters/v1", familyId: FAMILY_ID, verifier: "scripts/rcap-packet-completeness/verify-packet-completeness.mjs", result: audit.result, counters, allNineZero: Object.values(counters).every((n) => n === 0), findings: audit.findings, note: "This author-side measurement is subordinate to independent review and raster acceptance." });
  writeJson(`${OUT_REL}/build-status.json`, { schemaVersion: "rcap-family-build-status/v1", familyId: FAMILY_ID, status: "qa_review_pending", routeKey: ROUTE_KEY, packetsBuilt: 2, sourcesExact: true, counters, rasterStatus: "RASTER_PENDING", noLocalRasterRequested: noRaster, approvedForLive: false, commercialRoutesOpened: 0 });
  const verified = await verifyCurrent({ sourceBytes, census }); return { familyId: FAMILY_ID, status: "BUILT", directory: OUT_REL, routeKeys: [ROUTE_KEY], componentIds: [SOURCE.componentId], counters, packetsBuilt: 2, rasterStatus: "RASTER_PENDING", artifacts: summaries, verified };
}

if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(thisFile)) {
  const args = new Set(process.argv.slice(2)); build({ check: args.has("--check"), noRaster: args.has("--no-raster") || process.env.RCAP_NO_LOCAL_RASTER === "1" }).then((r) => console.log(JSON.stringify(r, null, 2))).catch((e) => { console.error(e.stack ?? e); process.exit(1); });
}
export { build, FAMILY_ID, OUT_REL, SOURCE, LABELS, mapFor };
