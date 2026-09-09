#!/usr/bin/env node
/**
 * Route-obligation census v1 — packet family `ky_protective_order_record_expungement-set`.
 *
 *   node scripts/build-census-v1-ky_protective_order_record_expungement-set.mjs [--check]
 *
 * Kentucky, expungement of the record of a protective-order case that was
 * dismissed without a full order having issued. Route
 * `obligation:track-only:KY:ky_protective_order_record_expungement`, authority
 * KRS 403.745 and KRS 456.070. One declared component, one held binary:
 *
 *   primary-filing-1   AOC-275.18 Rev. 1-16, Motion for Expungement of
 *                      Emergency/Temporary Order of Protection. One page,
 *                      sixteen AcroForm fields.
 *
 * This is the AcroForm path, not the flat-overlay path: every write box below
 * is the /Rect of the source's own widget and no coordinate is hand-entered.
 *
 * THE SOURCE WAS RECOVERED, NOT RE-ACQUIRED, AND IT IS RE-HASHED HERE
 *
 * This family was previously returned STOPPED / BLOCKED_SOURCE because the
 * bytes were not mounted in that container. They were recovered from the
 * existing authenticated custody on 2026-09-04 and mounted at the path the
 * committed corpus index already pinned. Nothing about the binding changed: the
 * digest this build requires is the digest the index has always recorded, and
 * this script re-hashes the bytes on every run rather than trusting the mount.
 *
 * THREE DECISIONS THAT SHAPED WHAT IS AND IS NOT WRITTEN.
 *
 * First, THE COUNTY CHOOSER SHIPS HOLDING A VALUE IT DOES NOT OFFER. The
 * `Case.County` dropdown lists 121 options — a blank and the 120 Kentucky
 * counties, spelled without the word "County" — and it arrives selected on the
 * string "000", which is not one of them. Delivered unchanged through a
 * flatten, a filed motion states its county as 000.
 *
 * The shared finalizer already suppresses a chooser that ships showing its own
 * prompt, but it decides that with `isChooserPrompt`, and "000" is not a prompt
 * by any of that function's tests — it is not punctuation, it does not begin
 * with choose/select/pick, and it is not the list's first option. Measured:
 * `isChooserPrompt("000", options)` returns false. So the shared suppression
 * does not reach this field, and the only thing that displaces "000" is this
 * build writing a real county over it.
 *
 * That is a thin guarantee to rest a filed document on, so it is not what this
 * build rests on. After both fixtures are produced, every choice field in the
 * delivered bytes is re-read and asserted to carry either nothing or one of its
 * own options. If the county were ever refused — an unheld county, a value
 * outside the list — the build stops rather than shipping 000 as ink.
 *
 * Second, THE PACKET HOLDS ONE PARTY AND THE FORM CAPTIONS TWO, AND THE RECORD
 * DOES NOT SAY WHICH ONE THE PARTICIPANT IS. AOC-275.18 captions PETITIONER
 * over `first pet`/`middle pet`/`last pet` and RESPONDENT over
 * `first res`/`middle res`/`last res`. Its item 3 speaks of "the respondent" in
 * the third person as a condition of the motion, which reads as though the
 * movant is the respondent; its item 1 speaks of "the petition in this case";
 * and the free-text `movant` field names neither.
 *
 * Nothing in this repository resolves it. The route census, the build worklist
 * and the canonical route universe all record the authority as "KRS 403.745;
 * KRS 456.070" and none of them names the moving party; the compiled Kentucky
 * profile does not carry this route at all; the Kentucky state pack is a stub.
 * Writing the participant's name into the wrong block of a protective-order
 * caption would name a person as the party they are not, on the record of a
 * domestic-violence or interpersonal-protection case.
 *
 * So all six name fields are carried to the participant, who copies the caption
 * from the case they are asking to have expunged. This costs less than it
 * looks: the caption names two parties and the platform holds one, so even a
 * resolved reading would leave three of the six blank. The `movant` field is
 * different and IS written — the form's own sentence is "The movant, ____,
 * seeks expungement", the movant is whoever files, and that is the participant
 * whichever side of the caption they sit on.
 *
 * WHICH PARTY THE PARTICIPANT IS ON THIS ROUTE IS AN OWNER DETERMINATION, and
 * it is recorded in build-findings.json so a reviewer can answer it rather than
 * discover it.
 *
 * Third, THE THREE NUMBERED BOXES ARE SWORN ALLEGATIONS AND THIS BUILD MAKES
 * NONE OF THEM. Items 1, 2 and 3 sit above the movant's signature and allege
 * that the petition did not result in a full order, that six months have
 * elapsed since dismissal, and that the respondent has not been bound by an
 * order of protection during those six months. The first two restate the
 * route's own eligibility conditions and the third is a fact about the
 * participant's protective-order history that the platform does not hold and
 * does not ask for. All three are sworn statements of fact about a particular
 * case; screening establishes eligibility, and a signature establishes an
 * allegation. This build marks no box and the participant instructions carry
 * all three by their printed words.
 *
 * MEASURED HERE SO THE NEXT LANE DOES NOT RE-SURVEY
 *
 *   - The form's lower half carries NO WIDGETS AT ALL. The signature line, the
 *     date line, the three address-and-telephone rules and the whole
 *     NOTIFICATION OF EXPUNGEMENT HEARING block — hearing date, hour, a.m./p.m.,
 *     court, District/Circuit, the clerk's dated signature and the deputy line —
 *     are printed rules with no AcroForm field behind them. They are not
 *     terminal fields and are not counted as such; they are disclosed by name in
 *     participant-instructions.md, and the clerk's block is disclosed as the
 *     clerk's.
 *   - `Print` and `Reset` are push buttons. They are chrome, they are suppressed
 *     before the flatten, and the delivered bytes are asserted to carry neither
 *     caption.
 */
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

import { finalizeOfficialForm } from "./rcap-official-forms/rcap-official-form-finalize.mjs";
import { flattenedWidgets } from "./rcap-official-forms/pdf-flattened-widgets.mjs";
import { extractTextItems, groupIntoLines, normalizeHarvestedText }
  from "./rcap-official-forms/rcap-pdf-anchor-capture.mjs";
import { makeCorpusEntryResolver } from "./lib/corpus-index-paths.mjs";

const thisFile = fileURLToPath(import.meta.url);
const ROOT = path.resolve(path.dirname(thisFile), "..");
process.chdir(ROOT);
const require = createRequire(import.meta.url);
const { PDFDocument, PDFTextField, PDFDropdown, PDFCheckBox, PDFButton } = require("pdf-lib");

