#!/usr/bin/env node
/**
 * The New Hampshire pre-2019 non-conviction annulment family —
 * `nh_petition_nonconviction_pre2019-set`.
 *
 *   node scripts/build-census-v1-nh_petition_nonconviction_pre2019-set.mjs [--check] [--no-raster]
 *
 * Four official New Hampshire Judicial Branch forms, filed together:
 *
 *   NHJB-2317-DSe  Petition to Annul Record: Offenses Resolved Prior to 01/01/2019  — the filing
 *   NHJB-2311      Motion for Waiver of Filing Fee                                  — the fee waiver
 *   NHJB-2328      Statement of Assets and Liabilities                              — what the waiver rests on
 *   NHJB-2956      Criminal History Record Information Release Authorization        — the record request
 *
 * The route is `obligation:track-only:NH:nh_petition_nonconviction_pre2019`,
 * RSA 651:5, on the petition's own pre-2019 form.
 *
 * FOUR THINGS ABOUT THIS PACKET SHAPED THE IMPLEMENTATION.
 *
 * First, ONE OFFENCE PER FORM. NHJB-2317 says so in capitals: "PLEASE COMPLETE
 * A SEPARATE FORM FOR EACH OFFENSE". The charge block is therefore one row, not
 * a table, and every cell in it — the RSA, the charge, the charge date, the
 * date of conviction or other disposition, the date the sentence was completed
 * and the description of the sentence — is read off the court record. The
 * platform holds none of them, so each is declared REQUIRED_BEFORE_FILING and
 * named to the participant with the clerk of the sentencing court as the place
 * to get it.
 *
 * Second, THE CERTIFICATION IS SWORN, AND ALL OF IT IS THE APPLICANT'S. Ten
 * boxes, each a statement the applicant swears to under penalties of law:
 * whether they were convicted, whether every term of the sentence is complete,
 * whether the RSA 651:5, III time requirements are met, whether anything has
 * happened since, whether charges are pending anywhere else, whether the matter
 * is a violent crime or a felony crime of obstruction of justice, whether it
 * carries an enhanced penalty. Several are legal characterisations of the
 * participant's own record. A packet that ticked one would be swearing for
 * them.
 *
 * Third, THE FEE WAIVER'S COURT LIST DOES NOT COVER THIS PETITION. NHJB-2311's
 * only court control is a dropdown of SUPERIOR courts, and a pre-2019 annulment
 * is usually filed in a circuit court district division — which NHJB-2317's own
 * dropdown lists and this one does not. The build does not invent a way around
 * it: the mismatch is recorded in build-findings.json and the participant is
 * told, in participant-instructions.md, to write the court name by hand where
 * the list cannot express it.
 *
 * Fourth, NHJB-2956 SECTION II IS NOT USED ON THIS ROUTE. It is the
 * third-party release block, and this packet requests the participant's own
 * record for their own annulment. Its two controls are refused as not
 * applicable on this route rather than left unexplained — and one of them is
 * worth a reviewer's eye: the control New Hampshire put on the "NAME OF
 * PERSON/ENTITY TO RECEIVE RECORD" line is a dropdown of family and probate
 * courts.
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
import { finalizeOfficialForm } from "./rcap-official-forms/rcap-official-form-finalize.mjs";
import { flattenedWidgets, drawnAt } from "./rcap-official-forms/pdf-flattened-widgets.mjs";
import { stampDeterministic } from "./rcap-official-forms/rcap-deterministic-pdf-date.mjs";
import { BLANK_DISPOSITIONS, PASS_COUNTERS, classifyField, classifyBlank, rowKeyOf }
  from "./rcap-packet-completeness/completeness-contract.mjs";
import { loadAppearanceSemantics, dispositionsForFamily }
  from "./rcap-official-forms/rcap-appearance-semantics.mjs";

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
const { PDFDocument } = require("pdf-lib");

const FAMILY_ID = "nh_petition_nonconviction_pre2019-set";
const CORPUS_INDEX = "data/rcap-all50/local-source-corpus-index.json";
const OUT = "data/rcap-all50/overlays/census-v1/nh/nh-petition-nonconviction-pre2019-set--official-pdf-fill";
const BUILD_SCRIPT = "scripts/build-census-v1-nh_petition_nonconviction_pre2019-set.mjs";

/*
 * WHAT THE SOURCE ITSELF DRAWS INSIDE A FIELD, AND WHETHER IT MAY REACH THE FILING.
 *
 * Refusing to WRITE a field does not clear the appearance the source ships in
 * it. Two of these four forms ship one:
 *
 *   NHJB-2311 sig.8      -- no /V at all, and a widget appearance drawing
 *                           "Enter /s/ before name" in /TiBo 12 at 0.75 g. Grey,
 *                           legible, sitting on the Signature of Filer rule of a
 *                           motion nobody has signed.
 *   NHJB-2328 12.total,  -- /V "0" and an appearance drawing "0.00" at 1 g,
 *   money.total,            WHITE. Invisible on the page and present in the text
 *   monthly.total           layer, on a sworn financial affidavit whose every
 *                           contributing line is blank.
 *
 * All four are /Tx text fields, so the finalizer's structural default calls each
 * of them the court's own ink and preserves it. It is not the court's ink: each
 * is a participant input the source ships pre-answered or pre-prompted, and this
 * build refuses to write all four in its own field map. What the appearance
 * MEANS is recorded per field:component in the shared registry at
 * data/rcap-all50/shared/field-appearance-semantics.json and handed to the
 * finalizer here, which drops the value and every widget appearance of an
 * unwritten field it is told is a participant input. Nothing is decided by field
 * name, form or text in this file or in the finalizer: only by the disposition.
 *
 * A component with no registry entry is handed an empty map and keeps the
 * structural default, so NHJB-2317 and NHJB-2956 are byte-unaffected by this.
 */
const APPEARANCE_SEMANTICS = loadAppearanceSemantics();

/*
 * THE COST OF FILING, READ OUT OF THE COMMITTED RECORD RATHER THAN DENIED.
 *
 * This packet used to tell the participant that "the fee for a petition to annul
 * is not established in any source this packet holds". That sentence was true of
 * this family's BINDINGS and false of the repository: the committed New Hampshire
 * legal-design memo carries the figure, the schedule it was read from, the
 * single-fee-per-location rule, and the two agency fees this track is exempt
 * from. A packet that binds four form binaries and then reports the whole
 * repository silent sends a participant out to ask for something already written
 * down.
 *
 * So the memo is bound here as a grounding record, by its own SHA-256, the way
 * la-987 binds LA.memo.json -- and the fee sentences the packet prints are read
 * out of it at build time and quoted, never paraphrased and never retyped.
 * Nothing about the fee is authored by this file. If the memo changes the packet
 * changes with it, and if the memo went silent the build would fail rather than
 * print a figure this file remembered.
 */
const GROUNDING_RECORDS = Object.freeze({
  memo: "data/record-clearing/legal-design-intake/NH.memo.json",
  /*
   * The track registry is bound as well as the memo, because the packet now
   * prints something out of it. Independent verification measured this family at
   * 0 of 8 self-help stop conditions carried while the comparative families it
   * holds carried 13/13, 5/5 and 7/7, and four of the eight are warnings a
   * participant can be harmed by not having -- the RSA 651:5, IV three-year bar
   * on a further petition, that the annulment is not recognised federally or for
   * immigration, that RSA 651:5, XVII does not oblige a private background-check
   * database to remove the record, and that annulment does not restore firearm
   * rights. A packet that prints them must bind the record they came from.
   */
  trackRegistry: "data/record-clearing/legal-design-track-registry.json"
});
const MEMO_TRACK_ID = "nh_petition_nonconviction_pre2019";
/* The schedule the memo names in its own officialSources list. */
const FEE_SCHEDULE_TITLE_PREFIX = "Circuit Court Filing Fees";

const ROUTE = Object.freeze({
  jurisdiction: "NH",
  routeKey: "obligation:track-only:NH:nh_petition_nonconviction_pre2019",
  routeSelectionId: "nh-petition-nonconviction-pre2019-set-nhjb-2317-2311-2328-2956",
  publicLabel: "Petition to annul the record of a matter that did not end in a conviction, resolved before 1 January 2019",
  authority: "RSA 651:5; New Hampshire Judicial Branch forms NHJB-2317-DSe, NHJB-2311, NHJB-2328 and NHJB-2956",
  /*
   * Each document names the identity the MASTER_QUEUE pins and the digest it
   * pins it by. Binding is by that exact digest, not by a path: the queue's own
   * paths for this family name custodies this container does not mount, and the
   * committed corpus index records the same digests in the Master Library.
   */
  documents: [
    { formNumber: "NHJB-2317", sourceId: "official-form:NHJB-2317-DSe", pinnedSha256: "2fc2e1ede5201c17aa6a6e7726aff4659a649131429f8fec69771bc2b62f662c",
      title: "Petition to Annul Record: Offenses Resolved Prior to 01/01/2019", instrumentKind: "primary_filing" },
    { formNumber: "NHJB-2311", sourceId: "official-form:NHJB-2311", pinnedSha256: "f8b5df1366a91a9fd177612c0519f941b8d4f60e1f8f84c2a6c0c064ba7da58e",
      title: "Motion for Waiver of Filing Fee", instrumentKind: "fee_waiver_motion" },
    { formNumber: "NHJB-2328", sourceId: "official-form:NHJB-2328", pinnedSha256: "b4384b41efb472951c28b1289e46b05dfcc9463147aa490597f541f5291ce919",
      title: "Statement of Assets and Liabilities for Individuals and Sole Proprietors", instrumentKind: "fee_waiver_financial_statement" },
    { formNumber: "NHJB-2956", sourceId: "official-form:NHJB-2956", pinnedSha256: "c8e5e9fead600ad30a956eac98c43d30d9ca3a3b8b4bc619713e50c83524f569",
      title: "Criminal History Record Information Release Authorization", instrumentKind: "criminal_history_request" }
  ]
});

function corpusRoot() {
  const configured = process.env.MASTER_LIBRARY_SOURCE_DIR
    ?? "private/source-imports/Expungement_AI_RCAP_Master_Library_Edition_1";
  assert.ok(fs.existsSync(configured), `the Master Library is not mounted at ${configured}`);
  return configured;
}

/*
 * Read a committed record, hash the bytes that were read, and keep both.
 *
 * The hash is taken from the same buffer the build parses, so the digest in the
 * receipt is a digest of what was used and not of a second read of the file.
 */
function readGroundingRecord(relative) {
  const bytes = fs.readFileSync(path.join(ROOT, relative));
  return {
    path: relative,
    sha256: crypto.createHash("sha256").update(bytes).digest("hex"),
    byteLength: bytes.length,
    data: JSON.parse(bytes.toString("utf8"))
  };
}

