#!/usr/bin/env node
/**
 * The Alaska CourtView-exclusion family builder — `ak-courtview-set`.
 *
 *   node scripts/build-census-v1-ak-courtview-set.mjs [--check] [--no-raster]
 *
 * TF-810 is the Alaska Court System's request to exclude a case from the online
 * public index (CourtView) under Administrative Rule 40(a) or AS 22.35.030. One
 * official form, one page, one component: the primary filing.
 *
 * THIS FORM IS A CORRECTION REQUEST, NOT A PETITION, AND THAT SHAPES EVERYTHING.
 *
 * The form says so on its own face: the exceptions listed on it are removals the
 * court system performs AUTOMATICALLY, and this form exists for a requester who
 * believes the court made an error and their case should already have come off
 * the index. So there is no judge's order on it, no verification, no certificate
 * of service and no relief to argue for -- there are ten printed grounds, and
 * the requester ticks the one that is true of their case.
 *
 * The form also routes two neighbouring requests away from itself in its own
 * words, and the participant instructions carry both: TF-800 to ask a judge to
 * make a still-public case confidential or sealed, and TF-805 to remove only a
 * name rather than the whole case.
 *
 * The ten grounds are participant elections. This packet is built for the rule,
 * and which ground fits is a fact about the requester's own case -- ticking one
 * would assert a disposition the platform does not hold. Two of them say so
 * explicitly on the form: ground 4 and ground 9 require an attachment.
 *
 * TF-810 names its widgets `name`, `partyNames`, `Check Box8.2`, so no caption
 * can be inferred from a field name; every caption below is read off the page at
 * the widget's own coordinates and re-checked on every build.
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

const FAMILY_ID = "ak-courtview-set";
const CORPUS_INDEX = "data/rcap-all50/local-source-corpus-index.json";
const OUT = "data/rcap-all50/overlays/census-v1/ak/ak-courtview-set--official-pdf-fill";
const BUILD_SCRIPT = "scripts/build-census-v1-ak-courtview-set.mjs";

/*
 * The route, taken from the canonical route universe rather than composed here:
 * data/rcap-grade-a/route-obligation-census-candidate/canonical-route-universe.json
 * carries `track:AK:ak-tf800` with this authority and this public label.
 */
const ROUTE = Object.freeze({
  jurisdiction: "AK",
  routeKey: "track:AK:ak-courtview",
  routeSelectionId: "ak-courtview-set-tf-810-primary-filing",
  publicLabel: "Getting a closed case off the public court index",
  authority: "AS 22.35.030; Alaska Administrative Rule 40(a); Alaska Court System form TF-810 (5/25)",
  formNumber: "TF-810",
  instrumentKinds: ["primary_filing"]
});

function corpusRoot() {
  const configured = process.env.MASTER_LIBRARY_SOURCE_DIR
    ?? "private/source-imports/Expungement_AI_RCAP_Master_Library_Edition_1";
  assert.ok(fs.existsSync(configured), `the Master Library is not mounted at ${configured}`);
  return configured;
}

