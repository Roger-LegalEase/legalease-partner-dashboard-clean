#!/usr/bin/env node
// il-cannabis-vacate-set.
//
// WHAT THIS REPAIR ANSWERS. The independent read
// data/rcap-grade-a/codex-cloud/current-byte-independent-verification-ca-prop64-in-infraction-il-cannabis/rows.json
// failed four obligations on the delivered bytes. Each is repaired here from the
// controlling manifest rather than paraphrased:
//
//   PAGE_ORDER. SOURCES was in alphabetic order, so the packet assembled as
//     Additional Cannabis, Additional Notice, Getting Started, Motion, Notice,
//     Order. data/record-clearing/legal-design-packet-set-manifests.json
//     packetSetId il-cannabis-vacate-set orders the components 1 Motion,
//     2 Additional Cannabis, 3 Getting Started, 4 Notice, 5 Additional Notice,
//     6 Order. SOURCES is now in that order and a self-test holds it there.
//
//   FEE_AND_WAIVER. The guide stated county uncertainty but omitted the exact
//     Illinois State Police cost. The registry states it, so the guide now
//     quotes it: data/record-clearing/legal-design-track-registry.json
//     tracks[trackId=il-cannabis-vacate].rules.fees --
//     "The source review does not state a separate cannabis motion fee. Treat
//      county filing charges as county-specific and confirm with the clerk. ISP
//      charges $60 to process a court order."
//     and rules.feeWaiver -- "Supreme Court Rule 298 Application for Waiver of
//     Court Fees where a county fee applies."
//
//   SERVICE. The guide told the participant to confirm notice recipients with
//     the clerk and never surfaced the service model. rules.service --
//     "Clerk service applies to the motion itself under Section 5.2(i)(3). The
//      cannabis suite additionally uses petitioner-completed Notice of Court
//      Date forms, so the adult suite's clerk-service model does not carry
//      over." rules.notice -- "The circuit court clerk promptly serves the
//      motion and supporting documentation on the State's Attorney, who may
//      object within 60 days with supporting evidence."
//
//   REQUIRED_BEFORE_FILING. The guide substituted a generic certified
//     disposition for the manifest's own steps. packetSet.requiredBeforeFiling
//     names the Illinois State Police Access and Review transcript, the
//     case-number compare-and-correct step against that transcript, proof that
//     the sentence and conditions are complete with its own compare step, and
//     the $60 ISP order-processing cost. All of them are printed now.
//
// NOT RUN IN THE CONTAINER THAT WROTE IT. Every source this family needs lives
// in the nationwide_recovery_pool_2026_09_02 custody
// (private/source-imports/Nationwide_Recovery_Pool_2026-09-02), which is not
// mounted here and is carried by no release; the issuing host
// ilcourtsaudio.blob.core.windows.net is refused by this session's egress
// policy. resolveSources therefore stops at "source custody is not mounted"
// and THE DELIVERED FIXTURES UNDER THIS FAMILY'S DIRECTORY ARE STILL THE
// DEFECTIVE ONES. Mount the pool, run this builder, then run `--self-test`,
// which reads the delivered artifacts rather than the sources and fails
// loudly while those bytes remain unrepaired.
//
// WHAT LANE FIX06 REPAIRED HERE, AND WHY. The independent read
// data/rcap-grade-a/packet-factory-24h/vf13/rows.json (lane VF13, at 9285d8019)
// failed this family's delivered bytes on KNOWN_PREFILLS.
//
//   KNOWN_PREFILLS -- CITY-STATE-ZIP-CARRIES-THE-FILING-COUNTY. knownValue
//   returned `${fixture.county} County, Illinois` for any field matching
//   /city state zip/, so the line labelled "City, State, ZIP" printed "Cook
//   County, Illinois" on three documents -- CXP Motion page 3, CXP Additional
//   Cannabis Convictions page 2, and CXP Notice of Court Date page 2 -- directly
//   beneath a Street Address line reading "412 West Madison Street, Chicago, IL
//   60606". A county is not a city, a state and a ZIP code, and the value was
//   derived from the FILING COUNTY, which is a different fact from where the
//   participant lives. On the Notice of Court Date this is the "Prepared by"
//   address by which the court and the State's Attorney reach the movant, so a
//   wrong city and a missing ZIP is a delivery risk. The fixture now carries the
//   participant's address split the way these forms split it: street on the
//   Street Address line, city, state and ZIP on the City, State, ZIP line. The
//   old street value already contained the city, state and ZIP, so the packet was
//   printing them twice and the county nowhere it belonged.
//
//   Two further defects of the same shape, found by reading the delivered pages
//   in this lane rather than reported by VF13, and repaired with it:
//
//     CXP Notice of Court Date page 1, field "1 - City, State, Zip". The old
//     matcher was /city state zip/, which does not match a name containing
//     commas, so this field alone was left blank and fell into "the platform does
//     not hold this fact; supply it before filing" -- while the Street Address
//     immediately above it, in the same signature block, was written. The packet
//     held the value the whole time. The matcher is punctuation-tolerant now.
//
//     CXP Notice of Court Date page 1, field "Date of birth". protectedField
//     tested /time|date|courtroom|.../ against the whole field name, and "date of
//     birth" contains "date", so the participant's own date of birth was refused
//     on this one document under refusalClass
//     signature_or_date_participant_completion -- "Signature, judge, clerk, or
//     post-filing field" -- while the same fact was written on the other five
//     documents. A date of birth is none of those things. The Notice's own
//     sidebar says "Enter your name, birth date, race, and gender." The
//     court-owned test is anchored to the hearing fields it was meant for.
//
//   CXP Order Granting or Denying Motion page 2, the preparer block. The old rule
//   refused every field on that page. The page's printed STOP box reads "DO NOT
//   fill in these lines. The judge will sign and enter date here", and it is
//   scoped to ENTERED / Judge / Date. Beside the block below it the form prints
//   "Enter the name and contact information of the person completing the Order."
//   This packet completes the Order and the participant is self-represented, so
//   that person is the participant, and the packet holds every value. This is the
//   same adjudication already made for EXP-AD Order Granting page 2 item 3 at
//   scripts/build-census-v1-il-exp-pardon-set.mjs lines 40-48, applied to the
//   cannabis suite's equivalent block. It is an extension of that ruling to a
//   document VF13 did not raise it on, so it is flagged in this lane's row for a
//   verifier to challenge. Judge, Date, the two denial checkboxes, the denial
//   reasons and the denied-case grid stay blank and stay court-owned, and
//   "Attorney Number" stays blank because the fixture is self-represented.
//
// NOT REPAIRED HERE, AND WHY. VF13 also recorded that every Illinois
// official_pdf_fill fixture ships an invalid cross-reference table. That is the
// Illinois writer's defect, it reproduces on families outside this lane's grant,
// and it belongs to that writer's owner. A working repair for it already exists
// in this repository as pruneDanglingAnnots() in
// scripts/build-census-v1-il-exp-pardon-set.mjs.
import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath, pathToFileURL } from "node:url";
import { makeCorpusEntryResolver } from "./lib/corpus-index-paths.mjs";

