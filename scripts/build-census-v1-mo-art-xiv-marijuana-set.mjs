#!/usr/bin/env node
/**
 * Route-obligation census v1 - packet family `mo-art-xiv-marijuana-set`.
 *
 *   node scripts/build-census-v1-mo-art-xiv-marijuana-set.mjs
 *
 * Missouri Article XIV, section 2 marijuana expungement. Two official binaries,
 * three components:
 *
 *   CR375  SJRC (10-24), Petition for Expungement - Marijuana-Related
 *          Offense(s). The primary filing.
 *   FI-05  SJRC (04-23), Confidential Case Filing Information Sheet -
 *          Non-Domestic Relations. The cover sheet Missouri requires with a new
 *          case filing, and - on its own printed instruction, "If additional
 *          space is needed, complete additional Confidential Case Filing
 *          Information Sheets" - the continuation component as a second sheet.
 *
 * WHY FI-05 IS RE-READ HERE RATHER THAN TAKEN ON TRUST
 *
 * This family stopped BLOCKED_SOURCE on 2026-09-09 because `official-form:FI-05`
 * matched zero index entries by form number: it lives in the Nationwide recovery
 * pool, and all 380 of that custody's entries carry `formNumber: null`. The
 * resolver now confirms the pinned digest against the committed index instead.
 * A digest that matches proves the bytes are the bytes somebody pinned. It does
 * not prove they are the document this family means, so this build reads the
 * document:
 *
 *   - it is 4 pages, letter, AcroForm, 111 widgets, produced by Word in 2023;
 *   - page 1 is headed "Confidential Case Filing Information Sheet -
 *     Non-Domestic Relations" and footed "SJRC (04-23) FI-05";
 *   - page 2 is the REDACTED INFORMATION table and the "Submitted by" block,
 *     also footed "SJRC (04-23) FI-05";
 *   - pages 3 and 4 are the Missouri Case Types List.
 *
 * It is the Missouri Supreme Court's own FI-05, in the non-domestic-relations
 * variant an expungement petition is filed under, and it is the sheet the census
 * names. The bytes are the document this family means.
 *
 * THE CASE TYPE CODE IS A ROUTE ELECTION, AND WHAT ACTUALLY SUPPORTS IT
 *
 * The value X# comes from the census, which records the destination as "Unit 2
 * is filed with the clerk of that court, with FI-05 at case type X#". That is
 * the whole of the support, and it is a held record keyed to this exact route.
 *
 * This build previously recorded a SECOND ground, and it was false. It said
 * FI-05's Case Types List "carries the CIRCUIT row" for this description, on
 * "pages 3 and 4". Measured out of the binary with pdftotext -bbox:
 *
 *   - the row "Expunge Marijuana Criminal/Arrest Records  X#" is printed on
 *     page 4 only; page 3 carries the list's other categories (DOMESTIC
 *     RELATIONS, ADOPTION, JUVENILE, PROTECTION ORDERS, CONTRACT and others);
 *   - the left block's column headers on page 4 are ASSOCIATE at x 195.72-243.69
 *     and CIRCUIT at x 250.08-284.02;
 *   - X# is drawn at x 213.48-224.36, inside ASSOCIATE;
 *   - the CIRCUIT cell of that row is empty, while the neighbouring rows
 *     "Expungement of Crim/Arrest Record" and "Expungement of Records (610.140
 *     RSMo)" carry XG at x 260.52-273.40 and X5 at x 261.50-272.40, in CIRCUIT.
 *
 * That matters because CR375 is captioned "IN THE ____ JUDICIAL CIRCUIT,
 * ________ COUNTY, MISSOURI". A reviewer told the form itself puts this case
 * type in the CIRCUIT column would take the division question as settled by the
 * source; the source says the opposite. The write is kept, because the census
 * supports the value; the recorded basis is corrected to say what the form
 * shows, and the ASSOCIATE/CIRCUIT division question is put to counsel in
 * approval-request.json. This lane does not answer it: which division a Missouri
 * case type belongs to is a legal question, not a build decision.
 *
 * The route determines the case type, so the packet states it rather than asking
 * the participant. Case Type Code and Case Type Description are written on every
 * FI-05 sheet in the packet.
 *
 * A SOURCE DEFECT THAT HAD TO BE MEASURED RATHER THAN ASSUMED
 *
 * Five of FI-05's widgets carry a /Rect written bottom-edge-last, so their
 * height reads negative: "Party Type Code", "Party Type Description",
 * "Bar ID", "Party Type Code_5" and "Party Type Description_3". A rect is
 * therefore normalized before it is used as a write box, and the ink is proved
 * against the normalized box out of the saved bytes rather than against the
 * value the drawing call was given.
 *
 * HOW THE WRITES ARE PROVED
 *
 * Not from the field map. Each fixture is filled through the AcroForm, the
 * appearances are regenerated with an embedded Helvetica, the form is flattened
 * so no interactive field survives, and the assembled bytes are then re-opened:
 * every page content stream is decompressed, the streams the source already
 * carried are excluded, each remaining `/FlatWidget-n Do` is resolved to its
 * XObject, that stream is decompressed, and every show-text operator in it is
 * decoded with the matrix that precedes it. A write is proved only when its
 * exact string is found at the coordinates the widget's own normalized /Rect
 * declares.
 *
 * This build renders no raster. rasterState is BUILT_RASTER_PENDING and this
 * lane issues no verdict on its own packet.
 */
import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import zlib from "node:zlib";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import { makeCorpusEntryResolver } from "./lib/corpus-index-paths.mjs";
import { classifyBlank, rowKeyOf, PASS_COUNTERS, BLANK_DISPOSITIONS, classifyField }
  from "./rcap-packet-completeness/completeness-contract.mjs";
import { suppressSynthesizedSelectionAppearances }
  from "./rcap-official-forms/rcap-active-content.mjs";

const thisFile = fileURLToPath(import.meta.url);
const ROOT = path.resolve(path.dirname(thisFile), "..");
process.chdir(ROOT);
const require = createRequire(import.meta.url);
const { PDFDocument, PDFName, PDFRawStream, PDFButton, StandardFonts,
  pushGraphicsState, popGraphicsState, translate, drawObject, rotateInPlace } = require("pdf-lib");

const FAMILY_ID = "mo-art-xiv-marijuana-set";
const OUT_REL = "data/rcap-all50/overlays/census-v1/mo/mo-art-xiv-marijuana-set--official-pdf-fill";
const ROUTE_KEYS = [
  "obligation:unit:MO:mo-art-xiv-marijuana:mo-art-xiv-court-ordered-relief",
  "obligation:unit:MO:mo-art-xiv-marijuana:mo-art-xiv-cr375-petition"
];
const FILING_ROUTE_KEY = "obligation:unit:MO:mo-art-xiv-marijuana:mo-art-xiv-cr375-petition";
const CORPUS_INDEX = "data/rcap-all50/local-source-corpus-index.json";
const FIXED_DATE = new Date("2026-09-09T00:00:00.000Z");

const CR375 = "CR375";
const FI05 = "FI-05";
const FI05_CONT = "FI-05 (additional sheet)";

const SOURCES = Object.freeze({
  [CR375]: {
    sourceId: "official-form:CR375",
    path: "STATES/MO/02_PACKET_FORMS/MO__FORM__CR375__petition-for-expungement-marijuana-related-offense-s__REV-2024-10__EN.pdf",
    sha256: "2cfca7e9bea55d27de82b9aed2875db02872345592cc69af7a5aab400e4b0780",
    revision: "SJRC (10-24)", pageCount: 2
  },
  [FI05]: {
    sourceId: "official-form:FI-05",
    path: "LegalEase Missouri/Conf Case Filing Info Sheet(FI-05).pdf",
    sha256: "53f1e04eba653d7ed8e2f2f059e57854d3780845e6364bb6b2a57c7728cd412e",
    revision: "SJRC (04-23)", pageCount: 4
  }
});

/* The case type this route files under. The value is the census destination
 * record's; the description is the one printed beside that code in the FI-05
 * Case Types List. See the header note on what does and does not support it. */
const CASE_TYPE_CODE = "X#";
const CASE_TYPE_DESCRIPTION = "Expunge Marijuana Criminal/Arrest Records";

/* ------------------------------------------------------------------ *
 * WHAT THE PARTICIPANT MUST OBTAIN, AND WHEN TO STOP, ARE READ FROM
 * THE RECORD -- THEY ARE NOT TYPED HERE
 *
 * VF20 failed this family on REQUIRED_BEFORE_FILING: MO.memo.json marks the
 * "Certified docket sheet and judgment for each case" requiredBeforeFiling
 * true, and the words "certified", "docket" and "judgment" appeared zero times
 * in either delivered instruction file. The repository's
 * REQUIRED_BEFORE_FILING_CONDITIONS require such an item to be DISCLOSED --
 * named in participant-instructions.md as something to obtain and submit.
 *
 * Re-reading the record while repairing that turned up the same shape in the
 * stop conditions. This builder carried a hand-written one-sentence PARAPHRASE
 * of the eleven conditions MO.memo.json declares, and a paraphrase keeps only
 * what its author happened to think of. Measured verbatim, all eleven were
 * absent, and seven were absent in substance too: distribution or delivery to a
 * minor, violence, driving under the influence of marijuana, a class A, B or C
 * marijuana felony, more than three pounds or an unclear quantity, an arguable
 * Article XIV sections 1 and 2 question, and a Case.net/Highway Patrol
 * disagreement about whether relief was already entered. Those are the
 * conditions that decide whether this route is the participant's at all.
 *
 * No completeness counter can see either loss. The nine counters range over
 * this family's field-map rows, and both defects are ABSENT CONTENT rather than
 * an unclassified blank, so verify-packet-completeness.mjs returned
 * PASS_COMPLETE with all nine zero while both were missing.
 *
 * So both are DERIVED from MO.memo.json at build time and the build REFUSES if
 * the record stops declaring them. MO.memo.json is hashed into
 * source-receipt.json as a composition source, so this text moves only when
 * that record moves, and
 * scripts/grade-a-packet-factory-24h/test-mo-art-xiv-record-disclosures.mjs
 * asserts the binding survived all the way into the delivered bytes.
 * ------------------------------------------------------------------ */
const MO_MEMO_PATH = "data/record-clearing/legal-design-intake/MO.memo.json";
const MO_TRACK_ID = "mo-art-xiv-marijuana";
const MO_MEMO_BYTES = fs.readFileSync(path.join(ROOT, MO_MEMO_PATH));
const MO_MEMO_TRACK = (() => {
  const memo = JSON.parse(MO_MEMO_BYTES.toString("utf8"));
  const track = (memo.tracks ?? []).find((entry) => entry.trackId === MO_TRACK_ID);
  if (!track) throw new Error(`MO_MEMO_TRACK_ABSENT: ${MO_TRACK_ID} is not in ${MO_MEMO_PATH}`);
  return track;
})();

const REQUIRED_BEFORE_FILING_DOCUMENTS = (MO_MEMO_TRACK.supportingDocuments ?? [])
  .filter((document) => document.requiredBeforeFiling === true);
const SELF_HELP_STOP_CONDITIONS = MO_MEMO_TRACK.selfHelpStopConditions ?? [];
if (!REQUIRED_BEFORE_FILING_DOCUMENTS.length) {
  throw new Error("MO_MEMO_DECLARES_NO_REQUIRED_BEFORE_FILING_DOCUMENT: refusing to build instructions that would "
    + "silently owe the participant nothing before filing");
}
if (!SELF_HELP_STOP_CONDITIONS.length) {
  throw new Error("MO_MEMO_DECLARES_NO_SELF_HELP_STOP_CONDITIONS: refusing to build a packet with no stop conditions");
}
for (const document of REQUIRED_BEFORE_FILING_DOCUMENTS) {
  for (const field of ["name", "obtainedFrom", "howToObtain"]) {
    if (!document[field]) {
      throw new Error(`MO_MEMO_REQUIRED_DOCUMENT_INCOMPLETE: "${document.name ?? "(unnamed)"}" has no ${field}`);
    }
  }
}
/* The waiver route the instructions name is the record's, not this file's
 * memory of it. The participant copy tells the participant that GN10 exists
 * under Rule 77.03 and section 514.040; if the record stops saying so, the
 * build stops rather than keep telling a participant about a route the
 * committed record no longer names. The FEE sentence is asserted the same way:
 * the packet's silence about an amount rests on the record publishing none. */
const MO_FEE_WAIVER_RULE = String(MO_MEMO_TRACK.rules?.feeWaiver ?? "");
for (const token of ["GN10", "77.03", "514.040"]) {
  if (!MO_FEE_WAIVER_RULE.includes(token)) {
    throw new Error(`MO_MEMO_FEE_WAIVER_NO_LONGER_NAMES_${token}: the participant instructions state this waiver `
      + `route on the strength of rules.feeWaiver, which now reads "${MO_FEE_WAIVER_RULE}"`);
  }
}
if (!/no fee figure is published on this track/i.test(String(MO_MEMO_TRACK.rules?.fees ?? ""))) {
  throw new Error("MO_MEMO_NOW_PUBLISHES_A_FEE_FIGURE: this packet states no amount because the record published "
    + "none; that silence must be revisited rather than kept by habit");
}

/* The disclosure, in the record's own words. Every sentence below is either a
 * quotation from MO.memo.json or a statement about what that record says. */
const REQUIRED_BEFORE_FILING_LINES = [
  "## What you must obtain before you file",
  "",
  "The Missouri record for this route marks the following as required before filing. Get it before you file, and",
  "file it with your petition.",
  ""
];
for (const document of REQUIRED_BEFORE_FILING_DOCUMENTS) {
  REQUIRED_BEFORE_FILING_LINES.push(
    `- **${document.name}.** Obtained from: ${document.obtainedFrom}. ${document.howToObtain}`
  );
}

const SIGNATURE_CLASS = "signature_or_date_participant_completion";
const ELECTION_CLASS = "participant_sworn_narrative_or_legal_election";

const sha256 = (bytes) => crypto.createHash("sha256").update(bytes).digest("hex");
const writeJson = (file, value) => fs.writeFileSync(file, `${JSON.stringify(value, null, 2)}\n`);
const readJson = (rel) => JSON.parse(fs.readFileSync(path.join(ROOT, rel), "utf8"));

/* ------------------------------------------------------------------ *
 * Two synthetic participants. Neither is a real person, and no fact in
 * either was taken from any participant record.
 * ------------------------------------------------------------------ */
