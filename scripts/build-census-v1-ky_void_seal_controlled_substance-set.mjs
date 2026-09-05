#!/usr/bin/env node
/**
 * The Kentucky void-and-seal packet family builder.
 *
 *   node scripts/build-census-v1-ky_void_seal_controlled_substance-set.mjs [--check] [--no-raster]
 *
 * Two census-v1 families share this host, one official form and one strategy:
 *
 *   ky_void_seal_controlled_substance        KRS 218A.275
 *   ky_void_seal_marijuana_synthetic_salvia  KRS 218A.276
 *
 * The strategy is custom_pleading and the distinction matters here more than it
 * usually does. AOC-334 is not the filing. It is the ORDER the court signs --
 * "ORDER VOIDING CONVICTION AND SEALING RECORDS ... So ORDERED this ___ day"
 * over a judge's signature line -- and it prints both statutes on its own face,
 * which is why one form serves both families. The route's `primary_filing` is
 * therefore a motion this build composes, AOC-334 is the `proposed_order`
 * tendered with it, and `certificate_of_service` is the third component.
 *
 * A proposed order is filled in CAPTION MODE and in no other mode. The shared
 * field semantics has that mode already -- court_issued_order_accepts_caption_facts_only
 * -- and it is the whole discipline of this family: the style of the case is the
 * movant's to state, and every word below it is the court's. The recital of what
 * the Defendant completed, the date it was completed, the charges, the list of
 * agencies ordered to seal, the ordering date and the judge's signature are all
 * left exactly as the court printed them.
 *
 * WHERE the motion is filed, WHAT it costs and WHO must be served are read from
 * the committed legal-design track registry, which holds all three for both
 * families, and stated on the participant-facing page. This build used to name
 * the circuit court clerk to ask about each of them instead. That was wrong in
 * the way DET-FEE-AND-WAIVER-001-A1 describes: a named authority is what honesty
 * requires when the record is empty, not a way to avoid stating what the record
 * contains. A family opts in by naming a trackId; one that names none gets
 * nothing stated for it and the build refuses rather than inventing an answer.
 *
 * Two things this build still refuses to state, because nothing it holds
 * establishes them and a filing instruction that guesses is worse than one that
 * admits:
 *
 *   - The serving office's current NAME AND ADDRESS for the county of
 *     conviction, and any filing DEADLINE. The registry names the office and
 *     the method; it gives neither an address nor a number of days. The
 *     certificate of service is rendered with its recipient block empty and
 *     disclosed as required before filing, and the circuit court clerk is named
 *     as the authority to ask for both.
 *   - WHAT the motion must recite beyond the ground AOC-334 itself recites. The
 *     motion asserts the statutory ground in the order's own words and asks the
 *     court to enter the tendered order. It makes no argument the order does not
 *     already make.
 *
 * Nothing in a certificate of service is ever prefilled: a certificate of
 * mailing is a statement about something a person did, and it is signed and
 * dated when the copy actually goes out.
 *
 * Rasterization goes through scripts/raster/pdf-page-raster.mjs (Chromium,
 * calibrated). Never Poppler.
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
import { createTokenSplitter, fitsByFontMetrics } from "./rcap-custom-pleading/split-token.mjs";
import { rasterizePageCalibrated } from "./raster/pdf-page-raster.mjs";
import { classifyField, classifyBlank, rowKeyOf, PASS_COUNTERS, BLANK_DISPOSITIONS } from "./rcap-packet-completeness/completeness-contract.mjs";

const thisFile = fileURLToPath(import.meta.url);
const ROOT = path.resolve(path.dirname(thisFile), "..");
process.chdir(ROOT);
const require = createRequire(import.meta.url);
const { PDFDocument, StandardFonts, rgb } = require("pdf-lib");

const CORPUS_INDEX = "data/rcap-all50/local-source-corpus-index.json";
const OVERLAY_ROOT = "data/rcap-all50/overlays/census-v1/ky";
const FIXED_DATE = "2026-01-01T00:00:00.000Z";

function corpusRoot() {
  const configured = process.env.MASTER_LIBRARY_SOURCE_DIR
    ?? "private/source-imports/Expungement_AI_RCAP_Master_Library_Edition_1";
  assert.ok(fs.existsSync(configured), `the Master Library is not mounted at ${configured}`);
  return configured;
}

const SIGNATURE = "signature_or_date_participant_completion";
const COURT_OWNED = "court_prosecutor_clerk_or_agency_owned";

const WRITE = (fact) => ({ policy: "write", fact });
const SUPPLY = (what) => ({ policy: "supply", what });
const PROTECT = (why) => ({ policy: "protect", refusalClass: why });
const OFFROUTE = (why) => ({ policy: "offroute", routeReason: why });

const COMPONENTS = ["primary_filing", "proposed_order", "certificate_of_service"];

/* ------------------------------------------------------------------ *
 * AOC-334 -- ORDER VOIDING CONVICTION AND SEALING RECORDS
 *
 * Every widget, with the caption printed at its own coordinates. Caption mode
 * decides what may be written; this dictionary decides what each blank IS, and
 * the two agree by construction: only caption facts carry `write`.
 * ------------------------------------------------------------------ */
const AOC334 = {
  title: "Order Voiding Conviction and Sealing Records (AOC-334)",
  pages: 1,
  fields: {
    "Reset": { field: "Reset", page: 1, caption: null, captionAt: null, label: "Reset this form (viewer control)", ...OFFROUTE("a viewer control the reader clicks, never a filing fact") },
    "Print": { field: "Print", page: 1, caption: null, captionAt: null, label: "Print this form (viewer control)", ...OFFROUTE("a viewer control the reader clicks, never a filing fact") },
    "Case  No": { field: "Case  No", page: 1, caption: "Case No.", captionAt: { page: 1, y: 733 }, label: "Case No. in the style of the case", ...WRITE("matter.case_number") },
    "Court": { field: "Court", page: 1, caption: "Court", captionAt: { page: 1, y: 716 }, label: "Court name in the style of the case", ...WRITE("matter.court") },
    "County dropdown": { field: "County dropdown", page: 1, caption: "County", captionAt: { page: 1, y: 698 }, label: "County", ...WRITE("matter.county") },
    "Division": { field: "Division", page: 1, caption: "Division", captionAt: { page: 1, y: 681 }, label: "Division of the court", ...SUPPLY("the division number of the court your case is in — it is printed on your own court paperwork, and the circuit court clerk can tell you") },
    "Defendant": { field: "Defendant", page: 1, caption: "DEFENDANT", captionAt: { page: 1, y: 577 }, label: "Defendant in the style of the case", ...WRITE("participant.full_legal_name") },
    "Defendants Birthdate": { field: "Defendants Birthdate", page: 1, caption: "Defendant's Birthdate", captionAt: { page: 1, y: 539 }, label: "Defendant's Birthdate", ...WRITE("participant.date_of_birth") },
    "Defendants ssn": { field: "Defendants ssn", page: 1, caption: "Defendant's SSN", captionAt: { page: 1, y: 539 }, label: "Defendant's SSN", ...SUPPLY("the Defendant's Social Security number — the platform never stores it and never writes it for you") },
    "ViolationArrest  Date": { field: "ViolationArrest  Date", page: 1, caption: "Violation/Arrest Date", captionAt: { page: 1, y: 539 }, label: "Violation or arrest date", ...SUPPLY("the violation or arrest date, taken from your own court record") },
    "CHARGE": { field: "CHARGE", page: 1, caption: "CHARGE", captionAt: { page: 1, y: 497 }, label: "First charge to be voided and sealed", ...SUPPLY("the first charge to be voided and sealed, worded exactly as it appears on your court record") },
    "CHARGE_2": { field: "CHARGE_2", page: 1, caption: "CHARGE", captionAt: { page: 1, y: 497 }, label: "Second charge to be voided and sealed", ...SUPPLY("a second charge on the same case, if there is one") },
    "CHARGE_3": { field: "CHARGE_3", page: 1, caption: "CHARGE", captionAt: { page: 1, y: 479 }, label: "Third charge to be voided and sealed", ...SUPPLY("a third charge on the same case, if there is one") },
    "CHARGE_4": { field: "CHARGE_4", page: 1, caption: "CHARGE", captionAt: { page: 1, y: 479 }, label: "Fourth charge to be voided and sealed", ...SUPPLY("a fourth charge on the same case, if there is one") },
    "CHARGE_5": { field: "CHARGE_5", page: 1, caption: "CHARGE", captionAt: { page: 1, y: 461 }, label: "Fifth charge to be voided and sealed", ...SUPPLY("a fifth charge on the same case, if there is one") },
    "CHARGE_6": { field: "CHARGE_6", page: 1, caption: "CHARGE", captionAt: { page: 1, y: 461 }, label: "Sixth charge to be voided and sealed", ...SUPPLY("a sixth charge on the same case, if there is one") },
    "Date": { field: "Date", page: 1, caption: "Date", captionAt: { page: 1, y: 395 }, label: "Day and month the terms of treatment, probation or sentence were completed", ...SUPPLY("the day and month you completed the terms of treatment, probation or sentence") },
    "2": { field: "2", page: 1, caption: "Pursuant to KRS 218A.275 and KRS 218A.276", captionAt: { page: 1, y: 405 }, label: "Year the terms of treatment, probation or sentence were completed", ...SUPPLY("the last two digits of the year you completed those terms") },
    "Text1": { field: "Text1", page: 1, caption: "above-listed charge(s)", captionAt: { page: 1, y: 276 }, label: "First line of the agencies ordered to seal their records", ...SUPPLY("the first of the agencies that hold records of this charge and must be ordered to seal them — the circuit court clerk can tell you which agencies to name") },
    "listed charges": { field: "listed charges", page: 1, caption: "hereby ordered to seal any records in", captionAt: { page: 1, y: 300 }, label: "Remaining lines of the agencies ordered to seal their records", ...SUPPLY("any further agencies that hold records of this charge, one after another on these lines") }
  }
};

