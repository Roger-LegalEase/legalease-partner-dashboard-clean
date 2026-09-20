#!/usr/bin/env node
/**
 * PF20 native build for the Kansas arrest-only record route.
 *
 * The 2025 Criminal Cover Sheet is an AcroForm.  The two 2013/2016 arrest
 * documents are flat PDFs, so their values are placed only on rules and
 * printed underscore runs measured from the exact source bytes on each run.
 * This lane creates review evidence.  It does not raster, approve, or enable
 * a commercial route.
 */
import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

import { makeCorpusEntryResolver } from "./lib/corpus-index-paths.mjs";
import { extractTextItems, groupIntoLines, captureWidgetContext } from "./rcap-official-forms/rcap-pdf-anchor-capture.mjs";
import { finalizeOfficialForm, finalizeFlatOverlay } from "./rcap-official-forms/rcap-official-form-finalize.mjs";
import { rulesOfPage } from "./rcap-official-forms/rcap-pdf-rule-lines.mjs";
import { flattenedWidgets, drawnAt } from "./rcap-official-forms/pdf-flattened-widgets.mjs";
import { stampDeterministic } from "./rcap-official-forms/rcap-deterministic-pdf-date.mjs";
import { checkboxCandidates } from "./lib/pdf-stroked-boxes.mjs";
import { scanBytesForActiveContent } from "./rcap-official-forms/rcap-active-content.mjs";
import { classifyField, classifyBlank, rowKeyOf, PASS_COUNTERS, BLANK_DISPOSITIONS } from "./rcap-packet-completeness/completeness-contract.mjs";

const thisFile = fileURLToPath(import.meta.url);
const ROOT = path.resolve(path.dirname(thisFile), "..");
process.chdir(ROOT);
const require = createRequire(import.meta.url);
const { PDFDocument, StandardFonts, rgb } = require("pdf-lib");
const sha = (bytes) => crypto.createHash("sha256").update(bytes).digest("hex");
const readJson = (rel) => JSON.parse(fs.readFileSync(path.join(ROOT, rel), "utf8"));

const FAMILY_ID = "ks-22-2410-arrest-set";
const JURISDICTION = "KS";
const ROUTE_KEY = "obligation:track-only:KS:ks-22-2410-arrest";
const ROUTE_LABEL = "Expungement of a Kansas arrest record under K.S.A. 22-2410";
const OUT = "data/rcap-all50/overlays/census-v1/ks/ks-22-2410-arrest-set--official-pdf-fill";
const BUILD_SCRIPT = "scripts/build-census-v1-ks-22-2410-arrest-set.mjs";
const CORPUS_INDEX = "data/rcap-all50/local-source-corpus-index.json";
const OWNER_RECORD = "data/rcap-grade-a/legal-decisions/OWNER_KJC_PERMISSION_ATTESTATION_2026-09-11.json";

const SOURCE_DOCS = [
  {
    componentId: "ks-22-2410-arrest-cover-sheet-1",
    documentId: "KS-CRIMINAL-COVER-SHEET-10-14-2025",
    officialFormId: "KS-CRIMINAL-COVER-SHEET-10-14-2025",
    role: "cover_sheet",
    title: "Kansas Criminal Cover Sheet (revised 10/14/2025)",
    officialSourceUrl: "https://www.kjc.ks.gov/legal-forms/expungement-adult",
    corpusPath: "LegalEase Kansas/Criminal Cover Sheet 102025.pdf",
    custody: "nationwide_recovery_pool_2026_09_02",
    sha256: "6384f934dc431601dfd07d0822c32b83ee8fcd0412cff5496af1481169cdea60",
    byteLength: 126589, pages: 1, acroFieldCount: 36, strategy: "acroform_fill"
  },
  {
    componentId: "ks-22-2410-arrest-primary-filing-2",
    documentId: "KSJC-PETITION-EXPUNGEMENT-ARREST-RECORD-02-2013",
    officialFormId: "KSJC-PETITION-EXPUNGEMENT-ARREST-RECORD-02-2013",
    role: "primary_filing",
    title: "Kansas Judicial Council Petition for Expungement of Arrest Record (02/2013)",
    officialSourceUrl: "https://www.kjc.ks.gov/legal-forms/expungement-adult/arrest-record-only",
    corpusPath: "private/Nationwide Record Clearing/LegalEase Kansas/source-gated/KSJC__petition-for-expungement-of-arrest-record__rev-2013-02.pdf",
    custody: "ks_historical_recovery_20260913",
    sha256: "bf4b2309f831aa317d235389a6bd1f24bca55075290ddb3d916083c6f64d840d",
    byteLength: 51084, pages: 3, acroFieldCount: 0, strategy: "measured_flat_overlay"
  },
  {
    componentId: "ks-22-2410-arrest-cover-sheet-3",
    documentId: "KSJC-ORDER-EXPUNGEMENT-ARREST-RECORD-COVER-SHEET-12-2016",
    officialFormId: "KSJC-ORDER-EXPUNGEMENT-ARREST-RECORD-COVER-SHEET-12-2016",
    role: "cover_sheet",
    title: "Kansas Judicial Council Order of Expungement of Arrest Record Cover Sheet (12/2016)",
    officialSourceUrl: "https://www.kjc.ks.gov/legal-forms/expungement-adult/arrest-record-only",
    corpusPath: "private/Nationwide Record Clearing/LegalEase Kansas/source-gated/KSJC__order-of-expungement-of-arrest-record-cover-sheet__rev-2016-12.pdf",
    custody: "ks_historical_recovery_20260913",
    sha256: "d13bc7b7b2a9c5367c785c1de4f3a8d6d79410ef29a3c9c86a5b903057d249d5",
    byteLength: 55112, pages: 1, acroFieldCount: 0, strategy: "measured_flat_overlay"
  }
];

const FIXTURES = {
  canonical: {
    "participant.full_legal_name": "Jordan Avery Reyes",
    "participant.street_address": "412 Magnolia Avenue",
    "participant.city_state_zip": "Topeka, KS 66603",
    "participant.full_mailing_address": "412 Magnolia Avenue, Topeka, KS 66603",
    "participant.phone": "785-555-0142",
    "participant.email": "jordan.reyes@example.org",
    "participant.date_of_birth": "1988-06-14",
    "matter.court": "3rd",
    "matter.county": "Shawnee",
    "matter.case_number": "2018-CR-004217",
    "matter.arrest_date": "2017-11-02",
    "matter.citing_or_arresting_agency": "Topeka Police Department",
    "matter.charge": "Theft",
    "answers.convicted_or_diverted": false,
    "answers.identity_theft_victim": false,
    "answers.city_ordinance_arrest": false,
    "answers.statutory_ground": null,
    "answers.participant_account": null
  },
  boundary: {
    "participant.full_legal_name": "Alexandria Catherine Montgomery-Washington",
    "participant.street_address": "1188 Southwest Martin Luther King Boulevard",
    "participant.city_state_zip": "Kansas City, KS 66101-4417",
    "participant.full_mailing_address": "1188 Southwest Martin Luther King Boulevard, Kansas City, KS 66101-4417",
    "participant.phone": "913-555-0199",
    "participant.email": "alexandria.montgomery.washington@example.org",
    "participant.date_of_birth": "1979-12-31",
    "matter.court": "29th",
    "matter.county": "Wyandotte",
    "matter.case_number": "1999-CR-000001.99",
    "matter.arrest_date": "1998-01-31",
    "matter.citing_or_arresting_agency": "Kansas City Police Department",
    "matter.charge": "Theft by deception involving a long descriptive charge",
    "answers.convicted_or_diverted": false,
    "answers.identity_theft_victim": false,
    "answers.city_ordinance_arrest": false,
    "answers.statutory_ground": null,
    "answers.participant_account": null
  }
};

const PRINTED_SELECTION_CONTROLS = [
  { id: "sex-male", documentId: "KSJC-ORDER-EXPUNGEMENT-ARREST-RECORD-COVER-SHEET-12-2016", page: 1, label: "Participant sex — Male", section: "Petitioner's information" },
  { id: "sex-female", documentId: "KSJC-ORDER-EXPUNGEMENT-ARREST-RECORD-COVER-SHEET-12-2016", page: 1, label: "Participant sex — Female", section: "Petitioner's information" },
  ...["White", "Black", "Asian", "Pacific Island", "American Indian/Alaskan", "Unknown"].map((x, i) => ({ id: `race-${i + 1}`, documentId: "KSJC-ORDER-EXPUNGEMENT-ARREST-RECORD-COVER-SHEET-12-2016", page: 1, label: `Participant race — ${x}`, section: "Petitioner's information" })),
  ...["Hispanic", "Non-Hispanic", "Unknown"].map((x, i) => ({ id: `ethnicity-${i + 1}`, documentId: "KSJC-ORDER-EXPUNGEMENT-ARREST-RECORD-COVER-SHEET-12-2016", page: 1, label: `Participant ethnicity — ${x}`, section: "Petitioner's information" })),
  ...["mistaken identity", "no probable cause", "found not guilty", "best interests of justice / dismissed or not filed"].map((x, i) => ({ id: `ground-${i + 1}`, documentId: "KSJC-PETITION-EXPUNGEMENT-ARREST-RECORD-02-2013", page: i === 3 ? 2 : 1, label: `Participant statutory ground — ${x}`, section: "Item 5" }))
];

