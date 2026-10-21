import assert from "node:assert/strict";
import crypto from "node:crypto";
import { createRequire } from "node:module";

import { finalizeFlatOverlay, isoDateInPrintedOrder }
  from "../rcap-official-forms/rcap-official-form-finalize.mjs";
import { extractTextItems } from "../rcap-official-forms/rcap-pdf-anchor-capture.mjs";

const require = createRequire(import.meta.url);
const { PDFDocument, StandardFonts } = require("pdf-lib");

export const IN_SECTION1_SOURCE_SHA = Object.freeze({
  packet: "b04f2941c91f903e8b8a1718ff4f9bd9120f3744c97354fd810c296f89d041c5",
  inserts: "65500e2cf0916fddbe20afc0e12906c03c7e10aefd148de71b48bc9782f04707"
});

const roman = ["I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X", "XI", "XII"];
const participantPages = Object.freeze({ packet: new Set([1, 2, 3, 5, 6, 7, 8, 9, 13]), inserts: new Set([1, 2, 4]) });
const forbiddenInsertPages = new Set([3]);

const PACKET_OCCURRENCE_FIELDS = Object.freeze([
  "cap-PetitionerFullName", "cap-COUNTY", "DD-cap-CourtType", "Address", "PetDOB",
  "County", "PetitionerAliases", "LEA1", "LEA2", "LEA3",
  "County1", "County2", "County3", "County4", "County5", "County6",
  "RelatedCriminalCauseNumbers"
]);

const INSERT_OCCURRENCE_FIELDS = Object.freeze([
  "DD-ArrestOrSummons", "County", "ArrestDate", "DD-CountNumber",
  "cap-PetitionerFullName", "PetDOB", "CountyCityArrest",
  "DateChargesFiled", "DD-HowChargesFiled", "CauseNumber",
  "OffenseDescript-Ct1", "DD-LevelChoice-Ct1", "DD-ChargeLevel-Ct1",
  "DD-Misd/Felony-Ct1", "DateChargesDismissed", "Criminal Cause Number",
  "Date of Dismissal", "ChargeDisposition-Ct1"
]);

// The source widgets do not all place their visible answer rule at the bottom
// of the widget rectangle.  Drawing at rect.y therefore put ordinary capital
// letters through the source rule in 171 of the 340 independently swept
// current placements.  These are the exact source occurrences whose rule sits
// inside the old text band.  Each rule coordinate was measured from the pinned
// source/current-byte 240 dpi paper calibration and is keyed back to the source
// widget geometry, rather than to a participant value or a generated page.
//
// A clean underline below the glyphs is intentionally absent from this table.
// The two source identities above and the exact geometry match below prevent a
// profile from silently migrating to another revision or another occurrence.
export const IN_SECTION1_BASELINE_EVIDENCE_SHA256 =
  "ade49f9bb19a044fb105b60baf1070c9a053b9b164d238e8d7b01ea87525f16c";
// Follow-up review swept the whole rendered glyph height.  That wider check
// found the numeric DateChargesFiled value crossing a rule 4.73 points above
// the widget's lower edge; the earlier four-point search window could not see
// it.  Keep this second evidence binding separate so the original 340-row
// sweep remains immutable history.
export const IN_SECTION1_DATE_FULL_GLYPH_EVIDENCE_SHA256 =
  "09e9bc701521ed31c9026a34f484678f05158ff42320e379909bfd96875f2422";