/*
 * The cost and waiver sentences this route is charged with disclosing, taken
 * verbatim from the memo's own track entry.
 *
 * Every assertion here is an assertion that the memo still SAYS what the packet
 * is about to print. A silent memo, a renamed track or an emptied rule stops the
 * build; none of them lets the packet fall back to prose this file remembers.
 */
function loadFeeGrounding() {
  const memo = readGroundingRecord(GROUNDING_RECORDS.memo);
  const track = (memo.data.tracks ?? []).find((row) => row.trackId === MEMO_TRACK_ID);
  assert.ok(track, `${GROUNDING_RECORDS.memo} holds no track ${MEMO_TRACK_ID}`);
  assert.equal(track.legalName,
    "Petition to Annul the Record of a Non-Conviction Disposed of Before January 1, 2019 (RSA 651:5, II)");

  const fees = track.rules?.fees;
  const feeWaiver = track.rules?.feeWaiver;
  const sharedFee = track.destination?.detail;
  for (const [name, value] of [["rules.fees", fees], ["rules.feeWaiver", feeWaiver], ["destination.detail", sharedFee]]) {
    assert.ok(typeof value === "string" && value.trim().length > 0,
      `${GROUNDING_RECORDS.memo} track ${MEMO_TRACK_ID} carries no ${name}, so the packet cannot state one`);
  }

  const schedule = (track.officialSources ?? []).find((row) => String(row.title ?? "").startsWith(FEE_SCHEDULE_TITLE_PREFIX));
  assert.ok(schedule, `${GROUNDING_RECORDS.memo} track ${MEMO_TRACK_ID} names no ${FEE_SCHEDULE_TITLE_PREFIX} source`);

  return { record: memo, track, fees, feeWaiver, sharedFee, schedule };
}

/*
 * WHERE SELF-HELP ENDS, IN THE RECORD'S OWN WORDS.
 *
 * The committed legal-design record holds eight selfHelpStopConditions for this
 * track and the packet used to carry none of them. They are read here rather
 * than restated, and every one of the eight is printed verbatim: a stop
 * condition paraphrased is a stop condition weakened, and the two that carry a
 * statute cite -- RSA 651:5, IV and RSA 651:5, XVII -- lose the cite in any
 * paraphrase.
 *
 * TWO RECORDS, AND THEY MUST AGREE. The registry is the record independent
 * verification named; the intake memo carries the same track and this family
 * already binds it by SHA-256 for the fee. Both are read and asserted identical,
 * so the packet cannot print eight sentences that only one of them holds. A
 * count that is not eight, or a disagreement between the two, stops the build
 * rather than shipping a shortened list.
 */
const SELF_HELP_STOP_CONDITIONS_EXPECTED = 8;

function loadSelfHelpStops(memo) {
  const registry = readGroundingRecord(GROUNDING_RECORDS.trackRegistry);
  const track = (registry.data.tracks ?? []).find((row) => row.trackId === MEMO_TRACK_ID);
  assert.ok(track, `${GROUNDING_RECORDS.trackRegistry} holds no track ${MEMO_TRACK_ID}`);

  const conditions = track.selfHelpStopConditions ?? [];
  assert.equal(conditions.length, SELF_HELP_STOP_CONDITIONS_EXPECTED,
    `${GROUNDING_RECORDS.trackRegistry} track ${MEMO_TRACK_ID} carries ${conditions.length} selfHelpStopConditions, `
    + `not ${SELF_HELP_STOP_CONDITIONS_EXPECTED}; the packet prints every one of them and will not print a list it cannot account for`);
  for (const c of conditions) {
    assert.ok(typeof c === "string" && c.trim().length > 0, "a self-help stop condition is empty");
  }

  const fromMemo = (memo.data.tracks ?? []).find((row) => row.trackId === MEMO_TRACK_ID)?.selfHelpStopConditions ?? [];
  assert.deepEqual(fromMemo, conditions,
    `${GROUNDING_RECORDS.memo} and ${GROUNDING_RECORDS.trackRegistry} disagree on this track's self-help stop conditions`);

  return { record: registry, conditions, boundaries: track.selfHelpBoundaries ?? [] };
}

const SUPPLY = (what) => ({ policy: "supply", what });
const WRITE = (fact) => ({ policy: "write", fact });
const PROTECT = (refusalClass, why) => ({ policy: "protect", refusalClass, why });
const ELECTION = (why) => ({ policy: "election", why });
const ATTORNEY = (why) => ({ policy: "attorney", why });
/* A button in the PDF viewer. It clears, saves or navigates; nothing is filed in it. */
const VIEWER = (why) => ({ policy: "viewer", why: `viewer ui control; never a filing fact — ${why}` });
/* A box the form itself marks conditional, which the participant fills if it applies to them. */
const OPTIONAL = (what) => ({ policy: "optional", what });
/* A branch of the form this route does not use. Never populated with participant data. */
const NOT_ON_ROUTE = (why) => ({ policy: "not_on_route", why });
/*
 * A fact the platform HOLDS that this widget cannot receive — because the
 * shared binder refuses the write on evidence about the widget, not about the
 * fact. The fact id travels with the row so the completeness contract decides
 * availability for itself: if the packet writes that fact anywhere else in this
 * family, the contract refuses the blank rather than taking the build's word.
 */
const HELD_BUT_UNWRITABLE = (fact, what) => ({ policy: "supply", fact, what });

const SIGNATURE = "signature_or_date_participant_completion";
const COURT_OWNED = "court_prosecutor_clerk_or_agency_owned";
const PARTICIPANT_ELECTION = "participant_sworn_narrative_or_legal_election";

/*
 * The agency block on both forms is the same shape and the same reasoning: an
 * arresting or prosecuting AGENCY is a case fact, and the completeness contract
 * refuses to let a court/clerk refusal class hide one. The platform does not
 * hold this participant's agencies, so each is declared and disclosed by name.
 */
const AGENCY = (what) => SUPPLY(what);

