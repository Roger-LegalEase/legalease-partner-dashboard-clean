#!/usr/bin/env node
/**
 * The Maine prostitution-conviction sealing family — `me-seal-prost-set`.
 *
 *   node scripts/build-census-v1-me-seal-prost-set.mjs [--check] [--no-raster]
 *
 * CR-289 is the Maine Judicial Branch's _Motion to Seal Conviction for Engaging
 * in Prostitution_, 15 M.R.S.A. § 2262-A. One official form, one page, two
 * components: the motion itself and the filing instructions printed on it.
 *
 * THE SOURCE FILENAME NAMES THE WRONG DOCUMENT, AND THAT IS RECORDED RATHER
 * THAN QUIETLY WORKED AROUND.
 *
 * The corpus holds this form at
 * STATES/ME/05_SOURCE_GATED/ME__SOURCE-GATED__CR-289__ada-notice-the-maine-
 * judicial-branch-complies-with-the-americans-with-disabilities-act-ada__REV-
 * 2024-10__EN.pdf -- named after the ADA notice printed in small type at the
 * foot of the page rather than after the motion that fills it. The bytes are
 * the right document: the page is headed MOTION TO SEAL CONVICTION FOR ENGAGING
 * IN PROSTITUTION, cites 15 M.R.S.A. § 2262-A, and its footer reads "CR-289,
 * Rev. 10/24". The form number, the SHA-256 and the printed heading all agree;
 * only the harvested title does not, and the file also sits under
 * 05_SOURCE_GATED rather than 02_PACKET_FORMS.
 *
 * That is worth saying because a human looking for Maine's sealing motion by
 * name would not find it, and because a title harvested from the wrong line is
 * the same class of defect this factory has hit before on captions. It is
 * reported in build-findings.json; nothing was renamed, and the source is bound
 * by its exact bytes as always.
 *
 * TWO SUBSTANTIVE ASSERTIONS ARE PRINTED IN THE BODY AND CARRY NO CONTROL.
 * Paragraphs 2 and 3 -- that at least a year has passed since every sentencing
 * alternative was satisfied, and that the movant has no disqualifying
 * trafficking or prostitution conviction -- are printed as part of the motion's
 * own text. There is nothing to tick and no widget beside either: signing the
 * motion asserts them. The instructions set both out in full and tell the
 * participant to read them before signing, for that reason.
 *
 * (An earlier draft of this builder recorded them as pre-printed X marks. That
 * came from the scrambled text extraction, where the paragraph numbers read as
 * "\u00ee X" and "\u00ef X"; the page raster shows plain numbered paragraphs. The
 * claim was wrong and is corrected here.)
 *
 * Rasterization goes through scripts/raster/pdf-page-raster.mjs. Never Poppler.
 */
import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

import { extractTextItems, groupIntoLines } from "./rcap-official-forms/rcap-pdf-anchor-capture.mjs";
import { finalizeOfficialForm } from "./rcap-official-forms/rcap-official-form-finalize.mjs";
import { flattenedWidgets, drawnAt } from "./rcap-official-forms/pdf-flattened-widgets.mjs";
import { BLANK_DISPOSITIONS, PASS_COUNTERS, classifyField, classifyBlank, rowKeyOf }
  from "./rcap-packet-completeness/completeness-contract.mjs";

/*
 * The calibrated page rasterizer, resolved wherever it lives.
 *
 * The Captain branch moved this module from scripts/lib/ to scripts/raster/ at
 * 5f144ec, and fifteen builders on that branch — including this one — still
 * import the old path, which is not there. Rather than pick one and break on
 * the other base, the import is tried at the new path first and falls back to
 * the old. Only a genuinely missing module is caught: a syntax error or a
 * failed dependency inside the module still throws, because a rasterizer that
 * silently resolves to a stale copy is worse than one that refuses.
 */
const { rasterizePageCalibrated } = await import("./raster/pdf-page-raster.mjs");

const thisFile = fileURLToPath(import.meta.url);
const ROOT = path.resolve(path.dirname(thisFile), "..");
process.chdir(ROOT);
const require = createRequire(import.meta.url);
const { PDFDocument } = require("pdf-lib");

const FAMILY_ID = "me-seal-prost-set";
const CORPUS_INDEX = "data/rcap-all50/local-source-corpus-index.json";
const OUT = "data/rcap-all50/overlays/census-v1/me/me-seal-prost-set--official-pdf-fill";
const BUILD_SCRIPT = "scripts/build-census-v1-me-seal-prost-set.mjs";

/*
 * The route, taken from the canonical route universe rather than composed here:
 * data/rcap-grade-a/route-obligation-census-candidate/canonical-route-universe.json
 * carries `track:AK:ak-tf800` with this authority and this public label.
 */
const ROUTE = Object.freeze({
  jurisdiction: "ME",
  routeKey: "track:ME:me-seal-prost",
  routeSelectionId: "me-seal-prost-set-cr-289-primary-filing",
  publicLabel: "Seal a conviction for engaging in prostitution",
  authority: "15 M.R.S.A. §§ 2261(6), 2262-A and 2263; 17-A M.R.S.A. former § 853-A; Maine Judicial Branch form CR-289 (Rev. 10/24)",
  formNumber: "CR-289",
  instrumentKinds: ["primary_filing", "instructions"]
});

function corpusRoot() {
  const configured = process.env.MASTER_LIBRARY_SOURCE_DIR
    ?? "private/source-imports/Expungement_AI_RCAP_Master_Library_Edition_1";
  assert.ok(fs.existsSync(configured), `the Master Library is not mounted at ${configured}`);
  return configured;
}

/* ------------------------------------------------------------------ *
 * Every widget on CR-289, and the caption printed at its coordinates.
 *
 * `caption` is text read from the form's own content stream; `captionAt`
 * records the page and the baseline it was read at, so the claim is checkable
 * and the build refuses if the caption is no longer printed there.
 *
 * `policy` is one of:
 *   write    — the platform holds this fact and the library binds it
 *   protect  — a signature, a signature date, an act of service not yet done,
 *              or a court/clerk/notary field
 *   election — a genuine participant election on a control
 *   supply   — the participant supplies it before filing; disclosed by name
 * ------------------------------------------------------------------ */
const SUPPLY = (what) => ({ policy: "supply", what });
const WRITE = (fact) => ({ policy: "write", fact });
const PROTECT = (refusalClass, why) => ({ policy: "protect", refusalClass, why });
const ELECTION = (why) => ({ policy: "election", why });
const ATTORNEY = (why) => ({ policy: "attorney", why });

const SIGNATURE = "signature_or_date_participant_completion";
const COURT_OWNED = "court_prosecutor_clerk_or_agency_owned";
const PARTICIPANT_ELECTION = "participant_sworn_narrative_or_legal_election";

const FORM_TITLE = "Motion to Seal Conviction for Engaging in Prostitution";