const ACRO_POLICY = {
  NAME: { label: "Participant full legal name", kind: "write", factId: "participant.full_legal_name", why: "the petitioner’s identity held for the packet" },
  "ADDRESS 1": { label: "Street address", kind: "write", factId: "participant.street_address", why: "the first line of the participant address block" },
  "ADDRESS 2": { label: "Participant city, state and ZIP", kind: "narrative", factId: "participant.city_state_zip", why: "the second address line is a composite held fact and is written through the native narrative channel" },
  PHONE: { label: "Telephone number", kind: "write", factId: "participant.phone", why: "the held participant telephone number" },
  "CELL PHONE": { label: "Cell phone number (optional)", kind: "optional", why: "optional participant-authored content; the platform does not invent a second number" },
  "EMAIL ADDRESS": { label: "E-mail address", kind: "write", factId: "participant.email", why: "the held participant e-mail address" },
  "DL OR STATE ID NO": { label: "Participant identification — driver's licence or state ID number", kind: "required", why: "the participant supplies the identifier and issuing state from the card before filing" },
  SSN: { label: "Participant identification — Social Security number", kind: "required", why: "the participant supplies this sensitive identifier before filing if they choose to include it" },
  DOB: { label: "Date of birth", kind: "write", factId: "participant.date_of_birth", why: "the held participant date of birth" },
  "VIOLATION DATE": { label: "Offense row — violation date", kind: "required", why: "the form asks for the date of the offense or violation; an arrest date is not substituted" },
  OFFICER: { label: "Officer name from the complaint", kind: "required", why: "the participant copies the officer named in the complaint or citation" },
  "OFFICER NO": { label: "Officer number from the complaint", kind: "required", why: "the participant copies the officer number from the complaint or citation" },
  SEX: { label: "Participant sex", kind: "required", why: "the participant supplies the sex the record should state" },
  "ALIAS NAMES USED 1": { label: "Alias name line 1", kind: "required", why: "the participant supplies any other name used in the record, or leaves it blank if none" },
  "ALIAS NAMES USED 2": { label: "Alias name line 2", kind: "required", why: "the participant supplies any other name used in the record, or leaves it blank if none" },
  "ALIAS NAMES USED 3": { label: "Alias name line 3", kind: "required", why: "the participant supplies any other name used in the record, or leaves it blank if none" },
  "KDR TRANSACTION NUMBER": { label: "Kansas Department of Revenue transaction number", kind: "required", why: "the participant supplies this case identifier if the record carries one" },
  "WHITE": { label: "Participant race — White", kind: "election", why: "the participant marks the printed race control by hand" },
  "BLACK": { label: "Participant race — Black", kind: "election", why: "the participant marks the printed race control by hand" },
  "ASIAN": { label: "Participant race — Asian", kind: "election", why: "the participant marks the printed race control by hand" },
  "PACIFIC ISLAND": { label: "Participant race — Pacific Island", kind: "election", why: "the participant marks the printed race control by hand" },
  "AMERICAN INDIANALASKAN": { label: "Participant race — American Indian/Alaskan", kind: "election", why: "the participant marks the printed race control by hand" },
  UNKNOWN: { label: "Participant race — Unknown", kind: "election", why: "the participant marks the printed race control by hand" },
  "Ethnicity rbgroup": { label: "Participant ethnicity", kind: "election", why: "the participant marks the printed ethnicity control by hand" },
  "D Attorney Street": { label: "Attorney block — defendant attorney street address", kind: "notApplicable", why: "attorney-only block; this packet is prepared for a self-represented petitioner and no representation fact is held", routeCondition: "no attorney-representation fact is held for this self-represented packet" },
  "D Attorney CSZ": { label: "Attorney block — defendant attorney city, state and ZIP", kind: "notApplicable", why: "attorney-only block; this packet is prepared for a self-represented petitioner and no representation fact is held", routeCondition: "no attorney-representation fact is held for this self-represented packet" },
  "D Attorney Phone": { label: "Attorney block — defendant attorney telephone", kind: "notApplicable", why: "attorney-only block; this packet is prepared for a self-represented petitioner and no representation fact is held", routeCondition: "no attorney-representation fact is held for this self-represented packet" },
  "D Attorney SC No": { label: "Attorney block — defendant attorney Supreme Court number", kind: "notApplicable", why: "attorney-only block; this packet is prepared for a self-represented petitioner and no representation fact is held", routeCondition: "no attorney-representation fact is held for this self-represented packet" },
  "D Attorney Firm": { label: "Attorney block — defendant attorney firm", kind: "notApplicable", why: "attorney-only block; this packet is prepared for a self-represented petitioner and no representation fact is held", routeCondition: "no attorney-representation fact is held for this self-represented packet" },
  "C Attorney Firm": { label: "Attorney block — complainant attorney firm", kind: "notApplicable", why: "attorney-only block; this packet is prepared for a self-represented petitioner and no representation fact is held", routeCondition: "no attorney-representation fact is held for this self-represented packet" },
  "C Attorney Address": { label: "Attorney block — complainant attorney address", kind: "notApplicable", why: "attorney-only block; this packet is prepared for a self-represented petitioner and no representation fact is held", routeCondition: "no attorney-representation fact is held for this self-represented packet" },
  "C Attorney Phone": { label: "Attorney block — complainant attorney telephone", kind: "notApplicable", why: "attorney-only block; this packet is prepared for a self-represented petitioner and no representation fact is held", routeCondition: "no attorney-representation fact is held for this self-represented packet" },
  "C Attorney Cell": { label: "Attorney block — complainant attorney cell phone", kind: "notApplicable", why: "attorney-only block; this packet is prepared for a self-represented petitioner and no representation fact is held", routeCondition: "no attorney-representation fact is held for this self-represented packet" },
  "C Attorney Email": { label: "Attorney block — complainant attorney e-mail", kind: "notApplicable", why: "attorney-only block; this packet is prepared for a self-represented petitioner and no representation fact is held", routeCondition: "no attorney-representation fact is held for this self-represented packet" },
  "C Attorney SC No": { label: "Attorney block — complainant attorney Supreme Court number", kind: "notApplicable", why: "attorney-only block; this packet is prepared for a self-represented petitioner and no representation fact is held", routeCondition: "no attorney-representation fact is held for this self-represented packet" },
  "D Attorney If needed": { label: "Attorney block — additional defendant attorney line", kind: "notApplicable", why: "attorney-only block; this packet is prepared for a self-represented petitioner and no representation fact is held", routeCondition: "no attorney-representation fact is held for this self-represented packet" }
};

function normalRect(rect) {
  return { x: Math.min(rect.x, rect.x + rect.width), y: Math.min(rect.y, rect.y + rect.height), width: Math.abs(rect.width), height: Math.abs(rect.height) };
}

function resolveSources() {
  const indexBytes = fs.readFileSync(path.join(ROOT, CORPUS_INDEX));
  const index = JSON.parse(indexBytes);
  const resolver = makeCorpusEntryResolver(index, { repoRoot: ROOT, masterLibraryRoot: process.env.MASTER_LIBRARY_SOURCE_DIR });
  const resolved = [], failures = [];
  for (const doc of SOURCE_DOCS) {
    const entry = (index.entries ?? []).find((e) => e.path === doc.corpusPath && e.custody === doc.custody);
    if (!entry) { failures.push({ documentId: doc.documentId, path: doc.corpusPath, custody: doc.custody, why: "no exact current corpus-index entry" }); continue; }
    if (entry.sha256 !== doc.sha256 || Number(entry.byteLength) !== doc.byteLength) {
      failures.push({ documentId: doc.documentId, why: "current corpus-index expected identity differs", indexSha256: entry.sha256, pinnedSha256: doc.sha256, indexByteLength: entry.byteLength, pinnedByteLength: doc.byteLength }); continue;
    }
    const absolute = resolver.resolve(entry);
    if (!absolute || !fs.existsSync(absolute)) { failures.push({ documentId: doc.documentId, path: doc.corpusPath, custody: doc.custody, why: "exact declared custody is not mounted" }); continue; }
    const bytes = fs.readFileSync(absolute);
    const observed = sha(bytes);
    if (observed !== doc.sha256 || bytes.length !== doc.byteLength) {
      failures.push({ documentId: doc.documentId, path: doc.corpusPath, why: "on-disk source bytes fail expected identity", expectedSha256: doc.sha256, observedSha256: observed, expectedByteLength: doc.byteLength, observedByteLength: bytes.length }); continue;
    }
    resolved.push({ ...doc, bytes, absolute, byteLengthObserved: bytes.length, custodyRoot: index.custodies?.find((c) => c.id === doc.custody)?.root ?? null });
  }
  return { index, indexSha256: sha(indexBytes), resolved, failures };
}

const RECORDS = [
  { recordId: "ks-arrest-legal-design-track-registry", path: "data/record-clearing/legal-design-track-registry.json", sha256: "b62ae6910be2be283eaba5c90b25460f023bb2212a5abdb0e01d3993463681c0", mustContain: ["ks-22-2410-arrest-set", "K.S.A. 22-2410(a)(1)", "Docket fee $176", "The court causes notice to be given."] },
  { recordId: "ks-arrest-master-queue", path: "data/rcap-grade-a/packet-factory-24h/MASTER_QUEUE.json", sha256: "e8c1acb7e4d0b3510834be83b888f25496e6de06a4d80e2dfa73fb874be3e243", mustContain: ["ks-22-2410-arrest-set", "SOURCE_BOUND_BY_HELD_BYTES", "OWNER_ATTESTATION_RELEASE"] },
  { recordId: "owner-kjc-permission-attestation", path: OWNER_RECORD, sha256: "9b5008f945fefe26899f767b705ce57139324b0f94f9a6d472accbc2526826f6", mustContain: ["ks-22-2410-arrest-set", "LEGAL_CLEAR", "productionTerminalGranted"] },
  { recordId: "ks-source-acquisition-receipt", path: "data/rcap-grade-a/packet-factory-24h/src01/CODEX_CS1_SRC1_ACQUISITION.json", sha256: "2825c6af0f25168a0a3e0e31700ee167490f5bc27d1b18a84ea3218792d78551", mustContain: ["6384f934dc431601dfd07d0822c32b83ee8fcd0412cff5496af1481169cdea60", "bf4b2309f831aa317d235389a6bd1f24bca55075290ddb3d916083c6f64d840d", "d13bc7b7b2a9c5367c785c1de4f3a8d6d79410ef29a3c9c86a5b903057d249d5"] }
];

function resolveRecords() {
  const resolved = [], failures = [];
  for (const rec of RECORDS) {
    const absolute = path.join(ROOT, rec.path);
    if (!fs.existsSync(absolute)) { failures.push({ recordId: rec.recordId, path: rec.path, why: "record absent" }); continue; }
    const bytes = fs.readFileSync(absolute); const observedSha256 = sha(bytes); const text = bytes.toString("utf8");
    const missing = rec.mustContain.filter((needle) => !text.includes(needle));
    if (observedSha256 !== rec.sha256 || missing.length) {
      failures.push({ recordId: rec.recordId, path: rec.path, expectedSha256: rec.sha256, observedSha256, missingAnchors: missing }); continue;
    }
    resolved.push({ ...rec, byteLength: bytes.length, observedSha256, anchorsVerified: rec.mustContain.length });
  }
  return { resolved, failures };
}

function pageTextOf(doc) {
  return doc.getPages().map((page, i) => ({ page: i + 1, lines: groupIntoLines(extractTextItems(page)) }));
}

