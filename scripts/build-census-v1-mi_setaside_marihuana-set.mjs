#!/usr/bin/env node
/**
 * The Michigan misdemeanour-marijuana set-aside family — `mi_setaside_marihuana-set`.
 *
 *   node scripts/build-census-v1-mi_setaside_marihuana-set.mjs [--check] [--no-raster]
 *
 * One official SCAO form, MC 227a, _Application to Set Aside Misdemeanor
 * Marihuana Conviction(s)_, MCL 780.621e. Page 1 is the application; page 2 is
 * the court's printed instructions and carries no field.
 *
 * THREE THINGS ABOUT THIS FORM SHAPED THE IMPLEMENTATION.
 *
 * First, the CERTIFICATE OF MAILING. MC 227a carries one at the foot of page 1,
 * and it is sworn: "I declare under the penalties of perjury that this
 * certificate of mailing has been examined by me and that its contents are true".
 * The instructions on page 2 say when it is completed -- step 8, AFTER the
 * application packet has been mailed to the prosecuting official at step 7. So
 * its date and signature are left blank, and the builder contract names exactly
 * this: a certificate of mailing before mailing is a protected field.
 *
 * Second, the CONVICTION TABLE. Four rows of four columns -- crime, charge
 * code, date of conviction, case number -- and no cell of it is written. The
 * form's own instruction 4 says where the values come from: "Find out the exact
 * date of each conviction and each charge FROM THE COURT. Get a certified copy
 * of each conviction from the clerk". That is a record the platform does not
 * hold, and a row with the crime filled and the conviction date blank would read
 * as a finished row while missing the fact the application turns on.
 *
 * Third, `dinfo` -- the box captioned "Defendant's name, address, and telephone
 * no." -- asks for three facts in one free-text block. The platform holds all
 * three, separately, and the shared semantic registry has no composed fact for a
 * name-address-telephone block; a field takes one fact. Writing only the name
 * would put a third of an answer in a box the court reads as the applicant's
 * contact details. It is left to the participant, the reason is stated in the
 * disclosure rather than implied, and the gap is raised in build-findings for
 * whoever owns the descriptor list.
 *
 * A NOTE ON THE OTHER BUILDER. scripts/build-census-v1-mi-setaside-marihuana-set.mjs
 * (hyphenated) also writes this family's overlay directory and predates this
 * lane. PF16 owns the underscored name and this directory, and this build
 * supersedes what that script produced; the two must not both be run. That is
 * flagged in build-findings rather than resolved here, because the other script
 * is not in this lane's owned paths.
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

const FAMILY_ID = "mi_setaside_marihuana-set";
const CORPUS_INDEX = "data/rcap-all50/local-source-corpus-index.json";
const OUT = "data/rcap-all50/overlays/census-v1/mi/mi-setaside-marihuana-set--official-pdf-fill";
const BUILD_SCRIPT = "scripts/build-census-v1-mi_setaside_marihuana-set.mjs";

const ROUTE = Object.freeze({
  jurisdiction: "MI",
  routeKey: "track:MI:mi_setaside_marihuana",
  routeSelectionId: "mi-setaside-marihuana-set-mc-227a-primary-filing",
  publicLabel: "Set aside a misdemeanour marijuana conviction",
  authority: "MCL 780.621e; MCL 780.621b, MCL 780.621f, MCL 780.622, MCL 780.623; SCAO form MC 227a (Rev. 7/24)",
  documents: [
    { formNumber: "MC-227A", title: "Application to Set Aside Misdemeanor Marihuana Conviction(s)", instrumentKind: "primary_filing" }
  ]
});

function corpusRoot() {
  const configured = process.env.MASTER_LIBRARY_SOURCE_DIR
    ?? "private/source-imports/Expungement_AI_RCAP_Master_Library_Edition_1";
  assert.ok(fs.existsSync(configured), `the Master Library is not mounted at ${configured}`);
  return configured;
}

const SUPPLY = (what) => ({ policy: "supply", what });
const WRITE = (fact) => ({ policy: "write", fact });
const PROTECT = (refusalClass, why) => ({ policy: "protect", refusalClass, why });
const ELECTION = (why) => ({ policy: "election", why });
const ATTORNEY = (why) => ({ policy: "attorney", why });

const SIGNATURE = "signature_or_date_participant_completion";
const COURT_OWNED = "court_prosecutor_clerk_or_agency_owned";
const PARTICIPANT_ELECTION = "participant_sworn_narrative_or_legal_election";
const AGENCY = (what) => SUPPLY(what);

/* The four conviction rows, generated so the columns of one row cannot drift
 * apart. The form's instruction 4 says the values come from the court's own
 * record, which the platform does not hold. */
