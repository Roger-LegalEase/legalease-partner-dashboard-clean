#!/usr/bin/env node
/**
 * The Michigan human-trafficking-victim set-aside family — `mi_setaside_trafficking-set`.
 *
 *   node scripts/build-census-v1-mi_setaside_trafficking-set.mjs [--check] [--no-raster]
 *
 * One official SCAO form, MC 227b, _Application for Human Trafficking Victim
 * to Set Aside Conviction(s)_, under the authorities bound below. Pages 1 and
 * 2 are the sworn application, page 3 carries the notice of hearing and proof
 * of service, and page 4 is the court's printed instruction sheet.
 *
 * THREE THINGS ABOUT THIS FORM SHAPED THE IMPLEMENTATION.
 *
 * First, the PROOF OF SERVICE. MC 227b carries it on page 3, and it is a sworn
 * declaration about mailings to the prosecuting official, Attorney General,
 * and Michigan State Police. Its dates, selections, and signature remain
 * protected because those events have not occurred when this packet is built.
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
 * A NOTE ON THE OTHER BUILDER. scripts/build-census-v1-mi-setaside-trafficking-set.mjs
 * (hyphenated) also writes this family's overlay directory and predates this
 * builder. The two must not both be run against the same output. That is
 * flagged in build-findings rather than resolved here, because the other script
 * is outside this focused family's writable paths.
 *
 * Rasterization goes through scripts/raster/pdf-page-raster.mjs. Never Poppler.
 */
import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import zlib from "node:zlib";
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
const { PDFDocument, PDFName, PDFRawStream, StandardFonts } = require("pdf-lib");

const FAMILY_ID = "mi_setaside_trafficking-set";
const CORPUS_INDEX = "data/rcap-all50/local-source-corpus-index.json";
const OUT = "data/rcap-all50/overlays/census-v1/mi/mi-setaside-trafficking-set--official-pdf-fill";
const BUILD_SCRIPT = "scripts/build-census-v1-mi_setaside_trafficking-set.mjs";

const ROUTE = Object.freeze({
  jurisdiction: "MI",
  routeKey: "obligation:track-pathway:MI:mi_setaside_trafficking:human-trafficking-related-set-aside-application",
  routeSelectionId: "mi-setaside-trafficking-mc-227b-primary-filing",
  publicLabel: "Set aside a conviction directly resulting from human trafficking",
  authority: "MCL 780.621(3), MCL 780.621b, MCL 780.621d, MCL 780.622, MCL 780.623; SCAO form MC 227b (Rev. 7/24)",
  documents: [
    { formNumber: "MC-227B", title: "Application for Human Trafficking Victim to Set Aside Conviction(s)", instrumentKind: "primary_filing_and_proof_of_service" }
  ]
});

const SOURCE_PIN = Object.freeze({
  formNumber: "MC-227B",
  revision: "REV-2024-07",
  pathInArchive: "STATES/MI/02_PACKET_FORMS/MI__FORM__MC-227B__application-by-human-trafficking-victim-to-set-aside-conviction-s__REV-2024-07__EN.pdf",
  sha256: "1620aa798830917707112ce6fb770aeeedc24c44e69f15b05f8b0c1c20e478a6",
  byteLength: 370315,
  pageCount: 4,
  acroFieldCount: 102
});

/*
 * Both fixtures moved in the per-widget-fitting repair, and the raster receipt
 * they were pinned under is void.
 *
 *   canonical  4ec6ceac9416e2d674de0aec69f353f1233ae1bb08dc8d947fac089c916d8361
 *           -> 5adcf1335b6fbedb01880c9559f2a0d06b5fbfab8ae36e54e0a3eae3df358e65
 *   boundary   eb025c3aaeefd12ad6c452946a2be4526f469b95ab01628ded30aed10f68ddf9
 *           -> 8f24ca2af0e6b6d04f5e19f5a68455285e44100b9431690ba8d19806c17f44dd
 *
 * The boundary fixture moved because the defect was there: `caseno` is now
 * drawn at 8.36pt on page 1 and 6pt on pages 2 and 3 instead of 10pt in all
 * three, so the case number is inside its box everywhere instead of overrunning
 * one and being clipped by two.
 *
 * The canonical fixture moved for a quieter reason worth stating plainly: page
 * 1's caseno widget is 10.36pt high, so the fit for that box has always been
 * 8.36pt -- the fitter measured it and the bytes ignored it, because the widget
 * carries a /DA of its own that said 10. The canonical value fitted at 10 as
 * well, so nothing was ever wrong on that page; what changed is that the size
 * the family measures is now the size it draws. Pages 2 and 3 of canonical are
 * unchanged at 10pt.
 */
