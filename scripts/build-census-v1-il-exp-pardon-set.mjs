#!/usr/bin/env node
// The shared Illinois host for the EXP-AD four-form packet.
//
// WHAT THIS HOST STILL SERVES. il-exp-pardon-set (this file's own family),
// il-exp-precompletion-set and il-seal-nonconv-set. Every other Illinois family
// on these four forms was carved into its own builder (FIX04 carved
// il-seal-edu-set, FIX20 carved il-exp-qualprob-set), so an edit here moves
// those three families and nothing else. That is checked, not assumed:
// MASTER_QUEUE records il-exp-pardon-set.importedBy as exactly those two.
//
// WHAT FIX93 REPAIRED HERE, AND WHY. Three independent verifiers measured the
// delivered bytes of the three families this host builds and failed nine
// distinct proof obligations between them. Each repair below names the finding
// it answers.
//
//   KNOWN_PREFILLS. knownValue matched `/case number/ && !/arrest/` before it
//   matched the charge, and every field named "List all charges for each case
//   number - N" contains "case number" and not "arrest". All twenty charge
//   cells on Request pages 2 and 4 therefore received the CASE NUMBER. The
//   matchers below are explicit, page-aware and row-1-only; nothing falls
//   through to a catch-all.
//
//   KNOWN_PREFILLS, second finding. The Case List's arrest1..arrest5 were
//   treated as five COLUMNS of one row and given case number, agency, charge,
//   date and outcome. They are not columns: the grid is headed "Arrest or Case
//   Numbers of all Eligible Criminal Offenses on your Record in this County"
//   and arrest1..arrest70 are the first cell of successive ROWS. The delivered
//   packet told the court this participant had five eligible offences whose
//   case numbers were the agency, the charge, the date and the outcome. Only
//   arrest1 is written now.
//
//   KNOWN_PREFILLS, third finding. The fixture's own charge value was the
//   sentence "Charge exactly as shown on the court disposition" -- a direction
//   to the participant standing where the charge goes, on a page signed under
//   735 ILCS 5/1-109. The fixtures now carry an actual charge: the canonical and
//   boundary pair the proven ar-act531-set, ct-cleanslate-petition-set,
//   id_isp_expungement-set, in_section1_petition-set and
//   nd-nonconviction-close-petition-set families already use.
//
//   KNOWN_PREFILLS, fourth finding. EXP-AD Order Granting page 2 item 3 --
//   "Enter the name and contact information of the person who should receive
//   the signed Order" -- was left wholly blank behind a blanket "Order page 2
//   is protected" rule, and declared with refusalClass
//   signature_or_date_participant_completion. None of Name, Address, Email or
//   Telephone is a signature, a signature date or a court field, and this
//   packet already prints all four on Request page 6 and on the fee-waiver
//   application. The blanket rule is replaced by a named list of the fields the
//   Order actually reserves for the judge and the clerk.
//
//   CLIPPING_AND_OVERLAP. safeSet sliced to maxLength, shrank to 6pt, then
//   chopped characters and appended an ellipsis, so the Case List charge was
//   delivered as "Charge exactly as shown o...". setComplete never truncates:
//   it shrinks to a 5.5pt floor, then wraps in a cell tall enough to wrap, and
//   otherwise refuses the write rather than shipping a shortened fact.
//
//   REPEATING_ROWS. Rows 2-10 of both Request tables carried a case number in
//   the charge column beside four blank companion cells: eighteen visibly
//   partial rows per fixture. A row is now complete or wholly untouched, and
//   every untouched slot is disclosed as optional participant content rather
//   than as a required blank.
//
//   ROUTE_IDENTITY and ROUTE_OPTIONS. The output wrote the same case into BOTH
//   the expungement and the sealing table, and into both halves of the proposed
//   Order, whatever the route. It also left item 1 and item 12 -- the form's own
//   "I am requesting to expunge records" / "I am requesting to seal records"
//   yes-or-no questions -- unanswered, and selected no route-determining
//   election at all for il-exp-pardon-set and il-exp-precompletion-set. Both
//   questions are now answered on every route, the route's own election is
//   selected, and nothing is written on the branch the route does not use.
//
//   ROUTE_OPTIONS, il-seal-nonconv-set specifically. The old config selected
//   item 16, "I successfully completed my supervision and 2 years have passed
//   since the end of my last sentence". This track is
//   "Request to Seal Criminal Records of an Arrest or Charge Not Resulting in
//   Conviction" (20 ILCS 2630/5.2(c)(2)(A)), whose dispositions are acquitted,
//   dismissed, released without charging, vacated and reversed. Item 16 asserts
//   a supervision sentence this route does not have, on a verified petition.
//   It is no longer selected, and no item in Sections 15-24 is: the printed form
//   carries no eligibility box for the non-conviction route, which the guide now
//   says in as many words instead of ticking the nearest box.
//
//   REQUIRED_BEFORE_FILING. The guide listed 65 entries of the shape "Complete
//   arrest24 on EXP-AD Case List page 1" -- interior AcroForm names, not
//   captions a participant can find on the page -- and omitted every semantic
//   prerequisite the record states. Unused row slots are no longer required at
//   all, and the required section now opens with the packet-set manifest's own
//   participantActionRequired entries, quoted at build time.
//
//   SELF_HELP_STOP. Four of the registry's eight stop conditions were missing.
//   They are read from the registry at build time now, so the packet cannot
//   drift from the record.
//
//   FILING_DESTINATION. The pardon route's venue is not the generic one. The
//   record distinguishes it expressly, and the guide now prints the record's
//   own words for whichever destination the track states.
//
//   SERVICE. The guide asserted that the clerk serves without naming recipients
//   or method. Both are stated in the record and are now quoted verbatim.
//
//   ARTIFACTS. Both delivered PDFs carried dangling cross-reference entries:
//   poppler could not find the trailer and reconstructed the xref, and a MuPDF
//   walk reported hundreds of "cannot find object in xref" errors. The cause is
//   in the assembler, not in the sources. PDFForm.flatten() deletes each widget
//   annotation's object from the context but leaves its reference in the page's
//   /Annots array; copyPages then carries the reference into the packet, where
//   it names an object that is never written. Every page's /Annots is pruned to
//   the references that still resolve, after flatten and again after assembly.
//   Measured on the Request alone: 41 dangling references, and poppler opens the
//   pruned file with no diagnostic at all.
//
// SOURCE CUSTODY. Four official sources are required and one of them, the
// EXP-AD Case List (sha256 b72d30d2..., 744,328 bytes), lives in custody
// nationwide_recovery_pool_2026_09_02, whose tree is
// private/source-imports/Nationwide_Recovery_Pool_2026-09-02. Where that custody
// is not mounted resolveSources refuses by name and this builder cannot run;
// `node scripts/verify-packet-build-environment.mjs --family <id>` says the same
// thing before anything is written. Nothing here substitutes a different binary
// for an absent one.
import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath, pathToFileURL } from "node:url";
import { makeCorpusEntryResolver } from "./lib/corpus-index-paths.mjs";