const CONVICTION_ROWS = ["1", "2", "3", "4"];
const CONVICTION_LETTERS = { 1: "a", 2: "b", 3: "c", 4: "d" };
const CONVICTION_COLUMNS = [
  ["c", "Crime", "the crime you were convicted of, exactly as the court's record states it"],
  ["ch", "Charge code(s) — MCL citation / PACC Code", "the charge code, the MCL citation or PACC code, from the court's record"],
  ["cdate", "Date of conviction", "the exact date of the conviction, which instruction 4 tells you to get from the court"],
  ["cno", "Case number", "the case number for that conviction"]
];
const convictionRows = () => {
  const rows = {};
  for (const n of CONVICTION_ROWS) {
    for (const [prefix, heading, what] of CONVICTION_COLUMNS) {
      rows[`${prefix}${n}`] = {
        section: "1. Convictions to be set aside",
        label: `Conviction ${CONVICTION_LETTERS[n]} — ${heading}`,
        ...SUPPLY(
          `${what}. This is line ${CONVICTION_LETTERS[n]} of the four the table has room for; the form says to use `
          + "additional sheets if you need more, and to attach a certified copy of each conviction"
        )
      };
    }
  }
  return rows;
};

const FORM_FIELDS = {
  "MC-227A": {
    /* --- the caption ---------------------------------------------------- */
    district: { section: "Caption", label: "Judicial District", ...SUPPLY("the judicial district number of the court where the conviction was entered — instruction 2 says you file in that court, and a separate application for each court") },
    circuit: { section: "Caption", label: "Judicial Circuit", ...SUPPLY("the judicial circuit number of that court, if it is a circuit court") },
    "county ": { section: "Caption", label: "County", ...WRITE("matter.county") },
    caseno: { section: "Caption", label: "Case No.", ...WRITE("matter.case_number") },
    judge: { section: "Caption", label: "Judge", ...PROTECT(COURT_OWNED, "the judge assigned to the application is the court's to name") },
    multcaseno: {
      section: "Caption", selection: true,
      label: "This application includes multiple case numbers as listed in item 1 (selection)",
      ...ELECTION("tick this if you are listing convictions from more than one case number in the table below — but note instruction 2: a separate application is needed for each COURT")
    },
    ori: { section: "Caption", label: "ORI", ...AGENCY("the ORI number of the agency, which begins MI- and appears on your court and police paperwork") },
    ctaddress: { section: "Caption", label: "Court address", ...SUPPLY("the street address of the court where the conviction was entered") },
    cttelno: { section: "Caption", label: "Court telephone no.", ...SUPPLY("that court's telephone number") },
    prno: { section: "Caption", label: "Police Report No.", ...AGENCY("the police report number for the offence, from the police or court record") },

    /* --- the parties ----------------------------------------------------- */
    somcheck: {
      section: "Parties", selection: true, label: "The People of the State of Michigan (selection)",
      ...ELECTION("tick this if the State of Michigan prosecuted the offence")
    },
    peoplecheck: {
      section: "Parties", selection: true, label: "The People of a named city, village or township (selection)",
      ...ELECTION("tick this instead if a city, village or township prosecuted the offence under its own ordinance, and name it on the line beside")
    },
    peopleof: {
      section: "Parties", label: "The People of — the named city, village or township",
      ...SUPPLY("the name of the city, village or township that prosecuted the offence, if it was not the State of Michigan")
    },
    /*
     * Three facts, one box, and no composed fact to bind. See the header
     * comment: the platform holds the name, the address and the telephone
     * number separately, a field takes one fact, and a third of an answer in
     * the applicant's contact block is worse than an empty one the participant
     * fills.
     */
    dinfo: {
      section: "Parties", label: "Defendant's name, address, and telephone no.",
      ...SUPPLY(
        "your name, your address and your telephone number, together in this one box. The platform holds all three but "
        + "has no way to compose them into a single block for this form, and writing only one of the three would leave "
        + "the court without the contact details it needs"
      )
    },
    ctntcn: { section: "Parties", label: "CTN/TCN", ...AGENCY("the CTN or TCN number from the court or police record") },
    sid: { section: "Parties", label: "SID", ...AGENCY("your SID number, from the court or police record") },
    dattyinfo: {
      section: "Parties", label: "Defendant's attorney, bar no., address, and telephone no.",
      ...ATTORNEY("attorney-only; no attorney-representation fact is held for this participant")
    },

    ...convictionRows(),

    /* --- signature, and the certificate of mailing ------------------------ */
    datesig: { section: "Applicant signature", label: "Date of applicant signature", ...PROTECT(SIGNATURE, "you date it when you sign it; a date written in advance would be false") },
    sig: { section: "Applicant signature", label: "Applicant signature", ...PROTECT(SIGNATURE, "you sign the application yourself") },
    comdate: {
      section: "Certificate of Mailing", label: "Certificate of Mailing — date of signature",
      ...PROTECT(SIGNATURE, "the certificate of mailing is completed at instruction 8, AFTER the packet has been mailed at instruction 7, and it is declared under the penalties of perjury; a date written before the mailing would be false")
    },
    comsig: {
      section: "Certificate of Mailing", label: "Certificate of Mailing — signature",
      ...PROTECT(SIGNATURE, "the certificate of mailing is declared under the penalties of perjury and is signed by you after you have mailed the packet to the prosecuting official")
    }
  }
};