const FIXTURES = {
  canonical: {
    "participant.full_legal_name": "Jordan Avery Reyes",
    "participant.last_name": "Reyes",
    "participant.first_name": "Jordan",
    "participant.middle_name": "Avery",
    "participant.year_of_birth": "1991",
    "participant.date_of_birth": "04/17/1991",
    "participant.street_address": "412 Walnut Street, Apartment 7",
    "participant.city": "Springfield",
    "participant.state": "MO",
    "participant.zip": "65806",
    "participant.phone": "417-555-0142",
    "participant.email": "jordan.reyes@example.org",
    "participant.address_block": "412 Walnut Street, Apartment 7\nSpringfield, MO 65806",
    "case.judicial_circuit": "31st",
    "case.filing_county": "Greene",
    "case.case_number": "1731-CR01234",
    "case.circuit_court_division": "Division 4",
    "case.court_name": "Circuit Court of Greene County, Missouri",
    "case.currently_incarcerated": "no",
    "conviction.1.case_number": "1731-CR01234",
    "conviction.1.court_name": "Greene County Circuit Court",
    "conviction.1.charge_date": "06/14/2015",
    "conviction.1.county": "Greene",
    "conviction.1.charge": "579.015 - Possession of a controlled substance (marijuana), Class A misdemeanor",
    "conviction.2.case_number": "1731-CR05678",
    "conviction.2.court_name": "Greene County Circuit Court",
    "conviction.2.charge_date": "02/03/2017",
    "conviction.2.county": "Greene",
    "conviction.2.charge": "579.020 - Delivery of 35 grams or less of marijuana, Class E felony"
  },
  boundary: {
    "participant.full_legal_name": "Maria-Alejandra O'Shaughnessy-Whitfield",
    "participant.last_name": "O'Shaughnessy-Whitfield",
    "participant.first_name": "Maria-Alejandra",
    "participant.middle_name": "Katharine",
    "participant.year_of_birth": "1968",
    "participant.date_of_birth": "12/31/1968",
    "participant.street_address": "1188 Upper Coastal Crossing Road, Apartment 14B",
    "participant.city": "Excelsior Springs",
    "participant.state": "MO",
    "participant.zip": "64024-2214",
    "participant.phone": "816-555-0199",
    "participant.email": "maria.alejandra.oshaughnessy.whitfield@example.org",
    "participant.address_block": "1188 Upper Coastal Crossing Road, Apartment 14B\nExcelsior Springs, MO 64024-2214",
    "case.judicial_circuit": "7th",
    "case.filing_county": "Clay",
    "case.case_number": "07CY-CR00123456-01",
    "case.circuit_court_division": "Division 12",
    "case.court_name": "Circuit Court of Clay County, Missouri",
    "case.currently_incarcerated": "no",
    "conviction.1.case_number": "07CY-CR00123456-01",
    "conviction.1.court_name": "Clay County Circuit Court",
    "conviction.1.charge_date": "11/02/2009",
    "conviction.1.county": "Clay",
    "conviction.1.charge": "195.202 - Possession of a controlled substance (marijuana), Class C felony",
    "conviction.2.case_number": "07CY-CR00987654-02",
    "conviction.2.court_name": "Clay County Circuit Court",
    "conviction.2.charge_date": "08/19/2012",
    "conviction.2.county": "Clay",
    "conviction.2.charge": "195.211 - Distribution of a controlled substance (marijuana), Class B felony"
  }
};

/* ------------------------------------------------------------------ *
 * CR375 - the primary filing.
 * ------------------------------------------------------------------ */
const CR375_ROW_LABELS = [
  ["Case Number", "Case number of the conviction listed in row %n"],
  ["Court Name", "Court name for the conviction listed in row %n"],
  ["Approx Date of Charge", "Approximate date of the charge listed in row %n"],
  ["County of Charge", "County of charge for the conviction listed in row %n"],
  ["Number and Description of Charge", "Number and description of the charge listed in row %n"]
];
const CR375_ROW_FACTS = ["case_number", "court_name", "charge_date", "county", "charge"];
const WRITTEN_CONVICTION_ROWS = 2;
const CR375_TABLE_ROWS = 9;

const RACE_BOXES = [
  ["P Race American Indian or Alaska Native", "Race and ethnicity: American Indian or Alaska Native"],
  ["P Race Asian", "Race and ethnicity: Asian"],
  ["P Race Black or African American", "Race and ethnicity: Black or African American"],
  ["P Race Native Hawaiian or other Pacific Islander", "Race and ethnicity: Native Hawaiian or other Pacific Islander"],
  ["P Race White", "Race and ethnicity: White"],
  ["P Ethnicity Hispanic or Latino", "Race and ethnicity: Hispanic or Latino"],
  ["P Race MENA", "Race and ethnicity: Middle Eastern or North African (MENA)"],
  ["P Race Other", "Race and ethnicity: Other"],
  ["P Race Unknown", "Race and ethnicity: Unknown"]
];

const SELF_IDENTIFICATION_WHY =
  "race, ethnicity and sex are self-identification. The form says select one or more, and the person filing "
  + "is the only one who may state them about themselves; nothing here infers them from a record.";

function cr375Spec(facts) {
  const writes = [
    { name: "Judicial Circuit", label: "Judicial circuit of the court where the conviction was entered",
      factId: "case.judicial_circuit", value: facts["case.judicial_circuit"], size: 10 },
    { name: "County/City of St. Louis", label: "County or City of St. Louis of the court where the conviction was entered",
      factId: "case.filing_county", value: facts["case.filing_county"], size: 10 },
    { name: "Case number", label: "Case number of the marijuana conviction this petition is filed under",
      factId: "case.case_number", value: facts["case.case_number"], size: 10 },
    { name: "Petitioner", label: "Petitioner's name in the caption",
      factId: "participant.full_legal_name", value: facts["participant.full_legal_name"], size: 10 },
    { name: "R Checkbox Circuit Court Division", kind: "checkbox",
      label: "Defendant: the Circuit Court Division that entered the conviction", routeDetermined: true,
      basis: "the court that entered the conviction holds the record this petition asks to expunge, so it is a "
        + "record-holding agency on every case that reaches this route" },
    { name: "R Circuit Court Division", label: "Circuit court division of the court that entered the conviction",
      factId: "case.circuit_court_division", value: facts["case.circuit_court_division"], size: 9 },
    { name: "R MSHP CJIS", kind: "checkbox",
      label: "Defendant: Missouri State Highway Patrol (MSHP), Criminal Justice Information Services (CJIS)",
      routeDetermined: true,
      basis: "the MSHP CJIS Division is Missouri's central repository for criminal history record information, so "
        + "it holds a record of every Missouri conviction this route reaches" },
    { name: "R Prosecutors office", kind: "checkbox",
      label: "Defendant: the prosecuting attorney or circuit attorney who prosecuted the case", routeDetermined: true,
      basis: "the office that prosecuted the case holds its file, on every case that reaches this route" },
    { name: "r County Prosecutor", label: "County of the prosecuting attorney or circuit attorney",
      factId: "case.filing_county", value: facts["case.filing_county"], size: 10 },
    { name: "not incarcarated", kind: "checkbox",
      label: "I am not currently incarcerated or on probation for a marijuana related offense",
      caseDetermined: true,
      basis: "the held screening fact case.currently_incarcerated is \"no\" for this fixture. The two boxes are a "
        + "select-one pair and the packet states the one the held fact supports" },
    { name: "p Full Name", label: "Petitioner's full name",
      factId: "participant.full_legal_name", value: facts["participant.full_legal_name"], size: 10 },
    { name: "p Year of Birth", label: "Petitioner's year of birth",
      factId: "participant.year_of_birth", value: facts["participant.year_of_birth"], size: 10 },
    { name: "P address", label: "Petitioner's current address",
      factId: "participant.address_block", value: facts["participant.address_block"], size: 10, multiline: true }
  ];
  for (let r = 1; r <= WRITTEN_CONVICTION_ROWS; r += 1) {
    CR375_ROW_LABELS.forEach(([prefix, label], i) => {
      writes.push({
        name: `${prefix}Row${r}`, label: label.replace("%n", String(r)),
        factId: `conviction.${r}.${CR375_ROW_FACTS[i]}`,
        value: facts[`conviction.${r}.${CR375_ROW_FACTS[i]}`], size: 7, multiline: true
      });
    });
  }

  const blanks = [
    { name: "Judge or Division", label: "Judge or division assigned by the court",
      reason: "court, clerk, prosecutor, agency, or hearing field", refusalClass: "court_prosecutor_clerk_or_agency_owned",
      role: "court", why: "the court assigns the judge or division; it is not the petitioner's to state" },
    { name: "Checkbox County Sheriff's Department", isSelectionControl: true,
      label: "Defendant: a county sheriff's department that may hold records of the conviction",
      reason: "a participant election the route does not determine: whether a county sheriff arrested or booked "
        + "this participant is a fact of their own case that the platform does not hold",
      refusalClass: ELECTION_CLASS, disposition: "PARTICIPANT_ELECTION_GENUINE", role: "participant",
      why: "the person filing knows which agency arrested them; the platform does not, and naming a sheriff who "
        + "holds no record would put a false defendant on a sworn petition" },
    { name: "R County Sheriff's Department", label: "County of the sheriff's department named as a defendant",
      requiredBeforeFiling: true, disposition: "REQUIRED_BEFORE_FILING", role: "participant",
      supply: "the county of the sheriff's department, if a county sheriff arrested or booked you on this case",
      reason: "the participant supplies this before filing" },
    { name: "R Checkbox Municipal Police Department", isSelectionControl: true,
      label: "Defendant: a municipal police department that may hold records of the conviction",
      reason: "a participant election the route does not determine: whether a municipal police department arrested "
        + "this participant is a fact of their own case that the platform does not hold",
      refusalClass: ELECTION_CLASS, disposition: "PARTICIPANT_ELECTION_GENUINE", role: "participant",
      why: "the person filing knows which agency arrested them; the platform does not" },
    { name: "R Municipal Police Department", label: "Name of the municipal police department named as a defendant",
      requiredBeforeFiling: true, disposition: "REQUIRED_BEFORE_FILING", role: "participant",
      supply: "the name of the municipal police department, if a city police department arrested you on this case",
      reason: "the participant supplies this before filing" },
    { name: "r other", isSelectionControl: true,
      label: "Defendant: any other agency the petitioner believes holds records of the conviction",
      reason: "a participant election the route does not determine: only the person filing knows which further "
        + "agencies they believe hold a record",
      refusalClass: ELECTION_CLASS, disposition: "PARTICIPANT_ELECTION_GENUINE", role: "participant",
      why: "the form asks what the petitioner believes; a belief is not something a platform may supply" },
    { name: "r Other Name/Address", label: "Name and address of any other agency named as a defendant (optional)",
      reason: "optional participant-authored content; the platform does not invent it", role: "participant",
      why: "the form leaves this open for further agencies the petitioner names" },
    { name: "Incarcarated", isSelectionControl: true,
      label: "I am currently incarcerated for a marijuana-related offense that is a misdemeanor or a class E or D felony involving three pounds or less of marijuana",
      disposition: "NOT_APPLICABLE_ON_THIS_ROUTE",
      routeConditionThatMakesItInapplicable:
        "the two incarceration boxes are a select-one pair and this packet states the not-incarcerated alternative "
        + "from the held case fact; marking both would contradict the statement the packet makes",
      role: "participant", reason: "the packet states the other member of this select-one pair" },
    { name: "r Checkbox Peitioner Male", isSelectionControl: true, label: "Sex: Male",
      reason: `a participant election the route does not determine: ${SELF_IDENTIFICATION_WHY}`,
      refusalClass: ELECTION_CLASS, disposition: "PARTICIPANT_ELECTION_GENUINE", role: "participant",
      why: SELF_IDENTIFICATION_WHY },
    { name: "r Checkbox Petitioner Female", isSelectionControl: true, label: "Sex: Female",
      reason: `a participant election the route does not determine: ${SELF_IDENTIFICATION_WHY}`,
      refusalClass: ELECTION_CLASS, disposition: "PARTICIPANT_ELECTION_GENUINE", role: "participant",
      why: SELF_IDENTIFICATION_WHY }
  ];
  for (const [name, label] of RACE_BOXES) {
    blanks.push({
      name, label, isSelectionControl: true,
      reason: `a participant election the route does not determine: ${SELF_IDENTIFICATION_WHY}`,
      refusalClass: ELECTION_CLASS, disposition: "PARTICIPANT_ELECTION_GENUINE", role: "participant",
      why: SELF_IDENTIFICATION_WHY
    });
  }
  for (let r = WRITTEN_CONVICTION_ROWS + 1; r <= CR375_TABLE_ROWS; r += 1) {
    CR375_ROW_LABELS.forEach(([prefix, label]) => {
      blanks.push({
        name: `${prefix}Row${r}`, label: label.replace("%n", String(r)),
        requiredBeforeFiling: true, disposition: "REQUIRED_BEFORE_FILING", role: "participant",
        supply: `this cell of conviction row ${r}, if you are asking the court to expunge more than the `
          + `${WRITTEN_CONVICTION_ROWS} marijuana convictions already listed`,
        reason: "the participant supplies this before filing"
      });
    });
  }
  blanks.push(
    { name: "printed:petitioner_signature", printedSlot: true, page: 2,
      label: "Petitioner's signature", reason: "signature or date field; never prefilled by this build",
      refusalClass: SIGNATURE_CLASS, role: "protected",
      why: "the petitioner signs under penalty of perjury after reading the petition" }
  );
  return { documentId: CR375, writes, blanks };
}

/* ------------------------------------------------------------------ *
 * FI-05 - the cover sheet, and the same sheet again as the continuation.
 *
 * The three party blocks of the first sheet carry the petitioner and the first
 * two defendant agencies the petition names. The fourth party goes on a second
 * sheet, which is what the form's own instruction directs: "If additional space
 * is needed, complete additional Confidential Case Filing Information Sheets."
 * ------------------------------------------------------------------ */
const BLOCK_NAMES = [
  { sfx: "", code: "Party Type Code", desc: "Party Type Description",
    attorney: "Attorney Name if represented by counsel", bar: "Bar ID", attorneyCode: "Party Type Code_2",
    male: "Check Box2", female: "Check Box3" },
  { sfx: "_2", code: "Party Type Code_3", desc: "Party Type Description_2",
    attorney: "Attorney Name if represented by counsel_2", bar: "Bar ID_2", attorneyCode: "Party Type Code_4",
    male: "Check Box4", female: "Check Box5" },
  { sfx: "_3", code: "Party Type Code_5", desc: "Party Type Description_3",
    attorney: "Attorney Name if represented by counsel_3", bar: "Bar ID_3", attorneyCode: "Party Type Code_6",
    male: "Check Box6", female: "Check Box7" }
];

const PARTY_TYPE_CODE_SUPPLY =
  "the Party Type Code for this party from the Party Types List on courts.mo.gov; this binary prints the Case "
  + "Types List on its pages 3 and 4 but does not carry the Party Types List, so the packet does not guess a code";

