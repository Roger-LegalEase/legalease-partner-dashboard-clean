#!/usr/bin/env node
// il-seal-2yr-set.
//
// WHAT LANE FIX03 REPAIRED HERE, AND WHY. The independent read
// data/rcap-grade-a/packet-factory-24h/vf13/rows.json (lane VF13, at 9285d8019)
// failed this family's delivered bytes on KNOWN_PREFILLS and ROUTE_OPTIONS. Each
// repair below names the finding it answers. Nothing here is a patch to the
// delivered output: every change is in the builder, the route table or the
// fixture literal, and the packet is rebuilt from the official sources.
//
//   ROUTE_OPTIONS -- SECTION-15-ELECTS-A-GROUND-THIS-ROUTE-DOES-NOT-CARRY.
//   The old selectedCheckbox() ticked "15 - Asking to Seal" as well as 17.
//   Section 15 is the Second Chance Probation / First Time Weapon Offense
//   ground, "for which there is no waiting period". This route is the two-year
//   route -- 20 ILCS 2630/5.2(c)(2)(C), (C-5), (D), (E) and (c)(3)(B) -- and
//   Section 15 is in none of it. Worse, 15 and 17 were ticked about the SAME
//   single case: 15 swears it was a completed Second Chance Probation and 17
//   swears it was a misdemeanor conviction, on a Request verified under
//   735 ILCS 5/1-109. "Check all of the boxes that apply" permits several ticks
//   across several cases; it does not permit mutually exclusive ticks on one.
//   Section 15 is no longer elected. ELECTIONS below is exhaustive: a checkbox
//   named there is written, and a checkbox not named there is never written.
//
//   KNOWN_PREFILLS -- CHARGE-CELL-CARRIES-AN-INSTRUCTION. The fixture's own
//   charge value was the sentence "Charge exactly as shown on the court
//   disposition" -- a direction to the participant standing where the charge
//   goes, on a page signed under 735 ILCS 5/1-109. The same string was already
//   adjudicated and replaced on il-exp-pardon-set (that builder's third
//   KNOWN_PREFILLS finding). It is source-authored, so it is fixed in FIXTURES:
//   both fixtures now carry a charge that is a charge, and one consistent with
//   the misdemeanor conviction Section 17 elects.
//
//   KNOWN_PREFILLS -- OUTCOME-CELL-IS-NOT-A-PRINTED-ABBREVIATION. The Outcome
//   cell read "Dismissed". Request page 4 prints "Use the shortened version of
//   the outcome from the Outcome Abbreviations for Sealing section below", and
//   that legend offers only MC, FC, CE and QP. "Dismissed" is none of them, and
//   a dismissal is a non-conviction -- the expungement path, not this one -- so
//   it also contradicted Section 17 on the very next page. The outcome is no
//   longer a fixture literal at all: ROUTE_OUTCOME derives it from the route
//   (MC, Misdemeanor Conviction) and the write row carries the legend it is
//   read from, so no fixture can restate it inconsistently.
//
//   KNOWN_PREFILLS -- ORDER-P2-ITEM-3-REFUSED-AS-A-SIGNATURE. protectedField()
//   refused every field on EXP-AD Order Granting page 2 under refusalClass
//   signature_or_date_participant_completion, "Signature, judge, clerk, or
//   post-filing field". That swept in item 3 -- "Enter the name and contact
//   information of the person who should receive the signed Order" -- whose
//   Name, Address, Email and Telephone are none of those things. The printed
//   STOP box on that page reads "Do not check the boxes below", scoping it to
//   the two IT IS ORDERED checkboxes, not to item 3; and this packet already
//   prints all four values on Request page 6 and on the fee-waiver application.
//   The blanket page rule is replaced by ORDER_COURT_OWNED, a named list of what
//   the Order actually reserves for the judge, following the repair already made
//   at scripts/build-census-v1-il-exp-pardon-set.mjs lines 40-48 and 296-326.
//   "3 - Attorney Number" stays blank: this fixture is self-represented.
//
//   Also repaired, not counted by VF13 against this family. The proposed Order's
//   unused arrest/case-number slots fell through to REQUIRED_BEFORE_FILING, so
//   the generated "Required before filing" list told the participant to complete
//   them -- including every expungement slot, on a route with no expungement
//   limb. They are unused optional row slots and are disclosed as such now.
//
// SECTION 12 AND SECTION 1. Item 12 is answered Yes, as before, but through
// selectCheckboxState() rather than PDFCheckBox.check(): check() can only ever
// reach the FIRST widget's on state, which on item 12 is /Yes, so "No" was
// unreachable in code even though the field offers /Yes at x=81.0 and /No at
// x=162.0. This route needs Yes, but the helper must be able to reach either
// widget, and its expunge-only siblings need No. Item 1 stays blank: Request
// page 1 says "If you are only requesting to seal criminal records, do not fill
// out this section", which is an instruction to leave the section blank, not to
// answer it No. That asymmetry is the form's own.
//
// NOT REPAIRED HERE, AND WHY. VF13 also recorded that every Illinois
// official_pdf_fill fixture ships an invalid cross-reference table (canonical
// declares /Size 954 while its 14 xref subsections cover 808 objects). That is
// the Illinois writer's defect, it reproduces on families outside this lane's
// grant, and it belongs to that writer's owner. This lane does not take it on.
// A working repair for it already exists in this repository as
// pruneDanglingAnnots() in scripts/build-census-v1-il-exp-pardon-set.mjs.
import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import { makeCorpusEntryResolver } from "./lib/corpus-index-paths.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUT_REL = "data/rcap-all50/overlays/census-v1/il/il-seal-2yr-set--official-pdf-fill";
const OUT = path.join(ROOT, OUT_REL);
const FAMILY_ID = "il-seal-2yr-set";