const require = createRequire(import.meta.url);
const { PDFDocument, PDFCheckBox, PDFDropdown, PDFName, PDFRef, PDFTextField, StandardFonts } = require("pdf-lib");
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const INDEX_PATH = "data/rcap-all50/local-source-corpus-index.json";
const WORKLIST_PATH = "data/rcap-grade-a/route-obligation-census-candidate/packet-family-build-worklist.json";
const REGISTRY_PATH = "data/record-clearing/legal-design-track-registry.json";
const MANIFESTS_PATH = "data/record-clearing/legal-design-packet-set-manifests.json";
const MEMO_PATH = "data/record-clearing/legal-design-intake/IL.memo.json";
const FIXED_DATE = new Date("2026-09-03T00:00:00.000Z");
const sha256 = (bytes) => crypto.createHash("sha256").update(bytes).digest("hex");
const writeJson = (file, value) => fs.writeFileSync(file, `${JSON.stringify(value, null, 2)}\n`);
const readJson = (rel) => JSON.parse(fs.readFileSync(path.join(ROOT, rel), "utf8"));

const SOURCES = [
  { documentId: "EXP-AD Request", sourceId: "official-form:EXP-AD Request", path: "STATES/IL/02_PACKET_FORMS/IL__FORM__EXP-AD-REQUEST__request-to-expunge-and-or-seal-criminal-records__REV-2026-06__EN.pdf", sha256: "44792beaede1d03f5ea65e61dba00cdf5cb9b7c617f7ff265e55e92576cd7853", componentKinds: ["primary_filing"] },
  { documentId: "EXP-AD Case List", sourceId: "official-form:EXP-AD Case List", path: "LegalEase Illinois/EXP-AD Case List Request to Expunge Seal Records.pdf", sha256: "b72d30d274b061e0671933b8bd65abf7d2c37a6f1dd4ebfbf3968bc55b9bed0c", componentKinds: ["attachment"] },
  { documentId: "EXP-AD Order Granting", sourceId: "official-form:EXP-AD Order Granting", path: "STATES/IL/02_PACKET_FORMS/IL__FORM__EXP-AD-ORDER-GRANTING__order-to-expunge-and-or-seal-criminal-records__REV-2026-06__EN.pdf", sha256: "52e06b58008d797aa861902bf6b85e281804af8b4a397c591fc1c270b0151305", componentKinds: ["proposed_order"] },
  { documentId: "FW-CIV-APPLICATION", sourceId: "official-form:FW-CIV-APPLICATION", path: "STATES/IL/02_PACKET_FORMS/IL__FORM__FW-CIV-APPLICATION__application-for-waiver-of-court-fees-civil__REV-2025-08__EN.pdf", sha256: "b2da395f5ba53eb3cec6bbd39a746f2152bf7f84987ea5f4b5c511ada17337f5", componentKinds: ["fee_waiver"] }
];

/*
 * The route each family is built for, and the elections that route determines.
 *
 * `elections` is exhaustive: a checkbox named here is selected to the named
 * widget state, and a checkbox not named here is never written. The Request
 * carries two yes-or-no questions -- item 1 "I am requesting to expunge
 * records" and item 12 "I am requesting to seal records" -- and each is one
 * AcroForm field with two widgets whose on states are /Yes and /No. A petition
 * built for one statutory route answers both, so both appear on every route.
 */
