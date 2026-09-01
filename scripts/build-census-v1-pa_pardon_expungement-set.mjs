#!/usr/bin/env node
/**
 * The Pennsylvania Rule 790 expungement-after-pardon packet family builder.
 *
 *   node scripts/build-census-v1-pa_pardon_expungement-set.mjs [--check] [--no-raster]
 *
 * One family, two official forms, three components, and TWO routes the census
 * records for it:
 *
 *   a Rule 790 petition, where the automatic route has not cleared the record
 *   no filing -- process guidance, where it has
 *
 * PA-RCRIM-P-790-PETITION is the filing and is completed by the petitioner.
 * PA-RCRIM-P-790-ORDER is the order the judge signs -- "AND NOW, this ___ day
 * ... it is ORDERED", over a court signature field -- and is tendered with the
 * petition. It is filled in CAPTION MODE and in no other mode: the style of the
 * case is the petitioner's to state and every word below it is the court's.
 *
 * WHY NO BOX IS MARKED ON EITHER FORM
 *
 * The two routes are told apart by something neither form asks: whether the
 * automatic route has already cleared the record. Nothing on the petition and
 * nothing on the order elects between them, so this family marks no box and
 * says so in its own field map rather than inventing an election to satisfy a
 * counter. What the packet does instead is carry the second route as a
 * component -- a guidance page that tells the participant how to find out which
 * of the two they are in, before they file anything.
 *
 * WHAT THE FORM ASKS FOR THAT THE PLATFORM DOES NOT HOLD
 *
 * A great deal: the judge who heard the case and their address, the affiant on
 * the complaint and theirs, the offence tracking number, the docket segments,
 * every charge row with its title, section, subsection, description, counts,
 * grade and disposition. Each is declared required-before-filing and disclosed
 * by name. None is guessed.
 *
 * Captions are read out of the pinned binary at build time and the exact
 * SHA-256 source binding is what fails the family closed if a form changes.
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
import { finalizeOfficialForm, PARTICIPANT_INK, SELECTION_INSET, SELECTION_LINE_WIDTH } from "./rcap-official-forms/rcap-official-form-finalize.mjs";
import { extractPageGeometry } from "./rcap-official-forms/rcap-pdf-anchor-capture.mjs";
import { flattenedWidgets, drawnAt } from "./rcap-official-forms/pdf-flattened-widgets.mjs";
import { rasterizePageCalibrated } from "./raster/pdf-page-raster.mjs";
import { classifyField, classifyBlank, rowKeyOf, PASS_COUNTERS, BLANK_DISPOSITIONS } from "./rcap-packet-completeness/completeness-contract.mjs";

const thisFile = fileURLToPath(import.meta.url);
const ROOT = path.resolve(path.dirname(thisFile), "..");
process.chdir(ROOT);
const require = createRequire(import.meta.url);
const { PDFDocument, StandardFonts, rgb } = require("pdf-lib");

const CORPUS_INDEX = "data/rcap-all50/local-source-corpus-index.json";
const OVERLAY_ROOT = "data/rcap-all50/overlays/census-v1/pa";
const FIXED_DATE = "2026-01-01T00:00:00.000Z";

function corpusRoot() {
  const configured = process.env.MASTER_LIBRARY_SOURCE_DIR
    ?? "private/source-imports/Expungement_AI_RCAP_Master_Library_Edition_1";
  assert.ok(fs.existsSync(configured), `the Master Library is not mounted at ${configured}`);
  return configured;
}

const SIGNATURE = "signature_or_date_participant_completion";
const COURT_OWNED = "court_prosecutor_clerk_or_agency_owned";
const ELECTION_CLASS = "participant_sworn_narrative_or_legal_election";

const WRITE = (fact) => ({ policy: "write", fact });
const SUPPLY = (what) => ({ policy: "supply", what });
const PROTECT = (why) => ({ policy: "protect", refusalClass: why });
const ELECTION = () => ({ policy: "election" });

const COMPONENTS = ["primary_filing", "proposed_order", "process_guidance"];
const DOCUMENT_OF_COMPONENT = {
  primary_filing: "PA-RCRIM-P-790-PETITION",
  proposed_order: "PA-RCRIM-P-790-ORDER",
  process_guidance: "process_guidance"
};

/* ------------------------------------------------------------------ *
 * The petition. Named entries are the writes, the protected fields and the
 * few blanks whose printed caption would otherwise classify them wrongly;
 * everything else falls to the default below, which is what the form itself
 * says it is -- a blank the petitioner fills, or a box only they may tick.
 *
 * The default is safe in one direction only, so it is the direction that
 * cannot hide a defect: a text blank defaults to REQUIRED_BEFORE_FILING and is
 * disclosed by name, and a checkbox defaults to the participant's own election.
 * Nothing defaults to WRITTEN and nothing defaults to PROTECTED, so a field the
 * court owns has to be named here to be treated as one.
 * ------------------------------------------------------------------ */
const PETITION_NAMED = {
  "CountyOf": { ...WRITE("matter.county"), label: "County of" },
  "Defendant": { ...WRITE("participant.full_legal_name"), label: "Defendant in the style of the case" },
  "Full Name": { ...WRITE("participant.full_legal_name"), label: "Full Name" },
  "DOB": { ...WRITE("participant.date_of_birth"), label: "DOB" },
  "Addr1": { ...WRITE("participant.street_address"), label: "Address, first line" },
  "AddrCity": { ...WRITE("participant.city"), label: "Address, city" },
  "AddrState": { ...WRITE("participant.state"), label: "Address, state" },
  "AddrZip": { ...WRITE("participant.zip"), label: "Address, ZIP" },
  "CPDocketNumber": { ...WRITE("matter.case_number"), label: "Docket Number of the case to be expunged" },
  "Social Security Number": { ...SUPPLY("your Social Security number - the platform never stores it and never writes it for you"), label: "Social Security Number" },
  "Addr2": { ...SUPPLY("a second line of your address, only if it needs one"), label: "Address, second line" },
  "Aliases1": { ...SUPPLY("any other name you have been known by, if there is one"), label: "Alias, first" },
  "Aliases2": { ...SUPPLY("a second other name, if there is one"), label: "Alias, second" },
  /*
   * The form asks the PETITIONER to list the judge and the affiant. Their labels
   * carry the words "judge" and "agency", which the completeness contract reads
   * as court-owned and agency-owned respectively -- and would be right to, on a
   * field the court fills. Here the form is asking the petitioner for them, so
   * each is labelled by what the petitioner is being asked for and disclosed.
   */
  "Judge": { ...SUPPLY("the name of the presiding official who accepted the guilty plea or heard the case - the docket sheet for your case shows it"), label: "Name of the presiding official who accepted the plea or heard the case" },
  "JudgeAddr1": { ...SUPPLY("the first line of that presiding official's court address"), label: "Court address of the presiding official, first line" },
  "JudgeAddr2": { ...SUPPLY("a second line of that court address, if it needs one"), label: "Court address of the presiding official, second line" },
  "JudgeAddrCity": { ...SUPPLY("the city of that court address"), label: "Court address of the presiding official, city" },
  "JudgeAddrState": { ...SUPPLY("the state of that court address"), label: "Court address of the presiding official, state" },
  "JudgeAddrZip": { ...SUPPLY("the ZIP of that court address"), label: "Court address of the presiding official, ZIP" },
  "Name of Affiant": { ...SUPPLY("the name of the affiant shown on the complaint, if the complaint is available to you"), label: "Name of the affiant shown on the complaint" },
  "AffiantAddr1": { ...SUPPLY("the first line of the affiant's mailing address, if available"), label: "Mailing address of the affiant, first line" },
  "AffiantAddr2": { ...SUPPLY("a second line of the affiant's mailing address, if it needs one"), label: "Mailing address of the affiant, second line" },
  "AffiantAddrCity": { ...SUPPLY("the city of the affiant's mailing address"), label: "Mailing address of the affiant, city" },
  "AffiantAddrState": { ...SUPPLY("the state of the affiant's mailing address"), label: "Mailing address of the affiant, state" },
  "AffiantAddrZip": { ...SUPPLY("the ZIP of the affiant's mailing address"), label: "Mailing address of the affiant, ZIP" },
  "Name of Arresting Agency": { ...SUPPLY("the name of the agency that arrested you, as it appears on the charging document"), label: "Name of the arresting agency shown on the charging document" },
  "Date of Arrest": { ...SUPPLY("the date of your arrest"), label: "Date of Arrest" },
  "Date on Complaint": { ...SUPPLY("the date printed on the complaint"), label: "Date on Complaint" },
  "Offense Tracking Number OTN": { ...SUPPLY("the Offense Tracking Number (OTN) for the case, from your docket sheet"), label: "Offense Tracking Number (OTN)" },
  "District#": { ...SUPPLY("the number of the judicial district the case was in"), label: "Judicial District number" },
  "ReasonForExpungement": { ...SUPPLY("your own statement of why the record should be expunged - this is yours to write and the platform never writes it for you"), label: "Reason the record should be expunged" },
  "ReasonForMissingHistory": { ...SUPPLY("why you have not attached a Pennsylvania State Police criminal history, if you have not - this is yours to write"), label: "Reason no Pennsylvania State Police criminal history is attached" }
};

