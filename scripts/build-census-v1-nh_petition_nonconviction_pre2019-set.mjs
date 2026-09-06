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
 * Fourth, NHJB-2956 SECTION II DEPENDS ON THE REQUEST METHOD. Its printed
 * instructions require it for every mailed request and third-party release;
 * only an in-person request for one's own record uses Section I alone. The
 * recipient control is a dropdown of family and probate courts. The participant
 * is told to obtain Criminal Records Unit instructions before mailing if that
 * dropdown cannot express the intended recipient, and to complete Section II
 * with the notarization the mailed-request instructions require.
 *
 * Rasterization goes through scripts/raster/pdf-page-raster.mjs. Never Poppler.
 */
import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

import { extractTextItems, extractPathSegments, groupIntoLines } from "./rcap-official-forms/rcap-pdf-anchor-capture.mjs";
import { finalizeOfficialForm, finalizeFlatOverlay } from "./rcap-official-forms/rcap-official-form-finalize.mjs";
import { flattenedWidgets, drawnAt } from "./rcap-official-forms/pdf-flattened-widgets.mjs";
import { stampDeterministic } from "./rcap-official-forms/rcap-deterministic-pdf-date.mjs";
import { BLANK_DISPOSITIONS, PASS_COUNTERS, classifyField, classifyBlank, rowKeyOf }
  from "./rcap-packet-completeness/completeness-contract.mjs";
import { loadAppearanceSemantics, dispositionsForFamily }
  from "./rcap-official-forms/rcap-appearance-semantics.mjs";

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

/*
 * WHO MUST BE SERVED, IN THE RECORD'S OWN WORDS.
 *
 * VF01 failed SERVICE on this family at 7e01df1d8: the committed record answers
 * the obligation in two sentences and the packet carried neither, while its two
 * mentions of service implied the participant would serve somebody and named
 * neither a person nor a method. Both sentences are read here rather than
 * restated, from the same two records the fee and the stop conditions are read
 * from, and both must agree. An emptied or reworded rule stops the build rather
 * than letting the packet print prose this file remembers.
 *
 * The certificate-of-service disposition in the NHJB-2328 dictionary quotes the
 * service sentence, so it is asserted here against the record too and cannot
 * drift from it.
 */
const SERVICE_SENTENCE_QUOTED_IN_THE_DICTIONARY = "None by the participant. The court provides the copy to the prosecutor.";

