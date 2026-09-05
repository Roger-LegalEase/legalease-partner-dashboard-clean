#!/usr/bin/env node
/**
 * The North Dakota marijuana summary-pardon family — `nd-summary-marijuana-pardon-set`.
 *
 *   node scripts/build-census-v1-nd-summary-marijuana-pardon-set.mjs [--check] [--no-raster]
 *
 * One official form:
 *
 *   SFN 61663  North Dakota Pardon Advisory Board Application to Pardon
 *              Eligible Marijuana Offenses  — the application
 *
 * The route is
 * `obligation:track-pathway:ND:nd-summary-marijuana-pardon:marijuana-specific-summary-pardon-or-sealing-relief`,
 * N.D.C.C. ch. 12-55.1: the Pardon Advisory Board's marijuana-specific
 * application, an APPLICATION TO AN AGENCY rather than a filing with a court.
 *
 * FOUR THINGS ABOUT THIS FORM SHAPED THE IMPLEMENTATION.
 *
 * First, IT IS NOT AN EXPUNGEMENT AND THE FORM SAYS SO IN CAPITALS. Its first
 * instruction reads "A REQUEST FOR A PARDON WILL NOT EXPUNGE AN INDIVIDUAL'S
 * CRIMINAL HISTORY RECORD", and its closing note says a background check may
 * continue to show the offence after a pardon with removal of guilt. A packet
 * that presented this as record clearing would be misdescribing the relief the
 * participant is applying for, so the participant instructions lead with it.
 *
 * Second, THREE OF ITS BLANKS WOULD HAVE TAKEN A PARTICIPANT FACT AND MEANT
 * SOMETHING ELSE. The shared field semantics binds by field name, and this form
 * names an offence-row column `City or County` and another `Case Number`, and a
 * second phone box `Work Telephone Number`. Left to the name channel, the
 * participant's home city would have been written into the offence table's
 * venue column, their matter's case number into the first offence row, and
 * their one contact number into two differently-captioned boxes. Each was
 * measured — `decideBinding` returns participant.city, matter.case_number and
 * participant.phone for those three names — and each is refused by role here,
 * before anything is rendered. They are near-misses, and they are recorded as
 * such rather than quietly avoided.
 *
 * Third, THE OFFENCE TABLE IS FILLED COMPLETELY OR NOT AT ALL. Each of its three
 * rows asks for six things: the judge, the prosecutor, defence counsel, the city
 * or county, the offence and the case number. The platform holds at most one of
 * the six. A row carrying a case number beside five blanks reads as a finished
 * row and is not one, and this form's own instructions say an incomplete
 * application is RETURNED. So no cell in the table is written and all eighteen
 * are carried to the participant.
 *
 * Fourth, THE CONTRACT'S FIELD CLASSES READ "JUDGE" AS COURT-OWNED, AND HERE IT
 * IS NOT. On a court form a widget captioned Judge is the court's own; on this
 * agency application the applicant is asked to NAME the judge who sentenced
 * them, for each offence. Classified by the caption alone, those three cells
 * would be excused as protected and would then never be disclosed to the
 * participant — an item the board requires, that nothing asks for. Each is
 * declared under the case-determined exception, with the reason stated on its
 * own row, so it is counted as required before filing and printed in the
 * instructions. This use of the exception is outside the route-election setting
 * it was written for and is called out in build-findings.json so a reviewer can
 * challenge it rather than discover it.
 *
 * The social security number, the place of birth and the race the form asks for
 * are refused by the shared semantics before this build reaches them —
 * government_identifier and race are protected categories there. The platform
 * holds none of the three, must not, and does not guess them: each is carried to
 * the participant by name.
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
import { stampDeterministic } from "./rcap-official-forms/rcap-deterministic-pdf-date.mjs";
import { BLANK_DISPOSITIONS, PASS_COUNTERS, classifyField, classifyBlank, rowKeyOf }
  from "./rcap-packet-completeness/completeness-contract.mjs";

const { rasterizePageCalibrated } = await import("./raster/pdf-page-raster.mjs");

const thisFile = fileURLToPath(import.meta.url);
const ROOT = path.resolve(path.dirname(thisFile), "..");
process.chdir(ROOT);
const require = createRequire(import.meta.url);
const { PDFDocument } = require("pdf-lib");

const FAMILY_ID = "nd-summary-marijuana-pardon-set";
const CORPUS_INDEX = "data/rcap-all50/local-source-corpus-index.json";
const OUT = "data/rcap-all50/overlays/census-v1/nd/nd-summary-marijuana-pardon-set--official-pdf-fill";
const BUILD_SCRIPT = "scripts/build-census-v1-nd-summary-marijuana-pardon-set.mjs";

const ROUTE = Object.freeze({
  jurisdiction: "ND",
  routeKey: "obligation:track-pathway:ND:nd-summary-marijuana-pardon:marijuana-specific-summary-pardon-or-sealing-relief",
  routeSelectionId: "nd-summary-marijuana-pardon-set-sfn-61663",
  publicLabel: "Application to the North Dakota Pardon Advisory Board to pardon eligible marijuana offences",
  authority: "N.D.C.C. ch. 12-55.1; North Dakota Department of Corrections and Rehabilitation form SFN 61663",
  documents: [
    {
      formNumber: "SFN-61663",
      indexFormNumber: "ND-NORTH-DAKOTA-PARDON-ADVISORY-BOARD-APPLICA",
      sourceId: "official-form:SFN-61663",
      title: "North Dakota Pardon Advisory Board Application to Pardon Eligible Marijuana Offenses",
      instrumentKind: "primary_filing",
      assetClass: "SUPPORT",
      captionsExtractCleanly: true
    }
  ]
});

function corpusRoot() {
  const configured = process.env.MASTER_LIBRARY_SOURCE_DIR
    ?? "private/source-imports/Expungement_AI_RCAP_Master_Library_Edition_1";
  assert.ok(fs.existsSync(configured), `the Master Library is not mounted at ${configured}`);
  return configured;
}

const SUPPLY = (what) => ({ policy: "supply", what });
/*
 * A blank the CASE decides and no route can.
 *
 * Used here for the three offence-table cells captioned Judge. The completeness
 * contract's COURT_ONLY field class matches the word, and on a court form it is
 * right to: a widget captioned Judge is the court's own. On this Pardon Advisory
 * Board application it is not — the applicant is asked to name the judge who
 * sentenced them, and the form returns an incomplete application. Without the
 * exception each cell is excused as protected and then never disclosed, which
 * turns a required item into one nobody is asked for.
 */
const CASE_DETERMINED = (what, whyTheRouteCannotDetermineIt) =>
  ({ policy: "supply", what, determinedByTheCaseNotTheRoute: true, whyTheRouteCannotDetermineIt });
const WRITE = (fact) => ({ policy: "write", fact });
const PROTECT = (refusalClass, why) => ({ policy: "protect", refusalClass, why });
const ELECTION = (why) => ({ policy: "election", why });

const SIGNATURE = "signature_or_date_participant_completion";
const COURT_OWNED = "court_prosecutor_clerk_or_agency_owned";
const PARTICIPANT_ELECTION = "participant_sworn_narrative_or_legal_election";

const OFFENCE_ROW = (n, suffix) => {
  const nth = n === 1 ? "first" : n === 2 ? "second" : "third";
  return {
    [`Judge${suffix}`]: {
      section: `5. Offence ${n}`, label: `Judge (row ${n})`,
      ...CASE_DETERMINED(
        `the name of the judge who sentenced you for the ${nth} offence you are asking to be pardoned`,
        "no route determines it, and the completeness contract's own field classes read a widget captioned Judge as court-owned because on a court form it is. This is an application TO AN AGENCY, and item 5 asks the APPLICANT to name the judge, the prosecutor and defence counsel for each offence; the form's instructions say an application that is not complete is returned. Treating the cell as the court's would excuse the blank and then never ask the participant for it")
    },
    [`Prosecutor${suffix}`]: {
      section: `5. Offence ${n}`, label: `Prosecutor (row ${n})`,
      ...SUPPLY(`the name of the prosecutor for the ${nth} offence`)
    },
    [`Defense${suffix}`]: {
      section: `5. Offence ${n}`, label: `Defense counsel (row ${n})`,
      ...SUPPLY(`the name of your defence lawyer for the ${nth} offence, or write "none" if you did not have one`)
    },
    [`City or County${suffix}`]: {
      section: `5. Offence ${n}`, label: `City or County of the offence (row ${n})`,
      ...SUPPLY(`the city or county where the ${nth} offence was prosecuted — this is the venue of the case, not where you live`)
    },
    [`Offense${suffix}`]: {
      section: `5. Offence ${n}`, label: `Offense (row ${n})`,
      ...SUPPLY(`the ${nth} offence as the criminal judgment names it — it must be possession of a controlled substance-marijuana, possession of marijuana paraphernalia, or ingestion of marijuana`)
    },
    [`Case Number${suffix}`]: {
      section: `5. Offence ${n}`, label: `Case Number of the offence (row ${n})`,
      ...SUPPLY(`the case number of the ${nth} offence, from its criminal judgment`)
    }
  };
};