export const IN_SECTION1_BASELINE_ABOVE_RULE = 2;
const SOURCE_RULE_BASELINES = Object.freeze([
  ["inserts", "ArrestDate", 1, 457.56, 727.93, 122.67, 12.99, 729.9],
  ["inserts", "ArrestDate", 4, 105.61, 304.58, 182.63, 15.34, 306.3],
  ["inserts", "CauseNumber", 1, 106.18, 576.05, 174.33, 15.06, 577.2],
  ["inserts", "County", 1, 221.88, 634.74, 146.05, 15.63, 636.3],
  ["inserts", "County", 1, 249.77, 726.87, 146.05, 15.63, 729.9],
  ["inserts", "County", 1, 405.28, 176.63, 146.05, 15.63, 180.0],
  ["inserts", "DateChargesFiled", 1, 85.5, 588.97, 178.68, 17.33, 593.7],
  ["inserts", "DD-ArrestOrSummons", 1, 139.03, 727.56, 93.26, 14.71, 729.6],
  ["inserts", "DD-ChargeLevel-Ct1", 4, 294.66, 265.07, 48.83, 11.68, 266.1],
  ["inserts", "DD-CountNumber", 1, 468.05, 750.21, 24.89, 13.55, 751.8],
  ["inserts", "DD-HowChargesFiled", 1, 342.14, 590.15, 198.16, 16.83, 593.7],
  ["inserts", "DD-Misd/Felony-Ct1", 1, 449.56, 537.93, 117.66, 12.27, 538.2],
  ["inserts", "DD-Misd/Felony-Ct1", 4, 355.26, 264.18, 78.54, 11.68, 265.2],
  ["inserts", "PetDOB", 4, 81.98, 606.41, 154.86, 11.94, 607.5],
  ["packet", "County", 5, 145.66, 622.25, 139.07, 11.59, 624.3],
  ["packet", "County3", 6, 358.04, 691.58, 137.88, 12.96, 693.3],
  ["packet", "County4", 6, 120.36, 587.97, 150.97, 12.96, 589.8],
  ["packet", "DD-cap-CourtType", 1, 404.08, 708.03, 105.02, 13.08, 709.2],
  ["packet", "DD-cap-CourtType", 3, 405.78, 733.65, 105.02, 13.08, 735.0],
  ["packet", "DD-cap-CourtType", 7, 403.57, 679.23, 105.02, 13.08, 680.4],
  ["packet", "DD-cap-CourtType", 9, 404.19, 707.35, 105.02, 13.08, 708.6],
  ["packet", "cap-COUNTY", 3, 106.6, 705.7, 108, 13.08, 707.1],
  ["packet", "cap-COUNTY", 3, 294.42, 733.08, 108, 13.08, 734.7],
  ["packet", "cap-COUNTY", 7, 293.4, 679.45, 108, 13.08, 680.1],
  ["packet", "cap-COUNTY", 9, 107.11, 679.28, 108, 13.08, 680.1],
  ["packet", "cap-COUNTY", 9, 292.95, 706.94, 108, 13.08, 707.7],
  ["packet", "cap-PetitionerFullName", 1, 168, 526.93, 196.99, 14.79, 528.3],
  ["packet", "cap-PetitionerFullName", 3, 37.85, 585.63, 208.95, 11.94, 587.1],
  ["packet", "cap-PetitionerFullName", 3, 191, 350.51, 248.8, 14.22, 352.5],
  ["packet", "cap-PetitionerFullName", 3, 200.39, 475.19, 232.29, 13.08, 476.7],
  ["packet", "cap-PetitionerFullName", 5, 326.49, 143.28, 238.55, 13.08, 143.4],
  ["packet", "cap-PetitionerFullName", 7, 36.22, 569.05, 209.52, 12.51, 569.7],
  ["packet", "cap-PetitionerFullName", 7, 332.89, 463.38, 187.88, 13.08, 464.7],
  ["packet", "cap-PetitionerFullName", 7, 406.39, 449.66, 161.12, 13.08, 450.9],
  ["packet", "cap-PetitionerFullName", 8, 196.94, 615.84, 342.16, 18.77, 615.9],
  ["packet", "cap-PetitionerFullName", 9, 35.86, 586.49, 210.65, 17.07, 587.7],
  ["packet", "cap-PetitionerFullName", 9, 124.73, 493.35, 182.19, 13.08, 493.5],
  ["packet", "cap-PetitionerFullName", 13, 51.47, 300.17, 210.65, 13.08, 301.2],
]);

const near = (a, b) => Math.abs(a - b) <= 0.02;

export function indianaSection1RuleSafePlacement(docKey, entry) {
  const box = entry.sourceRect;
  const profile = SOURCE_RULE_BASELINES.find(([document, fieldName, page, x, y, width, height]) =>
    document === docKey && fieldName === entry.sourceField && page === entry.page
    && near(x, box.x) && near(y, box.y) && near(width, box.width) && near(height, box.height));
  if (!profile) {
    return {
      sourceRect: box, writeBox: box, baselineY: box.y, baselineLift: 0,
      sourceRuleY: null, disposition: "clean_source_baseline_unchanged"
    };
  }
  const sourceRuleY = profile[7];
  const baselineY = Number((sourceRuleY + IN_SECTION1_BASELINE_ABOVE_RULE).toFixed(2));
  assert.ok(baselineY > box.y, `${entry.sourceField}: a colliding baseline must move above its source rule`);
  assert.ok(baselineY < box.y + box.height,
    `${entry.sourceField}: rule-safe baseline must remain inside the exact source widget rectangle`);
  return {
    sourceRect: box,
    // The finalizer draws at writeBox.y.  Width and fit height remain the exact
    // source widget's so this correction moves only the baseline; it does not
    // shrink, truncate, wrap or otherwise reinterpret the held value.
    writeBox: { ...box, y: baselineY },
    baselineY,
    baselineLift: Number((baselineY - box.y).toFixed(2)),
    sourceRuleY,
    disposition: "baseline_moved_above_measured_source_rule"
  };
}