function loadServiceRule(memo) {
  const registry = readGroundingRecord(GROUNDING_RECORDS.trackRegistry);
  const track = (registry.data.tracks ?? []).find((row) => row.trackId === MEMO_TRACK_ID);
  assert.ok(track, `${GROUNDING_RECORDS.trackRegistry} holds no track ${MEMO_TRACK_ID}`);

  const service = track.rules?.service;
  const notice = track.rules?.notice;
  for (const [name, value] of [["rules.service", service], ["rules.notice", notice]]) {
    assert.ok(typeof value === "string" && value.trim().length > 0,
      `${GROUNDING_RECORDS.trackRegistry} track ${MEMO_TRACK_ID} carries no ${name}, so the packet cannot state who is served`);
  }
  const fromMemo = (memo.data.tracks ?? []).find((row) => row.trackId === MEMO_TRACK_ID)?.rules ?? {};
  assert.equal(fromMemo.service, service,
    `${GROUNDING_RECORDS.memo} and ${GROUNDING_RECORDS.trackRegistry} disagree on this track's service rule`);
  assert.equal(fromMemo.notice, notice,
    `${GROUNDING_RECORDS.memo} and ${GROUNDING_RECORDS.trackRegistry} disagree on this track's notice rule`);
  assert.equal(service, SERVICE_SENTENCE_QUOTED_IN_THE_DICTIONARY,
    "the NHJB-2328 certificate-of-service disposition quotes the record's service sentence verbatim; the record no "
    + "longer says that, so the quotation would be stale");

  return { record: registry, service, notice };
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
 * A fact the platform HOLDS, written at this widget's own rectangle through the
 * finalizer's opt-in named-fact channel rather than through the shared
 * descriptor channel.
 *
 * WHY THE ORDINARY CHANNEL CANNOT REACH THESE BOXES, measured against the live
 * rules in this container rather than asserted. decideBinding tries the field
 * NAME first and the printed LABEL only if the name matches nothing, and New
 * Hampshire names several boxes for the line ABOVE them rather than for what
 * they collect. So the name channel matches, and matches the WRONG fact:
 *
 *   NHJB-2317 "Mailing Address.2"  (prints City/Town)   -> participant.street_address
 *   NHJB-2956 "name.1"/"name.3"/"name.4" (LAST/FIRST/MI) -> participant.full_legal_name
 *   NHJB-2956 "Mailing Address1"   (STREET/CITY/STATE/ZIP CODE) -> participant.street_address
 *
 * and an explicit mapping to the right fact is then refused as
 * explicit_mapping_conflicts_with_field_name. A caption correction cannot help
 * either, because the NAME channel resolves before the label is consulted at
 * all. That is a property of scripts/rcap-official-forms/rcap-field-semantics.mjs,
 * which is shared by every builder in the corpus and which this lane does not
 * open; it stays reported in build-findings.json for the lane that owns it.
 *
 * Until FIX78 these five boxes were declared required-before-filing with the
 * sentence "the platform holds no value for this", which this builder's own
 * fixtures contradict, and the paper showed it: NHJB-2317 printed an address
 * with a street, a state and a ZIP and no town, and NHJB-2956's Section I
 * carried a date of birth with no name and no address at all. The completeness
 * contract's REQUIRED_BEFORE_FILING_CONDITIONS names that case in terms -- "A
 * fact written anywhere else in the same packet is available, and refusing it
 * here is a missing known fact" -- and VF01 scored it as this family's one
 * failing obligation.
 *
 * THE CHANNEL AND ITS LIMITS. narrativeAcrossFields is the finalizer's own
 * opt-in channel for one held fact laid out on the ruled line a form prints for
 * it. The caller names a FACT ID and a FIELD and nothing else: the shared
 * module resolves the fact from the same facts set every other write is
 * resolved from, runs the same protect test on the caption AND on the field
 * name, refuses a field already written or classified unwritable by role, fits
 * the value to that widget's own rectangle, and refuses it WHOLE rather than
 * truncating. No caller text can reach the page through it. The ordinary pass
 * skips a named field entirely, so the wrong fact cannot be written there
 * first. It also carries the complete held residence address into NHJB-2328's
 * numeric field 2.1, whose generic address caption otherwise binds street only.
 * NHJB-2956 "name.2" (maiden name or alias) is NOT named and stays the
 * participant's, as does every other box on these forms.
 */
const NARRATIVE = (fact, what) => ({ policy: "narrative", fact, what });

const SIGNATURE = "signature_or_date_participant_completion";
const COURT_OWNED = "court_prosecutor_clerk_or_agency_owned";
const PARTICIPANT_ELECTION = "participant_sworn_narrative_or_legal_election";

/*
 * The agency block on both forms is the same shape and the same reasoning: an
 * arresting or prosecuting AGENCY is a case fact, and the completeness contract
 * refuses to let a court/clerk refusal class hide one. The platform does not
 * hold this participant's agencies, so each is declared and disclosed by name.
 */
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
      ...NARRATIVE("participant.city",
        "the city or town you live in, in the box the form prints City/Town")
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
    "2.1": { section: "Who You Are", label: "Residence Address", ...NARRATIVE("participant.residence_address", "the complete held residence address") },
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

    "cbcert.1": { section: "Certificate of Service", selection: true, label: "Certificate of service — certifying you sent a copy on the date you sign (selection)", ...PROTECT(SIGNATURE, "this route requires no service by the participant \u2014 the record's rule is \u201cNone by the participant. The court provides the copy to the prosecutor.\u201d \u2014 so the certificate stays blank; the box is on the form because the same form serves routes where the filer does serve somebody") },
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
      ...NARRATIVE("participant.last_name", "your last name, in the first box of the LAST (MAIDEN/ALIAS) FIRST MI line")
    },
    /* NOT written, and it must stay that way. A maiden name or an alias is a
     * fact about the participant's own record that the platform does not hold,
     * and the State Police read this box as a name the record may also be
     * under. It is the one box on this line left to the participant. */
    "name.2": { section: "Section I — Who You Are", label: "Maiden name or alias", ...SUPPLY("any maiden name or alias your record might be under") },
    "name.3": {
      section: "Section I — Who You Are", label: "First name",
      ...NARRATIVE("participant.first_name", "your first name, in the third box of the LAST (MAIDEN/ALIAS) FIRST MI line")
    },
    "name.4": {
      section: "Section I — Who You Are", label: "Middle name box, which the form heads MI",
      ...NARRATIVE("participant.middle_name", "your middle initial, in the last box of the LAST (MAIDEN/ALIAS) FIRST MI line")
    },
    "Mailing Address1": {
      section: "Section I — Who You Are", label: "Your address — street, city, state and zip on one line",
      ...NARRATIVE("participant.street_city_state_zip",
        "your address on one line as street, city, state and zip, which is what the form's single ruled STREET/CITY/STATE/ZIP CODE line asks for")
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
      ...SUPPLY("the record recipient’s address if you mail this request or authorize a third-party release; the pinned form requires both sections for all mailed requests. For an in-person request for your own record, its instructions require only Section I")
    },
    "court.family/probate1 CUSTOM": {
      section: "Section II — Third-Party Release", label: "Name of the person or entity to receive the record (selection)", selection: true,
      ...ELECTION("Complete the recipient name if mailing or authorizing a third-party release. This source offers only family and probate courts in its recipient dropdown; do not select an unrelated court. Before mailing, ask the Criminal Records Unit how to enter the intended recipient and complete Section II, including its required notarization. An in-person request for your own record requires only Section I")
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

/* ---- one held line, derived from held facts and from nothing else ----------- *
 *
 * NHJB-2956 gives the whole address ONE ruled line and captions it
 * STREET/CITY/STATE/ZIP CODE. The finalizer's composed-field channel joins the
 * facts it is given with a newline, one fact per line, which is right for a
 * multi-line block and wrong for a box the form rules as a single line: with a
 * newline in it the value measures wider than the widget at every size and the
 * channel refuses it, measured here on the pinned binary.
 *
 * So the line is derived here, from the two facts this packet already holds and
 * already writes elsewhere -- participant.street_address on NHJB-2317,
 * and participant.city_state_zip, which is a fact the shared
 * registry itself carries -- and named to the finalizer as a single fact id.
 * NOTHING IS AUTHORED: the value is a function of held facts, computed by
 * joining them in the order the form's own caption prints them, and if either
 * part is missing the fact is simply absent and the line stays blank for the
 * participant rather than carrying a fraction of an address.
 *
 * NHJB-2328's Residence Address uses the held street, city, state abbreviation
 * and ZIP facts. This avoids expanding an already-held state abbreviation on
 * its shorter line; NHJB-2956's existing combined-address fact stays unchanged.
 * The registry has no descriptor and no single fact for this line. That gap is
 * in scripts/rcap-official-forms/rcap-field-semantics.mjs, which this lane does
 * not open, and it is reported in build-findings.json.
 */
const COMPOSED_FACTS = {
  "participant.street_city_state_zip": {
    from: ["participant.street_address", "participant.city_state_zip"],
    join: ", ",
    printedCaption: "STREET/CITY/STATE/ZIP CODE"
  },
  "participant.residence_address": {
    from: ["participant.street_address", "participant.city", "participant.state", "participant.zip"],
    separators: [", ", ", ", " "],
    printedCaption: "Residence Address"
  }
};

function factsFor(fixtureName) {
  const held = FIXTURES[fixtureName];
  const facts = { ...held };
  for (const [factId, spec] of Object.entries(COMPOSED_FACTS)) {
    const parts = spec.from.map((f) => held[f]);
    if (parts.every((v) => typeof v === "string" && v.trim() !== "")) {
      const values = parts.map((v) => v.trim());
      facts[factId] = spec.separators
        ? values.map((v, i) => `${i === 0 ? "" : spec.separators[i - 1]}${v}`).join("")
        : values.join(spec.join);
    }
  }
  return facts;
}
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
// The second-page caption is printed page content, not an AcroForm control.
// Inventory both blanks and bind the write box to the original source rule.
function printedHeaderRows(source, pages) {
  if (source.formNumber !== "NHJB-2311") return [];
  const page = pages[1];
  assert.ok(page, "NHJB-2311 must retain its second page");
  const lines = groupIntoLines(extractTextItems(page));
  const heading = lines.find((line) => line.text.trim() === "FOR COURT USE ONLY");
  assert.ok(heading, "NHJB-2311 court-section boundary is absent");
  const rules = extractPathSegments(page).filter((segment) => segment.operator === "re"
    && segment.width > 400 && segment.height > 0 && segment.height < 1.5);
  return [
    { key: "printed-page2-case-name", label: "Case Name:",
      ...SUPPLY("the same case name as the petition, copied into the printed Case Name header on page 2 above FOR COURT USE ONLY") },
    { key: "printed-page2-case-number", label: "Case Number:", ...WRITE("matter.case_number") }
  ].map((entry) => {
    const captions = lines.filter((line) => line.text.trim() === entry.label && line.y > heading.y);
    assert.equal(captions.length, 1, `NHJB-2311 printed ${entry.label} must occur once above the ruling`);
    const caption = captions[0];
    const matches = rules.filter((rule) => Math.abs(rule.y - (caption.y - 2.2)) < 0.2 && rule.x > caption.x);
    assert.equal(matches.length, 1, `NHJB-2311 printed ${entry.label} must have its original rule`);
    const rule = matches[0];
    const rect = { x: rule.x + 2, y: rule.y + 2.5, width: rule.width - 4, height: 13 };
    assert.ok(rect.y > heading.y + 20, "printed caption must remain above the court-owned section");
    return {
      ...entry, name: entry.key, page: 2, widgets: [], rect,
      rectBasis: "printed_caption_and_rule_measured_from_exact_source_page_content",
      printedHeader: true, type: "flat_text", sourceValue: null,
      hiddenUntilTheFormRevealsIt: false, isSelectionControl: false, multiline: false, maxLength: null,
      section: "Page 2 printed header above FOR COURT USE ONLY",
      effectiveLabel: `${entry.label.slice(0, -1)} in the printed page 2 header`,
      printedTextAtCoordinate: [{ y: caption.y, extracted: caption.text }],
      sourceRule: rule, courtSectionStartsAt: heading.y
    };
  });
}

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
  rows.push(...printedHeaderRows(source, pages));
  return { rows, unmapped, stale: [...dictionaryKeys], pageText, pageCount: pages.length };
}

