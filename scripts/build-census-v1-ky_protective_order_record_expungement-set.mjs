#!/usr/bin/env node
/**
 * Route-obligation census v1 — packet family `ky_protective_order_record_expungement-set`.
 *
 *   node scripts/build-census-v1-ky_protective_order_record_expungement-set.mjs [--check]
 *
 * Kentucky, expungement of the record of a protective-order case that was
 * dismissed without a full order having issued. Route
 * `obligation:track-only:KY:ky_protective_order_record_expungement`, authority
 * KRS 403.745 and KRS 456.070. One declared component, one held binary:
 *
 *   primary-filing-1   AOC-275.18 Rev. 1-16, Motion for Expungement of
 *                      Emergency/Temporary Order of Protection. One page,
 *                      sixteen AcroForm fields.
 *
 * This is the AcroForm path, not the flat-overlay path: every write box below
 * is the /Rect of the source's own widget and no coordinate is hand-entered.
 *
 * THE SOURCE WAS RECOVERED, NOT RE-ACQUIRED, AND IT IS RE-HASHED HERE
 *
 * This family was previously returned STOPPED / BLOCKED_SOURCE because the
 * bytes were not mounted in that container. They were recovered from the
 * existing authenticated custody on 2026-09-04 and mounted at the path the
 * committed corpus index already pinned. Nothing about the binding changed: the
 * digest this build requires is the digest the index has always recorded, and
 * this script re-hashes the bytes on every run rather than trusting the mount.
 *
 * THREE DECISIONS THAT SHAPED WHAT IS AND IS NOT WRITTEN.
 *
 * First, THE COUNTY CHOOSER SHIPS HOLDING A VALUE IT DOES NOT OFFER. The
 * `Case.County` dropdown lists 121 options — a blank and the 120 Kentucky
 * counties, spelled without the word "County" — and it arrives selected on the
 * string "000", which is not one of them. Delivered unchanged through a
 * flatten, a filed motion states its county as 000.
 *
 * The shared finalizer already suppresses a chooser that ships showing its own
 * prompt, but it decides that with `isChooserPrompt`, and "000" is not a prompt
 * by any of that function's tests — it is not punctuation, it does not begin
 * with choose/select/pick, and it is not the list's first option. Measured:
 * `isChooserPrompt("000", options)` returns false. So the shared suppression
 * does not reach this field, and the only thing that displaces "000" is this
 * build writing a real county over it.
 *
 * That is a thin guarantee to rest a filed document on, so it is not what this
 * build rests on. After both fixtures are produced, every choice field in the
 * delivered bytes is re-read and asserted to carry either nothing or one of its
 * own options. If the county were ever refused — an unheld county, a value
 * outside the list — the build stops rather than shipping 000 as ink.
 *
 * Second, THE PACKET HOLDS ONE PARTY, THE FORM CAPTIONS TWO, AND THE COMMITTED
 * RECORD SAYS WHICH ONE THE PARTICIPANT IS. AOC-275.18 captions PETITIONER over
 * `first pet`/`middle pet`/`last pet` and RESPONDENT over
 * `first res`/`middle res`/`last res`.
 *
 * An earlier revision of this build told the participant, in
 * participant-instructions.md and twice over, that "nothing in the committed
 * record for this route establishes which of the two blocks the participant
 * occupies". That was FALSE, and it was false in a participant-facing document
 * that contradicted itself three sections later: filing-instructions.md already
 * quoted `destination.detail` from the very record that answers it, the word
 * "respondent" included. VF04 read the delivered bytes and failed the family on
 * ROUTE_IDENTITY, KNOWN_PREFILLS and SELF_HELP_STOP, all three driven by that
 * one sentence.
 *
 * The record is data/record-clearing/legal-design-intake/KY.memo.json, relief
 * track `ky_protective_order_record_expungement` — the same trackId this
 * family's own route key names. It settles the party role in FIVE independent
 * places, and this build now reads all five and stops if any of them stops
 * saying it:
 *
 *   controllingAuthority.summary   "The respondent moves six months after
 *                                  dismissal, provided no order of protection
 *                                  has been issued against them ..."
 *   exclusions                     "Any respondent who has been bound by, or
 *                                  had issued against them, an order of
 *                                  protection ... in the six months before the
 *                                  request."
 *   participantInputs.poRespondentName  "What is your full name as it appears
 *                                  on the case?"
 *   participantInputs.poPetitionerName  "What is the name of the person who
 *                                  petitioned against you?"
 *   destination.detail             "... requests an updated criminal and
 *                                  protective-order history for the
 *                                  respondent."
 *
 * THE PARTICIPANT IS THE RESPONDENT. So `first res`/`middle res`/`last res`
 * carry the participant's own decomposed name and are known prefills, not
 * blanks. The role is DERIVED from those five readings rather than hardcoded:
 * if the record ever named the petitioner instead, the mapping follows it.
 *
 * THE PETITIONER BLOCK IS STILL WITHHELD, and deliberately. On this route the
 * petitioner is the person who sought protection against the participant — a
 * third party whose name the platform does not hold. Writing the participant's
 * name there would be the mirror image of the North Dakota pardon defect
 * recorded in DEFECTS_NO_COUNTER_CAN_SEE.json, where a participant fact was
 * written into a victim-name column. The reason carried to the participant now
 * says that, instead of claiming a silence the packet contradicts.
 *
 * The `movant` field is written from the participant's full legal name, as
 * before — the form's own sentence is "The movant, ____, seeks expungement".
 *
 * Fourth, THE RECORD'S OWN LIMITS REACH THE PARTICIPANT. The same track carries
 * two `packet_instruction` limitations, one `self_help_boundary` and four
 * selfHelpStopConditions. None of them reached the guide before; in particular
 * a participant whose dismissed protective-order case sat alongside an arrest
 * was told nothing about the criminal record this motion does not touch. They
 * are now rendered into participant-instructions.md verbatim and labelled as
 * the record's own words. They are guide text and they are NOT written onto the
 * filing.
 *
 * Third, THE THREE NUMBERED BOXES ARE SWORN ALLEGATIONS AND THIS BUILD MAKES
 * NONE OF THEM. Items 1, 2 and 3 sit above the movant's signature and allege
 * that the petition did not result in a full order, that six months have
 * elapsed since dismissal, and that the respondent has not been bound by an
 * order of protection during those six months. The first two restate the
 * route's own eligibility conditions and the third is a fact about the
 * participant's protective-order history that the platform does not hold and
 * does not ask for. All three are sworn statements of fact about a particular
 * case; screening establishes eligibility, and a signature establishes an
 * allegation. This build marks no box and the participant instructions carry
 * all three by their printed words.
 *
 * MEASURED HERE SO THE NEXT LANE DOES NOT RE-SURVEY
 *
 *   - The form's lower half carries NO WIDGETS AT ALL. The signature line, the
 *     date line, the three address-and-telephone rules and the whole
 *     NOTIFICATION OF EXPUNGEMENT HEARING block — hearing date, hour, a.m./p.m.,
 *     court, District/Circuit, the clerk's dated signature and the deputy line —
 *     are printed rules with no AcroForm field behind them. They are not
 *     terminal fields and are not counted as such; they are disclosed by name in
 *     participant-instructions.md, and the clerk's block is disclosed as the
 *     clerk's.
 *   - `Print` and `Reset` are push buttons. They are chrome, they are suppressed
 *     before the flatten, and the delivered bytes are asserted to carry neither
 *     caption.
 */
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

import { finalizeOfficialForm } from "./rcap-official-forms/rcap-official-form-finalize.mjs";
import { flattenedWidgets } from "./rcap-official-forms/pdf-flattened-widgets.mjs";
import { extractTextItems, groupIntoLines, normalizeHarvestedText }
  from "./rcap-official-forms/rcap-pdf-anchor-capture.mjs";
import { makeCorpusEntryResolver } from "./lib/corpus-index-paths.mjs";
import { preserveGovernanceState, writeWiringChecked }
  from "./rcap-packet-completeness/governance-preservation.mjs";

const thisFile = fileURLToPath(import.meta.url);
const ROOT = path.resolve(path.dirname(thisFile), "..");
process.chdir(ROOT);
const require = createRequire(import.meta.url);
const { PDFDocument, PDFTextField, PDFDropdown, PDFCheckBox, PDFButton } = require("pdf-lib");

const FAMILY_ID = "ky_protective_order_record_expungement-set";
const ROUTE_KEY = "obligation:track-only:KY:ky_protective_order_record_expungement";
const ROUTE_SELECTION_ID = "ky-aoc-275-18-protective-order-expungement";
const OUT = "data/rcap-all50/overlays/census-v1/ky/ky-protective-order-record-expungement-set--official-pdf-fill";
const BUILD_SCRIPT = "scripts/build-census-v1-ky_protective_order_record_expungement-set.mjs";
const CORPUS_INDEX = "data/rcap-all50/local-source-corpus-index.json";