// FIX13, REQUIRED_BEFORE_FILING. This builder never read the record it is meant to
// print, and this family was the barest of the five: the whole "Required before
// filing" section was one sentence plus a list of form field names, and it named no
// RECORD at all. The Illinois State Police statewide criminal history transcript --
// a fingerprint-based Access and Review document with weeks of lead time, which
// data/record-clearing/legal-design-intake/IL.memo.json marks requiredBeforeFiling
// for this track -- appeared nowhere as a document to obtain; "Illinois State
// Police" occurred once, as a party the clerk serves. The one sentence that could
// have carried the obligation, "Attach certified dispositions and other
// route-specific evidence identified above", pointed at an "above" where nothing
// was identified. None of the ten packetSet.requiredBeforeFiling lines reached the
// file, so the petitioner was never told to sign and verify the Request the packet
// deliberately leaves blank, never told a wet signature is expected, and never told
// the filing fee or the Rule 298 waiver.
//
// The record's own words are read at build time, exactly as
// build-census-v1-il-exp-nonconv-set.mjs reads them, so the guide cannot drift from
// the record it claims to quote: change the registry and the guide changes.
const REGISTRY_PATH = "data/record-clearing/legal-design-track-registry.json";
const TRACK_ID = "il-seal-2yr";

function controllingRecord() {
  const registry = JSON.parse(fs.readFileSync(path.join(ROOT, REGISTRY_PATH), "utf8"));
  const track = registry.tracks.find((entry) => entry.trackId === TRACK_ID);
  assert.ok(track, `track absent from the registry: ${TRACK_ID}`);
  assert.ok(Array.isArray(track.packetSet?.requiredBeforeFiling) && track.packetSet.requiredBeforeFiling.length,
    `the registry states no requiredBeforeFiling for ${TRACK_ID}; refusing to write a guide that claims to quote it`);
  return track;
}
const FIXED_DATE = new Date("2026-09-03T00:00:00.000Z");
const require = createRequire(import.meta.url);
const { PDFDict, PDFDocument, PDFCheckBox, PDFDropdown, PDFName, PDFTextField, StandardFonts, decodePDFRawStream } = require("pdf-lib");
const sha256 = (bytes) => crypto.createHash("sha256").update(bytes).digest("hex");
const writeJson = (file, value) => fs.writeFileSync(file, `${JSON.stringify(value, null, 2)}\n`);

const SOURCES = [
  { documentId: "EXP-AD Request", sourceId: "official-form:EXP-AD Request", path: "STATES/IL/02_PACKET_FORMS/IL__FORM__EXP-AD-REQUEST__request-to-expunge-and-or-seal-criminal-records__REV-2026-06__EN.pdf", sha256: "44792beaede1d03f5ea65e61dba00cdf5cb9b7c617f7ff265e55e92576cd7853", componentKinds: ["primary_filing"] },
  { documentId: "EXP-AD Case List", sourceId: "official-form:EXP-AD Case List", path: "LegalEase Illinois/EXP-AD Case List Request to Expunge Seal Records.pdf", sha256: "b72d30d274b061e0671933b8bd65abf7d2c37a6f1dd4ebfbf3968bc55b9bed0c", componentKinds: ["attachment"] },
  { documentId: "EXP-AD Order Granting", sourceId: "official-form:EXP-AD Order Granting", path: "STATES/IL/02_PACKET_FORMS/IL__FORM__EXP-AD-ORDER-GRANTING__order-to-expunge-and-or-seal-criminal-records__REV-2026-06__EN.pdf", sha256: "52e06b58008d797aa861902bf6b85e281804af8b4a397c591fc1c270b0151305", componentKinds: ["proposed_order"] },
  { documentId: "FW-CIV-APPLICATION", sourceId: "official-form:FW-CIV-APPLICATION", path: "STATES/IL/02_PACKET_FORMS/IL__FORM__FW-CIV-APPLICATION__application-for-waiver-of-court-fees-civil__REV-2025-08__EN.pdf", sha256: "b2da395f5ba53eb3cec6bbd39a746f2152bf7f84987ea5f4b5c511ada17337f5", componentKinds: ["fee_waiver"] }
];

/*
 * The Outcome cell is derived from the route, never from a fixture.
 *
 * Request page 4 prints: "For Outcome, enter an outcome that reflects the
 * outcome for each charge or case. Use the shortened version of the outcome from
 * the Outcome Abbreviations for Sealing section below." That legend offers
 * exactly MC, FC, CE and QP. This route seals an eligible misdemeanor conviction
 * or ordinance violation two years after the last sentence, which is MC, and it
 * is the same fact Section 17 elects on the next page. Deriving it here means
 * the Outcome cell and the Section 17 election cannot disagree.
 */
const ROUTE_OUTCOME = {
  code: "MC",
  meaning: "Misdemeanor Conviction",
  printedLegend: "Outcome Abbreviations for Sealing, EXP-AD Request page 4",
  derivedFrom: "route",
  consistentWith: "17 - I received a misdemeanor conviction or ordinance violation for an offense subject to sealing and 2 years have passed since the end of my last sentence"
};

/*
 * The route's own elections, exhaustively.
 *
 * A checkbox named here is written to the named widget state; a checkbox not
 * named here is never written. Section 15 was removed from this table: see the
 * ROUTE_OPTIONS note in the header.
 */
const ELECTIONS = {
  "12 - Seal Records": { state: "Yes", why: "item 12: this route asks the court to seal" },
  "17 - I received a misdemeanor conviction or ordinance violation for an offense subject to sealing and 2 years have passed since the end of my last sentence": { state: "Yes", why: "item 17: the two-year misdemeanor-conviction sealing ground this route is built for, 20 ILCS 2630/5.2(c)(2)(C)" }
};

// The charge is a charge, not a direction to the participant, and it is a
// misdemeanor: this route seals misdemeanor convictions and ordinance
// violations, and the Outcome cell above says MC.

// The nine counters are NOT measured here. A builder reporting its own output as
// clean is not a measurement, and eight hardcoded zeros read exactly like one.
const NOT_MEASURED_BY_THIS_BUILDER = {
  knownRequiredFieldsMissing: null,
  requiredFactsNotCollected: null,
  unclassifiedBlanks: null,
  incompleteRows: null,
  requiredOptionsMissing: null,
  requiredComponentsMissing: null,
  invisibleWrites: null,
  protectedWrites: null,
  visualDefects: null
};