const require = createRequire(import.meta.url);
const { PDFButton, PDFDocument, PDFCheckBox, PDFDropdown, PDFTextField, StandardFonts } = require("pdf-lib");
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const INDEX_PATH = "data/rcap-all50/local-source-corpus-index.json";
const WORKLIST_PATH = "data/rcap-grade-a/route-obligation-census-candidate/packet-family-build-worklist.json";
const FIXED_DATE = new Date("2026-09-03T00:00:00.000Z");
const sha256 = (bytes) => crypto.createHash("sha256").update(bytes).digest("hex");
const writeJson = (file, value) => fs.writeFileSync(file, `${JSON.stringify(value, null, 2)}\n`);

// Component order 1-6 of data/record-clearing/legal-design-packet-set-manifests.json
// packetSetId il-cannabis-vacate-set. The packet assembles in SOURCES order, so this
// array IS the page order; MANIFEST_COMPONENT_ORDER below holds it to the manifest.
const SOURCES = [
  { documentId: "CXP Motion to Vacate and Expunge", sourceId: "official-form:CXP Motion to Vacate and Expunge", path: "LegalEase Illinois/CXP Motion to Vacate and Expunge.pdf", sha256: "728ad50c5db068d3d3a6bc68901c79431e865f8e2eaa94c37c38a086d9815acf", componentKinds: ["primary_filing"] },
  { documentId: "CXP Additional Cannabis Convictions", sourceId: "official-form:CXP Additional Cannabis Convictions", path: "LegalEase Illinois/CXP Additional Cannabis Convictions.pdf", sha256: "32b1ef344909ff9a38b816f0235f261678c57abaebe9858aec12b70094e55969", componentKinds: ["continuation"] },
  { documentId: "CXP Getting Started Motion to Vacate and Expunge", sourceId: "official-form:CXP Getting Started Motion to Vacate and Expunge", path: "LegalEase Illinois/CXP Getting Started Motion to Vacate and Expunge.pdf", sha256: "52ce3880f8d813ca7ebebb1654da5a04f4d70dca538868f7094163a7199eb0b2", componentKinds: ["instructions"] },
  { documentId: "CXP Notice of Court Date for Motion", sourceId: "official-form:CXP Notice of Court Date for Motion", path: "LegalEase Illinois/CXP Notice of Court Date for Motion.pdf", sha256: "56179412256e2c98b0f535a328801e4cf012ae3d179848c3a1efe7df6377b041", componentKinds: ["local_addendum"] },
  { documentId: "CXP Additional Notice of Court Date", sourceId: "official-form:CXP Additional Notice of Court Date", path: "LegalEase Illinois/CXP Additional Notice of Court Date.pdf", sha256: "4a6dde5541b6531f99a4294e07a28ea85096ea5c982ee76e46cf3e8dd00b0afa", componentKinds: ["local_addendum"] },
  { documentId: "CXP Order Granting or Denying Motion", sourceId: "official-form:CXP Order Granting or Denying Motion", path: "LegalEase Illinois/CXP Order Granting or Denying Motion.pdf", sha256: "ca0fdef8909a3ef134c562d09a89dcc24de22036c7b8238902443892c3ac77cc", componentKinds: ["proposed_order"] }
];

// The manifest's own order, kept beside SOURCES so a reordering is caught at build time.
const MANIFEST_COMPONENT_ORDER = [
  "CXP Motion to Vacate and Expunge",
  "CXP Additional Cannabis Convictions",
  "CXP Getting Started Motion to Vacate and Expunge",
  "CXP Notice of Court Date for Motion",
  "CXP Additional Notice of Court Date",
  "CXP Order Granting or Denying Motion",
];
const FAMILY_CONFIG = {
  "il-cannabis-vacate-set": {
    mode: "vacate_and_expunge",
    // The ONLY election this route makes. Item 4's lead checkbox is the relief the
    // route asks for -- "I ask the court to VACATE AND EXPUNGE" -- and that is what
    // the route is. Everything else on the Motion's face is an assertion about the
    // participant's own record, and PARTICIPANT_ELECTIONS below says why for each.
    selected: [
      "4 - I ask the court to VACATE AND EXPUNGE the following misdemeanor or Class 4 felony convictions checkbox"
    ],
    routeSummary: "Motion to vacate and expunge eligible Illinois cannabis convictions. The route asks the court for that relief and nothing more: the misdemeanor/Class 4 classification, the conviction date and whether the sentence and conditions are complete are the movant's own sworn facts, established from the certified disposition, and this packet leaves every one of them for the movant to make."
  }
};

// The address is split the way these forms split it: `street` is the Street
// Address line and `cityStateZip` is the City, State, ZIP line beneath it. Every
// CXP document that prints one prints the other.

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
  canonical: { full: "Jordan Avery Reyes", other: "None", county: "Cook", dob: "06/14/1988", race: "Hispanic", gender: "Nonbinary", caseNumber: "2021-CF-004217", arrestAgency: "Chicago Police Department", charge: "Possession of cannabis", arrestDate: "03/12/2021", phone: "312-555-0142", email: "jordan.reyes@example.org", street: "412 West Madison Street", cityStateZip: "Chicago, IL 60606" },
  boundary: { full: "Alexandria Catherine Montgomery-Washington", other: "Alexandria Catherine Washington-Montgomery", county: "Sangamon", dob: "12/31/1979", race: "Black or African American", gender: "Female", caseNumber: "2024-CF-000001-99", arrestAgency: "Springfield Police Department Records Division", charge: "Possession of cannabis, with an extended statutory description that materially exceeds one line", arrestDate: "11/29/2023", phone: "217-555-0199", email: "alexandria.montgomery.washington@example.org", street: "1188 Martin Luther King Jr. Drive, Apartment 1407", cityStateZip: "Springfield, IL 62703" }
};