/* The order. Caption facts only; the ordering language is the court's. */
const ORDER_NAMED = {
  "County": { ...WRITE("matter.county"), label: "County in the style of the case" },
  "Defendant": { ...WRITE("participant.full_legal_name"), label: "Defendant in the style of the case" },
  "DocketNumber": { ...WRITE("matter.case_number"), label: "Docket No. in the style of the case" },
  "PetitionerName": { ...WRITE("participant.full_legal_name"), label: "Petitioner Name on the Rule 790 information page" },
  "PetitionersDOB": { ...WRITE("participant.date_of_birth"), label: "Petitioner's Date of Birth on the Rule 790 information page" },
  /*
   * Caption mode admits the style of the case and nothing else, and a street
   * address is not one of the caption facts. The shared semantics refused it as
   * court_issued_order_accepts_caption_facts_only, which is the right answer:
   * the Rule 790 information page is an attachment to the court's own order, and
   * the petitioner completes it rather than the platform.
   */
  "PetitionersAddress": { ...SUPPLY("your address, as the Rule 790 information page asks for it"), label: "Petitioner's Address on the Rule 790 information page" },
  "Docket#": { ...WRITE("matter.case_number"), label: "Docket Number on the Rule 790 information page" },
  "CourtSignature": { ...PROTECT(COURT_OWNED), label: "Signature of the court" },
  "Day": { ...PROTECT(COURT_OWNED), label: "Day of the order" },
  "Month": { ...PROTECT(COURT_OWNED), label: "Month of the order" },
  "Year": { ...PROTECT(COURT_OWNED), label: "Year of the order" },
  "Petition/Motion": { ...PROTECT(COURT_OWNED), label: "What the court considered" },
  "PresentedBy": { ...PROTECT(COURT_OWNED), label: "Who presented it to the court" },
  "Disposition": { ...PROTECT(COURT_OWNED), label: "What the court ordered on the Petition/Motion" },
  "Checkbox1": { ...PROTECT(COURT_OWNED), label: "Ordering paragraph the court selects, first" },
  "Checkbox2": { ...PROTECT(COURT_OWNED), label: "Ordering paragraph the court selects, second" },
  "Checkbox3": { ...PROTECT(COURT_OWNED), label: "Ordering paragraph the court selects, third" },
  "AgenciesServed": { ...SUPPLY("the criminal justice agencies on which the order should be served, so the court can name them in its order"), label: "Criminal justice agencies to be served with the order" },
  "NameAddrOfJudge": { ...SUPPLY("the name and mailing address of the presiding official who accepted the plea or heard the case"), label: "Name and address of the presiding official, on the Rule 790 information page" },
  "AddressOfAffiant": { ...SUPPLY("the name and mailing address of the affiant shown on the complaint, if available"), label: "Name and address of the affiant, on the Rule 790 information page" },
  "DateAndArrestingAgency": { ...SUPPLY("the date on the complaint or the date of arrest, and the criminal justice agency that made the arrest if you know it"), label: "Date on the complaint or of arrest, and the arresting agency" },
  "Restitution": { ...SUPPLY("the amount of any fine, costs or restitution still due, or nothing if none is"), label: "Amount of fine, costs or restitution still due" },
  "PetitionersSSN": { ...SUPPLY("your Social Security number - the platform never stores it and never writes it for you"), label: "Petitioner's Social Security Number on the Rule 790 information page" },
  "ReasonForExpunge": { ...SUPPLY("your own statement of the reason for expungement, as the Rule 790 information page asks for it"), label: "Reason for expungement on the Rule 790 information page" },
  "OTN": { ...SUPPLY("the Offense Tracking Number (OTN), from your docket sheet"), label: "Offense Tracking Number (OTN) on the Rule 790 information page" },
  "Alias1": { ...SUPPLY("any other name you have been known by, if there is one"), label: "Alias, first, on the Rule 790 information page" },
  "Alias2": { ...SUPPLY("a second other name, if there is one"), label: "Alias, second, on the Rule 790 information page" },
  "Alias3": { ...SUPPLY("a third other name, if there is one"), label: "Alias, third, on the Rule 790 information page" },
  "Text15": { ...SUPPLY("whether the fine, costs or restitution imposed with the sentence has been paid, and what remains if it has not"), label: "Whether the fine, costs or restitution has been paid" }
};

/*
 * The default, applied to any widget the tables above do not name. It is what
 * the form itself says the widget is: a blank the petitioner fills, or a box
 * only the petitioner may tick. `what` is built from the caption read off the
 * page, so the participant is asked for the thing in the words the form prints.
 */
function defaultPolicy(name, isCheckbox, caption) {
  if (isCheckbox) return { ...ELECTION(), label: caption ?? name };
  const printed = String(caption ?? "").trim();
  const row = /Row(\d+)$/.exec(name);
  const column = row ? name.slice(0, row.index).replace(/([a-z])([A-Z])/g, "$1 $2").trim() : null;
  if (column) {
    const n = ["first", "second", "third", "fourth", "fifth", "sixth", "seventh", "eighth"][Number(row[1]) - 1] ?? `row ${row[1]}`;
    return {
      ...SUPPLY(`the ${column.toLowerCase()} of the ${n} charge to be expunged, exactly as it appears on the charging document`),
      label: `${column} (${n} charge row)`
    };
  }
  return {
    ...SUPPLY(printed ? `what the form asks for beside "${printed}"` : `what the form asks for in this blank`),
    label: printed || name
  };
}

const FORMS = {
  "PA-RCRIM-P-790-PETITION": {
    title: "Petition for Expungement Pursuant to Pa.R.Crim.P. 790",
    component: "primary_filing", captionOnly: false, named: PETITION_NAMED
  },
  "PA-RCRIM-P-790-ORDER": {
    title: "Order for Expungement Pursuant to Pa.R.Crim.P. 790",
    component: "proposed_order", captionOnly: true, named: ORDER_NAMED
  }
};
const ORDER_OF_DOCUMENTS = ["PA-RCRIM-P-790-PETITION", "PA-RCRIM-P-790-ORDER"];