const FAMILY_ID = "ky_protective_order_record_expungement-set";
const ROUTE_KEY = "obligation:track-only:KY:ky_protective_order_record_expungement";
const ROUTE_SELECTION_ID = "ky-aoc-275-18-protective-order-expungement";
const OUT = "data/rcap-all50/overlays/census-v1/ky/ky-protective-order-record-expungement-set--official-pdf-fill";
const BUILD_SCRIPT = "scripts/build-census-v1-ky_protective_order_record_expungement-set.mjs";
const CORPUS_INDEX = "data/rcap-all50/local-source-corpus-index.json";

const SOURCE = Object.freeze({
  sourceId: "official-form:AOC-275.18",
  formNumber: "AOC-275.18",
  revision: "Rev. 1-16",
  docCode: "EXPG",
  title: "Motion for Expungement of Emergency/Temporary Order of Protection",
  instrumentKind: "primary_filing",
  component: "component:ky_protective_order_record_expungement-primary-filing-1",
  path: "LegalEase Kentucky/source-acquisition-2026-09-04/275.18.pdf",
  sha256: "b3d8278a85a56c5ac81ed9fedaf9081f5e6f5141d0f561ed6aa6ff4103d2cb51"
});

/*
 * The canonical persona's county is a real Kentucky county, because
 * `Case.County` is a closed list of the 120 of them and a fixture county that
 * is not on the list would be refused — which would prove nothing about the
 * field and would leave the source's own "000" in place.
 */
const CANONICAL = {
  "participant.full_legal_name": "Jordan Avery Reyes",
  "participant.first_name": "Jordan",
  "participant.middle_name": "Avery",
  "participant.last_name": "Reyes",
  "matter.case_number": "24-D-00123-001",
  "matter.county": "Franklin"
};

const BOUNDARY = {
  ...CANONICAL,
  "participant.full_legal_name": "Alexandrina-Katharine Montgomery-Vandenberg-Oyelaran",
  "participant.first_name": "Alexandrina-Katharine",
  "participant.middle_name": "Montgomery-Vandenberg-Oyelaran",
  "participant.last_name": "Fitzwilliam III",
  "matter.case_number": "0123-45-2026-D-900123.00-AB-CDE/2201",
  // Kentucky's longest county name, so the chooser is exercised at its widest
  // real value rather than at an invented one.
  "matter.county": "Breckinridge"
};

const sha256 = (bytes) => crypto.createHash("sha256").update(bytes).digest("hex");
const round = (n) => Number(Number(n).toFixed(2));
const readJson = (rel) => JSON.parse(fs.readFileSync(path.join(ROOT, rel), "utf8"));
const absFor = (rel) => path.join(ROOT, rel);
const writeJson = (rel, value) => {
  fs.mkdirSync(path.dirname(absFor(rel)), { recursive: true });
  fs.writeFileSync(absFor(rel), `${JSON.stringify(value, null, 2)}\n`);
};
function fail(message, detail = null) {
  throw new Error(detail === null ? message : `${message}: ${detail}`);
}

// ---------------------------------------------------------------------------
// what each field is
// ---------------------------------------------------------------------------
const WRITE = (factId, effectiveLabel) => ({ writable: true, factId, effectiveLabel });
const SUPPLY = (effectiveLabel, what) => ({
  writable: false, approvedDisposition: "REQUIRED_BEFORE_FILING", requiredBeforeFiling: true,
  effectiveLabel, what
});
const ELECTION = (effectiveLabel, why) => ({
  writable: false, approvedDisposition: "PARTICIPANT_ELECTION_GENUINE", effectiveLabel,
  category: "participant_sworn_narrative_or_legal_election", reason: why
});
const CONTROL_CHROME = (effectiveLabel) => ({
  terminal: false, writable: false, approvedDisposition: "NOT_A_FIELD", effectiveLabel,
  reason: "a viewer push button, never a filing fact; suppressed before the flatten so its caption is not "
    + "stamped onto the filed page"
});

const CAPTION_PARTY_REASON =
  "AOC-275.18 captions two parties, PETITIONER and RESPONDENT, and the platform holds one person. Nothing in "
  + "the committed record for this route establishes which of the two blocks the participant occupies: the "
  + "route census, the build worklist and the canonical route universe all record the authority as KRS 403.745 "
  + "and KRS 456.070 and none of them names the moving party, the compiled Kentucky profile does not carry this "
  + "route, and the Kentucky state pack is a stub. Writing a name into the wrong block would name a person as "
  + "the party they are not on the record of a protective-order case, so both blocks are copied from your own "
  + "case papers.";

const FIELD_DECISIONS = Object.freeze({
  "Print": CONTROL_CHROME("Print push button"),
  "Reset": CONTROL_CHROME("Reset Form push button"),
  "Case  No": WRITE("matter.case_number", "Case No."),
  "Case.County": WRITE("matter.county", "County of the case"),
  "Court": SUPPLY("Court",
    "the court the protective-order petition was heard in, written as it appears on your case papers. The "
    + "form's own hearing block below offers District and Circuit"),
  "Division": SUPPLY("Division",
    "the division of that court, if your case papers show one"),
  "first pet": SUPPLY("Petitioner first name", `the PETITIONER's first name from your case caption. ${CAPTION_PARTY_REASON}`),
  "middle pet": SUPPLY("Petitioner middle name", "the PETITIONER's middle name from your case caption"),
  "last pet": SUPPLY("Petitioner last name", "the PETITIONER's last name from your case caption"),
  "first res": SUPPLY("Respondent first name", `the RESPONDENT's first name from your case caption. ${CAPTION_PARTY_REASON}`),
  "middle res": SUPPLY("Respondent middle name", "the RESPONDENT's middle name from your case caption"),
  "last res": SUPPLY("Respondent last name", "the RESPONDENT's last name from your case caption"),
  "movant": WRITE("participant.full_legal_name", "Movant"),
  "check pet did not result": ELECTION(
    "Item 1 sworn allegation — the petition did not result in a domestic violence or non-temporary interpersonal order",
    "item 1 alleges, above your signature, that the petition in this case did not result in the issuance of a "
      + "domestic violence or non-temporary interpersonal order. Screening tells you whether this route is open "
      + "to you; your signature tells the court this is true of your case. Check it only if it is."),
  "check six months": ELECTION(
    "Item 2 sworn allegation — six months have elapsed since the case was dismissed",
    "item 2 alleges that six months have elapsed since the case was dismissed. Count from the dismissal date "
      + "on your own case papers and check it only if six months have actually passed."),
  "check during six months": ELECTION(
    "Item 3 sworn allegation — the respondent has not been bound by an order of protection in those six months",
    "item 3 alleges that during those six months the respondent has not been bound by an order of protection "
      + "issued for the protection of any person. LegalEase does not hold your protective-order history and "
      + "does not ask for it, so only you can answer this.")
});