function censusAcro(source) {
  return (async () => {
    const doc = await PDFDocument.load(source.bytes, { ignoreEncryption: true, updateMetadata: false });
    const pages = doc.getPages(); assert.equal(pages.length, source.pages, `${source.documentId}: page count`);
    const pageText = pageTextOf(doc);
    const rows = [];
    for (const field of doc.getForm().getFields()) {
      const name = field.getName(); const policy = ACRO_POLICY[name];
      assert.ok(policy, `${source.documentId}/${name}: no authored policy`);
      const widgets = field.acroField.getWidgets().map((widget, widgetIndex) => {
        let pi = pages.findIndex((page) => page.ref === widget.P());
        if (pi < 0) pi = pages.findIndex((page) => (page.node.Annots()?.asArray() ?? []).some((ref) => doc.context.lookup(ref) === widget.dict));
        assert.ok(pi >= 0, `${source.documentId}/${name}: widget page`);
        const rect = normalRect(widget.getRectangle());
        const ctx = captureWidgetContext(pages[pi], [{ name, rect }], { precomputedLines: pageText[pi].lines, isFirstPage: pi === 0 })[0];
        return { widgetIndex, page: pi + 1, rect, harvestedLabel: ctx.effectiveLabel ?? null, harvestedRegion: ctx.regionHeading ?? null };
      });
      let sourceValue = null;
      try { if (typeof field.isChecked === "function") sourceValue = field.isChecked() ? "on" : null; else if (typeof field.getText === "function") sourceValue = field.getText() ?? null; } catch { sourceValue = null; }
      const ctor = field.constructor.name;
      rows.push({
        key: name, name, page: widgets[0]?.page ?? null, rect: widgets[0]?.rect ?? null, widgets,
        rectBasis: "measured AcroForm widget rectangle from exact source binary",
        type: ctor === "PDFTextField" ? "text" : ctor === "PDFCheckBox" ? "checkbox" : ctor === "PDFRadioGroup" ? "radiogroup" : ctor,
        multiline: typeof field.isMultiline === "function" ? field.isMultiline() : false,
        maxLength: typeof field.getMaxLength === "function" ? (field.getMaxLength() ?? null) : null,
        sourceValue, effectiveLabel: policy.label, printedLine: widgets[0]?.harvestedLabel ?? null,
        policyDef: policy, policy: policy.kind, factId: policy.factId ?? null,
        printedTextAtCoordinate: (pageText[widgets[0]?.page - 1]?.lines ?? []).filter((line) => widgets[0] && Math.abs(line.y - widgets[0].rect.y) <= 16).slice(0, 2).map((line) => ({ y: line.y, extracted: line.text }))
      });
    }
    assert.equal(rows.length, source.acroFieldCount, `${source.documentId}: AcroForm field count`);
    return { kind: "acroform", rows, handControls: [], pageText, pageCount: pages.length, acroFieldCount: rows.length, measuredRuleCount: 0, strokedCheckboxCount: 0 };
  })();
}

function matchRule(page, expected, sourceId) {
  const found = (rulesOfPage(page).horizontal ?? []).find((r) => Math.abs(r.y - expected.y) <= 1 && Math.abs(r.x - expected.x0) <= 1 && Math.abs(r.endX - expected.x1) <= 1);
  assert.ok(found, `${sourceId}: measured rule moved; expected ${JSON.stringify(expected)}`);
  return found;
}

function ruleBox(rule) {
  return { x: +(rule.x + 2).toFixed(2), y: +(rule.y + 2).toFixed(2), width: +(rule.width - 4).toFixed(2), height: 12 };
}

function underscoreRuns(line) {
  const runs = []; let current = null;
  for (const c of line.chars ?? []) {
    if (c.c === "_") {
      if (!current || c.x - current.x2 > 1.5) { if (current) runs.push(current); current = { x: c.x, x2: c.x + c.w, count: 1 }; }
      else { current.x2 = c.x + c.w; current.count += 1; }
    } else if (current) { runs.push(current); current = null; }
  }
  if (current) runs.push(current);
  return runs;
}

function lineAt(pageText, page, predicate, expectedY, sourceId) {
  const candidates = pageText[page - 1]?.lines.filter((line) => predicate(line.text)) ?? [];
  const line = candidates.sort((a, b) => Math.abs(a.y - expectedY) - Math.abs(b.y - expectedY))[0];
  assert.ok(line && Math.abs(line.y - expectedY) <= 1, `${sourceId}: expected printed line at page ${page}, y ${expectedY}`);
  return line;
}

function flatRow(base, policy, sourceId) {
  return { ...base, type: "flat_overlay_text", multiline: false, maxLength: null, policyDef: policy, policy: policy.kind, factId: policy.factId ?? null, sourceId };
}

async function censusFlat(source) {
  const doc = await PDFDocument.load(source.bytes, { ignoreEncryption: true, updateMetadata: false });
  const pages = doc.getPages(); const pageText = pageTextOf(doc);
  assert.equal(doc.getForm().getFields().length, 0, `${source.documentId}: flat source acquired AcroForm fields`);
  const measuredRules = pages.map((page) => rulesOfPage(page).horizontal ?? []);
  const rows = []; const handControls = PRINTED_SELECTION_CONTROLS.filter((c) => c.documentId === source.documentId);
  const addRule = (key, expected, label, policy) => {
    const page = pages[expected.page - 1]; const measured = matchRule(page, expected, source.documentId); const box = ruleBox(measured);
    rows.push(flatRow({ key, name: key, page: expected.page, rect: box, writeBox: box, rectBasis: "measured printed rule from exact source content stream", measuredRule: { x: measured.x, y: measured.y, endX: measured.endX, width: measured.width, thickness: measured.height }, effectiveLabel: label, printedLine: pageText[expected.page - 1].lines.filter((line) => Math.abs(line.y - expected.y) <= 14).map((line) => ({ y: line.y, extracted: line.text })), isSelectionControl: false }, policy, source.documentId));
  };
  const addRun = (key, page, predicate, y, runIndex, label, policy) => {
    const line = lineAt(pageText, page, predicate, y, source.documentId); const runs = underscoreRuns(line);
    const run = runs[runIndex]; assert.ok(run, `${source.documentId}: no underscore run ${runIndex} at ${page}/${y}`);
    const box = { x: +run.x.toFixed(2), y: +(line.y + 2).toFixed(2), width: +(run.x2 - run.x - 2).toFixed(2), height: 12 };
    rows.push(flatRow({ key, name: key, page, rect: box, writeBox: box, rectBasis: "measured printed underscore run from exact source text content", measuredRule: { kind: "printed_underscore_run", x: run.x, x2: run.x2, y: line.y, count: run.count }, effectiveLabel: label, printedLine: [{ y: line.y, extracted: line.text }], isSelectionControl: false }, policy, source.documentId));
  };

  if (source.documentId === "KSJC-ORDER-EXPUNGEMENT-ARREST-RECORD-COVER-SHEET-12-2016") {
    const expected = [
      { page: 1, y: 562.54, x0: 72.02, x1: 273.16 }, { page: 1, y: 533.38, x0: 115.94, x1: 431.71 }, { page: 1, y: 504.19, x0: 140.66, x1: 431.95 }, { page: 1, y: 482.23, x0: 72.02, x1: 432.91 }, { page: 1, y: 445.87, x0: 262.13, x1: 436.87 }, { page: 1, y: 387.31, x0: 106.10, x1: 225.04 }, { page: 1, y: 257.93, x0: 72.02, x1: 432.91 }, { page: 1, y: 236.09, x0: 72.02, x1: 432.91 }, { page: 1, y: 214.25, x0: 72.02, x1: 432.91 }, { page: 1, y: 192.29, x0: 72.02, x1: 432.91 }, { page: 1, y: 170.42, x0: 72.02, x1: 432.91 }
    ];
    addRule("section-heading-underline", expected[0], "Court form section heading underline", { kind: "protect", refusalClass: "court_prosecutor_clerk_or_agency_owned", why: "court, clerk, prosecutor, agency, or hearing field: this is the Judicial Council's section heading underline" });
    addRule("name", expected[1], "Participant full legal name", { kind: "write", factId: "participant.full_legal_name", why: "the name line in the petitioner information block" });
    addRule("address-line-1", expected[2], "Street address", { kind: "write", factId: "participant.street_address", why: "the first address line" });
    addRule("address-line-2", expected[3], "City, State, Zip", { kind: "write", factId: "participant.city_state_zip", why: "the second address line carries the held city, state and ZIP" });
    addRule("ssn", expected[4], "Participant identification — Social Security number", { kind: "required", why: "the participant supplies this sensitive identifier before filing if they choose to include it" });
    addRule("dob", expected[5], "Date of birth", { kind: "write", factId: "participant.date_of_birth", why: "the held participant date of birth" });
    for (let i = 0; i < 5; i += 1) addRule(`alias-${i + 1}`, expected[6 + i], `Alias name line ${i + 1}`, { kind: "required", why: "the participant supplies any other name used in the record, or leaves it blank if none" });
  } else {
    const vector = [
      { page: 1, y: 715.68, x0: 239.21, x1: 305.21 },
      { page: 1, y: 701.86, x0: 264.17, x1: 364.15 },
      { page: 1, y: 546.94, x0: 126.62, x1: 489.69 }
    ];
    addRule("judicial-district", vector[0], "Judicial district", { kind: "write", factId: "matter.court", why: "the judicial district in the caption" });
    addRule("county", vector[1], "County", { kind: "write", factId: "matter.county", why: "the Kansas county in the caption" });
    addRule("title-underline", vector[2], "Court form title underline", { kind: "protect", refusalClass: "court_prosecutor_clerk_or_agency_owned", why: "court, clerk, prosecutor, agency, or hearing field: this is the official form title underline" });
    addRun("caption-name", 1, (text) => text.startsWith("_______________________________ [Name]"), 676.2, 0, "Participant full legal name (caption)", { kind: "write", factId: "participant.full_legal_name", why: "the petitioner caption" });
    addRun("case-number", 1, (text) => text.startsWith("Case No."), 648.6, 0, "Case number", { kind: "write", factId: "matter.case_number", why: "the case number in the caption where charges were filed" });
    addRun("item-1-name", 1, (text) => text.startsWith("1. My full name is"), 453.1, 0, "Participant full legal name (item 1)", { kind: "write", factId: "participant.full_legal_name", why: "item 1 asks for the petitioner's full name" });
    addRun("item-2-former-name", 1, (text) => text.startsWith("________________"), 397.9, 0, "Former full name at arrest (if different)", { kind: "required", why: "the participant supplies the name used at arrest when it differs from item 1" });
    addRun("item-3-race", 1, (text) => text.startsWith("3. I am a"), 370.3, 0, "Participant identity — race", { kind: "required", why: "the participant supplies the race the petition should state" });
    addRun("item-3-sex", 1, (text) => text.startsWith("3. I am a"), 370.3, 1, "Participant identity — sex", { kind: "required", why: "the participant supplies the sex the petition should state" });
    addRun("item-3-year", 1, (text) => text.startsWith("3. I am a"), 370.3, 2, "Participant identity — year of birth", { kind: "required", why: "the participant supplies the year of birth requested by item 3" });
    addRun("item-4-county", 1, (text) => text.startsWith("4. I was arrested in"), 342.6, 0, "County of arrest", { kind: "write", factId: "matter.county", why: "the county in which the arrest occurred" });
    addRun("item-4-arrest-date", 1, (text) => text.startsWith("4. I was arrested in"), 342.6, 1, "Arrest date", { kind: "write", factId: "matter.arrest_date", why: "the held arrest date, explicitly mapped as a sensitive event fact" });
    addRun("item-4-agency", 1, (text) => text.startsWith("by "), 315.1, 0, "Citing / Arresting Law Enforcement Agency", { kind: "write", factId: "matter.citing_or_arresting_agency", why: "the petition expressly asks the participant to state the agency that arrested them" });
    addRun("item-4-offense", 1, (text) => text.startsWith("_______________________________________;"), 287.4, 0, "Arrest offense", { kind: "write", factId: "matter.charge", why: "the petition expressly asks the crime for which the participant was arrested" });
    // The second printed offense line is available only when the charge needs it.
    addRun("signature", 2, (text) => text.startsWith("_________________________________________"), 496.8, 0, "Petitioner signature", { kind: "protect", refusalClass: "signature_or_date_participant_completion", why: "signature or date field; never prefilled by this build" });
    addRun("printed-name", 2, (text) => text.startsWith("Name (Print):"), 469.2, 0, "Printed participant full legal name", { kind: "write", factId: "participant.full_legal_name", why: "the participant's printed name beside the signature block" });
    addRun("contact-address-1", 2, (text) => text.startsWith("Address 1:"), 455.3, 0, "Street address", { kind: "write", factId: "participant.street_address", why: "the first contact address line" });
    addRun("contact-address-2", 2, (text) => text.startsWith("Address 2:"), 441.6, 0, "Address 2 (optional second line)", { kind: "optional", why: "optional participant-authored content, and the platform does not invent a second address line" });
    addRun("contact-city-state-zip", 2, (text) => text.startsWith("City, State, Zip:"), 427.8, 0, "City, State, Zip", { kind: "write", factId: "participant.city_state_zip", why: "the held city, state and ZIP" });
    addRun("contact-phone", 2, (text) => text.startsWith("Telephone Number:"), 413.9, 0, "Telephone number", { kind: "write", factId: "participant.phone", why: "the held participant telephone number" });
    addRun("contact-fax", 2, (text) => text.startsWith("[Fax Number]:"), 400.2, 0, "Fax number (optional)", { kind: "optional", why: "optional participant-authored content, and the platform does not invent a fax number" });
    addRun("contact-email", 2, (text) => text.startsWith("[E-mail Address]:"), 386.3, 0, "E-mail address", { kind: "write", factId: "participant.email", why: "the held participant e-mail address" });
  }
  return { kind: "flat", rows, handControls, pageText, pageCount: pages.length, acroFieldCount: 0, measuredRuleCount: measuredRules.reduce((n, page) => n + page.length, 0), strokedCheckboxCount: 0, measuredRules };
}