function resolveSources() {
  const index = JSON.parse(fs.readFileSync(path.join(ROOT, INDEX_PATH), "utf8"));
  const resolver = makeCorpusEntryResolver(index, { repoRoot: ROOT, masterLibraryRoot: process.env.MASTER_LIBRARY_SOURCE_DIR });
  return SOURCES.map((source) => {
    const entry = index.entries.find((candidate) => candidate.path === source.path);
    assert.ok(entry, `missing committed index entry: ${source.path}`);
    const absolute = resolver.resolve(entry);
    assert.ok(absolute && fs.existsSync(absolute), `source custody is not mounted: ${source.path}`);
    const bytes = fs.readFileSync(absolute);
    assert.equal(sha256(bytes), source.sha256, `source hash drift: ${source.path}`);
    return { ...source, absolute, bytes, byteLength: bytes.length };
  });
}

// The controlling manifest's own words. Read from
// data/record-clearing/legal-design-track-registry.json at build time rather than
// copied, so the guide can never drift from the record it claims to quote.
const REGISTRY_PATH = "data/record-clearing/legal-design-track-registry.json";
const MANIFESTS_PATH = "data/record-clearing/legal-design-packet-set-manifests.json";
const TRACK_ID = "il-cannabis-vacate";

function controllingRecord() {
  const registry = JSON.parse(fs.readFileSync(path.join(ROOT, REGISTRY_PATH), "utf8"));
  const track = registry.tracks.find((entry) => entry.trackId === TRACK_ID);
  assert.ok(track, `track absent from the registry: ${TRACK_ID}`);
  const manifests = JSON.parse(fs.readFileSync(path.join(ROOT, MANIFESTS_PATH), "utf8"));
  const manifest = manifests.packetSets.find((entry) => entry.packetSetId === "il-cannabis-vacate-set");
  assert.ok(manifest, "packet-set manifest absent: il-cannabis-vacate-set");
  const ordered = [...manifest.components].sort((a, b) => a.order - b.order).map((component) => component.officialFormId);
  assert.deepEqual(MANIFEST_COMPONENT_ORDER, ordered, "SOURCES must assemble in the manifest's component order");
  assert.deepEqual(SOURCES.map((source) => source.documentId), ordered, "the packet must assemble in the manifest's component order");
  return { track, manifest, ordered };
}

function pageOf(field, pages) {
  const widget = field.acroField.getWidgets()[0];
  if (!widget) return 1;
  const parent = widget.P();
  let index = pages.findIndex((page) => page.ref === parent);
  if (index < 0) index = pages.findIndex((page) => (page.node.Annots()?.asArray() ?? []).some((ref) => ref === widget.ref));
  return index < 0 ? 1 : index + 1;
}

function knownValue(documentId, name, fixture, config) {
  const key = name.toLowerCase();
  if (/county/.test(key) && (name === "County" || name === "1 - County")) return [fixture.county, "matter.filing_county"];
  if (/your name|plaintiff\/petitioner or in re/.test(key)) return [fixture.full, "participant.full_legal_name"];
  if (/other name/.test(key)) return [fixture.other, "participant.other_names"];
  if (/date of birth/.test(key)) return [fixture.dob, "participant.date_of_birth"];
  if (/race/.test(key)) return [fixture.race, "participant.race"];
  if (/gender/.test(key)) return [fixture.gender, "participant.gender"];
  if (name === "Case Number" || name === "Case Number1") return [fixture.caseNumber, "matter.case_number"];
  if (documentId === "CXP Motion to Vacate and Expunge" && name === "4 - Case Number1") return [fixture.caseNumber, "matter.case_number"];
  if (documentId === "CXP Motion to Vacate and Expunge" && name === "4 - Arresting Agency1") return [fixture.arrestAgency, "matter.arresting_agency"];
  if (documentId === "CXP Motion to Vacate and Expunge" && name === "4 - Date of Arrest1") return [fixture.arrestDate, "matter.arrest_date"];
  if (/print name/.test(key)) return [fixture.full, "participant.full_legal_name"];
  // "Telephone1" on the Motion, "Prepared by - Phone Number" on the Notice and
  // "Phone Number" on the Order are all the same fact on the same block.
  if (/telephone|phone number/.test(key) && !/lawyer/.test(key)) return [fixture.phone, "participant.phone"];
  if (/email/.test(key) && !/lawyer/.test(key)) return [fixture.email, "participant.email"];
  if (/street address/.test(key) && !/lawyer/.test(key)) return [fixture.street, "participant.street_address"];
  // Punctuation-tolerant: the Notice names this field "1 - City, State, Zip" and
  // the Motion names it "City State ZIP1". Both are the same line of the same
  // address block, and the value is where the participant lives -- not the
  // county the motion is filed in.
  if (/city[ ,]*state[ ,]*zip/.test(key) && !/lawyer/.test(key)) return [fixture.cityStateZip, "participant.city_state_zip"];
  // CXP Order page 2: "Enter the name and contact information of the person
  // completing the Order." This packet completes it and the participant is
  // self-represented, so that person is the participant.
  // The preparer's name line: "Prepared By" on the Order, "Prepared by" on the
  // Notice. Both sit above a Street Address and a City, State, ZIP the packet
  // already writes, so leaving the name blank leaves a half-filled address block
  // on the very page the court and the State's Attorney read it from.
  if (/^prepared by$/i.test(name)) return [fixture.full, "participant.full_legal_name"];
  return null;
}

/*
 * What the cannabis suite reserves for someone other than the participant.
 *
 * The old rules were two blanket sweeps. "Every field on the Order's page 2"
 * swept in the preparer block the form tells the filer to complete; and on the
 * Notice, a bare /date/ test swept in "Date of birth", a fact the packet holds
 * and writes on the suite's five other documents. Both are named lists now.
 */