/*
 * The printed lines this form draws with no AcroForm field behind them.
 *
 * They are not terminal fields — there is no widget, so there is nothing to
 * fill and nothing this build could write without hand-entering a coordinate in
 * white space. They are disclosed by name so the participant is not handed a
 * page with unexplained blanks on it, and the clerk's block is disclosed as the
 * clerk's. The printed words are asserted against the document each run.
 */
const PRINTED_LINES_WITHOUT_WIDGETS = Object.freeze([
  { printed: "Date", who: "participant", note: "the date you sign, written on the printed Date line" },
  { printed: "Signature", who: "participant", note: "your signature" },
  { printed: "Address and Telephone Number of Movant", who: "participant",
    note: "your address and telephone number, on the three printed rules above that caption" },
  { printed: "NOTIFICATION OF EXPUNGEMENT HEARING", who: "clerk",
    note: "the hearing date, the hour, a.m. or p.m., the court and whether it is District or Circuit, and the "
      + "clerk's dated signature. The circuit court clerk completes this block after you file; the committed "
      + "route record says the clerk verifies the signature, applies the filed stamp and completes the "
      + "notification-of-hearing section on the face of the form" }
]);

// ---------------------------------------------------------------------------
// source
// ---------------------------------------------------------------------------
function corpusRoot() {
  return process.env.MASTER_LIBRARY_SOURCE_DIR
    ?? "private/source-imports/Expungement_AI_RCAP_Master_Library_Edition_1";
}

async function loadSource() {
  const index = readJson(CORPUS_INDEX);
  const resolver = makeCorpusEntryResolver(index, { repoRoot: ROOT, masterLibraryRoot: corpusRoot() });
  const entry = (index.entries ?? []).find((row) => row.path === SOURCE.path);
  if (!entry) fail("no committed corpus-index entry at the declared path", `${SOURCE.sourceId} ${SOURCE.path}`);
  if (entry.sha256 !== SOURCE.sha256) fail("the committed index pins a different binary", entry.sha256);
  const absolute = resolver.resolve(entry);
  if (!absolute || !fs.existsSync(absolute)) {
    fail("the custody holding this source is not mounted here", `${SOURCE.sourceId} ${SOURCE.path}`);
  }
  const bytes = fs.readFileSync(absolute);
  const digest = sha256(bytes);
  if (digest !== SOURCE.sha256) fail("SHA-256 drift against the declared digest", digest);
  if (entry.byteLength !== bytes.length) fail("byte length disagrees with the committed index", bytes.length);
  const pdf = await PDFDocument.load(bytes, { ignoreEncryption: true, updateMetadata: false });
  if (entry.pageCount !== pdf.getPageCount()) {
    fail("page count disagrees with the committed index", pdf.getPageCount());
  }
  return { bytes, byteLength: bytes.length, sha256: digest, indexEntry: entry, resolvedFrom: absolute, pdf };
}

/** Every AcroForm field of the source, with the geometry and the value it ships. */
function censusOf(pdf) {
  const form = pdf.getForm();
  const pageRefs = pdf.getPages().map((page) => page.ref);
  const rows = [];
  for (const field of form.getFields()) {
    const name = field.getName();
    const kind = field.constructor.name;
    const type = kind === "PDFTextField" ? "text"
      : kind === "PDFDropdown" ? "dropdown"
        : kind === "PDFCheckBox" ? "checkbox"
          : kind === "PDFButton" ? "pushbutton" : kind.toLowerCase();
    const widgets = field.acroField.getWidgets().map((widget) => {
      const rect = widget.getRectangle();
      return {
        page: pageRefs.findIndex((ref) => ref === widget.P()) + 1,
        rect: { x: round(rect.x), y: round(rect.y), width: round(rect.width), height: round(rect.height) },
        rectBasis: "acroform_widget_rectangle"
      };
    });
    let options = null;
    let shippedValue = null;
    try {
      if (field instanceof PDFDropdown) { options = field.getOptions(); shippedValue = (field.getSelected() ?? []).join("|") || null; }
      else if (field instanceof PDFTextField) shippedValue = field.getText() ?? null;
      else if (field instanceof PDFCheckBox) shippedValue = field.isChecked() ? "on" : null;
    } catch { /* a field whose value cannot be read ships nothing this build can clear */ }
    rows.push({
      name, type, widgets,
      maxLength: field instanceof PDFTextField ? (field.getMaxLength() ?? null) : null,
      optionCount: options ? options.length : null,
      options,
      shippedValue,
      shippedValueIsOneOfItsOwnOptions: options ? options.includes(shippedValue) : null
    });
  }
  return rows;
}

// ---------------------------------------------------------------------------
// build
// ---------------------------------------------------------------------------
async function renderFixture({ source, census, facts, fixture }) {
  const decisions = census.map((field) => ({ field, decision: FIELD_DECISIONS[field.name] ?? null }));
  const unknown = decisions.filter((row) => row.decision === null);
  if (unknown.length > 0) {
    fail("AcroForm fields this build's decision table does not reach",
      unknown.map((row) => row.field.name).join(", "));
  }

  const writable = decisions.filter((row) => row.decision.writable);
  const unwritableFields = decisions
    .filter((row) => !row.decision.writable && row.decision.terminal !== false)
    .map((row) => row.field.name);

  const { bytes, report } = await finalizeOfficialForm({
    sourceBytes: source.bytes,
    expectedSha256: source.sha256,
    census: census.map((field) => ({
      name: field.name, type: field.type, widgets: field.widgets, maxLength: field.maxLength,
      effectiveLabel: (FIELD_DECISIONS[field.name]?.effectiveLabel) ?? field.name
    })),
    facts,
    explicitMappings: Object.fromEntries(writable.map((row) => [row.field.name, row.decision.factId])),
    unwritableFields,
    documentTextLines: [],
    title: SOURCE.title
  });

  return { bytes, report, decisions, writable, unwritableFields };
}

/**
 * What the delivered bytes actually carry.
 *
 * Three things are read back rather than believed: the glyphs the artifact
 * gained, whether any of them fall outside a measured widget rectangle, and —
 * the one this form specifically needs — whether any choice field survived
 * holding a value it does not offer.
 */