export const FAMILY_CONFIGS = Object.freeze({
  "pa_pardon_expungement-set": {
    jurisdiction: "PA",
    routeKey: "obligation:track-pathway:PA:pa_pardon_expungement:rule-790-expungement",
    routeSelectionId: "pa-pardon-expungement-rule-790-complete-set",
    legalName: "Expungement Following an Unconditional Pardon",
    routeName: "expungement following an unconditional pardon, under Pa.R.Crim.P. 790",
    statute: "Pa.R.Crim.P. 790",
    documents: ORDER_OF_DOCUMENTS,
    routes: [
      { id: "rule_790_petition", label: "a Rule 790 petition, where the automatic route has not cleared the record", carriedBy: "PA-RCRIM-P-790-PETITION" },
      { id: "no_filing_process_guidance", label: "no filing - process guidance, where it has", carriedBy: "process_guidance" }
    ]
  }
});

const FIXTURES = {
  canonical: {
    "participant.full_legal_name": "Jordan Avery Reyes",
    "participant.date_of_birth": "1991-04-17",
    "participant.street_address": "42 Maple Street",
    "participant.city": "Philadelphia",
    "participant.state": "PA",
    "participant.zip": "19107",
    "matter.case_number": "CP-51-CR-0004170-2021",
    "matter.county": "Philadelphia"
  },
  boundary: {
    "participant.full_legal_name": "Maria-Alejandra O'Shaughnessy-Whitfield",
    "participant.date_of_birth": "1968-12-31",
    "participant.street_address": "1188 Upper Notch Crossing Road, Apartment 14B",
    "participant.city": "Wilkes-Barre Township",
    "participant.state": "Pennsylvania",
    "participant.zip": "18702-2214",
    "matter.case_number": "CP-40-CR-0012760-2024",
    "matter.county": "Luzerne"
  }
};

/* ---- source binding ------------------------------------------------------ */
function resolveSources(familyId) {
  const config = FAMILY_CONFIGS[familyId];
  assert.ok(config, `unknown family ${familyId}`);
  const index = JSON.parse(fs.readFileSync(path.join(ROOT, CORPUS_INDEX), "utf8"));
  const raw = index.entries ?? index.files ?? index;
  const rows = Array.isArray(raw) ? raw : Object.values(raw);
  const root = corpusRoot();
  const resolved = []; const failures = [];
  for (const formNumber of config.documents) {
    // The form-number token is delimited on both sides, so 200-00132A cannot
    // match the 200-00132A binary and 200-00130 cannot match 200-00130A.
    const entry = rows.find((e) => String(e.path ?? e.relativePath ?? "").includes(`__${formNumber}__`)
      && String(e.path ?? e.relativePath ?? "").startsWith("STATES/PA/"));
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
  return { x: Number(x.toFixed(2)), y: Number(y.toFixed(2)), width: Number(Math.abs(r.width).toFixed(2)), height: Number(Math.abs(r.height).toFixed(2)) };
}

/* ---- census, with the caption read off the page --------------------------- */
async function censusOf(source) {
  const spec = FORMS[source.formNumber];
  const doc = await PDFDocument.load(source.bytes, { ignoreEncryption: true });
  const pages = doc.getPages();
  const pageText = pages.map((p, i) => ({
    page: i + 1,
    lines: groupIntoLines(extractTextItems(p)).map((l) => ({ y: Math.round(l.y), text: String(l.text ?? "").trim() })).filter((l) => l.text)
  }));

  // How many boxes each name carries, so a name that carries one keeps its own
  // name as its key and a name that carries several is addressed by coordinate.
  const counts = new Map();
  for (const f of doc.getForm().getFields()) counts.set(f.getName(), f.acroField.getWidgets().length);

  const rows = []; const unmapped = []; const used = new Set();
  for (const field of doc.getForm().getFields()) {
    const name = field.getName();
    const pdfClass = field.constructor.name;
    for (const w of field.acroField.getWidgets()) {
      const rect = normalizeRect(w.getRectangle());
      const ref = w.P();
      let pi = pages.findIndex((p) => p.ref === ref); if (pi < 0) pi = 0;
      const page = pi + 1;
      const key = counts.get(name) > 1 ? `${name}@p${page}y${Math.round(rect.y)}` : name;
      /*
       * A name that carries several boxes is addressed ONLY by coordinate. The
       * base-name fallback is right for a name that carries one box and wrong
       * for one that carries several: on 200-00130 the names 26, 27, 30 and 31
       * are a new-charge row near the top of page 2 AND a state-agency row two
       * thirds of the way down it, and a fallback would have given the agency
       * rows the new-charge wording without anything failing.
       */
      const named = counts.get(name) > 1 ? spec.named[key] : (spec.named[key] ?? spec.named[name]);
      if (named) used.add(spec.named[key] ? key : name);
      /*
       * The caption: the printed line whose baseline is nearest this widget's
       * own, on this widget's own page. These forms label a blank above it, on
       * it, or under it depending on the block, so nearest-by-distance is the
       * only rule that reads all three the same way.
       */
      const lines = pageText.find((p) => p.page === page)?.lines ?? [];
      const nearest = [...lines].sort((a, b) => Math.abs(a.y - rect.y) - Math.abs(b.y - rect.y))[0] ?? null;
      const entry = named ?? defaultPolicy(name, pdfClass === "PDFCheckBox", nearest?.text ?? null);
      rows.push({
        key, name, page, rect,
        type: pdfClass.replace("PDF", "").toLowerCase().replace("textfield", "text"),
        rectBasis: "acroform_widget_rect_read_first_hand_from_pinned_binary_and_normalized",
        caption: nearest?.text ?? null,
        captionAt: nearest ? { page, y: nearest.y, basis: "nearest printed line to this widget's own baseline, read from the pinned binary at build time" } : null,
        effectiveLabel: entry.label ?? nearest?.text ?? key,
        regionHeading: entry.label ?? nearest?.text ?? key,
        policy: entry.policy, fact: entry.fact ?? null,
        refusalClass: entry.refusalClass ?? null, what: entry.what ?? null,
        isSelectionControl: pdfClass === "PDFCheckBox",
        multiline: typeof field.isMultiline === "function" ? field.isMultiline() : false,
        maxLength: typeof field.getMaxLength === "function" ? (field.getMaxLength() ?? null) : null
      });
    }
  }
  const missingKeys = Object.keys(spec.named).filter((k) => !used.has(k));
  const uncaptioned = rows.filter((r) => !r.caption).map((r) => ({ key: r.key, page: r.page }));
  return { rows, unmapped, missingKeys, uncaptioned, pageText };
}


/* ---- the route's own election, marked on the court's own box -------------- *
 *
 * finalizeOfficialForm refuses a checkbox by type, which is right for a fact map
 * and wrong for a route election: the packet is built for one statutory route
 * and the form asks which one, so the answer is a property of the packet. The
 * mark is two diagonals struck strictly inside the box the court already
 * printed. No box is drawn, thickened or moved.
 */
async function markRouteSelections(flattenedBytes, selections) {
  if (selections.length === 0) return { bytes: flattenedBytes, marks: [] };
  const pdf = await PDFDocument.load(flattenedBytes, { ignoreEncryption: true, updateMetadata: false });
  const pages = pdf.getPages();
  const marks = [];
  for (const sel of selections) {
    const page = pages[sel.page - 1];
    assert.ok(page, `route selection ${sel.key} names page ${sel.page}, which is not in the document`);
    const { x, y, width, height } = sel.rect;
    const inset = SELECTION_INSET;
    assert.ok(width > inset * 2 + 1 && height > inset * 2 + 1,
      `route selection ${sel.key} is ${width}x${height}pt, too small to mark inside the court's own stroke`);
    const a = { x: x + inset, y: y + inset };
    const b = { x: x + width - inset, y: y + height - inset };
    page.drawLine({ start: a, end: b, thickness: SELECTION_LINE_WIDTH, color: PARTICIPANT_INK });
    page.drawLine({ start: { x: a.x, y: b.y }, end: { x: b.x, y: a.y }, thickness: SELECTION_LINE_WIDTH, color: PARTICIPANT_INK });
    marks.push({ key: sel.key, page: sel.page, box: { x0: x, y0: y, x1: x + width, y1: y + height }, inset,
      lineWidth: SELECTION_LINE_WIDTH, mark: "two_diagonal_strokes_inset", drewANewBox: false, redrewTheCourtsBox: false, routeReason: sel.routeReason });
  }
  return { bytes: Buffer.from(await pdf.save({ useObjectStreams: false, updateMetadata: false })), marks };
}

async function paintedPaths(bytes) {
  const pdf = await PDFDocument.load(bytes, { ignoreEncryption: true, updateMetadata: false });
  return pdf.getPages().flatMap((page, index) => extractPageGeometry(page).paths
    .filter((row) => /^(S|s|f|F|f\*|B|B\*|b|b\*)$/.test(String(row.paintedBy ?? "")))
    .map((row) => ({ page: index + 1, operator: row.operator, paintedBy: row.paintedBy,
      x: +row.x.toFixed(3), y: +row.y.toFixed(3), width: +row.width.toFixed(3), height: +row.height.toFixed(3) })));
}

async function addedPaintedPaths(beforeBytes, afterBytes) {
  const before = await paintedPaths(beforeBytes);
  const after = await paintedPaths(afterBytes);
  const key = (r) => [r.page, r.operator, r.paintedBy, r.x, r.y, r.width, r.height].join("|");
  const counts = new Map();
  for (const r of before) counts.set(key(r), (counts.get(key(r)) ?? 0) + 1);
  return after.filter((r) => {
    const remaining = counts.get(key(r)) ?? 0;
    if (remaining <= 0) return true;
    counts.set(key(r), remaining - 1);
    return false;
  });
}

function pathInsideBox(row, box) {
  const pad = 0.75;
  return row.x >= box.x0 - pad && row.x + Math.abs(row.width) <= box.x1 + pad
    && row.y >= box.y0 - pad && row.y + Math.abs(row.height) <= box.y1 + pad;
}

/* ---- render one official form -------------------------------------------- */
async function renderDocument(source, census, fixtureName) {
  const facts = FIXTURES[fixtureName];
  const byName = new Map();
  for (const r of census.rows) {
    const existing = byName.get(r.name);
    if (!existing) { byName.set(r.name, r); continue; }
    assert.ok(!(existing.policy === "write" || r.policy === "write"),
      `widget name ${r.name} carries several boxes and one of them is a write; a name-keyed fill cannot address them separately`);
  }
  const unique = [...byName.values()];
  const writable = unique.filter((r) => r.policy === "write");
  const explicitMappings = Object.fromEntries(writable.map((r) => [r.name, r.fact]));
  const unwritableFields = unique.filter((r) => r.policy !== "write").map((r) => ({ field: r.name }));
  const { bytes, report } = await finalizeOfficialForm({
    sourceBytes: source.bytes, expectedSha256: source.sha256,
    census: unique.map((r) => ({
      name: r.name, type: r.type, effectiveLabel: r.effectiveLabel, regionHeading: r.regionHeading,
      widgets: [{ page: r.page, rect: r.rect }], multiline: r.multiline === true, maxLength: r.maxLength ?? null
    })),
    facts, explicitMappings, unwritableFields,
    // The order is the judge's. Caption mode is the shared field semantics'
    // own name for that, and it refuses anything outside the style of the case
    // whatever this builder's policy table says.
    captionOnly: FORMS[source.formNumber].captionOnly === true,
    documentTextLines: census.pageText.flatMap((p) => p.lines.map((l) => l.text)),
    title: FORMS[source.formNumber].title
  });
  if (process.env.PA_DEBUG_RENDER) {
    console.log(`-- ${source.formNumber} ${fixtureName}: written=${report.written.length} refused=${report.refused.length}`);
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
      field: r.key, widgetName: r.name, factId: w.factId ?? r.fact, page: r.page, rect: r.rect,
      printedCaption: r.caption, drawnText: drawn.map((d) => d.text).filter(Boolean),
      expected: FIXTURES[fixtureName][r.fact] ?? null
    });
  }
  const measured = census.rows.map((r) => ({ page: r.page, rect: r.rect }));
  /*
   * Ink that landed nowhere the map measured -- counted, not asserted away.
   *
   * Two things are excluded, and both are excluded because they are not ink a
   * reader would see rather than because they are inconvenient. Control
   * characters are not glyphs: one empty comb field on the petition flattens to
   * an appearance of NUL bytes. And one appearance on the petition is not a text
   * appearance at all -- its stream decodes to 2,481 bytes of binary that the
   * appearance reader, which harvests any parenthesised or hex run it finds,
   * surfaces as if it were text. Anything under half printable is recorded as a
   * non-text appearance instead of being counted as 2,481 stray marks, so it is
   * visible in the evidence rather than dropped.
   */
  const printable = (t) => String(t ?? "").replace(/[^\x20-\x7e\u00a0-\u024f]/g, "");
  let outside = 0;
  const nonTextAppearances = [];
  for (const w of widgets) {
    const at = measured.some((m) => m.page === w.page && Math.abs(w.x - m.rect.x) <= 2 && Math.abs(w.y - m.rect.y) <= 2);
    if (at) continue;
    const raw = String(w.text ?? "");
    const clean = printable(raw).replace(/\s+/g, "");
    if (raw.length > 0 && clean.length / raw.length < 0.5) {
      nonTextAppearances.push({ page: w.page, x: w.x, y: w.y, decodedBytes: raw.length, printableShare: Number((clean.length / raw.length).toFixed(3)) });
      continue;
    }
    outside += clean.length;
  }
  return { actualWrites, appearances: widgets.length, outside, nonTextAppearances };

}