export function indianaSection1OccurrenceManagedFields(docKey) {
  assert.ok(docKey === "packet" || docKey === "inserts", `unsupported Indiana document ${docKey}`);
  return [...(docKey === "packet" ? PACKET_OCCURRENCE_FIELDS : INSERT_OCCURRENCE_FIELDS)];
}

const normalized = (rect) => ({
  x: Math.min(rect.x, rect.x + rect.width),
  y: Math.min(rect.y, rect.y + rect.height),
  width: Math.abs(rect.width),
  height: Math.abs(rect.height)
});

const fullAddress = (facts) => [
  facts["participant.street_address"],
  facts["participant.city_state_zip"] ?? [facts["participant.city"], facts["participant.state"], facts["participant.zip"]].filter(Boolean).join(" ")
].filter(Boolean).join("\n");

const caseRows = (facts) => Array.isArray(facts["matter.charges"]) && facts["matter.charges"].length
  ? facts["matter.charges"] : [facts];

export function assertIndianaSection1Fixture(facts, trackId) {
  assert.equal(facts["fixture.synthetic"], true, "Indiana verification fixtures must identify themselves as synthetic");
  assert.equal(facts["participant.state"], "IN", "Indiana fixture address must use Indiana, not the corpus XX placeholder");
  assert.match(String(facts["matter.court"] ?? ""), /(?:Circuit|Superior) Court$/,
    "Indiana fixture must name a circuit or superior court type");
  const rows = caseRows(facts);
  assert.ok(rows.length > 0, "at least one in-scope arrest/case group is required");
  for (const row of rows) {
    assert.match(String(row.arrest_date ?? ""), /^\d{4}-\d{2}-\d{2}$/, "each case needs an arrest date");
    assert.ok(row.arrest_city, "each synthetic case needs an explicit arrest city for Exhibit A");
    assert.ok(row.disposition, "each case needs an explicit disposition");
    assert.equal(row.conviction_date ?? null, null, "a Section 1 nonconviction fixture must not carry a conviction date");
    if (trackId === "in_arrest_no_charges") {
      assert.equal(row.disposition, "arrested_no_charges_filed");
      assert.ok(row.arrest_date > "2022-06-30", "the specialized no-charge route is limited to arrests after June 30, 2022");
      assert.equal(row.case_number ?? null, null, "a never-charged record must not invent a criminal cause number");
      assert.equal(row.charge ?? null, null, "a never-charged record must not invent a filed charge");
    } else {
      assert.equal(row.disposition, "all_charges_dismissed_before_trial");
      assert.ok(row.case_number && row.charge && row.disposition_date && row.charges_filed_date,
        "a dismissed-charge fixture needs its cause, charge, filing date and dismissal date");
    }
  }
  return true;
}

export function enrichIndianaSection1Fixture(facts, trackId) {
  assertIndianaSection1Fixture(facts, trackId);
  const rows = caseRows(facts);
  const causeNumbers = rows.map((r) => r.case_number).filter(Boolean).sort().reverse();
  return {
    ...facts,
    "participant.full_mailing_address": fullAddress(facts),
    "matter.related_criminal_cause_numbers": causeNumbers.join("\n"),
    "matter.case_group_count": rows.length,
    "matter.latest_route_date": rows.map((r) => r.disposition_date ?? r.arrest_date).sort().at(-1),
    "matter.charges": rows
  };
}

export function factsForIndianaInsertCase(facts, caseIndex) {
  const row = caseRows(facts)[caseIndex];
  assert.ok(row, `missing Indiana insert case group ${caseIndex + 1}`);
  return {
    ...facts,
    "matter.case_number": row.case_number ?? null,
    "matter.charge": row.charge ?? null,
    "matter.arrest_date": row.arrest_date,
    "matter.arrest_city": row.arrest_city,
    "matter.offense_date": row.offense_date ?? row.arrest_date,
    "matter.disposition_date": row.disposition_date ?? null,
    "matter.charges_filed_date": row.charges_filed_date ?? null,
    "matter.disposition": row.disposition,
    "matter.charge_level_word": row.charge_level_word ?? null,
    "matter.charge_level": row.charge_level ?? null,
    "matter.misdemeanor_or_felony": row.misdemeanor_or_felony ?? null,
    "matter.prosecutor_declination_number": row.prosecutor_declination_number ?? null,
    "matter.count_label": roman[caseIndex] ?? String(caseIndex + 1),
    "matter.charges": [row]
  };
}