function attorneyRows(block, partyNo, docId) {
  return [
    { name: block.attorney, label: `Party ${partyNo}: attorney name, if represented by counsel`,
      reason: "attorney-only field; no representation fact is held for this participant", role: "attorney",
      why: "this packet is drafted for a self-represented petitioner and never populates an attorney block" },
    { name: block.bar, label: `Party ${partyNo}: attorney Bar ID`,
      reason: "attorney-only field; no representation fact is held for this participant", role: "attorney",
      why: "this packet is drafted for a self-represented petitioner and never populates an attorney block" },
    { name: block.attorneyCode, label: `Party ${partyNo}: attorney Party Type Code`,
      reason: "attorney-only field; no representation fact is held for this participant", role: "attorney",
      why: "this packet is drafted for a self-represented petitioner and never populates an attorney block" }
  ].map((row) => ({ ...row, document: docId }));
}

function personBlock(block, partyNo, facts) {
  const w = (name, label, factId, size = 9) => ({ name, label, factId, value: facts[factId], size });
  return {
    writes: [
      w(block.desc, `Party ${partyNo}: party type description`, null, 9),
      w(`Name if a person Last${block.sfx}`, `Party ${partyNo}: name (last)`, "participant.last_name"),
      w(`First${block.sfx}`, `Party ${partyNo}: name (first)`, "participant.first_name"),
      w(`Middle${block.sfx}`, `Party ${partyNo}: name (middle)`, "participant.middle_name"),
      w(`Address${block.sfx}`, `Party ${partyNo}: street address`, "participant.street_address"),
      w(`City${block.sfx}`, `Party ${partyNo}: city`, "participant.city"),
      w(`State${block.sfx}`, `Party ${partyNo}: state`, "participant.state"),
      w(`Zip${block.sfx}`, `Party ${partyNo}: ZIP code`, "participant.zip"),
      w(`Contact Telephone Number${block.sfx}`, `Party ${partyNo}: contact telephone number`, "participant.phone"),
      w(`Email Address${block.sfx}`, `Party ${partyNo}: email address`, "participant.email"),
      w(`DOBDOD${block.sfx}`, `Party ${partyNo}: date of birth`, "participant.date_of_birth")
    ].map((row) => row.factId === null
      ? { ...row, value: "Petitioner", factId: "route.party_type_description_petitioner", routeDetermined: true,
          basis: "the petition this sheet accompanies is captioned with this participant as Petitioner" }
      : row),
    blanks: [
      { name: block.code, label: `Party ${partyNo}: Party Type Code`,
        requiredBeforeFiling: true, disposition: "REQUIRED_BEFORE_FILING", role: "participant",
        supply: PARTY_TYPE_CODE_SUPPLY, reason: "the participant supplies this before filing" },
      { name: `Organization if nonperson${block.sfx}`, label: `Party ${partyNo}: organization name if this party is not a person`,
        disposition: "NOT_APPLICABLE_ON_THIS_ROUTE",
        routeConditionThatMakesItInapplicable:
          "this party is the petitioner, a person, and the form draws the organization line as the alternative for "
          + "a party that is not a person",
        role: "participant", reason: "the party in this block is a person, not an organization" },
      { name: `SSN${block.sfx}`, label: `Party ${partyNo}: Social Security number`,
        requiredBeforeFiling: true, disposition: "REQUIRED_BEFORE_FILING", role: "participant",
        supply: "your own full Social Security number, which Missouri Supreme Court Operating Rule 4.07 requires on "
          + "this confidential sheet. This packet does not hold or print Social Security numbers",
        reason: "the participant supplies this before filing" },
      { name: block.male, isSelectionControl: true, label: `Party ${partyNo}: Gender - Male`,
        reason: `a participant election the route does not determine: ${SELF_IDENTIFICATION_WHY}`,
        refusalClass: ELECTION_CLASS, disposition: "PARTICIPANT_ELECTION_GENUINE", role: "participant",
        why: SELF_IDENTIFICATION_WHY },
      { name: block.female, isSelectionControl: true, label: `Party ${partyNo}: Gender - Female`,
        reason: `a participant election the route does not determine: ${SELF_IDENTIFICATION_WHY}`,
        refusalClass: ELECTION_CLASS, disposition: "PARTICIPANT_ELECTION_GENUINE", role: "participant",
        why: SELF_IDENTIFICATION_WHY }
    ]
  };
}

function organizationBlock(block, partyNo, organizationName, whatItIs) {
  const notAPerson = (name, label) => ({
    name, label, disposition: "NOT_APPLICABLE_ON_THIS_ROUTE",
    routeConditionThatMakesItInapplicable:
      `party ${partyNo} of this sheet is ${whatItIs}, an organization named as a defendant on the petition, and `
      + "the form draws this line only for a party that is a person",
    role: "participant", reason: "the party in this block is an organization, not a person"
  });
  return {
    writes: [
      { name: block.desc, label: `Party ${partyNo}: party type description`, value: "Defendant",
        factId: "route.party_type_description_defendant", routeDetermined: true, size: 9,
        basis: "CR375 names the record-holding agencies as Defendant(s), and this packet names this agency there" },
      { name: `Organization if nonperson${block.sfx}`, label: `Party ${partyNo}: organization name`,
        value: organizationName, factId: `route.defendant_agency_${partyNo}`, size: 9,
        basis: "the agency this packet names as a defendant in the corresponding box of CR375" }
    ],
    blanks: [
      { name: block.code, label: `Party ${partyNo}: Party Type Code`,
        requiredBeforeFiling: true, disposition: "REQUIRED_BEFORE_FILING", role: "participant",
        supply: PARTY_TYPE_CODE_SUPPLY, reason: "the participant supplies this before filing" },
      notAPerson(`Name if a person Last${block.sfx}`, `Party ${partyNo}: name (last) if a person`),
      notAPerson(`First${block.sfx}`, `Party ${partyNo}: name (first) if a person`),
      notAPerson(`Middle${block.sfx}`, `Party ${partyNo}: name (middle) if a person`),
      notAPerson(`DOBDOD${block.sfx}`, `Party ${partyNo}: date of birth or date of death`),
      notAPerson(`SSN${block.sfx}`, `Party ${partyNo}: Social Security number`),
      { ...notAPerson(block.male, `Party ${partyNo}: Gender - Male`), isSelectionControl: true },
      { ...notAPerson(block.female, `Party ${partyNo}: Gender - Female`), isSelectionControl: true },
      { name: `Address${block.sfx}`, label: `Party ${partyNo}: street address of the agency`,
        requiredBeforeFiling: true, disposition: "REQUIRED_BEFORE_FILING", role: "participant",
        supply: `the current street address of ${organizationName}`, reason: "the participant supplies this before filing" },
      { name: `City${block.sfx}`, label: `Party ${partyNo}: city of the agency`,
        requiredBeforeFiling: true, disposition: "REQUIRED_BEFORE_FILING", role: "participant",
        supply: `the city of ${organizationName}`, reason: "the participant supplies this before filing" },
      { name: `State${block.sfx}`, label: `Party ${partyNo}: state of the agency`,
        requiredBeforeFiling: true, disposition: "REQUIRED_BEFORE_FILING", role: "participant",
        supply: `the state of ${organizationName}`, reason: "the participant supplies this before filing" },
      { name: `Zip${block.sfx}`, label: `Party ${partyNo}: ZIP code of the agency`,
        requiredBeforeFiling: true, disposition: "REQUIRED_BEFORE_FILING", role: "participant",
        supply: `the ZIP code of ${organizationName}`, reason: "the participant supplies this before filing" },
      { name: `Contact Telephone Number${block.sfx}`, label: `Party ${partyNo}: contact telephone number of the agency`,
        requiredBeforeFiling: true, disposition: "REQUIRED_BEFORE_FILING", role: "participant",
        supply: `the public telephone number of ${organizationName}`, reason: "the participant supplies this before filing" },
      { name: `Email Address${block.sfx}`, label: `Party ${partyNo}: email address of the agency`,
        requiredBeforeFiling: true, disposition: "REQUIRED_BEFORE_FILING", role: "participant",
        supply: `the public email address of ${organizationName}, if the clerk asks for one`,
        reason: "the participant supplies this before filing" }
    ]
  };
}

function unusedBlock(block, partyNo, condition) {
  const unused = (name, label, extra = {}) => ({
    name, label, disposition: "NOT_APPLICABLE_ON_THIS_ROUTE",
    routeConditionThatMakesItInapplicable: condition,
    role: "participant", reason: "this party block of the additional sheet is unused", ...extra
  });
  return {
    writes: [],
    blanks: [
      unused(block.code, `Party ${partyNo}: Party Type Code`),
      unused(block.desc, `Party ${partyNo}: party type description`),
      unused(`Name if a person Last${block.sfx}`, `Party ${partyNo}: name (last)`),
      unused(`First${block.sfx}`, `Party ${partyNo}: name (first)`),
      unused(`Middle${block.sfx}`, `Party ${partyNo}: name (middle)`),
      unused(`Organization if nonperson${block.sfx}`, `Party ${partyNo}: organization name`),
      unused(`Address${block.sfx}`, `Party ${partyNo}: street address`),
      unused(`City${block.sfx}`, `Party ${partyNo}: city`),
      unused(`State${block.sfx}`, `Party ${partyNo}: state`),
      unused(`Zip${block.sfx}`, `Party ${partyNo}: ZIP code`),
      unused(`Contact Telephone Number${block.sfx}`, `Party ${partyNo}: contact telephone number`),
      unused(`Email Address${block.sfx}`, `Party ${partyNo}: email address`),
      unused(`DOBDOD${block.sfx}`, `Party ${partyNo}: date of birth or date of death`),
      unused(`SSN${block.sfx}`, `Party ${partyNo}: Social Security number`),
      unused(block.male, `Party ${partyNo}: Gender - Male`, { isSelectionControl: true }),
      unused(block.female, `Party ${partyNo}: Gender - Female`, { isSelectionControl: true })
    ]
  };
}

const REDACTED_TABLE_ROWS = 20;
const REDACTED_TABLE_CONDITION =
  "the REDACTED INFORMATION table records the identifiers that were removed from a redacted document filed with "
  + "this sheet. This packet's filing set is CR375 and the Confidential Case Filing Information Sheets themselves; "
  + "it files no redacted document, so no identifier has been removed and the table is not reached";

function fi05Spec(documentId, facts, plan, sheetNote) {
  const writes = [
    { name: "CountyCity of St Louis", label: "County or City of St. Louis where the case is filed",
      factId: "case.filing_county", value: facts["case.filing_county"], size: 10 },
    { name: "Case Type Code", label: "Case Type Code", value: CASE_TYPE_CODE,
      factId: "route.case_type_code", routeDetermined: true, size: 11,
      basis: "the census records this route as filed \"with FI-05 at case type X#\". That census destination "
        + "record is the whole of the support for this value. The FI-05 binary corroborates the CODE ITSELF and "
        + "nothing more: its Case Types List prints the row \"Expunge Marijuana Criminal/Arrest Records  X#\" on "
        + "page 4 only, and the X# is drawn at x 213.48-224.36, inside the ASSOCIATE column (header x "
        + "195.72-243.69) rather than the CIRCUIT column (header x 250.08-284.02), whose cell is empty on that "
        + "row. Whether a petition captioned \"IN THE ____ JUDICIAL CIRCUIT\" is nonetheless filed at this case "
        + "type is a question for counsel, and approval-request.json asks it; this build does not answer it" },
    { name: "Case Type Description", label: "Case Type Description", value: CASE_TYPE_DESCRIPTION,
      factId: "route.case_type_description", routeDetermined: true, size: 9,
      basis: "the description printed beside code X# in this binary's own Case Types List, on its page 4" },
    { name: "Submitted by", label: "Submitted by", factId: "participant.full_legal_name",
      value: facts["participant.full_legal_name"], size: 9 },
    { name: "City_4", label: "Submitted by: city", factId: "participant.city", value: facts["participant.city"], size: 9 },
    { name: "State_4", label: "Submitted by: state", factId: "participant.state", value: facts["participant.state"], size: 9 },
    { name: "Zip_4", label: "Submitted by: ZIP code", factId: "participant.zip", value: facts["participant.zip"], size: 9 },
    { name: "Phone", label: "Submitted by: phone", factId: "participant.phone", value: facts["participant.phone"], size: 9 },
    { name: "Email Address_4", label: "Submitted by: email address", factId: "participant.email",
      value: facts["participant.email"], size: 9 }
  ];
  const blanks = [
    { name: "Filing Date", label: "Filing Date",
      requiredBeforeFiling: true, disposition: "REQUIRED_BEFORE_FILING", role: "participant",
      supply: "the date you actually hand this sheet and the petition to the clerk. A filing date written before "
        + "the filing happened would be false, so this packet leaves it blank",
      reason: "the participant supplies this before filing" },
    { name: "Text1", label: "Style of Case",
      requiredBeforeFiling: true, disposition: "REQUIRED_BEFORE_FILING", role: "participant",
      supply: "the style of the case as the clerk of that court words it. Your petition is captioned with you as "
        + "Petitioner against the agencies you named as Defendant(s) on CR375",
      reason: "the participant supplies this before filing" },
    { name: "The unredacted document is attached to this filing sheet in", isSelectionControl: true,
      label: "The unredacted document is attached to this filing sheet in place of listing the redacted information identifiers below",
      reason: "a participant election the route does not determine: whether an unredacted document is attached in "
        + "place of the identifier table is a choice about how the filer supplies confidential identifiers",
      refusalClass: ELECTION_CLASS, disposition: "PARTICIPANT_ELECTION_GENUINE", role: "participant",
      why: "this packet attaches no unredacted document, and the choice of method stays with the person filing" },
    { name: "Bar ID required if attorney", label: "Submitted by: Bar ID, required if an attorney",
      reason: "attorney-only field; no representation fact is held for this participant", role: "attorney",
      why: "this packet is drafted for a self-represented petitioner and never populates an attorney block" },
    { name: "Address if not shown above", label: "Submitted by: address, if not shown above",
      disposition: "NOT_APPLICABLE_ON_THIS_ROUTE",
      routeConditionThatMakesItInapplicable:
        "the form conditions this line on the filer's address not being shown above, and party block 1 of the "
        + "first sheet of this packet carries the filer's mailing address, so the condition the form names is not met",
      role: "participant", reason: "the form draws this line only when the address is not already shown above" }
  ];
  for (let r = 1; r <= REDACTED_TABLE_ROWS; r += 1) {
    blanks.push(
      { name: `Redacted Information IdentifierRow${r}`, label: `Redacted information identifier, table line ${r}`,
        disposition: "NOT_APPLICABLE_ON_THIS_ROUTE", routeConditionThatMakesItInapplicable: REDACTED_TABLE_CONDITION,
        role: "participant", reason: "no document in this filing set is redacted" },
      { name: `Redacted InformationRow${r}`, label: `Redacted information, table line ${r}`,
        disposition: "NOT_APPLICABLE_ON_THIS_ROUTE", routeConditionThatMakesItInapplicable: REDACTED_TABLE_CONDITION,
        role: "participant", reason: "no document in this filing set is redacted" }
    );
  }
  plan.forEach((entry, i) => {
    const block = BLOCK_NAMES[i];
    const partyNo = entry.partyNo;
    let produced;
    if (entry.kind === "person") produced = personBlock(block, partyNo, facts);
    else if (entry.kind === "organization") produced = organizationBlock(block, partyNo, entry.organizationName, entry.whatItIs);
    else produced = unusedBlock(block, partyNo, entry.condition);
    writes.push(...produced.writes);
    blanks.push(...produced.blanks, ...attorneyRows(block, partyNo, documentId));
  });
  return {
    documentId, sheetNote,
    writes: writes.map((row) => ({ ...row, document: documentId })),
    blanks: blanks.map((row) => ({ ...row, document: documentId }))
  };
}