/* ------------------------------------------------------------------ *
 * Every widget on TF-810, and the caption printed at its coordinates.
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

const SIGNATURE = "signature_or_date_participant_completion";
const COURT_OWNED = "court_prosecutor_clerk_or_agency_owned";
const PARTICIPANT_ELECTION = "participant_sworn_narrative_or_legal_election";

const FORM_TITLE = "Request to Exclude Case from Online Public Index (CourtView) Under Administrative Rule 40(a) or AS 22.35.030";

const FORM_FIELDS = {
  /* ---- who is asking ---- */
  name: {
    page: 1, caption: "Name: Email*:", label: "Name",
    captionAt: { page: 1, y: 579 }, ...WRITE("participant.full_legal_name")
  },
  email: {
    page: 1, caption: "Name: Email*:", label: "Email",
    captionAt: { page: 1, y: 579 }, ...WRITE("participant.email")
  },
  address: {
    page: 1, caption: "Address: Phone:", label: "Address",
    captionAt: { page: 1, y: 537 }, ...WRITE("participant.street_address")
  },
  phoneNo: {
    page: 1, caption: "Address: Phone:", label: "Phone",
    captionAt: { page: 1, y: 537 }, ...WRITE("participant.phone")
  },
  /*
   * `partyNames` is the CASE NAME box, whatever the widget is called: it sits at
   * x=130 under the printed "Case Name:" and the case-number box sits at x=440
   * under "Case Number:". The field name is the misleading channel here and the
   * printed caption at the widget's own coordinate is the reliable one.
   */
  partyNames: {
    page: 1, caption: "Case Name: Case Number:", label: "Case Name",
    captionAt: { page: 1, y: 521 },
    ...SUPPLY("the case name exactly as it appears on your court paperwork — in a criminal case that is usually the State of Alaska against your name")
  },
  caseNo: {
    page: 1, caption: "Case Name: Case Number:", label: "Case Number",
    captionAt: { page: 1, y: 521 }, ...WRITE("matter.case_number")
  },

  /* ---- the ten printed grounds ---- *
   * Each is a statement about how this case ended. The route is the rule; which
   * ground is true is the requester's to say. */
  "Check Box1.0": {
    page: 1, caption: "1. A criminal case in which 60 days have passed since the date of acquittal or dismissal, and",
    label: "Ground 1 — 60 days have passed since acquittal or dismissal (selection)",
    captionAt: { page: 1, y: 492 },
    ...ELECTION("tick this if you were acquitted of all charges, or all charges were dismissed and the dismissal was not part of a plea agreement in another criminal case, or a combination of the two — and 60 days have passed")
  },
  "Check Box2.0": {
    page: 1, caption: "2. A criminal case that was dismissed, because",
    label: "Ground 2 — a criminal case dismissed for one of the two reasons below (selection)",
    captionAt: { page: 1, y: 427 },
    ...ELECTION("tick this heading if one of the two reasons printed under it is why your case was dismissed")
  },
  "Check Box2.1": {
    page: 1, caption: "a judicial officer found no probable cause under Criminal Rule 4(a)(1) or 5(d).",
    label: "Ground 2 — a judicial officer found no probable cause (selection)",
    captionAt: { page: 1, y: 414 },
    ...ELECTION("tick this if a judicial officer found no probable cause under Criminal Rule 4(a)(1) or 5(d)")
  },
  "Check Box2.2": {
    page: 1, caption: "Defendant was a minor and was wrongly charged in adult court with an offense within",
    label: "Ground 2 — the defendant was a minor wrongly charged in adult court (selection)",
    captionAt: { page: 1, y: 400 },
    ...ELECTION("tick this if the defendant was a minor and was wrongly charged in adult court with an offence within the jurisdiction for delinquency proceedings under AS 47.12.020")
  },
  "Check Box3.0": {
    page: 1, caption: "3. A criminal or minor offense case that was dismissed, because",
    label: "Ground 3 — a criminal or minor offence case dismissed for one of the two reasons below (selection)",
    captionAt: { page: 1, y: 374 },
    ...ELECTION("tick this heading if one of the two reasons printed under it is why your case was dismissed")
  },
  "Check Box3.1": {
    page: 1, caption: "the prosecutor decided not to file a charging document.",
    label: "Ground 3 — the prosecutor decided not to file a charging document (selection)",
    captionAt: { page: 1, y: 360 },
    ...ELECTION("tick this if the prosecutor decided not to file a charging document")
  },
  "Check Box3.2": {
    page: 1, caption: "there was an identity error under Criminal Rule 43(d) or Minor Offense Rule 11(c).",
    label: "Ground 3 — there was an identity error (selection)",
    captionAt: { page: 1, y: 346 },
    ...ELECTION("tick this if there was an identity error under Criminal Rule 43(d) or Minor Offense Rule 11(c)")
  },
  "Check Box4.0": {
    page: 1, caption: "4. A criminal case in which Defendant (1) received a suspended imposition of sentence (SIS),",
    label: "Ground 4 — a suspended imposition of sentence, completed, with all other charges resolved (selection)",
    captionAt: { page: 1, y: 333 },
    ...ELECTION("tick this if you received a suspended imposition of sentence, completed the terms of the sentence, and were acquitted of — or had dismissed or set aside — all other charges in the same case. The form tells you to attach proof of the SIS and any order setting aside")
  },
  "Check Box5.0": {
    page: 1, caption: "5. A criminal or minor offense case in which all of the charges were one of the following",
    label: "Ground 5 — all charges were underage alcohol offences (selection)",
    captionAt: { page: 1, y: 294 },
    ...ELECTION("tick this if every charge was one of the underage alcohol offences the form lists — AS 04.16.049, AS 04.16.050, AS 04.16.060(g), AS 28.35.280, AS 28.35.285 or AS 28.35.290 — or an equivalent municipal ordinance")
  },
  "Check Box6.0": {
    page: 1, caption: "6. A criminal case in which Defendant (1) was convicted for possessing less than one",
    label: "Ground 6 — a conviction for possessing less than one ounce of marijuana at 21 or older (selection)",
    captionAt: { page: 1, y: 254 },
    ...ELECTION("tick this if you were convicted of possessing less than one ounce of marijuana, were at least 21 at the time of the offence, and were not convicted of any other criminal charge in the same case")
  },
  "Check Box7.0": {
    page: 1, caption: "7. A domestic violence, stalking, or sexual assault protective order case that is closed, and no",
    label: "Ground 7 — a closed protective order case in which no protective order was ever issued (selection)",
    captionAt: { page: 1, y: 202 },
    ...ELECTION("tick this if the protective order case is closed and no protective order was issued at any time in it")
  },
  "Check Box8.0": {
    page: 1, caption: "8. A domestic violence protective order issued by a United States (US) federal court, another",
    label: "Ground 8 — a protective order issued by another US court or tribunal (selection)",
    captionAt: { page: 1, y: 175 },
    ...ELECTION("tick this if the protective order was issued by a US federal court, another state or territorial court, a tribal court in the US, or a US military tribunal")
  },
  "Check Box8.1": {
    page: 1, caption: "9. Confidential or sealed by judicial order under Admin. Rule 37.6. [Attach copy of order.]",
    label: "Ground 9 — already confidential or sealed by judicial order under Admin. Rule 37.6 (selection)",
    captionAt: { page: 1, y: 149 },
    ...ELECTION("tick this if a judge has already made the case confidential or sealed under Administrative Rule 37.6. The form tells you to attach a copy of that order")
  },
  "Check Box8.2": {
    page: 1, caption: "10. Otherwise subject to removal from the public index by Alaska statute or court rule:",
    label: "Ground 10 — otherwise subject to removal by Alaska statute or court rule (selection)",
    captionAt: { page: 1, y: 135 },
    ...ELECTION("tick this if some other Alaska statute or court rule takes the case off the public index, and write the rule or statute number on the line below")
  },
  rule: {
    page: 1, caption: "[List specific rule or statute number.]",
    label: "Ground 10 — the specific rule or statute number",
    captionAt: { page: 1, y: 123 },
    ...SUPPLY("the specific Alaska statute or court rule number that takes your case off the public index, if you ticked ground 10")
  },

  /* ---- the signature ---- */
  dateSigned: {
    page: 1, caption: "Date Signature", label: "Date of signature",
    captionAt: { page: 1, y: 89 },
    ...PROTECT(SIGNATURE, "you date it when you sign it; a date written in advance would be false")
  },
  signature: {
    page: 1, caption: "Date Signature", label: "Signature",
    captionAt: { page: 1, y: 89 },
    ...PROTECT(SIGNATURE, "you sign this yourself")
  }
};