function field(census, name) {
  const found = census.fields.find((entry) => entry.name === name);
  assert.ok(found, `pinned Indiana source no longer carries ${name}`);
  return found;
}

const add = (anchors, census, fieldName, pages, factId, value, options = {}) => {
  if (value === undefined || value === null || String(value).trim() === "") return;
  const sourceField = field(census, fieldName);
  sourceField.widgets.forEach((widget, widgetIndex) => {
    if (!pages.has(widget.page)) return;
    anchors.push({
      sourceField: fieldName, sourceWidgetIndex: widgetIndex, page: widget.page,
      sourceRect: normalized(widget.rect), factId, value: String(value),
      fontSize: options.fontSize ?? 9, multiline: options.multiline === true,
      actor: options.actor ?? "PARTICIPANT_OR_NEUTRAL_FACT"
    });
  });
};

const addAddress = (anchors, census, facts) => {
  const sourceField = field(census, "Address");
  const lines = [facts["participant.street_address"], facts["participant.city_state_zip"]];
  sourceField.widgets.forEach((widget, widgetIndex) => {
    if (!participantPages.packet.has(widget.page)) return;
    const box = normalized(widget.rect);
    lines.forEach((value, lineIndex) => anchors.push({
      sourceField: "Address", sourceWidgetIndex: widgetIndex, page: widget.page,
      sourceRect: { x: box.x + 2, y: box.y + box.height - 13 - lineIndex * 13, width: box.width - 4, height: 12 },
      factId: lineIndex === 0 ? "participant.street_address" : "participant.city_state_zip",
      value, fontSize: 9, actor: "PARTICIPANT_CONTACT"
    }));
  });
};

const addRelatedCauses = (anchors, census, facts) => {
  const values = caseRows(facts).map((row) => row.case_number).filter(Boolean).sort().reverse();
  const sourceField = field(census, "RelatedCriminalCauseNumbers");
  sourceField.widgets.forEach((widget, widgetIndex) => {
    const box = normalized(widget.rect);
    values.forEach((value, lineIndex) => anchors.push({
      sourceField: "RelatedCriminalCauseNumbers", sourceWidgetIndex: widgetIndex, page: widget.page,
      sourceRect: { x: box.x + 2, y: box.y + box.height - 13 - lineIndex * 14, width: box.width - 4, height: 12 },
      factId: `matter.charges[${lineIndex}].case_number`, value, fontSize: 8,
      actor: "NEUTRAL_RECORD_IDENTIFIERS"
    }));
  });
};

const courtType = (court) => {
  const value = String(court ?? "").trim();
  if (/\bSuperior Court$/i.test(value)) return "SUPERIOR";
  if (/\bCircuit Court$/i.test(value)) return "CIRCUIT";
  assert.fail(`held Indiana court does not identify a supported circuit/superior type: ${value}`);
};