const FORMS = { "AOC-334": AOC334 };

export const FAMILY_CONFIGS = Object.freeze({
  "ky_void_seal_controlled_substance-set": {
    jurisdiction: "KY",
    // The canonical route universe holds the track-only key and nothing else;
    // the track-pathway/void-and-seal key this family used to print occurs
    // zero times there, so the face and the field map were keyed to a route
    // that does not exist. product-wiring.json and the MASTER_QUEUE row were
    // already on the canonical key, which is the one adopted here.
    routeKey: "obligation:track-only:KY:ky_void_seal_controlled_substance",
    // Opting in to the committed track registry: a family that names a trackId
    // gets its filing destination, fee and service answers read out of
    // data/record-clearing/legal-design-track-registry.json and stated on the
    // participant-facing page. A family that names none states nothing, and the
    // build refuses rather than inventing an answer for it.
    trackId: "ky_void_seal_controlled_substance",
    routeSelectionId: "ky-void-seal-controlled-substance-aoc-334-complete-set",
    legalName: "Motion to Void a First Controlled-Substance Possession Conviction and Seal the Records (KRS 218A.275)",
    routeName: "voiding a first controlled-substance possession conviction and sealing the records under KRS 218A.275",
    statute: "KRS 218A.275",
    officialForm: "AOC-334",
    motionTitle: "MOTION TO VOID CONVICTION AND SEAL RECORDS (KRS 218A.275)"
  },
  "ky_void_seal_marijuana_synthetic_salvia-set": {
    jurisdiction: "KY",
    routeKey: "obligation:track-only:KY:ky_void_seal_marijuana_synthetic_salvia",
    trackId: "ky_void_seal_marijuana_synthetic_salvia",
    routeSelectionId: "ky-void-seal-marijuana-synthetic-salvia-aoc-334-complete-set",
    legalName: "Motion to Void a First Marijuana, Synthetic Drug or Salvia Possession Conviction and Seal the Records (KRS 218A.276)",
    routeName: "voiding a first marijuana, synthetic drug or salvia possession conviction and sealing the records under KRS 218A.276",
    statute: "KRS 218A.276",
    officialForm: "AOC-334",
    motionTitle: "MOTION TO VOID CONVICTION AND SEAL RECORDS (KRS 218A.276)"
  }
});

const FIXTURES = {
  canonical: {
    "participant.full_legal_name": "Jordan Avery Reyes",
    "participant.date_of_birth": "1991-04-17",
    "matter.case_number": "21-CR-00417",
    "matter.county": "Jefferson",
    "matter.court": "Circuit"
  },
  boundary: {
    "participant.full_legal_name": "Maria-Alejandra O'Shaughnessy-Whitfield",
    "participant.date_of_birth": "1968-12-31",
    "matter.case_number": "24-CR-001276-002",
    "matter.county": "Muhlenberg",
    "matter.court": "District"
  }
};

/* ---- the facts the repository already holds ------------------------------- *
 * DET-FEE-AND-WAIVER-001-A1 fixes the order of the two questions: ask first
 * whether the repository establishes the answer, and only where no held source
 * does may a named checkable authority stand in. This build used to skip the
 * first question for the filing destination, the fee and the service party, and
 * named the circuit court clerk for all three. The committed legal-design track
 * registry holds all three, so the packet states them.
 *
 * Every string below is read out of the registry and none is composed here. If
 * the registry stops holding one, this refuses rather than falling back to a
 * clerk to ask -- substituting a question for an answer we have is the exact
 * thing the amendment forbids, and a silent fallback would hide the day the
 * registry changed. */
const TRACK_REGISTRY = "data/record-clearing/legal-design-track-registry.json";

function heldFilingFacts(config) {
  assert.ok(config.trackId, `${config.legalName} names no trackId, so no held filing facts may be stated for it`);
  const parsed = JSON.parse(fs.readFileSync(path.join(ROOT, TRACK_REGISTRY), "utf8"));
  const rows = Array.isArray(parsed) ? parsed : (parsed.tracks ?? parsed.entries ?? Object.values(parsed));
  const entry = rows.find((t) => (t.trackId ?? t.id) === config.trackId);
  assert.ok(entry, `the committed track registry holds no entry for ${config.trackId}`);

  const destination = entry.destination;
  assert.ok(destination?.name, `${config.trackId} carries no destination.name in the committed track registry`);
  assert.ok(destination?.detail, `${config.trackId} carries no destination.detail in the committed track registry`);
  assert.ok(entry.venue, `${config.trackId} carries no venue in the committed track registry`);

  const action = (kind) => (entry.packetSet?.participantActionRequired ?? []).find((a) => a.kind === kind)?.description ?? null;
  const fee = action("pay_fee");
  const serve = action("serve_party");
  assert.ok(fee, `${config.trackId} carries no pay_fee action in the committed track registry`);
  assert.ok(serve, `${config.trackId} carries no serve_party action in the committed track registry`);

  return {
    source: `${TRACK_REGISTRY}, track ${config.trackId}`,
    destinationName: destination.name,
    destinationDetail: destination.detail,
    venue: entry.venue,
    feeDescription: fee,
    feeWaiverDescription: action("apply_fee_waiver"),
    serveDescription: serve,
    fileDescription: action("file")
  };
}

/* ---- source binding ------------------------------------------------------ */
function resolveSources(familyId) {
  const config = FAMILY_CONFIGS[familyId];
  assert.ok(config, `unknown family ${familyId}`);
  const index = JSON.parse(fs.readFileSync(path.join(ROOT, CORPUS_INDEX), "utf8"));
  const rows = Array.isArray(index.entries ?? index.files ?? index)
    ? (index.entries ?? index.files ?? index) : Object.values(index.entries ?? index.files ?? index);
  const root = corpusRoot();
  const resolved = [];
  const failures = [];
  for (const formNumber of [config.officialForm]) {
    const entry = rows.find((e) => String(e.path ?? e.relativePath ?? "").includes(`__${formNumber}__`)
      && String(e.path ?? e.relativePath ?? "").startsWith("STATES/KY/"));
    if (!entry) { failures.push({ sourceIdentity: `official-form:${formNumber}`, why: "no entry for this form number in the committed corpus index" }); continue; }
    const rel = entry.path ?? entry.relativePath;
    const abs = path.resolve(ROOT, root, rel);
    if (!fs.existsSync(abs)) { failures.push({ sourceIdentity: `official-form:${formNumber}`, why: `the indexed path does not exist on disk: ${rel}` }); continue; }
    const bytes = fs.readFileSync(abs);
    const sha256 = crypto.createHash("sha256").update(bytes).digest("hex");
    const indexed = String(entry.sha256 ?? entry.sha ?? "");
    if (indexed && indexed !== sha256) { failures.push({ sourceIdentity: `official-form:${formNumber}`, why: `SHA-256 drift: the committed index says ${indexed}, the corpus binary hashes ${sha256}` }); continue; }
    resolved.push({
      formNumber, sourceId: `official-form:${formNumber}`, pathInArchive: rel,
      revision: /__REV-([0-9A-Za-z-]+)__/.exec(rel)?.[1] ?? null,
      sha256, byteLength: bytes.length, bytes
    });
  }
  return { resolved, failures };
}