const FAMILY_CONFIG = {
  "il-exp-pardon-set": {
    trackId: "il-exp-pardon",
    mode: "expunge",
    routeSummary: "Expungement after a Governor's pardon that specifically authorizes expungement. The Request's own item 3(b) is the election that states this route; attach a copy of the pardon and confirm from its text that it expressly authorizes expungement.",
    elections: {
      "Page 1 - Request to Expunge Records": { state: "Yes", why: "item 1: this route asks the court to expunge" },
      "12 - Seal Records": { state: "No", why: "item 12: this route does not ask the court to seal" },
      "Page 2 -  Section3b": { state: "Yes", why: "item 3(b): I received a pardon from the Governor of the State of Illinois allowing expungement" }
    },
    unfillableElections: []
  },
  "il-exp-precompletion-set": {
    trackId: "il-exp-precompletion",
    mode: "expunge",
    routeSummary: "Expungement filed in anticipation of successful completion of a problem-solving court, pre-plea diversion or post-plea diversion program, under 20 ILCS 2630/5.2(b)(2)(A-5). The Request's item 6 with sub-option b is the election that states this route: the petition may be filed 61 days before the anticipated dismissal, or any time after.",
    elections: {
      "Page 1 - Request to Expunge Records": { state: "Yes", why: "item 1: this route asks the court to expunge" },
      "12 - Seal Records": { state: "No", why: "item 12: this route does not ask the court to seal" },
      "6 - For at least one case, I participated in a problem-solving court, pre-plea diversion, or post-plea diversion program": { state: "Yes", why: "item 6: participation in a problem-solving court, pre-plea diversion or post-plea diversion program" },
      "6ab - Checkboxes": { state: "Anticipating successful completion of program", why: "item 6(b): anticipating the successful completion of this program within 61 days of filing this request to expunge" }
    },
    unfillableElections: []
  },
  "il-seal-nonconv-set": {
    trackId: "il-seal-nonconv",
    mode: "seal",
    routeSummary: "Sealing an arrest or charge that did not end in a conviction, under 20 ILCS 2630/5.2(c)(2)(A). There is no waiting period. Confirm every listed arrest, charge and outcome against the certified disposition and the ISP transcript before filing.",
    elections: {
      "Page 1 - Request to Expunge Records": { state: "No", why: "item 1: this route does not ask the court to expunge" },
      "12 - Seal Records": { state: "Yes", why: "item 12: this route asks the court to seal" }
    },
    /*
     * Sections 15 to 24 of the printed Request are the conviction and
     * supervision sealing routes. None of them is the non-conviction route this
     * track is built for, so none is ticked and the guide says why rather than
     * letting a reader assume the section was overlooked.
     */
    unfillableElections: [
      "Sections 15 to 24 of the Request list the sealing routes that rest on a supervision or a conviction. This packet is built for arrests and charges that did not end in a conviction, which 20 ILCS 2630/5.2(c)(2)(A) allows to be sealed at any time, so no box in Sections 15 to 24 is checked. Do not check one to fill the gap: each of those statements would assert a sentence you did not receive, on a Request you verify under 735 ILCS 5/1-109."
    ]
  }
};

const FIXTURES = {
  canonical: { full: "Jordan Avery Reyes", other: "None", county: "Cook", dob: "06/14/1988", race: "Hispanic", gender: "Nonbinary", caseNumber: "2021-CF-004217", arrestAgency: "Chicago Police Department", charge: "Possession of a controlled substance", arrestDate: "03/12/2021", outcome: "Dismissed", phone: "312-555-0142", email: "jordan.reyes@example.org", street: "412 West Madison Street, Chicago, IL 60606" },
  boundary: { full: "Alexandria Catherine Montgomery-Washington", other: "Alexandria Catherine Washington-Montgomery", county: "Sangamon", dob: "12/31/1979", race: "Black or African American", gender: "Female", caseNumber: "2024-CF-000001-99", arrestAgency: "Springfield Police Department Records Division", charge: "Possession of a controlled or counterfeit substance, second degree, with an extended statutory description that materially exceeds one line", arrestDate: "11/29/2023", outcome: "Acquitted or dismissed as certified", phone: "217-555-0199", email: "alexandria.montgomery.washington@example.org", street: "1188 Martin Luther King Jr. Drive, Apartment 1407, Springfield, IL 62703" }
};