export function indianaSection1OccurrencePlan({ docKey, census, facts, trackId }) {
  assert.equal(census.fields.length, docKey === "packet" ? 68 : 77, "Indiana source field inventory drifted");
  const anchors = [];
  if (docKey === "packet") {
    add(anchors, census, "cap-PetitionerFullName", participantPages.packet,
      "participant.full_legal_name", facts["participant.full_legal_name"], { fontSize: 10 });
    add(anchors, census, "cap-COUNTY", participantPages.packet,
      "matter.county", facts["matter.county"], { fontSize: 10 });
    add(anchors, census, "DD-cap-CourtType", new Set([1, 3, 7, 9]),
      "matter.court_type", courtType(facts["matter.court"]), { fontSize: 9, actor: "NEUTRAL_COURT_IDENTITY" });
    addAddress(anchors, census, facts);
    // One source field spans four different actors. Only the petition's county
    // sheriff request (p5) and the local prosecutor/sheriff recipient captions
    // (p13) are the held matter county. The judicial decree (p12) and a
    // conditional transfer to another county's clerk (p14) stay untouched.
    add(anchors, census, "County", new Set([5, 13]),
      "matter.county", facts["matter.county"], { fontSize: 9, actor: "NEUTRAL_LOCAL_COUNTY_IDENTITY" });
    for (let i = 1; i <= 6; i++) add(anchors, census, `County${i}`, participantPages.packet,
      "matter.county", facts["matter.county"], { fontSize: 9, actor: "NEUTRAL_SERVICE_RECIPIENT_IDENTITY" });
    add(anchors, census, "PetDOB", new Set([3, 9]), "participant.date_of_birth",
      isoDateInPrintedOrder(facts["participant.date_of_birth"], "month_day_year"), { fontSize: 9, actor: "NEUTRAL_IDENTITY" });
    if (trackId === "in_section1_petition") addRelatedCauses(anchors, census, facts);
  } else {
    const p1 = new Set([1]);
    const p4 = new Set([4]);
    add(anchors, census, "DD-ArrestOrSummons", p1, "matter.record_type", "arrested");
    add(anchors, census, "County", p1, "matter.county", facts["matter.county"]);
    add(anchors, census, "ArrestDate", new Set([1, 4]), "matter.arrest_date",
      isoDateInPrintedOrder(facts["matter.arrest_date"], "month_day_year"));
    add(anchors, census, "DD-CountNumber", new Set([1, 4]), "matter.count_label", facts["matter.count_label"]);
    add(anchors, census, "cap-PetitionerFullName", p4, "participant.full_legal_name", facts["participant.full_legal_name"]);
    add(anchors, census, "PetDOB", p4, "participant.date_of_birth",
      isoDateInPrintedOrder(facts["participant.date_of_birth"], "month_day_year"));
    add(anchors, census, "CountyCityArrest", p4, "matter.arrest_city",
      `${facts["matter.arrest_city"]} / ${facts["matter.county"]} County`, { fontSize: 8 });
    if (trackId === "in_arrest_no_charges") {
      add(anchors, census, "ChargeDisposition-Ct1", p4, "matter.disposition", "No Charges Filed");
    } else {
      add(anchors, census, "DateChargesFiled", p1, "matter.charges_filed_date",
        isoDateInPrintedOrder(facts["matter.charges_filed_date"], "month_day_year"));
      add(anchors, census, "DD-HowChargesFiled", p1, "matter.charge_filing_type", "criminal charged as an adult", { fontSize: 8 });
      add(anchors, census, "CauseNumber", p1, "matter.case_number", facts["matter.case_number"]);
      add(anchors, census, "OffenseDescript-Ct1", new Set([1, 4]), "matter.charge", facts["matter.charge"], { fontSize: 7 });
      add(anchors, census, "DD-LevelChoice-Ct1", new Set([1, 4]), "matter.charge_level_word", facts["matter.charge_level_word"]);
      add(anchors, census, "DD-ChargeLevel-Ct1", new Set([1, 4]), "matter.charge_level", facts["matter.charge_level"]);
      add(anchors, census, "DD-Misd/Felony-Ct1", new Set([1, 4]), "matter.misdemeanor_or_felony", facts["matter.misdemeanor_or_felony"], { fontSize: 7 });
      add(anchors, census, "DateChargesDismissed", p1, "matter.disposition_date",
        isoDateInPrintedOrder(facts["matter.disposition_date"], "month_day_year"));
      add(anchors, census, "Criminal Cause Number", p4, "matter.case_number", facts["matter.case_number"]);
      add(anchors, census, "Date of Dismissal", p4, "matter.disposition_date",
        isoDateInPrintedOrder(facts["matter.disposition_date"], "month_day_year"));
      add(anchors, census, "ChargeDisposition-Ct1", p4, "matter.disposition", "Dismissed");
    }
  }
  for (const anchor of anchors) {
    assert.ok(participantPages[docKey].has(anchor.page), `${anchor.sourceField} targets an unapproved page ${anchor.page}`);
    if (docKey === "inserts") assert.equal(forbiddenInsertPages.has(anchor.page), false,
      `${anchor.sourceField} attempted to write the court FINDINGS page`);
    assert.ok(anchor.sourceRect.width > 0 && anchor.sourceRect.height > 0, `${anchor.sourceField} has invalid source geometry`);
  }
  return anchors;
}