async function readBack({ source, outputBytes, census, writable }) {
  const before = await PDFDocument.load(source.bytes, { ignoreEncryption: true, updateMetadata: false });
  const after = await PDFDocument.load(outputBytes, { ignoreEncryption: true, updateMetadata: false });

  const key = (page, ch, y) => `${page}|${ch.x.toFixed(1)}|${y.toFixed(1)}|${ch.c}`;
  const original = new Map();
  before.getPages().forEach((page, index) => {
    for (const item of extractTextItems(page)) {
      for (const ch of item.chars ?? []) {
        const id = key(index + 1, ch, item.y);
        original.set(id, (original.get(id) ?? 0) + 1);
      }
    }
  });
  const added = [];
  after.getPages().forEach((page, index) => {
    for (const item of extractTextItems(page)) {
      for (const ch of item.chars ?? []) {
        const id = key(index + 1, ch, item.y);
        const remaining = original.get(id) ?? 0;
        if (remaining > 0) { original.set(id, remaining - 1); continue; }
        added.push({ page: index + 1, x: round(ch.x), y: round(item.y), w: round(ch.w), c: ch.c });
      }
    }
  });

  /*
   * A written value reaches the page as a flattened widget appearance placed at
   * the widget's own rectangle, so attribution is against those rectangles —
   * with a tolerance, because a flattened appearance is drawn inside its box
   * rather than at its corner.
   */
  const boxes = census.flatMap((field) => field.widgets.map((widget) => ({
    name: field.name, page: widget.page, rect: widget.rect
  })));
  const insideAnyWidget = (glyph) => boxes.some((box) => glyph.page === box.page
    && glyph.x + glyph.w >= box.rect.x - 2 && glyph.x <= box.rect.x + box.rect.width + 2
    && glyph.y >= box.rect.y - 4 && glyph.y <= box.rect.y + box.rect.height + 4);
  const outside = added.filter((glyph) => String(glyph.c).trim() && !insideAnyWidget(glyph));

  // Every choice field in the DELIVERED bytes, and whether it still holds a
  // value its own option list does not contain.
  const deliveredChoiceValues = [];
  let residualForm = null;
  try { residualForm = after.getForm(); } catch { residualForm = null; }
  for (const field of residualForm ? residualForm.getFields() : []) {
    if (!(field instanceof PDFDropdown)) continue;
    const options = field.getOptions?.() ?? [];
    const selected = (field.getSelected?.() ?? []).filter((value) => String(value).trim() !== "");
    for (const value of selected) {
      deliveredChoiceValues.push({
        field: field.getName(), value,
        isOneOfItsOwnOptions: options.includes(value)
      });
    }
  }

  // Push-button captions must not have been stamped onto the page.
  const buttonCaptions = census.filter((field) => field.type === "pushbutton").map((field) => field.name);
  const stampedButtonCaptions = buttonCaptions.filter((caption) =>
    added.map((glyph) => glyph.c).join("").includes(caption));

  const appearances = await (async () => {
    const tmp = path.join(ROOT, ".ky-readback.pdf");
    fs.writeFileSync(tmp, outputBytes);
    try { return await flattenedWidgets(tmp); } finally { fs.rmSync(tmp, { force: true }); }
  })();

  return {
    addedGlyphsReadFromOutputBytes: added.filter((glyph) => String(glyph.c).trim()).length,
    nonWhitespaceGlyphsOutsideMeasuredWriteBoxes: outside.length,
    glyphsOutsideSample: outside.slice(0, 20),
    flattenedWidgetAppearancesReadFromOutputBytes: appearances.length,
    deliveredChoiceValues,
    choiceValuesOutsideTheirOwnOptions: deliveredChoiceValues.filter((row) => !row.isOneOfItsOwnOptions),
    stampedButtonCaptions,
    perWrite: writable.map((row) => {
      const widget = row.field.widgets[0];
      const drawn = added.filter((glyph) => widget && glyph.page === widget.page
        && glyph.x + glyph.w >= widget.rect.x - 2 && glyph.x <= widget.rect.x + widget.rect.width + 2
        && glyph.y >= widget.rect.y - 4 && glyph.y <= widget.rect.y + widget.rect.height + 4);
      return {
        field: row.field.name, factId: row.decision.factId, page: widget?.page ?? null,
        rect: widget?.rect ?? null, rectBasis: "acroform_widget_rectangle",
        textReadFromFinalPdfBytes: drawn.map((glyph) => glyph.c).join("").trim(),
        glyphCountReadFromFinalPdfBytes: drawn.filter((glyph) => String(glyph.c).trim()).length
      };
    })
  };
}

function findingsFor({ fixture, report, proof, writable }) {
  const findings = [];
  const tooLongToFit = [];
  if (proof.choiceValuesOutsideTheirOwnOptions.length > 0) {
    findings.push({
      severity: "blocking", fixture,
      check: "a_choice_field_was_delivered_holding_a_value_it_does_not_offer",
      detail: proof.choiceValuesOutsideTheirOwnOptions
    });
  }
  if (proof.stampedButtonCaptions.length > 0) {
    findings.push({ severity: "blocking", fixture, check: "push_button_caption_stamped_onto_the_filed_page",
      detail: proof.stampedButtonCaptions });
  }
  if (proof.nonWhitespaceGlyphsOutsideMeasuredWriteBoxes > 0) {
    findings.push({ severity: "blocking", fixture, check: "added_glyphs_outside_every_measured_widget_rectangle",
      count: proof.nonWhitespaceGlyphsOutsideMeasuredWriteBoxes, sample: proof.glyphsOutsideSample });
  }
  for (const row of writable) {
    const written = (report.written ?? []).some((entry) => entry.field === row.field.name);
    if (!written) {
      const refusal = (report.refused ?? []).find((entry) => entry.field === row.field.name) ?? null;
      /*
       * A value that cannot be printed legibly inside the widget the court drew
       * is a measured outcome, not a build defect — it is what the boundary
       * fixture exists to find. It is recorded with the numbers that decide it
       * and carried to the participant, rather than clipped.
       */
      if (refusal && refusal.category === "unfittable") {
        tooLongToFit.push({
          field: row.field.name, factId: row.decision.factId,
          effectiveLabel: row.decision.effectiveLabel,
          measuredWidgetWidth: row.field.widgets[0]?.rect.width ?? null,
          measuredWhy: `the widget the form draws is ${row.field.widgets[0]?.rect.width ?? "?"} points wide `
            + "and this value cannot be printed inside it at the smallest size that stays readable"
        });
        continue;
      }
      findings.push({ severity: "blocking", fixture, check: "offered_field_was_not_written",
        field: row.field.name, factId: row.decision.factId, refusal });
      continue;
    }
    const ink = proof.perWrite.find((entry) => entry.field === row.field.name);
    if (!ink || ink.glyphCountReadFromFinalPdfBytes === 0) {
      findings.push({ severity: "blocking", fixture, check: "reported_write_has_no_glyph_in_its_widget_rectangle",
        field: row.field.name });
    }
  }
  return { findings, tooLongToFit };
}