function fi05Plans(facts) {
  const courtAgency = `${facts["case.court_name"]}, ${facts["case.circuit_court_division"]}`;
  const mshp = "Missouri State Highway Patrol, Criminal Justice Information Services (CJIS) Division";
  const prosecutor = `Prosecuting Attorney of ${facts["case.filing_county"]} County, Missouri`;
  const unusedCondition =
    "this petition has four parties - the petitioner and the three agencies named as Defendant(s) on CR375. Three "
    + "fit on the first Confidential Case Filing Information Sheet and the fourth is entered in party block 1 of "
    + "this additional sheet, so party blocks 2 and 3 of the additional sheet are unused";
  return {
    cover: [
      { kind: "person", partyNo: 1 },
      { kind: "organization", partyNo: 2, organizationName: courtAgency, whatItIs: "the court that entered the conviction" },
      { kind: "organization", partyNo: 3, organizationName: mshp, whatItIs: "the state central repository" }
    ],
    continuation: [
      { kind: "organization", partyNo: 4, organizationName: prosecutor, whatItIs: "the office that prosecuted the case" },
      { kind: "unused", partyNo: 5, condition: unusedCondition },
      { kind: "unused", partyNo: 6, condition: unusedCondition }
    ],
    agencies: { courtAgency, mshp, prosecutor }
  };
}

/* ---- source binding ------------------------------------------------------ */
function resolveSources() {
  const index = readJson(CORPUS_INDEX);
  const resolver = makeCorpusEntryResolver(index, { repoRoot: ROOT, masterLibraryRoot: process.env.MASTER_LIBRARY_SOURCE_DIR });
  const resolved = {};
  const failures = [];
  for (const [key, want] of Object.entries(SOURCES)) {
    const entry = (index.entries ?? []).find((row) => row.path === want.path);
    if (!entry) { failures.push({ sourceIdentity: want.sourceId, why: `no committed index entry at ${want.path}` }); continue; }
    if (entry.sha256 !== want.sha256) {
      failures.push({ sourceIdentity: want.sourceId, why: `the committed index pins ${entry.sha256}; this build binds ${want.sha256}` });
      continue;
    }
    const absolute = resolver.resolve(entry);
    if (!absolute || !fs.existsSync(absolute)) {
      failures.push({ sourceIdentity: want.sourceId, why: `the custody holding ${want.path} is not mounted here` });
      continue;
    }
    const bytes = fs.readFileSync(absolute);
    const digest = sha256(bytes);
    if (digest !== want.sha256) {
      failures.push({ sourceIdentity: want.sourceId, why: `SHA-256 drift: the corpus binary hashes ${digest}` });
      continue;
    }
    resolved[key] = {
      ...want, bytes, byteLength: bytes.length, custody: entry.custody,
      indexFormNumber: entry.formNumber, indexPageCount: entry.pageCount, indexAcroFieldCount: entry.acroFieldCount
    };
  }
  return { resolved, failures };
}

/**
 * The FI-05 identity check this family's stop was about.
 *
 * The digest matching the committed index proves the bytes are the ones the
 * queue pinned. Whether they are the document the family means is a question
 * about the document, so it is asked of the document: the printed form number
 * and title on page 1, the page count, and the Case Types List row that carries
 * this route's own case type.
 */
async function readFi05Identity(bytes) {
  const pdf = await PDFDocument.load(bytes, { updateMetadata: false });
  const pageCount = pdf.getPageCount();
  const fieldCount = pdf.getForm().getFields().length;
  /* Compared with whitespace removed: a PDF splits a printed line across as many
   * show-text operators as its kerning needs, and the spaces between them are
   * positioning rather than characters. */
  const text = (await pageTexts(pdf)).join("\n").replace(/\s+/g, "");
  const findings = {
    pageCount,
    acroFieldCount: fieldCount,
    printsFormNumberFI05: /SJRC\(04-23\)FI-05/i.test(text),
    printsConfidentialCaseFilingInformationSheet: /ConfidentialCaseFilingInformationSheet/i.test(text),
    printsNonDomesticRelationsVariant: /Non-DomesticRelations/i.test(text),
    printsCaseTypesList: /CASETYPESLIST/i.test(text),
    printsMarijuanaExpungementCaseTypeRow: /ExpungeMarijuanaCriminal\/ArrestRecords/i.test(text) && /X#/.test(text)
  };
  findings.isTheDocumentThisFamilyMeans = pageCount === 4 && findings.printsFormNumberFI05
    && findings.printsConfidentialCaseFilingInformationSheet && findings.printsNonDomesticRelationsVariant
    && findings.printsMarijuanaExpungementCaseTypeRow;
  return findings;
}

const inflate = (buf) => { try { return zlib.inflateSync(buf); } catch { return buf; } };

function contentStreamsOfPage(pdf, page) {
  const contents = page.node.Contents();
  const list = contents && contents.constructor.name === "PDFArray"
    ? contents.asArray().map((ref) => pdf.context.lookup(ref))
    : contents ? [contents] : [];
  return list.map((stream) => inflate(Buffer.from(stream.getContents())).toString("latin1"));
}

async function pageTexts(pdf) {
  const out = [];
  for (const page of pdf.getPages()) {
    const joined = contentStreamsOfPage(pdf, page).join("\n");
    let text = "";
    for (const token of joined.match(/\((?:[^()\\]|\\.)*\)|<[0-9A-Fa-f\s]{2,}>/g) ?? []) {
      text += token.startsWith("(")
        ? token.slice(1, -1).replace(/\\([()\\])/g, "$1")
        : Buffer.from(token.slice(1, -1).replace(/\s+/g, ""), "hex").toString("latin1");
    }
    out.push(text);
  }
  return out;
}

/* ---- fill and flatten ---------------------------------------------------- */
function normalizeRect(rect) {
  const x0 = Math.min(rect.x, rect.x + rect.width);
  const y0 = Math.min(rect.y, rect.y + rect.height);
  return {
    x: Number(x0.toFixed(3)), y: Number(y0.toFixed(3)),
    width: Number(Math.abs(rect.width).toFixed(3)), height: Number(Math.abs(rect.height).toFixed(3)),
    rawY: Number(rect.y.toFixed(3)), rawX: Number(rect.x.toFixed(3)),
    malformedInSource: rect.width < 0 || rect.height < 0
  };
}

function widgetPageIndex(pdf, widget) {
  const pages = pdf.getPages();
  for (let i = 0; i < pages.length; i += 1) {
    const annots = pages[i].node.Annots();
    if (!annots) continue;
    for (const ref of annots.asArray()) {
      if (pdf.context.lookup(ref) === widget.dict) return i;
    }
  }
  return -1;
}

/*
 * A STRING IN THE BYTES IS NOT A VALUE ON THE PAGE.
 *
 * A value written at a size that does not fit its widget is clipped by the
 * appearance's own clip path, and a proof that reads the string back out of the
 * stream sees the whole string while the page shows two thirds of it. Nebraska's
 * boundary fixture found this: a charge line ended "a Class IV felo" on the
 * paper and "a Class IV felony" in the bytes.
 *
 * So a size is FITTED before the value is set, measured with the same standard
 * Helvetica pdf-lib embeds when it regenerates the appearance, and the proof
 * measures every drawn run against its own box afterwards.
 */
const USABLE_PADDING_PT = 3;
const LINE_HEIGHT_FACTOR = 1.16;
const MIN_READABLE_PT = 5.5;

function fitValue(font, text, rect, requested, multiline) {
  const width = Math.max(1, rect.width - USABLE_PADDING_PT);
  const height = Math.max(1, rect.height - 2);
  let size = requested;
  const linesAt = (pt) => {
    if (!multiline) return [text];
    const lines = [];
    for (const paragraph of String(text).split("\n")) {
      let current = "";
      for (const word of paragraph.split(/\s+/)) {
        const next = current ? `${current} ${word}` : word;
        if (font.widthOfTextAtSize(next, pt) <= width || current === "") current = next;
        else { lines.push(current); current = word; }
      }
      lines.push(current);
    }
    return lines;
  };
  while (size > MIN_READABLE_PT) {
    const lines = linesAt(size);
    const widest = Math.max(...lines.map((line) => font.widthOfTextAtSize(line, size)));
    if (widest <= width && lines.length * size * LINE_HEIGHT_FACTOR <= height) break;
    size -= 0.25;
  }
  const lines = linesAt(size);
  const widest = Math.max(...lines.map((line) => font.widthOfTextAtSize(line, size)));
  return {
    size: Number(size.toFixed(2)),
    fits: widest <= width && lines.length * size * LINE_HEIGHT_FACTOR <= height,
    lines: lines.length, widestLinePt: Number(widest.toFixed(3)), usableWidthPt: Number(width.toFixed(3))
  };
}

/*
 * FLATTEN WITHOUT DELETING ANYTHING.
 *
 * pdf-lib's own form.flatten() ends each field with removeField(), which calls
 * context.delete() on the field's objects. The writer then emits an xref table
 * with entries for object numbers that no longer exist, and any reference left
 * pointing at one of them is dangling: copyPages reserves a slot for it and
 * writes nothing there. Poppler reported "Invalid XRef entry 93" on the first
 * Maryland artifact and had to reconstruct the table before it could draw a
 * page - on a document a court is meant to accept.
 *
 * This does the same drawing pdf-lib does, operator for operator, and then
 * DETACHES rather than deletes: the widget comes off the page's /Annots, the
 * field comes off the AcroForm's /Fields, and the AcroForm comes off the
 * catalog. Nothing is removed from the object table, so nothing can dangle, and
 * the orphans are unreachable from any page - so copyPages never carries them
 * into the assembled artifact at all.
 */
function detachAnnotation(pdf, page, dict) {
  const annots = page.node.Annots();
  if (!annots) return;
  const kept = annots.asArray().filter((ref) => pdf.context.lookup(ref) !== dict);
  if (kept.length !== annots.size()) page.node.set(PDFName.of("Annots"), pdf.context.obj(kept));
}

function flattenWithoutDeleting(pdf, form, writtenFields = new Set()) {
  /*
   * FIX01, CLIPPING_AND_OVERLAP. A BORDER THE OFFICIAL FORM DOES NOT PRINT.
   *
   * updateFieldAppearances() below regenerates an appearance for any check-box
   * or radio widget whose current /AS state has no entry in /AP /N, using
   * pdf-lib's default provider -- which paints a stroked square the size of the
   * widget /Rect. A form that ships only an on-state appearance and leaves the
   * widget at /Off has no /Off stream, so every unticked box on it acquires a
   * square, and the flatten below stamps that square onto the filing. Under
   * ISO 32000-1 12.5.5 a conforming viewer paints nothing at such a widget, so
   * the square is ink this build ADDS rather than ink the issuer authored.
   *
   * VF20 measured it on this family at 3687291a6: 29 refused widgets, a
   * directional 150 dpi diff against each page's own source page counting only
   * darker pixels, and a 300 dpi look. It is not caught by any of the nine
   * counters, because the counters read glyphs and this defect draws no glyph.
   *
   * suppressSynthesizedSelectionAppearances installs an EMPTY appearance for
   * the missing state, so needsAppearancesUpdate() is false and pdf-lib
   * regenerates nothing. A widget that ships its own /Off appearance is
   * untouched, and so is a box this run actually ticked -- hence writtenFields.
   * This is the same helper, called the same way and in the same position, that
   * the shared finalizer runs for its own callers behind
   * `suppressSynthesizedAppearances`; it is imported rather than reimplemented
   * so that this family and the finalizer's families cannot drift apart.
   */
  const synthesisSuppressed = suppressSynthesizedSelectionAppearances(pdf, form, writtenFields);
  form.updateFieldAppearances();
  const fields = form.getFields();
  for (const field of fields) {
    for (const widget of field.acroField.getWidgets()) {
      const page = form.findWidgetPage(widget);
      const appearanceRef = form.findWidgetAppearanceRef(field, widget);
      const xObjectKey = page.node.newXObject("FlatWidget", appearanceRef);
      const rectangle = widget.getRectangle();
      const operators = [
        pushGraphicsState(),
        translate(rectangle.x, rectangle.y),
        ...rotateInPlace({ ...rectangle, rotation: 0 }),
        drawObject(xObjectKey),
        popGraphicsState()
      ].filter(Boolean);
      page.pushOperators(...operators);
      detachAnnotation(pdf, page, widget.dict);
    }
    form.acroForm.removeField(field.acroField);
  }
  pdf.catalog.delete(PDFName.of("AcroForm"));
  return synthesisSuppressed;
}