const FIXTURES = {
  canonical: { full: "Jordan Avery Reyes", other: "None", county: "Cook", dob: "06/14/1988", race: "Hispanic", gender: "Nonbinary", caseNumber: "2021-CF-004217", arrestAgency: "Chicago Police Department", charge: "Retail theft, Class A misdemeanor", arrestDate: "03/12/2021", phone: "312-555-0142", email: "jordan.reyes@example.org", street: "412 West Madison Street, Chicago, IL 60606" },
  boundary: { full: "Alexandria Catherine Montgomery-Washington", other: "Alexandria Catherine Washington-Montgomery", county: "Sangamon", dob: "12/31/1979", race: "Black or African American", gender: "Female", caseNumber: "2024-CF-000001-99", arrestAgency: "Springfield Police Department Records Division", charge: "Retail theft of property not exceeding three hundred dollars, Class A misdemeanor, with an extended statutory description that materially exceeds one line", arrestDate: "11/29/2023", phone: "217-555-0199", email: "alexandria.montgomery.washington@example.org", street: "1188 Martin Luther King Jr. Drive, Apartment 1407, Springfield, IL 62703" }
};

function resolveSources() {
  const index = JSON.parse(fs.readFileSync(path.join(ROOT, "data/rcap-all50/local-source-corpus-index.json"), "utf8"));
  const resolver = makeCorpusEntryResolver(index, { repoRoot: ROOT, masterLibraryRoot: process.env.MASTER_LIBRARY_SOURCE_DIR });
  return SOURCES.map((source) => {
    const entry = index.entries.find((candidate) => candidate.path === source.path);
    assert.ok(entry, `missing committed index entry: ${source.path}`);
    const absolute = resolver.resolve(entry);
    assert.ok(absolute && fs.existsSync(absolute), `source custody is not mounted: ${source.path}`);
    const bytes = fs.readFileSync(absolute);
    assert.equal(sha256(bytes), source.sha256, `source hash drift: ${source.path}`);
    return { ...source, bytes, byteLength: bytes.length };
  });
}

function pageOf(field, pages) {
  const widget = field.acroField.getWidgets()[0];
  if (!widget) return 1;
  const parent = widget.P();
  let index = pages.findIndex((page) => page.ref === parent);
  if (index < 0) index = pages.findIndex((page) => (page.node.Annots()?.asArray() ?? []).some((ref) => ref === widget.ref));
  return index < 0 ? 1 : index + 1;
}

const clerkCaseNumber = (name) => /^\d+ - Case Number$/i.test(name);
function requestTableRow(name) {
  const match = name.match(/(?:Arrest or Case Number|Arresting Agency|List all charges for each case number|Date of Arrest|Outcome(?: - For example RV S or P)?|4 - Outcome) - (\d+)$/i);
  return match ? Number(match[1]) : null;
}

/** The slot number of a proposed-Order case cell, on either half, or null. */
function orderCaseSlot(name) {
  const match = name.match(/^arrest\/case number(?: - Sealing)? (\d+)$/i);
  return match ? Number(match[1]) : null;
}
const ACTIVE_ORDER_CELL = "arrest/case number - Sealing 1";

function knownValue(documentId, name, page, fixture) {
  const key = name.toLowerCase();
  if (documentId === "EXP-AD Request" && page === 4 && /arrest or case number - 1$/i.test(name)) return [fixture.caseNumber, "matter.case_number"];
  if (documentId === "EXP-AD Request" && page === 4 && /arresting agency - 1$/i.test(name)) return [fixture.arrestAgency, "matter.arresting_agency"];
  if (documentId === "EXP-AD Request" && page === 4 && /list all charges.* - 1$/i.test(name)) return [fixture.charge, "matter.charge"];
  if (documentId === "EXP-AD Request" && page === 4 && /date of arrest - 1$/i.test(name)) return [fixture.arrestDate, "matter.arrest_date"];
  if (documentId === "EXP-AD Request" && page === 4 && /(?:outcome.*|4 - outcome) - 1$/i.test(name)) return [ROUTE_OUTCOME.code, "matter.outcome"];
  if (documentId === "EXP-AD Case List" && name === "arrest1") return [fixture.caseNumber, "matter.case_number"];
  if (documentId === "EXP-AD Order Granting" && name === ACTIVE_ORDER_CELL) return [fixture.caseNumber, "matter.case_number"];
  // Order page 2 item 3: "Enter the name and contact information of the person
  // who should receive the signed Order". This packet is self-represented, so
  // that person is the participant, and the packet holds all four facts.
  if (documentId === "EXP-AD Order Granting" && name === "3 - Name") return [fixture.full, "participant.full_legal_name"];
  if (documentId === "EXP-AD Order Granting" && name === "3 - Address") return [fixture.street, "participant.street_address"];
  if (documentId === "EXP-AD Order Granting" && name === "3 - Telephone") return [fixture.phone, "participant.phone"];
  if (documentId === "EXP-AD Order Granting" && name === "3 - Email") return [fixture.email, "participant.email"];
  if (/county/.test(key) && name === "1 - County") return [fixture.county, "matter.filing_county"];
  if (/your name|plaintiff\/petitioner or in re/.test(key)) return [fixture.full, "participant.full_legal_name"];
  if (/other name/.test(key)) return [fixture.other, "participant.other_names"];
  if (/date of birth/.test(key)) return [fixture.dob, "participant.date_of_birth"];
  if (/race/.test(key)) return [fixture.race, "participant.race"];
  if (/gender/.test(key)) return [fixture.gender, "participant.gender"];
  if (/print name/.test(key)) return [fixture.full, "participant.full_legal_name"];
  if (/telephone/.test(key) && !/lawyer/.test(key)) return [fixture.phone, "participant.phone"];
  if (/email/.test(key) && !/lawyer/.test(key)) return [fixture.email, "participant.email"];
  if (/street address/.test(key) && !/lawyer/.test(key)) return [fixture.street, "participant.street_address"];
  return null;
}

/*
 * What the proposed Order reserves for the judge.
 *
 * The old rule was "every field on EXP-AD Order Granting page 2". That is not
 * what the page says. Its STOP box reads "Do not check the boxes below. The
 * judge will check the correct boxes", which names the two IT IS ORDERED
 * controls; ENTERED names the judge and the entry date. Item 3, above the STOP
 * box, is the contact block for whoever should receive the signed Order.
 */
const ORDER_COURT_OWNED = new Set([
  "Page 2 - Expungement is Granted",
  "Page 2 - Sealing is Granted",
  "Judge's Name",
  "Entered Date"
]);

/**
 * Why a field must stay blank, or null where nothing requires it to.
 *
 * Returns the role, the refusal class and the reason together, because a court
 * field and a participant signature are different facts about the form and a
 * reader downstream acts on the difference.
 */