function normalizeRect(r) {
  const x = Math.min(r.x, r.x + r.width);
  const y = Math.min(r.y, r.y + r.height);
  return {
    x: Number(x.toFixed(2)), y: Number(y.toFixed(2)),
    width: Number(Math.abs(r.width).toFixed(2)), height: Number(Math.abs(r.height).toFixed(2))
  };
}

async function censusOf(source) {
  const spec = FORMS[source.formNumber];
  const doc = await PDFDocument.load(source.bytes, { ignoreEncryption: true });
  const pages = doc.getPages();
  const pageText = pages.map((p, i) => ({
    page: i + 1,
    lines: groupIntoLines(extractTextItems(p)).map((l) => ({ y: Math.round(l.y), text: l.text }))
  }));
  const rows = [];
  const unmapped = [];
  const used = new Set();
  for (const field of doc.getForm().getFields()) {
    const name = field.getName();
    const entry = spec.fields[name];
    for (const w of field.acroField.getWidgets()) {
      const rect = normalizeRect(w.getRectangle());
      const ref = w.P();
      let pi = pages.findIndex((p) => p.ref === ref);
      if (pi < 0) pi = 0;
      if (!entry) { unmapped.push({ field: name, page: pi + 1, rect, why: "no dictionary entry for this widget name" }); continue; }
      used.add(name);
      const pdfClass = field.constructor.name;
      rows.push({
        key: name, name, page: pi + 1, rect,
        type: pdfClass.replace("PDF", "").toLowerCase().replace("textfield", "text"),
        rectBasis: "acroform_widget_rect_read_first_hand_from_pinned_binary_and_normalized",
        caption: entry.caption, captionAt: entry.captionAt,
        effectiveLabel: entry.label, regionHeading: entry.label,
        policy: entry.policy, fact: entry.fact ?? null,
        refusalClass: entry.refusalClass ?? null,
        what: entry.what ?? null, routeReason: entry.routeReason ?? null,
        isSelectionControl: pdfClass === "PDFCheckBox",
        multiline: typeof field.isMultiline === "function" ? field.isMultiline() : false,
        maxLength: typeof field.getMaxLength === "function" ? (field.getMaxLength() ?? null) : null,
        options: typeof field.getOptions === "function" ? (field.getOptions() ?? []) : []
      });
    }
  }
  const missingKeys = Object.keys(spec.fields).filter((k) => !used.has(k));
  const flat = (x) => String(x).toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
  const captionDrift = [];
  for (const r of rows) {
    if (!r.captionAt) continue;
    const lines = pageText.find((p) => p.page === r.captionAt.page)?.lines ?? [];
    const near = lines.filter((l) => Math.abs(l.y - r.captionAt.y) <= 2);
    const needle = flat(r.caption);
    const found = needle.length > 0 && near.some((l) => flat(l.text).includes(needle));
    if (!found) captionDrift.push({ key: r.key, page: r.captionAt.page, y: r.captionAt.y, caption: r.caption, linesThere: near.map((l) => l.text).slice(0, 2) });
  }
  return { rows, unmapped, missingKeys, captionDrift, pageText };
}

/* ---- render the proposed order, in caption mode and no other -------------- */
async function renderProposedOrder(source, census, fixtureName) {
  const facts = FIXTURES[fixtureName];
  const writable = census.rows.filter((r) => r.policy === "write");
  const explicitMappings = Object.fromEntries(writable.map((r) => [r.name, r.fact]));
  const unwritableFields = census.rows.filter((r) => r.policy !== "write").map((r) => ({ field: r.name }));
  const { bytes, report } = await finalizeOfficialForm({
    sourceBytes: source.bytes,
    expectedSha256: source.sha256,
    census: census.rows.map((r) => ({
      name: r.name, type: r.type, effectiveLabel: r.effectiveLabel, regionHeading: r.regionHeading,
      widgets: [{ page: r.page, rect: r.rect }],
      multiline: r.multiline === true, maxLength: r.maxLength ?? null
    })),
    facts, explicitMappings, unwritableFields,
    // The whole discipline of this family. A court's own order accepts the style
    // of the case and nothing else, and the shared semantics enforces that here
    // rather than leaving it to this builder's own restraint.
    captionOnly: true,
    documentTextLines: census.pageText.flatMap((p) => p.lines.map((l) => l.text)),
    title: AOC334.title
  });
  if (process.env.KY_DEBUG_RENDER) {
    console.log(`-- AOC-334 ${fixtureName}: written=${report.written.length} refused=${report.refused.length}`);
    for (const w of report.written) console.log(`   wrote ${w.field} <- ${w.factId}`);
    const wanted = new Set(writable.map((r) => r.name));
    for (const r of report.refused) if (wanted.has(r.field)) console.log(`   REFUSED A WRITE ${r.field}: ${r.reason}`);
  }
  return { bytes, report };
}

async function byteProof(source, census, file, report, fixtureName) {
  const widgets = await flattenedWidgets(file);
  const written = new Map(report.written.map((w) => [w.field, w]));
  const actualWrites = [];
  for (const r of census.rows) {
    const w = written.get(r.name);
    if (!w || r.policy !== "write") continue;
    const drawn = drawnAt(widgets, { page: r.page, rect: r.rect });
    actualWrites.push({
      field: r.key, page: r.page, rect: r.rect, factId: w.factId ?? r.fact,
      printedCaption: r.caption, drawnText: drawn.map((d) => d.text).filter(Boolean),
      expected: FIXTURES[fixtureName][r.fact] ?? null
    });
  }
  const measured = census.rows.map((r) => ({ page: r.page, rect: r.rect }));
  let outside = 0;
  for (const w of widgets) {
    const at = measured.some((m) => m.page === w.page
      && Math.abs(w.x - m.rect.x) <= 2 && Math.abs(w.y - m.rect.y) <= 2);
    if (!at) outside += String(w.text ?? "").replace(/\s+/g, "").length;
  }
  return { actualWrites, appearances: widgets.length, outside };
}

/* ------------------------------------------------------------------ *
 * The two composed components.
 *
 * The motion asserts the statutory ground in the ORDER'S OWN WORDS and asks the
 * court to enter the tendered order. It makes no argument AOC-334 does not
 * already make, and it recites no statutory content this build has not read off
 * the form.
 * ------------------------------------------------------------------ */
const COMPOSED_TITLES = {
  primary_filing: "Motion to Void Conviction and Seal Records",
  certificate_of_service: "Certificate of Service"
};