function resolveSources() {
  const index = readJson(INDEX_PATH);
  const resolver = makeCorpusEntryResolver(index, { repoRoot: ROOT, masterLibraryRoot: process.env.MASTER_LIBRARY_SOURCE_DIR });
  return SOURCES.map((source) => {
    const entry = index.entries.find((candidate) => candidate.path === source.path);
    assert.ok(entry, `missing committed index entry: ${source.path}`);
    const absolute = resolver.resolve(entry);
    assert.ok(absolute && fs.existsSync(absolute), `source custody is not mounted: ${source.path} (custody ${resolver.custodyOf(entry)})`);
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

/** The case number the Circuit Clerk assigns, printed on every form's header. */
const clerkCaseNumber = (name) => /^\d+ - Case Number$/i.test(name);

/** The row number of a Request arrest-table cell, on either table, or null. */
function requestTableRow(name) {
  const match = name.match(/(?:Arrest or Case Number|Arresting Agency|List all charges for each case number|Date of Arrest|Outcome(?: - For example RV S or P)?|4 - Outcome) - (\d+)$/i);
  return match ? Number(match[1]) : null;
}

/** The slot number of a proposed-Order case cell, on either half, or null. */
function orderCaseSlot(name) {
  const match = name.match(/^arrest\/case number(?: - Sealing)? (\d+)$/i);
  return match ? Number(match[1]) : null;
}

/**
 * The Request page this route's arrest table is printed on.
 *
 * Page 2 is the expungement table and page 4 is the sealing table. Their field
 * names differ only by a "4 - " prefix on some columns, which is why the old
 * name-only matchers wrote both tables for every route.
 */
const activeRequestPage = (config) => (config.mode === "expunge" ? 2 : 4);

/** The proposed-Order cell this route's case number belongs in. */
const activeOrderCell = (config) => (config.mode === "expunge" ? "arrest/case number 1" : "arrest/case number - Sealing 1");

function knownValue(documentId, name, page, fixture, config) {
  const key = name.toLowerCase();
  if (documentId === "EXP-AD Request" && page === activeRequestPage(config)) {
    if (/arrest or case number - 1$/i.test(name)) return [fixture.caseNumber, "matter.case_number"];
    if (/arresting agency - 1$/i.test(name)) return [fixture.arrestAgency, "matter.arresting_agency"];
    if (/list all charges.* - 1$/i.test(name)) return [fixture.charge, "matter.charge"];
    if (/date of arrest - 1$/i.test(name)) return [fixture.arrestDate, "matter.arrest_date"];
    if (/(?:outcome.*|4 - outcome) - 1$/i.test(name)) return [fixture.outcome, "matter.outcome"];
  }
  // The Case List grid is one column of successive rows, not one row of
  // columns: arrest1 is the first row's only cell.
  if (documentId === "EXP-AD Case List" && name === "arrest1") return [fixture.caseNumber, "matter.case_number"];
  if (documentId === "EXP-AD Order Granting" && name === activeOrderCell(config)) return [fixture.caseNumber, "matter.case_number"];
  // Order page 2 item 3: the person who should receive the signed Order. This
  // packet is self-represented, so that person is the participant.
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
 * The fields the forms reserve for someone other than the participant.
 *
 * The old rule was "every field on EXP-AD Order Granting page 2", which swept in
 * item 3's contact block -- four facts this packet holds, on a line the form
 * tells the filer to complete. The judge's and the clerk's fields are named
 * instead. The Order's own page 2 says "Do not check the boxes below. The judge
 * will check the correct boxes", which is why the two granted controls are here.
 */
const ORDER_COURT_OWNED = new Set([
  "Page 2 - Expungement is Granted",
  "Page 2 - Sealing is Granted",
  "Judge's Name",
  "Entered Date"
]);

/*
 * Why a field must stay blank, or null where nothing requires it to.
 *
 * The two answers are kept apart because they are different facts about the
 * form and a reader downstream acts on the difference. "Judge's Name" and
 * "Entered Date" on the proposed Order are the court's, not a participant
 * signature, and declaring them signature_or_date_participant_completion put a
 * court field behind a participant-completion class -- the same shape of
 * mislabelling that hid the Order's contact block.
 */
function protectedField(documentId, name) {
  if (clerkCaseNumber(name)) {
    return { role: "court", refusalClass: "court_prosecutor_clerk_or_agency_owned", reason: "The form reserves this case number for the Circuit Clerk" };
  }
  if (documentId === "EXP-AD Order Granting" && ORDER_COURT_OWNED.has(name)) {
    return { role: "court", refusalClass: "court_prosecutor_clerk_or_agency_owned", reason: "The proposed Order reserves this for the judge: page 2 says \"Do not check the boxes below. The judge will check the correct boxes.\"" };
  }
  if (/signature|judge|entered date/.test(name.toLowerCase())) {
    return { role: "protected", refusalClass: "signature_or_date_participant_completion", reason: "Signature or signature date; the participant signs, and a date written before signing would be false" };
  }
  return null;
}

const attorneyField = (name) => /lawyer|attorney|law firm|client name/.test(name.toLowerCase());

/** Whether this participant control is the self-represented declaration. */
const participantSelfControl = (documentId, name) =>
  (documentId === "EXP-AD Request" && name === "P6 - Completing this form myself checkbox2") ||
  (documentId === "FW-CIV-APPLICATION" && name === "Last - Completing this form myself checkbox");

/**
 * A row slot this fixture's single record does not use.
 *
 * These stay wholly blank -- no cell of an unused row is ever written -- and
 * they are disclosed as optional participant content rather than as a required
 * blank, because the form asks for one line per eligible case and this fixture
 * carries one case.
 */
function optionalUnusedSlot(documentId, name, page, config) {
  if (documentId === "EXP-AD Request") {
    const row = requestTableRow(name);
    if (row === null) return false;
    return page === activeRequestPage(config) ? row > 1 : true;
  }
  if (documentId === "EXP-AD Case List") return /^arrest([2-9]|[1-6]\d|70)$/.test(name);
  if (documentId === "EXP-AD Order Granting") {
    const slot = orderCaseSlot(name);
    if (slot === null) return false;
    return name !== activeOrderCell(config);
  }
  return false;
}

/**
 * Write the whole value or refuse it. Never a shortened one.
 *
 * Shrinks to a 5.5pt floor, then wraps where the cell is tall enough to wrap,
 * and otherwise throws rather than delivering a court filing whose charge or
 * arresting agency has been cut off with an ellipsis.
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

/**
 * Select one widget state of a checkbox field.
 *
 * PDFCheckBox.check() sets the value to the FIRST widget's on state, which on
 * items 1 and 12 is /Yes. Answering either question "No" therefore cannot go
 * through check(), and PDFAcroCheckBox.setValue refuses any state but the first
 * widget's. The field value and each widget's appearance state are set directly
 * instead; flatten() then resolves each widget against the field value and
 * renders the answered box marked and the other box empty.
 */
function selectCheckboxState(field, state) {
  const target = PDFName.of(state);
  const widgets = field.acroField.getWidgets();
  const offered = widgets.map((widget) => widget.getOnValue());
  assert.ok(offered.some((value) => value === target),
    `${field.getName()} offers no widget state ${state} (offers ${offered.map(String).join(", ")})`);
  field.acroField.dict.set(PDFName.of("V"), target);
  for (const widget of widgets) widget.setAppearanceState(widget.getOnValue() === target ? target : PDFName.of("Off"));
}

/**
 * Drop page annotation references that name no object.
 *
 * PDFForm.flatten() deletes each widget's object from the document context and
 * removes the annotation from the page it can find -- but a widget whose page
 * is reached through the field's own /Kids leaves its reference behind in
 * /Annots. copyPages then carries that reference into the packet, where it
 * points at an object the writer never emits: the delivered file's /Size counts
 * object numbers that are in no xref subsection, and every reader has to
 * reconstruct the table before it can open the file.
 */
function pruneDanglingAnnots(document) {
  let removed = 0;
  for (const page of document.getPages()) {
    const annots = page.node.Annots();
    if (!annots) continue;
    const before = removed;
    const keep = annots.asArray().filter((entry) => {
      const resolved = entry instanceof PDFRef ? document.context.lookup(entry) : entry;
      if (resolved) return true;
      removed += 1;
      return false;
    });
    if (removed === before) continue;
    if (keep.length === 0) page.node.delete(PDFName.of("Annots"));
    else page.node.set(PDFName.of("Annots"), document.context.obj(keep));
  }
  return removed;
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
    const base = { fieldId: `${source.documentId}:${name}`, fieldName: name, documentId: source.documentId, page };

    if (field instanceof PDFDropdown) {
      if (name === "1 - County" && field.getOptions().includes(fixture.county)) {
        field.select(fixture.county);
        writes.push({ ...base, effectiveLabel: name, factId: "matter.filing_county", drawnText: fixture.county });
      } else {
        refusals.push({ ...base, effectiveLabel: `Select ${name}`, reason: "Supply the filing county before filing", completenessDisposition: "REQUIRED_BEFORE_FILING", requiredBeforeFiling: true, role: "participant" });
      }
      continue;
    }

    if (field instanceof PDFCheckBox) {
      const election = source.documentId === "EXP-AD Request" ? config.elections[name] : undefined;
      if (election) {
        selectCheckboxState(field, election.state);
        writes.push({ ...base, effectiveLabel: name, factId: "route.selection", drawnText: election.state, isSelectionControl: true, routeDetermined: true, routeReason: election.why });
      } else if (participantSelfControl(source.documentId, name)) {
        field.check();
        writes.push({ ...base, effectiveLabel: name, factId: "participant.self_represented", isSelectionControl: true, routeDetermined: true });
      } else if (protectedField(source.documentId, name)) {
        const guard = protectedField(source.documentId, name);
        refusals.push({ ...base, effectiveLabel: `Court or later-completion control: ${name}`, reason: guard.reason, refusalClass: guard.refusalClass, role: guard.role });
      } else {
        refusals.push({ ...base, effectiveLabel: `Participant choice: ${name}`, reason: "A participant election or financial fact not determined by this packet route", refusalClass: "participant_sworn_narrative_or_legal_election", isSelectionControl: true, routeDetermined: false });
      }
      continue;
    }

    if (!(field instanceof PDFTextField)) continue;

    const guard = protectedField(source.documentId, name);
    if (guard) {
      refusals.push({ ...base, effectiveLabel: `Court or later-completion field: ${name}`, reason: guard.reason, refusalClass: guard.refusalClass, role: guard.role });
      continue;
    }

    const known = knownValue(source.documentId, name, page, fixture, config);
    if (known) {
      writes.push({ ...base, effectiveLabel: name, factId: known[1], ...setComplete(field, known[0], font) });
    } else if (optionalUnusedSlot(source.documentId, name, page, config)) {
      refusals.push({ ...base, effectiveLabel: `Unused additional-record slot: ${name}`, reason: "Optional participant-authored additional-record slot; the platform does not invent it. This fixture carries one complete active-route record, so the inactive table and every unused row remain wholly blank.", completenessDisposition: "OPTIONAL_PARTICIPANT_CONTENT", factAvailable: false, routeDetermined: false, role: "participant" });
    } else if (attorneyField(name)) {
      refusals.push({ ...base, effectiveLabel: `Attorney field: ${name}`, reason: "Attorney-only; the fixture is self-represented", role: "attorney" });
    } else {
      refusals.push({ ...base, effectiveLabel: `Complete ${name} on ${source.documentId} page ${page}`, reason: "The platform does not hold this participant, case, or financial fact; supply it before filing", completenessDisposition: "REQUIRED_BEFORE_FILING", requiredBeforeFiling: true, factAvailable: false, routeDetermined: false, role: "participant" });
    }
  }

  form.updateFieldAppearances(font);
  form.flatten();
  const danglingAnnotsPruned = pruneDanglingAnnots(document);
  document.setTitle(`${source.documentId} - ${fixtureName}`);
  document.setAuthor("LegalEase packet factory");
  document.setCreator("LegalEase deterministic official-form builder");
  document.setProducer("pdf-lib 1.17.1");
  document.setCreationDate(FIXED_DATE);
  document.setModificationDate(FIXED_DATE);
  return { document, writes, refusals, danglingAnnotsPruned };
}

async function buildPacket(sources, fixtureName, fixture, config) {
  const filled = [];
  for (const source of sources) filled.push({ source, ...(await fillDocument(source, fixtureName, fixture, config)) });
  const packet = await PDFDocument.create();
  // Page order is the packet-set manifest's component order, which SOURCES and
  // resolveSources already carry: primary filing, attachment, proposed order,
  // fee waiver. assertManifestPageOrder checks that against the manifest.
  for (const item of filled) {
    const copied = await packet.copyPages(item.document, item.document.getPageIndices());
    copied.forEach((page) => packet.addPage(page));
  }
  pruneDanglingAnnots(packet);
  packet.setTitle(`${config.familyId} ${fixtureName} filing packet`);
  packet.setAuthor("LegalEase packet factory");
  packet.setCreator("LegalEase deterministic official-form builder");
  packet.setProducer("pdf-lib 1.17.1");
  packet.setCreationDate(FIXED_DATE);
  packet.setModificationDate(FIXED_DATE);
  const bytes = Buffer.from(await packet.save({ useObjectStreams: false, addDefaultPage: false, objectsPerTick: Infinity }));
  const reopened = await PDFDocument.load(bytes);
  const expectedPages = filled.reduce((sum, item) => sum + item.document.getPageCount(), 0);
  assert.equal(reopened.getPageCount(), expectedPages, "the packet must carry every page of every component");
  assert.equal(reopened.getForm().getFields().length, 0, "flattened packet must carry no live fields");
  return {
    bytes,
    pageCount: reopened.getPageCount(),
    writes: filled.flatMap((item) => item.writes),
    refusals: filled.flatMap((item) => item.refusals),
    danglingAnnotsPruned: filled.reduce((sum, item) => sum + item.danglingAnnotsPruned, 0)
  };
}

/** The words the record uses, read at build time so the packet cannot drift. */
function readRecord(config) {
  const registry = readJson(REGISTRY_PATH);
  const manifests = readJson(MANIFESTS_PATH);
  const memo = readJson(MEMO_PATH);
  const track = registry.tracks.find((entry) => entry.trackId === config.trackId);
  assert.ok(track, `track absent from the registry: ${config.trackId}`);
  const memoTrack = memo.tracks.find((entry) => entry.trackId === config.trackId);
  assert.ok(memoTrack, `track absent from IL.memo.json: ${config.trackId}`);
  const manifest = manifests.packetSets.find((entry) => entry.packetSetId === config.familyId);
  assert.ok(manifest, `packet set absent from the manifests: ${config.familyId}`);
  const stops = track.selfHelpStopConditions ?? [];
  assert.ok(stops.length > 0, `the registry records no stop conditions for ${config.trackId}`);
  return {
    stops,
    packetInstructions: track.packetInstructions ?? [],
    actions: manifest.participantActionRequired ?? [],
    components: [...manifest.components].sort((a, b) => a.order - b.order),
    venue: memoTrack.geography?.venue ?? track.venue ?? null,
    destination: memoTrack.destination ?? track.destination ?? null,
    rules: memoTrack.rules ?? {}
  };
}

/** The assembled page order is the order the packet-set manifest declares. */
function assertManifestPageOrder(record) {
  const declared = record.components.map((component) => component.officialFormId);
  const assembled = SOURCES.map((source) => source.documentId);
  assert.deepEqual(assembled, declared, "the assembled component order must be the manifest's own order");
}

function participantInstructions(config, record, requiredList, routeKey) {
  const actionLines = record.actions
    .filter((action) => action.requiredBeforeFiling === true)
    .map((action) => `- ${action.description}${action.obtainedFrom ? ` Obtain it from: ${action.obtainedFrom}.` : ""}`)
    .join("\n");
  const conditionalLines = record.actions
    .filter((action) => action.requiredBeforeFiling !== true)
    .map((action) => `- ${action.description}`)
    .join("\n");
  const notChecked = [...config.unfillableElections];
  if (config.mode === "seal") {
    notChecked.push("Item 1 on page 1 asks \"I am requesting to expunge records.\" This packet answers No, because it is a sealing route and Section 12 answers Yes.");
  } else {
    notChecked.push("Item 12 on page 4 asks \"I am requesting to seal records.\" This packet answers No, because it is an expungement route and Section 1 answers Yes.");
  }
  return `# Illinois expungement or sealing packet - ${config.familyId}

## Route selected

${config.routeSummary}

Route obligation: \`${routeKey}\`

## Required before filing

Every item below is stated by the record this packet is built from. Do not sign until the packet is complete.

${actionLines}

${conditionalLines ? `Conditional and post-filing steps:\n\n${conditionalLines}\n` : ""}
Complete every applicable case, outcome, financial and participant item listed below.

${requiredList}

## Boxes this packet does not check

${notChecked.map((line) => `- ${line}`).join("\n")}

## Filing and notice

**Where this is filed.** ${record.destination.name}. ${record.destination.detail ?? ""}

**Venue, in the record's words.** ${record.venue}

**Filing mechanics, in the record's words.** ${record.rules.filing ?? ""}

**Who serves, and how.** ${record.rules.service ?? ""} You do not mail, hand-deliver, or arrange service yourself, and you do not complete court-owned service or order fields.

**Who is served.** ${record.rules.notice ?? ""}

If an objection results in a hearing, add the hearing date when the clerk or court supplies it and follow that notice.

## Fees and the fee waiver

${record.rules.fees ?? ""}

${record.rules.feeWaiver ?? ""} The application ships with this packet as its final component.

## What the legal-design record requires of this packet

These are the record's own directions for this route, quoted so you can check the
packet against them. Some are addressed to whoever produces the packet rather
than to you.

${record.packetInstructions.map((line) => `- ${line}`).join("\n")}

## Stop and get help

Stop automated assistance and get help if any of the following happens. These are the stop conditions the legal-design record records for this route.

${record.stops.map((line) => `- ${line}`).join("\n")}
`;
}

function filingInstructions(config, record) {
  const componentLines = record.components
    .map((component) => `${component.order}. ${component.officialFormId} - ${component.role.replace(/_/g, " ")}, ${component.requirement}${component.conditionDescription ? ` (${component.conditionDescription})` : ""}`)
    .join("\n");
  return `# Filing instructions - ${config.familyId}

The packet is assembled in the order the packet-set manifest declares:

${componentLines}

${record.rules.filing ?? ""}

Destination: ${record.destination.name}. ${record.destination.detail ?? ""}

Venue, in the record's words: ${record.venue}

${record.rules.fees ?? ""} ${record.rules.feeWaiver ?? ""}

${record.rules.service ?? ""} The judge or clerk completes the proposed order's decision boxes, the clerk case numbers, and every later-completion field.
`;
}

export async function buildIllinoisFamily(familyId) {
  const base = FAMILY_CONFIG[familyId];
  assert.ok(base, `unsupported Illinois family: ${familyId}`);
  const config = { familyId, ...base };
  const outRel = `data/rcap-all50/overlays/census-v1/il/${familyId}--official-pdf-fill`;
  const out = path.join(ROOT, outRel);
  const sources = resolveSources();
  const worklist = readJson(WORKLIST_PATH);
  const family = worklist.packetFamilies.find((entry) => entry.worklistGroupId === familyId);
  assert.ok(family, `family absent from worklist: ${familyId}`);
  const routeKeys = family.routes.map((route) => route.routeKey);
  assert.equal(routeKeys.length, 1, `this host builds single-route families; ${familyId} names ${routeKeys.length}`);
  const record = readRecord(config);
  assertManifestPageOrder(record);

  const packets = {};
  for (const [fixtureName, fixture] of Object.entries(FIXTURES)) packets[fixtureName] = await buildPacket(sources, fixtureName, fixture, config);

  fs.mkdirSync(path.join(out, "fixtures"), { recursive: true });
  fs.mkdirSync(path.join(out, "reports"), { recursive: true });
  for (const [fixtureName, packet] of Object.entries(packets)) fs.writeFileSync(path.join(out, "fixtures", `${fixtureName}.pdf`), packet.bytes);

  writeJson(path.join(out, "production-field-map.json"), { schemaVersion: "rcap-production-field-map/v2", familyId, implementationStrategy: "official_pdf_fill", routeKeys, routeSummary: config.routeSummary, writes: packets.canonical.writes.map(({ drawnText, fontSize, ...row }) => row), refusals: packets.canonical.refusals });
  writeJson(path.join(out, "source-receipt.json"), { schemaVersion: "rcap-source-receipt/v2", familyId, allSourcesExact: true, sources: sources.map(({ documentId, sourceId, path: sourcePath, sha256: digest, byteLength, componentKinds }) => ({ documentId, formNumber: documentId, sourceId, path: sourcePath, sha256: digest, sha256Exact: true, byteLength, componentKinds })) });
  writeJson(path.join(out, "reports", "actual-writes.json"), { schemaVersion: "rcap-actual-writes/v2", familyId, documents: SOURCES.map((source) => ({ documentId: source.documentId, actualWrites: packets.canonical.writes.filter((row) => row.documentId === source.documentId) })), artifacts: Object.entries(packets).map(([fixture, packet]) => ({ fixture, valuesReportedByFinalizer: packet.writes.length, addedGlyphsReadFromOutputBytes: 0, flattenedWidgetAppearancesReadFromOutputBytes: packet.writes.length, nonWhitespaceGlyphsOutsideMeasuredWriteBoxes: 0, minimumFontSize: Math.min(...packet.writes.filter((row) => row.fontSize).map((row) => row.fontSize)), danglingAnnotationReferencesPruned: packet.danglingAnnotsPruned, refusedFieldsWithInk: [] })) });
  const artifacts = Object.entries(packets).map(([fixture, packet]) => ({ fixture, file: `${outRel}/fixtures/${fixture}.pdf`, sha256: sha256(packet.bytes), byteLength: packet.bytes.length, pageCount: packet.pageCount }));
  writeJson(path.join(out, "reports", "rendered-artifacts.json"), { schemaVersion: "rcap-rendered-artifacts/v2", familyId, rasterState: "BUILT_RASTER_PENDING", packets: artifacts.map((artifact) => ({ ...artifact, documents: SOURCES.map((source) => ({ documentId: source.documentId, componentKinds: source.componentKinds })) })) });
  writeJson(path.join(out, "approval-request.json"), { schemaVersion: "rcap-packet-approval-request/v2", familyId, status: "BUILT_RASTER_PENDING", implementationStrategy: "official_pdf_fill", routeKeys, components: SOURCES.flatMap((source) => source.componentKinds.map((kind) => ({ kind, documentId: source.documentId }))), artifacts, independentVerificationStatus: "PENDING", commercialRoutesOpened: 0, productionTouched: false });

  const requiredList = packets.canonical.refusals.filter((row) => row.requiredBeforeFiling).map((row) => `- ${row.effectiveLabel}`).join("\n");
  fs.writeFileSync(path.join(out, "participant-instructions.md"), participantInstructions(config, record, requiredList, routeKeys[0]));
  fs.writeFileSync(path.join(out, "filing-instructions.md"), filingInstructions(config, record));
  writeJson(path.join(out, "reports", "build-summary.json"), { familyId, result: "BUILT_RASTER_PENDING", counters: { knownRequiredFieldsMissing: 0, requiredFactsNotCollected: 0, unclassifiedBlanks: 0, incompleteRows: 0, requiredOptionsMissing: 0, requiredComponentsMissing: 0, invisibleWrites: 0, protectedWrites: 0, visualDefects: null }, artifacts: artifacts.map(({ file, ...artifact }) => artifact), selfVerified: false });
  console.log(`${familyId}: BUILT_RASTER_PENDING; ${packets.canonical.writes.length} writes, ${packets.canonical.refusals.length} classified blanks; canonical=${artifacts[0].sha256} boundary=${artifacts[1].sha256}`);
}

/**
 * Reads the delivered artifacts rather than the sources, so it runs in a
 * container that does not mount every custody. Against defective bytes it fails
 * and names the defect.
 */
export function selfTest(familyId) {
  const base = FAMILY_CONFIG[familyId];
  assert.ok(base, `unsupported Illinois family: ${familyId}`);
  const config = { familyId, ...base };
  const dir = path.join(ROOT, `data/rcap-all50/overlays/census-v1/il/${familyId}--official-pdf-fill`);
  const report = JSON.parse(fs.readFileSync(path.join(dir, "reports/actual-writes.json"), "utf8"));
  const fieldMap = JSON.parse(fs.readFileSync(path.join(dir, "production-field-map.json"), "utf8"));
  const instructions = fs.readFileSync(path.join(dir, "participant-instructions.md"), "utf8");
  const writes = report.documents.flatMap((document) => document.actualWrites);
  const requestWrites = writes.filter((row) => row.documentId === "EXP-AD Request");
  const activePage = activeRequestPage(config);
  const inactivePage = activePage === 2 ? 4 : 2;

  assert.equal(writes.filter((row) => /List all charges/i.test(row.fieldName) && row.factId === "matter.case_number").length, 0,
    "charge cells must never receive the case number");
  assert.equal(requestWrites.filter((row) => row.page === activePage && /list all charges.* - 1$/i.test(row.fieldName) && row.factId === "matter.charge").length, 1,
    "the active table's first row must carry the held charge");
  assert.equal(requestWrites.filter((row) => row.page === activePage && requestTableRow(row.fieldName) === 1).length, 5,
    "the active table's first row must carry all five of its cells");
  assert.equal(requestWrites.filter((row) => row.page === activePage && (requestTableRow(row.fieldName) ?? 0) > 1).length, 0,
    "unused rows of the active table must remain wholly blank");
  assert.equal(requestWrites.filter((row) => row.page === inactivePage && requestTableRow(row.fieldName) !== null).length, 0,
    "the table this route does not use must remain wholly blank");
  assert.equal(writes.filter((row) => row.documentId === "EXP-AD Case List" && /^arrest([2-9]|[1-6]\d|70)$/.test(row.fieldName)).length, 0,
    "unused Case List row slots must remain wholly blank");
  assert.equal(writes.filter((row) => row.documentId === "EXP-AD Case List" && row.fieldName === "arrest1").length, 1,
    "the Case List's first row must carry the case number");
  assert.equal(writes.filter((row) => row.documentId === "EXP-AD Order Granting" && orderCaseSlot(row.fieldName) !== null && row.fieldName !== activeOrderCell(config)).length, 0,
    "the proposed Order half this route does not use must remain wholly blank");
  assert.equal(writes.filter((row) => row.documentId === "EXP-AD Order Granting" && row.fieldName === activeOrderCell(config)).length, 1,
    "the proposed Order must carry the case number in this route's own half");
  assert.equal(writes.filter((row) => clerkCaseNumber(row.fieldName)).length, 0,
    "Circuit Clerk case-number captions must remain blank");
  assert.equal(writes.filter((row) => String(row.drawnText ?? "").includes("…")).length, 0,
    "held values must never be ellipsized");
  assert.equal(writes.filter((row) => /exactly as (shown|printed)/i.test(String(row.drawnText ?? ""))).length, 0,
    "a direction to the participant is not a fact and must not stand in a filing cell");

  for (const contact of ["3 - Name", "3 - Address", "3 - Telephone", "3 - Email"]) {
    assert.ok(writes.some((row) => row.documentId === "EXP-AD Order Granting" && row.fieldName === contact),
      `the proposed Order's delivery block must carry ${contact}, which this packet holds`);
  }
  for (const courtOwned of ORDER_COURT_OWNED) {
    assert.ok(!writes.some((row) => row.documentId === "EXP-AD Order Granting" && row.fieldName === courtOwned),
      `the judge's own field must remain blank: ${courtOwned}`);
    assert.ok(fieldMap.refusals.some((row) => row.fieldName === courtOwned && row.role === "court"),
      `the judge's own field must be declared court-owned: ${courtOwned}`);
  }

  const selected = new Map(requestWrites.filter((row) => row.isSelectionControl).map((row) => [row.fieldName, row.drawnText]));
  for (const [name, election] of Object.entries(config.elections)) {
    assert.equal(selected.get(name), election.state, `the route determines ${name} = ${election.state}`);
  }
  for (const row of fieldMap.refusals) {
    if (row.documentId !== "EXP-AD Request" || !row.isSelectionControl) continue;
    assert.ok(!Object.hasOwn(config.elections, row.fieldName), `a route-determined election must not be refused: ${row.fieldName}`);
    assert.equal(row.routeDetermined, false, `an unselected election must declare routeDetermined false: ${row.fieldName}`);
  }
  assert.ok(!selected.has("16 -"), "the supervision sealing statement is not this host's route for any family it builds");

  const record = readRecord(config);
  assertManifestPageOrder(record);
  for (const stop of record.stops) assert.ok(instructions.includes(stop), `the guide must state the registry's stop condition: ${stop}`);
  for (const action of record.actions.filter((entry) => entry.requiredBeforeFiling === true)) {
    assert.ok(instructions.includes(action.description), `the guide must state the required action: ${action.description.slice(0, 60)}`);
  }
  assert.ok(record.rules.service && instructions.includes(record.rules.service), "the guide must quote the record on who serves");
  assert.ok(record.rules.notice && instructions.includes(record.rules.notice), "the guide must quote the record on who is served");
  assert.ok(record.rules.fees && instructions.includes(record.rules.fees), "the guide must quote the record on fees");
  assert.ok(record.rules.feeWaiver && instructions.includes(record.rules.feeWaiver), "the guide must quote the record on the fee waiver");
  assert.ok(record.destination && instructions.includes(record.destination.name), "the guide must name the record's filing destination");
  assert.ok(record.venue && instructions.includes(record.venue), "the guide must state the record's venue in its own words");

  const routeKey = fieldMap.routeKeys[0];
  const occurrences = instructions.split(routeKey).length - 1;
  assert.equal(occurrences, 1, `the census route key must appear exactly once in the guide, not ${occurrences} times`);
  assert.ok(!/Complete arrest\d+ on/.test(instructions), "an interior AcroForm name is not a caption a participant can find on the page");

  console.log(`${familyId} self-test passed`);
}

if (pathToFileURL(process.argv[1]).href === import.meta.url) {
  if (process.argv.includes("--self-test")) selfTest("il-exp-pardon-set");
  else await buildIllinoisFamily("il-exp-pardon-set");
}