export async function applyIndianaSection1OccurrencePlan({ bytes, docKey, census, facts, trackId, officialSourceSha256 }) {
  assert.equal(officialSourceSha256, IN_SECTION1_SOURCE_SHA[docKey],
    `${docKey}: occurrence repair may run only against the pinned official source identity`);
  const sourceHash = crypto.createHash("sha256").update(bytes).digest("hex");
  const plan = indianaSection1OccurrencePlan({ docKey, census, facts, trackId });
  const overlayFacts = {};
  const anchors = plan.map((entry, index) => {
    const key = `overlay.${index}`;
    overlayFacts[key] = entry.value;
    const placement = indianaSection1RuleSafePlacement(docKey, entry);
    return {
      label: `Full legal name held value ${index}`,
      page: entry.page,
      writeBox: placement.writeBox,
      factId: key,
      fontSize: entry.fontSize,
      standardFontFallback: StandardFonts.TimesRoman,
      occurrencePlacement: placement
    };
  });
  const rendered = await finalizeFlatOverlay({
    sourceBytes: bytes, expectedSha256: sourceHash, anchors, facts: overlayFacts,
    // The shared flat finalizer's explicit-mapping gate requires a canonical
    // participant fact before it will draw. The occurrence plan above is the
    // stricter authority here: it pins source identity, field identity, page
    // and rectangle and excludes every court Findings occurrence. The anchor's
    // own factId still resolves the exact transformed value from overlayFacts.
    explicitMappings: Object.fromEntries(anchors.map((a) => [a.label, "participant.full_legal_name"])),
    minFontSize: 6, title: "Indiana Section 1 participant and neutral facts"
  });
  assert.equal(rendered.report.written.length, plan.length,
    `every approved occurrence must render at the readable floor: ${JSON.stringify(rendered.report.refused)}`);
  const occurrenceWrites = plan.map((entry, index) => ({
    documentKey: docKey, field: entry.sourceField, sourceWidgetIndex: entry.sourceWidgetIndex, page: entry.page,
    rect: entry.sourceRect, factId: entry.factId, value: entry.value, actor: entry.actor,
    fontSize: rendered.report.written[index].fontSize, font: rendered.report.written[index].font,
    baselineY: anchors[index].occurrencePlacement.baselineY,
    baselineLift: anchors[index].occurrencePlacement.baselineLift,
    sourceRuleY: anchors[index].occurrencePlacement.sourceRuleY,
    baselineDisposition: anchors[index].occurrencePlacement.disposition,
    baselineEvidenceSha256: IN_SECTION1_BASELINE_EVIDENCE_SHA256,
    ...(entry.sourceField === "DateChargesFiled"
      ? { fullGlyphEvidenceSha256: IN_SECTION1_DATE_FULL_GLYPH_EVIDENCE_SHA256 } : {}),
    sourceSha256: officialSourceSha256, intermediateSha256: sourceHash
  }));
  return { bytes: rendered.bytes, occurrenceWrites, overlayReport: rendered.report };
}

export async function concatenateIndianaInsertSets(renderedSets) {
  assert.ok(renderedSets.length > 0, "at least one rendered insert set is required");
  if (renderedSets.length === 1) return renderedSets[0];
  const out = await PDFDocument.create();
  for (const bytes of renderedSets) {
    const source = await PDFDocument.load(bytes, { ignoreEncryption: true, updateMetadata: false });
    assert.equal(source.getPageCount(), 4, "each Indiana source insert set must remain four pages");
    const copied = await out.copyPages(source, [0, 1, 2, 3]);
    copied.forEach((page) => out.addPage(page));
  }
  out.setCreationDate(new Date("2026-09-12T00:00:00.000Z"));
  out.setModificationDate(new Date("2026-09-12T00:00:00.000Z"));
  return out.save({ useObjectStreams: false, updateMetadata: false });
}

const effectivePage = (write, docKey) => write.page + (docKey === "inserts" ? (write.caseIndex ?? 0) * 4 : 0);