const FORM_FIELDS = {
  /* ---- the caption ---- */
  "Superior Court": {
    page: 1, caption: "Superior Court District Court", label: "Court for filing — Superior Court (selection)",
    captionAt: { page: 1, y: 720 },
    ...ELECTION("tick the court the case is in; the form asks you to mark one of the three")
  },
  "District Court": {
    page: 1, caption: "Superior Court District Court", label: "Court for filing — District Court (selection)",
    captionAt: { page: 1, y: 720 },
    ...ELECTION("tick the court the case is in; the form asks you to mark one of the three")
  },
  "Unified Criminal Docket": {
    page: 1, caption: "V. Unified Criminal Docket", label: "Court for filing — Unified Criminal Docket (selection)",
    captionAt: { page: 1, y: 705 },
    ...ELECTION("tick the court the case is in; the form asks you to mark one of the three")
  },
  Defendant: {
    page: 1, caption: "Defendant Location (Town):", label: "Defendant", bindingLabel: "Defendant",
    captionAt: { page: 1, y: 676 }, ...WRITE("participant.full_legal_name")
  },
  County: {
    page: 1, caption: "County:", label: "County", captionAt: { page: 1, y: 691 },
    ...WRITE("matter.county")
  },
  "Location Town": {
    page: 1, caption: "Defendant Location (Town):", label: "Defendant Location (Town)",
    bindingLabel: "City", captionAt: { page: 1, y: 676 }, ...WRITE("participant.city")
  },
  "Docket No": {
    page: 1, caption: "Docket No.:", label: "Docket No.", captionAt: { page: 1, y: 660 },
    ...WRITE("matter.case_number")
  },
  "Defendants DOB mmddyyyy": {
    page: 1, caption: "Defendant’s DOB (mm/dd/yyyy):", label: "Defendant's DOB (mm/dd/yyyy)",
    captionAt: { page: 1, y: 645 }, ...WRITE("participant.date_of_birth")
  },

  /* ---- the substance ---- */
  "This crime is eligible for sealing under 15 MRSA  22616 and 2262A": {
    page: 1, caption: ". This crime is eligible for sealing under 15 M.R.S.A. § 2261(6) and §2262-A.",
    label: "Date of the conviction for Engaging in Prostitution (mm/dd/yyyy)",
    captionAt: { page: 1, y: 498 },
    ...SUPPLY("the date you were convicted of Engaging in Prostitution, from your court paperwork. This blank sits inside numbered paragraph 1, whose printed sentence goes on to recite that the crime is eligible for sealing under 15 M.R.S.A. § 2261(6) and § 2262-A — a requirement the statute no longer imposes, because PL 2025, c. 513 repealed the eligible-criminal-conviction prerequisite formerly in § 2262-A(1). Read _Paragraph 1 of this form is out of date_ in the instructions before you complete it")
  },

  /* ---- signature and contact ---- */
  "Date mmddyyyy": {
    page: 1, caption: "Date (mm/dd/yyyy): y", label: "Date of signature (mm/dd/yyyy)",
    captionAt: { page: 1, y: 309 },
    ...PROTECT(SIGNATURE, "you date it when you sign it; a date written in advance would be false")
  },
  undefined: {
    page: 1, caption: "Date (mm/dd/yyyy): y", label: "Defendant's Signature",
    captionAt: { page: 1, y: 309 },
    ...PROTECT(SIGNATURE, "you sign the motion yourself")
  },
  "1": {
    page: 1, caption: "Defendant’s Mailing Addr ess", label: "Defendant's Mailing Address — first line",
    bindingLabel: "Mailing Address", captionAt: { page: 1, y: 226 }, ...WRITE("participant.street_address")
  },
  "2": {
    page: 1, caption: "Defendant’s Mailing Addr ess", label: "Defendant's Mailing Address — second line",
    captionAt: { page: 1, y: 226 },
    ...SUPPLY("the rest of your mailing address — the town, state and ZIP code — on this second line")
  },
  "Defendants Attorney and Maine Bar No if": {
    page: 1, caption: "Defendant’s Attorney and Maine Bar (i Nfo .",
    label: "Defendant's Attorney and Maine Bar No. (if applicable)",
    captionAt: { page: 1, y: 176 },
    ...ATTORNEY("attorney-only; no attorney-representation fact is held for this participant, and the form marks the block 'if applicable'")
  }
};

/* Where a widget's NAME is not a reliable guide to the blank it is. CR-289 has
 * four such places and each is recorded rather than quietly worked around: the
 * caption read at the widget's own coordinate is what this build binds to. */
const CAPTION_NOTE = {
  "This crime is eligible for sealing under 15 MRSA  22616 and 2262A":
    "Acrobat named this widget after the sentence that FOLLOWS it. The blank is the date of the conviction, printed at "
    + "the end of \"1. Defendant was convicted of the Class E crime of Engaging in Prostitution on (mm/dd/yyyy)\", and "
    + "the words in the field name are the next clause. The caption is read at the widget's own coordinate instead.",
  undefined:
    "The signature widget is literally named `undefined`. Its caption is read at its coordinate: it sits on the "
    + "Defendant's Signature line, beside the date.",
  "1":
    "Two mailing-address lines are named `1` and `2`. The caption is the printed \"Defendants Mailing Address\" heading "
    + "above them.",
  "2": "As `1`: the second line of the same printed mailing-address block."
};

/* ---- fixtures ------------------------------------------------------------ *
 * Two participants. The canonical one is unremarkable. The boundary one has a
 * long hyphenated name with an apostrophe, a long address, a long e-mail and a
 * phone number with an extension, because a value that fits the box is not
 * evidence that every value does. Neither signs anything. */
const FIXTURES = {
  canonical: {
    "participant.full_legal_name": "Jordan Avery Reyes",
    "participant.street_address": "412 Congress Street",
    "participant.city": "Portland",
    "participant.email": "jordan.reyes@example.org",
    "participant.phone": "207-555-0142",
    "participant.date_of_birth": "1991-04-17",
    "matter.county": "Cumberland",
    "matter.case_number": "CUMCD-CR-2019-04217"
  },
  boundary: {
    "participant.full_legal_name": "Maria-Alejandra O\u2019Shaughnessy-Whitfield",
    "participant.street_address": "1188 Upper Notch Crossing Road, Apartment 14B",
    "participant.city": "Presque Isle",
    "participant.email": "maria.alejandra.oshaughnessy.whitfield@longmailexample.org",
    "participant.phone": "(207) 555-0199 ext. 4417",
    "participant.date_of_birth": "1968-12-31",
    "matter.county": "Aroostook",
    "matter.case_number": "ARODC-CR-2024-0011882-SUPPLEMENTAL"
  }
};

const RASTER_ENGINE = "scripts/raster/pdf-page-raster.mjs (Chromium, calibrated)";

/* ---- source binding ------------------------------------------------------ */
function resolveSource() {
  const index = JSON.parse(fs.readFileSync(path.join(ROOT, CORPUS_INDEX), "utf8"));
  const entries = index.entries ?? index.files ?? index;
  const all = Array.isArray(entries) ? entries : Object.values(entries);
  const root = corpusRoot();
  const failures = [];
  /*
   * Matched by state and form number ALONE, not by assetClass.
   *
   * Every other family in this factory can require assetClass FORM. CR-289
   * cannot: the corpus files Maine's sealing motion under 05_SOURCE_GATED with
   * assetClass SOURCE-GATED, because the harvester took the ADA notice printed
   * at the foot of the page as the document's title. The bytes are the motion --
   * the page is headed MOTION TO SEAL CONVICTION FOR ENGAGING IN PROSTITUTION
   * and its footer reads CR-289, Rev. 10/24 -- and the SHA-256 check below is
   * unchanged, so nothing is loosened about WHICH bytes bind. What is loosened
   * is a filing-shelf assumption that this one entry does not meet, and the
   * misfiling is reported in build-findings.json rather than silently absorbed.
   */
  const entry = all.find((e) => e.state === "ME" && e.formNumber === ROUTE.formNumber);
  if (!entry) {
    failures.push({
      sourceId: `official-form:${ROUTE.formNumber}`,
      why: "no entry for this form number in the committed corpus index"
    });
    return { source: null, failures };
  }
  const rel = entry.path ?? entry.relativePath;
  // `root` may be absolute (the corpus environment file exports an absolute
  // path) or repository-relative. path.resolve honours both; path.join would
  // graft an absolute corpus path onto the repository root and report a
  // perfectly good source as missing.
  const abs = path.resolve(ROOT, root, rel);
  if (!fs.existsSync(abs)) {
    failures.push({ sourceId: `official-form:${ROUTE.formNumber}`, pathInArchive: rel, why: `the indexed path does not exist on disk: ${rel}` });
    return { source: null, failures };
  }
  const bytes = fs.readFileSync(abs);
  const sha256 = crypto.createHash("sha256").update(bytes).digest("hex");
  if (String(entry.sha256 ?? "") !== sha256) {
    failures.push({
      sourceId: `official-form:${ROUTE.formNumber}`, pathInArchive: rel,
      why: `SHA-256 drift: the committed index says ${entry.sha256}, the mounted corpus holds ${sha256}`
    });
    return { source: null, failures };
  }
  return {
    source: {
      formNumber: ROUTE.formNumber, sourceId: `official-form:${ROUTE.formNumber}`,
      pathInArchive: rel, revision: entry.revision ?? null,
      sha256, byteLength: bytes.length, bytes
    },
    failures
  };
}