/* ---- the composed instructions component ---------------------------------- */
function composedBody(config, facts, resolved) {
  const L = [];
  L.push("PROCESS GUIDANCE: WHICH OF THE TWO ROUTES YOU ARE IN", "");
  L.push(`Petitioner: ${facts["participant.full_legal_name"]}`);
  L.push(`Docket No.: ${facts["matter.case_number"]}`);
  L.push(`County: ${facts["matter.county"]}`);
  L.push(`Route: ${config.legalName}`, "");
  L.push("READ THIS BEFORE YOU FILE ANYTHING", "");
  L.push("The census records two routes for this family, and they are told apart by something neither of these forms asks:", "");
  for (const r of config.routes) L.push(`- ${r.label}: ${r.carriedBy === "process_guidance" ? "this page" : `Form ${r.carriedBy}`}.`);
  L.push("");
  L.push("If the automatic route has already cleared the record, there is nothing here to file. A packet that only ever told you to file would be telling you to do work you may not need to do, and to pay for it.", "");
  L.push("HOW TO FIND OUT WHICH ONE YOU ARE IN", "");
  L.push("Ask the Clerk of Courts for the county in the caption above what the docket now shows for this case. The petition in this packet also has a box for attaching your Pennsylvania State Police criminal history, and that history is the document that shows what is still on the record. If the record is already clear, stop; if it is not, file the petition.", "");
  L.push("This page states no timetable and no criterion for that, because neither is established by the two forms this packet is built from, and an unsourced criterion in a filing instruction is worse than none.", "");
  L.push("IF YOU DO FILE", "");
  L.push("File the petition with the Clerk of Courts. The order in this packet is tendered WITH the petition -- it is the order the judge signs, not a document you fill in or sign. The platform has written only the style of the case into it. Do not sign the order.", "");
  L.push("The petition asks for a great deal the platform does not hold: the presiding official who heard the case and their court address, the affiant on the complaint and theirs, the Offense Tracking Number, and every charge row with its title, section, subsection, description, counts, grade and disposition. All of it is listed in this packet's participant instructions, by the words printed beside each blank.", "");
  L.push("WHAT THIS PACKET IS NOT", "");
  L.push("This is a prepared petition, a tendered official order and this guidance page. It is not legal advice, it is not filed for you, and it does not decide whether the court will order expungement.", "");
  L.push(`Route: ${config.routeKey}`);
  return L.join("\n");
}