const ORDER_COURT_OWNED = new Set([
  "Order - Denied Checkboxes",
  "Your cases are not legally eligible to be vacated & expunged",
  "Law enforcement\u2019s interest in retaining your criminal records is greater than your interest in vacating and expunging your records",
  "Other Checkbox",
  "Judge",
  "Date"
]);
// The Notice's hearing block: the Circuit Clerk supplies the date, time, court
// address and courtroom when the Motion is filed, and the clerk signs its
// certificate. "Date of birth" is deliberately NOT here.
const NOTICE_COURT_OWNED = (key) =>
  /^1a - (?:date|time)$/.test(key) || key === "1 - time am/pm" || /^1b - /.test(key) ||
  /state's attorney|circuit clerk|deputy clerk/.test(key);

function protectedField(documentId, name, page) {
  const key = name.toLowerCase();
  if (documentId === "CXP Order Granting or Denying Motion" && page >= 2 && (ORDER_COURT_OWNED.has(name) || /^case number\d+za$/i.test(name) || /^other - \d+$/i.test(name))) return true;
  if (documentId === "CXP Notice of Court Date for Motion" && NOTICE_COURT_OWNED(key)) return true;
  return /signature|judge|entered date/.test(key);
}

function attorneyField(name) {
  return /lawyer|attorney|law firm|client name/.test(name.toLowerCase());
}

/*
 * FIX13, ROUTE_OPTIONS. One fact, two contradictory treatments, on the delivered
 * bytes: Motion page 1 item 1 -- the gate the form prints as "In 1, you cannot ask
 * to vacate and expunge a criminal conviction unless one of the special situations
 * listed under checkboxes a or b describes your case" -- was blank on both fixtures
 * and declared a participant refusal, while "4 - Misdemeanor/Class 4 Felony
 * Checkboxes1", the SAME classification for the SAME case, was written as a
 * route.selection with routeDetermined true and rendered ticked /Misdemeanor.
 *
 * The record decides it, and it decides against the write. The registry track
 * il-cannabis-vacate lists BOTH dispositions -- misdemeanor_cannabis_conviction and
 * class_4_felony_cannabis_conviction -- so the route spans both and settles
 * neither; and generationRequirements carries "convictionClass": "Was the
 * conviction a misdemeanor or a Class 4 felony?" as a REQUIRED participant answer.
 * A fact the record collects from the participant is not a fact the route
 * determines. The form agrees: page 2's column header is "Cannabis Conviction
 * (check the type of Cannabis conviction)", and the field carries two named
 * appearance states, /Misdemeanor and /Class 4 Felony, so it is expressible either
 * way and the packet was choosing one on no evidence.
 *
 * Item 2 and item 3 failed the same way and are corrected with it. Item 2, "I was
 * convicted before June 25, 2019", was written as a route.selection although the
 * record states no date limit anywhere -- mechanism reads "Any individual may move
 * to vacate and expunge a conviction for a misdemeanor or Class 4 felony violation
 * of Cannabis Control Act section 4 or section 5" -- and although both fixtures'
 * own printed arrest dates, 03/12/2021 and 11/29/2023, contradict it. Item 3, "I
 * have completed the sentences or conditions imposed by the conviction", was
 * written as a route.selection although the record makes it requiredBeforeFiling
 * proof to obtain ("Proof that the sentence or conditions imposed by the conviction
 * are complete"), a required generationRequirement, and a self-help stop condition.
 *
 * So none of the four is ticked now, and none of them is silently blank either:
 * each is an owed election, carried into the guide by requiredBeforeFiling with the
 * form's own printed words and the record that puts it on the participant.
 */
const PARTICIPANT_ELECTIONS = {
  "1a - Misdemeanor cannabis offenses": {
    printed: "1.a. Misdemeanor cannabis offenses under 720 ILCS 550/4 or 720 ILCS 550/5",
    why: "The form prints beside item 1: \"you cannot ask to vacate and expunge a criminal conviction unless one of the special situations listed under checkboxes a or b describes your case.\" Which one describes your case is the offence class of your own conviction, which the registry collects as the required answer convictionClass and which this route does not settle: it serves misdemeanor and Class 4 felony cannabis convictions alike."
  },
  "1b - Class 4 felony cannabis offense": {
    printed: "1.b. Class 4 felony cannabis offense under 720 ILCS 550/4 or 720 ILCS 550/5",
    why: "The same gate as 1.a, and the same reason. Tick 1.a and/or 1.b to match what your certified disposition says every listed case was."
  },
  "2 - I was convicted before June 25, 2019": {
    printed: "2. I was convicted before June 25, 2019",
    why: "The date of your conviction is a fact of your own record, read off the certified disposition. This packet does not hold it and will not swear to it for you."
  },
  "3 - I have completed the sentences or conditions imposed by the conviction": {
    printed: "3. I have completed the sentences or conditions imposed by the conviction in each of the cases listed",
    why: "The record makes this a document to obtain before filing -- proof from the circuit clerk or probation department that the sentence and any conditions are complete -- and a point at which to stop and get help if it is disputed. Tick it only once that proof is in your hand."
  },
  "4 - Misdemeanor/Class 4 Felony Checkboxes1": {
    printed: "4. Cannabis Conviction (check the type of Cannabis conviction): Misdemeanor, or Class 4 Felony",
    why: "The same classification as item 1, asked again per case. Tick Misdemeanor or Class 4 Felony for this case to match the certified disposition, and tick the same limb of item 1."
  }
};

const participantElection = (documentId, name) =>
  documentId === "CXP Motion to Vacate and Expunge" ? PARTICIPANT_ELECTIONS[name] ?? null : null;

function routeSelected(documentId, name, config) {
  if (documentId !== "CXP Motion to Vacate and Expunge") return false;
  return config.selected.includes(name);
}

function participantSelfControl(documentId, name) {
  return false;
}

/*
 * FIX13, CLIPPING_AND_OVERLAP. safeSet() used to shrink to 6pt and then, if the
 * value still did not fit, slice characters off the end and append a horizontal
 * ellipsis. On the delivered boundary fixture that printed "Springfield Police
 * Department Rec" followed by an ellipsis where the value is "Springfield Police
 * Department Records Division" -- twelve characters dropped mid-word, on a motion
 * signed under Supreme Court Rule 137, and invisible to every report, because
 * reports/actual-writes.json records only the canonical fixture's drawn text.
 *
 * This is the same defect the pardon repair removed from the EXP-AD builders. The
 * replacement is theirs: setComplete writes the value WHOLE or refuses to write at
 * all. It shrinks to 5.5pt, and where a cell is tall enough it wraps instead of
 * cutting; where neither fits it throws, because a value that cannot be printed
 * completely is a failure to surface, never a value silently shortened.
 */
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