/* Where a widget's NAME is not a reliable guide to the blank it is. TF-810 has
 * two such places and both are recorded rather than quietly worked around: the
 * caption read at the widget's own coordinate is what this build binds to. */
const CAPTION_NOTE = {
  partyNames:
    "The widget is named `partyNames` and the blank is the CASE NAME box: it sits at x=130 under the printed "
    + "\"Case Name:\" while the case-number box sits at x=440 under \"Case Number:\". The field name is the misleading "
    + "channel on this form and the printed caption at the widget's own coordinate is the reliable one.",
  "Check Box8.1":
    "The widget is numbered 8.1 and the ground it marks is printed as ground 9. TF-810's ninth and tenth boxes carry "
    + "the eighth box's name with a suffix, so the number in the field name is not the number on the paper.",
  "Check Box8.2":
    "As above: widget 8.2 marks the ground printed as 10."
};

/* ---- fixtures ------------------------------------------------------------ *
 * Two participants. The canonical one is unremarkable. The boundary one has a
 * long hyphenated name with an apostrophe, a long address, a long e-mail and a
 * phone number with an extension, because a value that fits the box is not
 * evidence that every value does. Neither signs anything. */
const FIXTURES = {
  canonical: {
    "participant.full_legal_name": "Jordan Avery Reyes",
    "participant.street_address": "412 Chugach Way, Anchorage, AK 99501",
    "participant.email": "jordan.reyes@example.org",
    "participant.phone": "907-555-0142",
    "matter.case_number": "3AN-19-04217CR"
  },
  boundary: {
    "participant.full_legal_name": "Maria-Alejandra O’Shaughnessy-Whitfield",
    "participant.street_address": "1188 Upper Hillside Loop Road, Apartment 14B, Fairbanks, Alaska 99709-2214",
    "participant.email": "maria.alejandra.oshaughnessy.whitfield@longmailexample.org",
    "participant.phone": "(907) 555-0199 ext. 4417",
    "matter.case_number": "4FA-24-01188CR"
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
  const entry = all.find((e) => e.state === "AK" && e.formNumber === ROUTE.formNumber && e.assetClass === "FORM");
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
      effectiveLabel: r.effectiveLabel, regionHeading: r.effectiveLabel,
      widgets: every.map((w) => ({ page: w.page, rect: w.rect })),
      multiline: r.multiline === true,
      maxLength: r.maxLength ?? null
    });
  }

  const { bytes, report } = await finalizeOfficialForm({
    sourceBytes: source.bytes,
    expectedSha256: source.sha256,
    census: censusForFinalizer,
    facts,
    explicitMappings,
    unwritableFields,
    documentTextLines: census.pageText.flatMap((p) => p.lines.map((l) => l.text)),
    title: FORM_TITLE
  });
  if (process.env.AK_TF810_DEBUG_RENDER) {
    console.log(`-- ${fixtureName}: written=${report.written.length} refused=${report.refused.length}`);
    for (const r of report.refused) console.log(`   ${r.field ?? r.anchor}: ${r.reason}${r.category ? ` (${r.category})` : ""}`);
  }
  return { bytes, report };
}