const SOURCE = Object.freeze({
  sourceId: "official-form:AOC-275.18",
  formNumber: "AOC-275.18",
  revision: "Rev. 1-16",
  docCode: "EXPG",
  title: "Motion for Expungement of Emergency/Temporary Order of Protection",
  instrumentKind: "primary_filing",
  component: "component:ky_protective_order_record_expungement-primary-filing-1",
  path: "LegalEase Kentucky/source-acquisition-2026-09-04/275.18.pdf",
  sha256: "b3d8278a85a56c5ac81ed9fedaf9081f5e6f5141d0f561ed6aa6ff4103d2cb51"
});

/*
 * The canonical persona's county is a real Kentucky county, because
 * `Case.County` is a closed list of the 120 of them and a fixture county that
 * is not on the list would be refused — which would prove nothing about the
 * field and would leave the source's own "000" in place.
 */
const CANONICAL = {
  "participant.full_legal_name": "Jordan Avery Reyes",
  "participant.first_name": "Jordan",
  "participant.middle_name": "Avery",
  "participant.last_name": "Reyes",
  "matter.case_number": "24-D-00123-001",
  "matter.county": "Franklin"
};

const BOUNDARY = {
  ...CANONICAL,
  "participant.full_legal_name": "Alexandrina-Katharine Montgomery-Vandenberg-Oyelaran",
  "participant.first_name": "Alexandrina-Katharine",
  "participant.middle_name": "Montgomery-Vandenberg-Oyelaran",
  "participant.last_name": "Fitzwilliam III",
  "matter.case_number": "0123-45-2026-D-900123.00-AB-CDE/2201",
  // Kentucky's longest county name, so the chooser is exercised at its widest
  // real value rather than at an invented one.
  "matter.county": "Breckinridge"
};

const sha256 = (bytes) => crypto.createHash("sha256").update(bytes).digest("hex");
const round = (n) => Number(Number(n).toFixed(2));
const readJson = (rel) => JSON.parse(fs.readFileSync(path.join(ROOT, rel), "utf8"));
const absFor = (rel) => path.join(ROOT, rel);
const writeJson = (rel, value) => {
  fs.mkdirSync(path.dirname(absFor(rel)), { recursive: true });
  fs.writeFileSync(absFor(rel), `${JSON.stringify(value, null, 2)}\n`);
};
function fail(message, detail = null) {
  throw new Error(detail === null ? message : `${message}: ${detail}`);
}

// ---------------------------------------------------------------------------
// the controlling legal-design record
// ---------------------------------------------------------------------------
/*
 * WHY THIS IS READ AND NOT REMEMBERED.
 *
 * The guide prose on this family says, in several places, "the committed record
 * says ...". Until this revision NOTHING IN THIS SCRIPT READ A RECORD: the
 * clerk's duties, the fee treatment and the service rule were paraphrases typed
 * into string literals, and the party role was a claim of silence typed into
 * another one. A paraphrase cannot go stale loudly. It just stops being true.
 *
 * So the track is loaded, hashed, and asserted. Every sentence the guide
 * attributes to the record is now taken FROM the record at build time, and each
 * of the five readings that establish the party role is asserted by substring.
 * If the record changes its mind, this build stops instead of shipping a
 * conclusion the record no longer supports.
 */
const RECORD_PATH = "data/record-clearing/legal-design-intake/KY.memo.json";
const RECORD_TRACK_ID = "ky_protective_order_record_expungement";

function loadControllingRecord() {
  const abs = absFor(RECORD_PATH);
  if (!fs.existsSync(abs)) {
    fail("the controlling legal-design record for this route is not present", RECORD_PATH);
  }
  const bytes = fs.readFileSync(abs);
  const memo = JSON.parse(bytes.toString("utf8"));
  const track = (memo.tracks ?? []).find((row) => row.trackId === RECORD_TRACK_ID) ?? null;
  if (!track) fail("the controlling record no longer carries this route's relief track", RECORD_TRACK_ID);

  /*
   * THE PARTY ROLE, DERIVED. Five readings, each from a different node. The
   * role is whichever party the record's own participantInputs assign the
   * participant's own name to; the other four are cross-checks, and all five
   * must agree or the build stops rather than guess.
   */
  const inputs = track.participantInputs ?? [];
  const questionFor = (key) => (inputs.find((row) => row.key === key)?.question ?? "");
  const mine = questionFor("poRespondentName");
  const theirs = questionFor("poPetitionerName");
  const summary = String(track.controllingAuthority?.summary ?? "");
  const destination = String(track.destination?.detail ?? "");
  const exclusion = (track.exclusions ?? []).find((row) => /\brespondent\b/i.test(String(row))) ?? "";

  const readings = [
    { node: "participantInputs.poRespondentName", quote: mine,
      requires: "your full name", says: "the participant's OWN name goes in the respondent slot" },
    { node: "participantInputs.poPetitionerName", quote: theirs,
      requires: "petitioned against you", says: "the petitioner is the person who petitioned AGAINST the participant" },
    { node: "controllingAuthority.summary", quote: summary,
      requires: "The respondent moves", says: "the moving party is the respondent" },
    { node: "exclusions", quote: String(exclusion),
      requires: "Any respondent who has been bound by", says: "the six-month exclusion is written about the respondent" },
    { node: "destination.detail", quote: destination,
      requires: "history for the respondent", says: "the clerk pulls the history of the respondent" }
  ];
  const silent = readings.filter((row) => !row.quote.toLowerCase().includes(row.requires.toLowerCase()));
  if (silent.length > 0) {
    fail("the controlling record no longer establishes which caption block the participant occupies; this build "
      + "will not ship a party assignment the record does not support",
      silent.map((row) => `${row.node} no longer says "${row.requires}"`).join("; "));
  }

  const limitations = track.legalDesignDecision?.limitations ?? [];
  const byClass = (name) => limitations
    .filter((row) => row.classification === name)
    .map((row) => ({ statement: String(row.statement), sourceFile: row.provenance?.sourceFile ?? null,
      sourceHeading: row.provenance?.sourceHeading ?? null }));

  return Object.freeze({
    path: RECORD_PATH,
    sha256: crypto.createHash("sha256").update(bytes).digest("hex"),
    byteLength: bytes.length,
    trackId: RECORD_TRACK_ID,
    memoVersion: memo.memoVersion ?? null,
    reviewedAsOf: track.effectiveDates?.reviewedAsOf ?? null,
    participantParty: "RESPONDENT",
    otherParty: "PETITIONER",
    partyReadings: readings.map((row) => ({ node: row.node, quote: row.quote, establishes: row.says })),
    packetInstructions: byClass("packet_instruction"),
    selfHelpBoundaries: byClass("self_help_boundary"),
    selfHelpStopConditions: (track.selfHelpStopConditions ?? []).map((row) => String(row)),
    clerkDuties: destination,
    fees: String(track.rules?.fees ?? ""),
    service: String(track.rules?.service ?? ""),
    notarization: String(track.rules?.notarization ?? ""),
    participantSignature: String(track.rules?.participantSignature ?? "")
  });
}

const RECORD = loadControllingRecord();

/*
 * Which AcroForm block each caption party owns. Read off the form's own printed
 * captions, then keyed by the role the record derived rather than by a literal
 * "res", so the mapping follows the record if the record ever changes.
 */
const CAPTION_BLOCKS = Object.freeze({
  PETITIONER: { first: "first pet", middle: "middle pet", last: "last pet", label: "Petitioner" },
  RESPONDENT: { first: "first res", middle: "middle res", last: "last res", label: "Respondent" }
});
const PARTICIPANT_BLOCK = CAPTION_BLOCKS[RECORD.participantParty];
const OTHER_BLOCK = CAPTION_BLOCKS[RECORD.otherParty];

// ---------------------------------------------------------------------------
// what each field is
// ---------------------------------------------------------------------------
const WRITE = (factId, effectiveLabel) => ({ writable: true, factId, effectiveLabel });
const SUPPLY = (effectiveLabel, what) => ({
  writable: false, approvedDisposition: "REQUIRED_BEFORE_FILING", requiredBeforeFiling: true,
  effectiveLabel, what
});
const ELECTION = (effectiveLabel, why) => ({
  writable: false, approvedDisposition: "PARTICIPANT_ELECTION_GENUINE", effectiveLabel,
  category: "participant_sworn_narrative_or_legal_election", reason: why
});
const CONTROL_CHROME = (effectiveLabel) => ({
  terminal: false, writable: false, approvedDisposition: "NOT_A_FIELD", effectiveLabel,
  reason: "a viewer push button, never a filing fact; suppressed before the flatten so its caption is not "
    + "stamped onto the filed page"
});