const FORM_FIELDS = {
  "NHJB-2317": {
    /* --- The caption ----------------------------------------------------- */
    "court.district/su": {
      section: "Caption", label: "Court Name (selection)", selection: true,
      ...ELECTION("New Hampshire prints every circuit-court district division and every superior court in this list, and which one holds your case is a fact about your case; the platform holds no court assignment for you")
    },
    case: { section: "Caption", label: "Case Name, as the court styles it", ...SUPPLY("the case name exactly as the court writes it, which for a New Hampshire criminal case is usually The State of New Hampshire v. your name; copy it from a paper the court sent you") },
    "case number": { section: "Caption", label: "Case Number", ...WRITE("matter.case_number") },
    ChargeID: { section: "Caption", label: "Charge ID, if known", ...SUPPLY("the Charge ID the court or the police gave this charge, if you know it. The form says 'if known' and does not require it") },

    /* --- Applicant's information ----------------------------------------- */
    "name.1": { section: "Applicant's Information", label: "Full Name", ...WRITE("participant.full_legal_name") },
    DOB: { section: "Applicant's Information", label: "Date of Birth", ...WRITE("participant.date_of_birth") },
    "Mailing Address.1": { section: "Applicant's Information", label: "Address", ...WRITE("participant.street_address") },
    "Mailing Address.2": {
      section: "Applicant's Information", label: "City or Town",
      ...HELD_BUT_UNWRITABLE("participant.city",
        "the city or town you live in. This box prints City/Town but New Hampshire named it \"Mailing Address.2\", and a "
        + "packet that wrote into a box named for a different line would risk printing your street address where your "
        + "town belongs — so this one is left for you. The reason is recorded in full in build-findings.json")
    },
    "States/short": { section: "Applicant's Information", label: "State", ...WRITE("participant.state") },
    zip: { section: "Applicant's Information", label: "Zip Code", ...WRITE("participant.zip") },
    "telnum.1": { section: "Applicant's Information", label: "Telephone Number", ...WRITE("participant.phone") },
    Email: { section: "Applicant's Information", label: "E-mail Address (optional)", ...WRITE("participant.email") },

    /* --- Charge information ---------------------------------------------- *
     * One offence per form, in the form's own words: "PLEASE COMPLETE A
     * SEPARATE FORM FOR EACH OFFENSE". Every cell here is read off the court
     * record, and the platform holds none of them. */
    rsa: { section: "Charge Information", label: "RSA or statute violated", ...SUPPLY("the RSA (statute) number the charge was brought under, from the court record") },
    offense: { section: "Charge Information", label: "The crime or offence, as the court record names it", ...SUPPLY("the name of the crime or offence exactly as the court record gives it") },
    "Date.2": { section: "Charge Information", label: "Charge Date", ...SUPPLY("the date of the charge, from the court record") },
    "Date.3": { section: "Charge Information", label: "Date of conviction or other disposition", ...SUPPLY("the date of the conviction, or of the other disposition if there was no conviction, from the court record") },
    "Date.4": { section: "Charge Information", label: "Date all terms and conditions of the sentence were completed", ...SUPPLY("the date every term and condition of the sentence was completed, including any fine, restitution, cost, period of good behaviour, probation and suspended sentence. The clerk of the sentencing court can confirm it") },
    "tr.disposition": { section: "Charge Information", label: "Description of the sentence or other disposition", ...SUPPLY("the sentence or other disposition the court imposed, described in your own words from the court record") },

    /* --- The applicant's certification ------------------------------------ *
     * Eight sworn statements and a hearing request. Each is a statement the
     * applicant swears to under penalties of law, and none of them is the
     * platform's to make. */
    cb1: { section: "Applicant's Certification", selection: true, label: "Certifying you were NOT convicted, and seek annulment only of the record of arrest or charge (selection)", ...ELECTION("you swear to this under penalties of law; only you can say which of the two openings describes your case") },
    cb2: { section: "Applicant's Certification", selection: true, label: "Certifying you WERE convicted, and seek annulment of the arrest, charge, conviction and sentence (selection)", ...ELECTION("you swear to this under penalties of law; only you can say which of the two openings describes your case") },
    cb3: { section: "Applicant's Certification", selection: true, label: "Certifying every term and condition of the sentence has been completed (selection)", ...ELECTION("you swear to this under penalties of law, and the platform holds no record of what you have completed") },
    cb4: { section: "Applicant's Certification", selection: true, label: "Certifying the time requirements under RSA 651:5, III have been met (selection)", ...ELECTION("you swear to this under penalties of law; it turns on dates the platform does not hold") },
    cb5: { section: "Applicant's Certification", selection: true, label: "Certifying you have not been convicted of another crime since completing the sentence (selection)", ...ELECTION("you swear to this under penalties of law about your own record since sentence, which the platform has not seen") },
    cb6: { section: "Applicant's Certification", selection: true, label: "Certifying there are no charges pending against you in any other court, except as stated (selection)", ...ELECTION("you swear to this under penalties of law about charges in every other court, which the platform has not seen") },
    cb7: { section: "Applicant's Certification", selection: true, label: "Certifying none of the matters sought to be annulled is a violent crime, a felony crime of obstruction of justice, or carried an extended term under RSA 651:6 (selection)", ...ELECTION("you swear to this under penalties of law; it is a legal characterisation of your own matters and the platform will not make it for you") },
    cb8: { section: "Applicant's Certification", selection: true, label: "Certifying the matter sought to be annulled has no enhanced penalty for a second conviction (selection)", ...ELECTION("you swear to this under penalties of law; it is a legal characterisation of your own matter and the platform will not make it for you") },
    "Check Box1": { section: "Applicant's Certification", selection: true, label: "Certifying the time requirements have been met for every matter you have been convicted of (selection)", ...ELECTION("you swear to this under penalties of law across your whole record, which the platform has not seen") },
    "Check Box2": { section: "Applicant's Certification", selection: true, label: "Requesting a hearing before a judge (selection)", ...ELECTION("the form says the court may decide without a hearing unless you ask for one, and whether to ask is your choice") },
    "tr.pending": { section: "Applicant's Certification", label: "The charges pending against you in another court, if there are any", ...SUPPLY("any charges pending against you in another court. Leave it empty if there are none, and read the statement above it before you sign") },

    /* --- Signature -------------------------------------------------------- */
    DefDate: { section: "Signature", label: "Date you sign, entered at signature", ...PROTECT(SIGNATURE, "the date is part of the sworn signature block and is entered when you sign") },
    "DEFsig.8": { section: "Signature", label: "Applicant's Signature", ...PROTECT(SIGNATURE, "you swear or affirm under penalties of law and sign this yourself") },
    Counsel: { section: "Signature", label: "Name of Counsel", ...ATTORNEY("attorney-only; no attorney-representation fact is held for this participant") },
    "Attysig.8": { section: "Signature", label: "Counsel's Signature", ...ATTORNEY("attorney-only; no attorney-representation fact is held for this participant") },
    "Counsel Mailing Address1": { section: "Signature", label: "Counsel's Address, first line", ...ATTORNEY("attorney-only; no attorney-representation fact is held for this participant") },
    "Counsel Mailing Address2": { section: "Signature", label: "Counsel's Address, second line", ...ATTORNEY("attorney-only; no attorney-representation fact is held for this participant") },

    /* --- Page 2 and 3 headers, and the court's own page -------------------- */
    case1: { section: "Page Header", label: "Case Name repeated in the page header", ...SUPPLY("the same case name as the caption, repeated in the header of the later pages") },
    "case number1": { section: "Page Header", label: "Case Number repeated in the page header", ...WRITE("matter.case_number") },

    /* --- Viewer controls --------------------------------------------------- */
    "Clear Form - multi": { section: "Viewer Controls", label: "Clear this form (viewer control)", ...VIEWER("a button in the PDF viewer, not a place anything is filed") },
    "Save and lock form": { section: "Viewer Controls", label: "Save this form and lock it (viewer control)", ...VIEWER("a button in the PDF viewer, not a place anything is filed") },
    "top page": { section: "Viewer Controls", label: "Reset the view to the top of the form (viewer control)", ...VIEWER("a navigation button in the PDF viewer, not a place anything is filed") },
    "1st page": { section: "Viewer Controls", label: "Reset the view to the first page of the form (viewer control)", ...VIEWER("a navigation button in the PDF viewer, not a place anything is filed") }
  },

  "NHJB-2311": {
    "court.superior": {
      section: "Caption", label: "Court Name (selection)", selection: true,
      ...ELECTION("this list offers the superior courts; pick the court your case is in, and read the build note about circuit-court cases in build-findings.json")
    },
    case: { section: "Caption", label: "Case Name, as the court styles it", ...SUPPLY("the same case name you put on the petition") },
    "case number": { section: "Caption", label: "Case Number", ...WRITE("matter.case_number") },
    name: { section: "The Motion", label: "Applicant's full name, in the opening line of this request", ...WRITE("participant.full_legal_name") },
    "tr.reasons": { section: "The Motion", label: "Explain why you cannot pay the filing fee", ...SUPPLY("your own account of why you cannot pay the filing fee now. The platform does not write a sworn explanation of your finances for you") },
    "sig.1": { section: "Signature Block", label: "Name of Filer, entered at signature", ...PROTECT(SIGNATURE, "the whole block is completed by the filer at the moment of signing, and New Hampshire names every box in it sig.N; the packet does not present a signature block as further along than it is") },
    "sig.8": { section: "Signature Block", label: "Signature of Filer", ...PROTECT(SIGNATURE, "you sign this yourself") },
    "sig.9": { section: "Signature Block", label: "Date you sign, entered at signature", ...PROTECT(SIGNATURE, "the date is part of the signature block and is entered when you sign") },
    "sig.2": { section: "Signature Block", label: "Law Firm, if applicable", ...ATTORNEY("attorney-only; no attorney-representation fact is held for this participant") },
    "sig.3": { section: "Signature Block", label: "Bar ID number of attorney", ...ATTORNEY("attorney-only; no attorney-representation fact is held for this participant") },
    "sig.10": { section: "Signature Block", label: "Telephone, in the signature block", ...PROTECT(SIGNATURE, "part of the signature block, completed by the filer when they sign") },
    "sig.4": { section: "Signature Block", label: "Address, in the signature block", ...PROTECT(SIGNATURE, "part of the signature block, completed by the filer when they sign") },
    "sig.11": { section: "Signature Block", label: "E-mail, in the signature block", ...PROTECT(SIGNATURE, "part of the signature block, completed by the filer when they sign") },
    "sig.5": { section: "Signature Block", label: "City, in the signature block", ...PROTECT(SIGNATURE, "part of the signature block, completed by the filer when they sign") },
    "sig.6": { section: "Signature Block", label: "State, in the signature block", ...PROTECT(SIGNATURE, "part of the signature block, completed by the filer when they sign") },
    "sig.7": { section: "Signature Block", label: "Zip code, in the signature block", ...PROTECT(SIGNATURE, "part of the signature block, completed by the filer when they sign") },
    "Clear Form - multi": { section: "Viewer Controls", label: "Clear this form (viewer control)", ...VIEWER("a button in the PDF viewer, not a place anything is filed") },
    "Save and lock form": { section: "Viewer Controls", label: "Save this form and lock it (viewer control)", ...VIEWER("a button in the PDF viewer, not a place anything is filed") },
    "top page": { section: "Viewer Controls", label: "Reset the view to the top of the form (viewer control)", ...VIEWER("a navigation button in the PDF viewer, not a place anything is filed") },
    "1st page": { section: "Viewer Controls", label: "Reset the view to the first page of the form (viewer control)", ...VIEWER("a navigation button in the PDF viewer, not a place anything is filed") }
  },

  "NHJB-2328": {
    "court.district/family/probate - both": {
      section: "Caption", label: "Court Name (selection)", selection: true,
      ...ELECTION("pick the court your case is in; the platform holds no court assignment for you")
    },
    case: { section: "Caption", label: "Case Name, as the court styles it", ...SUPPLY("the same case name you put on the petition") },
    "case number": { section: "Caption", label: "Case Number", ...WRITE("matter.case_number") },
    "1.1": { section: "Who You Are", label: "Name", ...WRITE("participant.full_legal_name") },
    "1.2": { section: "Who You Are", label: "DOB", ...WRITE("participant.date_of_birth") },
    "2.1": { section: "Who You Are", label: "Residence Address", ...WRITE("participant.street_address") },
    "3.1": { section: "Who You Are", label: "Mailing Address, if different from the residence address", ...OPTIONAL("your mailing address, only if it is different from where you live") },
    "cb.1": { section: "Who You Are", selection: true, label: "Marital status — single, married, separated or widowed (selection)", ...ELECTION("your marital status is yours to state and the platform holds no marital fact for you") },
    "tr.support": { section: "Who You Are", label: "The names, ages and relationships of the dependents you support", ...SUPPLY("the names, ages and relationships of everyone who depends on you for support") },
    "employed.1": { section: "Work", label: "Where you are employed and for how long", ...SUPPLY("where you work now and how long you have worked there, if you are employed") },
    "cb.2": { section: "Work", selection: true, label: "Whether your own work is full-time or part-time (selection)", ...ELECTION("only you can say which your work is") },
    "Date.2": { section: "Work", label: "If you are unemployed, the last date you were employed", ...SUPPLY("the last date you worked, if you are unemployed now") },
    "Date.3": { section: "Work", label: "When you expect to start new employment", ...SUPPLY("when you expect new work to start, if you know") },
    "employed.2": { section: "Work", label: "Where your spouse is employed and for how long", ...SUPPLY("where your spouse works and for how long, if you have a spouse who works") },
    "cb.3": { section: "Work", selection: true, label: "Whether your spouse's work is full-time or part-time (selection)", ...ELECTION("only you can say which your spouse's work is") },
    "Date.4": { section: "Work", label: "If your spouse is unemployed, the last date they were employed", ...SUPPLY("the last date your spouse worked, if they are unemployed now") },
    "employed.3": { section: "Work", label: "Other employed household members and their weekly income", ...SUPPLY("anyone else in your household who works, and what they bring in each week") },

    "yours.1": { section: "Weekly Take-Home", label: "Salary or wages, yours", ...SUPPLY("your weekly take-home salary or wages") },
    "yours.2": { section: "Weekly Take-Home", label: "Child support received, yours", ...SUPPLY("child support you receive each week") },
    "yours.3": { section: "Weekly Take-Home", label: "Alimony received, yours", ...SUPPLY("alimony you receive each week") },
    "yours.4": { section: "Weekly Take-Home", label: "Trust benefits, yours", ...SUPPLY("trust benefits you receive each week") },
    "yours.5": { section: "Weekly Take-Home", label: "Investment income, yours", ...SUPPLY("investment income you receive each week") },
    "yours.6": { section: "Weekly Take-Home", label: "Other weekly income, yours", ...SUPPLY("any other weekly income of yours") },
    "yours.7": { section: "Weekly Take-Home", label: "Social security, yours (the form marks this exempt income)", ...SUPPLY("social security you receive each week. The form marks it exempt income the court may not consider") },
    "yours.8": { section: "Weekly Take-Home", label: "Welfare benefits, yours (the form marks this exempt income)", ...SUPPLY("welfare benefits you receive each week. The form marks it exempt income") },
    "yours.9": { section: "Weekly Take-Home", label: "Veteran's benefits, yours (the form marks this exempt income)", ...SUPPLY("veteran's benefits you receive each week. The form marks it exempt income") },
    "yours.10": { section: "Weekly Take-Home", label: "Pension, yours (the form marks this exempt income)", ...SUPPLY("pension income you receive each week. The form marks it exempt income") },
    "yours.11": { section: "Weekly Take-Home", label: "Unemployment compensation, yours (the form marks this partially exempt)", ...SUPPLY("unemployment compensation you receive each week. The form marks it potentially or partially exempt") },
    "yours.12": { section: "Weekly Take-Home", label: "Worker's compensation, yours (the form marks this partially exempt)", ...SUPPLY("worker's compensation you receive each week. The form marks it potentially or partially exempt") },
    "12.total": { section: "Weekly Take-Home", label: "Total weekly take-home", ...SUPPLY("the total of the weekly amounts above. The form adds it up for you when you fill it in on a computer") },
    "spouse.1": { section: "Weekly Take-Home", label: "Salary or wages, your spouse's", ...SUPPLY("your spouse's weekly take-home salary or wages") },
    "spouse.2": { section: "Weekly Take-Home", label: "Child support received, your spouse's", ...SUPPLY("child support your spouse receives each week") },
    "spouse.3": { section: "Weekly Take-Home", label: "Alimony received, your spouse's", ...SUPPLY("alimony your spouse receives each week") },
    "spouse.4": { section: "Weekly Take-Home", label: "Trust benefits, your spouse's", ...SUPPLY("trust benefits your spouse receives each week") },
    "spouse.5": { section: "Weekly Take-Home", label: "Investment income, your spouse's", ...SUPPLY("investment income your spouse receives each week") },
    "spouse.6": { section: "Weekly Take-Home", label: "Other weekly income, your spouse's", ...SUPPLY("any other weekly income of your spouse's") },
    "spouse.7": { section: "Weekly Take-Home", label: "Social security, your spouse's (the form marks this exempt income)", ...SUPPLY("social security your spouse receives each week") },
    "spouse.8": { section: "Weekly Take-Home", label: "Welfare benefits, your spouse's (the form marks this exempt income)", ...SUPPLY("welfare benefits your spouse receives each week") },
    "spouse.9": { section: "Weekly Take-Home", label: "Veteran's benefits, your spouse's (the form marks this exempt income)", ...SUPPLY("veteran's benefits your spouse receives each week") },
    "spouse.10": { section: "Weekly Take-Home", label: "Pension, your spouse's (the form marks this exempt income)", ...SUPPLY("pension income your spouse receives each week") },
    "spouse.11": { section: "Weekly Take-Home", label: "Unemployment compensation, your spouse's (the form marks this partially exempt)", ...SUPPLY("unemployment compensation your spouse receives each week") },
    "spouse.12": { section: "Weekly Take-Home", label: "Worker's compensation, your spouse's (the form marks this partially exempt)", ...SUPPLY("worker's compensation your spouse receives each week") },

    "money.1": { section: "Money Available", label: "Cash on hand", ...SUPPLY("the cash you have on hand") },
    "money.2": { section: "Money Available", label: "Checking account", ...SUPPLY("what is in your checking account") },
    "money.3": { section: "Money Available", label: "Savings account", ...SUPPLY("what is in your savings account") },
    "money.4": { section: "Money Available", label: "Stocks, bonds, IRA or pension", ...SUPPLY("what you hold in stocks, bonds, an IRA or a pension") },
    "money.total": { section: "Money Available", label: "Total money presently available to you", ...SUPPLY("the total of the amounts above. The form adds it up for you when you fill it in on a computer") },

    "monthly.1": { section: "Monthly Household Expenses", label: "Rent or mortgage each month", ...SUPPLY("what you pay in rent or mortgage each month") },
    "monthly.2": { section: "Monthly Household Expenses", label: "Property taxes each month", ...SUPPLY("what you pay in property taxes each month") },
    "monthly.3": { section: "Monthly Household Expenses", label: "Heat each month", ...SUPPLY("what you pay for heat each month") },
    "monthly.4": { section: "Monthly Household Expenses", label: "Food each month", ...SUPPLY("what you spend on food each month") },
    "monthly.5": { section: "Monthly Household Expenses", label: "Utilities each month", ...SUPPLY("what you pay for utilities each month") },
    "monthly.6": { section: "Monthly Household Expenses", label: "Medical and dental each month", ...SUPPLY("what you pay for medical and dental care each month") },
    "monthly.7": { section: "Monthly Household Expenses", label: "Insurance each month", ...SUPPLY("what you pay for insurance each month") },
    "monthly.12": { section: "Monthly Household Expenses", label: "Cell phone each month", ...SUPPLY("what you pay for your cell phone each month") },
    "monthly.8": { section: "Monthly Household Expenses", label: "Clothing each month", ...SUPPLY("what you spend on clothing each month") },
    "monthly.9": { section: "Monthly Household Expenses", label: "Transportation each month, including gas, maintenance, insurance and repairs", ...SUPPLY("what you spend getting around each month, including gas, maintenance, insurance and repairs") },
    "other.1": { section: "Monthly Household Expenses", label: "Another monthly expense, named by you — first line", ...SUPPLY("the name of any other monthly expense you have") },
    "monthly.10": { section: "Monthly Household Expenses", label: "Another monthly expense, the amount — first line", ...SUPPLY("what that other expense costs you each month") },
    "other.2": { section: "Monthly Household Expenses", label: "Another monthly expense, named by you — second line", ...SUPPLY("the name of a second other monthly expense, if you have one") },
    "monthly.11": { section: "Monthly Household Expenses", label: "Another monthly expense, the amount — second line", ...SUPPLY("what that second other expense costs you each month") },
    "monthly.total": { section: "Monthly Household Expenses", label: "Total monthly household expenses", ...SUPPLY("the total of the monthly amounts above. The form adds it up for you when you fill it in on a computer") },

    "tr.re": { section: "What You Own and Owe", label: "The real estate you own, its market value and what you owe on it", ...SUPPLY("any real estate you own, what it is worth and what you still owe on it") },
    "tr.vehicles": { section: "What You Own and Owe", label: "The vehicles you own, their market value and what you owe on them", ...SUPPLY("any car, truck, boat, motorcycle, snowmobile or RV you own, what it is worth and what you still owe") },
    "income.1": { section: "What You Own and Owe", label: "Income tax paid last year", ...SUPPLY("the income tax you paid last year") },
    "income.2": { section: "What You Own and Owe", label: "Income tax refund received last year", ...SUPPLY("the income tax refund you received last year") },
    "tr.monthly": { section: "What You Own and Owe", label: "Bills you owe other than monthly household expenses, the amount, to whom, and the monthly payment", ...SUPPLY("any other bills you owe, how much, to whom, and what you pay each month") },
    "tr.payments": { section: "What You Own and Owe", label: "Which of your bills are court-ordered payments", ...SUPPLY("which of those bills a court ordered you to pay, such as alimony or a judgment") },
    "tr.other": { section: "What You Own and Owe", label: "Anyone else you owe money to, the amount, and when it is due", ...SUPPLY("anyone else you owe money to, how much, and when it is due") },
    "tr.owed": { section: "What You Own and Owe", label: "Anyone who owes you money — name, address, amount due and when due", ...SUPPLY("anyone who owes you money, their name and address, how much, and when it is due") },
    "tr.property": { section: "What You Own and Owe", label: "Property you have transferred in the last three years, to whom and for what price", ...SUPPLY("anything you have transferred to someone else in the last three years, to whom, and for what price") },
    "tr.other2": { section: "What You Own and Owe", label: "Any other assets or expenses not already mentioned", ...SUPPLY("anything else you own or pay for that is not already listed") },

    case1: { section: "Page Header", label: "Case Name repeated in the page header", ...SUPPLY("the same case name as the caption, repeated in the header of the later pages") },
    "case number1": { section: "Page Header", label: "Case Number repeated in the page header", ...WRITE("matter.case_number") },

    "cbcert.1": { section: "Certificate of Service", selection: true, label: "Certificate of service — certifying you sent a copy on the date you sign (selection)", ...PROTECT(SIGNATURE, "the certificate states what you did on the day you signed; service has not happened when the packet is prepared") },
    "sig.1": { section: "Signature Block", label: "Name of Filer, entered at signature", ...PROTECT(SIGNATURE, "the whole block is completed by the filer at the moment of signing, and New Hampshire names every box in it sig.N; the packet does not present a signature block as further along than it is") },
    "sig.8": { section: "Signature Block", label: "Signature of Filer", ...PROTECT(SIGNATURE, "you sign this yourself") },
    "sig.9": { section: "Signature Block", label: "Date you sign, entered at signature", ...PROTECT(SIGNATURE, "the date is part of the signature block and is entered when you sign") },
    "sig.2": { section: "Signature Block", label: "Law Firm, if applicable", ...ATTORNEY("attorney-only; no attorney-representation fact is held for this participant") },
    "sig.3": { section: "Signature Block", label: "Bar ID number of attorney", ...ATTORNEY("attorney-only; no attorney-representation fact is held for this participant") },
    "sig.10": { section: "Signature Block", label: "Telephone, in the signature block", ...PROTECT(SIGNATURE, "part of the signature block, completed by the filer when they sign") },
    "sig.4": { section: "Signature Block", label: "Address, in the signature block", ...PROTECT(SIGNATURE, "part of the signature block, completed by the filer when they sign") },
    "sig.11": { section: "Signature Block", label: "E-mail, in the signature block", ...PROTECT(SIGNATURE, "part of the signature block, completed by the filer when they sign") },
    "sig.5": { section: "Signature Block", label: "City, in the signature block", ...PROTECT(SIGNATURE, "part of the signature block, completed by the filer when they sign") },
    "sig.6": { section: "Signature Block", label: "State, in the signature block", ...PROTECT(SIGNATURE, "part of the signature block, completed by the filer when they sign") },
    "sig.7": { section: "Signature Block", label: "Zip code, in the signature block", ...PROTECT(SIGNATURE, "part of the signature block, completed by the filer when they sign") },

    "Clear Form - multi": { section: "Viewer Controls", label: "Clear this form (viewer control)", ...VIEWER("a button in the PDF viewer, not a place anything is filed") },
    "Save and lock form": { section: "Viewer Controls", label: "Save this form and lock it (viewer control)", ...VIEWER("a button in the PDF viewer, not a place anything is filed") },
    "top page": { section: "Viewer Controls", label: "Reset the view to the top of the form (viewer control)", ...VIEWER("a navigation button in the PDF viewer, not a place anything is filed") },
    "1st page": { section: "Viewer Controls", label: "Reset the view to the first page of the form (viewer control)", ...VIEWER("a navigation button in the PDF viewer, not a place anything is filed") }
  },

  "NHJB-2956": {
    "name.1": {
      section: "Section I — Who You Are", label: "Last name",
      ...HELD_BUT_UNWRITABLE("participant.last_name",
        "your last name. New Hampshire named all four boxes on this line name.1 to name.4, so the shared binder resolves "
        + "the FULL legal name for each of them and refuses to put one part of a name in a box the whole name would "
        + "bind to. The State Police read this line as LAST (MAIDEN/ALIAS) FIRST MI, so print the parts yourself")
    },
    "name.2": { section: "Section I — Who You Are", label: "Maiden name or alias", ...SUPPLY("any maiden name or alias your record might be under") },
    "name.3": {
      section: "Section I — Who You Are", label: "First name",
      ...HELD_BUT_UNWRITABLE("participant.first_name", "your first name, in the third box of the LAST (MAIDEN/ALIAS) FIRST MI line")
    },
    "name.4": {
      section: "Section I — Who You Are", label: "Middle name box, which the form heads MI",
      ...HELD_BUT_UNWRITABLE("participant.middle_name", "your middle initial, in the last box of the LAST (MAIDEN/ALIAS) FIRST MI line")
    },
    "Mailing Address1": {
      section: "Section I — Who You Are", label: "Your address — street, city, state and zip on one line",
      ...SUPPLY("your address written on one line as street, city, state and zip. The platform holds those as separate facts and the shared registry has no single fact for the composed line, so writing only the street would put a fraction of an answer in a box the State Police reads as your whole address")
    },
    Date: { section: "Section I — Who You Are", label: "Date of birth", ...WRITE("participant.date_of_birth") },
    gender: { section: "Section I — Who You Are", label: "Sex, as the State Police record holds it", ...SUPPLY("the sex the State Police record holds for you; the form offers Female and Male") },
    hair: { section: "Section I — Who You Are", label: "Hair colour", ...SUPPLY("your hair colour, from the list the form offers") },
    eyes: { section: "Section I — Who You Are", label: "Eye colour", ...SUPPLY("your eye colour, from the list the form offers") },
    license: { section: "Section I — Who You Are", label: "Driver licence number", ...SUPPLY("your driver licence number") },
    "States/short": { section: "Section I — Who You Are", label: "The state that issued the driver licence", ...SUPPLY("the state that issued your driver licence") },
    record: {
      section: "Section I — Who You Are", label: "Purpose of record — the Other line",
      ...NOT_ON_ROUTE("the purpose of this request is annulment or expungement, which the form prints as its own option, so the Other line is never populated with participant data on this route")
    },
    address: {
      section: "Section II — Third-Party Release", label: "Address of the person or entity to receive the record",
      ...NOT_ON_ROUTE("Section II is completed only when the record is released to a third party. This packet requests your own record for your own annulment, so Section II is never populated with participant data on this route")
    },
    "court.family/probate1 CUSTOM": {
      section: "Section II — Third-Party Release", label: "Name of the person or entity to receive the record (selection)", selection: true,
      ...NOT_ON_ROUTE("Section II is completed only when the record is released to a third party, and it is never populated with participant data on this route. See build-findings.json: the control New Hampshire put on this line is a dropdown of family and probate courts")
    },
    "Clear Form": { section: "Viewer Controls", label: "Clear this form (viewer control)", ...VIEWER("a button in the PDF viewer, not a place anything is filed") },
    "top page": { section: "Viewer Controls", label: "Reset the view to the top of the form (viewer control)", ...VIEWER("a navigation button in the PDF viewer, not a place anything is filed") },
    "Form Guide": { section: "Viewer Controls", label: "Open the form guide (viewer control)", ...VIEWER("a button in the PDF viewer that opens guidance, not a place anything is filed") }
  }
};
/* ---- fixtures ------------------------------------------------------------ *
 *
 * Two participants, one New Hampshire matter each. The canonical fixture is an
 * ordinary set of values; the boundary fixture stresses length, punctuation and
 * a hyphenated surname against the same widgets. Both carry name PARTS as well
 * as the full legal name, because NHJB-2956 asks for last, first and middle
 * initial in four separate boxes.
 */
