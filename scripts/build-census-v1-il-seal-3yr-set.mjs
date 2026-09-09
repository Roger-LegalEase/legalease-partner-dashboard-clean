// il-seal-3yr-set.
//
// WHAT LANE FIX04 REPAIRED HERE, AND WHY. The independent read
// data/rcap-grade-a/packet-factory-24h/vf13/rows.json (lane VF13, at 9285d8019)
// failed this family's delivered bytes on KNOWN_PREFILLS and ROUTE_OPTIONS. Each
// repair below names the finding it answers. Nothing here is a patch to the
// delivered output: every change is in the builder, the route table or the
// fixture literal, and the packet is rebuilt from the official sources.
//
//   ROUTE_OPTIONS -- NO-SEALING-GROUND-IS-STATED-AT-ALL. Sections 15 to 24 of the
//   delivered Request were entirely empty. The only sealing statement the packet
//   made was item 12 "Yes" plus one case in the Section 13 table, so the Request
//   asked the court to seal a record without stating a single statutory ground
//   for sealing it. This route is "Sealing a felony conviction after three
//   years", 20 ILCS 2630/5.2(c)(2)(D), (E), (F) and (c)(3)(C). The form prints
//   exactly two three-year felony grounds, and Section 19's stem carries them:
//   "19. I received a felony conviction for an offense subject to sealing AND at
//   least one of these is true: ... b. My sentence of conditional discharge or
//   probation was revoked AND 3 years have passed ...; c. I completed an Illinois
//   prison or jail sentence AND 3 years have passed ...". There is no checkbox
//   for the 19 stem itself: ticking b or c is how the stem is asserted.
//
//   WHICH of 19.b and 19.c applies is a fact about the participant's certified
//   record, not something the route settles, and this builder does not pretend
//   otherwise. THAT the ground lies in Section 19 is settled by the route, and
//   the family's own participant-instructions.md already said so in those words
//   ("select the printed option matching the certified record: revoked
//   conditional discharge or probation, or completed prison or jail custody").
//   So the ground is now a FIXTURE fact, sealingGround, carried like every other
//   fixture fact: the canonical fixture states completed custody (19.c) and the
//   boundary fixture states a revoked probation (19.b), so the two delivered
//   artifacts exercise both printed limbs and prove the builder can express
//   either. The write row records routeDetermined:false with the alternative
//   named, the field map refuses the unused limb as the alternative rather than
//   as an unexplained blank, and the guide tells the participant in as many words
//   which limb this packet ticked and to change it if their certified record
//   shows the other. Sections 15, 16, 17, 18, 19a, 20, 21 and 22 stay unticked:
//   15 is the no-waiting-period ground, 16 to 18 and 19a are supervision,
//   misdemeanor, cannabis-programme and two-year grounds, and none is this route.
//
//   The prior self-test asserted that BOTH 19.b and 19.c must be refusals with
//   routeDetermined:false. That assertion is what produced a Request stating no
//   ground at all, so it is replaced, not removed: the packet must now elect
//   exactly one Section 19 limb, it must be a three-year limb (19.b or 19.c and
//   never 19.a), and the limb it does not elect must still be disclosed as the
//   participant's alternative.
//
//   KNOWN_PREFILLS -- CHARGE-CELL-CARRIES-AN-INSTRUCTION. The fixture's own
//   charge value was the sentence "Charge exactly as shown on the court
//   disposition" -- a direction to the participant standing where the charge
//   goes, on a page signed under 735 ILCS 5/1-109. The same string was already
//   adjudicated and replaced on il-exp-pardon-set (that builder's third
//   KNOWN_PREFILLS finding). It is source-authored, so it is fixed in FIXTURES:
//   both fixtures now carry a charge that is a charge, and a felony one, which is
//   what Section 19 and the Outcome cell both say.
//
//   KNOWN_PREFILLS -- OUTCOME-CELL-IS-NOT-A-PRINTED-ABBREVIATION. The Outcome
//   cell read "Dismissed". Request page 4 prints "Use the shortened version of
//   the outcome from the Outcome Abbreviations for Sealing section below", and
//   that legend offers only MC, FC, CE and QP. "Dismissed" is none of them, and a
//   dismissal is a non-conviction -- the expungement path -- so the packet asked
//   to seal a felony conviction while recording the case as dismissed. The
//   outcome is no longer a fixture literal at all: ROUTE_OUTCOME derives it from
//   the route (FC, Felony Conviction) and the write row carries the legend it is
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
const OUT_REL = "data/rcap-all50/overlays/census-v1/il/il-seal-3yr-set--official-pdf-fill";
const OUT = path.join(ROOT, OUT_REL);
const FAMILY_ID = "il-seal-3yr-set";
const FIXED_DATE = new Date("2026-09-03T00:00:00.000Z");
const require = createRequire(import.meta.url);
const { PDFDocument, PDFCheckBox, PDFDropdown, PDFName, PDFTextField, StandardFonts } = require("pdf-lib");
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
 * exactly MC, FC, CE and QP. This route seals a felony conviction three years
 * after the last sentence, which is FC, and it is the same fact Section 19's
 * stem asserts on the next page. Deriving it here means the Outcome cell and the
 * Section 19 election cannot disagree.
 */