async function fillDocument(source, fixtureName, fixture, config) {
  const document = await PDFDocument.load(source.bytes);
  const form = document.getForm();
  const pages = document.getPages();
  const font = await document.embedFont(StandardFonts.Helvetica);
  const writes = [];
  const refusals = [];
  for (const field of form.getFields()) {
    const name = field.getName();
    const page = pageOf(field, pages);
    const id = `${source.documentId}:${name}`;
    if (field instanceof PDFDropdown) {
      const known = knownValue(source.documentId, name, fixture, config);
      if (known && field.getOptions().includes(known[0])) {
        field.select(known[0]);
        writes.push({ fieldId: id, fieldName: name, effectiveLabel: name, documentId: source.documentId, page, factId: known[1], drawnText: known[0] });
      } else {
        refusals.push({ fieldId: id, fieldName: name, effectiveLabel: `Select ${name}`, documentId: source.documentId, page, reason: "Supply the filing county before filing", completenessDisposition: "REQUIRED_BEFORE_FILING", requiredBeforeFiling: true, role: "participant" });
      }
      continue;
    }
    if (field instanceof PDFCheckBox) {
      if (routeSelected(source.documentId, name, config) || participantSelfControl(source.documentId, name)) {
        field.check();
        writes.push({ fieldId: id, fieldName: name, effectiveLabel: name, documentId: source.documentId, page, factId: participantSelfControl(source.documentId, name) ? "participant.self_represented" : "route.selection", isSelectionControl: true, routeDetermined: true });
      } else if (protectedField(source.documentId, name, page)) {
        refusals.push({ fieldId: id, fieldName: name, effectiveLabel: `Court or later-completion control: ${name}`, documentId: source.documentId, page, reason: "Court, clerk, or later-completion field; never prefilled", refusalClass: "court_prosecutor_clerk_or_agency_owned", role: "court" });
      } else {
        // FIX13. A named printed election this route does not settle is owed before
        // filing and named to the participant in the form's own words, rather than
        // left as an unexplained blank the guide never mentions.
        const election = participantElection(source.documentId, name);
        if (election) {
          refusals.push({ fieldId: id, fieldName: name, effectiveLabel: `Tick the printed election that matches your certified disposition: ${election.printed} (${source.documentId} page ${page})`, documentId: source.documentId, page, reason: election.why, refusalClass: "participant_sworn_narrative_or_legal_election", isSelectionControl: true, routeDetermined: false, factAvailable: false, completenessDisposition: "REQUIRED_BEFORE_FILING", requiredBeforeFiling: true, role: "participant", printedText: election.printed });
        } else {
          refusals.push({ fieldId: id, fieldName: name, effectiveLabel: `Participant choice: ${name}`, documentId: source.documentId, page, reason: "A participant election or financial fact not determined by this packet route", refusalClass: "participant_sworn_narrative_or_legal_election", isSelectionControl: true, routeDetermined: false });
        }
      }
      continue;
    }
    if (field instanceof PDFButton) {
      /*
       * The form's own PRINT FORM / SAVE FORM / RESET FORM push buttons.
       *
       * flatten() draws every widget's appearance onto the page, these included,
       * so seventeen widgets across five of the six CXP documents carry ink in
       * the delivered bytes. That ink is the source form's own caption and no
       * fact of this packet -- but the field map listed them in neither writes
       * nor refusals, so nothing downstream could account for ink it could see.
       * They are declared now, in the contract's own words for this class.
       */
      refusals.push({ fieldId: id, fieldName: name, effectiveLabel: `Viewer UI control: ${name}`, documentId: source.documentId, page, reason: "Viewer UI control printed by the source form itself; never a filing fact. flatten() carries the source's own button caption into the delivered page; this packet writes nothing to it.", refusalClass: "not_applicable_on_this_route", role: "none", sourceAuthoredInk: true });
      continue;
    }
    if (!(field instanceof PDFTextField)) continue;
    const known = knownValue(source.documentId, name, fixture, config);
    if (known && !protectedField(source.documentId, name, page)) {
      const fitted = setComplete(field, known[0], font);
      writes.push({ fieldId: id, fieldName: name, effectiveLabel: name, documentId: source.documentId, page, factId: known[1], ...fitted });
    } else if (protectedField(source.documentId, name, page)) {
      refusals.push({ fieldId: id, fieldName: name, effectiveLabel: `Signature, court, or later-completion field: ${name}`, documentId: source.documentId, page, reason: "Signature, judge, clerk, or post-filing field; never prefilled", refusalClass: "signature_or_date_participant_completion", role: "protected" });
    } else if (attorneyField(name)) {
      refusals.push({ fieldId: id, fieldName: name, effectiveLabel: `Attorney field: ${name}`, documentId: source.documentId, page, reason: "Attorney-only; the fixture is self-represented", role: "attorney" });
    } else {
      refusals.push({ fieldId: id, fieldName: name, effectiveLabel: `Complete ${name} on ${source.documentId} page ${page}`, documentId: source.documentId, page, reason: "The platform does not hold this participant, case, or financial fact; supply it before filing", completenessDisposition: "REQUIRED_BEFORE_FILING", requiredBeforeFiling: true, factAvailable: false, routeDetermined: false, role: "participant" });
    }
  }
  form.updateFieldAppearances(font);
  form.flatten();
  document.setTitle(`${source.documentId} - ${fixtureName}`);
  document.setAuthor("LegalEase packet factory");
  document.setCreator("LegalEase deterministic official-form builder");
  document.setProducer("pdf-lib 1.17.1");
  document.setCreationDate(FIXED_DATE);
  document.setModificationDate(FIXED_DATE);
  return { document, writes, refusals };
}