// ---------------------------------------------------------------------------
// instructions
// ---------------------------------------------------------------------------
function renderParticipantInstructions({ supplyRows, electionRows }) {
  const lines = [];
  lines.push("# Your Kentucky protective-order expungement motion");
  lines.push("");
  lines.push("This is a motion asking a Kentucky court to expunge the record of a protective-order case that");
  lines.push("was dismissed without a full order having issued, under KRS 403.745 and KRS 456.070. It is one");
  lines.push("page. It is prepared for you to check, complete, sign and file. Nothing in it has been filed and");
  lines.push("no court has decided anything.");
  lines.push("");
  lines.push("## What is in the packet");
  lines.push("");
  lines.push(`- **${SOURCE.formNumber} (${SOURCE.revision}, Doc. Code ${SOURCE.docCode})** — ${SOURCE.title}. 1 page.`);
  lines.push("");
  lines.push("## You must supply these before you file");
  lines.push("");
  for (const row of supplyRows) {
    lines.push(`- **${row.effectiveLabel}.** ${row.what}.`);
  }
  lines.push("");
  lines.push("## Statements you must confirm before you sign");
  lines.push("");
  lines.push("The three numbered boxes sit directly above your signature. Checking a box tells the court the");
  lines.push("statement beside it is true of your case. This packet checks none of them for you.");
  lines.push("");
  for (const row of electionRows) {
    lines.push(`- **${row.effectiveLabel}.** ${row.reason}`);
  }
  lines.push("");
  lines.push("## Lines the form prints with no fillable field behind them");
  lines.push("");
  lines.push("These are printed rules on the page. They are yours or the clerk's to complete by hand, and this");
  lines.push("packet leaves them alone rather than drawing into blank space.");
  lines.push("");
  for (const row of PRINTED_LINES_WITHOUT_WIDGETS) {
    lines.push(`- **${row.printed}** — ${row.who === "clerk" ? "the circuit court clerk completes this" : "yours to complete"}: ${row.note}.`);
  }
  lines.push("");
  return `${lines.join("\n")}\n`;
}

function renderFilingInstructions() {
  const lines = [];
  lines.push("# Filing your Kentucky protective-order expungement motion");
  lines.push("");
  lines.push("## Where it goes");
  lines.push("");
  lines.push("File it in the protective-order case itself, with the Office of the Circuit Court Clerk for the");
  lines.push("court that heard the petition. The caption of this motion names that case.");
  lines.push("");
  lines.push("## What the clerk does");
  lines.push("");
  lines.push("The committed record for this route says the clerk verifies your signature, applies the filed");
  lines.push("stamp, completes the notification-of-hearing section on the face of the form, creates the");
  lines.push("scheduled event and requests an updated criminal and protective-order history for the respondent.");
  lines.push("");
  lines.push("## The filing fee");
  lines.push("");
  lines.push("The committed record says the Clerks' Manual records no filing fee for this motion. It does not");
  lines.push("record a fee-waiver treatment, and this packet states no fee amount. Ask the clerk.");
  lines.push("");
  lines.push("## Service");
  lines.push("");
  lines.push("The committed record says you may serve copies of the notice by first class mail per the");
  lines.push("distribution list, and that otherwise the clerk does. The form's own footer lists the copies:");
  lines.push("the court file, the petitioner and the respondent. The record does not state a service deadline");
  lines.push("or a filing deadline, so this packet states none.");
  lines.push("");
  lines.push("## Signing");
  lines.push("");
  lines.push("You sign and date the motion on the printed lines beneath the three numbered statements, and");
  lines.push("write your address and telephone number on the three rules below your signature. The record says");
  lines.push("the clerk verifies the signature. No notarization is required on the face of the form.");
  lines.push("");
  return `${lines.join("\n")}\n`;
}