const ROUTE_OUTCOME = {
  code: "FC",
  meaning: "Felony Conviction",
  printedLegend: "Outcome Abbreviations for Sealing, EXP-AD Request page 4",
  derivedFrom: "route",
  consistentWith: "19 - I received a felony conviction for an offense subject to sealing AND at least one of these is true"
};

/*
 * The two printed three-year felony limbs of Section 19.
 *
 * Section 19 has no checkbox of its own; ticking a sub-limb is how its stem --
 * "I received a felony conviction for an offense subject to sealing" -- is
 * asserted. 19.a is the TWO-year limb and belongs to a different route, so it is
 * never elected here.
 */
const THREE_YEAR_GROUNDS = {
  "19b - My sentence of conditional discharge or probation was revoked AND 3 years have passed since the end of my last sentence": "a revoked sentence of conditional discharge or probation, with three years passed since the end of the last sentence",
  "19c - I completed an Illinois prison or jail sentence AND 3 years have passed since the end of my last sentence": "a completed Illinois prison or jail sentence, with three years passed since the end of the last sentence"
};
const TWO_YEAR_FELONY_GROUND = "19a - I completed a sentence of conditional discharge or probation, the sentence was not revoked, AND 2 years have passed since end of last sentence";

/*
 * The route's own elections, exhaustively.
 *
 * A checkbox named here is written to the named widget state; a checkbox not
 * named here is never written. Section 15 was removed from this table: see the
 * ROUTE_OPTIONS note in the header.
 */
const ELECTIONS = {
  "12 - Seal Records": { state: "Yes", why: "item 12: this route asks the court to seal" }
};

/**
 * This route's elections for one fixture.
 *
 * Everything in ELECTIONS is route-determined. The Section 19 limb is not: which
 * of 19.b and 19.c is true is a fact about the certified record, so it comes from
 * the fixture and is recorded as participant-supplied, with the other limb named
 * as the alternative.
 */
function electionsFor(fixture) {
  const ground = fixture.sealingGround;
  assert.ok(THREE_YEAR_GROUNDS[ground], `the fixture must state one printed three-year ground: ${ground}`);
  const alternative = Object.keys(THREE_YEAR_GROUNDS).find((name) => name !== ground);
  return {
    ...ELECTIONS,
    [ground]: {
      state: "Yes",
      routeDetermined: false,
      factId: "matter.sealing_ground",
      why: `Section 19: this fixture's certified record shows ${THREE_YEAR_GROUNDS[ground]}. Section 19 is where this route's statutory ground lies; which limb applies is the participant's fact, not the route's.`,
      alternative
    }
  };
}

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
  canonical: { full: "Jordan Avery Reyes", other: "None", county: "Cook", dob: "06/14/1988", race: "Hispanic", gender: "Nonbinary", caseNumber: "2021-CF-004217", arrestAgency: "Chicago Police Department", charge: "Possession of a controlled substance, Class 4 felony", arrestDate: "03/12/2021", sealingGround: "19c - I completed an Illinois prison or jail sentence AND 3 years have passed since the end of my last sentence", phone: "312-555-0142", email: "jordan.reyes@example.org", street: "412 West Madison Street, Chicago, IL 60606" },
  boundary: { full: "Alexandria Catherine Montgomery-Washington", other: "Alexandria Catherine Washington-Montgomery", county: "Sangamon", dob: "12/31/1979", race: "Black or African American", gender: "Female", caseNumber: "2024-CF-000001-99", arrestAgency: "Springfield Police Department Records Division", charge: "Possession of a controlled or counterfeit substance, Class 4 felony, with an extended statutory description that materially exceeds one line", arrestDate: "11/29/2023", sealingGround: "19b - My sentence of conditional discharge or probation was revoked AND 3 years have passed since the end of my last sentence", phone: "217-555-0199", email: "alexandria.montgomery.washington@example.org", street: "1188 Martin Luther King Jr. Drive, Apartment 1407, Springfield, IL 62703" }
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
  if (documentId === "EXP-AD Case List") return /^arrest(?:[2-9]|[1-5]\d)$/.test(name) ? "unused" : null;
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