function sanitizePdfText(t) {
  return t.replaceAll(" ", " ").replaceAll("‑", "-").replaceAll("–", "-").replaceAll("—", "-")
    .replaceAll("−", "-").replaceAll("’", "'").replaceAll("‘", "'").replaceAll("“", '"')
    .replaceAll("”", '"').replaceAll("§", "Sec. ").replaceAll("…", "...");
}

async function renderComposedPdf(fullText, title) {
  const pdf = await PDFDocument.create();
  pdf.setTitle(title); pdf.setProducer("RCAP census-v1 artifact-only renderer"); pdf.setCreator("RCAP evidence build");
  const fixed = new Date(FIXED_DATE); pdf.setCreationDate(fixed); pdf.setModificationDate(fixed);
  const font = await pdf.embedFont(StandardFonts.TimesRoman);
  const size = 11, lh = 14.5, W = 612, H = 792, margin = 72, maxW = W - 2 * margin;
  let page = pdf.addPage([W, H]); let y = H - margin;
  const draw = (line) => { if (y < margin) { page = pdf.addPage([W, H]); y = H - margin; } if (line) page.drawText(line, { x: margin, y, size, font, color: rgb(0, 0, 0) }); y -= lh; };
  const splitToken = (tok) => { const out = []; let c = ""; for (const ch of tok) { if (c && font.widthOfTextAtSize(`${c}${ch}`, size) > maxW) { out.push(c); c = ch; } else c += ch; } if (c) out.push(c); return out; };
  const wrap = (line) => {
    if (!line) return [""];
    const words = line.split(/\s+/).flatMap((w) => font.widthOfTextAtSize(w, size) > maxW ? splitToken(w) : [w]);
    const out = []; let c = "";
    for (const w of words) { const cand = c ? `${c} ${w}` : w; if (font.widthOfTextAtSize(cand, size) <= maxW) c = cand; else { if (c) out.push(c); c = w; } }
    if (c) out.push(c); return out;
  };
  for (const raw of sanitizePdfText(fullText).split("\n")) for (const row of wrap(raw)) draw(row);
  return Buffer.from(await pdf.save({ useObjectStreams: false, updateMetadata: false }));
}

function composedMap(config) {
  const id = "process_guidance";
  const base = (fid, label) => ({
    field: `${id}.${fid}`, page: 1, printedLabel: label, printedLine: label,
    effectiveLabel: label, regionHeading: label, sectionHeading: null,
    rectBasis: "composed_document_authored_by_this_build"
  });
  const writes = [
    { ...base("petitioner_name", "Petitioner named on this page"), factId: "participant.full_legal_name", kind: "composed_text", document: id },
    { ...base("case_number", "Case No. printed on this page"), factId: "matter.case_number", kind: "composed_text", document: id }
  ];
  return {
    formNumber: id,
    documentPolicy: { mode: "participant", captionOnly: false, documentAcceptsFill: true, routeKey: config.routeKey },
    structuralClass: "composed_document",
    explicitMappings: {}, roleRefusals: [], selectionControls: [],
    canonicalWrites: writes, canonicalRefusals: [],
    boundaryWrites: writes, boundaryRefusals: []
  };
}

/* ---- field map ------------------------------------------------------------ */
const OFFROUTE_REASON = (why) => `${why}; this branch of the form is never populated with participant data on this route`;

function officialFieldMap(source, census, report, config, marks = []) {
  const written = new Set(report.written.map((w) => w.field));
  const canonicalWrites = []; const canonicalRefusals = []; const selectionControls = [];
  for (const r of census.rows) {
    const base = {
      field: r.key, widgetName: r.name, page: r.page, rect: r.rect, rectBasis: r.rectBasis,
      printedLabel: r.caption, printedLine: r.caption,
      regionHeading: r.effectiveLabel, sectionHeading: null,
      effectiveLabel: r.effectiveLabel, captionReadAt: r.captionAt
    };
    if (r.policy === "write") {
      assert.ok(written.has(r.name), `${source.formNumber} ${r.key} is mapped as a write and the finalizer did not write it`);
      canonicalWrites.push({ ...base, factId: r.fact, kind: r.type, document: source.formNumber });
      continue;
    }
    if (r.policy === "select") {
      assert.ok(marks.some((m) => m.key === r.key), `${source.formNumber} ${r.key} is a route selection and no mark was drawn for it`);
      selectionControls.push({
        ...base, selectionId: r.key, kind: "selection_control", type: "checkbox",
        widgets: [{ page: r.page, rect: r.rect, rectBasis: r.rectBasis }],
        disposition: "selected_by_route", reason: r.routeReason, routeDetermined: true,
        requiredBeforeFiling: false, why: r.routeReason, document: source.formNumber
      });
      continue;
    }
    if (r.isSelectionControl) {
      const protect = r.policy === "protect";
      const offroute = r.policy === "offroute";
      const cls = protect ? r.refusalClass : (offroute ? null : ELECTION_CLASS);
      selectionControls.push({
        ...base, selectionId: r.key, kind: "selection_control", type: "checkbox",
        widgets: [{ page: r.page, rect: r.rect, rectBasis: r.rectBasis }],
        disposition: "explicit_refusal",
        reason: protect ? "signature or date field; never prefilled by this build"
          : offroute ? OFFROUTE_REASON(r.routeReason)
            : "a sworn assertion or legal election the route does not determine; only the participant may make it",
        category: cls, completenessClass: cls, class: cls,
        requiredBeforeFiling: false, routeDetermined: false, document: source.formNumber,
        why: protect ? "the participant signs and dates this themselves at filing time"
          : offroute ? r.routeReason : "only the participant may make this election"
      });
      continue;
    }
    if (r.policy === "protect") {
      canonicalRefusals.push({
        ...base, reason: "signature or date field; never prefilled by this build",
        category: r.refusalClass, completenessClass: r.refusalClass, class: r.refusalClass,
        requiredBeforeFiling: false, document: source.formNumber,
        why: r.refusalClass === SIGNATURE
          ? "the participant signs and dates this themselves at filing time"
          : "the court, the clerk or the State's Attorney owns this field"
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
      ...base, reason: `the participant supplies this before filing: ${r.what}`,
      category: null, completenessClass: null, class: null,
      disposition: "REQUIRED_BEFORE_FILING", requiredBeforeFiling: true, routeDetermined: false,
      identity: `${source.formNumber} field ${r.key}`, factId: null, document: source.formNumber,
      why: `the platform holds no value for this and the participant supplies it before filing: ${r.what}`,
      participantMustSupply: r.what
    });
  }
  return {
    formNumber: source.formNumber,
    documentPolicy: { mode: "participant", captionOnly: false, documentAcceptsFill: true, routeKey: config.routeKey },
    structuralClass: "acroform",
    component: FORMS[source.formNumber].component,
    explicitMappings: Object.fromEntries(census.rows.filter((r) => r.policy === "write").map((r) => [r.name, r.fact])),
    roleRefusals: [], selectionControls, canonicalWrites, canonicalRefusals,
    boundaryWrites: canonicalWrites, boundaryRefusals: canonicalRefusals
  };
}

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
    for (const k of [normLabel(w.label), normLabel(w.name)]) if (k.length >= 4) writtenInDocument.get(doc).add(k);
  }
  const availableFacts = new Set(writes.map((w) => w.factId).filter(Boolean).map(String));
  const declaredRequired = [];
  for (const b of blanks) {
    const here = writtenInDocument.get(String(b.document ?? "")) ?? new Set();
    const declared = {
      disposition: b.completenessDisposition ?? null,
      ...(Object.hasOwn(b, "requiredBeforeFiling") ? { requiredBeforeFiling: b.requiredBeforeFiling === true } : {}),
      routeDetermined: b.routeDetermined === true,
      factId: b.factId ?? null, identity: b.field ?? null,
      factAvailable: (b.factId ? availableFacts.has(String(b.factId)) : false) || here.has(normLabel(b.label)) || here.has(normLabel(b.name))
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
    const key = rowKeyOf(f); if (!key) continue;
    if (!rows.has(key)) rows.set(key, []);
    rows.get(key).push(f);
  }
  for (const [key, cells] of rows) {
    if (!cells.some((c) => c.written)) continue;
    const missing = cells.filter((c) => !c.written && classifyField(c.label, c.isSelectionControl === true).requirement === "REQUIRED_KNOWN");
    if (missing.length > 0) note("incompleteRows", { row: key, missingCells: missing.map((m) => m.label).slice(0, 6) });
  }
  for (const w of writes) {
    if (classifyField(w.label, w.isSelectionControl === true).requirement === "PROTECTED") note("protectedWrites", { field: w.field, label: w.label, why: "a protected field was written" });
  }
  for (const a of actualWrites.artifacts ?? []) {
    const reported = a.valuesReportedByFinalizer ?? null;
    const visible = (a.addedGlyphsReadFromOutputBytes ?? 0) + (a.flattenedWidgetAppearancesReadFromOutputBytes ?? 0);
    if (typeof reported === "number" && reported > 0 && visible === 0) note("invisibleWrites", { fixture: a.fixture, reportedByFinalizer: reported });
    if ((a.nonWhitespaceGlyphsOutsideMeasuredWriteBoxes ?? 0) > 0) note("visualDefects", { fixture: a.fixture, glyphsOutsideMeasuredBoxes: a.nonWhitespaceGlyphsOutsideMeasuredWriteBoxes });
  }
  return { counters, findings, terminalFields: writes.length + blanks.length, written: writes.length, blank: blanks.length };
}

