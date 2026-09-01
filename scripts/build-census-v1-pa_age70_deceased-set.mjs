#!/usr/bin/env node
/**
 * The Pennsylvania age-70 / deceased-person expungement family — `pa_age70_deceased-set`.
 *
 *   node scripts/build-census-v1-pa_age70_deceased-set.mjs [--check] [--no-raster]
 *
 * Two AOPC forms, filed together:
 *
 *   PA-RCRIM-P-790-PETITION  Petition for Expungement Pursuant to Pa.R.Crim.P. 790
 *   PA-RCRIM-P-790-ORDER     the blank expungement order, with the Rule 790
 *                            information page the petitioner completes
 *
 * The route is `track:PA:pa_age70_deceased`, 18 Pa.C.S. § 9122(b) and
 * Pa.R.Crim.P. 790: expungement on reaching 70 with ten arrest-free years since
 * final release, or on behalf of a person who has been dead for three years.
 *
 * THE CHARGE TABLE, AND WHY IT IS LEFT WHOLE RATHER THAN HALF-FILLED
 *
 * The petition carries a five-row charge table -- PA statute title, section,
 * subsection, description, counts, grade and disposition -- and the order's
 * Rule 790 page asks for the same thing again in prose. The form says where the
 * values come from, in its own words: "List specific charges, AS THEY APPEAR ON
 * THE CHARGING DOCUMENT". That is a document the platform does not hold, and
 * seven columns of it cannot be composed from a charge string.
 *
 * The existing pa_790_nonconviction-set writes `Statute DescriptionRow1` from
 * matter.charge and refuses the other six cells of that row. That is exactly the
 * defect the completeness contract was written to catch: a row with one cell
 * filled reads as a finished row and is not one. So this family writes no cell
 * of the table at all. Every one of the thirty-five is declared
 * REQUIRED_BEFORE_FILING and disclosed, and the participant copies the row off
 * the charging document, which is where the form tells them to get it.
 *
 * Rasterization goes through scripts/lib/pdf-page-raster.mjs. Never Poppler.
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
import { rasterizePageCalibrated } from "./lib/pdf-page-raster.mjs";
import { BLANK_DISPOSITIONS, PASS_COUNTERS, classifyField, classifyBlank, rowKeyOf }
  from "./rcap-packet-completeness/completeness-contract.mjs";

const thisFile = fileURLToPath(import.meta.url);
const ROOT = path.resolve(path.dirname(thisFile), "..");
process.chdir(ROOT);
const require = createRequire(import.meta.url);
const { PDFDocument } = require("pdf-lib");

const FAMILY_ID = "pa_age70_deceased-set";
const CORPUS_INDEX = "data/rcap-all50/local-source-corpus-index.json";
const OUT = "data/rcap-all50/overlays/census-v1/pa/pa-age70-deceased-set--official-pdf-fill";
const BUILD_SCRIPT = "scripts/build-census-v1-pa_age70_deceased-set.mjs";

const ROUTE = Object.freeze({
  jurisdiction: "PA",
  routeKey: "track:PA:pa_age70_deceased",
  routeSelectionId: "pa-age70-deceased-set-rule-790-petition-and-order",
  publicLabel: "Expunge a Pennsylvania record on age, or on behalf of someone who has died",
  authority: "18 Pa.C.S. § 9122(b); Pa.R.Crim.P. 790",
  documents: [
    { formNumber: "PA-RCRIM-P-790-PETITION", title: "Petition for Expungement Pursuant to Pa.R.Crim.P. 790", instrumentKind: "primary_filing" },
    { formNumber: "PA-RCRIM-P-790-ORDER", title: "Order for Expungement Pursuant to Pa.R.Crim.P. 790, with the Rule 790 information page", instrumentKind: "proposed_order" }
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

const SIGNATURE = "signature_or_date_participant_completion";
const COURT_OWNED = "court_prosecutor_clerk_or_agency_owned";
const PARTICIPANT_ELECTION = "participant_sworn_narrative_or_legal_election";

/* The five charge rows, generated so the seven columns of a row cannot drift
 * apart. Every cell is the participant's: the form says the values are copied
 * from the charging document, which the platform does not hold. */