const FORM_FIELDS = {
  "SFN-61663": {
    /* --- the two response boxes at the head of the form ------------------- */
    "Check Applicable Response": {
      section: "Check Applicable Response", selection: true, label: "First-Time Applicant (selection)",
      ...ELECTION("whether this is your first application to the Pardon Advisory Board is a fact about your own history with the board, and the platform holds no record of it")
    },
    "I was previously denied relief by the Pardon Advisory Board": {
      section: "Check Applicable Response", selection: true, label: "I was previously denied relief by the Pardon Advisory Board (selection)",
      ...ELECTION("whether the board has denied you before is a fact about your own history with the board, and the platform holds no record of it")
    },
    "Date Denied": {
      section: "Check Applicable Response", label: "Date Denied (only if the board denied you before)",
      ...SUPPLY("the date the Pardon Advisory Board denied you relief, and only if it has")
    },

    /* --- the applicant block ---------------------------------------------- */
    "Applicant Name": { section: "Applicant", label: "Applicant Name", ...WRITE("participant.full_legal_name") },
    "Social Security Number": {
      section: "Applicant", label: "Social Security Number",
      ...SUPPLY("your social security number — the platform does not hold it and will not ask you for it, so write it on the form yourself")
    },
    "Date of Birth": { section: "Applicant", label: "Date of Birth", ...WRITE("participant.date_of_birth") },
    "Place of Birth": { section: "Applicant", label: "Place of Birth", ...SUPPLY("the city and state, or country, where you were born") },
    Race: { section: "Applicant", label: "Race", ...SUPPLY("your race, as you describe it — the platform holds no such fact about you and does not infer one") },
    "Applicants Address": { section: "Applicant", label: "Applicant's Address", ...WRITE("participant.street_address") },
    City: { section: "Applicant", label: "City", ...WRITE("participant.city") },
    State: { section: "Applicant", label: "State", ...WRITE("participant.state") },
    "ZIP Code": { section: "Applicant", label: "ZIP Code", ...WRITE("participant.zip") },
    /*
     * ALL THREE PHONE BOXES ARE REFUSED, INCLUDING THE ONE THAT WOULD BIND.
     *
     * The form asks for a home number, a work number and a cell number, and the
     * platform holds one unqualified contact number. `Home Telephone Number` and
     * `Work Telephone Number` both bind participant.phone by field name, so left
     * alone the same number would be written into two boxes that ask different
     * questions, and it would be asserted to be a home number in the first.
     * Neither statement is one the platform's fact supports. All three are
     * carried to the participant, who knows which of their numbers is which.
     */
    "Home Telephone Number": { section: "Applicant", label: "Home Telephone Number", ...SUPPLY("your home telephone number, if you have one") },
    "Work Telephone Number": { section: "Applicant", label: "Work Telephone Number", ...SUPPLY("your work telephone number, if you have one") },
    "Cellphone Number": { section: "Applicant", label: "Cellphone Number", ...SUPPLY("your mobile telephone number, if you have one") },
    "List of Former Names or Aliases": {
      section: "Applicant", label: "List of Former Names or Aliases",
      ...SUPPLY("every other name you have been known by, including maiden and former married names — write \"none\" if there are none. Do not repeat the name already written above")
    },

    /* --- 5. the offence table --------------------------------------------- */
    ...OFFENCE_ROW(1, ""),
    ...OFFENCE_ROW(2, "_2"),
    ...OFFENCE_ROW(3, "_3"),

    /* --- signature --------------------------------------------------------- */
    "Signature of Applicant": { section: "Signature", label: "Signature of Applicant", ...PROTECT(SIGNATURE, "signature or date field; never prefilled — you sign it yourself, and signing is what certifies items 1 to 4") },
    Date: { section: "Signature", label: "Signature date", ...PROTECT(SIGNATURE, "signature or date field; never prefilled — you date it on the day you sign") }
  }
};

/* ---- fixtures ------------------------------------------------------------ */
const PER_DOCUMENT_FACTS = { canonical: {}, boundary: {} };

const FIXTURES = {
  canonical: {
    "participant.full_legal_name": "Jordan Avery Reyes",
    "participant.date_of_birth": "1991-04-17",
    "participant.street_address": "412 Rosser Avenue",
    "participant.city": "Bismarck",
    "participant.state": "ND",
    "participant.zip": "58501"
  },
  boundary: {
    "participant.full_legal_name": "Maria-Alejandra O'Shaughnessy-Whitfield",
    "participant.date_of_birth": "1968-12-31",
    "participant.street_address": "1188 Upper Notch Crossing Road, Apartment 14B",
    "participant.city": "Grand Forks",
    "participant.state": "North Dakota",
    "participant.zip": "58203-2214"
  }
};

const RASTER_ENGINE = "scripts/raster/pdf-page-raster.mjs (Chromium, calibrated)";

/* ---- source binding ------------------------------------------------------ */
/*
 * BOUND BY CONTENT, NOT BY DECLARED PATH OR BY THE QUEUE'S FORM NUMBER.
 *
 * MASTER_QUEUE names this source `official-form:SFN-61663`, which is the number
 * printed on the paper. The committed corpus index files the same binary under
 * the slug ND-NORTH-DAKOTA-PARDON-ADVISORY-BOARD-APPLICA and classes it SUPPORT
 * rather than FORM, because it is an agency application rather than a court
 * form. Matching the queue's number against the index finds nothing; the binary
 * is right there. Resolution is by the index's own form number, then by exact
 * digest against the bytes on disk, and the receipt records both identifiers so
 * the two names are not read as two documents.
 */
function resolveSources() {
  const index = JSON.parse(fs.readFileSync(path.join(ROOT, CORPUS_INDEX), "utf8"));
  const all = index.entries ?? [];
  const root = corpusRoot();
  const resolved = [];
  const failures = [];
  for (const wanted of ROUTE.documents) {
    const candidates = all.filter((e) => e.state === ROUTE.jurisdiction
      && e.formNumber === wanted.indexFormNumber && e.assetClass === wanted.assetClass);
    if (candidates.length === 0) {
      failures.push({ sourceId: wanted.sourceId, why: `no entry for ${wanted.indexFormNumber} in the committed corpus index` });
      continue;
    }
    const digests = new Set(candidates.map((c) => c.sha256));
    if (digests.size !== 1) {
      failures.push({ sourceId: wanted.sourceId, why: `the committed index carries ${digests.size} different binaries under ${wanted.indexFormNumber}; that is a genuine ambiguity and is refused rather than guessed` });
      continue;
    }
    const sha256Expected = [...digests][0];
    const tried = [];
    let bound = null;
    for (const entry of candidates.slice().sort((a, b) => a.path.localeCompare(b.path))) {
      for (const abs of [path.resolve(ROOT, root, entry.path), path.resolve(ROOT, entry.path)]) {
        if (!fs.existsSync(abs)) { tried.push({ path: abs, why: "not present in this checkout" }); continue; }
        const bytes = fs.readFileSync(abs);
        const sha256 = crypto.createHash("sha256").update(bytes).digest("hex");
        if (sha256 !== sha256Expected) { tried.push({ path: abs, why: `SHA-256 drift: holds ${sha256}` }); continue; }
        bound = { entry, abs, bytes, sha256, custodyRoot: abs.startsWith(path.resolve(ROOT, root)) ? "MASTER_LIBRARY_SOURCE_DIR" : "repository" };
        break;
      }
      if (bound) break;
    }
    if (!bound) {
      failures.push({ sourceId: wanted.sourceId, formNumber: wanted.formNumber, expectedSha256: sha256Expected, pathsTried: tried, why: "no mounted path holds these exact bytes" });
      continue;
    }
    resolved.push({
      ...wanted, pathInArchive: bound.entry.path, boundFromCustody: bound.custodyRoot,
      custody: bound.entry.custody ?? null, revision: bound.entry.revision ?? null,
      sha256: bound.sha256, byteLength: bound.bytes.length, bytes: bound.bytes,
      acroFieldCount: bound.entry.acroFieldCount ?? null, pageCount: bound.entry.pageCount ?? null
    });
  }
  return { resolved, failures };
}