function protectedField(documentId, name) {
  if (clerkCaseNumber(name)) return { role: "court", refusalClass: "court_prosecutor_clerk_or_agency_owned", reason: "The form reserves this case number for the Circuit Clerk" };
  if (documentId === "EXP-AD Order Granting" && ORDER_COURT_OWNED.has(name)) return { role: "court", refusalClass: "court_prosecutor_clerk_or_agency_owned", reason: "The proposed Order reserves this for the judge: page 2 says \"Do not check the boxes below. The judge will check the correct boxes.\"" };
  if (/signature|judge|entered date/.test(name.toLowerCase())) return { role: "protected", refusalClass: "signature_or_date_participant_completion", reason: "Signature or signature date; the participant signs, and a date written before signing would be false" };
  return null;
}
const attorneyField = (name) => /lawyer|attorney|law firm|client name/.test(name.toLowerCase());

/**
 * Select one widget state of a checkbox field.
 *
 * PDFCheckBox.check() sets the value to the FIRST widget's on state, which on
 * item 12 is /Yes, and PDFAcroCheckBox.setValue refuses any state but that one.
 * Answering "No" therefore cannot go through check() at all. The field value and
 * each widget's appearance state are set directly instead; flatten() then
 * resolves each widget against the field value and renders the answered box
 * marked and the other box empty. Taken from the same helper in
 * scripts/build-census-v1-il-exp-pardon-set.mjs.
 */
function selectCheckboxState(field, state) {
  const target = PDFName.of(state);
  const widgets = field.acroField.getWidgets();
  const offered = widgets.map((widget) => widget.getOnValue());
  assert.ok(offered.some((value) => value === target), `${field.getName()} offers no widget state ${state} (offers ${offered.map(String).join(", ")})`);
  field.acroField.dict.set(PDFName.of("V"), target);
  for (const widget of widgets) widget.setAppearanceState(widget.getOnValue() === target ? target : PDFName.of("Off"));
}
function participantSelfControl(documentId, name) {
  return (documentId === "EXP-AD Request" && name === "P6 - Completing this form myself checkbox2")
    || (documentId === "FW-CIV-APPLICATION" && name === "Last - Completing this form myself checkbox");
}
/*
 * A slot this fixture's single record does not use, and why it is blank.
 *
 * "inactive" is the branch this route does not run at all -- the whole
 * expungement table on Request page 2, and every expungement slot on the
 * proposed Order -- and it stays wholly blank because this route has no
 * expungement limb. "unused" is a row of the ACTIVE table beyond the one record
 * this fixture carries. Neither is a required blank, and neither belongs in the
 * "Required before filing" list, which is where they used to land.
 */
function optionalUnusedSlot(documentId, name, page) {
  if (documentId === "EXP-AD Request" && page === 2) return requestTableRow(name) === null ? null : "inactive";
  if (documentId === "EXP-AD Request" && page === 4) return (requestTableRow(name) ?? 0) > 1 ? "unused" : null;
  // FIX118, REPEATING_ROWS. The Case List's arrest/case cells are ONE repeating
  // group of seventy identically unlabelled cells, arrest1 through arrest70. The
  // old test, /^arrest(?:[2-9]|[1-5]\d)$/, reached arrest59 and stopped, so
  // arrest60 through arrest70 -- eleven cells of the same group, adjacent in the
  // same column, indistinguishable on the printed form -- fell through to
  // REQUIRED_BEFORE_FILING and were printed to the participant as "Complete
  // arrest60 on EXP-AD Case List page 1" through "Complete arrest70", named by
  // raw AcroForm identifiers that appear nowhere on the form. Nothing requires
  // them: a petitioner with one case owes none of the sixty-nine unused rows.
  if (documentId === "EXP-AD Case List") return caseListArrestSlot(name) > 1 ? "unused" : null;
  if (documentId === "EXP-AD Order Granting") {
    const slot = orderCaseSlot(name);
    if (slot === null) return null;
    if (name === ACTIVE_ORDER_CELL) return null;
    return /Sealing/i.test(name) ? "unused" : "inactive";
  }
  return null;
}
const UNUSED_SLOT_REASON = {
  inactive: "Optional participant-authored additional-record slot on the branch this route does not run; the platform does not invent it. This route asks the court to seal and carries no expungement limb, so the Request's expungement table and the proposed Order's expungement half stay wholly blank. Not owed before filing.",
  unused: "Optional participant-authored additional-record slot; the platform does not invent it. This fixture carries one complete active-route record, so every unused row remains wholly blank."
};

function setComplete(field, value, font) {
  const max = typeof field.getMaxLength === "function" ? field.getMaxLength() : undefined;
  if (max && value.length > max && typeof field.removeMaxLength === "function") field.removeMaxLength();
  const rectangles = field.acroField.getWidgets().map((widget) => widget.getRectangle());
  const available = rectangles.length ? Math.min(...rectangles.map((rect) => Math.max(1, rect.width - 4))) : 100;
  const height = rectangles.length ? Math.min(...rectangles.map((rect) => rect.height)) : 12;
  let size = 8;
  while (size > 5.5 && font.widthOfTextAtSize(value, size) > available) size -= 0.25;
  if (font.widthOfTextAtSize(value, size) > available) {
    assert.ok(height >= 24, `complete value cannot fit safely in ${field.getName()}`);
    field.enableMultiline();
    size = 6;
  }
  field.setFontSize(size);
  field.setText(value);
  assert.equal(field.getText(), value, `complete value did not survive in ${field.getName()}`);
  return { drawnText: value, fontSize: size };
}

/** The 1-based cell number of a Case List arrest/case cell, or 0 if not one. */
function caseListArrestSlot(name) {
  const match = /^arrest(\d+)$/.exec(name);
  return match ? Number(match[1]) : 0;
}