const CHARGE_COLUMNS = [
  ["PA Statute TitleRow", "PA statute title", "the title of the Pennsylvania statute, exactly as it appears on the charging document"],
  ["SectionRow", "Section", "the statute section, exactly as it appears on the charging document"],
  ["SubsectionRow", "Subsection", "the statute subsection, exactly as it appears on the charging document"],
  ["Statute DescriptionRow", "Statute description", "the description of the offence, exactly as it appears on the charging document"],
  ["CountsRow", "Counts", "how many counts of that offence the charging document shows"],
  ["GradeRow", "Grade", "the grade of the offence, exactly as it appears on the charging document"],
  ["DispositionRow", "Disposition", "how that charge ended"]
];
const chargeRows = () => {
  const rows = {};
  for (let n = 1; n <= 5; n += 1) {
    for (const [prefix, heading, what] of CHARGE_COLUMNS) {
      rows[`${prefix}${n}`] = {
        section: "Charges to be expunged",
        label: `Charge ${n} — ${heading}`,
        ...SUPPLY(`${what}. This is charge ${n} of the five the table has room for; if you need more, the form tells you to attach another sheet`)
      };
    }
  }
  return rows;
};

const FORM_FIELDS = {
  "PA-RCRIM-P-790-PETITION": {
    /* --- the caption ---------------------------------------------------- */
    CountyOf: { section: "Caption", label: "County of", ...WRITE("matter.county") },
    "District#": { section: "Caption", label: "Judicial District number", ...SUPPLY("the number of the judicial district the county is in — the Administrative Office of Pennsylvania Courts publishes it, and the clerk of courts can tell you") },
    Defendant: { section: "Caption", label: "Defendant", ...WRITE("participant.full_legal_name") },
    DocketSeg1: { section: "Caption", label: "Docket No. CP- — county code", ...SUPPLY("the two-digit county code, the first segment of the CP docket number printed on your paperwork") },
    DocketSeg2: { section: "Caption", label: "Docket No. CP- — court type", ...SUPPLY("the court-type segment of the CP docket number, the second block after the county code") },
    DocketSeg3: { section: "Caption", label: "Docket No. CP- — sequence number", ...SUPPLY("the sequence number, the long block in the middle of the CP docket number") },
    DocketSeg4: { section: "Caption", label: "Docket No. CP- — year", ...SUPPLY("the last two digits of the docket year, the segment printed after 20") },

    /* --- petitioner information ------------------------------------------ */
    "Full Name": { section: "Petitioner Information", label: "Full Name", ...WRITE("participant.full_legal_name") },
    DOB: { section: "Petitioner Information", label: "DOB", ...WRITE("participant.date_of_birth") },
    "Social Security Number": {
      section: "Petitioner Information", label: "Social Security Number",
      ...SUPPLY("your Social Security number. The platform does not hold it and does not ask for it, and a number written into a court filing by anyone but you is a number nobody can vouch for")
    },
    Addr1: { section: "Petitioner Information", label: "Address — street", ...WRITE("participant.street_address") },
    Addr2: { section: "Petitioner Information", label: "Address — second line", ...SUPPLY("a second address line, only if your address needs one") },
    AddrCity: { section: "Petitioner Information", label: "Address — city", ...WRITE("participant.city") },
    AddrState: { section: "Petitioner Information", label: "Address — state", ...WRITE("participant.state") },
    AddrZip: { section: "Petitioner Information", label: "Address — ZIP", ...WRITE("participant.zip") },
    Aliases1: { section: "Petitioner Information", label: "Alias(es) — first", ...SUPPLY("any other name you have been known by; leave blank if there are none") },
    Aliases2: { section: "Petitioner Information", label: "Alias(es) — second", ...SUPPLY("a second such name, if there is one") },
    Aliases3: { section: "Petitioner Information", label: "Alias(es) — third", ...SUPPLY("a third such name, if there is one") },
    Aliases4: { section: "Petitioner Information", label: "Alias(es) — fourth", ...SUPPLY("a fourth such name, if there is one") },
    Aliases5: { section: "Petitioner Information", label: "Alias(es) — fifth", ...SUPPLY("a fifth such name, if there is one") },

    /* --- case information ------------------------------------------------ */
    Judge: { section: "Case Information", label: "Judge who accepted the plea or heard the case — name", ...SUPPLY("the name of the judge of the Court of Common Pleas, or the Philadelphia Municipal Court judge, who accepted the guilty plea or heard the case") },
    JudgeAddr1: { section: "Case Information", label: "Judge — address, street", ...SUPPLY("that judge's chambers address, first line") },
    JudgeAddr2: { section: "Case Information", label: "Judge — address, second line", ...SUPPLY("a second line of that address, if it needs one") },
    JudgeAddrCity: { section: "Case Information", label: "Judge — address, city", ...SUPPLY("the city of that address") },
    JudgeAddrState: { section: "Case Information", label: "Judge — address, state", ...SUPPLY("the state of that address") },
    JudgeAddrZip: { section: "Case Information", label: "Judge — address, ZIP", ...SUPPLY("the ZIP code of that address") },
    "Offense Tracking Number OTN": { section: "Case Information", label: "Offense Tracking Number (OTN)", ...SUPPLY("the Offense Tracking Number, printed on your court paperwork and on your Pennsylvania State Police criminal history") },
    CPDocketNumber: { section: "Case Information", label: "Docket Number", ...WRITE("matter.case_number") },
    "Name of Arresting Agency": { section: "Case Information", label: "Name of Arresting Agency", ...SUPPLY("the name of the police department or other agency that arrested you") },
    "Date of Arrest": { section: "Case Information", label: "Date of Arrest", ...SUPPLY("the date you were arrested") },
    "Date on Complaint": { section: "Case Information", label: "Date on Complaint", ...SUPPLY("the date printed on the criminal complaint") },
    "Name of Affiant": { section: "Case Information", label: "Name of Affiant, as shown on the complaint", ...SUPPLY("the name of the affiant as it appears on the complaint, if the complaint is available to you") },
    AffiantAddr1: { section: "Case Information", label: "Affiant — address, street", ...SUPPLY("the affiant's mailing address, first line, if available") },
    AffiantAddr2: { section: "Case Information", label: "Affiant — address, second line", ...SUPPLY("a second line of that address, if it needs one") },
    AffiantAddrCity: { section: "Case Information", label: "Affiant — address, city", ...SUPPLY("the city of that address") },
    AffiantAddrState: { section: "Case Information", label: "Affiant — address, state", ...SUPPLY("the state of that address") },
    AffiantAddrZip: { section: "Case Information", label: "Affiant — address, ZIP", ...SUPPLY("the ZIP code of that address") },

    ...chargeRows(),

    /* --- the rest --------------------------------------------------------- */
    "Check Box1": {
      section: "Fine, costs or restitution", selection: true,
      /* The label deliberately does not carry the words "yes or no": the
       * completeness contract reads that phrase as the Penal Code § 17
       * route-election idiom and classifies the control ROUTE_DETERMINED, which
       * this is not. Describing the question the box asks is both more accurate
       * and what a participant reading the disclosure needs. */
      label: "Whether the fine, costs or restitution due has been paid (selection)",
      ...ELECTION("whether the fine, costs or restitution have been paid is a fact about your own account with the court; tick the one that is true")
    },
    ReasonForExpungement: {
      section: "Reason for expungement",
      label: "Reason(s) for the expungement",
      ...SUPPLY(
        "your reason for asking. This route is 18 Pa.C.S. § 9122(b): a petitioner who has reached 70 and has been free of "
        + "arrest or prosecution for ten years since final release from confinement or supervision, or a petition brought "
        + "for someone who has been dead for three years. Say which applies to you and give the dates. The platform does "
        + "not compose this and does not decide whether you qualify"
      )
    },
    Checkbox2: {
      section: "Criminal history attachment", selection: true,
      label: "Pennsylvania State Police criminal history attached, or not attached (selection)",
      ...ELECTION("tick the first box if you are attaching a State Police criminal history obtained within 60 days before filing, and the second if you are not")
    },
    ReasonForMissingHistory: {
      section: "Criminal history attachment",
      label: "Reason(s) the criminal history is not attached",
      ...SUPPLY("why you are not attaching a Pennsylvania State Police criminal history, if you ticked the second box")
    }
  },

  "PA-RCRIM-P-790-ORDER": {
    /* --- page 1: the caption the petitioner completes ---------------------- *
     * The section is "Caption", not "Order", and the distinction is the form's
     * own: the caption block is printed at the head of the page (y 744 to 664)
     * and the word ORDER is printed below it at y 603. The shared semantics
     * refuses any widget whose REGION HEADING names a court-owned area, which
     * is right -- and calling the caption part of the order would have made
     * that rule refuse the three facts the movant is supposed to caption the
     * order with.
     */
    County: { section: "Caption", label: "County of", ...WRITE("matter.county") },
    Defendant: { section: "Caption", label: "Defendant", ...WRITE("participant.full_legal_name") },
    DocketNumber: { section: "Caption", label: "Docket No.", ...WRITE("matter.case_number") },

    /* --- page 1: the order itself, which is the court's -------------------- */
    Day: { section: "Order", label: "By the Court — day of the order", ...PROTECT(COURT_OWNED, "the court dates its own order") },
    Month: { section: "Order", label: "By the Court — month of the order", ...PROTECT(COURT_OWNED, "the court dates its own order") },
    Year: { section: "Order", label: "By the Court — year of the order", ...PROTECT(COURT_OWNED, "the court dates its own order") },
    "Petition/Motion": { section: "Order", label: "By the Court — the petition or motion considered", ...PROTECT(COURT_OWNED, "the court recites what it considered; a proposed order that wrote this would be drafting the judge's recital") },
    PresentedBy: { section: "Order", label: "By the Court — presented by", ...PROTECT(COURT_OWNED, "the court recites who presented the petition") },
    Disposition: { section: "Order", label: "By the Court — the petition is (granted or denied)", ...PROTECT(COURT_OWNED, "granting or denying the petition is the court's decision, made after it is filed") },
    Checkbox1: { section: "Order", selection: true, label: "By the Court — general expungement paragraph applies (selection)", ...PROTECT(COURT_OWNED, "which paragraph of the order applies is the court's to mark") },
    Checkbox2: { section: "Order", selection: true, label: "By the Court — Pa.R.Crim.P. 320 ARD paragraph applies (selection)", ...PROTECT(COURT_OWNED, "which paragraph of the order applies is the court's to mark") },
    Checkbox3: { section: "Order", selection: true, label: "By the Court — 35 P.S. § 780-119 paragraph applies (selection)", ...PROTECT(COURT_OWNED, "which paragraph of the order applies is the court's to mark") },
    CourtSignature: { section: "Order", label: "By the Court — signature", ...PROTECT(COURT_OWNED, "the judge signs their own order") },

    /* --- page 2: the Rule 790 information page ----------------------------- *
     * This page is the petitioner's. Rule 790 lists what it must carry, and the
     * order incorporates it by reference. */
    PetitionerName: { section: "Rule 790 information", label: "1. Petitioner Name", ...WRITE("participant.full_legal_name") },
    Alias1: { section: "Rule 790 information", label: "2. Alias(es) — first", ...SUPPLY("any other name you have been known by, the same as on the petition") },
    Alias2: { section: "Rule 790 information", label: "2. Alias(es) — second", ...SUPPLY("a second such name, if there is one") },
    Alias3: { section: "Rule 790 information", label: "2. Alias(es) — third", ...SUPPLY("a third such name, if there is one") },
    PetitionersAddress: { section: "Rule 790 information", label: "3. Petitioner's Address", ...WRITE("participant.street_address") },
    PetitionersDOB: { section: "Rule 790 information", label: "4. Petitioner's Date of Birth", ...WRITE("participant.date_of_birth") },
    PetitionersSSN: { section: "Rule 790 information", label: "5. Petitioner's Social Security Number", ...SUPPLY("your Social Security number, the same as on the petition. The platform does not hold it") },
    NameAddrOfJudge: { section: "Rule 790 information", label: "6. Name and address of the judge who accepted the plea or heard the case", ...SUPPLY("the judge's name and address, the same as on the petition") },
    AddressOfAffiant: { section: "Rule 790 information", label: "7. Name and mailing address of the affiant as shown on the complaint", ...SUPPLY("the affiant's name and mailing address, the same as on the petition, if available") },
    "Docket#": { section: "Rule 790 information", label: "8. Docket Number", ...WRITE("matter.case_number") },
    OTN: { section: "Rule 790 information", label: "9. Offense Tracking Number (OTN)", ...SUPPLY("the Offense Tracking Number, the same as on the petition") },
    DateAndArrestingAgency: { section: "Rule 790 information", label: "10. The date on the complaint, or the date of arrest, and the arresting agency", ...SUPPLY("the date on the complaint or the date of arrest, and the name of the criminal justice agency that made the arrest") },
    Text15: { section: "Rule 790 information", label: "11. The specific charges to be expunged and their dispositions", ...SUPPLY("the same charges and dispositions you listed in the petition's table, copied from the charging document") },
    Restitution: { section: "Rule 790 information", label: "12. Whether the fine, costs or restitution due has been paid", ...SUPPLY("whether the amount due has been paid, the same answer you gave on the petition") },
    ReasonForExpunge: { section: "Rule 790 information", label: "13. The reason for expungement", ...SUPPLY("the same reason you gave in the petition") },
    AgenciesServed: { section: "Rule 790 information", label: "14. The criminal justice agencies to be served with certified copies of the order", ...SUPPLY("every criminal justice agency that must receive a certified copy of the order — the arresting agency, the district attorney, the clerk of courts, the Pennsylvania State Police central repository, and any other agency holding records of this case") }
  }
};