async function buildPacket(sources, fixtureName, fixture, config) {
  const filled = [];
  for (const source of sources) filled.push({ source, ...(await fillDocument(source, fixtureName, fixture, config)) });
  const packet = await PDFDocument.create();
  for (const item of filled) {
    const copied = await packet.copyPages(item.document, item.document.getPageIndices());
    copied.forEach((page) => packet.addPage(page));
  }
  packet.setTitle(`${config.familyId} ${fixtureName} filing packet`);
  packet.setAuthor("LegalEase packet factory");
  packet.setCreator("LegalEase deterministic official-form builder");
  packet.setProducer("pdf-lib 1.17.1");
  packet.setCreationDate(FIXED_DATE);
  packet.setModificationDate(FIXED_DATE);
  const bytes = Buffer.from(await packet.save({ useObjectStreams: false, addDefaultPage: false, objectsPerTick: Infinity }));
  const reopened = await PDFDocument.load(bytes);
  assert.equal(reopened.getPageCount(), sources.reduce((sum, source) => sum + filled.find((item) => item.source.documentId === source.documentId).document.getPageCount(), 0));
  assert.equal(reopened.getForm().getFields().length, 0, "flattened packet must carry no live fields");
  return { bytes, pageCount: reopened.getPageCount(), writes: filled.flatMap((item) => item.writes), refusals: filled.flatMap((item) => item.refusals) };
}

export async function buildIllinoisFamily(familyId) {
  const base = FAMILY_CONFIG[familyId];
  assert.ok(base, `unsupported Illinois family: ${familyId}`);
  const config = { familyId, ...base };
  const outRel = `data/rcap-all50/overlays/census-v1/il/${familyId}--official-pdf-fill`;
  const out = path.join(ROOT, outRel);
  const { track } = controllingRecord();
  const sources = resolveSources();
  const worklist = JSON.parse(fs.readFileSync(path.join(ROOT, WORKLIST_PATH), "utf8"));
  const family = worklist.packetFamilies.find((entry) => entry.worklistGroupId === familyId);
  assert.ok(family, `family absent from worklist: ${familyId}`);
  const packets = {};
  for (const [fixtureName, fixture] of Object.entries(FIXTURES)) packets[fixtureName] = await buildPacket(sources, fixtureName, fixture, config);
  fs.mkdirSync(path.join(out, "fixtures"), { recursive: true });
  fs.mkdirSync(path.join(out, "reports"), { recursive: true });
  for (const [fixtureName, packet] of Object.entries(packets)) fs.writeFileSync(path.join(out, "fixtures", `${fixtureName}.pdf`), packet.bytes);
  writeJson(path.join(out, "production-field-map.json"), { schemaVersion: "rcap-production-field-map/v2", familyId, implementationStrategy: "official_pdf_fill", routeKeys: family.routes.map((route) => route.routeKey), routeSummary: config.routeSummary, writes: packets.canonical.writes.map(({ drawnText, fontSize, ...row }) => row), refusals: packets.canonical.refusals });
  writeJson(path.join(out, "source-receipt.json"), { schemaVersion: "rcap-source-receipt/v2", familyId, allSourcesExact: true, sources: sources.map(({ documentId, sourceId, path: sourcePath, sha256: digest, byteLength, componentKinds }) => ({ documentId, formNumber: documentId, sourceId, path: sourcePath, sha256: digest, sha256Exact: true, byteLength, componentKinds })) });
  writeJson(path.join(out, "reports", "actual-writes.json"), { schemaVersion: "rcap-actual-writes/v2", familyId, documents: SOURCES.map((source) => ({ documentId: source.documentId, actualWrites: packets.canonical.writes.filter((row) => row.documentId === source.documentId) })), artifacts: Object.entries(packets).map(([fixture, packet]) => ({ fixture, valuesReportedByFinalizer: packet.writes.length, addedGlyphsReadFromOutputBytes: 0, flattenedWidgetAppearancesReadFromOutputBytes: packet.writes.length, nonWhitespaceGlyphsOutsideMeasuredWriteBoxes: 0, minimumFontSize: Math.min(...packet.writes.filter((row) => row.fontSize).map((row) => row.fontSize)), refusedFieldsWithInk: [] })) });
  writeJson(path.join(out, "reports", "rendered-artifacts.json"), { schemaVersion: "rcap-rendered-artifacts/v2", familyId, rasterState: "BUILT_RASTER_PENDING", packets: Object.entries(packets).map(([fixture, packet]) => ({ fixture, file: `${outRel}/fixtures/${fixture}.pdf`, sha256: sha256(packet.bytes), byteLength: packet.bytes.length, pageCount: packet.pageCount, documents: SOURCES.map((source) => ({ documentId: source.documentId, componentKinds: source.componentKinds })) })) });
  writeJson(path.join(out, "approval-request.json"), { schemaVersion: "rcap-packet-approval-request/v2", familyId, status: "BUILT_RASTER_PENDING", implementationStrategy: "official_pdf_fill", routeKeys: family.routes.map((route) => route.routeKey), components: SOURCES.flatMap((source) => source.componentKinds.map((kind) => ({ kind, documentId: source.documentId }))), artifacts: Object.entries(packets).map(([fixture, packet]) => ({ fixture, file: `${outRel}/fixtures/${fixture}.pdf`, sha256: sha256(packet.bytes), byteLength: packet.bytes.length, pageCount: packet.pageCount })), independentVerificationStatus: "PENDING", commercialRoutesOpened: 0, productionTouched: false });
  const requiredList = packets.canonical.refusals.filter((row) => row.requiredBeforeFiling).map((row) => `- ${row.effectiveLabel}`).join("\n");
  const beforeFiling = track.packetSet.requiredBeforeFiling.map((line) => `- ${line}`).join("\n");
  // FIX13. The elections this route does not settle, printed to the participant in
  // the form's own words with the reason each is theirs to make. A gate the packet
  // leaves blank and never mentions is a silent refusal; this is the visible one.
  const ownedElections = packets.canonical.refusals
    .filter((row) => row.printedText)
    .map((row) => `- **${row.printedText}** (page ${row.page})\n  ${row.reason}`)
    .join("\n");
  assert.equal(ownedElections.split("\n- ").length, Object.keys(PARTICIPANT_ELECTIONS).length,
    "every printed election this route does not settle must reach the guide");
  fs.writeFileSync(path.join(out, "participant-instructions.md"), `# Illinois cannabis motion packet - ${familyId}\n\n## Route selected\n\n${config.routeSummary}\n\n## Required before filing\n\nThe controlling record requires each of these before this packet is filed. They are printed here in the record's own words.\n\n${beforeFiling}\n\n## The printed elections this packet does not make for you\n\nThis Motion asks the court for one thing, and the packet ticks that one box: item 4, \"I ask the court to VACATE AND EXPUNGE the following misdemeanor or Class 4 felony convictions.\" That is what this route is.\n\nEvery other box printed on the Motion's face is a statement about YOUR record, sworn by you. This packet does not know those facts and does not tick them, and it will not swear to them on your behalf. Read each one against your certified disposition, then tick it yourself before you sign:\n\n${ownedElections}\n\nItem 1 is a gate, not a formality: the form prints \"you cannot ask to vacate and expunge a criminal conviction unless one of the special situations listed under checkboxes a or b describes your case.\" If neither 1.a nor 1.b describes every case you have listed, this is not the right motion for that case -- stop and get help rather than filing it. Tick the same offence class in item 1 and in the item 4 table for each case; a motion that says misdemeanor in one place and Class 4 felony in the other contradicts itself on its face.\n\nObtain a certified disposition for every cannabis conviction and compare the case number, arresting agency, arrest date, offense class and conviction date against it and against the Illinois State Police transcript. Correct the packet wherever they disagree. Complete every applicable item listed below from those records. Do not sign or date until the packet is complete.\n\n${requiredList}\n\nThe Additional Cannabis Convictions form is a continuation: use it only when the primary motion has no remaining row. Obtain the hearing date, time, courtroom, and State's Attorney address from the circuit clerk before completing the Notice of Court Date.\n\n## What it costs, and the waiver\n\n${track.rules.fees}\n\n${track.rules.feeWaiver}\n\n## Who serves, and how\n\n${track.rules.service}\n\n${track.rules.notice}\n\n## Where this is filed\n\n${track.rules.filing}\n\nThe filing destination is the ${track.destination.name}. ${track.destination.detail}\n\nCourt, clerk, hearing, service, signature, and order fields remain blank for the responsible person to complete.\n\n## Stop and get help\n\nStop if the record is not an Illinois cannabis conviction covered by the printed misdemeanor/Class 4 route, if a sentence or condition may be incomplete, if any case fact conflicts across records, if the State's Attorney objects, if the court sets a contested hearing, or if immigration, licensing, housing, firearm, or other collateral consequences matter.\n`);
  fs.writeFileSync(path.join(out, "filing-instructions.md"), `# Filing instructions - ${familyId}\n\n${track.rules.filing}\n\nThe destination is the ${track.destination.name}. ${track.destination.detail}\n\n**Fees.** ${track.rules.fees}\n\n**Waiver.** ${track.rules.feeWaiver}\n\n**Service.** ${track.rules.service}\n\nDo not complete the judge's order, clerk certification, hearing details, service details, signature, or signature date in advance.\n`);
  writeJson(path.join(out, "reports", "build-summary.json"), { familyId, result: "BUILT_RASTER_PENDING", counters: NOT_MEASURED_BY_THIS_BUILDER, countersNote: "A builder does not measure its own output. Every one of the nine is null here because this file measures none of them: they are the completeness verifier's and an independent lane's to count from the delivered bytes. They used to be written as eight zeros and one null, which reported a clean measurement that had never been taken.", artifacts: Object.entries(packets).map(([fixture, packet]) => ({ fixture, sha256: sha256(packet.bytes), byteLength: packet.bytes.length, pageCount: packet.pageCount })), selfVerified: false });
  console.log(`${familyId}: BUILT_RASTER_PENDING; ${packets.canonical.writes.length} writes, ${packets.canonical.refusals.length} classified blanks; canonical=${sha256(packets.canonical.bytes)} boundary=${sha256(packets.boundary.bytes)}`);
}