/*
 * WHY THE OTHER PARTY'S BLOCK IS BLANK, in the participant's own terms.
 *
 * Not "we do not know which of you is which" — the record says which, and this
 * packet has already written the participant into their own block. It is blank
 * because it belongs to somebody else and the platform does not hold that
 * person's name.
 */
const OTHER_PARTY_REASON =
  `AOC-275.18 captions two parties, ${RECORD.otherParty} and ${RECORD.participantParty}. The committed `
  + `legal-design record for this route puts you in the ${RECORD.participantParty} block, and this packet has `
  + `already written your name there. The ${RECORD.otherParty} block names the other person in the case — on `
  + `this route, the person who petitioned against you — and LegalEase does not hold their name, so you copy it `
  + `from your own case papers exactly as the caption spells it`;

const FIELD_DECISIONS = Object.freeze({
  "Print": CONTROL_CHROME("Print push button"),
  "Reset": CONTROL_CHROME("Reset Form push button"),
  "Case  No": WRITE("matter.case_number", "Case No."),
  "Case.County": WRITE("matter.county", "County of the case"),
  "Court": SUPPLY("Court",
    "the court the protective-order petition was heard in, written as it appears on your case papers. The "
    + "form's own hearing block below offers District and Circuit"),
  "Division": SUPPLY("Division",
    "the division of that court, if your case papers show one"),
  /*
   * The participant's own caption block, bound by the role the record derived.
   * The name is ALREADY DECOMPOSED into parts on this route, so the usual and
   * legitimate objection — that a single legal-name string cannot be split
   * safely — does not arise and is not relied on.
   */
  [PARTICIPANT_BLOCK.first]: WRITE("participant.first_name", `${PARTICIPANT_BLOCK.label} first name`),
  [PARTICIPANT_BLOCK.middle]: WRITE("participant.middle_name", `${PARTICIPANT_BLOCK.label} middle name`),
  [PARTICIPANT_BLOCK.last]: WRITE("participant.last_name", `${PARTICIPANT_BLOCK.label} last name`),
  /*
   * The other party's block. Withheld because it is a third party's name, not
   * because the role is unknown.
   */
  [OTHER_BLOCK.first]: SUPPLY(`${OTHER_BLOCK.label} first name`,
    `the ${RECORD.otherParty}'s first name from your case caption. ${OTHER_PARTY_REASON}`),
  [OTHER_BLOCK.middle]: SUPPLY(`${OTHER_BLOCK.label} middle name`,
    `the ${RECORD.otherParty}'s middle name from your case caption, if the caption shows one`),
  [OTHER_BLOCK.last]: SUPPLY(`${OTHER_BLOCK.label} last name`,
    `the ${RECORD.otherParty}'s last name from your case caption`),
  "movant": WRITE("participant.full_legal_name", "Movant"),
  "check pet did not result": ELECTION(
    "Item 1 sworn allegation — the petition did not result in a domestic violence or non-temporary interpersonal order",
    "item 1 alleges, above your signature, that the petition in this case did not result in the issuance of a "
      + "domestic violence or non-temporary interpersonal order. Screening tells you whether this route is open "
      + "to you; your signature tells the court this is true of your case. Check it only if it is."),
  "check six months": ELECTION(
    "Item 2 sworn allegation — six months have elapsed since the case was dismissed",
    "item 2 alleges that six months have elapsed since the case was dismissed. Count from the dismissal date "
      + "on your own case papers and check it only if six months have actually passed."),
  "check during six months": ELECTION(
    "Item 3 sworn allegation — the respondent has not been bound by an order of protection in those six months",
    "item 3 alleges that during those six months the respondent has not been bound by an order of protection "
      + "issued for the protection of any person. LegalEase does not hold your protective-order history and "
      + "does not ask for it, so only you can answer this.")
});

/*
 * The printed lines this form draws with no AcroForm field behind them.
 *
 * They are not terminal fields — there is no widget, so there is nothing to
 * fill and nothing this build could write without hand-entering a coordinate in
 * white space. They are disclosed by name so the participant is not handed a
 * page with unexplained blanks on it, and the clerk's block is disclosed as the
 * clerk's. The printed words are asserted against the document each run.
 */
const PRINTED_LINES_WITHOUT_WIDGETS = Object.freeze([
  { printed: "Date", who: "participant", note: "the date you sign, written on the printed Date line" },
  { printed: "Signature", who: "participant", note: "your signature" },
  { printed: "Address and Telephone Number of Movant", who: "participant",
    note: "your address and telephone number, on the three printed rules above that caption" },
  { printed: "NOTIFICATION OF EXPUNGEMENT HEARING", who: "clerk",
    note: "the hearing date, the hour, a.m. or p.m., the court and whether it is District or Circuit, and the "
      + "clerk's dated signature. The circuit court clerk completes this block after you file; the committed "
      + "route record says the clerk verifies the signature, applies the filed stamp and completes the "
      + "notification-of-hearing section on the face of the form" }
]);

// ---------------------------------------------------------------------------
// source
// ---------------------------------------------------------------------------
function corpusRoot() {
  return process.env.MASTER_LIBRARY_SOURCE_DIR
    ?? "private/source-imports/Expungement_AI_RCAP_Master_Library_Edition_1";
}

async function loadSource() {
  const index = readJson(CORPUS_INDEX);
  const resolver = makeCorpusEntryResolver(index, { repoRoot: ROOT, masterLibraryRoot: corpusRoot() });
  const entry = (index.entries ?? []).find((row) => row.path === SOURCE.path);
  if (!entry) fail("no committed corpus-index entry at the declared path", `${SOURCE.sourceId} ${SOURCE.path}`);
  if (entry.sha256 !== SOURCE.sha256) fail("the committed index pins a different binary", entry.sha256);
  const absolute = resolver.resolve(entry);
  if (!absolute || !fs.existsSync(absolute)) {
    fail("the custody holding this source is not mounted here", `${SOURCE.sourceId} ${SOURCE.path}`);
  }
  const bytes = fs.readFileSync(absolute);
  const digest = sha256(bytes);
  if (digest !== SOURCE.sha256) fail("SHA-256 drift against the declared digest", digest);
  if (entry.byteLength !== bytes.length) fail("byte length disagrees with the committed index", bytes.length);
  const pdf = await PDFDocument.load(bytes, { ignoreEncryption: true, updateMetadata: false });
  if (entry.pageCount !== pdf.getPageCount()) {
    fail("page count disagrees with the committed index", pdf.getPageCount());
  }
  return { bytes, byteLength: bytes.length, sha256: digest, indexEntry: entry, resolvedFrom: absolute, pdf };
}

/** Every AcroForm field of the source, with the geometry and the value it ships. */
function censusOf(pdf) {
  const form = pdf.getForm();
  const pageRefs = pdf.getPages().map((page) => page.ref);
  const rows = [];
  for (const field of form.getFields()) {
    const name = field.getName();
    const kind = field.constructor.name;
    const type = kind === "PDFTextField" ? "text"
      : kind === "PDFDropdown" ? "dropdown"
        : kind === "PDFCheckBox" ? "checkbox"
          : kind === "PDFButton" ? "pushbutton" : kind.toLowerCase();
    const widgets = field.acroField.getWidgets().map((widget) => {
      const rect = widget.getRectangle();
      return {
        page: pageRefs.findIndex((ref) => ref === widget.P()) + 1,
        rect: { x: round(rect.x), y: round(rect.y), width: round(rect.width), height: round(rect.height) },
        rectBasis: "acroform_widget_rectangle"
      };
    });
    let options = null;
    let shippedValue = null;
    try {
      if (field instanceof PDFDropdown) { options = field.getOptions(); shippedValue = (field.getSelected() ?? []).join("|") || null; }
      else if (field instanceof PDFTextField) shippedValue = field.getText() ?? null;
      else if (field instanceof PDFCheckBox) shippedValue = field.isChecked() ? "on" : null;
    } catch { /* a field whose value cannot be read ships nothing this build can clear */ }
    rows.push({
      name, type, widgets,
      maxLength: field instanceof PDFTextField ? (field.getMaxLength() ?? null) : null,
      optionCount: options ? options.length : null,
      options,
      shippedValue,
      shippedValueIsOneOfItsOwnOptions: options ? options.includes(shippedValue) : null
    });
  }
  return rows;
}