const EXPECTED_ARTIFACTS = Object.freeze({
  canonical: Object.freeze({
    sha256: "5adcf1335b6fbedb01880c9559f2a0d06b5fbfab8ae36e54e0a3eae3df358e65",
    byteLength: 378568
  }),
  boundary: Object.freeze({
    sha256: "8f24ca2af0e6b6d04f5e19f5a68455285e44100b9431690ba8d19806c17f44dd",
    byteLength: 378609
  })
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
  "MC-227B": {
    /* --- the caption ---------------------------------------------------- */
    district: { section: "Caption", label: "Judicial District", ...SUPPLY("the judicial district number of the court where the conviction was entered — instruction 2 says you file in that court, and a separate application for each court") },
    circuit: { section: "Caption", label: "Judicial Circuit", ...SUPPLY("the judicial circuit number of that court, if it is a circuit court") },
    county: { section: "Caption", label: "County", ...WRITE("matter.county") },
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

    /* --- the sworn nexus statement ---------------------------------------- */
    explain1: { section: "2. Human-trafficking nexus", label: "Facts supporting the direct-result nexus - line 1", ...SUPPLY("the facts, in your own words, supporting that this conviction was a direct result of being a victim of a human-trafficking violation") },
    explain2: { section: "2. Human-trafficking nexus", label: "Facts supporting the direct-result nexus - line 2", ...SUPPLY("continue the facts supporting the direct-result nexus") },
    explain3: { section: "2. Human-trafficking nexus", label: "Facts supporting the direct-result nexus - line 3", ...SUPPLY("continue the facts supporting the direct-result nexus") },
    Explain4: { section: "2. Human-trafficking nexus", label: "Facts supporting the direct-result nexus - line 4", ...SUPPLY("continue the facts supporting the direct-result nexus") },
    Explain5: { section: "2. Human-trafficking nexus", label: "Facts supporting the direct-result nexus - line 5", ...SUPPLY("finish the facts supporting the direct-result nexus; attach additional pages if needed") },

    /* --- page 2: earlier applications and deferred convictions ------------ */
    noappcheck: { section: "3. Earlier applications for item 1 convictions", selection: true, label: "No earlier application was filed for an item 1 conviction (selection)", ...ELECTION("select this only if no earlier application was filed for any conviction listed in item 1") },
    prevappcheck: { section: "3. Earlier applications for item 1 convictions", selection: true, label: "An earlier application was filed for an item 1 conviction (selection)", ...ELECTION("select this if an earlier application was filed, then complete every cell of each used row below") },
    noappcheck2: { section: "4. Earlier applications for other convictions", selection: true, label: "No earlier application was filed for any other conviction (selection)", ...ELECTION("select this only if no earlier application was filed for any other conviction") },
    prevappcheck2: { section: "4. Earlier applications for other convictions", selection: true, label: "An earlier application was filed for another conviction (selection)", ...ELECTION("select this if an earlier application was filed, then complete every cell of each used row below") },
    ...Object.fromEntries([1, 2, 3, 4].flatMap((n) => [
      [`prevc${n}`, { section: "3. Earlier applications for item 1 convictions", label: `Earlier application row ${n} - crime`, ...SUPPLY("the crime identified in the earlier application") }],
      [`prevch${n}`, { section: "3. Earlier applications for item 1 convictions", label: `Earlier application row ${n} - charge code`, ...SUPPLY("the MCL citation or PACC charge code from the earlier application and court record") }],
      [`prevcdate${n}`, { section: "3. Earlier applications for item 1 convictions", label: `Earlier application row ${n} - conviction date`, ...SUPPLY("the conviction date from the court record") }],
      [`prevcno${n}`, { section: "3. Earlier applications for item 1 convictions", label: `Earlier application row ${n} - case number`, ...SUPPLY("the case number from the earlier application") }],
      [`prevdispo${n}`, { section: "3. Earlier applications for item 1 convictions", label: `Earlier application row ${n} - disposition`, ...SUPPLY("the court's disposition of the earlier application") }]
    ])),
    ...Object.fromEntries([1, 2, 3].flatMap((n) => [
      [`4prevc${n}`, { section: "4. Earlier applications for other convictions", label: `Other earlier application row ${n} - crime`, ...SUPPLY("the crime identified in the earlier application") }],
      [`4prevch${n}`, { section: "4. Earlier applications for other convictions", label: `Other earlier application row ${n} - charge code`, ...SUPPLY("the MCL citation or PACC charge code from the earlier application and court record") }],
      [`4prev${n === 3 ? "cdate" : "date"}${n}`, { section: "4. Earlier applications for other convictions", label: `Other earlier application row ${n} - conviction date`, ...SUPPLY("the conviction date from the court record") }],
      [`4prevcno${n}`, { section: "4. Earlier applications for other convictions", label: `Other earlier application row ${n} - case number`, ...SUPPLY("the case number from the earlier application") }],
      [`4prevdispo${n}`, { section: "4. Earlier applications for other convictions", label: `Other earlier application row ${n} - disposition`, ...SUPPLY("the court's disposition of the earlier application") }]
    ])),
    anycheck: { section: "5. Deferred-and-dismissed convictions", selection: true, label: "No convictions were deferred and dismissed (selection)", ...ELECTION("select this only if you have had no convictions deferred and dismissed") },
    defercheck: { section: "5. Deferred-and-dismissed convictions", selection: true, label: "Convictions were deferred and dismissed (selection)", ...ELECTION("select this if you have deferred-and-dismissed convictions, then list them") },
    deferlist1: { section: "5. Deferred-and-dismissed convictions", label: "Deferred-and-dismissed convictions - line 1", ...SUPPLY("each deferred-and-dismissed conviction and its case number") },
    deferlist2: { section: "5. Deferred-and-dismissed convictions", label: "Deferred-and-dismissed convictions - line 2", ...SUPPLY("continue the list of deferred-and-dismissed convictions") },

    /* --- applicant oath and notarization ---------------------------------- */
    appsig: { section: "Applicant oath", label: "Applicant signature", ...PROTECT(SIGNATURE, "you sign the sworn application yourself") },
    sworndate: { section: "Applicant oath", label: "Subscribed and sworn date", ...PROTECT(SIGNATURE, "the clerk or notary records this when administering the oath") },
    notsig: { section: "Applicant oath", label: "Deputy clerk or notary signature", ...PROTECT(COURT_OWNED, "the deputy clerk or notary signs after administering the oath") },
    name: { section: "Applicant oath", label: "Deputy clerk or notary name", ...PROTECT(COURT_OWNED, "the deputy clerk or notary prints their name") },
    expcom: { section: "Applicant oath", label: "Notary commission expiration", ...PROTECT(COURT_OWNED, "the notary supplies the commission expiration") },
    notcounty: { section: "Applicant oath", label: "Notary public county", ...PROTECT(COURT_OWNED, "the notary supplies the county of commission") },
    actcountycheck: { section: "Applicant oath", selection: true, label: "Acting in another county (selection)", ...PROTECT(COURT_OWNED, "the notary selects this if the act occurs in another county") },
    actcounty: { section: "Applicant oath", label: "County where notarial act occurred", ...PROTECT(COURT_OWNED, "the notary supplies the county where the act occurred") },
    electcheck: { section: "Applicant oath", selection: true, label: "Electronic or remote notarization (selection)", ...PROTECT(COURT_OWNED, "the notary selects this when the act used an electronic or remote notarization system") },

    /* --- page 3: hearing and proof of service ----------------------------- */
    proofficial: { section: "Notice of hearing", label: "Prosecuting official", ...SUPPLY("the prosecuting official for the conviction") },
    hdate: { section: "Notice of hearing", label: "Hearing date and time", ...PROTECT(COURT_OWNED, "the court sets the hearing date and time") },
    hloc: { section: "Notice of hearing", label: "Hearing location", ...PROTECT(COURT_OWNED, "the court sets the hearing location") },
    hjudge: { section: "Notice of hearing", label: "Hearing judge", ...PROTECT(COURT_OWNED, "the court identifies the judge") },
    posnoticecheck: { section: "Proof of service", selection: true, label: "Notice of hearing included (selection)", ...PROTECT(SIGNATURE, "select this only after the notice actually traveled with the served packet") },
    posofficialcheck: { section: "Proof of service", selection: true, label: "Prosecuting official served (selection)", ...PROTECT(SIGNATURE, "select this only after mailing the packet to the prosecuting official") },
    posofficialdate: { section: "Proof of service", label: "Date prosecuting official was served", ...PROTECT(SIGNATURE, "enter this only after the mailing occurred") },
    posattygencheck: { section: "Proof of service", selection: true, label: "Attorney General served (selection)", ...PROTECT(SIGNATURE, "select this only after mailing the packet to the Attorney General") },
    posattygendate: { section: "Proof of service", label: "Date Attorney General was served", ...PROTECT(SIGNATURE, "enter this only after the mailing occurred") },
    posmspdate: { section: "Proof of service", label: "Date Michigan State Police was served", ...PROTECT(SIGNATURE, "enter this only after mailing the packet, fingerprint card, and required fee") },
    sigdate: { section: "Proof of service", label: "Proof-of-service signature date", ...PROTECT(SIGNATURE, "date this only when signing the completed proof of service") },
    sig: { section: "Proof of service", label: "Applicant or attorney signature", ...PROTECT(SIGNATURE, "sign this only after the service statements are true") }
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
    const pinMoved = entry.path !== SOURCE_PIN.pathInArchive
      || entry.sha256 !== SOURCE_PIN.sha256
      || entry.byteLength !== SOURCE_PIN.byteLength
      || entry.pageCount !== SOURCE_PIN.pageCount
      || entry.acroFieldCount !== SOURCE_PIN.acroFieldCount
      || entry.revision !== SOURCE_PIN.revision;
    if (pinMoved) {
      failures.push({
        sourceId: `official-form:${wanted.formNumber}`,
        why: "the committed corpus index no longer matches the PF06 exact-source pin",
        expected: SOURCE_PIN,
        actual: {
          pathInArchive: entry.path, sha256: entry.sha256, byteLength: entry.byteLength,
          pageCount: entry.pageCount, acroFieldCount: entry.acroFieldCount, revision: entry.revision
        }
      });
      continue;
    }
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
    /*
     * MEASURE EVERY WIDGET, NOT JUST THE FIRST ONE.
     *
     * `caseno` is one field printed in three places on MC 227b: the caption box
     * on page 1 is 160.44pt wide, and the case-number blanks on the notice of
     * hearing and the proof of service are 103pt. Without this opt-in the
     * finalizer fits the value against `widgets[0]` alone, so the two 103pt
     * boxes were never measured at all -- and because each widget carries a /DA
     * of its own, the size the fitter did choose never reached the bytes
     * either. The boundary case number `2024-0011882-SUPPLEMENTAL-FY` was drawn
     * at 10pt in all three. It needs 162.75pt at that size, so it ran 6.31pt
     * past the page-1 box onto the form's own printed ink, and on pages 2 and 3
     * the appearance stream's own clip -- `2 2 m ... 101 2 l h W n`, 99pt of
     * usable width -- cut it to "2024-0011882-SUPPLEMENTA". The value was
     * complete in the content stream and unreadable on paper.
     *
     * `fitTextPerWidget` is the finalizer's documented per-family opt-in for
     * exactly this shape -- one value, several places, different widths. It
     * writes each widget's own measured size into that widget's own /DA and
     * leaves the field /DA at the smallest of them, so a widget carrying no /DA
     * inherits a size that is safe everywhere. Nothing in the shared finalizer
     * or the shared fitter changes: the defaults every other family rebuilds
     * under are untouched.
     *
     * `evaluateDeclaredMinimumSize` is the fitter's own per-family opt-in, and
     * this family takes it because a repaired family carries the opt-in the
     * host asks for. Measured here it decides nothing: every ladder on this
     * form lands on its floor exactly, so it can neither move a size nor turn a
     * refusal into a write.
     */
    fitTextPerWidget: true,
    evaluateDeclaredMinimumSize: true,
    documentTextLines: census.pageText.flatMap((p) => p.lines.map((l) => l.text)),
    title: source.title
  });
  if (process.env.MI227B_DEBUG_RENDER) {
    console.log(`-- ${source.formNumber} ${fixtureName}: written=${report.written.length} refused=${report.refused.length}`);
    for (const r of report.refused) console.log(`   ${r.field ?? r.anchor}: ${r.reason}${r.category ? ` (${r.category})` : ""}`);
  }
  return { bytes, report };
}