const FIXTURES = {
  canonical: {
    "participant.full_legal_name": "Jordan Avery Reyes",
    "participant.first_name": "Jordan",
    "participant.middle_name": "A",
    "participant.last_name": "Reyes",
    "participant.date_of_birth": "1991-04-17",
    "participant.street_address": "412 Elm Street, Apartment 3",
    "participant.city": "Concord",
    "participant.state": "NH",
    "participant.zip": "03301",
    "participant.city_state_zip": "Concord, NH 03301",
    "participant.phone": "603-555-0142",
    "participant.email": "jordan.reyes@example.org",
    "matter.county": "Merrimack",
    "matter.case_number": "473-2016-CR-00218",
    "matter.charges": [{ case_number: "473-2016-CR-00218" }]
  },
  boundary: {
    "participant.full_legal_name": "Maria-Alejandra O’Shaughnessy-Whitfield",
    "participant.first_name": "Maria-Alejandra",
    "participant.middle_name": "Q",
    "participant.last_name": "O’Shaughnessy-Whitfield",
    "participant.date_of_birth": "1968-12-31",
    "participant.street_address": "1188 Upper Notch Crossing Road, Apartment 14B",
    "participant.city": "Portsmouth",
    "participant.state": "NH",
    "participant.zip": "03801-2214",
    "participant.city_state_zip": "Portsmouth, New Hampshire 03801-2214",
    "participant.phone": "(603) 555-0199 ext. 4417",
    "participant.email": "maria.alejandra.oshaughnessy.whitfield@longmailexample.org",
    "matter.county": "Rockingham",
    "matter.case_number": "218-2018-CR-00119821-SUPPLEMENTAL",
    "matter.charges": [{ case_number: "218-2018-CR-00119821-SUPPLEMENTAL" }]
  }
};
const RASTER_ENGINE = "scripts/raster/pdf-page-raster.mjs (Chromium, calibrated)";