// ---------------------------------------------------------------------------
async function build({ check = false } = {}) {
  const source = await loadSource();
  const census = censusOf(source.pdf);

  // The county chooser's shipped value, measured rather than remembered.
  const countyField = census.find((field) => field.name === "Case.County");
  if (!countyField) fail("AOC-275.18 no longer carries the Case.County chooser this build measures");
  const shippedCountyDefault = {
    field: "Case.County", shippedValue: countyField.shippedValue,
    optionCount: countyField.optionCount,
    isOneOfItsOwnOptions: countyField.shippedValueIsOneOfItsOwnOptions,
    reachedByTheSharedChooserPromptSuppression: false,
    whyNot: "the shared finalizer suppresses a chooser that ships showing its own prompt, decided by "
      + "isChooserPrompt. Measured against this field's own option list, isChooserPrompt(\"000\", options) "
      + "returns false: it is not punctuation, it does not begin with choose/select/pick, and it is not the "
      + "list's first option. Only this build writing a real county over it displaces it, and the delivered "
      + "bytes are asserted for that after both fixtures are produced."
  };

  // The printed lines with no widget behind them are asserted against the page.
  // Grouped into lines first: the extractor returns text run by run, and a
  // phrase that spans two runs is not found in a run-by-run join.
  const printedText = source.pdf.getPages()
    .flatMap((page) => groupIntoLines(extractTextItems(page))
      .map((line) => normalizeHarvestedText(String(line.text ?? "")).replace(/\s+/g, " ").trim()))
    .join(" \n ");
  const missingPrintedLines = PRINTED_LINES_WITHOUT_WIDGETS
    .filter((row) => !printedText.toLowerCase().includes(row.printed.toLowerCase()))
    .map((row) => row.printed);
  if (missingPrintedLines.length > 0) {
    fail("AOC-275.18 no longer prints lines this build discloses as having no fillable field",
      missingPrintedLines.join("; "));
  }

  const canonical = await renderFixture({ source, census, facts: CANONICAL, fixture: "canonical" });
  const boundary = await renderFixture({ source, census, facts: BOUNDARY, fixture: "boundary" });
  const canonicalProof = await readBack({ source, outputBytes: canonical.bytes, census, writable: canonical.writable });
  const boundaryProof = await readBack({ source, outputBytes: boundary.bytes, census, writable: boundary.writable });

  const canonicalAudit = findingsFor({ fixture: "canonical", report: canonical.report, proof: canonicalProof, writable: canonical.writable });
  const boundaryAudit = findingsFor({ fixture: "boundary", report: boundary.report, proof: boundaryProof, writable: boundary.writable });
  const blocking = [...canonicalAudit.findings, ...boundaryAudit.findings];

  if (check) {
    return { familyId: FAMILY_ID, wrote: false, blocking, shippedCountyDefault,
      canonicalTooLongToFit: canonicalAudit.tooLongToFit, boundaryTooLongToFit: boundaryAudit.tooLongToFit };
  }
  if (blocking.length > 0) {
    fail("the produced bytes disagree with what this build says it wrote", JSON.stringify(blocking.slice(0, 4)));
  }

  fs.mkdirSync(absFor(`${OUT}/fixtures`), { recursive: true });
  fs.mkdirSync(absFor(`${OUT}/reports`), { recursive: true });
  fs.writeFileSync(absFor(`${OUT}/fixtures/canonical.pdf`), canonical.bytes);
  fs.writeFileSync(absFor(`${OUT}/fixtures/boundary.pdf`), boundary.bytes);

  const supplyRows = canonical.decisions
    .filter((row) => row.decision.approvedDisposition === "REQUIRED_BEFORE_FILING")
    .map((row) => ({ field: row.field.name, ...row.decision }));
  const electionRows = canonical.decisions
    .filter((row) => row.decision.approvedDisposition === "PARTICIPANT_ELECTION_GENUINE")
    .map((row) => ({ field: row.field.name, ...row.decision }));

  fs.writeFileSync(absFor(`${OUT}/participant-instructions.md`),
    renderParticipantInstructions({ supplyRows, electionRows }));
  fs.writeFileSync(absFor(`${OUT}/filing-instructions.md`), renderFilingInstructions());

  const withheldRows = canonical.decisions
    .filter((row) => !row.decision.writable && row.decision.terminal !== false)
    .map((row) => ({
      blankId: row.field.name, fieldName: row.field.name,
      effectiveLabel: row.decision.effectiveLabel,
      page: row.field.widgets[0]?.page ?? 1,
      reason: row.decision.reason ?? row.decision.what ?? null,
      completenessDisposition: row.decision.approvedDisposition,
      ...(row.decision.category === "participant_sworn_narrative_or_legal_election"
        ? { refusalClass: row.decision.category, category: row.decision.category } : {}),
      ...(row.decision.requiredBeforeFiling === true
        ? { requiredBeforeFiling: true, whatToSupply: row.decision.what } : {}),
      isSelectionControl: row.field.type === "checkbox",
      approvedDisposition: row.decision.approvedDisposition,
      widgets: row.field.widgets
    }));

  writeJson(`${OUT}/field-census.census-v1.json`, {
    schemaVersion: "rcap-official-form-field-census/v1-census-v1",
    familyId: FAMILY_ID, routeSelectionId: ROUTE_SELECTION_ID,
    censusBasis: "first_hand_inspection_of_the_exact_hash_bound_source",
    documents: [{
      formNumber: SOURCE.formNumber, sourceSha256: source.sha256,
      documentPolicy: {
        mode: "participant", captionOnly: false, documentAcceptsFill: true,
        routeKey: ROUTE_KEY, instrumentKind: SOURCE.instrumentKind
      },
      structuralClass: "acroform",
      pageGeometry: source.pdf.getPages().map((page, index) => ({
        page: index + 1, width: round(page.getSize().width), height: round(page.getSize().height)
      })),
      fieldCount: census.length,
      selectionControlCount: census.filter((field) => field.type === "checkbox").length,
      shippedValues: census.filter((field) => field.shippedValue !== null).map((field) => ({
        field: field.name, type: field.type, shippedValue: field.shippedValue,
        isOneOfItsOwnOptions: field.shippedValueIsOneOfItsOwnOptions
      })),
      fields: census.map((field) => ({
        name: field.name, type: field.type, widgets: field.widgets,
        maxLength: field.maxLength, optionCount: field.optionCount,
        shippedValue: field.shippedValue,
        shippedValueIsOneOfItsOwnOptions: field.shippedValueIsOneOfItsOwnOptions,
        effectiveLabel: FIELD_DECISIONS[field.name].effectiveLabel,
        disposition: FIELD_DECISIONS[field.name].approvedDisposition ?? null,
        writable: FIELD_DECISIONS[field.name].writable === true,
        factId: FIELD_DECISIONS[field.name].factId ?? null
      })),
      printedLinesWithNoWidgetBehindThem: PRINTED_LINES_WITHOUT_WIDGETS
    }]
  });

  writeJson(`${OUT}/production-field-map.json`, {
    schemaVersion: "rcap-production-field-map/v1",
    familyId: FAMILY_ID, routeKeys: [ROUTE_KEY], routeSelectionId: ROUTE_SELECTION_ID,
    implementationStrategy: "official_pdf_fill",
    factMap: CANONICAL,
    documents: [{
      documentId: SOURCE.formNumber, formNumber: SOURCE.formNumber, sourceSha256: source.sha256,
      instrumentKind: SOURCE.instrumentKind,
      writableAnchors: canonical.writable.map((row) => ({
        blankId: row.field.name, label: row.decision.effectiveLabel, factId: row.decision.factId,
        page: row.field.widgets[0]?.page ?? 1, writeBox: row.field.widgets[0]?.rect ?? null,
        rectBasis: "acroform_widget_rectangle"
      })),
      withheld: withheldRows,
      suppressedControls: canonical.decisions
        .filter((row) => row.decision.terminal === false)
        .map((row) => ({ field: row.field.name, why: row.decision.reason }))
    }],
    generationAllowed: false, runtimeSelectable: false, commercialRoutesOpened: 0
  });

  writeJson(`${OUT}/source-receipt.json`, {
    schemaVersion: "rcap-family-source-receipt/v1",
    familyId: FAMILY_ID, worklistGroupId: FAMILY_ID, jurisdiction: "KY",
    implementationStrategy: "official_pdf_fill",
    custodyClass: "SOURCE_RECOVERED_INTO_CUSTODY",
    custodyNote: "This family was previously returned STOPPED / BLOCKED_SOURCE because the bytes were not "
      + "mounted in that container. They were recovered on 2026-09-04 from the existing authenticated custody "
      + "and mounted at the path the committed corpus index already pinned. The digest did not change and no "
      + "acquisition was commissioned; this build re-hashes the bytes on every run.",
    acquisitionCommissioned: false,
    corpusRootFromEnvironment: "MASTER_LIBRARY_SOURCE_DIR",
    bindingMethod: "committed corpus-index path + index SHA-256 + on-disk SHA-256 + byte length + page count",
    routeKey: ROUTE_KEY, routeSelectionId: ROUTE_SELECTION_ID,
    statutoryAuthority: "KRS 403.745; KRS 456.070",
    documents: [{
      sourceIds: [SOURCE.sourceId], documentId: SOURCE.formNumber, formNumber: SOURCE.formNumber,
      revision: SOURCE.revision, docCode: SOURCE.docCode, title: SOURCE.title,
      instrumentKind: SOURCE.instrumentKind, packetComponent: SOURCE.component,
      pathInArchive: SOURCE.path, custody: source.indexEntry.custody,
      sha256: source.sha256, byteLength: source.byteLength, pageCount: source.pdf.getPageCount(),
      acroFieldCount: census.length, structuralClassObserved: "acroform",
      exactHashVerified: true, corpusIndexAgrees: true
    }],
    allSourcesExact: true, sourceBinaryCommitted: false,
    generationAllowed: false, runtimeSelectable: false, commercialRoutesOpened: 0
  });

  const artifact = (fixture, result, proof) => ({
    fixture, file: `${OUT}/fixtures/${fixture}.pdf`,
    sha256: sha256(result.bytes), byteLength: result.bytes.length,
    pageCount: 1,
    pageManifest: [{ packetPage: 1, formNumber: SOURCE.formNumber, sourcePage: 1, sourceSha256: source.sha256 }],
    activeContentScan: result.report.activeContentScan ?? null,
    addedGlyphsReadFromOutputBytes: proof.addedGlyphsReadFromOutputBytes,
    nonWhitespaceGlyphsOutsideMeasuredWriteBoxes: proof.nonWhitespaceGlyphsOutsideMeasuredWriteBoxes,
    flattenedWidgetAppearancesReadFromOutputBytes: proof.flattenedWidgetAppearancesReadFromOutputBytes,
    deliveredChoiceValues: proof.deliveredChoiceValues,
    rasterPages: [], rasterState: "BUILT_RASTER_PENDING",
    whyNoRasterHere: "rasterization is central (.github/workflows/rcap-packet-raster-acceptance-batch.yml). A "
      + "local render is not a receipt, so this build produces none and records the digests the central "
      + "workflow is to raster."
  });

  writeJson(`${OUT}/reports/rendered-artifacts.json`, {
    schemaVersion: "rcap-rendered-artifacts/v1", familyId: FAMILY_ID, renderedFresh: true,
    artifacts: [artifact("canonical", canonical, canonicalProof), artifact("boundary", boundary, boundaryProof)]
  });

  writeJson(`${OUT}/reports/actual-writes.json`, {
    schemaVersion: "rcap-actual-writes-byte-proof/v1", familyId: FAMILY_ID,
    derivedFromArtifactBytes: true, proofSource: "final canonical and boundary PDF bytes",
    documents: [
      { fixture: "canonical", formNumber: SOURCE.formNumber, sourceSha256: source.sha256,
        proofMethod: "flattened widget appearances located in the final PDF bytes at the source's own widget "
          + "rectangles",
        ...canonicalProof, actualWrites: canonicalProof.perWrite,
        refused: canonical.report.refused ?? [], written: canonical.report.written ?? [],
        promptsSuppressed: canonical.report.promptsSuppressed ?? [] },
      { fixture: "boundary", formNumber: SOURCE.formNumber, sourceSha256: source.sha256,
        proofMethod: "flattened widget appearances located in the final PDF bytes at the source's own widget "
          + "rectangles",
        ...boundaryProof, actualWrites: boundaryProof.perWrite,
        refused: boundary.report.refused ?? [], written: boundary.report.written ?? [],
        promptsSuppressed: boundary.report.promptsSuppressed ?? [] }
    ]
  });

  writeJson(`${OUT}/reports/blanks.json`, {
    schemaVersion: "rcap-packet-blanks/v1", familyId: FAMILY_ID,
    whatThisIs: "every AcroForm field this build did not write, with the reason it is blank, plus the printed "
      + "lines this form draws with no fillable field behind them at all",
    requiredBeforeFiling: supplyRows, participantElections: electionRows,
    printedLinesWithNoWidgetBehindThem: PRINTED_LINES_WITHOUT_WIDGETS,
    valuesTooLongForTheWidgetTheFormDraws: {
      whatThisIs: "a held fact that cannot be printed legibly inside the widget the court drew. It is refused "
        + "rather than clipped, because a clipped value on a filing is a wrong value and not a shorter one.",
      canonical: canonicalAudit.tooLongToFit, boundary: boundaryAudit.tooLongToFit
    },
    routeElectionsMade: []
  });

  writeJson(`${OUT}/reports/caption-evidence.json`, {
    schemaVersion: "rcap-caption-evidence/v1", familyId: FAMILY_ID,
    whatThisIs: "the caption fields of AOC-275.18, the fact written into each, and the two party blocks this "
      + "build refuses because the record does not say which of them the participant occupies",
    documents: [{
      formNumber: SOURCE.formNumber, sourceSha256: source.sha256, captionBandPage: 1,
      captionFields: census
        .filter((field) => ["Case  No", "Case.County", "Court", "Division", "movant",
          "first pet", "middle pet", "last pet", "first res", "middle res", "last res"].includes(field.name))
        .map((field) => ({
          field: field.name, type: field.type, widget: field.widgets[0] ?? null,
          effectiveLabel: FIELD_DECISIONS[field.name].effectiveLabel,
          disposition: FIELD_DECISIONS[field.name].approvedDisposition ?? "WRITTEN",
          factId: FIELD_DECISIONS[field.name].factId ?? null,
          canonicalValue: FIELD_DECISIONS[field.name].factId
            ? CANONICAL[FIELD_DECISIONS[field.name].factId] ?? null : null
        })),
      whichPartyTheParticipantIs: {
        resolvedByTheRecord: false,
        ownerDeterminationNeeded: true,
        why: CAPTION_PARTY_REASON
      }
    }]
  });

  writeJson(`${OUT}/build-findings.json`, {
    schemaVersion: "rcap-build-findings/v1", familyId: FAMILY_ID, blocking: [], findingCount: 0,
    observations: [
      "AOC-275.18 is an AcroForm. Every write box is the /Rect of the source's own widget and no coordinate "
        + "is hand-entered.",
      "The Case.County chooser ships selected on \"000\", which is not one of its own 121 options. The shared "
        + "finalizer's chooser-prompt suppression does not reach it — isChooserPrompt(\"000\", options) is "
        + "false — so the only thing that displaces it is this build writing a real county over it. The "
        + "delivered bytes of both fixtures are re-read and asserted to carry no choice value outside its own "
        + "option list, and the build stops rather than shipping 000 as ink. This is a gap in a shared module, "
        + "reported to the Captain rather than edited from this lane.",
      "All six caption name fields are carried to the participant. The form captions PETITIONER and "
        + "RESPONDENT, the platform holds one person, and nothing in the committed record establishes which of "
        + "the two blocks that person occupies. The free-text `movant` field IS written, because the form's "
        + "own sentence is \"The movant, ____, seeks expungement\" and the movant is whoever files.",
      "WHICH PARTY THE PARTICIPANT IS ON THIS ROUTE IS AN OWNER DETERMINATION. It is recorded here so a "
        + "reviewer can answer it rather than discover it, and reports/caption-evidence.json carries the same "
        + "finding beside the fields it decides.",
      "No box is checked. Items 1, 2 and 3 are sworn allegations sitting directly above the movant's "
        + "signature; screening establishes eligibility and a signature establishes an allegation, and item 3 "
        + "asks about a protective-order history the platform does not hold.",
      "The form's lower half carries no widgets at all — the signature line, the date line, the three "
        + "address-and-telephone rules and the whole NOTIFICATION OF EXPUNGEMENT HEARING block. They are not "
        + "terminal fields, they are not counted as such, and they are disclosed by their printed words in "
        + "participant-instructions.md.",
      "Print and Reset are push buttons. They are suppressed before the flatten and the delivered bytes are "
        + "asserted to carry neither caption."
    ],
    countyChooserShippedDefault: shippedCountyDefault
  });

  writeJson(`${OUT}/product-wiring.json`, {
    schemaVersion: "rcap-family-product-wiring/v1", familyId: FAMILY_ID, routeKeys: [ROUTE_KEY],
    routeSelectionId: ROUTE_SELECTION_ID, implementationStrategy: "official_pdf_fill",
    generationAllowed: false, runtimeSelectable: false, commercialRoutesOpened: 0,
    createsFulfillmentRecord: false, opensCommercialRoute: false,
    assignmentOwnedPath: OUT, evidenceOutputPath: OUT, builtBy: BUILD_SCRIPT,
    note: "Review artifacts and maps create no authority. A route remains closed until exact output-level "
      + "legal and independent visual approval exists in the separate control plane.",
    binding: {
      family: FAMILY_ID, jurisdiction: "KY", routeKeys: [ROUTE_KEY], deliveryType: "official_pdf_fill",
      instrumentKinds: ["court_order", "primary_filing", "service_instructions"],
      packetComponents: [SOURCE.component],
      fieldMap: `${OUT}/production-field-map.json`,
      instructions: `${OUT}/participant-instructions.md`,
      filingInstructions: `${OUT}/filing-instructions.md`,
      renderedArtifacts: `${OUT}/reports/rendered-artifacts.json`,
      sourceReceipt: `${OUT}/source-receipt.json`,
      sourceVersion: [{ sourceId: SOURCE.sourceId, sha256: SOURCE.sha256, tier: "exact_content_hash" }],
      declaredInstrumentKindsWithoutAComponent: {
        kinds: ["court_order", "service_instructions"],
        note: "MASTER_QUEUE declares three instrument kinds for this family and one packet component. The "
          + "route census names a court_order and a service_instructions component; neither has a bound "
          + "source, and the court order for this motion is the clerk's own notification block printed on "
          + "the face of AOC-275.18. Recorded rather than silently treated as delivered."
      }
    }
  });

  writeJson(`${OUT}/approval-request.json`, {
    schemaVersion: "rcap-output-approval-request/v1", familyId: FAMILY_ID, routeKeys: [ROUTE_KEY],
    status: "REQUESTED", grantedBy: null, exactSourceReviewComplete: true,
    independentVisualReviewRequired: true, outputLegalApprovalRequired: true,
    ownerDeterminationRequested: {
      question: "On this route, is the participant the PETITIONER or the RESPONDENT in the protective-order "
        + "case whose record is being expunged?",
      whyItMatters: "It decides which of AOC-275.18's two caption blocks carries the participant's name. "
        + "Until it is answered both blocks are carried to the participant.",
      blocksThisPacket: false
    },
    generationAllowed: false, runtimeSelectable: false, commercialRoutesOpened: 0
  });

  writeJson(`${OUT}/build-status.json`, {
    schemaVersion: "rcap-family-build-status/v1", familyId: FAMILY_ID,
    status: "BUILT_REVIEW_PENDING", rasterState: "BUILT_RASTER_PENDING",
    builtDocuments: 1, renderedArtifacts: 2, rasterPages: 0,
    generationAllowed: false, runtimeSelectable: false, commercialRoutesOpened: 0,
    packetsSelfVerified: 0, productionTouched: false
  });

  return {
    familyId: FAMILY_ID, wrote: true, directory: OUT,
    canonical: { sha256: sha256(canonical.bytes), byteLength: canonical.bytes.length, pageCount: 1 },
    boundary: { sha256: sha256(boundary.bytes), byteLength: boundary.bytes.length, pageCount: 1 },
    source: { formNumber: SOURCE.formNumber, sha256: source.sha256, byteLength: source.byteLength,
      acroFieldCount: census.length, pageCount: source.pdf.getPageCount() },
    shippedCountyDefault,
    inkReadBackFromOutputBytes: [
      { fixture: "canonical", valuesReportedByFinalizer: (canonical.report.written ?? []).length,
        addedGlyphsReadFromOutputBytes: canonicalProof.addedGlyphsReadFromOutputBytes,
        nonWhitespaceGlyphsOutsideMeasuredWriteBoxes: canonicalProof.nonWhitespaceGlyphsOutsideMeasuredWriteBoxes,
        flattenedWidgetAppearancesReadFromOutputBytes: canonicalProof.flattenedWidgetAppearancesReadFromOutputBytes,
        deliveredChoiceValues: canonicalProof.deliveredChoiceValues, selectionsMarked: [] },
      { fixture: "boundary", valuesReportedByFinalizer: (boundary.report.written ?? []).length,
        addedGlyphsReadFromOutputBytes: boundaryProof.addedGlyphsReadFromOutputBytes,
        nonWhitespaceGlyphsOutsideMeasuredWriteBoxes: boundaryProof.nonWhitespaceGlyphsOutsideMeasuredWriteBoxes,
        flattenedWidgetAppearancesReadFromOutputBytes: boundaryProof.flattenedWidgetAppearancesReadFromOutputBytes,
        deliveredChoiceValues: boundaryProof.deliveredChoiceValues, selectionsMarked: [] }
    ],
    requiredBeforeFiling: supplyRows.length,
    participantElections: electionRows.length,
    routeSelectionsMade: 0,
    canonicalTooLongToFit: canonicalAudit.tooLongToFit,
    boundaryOnlyRequiredBeforeFiling: boundaryAudit.tooLongToFit.map((row) => ({
      field: row.field, label: row.effectiveLabel, measuredWhy: row.measuredWhy }))
  };
}

if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(thisFile)) {
  build({ check: process.argv.includes("--check") })
    .then((result) => console.log(JSON.stringify(result, null, 2)))
    .catch((error) => { console.error(error); process.exit(1); });
}

export { build, FAMILY_ID, OUT, BUILD_SCRIPT };