async function fillDocument(sourceBytes, spec) {
  const pdf = await PDFDocument.load(sourceBytes);
  const form = pdf.getForm();
  const measuringFont = await (await PDFDocument.create()).embedFont(StandardFonts.Helvetica);
  const unfittable = [];
  const drawn = [];
  const geometry = new Map();
  /* The source's own "Off" appearance for a checkbox, captured before anything
   * is marked, so the byte proof can compare the flattened appearance against
   * it instead of assuming a mark is always a glyph. */
  const offAppearanceOf = (widget) => {
    try {
      const ap = pdf.context.lookup(widget.dict.get(PDFName.of("AP")));
      const normal = ap && pdf.context.lookup(ap.get(PDFName.of("N")));
      if (!normal || typeof normal.get !== "function") return null;
      const off = pdf.context.lookup(normal.get(PDFName.of("Off")));
      if (!(off instanceof PDFRawStream)) return null;
      return inflate(Buffer.from(off.contents)).toString("latin1");
    } catch { return null; }
  };
  /*
   * ONE FIELD, SEVERAL WIDGETS.
   *
   * A caption field repeated on every page of a form is ONE AcroForm field with
   * one widget per page, and setting it once puts ink on all of them. A proof
   * that recorded only the first widget counted the ink on the others as
   * unexplained marks and would have failed a correctly filled form for a defect
   * it did not have. Every widget is recorded, and every one is proved.
   */
  const record = (name) => {
    const field = form.getField(name);
    const widgets = field.acroField.getWidgets();
    const placements = widgets.map((widget) => {
      const rect = normalizeRect(widget.getRectangle());
      const page = widgetPageIndex(pdf, widget) + 1;
      assert.ok(page > 0, `a widget of ${name} is on no page of ${spec.documentId}`);
      return { rect, page };
    });
    assert.ok(placements.length > 0, `${spec.documentId}:${name} has no widget`);
    geometry.set(name, placements);
    return { field, widgets, placements };
  };
  const attach = (row, placements) => {
    row.rect = placements[0].rect;
    row.page = placements[0].page;
    row.widgetCount = placements.length;
    row.placements = placements.map((pl) => ({ page: pl.page, rect: pl.rect }));
  };
  for (const row of spec.writes) {
    const { field, widgets, placements } = record(row.name);
    attach(row, placements);
    if (row.kind === "checkbox") {
      const offs = widgets.map((widget) => offAppearanceOf(widget));
      field.check();
      placements.forEach((pl, i) => drawn.push({ ...row, rect: pl.rect, page: pl.page, widgetIndex: i, text: "✓", offAppearance: offs[i] }));
      continue;
    }
    const value = String(row.value ?? "");
    assert.ok(value.length > 0, `no fixture value for ${spec.documentId}:${row.name}`);
    if (row.kind === "dropdown") {
      field.select(value);
      placements.forEach((pl, i) => drawn.push({ ...row, rect: pl.rect, page: pl.page, widgetIndex: i, text: value }));
      continue;
    }
    if (row.multiline) field.enableMultiline();
    const narrowest = placements.reduce((a, b) => (a.rect.width <= b.rect.width ? a : b)).rect;
    const fit = fitValue(measuringFont, value, narrowest, row.size ?? 9, row.multiline === true);
    if (!fit.fits) unfittable.push({ field: `${spec.documentId}:${row.name}`, value, fit, rect: narrowest });
    field.setText(value);
    field.setFontSize(fit.size);
    row.fittedFontSize = fit.size;
    placements.forEach((pl, i) => drawn.push({ ...row, rect: pl.rect, page: pl.page, widgetIndex: i, text: value, fontSize: fit.size, fit }));
  }
  assert.equal(unfittable.length, 0,
    `${unfittable.length} value(s) do not fit their own widget even at ${MIN_READABLE_PT}pt: ${JSON.stringify(unfittable).slice(0, 1200)}`);
  for (const row of spec.blanks) {
    if (row.printedSlot) continue;
    const { placements } = record(row.name);
    attach(row, placements);
  }
  /*
   * Values the SOURCE carries, cleared rather than delivered.
   *
   * A chooser prompt like "(Enter the county name)" is a field default, not
   * printed page text, and a packet that leaves it in place delivers a filed
   * document with an instruction to itself printed in the caption. Every one
   * cleared here is declared in the field map and in build-findings.json, so
   * nothing is removed from a participant's document silently.
   */
  const cleared = [];
  for (const row of spec.clearedSourceDefaults ?? []) {
    const { field, placements } = record(row.name);
    const before = typeof field.getText === "function" ? field.getText() : null;
    field.setText("");
    cleared.push({ ...row, rect: placements[0].rect, page: placements[0].page, sourceCarriedValue: before ?? null });
  }
  /*
   * VIEWER CONTROLS ARE NOT FILING CONTENT.
   *
   * "Reset", "Clear Form", "Lock & Save Form" and "Top of Page" are push buttons
   * a reader clicks on screen. Flattening draws their captions onto the page, so
   * a packet that flattens without removing them delivers a filed document with
   * a picture of a Reset button printed on it - ten glyphs of ink nobody asked
   * for, on two Maryland forms, which is how this was found. Every push button
   * is removed before flattening and every one is recorded.
   */
  const viewerControlsRemoved = [];
  for (const field of form.getFields()) {
    if (!(field instanceof PDFButton)) continue;
    const name = field.getName();
    const widgets = field.acroField.getWidgets();
    const pages = widgets.map((widget) => widgetPageIndex(pdf, widget) + 1);
    /*
     * Detached, not deleted.
     *
     * pdf-lib's form.removeField() calls context.delete() on the field's own
     * objects, and the writer then emits an xref table with entries for object
     * numbers that no longer exist: poppler reported "Invalid XRef entry 93" on
     * the first Maryland artifact built that way and had to reconstruct the
     * table. The widget is taken off the page's /Annots and the field off the
     * AcroForm's /Fields instead. Nothing is deleted, the xref stays whole, and
     * the orphaned objects are simply not reachable from any page - so
     * copyPages never carries them into the assembled artifact.
     */
    for (const page of pdf.getPages()) for (const widget of widgets) detachAnnotation(pdf, page, widget.dict);
    form.acroForm.removeField(field.acroField);
    viewerControlsRemoved.push({ name, pages, kind: "push_button", detachedNotDeleted: true });
  }
  const synthesizedSelectionAppearancesSuppressed =
    flattenWithoutDeleting(pdf, form, new Set(spec.writes.map((row) => row.name)));
  return { pdf, drawn, cleared, viewerControlsRemoved, geometry,
    synthesizedSelectionAppearancesSuppressed };
}

/* ---- assembly ------------------------------------------------------------ */
async function assemble(filled, fixtureName) {
  const out = await PDFDocument.create();
  const manifest = [];
  for (const part of filled) {
    const pages = await out.copyPages(part.pdf, part.pdf.getPageIndices());
    pages.forEach((page, i) => {
      out.addPage(page);
      manifest.push({
        packetPage: out.getPageCount(), component: part.component, documentId: part.documentId,
        sourcePage: i + 1, sourceSha256: part.sourceSha256
      });
    });
  }
  out.setTitle(`${FAMILY_ID} ${fixtureName}`);
  out.setAuthor("Missouri Judiciary official forms, assembled without alteration of their printed content");
  out.setSubject("Petition for Expungement - Marijuana-Related Offense(s) under Mo. Const. art. XIV, sec. 2, with the Confidential Case Filing Information Sheets");
  out.setCreator("LegalEase deterministic official-form builder");
  out.setProducer("pdf-lib 1.17.1");
  out.setCreationDate(FIXED_DATE);
  out.setModificationDate(FIXED_DATE);
  const bytes = Buffer.from(await out.save({ useObjectStreams: false, addDefaultPage: false, objectsPerTick: Infinity }));
  return { bytes, manifest, pageCount: out.getPageCount() };
}

/* ---- the byte proof ------------------------------------------------------
 *
 * Read out of the saved bytes, never out of the drawing call's own report.
 * Every page content stream of the assembled artifact is decompressed, the
 * streams the source page already carried are excluded, each remaining
 * `/FlatWidget-n Do` is resolved to the XObject it names, that stream is
 * decompressed in turn, and every show-text operator inside it is decoded with
 * the matrix or text-offset that precedes it. The XObject's own placement `cm`
 * carries it back into page coordinates.
 * -------------------------------------------------------------------------- */
const PLACEMENT = /q\s*\n1 0 0 1 ([\d.-]+) ([\d.-]+) cm\s*\n(?:1 0 0 1 0 0 cm\s*\n)*\/(FlatWidget-\d+) Do\s*\nQ/g;
const DIRECT_SHOW = /1 0 0 1 (-?[\d.]+) (-?[\d.]+) Tm\s*\n<([0-9A-Fa-f]*)> Tj/g;

function decodeToken(token) {
  if (token.startsWith("(")) return token.slice(1, -1).replace(/\\([()\\])/g, "$1");
  return Buffer.from(token.slice(1, -1).replace(/\s+/g, ""), "hex").toString("latin1");
}

function runsOfAppearance(stream) {
  const runs = [];
  let font = null;
  let size = null;
  const token = "(\\((?:[^()\\\\]|\\\\.)*\\)|<[0-9A-Fa-f\\s]*>)";
  const re = new RegExp(
    `\\/(\\S+)\\s+([\\d.]+)\\s+Tf|([\\d.-]+)\\s+([\\d.-]+)\\s+Td|1 0 0 1 ([\\d.-]+)\\s+([\\d.-]+)\\s+Tm|${token}\\s*Tj`,
    "g"
  );
  let x = 0;
  let y = 0;
  let m;
  while ((m = re.exec(stream)) !== null) {
    if (m[1] !== undefined) { font = m[1]; size = Number(m[2]); continue; }
    if (m[3] !== undefined) { x = Number(m[3]); y = Number(m[4]); continue; }
    if (m[5] !== undefined) { x = Number(m[5]); y = Number(m[6]); continue; }
    if (m[7] !== undefined) runs.push({ font, size, x, y, text: decodeToken(m[7]) });
  }
  return runs;
}

/*
 * A TICK IS NOT ALWAYS TEXT.
 *
 * Missouri's FI-05 draws a marked box as a ZapfDingbats glyph; Nebraska's
 * CC 6:12 draws one as two stroked line segments, and Maryland's CC-DC-CR-072B
 * as its own path. A proof that looked only for show-text operators read the
 * second kind as an unmarked box, which is the worst direction for a route
 * election to be wrong in. So a marked box is proved three ways, and the
 * strongest available one decides: the flattened appearance must differ from
 * the source's own "Off" appearance for that same widget, and it must carry
 * ink - a show-text run, or more path moveto operators than clip paths.
 */
function markEvidence(placements, row) {
  const here = placements.filter((pl) =>
    Math.abs(pl.ox - row.rect.rawX) < 0.51 && Math.abs(pl.oy - row.rect.rawY) < 0.51);
  if (here.length === 0) return { marked: false, why: "no flattened appearance is placed at this widget's own /Rect", claimedInk: [] };
  const stream = here[0].stream;
  const runs = runsOfAppearance(stream).filter((r) => r.text.trim() !== "");
  const moveTos = (stream.match(/(?:^|[\s\n])-?[\d.]+\s+-?[\d.]+\s+m(?=[\s\n])/g) ?? []).length;
  const clips = (stream.match(/W\s*\n?\s*n/g) ?? []).length;
  const vectorMarkDrawn = moveTos > clips;
  const differsFromOff = typeof row.offAppearance === "string" ? stream !== row.offAppearance : null;
  const marked = differsFromOff === false ? false : (runs.length > 0 || vectorMarkDrawn);
  return {
    marked, differsFromOff, vectorMarkDrawn, moveToOperators: moveTos, clipPaths: clips,
    markKind: runs.length > 0 ? "show_text_glyph" : vectorMarkDrawn ? "stroked_vector_mark" : "none",
    font: runs[0]?.font ?? null,
    drawnText: runs.map((r) => r.text).join("").trim() || null,
    why: marked ? null
      : differsFromOff === false
        ? "the flattened appearance is byte-identical to the source's own Off appearance for this widget"
        : "the flattened appearance carries neither a show-text run nor path ink beyond its clip",
    claimedInk: []
  };
}