function composedBody(componentId, config, facts) {
  const name = facts["participant.full_legal_name"];
  const county = facts["matter.county"];
  const court = facts["matter.court"];
  const caseNo = facts["matter.case_number"];
  const L = [];
  L.push("COMMONWEALTH OF KENTUCKY");
  L.push(`${county.toUpperCase()} ${court.toUpperCase()} COURT`);
  L.push(`CASE NO. ${caseNo}`, "");
  L.push("COMMONWEALTH OF KENTUCKY", "PLAINTIFF", "", "v.", "", name.toUpperCase(), "DEFENDANT", "");
  L.push(componentId === "primary_filing" ? config.motionTitle : "CERTIFICATE OF SERVICE", "");
  if (componentId === "primary_filing") {
    L.push(`The Defendant, ${name}, moves the Court under ${config.statute} to void the conviction in this case and to seal all records pertaining to it.`, "");
    L.push("GROUND", "");
    L.push("The Defendant has successfully completed the terms of treatment, probation, or sentence in this case. That is the ground the Court's own order form states, and it is the ground on which this motion is made.", "");
    L.push("DATE OF COMPLETION ....................................................., 2..........");
    L.push("(the Defendant writes the date of completion here, and on the tendered order, before filing)", "");
    L.push("RELIEF REQUESTED", "");
    L.push(`The Defendant asks the Court to enter the tendered order on Form AOC-334, ORDER VOIDING CONVICTION AND SEALING RECORDS, which is filed with this motion. That order voids the conviction and directs that all records pertaining to it in the custody of the court, and any records in the custody of any other agency or official including law enforcement records, be sealed.`, "");
    L.push("The tendered order lists the agencies to be ordered to seal their records. The Defendant completes that list before filing; this motion does not name an agency the Defendant has not identified.", "");
    L.push("WHAT THIS MOTION DOES NOT DO", "");
    L.push(`This motion makes no argument beyond the ground stated above. It is filed with the ${config.held.destinationName}, in the original criminal case in the county of conviction, and no filing fee is charged for it. It states no deadline and no hearing date; neither is established by the order form, and the circuit court clerk is who to ask about each of them.`, "");
    L.push("");
    L.push("Respectfully submitted,", "");
    L.push("SIGNATURE OF DEFENDANT ..................................................................");
    L.push("DATE ....................................................................................", "");
    L.push("PRINTED NAME .............................................................................");
    L.push("ADDRESS ..................................................................................");
    L.push("TELEPHONE ................................................................................", "");
    L.push("The Defendant signs and dates this motion personally. Nothing on this page is signed or dated for the Defendant.");
  } else {
    L.push("This page is a certificate of service. It is completed and signed at the time a copy is actually delivered or mailed, and not before.", "");
    L.push(`WHO MUST BE SERVED: ${config.held.serveDescription} That is the record this build reads, and it is not the order form's. What the record does not give is that office's current name and address for the county named above, so the line below stays blank and the Defendant writes it. Ask the circuit court clerk for that address; nothing on this page is written for the Defendant.`, "");
    L.push("I certify that on the date written below I served a true copy of the foregoing Motion and the tendered Order on:", "");
    L.push("NAME AND ADDRESS OF EACH PERSON SERVED");
    L.push("..............................................................................................");
    L.push("..............................................................................................");
    L.push("..............................................................................................", "");
    L.push("METHOD OF SERVICE ..........................................................................");
    L.push("(hand delivery, first-class mail, or whatever method the clerk tells you this filing requires)", "");
    L.push("DATE OF SERVICE ............................................................................");
    L.push("SIGNATURE OF DEFENDANT .....................................................................", "");
    L.push("Nothing on this page is prefilled. A certificate of service is a statement about something a person did, and a date or a signature written before the copy goes out would be false.");
  }
  L.push("", `Route: ${config.routeKey}`);
  return L.join("\n");
}

function sanitizePdfText(text) {
  return text.replaceAll(" ", " ").replaceAll("‑", "-").replaceAll("–", "-")
    .replaceAll("—", "-").replaceAll("−", "-").replaceAll("’", "'")
    .replaceAll("‘", "'").replaceAll("“", '"').replaceAll("”", '"')
    .replaceAll("§", "Sec. ").replaceAll("…", "...");
}

async function renderComposedPdf(fullText, title) {
  const pdf = await PDFDocument.create();
  pdf.setTitle(title);
  pdf.setProducer("RCAP census-v1 artifact-only renderer");
  pdf.setCreator("RCAP evidence build");
  const fixed = new Date(FIXED_DATE);
  pdf.setCreationDate(fixed); pdf.setModificationDate(fixed);
  const font = await pdf.embedFont(StandardFonts.TimesRoman);
  const fontSize = 11, lineHeight = 14.5, width = 612, height = 792, margin = 72;
  const maxWidth = width - 2 * margin;
  let page = pdf.addPage([width, height]);
  let y = height - margin;
  const draw = (line) => {
    if (y < margin) { page = pdf.addPage([width, height]); y = height - margin; }
    if (line) page.drawText(line, { x: margin, y, size: fontSize, font, color: rgb(0, 0, 0) });
    y -= lineHeight;
  };
  /* The shared separator-aware splitter, replacing the private char-by-char
   * copy that cut an over-long token at whichever character first reached the
   * margin. Inert for both Kentucky families -- SCAN01 measured the widest
   * delivered token in the pair at 297.97pt against a 468pt column -- and the
   * assertion below proves that on every build. */
  const splitToken = createTokenSplitter({ fits: fitsByFontMetrics(font, fontSize, maxWidth) });
  const wrap = (line) => {
    if (!line) return [""];
    const words = line.split(/\s+/).flatMap((w) => font.widthOfTextAtSize(w, fontSize) > maxWidth ? splitToken(w) : [w]);
    const out = []; let current = "";
    for (const w of words) {
      const candidate = current ? `${current} ${w}` : w;
      if (font.widthOfTextAtSize(candidate, fontSize) <= maxWidth) current = candidate;
      else { if (current) out.push(current); current = w; }
    }
    if (current) out.push(current);
    return out;
  };
  for (const raw of sanitizePdfText(fullText).split("\n")) for (const row of wrap(raw)) draw(row);
  /* No Kentucky token reaches the column, so the splitter must never have had
   * to chop one. A future edit that lengthens a route key past 468pt fails
   * here instead of shipping an unreadable line. */
  assert.equal(splitToken.hardSplits, 0,
    `renderComposedPdf hard-split a token with no separator to break on in "${title}"`);
  return Buffer.from(await pdf.save({ useObjectStreams: false, updateMetadata: false }));
}

function composedMap(componentId, config) {
  const base = (id, label) => ({
    field: `${componentId}.${id}`, page: 1, printedLabel: label, printedLine: label,
    effectiveLabel: label, regionHeading: label, sectionHeading: null,
    rectBasis: "composed_document_authored_by_this_build"
  });
  const writes = [
    { ...base("defendant_name", "Defendant named in the style of the case on this page"), factId: "participant.full_legal_name", kind: "composed_text", document: componentId },
    { ...base("case_number", "Case No. printed in the style of the case on this page"), factId: "matter.case_number", kind: "composed_text", document: componentId },
    { ...base("county", "County printed in the style of the case on this page"), factId: "matter.county", kind: "composed_text", document: componentId },
    { ...base("court", "Court printed in the style of the case on this page"), factId: "matter.court", kind: "composed_text", document: componentId }
  ];
  const refusals = [
    {
      ...base("signature", "Signature of the Defendant on this page"),
      reason: "signature or date field; never prefilled by this build",
      category: SIGNATURE, completenessClass: SIGNATURE, class: SIGNATURE,
      requiredBeforeFiling: false, document: componentId,
      why: "the Defendant signs this page personally"
    },
    {
      ...base("signature_date", "Date of signature on this page"),
      reason: "signature or date field; never prefilled by this build",
      category: SIGNATURE, completenessClass: SIGNATURE, class: SIGNATURE,
      requiredBeforeFiling: false, document: componentId,
      why: "a date written before the page is signed would be false"
    }
  ];
  if (componentId === "primary_filing") {
    refusals.push({
      ...base("completion_date", "Date the terms of treatment, probation or sentence were completed"),
      reason: "the participant supplies this before filing: the date the terms of treatment, probation or sentence were completed",
      category: null, completenessClass: null, class: null,
      disposition: "REQUIRED_BEFORE_FILING", requiredBeforeFiling: true, routeDetermined: false,
      identity: `${componentId} field completion_date`, factId: null, document: componentId,
      why: "the platform holds no completion date for this case and the ground of the motion is that the terms were completed",
      participantMustSupply: "the date you completed the terms of treatment, probation or sentence — write the same date here and on the tendered order"
    });
    for (const [id, label, what] of [
      ["printed_name", "Printed name of the Defendant below the signature line", "your name, printed under your signature"],
      ["service_address", "Address of the Defendant below the signature line", "the address the court and the clerk should use to reach you"],
      ["telephone", "Telephone number of the Defendant below the signature line", "the telephone number the court and the clerk should use to reach you"]
    ]) {
      refusals.push({
        ...base(id, label),
        reason: `the participant supplies this before filing: ${what}`,
        category: null, completenessClass: null, class: null,
        disposition: "REQUIRED_BEFORE_FILING", requiredBeforeFiling: true, routeDetermined: false,
        identity: `${componentId} field ${id}`, factId: null, document: componentId,
        why: `the signature block is completed in the Defendant's own hand at the time of signing: ${what}`,
        participantMustSupply: what
      });
    }
  } else {
    for (const [id, label, what] of [
      ["persons_served", "Name and address of each person served", `the name and address of the office that must receive a copy: ${config.held.serveDescription} The record this build reads names that office; it does not give its current address for your county, so ask the circuit court clerk for that`],
      ["method_of_service", "Method of service", `how you delivered or mailed the copy, from the two the record allows: ${config.held.serveDescription}`],
      ["date_of_service", "Date of service", "the date you actually delivered or mailed the copy, written at the time it goes out and not before"]
    ]) {
      refusals.push({
        ...base(id, label),
        reason: `the participant supplies this before filing: ${what}`,
        category: null, completenessClass: null, class: null,
        disposition: "REQUIRED_BEFORE_FILING", requiredBeforeFiling: true, routeDetermined: false,
        identity: `${componentId} field ${id}`, factId: null, document: componentId,
        why: `a certificate of service records what a person did, and this build may write none of it: ${what}`,
        participantMustSupply: what
      });
    }
  }
  return {
    formNumber: componentId,
    documentPolicy: { mode: "participant", captionOnly: false, documentAcceptsFill: true, routeKey: config.routeKey },
    structuralClass: "composed_document",
    explicitMappings: {}, roleRefusals: [], selectionControls: [],
    canonicalWrites: writes, canonicalRefusals: refusals,
    boundaryWrites: writes, boundaryRefusals: refusals
  };
}