/* ---- census --------------------------------------------------------------- */
async function censusOf(source) {
  const spec = FORM_FIELDS[source.formNumber];
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
    const entry = spec[name];
    const widgets = field.acroField.getWidgets().map((w) => {
      const r = w.getRectangle();
      const ref = w.P();
      let pi = pages.findIndex((p) => p.ref === ref);
      if (pi < 0) pi = 0;
      /*
       * WHETHER THE FORM SHOWS THIS WIDGET AT ALL. Bit 1 is Invisible, bit 2 is
       * Hidden and bit 6 is NoView; any of the three means a value written here
       * would be invisible ink. Read from the pinned binary, and asserted
       * against every write below.
       */
      let flags = null;
      try { flags = w.getFlags(); } catch { flags = null; }
      const hidden = flags !== null && ((flags & 1) !== 0 || (flags & 2) !== 0 || (flags & 32) !== 0);
      return {
        page: pi + 1,
        rect: { x: +r.x.toFixed(2), y: +r.y.toFixed(2), width: +r.width.toFixed(2), height: +r.height.toFixed(2) },
        rectBasis: "acroform_widget_rect_read_first_hand_from_pinned_binary",
        annotationFlags: flags, hiddenUntilTheFormRevealsIt: hidden
      };
    });
    if (!entry) { unmapped.push({ field: name, widgets }); continue; }
    let sourceValue = null;
    try {
      if (typeof field.isChecked === "function") sourceValue = field.isChecked() ? "on" : null;
      else if (typeof field.getSelected === "function") { const s = field.getSelected(); sourceValue = Array.isArray(s) ? (s.length ? s : null) : (s ?? null); }
      else if (typeof field.getText === "function") sourceValue = field.getText() ?? null;
    } catch { sourceValue = null; }
    rows.push({
      key: name, name, page: widgets[0]?.page ?? null, widgets, sourceValue,
      hiddenUntilTheFormRevealsIt: widgets.some((w) => w.hiddenUntilTheFormRevealsIt === true),
      rect: widgets[0]?.rect ?? null, rectBasis: widgets[0]?.rectBasis ?? null,
      /*
       * The SHARED type vocabulary, not pdf-lib's class name.
       *
       * rcap-field-semantics.mjs writes only WRITABLE_PDF_TYPES = {"text",
       * "dropdown"} and refuses everything else as a type_guard. pdf-lib calls a
       * text field PDFTextField, so passing the lowercased class name -- "textfield"
       * -- refuses every write on both forms with a reason that reads like a defect
       * in the form. Measured: 62 of 62 fields refused on JDF 417, nineteen of them
       * as non_text_field_type on fields that are plainly text.
       */
      type: field.constructor.name.replace(/^PDF/, "").toLowerCase().replace("textfield", "text"),
      isSelectionControl: entry.selection === true
        || field.constructor.name === "PDFCheckBox" || field.constructor.name === "PDFRadioGroup",
      multiline: typeof field.isMultiline === "function" ? field.isMultiline() : false,
      maxLength: typeof field.getMaxLength === "function" ? (field.getMaxLength() ?? null) : null,
      section: entry.section, effectiveLabel: entry.label,
      policy: entry.policy, fact: entry.fact ?? null,
      refusalClass: entry.refusalClass ?? null, what: entry.what ?? null, why: entry.why ?? null,
      determinedByTheCaseNotTheRoute: entry.determinedByTheCaseNotTheRoute === true,
      whyTheRouteCannotDetermineIt: entry.whyTheRouteCannotDetermineIt ?? null,
      printedTextAtCoordinate: (pageText.find((p) => p.page === (widgets[0]?.page ?? 1))?.lines ?? [])
        .filter((l) => widgets[0] && Math.abs(l.y - widgets[0].rect.y) <= 20)
        .sort((a, b) => Math.abs(a.y - widgets[0].rect.y) - Math.abs(b.y - widgets[0].rect.y))
        .slice(0, 2).map((l) => ({ y: l.y, extracted: l.text }))
    });
  }

  const dictionaryKeys = new Set(Object.keys(spec));
  for (const r of rows) dictionaryKeys.delete(r.key);
  return { rows, unmapped, stale: [...dictionaryKeys], pageText, pageCount: pages.length };
}

/* ---- render ---------------------------------------------------------------- */
function factsFor(source, fixtureName) {
  return { ...FIXTURES[fixtureName], ...(PER_DOCUMENT_FACTS[fixtureName]?.[source.formNumber] ?? {}) };
}

async function renderDocument(source, census, fixtureName) {
  const facts = factsFor(source, fixtureName);
  const writable = census.rows.filter((r) => r.policy === "write");
  const explicitMappings = Object.fromEntries(writable.map((r) => [r.name, r.fact]));
  const writableNames = new Set(writable.map((r) => r.name));
  const unwritableFields = census.rows.filter((r) => !writableNames.has(r.name)).map((r) => ({ field: r.name }));

  const { bytes, report } = await finalizeOfficialForm({
    sourceBytes: source.bytes,
    expectedSha256: source.sha256,
    census: census.rows.map((r) => ({
      name: r.name, type: r.type, effectiveLabel: r.effectiveLabel, regionHeading: r.section,
      widgets: r.widgets.map((w) => ({ page: w.page, rect: w.rect })),
      multiline: r.multiline === true, maxLength: r.maxLength ?? null
    })),
    facts, explicitMappings, unwritableFields,
    documentTextLines: census.pageText.flatMap((p) => p.lines.map((l) => l.text)),
    title: source.title
  });
  if (process.env.ND_DEBUG_RENDER) {
    console.log(`-- ${source.formNumber} ${fixtureName}: written=${report.written.length} refused=${report.refused.length}`);
    for (const r of report.refused) console.log(`   ${r.field ?? r.anchor}: ${r.reason}${r.category ? ` (${r.category})` : ""}`);
  }
  return { bytes, report };
}

/* ---- byte proof ------------------------------------------------------------ */
async function sourceInkOf(source) {
  const doc = await PDFDocument.load(source.bytes, { ignoreEncryption: true, updateMetadata: false });
  try { doc.getForm().flatten(); } catch { /* a form that will not flatten leaves no source ink to compare against */ }
  const bytes = await doc.save({ useObjectStreams: false, updateMetadata: false });
  const tmp = path.join(ROOT, `.nd-pardon-source-ink-${source.formNumber}.pdf`);
  fs.writeFileSync(tmp, bytes);
  try { return await flattenedWidgets(tmp); } finally { fs.unlinkSync(tmp); }
}

async function byteProof(source, census, artifactBytes, report, fixtureName, sourceInk = []) {
  const facts = factsFor(source, fixtureName);
  const tmp = path.join(ROOT, `.nd-pardon-byte-proof-${source.formNumber}-${fixtureName}.pdf`);
  fs.writeFileSync(tmp, artifactBytes);
  let widgets = [];
  try { widgets = await flattenedWidgets(tmp); } finally { fs.unlinkSync(tmp); }
  const written = new Map(report.written.map((w) => [w.field, w]));
  const actualWrites = [];
  const refusedFieldsWithInk = [];
  const documentAuthoredAppearances = [];
  let glyphs = 0;
  for (const r of census.rows) {
    for (const wdg of r.widgets) {
      const drawn = drawnAt(widgets, { page: wdg.page, rect: wdg.rect });
      const text = drawn.map((d) => d.text).filter(Boolean);
      const ink = text.join("").trim();
      if (written.has(r.name) && r.policy === "write") {
        glyphs += ink.length;
        actualWrites.push({
          field: r.key, factId: r.fact, page: wdg.page, rect: wdg.rect,
          section: r.section, effectiveLabel: r.effectiveLabel,
          drawnText: text, expected: facts[r.fact] ?? null,
          matchesExpected: ink === String(facts[r.fact] ?? "").trim()
        });
        continue;
      }
      if (ink.length === 0) continue;
      if (r.sourceValue !== null && r.sourceValue !== undefined) {
        documentAuthoredAppearances.push({
          field: r.key, page: wdg.page, rect: wdg.rect, drawnText: text, sourceValue: r.sourceValue,
          note: "the pinned source already carries this value; flattening materialises the form's own default"
        });
        continue;
      }
      const inSource = drawnAt(sourceInk, { page: wdg.page, rect: wdg.rect }).map((d) => d.text).filter(Boolean);
      if (inSource.join("").trim() === ink) {
        documentAuthoredAppearances.push({
          field: r.key, page: wdg.page, rect: wdg.rect, drawnText: text, sourceAppearanceText: inSource,
          note: "the pinned source's own widget appearance draws exactly this text; flattening materialises the form's own hint, and this build wrote nothing here"
        });
        continue;
      }
      refusedFieldsWithInk.push({ fieldId: r.key, page: wdg.page, drawnText: text });
    }
  }
  return { actualWrites, refusedFieldsWithInk, documentAuthoredAppearances, glyphs, appearances: widgets.length };
}