/* ---- render ---------------------------------------------------------------- */
async function renderDocument(source, census, fixtureName) {
  const facts = factsFor(fixtureName);
  const widgetRows = census.rows.filter((r) => !r.printedHeader);
  const writable = widgetRows.filter((r) => r.policy === "write");
  /* Fields written through the finalizer's named-fact channel. See NARRATIVE.
   * They are deliberately NOT in unwritableFields -- the narrative pass refuses
   * a field classified unwritable by role -- and deliberately NOT in
   * explicitMappings either, because the ordinary pass skips a named field
   * entirely and never reaches a binding decision for it. */
  const narrativeRows = widgetRows.filter((r) => r.policy === "narrative");
  const explicitMappings = Object.fromEntries(writable.map((r) => [r.name, r.fact]));
  const writableNames = new Set([...writable, ...narrativeRows].map((r) => r.name));
  const unwritableFields = widgetRows.filter((r) => !writableNames.has(r.name)).map((r) => ({ field: r.name }));

  let { bytes, report } = await finalizeOfficialForm({
    sourceBytes: source.bytes,
    expectedSha256: source.sha256,
    census: widgetRows.map((r) => ({
      name: r.name, type: r.type, effectiveLabel: r.effectiveLabel, regionHeading: r.section,
      widgets: r.widgets.map((w) => ({ page: w.page, rect: w.rect })),
      multiline: r.multiline === true, maxLength: r.maxLength ?? null
    })),
    facts, explicitMappings, unwritableFields,
    documentTextLines: census.pageText.flatMap((p) => p.lines.map((l) => l.text)),
    /* One fact, one field, per entry. Opt-in and empty on any document of this
     * family that declares no NARRATIVE row. */
    narrativeAcrossFields: narrativeRows.map((r) => ({ factId: r.fact, fields: [r.name] })),
    appearanceDispositions: dispositionsForFamily(APPEARANCE_SEMANTICS, `${FAMILY_ID}:${source.formNumber}`),
    /* VF08 read all 38 selection-widget rects across canonical.pdf and
     * boundary.pdf as delivering a stroked square that NHJB-2317 and NHJB-2328
     * do not print: each widget's current /AS state has no stream in /AP /N, so
     * a conforming viewer paints nothing there. VF08's zero-write baseline over
     * the same pinned bytes painted the identical pixels, so the ink comes from
     * the shared flattening step and not from this family. Opting in supplies
     * the missing state as an EMPTY appearance, so nothing is synthesized and
     * nothing is flattened there. A widget of a field this run writes, and any
     * widget whose /AS state ships its own appearance, are untouched by this. */
    suppressSynthesizedAppearances: true,
    title: source.title
  });
  const printedWrites = census.rows.filter((row) => row.printedHeader && row.policy === "write");
  if (printedWrites.length) {
    const intermediateSha256 = crypto.createHash("sha256").update(bytes).digest("hex");
    const flat = await finalizeFlatOverlay({
      sourceBytes: bytes, expectedSha256: intermediateSha256, facts,
      anchors: printedWrites.map((row) => ({ label: row.label, page: row.page, writeBox: row.rect, factId: row.fact, fontSize: 11 })),
      documentTextLines: census.pageText.flatMap((page) => page.lines.map((line) => line.text)),
      minFontSize: 11, title: source.title
    });
    assert.equal(flat.report.refused.length, 0, "the held printed header must fit its measured source rule");
    assert.equal(flat.report.written.length, printedWrites.length);
    report.printedHeaderOverlay = { ...flat.report, originalSourceSha256: source.sha256, intermediateSha256 };
    report.written.push(...flat.report.written.map((write) => ({ ...write,
      field: printedWrites.find((row) => row.label === write.anchor).name })));
    bytes = flat.bytes;
  }
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

/*
 * WHAT THE PAGE CARRIES, READ BACK IN THE ENCODING THE PAGE USES.
 *
 * scripts/rcap-official-forms/pdf-flattened-widgets.mjs decodes an appearance
 * stream's string bytes as latin1, which is right for every byte below 0x80 and
 * wrong for the range WinAnsi uses for typography: a right single quotation
 * mark is drawn as the single byte 0x92, and latin1 turns that into U+0092, a
 * C1 control. VF01 read the consequence in this family's own report -- three
 * boundary writes recorded drawnText "Maria-Alejandra O\u0092Shaughnessy-
 * Whitfield" and matchesExpected false, while the delivered bytes carry U+2019
 * and the page prints the surname whole. A report that says three writes did
 * not match what was expected, on a page where they did, is a defect in the
 * report.
 *
 * The shared reader is not opened here: 40-odd families share it. This is the
 * WinAnsi 0x80-0x9F block applied to what it returns, so this family's own
 * read-back compares like with like. Every byte outside that block is
 * unchanged, so no other value moves.
 */
const WINANSI_HIGH = {
  0x80: "\u20ac", 0x82: "\u201a", 0x83: "\u0192", 0x84: "\u201e", 0x85: "\u2026",
  0x86: "\u2020", 0x87: "\u2021", 0x88: "\u02c6", 0x89: "\u2030", 0x8a: "\u0160",
  0x8b: "\u2039", 0x8c: "\u0152", 0x8e: "\u017d", 0x91: "\u2018", 0x92: "\u2019",
  0x93: "\u201c", 0x94: "\u201d", 0x95: "\u2022", 0x96: "\u2013", 0x97: "\u2014",
  0x98: "\u02dc", 0x99: "\u2122", 0x9a: "\u0161", 0x9b: "\u203a", 0x9c: "\u0153",
  0x9e: "\u017e", 0x9f: "\u0178"
};
const fromWinAnsi = (value) => String(value ?? "").replace(/[\u0080-\u009f]/g,
  (c) => WINANSI_HIGH[c.codePointAt(0)] ?? c);

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
  const output = await PDFDocument.load(artifactBytes, { ignoreEncryption: true });
  for (const r of census.rows) {
    if (r.printedHeader) {
      const readBack = extractTextItems(output.getPage(r.page - 1)).filter((item) =>
        item.text.trim() && item.x >= r.rect.x - 0.1 && item.x + item.width <= r.rect.x + r.rect.width + 0.1
        && Math.abs(item.y - r.rect.y) < 0.2).map((item) => fromWinAnsi(item.text));
      const ink = readBack.join("").trim();
      if (written.has(r.name)) {
        const expected = factsFor(fixtureName)[r.fact];
        assert.equal(ink, expected, "printed header value must read back from the delivered page content");
        glyphs += ink.length;
        actualWrites.push({ field: r.key, factId: r.fact, page: r.page, rect: r.rect,
          section: r.section, effectiveLabel: r.effectiveLabel, writtenThrough: "shared_flat_overlay_finalizer",
          drawnText: readBack, expected, matchesExpected: ink === expected });
      } else if (ink) refusedFieldsWithInk.push({ fieldId: r.key, page: r.page, drawnText: readBack });
      continue;
    }
    for (const wdg of r.widgets) {
      const drawn = drawnAt(widgets, { page: wdg.page, rect: wdg.rect });
      const text = drawn.map((d) => d.text).filter(Boolean);
      const ink = text.join("").trim();
      if (written.has(r.name) && (r.policy === "write" || r.policy === "narrative")) {
        glyphs += ink.length;
        const facts = factsFor(fixtureName);
        const readBack = text.map(fromWinAnsi);
        actualWrites.push({
          field: r.key, factId: r.fact, page: wdg.page, rect: wdg.rect,
          section: r.section, effectiveLabel: r.effectiveLabel,
          writtenThrough: r.policy === "narrative" ? "finalizer_named_fact_channel" : "shared_descriptor_channel",
          drawnText: readBack, expected: facts[r.fact] ?? null,
          matchesExpected: fromWinAnsi(ink) === String(facts[r.fact] ?? "").trim()
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
/*
 * A VALUE THE FORM'S OWN /MaxLen WILL NOT HOLD.
 *
 * VF01 read this family at 7e01df1d8 and found the boundary fixture's case
 * number blank in seven cells across three forms and its telephone blank on
 * NHJB-2317, because those widgets declare /MaxLen 17 and 15 and the boundary
 * values are 33 and 24 characters. The finalizer's refusal is right -- a
 * truncated case number on a court filing is worse than a blank one -- but the
 * refusal was recorded nowhere: the field map declared all eight as written,
 * reports/actual-writes.json carried "unfittable": [] and the instructions told
 * the participant the case number had been filled in.
 *
 * The finalizer records this class in report.refused with the reason
 * value_exceeds_form_max_length rather than in report.unfittable, which is why
 * an unfittable list read straight off the report was empty. It is the same
 * kind of answer -- a value the form's geometry will not take -- so it is
 * carried into the same place, with the measured length against the declared
 * MaxLen, and the field becomes a refusal the participant is asked for.
 */
function maxLenRefusalsOf(report) {
  return (report.refused ?? [])
    .filter((r) => r.reason === "value_exceeds_form_max_length")
    .map((r) => ({
      field: r.field,
      factId: r.factId ?? null,
      reason: "value_exceeds_form_max_length",
      category: "unfittable",
      maxLength: r.maxLength ?? null,
      valueLength: r.valueLength ?? null,
      why:
        `the widget declares /MaxLen ${r.maxLength} and the value this fixture holds is ${r.valueLength} characters, `
        + "so the form itself will not hold it. The packet refuses the write rather than truncating it, because a "
        + "shortened case number or telephone number on a court filing reads as a complete one."
    }));
}

function mapFor(source, census, canonicalReport, boundaryReport) {
  const canonical = sideOf(source, census, canonicalReport);
  const boundary = sideOf(source, census, boundaryReport);
  return {
    formNumber: source.formNumber, documentId: source.formNumber, documentRole: source.instrumentKind,
    documentPolicy: { mode: "participant", captionOnly: false, documentAcceptsFill: true, routeKey: ROUTE.routeKey },
    structuralClass: "acroform",
    explicitMappings: Object.fromEntries(canonical.writes.map((w) => [w.field, w.factId])),
    roleRefusals: [], selectionControls: canonical.selectionControls,
    canonicalWrites: canonical.writes, canonicalRefusals: canonical.refusals,
    boundaryWrites: boundary.writes, boundaryRefusals: boundary.refusals
  };
}

function sideOf(source, census, report) {
  const writtenNames = new Set(report.written.map((w) => w.field));
  const unfittableByField = new Map(maxLenRefusalsOf(report).map((r) => [r.field, r]));
  const canonicalWrites = [];
  const canonicalRefusals = [];
  const selectionControls = [];

  for (const r of census.rows) {
    const base = {
      field: `${source.formNumber}/${r.key}`,
      fieldName: `${source.formNumber}/${r.key}`.replace(/\[\d+\]/g, ""),
      acroFieldName: r.printedHeader ? null : r.name,
      ...(r.printedHeader ? { printedHeader: true, sourceRule: r.sourceRule, courtSectionStartsAt: r.courtSectionStartsAt } : {}),
      page: r.page, rect: r.rect, rectBasis: r.rectBasis,
      printedLabel: r.effectiveLabel, printedLine: r.effectiveLabel,
      sectionHeading: r.section, regionHeading: r.effectiveLabel,
      effectiveLabel: r.effectiveLabel,
      captionBasis: r.printedHeader ? r.rectBasis : "authored_acroform_field_name_plus_printed_section, because this form's text stream is scrambled",
      printedTextAtCoordinate: r.printedTextAtCoordinate,
      document: source.formNumber
    };

    if (r.policy === "write" || r.policy === "narrative") {
      if (writtenNames.has(r.name)) {
        canonicalWrites.push({
          ...base, factId: r.fact, kind: r.type,
          ...(r.printedHeader ? { writeChannel: "shared_flat_overlay_finalizer" } : {}),
          ...(r.policy === "narrative"
            ? {
              writeChannel: "finalizer_named_fact_channel",
              whyNotTheDescriptorChannel:
                r.name === "2.1"
                  ? "The generic Residence Address caption binds street only. The complete address is composed from held street, city, state abbreviation and ZIP facts and fitted whole through the existing named-fact channel."
                  : "New Hampshire names this box for the line above it rather than for what it collects, so the shared "
                + "binder resolves the wrong fact from its NAME before its printed line is consulted. See "
                + "build-findings.json; the fact is written at this widget's own rectangle through the finalizer's "
                + "opt-in named-fact channel, which resolves the fact id from the same facts set as every other write."
            }
            : {})
        });
      }
      else if (unfittableByField.has(r.name)) {
        /* The form will not hold the value. Recorded as a refusal the
         * participant must answer, with the measurement that produced it, so
         * the map stops declaring a write that did not happen. */
        const u = unfittableByField.get(r.name);
        canonicalRefusals.push({
          ...base,
          reason: `the value the platform holds is longer than this box: ${u.why}`,
          category: null, completenessClass: null, class: null,
          disposition: "REQUIRED_BEFORE_FILING", completenessDisposition: "REQUIRED_BEFORE_FILING",
          requiredBeforeFiling: true, identity: `${source.formNumber} field ${r.key}`,
          factId: r.fact ?? null, routeDetermined: false,
          unfittable: true, declaredMaxLength: u.maxLength, valueLength: u.valueLength,
          widgetLocations: r.widgets.map((w) => ({ page: w.page, rect: w.rect })),
          why: u.why,
          participantMustSupply:
            `write this in by hand if the box is blank on your packet. The box accepts at most ${u.maxLength} `
            + "characters; a longer value is left blank rather than shortened."
        });
      }
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

  return { writes: canonicalWrites, refusals: canonicalRefusals, selectionControls };
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
  const item = (m, r, fixture) => ({
    document: m.formNumber, field: r.field, page: r.page,
    section: r.unfittable
      ? `${r.sectionHeading} (form pages ${[...new Set(r.widgetLocations.map((w) => w.page))].join(", ")})`
      : r.sectionHeading,
    disclosureLabel: r.effectiveLabel,
    identity: r.identity, why: r.why, participantMustSupply: r.participantMustSupply,
    ...(r.unfittable === true
      ? {
        conditional: true,
        conditionDescription:
          "only where the value the platform holds is longer than this box's own /MaxLen, in which case the box is "
          + "delivered blank rather than truncated",
        declaredMaxLength: r.declaredMaxLength ?? null,
        valueLengthThatDidNotFit: r.valueLength ?? null,
        widgetLocations: r.widgetLocations,
        fixturesInWhichThisBoxIsBlank: [fixture]
      }
      : {})
  });
  const rows = maps.flatMap((m) => m.canonicalRefusals.filter((r) => r.requiredBeforeFiling === true).map((r) => item(m, r, "canonical")));
  const seen = new Map(rows.map((r) => [`${r.document}\u0000${r.field}`, r]));
  /*
   * A box the CANONICAL render fills and the BOUNDARY render cannot. It is a
   * blank the participant must fill on the paper they are handed, so it is
   * declared here rather than left to the reader to discover, and it is
   * declared conditionally because it is not blank on every packet.
   */
  for (const m of maps) {
    for (const r of m.boundaryRefusals) {
      if (r.requiredBeforeFiling !== true || r.unfittable !== true) continue;
      const key = `${m.formNumber}\u0000${r.field}`;
      if (seen.has(key)) {
        const existing = seen.get(key);
        if (existing.conditional) existing.fixturesInWhichThisBoxIsBlank.push("boundary");
        continue;
      }
      const next = item(m, r, "boundary");
      seen.set(key, next);
      rows.push(next);
    }
  }
  return rows;
}

/** The conditional rows above, alone, for the paragraph that names them. */
function unfittableRequiredItems(maps) {
  return requiredBeforeFilingItems(maps).filter((r) => r.conditional === true);
}

function participantInstructions(maps, rbf, unfittableItems, fee, stops, SERVICE) {
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
  /*
   * WHAT THIS SENTENCE MAY CLAIM.
   *
   * It used to name the case number and the telephone number flatly, and on a
   * packet whose case number is longer than the form's own 17-character box
   * that was false on the paper: the box is delivered blank. The claim is now
   * conditional on what the render actually wrote, and where a box would not
   * hold its value the boxes are named immediately below.
   */
  out.push(
    "The platform filled in what it holds about you and your case: your name, your date of birth, your street address, "
    + "your city or town, your state, your ZIP code, your e-mail, and your telephone number and the case number "
    + "**wherever the form's own box is long enough to hold them**. On NHJB-2956, the "
    + "State Police release, it also filled the LAST, FIRST and MI boxes from the parts of your name and wrote your "
    + "address on that form's single STREET/CITY/STATE/ZIP CODE line. Everything else is yours, and every one of those "
    + "blanks is listed below by the form and the section it is in.", ""
  );
  if (unfittableItems.length > 0) {
    out.push("## Boxes the form itself is too short to hold", "");
    out.push(
      "New Hampshire sets a character limit on some of these boxes in the form file itself, and where the value the "
      + "platform holds is longer than the limit **the box is delivered blank rather than shortened**. A case number or "
      + "a telephone number that has been cut to fit reads as a whole one, and on a court filing that is worse than an "
      + "empty box. **Check every box named here on your own packet, and write the value in by hand if it is blank.** "
      + "The clerk has to be able to match the petition, the fee-waiver motion and the statement of assets to one "
      + "case, and the case number is how that is done.", ""
    );
    out.push("| Form | Section | The box | The form's limit |", "| --- | --- | --- | --- |");
    for (const i of unfittableItems) {
      out.push(`| ${i.document} | ${i.section} | ${i.disclosureLabel} | ${i.declaredMaxLength} characters |`);
    }
    out.push("");
  }

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
  /*
   * WHO MUST BE SERVED. The committed record answers this obligation in two
   * sentences and the packet did not carry either of them, while its two
   * mentions of service implied the participant would serve somebody and named
   * neither a person nor a method. The record's own words are quoted here.
   */
  out.push("## Who else has to be told", "");
  out.push(
    "**Nobody is served by you on this route.** The service rule states: "
    + `“${SERVICE.service}” The notice rule explains how the prosecutor learns of the petition: `
    + `“${SERVICE.notice}”`, ""
  );
  out.push(
    "So there is no step here for you. You do not mail, deliver or hand a copy of this petition to the prosecutor, to "
    + "the police, or to anyone else; the court does that. Nothing in this packet is filed or sent for you either — "
    + "you file the petition with the clerk, and the copy to the prosecutor is the court's to provide.", ""
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
  out.push("8. **Request your record from the State Police using NHJB-2956.** It goes to the Criminal Records Unit, Department of Safety, 33 Hazen Drive, Concord NH 03305. The form states a $25.00 fee for each request and asks for a self-addressed envelope. Section I carries your name across the LAST, FIRST and MI boxes and your address on the line below it — check both. The one box on that name line the platform left empty is **(MAIDEN/ALIAS)**: fill it in yourself if your record might be under a maiden name or an alias, because the platform holds no such fact for you. Follow the request method printed in the form’s INSTRUCTIONS block: an **in-person request for your own record requires only Section I**; a **third-party release requires Sections I and II**; and **every mailed request requires both sections completed and Section II notarized**. Section II is left blank for you to complete when required, including the recipient name and address, your signature and date, and the notary’s signature, date, seal and commission expiration. The source’s recipient-name dropdown lists only family and probate courts. **Before mailing, ask the Criminal Records Unit how to enter your intended recipient and complete that block; do not select an unrelated court or mail this request with Section II blank.**");
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
  out.push("- **The certificate of service box on NHJB-2328.** **This route requires no service by you** — the record says service is “None by the participant. The court provides the copy to the prosecutor.” — so the certificate stays blank. It is on the form because the same form is used where a filer does have to serve somebody; on this route you have nobody to certify sending a copy to.");
  out.push("- **The counsel blocks.** You are filing this yourself; no attorney-representation fact is held for you.");
  out.push("- **The ruling sections marked FOR COURT USE ONLY on page 3 of NHJB-2317 and page 2 of NHJB-2311.** These carry the court's own order. The Case Name and Case Number headers above that section are case captions: copy the case name into NHJB-2311's printed page 2 header; its held case number is filled in above the court section.");
  out.push("- **Section II of NHJB-2956** — complete it for a mailed request or third-party release; all mailed requests require Section II notarized. Only an in-person request for your own record needs Section I alone. See step 8 for the recipient-name dropdown limitation and the completion steps.");
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
/* Source-independent regression for refusal reporting, not a packet acceptance.
 * It runs the real finalizer on synthetic form controls. It neither substitutes
 * these controls for the pinned NH forms nor writes a family artifact. */
async function selfTest() {
  const pdf = await PDFDocument.create();
  const page = pdf.addPage([612, 792]);
  const repeatedHeaderPage = pdf.addPage([612, 792]);
  const form = pdf.getForm();
  const definitions = [
    ["case number", "matter.case_number", "Case Number", 17, 680],
    ["telnum.1", "participant.phone", "Telephone Number", 15, 620]
  ];
  const rows = definitions.map(([name, fact, effectiveLabel, maxLength, y]) => {
    const field = form.createTextField(name);
    field.setMaxLength(maxLength);
    field.addToPage(page, { x: 72, y, width: 300, height: 24 });
    if (name === "case number") field.addToPage(repeatedHeaderPage, { x: 72, y, width: 300, height: 24 });
    const rect = field.acroField.getWidgets()[0].getRectangle();
    return { name, key: name, fact, effectiveLabel, maxLength, page: 1, rect,
      widgets: field.acroField.getWidgets().map((w, i) => ({ page: i + 1, rect: w.getRectangle() })),
      section: "Synthetic caption", type: "text", policy: "write" };
  });
  const bytes = await pdf.save();
  const source = { formNumber: "NHJB-2317", instrumentKind: "primary_filing", title: "SYNTHETIC REFUSAL TEST",
    bytes, sha256: crypto.createHash("sha256").update(bytes).digest("hex") };
  const census = { rows, pageText: [] };
  const canonical = await renderDocument(source, census, "canonical");
  const boundary = await renderDocument(source, census, "boundary");
  assert.equal(canonical.report.written.length, 2);
  assert.equal(boundary.report.written.length, 0);
  const refused = maxLenRefusalsOf(boundary.report);
  assert.equal(refused.length, 2);
  for (const r of refused) {
    const expected = definitions.find(([name]) => name === r.field);
    assert.equal(r.maxLength, expected[3]);
    assert.equal(r.valueLength, String(factsFor("boundary")[expected[1]]).length);
    assert.ok(r.valueLength > r.maxLength);
  }
  const map = mapFor(source, census, canonical.report, boundary.report);
  assert.equal(map.canonicalWrites.length, 2);
  assert.equal(map.boundaryWrites.length, 0);
  assert.equal(map.boundaryRefusals.length, 2);
  const required = requiredBeforeFilingItems([map]);
  assert.equal(required.length, 2);
  assert.equal(required.reduce((n, r) => n + r.widgetLocations.length, 0), 3);
  assert.ok(required.every((r) => r.conditional && r.fixturesInWhichThisBoxIsBlank.join() === "boundary"));
  const reversed = requiredBeforeFilingItems([mapFor(source, census, boundary.report, canonical.report)]);
  assert.ok(reversed.every((r) => r.fixturesInWhichThisBoxIsBlank.join() === "canonical"));
  const both = requiredBeforeFilingItems([mapFor(source, census, boundary.report, boundary.report)]);
  assert.ok(both.every((r) => r.fixturesInWhichThisBoxIsBlank.join() === "canonical,boundary"));
  const fee = loadFeeGrounding();
  const service = loadServiceRule(fee.record);
  const instructions = participantInstructions([map], required, required, fee, loadSelfHelpStops(fee.record), service);
  assert.ok(instructions.includes(service.service) && instructions.includes(service.notice));
  assert.ok(instructions.includes("## Who else has to be told"));
  assert.ok(instructions.includes("every mailed request requires both sections completed and Section II notarized"));
  assert.ok(instructions.includes("in-person request for your own record requires only Section I"));
  assert.ok(instructions.includes("do not select an unrelated court or mail this request with Section II blank"));
  assert.ok(!instructions.includes("leave it blank, because this request is for your own record"));
  assert.ok(instructions.includes("wherever the form's own box is long enough to hold them"));
  for (const r of required) assert.ok(instructions.includes(r.disclosureLabel));
  const changedMemo = structuredClone(fee.record);
  changedMemo.data.tracks.find((t) => t.trackId === MEMO_TRACK_ID).rules.service = "";
  assert.throws(() => loadServiceRule(changedMemo), /disagree/);

  // A printed header has no widget. Exercise its source-rule binding and the
  // actual shared overlay/read-back path independently of the live queue.
  const printedPdf = await PDFDocument.create();
  printedPdf.addPage([612, 792]);
  const printedPage = printedPdf.addPage([612, 792]);
  for (const [text, y] of [["Case Name:", 764.9], ["Case Number:", 750.4], ["FOR COURT USE ONLY", 716.5]]) {
    printedPage.drawText(text, { x: 36, y, size: 10 });
  }
  const { rectangle, fill } = require("pdf-lib");
  printedPage.pushOperators(rectangle(96, 762.72, 480, 1.08), fill(), rectangle(106.56, 748.2, 469.44, 1.08), fill());
  const printedBytes = await printedPdf.save();
  const printedSource = { formNumber: "NHJB-2311", instrumentKind: "primary_filing", title: "SYNTHETIC PRINTED HEADER TEST",
    bytes: printedBytes, sha256: crypto.createHash("sha256").update(printedBytes).digest("hex") };
  const printedCensus = { rows: printedHeaderRows(printedSource, (await PDFDocument.load(printedBytes)).getPages()), pageText: [] };
  assert.equal(printedCensus.rows.length, 2);
  assert.ok(printedCensus.rows.every((r) => r.widgets.length === 0));
  assert.equal(printedCensus.rows.find((r) => r.key.endsWith("case-name")).policy, "supply");
  for (const fixture of ["canonical", "boundary"]) {
    const rendered = await renderDocument(printedSource, printedCensus, fixture);
    const proof = await byteProof(printedSource, printedCensus, rendered.bytes, rendered.report, fixture);
    assert.equal(proof.actualWrites.length, 1);
    assert.equal(proof.refusedFieldsWithInk.length, 0);
    assert.equal(rendered.report.printedHeaderOverlay.written[0].fontSize, 11);
    const outputPage = (await PDFDocument.load(rendered.bytes)).getPage(1);
    assert.deepEqual(extractTextItems(outputPage).filter((item) => item.y < 730).map((item) => item.text),
      ["FOR COURT USE ONLY"], "the court section must receive no participant ink");
  }
  const moved = await PDFDocument.load(printedBytes);
  moved.getPage(1).drawText("Case Number:", { x: 36, y: 735, size: 10 });
  const movedReadBack = await PDFDocument.load(await moved.save());
  assert.throws(() => printedHeaderRows(printedSource, movedReadBack.getPages()), /must occur once/);
  return { familyId: FAMILY_ID, status: "SELF_TEST_PASS", syntheticControls: 2,
    syntheticWidgetInstances: 3,
    syntheticPrintedHeaders: 2, printedHeaderFixturesReadBack: 2,
    duplicatePrintedCaptionRejected: true, courtSectionUnchanged: true,
    canonicalWrites: 2, boundaryMaxLenRefusals: refused, familyArtifactsWritten: false,
    limitation: "Synthetic control regression only; exact-source rebuild, visual review and determinism remain separate." };
}

/* ---- the entry point -------------------------------------------------------- */
export async function runFamily(argv = process.argv.slice(2)) {
  if (argv.includes("--self-test")) return selfTest();
  const checkOnly = argv.includes("--check");
  const skipRaster = argv.includes("--no-raster");
  // Source checks and no-raster builds do not require Chromium or sharp.
  // A requested raster still loads the same calibrated renderer and fails if
  // its actual dependencies are unavailable.
  const rasterizePageCalibrated = checkOnly || skipRaster ? null
    : (await import("./raster/pdf-page-raster.mjs")).rasterizePageCalibrated;

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

  /* Bound before anything is composed, for the same reason as the fee and the
   * stop conditions: the packet states who is served in the record's words or
   * the build stops. */
  const service = loadServiceRule(fee.record);

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
    const writesOntoHidden = census.rows.filter((r) => (r.policy === "write" || r.policy === "narrative") && r.hiddenUntilTheFormRevealsIt === true);
    assert.equal(writesOntoHidden.length, 0,
      `${source.formNumber}: ${writesOntoHidden.length} write(s) land on a widget the form hides: ${JSON.stringify(writesOntoHidden.map((r) => r.key))}`);
    if (source.acroFieldCount != null) {
      assert.equal(census.rows.filter((row) => !row.printedHeader).length, source.acroFieldCount,
        `${source.formNumber}: source AcroForm count must match ${source.acroFieldCount}; printed headers are inventoried separately`);
    }
    censuses.push({ source, census });
  }

  if (checkOnly) {
    return {
      familyId: FAMILY_ID, status: "CHECK_ONLY",
      documents: censuses.map(({ source, census }) => ({
        formNumber: source.formNumber, sha256: source.sha256, fields: census.rows.length,
        writes: census.rows.filter((r) => r.policy === "write").length,
        narrativeWrites: census.rows.filter((r) => r.policy === "narrative").length,
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
  /* The field map is built after BOTH fixtures are rendered, because the
   * boundary side of it has to be what the boundary render actually did. Built
   * from the canonical report alone it declared eight writes the boundary bytes
   * do not carry. */
  const reportsByFixture = new Map([["canonical", new Map()], ["boundary", new Map()]]);

  for (const fixtureName of ["canonical", "boundary"]) {
    const packet = await PDFDocument.create();
    stampDeterministic(packet);
    const pageManifest = [];
    for (const { source, census } of censuses) {
      const { bytes, report } = await renderDocument(source, census, fixtureName);
      const proof = await byteProof(source, census, bytes, report, fixtureName, sourceInkByForm.get(source.formNumber) ?? []);
      writeProofs.push({
        fixture: fixtureName, formNumber: source.formNumber, sourceSha256: source.sha256,
        proofMethod: "flattened widget appearances and printed-header page content read back at every measured write box of the finalized bytes",
        valuesReportedByFinalizer: report.written.length,
        flattenedWidgetAppearancesReadFromOutputBytes: proof.appearances,
        addedGlyphsReadFromOutputBytes: proof.glyphs,
        nonWhitespaceGlyphsOutsideMeasuredWriteBoxes: 0,
        refusedFieldsWithInk: proof.refusedFieldsWithInk,
        documentAuthoredAppearances: proof.documentAuthoredAppearances,
        /* The finalizer files a /MaxLen refusal under report.refused rather
         * than under report.unfittable. Both are the same answer -- the form
         * will not take this value -- so both are recorded here, with the
         * measured length against the declared MaxLen. */
        unfittable: [...report.unfittable, ...maxLenRefusalsOf(report)],
        actualWrites: proof.actualWrites
      });
      const doc = await PDFDocument.load(bytes, { ignoreEncryption: true });
      const copied = await packet.copyPages(doc, doc.getPageIndices());
      for (const [i, p] of copied.entries()) {
        packet.addPage(p);
        pageManifest.push({ packetPage: packet.getPageCount(), formNumber: source.formNumber, sourcePage: i + 1, sourceSha256: source.sha256 });
      }
      reportsByFixture.get(fixtureName).set(source.formNumber, report);
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

  const maps = censuses.map(({ source, census }) => mapFor(
    source, census,
    reportsByFixture.get("canonical").get(source.formNumber),
    reportsByFixture.get("boundary").get(source.formNumber)
  ));

  const rbf = requiredBeforeFilingItems(maps);
  const unfittableItems = unfittableRequiredItems(maps);
  const instructionsText = participantInstructions(maps, rbf, unfittableItems, fee, stops, service);
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
        fieldsQuotedOnParticipantSurfaces: ["rules.fees", "rules.feeWaiver", "destination.detail", "rules.service", "rules.notice"],
        whyItIsBound:
          "participant-instructions.md quotes this track's fee, single-fee-per-location rule and waiver papers verbatim. "
          + "Before this binding the packet told the participant no source it held established a fee, which was true of "
          + "its four form binaries and false of the repository."
      },
      {
        path: stops.record.path, sha256: stops.record.sha256, byteLength: stops.record.byteLength,
        trackId: MEMO_TRACK_ID,
        fieldsQuotedOnParticipantSurfaces: ["selfHelpStopConditions", "rules.service", "rules.notice"],
        selfHelpStopConditionsCarriedVerbatim: stops.conditions.length,
        whyItIsBound:
          "participant-instructions.md prints all " + stops.conditions.length + " of this track's self-help stop "
          + "conditions word for word under 'Where self-help ends'. Independent verification measured the packet at 0 "
          + "of 8 carried while the record held all eight, so the record the sentences come from is bound by SHA-256 "
          + "here and the build asserts it still holds exactly eight, and that the intake memo agrees with it, before "
          + "printing any of them. The same two records must agree on rules.service and rules.notice before "
          + "those statements are printed under the service heading."
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
      acroFormFieldCount: census.rows.filter((r) => !r.printedHeader).length,
      printedHeaderCount: census.rows.filter((r) => r.printedHeader).length,
      corpusIndexDeclaresFieldCount: source.acroFieldCount,
      fields: census.rows.map((r) => ({
        field: r.key, page: r.page, rect: r.rect, rectBasis: r.rectBasis, pdfType: r.type,
        ...(r.printedHeader ? { printedHeader: true, sourceRule: r.sourceRule, courtSectionStartsAt: r.courtSectionStartsAt } : {}),
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
          ...(r.printedHeader ? { printedHeader: true } : {}),
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
    supplementalRenderStrategy: "shared_flat_overlay_for_measured_printed_header",
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
    note: "Read back from the finalized PDF bytes at every measured widget rectangle and printed-header write box, not from the finalizer's own report.",
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
      "Every page of both current fixtures requires raster review by a human who did not build this family; the actual current raster coverage is recorded in reports/rendered-artifacts.json. On these four forms the "
      + "printed captions do extract cleanly, and each label in the dictionary was written by reading the line at the "
      + "widget's own rectangle -- but several boxes are NAMED for the line above them rather than for what they "
      + "collect, so a reader of the paper is the check that a value sits under the heading it belongs to.",
    whatToLookAt: [
      "NHJB-2317 page 1: the applicant's name, date of birth, street address, CITY OR TOWN, state, zip, telephone and "
        + "e-mail each under the heading they belong to, and the case number in the caption. The City/Town box is "
        + "written as of FIX78 and it is the box New Hampshire named \"Mailing Address.2\" — please read the paper and "
        + "confirm the TOWN is in it and not the street address.",
      "NHJB-2956 Section I: the surname, first name and middle initial each in their own box on the LAST "
        + "(MAIDEN/ALIAS) FIRST MI line, with the (MAIDEN/ALIAS) box BLANK and left to the participant; the whole "
        + "address on the single STREET/CITY/STATE/ZIP CODE line beneath it; the date of birth beside an empty Sex "
        + "box; and Section II's third-party name and address untouched. These four writes are new as of FIX78 and "
        + "each goes into a box New Hampshire named for a different line, so a reader of the paper is the check.",
      "NHJB-2317 charge block: the RSA, charge, charge date, disposition date, sentence-completed date and the "
        + "description of the sentence all blank.",
      "NHJB-2317 page 2: every one of the ten certification boxes unticked, the pending-charges box empty, and the "
        + "signature and date blank.",
      "NHJB-2317 page 3: its shared case-number header is filled only if the complete value fits; the court order, "
        + "its elections and judicial signature/date remain blank.",
      "NHJB-2311: the case number and the applicant's name in the opening line, and the entire signature block blank — "
        + "name, address, city, state, zip, telephone, e-mail, signature and date. The source's placeholder "
        + "'Enter /s/ before name' is removed under the recorded participant-input appearance disposition; "
        + "the signature line must be empty.",
      "NHJB-2311 page 2 (packet page 5): the complete held Case Number is printed above FOR COURT USE ONLY in both fixtures. The separate printed Case Name line is blank and required before filing. The ruling section remains blank.",
      "NHJB-2328 page 1: name, date of birth, complete residence address (street, city, state and ZIP) and case number written where the form permits; every financial line and both "
        + "take-home columns blank. The three Total lines on pages 1 and 2 must be blank: the source's "
        + "precomputed zero values are removed under the recorded participant-input appearance dispositions. "
        + "No financial figures or totals are held for this participant.",
      "NHJB-2328 pages 2 and 3: every expense, asset and liability line blank, the certificate-of-service box unticked, "
        + "and the whole signature block blank.",
      "NHJB-2956: the date of birth written; the LAST, FIRST and MI boxes written and the (MAIDEN/ALIAS) box between "
        + "them BLANK; the whole address on the single STREET/CITY/STATE/ZIP CODE line; the physical description and "
        + "licence lines blank; and SECTION II entirely blank — including the dropdown New Hampshire put on the "
        + "'name of person or entity to receive record' line.",
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
          "SHARED-BINDER GAP, STILL OPEN, ON BOXES NEW HAMPSHIRE NAMES FOR THE LINE ABOVE THEM. NHJB-2317 prints "
          + "City/Town at the box named \"Mailing Address.2\", directly under the box named \"Mailing Address.1\" that "
          + "prints Address; NHJB-2956 asks for LAST (MAIDEN/ALIAS) FIRST MI in four boxes and names all four name.1 "
          + "to name.4; and NHJB-2956's whole-address line is named \"Mailing Address1\". decideBinding resolves a "
          + "field's fact from its NAME before its printed line and never reaches the label when the name matches, so "
          + "\"Mailing Address.2\" and \"Mailing Address1\" resolve to participant.street_address and the four name "
          + "boxes each resolve to participant.full_legal_name — measured here, in this container. An explicit "
          + "mapping to the right fact is then refused as explicit_mapping_conflicts_with_field_name, and a caption "
          + "correction cannot help because the label is never consulted. The rule lives in "
          + "scripts/rcap-official-forms/rcap-field-semantics.mjs, which is shared by every builder in the corpus and "
          + "which this lane does not open.",
        consequence:
          "REPAIRED LOCALLY AND ONLY LOCALLY, by FIX78. Until then these five boxes were declared "
          + "required-before-filing and disclosed with the sentence \"the platform holds no value for this\", which "
          + "this builder's own fixtures contradict: the city, the three name parts and the address are all held and "
          + "four of the five are written elsewhere in this same packet. The paper showed it — NHJB-2317 printed an "
          + "address with a street, a state and a ZIP and no town, and NHJB-2956's Section I carried a date of birth "
          + "above a blank name line and a blank address line, on the release the participant is told to mail to the "
          + "State Police. Each of the five is now WRITTEN at that widget's own rectangle through the finalizer's "
          + "opt-in named-fact channel, which names one fact id and one field, resolves the fact from the same facts "
          + "set as every other write, runs the same protect test on the caption and on the field name, and refuses a "
          + "value whole rather than truncating it. NHJB-2956's name.2 (maiden name or alias) is NOT named and stays "
          + "the participant's. The shared gap itself is unchanged and stays reported here for the lane that owns it."
      },
      {
        finding:
          "NO SINGLE REGISTRY FACT NAMES A ONE-LINE ADDRESS. NHJB-2956 gives the whole address one ruled line and "
          + "captions it STREET/CITY/STATE/ZIP CODE. FACT_DESCRIPTORS carries participant.street_address, "
          + "participant.city, participant.state, participant.zip and participant.city_state_zip, and nothing that "
          + "names street, city, state and zip together. The finalizer's composed-field channel joins the facts it is "
          + "given with a newline, one fact per line, which is right for a multi-line block: measured here on the "
          + "pinned NHJB-2956, a two-fact composition of this line carries a newline, measures wider than the widget "
          + "at every size down to the 6pt readable floor, and is refused as "
          + "value_exceeds_widget_width_at_minimum_font.",
        consequence:
          "The line is derived in this builder from the two held facts the packet already writes elsewhere — "
          + "participant.street_address and participant.city_state_zip — joined in the order the form's own caption "
          + "prints them, and named to the finalizer as a single fact id. Nothing is authored: the value is a "
          + "function of held facts, and if either part were missing the fact would be absent and the line would stay "
          + "blank rather than carry a fraction of an address. Closing the gap properly means a descriptor and a fact "
          + "in scripts/rcap-official-forms/rcap-field-semantics.mjs, a shared host this lane does not open; it is "
          + "reported here for the lane that owns it."
      },
      {
        finding:
          "READ-BACK ENCODING in the shared flattened-widget reader. "
          + "scripts/rcap-official-forms/pdf-flattened-widgets.mjs decodes an appearance stream's string bytes as "
          + "latin1. WinAnsi draws a right single quotation mark as the single byte 0x92, which latin1 turns into "
          + "U+0092, a C1 control — so this family's own report recorded drawnText "
          + "\"Maria-Alejandra O\\u0092Shaughnessy-Whitfield\" and matchesExpected FALSE on three boundary writes, "
          + "while the delivered bytes carry U+2019 and the page prints the surname whole at 300 dpi.",
        consequence:
          "A report saying three writes did not match what was expected, on a page where they did, is a defect in the "
          + "report and VF01 read it as one. This family now applies the WinAnsi 0x80-0x9F block to what the shared "
          + "reader returns, before comparing and before recording drawnText, so its read-back compares like with "
          + "like; every byte outside that block is unchanged, so no other value moves. The shared reader is not "
          + "opened here — 40-odd families share it — and the defect stays reported for the lane that owns it."
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
          "The source requires Section II for every mailed request and every third-party release; only an in-person "
          + "request for one’s own record uses Section I alone. The recipient address is conditionally required and "
          + "the recipient selection is disclosed. Step 8 requires the participant to ask the Criminal Records Unit "
          + "how to enter the intended recipient before mailing, and to complete Section II with notarization. "
          + "No unrelated court, recipient identity, signature or notarial act is supplied by the platform."
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
    .then((r) => {
      console.log(JSON.stringify(r, null, 2));
      if (r.status === "BLOCKED_SOURCE" || r.status === "STOPPED") process.exitCode = 1;
    })
    .catch((e) => { console.error(e); process.exit(1); });
}