/* ---- fixtures ------------------------------------------------------------ */
const FIXTURES = {
  canonical: {
    "participant.full_legal_name": "Jordan Avery Reyes",
    "participant.date_of_birth": "1991-04-17",
    "participant.street_address": "412 Woodward Avenue, Detroit, MI 48226",
    "participant.phone": "313-555-0142",
    "participant.email": "jordan.reyes@example.org",
    "matter.county": "Wayne",
    "matter.case_number": "2019-004217-FY"
  },
  boundary: {
    "participant.full_legal_name": "Maria-Alejandra O’Shaughnessy-Whitfield",
    "participant.date_of_birth": "1968-12-31",
    "participant.street_address": "1188 Upper Notch Crossing Road, Apartment 14B, Grand Rapids, Michigan 49503-2214",
    "participant.phone": "(616) 555-0199 ext. 4417",
    "participant.email": "maria.alejandra.oshaughnessy.whitfield@longmailexample.org",
    "matter.county": "Kent",
    "matter.case_number": "2024-0011882-SUPPLEMENTAL-FY"
  }
};

const RASTER_ENGINE = "scripts/raster/pdf-page-raster.mjs (Chromium, calibrated)";

/* ---- source binding ------------------------------------------------------ */
function resolveSources() {
  const index = JSON.parse(fs.readFileSync(path.join(ROOT, CORPUS_INDEX), "utf8"));
  const all = index.entries ?? [];
  const root = corpusRoot();
  const resolved = [];
  const failures = [];
  for (const wanted of ROUTE.documents) {
    const entry = all.find((e) => e.state === "MI" && e.formNumber === wanted.formNumber && e.assetClass === "FORM");
    if (!entry) { failures.push({ sourceId: `official-form:${wanted.formNumber}`, why: "no entry for this form number in the committed corpus index" }); continue; }
    const rel = entry.path;
    const abs = path.resolve(ROOT, root, rel);
    if (!fs.existsSync(abs)) { failures.push({ sourceId: `official-form:${wanted.formNumber}`, pathInArchive: rel, why: `the indexed path does not exist on disk: ${rel}` }); continue; }
    const bytes = fs.readFileSync(abs);
    const sha256 = crypto.createHash("sha256").update(bytes).digest("hex");
    if (String(entry.sha256 ?? "") !== sha256) {
      failures.push({ sourceId: `official-form:${wanted.formNumber}`, pathInArchive: rel, why: `SHA-256 drift: the committed index says ${entry.sha256}, the mounted corpus holds ${sha256}` });
      continue;
    }
    resolved.push({
      ...wanted, sourceId: `official-form:${wanted.formNumber}`, pathInArchive: rel,
      revision: entry.revision ?? null, sha256, byteLength: bytes.length, bytes,
      acroFieldCount: entry.acroFieldCount ?? null, pageCount: entry.pageCount ?? null
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
      return {
        page: pi + 1,
        rect: { x: +r.x.toFixed(2), y: +r.y.toFixed(2), width: +r.width.toFixed(2), height: +r.height.toFixed(2) },
        rectBasis: "acroform_widget_rect_read_first_hand_from_pinned_binary"
      };
    });
    if (!entry) { unmapped.push({ field: name, widgets }); continue; }
    /*
     * What the SOURCE already carries on this control, before this build touches
     * it. JDF 477 ships with the Colorado Bureau of Investigation box already
     * ticked, because the form marks that agency required -- so the finished
     * artifact draws a tick at a rectangle this map refuses, and reading that as
     * "a field the map refused carries ink" would report a protected write this
     * build never made. The form's own default is recorded here, from the
     * pinned binary, so the byte proof can tell the two apart by evidence.
     */
    let sourceValue = null;
    try {
      if (typeof field.isChecked === "function") sourceValue = field.isChecked() ? "on" : null;
      else if (typeof field.getSelected === "function") sourceValue = field.getSelected() ?? null;
      else if (typeof field.getText === "function") sourceValue = field.getText() ?? null;
    } catch { sourceValue = null; }
    rows.push({
      key: name, name, page: widgets[0]?.page ?? null, widgets, sourceValue,
      rect: widgets[0]?.rect ?? null, rectBasis: widgets[0]?.rectBasis ?? null,
      type: field.constructor.name.replace(/^PDF/, "").toLowerCase()
        .replace("textfield", "text").replace("radiogroup", "radiogroup").replace("checkbox", "checkbox"),
      isSelectionControl: entry.selection === true
        || field.constructor.name === "PDFCheckBox" || field.constructor.name === "PDFRadioGroup",
      multiline: typeof field.isMultiline === "function" ? field.isMultiline() : false,
      maxLength: typeof field.getMaxLength === "function" ? (field.getMaxLength() ?? null) : null,
      section: entry.section, effectiveLabel: entry.label,
      bindingLabel: entry.bindingLabel ?? entry.label,
      policy: entry.policy, fact: entry.fact ?? null,
      refusalClass: entry.refusalClass ?? null, what: entry.what ?? null, why: entry.why ?? null,
      // The scrambled extraction at this widget's own coordinate, kept as
      // evidence of WHY the printed-caption check is unavailable on this form.
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
async function renderDocument(source, census, fixtureName) {
  const facts = FIXTURES[fixtureName];
  const writable = census.rows.filter((r) => r.policy === "write");
  const explicitMappings = Object.fromEntries(writable.map((r) => [r.name, r.fact]));
  const writableNames = new Set(writable.map((r) => r.name));
  const unwritableFields = census.rows.filter((r) => !writableNames.has(r.name)).map((r) => ({ field: r.name }));

  const { bytes, report } = await finalizeOfficialForm({
    sourceBytes: source.bytes,
    expectedSha256: source.sha256,
    census: census.rows.map((r) => ({
      // The BINDING label goes to the finalizer; the printed label goes to the
      // field map and the participant. They are the same string unless a form's
      // own wording defeats the shared descriptor, and the dictionary says so
      // where they differ.
      name: r.name, type: r.type, effectiveLabel: r.bindingLabel, regionHeading: r.section,
      widgets: r.widgets.map((w) => ({ page: w.page, rect: w.rect })),
      multiline: r.multiline === true, maxLength: r.maxLength ?? null
    })),
    facts, explicitMappings, unwritableFields,
    documentTextLines: census.pageText.flatMap((p) => p.lines.map((l) => l.text)),
    title: source.title
  });
  if (process.env.MI227A_DEBUG_RENDER) {
    console.log(`-- ${source.formNumber} ${fixtureName}: written=${report.written.length} refused=${report.refused.length}`);
    for (const r of report.refused) console.log(`   ${r.field ?? r.anchor}: ${r.reason}${r.category ? ` (${r.category})` : ""}`);
  }
  return { bytes, report };
}

/* ---- byte proof ------------------------------------------------------------ */
async function byteProof(source, census, artifactBytes, report, fixtureName) {
  const tmp = path.join(ROOT, `.mi-227a-byte-proof-${source.formNumber}-${fixtureName}.pdf`);
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
          drawnText: text, expected: FIXTURES[fixtureName][r.fact] ?? null,
          matchesExpected: ink === String(FIXTURES[fixtureName][r.fact] ?? "").trim()
        });
        continue;
      }
      if (ink.length === 0) continue;
      // Ink on a control the SOURCE already carried is the form's own default,
      // not a write this build made. JDF 477 ships the CBI box ticked because
      // the form marks that agency required.
      if (r.sourceValue !== null && r.sourceValue !== undefined) {
        documentAuthoredAppearances.push({
          field: r.key, page: wdg.page, rect: wdg.rect, drawnText: text,
          sourceValue: r.sourceValue,
          note: "the pinned source already carries this value; flattening materialises the form's own default"
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

  for (const r of census.rows) {
    const base = {
      field: `${source.formNumber}/${r.key}`,
      fieldName: `${source.formNumber}/${r.key}`.replace(/\[\d+\]/g, ""),
      acroFieldName: r.name,
      page: r.page, rect: r.rect, rectBasis: r.rectBasis,
      printedLabel: r.effectiveLabel, printedLine: r.effectiveLabel,
      sectionHeading: r.section, regionHeading: r.effectiveLabel,
      effectiveLabel: r.effectiveLabel,
      captionBasis: "authored_acroform_field_name_plus_printed_section, because this form's text stream is scrambled",
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

    if (r.isSelectionControl) {
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
      why: `the platform holds no value for this and the participant supplies it before filing: ${r.what}`,
      participantMustSupply: r.what
    });
  }

  return {
    formNumber: source.formNumber, documentId: source.formNumber, documentRole: source.instrumentKind,
    documentPolicy: { mode: "participant", captionOnly: false, documentAcceptsFill: true, routeKey: ROUTE.routeKey },
    structuralClass: "acroform",
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
  // Scoped to the DOCUMENT: a field name repeats across the two forms and means
  // something different on each.
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
      identity: r.identity, why: r.why, participantMustSupply: r.participantMustSupply
    })));
}

function participantInstructions(maps, rbf) {
  const byDoc = new Map();
  for (const i of rbf) byDoc.set(i.document, [...(byDoc.get(i.document) ?? []), i]);
  const elections = maps.flatMap((m) => m.selectionControls
    .filter((c) => c.category === PARTICIPANT_ELECTION)
    .map((c) => ({ document: m.formNumber, ...c })));

  const out = [];
  out.push(`# Filing instructions \u2014 ${ROUTE.publicLabel}`, "");
  out.push(
    "This packet is SCAO form **MC 227a**, _Application to Set Aside Misdemeanor Marihuana Conviction(s)_, prepared "
    + `under ${ROUTE.authority}.`, ""
  );
  out.push(
    "The platform filled in what it holds about your case: the county and the case number. Everything else is yours, "
    + "and every one of those blanks is listed below by the part of the form it is in. Page 2 of your packet is the "
    + "court's own instruction sheet \u2014 read it; the steps below follow it.", ""
  );

  out.push("## Check you are on the right form", "");
  out.push(
    "MC 227a is for **misdemeanour marijuana convictions**, which MCL 780.621e(7) defines and the court's instruction "
    + "sheet lists: MCL 333.7403(2)(d) (possession), MCL 333.7404(2)(d) (use), MCL 333.7453 (selling marijuana "
    + "paraphernalia), and local ordinances substantially corresponding to those.", ""
  );
  out.push("The form itself routes two other applications away, in its own words:", "");
  out.push("- If the offence was **a direct result of your being a victim of human trafficking**, and you are applying under MCL 780.621(3), use **MC 227b**.");
  out.push("- If the conviction is **a non-marijuana misdemeanour** under MCL 780.621, use **MC 227**.", "");

  out.push("## Where you file, and the certified copies", "");
  out.push(
    "**File in the court where the conviction happened**, and use a **separate application for each court** \u2014 "
    + "instruction 2. **There should be no filing fee**, instruction 6 says so. But instruction 4 says to get a "
    + "**certified copy of each conviction** from the clerk of the convicting court and attach it, and warns there may "
    + "be a fee for those copies. The platform does not obtain them.", ""
  );

  out.push("## The order of the last three steps matters", "");
  out.push("The court's instruction sheet is specific, and the certificate of mailing at the foot of page 1 is sworn:", "");
  out.push("1. **Sign and date the application** (instruction 5).");
  out.push("2. **Make three copies** of the application and every attachment, and take them to the clerk of the convicting court (instruction 6).");
  out.push("3. **Mail a copy of the whole packet to the prosecuting official** who prosecuted the offence (instruction 7).");
  out.push("4. **Only then fill in and sign the Certificate of Mailing** on both remaining copies, and take or mail one to the court (instruction 8).", "");
  out.push(
    "The certificate is a declaration under the penalties of perjury that you have already mailed the packet. Its date "
    + "and its signature are left blank in your copy for that reason, and nothing should be written on them until step 4.", ""
  );

  out.push("## What you must do before you file", "");
  out.push("1. **Fill in every item in the table below.**");
  out.push("2. **Complete the conviction table.** Every line you use, all four columns \u2014 instruction 4 tells you to get the exact date and charge from the court.");
  out.push("3. **Make the choices listed under _The choices that are yours_.**");
  out.push("4. **Follow the four steps above, in that order.**");
  out.push("");

  for (const [doc, items] of byDoc) {
    const title = ROUTE.documents.find((d) => d.formNumber === doc)?.title ?? doc;
    out.push(`## ${doc} \u2014 ${title}: the items you must supply`, "");
    out.push("| Section | The blank on the form | What to write |", "| --- | --- | --- |");
    for (const i of items) out.push(`| ${i.section} | ${i.disclosureLabel} | ${i.participantMustSupply} |`);
    out.push("");
  }

  out.push("## The choices that are yours", "");
  out.push("| Section | The choice | Why it is yours |", "| --- | --- | --- |");
  for (const c of elections) out.push(`| ${c.sectionHeading} | ${c.effectiveLabel} | ${c.reason} |`);
  out.push("");

  out.push("## What the platform deliberately left blank", "");
  out.push("- **Your signature and its date.**");
  out.push("- **The whole Certificate of Mailing.** It is sworn, and it certifies something that has not happened when this packet is prepared.");
  out.push("- **The judge's name.** The court assigns it.");
  out.push("- **The attorney block.** You are applying yourself; no attorney-representation fact is held for you.");
  out.push("");

  out.push("## What a set-aside does not reach", "");
  out.push(
    "An order setting aside a conviction is not a clean slate everywhere. The adopted record requires this packet to "
    + "state plainly what the relief does not reach:", ""
  );
  out.push("- **Your Secretary of State driving record survives.** A set-aside does not clear it.");
  out.push("- **SORA registration and reporting obligations continue** for a listed offence, per the note on MC 228.");
  out.push("- **Firearm rights are not restored.**");
  out.push("- **Restitution obligations survive.**");
  out.push("- **No fine, costs or other money paid is returned.** You are not entitled to get any of it back.", "");
  out.push(
    "> Not affected: The Secretary of State driving record. ... SORA registration and reporting obligations continue "
    + "for a listed offense, per the note on MC 228. Firearm rights are not restored. Restitution obligations "
    + "survive. The applicant is not entitled to return of any fine, costs or other money paid.", ""
  );

  out.push("## What happens after you file", "");
  out.push(
    "The court's instruction sheet says: if the prosecuting agency files a response opposing your application, the court "
    + "must set a hearing within 30 days and mail you notice of it, and you should appear. If no answer is filed within "
    + "60 days of service, the court enters an order and mails a copy to you, the arresting agency, the prosecuting "
    + "agency and the Michigan State Police.", ""
  );

  out.push("## What this packet is not", "");
  out.push(
    "This is a prepared copy of an official SCAO form. It is not legal advice, it is not filed for you, and it does not "
    + "decide whether your conviction is eligible to be set aside."
  );
  out.push("");
  out.push(`_Route: ${ROUTE.routeKey} \u2014 ${ROUTE.authority}_`);
  out.push("");
  out.push(
    "_The scope-of-relief statement under \u201cWhat a set-aside does not reach\u201d is the adopted "
    + "packet_instruction of data/record-clearing/legal-design-intake/MI.memo.json, track mi_setaside_marihuana, "
    + "classificationBasis explicit_state_addendum, source LegalEase-Michigan-Record-Clearing-Legal-Review.md "
    + "\u2014 \u201cTRACK 1 / FILING AND POST-FILING PROCESS\u201d._"
  );
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
        formNumber: source.formNumber, sha256: source.sha256, fields: census.rows.length,
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
      const proof = await byteProof(source, census, bytes, report, fixtureName);
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
    bindingMethod: "exact form number + committed corpus-index SHA-256 + on-disk SHA-256 + byte length",
    routeKey: ROUTE.routeKey, routeSelectionId: ROUTE.routeSelectionId, statutoryAuthority: ROUTE.authority,
    allSourcesExact: true,
    documents: resolved.map((r) => ({
      sourceIds: [r.sourceId], documentId: r.formNumber, formNumber: r.formNumber, revision: r.revision,
      pathInArchive: r.pathInArchive, sha256: r.sha256, byteLength: r.byteLength, instrumentKind: r.instrumentKind
    })),
    sourceBinaryCommitted: false, commercialRoutesOpened: 0
  });

  writeJson(`${OUT}/field-census.census-v1.json`, {
    schemaVersion: "rcap-official-form-field-census/v1-census-v1", familyId: FAMILY_ID,
    captionBasis:
      "This form squashes adjacent printed captions into one run in the text stream (\"ORICourt addressCourt telephone "
      + "no.\", \"CHARGE CODE(S)DATE OF\"). A printed-caption check cannot be run on them, and a "
      + "match loose enough to accept the scrambled text would pass on anything. Captions here are the AcroForm field "
      + "names Colorado authored, which are meaningful and section-keyed, plus the printed section heading. The scrambled "
      + "extraction at each widget's own coordinate is recorded beside it as evidence, for the reviewer who reads the paper.",
    documents: censuses.map(({ source, census }) => ({
      documentId: source.formNumber, formNumber: source.formNumber, sourceSha256: source.sha256,
      pageCount: census.pageCount, fieldCount: census.rows.length,
      corpusIndexDeclaresFieldCount: source.acroFieldCount,
      fields: census.rows.map((r) => ({
        field: r.key, page: r.page, rect: r.rect, rectBasis: r.rectBasis, pdfType: r.type,
        isSelectionControl: r.isSelectionControl, multiline: r.multiline, maxLength: r.maxLength,
        section: r.section, effectiveLabel: r.effectiveLabel, policy: r.policy, factId: r.fact,
        printedTextAtCoordinate: r.printedTextAtCoordinate
      }))
    }))
  });

  writeJson(`${OUT}/reports/caption-evidence.json`, {
    schemaVersion: "rcap-caption-evidence/v1", familyId: FAMILY_ID,
    finding:
      "MC 227a squashes its printed captions together in the text stream -- \"STATE OF MICHIGANCASE NO. and JUDGE\", "
      + "\"ORICourt addressCourt telephone no.\" -- so a caption cannot be matched by an exact printed line.",
    whyThisIsNotWorkedAround:
      "A match loose enough to find a caption inside a squashed run would pass on almost anything, and a check that cannot "
      + "fail reads as evidence while proving nothing. The absence is recorded instead.",
    whatTheCaptionClaimRestsOnHere:
      "The SCAO authored these widget names -- caseno, judge, ctaddress, cttelno, prno, ctntcn, sid, dinfo, comdate, "
      + "comsig, cdate3 -- and they are keyed to the printed items. The dictionary and the widget set "
      + "are asserted to match exactly in both directions, and every placement is rastered for a reviewer who can read "
      + "the paper.",
    perField: censuses.flatMap(({ source, census }) => census.rows.map((r) => ({
      document: source.formNumber, field: r.key, page: r.page, rect: r.rect,
      labelThisBuildUses: r.effectiveLabel, section: r.section,
      textExtractedAtThisCoordinate: r.printedTextAtCoordinate
    })))
  });

  writeJson(`${OUT}/production-field-map.json`, {
    schemaVersion: "rcap-official-form-field-map/v1-census-v1", familyId: FAMILY_ID,
    routeKeys: [ROUTE.routeKey], routeSelectionId: ROUTE.routeSelectionId, renderStrategy: "acroform_fill",
    captionBasis: "authored AcroForm field names plus printed section headings; see reports/caption-evidence.json",
    dispositionVocabulary: [SIGNATURE, COURT_OWNED, PARTICIPANT_ELECTION],
    routeDeterminedSelections: [],
    routeSelectionNote:
      "MCL 780.621e is one section and MC 227a is its form. Nothing on it is a route election: the two People-of boxes "
      + "say who prosecuted the offence and the multiple-case-numbers box says how many cases the table lists, both "
      + "facts about the participant's own record. The form itself routes the two neighbouring applications elsewhere, "
      + "to MC 227b and MC 227, and the instructions carry that in the form's own words.",
    convictionTableNote:
      "All sixteen cells of the four-row conviction table are declared required-before-filing and none is written. The "
      + "form's instruction 4 says the exact date and charge come from the court and that a certified copy of each "
      + "conviction must be attached; the platform holds neither.",
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
      "Every page of both fixtures is rastered for a human who did not build this family. It matters more than usual "
      + "here: these two forms cannot be caption-checked from their own text stream, so a reviewer reading the paper is "
      + "the check that a value sits under the heading it belongs to.",
    whatToLookAt: [
      "Page 1, the caption block: the county and the case number written, each under the heading it belongs to, and the "
        + "judicial district, circuit, ORI, court address, court telephone and police report number blank.",
      "Page 1, the parties block: neither People-of box ticked, and the defendant's name-address-telephone box blank. "
        + "Confirm the empty contact box reads as a blank the applicant fills, not as a form that lost a value.",
      "Page 1, the conviction table: all four lines blank, all four columns.",
      "Page 1, the applicant signature row: date and signature blank.",
      "Page 1, the CERTIFICATE OF MAILING at the foot: date and signature blank. This is the one to look hardest at \u2014 "
        + "it is a declaration under the penalties of perjury that the packet has already been mailed.",
      "Page 2: the court's instruction sheet, unaltered."
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
          "MC 227a carries a sworn CERTIFICATE OF MAILING at the foot of page 1, and the court's own instruction sheet "
          + "puts it at step 8 \u2014 after the packet has been mailed to the prosecuting official at step 7.",
        consequence:
          "Its date and signature are left blank, which is what the builder contract names: a certificate of mailing "
          + "before mailing is a protected field. The participant instructions carry the four steps in the order the "
          + "court sets them, because the order is the point."
      },
      {
        finding:
          "The conviction table asks for the crime, the charge code, the date of conviction and the case number, and "
          + "instruction 4 says to get the exact date and charge FROM THE COURT and to attach a certified copy of each.",
        consequence:
          "No cell of it is written. That record is not one the platform holds, and a line with the crime filled and the "
          + "conviction date blank would read as finished while missing the fact the application turns on. All sixteen "
          + "cells are declared and disclosed."
      },
      {
        finding:
          "`dinfo` is captioned \"Defendant's name, address, and telephone no.\" \u2014 three facts in one free-text box. "
          + "The platform holds all three separately and the shared semantic registry has no composed fact for a "
          + "name-address-telephone block, so a field, which takes one fact, can bind at most one of them.",
        consequence:
          "The box is left to the participant and the reason is stated in the disclosure rather than implied. Writing "
          + "only the name would put a third of an answer in the box the court reads for the applicant's contact "
          + "details. The gap is a shared-registry one: a composed participant contact fact would let this box be "
          + "filled, and that list is outside this family's owned paths."
      },
      {
        finding:
          "scripts/build-census-v1-mi-setaside-marihuana-set.mjs (hyphenated) also writes this family's overlay "
          + "directory and predates this lane.",
        consequence:
          "PF16 owns the underscored script name and this directory, and this build supersedes what that script "
          + "produced. The two must not both be run. Flagged rather than resolved here: the other script is not in this "
          + "lane's owned paths, so removing or redirecting it is the Captain's call."
      },
      {
        severity: "advisory",
        finding:
          "The boundary participant's name carries a typographic apostrophe (U+2019) and the finalized bytes carry the "
          + "name without it.",
        consequence:
          "Recorded for visual review. The behaviour is in the shared finalizer's font encoding and reproduces in "
          + "vt_seal_misdemeanor-set, which is already PASS_COMPLETE."
      }
    ]
  });

  writeJson(`${OUT}/approval-request.json`, {
    schemaVersion: "rcap-family-approval-request/v1", familyId: FAMILY_ID,
    requested: "independent completeness verification, visual review and counsel review",
    buildStatus: "state_built", status: "PENDING_INDEPENDENT_VERIFICATION",
    approvedForLive: false, live: false, commercialRoutesOpened: 0,
    mattersForTheReviewersAttention: [
      "reports/caption-evidence.json \u2014 these two forms cannot be caption-checked from their own text stream, so visual review carries more weight here than usual.",
      "reports/blanks-left-for-the-participant.json \u2014 sixty offence-table cells are left to the participant, which is a lot of paper to hand back; confirm the instructions make the table legible to fill."
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