function requiredBeforeFilingItems(maps) {
  const order = Object.fromEntries([...ORDER_OF_DOCUMENTS, "process_guidance"].map((f, i) => [f, i]));
  return maps.flatMap((m) => (m.canonicalRefusals ?? []).filter((r) => r.requiredBeforeFiling === true).map((r) => ({
    document: m.formNumber, field: r.field, page: r.page, y: r.rect?.y ?? null,
    printedContext: r.printedLabel, disclosureLabel: r.effectiveLabel,
    identity: r.identity, why: r.why, participantMustSupply: r.participantMustSupply
  })))
    .sort((a, b) => ((order[a.document] ?? 99) - (order[b.document] ?? 99)) || (a.page - b.page) || ((b.y ?? 0) - (a.y ?? 0)));
}

function instructionsMarkdown(config, resolved, rbf) {
  const byDoc = new Map();
  for (const i of rbf) byDoc.set(i.document, [...(byDoc.get(i.document) ?? []), i]);
  const out = [];
  out.push(`# What you must do before you file — ${config.routeName}`, "");
  out.push(`This packet is prepared for **${config.legalName}**.`, "");
  out.push("The platform filled in what it holds about you: your name, your date of birth, your address, your telephone number, your email and your docket number. Everything else on these forms is yours, and this page lists every one of them by the words printed beside the blank.", "");
  out.push("## Where you file this", "");
  out.push("File the completed packet with the **Vermont Superior Court, Criminal Division**, in the unit where your case was decided.", "");
  out.push("Both the petition (200-00130) and the stipulation (200-00132) print `SUPERIOR COURT CRIMINAL DIVISION` across the top of page 1, and the `Unit` box beside it is where that unit goes. If you do not know which unit decided your case, the docket number on your paperwork identifies it, and the clerk of any Superior Court unit can tell you from the docket number.", "");
  out.push("Two things this packet does **not** tell you, because neither is established here and an unsourced figure in a filing instruction is worse than none:", "");
  out.push("- **The filing fee, and whether it can be waived.** Ask the clerk of the unit above. The waiver form is included; the amount it waives is not stated here.");
  out.push("- **Who must be served, and how.** Ask the same clerk. The State's Attorney's signature on the stipulation is not service and does not substitute for it.", "");
  out.push("## What is in this packet", "");
  out.push("| Component | Document |", "| --- | --- |");
  for (const r of resolved) out.push(`| \`${FORMS[r.formNumber].component}\` | **${r.formNumber}** — ${FORMS[r.formNumber].title} |`);
  out.push("| `filing_and_expectation_instructions` | the page that says where the packet goes and what to expect |", "");
  out.push("## What you must do", "");
  out.push("1. **Fill in every item listed below.** Each one names the form, the page and the printed words next to the blank.");
  out.push("2. **Say which non-conviction ending applies to your case.** Question 2 of the petition offers three: you were cited or arrested but no charge was filed, a charge was filed and the court found no probable cause, or a charge was filed and the court dismissed it. Those are three different things and only you know which happened. The packet has already stated that you were **not convicted** — that much the route decides — and it leaves the rest to you.");
  out.push("3. **Sign and date each form yourself.** The platform never signs and never dates a signature. Blank signature and date lines are deliberate.");
  out.push("4. **Decide which route you are taking.** If the State's Attorney will sign the stipulation (200-00132), that is the quicker route and the court may seal on that agreement. If they will not, file the petition (200-00130) on its own and ask the court to set a hearing. The process-guidance page in this packet sets out both, and the third route — the one that files nothing — as well.");
  out.push("5. **File the fee waiver (600-00228) only if you cannot pay.**", "");
  out.push("## The items you must supply", "");
  for (const [doc, items] of byDoc) {
    out.push(`### ${doc} — ${FORMS[doc]?.title ?? doc}`, "");
    out.push("| Page | The blank on the form | What to write |", "| --- | --- | --- |");
    for (const i of items) out.push(`| ${i.page} | ${i.disclosureLabel} | ${i.participantMustSupply} |`);
    out.push("");
  }
  out.push("## Things the platform deliberately left blank", "");
  out.push("- **Your signature and the date you sign.** A signature is yours alone, and a date written before you sign would be false.");
  out.push("- **The State's Attorney's signature, date and printed name, and the court's order on the stipulation.** Those belong to the prosecutor and the judge.");
  out.push("- **Every checkbox.** Each one is a statement about your own record or a choice only you can make. Read them and tick the ones that are true for you.", "");
  out.push("## What this packet is not", "");
  out.push("This is a prepared set of official Vermont forms and a process-guidance page. It is not legal advice, it is not filed for you, and it does not decide whether the court will seal the record.", "");
  out.push(`_Route: ${config.routeKey}_`);
  return `${out.join("\n")}\n`;
}