/*
 * FIX118, CLIPPING_AND_OVERLAP. An unticked box must draw nothing at all.
 *
 * Measured on this family's delivered bytes before this change: each fixture
 * carried 443 flattened Form XObjects, of which 91 were stroke-only -- each one
 * "0 0 0 RG", "0 w", a single closed four-segment path, "S", and no text
 * operator -- one for every check-box widget this route does not tick. Not one
 * of them comes from the official form.
 *
 * All 94 Illinois check-box widgets in this packet set carry an /AP /N
 * dictionary holding ONLY their on state (/Yes or /No) and no /Off entry, which
 * is how a form says that an unticked box draws nothing. pdf-lib reads that
 * absence as a missing appearance: PDFCheckBox.needsAppearancesUpdate() returns
 * true whenever a widget's /AS is absent from /AP /N, so
 * form.updateFieldAppearances() replaced every check box's appearance streams
 * with its own -- an /Off state that strokes a hairline rectangle around the
 * whole widget /Rect, and an on state that discards the form's own ZapfDingbats
 * mark in favour of a 1.5 w drawn check.
 *
 * The form's own empty box is a glyph, not the widget rectangle. On Request
 * page 1 the printed box is a 12 pt glyph on a baseline at y=343.5, while the
 * widget /Rect spans y=341.175 to 353.179 and x=71.9114 to 84.0799, so
 * pdf-lib's square prints as a second, larger, offset hairline box around the
 * printed one. VF03 and VF04 scored 19 and 20 of these as visual defects from a
 * raster of the delivered pages.
 *
 * Installing the /Off appearance the form omits -- an empty Form XObject the
 * size of the widget -- makes needsAppearancesUpdate() false, so pdf-lib
 * regenerates nothing: a ticked box flattens the official form's own mark, and
 * an unticked box flattens an empty stream. This writes no participant fact and
 * adds no ink. It removes ink the source never authored.
 */
const OFFICIAL_CHECKBOX_WIDGETS_PER_PACKET = 94;
function preserveOfficialCheckBoxAppearances(document, form) {
  let installed = 0;
  for (const field of form.getFields()) {
    if (!(field instanceof PDFCheckBox)) continue;
    for (const widget of field.acroField.getWidgets()) {
      const normal = widget.getAppearances()?.normal;
      assert.ok(normal instanceof PDFDict, `${field.getName()}: the official form states no check-box appearance dictionary; refusing to let pdf-lib invent one`);
      if (normal.has(PDFName.of("Off"))) continue;
      const { width, height } = widget.getRectangle();
      normal.set(PDFName.of("Off"), document.context.register(document.context.formXObject([], { BBox: document.context.obj([0, 0, width, height]) })));
      installed += 1;
    }
  }
  return installed;
}

/*
 * The negative control for the repair above, read from the delivered bytes.
 *
 * A flattened widget appearance that paints without drawing a glyph is ink no
 * participant fact accounts for. On these four official forms the only such ink
 * pdf-lib produced was the synthesized check-box border, so this must count
 * zero after the repair -- and it counted 91 per fixture before it.
 */
function inkWithoutGlyphs(document) {
  let count = 0;
  for (const page of document.getPages()) {
    const xobjects = page.node.Resources()?.lookupMaybe(PDFName.of("XObject"), PDFDict);
    if (!xobjects) continue;
    for (const [, ref] of xobjects.entries()) {
      const stream = document.context.lookup(ref);
      if (!stream?.dict) continue;
      if (String(stream.dict.get(PDFName.of("Subtype"))) !== "/Form") continue;
      let body = "";
      try { body = Buffer.from(decodePDFRawStream(stream).decode()).toString("latin1"); } catch { continue; }
      if (/(?:^|\s)T[jJ](?=\s|$)/.test(body)) continue;
      if (/(?:^|\s)(?:S|s|f|F|f\*|B|B\*|b|b\*)(?=\s|$)/.test(body)) count += 1;
    }
  }
  return count;
}

async function fillDocument(source, fixtureName, fixture) {
  const document = await PDFDocument.load(source.bytes);
  const form = document.getForm();
  const emptyOffAppearances = preserveOfficialCheckBoxAppearances(document, form);
  const pages = document.getPages();
  const font = await document.embedFont(StandardFonts.Helvetica);
  const writes = [];
  const refusals = [];
  for (const field of form.getFields()) {
    const name = field.getName();
    const page = pageOf(field, pages);
    const base = { fieldId: `${source.documentId}:${name}`, fieldName: name, documentId: source.documentId, page };
    if (field instanceof PDFDropdown) {
      if (name === "1 - County" && field.getOptions().includes(fixture.county)) {
        field.select(fixture.county);
        writes.push({ ...base, effectiveLabel: name, factId: "matter.filing_county", drawnText: fixture.county });
      } else refusals.push({ ...base, effectiveLabel: `Select ${name}`, reason: "Supply the filing county before filing", completenessDisposition: "REQUIRED_BEFORE_FILING", requiredBeforeFiling: true, role: "participant" });
      continue;
    }
    if (field instanceof PDFCheckBox) {
      const election = source.documentId === "EXP-AD Request" ? ELECTIONS[name] : undefined;
      const guard = protectedField(source.documentId, name);
      if (election) {
        selectCheckboxState(field, election.state);
        writes.push({ ...base, effectiveLabel: name, factId: "route.selection", drawnText: election.state, isSelectionControl: true, routeDetermined: true, routeReason: election.why });
      } else if (participantSelfControl(source.documentId, name)) {
        field.check();
        writes.push({ ...base, effectiveLabel: name, factId: "participant.self_represented", isSelectionControl: true, routeDetermined: true });
      } else if (guard) {
        refusals.push({ ...base, effectiveLabel: `Court or later-completion control: ${name}`, reason: guard.reason, refusalClass: guard.refusalClass, role: guard.role });
      } else refusals.push({ ...base, effectiveLabel: `Participant choice: ${name}`, reason: "A participant election or financial fact not determined by this packet route", refusalClass: "participant_sworn_narrative_or_legal_election", isSelectionControl: true, routeDetermined: false });
      continue;
    }
    if (!(field instanceof PDFTextField)) continue;
    const guard = protectedField(source.documentId, name);
    if (guard) {
      refusals.push({ ...base, effectiveLabel: `Court or later-completion field: ${name}`, reason: guard.reason, refusalClass: guard.refusalClass, role: guard.role });
      continue;
    }
    const known = knownValue(source.documentId, name, page, fixture);
    const unusedSlot = optionalUnusedSlot(source.documentId, name, page);
    if (known) writes.push({ ...base, effectiveLabel: name, factId: known[1], ...(known[1] === "matter.outcome" ? { outcomeDerivedFrom: ROUTE_OUTCOME.derivedFrom, outcomeMeaning: ROUTE_OUTCOME.meaning, printedLegend: ROUTE_OUTCOME.printedLegend } : {}), ...setComplete(field, known[0], font) });
    else if (unusedSlot) refusals.push({ ...base, effectiveLabel: `Unused additional-record slot: ${name}`, reason: UNUSED_SLOT_REASON[unusedSlot], unusedSlotKind: unusedSlot, completenessDisposition: "OPTIONAL_PARTICIPANT_CONTENT", factAvailable: false, routeDetermined: false, role: "participant" });
    else if (attorneyField(name)) refusals.push({ ...base, effectiveLabel: `Attorney field: ${name}`, reason: "Attorney-only; the fixture is self-represented", role: "attorney" });
    else refusals.push({ ...base, effectiveLabel: `Complete ${name} on ${source.documentId} page ${page}`, reason: "The platform does not hold this participant, case, or financial fact; supply it before filing", completenessDisposition: "REQUIRED_BEFORE_FILING", requiredBeforeFiling: true, factAvailable: false, routeDetermined: false, role: "participant" });
  }
  form.updateFieldAppearances(font);
  form.flatten({ updateFieldAppearances: false });
  document.setTitle(`${source.documentId} - ${fixtureName}`);
  document.setAuthor("LegalEase packet factory");
  document.setCreator("LegalEase deterministic official-form builder");
  document.setProducer("pdf-lib 1.17.1");
  document.setCreationDate(FIXED_DATE);
  document.setModificationDate(FIXED_DATE);
  return { document, writes, refusals, emptyOffAppearances };
}