/* ---- what the finished page can actually show ------------------------------- */
/*
 * Float noise only. Both widths below come from the same Helvetica metrics
 * rounded to three decimals, so anything wider than this is a real overrun
 * rather than rounding.
 */
const FIT_TOLERANCE_PT = 0.01;

/*
 * A STRING IN THE BYTES IS NOT A VALUE ON THE PAGE.
 *
 * The proof below used to end at `matchesExpected`: it read the text back out
 * of the flattened appearance stream and compared it to the fact. That is true
 * of an unreadable page. `2024-0011882-SUPPLEMENTAL-FY` read back exactly, and
 * `unfittable` was empty, while the page-1 caption box was overrun by 6.31pt
 * onto the form's own printed rule and pages 2 and 3 clipped the value to
 * `2024-0011882-SUPPLEMENTA`. Both counters were telling the truth about the
 * string and nothing about the paper, so the defect shipped behind nine zeros.
 *
 * This reads the geometry the page actually draws with: the appearance's own
 * /BBox, the clip path in force when the text is shown (the last `W n`), the
 * size in its /Tf and the origin in its /Tm. The width a value may occupy is
 * measured from the text origin to the clip -- not to the widget rectangle,
 * because the clip is what a viewer obeys and on this form it sits 2pt inside
 * the box. Helvetica is measured with the same standard font the finalizer
 * embeds, so this is the width that will be drawn rather than an estimate.
 */