async function proveWrites(assembledBytes, sourceStreamsByPage, drawnByPage, fixtureName) {
  const pdf = await PDFDocument.load(assembledBytes, { updateMetadata: false });
  const measuringFont = await (await PDFDocument.create()).embedFont(StandardFonts.Helvetica);
  const pages = pdf.getPages();
  assert.equal(pages.length, sourceStreamsByPage.length, "the assembled artifact must carry one page per source page");
  const proofs = [];
  const unproved = [];
  let addedGlyphs = 0;
  let vectorMarks = 0;
  let outsideBoxes = 0;
  for (let p = 0; p < pages.length; p += 1) {
    const page = pages[p];
    const original = new Set(sourceStreamsByPage[p]);
    const added = contentStreamsOfPage(pdf, page).filter((s) => !original.has(s));
    const resources = page.node.get(PDFName.of("Resources"));
    const xObjectDict = resources ? pdf.context.lookup(resources).get(PDFName.of("XObject")) : null;
    const xObjects = new Map();
    if (xObjectDict) {
      for (const [name, ref] of pdf.context.lookup(xObjectDict).entries()) {
        const object = pdf.context.lookup(ref);
        if (!(object instanceof PDFRawStream)) continue;
        xObjects.set(name.asString().replace(/^\//, ""), inflate(Buffer.from(object.contents)).toString("latin1"));
      }
    }
    const placementsOnPage = [];
    const inkOnPage = [];
    for (const stream of added) {
      PLACEMENT.lastIndex = 0;
      let m;
      while ((m = PLACEMENT.exec(stream)) !== null) {
        const [ox, oy, name] = [Number(m[1]), Number(m[2]), m[3]];
        const appearance = xObjects.get(name);
        if (appearance === undefined) continue;
        placementsOnPage.push({ ox, oy, name, stream: appearance });
        for (const run of runsOfAppearance(appearance)) {
          if (run.text.trim() === "") continue;
          inkOnPage.push({ ...run, pageX: ox + run.x, pageY: oy + run.y, placementX: ox, placementY: oy, appearance: name });
        }
      }
      DIRECT_SHOW.lastIndex = 0;
      while ((m = DIRECT_SHOW.exec(stream)) !== null) {
        const text = Buffer.from(m[3], "hex").toString("latin1");
        if (text.trim() === "") continue;
        inkOnPage.push({ font: null, size: null, pageX: Number(m[1]), pageY: Number(m[2]), placementX: null, placementY: null, text, appearance: null });
      }
    }
    for (const ink of inkOnPage) addedGlyphs += ink.text.replace(/\s/g, "").length;
    const claimed = new Set();
    for (const row of (drawnByPage.get(p + 1) ?? [])) {
      if (row.kind === "checkbox") {
        const evidence = markEvidence(placementsOnPage, row);
        if (!evidence.marked) {
          unproved.push({ field: `${row.document}:${row.name}`, page: p + 1, expected: "a marked checkbox", why: evidence.why });
          continue;
        }
        if (evidence.vectorMarkDrawn) vectorMarks += 1;
        for (const ink of inkOnPage) {
          if (ink.placementX !== null
            && Math.abs(ink.placementX - row.rect.rawX) < 0.51 && Math.abs(ink.placementY - row.rect.rawY) < 0.51) claimed.add(ink);
        }
        proofs.push({
          field: `${row.document}:${row.name}`, fieldName: row.name, effectiveLabel: row.label,
          documentId: row.document, page: p + 1, factId: row.factId ?? null,
          expected: "a marked checkbox", drawnText: evidence.drawnText, markKind: evidence.markKind,
          differsFromTheSourceOffAppearance: evidence.differsFromOff,
          moveToOperators: evidence.moveToOperators, clipPaths: evidence.clipPaths,
          drawnAt: [{ x: row.rect.x, y: row.rect.y, fontSize: null, font: evidence.font }],
          declaredRect: row.rect,
          visibleInArtifactBytes: true, everyWidgetVisibleInArtifactBytes: true, insideDeclaredRect: true
        });
        continue;
      }
      const mine = inkOnPage.filter((ink) => ink.placementX !== null
        && Math.abs(ink.placementX - row.rect.rawX) < 0.51 && Math.abs(ink.placementY - row.rect.rawY) < 0.51);
      if (mine.length === 0) { unproved.push({ field: `${row.document}:${row.name}`, page: p + 1, expected: row.text }); continue; }
      for (const ink of mine) claimed.add(ink);
      const readBack = mine.map((ink) => ink.text).join(" ").replace(/\s+/g, " ").trim();
      const expected = String(row.text).replace(/\s+/g, " ").trim();
      if (readBack !== expected) {
        unproved.push({ field: `${row.document}:${row.name}`, page: p + 1, expected, readBack });
        continue;
      }
      let inside = true;
      const overruns = [];
      for (const ink of mine) {
        const top = ink.pageY + (ink.size ?? 0);
        const drawnWidth = ink.size ? measuringFont.widthOfTextAtSize(ink.text, ink.size) : 0;
        const right = ink.pageX + drawnWidth;
        if (right > row.rect.x + row.rect.width + 1) {
          inside = false;
          overruns.push({ text: ink.text, drawnWidthPt: Number(drawnWidth.toFixed(3)), rightEdgePt: Number(right.toFixed(3)), boxRightEdgePt: Number((row.rect.x + row.rect.width).toFixed(3)) });
        }
        if (ink.pageX < row.rect.x - 1 || ink.pageY < row.rect.y - 3 || top > row.rect.y + row.rect.height + 3) inside = false;
      }
      if (!inside) outsideBoxes += readBack.replace(/\s/g, "").length;
      proofs.push({
        field: `${row.document}:${row.name}`, fieldName: row.name, effectiveLabel: row.label,
        documentId: row.document, page: p + 1, factId: row.factId ?? null,
        expected, drawnText: readBack,
        drawnAt: mine.map((ink) => ({ x: Number(ink.pageX.toFixed(3)), y: Number(ink.pageY.toFixed(3)), fontSize: ink.size, font: ink.font,
          drawnWidthPt: ink.size ? Number(measuringFont.widthOfTextAtSize(ink.text, ink.size).toFixed(3)) : null })),
        runsWiderThanTheirOwnBox: overruns,
        declaredRect: row.rect,
        visibleInArtifactBytes: true, everyWidgetVisibleInArtifactBytes: true, insideDeclaredRect: inside
      });
    }
    for (const ink of inkOnPage) {
      if (claimed.has(ink)) continue;
      outsideBoxes += ink.text.replace(/\s/g, "").length;
    }
  }
  assert.equal(unproved.length, 0,
    `${unproved.length} declared write(s) are not readable in the ${fixtureName} output bytes: ${JSON.stringify(unproved).slice(0, 2000)}`);
  return { proofs, addedGlyphs, vectorMarks, outsideBoxes };
}

/* ---- the field map ------------------------------------------------------- */
function productionFieldMap(parts, agencies) {
  const writes = [];
  const refusals = [];
  for (const part of parts) {
    for (const row of part.spec.writes) {
      writes.push({
        fieldId: `${part.documentId}:${row.name}`, fieldName: row.name, field: row.name,
        effectiveLabel: row.label, printedLabel: row.label, sourceLabel: row.label,
        documentId: part.documentId, component: part.component,
        page: row.packetPage, sourcePage: row.page, widgetCount: row.widgetCount ?? 1, widgets: row.placements ?? null, factId: row.factId ?? null,
        rect: row.rect, rectBasis: `the /Rect of the AcroForm widget named ${JSON.stringify(row.name)} on page `
          + `${row.page} of the source binary${row.rect?.malformedInSource ? ", normalized because the source writes this rect bottom-edge-last and its height reads negative" : ""}`,
        kind: row.kind === "checkbox" ? "selection_control" : "acroform_text_field",
        disposition: row.kind === "checkbox"
          ? (row.caseDetermined ? "selected_from_held_case_fact" : "selected_by_route")
          : "written",
        routeDetermined: row.routeDetermined === true,
        determinedByTheCaseNotTheRoute: row.caseDetermined === true,
        selectionBasis: row.basis ?? null
      });
    }
    for (const row of part.spec.blanks) {
      refusals.push({
        fieldId: `${part.documentId}:${row.name}`, fieldName: row.name, field: row.name,
        effectiveLabel: row.label, printedLabel: row.label,
        documentId: part.documentId, component: part.component,
        page: row.packetPage ?? null, sourcePage: row.page ?? null,
        rect: row.rect ?? null, printedSlot: row.printedSlot === true,
        isSelectionControl: row.isSelectionControl === true,
        kind: row.isSelectionControl === true ? "selection_control" : "acroform_text_field",
        reason: row.supply ? `the participant supplies this before filing: ${row.supply}` : row.reason,
        refusalClass: row.refusalClass ?? null,
        completenessDisposition: row.disposition ?? null,
        requiredBeforeFiling: row.requiredBeforeFiling === true,
        routeDetermined: false,
        routeConditionThatMakesItInapplicable: row.routeConditionThatMakesItInapplicable ?? null,
        factAvailable: false, factId: null,
        identity: `${part.documentId} field ${row.name}`,
        participantMustSupply: row.supply ?? null,
        role: row.role ?? "participant",
        why: row.why ?? row.reason
      });
    }
  }
  return {
    schemaVersion: "rcap-production-field-map/v2",
    familyId: FAMILY_ID, worklistGroupId: FAMILY_ID, jurisdiction: "MO",
    implementationStrategy: "official_pdf_fill", routeKeys: ROUTE_KEYS,
    structuralClass: "flattened_acroform",
    captionBasis: "every write box is the /Rect of the source's own AcroForm widget, read from the binary at build "
      + "time and normalized where the source writes a rect bottom-edge-last. No coordinate in this map is "
      + "hand-entered, and every write is proved back out of the saved content streams and flattened appearances.",
    routeSelectionNote:
      "This packet is built for the Article XIV, section 2 marijuana expungement petition. Three elections the "
      + "route determines are made by the packet rather than left to the participant: the Case Type Code and Case "
      + "Type Description on every FI-05 sheet (X#, Expunge Marijuana Criminal/Arrest Records, taken from the "
      + "census destination record and matched to the description printed beside that code on page 4 of the "
      + "FI-05 Case Types List), and the three record-holding "
      + "agencies CR375 names as Defendant(s) that are true of every case on this route - the court that entered "
      + "the conviction, the MSHP CJIS Division as the state central repository, and the office that prosecuted "
      + "the case. The incarceration pair is determined by the case, not the route, and is stated from the held "
      + "screening fact. Race, ethnicity, sex and the further arresting agencies stay with the person filing.",
    routeSelectionsMade: [
      { routeKey: FILING_ROUTE_KEY, selection: `FI-05 Case Type Code ${CASE_TYPE_CODE} (${CASE_TYPE_DESCRIPTION})`,
        sourceSupport: "the census destination record, which records this route as filed \"with FI-05 at case type X#\". The FI-05 Case Types List prints that code beside that description on its page 4, in the ASSOCIATE column; it does not place the row in CIRCUIT, and that division question is open with counsel" },
      { routeKey: FILING_ROUTE_KEY, selection: `Defendant: ${agencies.courtAgency}`,
        sourceSupport: "the court that entered the conviction holds the record this petition asks to expunge" },
      { routeKey: FILING_ROUTE_KEY, selection: `Defendant: ${agencies.mshp}`,
        sourceSupport: "the MSHP CJIS Division is Missouri's central repository for criminal history record information" },
      { routeKey: FILING_ROUTE_KEY, selection: `Defendant: ${agencies.prosecutor}`,
        sourceSupport: "the office that prosecuted the case holds its file" }
    ],
    dispositionVocabulary: [SIGNATURE_CLASS, ELECTION_CLASS],
    writes, refusals
  };
}

/* ---- the builder's own counters (not a verdict) --------------------------- */
function builderCounters(map, artifacts, instructions) {
  const counters = Object.fromEntries(PASS_COUNTERS.map((c) => [c, 0]));
  const findings = [];
  const note = (counter, detail) => { counters[counter] += 1; findings.push({ counter, ...detail }); };
  const norm = (x) => String(x ?? "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
  const writes = map.writes.map((w) => ({ ...w, name: w.fieldName, label: w.effectiveLabel, document: w.documentId, isSelectionControl: false }));
  const blanks = map.refusals.map((r) => ({ ...r, name: r.fieldName, label: r.effectiveLabel, document: r.documentId, isSelectionControl: r.isSelectionControl === true }));

  const availableFacts = new Set(writes.map((w) => w.factId).filter(Boolean));
  const writtenInDocument = new Map();
  for (const w of writes) {
    const doc = String(w.document ?? "");
    if (!writtenInDocument.has(doc)) writtenInDocument.set(doc, new Set());
    for (const key of [norm(w.label), norm(w.name)]) if (key.length >= 4) writtenInDocument.get(doc).add(key);
  }
  for (const w of writes) {
    if (classifyField(w.label, false).requirement === "PROTECTED") note("protectedWrites", { field: w.fieldId, label: w.label });
  }
  const ledger = [];
  for (const blank of blanks) {
    const here = writtenInDocument.get(String(blank.document ?? "")) ?? new Set();
    const declared = {
      sourcePresentation: null,
      disposition: blank.completenessDisposition ?? null,
      ...(Object.hasOwn(blank, "requiredBeforeFiling") ? { requiredBeforeFiling: blank.requiredBeforeFiling === true } : {}),
      routeDetermined: blank.routeDetermined === true,
      factAvailable: (blank.factId ? availableFacts.has(String(blank.factId)) : false)
        || here.has(norm(blank.label)) || here.has(norm(blank.name)),
      routeConditionThatMakesItInapplicable: blank.routeConditionThatMakesItInapplicable ?? null,
      determinedByTheCaseNotTheRoute: false, whyTheRouteCannotDetermineIt: null,
      factId: blank.factId ?? null, identity: blank.identity ?? blank.field ?? blank.fieldId
    };
    const verdict = classifyBlank(blank, blank.reason, blank.refusalClass ?? null, declared);
    ledger.push({ ...blank, ...verdict });
    if (BLANK_DISPOSITIONS[verdict.disposition].allowed) continue;
    if (verdict.disposition === "KNOWN_FACT_NOT_WRITTEN") note("knownRequiredFieldsMissing", { field: blank.fieldId, label: blank.label, basis: verdict.basis });
    else if (verdict.disposition === "ROUTE_OPTION_NOT_SELECTED") note("requiredOptionsMissing", { field: blank.fieldId, label: blank.label, basis: verdict.basis });
    else note("unclassifiedBlanks", { field: blank.fieldId, label: blank.label, basis: verdict.basis });
  }
  for (const b of ledger.filter((x) => x.disposition === "REQUIRED_BEFORE_FILING")) {
    const needles = [b.label, b.fieldId, b.identity].map((x) => String(x ?? "").trim()).filter((x) => x.length >= 3);
    if (needles.some((n) => instructions.toLowerCase().includes(n.toLowerCase().slice(0, 60)))) continue;
    note("requiredFactsNotCollected", { field: b.fieldId, label: b.label });
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
  for (const a of artifacts) {
    const visible = (a.addedGlyphsReadFromOutputBytes ?? 0) + (a.flattenedWidgetAppearancesReadFromOutputBytes ?? 0);
    if ((a.valuesReportedByFinalizer ?? 0) > 0 && visible === 0) note("invisibleWrites", { fixture: a.fixture });
    if ((a.nonWhitespaceGlyphsOutsideMeasuredWriteBoxes ?? 0) > 0) note("visualDefects", { fixture: a.fixture, glyphsOutsideMeasuredBoxes: a.nonWhitespaceGlyphsOutsideMeasuredWriteBoxes });
    for (const r of a.refusedFieldsWithInk ?? []) note("protectedWrites", { fixture: a.fixture, field: r });
  }
  const declaredComponents = new Set([CR375, FI05, FI05_CONT]);
  const mapped = new Set([...writes, ...blanks].map((f) => f.document).filter(Boolean));
  for (const doc of mapped) if (!declaredComponents.has(doc)) note("requiredComponentsMissing", { component: doc });
  return { counters, findings, ledger, terminalFields: writes.length + blanks.length, written: writes.length, blank: blanks.length };
}

/* ---- the two participant-facing documents -------------------------------- */
function participantInstructions(ledger, agencies) {
  const rbf = ledger.filter((x) => x.disposition === "REQUIRED_BEFORE_FILING");
  const elections = ledger.filter((x) => x.disposition === "PARTICIPANT_ELECTION_GENUINE");
  const lines = [
    "# Before you sign or file this petition",
    "",
    "This packet is the Missouri Supreme Court's own CR375, *Petition for Expungement - Marijuana-Related",
    "Offense(s)*, filed under Article XIV, section 2 of the Missouri Constitution, together with the two",
    "Confidential Case Filing Information Sheets (FI-05) the clerk needs to open the case. It is a prepared draft.",
    "It is not legal advice, it is not signed, and it has not been filed.",
    "",
    "## Read this first",
    "",
    "The petition is drafted for the Article XIV, section 2 marijuana route only. Before you sign it, check every",
    "drafted fact against your own court record on Case.net. You are signing under penalty of perjury.",
    "",
    "## What the packet answered because the route answers it",
    "",
    "- **Case Type Code X#, Expunge Marijuana Criminal/Arrest Records.** The held record for this route says a",
    "  Missouri marijuana expungement is filed at that case type, and the FI-05 Case Types List on page 4 of the",
    "  sheet prints that description beside that code, so the packet fills it in rather than asking you to look it",
    "  up. If the clerk tells you a different case type applies, use the clerk's.",
    "- **Three agencies are already named as Defendant(s) on the petition:**",
    `  ${agencies.courtAgency}; ${agencies.mshp}; and ${agencies.prosecutor}.`,
    "  Those three hold a record of a Missouri marijuana conviction in every case on this route: the court that",
    "  entered it, the state central repository, and the office that prosecuted it.",
    "- **The statement that you are not currently incarcerated or on probation for a marijuana offense** is marked",
    "  from the screening answer you gave. If that is no longer true, stop: the other box applies to you, this",
    "  packet is drafted for the wrong branch, and the relief you can ask for is different.",
    "",
    "## What only you can decide, and nothing here can decide for you",
    ""
  ];
  const seen = new Set();
  for (const e of elections) {
    const key = `${e.label}`;
    if (seen.has(key)) continue;
    seen.add(key);
    lines.push(`- **${e.label}.** ${e.why}`);
  }
  lines.push(
    "",
    "Race, ethnicity and sex on page 2 of the petition and on the filing sheets are left blank on purpose. They are",
    "self-identification, and nothing here will state them about you.",
    "",
    /*
     * THE WAIVER ROUTE THE RECORD NAMES, TOLD TO THE PARTICIPANT.
     *
     * MO.memo.json rules.feeWaiver for this track names a waiver route by form
     * number and authority: "GN10 under Rule 77.03 and § 514.040 where the
     * participant cannot pay and the filing court accepts the statewide form.
     * Not generated by default on this route, because a large share of Article
     * XIV participants have no filing to pay for." The packet stated that route
     * nowhere -- no occurrence of "waiver", "GN10", "514.040", "77.03", "cannot
     * pay" or "poor person" in any delivered participant byte.
     *
     * The record's reason bears on whether to GENERATE the form. It does not
     * bear on whether to TELL the participant the route exists, and it concedes
     * on its own face that some participants on this route do have a filing to
     * pay for -- which is the population a waiver serves. That decision is not
     * disturbed here: GN10 is still not generated and nothing on it is filled
     * in. The participant is simply told it exists.
     *
     * The form's identity is held on the FORM'S OWN PRINTED BYTES, not on the
     * memo's wording, which is the discipline a shared-manifest fee premise has
     * already failed once in this factory. Read from the held binary at
     * sha256 13ff25147df2c70eec85b2d498f486aae9c2b46c535f9f9d7992b6247480421e:
     * the title line reads "Motion and Affidavit in Support of Request to
     * Proceed As a Poor Person"; the footer reads "SJRC (07-15) GN10 PAGE 1 of
     * 1 SCR 77.03, 514.040, RSMo"; the signature line reads "I swear/affirm
     * under penalty of perjury that these facts are true to my best knowledge
     * and belief." Every sentence below is one of those readings or a statement
     * about what the track record says.
     *
     * NOT CARRIED ACROSS: a sibling MO track's component note says the order
     * granting leave "is on page two of the form". The held GN10 footer says
     * PAGE 1 of 1 and the document carries no order block. That sentence is not
     * repeated here.
     *
     * No amount, no means test and no eligibility conclusion is stated,
     * because no held source states one for this route.
     */
    "## If you cannot pay what the clerk asks",
    "",
    "This packet states no filing fee, because no held source sets one for this route. If the clerk asks for money",
    "you cannot pay, Missouri has a statewide form for asking the court to let you go ahead without paying costs:",
    "**Motion and Affidavit in Support of Request to Proceed As a Poor Person**, form **GN10**, which cites Missouri",
    "Supreme Court Rule 77.03 and section 514.040 RSMo in its own footer.",
    "",
    "**This packet does not include GN10, and it fills in no part of it.** Ask the clerk of the court you are filing",
    "in for the form, or for whatever that court uses instead. The record ties the statewide form to courts that",
    "accept it, and does not establish that every Missouri court does, so the clerk is the one to ask.",
    "",
    "GN10 asks for your income, your expenses, your assets and your debts, and you swear to them under penalty of",
    "perjury. Fill it in yourself and sign it yourself. Nothing here says you will qualify, and nothing here says",
    "the court will grant it - that is the court's decision, not this packet's.",
    "",
    ...REQUIRED_BEFORE_FILING_LINES,
    "",
    "## What you must supply before filing",
    "",
    "| Blank | What you must supply |",
    "| --- | --- |"
  );
  for (const r of rbf) {
    lines.push(`| ${String(r.label).replaceAll("|", "-")} | ${String(r.participantMustSupply ?? "").replaceAll("|", "-")} |`);
  }
  /*
   * Two blanks the packet declares required-before-filing do not reach that
   * disposition in the shared contract, and both are disclosed here anyway.
   *
   * The contract classifies a field from its printed label, and its
   * court-assigned pattern matches the word "department". CR375 prints
   * "County Sheriff's Dept." and "Municipal Police Dept.", so a faithful label
   * for either blank carries that word and the contract reads them as fields
   * the court completes after filing. They are nothing of the sort: they are
   * the participant's own to fill if a sheriff or a city police department
   * arrested them. The label is not reworded to move the classifier, and the
   * disclosure is made regardless of which disposition the blank landed in.
   */
  const declaredButClassifiedElsewhere = ledger.filter((x) =>
    x.requiredBeforeFiling === true && x.disposition !== "REQUIRED_BEFORE_FILING");
  if (declaredButClassifiedElsewhere.length > 0) {
    lines.push(
      "",
      "These are yours to fill too. They are listed separately only because the shared completeness contract reads",
      "the word \"Dept.\" in their printed captions as a field the court fills in after filing, which they are not:",
      ""
    );
    for (const r of declaredButClassifiedElsewhere) {
      lines.push(`- **${r.label}** - ${r.participantMustSupply ?? "supply this before you file."}`);
    }
  }
  lines.push(
    "",
    "## What is deliberately left blank",
    "",
    "Your signature on page 2 of the petition is blank. Sign it yourself, after you have read the whole petition.",
    "The filing date on each filing sheet is blank: a date written before the filing happened would be false.",
    "Your Social Security number is blank. Missouri Supreme Court Operating Rule 4.07 requires it on the",
    "confidential sheet, and this packet does not hold or print Social Security numbers. Write it in yourself.",
    "The judge or division line at the top of the petition is the court's to complete.",
    "",
    "## Stop conditions",
    "",
    "Stop using this self-help packet and talk to a lawyer if any of these is true. They are the conditions the",
    "Missouri record for this route states, in its own words:",
    "",
    ...SELF_HELP_STOP_CONDITIONS.map((condition) => `- ${condition}`),
    "",
    "Stop as well if any conviction you are asking to expunge was not a Missouri marijuana offense, or if any",
    "charge against you is still pending. Those two are route boundaries rather than conditions of the record: a",
    "non-marijuana conviction is not on this route at all, and a pending charge is a different posture from the",
    "one this packet is drafted for.",
    "",
    `Routes: ${ROUTE_KEYS.join(", ")}`,
    ""
  );
  return lines.join("\n");
}

function filingInstructions(agencies) {
  return `# Filing instructions - Missouri Article XIV marijuana expungement

## Before you file

1. Read the whole petition and both Confidential Case Filing Information Sheets.
2. Check every drafted fact against your own court record. Case.net at
   https://www.courts.mo.gov/casenet/base/welcome.do shows the case number, the court and the division.
3. Add any further marijuana conviction you want expunged to the empty rows of the table on page 2 of the
   petition, and attach additional sheets if nine rows are not enough.
4. Add any arresting agency the packet did not name - a county sheriff, a municipal police department, or any
   other agency you believe holds a record - and check the box beside it. The packet named
   ${agencies.courtAgency}, ${agencies.mshp} and ${agencies.prosecutor}, and no others.
5. Fill in your Social Security number, your date of birth and the party type codes on the filing sheets, and
   select your own race, ethnicity and sex on the petition if you choose to.
6. Sign and date nothing until the whole set is complete. Then sign the petition.

## Where it goes

File the petition with the clerk of the Missouri circuit court where the conviction was charged or where you were
found guilty - the court shown in the caption. Hand the clerk both Confidential Case Filing Information Sheets
with it. The case type is X#, Expunge Marijuana Criminal/Arrest Records, and the sheets already say so.

## The other half of this route

Article XIV also directs relief the court orders on its own motion, with no petition from you. If your sentence
is already complete the court may have expunged the record already, and if you are on supervision the vacatur is
automatic. Before you file, search Case.net for your case, and ask the clerk of that court whether an order or a
certificate of expungement has already been entered. If it has, you do not need this petition; ask the clerk for
a copy of the certificate instead. You can also request your own criminal history record from the Missouri State
Highway Patrol at https://www.machs.mo.gov/ to see what the state repository still shows.

## Fees

The held sources establish no filing fee for this petition and this packet states no amount. Ask the clerk.

**If you cannot pay what the clerk asks.** Missouri has a statewide form for asking the court to let you proceed
without paying costs: Motion and Affidavit in Support of Request to Proceed As a Poor Person, form GN10, which
cites Missouri Supreme Court Rule 77.03 and section 514.040 RSMo in its own footer. **This packet does not include
GN10 and fills in no part of it.** Ask the clerk of the court you are filing in for the form, or for whatever that
court uses instead - the record ties the statewide form to courts that accept it and does not establish that every
court does. GN10 is sworn under penalty of perjury: fill it in yourself and sign it yourself. Nothing here says you
will qualify or that the court will grant it.

## What this packet is not

This is a prepared set of the court's own forms. It is not legal advice, it is not filed for you, and it does not
decide whether the court will expunge your record.

Routes: ${ROUTE_KEYS.join(", ")}
`;
}

/* ---- build --------------------------------------------------------------- */
function partsFor(facts) {
  const plans = fi05Plans(facts);
  return {
    agencies: plans.agencies,
    parts: [
      { key: CR375, documentId: CR375, component: "primary_filing", spec: cr375Spec(facts) },
      { key: FI05, documentId: FI05, component: "cover_sheet",
        spec: fi05Spec(FI05, facts, plans.cover, "the Confidential Case Filing Information Sheet filed with the petition") },
      { key: FI05, documentId: FI05_CONT, component: "continuation",
        spec: fi05Spec(FI05_CONT, facts, plans.continuation,
          "an additional Confidential Case Filing Information Sheet, which is what the form's own instruction directs when one sheet does not hold every party") }
    ]
  };
}

async function sourcePageStreams(bytes) {
  const pdf = await PDFDocument.load(bytes, { updateMetadata: false });
  return pdf.getPages().map((page) => contentStreamsOfPage(pdf, page));
}

async function renderFixture(resolved, fixtureName, facts) {
  const { parts, agencies } = partsFor(facts);
  const filled = [];
  const sourceStreamsByPage = [];
  const drawnByPage = new Map();
  let offset = 0;
  for (const part of parts) {
    const source = resolved[part.key];
    const result = await fillDocument(source.bytes, part.spec);
    for (const row of result.drawn) {
      row.document = part.documentId;
      row.packetPage = offset + row.page;
      const list = drawnByPage.get(row.packetPage) ?? [];
      list.push(row);
      drawnByPage.set(row.packetPage, list);
    }
    for (const row of part.spec.writes) row.packetPage = offset + (row.page ?? 0);
    for (const row of part.spec.blanks) row.packetPage = offset + (row.page ?? 0);
    sourceStreamsByPage.push(...(await sourcePageStreams(source.bytes)));
    filled.push({ pdf: result.pdf, documentId: part.documentId, component: part.component, sourceSha256: source.sha256 });
    offset += source.pageCount;
  }
  const assembled = await assemble(filled, fixtureName);
  const proof = await proveWrites(assembled.bytes, sourceStreamsByPage, drawnByPage, fixtureName);
  const drawnCount = [...drawnByPage.values()].reduce((n, list) => n + list.length, 0);
  return { ...assembled, ...proof, parts, agencies, drawnCount };
}

async function build(argv = process.argv.slice(2)) {
  const { resolved, failures } = resolveSources();
  if (failures.length > 0) {
    return { familyId: FAMILY_ID, status: "STOPPED", stopClass: "BLOCKED_SOURCE",
      failedSourceIdentities: failures, overlayDirectoryTouched: false };
  }
  const fi05Identity = await readFi05Identity(resolved[FI05].bytes);
  if (!fi05Identity.isTheDocumentThisFamilyMeans) {
    return { familyId: FAMILY_ID, status: "STOPPED", stopClass: "BLOCKED_SOURCE",
      failedSourceIdentities: [{ sourceIdentity: SOURCES[FI05].sourceId,
        why: "the pinned bytes hash correctly but the document they carry is not the FI-05 this family means",
        readFromTheDocument: fi05Identity }],
      overlayDirectoryTouched: false };
  }

  const fixtures = {};
  for (const [name, facts] of Object.entries(FIXTURES)) fixtures[name] = await renderFixture(resolved, name, facts);

  const map = productionFieldMap(fixtures.canonical.parts, fixtures.canonical.agencies);
  /* Push buttons detached before flattening, so a viewer control is never drawn
   * onto a filed page. Declared rather than done quietly. */
  map.viewerControlsRemoved = fixtures.canonical.viewerControlsRemoved;
  const artifactCounters = Object.entries(fixtures).map(([fixture, f]) => ({
    fixture,
    valuesReportedByFinalizer: f.drawnCount,
    /*
     * FIX01. This was the literal 0, beside a real reading of the same quantity
     * carried under flattenedShowTextGlyphsReadFromOutputBytes below. Every
     * reader in this factory looks for the canonical name, so the packet
     * published a source-authored zero where it held a measurement. The number
     * is f.addedGlyphs either way: non-whitespace glyphs decoded from the show-
     * text operators of the flattened appearance streams of the SAVED bytes,
     * with the streams the source page already carried excluded. The sibling
     * key is kept so nothing that reads it breaks.
     */
    addedGlyphsReadFromOutputBytes: f.addedGlyphs,
    flattenedWidgetAppearancesReadFromOutputBytes: f.addedGlyphs + f.vectorMarks,
    flattenedShowTextGlyphsReadFromOutputBytes: f.addedGlyphs,
    flattenedVectorMarksReadFromOutputBytes: f.vectorMarks,
    nonWhitespaceGlyphsOutsideMeasuredWriteBoxes: f.outsideBoxes,
    refusedFieldsWithInk: []
  }));

  const preliminary = builderCounters(map, artifactCounters, "");
  const instructions = participantInstructions(preliminary.ledger, fixtures.canonical.agencies);
  const audit = builderCounters(map, artifactCounters, instructions);
  const allZero = PASS_COUNTERS.every((c) => audit.counters[c] === 0);
  if (!allZero) {
    return { familyId: FAMILY_ID, status: "STOPPED", stopClass: "COMPLETENESS_COUNTER_NOT_ZERO",
      nonZeroCounters: PASS_COUNTERS.filter((c) => audit.counters[c] > 0),
      counters: audit.counters, findings: audit.findings.slice(0, 40), overlayDirectoryTouched: false };
  }

  const out = path.join(ROOT, OUT_REL);
  fs.mkdirSync(path.join(out, "fixtures"), { recursive: true });
  fs.mkdirSync(path.join(out, "reports"), { recursive: true });
  for (const [name, f] of Object.entries(fixtures)) fs.writeFileSync(path.join(out, "fixtures", `${name}.pdf`), f.bytes);

  const artifactRows = Object.entries(fixtures).map(([fixture, f]) => ({
    fixture, file: `${OUT_REL}/fixtures/${fixture}.pdf`,
    sha256: sha256(f.bytes), byteLength: f.bytes.length, pageCount: f.pageCount,
    documents: [
      { documentId: CR375, componentKinds: ["primary_filing"], sourceSha256: resolved[CR375].sha256 },
      { documentId: FI05, componentKinds: ["cover_sheet"], sourceSha256: resolved[FI05].sha256 },
      { documentId: FI05_CONT, componentKinds: ["continuation"], sourceSha256: resolved[FI05].sha256 }
    ],
    pageManifest: f.manifest
  }));

  writeJson(path.join(out, "production-field-map.json"), map);
  writeJson(path.join(out, "source-receipt.json"), {
    schemaVersion: "rcap-family-source-receipt/v1",
    familyId: FAMILY_ID, worklistGroupId: FAMILY_ID, jurisdiction: "MO",
    implementationStrategy: "official_pdf_fill", custodyClass: "NO_ACQUISITION_TASK_NAMED",
    acquisitionCommissioned: false, allSourcesExact: true,
    bindingMethod: "committed corpus-index path + index SHA-256 + on-disk SHA-256, re-read at build time",
    compositionSources: [
      { path: MO_MEMO_PATH, sha256: sha256(MO_MEMO_BYTES), byteLength: MO_MEMO_BYTES.length,
        whatItSupplies: `the ${REQUIRED_BEFORE_FILING_DOCUMENTS.length} required-before-filing supporting `
          + `document(s) and the ${SELF_HELP_STOP_CONDITIONS.length} self-help stop condition(s) printed in `
          + "participant-instructions.md. Both are read from this record at build time and the build refuses if "
          + "it stops declaring them, so that text moves only when this hash moves." }
    ],
    fi05IdentityReadFromTheDocument: {
      whyItWasRead: "this family stopped BLOCKED_SOURCE because official-form:FI-05 matched zero committed index "
        + "entries by form number: it lives in the Nationwide recovery pool, whose 380 entries all carry "
        + "formNumber null. The resolver now confirms the pinned digest against the committed index instead. A "
        + "matching digest proves the bytes are the bytes somebody pinned, not that they are the document this "
        + "family means, so the document itself was read.",
      ...fi05Identity
    },
    documents: [
      { sourceIds: [SOURCES[CR375].sourceId], formNumber: CR375, documentId: CR375, revision: SOURCES[CR375].revision,
        pathInArchive: SOURCES[CR375].path, custody: resolved[CR375].custody, sha256: resolved[CR375].sha256,
        byteLength: resolved[CR375].byteLength, componentKinds: ["primary_filing"], pages: [1, 2] },
      { sourceIds: [SOURCES[FI05].sourceId], formNumber: FI05, documentId: FI05, revision: SOURCES[FI05].revision,
        pathInArchive: SOURCES[FI05].path, custody: resolved[FI05].custody, sha256: resolved[FI05].sha256,
        byteLength: resolved[FI05].byteLength, componentKinds: ["cover_sheet"], pages: [1, 2, 3, 4] },
      { sourceIds: [SOURCES[FI05].sourceId], formNumber: FI05, documentId: FI05_CONT, revision: SOURCES[FI05].revision,
        pathInArchive: SOURCES[FI05].path, custody: resolved[FI05].custody, sha256: resolved[FI05].sha256,
        byteLength: resolved[FI05].byteLength, componentKinds: ["continuation"], pages: [1, 2, 3, 4],
        sameBinaryAs: FI05,
        whyTheSameBinaryTwice: "FI-05 prints its own continuation instruction: \"If additional space is needed, "
          + "complete additional Confidential Case Filing Information Sheets.\" This petition has four parties and "
          + "one sheet holds three, so the packet carries a second sheet rather than implying a form that does not exist." }
    ],
    commercialRoutesOpened: 0
  });
  writeJson(path.join(out, "reports", "actual-writes.json"), {
    schemaVersion: "rcap-actual-writes-byte-proof/v1", familyId: FAMILY_ID,
    derivedFromArtifactBytes: true,
    proofMethod: "each saved fixture is re-opened, every page content stream is decompressed, the streams the "
      + "source page already carried are excluded, each remaining /FlatWidget-n Do is resolved to its XObject, that "
      + "stream is decompressed, and every show-text operator in it is decoded with the matrix or text offset that "
      + "precedes it and carried back into page coordinates by the placement cm. A write is proved only when its "
      + "exact string is found at the coordinates the widget's own normalized /Rect declares.",
    documents: Object.entries(fixtures).map(([fixture, f]) => ({ fixture, actualWrites: f.proofs })),
    artifacts: artifactCounters
  });
  writeJson(path.join(out, "reports", "rendered-artifacts.json"), {
    schemaVersion: "rcap-rendered-artifacts/v2", familyId: FAMILY_ID, renderedFresh: true,
    componentSet: ["primary_filing", "cover_sheet", "continuation"],
    componentIdentityMode: "exact",
    artifacts: artifactRows,
    packets: artifactRows.map((a) => ({ fixture: a.fixture, file: a.file, sha256: a.sha256, byteLength: a.byteLength, pageCount: a.pageCount, documents: a.documents, pageManifest: a.pageManifest })),
    rasterEngine: null,
    rasterState: "BUILT_RASTER_PENDING"
  });
  writeJson(path.join(out, "reports", "builder-completeness-counters.json"), {
    schemaVersion: "rcap-builder-completeness-counters/v1", familyId: FAMILY_ID,
    thisIsNotAVerdict: "A builder verdict is not a verdict. These counters are the builder contract's own "
      + "obligation, computed with scripts/rcap-packet-completeness/completeness-contract.mjs. An independent "
      + "verification lane that did not build this packet decides whether it passes.",
    counters: audit.counters, allNineZero: allZero,
    totals: { terminalFields: audit.terminalFields, written: audit.written, blank: audit.blank },
    blanksByDisposition: audit.ledger.reduce((acc, b) => { acc[b.disposition] = (acc[b.disposition] ?? 0) + 1; return acc; }, {}),
    findings: audit.findings
  });
  writeJson(path.join(out, "reports", "blanks-left-for-the-participant.json"), {
    schemaVersion: "rcap-blank-ledger/v1", familyId: FAMILY_ID,
    blanks: audit.ledger.map((b) => ({
      field: b.fieldId, documentId: b.documentId, page: b.page, label: b.effectiveLabel,
      disposition: b.disposition, basis: b.basis, participantMustSupply: b.participantMustSupply ?? null
    }))
  });
  fs.writeFileSync(path.join(out, "participant-instructions.md"), instructions);
  fs.writeFileSync(path.join(out, "filing-instructions.md"), filingInstructions(fixtures.canonical.agencies));
  writeJson(path.join(out, "build-status.json"), {
    schemaVersion: "rcap-family-build-status/v1", familyId: FAMILY_ID,
    buildStatus: "state_built", reviewStatus: "qa_review_pending",
    builtBy: "scripts/build-census-v1-mo-art-xiv-marijuana-set.mjs",
    rasterEngine: null, popplerUsed: false, rasterState: "BUILT_RASTER_PENDING",
    packetsSelfVerified: 0, commercialRoutesOpened: 0, productionTouched: false,
    grantsNothing: "A rendered packet is review evidence. It authorizes no fulfillment and opens no commercial route."
  });
  writeJson(path.join(out, "build-findings.json"), {
    schemaVersion: "rcap-family-build-findings/v1", familyId: FAMILY_ID,
    findings: [
      { finding: "official-form:FI-05 resolves through the Nationwide recovery pool, whose 380 index entries all carry formNumber null, which is why a form-number resolver returned zero matches and stopped this family.",
        consequence: "The build binds FI-05 by the pinned digest against the committed index and then reads the document itself - form number, title, variant, page count and the Case Types List row for this route - rather than treating a matching digest as proof of identity. The reading is recorded in source-receipt.json." },
      { finding: "The census records this route as filed \"with FI-05 at case type X#\". That is the support for the value. An earlier build of this family also recorded that the FI-05 binary prints the row \"Expunge Marijuana Criminal/Arrest Records  X#\" in the CIRCUIT column of its Case Types List on pages 3 and 4; that corroboration was false and is withdrawn. Measured from the bytes: the row is on page 4 only, X# is drawn at x 213.48-224.36 inside the ASSOCIATE column (header x 195.72-243.69), the CIRCUIT column (header x 250.08-284.02) is empty on that row, and the neighbouring rows carry XG at x 260.52-273.40 and X5 at x 261.50-272.40 in CIRCUIT.",
        consequence: "Case Type Code and Case Type Description are still written by the packet on every sheet, because the census determines them and a route election the route determines is not left to the participant. What changed is the recorded basis: it now rests on the census alone, and the ASSOCIATE/CIRCUIT division question - live because CR375 is captioned \"IN THE ____ JUDICIAL CIRCUIT\" - is raised with counsel in approval-request.json rather than treated as answered by the form." },
      { finding: "Five FI-05 widgets carry a /Rect written bottom-edge-last, so their height reads negative: Party Type Code, Party Type Description, Bar ID, Party Type Code_5 and Party Type Description_3.",
        consequence: "Every rect is normalized before it is used as a write box, the malformed ones are flagged in the field map's rectBasis, and the ink is proved against the normalized box out of the saved bytes." },
      { finding: "FI-05 holds three party blocks and this petition has four parties: the petitioner and the three record-holding agencies CR375 names as Defendant(s).",
        consequence: "The packet carries a second FI-05 as the continuation component, which is what the form's own printed instruction directs. The two unused party blocks of that sheet are declared not-applicable with the reason named." },
      { finding: "CR375 asks which agencies the petitioner believes hold records. Three are true of every case on this route and three are facts of the individual case.",
        consequence: "The court that entered the conviction, the MSHP CJIS Division and the prosecuting attorney are named by the packet. The county sheriff, the municipal police department and the open Other line are left as genuine participant elections and disclosed, because naming an agency that holds no record would put a false defendant on a sworn petition." },
      { finding: "Race, ethnicity and sex on CR375, and gender on FI-05, are self-identification.",
        consequence: "Every one of those boxes is left unmarked and carried as a genuine participant election. Nothing here infers them from a record." },
      { finding: "Missouri Supreme Court Operating Rule 4.07 requires the full Social Security number on FI-05.",
        consequence: "The SSN line is left blank on every sheet and disclosed as required before filing. This platform does not hold or print Social Security numbers." },
      { finding: "Two blanks this build declares required-before-filing do not reach that disposition in the shared completeness contract. CR375 prints \"County Sheriff's Dept.\" and \"Municipal Police Dept.\", the contract's court-assigned label pattern matches the word \"department\", and both are therefore classified LATER_COMPLETION - a field the court completes at or after filing. They are the participant's own to fill.",
        consequence: "The labels are left faithful to the printed captions rather than reworded to move the classifier, and both blanks are disclosed to the participant in participant-instructions.md regardless of the disposition they landed in. The heuristic is a finding for whoever owns the contract, not a reason to distort a label." },
      { finding: "Flattening materializes each widget's own appearance into page content, including the unchecked checkboxes' Off appearance, which draws the box border the source already displayed.",
        consequence: "Those are path operators and not glyphs. The byte proof counts show-text operators only, so a border the source itself draws is never counted as ink this build added." }
    ]
  });
  writeJson(path.join(out, "approval-request.json"), {
    schemaVersion: "rcap-family-approval-request/v2", familyId: FAMILY_ID,
    status: "BUILT_RASTER_PENDING", implementationStrategy: "official_pdf_fill",
    routeKeys: ROUTE_KEYS, buildStatus: "state_built",
    requested: "visual review and counsel review",
    components: [
      { kind: "primary_filing", documentId: CR375 },
      { kind: "cover_sheet", documentId: FI05 },
      { kind: "continuation", documentId: FI05_CONT }
    ],
    artifacts: artifactRows.map((a) => ({ fixture: a.fixture, file: a.file, sha256: a.sha256, byteLength: a.byteLength, pageCount: a.pageCount })),
    counselQuestionsRaised: [
      "The packet names three Defendant agencies on CR375 - the court of conviction, the MSHP CJIS Division and the prosecuting attorney - on the ground that each holds a record in every case on this route. Confirm that a prepared draft should name them rather than leave the whole list to the participant.",
      "The incarceration pair is stated from the held screening answer rather than left blank. Confirm that screening evidence is a sufficient basis for a statement made under penalty of perjury, with the participant's own verification required before signing.",
      "The packet carries a second FI-05 as the continuation component so that all four parties are entered. Confirm that a second Confidential Case Filing Information Sheet is what a Missouri clerk expects for a four-party expungement filing, rather than a different continuation.",
      "Case Type Code X# is taken from the census destination record for this route. Confirm the code is still current for a marijuana expungement filed today.",
      "FI-05's own Case Types List prints X# for \"Expunge Marijuana Criminal/Arrest Records\" in the ASSOCIATE column (x 195.72-243.69), not the CIRCUIT column (x 250.08-284.02), which is empty on that row while the neighbouring expungement rows carry XG and X5 in CIRCUIT. CR375 is captioned \"IN THE ____ JUDICIAL CIRCUIT, ________ COUNTY, MISSOURI\". Confirm which division a marijuana expungement petition is opened in and whether X# is the right code for a petition filed in the circuit court, or whether the circuit-division code differs. This build states X# on the census record alone and does not resolve the division question."
    ],
    independentVerificationStatus: "PENDING",
    approvedForLive: false, live: false,
    packetsSelfVerified: 0, commercialRoutesOpened: 0, productionTouched: false
  });

  return {
    familyId: FAMILY_ID, status: "COMPLETED", directory: OUT_REL,
    structuralClass: "flattened_acroform",
    fi05IdentityConfirmed: fi05Identity.isTheDocumentThisFamilyMeans,
    officialForms: [
      { formNumber: CR375, sha256: resolved[CR375].sha256 },
      { formNumber: FI05, sha256: resolved[FI05].sha256 }
    ],
    components: ["primary_filing", "cover_sheet", "continuation"],
    terminalFields: audit.terminalFields, written: audit.written, blank: audit.blank,
    counters: audit.counters, nineCountersZero: allZero,
    requiredBeforeFiling: audit.ledger.filter((b) => b.disposition === "REQUIRED_BEFORE_FILING").length,
    blanksByDisposition: audit.ledger.reduce((acc, b) => { acc[b.disposition] = (acc[b.disposition] ?? 0) + 1; return acc; }, {}),
    rasterState: "BUILT_RASTER_PENDING",
    artifactHashes: artifactRows.map((a) => ({ fixture: a.fixture, sha256: a.sha256, byteLength: a.byteLength, pageCount: a.pageCount })),
    packetsSelfVerified: 0, commercialRoutesOpened: 0, productionTouched: false
  };
}

if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(thisFile)) {
  build().then((r) => console.log(JSON.stringify(r, null, 2))).catch((e) => { console.error(e); process.exit(1); });
}

export { build, FAMILY_ID, OUT_REL };