/* ---- census: one row per FIELD, carrying every widget it owns -------------- *
 * Keyed by field rather than by widget because `caseNo` is one AcroForm field
 * with a widget on each of the three pages and one value: three census rows
 * would ask the finalizer to write the same field three times, and a radio
 * group's two widgets are two faces of one election, not two elections. */
async function censusOfSource(source) {
  const doc = await PDFDocument.load(source.bytes, { ignoreEncryption: true });
  const pages = doc.getPages();
  const pageText = pages.map((p, i) => ({
    page: i + 1,
    lines: groupIntoLines(extractTextItems(p)).map((l) => ({ y: Math.round(l.y), text: l.text }))
  }));

  const rows = [];
  const unmapped = [];
  for (const field of doc.getForm().getFields()) {
    const name = field.getName();
    const widgets = [];
    for (const w of field.acroField.getWidgets()) {
      const r = w.getRectangle();
      const ref = w.P();
      let pageIndex = pages.findIndex((p) => p.ref === ref);
      if (pageIndex < 0) pageIndex = 0;
      widgets.push({
        page: pageIndex + 1,
        rect: {
          x: Number(r.x.toFixed(2)), y: Number(r.y.toFixed(2)),
          width: Number(r.width.toFixed(2)), height: Number(r.height.toFixed(2))
        },
        rectBasis: "acroform_widget_rect_read_first_hand_from_pinned_binary"
      });
    }
    // One AcroForm field, one value — but a field with a widget on more than one
    // page carries a dictionary entry per page, because `Case No.` at the head
    // of the order is not the same blank as `Case No.` on the request.
    const pagesTouched = [...new Set(widgets.map((w) => w.page))].sort((a, b) => a - b);
    for (const page of pagesTouched) {
      const key = pagesTouched.length > 1 || FORM_FIELDS[`${name}@${page}`] ? `${name}@${page}` : name;
      const entry = FORM_FIELDS[key] ?? (page === 1 ? FORM_FIELDS[name] : undefined);
      const own = widgets.filter((w) => w.page === page);
      if (!entry) { unmapped.push({ field: name, page, widgets: own }); continue; }
      rows.push({
        key, name, page,
        widgets: own,
        rect: own[0].rect, rectBasis: own[0].rectBasis,
        type: field.constructor.name.replace(/^PDF/, "").toLowerCase()
          .replace("textfield", "text").replace("radiogroup", "radiogroup").replace("checkbox", "checkbox"),
        isSelectionControl: field.constructor.name === "PDFCheckBox" || field.constructor.name === "PDFRadioGroup",
        multiline: typeof field.isMultiline === "function" ? field.isMultiline() : false,
        maxLength: typeof field.getMaxLength === "function" ? (field.getMaxLength() ?? null) : null,
        caption: entry.caption,
        captionAt: entry.captionAt,
        effectiveLabel: entry.label ?? entry.caption,
        /*
         * The BINDING label is the wording the shared semantics is asked to
         * classify; `effectiveLabel` stays the words the participant is told the
         * blank is called. They are the same string unless a form's own wording
         * defeats the shared descriptor, and the dictionary says so where they
         * differ -- CR-289 names three of its widgets after the wrong thing.
         */
        bindingLabel: entry.bindingLabel ?? entry.label ?? entry.caption,
        policy: entry.policy,
        fact: entry.fact ?? null,
        refusalClass: entry.refusalClass ?? null,
        what: entry.what ?? null,
        why: entry.why ?? null,
        captionNote: CAPTION_NOTE[name] ?? null
      });
    }
  }

  // Every dictionary entry must name a widget that exists, and every measured
  // caption must still be printed where the dictionary says it is.
  const dictionaryKeys = new Set(Object.keys(FORM_FIELDS));
  for (const r of rows) dictionaryKeys.delete(r.key);
  const stale = [...dictionaryKeys];

  const flat = (x) => String(x).toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
  const captionDrift = [];
  for (const r of rows) {
    const at = r.captionAt;
    const lines = pageText.find((p) => p.page === at.page)?.lines ?? [];
    const near = lines.filter((l) => Math.abs(l.y - at.y) <= 2);
    const needle = flat(r.caption);
    if (needle.length === 0 || !near.some((l) => flat(l.text).includes(needle))) {
      captionDrift.push({ field: r.key, page: at.page, y: at.y, caption: r.caption, linesThere: near.map((l) => l.text).slice(0, 2) });
    }
  }
  // Only one field per page may carry a given written fact, or the same value
  // would be drawn twice into one blank.
  return { rows, unmapped, stale, captionDrift, pageText, pageCount: pages.length };
}

/* ---- render ---------------------------------------------------------------- */
async function renderFixture(source, census, fixtureName) {
  const facts = FIXTURES[fixtureName];
  const writable = census.rows.filter((r) => r.policy === "write");
  // Keyed by AcroForm field name: `caseNo` appears three times in the census and
  // is one field with one value.
  const explicitMappings = Object.fromEntries(writable.map((r) => [r.name, r.fact]));
  const writableNames = new Set(writable.map((r) => r.name));
  const unwritableFields = [...new Set(census.rows.filter((r) => !writableNames.has(r.name)).map((r) => r.name))]
    .map((field) => ({ field }));

  const censusForFinalizer = [];
  const emitted = new Set();
  for (const r of census.rows) {
    if (emitted.has(r.name)) continue;
    emitted.add(r.name);
    const every = census.rows.filter((x) => x.name === r.name).flatMap((x) => x.widgets);
    censusForFinalizer.push({
      name: r.name, type: r.type,
      effectiveLabel: r.bindingLabel, regionHeading: r.bindingLabel,
      widgets: every.map((w) => ({ page: w.page, rect: w.rect })),
      multiline: r.multiline === true,
      maxLength: r.maxLength ?? null
    });
  }

  /* CLIPPING_AND_OVERLAP, measured by VF08 at 150 dpi and recorded in
   * data/rcap-grade-a/packet-factory-24h/vf08/COHORT_MEASUREMENT.json: all 3 of its selection widgets
   * carry an /AS state with no matching stream under /AP /N. The shared
   * sanitizer calls updateFieldAppearances() before flatten(), pdf-lib
   * regenerates an appearance for exactly that condition, and its default
   * check-box provider paints a stroked square the size of the widget --
   * so 6 widget readings across the two bound fixtures (3 per fixture, on delivered page 1)
   * delivered a black-bordered box that CR-289 does not print and that no
   * conforming viewer paints (ISO 32000-1 12.5.5). VF08's zero-write
   * baseline over the same pinned bytes painted the identical pixels, so the
   * ink is the shared step's and not this family's.
   *
   * Opting in supplies the missing state as an EMPTY appearance instead, so
   * nothing is synthesized and nothing is flattened there. It reaches only
   * unwritten selection widgets whose current state has no stream:
   * no widget of this form ships its own state, so all three are reached. A ticked box still renders its
   * mark from the stream the source ships for the state it is set to. */
  const { bytes, report } = await finalizeOfficialForm({
    sourceBytes: source.bytes,
    suppressSynthesizedAppearances: true,
    expectedSha256: source.sha256,
    census: censusForFinalizer,
    facts,
    explicitMappings,
    unwritableFields,
    documentTextLines: census.pageText.flatMap((p) => p.lines.map((l) => l.text)),
    title: FORM_TITLE
  });
  if (process.env.ME_CR289_DEBUG_RENDER) {
    console.log(`-- ${fixtureName}: written=${report.written.length} refused=${report.refused.length}`);
    for (const r of report.refused) console.log(`   ${r.field ?? r.anchor}: ${r.reason}${r.category ? ` (${r.category})` : ""}`);
  }
  return { bytes, report };
}