/* ---- artifacts ------------------------------------------------------------ */
function writeArtifacts(ctx) {
  const { familyId, config, outDir, resolved, maps, artifacts, writeProofs, rasterPages, rbf, instructions, audit, rasterSkipped } = ctx;
  const W = (rel, body) => fs.writeFileSync(path.join(ROOT, outDir, rel), body);
  W("production-field-map.json", `${JSON.stringify({
    schemaVersion: "rcap-official-form-field-map/v1-census-v1",
    familyId, routeKeys: [config.routeKey], routeSelectionId: config.routeSelectionId,
    jurisdiction: config.jurisdiction, statute: config.statute, legalName: config.legalName,
    officialForms: resolved.map((r) => r.formNumber),
    componentSet: COMPONENTS, documentOfComponent: DOCUMENT_OF_COMPONENT,
    captionBasis: "every printed caption in this map was READ OUT OF THE PINNED BINARY at build time -- the printed line nearest the widget's own baseline on the widget's own page -- and captionReadAt records the y it was read from. The source gate is the exact SHA-256 binding, which fails the family closed on any change to the form.",
    dispositionVocabulary: [SIGNATURE, COURT_OWNED, ELECTION_CLASS],
    routeSelectionsMade: [],
    routeSelectionNote: "Question 2 of 200-00130 asks whether the petitioner was convicted, and this family is non-conviction sealing, so the route determines the answer: the packet marks 'I was not convicted for the offenses listed above' and refuses the conviction block beneath it. Which non-conviction ending applies -- never charged, no probable cause, or dismissed -- is not route-determined and stays with the participant.",
    requiredBeforeFilingCount: rbf.length, requiredBeforeFiling: rbf,
    maps, generationAllowed: false, runtimeSelectable: false, commercialRoutesOpened: 0
  }, null, 2)}\n`);
  W("source-receipt.json", `${JSON.stringify({
    schemaVersion: "rcap-family-source-receipt/v1",
    familyId, worklistGroupId: familyId, jurisdiction: config.jurisdiction,
    implementationStrategy: "official_pdf_fill", custodyClass: "SOURCE_ALREADY_HELD",
    acquisitionCommissioned: false, corpusRootFromEnvironment: "MASTER_LIBRARY_SOURCE_DIR",
    bindingMethod: "exact path + corpus-index SHA-256 + on-disk SHA-256 + byte length",
    routeSelectionId: config.routeSelectionId, allSourcesExact: true,
    documents: resolved.map((r) => ({ sourceIds: [r.sourceId], formNumber: r.formNumber, revision: r.revision, pathInArchive: r.pathInArchive, sha256: r.sha256, byteLength: r.byteLength })),
    composedComponentsAuthoredByThisBuild: ["process_guidance"],
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
    schemaVersion: "rcap-actual-writes-byte-proof/v1", familyId, derivedFromArtifactBytes: true,
    documents: writeProofs,
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
    focusedCheckNote: "scripts/rcap-packet-completeness/verify-packet-completeness.mjs enumerates only families listed BUILT in data/rcap-grade-a/launch-control/C11_RETURN_REVIEW.json, an earlier wave's record that this lane may not write.",
    counters: audit.counters, allNineZero: PASS_COUNTERS.every((c) => audit.counters[c] === 0),
    totals: { terminalFields: audit.terminalFields, written: audit.written, blank: audit.blank },
    findings: audit.findings
  }, null, 2)}\n`);
  W("build-status.json", `${JSON.stringify({
    schemaVersion: "rcap-family-build-status/v1", familyId,
    buildStatus: "state_built", reviewStatus: "qa_review_pending",
    builtBy: "scripts/build-census-v1-pa_pardon_expungement-set.mjs",
    rasterEngine: rasterSkipped ? null : "chromium_calibrated", popplerUsed: false,
    rasterState: rasterSkipped ? "BUILT_RASTER_PENDING" : "rendered_locally_pending_central_acceptance",
    packetsSelfVerified: 0, commercialRoutesOpened: 0, productionTouched: false,
    grantsNothing: "A rendered packet is review evidence. It authorizes no fulfillment and opens no commercial route."
  }, null, 2)}\n`);
  W("build-findings.json", `${JSON.stringify({
    schemaVersion: "rcap-family-build-findings/v1", familyId,
    findings: [
      { finding: "This family files the same three forms as the Vermont sealing-by-conviction families, and differs from them by one question.", consequence: "Question 2 of 200-00130 is route-determined here: the packet marks 'I was not convicted for the offenses listed above' and refuses the whole conviction block beneath it -- the date of conviction, the probation questions and the restitution questions -- as a branch this route does not take." },
      { finding: "The census records THREE routes for this family, and one of them files nothing at all.", consequence: "A composed process-guidance page carries that third route. A packet that only ever told the participant to file would be telling them to do work they may not need to do, and dropping the route rather than carrying it would have lost a third of what the family was built for." },
      { finding: "Which non-conviction ending applies -- never charged, no probable cause, or dismissed -- is three different things that happened to a participant's own case.", consequence: "All three boxes stay the participant's, and the instructions say in terms which part the route decided and which part it did not." },
      { finding: "Every caption in this map is read out of the pinned binary at build time rather than transcribed.", consequence: "The guard against a changed form is the exact SHA-256 source binding, which fails the family closed on any byte." },
      { finding: "600-00228 is a financial affidavit and the platform holds none of its figures.", consequence: `${rbf.length} blanks across the packet are required-before-filing and every one is named in participant-instructions.md.` }
    ]
  }, null, 2)}\n`);
  W("participant-instructions.md", instructions);
  W("approval-request.json", `${JSON.stringify({
    schemaVersion: "rcap-family-approval-request/v1", familyId,
    requested: "visual review and counsel review", buildStatus: "state_built",
    counselQuestionsRaised: [
      "The packet marks question 2 of 200-00130 as 'I was not convicted' on the reasoning that a non-conviction sealing family determines that answer. Confirm that is right for all three of this family's routes.",
      "The process-guidance page tells the participant to ask the clerk whether the record has already been sealed without a filing, and states no timetable or criterion for it because the forms establish none. Confirm that is the right treatment for the no-filing route, or supply the criterion."
    ],
    approvedForLive: false, live: false, commercialRoutesOpened: 0
  }, null, 2)}\n`);
}