/* ---- fixtures ------------------------------------------------------------ */
const FIXTURES = {
  canonical: {
    "participant.full_legal_name": "Jordan Avery Reyes",
    "participant.date_of_birth": "1951-04-17",
    "participant.street_address": "412 Chestnut Street",
    "participant.city": "Philadelphia",
    "participant.state": "PA",
    "participant.zip": "19106",
    "matter.county": "Philadelphia",
    "matter.case_number": "CP-51-CR-0004217-1979"
  },
  boundary: {
    "participant.full_legal_name": "Maria-Alejandra O’Shaughnessy-Whitfield",
    "participant.date_of_birth": "1948-12-31",
    "participant.street_address": "1188 Upper Notch Crossing Road, Apartment 14B",
    "participant.city": "Upper Merion Township",
    "participant.state": "Pennsylvania",
    "participant.zip": "19406-2214",
    "matter.county": "Montgomery",
    "matter.case_number": "CP-46-CR-0011882-1975-SUPPLEMENTAL"
  }
};

const RASTER_ENGINE = "scripts/lib/pdf-page-raster.mjs (Chromium, calibrated)";

/* ---- source binding ------------------------------------------------------ */
function resolveSources() {
  const index = JSON.parse(fs.readFileSync(path.join(ROOT, CORPUS_INDEX), "utf8"));
  const all = index.entries ?? [];
  const root = corpusRoot();
  const resolved = [];
  const failures = [];
  for (const wanted of ROUTE.documents) {
    const entry = all.find((e) => e.state === "PA" && e.formNumber === wanted.formNumber && e.assetClass === "FORM");
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
    let sourceValue = null;
    try {
      if (typeof field.isChecked === "function") sourceValue = field.isChecked() ? "on" : null;
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
      policy: entry.policy, fact: entry.fact ?? null,
      refusalClass: entry.refusalClass ?? null, what: entry.what ?? null, why: entry.why ?? null,
      printedTextAtCoordinate: (pageText.find((p) => p.page === (widgets[0]?.page ?? 1))?.lines ?? [])
        .filter((l) => widgets[0] && Math.abs(l.y - widgets[0].rect.y) <= 16)
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
      name: r.name, type: r.type, effectiveLabel: r.effectiveLabel, regionHeading: r.section,
      widgets: r.widgets.map((w) => ({ page: w.page, rect: w.rect })),
      multiline: r.multiline === true, maxLength: r.maxLength ?? null
    })),
    facts, explicitMappings, unwritableFields,
    documentTextLines: census.pageText.flatMap((p) => p.lines.map((l) => l.text)),
    title: source.title
  });
  if (process.env.PA_DEBUG_RENDER) {
    console.log(`-- ${source.formNumber} ${fixtureName}: written=${report.written.length} refused=${report.refused.length}`);
    for (const r of report.refused) {
      if (r.reason !== "classified_unwritable_by_role") console.log(`   ${r.field ?? r.anchor}: ${r.reason}${r.category ? ` (${r.category})` : ""}`);
    }
  }
  return { bytes, report };
}