/* ---- source binding ------------------------------------------------------ *
 *
 * BOUND BY DIGEST, NOT BY PATH.
 *
 * The MASTER_QUEUE row for this family pins four SHA-256 digests and gives each
 * a path in a custody this container does not mount — three in the D source
 * packs and one in the nationwide recovery pool. The committed corpus index
 * records every one of those digests in the Master Library as well, which IS
 * mounted, so the bytes bind exactly; only the path differs. Resolution
 * therefore starts from the pinned digest, finds the mounted entry that carries
 * it, and re-hashes the file on disk before a single byte is read. A digest that
 * matches no mounted entry, or a file that hashes to something else, stops the
 * family rather than being worked around.
 */
function resolveSources() {
  const index = JSON.parse(fs.readFileSync(path.join(ROOT, CORPUS_INDEX), "utf8"));
  const all = index.entries ?? [];
  const root = corpusRoot();
  const resolved = [];
  const failures = [];
  for (const wanted of ROUTE.documents) {
    const entry = all.find((e) => e.sha256 === wanted.pinnedSha256 && e.custody === "master_library");
    if (!entry) {
      failures.push({ sourceId: wanted.sourceId, pinnedSha256: wanted.pinnedSha256,
        why: "no entry in the committed corpus index carries this digest in a custody this container mounts" });
      continue;
    }
    const rel = entry.path;
    const abs = path.resolve(ROOT, root, rel);
    if (!fs.existsSync(abs)) { failures.push({ sourceId: wanted.sourceId, pathInArchive: rel, why: `the indexed path does not exist on disk: ${rel}` }); continue; }
    const bytes = fs.readFileSync(abs);
    const sha256 = crypto.createHash("sha256").update(bytes).digest("hex");
    if (sha256 !== wanted.pinnedSha256) {
      failures.push({ sourceId: wanted.sourceId, pathInArchive: rel,
        why: `SHA-256 drift: the assignment pins ${wanted.pinnedSha256}, the mounted corpus holds ${sha256}` });
      continue;
    }
    resolved.push({
      ...wanted, pathInArchive: rel,
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
      /*
       * WHETHER THE FORM SHOWS THIS WIDGET AT ALL.
       *
       * A form may ship a widget with the annotation Hidden flag set and reveal
       * it with its own JavaScript when the control that governs it is used --
       * Colorado's JDF 612 hides twenty-three that way. A value written into a
       * hidden widget
       * is invisible ink -- the finalizer reports the write, the flattened bytes
       * carry no appearance, and the paper is blank. That is worse than a blank
       * the packet admits to, so the flag is read here, from the pinned binary,
       * and a write onto a hidden widget is refused by assertion below.
       */
      let flags = null;
      try { flags = w.getFlags(); } catch { flags = null; }
      const hidden = flags !== null && ((flags & 1) !== 0 || (flags & 2) !== 0 || (flags & 32) !== 0);
      return {
        page: pi + 1,
        rect: { x: +r.x.toFixed(2), y: +r.y.toFixed(2), width: +r.width.toFixed(2), height: +r.height.toFixed(2) },
        rectBasis: "acroform_widget_rect_read_first_hand_from_pinned_binary",
        annotationFlags: flags, hiddenUntilTheFormRevealsIt: hidden
      };
    });
    if (!entry) { unmapped.push({ field: name, widgets }); continue; }
    /*
     * What the SOURCE already carries on this control, before this build touches
     * it. A form may ship a required box already ticked -- so the finished
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
      hiddenUntilTheFormRevealsIt: widgets.some((w) => w.hiddenUntilTheFormRevealsIt === true),
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
      name: r.name, type: r.type, effectiveLabel: r.effectiveLabel, regionHeading: r.section,
      widgets: r.widgets.map((w) => ({ page: w.page, rect: w.rect })),
      multiline: r.multiline === true, maxLength: r.maxLength ?? null
    })),
    facts, explicitMappings, unwritableFields,
    documentTextLines: census.pageText.flatMap((p) => p.lines.map((l) => l.text)),
    appearanceDispositions: dispositionsForFamily(APPEARANCE_SEMANTICS, `${FAMILY_ID}:${source.formNumber}`),
    title: source.title
  });
  if (process.env.CO_DEBUG_RENDER) {
    console.log(`-- ${source.formNumber} ${fixtureName}: written=${report.written.length} refused=${report.refused.length}`);
    for (const r of report.refused) console.log(`   ${r.field ?? r.anchor}: ${r.reason}${r.category ? ` (${r.category})` : ""}`);
  }
  return { bytes, report };
}

/* ---- byte proof ------------------------------------------------------------ */
/*
 * WHAT THE PINNED SOURCE ITSELF DRAWS, BEFORE THIS BUILD TOUCHES IT.
 *
 * A form may bake a hint into a widget's own appearance stream rather than into
 * its value: NHJB-2311's signature widget carries "Enter /s/ before name", and
 * flattening materialises it. Read from the finished artifact alone that looks
 * exactly like ink on a field the map refused -- which is a blocking finding,
 * and would be the wrong one. The source is therefore flattened once, unwritten,
 * and its own ink recorded per widget. Nothing is softened: ink at a widget the
 * source leaves empty is still a blocking finding, and ink that DIFFERS from the
 * source's own is still a blocking finding.
 */
async function sourceInkOf(source) {
  // Flattened with nothing written into it: an unflattened form draws no widget
  // XObjects at all, so reading the source as it ships would report every form
  // as carrying no ink of its own and prove nothing.
  const doc = await PDFDocument.load(source.bytes, { ignoreEncryption: true, updateMetadata: false });
  try { doc.getForm().flatten(); } catch { /* a form that will not flatten leaves no source ink to compare against */ }
  const bytes = await doc.save({ useObjectStreams: false, updateMetadata: false });
  const tmp = path.join(ROOT, `.nh-source-ink-${source.formNumber}.pdf`);
  fs.writeFileSync(tmp, bytes);
  try { return await flattenedWidgets(tmp); } finally { fs.unlinkSync(tmp); }
}

async function byteProof(source, census, artifactBytes, report, fixtureName, sourceInk = []) {
  const tmp = path.join(ROOT, `.nh-byte-proof-${source.formNumber}-${fixtureName}.pdf`);
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
      // Ink on a control the SOURCE already carried is the form's own default,
      // not a write this build made.
      if (r.sourceValue !== null && r.sourceValue !== undefined) {
        documentAuthoredAppearances.push({
          field: r.key, page: wdg.page, rect: wdg.rect, drawnText: text,
          sourceValue: r.sourceValue,
          note: "the pinned source already carries this value; flattening materialises the form's own default"
        });
        continue;
      }
      // The same ink at the same rectangle in the FLATTENED SOURCE is the form's
      // own appearance, not a write this build made.
      const inSource = drawnAt(sourceInk, { page: wdg.page, rect: wdg.rect }).map((d) => d.text).filter(Boolean);
      if (inSource.join("").trim() === ink) {
        documentAuthoredAppearances.push({
          field: r.key, page: wdg.page, rect: wdg.rect, drawnText: text,
          sourceAppearanceText: inSource,
          note: "the pinned source's own widget appearance draws exactly this text; flattening materialises the form's own hint, and this build wrote nothing here"
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

    if (r.policy === "optional") {
      canonicalRefusals.push({
        ...base,
        reason: `optional participant-authored content; the platform does not invent it: ${r.what}`,
        category: null, completenessClass: null, class: null,
        requiredBeforeFiling: false, why: `the form marks this conditional and the platform does not invent it: ${r.what}`
      });
      continue;
    }

    if (r.policy === "attorney" || r.policy === "viewer" || r.policy === "not_on_route") {
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
      factId: r.fact ?? null, routeDetermined: false,
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
  // Scoped to the DOCUMENT: a field name repeats across the two forms and means
  // something different on each.
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

function participantInstructions(maps, rbf, fee, stops) {
  const byDoc = new Map();
  for (const i of rbf) byDoc.set(i.document, [...(byDoc.get(i.document) ?? []), i]);
  const elections = maps.flatMap((m) => m.selectionControls.map((c) => ({ document: m.formNumber, ...c })));

  const out = [];
  out.push(`# Filing instructions — ${ROUTE.publicLabel}`, "");
  out.push(
    "This packet is four New Hampshire Judicial Branch forms:", "",
    "- **NHJB-2317-DSe**, _Petition to Annul Record: Offenses Resolved Prior to 01/01/2019_ — what you file.",
    "- **NHJB-2311**, _Motion for Waiver of Filing Fee_ — file it with the petition if you cannot pay the fee.",
    "- **NHJB-2328**, _Statement of Assets and Liabilities_ — the motion above says you have completed this, so it is filed with it.",
    "- **NHJB-2956**, _Criminal History Record Information Release Authorization_ — how you request your own record from the State Police.", "",
    `All four are prepared for one route — **${ROUTE.publicLabel}** — under ${ROUTE.authority}.`, ""
  );
  out.push(
    "The platform filled in what it holds about you and your case: your name, your date of birth, your address, your "
    + "phone, your e-mail and the case number. Everything else is yours, and every one of those blanks is listed below "
    + "by the form and the section it is in.", ""
  );

  out.push("## One offence, one petition", "");
  out.push(
    "NHJB-2317 says it in capitals: **PLEASE COMPLETE A SEPARATE FORM FOR EACH OFFENSE.** If you are asking the court "
    + "to annul more than one matter, you need one petition for each. This packet prepares one.", ""
  );

  out.push("## Where you file this", "");
  out.push(
    "File the petition with the **clerk of the New Hampshire court that handled the matter** — the court you pick from "
    + "the list at the top of NHJB-2317, which carries every circuit-court district division and every superior court. "
    + "This packet does not state a courthouse address, because the platform holds no court directory and an unsourced "
    + "address in a filing instruction is worse than none.", ""
  );
  out.push("## What it costs", "");
  out.push(
    "**The filing fee for this petition is stated in the record this packet is built on.** That record — the committed "
    + `New Hampshire legal-design memo, bound in source-receipt.json by SHA-256 — states it in its own words: “${fee.fees}”`,
    ""
  );
  out.push(
    `The schedule it names is ${fee.schedule.title}, read at ${fee.schedule.url} on ${fee.schedule.retrievedOn}.`, ""
  );
  out.push(
    "**One fee per court location, not one fee per petition.** The same record states how petitions filed together are "
    + `charged: “${fee.sharedFee}” Petitions you file at the same time in one court location are a single fee between `
    + "them; petitions in two court locations are two fees.", ""
  );
  out.push(
    "This packet does not take payment and cannot confirm what a particular clerk will charge on the day you file. The "
    + "figure above is the one the record holds, and if the clerk quotes you something different the clerk is the one "
    + "collecting it — ask them before you pay.", ""
  );
  out.push(
    `**If you cannot pay it.** The record names the papers to file instead: “${fee.feeWaiver}” Both are prepared in `
    + "this packet, and both are filed with the petition.", ""
  );
  out.push(
    "**A note about the fee-waiver form's court list.** NHJB-2311's only court control is a list of SUPERIOR courts. If "
    + "your case is in a circuit court district division — which is where most pre-2019 annulment petitions go — that "
    + "list cannot name your court, so write the court's name on the form by hand. This packet will not choose a "
    + "superior court you are not in.", ""
  );

  out.push("## What you must do before you file", "");
  out.push("1. **Fill in every item in the tables below.** Each names the form, the section and the blank.");
  out.push("2. **Get the charge facts from the court record.** NHJB-2317 asks for the RSA you were charged under, the charge, the charge date, the date of conviction or other disposition, the date every term of the sentence was completed, and a description of the sentence. The clerk of the court that handled the matter holds all of them; do not estimate any of them.");
  out.push("3. **Read the certification on page 2 before you tick anything.** Every box there is a statement you swear to under penalties of law, and several are legal characterisations of your own record — whether the time requirements of RSA 651:5, III are met, whether the matter is a violent crime or a felony crime of obstruction of justice, whether it carries an enhanced penalty for a second conviction. None of them is ticked for you, and none of them should be ticked until you know it is true.");
  out.push("4. **Decide whether to ask for a hearing.** The form says the court may decide your petition without one after reading the Department of Corrections report and any response from the State. If you want a hearing, tick the box that asks for it.");
  out.push("5. **Complete the signature blocks yourself.** On NHJB-2311 and NHJB-2328 the whole block — name, address, city, state, zip, telephone, e-mail, signature and date — is completed by the filer at the moment of signing, and New Hampshire names every box in it sig.N, so none of it is filled in for you.");
  out.push("6. **Add up the three totals on NHJB-2328 yourself.** Each of the three Total $ lines — weekly take-home in item 12, money presently available in item 13, and monthly household expenses in item 14 — is blank in this packet, and the lines that feed it are blank too. The blank form New Hampshire publishes ships those three totals already set to 0.00, so that a person filling it in on a computer sees the running sum; this packet removes them, because a zero total for your income, your available money and your expenses is an answer, and it would be sworn in your name on a statement you sign under penalty of perjury. Write the real figures, and the real totals.");
  out.push("7. **Sign NHJB-2311 by writing /s/ and then your name.** The blank form carries \"Enter /s/ before name\" inside the signature box as grey placeholder text for someone typing into it on a computer, and its own tooltip says so: \"If filing electronically, please type /s/ then your name to sign this document.  Ex.  /s/ John Doe\". This packet delivers that box empty, so the line is clear for your signature. If you are filing electronically, type /s/ followed by your name; if you are filing on paper, sign it.");
  out.push("8. **Send NHJB-2956 to the State Police, not to the court.** It goes to the Criminal Records Unit, Department of Safety, 33 Hazen Drive, Concord NH 03305. The form states a $25.00 fee for each request and asks for a self-addressed envelope. Section II of that form is for releasing your record to somebody else; leave it blank, because this request is for your own record.");
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
  out.push("- **Your signature and the date beside it, on every form that has one.** You sign them yourself, on the day you sign.");
  out.push("- **The whole signature block on NHJB-2311 and NHJB-2328** — name, address, city, state, zip, telephone and e-mail. New Hampshire names every box in that block sig.N, and the block is completed at signing.");
  out.push("- **The certificate of service box on NHJB-2328.** It states what you did on the day you signed; service has not happened when this packet is prepared.");
  out.push("- **The counsel blocks.** You are filing this yourself; no attorney-representation fact is held for you.");
  out.push("- **Page 3 of NHJB-2317 and page 2 of NHJB-2311.** Both are marked FOR COURT USE ONLY and carry the court's own order.");
  out.push("- **Section II of NHJB-2956** — the third-party release. This packet requests your own record for your own annulment.");
  out.push("");

  out.push("## Where self-help ends", "");
  out.push(
    "This packet prepares four official forms; it decides nothing. The committed legal-design record for this route "
    + "names the points where preparing your own papers stops being enough, and it names "
    + `${stops.conditions.length} of them. They are set out below in that record's own words. If any one of them `
    + "describes your case, stop here and get advice from a **lawyer licensed in New Hampshire** before you file. "
    + "The clerk of the court that handled your matter can tell you what the court requires procedurally, but a clerk "
    + "cannot give you legal advice. This packet does not name a legal-aid organisation or a referral line, for the "
    + "same reason it prints no courthouse address: the platform holds no sourced New Hampshire directory, and an "
    + "invented one in a filing instruction is worse than none.", ""
  );
  for (const condition of stops.conditions) out.push(`- ${condition}`);
  out.push("");
  out.push(
    "Four of those are worth reading twice, because they cost money or they mislead. **RSA 651:5, IV bars a further "
    + "petition more often than every three years** — if a petition to annul this matter was denied within the last "
    + "three years, you are about to pay a filing fee for a petition the statute bars. **An annulment is a New "
    + "Hampshire court order about a New Hampshire record**: it is not recognised federally and it does not resolve "
    + "immigration consequences. **RSA 651:5, XVII does not oblige a private background-check company to remove the "
    + "record** from its database. And **an annulment does not restore firearm rights.**", ""
  );

  out.push("## What annulment does, and what it does not do", "");
  out.push(
    "An annulment under RSA 651:5 orders the record of the arrest, and where it applies the conviction and sentence, "
    + "annulled. It is a court order about a record, not a finding that the matter never happened, and this packet does "
    + "not decide whether you are eligible for one. NHJB-2317 sets out the conditions in its own words on page 2, and "
    + "you swear to them. Read them before you sign.", ""
  );
  out.push(
    "**What happens after you file.** The form says the court considers an investigation and report prepared by the "
    + "Department of Corrections and any response filed by the State, and may then decide without a hearing unless you "
    + "asked for one. Page 3 of the petition is where the court records its decision — granting the annulment on one of "
    + "the three grounds printed there, or denying it and stating why. The court sends copies to the list printed at "
    + "the foot of that page, which includes the prosecutor, the Department of Safety Criminal Records, the DMV and the "
    + "Department of Corrections. Nothing in this packet is filed for you and nothing in it makes that decision.", ""
  );
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

  /* Bound before anything is rendered, so a memo that stopped stating the fee
   * stops the build rather than producing a packet that quietly omits it. */
  const fee = loadFeeGrounding();

  /* Bound and asserted before anything is composed, for the same reason as the
   * fee: a record that stopped holding the eight stop conditions stops the build
   * rather than producing a packet that quietly omits them again. */
  const stops = loadSelfHelpStops(fee.record);

  const censuses = [];
  for (const source of resolved) {
    const census = await censusOf(source);
    assert.equal(census.unmapped.length, 0,
      `${source.formNumber}: ${census.unmapped.length} widget(s) carry no dictionary entry: ${JSON.stringify(census.unmapped.slice(0, 5).map((u) => u.field))}`);
    assert.equal(census.stale.length, 0,
      `${source.formNumber}: the dictionary names ${census.stale.length} field(s) this form does not have: ${JSON.stringify(census.stale)}`);
    /*
     * A write onto a widget the form hides is invisible ink. The finalizer would
     * report it, the flattened bytes would carry nothing, and the packet would
     * claim a value the paper does not show -- so it is refused here rather than
     * discovered by a reader of the raster.
     */
    const writesOntoHidden = census.rows.filter((r) => r.policy === "write" && r.hiddenUntilTheFormRevealsIt === true);
    assert.equal(writesOntoHidden.length, 0,
      `${source.formNumber}: ${writesOntoHidden.length} write(s) land on a widget the form hides: ${JSON.stringify(writesOntoHidden.map((r) => r.key))}`);
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
        viewer: census.rows.filter((r) => r.policy === "viewer").length,
        optional: census.rows.filter((r) => r.policy === "optional").length,
        notOnThisRoute: census.rows.filter((r) => r.policy === "not_on_route").length,
        protected: census.rows.filter((r) => r.policy === "protect").length,
        attorney: census.rows.filter((r) => r.policy === "attorney").length
      }))
    };
  }

  fs.mkdirSync(path.join(ROOT, OUT, "fixtures"), { recursive: true });
  fs.mkdirSync(path.join(ROOT, OUT, "reports"), { recursive: true });
  fs.mkdirSync(path.join(ROOT, OUT, "raster"), { recursive: true });

  const sourceInkByForm = new Map();
  for (const { source } of censuses) sourceInkByForm.set(source.formNumber, await sourceInkOf(source));

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
      const proof = await byteProof(source, census, bytes, report, fixtureName, sourceInkByForm.get(source.formNumber) ?? []);
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
  const instructionsText = participantInstructions(maps, rbf, fee, stops);
  fs.writeFileSync(path.join(ROOT, OUT, "participant-instructions.md"), instructionsText);

  writeJson(`${OUT}/source-receipt.json`, {
    schemaVersion: "rcap-family-source-receipt/v1", familyId: FAMILY_ID, worklistGroupId: FAMILY_ID,
    jurisdiction: ROUTE.jurisdiction, implementationStrategy: "official_pdf_fill",
    custodyClass: "SOURCE_ALREADY_HELD", acquisitionCommissioned: false,
    corpusRootFromEnvironment: "MASTER_LIBRARY_SOURCE_DIR",
    bindingMethod:
      "the SHA-256 the assignment pins, resolved to the committed corpus index entry that carries it in a custody this "
      + "container mounts, then re-hashed from the file on disk before a byte was read. The form number is recorded, "
      + "not used to resolve: the assignment's own paths for these four sources are in custodies this container does "
      + "not hold, and the digest is what makes the Master Library copy the same binary rather than a substitute.",
    custodyTheAssignmentNames: "d_source_packs and nationwide_recovery_pool_2026_09_02, neither mounted here",
    custodyActuallyRead: "master_library",
    routeKey: ROUTE.routeKey, routeSelectionId: ROUTE.routeSelectionId, statutoryAuthority: ROUTE.authority,
    allSourcesExact: true,
    documents: resolved.map((r) => ({
      sourceIds: [r.sourceId], documentId: r.formNumber, formNumber: r.formNumber, revision: r.revision,
      pathInArchive: r.pathInArchive, sha256: r.sha256, byteLength: r.byteLength, instrumentKind: r.instrumentKind
    })),
    /*
     * The four binaries above are what the packet is RENDERED from. This record
     * is what the packet's cost and waiver sentences are QUOTED from, and it is
     * bound the same way and for the same reason: so a reader can check the
     * sentence against the bytes it came out of.
     */
    groundingRecords: [
      {
        path: fee.record.path, sha256: fee.record.sha256, byteLength: fee.record.byteLength,
        trackId: MEMO_TRACK_ID,
        fieldsQuotedOnParticipantSurfaces: ["rules.fees", "rules.feeWaiver", "destination.detail"],
        whyItIsBound:
          "participant-instructions.md quotes this track's fee, single-fee-per-location rule and waiver papers verbatim. "
          + "Before this binding the packet told the participant no source it held established a fee, which was true of "
          + "its four form binaries and false of the repository."
      },
      {
        path: stops.record.path, sha256: stops.record.sha256, byteLength: stops.record.byteLength,
        trackId: MEMO_TRACK_ID,
        fieldsQuotedOnParticipantSurfaces: ["selfHelpStopConditions"],
        selfHelpStopConditionsCarriedVerbatim: stops.conditions.length,
        whyItIsBound:
          "participant-instructions.md prints all " + stops.conditions.length + " of this track's self-help stop "
          + "conditions word for word under 'Where self-help ends'. Independent verification measured the packet at 0 "
          + "of 8 carried while the record held all eight, so the record the sentences come from is bound by SHA-256 "
          + "here and the build asserts it still holds exactly eight, and that the intake memo agrees with it, before "
          + "printing any of them."
      }
    ],
    sourceBinaryCommitted: false, commercialRoutesOpened: 0
  });

  writeJson(`${OUT}/field-census.census-v1.json`, {
    schemaVersion: "rcap-official-form-field-census/v1-census-v1", familyId: FAMILY_ID,
    captionBasis:
      "Every label here was written by reading the printed line at the widget's own rectangle in the pinned binary. "
      + "These four forms extract cleanly, so that reading was possible; it is not claimed as an automated caption "
      + "check, because several boxes are NAMED for the line above them rather than for what they collect -- NHJB-2317's "
      + "City/Town box is named Mailing Address.2 and NHJB-2956's four name-part boxes are all named name.N -- and a "
      + "check that matched a widget to its nearest printed line would agree with the wrong caption exactly where it "
      + "matters. The extraction at each widget's own coordinate is recorded beside the label this build uses, in "
      + "reports/caption-evidence.json, for the reviewer who reads the paper.",
    documents: censuses.map(({ source, census }) => ({
      documentId: source.formNumber, formNumber: source.formNumber, sourceSha256: source.sha256,
      pageCount: census.pageCount, fieldCount: census.rows.length,
      corpusIndexDeclaresFieldCount: source.acroFieldCount,
      fields: census.rows.map((r) => ({
        field: r.key, page: r.page, rect: r.rect, rectBasis: r.rectBasis, pdfType: r.type,
        hiddenUntilTheFormRevealsIt: r.hiddenUntilTheFormRevealsIt === true,
        isSelectionControl: r.isSelectionControl, multiline: r.multiline, maxLength: r.maxLength,
        section: r.section, effectiveLabel: r.effectiveLabel, policy: r.policy, factId: r.fact,
        printedTextAtCoordinate: r.printedTextAtCoordinate
      })),
      /*
       * WHAT THE BLANK OFFICIAL FORM ALREADY CARRIES IN EACH FIELD.
       *
       * The `fields` array above says what each field IS. This says what the
       * source ships INSIDE it before any participant sees the form, which is a
       * different question and the one the corpus-wide check
       * scripts/rcap-official-forms/verify-source-carried-values-are-dispositioned.mjs
       * asks: every value an official source ships inside a field must be
       * dispositioned by somebody, on the record, before the bytes go out. Until
       * this family emitted it, that check could not see New Hampshire at all --
       * it reads `documents[].rows[].sourceValuePresentInBlankForm`, this census
       * carried no `rows`, and a family that is invisible to a checker is not a
       * clean family.
       *
       * TWO PLACES A SOURCE CAN CARRY A VALUE, AND BOTH ARE READ. NHJB-2328's
       * three totals carry theirs in /V. NHJB-2311's signature box carries no /V
       * at all and carries its placeholder in the widget's own appearance
       * stream, which flattens onto the page exactly the same way; a reader that
       * looked only at /V would report that form as shipping nothing. So the
       * value is taken from /V where there is one, and otherwise from the ink
       * the PINNED SOURCE ITSELF draws at that widget's rectangle when flattened
       * unwritten -- the same sourceInk measurement the byte proof uses, so the
       * two cannot disagree.
       *
       * Whitespace is not a value. Three choice controls on these forms ship
       * /V " ", a single space, which draws nothing and asserts nothing; they
       * are recorded as carrying null rather than as carrying a space, because a
       * checker asked to disposition a space would be asked to disposition
       * nothing.
       *
       * A CONTROL THE STRUCTURAL RULE ALREADY ANSWERS IS NOT AN UNDISPOSITIONED
       * VALUE, AND IT IS ALSO NOT HIDDEN. Sixteen of these fields are
       * pushbuttons whose /MK caption -- "Clear Form", "Lock & Save Form", "Top
       * of Page", "Instructions" -- the source draws, and one is a dropdown
       * shipping a selected option on a section this route does not use. The
       * finalizer removes a pushbutton as chrome and drops an unanswered
       * chooser's prompt without consulting any registry, so neither can reach a
       * filing and neither is the defect this check exists to catch. Recording
       * them as source-carried values would ask a human to disposition, by name,
       * seventeen appearances that are already gone -- seventeen manufactured
       * findings. They are recorded instead under
       * sourceAppearanceOnAControlTheStructuralRuleAlreadyAnswers, with the
       * disposition that removes each one named, so the reader can see what was
       * excluded and why rather than having to trust that nothing was.
       */
      rows: census.rows.map((r) => {
        const declared = r.sourceValue === null || r.sourceValue === undefined
          ? null : String(Array.isArray(r.sourceValue) ? r.sourceValue.join(" ") : r.sourceValue);
        const declaredValue = declared !== null && declared.trim() !== "" ? declared : null;
        const drawn = (r.widgets ?? [])
          .flatMap((w) => drawnAt(sourceInkByForm.get(source.formNumber) ?? [], { page: w.page, rect: w.rect }))
          .map((d) => d.text).filter(Boolean).join("").trim();
        const drawnValue = drawn !== "" ? drawn : null;
        const carried = declaredValue ?? drawnValue;
        const structurallyAnswered = r.type === "button"
          ? "suppress_control_appearance: a pushbutton is chrome and the finalizer removes it"
          : r.isSelectionControl === true
            ? "render_participant_value_only_when_written: an unanswered chooser's prompt is dropped by the finalizer"
            : null;
        return {
          field: r.key, type: r.type, page: r.page, rect: r.rect, rectBasis: r.rectBasis,
          isSelectionControl: r.isSelectionControl, policy: r.policy, factId: r.fact ?? null,
          effectiveLabel: r.effectiveLabel, section: r.section,
          sourceValuePresentInBlankForm: structurallyAnswered === null ? carried : null,
          sourceValueCarriedIn: structurallyAnswered !== null || carried === null
            ? null
            : declaredValue !== null ? "acroform_field_value" : "widget_appearance_stream_the_source_ships",
          sourceAppearanceOnAControlTheStructuralRuleAlreadyAnswers:
            structurallyAnswered !== null && carried !== null ? { text: carried, removedBy: structurallyAnswered } : null
        };
      })
    }))
  });

  writeJson(`${OUT}/reports/caption-evidence.json`, {
    schemaVersion: "rcap-caption-evidence/v1", familyId: FAMILY_ID,
    finding:
      "These four New Hampshire forms extract cleanly: the printed captions are readable in the content stream and were "
      + "read there while this dictionary was written.",
    whyReadableIsNotTheSameAsCheckable:
      "Readable is not the same as checkable. Several boxes on these forms are named for the line above them rather "
      + "than for what they collect -- NHJB-2317's City/Town box is named Mailing Address.2, and NHJB-2956's four "
      + "name-part boxes are all named name.N -- so a check that matched a widget to the nearest printed line would "
      + "agree with the wrong caption on exactly the fields where getting it wrong matters. The extraction at every "
      + "widget's own coordinate is recorded here beside the label this build uses, and the reviewer reads the paper.",
    whatTheCaptionClaimRestsOnHere:
      "Each label was written by reading the printed line at the widget's own rectangle in the pinned binary, and the "
      + "dictionary and the widget set are asserted to match exactly in both directions, on all four forms. Where a "
      + "field name and its printed line disagree, the disagreement is recorded in build-findings.json rather than "
      + "resolved silently.",
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
      "The packet states the route it was built for: a petition to annul the record of a matter resolved before 1 "
      + "January 2019, on the Judicial Branch's own pre-2019 form, under RSA 651:5. Nothing on the certification page "
      + "is a route election: each box there is a statement the applicant swears to under penalties of law about their "
      + "own record, several of them legal characterisations of their own matters, and a packet that ticked one would "
      + "be swearing for them. Which court, whether to ask for a hearing, and every financial answer on the waiver "
      + "papers are the participant's too, and each is disclosed by name.",
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
      "Every page of both fixtures is rastered for a human who did not build this family. On these four forms the "
      + "printed captions do extract cleanly, and each label in the dictionary was written by reading the line at the "
      + "widget's own rectangle -- but several boxes are NAMED for the line above them rather than for what they "
      + "collect, so a reader of the paper is the check that a value sits under the heading it belongs to.",
    whatToLookAt: [
      "NHJB-2317 page 1: the applicant's name, date of birth, address, state, zip, telephone and e-mail each under the "
        + "heading they belong to, the City/Town box BLANK (see build-findings.json), and the case number in the "
        + "caption.",
      "NHJB-2317 charge block: the RSA, charge, charge date, disposition date, sentence-completed date and the "
        + "description of the sentence all blank.",
      "NHJB-2317 page 2: every one of the ten certification boxes unticked, the pending-charges box empty, and the "
        + "signature and date blank.",
      "NHJB-2317 page 3: untouched. It is the court's own order and is marked FOR COURT USE ONLY.",
      "NHJB-2311: the case number and the applicant's name in the opening line, and the entire signature block blank — "
        + "name, address, city, state, zip, telephone, e-mail, signature and date. The signature box shows the form's "
        + "own printed hint, 'Enter /s/ before name'; that is the form's ink, not this build's.",
      "NHJB-2328 page 1: name, date of birth, residence address and case number written; every financial line and both "
        + "take-home columns blank. The Total lines are NOT blank and are not meant to be — NHJB-2328 ships its three "
        + "computed totals with the value 0, so the flattened packet prints \"Total $ 0.00\" on pages 1 and 2. That is "
        + "the form's own default, recorded in reports/actual-writes.json as a document-authored appearance; a total "
        + "carrying anything else is a defect.",
      "NHJB-2328 pages 2 and 3: every expense, asset and liability line blank, the certificate-of-service box unticked, "
        + "and the whole signature block blank.",
      "NHJB-2956: the date of birth written, the four name boxes blank (see build-findings.json), the physical "
        + "description and licence lines blank, and SECTION II entirely blank — including the dropdown New Hampshire "
        + "put on the 'name of person or entity to receive record' line.",
      "Across all four: no signature anywhere, no date beside a signature anywhere, and no counsel block filled."
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
          "NHJB-2317 prints City/Town at the box New Hampshire named \"Mailing Address.2\", directly under the box named "
          + "\"Mailing Address.1\" that prints Address.",
        consequence:
          "The shared binder resolves a field's fact from its NAME before its printed line, because a name is more "
          + "reliable than a harvested caption, and it therefore refuses a city write into a field whose own name says "
          + "mailing address. The build does not force it: the city is carried to the participant with the fact id "
          + "declared, so the completeness contract decides for itself whether the packet holds that fact elsewhere. "
          + "The rule lives in scripts/rcap-official-forms/, which this lane does not write."
      },
      {
        finding:
          "NHJB-2956 asks for LAST (MAIDEN/ALIAS) FIRST MI in four boxes and names all four name.1 to name.4.",
        consequence:
          "Every one of those names resolves to the participant's FULL legal name in the shared binder, so a write of "
          + "one name part into one box is refused as a mapping conflict — correctly, because the alternative is the "
          + "whole name printed in the box the State Police read as a surname. All four are carried to the participant "
          + "with their fact ids declared."
      },
      {
        finding:
          "NHJB-2311's only court control is a dropdown of SUPERIOR courts, and a pre-2019 annulment petition is "
          + "usually filed in a circuit court district division — which NHJB-2317's own dropdown lists in full.",
        consequence:
          "The fee-waiver form cannot name the court the petition is filed in. Nothing is invented around it: the "
          + "election is left to the participant and participant-instructions.md tells them to write the court name by "
          + "hand where the list cannot express it, rather than picking a superior court they are not in."
      },
      {
        finding:
          "NHJB-2311's signature widget ships with the printed hint \"Enter /s/ before name\" baked into its own "
          + "appearance stream rather than into its value, and flattening materialises it.",
        consequence:
          "Read from the finished artifact alone this looks exactly like ink on a field the map refused, which is a "
          + "blocking finding and would be the wrong one. The build therefore flattens each pinned source once, "
          + "unwritten, and compares: ink that matches the source's own appearance is recorded as a "
          + "documentAuthoredAppearance. Nothing is softened — ink at a widget the source leaves empty, or ink that "
          + "differs from the source's own, is still a blocking finding."
      },
      {
        finding:
          "New Hampshire names every box of the filer block on NHJB-2311 and NHJB-2328 sig.1 through sig.11, including "
          + "the name, address, city, state, zip, telephone and e-mail lines.",
        consequence:
          "The shared protect rules refuse a write into any field whose name says sig, and that is the right rule: the "
          + "block is completed by the filer at the moment of signing. The whole block is classified protected and the "
          + "participant is told, in participant-instructions.md, that it is theirs to complete."
      },
      {
        finding:
          "NHJB-2328 ships three computed total fields — 12.total, money.total and monthly.total — carrying the value 0, "
          + "so the flattened packet prints \"Total $ 0.00\" beneath columns of otherwise empty lines.",
        consequence:
          "That is the form's own default and not a write: the census reads the value from the pinned source and the "
          + "byte proof records the ink as a document-authored appearance. It is stated to the participant in "
          + "participant-instructions.md, because a frozen 0.00 above a hand-written column would tell the court "
          + "something the participant did not mean to say, and it is stated to the visual reviewer, who would "
          + "otherwise read a printed total as a defect."
      },
      {
        finding:
          "NHJB-2317 says PLEASE COMPLETE A SEPARATE FORM FOR EACH OFFENSE, and its charge block is one row of six "
          + "facts, every one of them read off the court record.",
        consequence:
          "Each is declared REQUIRED_BEFORE_FILING and named to the participant, with the clerk of the court that "
          + "handled the matter as the place to get it. None is estimated: a sentence-completion date guessed onto a "
          + "petition sworn under penalties of law is worse than a blank one."
      },
      {
        finding:
          "The certification on page 2 of NHJB-2317 carries ten sworn boxes, several of which are legal "
          + "characterisations of the applicant's own record — the RSA 651:5, III time requirements, whether the matter "
          + "is a violent crime or a felony crime of obstruction of justice, whether an extended term under RSA 651:6 "
          + "was imposed, whether an enhanced penalty applies to a second conviction.",
        consequence:
          "All ten are left to the participant as sworn elections. A packet that ticked one would be swearing to a "
          + "characterisation of a record it has not seen."
      },
      {
        finding:
          "Section II of NHJB-2956 is the third-party release block, and the control New Hampshire put on its \"NAME OF "
          + "PERSON/ENTITY TO RECEIVE RECORD\" line is a dropdown of family and probate courts.",
        consequence:
          "This packet requests the participant's own record for their own annulment, so Section II is refused as not "
          + "applicable on this route and is never populated with participant data. The dropdown is recorded here for "
          + "the reviewer rather than worked around."
      },
      {
        finding:
          "The MASTER_QUEUE row for this family gives its four sources paths in the D source packs and the nationwide "
          + "recovery pool, custodies this container does not mount.",
        consequence:
          "The build binds all four from the Master Library instead, starting from the digest the assignment pins, and "
          + "re-hashes each file on disk before a byte is read. The committed corpus index records the same four "
          + "digests in the Master Library, so this is the same binary held in more than one custody, not a substituted "
          + "source. The absent custodies are stated rather than worked around and the source receipt records the path "
          + "actually read."
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
      "reports/caption-evidence.json — these two forms cannot be caption-checked from their own text stream, so visual review carries more weight here than usual."
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
  runFamily()
    .then((r) => { console.log(JSON.stringify(r, null, 2)); })
    .catch((e) => { console.error(e); process.exit(1); });
}