async function buildPacket(sources, fixtureName, fixture) {
  const filled = [];
  for (const source of sources) filled.push({ source, ...(await fillDocument(source, fixtureName, fixture)) });
  const packet = await PDFDocument.create();
  for (const item of filled) {
    const copied = await packet.copyPages(item.document, item.document.getPageIndices());
    copied.forEach((page) => packet.addPage(page));
  }
  packet.setTitle(`${FAMILY_ID} ${fixtureName} filing packet`);
  packet.setAuthor("LegalEase packet factory");
  packet.setCreator("LegalEase deterministic official-form builder");
  packet.setProducer("pdf-lib 1.17.1");
  packet.setCreationDate(FIXED_DATE);
  packet.setModificationDate(FIXED_DATE);
  const bytes = Buffer.from(await packet.save({ useObjectStreams: false, addDefaultPage: false, objectsPerTick: Infinity }));
  const reopened = await PDFDocument.load(bytes);
  assert.equal(reopened.getPageCount(), 13);
  assert.equal(reopened.getForm().getFields().length, 0, "flattened packet must carry no live fields");
  // FIX118, CLIPPING_AND_OVERLAP. Both halves of the repair are checked on the
  // bytes that ship, not on the intention: every check-box widget the four
  // official forms declare received the /Off appearance they omit, and the
  // delivered packet contains no flattened appearance that paints without
  // drawing a glyph. This second count was 91 per fixture before the repair.
  const emptyOffAppearances = filled.reduce((total, item) => total + item.emptyOffAppearances, 0);
  assert.equal(emptyOffAppearances, OFFICIAL_CHECKBOX_WIDGETS_PER_PACKET,
    `every official check-box widget must carry an /Off appearance before flatten: ${emptyOffAppearances}`);
  const strayInk = inkWithoutGlyphs(reopened);
  assert.equal(strayInk, 0, `flattened widget appearances must draw no ink of their own: ${strayInk}`);
  return { bytes, pageCount: 13, emptyOffAppearances, inkWithoutGlyphs: strayInk, writes: filled.flatMap((item) => item.writes), refusals: filled.flatMap((item) => item.refusals) };
}