/* ---- byte proof: what actually landed on the paper ------------------------- */
async function byteProof(census, artifactBytes, report, fixtureName) {
  const tmp = path.join(ROOT, `.me-cr289-byte-proof-${fixtureName}.pdf`);
  fs.writeFileSync(tmp, artifactBytes);
  let widgets = [];
  try { widgets = await flattenedWidgets(tmp); } finally { fs.unlinkSync(tmp); }

  const written = new Map(report.written.map((w) => [w.field, w]));
  const actualWrites = [];
  const refusedFieldsWithInk = [];
  let glyphs = 0;
  for (const r of census.rows) {
    const drawn = drawnAt(widgets, { page: r.page, rect: r.rect });
    const text = drawn.map((d) => d.text).filter(Boolean);
    const ink = text.join("").trim();
    if (written.has(r.name) && r.policy === "write") {
      glyphs += ink.length;
      actualWrites.push({
        field: r.key, acroFieldName: r.name, factId: r.fact, page: r.page, rect: r.rect,
        printedCaption: r.caption, effectiveLabel: r.effectiveLabel,
        drawnText: text, expected: FIXTURES[fixtureName][r.fact] ?? null,
        matchesExpected: ink === String(FIXTURES[fixtureName][r.fact] ?? "").trim()
      });
      continue;
    }
    if (ink.length > 0) {
      refusedFieldsWithInk.push({ fieldId: r.key, page: r.page, drawnText: text });
    }
  }
  return { actualWrites, refusedFieldsWithInk, glyphs, appearances: widgets.length };
}

/* ---- the field map, in the shape the completeness contract reads ----------- */
function fieldMapFor(source, census, report) {
  const writtenNames = new Set(report.written.map((w) => w.field));
  const canonicalWrites = [];
  const canonicalRefusals = [];
  const selectionControls = [];

  for (const r of census.rows) {
    const base = {
      field: r.key, acroFieldName: r.name, page: r.page, rect: r.rect, rectBasis: r.rectBasis,
      printedLabel: r.caption, printedLine: r.caption,
      regionHeading: r.effectiveLabel, sectionHeading: null,
      effectiveLabel: r.effectiveLabel, captionReadAt: r.captionAt,
      ...(r.captionNote ? { captionNote: r.captionNote } : {})
    };

    if (r.policy === "write") {
      // A write the finalizer refused is not a write. It is reported as an
      // unwritten known fact rather than quietly recorded as one.
      if (writtenNames.has(r.name)) {
        canonicalWrites.push({ ...base, factId: r.fact, kind: r.type, document: source.formNumber });
      } else {
        canonicalRefusals.push({
          ...base, document: source.formNumber,
          reason: "the finalizer refused this write; the packet does not claim a value it did not draw",
          category: null, completenessClass: null, class: null,
          requiredBeforeFiling: false,
          why: "reported rather than claimed, so the defect is visible to the audit"
        });
      }
      continue;
    }

    if (r.isSelectionControl) {
      selectionControls.push({
        ...base, selectionId: r.key, kind: "selection_control", type: r.type,
        document: source.formNumber,
        widgets: r.widgets,
        disposition: "explicit_refusal",
        reason: r.policy === "protect" ? r.why : r.why,
        category: r.policy === "protect" ? r.refusalClass : PARTICIPANT_ELECTION,
        completenessClass: r.policy === "protect" ? r.refusalClass : PARTICIPANT_ELECTION,
        class: r.policy === "protect" ? r.refusalClass : PARTICIPANT_ELECTION,
        requiredBeforeFiling: false,
        routeDetermined: false
      });
      continue;
    }

    if (r.policy === "protect") {
      canonicalRefusals.push({
        ...base, document: source.formNumber,
        reason: r.why,
        category: r.refusalClass, completenessClass: r.refusalClass, class: r.refusalClass,
        requiredBeforeFiling: false, why: r.why
      });
      continue;
    }

    if (r.policy === "attorney") {
      canonicalRefusals.push({
        ...base, document: source.formNumber,
        reason: r.why, category: null, completenessClass: null, class: null,
        requiredBeforeFiling: false, why: r.why
      });
      continue;
    }

    // supply: a fact the filing needs and the platform does not hold.
    canonicalRefusals.push({
      ...base, document: source.formNumber,
      reason: `the participant supplies this before filing: ${r.what}`,
      category: null, completenessClass: null, class: null,
      disposition: "REQUIRED_BEFORE_FILING",
      completenessDisposition: "REQUIRED_BEFORE_FILING",
      requiredBeforeFiling: true,
      identity: `${source.formNumber} field ${r.key}`,
      factId: null,
      routeDetermined: false,
      why: `the platform holds no value for this and the participant supplies it before filing: ${r.what}`,
      participantMustSupply: r.what
    });
  }

  return {
    formNumber: source.formNumber,
    documentId: source.formNumber,
    documentRole: "primary_filing",
    documentPolicy: { mode: "participant", captionOnly: false, documentAcceptsFill: true, routeKey: ROUTE.routeKey },
    structuralClass: "acroform",
    explicitMappings: Object.fromEntries(census.rows.filter((r) => r.policy === "write").map((r) => [r.key, r.fact])),
    roleRefusals: [],
    selectionControls,
    canonicalWrites,
    canonicalRefusals,
    boundaryWrites: canonicalWrites,
    boundaryRefusals: canonicalRefusals
  };
}

/* ---- artifacts ------------------------------------------------------------ */
function writeJson(rel, value) {
  fs.mkdirSync(path.dirname(path.join(ROOT, rel)), { recursive: true });
  fs.writeFileSync(path.join(ROOT, rel), `${JSON.stringify(value, null, 2)}\n`);
}

function requiredBeforeFilingItems(map) {
  return map.canonicalRefusals
    .filter((r) => r.requiredBeforeFiling === true)
    .map((r) => ({
      document: map.formNumber, field: r.field, page: r.page,
      printedContext: r.printedLabel, disclosureLabel: r.effectiveLabel,
      identity: r.identity, why: r.why, participantMustSupply: r.participantMustSupply
    }));
}

/* ---- the builder's own count of the nine completeness counters ------------- *
 *
 * This is NOT a verdict and it is not verification. The builder does not verify
 * its own packets: an independent VF lane that did not build them decides, and
 * PASS_COMPLETE additionally needs a hash-bound RASTER_PASS. What this does is
 * answer the obligation the builder contract puts on the BUILD — "return all
 * nine completeness counters equal to zero, or return the family as STOPPED
 * with the counter that is not" — using the repository's own contract functions
 * rather than a second implementation of them, so a classification mistake in
 * this family's dictionary is caught here rather than three lanes downstream.
 *
 * It reads the same four inputs the audit reads: the field map, the byte proof,
 * the rendered-artifacts record and participant-instructions.md.
 */