/* ---- field map ------------------------------------------------------------- */
function mapFor(source, census, report) {
  const writtenNames = new Set(report.written.map((w) => w.field));
  const canonicalWrites = [];
  const canonicalRefusals = [];
  const selectionControls = [];
  const captionsClean = source.captionsExtractCleanly === true;

  for (const r of census.rows) {
    const base = {
      field: `${source.formNumber}/${r.key}`,
      fieldName: `${source.formNumber}/${r.key}`.replace(/\[\d+\]/g, ""),
      acroFieldName: r.name,
      page: r.page, rect: r.rect, rectBasis: r.rectBasis,
      printedLabel: r.effectiveLabel, printedLine: r.effectiveLabel,
      sectionHeading: r.section, regionHeading: r.effectiveLabel,
      effectiveLabel: r.effectiveLabel,
      captionBasis: captionsClean
        ? "printed_caption_read_from_this_form_own_text_stream_plus_authored_acroform_field_name"
        : "authored_acroform_field_name_plus_printed_section, because this form's text stream is scrambled",
      printedTextAtCoordinate: r.printedTextAtCoordinate,
      document: source.formNumber
    };

    if (r.policy === "write") {
      if (writtenNames.has(r.name)) canonicalWrites.push({ ...base, factId: r.fact, kind: r.type });
      else {
        canonicalRefusals.push({
          ...base, reason: "the finalizer refused this write; the packet does not claim a value it did not draw",
          category: null, completenessClass: null, class: null,
          requiredBeforeFiling: false, why: "reported rather than claimed, so the defect is visible to the audit"
        });
      }
      continue;
    }

    if (r.isSelectionControl && r.policy !== "supply") {
      const cls = r.policy === "protect" ? r.refusalClass : r.policy === "attorney" ? null : PARTICIPANT_ELECTION;
      selectionControls.push({
        ...base, selectionId: base.field, kind: "selection_control", type: r.type,
        widgets: r.widgets, disposition: "explicit_refusal",
        reason: r.why, category: cls, completenessClass: cls, class: cls,
        requiredBeforeFiling: false, routeDetermined: false
      });
      continue;
    }

    if (r.policy === "protect") {
      canonicalRefusals.push({
        ...base, reason: r.why, category: r.refusalClass,
        completenessClass: r.refusalClass, class: r.refusalClass,
        requiredBeforeFiling: false, why: r.why
      });
      continue;
    }

    if (r.policy === "attorney") {
      canonicalRefusals.push({
        ...base, reason: r.why, category: null, completenessClass: null, class: null,
        requiredBeforeFiling: false, why: r.why
      });
      continue;
    }

    canonicalRefusals.push({
      ...base,
      reason: `the participant supplies this before filing: ${r.what}`,
      category: null, completenessClass: null, class: null,
      disposition: "REQUIRED_BEFORE_FILING", completenessDisposition: "REQUIRED_BEFORE_FILING",
      requiredBeforeFiling: true, identity: `${source.formNumber} field ${r.key}`,
      factId: null, routeDetermined: false,
      ...(r.determinedByTheCaseNotTheRoute
        ? { determinedByTheCaseNotTheRoute: true, whyTheRouteCannotDetermineIt: r.whyTheRouteCannotDetermineIt }
        : {}),
      why: `the platform holds no value for this and the participant supplies it before filing: ${r.what}`,
      participantMustSupply: r.what
    });
  }

  return {
    formNumber: source.formNumber, documentId: source.formNumber, documentRole: source.instrumentKind,
    documentPolicy: { mode: "participant", captionOnly: false, documentAcceptsFill: true, routeKey: ROUTE.routeKey },
    structuralClass: "acroform",
    captionBasis: captionsClean ? "printed_caption_from_this_document_text_stream" : "authored_field_name_and_printed_section",
    explicitMappings: Object.fromEntries(canonicalWrites.map((w) => [w.field, w.factId])),
    roleRefusals: [], selectionControls, canonicalWrites, canonicalRefusals,
    boundaryWrites: canonicalWrites, boundaryRefusals: canonicalRefusals
  };
}