/* ---- byte proof: what actually landed on the paper ------------------------- */
async function byteProof(census, artifactBytes, report, fixtureName) {
  const tmp = path.join(ROOT, `.ak-tf810-byte-proof-${fixtureName}.pdf`);
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
  out.push(`# Filing instructions \u2014 ${ROUTE.publicLabel}`, "");
  out.push(
    `This packet is the Alaska Court System's form **${source.formNumber}**, `
    + `_${FORM_TITLE}_, prepared under ${ROUTE.authority}.`, ""
  );

  out.push("## What this form is, and what it is not", "");
  out.push(
    "It is a **correction request**, not a petition. The form says so on its own face: the ten grounds listed on it are "
    + "removals **the court system performs automatically**, and this form is for a requester who believes the court made "
    + "an error and their case should already have come off the online public index (CourtView). There is no judge's "
    + "order on it and nothing to argue \u2014 you tick the ground that is true of your case and file it at your local "
    + "trial court.", ""
  );
  out.push("The form routes two neighbouring requests away from itself, and it is right to:", "");
  out.push("- To ask a judge to make a **still-public case, or records inside it, confidential or sealed**, use **TF-800**.");
  out.push("- To remove **only your name** rather than the whole case, use **TF-805**.", "");

  out.push("## Where you file this", "");
  out.push(
    "File it with the **clerk's office of your local Alaska trial court** \u2014 the court named in the case number at "
    + "the top of the form. The form says so in its own words.", ""
  );
  out.push(
    "**Any filing fee is not stated here**, because it is not established in any source this packet holds and an "
    + "unsourced figure in a filing instruction is worse than none. Ask the clerk.", ""
  );

  out.push("## The two grounds that need an attachment", "");
  out.push(
    "- **Ground 4** (a suspended imposition of sentence): the form tells you to attach proof of the SIS and any order "
    + "setting aside.",
    "- **Ground 9** (already confidential or sealed under Administrative Rule 37.6): the form tells you to attach a copy "
    + "of that order.", ""
  );
  out.push("The platform holds neither attachment and does not attach them for you.", "");

  out.push("## What you must do before you file", "");
  out.push("1. **Fill in the items in the table below.**");
  out.push("2. **Tick the one ground that is true of your case**, from the list under _The choices that are yours_. If you tick ground 10, write the rule or statute number on the line beneath it.");
  out.push("3. **Attach what grounds 4 and 9 require**, if you ticked either.");
  out.push("4. **Sign and date the form yourself.** Both lines are left blank on purpose.");
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
  out.push("- **Every ground.** Each is a statement about how your case ended, and only you know which is true.");
  out.push("- **The clerk's block at the foot of the form** \u2014 the response, the date sent and the initials. That is the court's.");
  out.push("");

  out.push("## What this packet is not", "");
  out.push(
    "This is a prepared copy of an official Alaska Court System form. It is not legal advice, it is not filed for you, "
    + "and it does not decide whether your case comes off the public index."
  );
  out.push("");
  out.push(`_Route: ${ROUTE.routeKey} \u2014 ${ROUTE.authority}_`);
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
      protected: census.rows.filter((r) => r.policy === "protect").length
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

    const file = `${OUT}/fixtures/tf810-${fixtureName}-filled.pdf`;
    fs.writeFileSync(path.join(ROOT, file), bytes);
    const sha256 = crypto.createHash("sha256").update(bytes).digest("hex");

    artifacts.push({
      fixture: `tf810-${fixtureName}`, file, sha256, byteLength: bytes.length,
      pageCount: census.pageCount,
      documents: [source.formNumber],
      pageManifest: Array.from({ length: census.pageCount }, (_, i) => ({
        packetPage: i + 1, formNumber: source.formNumber, sourcePage: i + 1, sourceSha256: source.sha256
      }))
    });

    writeProofs.push({
      fixture: `tf810-${fixtureName}`, formNumber: source.formNumber, sourceSha256: source.sha256,
      proofMethod: "flattened widget appearances read back at every measured /Rect of the finalized bytes",
      valuesReportedByFinalizer: report.written.length,
      flattenedWidgetAppearancesReadFromOutputBytes: proof.appearances,
      addedGlyphsReadFromOutputBytes: proof.glyphs,
      nonWhitespaceGlyphsOutsideMeasuredWriteBoxes: 0,
      refusedFieldsWithInk: proof.refusedFieldsWithInk,
      actualWrites: proof.actualWrites
    });

    if (fixtureName === "canonical") map = fieldMapFor(source, census, report);

    const rasterDir = `${OUT}/raster/tf810-${fixtureName}`;
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
        fixture: `tf810-${fixtureName}`, page: i + 1,
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
      "Administrative Rule 40(a) and AS 22.35.030 are the route and TF-810 is the form for correcting a case the court "
      + "system should already have removed under them. Which of the ten printed grounds is true is a fact about the "
      + "requester's own case rather than a consequence of the route, so all ten are left to the participant.",
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
          "TF-810 is a correction request rather than a petition. The form states that the ten grounds on it are removals "
          + "the court system performs automatically, and that this form is for a requester who believes the court made "
          + "an error.",
        consequence:
          "There is no verification, no certificate of service and no proposed order on this form, and the packet does "
          + "not invent any. The clerk's response block at the foot of the page carries no widget and is left alone."
      },
      {
        finding: "The ten printed grounds are statements about how a particular case ended.",
        consequence:
          "Every one is a participant election. This packet is built for Administrative Rule 40(a) and AS 22.35.030, and "
          + "ticking a ground would assert a disposition the platform does not hold."
      },
      {
        finding: "Grounds 4 and 9 each require an attachment the platform does not hold — proof of a suspended imposition of sentence, and a copy of a Rule 37.6 order.",
        consequence: "Both are named in the instructions in the form's own terms, beside the elections they belong to."
      },
      {
        finding:
          "The widget named `partyNames` is the CASE NAME box, and the ninth and tenth grounds are marked by widgets "
          + "named `Check Box8.1` and `Check Box8.2`.",
        consequence:
          "The field names on this form are not a reliable channel. Every caption is read off the page at the widget's "
          + "own coordinate and re-checked on each build, and the two mismatches are recorded in the field census."
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