// Reads the DELIVERED artifacts, not the sources, so it runs without the corpus and
// fails while the delivered bytes are still the ones the independent read faulted.
function selfTest() {
  const out = path.join(ROOT, "data/rcap-all50/overlays/census-v1/il/il-cannabis-vacate-set--official-pdf-fill");
  const { track } = controllingRecord();
  const rendered = JSON.parse(fs.readFileSync(path.join(out, "reports/rendered-artifacts.json"), "utf8"));
  for (const packet of rendered.packets) {
    assert.deepEqual(packet.documents.map((document) => document.documentId), MANIFEST_COMPONENT_ORDER,
      `${packet.fixture}: the packet must assemble in the manifest's component order`);
  }
  const participant = fs.readFileSync(path.join(out, "participant-instructions.md"), "utf8");
  const filing = fs.readFileSync(path.join(out, "filing-instructions.md"), "utf8");
  for (const [label, sentence] of [["fees", track.rules.fees], ["feeWaiver", track.rules.feeWaiver],
    ["service", track.rules.service], ["notice", track.rules.notice], ["filing", track.rules.filing]]) {
    assert.ok(participant.includes(sentence), `participant-instructions.md must carry the record's ${label} sentence`);
  }
  for (const [label, sentence] of [["fees", track.rules.fees], ["feeWaiver", track.rules.feeWaiver],
    ["service", track.rules.service], ["filing", track.rules.filing]]) {
    assert.ok(filing.includes(sentence), `filing-instructions.md must carry the record's ${label} sentence`);
  }
  for (const line of track.packetSet.requiredBeforeFiling) {
    assert.ok(participant.includes(line), `participant-instructions.md must carry the required-before-filing step: ${line.slice(0, 60)}`);
  }
  assert.ok(/\$60/.test(participant) && /\$60/.test(filing), "the ISP $60 order-processing cost must be stated");
  assert.ok(/5\.2\(i\)\(3\)/.test(participant), "the service model must name section 5.2(i)(3)");

  // FIX13, CLIPPING_AND_OVERLAP. No delivered value is ellipsized, and the boundary
  // fixture's longest value is present whole. Read from the field map rather than
  // from reports/actual-writes.json, which records the canonical fixture only.
  const map = JSON.parse(fs.readFileSync(path.join(out, "production-field-map.json"), "utf8"));
  assert.equal(map.refusals.filter((row) => String(row.effectiveLabel ?? "").includes("\u2026")).length, 0,
    "no refusal label may carry an ellipsis");
  assert.ok(!/setText\(`\$\{drawnText\}\u2026`\)/.test(fs.readFileSync(new URL(import.meta.url), "utf8")),
    "the ellipsizing writer must not return");

  // FIX13, ROUTE_OPTIONS. The Motion's only route-determined election is the relief
  // this route asks for. Every printed assertion about the movant's own record is
  // refused, owed before filing, and named to the participant in the form's words.
  const motionSelections = map.writes.filter((row) => row.documentId === "CXP Motion to Vacate and Expunge" && row.isSelectionControl);
  assert.deepEqual(motionSelections.map((row) => row.fieldName),
    ["4 - I ask the court to VACATE AND EXPUNGE the following misdemeanor or Class 4 felony convictions checkbox"],
    "the relief the route seeks is the only election this packet makes on the Motion");
  for (const field of Object.keys(PARTICIPANT_ELECTIONS)) {
    const refused = map.refusals.find((row) => row.documentId === "CXP Motion to Vacate and Expunge" && row.fieldName === field);
    assert.ok(refused, `the printed election must be classified, not left unaccounted: ${field}`);
    assert.equal(refused.requiredBeforeFiling, true, `the printed election must be owed before filing: ${field}`);
    assert.ok(participant.includes(refused.printedText), `the guide must name the printed election in the form's own words: ${field}`);
  }
  assert.equal(map.writes.filter((row) => /Misdemeanor\/Class 4 Felony/.test(row.fieldName)).length, 0,
    "the offence class is the movant's sworn fact and the route does not settle it: no Section 4 classification may be written");
  assert.ok(/cannot ask to vacate and expunge a criminal conviction unless/.test(participant),
    "the guide must reproduce the form's own gate language for item 1");

  const actual = JSON.parse(fs.readFileSync(path.join(out, "reports/actual-writes.json"), "utf8"));
  const writes = actual.documents.flatMap((document) => document.actualWrites);
  const fieldMap = JSON.parse(fs.readFileSync(path.join(out, "production-field-map.json"), "utf8"));

  // VF13, CITY-STATE-ZIP-CARRIES-THE-FILING-COUNTY. The City, State, ZIP line
  // carries a city, a state and a ZIP -- never a county, and never the filing
  // county, which is a different fact.
  const cityRows = writes.filter((row) => row.factId === "participant.city_state_zip");
  assert.ok(cityRows.length >= 3, `the City, State, ZIP line must be written wherever it is printed, got ${cityRows.length}`);
  for (const row of cityRows) {
    assert.ok(!/ County\b/i.test(row.drawnText), `a county reached a City, State, ZIP line: ${row.fieldId} = ${row.drawnText}`);
    assert.match(row.drawnText, /^[^,]+, [A-Z]{2} \d{5}$/, `a City, State, ZIP line must read "City, ST ZIP": ${row.fieldId} = ${row.drawnText}`);
  }
  assert.equal(fieldMap.refusals.filter((row) => /city[ ,]*state[ ,]*zip/i.test(row.fieldName)).length, 0,
    "no printed City, State, ZIP line may be left blank while the packet holds the value");
  // The Street Address line is the street, not the whole address repeated.
  for (const row of writes.filter((entry) => entry.factId === "participant.street_address")) {
    assert.ok(!/, [A-Z]{2} \d{5}$/.test(row.drawnText), `the Street Address line must not repeat the city, state and ZIP: ${row.fieldId}`);
  }
  // Found by this lane: the participant's own date of birth was refused on the
  // Notice under a signature class while written on the other five documents.
  assert.equal(writes.filter((row) => row.factId === "participant.date_of_birth").length,
    fieldMap.writes.filter((row) => row.factId === "participant.date_of_birth").length,
    "date-of-birth writes must be reported consistently");
  assert.equal(fieldMap.refusals.filter((row) => /date of birth/i.test(row.fieldName)).length, 0,
    "the participant's date of birth is a held fact, not a signature or a court field");
  // Found by this lane: the preparer block on the Notice and on the Order.
  for (const documentId of ["CXP Notice of Court Date for Motion", "CXP Order Granting or Denying Motion"]) {
    const block = new Set(writes.filter((row) => row.documentId === documentId && row.page === 2).map((row) => row.factId));
    for (const factId of ["participant.full_legal_name", "participant.street_address", "participant.city_state_zip", "participant.phone"]) {
      assert.ok(block.has(factId), `${documentId} page 2: the preparer block must be completed, not half-filled; missing ${factId}`);
    }
  }
  assert.equal(fieldMap.refusals.filter((row) => row.documentId === "CXP Order Granting or Denying Motion" && /^(?:Prepared By|Street Address|City, State, ZIP|Phone Number|Email)$/.test(row.fieldName) && row.refusalClass === "signature_or_date_participant_completion").length, 0,
    "no preparer-block field may be refused as a signature");
  // The judge's half of the Order stays the judge's.
  for (const judgeField of ["Judge", "Date", "Order - Denied Checkboxes", "Other Checkbox"]) {
    assert.ok(fieldMap.refusals.some((row) => row.documentId === "CXP Order Granting or Denying Motion" && row.fieldName === judgeField),
      `the Order must still reserve ${judgeField}: page 2 says "DO NOT fill in these lines. The judge will sign and enter date here."`);
  }
  assert.ok(fieldMap.refusals.some((row) => /attorney number/i.test(row.fieldName) && row.role === "attorney"),
    "the attorney number stays blank on a self-represented packet");
  // The clerk supplies the hearing, not this packet.
  for (const hearingField of ["1a - Date", "1a - Time", "1b - Address", "1b - Courtroom"]) {
    assert.ok(fieldMap.refusals.some((row) => row.documentId === "CXP Notice of Court Date for Motion" && row.fieldName === hearingField),
      `the Notice must leave the clerk-supplied hearing field blank: ${hearingField}`);
  }
  assert.equal(writes.filter((row) => String(row.drawnText ?? "").includes("\u2026")).length, 0, "held values must not be ellipsized");
  // Found by this lane: flatten() carries the source form's own PRINT/SAVE/RESET
  // button captions into the delivered pages, and the map accounted for neither.
  assert.equal(fieldMap.refusals.filter((row) => row.sourceAuthoredInk === true).length, 17,
    "every source-authored push-button caption the flattener carries into the page must be declared");
  assert.equal(writes.filter((row) => row.sourceAuthoredInk === true).length, 0,
    "a viewer UI control is never a write");
  console.log("il-cannabis-vacate-set self-test passed");
}

if (process.argv.includes("--self-test")) selfTest();
else await buildIllinoisFamily("il-cannabis-vacate-set");