/* ---- the proposed order's field map -------------------------------------- */
const OFFROUTE_REASON = (why) => `${why}; this branch of the form is never populated with participant data on this route`;

function orderFieldMap(source, census, report, config) {
  const written = new Set(report.written.map((w) => w.field));
  const canonicalWrites = [];
  const canonicalRefusals = [];
  for (const r of census.rows) {
    const base = {
      field: r.key, page: r.page, rect: r.rect, rectBasis: r.rectBasis,
      printedLabel: r.caption, printedLine: r.caption,
      regionHeading: r.effectiveLabel, sectionHeading: null,
      effectiveLabel: r.effectiveLabel, captionReadAt: r.captionAt
    };
    if (r.policy === "write") {
      assert.ok(written.has(r.name), `AOC-334 ${r.key} is mapped as a caption write and the finalizer did not write it`);
      canonicalWrites.push({ ...base, factId: r.fact, kind: r.type, document: source.formNumber });
      continue;
    }
    if (r.policy === "protect") {
      canonicalRefusals.push({
        ...base, reason: "signature or date field; never prefilled by this build",
        category: r.refusalClass, completenessClass: r.refusalClass, class: r.refusalClass,
        requiredBeforeFiling: false, document: source.formNumber,
        why: "the court owns this field and completes it when the order is entered"
      });
      continue;
    }
    if (r.policy === "offroute") {
      canonicalRefusals.push({
        ...base, reason: OFFROUTE_REASON(r.routeReason),
        category: null, completenessClass: null, class: null,
        requiredBeforeFiling: false, routeDetermined: false, document: source.formNumber,
        why: r.routeReason
      });
      continue;
    }
    canonicalRefusals.push({
      ...base,
      reason: `the participant supplies this before filing: ${r.what}`,
      category: null, completenessClass: null, class: null,
      disposition: "REQUIRED_BEFORE_FILING", requiredBeforeFiling: true, routeDetermined: false,
      identity: `${source.formNumber} field ${r.key}`, factId: null, document: source.formNumber,
      why: `the platform holds no value for this and the participant supplies it before filing: ${r.what}`,
      participantMustSupply: r.what
    });
  }
  return {
    formNumber: source.formNumber,
    documentPolicy: { mode: "court_issued_order", captionOnly: true, documentAcceptsFill: true, routeKey: config.routeKey },
    structuralClass: "acroform",
    captionModeNote: "This is the order the judge signs. Only the style of the case is written into it, through the shared field semantics' caption mode; every recital, the ordering date, the agency list and the judge's signature are the court's.",
    explicitMappings: Object.fromEntries(census.rows.filter((r) => r.policy === "write").map((r) => [r.name, r.fact])),
    roleRefusals: [], selectionControls: [],
    canonicalWrites, canonicalRefusals,
    boundaryWrites: canonicalWrites, boundaryRefusals: canonicalRefusals
  };
}

/* ---- the builder's own nine counters -------------------------------------- *
 * Not a verdict, and this lane issues none. The builder contract requires the
 * nine counters be returned or the family be stopped with the one that is not,
 * and they are computed with the shared contract's own exported classifiers so
 * the number a builder reports and the number a verifier computes come from the
 * same rules. */