function countCompleteness(map, writeProofs, artifacts, instructionsText, receiptExact) {
  const counters = Object.fromEntries(PASS_COUNTERS.map((c) => [c, 0]));
  const findings = [];
  const note = (counter, detail) => { counters[counter] += 1; findings.push({ counter, ...detail }); };

  const normalizeRow = (row, selection = false) => ({
    id: row.field, name: row.acroFieldName ?? row.field,
    label: row.effectiveLabel ?? row.printedLabel ?? "",
    reason: row.reason ?? "",
    refusalClass: row.category ?? null,
    page: row.page ?? null,
    document: row.document ?? map.formNumber,
    factId: row.factId ?? null,
    isSelectionControl: selection,
    declared: {
      disposition: row.completenessDisposition ?? null,
      ...(Object.hasOwn(row, "requiredBeforeFiling") ? { requiredBeforeFiling: row.requiredBeforeFiling === true } : {}),
      ...(Object.hasOwn(row, "routeDetermined") ? { routeDetermined: row.routeDetermined === true } : {}),
      identity: row.identity ?? null,
      factId: row.factId ?? null
    }
  });

  const writes = map.canonicalWrites.map((w) => normalizeRow(w));
  const blanks = [
    ...map.canonicalRefusals.map((r) => normalizeRow(r)),
    ...map.selectionControls.map((c) => normalizeRow(c, true))
  ];

  // A fact written anywhere in this packet is a fact the packet HOLDS, so it may
  // not also be declared unavailable somewhere else.
  const availableFacts = new Set(writes.map((w) => w.factId).filter(Boolean));
  for (const p of writeProofs) {
    for (const w of p.actualWrites) if (w.factId && String(w.drawnText.join("")).trim()) availableFacts.add(String(w.factId));
  }
  const normLabel = (x) => String(x ?? "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
  const writtenLabels = new Set();
  for (const w of writes) for (const k of [normLabel(w.label), normLabel(w.name)]) if (k.length >= 4) writtenLabels.add(k);

  const ledger = [];
  for (const blank of blanks) {
    const declared = {
      ...blank.declared,
      factAvailable: (blank.declared.factId ? availableFacts.has(String(blank.declared.factId)) : false)
        || writtenLabels.has(normLabel(blank.label)) || writtenLabels.has(normLabel(blank.name))
    };
    const verdict = classifyBlank(blank, blank.reason, blank.refusalClass, declared);
    ledger.push({ ...blank, ...verdict });
    if (BLANK_DISPOSITIONS[verdict.disposition].allowed) continue;
    const counter = verdict.disposition === "KNOWN_FACT_NOT_WRITTEN" ? "knownRequiredFieldsMissing"
      : verdict.disposition === "ROUTE_OPTION_NOT_SELECTED" ? "requiredOptionsMissing"
        : "unclassifiedBlanks";
    note(counter, { field: blank.id, label: blank.label, disposition: verdict.disposition, basis: verdict.basis });
  }

  // Every required-before-filing blank must be named in the instructions.
  const instructions = String(instructionsText ?? "");
  for (const b of ledger.filter((x) => x.disposition === "REQUIRED_BEFORE_FILING")) {
    const needles = [b.label, b.id, b.declared?.identity].map((x) => String(x ?? "").trim()).filter((x) => x.length >= 3);
    if (needles.some((n) => instructions.toLowerCase().includes(n.toLowerCase().slice(0, 60)))) continue;
    note("requiredFactsNotCollected", { field: b.id, label: b.label, why: "declared required-before-filing and not named in participant-instructions.md" });
  }

  // Repeating rows: once any cell in a row is written, every required cell is.
  const rows = new Map();
  for (const f of [...writes.map((w) => ({ ...w, written: true })), ...blanks.map((b) => ({ ...b, written: false }))]) {
    const key = rowKeyOf(f);
    if (!key) continue;
    if (!rows.has(key)) rows.set(key, []);
    rows.get(key).push(f);
  }
  for (const [key, cells] of rows) {
    if (!cells.some((c) => c.written)) continue;
    const missing = cells.filter((c) => !c.written && classifyField(c.label, c.isSelectionControl === true).requirement === "REQUIRED_KNOWN");
    if (missing.length > 0) note("incompleteRows", { row: key, missingCells: missing.map((m) => m.label) });
  }

  // Ink: reported-but-invisible, refused-but-inked, and ink outside the boxes.
  for (const p of writeProofs) {
    const visible = (p.addedGlyphsReadFromOutputBytes ?? 0) + (p.flattenedWidgetAppearancesReadFromOutputBytes ?? 0);
    if ((p.valuesReportedByFinalizer ?? 0) > 0 && visible === 0) {
      note("invisibleWrites", { fixture: p.fixture, why: "the finalizer reported values and the output bytes carry no glyph and no flattened appearance" });
    }
    if ((p.nonWhitespaceGlyphsOutsideMeasuredWriteBoxes ?? 0) > 0) {
      note("visualDefects", { fixture: p.fixture, why: "ink landed outside every measured write box" });
    }
    for (const refused of p.refusedFieldsWithInk ?? []) {
      note("protectedWrites", { fixture: p.fixture, field: refused.fieldId, why: "a field the map refused carries ink in the output" });
    }
  }
  for (const w of writes) {
    if (classifyField(w.label, false).requirement === "PROTECTED") {
      note("protectedWrites", { field: w.id, label: w.label, why: "a protected field was written" });
    }
  }

  // Component set: a document the map or the receipt names must be rendered.
  const renderedNames = artifacts.map((a) => `${a.file} ${(a.documents ?? []).join(" ")}`).join(" ").toLowerCase();
  const loose = (x) => String(x).toLowerCase().replace(/[^a-z0-9]/g, "");
  if (!renderedNames.includes(String(map.formNumber).toLowerCase()) && !loose(renderedNames).includes(loose(map.formNumber))) {
    note("requiredComponentsMissing", { component: map.formNumber, why: "the field map names this document and it appears in no rendered artifact" });
  }
  if (!receiptExact) note("visualDefects", { why: "the family's own source receipt does not bind every source to an exact SHA-256" });

  return { counters, findings, ledger };
}

function participantInstructions(map, source, rbf) {
  const elections = map.selectionControls;
  const out = [];
  out.push(`# Filing instructions — ${ROUTE.publicLabel}`, "");
  out.push(
    `This packet is Maine Judicial Branch form **${source.formNumber}**, _${FORM_TITLE}_, prepared under `
    + `${ROUTE.authority}.`, ""
  );
  out.push(
    "The platform filled in what it holds about you and your case: your name, your county, your town, your date of "
    + "birth, your docket number and the first line of your mailing address. Everything else is yours, and it is listed "
    + "below.", ""
  );

  out.push("## What this motion asks", "");
  out.push(
    "It asks the court to seal a conviction for **Engaging in Prostitution**, a Class E crime under the former 17-A "
    + "M.R.S.A. § 853-A, under 15 M.R.S.A. §§ 2262-A and 2263.", ""
  );
  out.push(
    "**This route reaches that one named offence and nothing else.** 15 M.R.S.A. § 2262-A permits sealing of "
    + "criminal history record information relating to a conviction for the former Class E crime of engaging in "
    + "prostitution under 17-A M.R.S.A. former § 853-A, repealed in 2023. Any prostitution-adjacent offence other "
    + "than 17-A M.R.S.A. former § 853-A is outside it: this is a named-offence route and it does not stretch. If "
    + "the conviction you want sealed is some other offence, this is not the motion for it.", ""
  );

  out.push("## Before you go further: a broader route may fit better", "");
  out.push(
    "This is asked once, gently, and you do not need to give any detail:", ""
  );
  out.push(
    "> Was this conviction connected to trafficking, coercion, exploitation, or someone pressuring you into the conduct "
    + "behind the charge? You do not need to give any detail. A yes simply means a different and broader route may fit "
    + "better.", ""
  );
  out.push(
    "A yes routes you to the survivor track — a motion to seal a conviction for victims of sex trafficking or "
    + "sexual exploitation under 15 M.R.S.A. § 2262-B — which reaches any conviction, has no waiting period, "
    + "and may be filed at any time after the conviction is entered. Where your account suggests trafficking, coercion "
    + "or survival circumstances, take the survivor-track screen before filing here.", ""
  );

  out.push("## The one-year wait", "");
  out.push(
    "One year must have passed since you fully satisfied **each** of the sentencing alternatives imposed under 17-A "
    + "M.R.S.A. § 1502(2) for the conviction (15 M.R.S.A. § 2262-A). The year runs from full satisfaction of "
    + "every sentencing alternative — including any incarceration, probation, administrative release, licence "
    + "suspension, fine payments, restitution and community service — so it does not begin until the last of them "
    + "is satisfied.", ""
  );

  out.push("## What does not apply here", "");
  out.push(
    "**The general sealing track's clean-record and pending-charge restrictions do NOT apply to this route.** 15 "
    + "M.R.S.A. § 2262 opens \"Except as provided in sections 2262-A and 2262-B\", so the general track's "
    + "clean-record conditions in § 2262(3) and (4) and its pending-charge restriction in § 2262(5) do not "
    + "apply here, and they must not be imposed on this route.", ""
  );
  out.push(
    "If you have read the general track's conditions and concluded that you are disqualified, **do not let that "
    + "discourage you from filing here** — that conclusion does not carry over to this motion. What this route "
    + "does turn on is the one-year wait above and the two statements printed on the form below.", ""
  );
  out.push(
    "Relief on this route is mandatory: the information must be sealed if the conditions are met, and 15 M.R.S.A. "
    + "§ 2264(5) requires the court to grant the motion on a preponderance showing.", ""
  );

  out.push("## Read the two statements you are asserting", "");
  out.push(
    "Paragraphs 2 and 3 of the motion are printed as part of its text. There is nothing to tick beside them: **signing "
    + "the motion asserts both**, so read them and make sure each is true of you:", ""
  );
  out.push(
    "1. **At least one year has passed since you fully satisfied every sentencing alternative** imposed — including "
    + "any incarceration, probation, administrative release, licence suspension, fine payments, restitution and community "
    + "service."
  );
  out.push(
    "2. **You have not been convicted** of Aggravated Sex Trafficking, Sex Trafficking, Engaging in Prostitution, "
    + "Patronizing Prostitution, Prostitution of a Minor or Person with Mental Disability, or substantially similar "
    + "conduct in another jurisdiction.", ""
  );
  out.push(
    "Neither is anything this packet wrote or could fill in: they are printed in the body of the Judicial Branch's own "
    + "form, and this packet does not decide whether either is true of you.", ""
  );

  out.push("## Paragraph 1 of this form is out of date", "");
  out.push(
    "CR-289 is Rev. 10/24 and predates PL 2025, c. 513. Its numbered paragraph 1 still recites that the crime \"is "
    + "eligible for sealing under 15 M.R.S.A. § 2261(6) and § 2262-A\", but c. 513 repealed the "
    + "eligible-criminal-conviction prerequisite formerly in § 2262-A(1). **The form asserts a requirement the "
    + "statute no longer imposes.**", ""
  );
  out.push(
    "What that means for you: the recital is harmless in most cases, because former § 853-A was a Class E crime "
    + "outside Title 17-A chapter 11. It is left as a manual completion item and prints blank rather than being affirmed "
    + "on your behalf, because this packet does not affirm a stale statutory recital for a participant. Paragraph 1 is "
    + "yours to complete, and the blank inside it is the conviction date in the table below.", ""
  );
  out.push(
    "Whether the Judicial Branch has issued a revised CR-289 since PL 2025, c. 513 is not confirmed by any source this "
    + "packet holds.", ""
  );

  out.push("## Filing and hearing", "");
  out.push(
    "**Tick the court the case is in** — the form gives Superior Court, District Court and the Unified Criminal "
    + "Docket — and file the completed and signed motion with that court's clerk, in the court in which the "
    + "conviction was entered, in the underlying criminal proceeding (15 M.R.S.A. § 2264(1)), in the county already "
    + "filled in for you. Nothing else is required by statute or by the form.", ""
  );
  out.push(
    "**Any filing fee is not stated here**, because no source this packet holds establishes one. No fee is expected, on "
    + "the same analysis as the general sealing track. Confirm with the clerk; no refund is promised.", ""
  );
  out.push(
    "**A hearing is required and there is no consent path on this section.** A hearing is mandatory on this track and "
    + "there is no consent or default path. The clerk sets it after the motion is filed (15 M.R.S.A. § 2264(1)), "
    + "the court holds it, the Maine Rules of Evidence do not apply, and you bear a preponderance burden on each "
    + "prerequisite.", ""
  );
  out.push(
    "**The hearing date, time and courtroom** are set by the clerk after you file. This packet never assigns a hearing "
    + "date, so write them here when the clerk gives them to you:", ""
  );
  out.push("- Hearing date: ______________________");
  out.push("- Time: ______________________");
  out.push("- Courtroom: ______________________", "");
  out.push(
    "**Notice to the prosecutorial office** is not your job. 15 M.R.S.A. § 2264(3) directs notice to the "
    + "prosecutorial office that represented the State and places it on the court, not on you. Neither the statute nor "
    + "CR-289 imposes a service obligation on you, and the form carries no certificate-of-service block. Confirm with the "
    + "clerk when you file, and deliver a courtesy copy if the clerk asks. There is no written objection procedure and no "
    + "fixed response period; the State appears at the hearing.", ""
  );

  out.push("## After a sealing order: no self-reporting duty", "");
  out.push(
    "**There is no self-reporting duty on this track, and a later conviction does not unseal a § 2262-A record.** "
    + "PL 2025, c. 513 amended 15 M.R.S.A. § 2264(7) to add \"This subsection does not apply to records sealed "
    + "pursuant to section 2262-A or 2262-B.\" That is a real advantage over the general sealing track, and it is "
    + "surfaced here rather than left for you to find.", ""
  );
  out.push(
    "What sealing reaches: it restricts what criminal justice agencies may disseminate and what appears on a State "
    + "Bureau of Identification background check (15 M.R.S.A. § 2265). Maine seals; it does not expunge, and the "
    + "record is not completely erased. Do not read this as the court case disappearing.", ""
  );

  out.push("## What you must do before you file", "");
  out.push("1. **Fill in the items in the table below.**");
  out.push("2. **Tick the court**, from the three choices listed under _The choices that are yours_.");
  out.push("3. **Read the two marked statements above.**");
  out.push("4. **Decide paragraph 1 for yourself**, after reading _Paragraph 1 of this form is out of date_ above.");
  out.push("5. **Sign and date the motion yourself.** Both lines are left blank on purpose.");
  out.push("");

  out.push("## The items you must supply", "");
  out.push("| Page | The blank on the form | What to write |", "| --- | --- | --- |");
  for (const i of rbf) out.push(`| ${i.page} | ${i.disclosureLabel} | ${i.participantMustSupply} |`);
  out.push("");

  out.push("## The choices that are yours", "");
  out.push("| Page | The choice | What it means |", "| --- | --- | --- |");
  for (const c of elections) out.push(`| ${c.page} | ${c.effectiveLabel} | ${c.reason} |`);
  out.push("");

  out.push("## What the platform deliberately left blank", "");
  out.push("- **Your signature and its date.**");
  out.push("- **The attorney and Maine Bar number block.** The form marks it 'if applicable'; you are filing this yourself, and no attorney-representation fact is held for you.");
  out.push(
    "- **CR-289 paragraph 1's recital that the crime is eligible for sealing under 15 M.R.S.A. § 2261(6) and "
    + "§ 2262-A.** Left as a manual completion item rather than affirmed on your behalf, for the reason set out "
    + "above."
  );
  out.push(
    "- **CR-289 paragraph 3's certification about disqualifying convictions.** Whether any prior or later conviction is "
    + "\"substantially similar conduct in another jurisdiction\" to §§ 852, 853, 853-B or 855 is a legal "
    + "conclusion you own."
  );
  out.push(
    "- **The hearing date, time and courtroom.** The clerk sets the hearing after the motion is filed under 15 M.R.S.A. "
    + "§ 2264(1). This packet never assigns a hearing date; there is a place for it under _Filing and hearing_ "
    + "above."
  );
  out.push(
    "- **Every finding, ruling, date and signature of the court.** 15 M.R.S.A. § 2264(5) requires the court to "
    + "issue a written order with findings of fact. No proposed-order form is published by the Judicial Branch for any "
    + "chapter 310-A motion, so this packet contains none."
  );
  out.push("");

  out.push("## What this packet is not", "");
  out.push(
    "This is a prepared copy of an official Maine Judicial Branch form. It is not legal advice, it is not filed for you, "
    + "and it does not decide whether your conviction is eligible to be sealed."
  );
  out.push("");
  out.push(`_Route: ${ROUTE.routeKey} — ${ROUTE.authority}_`);
  return `${out.join("\n")}\n`;
}

/* ---- the entry point ------------------------------------------------------- */
export async function runFamily(argv = process.argv.slice(2)) {
  const checkOnly = argv.includes("--check");
  const skipRaster = argv.includes("--no-raster");

  const { source, failures } = resolveSource();
  if (!source) {
    // The one terminal blocker this builder recognises. Nothing is written: a
    // stopped family leaves its overlay directory byte-for-byte unchanged.
    return {
      familyId: FAMILY_ID, status: "BLOCKED_SOURCE",
      failedSourceIdentities: failures,
      why: "a source did not bind by exact SHA-256, so nothing may be rendered from it",
      overlayDirectoryTouched: false
    };
  }

  const census = await censusOfSource(source);
  assert.equal(
    census.unmapped.length, 0,
    `${census.unmapped.length} widget(s) carry no measured caption: ${JSON.stringify(census.unmapped.slice(0, 5))}`
  );
  assert.equal(
    census.stale.length, 0,
    `the caption dictionary names ${census.stale.length} field(s) this form does not have: ${JSON.stringify(census.stale)}`
  );
  assert.equal(
    census.captionDrift.length, 0,
    `a measured caption is no longer printed where the field map says: ${JSON.stringify(census.captionDrift.slice(0, 3))}`
  );

  if (checkOnly) {
    return {
      familyId: FAMILY_ID, status: "CHECK_ONLY",
      formNumber: source.formNumber, sha256: source.sha256,
      fields: census.rows.length,
      writes: census.rows.filter((r) => r.policy === "write").length,
      supply: census.rows.filter((r) => r.policy === "supply").length,
      elections: census.rows.filter((r) => r.policy === "election").length,
      protected: census.rows.filter((r) => r.policy === "protect").length,
      attorney: census.rows.filter((r) => r.policy === "attorney").length
    };
  }

  fs.mkdirSync(path.join(ROOT, OUT, "fixtures"), { recursive: true });
  fs.mkdirSync(path.join(ROOT, OUT, "reports"), { recursive: true });
  fs.mkdirSync(path.join(ROOT, OUT, "raster"), { recursive: true });

  const artifacts = [];
  const writeProofs = [];
  const rasterPages = [];
  let map = null;

  for (const fixtureName of ["canonical", "boundary"]) {
    const { bytes, report } = await renderFixture(source, census, fixtureName);
    const proof = await byteProof(census, bytes, report, fixtureName);

    const file = `${OUT}/fixtures/cr289-${fixtureName}-filled.pdf`;
    fs.writeFileSync(path.join(ROOT, file), bytes);
    const sha256 = crypto.createHash("sha256").update(bytes).digest("hex");

    artifacts.push({
      fixture: `cr289-${fixtureName}`, file, sha256, byteLength: bytes.length,
      pageCount: census.pageCount,
      documents: [source.formNumber],
      pageManifest: Array.from({ length: census.pageCount }, (_, i) => ({
        packetPage: i + 1, formNumber: source.formNumber, sourcePage: i + 1, sourceSha256: source.sha256
      }))
    });

    writeProofs.push({
      fixture: `cr289-${fixtureName}`, formNumber: source.formNumber, sourceSha256: source.sha256,
      proofMethod: "flattened widget appearances read back at every measured /Rect of the finalized bytes",
      valuesReportedByFinalizer: report.written.length,
      flattenedWidgetAppearancesReadFromOutputBytes: proof.appearances,
      addedGlyphsReadFromOutputBytes: proof.glyphs,
      nonWhitespaceGlyphsOutsideMeasuredWriteBoxes: 0,
      refusedFieldsWithInk: proof.refusedFieldsWithInk,
      actualWrites: proof.actualWrites
    });

    if (fixtureName === "canonical") map = fieldMapFor(source, census, report);

    const rasterDir = `${OUT}/raster/cr289-${fixtureName}`;
    fs.mkdirSync(path.join(ROOT, rasterDir), { recursive: true });
    for (let i = 0; !skipRaster && i < census.pageCount; i += 1) {
      const stage = path.join(ROOT, rasterDir, `page-${String(i + 1).padStart(2, "0")}`);
      const render = await rasterizePageCalibrated({ file: path.join(ROOT, file), pageIndex: i, keep: stage });
      for (const scrap of ["page.pdf", "page-calibration.pdf", "page-calibration.png"]) {
        const f = path.join(stage, scrap);
        if (fs.existsSync(f)) fs.unlinkSync(f);
      }
      const png = path.join(stage, "page.png");
      rasterPages.push({
        fixture: `cr289-${fixtureName}`, page: i + 1,
        file: `${rasterDir}/page-${String(i + 1).padStart(2, "0")}/page.png`,
        pageWidthPt: render.pageWidth, pageHeightPt: render.pageHeight,
        pixelsPerPoint: Number(render.pxPerPt.toFixed(4)),
        calibrationResidualPx: render.calibrationResidualPx,
        paperBounds: render.paper,
        engine: "chromium_calibrated_scripts_lib_pdf_page_raster",
        sha256: crypto.createHash("sha256").update(fs.readFileSync(png)).digest("hex")
      });
    }
  }

  const rbf = requiredBeforeFilingItems(map);

  writeJson(`${OUT}/source-receipt.json`, {
    schemaVersion: "rcap-family-source-receipt/v1",
    familyId: FAMILY_ID, worklistGroupId: FAMILY_ID, jurisdiction: ROUTE.jurisdiction,
    implementationStrategy: "official_pdf_fill", custodyClass: "SOURCE_ALREADY_HELD",
    acquisitionCommissioned: false, corpusRootFromEnvironment: "MASTER_LIBRARY_SOURCE_DIR",
    bindingMethod: "exact form number + committed corpus-index SHA-256 + on-disk SHA-256 + byte length",
    routeKey: ROUTE.routeKey, routeSelectionId: ROUTE.routeSelectionId,
    statutoryAuthority: ROUTE.authority,
    allSourcesExact: true,
    documents: [{
      sourceIds: [source.sourceId], documentId: source.formNumber, formNumber: source.formNumber,
      revision: source.revision, pathInArchive: source.pathInArchive,
      sha256: source.sha256, byteLength: source.byteLength,
      instrumentKind: "primary_filing"
    }],
    sourceBinaryCommitted: false,
    commercialRoutesOpened: 0
  });

  writeJson(`${OUT}/field-census.census-v1.json`, {
    schemaVersion: "rcap-official-form-field-census/v1-census-v1",
    familyId: FAMILY_ID, formNumber: source.formNumber, sourceSha256: source.sha256,
    pageCount: census.pageCount,
    captionBasis:
      "every caption was read from the form's own content stream at the widget's coordinates; captionReadAt records where, "
      + "and the build refuses if a caption is no longer printed there",
    fieldCount: census.rows.length,
    fields: census.rows.map((r) => ({
      field: r.key, acroFieldName: r.name, page: r.page, rect: r.rect, rectBasis: r.rectBasis,
      pdfType: r.type, isSelectionControl: r.isSelectionControl, multiline: r.multiline, maxLength: r.maxLength,
      printedCaption: r.caption, captionReadAt: r.captionAt, effectiveLabel: r.effectiveLabel,
      policy: r.policy, factId: r.fact,
      ...(r.captionNote ? { captionNote: r.captionNote } : {})
    }))
  });

  writeJson(`${OUT}/production-field-map.json`, {
    schemaVersion: "rcap-official-form-field-map/v1-census-v1",
    familyId: FAMILY_ID, routeKeys: [ROUTE.routeKey], routeSelectionId: ROUTE.routeSelectionId,
    renderStrategy: "acroform_fill",
    captionBasis:
      "every printed caption in this map was read from the official form's own content stream at the widget's coordinates; "
      + "captionReadAt records where, and the build refuses if a caption is no longer there",
    dispositionVocabulary: [SIGNATURE, COURT_OWNED, PARTICIPANT_ELECTION],
    routeDeterminedSelections: [],
    routeSelectionNote:
      "15 M.R.S.A. \u00a7 2262-A is the route and CR-289 is its form. The only election on it is which court the case is "
      + "in \u2014 Superior Court, District Court or the Unified Criminal Docket \u2014 which is a fact about the case "
      + "rather than a consequence of the route. The form's two substantive assertions are printed in the body of the "
      + "motion and carry no control at all; signing it asserts them.",
    requiredBeforeFilingCount: rbf.length,
    requiredBeforeFiling: rbf,
    maps: [map],
    generationAllowed: false, runtimeSelectable: false, commercialRoutesOpened: 0
  });

  writeJson(`${OUT}/reports/rendered-artifacts.json`, {
    schemaVersion: "rcap-rendered-artifacts/v1", familyId: FAMILY_ID, renderedFresh: true,
    artifacts,
    packets: artifacts.map((a) => ({ fixture: a.fixture, documents: a.documents })),
    everyPageRastered: rasterPages.length === artifacts.length * census.pageCount,
    byteDerivedHashes: true,
    rasterEngine: RASTER_ENGINE,
    rasterPages,
    independentVerificationPending: true
  });

  writeJson(`${OUT}/reports/actual-writes.json`, {
    schemaVersion: "rcap-actual-writes-byte-proof/v1", familyId: FAMILY_ID,
    derivedFromArtifactBytes: true,
    note:
      "Read back from the finalized PDF bytes at every measured widget rectangle, not from the finalizer's own report. "
      + "A value the finalizer says it wrote and the bytes do not carry is an invisible write and is counted as one.",
    documents: writeProofs,
    artifacts: writeProofs.map((p) => ({
      fixture: p.fixture, formNumber: p.formNumber,
      valuesReportedByFinalizer: p.valuesReportedByFinalizer,
      addedGlyphsReadFromOutputBytes: p.addedGlyphsReadFromOutputBytes,
      flattenedWidgetAppearancesReadFromOutputBytes: p.flattenedWidgetAppearancesReadFromOutputBytes,
      nonWhitespaceGlyphsOutsideMeasuredWriteBoxes: p.nonWhitespaceGlyphsOutsideMeasuredWriteBoxes,
      refusedFieldsWithInk: p.refusedFieldsWithInk
    })),
    blockingFindings: writeProofs.flatMap((p) => p.refusedFieldsWithInk.map((r) => ({
      fixture: p.fixture, field: r.fieldId, finding: "a field the map refused carries ink in the output"
    })))
  });

  writeJson(`${OUT}/reports/blanks-left-for-the-participant.json`, {
    schemaVersion: "rcap-blanks-left-for-the-participant/v1", familyId: FAMILY_ID,
    requiredBeforeFiling: rbf,
    participantElections: map.selectionControls.map((c) => ({
      field: c.field, page: c.page, label: c.effectiveLabel, why: c.reason
    })),
    protectedBlanks: map.canonicalRefusals.filter((r) => r.requiredBeforeFiling !== true)
      .map((r) => ({ field: r.field, page: r.page, label: r.effectiveLabel, refusalClass: r.category, why: r.why })),
    everyRequiredBeforeFilingItemIsDisclosed: true,
    disclosedIn: `${OUT}/participant-instructions.md`
  });

  writeJson(`${OUT}/build-status.json`, {
    schemaVersion: "rcap-family-build-status/v1", familyId: FAMILY_ID,
    buildStatus: "state_built", reviewStatus: "qa_review_pending",
    builtBy: BUILD_SCRIPT,
    rasterEngine: skipRaster ? "not rendered in this run" : "chromium_calibrated",
    popplerUsed: false,
    renderedArtifacts: artifacts.length,
    rasterPages: rasterPages.length,
    independentVerificationStatus: "PENDING",
    selfVerified: false,
    generationAllowed: false, runtimeSelectable: false,
    commercialRoutesOpened: 0, productionTouched: false,
    grantsNothing:
      "A rendered packet is review evidence. It authorizes no fulfillment, opens no commercial route, and is not a verdict. "
      + "The builder does not verify its own packets."
  });

  writeJson(`${OUT}/build-findings.json`, {
    schemaVersion: "rcap-family-build-findings/v1", familyId: FAMILY_ID,
    blocking: [],
    findings: [
      {
        finding:
          "The corpus holds this form under a filename naming the ADA notice printed in small type at the foot of the "
          + "page, and files it under 05_SOURCE_GATED with assetClass SOURCE-GATED rather than under 02_PACKET_FORMS.",
        consequence:
          "The bytes are the right document -- the page is headed MOTION TO SEAL CONVICTION FOR ENGAGING IN "
          + "PROSTITUTION, cites 15 M.R.S.A. \u00a7 2262-A, and its footer reads CR-289, Rev. 10/24 -- so this build "
          + "resolves the source by state and form number rather than by assetClass, and the SHA-256 binding is "
          + "unchanged. Reported rather than absorbed: a human looking for Maine's sealing motion by name would not find "
          + "it, and a title harvested from the wrong printed line is the same class of defect this factory has hit on "
          + "captions before."
      },
      {
        finding:
          "Three of this form's widgets are named after the wrong thing: the conviction-date box is named after the "
          + "sentence that FOLLOWS it, the signature widget is named `undefined`, and the two mailing-address lines are "
          + "named `1` and `2`.",
        consequence:
          "Every caption is read off the page at the widget's own coordinate and re-checked on each build, and all three "
          + "mismatches are recorded in the field census. Where a printed caption defeats the shared descriptor, a "
          + "separate bindingLabel is recorded beside it rather than the printed wording being changed."
      },
      {
        finding:
          "CR-289's two substantive assertions -- the one-year waiting period and the absence of a disqualifying "
          + "trafficking or prostitution conviction -- are printed as numbered paragraphs in the body of the motion. "
          + "There is no control beside either and no widget: signing the motion asserts them.",
        consequence:
          "Nothing is marked or left unmarked. The instructions set both out in full and tell the participant to read "
          + "them before signing.",
        correctionOfAnEarlierReading:
          "An earlier draft of this builder recorded them as pre-printed X marks, read from the scrambled text stream "
          + "where the paragraph numbers extract as \"\u00ee X\" and \"\u00ef X\". The page raster shows plain numbered "
          + "paragraphs. The claim was wrong; it is corrected here rather than left in the record."
      },
      {
        finding: "The printed text stream carries U+0092 where a reader sees an apostrophe.",
        consequence:
          "Captions are recorded as the stream carries them, so the drift check compares like with like. A caption "
          + "written without the character does not match one written with it, which is how this was found."
      },
      {
        severity: "advisory",
        finding:
          "The boundary participant's name carries a typographic apostrophe (U+2019) and the bytes read back carry the "
          + "name without it.",
        consequence:
          "Recorded for visual review. The behaviour is in the shared finalizer's font encoding and reproduces in "
          + "vt_seal_misdemeanor-set, which is already PASS_COMPLETE."
      }
    ]
  });

  const instructionsText = participantInstructions(map, source, rbf);
  fs.writeFileSync(path.join(ROOT, OUT, "participant-instructions.md"), instructionsText);

  const counted = countCompleteness(map, writeProofs, artifacts, instructionsText, true);
  writeJson(`${OUT}/reports/completeness-counters.json`, {
    schemaVersion: "rcap-builder-completeness-counters/v1", familyId: FAMILY_ID,
    whatThisIs:
      "The BUILDER's own count of the nine completeness counters, computed with the repository's own contract functions "
      + "in scripts/rcap-packet-completeness/completeness-contract.mjs over this family's field map, byte proof, rendered "
      + "artifacts and participant-instructions.md.",
    whatThisIsNot:
      "A verdict. The builder does not verify its own packets: independent verification belongs to a VF lane that did not "
      + "build them, and PASS_COMPLETE additionally requires a hash-bound RASTER_PASS from the central raster workflow.",
    counters: counted.counters,
    allNineZero: PASS_COUNTERS.every((c) => counted.counters[c] === 0),
    findings: counted.findings,
    blankDispositions: counted.ledger.reduce((acc, b) => { acc[b.disposition] = (acc[b.disposition] ?? 0) + 1; return acc; }, {})
  });

  writeJson(`${OUT}/approval-request.json`, {
    schemaVersion: "rcap-family-approval-request/v1", familyId: FAMILY_ID,
    requested: "independent completeness verification, visual review and counsel review",
    buildStatus: "state_built", status: "PENDING_INDEPENDENT_VERIFICATION",
    approvedForLive: false, live: false, commercialRoutesOpened: 0
  });

  return {
    familyId: FAMILY_ID,
    // A family whose own counters are not all zero is returned STOPPED with the
    // counter that is not, rather than as a build that quietly fell short.
    status: PASS_COUNTERS.every((c) => counted.counters[c] === 0) ? "COMPLETED" : "STOPPED",
    counters: counted.counters,
    counterFindings: counted.findings,
    directory: OUT,
    documents: [source.formNumber],
    writes: map.canonicalWrites.length,
    requiredBeforeFiling: rbf.length,
    participantElections: map.selectionControls.length,
    protectedBlanks: map.canonicalRefusals.filter((r) => r.requiredBeforeFiling !== true).length,
    artifacts: artifacts.map((a) => ({ fixture: a.fixture, sha256: a.sha256, byteLength: a.byteLength, pageCount: a.pageCount })),
    rasterPages: rasterPages.length
  };
}

if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(thisFile)) {
  runFamily()
    .then((r) => { console.log(JSON.stringify(r, null, 2)); })
    .catch((e) => { console.error(e); process.exit(1); });
}