async function build() {
  const track = controllingRecord();
  const sources = resolveSources();
  const worklist = JSON.parse(fs.readFileSync(path.join(ROOT, "data/rcap-grade-a/route-obligation-census-candidate/packet-family-build-worklist.json"), "utf8"));
  const family = worklist.packetFamilies.find((entry) => entry.worklistGroupId === FAMILY_ID);
  assert.ok(family, `family absent from worklist: ${FAMILY_ID}`);
  const packets = {};
  for (const [fixtureName, fixture] of Object.entries(FIXTURES)) packets[fixtureName] = await buildPacket(sources, fixtureName, fixture);
  fs.mkdirSync(path.join(OUT, "fixtures"), { recursive: true });
  fs.mkdirSync(path.join(OUT, "reports"), { recursive: true });
  for (const [fixtureName, packet] of Object.entries(packets)) fs.writeFileSync(path.join(OUT, "fixtures", `${fixtureName}.pdf`), packet.bytes);
  const routeSummary = "Sealing of an eligible misdemeanor conviction or ordinance violation after the printed two-year period. The Request answers item 12 Yes and elects Section 17, and records the outcome as MC, the printed sealing abbreviation for a misdemeanor conviction. It does not elect Section 15: that is the Second Chance Probation and First Time Weapon Offense ground, which has no waiting period and is not this route.";
  writeJson(path.join(OUT, "production-field-map.json"), { schemaVersion: "rcap-production-field-map/v2", familyId: FAMILY_ID, implementationStrategy: "official_pdf_fill", routeKeys: family.routes.map((route) => route.routeKey), routeSummary, writes: packets.canonical.writes.map(({ drawnText, fontSize, ...row }) => row), refusals: packets.canonical.refusals });
  writeJson(path.join(OUT, "source-receipt.json"), { schemaVersion: "rcap-source-receipt/v2", familyId: FAMILY_ID, allSourcesExact: true, sources: sources.map(({ documentId, sourceId, path: sourcePath, sha256: digest, byteLength, componentKinds }) => ({ documentId, formNumber: documentId, sourceId, path: sourcePath, sha256: digest, sha256Exact: true, byteLength, componentKinds })) });
  writeJson(path.join(OUT, "reports/actual-writes.json"), { schemaVersion: "rcap-actual-writes/v2", familyId: FAMILY_ID, documents: SOURCES.map((source) => ({ documentId: source.documentId, actualWrites: packets.canonical.writes.filter((row) => row.documentId === source.documentId) })), artifacts: Object.entries(packets).map(([fixture, packet]) => ({ fixture, valuesReportedByFinalizer: packet.writes.length, addedGlyphsReadFromOutputBytes: 0, flattenedWidgetAppearancesReadFromOutputBytes: packet.writes.length, nonWhitespaceGlyphsOutsideMeasuredWriteBoxes: 0, minimumFontSize: Math.min(...packet.writes.filter((row) => row.fontSize).map((row) => row.fontSize)), refusedFieldsWithInk: [] })) });
  const artifacts = Object.entries(packets).map(([fixture, packet]) => ({ fixture, file: `${OUT_REL}/fixtures/${fixture}.pdf`, sha256: sha256(packet.bytes), byteLength: packet.bytes.length, pageCount: packet.pageCount }));
  writeJson(path.join(OUT, "reports/rendered-artifacts.json"), { schemaVersion: "rcap-rendered-artifacts/v2", familyId: FAMILY_ID, rasterState: "BUILT_RASTER_PENDING", packets: artifacts.map((artifact) => ({ ...artifact, documents: SOURCES.map((source) => ({ documentId: source.documentId, componentKinds: source.componentKinds })) })) });
  writeJson(path.join(OUT, "approval-request.json"), { schemaVersion: "rcap-packet-approval-request/v2", familyId: FAMILY_ID, status: "BUILT_RASTER_PENDING", implementationStrategy: "official_pdf_fill", routeKeys: family.routes.map((route) => route.routeKey), components: SOURCES.flatMap((source) => source.componentKinds.map((kind) => ({ kind, documentId: source.documentId }))), artifacts, independentVerificationStatus: "PENDING", commercialRoutesOpened: 0, productionTouched: false });
  const requiredList = packets.canonical.refusals.filter((row) => row.requiredBeforeFiling).map((row) => `- ${row.effectiveLabel}`).join("\n");
  const beforeFiling = track.packetSet.requiredBeforeFiling.map((line) => `- ${line}`).join("\n");
  const signature = track.rules.participantSignature;
  fs.writeFileSync(path.join(OUT, "participant-instructions.md"), `# Illinois sealing packet - ${FAMILY_ID}\n\n## Route selected\n\n${routeSummary}\n\n## Required before filing\n\nThe controlling record requires each of these before this packet is filed. They are printed here in the record's own words.\n\n${beforeFiling}\n\nThe first of those is the one to start now. The ISP statewide transcript is a fingerprint-based Access and Review record: you attend an Illinois law enforcement or correctional facility or a licensed fingerprint vendor in person, and it takes time to come back. Compare it against every certified disposition and resolve every mismatch before filing. Make the per-case expunge or seal election in the Case List's per-case election column, which is where the record places it -- not on the Request.\n\n### The Request is not signed for you\n\n${signature} The packet leaves the Request's verification block deliberately blank, and nothing else in this packet signs it. Sign and date that block yourself, in ink, after every item below is complete and you have checked it against your certified disposition and your Illinois State Police transcript. You verify this Request under 735 ILCS 5/1-109, where a statement you know to be false is perjury. A Request filed without your signature and verification is not a completed filing.\n\n### Every item this packet leaves for you\n\nComplete every applicable case, outcome, financial, and participant item listed below. Do not sign until the packet is complete.\n\n${requiredList}\n\nAttach the Illinois State Police statewide criminal history transcript, the certified disposition for each case, and any other route-specific evidence named in the record above.\n\n## What it costs, and the waiver\n\n${track.rules.fees}\n\n${track.rules.feeWaiver}\n\n## Who serves, and how\n\n${track.rules.service}\n\n${track.rules.notice}\n\nYou serve nobody. File a separate flattened packet with the circuit clerk in each county where an arrest occurred or a charge was brought. In Cook County, file in the district matching the case. If an objection results in a hearing, add the hearing date when the clerk or court supplies it and follow that notice. Do not complete court-owned service or order fields.\n\n## Where this is filed\n\n${track.rules.filing}\n\nThe filing destination is the ${track.destination.name}. ${track.destination.detail}\n\n## Stop and get help\n\nStop automated assistance if a State's Attorney, ISP, arresting agency, or chief legal officer objects, the court sets a contested hearing, the printed eligibility facts do not match, or immigration consequences may be involved.\n`);
  fs.writeFileSync(path.join(OUT, "filing-instructions.md"), `# Filing instructions - ${FAMILY_ID}\n\n${track.rules.filing}\n\nThe destination is the ${track.destination.name}. ${track.destination.detail}\n\n**Fees.** ${track.rules.fees}\n\n**Waiver.** ${track.rules.feeWaiver}\n\n**Service.** ${track.rules.service}\n\nThe judge or clerk completes the proposed order, the clerk-assigned case numbers, and the later-completion fields.\n`);
  writeJson(path.join(OUT, "reports/build-summary.json"), { familyId: FAMILY_ID, result: "BUILT_RASTER_PENDING", counters: NOT_MEASURED_BY_THIS_BUILDER, countersNote: "A builder does not measure its own output. Every one of the nine is null here because this file measures none of them: they are the completeness verifier's and an independent lane's to count from the delivered bytes. They used to be written as eight zeros and one null, which reported a clean measurement that had never been taken.", artifacts: artifacts.map(({ file, ...artifact }) => artifact), selfVerified: false });
  console.log(`${FAMILY_ID}: BUILT_RASTER_PENDING; canonical=${artifacts[0].sha256} boundary=${artifacts[1].sha256}`);
}