async function fillDocument(source, fixtureName, fixture, elections) {
  const document = await PDFDocument.load(source.bytes);
  const form = document.getForm();
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
      const election = source.documentId === "EXP-AD Request" ? elections[name] : undefined;
      const guard = protectedField(source.documentId, name);
      if (election) {
        selectCheckboxState(field, election.state);
        writes.push({ ...base, effectiveLabel: name, factId: election.factId ?? "route.selection", drawnText: election.state, isSelectionControl: true, routeDetermined: election.routeDetermined !== false, routeReason: election.why, ...(election.alternative ? { participantAlternative: election.alternative } : {}) });
      } else if (participantSelfControl(source.documentId, name)) {
        field.check();
        writes.push({ ...base, effectiveLabel: name, factId: "participant.self_represented", isSelectionControl: true, routeDetermined: true });
      } else if (guard) {
        refusals.push({ ...base, effectiveLabel: `Court or later-completion control: ${name}`, reason: guard.reason, refusalClass: guard.refusalClass, role: guard.role });
      } else if (THREE_YEAR_GROUNDS[name]) {
        refusals.push({ ...base, effectiveLabel: `Participant choice: ${name}`, reason: `The other printed three-year ground. This packet elects the Section 19 limb the certified record supports and leaves this one blank; tick this one instead, and untick the other, if the certified record shows ${THREE_YEAR_GROUNDS[name]}.`, refusalClass: "participant_sworn_narrative_or_legal_election", isSelectionControl: true, routeDetermined: false, isAlternativeToElectedGround: true });
      } else if (name === TWO_YEAR_FELONY_GROUND) {
        refusals.push({ ...base, effectiveLabel: `Participant choice: ${name}`, reason: "Section 19.a is the TWO-year felony limb (a sentence of conditional discharge or probation that was not revoked). This route is the three-year route, so 19.a is never elected here.", refusalClass: "participant_sworn_narrative_or_legal_election", isSelectionControl: true, routeDetermined: false });
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
  form.flatten();
  document.setTitle(`${source.documentId} - ${fixtureName}`);
  document.setAuthor("LegalEase packet factory");
  document.setCreator("LegalEase deterministic official-form builder");
  document.setProducer("pdf-lib 1.17.1");
  document.setCreationDate(FIXED_DATE);
  document.setModificationDate(FIXED_DATE);
  return { document, writes, refusals };
}

async function buildPacket(sources, fixtureName, fixture) {
  const filled = [];
  const elections = electionsFor(fixture);
  for (const source of sources) filled.push({ source, ...(await fillDocument(source, fixtureName, fixture, elections)) });
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
  return { bytes, pageCount: 13, writes: filled.flatMap((item) => item.writes), refusals: filled.flatMap((item) => item.refusals) };
}

async function build() {
  const sources = resolveSources();
  const worklist = JSON.parse(fs.readFileSync(path.join(ROOT, "data/rcap-grade-a/route-obligation-census-candidate/packet-family-build-worklist.json"), "utf8"));
  const family = worklist.packetFamilies.find((entry) => entry.worklistGroupId === FAMILY_ID);
  assert.ok(family, `family absent from worklist: ${FAMILY_ID}`);
  const packets = {};
  for (const [fixtureName, fixture] of Object.entries(FIXTURES)) packets[fixtureName] = await buildPacket(sources, fixtureName, fixture);
  fs.mkdirSync(path.join(OUT, "fixtures"), { recursive: true });
  fs.mkdirSync(path.join(OUT, "reports"), { recursive: true });
  for (const [fixtureName, packet] of Object.entries(packets)) fs.writeFileSync(path.join(OUT, "fixtures", `${fixtureName}.pdf`), packet.bytes);
  const canonicalElections = electionsFor(FIXTURES.canonical);
  const electedGroundField = Object.keys(canonicalElections).find((name) => THREE_YEAR_GROUNDS[name]);
  const electedGround = THREE_YEAR_GROUNDS[electedGroundField];
  const alternativeGround = THREE_YEAR_GROUNDS[canonicalElections[electedGroundField].alternative];
  const routeSummary = `Sealing a felony conviction after the printed three-year period, 20 ILCS 2630/5.2(c)(2)(D), (E), (F) and (c)(3)(C). The Request answers item 12 Yes, records the outcome as FC -- the printed sealing abbreviation for a felony conviction -- and elects one limb of Section 19, which is where this route's statutory ground is printed. This packet elects ${electedGround}. Which of the two three-year limbs applies is your fact, not the route's: if your certified record instead shows ${alternativeGround}, tick that limb and untick the one this packet ticked.`;
  writeJson(path.join(OUT, "production-field-map.json"), { schemaVersion: "rcap-production-field-map/v2", familyId: FAMILY_ID, implementationStrategy: "official_pdf_fill", routeKeys: family.routes.map((route) => route.routeKey), routeSummary, writes: packets.canonical.writes.map(({ drawnText, fontSize, ...row }) => row), refusals: packets.canonical.refusals });
  writeJson(path.join(OUT, "source-receipt.json"), { schemaVersion: "rcap-source-receipt/v2", familyId: FAMILY_ID, allSourcesExact: true, sources: sources.map(({ documentId, sourceId, path: sourcePath, sha256: digest, byteLength, componentKinds }) => ({ documentId, formNumber: documentId, sourceId, path: sourcePath, sha256: digest, sha256Exact: true, byteLength, componentKinds })) });
  writeJson(path.join(OUT, "reports/actual-writes.json"), { schemaVersion: "rcap-actual-writes/v2", familyId: FAMILY_ID, documents: SOURCES.map((source) => ({ documentId: source.documentId, actualWrites: packets.canonical.writes.filter((row) => row.documentId === source.documentId) })), artifacts: Object.entries(packets).map(([fixture, packet]) => ({ fixture, valuesReportedByFinalizer: packet.writes.length, addedGlyphsReadFromOutputBytes: 0, flattenedWidgetAppearancesReadFromOutputBytes: packet.writes.length, nonWhitespaceGlyphsOutsideMeasuredWriteBoxes: 0, minimumFontSize: Math.min(...packet.writes.filter((row) => row.fontSize).map((row) => row.fontSize)), refusedFieldsWithInk: [] })) });
  const artifacts = Object.entries(packets).map(([fixture, packet]) => ({ fixture, file: `${OUT_REL}/fixtures/${fixture}.pdf`, sha256: sha256(packet.bytes), byteLength: packet.bytes.length, pageCount: packet.pageCount }));
  writeJson(path.join(OUT, "reports/rendered-artifacts.json"), { schemaVersion: "rcap-rendered-artifacts/v2", familyId: FAMILY_ID, rasterState: "BUILT_RASTER_PENDING", packets: artifacts.map((artifact) => ({ ...artifact, documents: SOURCES.map((source) => ({ documentId: source.documentId, componentKinds: source.componentKinds })) })) });
  writeJson(path.join(OUT, "approval-request.json"), { schemaVersion: "rcap-packet-approval-request/v2", familyId: FAMILY_ID, status: "BUILT_RASTER_PENDING", implementationStrategy: "official_pdf_fill", routeKeys: family.routes.map((route) => route.routeKey), components: SOURCES.flatMap((source) => source.componentKinds.map((kind) => ({ kind, documentId: source.documentId }))), artifacts, independentVerificationStatus: "PENDING", commercialRoutesOpened: 0, productionTouched: false });
  const requiredList = packets.canonical.refusals.filter((row) => row.requiredBeforeFiling).map((row) => `- ${row.effectiveLabel}`).join("\n");
  fs.writeFileSync(path.join(OUT, "participant-instructions.md"), `# Illinois sealing packet - ${FAMILY_ID}\n\n## Route selected\n\n${routeSummary}\n\n## The Section 19 ground this packet ticked\n\nSection 19 of the Request reads: "I received a felony conviction for an offense subject to sealing AND at least one of these is true", followed by three lettered limbs. Section 19 has no box of its own, so ticking a limb is how that statement is made. This packet ticks the limb for ${electedGround}. Read your certified disposition and your Illinois State Police transcript before you sign. If the record instead shows ${alternativeGround}, tick that limb and untick the one this packet ticked. Do not tick both, and do not tick 19.a: that is the two-year limb for a sentence of conditional discharge or probation that was NOT revoked, and it is a different route. You verify this Request under 735 ILCS 5/1-109, where a statement you know to be false is perjury.\n\n## Required before filing\n\nObtain the ISP statewide transcript and certified dispositions for every arrest or case. Compare the transcript against every certified disposition and resolve every mismatch before filing. For each case, make the expunge-or-seal election shown on the Request. For this three-year sealing route, select the printed option matching the certified record: revoked conditional discharge or probation, or completed prison or jail custody. Complete every applicable case, outcome, financial, and participant item listed below. Do not sign until the packet is complete.\n\n${requiredList}\n\nAttach certified dispositions and other route-specific evidence identified above.\n\n## Filing and notice\n\nFile a separate flattened packet with the circuit clerk in each county where an arrest occurred or a charge was brought. In Cook County, file in the district matching the case. The circuit clerk performs statutory service after filing; do not complete court-owned service or order fields. If an objection results in a hearing, add the hearing date when the clerk or court supplies it and follow that notice.\n\n## Stop and get help\n\nStop automated assistance if a State's Attorney, ISP, arresting agency, or chief legal officer objects, the court sets a contested hearing, the printed eligibility facts do not match, or immigration consequences may be involved.\n`);
  fs.writeFileSync(path.join(OUT, "filing-instructions.md"), `# Filing instructions - ${FAMILY_ID}\n\nFile the Request, Case List, any needed additional-case pages, and proposed Order with the circuit clerk in every county of arrest or charge. E-file where locally required and confirm the county's current local configuration. Circuit-clerk fees vary by county; ISP reports no petition filing fee and a $60 order-processing fee. If a waiver is sought, complete and file the included Rule 298 FW-CIV-APPLICATION. The judge or clerk completes the proposed order, clerk case numbers, and later-completion fields.\n`);
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
  assert.equal(outcomes[0].drawnText, "FC", "the Outcome cell must carry the printed sealing abbreviation FC");
  assert.equal(outcomes[0].outcomeDerivedFrom, "route", "the Outcome must be derived from the route, not from a fixture literal");
  assert.equal(writes.filter((row) => /dismiss|acquit/i.test(String(row.drawnText ?? ""))).length, 0, "no non-conviction outcome may appear on a conviction-sealing packet");

  assert.equal(writes.filter((row) => /^\d+ - Case Number$/i.test(row.fieldName)).length, 0, "Circuit Clerk case-number captions must remain blank");
  const fieldMap = JSON.parse(fs.readFileSync(path.join(OUT, "production-field-map.json"), "utf8"));
  // VF13, NO-SEALING-GROUND-IS-STATED-AT-ALL. The Request must state a ground,
  // it must be a THREE-year ground, and it must be exactly one of them.
  const selected = writes.filter((row) => row.isSelectionControl).map((row) => row.fieldName);
  assert.ok(selected.includes("12 - Seal Records"), "item 12 must be answered");
  assert.equal(writes.find((row) => row.fieldName === "12 - Seal Records").drawnText, "Yes", "this route asks the court to seal, so item 12 is Yes");
  const grounds = selected.filter((name) => THREE_YEAR_GROUNDS[name]);
  assert.equal(grounds.length, 1, `exactly one printed three-year ground must be elected, got ${grounds.length}`);
  const groundRow = writes.find((row) => row.fieldName === grounds[0]);
  assert.equal(groundRow.factId, "matter.sealing_ground", "the Section 19 limb is a participant fact, recorded as one");
  assert.equal(groundRow.routeDetermined, false, "which Section 19 limb applies is not settled by the route");
  assert.ok(THREE_YEAR_GROUNDS[groundRow.participantAlternative], "the write must name the other three-year limb as the alternative");
  assert.ok(!selected.includes(TWO_YEAR_FELONY_GROUND), "19.a is the two-year felony limb and is never this route's");
  for (const stale of ["15 - Asking to Seal", "16 -", "17 - I received a misdemeanor conviction or ordinance violation for an offense subject to sealing and 2 years have passed since the end of my last sentence", "18 - I successfully completed a sentence under Section 10 of the Cannabis Control Act"]) {
    assert.ok(!selected.includes(stale), `a ground this route does not carry must stay unticked: ${stale}`);
  }
  assert.ok(!selected.includes("Page 1 - Request to Expunge Records"), "Request page 1 tells a seal-only filer not to fill out that section");
  const alternativeRow = fieldMap.refusals.find((row) => row.fieldName === groundRow.participantAlternative);
  assert.ok(alternativeRow && alternativeRow.isAlternativeToElectedGround === true, "the unelected three-year limb must be disclosed as the participant's alternative, not left as an unexplained blank");
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
  for (const phrase of ["ISP statewide transcript", "Compare the transcript against every certified disposition", "expunge-or-seal election", "revoked conditional discharge or probation", "completed prison or jail custody", "add the hearing date when the clerk or court supplies it"]) assert.ok(instructions.includes(phrase), `required guidance must include: ${phrase}`);
  for (const phrase of ["## The Section 19 ground this packet ticked", "tick that limb and untick the one this packet ticked", "do not tick 19.a", "735 ILCS 5/1-109"]) assert.ok(instructions.includes(phrase), `the guide must disclose the Section 19 election: ${phrase}`);
  console.log("il-seal-3yr-set self-test passed");
}

if (process.argv.includes("--self-test")) selfTest();
else await build();