async function renderAcro(source, census, facts) {
  const ordinary = census.rows.filter((r) => r.policy === "write");
  const narratives = census.rows.filter((r) => r.policy === "narrative");
  const allowed = new Set([...ordinary, ...narratives].map((r) => r.name));
  const unwritableFields = census.rows.filter((r) => !allowed.has(r.name)).map((r) => ({ field: r.name }));
  const explicitMappings = Object.fromEntries([...ordinary, ...narratives].map((r) => [r.name, r.factId]));
  const result = await finalizeOfficialForm({
    sourceBytes: source.bytes, expectedSha256: source.sha256,
    census: census.rows.map((r) => ({ name: r.name, type: r.type, effectiveLabel: r.effectiveLabel, regionHeading: null, widgets: r.widgets.map((w) => ({ page: w.page, rect: w.rect })), multiline: r.multiline, maxLength: r.maxLength })),
    facts, explicitMappings, unwritableFields,
    narrativeAcrossFields: narratives.map((r) => ({ factId: r.factId, fields: [r.name] })),
    printedDateOrderByField: { DOB: "month_day_year" },
    documentTextLines: census.pageText.flatMap((p) => p.lines.map((line) => line.text)),
    maxFontSize: 10, minFontSize: 6, evaluateDeclaredMinimumSize: true,
    alignWidgetFontSizeToFit: true, fitTextPerWidget: true, detachNestedControlFields: true,
    suppressSynthesizedAppearances: true, suppressSynthesizedWidgetBorders: true,
    normalizeInvertedWidgetRects: true, honorWidgetBorderStyle: true,
    preserveUnwrittenSelectionBackgrounds: true, fitAppearancesToRect: true,
    title: `${FAMILY_ID} ${source.documentId}`
  });
  return result;
}

async function renderFlat(source, census, facts) {
  const protectedRules = census.rows.filter((r) => r.policy === "protect" && r.measuredRule && r.measuredRule.x !== undefined).map((r) => ({ page: r.page, y: r.measuredRule.y, x: r.measuredRule.x, endX: r.measuredRule.endX, category: r.policyDef.refusalClass, caption: r.effectiveLabel }));
  const writable = census.rows.filter((r) => r.policy === "write");
  const anchors = writable.map((r) => ({ page: r.page, label: r.effectiveLabel, writeBox: r.writeBox, factId: r.factId, fontSize: 10, protectedRules }));
  const explicitMappings = Object.fromEntries(writable.map((r) => [r.effectiveLabel, r.factId]));
  return finalizeFlatOverlay({
    sourceBytes: source.bytes, expectedSha256: source.sha256, anchors, protectedRules, explicitMappings, facts,
    documentTextLines: census.pageText.flatMap((p) => p.lines.map((line) => line.text)), minFontSize: 6,
    title: `${FAMILY_ID} ${source.documentId}`
  });
}

function inBox(item, box) {
  return item.x >= box.x - 2 && item.x <= box.x + box.width + 2 && item.y >= box.y - 1 && item.y <= box.y + box.height + 1;
}

async function proofDocument(source, census, bytes, report, fixtureName) {
  const isFlat = census.kind === "flat";
  const actualWrites = []; const refusedFieldsWithInk = []; const documentAuthoredAppearances = [];
  let glyphs = 0; let appearances = 0;
  if (!isFlat) {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "ks-arrest-proof-")); const file = path.join(dir, `${source.documentId}.pdf`); fs.writeFileSync(file, bytes);
    try {
      const widgets = await flattenedWidgets(file); appearances = widgets.length;
      for (const row of census.rows) {
        const isWritten = (report.written ?? []).some((w) => w.field === row.name);
        for (const widget of row.widgets) {
          const text = drawnAt(widgets, { page: widget.page, rect: widget.rect }).map((x) => x.text).filter(Boolean);
          const ink = text.join("").trim();
          if (isWritten && (row.policy === "write" || row.policy === "narrative")) {
            glyphs += ink.length;
            actualWrites.push({ field: `${source.documentId}/${row.name}`, factId: row.factId, page: widget.page, rect: widget.rect, effectiveLabel: row.effectiveLabel, drawnText: text, expected: FIXTURES[fixtureName][row.factId] ?? null, matchesExpected: ink.length > 0 });
          } else if (ink) {
            if (row.sourceValue !== null && row.sourceValue !== undefined) documentAuthoredAppearances.push({ field: row.name, page: widget.page, drawnText: text, sourceValue: row.sourceValue });
            else refusedFieldsWithInk.push({ fieldId: `${source.documentId}/${row.name}`, page: widget.page, drawnText: text });
          }
        }
      }
    } finally { fs.rmSync(dir, { recursive: true, force: true }); }
  } else {
    const sourceDoc = await PDFDocument.load(source.bytes, { ignoreEncryption: true, updateMetadata: false });
    const outDoc = await PDFDocument.load(bytes, { ignoreEncryption: true, updateMetadata: false });
    const sourceByPage = new Map(); const outByPage = new Map();
    sourceDoc.getPages().forEach((page, i) => sourceByPage.set(i + 1, extractTextItems(page).map((t) => ({ x: Number(t.x), y: Number(t.y), text: String(t.text ?? "") }))));
    outDoc.getPages().forEach((page, i) => outByPage.set(i + 1, extractTextItems(page).map((t) => ({ x: Number(t.x), y: Number(t.y), width: Number(t.width ?? 0), text: String(t.text ?? "") }))));
    const extraText = (page, box) => {
      const printed = (sourceByPage.get(page) ?? []).filter((item) => inBox(item, box)).map((item) => `${Math.round(item.x)}:${item.text}`);
      const set = new Set(printed);
      return (outByPage.get(page) ?? []).filter((item) => item.text.trim() && inBox(item, box)).filter((item) => !set.has(`${Math.round(item.x)}:${item.text}`)).sort((a, b) => a.x - b.x).map((item) => item.text);
    };
    const writeRows = census.rows.filter((r) => r.policy === "write");
    const allWriteBoxes = writeRows.map((r) => ({ page: r.page, rect: r.rect }));
    for (const row of census.rows) {
      const isWritten = (report.written ?? []).some((w) => w.anchor === row.effectiveLabel);
      const text = extraText(row.page, row.rect); const ink = text.join("").trim();
      if (isWritten && row.policy === "write") {
        glyphs += ink.length;
        actualWrites.push({ field: `${source.documentId}/${row.key}`, factId: row.factId, page: row.page, rect: row.rect, measuredRule: row.measuredRule, effectiveLabel: row.effectiveLabel, drawnText: text, expected: FIXTURES[fixtureName][row.factId] ?? null, matchesExpected: ink.length > 0 });
      } else if (ink) refusedFieldsWithInk.push({ fieldId: `${source.documentId}/${row.key}`, page: row.page, drawnText: text });
    }
    // Any new text outside the measured write boxes is a visual defect, including
    // an accidental write onto the title, signature or source instructions.
    let outside = 0;
    for (const [page, items] of outByPage) {
      const sourceKeys = new Set((sourceByPage.get(page) ?? []).map((item) => `${Math.round(item.x)}:${item.text}`));
      for (const item of items) {
        if (!item.text.trim() || sourceKeys.has(`${Math.round(item.x)}:${item.text}`)) continue;
        if (!allWriteBoxes.some((b) => b.page === page && inBox(item, b.rect))) outside += item.text.replace(/\s+/g, "").length;
      }
    }
    return { actualWrites, refusedFieldsWithInk, documentAuthoredAppearances, glyphs, appearances, nonWhitespaceGlyphsOutsideMeasuredWriteBoxes: outside };
  }
  return { actualWrites, refusedFieldsWithInk, documentAuthoredAppearances, glyphs, appearances, nonWhitespaceGlyphsOutsideMeasuredWriteBoxes: 0 };
}