// ---------------------------------------------------------------------------
// build
// ---------------------------------------------------------------------------
async function renderFixture({ source, census, facts, fixture }) {
  const decisions = census.map((field) => ({ field, decision: FIELD_DECISIONS[field.name] ?? null }));
  const unknown = decisions.filter((row) => row.decision === null);
  if (unknown.length > 0) {
    fail("AcroForm fields this build's decision table does not reach",
      unknown.map((row) => row.field.name).join(", "));
  }

  const writable = decisions.filter((row) => row.decision.writable);
  const unwritableFields = decisions
    .filter((row) => !row.decision.writable && row.decision.terminal !== false)
    .map((row) => row.field.name);

  const { bytes, report } = await finalizeOfficialForm({
    sourceBytes: source.bytes,
    expectedSha256: source.sha256,
    census: census.map((field) => ({
      name: field.name, type: field.type, widgets: field.widgets, maxLength: field.maxLength,
      effectiveLabel: (FIELD_DECISIONS[field.name]?.effectiveLabel) ?? field.name
    })),
    facts,
    explicitMappings: Object.fromEntries(writable.map((row) => [row.field.name, row.decision.factId])),
    unwritableFields,
    documentTextLines: [],
    title: SOURCE.title
  });

  return { bytes, report, decisions, writable, unwritableFields };
}

/**
 * What the delivered bytes actually carry.
 *
 * Three things are read back rather than believed: the glyphs the artifact
 * gained, whether any of them fall outside a measured widget rectangle, and —
 * the one this form specifically needs — whether any choice field survived
 * holding a value it does not offer.
 */
async function readBack({ source, outputBytes, census, writable }) {
  const before = await PDFDocument.load(source.bytes, { ignoreEncryption: true, updateMetadata: false });
  const after = await PDFDocument.load(outputBytes, { ignoreEncryption: true, updateMetadata: false });

  const key = (page, ch, y) => `${page}|${ch.x.toFixed(1)}|${y.toFixed(1)}|${ch.c}`;
  const original = new Map();
  before.getPages().forEach((page, index) => {
    for (const item of extractTextItems(page)) {
      for (const ch of item.chars ?? []) {
        const id = key(index + 1, ch, item.y);
        original.set(id, (original.get(id) ?? 0) + 1);
      }
    }
  });
  const added = [];
  after.getPages().forEach((page, index) => {
    for (const item of extractTextItems(page)) {
      for (const ch of item.chars ?? []) {
        const id = key(index + 1, ch, item.y);
        const remaining = original.get(id) ?? 0;
        if (remaining > 0) { original.set(id, remaining - 1); continue; }
        added.push({ page: index + 1, x: round(ch.x), y: round(item.y), w: round(ch.w), c: ch.c });
      }
    }
  });

  /*
   * A written value reaches the page as a flattened widget appearance placed at
   * the widget's own rectangle, so attribution is against those rectangles —
   * with a tolerance, because a flattened appearance is drawn inside its box
   * rather than at its corner.
   */
  const boxes = census.flatMap((field) => field.widgets.map((widget) => ({
    name: field.name, page: widget.page, rect: widget.rect
  })));
  const insideAnyWidget = (glyph) => boxes.some((box) => glyph.page === box.page
    && glyph.x + glyph.w >= box.rect.x - 2 && glyph.x <= box.rect.x + box.rect.width + 2
    && glyph.y >= box.rect.y - 4 && glyph.y <= box.rect.y + box.rect.height + 4);
  const outside = added.filter((glyph) => String(glyph.c).trim() && !insideAnyWidget(glyph));

  // Every choice field in the DELIVERED bytes, and whether it still holds a
  // value its own option list does not contain.
  const deliveredChoiceValues = [];
  let residualForm = null;
  try { residualForm = after.getForm(); } catch { residualForm = null; }
  for (const field of residualForm ? residualForm.getFields() : []) {
    if (!(field instanceof PDFDropdown)) continue;
    const options = field.getOptions?.() ?? [];
    const selected = (field.getSelected?.() ?? []).filter((value) => String(value).trim() !== "");
    for (const value of selected) {
      deliveredChoiceValues.push({
        field: field.getName(), value,
        isOneOfItsOwnOptions: options.includes(value)
      });
    }
  }

  // Push-button captions must not have been stamped onto the page.
  const buttonCaptions = census.filter((field) => field.type === "pushbutton").map((field) => field.name);
  const stampedButtonCaptions = buttonCaptions.filter((caption) =>
    added.map((glyph) => glyph.c).join("").includes(caption));

  const appearances = await (async () => {
    const tmp = path.join(ROOT, ".ky-readback.pdf");
    fs.writeFileSync(tmp, outputBytes);
    try { return await flattenedWidgets(tmp); } finally { fs.rmSync(tmp, { force: true }); }
  })();

  return {
    addedGlyphsReadFromOutputBytes: added.filter((glyph) => String(glyph.c).trim()).length,
    nonWhitespaceGlyphsOutsideMeasuredWriteBoxes: outside.length,
    glyphsOutsideSample: outside.slice(0, 20),
    flattenedWidgetAppearancesReadFromOutputBytes: appearances.length,
    deliveredChoiceValues,
    choiceValuesOutsideTheirOwnOptions: deliveredChoiceValues.filter((row) => !row.isOneOfItsOwnOptions),
    stampedButtonCaptions,
    perWrite: writable.map((row) => {
      const widget = row.field.widgets[0];
      const drawn = added.filter((glyph) => widget && glyph.page === widget.page
        && glyph.x + glyph.w >= widget.rect.x - 2 && glyph.x <= widget.rect.x + widget.rect.width + 2
        && glyph.y >= widget.rect.y - 4 && glyph.y <= widget.rect.y + widget.rect.height + 4);
      return {
        field: row.field.name, factId: row.decision.factId, page: widget?.page ?? null,
        rect: widget?.rect ?? null, rectBasis: "acroform_widget_rectangle",
        textReadFromFinalPdfBytes: drawn.map((glyph) => glyph.c).join("").trim(),
        glyphCountReadFromFinalPdfBytes: drawn.filter((glyph) => String(glyph.c).trim()).length
      };
    })
  };
}

function findingsFor({ fixture, report, proof, writable }) {
  const findings = [];
  const tooLongToFit = [];
  if (proof.choiceValuesOutsideTheirOwnOptions.length > 0) {
    findings.push({
      severity: "blocking", fixture,
      check: "a_choice_field_was_delivered_holding_a_value_it_does_not_offer",
      detail: proof.choiceValuesOutsideTheirOwnOptions
    });
  }
  if (proof.stampedButtonCaptions.length > 0) {
    findings.push({ severity: "blocking", fixture, check: "push_button_caption_stamped_onto_the_filed_page",
      detail: proof.stampedButtonCaptions });
  }
  if (proof.nonWhitespaceGlyphsOutsideMeasuredWriteBoxes > 0) {
    findings.push({ severity: "blocking", fixture, check: "added_glyphs_outside_every_measured_widget_rectangle",
      count: proof.nonWhitespaceGlyphsOutsideMeasuredWriteBoxes, sample: proof.glyphsOutsideSample });
  }
  for (const row of writable) {
    const written = (report.written ?? []).some((entry) => entry.field === row.field.name);
    if (!written) {
      const refusal = (report.refused ?? []).find((entry) => entry.field === row.field.name) ?? null;
      /*
       * A value that cannot be printed legibly inside the widget the court drew
       * is a measured outcome, not a build defect — it is what the boundary
       * fixture exists to find. It is recorded with the numbers that decide it
       * and carried to the participant, rather than clipped.
       */
      if (refusal && refusal.category === "unfittable") {
        tooLongToFit.push({
          field: row.field.name, factId: row.decision.factId,
          effectiveLabel: row.decision.effectiveLabel,
          measuredWidgetWidth: row.field.widgets[0]?.rect.width ?? null,
          measuredWhy: `the widget the form draws is ${row.field.widgets[0]?.rect.width ?? "?"} points wide `
            + "and this value cannot be printed inside it at the smallest size that stays readable"
        });
        continue;
      }
      findings.push({ severity: "blocking", fixture, check: "offered_field_was_not_written",
        field: row.field.name, factId: row.decision.factId, refusal });
      continue;
    }
    const ink = proof.perWrite.find((entry) => entry.field === row.field.name);
    if (!ink || ink.glyphCountReadFromFinalPdfBytes === 0) {
      findings.push({ severity: "blocking", fixture, check: "reported_write_has_no_glyph_in_its_widget_rectangle",
        field: row.field.name });
    }
  }
  return { findings, tooLongToFit };
}

// ---------------------------------------------------------------------------
// instructions
// ---------------------------------------------------------------------------
/** A sentence, ending in exactly one full stop. */
const sentence = (text) => `${String(text).trim().replace(/\.+$/, "")}.`;

/** Hard-wrap prose to the width the rest of this guide is written at. */
function wrap(text, width = 98) {
  const out = [];
  let line = "";
  for (const word of String(text).split(/\s+/).filter(Boolean)) {
    if (line.length === 0) { line = word; continue; }
    if (`${line} ${word}`.length > width) { out.push(line); line = word; continue; }
    line = `${line} ${word}`;
  }
  if (line.length > 0) out.push(line);
  return out;
}