async function appearanceGeometry(artifactBytes) {
  const inflate = (buf) => { try { return zlib.inflateSync(buf); } catch { return buf; } };
  const doc = await PDFDocument.load(artifactBytes, { ignoreEncryption: true, updateMetadata: false });
  const helvetica = await (await PDFDocument.create()).embedFont(StandardFonts.Helvetica);
  const ctx = doc.context;
  const rows = new Map();
  doc.getPages().forEach((page, index) => {
    const resources = page.node.get(PDFName.of("Resources"));
    const xObjects = resources && ctx.lookup(resources).get(PDFName.of("XObject"));
    if (!xObjects) return;
    for (const [name, ref] of ctx.lookup(xObjects).entries()) {
      const obj = ctx.lookup(ref);
      if (!(obj instanceof PDFRawStream)) continue;
      const stream = inflate(Buffer.from(obj.contents)).toString("latin1");
      let text = "";
      for (const token of stream.match(/\((?:[^()\\]|\\.)*\)|<[0-9A-Fa-f\s]{2,}>/g) ?? []) {
        if (token.startsWith("(")) { text += token.slice(1, -1); continue; }
        const digits = token.slice(1, -1).replace(/\s+/g, "");
        if (digits.length % 2 === 0) text += Buffer.from(digits, "hex").toString("latin1");
      }
      const boxRef = obj.dict.get(PDFName.of("BBox"));
      const box = boxRef ? ctx.lookup(boxRef).asArray().map((n) => n.asNumber()) : null;
      const tf = stream.match(/\/(\S+)\s+([\d.]+)\s+Tf/);
      const tm = stream.match(/([\d.-]+)\s+([\d.-]+)\s+([\d.-]+)\s+([\d.-]+)\s+([\d.-]+)\s+([\d.-]+)\s+Tm/);
      // The clip actually in force is the LAST path closed by `W n`. The first
      // is the widget border, which is drawn and then discarded.
      const clips = [...stream.matchAll(/((?:-?[\d.]+\s+-?[\d.]+\s+(?:m|l)\s+)+)h\s*\n?W\s*\n?n/g)];
      const clipMaxX = clips.length
        ? Math.max(...[...clips[clips.length - 1][1].matchAll(/(-?[\d.]+)\s+(-?[\d.]+)\s+(?:m|l)/g)]
          .map((point) => Number(point[1])))
        : null;
      const drawnText = text.trim();
      const fontSizePt = tf ? Number(tf[2]) : null;
      const textOriginXPt = tm ? Number(tm[5]) : 0;
      const limitX = clipMaxX ?? (box ? box[2] : null);
      const key = name.asString().replace(/^\//, "");
      rows.set(`${index + 1} ${key}`, {
        page: index + 1, appearance: key, drawnText,
        bboxWidthPt: box ? Number((box[2] - box[0]).toFixed(3)) : null,
        clipMaxXPt: clipMaxX == null ? null : Number(clipMaxX.toFixed(3)),
        textOriginXPt, fontSizePt,
        availableWidthPt: limitX == null ? null : Number((limitX - textOriginXPt).toFixed(3)),
        drawnWidthPt: fontSizePt && drawnText
          ? Number(helvetica.widthOfTextAtSize(drawnText, fontSizePt).toFixed(3))
          : null
      });
    }
  });
  return rows;
}

/* ---- byte proof ------------------------------------------------------------ */
async function byteProof(source, census, artifactBytes, report, fixtureName) {
  const tmp = path.join(ROOT, `.mi-227b-byte-proof-${source.formNumber}-${fixtureName}.pdf`);
  fs.writeFileSync(tmp, artifactBytes);
  let widgets = [];
  try { widgets = await flattenedWidgets(tmp); } finally { fs.unlinkSync(tmp); }
  const geometry = await appearanceGeometry(artifactBytes);
  const written = new Map(report.written.map((w) => [w.field, w]));
  const actualWrites = [];
  const refusedFieldsWithInk = [];
  const documentAuthoredAppearances = [];
  const clippedOrOverlapping = [];
  let glyphs = 0;
  for (const r of census.rows) {
    for (const wdg of r.widgets) {
      const drawn = drawnAt(widgets, { page: wdg.page, rect: wdg.rect });
      const text = drawn.map((d) => d.text).filter(Boolean);
      const ink = text.join("").trim();
      if (written.has(r.name) && r.policy === "write") {
        glyphs += ink.length;
        /*
         * Every appearance drawn at this widget is measured against the box it
         * is drawn into. `matchesExpected` says the string survived; `fitsBox`
         * says the paper can show it. A write is only whole when both hold.
         */
        const boxes = drawn
          .map((d) => geometry.get(`${d.page} ${d.appearance}`))
          .filter((g) => g && g.drawnWidthPt != null && g.availableWidthPt != null);
        const overflowing = boxes.filter((g) => g.drawnWidthPt > g.availableWidthPt + FIT_TOLERANCE_PT);
        const row = {
          field: r.key, factId: r.fact, page: wdg.page, rect: wdg.rect,
          section: r.section, effectiveLabel: r.effectiveLabel,
          drawnText: text, expected: FIXTURES[fixtureName][r.fact] ?? null,
          matchesExpected: ink === String(FIXTURES[fixtureName][r.fact] ?? "").trim(),
          // The geometry the finished page draws with, read back from its own
          // appearance streams rather than from anything this build reported.
          appearanceBoxes: boxes.map((g) => ({
            appearance: g.appearance, page: g.page,
            bboxWidthPt: g.bboxWidthPt, clipMaxXPt: g.clipMaxXPt,
            textOriginXPt: g.textOriginXPt, fontSizePt: g.fontSizePt,
            availableWidthPt: g.availableWidthPt, drawnWidthPt: g.drawnWidthPt,
            marginPt: Number((g.availableWidthPt - g.drawnWidthPt).toFixed(3)),
            fits: g.drawnWidthPt <= g.availableWidthPt + FIT_TOLERANCE_PT
          })),
          fitsBox: boxes.length > 0 && overflowing.length === 0,
          fitMeasured: boxes.length > 0
        };
        actualWrites.push(row);
        for (const g of overflowing) {
          clippedOrOverlapping.push({
            field: r.key, factId: r.fact, appearance: g.appearance, page: g.page,
            drawnText: g.drawnText, fontSizePt: g.fontSizePt,
            bboxWidthPt: g.bboxWidthPt, clipMaxXPt: g.clipMaxXPt,
            textOriginXPt: g.textOriginXPt,
            availableWidthPt: g.availableWidthPt, drawnWidthPt: g.drawnWidthPt,
            overflowPt: Number((g.drawnWidthPt - g.availableWidthPt).toFixed(3))
          });
        }
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
  /*
   * Fail closed. A value the page cannot show is not a written value, and this
   * family has already shipped one behind a green counter; the build stops here
   * rather than recording the overflow in a report nobody gates on.
   */
  assert.equal(clippedOrOverlapping.length, 0,
    `${source.formNumber}/${fixtureName}: ${clippedOrOverlapping.length} written value(s) do not fit the box they are drawn in: `
    + clippedOrOverlapping.map((c) => `${c.field}@p${c.page} needs ${c.drawnWidthPt}pt at ${c.fontSizePt}pt in ${c.availableWidthPt}pt (over by ${c.overflowPt}pt)`).join("; "));
  return { actualWrites, refusedFieldsWithInk, documentAuthoredAppearances, clippedOrOverlapping,
    glyphs, appearances: widgets.length };
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
  // Scoped to the document so future multi-form extensions cannot confuse
  // identically named fields.
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
    /*
     * A value wider than the box it is drawn in is a visual defect whether the
     * viewer clips it or lets it run over the form's printed ink, and it is one
     * this family shipped: three appearances of the boundary case number, two
     * clipped to `2024-0011882-SUPPLEMENTA` and one overrunning its caption box
     * by 6.31pt, while every counter here read zero. The number below is read
     * off the finished appearance streams.
     */
    for (const clipped of p.clippedOrOverlappingWrites ?? []) {
      note("visualDefects", {
        fixture: p.fixture, field: clipped.field, page: clipped.page,
        fontSizePt: clipped.fontSizePt, availableWidthPt: clipped.availableWidthPt,
        drawnWidthPt: clipped.drawnWidthPt, overflowPt: clipped.overflowPt,
        why: "a written value is wider than the box its appearance stream draws it in"
      });
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
    "This packet is SCAO form **MC 227b**, _Application for Human Trafficking Victim to Set Aside Conviction(s)_, prepared "
    + `under ${ROUTE.authority}.`, ""
  );
  out.push(
    "The platform filled in what it holds about your case: the county and the case number. Everything else is yours, "
    + "and every remaining participant blank is listed below by the part of the form it is in. Pages 1 through 3 are "
    + "the application, notice, and proof of service; the last page is the court's own instruction sheet.", ""
  );

  out.push("## Check you are on the right form", "");
  out.push(
    "MC 227b is only for a conviction you contend was **a direct result of being a victim of a human-trafficking "
    + "violation**. Item 2 requires your sworn facts supporting that direct-result connection. Do not use this packet "
    + "for a conviction that lacks that connection.", ""
  );
  out.push("The form routes other applications away: use MC 227 for a conviction not directly resulting from human trafficking, and MC 227a for the misdemeanor-marihuana route described on the form.", "");

  out.push("## Where you file, fees, and required copies", "");
  out.push(
    "**File in the district or circuit court where the conviction happened**, and use a **separate application for "
    + "each court**. Attach a certified copy of every conviction and your direct-result nexus evidence. The official "
    + "instructions say to make five copies of the application and all attachments. They also direct a **$50 payment "
    + "to the State of Michigan** with the Michigan State Police mailing, and warn that certified-copy and fingerprint fees may apply.", ""
  );

  out.push("## The order of filing and service matters", "");
  out.push("The court's instruction sheet requires these events in sequence:", "");
  out.push("1. **Complete item 2 in your own words, then sign the application before a deputy clerk or notary.**");
  out.push("2. **Make five copies** of the application and every attachment and take them to the convicting court clerk.");
  out.push("3. **Mail the required packet, fingerprint card, and $50 payment to Michigan State Police; mail copies to the Attorney General and the correct prosecuting official.**");
  out.push("4. **Only after those mailings are true, complete and sign the Proof of Service on page 3 and return the required copy to the court.**", "");
  out.push(
    "The proof of service is a declaration under penalties of perjury. Its selections, mailing dates, signature date, "
    + "and signature are protected blanks because the build happens before service.", ""
  );

  out.push("## What you must do before you file", "");
  out.push("1. **Fill in every item in the table below.**");
  out.push("2. **Complete the conviction table.** Every line you use, all four columns \u2014 instruction 4 tells you to get the exact date and charge from the court.");
  out.push("3. **Make the choices listed under _The choices that are yours_.**");
  out.push("4. **Attach the certified conviction records and direct-result nexus evidence required by the form.**");
  out.push("5. **Follow the four steps above, in that order.**");
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
  out.push("- **The notarization block.** A deputy clerk or notary completes it while administering the oath.");
  out.push("- **The Proof of Service.** It is sworn and certifies mailings that have not happened when this packet is prepared.");
  out.push("- **The hearing date, location, and judge.** The court supplies them.");
  out.push("- **The attorney block.** You are applying yourself; no attorney-representation fact is held for you.");
  out.push("");

  out.push("## What happens after you file", "");
  out.push(
    "Page 3 states that the hearing cannot be held until the court receives the Michigan State Police report. The court "
    + "completes the notice-of-hearing fields. Opposition, disputed victim status, an evidentiary or contested hearing, "
    + "or a request for individualized advocacy requires a post-generation handoff.", ""
  );

  out.push("## What this packet is not", "");
  out.push(
    "This is a prepared copy of an official SCAO form. It is not legal advice, it is not filed for you, and it does not "
    + "decide whether your conviction is eligible to be set aside."
  );
  out.push("");
  out.push(`_Route: ${ROUTE.routeKey} \u2014 ${ROUTE.authority}_`);
  return `${out.join("\n")}\n`;
}

function readJson(rel) {
  return JSON.parse(fs.readFileSync(path.join(ROOT, rel), "utf8"));
}

function selfTest() {
  assert.equal(FAMILY_ID, "mi_setaside_trafficking-set");
  assert.equal(ROUTE.routeKey,
    "obligation:track-pathway:MI:mi_setaside_trafficking:human-trafficking-related-set-aside-application");
  assert.equal(ROUTE.documents.length, 1);
  assert.equal(ROUTE.documents[0].formNumber, SOURCE_PIN.formNumber);
  assert.equal(ROUTE.documents[0].instrumentKind, "primary_filing_and_proof_of_service");

  const index = readJson(CORPUS_INDEX);
  const entry = index.entries.find((row) => row.state === "MI"
    && row.formNumber === SOURCE_PIN.formNumber && row.assetClass === "FORM");
  assert.ok(entry, "the corpus index must carry the exact MC-227B source");
  assert.deepEqual({
    formNumber: entry.formNumber, revision: entry.revision, pathInArchive: entry.path,
    sha256: entry.sha256, byteLength: entry.byteLength, pageCount: entry.pageCount,
    acroFieldCount: entry.acroFieldCount
  }, SOURCE_PIN);

  const spec = FORM_FIELDS[SOURCE_PIN.formNumber];
  assert.equal(Object.keys(spec).length, SOURCE_PIN.acroFieldCount,
    "the MC-227B field dictionary must cover every indexed AcroForm field");
  const allowedPolicies = new Set(["write", "supply", "election", "protect", "attorney"]);
  assert.ok(Object.values(spec).every((row) => allowedPolicies.has(row.policy)));
  assert.ok(Object.values(spec).filter((row) => row.policy === "write")
    .every((row) => Object.values(FIXTURES).every((fixture) => String(fixture[row.fact] ?? "").length > 0)));
  assert.equal(CONVICTION_ROWS.flatMap((n) => CONVICTION_COLUMNS.map(([prefix]) => `${prefix}${n}`))
    .filter((name) => spec[name]?.policy === "supply").length, 16,
  "all sixteen conviction-table cells must stay participant-supplied");
  for (const field of [
    "posnoticecheck", "posofficialcheck", "posofficialdate", "posattygencheck",
    "posattygendate", "posmspdate", "sigdate", "sig"
  ]) assert.equal(spec[field]?.policy, "protect", `proof-of-service field ${field} must remain protected`);

  const receipt = readJson(`${OUT}/source-receipt.json`);
  assert.equal(receipt.routeKey, ROUTE.routeKey);
  assert.equal(receipt.documents.length, 1);
  assert.deepEqual({
    formNumber: receipt.documents[0].formNumber,
    revision: receipt.documents[0].revision,
    pathInArchive: receipt.documents[0].pathInArchive,
    sha256: receipt.documents[0].sha256,
    byteLength: receipt.documents[0].byteLength
  }, {
    formNumber: SOURCE_PIN.formNumber,
    revision: SOURCE_PIN.revision,
    pathInArchive: SOURCE_PIN.pathInArchive,
    sha256: SOURCE_PIN.sha256,
    byteLength: SOURCE_PIN.byteLength
  });

  const fieldMap = readJson(`${OUT}/production-field-map.json`);
  assert.deepEqual(fieldMap.routeKeys, [ROUTE.routeKey]);
  assert.equal(fieldMap.requiredBeforeFiling.length, fieldMap.requiredBeforeFilingCount);
  assert.equal(fieldMap.generationAllowed, false);
  assert.equal(fieldMap.runtimeSelectable, false);
  assert.equal(fieldMap.commercialRoutesOpened, 0);

  const instructionsText = fs.readFileSync(path.join(ROOT, OUT, "participant-instructions.md"), "utf8");
  for (const phrase of [
    "File in the district or circuit court where the conviction happened",
    "$50 payment to the State of Michigan",
    "Mail the required packet, fingerprint card, and $50 payment to Michigan State Police",
    "Only after those mailings are true, complete and sign the Proof of Service",
    "requires a post-generation handoff",
    ROUTE.routeKey
  ]) assert.ok(instructionsText.includes(phrase), `participant instructions dropped: ${phrase}`);

  const rendered = readJson(`${OUT}/reports/rendered-artifacts.json`);
  assert.equal(rendered.rasterState, "BUILT_RASTER_PENDING");
  assert.equal(rendered.everyPageRastered, false);
  assert.equal(rendered.rasterPages.length, 0);
  assert.equal(rendered.independentVerificationPending, true);
  for (const artifact of rendered.artifacts) {
    const expected = EXPECTED_ARTIFACTS[artifact.fixture];
    assert.ok(expected, `unexpected artifact fixture: ${artifact.fixture}`);
    const bytes = fs.readFileSync(path.join(ROOT, artifact.file));
    const digest = crypto.createHash("sha256").update(bytes).digest("hex");
    assert.equal(digest, expected.sha256, `${artifact.fixture} bytes moved`);
    assert.equal(bytes.length, expected.byteLength, `${artifact.fixture} length moved`);
    assert.equal(artifact.sha256, expected.sha256, `${artifact.fixture} report hash moved`);
    assert.equal(artifact.byteLength, expected.byteLength, `${artifact.fixture} report length moved`);
    assert.equal(artifact.pageCount, SOURCE_PIN.pageCount);
  }

  const counters = readJson(`${OUT}/reports/completeness-counters.json`);
  assert.equal(counters.allNineZero, true);
  assert.deepEqual(Object.values(counters.counters), Array(9).fill(0));
  const buildStatus = readJson(`${OUT}/build-status.json`);
  assert.equal(buildStatus.rasterState, "BUILT_RASTER_PENDING");
  assert.equal(buildStatus.independentVerificationStatus, "PENDING");
  assert.equal(buildStatus.selfVerified, false);
  assert.equal(buildStatus.productionTouched, false);

  const jsonFiles = fs.readdirSync(path.join(ROOT, OUT), { recursive: true })
    .filter((name) => String(name).endsWith(".json"));
  for (const file of jsonFiles) {
    const payload = readJson(`${OUT}/${file}`);
    assert.equal(JSON.stringify(payload).includes('"claimReleased"'), false,
      `${file} must not release the Captain-owned claim`);
  }
  console.log(`SELF_TEST_OK ${FAMILY_ID}`);
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
        // Written values measured against the box they are drawn in, so
        // `visualDefects` is counted from the artifact rather than declared.
        clippedOrOverlappingWrites: proof.clippedOrOverlapping,
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
      + "names SCAO authored, which are meaningful and section-keyed, plus the printed section heading. The scrambled "
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
      "MC 227b squashes its printed captions together in the text stream -- \"STATE OF MICHIGANCASE NO. and JUDGE\", "
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
      "MCL 780.621(3) and MCL 780.621d is one section and MC 227b is its form. Nothing on it is a route election: the two People-of boxes "
      + "say who prosecuted the offence and the multiple-case-numbers box says how many cases the table lists, both "
      + "facts about the participant's own record. The form itself routes the two neighbouring applications elsewhere, "
      + "to MC 227a and MC 227, and the instructions carry that in the form's own words.",
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
    rasterState: "BUILT_RASTER_PENDING", byteDerivedHashes: true, rasterEngine: RASTER_ENGINE, rasterPages,
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
      refusedFieldsWithInk: p.refusedFieldsWithInk,
      clippedOrOverlappingWrites: p.clippedOrOverlappingWrites
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
      + "here: this form cannot be caption-checked from its own text stream, so a reviewer reading the paper is "
      + "the check that a value sits under the heading it belongs to.",
    whatToLookAt: [
      "Page 1, the caption block: the county and the case number written, each under the heading it belongs to, and the "
        + "judicial district, circuit, ORI, court address, court telephone and police report number blank.",
      "Page 1, the parties block: neither People-of box ticked, and the defendant's name-address-telephone box blank. "
        + "Confirm the empty contact box reads as a blank the applicant fills, not as a form that lost a value.",
      "Page 1, the conviction table: all four lines blank, all four columns.",
      "Page 2, the applicant oath and notarization: participant signature and all notary-owned fields blank.",
      "Page 3, the notice of hearing: court-owned hearing date, location, and judge blank.",
      "Page 3, the Proof of Service: selections, service dates, signature date, and signature blank. This is the one to "
        + "look hardest at \u2014 it declares under penalties of perjury that the listed service actually occurred.",
      "Page 4: the court's instruction sheet, unaltered."
    ],
    artifacts: artifacts.map((a) => ({ fixture: a.fixture, file: a.file, sha256: a.sha256, pageCount: a.pageCount })),
    rasterPages: rasterPages.map((p) => ({ fixture: p.fixture, page: p.page, file: p.file, sha256: p.sha256 }))
  });

  writeJson(`${OUT}/build-status.json`, {
    schemaVersion: "rcap-family-build-status/v1", familyId: FAMILY_ID,
    buildStatus: "state_built", reviewStatus: "qa_review_pending", builtBy: BUILD_SCRIPT,
    rasterState: "BUILT_RASTER_PENDING",
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
          "MC 227b carries a sworn Proof of Service on page 3 covering the prosecuting official, Attorney General, "
          + "Michigan State Police, and the notice of hearing.",
        consequence:
          "Its selections, mailing dates, signature date, and signature remain blank until the service statements are "
          + "true. The participant instructions carry the official sequence through filing, mailing, and returning the "
          + "completed proof to the court."
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
          "scripts/build-census-v1-mi-setaside-trafficking-set.mjs (hyphenated) also writes this family's overlay "
          + "directory and predates this builder.",
        consequence:
          "The two must not both be run against the same output. Flagged rather than resolved here: the other script "
          + "is outside this focused family's writable paths, so removing or redirecting it is the Captain's call."
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
      "reports/caption-evidence.json \u2014 this form cannot be caption-checked from its own text stream, so visual review carries more weight here than usual.",
      "reports/blanks-left-for-the-participant.json \u2014 required court-record, history, nexus, and service facts remain participant-supplied or protected; confirm the instructions make those blanks legible to complete."
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
  if (process.argv.includes("--self-test")) {
    selfTest();
  } else {
    runFamily()
      .then((r) => { console.log(JSON.stringify(r, null, 2)); })
      .catch((e) => { console.error(e); process.exit(1); });
  }
}