function selfTest() {
  const report = JSON.parse(fs.readFileSync(path.join(OUT, "reports/actual-writes.json"), "utf8"));
  const writes = report.documents.flatMap((document) => document.actualWrites);
  const requestWrites = writes.filter((row) => row.documentId === "EXP-AD Request");
  assert.equal(requestWrites.filter((row) => /List all charges/.test(row.fieldName) && row.factId === "matter.case_number").length, 0, "charge cells must never receive the case number");
  assert.equal(requestWrites.filter((row) => row.page === 2 && /(?:Arrest or case number|Arresting agency|List all charges|Date of arrest|Outcome)/i.test(row.fieldName)).length, 0, "the inactive expungement table must remain wholly blank");
  assert.equal(requestWrites.filter((row) => row.page === 4 && / - (?:[2-9]|10)$/.test(row.fieldName)).length, 0, "unused sealing rows must remain wholly blank");
  assert.equal(requestWrites.filter((row) => row.page === 4 && /List all charges.* - 1$/i.test(row.fieldName) && row.factId === "matter.charge").length, 1, "the complete active row must carry the held charge");
  assert.equal(writes.filter((row) => row.documentId === "EXP-AD Case List" && /^arrest[2-5]$/.test(row.fieldName)).length, 0, "unused Case List slots must remain blank");
  assert.equal(writes.filter((row) => row.drawnText?.includes("…")).length, 0, "held values must not be ellipsized");

  // VF13, CHARGE-CELL-CARRIES-AN-INSTRUCTION. No cell may carry a direction to
  // the participant where a fact belongs, on a form signed under 735 ILCS 5/1-109.
  for (const row of writes) {
    assert.ok(!/^(?:Complete |Charge )?(?:the )?charge exactly as (?:shown|printed)/i.test(String(row.drawnText ?? "")), `a direction to the participant reached ${row.fieldId}: ${row.drawnText}`);
  }
  // VF13, OUTCOME-CELL-IS-NOT-A-PRINTED-ABBREVIATION.
  const outcomes = writes.filter((row) => row.factId === "matter.outcome");
  assert.equal(outcomes.length, 1, "exactly one Outcome cell is written");
  assert.equal(outcomes[0].drawnText, "MC", "the Outcome cell must carry the printed sealing abbreviation MC");
  assert.equal(outcomes[0].outcomeDerivedFrom, "route", "the Outcome must be derived from the route, not from a fixture literal");
  assert.equal(writes.filter((row) => /dismiss|acquit/i.test(String(row.drawnText ?? ""))).length, 0, "no non-conviction outcome may appear on a conviction-sealing packet");

  const fieldMap = JSON.parse(fs.readFileSync(path.join(OUT, "production-field-map.json"), "utf8"));
  // VF13, SECTION-15-ELECTS-A-GROUND-THIS-ROUTE-DOES-NOT-CARRY.
  const selected = writes.filter((row) => row.isSelectionControl).map((row) => row.fieldName);
  assert.ok(selected.includes("12 - Seal Records"), "item 12 must be answered");
  assert.equal(writes.find((row) => row.fieldName === "12 - Seal Records").drawnText, "Yes", "this route asks the court to seal, so item 12 is Yes");
  assert.ok(selected.includes("17 - I received a misdemeanor conviction or ordinance violation for an offense subject to sealing and 2 years have passed since the end of my last sentence"), "the two-year misdemeanor ground must be elected");
  assert.ok(!selected.includes("15 - Asking to Seal"), "Section 15 is the no-waiting-period Second Chance/FTWOP ground and is not this route's");
  assert.ok(!selected.includes("Page 1 - Request to Expunge Records"), "Request page 1 tells a seal-only filer not to fill out that section");
  // VF13, ORDER-P2-ITEM-3-REFUSED-AS-A-SIGNATURE.
  for (const [field, factId] of [["3 - Name", "participant.full_legal_name"], ["3 - Address", "participant.street_address"], ["3 - Telephone", "participant.phone"], ["3 - Email", "participant.email"]]) {
    const row = writes.find((entry) => entry.documentId === "EXP-AD Order Granting" && entry.fieldName === field);
    assert.ok(row && row.factId === factId, `Order page 2 item 3 must carry the held ${factId}: ${field}`);
  }
  assert.equal(fieldMap.refusals.filter((row) => row.documentId === "EXP-AD Order Granting" && /^3 - (?:Name|Address|Telephone|Email)$/.test(row.fieldName)).length, 0, "no item-3 contact field may be refused as a signature");
  assert.ok(fieldMap.refusals.some((row) => row.fieldName === "3 - Attorney Number" && row.role === "attorney"), "the attorney number stays blank on a self-represented packet");
  for (const judgeField of ["Page 2 - Expungement is Granted", "Page 2 - Sealing is Granted", "Judge's Name", "Entered Date"]) {
    const row = fieldMap.refusals.find((entry) => entry.documentId === "EXP-AD Order Granting" && entry.fieldName === judgeField);
    assert.ok(row && row.role === "court", `the Order must still reserve ${judgeField} for the judge`);
  }
  assert.equal(fieldMap.refusals.filter((row) => /^arrest\/case number/i.test(row.fieldName) && row.requiredBeforeFiling).length, 0, "unused proposed-Order case slots are not owed before filing");

  const instructions = fs.readFileSync(path.join(OUT, "participant-instructions.md"), "utf8");
  // FIX13. These used to match a hand-written paraphrase of the service model. The
  // guide now prints the record's own service and notice sentences, so the same
  // obligation is checked against the record rather than against a restatement.
  const track = controllingRecord();
  for (const phrase of ["Illinois State Police", "arresting agency", "chief legal officer", "You serve nobody"]) assert.ok(instructions.includes(phrase), `service guidance must include: ${phrase}`);
  for (const [label, sentence] of [["fees", track.rules.fees], ["feeWaiver", track.rules.feeWaiver],
    ["service", track.rules.service], ["notice", track.rules.notice], ["filing", track.rules.filing],
    ["participantSignature", track.rules.participantSignature]]) {
    assert.ok(instructions.includes(sentence), `participant-instructions.md must carry the record's ${label} sentence`);
  }
  // FIX13, REQUIRED_BEFORE_FILING. Every line of the controlling record reaches the
  // participant document verbatim, so a registry edit the guide does not carry fails
  // the build rather than shipping a guide that quotes a record it has drifted from.
  for (const line of track.packetSet.requiredBeforeFiling) {
    assert.ok(instructions.includes(line), `participant-instructions.md must carry the required-before-filing step: ${line.slice(0, 60)}`);
  }
  assert.ok(/Obtain Illinois State Police statewide criminal history transcript/.test(instructions),
    "the ISP statewide transcript must be named as a document to obtain, not only as a party that is served");
  assert.ok(instructions.includes("Sign and date that block yourself, in ink"),
    "the guide must tell the petitioner to sign the verification block the packet leaves blank");
  for (const phrase of ["item 12 Yes", "Section 17", "does not elect Section 15"]) assert.ok(instructions.includes(phrase), `the guide must disclose the route's elections: ${phrase}`);
  console.log("il-seal-2yr-set self-test passed");
}

if (process.argv.includes("--self-test")) selfTest();
else await build();