/* ---- the one exported entry point ---------------------------------------- */
export async function runFamilyById(familyId, argv = process.argv.slice(2)) {
  const config = FAMILY_CONFIGS[familyId];
  assert.ok(config, `unknown family ${familyId}`);
  const checkOnly = argv.includes("--check");
  const skipRaster = argv.includes("--no-raster");
  const { resolved, failures } = resolveSources(familyId);
  if (failures.length > 0) {
    return { familyId, status: "STOPPED", stopClass: "BLOCKED_SOURCE", failedSourceIdentities: failures,
      why: "a source did not bind by exact SHA-256, so nothing may be rendered from it", overlayDirectoryTouched: false };
  }
  const outDir = `${OVERLAY_ROOT}/${familyId.replace(/_/g, "-")}--official-pdf-fill`;
  const censuses = [];
  for (const source of resolved) censuses.push({ source, census: await censusOf(source) });

  if (process.env.PA_DUMP_DRIFT) {
    for (const c of censuses) {
      for (const u of c.census.unmapped) console.log(`UNMAPPED ${c.source.formNumber} ${u.key} (${u.field}) p${u.page} y=${u.rect.y}`);
      for (const k of c.census.missingKeys) console.log(`POLICY KEY MATCHED NO WIDGET ${c.source.formNumber}: ${k}`);
      for (const u of c.census.uncaptioned) console.log(`NO CAPTION ${c.source.formNumber} ${u.key} p${u.page}`);
    }
    process.exit(0);
  }
  const unmapped = censuses.flatMap((c) => c.census.unmapped.map((u) => ({ form: c.source.formNumber, ...u })));
  const missing = censuses.flatMap((c) => c.census.missingKeys.map((k) => `${c.source.formNumber}:${k}`));
  const uncaptioned = censuses.flatMap((c) => c.census.uncaptioned.map((u) => `${c.source.formNumber}:${u.key}`));
  assert.equal(unmapped.length, 0, `${unmapped.length} widget(s) carry no policy: ${JSON.stringify(unmapped.slice(0, 6), null, 2)}`);
  assert.equal(missing.length, 0, `${missing.length} policy key(s) match no widget: ${JSON.stringify(missing.slice(0, 10))}`);
  assert.equal(uncaptioned.length, 0, `${uncaptioned.length} widget(s) have no printed line to read a caption from: ${JSON.stringify(uncaptioned)}`);

  if (checkOnly) {
    return {
      familyId, status: "CHECK_ONLY",
      documents: censuses.map((c) => {
        const by = (p) => c.census.rows.filter((r) => r.policy === p).length;
        return { formNumber: c.source.formNumber, sha256: c.source.sha256, widgets: c.census.rows.length, write: by("write"), supply: by("supply"), protect: by("protect"), election: by("election") };
      })
    };
  }

  for (const sub of ["fixtures", "reports", "raster"]) fs.mkdirSync(path.join(ROOT, outDir, sub), { recursive: true });
  const maps = []; const artifacts = []; const writeProofs = []; const rasterPages = [];

  for (const fixtureName of ["canonical", "boundary"]) {
    const facts = FIXTURES[fixtureName];
    const packet = await PDFDocument.create();
    const pageManifest = []; const documents = [];
    for (const { source, census } of censuses) {
      const { bytes: filled, report } = await renderDocument(source, census, fixtureName);
      const selections = census.rows.filter((r) => r.policy === "select")
        .map((r) => ({ key: r.key, page: r.page, rect: r.rect, routeReason: r.routeReason }));
      const { bytes, marks } = await markRouteSelections(filled, selections);
      const single = `${outDir}/fixtures/${fixtureName}--${source.formNumber}.pdf`;
      fs.writeFileSync(path.join(ROOT, single), bytes);
      const proof = await byteProof(source, census, path.join(ROOT, single), report, fixtureName);
      // Every mark this packet claims must be readable in the bytes, inside its
      // own measured box, and nothing may have landed outside one.
      const added = marks.length > 0 ? await addedPaintedPaths(filled, bytes) : [];
      const markProof = marks.map((m) => ({ ...m, paintedStrokesInsideTheBox: added.filter((row) => row.page === m.page && pathInsideBox(row, m.box)).length }));
      const strayMarkStrokes = added.filter((row) => !marks.some((m) => m.page === row.page && pathInsideBox(row, m.box))).length;
      for (const m of markProof) {
        assert.ok(m.paintedStrokesInsideTheBox >= 2, `route selection ${m.key} claims a mark and the output bytes carry ${m.paintedStrokesInsideTheBox} painted stroke(s) inside its box`);
      }
      assert.equal(strayMarkStrokes, 0, `${strayMarkStrokes} route-selection stroke(s) landed outside every measured box`);
      writeProofs.push({
        routeSelectionMarks: markProof, strayRouteSelectionStrokes: strayMarkStrokes,
        fixture: fixtureName, formNumber: source.formNumber, sourceSha256: source.sha256,
        proofMethod: "flattened widget appearances read back at every measured /Rect of the finalized bytes",
        valuesReportedByFinalizer: report.written.length,
        flattenedWidgetAppearancesReadFromOutputBytes: proof.appearances,
        addedGlyphsReadFromOutputBytes: proof.actualWrites.reduce((n, w) => n + w.drawnText.join("").length, 0),
        nonWhitespaceGlyphsOutsideMeasuredWriteBoxes: proof.outside,
        nonTextAppearancesNotCounted: proof.nonTextAppearances,
        actualWrites: proof.actualWrites
      });
      const doc = await PDFDocument.load(bytes, { ignoreEncryption: true });
      for (const [i, p] of (await packet.copyPages(doc, doc.getPageIndices())).entries()) {
        packet.addPage(p);
        pageManifest.push({ packetPage: packet.getPageCount(), component: FORMS[source.formNumber].component, documentId: source.formNumber, sourcePage: i + 1, sourceSha256: source.sha256 });
      }
      documents.push(FORMS[source.formNumber].component, source.formNumber);
      if (fixtureName === "canonical") maps.push(officialFieldMap(source, census, report, config, marks));
    }
    const instrBytes = await renderComposedPdf(composedBody(config, facts, resolved), "Process Guidance: Which of the Two Routes You Are In");
    const instrDoc = await PDFDocument.load(instrBytes, { ignoreEncryption: true });
    for (const [i, p] of (await packet.copyPages(instrDoc, instrDoc.getPageIndices())).entries()) {
      packet.addPage(p);
      pageManifest.push({ packetPage: packet.getPageCount(), component: "process_guidance", documentId: "process_guidance", sourcePage: i + 1, sourceSha256: null });
    }
    documents.push("process_guidance");
    if (fixtureName === "canonical") maps.push(composedMap(config));

    const packetBytes = Buffer.from(await packet.save({ useObjectStreams: false, updateMetadata: false }));
    const file = `${outDir}/fixtures/${fixtureName}.pdf`;
    fs.writeFileSync(path.join(ROOT, file), packetBytes);
    artifacts.push({
      fixture: fixtureName, file,
      sha256: crypto.createHash("sha256").update(packetBytes).digest("hex"),
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
          const f = path.join(stage, scrap); if (fs.existsSync(f)) fs.unlinkSync(f);
        }
        const png = path.join(stage, "page.png");
        rasterPages.push({
          fixture: fixtureName, page: i + 1,
          file: `${rasterDir}/page-${String(i + 1).padStart(2, "0")}/page.png`,
          component: pageManifest[i]?.component ?? null,
          pageWidthPt: render.pageWidth, pageHeightPt: render.pageHeight,
          pixelsPerPoint: Number(render.pxPerPt.toFixed(4)),
          calibrationResidualPx: render.calibrationResidualPx, paperBounds: render.paper,
          engine: "chromium_calibrated_scripts_lib_pdf_page_raster",
          sha256: crypto.createHash("sha256").update(fs.readFileSync(png)).digest("hex")
        });
      }
    }
  }

  const rbf = requiredBeforeFilingItems(maps);
  const instructions = instructionsMarkdown(config, resolved, rbf);
  const audit = builderCounters(maps, {
    artifacts: writeProofs.map((p) => ({
      fixture: p.fixture, valuesReportedByFinalizer: p.valuesReportedByFinalizer,
      addedGlyphsReadFromOutputBytes: p.addedGlyphsReadFromOutputBytes,
      flattenedWidgetAppearancesReadFromOutputBytes: p.flattenedWidgetAppearancesReadFromOutputBytes,
      nonWhitespaceGlyphsOutsideMeasuredWriteBoxes: p.nonWhitespaceGlyphsOutsideMeasuredWriteBoxes
    }))
  }, instructions);

  writeArtifacts({ familyId, config, outDir, resolved, maps, artifacts, writeProofs, rasterPages, rbf, instructions, audit, rasterSkipped: skipRaster });
  const allZero = PASS_COUNTERS.every((c) => audit.counters[c] === 0);
  return {
    familyId, status: allZero ? "COMPLETED" : "STOPPED",
    ...(allZero ? {} : { stopClass: "COMPLETENESS_COUNTER_NOT_ZERO", nonZeroCounters: PASS_COUNTERS.filter((c) => audit.counters[c] > 0), firstFindings: audit.findings.slice(0, 8) }),
    directory: outDir,
    officialForms: resolved.map((r) => ({ formNumber: r.formNumber, sha256: r.sha256 })),
    components: COMPONENTS,
    terminalFields: audit.terminalFields, written: audit.written,
    requiredBeforeFiling: rbf.length,
    counters: audit.counters, nineCountersZero: allZero,
    rasterPages: rasterPages.length,
    rasterState: skipRaster ? "BUILT_RASTER_PENDING" : "RENDERED_LOCALLY_PENDING_CENTRAL_ACCEPTANCE",
    artifactHashes: artifacts.map((a) => ({ fixture: a.fixture, packetSha256: a.sha256, pages: a.pageCount })),
    packetsSelfVerified: 0, commercialRoutesOpened: 0, productionTouched: false
  };
}

if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(thisFile)) {
  runFamilyById("pa_pardon_expungement-set")
    .then((r) => { console.log(JSON.stringify(r, null, 2)); })
    .catch((e) => { console.error(e); process.exit(1); });
}