function renderParticipantInstructions({ supplyRows, electionRows, writtenRows }) {
  const lines = [];
  lines.push("# Your Kentucky protective-order expungement motion");
  lines.push("");
  lines.push("This is a motion asking a Kentucky court to expunge the record of a protective-order case that");
  lines.push("was dismissed without a full order having issued, under KRS 403.745 and KRS 456.070. It is one");
  lines.push("page. It is prepared for you to check, complete, sign and file. Nothing in it has been filed and");
  lines.push("no court has decided anything.");
  lines.push("");
  lines.push("## What is in the packet");
  lines.push("");
  lines.push(`- **${SOURCE.formNumber} (${SOURCE.revision}, Doc. Code ${SOURCE.docCode})** — ${SOURCE.title}. 1 page.`);
  lines.push("");
  lines.push("## Which side of the caption you are on");
  lines.push("");
  lines.push(...wrap(
    `${SOURCE.formNumber} captions two parties, ${RECORD.otherParty} and ${RECORD.participantParty}, and this `
    + `packet holds one person. The committed legal-design record for this route makes you the `
    + `**${RECORD.participantParty}**: you are the one asking for the record to be cleared, and the `
    + `${RECORD.otherParty} is the person who petitioned against you. So your name is written into the `
    + `${RECORD.participantParty} block, and the ${RECORD.otherParty} block is left for you to copy from your `
    + `case papers. These are the record's own words, from \`${RECORD.path}\` (SHA-256 \`${RECORD.sha256}\`), `
    + `track \`${RECORD.trackId}\`:`));
  lines.push("");
  for (const row of RECORD.partyReadings) {
    lines.push(`- \`${row.node}\` — "${row.quote}"`);
  }
  lines.push("");
  lines.push(...wrap(
    "Check the whole caption against your own case papers before you file. If your papers put you on the "
    + "other side of the caption, stop and do not file this: it would name you as a party you are not."));
  lines.push("");
  if (writtenRows.length > 0) {
    lines.push("## What this packet has already filled in for you");
    lines.push("");
    lines.push(...wrap(
      "Your answers are already on the page in these places. Check every one of them against your case "
      + "papers. A packet is not a substitute for reading the page you are about to sign."));
    lines.push("");
    for (const row of writtenRows) {
      lines.push(`- **${row.effectiveLabel}**`);
    }
    lines.push("");
  }
  lines.push("## You must supply these before you file");
  lines.push("");
  for (const row of supplyRows) {
    lines.push(`- **${row.effectiveLabel}.** ${sentence(row.what)}`);
  }
  lines.push("");
  lines.push("## Statements you must confirm before you sign");
  lines.push("");
  lines.push("The three numbered boxes sit directly above your signature. Checking a box tells the court the");
  lines.push("statement beside it is true of your case. This packet checks none of them for you.");
  lines.push("");
  for (const row of electionRows) {
    lines.push(`- **${row.effectiveLabel}.** ${row.reason}`);
  }
  lines.push("");
  lines.push("## What this motion does not reach");
  lines.push("");
  lines.push(...wrap(
    "The committed legal-design record for this route carries these as instructions for this packet. They "
    + "are the record's own words."));
  lines.push("");
  for (const row of RECORD.packetInstructions) {
    lines.push(`- ${sentence(row.statement)}`);
  }
  lines.push("");
  lines.push("## When this packet stops being the right tool");
  lines.push("");
  lines.push(...wrap(
    "The same record lists the points at which this route stops being something you can do on your own. If "
    + "any of them describes your case, talk to a lawyer rather than filing this motion. These are the "
    + "record's own words, and the record writes about you in the third person as \"the participant\"."));
  lines.push("");
  lines.push("Its stop conditions:");
  lines.push("");
  for (const row of RECORD.selfHelpStopConditions) {
    lines.push(`- ${sentence(row)}`);
  }
  if (RECORD.selfHelpBoundaries.length > 0) {
    lines.push("");
    lines.push("And the boundary it draws on automated help:");
    lines.push("");
    for (const row of RECORD.selfHelpBoundaries) {
      lines.push(`- ${sentence(row.statement)}`);
    }
  }
  lines.push("");
  lines.push("## Lines the form prints with no fillable field behind them");
  lines.push("");
  lines.push("These are printed rules on the page. They are yours or the clerk's to complete by hand, and this");
  lines.push("packet leaves them alone rather than drawing into blank space.");
  lines.push("");
  for (const row of PRINTED_LINES_WITHOUT_WIDGETS) {
    lines.push(`- **${row.printed}** — ${row.who === "clerk" ? "the circuit court clerk completes this" : "yours to complete"}: ${row.note}.`);
  }
  lines.push("");
  return `${lines.join("\n")}\n`;
}

function renderFilingInstructions() {
  const lines = [];
  lines.push("# Filing your Kentucky protective-order expungement motion");
  lines.push("");
  lines.push("## Where it goes");
  lines.push("");
  lines.push("File it in the protective-order case itself, with the Office of the Circuit Court Clerk for the");
  lines.push("court that heard the petition. The caption of this motion names that case.");
  lines.push("");
  lines.push("## What the clerk does");
  lines.push("");
  lines.push("The committed record for this route says the clerk verifies your signature, applies the filed");
  lines.push("stamp, completes the notification-of-hearing section on the face of the form, creates the");
  lines.push("scheduled event and requests an updated criminal and protective-order history for the respondent.");
  lines.push("");
  lines.push("## The filing fee");
  lines.push("");
  lines.push("The committed record says the Clerks' Manual records no filing fee for this motion. It does not");
  lines.push("record a fee-waiver treatment, and this packet states no fee amount. Ask the clerk.");
  lines.push("");
  lines.push("## Service");
  lines.push("");
  lines.push("The committed record says you may serve copies of the notice by first class mail per the");
  lines.push("distribution list, and that otherwise the clerk does. The form's own footer lists the copies:");
  lines.push("the court file, the petitioner and the respondent. The record does not state a service deadline");
  lines.push("or a filing deadline, so this packet states none.");
  lines.push("");
  lines.push("## Signing");
  lines.push("");
  lines.push("You sign and date the motion on the printed lines beneath the three numbered statements, and");
  lines.push("write your address and telephone number on the three rules below your signature. The record says");
  lines.push("the clerk verifies the signature. No notarization is required on the face of the form.");
  lines.push("");
  return `${lines.join("\n")}\n`;
}