export async function verifyIndianaOccurrenceWritesFromBytes({ bytes, docKey, occurrenceWrites }) {
  const pdf = await PDFDocument.load(bytes, { ignoreEncryption: true, updateMetadata: false });
  const pageItems = pdf.getPages().map((page) => extractTextItems(page));
  const rows = occurrenceWrites.map((write) => {
    const page = effectivePage(write, docKey);
    const box = normalized(write.rect);
    const matches = (pageItems[page - 1] ?? []).filter((item) =>
      String(item.text ?? "").trim() === String(write.value).trim()
      && item.x >= box.x - 2 && item.x <= box.x + box.width + 2
      && item.y >= box.y - 2 && item.y <= box.y + box.height + 2);
    return {
      ...write, page, localSourcePage: write.page,
      exactPositionedTextRuns: matches.length,
      readback: matches.map((item) => ({ text: item.text, x: item.x, y: item.y,
        width: item.width, size: item.size, baseFont: item.baseFont }))
    };
  });
  const missing = rows.filter((row) => row.exactPositionedTextRuns === 0);
  const duplicated = rows.filter((row) => row.exactPositionedTextRuns !== 1);
  const protectedPageWrites = rows.filter((row) =>
    docKey === "inserts" && ((row.page - 1) % 4) + 1 === 3);
  const unsafeRuleBaselines = rows.filter((row) => row.sourceRuleY !== null
    && !(row.baselineY >= row.sourceRuleY + IN_SECTION1_BASELINE_ABOVE_RULE - 0.01));
  const baselinesOutsideSourceRect = rows.filter((row) =>
    row.baselineY < row.rect.y - 0.01 || row.baselineY >= row.rect.y + row.rect.height);
  assert.deepEqual(missing, [], "every occurrence write must read back at its exact source rectangle");
  assert.deepEqual(duplicated, [], "each occurrence write must appear exactly once at its source rectangle");
  assert.deepEqual(protectedPageWrites, [], "the occurrence path may not write an insert FINDINGS page");
  assert.deepEqual(unsafeRuleBaselines, [], "each measured crossing must place its baseline above the source rule");
  assert.deepEqual(baselinesOutsideSourceRect, [], "each repaired baseline must remain in its exact source rectangle");
  return {
    derivedFromSavedBytes: true,
    documentSha256: crypto.createHash("sha256").update(bytes).digest("hex"),
    pageCount: pdf.getPageCount(), expectedWrites: rows.length, exactWritesRead: rows.length,
    missingWrites: 0, duplicateWrites: 0, protectedPageWrites: 0,
    unsafeRuleBaselines: 0, baselinesOutsideSourceRect: 0,
    sourceRuleSafeWrites: rows.filter((row) => row.sourceRuleY !== null).length,
    cleanBaselinesPreserved: rows.filter((row) => row.sourceRuleY === null).length,
    baselineEvidenceSha256: IN_SECTION1_BASELINE_EVIDENCE_SHA256,
    rows
  };
}

const setPolicy = (doc, names, policy) => {
  for (const name of names) doc.completeness.fields[name] = { ...(doc.completeness.fields[name] ?? {}), ...policy };
};