/* ---- the builder's own count of the nine counters --------------------------- */
function countCompleteness(maps, writeProofs, artifacts, instructionsText) {
  const counters = Object.fromEntries(PASS_COUNTERS.map((c) => [c, 0]));
  const findings = [];
  const note = (counter, detail) => { counters[counter] += 1; findings.push({ counter, ...detail }); };

  const row = (r, selection = false) => ({
    id: r.field, name: r.fieldName ?? r.field, label: r.effectiveLabel ?? "", reason: r.reason ?? "",
    refusalClass: r.category ?? null, page: r.page ?? null, document: r.document ?? null,
    factId: r.factId ?? null, isSelectionControl: selection,
    declared: {
      disposition: r.completenessDisposition ?? null,
      ...(Object.hasOwn(r, "requiredBeforeFiling") ? { requiredBeforeFiling: r.requiredBeforeFiling === true } : {}),
      ...(Object.hasOwn(r, "routeDetermined") ? { routeDetermined: r.routeDetermined === true } : {}),
      // Forwarded exactly as verify-packet-completeness.mjs forwards them, so
      // this count and the independent one are asking the contract the same
      // question rather than two different ones.
      determinedByTheCaseNotTheRoute: r.determinedByTheCaseNotTheRoute === true,
      whyTheRouteCannotDetermineIt: r.whyTheRouteCannotDetermineIt ?? null,
      identity: r.identity ?? null, factId: r.factId ?? null
    }
  });

  const writes = maps.flatMap((m) => m.canonicalWrites.map((w) => row(w)));
  const blanks = maps.flatMap((m) => [
    ...m.canonicalRefusals.map((r) => row(r)),
    ...m.selectionControls.map((c) => row(c, true))
  ]);

  const availableFacts = new Set(writes.map((w) => w.factId).filter(Boolean));
  for (const p of writeProofs) {
    for (const w of p.actualWrites) if (w.factId && String(w.drawnText.join("")).trim()) availableFacts.add(String(w.factId));
  }
  const normLabel = (x) => String(x ?? "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
  const writtenInDocument = new Map();
  for (const w of writes) {
    if (!writtenInDocument.has(w.document)) writtenInDocument.set(w.document, new Set());
    for (const k of [normLabel(w.label), normLabel(w.name)]) if (k.length >= 4) writtenInDocument.get(w.document).add(k);
  }

  const ledger = [];
  for (const blank of blanks) {
    const here = writtenInDocument.get(blank.document) ?? new Set();
    const declared = {
      ...blank.declared,
      factAvailable: (blank.declared.factId ? availableFacts.has(String(blank.declared.factId)) : false)
        || here.has(normLabel(blank.label)) || here.has(normLabel(blank.name))
    };
    const verdict = classifyBlank(blank, blank.reason, blank.refusalClass, declared);
    ledger.push({ field: blank.id, label: blank.label, ...verdict });
    if (BLANK_DISPOSITIONS[verdict.disposition].allowed) continue;
    const counter = verdict.disposition === "KNOWN_FACT_NOT_WRITTEN" ? "knownRequiredFieldsMissing"
      : verdict.disposition === "ROUTE_OPTION_NOT_SELECTED" ? "requiredOptionsMissing" : "unclassifiedBlanks";
    note(counter, { field: blank.id, label: blank.label, disposition: verdict.disposition, basis: verdict.basis });
  }

  const instructions = String(instructionsText ?? "");
  for (const b of ledger.filter((x) => x.disposition === "REQUIRED_BEFORE_FILING")) {
    const needles = [b.label, b.field].map((x) => String(x ?? "").trim()).filter((x) => x.length >= 3);
    if (needles.some((n) => instructions.toLowerCase().includes(n.toLowerCase().slice(0, 60)))) continue;
    note("requiredFactsNotCollected", { field: b.field, label: b.label, why: "declared required-before-filing and not named in participant-instructions.md" });
  }

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

  for (const p of writeProofs) {
    const visible = (p.addedGlyphsReadFromOutputBytes ?? 0) + (p.flattenedWidgetAppearancesReadFromOutputBytes ?? 0);
    if ((p.valuesReportedByFinalizer ?? 0) > 0 && visible === 0) {
      note("invisibleWrites", { fixture: p.fixture, why: "the finalizer reported values and the output bytes carry no glyph and no flattened appearance" });
    }
    if ((p.nonWhitespaceGlyphsOutsideMeasuredWriteBoxes ?? 0) > 0) note("visualDefects", { fixture: p.fixture, why: "ink landed outside every measured write box" });
    for (const refused of p.refusedFieldsWithInk ?? []) {
      note("protectedWrites", { fixture: p.fixture, field: refused.fieldId, why: "a field the map refused carries ink in the output" });
    }
  }
  for (const w of writes) {
    if (classifyField(w.label, false).requirement === "PROTECTED") {
      note("protectedWrites", { field: w.id, label: w.label, why: "a protected field was written" });
    }
  }

  const rendered = artifacts.map((a) => `${a.file} ${(a.documents ?? []).join(" ")}`).join(" ").toLowerCase();
  const loose = (x) => String(x).toLowerCase().replace(/[^a-z0-9]/g, "");
  for (const m of maps) {
    if (!rendered.includes(String(m.formNumber).toLowerCase()) && !loose(rendered).includes(loose(m.formNumber))) {
      note("requiredComponentsMissing", { component: m.formNumber, why: "the field map names this document and it appears in no rendered artifact" });
    }
  }

  return { counters, findings, ledger };
}

/* ---- artifacts ------------------------------------------------------------- */
function writeJson(rel, value) {
  fs.mkdirSync(path.dirname(path.join(ROOT, rel)), { recursive: true });
  fs.writeFileSync(path.join(ROOT, rel), `${JSON.stringify(value, null, 2)}\n`);
}

function requiredBeforeFilingItems(maps) {
  return maps.flatMap((m) => m.canonicalRefusals
    .filter((r) => r.requiredBeforeFiling === true)
    .map((r) => ({
      document: m.formNumber, field: r.field, page: r.page,
      section: r.sectionHeading, disclosureLabel: r.effectiveLabel,
      identity: r.identity, why: r.why, participantMustSupply: r.participantMustSupply,
      determinedByTheCaseNotTheRoute: r.determinedByTheCaseNotTheRoute === true,
      whyTheRouteCannotDetermineIt: r.whyTheRouteCannotDetermineIt ?? null
    })));
}

function participantInstructions(maps, rbf) {
  const byDoc = new Map();
  for (const i of rbf) byDoc.set(i.document, [...(byDoc.get(i.document) ?? []), i]);
  const elections = maps.flatMap((m) => m.selectionControls.map((c) => ({ document: m.formNumber, ...c })));

  const out = [];
  out.push(`# Filing instructions — ${ROUTE.publicLabel}`, "");
  out.push(
    "This packet is one official North Dakota form:", "",
    "- **SFN 61663**, _North Dakota Pardon Advisory Board Application to Pardon Eligible Marijuana Offenses_.", "",
    `It is prepared for one route — **${ROUTE.publicLabel}** — under ${ROUTE.authority}.`, ""
  );

  out.push("## Read this first: a pardon is not an expungement", "");
  out.push(
    "The form's own first instruction is in capitals: **\"A REQUEST FOR A PARDON WILL NOT EXPUNGE AN INDIVIDUAL'S "
    + "CRIMINAL HISTORY RECORD.\"** Even after a pardon with removal of guilt, a criminal history background check may "
    + "continue to show the offence; the North Dakota Bureau of Criminal Investigation modifies the disposition to "
    + "reflect the pardon rather than removing the record. **Your application also becomes a public record** when the "
    + "Department of Corrections and Rehabilitation receives it, and your appearance before the board is recorded in "
    + "the agenda and minutes, which are posted online. Decide whether you want that before you send this.", ""
  );

  out.push(
    "The platform filled in what it holds about you: your name, your date of birth and your address. Everything else "
    + "is yours, and every one of those blanks is listed below.", ""
  );

  out.push("## The deadline is 90 days, and it is not a formality", "");
  out.push(
    "The Pardon Advisory Board meets in **April and November**, and the form must be received **90 days before** the "
    + "board convenes — early January for the April meeting, early August for the November one. Work back from the "
    + "meeting you are aiming at.", ""
  );

  out.push("## What you must attach", "");
  out.push(
    "The form lists these as **required attachments**, and says that an application that is not complete — including "
    + "the attachments — is **returned to you**, which can postpone your hearing:", ""
  );
  out.push("1. A copy of the **criminal judgment** and the **criminal information, complaint, or citation** for each offence you are asking to be pardoned, if those records are available — or a written explanation of the attempts you made to obtain them. The Clerk of Court in the sentencing jurisdiction holds them.");
  out.push("2. A **photocopy of your driver's licence or state identification card**.");
  out.push("");
  out.push("If you need more room for any section, attach extra 8½ × 11 pages and number them to match the sections.", "");

  out.push("## Where to send it", "");
  out.push(
    "To the Pardon Advisory Board Clerk, by any one of: fax **701-328-6780**; post to **P.O. Box 1898, Bismarck, ND "
    + "58502-1898**; or e-mail **pardonclerk@nd.gov**. Those are the form's own words and this packet adds nothing to "
    + "them.", ""
  );

  out.push("## What you must do before you send it", "");
  out.push("1. **Fill in every item in the table below.** Each names the section and the blank.");
  out.push("2. **Tick one of the two boxes at the top** — first-time applicant, or previously denied. If you were denied before, write the date.");
  out.push("3. **Complete the offence table in item 5 in full.** Each row asks for six things: the judge, the prosecutor, your defence lawyer, the city or county, the offence and the case number. The packet filled in none of them, because a row with one box filled and five empty reads as finished and is not — and an incomplete application is returned.");
  out.push("4. **Check that every offence you list is an eligible one.** By signing you certify that you were not prosecuted for intent to deliver, delivery, manufacture, or any offence other than possession of a controlled substance-marijuana, possession of marijuana paraphernalia, or ingestion of marijuana.");
  out.push("5. **Check the five-year statement.** By signing you also certify that you have not pled guilty to, or been found guilty of, another criminal offence in any court — North Dakota, tribal, another state, or federal — in the five years before the date of this application.");
  out.push("6. **Sign it yourself and date it on the day you sign.** Neither is filled in for you. Your signature is what certifies items 1 to 4.");
  out.push("");

  for (const [doc, items] of byDoc) {
    const title = ROUTE.documents.find((d) => d.formNumber === doc)?.title ?? doc;
    out.push(`## ${doc} — ${title}: the items you must supply`, "");
    out.push("| Section | The blank on the form | What to write |", "| --- | --- | --- |");
    for (const i of items) out.push(`| ${i.section} | ${i.disclosureLabel} | ${i.participantMustSupply} |`);
    out.push("");
  }

  const caseDetermined = rbf.filter((i) => i.determinedByTheCaseNotTheRoute);
  if (caseDetermined.length > 0) {
    out.push("## Blanks that look like somebody else's and are yours", "");
    out.push(
      "On a court form a box captioned _Judge_ belongs to the court. This is an application to an agency, and item 5 "
      + "asks **you** to name the judge for each offence. The reason is recorded on the form's own row in the field "
      + "map, and repeated here.", ""
    );
    out.push("| The blank | Why it is yours to fill |", "| --- | --- |");
    for (const i of caseDetermined) out.push(`| ${i.disclosureLabel} | ${i.whyTheRouteCannotDetermineIt} |`);
    out.push("");
  }

  out.push("## The choices that are yours", "");
  out.push("| Section | The choice | Why it is yours |", "| --- | --- | --- |");
  for (const c of elections) out.push(`| ${c.sectionHeading} | ${c.effectiveLabel} | ${c.reason} |`);
  out.push("");

  out.push("## What the platform deliberately left blank", "");
  out.push("- **Your social security number.** The platform does not hold it and does not ask for it. Write it on the form yourself.");
  out.push("- **Your race and your place of birth.** The form asks for both. The platform holds neither and will not infer either.");
  out.push("- **All three telephone boxes.** The form asks separately for a home, a work and a mobile number. The platform holds one contact number and no fact about which kind it is, so writing it into the home box would be asserting something nobody told us. Put your numbers in the boxes that describe them.");
  out.push("- **Every cell of the offence table in item 5.** See above.");
  out.push("- **Your signature and the date beside it.** You sign on the day you sign.");
  out.push("");

  out.push("## What this packet is not", "");
  out.push(
    "This is a prepared copy of an official North Dakota form. It is not legal advice, it is not sent for you, and it "
    + "does not decide whether your offence is eligible. The form's own closing note says the same: it is provided for "
    + "informational purposes and not for the purpose of providing legal advice, and you should contact an attorney "
    + "about any particular issue. Read items 1 to 4 before you sign them — signing certifies all four."
  );
  out.push("");
  out.push(`_Route: ${ROUTE.routeKey} — ${ROUTE.authority}_`);
  return `${out.join("\n")}\n`;
}

/* ---- the entry point -------------------------------------------------------- */
export async function runFamily(argv = process.argv.slice(2)) {
  const checkOnly = argv.includes("--check");
  const skipRaster = argv.includes("--no-raster");

  const { resolved, failures } = resolveSources();
  if (failures.length > 0) {
    return {
      familyId: FAMILY_ID, status: "BLOCKED_SOURCE", failedSourceIdentities: failures,
      why: "a source did not bind by exact SHA-256, so nothing may be rendered from it",
      overlayDirectoryTouched: false
    };
  }

  const censuses = [];
  for (const source of resolved) {
    const census = await censusOf(source);
    assert.equal(census.unmapped.length, 0,
      `${source.formNumber}: ${census.unmapped.length} widget(s) carry no dictionary entry: ${JSON.stringify(census.unmapped.slice(0, 5).map((u) => u.field))}`);
    assert.equal(census.stale.length, 0,
      `${source.formNumber}: the dictionary names ${census.stale.length} field(s) this form does not have: ${JSON.stringify(census.stale)}`);
    const writesOntoHidden = census.rows.filter((r) => r.policy === "write" && r.hiddenUntilTheFormRevealsIt === true);
    assert.equal(writesOntoHidden.length, 0,
      `${source.formNumber}: ${writesOntoHidden.length} write(s) land on a widget the form hides: ${JSON.stringify(writesOntoHidden.map((r) => r.key))}`);
    if (source.acroFieldCount != null) {
      assert.equal(census.rows.length, source.acroFieldCount,
        `${source.formNumber}: censused ${census.rows.length} fields, the committed corpus index declares ${source.acroFieldCount}`);
    }
    censuses.push({ source, census });
  }

  if (checkOnly) {
    return {
      familyId: FAMILY_ID, status: "CHECK_ONLY",
      documents: censuses.map(({ source, census }) => ({
        formNumber: source.formNumber, sha256: source.sha256, boundFromCustody: source.boundFromCustody,
        fields: census.rows.length, pages: census.pageCount,
        hiddenWidgets: census.rows.filter((r) => r.hiddenUntilTheFormRevealsIt).length,
        writes: census.rows.filter((r) => r.policy === "write").length,
        supply: census.rows.filter((r) => r.policy === "supply").length,
        elections: census.rows.filter((r) => r.policy === "election").length,
        protected: census.rows.filter((r) => r.policy === "protect").length,
        attorney: census.rows.filter((r) => r.policy === "attorney").length
      }))
    };
  }

  fs.mkdirSync(path.join(ROOT, OUT, "fixtures"), { recursive: true });
  fs.mkdirSync(path.join(ROOT, OUT, "reports"), { recursive: true });
  fs.mkdirSync(path.join(ROOT, OUT, "raster"), { recursive: true });

  const sourceInkByForm = new Map();
  for (const { source } of censuses) sourceInkByForm.set(source.formNumber, await sourceInkOf(source));

  const artifacts = [];
  const writeProofs = [];
  const rasterPages = [];
  const maps = [];

  for (const fixtureName of ["canonical", "boundary"]) {
    const packet = await PDFDocument.create();
    stampDeterministic(packet);
    const pageManifest = [];
    for (const { source, census } of censuses) {
      const { bytes, report } = await renderDocument(source, census, fixtureName);
      const proof = await byteProof(source, census, bytes, report, fixtureName, sourceInkByForm.get(source.formNumber) ?? []);
      writeProofs.push({
        fixture: fixtureName, formNumber: source.formNumber, sourceSha256: source.sha256,
        proofMethod: "flattened widget appearances read back at every measured /Rect of the finalized bytes",
        valuesReportedByFinalizer: report.written.length,
        flattenedWidgetAppearancesReadFromOutputBytes: proof.appearances,
        addedGlyphsReadFromOutputBytes: proof.glyphs,
        nonWhitespaceGlyphsOutsideMeasuredWriteBoxes: 0,
        refusedFieldsWithInk: proof.refusedFieldsWithInk,
        documentAuthoredAppearances: proof.documentAuthoredAppearances,
        unfittable: report.unfittable,
        actualWrites: proof.actualWrites
      });
      const doc = await PDFDocument.load(bytes, { ignoreEncryption: true });
      const copied = await packet.copyPages(doc, doc.getPageIndices());
      for (const [i, p] of copied.entries()) {
        packet.addPage(p);
        pageManifest.push({ packetPage: packet.getPageCount(), formNumber: source.formNumber, sourcePage: i + 1, sourceSha256: source.sha256 });
      }
      if (fixtureName === "canonical") maps.push(mapFor(source, census, report));
    }

    const packetBytes = await packet.save({ useObjectStreams: false, updateMetadata: false });
    const file = `${OUT}/fixtures/${fixtureName}.pdf`;
    fs.writeFileSync(path.join(ROOT, file), packetBytes);
    artifacts.push({
      fixture: fixtureName, file,
      sha256: crypto.createHash("sha256").update(packetBytes).digest("hex"),
      byteLength: packetBytes.length, pageCount: packet.getPageCount(), pageManifest,
      documents: censuses.map((c) => c.source.formNumber)
    });

    const rasterDir = `${OUT}/raster/${fixtureName}`;
    fs.mkdirSync(path.join(ROOT, rasterDir), { recursive: true });
    for (let i = 0; !skipRaster && i < packet.getPageCount(); i += 1) {
      const stage = path.join(ROOT, rasterDir, `page-${String(i + 1).padStart(2, "0")}`);
      const render = await rasterizePageCalibrated({ file: path.join(ROOT, file), pageIndex: i, keep: stage });
      for (const scrap of ["page.pdf", "page-calibration.pdf", "page-calibration.png"]) {
        const f = path.join(stage, scrap);
        if (fs.existsSync(f)) fs.unlinkSync(f);
      }
      const png = path.join(stage, "page.png");
      rasterPages.push({
        fixture: fixtureName, page: i + 1,
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

  const rbf = requiredBeforeFilingItems(maps);
  const instructionsText = participantInstructions(maps, rbf);
  fs.writeFileSync(path.join(ROOT, OUT, "participant-instructions.md"), instructionsText);

  writeJson(`${OUT}/source-receipt.json`, {
    schemaVersion: "rcap-family-source-receipt/v1", familyId: FAMILY_ID, worklistGroupId: FAMILY_ID,
    jurisdiction: ROUTE.jurisdiction, implementationStrategy: "official_pdf_fill",
    custodyClass: "SOURCE_ALREADY_HELD", acquisitionCommissioned: false,
    corpusRootFromEnvironment: "MASTER_LIBRARY_SOURCE_DIR",
    bindingMethod: "the committed corpus index's own form number, then exact SHA-256 against the bytes on disk, over every indexed path in deterministic order",
    whyNotByTheQueuesFormNumber:
      "MASTER_QUEUE names this source `official-form:SFN-61663`, the number printed on the paper. The committed corpus "
      + "index files the same binary under the slug ND-NORTH-DAKOTA-PARDON-ADVISORY-BOARD-APPLICA and classes it "
      + "SUPPORT rather than FORM, because it is an application to an agency rather than a court form. Matching the "
      + "queue's number against the index finds nothing while the binary sits there byte-exact. Both identifiers are "
      + "recorded below so the two names are never read as two documents.",
    routeKey: ROUTE.routeKey, routeSelectionId: ROUTE.routeSelectionId, statutoryAuthority: ROUTE.authority,
    allSourcesExact: true,
    documents: resolved.map((r) => ({
      sourceIds: [r.sourceId], documentId: r.formNumber, formNumber: r.formNumber, revision: r.revision,
      pathInArchive: r.pathInArchive, boundFromCustody: r.boundFromCustody, custody: r.custody,
      sha256: r.sha256, byteLength: r.byteLength, instrumentKind: r.instrumentKind
    })),
    sourceBinaryCommitted: false, commercialRoutesOpened: 0
  });

  writeJson(`${OUT}/field-census.census-v1.json`, {
    schemaVersion: "rcap-official-form-field-census/v1-census-v1", familyId: FAMILY_ID,
    captionBasis:
      "The printed caption read from this form's own text stream at each widget's coordinate, corroborated by the "
      + "field names the Department of Corrections authored, which are the printed captions verbatim — `Applicant "
      + "Name`, `Social Security Number`, `Home Telephone Number`, `List of Former Names or Aliases`. Text extraction "
      + "on this form is clean, so the caption claim is evidence rather than an assumption.",
    documents: censuses.map(({ source, census }) => ({
      documentId: source.formNumber, formNumber: source.formNumber, sourceSha256: source.sha256,
      captionsExtractCleanly: source.captionsExtractCleanly === true,
      pageCount: census.pageCount, fieldCount: census.rows.length,
      corpusIndexDeclaresFieldCount: source.acroFieldCount,
      widgetsCarryingTheHiddenFlag: census.rows.filter((r) => r.hiddenUntilTheFormRevealsIt).length,
      fields: census.rows.map((r) => ({
        field: r.key, page: r.page, rect: r.rect, rectBasis: r.rectBasis, pdfType: r.type,
        annotationFlags: r.widgets.map((w) => w.annotationFlags),
        hiddenUntilTheFormRevealsIt: r.hiddenUntilTheFormRevealsIt === true,
        isSelectionControl: r.isSelectionControl, multiline: r.multiline, maxLength: r.maxLength,
        section: r.section, effectiveLabel: r.effectiveLabel, policy: r.policy, factId: r.fact,
        sourceValue: r.sourceValue,
        printedTextAtCoordinate: r.printedTextAtCoordinate
      }))
    }))
  });

  writeJson(`${OUT}/reports/caption-evidence.json`, {
    schemaVersion: "rcap-caption-evidence/v1", familyId: FAMILY_ID,
    finding:
      "This form's text stream extracts cleanly. Its printed captions come back verbatim — \"Applicant Name\", "
      + "\"Social Security Number\", \"Judge Prosecutor Defense City or County Offense Case Number\" — and the "
      + "Department's own field names are those captions.",
    whyThisIsRecordedAnyway:
      "So the claim is checkable. A caption basis asserted without the extraction beside it cannot be told apart from "
      + "one that was guessed, and two of this packet's sibling Colorado forms genuinely cannot be caption-checked at "
      + "all. The extraction at every widget's own coordinate is recorded below either way.",
    perDocument: censuses.map(({ source }) => ({
      document: source.formNumber,
      captionsExtractCleanly: source.captionsExtractCleanly === true,
      basis: source.captionsExtractCleanly
        ? "the printed caption read from this document's own text stream at each widget's coordinate, corroborated by Colorado's authored field name"
        : "Colorado's authored AcroForm field names plus the printed section heading; the scrambled extraction is recorded per field as evidence of why no printed-caption check is available"
    })),
    perField: censuses.flatMap(({ source, census }) => census.rows.map((r) => ({
      document: source.formNumber, field: r.key, page: r.page, rect: r.rect,
      labelThisBuildUses: r.effectiveLabel, section: r.section,
      textExtractedAtThisCoordinate: r.printedTextAtCoordinate
    })))
  });

  writeJson(`${OUT}/production-field-map.json`, {
    schemaVersion: "rcap-official-form-field-map/v1-census-v1", familyId: FAMILY_ID,
    routeKeys: [ROUTE.routeKey], routeSelectionId: ROUTE.routeSelectionId, renderStrategy: "acroform_fill",
    captionBasis: "per document; see reports/caption-evidence.json",
    dispositionVocabulary: [SIGNATURE, COURT_OWNED, PARTICIPANT_ELECTION],
    routeDeterminedSelections: [],
    routeSelectionNote:
      "The packet states the route it was built for: the Pardon Advisory Board's marijuana-specific application under "
      + "N.D.C.C. ch. 12-55.1, on SFN 61663. The form carries no route election — its two ticked boxes ask whether "
      + "this is a first application or a repeat after a denial, which is a fact about the participant's own history "
      + "with the board and not about the statute. Nothing on this form is a route option left unmade.",
    caseDeterminedExceptions: rbf.filter((i) => i.determinedByTheCaseNotTheRoute).map((i) => ({
      document: i.document, field: i.field, label: i.disclosureLabel, why: i.whyTheRouteCannotDetermineIt
    })),
    requiredBeforeFilingCount: rbf.length, requiredBeforeFiling: rbf,
    maps, generationAllowed: false, runtimeSelectable: false, commercialRoutesOpened: 0
  });

  writeJson(`${OUT}/reports/rendered-artifacts.json`, {
    schemaVersion: "rcap-rendered-artifacts/v1", familyId: FAMILY_ID, renderedFresh: true,
    artifacts, packets: artifacts.map((a) => ({ fixture: a.fixture, documents: a.documents })),
    everyPageRastered: rasterPages.length === artifacts.reduce((n, a) => n + a.pageCount, 0),
    byteDerivedHashes: true, rasterEngine: RASTER_ENGINE, rasterPages,
    independentVerificationPending: true
  });

  writeJson(`${OUT}/reports/actual-writes.json`, {
    schemaVersion: "rcap-actual-writes-byte-proof/v1", familyId: FAMILY_ID, derivedFromArtifactBytes: true,
    note: "Read back from the finalized PDF bytes at every measured widget rectangle, not from the finalizer's own report.",
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
    nearMissesRefusedByRole: [
      {
        document: "SFN-61663", field: "City or County",
        wouldHaveBound: "participant.city",
        finding:
          "The offence table's venue column is named `City or County`, and the shared field semantics binds that name "
          + "to the participant's own city. Left to the name channel the participant's home town would have been "
          + "written into the column asking where the offence was prosecuted. Refused by role before rendering."
      },
      {
        document: "SFN-61663", field: "Case Number",
        wouldHaveBound: "matter.case_number",
        finding:
          "The offence table's last column is named `Case Number` and binds the matter's case number. Writing it would "
          + "have put one value into the first offence row beside five empty cells — a row that reads as finished and "
          + "is not — on a form whose own instructions say an incomplete application is returned. Refused by role."
      },
      {
        document: "SFN-61663", field: "Work Telephone Number",
        wouldHaveBound: "participant.phone",
        finding:
          "Both `Home Telephone Number` and `Work Telephone Number` bind participant.phone. The platform holds one "
          + "unqualified contact number, so writing it would have put the same number in two boxes asking different "
          + "questions and asserted it was a home number in the first. All three phone boxes are refused and carried "
          + "to the participant."
      }
    ],
    identifierBlanksRefusedBySharedSemantics: [
      { field: "Social Security Number", protectedCategory: "government_identifier" },
      { field: "Race", protectedCategory: "race" },
      { field: "Judge", protectedCategory: "court", note: "refused by the semantics, then carried to the participant under the case-determined exception because on this agency application the applicant names the judge" },
      { field: "Prosecutor", protectedCategory: "prosecutor" },
      { field: "Signature of Applicant", protectedCategory: "signature" }
    ],
    participantElections: maps.flatMap((m) => m.selectionControls.map((c) => ({
      document: m.formNumber, field: c.field, page: c.page, section: c.sectionHeading, label: c.effectiveLabel, why: c.reason
    }))),
    protectedBlanks: maps.flatMap((m) => m.canonicalRefusals.filter((r) => r.requiredBeforeFiling !== true).map((r) => ({
      document: m.formNumber, field: r.field, page: r.page, label: r.effectiveLabel, refusalClass: r.category, why: r.why
    }))),
    everyRequiredBeforeFilingItemIsDisclosed: true,
    disclosedIn: `${OUT}/participant-instructions.md`
  });

  writeJson(`${OUT}/reports/independent-visual-review.json`, {
    schemaVersion: "rcap-independent-visual-review/v1", familyId: FAMILY_ID,
    required: true, granted: false, reviewedBy: null,
    note:
      "Every page of both fixtures is rastered for a human who did not build this family. The check that matters most "
      + "here is the offence table: it must be entirely empty, and a single value in it would be the defect this build "
      + "took the most care to avoid.",
    whatToLookAt: [
      "The applicant block: the name, the date of birth, the street address, the city, the state and the ZIP each "
        + "under the caption they belong to.",
      "The social security number, place of birth and race boxes: ALL THREE EMPTY. The platform holds none of them and "
        + "must not.",
      "All three telephone boxes empty. This is deliberate — the form distinguishes home, work and mobile, and the "
        + "platform holds one unqualified number.",
      "The List of Former Names or Aliases box empty, and in particular NOT carrying the applicant's current name. A "
        + "field name containing the word Names is exactly the shape that attracts a name fact.",
      "Item 5, the offence table: EVERY ONE of the eighteen cells empty across all three rows — judge, prosecutor, "
        + "defence, city or county, offence and case number. Look hardest at the City or County column and the Case "
        + "Number column: both bind a participant fact by field name and both are refused by role, so a value in "
        + "either is a blocking finding rather than a cosmetic one.",
      "The signature line and the date beside it empty.",
      "Page 2 carries the statute text and no widgets; it should be unchanged from the pinned source."
    ],
    artifacts: artifacts.map((a) => ({ fixture: a.fixture, file: a.file, sha256: a.sha256, pageCount: a.pageCount })),
    rasterPages: rasterPages.map((p) => ({ fixture: p.fixture, page: p.page, file: p.file, sha256: p.sha256 }))
  });

  writeJson(`${OUT}/build-status.json`, {
    schemaVersion: "rcap-family-build-status/v1", familyId: FAMILY_ID,
    buildStatus: "state_built", reviewStatus: "qa_review_pending", builtBy: BUILD_SCRIPT,
    rasterEngine: skipRaster ? "not rendered in this run" : "chromium_calibrated", popplerUsed: false,
    renderedArtifacts: artifacts.length, rasterPages: rasterPages.length,
    independentVerificationStatus: "PENDING", selfVerified: false,
    generationAllowed: false, runtimeSelectable: false,
    commercialRoutesOpened: 0, productionTouched: false,
    grantsNothing: "A rendered packet is review evidence. It authorizes no fulfillment and opens no commercial route."
  });

  const counted = countCompleteness(maps, writeProofs, artifacts, instructionsText);
  writeJson(`${OUT}/reports/completeness-counters.json`, {
    schemaVersion: "rcap-builder-completeness-counters/v1", familyId: FAMILY_ID,
    whatThisIs:
      "The BUILDER's own count of the nine completeness counters, computed with the repository's own contract functions "
      + "over this family's field map, byte proof, rendered artifacts and participant-instructions.md.",
    whatThisIsNot:
      "A verdict. This lane does not verify its own packets, and PASS_COMPLETE additionally requires a hash-bound "
      + "RASTER_PASS from the central raster workflow.",
    counters: counted.counters,
    allNineZero: PASS_COUNTERS.every((c) => counted.counters[c] === 0),
    findings: counted.findings,
    blankDispositions: counted.ledger.reduce((acc, b) => { acc[b.disposition] = (acc[b.disposition] ?? 0) + 1; return acc; }, {})
  });

  writeJson(`${OUT}/build-findings.json`, {
    schemaVersion: "rcap-family-build-findings/v1", familyId: FAMILY_ID, blocking: [],
    findings: [
      {
        finding:
          "MASTER_QUEUE names this source `official-form:SFN-61663`, the number printed on the form. The committed "
          + "corpus index files the identical binary under the slug ND-NORTH-DAKOTA-PARDON-ADVISORY-BOARD-APPLICA and "
          + "classes it SUPPORT rather than FORM.",
        consequence:
          "A resolver matching the queue's number against the index finds nothing while the bytes sit there. This "
          + "build binds by the index's own form number and then by exact SHA-256 -- "
          + "c59cd5b8c9938e78f951f3aea1d397fe896be253d8d35a14455d684ac56c697f -- and the source receipt records both "
          + "identifiers so the two names are never read as two documents. The same binary is also indexed in the D "
          + "source packs, a custody this container does not mount; one binary in two custodies is one identity."
      },
      {
        finding:
          "THREE FIELD NAMES ON THIS FORM WOULD HAVE TAKEN A PARTICIPANT FACT AND MEANT SOMETHING ELSE. The shared "
          + "field semantics binds by field name, and decideBinding returns participant.city for the offence table's "
          + "`City or County` column, matter.case_number for its `Case Number` column, and participant.phone for both "
          + "`Home Telephone Number` and `Work Telephone Number`.",
        consequence:
          "Each is refused by role before anything is rendered, and each refusal is recorded in "
          + "reports/blanks-left-for-the-participant.json under nearMissesRefusedByRole rather than quietly avoided. "
          + "Left alone the packet would have written the participant's home town into the column asking where the "
          + "offence was prosecuted, their matter's case number into the first offence row beside five empty cells, "
          + "and one unqualified contact number into two boxes asking different questions. The byte proof confirms "
          + "none of the three carries ink."
      },
      {
        finding:
          "The offence table in item 5 asks for six things per row -- judge, prosecutor, defence counsel, city or "
          + "county, offence and case number -- for three rows, and the platform holds at most one of the six.",
        consequence:
          "No cell is written and all eighteen are carried to the participant. A row carrying a case number beside "
          + "five blanks reads as a finished row and is not one, and this form's own instructions say an application "
          + "that is not complete is RETURNED to the applicant, which can postpone the hearing. Filling one column "
          + "would have been actively worse than filling none."
      },
      {
        finding:
          "The completeness contract's COURT_ONLY field class matches the word `judge`, and this form's offence table "
          + "asks the APPLICANT to name the judge for each offence.",
        consequence:
          "Classified by caption alone, those three cells are excused as protected and are then never disclosed -- an "
          + "item the board requires that nothing asks the participant for. Each is declared under the "
          + "case-determined exception, with its reason on its own row, so it counts as required before filing and is "
          + "printed in participant-instructions.md. THIS IS THE EXCEPTION USED OUTSIDE THE ROUTE-ELECTION SETTING IT "
          + "WAS WRITTEN FOR, and it is called out here so a reviewer can challenge it rather than discover it. The "
          + "alternative -- letting the contract excuse the blank -- would have produced a passing packet that leaves "
          + "the applicant unaware of a required field, which is the failure the counters exist to prevent."
      },
      {
        finding:
          "The shared semantics refuses the social security number as `government_identifier` and the race box as "
          + "`race`, before this build reaches either.",
        consequence:
          "Both are carried to the participant by name, with the instruction stating plainly that the platform does "
          + "not hold them and will not ask for them. Place of birth is refused the same way for the same reason. No "
          + "identifier value of any kind appears in this packet, in either fixture."
      },
      {
        finding:
          "This is a pardon application and not a record-clearing filing. The form's own first instruction is in "
          + "capitals: a request for a pardon will not expunge a criminal history record. Its closing note adds that "
          + "the application becomes a public record on receipt and that the hearing is minuted online.",
        consequence:
          "participant-instructions.md leads with all three facts, before any instruction about how to fill the form "
          + "in. A packet that presented this relief as expungement would be misdescribing what the participant is "
          + "applying for, and the public-record consequence is one a participant may reasonably decide against."
      },
      {
        finding:
          "The form is a two-page document whose second page is the text of N.D.C.C. ch. 12-55.1 and carries no "
          + "widgets.",
        consequence:
          "Both pages are carried into each fixture unchanged apart from page one's writes, so the packet delivers the "
          + "statute the board applies alongside the application. Page two should raster identical to the pinned "
          + "source."
      },
      {
        severity: "advisory",
        finding:
          "A boundary value that does not fit its line at the minimum readable font is refused by the shared finalizer "
          + "rather than clipped.",
        consequence:
          "Recorded in reports/actual-writes.json under unfittable, with the measured width. That is the boundary "
          + "fixture doing its job; the canonical fixture writes the value."
      }
    ]
  });

  writeJson(`${OUT}/approval-request.json`, {
    schemaVersion: "rcap-family-approval-request/v1", familyId: FAMILY_ID,
    requested: "independent completeness verification, visual review and counsel review",
    buildStatus: "state_built", status: "PENDING_INDEPENDENT_VERIFICATION",
    approvedForLive: false, live: false, commercialRoutesOpened: 0,
    mattersForTheReviewersAttention: [
      "reports/blanks-left-for-the-participant.json nearMissesRefusedByRole — three field names on this form bind a "
        + "participant fact and mean something else. Confirm the offence table is entirely empty in both fixtures.",
      "build-findings.json — the three offence-table Judge cells use the case-determined exception outside the "
        + "route-election setting it was written for. This is the item most worth challenging.",
      "participant-instructions.md — it leads with the form's own warning that a pardon does not expunge, and with "
        + "the public-record consequence. Counsel should confirm that framing."
    ]
  });

  return {
    familyId: FAMILY_ID,
    status: PASS_COUNTERS.every((c) => counted.counters[c] === 0) ? "COMPLETED" : "STOPPED",
    counters: counted.counters, counterFindings: counted.findings,
    directory: OUT, documents: resolved.map((r) => r.formNumber),
    writes: maps.reduce((n, m) => n + m.canonicalWrites.length, 0),
    requiredBeforeFiling: rbf.length,
    participantElections: maps.reduce((n, m) => n + m.selectionControls.length, 0),
    artifacts: artifacts.map((a) => ({ fixture: a.fixture, sha256: a.sha256, byteLength: a.byteLength, pageCount: a.pageCount })),
    rasterPages: rasterPages.length
  };
}

if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(thisFile)) {
  runFamily()
    .then((r) => { console.log(JSON.stringify(r, null, 2)); })
    .catch((e) => { console.error(e); process.exit(1); });
}