function builderCounters(maps, actualWrites, instructionsText) {
  const counters = Object.fromEntries(PASS_COUNTERS.map((c) => [c, 0]));
  const findings = [];
  const note = (counter, detail) => { counters[counter] += 1; findings.push({ counter, ...detail }); };
  const writes = []; const blanks = [];
  for (const m of maps) {
    const id = m.formNumber;
    for (const w of m.canonicalWrites ?? []) writes.push({ ...w, document: id, name: w.field, label: w.effectiveLabel ?? w.field, isSelectionControl: false });
    for (const r of m.canonicalRefusals ?? []) blanks.push({ ...r, document: id, name: r.field, label: r.effectiveLabel ?? r.field, refusalClass: r.completenessClass ?? null, isSelectionControl: false });
    for (const c of m.selectionControls ?? []) {
      if (String(c.disposition ?? "").toLowerCase().startsWith("select")) writes.push({ ...c, document: id, name: c.selectionId, label: c.field, isSelectionControl: false });
      else blanks.push({ ...c, document: id, name: c.field, label: `${c.field} (selection)`, refusalClass: c.completenessClass ?? null, isSelectionControl: true });
    }
  }
  const normLabel = (x) => String(x ?? "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
  const writtenInDocument = new Map();
  for (const w of writes) {
    const doc = String(w.document ?? "");
    if (!writtenInDocument.has(doc)) writtenInDocument.set(doc, new Set());
    for (const key of [normLabel(w.label), normLabel(w.name)]) if (key.length >= 4) writtenInDocument.get(doc).add(key);
  }
  const availableFacts = new Set(writes.map((w) => w.factId).filter(Boolean).map(String));
  const declaredRequired = [];
  for (const b of blanks) {
    const here = writtenInDocument.get(String(b.document ?? "")) ?? new Set();
    const declared = {
      disposition: b.completenessDisposition ?? null,
      ...(Object.hasOwn(b, "requiredBeforeFiling") ? { requiredBeforeFiling: b.requiredBeforeFiling === true } : {}),
      routeDetermined: b.routeDetermined === true,
      factId: b.factId ?? null,
      identity: b.field ?? null,
      factAvailable: (b.factId ? availableFacts.has(String(b.factId)) : false)
        || here.has(normLabel(b.label)) || here.has(normLabel(b.name))
    };
    const verdict = classifyBlank(b, b.reason, b.refusalClass, declared);
    if (verdict.disposition === "REQUIRED_BEFORE_FILING") declaredRequired.push(b);
    if (BLANK_DISPOSITIONS[verdict.disposition].allowed) continue;
    if (verdict.disposition === "KNOWN_FACT_NOT_WRITTEN") note("knownRequiredFieldsMissing", { field: b.field, label: b.label, basis: verdict.basis });
    else if (verdict.disposition === "ROUTE_OPTION_NOT_SELECTED") note("requiredOptionsMissing", { field: b.field, label: b.label, basis: verdict.basis });
    else note("unclassifiedBlanks", { field: b.field, label: b.label, basis: verdict.basis });
  }
  const hay = String(instructionsText ?? "").toLowerCase();
  for (const b of declaredRequired) {
    const needles = [b.effectiveLabel, b.field, b.identity].map((x) => String(x ?? "").trim()).filter((x) => x.length >= 3);
    if (needles.some((n) => hay.includes(n.toLowerCase().slice(0, 60)))) continue;
    note("requiredFactsNotCollected", { field: b.field, label: b.label, why: "classified required-before-filing and not named in participant-instructions.md" });
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
    if (missing.length > 0) note("incompleteRows", { row: key, missingCells: missing.map((m) => m.label).slice(0, 6) });
  }
  for (const w of writes) {
    if (classifyField(w.label, w.isSelectionControl === true).requirement === "PROTECTED") {
      note("protectedWrites", { field: w.field, label: w.label, why: "a protected field was written" });
    }
  }
  for (const a of actualWrites.artifacts ?? []) {
    const reported = a.valuesReportedByFinalizer ?? null;
    const visible = (a.addedGlyphsReadFromOutputBytes ?? 0) + (a.flattenedWidgetAppearancesReadFromOutputBytes ?? 0);
    if (typeof reported === "number" && reported > 0 && visible === 0) note("invisibleWrites", { fixture: a.fixture, reportedByFinalizer: reported });
    if ((a.nonWhitespaceGlyphsOutsideMeasuredWriteBoxes ?? 0) > 0) note("visualDefects", { fixture: a.fixture, glyphsOutsideMeasuredBoxes: a.nonWhitespaceGlyphsOutsideMeasuredWriteBoxes });
  }
  return { counters, findings, terminalFields: writes.length + blanks.length, written: writes.length, blank: blanks.length };
}

/* ---- participant instructions -------------------------------------------- */
function requiredBeforeFilingItems(maps) {
  const order = { primary_filing: 0, "AOC-334": 1, certificate_of_service: 2 };
  return maps.flatMap((m) => (m.canonicalRefusals ?? [])
    .filter((r) => r.requiredBeforeFiling === true)
    .map((r) => ({
      document: m.formNumber, field: r.field, page: r.page, y: r.rect?.y ?? null,
      printedContext: r.printedLabel, disclosureLabel: r.effectiveLabel,
      identity: r.identity, why: r.why, participantMustSupply: r.participantMustSupply
    })))
    // The order the participant works the paper: motion, then the tendered
    // order, then the certificate, and down each page.
    .sort((a, b) => (order[a.document] - order[b.document]) || (a.page - b.page) || ((b.y ?? 0) - (a.y ?? 0)));
}

function instructionsMarkdown(config, rbf) {
  const byDoc = new Map();
  for (const item of rbf) byDoc.set(item.document, [...(byDoc.get(item.document) ?? []), item]);
  const out = [];
  out.push(`# What you must do before you file — ${config.routeName}`, "");
  out.push(`This packet is prepared for **${config.legalName}**.`, "");
  out.push("The platform filled in the style of the case — your name, the county, the court and the case number — on all three documents. Everything else is yours, and this page lists every item by the words printed beside the blank.", "");

  out.push("## What is in this packet", "");
  out.push("| Component | What it is |", "| --- | --- |");
  out.push("| `primary_filing` | the motion asking the court to void the conviction and seal the records |");
  out.push("| `proposed_order` | **AOC-334**, the order the judge signs, tendered with the motion |");
  out.push("| `certificate_of_service` | the page you complete and sign when you actually deliver or mail a copy |");
  out.push("");

  out.push("## The order is the court's, not yours", "");
  out.push("AOC-334 is headed **ORDER VOIDING CONVICTION AND SEALING RECORDS** and ends over a judge's signature. The platform has written only the style of the case into it — the case number, the court, the county and your name and date of birth. Everything else on that page is either yours to complete before filing (the charges, the completion date, the agencies to be ordered to seal) or the court's to complete when it enters the order (the ordering date and the judge's signature).", "");
  out.push("Do not sign the order. It is not yours to sign.", "");

  const held = config.held;
  out.push("## Where you file, what it costs, and who gets a copy", "");
  out.push(`- **Where the motion is filed.** ${held.destinationName}. ${held.destinationDetail}`);
  out.push(`- **Which court.** ${held.venue}`);
  out.push(`- **The filing fee.** There is none. The record this build reads states it in these words: "${held.feeDescription}"${held.feeWaiverDescription ? ` A fee waiver is "${held.feeWaiverDescription}"` : ""}`);
  out.push(`- **Who must be served, and how.** ${held.serveDescription}`);
  out.push("");
  out.push(`Those four answers are read from ${held.source}, which is the record this repository already holds for this route. They are not guessed and they are not the order form's.`, "");

  out.push("## What this packet does not tell you", "");
  out.push("- **The name and address of the person you serve.** The record above says which office receives a copy; it does not give you that office's current name and address for your county. Ask the circuit court clerk for the county in the caption, then complete the certificate at the time you actually send the copy.");
  out.push("- **Any deadline.** No held source states a number of days. Ask the same clerk, because an unsourced figure in a filing instruction is worse than none.", "");

  out.push("## What you must do, in order", "");
  out.push("1. **Fill in every item listed below**, on all three documents.");
  out.push("2. **Write the same completion date on the motion and on the tendered order.** They are the same fact and a filing that gives two different dates for it invites a denial.");
  out.push("3. **Sign and date the motion yourself.** The platform never signs and never dates a signature.");
  out.push(`4. **${held.fileDescription ?? `File the motion with the tendered order at the ${held.destinationName}.`}** The order goes to the judge with the motion; it is not filed on its own.`);
  out.push("5. **Serve a copy, then complete and sign the certificate of service** — at the time you send it, not before.");
  out.push("");

  out.push("## The items you must supply", "");
  for (const [doc, items] of byDoc) {
    const title = doc === "AOC-334" ? AOC334.title : COMPOSED_TITLES[doc] ?? doc;
    out.push(`### ${doc} — ${title}`, "");
    out.push("| The blank on the document | What to write |", "| --- | --- |");
    for (const i of items) out.push(`| ${i.disclosureLabel} | ${i.participantMustSupply} |`);
    out.push("");
  }

  out.push("## Things the platform deliberately left blank", "");
  out.push("- **Your signature and the date you sign.** A signature is yours alone, and a date written before you sign would be false.");
  out.push("- **Everything on the certificate of service.** A certificate of mailing is a statement about something you did; nothing on it may be written before you do it.");
  out.push("- **Your Social Security number.** The platform does not store it and will not write it for you, on the order or anywhere else.");
  out.push("- **The ordering date and the judge's signature on AOC-334, and the agency certification block below them.** Those belong to the court and to the agencies it orders.", "");

  out.push("## What this packet is not", "");
  out.push("This is a prepared motion, a tendered official order and a certificate of service. It is not legal advice, it is not filed for you, and it does not decide whether the court will void the conviction or seal the records.", "");
  out.push(`_Route: ${config.routeKey}_`);
  return `${out.join("\n")}\n`;
}

/* ---- artifacts ------------------------------------------------------------ */
function writeArtifacts(ctx) {
  const { familyId, config, outDir, resolved, maps, artifacts, writeProofs, rasterPages, rbf, instructions, audit, rasterSkipped } = ctx;
  const source = resolved[0];
  const W = (rel, body) => fs.writeFileSync(path.join(ROOT, outDir, rel), body);

  W("production-field-map.json", `${JSON.stringify({
    schemaVersion: "rcap-official-form-field-map/v1-census-v1",
    familyId, routeKeys: [config.routeKey], routeSelectionId: config.routeSelectionId,
    jurisdiction: config.jurisdiction, statute: config.statute, legalName: config.legalName,
    implementationStrategy: "custom_pleading",
    officialForm: source.formNumber,
    officialFormRole: "proposed_order tendered with the composed motion; filled in caption mode only",
    componentSet: COMPONENTS,
    captionBasis: "every printed caption in this map was read from the official form's own content stream at the widget's normalized coordinates; captionReadAt records where, and the build refuses if a caption is no longer there",
    dispositionVocabulary: [SIGNATURE, COURT_OWNED],
    routeSelectionsMade: [],
    routeSelectionNote: "AOC-334 carries no election control. The statutory route is stated in the motion's own title and in the relief it asks for, which is where this family's route determination lives.",
    requiredBeforeFilingCount: rbf.length,
    requiredBeforeFiling: rbf,
    maps, generationAllowed: false, runtimeSelectable: false, commercialRoutesOpened: 0
  }, null, 2)}\n`);

  W("source-receipt.json", `${JSON.stringify({
    schemaVersion: "rcap-family-source-receipt/v1",
    familyId, worklistGroupId: familyId, jurisdiction: config.jurisdiction,
    implementationStrategy: "custom_pleading", custodyClass: "SOURCE_ALREADY_HELD",
    acquisitionCommissioned: false, corpusRootFromEnvironment: "MASTER_LIBRARY_SOURCE_DIR",
    bindingMethod: "exact path + corpus-index SHA-256 + on-disk SHA-256 + byte length",
    routeSelectionId: config.routeSelectionId,
    allSourcesExact: true,
    documents: resolved.map((r) => ({
      sourceIds: [r.sourceId], formNumber: r.formNumber, revision: r.revision,
      pathInArchive: r.pathInArchive, sha256: r.sha256, byteLength: r.byteLength
    })),
    composedComponentsAuthoredByThisBuild: ["primary_filing", "certificate_of_service"],
    commercialRoutesOpened: 0
  }, null, 2)}\n`);

  W("reports/rendered-artifacts.json", `${JSON.stringify({
    schemaVersion: "rcap-rendered-artifacts/v1", familyId, renderedFresh: true,
    componentSet: COMPONENTS, artifacts,
    packets: artifacts.map((a) => ({ fixture: a.fixture, documents: a.documents })),
    rasterEngine: rasterSkipped ? null : "scripts/raster/pdf-page-raster.mjs (Chromium, calibrated)",
    rasterSkipped, rasterPages
  }, null, 2)}\n`);

  W("reports/actual-writes.json", `${JSON.stringify({
    schemaVersion: "rcap-actual-writes-byte-proof/v1", familyId,
    derivedFromArtifactBytes: true, documents: writeProofs,
    artifacts: writeProofs.map((p) => ({
      fixture: p.fixture, formNumber: p.formNumber,
      valuesReportedByFinalizer: p.valuesReportedByFinalizer,
      addedGlyphsReadFromOutputBytes: p.addedGlyphsReadFromOutputBytes,
      flattenedWidgetAppearancesReadFromOutputBytes: p.flattenedWidgetAppearancesReadFromOutputBytes,
      nonWhitespaceGlyphsOutsideMeasuredWriteBoxes: p.nonWhitespaceGlyphsOutsideMeasuredWriteBoxes
    }))
  }, null, 2)}\n`);

  W("reports/builder-completeness-counters.json", `${JSON.stringify({
    schemaVersion: "rcap-builder-completeness-counters/v1", familyId,
    thisIsNotAVerdict: "A builder verdict is not a verdict. These counters are the builder contract's own obligation, computed with scripts/rcap-packet-completeness/completeness-contract.mjs. An independent verification lane that did not build this packet decides whether it passes.",
    focusedCheckNote: "scripts/rcap-packet-completeness/verify-packet-completeness.mjs enumerates only families listed BUILT in data/rcap-grade-a/launch-control/C11_RETURN_REVIEW.json, an earlier wave's record that this lane may not write. A family built after that record audits as zero families there.",
    counters: audit.counters, allNineZero: PASS_COUNTERS.every((c) => audit.counters[c] === 0),
    totals: { terminalFields: audit.terminalFields, written: audit.written, blank: audit.blank },
    findings: audit.findings
  }, null, 2)}\n`);

  W("build-status.json", `${JSON.stringify({
    schemaVersion: "rcap-family-build-status/v1", familyId,
    buildStatus: "state_built", reviewStatus: "qa_review_pending",
    builtBy: "scripts/build-census-v1-ky_void_seal_controlled_substance-set.mjs",
    rasterEngine: rasterSkipped ? null : "chromium_calibrated", popplerUsed: false,
    rasterState: rasterSkipped ? "BUILT_RASTER_PENDING" : "rendered_locally_pending_central_acceptance",
    packetsSelfVerified: 0, commercialRoutesOpened: 0, productionTouched: false,
    grantsNothing: "A rendered packet is review evidence. It authorizes no fulfillment and opens no commercial route."
  }, null, 2)}\n`);

  W("build-findings.json", `${JSON.stringify({
    schemaVersion: "rcap-family-build-findings/v1", familyId,
    findings: [
      {
        finding: "AOC-334 is the ORDER the judge signs, not the filing. It prints both KRS 218A.275 and KRS 218A.276 on its own face, which is why one form serves both families in this lane.",
        consequence: "The route's primary_filing is a composed motion; AOC-334 is tendered as the proposed_order and is filled in the shared field semantics' caption mode, which admits only the style of the case."
      },
      {
        finding: "The committed legal-design track registry holds this route's filing destination, its fee and its service party. This build previously read none of them and sent the participant to the circuit court clerk for all three, so the packet was silent about facts the repository already knew.",
        consequence: `The instructions and the composed documents now state them from ${config.held.source}: filed with the ${config.held.destinationName}, no filing fee, and served as the registry records. DET-FEE-AND-WAIVER-001-A1 puts the held answer first and allows a named authority to stand in only where no held source establishes the fact.`
      },
      {
        finding: "What the registry does not hold is the serving office's current name and address for the county of conviction, or any filing deadline.",
        consequence: "Those two remain declared required-before-filing and disclosed by name, with the circuit court clerk named as the authority to ask. The certificate of service still names no recipient and states no method, and no recipient was guessed."
      },
      {
        finding: "The order directs named agencies to seal their records, and the platform holds no list of them.",
        consequence: "Both agency lines are refused by the shared semantics' agency rule and declared required-before-filing rather than hidden inside a protected class, because an agency name is a case fact the participant can obtain and not a field the court owns."
      },
      {
        finding: "The completion date appears on both the motion and the tendered order.",
        consequence: "It is disclosed once per document and the instructions say in terms to write the same date in both places, because two different dates for one fact invites a denial."
      }
    ]
  }, null, 2)}\n`);

  W("participant-instructions.md", instructions);

  W("approval-request.json", `${JSON.stringify({
    schemaVersion: "rcap-family-approval-request/v1", familyId,
    requested: "visual review and counsel review", buildStatus: "state_built",
    counselQuestionsRaised: [
      "The packet now states the filing destination, the absence of a fee and the service party from the committed track registry rather than sending the participant to the clerk for them. Counsel should confirm the registry's answers read correctly on the participant-facing page.",
      "The registry does not give the serving office's address for the county of conviction, so the certificate of service still names no recipient and the participant obtains that from the clerk.",
      "Does the motion need to recite anything beyond the ground AOC-334 itself recites? This build asserts only that ground."
    ],
    approvedForLive: false, live: false, commercialRoutesOpened: 0
  }, null, 2)}\n`);
}

/* ---- the one exported entry point ---------------------------------------- */
export async function runFamilyById(familyId, argv = process.argv.slice(2)) {
  const declared = FAMILY_CONFIGS[familyId];
  assert.ok(declared, `unknown family ${familyId}`);
  // Resolved once, so the motion, the certificate, the field map and the
  // instructions all state the same held facts from the same read.
  const config = { ...declared, held: heldFilingFacts(declared) };
  const checkOnly = argv.includes("--check");
  const skipRaster = argv.includes("--no-raster");
  const { resolved, failures } = resolveSources(familyId);
  if (failures.length > 0) {
    return {
      familyId, status: "STOPPED", stopClass: "BLOCKED_SOURCE",
      failedSourceIdentities: failures,
      why: "a source did not bind by exact SHA-256, so nothing may be rendered from it",
      overlayDirectoryTouched: false
    };
  }

  const outDir = `${OVERLAY_ROOT}/${familyId.replace(/_/g, "-")}--custom-pleading`;
  const source = resolved[0];
  const census = await censusOf(source);

  if (process.env.KY_DUMP_DRIFT) {
    for (const d of census.captionDrift) console.log(`${d.key}\tp${d.page} y=${d.y}\tCAPTION=${JSON.stringify(d.caption)}\tTHERE=${JSON.stringify(d.linesThere)}`);
    for (const u of census.unmapped) console.log(`UNMAPPED ${u.field} p${u.page} ${JSON.stringify(u.rect)} :: ${u.why}`);
    for (const k of census.missingKeys) console.log(`DICTIONARY KEY MATCHED NO WIDGET: ${k}`);
    for (const r of census.rows) if (r.options?.length) console.log(`OPTIONS ${r.key}: ${r.options.length} (${r.options.slice(0, 4).join(", ")} ...)`);
    process.exit(0);
  }
  assert.equal(census.captionDrift.length, 0, `a measured caption is no longer printed where the field map says: ${JSON.stringify(census.captionDrift.slice(0, 3), null, 2)}`);
  assert.equal(census.unmapped.length, 0, `${census.unmapped.length} widget(s) carry no measured caption: ${JSON.stringify(census.unmapped.slice(0, 5), null, 2)}`);
  assert.equal(census.missingKeys.length, 0, `${census.missingKeys.length} dictionary key(s) match no widget: ${JSON.stringify(census.missingKeys)}`);

  if (checkOnly) {
    const by = (p) => census.rows.filter((r) => r.policy === p).length;
    return {
      familyId, status: "CHECK_ONLY", officialForm: source.formNumber, sha256: source.sha256,
      widgets: census.rows.length, write: by("write"), supply: by("supply"), protect: by("protect"), offroute: by("offroute")
    };
  }

  for (const sub of ["fixtures", "reports", "raster"]) fs.mkdirSync(path.join(ROOT, outDir, sub), { recursive: true });

  const maps = [];
  const artifacts = [];
  const writeProofs = [];
  const rasterPages = [];

  for (const fixtureName of ["canonical", "boundary"]) {
    const facts = FIXTURES[fixtureName];
    // The container carries a fixed date for the same reason every component
    // does. PDFDocument.create() stamps the wall clock, and packet.save() is
    // called with updateMetadata:false, so that first stamp survived into the
    // saved bytes: two builds of this family from identical inputs produced
    // packet PDFs of identical length and different SHA-256, while every raster
    // page came out byte-identical. A RASTER_PASS is pinned to the packet hash,
    // so a rebuild that changed nothing discarded the raster verdict as though
    // the packet had been edited. The shared helper is the factory's one answer
    // to this and this host had simply never adopted it.
    const packet = stampDeterministic(await PDFDocument.create());
    const pageManifest = [];
    const documents = [];

    // The motion comes first, then the order it tenders, then the certificate.
    const motionBytes = await renderComposedPdf(composedBody("primary_filing", config, facts), COMPOSED_TITLES.primary_filing);
    const motion = await PDFDocument.load(motionBytes, { ignoreEncryption: true });
    for (const [i, p] of (await packet.copyPages(motion, motion.getPageIndices())).entries()) {
      packet.addPage(p);
      pageManifest.push({ packetPage: packet.getPageCount(), component: "primary_filing", documentId: "primary_filing", sourcePage: i + 1, sourceSha256: null });
    }
    documents.push("primary_filing");
    if (fixtureName === "canonical") maps.push(composedMap("primary_filing", config));

    const { bytes: orderBytes, report } = await renderProposedOrder(source, census, fixtureName);
    const order = await PDFDocument.load(orderBytes, { ignoreEncryption: true });
    for (const [i, p] of (await packet.copyPages(order, order.getPageIndices())).entries()) {
      packet.addPage(p);
      pageManifest.push({ packetPage: packet.getPageCount(), component: "proposed_order", documentId: source.formNumber, sourcePage: i + 1, sourceSha256: source.sha256 });
    }
    documents.push("proposed_order", source.formNumber);
    if (fixtureName === "canonical") maps.push(orderFieldMap(source, census, report, config));

    const certBytes = await renderComposedPdf(composedBody("certificate_of_service", config, facts), COMPOSED_TITLES.certificate_of_service);
    const cert = await PDFDocument.load(certBytes, { ignoreEncryption: true });
    for (const [i, p] of (await packet.copyPages(cert, cert.getPageIndices())).entries()) {
      packet.addPage(p);
      pageManifest.push({ packetPage: packet.getPageCount(), component: "certificate_of_service", documentId: "certificate_of_service", sourcePage: i + 1, sourceSha256: null });
    }
    documents.push("certificate_of_service");
    if (fixtureName === "canonical") maps.push(composedMap("certificate_of_service", config));

    const packetBytes = Buffer.from(await packet.save({ useObjectStreams: false, updateMetadata: false }));
    const file = `${outDir}/fixtures/${fixtureName}.pdf`;
    fs.writeFileSync(path.join(ROOT, file), packetBytes);
    const orderFile = `${outDir}/fixtures/${fixtureName}--${source.formNumber}-proposed-order.pdf`;
    fs.writeFileSync(path.join(ROOT, orderFile), orderBytes);

    const proof = await byteProof(source, census, path.join(ROOT, orderFile), report, fixtureName);
    writeProofs.push({
      fixture: fixtureName, formNumber: source.formNumber, sourceSha256: source.sha256,
      proofMethod: "flattened widget appearances read back at every measured /Rect of the finalized order bytes",
      valuesReportedByFinalizer: report.written.length,
      flattenedWidgetAppearancesReadFromOutputBytes: proof.appearances,
      addedGlyphsReadFromOutputBytes: proof.actualWrites.reduce((n, w) => n + w.drawnText.join("").length, 0),
      nonWhitespaceGlyphsOutsideMeasuredWriteBoxes: proof.outside,
      actualWrites: proof.actualWrites
    });

    artifacts.push({
      fixture: fixtureName, file, proposedOrderFile: orderFile,
      sha256: crypto.createHash("sha256").update(packetBytes).digest("hex"),
      proposedOrderSha256: crypto.createHash("sha256").update(orderBytes).digest("hex"),
      byteLength: packetBytes.length, pageCount: packet.getPageCount(), pageManifest,
      documents, components: COMPONENTS
    });

    if (!skipRaster) {
      const rasterDir = `${outDir}/raster/${fixtureName}`;
      fs.mkdirSync(path.join(ROOT, rasterDir), { recursive: true });
      for (let i = 0; i < packet.getPageCount(); i += 1) {
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
          component: pageManifest[i]?.component ?? null,
          pageWidthPt: render.pageWidth, pageHeightPt: render.pageHeight,
          pixelsPerPoint: Number(render.pxPerPt.toFixed(4)),
          calibrationResidualPx: render.calibrationResidualPx,
          paperBounds: render.paper,
          engine: "chromium_calibrated_scripts_lib_pdf_page_raster",
          sha256: crypto.createHash("sha256").update(fs.readFileSync(png)).digest("hex")
        });
      }
    }
  }

  const rbf = requiredBeforeFilingItems(maps);
  const instructions = instructionsMarkdown(config, rbf);
  const audit = builderCounters(maps, {
    artifacts: writeProofs.map((p) => ({
      fixture: p.fixture,
      valuesReportedByFinalizer: p.valuesReportedByFinalizer,
      addedGlyphsReadFromOutputBytes: p.addedGlyphsReadFromOutputBytes,
      flattenedWidgetAppearancesReadFromOutputBytes: p.flattenedWidgetAppearancesReadFromOutputBytes,
      nonWhitespaceGlyphsOutsideMeasuredWriteBoxes: p.nonWhitespaceGlyphsOutsideMeasuredWriteBoxes
    }))
  }, instructions);

  writeArtifacts({ familyId, config, outDir, resolved, maps, artifacts, writeProofs, rasterPages, rbf, instructions, audit, rasterSkipped: skipRaster });

  const allZero = PASS_COUNTERS.every((c) => audit.counters[c] === 0);
  return {
    familyId,
    status: allZero ? "COMPLETED" : "STOPPED",
    ...(allZero ? {} : { stopClass: "COMPLETENESS_COUNTER_NOT_ZERO", nonZeroCounters: PASS_COUNTERS.filter((c) => audit.counters[c] > 0), firstFindings: audit.findings.slice(0, 6) }),
    directory: outDir,
    implementationStrategy: "custom_pleading",
    officialForm: source.formNumber,
    officialFormRole: "proposed_order, caption mode only",
    sourceSha256: source.sha256,
    components: COMPONENTS,
    documents: ["primary_filing", source.formNumber, "certificate_of_service"],
    terminalFields: audit.terminalFields,
    written: audit.written,
    requiredBeforeFiling: rbf.length,
    counters: audit.counters,
    nineCountersZero: allZero,
    rasterPages: rasterPages.length,
    rasterState: skipRaster ? "BUILT_RASTER_PENDING" : "RENDERED_LOCALLY_PENDING_CENTRAL_ACCEPTANCE",
    artifactHashes: artifacts.map((a) => ({ fixture: a.fixture, packetSha256: a.sha256, proposedOrderSha256: a.proposedOrderSha256, pages: a.pageCount })),
    packetsSelfVerified: 0,
    commercialRoutesOpened: 0,
    productionTouched: false
  };
}

if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(thisFile)) {
  const familyId = process.argv.find((a) => a.startsWith("ky_")) ?? "ky_void_seal_controlled_substance-set";
  runFamilyById(familyId)
    .then((r) => { console.log(JSON.stringify(r, null, 2)); })
    .catch((e) => { console.error(e); process.exit(1); });
}