// ---------------------------------------------------------------------------
async function build({ check = false } = {}) {
  const source = await loadSource();
  const census = censusOf(source.pdf);

  // The county chooser's shipped value, measured rather than remembered.
  const countyField = census.find((field) => field.name === "Case.County");
  if (!countyField) fail("AOC-275.18 no longer carries the Case.County chooser this build measures");
  const shippedCountyDefault = {
    field: "Case.County", shippedValue: countyField.shippedValue,
    optionCount: countyField.optionCount,
    isOneOfItsOwnOptions: countyField.shippedValueIsOneOfItsOwnOptions,
    reachedByTheSharedChooserPromptSuppression: false,
    whyNot: "the shared finalizer suppresses a chooser that ships showing its own prompt, decided by "
      + "isChooserPrompt. Measured against this field's own option list, isChooserPrompt(\"000\", options) "
      + "returns false: it is not punctuation, it does not begin with choose/select/pick, and it is not the "
      + "list's first option. Only this build writing a real county over it displaces it, and the delivered "
      + "bytes are asserted for that after both fixtures are produced."
  };

  // The printed lines with no widget behind them are asserted against the page.
  // Grouped into lines first: the extractor returns text run by run, and a
  // phrase that spans two runs is not found in a run-by-run join.
  const printedText = source.pdf.getPages()
    .flatMap((page) => groupIntoLines(extractTextItems(page))
      .map((line) => normalizeHarvestedText(String(line.text ?? "")).replace(/\s+/g, " ").trim()))
    .join(" \n ");
  const missingPrintedLines = PRINTED_LINES_WITHOUT_WIDGETS
    .filter((row) => !printedText.toLowerCase().includes(row.printed.toLowerCase()))
    .map((row) => row.printed);
  if (missingPrintedLines.length > 0) {
    fail("AOC-275.18 no longer prints lines this build discloses as having no fillable field",
      missingPrintedLines.join("; "));
  }

  const canonical = await renderFixture({ source, census, facts: CANONICAL, fixture: "canonical" });
  const boundary = await renderFixture({ source, census, facts: BOUNDARY, fixture: "boundary" });
  const canonicalProof = await readBack({ source, outputBytes: canonical.bytes, census, writable: canonical.writable });
  const boundaryProof = await readBack({ source, outputBytes: boundary.bytes, census, writable: boundary.writable });

  const canonicalAudit = findingsFor({ fixture: "canonical", report: canonical.report, proof: canonicalProof, writable: canonical.writable });
  const boundaryAudit = findingsFor({ fixture: "boundary", report: boundary.report, proof: boundaryProof, writable: boundary.writable });
  const blocking = [...canonicalAudit.findings, ...boundaryAudit.findings];

  if (check) {
    return { familyId: FAMILY_ID, wrote: false, blocking, shippedCountyDefault,
      canonicalTooLongToFit: canonicalAudit.tooLongToFit, boundaryTooLongToFit: boundaryAudit.tooLongToFit };
  }
  if (blocking.length > 0) {
    fail("the produced bytes disagree with what this build says it wrote", JSON.stringify(blocking.slice(0, 4)));
  }

  fs.mkdirSync(absFor(`${OUT}/fixtures`), { recursive: true });
  fs.mkdirSync(absFor(`${OUT}/reports`), { recursive: true });
  fs.writeFileSync(absFor(`${OUT}/fixtures/canonical.pdf`), canonical.bytes);
  fs.writeFileSync(absFor(`${OUT}/fixtures/boundary.pdf`), boundary.bytes);

  const supplyRows = canonical.decisions
    .filter((row) => row.decision.approvedDisposition === "REQUIRED_BEFORE_FILING")
    .map((row) => ({ field: row.field.name, ...row.decision }));
  const electionRows = canonical.decisions
    .filter((row) => row.decision.approvedDisposition === "PARTICIPANT_ELECTION_GENUINE")
    .map((row) => ({ field: row.field.name, ...row.decision }));
  /*
   * Disclosed as filled only where the canonical fixture PROVES ink in that
   * widget in the delivered bytes. A guide that lists a field this build refused
   * as unfittable would be telling the participant a blank is filled.
   */
  const writtenRows = canonical.writable
    .filter((row) => (canonicalProof.perWrite
      .find((entry) => entry.field === row.field.name)?.glyphCountReadFromFinalPdfBytes ?? 0) > 0)
    .map((row) => ({ field: row.field.name, ...row.decision }));

  fs.writeFileSync(absFor(`${OUT}/participant-instructions.md`),
    renderParticipantInstructions({ supplyRows, electionRows, writtenRows }));
  fs.writeFileSync(absFor(`${OUT}/filing-instructions.md`), renderFilingInstructions());

  const withheldRows = canonical.decisions
    .filter((row) => !row.decision.writable && row.decision.terminal !== false)
    .map((row) => ({
      blankId: row.field.name, fieldName: row.field.name,
      effectiveLabel: row.decision.effectiveLabel,
      page: row.field.widgets[0]?.page ?? 1,
      reason: row.decision.reason ?? row.decision.what ?? null,
      completenessDisposition: row.decision.approvedDisposition,
      ...(row.decision.category === "participant_sworn_narrative_or_legal_election"
        ? { refusalClass: row.decision.category, category: row.decision.category } : {}),
      ...(row.decision.requiredBeforeFiling === true
        ? { requiredBeforeFiling: true, whatToSupply: row.decision.what } : {}),
      isSelectionControl: row.field.type === "checkbox",
      approvedDisposition: row.decision.approvedDisposition,
      widgets: row.field.widgets
    }));

  writeJson(`${OUT}/field-census.census-v1.json`, {
    schemaVersion: "rcap-official-form-field-census/v1-census-v1",
    familyId: FAMILY_ID, routeSelectionId: ROUTE_SELECTION_ID,
    censusBasis: "first_hand_inspection_of_the_exact_hash_bound_source",
    documents: [{
      formNumber: SOURCE.formNumber, sourceSha256: source.sha256,
      documentPolicy: {
        mode: "participant", captionOnly: false, documentAcceptsFill: true,
        routeKey: ROUTE_KEY, instrumentKind: SOURCE.instrumentKind
      },
      structuralClass: "acroform",
      pageGeometry: source.pdf.getPages().map((page, index) => ({
        page: index + 1, width: round(page.getSize().width), height: round(page.getSize().height)
      })),
      fieldCount: census.length,
      selectionControlCount: census.filter((field) => field.type === "checkbox").length,
      shippedValues: census.filter((field) => field.shippedValue !== null).map((field) => ({
        field: field.name, type: field.type, shippedValue: field.shippedValue,
        isOneOfItsOwnOptions: field.shippedValueIsOneOfItsOwnOptions
      })),
      fields: census.map((field) => ({
        name: field.name, type: field.type, widgets: field.widgets,
        maxLength: field.maxLength, optionCount: field.optionCount,
        shippedValue: field.shippedValue,
        shippedValueIsOneOfItsOwnOptions: field.shippedValueIsOneOfItsOwnOptions,
        effectiveLabel: FIELD_DECISIONS[field.name].effectiveLabel,
        disposition: FIELD_DECISIONS[field.name].approvedDisposition ?? null,
        writable: FIELD_DECISIONS[field.name].writable === true,
        factId: FIELD_DECISIONS[field.name].factId ?? null
      })),
      printedLinesWithNoWidgetBehindThem: PRINTED_LINES_WITHOUT_WIDGETS
    }]
  });

  writeJson(`${OUT}/production-field-map.json`, {
    schemaVersion: "rcap-production-field-map/v1",
    familyId: FAMILY_ID, routeKeys: [ROUTE_KEY], routeSelectionId: ROUTE_SELECTION_ID,
    implementationStrategy: "official_pdf_fill",
    factMap: CANONICAL,
    documents: [{
      documentId: SOURCE.formNumber, formNumber: SOURCE.formNumber, sourceSha256: source.sha256,
      instrumentKind: SOURCE.instrumentKind,
      writableAnchors: canonical.writable.map((row) => ({
        blankId: row.field.name, label: row.decision.effectiveLabel, factId: row.decision.factId,
        page: row.field.widgets[0]?.page ?? 1, writeBox: row.field.widgets[0]?.rect ?? null,
        rectBasis: "acroform_widget_rectangle"
      })),
      withheld: withheldRows,
      suppressedControls: canonical.decisions
        .filter((row) => row.decision.terminal === false)
        .map((row) => ({ field: row.field.name, why: row.decision.reason }))
    }],
    generationAllowed: false, runtimeSelectable: false, commercialRoutesOpened: 0
  });

  writeJson(`${OUT}/source-receipt.json`, {
    schemaVersion: "rcap-family-source-receipt/v1",
    familyId: FAMILY_ID, worklistGroupId: FAMILY_ID, jurisdiction: "KY",
    implementationStrategy: "official_pdf_fill",
    custodyClass: "SOURCE_RECOVERED_INTO_CUSTODY",
    custodyNote: "This family was previously returned STOPPED / BLOCKED_SOURCE because the bytes were not "
      + "mounted in that container. They were recovered on 2026-09-04 from the existing authenticated custody "
      + "and mounted at the path the committed corpus index already pinned. The digest did not change and no "
      + "acquisition was commissioned; this build re-hashes the bytes on every run.",
    acquisitionCommissioned: false,
    corpusRootFromEnvironment: "MASTER_LIBRARY_SOURCE_DIR",
    bindingMethod: "committed corpus-index path + index SHA-256 + on-disk SHA-256 + byte length + page count",
    routeKey: ROUTE_KEY, routeSelectionId: ROUTE_SELECTION_ID,
    statutoryAuthority: "KRS 403.745; KRS 456.070",
    documents: [{
      sourceIds: [SOURCE.sourceId], documentId: SOURCE.formNumber, formNumber: SOURCE.formNumber,
      revision: SOURCE.revision, docCode: SOURCE.docCode, title: SOURCE.title,
      instrumentKind: SOURCE.instrumentKind, packetComponent: SOURCE.component,
      pathInArchive: SOURCE.path, custody: source.indexEntry.custody,
      sha256: source.sha256, byteLength: source.byteLength, pageCount: source.pdf.getPageCount(),
      acroFieldCount: census.length, structuralClassObserved: "acroform",
      exactHashVerified: true, corpusIndexAgrees: true
    }],
    allSourcesExact: true, sourceBinaryCommitted: false,
    generationAllowed: false, runtimeSelectable: false, commercialRoutesOpened: 0
  });

  const artifact = (fixture, result, proof) => ({
    fixture, file: `${OUT}/fixtures/${fixture}.pdf`,
    sha256: sha256(result.bytes), byteLength: result.bytes.length,
    pageCount: 1,
    pageManifest: [{ packetPage: 1, formNumber: SOURCE.formNumber, sourcePage: 1, sourceSha256: source.sha256 }],
    activeContentScan: result.report.activeContentScan ?? null,
    addedGlyphsReadFromOutputBytes: proof.addedGlyphsReadFromOutputBytes,
    nonWhitespaceGlyphsOutsideMeasuredWriteBoxes: proof.nonWhitespaceGlyphsOutsideMeasuredWriteBoxes,
    flattenedWidgetAppearancesReadFromOutputBytes: proof.flattenedWidgetAppearancesReadFromOutputBytes,
    deliveredChoiceValues: proof.deliveredChoiceValues,
    rasterPages: [], rasterState: "BUILT_RASTER_PENDING",
    whyNoRasterHere: "rasterization is central (.github/workflows/rcap-packet-raster-acceptance-batch.yml). A "
      + "local render is not a receipt, so this build produces none and records the digests the central "
      + "workflow is to raster."
  });

  writeJson(`${OUT}/reports/rendered-artifacts.json`, {
    schemaVersion: "rcap-rendered-artifacts/v1", familyId: FAMILY_ID, renderedFresh: true,
    artifacts: [artifact("canonical", canonical, canonicalProof), artifact("boundary", boundary, boundaryProof)]
  });

  writeJson(`${OUT}/reports/actual-writes.json`, {
    schemaVersion: "rcap-actual-writes-byte-proof/v1", familyId: FAMILY_ID,
    derivedFromArtifactBytes: true, proofSource: "final canonical and boundary PDF bytes",
    documents: [
      { fixture: "canonical", formNumber: SOURCE.formNumber, sourceSha256: source.sha256,
        proofMethod: "flattened widget appearances located in the final PDF bytes at the source's own widget "
          + "rectangles",
        ...canonicalProof, actualWrites: canonicalProof.perWrite,
        refused: canonical.report.refused ?? [], written: canonical.report.written ?? [],
        promptsSuppressed: canonical.report.promptsSuppressed ?? [] },
      { fixture: "boundary", formNumber: SOURCE.formNumber, sourceSha256: source.sha256,
        proofMethod: "flattened widget appearances located in the final PDF bytes at the source's own widget "
          + "rectangles",
        ...boundaryProof, actualWrites: boundaryProof.perWrite,
        refused: boundary.report.refused ?? [], written: boundary.report.written ?? [],
        promptsSuppressed: boundary.report.promptsSuppressed ?? [] }
    ]
  });

  writeJson(`${OUT}/reports/blanks.json`, {
    schemaVersion: "rcap-packet-blanks/v1", familyId: FAMILY_ID,
    whatThisIs: "every AcroForm field this build did not write, with the reason it is blank, plus the printed "
      + "lines this form draws with no fillable field behind them at all",
    requiredBeforeFiling: supplyRows, participantElections: electionRows,
    printedLinesWithNoWidgetBehindThem: PRINTED_LINES_WITHOUT_WIDGETS,
    valuesTooLongForTheWidgetTheFormDraws: {
      whatThisIs: "a held fact that cannot be printed legibly inside the widget the court drew. It is refused "
        + "rather than clipped, because a clipped value on a filing is a wrong value and not a shorter one.",
      canonical: canonicalAudit.tooLongToFit, boundary: boundaryAudit.tooLongToFit
    },
    routeElectionsMade: []
  });

  writeJson(`${OUT}/reports/caption-evidence.json`, {
    schemaVersion: "rcap-caption-evidence/v1", familyId: FAMILY_ID,
    whatThisIs: `the caption fields of ${SOURCE.formNumber}, the fact written into each, the caption block the `
      + `committed legal-design record assigns to the participant, and the other party's block, which is `
      + `withheld because it names a third person this platform does not hold`,
    documents: [{
      formNumber: SOURCE.formNumber, sourceSha256: source.sha256, captionBandPage: 1,
      captionFields: census
        .filter((field) => ["Case  No", "Case.County", "Court", "Division", "movant",
          "first pet", "middle pet", "last pet", "first res", "middle res", "last res"].includes(field.name))
        .map((field) => ({
          field: field.name, type: field.type, widget: field.widgets[0] ?? null,
          effectiveLabel: FIELD_DECISIONS[field.name].effectiveLabel,
          disposition: FIELD_DECISIONS[field.name].approvedDisposition ?? "WRITTEN",
          factId: FIELD_DECISIONS[field.name].factId ?? null,
          canonicalValue: FIELD_DECISIONS[field.name].factId
            ? CANONICAL[FIELD_DECISIONS[field.name].factId] ?? null : null
        })),
      whichPartyTheParticipantIs: {
        resolvedByTheRecord: true,
        participantParty: RECORD.participantParty,
        otherParty: RECORD.otherParty,
        ownerDeterminationNeeded: false,
        resolvedFrom: {
          path: RECORD.path, sha256: RECORD.sha256, trackId: RECORD.trackId,
          memoVersion: RECORD.memoVersion, reviewedAsOf: RECORD.reviewedAsOf
        },
        readings: RECORD.partyReadings,
        participantBlock: [PARTICIPANT_BLOCK.first, PARTICIPANT_BLOCK.middle, PARTICIPANT_BLOCK.last],
        otherPartyBlock: [OTHER_BLOCK.first, OTHER_BLOCK.middle, OTHER_BLOCK.last],
        whyTheOtherBlockIsStillWithheld: "On this route the " + RECORD.otherParty.toLowerCase() + " is the "
          + "person who sought protection against the participant. Their name is a third party's fact this "
          + "platform does not hold, so it is carried to the participant rather than invented. Writing the "
          + "participant's name there would put a person into a caption block they do not occupy, which is the "
          + "class of defect recorded as a-participant-fact-written-into-a-field-about-someone-else in "
          + "data/rcap-grade-a/packet-factory-24h/DEFECTS_NO_COUNTER_CAN_SEE.json.",
        supersedes: "An earlier revision of this build recorded resolvedByTheRecord false and told the "
          + "participant, in participant-instructions.md and twice over, that nothing in the committed record "
          + "established which block they occupy. That was false; the record establishes it in the five places "
          + "listed above, and the same record was already being quoted in this family's filing-instructions.md. "
          + "VF04 failed the family on ROUTE_IDENTITY, KNOWN_PREFILLS and SELF_HELP_STOP for it."
      }
    }]
  });

  writeJson(`${OUT}/build-findings.json`, {
    schemaVersion: "rcap-build-findings/v1", familyId: FAMILY_ID, blocking: [], findingCount: 0,
    controllingLegalRecord: {
      path: RECORD.path, sha256: RECORD.sha256, byteLength: RECORD.byteLength, trackId: RECORD.trackId,
      memoVersion: RECORD.memoVersion, reviewedAsOf: RECORD.reviewedAsOf,
      readAtBuildTime: true,
      whatItDecidedHere: [
        `the participant is the ${RECORD.participantParty} and the ${RECORD.otherParty} is a third person`,
        "the packet_instruction limitations and the self-help stop conditions carried into the guide"
      ]
    },
    observations: [
      "AOC-275.18 is an AcroForm. Every write box is the /Rect of the source's own widget and no coordinate "
        + "is hand-entered.",
      "The Case.County chooser ships selected on \"000\", which is not one of its own 121 options. The shared "
        + "finalizer's chooser-prompt suppression does not reach it — isChooserPrompt(\"000\", options) is "
        + "false — so the only thing that displaces it is this build writing a real county over it. The "
        + "delivered bytes of both fixtures are re-read and asserted to carry no choice value outside its own "
        + "option list, and the build stops rather than shipping 000 as ink. This is a gap in a shared module, "
        + "reported to the Captain rather than edited from this lane.",
      `The participant is the ${RECORD.participantParty}, derived from ${RECORD.path} track `
        + `${RECORD.trackId} and asserted at build time in five independent places `
        + `(${RECORD.partyReadings.map((row) => row.node).join(", ")}). The `
        + `${PARTICIPANT_BLOCK.label.toLowerCase()} caption block carries the participant's own decomposed `
        + `name; the ${OTHER_BLOCK.label.toLowerCase()} block is withheld because it names a third person — `
        + `on this route, the person who petitioned against the participant — whose name this platform does `
        + `not hold. The free-text \`movant\` field IS written, because the form's own sentence is "The `
        + `movant, ____, seeks expungement" and the movant is whoever files.`,
      "SUPERSEDED FINDING. An earlier revision of this build recorded the party role as an unanswered owner "
        + "determination and told the participant, twice, that nothing in the committed record established it. "
        + "That claim was false: the record establishes it in five places, and this family's own "
        + "filing-instructions.md was already quoting the same record node verbatim. VF04 read the delivered "
        + "bytes and failed the family on ROUTE_IDENTITY, KNOWN_PREFILLS and SELF_HELP_STOP; all three came "
        + "from that one sentence. The build no longer states the role from memory — it reads the record, and "
        + "stops if any of the five readings stops saying what it says.",
      `The record's own limits now reach the participant. ${RECORD.packetInstructions.length} `
        + `packet_instruction limitation(s), ${RECORD.selfHelpBoundaries.length} self_help_boundary and `
        + `${RECORD.selfHelpStopConditions.length} selfHelpStopConditions are rendered verbatim into `
        + `participant-instructions.md and labelled as the record's own words. In particular a participant `
        + `whose dismissed protective-order case sat alongside an arrest is now told that this motion does not `
        + `touch any criminal record arising from the same events. They are guide text and none of them is `
        + `written onto the filing.`,
      "No box is checked. Items 1, 2 and 3 are sworn allegations sitting directly above the movant's "
        + "signature; screening establishes eligibility and a signature establishes an allegation, and item 3 "
        + "asks about a protective-order history the platform does not hold.",
      "The form's lower half carries no widgets at all — the signature line, the date line, the three "
        + "address-and-telephone rules and the whole NOTIFICATION OF EXPUNGEMENT HEARING block. They are not "
        + "terminal fields, they are not counted as such, and they are disclosed by their printed words in "
        + "participant-instructions.md.",
      "Print and Reset are push buttons. They are suppressed before the flatten and the delivered bytes are "
        + "asserted to carry neither caption."
    ],
    countyChooserShippedDefault: shippedCountyDefault
  });

  /*
   * THIS WRITE USED TO ERASE THE FAMILY'S GOVERNANCE STATE.
   *
   * product-wiring.json is regenerated wholesale here, and six keys on the
   * committed `binding` are NOT authored by this script:
   *
   *   acceptanceReceipt  lastIndependentVerification  paymentEligible
   *   sponsorshipEligible  whyPaymentIsClosed  maintenanceRelationship
   *
   * Two lanes found the same erasure independently on Minnesota families; the
   * record is data/rcap-grade-a/packet-factory-24h/REBUILD_ERASES_GOVERNANCE_STATE.json.
   * This builder was one of the erasing ones. It is invisible in a diff of the
   * fixtures, because the fixtures need not change for the keys to go.
   *
   * The write now routes through the shared mechanism rather than a copy of it.
   * Note what the mechanism does with the acceptance receipt, because THIS
   * repair moves the canonical bytes: a receipt binds one exact canonical
   * SHA-256, and when the build no longer produces those bytes the receipt has
   * stopped describing the packet. It is WITHDRAWN into acceptanceReceiptWithdrawn
   * with both digests — never deleted, and never carried forward as though it
   * still applied. Nothing here issues a receipt or sets a commercial guard;
   * preserving a value is not deciding one.
   */
  const wiringPath = absFor(`${OUT}/product-wiring.json`);
  const wiring = {
    schemaVersion: "rcap-family-product-wiring/v1", familyId: FAMILY_ID, routeKeys: [ROUTE_KEY],
    routeSelectionId: ROUTE_SELECTION_ID, implementationStrategy: "official_pdf_fill",
    generationAllowed: false, runtimeSelectable: false, commercialRoutesOpened: 0,
    createsFulfillmentRecord: false, opensCommercialRoute: false,
    assignmentOwnedPath: OUT, evidenceOutputPath: OUT, builtBy: BUILD_SCRIPT,
    note: "Review artifacts and maps create no authority. A route remains closed until exact output-level "
      + "legal and independent visual approval exists in the separate control plane.",
    binding: {
      family: FAMILY_ID, jurisdiction: "KY", routeKeys: [ROUTE_KEY], deliveryType: "official_pdf_fill",
      instrumentKinds: ["court_order", "primary_filing", "service_instructions"],
      packetComponents: [SOURCE.component],
      fieldMap: `${OUT}/production-field-map.json`,
      instructions: `${OUT}/participant-instructions.md`,
      filingInstructions: `${OUT}/filing-instructions.md`,
      renderedArtifacts: `${OUT}/reports/rendered-artifacts.json`,
      sourceReceipt: `${OUT}/source-receipt.json`,
      sourceVersion: [{ sourceId: SOURCE.sourceId, sha256: SOURCE.sha256, tier: "exact_content_hash" }],
      declaredInstrumentKindsWithoutAComponent: {
        kinds: ["court_order", "service_instructions"],
        note: "MASTER_QUEUE declares three instrument kinds for this family and one packet component. The "
          + "route census names a court_order and a service_instructions component; neither has a bound "
          + "source, and the court order for this motion is the clerk's own notification block printed on "
          + "the face of AOC-275.18. Recorded rather than silently treated as delivered."
      },
      controllingLegalRecord: {
        path: RECORD.path, sha256: RECORD.sha256, trackId: RECORD.trackId, tier: "exact_content_hash"
      }
    }
  };
  fs.mkdirSync(path.dirname(wiringPath), { recursive: true });
  writeWiringChecked(fs, wiringPath,
    preserveGovernanceState(fs, wiringPath, wiring, {
      canonicalSha256: sha256(canonical.bytes),
      log: (line) => console.error(line)
    }));

  writeJson(`${OUT}/approval-request.json`, {
    schemaVersion: "rcap-output-approval-request/v1", familyId: FAMILY_ID, routeKeys: [ROUTE_KEY],
    status: "REQUESTED", grantedBy: null, exactSourceReviewComplete: true,
    independentVisualReviewRequired: true, outputLegalApprovalRequired: true,
    ownerDeterminationsResolved: [{
      question: "On this route, is the participant the PETITIONER or the RESPONDENT in the protective-order "
        + "case whose record is being expunged?",
      status: "ANSWERED_BY_THE_COMMITTED_RECORD",
      answer: RECORD.participantParty,
      answeredFrom: { path: RECORD.path, sha256: RECORD.sha256, trackId: RECORD.trackId },
      readings: RECORD.partyReadings,
      note: "This was previously carried as an open owner determination. It was never open: the record "
        + "answers it in five places and this build now reads them. Answering it required no owner judgment "
        + "and grants nothing — counsel review, visual review and source-freshness review remain outstanding."
    }],
    generationAllowed: false, runtimeSelectable: false, commercialRoutesOpened: 0
  });

  writeJson(`${OUT}/build-status.json`, {
    schemaVersion: "rcap-family-build-status/v1", familyId: FAMILY_ID,
    status: "BUILT_REVIEW_PENDING", rasterState: "BUILT_RASTER_PENDING",
    builtDocuments: 1, renderedArtifacts: 2, rasterPages: 0,
    generationAllowed: false, runtimeSelectable: false, commercialRoutesOpened: 0,
    packetsSelfVerified: 0, productionTouched: false
  });

  return {
    familyId: FAMILY_ID, wrote: true, directory: OUT,
    canonical: { sha256: sha256(canonical.bytes), byteLength: canonical.bytes.length, pageCount: 1 },
    boundary: { sha256: sha256(boundary.bytes), byteLength: boundary.bytes.length, pageCount: 1 },
    source: { formNumber: SOURCE.formNumber, sha256: source.sha256, byteLength: source.byteLength,
      acroFieldCount: census.length, pageCount: source.pdf.getPageCount() },
    shippedCountyDefault,
    inkReadBackFromOutputBytes: [
      { fixture: "canonical", valuesReportedByFinalizer: (canonical.report.written ?? []).length,
        addedGlyphsReadFromOutputBytes: canonicalProof.addedGlyphsReadFromOutputBytes,
        nonWhitespaceGlyphsOutsideMeasuredWriteBoxes: canonicalProof.nonWhitespaceGlyphsOutsideMeasuredWriteBoxes,
        flattenedWidgetAppearancesReadFromOutputBytes: canonicalProof.flattenedWidgetAppearancesReadFromOutputBytes,
        deliveredChoiceValues: canonicalProof.deliveredChoiceValues, selectionsMarked: [] },
      { fixture: "boundary", valuesReportedByFinalizer: (boundary.report.written ?? []).length,
        addedGlyphsReadFromOutputBytes: boundaryProof.addedGlyphsReadFromOutputBytes,
        nonWhitespaceGlyphsOutsideMeasuredWriteBoxes: boundaryProof.nonWhitespaceGlyphsOutsideMeasuredWriteBoxes,
        flattenedWidgetAppearancesReadFromOutputBytes: boundaryProof.flattenedWidgetAppearancesReadFromOutputBytes,
        deliveredChoiceValues: boundaryProof.deliveredChoiceValues, selectionsMarked: [] }
    ],
    requiredBeforeFiling: supplyRows.length,
    participantElections: electionRows.length,
    routeSelectionsMade: 0,
    canonicalTooLongToFit: canonicalAudit.tooLongToFit,
    boundaryOnlyRequiredBeforeFiling: boundaryAudit.tooLongToFit.map((row) => ({
      field: row.field, label: row.effectiveLabel, measuredWhy: row.measuredWhy }))
  };
}

if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(thisFile)) {
  build({ check: process.argv.includes("--check") })
    .then((result) => console.log(JSON.stringify(result, null, 2)))
    .catch((error) => { console.error(error); process.exit(1); });
}

export { build, FAMILY_ID, OUT, BUILD_SCRIPT };