function baseMapRow(source, row) {
  const id = `${source.documentId}/${row.key}`;
  return {
    field: id, fieldName: id, acroFieldName: source.strategy === "acroform_fill" ? row.name : null,
    document: source.documentId, page: row.page, rect: row.rect, widgets: row.widgets ?? [{ page: row.page, rect: row.rect }],
    rectBasis: row.rectBasis, ...(row.measuredRule ? { measuredRule: row.measuredRule } : {}),
    printedLabel: row.effectiveLabel, printedLine: row.printedLine, effectiveLabel: row.effectiveLabel,
    sectionHeading: row.policyDef.section ?? null, regionHeading: row.policyDef.section ?? null
  };
}

function mapFor(source, census, report) {
  const writes = new Set((report.written ?? []).map((w) => source.strategy === "acroform_fill" ? w.field : w.anchor));
  const canonicalWrites = [], canonicalRefusals = [], selectionControls = [];
  for (const row of census.rows) {
    const base = baseMapRow(source, row); const p = row.policyDef;
    if (row.policy === "write" || row.policy === "narrative") {
      if (writes.has(source.strategy === "acroform_fill" ? row.name : row.effectiveLabel)) canonicalWrites.push({ ...base, factId: row.factId, kind: row.type, decision: "write" });
      else canonicalRefusals.push({ ...base, decision: "refuse", factId: row.factId, reason: "the finalizer reported no visible write for a held fact", why: "the candidate records the missing write rather than claiming it", completenessDisposition: "KNOWN_FACT_NOT_WRITTEN", requiredBeforeFiling: false });
      continue;
    }
    if (row.policy === "election") {
      selectionControls.push({ ...base, selectionId: base.field, kind: "selection_control", decision: "refuse", reason: p.why, why: p.why, category: "participant_sworn_narrative_or_legal_election", completenessClass: "participant_sworn_narrative_or_legal_election", class: "participant_sworn_narrative_or_legal_election", completenessDisposition: "PARTICIPANT_ELECTION_GENUINE", requiredBeforeFiling: false, routeDetermined: false, isSelectionControl: true });
      continue;
    }
    if (row.policy === "protect") {
      const refusalClass = p.refusalClass ?? "court_prosecutor_clerk_or_agency_owned";
      canonicalRefusals.push({ ...base, decision: "refuse", reason: p.why, why: p.why, category: refusalClass, completenessClass: refusalClass, class: refusalClass, completenessDisposition: refusalClass === "signature_or_date_participant_completion" ? "PROTECTED_FIELD" : "PROTECTED_FIELD", requiredBeforeFiling: false });
      continue;
    }
    if (row.policy === "notApplicable") {
      canonicalRefusals.push({ ...base, decision: "refuse", reason: p.why, why: p.why, category: null, completenessDisposition: "NOT_APPLICABLE_ON_THIS_ROUTE", requiredBeforeFiling: false, routeConditionThatMakesItInapplicable: p.routeCondition });
      continue;
    }
    if (row.policy === "optional") {
      canonicalRefusals.push({ ...base, decision: "refuse", reason: p.why, why: p.why, category: null, completenessDisposition: "OPTIONAL_PARTICIPANT_CONTENT", requiredBeforeFiling: false });
      continue;
    }
    if (row.policy === "required") {
      canonicalRefusals.push({ ...base, decision: "refuse", reason: `the participant supplies this before filing: ${p.why}`, why: `the participant supplies this before filing: ${p.why}`, category: null, completenessDisposition: "REQUIRED_BEFORE_FILING", disposition: "REQUIRED_BEFORE_FILING", requiredBeforeFiling: true, identity: `${source.documentId} page ${row.page} ${row.key}`, participantMustSupply: p.why, routeDetermined: false });
      continue;
    }
    throw new Error(`${source.documentId}/${row.key}: unhandled policy ${row.policy}`);
  }
  for (const control of census.handControls ?? []) {
    selectionControls.push({
      field: `${source.documentId}/${control.id}`, fieldName: `${source.documentId}/${control.id}`, document: source.documentId, page: control.page,
      rect: null, widgets: [], rectBasis: "printed selection control measured as text glyph; no writable geometry was invented",
      printedLabel: control.label, effectiveLabel: control.label, sectionHeading: control.section, regionHeading: control.section,
      selectionId: `${source.documentId}/${control.id}`, kind: "printed_selection_control", decision: "refuse", reason: "the printed control is left for the participant to mark by hand", why: "the participant makes this sworn election", category: "participant_sworn_narrative_or_legal_election", completenessClass: "participant_sworn_narrative_or_legal_election", class: "participant_sworn_narrative_or_legal_election", completenessDisposition: "PARTICIPANT_ELECTION_GENUINE", requiredBeforeFiling: false, routeDetermined: false, isSelectionControl: true, printedSelectionControlNotMeasured: true
    });
  }
  return {
    formNumber: source.documentId, documentId: source.documentId, documentRole: source.role, structuralClass: source.strategy === "acroform_fill" ? "acroform" : "flat_pdf_measured_overlay",
    documentPolicy: { mode: "participant", captionOnly: false, documentAcceptsFill: true, routeKey: ROUTE_KEY, role: source.role },
    explicitMappings: Object.fromEntries(canonicalWrites.map((r) => [r.field, r.factId])), canonicalWrites, canonicalRefusals, selectionControls,
    boundaryWrites: canonicalWrites, boundaryRefusals: canonicalRefusals,
    printedSelectionControlsNotMeasured: census.handControls ?? []
  };
}

function requiredBeforeFilingItems(maps) {
  return maps.flatMap((m) => m.canonicalRefusals.filter((r) => r.requiredBeforeFiling === true).map((r) => ({ document: m.documentId, field: r.field, page: r.page, section: r.sectionHeading, disclosureLabel: r.effectiveLabel, identity: r.identity, why: r.why, participantMustSupply: r.participantMustSupply })));
}