export function applyIndianaSection1CompletenessPolicy(doc, trackId) {
  if (doc.key === "packet") {
    // These names span participant, neutral and court occurrences. Their actor
    // boundary is defined below and by the exact occurrence plan, so the old
    // whole-field court-owned refusal must not survive in the production map.
    const occurrenceClassified = new Set(["County", "PetitionerAliases", "LEA1", "LEA2", "LEA3"]);
    doc.unwritable = doc.unwritable.filter(({ field }) => !occurrenceClassified.has(field));
    setPolicy(doc, ["Fax"], {
      requiredBeforeFiling: false, refusalClass: null,
      completenessDisposition: "OPTIONAL_PARTICIPANT_CONTENT",
      reason: "Optional participant-authored fax number; leave blank when the participant has no fax number."
    });
    setPolicy(doc, ["PetFullSSN"], {
      effectiveLabel: "Full Social Security Number on the Confidential Information Form"
    });
    setPolicy(doc, ["PetitionerAliases"], {
      requiredBeforeFiling: true, refusalClass: null,
      effectiveLabel: "Other names or aliases used (petition page 3)",
      reason: "On petition page 3, list every other name or alias used, or state none as the form permits. The same source field also reaches the proposed order's page 9 finding, which remains court-owned and blank."
    });
    for (const [field, label] of [["LEA1", "Additional record-holding agency 1 on petition page 5"],
      ["LEA2", "Additional record-holding agency 2 on petition page 5"],
      ["LEA3", "Additional record-holding agency 3 on petition page 5"]]) {
      setPolicy(doc, [field], {
        requiredBeforeFiling: true, refusalClass: null, effectiveLabel: label,
        reason: "On petition page 5, identify each applicable agency that holds records the requested order should address. Do not invent an agency. The same source field also reaches the proposed order on page 12, which remains court-owned and blank."
      });
    }
    doc.partialFills = [
      ...(doc.partialFills ?? []),
      {
        field: "County", writtenOccurrences: "petition page 5 and local prosecutor/sheriff captions on page 13",
        leftBlankOccurrences: "court decree on page 12 and conditional other-county clerk on page 14",
        reason: "The shared field has different printed actors. Only the exact local-county occurrences are neutral held facts."
      },
      {
        field: "PetitionerAliases", writtenOccurrences: "none; alias history is not held",
        leftBlankOccurrences: "participant alias question on page 3 and court finding on page 9",
        reason: "The participant completes the page 3 question; the court owns the page 9 finding."
      },
      ...["LEA1", "LEA2", "LEA3"].map((field) => ({
        field, writtenOccurrences: "none; record-holding agency identity is not held",
        leftBlankOccurrences: "participant agency request on page 5 and court directive on page 12",
        reason: "The participant completes an applicable page 5 agency line; the court owns the page 12 directive."
      }))
    ];
    return;
  }
  const offRoute = (names, condition) => setPolicy(doc, names, {
    requiredBeforeFiling: false, refusalClass: null,
    completenessDisposition: "NOT_APPLICABLE_ON_THIS_ROUTE",
    routeConditionThatMakesItInapplicable: condition, routeDetermined: false,
    reason: condition
  });
  const conditional = (names, label, condition) => setPolicy(doc, names, {
    requiredBeforeFiling: true, refusalClass: null, effectiveLabel: label,
    conditionDescription: condition, reason: `${label}. ${condition}`
  });

  conditional(["NameArrestingOfficer", "ArrestingAgency", "LEACaseNumber"],
    "Arresting officer, agency, and law-enforcement case number if known or available",
    "Complete only when the source-identified record fact is known or available; do not invent it.");
  conditional(["DescriptRelatedMatter", "ListRelatedMCCauseNumbers"],
    "Related miscellaneous-criminal matter details if one exists",
    "Complete only when an actual related miscellaneous-criminal matter exists.");
  conditional(["AliasNamesDOBsSSNs"], "Alias identity history if any",
    "Complete from the participant's actual alias history; do not assert none without an answer.");
  setPolicy(doc, ["AddressesSinceArrest"], {
    requiredBeforeFiling: true, refusalClass: null, effectiveLabel: "Addresses since arrest",
    reason: "The source requires the participant's address history since the arrest; the current address alone is not the full answer."
  });
  setPolicy(doc, ["PetFullSSN"], {
    requiredBeforeFiling: true, refusalClass: null,
    effectiveLabel: "Full Social Security Number on Exhibit A",
    reason: "The participant supplies the full Social Security Number only in Exhibit A's protected identification block; the platform does not hold it."
  });
  if (trackId === "in_arrest_no_charges") {
    conditional(["AssignedCaseNumber"], "Assigned prosecutor-declination number if one exists",
      "Complete only if the prosecutor formally declined charges and the record carries an assigned number.");
  }

  const unusedRows = [];
  for (let i = 2; i <= 7; i++) {
    unusedRows.push(`OffenseDescript-Ct${i}`, `OffenseDescript-Exhibit-Ct${i}`,
      `DD-LevelChoice-Ct${i}`, `DD-ChargeLevel-Ct${i}`, `DD-Misd/Felony-Ct${i}`, `ChargeDisposition-Ct${i}`);
  }
  offRoute(unusedRows,
    "Each generated insert set represents one criminal cause/arrest group with one synthetic count; unused count rows have no additional held count.");

  if (trackId === "in_arrest_no_charges") {
    offRoute(["Criminal Cause Number", "DateChargesFiled", "DD-HowChargesFiled", "CauseNumber",
      "OffenseDescript-Ct1", "DD-LevelChoice-Ct1", "DD-ChargeLevel-Ct1", "DD-Misd/Felony-Ct1",
      "DateAcquittal", "DD-TypeChargesFiled", "AppellateCauseNumber",
      "DateAppellateDecFinal", "Date of Dismissal", "Check Box17", "Check Box21", "Check Box23", "Check Box26"],
    "The exact route and fixture state that no criminal charge was filed, so charged, acquittal, dismissal and appellate-vacatur branches are not reached.");
    setPolicy(doc, ["DateChargesDismissed"], {
      requiredBeforeFiling: true, refusalClass: null,
      effectiveLabel: "Date supporting the no-charge disposition statement",
      reason: "The source prints a date before the combined not-filed-or-dismissed statement; supply the date shown by the participant's actual record rather than inferring one."
    });
  } else {
    offRoute(["AssignedCaseNumber", "DateAcquittal", "DD-TypeChargesFiled", "AppellateCauseNumber",
      "DateAppellateDecFinal", "Check Box15", "Check Box21", "Check Box23", "Check Box26"],
    "The exact fixture selects charges filed and all charges dismissed before trial; prosecutor-declination, acquittal and appellate-vacatur alternatives are not reached.");
    setPolicy(doc, ["AssignedCaseNumber"], { effectiveLabel: "Unused prosecutor-declination assigned number" });
    setPolicy(doc, ["Check Box21"], { effectiveLabel: "Unused acquittal outcome selection" });
    setPolicy(doc, ["DateAcquittal"], { effectiveLabel: "Unused acquittal decision date" });
  }
}