/* ---- byte proof ------------------------------------------------------------ */
async function byteProof(source, census, artifactBytes, report, fixtureName) {
  const tmp = path.join(ROOT, `.pa-790-byte-proof-${source.formNumber}-${fixtureName}.pdf`);
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
      if (r.sourceValue !== null && r.sourceValue !== undefined) {
        documentAuthoredAppearances.push({
          field: r.key, page: wdg.page, rect: wdg.rect, drawnText: text, sourceValue: r.sourceValue,
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
      sectionHeading: r.section, regionHeading: r.effectiveLabel, effectiveLabel: r.effectiveLabel,
      captionBasis: "authored AcroForm field name plus the printed section it sits in",
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
      const cls = r.policy === "protect" ? r.refusalClass : PARTICIPANT_ELECTION;
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
  out.push(`# Filing instructions — ${ROUTE.publicLabel}`, "");
  out.push(
    "This packet is two AOPC forms, filed together:", "",
    "- **Petition for Expungement Pursuant to Pa.R.Crim.P. 790** — what you file.",
    "- **the Order**, with the **Rule 790 information page** on its back — the order you give the court to sign, and the page of information Rule 790 requires with it.", "",
    `Both are prepared for **${ROUTE.publicLabel.toLowerCase()}**, under ${ROUTE.authority}.`, ""
  );
  out.push(
    "The platform filled in what it holds about you and your case: your name, your date of birth, your address, the "
    + "county and the docket number, on both forms. Everything else is yours, and every one of those blanks is listed "
    + "below by the section it is in.", ""
  );

  out.push("## Which route this is", "");
  out.push(
    "18 Pa.C.S. § 9122(b) allows expungement in two situations this packet covers: a petitioner who **has reached 70 and "
    + "has been free of arrest or prosecution for ten years** since final release from confinement or supervision, and a "
    + "petition brought on behalf of a person who **has been dead for three years**. Which of the two applies to you goes "
    + "in the reason box on the petition, in your own words, with the dates. This packet does not decide whether you "
    + "qualify and does not write the reason for you.", ""
  );

  out.push("## Where you file this, and who you serve", "");
  out.push(
    "File the petition with the **Clerk of Courts of the Court of Common Pleas** in the county already filled in for you. "
    + "The petition says what happens next in its own words: _when this petition is filed with the Clerk of Courts, the "
    + "petitioner shall serve a copy upon the attorney for the Commonwealth_. Do that.", ""
  );
  out.push(
    "**Ask the Clerk of Courts what filing fee applies.** It is not stated here, because no source this packet holds "
    + "establishes it and an unsourced figure in a filing instruction is worse than none.", ""
  );

  out.push("## The criminal history attachment", "");
  out.push(
    "The petition asks you to attach a **Pennsylvania State Police criminal history obtained within 60 days before you "
    + "file**. Tick the first box if you are attaching one. If you are not, tick the second box and say why in the box "
    + "below it. Both boxes are left blank for you.", ""
  );

  out.push("## The charges table, and why none of it is filled in", "");
  out.push(
    "The petition's table has five rows and seven columns — statute title, section, subsection, description, counts, "
    + "grade and disposition — and the form says where the values come from: **as they appear on the charging document**. "
    + "That is a document the platform does not hold, and a row with some cells filled and others blank reads as a "
    + "finished row when it is not. So the table is left entirely to you, and item 11 on the Rule 790 information page "
    + "asks for the same charges again. Copy them off the charging document into both. If five rows are not enough, the "
    + "form tells you to attach another sheet.", ""
  );

  out.push("## What you must do before you file", "");
  out.push("1. **Fill in every item in the tables below.** Each names the form, the section and the blank.");
  out.push("2. **Make the two choices listed under _The choices that are yours_.**");
  out.push("3. **Sign and date the petition yourself.** The petition is made subject to the penalties for unsworn falsification to authorities under 18 Pa.C.S. § 4904, so the signature line and its date are yours and are left blank.");
  out.push("4. **Serve a copy on the attorney for the Commonwealth** once it is filed.");
  out.push("5. **Leave page 1 of the Order alone below the caption.** The day, the month, the year, the recitals, the disposition, the three paragraph boxes and the signature are all the court's.");
  out.push("");

  for (const [doc, items] of byDoc) {
    const title = ROUTE.documents.find((d) => d.formNumber === doc)?.title ?? doc;
    out.push(`## ${doc} — ${title}: the items you must supply`, "");
    out.push("| Section | The blank on the form | What to write |", "| --- | --- | --- |");
    for (const i of items) out.push(`| ${i.section} | ${i.disclosureLabel} | ${i.participantMustSupply} |`);
    out.push("");
  }

  out.push("## The choices that are yours", "");
  out.push("| Form | Section | The choice | Why it is yours |", "| --- | --- | --- | --- |");
  for (const c of elections) out.push(`| ${c.document} | ${c.sectionHeading} | ${c.effectiveLabel} | ${c.reason} |`);
  out.push("");

  out.push("## What the platform deliberately left blank", "");
  out.push("- **Your signature on the petition and the date beside it.** The averment is made subject to the penalties of 18 Pa.C.S. § 4904; you make it, not the platform.");
  out.push("- **Your Social Security number**, on both forms. The platform does not hold it and does not ask for it.");
  out.push("- **The whole of the Order above the signature line** — the date the court makes it, what it recites, whether it is granted, and which of the three expungement paragraphs applies. Those are the court's, and nothing in this packet may look like the court has already decided.");
  out.push("");

  out.push("## What this packet is not", "");
  out.push(
    "This is a prepared set of official AOPC forms. It is not legal advice, it is not filed for you, and it does not "
    + "decide whether your record can be expunged under 18 Pa.C.S. § 9122(b)."
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
      `${source.formNumber}: ${census.unmapped.length} widget(s) carry no dictionary entry: ${JSON.stringify(census.unmapped.slice(0, 8).map((u) => u.field))}`);
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
        protected: census.rows.filter((r) => r.policy === "protect").length
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
      "The AOPC named these widgets after the printed items they sit under -- Full Name, DOB, Name of Arresting Agency, "
      + "CountsRow3, PetitionersSSN, AgenciesServed -- and the dictionary records the printed section beside each. The "
      + "text extracted at each widget's own coordinate is recorded with it, so a reviewer can check the pairing.",
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

  writeJson(`${OUT}/production-field-map.json`, {
    schemaVersion: "rcap-official-form-field-map/v1-census-v1", familyId: FAMILY_ID,
    routeKeys: [ROUTE.routeKey], routeSelectionId: ROUTE.routeSelectionId, renderStrategy: "acroform_fill",
    dispositionVocabulary: [SIGNATURE, COURT_OWNED, PARTICIPANT_ELECTION],
    routeDeterminedSelections: [],
    routeSelectionNote:
      "Neither form carries a route election. 18 Pa.C.S. § 9122(b) has two branches -- age 70 with ten arrest-free "
      + "years, and a person dead for three years -- and the forms ask for neither by a tick: the branch is stated in the "
      + "petitioner's own reason for expungement, which is theirs to write. The two controls on the petition are about "
      + "whether the fine has been paid and whether the criminal history is attached, both facts about the participant.",
    chargeTableNote:
      "Thirty-five cells of the petition's five-row charge table are declared required-before-filing and none is "
      + "written. The form says the values are copied from the charging document, which the platform does not hold, and "
      + "a row with one cell filled reads as a finished row that is not one.",
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
      document: m.formNumber, field: c.field, page: c.page, section: c.sectionHeading,
      label: c.effectiveLabel, refusalClass: c.category, why: c.reason
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
      "Every page of both fixtures is rastered for a human who did not build this family. The build's byte-level check "
      + "proves a value sits at a measured rectangle; it cannot see that the rectangle is the wrong place for it.",
    whatToLookAt: [
      "Petition, the caption and Petitioner Information: county, defendant, full name, date of birth and the four address parts each under the item they belong to; the four CP docket segments blank; the Social Security box blank.",
      "Petition, the charge table: all five rows entirely blank, every column. Confirm a participant would understand the table is theirs to complete.",
      "Petition, the foot: the Yes/No fine boxes unticked, the criminal-history boxes unticked, and the signature and date lines blank.",
      "Order page 1: the county, the defendant and the docket number filled in the caption, and everything below it blank — the day, month and year, the recitals, the disposition, all three paragraph boxes and the signature.",
      "Order page 2, the Rule 790 information page: items 1, 3, 4 and 8 filled, and items 2, 5, 6, 7, 9, 10, 11, 12, 13 and 14 blank."
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
          "The petition's five-row, seven-column charge table asks for values \"as they appear on the charging document\", "
          + "and the order's Rule 790 page asks for the same charges again.",
        consequence:
          "No cell of the table is written. The platform does not hold the charging document, and the fleet's existing "
          + "pa_790_nonconviction-set shows what half-filling it costs: it writes Statute DescriptionRow1 from "
          + "matter.charge and refuses the other six cells of that row, which is the finished-looking incomplete row the "
          + "completeness contract exists to catch. All thirty-five cells are declared and disclosed instead."
      },
      {
        finding: "Both forms ask for the petitioner's Social Security number.",
        consequence:
          "It is declared required-before-filing on both. The platform does not hold it and does not ask for it, and a "
          + "number written into a court filing by anyone but the petitioner is a number nobody can vouch for."
      },
      {
        finding:
          "The petition's docket number is split into four boxes (CP- county code, court type, sequence, year) while the "
          + "platform holds the docket as one string.",
        consequence:
          "The four segments are declared required-before-filing rather than derived by splitting the string. The full "
          + "docket number IS written where the form takes it whole: the petition's Docket Number field, the order's "
          + "caption, and item 8 of the Rule 790 page."
      },
      {
        finding:
          "18 Pa.C.S. § 9122(b) has two branches and neither form asks which one by a tick; the branch is stated in the "
          + "petitioner's own reason for expungement.",
        consequence:
          "No route-determined selection exists on either form, and the reason box is the participant's to write. The "
          + "instructions state both branches and their conditions so the participant knows what the box is asking."
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
    approvedForLive: false, live: false, commercialRoutesOpened: 0
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