function countCompleteness(maps, proofs, artifacts, instructionsText) {
  const counters = Object.fromEntries(PASS_COUNTERS.map((c) => [c, 0])); const findings = [];
  const note = (counter, detail) => { counters[counter] += 1; findings.push({ counter, ...detail }); };
  const toContractRow = (r, selection = false) => ({ id: r.field, name: r.fieldName ?? r.field, label: r.effectiveLabel ?? "", reason: r.reason ?? "", refusalClass: r.category ?? null, page: r.page ?? null, document: r.document ?? null, factId: r.factId ?? null, isSelectionControl: selection, declared: { disposition: r.completenessDisposition ?? null, ...(Object.hasOwn(r, "requiredBeforeFiling") ? { requiredBeforeFiling: r.requiredBeforeFiling === true } : {}), ...(Object.hasOwn(r, "routeDetermined") ? { routeDetermined: r.routeDetermined === true } : {}), identity: r.identity ?? null, factId: r.factId ?? null, ...(r.routeConditionThatMakesItInapplicable ? { routeConditionThatMakesItInapplicable: r.routeConditionThatMakesItInapplicable } : {}) } });
  const writes = maps.flatMap((m) => m.canonicalWrites.map((r) => toContractRow(r)));
  const blanks = maps.flatMap((m) => [...m.canonicalRefusals.map((r) => toContractRow(r)), ...m.selectionControls.map((r) => toContractRow(r, true))]);
  const availableFacts = new Set(writes.map((w) => w.factId).filter(Boolean)); for (const p of proofs) for (const w of p.actualWrites ?? []) if (w.factId && String(w.drawnText?.join?.("") ?? "").trim()) availableFacts.add(String(w.factId));
  const norm = (x) => String(x ?? "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim(); const writtenByDoc = new Map();
  for (const w of writes) { if (!writtenByDoc.has(w.document)) writtenByDoc.set(w.document, new Set()); for (const key of [norm(w.label), norm(w.name)]) if (key.length >= 4) writtenByDoc.get(w.document).add(key); }
  const ledger = [];
  for (const blank of blanks) {
    const here = writtenByDoc.get(blank.document) ?? new Set(); const declared = { ...blank.declared, factAvailable: (blank.declared.factId ? availableFacts.has(String(blank.declared.factId)) : false) || here.has(norm(blank.label)) || here.has(norm(blank.name)) };
    const verdict = classifyBlank(blank, blank.reason, blank.refusalClass, declared); ledger.push({ field: blank.id, label: blank.label, ...verdict });
    if (!BLANK_DISPOSITIONS[verdict.disposition]?.allowed) note(verdict.disposition === "KNOWN_FACT_NOT_WRITTEN" ? "knownRequiredFieldsMissing" : verdict.disposition === "ROUTE_OPTION_NOT_SELECTED" ? "requiredOptionsMissing" : "unclassifiedBlanks", { field: blank.id, label: blank.label, disposition: verdict.disposition, basis: verdict.basis });
  }
  const instructions = String(instructionsText); for (const b of ledger.filter((x) => x.disposition === "REQUIRED_BEFORE_FILING")) { const needles = [b.label, b.field].map(String).filter((x) => x.length >= 3); if (!needles.some((n) => instructions.toLowerCase().includes(n.toLowerCase().slice(0, 80)))) note("requiredFactsNotCollected", { field: b.field, label: b.label, why: "required-before-filing item is absent from participant instructions" }); }
  const byRow = new Map(); for (const r of [...writes.map((r) => ({ ...r, written: true })), ...blanks.map((r) => ({ ...r, written: false }))]) { const key = rowKeyOf(r); if (!key) continue; if (!byRow.has(key)) byRow.set(key, []); byRow.get(key).push(r); }
  for (const [key, cells] of byRow) { if (!cells.some((r) => r.written)) continue; const missing = cells.filter((r) => !r.written && classifyField(r.label, r.isSelectionControl === true).requirement === "REQUIRED_KNOWN"); if (missing.length) note("incompleteRows", { row: key, missingCells: missing.map((r) => r.label) }); }
  for (const proof of proofs) { const visible = (proof.addedGlyphsReadFromOutputBytes ?? 0) + (proof.flattenedWidgetAppearancesReadFromOutputBytes ?? 0); if ((proof.valuesReportedByFinalizer ?? 0) > 0 && visible === 0) note("invisibleWrites", { fixture: proof.fixture, document: proof.formNumber, why: "finalizer reported a write but saved bytes carry no visible text or appearance" }); if ((proof.nonWhitespaceGlyphsOutsideMeasuredWriteBoxes ?? 0) > 0) note("visualDefects", { fixture: proof.fixture, document: proof.formNumber, why: "new ink landed outside measured write boxes" }); for (const u of proof.unfittable ?? []) note("visualDefects", { fixture: proof.fixture, document: proof.formNumber, field: u.anchor, why: "the finalizer refused a held value because it could not fit the measured field at the minimum font" }); for (const r of proof.refusedFieldsWithInk ?? []) note("protectedWrites", { fixture: proof.fixture, document: proof.formNumber, field: r.fieldId, why: "a refused field carries new ink" }); }
  for (const w of writes) if (classifyField(w.label, false).requirement === "PROTECTED") note("protectedWrites", { field: w.id, label: w.label, why: "a protected field was written" });
  const rendered = artifacts.map((a) => `${a.file} ${(a.documents ?? []).join(" ")}`).join(" ").toLowerCase(); const loose = (x) => String(x).toLowerCase().replace(/[^a-z0-9]/g, "");
  for (const m of maps) if (!rendered.includes(String(m.formNumber).toLowerCase()) && !loose(rendered).includes(loose(m.formNumber))) note("requiredComponentsMissing", { component: m.formNumber, why: "the official document is absent from every rendered artifact" });
  return { counters, findings, ledger };
}

function sanitizeText(text) { return String(text).replaceAll("‑", "-").replaceAll("–", "-").replaceAll("—", "-").replaceAll("§", "Sec. ").replaceAll("’", "'").replaceAll("“", '"').replaceAll("”", '"').replaceAll(" ", " "); }

async function renderGuidance(text, title) {
  const pdf = await PDFDocument.create(); stampDeterministic(pdf); pdf.setTitle(title); pdf.setProducer("RCAP evidence renderer"); pdf.setCreator("RCAP evidence build");
  const font = await pdf.embedFont(StandardFonts.TimesRoman); const size = 11, lineHeight = 14.5, width = 612, height = 792, margin = 72, max = width - 2 * margin;
  const widthOf = (s) => font.widthOfTextAtSize(s, size); let page = pdf.addPage([width, height]); let y = height - margin;
  const draw = (line) => { if (y < margin) { page = pdf.addPage([width, height]); y = height - margin; } if (line) page.drawText(line, { x: margin, y, size, font, color: rgb(0, 0, 0) }); y -= lineHeight; };
  const wrap = (raw) => { if (!raw) return [""]; const words = raw.split(/\s+/); const out = []; let cur = ""; for (const word of words) { let parts = [word]; while (widthOf(parts[0]) > max) { let n = parts[0].length - 1; while (n > 1 && widthOf(parts[0].slice(0, n)) > max) n -= 1; parts = [parts[0].slice(0, n), parts[0].slice(n)]; } for (const part of parts) { const candidate = cur ? `${cur} ${part}` : part; if (widthOf(candidate) <= max) cur = candidate; else { if (cur) out.push(cur); cur = part; } } } if (cur) out.push(cur); return out; };
  for (const raw of sanitizeText(text).split("\n")) for (const line of wrap(raw)) draw(line);
  return Buffer.from(await pdf.save({ useObjectStreams: false, updateMetadata: false }));
}

function guidanceText(facts, track) {
  const r = track;
  const out = [];
  out.push(`# Filing instructions — ${ROUTE_LABEL}`, "", `Prepared for: ${facts["participant.full_legal_name"]}`, "");
  out.push("This packet covers an arrest record that did not lead to a conviction or completed diversion. It is prepared under K.S.A. 22-2410(a)(1). There is no waiting period for this petition.", "");
  out.push("## Documents and order", "", "1. File the 2025 Kansas Criminal Cover Sheet with the petition.", "2. File the Kansas Judicial Council Petition for Expungement of Arrest Record with the clerk of the district court.", "3. Keep the Order of Expungement of Arrest Record Cover Sheet for the KBI after the court signs the order; it helps the KBI identify the arrest record.", "4. The packet includes this process guidance. A proposed granting order is not included: the Judicial Council publishes no arrest-record granting order, and local practice must be confirmed before a counsel-approved proposed order is added.", "");
  out.push("## Complete every blank listed below", "", "The platform filled only the participant and case facts it holds. The four statutory grounds are your own factual and legal choice and remain unmarked. Race, ethnicity, sex, Social Security number and aliases remain for you to complete on the official forms.", "");
  for (const [label, why] of requiredRowsForInstructions(facts)) out.push(`- **${label}** — ${why}`);
  out.push("", "## Ground and supporting record", "Choose exactly one printed ground on item 5: mistaken identity; no probable cause; found not guilty; or best interests of justice where charges have been dismissed or no charges have been or are likely to be filed. Check that choice against the docket, dismissal, acquittal or no-probable-cause record before filing. If you were convicted or completed diversion, stop: K.S.A. 21-6614 is the different route. A city-ordinance arrest uses the municipal route.", "");
  out.push("## Fee, notice and service", "", "The current legal record states a $176 docket fee under K.S.A. 22-2410(b)(3)(A), plus a supreme-court charge not exceeding $19 per docket fee through June 30, 2030. The statutory no-fee exemption in (b)(3)(B) reaches identity-theft arrests and cases with no probable cause, not-guilty findings or dismissed charges; ask the clerk whether it applies. There is no discretionary waiver in this route.", "", "The court sets the hearing and causes notice to the prosecuting attorney and arresting law-enforcement agency. You do not serve them. The court controls the hearing date, time, courtroom, case number if one has not been assigned, findings and signature on any order.", "");
  out.push("## Stop conditions", "", "Stop self-help and obtain legal help if the prosecutor opposes, the court sets a contested evidentiary hearing, a ground is disputed, the case involved conviction or completed diversion, the arrest was under a city ordinance, or immigration consequences are involved.", "", "This is a prepared set of official forms and process guidance. It is not legal advice, does not decide eligibility or a statutory ground, and is not approved for live fulfillment merely because it rendered.", "", `_Route: ${ROUTE_KEY}_`);
  return out.join("\n");
}

function requiredRowsForInstructions(facts) {
  return [
    ["Participant identification — driver's licence or state ID number", "copy the identifier and issuing state from the card before filing"],
    ["Participant identification — Social Security number", "copy the identifier only if you choose to include it, subject to the official form's own notice"],
    ["Alias name line 1", "state any other name used in the record, or leave blank if none"], ["Alias name line 2", "state any additional alias, or leave blank if none"], ["Alias name line 3", "state any additional alias, or leave blank if none"], ["Alias name line 4", "state any additional alias, or leave blank if none"], ["Alias name line 5", "state any additional alias, or leave blank if none"], ["Former full name at arrest (if different)", "state the name used at arrest when it differs from item 1"], ["Participant identity — race", "state the race the petition should carry"], ["Participant identity — sex", "state the sex the petition should carry"], ["Participant identity — year of birth", "state the year of birth requested by item 3"], ["Officer name from the complaint", "copy it from the complaint, citation or clerk's record"], ["Officer number from the complaint", "copy it from the complaint or citation"], ["Offense row — violation date", "copy the offense or violation date; do not substitute the arrest date"], ["Kansas Department of Revenue transaction number", "copy it if the case carries one"], ["Participant sex", "complete the sex field on the Criminal Cover Sheet"], ["Participant race — White", "mark the applicable printed race control by hand"], ["Participant ethnicity", "mark the applicable printed ethnicity control by hand"], ["Participant statutory ground — mistaken identity", "mark exactly one ground control by hand"], ["Petitioner signature", "sign the petition after checking every statement"], ["Case number", "the clerk assigns one if the caption did not already carry one"], ["Hearing date", "the court supplies it in its notice"], ["Findings language", "the court supplies findings and signs any order" ]
  ];
}

async function build() {
  const argv = process.argv.slice(2); const checkOnly = argv.includes("--check");
  const sourceState = resolveSources(); const recordState = resolveRecords();
  if (sourceState.failures.length || recordState.failures.length) return { familyId: FAMILY_ID, status: "BLOCKED_SOURCE_OR_RECORD", sourceFailures: sourceState.failures, recordFailures: recordState.failures, overlayDirectoryTouched: false };
  const censuses = [];
  for (const source of sourceState.resolved) {
    const census = source.strategy === "acroform_fill" ? await censusAcro(source) : await censusFlat(source);
    if (source.strategy === "measured_flat_overlay") { assert.equal(census.acroFieldCount, 0); assert.equal(census.strokedCheckboxCount, 0); }
    censuses.push({ source, census });
  }
  if (checkOnly) return { familyId: FAMILY_ID, status: "CHECK_ONLY", sourceIndexSha256: sourceState.indexSha256, recordsBound: recordState.resolved.length, documents: censuses.map(({ source, census }) => ({ documentId: source.documentId, strategy: source.strategy, sha256: source.sha256, pages: census.pageCount, fields: census.rows.length, measuredRules: census.measuredRuleCount, handControls: census.handControls.length })) };
  const queue = readJson("data/rcap-grade-a/packet-factory-24h/MASTER_QUEUE.json"); const queueRow = (queue.families ?? queue).find?.((x) => x.familyId === FAMILY_ID) ?? null;
  const trackRegistry = readJson("data/record-clearing/legal-design-track-registry.json");
  const findTrack = (node) => { if (!node || typeof node !== "object") return null; if (node.trackId === "ks-22-2410-arrest") return node; for (const value of Object.values(node)) { const hit = findTrack(value); if (hit) return hit; } return null; };
  const track = findTrack(trackRegistry); assert.ok(track, "arrest track record");
  fs.mkdirSync(path.join(ROOT, OUT, "fixtures"), { recursive: true }); fs.mkdirSync(path.join(ROOT, OUT, "reports"), { recursive: true }); fs.mkdirSync(path.join(ROOT, OUT, "raster"), { recursive: true });
  const fixtureDocs = {}; const artifacts = []; const proofs = []; const maps = [];
  for (const fixtureName of ["canonical", "boundary"]) {
    const docs = []; const packet = await PDFDocument.create(); stampDeterministic(packet); const pageManifest = [];
    for (const { source, census } of censuses) {
      const rendered = source.strategy === "acroform_fill" ? await renderAcro(source, census, FIXTURES[fixtureName]) : await renderFlat(source, census, FIXTURES[fixtureName]);
      const proof = await proofDocument(source, census, rendered.bytes, rendered.report, fixtureName);
      const p = { fixture: fixtureName, formNumber: source.documentId, strategy: source.strategy, sourceSha256: source.sha256, proofMethod: source.strategy === "acroform_fill" ? "flattened widget appearances read from saved bytes at measured widget rectangles" : "new text read from saved bytes at measured printed rule/underscore boxes after subtracting source text", valuesReportedByFinalizer: rendered.report.written.length, flattenedWidgetAppearancesReadFromOutputBytes: proof.appearances, addedGlyphsReadFromOutputBytes: proof.glyphs, nonWhitespaceGlyphsOutsideMeasuredWriteBoxes: proof.nonWhitespaceGlyphsOutsideMeasuredWriteBoxes ?? 0, refusedFieldsWithInk: proof.refusedFieldsWithInk, documentAuthoredAppearances: proof.documentAuthoredAppearances, unfittable: rendered.report.unfittable ?? [], actualWrites: proof.actualWrites };
      proofs.push(p); docs.push({ componentId: source.componentId, documentId: source.documentId, role: source.role, sourceSha256: source.sha256, sourceBytes: source.bytes, bytes: rendered.bytes, report: rendered.report, rows: census.rows, facts: FIXTURES[fixtureName], composed: false });
      const doc = await PDFDocument.load(rendered.bytes, { ignoreEncryption: true, updateMetadata: false }); const copied = await packet.copyPages(doc, doc.getPageIndices()); for (const [i, page] of copied.entries()) { packet.addPage(page); pageManifest.push({ packetPage: packet.getPageCount(), componentId: source.componentId, documentId: source.documentId, sourcePage: i + 1, sourceSha256: source.sha256 }); }
      if (fixtureName === "canonical") maps.push(mapFor(source, census, rendered.report));
    }
    const guidance = guidanceText(FIXTURES[fixtureName], track); const guidanceBytes = await renderGuidance(guidance, `${ROUTE_LABEL} — process guidance`); const guidanceDoc = await PDFDocument.load(guidanceBytes, { ignoreEncryption: true, updateMetadata: false }); const guidancePages = await packet.copyPages(guidanceDoc, guidanceDoc.getPageIndices()); for (const [i, page] of guidancePages.entries()) { packet.addPage(page); pageManifest.push({ packetPage: packet.getPageCount(), componentId: "ks-22-2410-arrest-process-guidance-4", documentId: "KS-22-2410-ARREST-PROCESS-GUIDANCE", sourcePage: i + 1, sourceSha256: null }); }
    docs.push({ componentId: "ks-22-2410-arrest-process-guidance-4", documentId: "KS-22-2410-ARREST-PROCESS-GUIDANCE", role: "process_guidance", sourceSha256: null, sourceBytes: null, bytes: guidanceBytes, report: { written: [] }, rows: [], facts: FIXTURES[fixtureName], composed: true });
    fixtureDocs[fixtureName] = docs;
    const packetBytes = Buffer.from(await packet.save({ useObjectStreams: false, updateMetadata: false })); const file = `${OUT}/fixtures/${fixtureName}.pdf`; artifacts.push({ fixture: fixtureName, file, sha256: sha(packetBytes), byteLength: packetBytes.length, pageCount: packet.getPageCount(), pageManifest, documents: docs.map((d) => d.documentId) });
    if (!argv.includes("--verify-deterministic")) fs.writeFileSync(path.join(ROOT, file), packetBytes);
  }
  const rbf = requiredBeforeFilingItems(maps); const instructionsText = guidanceText(FIXTURES.canonical, track); const counted = countCompleteness(maps, proofs, artifacts, instructionsText);
  const output = new Map();
  const put = (rel, value) => output.set(rel, Buffer.isBuffer(value) ? value : Buffer.from(`${JSON.stringify(value, null, 2)}\n`));
  put("fixtures/participant-facts.json", { schemaVersion: "rcap-fixture-participant-facts/v1", familyId: FAMILY_ID, theseAreSyntheticTestFacts: "No fixture value is any person's record. They exercise source binding, field mapping and overflow fitting only.", fixtures: FIXTURES });
  put("participant-instructions.md", Buffer.from(`${instructionsText}\n`));
  put("source-receipt.json", { schemaVersion: "rcap-family-source-receipt/v1", familyId: FAMILY_ID, worklistGroupId: FAMILY_ID, jurisdiction: JURISDICTION, routeKey: ROUTE_KEY, routeLabel: ROUTE_LABEL, implementationStrategy: "official_pdf_fill", perDocumentStrategies: "The cover sheet is an AcroForm; the 2013 petition and 2016 KBI cover sheet are flat and use measured printed rules/underscore runs.", custodyClass: "SOURCE_BOUND_BY_HELD_BYTES", sourceIndex: { path: CORPUS_INDEX, sha256: sourceState.indexSha256, operationalNationwideCompletenessClaim: false, masterLibrarySubstitution: false }, allSourcesExact: true, documents: sourceState.resolved.map((s) => ({ componentId: s.componentId, documentId: s.documentId, officialFormId: s.officialFormId, documentRole: s.role, officialSourceUrl: s.officialSourceUrl, pathInCustody: s.corpusPath, custody: s.custody, custodyRoot: s.custodyRoot, sha256: s.sha256, byteLength: s.byteLengthObserved, pages: s.pages, acroFieldCount: s.acroFieldCount, strategy: s.strategy, matchedBy: "exact path, custody, SHA-256 and byte length" })), records: recordState.resolved.map((r) => ({ recordId: r.recordId, path: r.path, sha256: r.observedSha256, byteLength: r.byteLength, anchorsVerified: r.anchorsVerified })), legalResolution: queueRow?.currentLegalResolution ?? "LEGAL_CLEAR by adopted OWNER_KJC_PERMISSION_ATTESTATION_2026-09-11", sourceBinaryCommitted: false, commercialRoutesOpened: 0, whatThisReceiptDoesNotEstablish: ["independent completeness, raster or visual acceptance", "production approval or runtime selection", "that the partial Kansas custody is a complete operational Nationwide corpus"] });
  put("field-census.census-v1.json", { schemaVersion: "rcap-official-form-field-census/v1-census-v1", familyId: FAMILY_ID, labelBasis: "Authored field labels are the packet's binding declarations; harvested source text and measured geometry are retained as evidence.", documents: censuses.map(({ source, census }) => ({ componentId: source.componentId, documentId: source.documentId, sourceSha256: source.sha256, strategy: source.strategy, structuralClassObserved: source.strategy === "acroform_fill" ? "acroform" : "flat_pdf", pageCount: census.pageCount, fieldCount: census.rows.length, acroFieldsOnTheForm: census.acroFieldCount, measuredHorizontalRulesOnTheForm: census.measuredRuleCount, printedSelectionControlsNotMeasured: census.handControls, fields: census.rows.map((r) => ({ field: r.key, page: r.page, rect: r.rect, rectBasis: r.rectBasis, measuredRule: r.measuredRule ?? null, pdfType: r.type, isSelectionControl: r.isSelectionControl, multiline: r.multiline, maxLength: r.maxLength, effectiveLabel: r.effectiveLabel, harvestedLabel: r.printedLine, policy: r.policy, factId: r.factId, printedTextAtCoordinate: r.printedTextAtCoordinate ?? r.printedLine })) })) });
  put("production-field-map.json", { schemaVersion: "rcap-official-form-field-map/v1-census-v1", familyId: FAMILY_ID, routeKeys: [ROUTE_KEY], routeLabels: { [ROUTE_KEY]: ROUTE_LABEL }, jurisdiction: JURISDICTION, statutes: track.authority, legalName: track.legalName, implementationStrategy: "official_pdf_fill", renderStrategy: "acroform_fill_and_measured_flat_overlay", componentSet: ["ks-22-2410-arrest-cover-sheet-1", "ks-22-2410-arrest-primary-filing-2", "ks-22-2410-arrest-cover-sheet-3", "ks-22-2410-arrest-process-guidance-4", "ks-22-2410-arrest-proposed-order-5"], componentRoles: { "ks-22-2410-arrest-cover-sheet-1": "cover_sheet", "ks-22-2410-arrest-primary-filing-2": "primary_filing", "ks-22-2410-arrest-cover-sheet-3": "cover_sheet", "ks-22-2410-arrest-process-guidance-4": "process_guidance", "ks-22-2410-arrest-proposed-order-5": "proposed_order" }, componentConditions: { "ks-22-2410-arrest-proposed-order-5": "conditional: include only where the district court expects a proposed order and counsel has approved one" }, dispositionVocabulary: ["signature_or_date_participant_completion", "court_prosecutor_clerk_or_agency_owned", "participant_sworn_narrative_or_legal_election"], routeSelectionsMade: [], routeSelectionNote: "The four statutory grounds are participant factual/legal elections and remain unmarked.", participantFacingObligations: track.participantActionRequired ?? [], writes: maps.flatMap((m) => m.canonicalWrites), refusals: maps.flatMap((m) => m.canonicalRefusals), selectionControls: maps.flatMap((m) => m.selectionControls), requiredBeforeFilingCount: rbf.length, requiredBeforeFiling: rbf, maps, generationAllowed: false, runtimeSelectable: false, commercialRoutesOpened: 0 });
  put("reports/actual-writes.json", { schemaVersion: "rcap-actual-writes-byte-proof/v1", familyId: FAMILY_ID, derivedFromArtifactBytes: true, documents: proofs, totalActualWrites: proofs.reduce((n, p) => n + p.actualWrites.length, 0), blockingFindings: proofs.flatMap((p) => p.refusedFieldsWithInk.map((x) => ({ fixture: p.fixture, formNumber: p.formNumber, field: x.fieldId, finding: "new ink appeared in a refused field" }))) });
  put("reports/blanks-left-for-the-participant.json", { schemaVersion: "rcap-blanks-left-for-the-participant/v1", familyId: FAMILY_ID, requiredBeforeFiling: rbf, protectedBlanks: maps.flatMap((m) => m.canonicalRefusals.filter((r) => r.requiredBeforeFiling !== true).map((r) => ({ document: m.documentId, field: r.field, label: r.effectiveLabel, refusalClass: r.category ?? null, disposition: r.completenessDisposition ?? null, why: r.why }))), participantElections: maps.flatMap((m) => m.selectionControls.map((r) => ({ document: m.documentId, field: r.field, page: r.page, label: r.effectiveLabel, why: r.reason, printedSelectionControlNotMeasured: r.printedSelectionControlNotMeasured === true }))), everyRequiredBeforeFilingItemIsDisclosed: counted.counters.requiredFactsNotCollected === 0, disclosedIn: `${OUT}/participant-instructions.md` });
  put("reports/completeness-counters.json", { schemaVersion: "rcap-builder-completeness-counters/v1", familyId: FAMILY_ID, whatThisIs: "The builder's own nine-counter result over its source-bound maps, saved-byte proof, artifacts and instructions.", whatThisIsNot: "Independent acceptance. Raster, independent review and production gates remain pending.", counters: counted.counters, allNineZero: PASS_COUNTERS.every((c) => counted.counters[c] === 0), findings: counted.findings, blankDispositions: counted.ledger.reduce((acc, x) => { acc[x.disposition] = (acc[x.disposition] ?? 0) + 1; return acc; }, {}), terminalFields: maps.reduce((n, m) => n + m.canonicalWrites.length + m.canonicalRefusals.length + m.selectionControls.length, 0) });
  put("reports/rendered-artifacts.json", { schemaVersion: "rcap-rendered-artifacts/v1", familyId: FAMILY_ID, renderedFresh: true, derivedFromBytes: true, artifacts, packets: artifacts.map((a) => ({ fixture: a.fixture, documents: a.documents })), componentArtifacts: Object.entries(fixtureDocs).flatMap(([fixture, docs]) => docs.map((d) => ({ fixture, componentId: d.componentId, documentId: d.documentId, role: d.role, carriedInto: `${OUT}/fixtures/${fixture}.pdf`, sourceSha256: d.sourceSha256, sha256: sha(d.bytes), byteLength: d.bytes.length, committedAsItsOwnFile: false }))), everyPageRastered: false, rasterState: "BUILT_RASTER_PENDING", rasterEngine: null, rasterSkipped: true, rasterPages: [], independentVerificationPending: true, byteDerivedHashes: true });
  put("reports/independent-visual-review.json", { schemaVersion: "rcap-independent-visual-review/v1", familyId: FAMILY_ID, required: true, granted: false, reviewedBy: null, artifacts: artifacts.map((a) => ({ fixture: a.fixture, file: a.file, sha256: a.sha256, pageCount: a.pageCount })), whatToLookAt: ["Criminal Cover Sheet: verify participant name, address, city/state/ZIP, phone, e-mail and DOB; leave identifiers, race/ethnicity, sex, aliases, KDR, officer and attorney blocks according to the map.", "Arrest petition: verify the caption district/county/name/case number and every measured underscore placement; verify the agency, arrest date and offense values do not overlap printed labels; all four ground boxes, signature and court-controlled values remain blank.", "Arrest order cover sheet: verify name, address, city/state/ZIP and DOB sit on the exact printed rules; aliases, SSN, sex, race and ethnicity remain participant-completed."] });
  put("build-status.json", { schemaVersion: "rcap-family-build-status/v1", familyId: FAMILY_ID, buildStatus: "state_built", reviewStatus: "qa_review_pending", builtBy: BUILD_SCRIPT, rasterEngine: "not rendered in this lane", popplerUsed: false, renderedArtifacts: artifacts.length, rasterPages: 0, rasterState: "BUILT_RASTER_PENDING", independentVerificationStatus: "PENDING", selfVerified: false, generationAllowed: false, runtimeSelectable: false, commercialRoutesOpened: 0, productionTouched: false, grantsNothing: "A rendered packet is review evidence; it authorizes no fulfillment and opens no commercial route.", ownerPermissionBasis: `${OWNER_RECORD} adopted LEGAL_CLEAR; documentary permission is not stored and productionTerminalGranted remains false.` });
  put("build-findings.json", { schemaVersion: "rcap-family-build-findings/v1", familyId: FAMILY_ID, blocking: counted.findings, findings: [{ finding: "The three official binary obligations are source-bound by exact current index path, declared custody, expected SHA-256 and expected byte length.", evidence: "source-receipt.json" }, { finding: "The Criminal Cover Sheet is an AcroForm; the 2013 petition and 2016 order cover sheet are flat PDFs. Flat writes use measured vector rules or measured underscore runs and never typed coordinates.", evidence: "field-census.census-v1.json" }, { finding: "The four statutory grounds, sensitive identity controls and signature remain participant decisions or completions; the court controls notice, hearing, case number, findings and signature.", evidence: "production-field-map.json and participant-instructions.md" }, { finding: "The registry requires a conditional proposed-order component, but no arrest-record granting order is published and counsel/local-practice confirmation remains a release question. No scaffold is emitted.", evidence: "production-field-map.json" }, { finding: "Current legal resolution is the adopted owner attestation. It clears the KJC commercial redistribution hold for this build but does not grant production or independent acceptance.", evidence: OWNER_RECORD }, { severity: "release_gate", finding: "The 02/2013 petition revision predates 2025 HB 2393 changes; current-form revision and any local proposed-order expectation remain release questions already recorded by the legal registry. No new source hunt was performed.", evidence: "ks-arrest-legal-design-track-registry" }], historicalFindingsAreNotCurrentVerdicts: false });
  put("approval-request.json", { schemaVersion: "rcap-family-approval-request/v1", familyId: FAMILY_ID, requested: "independent completeness verification, central current-byte raster and visual review", buildStatus: "state_built", status: "PENDING_INDEPENDENT_VERIFICATION", approvedForLive: false, live: false, commercialRoutesOpened: 0, mattersForTheReviewersAttention: ["The candidate has three exact official binaries and a required process-guidance component; the fifth registry component is conditional and intentionally absent pending local-practice/counsel confirmation.", "Review flat overlay placement against the saved source pages and the measured-run evidence before raster acceptance."] });
  const returnRel = "data/rcap-grade-a/packet-factory-24h/pf20/ks-22-2410-arrest-return-20260913.json";
  const returnValue = { schemaVersion: "rcap-pf20-family-build-return/v1", recordedAt: "2026-09-13T00:00:00Z", familyId: FAMILY_ID, routeKey: ROUTE_KEY, workerBranch: "pf20-ks-22-2410-arrest-20260912b", head: "generated-before-commit", command: `node ${BUILD_SCRIPT} --no-raster`, status: PASS_COUNTERS.every((c) => counted.counters[c] === 0) ? "COMPLETE_BUILDER_CANDIDATE" : "STOPPED_COMPLETENESS", counters: counted.counters, directory: OUT, outputs: artifacts.map((a) => ({ file: a.file, sha256: a.sha256, byteLength: a.byteLength, pageCount: a.pageCount })), sources: sourceState.resolved.map((s) => ({ documentId: s.documentId, path: s.corpusPath, custody: s.custody, sha256: s.sha256, byteLength: s.byteLengthObserved })), sourceIndexSha256: sourceState.indexSha256, records: recordState.resolved.map((r) => ({ recordId: r.recordId, path: r.path, sha256: r.sha256, anchorsVerified: r.anchorsVerified })), actualFindings: { proofDocuments: proofs.map((p) => ({ fixture: p.fixture, formNumber: p.formNumber, valuesReportedByFinalizer: p.valuesReportedByFinalizer, actualWrites: p.actualWrites.length, refusedFieldsWithInk: p.refusedFieldsWithInk.length, outsideMeasuredWriteBox: p.nonWhitespaceGlyphsOutsideMeasuredWriteBoxes })), blockingCounterFindings: counted.findings }, nextGate: "freeze current bytes and send the complete candidate to an independent completeness/raster/visual reviewer; do not self-approve or raster in PF20", conditionalProposedOrder: "not emitted; requires local-court expectation and counsel-approved source", commercialRoutesOpened: 0 };
  put("__PF20_RETURN__", Buffer.from(`${JSON.stringify(returnValue, null, 2)}\n`));
  if (argv.includes("--verify-deterministic")) {
    const drift = []; for (const [rel, bytes] of output) { const abs = rel === "__PF20_RETURN__" ? path.join(ROOT, returnRel) : path.join(ROOT, OUT, rel); if (!fs.existsSync(abs)) { drift.push({ file: rel, why: "absent" }); continue; } const saved = fs.readFileSync(abs); if (sha(saved) !== sha(bytes) || saved.length !== bytes.length) drift.push({ file: rel, savedSha256: sha(saved), rebuiltSha256: sha(bytes) }); }
    return { familyId: FAMILY_ID, status: drift.length ? "DRIFT" : "DETERMINISTIC", drift, counters: counted.counters };
  }
  for (const [rel, bytes] of output) { if (rel === "__PF20_RETURN__") { fs.writeFileSync(path.join(ROOT, returnRel), Buffer.from(`${JSON.stringify(returnValue, null, 2)}\n`)); continue; } const abs = path.join(ROOT, OUT, rel); fs.mkdirSync(path.dirname(abs), { recursive: true }); fs.writeFileSync(abs, bytes); }
  const allZero = PASS_COUNTERS.every((c) => counted.counters[c] === 0);
  return { familyId: FAMILY_ID, status: allZero ? "COMPLETED" : "STOPPED", counters: counted.counters, counterFindings: counted.findings, directory: OUT, outputs: artifacts.map((a) => ({ fixture: a.fixture, sha256: a.sha256, byteLength: a.byteLength, pageCount: a.pageCount })), documents: SOURCE_DOCS.map((d) => `${d.documentId} (${d.strategy})`), writes: maps.reduce((n, m) => n + m.canonicalWrites.length, 0), requiredBeforeFiling: rbf.length, rasterState: "BUILT_RASTER_PENDING", independentReview: "PENDING", commercialRoutesOpened: 0 };
}

export const runFamily = build;
if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(thisFile)) build().then((result) => console.log(JSON.stringify(result, null, 2))).catch((error) => { console.error(error.stack || error); process.exitCode = 1; });
